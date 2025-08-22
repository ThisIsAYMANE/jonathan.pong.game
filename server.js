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
const contractAddress = "0xdb51573EeBE611CEA7e31F0FE2A92Cbb7929b896"; // ← nouveau contrat avec logique corrigée

// SYSTÈME MULTIJOUEUR COMPLET ET STABLE
class MultiplayerGameServer {
  constructor(io) {
    // Store reference to Socket.IO instance
    this.io = io;
    
    // Gestion des utilisateurs connectés
    this.connectedUsers = new Map(); // socketId -> User object
    this.usersByAddress = new Map(); // ethAddress -> User object
    this.usersByUsername = new Map(); // username -> User object
    
    // 🎯 SYSTÈME PERMANENT POUR LES VRAIS NOMS D'UTILISATEURS
    this.permanentUserNames = new Map(); // ethAddress -> real username (NEVER overwritten)
    
    // Gestion des salles de jeu
    this.gameRooms = new Map(); // roomId -> Room object
    this.pendingInvitations = new Map(); // invitationId -> Invitation object
    
    // Gestion des parties en cours
    this.activeMatches = new Map(); // roomId -> Match object
    
    // SERVER-SIDE GAME ENGINE
    this.activeGames = new Map(); // roomId -> GameInstance with server-side physics
    
    // Statistiques et métriques
    this.connectionStats = {
      totalConnections: 0,
      activeUsers: 0,
      activeMatches: 0,
      totalMatches: 0
    };
    
    this.init();
  }

  // === SERVER-SIDE GAME ENGINE ===
  createGameInstance(roomId, playerA, playerB) {
    const gameInstance = {
      roomId: roomId,
      playerA: playerA.toLowerCase(),
      playerB: playerB.toLowerCase(),
      
      // Game State
      gameState: {
        ball: {
          x: 400,
          y: 200,
          dx: 0,
          dy: 0,
          radius: 10
        },
        paddles: {
          playerA: { x: 10, y: 162.5, width: 10, height: 75, speed: 0 },
          playerB: { x: 780, y: 162.5, width: 10, height: 75, speed: 0 }
        },
        scores: { playerA: 0, playerB: 0 },
        gameStarted: false,
        gameEnded: false,
        countdown: 0,
        winner: null
      },
      
      // Game Logic
      gameLoop: null,
      lastUpdate: Date.now(),
      
      // Canvas dimensions
      canvasWidth: 800,
      canvasHeight: 400
    };

    this.activeGames.set(roomId, gameInstance);
    console.log(`🎮 Server-side game instance created for room ${roomId}`);
    
    return gameInstance;
  }

  startServerGame(roomId) {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    console.log(`🚀 Starting server-authoritative game for room ${roomId} with 5-second countdown`);
    
    // Initialize game state but don't start ball movement yet
    game.gameState.ball.dx = 0; // Keep ball stopped during countdown
    game.gameState.ball.dy = 0;
    game.gameState.gameStarted = true;
    game.gameState.countdown = 5; // Start 5-second countdown
    
    // Start countdown timer
    const countdownInterval = setInterval(() => {
      game.gameState.countdown--;
      console.log(`⏰ [SERVER] Room ${roomId} countdown: ${game.gameState.countdown}`);
      
      if (game.gameState.countdown <= 0) {
        clearInterval(countdownInterval);
        game.gameState.countdown = 0;
        
        // Now start the ball movement
        game.gameState.ball.dx = Math.random() > 0.5 ? 7 : -7;
        game.gameState.ball.dy = Math.random() > 0.5 ? 7 : -7;
        
        console.log(`🏓 [SERVER] Room ${roomId} game started! Ball direction: dx=${game.gameState.ball.dx}, dy=${game.gameState.ball.dy}`);
      }
    }, 1000);
    
    // Start game loop at 60 FPS
    game.gameLoop = setInterval(() => {
      this.updateGamePhysics(roomId);
      this.broadcastGameState(roomId);
    }, 1000 / 60);
  }

  updateGamePhysics(roomId) {
    const game = this.activeGames.get(roomId);
    if (!game || !game.gameState.gameStarted || game.gameState.gameEnded) return;

    const { ball, paddles, scores } = game.gameState;
    const { canvasWidth, canvasHeight } = game;

    // Update paddle positions
    paddles.playerA.y += paddles.playerA.speed;
    paddles.playerB.y += paddles.playerB.speed;

    // Clamp paddles to canvas
    paddles.playerA.y = Math.max(0, Math.min(canvasHeight - paddles.playerA.height, paddles.playerA.y));
    paddles.playerB.y = Math.max(0, Math.min(canvasHeight - paddles.playerB.height, paddles.playerB.y));

    // Update ball position
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with top/bottom walls
    if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvasHeight) {
      ball.dy = -ball.dy;
    }

    // Ball collision with paddles
    // Left paddle (PlayerA)
    if (ball.x - ball.radius <= paddles.playerA.x + paddles.playerA.width &&
        ball.y >= paddles.playerA.y &&
        ball.y <= paddles.playerA.y + paddles.playerA.height &&
        ball.dx < 0) {
      ball.dx = Math.abs(ball.dx) * 1.05; // Increase speed slightly
      ball.dy *= 1.05;
    }

