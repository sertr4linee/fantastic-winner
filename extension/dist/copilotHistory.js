"use strict";
/**
 * Service pour récupérer l'historique des conversations Copilot
 * Supporte VS Code stable et Insiders
 */
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
exports.CopilotHistoryService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
const readFile = (0, util_1.promisify)(fs.readFile);
const readdir = (0, util_1.promisify)(fs.readdir);
const stat = (0, util_1.promisify)(fs.stat);
class CopilotHistoryService {
    context;
    static instance;
    config;
    constructor(context) {
        this.context = context;
        this.config = this.loadConfig();
    }
    static getInstance(context) {
        if (!CopilotHistoryService.instance) {
            CopilotHistoryService.instance = new CopilotHistoryService(context);
        }
        return CopilotHistoryService.instance;
    }
    /**
     * Charge la configuration depuis les settings VS Code
     */
    loadConfig() {
        const config = vscode.workspace.getConfiguration('klinkr');
        return {
            preferredVersion: config.get('copilotHistoryVersion', 'both'),
            maxConversations: config.get('copilotHistoryMax', 3)
        };
    }
    /**
     * Met à jour la configuration
     */
    async updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        const config = vscode.workspace.getConfiguration('klinkr');
        if (newConfig.preferredVersion) {
            await config.update('copilotHistoryVersion', newConfig.preferredVersion, vscode.ConfigurationTarget.Global);
        }
        if (newConfig.maxConversations) {
            await config.update('copilotHistoryMax', newConfig.maxConversations, vscode.ConfigurationTarget.Global);
        }
    }
    /**
     * Récupère les chemins des dossiers Copilot selon l'OS
     */
    getCopilotPaths() {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        if (process.platform === 'darwin') {
            // macOS
            return {
                stable: path.join(homeDir, 'Library/Application Support/Code/User/globalStorage/github.copilot-chat'),
                insiders: path.join(homeDir, 'Library/Application Support/Code - Insiders/User/globalStorage/github.copilot-chat')
            };
        }
        else if (process.platform === 'win32') {
            // Windows
            return {
                stable: path.join(homeDir, 'AppData/Roaming/Code/User/globalStorage/github.copilot-chat'),
                insiders: path.join(homeDir, 'AppData/Roaming/Code - Insiders/User/globalStorage/github.copilot-chat')
            };
        }
        else {
            // Linux
            return {
                stable: path.join(homeDir, '.config/Code/User/globalStorage/github.copilot-chat'),
                insiders: path.join(homeDir, '.config/Code - Insiders/User/globalStorage/github.copilot-chat')
            };
        }
    }
    /**
     * Vérifie quelles versions de VS Code sont disponibles
     */
    async getAvailableVersions() {
        const paths = this.getCopilotPaths();
        const stableExists = await this.pathExists(paths.stable);
        const insidersExists = await this.pathExists(paths.insiders);
        return {
            stable: stableExists,
            insiders: insidersExists
        };
    }
    /**
     * Récupère les dernières conversations
     */
    async getRecentConversations() {
        const paths = this.getCopilotPaths();
        const available = await this.getAvailableVersions();
        const conversations = [];
        // Déterminer quelles versions lire selon la config
        const shouldReadStable = (this.config.preferredVersion === 'stable' || this.config.preferredVersion === 'both') &&
            available.stable;
        const shouldReadInsiders = (this.config.preferredVersion === 'insiders' || this.config.preferredVersion === 'both') &&
            available.insiders;
        // Lire les conversations de VS Code stable
        if (shouldReadStable) {
            const stableConvs = await this.readConversationsFromPath(paths.stable, 'stable');
            conversations.push(...stableConvs);
        }
        // Lire les conversations de VS Code Insiders
        if (shouldReadInsiders) {
            const insidersConvs = await this.readConversationsFromPath(paths.insiders, 'insiders');
            conversations.push(...insidersConvs);
        }
        // Trier par timestamp décroissant et limiter au max
        conversations.sort((a, b) => b.timestamp - a.timestamp);
        return conversations.slice(0, this.config.maxConversations);
    }
    /**
     * Lit les conversations depuis un dossier spécifique
     */
    async readConversationsFromPath(basePath, source) {
        try {
            if (!await this.pathExists(basePath)) {
                console.log(`[CopilotHistory] Path not found: ${basePath}`);
                return [];
            }
            // Le dossier contient généralement des fichiers .json avec les sessions
            const files = await readdir(basePath);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            console.log(`[CopilotHistory] Found ${jsonFiles.length} JSON files in ${source}`);
            const conversations = [];
            for (const file of jsonFiles) {
                try {
                    const filePath = path.join(basePath, file);
                    const content = await readFile(filePath, 'utf-8');
                    const data = JSON.parse(content);
                    // Parser le format de conversation Copilot
                    const conversation = this.parseConversationData(data, file, source);
                    if (conversation) {
                        conversations.push(conversation);
                    }
                }
                catch (error) {
                    console.error(`[CopilotHistory] Error reading ${file}:`, error);
                }
            }
            return conversations;
        }
        catch (error) {
            console.error(`[CopilotHistory] Error reading from ${basePath}:`, error);
            return [];
        }
    }
    /**
     * Parse les données d'une conversation Copilot
     */
    parseConversationData(data, filename, source) {
        try {
            // Le format exact peut varier selon la version de Copilot
            // Voici une structure générique qui devrait fonctionner
            const messages = [];
            const turns = data.turns || data.messages || [];
            for (const turn of turns) {
                if (turn.request?.message) {
                    messages.push({
                        role: 'user',
                        content: turn.request.message,
                        timestamp: turn.request.timestamp || Date.now()
                    });
                }
                if (turn.response?.message) {
                    messages.push({
                        role: 'assistant',
                        content: turn.response.message,
                        timestamp: turn.response.timestamp || Date.now()
                    });
                }
            }
            if (messages.length === 0) {
                return null;
            }
            // Extraire le titre (premier message user ou filename)
            const firstUserMessage = messages.find(m => m.role === 'user');
            const title = firstUserMessage
                ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
                : filename.replace('.json', '');
            // Timestamp = date de modification du fichier ou premier message
            const timestamp = messages[0]?.timestamp || Date.now();
            return {
                id: `${source}-${filename}`,
                title,
                timestamp,
                messages,
                source
            };
        }
        catch (error) {
            console.error('[CopilotHistory] Error parsing conversation:', error);
            return null;
        }
    }
    /**
     * Vérifie si un chemin existe
     */
    async pathExists(p) {
        try {
            await stat(p);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Récupère la configuration actuelle
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.CopilotHistoryService = CopilotHistoryService;
//# sourceMappingURL=copilotHistory.js.map