/**
 * shop.js — Upgrade shop for Checkout Rush.
 *
 * Players spend coins earned from transactions to buy upgrades.
 * Upgrades persist in Firestore and modify gameplay.
 */

export const UPGRADES = [
    {
        id: 'speed_boost',
        name: 'Speed Boost',
        description: '+5 seconds on each customer timer',
        cost: 50,
        iconSvg: '#icon-flame',
        maxOwned: 3,
        effect: { type: 'timer_bonus', value: 5 },
    },
    {
        id: 'hint_helper',
        name: 'Hint Helper',
        description: 'Shows the correct change amount briefly',
        cost: 75,
        iconSvg: '#icon-help',
        maxOwned: 1,
        effect: { type: 'hint', value: true },
    },
    {
        id: 'double_coins',
        name: 'Double Coins',
        description: '2× coins for one full level',
        cost: 100,
        iconSvg: '#icon-coin',
        maxOwned: 5,
        consumable: true,
        effect: { type: 'coin_multiplier', value: 2 },
    },
    {
        id: 'lucky_scanner',
        name: 'Lucky Scanner',
        description: 'Auto-scans one item per round for one level',
        cost: 150,
        iconSvg: '#icon-scan',
        maxOwned: 3,
        consumable: true,
        effect: { type: 'auto_scan', value: 1 },
    },
    {
        id: 'star_cashier',
        name: 'Star Cashier',
        description: 'Golden scanner glow (cosmetic)',
        cost: 200,
        iconSvg: '#icon-star',
        maxOwned: 1,
        effect: { type: 'cosmetic', value: 'golden_scanner' },
    },
    {
        id: 'tip_jar',
        name: 'Tip Jar',
        description: '+20% bonus coins from tips',
        cost: 120,
        iconSvg: '#icon-receipt',
        maxOwned: 1,
        effect: { type: 'tip_bonus', value: 0.2 },
    },
];

/**
 * Shop state management.
 * ownedUpgrades = { speed_boost: 2, hint_helper: 1, ... }
 */
export class Shop {
    constructor() {
        this.ownedUpgrades = {};
        this.activeConsumables = {};
    }

    loadFromFirestore(data) {
        this.ownedUpgrades = data?.ownedUpgrades || {};
        this.activeConsumables = data?.activeConsumables || {};
    }

    getSerializable() {
        return {
            ownedUpgrades: { ...this.ownedUpgrades },
            activeConsumables: { ...this.activeConsumables },
        };
    }

    canBuy(upgradeId, coins) {
        const upgrade = UPGRADES.find(u => u.id === upgradeId);
        if (!upgrade) return false;
        const owned = this.ownedUpgrades[upgradeId] || 0;
        return coins >= upgrade.cost && owned < upgrade.maxOwned;
    }

    buy(upgradeId) {
        const upgrade = UPGRADES.find(u => u.id === upgradeId);
        if (!upgrade) return null;
        this.ownedUpgrades[upgradeId] = (this.ownedUpgrades[upgradeId] || 0) + 1;
        return upgrade;
    }

    getOwnedCount(upgradeId) {
        return this.ownedUpgrades[upgradeId] || 0;
    }

    // Check if a non-consumable upgrade is owned
    hasUpgrade(upgradeId) {
        return (this.ownedUpgrades[upgradeId] || 0) > 0;
    }

    // Activate a consumable for one level
    activateConsumable(upgradeId) {
        const upgrade = UPGRADES.find(u => u.id === upgradeId);
        if (!upgrade || !upgrade.consumable) return false;
        if ((this.ownedUpgrades[upgradeId] || 0) <= 0) return false;
        this.ownedUpgrades[upgradeId]--;
        this.activeConsumables[upgradeId] = true;
        return true;
    }

    clearConsumables() {
        this.activeConsumables = {};
    }

    // ===== EFFECT GETTERS =====
    getTimerBonus() {
        const owned = this.ownedUpgrades['speed_boost'] || 0;
        return owned * 5; // 5 sec per upgrade
    }

    getCoinMultiplier() {
        if (this.activeConsumables['double_coins']) return 2;
        return 1;
    }

    getTipBonus() {
        if (this.hasUpgrade('tip_jar')) return 0.2;
        return 0;
    }

    hasHintHelper() {
        return this.hasUpgrade('hint_helper');
    }

    hasGoldenScanner() {
        return this.hasUpgrade('star_cashier');
    }

    getAutoScanCount() {
        if (this.activeConsumables['lucky_scanner']) return 1;
        return 0;
    }

    /**
     * Returns the count of a specific consumable that the player owns
     * (hasn't activated yet). Useful for showing "X remaining" in shop.
     */
    getConsumableStockCount(upgradeId) {
        return this.ownedUpgrades[upgradeId] || 0;
    }
}

