// === VARIABLES GLOBALES DU JEU ===
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

const paddleHeight = 75;
const paddleWidth = 10;
let ballRadius = 10; // Changed to let for server updates

let leftPaddle = { x: 0, y: canvas.height / 2 - paddleHeight / 2, speedY: 0 };
let rightPaddle = { x: canvas.width - paddleWidth, y: canvas.height / 2 - paddleHeight / 2, speedY: 0 };

let x = canvas.width / 2;
let y = canvas.height / 2;
let dx = 0;
let dy = 0;

let leftScore = 0;
let rightScore = 0;
let countdown = 0;
let countdownText = ""; // For multiplayer countdown display
let countdownInterval = null;
let gameOver = false;
let awaitingRematch = false;
let matchStarted = false;

// === SERVER-SIDE GAME VARIABLES ===
let isServerGame = false; // Flag to indicate server-authoritative mode
let playerRole = null; // 'playerA' or 'playerB'
let isRoomCreator = false; // Track if current user is the room creator

// Player names for multiplayer score display
let multiplayerPlayerA = "";
let multiplayerPlayerB = "";

let socketContract;
let socketProvider;
const playersEthAddresses = {};

// === VARIABLES WEB3 ===
// Note: web3, connectedWallet, contract, cashPongContract, CONTRACT_ADDRESS are declared in event-handlers.js
let web3Socket;
let roomId = 1;
const winnerBalances = new Map();

// Use global CONTRACT_ADDRESS from event-handlers.js
function getContractAddress() {
  return window.CONTRACT_ADDRESS || "0xdb51573EeBE611CEA7e31F0FE2A92Cbb7929b896";
}

function getEthAddress(username) {
  return playersEthAddresses[username];
}

// === FONCTIONS D'AUTHENTIFICATION ===
async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    alert("Veuillez entrer votre email et mot de passe.");
    return;
  }

  try {
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    window.currentUsername = user.displayName;
    document.getElementById("peerIdDisplay").innerText = `Ton Peer ID : ${window.currentUsername}`;

    document.getElementById("createAccountSection").style.display = "none";
    document.getElementById("playButton").style.display = "block";

    connectToSocketServer(window.currentUsername);
  } catch (error) {
    alert("❌ Connexion échouée : " + error.message);
  }
}

async function logout() {
  try {
    if (isConnected) {
      const type = matchStarted ? "forfeit" : "leftMatch";

      socket.emit("event", {
        type: "leftMatch",
        from: currentUsername,
        to: opponentUsername
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      socket.off();
      socket.disconnect();

      isConnected = false;
      isHost = false;
      opponentUsername = null;
      matchStarted = false;
      gameOver = false;
      gameIsOver = false;
    }

    leftScore = 0;
    rightScore = 0;
    x = canvas.width / 2;
    y = canvas.height / 2;
    dx = 0;
    dy = 0;
    clearInterval(countdownInterval);
    countdown = 0;

    document.getElementById("gameOver").style.display = "none";
    document.getElementById("resetGameBtn").style.display = "none";
    document.getElementById("leaveMatchBtn").style.display = "none";
    document.getElementById("playButton").style.display = "block";
    document.getElementById("peerIdDisplay").innerText = "";
    document.getElementById("connectedWithDisplay").innerText = "";

    await firebase.auth().signOut();

    alert("🔒 Déconnecté avec succès.");
  } catch (error) {
    alert("❌ Erreur lors de la déconnexion : " + error.message);
  }
}

function showCreateAccountForm() {
  document.getElementById("authSection").style.display = "none";
  document.getElementById("createAccountSection").style.display = "flex";
}

function hideCreateAccountForm() {
  document.getElementById("createAccountSection").style.display = "none";
  document.getElementById("authSection").style.display = "flex";
}

async function createAccount() {
  const username = document.getElementById("newUsername").value.trim();
  const email = document.getElementById("newEmail").value.trim();
  const password = document.getElementById("newPassword").value;

  if (!username || !email || !password) {
    alert("🛑 Tous les champs sont obligatoires !");
    return;
  }

  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);

    await cred.user.updateProfile({
      displayName: username
    });

    alert("✅ Compte créé avec succès ! Connexion automatique...");

    window.currentUsername = username;
    connectToSocketServer(window.currentUsername);
    document.getElementById("peerIdDisplay").innerText = `Ton Peer ID : ${window.currentUsername}`;
    document.getElementById("playButton").style.display = "block";

  } catch (err) {
    alert("❌ Erreur lors de la création du compte : " + err.message);
  }
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById("password");
  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = type;
}

function toggleNewPasswordVisibility() {
  const passwordInput = document.getElementById("newPassword");
  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = type;
}

function resetPassword() {
  const email = document.getElementById("email").value.trim();

  if (!email) {
    alert("🔒 Entrez d'abord votre adresse e-mail.");
    return;
  }

  firebase.auth().sendPasswordResetEmail(email)
    .then(() => {
      alert("📧 Un lien de réinitialisation a été envoyé à votre adresse e-mail.");
    })
    .catch(error => {
      alert("❌ Erreur : " + error.message);
    });
}

// === FONCTIONS DE DESSIN ===
function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.closePath();
}

function drawPaddle(p) {
  ctx.beginPath();
  ctx.rect(p.x, p.y, paddleWidth, paddleHeight);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.closePath();
}

function drawScores() {
  ctx.font = "18px Arial";
  ctx.fillStyle = "white";

  if (isServerGame) {
    // Multiplayer server mode - show player addresses with scores
    ctx.textAlign = "left";
    ctx.fillText(`${multiplayerPlayerA}: ${leftScore}`, 20, 30);

    ctx.textAlign = "right";
    ctx.fillText(`${multiplayerPlayerB}: ${rightScore}`, canvas.width - 20, 30);
  } else if (isConnected) {
    // Legacy multiplayer mode
    const leftName = isHost ? opponentUsername : currentUsername;
    const rightName = isHost ? currentUsername : opponentUsername;

    ctx.textAlign = "left";
    ctx.fillText(`${leftName} : ${leftScore}`, 20, 30);

    ctx.textAlign = "right";
    ctx.fillText(`${rightName} : ${rightScore}`, canvas.width - 20, 30);
  } else {
    // Solo mode
    ctx.textAlign = "left";
    ctx.fillText("Score: " + leftScore, 20, 30);

    ctx.textAlign = "right";
    ctx.fillText("Score: " + rightScore, canvas.width - 20, 30);
  }
}

function drawCountdown() {
  // For solo mode
  if (countdown > 0) {
    ctx.font = "40px Arial";
    ctx.fillStyle = "yellow";
    ctx.textAlign = "center";
    ctx.fillText(countdown, canvas.width / 2, canvas.height / 2);
  }
  
  // For multiplayer mode
  if (countdownText && countdownText !== "") {
    ctx.font = "40px Arial";
    ctx.fillStyle = "yellow";
    ctx.textAlign = "center";
    ctx.fillText(countdownText, canvas.width / 2, canvas.height / 2);
  }
}

// === UTILITY FUNCTIONS ===
function updatePlayButtonForRole() {
  const currentRoomId = localStorage.getItem("currentRoomId");
  const playButton = document.getElementById("playButton");
  
  if (currentRoomId) {
    // In multiplayer mode
    if (isRoomCreator) {
      playButton.textContent = "🚀 LANCER LA PARTIE";
      playButton.style.backgroundColor = "#4CAF50";
      playButton.title = "Cliquez pour démarrer la partie";
    } else {
      playButton.textContent = "⏳ EN ATTENTE DU CRÉATEUR";
      playButton.style.backgroundColor = "#888";
      playButton.title = "Seul le créateur de la room peut lancer la partie";
    }
  } else {
    // Solo mode
    playButton.textContent = "JOUER";
    playButton.style.backgroundColor = "#4CAF50";
    playButton.title = "Cliquez pour jouer en solo";
  }
}

// === MOTEUR DE JEU ===
function moveBall() {
  if (countdown > 0 || gameOver) return;

  if (isConnected && !isHost) return;

  x += dx;
  y += dy;

  if (y - ballRadius < 0 || y + ballRadius > canvas.height) {
    dy = -dy;
  }

  if (
    x - ballRadius < leftPaddle.x + paddleWidth &&
    y > leftPaddle.y &&
    y < leftPaddle.y + paddleHeight
  ) {
    dx = Math.abs(dx);
  }

  if (
    x + ballRadius > rightPaddle.x &&
    y > rightPaddle.y &&
    y < rightPaddle.y + paddleHeight
  ) {
    dx = -Math.abs(dx);
  }

  if (x - ballRadius < 0) {
    rightScore++;
    checkGameOver();
    if (!gameOver) startCountdown();
  }

  if (x + ballRadius > canvas.width) {
    leftScore++;
    checkGameOver();
    if (!gameOver) startCountdown();
  }
}

async function checkGameOver() {
  if (leftScore >= 10 || rightScore >= 10) {
    gameOver = true;
    dx = 0;
    dy = 0;

    const leftPlayer = isHost ? opponentUsername : currentUsername;
    const rightPlayer = isHost ? currentUsername : opponentUsername;
    const winnerName = leftScore >= 10 ? leftPlayer : rightPlayer;

    displayWinner(winnerName);

    if (isConnected && isHost) {
      socket.emit("event", {
        type: "gameOver",
        from: currentUsername,
        to: opponentUsername,
        winner: winnerName,
      });
    }

    if (isHost || !isConnected) {
      document.getElementById("resetGameBtn").style.display = "inline-block";
    }

    if (isConnected) {
      document.getElementById("leaveMatchBtn").style.display = "inline-block";
    }

    document.getElementById("playButton").style.display = "none";

    const winnerAddress = getEthAddress(winnerName);

    console.log("👀 Vérification paiement :");
    console.log("🏆 Gagnant :", winnerName);
    console.log("📬 Adresse gagnant attendue :", winnerAddress);
    console.log("👛 Wallet connecté :", connectedWallet);

    const paymentSection = document.getElementById("paymentSection");
    const paymentMessage = document.getElementById("paymentMessage");
    const validateBtn = document.getElementById("validatePaymentBtn");

    if (
      winnerAddress &&
      connectedWallet.toLowerCase() === winnerAddress.toLowerCase()
    ) {
      paymentMessage.textContent =
        "🏆 Félicitations ! Le paiement a été effectué automatiquement par le smart contract.";
      paymentSection.style.display = "block";
      validateBtn.style.display = "none";
    } else {
      paymentSection.style.display = "none";
    }
  }
}

function displayWinner(winner, forfeit = false) {
  const gameOverDiv = document.getElementById("gameOver");
  const isMe = winner === currentUsername;

  if (forfeit) {
    gameOverDiv.innerText = isMe
      ? "🏆 Tu as gagné par forfait ! L'adversaire a quitté le match."
      : `🏆 ${winner} a gagné par forfait.`;
  } else {
    gameOverDiv.innerText = isMe
      ? "🎉 Tu as gagné la partie ! 🏆"
      : `🏆 ${winner} a gagné la partie !`;
  }

  gameOverDiv.style.display = "block";
}

function checkVictory() {
  if (leftScore >= 10 || rightScore >= 10) {
    gameOver = true;
    dx = 0;
    dy = 0;

    const winner = leftScore >= 10 ? "👈 Joueur Gauche" : "👉 Joueur Droit";
    document.getElementById("gameOver").innerText = `🏆 ${winner} gagne la partie !`;
    document.getElementById("gameOver").style.display = "block";
  } else {
    startCountdown();
  }
}

function checkWin() {
  if (leftScore >= 10 || rightScore >= 10) {
    let winner = leftScore >= 10 ? "Gauche" : "Droite";
    document.getElementById("gameOver").innerText = `🏆 ${winner} gagne la partie !`;
    document.getElementById("gameOver").style.display = "block";

    gameIsOver = true;
    dx = 0;
    dy = 0;

    document.getElementById("resetGameBtn").style.display = "inline-block";
    document.getElementById("leaveMatchBtn").style.display = "inline-block";
  }
}

function restartBall() {
  x = canvas.width / 2;
  y = canvas.height / 2;

  const dirX = Math.random() > 0.5 ? 1 : -1;
  const dirY = Math.random() > 0.5 ? 1 : -1;

  dx = 7 * dirX;
  dy = 7 * dirY;
}

