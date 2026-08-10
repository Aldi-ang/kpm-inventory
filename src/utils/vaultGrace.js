/* THE 5-MINUTE GRACE PERIOD — his decision, 2026-08-10.
   "it is annoying when i have to always enter my password everytime i use my phone because i
   will enter another app each time i send a pic" ... "5 minutes is the best one, should reset
   when i interact with the app tho".

   Why it is needed at all: iOS discards the page when he switches to the camera, so coming back
   is a cold load and the master gate demands the password again. Nothing was broken; the phone
   was doing what phones do.

   THE TRADE HE ACCEPTED, stated plainly because it is a real one: for up to 5 minutes after he
   last touched the app, anyone holding his unlocked phone reaches the vault without the master
   password. That is the whole point of the feature and it is not a bug.

   Four things this deliberately will NOT survive, each one a way the trade could get worse:
   - more than GRACE_MS since the last interaction;
   - a different Firebase account (the uid is stored and must match — otherwise signing in as
     someone else would inherit an admin session that was never theirs);
   - locking the vault or logging out (App clears it);
   - a clock that has moved backwards, which is what tampering looks like from in here.

   It is localStorage, not a cookie and not a token: this only re-opens a LOCAL screen. It grants
   nothing at the server. Firestore rules still decide every read and write, and they have never
   heard of this file. */

export const VAULT_GRACE_MS = 5 * 60 * 1000;

const KEY = 'kpm-vault-grace';

/* Pure on purpose — `vaultGrace.selfcheck.mjs` drives this directly, with no browser and no
   localStorage. The storage wrappers below hold no decisions of their own. */
export function graceIsValid(record, nowMs, uid) {
  if (!record || typeof record.at !== 'number') return false;
  if (!uid || record.uid !== uid) return false;
  if (record.at > nowMs) return false;
  return nowMs - record.at < VAULT_GRACE_MS;
}

export function readGrace(uid) {
  try {
    return graceIsValid(JSON.parse(localStorage.getItem(KEY)), Date.now(), uid);
  } catch (e) {
    return false;
  }
}

export function touchGrace(uid) {
  if (!uid) return;
  try { localStorage.setItem(KEY, JSON.stringify({ uid, at: Date.now() })); } catch (e) { /* private mode */ }
}

export function clearGrace() {
  try { localStorage.removeItem(KEY); } catch (e) { /* private mode */ }
}
