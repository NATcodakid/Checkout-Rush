/**
 * gameData.js — Game content, progressive level system, items, and coin economy.
 *
 * 20 levels that ramp gradually. Players earn coins per transaction.
 * After Tier 1 the change-due amount is hidden from the player.
 */

// ===== GROCERY ITEMS =====
// Prices now use cents for harder mental math at higher tiers
export const ITEMS = [
    { name: 'Apple', emoji: '🍎', color: 0xe63946, priceRange: [0.50, 1.29, 2.47] },
    { name: 'Banana', emoji: '🍌', color: 0xf4d35e, priceRange: [0.30, 0.89, 1.63] },
    { name: 'Milk', emoji: '🥛', color: 0xf1faee, priceRange: [1.00, 2.79, 4.39] },
    { name: 'Bread', emoji: '🍞', color: 0xd4a373, priceRange: [1.00, 2.49, 3.78] },
    { name: 'Egg', emoji: '🥚', color: 0xfefae0, priceRange: [0.50, 1.59, 3.27] },
    { name: 'Cheese', emoji: '🧀', color: 0xffb703, priceRange: [1.00, 2.39, 4.89] },
    { name: 'Carrot', emoji: '🥕', color: 0xfb8500, priceRange: [0.25, 0.79, 1.43] },
    { name: 'Cookie', emoji: '🍪', color: 0xbc6c25, priceRange: [0.50, 1.19, 2.37] },
    { name: 'Juice', emoji: '🧃', color: 0x2ec4b6, priceRange: [1.00, 1.89, 3.14] },
    { name: 'Candy', emoji: '🍬', color: 0xff006e, priceRange: [0.25, 0.67, 1.23] },
    { name: 'Donut', emoji: '🍩', color: 0xf48c06, priceRange: [0.75, 1.49, 2.68] },
    { name: 'Tomato', emoji: '🍅', color: 0xd62828, priceRange: [0.50, 1.09, 1.83] },
    { name: 'Grapes', emoji: '🍇', color: 0x7b2cbf, priceRange: [1.00, 2.19, 3.57] },
    { name: 'Watermelon', emoji: '🍉', color: 0x38b000, priceRange: [2.00, 3.49, 5.93] },
    { name: 'Pizza', emoji: '🍕', color: 0xe85d04, priceRange: [1.50, 3.29, 5.47] },
];

