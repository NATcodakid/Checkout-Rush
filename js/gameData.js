/**
 * gameData.js — All game content, item definitions, difficulty configs, and
 * helper functions for generating rounds.
 *
 * Educational goal: prices are kept realistic and readable so kids connect
 * the math to real shopping.
 */

// ===== GROCERY ITEMS =====
// Each item has a name, emoji (for UI), a price range per difficulty, and a
// 3D color (used by the scene to tint the low-poly model).
export const ITEMS = [
    { name: 'Apple', emoji: '🍎', color: 0xe63946, priceRange: [0.50, 1.00, 2.00] },
    { name: 'Banana', emoji: '🍌', color: 0xf4d35e, priceRange: [0.30, 0.75, 1.50] },
    { name: 'Milk', emoji: '🥛', color: 0xf1faee, priceRange: [1.00, 2.50, 4.00] },
    { name: 'Bread', emoji: '🍞', color: 0xd4a373, priceRange: [1.00, 2.00, 3.50] },
    { name: 'Egg', emoji: '🥚', color: 0xfefae0, priceRange: [0.50, 1.50, 3.00] },
    { name: 'Cheese', emoji: '🧀', color: 0xffb703, priceRange: [1.00, 2.00, 4.50] },
    { name: 'Carrot', emoji: '🥕', color: 0xfb8500, priceRange: [0.25, 0.75, 1.50] },
    { name: 'Cookie', emoji: '🍪', color: 0xbc6c25, priceRange: [0.50, 1.00, 2.00] },
    { name: 'Juice', emoji: '🧃', color: 0x2ec4b6, priceRange: [1.00, 1.75, 3.00] },
    { name: 'Candy', emoji: '🍬', color: 0xff006e, priceRange: [0.25, 0.50, 1.00] },
    { name: 'Donut', emoji: '🍩', color: 0xf48c06, priceRange: [0.75, 1.25, 2.50] },
    { name: 'Tomato', emoji: '🍅', color: 0xd62828, priceRange: [0.50, 1.00, 1.75] },
    { name: 'Grapes', emoji: '🍇', color: 0x7b2cbf, priceRange: [1.00, 2.00, 3.50] },
    { name: 'Watermelon', emoji: '🍉', color: 0x38b000, priceRange: [2.00, 3.00, 5.00] },
    { name: 'Pizza', emoji: '🍕', color: 0xe85d04, priceRange: [1.50, 3.00, 5.00] },
];

// ===== DIFFICULTY SETTINGS =====
export const DIFFICULTY = {
    easy: {
        label: 'Easy',
        itemCount: [1, 2],       // min/max items per customer
        priceIndex: 0,           // index into priceRange
        maxTotal: 10,            // cap on sum
        roundsPerGame: 5,        // customers to serve
        timerEnabled: false,
        hintLevel: 2,            // 0=none, 1=subtle, 2=strong
        moneyOptions: ['$1', '$5'],
        changeMax: 5,
    },
    medium: {
        label: 'Medium',
        itemCount: [2, 3],
        priceIndex: 1,
        maxTotal: 20,
        roundsPerGame: 7,
        timerEnabled: true,
        timerSeconds: 30,
        hintLevel: 1,
        moneyOptions: ['$1', '$5', '$10'],
        changeMax: 10,
    },
    hard: {
        label: 'Hard',
        itemCount: [3, 4],
        priceIndex: 2,
        maxTotal: 50,
        roundsPerGame: 10,
        timerEnabled: true,
        timerSeconds: 20,
        hintLevel: 0,
        moneyOptions: ['$1', '$5', '$10', '$20'],
        changeMax: 20,
    },
};

