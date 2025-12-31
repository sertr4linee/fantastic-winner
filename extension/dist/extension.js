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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const server_1 = require("./server");
const modelBridge_1 = require("./modelBridge");
const chatParticipant_1 = require("./chatParticipant");
const sidebarProvider_1 = require("./sidebarProvider");
let server;
async function activate(context) {
    console.log('[AI App Builder] Extension activating...');
    const config = vscode.workspace.getConfiguration('aiAppBuilder');
    const port = config.get('serverPort', 57129);
    const autoOpen = config.get('autoOpen', true);
    // Initialiser le ModelBridge
    const modelBridge = modelBridge_1.ModelBridge.getInstance();
    // Initialiser le Chat Participant Bridge (@builder)
    const chatParticipant = chatParticipant_1.ChatParticipantBridge.getInstance();
    chatParticipant.register(context);
    // Enregistrer le Sidebar Provider
    const sidebarProvider = new sidebarProvider_1.SidebarProvider(context.extensionUri, port);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(sidebarProvider_1.SidebarProvider.viewType, sidebarProvider));
    // Commande: Ouvrir le panel
    const openPanelCmd = vscode.commands.registerCommand('aiAppBuilder.openPanel', async () => {
        const url = `http://127.0.0.1:${port}`;
        // Ouvrir dans le navigateur externe ou Simple Browser
        const choice = await vscode.window.showQuickPick(['Open in Simple Browser (inside VS Code)', 'Open in External Browser'], { placeHolder: 'Where would you like to open the AI App Builder?' });
        if (choice?.includes('Simple Browser')) {
            await vscode.commands.executeCommand('simpleBrowser.show', vscode.Uri.parse(url));
        }
        else if (choice?.includes('External')) {
            await vscode.env.openExternal(vscode.Uri.parse(url));
        }
    });
    // Commande: Lister les modèles
    const listModelsCmd = vscode.commands.registerCommand('aiAppBuilder.listModels', async () => {
        const modelsByVendor = await modelBridge.getModelsByVendor();
        const items = [];
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
        const items = [];
        const modelMap = new Map();
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
    // Démarrer le serveur
    try {
        server = new server_1.AppBuilderServer(port);
        const url = await server.start();
        vscode.window.showInformationMessage(`🚀 AI App Builder running at ${url}`, 'Open Panel').then(selection => {
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
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to start AI App Builder server: ${error}`);
    }
    console.log('[AI App Builder] Extension activated');
}
function deactivate() {
    console.log('[AI App Builder] Deactivating...');
    if (server) {
        server.stop();
    }
    modelBridge_1.ModelBridge.getInstance().dispose();
    console.log('[AI App Builder] Deactivated');
}
//# sourceMappingURL=extension.js.map