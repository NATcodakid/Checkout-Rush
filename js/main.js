/**
 * main.js — Checkout Rush game controller.
 *
 * Level progression, coin economy, upgrade shop, Firebase Auth + Firestore.
 */

import { CheckoutScene } from './scene.js';
import { generateRound, DENOMINATIONS, LEVELS, calculateCoins } from './gameData.js';
import { Analytics } from './analytics.js';
import { GameAudio } from './audio.js';
import { Shop, UPGRADES, WALLPAPER_CONFIGS } from './shop.js';
import {
    signUpEmail, signInEmail, signInGoogle, signOutUser,
    onAuthChange, getCurrentUser,
    saveProgress, loadProgress, saveGameSession, acceptTOS
} from './firebase.js';

// ===== STATE =====
const state = {
    screen: 'auth',
    scene: null,
    shop: new Shop(),

    // Auth
    currentUser: null,
    isGuest: false,
    firestoreProgress: null,
    authMode: 'signin',

    // Level
    currentLevel: 1,
    coins: 0,
    coinsEarnedThisGame: 0,

    // Round
    currentRound: null,
    roundIndex: 0,
    scannedItems: [],
    changeGiven: [],
    changeGivenTotal: 0,
    roundLocked: false,

    // Patience
    patienceRemaining: 0,
    patienceInterval: null,

    // Session
    score: 0,
    streak: 0,
    bestStreak: 0,
    strikes: 0,
    customersServed: 0,
    correctCount: 0,
    incorrectCount: 0,
    startTime: null,
    timerInterval: null,
    elapsedSeconds: 0,
};

import { $, screens, ui, showScreen, showFeedback, showCoinsPopup, showScanPrompt, hideScanPrompt, spawnFloatingText, formatMoney, formatTime } from './ui.js';

