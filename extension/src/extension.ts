import * as vscode from 'vscode';
import { AppBuilderServer } from './server';
import { ModelBridge } from './modelBridge';
import { ChatParticipantBridge } from './chatParticipant';
import { SidebarProvider } from './sidebarProvider';
import { ProcessManager } from './processManager';

let server: AppBuilderServer | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('[AI App Builder] Extension activating...');

  const config = vscode.workspace.getConfiguration('aiAppBuilder');
  const port = config.get<number>('serverPort', 57129);
  const autoOpen = config.get<boolean>('autoOpen', true);

  // Initialiser le ModelBridge
  const modelBridge = ModelBridge.getInstance();

  // Initialiser le Chat Participant Bridge (@builder)
  const chatParticipant = ChatParticipantBridge.getInstance();
  chatParticipant.register(context);

  // Enregistrer le Sidebar Provider
  const sidebarProvider = new SidebarProvider(context.extensionUri, port);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider)
  );

  // Commande: Ouvrir le panel
  const openPanelCmd = vscode.commands.registerCommand('aiAppBuilder.openPanel', async () => {
    const url = `http://127.0.0.1:${port}`;
    
    // Ouvrir dans le navigateur externe ou Simple Browser
    const choice = await vscode.window.showQuickPick(
      ['Open in Simple Browser (inside VS Code)', 'Open in External Browser'],
      { placeHolder: 'Where would you like to open the AI App Builder?' }
    );

    if (choice?.includes('Simple Browser')) {
      await vscode.commands.executeCommand('simpleBrowser.show', vscode.Uri.parse(url));
    } else if (choice?.includes('External')) {
      await vscode.env.openExternal(vscode.Uri.parse(url));
    }
  });

  // Commande: Lister les modèles
  const listModelsCmd = vscode.commands.registerCommand('aiAppBuilder.listModels', async () => {
    const modelsByVendor = await modelBridge.getModelsByVendor();
    
    const items: vscode.QuickPickItem[] = [];
    for (const [vendor, models] of Object.entries(modelsByVendor)) {
      items.push({
        label: `── ${vendor.toUpperCase()} ──`,
        kind: vscode.QuickPickItemKind.Separator
      });
      for (const model of models) {
        items.push({
          label: `${model.isAgentCompatible ? '🤖' : '💬'} ${model.name}`,
          description: model.id,
          detail: `Family: ${model.family} | Max tokens: ${model.maxInputTokens}`
        });
      }
    }

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Available AI Models',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (selected && selected.description) {
      // Proposer de changer vers ce modèle
      const change = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: `Switch to ${selected.label}?`
      });
      if (change === 'Yes') {
        const modelsByVendorAgain = await modelBridge.getModelsByVendor();
        for (const [vendor, models] of Object.entries(modelsByVendorAgain)) {
          const model = models.find(m => m.id === selected.description);
          if (model) {
            await modelBridge.changeModel({
              vendor: model.vendor,
              id: model.id,
              family: model.family
            });
            break;
          }
        }
      }
    }
  });

  // Commande: Changer le modèle (Quick Pick)
  const changeModelCmd = vscode.commands.registerCommand('aiAppBuilder.changeModel', async () => {
    const modelsByVendor = await modelBridge.getModelsByVendor();
    
    const items: vscode.QuickPickItem[] = [];
    const modelMap = new Map<string, { vendor: string; id: string; family: string }>();

    for (const [vendor, models] of Object.entries(modelsByVendor)) {
      items.push({
        label: vendor.toUpperCase(),
        kind: vscode.QuickPickItemKind.Separator
      });
      for (const model of models) {
        const key = `${model.vendor}:${model.id}`;
        modelMap.set(key, { vendor: model.vendor, id: model.id, family: model.family });
        items.push({
          label: `${model.isAgentCompatible ? '🤖' : '💬'} ${model.name}`,
          description: model.id,
          detail: `${model.isAgentCompatible ? 'Agent Compatible' : 'Chat Only'}`
        });
      }
    }

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a model to activate in Copilot Chat'
    });

    if (selected && selected.description) {
      for (const [key, modelInfo] of modelMap.entries()) {
        if (modelInfo.id === selected.description) {
          await modelBridge.changeModel(modelInfo);
          break;
        }
      }
    }
  });

  context.subscriptions.push(openPanelCmd, listModelsCmd, changeModelCmd);

  // Commande: Process Manager Stats
  const processStatsCmd = vscode.commands.registerCommand('aiAppBuilder.processStats', async () => {
    const processManager = ProcessManager.getInstance(context);
    const stats = await processManager.getStats();
    
    const info = [
      '📊 Process Manager Statistics',
      '',
      `Registered Ports: ${stats.registeredPorts.join(', ') || 'None'}`,
      '',
      'Active Processes:',
      ...stats.usedPorts.map(p => `  - Port ${p.port}: ${p.pids.length} process(es) (PIDs: ${p.pids.join(', ')})`),
      stats.usedPorts.length === 0 ? '  (No active processes)' : ''
    ].join('\n');
    
    const choice = await vscode.window.showInformationMessage(
      info,
      { modal: true },
      'Cleanup All', 'Close'
    );
    
    if (choice === 'Cleanup All') {
      await processManager.cleanup();
      vscode.window.showInformationMessage('✨ All processes cleaned up!');
    }
  });

  context.subscriptions.push(processStatsCmd);

  // Démarrer le serveur
  try {
    server = new AppBuilderServer(port, context);
    const url = await server.start();
    
    vscode.window.showInformationMessage(
      `🚀 AI App Builder running at ${url}`,
      'Open Panel'
    ).then(selection => {
      if (selection === 'Open Panel') {
        vscode.commands.executeCommand('aiAppBuilder.openPanel');
      }
    });

    // Auto-open si configuré
    if (autoOpen) {
      setTimeout(() => {
        vscode.commands.executeCommand('simpleBrowser.show', vscode.Uri.parse(url));
      }, 1000);
    }

  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start AI App Builder server: ${error}`);
  }

  console.log('[AI App Builder] Extension activated');
}

export function deactivate() {
  console.log('[AI App Builder] Deactivating...');
  
  if (server) {
    server.stop();
  }
  
  ModelBridge.getInstance().dispose();
  
  // Le ProcessManager sera nettoyé automatiquement via context.subscriptions
  console.log('[AI App Builder] Deactivated');
}
