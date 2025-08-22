const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: process.env.NODE_ENV === 'production' ? ["https://yourproductiondomain.com"] : "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const Web3 = require("web3");
const wsProvider = new Web3.providers.WebsocketProvider(
  process.env.ALCHEMY_WS_URL || "wss://polygon-mainnet.g.alchemy.com/v2/g0-uG5oc0RLGLTWHL5501"
);

// Enhanced WebSocket error handling
wsProvider.on('error', (error) => {
  console.error('🚨 WebSocket Provider Error:', error);
});

wsProvider.on('end', () => {
  console.warn('⚠️ WebSocket connection ended, attempting to reconnect...');
  setTimeout(() => {
    wsProvider.reconnect();
  }, 5000);
});

const web3 = new Web3(wsProvider);

// ⚙️ Adresse de ton contrat + ABI (UPDATED - Fixed Contract)
const contractAddress = "0xdb51573EeBE611CEA7e31F0FE2A92Cbb7929b896";

// SYSTÈME MULTIJOUEUR COMPLET ET STABLE
class MultiplayerGameServer {
  constructor() {
    // Gestion des utilisateurs connectés
    this.connectedUsers = new Map(); // socketId -> User object
    this.usersByAddress = new Map(); // ethAddress -> User object
    this.usersByUsername = new Map(); // username -> User object
    
    // Gestion des salles de jeu
    this.gameRooms = new Map(); // roomId -> Room object
    this.pendingInvitations = new Map(); // invitationId -> Invitation object
    
    // Gestion des parties en cours
    this.activeMatches = new Map(); // roomId -> Match object
    
    // Statistiques et métriques
    this.connectionStats = {
      totalConnections: 0,
      activeUsers: 0,
      activeMatches: 0,
      totalMatches: 0
    };
    
    this.init();
  }
  
  init() {
    console.log("🚀 Initializing Multiplayer Game Server...");
    this.setupContractEvents();
    this.startHeartbeat();
    console.log("✅ Multiplayer Game Server initialized successfully");
  }
  
  // Gestion des utilisateurs
  registerUser(socket, userData) {
    const { username, ethAddress, role } = userData;
    
    if (!this.isValidEthAddress(ethAddress)) {
      socket.emit("error", { message: "Invalid Ethereum address" });
      return false;
    }
    
    // Nettoyer les connexions précédentes
    this.cleanupPreviousConnections(username, ethAddress);
    
    const user = {
      socketId: socket.id,
      socket: socket,
      username: username.toLowerCase(),
      ethAddress: ethAddress.toLowerCase(),
      role: role || 'player',
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      currentRoomId: null,
      isInMatch: false,
      matchStats: {
        wins: 0,
        losses: 0,
        totalGames: 0
      }
    };
    
    // Enregistrer l'utilisateur dans toutes les maps
    this.connectedUsers.set(socket.id, user);
    this.usersByAddress.set(ethAddress.toLowerCase(), user);
    this.usersByUsername.set(username.toLowerCase(), user);
    
    // Configurer les références sur la socket
    socket.username = username.toLowerCase();
    socket.ethAddress = ethAddress.toLowerCase();
    socket.user = user;
    
    this.connectionStats.activeUsers = this.connectedUsers.size;
    this.connectionStats.totalConnections++;
    
    console.log(`✅ User registered: ${username} (${ethAddress}) - Total users: ${this.connectedUsers.size}`);
    
    // Envoyer la confirmation à l'utilisateur
    socket.emit("registrationConfirmed", {
      username: username,
      ethAddress: ethAddress,
      activeUsers: this.connectedUsers.size
    });
    
    return true;
  }
  
  unregisterUser(socketId) {
    const user = this.connectedUsers.get(socketId);
    if (!user) return;
    
    console.log(`🔌 Unregistering user: ${user.username} (${user.ethAddress})`);
    
    // Si l'utilisateur était dans une partie, gérer la déconnexion
    if (user.currentRoomId) {
      this.handlePlayerDisconnection(user);
    }
    
    // Supprimer de toutes les maps
    this.connectedUsers.delete(socketId);
    this.usersByAddress.delete(user.ethAddress);
    this.usersByUsername.delete(user.username);
    
    this.connectionStats.activeUsers = this.connectedUsers.size;
    
    console.log(`🧹 User unregistered: ${user.username} - Remaining users: ${this.connectedUsers.size}`);
  }
  
