const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CashPongBet", function () {
  let CashPongBet;
  let cashPongBet;
  let owner;
  let playerA;
  let playerB;
  let playerC;

  const betAmount = ethers.parseEther("0.01");

  beforeEach(async function () {
    [owner, playerA, playerB, playerC] = await ethers.getSigners();
    
    CashPongBet = await ethers.getContractFactory("CashPongBet");
    cashPongBet = await CashPongBet.deploy();
    await cashPongBet.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await cashPongBet.owner()).to.equal(await owner.getAddress());
    });

    it("Should start with room counter at 1", async function () {
      expect(await cashPongBet.roomCounter()).to.equal(1);
    });
  });

  describe("Room Creation", function () {
    it("Should create a room successfully", async function () {
      const tx = await cashPongBet.connect(playerA).createRoom(
        await playerB.getAddress(),
        { value: betAmount }
      );
      await tx.wait();

      const room = await cashPongBet.getRoom(1);
      expect(room.playerA).to.equal(await playerA.getAddress());
      expect(room.playerB).to.equal(await playerB.getAddress());
      expect(room.betAmount).to.equal(betAmount);
      expect(room.playerAJoined).to.be.true;
      expect(room.playerBJoined).to.be.false;
      expect(room.isFinished).to.be.false;
    });

    it("Should fail if bet amount is zero", async function () {
      await expect(
        cashPongBet.connect(playerA).createRoom(
          await playerB.getAddress(),
          { value: 0 }
        )
      ).to.be.revertedWith("Must bet ETH");
    });

    it("Should fail if player challenges themselves", async function () {
      await expect(
        cashPongBet.connect(playerA).createRoom(
          await playerA.getAddress(),
          { value: betAmount }
        )
      ).to.be.revertedWith("Cannot challenge yourself");
    });
  });

  describe("Room Joining", function () {
    beforeEach(async function () {
      await cashPongBet.connect(playerA).createRoom(
        await playerB.getAddress(),
        { value: betAmount }
      );
    });

    it("Should allow player B to join the room", async function () {
      const tx = await cashPongBet.connect(playerB).joinRoom(1, {
        value: betAmount
      });
      await tx.wait();

      const room = await cashPongBet.getRoom(1);
      expect(room.playerBJoined).to.be.true;
    });

    it("Should fail if wrong player tries to join", async function () {
      await expect(
        cashPongBet.connect(playerC).joinRoom(1, { value: betAmount })
      ).to.be.revertedWith("Not invited");
    });

    it("Should fail if bet amount doesn't match", async function () {
      await expect(
        cashPongBet.connect(playerB).joinRoom(1, {
          value: ethers.parseEther("0.02")
        })
      ).to.be.revertedWith("Incorrect bet amount");
    });

    it("Should fail if already joined", async function () {
      await cashPongBet.connect(playerB).joinRoom(1, { value: betAmount });
      
      await expect(
        cashPongBet.connect(playerB).joinRoom(1, { value: betAmount })
      ).to.be.revertedWith("Already joined");
    });
  });

  describe("Scoring Points", function () {
    beforeEach(async function () {
      await cashPongBet.connect(playerA).createRoom(
        await playerB.getAddress(),
        { value: betAmount }
      );
      await cashPongBet.connect(playerB).joinRoom(1, { value: betAmount });
    });

    it("Should allow player A to score", async function () {
      const tx = await cashPongBet.connect(playerA).scorePoint(1, await playerA.getAddress());
      await tx.wait();

      const room = await cashPongBet.getRoom(1);
      expect(room.scoreA).to.equal(1);
      expect(room.scoreB).to.equal(0);
    });

    it("Should allow player B to score", async function () {
      const tx = await cashPongBet.connect(playerB).scorePoint(1, await playerB.getAddress());
      await tx.wait();

      const room = await cashPongBet.getRoom(1);
      expect(room.scoreA).to.equal(0);
      expect(room.scoreB).to.equal(1);
    });

    it("Should fail if game hasn't started", async function () {
      // Create room but don't join
      await cashPongBet.connect(playerA).createRoom(
        await playerC.getAddress(),
        { value: betAmount }
      );

      await expect(
        cashPongBet.connect(playerA).scorePoint(2, await playerA.getAddress())
      ).to.be.revertedWith("Both players must join");
    });

    it("Should fail if game is finished", async function () {
      // Score 10 points for player A to win
      for (let i = 0; i < 10; i++) {
        await cashPongBet.connect(playerA).scorePoint(1, await playerA.getAddress());
      }

      await expect(
        cashPongBet.connect(playerB).scorePoint(1, await playerB.getAddress())
      ).to.be.revertedWith("Match already ended");
    });
  });

  describe("Game Ending", function () {
    beforeEach(async function () {
      await cashPongBet.connect(playerA).createRoom(
        await playerB.getAddress(),
        { value: betAmount }
      );
      await cashPongBet.connect(playerB).joinRoom(1, { value: betAmount });
    });

    it("Should end game when player A reaches 10 points", async function () {
      for (let i = 0; i < 10; i++) {
        await cashPongBet.connect(playerA).scorePoint(1, await playerA.getAddress());
      }

      const room = await cashPongBet.getRoom(1);
      expect(room.isFinished).to.be.true;
      expect(room.scoreA).to.equal(10);
    });

    it("Should end game when player B reaches 10 points", async function () {
      for (let i = 0; i < 10; i++) {
        await cashPongBet.connect(playerB).scorePoint(1, await playerB.getAddress());
      }

      const room = await cashPongBet.getRoom(1);
      expect(room.isFinished).to.be.true;
      expect(room.scoreB).to.equal(10);
    });
  });

  describe("Forfeit System", function () {
    beforeEach(async function () {
      await cashPongBet.connect(playerA).createRoom(
        await playerB.getAddress(),
        { value: betAmount }
      );
      await cashPongBet.connect(playerB).joinRoom(1, { value: betAmount });
    });

    it("Should allow forfeit after 10 minutes of inactivity", async function () {
      // Fast forward time by 11 minutes
      await ethers.provider.send("evm_increaseTime", [11 * 60]);
      await ethers.provider.send("evm_mine");

      const tx = await cashPongBet.connect(playerA).claimVictoryByForfeit(1);
      await tx.wait();

      const room = await cashPongBet.getRoom(1);
      expect(room.isFinished).to.be.true;
      expect(room.playerBForfeited).to.be.true;
    });

    it("Should fail if trying to forfeit too early", async function () {
      await expect(
        cashPongBet.connect(playerA).claimVictoryByForfeit(1)
      ).to.be.revertedWith("Match still active");
    });
  });

  describe("Owner Functions", function () {
    beforeEach(async function () {
      await cashPongBet.connect(playerA).createRoom(
        await playerB.getAddress(),
        { value: betAmount }
      );
      await cashPongBet.connect(playerB).joinRoom(1, { value: betAmount });
    });

    it("Should allow owner to force end game", async function () {
      const initialBalance = await ethers.provider.getBalance(await owner.getAddress());
      
      const tx = await cashPongBet.connect(owner).ownerForceEnd(1);
      await tx.wait();

      const room = await cashPongBet.getRoom(1);
      expect(room.isFinished).to.be.true;

      const finalBalance = await ethers.provider.getBalance(await owner.getAddress());
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should fail if non-owner tries to force end", async function () {
      await expect(
        cashPongBet.connect(playerA).ownerForceEnd(1)
      ).to.be.revertedWith("Only owner can call this");
    });
  });

  describe("Balance and Winnings", function () {
    it("Should correctly distribute winnings", async function () {
      // Create and join room
      await cashPongBet.connect(playerA).createRoom(
        await playerB.getAddress(),
        { value: betAmount }
      );
      await cashPongBet.connect(playerB).joinRoom(1, { value: betAmount });

      // Player A wins
      for (let i = 0; i < 10; i++) {
        await cashPongBet.connect(playerA).scorePoint(1, await playerA.getAddress());
      }

      const contractBalance = await cashPongBet.getBalance();
      expect(contractBalance).to.equal(0); // All winnings should be distributed
    });
  });
}); 