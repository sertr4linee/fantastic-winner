import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ModelInfo, ModelsByVendor, ChangeModelPayload } from './types';

// === Stream Logger ===
const LOG_FILE = path.join(require('os').homedir(), 'copilot-stream-log.txt');

function logToFile(message: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logLine);
}

function logStreamChunk(chunkIndex: number, chunk: string): void {
  logToFile(`CHUNK #${chunkIndex}: ${JSON.stringify(chunk)}`);
}

function logStreamComplete(fullResponse: string, totalChunks: number): void {
  logToFile('─'.repeat(60));
  logToFile('COMPLETE RESPONSE:');
  logToFile(fullResponse);
  logToFile('─'.repeat(60));
  logToFile(`STATS: ${totalChunks} chunks, ${fullResponse.length} chars`);
  logToFile('═'.repeat(60) + '\n');
}

/**
 * ModelBridge - Interface entre VS Code Language Model API et le panel web
 * Permet de lister, grouper et changer les modèles Copilot
 */
export class ModelBridge {
  private static instance: ModelBridge;
  private disposables: vscode.Disposable[] = [];
  private cachedModels: ModelInfo[] = [];
  private onModelsChangedCallback?: (models: ModelsByVendor) => void;

  private constructor() {
    // Écouter les changements de modèles disponibles
    this.disposables.push(
      vscode.lm.onDidChangeChatModels(() => {
        console.log('[ModelBridge] Models changed, refreshing...');
        this.refreshModels();
      })
    );
  }

  public static getInstance(): ModelBridge {
    if (!ModelBridge.instance) {
      ModelBridge.instance = new ModelBridge();
    }
    return ModelBridge.instance;
  }

  /**
   * Récupère tous les modèles disponibles via l'API vscode.lm
   */
  public async getAllModels(): Promise<ModelInfo[]> {
    try {
      // Récupérer TOUS les modèles (sans filtre)
      const models = await vscode.lm.selectChatModels();
      
      this.cachedModels = models.map(model => ({
        id: model.id,
        name: model.name,
        vendor: model.vendor,
        family: model.family,
        version: model.version,
        maxInputTokens: model.maxInputTokens,
        // Les modèles avec un grand contexte sont généralement compatibles agent
        isAgentCompatible: this.checkAgentCompatibility(model)
      }));

      console.log(`[ModelBridge] Found ${this.cachedModels.length} models`);
      return this.cachedModels;
    } catch (error) {
      console.error('[ModelBridge] Error fetching models:', error);
      return [];
    }
  }

  /**
   * Groupe les modèles par vendor
   */
  public async getModelsByVendor(): Promise<ModelsByVendor> {
    const models = await this.getAllModels();
    
    return models.reduce((acc, model) => {
      const vendor = model.vendor || 'unknown';
      if (!acc[vendor]) {
        acc[vendor] = [];
      }
      acc[vendor].push(model);
      return acc;
    }, {} as ModelsByVendor);
  }

  /**
   * Change le modèle actif dans Copilot Chat
   * Utilise la commande interne découverte: workbench.action.chat.changeModel
   */
  public async changeModel(payload: ChangeModelPayload): Promise<boolean> {
    try {
      console.log(`[ModelBridge] Changing model to: ${payload.id} (${payload.vendor})`);
      
      await vscode.commands.executeCommand('workbench.action.chat.changeModel', {
        vendor: payload.vendor,
        id: payload.id,
        family: payload.family
      });

      vscode.window.showInformationMessage(`✅ Model changed to: ${payload.id}`);
      return true;
    } catch (error) {
      console.error('[ModelBridge] Error changing model:', error);
      vscode.window.showErrorMessage(`Failed to change model: ${error}`);
      return false;
    }
  }

  /**
   * Vérifie si un modèle est compatible avec le mode agent
   * Basé sur les capacités (vision, tool calling, tokens)
   */
  private checkAgentCompatibility(model: vscode.LanguageModelChat): boolean {
    // Les modèles avec un contexte > 32k sont généralement compatibles agent
    // On peut aussi vérifier la famille du modèle
    const agentFamilies = [
      'gpt-4', 'gpt-4o', 'gpt-4.1', 'gpt-5',
      'claude-3', 'claude-sonnet', 'claude-opus', 'claude-4',
      'gemini-pro', 'gemini-2'
    ];
    
    const familyLower = model.family.toLowerCase();
    const hasLargeContext = model.maxInputTokens >= 32000;
    const isAgentFamily = agentFamilies.some(f => familyLower.includes(f.toLowerCase()));
    
    return hasLargeContext || isAgentFamily;
  }

  /**
   * Rafraîchit la liste des modèles et notifie les listeners
   */
  private async refreshModels(): Promise<void> {
    const modelsByVendor = await this.getModelsByVendor();
    if (this.onModelsChangedCallback) {
      this.onModelsChangedCallback(modelsByVendor);
    }
  }

