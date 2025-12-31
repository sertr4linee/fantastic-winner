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
exports.ActivityTracker = void 0;
const vscode = __importStar(require("vscode"));
/**
 * ActivityTracker - Capture les événements VS Code en temps réel
 * Permet de voir ce que fait Copilot : fichiers lus, créés, modifiés, etc.
 */
class ActivityTracker {
    static instance;
    disposables = [];
    callbacks;
    activityCounter = 0;
    recentFiles = new Set();
    recentDiagnostics = new Set();
    isTracking = false;
    constructor() { }
    static getInstance() {
        if (!ActivityTracker.instance) {
            ActivityTracker.instance = new ActivityTracker();
        }
        return ActivityTracker.instance;
    }
    /**
     * Enregistre les callbacks pour envoyer les activités au panel
     */
    setCallbacks(callbacks) {
        this.callbacks = callbacks;
        console.log('[ActivityTracker] Callbacks registered');
    }
    /**
     * Démarre le tracking des activités
     */
    startTracking() {
        if (this.isTracking)
            return;
        this.isTracking = true;
        console.log('[ActivityTracker] Starting activity tracking...');
        // === File System Events ===
        // Fichiers ouverts/lus
        this.disposables.push(vscode.workspace.onDidOpenTextDocument((doc) => {
            if (this.shouldTrackFile(doc.uri)) {
                this.emitActivity({
                    type: 'file_read',
                    data: {
                        path: vscode.workspace.asRelativePath(doc.uri),
                        message: `Reading ${doc.uri.fsPath.split('/').pop()}`
                    }
                });
            }
        }));
        // Fichiers modifiés
        this.disposables.push(vscode.workspace.onDidChangeTextDocument((event) => {
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
        }));
        // Fichiers créés
        this.disposables.push(vscode.workspace.onDidCreateFiles((event) => {
            for (const file of event.files) {
                this.emitActivity({
                    type: 'file_create',
                    data: {
                        path: vscode.workspace.asRelativePath(file),
                        message: `Creating ${file.fsPath.split('/').pop()}`
                    }
                });
            }
        }));
        // Fichiers supprimés
        this.disposables.push(vscode.workspace.onDidDeleteFiles((event) => {
            for (const file of event.files) {
                this.emitActivity({
                    type: 'file_delete',
                    data: {
                        path: vscode.workspace.asRelativePath(file),
                        message: `Deleting ${file.fsPath.split('/').pop()}`
                    }
                });
            }
        }));
        // Fichiers renommés
        this.disposables.push(vscode.workspace.onDidRenameFiles((event) => {
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
        }));
        // Fichiers sauvegardés
        this.disposables.push(vscode.workspace.onDidSaveTextDocument((doc) => {
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
        }));
        // === Terminal Events ===
        // Terminal ouvert
        this.disposables.push(vscode.window.onDidOpenTerminal((terminal) => {
            this.emitActivity({
                type: 'terminal_command',
                data: {
                    message: `Terminal opened: ${terminal.name}`
                }
            });
        }));
        // === Diagnostics (erreurs, warnings) ===
        this.disposables.push(vscode.languages.onDidChangeDiagnostics((event) => {
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
        }));
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
    stopTracking() {
        this.isTracking = false;
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        console.log('[ActivityTracker] Activity tracking stopped');
    }
    /**
     * Émet une activité manuellement (pour les tool calls, thinking, etc.)
     */
    emitManualActivity(type, data) {
        this.emitActivity({ type, data });
    }
    /**
     * Émet un événement "thinking" pour le panel
     */
    emitThinking(message) {
        this.emitActivity({
            type: 'thinking',
            data: { message }
        });
    }
    /**
     * Émet un événement "tool_call" pour le panel
     */
    emitToolCall(tool, args) {
        this.emitActivity({
            type: 'tool_call',
            data: { tool, args, message: `Using tool: ${tool}` }
        });
    }
    /**
     * Émet un événement "search" pour le panel
     */
    emitSearch(query) {
        this.emitActivity({
            type: 'search',
            data: { message: `Searching: ${query}` }
        });
    }
    emitActivity(partial) {
        const activity = {
            id: `activity_${++this.activityCounter}_${Date.now()}`,
            timestamp: Date.now(),
            ...partial
        };
        console.log(`[ActivityTracker] ${activity.type}: ${activity.data.message || activity.data.path}`);
        this.callbacks?.onActivity(activity);
    }
    shouldTrackFile(uri) {
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
    dispose() {
        this.stopTracking();
    }
}
exports.ActivityTracker = ActivityTracker;
//# sourceMappingURL=activityTracker.js.map