// ===== INIT =====
function init() {
    console.log('[CR] init() running');
    Analytics.init();

    // ===== LANDING PAGE BUTTONS =====
    const goToSignup = () => { state.authMode = 'signup'; setAuthTab('signup'); showScreen(state, 'auth'); };
    const goToSignin = () => { state.authMode = 'signin'; setAuthTab('signin'); showScreen(state, 'auth'); };
    $('btn-landing-play').addEventListener('click', goToSignup);
    $('btn-landing-play2').addEventListener('click', goToSignup);
    $('btn-landing-signin').addEventListener('click', goToSignin);
    $('btn-landing-signup').addEventListener('click', goToSignup);
    $('btn-landing-guest').addEventListener('click', playAsGuest);
    $('btn-landing-guest2').addEventListener('click', playAsGuest);

    // Auth back button
    $('btn-auth-back').addEventListener('click', () => showScreen(state, 'landing'));

    // Guest buttons from auth page and title screen
    $('btn-play-guest-auth').addEventListener('click', playAsGuest);
    if ($('btn-create-account-title')) {
        $('btn-create-account-title').addEventListener('click', goToSignup);
    }
    if ($('btn-create-account-results')) {
        $('btn-create-account-results').addEventListener('click', goToSignup);
    }

    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.authMode = tab.dataset.tab;
            ui.authNameField.style.display = state.authMode === 'signup' ? 'block' : 'none';
            ui.authSubmitBtn.textContent = state.authMode === 'signup' ? 'Create Account' : 'Sign In';
            hideAuthError();
        });
    });

    ui.authForm.addEventListener('submit', (e) => { e.preventDefault(); handleAuthSubmit(); });
    $('btn-google-signin').addEventListener('click', handleGoogleSignIn);
    $('tos-link').addEventListener('click', (e) => { e.preventDefault(); ui.tosModal.style.display = 'flex'; });
    $('tos-close').addEventListener('click', () => { ui.tosModal.style.display = 'none'; });
    $('btn-sign-out').addEventListener('click', handleSignOut);

    // Game buttons
    $('btn-play').addEventListener('click', startGame);
    const btnShop = $('btn-shop');
    if (btnShop) btnShop.addEventListener('click', () => { renderShop(); showScreen(state, 'shop'); GameAudio.playSFX('coinClink'); });
    const btnShopClose = $('btn-shop-close');
    if (btnShopClose) btnShopClose.addEventListener('click', () => { updateTitleScreen(); showScreen(state, 'title'); });
    $('btn-how-to-play').addEventListener('click', () => { showScreen(state, 'tutorial'); GameAudio.playSFX('coinClink'); });
    $('btn-tutorial-close').addEventListener('click', () => showScreen(state, 'title'));
    $('btn-submit-change').addEventListener('click', submitChange);
    $('btn-clear-change').addEventListener('click', clearChange);
    $('btn-buy-hint').addEventListener('click', buyHint);
    $('btn-play-again').addEventListener('click', startGame);
    $('btn-back-to-menu').addEventListener('click', () => {
        GameAudio.stopMusic();
        GameAudio.playMusic('menu');
        if (state.scene) { state.scene.dispose(); state.scene = null; }
        updateTitleScreen();
        showScreen(state, 'title');
    });

    if (ui.soundToggle) {
        ui.soundToggle.addEventListener('click', () => {
            const muted = GameAudio.toggleMute();
            const iconEl = document.getElementById('sound-icon');
            if (iconEl) {
                const useEl = iconEl.querySelector('use');
                if (useEl) useEl.setAttribute('href', muted ? '#icon-volume-off' : '#icon-volume');
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (state.screen !== 'gameplay' || state.roundLocked) return;

        if (e.key === 'Enter') {
            submitChange();
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            clearChange();
        } else if (e.key >= '1' && e.key <= '9') {
            const index = parseInt(e.key) - 1;
            const buttons = ui.cashDrawer.querySelectorAll('.money-btn');
            if (buttons[index]) {
                // Simulate click on the button so styling and sound trigger
                buttons[index].click();
                buttons[index].classList.remove('active'); // ensure no sticking hover
            }
        }
    });

    // Firebase auth observer — do NOT auto-redirect if user is a guest or on landing
    onAuthChange(async (user) => {
        if (user) {
            state.isGuest = false;
            state.currentUser = user;
            await onUserSignedIn(user);
        } else if (!state.isGuest && state.screen !== 'landing' && state.screen !== 'auth') {
            // Signed out mid-game — go back to landing
            state.currentUser = null;
            state.firestoreProgress = null;
            showScreen(state, 'landing');
        }
    });

    GameAudio.playMusic('menu');
    // Start on landing page
    showScreen(state, 'landing');
}

// ===== AUTH HANDLERS =====
async function handleAuthSubmit() {
    const email = ui.authEmail.value.trim();
    const password = ui.authPassword.value;
    const name = ui.authName.value.trim();

    if (!ui.authTos.checked) { showAuthError('Please agree to the Terms of Service.'); return; }
    hideAuthError();
    setAuthLoading(true);

    try {
        if (state.authMode === 'signup') await signUpEmail(email, password, name);
        else await signInEmail(email, password);
    } catch (err) {
        showAuthError(friendlyError(err.code));
        setAuthLoading(false);
    }
}

async function handleGoogleSignIn() {
    if (!ui.authTos.checked) { showAuthError('Please agree to the Terms of Service.'); return; }
    hideAuthError();
    setAuthLoading(true);
    try { await signInGoogle(); } catch (err) { showAuthError(friendlyError(err.code)); setAuthLoading(false); }
}

async function handleSignOut() {
    GameAudio.stopMusic();
    if (state.scene) { state.scene.dispose(); state.scene = null; }
    await signOutUser();
}

async function onUserSignedIn(user) {
    setAuthLoading(false);
    state.isGuest = false;
    const displayName = user.displayName || user.email.split('@')[0];
    ui.userName.textContent = displayName;
    ui.userBadge.style.display = 'flex';
    if (ui.guestBadge) ui.guestBadge.style.display = 'none';

    const progress = await loadProgress(user.uid);
    state.firestoreProgress = progress;

    if (progress) {
        state.currentLevel = progress.currentLevel || 1;
        state.coins = progress.coins || 0;
        state.shop.loadFromFirestore(progress.shop || {});
        if (progress.bestStreak > 0) {
            ui.titleStats.style.display = 'block';
            ui.bestStreakDisplay.textContent = progress.bestStreak;
        }
    } else {
        state.currentLevel = 1;
        state.coins = 0;
        await acceptTOS(user.uid);
        await saveProgress(user.uid, {
            displayName, email: user.email,
            bestStreak: 0, totalScore: 0, totalGames: 0,
            totalCorrect: 0, totalIncorrect: 0,
            currentLevel: 1, coins: 0, shop: state.shop.getSerializable(),
        });
    }

    updateTitleScreen();
    showScreen(state, 'title');
}

function showAuthError(msg) { ui.authError.textContent = msg; ui.authError.style.display = 'block'; }
function hideAuthError() { ui.authError.style.display = 'none'; }
function setAuthLoading(on) {
    ui.authLoading.style.display = on ? 'flex' : 'none';
    ui.authSubmitBtn.disabled = on;
    $('btn-google-signin').disabled = on;
}
function setAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    ui.authNameField.style.display = tab === 'signup' ? 'block' : 'none';
    ui.authSubmitBtn.textContent = tab === 'signup' ? 'Create Account' : 'Sign In';
}
function playAsGuest() {
    state.isGuest = true;
    state.currentUser = null;
    state.currentLevel = 1;
    state.coins = 0;
    // Show guest badge, hide user badge
    ui.userBadge.style.display = 'none';
    if (ui.guestBadge) ui.guestBadge.style.display = 'flex';
    ui.titleProgress.style.display = 'none'; // no progress bar for guests
    GameAudio.playMusic('menu');
    showScreen(state, 'title');
}
function friendlyError(code) {
    const map = {
        'auth/email-already-in-use': 'That email is already registered. Try signing in.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/user-not-found': 'No account found with that email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/invalid-credential': 'Invalid email or password.',
    };
    return map[code] || 'Something went wrong. Please try again.';
}



