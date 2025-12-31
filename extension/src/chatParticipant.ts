import * as vscode from 'vscode';
import { ModelBridge } from './modelBridge';

/**
 * Chat Participant Bridge - @builder
 * 
 * Ce participant permet de capturer les réponses Copilot directement dans le Chat UI
 * et de les streamer vers le web panel via WebSocket.
 * 
 * Usage: @builder <ton prompt>
 * 
 * Le flux:
 * 1. User tape @builder dans Copilot Chat
 * 2. Le handler reçoit le prompt
 * 3. On utilise le modèle sélectionné pour générer la réponse
 * 4. On streame simultanément:
 *    - Dans le Chat UI natif (via stream.markdown)
 *    - Vers le web panel (via callback)
 */

export interface ChatParticipantCallbacks {
  onPromptReceived: (prompt: string, requestId: string) => void;
  onResponseChunk: (chunk: string, requestId: string) => void;
  onResponseComplete: (fullResponse: string, requestId: string) => void;
  onResponseError: (error: string, requestId: string) => void;
}

export class ChatParticipantBridge {
  private static instance: ChatParticipantBridge;
  private participant: vscode.ChatParticipant | undefined;
  private modelBridge: ModelBridge;
  private callbacks: ChatParticipantCallbacks | undefined;
  private requestCounter = 0;

  private constructor() {
    this.modelBridge = ModelBridge.getInstance();
  }

  public static getInstance(): ChatParticipantBridge {
    if (!ChatParticipantBridge.instance) {
      ChatParticipantBridge.instance = new ChatParticipantBridge();
    }
    return ChatParticipantBridge.instance;
  }

  /**
   * Enregistre les callbacks pour la communication avec le web panel
   */
  public setCallbacks(callbacks: ChatParticipantCallbacks): void {
    this.callbacks = callbacks;
    console.log('[ChatParticipant] Callbacks registered');
  }

  /**
   * Initialise le chat participant @builder
   */
  public register(context: vscode.ExtensionContext): void {
    console.log('[ChatParticipant] Registering @builder participant...');

    // Créer le handler de requêtes
    const handler: vscode.ChatRequestHandler = async (
      request: vscode.ChatRequest,
      chatContext: vscode.ChatContext,
      stream: vscode.ChatResponseStream,
      token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> => {
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
  private async handleChatRequest(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    const requestId = `chat-${++this.requestCounter}-${Date.now()}`;
    const prompt = request.prompt;

    console.log(`[ChatParticipant] Received request #${requestId}: "${prompt.substring(0, 50)}..."`);

    // Notifier le web panel qu'on a reçu un prompt
    this.callbacks?.onPromptReceived(prompt, requestId);

    try {
      // Construire l'historique des messages
      const messages: vscode.LanguageModelChatMessage[] = [];

      // Ajouter le contexte de l'historique si disponible
      const previousMessages = chatContext.history.filter(
        h => h instanceof vscode.ChatResponseTurn || h instanceof vscode.ChatRequestTurn
      );

      for (const turn of previousMessages) {
        if (turn instanceof vscode.ChatRequestTurn) {
          messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
        } else if (turn instanceof vscode.ChatResponseTurn) {
          // Extraire le contenu des réponses précédentes
          let fullMessage = '';
          for (const part of turn.response) {
            if ('value' in part && part.value && typeof part.value === 'object' && 'value' in part.value) {
              fullMessage += (part.value as { value: string }).value;
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

    } catch (error) {
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
  public async sendPrompt(prompt: string): Promise<void> {
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
  public dispose(): void {
    if (this.participant) {
      this.participant.dispose();
    }
  }
}