// ===== MONEY DENOMINATIONS =====
// What's available in the cash drawer for the player to give as change
export const DENOMINATIONS = [
    { value: 0.01, label: '1¢', emoji: '🪙', type: 'coin' },
    { value: 0.05, label: '5¢', emoji: '🪙', type: 'coin' },
    { value: 0.10, label: '10¢', emoji: '🪙', type: 'coin' },
    { value: 0.25, label: '25¢', emoji: '🪙', type: 'coin' },
    { value: 0.50, label: '50¢', emoji: '🪙', type: 'coin' },
    { value: 1.00, label: '$1', emoji: '💵', type: 'bill' },
    { value: 5.00, label: '$5', emoji: '💵', type: 'bill' },
    { value: 10.00, label: '$10', emoji: '💵', type: 'bill' },
    { value: 20.00, label: '$20', emoji: '💵', type: 'bill' },
];

// ===== CUSTOMER NAMES & APPEARANCES =====
export const CUSTOMERS = [
    { name: 'Sam', bodyColor: 0x118ab2, headColor: 0xffd6a5 },
    { name: 'Mia', bodyColor: 0xef476f, headColor: 0xf4d6b0 },
    { name: 'Leo', bodyColor: 0x06d6a0, headColor: 0xe8c9a0 },
    { name: 'Zoe', bodyColor: 0x7b2cbf, headColor: 0xffd6a5 },
    { name: 'Max', bodyColor: 0xff6b35, headColor: 0xdeb887 },
];

// ===== ROUND GENERATOR =====

/**
 * Generate a single round (one customer transaction).
 * Returns { items, total, payment, changeDue, customer }
 */
export function generateRound(difficulty) {
    const config = DIFFICULTY[difficulty];
    const [minItems, maxItems] = config.itemCount;
    const numItems = randInt(minItems, maxItems);

    // Pick random items and assign prices
    const roundItems = [];
    let total = 0;
    for (let i = 0; i < numItems; i++) {
        const item = ITEMS[randInt(0, ITEMS.length - 1)];
        // Pick a price based on difficulty, with some variance
        const basePrice = item.priceRange[config.priceIndex];
        // Round to nearest quarter for readability
        const price = roundToQuarter(basePrice + (Math.random() - 0.5) * basePrice * 0.3);
        const clampedPrice = Math.max(0.25, Math.min(price, config.maxTotal / 2));
        roundItems.push({
            ...item,
            price: clampedPrice,
        });
        total += clampedPrice;
    }

    // Make sure total doesn't exceed the cap
    total = Math.min(total, config.maxTotal);
    // Round total to nearest cent
    total = Math.round(total * 100) / 100;

    // Recalculate item prices to match the capped total
    // (adjust last item if needed)
    let runningTotal = 0;
    for (let i = 0; i < roundItems.length - 1; i++) {
        runningTotal += roundItems[i].price;
    }
    if (roundItems.length > 0) {
        roundItems[roundItems.length - 1].price = Math.round((total - runningTotal) * 100) / 100;
        // Ensure last item price is at least 0.25
        if (roundItems[roundItems.length - 1].price < 0.25) {
            roundItems[roundItems.length - 1].price = 0.25;
            total = Math.round(roundItems.reduce((sum, i) => sum + i.price, 0) * 100) / 100;
        }
    }

    // Determine payment (customer gives more than total)
    const payment = calculatePayment(total, config);

    // Change due
    const changeDue = Math.round((payment - total) * 100) / 100;

    // Pick a random customer
    const customer = CUSTOMERS[randInt(0, CUSTOMERS.length - 1)];

    return { items: roundItems, total, payment, changeDue, customer };
}

/**
 * Calculate what the customer pays — always a "nice" bill amount above total.
 */
function calculatePayment(total, config) {
    // Find smallest bill combination that covers the total
    const bills = [1, 5, 10, 20, 50];
    for (const bill of bills) {
        if (bill >= total && (bill - total) <= config.changeMax) {
            return bill;
        }
    }
    // Fallback: round up to nearest 5
    return Math.ceil(total / 5) * 5;
}

// ===== UTILITY =====

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundToQuarter(n) {
    return Math.round(n * 4) / 4;
}
