# Configuration Auto-Open pour CashPong Multiplayer

## Vue d'ensemble

Ce système permet de configurer l'ouverture automatique du navigateur lors du démarrage du serveur multiplayer. Vous avez plusieurs options pour personnaliser ce comportement.

## 🎯 Options Disponibles

### 1. **production** (Recommandé)
- **Page cible** : `cashpong-multiplayer.html`
- **Usage** : Page de jeu principale optimisée
- **Quand utiliser** : Pour le jeu normal et la production

### 2. **multiplayer**
- **Page cible** : `cashpong-multiplayer.html`
- **Usage** : Page de jeu multijoueur
- **Quand utiliser** : Développement spécifique multiplayer

### 3. **index**
- **Page cible** : `index.html`
- **Usage** : Page d'accueil principale
- **Quand utiliser** : Tests généraux

### 4. **disabled**
- **Page cible** : Aucune
- **Usage** : Pas d'ouverture automatique
- **Quand utiliser** : Serveurs de production, tests automatisés

## 🛠️ Méthodes de Configuration

### Méthode 1 : Script de Configuration
```bash
node configure-autoopen.js production
node configure-autoopen.js multiplayer
node configure-autoopen.js index
node configure-autoopen.js disabled
```

### Méthode 2 : Modification Directe du .env
Éditez le fichier `.env` :
```env
AUTO_OPEN=production
```

### Méthode 3 : Interface Interactive
```bash
start-multiplayer-advanced.bat
```

## 📋 Comparaison des Options

| Option | Page Cible | Auto-Open | Recommandé Pour |
|--------|------------|-----------|-----------------|
| `production` | cashpong-multiplayer.html | ✅ | Usage normal |
| `multiplayer` | cashpong-multiplayer.html | ✅ | Développement |
| `index` | index.html | ✅ | Tests |
| `disabled` | Aucune | ❌ | Production serveur |

## 🚀 Démarrage Rapide

1. **Pour commencer rapidement** :
   ```bash
   node configure-autoopen.js production
   node server-multiplayer.js
   ```

2. **Pour désactiver l'auto-open** :
   ```bash
   node configure-autoopen.js disabled
   node server-multiplayer.js
   ```

## 📝 Notes Importantes

- La configuration est persistante via le fichier `.env`
- Les changements prennent effet au prochain redémarrage du serveur
- L'option `production` est recommandée pour l'usage normal
- L'option `disabled` est recommandée pour les serveurs de production

## 🔧 Dépannage

Si l'ouverture automatique ne fonctionne pas :
1. Vérifiez que le fichier `.env` existe
2. Vérifiez la valeur de `AUTO_OPEN` dans `.env`
3. Redémarrez le serveur après modification
4. Sur certains systèmes, l'ouverture automatique peut être bloquée par la sécurité
