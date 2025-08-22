// === CONFIGURATION FIREBASE ===
const firebaseConfig = {
  apiKey: "AIzaSyDRlUSHDPOduNaFqX5i6psFwzZ39xPoMpc",
  authDomain: "cashpong.firebaseapp.com",
  projectId: "cashpong",
  storageBucket: "cashpong.firebasestorage.app",
  messagingSenderId: "369189144835",
  appId: "1:369189144835:web:4514c500e2c58800d10136"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// === EVENT HANDLERS POUR L'AUTHENTIFICATION ===

// Password visibility toggles
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const button = passwordInput.nextElementSibling;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        button.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        button.textContent = '👁️';
    }
}

function toggleNewPasswordVisibility() {
    const passwordInput = document.getElementById('newPassword');
    const button = passwordInput.nextElementSibling;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        button.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        button.textContent = '👁️';
    }
}

// Fonctions d'authentification Firebase
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;

    if (!email || !password || !username) {
        alert('⚠️ Veuillez remplir tous les champs');
        return;
    }

    console.log('🔑 Tentative de connexion...');
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log('✅ Connexion réussie:', user.uid);
            
            // Connecter au serveur Socket.IO avec le nom d'utilisateur
            connectToSocketServer(username);
            
            // Masquer la section d'authentification
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('metamaskSection').style.display = 'block';
            document.getElementById('peerControls').style.display = 'block';
            document.getElementById('joinRoomControls').style.display = 'block';
            
            alert('🎉 Connexion réussie ! Connectez maintenant MetaMask.');
            
            // Automatically try to connect MetaMask if available
            setTimeout(() => {
                if (typeof window.ethereum !== 'undefined') {
                    console.log('🦊 Tentative de connexion automatique à MetaMask...');
                    testButtonClick();
                }
            }, 1000);
        })
        .catch((error) => {
            console.error('❌ Erreur de connexion:', error);
            
            let errorMsg = 'Erreur de connexion';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMsg = 'Utilisateur non trouvé';
                    break;
                case 'auth/wrong-password':
                    errorMsg = 'Mot de passe incorrect';
                    break;
                case 'auth/invalid-email':
                    errorMsg = 'Email invalide';
                    break;
                case 'auth/too-many-requests':
                    errorMsg = 'Trop de tentatives. Réessayez plus tard.';
                    break;
                default:
                    errorMsg = error.message;
            }
            
            alert('❌ ' + errorMsg);
        });
}

function logout() {
    auth.signOut().then(() => {
        console.log('🚪 Déconnexion réussie');
        
        // Réinitialiser l'interface
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('metamaskSection').style.display = 'none';
        document.getElementById('peerControls').style.display = 'none';
        document.getElementById('joinRoomControls').style.display = 'none';
        
        // Déconnecter Socket.IO
        if (socket) {
            socket.disconnect();
        }
        
        // Réinitialiser les variables
        currentUsername = "";
        opponentUsername = null;
        isConnected = false;
        isHost = false;
        
        alert('👋 Déconnexion réussie !');
    }).catch((error) => {
        console.error('❌ Erreur de déconnexion:', error);
        alert('❌ Erreur lors de la déconnexion');
    });
}

function showCreateAccountForm() {
    document.getElementById('createAccountSection').style.display = 'block';
    document.getElementById('authSection').style.display = 'none';
}

function hideCreateAccountForm() {
    document.getElementById('createAccountSection').style.display = 'none';
    document.getElementById('authSection').style.display = 'block';
}

function createAccount() {
    const username = document.getElementById('newUsername').value;
    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPassword').value;

    if (!username || !email || !password) {
        alert('⚠️ Veuillez remplir tous les champs');
        return;
    }

    if (password.length < 6) {
        alert('⚠️ Le mot de passe doit contenir au moins 6 caractères');
        return;
    }

    console.log('📝 Création de compte...');
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log('✅ Compte créé:', user.uid);
            
            // Mettre à jour le profil avec le nom d'utilisateur
            return user.updateProfile({
                displayName: username
            });
        })
        .then(() => {
            alert('🎉 Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
            hideCreateAccountForm();
            
            // Pré-remplir les champs de connexion
            document.getElementById('email').value = email;
            document.getElementById('username').value = username;
        })
        .catch((error) => {
            console.error('❌ Erreur de création de compte:', error);
            
            let errorMsg = 'Erreur de création de compte';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMsg = 'Cette adresse email est déjà utilisée';
                    break;
                case 'auth/invalid-email':
                    errorMsg = 'Adresse email invalide';
                    break;
                case 'auth/weak-password':
                    errorMsg = 'Mot de passe trop faible';
                    break;
                default:
                    errorMsg = error.message;
            }
            
            alert('❌ ' + errorMsg);
        });
}

function resetPassword() {
    const email = document.getElementById('email').value;
    
    if (!email) {
        alert('⚠️ Veuillez entrer votre adresse email d\'abord');
        return;
    }
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            alert('📧 Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
        })
        .catch((error) => {
            console.error('❌ Erreur de réinitialisation:', error);
            alert('❌ Erreur lors de l\'envoi de l\'email de réinitialisation');
        });
}

