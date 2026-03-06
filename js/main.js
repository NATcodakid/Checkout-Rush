/**
 * main.js — Checkout Rush main game controller.
 *
 * Manages screen transitions, game state, round flow, UI updates,
 * and ties together the 3D scene, game data, and analytics.
 */

import { CheckoutScene } from './scene.js';
import { generateRound, DENOMINATIONS, DIFFICULTY } from './gameData.js';
import { Analytics } from './analytics.js';

// ===== STATE =====
const state = {
    difficulty: 'easy',
    screen: 'title',      // title | tutorial | gameplay | results
    scene: null,           // CheckoutScene instance

    // Round state
    currentRound: null,
    roundIndex: 0,
    changeGiven: [],       // array of denomination values the player selected
    changeGivenTotal: 0,

    // Session state
    score: 0,
    streak: 0,
    bestStreak: 0,
    customersServed: 0,
    correctCount: 0,
    incorrectCount: 0,
    startTime: null,
    timerInterval: null,
    roundTimer: null,
    elapsedSeconds: 0,
};

// ===== DOM REFERENCES =====
const $ = id => document.getElementById(id);

const screens = {
    title: $('title-screen'),
    tutorial: $('tutorial-screen'),
    gameplay: $('gameplay-screen'),
    results: $('results-screen'),
};

const ui = {
    // HUD
    scoreDisplay: $('score-display'),
    streakDisplay: $('streak-display'),
    customersDisplay: $('customers-display'),
    timerDisplay: $('timer-display'),

    // Checkout panel
    itemsList: $('items-list'),
    totalDisplay: $('total-display'),
    paymentDisplay: $('payment-display'),
    changeDueDisplay: $('change-due-display'),
    cashDrawer: $('cash-drawer'),
    changeGivenDisplay: $('change-given-display'),

    // Feedback
    feedbackToast: $('feedback-toast'),
    toastIcon: $('toast-icon'),
    toastMessage: $('toast-message'),

    // Results
    resultScore: $('result-score'),
    resultCustomers: $('result-customers'),
    resultAccuracy: $('result-accuracy'),
    resultStreak: $('result-streak'),
    resultTime: $('result-time'),
    resultsStars: $('results-stars'),
    resultsTips: $('results-tips'),
    resultsTitle: $('results-title'),

    // Title
    bestStreakDisplay: $('best-streak-display'),
    titleStats: $('title-stats'),
};

// ===== INIT =====
function init() {
    Analytics.init();

    // Show best streak if any
    const bestStreak = Analytics.getBestStreak();
    if (bestStreak > 0) {
        ui.titleStats.style.display = 'block';
        ui.bestStreakDisplay.textContent = bestStreak;
    }

    // Button listeners
    $('btn-play').addEventListener('click', startGame);
    $('btn-how-to-play').addEventListener('click', () => showScreen('tutorial'));
    $('btn-tutorial-close').addEventListener('click', () => showScreen('title'));
    $('btn-submit-change').addEventListener('click', submitChange);
    $('btn-clear-change').addEventListener('click', clearChange);
    $('btn-play-again').addEventListener('click', startGame);
    $('btn-back-to-menu').addEventListener('click', () => {
        if (state.scene) {
            state.scene.dispose();
            state.scene = null;
        }
        showScreen('title');
    });

    // Difficulty buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.difficulty = btn.dataset.difficulty;
        });
    });

    // Keyboard shortcut — Enter to submit
    document.addEventListener('keydown', (e) => {
        if (state.screen === 'gameplay' && e.key === 'Enter') {
            submitChange();
        }
    });
}

// ===== SCREEN MANAGEMENT =====
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    state.screen = name;
}

// ===== GAME FLOW =====
function startGame() {
    // Reset state
    state.roundIndex = 0;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.customersServed = 0;
    state.correctCount = 0;
    state.incorrectCount = 0;
    state.startTime = Date.now();
    state.elapsedSeconds = 0;

    // Init 3D scene if not already
    if (!state.scene) {
        const container = $('three-container');
        // Clear any previous canvas
        container.innerHTML = '';
        state.scene = new CheckoutScene(container);
    }

    // Start analytics session
    Analytics.startSession(state.difficulty);

    // Switch to gameplay
    showScreen('gameplay');

    // Start global timer
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.elapsedSeconds++;
        ui.timerDisplay.textContent = formatTime(state.elapsedSeconds);
    }, 1000);

    // Update HUD
    updateHUD();

    // Start first round
    nextRound();
}

function nextRound() {
    const config = DIFFICULTY[state.difficulty];

    if (state.roundIndex >= config.roundsPerGame) {
        endGame();
        return;
    }

    // Generate round data
    state.currentRound = generateRound(state.difficulty);
    state.changeGiven = [];
    state.changeGivenTotal = 0;

    // Update 3D scene
    state.scene.setItems(state.currentRound.items);
    state.scene.setCustomer(state.currentRound.customer);

    // Update UI
    renderItems(state.currentRound.items);
    ui.totalDisplay.textContent = formatMoney(state.currentRound.total);
    ui.paymentDisplay.textContent = formatMoney(state.currentRound.payment);
    ui.changeDueDisplay.textContent = formatMoney(state.currentRound.changeDue);
    ui.changeGivenDisplay.textContent = formatMoney(0);
    renderCashDrawer();

    // Log action
    Analytics.logAction('round_start', {
        roundIndex: state.roundIndex,
        total: state.currentRound.total,
        payment: state.currentRound.payment,
        changeDue: state.currentRound.changeDue,
    });
}