// ===== TITLE SCREEN UPDATE =====
function updateTitleScreen() {
    if (state.isGuest) return; // guests don't get progress display
    const lvl = getLevelConfig();
    ui.titleProgress.style.display = 'block';
    ui.titleLevel.textContent = state.currentLevel;
    ui.titleRank.textContent = lvl.name;
    ui.titleCoins.textContent = state.coins;
    if (ui.btnPlayLevel) ui.btnPlayLevel.textContent = state.currentLevel;

    // XP bar: progress within current tier
    const tierStart = state.currentLevel <= 3 ? 1 : state.currentLevel <= 6 ? 4 : state.currentLevel <= 10 ? 7 : state.currentLevel <= 14 ? 11 : state.currentLevel <= 18 ? 15 : 19;
    const tierEnd = state.currentLevel <= 3 ? 3 : state.currentLevel <= 6 ? 6 : state.currentLevel <= 10 ? 10 : state.currentLevel <= 14 ? 14 : state.currentLevel <= 18 ? 18 : 20;
    const tierSpan = tierEnd - tierStart;
    const pct = tierSpan > 0 ? ((state.currentLevel - tierStart) / tierSpan) * 100 : 100;
    ui.titleLevelBar.style.width = `${Math.min(pct, 100)}%`;

    const localBest = Analytics.getBestStreak();
    const fbBest = state.firestoreProgress?.bestStreak || 0;
    const best = Math.max(localBest, fbBest);
    if (best > 0) {
        ui.titleStats.style.display = 'block';
        ui.bestStreakDisplay.textContent = best;
    }
}

function getLevelConfig() {
    const idx = Math.min(state.currentLevel, LEVELS.length) - 1;
    return LEVELS[idx];
}

// ===== SHOP =====
function renderShop() {
    if (!ui.shopCoinsDisplay || !ui.shopGrid) return;
    ui.shopCoinsDisplay.textContent = state.coins;
    ui.shopGrid.innerHTML = '';

    const activeWp = state.shop.getActiveWallpaper();

    UPGRADES.forEach(upgrade => {
        const owned = state.shop.getOwnedCount(upgrade.id);
        const canBuy = state.shop.canBuy(upgrade.id, state.coins);
        const maxed = owned >= upgrade.maxOwned;
        const isWallpaper = upgrade.effect?.type === 'wallpaper';
        const isActiveWp = isWallpaper && upgrade.effect.value === activeWp;

        const card = document.createElement('div');
        card.className = `shop-card ${maxed ? 'owned' : ''} ${isActiveWp ? 'active-wallpaper' : ''}`;

        // Build action area: buy button, owned indicator, or wallpaper set-active button
        let actionHTML = '';
        if (maxed || (owned > 0 && isWallpaper)) {
            const ownedLabel = upgrade.maxOwned > 1
                ? `Owned (${owned}/${upgrade.maxOwned})`
                : `Owned`;
            actionHTML = `<div class="shop-card-owned">${ownedLabel}</div>`;
            if (isWallpaper) {
                actionHTML += isActiveWp
                    ? `<div class="shop-card-active-badge">✦ Active</div>`
                    : `<button class="shop-card-btn shop-card-set-active">🎨 Set Active</button>`;
            }
        } else if (!maxed) {
            actionHTML = canBuy
                ? `<button class="shop-card-btn">Buy</button>`
                : `<button class="shop-card-btn" disabled>Not enough coins</button>`;
            if (owned > 0) actionHTML += `<div class="shop-card-owned">${owned}/${upgrade.maxOwned}</div>`;
        }

        card.innerHTML = `
            <div class="shop-card-icon"><svg class="icon" style="width:2.5rem;height:2.5rem;color:var(--color-primary)"><use href="${upgrade.iconSvg || '#icon-star'}"/></svg></div>
            <div class="shop-card-name">${upgrade.name}</div>
            <div class="shop-card-desc">${upgrade.description}</div>
            <div class="shop-card-price">🪙 ${upgrade.cost}</div>
            ${actionHTML}
        `;

        // Buy button
        const buyBtn = card.querySelector('.shop-card-btn:not(.shop-card-set-active)');
        if (buyBtn && canBuy && !maxed) {
            buyBtn.addEventListener('click', () => {
                const boughtUpgrade = state.shop.buy(upgrade.id);
                state.coins -= upgrade.cost;
                GameAudio.playSFX('coinClink');
                // Auto-activate consumables immediately on purchase
                if (boughtUpgrade && boughtUpgrade.consumable) {
                    state.shop.activateConsumable(upgrade.id);
                }
                // Auto-select first wallpaper bought
                if (isWallpaper && !state.shop.getActiveWallpaper()) {
                    state.shop.setActiveWallpaper(upgrade.effect.value);
                }
                saveShopState();
                renderShop();
            });
        }

        // Wallpaper "Set Active" button
        const setActiveBtn = card.querySelector('.shop-card-set-active');
        if (setActiveBtn) {
            setActiveBtn.addEventListener('click', () => {
                state.shop.setActiveWallpaper(upgrade.effect.value);
                GameAudio.playSFX('coinClink');
                saveShopState();
                renderShop();
            });
        }

        ui.shopGrid.appendChild(card);
    });
}

