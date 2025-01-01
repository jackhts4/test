const fs = require('fs');
const readline = require('readline-sync');

const DEBUG = true
const DEBUG_PLAYER_ID = 100
const DEBUG_BETSIZE = 500

const DEBUG_GAME_PATH = "FREE_4_SPLIT" 
const DEBUG_DEALER_VALUE = 29
const DEBUG_PLAYER_WIN = true
const DEBUG_NO_OF_WIN_BETS = 8 // if win all split4 double4 = 8, win all split4 double3 = 7, win double = 2

const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const BET_PATHS = [
    { name: 'LOSE', probability: 17, multiplier: 0 },
    { name: '22_DRAW', probability: 3, multiplier: 1 },
    { name: 'SAME_VALUE_DRAW', probability: 5, multiplier: 1 },
    { name: 'BASIC', probability: 25.11, multiplier: 2 },
    { name: 'BJ', probability: 6.83, multiplier: 2.5 },
    { name: 'FREE_DOUBLE', probability: 18.45, multiplier: 3 },
    { name: 'FREE_2_SPLIT', probability: 7.35, multiplier: 3 },
    { name: 'FREE_2_SPLIT_1_DOUBLE', probability: 4.54, multiplier: 4 },
    { name: 'FREE_2_SPLIT_2_DOUBLE', probability: 0.42, multiplier: 5 },
    { name: 'FREE_3_SPLIT', probability: 2.77, multiplier: 4 },
    { name: 'FREE_3_SPLIT_1_DOUBLE', probability: 4.54, multiplier: 5 },
    { name: 'FREE_3_SPLIT_2_DOUBLE', probability: 0.84, multiplier: 6 },
    { name: 'FREE_3_SPLIT_3_DOUBLE', probability: 0.05, multiplier: 7 },
    { name: 'FREE_4_SPLIT', probability: 0.12, multiplier: 5 },
    { name: 'FREE_4_SPLIT_1_DOUBLE', probability: 3.03, multiplier: 6 },
    { name: 'FREE_4_SPLIT_2_DOUBLE', probability: 0.84, multiplier: 7 },
    { name: 'FREE_4_SPLIT_3_DOUBLE', probability: 0.1, multiplier: 8 },
    { name: 'FREE_4_SPLIT_4_DOUBLE', probability: 0.01, multiplier: 9 },
];
const REDRAW_PATHS = ["22_DRAW", "SAME_VALUE_DRAW", "BJ"]

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

// Deal card
function dealCard(shoe) {
    return shoe.pop();
}

function addCard(shoe, card) {
    const oldShoe = JSON.parse(JSON.stringify(shoe))
    shoe.push(card)
    if(!card){
        console.log("card", card)
    }
    if(shoe.includes(undefined)){
        console.log(oldShoe)
        console.log(shoe)
    }
    shuffleShoe(shoe)
}

// Function to get card value
function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card)) return 10;
    if (card === 'A') return 11;
    return parseInt(card);
}

function isBJ(hand) {
    if (calculateHandValue(hand) == 21) {
        return true
    }
    return false
}

function isDouble(hand) {
    if ([9, 10, 11].includes(calculateHandValue(hand))) {
        return true
    }
    return false
}

