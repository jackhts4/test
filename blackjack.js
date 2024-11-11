const fs = require('fs');
const readline = require('readline-sync');

const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const OPTIONS = [
    { name: 'BASIC', probability: 50.11, multiplier: 1 },
    { name: 'BJ', probability: 6.83, multiplier: 1.5 },
    { name: 'FREE_DOUBLE', probability: 18.45, multiplier: 2 },
    { name: 'FREE_2_SPLIT', probability: 12.31, multiplier: 2 },
    { name: 'FREE_3_SPLIT', probability: 8.2, multiplier: 3 },
    { name: 'FREE_4_SPLIT', probability: 4.1, multiplier: 4 },
];
const FIRST_BET_LOST_OPTIONS = [
    {name: "LOST", probability: 85},
    {name: "SAME_VALUE_DRAW", probability: 10},
    {name: "22_DRAW", probability: 5}
]
const FIRST_BET_WIN_OPTIONS = [
    {name: "WIN", probability: 85},
    {name: "SAME_VALUE_DRAW", probability: 10},
    {name: "22_DRAW", probability: 5}
]
// Function to create a shoe with 4 decks (4 * 52 cards)
function createShoe() {
    let shoe = [];
    for (let i = 0; i < 4; i++) { // 4 decks
        for (let value of VALUES) {
            for (let j = 0; j < 4; j++) { // Each value has 4 cards per deck
                shoe.push(value);
       
       
            }
        }
    }
    return shoe;
}

// Shuffle the shoe
function shuffleShoe(shoe) {
    for (let i = shoe.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
    }
    return shoe;
}

// Function to get card value
function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card)) return 10;
    if (card === 'A') return 11;
    return parseInt(card);
}

// Function to calculate hand value
function calculateHandValue(hand) {
    let value = hand.reduce((acc, card) => acc + getCardValue(card), 0);
    let aces = hand.filter(card => card === 'A').length;
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }
    return value;
}

// Deal card
function dealCard(shoe) {
    return shoe.pop();
}

// Function to print hand
function printDealerHands(hand) {
    const handDescription = hand.map(card => `${card}`).join(', ');
    const value = calculateHandValue(hand);
    console.log(`Dealer's hand: ${handDescription} (Value: ${value})`);
}

// Function to print all player hands
function printPlayerHands(playerHands) {
    for (let i = 0; i < playerHands.length; i++) {
        const handDescription = playerHands[i]["cards"].map(card => `${card}`).join(', ');
        console.log(`Player Hand ${i + 1} - ${playerHands[i]["live"] ? "Alive" : "Dead"} - ${handDescription}`);
    }
}

function isPlayerLive(playerHands) {
    for (let i = 0; i < playerHands.length; i++) {
        if (playerHands[i]["live"]) return true;
    }
    return false;
}

function getCurrentAliveHandIndex(playerHands) {
    for (let i = 0; i < playerHands.length; i++) {
        if (playerHands[i]["live"]) return i;
    }
}

// Free Bet Blackjack rules: Allows free doubles and free splits on certain hands
function canFreeDouble(hand) {
    return calculateHandValue(hand) >= 9 && calculateHandValue(hand) <= 11;
}

function canFreeSplit(hand) {
    return hand.length === 2 && hand[0] === hand[1];
}

// Function to handle player actions (Hit, Stand, Free Double, Free Split)
function playerTurn(hands, index, shoe) {
    const options = ['Hit', 'Stand'];
    if (canFreeDouble(hands[index]["cards"])) options.push('Free Double');
    if (hands.length < 4 && canFreeSplit(hands[index]["cards"])) options.push('Free Split');

    const choice = readline.keyInSelect(options, 'Choose an option: ');

    if (options[choice] === 'Hit') {
        hands[index]["cards"].push(dealCard(shoe));
    } else if (options[choice] === 'Stand') {
        hands[index]["live"] = false;
    } else if (options[choice] === 'Free Double') {
        hands[index]["cards"].push(dealCard(shoe));
        hands[index]["live"] = false;
    } else if (options[choice] === 'Free Split') {
        hands.push({
            "live": true,
            "cards": [hands[index]["cards"].pop()]
        });
    }

    if (calculateHandValue(hands[index]["cards"]) > 21) {
        hands[index]["live"] = false;
        return 'Bust';
    }
}

