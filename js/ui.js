export const $ = id => document.getElementById(id);

export const screens = {
    landing: $('landing-screen'),
    auth: $('auth-screen'),
    title: $('title-screen'),
    shop: $('shop-screen'),
    tutorial: $('tutorial-screen'),
    gameplay: $('gameplay-screen'),
    results: $('results-screen'),
};

export const ui = {
    scoreDisplay: $('score-display'),
    streakDisplay: $('streak-display'),
    customersDisplay: $('customers-display'),
    timerDisplay: $('timer-display'),

    itemsList: $('items-list'),
    totalDisplay: $('total-display'),
    paymentSection: $('payment-section'),
    paymentDisplay: $('payment-display'),
    changeDueDisplay: $('change-due-display'),
    cashDrawer: $('cash-drawer'),
    changeGivenDisplay: $('change-given-display'),
    hintDisplay: $('hint-display'),
    hintAmount: $('hint-amount'),

    feedbackToast: $('feedback-toast'),
    toastIcon: $('toast-icon'),
    toastMessage: $('toast-message'),
    toastCoins: $('toast-coins'),
    coinsPopup: $('coins-popup'),

    resultScore: $('result-score'),
    resultCustomers: $('result-customers'),
    resultAccuracy: $('result-accuracy'),
    resultStreak: $('result-streak'),
    resultTime: $('result-time'),
    resultsStars: $('results-stars'),
    resultsTips: $('results-tips'),
    resultsTitle: $('results-title'),
    resultCoinsEarned: $('result-coins-earned'),
    resultsCoinsSummary: $('results-coins-summary'),
    resultsLevelUp: $('results-level-up'),
    resultsNextLevel: $('results-next-level'),

    bestStreakDisplay: $('best-streak-display'),
    titleStats: $('title-stats'),
    soundToggle: $('sound-toggle'),

    // Level & Coins
    titleProgress: $('title-progress'),
    titleLevel: $('title-level'),
    titleRank: $('title-rank'),
    titleCoins: $('title-coins'),
    titleLevelBar: $('title-level-bar'),
    btnPlayLevel: $('btn-play-level'),
    hudLevel: $('hud-level'),
    hudRank: $('hud-rank'),
    hudCoins: $('hud-coins'),

    // Shop
    shopGrid: $('shop-grid'),
    shopCoinsDisplay: $('shop-coins-display'),

    // Auth
    authForm: $('auth-form'),
    authEmail: $('auth-email'),
    authPassword: $('auth-password'),
    authName: $('auth-name'),
    authNameField: $('auth-name-field'),
    authTos: $('auth-tos'),
    authError: $('auth-error'),
    authSubmitBtn: $('btn-auth-submit'),
    authLoading: $('auth-loading'),
    tosModal: $('tos-modal'),

    // User
    userBadge: $('user-badge'),
    guestBadge: $('guest-badge'),
    userName: $('user-name'),
    guestResultsCta: $('guest-results-cta'),
};

// ===== SCREEN MANAGEMENT =====
export function showScreen(state, name) {
    Object.values(screens).forEach(s => { if (s) s.classList.remove('active'); });
    if (screens[name]) screens[name].classList.add('active');
    state.screen = name;
}

// ===== UI FEEDBACK =====
export function showFeedback(correct, message, coins) {
    ui.feedbackToast.className = `feedback-toast ${correct ? 'correct' : 'incorrect'}`;
    ui.toastIcon.textContent = correct ? '✓' : '✗';
    ui.toastMessage.textContent = message;

    if (coins > 0) {
        ui.toastCoins.textContent = `+${coins} 🪙`;
        ui.toastCoins.style.display = 'inline';
    } else {
        ui.toastCoins.style.display = 'none';
    }

    ui.feedbackToast.style.animation = 'none';
    ui.feedbackToast.offsetHeight;
    ui.feedbackToast.style.animation = '';

    setTimeout(() => { ui.feedbackToast.className = 'feedback-toast hidden'; }, 1200);
}

export function showCoinsPopup(amount) {
    if (amount <= 0) return;
    ui.coinsPopup.textContent = `+${amount} 🪙`;
    ui.coinsPopup.style.display = 'block';
    ui.coinsPopup.style.animation = 'none';
    ui.coinsPopup.offsetHeight;
    ui.coinsPopup.style.animation = '';
    setTimeout(() => { ui.coinsPopup.style.display = 'none'; }, 1200);
}

// ===== SCAN PROMPT =====
export function showScanPrompt(state) {
    let prompt = $('scan-prompt');
    if (!prompt) {
        prompt = document.createElement('div');
        prompt.id = 'scan-prompt';
        prompt.className = 'scan-prompt';
        prompt.innerHTML = '<span class="scan-prompt-icon">👆</span> Click items on the counter to scan them!';
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
