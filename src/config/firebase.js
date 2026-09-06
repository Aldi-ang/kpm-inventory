import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from "firebase/firestore";
import { connectAuthEmulator } from "firebase/auth";
import { getStorage } from "firebase/storage";

/* WHY THE LOGIN DOMAIN IS NOT A CONSTANT ANY MORE.

   Aldi, 2026-09-06, on Brave: Google sign-in worked on localhost and failed on every deployed
   address. Shields down on the deployed site and it worked immediately - which is the whole
   diagnosis. The app is served from kpm-ang.vercel.app while the Google handshake happens on
   cello-inventory-manager.firebaseapp.com, so finishing a login means one site reading a cookie
   another site set. Brave blocks that by default; Safari does too, and Chrome is going the same
   way. Localhost is the one place Brave does not apply it, which is exactly why localhost worked.

   THE FIX is to stop having two sites. vercel.json passes /__/auth/* straight through to Firebase,
   so on that host the handshake happens on the app's own address and no cross-site cookie is
   needed. Nobody has to lower their shields.

   WARNING - DO NOT ADD A HOST TO THE LIST BELOW ON ITS OWN. Each one needs
   https://<host>/__/auth/handler registered under "Authorized redirect URIs" on the OAuth client
   in Google Cloud Console FIRST. Add it here before registering it there and sign-in on that host
   dies with redirect_uri_mismatch. Every host NOT on this list keeps using the Firebase handler,
   which is already registered - so localhost, the LAN IPs Aldi tests phones on, and every Vercel
   preview URL keep working untouched. */
const PROXIED_AUTH_HOSTS = ['kpm-ang.vercel.app'];
const FIREBASE_AUTH_DOMAIN = 'cello-inventory-manager.firebaseapp.com';
const resolvedAuthDomain =
  typeof window !== 'undefined' && PROXIED_AUTH_HOSTS.includes(window.location.hostname)
    ? window.location.host
    : FIREBASE_AUTH_DOMAIN;

const firebaseConfig = {
  apiKey: "AIzaSyC9Qr2w0K_RbygNvrzVW1ALE8SmLH6qK_4",
  authDomain: resolvedAuthDomain,
  projectId: "cello-inventory-manager",
  storageBucket: "cello-inventory-manager.firebasestorage.app",
  messagingSenderId: "168352992942",
  appId: "1:168352992942:web:3702ffb579bec0a93ea73f",
  measurementId: "G-CM3Z2Q412T"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// 🚀 OFFLINE ENGINE UPGRADE: Replaced deprecated getFirestore 
// with the modern initializeFirestore engine. This supports true multi-tab offline caching!
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});

// ponytail: dev-only escape hatch for testing against a local Firestore/Auth emulator
// instead of live production data. Never active in a production build (import.meta.env.DEV
// gate) and off by default even in dev (needs VITE_USE_EMULATOR=true in .env.local).
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const appId = "cello-inventory-manager";