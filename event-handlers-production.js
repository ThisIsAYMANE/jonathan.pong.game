const { ethers } = require("hardhat");

// Gestionnaire d'événements pour la production
class EventHandlerProduction {
  constructor(contract, gameServer) {
    this.contract = contract;
    this.gameServer = gameServer;
    this.setupEventListeners();
  }

  setupEventListeners() {
    console.log("🔗 Configuration des event listeners production...");

    // Événement de création de room
    this.contract.on("RoomCreated", (roomId, playerA, playerB, betAmount, event) => {
      console.log(`🚨 RoomCreated Event - Room ${roomId}: ${playerA} vs ${playerB}, Bet: ${ethers.utils.formatEther(betAmount)} ETH`);
      
      // Notifier le serveur de jeu
      this.gameServer.handleBlockchainRoomCreated({
        roomId: roomId.toString(),
        playerA: playerA,
        playerB: playerB,
        betAmount: betAmount.toString()
      });
    });

    // Événement de fin de jeu
    this.contract.on("GameEnded", (roomId, winner, loser, amount, event) => {
      console.log(`🏆 GameEnded Event - Room ${roomId}: Winner ${winner}, Amount: ${ethers.utils.formatEther(amount)} ETH`);
      
      // Notifier le serveur de jeu
      this.gameServer.handleBlockchainGameEnded({
        roomId: roomId.toString(),
        winner: winner,
        loser: loser,
        amount: amount.toString()
      });
    });

    // Événement de pari placé
    this.contract.on("BetPlaced", (roomId, player, amount, event) => {
      console.log(`💰 BetPlaced Event - Room ${roomId}: ${player} bet ${ethers.utils.formatEther(amount)} ETH`);
      
      // Notifier le serveur de jeu
      this.gameServer.handleBlockchainBetPlaced({
        roomId: roomId.toString(),
        player: player,
        amount: amount.toString()
      });
    });

    console.log("✅ Event listeners production configurés avec succès");
  }

  // Méthode pour nettoyer les listeners
  cleanup() {
    console.log("🧹 Nettoyage des event listeners production...");
    this.contract.removeAllListeners();
  }
}

module.exports = { EventHandlerProduction };