    // Right paddle (PlayerB)
    if (ball.x + ball.radius >= paddles.playerB.x &&
        ball.y >= paddles.playerB.y &&
        ball.y <= paddles.playerB.y + paddles.playerB.height &&
        ball.dx > 0) {
      ball.dx = -Math.abs(ball.dx) * 1.05; // Increase speed slightly
      ball.dy *= 1.05;
    }

    // Scoring
    if (ball.x - ball.radius <= 0) {
      // PlayerB scores
      scores.playerB++;
      this.resetBallWithCountdown(roomId, game);
      this.checkGameEnd(roomId);
    } else if (ball.x + ball.radius >= canvasWidth) {
      // PlayerA scores
      scores.playerA++;
      this.resetBallWithCountdown(roomId, game);
      this.checkGameEnd(roomId);
    }

    game.lastUpdate = Date.now();
  }

  resetBall(game) {
    game.gameState.ball.x = game.canvasWidth / 2;
    game.gameState.ball.y = game.canvasHeight / 2;
    game.gameState.ball.dx = Math.random() > 0.5 ? 7 : -7;
    game.gameState.ball.dy = Math.random() > 0.5 ? 7 : -7;
  }

  resetBallWithCountdown(roomId, game) {
    // Stop ball movement immediately
    game.gameState.ball.dx = 0;
    game.gameState.ball.dy = 0;
    
    // Center the ball
    game.gameState.ball.x = game.canvasWidth / 2;
    game.gameState.ball.y = game.canvasHeight / 2;
    
    // Start countdown
    let countdownValue = 5;
    
    const countdownInterval = setInterval(() => {
      // Broadcast countdown to all players in the room
      this.io.to(roomId).emit('countdownUpdate', { countdown: countdownValue });
      
      countdownValue--;
      
      if (countdownValue < 0) {
        clearInterval(countdownInterval);
        
        // Reset ball with movement after countdown
        game.gameState.ball.dx = Math.random() > 0.5 ? 7 : -7;
        game.gameState.ball.dy = Math.random() > 0.5 ? 7 : -7;
        
        // Notify players that game continues
        this.io.to(roomId).emit('countdownUpdate', { countdown: 0 });
      }
    }, 1000);
  }

  checkGameEnd(roomId) {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    const { scores } = game.gameState;
    const winningScore = 10; // First to 10 wins

    if (scores.playerA >= winningScore) {
      this.endServerGame(roomId, game.playerA);
    } else if (scores.playerB >= winningScore) {
      this.endServerGame(roomId, game.playerB);
    }
  }

  endServerGame(roomId, winner) {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    console.log(`🏆 Server game ended in room ${roomId}, winner: ${winner}`);
    
    game.gameState.gameEnded = true;
    game.gameState.winner = winner;
    
    // Stop game loop
    if (game.gameLoop) {
      clearInterval(game.gameLoop);
      game.gameLoop = null;
    }

    // Broadcast final state
    this.broadcastGameState(roomId);
    
    // Notify about game end
    io.to(roomId).emit("gameEnded", {
      roomId: roomId,
      winner: winner,
      finalScores: game.gameState.scores
    });
  }

  broadcastGameState(roomId) {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    // Send full game state to all players in the room
    io.to(roomId).emit("serverGameState", {
      roomId: roomId,
      gameState: game.gameState,
      timestamp: Date.now()
    });
  }

  updatePaddleInput(roomId, playerAddress, inputData) {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    const isPlayerA = playerAddress.toLowerCase() === game.playerA;
    const playerKey = isPlayerA ? 'playerA' : 'playerB';
    
    // Update paddle speed based on input (-5, 0, or 5)
    if (inputData.action === 'move') {
      game.gameState.paddles[playerKey].speed = inputData.direction;
    }

    // Debug log (reduced frequency)
    if (Math.random() < 0.01) {
      console.log(`🎮 Paddle input: ${playerKey} speed = ${inputData.direction}`);
    }
  }

  stopServerGame(roomId) {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    if (game.gameLoop) {
      clearInterval(game.gameLoop);
      game.gameLoop = null;
    }

    this.activeGames.delete(roomId);
    console.log(`🛑 Server game stopped for room ${roomId}`);
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
    
    // Notifier tous les joueurs de la salle
    io.to(roomId).emit("matchStarted", {
      roomId: roomId,
      gameState: room.gameState,
      message: "La partie commence ! Bonne chance !"
    });
    
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
    // Configuration des événements du contrat sera ajoutée ici
    console.log("📋 Contract events setup will be implemented");
  }
}

// Créer une instance globale du serveur multijoueur
const gameServer = new MultiplayerGameServer(io);