function movePaddles() {
  if (gameIsOver) return;
  leftPaddle.y += leftPaddle.speedY;
  rightPaddle.y += rightPaddle.speedY;

  leftPaddle.y = Math.max(0, Math.min(canvas.height - paddleHeight, leftPaddle.y));
  rightPaddle.y = Math.max(0, Math.min(canvas.height - paddleHeight, rightPaddle.y));
}

function resetBall() {
  x = canvas.width / 2;
  y = canvas.height / 2;
  dx = 0;
  dy = 0;

  countdown = 3;
  clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      dx = 7;
      dy = 7;
    }
  }, 1000);
}

function resetGame(startRequest = true) {
  if (startRequest && isConnected && isHost) {
    socket.emit("event", {
      type: "newGameRequest",
      from: currentUsername,
      to: opponentUsername
    });

    alert("📨 Demande de nouvelle partie envoyée à " + opponentUsername);
    return;
  }

  leftScore = 0;
  rightScore = 0;
  gameOver = false;
  matchStarted = false;
  gameIsOver = false;

  countdown = 0;
  clearInterval(countdownInterval);

  x = canvas.width / 2;
  y = canvas.height / 2;
  dx = 0;
  dy = 0;

  document.getElementById("gameOver").style.display = "none";
  document.getElementById("resetGameBtn").style.display = "none";
  document.getElementById("leaveMatchBtn").style.display = "none";

  if (!isConnected || isHost) {
    document.getElementById("playButton").style.display = "block";
  }
}

function startCountdown() {
  countdown = 3;
  clearInterval(countdownInterval);

  x = canvas.width / 2;
  y = canvas.height / 2;
  dx = 0;
  dy = 0;

  countdownInterval = setInterval(() => {
    countdown--;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      countdown = 0;

      if (!gameOver) {
        dx = 7;
        dy = 7;
      }
    }
  }, 1000);
}

function handlePlayClick() {
  document.getElementById("playButton").style.display = "none";

  // CHECK FOR MULTIPLAYER SETUP
  const currentRoomId = localStorage.getItem("currentRoomId");
  const playerRole = localStorage.getItem("role");
  
  if (currentRoomId && playerRole) {
    // THIS IS A MULTIPLAYER GAME - CHECK IF USER IS ROOM CREATOR
    
    if (!isRoomCreator) {
      alert("❌ Seul le créateur de la room peut lancer la partie.");
      document.getElementById("playButton").style.display = "block"; // Show button again
      return;
    }
    
    console.log(`🎮 Starting server-authoritative game - Room: ${currentRoomId}, Role: ${playerRole}`);
    
    // Request server to start the game
    socket.emit("startServerGame", {
      roomId: currentRoomId
    });
    
    console.log(`🚀 [CLIENT] Requested server game start for room ${currentRoomId}`);
    return;
  } else {
    // SOLO GAME (Legacy mode)
    console.log("🎮 Starting solo game");
    isConnected = false;
    isHost = false;
    isServerGame = false;
    opponentUsername = null;
  }

  x = canvas.width / 2;
  y = canvas.height / 2;
  dx = 0;
  dy = 0;

  matchStarted = true;

  countdown = 5;
  clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    countdown--;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      countdown = 0;

      if (!gameOver && matchStarted) {
        const dirX = Math.random() > 0.5 ? 1 : -1;
        const dirY = Math.random() > 0.5 ? 1 : -1;
        dx = 7 * dirX;
        dy = 7 * dirY;
      }
    }
  }, 1000);
}

function keyDownHandler(e) {
  // SERVER-AUTHORITATIVE MODE
  if (isServerGame && isConnected) {
    const currentRoomId = localStorage.getItem("currentRoomId");
    if (!currentRoomId) return;
    
    let direction = 0;
    
    // PlayerA (left paddle) - W/S keys
    if (playerRole === 'playerA') {
      if (e.key === "w" || e.key === "W") direction = -5; // Up
      else if (e.key === "s" || e.key === "S") direction = 5; // Down
    }
    
    // PlayerB (right paddle) - Arrow keys
    if (playerRole === 'playerB') {
      if (e.key === "ArrowUp") direction = -5; // Up
      else if (e.key === "ArrowDown") direction = 5; // Down
    }
    
    if (direction !== 0) {
      socket.emit("paddleInput", {
        roomId: currentRoomId,
        direction: direction
      });
    }
    
    return;
  }
  
  // LEGACY P2P MODE (fallback)
  if (isConnected) {
    if (!isHost) {
      if (e.key === "s") leftPaddle.speedY = -5;
      else if (e.key === "w") leftPaddle.speedY = 5;
    }

    if (isHost) {
      if (e.key === "ArrowUp") rightPaddle.speedY = -5;
      else if (e.key === "ArrowDown") rightPaddle.speedY = 5;
    }
  } else {
    if (e.key === "s") leftPaddle.speedY = -5;
    else if (e.key === "w") leftPaddle.speedY = 5;

    if (e.key === "ArrowUp") rightPaddle.speedY = -5;
    else if (e.key === "ArrowDown") rightPaddle.speedY = 5;
  }
}

function keyUpHandler(e) {
  // SERVER-AUTHORITATIVE MODE
  if (isServerGame && isConnected) {
    const currentRoomId = localStorage.getItem("currentRoomId");
    if (!currentRoomId) return;
    
    let shouldStop = false;
    
    // PlayerA (left paddle) - W/S keys
    if (playerRole === 'playerA') {
      if (e.key === "w" || e.key === "W" || e.key === "s" || e.key === "S") {
        shouldStop = true;
      }
    }
    
    // PlayerB (right paddle) - Arrow keys
    if (playerRole === 'playerB') {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        shouldStop = true;
      }
    }
    
    if (shouldStop) {
      socket.emit("paddleInput", {
        roomId: currentRoomId,
        direction: 0 // Stop paddle
      });
    }
    
    return;
  }
  
  // LEGACY P2P MODE (fallback)
  if (isConnected) {
    if (!isHost && ["s", "w"].includes(e.key)) leftPaddle.speedY = 0;
    if (isHost && ["ArrowUp", "ArrowDown"].includes(e.key)) rightPaddle.speedY = 0;
  } else {
    if (["s", "w"].includes(e.key)) leftPaddle.speedY = 0;
    if (["ArrowUp", "ArrowDown"].includes(e.key)) rightPaddle.speedY = 0;
  }
}

function leaveMatch() {
  if (isConnected) {
    socket.emit("event", {
      type: "leftMatch",
      from: currentUsername,
      to: opponentUsername
    });
  }

  isConnected = false;
  isHost = false;
  opponentUsername = null;
  gameOver = false;

  resetGame(false);

  document.getElementById("connectedWithDisplay").innerText = "";
  document.getElementById("peerIdDisplay").innerText = `Ton Peer ID : ${currentUsername}`;

  document.getElementById("leaveMatchBtn").style.display = "none";
  document.getElementById("resetGameBtn").style.display = "none";
  document.getElementById("playButton").style.display = "block";
}

function stopSoloGameBeforeChallenge() {
  clearInterval(countdownInterval);
  countdown = 0;
  dx = 0;
  dy = 0;
  x = canvas.width / 2;
  y = canvas.height / 2;

  leftScore = 0;
  rightScore = 0;

  gameOver = false;
  matchStarted = false;
  gameIsOver = false;

  document.getElementById("gameOver").style.display = "none";
  document.getElementById("resetGameBtn").style.display = "none";
  document.getElementById("leaveMatchBtn").style.display = "none";

  document.getElementById("playButton").style.display = "block";
}

function connectToPeer() {
  console.log("✅ Bouton 'Se connecter' cliqué");
  const target = document.getElementById("otherPeerId").value.trim();
  if (!target || !currentUsername) {
    console.log("❌ Cible ou nom d'utilisateur manquant");
    return;
  }

  if (socket && socket.connected) {
    socket.emit("challenge", target, currentUsername);
    console.log("🎯 Défi envoyé à :", target, "de la part de :", currentUsername);

    // Si target est une adresse ETH, la stocker pour la mise
    if (target.startsWith('0x') && target.length === 42) {
      window.opponentEthAddress = target;
      console.log("💰 Adresse ETH de l'adversaire stockée :", target);
    }

    // Ne pas définir opponentUsername ici - attendre la confirmation du serveur
    // opponentUsername = target;
    // isConnected = true;
    // isHost = true;
    updatePeerDisplay();
  } else {
    console.log("⏳ Socket non connecté, nouvelle tentative...");
    setTimeout(connectToPeer, 200);
  }
}

// Rendre les fonctions accessibles globalement
window.connectToPeer = connectToPeer;
window.claimVictoryManually = claimVictoryManually;

function updatePeerDisplay() {
  const text = isConnected && opponentUsername
    ? `🟢 Connecté avec : ${opponentUsername}`
    : `Ton Peer ID : ${currentUsername}`;
  document.getElementById("peerIdDisplay").innerText = text;
}

// === CONFIGURATION FIREBASE ===
// Note: firebaseConfig and auth are already initialized in event-handlers.js
// Using global firebase instance

// === VARIABLES SOCKET ===
// Note: These variables are declared in event-handlers.js as global variables:
// - socket, currentUsername, opponentUsername, isConnected, isHost, gameIsOver
// Using global variables to avoid duplicates

// === FONCTIONS SOCKET ===
let socketInitialized = false; // Flag to prevent multiple initializations
let chatListenerRegistered = false; // Flag to prevent multiple chat listeners