// === FONCTION SOCKET.IO POUR LE MULTIJOUEUR ===

// Variables globales pour Socket.IO
let socket;
let currentUsername = "";
let opponentUsername = null;
let isConnected = false;
let isHost = false;
let gameIsOver = false;

function connectToSocketServer(username) {
    console.log('🔌 Connexion au serveur Socket.IO avec username:', username);
    
    socket = io("http://localhost:3000");

    socket.on("connect", () => {
        console.log("🟢 Socket connecté : ", socket.id);

        window.currentUsername = username;
        window.opponentUsername = null;
        window.hasPlacedBet = false;

        // Always send MetaMask address if available
        let ethAddressToSend = window.connectedWallet || "";
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

    socket.on("disconnect", () => {
        console.log("🔴 Socket déconnecté");
    });

    socket.on("error", (error) => {
        console.error("❌ Erreur Socket.IO:", error);
    });

    // Écouter les notifications de room disponible
    socket.on("roomAvailable", (data) => {
        console.log("📢 Notification room disponible reçue:", data);
        showRoomAvailableNotification(data);
    });

    // Rendre socket accessible globalement
    window.socket = socket;
    
    console.log('✅ Connexion Socket.IO initialisée');
}

// === FONCTIONS METAMASK ET WEB3 ===

// Variables globales MetaMask
let connectedWallet = null;
let web3 = null;
let contract = null;
let cashPongContract = null;

// Adresse du contrat sur Polygon Mainnet (global variable)
window.CONTRACT_ADDRESS = "0xdb51573EeBE611CEA7e31F0FE2A92Cbb7929b896";
const CONTRACT_ADDRESS = window.CONTRACT_ADDRESS;

// Configuration Polygon Mainnet - make globally available
const POLYGON_CHAIN_ID = "0x89"; // 137 in hex
window.POLYGON_CHAIN_ID = POLYGON_CHAIN_ID; // Make globally available
const POLYGON_PARAMS = {
  chainId: POLYGON_CHAIN_ID,
  chainName: "Polygon Mainnet",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18
  },
  rpcUrls: ["https://polygon-rpc.com/"],
  blockExplorerUrls: ["https://polygonscan.com/"]
};
window.POLYGON_PARAMS = POLYGON_PARAMS; // Make globally available

// Force Polygon Mainnet in MetaMask
async function forcePolygonMainnet() {
  console.log("🔍 Vérification du réseau...");
  
  if (typeof window.ethereum === "undefined") {
    console.log("❌ MetaMask non disponible");
    return false;
  }
  
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    console.log(`🔗 Réseau actuel: ${chainId} (Polygon: ${POLYGON_CHAIN_ID})`);
    
    if (chainId !== POLYGON_CHAIN_ID) {
      console.log("⚠️ Mauvais réseau détecté, basculement vers Polygon...");
      
      try {
        // Try to switch first
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: POLYGON_CHAIN_ID }]
        });
        console.log("✅ Basculement vers Polygon réussi");
      } catch (switchError) {
        console.log("⚠️ Réseau Polygon non trouvé, ajout du réseau...");
        
        // If switch fails, add the network
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [POLYGON_PARAMS]
          });
          console.log("✅ Réseau Polygon ajouté et sélectionné");
        } else {
          throw switchError;
        }
      }
    } else {
      console.log("✅ Déjà sur Polygon Mainnet");
    }
    
    return true;
  } catch (err) {
    console.error("❌ Erreur de basculement réseau:", err);
    if (err.code === 4001) {
      alert("⚠️ Changement de réseau refusé. Veuillez basculer manuellement vers Polygon Mainnet dans MetaMask.");
    } else {
      alert("❌ Impossible de passer sur Polygon Mainnet : " + err.message);
    }
    return false;
  }
}

// Connexion MetaMask
async function connectWallet() {
  console.log("🔍 Tentative de connexion MetaMask...");
  
  if (typeof window.ethereum !== "undefined") {
    console.log("✅ MetaMask détecté");
    
    try {
      console.log("⏳ Forçage vers Polygon Mainnet...");
      await forcePolygonMainnet();

      console.log("⏳ Demande d'accès aux comptes...");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      
      if (!accounts || accounts.length === 0) {
        throw new Error("Aucun compte MetaMask disponible");
      }
      
      connectedWallet = accounts[0];
      console.log(`✅ Compte connecté: ${connectedWallet}`);

      console.log("⏳ Initialisation Web3...");
      web3 = new Web3(window.ethereum);

      console.log("⏳ Initialisation des contrats...");
      contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);
      cashPongContract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);

      // Variables globales
      window.web3 = web3;
      window.contract = contract;
      window.connectedWallet = connectedWallet;
      window.cashPongContract = cashPongContract;

      // Afficher l'adresse wallet
      const walletAddressElement = document.getElementById("walletAddress");
      if (walletAddressElement) {
        walletAddressElement.innerText = shorten(connectedWallet);
        walletAddressElement.style.color = "#4CAF50";
        walletAddressElement.style.fontWeight = "bold";
      }
      
      console.log("✅ Contrat connecté avec succès !");
      alert("✅ MetaMask connecté avec succès !\n\nAdresse: " + shorten(connectedWallet));
      
      return true;
    } catch (error) {
      console.error("❌ Erreur connexion MetaMask:", error);
      
      let errorMessage = "Connexion MetaMask échouée";
      if (error.code === 4001) {
        errorMessage = "Connexion refusée par l'utilisateur";
      } else if (error.code === -32002) {
        errorMessage = "Demande de connexion déjà en cours. Vérifiez MetaMask.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert("❌ " + errorMessage);
      return false;
    }
  } else {
    console.log("❌ MetaMask non détecté");
    showMetaMaskInstallationGuide();
    return false;
  }
}