async function saveShopState() {
    if (!state.currentUser) return;
    await saveProgress(state.currentUser.uid, {
        coins: state.coins,
        shop: state.shop.getSerializable(),
    });
}

// ===== GAME FLOW =====
async function startGame() {
    const lvl = getLevelConfig();

    state.roundIndex = 0;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.strikes = 0;
    state.customersServed = 0;
    state.correctCount = 0;
    state.incorrectCount = 0;
    state.coinsEarnedThisGame = 0;
    state.startTime = Date.now();
    state.elapsedSeconds = 0;
    state.roundLocked = false;

    // Init 3D scene
    if (!state.scene) {
        const container = $('three-container');
        container.innerHTML = '';
        state.scene = new CheckoutScene(container, handleItemScanned);
        await state.scene.waitForLoad();
        state.scene._populateShelves();
    } else {
        await state.scene.waitForLoad();
    }

    // Set patience BEFORE setupQueue so the first customer gets a bar
    state.scene.setPatienceMax(lvl.patience || 0);
    state.scene.setupQueue(Math.min(lvl.customers, 4));

    // Golden scanner cosmetic — re-apply every time (scene may be reused)
    if (state.shop.hasGoldenScanner() && state.scene.scanRing) {
        state.scene.scanRing.material.color.setHex(0xffd700);
        state.scene.scanRing.material.emissive.setHex(0xffd700);
    } else if (state.scene.scanRing) {
        state.scene.scanRing.material.color.setHex(0x00ff88);
        state.scene.scanRing.material.emissive.setHex(0x00cc66);
    }

    // Always re-apply wallpaper (covers upgrades purchased mid-session)
    const wpKey = state.shop.getActiveWallpaper();
    if (wpKey && WALLPAPER_CONFIGS[wpKey]) {
        state.scene.applyWallpaper(WALLPAPER_CONFIGS[wpKey]);
    } else {
        // Restore default store colours
        state.scene.applyWallpaper(WALLPAPER_CONFIGS['default']);
    }

    // Show first-scan prompt for first round only (cleared after first click)
    state.isFirstScanThisLevel = true;

    GameAudio.stopMusic();
    GameAudio.playMusic('bgm');
    Analytics.startSession('level_' + state.currentLevel);

    showScreen(state, 'gameplay');
    if (ui.hudLevel) ui.hudLevel.textContent = state.currentLevel;
    if (ui.hudCoins) ui.hudCoins.textContent = state.coins;

    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.elapsedSeconds++;
        ui.timerDisplay.textContent = formatTime(state.elapsedSeconds);
    }, 1000);

    updateHUD();
    nextRound();
}

