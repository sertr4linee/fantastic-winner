# AI App Builder - VS Code Control Panel

🚀 **Extension VS Code locale** qui expose un panel Next.js pour contrôler GitHub Copilot.

## 🎯 Fonctionnalités

- ✅ **Lister tous les modèles** disponibles dans GitHub Copilot via `vscode.lm.selectChatModels()`
- ✅ **Grouper par vendor** (OpenAI, Anthropic, Google, etc.)
- ✅ **Identifier les modèles Agent-compatible** (contexte > 32K, tool calling)
- ✅ **Changer le modèle actif** dans Copilot Chat directement depuis le panel
- ✅ **Communication WebSocket** temps réel entre l'extension et le panel
- ✅ **UI moderne** avec AI Elements / shadcn/ui style
- ✅ **Chat interactif** - Envoyer des messages et recevoir des réponses en streaming
- ✅ **Interface conversationnelle** avec historique des messages

## 📁 Structure du Projet

```
ai-app-builder/
├── extension/                 # Extension VS Code
│   ├── src/
│   │   ├── extension.ts       # Point d'entrée
│   │   ├── server.ts          # Serveur HTTP + WebSocket (port 57129)
│   │   ├── modelBridge.ts     # Bridge API vscode.lm
│   │   └── types.ts           # Types partagés
│   ├── package.json
│   └── tsconfig.json
│
└── web-panel/                 # Panel Next.js
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx       # Page principale
    │   │   ├── layout.tsx     # Layout
    │   │   └── globals.css    # Styles Tailwind
    │   ├── components/
    │   │   └── ai-elements/   # Composants UI
    │   │       ├── model-selector.tsx
    │   │       ├── panel.tsx
    │   │       └── connection-status.tsx
    │   ├── hooks/
    │   │   └── useVSCodeBridge.ts  # Hook WebSocket
    │   └── types.ts
    ├── package.json
    └── next.config.mjs
```

## 🛠️ Installation

### 1. Extension VS Code

```bash
cd extension

# Installer les dépendances
npm install

# Compiler
npm run compile

# Pour le développement
npm run watch
```

### 2. Panel Web Next.js

```bash
cd web-panel

# Installer les dépendances
npm install

# Installer les composants AI Elements
npx ai-elements@latest init
mainpx ai-elements@latest add panel
npx ai-elements@latest add conversation

# Lancer en développement
npm run dev
```

### 3. Tester l'extension

1. Ouvrir le dossier `extension/` dans VS Code
2. Appuyer sur `F5` pour lancer en mode debug
3. L'extension démarre automatiquement le serveur sur `http://127.0.0.1:57129`
4. Le panel s'ouvre automatiquement dans le Simple Browser

## 🔧 API Interne Découverte

### Changer le modèle Copilot Chat

```typescript
// Commande VS Code interne pour changer le modèle actif
await vscode.commands.executeCommand('workbench.action.chat.changeModel', {
  vendor: 'copilot',        // ou 'anthropic', 'openai', etc.
  id: 'claude-sonnet-4',    // ID du modèle
  family: 'claude-sonnet-4' // Famille du modèle
});
```

### Lister les modèles disponibles

```typescript
// Obtenir tous les modèles (sans filtre)
const allModels = await vscode.lm.selectChatModels();

// Filtrer par vendor
const copilotModels = await vscode.lm.selectChatModels({ vendor: 'copilot' });

// Écouter les changements
vscode.lm.onDidChangeChatModels(() => {
  // Rafraîchir la liste
});
```

### Settings Custom Models (découverts)

```json
{
  "github.copilot.chat.customOAIModels": {
    "my-local-model": {
      "name": "Local Ollama Model",
      "url": "http://localhost:11434/v1/chat/completions",
      "toolCalling": true,
      "vision": false,
      "maxInputTokens": 128000,
      "maxOutputTokens": 4096,
      "requiresAPIKey": false
    }
  },
  "github.copilot.chat.byok.ollamaEndpoint": "http://localhost:11434"
}
```

## 🌐 Architecture Communication

```
┌─────────────────────────────────────────────────────────────┐
│                 Next.js Panel (port 57129)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ModelSelector│  │ Stats Cards │  │  Connection Status  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼───────────────────┬┼─────────────┘
          │                │                   ││
          │    WebSocket (ws://127.0.0.1:57129) │
          │                │                   ││
┌─────────▼────────────────▼───────────────────▼▼─────────────┐
│              VS Code Extension Host                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ AppBuilderServer (Express + WebSocket)                  ││
│  │  • /api/health     - Health check                       ││
│  │  • /api/models     - Liste des modèles (REST fallback)  ││
│  │  • /api/info       - Infos serveur                      ││
│  │  • ws://           - Communication temps réel           ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ModelBridge                                             ││
│  │  • vscode.lm.selectChatModels()                         ││
│  │  • vscode.lm.onDidChangeChatModels                      ││
│  │  • vscode.commands.executeCommand(changeModel)          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 📝 Messages WebSocket

| Type | Direction | Description |
|------|-----------|-------------|
| `listModels` | Client → Server | Demande la liste des modèles |
| `modelsUpdated` | Server → Client | Liste des modèles groupés par vendor |
| `changeModel` | Client → Server | Changer le modèle actif |
| `modelChanged` | Server → Client | Confirmation du changement |
| `sendMessage` | Client → Server | Envoyer un message au modèle LM |
| `messageChunk` | Server → Client | Chunk de réponse en streaming |
| `messageComplete` | Server → Client | Fin du streaming |
| `messageError` | Server → Client | Erreur lors du traitement |
| `ping/pong` | Bidirectionnel | Keep-alive |

## 🎨 Composants UI (AI Elements Style)

- **ModelSelector** - Command palette pour sélectionner un modèle
- **Panel** - Layout principal avec Header/Content/Footer
- **ConnectionStatus** - Indicateur de connexion WebSocket
- **Conversation** - Zone de conversation avec auto-scroll
- **Message** - Composant de message (user/assistant)
- **PromptInput** - Input avec support multi-ligne et fichiers

## 📄 License

MIT