  /**
   * Enregistre un callback pour les changements de modèles
   */
  public onModelsChanged(callback: (models: ModelsByVendor) => void): void {
    this.onModelsChangedCallback = callback;
  }

  /**
   * Envoie un message au modèle sélectionné et retourne la réponse en streaming
   */
  public async sendMessage(
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      console.log('[ModelBridge] Sending message to LM API...');
      
      // Obtenir tous les modèles disponibles
      const models = await vscode.lm.selectChatModels();
      
      if (models.length === 0) {
        throw new Error('No language models available');
      }

      // Utiliser le premier modèle disponible (ou on pourrait garder une référence au modèle actif)
      const model = models[0];
      
      console.log(`[ModelBridge] Using model: ${model.id}`);

      // Créer la requête de chat
      const messages = [
        vscode.LanguageModelChatMessage.User(message)
      ];

      const request = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

      // Streamer la réponse
      for await (const chunk of request.text) {
        onChunk(chunk);
      }

      onComplete();
      console.log('[ModelBridge] Message completed successfully');
    } catch (error) {
      console.error('[ModelBridge] Error sending message:', error);
      onError(String(error));
    }
  }

  /**
   * Envoie un prompt à Copilot Chat via la commande directe
   * Utilise workbench.action.chat.open pour ouvrir le chat avec le prompt
   */
  public async sendToCopilotChat(
    prompt: string,
    onWord: (word: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onChatOpened: () => void
  ): Promise<void> {
    try {
      console.log('[ModelBridge] Sending to Copilot Chat via command...');
      console.log('[ModelBridge] Prompt:', prompt);

      // Ouvrir le chat Copilot et envoyer le message directement
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: prompt,
        isPartialQuery: false
      });

      onChatOpened();
      console.log('[ModelBridge] Copilot Chat opened with prompt');

      // Attendre un peu pour que le chat traite le message
      await new Promise(resolve => setTimeout(resolve, 500));

      // Puisque nous ne pouvons pas intercepter la réponse du chat UI,
      // on utilise aussi l'API LM pour obtenir une réponse streamée
      let models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      
      if (models.length === 0) {
        console.log('[ModelBridge] No Copilot models found, trying all models...');
        models = await vscode.lm.selectChatModels();
      }
      
      if (models.length === 0) {
        throw new Error('No language models available');
      }

      // Préférer gpt-4o ou claude si disponible
      const preferredFamilies = ['gpt-4o', 'gpt-4', 'claude-sonnet', 'claude-opus'];
      let selectedModel = models[0];
      
      for (const family of preferredFamilies) {
        const found = models.find(m => m.family.toLowerCase().includes(family));
        if (found) {
          selectedModel = found;
          break;
        }
      }
      
      console.log(`[ModelBridge] Using model: ${selectedModel.id} (vendor: ${selectedModel.vendor}, family: ${selectedModel.family})`);

      // Créer la requête avec le prompt
      const messages = [
        vscode.LanguageModelChatMessage.User(prompt)
      ];

      const request = await selectedModel.sendRequest(
        messages, 
        {}, 
        new vscode.CancellationTokenSource().token
      );

      // Streamer la réponse chunk par chunk en temps réel
      // L'API vscode.lm retourne des chunks de taille variable
      let fullResponse = '';
      let chunkIndex = 0;
      
      logToFile(`NEW REQUEST: Model=${selectedModel.id}, Prompt="${prompt.substring(0, 100)}..."`);
      
      for await (const chunk of request.text) {
        // Envoyer immédiatement chaque chunk reçu du modèle
        // Pas de délai artificiel pour un streaming vraiment temps réel
        if (chunk) {
          fullResponse += chunk;
          chunkIndex++;
          
          // === DEBUG: Log détaillé de chaque chunk ===
          console.log(`[STREAM #${chunkIndex}] Raw chunk (${chunk.length} chars):`, JSON.stringify(chunk));
          logStreamChunk(chunkIndex, chunk);
          
          onWord(chunk);
        }
      }
      
      // === DEBUG: Log de la réponse complète ===
      console.log('[STREAM COMPLETE] Full response:');
      console.log('─'.repeat(50));
      console.log(fullResponse);
      console.log('─'.repeat(50));
      console.log(`[STREAM STATS] Total chunks: ${chunkIndex}, Total chars: ${fullResponse.length}`);
      
      logStreamComplete(fullResponse, chunkIndex);

      onComplete();
      console.log('[ModelBridge] Copilot response completed successfully');
    } catch (error) {
      console.error('[ModelBridge] Error sending to Copilot:', error);
      onError(String(error));
    }
  }

  /**
   * Nettoie les ressources
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