function nextRound() {
    const lvl = getLevelConfig();
    if (state.roundIndex >= lvl.customers) { endGame(); return; }

    state.roundLocked = false;
    state.currentRound = generateRound(lvl);
    state.scannedItems = [];
    state.changeGiven = [];
    state.changeGivenTotal = 0;

    state.scene.setItems(state.currentRound.items);
    state.scene.highlightItems(); // Pulse unscanned items so player knows to click them

    ui.itemsList.innerHTML = '';
    ui.totalDisplay.textContent = formatMoney(0);
    ui.paymentSection.classList.add('hidden');
    ui.changeGivenDisplay.textContent = formatMoney(0);
    ui.changeGivenDisplay.style.color = '';
    ui.cashDrawer.innerHTML = '';
    ui.hintDisplay.style.display = 'none';

    // Show "Click items to scan" prompt for new players (first round only)
    if (state.isFirstScanThisLevel) {
        showScanPrompt(state);
    }

    clearInterval(state.patienceInterval);
    if (lvl.patience > 0) {
        const bonusTime = state.shop.getTimerBonus ? state.shop.getTimerBonus() : 0;
        state.patienceRemaining = lvl.patience + bonusTime;
        state.scene.setPatienceMax(state.patienceRemaining);
        state.scene.ensurePatienceBar();
        state.scene.updatePatience(state.patienceRemaining);

        state.patienceInterval = setInterval(() => {
            state.patienceRemaining -= 0.5;
            state.scene.updatePatience(state.patienceRemaining);
            if (state.patienceRemaining <= 0) {
                clearInterval(state.patienceInterval);
                onCustomerLeft();
            }
        }, 500);
    }
}

async function submitChange() {
    if (!state.currentRound || state.roundLocked) return;
    state.roundLocked = true;
    clearInterval(state.patienceInterval);
    state.scene.removePatienceBar();

    const lvl = getLevelConfig();
    const expected = state.currentRound.changeDue;
    const given = Math.round(state.changeGivenTotal * 100) / 100;
    const correct = Math.abs(given - expected) < 0.001;

    // Calculate coins
    let earnedCoins = calculateCoins(correct, state.streak, lvl);
    earnedCoins = Math.floor(earnedCoins * state.shop.getCoinMultiplier());
    earnedCoins = Math.floor(earnedCoins * (1 + state.shop.getTipBonus()));
    state.coins += earnedCoins;
    state.coinsEarnedThisGame += earnedCoins;
    if (ui.hudCoins) ui.hudCoins.textContent = state.coins;

    Analytics.logRound({
        roundIndex: state.roundIndex,
        changeDue: expected,
        changeGiven: given,
        correct,
        items: state.currentRound.items.map(i => ({ name: i.name, price: i.price })),
        total: state.currentRound.total,
        payment: state.currentRound.payment,
    });

    if (correct) {
        state.score += 100 + (state.streak * 10);
        state.streak++;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        state.correctCount++;
        state.customersServed++;

        GameAudio.playSFX('correct');
        if (state.streak >= 2) {
            if (state.streak >= 3) GameAudio.playSFX('streak');
            // JUICE: Float streak text
            spawnFloatingText(`Streak x${state.streak}!`, window.innerWidth * 0.5, window.innerHeight * 0.4, '#ff6b35');
        }

        showFeedback(true, 'Correct!', earnedCoins);
        state.scene.flashRegister(true);
        state.scene.customerReact(true);
        spawnFloatingText('✅', window.innerWidth * 0.5, window.innerHeight * 0.35);
    } else {
        state.streak = 0;
        state.incorrectCount++;
        state.customersServed++;

        GameAudio.playSFX('incorrect');

        const diff = given - expected;
        let hint = given === 0 ? `The change was ${formatMoney(expected)}`
            : diff > 0 ? `Too much! +${formatMoney(diff)} extra`
                : `Not enough! ${formatMoney(Math.abs(diff))} short`;
        showFeedback(false, `Oops! ${hint}`, earnedCoins);
        state.scene.flashRegister(false);
        state.scene.customerReact(false);
        spawnFloatingText('❌', window.innerWidth * 0.5, window.innerHeight * 0.35);

        // Strike logic & Juice
        state.strikes++;
        document.body.classList.remove('shake', 'flash-red');
        void document.body.offsetWidth; // force reflow
        document.body.classList.add('shake', 'flash-red');

        if (state.strikes >= 3) {
            updateHUD();
            await new Promise(r => setTimeout(r, 1200));
            endGame(true);
            return;
        }
    }

    state.roundIndex++;
    updateHUD();

    // Show coins popup
    showCoinsPopup(earnedCoins);

    await new Promise(r => setTimeout(r, 1200));
    await state.scene.advanceQueue();

    const maxCustomers = lvl.customers;
    if (state.roundIndex < maxCustomers) state.scene.addToQueue();

    await new Promise(r => setTimeout(r, 300));
    nextRound();
}

