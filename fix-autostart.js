// Script de correction pour l'auto-start des parties
const fs = require('fs');
const path = require('path');

console.log("🔧 Correction du système d'auto-start...");

// Lire le fichier de configuration actuel
const configPath = path.join(__dirname, '.env');
let config = '';

if (fs.existsSync(configPath)) {
  config = fs.readFileSync(configPath, 'utf8');
  console.log("✅ Fichier .env trouvé");
} else {
  console.log("⚠️ Fichier .env non trouvé, création d'un nouveau");
}

// Vérifier et corriger l'auto-start
if (!config.includes('AUTO_START_GAME=')) {
  config += '\n# Auto-start automatique des parties\nAUTO_START_GAME=true\n';
  console.log("✅ AUTO_START_GAME ajouté");
} else {
  config = config.replace(/AUTO_START_GAME=false/g, 'AUTO_START_GAME=true');
  console.log("✅ AUTO_START_GAME mis à jour");
}

// Sauvegarder les modifications
fs.writeFileSync(configPath, config);
console.log("✅ Configuration sauvegardée");

console.log("🎮 Le système d'auto-start est maintenant configuré !");
console.log("🚀 Redémarrez le serveur pour appliquer les changements");

// Optionnel : redémarrer automatiquement le serveur
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Voulez-vous redémarrer le serveur maintenant ? (y/N): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    console.log("🔄 Redémarrage du serveur...");
    const { spawn } = require('child_process');
    
    // Arrêter le processus actuel s'il existe
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/F', '/IM', 'node.exe'], { stdio: 'inherit' });
      } else {
        spawn('pkill', ['-f', 'server-multiplayer.js'], { stdio: 'inherit' });
      }
    } catch (error) {
      console.log("⚠️ Impossible d'arrêter l'ancien serveur");
    }
    
    // Démarrer le nouveau serveur
    setTimeout(() => {
      spawn('node', ['server-multiplayer.js'], { 
        stdio: 'inherit',
        detached: true
      });
      process.exit(0);
    }, 2000);
  } else {
    console.log("ℹ️ Redémarrez manuellement le serveur quand vous le souhaitez");
    process.exit(0);
  }
  
  rl.close();
});