function submitChange() {
    if (!state.currentRound) return;

    const expected = state.currentRound.changeDue;
    const given = Math.round(state.changeGivenTotal * 100) / 100;
    const correct = Math.abs(given - expected) < 0.001;

    // Record
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
        // Correct change!
        state.score += 100 + (state.streak * 10); // bonus for streaks
        state.streak++;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        state.correctCount++;
        state.customersServed++;

        showFeedback(true, 'Correct! 🎉');
        state.scene.flashRegister(true);
        state.scene.customerReact(true);
    } else {
        // Wrong change
        state.streak = 0;
        state.incorrectCount++;
        state.customersServed++;

        const diff = given - expected;
        let hint;
        if (given === 0) {
            hint = `The change was ${formatMoney(expected)}`;
        } else if (diff > 0) {
            hint = `Too much! You gave ${formatMoney(diff)} extra`;
        } else {
            hint = `Not enough! You're ${formatMoney(Math.abs(diff))} short`;
        }
        showFeedback(false, `Oops! ${hint}`);
        state.scene.flashRegister(false);
        state.scene.customerReact(false);
    }

    state.roundIndex++;
    updateHUD();

    // Slight delay then next round
    setTimeout(() => {
        nextRound();
    }, 1800);
}

function endGame() {
    clearInterval(state.timerInterval);
    clearTimeout(state.roundTimer);

    // End analytics
    Analytics.endSession(state.score, state.bestStreak);

    // Calculate results
    const totalAttempts = state.correctCount + state.incorrectCount;
    const accuracy = totalAttempts > 0 ? Math.round(state.correctCount / totalAttempts * 100) : 0;

    // Stars: 1 for playing, 2 for >60% accuracy, 3 for >85%
    let stars = 1;
    if (accuracy >= 60) stars = 2;
    if (accuracy >= 85) stars = 3;

    // Update results screen
    ui.resultScore.textContent = state.score;
    ui.resultCustomers.textContent = state.customersServed;
    ui.resultAccuracy.textContent = `${accuracy}%`;
    ui.resultStreak.textContent = state.bestStreak;
    ui.resultTime.textContent = formatTime(state.elapsedSeconds);
    ui.resultsStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

    // Title
    if (accuracy >= 85) {
        ui.resultsTitle.textContent = '⭐ Amazing Work! ⭐';
    } else if (accuracy >= 60) {
        ui.resultsTitle.textContent = 'Great Job! 👏';
    } else {
        ui.resultsTitle.textContent = 'Keep Practicing! 💪';
    }

    // Tips based on performance
    const tips = [];
    if (accuracy < 60) {
        tips.push('💡 Try counting up from the total to the payment amount to find the change.');
    }
    if (state.bestStreak < 3) {
        tips.push('💡 Take your time! Accuracy matters more than speed.');
    }
    if (state.difficulty === 'easy' && accuracy >= 80) {
        tips.push('🌟 Ready for Medium difficulty? Give it a try!');
    }
    ui.resultsTips.innerHTML = tips.join('<br>');

    // Update best streak on title screen
    const allTimeBest = Analytics.getBestStreak();
    ui.bestStreakDisplay.textContent = allTimeBest;
    ui.titleStats.style.display = 'block';

    showScreen('results');
}

// ===== UI RENDERING =====

function renderItems(items) {
    ui.itemsList.innerHTML = '';
    items.forEach((item, i) => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.style.animationDelay = `${i * 0.1}s`;
        row.innerHTML = `
            <span class="item-name">
                <span class="item-emoji">${item.emoji}</span>
                ${item.name}
            </span>
            <span class="item-price">${formatMoney(item.price)}</span>
        `;
        ui.itemsList.appendChild(row);
    });
}

function renderCashDrawer() {
    ui.cashDrawer.innerHTML = '';

    // Filter denominations based on what makes sense for the change amount
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
            addChange(denom.value);
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

    // Color feedback
    const expected = state.currentRound.changeDue;
    if (Math.abs(state.changeGivenTotal - expected) < 0.001) {
        ui.changeGivenDisplay.style.color = '#06d6a0'; // green — exact match
    } else if (state.changeGivenTotal > expected) {
        ui.changeGivenDisplay.style.color = '#ef476f'; // red — too much
    } else {
        ui.changeGivenDisplay.style.color = '#ff6b35'; // orange — keep going
    }
}

function clearChange() {
    state.changeGiven = [];
    state.changeGivenTotal = 0;
    ui.changeGivenDisplay.textContent = formatMoney(0);
    ui.changeGivenDisplay.style.color = '';
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

    // Force re-animation
    ui.feedbackToast.style.animation = 'none';
    ui.feedbackToast.offsetHeight; // trigger reflow
    ui.feedbackToast.style.animation = '';

    setTimeout(() => {
        ui.feedbackToast.className = 'feedback-toast hidden';
    }, 1500);
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
