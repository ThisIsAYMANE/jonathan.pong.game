# 🚀 Guide de Démarrage Rapide - CashPong Multiplayer

## Bienvenue dans CashPong ! 

Ce guide vous aidera à démarrer rapidement avec le jeu de Pong multijoueur intégré à la blockchain.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ **Node.js v16+** installé ([Télécharger](https://nodejs.org/))
- ✅ **MetaMask** installé dans votre navigateur
- ✅ **Wallet Ethereum** avec quelques ETH pour les frais de gas
- ✅ **Git** pour cloner le projet (optionnel)

## 🎯 Démarrage Ultra-Rapide (30 secondes)

### Option 1 : Lanceur Automatique (Recommandé)
```bash
# Double-cliquez sur ce fichier :
start-multiplayer.bat
```

### Option 2 : Ligne de Commande
```bash
npm install
npm start
```

### Option 3 : Configuration Avancée
```bash
# Interface interactive complète
start-multiplayer-advanced.bat
```

## 🔧 Configuration Personnalisée

### 1. Configurateur Automatique
```bash
node configure-autoopen.js production    # Page principale
node configure-autoopen.js multiplayer   # Page multijoueur  
node configure-autoopen.js disabled      # Sans auto-ouverture
```

### 2. Configuration Manuelle
Éditez le fichier `.env` :
```env
PRIVATE_KEY=votre_cle_privee_sans_0x
AUTO_OPEN=production
PORT=3000
```

## 🎮 Première Partie

1. **Lancez le serveur** avec une des méthodes ci-dessus
2. **Le navigateur s'ouvre automatiquement** sur `http://localhost:3000`
3. **Connectez MetaMask** en cliquant sur "Connect Wallet"
4. **Signez le message** d'authentification
5. **Créez ou rejoignez une room** via la blockchain
6. **Jouez !** Utilisez les flèches ↑/↓ pour contrôler votre paddle

## 🔗 Pages Disponibles

| URL | Description | Utilisation |
|-----|-------------|-------------|
| `/cashpong-multiplayer.html` | **Page principale** | Jeu multijoueur complet |
| `/index.html` | Page d'accueil | Sélection mode de jeu |
| `/index-production.html` | Page production | Interface optimisée |

## ⚡ Fonctionnalités Principales

### 🎯 Gameplay
- **Multijoueur temps réel** via Socket.IO
- **Synchronisation instantanée** des mouvements
- **Chat intégré** pour communiquer
- **Anti-cheat** avec validation serveur

### 🔗 Blockchain
- **Smart contracts** pour les paris
- **Paiements automatiques** des gains
- **Authentification** par signature wallet
- **Support multi-réseaux** (Ethereum, Polygon, testnets)

### 🛡️ Sécurité
- **Validation côté serveur** de toutes les actions
- **Authentification cryptographique** obligatoire
- **Protection anti-cheat** intégrée

## 🔧 Commandes Utiles

### Serveur
```bash
node server-multiplayer.js          # Démarrage normal
npm start                           # Via package.json
start-multiplayer.bat               # Lanceur Windows
```

### Configuration
```bash
node configure-autoopen.js --help   # Aide configuration
node setup.js                      # Setup interactif complet
```

### Développement
```bash
npm run dev                         # Mode développement
npx hardhat compile                 # Compiler les contrats
npx hardhat test                    # Tests des contrats
```

## 🐛 Résolution de Problèmes

### Port 3000 déjà utilisé
```bash
# Windows
taskkill /F /IM node.exe

# macOS/Linux  
sudo lsof -ti:3000 | xargs kill
```

### MetaMask ne se connecte pas
1. Vérifiez que MetaMask est déverrouillé
2. Changez de réseau puis revenez
3. Videz le cache du navigateur
4. Rechargez la page

### Événements blockchain non détectés
1. Vérifiez votre connexion internet
2. Testez d'abord sur un testnet
3. Vérifiez les logs du serveur
4. Redémarrez le serveur

### Problèmes de performance
1. Fermez les autres onglets du navigateur
2. Vérifiez votre connexion internet
3. Utilisez un réseau local si possible
4. Réduisez la qualité graphique

## 📱 Contrôles de Jeu

| Touches | Action |
|---------|--------|
| **↑ / ↓** | Déplacer la paddle |
| **W / S** | Contrôles alternatifs |
| **Espace** | Ready/Pause |
| **Enter** | Envoyer message chat |
| **Échap** | Menu/Quitter |

## 🌐 Réseaux Supportés

- ✅ **Ethereum Mainnet** (production)
- ✅ **Polygon Mainnet** (production, frais réduits)  
- ✅ **Goerli Testnet** (tests)
- ✅ **Mumbai Testnet** (tests Polygon)
- ✅ **Localhost** (développement)

## 🎯 Prochaines Étapes

Une fois que tout fonctionne :

1. **Invitez des amis** à jouer avec vous
2. **Testez sur testnet** avant le mainnet
3. **Configurez vos réseaux** préférés
4. **Explorez les paramètres** avancés
5. **Rejoignez la communauté** pour des tournois

## 💡 Conseils Pro

- 🔥 **Utilisez Polygon** pour des frais réduits
- ⚡ **Gardez MetaMask déverrouillé** pendant le jeu
- 🎮 **Testez d'abord en solo** pour vous familiariser
- 💰 **Commencez avec de petits paris** 
- 🛡️ **Ne partagez jamais votre clé privée**

## 📞 Support

- 📚 **Documentation complète** : [README.md](README.md)
- 🐛 **Signaler un bug** : Créez une issue GitHub
- 💬 **Communauté** : Discord/Telegram (liens à venir)
- 📧 **Contact** : support@cashpong.game

---

**🎮 Prêt à jouer ? Que le meilleur gagne ! 🏆**

*Dernière mise à jour : Août 2025*