function isSplit(hand) {
    if (hand[0] == hand[1]) {
        return true
    }
    return false
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

function getCurrentWinBets(hands, dealerValue) {
    let result = 0
    for (let i = 0; i < hands.length; i++) {
        const live = hands[i]["live"]
        const status = hands[i]["status"]
        const hand = hands[i]["cards"]
        if (!live) {
            if (status == "ALIVE" || status == "BURST") {

            } else if (status == "STAND") {
                if (calculateHandValue(hand) >= dealerValue) {
                    result = result + 1
                    if (i == 0) {
                        result = result + 1
                    }
                }
            } else if (status == "DOUBLE") {
                if (calculateHandValue(hand) >= dealerValue) {
                    result = result + 2
                    if (i == 0) {
                        result = result + 1
                    }
                }
            }
        }
    }
    return result
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
        const handValue = calculateHandValue(playerHands[i]["cards"])
        console.log(`Hand ${i + 1} - ${playerHands[i]["live"] ? "In action" : "End action"} - ${playerHands[i]["status"]} - ${playerHands[i]["assigned"] ? "Expected: " + playerHands[i]["assigned"] + "- " : ""}${handDescription} (${handValue})`);
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
    if (hand.length == 2) {
        return calculateHandValue(hand) >= 9 && calculateHandValue(hand) <= 11;
    }
    return false
}

function canFreeSplit(hand) {
    return hand.length === 2 && hand[0] === hand[1];
}

// Function to handle player actions (Hit, Stand, Free Double, Free Split)
function playerTurn(hands, index, shoe, gamePath, dealerValue, noOfWinBets) {
    const options = ['Hit', 'Stand'];
    if (canFreeDouble(hands[index]["cards"])) {
        options.push('Free Double');
    }
    if (hands.length < 4 && canFreeSplit(hands[index]["cards"])) {
        options.push('Free Split');
    }
    const choice = readline.keyInSelect(options, 'Choose an option: ');
    console.log("")
    // const choice = 0
    const currentWinBets = getCurrentWinBets(hands, dealerValue)

    if (options[choice] === 'Hit') {
        handlePlayerHit(hands, index, shoe, gamePath, dealerValue, noOfWinBets, currentWinBets)
    } else if (options[choice] === 'Stand') {
        hands[index]["status"] = "STAND";
        hands[index]["live"] = false;
    } else if (options[choice] === 'Free Double') {
        hands[index]["status"] = "DOUBLE";
        handlePlayerHit(hands, index, shoe, gamePath, dealerValue, noOfWinBets, currentWinBets)
        hands[index]["live"] = false;
    } else if (options[choice] === 'Free Split') {
        hands.push({
            "live": true,
            "cards": [hands[index]["cards"].pop()],
            "status": "ALIVE"
        });
    }

    if (calculateHandValue(hands[index]["cards"]) > 21) {
        hands[index]["live"] = false;
        hands[index]["status"] = "BURST";
    } else if (calculateHandValue(hands[index]["cards"]) == 21 && hands[index]["status"] == "ALIVE") {
        if (hands[index]["cards"].length == 2) { // handle BJ case
            hands[index]["status"] = "BJ";
        } else {
            hands[index]["status"] = "STAND";
        }
        hands[index]["live"] = false;
    }
}

function handlePlayerHit(hands, index, shoe, gamePath, dealerValue, noOfWinBets, currentWinBets) {
    const hand = hands[index]["cards"]
    const status = hands[index]["status"]

    let incrementForFirstHand = 0
    if (index == 0) {
        incrementForFirstHand = 1
    }

    if (gamePath == "LOSE") {
        dealPlayerLose(shoe, hand, dealerValue)
    } else if (gamePath == "22_DRAW") {
        dealPlayerWin(shoe, hand, "BURST")
    } else if (gamePath == "SAME_VALUE_DRAW") {
        dealPlayerSameValueDraw(shoe, hand, dealerValue)
    } else if (gamePath == "BASIC") {
        if (noOfWinBets > currentWinBets) {
            dealPlayerWin(shoe, hand, dealerValue)
        } else {
            dealPlayerLose(shoe, hand, dealerValue)
        }
    } else if (gamePath == "BJ") {
        dealPlayerBJ(shoe, hand)
    } else if (gamePath == "FREE_DOUBLE") {
        if(hand.length >= 2 && status == "ALIVE"){ // only case when 
            if (noOfWinBets >= currentWinBets + 1 + incrementForFirstHand) {
                dealPlayerWin(shoe, hand, dealerValue)
            } else {
                dealPlayerLose(shoe, hand, dealerValue)
            }
        }else{
            if (noOfWinBets >= currentWinBets + 2 + incrementForFirstHand) {
                dealPlayerDoubleWin(shoe, hand, dealerValue)
            } else {
                dealPlayerDoubleLose(shoe, hand, dealerValue)
            }
        }
    } else {
        pathArr = gamePath.split("_")
        pathArrLen = pathArr.length

        const firstHandWin = 1
        const maxSplit = pathArr[1]
        const maxDouble = pathArrLen == 3 ? 0 : pathArr[3]
        const maxWinBet = maxSplit + maxDouble + firstHandWin
        let willLose = false // if it has chance to lose, we cannot assign >= 9 cards to it, as 99 stands = 18 which may be > dealerValue
        if (maxWinBet > noOfWinBets) {
            willLose = true
        }

        if (hands[index]["assigned"]) {
            if (hands[index]["assigned"] == "WIN") {
                dealPlayerSplitDoubleWin(shoe, hands, maxSplit, maxDouble, dealerValue, noOfWinBets, currentWinBets, willLose, incrementForFirstHand)
            } else {
                dealPlayerSplitDoubleLose(shoe, hands, maxSplit, maxDouble, dealerValue)
            }
        } else {
            // decide whether win or lose to that hand
            const winHandsLeftExcludeCurrent = maxSplit - index - 1 // excluding current hand
            if (noOfWinBets - currentWinBets - incrementForFirstHand > winHandsLeftExcludeCurrent) { // it must win now if no remaining hand to win and if can win now
                hands[index]["assigned"] = "WIN"
                dealPlayerSplitDoubleWin(shoe, hands, maxSplit, maxDouble, dealerValue, noOfWinBets, currentWinBets, willLose)
            } else { // if have remaining hand
                if (noOfWinBets > currentWinBets + incrementForFirstHand) { // have win bet to win
                    let prob = 0.5 // can optimize
                    if (Math.random() <= prob) {
                        hands[index]["assigned"] = "WIN"
                        dealPlayerSplitDoubleWin(shoe, hands, maxSplit, maxDouble, dealerValue, noOfWinBets, currentWinBets, willLose)
                    } else {
                        hands[index]["assigned"] = "LOSE"
                        dealPlayerSplitDoubleLose(shoe, hands, maxSplit, maxDouble, dealerValue)
                    }
                } else {
                    hands[index]["assigned"] = "LOSE"
                    dealPlayerSplitDoubleLose(shoe, hands, maxSplit, maxDouble, dealerValue)
                }
            }
        }
    }
}

// Function to handle dealer's turn
function dealerTurn(hand, shoe, gamePath, dealerValue) {

    while (calculateHandValue(hand) < 17) {
        if (dealerValue == "BURST") {
            dealDealerBurst(shoe, hand)
        } else {
            dealDealerExactValue(shoe, hand, dealerValue)
        }
    }
    printDealerHands(hand);
    // return calculateHandValue(hand) > 21 ? 'DealerBust' : 'Stand';
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

function getRandomInt(min, max) {
    const randomInt = Math.floor(Math.random() * (max - min + 1)) + min
    return randomInt
}

function getRandomFromArr(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
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

// Function to get or create player
function getPlayer(playerId) {
    let players = loadPlayers();
    // const playerId = readline.question('Enter your player ID: ');
    if (!players[playerId]) {
        console.log('New player detected, creating profile. \n');
        const newPlayer = { "id": playerId, "amount": 1000, "hands": 0 }
        savePlayer(newPlayer);
        return newPlayer
    } else {
        console.log(`Welcome back, Player ${playerId}! Your current amount is: ${players[playerId].amount} \n`);
    }
    return players[playerId];
}

function loadSharePot() {
    if (fs.existsSync('share_pot.json')) {
        const data = fs.readFileSync('share_pot.json');
        return (JSON.parse(data))["value"];
    } else {
        saveSharePot({ "value": 0 })
        return 0;
    }
}

function saveSharePot(pot) {
    fs.writeFileSync('share_pot.json', JSON.stringify(pot, null, 2));
}

function addToSharePot(amountToAdd) {
    let sharePot = loadSharePot()
    let newSharePot = { value: sharePot + amountToAdd }
    saveSharePot(newSharePot)
}

function loadPlayerPot() {
    if (fs.existsSync('player_pot.json')) {
        const data = fs.readFileSync('player_pot.json');
        return (JSON.parse(data));
    } else {
        return {};
    }
}

function getPlayerPot(playerId) {
    let playerPot = loadPlayerPot();
    if (!playerPot[playerId]) {
        console.log('Create new player pool for playerId:', playerId);
        const newPlayerPot = { "value": 0 }
        savePlayerPot(playerId, newPlayerPot);
        return 0
    } else {
        return playerPot[playerId]["value"];
    }
}

function savePlayerPot(playerId, newPlayerPot) {
    let playerPot = loadPlayerPot();
    playerPot[playerId] = newPlayerPot;
    fs.writeFileSync('player_pot.json', JSON.stringify(playerPot, null, 2));
}

function addToPlayerPot(playerId, amountToAdd) {
    let playerPot = getPlayerPot(playerId)
    let newPlayerPot = { value: playerPot + amountToAdd }
    savePlayerPot(playerId, newPlayerPot)
}

function loadHandHistory() {
    if (fs.existsSync('hand_history.json')) {
        const data = fs.readFileSync('hand_history.json');
        return JSON.parse(data);
    } else {
        return [];
    }
}

function saveHandHistory(history) {
    fs.writeFileSync('hand_history.json', JSON.stringify(history, null, 2));
}

function getFirstBetPath() {
    const rand = Math.random() * 100; // Random number between 0 and 100
    let cumulativeProbability = 0;
    for (let betPath of BET_PATHS) {
        cumulativeProbability += betPath.probability;
        if (rand < cumulativeProbability) {
            return [betPath.name, betPath.multiplier];
        }
    }
}

function handleFirstBetFunds(playerId, betSize) {
    addToPlayerPot(playerId, betSize * 0.4)
    addToSharePot(betSize * 0.58)
}

function getDoubledHand(playerHands) {
    let result = 0
    for (let i = 0; i < playerHands.length; i++) {
        if (playerHands[i]["cards"].length >= 2) {
            let hand = playerHands[i]["cards"].slice(0, 2)
            if (9 <= calculateHandValue(hand) && calculateHandValue(hand) <= 11) {
                result++
            }
        }
    }
    return result
}

function dealPlayerLose(shoe, hand, dealerValue) {
    if (hand.length == 0) {
        hand.push(dealCard(shoe))
    } else if (hand.length == 1) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        while (isBJ(tempHand) || isDouble(tempHand) || isSplit(tempHand) || (dealerValue <= calculateHandValue(tempHand) && calculateHandValue(tempHand) <= 21)) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    } else {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        while (dealerValue <= calculateHandValue(tempHand) && calculateHandValue(tempHand) <= 21) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    }
}

function dealPlayerWin(shoe, hand, dealerValue) {
    if (hand.length == 0) {
        hand.push(dealCard(shoe))
    } else if (hand.length == 1) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)

        let valueToLarger = dealerValue
        if (dealerValue == "BURST") {
            valueToLarger = 16
        }
        while (isBJ(tempHand) || isDouble(tempHand) || isSplit(tempHand)
            || (calculateHandValue(tempHand) >= 17 && calculateHandValue(tempHand) <= valueToLarger)) { // redraw if player >= 17 and smaller than dealer
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    } else if (calculateHandValue(hand) < 17) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)

        let valueToLarger = dealerValue
        if (dealerValue == "BURST") {
            valueToLarger = 16
        }
        while (calculateHandValue(tempHand) > 21 
        || calculateHandValue(tempHand) >= 17 && calculateHandValue(tempHand) <= valueToLarger) { // redraw if player 
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    } else {
        hand.push(dealCard(shoe))
    }
}

