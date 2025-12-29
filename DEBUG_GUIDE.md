# Guide de Débogage - Système de Chat

## Étapes de Debug

### 1. Vérifier que le serveur Express est actif

Ouvrir VS Code et :
1. Appuyer sur `F5` pour lancer l'extension en mode debug
2. Ouvrir la vue "Output" (Affichage > Sortie)
3. Sélectionner "Copilot Models Viewer Server" dans le menu déroulant
4. Vérifier qu'il y a un message : "Server running on http://localhost:60885"

### 2. Tester le serveur Express manuellement

Dans un terminal :

```bash
# Test 1: Health check
curl http://localhost:60885/api/health

# Devrait retourner: {"status":"ok"}

# Test 2: Récupérer les modèles
curl http://localhost:60885/api/models

# Devrait retourner la liste des modèles Copilot disponibles

# Test 3: Status
curl http://localhost:60885/api/status

# Devrait retourner les informations du serveur
```

### 3. Vérifier la requête dans la console du navigateur

1. Ouvrir l'application web (via l'extension ou en dev: `cd www && npm run dev`)
2. Ouvrir les DevTools (F12 ou Cmd+Option+I)
3. Aller dans l'onglet "Console"
4. Envoyer un message dans le chat
5. Chercher les logs qui commencent par `[useChat]`, `[Chat API]`, `[Express Server]`

### 4. Analyser les logs

Les logs devraient montrer :

```
[useChat] Sending request with: { messagesCount: 1, modelId: 'copilot-gpt-4o', ... }
[Chat API] Received request: { messagesCount: 1, modelId: 'copilot-gpt-4o', ... }
[Chat API] Redirecting to Express server at http://localhost:60885
```

Si vous voyez une erreur 400, cela signifie que soit :
- Le `modelId` est vide ou `null`
- Les `messages` sont vides

### 5. Erreurs communes et solutions

#### Erreur 400: "No model ID provided"

**Cause possible :** Le modèle n'est pas sélectionné dans l'interface

**Solution :**
1. Vérifier que le menu déroulant de sélection du modèle affiche bien un modèle
2. Vérifier dans la console : `console.log('Selected model:', model)`
3. Attendre que les modèles soient chargés avant d'envoyer un message

#### Erreur 503: "Failed to communicate with VS Code extension server"

**Cause possible :** Le serveur Express n'est pas démarré ou n'est pas accessible

**Solution :**
1. Relancer l'extension VS Code (F5)
2. Vérifier les logs de sortie de l'extension
3. Vérifier que le port 60885 n'est pas utilisé par une autre application :
   ```bash
   lsof -i :60885
   ```

#### Erreur: "Model not found"

**Cause possible :** Le modèle sélectionné n'existe pas ou n'est pas disponible

**Solution :**
1. Vérifier que vous êtes connecté à GitHub Copilot dans VS Code
2. Vérifier votre licence Copilot
3. Rafraîchir la liste des modèles

#### Le streaming ne fonctionne pas

**Cause possible :** Les en-têtes SSE ne sont pas correctement configurés

**Solution :**
1. Vérifier dans l'onglet "Network" des DevTools que la requête `/api/chat` a le bon Content-Type : `text/event-stream`
2. Vérifier que la réponse arrive bien en streaming (pas tout d'un coup)

### 6. Mode Debug Avancé

Pour activer les logs très détaillés, ajoutez dans le fichier `page.tsx` :

```typescript
useEffect(() => {
  console.log('Current state:', { 
    model, 
    modelsCount: models.length,
    wsStatus,
    status 
  });
}, [model, models, wsStatus, status]);
```

### 7. Vérifier la structure des données envoyées

Ajoutez temporairement dans `use-chat.ts` avant l'appel fetch :

```typescript
const requestBody = {
  messages: apiMessages,
  modelId,
  stream: true,
};
console.log('Request body:', JSON.stringify(requestBody, null, 2));
```

## Checklist de Vérification

- [ ] L'extension VS Code est démarrée (F5)
- [ ] Le serveur Express est actif sur le port 60885
- [ ] Le badge de connexion est vert (Connected)
- [ ] Un modèle est sélectionné dans le menu déroulant
- [ ] Les modèles sont bien chargés (pas de message d'erreur)
- [ ] La console du navigateur ne montre pas d'erreurs
- [ ] Le badge "Dev Mode" n'est PAS affiché (sinon les vraies API ne sont pas utilisées)

## Commandes Utiles

```bash
# Voir les processus sur le port 60885
lsof -i :60885

# Tuer le processus si nécessaire
kill -9 <PID>

# Rebuilder l'extension
cd /Users/moneyprinter/Documents/fantastic-winner
npm run compile

# Redémarrer le serveur de dev Next.js
cd www
npm run dev

# Voir les logs en temps réel
tail -f ~/.vscode/extensions/logs/...
```

## Contact

Si le problème persiste après avoir suivi ces étapes, partagez :
1. Les logs de la console du navigateur
2. Les logs de sortie de l'extension VS Code
3. Le résultat de `curl http://localhost:60885/api/health`
4. Les captures d'écran des badges de status