// Function to handle dealer's turn
function dealerTurn(hand, shoe) {
    while (calculateHandValue(hand) < 17) {
        hand.push(dealCard(shoe));
    }
    printDealerHands(hand);
    return calculateHandValue(hand) > 21 ? 'DealerBust' : 'Stand';
}

// Function to compare player and dealer hands
function getHandResult(playerHand, dealerHand) {
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);

    console.log(playerHand, "vs", dealerHand);
    if (playerValue > 21) {
        console.log('Player burst!');
        return "LOSE"
    } else if (playerValue > dealerValue) {
        console.log('You win!');
        return "WIN"
    } else if (playerValue < dealerValue) {
        console.log('Dealer wins!');
        return "LOSE"
    } else {
        console.log("It's a tie!");
        return "TIE"
    }
}

// Function to load player data from JSON file
function loadPlayers() {
    if (fs.existsSync('players.json')) {
        const data = fs.readFileSync('players.json');
        return JSON.parse(data);
    } else {
        return {};
    }
}

// Function to save player data to JSON file
function savePlayer(player) {
    let players = loadPlayers();
    players[player.id] = player;
    fs.writeFileSync('players.json', JSON.stringify(players, null, 2));
}

// Function to load hand history from JSON file
function loadHandHistory() {
    if (fs.existsSync('hand_history.json')) {
        const data = fs.readFileSync('hand_history.json');
        return JSON.parse(data);
    } else {
        return [];
    }
}

// Function to save hand history to JSON file
function savePlatformPot(pot) {
    fs.writeFileSync('platform_pot.json', JSON.stringify(pot, null, 2));
}

// Function to load hand history from JSON file
function getPlatformPot() {
    if (fs.existsSync('platform_pot.json')) {
        const data = fs.readFileSync('platform_pot.json');
        return (JSON.parse(data))["value"];
    } else {
        savePlatformPot({ "value": 0 })
        return 0;
    }
}

// Function to save hand history to JSON file
function saveHandHistory(history) {
    fs.writeFileSync('hand_history.json', JSON.stringify(history, null, 2));
}

// Function to get or create player
function getPlayer() {
    let players = loadPlayers();
    // const playerId = readline.question('Enter your player ID: ');
    const playerId = 100
    if (!players[playerId]) {
        console.log('New player detected, creating profile...');
        const player = { "id": playerId, "amount": 1000 }
        savePlayer(player);
    } else {
        console.log(`Welcome back, Player ${playerId}! Your current amount is: ${players[playerId].amount}`);
    }
    return players[playerId];
}

// Function to check if player has bet before
function isFirstBet(playerId) {
    let history = loadHandHistory();
    return !history.some(record => record.user_id === playerId);
}

function getFirstBetOptions() {
    const rand = Math.random() * 100; // Random number between 0 and 100
    let cumulativeProbability = 0;

    for (let option of OPTIONS) {
        cumulativeProbability += option.probability;
        if (rand < cumulativeProbability) {
            return [option.name, option.multiplier];
        }
    }
    // Fallback in case of rounding errors
    return ["BASIC", 1];
}

function getRandomFirstBetLostOptions() {
    const rand = Math.random() * 100; // Random number between 0 and 100
    let cumulativeProbability = 0;

    for (let option of FIRST_BET_LOST_OPTIONS) {
        cumulativeProbability += option.probability;
        if (rand < cumulativeProbability) {
            return option.name
        }
    }
    // Fallback in case of rounding errors
    return FIRST_BET_LOST_OPTIONS[0].probability;
}

function getRandomFirstBetWinOptions() {
    const rand = Math.random() * 100; // Random number between 0 and 100
    let cumulativeProbability = 0;

    for (let option of FIRST_BET_WIN_OPTIONS) {
        cumulativeProbability += option.probability;
        if (rand < cumulativeProbability) {
            return option.name
        }
    }
    // Fallback in case of rounding errors
    return FIRST_BET_WIN_OPTIONS[0].probability;
}