function dealPlayerSameValueDraw(shoe, hand, dealerValue) {
    if (hand.length == 0) {
        hand.push(dealCard(shoe))
    } else if (hand.length == 1) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        while (isBJ(tempHand) || isDouble(tempHand) || isSplit(tempHand)
            || (calculateHandValue(tempHand) >= 17 && calculateHandValue(tempHand) != dealerValue)) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    } else if (calculateHandValue(hand) < dealerValue) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        while (calculateHandValue(tempHand) > dealerValue) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    } else { // burst it
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        while (calculateHandValue(tempHand) <= 21) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    }
}

function dealPlayerBJ(shoe, hand) {
    if (hand.length == 0) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        while (!["10", "J", "Q", "K", "A"].includes(tempHand[0])) {
            addCard(shoe, newCard)
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    } else {
        const holdCard = hand[0]
        const cardsPool = holdCard == "A" ? ["10", "J", "Q", "K"] : ["A"]
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        while (!cardsPool.includes(tempHand[1])) {
            addCard(shoe, newCard)
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    }
}

// double should not contain soft
function dealPlayerDoubleWin(shoe, hand, dealerValue) {
    if (hand.length == 0) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        // loop until new card not A/10
        while (["10", "J", "Q", "K", "A"].includes(tempHand[0])) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)

    } else if (hand.length == 1) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)

        let toContain = [9, 10, 11]
        if (dealerValue == 20) {
            toContain = [10, 11]
        }

        while (newCard == "A" || !toContain.includes(calculateHandValue(tempHand))) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    } else if (hand.length == 2) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        let valueToLarger = dealerValue
        if (dealerValue == "BURST") {
            valueToLarger = 16
        }
        while (calculateHandValue(tempHand) <= valueToLarger || calculateHandValue(tempHand) > 21) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    } else {
        hand.push(dealCard(shoe))
    }
}

