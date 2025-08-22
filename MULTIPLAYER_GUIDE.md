# Guide Multijoueur - CashPong

## 🎮 Fonctionnalités Multijoueur

### Connexion et Authentification
- Connexion automatique via MetaMask
- Authentification par signature de wallet
- Gestion des pseudonymes personnalisés
- Reconnexion automatique en cas de déconnexion

### Système de Rooms
- Création automatique de rooms via blockchain
- Détection des événements smart contract
- Auto-join pour le créateur de la room
- Notification automatique du second joueur
- Support jusqu'à 2 joueurs par room

### Gameplay Temps Réel
- Synchronisation instantanée des mouvements
- Physics engine côté serveur
- Anti-cheat intégré
- Gestion de la latence réseau
- Système de countdown avant démarrage

### Intégration Blockchain
- Smart contracts sur Ethereum/Polygon
- Paris automatiques en ETH
- Événements en temps réel
- Paiements automatiques des gains
- Historique des transactions

## 🚀 Comment Jouer

### 1. Préparation
```bash
# Démarrer le serveur
node server-multiplayer.js

# Ou utiliser le lanceur
start-multiplayer.bat
```

### 2. Connexion
1. Ouvrir `http://localhost:3000/cashpong-multiplayer.html`
2. Connecter MetaMask
3. Signer le message d'authentification
4. Choisir un pseudonyme (optionnel)

### 3. Création de Room
1. Aller sur la blockchain (MetaMask, etc.)
2. Créer une room avec un pari
3. Le serveur détecte automatiquement l'événement
4. Auto-join dans la room créée

### 4. Rejoindre une Room
1. Recevoir une notification de room disponible
2. Cliquer sur "Rejoindre"
3. Attendre le countdown
4. Jouer!

### 5. Contrôles
- **Flèches Haut/Bas** : Déplacer la paddle
- **W/S** : Contrôles alternatifs
- **Espace** : Ready/Pause
- **Enter** : Envoyer message chat

## 🔧 Configuration Technique

### Variables d'Environnement
```env
PRIVATE_KEY=votre_cle_privee
AUTO_OPEN=production
PORT=3000
NETWORK=localhost
```

### Architecture
```
Client (Browser) ←→ Socket.IO ←→ Server ←→ Blockchain
                                   ↓
                              Game Engine
                                   ↓
                             Room Management
```

### Événements Socket.IO
- `userRegister` : Enregistrement utilisateur
- `joinRoom` : Rejoindre une room
- `gameReady` : Joueur prêt
- `paddleMove` : Mouvement de paddle
- `ballUpdate` : Mise à jour balle
- `gameEnd` : Fin de partie
- `chatMessage` : Message chat

## 📊 Monitoring et Debug

### Logs Serveur
- Connexions/déconnexions en temps réel
- Événements blockchain détectés
- État des rooms et joueurs
- Erreurs et warnings

### Métriques
- Nombre de joueurs connectés
- Rooms actives
- Latence moyenne
- Événements blockchain traités

### Debug
```javascript
// Activer les logs détaillés
DEBUG=socket.io:* node server-multiplayer.js

// Logs blockchain
console.log("Event detected:", eventData);
```

## 🛡️ Sécurité

### Anti-Cheat
- Validation côté serveur
- Limites de vitesse de paddle
- Vérification des positions
- Détection d'inputs anormaux

### Authentification
- Signature cryptographique obligatoire
- Vérification d'adresse wallet
- Session management sécurisé
- Protection contre les replay attacks

### Smart Contract
- Code audité et testé
- Gestion automatique des fonds
- Protection contre les reentrancy
- Timeouts et emergency stops

## 🐛 Dépannage

### Problèmes Courants

**Connexion Socket.IO échoue**
```bash
# Vérifier que le serveur est démarré
netstat -an | grep :3000

# Redémarrer le serveur
taskkill /F /IM node.exe
node server-multiplayer.js
```

**MetaMask ne se connecte pas**
- Vérifier que MetaMask est déverrouillé
- Changer de réseau puis revenir
- Vider le cache du navigateur
- Recharger la page

**Événements blockchain non détectés**
- Vérifier la connexion RPC
- Contrôler l'adresse du contrat
- Vérifier les logs du serveur
- Tester sur testnet d'abord

**Latence élevée**
- Vérifier la connexion internet
- Utiliser un réseau local
- Optimiser les paramètres de jeu
- Réduire la fréquence d'update

### Support
- Logs détaillés dans la console serveur
- Debugging via DevTools navigateur
- Tests sur réseaux testnet recommandés
- Documentation API complète disponible
