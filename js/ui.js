export const $ = id => document.getElementById(id);

const SCREEN_NAMES = ['landing', 'auth', 'title', 'shop', 'tutorial', 'gameplay', 'results'];

export const screens = {};
SCREEN_NAMES.forEach(name => {
    Object.defineProperty(screens, name, {
        get() { return $(name + '-screen'); },
        enumerable: true,
    });
});

// UI element map — uses getters so elements added after parse are found
const UI_IDS = {
    scoreDisplay: 'score-display',
    streakDisplay: 'streak-display',
    customersDisplay: 'customers-display',
    timerDisplay: 'timer-display',

    itemsList: 'items-list',
    totalDisplay: 'total-display',
    paymentSection: 'payment-section',
    paymentDisplay: 'payment-display',
    changeDueDisplay: 'change-due-display',
    cashDrawer: 'cash-drawer',
    changeGivenDisplay: 'change-given-display',
    hintDisplay: 'hint-display',
    hintAmount: 'hint-amount',

    feedbackToast: 'feedback-toast',
    toastIcon: 'toast-icon',
    toastMessage: 'toast-message',
    toastCoins: 'toast-coins',
    coinsPopup: 'coins-popup',

    resultScore: 'result-score',
    resultCustomers: 'result-customers',
    resultAccuracy: 'result-accuracy',
    resultStreak: 'result-streak',
    resultTime: 'result-time',
    resultsStars: 'results-stars',
    resultsTips: 'results-tips',
    resultsTitle: 'results-title',
    resultCoinsEarned: 'result-coins-earned',
    resultsCoinsSummary: 'results-coins-summary',
    resultsLevelUp: 'results-level-up',
    resultsNextLevel: 'results-next-level',

    bestStreakDisplay: 'best-streak-display',
    titleStats: 'title-stats',
    soundToggle: 'sound-toggle',

    titleProgress: 'title-progress',
    titleLevel: 'title-level',
    titleRank: 'title-rank',
    titleCoins: 'title-coins',
    titleLevelBar: 'title-level-bar',
    btnPlayLevel: 'btn-play-level',
    hudLevel: 'hud-level',
    hudRank: 'hud-rank',
    hudCoins: 'hud-coins',

    shopGrid: 'shop-grid',
    shopCoinsDisplay: 'shop-coins-display',

    authForm: 'auth-form',
    authEmail: 'auth-email',
    authPassword: 'auth-password',
    authName: 'auth-name',
    authNameField: 'auth-name-field',
    authTos: 'auth-tos',
    authError: 'auth-error',
    authSubmitBtn: 'btn-auth-submit',
    authLoading: 'auth-loading',
    tosModal: 'tos-modal',

    userBadge: 'user-badge',
    guestBadge: 'guest-badge',
    userName: 'user-name',
    guestResultsCta: 'guest-results-cta',
};

export const ui = {};
Object.entries(UI_IDS).forEach(([key, id]) => {
    Object.defineProperty(ui, key, {
        get() { return $(id); },
        enumerable: true,
    });
});

// ===== SCREEN MANAGEMENT =====
export function showScreen(state, name) {
    Object.values(screens).forEach(s => { if (s) s.classList.remove('active'); });
    if (screens[name]) screens[name].classList.add('active');
    state.screen = name;
}

// ===== UI FEEDBACK =====
export function showFeedback(correct, message, coins) {
    if (!ui.feedbackToast) return;
    ui.feedbackToast.className = `feedback-toast ${correct ? 'correct' : 'incorrect'}`;
    if (ui.toastIcon) ui.toastIcon.innerHTML = correct
        ? '<svg class="icon icon-sm"><use href="#icon-check"/></svg>'
        : '<svg class="icon icon-sm"><use href="#icon-x"/></svg>';
    if (ui.toastMessage) ui.toastMessage.textContent = message;

    if (coins > 0 && ui.toastCoins) {
        ui.toastCoins.textContent = `+${coins} 🪙`;
        ui.toastCoins.style.display = 'inline';
    } else if (ui.toastCoins) {
        ui.toastCoins.style.display = 'none';
    }

    ui.feedbackToast.style.animation = 'none';
    ui.feedbackToast.offsetHeight;
    ui.feedbackToast.style.animation = '';

    setTimeout(() => {
        if (ui.feedbackToast) ui.feedbackToast.className = 'feedback-toast hidden';
    }, 1200);
}

export function showCoinsPopup(amount) {
    if (amount <= 0 || !ui.coinsPopup) return;
    ui.coinsPopup.textContent = `+${amount} 🪙`;
    ui.coinsPopup.style.display = 'block';
    ui.coinsPopup.style.animation = 'none';
    ui.coinsPopup.offsetHeight;
    ui.coinsPopup.style.animation = '';
    setTimeout(() => { if (ui.coinsPopup) ui.coinsPopup.style.display = 'none'; }, 1200);
}

// ===== SCAN PROMPT =====
export function showScanPrompt(state) {
    let prompt = $('scan-prompt');
    if (!prompt) {
        prompt = document.createElement('div');
        prompt.id = 'scan-prompt';
        prompt.className = 'scan-prompt';
        prompt.innerHTML = '<svg class="icon icon-sm scan-prompt-icon"><use href="#icon-scan"/></svg> Click items on the counter to scan them!';
        $('gameplay-screen').appendChild(prompt);
    }
    prompt.classList.add('visible');
    // Auto-dismiss after 5 seconds in case they don't interact
    clearTimeout(state._scanPromptTimeout);
    state._scanPromptTimeout = setTimeout(hideScanPrompt, 5000);
}

export function hideScanPrompt() {
    const prompt = $('scan-prompt');
    if (prompt) prompt.classList.remove('visible');
}

// ===== JUICE: Floating Text =====
export function spawnFloatingText(text, x, y, color = '#06d6a0') {
    const container = $('floating-text-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;

    container.appendChild(el);

    // Clean up after animation ends
    setTimeout(() => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 1200);
}

// ===== UTILITIES =====
export function formatMoney(amount) { return '$' + amount.toFixed(2); }
export function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}