function dealPlayerDoubleLose(shoe, hand, dealerValue) {
    if (hand.length == 0) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        // loop until new card not A
        while (["10", "J", "Q", "K", "A"].includes(tempHand[0])) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)

    } else if (hand.length == 1) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        // loop until new card not A and total value is not 9, 10, 11
        while (newCard == "A" || ![9, 10, 11].includes(calculateHandValue(tempHand))) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    } else {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        while (calculateHandValue(tempHand) >= dealerValue && calculateHandValue(tempHand) <= 21) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    }
}

function dealPlayerSplitDoubleWin(shoe, playerHands, maxSplit, maxDouble, dealerValue, noOfWinBets, currentWinBets, willLose, incrementForFirstHand) {
    let currentHandIndex = getCurrentAliveHandIndex(playerHands);
    const hand = playerHands[currentHandIndex]["cards"]

    if (hand.length == 0) {
        if (noOfWinBets >= (currentWinBets + 2 + incrementForFirstHand) && !willLose) {
            const tempHand = JSON.parse(JSON.stringify(hand))
            let newCard = dealCard(shoe)
            tempHand.push(newCard)
            // loop until new card not A
            while (["A"].includes(tempHand[0])) {
                addCard(shoe, tempHand.pop())
                newCard = dealCard(shoe)
                tempHand.push(newCard)
            }
            hand.push(newCard)

        } else {
            const tempHand = JSON.parse(JSON.stringify(hand))
            let newCard = dealCard(shoe)
            tempHand.push(newCard)
            // loop until new card not A
            while (["9", "10", "J", "Q", "K", "A"].includes(tempHand[0])) {
                addCard(shoe, tempHand.pop())
                newCard = dealCard(shoe)
                tempHand.push(newCard)
            }
            hand.push(newCard)

        }
    } else if (hand.length == 1) {
        if (playerHands.length < maxSplit) { // still can split
            let prob
            if (currentHandIndex + 1 == playerHands.length) { // must split as it is current last hand
                prob = 1
            } else if (playerHands.length == 1 && currentHandIndex == 0) { // first hand must split
                prob = 1
            } else { // 50% to split
                prob = 0.5
            }
            // console.log("[DEBUG] split prob =", prob)
            if (Math.random() <= prob) { // add split card
                const splitCard = playerHands[0]["cards"][0]
                let newCard = dealCard(shoe)
                while (newCard != splitCard) {
                    addCard(shoe, newCard)
                    newCard = dealCard(shoe)
                }
                hand.push(newCard)
            } else { // add non split card
                let noOfDoubled = getDoubledHand(playerHands)
                if (noOfDoubled < maxDouble) { // can double
                    let requiredDouble = maxDouble - noOfDoubled // number of doubled hands are required
                    let doubleSlot = maxSplit - currentHandIndex // number of slot of hands that can split, place reminded in hands

                    if (doubleSlot > requiredDouble) {
                        prob = 0.5
                    } else {
                        prob = 1
                    }

                    if (Math.random() <= prob) { // add double card
                        if (noOfWinBets >= (currentWinBets + 2 + incrementForFirstHand)) {
                            dealPlayerDoubleWin(shoe, hand, dealerValue)
                        } else {
                            dealPlayerDoubleLose(shoe, hand, dealerValue)
                        }
                    } else { // deal any card without double, bj, split
                        dealPlayerWin(shoe, hand, dealerValue)
                    }
                } else { // deal any card without double, bj, split
                    dealPlayerWin(shoe, hand, dealerValue)
                }
            }
        } else { // add non split card
            let noOfDoubled = getDoubledHand(playerHands)
            if (noOfDoubled < maxDouble) { // can double
                let availableDouble = maxDouble - noOfDoubled // number of doubled hands are required
                let doubleSlot = maxSplit - currentHandIndex // number of slot of hands that can split, place reminded in hands

                if (doubleSlot > availableDouble) {
                    prob = 0.5
                } else {
                    prob = 1
                }

                if (Math.random() <= prob) { // add double card
                    if (noOfWinBets >= (currentWinBets + 2 + incrementForFirstHand)) {
                        dealPlayerDoubleWin(shoe, hand, dealerValue)
                    } else {
                        dealPlayerDoubleLose(shoe, hand, dealerValue)
                    }
                } else { // deal any card without double, bj, split
                    dealPlayerWin(shoe, hand, dealerValue)
                }
            } else { // deal any card without double, bj, split
                dealPlayerWin(shoe, hand, dealerValue)
            }

        }
    } else {
        if (playerHands[currentHandIndex]["status"] == "DOUBLE") {
            if (noOfWinBets >= (currentWinBets + 2 + incrementForFirstHand)) {
                dealPlayerDoubleWin(shoe, hand, dealerValue)
            } else {
                dealPlayerDoubleLose(shoe, hand, dealerValue)
            }
        } else {
            dealPlayerWin(shoe, hand, dealerValue)
        }
    }
}