// ===== 20 PROGRESSIVE LEVELS =====
// patience = seconds before customer gets impatient and leaves
// showChange: whether to show the change-due display
export const LEVELS = [
    // Tier 1: Trainee (show change, generous timer, gentle)
    { level: 1, name: 'Trainee', itemCount: [1, 2], priceIndex: 0, maxTotal: 5, customers: 5, patience: 60, showChange: true, changeMax: 3, coinReward: 8, moneyOptions: [1, 5] },
    { level: 2, name: 'Trainee', itemCount: [1, 2], priceIndex: 0, maxTotal: 5, customers: 6, patience: 55, showChange: true, changeMax: 4, coinReward: 10, moneyOptions: [1, 5] },
    { level: 3, name: 'Trainee', itemCount: [2, 2], priceIndex: 0, maxTotal: 8, customers: 6, patience: 50, showChange: true, changeMax: 5, coinReward: 10, moneyOptions: [1, 5, 10] },
    // Tier 2: Junior Cashier (hide change, patience starts)
    { level: 4, name: 'Junior Cashier', itemCount: [2, 3], priceIndex: 0, maxTotal: 10, customers: 7, patience: 45, showChange: false, changeMax: 8, coinReward: 12, moneyOptions: [1, 5, 10] },
    { level: 5, name: 'Junior Cashier', itemCount: [2, 3], priceIndex: 1, maxTotal: 12, customers: 7, patience: 40, showChange: false, changeMax: 8, coinReward: 14, moneyOptions: [1, 5, 10] },
    { level: 6, name: 'Junior Cashier', itemCount: [2, 3], priceIndex: 1, maxTotal: 15, customers: 8, patience: 40, showChange: false, changeMax: 10, coinReward: 14, moneyOptions: [1, 5, 10, 20] },
    // Tier 3: Cashier (harder prices, more customers)
    { level: 7, name: 'Cashier', itemCount: [2, 3], priceIndex: 1, maxTotal: 18, customers: 8, patience: 35, showChange: false, changeMax: 12, coinReward: 16, moneyOptions: [1, 5, 10, 20] },
    { level: 8, name: 'Cashier', itemCount: [2, 4], priceIndex: 1, maxTotal: 20, customers: 9, patience: 35, showChange: false, changeMax: 12, coinReward: 16, moneyOptions: [1, 5, 10, 20] },
    { level: 9, name: 'Cashier', itemCount: [3, 4], priceIndex: 1, maxTotal: 22, customers: 9, patience: 30, showChange: false, changeMax: 15, coinReward: 18, moneyOptions: [1, 5, 10, 20] },
    { level: 10, name: 'Cashier', itemCount: [3, 4], priceIndex: 1, maxTotal: 25, customers: 10, patience: 30, showChange: false, changeMax: 15, coinReward: 18, moneyOptions: [5, 10, 20, 50] },
    // Tier 4: Senior Cashier (ugly prices, $50 bills, tighter patience)
    { level: 11, name: 'Senior Cashier', itemCount: [3, 4], priceIndex: 2, maxTotal: 28, customers: 10, patience: 28, showChange: false, changeMax: 18, coinReward: 22, moneyOptions: [5, 10, 20, 50] },
    { level: 12, name: 'Senior Cashier', itemCount: [3, 4], priceIndex: 2, maxTotal: 30, customers: 11, patience: 28, showChange: false, changeMax: 20, coinReward: 22, moneyOptions: [5, 10, 20, 50] },
    { level: 13, name: 'Senior Cashier', itemCount: [3, 5], priceIndex: 2, maxTotal: 35, customers: 11, patience: 25, showChange: false, changeMax: 22, coinReward: 24, moneyOptions: [5, 10, 20, 50] },
    { level: 14, name: 'Senior Cashier', itemCount: [3, 5], priceIndex: 2, maxTotal: 38, customers: 12, patience: 25, showChange: false, changeMax: 25, coinReward: 24, moneyOptions: [10, 20, 50] },
    // Tier 5: Expert ($100 bills, brutal prices)
    { level: 15, name: 'Expert', itemCount: [3, 5], priceIndex: 2, maxTotal: 40, customers: 12, patience: 22, showChange: false, changeMax: 30, coinReward: 28, moneyOptions: [10, 20, 50, 100] },
    { level: 16, name: 'Expert', itemCount: [4, 5], priceIndex: 2, maxTotal: 45, customers: 13, patience: 22, showChange: false, changeMax: 35, coinReward: 28, moneyOptions: [10, 20, 50, 100] },
    { level: 17, name: 'Expert', itemCount: [4, 5], priceIndex: 2, maxTotal: 50, customers: 13, patience: 20, showChange: false, changeMax: 40, coinReward: 30, moneyOptions: [10, 20, 50, 100] },
    { level: 18, name: 'Expert', itemCount: [4, 6], priceIndex: 2, maxTotal: 55, customers: 14, patience: 20, showChange: false, changeMax: 45, coinReward: 30, moneyOptions: [20, 50, 100] },
    // Tier 6: Master Cashier
    { level: 19, name: 'Master Cashier', itemCount: [4, 6], priceIndex: 2, maxTotal: 60, customers: 15, patience: 18, showChange: false, changeMax: 50, coinReward: 35, moneyOptions: [20, 50, 100] },
    { level: 20, name: 'Master Cashier', itemCount: [5, 6], priceIndex: 2, maxTotal: 75, customers: 15, patience: 15, showChange: false, changeMax: 60, coinReward: 40, moneyOptions: [20, 50, 100] },
];