async function onCustomerLeft() {
    if (!state.currentRound || state.roundLocked) return;
    state.roundLocked = true;

    // Customer leaves — count as incorrect, 0 coins
    state.streak = 0;
    state.incorrectCount++;
    state.customersServed++;
    state.roundIndex++;

    GameAudio.playSFX('incorrect');
    showFeedback(false, 'Too slow! Customer left 😤', 0);
    state.scene.flashRegister(false);
    state.scene.customerAngry();  // Angry stomp/shake animation

    // Strike logic & Juice
    state.strikes++;
    document.body.classList.remove('shake', 'flash-red');
    void document.body.offsetWidth; // force reflow
    document.body.classList.add('shake', 'flash-red');

    updateHUD();

    if (state.strikes >= 3) {
        await new Promise(r => setTimeout(r, 1200));
        endGame(true);
        return;
    }

    await new Promise(r => setTimeout(r, 1200));
    await state.scene.advanceQueue();

    const lvl = getLevelConfig();
    if (state.roundIndex < lvl.customers) state.scene.addToQueue();

    await new Promise(r => setTimeout(r, 300));
    nextRound();
}

async function endGame(isGameOver = false) {
    clearInterval(state.timerInterval);
    clearInterval(state.patienceInterval);
    state.scene.removePatienceBar();
    state.shop.clearConsumables();

    GameAudio.playSFX('roundEnd');
    GameAudio.stopMusic();
    Analytics.endSession(state.score, state.bestStreak);

    const totalAttempts = state.correctCount + state.incorrectCount;
    const accuracy = totalAttempts > 0 ? Math.round(state.correctCount / totalAttempts * 100) : 0;

    let stars = 1;
    if (accuracy >= 60) stars = 2;
    if (accuracy >= 85) stars = 3;

    ui.resultScore.textContent = state.score;
    ui.resultCustomers.textContent = state.customersServed;
    ui.resultAccuracy.textContent = `${accuracy}%`;
    ui.resultStreak.textContent = state.bestStreak;
    ui.resultTime.textContent = formatTime(state.elapsedSeconds);
    if (ui.resultsStars) {
        let starsHTML = '';
        for (let i = 0; i < stars; i++) starsHTML += '<svg class="icon results-star filled"><use href="#icon-star"/></svg>';
        for (let i = stars; i < 3; i++) starsHTML += '<svg class="icon results-star empty"><use href="#icon-star-empty"/></svg>';
        ui.resultsStars.innerHTML = starsHTML;
    }
    if (ui.resultCoinsEarned) ui.resultCoinsEarned.textContent = state.coinsEarnedThisGame;

    // Level up logic
    const canLevelUp = !isGameOver && accuracy >= 50 && state.currentLevel < LEVELS.length;
    if (isGameOver) {
        if (ui.resultsLevelUp) ui.resultsLevelUp.style.display = 'none';
        ui.resultsTitle.textContent = 'Game Over! 3 Strikes';
        $('btn-play-again').innerHTML = `<svg class="icon icon-sm"><use href="#icon-play"/></svg> Retry Level ${state.currentLevel}`;
    } else if (canLevelUp) {
        state.currentLevel++;
        if (ui.resultsLevelUp) ui.resultsLevelUp.style.display = 'block';
        if (ui.resultsNextLevel) ui.resultsNextLevel.textContent = `Level ${state.currentLevel} — ${getLevelConfig().name}`;
        ui.resultsTitle.textContent = 'Level Complete!';
        $('btn-play-again').innerHTML = `<svg class="icon icon-sm"><use href="#icon-play"/></svg> Play Level ${state.currentLevel}`;
    } else if (accuracy < 50) {
        if (ui.resultsLevelUp) ui.resultsLevelUp.style.display = 'none';
        ui.resultsTitle.textContent = 'Keep Practicing! 💪';
        $('btn-play-again').innerHTML = `<svg class="icon icon-sm"><use href="#icon-play"/></svg> Retry Level ${state.currentLevel}`;
    } else {
        if (ui.resultsLevelUp) ui.resultsLevelUp.style.display = 'none';
        if (accuracy >= 85) ui.resultsTitle.textContent = 'Amazing Work!';
        else ui.resultsTitle.textContent = 'Great Job! 👏';
        $('btn-play-again').innerHTML = `<svg class="icon icon-sm"><use href="#icon-play"/></svg> Play Level ${state.currentLevel}`;
    }

    const tips = [];
    if (accuracy < 60) tips.push('Tip: Try counting up from the total to the payment.');
    if (state.bestStreak < 3) tips.push('Tip: Take your time! Accuracy counts more than speed.');
    if (state.coinsEarnedThisGame > 0) tips.push(`You earned ${state.coinsEarnedThisGame} coins! Check the shop.`);
    ui.resultsTips.innerHTML = tips.join('<br>');

    // Save to Firestore (skip for guests)
    if (state.currentUser && !state.isGuest) {
        const uid = state.currentUser.uid;

        await saveGameSession(uid, {
            level: state.currentLevel,
            score: state.score,
            accuracy,
            bestStreak: state.bestStreak,
            duration: state.elapsedSeconds * 1000,
            customersServed: state.customersServed,
            correctCount: state.correctCount,
            incorrectCount: state.incorrectCount,
            coinsEarned: state.coinsEarnedThisGame,
        });

        const prev = state.firestoreProgress || {};
        const newProgress = {
            totalScore: (prev.totalScore || 0) + state.score,
            totalGames: (prev.totalGames || 0) + 1,
            totalCorrect: (prev.totalCorrect || 0) + state.correctCount,
            totalIncorrect: (prev.totalIncorrect || 0) + state.incorrectCount,
            bestStreak: Math.max(prev.bestStreak || 0, state.bestStreak),
            currentLevel: state.currentLevel,
            coins: state.coins,
            shop: state.shop.getSerializable(),
        };
        await saveProgress(uid, newProgress);
        state.firestoreProgress = { ...prev, ...newProgress };

        ui.bestStreakDisplay.textContent = newProgress.bestStreak;
    }

    ui.titleStats.style.display = 'block';
    setTimeout(() => GameAudio.playMusic('menu'), 1500);

    // Show guest CTA on results screen
    if (ui.guestResultsCta) {
        ui.guestResultsCta.style.display = state.isGuest ? 'flex' : 'none';
    }

    showScreen(state, 'results');
}

