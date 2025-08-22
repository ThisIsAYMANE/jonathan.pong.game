@echo off
cls
echo ======================================
echo    CashPong Multiplayer Auto-Start
echo ======================================
echo.
echo 🚀 Démarrage automatique du serveur...
echo.

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js n'est pas installé ou non trouvé dans le PATH
    echo 💡 Téléchargez Node.js depuis: https://nodejs.org/
    pause
    exit /b 1
)

REM Afficher la version de Node.js
echo ✅ Node.js détecté:
node --version

REM Vérifier si le fichier serveur existe
if not exist "server-multiplayer.js" (
    echo ❌ Fichier server-multiplayer.js non trouvé
    echo 💡 Assurez-vous d'être dans le bon répertoire
    pause
    exit /b 1
)

REM Vérifier si les dépendances sont installées
if not exist "node_modules" (
    echo ⚠️ Dépendances non installées
    echo 📦 Installation en cours...
    npm install
    if errorlevel 1 (
        echo ❌ Erreur lors de l'installation des dépendances
        pause
        exit /b 1
    )
    echo ✅ Dépendances installées avec succès
)

REM Vérifier le fichier .env
if not exist ".env" (
    echo ⚠️ Fichier .env non trouvé
    echo 🔧 Création d'un fichier .env basique...
    echo PRIVATE_KEY=your_private_key_here > .env
    echo AUTO_OPEN=production >> .env
    echo PORT=3000 >> .env
    echo.
    echo ⚠️ IMPORTANT: Configurez votre clé privée dans le fichier .env
    echo 📝 Éditez le fichier .env et remplacez 'your_private_key_here'
    pause
)

echo.
echo 🎮 Lancement du serveur CashPong Multiplayer...
echo 🌐 Le navigateur s'ouvrira automatiquement
echo 🛑 Appuyez sur Ctrl+C pour arrêter le serveur
echo.

REM Démarrer le serveur
node server-multiplayer.js

REM Si le serveur s'arrête
echo.
echo 🛑 Serveur arrêté
pause
