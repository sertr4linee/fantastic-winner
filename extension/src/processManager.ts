import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Gestionnaire de processus pour éviter les conflits et les processus orphelins
 */
export class ProcessManager {
  private static instance: ProcessManager;
  private context: vscode.ExtensionContext;
  private registeredPorts: Set<number> = new Set();
  private cleanupCallbacks: Array<() => Promise<void>> = [];

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.setupCleanupHandlers();
  }

  public static getInstance(context: vscode.ExtensionContext): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager(context);
    }
    return ProcessManager.instance;
  }

  /**
   * Vérifie si un port est disponible
   */
  public async isPortAvailable(port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      return stdout.trim() === '';
    } catch (error) {
      // lsof retourne une erreur si aucun processus n'utilise le port
      return true;
    }
  }

  /**
   * Trouve un port disponible à partir d'un port de base
   */
  public async findAvailablePort(basePort: number, maxAttempts: number = 10): Promise<number> {
    for (let i = 0; i < maxAttempts; i++) {
      const port = basePort + i;
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`No available port found starting from ${basePort}`);
  }

  /**
   * Libère un port en tuant les processus qui l'utilisent
   */
  public async freePort(port: number, force: boolean = false): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      const pids = stdout.trim().split('\n').filter(pid => pid);
      
      if (pids.length === 0) {
        return true;
      }

      if (!force) {
        // Demander confirmation à l'utilisateur
        const choice = await vscode.window.showWarningMessage(
          `Port ${port} is already in use by ${pids.length} process(es). Kill them?`,
          'Yes', 'No'
        );
        
        if (choice !== 'Yes') {
          return false;
        }
      }

      // Tuer les processus
      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid}`);
          console.log(`[ProcessManager] Killed process ${pid} on port ${port}`);
        } catch (error) {
          console.error(`[ProcessManager] Failed to kill process ${pid}:`, error);
        }
      }

      // Vérifier que le port est libre
      return await this.isPortAvailable(port);
    } catch (error) {
      // Port déjà libre
      return true;
    }
  }

  /**
   * Réserve un port pour l'extension
   */
  public async reservePort(port: number, autoFree: boolean = true): Promise<number> {
    const isAvailable = await this.isPortAvailable(port);
    
    if (!isAvailable) {
      if (autoFree) {
        const freed = await this.freePort(port, false);
        if (!freed) {
          // Chercher un port alternatif
          const alternativePort = await this.findAvailablePort(port + 1);
          vscode.window.showWarningMessage(
            `Port ${port} is busy. Using alternative port ${alternativePort}.`
          );
          port = alternativePort;
        }
      } else {
        throw new Error(`Port ${port} is already in use`);
      }
    }

    this.registeredPorts.add(port);
    return port;
  }

  /**
   * Enregistre un callback de nettoyage
   */
  public registerCleanup(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Nettoie tous les processus enregistrés
   */
  public async cleanup(): Promise<void> {
    console.log('[ProcessManager] Starting cleanup...');
    
    // Exécuter tous les callbacks de nettoyage
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('[ProcessManager] Cleanup callback failed:', error);
      }
    }

    // Libérer tous les ports enregistrés
    for (const port of this.registeredPorts) {
      try {
        await this.freePort(port, true);
      } catch (error) {
        console.error(`[ProcessManager] Failed to free port ${port}:`, error);
      }
    }

    this.registeredPorts.clear();
    this.cleanupCallbacks = [];
    console.log('[ProcessManager] Cleanup completed');
  }

  /**
   * Configure les handlers de nettoyage automatique
   */
  private setupCleanupHandlers(): void {
    // Nettoyage à la désactivation de l'extension
    this.context.subscriptions.push({
      dispose: async () => {
        await this.cleanup();
      }
    });

    // Nettoyage sur les signaux de terminaison (dev uniquement)
    if (process.env.VSCODE_DEBUG_MODE) {
      const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
      signals.forEach(signal => {
        process.on(signal, async () => {
          console.log(`[ProcessManager] Received ${signal}, cleaning up...`);
          await this.cleanup();
          process.exit(0);
        });
      });
    }

    console.log('[ProcessManager] Cleanup handlers configured');
  }

  /**
   * Obtient les statistiques des processus
   */
  public async getStats(): Promise<{
    registeredPorts: number[];
    usedPorts: Array<{ port: number; pids: string[] }>;
  }> {
    const usedPorts: Array<{ port: number; pids: string[] }> = [];

    for (const port of this.registeredPorts) {
      try {
        const { stdout } = await execAsync(`lsof -ti :${port}`);
        const pids = stdout.trim().split('\n').filter(pid => pid);
        if (pids.length > 0) {
          usedPorts.push({ port, pids });
        }
      } catch (error) {
        // Port libre
      }
    }

    return {
      registeredPorts: Array.from(this.registeredPorts),
      usedPorts
    };
  }
}