// ===== UI =====
function handleItemScanned(item, i) {
    if (state.roundLocked) return;

    // Dismiss prompt on first scan
    if (state.isFirstScanThisLevel) {
        state.isFirstScanThisLevel = false;
        hideScanPrompt();
    }

    state.scannedItems.push(item);

    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
        <span class="item-name">${item.name}</span>
        <span class="item-price">${formatMoney(item.price)}</span>
    `;
    ui.itemsList.appendChild(row);
    ui.itemsList.scrollTop = ui.itemsList.scrollHeight;

    const currentTotal = state.scannedItems.reduce((s, it) => s + it.price, 0);
    ui.totalDisplay.textContent = formatMoney(currentTotal);

    // Juice: Spawn floating text near center
    spawnFloatingText(`+$${item.price.toFixed(2)}`, window.innerWidth * 0.5 + (Math.random() * 100 - 50), window.innerHeight * 0.5);

    GameAudio.playSFX('scan');

    if (state.scannedItems.length === state.currentRound.items.length) {
        state.scene.clearHighlights(); // All items scanned — stop pulsing
        setTimeout(() => triggerPaymentPhase(), 700);
    }
}

function triggerPaymentPhase() {
    const lvl = getLevelConfig();
    ui.paymentSection.classList.remove('hidden');

    // Show total in payment section so player doesn't need to look back
    const totalEcho = $('payment-total-echo');
    if (totalEcho) totalEcho.textContent = formatMoney(state.currentRound.total);

    ui.paymentDisplay.textContent = formatMoney(state.currentRound.payment);

    // Show or hide change-due based on level config
    if (lvl.showChange) {
        ui.changeDueDisplay.textContent = formatMoney(state.currentRound.changeDue);
        ui.changeDueDisplay.style.opacity = '1';
    } else {
        ui.changeDueDisplay.textContent = '???';
        ui.changeDueDisplay.style.opacity = '0.5';
    }

    // Show hint if upgrade owned (even when change is hidden)
    if (state.shop.hasHintHelper()) {
        ui.hintDisplay.style.display = 'block';
        ui.hintAmount.textContent = formatMoney(state.currentRound.changeDue);
        setTimeout(() => { ui.hintDisplay.style.display = 'none'; }, 3000);
    }

    if (state.currentLevel === 1) {
        ui.cashDrawer.classList.add('drawer-pulse');
    } else {
        ui.cashDrawer.classList.remove('drawer-pulse');
    }

    renderCashDrawer();
}

function renderCashDrawer() {
    const lvl = getLevelConfig();
    ui.cashDrawer.innerHTML = '';

    const allowedBills = new Set((lvl.moneyOptions || []).map(v => v));

    const filteredDenoms = DENOMINATIONS.filter(d => {
        if (d.type === 'coin') return true;
        return allowedBills.has(d.value);
    });

    filteredDenoms.forEach(denom => {
        const btn = document.createElement('button');
        btn.className = 'money-btn';
        btn.innerHTML = `<span class="money-emoji">${denom.emoji}</span>${denom.label}`;
        btn.addEventListener('click', () => {
            if (state.roundLocked) return;
            addChange(denom.value);
            GameAudio.playSFX(denom.type === 'coin' ? 'coinClink' : 'billRustle');
            btn.classList.add('selected');
            setTimeout(() => btn.classList.remove('selected'), 200);
        });
        ui.cashDrawer.appendChild(btn);
    });
}

function addChange(value) {
    ui.cashDrawer.classList.remove('drawer-pulse');
    state.changeGiven.push(value);
    state.changeGivenTotal = Math.round(state.changeGiven.reduce((s, v) => s + v, 0) * 100) / 100;
    ui.changeGivenDisplay.textContent = formatMoney(state.changeGivenTotal);

    const expected = state.currentRound.changeDue;
    if (Math.abs(state.changeGivenTotal - expected) < 0.001) ui.changeGivenDisplay.style.color = '#06d6a0';
    else if (state.changeGivenTotal > expected) ui.changeGivenDisplay.style.color = '#ef476f';
    else ui.changeGivenDisplay.style.color = '#ff6b35';
}

function clearChange() {
    if (state.roundLocked) return;
    state.changeGiven = [];
    state.changeGivenTotal = 0;
    ui.changeGivenDisplay.textContent = formatMoney(0);
    ui.changeGivenDisplay.style.color = '';
    GameAudio.playSFX('coinClink');
}

function buyHint() {
    if (state.roundLocked) return;
    if (state.coins < 5) {
        showFeedback(false, 'Not enough coins (Need 5🪙)', 0);
        return;
    }
    
    // Deduct coins
    state.coins -= 5;
    if (ui.hudCoins) ui.hudCoins.textContent = state.coins;
    GameAudio.playSFX('coinClink');
    
    const expected = state.currentRound.changeDue;
    const remaining = Math.round((expected - state.changeGivenTotal) * 100) / 100;
    
    if (remaining <= 0) {
        showFeedback(true, 'No more change needed!', 0);
        return;
    }
    
    const lvl = getLevelConfig();
    const allowedBills = new Set((lvl.moneyOptions || []).map(v => v));
    const filteredDenoms = DENOMINATIONS.filter(d => {
        if (d.type === 'coin') return true;
        return allowedBills.has(d.value);
    });
    
    filteredDenoms.sort((a, b) => b.value - a.value);
    
    let bestDenom = null;
    for (const d of filteredDenoms) {
        if (d.value <= remaining + 0.001) {
            bestDenom = d;
            break;
        }
    }
    
    if (bestDenom) {
        const buttons = ui.cashDrawer.querySelectorAll('.money-btn');
        buttons.forEach(btn => {
            if (btn.textContent.includes(bestDenom.label)) {
                btn.classList.add('hint-highlight');
                setTimeout(() => btn.classList.remove('hint-highlight'), 1500);
            }
        });
        showFeedback(true, `Hint: Try a ${bestDenom.label}`, 0);
    } else {
        showFeedback(true, 'Just submit it!', 0);
    }
}

function updateHUD() {
    const lvl = getLevelConfig();
    ui.scoreDisplay.textContent = state.score;
    if (ui.streakDisplay) {
        ui.streakDisplay.innerHTML = `${state.streak} <svg class="icon icon-xs" style="color:var(--color-primary)"><use href="#icon-flame"/></svg>`;
    }
    ui.customersDisplay.textContent = `${state.roundIndex} / ${lvl.customers}`;
    if (ui.hudRank) ui.hudRank.textContent = lvl.name;

    // Draw strikes
    const strikesEl = $('hud-strikes');
    if (strikesEl) {
        let strikeText = '';
        for (let i = 0; i < 3; i++) {
            strikeText += i < state.strikes
                ? '<svg class="icon icon-xs" style="color:var(--color-danger)"><use href="#icon-x"/></svg> '
                : '<svg class="icon icon-xs" style="color:var(--color-text-muted);opacity:.4"><use href="#icon-x"/></svg> ';
        }
        strikesEl.innerHTML = strikeText;
    }
}





// ===== START =====
init();