// Force reconnexion MetaMask
async function forceReconnectWallet() {
  try {
    if (typeof window.ethereum !== "undefined") {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      });
    }
    
    connectedWallet = null;
    document.getElementById("walletAddress").innerText = "";
    
    await connectWallet();
    
    console.log("✅ Force reconnected successfully!");
  } catch (error) {
    console.error("❌ Force reconnect failed:", error);
  }
}

// Raccourcir adresse
function shorten(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// Guide d'installation MetaMask
function showMetaMaskInstallationGuide() {
  const metamaskSection = document.getElementById("metamaskSection");
  
  const guideHTML = `
    <div style="background: rgba(255, 107, 53, 0.1); border: 2px solid #ff6b35; border-radius: 10px; padding: 15px; margin: 10px 0;">
      <h3 style="color: #ff6b35; margin: 0 0 10px 0;">🦊 MetaMask n'est pas installé</h3>
      <p style="color: #333; margin: 0 0 15px 0;">Pour utiliser cette application, vous devez installer MetaMask :</p>
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
      <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
        Après l'installation, rechargez cette page et cliquez sur "Connecter Metamask"
      </p>
    </div>
  `;
  
  metamaskSection.innerHTML = guideHTML;
}

// Vérifier disponibilité MetaMask
function checkMetaMaskAvailability() {
  if (typeof window.ethereum !== "undefined") {
    restoreMetaMaskButtons();
    alert("✅ MetaMask détecté ! Vous pouvez maintenant vous connecter.");
  } else {
    alert("❌ MetaMask n'est toujours pas détecté. Assurez-vous de l'avoir installé et rechargez la page.");
  }
}

// Restaurer boutons MetaMask
function restoreMetaMaskButtons() {
  const metamaskSection = document.getElementById("metamaskSection");
  metamaskSection.innerHTML = `
    <h2>🦊 Wallet MetaMask</h2>
    <button id="connectWalletBtn">🦊 Connecter Metamask</button>
    <button id="forceReconnectBtn" class="force-reconnect-btn">🔄 Demo: Force Reconnect</button>
    <span id="walletAddress"></span>
  `;
  
  // Rebind events
  document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
  document.getElementById('forceReconnectBtn').addEventListener('click', forceReconnectWallet);
}

// Vérifier MetaMask au chargement
function checkMetaMaskOnLoad() {
  if (typeof window.ethereum === "undefined") {
    showMetaMaskInstallationGuide();
  }
}

// === ABI DU CONTRAT COMPLET ===
window.contractABI = [
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
];
const contractABI = window.contractABI; // Local reference to global ABI

// === FONCTIONS UTILITAIRES ===

// Initialisation Web3
async function initWeb3() {
  if (typeof window.ethereum === "undefined") {
    console.warn("🦊 MetaMask n'est pas installé");
    return false;
  }
  
  try {
    web3 = new Web3(window.ethereum);
    window.web3 = web3;
    return true;
  } catch (error) {
    console.error("❌ Erreur d'initialisation Web3:", error);
    return false;
  }
}

// Fonction pour obtenir les informations d'une room
async function getRoomInfo(roomId) {
  try {
    if (!cashPongContract) {
      console.error("❌ Contrat non initialisé");
      return null;
    }
    
    const room = await cashPongContract.methods.getRoom(roomId).call();
    return room;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des infos de la room:", error);
    return null;
  }
}

// === FONCTION DE TEST METAMASK ===
function testMetaMaskDetection() {
  console.log("🔍 Test de détection MetaMask...");
  console.log("window.ethereum:", typeof window.ethereum);
  console.log("window.ethereum disponible:", window.ethereum !== undefined);
  
  if (window.ethereum) {
    console.log("✅ MetaMask détecté");
    console.log("Provider:", window.ethereum.isMetaMask ? "MetaMask" : "Autre");
    console.log("Chain ID actuel:", window.ethereum.chainId);
  } else {
    console.log("❌ MetaMask non détecté");
    console.log("Providers disponibles:", Object.keys(window).filter(key => key.includes('ethereum')));
  }
}

// Fonction de test simple pour le bouton
function testButtonClick() {
  console.log("🎯 Test du bouton - fonction appelée");
  alert("Le bouton fonctionne ! MetaMask va maintenant s'ouvrir...");
  
  // Test de détection MetaMask immédiat
  if (typeof window.ethereum !== 'undefined') {
    console.log("✅ MetaMask détecté dans testButtonClick");
    
    // Vérifier d'abord si on est déjà connecté
    window.ethereum.request({ method: 'eth_accounts' })
      .then(accounts => {
        if (accounts && accounts.length > 0) {
          // Déjà connecté !
          console.log("✅ Déjà connecté à MetaMask:", accounts[0]);
          alert("✅ Déjà connecté ! Compte: " + accounts[0].substring(0, 10) + "...");
          
          // Afficher l'adresse
          const walletElement = document.getElementById("walletAddress");
          if (walletElement) {
            walletElement.innerText = "Connecté: " + accounts[0].substring(0, 6) + "..." + accounts[0].substring(38);
            walletElement.style.color = "#4CAF50";
          }
          
          // Sauvegarder globalement
          window.connectedWallet = accounts[0];
          connectedWallet = accounts[0];
          
          // Initialiser Web3 aussi
          initializeWeb3WithAccount(accounts[0]);
          
        } else {
          // Pas connecté, demander la connexion
          console.log("🔌 Demande de connexion MetaMask...");
          alert("✅ MetaMask détecté ! Tentative de connexion...");
          
          window.ethereum.request({ method: 'eth_requestAccounts' })
            .then(newAccounts => {
              console.log("✅ Comptes récupérés:", newAccounts);
              alert("✅ Connexion réussie ! Compte: " + newAccounts[0].substring(0, 10) + "...");
              
              // Afficher l'adresse
              const walletElement = document.getElementById("walletAddress");
              if (walletElement) {
                walletElement.innerText = "Connecté: " + newAccounts[0].substring(0, 6) + "..." + newAccounts[0].substring(38);
                walletElement.style.color = "#4CAF50";
              }
              
              // Sauvegarder globalement
              window.connectedWallet = newAccounts[0];
              connectedWallet = newAccounts[0];
              
              // Initialiser Web3
              initializeWeb3WithAccount(newAccounts[0]);
              
            })
            .catch(error => {
              console.error("❌ Erreur MetaMask:", error);
              
              if (error.code === -32002) {
                alert("⚠️ MetaMask traite déjà une demande de connexion.\n\nVeuillez :\n1. Cliquer sur l'extension MetaMask\n2. Accepter ou refuser la demande en cours\n3. Réessayer");
              } else if (error.code === 4001) {
                alert("❌ Connexion refusée par l'utilisateur");
              } else {
                alert("❌ Erreur: " + error.message);
              }
            });
        }
      })
      .catch(error => {
        console.error("❌ Erreur de vérification des comptes:", error);
        alert("❌ Erreur lors de la vérification des comptes MetaMask");
      });
      
  } else {
    console.log("❌ MetaMask NON détecté");
    alert("❌ MetaMask n'est pas installé ou activé !\n\nVeuillez :\n1. Installer MetaMask\n2. Recharger la page\n3. Réessayer");
  }
}

// Fonction pour initialiser Web3 avec un compte
function initializeWeb3WithAccount(account) {
  try {
    if (!window.web3) {
      if (!window.ethereum) {
        throw new Error("MetaMask not detected");
      }
      web3 = new Web3(window.ethereum);
      window.web3 = web3;
      console.log("🔧 New Web3 instance created");
    } else {
      web3 = window.web3; // Use existing instance
      console.log("🔧 Using existing Web3 instance");
    }
    
    // Verify Web3 is properly initialized
    if (!web3 || !web3.eth) {
      throw new Error("Web3 not properly initialized");
    }
    
    if (!window.cashPongContract && web3 && web3.eth) {
      cashPongContract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);
      window.cashPongContract = cashPongContract;
      console.log("🔧 Contract instance created");
    }
    
    console.log("✅ Web3 et contrat initialisés pour:", account);
    
    // Re-register with socket server if connected, now with MetaMask address
    if (window.socket && window.socket.connected && window.currentUsername) {
      console.log("🔄 Re-registration avec MetaMask address:", account);
      window.socket.emit("register", {
        username: window.currentUsername,
        ethAddress: account,
        role: window.playerRole || "player"
      });
    }
  } catch (error) {
    console.error("❌ Erreur initialisation Web3:", error);
  }
}