function connectToSocketServer(username) {
  console.log("🔍 [DEBUG] connectToSocketServer called with username:", username);
  console.log("🔍 [DEBUG] socketInitialized:", socketInitialized);
  console.log("🔍 [DEBUG] chatListenerRegistered:", chatListenerRegistered);
  console.log("🔍 [DEBUG] window.socket:", window.socket);
  console.log("🔍 [DEBUG] window.socket.connected:", window.socket?.connected);
  
  // Prevent multiple initializations
  if (socketInitialized && window.socket && window.socket.connected) {
    console.log("🔗 Socket already initialized and connected, skipping...");
    return;
  }

  // Use the global socket from event-handlers.js if available, otherwise create new one
  if (window.socket && window.socket.connected) {
    socket = window.socket;
    console.log("🔗 Using existing global socket connection");
  } else {
    socket = io("http://localhost:3000");
    window.socket = socket; // Make it globally available
    console.log("🔗 Created new socket connection");
  }

  // Remove existing event listeners to prevent duplicates
  socket.removeAllListeners("connect");
  socket.removeAllListeners("chatMessage");
  socket.removeAllListeners("serverGameStarted");
  socket.removeAllListeners("serverGameUpdate");
  socket.removeAllListeners("opponentQuit");
  socket.removeAllListeners("gameEnded");
  socket.removeAllListeners("roomCreated");
  socket.removeAllListeners("roomJoined");
  socket.removeAllListeners("opponentJoinedRoom");
  socket.removeAllListeners("roomInvitation");
  socket.removeAllListeners("sessionTaken");
  socket.removeAllListeners("disconnect");
  socket.removeAllListeners("error");

  // Mark as initialized
  socketInitialized = true;

  socket.on("connect", () => {
    console.log("🟢 Socket connecté : ", socket.id);

    window.currentUsername = username;
    window.opponentUsername = null;
    window.hasPlacedBet = false;

    // Always send MetaMask address if available
    let ethAddressToSend = connectedWallet || "";
    if (!ethAddressToSend && window.ethereum) {
      // Try to get again if not set
      window.ethereum.request({ method: "eth_accounts" }).then(accounts => {
        ethAddressToSend = accounts[0] || "";
        console.log(`[FRONTEND REGISTER] username: ${username}, ethAddress: ${ethAddressToSend}, role: ${window.playerRole || "player"}`);
        socket.emit("register", {
          username: username,
          ethAddress: ethAddressToSend,
          role: window.playerRole || "player"
        });
      });
      return;
    }

    console.log(`[FRONTEND REGISTER] username: ${username}, ethAddress: ${ethAddressToSend}, role: ${window.playerRole || "player"}`);
    socket.emit("register", {
      username: username,
      ethAddress: ethAddressToSend,
      role: window.playerRole || "player"
    });
  });

  // Gestion des invitations de room
  socket.on("roomInvitation", async ({ roomId, creatorUsername, creatorAddress, betAmount, message }) => {
    console.log("🎮 INVITATION REÇUE ! Détails :", { roomId, creatorUsername, creatorAddress, betAmount, message });
    
    // Afficher une alerte visible pour confirmer la réception
    alert(`🔔 INVITATION REÇUE !\n\nDe : ${creatorUsername}\nRoom ID : ${roomId}\nMise : ${betAmount} ETH`);

    const accept = confirm(`${message}\n\nVoulez-vous rejoindre cette room ?`);
    
    if (accept) {
      try {
        if (!connectedWallet) {
          alert("❌ Connectez votre wallet MetaMask d'abord.");
          return;
        }

        if (!web3) {
          alert("❌ Web3 non initialisé. Connectez MetaMask d'abord.");
          return;
        }

        // Vérifier les informations de la room sur la blockchain
        const room = await getRoomInfo(roomId);
        if (!room || !room.playerA || room.playerA === "0x0000000000000000000000000000000000000000") {
          alert("❌ Room introuvable sur la blockchain.");
          return;
        }

        const amountInWei = web3.utils.toWei(betAmount.toString(), "ether");
        console.log("💰 Montant en Wei :", amountInWei);

        alert("⏳ Rejoindre la room et envoi de la mise...");

        // Appel du contrat smart contract pour rejoindre la room
        console.log("🔗 Appel de joinRoom sur le contrat...");
        await cashPongContract.methods.joinRoom(roomId).send({
          from: connectedWallet,
          value: amountInWei,
          gas: 300000,
          gasPrice: web3.utils.toWei('50', 'gwei')
        });

        console.log("✅ Transaction joinRoom réussie !");

        // Stocker les informations de la room
        localStorage.setItem("currentRoomId", roomId);
        localStorage.setItem("role", "guest");
        isRoomCreator = false; // User is joining, not creating
        updatePlayButtonForRole(); // Update button appearance
        window.currentRoomId = roomId;
        window.opponentEthAddress = creatorAddress;

        alert("✅ Room rejointe avec succès ! La partie peut commencer.");

        // Notify the server that this player has joined the room
        if (socket) {
          socket.emit("playerJoinedRoom", {
            roomId: roomId,
            playerAddress: connectedWallet
          });
          console.log(`📡 Notification envoyée au serveur: joueur ${connectedWallet} a rejoint la room ${roomId}`);
        }

        // Mettre à jour l'interface
        document.getElementById("matchInfo").innerText = `🎮 Room ${roomId} rejointe ! Prêt à jouer.`;
        document.getElementById("playButton").style.display = "block";
      } catch (err) {
        console.error("❌ Erreur lors de la jointure de la room :", err);
        let errMsg = err?.message || err?.toString();
        if (err?.data?.message) errMsg = err.data.message;
        if (err?.data?.reason) errMsg = err.data.reason;
        alert("❌ Erreur lors de la jointure : " + errMsg);
      }
    } else {
      console.log("❌ Invitation refusée par l'utilisateur");
    }
  });

  socket.on("opponentOffline", ({ opponentAddress, message }) => {
    console.log("⚠️ Adversaire hors ligne :", opponentAddress);
    alert("⚠️ " + message);
    
    // Réactiver le bouton de mise
    document.getElementById("betButton").disabled = false;
    document.getElementById("betButton").innerText = "Créer Room & Miser";
  });

  // ANCIEN SYSTÈME SUPPRIMÉ - Maintenant on utilise seulement roomInvitation avec contrat smart contract
  // socket.on("roomJoined") supprimé pour forcer l'utilisation du système de contrat

  // Handler pour adversaire non trouvé
  socket.on("opponentNotFound", (data) => {
    alert(`❌ L'adversaire avec l'adresse ${data.opponentAddress} n'est pas connecté au serveur.`);
    
    // Réactiver le bouton de mise
    document.getElementById("betButton").disabled = false;
    document.getElementById("betButton").innerText = "Créer Room & Miser";
    document.getElementById("matchInfo").innerText = "❌ Adversaire non connecté";
  });

  // Handler pour forfait volontaire complété (victoire automatique)
  socket.on("opponentForfeited", (data) => {
    console.log("🎉 [CLIENT] opponentForfeited reçu :", data);
    const { roomId, forfeitingPlayerAddress, message } = data;
    
    // Afficher une notification de victoire automatique
    alert(`🎉 ${message}`);
    
    // Mettre à jour l'interface
    const matchInfo = document.getElementById("matchInfo");
    if (matchInfo) {
      matchInfo.innerText = `🎉 ${message}`;
      matchInfo.style.color = "green";
    }
    
    // Masquer les contrôles de réclamation (plus besoin)
    const claimControls = document.getElementById("claimVictoryControls");
    if (claimControls) {
      claimControls.style.display = "none";
    }
    
    // Afficher l'écran de victoire
    const gameOverDiv = document.getElementById("gameOver");
    if (gameOverDiv) {
      gameOverDiv.style.display = "block";
      gameOverDiv.innerText = "🎉 VICTOIRE AUTOMATIQUE PAR FORFAIT !";
      gameOverDiv.style.color = "green";
    }
    
    // Arrêter le jeu - victoire automatique
    if (typeof gameOver !== 'undefined') {
      gameOver = true;
    }
    
    console.log("✅ [CLIENT] Victoire automatique confirmée - fonds récupérés");
  });

  // Handler pour forfait automatique de l'adversaire (fallback - réclamation manuelle)
  socket.on("opponentQuit", async (data) => {
    console.log("🚨 [CLIENT] opponentQuit reçu (fallback) :", data);
    const { roomId, quittingPlayerAddress, message } = data;

    // CORRECTION: Mettre à jour le room ID actuel pour la réclamation
    window.currentRoomId = roomId;
    console.log("🔄 [CLIENT] Room ID mis à jour pour réclamation:", roomId);

    // Afficher une notification à l'utilisateur
    alert(`🚨 ${message}`);
    
    // Mettre à jour l'interface
    const matchInfo = document.getElementById("matchInfo");
    if (matchInfo) {
      matchInfo.innerText = `🚨 ${message}`;
      matchInfo.style.color = "orange";
    }
    
    // Afficher immédiatement les contrôles de réclamation
    const claimControls = document.getElementById("claimVictoryControls");
    if (claimControls) {
      claimControls.style.display = "block";
      console.log("✅ [CLIENT] Bouton de réclamation de victoire affiché suite au quit de l'adversaire");
    }
    
    // Optionnel: Arrêter le jeu
    if (typeof gameOver !== 'undefined') {
      gameOver = true;
    }
    
    console.log("✅ [CLIENT] Gestion du forfait adversaire terminée");
  });

  // ANCIEN SYSTÈME DE CHALLENGE SUPPRIMÉ
  // Maintenant on utilise seulement le système roomCreated → roomInvitation avec contrat smart contract

  socket.on("event", (data) => {
    if (data.type === "busy") {
      alert(`❌ ${data.from} est déjà connecté avec un autre joueur.`);

      opponentUsername = null;
      isConnected = false;

      document.getElementById("connectedWithDisplay").innerText = "";
      document.getElementById("peerIdDisplay").innerText = `Ton Peer ID : ${currentUsername}`;

      document.getElementById("leaveMatchBtn").style.display = "none";
      document.getElementById("resetGameBtn").style.display = "none";

      return;
    }

    // ANCIEN SYSTÈME "ACCEPTED" SUPPRIMÉ - Maintenant on utilise seulement roomInvitation avec contrat
    
    if (data.type === "refused") {
      isConnected = false;
      opponentUsername = null;
      alert(`${data.from} a refusé le combat.`);
      updatePeerDisplay();
    } else if (data.type === "paddleMove" && isHost) {
      leftPaddle.y = data.y;
    } else if (data.type === "newGameRequest") {
      if (!isHost && !awaitingRematch) {
        awaitingRematch = true;

        const accept = confirm(`${data.from} veut rejouer. Accepter ?`);

        if (accept) {
          socket.emit("event", {
            type: "newGameAccepted",
            from: currentUsername,
            to: data.from
          });

          resetGame(false);

          leftScore = 0;
          rightScore = 0;
          gameOver = false;

          document.getElementById("gameOver").style.display = "none";
          document.getElementById("resetGameBtn").style.display = "none";
          document.getElementById("leaveMatchBtn").style.display = "none";
        } else {
          socket.emit("event", {
            type: "newGameRefused",
            from: currentUsername,
            to: data.from
          });

          isConnected = false;
          isHost = false;
          opponentUsername = null;

          resetGame(false);
          console.log("🔁 ResetGame appelé. SCORES :", leftScore, rightScore, "GameOver:", gameOver);

          console.log("🚀 handlePlayClick lancé. Countdown:", countdown);

          document.getElementById("connectedWithDisplay").innerText = "";
          document.getElementById("peerIdDisplay").innerText = `Ton Peer ID : ${currentUsername}`;
          document.getElementById("resetGameBtn").style.display = "none";
          document.getElementById("leaveMatchBtn").style.display = "none";
          document.getElementById("playButton").style.display = "block";
        }

        setTimeout(() => {
          awaitingRematch = false;
        }, 2000);
      }
    } else if (data.type === "newGameAccepted") {
      alert(`✅ ${data.from} a accepté de rejouer. Cliquez sur "JOUER" pour commencer.`);
      resetGame(false);

      leftScore = 0;
      rightScore = 0;
      gameOver = false;

      document.getElementById("gameOver").style.display = "none";
      document.getElementById("resetGameBtn").style.display = "none";
      document.getElementById("leaveMatchBtn").style.display = "none";

      if (isHost) {
        document.getElementById("playButton").style.display = "block";
      }
    } else if (data.type === "newGameRefused") {
      alert(`❌ ${data.from} a refusé de rejouer. Retour en mode solo.`);

      isConnected = false;
      isHost = false;
      opponentUsername = null;

      document.getElementById("connectedWithDisplay").innerText = "";
      document.getElementById("peerIdDisplay").innerText = `Ton Peer ID : ${currentUsername}`;

      document.getElementById("resetGameBtn").style.display = "none";
      document.getElementById("leaveMatchBtn").style.display = "none";
      document.getElementById("playButton").style.display = "block";

      resetGame(false);
    } else if (data.type === "gameOver") {
      displayWinner(data.winner);

      gameOver = true;
      dx = 0;
      dy = 0;

      document.getElementById("playButton").style.display = "none";

      if (isHost) {
        document.getElementById("resetGameBtn").style.display = "inline-block";
      }

      if (isConnected) {
        document.getElementById("leaveMatchBtn").style.display = "inline-block";
      }
    } else if (data.type === "leftMatch") {
      alert(`${data.from} s'est déconnecté.`);

      isConnected = true;
      isHost = false;
      opponentUsername = null;
      window.currentOpponent = null;
      gameOver = false;
      matchStarted = false;
      gameIsOver = false;

      clearInterval(countdownInterval);
      countdown = 0;
      dx = 0;
      dy = 0;
      x = canvas.width / 2;
      y = canvas.height / 2;

      leftScore = 0;
      rightScore = 0;

      document.getElementById("connectedWithDisplay").innerText = "";
      document.getElementById("peerIdDisplay").innerText = `Ton Peer ID : ${currentUsername}`;
      document.getElementById("leaveMatchBtn").style.display = "none";
      document.getElementById("resetGameBtn").style.display = "none";
      document.getElementById("gameOver").style.display = "none";

      document.getElementById("playButton").style.display = "block";
    }
  });

  socket.on("sync", (data) => {
    if (!isConnected) {
      console.warn("❌ Sync ignoré (solo)");
      return;
    }

    if (isHost) return;

    const d = data.payload;

    // Debug sync reception
    if (Math.random() < 0.01) { // Log 1% of syncs to avoid spam
      console.log(`🔄 [GUEST] Received sync:`, d);
    }

    x = d.ball.x;
    y = d.ball.y;

    leftPaddle.y = d.paddles.left.y;
    rightPaddle.y = d.paddles.right.y;

    leftScore = d.score.left;
    rightScore = d.score.right;

    countdown = d.countdown;
    gameOver = d.gameOver;
  });

  // Register chat listener only once globally
  if (!chatListenerRegistered) {
    console.log("🔍 [DEBUG] Registering chatMessage listener for the first time");
    socket.on("chatMessage", (data) => {
      console.log("🔍 [DEBUG] chatMessage event received:", data);
      const message = `${data.username}: ${data.message}`;
      onNewMessage(message);
    });
    chatListenerRegistered = true;
  } else {
    console.log("🔍 [DEBUG] chatMessage listener already registered, skipping");
  }

  // === SERVER-SIDE GAME HANDLERS ===
  
  socket.on("serverGameStarted", (data) => {
    console.log("🚀 [CLIENT] Server game started:", data);
    
    // Determine player role based on ETH address
    const myAddress = connectedWallet?.toLowerCase();
    const isPlayerA = myAddress === data.playerA.toLowerCase();
    
    // Store player names for score display
    multiplayerPlayerA = data.playerAName || "Joueur A";
    multiplayerPlayerB = data.playerBName || "Joueur B";
    
    // Set up client for server-authoritative mode
    isConnected = true;
    isHost = false; // Server is now the host
    isServerGame = true; // New flag for server games
    playerRole = isPlayerA ? 'playerA' : 'playerB';
    
    console.log(`🎮 [CLIENT] My role: ${playerRole} (PlayerA controls left paddle, PlayerB controls right paddle)`);
    
    // Clear any local game state
    gameOver = false;
    matchStarted = true;
    
    // Show game UI
    document.getElementById("playButton").style.display = "none";
    document.getElementById("leaveMatchBtn").style.display = "inline-block";
    
    // 🚀 AJOUTER LE COUNTDOWN DE 5 SECONDES POUR LE MODE MULTIJOUEUR
    console.log("⏰ Starting 5-second countdown for multiplayer game");
    countdown = 5;
    clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      countdown--;
      console.log(`⏰ Multiplayer countdown: ${countdown}`);

      if (countdown <= 0) {
        clearInterval(countdownInterval);
        countdown = 0;
        console.log("🚀 Multiplayer countdown finished - game ready!");
      }
    }, 1000);
    
    // Log instead of alert to not block the countdown view
    console.log(`🎮 Server game started! You are ${playerRole.toUpperCase()}. ${isPlayerA ? 'Use W/S keys to control left paddle' : 'Use Arrow Up/Down to control right paddle'}. Game starts in 5 seconds!`);
    
    // Show a brief non-blocking notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 10px; right: 10px; z-index: 1000;
      background: #4CAF50; color: white; padding: 10px 15px;
      border-radius: 5px; font-size: 14px; max-width: 300px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    notification.innerHTML = `🎮 Partie lancée!<br>Vous êtes ${playerRole.toUpperCase()}<br>${isPlayerA ? 'W/S pour la raquette gauche' : 'Flèches pour la raquette droite'}`;
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  });
  
  socket.on("serverGameState", (data) => {
    if (!isServerGame) return;
    
    const gameState = data.gameState;
    
    // Update client game state from server
    x = gameState.ball.x;
    y = gameState.ball.y;
    ballRadius = gameState.ball.radius;
    
    // Update paddle positions
    leftPaddle.x = gameState.paddles.playerA.x;
    leftPaddle.y = gameState.paddles.playerA.y;
    rightPaddle.x = gameState.paddles.playerB.x;
    rightPaddle.y = gameState.paddles.playerB.y;
    
    // Update scores
    leftScore = gameState.scores.playerA;
    rightScore = gameState.scores.playerB;
    
    // Update game state
    gameOver = gameState.gameEnded;
    
    // Debug log (reduced frequency)
    if (Math.random() < 0.01) {
      console.log(`🔄 [CLIENT] Received server state: Ball(${x},${y}) Scores(${leftScore},${rightScore})`);
    }
  });

  socket.on("countdownUpdate", (data) => {
    if (!isServerGame) return;
    
    const { countdown } = data;
    
    if (countdown > 0) {
      // Show countdown on canvas
      countdownText = countdown.toString();
      console.log(`⏰ [CLIENT] Countdown: ${countdown}`);
    } else {
      // Hide countdown when it reaches 0
      countdownText = "";
      console.log(`✅ [CLIENT] Countdown finished, ball movement resumed`);
    }
  });
  
  socket.on("gameEnded", (data) => {
    console.log("🏆 [CLIENT] Game ended:", data);
    
    isServerGame = false;
    matchStarted = false;
    gameOver = true;
    
    const myAddress = connectedWallet?.toLowerCase();
    const didIWin = myAddress === data.winner.toLowerCase();
    
    alert(`🏆 Game Over!\n\n${didIWin ? 'YOU WON!' : 'You lost'}\n\nFinal Score: ${data.finalScores.playerA} - ${data.finalScores.playerB}`);
    
    document.getElementById("playButton").style.display = "block";
    document.getElementById("leaveMatchBtn").style.display = "none";
  });

  socket.on("gameStartDenied", (data) => {
    console.log("❌ [CLIENT] Game start denied:", data);
    alert(`❌ Accès refusé: ${data.message}`);
  });

  socket.on("roomInvitation", (data) => {
    localStorage.setItem("currentRoomId", data.roomId);
    localStorage.setItem("role", "guest");
    isRoomCreator = false; // User is receiving invitation, not creating
    updatePlayButtonForRole(); // Update button appearance

    alert("🎟️ Tu as été invité dans la room " + data.roomId);
  });

  // Handle socket disconnection to reset initialization flag
  socket.on("disconnect", () => {
    console.log("🔌 Socket disconnected, resetting initialization flags");
    socketInitialized = false;
    chatListenerRegistered = false;
  });
}

