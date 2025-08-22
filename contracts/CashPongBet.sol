// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CashPongBet {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    struct Room {
        address playerA;
        address playerB;
        uint256 betAmount;
        uint8 scoreA;
        uint8 scoreB;
        bool playerAJoined;
        bool playerBJoined;
        bool isFinished;
        uint256 lastActionTimestamp;
        bool playerAForfeited;
        bool playerBForfeited;
    }

    mapping(uint256 => Room) public rooms;
    uint256 public roomCounter = 1;

    // ⚡️ Events
    event RoomCreated(uint256 roomId, address playerA, address playerB, uint256 betAmount);
    event PlayerJoined(uint256 roomId, address player);
    event PointScored(uint256 roomId, address scorer, uint8 scoreA, uint8 scoreB);
    event MatchEnded(uint256 roomId, address winner);
    event VictoryByForfeit(uint256 roomId, address winner);
    event OwnerForcedEnd(uint256 roomId);
    event WinningsPaid(uint256 roomId, address winner, uint256 amount);

    modifier onlyPlayer(uint256 roomId) {
        require(
            msg.sender == rooms[roomId].playerA || msg.sender == rooms[roomId].playerB,
            "Not a participant"
        );
        _;
    }

    function createRoom(address _opponent) external payable {
        require(msg.value > 0, "Must bet ETH");
        require(msg.sender != _opponent, "Cannot challenge yourself");

        Room storage room = rooms[roomCounter];
        room.playerA = msg.sender;
        room.playerB = _opponent;
        room.betAmount = msg.value;
        room.playerAJoined = true;
        room.lastActionTimestamp = block.timestamp;

        emit RoomCreated(roomCounter, msg.sender, _opponent, msg.value);
        roomCounter++;
    }

    function joinRoom(uint256 roomId) external payable {
        Room storage room = rooms[roomId];
        require(msg.sender == room.playerB, "Not invited");
        require(msg.value == room.betAmount, "Incorrect bet amount");
        require(!room.playerBJoined, "Already joined");

        room.playerBJoined = true;
        room.lastActionTimestamp = block.timestamp;

        emit PlayerJoined(roomId, msg.sender);
    }

    function scorePoint(uint256 roomId, address scorer) external onlyPlayer(roomId) {
        Room storage room = rooms[roomId];
        require(room.playerAJoined && room.playerBJoined, "Both players must join");
        require(!room.isFinished, "Match already ended");
        require(scorer == room.playerA || scorer == room.playerB, "Invalid scorer");

        if (scorer == room.playerA) {
            room.scoreA++;
        } else {
            room.scoreB++;
        }

        emit PointScored(roomId, scorer, room.scoreA, room.scoreB);

        room.lastActionTimestamp = block.timestamp;

        if (room.scoreA >= 10) {
            room.isFinished = true;
            _distributeWinnings(roomId, payable(room.playerA));
            emit MatchEnded(roomId, room.playerA);
        } else if (room.scoreB >= 10) {
            room.isFinished = true;
            _distributeWinnings(roomId, payable(room.playerB));
            emit MatchEnded(roomId, room.playerB);
        }
    }

    function claimVictoryByForfeit(uint256 roomId) external onlyPlayer(roomId) {
        Room storage room = rooms[roomId];
        require(!room.isFinished, "Match already finished");
        require(room.playerAJoined && room.playerBJoined, "Match not started");

        uint256 inactiveTime = 60; // 60 seconds
        require(block.timestamp > room.lastActionTimestamp + inactiveTime, "Match still active");

        address payable winner;

        // FIXED LOGIC: Allow any player to claim victory after opponent inactivity
        if (msg.sender == room.playerA) {
            // PlayerA claims victory due to PlayerB inactivity
            room.playerBForfeited = true;
            winner = payable(room.playerA);
        } else if (msg.sender == room.playerB) {
            // PlayerB claims victory due to PlayerA inactivity
            room.playerAForfeited = true;
            winner = payable(room.playerB);
        } else {
            revert("Not a participant"); // This should never happen due to onlyPlayer modifier
        }

        room.isFinished = true;
        _distributeWinnings(roomId, winner);
        emit VictoryByForfeit(roomId, winner);
    }


    function voluntaryForfeit(uint256 roomId) external onlyPlayer(roomId) {
    Room storage room = rooms[roomId];
    require(!room.isFinished, "Match already finished");
    require(room.playerAJoined && room.playerBJoined, "Match not started");

    address payable winner;

    if (msg.sender == room.playerA && !room.playerAForfeited) {
        room.playerAForfeited = true;
        winner = payable(room.playerB);
    } else if (msg.sender == room.playerB && !room.playerBForfeited) {
        room.playerBForfeited = true;
        winner = payable(room.playerA);
    } else {
        revert("Already forfeited or invalid");
    }

    room.isFinished = true;
    _distributeWinnings(roomId, winner);
    emit VictoryByForfeit(roomId, winner);
}


    function ownerForceEnd(uint256 roomId) external {
        require(msg.sender == owner, "Only owner can call this");
        Room storage room = rooms[roomId];
        require(!room.isFinished, "Match already finished");

        uint256 total = room.betAmount * 2;
        room.isFinished = true;

        (bool sent, ) = payable(owner).call{value: total}("");
        require(sent, "Transfer failed");

        emit OwnerForcedEnd(roomId);
    }

    function _distributeWinnings(uint256 roomId, address payable winner) internal {
        Room storage room = rooms[roomId];
        uint256 total = room.betAmount * 2;
        uint256 fee = (total * 10) / 100;
        uint256 winnings = total - fee;

        (bool sent1, ) = winner.call{value: winnings}("");
        require(sent1, "Failed to send winnings");

        (bool sent2, ) = payable(owner).call{value: fee}("");
        require(sent2, "Failed to send fee");

        emit WinningsPaid(roomId, winner, winnings);
    }

    function getRoom(uint256 roomId) external view returns (Room memory) {
        return rooms[roomId];
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
