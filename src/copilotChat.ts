import * as vscode from 'vscode';

/**
 * Gestionnaire pour interagir avec le chat Copilot natif de VS Code
 */
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
     * Ouvre le panel Copilot et envoie un message automatiquement
     */
    async openCopilotWithMessage(message: string): Promise<void> {
        try {
            // Ouvrir le panel Copilot Chat
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            
            // Attendre que le panel s'ouvre
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Essayer d'envoyer le message via l'API Chat
            try {
                // Utiliser l'API de chat pour envoyer directement le message
                await vscode.commands.executeCommand('workbench.action.chat.sendToNewChat', {
                    query: message
                });
                
                vscode.window.showInformationMessage('✅ Message envoyé au chat Copilot');
            } catch (chatError) {
                console.log('Méthode directe échouée, utilisation du clipboard:', chatError);
                
                // Fallback: Copier dans le clipboard et simuler le collage
                await vscode.env.clipboard.writeText(message);
                
                // Essayer de coller automatiquement avec Ctrl+V / Cmd+V
                await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
                
                // Si ça ne marche pas, notifier l'utilisateur
                setTimeout(async () => {
                    const clipboardContent = await vscode.env.clipboard.readText();
                    if (clipboardContent === message) {
                        vscode.window.showInformationMessage(
                            '✅ Message copié ! Appuyez sur Ctrl+V (Windows/Linux) ou Cmd+V (Mac) puis Entrée pour envoyer',
                            'OK'
                        );
                    }
                }, 200);
            }
            
            return;
        } catch (error) {
            console.error('Error opening Copilot chat:', error);
            throw new Error('Impossible d\'ouvrir le chat Copilot. Assurez-vous que Copilot est installé et activé.');
        }
    }

    /**
     * Ouvre le panel Copilot
     */
    async openCopilotPanel(): Promise<void> {
        try {
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
        } catch (error) {
            console.error('Error opening Copilot panel:', error);
            // Essayer avec une autre commande
            try {
                await vscode.commands.executeCommand('workbench.action.chat.open');
            } catch (err) {
                throw new Error('Impossible d\'ouvrir le chat Copilot');
            }
        }
    }

    /**
     * Crée une nouvelle conversation Copilot
     */
    async createNewChat(): Promise<void> {
        try {
            // Ouvrir le chat Copilot
            await this.openCopilotPanel();
            
            // Essayer de créer un nouveau chat
            await vscode.commands.executeCommand('workbench.action.chat.clear');
            
            vscode.window.showInformationMessage('✅ Nouvelle conversation Copilot créée');
        } catch (error) {
            console.error('Error creating new chat:', error);
            throw new Error('Impossible de créer une nouvelle conversation');
        }
    }

    /**
     * Vérifie si Copilot est disponible
     */
    async isCopilotAvailable(): Promise<boolean> {
        try {
            // Vérifier si l'extension Copilot est installée
            const copilotExtension = vscode.extensions.getExtension('github.copilot');
            const copilotChatExtension = vscode.extensions.getExtension('github.copilot-chat');
            
            return !!(copilotExtension || copilotChatExtension);
        } catch (error) {
            return false;
        }
    }

    /**
     * Ouvre les paramètres Copilot
     */
    async openCopilotSettings(): Promise<void> {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'copilot');
    }
}
