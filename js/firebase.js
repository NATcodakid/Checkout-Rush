/**
 * firebase.js — Firebase Auth + Firestore for Checkout Rush.
 *
 * Uses Firebase JS SDK v10 via CDN (compat builds for simplicity with importmap).
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ===== CONFIG =====
const firebaseConfig = {
    apiKey: "AIzaSyCVou53D53aBcNuWS5d-Ik9mmXMNLYD8Iw",
    authDomain: "checkout-rush.firebaseapp.com",
    projectId: "checkout-rush",
    storageBucket: "checkout-rush.firebasestorage.app",
    messagingSenderId: "781493427605",
    appId: "1:781493427605:web:5482f49af92bf715f66a9c",
    measurementId: "G-JXB9X9CQPN"
};

// ===== INIT =====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ===== AUTH HELPERS =====
export async function signUpEmail(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
        await updateProfile(cred.user, { displayName });
    }
    return cred.user;
}

export async function signInEmail(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
}

export async function signInGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
}

export async function signOutUser() {
    await signOut(auth);
}

export function onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
    return auth.currentUser;
}

// ===== FIRESTORE — Player Progress =====
export async function saveProgress(uid, data) {
    try {
        const ref = doc(db, 'players', uid);
        await setDoc(ref, {
            ...data,
            lastPlayed: serverTimestamp(),
        }, { merge: true });
    } catch (e) {
        console.warn('Firestore saveProgress failed:', e);
    }
}

export async function loadProgress(uid) {
    try {
        const ref = doc(db, 'players', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data();
        return null;
    } catch (e) {
        console.warn('Firestore loadProgress failed:', e);
        return null;
    }
}

export async function saveGameSession(uid, sessionData) {
    try {
        const sessionsRef = collection(db, 'players', uid, 'sessions');
        await addDoc(sessionsRef, {
            ...sessionData,
            timestamp: serverTimestamp(),
        });
    } catch (e) {
        console.warn('Firestore saveGameSession failed:', e);
    }
}

export async function acceptTOS(uid) {
    try {
        const ref = doc(db, 'players', uid);
        await setDoc(ref, {
            tosAccepted: true,
            tosAcceptedAt: serverTimestamp(),
        }, { merge: true });
    } catch (e) {
        console.warn('Firestore acceptTOS failed:', e);
    }
}