function syncHost() {
  if (!isHost || !isConnected) return;

  const targetAddress = window.opponentEthAddress?.toLowerCase() || opponentUsername?.toLowerCase();
  if (!targetAddress) {
    console.warn("⚠️ No opponent address for sync");
    return;
  }

  const payload = {
    to: targetAddress,
    payload: {
      ball: { x, y },
      paddles: {
        left: { y: leftPaddle.y },
        right: { y: rightPaddle.y }
      },
      score: {
        left: leftScore,
        right: rightScore
      },
      countdown,
      gameOver
    }
  };

  // Debug sync transmission
  if (Math.random() < 0.01) { // Log 1% of syncs to avoid spam
    console.log(`🔄 [HOST] Syncing to ${targetAddress}:`, payload.payload);
  }

  socket.emit("sync", payload);
}

// === FONCTIONS WEB3 ===

async function connectWallet() {
  if (typeof window.ethereum !== "undefined") {
    try {
      await forcePolygonMainnet();

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      connectedWallet = accounts[0];

      // Debug: log address after MetaMask connection
      console.log(`[FRONTEND WALLET] connectedWallet: ${connectedWallet}`);

      web3 = new Web3(window.ethereum);

      // Initialiser les contrats
      contract = new web3.eth.Contract(getContractABI(), getContractAddress());
      cashPongContract = new web3.eth.Contract(getContractABI(), getContractAddress());

      // Variables globales
      window.web3 = web3;
      window.contract = contract;
      window.connectedWallet = connectedWallet;

      // Afficher l'adresse wallet
      document.getElementById("walletAddress").innerText = shorten(connectedWallet);
      console.log("✅ Contrat connecté avec succès !");
      
      return true;
    } catch (error) {
      console.error("❌ Erreur connexion MetaMask:", error);
      alert("❌ Connexion Metamask échouée: " + error.message);
      return false;
    }
  } else {
    showMetaMaskInstallationGuide();
    return false;
  }
}

async function forceReconnectWallet() {
  try {
    // Force disconnect first
    if (typeof window.ethereum !== "undefined") {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      });
    }
    
    // Clear current connection
    connectedWallet = null;
    document.getElementById("walletAddress").innerText = "";
    
    // Now reconnect
    await connectWallet();
    
    console.log("✅ Force reconnected successfully!");
  } catch (error) {
    console.error("❌ Force reconnect failed:", error);
  }
}

function shorten(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// Function to show MetaMask installation guide
function showMetaMaskInstallationGuide() {
  const metamaskSection = document.getElementById("metamaskSection");
  
  // Create installation guide HTML
  const guideHTML = `
    <div style="background: rgba(255, 107, 53, 0.1); border: 2px solid #ff6b35; border-radius: 10px; padding: 15px; margin: 10px 0;">
      <h3 style="color: #ff6b35; margin: 0 0 10px 0;">🦊 MetaMask n'est pas installé</h3>
      <p style="color: #fff; margin: 0 0 15px 0;">Pour utiliser cette application, vous devez installer MetaMask :</p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <a href="https://metamask.io/download/" target="_blank" style="
          background: #ff6b35; 
          color: white; 
          padding: 10px 15px; 
          text-decoration: none; 
          border-radius: 5px; 
          font-weight: bold;
          display: inline-block;
        ">📥 Installer MetaMask</a>
        <button onclick="checkMetaMaskAvailability()" style="
          background: #0a74da; 
          color: white; 
          padding: 10px 15px; 
          border: none; 
          border-radius: 5px; 
          font-weight: bold;
          cursor: pointer;
        ">🔄 Vérifier l'installation</button>
      </div>
      <p style="color: #ccc; font-size: 12px; margin: 10px 0 0 0;">
        Après l'installation, rechargez cette page et cliquez sur "Connecter Metamask"
      </p>
    </div>
  `;
  
  // Replace the metamaskSection content with the guide
  metamaskSection.innerHTML = guideHTML;
}

// Function to check if MetaMask is available
function checkMetaMaskAvailability() {
  if (typeof window.ethereum !== "undefined") {
    // MetaMask is now available, restore the original buttons
    restoreMetaMaskButtons();
    alert("✅ MetaMask détecté ! Vous pouvez maintenant vous connecter.");
  } else {
    alert("❌ MetaMask n'est toujours pas détecté. Assurez-vous de l'avoir installé et rechargez la page.");
  }
}

// Function to restore original MetaMask buttons
function restoreMetaMaskButtons() {
  const metamaskSection = document.getElementById("metamaskSection");
  metamaskSection.innerHTML = `
    <button onclick="connectWallet()">🦊 Connecter Metamask</button>
    <button onclick="forceReconnectWallet()" style="background: #ff6b35;">🔄 Demo: Force Reconnect</button>
    <span id="walletAddress" style="color: #0f0; font-weight: bold;"></span>
  `;
}

// Check MetaMask availability on page load
function checkMetaMaskOnLoad() {
  if (typeof window.ethereum === "undefined") {
    showMetaMaskInstallationGuide();
  }
}

// === ABI DU CONTRAT ===
// Note: contractABI is declared globally in event-handlers.js
// Using function to access global ABI to avoid duplicate declaration
function getContractABI() {
  return window.contractABI || [];
}

// === CONTRACT ABI SECTION ===
// Note: contractABI is declared globally in event-handlers.js and accessed via getContractABI()

// Use global ABI - contractABI is already available from event-handlers.js

async function initWeb3() {
  if (typeof window.ethereum === "undefined") {
    console.warn("🦊 MetaMask n'est pas installé");
    return false;
  }

  try {
    // Force Polygon Mainnet before initializing web3
    await forcePolygonMainnet();

    web3 = new Web3(window.ethereum);
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    connectedWallet = accounts[0];
    // Use shortened wallet address as username for display
    window.currentUsername = connectedWallet.substring(0, 8) + "...";

    console.log("✅ Contrat connecté !");
    console.log("👤 Identifiant joueur (PeerID) :", window.currentUsername);

    cashPongContract = new web3.eth.Contract(getContractABI(), getContractAddress());
    contract = cashPongContract; // Pour compatibilité

    const ownerAddress = await cashPongContract.methods.owner().call();
    console.log("👑 Adresse du owner :", ownerAddress);

    connectToSocketServer(window.currentUsername);

    // Use Polygon WebSocket provider
    const wsProvider = new Web3.providers.WebsocketProvider("wss://polygon-mainnet.g.alchemy.com/v2/g0-uG5oc0RLGLTWHL5501");

    wsProvider.on("error", (e) => console.error("WebSocket error", e));
    wsProvider.on("end", () => console.warn("WebSocket fermé"));

    web3Socket = new Web3(wsProvider);
    socketContract = new web3Socket.eth.Contract(getContractABI(), getContractAddress());

    listenContractEvents(socketContract);

    return true;
  } catch (error) {
    console.error("❌ Erreur connexion contrat :", error);
    alert("Impossible de se connecter à MetaMask: " + error.message);
    return false;
  }
}

function listenContractEvents(contract) {
  const eventsAvailable = Object.entries(contract.events || {});
  const eventNames = eventsAvailable
    .filter(([key, value]) => typeof value === "function")
    .map(([key]) => key);

  console.log("📡 Events disponibles :", eventNames.join(", "));

  const tryListen = (eventName, handler) => {
    const eventFn = contract.events?.[eventName];

    if (typeof eventFn !== "function") {
      console.warn(`⚠️ Event '${eventName}' non fonctionnel.`);
      return;
    }

    contract.events[eventName](
      { fromBlock: 'latest' },
      (error, event) => {
        if (error) {
          console.error(`❌ Erreur ${eventName} :`, error);
        } else {
          handler(event);
        }
      }
    );
  };

  tryListen("RoomCreated", (event) => {
    console.log("🎉 RoomCreated :", event.returnValues);
    alert("✅ Room créée avec ID : " + event.returnValues.roomId);
  });

  tryListen("PlayerJoined", (event) => {
    console.log("🙋‍♂️ PlayerJoined :", event.returnValues);
  });

  tryListen("PointScored", (event) => {
    console.log("🏓 PointScored :", event.returnValues);
  });

  tryListen("MatchEnded", async (event) => {
    const { winner, roomId } = event.returnValues;

    const balanceBefore = await web3Socket.eth.getBalance(winner);
    console.log(`💼 Solde AVANT paiement : ${web3.utils.fromWei(balanceBefore, "ether")} ETH`);
  });

  tryListen("VictoryByForfeit", (event) => {
    console.log("🏳️ VictoryByForfeit :", event.returnValues);
  });

  tryListen("OwnerForcedEnd", (event) => {
    console.log("⛔ OwnerForcedEnd :", event.returnValues);
  });

  tryListen("WinningsPaid", async (event) => {
    const { player, amount } = event.returnValues;

    const balanceAfter = await web3Socket.eth.getBalance(player);
    const amountInEth = web3.utils.fromWei(amount, "ether");

    console.log(`💰 Solde APRÈS paiement : ${amountInEth} ETH`);

    if (connectedWallet.toLowerCase() === player.toLowerCase()) {
      alert(`🏆 Bravo ! Vous avez reçu automatiquement ${amountInEth} ETH !`);
    }

    if (connectedWallet.toLowerCase() === ownerAddress.toLowerCase()) {
      const commission = parseFloat(amountInEth) / 9;
      alert(`💼 Commission reçue : ~${commission.toFixed(6)} ETH`);
    }
  });
}

async function getRoomInfo(roomId, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔍 Getting room info for roomId: ${roomId} (attempt ${attempt}/${retries})`);
      console.log("🔍 Contract address:", getContractAddress());
      console.log("🔍 Connected wallet:", connectedWallet);
      console.log("🔍 Web3 provider:", web3.currentProvider.host || "MetaMask");
      
      // Check current block number for sync status
      const currentBlock = await web3.eth.getBlockNumber();
      console.log("🔍 Current block number:", currentBlock);
      
      const room = await cashPongContract.methods.getRoom(roomId).call();
      console.log("📋 Raw room data:", room);
      
      // Check if room exists - more detailed validation
      if (!room) {
        throw new Error("Room data is null");
      }
      
      if (!room.playerA) {
        throw new Error("Room playerA is undefined");
      }
      
      if (room.playerA === "0x0000000000000000000000000000000000000000") {
        // Try to verify room existence via events as fallback
        console.log("🔍 Room getRoom() returned zero addresses, checking events...");
        try {
          const currentBlock = await web3.eth.getBlockNumber();
          const fromBlock = Math.max(Number(currentBlock) - 1000, 0); // Check last 1000 blocks
          
          const events = await cashPongContract.getPastEvents('RoomCreated', {
            filter: { roomId: roomId },
            fromBlock: fromBlock,
            toBlock: 'latest'
          });
          
          console.log(`🔍 Found ${events.length} RoomCreated events for room ${roomId}`);
          
          if (events.length > 0) {
            const event = events[events.length - 1]; // Get most recent
            console.log("📋 Room found in events:", event.returnValues);
            
            // Create a room object from the event data
            const eventRoom = {
              playerA: event.returnValues.playerA,
              playerB: event.returnValues.playerB,
              betAmount: event.returnValues.betAmount,
              playerAJoined: true, // Creator auto-joins
              playerBJoined: false, // Not joined yet
              isFinished: false,
              scoreA: 0,
              scoreB: 0,
              winner: "0x0000000000000000000000000000000000000000",
              gameStarted: false,
              lastMoveTime: 0
            };
            
            console.log("✅ Room reconstructed from events:", eventRoom);
            return eventRoom;
          }
        } catch (eventError) {
          console.error("❌ Error checking events:", eventError);
        }
        
        throw new Error("Room playerA is zero address - room doesn't exist yet");
      }
      
      // Additional validation for proper room setup
      if (!room.playerB || room.playerB === "0x0000000000000000000000000000000000000000") {
        throw new Error("Room playerB is not set - room setup incomplete");
      }
      
      console.log("✅ Room found successfully:", {
        roomId: roomId,
        playerA: room.playerA,
        playerB: room.playerB,
        betAmount: room.betAmount,
        playerAJoined: room.playerAJoined,
        playerBJoined: room.playerBJoined,
        isFinished: room.isFinished
      });
      return room;
    } catch (err) {
      console.error(`❌ Attempt ${attempt} failed:`, err.message);
      
      if (attempt < retries) {
        const waitTime = attempt <= 2 ? 3000 : 5000; // Wait longer for later attempts
        console.log(`⏳ Waiting ${waitTime/1000} seconds before retry... (Room might still be confirming on blockchain)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error("❌ Room introuvable sur la blockchain après plusieurs tentatives. Le Room ID pourrait être incorrect ou il y a un problème de synchronisation blockchain.");
        return null;
      }
    }
  }
}