  cleanupPreviousConnections(username, ethAddress) {
    const normalizedUsername = username.toLowerCase();
    const normalizedAddress = ethAddress.toLowerCase();
    
    // Vérifier et nettoyer les connexions précédentes par username
    const existingUserByUsername = this.usersByUsername.get(normalizedUsername);
    if (existingUserByUsername) {
      console.log(`🧹 Cleaning up previous connection for username: ${normalizedUsername}`);
      existingUserByUsername.socket.emit("duplicateConnection", {
        message: "Une nouvelle session a été ouverte avec vos identifiants."
      });
      existingUserByUsername.socket.disconnect(true);
      this.unregisterUser(existingUserByUsername.socketId);
    }
    
    // Vérifier et nettoyer les connexions précédentes par address
    const existingUserByAddress = this.usersByAddress.get(normalizedAddress);
    if (existingUserByAddress) {
      console.log(`🧹 Cleaning up previous connection for address: ${normalizedAddress}`);
      existingUserByAddress.socket.emit("duplicateConnection", {
        message: "Une nouvelle session a été ouverte avec cette adresse."
      });
      existingUserByAddress.socket.disconnect(true);
      this.unregisterUser(existingUserByAddress.socketId);
    }
  }
  
  // Gestion des salles de jeu
  createGameRoom(roomData) {
    const { roomId, playerA, playerB, betAmount } = roomData;
    
    const room = {
      roomId: roomId,
      playerA: playerA.toLowerCase(),
      playerB: playerB.toLowerCase(),
      betAmount: betAmount,
      createdAt: Date.now(),
      isActive: false,
      playersJoined: 0,
      gameState: {
        scores: { playerA: 0, playerB: 0 },
        ballPosition: { x: 400, y: 200 },
        paddlePositions: {
          playerA: { y: 162.5 },
          playerB: { y: 162.5 }
        },
        gameStarted: false,
        lastUpdate: Date.now()
      }
    };
    
    this.gameRooms.set(roomId, room);
    console.log(`🏠 Game room created: ${roomId} (${playerA} vs ${playerB}) - Players must join manually`);
    
    // Ne plus ajouter automatiquement les joueurs - ils doivent rejoindre manuellement
    // this.addPlayerToRoom(roomId, playerA);
    // this.addPlayerToRoom(roomId, playerB);
    
    return room;
  }
  
  addPlayerToRoom(roomId, playerAddress) {
    const user = this.usersByAddress.get(playerAddress.toLowerCase());
    const room = this.gameRooms.get(roomId);
    
    if (!user || !room) {
      console.warn(`❌ Cannot add player to room: user=${!!user}, room=${!!room}`);
      return false;
    }
    
    // Joindre la socket à la room Socket.IO
    user.socket.join(roomId);
    user.currentRoomId = roomId;
    room.playersJoined++;
    
    // Notifier le joueur
    user.socket.emit("roomJoined", {
      roomId: roomId,
      playerAddress: playerAddress,
      opponent: playerAddress === room.playerA ? room.playerB : room.playerA,
      betAmount: room.betAmount
    });
    
    console.log(`✅ Player ${user.username} joined room ${roomId} (${room.playersJoined}/2)`);
    
    // Notifier l'autre joueur qu'un adversaire a rejoint
    if (room.playersJoined === 2) {
      // Identifier qui est l'hôte (le premier joueur) et qui est l'invité
      const hostAddress = room.playerA;
      const guestAddress = room.playerB;
      const hostUser = this.usersByAddress.get(hostAddress);
      const guestUser = this.usersByAddress.get(guestAddress);
      
      if (hostUser && guestUser) {
        // Notifier l'hôte que l'adversaire a rejoint
        hostUser.socket.emit("opponentJoinedRoom", {
          opponentAddress: guestAddress,
          opponentUsername: guestUser.username,
          roomId: roomId
        });
        
        console.log(`👥 Notified host ${hostUser.username} that opponent ${guestUser.username} joined room ${roomId}`);
      }
    }
    
    // Si les deux joueurs ont rejoint, démarrer la partie
    if (room.playersJoined === 2) {
      this.startMatch(roomId);
    }
    
    return true;
  }
  
