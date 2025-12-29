# Guide de Test - Système de Chat Copilot

## Test Rapide

### 1. Test en Mode Développement (Simulé)

```bash
# Terminal 1 - Démarrer Next.js
cd www
npm run dev
```

Ouvrez `http://localhost:3000` dans votre navigateur.

**Vérifications :**
- ✅ Badge jaune "Mode Développement" visible en haut à droite
- ✅ Status affiché comme "Simulé" ou "Déconnecté"
- ✅ Les modèles se chargent (avec mention "Mock" dans le nom)
- ✅ Envoyez un message → Réponse commence par "🚧 MODE DÉVELOPPEMENT 🚧"
- ✅ Le texte s'affiche mot par mot (streaming simulé)

### 2. Test en Mode Extension VS Code (Copilot Réel)

```bash
# Terminal 1 - Compiler l'extension
npm run watch
```

```bash
# Terminal 2 - Démarrer Next.js
cd www
npm run dev
```

**Dans VS Code :**
1. Appuyez sur `F5` pour lancer l'extension en mode debug
2. Dans la nouvelle fenêtre VS Code, cliquez sur l'icône de l'extension
3. Le serveur Express démarre (port 60885)
4. Ouvrez le navigateur via le bouton de l'extension

**Vérifications :**
- ✅ Pas de badge "Mode Développement"
- ✅ Status affiché comme "Connecté"
- ✅ Les modèles Copilot réels apparaissent (GPT-4, Claude, etc.)
- ✅ Envoyez un message → Réponse générée par Copilot
- ✅ Le texte s'affiche en streaming temps réel
- ✅ Le chemin du workspace actif s'affiche

## Commandes de Test Manuelles

### Tester la santé du serveur Express

```bash
curl http://localhost:60885/api/health
# Réponse attendue: {"status":"ok"}
```

### Tester la récupération des modèles

```bash
curl http://localhost:60885/api/models
# Doit retourner la liste des modèles Copilot disponibles
```

### Tester le chat (non-streaming)

```bash
curl -X POST http://localhost:60885/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "modelId": "copilot-gpt-4",
    "stream": false
  }'
```

### Tester le chat (streaming)

```bash
curl -N -X POST http://localhost:60885/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Count to 5"}],
    "modelId": "copilot-gpt-4",
    "stream": true
  }'
```

## Scénarios de Test

### Scénario 1 : Développement Frontend Uniquement
**Cas d'usage :** Designer/Frontend qui travaille sur l'UI sans VS Code

1. `cd www && npm run dev`
2. Interface fonctionne avec des données simulées
3. Peut tester tous les composants UI
4. Les messages sont répondus instantanément (mock)

### Scénario 2 : Développement Complet avec Copilot
**Cas d'usage :** Développeur qui veut tester avec les vrais modèles

1. Lancer l'extension VS Code (F5)
2. Lancer Next.js (`cd www && npm run dev`)
3. Les requêtes sont automatiquement redirigées vers le serveur Express
4. Les vraies réponses Copilot sont utilisées

### Scénario 3 : Production via Extension
**Cas d'usage :** Utilisateur final qui installe l'extension

1. Installer l'extension depuis le marketplace
2. Cliquer sur l'icône dans la barre latérale VS Code
3. L'interface s'ouvre automatiquement dans le navigateur
4. Tout fonctionne out-of-the-box

## Dépannage

### Problème : "Les requêtes ne vont pas vers Copilot"

**Solution :**
1. Vérifier que le serveur Express tourne :
   ```bash
   curl http://localhost:60885/api/health
   ```
2. Si ça ne répond pas, redémarrer l'extension VS Code
3. Vérifier les logs dans la console de sortie VS Code (View → Output → Extension)

### Problème : "Le streaming ne fonctionne pas"

**Solution :**
1. Vérifier que le header `Content-Type: text/event-stream` est présent
2. Ouvrir les DevTools du navigateur → Network → Voir la requête à `/api/chat`
3. Vérifier que les données arrivent en chunks, pas en une seule fois

### Problème : "Les modèles ne chargent pas"

**Solution :**
1. Vérifier que vous êtes connecté à GitHub Copilot dans VS Code
2. Vérifier votre licence Copilot : `vscode.lm.selectChatModels()` devrait retourner des modèles
3. Essayer de redémarrer VS Code

### Problème : "Mode développement ne se désactive pas"

**Solution :**
1. Le mode est détecté automatiquement via un appel à `/api/health`
2. Vérifier que le serveur Express est bien sur le port 60885
3. Vérifier qu'il n'y a pas de firewall qui bloque le port
4. Rafraîchir la page du navigateur (le check se fait au chargement)

## Logs Utiles

### Dans le navigateur (Console)
```
[Chat API] Running in standalone mode (dev)
[Models API] Running in standalone mode (dev)
[Status API] Running in standalone mode (dev)
```
ou
```
[Chat API] Redirecting to Express server at http://localhost:60885
[Models API] Fetching real Copilot models from http://localhost:60885
[Status API] Fetching status from http://localhost:60885
```

### Dans VS Code (Output → Extension)
```
Server started on port 60885
Request: GET /api/health
Request: GET /api/models
Request: POST /api/chat
```

## Checklist Complète

- [ ] Mode dev standalone fonctionne sans VS Code
- [ ] Les modèles mock s'affichent en mode dev
- [ ] Les réponses simulées fonctionnent en mode dev
- [ ] Le badge "Mode Développement" s'affiche correctement
- [ ] L'extension VS Code démarre sans erreur
- [ ] Le serveur Express démarre sur le port 60885
- [ ] La page web détecte automatiquement le serveur Express
- [ ] Les vrais modèles Copilot apparaissent
- [ ] Le chat envoie des messages à Copilot
- [ ] Le streaming fonctionne en temps réel
- [ ] Le bouton "Stop Generation" fonctionne
- [ ] Le bouton "Clear Chat" fonctionne
- [ ] Le chemin du workspace s'affiche correctement
- [ ] Les icônes de status changent selon le mode