// Function to check recent room creation events
async function checkRecentRoomEvents(roomId = null) {
  try {
    console.log("🔍 Checking recent RoomCreated events...");
    
    const currentBlock = await web3.eth.getBlockNumber();
    const fromBlock = Math.max(Number(currentBlock) - 100, 0); // Check last 100 blocks
    
    const filter = roomId ? { roomId: roomId } : {};
    
    const events = await cashPongContract.getPastEvents('RoomCreated', {
      filter: filter,
      fromBlock: fromBlock,
      toBlock: 'latest'
    });
    
    console.log(`🔍 Found ${events.length} recent RoomCreated events`);
    
    events.forEach((event, index) => {
      console.log(`Event ${index + 1}:`, {
        roomId: event.returnValues.roomId,
        playerA: event.returnValues.playerA,
        playerB: event.returnValues.playerB,
        betAmount: event.returnValues.betAmount,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      });
    });
    
    return events;
  } catch (error) {
    console.error("❌ Error checking events:", error);
    return [];
  }
}

// Fonction pour gérer le forfait automatique quand un joueur quitte
async function handlePlayerQuit() {
  console.log("🚨 handlePlayerQuit appelé !");
  console.log("currentRoomId:", window.currentRoomId);
  console.log("opponentEthAddress:", window.opponentEthAddress);
  console.log("connectedWallet:", connectedWallet);
  
  if (window.currentRoomId && window.opponentEthAddress && connectedWallet) {
    try {
      console.log("🏃‍♂️ Joueur quitte - forfait volontaire immédiat...");
      
      // Appeler voluntaryForfeit immédiatement (pas de délai requis)
      if (web3 && cashPongContract) {
        try {
          console.log("⛓️ Appel de voluntaryForfeit (pas de délai requis)...");
          
          // voluntaryForfeit ne nécessite aucun délai d'attente
          await cashPongContract.methods.voluntaryForfeit(window.currentRoomId).send({
            from: connectedWallet,
            gas: 200000,
            gasPrice: web3.utils.toWei('50', 'gwei')
          });
          
          console.log("✅ Forfait volontaire déclaré - fonds distribués à l'adversaire immédiatement");
          
          // Notifier le serveur que le forfait a été effectué
          if (socket && socket.connected) {
            socket.emit("forfeitCompleted", {
              roomId: window.currentRoomId,
              forfeitingPlayer: connectedWallet,
              opponentAddress: window.opponentEthAddress
            });
          }
          
        } catch (contractErr) {
          console.error("❌ Erreur lors du forfait volontaire :", contractErr);
          
          // Si le contrat échoue, notifier quand même l'adversaire
          if (socket && socket.connected) {
            socket.emit("playerQuit", {
              roomId: window.currentRoomId,
              quittingPlayer: connectedWallet,
              opponentAddress: window.opponentEthAddress
            });
          }
        }
      }
      
    } catch (err) {
      console.error("❌ Erreur lors de la gestion du quit :", err);
    }
  } else {
    console.log("❌ Conditions non remplies pour le forfait automatique");
  }
}

// Détecter quand le joueur quitte le navigateur
window.addEventListener('beforeunload', handlePlayerQuit);

// Fonction pour copier le Room ID dans le presse-papiers
function copyRoomId(roomId) {
  navigator.clipboard.writeText(roomId).then(() => {
    alert("📋 Room ID copié dans le presse-papiers !");
  }).catch(err => {
    console.error("❌ Erreur lors de la copie :", err);
    alert("❌ Erreur lors de la copie du Room ID");
  });
}