// Fonction pour réinitialiser la connexion MetaMask
function resetMetaMaskConnection() {
  console.log("🔧 Réinitialisation de la connexion MetaMask...");
  
  // Effacer les variables globales
  window.connectedWallet = null;
  connectedWallet = null;
  web3 = null;
  contract = null;
  cashPongContract = null;
  
  // Effacer l'affichage
  const walletElement = document.getElementById("walletAddress");
  if (walletElement) {
    walletElement.innerText = "";
  }
  
  alert("🔧 Connexion MetaMask réinitialisée !\n\nVous pouvez maintenant reconnecter votre wallet.");
  
  console.log("✅ Reset terminé");
}

// === FONCTIONS DE GESTION DES ROOMS ===

// Fonction pour créer une room
async function onBetButtonClick() {
  const betInput = document.getElementById("betAmount").value;
  const opponentAddress = document.getElementById("otherPeerId").value.trim();
  const betAmount = parseFloat(betInput);

  // Validation des entrées
  if (isNaN(betAmount) || betAmount <= 0) {
    alert("❌ Montant de mise invalide.");
    return;
  }

  if (!web3 || !web3.utils) {
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

  if (!web3.utils) {
    alert("❌ Web3 utils non disponible. Vérifiez votre connexion MetaMask.");
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
    console.log("🔍 Adresse du contrat :", CONTRACT_ADDRESS);
    console.log("🔍 Contrat initialisé :", !!cashPongContract);

    // Tester l'appel au contrat d'abord
    try {
      const owner = await cashPongContract.methods.owner().call();
      console.log("✅ Contrat accessible, owner :", owner);
    } catch (contractError) {
      console.error("❌ Erreur d'accès au contrat :", contractError);
      alert("❌ Le contrat n'est pas accessible à l'adresse " + CONTRACT_ADDRESS + ". Vérifiez le réseau et l'adresse du contrat.");
      return;
    }

    alert("⏳ Création de la room et envoi de la mise...");

    // Récupérer le roomCounter AVANT la transaction pour connaître le prochain Room ID
    const currentCounter = await cashPongContract.methods.roomCounter().call();
    const nextRoomId = parseInt(currentCounter); // Le prochain Room ID sera le compteur actuel
    console.log("🔍 Prochain Room ID sera :", nextRoomId);

    // Appel du contrat smart contract pour créer la room
    const tx = await cashPongContract.methods.createRoom(opponentAddress).send({
      from: connectedWallet,
      value: amountInWei,
      gas: 300000, // Limite de gas
      gasPrice: web3.utils.toWei('50', 'gwei') // Gas price plus élevé pour Polygon
    });

    console.log("✅ Transaction createRoom confirmée :", tx.transactionHash);

    // Utiliser le Room ID prédit
    const newRoomId = nextRoomId;
    console.log("🏠 Room ID utilisé :", newRoomId);

    // Stocker les informations de la room
    localStorage.setItem("currentRoomId", newRoomId);
    localStorage.setItem("role", "host");
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
    
    const betButton = document.getElementById("betButton");
    if (betButton) {
      betButton.disabled = true;
      betButton.innerText = "Room créée";
    }

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

// Fonction pour rejoindre une room
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

    console.log("🔍 Tentative de rejoindre la room :", roomIdInput);

    // Vérifier les informations de la room sur la blockchain
    const room = await getRoomInfo(roomIdInput);
    if (!room || !room.playerA || room.playerA === "0x0000000000000000000000000000000000000000") {
      alert("❌ Room introuvable sur la blockchain. Vérifiez le Room ID.");
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

    if (!web3.utils) {
      alert("❌ Web3 utils non disponible. Vérifiez votre connexion MetaMask.");
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
    window.currentRoomId = roomIdInput;
    window.opponentEthAddress = room.playerA;

    alert("✅ Room rejointe avec succès ! La partie peut commencer.");

    // Mettre à jour l'interface
    document.getElementById("joinInfo").innerHTML = `
      <div style="background: #e8f4ff; padding: 15px; border-radius: 10px; border: 2px solid #2196F3; margin: 10px 0;">
        <h3 style="color: #2196F3; margin: 0 0 10px 0;">🎮 Room rejointe avec succès !</h3>
        <div style="color: #666;">🏠 Room ID : ${roomIdInput}</div>
        <div style="color: #666;">💰 Mise : ${betAmountEth} ETH</div>
        <div style="color: #666;">👥 Adversaire : ${room.playerA.substring(0,6)}...${room.playerA.substring(38)}</div>
        <div style="margin-top: 10px; color: #4CAF50; font-weight: bold;">✅ Prêt à jouer !</div>
      </div>
    `;

    // Cacher les contrôles de jointure
    document.getElementById("joinRoomControls").style.display = "none";

  } catch (err) {
    console.error("❌ Erreur lors de la jointure de la room :", err);
    let errMsg = err?.message || err?.toString();
    if (err?.data?.message) errMsg = err.data.message;
    if (err?.data?.reason) errMsg = err.data.reason;
    alert("❌ Erreur lors de la jointure : " + errMsg);
  }
}

// Fonction pour copier le Room ID
function copyRoomId(roomId) {
  navigator.clipboard.writeText(roomId).then(function() {
    alert('📋 Room ID copié dans le presse-papiers : ' + roomId);
  }, function() {
    // Fallback pour les navigateurs plus anciens
    const textArea = document.createElement('textarea');
    textArea.value = roomId;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('📋 Room ID copié : ' + roomId);
  });
}

// Rendre les fonctions accessibles globalement
window.onBetButtonClick = onBetButtonClick;
window.joinRoomManually = joinRoomManually;
window.copyRoomId = copyRoomId;

function createAccount() {
    // Implementation needed
    console.log('Create account function called');
}

function resetPassword() {
    // Implementation needed
    console.log('Reset password function called');
}

// Wallet functions (placeholders - implement according to your needs)
function connectWallet() {
    // Implementation needed
    console.log('Connect wallet function called');
}

function forceReconnectWallet() {
    // Implementation needed
    console.log('Force reconnect wallet function called');
}

// Game functions (placeholders - implement according to your needs)
function connectToPeer() {
    // Cette fonction sera remplacée par celle du script principal
    // Vérifier si la fonction existe dans le script principal
    if (window.connectToPeer && typeof window.connectToPeer === 'function') {
        window.connectToPeer();
    } else {
        console.log('Connect to peer function called - waiting for main script to load');
    }
}

function handlePlayClick() {
    // Implementation needed
    console.log('Play button clicked');
}

function resetGame() {
    // Implementation needed
    console.log('Reset game function called');
}

function leaveMatch() {
    // Implementation needed
    console.log('Leave match function called');
}

// Chat functions
function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    const unreadBadge = document.getElementById('unreadBadge');
    
    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'flex';
        unreadBadge.style.display = 'none';
        unreadBadge.textContent = '0';
    } else {
        chatWindow.style.display = 'none';
    }
}

// sendChatMessage function removed - chat handled by script-li-khask-tchuf.js

// === FONCTIONS POUR NOTIFICATIONS DE ROOM ===

function showRoomAvailableNotification(data) {
  // Créer une notification visuelle pour informer le joueur qu'une salle est disponible
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = '#4CAF50';
  notification.style.color = 'white';
  notification.style.padding = '15px';
  notification.style.borderRadius = '5px';
  notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
  notification.style.zIndex = '10000';
  notification.style.maxWidth = '300px';
  
  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 10px;">🎮 Salle de jeu disponible !</div>
    <div style="margin-bottom: 10px;">
      <strong>Adversaire:</strong> ${data.opponent}<br>
      <strong>Mise:</strong> ${data.betAmount} ETH<br>
      <strong>Salle ID:</strong> ${data.roomId}
    </div>
    <div style="margin-bottom: 10px;">${data.message}</div>
    <button onclick="
      document.getElementById('roomIdToJoin').value = '${data.roomId}';
      joinRoomManually();
      this.parentElement.remove();
    " style="
      background: #fff; 
      color: #4CAF50; 
      border: none; 
      padding: 8px 16px; 
      border-radius: 3px; 
      cursor: pointer;
      margin-right: 10px;
      font-weight: bold;
    ">Rejoindre</button>
    <button onclick="this.parentElement.remove()" style="
      background: #f44336; 
      color: white; 
      border: none; 
      padding: 8px 16px; 
      border-radius: 3px; 
      cursor: pointer;
    ">Ignorer</button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-suppression après 30 secondes
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 30000);
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Password visibility toggles
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach((toggle, index) => {
        toggle.addEventListener('click', function() {
            if (index === 0) {
                togglePasswordVisibility();
            } else {
                toggleNewPasswordVisibility();
            }
        });
    });

    // Authentication buttons
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const showCreateAccountBtn = document.getElementById('showCreateAccountBtn');
    const createAccountBtn = document.getElementById('createAccountBtn');
    const hideCreateAccountBtn = document.getElementById('hideCreateAccountBtn');
    const resetPasswordLink = document.getElementById('resetPasswordLink');

    if (loginBtn) loginBtn.addEventListener('click', login);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (showCreateAccountBtn) showCreateAccountBtn.addEventListener('click', showCreateAccountForm);
    if (createAccountBtn) createAccountBtn.addEventListener('click', createAccount);
    if (hideCreateAccountBtn) hideCreateAccountBtn.addEventListener('click', hideCreateAccountForm);
    if (resetPasswordLink) resetPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        resetPassword();
    });

    // Wallet buttons
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const forceReconnectBtn = document.getElementById('forceReconnectBtn');

    if (connectWalletBtn) connectWalletBtn.addEventListener('click', connectWallet);
    if (forceReconnectBtn) forceReconnectBtn.addEventListener('click', forceReconnectWallet);

    // Game buttons
    const betButton = document.getElementById('betButton');
    const playButton = document.getElementById('playButton');
    const resetGameBtn = document.getElementById('resetGameBtn');
    const leaveMatchBtn = document.getElementById('leaveMatchBtn');
    const joinRoomButton = document.getElementById("joinRoomButton");

    if (betButton) {
        betButton.addEventListener("click", onBetButtonClick);
    }

    if (joinRoomButton) {
        joinRoomButton.addEventListener("click", async () => {
            const roomIdToJoin = document.getElementById("roomIdToJoin").value.trim();
            if (!roomIdToJoin) {
              alert("❌ Veuillez entrer un Room ID");
              return;
            }
            
            // Appeler la fonction de jointure manuelle
            await joinRoomManually(roomIdToJoin);
        });
    }

    // Event listener pour réclamer la victoire manuellement
    const claimVictoryButton = document.getElementById("claimVictoryButton");
    if (claimVictoryButton) {
        claimVictoryButton.addEventListener("click", async () => {
            await claimVictoryManually();
        });
    }

    if (playButton) playButton.addEventListener('click', handlePlayClick);
    if (resetGameBtn) resetGameBtn.addEventListener('click', resetGame);
    if (leaveMatchBtn) leaveMatchBtn.addEventListener('click', leaveMatch);

    // Chat functionality - handled by script-li-khask-tchuf.js
    const chatBubble = document.getElementById('chatBubble');
    if (chatBubble) chatBubble.addEventListener('click', toggleChat);
});

