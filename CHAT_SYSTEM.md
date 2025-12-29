# Système de Chat avec Copilot

## Architecture

Le système de chat utilise une architecture à deux niveaux :

### 1. Mode Développement (Standalone)
- Utilisé lors du développement avec `npm run dev` dans le dossier `www/`
- Les requêtes API retournent des réponses **simulées**
- Les modèles affichés sont des modèles **mock**
- Utile pour tester l'interface sans avoir besoin de VS Code

### 2. Mode Extension VS Code
- Utilisé lorsque l'extension VS Code est active
- Les requêtes sont **redirigées** vers le serveur Express (port 60885 par défaut)
- Le serveur Express utilise l'API `vscode.lm` pour communiquer avec les vrais modèles Copilot
- Les réponses sont **streamées** en temps réel depuis Copilot

## Comment ça fonctionne

### Détection automatique du mode

Chaque route API (`/api/chat`, `/api/models`, `/api/status`) vérifie automatiquement si le serveur Express est disponible :

```typescript
async function isVSCodeExtensionMode(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:60885/api/health`, {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

### Route `/api/chat`

**En mode Extension VS Code :**
1. Reçoit le message de l'utilisateur et l'ID du modèle
2. Redirige la requête vers `http://localhost:60885/api/chat`
3. Le serveur Express communique avec `vscode.lm.selectChatModels()`
4. La réponse est streamée depuis Copilot via Server-Sent Events (SSE)
5. Le frontend reçoit les fragments de texte en temps réel

**En mode Développement :**
1. Retourne une réponse simulée
2. Simule le streaming en envoyant le texte mot par mot
3. Affiche un message indiquant qu'il s'agit d'une simulation

### Route `/api/models`

**En mode Extension VS Code :**
- Récupère les vrais modèles disponibles via `vscode.lm.selectChatModels()`
- Retourne tous les modèles Copilot disponibles (GPT-4, Claude, etc.)

**En mode Développement :**
- Retourne une liste de modèles mock pour le développement

### Route `/api/status`

**En mode Extension VS Code :**
- Retourne le chemin du workspace actif
- Indique le nombre de clients WebSocket connectés
- Status : `"connected"`

**En mode Développement :**
- Retourne le répertoire de travail actuel
- Status : `"standalone"`
- Flag `isDevelopmentMode: true`

## Flux de données

```
┌─────────────────────┐
│   Interface Web     │
│   (Next.js)         │
└──────────┬──────────┘
           │
           │ 1. Envoie message
           ▼
┌─────────────────────┐
│   API Routes        │
│   (Next.js API)     │
└──────────┬──────────┘
           │
           │ 2. Détecte le mode
           ▼
     ┌─────┴─────┐
     │           │
     ▼           ▼
MODE DEV     MODE EXTENSION
     │           │
     │           │ 3. Proxy vers Express
     │           ▼
     │    ┌─────────────────────┐
     │    │   Express Server    │
     │    │   (src/server.ts)   │
     │    └──────────┬──────────┘
     │               │
     │               │ 4. Appel API VS Code
     │               ▼
     │    ┌─────────────────────┐
     │    │   vscode.lm API     │
     │    │   (Copilot)         │
     │    └──────────┬──────────┘
     │               │
     │               │ 5. Stream réponse
     ▼               ▼
   Réponse       Réponse
   simulée       réelle
```

## Utilisation

### Pour le développement :

```bash
cd www
npm run dev
```

L'application s'ouvre sur `http://localhost:3000`. Les réponses seront simulées.

### Pour utiliser les vrais modèles Copilot :

1. Compilez l'extension VS Code :
   ```bash
   npm run watch  # ou npm run compile
   ```

2. Ouvrez VS Code et lancez l'extension (F5)

3. Cliquez sur l'icône de l'extension dans la barre latérale

4. Le serveur Express démarre sur le port 60885

5. L'interface web détecte automatiquement le serveur et commence à utiliser les vrais modèles

## Configuration

Le port du serveur Express peut être configuré dans :
- `.vscode/settings.json` : `"copilotModelsViewer.port": 60885`
- Variable d'environnement : `EXPRESS_SERVER_PORT=60885`

## Dépannage

### Les requêtes ne sont pas envoyées à Copilot

1. Vérifiez que l'extension VS Code est active
2. Vérifiez que le serveur Express est démarré (devrait être sur le port 60885)
3. Testez manuellement : `curl http://localhost:60885/api/health`
4. Regardez les logs dans la console du navigateur pour voir si le mode est détecté

### Les modèles ne s'affichent pas

1. Vérifiez que vous êtes connecté à GitHub Copilot dans VS Code
2. Vérifiez que vous avez une licence Copilot active
3. Regardez les logs du serveur Express dans la sortie VS Code

### Le streaming ne fonctionne pas

1. Vérifiez que les en-têtes SSE sont correctement configurés
2. Vérifiez qu'il n'y a pas de proxy ou middleware qui bloque le streaming
3. Testez avec `stream: false` pour des réponses non-streamées

## Améliorations futures

- [ ] Ajouter un cache pour les modèles
- [ ] Supporter plusieurs workspaces simultanément
- [ ] Ajouter des métriques de performance
- [ ] Permettre de choisir le port dynamiquement
- [ ] Ajouter une reconnexion automatique en cas de déconnexion