// Fonction pour réclamer manuellement la victoire
async function claimVictoryManually() {
  console.log("🏆 [MANUAL] Tentative de réclamation manuelle de victoire...");
  
  if (!window.currentRoomId) {
    alert("❌ Aucune room active pour réclamer la victoire");
    return;
  }

  if (!web3 || !cashPongContract || !connectedWallet) {
    alert("❌ Web3 ou contrat non initialisé");
    return;
  }

  // Vérifier le réseau Polygon Mainnet avant de continuer
  try {
    const chainId = await web3.eth.getChainId();
    const chainIdNumber = Number(chainId); // Convert to number for comparison
    console.log("🌐 [MANUAL] Chain ID actuel:", chainIdNumber, "(type:", typeof chainId, ")");
    if (chainIdNumber !== 137) {
      alert(`❌ Réseau incorrect! Connectez-vous à Polygon Mainnet (Chain ID: 137). Vous êtes sur Chain ID: ${chainIdNumber}`);
      return;
    }
    console.log("✅ [MANUAL] Réseau Polygon Mainnet confirmé");
  } catch (networkErr) {
    console.error("❌ [MANUAL] Erreur de vérification réseau:", networkErr);
    alert("❌ Erreur de vérification du réseau: " + networkErr.message);
    return;
  }

  try {
    document.getElementById("claimVictoryInfo").innerText = "⏳ Vérification de l'état de la room...";
    document.getElementById("claimVictoryButton").disabled = true;

    // Vérifier l'état de la room avant de réclamer
    console.log("🔍 [MANUAL] Vérification de l'état de la room:", window.currentRoomId);
    
    const room = await cashPongContract.methods.getRoom(window.currentRoomId).call();
    console.log("📊 [MANUAL] État de la room:", {
      playerA: room.playerA,
      playerB: room.playerB,
      playerAJoined: room.playerAJoined,
      playerBJoined: room.playerBJoined,
      isFinished: room.isFinished,
      lastActionTimestamp: room.lastActionTimestamp,
      playerAForfeited: room.playerAForfeited,
      playerBForfeited: room.playerBForfeited,
      betAmount: room.betAmount,
      scoreA: room.scoreA,
      scoreB: room.scoreB
    });
    
    console.log("🔍 [MANUAL] Votre adresse:", connectedWallet);
    console.log("🔍 [MANUAL] Êtes-vous playerA?", connectedWallet.toLowerCase() === room.playerA.toLowerCase());
    console.log("🔍 [MANUAL] Êtes-vous playerB?", connectedWallet.toLowerCase() === room.playerB.toLowerCase());

    // Vérifier les conditions avec timestamp blockchain
    const now = Math.floor(Date.now() / 1000); // Timestamp en secondes
    const blockchainNow = await web3.eth.getBlock('latest').then(block => parseInt(block.timestamp));
    const timeSinceLastAction = now - parseInt(room.lastActionTimestamp);
    const blockchainTimeSinceLastAction = blockchainNow - parseInt(room.lastActionTimestamp);
    
    console.log("⏰ [MANUAL] Timestamp local:", now);
    console.log("⏰ [MANUAL] Timestamp blockchain:", blockchainNow);
    console.log("⏰ [MANUAL] lastActionTimestamp:", parseInt(room.lastActionTimestamp));
    console.log("⏰ [MANUAL] Temps depuis dernière action (local):", timeSinceLastAction, "secondes");
    console.log("⏰ [MANUAL] Temps depuis dernière action (blockchain):", blockchainTimeSinceLastAction, "secondes");
    console.log("⏰ [MANUAL] Condition 60s remplie selon blockchain:", blockchainTimeSinceLastAction >= 60);
    
    if (room.isFinished) {
      alert("❌ La room est déjà terminée");
      return;
    }
    
    if (!room.playerAJoined || !room.playerBJoined) {
      alert("❌ Les deux joueurs n'ont pas encore rejoint la room");
      return;
    }
    
    if (blockchainTimeSinceLastAction < 60) {
      alert(`⏰ Selon la blockchain, vous devez attendre encore ${60 - blockchainTimeSinceLastAction} secondes avant de pouvoir réclamer la victoire`);
      document.getElementById("claimVictoryInfo").innerText = `⏰ Attendre encore ${60 - blockchainTimeSinceLastAction}s`;
      document.getElementById("claimVictoryButton").disabled = false;
      return;
    }
    
    const isPlayerA = connectedWallet.toLowerCase() === room.playerA.toLowerCase();
    const isPlayerB = connectedWallet.toLowerCase() === room.playerB.toLowerCase();
    
    if (!isPlayerA && !isPlayerB) {
      alert("❌ Vous n'êtes pas un joueur de cette room");
      return;
    }
    
    if ((isPlayerA && room.playerAForfeited) || (isPlayerB && room.playerBForfeited)) {
      alert("❌ Vous avez déjà forfait dans cette room");
      return;
    }
    
    // Vérifier la logique du contrat pour claimVictoryByForfeit
    if (isPlayerA && room.playerBForfeited) {
      alert("❌ PlayerB a déjà forfait - vous ne pouvez plus réclamer");
      return;
    }
    
    if (isPlayerB && room.playerAForfeited) {
      alert("❌ PlayerA a déjà forfait - vous ne pouvez plus réclamer");
      return;
    }
    
    console.log("🔍 [MANUAL] Vérification logique contrat:");
    console.log("- Vous êtes playerA:", isPlayerA, "PlayerB forfait:", room.playerBForfeited);
    console.log("- Vous êtes playerB:", isPlayerB, "PlayerA forfait:", room.playerAForfeited);
    
    // Vérification détaillée des conditions du contrat
    console.log("🔍 [MANUAL] Vérification détaillée des conditions:");
    console.log("- Room ID:", window.currentRoomId);
    console.log("- Votre adresse:", connectedWallet);
    console.log("- PlayerA adresse:", room.playerA);
    console.log("- PlayerB adresse:", room.playerB);
    console.log("- Match terminé?", room.isFinished);
    console.log("- PlayerA rejoint?", room.playerAJoined);
    console.log("- PlayerB rejoint?", room.playerBJoined);
    console.log("- PlayerA forfait?", room.playerAForfeited);
    console.log("- PlayerB forfait?", room.playerBForfeited);
    console.log("- Temps écoulé (blockchain):", blockchainTimeSinceLastAction, "secondes");
    
    // Vérifier la logique exacte du contrat
    if (isPlayerA && !room.playerBForfeited) {
      console.log("✅ [MANUAL] Condition contrat: PlayerA peut réclamer (PlayerB n'a pas forfait)");
    } else if (isPlayerB && !room.playerAForfeited) {
      console.log("✅ [MANUAL] Condition contrat: PlayerB peut réclamer (PlayerA n'a pas forfait)");
    } else {
      console.log("❌ [MANUAL] Condition contrat: Pas éligible pour réclamer");
      console.log("- Raison: isPlayerA =", isPlayerA, ", playerBForfeited =", room.playerBForfeited);
      console.log("- Raison: isPlayerB =", isPlayerB, ", playerAForfeited =", room.playerAForfeited);
    }

    document.getElementById("claimVictoryInfo").innerText = "⏳ Réclamation en cours...";
    console.log("⛓️ [MANUAL] Appel direct de claimVictoryByForfeit pour room:", window.currentRoomId);
    console.log("🔧 [MANUAL] Simulation désactivée pour éviter les erreurs RPC");

    // CORRECTION: Utiliser l'adresse checksummée pour éviter les problèmes de casse
    const checksummedAddress = web3.utils.toChecksumAddress(connectedWallet);
    console.log("🔧 [MANUAL] Adresse checksummée pour transaction:", checksummedAddress);
    
    // Vérification finale de l'état de la room juste avant la transaction
    console.log("🔍 [MANUAL] Vérification finale de l'état avant transaction...");
    const finalRoomState = await cashPongContract.methods.getRoom(window.currentRoomId).call();
    console.log("📊 [MANUAL] État final de la room:", {
      playerA: finalRoomState.playerA,
      playerB: finalRoomState.playerB,
      isFinished: finalRoomState.isFinished,
      playerAJoined: finalRoomState.playerAJoined,
      playerBJoined: finalRoomState.playerBJoined,
      playerAForfeited: finalRoomState.playerAForfeited,
      playerBForfeited: finalRoomState.playerBForfeited,
      lastActionTimestamp: finalRoomState.lastActionTimestamp
    });
    
    // Vérifier si l'état a changé
    if (finalRoomState.isFinished) {
      alert("❌ La room a été terminée entre temps");
      document.getElementById("claimVictoryInfo").innerText = "❌ Room déjà terminée";
      document.getElementById("claimVictoryButton").disabled = false;
      return;
    }
    
    const finalBlockchainNow = await web3.eth.getBlock('latest').then(block => parseInt(block.timestamp));
    const finalTimeSinceLastAction = finalBlockchainNow - parseInt(finalRoomState.lastActionTimestamp);
    console.log("⏰ [MANUAL] Temps final depuis dernière action:", finalTimeSinceLastAction, "secondes");
    
    if (finalTimeSinceLastAction < 60) {
      alert(`❌ Condition de temps non remplie: ${finalTimeSinceLastAction}s < 60s requis`);
      document.getElementById("claimVictoryInfo").innerText = `❌ Attendre encore ${60 - finalTimeSinceLastAction}s`;
      document.getElementById("claimVictoryButton").disabled = false;
      return;
    }
    
    console.log("✅ [MANUAL] Toutes les conditions finales vérifiées, envoi de la transaction...");
    
    // Estimation dynamique du gas
    let gasEstimate;
    try {
      gasEstimate = await cashPongContract.methods.claimVictoryByForfeit(window.currentRoomId).estimateGas({
        from: checksummedAddress
      });
      console.log("⛽ [MANUAL] Gas estimé:", gasEstimate);
      // Ajouter une marge de sécurité de 20%
      gasEstimate = Math.floor(gasEstimate * 1.2);
    } catch (gasErr) {
      console.warn("⚠️ [MANUAL] Erreur lors de l'estimation du gas:", gasErr);
      // Utiliser une valeur par défaut si l'estimation échoue
      gasEstimate = 300000;
    }
    
    // Obtenir le prix du gas actuel
    let gasPrice;
    try {
      gasPrice = await web3.eth.getGasPrice();
      console.log("💰 [MANUAL] Prix du gas actuel:", gasPrice);
      // Ajouter une marge pour accélérer la transaction
      gasPrice = Math.floor(gasPrice * 1.1);
    } catch (gasPriceErr) {
      console.warn("⚠️ [MANUAL] Erreur lors de l'obtention du prix du gas:", gasPriceErr);
      // Utiliser une valeur par défaut
      gasPrice = web3.utils.toWei('30', 'gwei');
    }
    
    console.log("🚀 [MANUAL] Paramètres de transaction:", {
      gas: gasEstimate,
      gasPrice: gasPrice,
      from: checksummedAddress
    });
    
    const tx = await cashPongContract.methods.claimVictoryByForfeit(window.currentRoomId).send({
      from: checksummedAddress,
      gas: gasEstimate,
      gasPrice: gasPrice
    });

    console.log("✅ [MANUAL] Victoire réclamée avec succès:", tx.transactionHash);
    
    alert("🏆 Victoire réclamée avec succès ! Les fonds ont été distribués.");
    
    // Mettre à jour l'interface
    document.getElementById("matchInfo").innerText = "🏆 Victoire réclamée ! Fonds récupérés.";
    document.getElementById("gameOver").style.display = "block";
    document.getElementById("gameOver").innerText = "🏆 VICTOIRE RÉCLAMÉE !";
    
    // Masquer les contrôles de réclamation
    document.getElementById("claimVictoryControls").style.display = "none";

    // Réinitialiser pour une nouvelle partie
    window.currentRoomId = null;
    window.opponentEthAddress = null;
    localStorage.removeItem("currentRoomId");
    localStorage.removeItem("role");

    // Réafficher les contrôles pour une nouvelle partie
    document.getElementById("peerControls").style.display = "block";
    document.getElementById("joinRoomControls").style.display = "block";
    document.getElementById("betButton").disabled = false;
    document.getElementById("betButton").innerText = "Créer Room & Miser";

  } catch (err) {
    console.error("❌ [MANUAL] Erreur lors de la réclamation :", err);
    
    // Logging détaillé pour débugger l'erreur
    console.log("🔍 [MANUAL] Type d'erreur:", typeof err);
    console.log("🔍 [MANUAL] Erreur complète:", JSON.stringify(err, null, 2));
    console.log("🔍 [MANUAL] err.message:", err?.message);
    console.log("🔍 [MANUAL] err.code:", err?.code);
    console.log("🔍 [MANUAL] err.data:", err?.data);
    console.log("🔍 [MANUAL] err.reason:", err?.reason);
    console.log("🔍 [MANUAL] err.stack:", err?.stack);
    
    let errMsg = err?.message || err?.toString();
    if (err?.data?.message) errMsg = err.data.message;
    if (err?.data?.reason) errMsg = err.data.reason;
    if (err?.reason) errMsg = err.reason;
    
    // Gestion spécifique des erreurs MetaMask et RPC
    if (err?.code === 4001) {
      errMsg = "Transaction annulée par l'utilisateur";
    } else if (err?.code === -32603) {
      errMsg = "Erreur interne RPC - Problème de réseau ou de smart contract";
      console.log("🔧 [MANUAL] Suggestion: Vérifiez votre connexion Polygon Mainnet");
      console.log("🔧 [MANUAL] Adresse du contrat:", contractAddress);
      
      // Vérifier la connexion au réseau
      try {
        const networkId = await web3.eth.net.getId();
        const chainId = await web3.eth.getChainId();
        const chainIdNumber = Number(chainId); // Convert to number for comparison
        console.log("🌐 [MANUAL] Network ID:", networkId, "Chain ID:", chainIdNumber, "(type:", typeof chainId, ")");
        if (chainIdNumber !== 137) {
          errMsg = "Erreur: Vous devez être connecté à Polygon Mainnet (Chain ID 137)";
        }
      } catch (networkErr) {
        console.error("❌ [MANUAL] Erreur lors de la vérification du réseau:", networkErr);
      }
    } else if (err?.message?.includes('insufficient funds')) {
      errMsg = "Fonds insuffisants pour payer les frais de transaction";
    } else if (err?.message?.includes('gas')) {
      errMsg = "Erreur de gas - Transaction annulée";
    } else if (err?.message?.includes('nonce')) {
      errMsg = "Erreur de nonce - Réessayez la transaction";
    } else if (err?.message?.includes("reverted")) {
      errMsg = "Transaction rejetée par le contrat smart";
    } else if (err?.message?.includes("insufficient funds")) {
      errMsg = "Fonds insuffisants pour les frais de gas";
    }
    
    console.log("🔍 [MANUAL] Message d'erreur final:", errMsg);
    
    document.getElementById("claimVictoryInfo").innerText = "❌ Erreur: " + errMsg;
    document.getElementById("claimVictoryButton").disabled = false;
    
    if (errMsg.includes("Match still active")) {
      alert("⏰ La réclamation nécessite 60 secondes d'inactivité.\n\nAttendez encore un peu et réessayez.");
    } else if (errMsg.includes("Internal JSON-RPC error")) {
      alert("❌ Erreur MetaMask. Essayez de :\n1. Actualiser la page\n2. Reconnecter MetaMask\n3. Vérifier votre réseau");
    } else {
      alert("❌ Erreur lors de la réclamation : " + errMsg);
    }
  }
}

// Fonction pour récupérer et afficher les infos de la room
async function fetchRoomInfo() {
  const roomIdInput = document.getElementById("roomIdToJoin").value.trim();
  
  if (!roomIdInput) {
    document.getElementById("joinBetDisplay").style.display = "none";
    return;
  }

  if (!web3 || !cashPongContract) {
    document.getElementById("joinBetDisplay").style.display = "none";
    return;
  }

  try {
    const room = await getRoomInfo(roomIdInput);
    if (room && room.playerA && room.playerA !== "0x0000000000000000000000000000000000000000") {
      const betAmountEth = web3.utils.fromWei(room.betAmount, "ether");
      document.getElementById("joinBetAmountDisplay").innerText = betAmountEth;
      document.getElementById("joinBetDisplay").style.display = "block";
      
      // Vérifier si la room est disponible
      if (room.playerBJoined) {
        document.getElementById("joinInfo").innerText = "❌ Cette room est déjà complète.";
      } else if (room.playerB.toLowerCase() !== connectedWallet.toLowerCase()) {
        document.getElementById("joinInfo").innerText = "❌ Cette room n'est pas destinée à votre adresse.";
      } else {
        document.getElementById("joinInfo").innerText = "✅ Room disponible ! Cliquez pour rejoindre.";
      }
    } else {
      document.getElementById("joinBetDisplay").style.display = "none";
      document.getElementById("joinInfo").innerText = "❌ Room introuvable.";
    }
  } catch (err) {
    document.getElementById("joinBetDisplay").style.display = "none";
    document.getElementById("joinInfo").innerText = "❌ Erreur lors de la vérification de la room.";
  }
}