  // Gestion des parties
  startMatch(roomId) {
    const room = this.gameRooms.get(roomId);
    if (!room) return;
    
    room.isActive = true;
    room.gameState.gameStarted = true;
    room.gameState.lastUpdate = Date.now();
    
    // Créer l'objet match
    const match = {
      roomId: roomId,
      players: [room.playerA, room.playerB],
      startTime: Date.now(),
      gameState: room.gameState,
      lastSync: Date.now()
    };
    
    this.activeMatches.set(roomId, match);
    this.connectionStats.activeMatches = this.activeMatches.size;
    this.connectionStats.totalMatches++;
    
    console.log(`🎮 Match started in room ${roomId} - Notifying all players...`);
    
    // CORRECTION : Notifier tous les joueurs individuellement et collectivement
    const playerAUser = this.usersByAddress.get(room.playerA);
    const playerBUser = this.usersByAddress.get(room.playerB);
    
    const matchStartData = {
      roomId: roomId,
      gameState: room.gameState,
      players: {
        playerA: room.playerA,
        playerB: room.playerB
      },
      betAmount: room.betAmount,
      message: "La partie commence ! Bonne chance !",
      startTime: Date.now(),
      autoStart: true // Signal pour démarrage automatique
    };
    
    // Notifier via Socket.IO room (diffusion)
    io.to(roomId).emit("matchStarted", matchStartData);
    
    // NOUVEAU : Notifier individuellement chaque joueur
    if (playerAUser) {
      playerAUser.socket.emit("gameAutoStart", {
        ...matchStartData,
        yourRole: 'playerA',
        opponent: room.playerB,
        opponentUsername: playerBUser?.username || 'Adversaire'
      });
      console.log(`📤 Game auto-start sent to ${playerAUser.username} (PlayerA)`);
    }
    
    if (playerBUser) {
      playerBUser.socket.emit("gameAutoStart", {
        ...matchStartData,
        yourRole: 'playerB', 
        opponent: room.playerA,
        opponentUsername: playerAUser?.username || 'Adversaire'
      });
      console.log(`📤 Game auto-start sent to ${playerBUser.username} (PlayerB)`);
    }
    
    // NOUVEAU : Envoyer signal de démarrage après un petit délai pour s'assurer que tout est prêt
    setTimeout(() => {
      io.to(roomId).emit("startGameNow", {
        roomId: roomId,
        countdown: 3,
        message: "Démarrage automatique dans 3... 2... 1..."
      });
      console.log(`⏰ Countdown started for room ${roomId}`);
      
      // Démarrage final après countdown
      setTimeout(() => {
        io.to(roomId).emit("gameStartCountdownFinished", {
          roomId: roomId,
          message: "🎮 GO ! La partie commence !"
        });
        console.log(`🚀 Game officially started for room ${roomId}`);
      }, 3000);
    }, 1000);
    
    console.log(`🎮 Match started in room ${roomId}`);
  }
  
  // Synchronisation en temps réel
  syncGameState(roomId, playerAddress, gameData) {
    const room = this.gameRooms.get(roomId);
    const match = this.activeMatches.get(roomId);
    
    if (!room || !match || !room.isActive) return;
    
    // Mettre à jour l'état du jeu
    if (gameData.paddlePosition) {
      const isPlayerA = playerAddress.toLowerCase() === room.playerA;
      const playerKey = isPlayerA ? 'playerA' : 'playerB';
      room.gameState.paddlePositions[playerKey] = gameData.paddlePosition;
    }
    
    if (gameData.ballPosition) {
      room.gameState.ballPosition = gameData.ballPosition;
    }
    
    if (gameData.scores) {
      room.gameState.scores = gameData.scores;
    }
    
    room.gameState.lastUpdate = Date.now();
    match.lastSync = Date.now();
    
    // Diffuser l'état aux autres joueurs de la salle
    const user = this.usersByAddress.get(playerAddress.toLowerCase());
    if (user) {
      user.socket.to(roomId).emit("gameStateUpdate", {
        roomId: roomId,
        gameState: room.gameState,
        from: playerAddress
      });
    }
  }
  