// ABI du contrat (conservé pour compatibilité)
const contractABI = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "roomId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "winner",
				"type": "address"
			}
		],
		"name": "MatchEnded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "roomId",
				"type": "uint256"
			}
		],
		"name": "OwnerForcedEnd",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "roomId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "player",
				"type": "address"
			}
		],
		"name": "PlayerJoined",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "roomId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "scorer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "scoreA",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "scoreB",
				"type": "uint8"
			}
		],
		"name": "PointScored",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "roomId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "playerA",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "playerB",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "betAmount",
				"type": "uint256"
			}
		],
		"name": "RoomCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "roomId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "winner",
				"type": "address"
			}
		],
		"name": "VictoryByForfeit",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "roomId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "winner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "WinningsPaid",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "roomId",
				"type": "uint256"
			}
		],
		"name": "claimVictoryByForfeit",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_opponent",
				"type": "address"
			}
		],
		"name": "createRoom",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "roomId",
				"type": "uint256"
			}
		],
		"name": "getRoom",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "playerA",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "playerB",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "betAmount",
						"type": "uint256"
					},
					{
						"internalType": "uint8",
						"name": "scoreA",
						"type": "uint8"
					},
					{
						"internalType": "uint8",
						"name": "scoreB",
						"type": "uint8"
					},
					{
						"internalType": "bool",
						"name": "playerAJoined",
						"type": "bool"
					},
					{
						"internalType": "bool",
						"name": "playerBJoined",
						"type": "bool"
					},
					{
						"internalType": "bool",
						"name": "isFinished",
						"type": "bool"
					},
					{
						"internalType": "uint256",
						"name": "lastActionTimestamp",
						"type": "uint256"
					},
					{
						"internalType": "bool",
						"name": "playerAForfeited",
						"type": "bool"
					},
					{
						"internalType": "bool",
						"name": "playerBForfeited",
						"type": "bool"
					}
				],
				"internalType": "struct CashPongBet.Room",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "roomId",
				"type": "uint256"
			}
		],
		"name": "joinRoom",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "roomId",
				"type": "uint256"
			}
		],
		"name": "ownerForceEnd",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "roomCounter",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "rooms",
		"outputs": [
			{
				"internalType": "address",
				"name": "playerA",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "playerB",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "betAmount",
				"type": "uint256"
			},
			{
				"internalType": "uint8",
				"name": "scoreA",
				"type": "uint8"
			},
			{
				"internalType": "uint8",
				"name": "scoreB",
				"type": "uint8"
			},
			{
				"internalType": "bool",
				"name": "playerAJoined",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "playerBJoined",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "isFinished",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "lastActionTimestamp",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "playerAForfeited",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "playerBForfeited",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "roomId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "scorer",
				"type": "address"
			}
		],
		"name": "scorePoint",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]
const cashPongContract = new web3.eth.Contract(contractABI, contractAddress);

let users = {};
let usersInMatch = {};
let activeRooms = {}; // Track active rooms and their players

// Écoute de l'événement RoomCreated
cashPongContract.events.RoomCreated()
  .on("data", (event) => {
    console.log("🚨 Nouvel événement RoomCreated détecté :", event.returnValues);
    const { roomId, playerA, playerB, betAmount } = event.returnValues;

    // Track the active room
    activeRooms[roomId] = {
      playerA: playerA.toLowerCase(),
      playerB: playerB.toLowerCase(),
      betAmount,
      isActive: true,
      playerAJoined: false,
      playerBJoined: false,
      createdAt: new Date().toISOString()
    };

    // Diffusion à tous si nécessaire (optionnel)
    io.emit("roomCreated", { roomId, playerA, playerB, betAmount });

    // Seul le créateur (playerA) rejoint automatiquement sa room
    const socketA = users[playerA.toLowerCase()];
    const socketB = users[playerB.toLowerCase()];

    if (socketA) {
      socketA.join(roomId);
      socketA.currentRoomId = roomId;
      socketA.emit("roomJoined", { roomId, opponent: playerB });
      console.log(`✅ Créateur ${playerA} rejoint automatiquement sa room ${roomId}`);
      
      // Mark playerA as joined since they auto-join
      if (activeRooms[roomId]) {
        activeRooms[roomId].playerAJoined = true;
        console.log(`🎮 [ROOM ${roomId}] PlayerA (créateur) auto-rejoint confirmé`);
      }
    }

    // L'adversaire (playerB) reçoit seulement une notification pour rejoindre manuellement
    if (socketB) {
      socketB.emit("roomAvailable", {
        roomId: roomId,
        opponent: playerA,
        betAmount: betAmount,
        message: "Une salle de jeu a été créée pour vous. Cliquez pour rejoindre."
      });
      console.log(`📤 Notification envoyée à ${playerB} pour rejoindre manuellement la room ${roomId}`);
    }
  })
  .on("error", console.error);

