@echo off
cls
color 0A
title CashPong Multiplayer - Configuration Avancée

echo ╔════════════════════════════════════════════════════════════════╗
echo ║              CashPong Multiplayer - Setup Avancé              ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 🎮 Configuration et lancement du serveur multiplayer
echo.

:MENU
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                    Options de Configuration                   ║
echo ╠═══════════════════════════════════════════════════════════════╣
echo ║  1. 🏠 Production Page (cashpong-multiplayer.html)            ║
echo ║  2. 🎮 Multiplayer Page (même chose que 1)                   ║
echo ║  3. 📱 Index Page (page d'accueil)                           ║
echo ║  4. 🚫 Disabled (pas d'ouverture automatique)                ║
echo ║  5. ⚙️  Configuration manuelle (.env)                        ║
echo ║  6. 🚀 Démarrage rapide (configuration actuelle)             ║
echo ║  7. ❌ Quitter                                                 ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

set /p choice="Choisissez une option (1-7): "

if "%choice%"=="1" goto PRODUCTION
if "%choice%"=="2" goto MULTIPLAYER
if "%choice%"=="3" goto INDEX
if "%choice%"=="4" goto DISABLED
if "%choice%"=="5" goto MANUAL_CONFIG
if "%choice%"=="6" goto QUICK_START
if "%choice%"=="7" goto EXIT

echo ❌ Choix invalide. Veuillez choisir entre 1 et 7.
echo.
pause
goto MENU

:PRODUCTION
echo.
echo 🏠 Configuration: Production Page
set AUTO_OPEN=production
goto CONFIGURE_AND_START

:MULTIPLAYER
echo.
echo 🎮 Configuration: Multiplayer Page
set AUTO_OPEN=multiplayer
goto CONFIGURE_AND_START

:INDEX
echo.
echo 📱 Configuration: Index Page
set AUTO_OPEN=index
goto CONFIGURE_AND_START

:DISABLED
echo.
echo 🚫 Configuration: Ouverture automatique désactivée
set AUTO_OPEN=disabled
goto CONFIGURE_AND_START

:MANUAL_CONFIG
echo.
echo ⚙️ Configuration manuelle du fichier .env
echo.
echo 📝 Options disponibles pour AUTO_OPEN:
echo    - production: Page principale du jeu
echo    - multiplayer: Page multijoueur
echo    - index: Page d'accueil
echo    - disabled: Pas d'ouverture automatique
echo.
if exist ".env" (
    echo 📄 Contenu actuel du fichier .env:
    echo ═══════════════════════════════════════
    type .env
    echo ═══════════════════════════════════════
    echo.
)
echo 💡 Éditez le fichier .env manuellement puis relancez ce script
pause
goto MENU

:CONFIGURE_AND_START
echo ✅ Configuration sélectionnée: %AUTO_OPEN%
echo.

REM Créer ou mettre à jour le fichier .env
if exist ".env" (
    echo 📝 Mise à jour du fichier .env existant...
    
    REM Backup du fichier existant
    copy ".env" ".env.backup" >nul 2>&1
    
    REM Lire le fichier existant et mettre à jour AUTO_OPEN
    powershell -Command "(Get-Content '.env') -replace '^AUTO_OPEN=.*', 'AUTO_OPEN=%AUTO_OPEN%' | Set-Content '.env.temp'; Move-Item '.env.temp' '.env'"
) else (
    echo 📝 Création d'un nouveau fichier .env...
    (
        echo # Configuration CashPong Multiplayer
        echo PRIVATE_KEY=your_private_key_here
        echo AUTO_OPEN=%AUTO_OPEN%
        echo PORT=3000
        echo NETWORK=localhost
    ) > .env
)

echo ✅ Fichier .env configuré avec AUTO_OPEN=%AUTO_OPEN%
goto START_SERVER

:QUICK_START
echo.
echo 🚀 Démarrage rapide avec la configuration actuelle
echo.
if exist ".env" (
    echo 📄 Configuration actuelle:
    echo ═══════════════════════════════════════
    findstr "AUTO_OPEN" .env 2>nul || echo AUTO_OPEN=non défini
    echo ═══════════════════════════════════════
) else (
    echo ⚠️ Aucun fichier .env trouvé, utilisation des valeurs par défaut
    set AUTO_OPEN=production
    goto CONFIGURE_AND_START
)
goto START_SERVER

:START_SERVER
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                    Démarrage du Serveur                       ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Vérifications préliminaires
echo 🔍 Vérifications préliminaires...

REM Vérifier Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js non trouvé
    echo 💡 Installez Node.js depuis: https://nodejs.org/
    pause
    goto MENU
)
echo ✅ Node.js: 
node --version

REM Vérifier le fichier serveur
if not exist "server-multiplayer.js" (
    echo ❌ Fichier server-multiplayer.js non trouvé
    pause
    goto MENU
)
echo ✅ Fichier serveur trouvé

REM Vérifier les dépendances
if not exist "node_modules" (
    echo 📦 Installation des dépendances...
    npm install
    if errorlevel 1 (
        echo ❌ Erreur lors de l'installation
        pause
        goto MENU
    )
)
echo ✅ Dépendances vérifiées

echo.
echo 🚀 Lancement du serveur CashPong Multiplayer...
echo 🌐 Configuration AUTO_OPEN: %AUTO_OPEN%
echo 🛑 Appuyez sur Ctrl+C pour arrêter
echo.

REM Démarrer le serveur avec les variables d'environnement
set PORT=3000
node server-multiplayer.js

echo.
echo 🛑 Serveur arrêté
echo.
set /p restart="Voulez-vous redémarrer le serveur ? (y/N): "
if /i "%restart%"=="y" goto START_SERVER
if /i "%restart%"=="yes" goto START_SERVER

goto MENU

:EXIT
echo.
echo 👋 Merci d'avoir utilisé CashPong Multiplayer!
echo 🎮 À bientôt pour de nouvelles parties!
timeout 2 >nul
exit /b 0