// Fonction pour rejoindre manuellement une room avec Room ID
async function joinRoomManually() {
  const roomIdInput = document.getElementById("roomIdToJoin").value.trim();

  // Validation des entrées
  if (!roomIdInput) {
    alert("❌ Veuillez entrer un Room ID.");
    return;
  }

  if (!web3) {
    alert("❌ Web3 non initialisé. Connectez MetaMask d'abord.");
    return;
  }

  if (!connectedWallet) {
    alert("❌ Connectez votre wallet MetaMask d'abord.");
    return;
  }

  try {
    // Vérifier que le contrat est bien initialisé
    if (!cashPongContract) {
      alert("❌ Contrat non initialisé. Connectez MetaMask d'abord.");
      return;
    }

    // Vérifier que nous sommes sur le bon réseau (Polygon)
    try {
      const chainId = await web3.eth.getChainId();
      // Handle both hex and decimal formats for POLYGON_CHAIN_ID
      let expectedChainId;
      const polygonChainId = window.POLYGON_CHAIN_ID || "137";
      if (polygonChainId.startsWith("0x")) {
        expectedChainId = parseInt(polygonChainId, 16);
      } else {
        expectedChainId = parseInt(polygonChainId, 10);
      }
      
      // Convert both to numbers to ensure proper comparison
      const currentChainId = Number(chainId);
      const expectedChainIdNum = Number(expectedChainId);
      
      console.log(`🔍 Current chain ID: ${currentChainId} (type: ${typeof currentChainId}), Expected: ${expectedChainIdNum} (type: ${typeof expectedChainIdNum})`);
      console.log(`🔍 Raw values - chainId: ${chainId}, expectedChainId: ${expectedChainId}`);
      console.log(`🔍 POLYGON_CHAIN_ID: ${polygonChainId}`);
      
      if (currentChainId !== expectedChainIdNum) {
        alert(`❌ Vous devez être connecté au réseau Polygon Mainnet (Chain ID: ${expectedChainIdNum}). Actuel: ${currentChainId}`);
        return;
      }
      
      console.log("✅ Réseau Polygon Mainnet confirmé");
    } catch (networkError) {
      console.error("❌ Erreur de vérification réseau:", networkError);
      alert("❌ Impossible de vérifier le réseau. Vérifiez votre connexion MetaMask.");
      return;
    }

    console.log("🔍 Tentative de rejoindre la room :", roomIdInput);

    // Vérifier les informations de la room sur la blockchain
    const room = await getRoomInfo(roomIdInput);
    if (!room || !room.playerA || room.playerA === "0x0000000000000000000000000000000000000000") {
      alert("❌ Room introuvable sur la blockchain après plusieurs tentatives. Le Room ID pourrait être incorrect ou il y a un problème de synchronisation blockchain.");
      return;
    }

    if (room.playerBJoined) {
      alert("❌ Cette room est déjà complète.");
      return;
    }

    if (room.playerB.toLowerCase() !== connectedWallet.toLowerCase()) {
      alert("❌ Cette room n'est pas destinée à votre adresse.");
      return;
    }

    // Récupérer automatiquement le montant depuis la blockchain
    const betAmountEth = web3.utils.fromWei(room.betAmount, "ether");
    const amountInWei = room.betAmount; // Utiliser directement le montant en Wei de la room

    const confirmJoin = confirm(`Rejoindre la room ${roomIdInput} avec une mise de ${betAmountEth} ETH ?`);
    if (!confirmJoin) return;

    alert("⏳ Envoi de la mise pour rejoindre la room...");

    // Rejoindre la room sur la blockchain
    await cashPongContract.methods.joinRoom(roomIdInput).send({
      from: connectedWallet,
      value: amountInWei,
      gas: 300000,
      gasPrice: web3.utils.toWei('50', 'gwei')
    });

    // Stocker les informations de la room
    localStorage.setItem("currentRoomId", roomIdInput);
    localStorage.setItem("role", "guest");
    isRoomCreator = false; // User is joining, not creating
    updatePlayButtonForRole(); // Update button appearance
    window.currentRoomId = roomIdInput;
    window.opponentEthAddress = room.playerA;

    alert("✅ Room rejointe avec succès ! La partie peut commencer.");

    // Notify the server that this player has joined the room
    if (socket) {
      socket.emit("playerJoinedRoom", {
        roomId: roomIdInput,
        playerAddress: connectedWallet
      });
      console.log(`📡 Notification envoyée au serveur: joueur ${connectedWallet} a rejoint la room ${roomIdInput}`);
    }

    // Mettre à jour l'interface
    document.getElementById("joinInfo").innerText = `🎮 Room ${roomIdInput} rejointe ! Prêt à jouer.`;
    document.getElementById("playButton").style.display = "block";

    // Cacher les contrôles de création et de jointure
    document.getElementById("peerControls").style.display = "none";
    document.getElementById("joinRoomControls").style.display = "none";

  } catch (err) {
    console.error("❌ Erreur lors de la jointure de la room :", err);
    let errMsg = err?.message || err?.toString();
    if (err?.data?.message) errMsg = err.data.message;
    if (err?.data?.reason) errMsg = err.data.reason;
    alert("❌ Erreur lors de la jointure : " + errMsg);
  }
}

async function onBetButtonClick() {
  const betInput = document.getElementById("betAmount").value;
  const opponentAddress = document.getElementById("otherPeerId").value.trim();
  const betAmount = parseFloat(betInput);

  // Validation des entrées
  if (isNaN(betAmount) || betAmount <= 0) {
    alert("❌ Montant de mise invalide.");
    return;
  }

  if (!web3) {
    alert("❌ Web3 non initialisé. Connectez MetaMask d'abord.");
    return;
  }

  if (!opponentAddress || !web3.utils.isAddress(opponentAddress)) {
    alert("❌ Adresse Ethereum de l'adversaire invalide.");
    return;
  }

  if (!connectedWallet) {
    alert("❌ Connectez votre wallet MetaMask d'abord.");
    return;
  }

  if (opponentAddress.toLowerCase() === connectedWallet.toLowerCase()) {
    alert("❌ Vous ne pouvez pas jouer contre vous-même.");
    return;
  }

  const amountInWei = web3.utils.toWei(betAmount.toString(), "ether");

  try {
    // Vérifier que le contrat est bien initialisé
    if (!cashPongContract) {
      alert("❌ Contrat non initialisé. Connectez MetaMask d'abord.");
      return;
    }

    // Vérifier que l'adresse du contrat est valide
    console.log("🔍 Adresse du contrat :", getContractAddress());
    console.log("🔍 Contrat initialisé :", !!cashPongContract);

    // Tester l'appel au contrat d'abord
    try {
      const owner = await cashPongContract.methods.owner().call();
      console.log("✅ Contrat accessible, owner :", owner);
    } catch (contractError) {
      console.error("❌ Erreur d'accès au contrat :", contractError);
      alert("❌ Le contrat n'est pas accessible à l'adresse " + getContractAddress() + ". Vérifiez le réseau et l'adresse du contrat.");
      return;
    }

    alert("⏳ Création de la room et envoi de la mise...");

    // Appel du contrat smart contract pour créer la room
    const tx = await cashPongContract.methods.createRoom(opponentAddress).send({
      from: connectedWallet,
      value: amountInWei,
      gas: 300000, // Limite de gas
      gasPrice: web3.utils.toWei('50', 'gwei') // Gas price plus élevé pour Polygon
    });

    console.log("✅ Transaction createRoom confirmée :", tx.transactionHash);

    // Récupérer le vrai Room ID depuis les événements de la transaction
    let actualRoomId = null;
    if (tx.events && tx.events.RoomCreated) {
      actualRoomId = tx.events.RoomCreated.returnValues.roomId;
      console.log("🏠 Room ID réel depuis l'événement :", actualRoomId);
    } else {
      // Fallback: écouter les événements blockchain pendant quelques secondes
      console.log("⏳ Recherche du Room ID dans les événements récents...");
      const fromBlock = await web3.eth.getBlockNumber() - 10; // Chercher dans les 10 derniers blocs
      const events = await cashPongContract.getPastEvents('RoomCreated', {
        filter: { playerA: connectedWallet },
        fromBlock: fromBlock,
        toBlock: 'latest'
      });
      
      if (events.length > 0) {
        // Prendre le plus récent
        const latestEvent = events[events.length - 1];
        actualRoomId = latestEvent.returnValues.roomId;
        console.log("🏠 Room ID trouvé dans les événements :", actualRoomId);
      }
    }

    const newRoomId = actualRoomId;
    console.log("🏠 Room ID final utilisé :", newRoomId);

    if (!newRoomId) {
      throw new Error("❌ Impossible de récupérer le Room ID depuis la blockchain");
    }

    // Stocker les informations de la room
    localStorage.setItem("currentRoomId", newRoomId);
    localStorage.setItem("role", "host");
    isRoomCreator = true; // User is the room creator
    updatePlayButtonForRole(); // Update button appearance
    window.currentRoomId = newRoomId;
    window.opponentEthAddress = opponentAddress;

    alert(`✅ Room créée avec succès !\n\n🏠 Room ID : ${newRoomId}\n\nPartagez ce Room ID avec votre adversaire pour qu'il puisse rejoindre !`);

    // Mettre à jour l'interface avec le Room ID bien visible et bouton copier
    document.getElementById("matchInfo").innerHTML = `
      <div style="background: #e8f5e8; padding: 15px; border-radius: 10px; border: 2px solid #4CAF50; margin: 10px 0;">
        <h3 style="color: #4CAF50; margin: 0 0 10px 0;">🎮 Room créée avec succès !</h3>
        <div style="font-size: 18px; font-weight: bold; color: #333; display: flex; align-items: center; gap: 10px;">
          🏠 Room ID : 
          <span id="roomIdDisplay" style="background: #fff; padding: 5px 10px; border-radius: 5px; border: 1px solid #ddd; font-family: monospace;">${newRoomId}</span>
          <button onclick="copyRoomId('${newRoomId}')" style="background: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 14px;">📋 Copier</button>
        </div>
        <div style="margin-top: 10px; color: #666;">
          📋 Partagez ce Room ID avec votre adversaire (${opponentAddress.substring(0,6)}...${opponentAddress.substring(38)})
        </div>
        <div style="margin-top: 10px; color: #666;">
          💰 Mise : ${betAmount} ETH
        </div>
        <div style="margin-top: 10px; color: #888; font-style: italic;">
          ⏳ En attente que l'adversaire rejoigne...
        </div>
      </div>
    `;

    // Cacher les contrôles de création une fois la room créée
    document.getElementById("peerControls").style.display = "none";
    
    document.getElementById("betButton").disabled = true;
    document.getElementById("betButton").innerText = "Room créée";

  } catch (err) {
    console.error("❌ Erreur lors de la création de la room :", err);

    let errMsg = err?.message || err?.toString();
    if (err?.data?.message) errMsg = err.data.message;
    if (err?.data?.reason) errMsg = err.data.reason;

    if (errMsg.includes("revert")) {
      const match = errMsg.match(/revert\s(.*)/);
      const reason = match ? match[1] : null;
      alert("❌ Transaction revert : " + (reason || "Erreur EVM inconnue"));
    } else {
      alert("❌ Erreur lors de la création de la room : " + errMsg);
    }
  }
}

// Rendre la fonction accessible globalement
window.onBetButtonClick = onBetButtonClick;

// === FONCTIONS CHAT ===
let chatOpen = false;
let unreadCount = 0;
const unreadBadge = document.getElementById("unreadBadge");

