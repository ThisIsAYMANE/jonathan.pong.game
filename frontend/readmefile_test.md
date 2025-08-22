# CashPongBet - Interface Polygon Mainnet

![Logo CashPongBet](https://via.placeholder.com/150x50?text=CashPongBet)

Jeu décentralisé de Pong avec paris sur Polygon Mainnet où les joueurs peuvent s'affronter pour gagner des MATIC.

## 🚀 Fonctionnalités

- **Paris en argent réel** utilisant des MATIC sur Polygon Mainnet
- **Gameplay basé sur smart contract** avec règles transparentes
- **Matchs Joueur contre Joueur** avec paiements directs
- **Protection contre l'abandon** pour les adversaires inactifs
- **Transparence totale** avec vérification on-chain

## 📋 Détails du Contrat

- **Adresse du contrat:** `0xCc50ce04FF06446E0Af663655A4F2B4dFEDb9140`
- **Réseau:** Polygon Mainnet (Chain ID: 137)
- **Propriétaire:** `0x44c994c689ab1eA1c5052477e2F0D5b1fd0D04B8`
- **Déployé le:** 2 août 2025
- **Explorateur:** [Voir sur PolygonScan](https://polygonscan.com/address/0xCc50ce04FF06446E0Af663655A4F2B4dFEDb9140)


##  En cas que vous coulez changer vous pouriais checher cette partie (<div class="highlight">
            <strong>🔧 Mainnet Configuration:</strong><br>
            ✅ Network: Polygon Mainnet (Chain ID: 137)<br>
            ✅ Contract: 0xCc50ce04FF06446E0Af663655A4F2B4dFEDb9140<br>
            ✅ Owner: 0x44c994c689ab1eA1c5052477e2F0D5b1fd0D04B8<br>
            ✅ Deployed: August 2, 2025<br>
            ⚠️ Real MATIC - Higher bet amounts recommended
        </div>) dans "CashPongBet_Mainnet_Improved"



## ⚠️ Avertissements Importants

1. **ARGENT RÉEL** - Cette interface interagit avec Polygon Mainnet en utilisant de vrais MATIC
2. **Les transactions coûtent des MATIC** - Soyez prudent avec chaque interaction
3. **Vérifiez bien toutes les adresses** avant de confirmer les transactions
4. **Mise minimale recommandée:** 0.01 MATIC (~0.01$ USD)

## 🎮 Comment Jouer

1. **Connectez votre portefeuille** (MetaMask ou compatible)
2. **Assurez-vous d'être sur Polygon Mainnet**
3. **Créez ou rejoignez une salle** en spécifiant l'adversaire et le montant du pari
4. **Jouez** en marquant des points
5. **Le premier à 10 points gagne** le pot (2x le montant parié)

## 🔄 Déroulement du Jeu

1. Le Joueur A crée une salle et spécifie l'adresse du Joueur B
2. Le Joueur A verrouille le montant du pari
3. Le Joueur B rejoint la salle en égalant le montant
4. Les joueurs marquent des points à tour de rôle
5. Le premier à 10 points remporte les deux mises en MATIC
6. Si un joueur est inactif pendant >10 minutes, l'adversaire peut réclamer la victoire par forfait

## ⚙️ Configuration Requise

- Portefeuille Web3 (MetaMask recommandé)
- Des MATIC pour parier et payer les frais de transaction
- Polygon Mainnet ajouté à votre portefeuille

## 📜 Fonctions du Smart Contract

```solidity
function createRoom(address _opponent) external payable
function joinRoom(uint256 roomId) external payable
function scorePoint(uint256 roomId, address scorer) external
function claimVictoryByForfeit(uint256 roomId) external
function voluntaryForfeit(uint256 roomId) external
function getRoom(uint256 roomId) external view returns (Room memory)
```

## 📞 Support

Pour tout problème ou question, contactez le propriétaire du contrat à l'adresse `0x44c994c689ab1eA1c5052477e2F0D5b1fd0D04B8`

## 📝 Licence

Cette interface est fournie telle quelle pour utilisation avec le smart contract CashPongBet. Utilisation à vos propres risques.


##  Pour testing 


1. **Connectez votre portefeuille** (MetaMask ou compatible)
2. **Assurez-vous d'être sur Polygon Mainnet**
3. **Assurez-vous de cliquer sur "Load contrat"**
4. **Assurez-vous de cliquer sur "Create room"**
5. **Connectez votre portefeuille** (MetaMask ou compatible)
6. **Assurez-vous d'être sur Polygon Mainnet**
7. **Assurez-vous de cliquer sur " join room"**

