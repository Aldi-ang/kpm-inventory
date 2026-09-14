/* LAB ONLY — stands in for `src/config/firebase.js` inside the Ponder lab.

   The real module boots Firebase at import time: `initializeApp`, `getAuth`, `initializeFirestore`
   with a persistent cache, `getStorage`. The lab aliases `firebase/firestore` to a fixture stub
   that has none of those factories, so the first component that imports `../config/firebase`
   (the app shell, for `auth`) would fail at link time before it rendered a pixel. Nothing mounted
   here ever signs in or writes; these only have to exist. */
export const auth = { currentUser: null };
export const db = {};
export const storage = {};
export const googleProvider = {};
export const PROXIED_AUTH_HOSTS = [];
export default {};
