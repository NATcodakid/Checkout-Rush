/**
 * main.js — Checkout Rush game controller with Firebase Auth + Firestore.
 *
 * Manages auth flow, screen transitions, game state, round flow,
 * UI updates, audio, customer queue, and Firestore progress persistence.
 */

import { CheckoutScene } from './scene.js';
import { generateRound, DENOMINATIONS, DIFFICULTY } from './gameData.js';
import { Analytics } from './analytics.js';
import { GameAudio } from './audio.js';
import {
    signUpEmail, signInEmail, signInGoogle, signOutUser,
    onAuthChange, getCurrentUser,
    saveProgress, loadProgress, saveGameSession, acceptTOS
} from './firebase.js';

// ===== STATE =====
const state = {
    difficulty: 'easy',
    screen: 'auth',
    scene: null,

    // Auth
    currentUser: null,
    firestoreProgress: null,
    authMode: 'signin', // 'signin' or 'signup'

    // Round
    currentRound: null,
    roundIndex: 0,
    changeGiven: [],
    changeGivenTotal: 0,
    roundLocked: false,

    // Session
    score: 0,
    streak: 0,
    bestStreak: 0,
    customersServed: 0,
    correctCount: 0,
    incorrectCount: 0,
    startTime: null,
    timerInterval: null,
    elapsedSeconds: 0,
};

// ===== DOM REFERENCES =====
const $ = id => document.getElementById(id);

const screens = {
    auth: $('auth-screen'),
    title: $('title-screen'),
    tutorial: $('tutorial-screen'),
    gameplay: $('gameplay-screen'),
    results: $('results-screen'),
};

const ui = {
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

    feedbackToast: $('feedback-toast'),
    toastIcon: $('toast-icon'),
    toastMessage: $('toast-message'),

    resultScore: $('result-score'),
    resultCustomers: $('result-customers'),
    resultAccuracy: $('result-accuracy'),
    resultStreak: $('result-streak'),
    resultTime: $('result-time'),
    resultsStars: $('results-stars'),
    resultsTips: $('results-tips'),
    resultsTitle: $('results-title'),

    bestStreakDisplay: $('best-streak-display'),
    titleStats: $('title-stats'),
    soundToggle: $('sound-toggle'),

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
    userName: $('user-name'),
    hudUser: $('hud-user'),
    hudUsername: $('hud-username'),
};

// ===== INIT =====
function init() {
    Analytics.init();

    // ---- Auth Event Listeners ----
    // Tab toggle
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

    // Auth form submit
    ui.authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAuthSubmit();
    });

    // Google sign-in
    $('btn-google-signin').addEventListener('click', handleGoogleSignIn);

    // TOS link
    $('tos-link').addEventListener('click', (e) => {
        e.preventDefault();
        ui.tosModal.style.display = 'flex';
    });
    $('tos-close').addEventListener('click', () => {
        ui.tosModal.style.display = 'none';
    });

    // Sign out
    $('btn-sign-out').addEventListener('click', handleSignOut);

    // ---- Game Event Listeners ----
    $('btn-play').addEventListener('click', startGame);
    $('btn-how-to-play').addEventListener('click', () => {
        showScreen('tutorial');
        GameAudio.playSFX('coinClink');
    });
    $('btn-tutorial-close').addEventListener('click', () => showScreen('title'));
    $('btn-submit-change').addEventListener('click', submitChange);
    $('btn-clear-change').addEventListener('click', clearChange);
    $('btn-play-again').addEventListener('click', startGame);
    $('btn-back-to-menu').addEventListener('click', () => {
        GameAudio.stopMusic();
        GameAudio.playMusic('menu');
        if (state.scene) {
            state.scene.dispose();
            state.scene = null;
        }
        showScreen('title');
    });

    // Sound toggle
    if (ui.soundToggle) {
        ui.soundToggle.addEventListener('click', () => {
            const muted = GameAudio.toggleMute();
            ui.soundToggle.textContent = muted ? '🔇' : '🔊';
        });
    }

    // Difficulty buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.difficulty = btn.dataset.difficulty;
            GameAudio.playSFX('coinClink');
        });
    });

    // Keyboard: Enter to submit
    document.addEventListener('keydown', (e) => {
        if (state.screen === 'gameplay' && e.key === 'Enter' && !state.roundLocked) {
            submitChange();
        }
    });

    // ---- Firebase Auth State Observer ----
    onAuthChange(async (user) => {
        if (user) {
            state.currentUser = user;
            await onUserSignedIn(user);
        } else {
            state.currentUser = null;
            state.firestoreProgress = null;
            showScreen('auth');
        }
    });

    // Start menu music
    GameAudio.playMusic('menu');
}

