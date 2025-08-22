const { ethers } = require("hardhat");

async function main() {
  console.log("🎮 Testing CashPongBet transactions...");

  // Get signers (players)
  const [deployer, playerA, playerB] = await ethers.getSigners();
  
  console.log("👥 Players:");
  console.log("   - Deployer/Owner:", await deployer.getAddress());
  console.log("   - Player A:", await playerA.getAddress());
  console.log("   - Player B:", await playerB.getAddress());

  // Deploy contract if not provided
  let contractAddress = process.env.CONTRACT_ADDRESS;
  let cashPongBet;

  if (!contractAddress) {
    console.log("📦 Deploying new contract...");
    const CashPongBet = await ethers.getContractFactory("CashPongBet");
    cashPongBet = await CashPongBet.deploy();
    await cashPongBet.waitForDeployment();
    contractAddress = await cashPongBet.getAddress();
    console.log("✅ Contract deployed at:", contractAddress);
  } else {
    console.log("🔗 Using existing contract at:", contractAddress);
    const CashPongBet = await ethers.getContractFactory("CashPongBet");
    cashPongBet = CashPongBet.attach(contractAddress);
  }

  const betAmount = ethers.parseEther("0.01"); // 0.01 MATIC
  console.log("💰 Bet amount:", ethers.formatEther(betAmount), "MATIC");

  try {
    // Step 1: Player A creates a room
    console.log("\n🏠 Step 1: Player A creates room...");
    const createRoomTx = await cashPongBet.connect(playerA).createRoom(
      await playerB.getAddress(),
      { value: betAmount }
    );
    await createRoomTx.wait();
    console.log("✅ Room created by Player A");

    // Get room ID
    const roomId = await cashPongBet.roomCounter() - 1;
    console.log("🏠 Room ID:", roomId.toString());

    // Step 2: Player B joins the room
    console.log("\n👥 Step 2: Player B joins room...");
    const joinRoomTx = await cashPongBet.connect(playerB).joinRoom(roomId, {
      value: betAmount
    });
    await joinRoomTx.wait();
    console.log("✅ Player B joined the room");

    // Step 3: Simulate scoring points
    console.log("\n⚽ Step 3: Simulating game...");
    
    // Player A scores 5 points
    for (let i = 0; i < 5; i++) {
      const scoreTx = await cashPongBet.connect(playerA).scorePoint(roomId, await playerA.getAddress());
      await scoreTx.wait();
      console.log(`   ✅ Player A scored point ${i + 1}`);
    }

    // Player B scores 3 points
    for (let i = 0; i < 3; i++) {
      const scoreTx = await cashPongBet.connect(playerB).scorePoint(roomId, await playerB.getAddress());
      await scoreTx.wait();
      console.log(`   ✅ Player B scored point ${i + 1}`);
    }

    // Get current scores
    const room = await cashPongBet.getRoom(roomId);
    console.log(`📊 Current scores - Player A: ${room.scoreA}, Player B: ${room.scoreB}`);

    // Step 4: Player A wins by scoring 5 more points (total 10)
    console.log("\n🏆 Step 4: Player A wins the game...");
    for (let i = 0; i < 5; i++) {
      const scoreTx = await cashPongBet.connect(playerA).scorePoint(roomId, await playerA.getAddress());
      await scoreTx.wait();
      console.log(`   ✅ Player A scored point ${i + 6}`);
    }

    // Check final state
    const finalRoom = await cashPongBet.getRoom(roomId);
    console.log(`🏁 Final scores - Player A: ${finalRoom.scoreA}, Player B: ${finalRoom.scoreB}`);
    console.log(`🏁 Game finished: ${finalRoom.isFinished}`);

    // Check balances
    const playerABalance = await ethers.provider.getBalance(await playerA.getAddress());
    const playerBBalance = await ethers.provider.getBalance(await playerB.getAddress());
    const contractBalance = await cashPongBet.getBalance();

    console.log("\n💰 Final balances:");
    console.log(`   - Player A: ${ethers.formatEther(playerABalance)} MATIC`);
    console.log(`   - Player B: ${ethers.formatEther(playerBBalance)} MATIC`);
    console.log(`   - Contract: ${ethers.formatEther(contractBalance)} MATIC`);

    console.log("\n🎉 Transaction testing completed successfully!");

  } catch (error) {
    console.error("❌ Error during testing:", error.message);
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n✅ All tests completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }); 