// Event Handlers for CashPong

// Configuration des événements du contrat
const CONTRACT_EVENTS = {
  RoomCreated: "RoomCreated",
  PlayerJoined: "PlayerJoined",
  PointScored: "PointScored",
  MatchEnded: "MatchEnded",
  VictoryByForfeit: "VictoryByForfeit",
  OwnerForcedEnd: "OwnerForcedEnd",
  WinningsPaid: "WinningsPaid"
};

// Gestionnaire des événements blockchain
class ContractEventManager {
  constructor(contract, wallet) {
    this.contract = contract;
    this.wallet = wallet;
    this.listeners = {};
    this.isListening = false;
  }

  // Démarrer l'écoute de tous les événements
  startListening() {
    if (this.isListening || !this.contract) return;
    
    console.log("📡 Démarrage de l'écoute des événements du contrat...");
    
    Object.values(CONTRACT_EVENTS).forEach(eventName => {
      this.listenToEvent(eventName);
    });
    
    this.isListening = true;
  }
  
  // Écouter un événement spécifique
  listenToEvent(eventName) {
    if (!this.contract || !this.contract.events || typeof this.contract.events[eventName] !== 'function') {
      console.warn(`⚠️ Événement '${eventName}' non disponible`);
      return;
    }
    
    console.log(`📡 Écoute de l'événement: ${eventName}`);
    
    this.listeners[eventName] = this.contract.events[eventName](
      { fromBlock: 'latest' },
      (error, event) => {
        if (error) {
          console.error(`❌ Erreur sur l'événement ${eventName}:`, error);
          return;
        }
        
        console.log(`✅ Événement ${eventName} détecté:`, event.returnValues);
        
        // Dispatch de l'événement
        this.handleEvent(eventName, event);
      }
    );
  }
  
