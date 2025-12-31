import * as vscode from 'vscode';

/**
 * Types d'activités trackées
 */
export type ActivityType = 
  | 'file_read'
  | 'file_create'
  | 'file_modify'
  | 'file_delete'
  | 'file_rename'
  | 'terminal_command'
  | 'terminal_output'
  | 'thinking'
  | 'tool_call'
  | 'search'
  | 'diagnostic';

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: number;
  data: {
    path?: string;
    oldPath?: string;
    content?: string;
    command?: string;
    output?: string;
    tool?: string;
    args?: any;
    message?: string;
    severity?: 'info' | 'warning' | 'error';
  };
}

export interface ActivityCallbacks {
  onActivity: (activity: Activity) => void;
}

/**
 * ActivityTracker - Capture les événements VS Code en temps réel
 * Permet de voir ce que fait Copilot : fichiers lus, créés, modifiés, etc.
 */
export class ActivityTracker {
  private static instance: ActivityTracker;
  private disposables: vscode.Disposable[] = [];
  private callbacks: ActivityCallbacks | undefined;
  private activityCounter = 0;
  private recentFiles: Set<string> = new Set();
  private recentDiagnostics: Set<string> = new Set();
  private isTracking = false;

  private constructor() {}

  public static getInstance(): ActivityTracker {
    if (!ActivityTracker.instance) {
      ActivityTracker.instance = new ActivityTracker();
    }
    return ActivityTracker.instance;
  }

  /**
   * Enregistre les callbacks pour envoyer les activités au panel
   */
  public setCallbacks(callbacks: ActivityCallbacks): void {
    this.callbacks = callbacks;
    console.log('[ActivityTracker] Callbacks registered');
  }

