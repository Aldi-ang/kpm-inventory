/* THE VAULT'S WRONG-TRY RULE. His 2026-09-28: "i want lock 15 minutes and also an option to reset the
   wrong tries". It was 5 wrong tries = locked for good, and only the Firebase Console opened it again.

   One counter for both doors - the master password and the recovery word - in the person's vault doc
   (utils/vaultDoc.js: the owner's settings/admin, an employee's vault_keys doc):
   `failedRecoveryAttempts` (the count) and `lockedUntil` (a time in ms; 0 or missing = open). A doc the
   old rule marked `lockoutStatus: "PERMANENT"` carries no time, so it is simply open again - the
   15-minute rule replaces the old one for everybody. The landlord's reset (LandlordDashboard.jsx, an
   owner) and Fleet & Roster's (FleetCanvasManager.jsx, an employee) write the count to 0 and the time to 0. */
export const VAULT_TRIES = 5;
export const VAULT_LOCK_MS = 15 * 60 * 1000;

/* How long the vault stays shut, in ms. 0 = open. */
export const lockLeftMs = (data, now) => Math.max(0, (Number(data?.lockedUntil) || 0) - now);

/* The clock time the lock lifts, for the message ("opens again at 14:05"). */
export const untilText = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* The fields ONE wrong try writes to the vault doc.
   Returns { failedRecoveryAttempts, lockoutStatus: 'NONE', lockedUntil } - `lockedUntil` is a time in
   the future only when THIS try locks the vault, otherwise 0. */
export const strikeUpdate = (data, now) => {
  const count = (Number(data?.failedRecoveryAttempts) || 0) + 1;
  return count >= VAULT_TRIES
    ? { failedRecoveryAttempts: 0, lockoutStatus: 'NONE', lockedUntil: now + VAULT_LOCK_MS }   // fresh 5 tries after the wait
    : { failedRecoveryAttempts: count, lockoutStatus: 'NONE', lockedUntil: 0 };
};
