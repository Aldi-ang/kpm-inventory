/* WHOSE MASTER-VAULT PASSWORD THIS IS - one per person. His 2026-09-28 (pick A): "everyone has their own
   password and even me as tier 1 should not and could not be able to know their password but we have power
   to help them reset the password tries".

   Before this, an employee's vault WAS the owner's doc: for an employee `user.uid` is the boss's uid (the
   hijacked user in App.jsx), so a T2 typed the OWNER's password and spent the owner's five tries.

   The owner (no bossUid) keeps users/{uid}/settings/admin - the live doc. The landlord's reset
   (LandlordDashboard.jsx) and the crown transfer (CrownTransferProtocol.jsx) read it there; it never moves.
   Everyone else gets users/{bossUid}/vault_keys/{rosterProfileId}, keyed by the roster profile so Fleet &
   Roster can reset a person's tries from their card. No roster profile = null: no vault doc at all, never the
   owner's by default. The rules draft (firestore.rules, vault_keys) lets only the person change the password. */
export const vaultDocPath = (appId, { bossUid, uid, agentProfileId } = {}) =>
  !bossUid ? (uid ? `artifacts/${appId}/users/${uid}/settings/admin` : null)
  : agentProfileId ? `artifacts/${appId}/users/${bossUid}/vault_keys/${agentProfileId}` : null;

/* The ONLY write anyone but the person makes to a vault doc: the tries back to 0 and the lock lifted
   (vaultLock.js). The rules draft allows exactly these three keys, nothing else. */
export const VAULT_TRIES_RESET = { failedRecoveryAttempts: 0, lockoutStatus: 'NONE', lockedUntil: 0 };
