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
exports.ChatParticipantBridge = void 0;
const vscode = __importStar(require("vscode"));
const modelBridge_1 = require("./modelBridge");
class ChatParticipantBridge {
    static instance;
    participant;
    modelBridge;
    callbacks;
    requestCounter = 0;
    constructor() {
        this.modelBridge = modelBridge_1.ModelBridge.getInstance();
    }
    static getInstance() {
        if (!ChatParticipantBridge.instance) {
            ChatParticipantBridge.instance = new ChatParticipantBridge();
        }
        return ChatParticipantBridge.instance;
    }
    /**
     * Enregistre les callbacks pour la communication avec le web panel
     */
    setCallbacks(callbacks) {
        this.callbacks = callbacks;
        console.log('[ChatParticipant] Callbacks registered');
    }
    /**
     * Initialise le chat participant @builder
     */
    register(context) {
        console.log('[ChatParticipant] Registering @builder participant...');
        // Créer le handler de requêtes
        const handler = async (request, chatContext, stream, token) => {
            return this.handleChatRequest(request, chatContext, stream, token);
        };
        // Créer le participant
        this.participant = vscode.chat.createChatParticipant('ai-app-builder.builder', handler);
        // Configurer le participant
        this.participant.iconPath = new vscode.ThemeIcon('rocket');
        // Ajouter à la liste des disposables
        context.subscriptions.push(this.participant);
        console.log('[ChatParticipant] @builder participant registered successfully');
    }
    /**
     * Handler principal pour les requêtes du chat
     */
    async handleChatRequest(request, chatContext, stream, token) {
        const requestId = `chat-${++this.requestCounter}-${Date.now()}`;
        const prompt = request.prompt;
        console.log(`[ChatParticipant] Received request #${requestId}: "${prompt.substring(0, 50)}..."`);
        // Notifier le web panel qu'on a reçu un prompt
        this.callbacks?.onPromptReceived(prompt, requestId);
        try {
            // Construire l'historique des messages
            const messages = [];
            // Ajouter le contexte de l'historique si disponible
            const previousMessages = chatContext.history.filter(h => h instanceof vscode.ChatResponseTurn || h instanceof vscode.ChatRequestTurn);
            for (const turn of previousMessages) {
                if (turn instanceof vscode.ChatRequestTurn) {
                    messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
                }
                else if (turn instanceof vscode.ChatResponseTurn) {
                    // Extraire le contenu des réponses précédentes
                    let fullMessage = '';
                    for (const part of turn.response) {
                        if ('value' in part && part.value && typeof part.value === 'object' && 'value' in part.value) {
                            fullMessage += part.value.value;
                        }
                    }
                    if (fullMessage) {
                        messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
                    }
                }
            }
            // Ajouter le message actuel
            messages.push(vscode.LanguageModelChatMessage.User(prompt));
            // Utiliser le modèle de la requête ou sélectionner un modèle
            let model = request.model;
            if (!model) {
                const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
                if (models.length === 0) {
                    throw new Error('No language models available');
                }
                model = models[0];
            }
            console.log(`[ChatParticipant] Using model: ${model.id}`);
            // Envoyer la requête au modèle
            const chatResponse = await model.sendRequest(messages, {}, token);
            // Streamer la réponse
            let fullResponse = '';
            let chunkIndex = 0;
            for await (const chunk of chatResponse.text) {
                if (token.isCancellationRequested) {
                    console.log('[ChatParticipant] Request cancelled');
                    break;
                }
                if (chunk) {
                    chunkIndex++;
                    fullResponse += chunk;
                    // 1. Streamer vers le Chat UI natif
                    stream.markdown(chunk);
                    // 2. Streamer vers le web panel
                    this.callbacks?.onResponseChunk(chunk, requestId);
                    console.log(`[ChatParticipant] Chunk #${chunkIndex}: ${chunk.length} chars`);
                }
            }
            // Notifier la fin
            this.callbacks?.onResponseComplete(fullResponse, requestId);
            console.log(`[ChatParticipant] Response complete: ${fullResponse.length} chars, ${chunkIndex} chunks`);
            return {
                metadata: {
                    requestId,
                    model: model.id,
                    totalChunks: chunkIndex,
                    totalChars: fullResponse.length
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[ChatParticipant] Error:', errorMessage);
            // Notifier l'erreur
            this.callbacks?.onResponseError(errorMessage, requestId);
            // Afficher l'erreur dans le chat
            stream.markdown(`❌ **Error:** ${errorMessage}`);
            return {
                errorDetails: {
                    message: errorMessage
                }
            };
        }
    }
    /**
     * Envoie un prompt programmatiquement au participant @builder
     * Ceci ouvre le chat avec le prompt pré-rempli mentionnant @builder
     */
    async sendPrompt(prompt) {
        console.log('[ChatParticipant] Sending prompt to @builder...');
        // Ouvrir le chat avec mention du participant
        await vscode.commands.executeCommand('workbench.action.chat.open', {
            query: `@builder ${prompt}`,
            isPartialQuery: false
        });
    }
    /**
     * Dispose le participant
     */
    dispose() {
        if (this.participant) {
            this.participant.dispose();
        }
    }
}
exports.ChatParticipantBridge = ChatParticipantBridge;
//# sourceMappingURL=chatParticipant.js.map