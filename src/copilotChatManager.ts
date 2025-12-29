import * as vscode from 'vscode';

export class CopilotChatManager {
    private static instance: CopilotChatManager;

    private constructor() {}

    public static getInstance(): CopilotChatManager {
        if (!CopilotChatManager.instance) {
            CopilotChatManager.instance = new CopilotChatManager();
        }
        return CopilotChatManager.instance;
    }

    /**
     * Vérifie si Copilot est disponible
     */
    public async isCopilotAvailable(): Promise<boolean> {
        try {
            // Vérifier si l'extension Copilot est installée
            const copilotExtension = vscode.extensions.getExtension('github.copilot-chat');
            if (!copilotExtension) {
                console.log('[CopilotManager] GitHub Copilot Chat extension not found');
                return false;
            }

            // Activer l'extension si elle n'est pas encore active
            if (!copilotExtension.isActive) {
                await copilotExtension.activate();
            }

            return true;
        } catch (error) {
            console.error('[CopilotManager] Error checking Copilot availability:', error);
            return false;
        }
    }

    /**
     * Ouvre le panel Copilot et envoie un message
     */
    public async openCopilotWithMessage(message: string): Promise<void> {
        try {
            console.log('[CopilotManager] Opening Copilot chat with message:', message.substring(0, 50));

            // Méthode 1: Utiliser la commande workbench.action.chat.open
            try {
                await vscode.commands.executeCommand('workbench.action.chat.open', {
                    query: message
                });
                console.log('[CopilotManager] Message sent via workbench.action.chat.open');
                return;
            } catch (error) {
                console.log('[CopilotManager] workbench.action.chat.open failed, trying alternative method');
            }

            // Méthode 2: Ouvrir le panel et utiliser l'API de chat
            try {
                // Ouvrir le panel Copilot
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                
                // Attendre que le panel soit prêt
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Essayer d'envoyer le message via l'API chat
                await vscode.commands.executeCommand('workbench.action.chat.sendToNewChat', {
                    message: message
                });
                
                console.log('[CopilotManager] Message sent via sendToNewChat');
                return;
            } catch (error) {
                console.log('[CopilotManager] sendToNewChat failed, trying clipboard method');
            }

            // Méthode 3: Copier dans le presse-papier et ouvrir le chat
            try {
                // Copier le message dans le presse-papier
                await vscode.env.clipboard.writeText(message);
                
                // Ouvrir le panel Copilot
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                
                // Montrer une notification pour que l'utilisateur sache coller
                vscode.window.showInformationMessage(
                    `Message copié dans le presse-papier. Collez-le dans le chat Copilot avec Cmd+V / Ctrl+V`,
                    'OK'
                );
                
                console.log('[CopilotManager] Message copied to clipboard, Copilot panel opened');
            } catch (error) {
                console.error('[CopilotManager] All methods failed:', error);
                throw new Error('Failed to send message to Copilot');
            }
        } catch (error) {
            console.error('[CopilotManager] Error opening Copilot:', error);
            throw error;
        }
    }

    /**
     * Créer une nouvelle conversation Copilot
     */
    public async createNewConversation(): Promise<void> {
        try {
            await vscode.commands.executeCommand('workbench.action.chat.newChat');
            console.log('[CopilotManager] New conversation created');
        } catch (error) {
            console.error('[CopilotManager] Error creating new conversation:', error);
            throw error;
        }
    }

    /**
     * Ouvrir le panel Copilot
     */
    public async openCopilotPanel(): Promise<void> {
        try {
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            console.log('[CopilotManager] Copilot panel opened');
        } catch (error) {
            console.error('[CopilotManager] Error opening Copilot panel:', error);
            throw error;
        }
    }
}