  // Arrêter l'écoute
  stopListening() {
    if (!this.isListening) return;
    
    Object.values(this.listeners).forEach(listener => {
      if (listener && typeof listener.unsubscribe === 'function') {
        listener.unsubscribe();
      }
    });
    
    this.listeners = {};
    this.isListening = false;
    console.log("🛑 Arrêt de l'écoute des événements du contrat");
  }
  
  // Traitement des événements
  handleEvent(eventName, event) {
    const values = event.returnValues;
    
    switch(eventName) {
      case CONTRACT_EVENTS.VictoryByForfeit:
        this.handleVictoryByForfeit(values);
        break;
      case CONTRACT_EVENTS.MatchEnded:
        this.handleMatchEnded(values);
        break;
      case CONTRACT_EVENTS.WinningsPaid:
        this.handleWinningsPaid(values);
        break;
    }
    
    // Émettre un événement DOM personnalisé
    const customEvent = new CustomEvent('contract-event', {
      detail: { type: eventName, data: values }
    });
    window.dispatchEvent(customEvent);
  }
  
  // Gestion spécifique pour les victoires par forfait
  handleVictoryByForfeit(data) {
    const { roomId, winner } = data;
    
    if (this.wallet && this.wallet.toLowerCase() === winner.toLowerCase()) {
      // Notification de victoire
      this.showNotification(
        "🎉 Victoire par forfait !",
        `Vous avez gagné par forfait dans la room ${roomId}. Les fonds vous ont été transférés.`
      );
      
      // Mettre à jour l'UI si nécessaire
      this.updateUI("victory-by-forfeit", data);
    }
  }
  
