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
        description: 'Auto-scans one item per customer',
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
    // ===== WALLPAPERS =====
    {
        id: 'wallpaper_sunset',
        name: 'Sunset Vibes',
        description: 'Warm orange walls for your store',
        cost: 80,
        iconSvg: '#icon-sparkles',
        maxOwned: 1,
        effect: { type: 'wallpaper', value: 'sunset' },
    },
    {
        id: 'wallpaper_ocean',
        name: 'Ocean Breeze',
        description: 'Cool blue walls with teal floor mat',
        cost: 80,
        iconSvg: '#icon-sparkles',
        maxOwned: 1,
        effect: { type: 'wallpaper', value: 'ocean' },
    },
    {
        id: 'wallpaper_cafe',
        name: 'Cozy Café',
        description: 'Rich brown brick walls',
        cost: 100,
        iconSvg: '#icon-sparkles',
        maxOwned: 1,
        effect: { type: 'wallpaper', value: 'cafe' },
    },
    {
        id: 'wallpaper_neon',
        name: 'Neon Night',
        description: 'Dark walls with neon accents',
        cost: 150,
        iconSvg: '#icon-sparkles',
        maxOwned: 1,
        effect: { type: 'wallpaper', value: 'neon' },
    },
];

export const WALLPAPER_CONFIGS = {
    sunset: { color: 0xffba6c, floorColor: 0x8b5e3c },
    ocean: { color: 0xb8d8e8, floorColor: 0x2a7886 },
    cafe: { color: 0x8b6f47, floorColor: 0x5c3a1e },
    neon: { color: 0x1a1a2e, floorColor: 0x6c2dc7 },
    default: { color: 0xfaf3e0, floorColor: 0x3a6b35 },
};

/**
 * Shop state management.
 * ownedUpgrades = { speed_boost: 2, hint_helper: 1, ... }
 */
export class Shop {
    constructor() {
        this.ownedUpgrades = {};
        this.activeConsumables = {};
        /** Key of the wallpaper the player has chosen to use, or null */
        this.activeWallpaper = null;
    }

    loadFromFirestore(data) {
        this.ownedUpgrades = data?.ownedUpgrades || {};
        this.activeConsumables = data?.activeConsumables || {};
        this.activeWallpaper = data?.activeWallpaper || null;
    }

    getSerializable() {
        return {
            ownedUpgrades: { ...this.ownedUpgrades },
            activeConsumables: { ...this.activeConsumables },
            activeWallpaper: this.activeWallpaper,
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

    // ===== WALLPAPER SELECTION =====
    /** Explicitly set which wallpaper is active. Pass null to revert to default. */
    setActiveWallpaper(wpValue) {
        this.activeWallpaper = wpValue;
    }

    /**
     * Returns the wallpaper value string ('sunset', 'ocean', etc.)
     * Uses the explicitly selected wallpaper, or falls back to the first owned one.
     */
    getActiveWallpaper() {
        // Use explicit choice if it's still owned
        if (this.activeWallpaper) {
            const id = `wallpaper_${this.activeWallpaper}`;
            if ((this.ownedUpgrades[id] || 0) > 0) return this.activeWallpaper;
        }
        // Fallback: first owned wallpaper
        for (const [id, count] of Object.entries(this.ownedUpgrades)) {
            if (id.startsWith('wallpaper_') && count > 0) {
                const upgrade = UPGRADES.find(u => u.id === id);
                if (upgrade) return upgrade.effect.value;
            }
        }
        return null;
    }

    /** Returns all wallpaper upgrade IDs that the player owns */
    getOwnedWallpapers() {
        return UPGRADES.filter(u =>
            u.effect?.type === 'wallpaper' && (this.ownedUpgrades[u.id] || 0) > 0
        );
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
}
