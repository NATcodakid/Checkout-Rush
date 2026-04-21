/**
 * gameData.js — Game content, progressive level system, items, and coin economy.
 *
 * 50 levels that ramp gradually. Players earn coins per transaction.
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
    { name: 'Beans', emoji: '🥫', color: 0x888888, priceRange: [0.75, 1.25, 1.99] },
    { name: 'Cola', emoji: '🥤', color: 0xe60000, priceRange: [1.00, 1.99, 2.99] },
    { name: 'Canned Food', emoji: '🥫', color: 0xb0c4de, priceRange: [0.89, 1.59, 2.89] },
    { name: 'Cereal', emoji: '🥣', color: 0xfffacd, priceRange: [2.50, 4.49, 6.89] },
    { name: 'Meat', emoji: '🥩', color: 0xff6347, priceRange: [4.50, 8.99, 14.50] },
    { name: 'Motor Oil', emoji: '🛢️', color: 0x696969, priceRange: [5.00, 9.99, 18.50] },
];

// ===== 50 PROGRESSIVE LEVELS =====
// patience = seconds before customer gets impatient and leaves
// showChange: whether to show the change-due display
export const LEVELS = [
    // Tier 1: Trainee (show change, generous timer, gentle)
    { level: 1,  name: 'Trainee',            itemCount: [1, 1], priceIndex: 0, maxTotal: 3,  customers: 4,  patience: 60, showChange: true,  changeMax: 3,  coinReward: 12, moneyOptions: [1, 5] },
    { level: 2,  name: 'Trainee',            itemCount: [1, 2], priceIndex: 0, maxTotal: 4,  customers: 5,  patience: 60, showChange: true,  changeMax: 4,  coinReward: 12, moneyOptions: [1, 5] },
    { level: 3,  name: 'Trainee',            itemCount: [1, 2], priceIndex: 0, maxTotal: 5,  customers: 5,  patience: 55, showChange: true,  changeMax: 4,  coinReward: 12, moneyOptions: [1, 5] },
    { level: 4,  name: 'Trainee',            itemCount: [2, 2], priceIndex: 0, maxTotal: 6,  customers: 5,  patience: 55, showChange: true,  changeMax: 5,  coinReward: 14, moneyOptions: [1, 5] },
    { level: 5,  name: 'Trainee',            itemCount: [2, 2], priceIndex: 0, maxTotal: 8,  customers: 6,  patience: 50, showChange: true,  changeMax: 5,  coinReward: 14, moneyOptions: [1, 5, 10] },
    // Tier 2: Junior Cashier (hide change, $10 bills introduced)
    { level: 6,  name: 'Junior Cashier',     itemCount: [2, 3], priceIndex: 0, maxTotal: 8,  customers: 6,  patience: 50, showChange: false, changeMax: 6,  coinReward: 14, moneyOptions: [1, 5, 10] },
    { level: 7,  name: 'Junior Cashier',     itemCount: [2, 3], priceIndex: 0, maxTotal: 10, customers: 6,  patience: 48, showChange: false, changeMax: 8,  coinReward: 16, moneyOptions: [1, 5, 10] },
    { level: 8,  name: 'Junior Cashier',     itemCount: [2, 3], priceIndex: 1, maxTotal: 10, customers: 7,  patience: 45, showChange: false, changeMax: 8,  coinReward: 16, moneyOptions: [1, 5, 10] },
    { level: 9,  name: 'Junior Cashier',     itemCount: [2, 3], priceIndex: 1, maxTotal: 12, customers: 7,  patience: 45, showChange: false, changeMax: 8,  coinReward: 16, moneyOptions: [1, 5, 10] },
    { level: 10, name: 'Junior Cashier',     itemCount: [2, 3], priceIndex: 1, maxTotal: 14, customers: 7,  patience: 42, showChange: false, changeMax: 10, coinReward: 18, moneyOptions: [1, 5, 10, 20] },
    // Tier 3: Cashier (harder prices, more customers)
    { level: 11, name: 'Cashier',            itemCount: [2, 3], priceIndex: 1, maxTotal: 15, customers: 8,  patience: 42, showChange: false, changeMax: 10, coinReward: 18, moneyOptions: [1, 5, 10, 20] },
    { level: 12, name: 'Cashier',            itemCount: [2, 4], priceIndex: 1, maxTotal: 18, customers: 8,  patience: 40, showChange: false, changeMax: 12, coinReward: 18, moneyOptions: [1, 5, 10, 20] },
    { level: 13, name: 'Cashier',            itemCount: [3, 4], priceIndex: 1, maxTotal: 20, customers: 8,  patience: 38, showChange: false, changeMax: 12, coinReward: 20, moneyOptions: [1, 5, 10, 20] },
    { level: 14, name: 'Cashier',            itemCount: [3, 4], priceIndex: 1, maxTotal: 22, customers: 9,  patience: 36, showChange: false, changeMax: 15, coinReward: 20, moneyOptions: [1, 5, 10, 20] },
    { level: 15, name: 'Cashier',            itemCount: [3, 4], priceIndex: 1, maxTotal: 25, customers: 9,  patience: 35, showChange: false, changeMax: 15, coinReward: 22, moneyOptions: [5, 10, 20] },
    // Tier 4: Senior Cashier ($50 bills, ugly prices, tighter patience)
    { level: 16, name: 'Senior Cashier',     itemCount: [3, 4], priceIndex: 2, maxTotal: 25, customers: 9,  patience: 35, showChange: false, changeMax: 18, coinReward: 22, moneyOptions: [5, 10, 20, 50] },
    { level: 17, name: 'Senior Cashier',     itemCount: [3, 4], priceIndex: 2, maxTotal: 28, customers: 10, patience: 32, showChange: false, changeMax: 18, coinReward: 24, moneyOptions: [5, 10, 20, 50] },
    { level: 18, name: 'Senior Cashier',     itemCount: [3, 4], priceIndex: 2, maxTotal: 30, customers: 10, patience: 30, showChange: false, changeMax: 20, coinReward: 24, moneyOptions: [5, 10, 20, 50] },
    { level: 19, name: 'Senior Cashier',     itemCount: [3, 5], priceIndex: 2, maxTotal: 32, customers: 10, patience: 30, showChange: false, changeMax: 22, coinReward: 26, moneyOptions: [5, 10, 20, 50] },
    { level: 20, name: 'Senior Cashier',     itemCount: [3, 5], priceIndex: 2, maxTotal: 35, customers: 11, patience: 28, showChange: false, changeMax: 25, coinReward: 26, moneyOptions: [10, 20, 50] },
    // Tier 5: Expert ($100 bills, brutal prices)
    { level: 21, name: 'Expert',             itemCount: [3, 5], priceIndex: 2, maxTotal: 38, customers: 11, patience: 28, showChange: false, changeMax: 28, coinReward: 28, moneyOptions: [10, 20, 50, 100] },
    { level: 22, name: 'Expert',             itemCount: [3, 5], priceIndex: 2, maxTotal: 40, customers: 11, patience: 26, showChange: false, changeMax: 30, coinReward: 28, moneyOptions: [10, 20, 50, 100] },
    { level: 23, name: 'Expert',             itemCount: [4, 5], priceIndex: 2, maxTotal: 42, customers: 12, patience: 25, showChange: false, changeMax: 32, coinReward: 30, moneyOptions: [10, 20, 50, 100] },
    { level: 24, name: 'Expert',             itemCount: [4, 5], priceIndex: 2, maxTotal: 45, customers: 12, patience: 24, showChange: false, changeMax: 35, coinReward: 30, moneyOptions: [10, 20, 50, 100] },
    { level: 25, name: 'Expert',             itemCount: [4, 5], priceIndex: 2, maxTotal: 48, customers: 12, patience: 22, showChange: false, changeMax: 38, coinReward: 32, moneyOptions: [10, 20, 50, 100] },
    // Tier 6: Master Cashier
    { level: 26, name: 'Master Cashier',     itemCount: [4, 5], priceIndex: 2, maxTotal: 50, customers: 13, patience: 22, showChange: false, changeMax: 40, coinReward: 32, moneyOptions: [20, 50, 100] },
    { level: 27, name: 'Master Cashier',     itemCount: [4, 6], priceIndex: 2, maxTotal: 52, customers: 13, patience: 20, showChange: false, changeMax: 42, coinReward: 34, moneyOptions: [20, 50, 100] },
    { level: 28, name: 'Master Cashier',     itemCount: [4, 6], priceIndex: 2, maxTotal: 55, customers: 13, patience: 20, showChange: false, changeMax: 45, coinReward: 34, moneyOptions: [20, 50, 100] },
    { level: 29, name: 'Master Cashier',     itemCount: [4, 6], priceIndex: 2, maxTotal: 58, customers: 14, patience: 18, showChange: false, changeMax: 48, coinReward: 36, moneyOptions: [20, 50, 100] },
    { level: 30, name: 'Master Cashier',     itemCount: [5, 6], priceIndex: 2, maxTotal: 60, customers: 14, patience: 18, showChange: false, changeMax: 50, coinReward: 36, moneyOptions: [20, 50, 100] },
    // Tier 7: Store Manager (extreme patience, big totals)
    { level: 31, name: 'Store Manager',      itemCount: [5, 6], priceIndex: 2, maxTotal: 62, customers: 14, patience: 18, showChange: false, changeMax: 52, coinReward: 38, moneyOptions: [20, 50, 100] },
    { level: 32, name: 'Store Manager',      itemCount: [5, 6], priceIndex: 2, maxTotal: 65, customers: 14, patience: 17, showChange: false, changeMax: 55, coinReward: 38, moneyOptions: [20, 50, 100] },
    { level: 33, name: 'Store Manager',      itemCount: [5, 6], priceIndex: 2, maxTotal: 68, customers: 15, patience: 17, showChange: false, changeMax: 55, coinReward: 40, moneyOptions: [20, 50, 100] },
    { level: 34, name: 'Store Manager',      itemCount: [5, 6], priceIndex: 2, maxTotal: 70, customers: 15, patience: 16, showChange: false, changeMax: 58, coinReward: 40, moneyOptions: [20, 50, 100] },
    { level: 35, name: 'Store Manager',      itemCount: [5, 7], priceIndex: 2, maxTotal: 75, customers: 15, patience: 16, showChange: false, changeMax: 60, coinReward: 42, moneyOptions: [20, 50, 100] },
    // Tier 8: Regional Manager (6+ items, max bill variety)
    { level: 36, name: 'Regional Manager',   itemCount: [5, 7], priceIndex: 2, maxTotal: 78, customers: 15, patience: 16, showChange: false, changeMax: 60, coinReward: 42, moneyOptions: [20, 50, 100] },
    { level: 37, name: 'Regional Manager',   itemCount: [5, 7], priceIndex: 2, maxTotal: 80, customers: 16, patience: 15, showChange: false, changeMax: 62, coinReward: 44, moneyOptions: [20, 50, 100] },
    { level: 38, name: 'Regional Manager',   itemCount: [5, 7], priceIndex: 2, maxTotal: 82, customers: 16, patience: 15, showChange: false, changeMax: 65, coinReward: 44, moneyOptions: [20, 50, 100] },
    { level: 39, name: 'Regional Manager',   itemCount: [6, 7], priceIndex: 2, maxTotal: 85, customers: 16, patience: 14, showChange: false, changeMax: 68, coinReward: 46, moneyOptions: [50, 100] },
    { level: 40, name: 'Regional Manager',   itemCount: [6, 7], priceIndex: 2, maxTotal: 88, customers: 16, patience: 14, showChange: false, changeMax: 70, coinReward: 46, moneyOptions: [50, 100] },
    // Tier 9: District Champion (extreme speed + math)
    { level: 41, name: 'District Champion',  itemCount: [6, 7], priceIndex: 2, maxTotal: 90, customers: 17, patience: 14, showChange: false, changeMax: 72, coinReward: 48, moneyOptions: [50, 100] },
    { level: 42, name: 'District Champion',  itemCount: [6, 7], priceIndex: 2, maxTotal: 92, customers: 17, patience: 13, showChange: false, changeMax: 75, coinReward: 48, moneyOptions: [50, 100] },
    { level: 43, name: 'District Champion',  itemCount: [6, 7], priceIndex: 2, maxTotal: 95, customers: 17, patience: 13, showChange: false, changeMax: 78, coinReward: 50, moneyOptions: [50, 100] },
    { level: 44, name: 'District Champion',  itemCount: [6, 8], priceIndex: 2, maxTotal: 98, customers: 18, patience: 13, showChange: false, changeMax: 80, coinReward: 50, moneyOptions: [50, 100] },
    { level: 45, name: 'District Champion',  itemCount: [6, 8], priceIndex: 2, maxTotal: 100, customers: 18, patience: 12, showChange: false, changeMax: 82, coinReward: 52, moneyOptions: [50, 100] },
    // Tier 10: CEO Cashier (endgame prestige)
    { level: 46, name: 'CEO Cashier',        itemCount: [6, 8], priceIndex: 2, maxTotal: 100, customers: 18, patience: 12, showChange: false, changeMax: 85, coinReward: 52, moneyOptions: [50, 100] },
    { level: 47, name: 'CEO Cashier',        itemCount: [7, 8], priceIndex: 2, maxTotal: 105, customers: 18, patience: 12, showChange: false, changeMax: 88, coinReward: 55, moneyOptions: [50, 100] },
    { level: 48, name: 'CEO Cashier',        itemCount: [7, 8], priceIndex: 2, maxTotal: 110, customers: 19, patience: 11, showChange: false, changeMax: 90, coinReward: 55, moneyOptions: [50, 100] },
    { level: 49, name: 'CEO Cashier',        itemCount: [7, 8], priceIndex: 2, maxTotal: 115, customers: 19, patience: 11, showChange: false, changeMax: 95, coinReward: 58, moneyOptions: [100] },
    { level: 50, name: 'CEO Cashier',        itemCount: [7, 8], priceIndex: 2, maxTotal: 120, customers: 20, patience: 10, showChange: false, changeMax: 100, coinReward: 60, moneyOptions: [100] },
];

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
        let lastPrice = Math.round((total - runningTotal) * 100) / 100;
        if (lastPrice < 0.25) {
            lastPrice = 0.25;
        }
        roundItems[roundItems.length - 1].price = lastPrice;
        total = Math.round(roundItems.reduce((sum, i) => sum + i.price, 0) * 100) / 100;
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
