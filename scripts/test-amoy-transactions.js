const { ethers } = require("hardhat");

async function main() {
  console.log("🎮 Testing CashPongBet transactions on Amoy...");
  
  const contractAddress = "0xCc50ce04FF06446E0Af663655A4F2B4dFEDb9140";
  console.log("📋 Contract address:", contractAddress);
  
  // Get signer (your wallet)
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deployer:", await deployer.getAddress());
  
  // For testing, we'll use the same wallet for both players
  // In a real scenario, you'd have different wallets
  const playerA = deployer;
  const playerB = deployer;
  
  console.log("📋 Player A:", await playerA.getAddress());
  console.log("📋 Player B:", await playerB.getAddress());
  
  // Get contract instance
  const CashPongBet = await ethers.getContractFactory("CashPongBet");
  const cashPongBet = CashPongBet.attach(contractAddress);
  
  const betAmount = ethers.parseEther("0.001"); // Small bet for testing
  
  try {
    console.log("\n🎯 Step 1: Player A creates a room...");
    const createRoomTx = await cashPongBet.connect(playerA).createRoom(
      await playerB.getAddress(),
      { value: betAmount }
    );
    await createRoomTx.wait();
    console.log("✅ Room created successfully!");
    
    // Get room details
    const room = await cashPongBet.getRoom(1);
    console.log("📋 Room 1 details:");
    console.log("   Player A:", room.playerA);
    console.log("   Player B:", room.playerB);
    console.log("   Bet Amount:", ethers.formatEther(room.betAmount), "MATIC");
    console.log("   Player A Joined:", room.playerAJoined);
    console.log("   Player B Joined:", room.playerBJoined);
    
    console.log("\n🎯 Step 2: Player B joins the room...");
    const joinRoomTx = await cashPongBet.connect(playerB).joinRoom(1, { value: betAmount });
    await joinRoomTx.wait();
    console.log("✅ Player B joined successfully!");
    
    console.log("\n🎯 Step 3: Player A scores a point...");
    const scoreTx = await cashPongBet.connect(playerA).scorePoint(1, await playerA.getAddress());
    await scoreTx.wait();
    console.log("✅ Player A scored a point!");
    
    // Check updated room
    const updatedRoom = await cashPongBet.getRoom(1);
    console.log("📋 Updated Room 1:");
    console.log("   Score A:", updatedRoom.scoreA.toString());
    console.log("   Score B:", updatedRoom.scoreB.toString());
    console.log("   Is Finished:", updatedRoom.isFinished);
    
    console.log("\n🎉 Transaction testing completed successfully!");
    console.log("📋 Contract is working properly on Amoy testnet");
    
  } catch (error) {
    console.error("❌ Error during testing:", error.message);
    console.log("\n💡 Make sure you have sufficient MATIC for transactions");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 