function toggleChat() {
  const chatWindow = document.getElementById("chatWindow");
  if (chatWindow.style.display === "none" || chatWindow.style.display === "") {
    chatWindow.style.display = "flex";
    chatOpen = true;
    unreadCount = 0;
    updateUnreadBadge();
  } else {
    chatWindow.style.display = "none";
    chatOpen = false;
  }
}

function updateUnreadBadge() {
  if (unreadCount > 0 && !chatOpen) {
    unreadBadge.style.display = "inline";
    unreadBadge.textContent = unreadCount;
  } else {
    unreadBadge.style.display = "none";
  }
}

function onNewMessage(message) {
  console.log("🔍 [DEBUG] onNewMessage called with:", message);
  console.trace("🔍 [DEBUG] Call stack:");
  
  const chatBox = document.getElementById("chatBox");
  const msgDiv = document.createElement("div");
  msgDiv.textContent = message;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (!chatOpen) {
    unreadCount++;
    updateUnreadBadge();
  }
}

// Global sendMessage function to prevent duplicates
window.sendMessage = function() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  // Prevent rapid multiple sends
  if (window.lastMessageTime && Date.now() - window.lastMessageTime < 1000) {
    console.log('🚫 Message blocked - too soon after last message');
    return; // Ignore if less than 1000ms since last message
  }
  
  // Check if this exact message was just sent
  if (window.lastMessageSent === message && Date.now() - window.lastMessageTime < 5000) {
    console.log('🚫 Duplicate message blocked');
    return;
  }
  
  window.lastMessageTime = Date.now();
  window.lastMessageSent = message;

  console.log(`📤 Sending message: "${message}"`);
  
  socket.emit("sendChatMessage", {
    username: window.currentUsername,
    message: message,
  });

  input.value = "";
}

// === BOUCLE PRINCIPALE ===
setInterval(() => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBall();
  drawPaddle(leftPaddle);
  drawPaddle(rightPaddle);
  drawScores();
  drawCountdown();
  
  // SERVER-AUTHORITATIVE MODE: Only render, don't update physics
  if (isServerGame) {
    // Server handles all physics - client just renders
    return;
  }
  
  // LEGACY MODE: Client-side physics (solo game or old P2P)
  moveBall();
  movePaddles();

  if (!isHost && isConnected) {
    // Send paddle movement to opponent (use ETH address for targeting)
    socket.emit("event", {
      type: "paddleMove",
      from: connectedWallet?.toLowerCase() || currentUsername,
      to: window.opponentEthAddress?.toLowerCase() || opponentUsername?.toLowerCase(),
      y: leftPaddle.y
    });
  }
  syncHost();
}, 1000 / 60);

// === ÉVÉNEMENTS CLAVIER ===
document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);

window.addEventListener("keydown", function(e) {
  const keysToBlock = ["ArrowUp", "ArrowDown"];
  if (keysToBlock.includes(e.key)) {
    e.preventDefault();
  }
}, { passive: false });

// === INITIALISATION ===

async function handleVoluntaryDisconnect() {
  try {
    console.log("⚠️ Déconnexion volontaire détectée...");
    const roomId = window.currentRoomId;

    if (!roomId || !cashPongContract) return;

    const tx = await cashPongContract.methods.claimVictoryByForfeit(roomId).send({ from: connectedWallet });
    console.log("✅ Victoire par forfait envoyée :", tx.transactionHash);
  } catch (error) {
    console.error("❌ Échec du forfait :", error.message);
  }
}

function startInactivityMonitor() {
  let lastActivity = Date.now();

   const warningThreshold = 5 * 60 * 1000;  // ⚠️ 5 minutes d'inactivité (warning)
  const forfeitThreshold = 10 * 60 * 1000; // ❌ 10 minutes d'inactivité (forfeit)

  const resetTimer = () => {
    lastActivity = Date.now();
  };

  ['mousemove', 'keydown', 'click'].forEach(event => {
    window.addEventListener(event, resetTimer);
  });

  const checkInactivity = async () => {
    if (!window.currentRoomId || gameOver) return;

    const now = Date.now();
    const inactiveTime = now - lastActivity;

    if (inactiveTime > forfeitThreshold) {
      console.warn("⏱️ Forfait automatique : plus de 10 minutes d'inactivité");
      await handleVoluntaryDisconnect();
      return;
    }

    if (inactiveTime > warningThreshold) {
      this.logTransaction("⚠️ WARNING: 5+ minutes inactive (forfeit at 10 min)")
      document.title = "⚠️ INACTIF - Risque de Forfait";
    }

    setTimeout(checkInactivity, 30 * 1000); // vérifie toutes les 30 secondes
  };

  setTimeout(checkInactivity, 30 * 1000);
}




// ✅ Initialiser dès le chargement
if (!window.lastActivityTime) window.lastActivityTime = Date.now();

// 🔄 Mettre à jour l'activité à chaque interaction
const updateActivity = () => {
  window.lastActivityTime = Date.now();
};

['mousemove', 'keydown', 'click'].forEach(event => {
  window.addEventListener(event, updateActivity);
});

// ⏱️ Surveillance de l'inactivité (DÉSACTIVÉ - causait des erreurs MetaMask)
function startAutoForfeitMonitor() {
  console.log("ℹ️ Forfait automatique d'inactivité DÉSACTIVÉ pour éviter les erreurs MetaMask");
  console.log("ℹ️ Les joueurs doivent réclamer manuellement la victoire après 60 secondes");
  
  console.log("ℹ️ Système de forfait simplifié :");
  console.log("ℹ️ - Quit immédiat → voluntaryForfeit automatique");
  console.log("ℹ️ - Inactivité → réclamation manuelle après 60s depuis affichage du bouton");
  
  // Tracker le moment où le bouton de réclamation devient visible
  window.claimButtonShownAt = null;
  
  // Surveillance basée sur l'inactivité frontend (pas blockchain)
  setInterval(async () => {
    // Vérifier seulement si on est dans une room active et que les contrôles sont visibles
    const claimControls = document.getElementById("claimVictoryControls");
    if (!window.currentRoomId || 
        typeof gameOver !== 'undefined' && gameOver === true ||
        !claimControls || 
        claimControls.style.display === "none") {
      return;
    }

    try {
      // Si c'est la première fois qu'on voit le bouton, enregistrer le timestamp
      if (!window.claimButtonShownAt) {
        window.claimButtonShownAt = Date.now();
        console.log("⏰ [MONITOR] Bouton de réclamation affiché - début du compte à rebours de 60s");
      }
      
      const now = Date.now();
      const timeSinceButtonShown = Math.floor((now - window.claimButtonShownAt) / 1000);
      
      // Mettre à jour le compte à rebours en temps réel
      const matchInfo = document.getElementById("matchInfo");
      if (timeSinceButtonShown >= 60) {
        // Prêt à réclamer
        if (matchInfo) {
          matchInfo.innerText = `✅ 60 secondes écoulées depuis quit adversaire - Réclamez maintenant !`;
          matchInfo.style.color = "green";
        }
        
        const claimButton = document.getElementById("claimVictoryButton");
        if (claimButton) {
          claimButton.disabled = false;
          claimButton.style.backgroundColor = "#4CAF50";
        }
        
      } else {
        // Compte à rebours
        const remaining = 60 - timeSinceButtonShown;
        if (matchInfo) {
          matchInfo.innerText = `⏰ Attendre encore ${remaining}s depuis quit adversaire pour réclamer`;
          matchInfo.style.color = "orange";
        }
        
        const claimButton = document.getElementById("claimVictoryButton");
        if (claimButton) {
          claimButton.disabled = true;
          claimButton.style.backgroundColor = "#ccc";
        }
      }
      
    } catch (err) {
      console.error("❌ [MONITOR] Erreur lors de la vérification:", err);
    }
  }, 1 * 1000); // Vérifie toutes les 1 seconde pour un compte à rebours précis
}

// ▶️ Lancer la surveillance après chargement
window.addEventListener("load", () => {
  startAutoForfeitMonitor();
});


window.onload = async function () {
  startInactivityMonitor();
  document.getElementById("leaveMatchBtn").style.display = "none";
  
  // Restore room creator status from localStorage
  const currentRoomId = localStorage.getItem("currentRoomId");
  const role = localStorage.getItem("role");
  
  if (currentRoomId && role) {
    isRoomCreator = (role === "host");
    updatePlayButtonForRole();
    console.log(`🔄 Room status restored: RoomID=${currentRoomId}, Role=${role}, IsCreator=${isRoomCreator}`);
  }
  
  // Set up chat event listeners
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  const chatInput = document.getElementById('chatInput');
  
  if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', window.sendMessage);
    console.log('✅ Chat send button event listener added');
  }
  
  if (chatInput) {
    chatInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        window.sendMessage();
      }
    });
    console.log('✅ Chat input enter key listener added');
  }

  // Set up claim victory button event listener
  const claimVictoryBtn = document.getElementById('claimVictoryButton');
  if (claimVictoryBtn) {
    claimVictoryBtn.addEventListener('click', claimVictoryManually);
    console.log('✅ Claim victory button event listener added');
  }
  
  // Check MetaMask availability immediately
  checkMetaMaskOnLoad();
  
  // Initialiser Web3 automatiquement si MetaMask est disponible
  if (typeof window.ethereum !== 'undefined') {
    try {
      console.log("🔄 Initialisation automatique de Web3...");
      await initWeb3();
      console.log("✅ Web3 initialisé automatiquement");
    } catch (error) {
      console.warn("⚠️ Échec de l'initialisation automatique de Web3:", error.message);
    }
  }

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      window.currentUsername = user.displayName || user.email.split("@")[0];

      opponentUsername = null;
      isConnected = false;
      isHost = false;

      document.getElementById("peerIdDisplay").innerText =
        `🟢 Connecte toi à ton compte : ${window.currentUsername}`;

      document.getElementById("authSection").style.display = "flex";
      document.getElementById("createAccountSection").style.display = "none";
      document.getElementById("peerControls").style.display = "flex";

      if (!isConnected) {
        document.getElementById("playButton").style.display = "block";
      }

      document.getElementById("leaveMatchBtn").style.display = "none";

      connectToSocketServer(window.currentUsername);
    } else {
      document.getElementById("peerIdDisplay").innerText = "Non connecté";

      document.getElementById("authSection").style.display = "flex";
      document.getElementById("createAccountSection").style.display = "none";
      document.getElementById("peerControls").style.display = "none";

      document.getElementById("leaveMatchBtn").style.display = "none";

      document.getElementById("playButton").style.display = "block";
    }
  });

  document.getElementById("resetGameBtn").style.display = "none";
};

window.addEventListener("beforeunload", () => {
  if (isConnected) {
    const type = "leftMatch";
    socket.emit("event", {
      type,
      from: currentUsername,
      to: opponentUsername
    });

    isConnected = false;
    isHost = false;
    opponentUsername = null;
    gameOver = false;
    matchStarted = false;

    resetGame(false);
  }
});

// Initialisation différée pour permettre à MetaMask de se charger
setTimeout(() => {
  console.log("🔍 Vérification de MetaMask...");
  if (typeof window.ethereum !== "undefined") {
    console.log("✅ MetaMask détecté");
  } else {
    console.warn("⚠️ MetaMask non détecté - affichage du guide d'installation");
    checkMetaMaskOnLoad();
  }
}, 1000);

// === POLYGON MAINNET CONFIG ===
// Note: POLYGON_CHAIN_ID and POLYGON_PARAMS are declared globally in event-handlers.js

// Helper to force Polygon Mainnet in MetaMask
async function forcePolygonMainnet() {
  if (typeof window.ethereum === "undefined") return false;
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId !== (window.POLYGON_CHAIN_ID || "0x89")) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [window.POLYGON_PARAMS]
      });
      // Switch after adding
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: window.POLYGON_CHAIN_ID || "0x89" }]
      });
    }
    return true;
  } catch (err) {
    alert("❌ Impossible de passer sur Polygon Mainnet : " + err.message);
    return false;
  }
}

// Test function to verify contract connectivity
async function testContractConnection() {
  try {
    console.log("🧪 Testing contract connection...");
    console.log("Contract address:", getContractAddress());
    console.log("Connected wallet:", connectedWallet);
    
    // Test by getting the room counter
    const roomCounter = await cashPongContract.methods.roomCounter().call();
    console.log("✅ Contract connection successful! Current room counter:", roomCounter);
    
    alert(`✅ Contract connected! Latest room ID: ${roomCounter}`);
    return true;
  } catch (error) {
    console.error("❌ Contract connection test failed:", error);
    alert("❌ Contract connection failed: " + error.message);
    return false;
  }
}