  // Gestion de fin de match
  handleMatchEnded(data) {
    const { roomId, winner } = data;
    
    if (this.wallet && this.wallet.toLowerCase() === winner.toLowerCase()) {
      this.showNotification(
        "🏆 Victoire !",
        `Vous avez gagné la partie dans la room ${roomId}.`
      );
    }
    
    this.updateUI("match-ended", data);
  }
  
  // Gestion des paiements
  handleWinningsPaid(data) {
    const { roomId, winner, amount } = data;
    
    if (this.wallet && this.wallet.toLowerCase() === winner.toLowerCase()) {
      const amountEth = window.web3 ? window.web3.utils.fromWei(amount, "ether") : amount;
      
      this.showNotification(
        "💰 Paiement reçu !",
        `Vous avez reçu ${amountEth} ETH pour votre victoire dans la room ${roomId}.`
      );
    }
    
    this.updateUI("winnings-paid", data);
  }
  
  // Afficher une notification
  showNotification(title, message) {
    // Notification système si disponible
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: message });
    }
    
    // Alerte visuelle dans l'UI
    alert(`${title}\n\n${message}`);
  }
  
  // Mettre à jour l'interface utilisateur
  updateUI(eventType, data) {
    // Déclencher un événement personnalisé pour la mise à jour de l'UI
    const uiEvent = new CustomEvent('ui-update', {
      detail: { type: eventType, data }
    });
    window.dispatchEvent(uiEvent);
  }
}

// Gestionnaire de forfaits
class ForfeitManager {
  constructor(contract, wallet) {
    this.contract = contract;
    this.wallet = wallet;
    this.currentRoomId = null;
    this.opponentAddress = null;
    this.setupListeners();
  }
  