// Legacy DIFFICULTY kept for compatibility
export const DIFFICULTY = {
    easy: { label: 'Easy', roundsPerGame: 5, itemCount: [1, 2], priceIndex: 0, maxTotal: 10, changeMax: 5, timerEnabled: false, hintLevel: 2 },
    medium: { label: 'Medium', roundsPerGame: 7, itemCount: [2, 3], priceIndex: 1, maxTotal: 20, changeMax: 10, timerEnabled: true, timerSeconds: 30, hintLevel: 1 },
    hard: { label: 'Hard', roundsPerGame: 10, itemCount: [3, 4], priceIndex: 2, maxTotal: 50, changeMax: 20, timerEnabled: true, timerSeconds: 20, hintLevel: 0 },
};

// ===== COIN ECONOMY =====
export function calculateCoins(correct, streak, levelConfig) {
    const base = levelConfig.coinReward || 10;
    if (correct) {
        return base + Math.floor(streak * 2);
    }
    return 0;
}

// ===== MONEY DENOMINATIONS =====
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
    { value: 50.00, label: '$50', emoji: '💵', type: 'bill' },
    { value: 100.00, label: '$100', emoji: '💵', type: 'bill' },
];

// ===== CUSTOMER NAMES =====
export const CUSTOMERS = [
    { name: 'Sam', bodyColor: 0x118ab2, headColor: 0xffd6a5 },
    { name: 'Mia', bodyColor: 0xef476f, headColor: 0xf4d6b0 },
    { name: 'Leo', bodyColor: 0x06d6a0, headColor: 0xe8c9a0 },
    { name: 'Zoe', bodyColor: 0x7b2cbf, headColor: 0xffd6a5 },
    { name: 'Max', bodyColor: 0xff6b35, headColor: 0xdeb887 },
];

// ===== ROUND GENERATOR =====
export function generateRound(levelConfig) {
    const config = levelConfig;
    const [minItems, maxItems] = config.itemCount;
    const numItems = randInt(minItems, maxItems);

    const roundItems = [];
    let total = 0;
    for (let i = 0; i < numItems; i++) {
        const item = ITEMS[randInt(0, ITEMS.length - 1)];
        const basePrice = item.priceRange[config.priceIndex];
        // Add variance — cents make math harder at higher tiers
        const variance = (Math.random() - 0.5) * basePrice * 0.4;
        const price = Math.round((basePrice + variance) * 100) / 100;
        const clampedPrice = Math.max(0.25, Math.min(price, config.maxTotal / 2));
        roundItems.push({ ...item, price: clampedPrice });
        total += clampedPrice;
    }

    total = Math.min(total, config.maxTotal);
    total = Math.round(total * 100) / 100;

    let runningTotal = 0;
    for (let i = 0; i < roundItems.length - 1; i++) {
        runningTotal += roundItems[i].price;
    }
    if (roundItems.length > 0) {
        roundItems[roundItems.length - 1].price = Math.round((total - runningTotal) * 100) / 100;
        if (roundItems[roundItems.length - 1].price < 0.25) {
            roundItems[roundItems.length - 1].price = 0.25;
            total = Math.round(roundItems.reduce((sum, i) => sum + i.price, 0) * 100) / 100;
        }
    }

    // Payment: pick from the level's allowed bill denominations
    const payment = calculatePayment(total, config);
    const changeDue = Math.round((payment - total) * 100) / 100;
    const customer = CUSTOMERS[randInt(0, CUSTOMERS.length - 1)];

    return { items: roundItems, total, payment, changeDue, customer };
}

function calculatePayment(total, config) {
    const bills = config.moneyOptions || [1, 5, 10, 20];
    // Find the smallest bill (or combo) that covers total and gives reasonable change
    for (const bill of bills) {
        if (bill >= total && (bill - total) <= config.changeMax) {
            return bill;
        }
    }
    // If no single bill works, use a combo or the largest bill
    const largest = bills[bills.length - 1];
    if (largest >= total) return largest;
    // Multiple bills
    return Math.ceil(total / largest) * largest;
}

// ===== UTILITY =====
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