function getPlayerInitCards(gamePath, gameResult){
    if (gamePath == "BASIC"){

    } else if(gamePath == "BASIC"){

    } 

    
    if (gameResult == "LOST"){

    }else if(gameResult == "SAME_VALUE_DRAW"){

    }else if(gameResult == "22_DRAW"){

    }else if(gameResult == "WIN"){

    }
}

// Function to get bet amount from player
function getBetAmount(player, isFirstBet) {
    let bet;
    if (isFirstBet) {
        console.log('Since this is your first bet, you are eligible for a special bonus bet!');
        bet = readline.questionInt('Enter your bet amount: ');
    } else {
        bet = readline.questionInt('Enter your bet amount: ');
    }
    while (bet > player.amount) {
        console.log('Not enough balance. Please deposit more or enter a lower amount.');
        const deposit = readline.questionInt('Enter deposit amount: ');
        player.amount += deposit;
        console.log(`Your new balance is: ${player.amount}`);
        bet = readline.questionInt('Enter your bet amount: ');
    }
    player.amount -= bet;
    return bet;
}

// Main game function
function playBlackjack() {
    let player = getPlayer();
    let shoe = shuffleShoe(createShoe());

    // Check if player is making their first bet
    const firstBet = isFirstBet(player.id);
    // Get bet amount from player
    // const betAmount = getBetAmount(player, firstBet);
    const betAmount = 500
    console.log(`You have placed a bet of ${betAmount}.`);

    if (firstBet) {
        console.log("Is first bet")
        const [gamePath, selectedMultiplier] = getFirstBetOptions() // path = double/free 2 split/free 3 split, etc...
        const adjustedBetSize = betAmount * selectedMultiplier
        const platformPot = getPlatformPot()
        const winnablePot = 0.2 * platformPot - 0.02 * betAmount // 20% of the pot - 2% betsize(fee)
        let gameResult // win/lost/draw
        // 85% lose, 15% draw (10% same point as user, 5% dealer 22)
        console.log("Adjusted Bet Size:", adjustedBetSize)
        console.log("Platform Pot:", platformPot)
        console.log("20% Winnable Pot:", winnablePot)
        if(adjustedBetSize > winnablePot){
            gameResult = getRandomFirstBetLostOptions()
        }else{
            gameResult = getRandomFirstBetWinOptions()
        }

        console.log("Game Path:", gamePath)
        console.log("Game Result:", gameResult)
    } else {
        console.log("Not first bet")
    }

    // Initial hands
    let playerHands = [{
        "live": true,
        "cards": getPlayerInitCards(gamePath, gameResult)
    }];

    let dealerHand = [dealCard(shoe), dealCard(shoe)];
    return
    printDealerHands(dealerHand);
    // Play each hand, considering splits
    while (isPlayerLive(playerHands)) {
        printPlayerHands(playerHands);
        let currentHandIndex = getCurrentAliveHandIndex(playerHands);
        console.log(`\nPlaying hand ${currentHandIndex + 1}:`);
        playerTurn(playerHands, currentHandIndex, shoe);
    }
    console.log("End of player turn");

    // Check if all player hands are bust before dealer's turn
    if (!playerHands.every(hand => calculateHandValue(hand["cards"]) > 21)) {
        dealerResult = dealerTurn(dealerHand, shoe);
    } else {
        console.log("All player hands are bust. Dealer does not need to play.");
    }

    let pnl = 0;
    // TODO change pnl
    for (let i = 0; i < playerHands.length; i++) {
        console.log(`\nComparing player hand ${i + 1}:`);
        const result = getHandResult(playerHands[i]["cards"], dealerHand);
        if (result == "WIN") {
            pnl += betAmount;
        } else if (result == "LOSE") {
            pnl -= betAmount
        }
    }

    // Update player amount
    player.amount += + pnl;
    if (pnl > 0) {
        console.log(`You won! Your new amount is: ${player.amount}`);
    } else {
        console.log(`You lost! Your new amount is: ${player.amount}`);
    }
    savePlayer(player);

    // Save hand history
    let history = loadHandHistory();
    history.push({
        user_id: player.id,
        bet_size: betAmount,
        pnl: pnl - betAmount
    });
    saveHandHistory(history);
}

// Start the game
console.log('Welcome to Free Bet Blackjack!');
playBlackjack();
