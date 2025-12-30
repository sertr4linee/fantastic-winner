import * as vscode from 'vscode';

export type CopilotPromptStatus = 'idle' | 'copying' | 'pasting' | 'waiting' | 'done' | 'error';

export interface CopilotPromptResult {
    success: boolean;
    status: CopilotPromptStatus;
    message?: string;
    response?: string;
    error?: string;
    modelId?: string;
}

/**
 * Gestionnaire pour interagir avec le chat Copilot natif de VS Code
 */
export class CopilotChatManager {
    private static instance: CopilotChatManager;
    private lastPrompt: string = '';
    private lastResponse: string = '';
    private isProcessing: boolean = false;
    private statusEmitter = new vscode.EventEmitter<CopilotPromptStatus>();
    public readonly onStatusChange = this.statusEmitter.event;

    private constructor() {}

    public static getInstance(): CopilotChatManager {
        if (!CopilotChatManager.instance) {
            CopilotChatManager.instance = new CopilotChatManager();
        }
        return CopilotChatManager.instance;
    }

    /**
     * Retourne le statut actuel
     */
    public getStatus(): { isProcessing: boolean; lastPrompt: string; lastResponse: string } {
        return {
            isProcessing: this.isProcessing,
            lastPrompt: this.lastPrompt,
            lastResponse: this.lastResponse
        };
    }

    /**
     * Envoie un message au Copilot avec le workflow:
     * 1. Copie dans le presse-papier
     * 2. Ouvre le panel Copilot
     * 3. Colle et envoie automatiquement
     */
    async sendPromptToCopilot(message: string, modelId?: string): Promise<CopilotPromptResult> {
        if (this.isProcessing) {
            return {
                success: false,
                status: 'error',
                error: 'Un prompt est déjà en cours de traitement'
            };
        }

        this.isProcessing = true;
        this.lastPrompt = message;
        this.lastResponse = '';

        try {
            // Étape 1: Copier dans le presse-papier
            this.statusEmitter.fire('copying');
            console.log('[CopilotManager] Étape 1: Copie dans le presse-papier');
            await vscode.env.clipboard.writeText(message);
            
            // Notification pour l'utilisateur
            vscode.window.setStatusBarMessage('📋 Prompt copié dans le presse-papier...', 2000);

            // Étape 2: Ouvrir le panel Copilot
            this.statusEmitter.fire('pasting');
            console.log('[CopilotManager] Étape 2: Ouverture du panel Copilot');
            
            // Essayer d'abord la méthode directe
            let messageSent = false;
            
            try {
                // Méthode 1: workbench.action.chat.open avec query
                await vscode.commands.executeCommand('workbench.action.chat.open', {
                    query: message
                });
                messageSent = true;
                console.log('[CopilotManager] Message envoyé via workbench.action.chat.open');
            } catch (e) {
                console.log('[CopilotManager] Méthode 1 échouée, essai méthode 2');
            }

            if (!messageSent) {
                try {
                    // Méthode 2: Ouvrir panel puis sendToNewChat
                    await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    await vscode.commands.executeCommand('workbench.action.chat.sendToNewChat', {
                        query: message
                    });
                    messageSent = true;
                    console.log('[CopilotManager] Message envoyé via sendToNewChat');
                } catch (e) {
                    console.log('[CopilotManager] Méthode 2 échouée, essai méthode 3');
                }
            }

            if (!messageSent) {
                // Méthode 3: Focus + Paste manuelle
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Le message est déjà dans le clipboard, demander à l'utilisateur de coller
                vscode.window.showInformationMessage(
                    '📋 Prompt copié! Collez avec Cmd+V (Mac) ou Ctrl+V puis appuyez Entrée',
                    'OK'
                );
            }

            // Étape 3: Attente de la réponse
            this.statusEmitter.fire('waiting');
            console.log('[CopilotManager] Étape 3: En attente de réponse Copilot');
            
            vscode.window.setStatusBarMessage('🤖 Copilot traite votre demande...', 3000);

            this.statusEmitter.fire('done');
            this.isProcessing = false;

            return {
                success: true,
                status: 'done',
                message: messageSent 
                    ? 'Prompt envoyé au Copilot avec succès' 
                    : 'Prompt copié dans le presse-papier, collez-le manuellement',
                modelId
            };

        } catch (error) {
            console.error('[CopilotManager] Erreur:', error);
            this.statusEmitter.fire('error');
            this.isProcessing = false;

            return {
                success: false,
                status: 'error',
                error: error instanceof Error ? error.message : 'Erreur inconnue'
            };
        }
    }

    /**
     * Ouvre le panel Copilot et envoie un message automatiquement
     * @deprecated Utiliser sendPromptToCopilot à la place
     */
    async openCopilotWithMessage(message: string): Promise<void> {
        const result = await this.sendPromptToCopilot(message);
        if (!result.success) {
            throw new Error(result.error || 'Échec de l\'envoi');
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
     * Change le modèle utilisé pour le chat
     * 
     * IMPORTANT: VS Code n'expose PAS d'API publique pour changer le modèle 
     * sélectionné dans le panel Copilot Chat natif. La seule façon de le changer
     * est via le dropdown UI (model picker).
     * 
     * Cette méthode vérifie que le modèle est disponible via vscode.lm.selectChatModels()
     * et retourne true si c'est le cas. Le modèle sera utilisé directement via l'API
     * pour les requêtes chat (pas via le panel Copilot natif).
     * 
     * Référence: https://code.visualstudio.com/docs/copilot/customization/language-models
     */
    async setCopilotModel(modelId: string): Promise<boolean> {
        try {
            console.log('[CopilotManager] Checking model availability:', modelId);
            
            // Vérifier si le modèle est disponible via l'API vscode.lm
            const availableModels = await vscode.lm.selectChatModels();
            const foundModel = availableModels.find(m => m.id === modelId);
            
            if (!foundModel) {
                console.log('[CopilotManager] Model not found:', modelId);
                console.log('[CopilotManager] Available models:', availableModels.map(m => `${m.id} (${m.vendor})`));
                
                // Essayer de trouver par famille ou nom partiel
                const partialMatch = availableModels.find(m => 
                    m.id.toLowerCase().includes(modelId.toLowerCase()) ||
                    m.family?.toLowerCase().includes(modelId.toLowerCase()) ||
                    m.name?.toLowerCase().includes(modelId.toLowerCase())
                );
                
                if (partialMatch) {
                    console.log('[CopilotManager] Found partial match:', partialMatch.id);
                    vscode.window.setStatusBarMessage(`✅ Modèle: ${partialMatch.name || partialMatch.id}`, 3000);
                    return true;
                }
                
                vscode.window.showWarningMessage(
                    `Le modèle "${modelId}" n'est pas disponible. Vérifiez que vous avez accès à ce modèle.`,
                    'Voir les modèles disponibles'
                ).then(selection => {
                    if (selection === 'Voir les modèles disponibles') {
                        vscode.commands.executeCommand('workbench.action.chat.openEditSession');
                    }
                });
                return false;
            }
            
            console.log('[CopilotManager] Model available:', foundModel.id, '- Vendor:', foundModel.vendor);
            
            // Le modèle est disponible - il sera utilisé via l'API vscode.lm directement
            // Note: Impossible de changer le modèle dans le panel Copilot UI programmatiquement
            vscode.window.setStatusBarMessage(`✅ ${foundModel.name || foundModel.id} sélectionné`, 3000);
            
            return true;
        } catch (error) {
            console.error('[CopilotManager] Error checking model:', error);
            vscode.window.showErrorMessage(`Erreur lors de la vérification du modèle: ${error}`);
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