  // Configurer les écouteurs d'événements
  setupListeners() {
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('pagehide', this.handlePageHide.bind(this));
    
    // Écouter les événements de changement de room
    window.addEventListener('room-joined', (e) => {
      this.currentRoomId = e.detail.roomId;
      this.opponentAddress = e.detail.opponentAddress;
    });
    
    window.addEventListener('room-left', () => {
      this.currentRoomId = null;
      this.opponentAddress = null;
    });
  }
  
  // Gérer l'événement beforeunload (fermeture de page)
  handleBeforeUnload(e) {
    if (this.currentRoomId && this.opponentAddress && this.wallet) {
      console.log("🚪 Fermeture de page détectée avec room active");
      
      // Informer le serveur
      if (window.socket && window.socket.connected) {
        window.socket.emit("windowBeforeUnload", {
          roomId: this.currentRoomId,
          playerAddress: this.wallet,
          opponentAddress: this.opponentAddress
        });
      }
      
      // Tenter de déclarer forfait
      this.declareForfeit();
      
      // Message de confirmation
      e.preventDefault();
      e.returnValue = "Partie en cours ! Si vous quittez maintenant, vous perdrez automatiquement. Êtes-vous sûr ?";
      return e.returnValue;
    }
  }
  
  // Gérer l'événement pagehide (navigateur fermé)
  handlePageHide() {
    if (this.currentRoomId && this.opponentAddress && this.wallet) {
      this.declareForfeit();
    }
  }
  
  // Déclarer forfait
  async declareForfeit() {
    if (!this.contract || !this.currentRoomId || !this.wallet) {
      console.warn("❌ Impossible de déclarer forfait: informations manquantes");
      return;
    }
    
    try {
      console.log("🏳️ Tentative de déclaration de forfait...");
      
      // Vérifier l'état de la room
      const room = await this.contract.methods.getRoom(this.currentRoomId).call();
      
      if (room.isFinished) {
        console.log("⚠️ Room déjà terminée, pas besoin de déclarer forfait");
        return;
      }
      
      // Forfait volontaire
      const gasEstimate = await this.contract.methods.voluntaryForfeit(this.currentRoomId).estimateGas({
        from: this.wallet
      });
      
      const tx = await this.contract.methods.voluntaryForfeit(this.currentRoomId).send({
        from: this.wallet,
        gas: Math.ceil(gasEstimate * 1.2),
        gasPrice: window.web3?.utils.toWei('60', 'gwei')
      });
      
      console.log("✅ Forfait volontaire déclaré avec succès:", tx.transactionHash);
      return tx;
      
    } catch (err) {
      console.error("❌ Erreur lors de la déclaration de forfait:", err);
    }
  }
  
  // Déclarer forfait via bouton UI
  async declareVoluntaryForfeit() {
    if (!this.currentRoomId || !this.wallet) {
      alert("❌ Aucune partie active ou wallet non connecté");
      return;
    }
    
    const confirmForfeit = confirm("⚠️ ATTENTION: Êtes-vous sûr de vouloir déclarer forfait ? Vous perdrez automatiquement et votre mise sera transférée à votre adversaire.");
    
    if (!confirmForfeit) return;
    
    try {
      const forfeitBtn = document.getElementById("forfeitBtn");
      if (forfeitBtn) {
        forfeitBtn.disabled = true;
        forfeitBtn.innerText = "⏳ Forfait en cours...";
      }
      
      const tx = await this.declareForfeit();
      
      if (tx) {
        alert("✅ Vous avez déclaré forfait. Votre adversaire a été notifié et a reçu la mise.");
        
        // Notifier le serveur
        if (window.socket && window.socket.connected) {
          window.socket.emit("forfeitCompleted", {
            roomId: this.currentRoomId,
            forfeitingPlayer: this.wallet,
            opponentAddress: this.opponentAddress
          });
        }
      }
      
    } catch (err) {
      console.error("❌ Erreur lors du forfait volontaire:", err);
      alert("❌ Erreur lors du forfait: " + (err.message || err.toString()));
    } finally {
      const forfeitBtn = document.getElementById("forfeitBtn");
      if (forfeitBtn) {
        forfeitBtn.innerText = "Forfait";
        forfeitBtn.disabled = false;
      }
    }
  }
  
  // Mettre à jour la room active
  updateCurrentRoom(roomId, opponentAddress) {
    this.currentRoomId = roomId;
    this.opponentAddress = opponentAddress;
    
    console.log(`🔄 ForfeitManager: Room mise à jour - ID: ${roomId}, Adversaire: ${opponentAddress}`);
  }
}

// Exporter les classes pour utilisation
window.ContractEventManager = ContractEventManager;
window.ForfeitManager = ForfeitManager;

// Initialiser après chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  console.log("🔧 Event handlers chargés et prêts");
  
  // Initialiser les gestionnaires une fois Web3 disponible
  const initManagers = () => {
    if (window.web3 && window.cashPongContract && window.connectedWallet) {
      window.eventManager = new ContractEventManager(window.cashPongContract, window.connectedWallet);
      window.forfeitManager = new ForfeitManager(window.cashPongContract, window.connectedWallet);
      window.eventManager.startListening();
    } else {
      setTimeout(initManagers, 1000);
    }
  };
  
  initManagers();
});