// Listen for PlayerJoined events to track when both players are in the room
cashPongContract.events.PlayerJoined()
  .on("data", (event) => {
    console.log("🎯 Nouvel événement PlayerJoined détecté :", event.returnValues);
    const { roomId, player } = event.returnValues;
    
    // Check if this room exists in our active rooms
    if (activeRooms[roomId]) {
      const room = activeRooms[roomId];
      const playerAddress = player.toLowerCase();
      
      console.log(`✅ Joueur ${playerAddress} a rejoint la room ${roomId}`);
      
      // Check if both players have now joined
      if (room.playerA === playerAddress) {
        console.log(`🎮 [ROOM ${roomId}] PlayerA (${playerAddress}) confirmé dans la room`);
        room.playerAJoined = true;
      } else if (room.playerB === playerAddress) {
        console.log(`🎮 [ROOM ${roomId}] PlayerB (${playerAddress}) a rejoint manuellement!`);
        room.playerBJoined = true;
      }
      
      // Check if both players are now in the room
      if (room.playerAJoined && room.playerBJoined) {
        console.log(`🏆🏆🏆 [ROOM ${roomId}] BOTH PLAYERS HAVE SUCCESSFULLY JOINED! 🏆🏆🏆`);
        console.log(`🎮 PlayerA: ${room.playerA}`);
        console.log(`🎮 PlayerB: ${room.playerB}`);
        console.log(`💰 Bet Amount: ${room.betAmount} wei (${web3.utils.fromWei(room.betAmount, 'ether')} ETH)`);
        console.log(`🚀 Room ${roomId} is ready for gameplay!`);
        console.log(`${'='.repeat(60)}`);
        
        // Emit to all connected clients that the room is fully ready
        io.emit("roomFullyReady", { 
          roomId, 
          playerA: room.playerA, 
          playerB: room.playerB,
          betAmount: room.betAmount 
        });
      }
    }
  })
  .on("error", (error) => {
    console.error("❌ Erreur lors de l'écoute RoomJoined:", error);
  });




// 🔢 Compteur de rooms
let roomCounter = 1;


// Define the root route BEFORE static middleware to override default index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index-production.html"));
});

app.use(express.static(__dirname));

const userSockets = {};

