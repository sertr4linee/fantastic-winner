"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessManager = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Gestionnaire de processus pour éviter les conflits et les processus orphelins
 */
class ProcessManager {
    static instance;
    context;
    registeredPorts = new Set();
    cleanupCallbacks = [];
    constructor(context) {
        this.context = context;
        this.setupCleanupHandlers();
    }
    static getInstance(context) {
        if (!ProcessManager.instance) {
            ProcessManager.instance = new ProcessManager(context);
        }
        return ProcessManager.instance;
    }
    /**
     * Vérifie si un port est disponible
     */
    async isPortAvailable(port) {
        try {
            const { stdout } = await execAsync(`lsof -ti :${port}`);
            return stdout.trim() === '';
        }
        catch (error) {
            // lsof retourne une erreur si aucun processus n'utilise le port
            return true;
        }
    }
    /**
     * Trouve un port disponible à partir d'un port de base
     */
    async findAvailablePort(basePort, maxAttempts = 10) {
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
    async freePort(port, force = false) {
        try {
            const { stdout } = await execAsync(`lsof -ti :${port}`);
            const pids = stdout.trim().split('\n').filter(pid => pid);
            if (pids.length === 0) {
                return true;
            }
            if (!force) {
                // Demander confirmation à l'utilisateur
                const choice = await vscode.window.showWarningMessage(`Port ${port} is already in use by ${pids.length} process(es). Kill them?`, 'Yes', 'No');
                if (choice !== 'Yes') {
                    return false;
                }
            }
            // Tuer les processus
            for (const pid of pids) {
                try {
                    await execAsync(`kill -9 ${pid}`);
                    console.log(`[ProcessManager] Killed process ${pid} on port ${port}`);
                }
                catch (error) {
                    console.error(`[ProcessManager] Failed to kill process ${pid}:`, error);
                }
            }
            // Vérifier que le port est libre
            return await this.isPortAvailable(port);
        }
        catch (error) {
            // Port déjà libre
            return true;
        }
    }
    /**
     * Réserve un port pour l'extension
     */
    async reservePort(port, autoFree = true) {
        const isAvailable = await this.isPortAvailable(port);
        if (!isAvailable) {
            if (autoFree) {
                const freed = await this.freePort(port, false);
                if (!freed) {
                    // Chercher un port alternatif
                    const alternativePort = await this.findAvailablePort(port + 1);
                    vscode.window.showWarningMessage(`Port ${port} is busy. Using alternative port ${alternativePort}.`);
                    port = alternativePort;
                }
            }
            else {
                throw new Error(`Port ${port} is already in use`);
            }
        }
        this.registeredPorts.add(port);
        return port;
    }
    /**
     * Enregistre un callback de nettoyage
     */
    registerCleanup(callback) {
        this.cleanupCallbacks.push(callback);
    }
    /**
     * Nettoie tous les processus enregistrés
     */
    async cleanup() {
        console.log('[ProcessManager] Starting cleanup...');
        // Exécuter tous les callbacks de nettoyage
        for (const callback of this.cleanupCallbacks) {
            try {
                await callback();
            }
            catch (error) {
                console.error('[ProcessManager] Cleanup callback failed:', error);
            }
        }
        // Libérer tous les ports enregistrés
        for (const port of this.registeredPorts) {
            try {
                await this.freePort(port, true);
            }
            catch (error) {
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
    setupCleanupHandlers() {
        // Nettoyage à la désactivation de l'extension
        this.context.subscriptions.push({
            dispose: async () => {
                await this.cleanup();
            }
        });
        // Nettoyage sur les signaux de terminaison (dev uniquement)
        if (process.env.VSCODE_DEBUG_MODE) {
            const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
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
    async getStats() {
        const usedPorts = [];
        for (const port of this.registeredPorts) {
            try {
                const { stdout } = await execAsync(`lsof -ti :${port}`);
                const pids = stdout.trim().split('\n').filter(pid => pid);
                if (pids.length > 0) {
                    usedPorts.push({ port, pids });
                }
            }
            catch (error) {
                // Port libre
            }
        }
        return {
            registeredPorts: Array.from(this.registeredPorts),
            usedPorts
        };
    }
}
exports.ProcessManager = ProcessManager;
//# sourceMappingURL=processManager.js.map