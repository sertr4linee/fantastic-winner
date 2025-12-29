import * as vscode from 'vscode';

export interface ChatConversation {
    id: string;
    title: string;
    createdAt: Date;
    lastMessageAt: Date;
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
    }>;
}

export class CopilotChatManager {
    private conversations: Map<string, ChatConversation> = new Map();
    private activeConversationId: string | null = null;
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Copilot Chat Manager');
    }

    /**
     * Créer une nouvelle conversation Copilot
     */
    async createConversation(title?: string): Promise<string> {
        const id = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const conversation: ChatConversation = {
            id,
            title: title || `Chat ${this.conversations.size + 1}`,
            createdAt: new Date(),
            lastMessageAt: new Date(),
            messages: []
        };

        this.conversations.set(id, conversation);
        this.activeConversationId = id;

        this.outputChannel.appendLine(`[Chat Manager] Created conversation: ${id} - ${conversation.title}`);

        // Ouvrir le panel Copilot dans VS Code
        await this.openCopilotPanel();

        return id;
    }

    /**
     * Ouvrir le panel Copilot dans VS Code
     */
    private async openCopilotPanel(): Promise<void> {
        try {
            // Ouvrir la vue Copilot Chat
            await vscode.commands.executeCommand('workbench.action.chat.open');
            this.outputChannel.appendLine('[Chat Manager] Opened Copilot chat panel');
        } catch (error) {
            this.outputChannel.appendLine(`[Chat Manager] Error opening Copilot panel: ${error}`);
            vscode.window.showErrorMessage('Failed to open Copilot chat panel');
        }
    }

    /**
     * Envoyer un message dans une conversation et récupérer la réponse de Copilot
     */
    async sendMessage(conversationId: string, userMessage: string, modelId?: string): Promise<AsyncIterable<string>> {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
            throw new Error(`Conversation ${conversationId} not found`);
        }

        // Ajouter le message de l'utilisateur
        conversation.messages.push({
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        });
        conversation.lastMessageAt = new Date();

        this.outputChannel.appendLine(`[Chat Manager] Sending message in conversation ${conversationId}`);
        this.outputChannel.appendLine(`  User: ${userMessage.substring(0, 100)}...`);

        // Sélectionner le modèle Copilot
        const models = await vscode.lm.selectChatModels({
            vendor: undefined,
            family: undefined,
            id: modelId
        });

        if (models.length === 0) {
            throw new Error(`No model found${modelId ? ` with id ${modelId}` : ''}`);
        }

        const model = models[0];
        this.outputChannel.appendLine(`[Chat Manager] Using model: ${model.id}`);

        // Convertir les messages en format Language Model
        const chatMessages = conversation.messages.map((msg) => {
            if (msg.role === 'user') {
                return vscode.LanguageModelChatMessage.User(msg.content);
            } else {
                return vscode.LanguageModelChatMessage.Assistant(msg.content);
            }
        });

        // Envoyer la requête au modèle
        const chatResponse = await model.sendRequest(
            chatMessages,
            {},
            new vscode.CancellationTokenSource().token
        );

        // Retourner un générateur asynchrone pour le streaming
        return this.streamResponse(conversation, chatResponse);
    }

    /**
     * Streamer la réponse de Copilot
     */
    private async *streamResponse(
        conversation: ChatConversation,
        chatResponse: vscode.LanguageModelChatResponse
    ): AsyncIterable<string> {
        let fullResponse = '';

        try {
            for await (const fragment of chatResponse.text) {
                fullResponse += fragment;
                yield fragment;
            }

            // Ajouter la réponse complète à la conversation
            conversation.messages.push({
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date()
            });
            conversation.lastMessageAt = new Date();

            this.outputChannel.appendLine(`[Chat Manager] Assistant response: ${fullResponse.substring(0, 100)}...`);
        } catch (error) {
            this.outputChannel.appendLine(`[Chat Manager] Error streaming response: ${error}`);
            throw error;
        }
    }

    /**
     * Obtenir la liste des conversations
     */
    getConversations(): ChatConversation[] {
        return Array.from(this.conversations.values()).sort(
            (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
        );
    }

    /**
     * Obtenir une conversation par son ID
     */
    getConversation(id: string): ChatConversation | undefined {
        return this.conversations.get(id);
    }

    /**
     * Définir la conversation active
     */
    setActiveConversation(id: string): boolean {
        if (this.conversations.has(id)) {
            this.activeConversationId = id;
            this.outputChannel.appendLine(`[Chat Manager] Active conversation set to: ${id}`);
            return true;
        }
        return false;
    }

    /**
     * Obtenir l'ID de la conversation active
     */
    getActiveConversationId(): string | null {
        return this.activeConversationId;
    }

    /**
     * Supprimer une conversation
     */
    deleteConversation(id: string): boolean {
        const deleted = this.conversations.delete(id);
        if (deleted && this.activeConversationId === id) {
            // Si on supprime la conversation active, sélectionner une autre
            const remaining = this.getConversations();
            this.activeConversationId = remaining.length > 0 ? remaining[0].id : null;
        }
        return deleted;
    }

    /**
     * Effacer toutes les conversations
     */
    clearAllConversations(): void {
        this.conversations.clear();
        this.activeConversationId = null;
        this.outputChannel.appendLine('[Chat Manager] All conversations cleared');
    }

    /**
     * Renommer une conversation
     */
    renameConversation(id: string, newTitle: string): boolean {
        const conversation = this.conversations.get(id);
        if (conversation) {
            conversation.title = newTitle;
            this.outputChannel.appendLine(`[Chat Manager] Renamed conversation ${id} to: ${newTitle}`);
            return true;
        }
        return false;
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}
