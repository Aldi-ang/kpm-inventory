import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from "firebase/firestore";
import { connectAuthEmulator, signInWithCredential } from "firebase/auth";
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

/* THE PUBLIC DEMO (his picks 2026-10-06 "Stays for everyone", 2026-10-10 "B"): the same app on its own
   Firebase project, kpm-demo-f4d74 (Spark, no billing). Vite writes VITE_DEMO in as a literal, so each
   build carries only its own config - src/config/demoBuild.check.mjs proves it on both bundles.
   `appId` below stays "cello-inventory-manager" in the demo ON PURPOSE: it is only the folder name
   inside whichever database is open (artifacts/<appId>/...), so firestore.rules deploys unchanged. */
export const IS_DEMO = import.meta.env.VITE_DEMO === '1';

const firebaseConfig = IS_DEMO ? {
  apiKey: "AIzaSyCstVo9iVwhA_ivYsmT9A-UAbBYL-VMFgc",
  authDomain: "kpm-demo-f4d74.firebaseapp.com",
  projectId: "kpm-demo-f4d74",
  storageBucket: "kpm-demo-f4d74.firebasestorage.app",
  messagingSenderId: "804156513194",
  appId: "1:804156513194:web:ca2d6c2e89d976c8c9a9d3"
} : {
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

  /* A DOOR INTO THE FAKE DATABASE, AND ONLY THE FAKE ONE.

     Sign-in here is signInWithPopup, and a popup cannot complete inside the agent's single-tab
     browser pane - the Auth emulator's widget has no opener frame to post back to and dies with
     "No matching frame". That left every screen behind the login unverifiable, which is the exact
     problem the emulator was set up to solve.

     So the emulator's own documented trick is exposed here: an UNSIGNED Google id_token, which
     only the Auth emulator accepts and which a real Firebase project rejects outright. Used as:

       const { auth, credential, signIn } = window.__kpmEmulatorAuth;
       await signIn(auth, credential(JSON.stringify({ sub: '<uid>', email: '<email>' })));

     This block sits inside a gate that needs BOTH import.meta.env.DEV and VITE_USE_EMULATOR, and
     only vite's `httpdev` mode sets that flag - so it is absent from every build, absent from
     `npm run dev`, and absent from Aldi's phone. It is not a way into the live project even when
     it does exist, because the credential it takes is one live Firebase will not honour. */
  window.__kpmEmulatorAuth = { auth, credential: GoogleAuthProvider.credential, signIn: signInWithCredential };
}

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const appId = "cello-inventory-manager";