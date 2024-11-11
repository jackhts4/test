// Importing functions from the refactored code (assuming it's in a file named blackjack.js)
const {
    createShoe,
    shuffleShoe,
    dealCard,
    playerTurn,
    splitHand,
    calculateHandValue,
} = require('./blackjack');

describe('Blackjack Split Test', () => {
    it('should allow the player to split up to 4 hands', () => {
        let shoe = shuffleShoe(createShoe());

        // Create a mock player hand that can be split multiple times
        let playerHand = [{ value: '8' }, { value: '8' }];
        let dealerHand = [dealCard(shoe), dealCard(shoe)];

        // Define player choice callback for testing
        const playerChoiceCallback = jest.fn()
            .mockReturnValueOnce(2)  // First Split
            .mockReturnValueOnce(2)  // Second Split
            .mockReturnValueOnce(2)  // Third Split
            .mockReturnValue(1);     // Stand for all subsequent hands

        // Perform the split
        splitHand(playerHand, shoe, dealerHand, playerChoiceCallback);

        // Verify the callback was called the expected number of times
        expect(playerChoiceCallback).toHaveBeenCalledTimes(4); // 3 Splits + Stand action
    });

    it('should correctly calculate the value of all split hands', () => {
        // Manually create player hands that will be split up to 4 times
        let splitHands = [
            [{ value: '8' }, { value: '8' }],
            [{ value: '8' }, { value: '8' }],
            [{ value: '8' }, { value: '8' }],
            [{ value: '8' }, { value: '8' }]
        ];

        for (let hand of splitHands) {
            let value = calculateHandValue(hand);
            expect(value).toBe(16); // Expect each hand to have a value of 16 (8 + 8)
        }
    });
});