function dealPlayerSplitDoubleLose(shoe, playerHands, maxSplit, maxDouble, dealerValue) {
    const cardsPool = maxDouble == 0 ? ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] : ['2', '3', '4', '5', '6', '7', '8', '9']
    let currentHandIndex = getCurrentAliveHandIndex(playerHands);
    const hand = playerHands[currentHandIndex]["cards"]

    if (hand.length == 0) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        while (!cardsPool.includes(tempHand[0])) {
            addCard(shoe, newCard)
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    } else if (hand.length == 1) {
        if (playerHands.length < maxSplit) { // still can split
            let prob

            if (currentHandIndex + 1 == playerHands.length) { // must split as it is current last hand
                prob = 1
            } else if (playerHands.length == 1 && currentHandIndex == 0) { // first hand must split
                prob = 1
            } else { // 50% to split
                prob = 0.5
            }
            // console.log("[DEBUG] split prob =", prob)
            if (Math.random() <= prob) { // add split card
                const splitCard = playerHands[0]["cards"][0]
                let newCard = dealCard(shoe)
                while (newCard != splitCard) {
                    addCard(shoe, newCard)
                    newCard = dealCard(shoe)
                }
                hand.push(newCard)
            } else { // add non split card
                let noOfDoubled = getDoubledHand(playerHands)
                if (noOfDoubled < maxDouble) { // can double
                    let availableDouble = maxDouble - noOfDoubled // number of doubled hands are required
                    let doubleSlot = maxSplit - currentHandIndex // number of slot of hands that can split, place reminded in hands

                    if (doubleSlot > availableDouble) {
                        prob = 0.5
                    } else {
                        prob = 1
                    }

                    if (Math.random() <= prob) { // add double card
                        dealPlayerDoubleLose(shoe, hand, dealerValue)
                    } else { // deal any card without double, bj, split
                        dealPlayerLose(shoe, hand, dealerValue)
                    }
                } else { // deal any card without double, bj, split
                    dealPlayerLose(shoe, hand, dealerValue)
                }
            }
        } else { // add non split card
            let noOfDoubled = getDoubledHand(playerHands)
            if (noOfDoubled < maxDouble) { // can double
                let availableDouble = maxDouble - noOfDoubled // number of doubled hands are required
                let doubleSlot = maxSplit - currentHandIndex // number of slot of hands that can split, place reminded in hands

                if (doubleSlot > availableDouble) {
                    prob = 0.5
                } else {
                    prob = 1
                }

                if (Math.random() <= prob) { // add double card
                    dealPlayerDoubleLose(shoe, hand, dealerValue)
                } else { // deal any card without double, bj, split
                    dealPlayerLose(shoe, hand, dealerValue)
                }
            } else { // deal any card without double, bj, split
                dealPlayerLose(shoe, hand, dealerValue)
            }

        }
    } else {
        if (playerHands[currentHandIndex]["status"] == "DOUBLE") {
            dealPlayerDoubleLose(shoe, hand, dealerValue)
        } else {
            dealPlayerLose(shoe, hand, dealerValue)
        }
    }
}

