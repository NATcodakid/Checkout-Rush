/**
 * audio.js — Sound & music manager for Checkout Rush.
 *
 * Handles all audio: SFX (scan, correct, incorrect, coins, bills, streak,
 * round-end) and music (menu, gameplay BGM).
 *
 * Web Audio API requires user interaction before playing — this module
 * handles that via an unlock mechanism on first click.
 */

const SFX_PATHS = {
    scan: 'Assets/Sound Effects/scan.wav',
    correct: 'Assets/Sound Effects/correct.wav',
    incorrect: 'Assets/Sound Effects/incorrect.wav',
    coinClink: 'Assets/Sound Effects/coin-clink.wav',
    billRustle: 'Assets/Sound Effects/bill-rustle.wav',
    streak: 'Assets/Sound Effects/streak.wav',
    roundEnd: 'Assets/Sound Effects/round-end.wav',
};

const MUSIC_PATHS = {
    menu: 'Assets/Music/menu-music.mp3',
    bgm: 'Assets/Music/bgm-loop.mp3',
};

class AudioManager {
    constructor() {
        this.sfxBuffers = {};       // name → AudioBuffer
        this.musicElements = {};    // name → HTMLAudioElement
        this.ctx = null;            // AudioContext
        this.masterGain = null;
        this.sfxGain = null;
        this.unlocked = false;
        this.muted = false;
        this.currentMusic = null;

        this._init();
    }

    _init() {
        // Preload music as HTML Audio elements (easier for looping)
        Object.entries(MUSIC_PATHS).forEach(([key, path]) => {
            const audio = new Audio(path);
            audio.loop = true;
            audio.volume = 0.35;
            audio.preload = 'auto';
            this.musicElements[key] = audio;
        });

        // Unlock audio context on first user interaction
        const unlock = () => {
            if (this.unlocked) return;
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.6;
            this.sfxGain.connect(this.masterGain);
            this.unlocked = true;

            // Now preload SFX buffers
            this._preloadSFX();

            // Resume if suspended
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        };

        document.addEventListener('click', unlock, { once: false });
        document.addEventListener('keydown', unlock, { once: false });
    }

    async _preloadSFX() {
        for (const [key, path] of Object.entries(SFX_PATHS)) {
            try {
                const resp = await fetch(path);
                const arrayBuf = await resp.arrayBuffer();
                const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
                this.sfxBuffers[key] = audioBuf;
            } catch (e) {
                console.warn(`Could not load SFX: ${key}`, e);
            }
        }
    }

    /**
     * Play a sound effect by name.
     * @param {string} name — key from SFX_PATHS
     */
    playSFX(name) {
        if (this.muted || !this.unlocked || !this.sfxBuffers[name]) return;

        const source = this.ctx.createBufferSource();
        source.buffer = this.sfxBuffers[name];
        source.connect(this.sfxGain);
        source.start(0);
    }

    /**
     * Start playing a music track.
     * @param {string} name — 'menu' or 'bgm'
     */
    playMusic(name) {
        this.stopMusic();
        const audio = this.musicElements[name];
        if (!audio) return;
        audio.currentTime = 0;
        audio.volume = this.muted ? 0 : 0.35;
        audio.play().catch(() => { }); // may fail before user gesture
        this.currentMusic = name;
    }

    /**
     * Stop current music.
     */
    stopMusic() {
        Object.values(this.musicElements).forEach(a => {
            a.pause();
            a.currentTime = 0;
        });
        this.currentMusic = null;
    }

    /**
     * Toggle mute.
     */
    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 1;
        }
        Object.values(this.musicElements).forEach(a => {
            a.volume = this.muted ? 0 : 0.35;
        });
        return this.muted;
    }

    get isMuted() {
        return this.muted;
    }
}

// Singleton
export const GameAudio = new AudioManager();