// ===== AUTH HANDLERS =====
async function handleAuthSubmit() {
    const email = ui.authEmail.value.trim();
    const password = ui.authPassword.value;
    const name = ui.authName.value.trim();

    if (!ui.authTos.checked) {
        showAuthError('Please agree to the Terms of Service.');
        return;
    }

    hideAuthError();
    setAuthLoading(true);

    try {
        if (state.authMode === 'signup') {
            await signUpEmail(email, password, name);
        } else {
            await signInEmail(email, password);
        }
        // onAuthChange will handle the rest
    } catch (err) {
        showAuthError(friendlyError(err.code));
        setAuthLoading(false);
    }
}

async function handleGoogleSignIn() {
    if (!ui.authTos.checked) {
        showAuthError('Please agree to the Terms of Service.');
        return;
    }
    hideAuthError();
    setAuthLoading(true);

    try {
        await signInGoogle();
    } catch (err) {
        showAuthError(friendlyError(err.code));
        setAuthLoading(false);
    }
}

async function handleSignOut() {
    GameAudio.stopMusic();
    if (state.scene) {
        state.scene.dispose();
        state.scene = null;
    }
    await signOutUser();
    // onAuthChange will show auth screen
}

async function onUserSignedIn(user) {
    setAuthLoading(false);

    // Set user UI
    const displayName = user.displayName || user.email.split('@')[0];
    ui.userName.textContent = displayName;
    ui.userBadge.style.display = 'flex';
    if (ui.hudUser) ui.hudUser.style.display = 'flex';
    if (ui.hudUsername) ui.hudUsername.textContent = displayName;

    // Load Firestore progress
    const progress = await loadProgress(user.uid);
    state.firestoreProgress = progress;

    if (progress) {
        // Restore stats to title screen
        if (progress.bestStreak > 0) {
            ui.titleStats.style.display = 'block';
            ui.bestStreakDisplay.textContent = progress.bestStreak;
        }
    } else {
        // First time — create initial document and accept TOS
        await acceptTOS(user.uid);
        await saveProgress(user.uid, {
            displayName,
            email: user.email,
            bestStreak: 0,
            totalScore: 0,
            totalGames: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
        });
    }

    // Also load localStorage best streak
    const localBest = Analytics.getBestStreak();
    if (localBest > 0) {
        ui.titleStats.style.display = 'block';
        const displayed = Math.max(localBest, progress?.bestStreak || 0);
        ui.bestStreakDisplay.textContent = displayed;
    }

    showScreen('title');
}

function showAuthError(msg) {
    ui.authError.textContent = msg;
    ui.authError.style.display = 'block';
}

function hideAuthError() {
    ui.authError.style.display = 'none';
}

function setAuthLoading(on) {
    ui.authLoading.style.display = on ? 'flex' : 'none';
    ui.authSubmitBtn.disabled = on;
    $('btn-google-signin').disabled = on;
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

// ===== SCREEN MANAGEMENT =====
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
    state.screen = name;
}

// ===== GAME FLOW =====
function startGame() {
    state.roundIndex = 0;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.customersServed = 0;
    state.correctCount = 0;
    state.incorrectCount = 0;
    state.startTime = Date.now();
    state.elapsedSeconds = 0;
    state.roundLocked = false;

    // Init 3D scene
    if (!state.scene) {
        const container = $('three-container');
        container.innerHTML = '';
        state.scene = new CheckoutScene(container, handleItemScanned);
    }

    // Setup customer queue
    const config = DIFFICULTY[state.difficulty];
    state.scene.setupQueue(Math.min(config.roundsPerGame, 4));

    // Audio
    GameAudio.stopMusic();
    GameAudio.playMusic('bgm');

    // Analytics
    Analytics.startSession(state.difficulty);

    // Switch to gameplay
    showScreen('gameplay');

    // Timer
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.elapsedSeconds++;
        ui.timerDisplay.textContent = formatTime(state.elapsedSeconds);
    }, 1000);

    updateHUD();
    nextRound();
}

