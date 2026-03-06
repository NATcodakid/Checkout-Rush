/**
 * analytics.js — Tracks gameplay data for the Evidence Pack.
 *
 * Stores session data in localStorage so it persists across plays.
 * Provides a summary method for the portfolio's impact evidence.
 */

const STORAGE_KEY = 'checkout_rush_analytics';

export const Analytics = {
    sessions: [],
    currentSession: null,

    init() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                this.sessions = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Could not load analytics:', e);
            this.sessions = [];
        }
    },

    startSession(difficulty) {
        this.currentSession = {
            startTime: Date.now(),
            difficulty,
            actions: [],
            rounds: [],
            score: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            bestStreak: 0,
        };
    },

    logAction(type, data = {}) {
        if (!this.currentSession) return;
        this.currentSession.actions.push({
            type,
            data,
            timestamp: Date.now(),
        });
    },

    logRound(roundData) {
        if (!this.currentSession) return;
        this.currentSession.rounds.push({
            ...roundData,
            timestamp: Date.now(),
        });
        if (roundData.correct) {
            this.currentSession.totalCorrect++;
        } else {
            this.currentSession.totalIncorrect++;
        }
    },

    endSession(finalScore, bestStreak) {
        if (!this.currentSession) return;

        this.currentSession.endTime = Date.now();
        this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
        this.currentSession.score = finalScore;
        this.currentSession.bestStreak = bestStreak;

        this.sessions.push(this.currentSession);

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessions));
        } catch (e) {
            console.warn('Could not save analytics:', e);
        }

        this.currentSession = null;
    },

    /**
     * Get a summary of all sessions — great for Evidence Pack.
     * "Players averaged X minutes, improved Y% over sessions"
     */
    getSummary() {
        if (this.sessions.length === 0) {
            return { totalSessions: 0 };
        }

        const totalSessions = this.sessions.length;
        const avgDuration = this.sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / totalSessions;
        const avgScore = this.sessions.reduce((sum, s) => sum + (s.score || 0), 0) / totalSessions;
        const totalCorrect = this.sessions.reduce((sum, s) => sum + (s.totalCorrect || 0), 0);
        const totalIncorrect = this.sessions.reduce((sum, s) => sum + (s.totalIncorrect || 0), 0);
        const totalRounds = totalCorrect + totalIncorrect;
        const overallAccuracy = totalRounds > 0 ? (totalCorrect / totalRounds * 100).toFixed(1) : 0;
        const bestOverallStreak = Math.max(...this.sessions.map(s => s.bestStreak || 0));

        // Improvement metric: compare first quarter of sessions to last quarter
        let improvement = null;
        if (totalSessions >= 4) {
            const quarter = Math.floor(totalSessions / 4);
            const firstQuarter = this.sessions.slice(0, quarter);
            const lastQuarter = this.sessions.slice(-quarter);
            const firstAvg = firstQuarter.reduce((s, x) => s + (x.score || 0), 0) / firstQuarter.length;
            const lastAvg = lastQuarter.reduce((s, x) => s + (x.score || 0), 0) / lastQuarter.length;
            if (firstAvg > 0) {
                improvement = ((lastAvg - firstAvg) / firstAvg * 100).toFixed(1);
            }
        }

        // Most-missed change amounts
        const missedAmounts = {};
        this.sessions.forEach(s => {
            (s.rounds || []).forEach(r => {
                if (!r.correct && r.changeDue !== undefined) {
                    const key = r.changeDue.toFixed(2);
                    missedAmounts[key] = (missedAmounts[key] || 0) + 1;
                }
            });
        });
        const topMissed = Object.entries(missedAmounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([amount, count]) => ({ amount: `$${amount}`, count }));

        return {
            totalSessions,
            avgDurationMs: Math.round(avgDuration),
            avgDurationFormatted: formatDuration(avgDuration),
            avgScore: Math.round(avgScore),
            overallAccuracy: `${overallAccuracy}%`,
            bestOverallStreak,
            totalCorrect,
            totalIncorrect,
            improvement: improvement ? `${improvement}%` : 'Need more sessions',
            topMissedChanges: topMissed,
        };
    },

    // Get best streak across all sessions
    getBestStreak() {
        if (this.sessions.length === 0) return 0;
        return Math.max(...this.sessions.map(s => s.bestStreak || 0));
    },

    clearAll() {
        this.sessions = [];
        this.currentSession = null;
        localStorage.removeItem(STORAGE_KEY);
    },
};

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
