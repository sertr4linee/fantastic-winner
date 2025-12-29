import * as vscode from 'vscode';
import express from 'express';
import * as http from 'http';
import * as path from 'path';
import { WebSocket, WebSocketServer } from 'ws';

export class WebServer {
    private app: express.Application;
    private server: http.Server | undefined;
    private wss: WebSocketServer | undefined;
    private port: number;
    private clients: Set<WebSocket> = new Set();
    public readonly onDidReceiveConnection = new vscode.EventEmitter<string>();

    constructor(private context: vscode.ExtensionContext, port?: number) {
        const config = vscode.workspace.getConfiguration('copilotModelsViewer');
        this.port = port || config.get('port', 60885);
        this.app = express();
        this.setupRoutes();
    }

    private setupRoutes() {
        // Middleware pour parser JSON
        this.app.use(express.json());
        
        // Middleware pour logger les connexions
        this.app.use((req, res, next) => {
            const ip = req.ip || req.socket.remoteAddress;
            // Ignorer les requêtes de fichiers statiques pour ne pas spammer les logs
            if (!req.url.match(/\.(js|css|png|jpg|ico)$/)) {
                this.onDidReceiveConnection.fire(`Request: ${req.method} ${req.url}`);
            }
            next();
        });

        this.app.use(express.static(path.join(this.context.extensionPath, 'web')));

        // Route principale - page HTML
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(this.context.extensionPath, 'web', 'index.html'));
        });

        // API: Récupérer les modèles Copilot disponibles
        this.app.get('/api/models', async (req, res) => {
            try {
                const models = await this.getCopilotModels();
                res.json({
                    success: true,
                    models: models,
                    timestamp: new Date().toISOString()
                });
            } catch (error: any) {
                res.status(500).json({
                    success: false,
                    error: error.message || 'Erreur lors de la récupération des modèles'
                });
            }
        });

        // API: Status de la connexion
        this.app.get('/api/status', (req, res) => {
            res.json({
                success: true,
                status: 'connected',
                port: this.port,
                clients: this.clients.size,
                timestamp: new Date().toISOString()
            });
        });

        // API: Health check
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'ok' });
        });
    }

    private async getCopilotModels(): Promise<any[]> {
        try {
            // Récupérer les modèles via l'API VS Code Language Model
            const models = await vscode.lm.selectChatModels();
            
            return models.map(model => ({
                id: model.id,
                name: model.name,
                family: model.family,
                version: model.version,
                vendor: model.vendor,
                maxInputTokens: model.maxInputTokens,
                // Informations supplémentaires disponibles
                details: {
                    id: model.id,
                    family: model.family,
                    version: model.version
                }
            }));
        } catch (error: any) {
            console.error('Erreur lors de la récupération des modèles:', error);
            // Retourner des modèles par défaut en cas d'erreur
            return [
                {
                    id: 'copilot-gpt-4',
                    name: 'GPT-4',
                    family: 'gpt-4',
                    version: '0613',
                    vendor: 'OpenAI',
                    maxInputTokens: 8192,
                    details: {
                        id: 'copilot-gpt-4',
                        family: 'gpt-4',
                        version: '0613'
                    }
                },
                {
                    id: 'copilot-gpt-3.5-turbo',
                    name: 'GPT-3.5 Turbo',
                    family: 'gpt-3.5-turbo',
                    version: '0125',
                    vendor: 'OpenAI',
                    maxInputTokens: 16385,
                    details: {
                        id: 'copilot-gpt-3.5-turbo',
                        family: 'gpt-3.5-turbo',
                        version: '0125'
                    }
                }
            ];
        }
    }

    async start(): Promise<void> {
        if (this.server) {
            console.log('Le serveur est déjà en cours d\'exécution');
            return;
        }

        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, '127.0.0.1', () => {
                    console.log(`Serveur démarré sur http://127.0.0.1:${this.port}`);
                    
                    // Initialiser WebSocket pour la connexion en temps réel
                    this.setupWebSocket();
                    
                    resolve();
                });

                this.server.on('error', (error: any) => {
                    if (error.code === 'EADDRINUSE') {
                        vscode.window.showErrorMessage(`Le port ${this.port} est déjà utilisé. Choisissez un autre port.`);
                    } else {
                        vscode.window.showErrorMessage(`Erreur serveur: ${error.message}`);
                    }
                    this.server = undefined;
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    getPort(): number {
        return this.port;
    }

    isRunning(): boolean {
        return this.server !== undefined;
    }

    private setupWebSocket() {
        if (!this.server) return;

        this.wss = new WebSocketServer({ server: this.server, path: '/ws' });

        this.wss.on('connection', (ws: WebSocket) => {
            console.log('Nouveau client WebSocket connecté');
            this.clients.add(ws);

            // Envoyer un message de bienvenue
            ws.send(JSON.stringify({
                type: 'connected',
                message: 'Connexion établie avec VS Code',
                timestamp: new Date().toISOString()
            }));

            // Heartbeat pour vérifier la connexion
            const heartbeatInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'heartbeat',
                        timestamp: new Date().toISOString()
                    }));
                }
            }, 5000);

            ws.on('message', async (message: string) => {
                try {
                    const data = JSON.parse(message.toString());
                    
                    if (data.type === 'getModels') {
                        const models = await this.getCopilotModels();
                        ws.send(JSON.stringify({
                            type: 'models',
                            data: models,
                            timestamp: new Date().toISOString()
                        }));
                    } else if (data.type === 'ping') {
                        ws.send(JSON.stringify({
                            type: 'pong',
                            timestamp: new Date().toISOString()
                        }));
                    }
                } catch (error) {
                    console.error('Erreur lors du traitement du message WebSocket:', error);
                }
            });

            ws.on('close', () => {
                console.log('Client WebSocket déconnecté');
                this.clients.delete(ws);
                clearInterval(heartbeatInterval);
            });

            ws.on('error', (error) => {
                console.error('Erreur WebSocket:', error);
                this.clients.delete(ws);
                clearInterval(heartbeatInterval);
            });
        });
    }

    stop() {
        // Fermer toutes les connexions WebSocket
        this.clients.forEach(client => {
            client.close();
        });
        this.clients.clear();

        if (this.wss) {
            this.wss.close();
        }

        if (this.server) {
            this.server.close();
            this.server = undefined;
            console.log('Serveur arrêté');
        }
    }
}
