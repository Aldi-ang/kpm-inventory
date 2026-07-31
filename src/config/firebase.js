import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from "firebase/firestore";
import { connectAuthEmulator } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC9Qr2w0K_RbygNvrzVW1ALE8SmLH6qK_4",
  authDomain: "cello-inventory-manager.firebaseapp.com",
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