  // Gestion des événements de jeu
  handleGameEvent(roomId, playerAddress, eventData) {
    const room = this.gameRooms.get(roomId);
    if (!room || !room.isActive) return;
    
    const user = this.usersByAddress.get(playerAddress.toLowerCase());
    if (!user) return;
    
    // Valider et traiter l'événement
    switch (eventData.type) {
      case 'paddleMove':
        this.syncGameState(roomId, playerAddress, { paddlePosition: eventData.position });
        break;
        
      case 'ballUpdate':
        this.syncGameState(roomId, playerAddress, { ballPosition: eventData.position });
        break;
        
      case 'scoreUpdate':
        this.syncGameState(roomId, playerAddress, { scores: eventData.scores });
        break;
        
      case 'gameEnd':
        this.endMatch(roomId, eventData.winner);
        break;
        
      default:
        // Transmettre l'événement aux autres joueurs
        user.socket.to(roomId).emit("gameEvent", {
          roomId: roomId,
          from: playerAddress,
          event: eventData
        });
    }
  }
  
  endMatch(roomId, winner) {
    const room = this.gameRooms.get(roomId);
    const match = this.activeMatches.get(roomId);
    
    if (!room || !match) return;
    
    room.isActive = false;
    room.gameState.gameStarted = false;
    
    // Mettre à jour les statistiques des joueurs
    const winnerUser = this.usersByAddress.get(winner.toLowerCase());
    const loserAddress = winner.toLowerCase() === room.playerA ? room.playerB : room.playerA;
    const loserUser = this.usersByAddress.get(loserAddress);
    
    if (winnerUser) {
      winnerUser.matchStats.wins++;
      winnerUser.matchStats.totalGames++;
    }
    
    if (loserUser) {
      loserUser.matchStats.losses++;
      loserUser.matchStats.totalGames++;
    }
    
    // Notifier tous les joueurs
    io.to(roomId).emit("matchEnded", {
      roomId: roomId,
      winner: winner,
      duration: Date.now() - match.startTime,
      finalScores: room.gameState.scores
    });
    
    // Nettoyer
    this.activeMatches.delete(roomId);
    this.connectionStats.activeMatches = this.activeMatches.size;
    
    console.log(`🏁 Match ended in room ${roomId}, winner: ${winner}`);
  }
  
  // Gestion des déconnexions
  handlePlayerDisconnection(user) {
    if (!user.currentRoomId) return;
    
    const room = this.gameRooms.get(user.currentRoomId);
    if (!room) return;
    
    console.log(`🚨 Player ${user.username} disconnected from room ${user.currentRoomId}`);
    
    // Notifier l'adversaire
    const opponentAddress = user.ethAddress === room.playerA ? room.playerB : room.playerA;
    const opponent = this.usersByAddress.get(opponentAddress);
    
    if (opponent) {
      opponent.socket.emit("opponentDisconnected", {
        roomId: user.currentRoomId,
        message: "Votre adversaire s'est déconnecté. Vous pouvez réclamer la victoire."
      });
    }
    
    // Marquer la salle comme inactive si une partie était en cours
    if (room.isActive) {
      room.isActive = false;
      this.activeMatches.delete(user.currentRoomId);
      this.connectionStats.activeMatches = this.activeMatches.size;
    }
  }
  
