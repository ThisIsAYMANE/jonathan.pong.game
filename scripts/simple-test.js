const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Simple CashPongBet contract test on Amoy...");
  
  const contractAddress = "0xCc50ce04FF06446E0Af663655A4F2B4dFEDb9140";
  console.log("📋 Contract address:", contractAddress);
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deployer:", await deployer.getAddress());
  
  // Get contract instance
  const CashPongBet = await ethers.getContractFactory("CashPongBet");
  const cashPongBet = CashPongBet.attach(contractAddress);
  
  try {
    console.log("\n🔍 Testing basic contract functions...");
    
    // Check owner
    const owner = await cashPongBet.owner();
    console.log("✅ Contract owner:", owner);
    
    // Check room counter
    const roomCounter = await cashPongBet.roomCounter();
    console.log("✅ Room counter:", roomCounter.toString());
    
    // Check contract balance
    const balance = await ethers.provider.getBalance(contractAddress);
    console.log("✅ Contract balance:", ethers.formatEther(balance), "MATIC");
    
    // Try to get room 1 (should exist from previous test)
    try {
      const room = await cashPongBet.getRoom(1);
      console.log("✅ Room 1 exists:");
      console.log("   Player A:", room.playerA);
      console.log("   Player B:", room.playerB);
      console.log("   Bet Amount:", ethers.formatEther(room.betAmount), "MATIC");
      console.log("   Score A:", room.scoreA.toString());
      console.log("   Score B:", room.scoreB.toString());
      console.log("   Is Finished:", room.isFinished);
    } catch (error) {
      console.log("ℹ️  No room 1 found (this is normal for a fresh deployment)");
    }
    
    console.log("\n🎉 Basic contract test completed successfully!");
    console.log("📋 Contract is working properly on Amoy testnet");
    console.log("🌐 View on Polygonscan: https://amoy.polygonscan.com/address/" + contractAddress);
    
  } catch (error) {
    console.error("❌ Error during testing:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 