function nextRound() {
    const config = DIFFICULTY[state.difficulty];

    if (state.roundIndex >= config.roundsPerGame) {
        endGame();
        return;
    }

    state.roundLocked = false;

    // Generate round
    state.currentRound = generateRound(state.difficulty);
    state.scannedItems = [];
    state.changeGiven = [];
    state.changeGivenTotal = 0;

    // 3D scene: set items
    state.scene.setItems(state.currentRound.items);

    // UI
    ui.itemsList.innerHTML = '';
    ui.totalDisplay.textContent = formatMoney(0);
    ui.paymentSection.classList.add('hidden');
    ui.changeGivenDisplay.textContent = formatMoney(0);
    ui.changeGivenDisplay.style.color = '';
    ui.cashDrawer.innerHTML = '';

    Analytics.logAction('round_start', {
        roundIndex: state.roundIndex,
        total: state.currentRound.total,
        payment: state.currentRound.payment,
        changeDue: state.currentRound.changeDue,
    });
}

async function submitChange() {
    if (!state.currentRound || state.roundLocked) return;
    state.roundLocked = true;

    const expected = state.currentRound.changeDue;
    const given = Math.round(state.changeGivenTotal * 100) / 100;
    const correct = Math.abs(given - expected) < 0.001;

    // Analytics
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
        if (state.streak >= 3) GameAudio.playSFX('streak');

        showFeedback(true, 'Correct! 🎉');
        state.scene.flashRegister(true);
        state.scene.customerReact(true);
    } else {
        state.streak = 0;
        state.incorrectCount++;
        state.customersServed++;

        GameAudio.playSFX('incorrect');

        const diff = given - expected;
        let hint;
        if (given === 0) {
            hint = `The change was ${formatMoney(expected)}`;
        } else if (diff > 0) {
            hint = `Too much! +${formatMoney(diff)} extra`;
        } else {
            hint = `Not enough! ${formatMoney(Math.abs(diff))} short`;
        }
        showFeedback(false, `Oops! ${hint}`);
        state.scene.flashRegister(false);
        state.scene.customerReact(false);
    }

    state.roundIndex++;
    updateHUD();

    // Wait, then advance queue and next round
    await new Promise(r => setTimeout(r, 1200));
    await state.scene.advanceQueue();

    const config = DIFFICULTY[state.difficulty];
    if (state.roundIndex < config.roundsPerGame) {
        state.scene.addToQueue();
    }

    await new Promise(r => setTimeout(r, 300));
    nextRound();
}

async function endGame() {
    clearInterval(state.timerInterval);

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
    ui.resultsStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

    if (accuracy >= 85) {
        ui.resultsTitle.textContent = '⭐ Amazing Work! ⭐';
    } else if (accuracy >= 60) {
        ui.resultsTitle.textContent = 'Great Job! 👏';
    } else {
        ui.resultsTitle.textContent = 'Keep Practicing! 💪';
    }

    const tips = [];
    if (accuracy < 60) tips.push('💡 Try counting up from the total to the payment to find the change.');
    if (state.bestStreak < 3) tips.push('💡 Take your time! Accuracy matters more than speed.');
    if (state.difficulty === 'easy' && accuracy >= 80) tips.push('🌟 Ready for Medium difficulty? Give it a try!');
    ui.resultsTips.innerHTML = tips.join('<br>');

    // ---- Save to Firestore ----
    if (state.currentUser) {
        const uid = state.currentUser.uid;

        // Save this session
        await saveGameSession(uid, {
            difficulty: state.difficulty,
            score: state.score,
            accuracy,
            bestStreak: state.bestStreak,
            duration: state.elapsedSeconds * 1000,
            customersServed: state.customersServed,
            correctCount: state.correctCount,
            incorrectCount: state.incorrectCount,
        });

        // Update aggregate progress
        const prev = state.firestoreProgress || {};
        const newProgress = {
            totalScore: (prev.totalScore || 0) + state.score,
            totalGames: (prev.totalGames || 0) + 1,
            totalCorrect: (prev.totalCorrect || 0) + state.correctCount,
            totalIncorrect: (prev.totalIncorrect || 0) + state.incorrectCount,
            bestStreak: Math.max(prev.bestStreak || 0, state.bestStreak),
        };
        await saveProgress(uid, newProgress);
        state.firestoreProgress = { ...prev, ...newProgress };

        ui.bestStreakDisplay.textContent = newProgress.bestStreak;
    }

    const allTimeBest = Analytics.getBestStreak();
    const fbBest = state.firestoreProgress?.bestStreak || 0;
    ui.bestStreakDisplay.textContent = Math.max(allTimeBest, fbBest);
    ui.titleStats.style.display = 'block';

    setTimeout(() => GameAudio.playMusic('menu'), 1500);
    showScreen('results');
}