  // Utilitaires
  isValidEthAddress(address) {
    return typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  getUserByAddress(address) {
    return this.usersByAddress.get(address.toLowerCase());
  }
  
  getUserByUsername(username) {
    if (!username) return null;
    return this.usersByUsername.get(username.toLowerCase());
  }
  
  getUserBySocketId(socketId) {
    return this.connectedUsers.get(socketId);
  }
  
  // Heartbeat pour maintenir les connexions
  startHeartbeat() {
    setInterval(() => {
      this.checkConnections();
      this.broadcastServerStats();
    }, 30000); // Toutes les 30 secondes
  }
  
  checkConnections() {
    const now = Date.now();
    const timeoutThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [socketId, user] of this.connectedUsers) {
      if (now - user.lastActivity > timeoutThreshold) {
        console.log(`⚠️ User ${user.username} appears inactive, checking connection...`);
        user.socket.emit("ping");
      }
    }
  }
  
  broadcastServerStats() {
    const stats = {
      ...this.connectionStats,
      activeRooms: this.gameRooms.size,
      timestamp: Date.now()
    };
    
    io.emit("serverStats", stats);
  }
  
  setupContractEvents() {
    // Les événements du contrat seront configurés avec l'ABI
    console.log("📋 Contract events will be setup with ABI");
  }
}

// Créer une instance globale du serveur multijoueur
const gameServer = new MultiplayerGameServer();

// ABI du contrat (version simplifiée pour la compatibilité)
const contractABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "roomId", "type": "uint256"},
      {"indexed": false, "internalType": "address", "name": "playerA", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "playerB", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "betAmount", "type": "uint256"}
    ],
    "name": "RoomCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "roomId", "type": "uint256"},
      {"indexed": false, "internalType": "address", "name": "player", "type": "address"}
    ],
    "name": "PlayerJoined",
    "type": "event"
  }
];

const cashPongContract = new web3.eth.Contract(contractABI, contractAddress);

// Configuration des middlewares Express
app.use(express.static(__dirname));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "cashpong-multiplayer.html"));
});

// Écoute des événements blockchain (intégré au système multijoueur)
cashPongContract.events.RoomCreated()
  .on("data", (event) => {
    console.log("🚨 Nouvel événement RoomCreated détecté :", event.returnValues);
    const { roomId, playerA, playerB, betAmount } = event.returnValues;
    
    // Créer la salle dans le système multijoueur (sans ajouter automatiquement les joueurs)
    gameServer.createGameRoom({
      roomId: roomId,
      playerA: playerA,
      playerB: playerB,
      betAmount: betAmount
    });
    
    // Notifier les joueurs qu'une salle est disponible
    const userA = gameServer.getUserByAddress(playerA);
    const userB = gameServer.getUserByAddress(playerB);
    
    // Le créateur (playerA) rejoint automatiquement sa propre room
    if (userA) {
      const joinedA = gameServer.addPlayerToRoom(roomId, playerA);
      if (joinedA) {
        console.log(`✅ Créateur ${userA.username} a automatiquement rejoint sa room ${roomId}`);
        userA.socket.emit("roomCreatorJoined", {
          roomId: roomId,
          opponent: playerB,
          betAmount: betAmount,
          message: "Vous avez créé et rejoint la room. En attente de l'adversaire..."
        });
      }
    } else {
      console.log(`❌ Créateur (${playerA}) non connecté - auto-join impossible`);
    }
    
    // L'adversaire (playerB) reçoit une notification pour rejoindre manuellement
    if (userB) {
      userB.socket.emit("roomAvailable", {
        roomId: roomId,
        opponent: playerA,
        betAmount: betAmount,
        message: "Une salle de jeu a été créée pour vous. Cliquez pour rejoindre."
      });
      console.log(`📤 Notification roomAvailable envoyée à ${userB.username} pour la salle ${roomId}`);
    } else {
      console.log(`❌ Adversaire (${playerB}) non connecté - notification non envoyée`);
    }
    
    // Diffusion globale (optionnel)
    io.emit("blockchainRoomCreated", { roomId, playerA, playerB, betAmount });
  })
  .on("error", console.error);