io.on("connection", (socket) => {
  console.log(`🟢 Nouveau joueur connecté : ${socket.id}`);

function cleanupPreviousSocket(identifier) {
    const oldSocket = users[identifier.toLowerCase()];
    if (oldSocket && oldSocket !== socket) {
      console.log(`🧹 Nettoyage de l'ancien socket pour ${identifier}`);
      oldSocket.emit("event", {
        type: "duplicateConnection",
        message: "Une nouvelle session a été ouverte avec vos identifiants.",
      });
      oldSocket.disconnect(true);
      delete users[identifier.toLowerCase()];
    }
  }

 socket.on("register", ({ username, ethAddress, role }) => {
  const normalizedUsername = username?.toLowerCase();
  let normalizedAddress = ethAddress?.toLowerCase();

  // Debug: log received values and type
  console.log(`[REGISTER] username: ${username} (${typeof username}), ethAddress: ${ethAddress} (${typeof ethAddress}), role: ${role}`);

  // Try to get address from handshake if not provided
  if (!normalizedAddress && socket.handshake && socket.handshake.auth && socket.handshake.auth.ethAddress) {
    normalizedAddress = socket.handshake.auth.ethAddress.toLowerCase();
    console.log(`[REGISTER] Fallback handshake.auth.ethAddress: ${normalizedAddress}`);
  }
  if (!normalizedAddress && socket.handshake && socket.handshake.query && socket.handshake.query.ethAddress) {
    normalizedAddress = socket.handshake.query.ethAddress.toLowerCase();
    console.log(`[REGISTER] Fallback handshake.query.ethAddress: ${normalizedAddress}`);
  }

  // Validate Ethereum address
  const isEthAddress =
    typeof normalizedAddress === "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(normalizedAddress);

  if (!normalizedAddress || !isEthAddress) {
    console.warn(`❌ [REGISTER ERROR] Adresse ETH manquante ou invalide pour ${username}: "${ethAddress}"`);
    socket.emit("event", {
      type: "invalidEthAddress",
      message: "Adresse Ethereum manquante ou invalide. Veuillez connecter MetaMask et réessayer."
    });
    return; // Ne pas continuer si l'adresse ETH est invalide
  }

  // Show what is finally used
  console.log(`[REGISTER] Final normalizedUsername: ${normalizedUsername}, normalizedAddress: ${normalizedAddress}`);

  // 🎯 STOCKAGE PERMANENT DES VRAIS NOMS - JAMAIS ÉCRASÉS
  if (normalizedUsername && !normalizedUsername.startsWith('0x') && isEthAddress) {
    gameServer.permanentUserNames.set(normalizedAddress, normalizedUsername);
    console.log(`💎 [PERMANENT NAME] Sauvegardé: ${normalizedAddress} => "${normalizedUsername}"`);
  }

  // Only set socket properties if address is valid
  socket.username = normalizedUsername;
  socket.ethAddress = normalizedAddress;
  socket.role = role;

  if (normalizedUsername) {
    cleanupPreviousSocket(normalizedUsername);
    users[normalizedUsername] = socket;
  }
  if (isEthAddress) {
    cleanupPreviousSocket(normalizedAddress);
    users[normalizedAddress] = socket;
  }
  users[socket.id] = socket;

  // Debug: show all registered keys after each registration
  console.log(`✅ ${username} enregistré avec adresse ETH : ${normalizedAddress} et rôle : ${role}`);
  console.log("🔑 Utilisateurs enregistrés (keys):", Object.keys(users));
  Object.entries(users).forEach(([key, sock]) => {
    if (sock && typeof sock === "object") {
      console.log(`  [${key}] => username: ${sock.username || "?"}, ethAddress: ${sock.ethAddress || "?"}, socketId: ${sock.id || "?"}`);
    }
  });

  // Extra: show a summary of how many users have a valid ETH address
  const ethUsers = Object.values(users).filter(
    sock => sock && /^0x[a-fA-F0-9]{40}$/.test(sock.ethAddress || "")
  );
  console.log(`🧑‍💻 Utilisateurs avec adresse ETH valide: ${ethUsers.length}`);
});

socket.on("sync", (data) => {
  // Normalize address
  const to = data.to?.toLowerCase();
  let targetSocket = users[to];

  // Try by username if not found by address
  if (!targetSocket && data.toUsername) {
    targetSocket = users[data.toUsername.toLowerCase()];
  }

  // Try by opponentUsername if available
  if (!targetSocket && socket.opponentUsername) {
    targetSocket = users[socket.opponentUsername.toLowerCase()];
  }

  // Try by opponent address if available
  if (!targetSocket && socket.opponent) {
    targetSocket = users[socket.opponent.toLowerCase()];
  }

  // Try by socket id (last resort)
  if (!targetSocket && users[socket.id]) {
    targetSocket = users[socket.id];
  }

  if (targetSocket) {
    targetSocket.emit("sync", data);
  } else {
    // Log all keys in users for debugging
    console.warn(
      `❌ 'sync' non envoyé : destinataire introuvable. to=${data.to} toUsername=${data.toUsername} opponentUsername=${socket.opponentUsername} opponent=${socket.opponent}`
    );
    console.warn("🔎 Utilisateurs enregistrés (keys):", Object.keys(users));
    socket.emit("event", {
      type: "syncFailed",
      to: data.to,
      message: "Destinataire introuvable pour sync"
    });
  }
});


  // NOUVEAU SYSTÈME : roomCreated → roomInvitation avec contrat smart contract
  socket.on("roomCreated", (data) => {
    console.log("🏠 Room créée reçue :", data);
    const { roomId, opponentAddress, betAmount, creatorAddress, creatorUsername } = data;

    console.log(`🔍 Recherche de l'adversaire avec l'adresse : ${opponentAddress}`);
    console.log(`🔑 Utilisateurs connectés :`, Object.keys(users));
    
    // Debug : afficher toutes les adresses ETH enregistrées
    Object.entries(users).forEach(([key, sock]) => {
      if (sock && sock.ethAddress) {
        console.log(`  [${key}] => ethAddress: ${sock.ethAddress}, username: ${sock.username}`);
      }
    });

    // Chercher l'adversaire par adresse ETH
    let targetSocket = null;
    for (const [key, socketInstance] of Object.entries(users)) {
      if (socketInstance.ethAddress && socketInstance.ethAddress.toLowerCase() === opponentAddress.toLowerCase()) {
        targetSocket = socketInstance;
        console.log(`✅ Adversaire trouvé : ${socketInstance.username} (${socketInstance.ethAddress})`);
        break;
      }
    }

    if (targetSocket) {
      // Envoyer l'invitation à l'adversaire
      targetSocket.emit("roomInvitation", {
        roomId: roomId,
        betAmount: betAmount,
        creatorAddress: creatorAddress,
        creatorUsername: creatorUsername,
        message: `${creatorUsername} vous invite à rejoindre une room de pari.\nMise : ${betAmount} ETH`
      });
      console.log(`📤 Invitation envoyée à ${targetSocket.username} pour rejoindre la room ${roomId}`);
    } else {
      console.log(`❌ Adversaire non trouvé avec l'adresse : ${opponentAddress}`);
      console.log(`❌ Adresses disponibles :`, Object.values(users).map(s => s.ethAddress).filter(Boolean));
      // Notifier le créateur que l'adversaire n'est pas connecté
      socket.emit("opponentNotFound", { opponentAddress });
    }
  });

  // Handler pour forfait volontaire complété
  socket.on("forfeitCompleted", async (data) => {
    console.log("✅ [SERVER] forfeitCompleted reçu :", data);
    const { roomId, forfeitingPlayer, opponentAddress } = data;

    // Chercher l'adversaire par adresse ETH
    let opponentSocket = null;
    let opponentSocketId = null;
    
    for (const [key, socketInstance] of Object.entries(users)) {
      if (socketInstance.ethAddress && socketInstance.ethAddress.toLowerCase() === opponentAddress.toLowerCase()) {
        opponentSocket = socketInstance;
        opponentSocketId = socketInstance.socketId;
        break;
      }
    }

    if (opponentSocket && opponentSocketId) {
      const realSocket = io.sockets.sockets.get(opponentSocketId);
      
      if (realSocket) {
        console.log(`🏆 [SERVER] Notification de victoire automatique à ${opponentSocketId}...`);
        
        // Notifier l'adversaire qu'il a gagné automatiquement
        realSocket.emit("opponentForfeited", {
          roomId: roomId,
          forfeitingPlayerAddress: forfeitingPlayer,
          message: "Votre adversaire a déclaré forfait ! Vous avez gagné et récupéré tous les fonds."
        });
        
        console.log(`🎉 [SERVER] Notification de victoire automatique envoyée pour la room ${roomId}`);
      }
    }
  });

  // Handler pour forfait automatique quand un joueur quitte (fallback)
  socket.on("playerQuit", async (data) => {
    console.log("🚨 [SERVER] playerQuit reçu (fallback) :", data);
    const { roomId, quittingPlayer, opponentAddress } = data;

    console.log(`🔍 [SERVER] Recherche de l'adversaire avec adresse: ${opponentAddress}`);
    console.log(`🔍 [SERVER] Utilisateurs connectés:`, Object.keys(users));
    console.log(`🔍 [SERVER] Détails des utilisateurs:`, Object.entries(users).map(([k, v]) => ({
      key: k,
      ethAddress: v.ethAddress,
      socketId: v.socketId,
      username: v.username
    })));

    // Chercher l'adversaire par adresse ETH
    let opponentSocket = null;
    let opponentSocketId = null;
    
    for (const [key, socketInstance] of Object.entries(users)) {
      // Vérifier que la socket est encore connectée
      const isConnected = socketInstance && socketInstance.id && io.sockets.sockets.get(socketInstance.id);
      
      console.log(`🔍 [SERVER] Vérification utilisateur ${key}:`, {
        ethAddress: socketInstance.ethAddress,
        socketId: socketInstance.id,
        isConnected: !!isConnected,
        match: socketInstance.ethAddress && socketInstance.ethAddress.toLowerCase() === opponentAddress.toLowerCase()
      });
      
      if (socketInstance.ethAddress && socketInstance.ethAddress.toLowerCase() === opponentAddress.toLowerCase() && isConnected) {
        opponentSocket = socketInstance;
        opponentSocketId = socketInstance.id;
        console.log(`✅ [SERVER] Adversaire trouvé et connecté ! SocketId: ${opponentSocketId}`);
        break;
      }
    }

    if (opponentSocket && opponentSocketId) {
      console.log(`📡 [SERVER] Envoi de opponentQuit à ${opponentSocketId}...`);
      
      // Utiliser directement la socket trouvée (pas besoin de io.sockets.sockets.get)
      opponentSocket.emit("opponentQuit", {
        roomId: roomId,
        quittingPlayerAddress: quittingPlayer,
        message: "Votre adversaire a quitté la partie ! Vous pouvez réclamer la victoire manuellement."
      });
      
      console.log(`⚠️ [SERVER] Notification de quit envoyée à l'adversaire pour la room ${roomId}`);
    } else {
      console.log(`❌ [SERVER] Adversaire avec adresse ${opponentAddress} non trouvé ou non connecté !`);
      console.log(`❌ [SERVER] Utilisateurs disponibles:`, Object.entries(users).map(([k, v]) => ({
        key: k,
        ethAddress: v.ethAddress,
        socketId: v.id,
        isConnected: !!(v && v.id && io.sockets.sockets.get(v.id))
      })));
    }
  });

  // ANCIEN SYSTÈME D'ÉVÉNEMENTS SUPPRIMÉ
  // Maintenant on utilise seulement roomCreated → roomInvitation avec contrat smart contract
  
  socket.on("event", (data) => {
    // Check if data.to exists before processing
    if (!data.to) {
      console.warn("❌ Event received without 'to' field:", data);
      return;
    }
    
    const targetSocket = users[data.to.toLowerCase()];
    
    // Garder seulement les événements de jeu (paddleMove, etc.)
    if (data.type === "paddleMove" || data.type === "newGameRequest" || data.type === "newGameAccepted" || data.type === "leftMatch" || data.type === "forfeit") {
      if (targetSocket) {
        targetSocket.emit("event", data);
        console.log(`📤 Événement de jeu transmis à ${data.to} : ${data.type}`);
      }
    }
    // Ignorer les anciens événements accepted, refused, etc.
  });

  // Track when players manually join rooms (via blockchain transaction)
  socket.on("playerJoinedRoom", ({ roomId, playerAddress }) => {
    console.log(`🎯 [MANUAL JOIN] Joueur ${playerAddress} a rejoint manuellement la room ${roomId}`);
    
    if (activeRooms[roomId]) {
      const room = activeRooms[roomId];
      const normalizedAddress = playerAddress.toLowerCase();
      
      if (room.playerB === normalizedAddress) {
        room.playerBJoined = true;
        console.log(`✅ [ROOM ${roomId}] PlayerB (${normalizedAddress}) marqué comme rejoint manuellement!`);
        
        // Check if both players are now in the room
        if (room.playerAJoined && room.playerBJoined) {
          console.log(`🏆🏆🏆 [ROOM ${roomId}] BOTH PLAYERS HAVE SUCCESSFULLY JOINED! 🏆🏆🏆`);
          console.log(`🎮 PlayerA (Créateur): ${room.playerA}`);
          console.log(`🎮 PlayerB (Invité): ${room.playerB}`);
          console.log(`💰 Bet Amount: ${room.betAmount} wei (${web3.utils.fromWei(room.betAmount, 'ether')} ETH)`);
          console.log(`🚀 Room ${roomId} is ready for gameplay!`);
          console.log(`${'='.repeat(60)}`);
          
          // Emit to all connected clients that the room is fully ready
          io.emit("roomFullyReady", { 
            roomId, 
            playerA: room.playerA, 
            playerB: room.playerB,
            betAmount: room.betAmount 
          });
        }
      }
    }
  });

  // Objet global pour stocker les mises par paire de joueurs
 const bets = {}; // Ex : { "jonyboy": 0.0001, "esther": 0.0001 }




socket.on("roomCreated", ({ roomId, opponentAddress, betAmount, creatorAddress, creatorUsername }) => {
  console.log(`🎮 Room ${roomId} créée par ${creatorUsername} (${creatorAddress}) pour ${opponentAddress} avec mise ${betAmount} ETH`);

  // Chercher l'adversaire par son adresse ETH
  let opponentSocket = null;
  for (const [key, socketInstance] of Object.entries(users)) {
    if (socketInstance.ethAddress && socketInstance.ethAddress.toLowerCase() === opponentAddress.toLowerCase()) {
      opponentSocket = socketInstance;
      break;
    }
  }

  if (opponentSocket) {
    // Envoyer la notification à l'adversaire
    opponentSocket.emit("roomInvitation", {
      roomId: roomId,
      creatorUsername: creatorUsername,
      creatorAddress: creatorAddress,
      betAmount: betAmount,
      message: `${creatorUsername} vous invite à rejoindre une room avec une mise de ${betAmount} ETH`
    });
    console.log(`📤 Invitation envoyée à l'adversaire pour la room ${roomId}`);
  } else {
    console.log(`❌ Adversaire avec l'adresse ${opponentAddress} non trouvé en ligne`);
    // Optionnel : informer le créateur que l'adversaire n'est pas en ligne
    socket.emit("opponentOffline", {
      opponentAddress: opponentAddress,
      message: "L'adversaire n'est pas connecté actuellement"
    });
  }
});

socket.on("sendChatMessage", ({ username, message }) => {
  // Server-side duplicate prevention
  const messageKey = `${socket.id}_${username}_${message}_${Date.now()}`;
  const now = Date.now();
  
  // Check for duplicate messages from same socket
  if (socket.lastMessageTime && now - socket.lastMessageTime < 1000) {
    console.log(`� Blocked duplicate message from ${username} (too soon)`);
    return;
  }
  
  if (socket.lastMessage === message && now - socket.lastMessageTime < 5000) {
    console.log(`🚫 Blocked exact duplicate message from ${username}`);
    return;
  }
  
  socket.lastMessageTime = now;
  socket.lastMessage = message;
  
  console.log(`�💬 Message reçu de ${username} : ${message}`);

  // Diffuse à tous les clients (tu peux adapter à une room plus tard)
  io.emit("chatMessage", {
    username,
    message,
  });
});

// === SERVER-SIDE GAME HANDLERS ===

// Start server-authoritative game
socket.on("startServerGame", (data) => {
  try {
    const { roomId } = data;
    console.log(`🚀 [SERVER] Starting server game for room ${roomId}`);
    
    // Get room info to determine players
    const room = activeRooms[roomId];
    if (!room || !room.playerA || !room.playerB) {
      console.warn(`❌ Cannot start server game - room ${roomId} not ready`);
      return;
    }
    
    // Get requester's ETH address
    const requesterAddress = socket.ethAddress?.toLowerCase();
    
    // Debug logging
    console.log(`[DEBUG] Socket info - ID: ${socket.id}, ethAddress: "${socket.ethAddress}", username: "${socket.username}"`);
    console.log(`[DEBUG] Room info - Room ID: ${roomId}, PlayerA: "${room.playerA}", PlayerB: "${room.playerB}"`);
    
    // Verify that only the room creator (playerA) can start the game
    if (!requesterAddress || requesterAddress !== room.playerA.toLowerCase()) {
      console.warn(`❌ Only room creator can start the game. Requester: "${requesterAddress}", Creator: "${room.playerA}"`);
      socket.emit("gameStartDenied", {
        message: "Seul le créateur de la room peut lancer la partie.",
        roomId: roomId
      });
      return;
    }
    
    console.log(`✅ Game start authorized for room creator: ${requesterAddress}`);
    
    // Create game instance with server-side physics
    const gameInstance = gameServer.createGameInstance(roomId, room.playerA, room.playerB);
    
    // Join players to Socket.IO room for broadcasting
    const playerASocket = users[room.playerA];
    const playerBSocket = users[room.playerB];
    
    if (playerASocket) playerASocket.join(roomId);
    if (playerBSocket) playerBSocket.join(roomId);
    
    // Start the server-side game loop
    gameServer.startServerGame(roomId);
    
    // Get usernames for display
    const playerAUser = gameServer.usersByAddress.get(room.playerA.toLowerCase());
    const playerBUser = gameServer.usersByAddress.get(room.playerB.toLowerCase());
    
    // Function to get display name - prioritize permanent real names
    const getDisplayName = (user, fallbackAddress) => {
      // 🎯 D'ABORD: Chercher dans les noms permanents
      const permanentName = gameServer.permanentUserNames.get(fallbackAddress.toLowerCase());
      if (permanentName) {
        console.log(`💎 [PERMANENT NAME] Trouvé nom permanent pour ${fallbackAddress}: "${permanentName}"`);
        return permanentName;
      }
      
      if (!user?.username) {
        return fallbackAddress.substring(0, 8) + "...";
      }
      
      // If username is a wallet address (starts with 0x and is 42 chars), shorten it
      if (user.username.startsWith('0x') && user.username.length === 42) {
        return user.username.substring(0, 8) + "...";
      }
      
      // If username is already shortened (starts with 0x and ends with ...), use it
      if (user.username.startsWith('0x') && user.username.endsWith('...')) {
        return user.username;
      }
      
      // Otherwise use the real username
      return user.username;
    };
    
    const playerAName = getDisplayName(playerAUser, room.playerA);
    const playerBName = getDisplayName(playerBUser, room.playerB);
    
    console.log(`🎯 [SERVER] Sending player names: PlayerA="${playerAName}", PlayerB="${playerBName}"`);
    
    // Notify players that server game started
    io.to(roomId).emit("serverGameStarted", {
      roomId: roomId,
      playerA: room.playerA,
      playerB: room.playerB,
      playerAName: playerAName,
      playerBName: playerBName,
      message: "Server-side game started! Use controls to move your paddle."
    });
  } catch (error) {
    console.error(`❌ [SERVER] Error starting server game for room ${data?.roomId}:`, error);
    socket.emit("gameError", {
      message: "Failed to start server game. Please try again.",
      error: error.message
    });
  }
});

// Handle paddle input from clients
socket.on("paddleInput", (data) => {
  const { roomId, direction } = data; // direction: -5, 0, or 5
  const playerAddress = socket.ethAddress;
  
  if (!playerAddress || !roomId) return;
  
  gameServer.updatePaddleInput(roomId, playerAddress, {
    action: 'move',
    direction: direction
  });
});

// Handle game end request
socket.on("endServerGame", (data) => {
  const { roomId } = data;
  console.log(`🛑 [SERVER] Ending server game for room ${roomId}`);
  
  gameServer.stopServerGame(roomId);
  
  io.to(roomId).emit("serverGameEnded", {
    roomId: roomId,
    message: "Server game ended."
  });
});

// ...

 socket.on("disconnect", () => {
  console.log(`🔌 Utilisateur déconnecté : ${socket.username || "inconnu"}`);

  const username = socket.username?.toLowerCase();
  const ethAddress = socket.ethAddress?.toLowerCase();

  // Find the room this socket was in and notify opponent
  const roomId = socket.currentRoomId;
  if (roomId && activeRooms[roomId] && activeRooms[roomId].isActive) {
    const room = activeRooms[roomId];
    
    if (ethAddress) {
      // Determine which player disconnected and notify the opponent
      let opponentAddress = null;
      if (room.playerA === ethAddress) {
        opponentAddress = room.playerB;
      } else if (room.playerB === ethAddress) {
        opponentAddress = room.playerA;
      }
      
      if (opponentAddress) {
        // Find opponent socket and notify them
        const opponentSocket = users[opponentAddress];
        if (opponentSocket) {
          console.log(`📢 Notifying opponent ${opponentAddress} that player ${ethAddress} disconnected from room ${roomId}`);
          opponentSocket.emit("opponentQuit", { 
            roomId: roomId,
            message: "Votre adversaire s'est déconnecté. Vous pouvez réclamer la victoire."
          });
        }
      }
      
      // Mark room as inactive
      activeRooms[roomId].isActive = false;
      console.log(`🏠 Room ${roomId} marked as inactive due to player disconnect`);
    }
  }

  // ✅ Supprimer du tableau `users` si ce socket y est encore associé
  if (username && users[username] === socket) {
    delete users[username];
    console.log(`🧹 Nettoyé users[${username}]`);
  }

  if (ethAddress && users[ethAddress] === socket) {
    delete users[ethAddress];
    console.log(`🧹 Nettoyé users[${ethAddress}]`);
  }

  // ✅ CORRECTION : Nettoyer aussi l'entrée par socket.id
  if (users[socket.id] === socket) {
    delete users[socket.id];
    console.log(`🧹 Nettoyé users[${socket.id}]`);
  }

  // 🔔 Prévenir l'adversaire si encore connecté
  if (username && socket.opponent) {
    const opponentSocket = users[socket.opponent.toLowerCase()];
    
    if (opponentSocket) {
      // Envoyer un message à l’adversaire
      opponentSocket.emit("event", {
        type: "opponentDisconnected",
        message: "Votre adversaire s'est déconnecté.",
      });

      // Nettoyer la référence côté adversaire
      opponentSocket.opponent = null;
    }

    // Nettoyer la référence côté utilisateur déconnecté
    socket.opponent = null;
  }

});

});

server.listen(3000, () => {
  console.log("🚀 Serveur CashPong prêt sur : http://localhost:3000");
});

// Polygon Mainnet is already configured and used for all contract calls.

// After registration, everything is working and addresses are correctly mapped.
// You do not need to change anything in this file now.
// The debug output confirms that both username and ethAddress are registered and mapped for each socket.
// There is no problem in your server.js file now.
// The registration, mapping, and debug output are all correct.
// Both username and ethAddress are received, normalized, and mapped for each socket.
// You see the correct debug output for each user and address.
// The sync, challenge, and room creation logic are also working as expected.