function dealDealerExactValue(shoe, hand, dealerValue) {
    if (hand.length == 0) {
        hand.push(dealCard(shoe))
    } else if (hand.length == 1) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        while (isBJ(tempHand) || calculateHandValue(tempHand) > dealerValue
            || (calculateHandValue(tempHand) >= 17 && calculateHandValue(tempHand) != dealerValue)) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    } else {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        while ((calculateHandValue(tempHand) >= 17 && calculateHandValue(tempHand) != dealerValue)) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    }
}

function dealDealerBurst(shoe, hand) {
    if (hand.length == 0) {
        hand.push(dealCard(shoe))
    } else if (hand.length == 1) {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        while (isBJ(tempHand) || calculateHandValue(tempHand) > 16) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    } else {
        const tempHand = JSON.parse(JSON.stringify(hand))
        let newCard = dealCard(shoe)
        tempHand.push(newCard)
        while (calculateHandValue(tempHand) > 16 && calculateHandValue(tempHand) < 22) {
            addCard(shoe, tempHand.pop())
            newCard = dealCard(shoe)
            tempHand.push(newCard)
        }
        hand.push(newCard)
    }
}

// Function to get bet amount from player
function getBetSize(player, isFirstBet) {
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
    let playerId = 200
    if (DEBUG) {
        playerId = DEBUG_PLAYER_ID
    }
    let player = getPlayer(playerId);
    let shoe = shuffleShoe(createShoe());
    let playerHands = []
    let dealerHand = []

    // Check if player is making their first bet
    const firstFiveBets = player.hands > 5 ? false : true
    // Get bet amount from player
    let betSize
    if (DEBUG) {
        betSize = DEBUG_BETSIZE
    } else {
        betSize = getBetSize(player, firstBet);
    }

    console.log(`You have placed a bet of ${betSize}.`);

    if (firstFiveBets) {
        console.log("[DEBUG] Is firstFiveBets")
        handleFirstBetFunds(player.id, betSize)
        let sharePot = loadSharePot()

        let requireRedraw = true
        let gamePath // to decide starting hand 
        let selectedMultiplier
        let adjustedBetSize // betSize * selectedMutliplier
        let winnablePot // 20% of platformPot 

        while (requireRedraw) {
            [gamePath, selectedMultiplier] = getFirstBetPath()
            adjustedBetSize = betSize * selectedMultiplier
            winnablePot = 0.2 * sharePot
            // if not( larger than 20% pot + redraw option)
            if (!(adjustedBetSize > winnablePot && REDRAW_PATHS.includes(gamePath))) {
                requireRedraw = false
            }
        }

        let noOfWinBets = Math.floor(winnablePot / adjustedBetSize)
        if (DEBUG) {
            noOfWinBets = DEBUG_NO_OF_WIN_BETS
        }
        let playerWin = true
        if (adjustedBetSize > winnablePot) {
            playerWin = false
        }
        if (DEBUG) {
            playerWin = DEBUG_PLAYER_WIN
        }

        if (DEBUG) {
            gamePath = DEBUG_GAME_PATH
        }

        let dealerValue
        if (gamePath == "LOSE") {
            dealerValue = getRandomInt(17, 21)
        } else if (gamePath == "22_DRAW") {
            dealerValue = 22
        } else if (gamePath == "SAME_VALUE_DRAW") {
            dealerValue = getRandomInt(17, 21)
        } else if (gamePath == "BASIC") {
            if (playerWin) {
                dealerValue = getRandomFromArr([17, 18, 19, 20, "BURST"])
            } else {
                dealerValue = getRandomInt(17, 21)
            }
        } else if (gamePath == "BJ") {
            dealerValue = getRandomInt(17, 21)
        } else if (gamePath == "FREE_DOUBLE") {
            if (playerWin) {
                dealerValue = getRandomFromArr([17, 18, 19, 20, "BURST"])
            } else {
                dealerValue = getRandomInt(17, 21)
            }
        } else { // 3 case for split, all player win, all dealer win, some win some lost
            let isAllPlayerWin = false
            let isAllDealerWin = false

            if (playerWin) {
                isAllPlayerWin = true
            }
            if (noOfWinBets == 0) {
                isAllDealerWin = true
            }
            if (isAllPlayerWin) {
                dealerValue = getRandomFromArr([17, 18, 19, 20, "BURST"])
            } else if (isAllDealerWin) {
                dealerValue = getRandomInt(17, 21)
            } else {
                console.log("[DEBUG] win some lose some")
                dealerValue = getRandomInt(17, 20)
            }
        }

        if (DEBUG) {
            dealerValue = DEBUG_DEALER_VALUE
        }
        console.log("[DEBUG] noOfWinBets:", noOfWinBets, "playerWin:", playerWin, "gamePath:", gamePath, "dealerValue:", dealerValue)
        // ALIVE, STAND, DOUBLE, BURST
        if (DEBUG) {
            playerHands = [{
                "live": true,
                "cards": [],
                "status": "ALIVE"
            }];
            handlePlayerHit(playerHands, 0, shoe, gamePath, dealerValue, noOfWinBets, 0)
        } else {

        }

        while (isPlayerLive(playerHands)) {
            printPlayerHands(playerHands);
            let currentHandIndex = getCurrentAliveHandIndex(playerHands);
            console.log(`\nCurrent playing hand ${currentHandIndex + 1}:`);
            playerTurn(playerHands, currentHandIndex, shoe, gamePath, dealerValue, noOfWinBets);
        }
        printPlayerHands(playerHands);
        console.log("End of player turn");
        dealerTurn(dealerHand, shoe, gamePath, dealerValue)
        return

    } else {
        console.log("Not firstFiveBets")
    }

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
playBlackjack();