  /**
   * Démarre le tracking des activités
   */
  public startTracking(): void {
    if (this.isTracking) return;
    this.isTracking = true;
    console.log('[ActivityTracker] Starting activity tracking...');

    // === File System Events ===
    
    // Fichiers ouverts/lus
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => {
        if (this.shouldTrackFile(doc.uri)) {
          this.emitActivity({
            type: 'file_read',
            data: {
              path: vscode.workspace.asRelativePath(doc.uri),
              message: `Reading ${doc.uri.fsPath.split('/').pop()}`
            }
          });
        }
      })
    );

    // Fichiers modifiés
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (this.shouldTrackFile(event.document.uri) && event.contentChanges.length > 0) {
          // Debounce pour éviter le spam
          const path = vscode.workspace.asRelativePath(event.document.uri);
          if (!this.recentFiles.has(path)) {
            this.recentFiles.add(path);
            setTimeout(() => this.recentFiles.delete(path), 2000);
            
            this.emitActivity({
              type: 'file_modify',
              data: {
                path,
                message: `Modifying ${event.document.uri.fsPath.split('/').pop()}`,
                content: event.contentChanges.map(c => c.text).join('')
              }
            });
          }
        }
      })
    );

    // Fichiers créés
    this.disposables.push(
      vscode.workspace.onDidCreateFiles((event) => {
        for (const file of event.files) {
          this.emitActivity({
            type: 'file_create',
            data: {
              path: vscode.workspace.asRelativePath(file),
              message: `Creating ${file.fsPath.split('/').pop()}`
            }
          });
        }
      })
    );

    // Fichiers supprimés
    this.disposables.push(
      vscode.workspace.onDidDeleteFiles((event) => {
        for (const file of event.files) {
          this.emitActivity({
            type: 'file_delete',
            data: {
              path: vscode.workspace.asRelativePath(file),
              message: `Deleting ${file.fsPath.split('/').pop()}`
            }
          });
        }
      })
    );

    // Fichiers renommés
    this.disposables.push(
      vscode.workspace.onDidRenameFiles((event) => {
        for (const file of event.files) {
          this.emitActivity({
            type: 'file_rename',
            data: {
              oldPath: vscode.workspace.asRelativePath(file.oldUri),
              path: vscode.workspace.asRelativePath(file.newUri),
              message: `Renaming to ${file.newUri.fsPath.split('/').pop()}`
            }
          });
        }
      })
    );

    // Fichiers sauvegardés
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (this.shouldTrackFile(doc.uri)) {
          this.emitActivity({
            type: 'file_modify',
            data: {
              path: vscode.workspace.asRelativePath(doc.uri),
              message: `Saved ${doc.uri.fsPath.split('/').pop()}`,
              severity: 'info'
            }
          });
        }
      })
    );

    // === Terminal Events ===
    
    // Terminal ouvert
    this.disposables.push(
      vscode.window.onDidOpenTerminal((terminal) => {
        this.emitActivity({
          type: 'terminal_command',
          data: {
            message: `Terminal opened: ${terminal.name}`
          }
        });
      })
    );

    // === Diagnostics (erreurs, warnings) ===
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics((event) => {
        for (const uri of event.uris) {
          const diagnostics = vscode.languages.getDiagnostics(uri);
          const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
          
          if (errors.length > 0) {
            const path = vscode.workspace.asRelativePath(uri);
            const key = `${path}-${errors.length}`;
            
            // Debounce pour éviter le spam de diagnostics
            if (!this.recentDiagnostics.has(key)) {
              this.recentDiagnostics.add(key);
              setTimeout(() => this.recentDiagnostics.delete(key), 5000);
              
              this.emitActivity({
                type: 'diagnostic',
                data: {
                  path,
                  message: `${errors.length} error(s) in ${uri.fsPath.split('/').pop()}`,
                  severity: 'error'
                }
              });
            }
          }
        }
      })
    );

    // === Active Editor Changes ===
    // Désactivé car peut causer trop de spam
    // this.disposables.push(
    //   vscode.window.onDidChangeActiveTextEditor((editor) => {
    //     if (editor && this.shouldTrackFile(editor.document.uri)) {
    //       this.emitActivity({
    //         type: 'file_read',
    //         data: {
    //           path: vscode.workspace.asRelativePath(editor.document.uri),
    //           message: `Viewing ${editor.document.uri.fsPath.split('/').pop()}`
    //         }
    //       });
    //     }
    //   })
    // );

    console.log('[ActivityTracker] Activity tracking started');
  }

  /**
   * Arrête le tracking
   */
  public stopTracking(): void {
    this.isTracking = false;
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    console.log('[ActivityTracker] Activity tracking stopped');
  }

  /**
   * Émet une activité manuellement (pour les tool calls, thinking, etc.)
   */
  public emitManualActivity(type: ActivityType, data: Activity['data']): void {
    this.emitActivity({ type, data });
  }

  /**
   * Émet un événement "thinking" pour le panel
   */
  public emitThinking(message: string): void {
    this.emitActivity({
      type: 'thinking',
      data: { message }
    });
  }

  /**
   * Émet un événement "tool_call" pour le panel
   */
  public emitToolCall(tool: string, args?: any): void {
    this.emitActivity({
      type: 'tool_call',
      data: { tool, args, message: `Using tool: ${tool}` }
    });
  }

  /**
   * Émet un événement "search" pour le panel
   */
  public emitSearch(query: string): void {
    this.emitActivity({
      type: 'search',
      data: { message: `Searching: ${query}` }
    });
  }

  private emitActivity(partial: Omit<Activity, 'id' | 'timestamp'>): void {
    const activity: Activity = {
      id: `activity_${++this.activityCounter}_${Date.now()}`,
      timestamp: Date.now(),
      ...partial
    };

    console.log(`[ActivityTracker] ${activity.type}: ${activity.data.message || activity.data.path}`);
    this.callbacks?.onActivity(activity);
  }

  private shouldTrackFile(uri: vscode.Uri): boolean {
    // Ignorer certains fichiers
    const ignoredPatterns = [
      'node_modules',
      '.git',
      '.next',
      'dist',
      '.DS_Store',
      '.vsix',
      'extension-output'
    ];
    
    const path = uri.fsPath;
    return !ignoredPatterns.some(pattern => path.includes(pattern));
  }

  public dispose(): void {
    this.stopTracking();
  }
}
