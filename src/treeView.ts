import * as vscode from 'vscode';

export class ServerStatusProvider implements vscode.TreeDataProvider<ServerItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ServerItem | undefined | null | void> = new vscode.EventEmitter<ServerItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ServerItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private serverRunning: boolean = false;
    private currentPort: number;
    private logs: string[] = [];

    constructor() {
        const config = vscode.workspace.getConfiguration('copilotModelsViewer');
        this.currentPort = config.get('port', 60885);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    addLog(message: string): void {
        const time = new Date().toLocaleTimeString();
        this.logs.unshift(`[${time}] ${message}`);
        // Keep only last 50 logs
        if (this.logs.length > 50) {
            this.logs.pop();
        }
        this.refresh();
    }

    setServerStatus(running: boolean, port?: number): void {
        this.serverRunning = running;
        if (port !== undefined) {
            this.currentPort = port;
        }
        this.refresh();
    }

    getTreeItem(element: ServerItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ServerItem): Thenable<ServerItem[]> {
        if (element) {
            if (element.label === '⚙️ Actions') {
                if (this.logs.length === 0) {
                    return Promise.resolve([new ServerItem('Aucun log', vscode.TreeItemCollapsibleState.None)]);
                }
                return Promise.resolve(this.logs.map(log => new ServerItem(log, vscode.TreeItemCollapsibleState.None)));
            }
            return Promise.resolve([]);
        }

        const items: ServerItem[] = [];

        // Status item
        const statusItem = new ServerItem(
            this.serverRunning ? '🟢 Serveur démarré' : '🔴 Serveur arrêté',
            vscode.TreeItemCollapsibleState.None,
            {
                command: this.serverRunning ? 'copilot-models-viewer.stopServer' : 'copilot-models-viewer.startServer',
                title: this.serverRunning ? 'Arrêter' : 'Démarrer'
            }
        );
        statusItem.contextValue = this.serverRunning ? 'serverRunning' : 'serverStopped';
        items.push(statusItem);

        // Port item
        const portItem = new ServerItem(
            `📡 Port: ${this.currentPort}`,
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'copilot-models-viewer.changePort',
                title: 'Changer le port'
            }
        );
        items.push(portItem);

        // URL item (only if server is running)
        if (this.serverRunning) {
            const urlItem = new ServerItem(
                `🌐 http://127.0.0.1:${this.currentPort}`,
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'copilot-models-viewer.openWebView',
                    title: 'Ouvrir dans le navigateur'
                }
            );
            items.push(urlItem);
        }

        // Actions
        const actionsItem = new ServerItem(
            '⚙️ Actions',
            vscode.TreeItemCollapsibleState.Expanded
        );
        items.push(actionsItem);

        return Promise.resolve(items);
    }
}

class ServerItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = this.label;
    }
}