// Configuration des connexions Socket.IO avec le nouveau système
io.on("connection", (socket) => {
  console.log(`🟢 Nouvelle connexion : ${socket.id}`);
  
  // === ENREGISTREMENT DES UTILISATEURS ===
  socket.on("register", (userData) => {
    const success = gameServer.registerUser(socket, userData);
    if (success) {
      console.log(`✅ Utilisateur enregistré avec succès : ${userData.username}`);
    }
  });
  
  // === SYNCHRONISATION EN TEMPS RÉEL ===
  socket.on("sync", (data) => {
    const user = gameServer.getUserBySocketId(socket.id);
    if (!user) {
      socket.emit("error", { message: "Utilisateur non enregistré" });
      return;
    }
    
    // Mise à jour de l'activité
    user.lastActivity = Date.now();
    
    // Trouver le destinataire
    const targetUser = gameServer.getUserByAddress(data.to) || 
                      (data.toUsername ? gameServer.getUserByUsername(data.toUsername) : null);
    
    if (targetUser) {
      targetUser.socket.emit("sync", {
        ...data,
        from: user.ethAddress,
        fromUsername: user.username,
        timestamp: Date.now()
      });
    } else {
      socket.emit("syncFailed", {
        to: data.to,
        message: "Destinataire introuvable"
      });
    }
  });
  
  // === GESTION DES ÉVÉNEMENTS DE JEU ===
  socket.on("gameEvent", (eventData) => {
    const user = gameServer.getUserBySocketId(socket.id);
    if (!user || !user.currentRoomId) {
      socket.emit("error", { message: "Pas dans une salle de jeu" });
      return;
    }
    
    user.lastActivity = Date.now();
    gameServer.handleGameEvent(user.currentRoomId, user.ethAddress, eventData);
  });
  
  // === NOUVEAU : SIGNAL DE PRÊT POUR DÉMARRAGE ===
  socket.on("playerReady", (data) => {
    const user = gameServer.getUserBySocketId(socket.id);
    if (!user || !user.currentRoomId) return;
    
    console.log(`✅ Player ${user.username} is ready in room ${user.currentRoomId}`);
    
    // Notifier l'autre joueur
    socket.to(user.currentRoomId).emit("opponentReady", {
      playerAddress: user.ethAddress,
      username: user.username,
      message: `${user.username} est prêt !`
    });
    
    // Vérifier si les deux joueurs sont prêts
    const room = gameServer.gameRooms.get(user.currentRoomId);
    if (room && room.playersJoined === 2) {
      // Les deux joueurs sont connectés, on peut forcer le démarrage
      io.to(user.currentRoomId).emit("bothPlayersReady", {
        roomId: user.currentRoomId,
        message: "Les deux joueurs sont prêts ! Démarrage immédiat..."
      });
    }
  });
  
  // === NOUVEAU : SYNCHRONISATION DE DÉMARRAGE ===
  socket.on("requestGameStart", (data) => {
    const user = gameServer.getUserBySocketId(socket.id);
    if (!user || !user.currentRoomId) return;
    
    console.log(`🎮 ${user.username} requests game start for room ${user.currentRoomId}`);
    
    // Forcer le démarrage pour tous les joueurs de la room
    io.to(user.currentRoomId).emit("forceGameStart", {
      roomId: user.currentRoomId,
      initiatedBy: user.username,
      message: "Démarrage forcé de la partie !"
    });
  });
  
  // === MISE À JOUR DE L'ÉTAT DU JEU ===
  socket.on("gameStateUpdate", (gameData) => {
    const user = gameServer.getUserBySocketId(socket.id);
    if (!user || !user.currentRoomId) return;
    
    user.lastActivity = Date.now();
    gameServer.syncGameState(user.currentRoomId, user.ethAddress, gameData);
  });
  
  // === GESTION DES MOUVEMENTS DE RAQUETTE ===
  // Throttling pour les paddleMove - max 60 FPS
  const paddleMoveThrottle = new Map();
  const PADDLE_MOVE_INTERVAL = 16; // ~60 FPS (1000ms / 60 = 16.67ms)
  
  socket.on("paddleMove", (moveData) => {
    const user = gameServer.getUserBySocketId(socket.id);
    if (!user || !user.currentRoomId) return;
    
    const now = Date.now();
    const lastMove = paddleMoveThrottle.get(socket.id) || 0;
    
    // Throttling - seulement si assez de temps s'est écoulé
    if (now - lastMove < PADDLE_MOVE_INTERVAL) {
      return; // Skip cet événement
    }
    
    paddleMoveThrottle.set(socket.id, now);
    user.lastActivity = now;
    
    // Diffuser immédiatement aux autres joueurs de la salle
    socket.to(user.currentRoomId).emit("paddleMove", {
      player: user.ethAddress,
      position: moveData.position,
      timestamp: now
    });
    
    // Log moins fréquent (1% seulement)
    if (Math.random() < 0.01) {
      console.log(`📤 Événement paddleMove transmis`);
    }
  });
  
  // === CRÉATION DE SALLE (DEPUIS LE FRONTEND) ===
  socket.on("roomCreated", (roomData) => {
    const user = gameServer.getUserBySocketId(socket.id);
    if (!user) return;
    
    console.log("🏠 Notification de création de salle reçue :", roomData);
    
    // Trouver l'adversaire et lui envoyer l'invitation
    const opponent = gameServer.getUserByAddress(roomData.opponentAddress);
    if (opponent) {
      opponent.socket.emit("roomInvitation", {
        roomId: roomData.roomId,
        creatorUsername: user.username,
        creatorAddress: user.ethAddress,
        betAmount: roomData.betAmount,
        message: `${user.username} vous invite à rejoindre une partie avec une mise de ${roomData.betAmount} ETH`
      });
      
      console.log(`📤 Invitation envoyée à ${opponent.username} pour la salle ${roomData.roomId}`);
    } else {
      socket.emit("opponentNotFound", {
        opponentAddress: roomData.opponentAddress,
        message: "L'adversaire n'est pas connecté actuellement"
      });
    }
  });
  
  // === REJOINDRE UNE SALLE MANUELLEMENT ===
  socket.on("joinRoom", (data) => {
    const user = gameServer.getUserBySocketId(socket.id);
    if (!user) {
      socket.emit("joinRoomError", { message: "Utilisateur non trouvé" });
      return;
    }
    
    const { roomId } = data;
    const room = gameServer.gameRooms.get(roomId);
    
    if (!room) {
      socket.emit("joinRoomError", { message: "Salle non trouvée" });
      return;
    }
    
    // Vérifier que ce joueur est autorisé à rejoindre cette salle
    const playerAddress = user.ethAddress.toLowerCase();
    if (playerAddress !== room.playerA && playerAddress !== room.playerB) {
      socket.emit("joinRoomError", { message: "Vous n'êtes pas autorisé à rejoindre cette salle" });
      return;
    }
    
    // Vérifier si le joueur n'est pas déjà dans la salle
    if (user.currentRoomId === roomId) {
      socket.emit("joinRoomError", { message: "Vous êtes déjà dans cette salle" });
      return;
    }
    
    // Rejoindre la salle
    const success = gameServer.addPlayerToRoom(roomId, playerAddress);
    if (success) {
      console.log(`🎮 ${user.username} a rejoint manuellement la salle ${roomId}`);
    } else {
      socket.emit("joinRoomError", { message: "Impossible de rejoindre la salle" });
    }
  });
  
  // === VÉRIFIER SI UNE SALLE EXISTE ===
  socket.on("checkRoomExists", (data) => {
    const { roomId } = data;
    const room = gameServer.gameRooms.get(roomId);
    
    socket.emit("roomExistsResponse", {
      roomId: roomId,
      exists: !!room,
      room: room ? {
        roomId: room.roomId,
        playerA: room.playerA,
        playerB: room.playerB,
        betAmount: room.betAmount,
        playersJoined: room.playersJoined
      } : null
    });
  });
  
  // === GESTION DES FORFAITS ===
  socket.on("forfeitCompleted", (data) => {
    console.log("✅ Forfait complété :", data);
    
    const opponent = gameServer.getUserByAddress(data.opponentAddress);
    if (opponent) {
      opponent.socket.emit("opponentForfeited", {
        roomId: data.roomId,
        forfeitingPlayerAddress: data.forfeitingPlayer,
        message: "Votre adversaire a déclaré forfait ! Vous avez gagné et récupéré tous les fonds."
      });
    }
  });
  
  // === GESTION DES DÉCONNEXIONS DE JOUEURS ===
  socket.on("playerQuit", (data) => {
    console.log("🚨 Joueur a quitté :", data);
    
    const opponent = gameServer.getUserByAddress(data.opponentAddress);
    if (opponent) {
      opponent.socket.emit("opponentQuit", {
        roomId: data.roomId,
        quittingPlayerAddress: data.quittingPlayer,
        message: "Votre adversaire a quitté la partie ! Vous pouvez réclamer la victoire manuellement."
      });
    }
  });
  
  // === CHAT EN TEMPS RÉEL ===
  socket.on("sendChatMessage", (messageData) => {
    const user = gameServer.getUserBySocketId(socket.id);
    if (!user) return;
    
    const chatMessage = {
      username: user.username,
      message: messageData.message,
      timestamp: Date.now(),
      ethAddress: user.ethAddress
    };
    
    // Diffuser à tous les utilisateurs connectés (ou à la salle spécifique)
    if (user.currentRoomId) {
      io.to(user.currentRoomId).emit("chatMessage", chatMessage);
    } else {
      io.emit("chatMessage", chatMessage);
    }
    
    console.log(`💬 Message de ${user.username}: ${messageData.message}`);
  });
  
  // === PING/PONG POUR MAINTENIR LA CONNEXION ===
  socket.on("ping", () => {
    const user = gameServer.getUserBySocketId(socket.id);
    if (user) {
      user.lastActivity = Date.now();
      socket.emit("pong", { timestamp: Date.now() });
    }
  });
  
  socket.on("pong", () => {
    const user = gameServer.getUserBySocketId(socket.id);
    if (user) {
      user.lastActivity = Date.now();
    }
  });
  
  // === GESTION DES DÉCONNEXIONS ===
  socket.on("disconnect", (reason) => {
    console.log(`🔌 Déconnexion : ${socket.id} (${reason})`);
    
    // Nettoyer le throttling des paddleMove
    paddleMoveThrottle.delete(socket.id);
    
    gameServer.unregisterUser(socket.id);
  });
  
  // === ÉVÉNEMENTS DE COMPATIBILITÉ (pour l'ancien système) ===
  socket.on("event", (data) => {
    const user = gameServer.getUserBySocketId(socket.id);
    if (!user) return;
    
    user.lastActivity = Date.now();
    
    // Transmettre certains événements spécifiques
    if (["paddleMove", "newGameRequest", "newGameAccepted", "leftMatch", "forfeit"].includes(data.type)) {
      const targetUser = gameServer.getUserByAddress(data.to) || 
                        gameServer.getUserByUsername(data.to);
      
      if (targetUser) {
        targetUser.socket.emit("event", {
          ...data,
          from: user.ethAddress,
          fromUsername: user.username
        });
        console.log(`📤 Événement ${data.type} transmis à ${targetUser.username}`);
      }
    }
  });
});

// Démarrage du serveur
server.listen(3000, () => {
  console.log("🚀 Serveur CashPong Multijoueur prêt sur : http://localhost:3000");
  console.log("📊 Système multijoueur stable et synchronisé en temps réel");
  console.log("🎮 Prêt pour les parties 2 joueurs avec blockchain");
  console.log("🔧 Fonctionnalités:");
  console.log("   ✅ Gestion complète des utilisateurs");
  console.log("   ✅ Synchronisation en temps réel");
  console.log("   ✅ Salles de jeu persistantes");
  console.log("   ✅ Gestion des déconnexions");
  console.log("   ✅ Chat intégré");
  console.log("   ✅ Statistiques de jeu");
  console.log("   ✅ Intégration blockchain");
});