// ===== UI RENDERING =====

function handleItemScanned(item, i) {
    if (state.roundLocked) return;
    state.scannedItems.push(item);

    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
        <span class="item-name">
            <span class="item-emoji">${item.emoji}</span>
            ${item.name}
        </span>
        <span class="item-price">${formatMoney(item.price)}</span>
    `;
    ui.itemsList.appendChild(row);
    ui.itemsList.scrollTop = ui.itemsList.scrollHeight;

    const currentTotal = state.scannedItems.reduce((sum, item) => sum + item.price, 0);
    ui.totalDisplay.textContent = formatMoney(currentTotal);

    GameAudio.playSFX('scan');

    if (state.scannedItems.length === state.currentRound.items.length) {
        setTimeout(() => triggerPaymentPhase(), 700);
    }
}

function triggerPaymentPhase() {
    ui.paymentSection.classList.remove('hidden');
    ui.paymentDisplay.textContent = formatMoney(state.currentRound.payment);
    ui.changeDueDisplay.textContent = formatMoney(state.currentRound.changeDue);
    renderCashDrawer();
}

function renderCashDrawer() {
    ui.cashDrawer.innerHTML = '';

    const maxChange = state.currentRound.changeDue;
    const denoms = DENOMINATIONS.filter(d => d.value <= Math.max(maxChange + 5, 1));

    denoms.forEach(denom => {
        const btn = document.createElement('button');
        btn.className = 'money-btn';
        btn.innerHTML = `
            <span class="money-emoji">${denom.emoji}</span>
            ${denom.label}
        `;
        btn.addEventListener('click', () => {
            if (state.roundLocked) return;
            addChange(denom.value);
            if (denom.type === 'coin') {
                GameAudio.playSFX('coinClink');
            } else {
                GameAudio.playSFX('billRustle');
            }
            btn.classList.add('selected');
            setTimeout(() => btn.classList.remove('selected'), 200);
        });
        ui.cashDrawer.appendChild(btn);
    });
}

function addChange(value) {
    state.changeGiven.push(value);
    state.changeGivenTotal = Math.round(state.changeGiven.reduce((s, v) => s + v, 0) * 100) / 100;
    ui.changeGivenDisplay.textContent = formatMoney(state.changeGivenTotal);

    const expected = state.currentRound.changeDue;
    if (Math.abs(state.changeGivenTotal - expected) < 0.001) {
        ui.changeGivenDisplay.style.color = '#06d6a0';
    } else if (state.changeGivenTotal > expected) {
        ui.changeGivenDisplay.style.color = '#ef476f';
    } else {
        ui.changeGivenDisplay.style.color = '#ff6b35';
    }
}

function clearChange() {
    if (state.roundLocked) return;
    state.changeGiven = [];
    state.changeGivenTotal = 0;
    ui.changeGivenDisplay.textContent = formatMoney(0);
    ui.changeGivenDisplay.style.color = '';
    GameAudio.playSFX('coinClink');
}

function updateHUD() {
    const config = DIFFICULTY[state.difficulty];
    ui.scoreDisplay.textContent = state.score;
    ui.streakDisplay.textContent = `${state.streak} 🔥`;
    ui.customersDisplay.textContent = `${state.roundIndex} / ${config.roundsPerGame}`;
}

function showFeedback(correct, message) {
    ui.feedbackToast.className = `feedback-toast ${correct ? 'correct' : 'incorrect'}`;
    ui.toastIcon.textContent = correct ? '✓' : '✗';
    ui.toastMessage.textContent = message;

    ui.feedbackToast.style.animation = 'none';
    ui.feedbackToast.offsetHeight;
    ui.feedbackToast.style.animation = '';

    setTimeout(() => {
        ui.feedbackToast.className = 'feedback-toast hidden';
    }, 1200);
}

// ===== UTILITIES =====

function formatMoney(amount) {
    return '$' + amount.toFixed(2);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

// ===== START =====
init();
