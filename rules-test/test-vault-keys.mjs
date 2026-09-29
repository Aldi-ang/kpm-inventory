// A VAULT PASSWORD FOR EVERY PERSON (kpm, 2026-09-28) - firestore.rules [CHANGE 11] + [CHANGE 11b].
// His call: "everyone has their own password and even me as tier 1 should not and could not be able to
// know their password but we have power to help them reset the password tries".
// The app keeps an employee's vault password at users/{bossUid}/vault_keys/{rosterProfileId}
// (src/utils/vaultDoc.js); the owner's stays at users/{uid}/settings/admin.
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-vault-keys.mjs"
// RULES_FILE=<path> runs the same cases against another rules file (e.g. the deployed baseline).
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const RULES = readFileSync(process.env.RULES_FILE || 'firestore.rules', 'utf8');
const APP_ID = 'cello-inventory-manager';
let pass = 0, fail = 0;

async function expect(label, promise, shouldSucceed) {
  try {
    await (shouldSucceed ? assertSucceeds(promise) : assertFails(promise));
    console.log(`  PASS: ${label}`); pass++;
  } catch (e) {
    console.log(`  FAIL: ${label}\n        ${e.message.split('\n')[0]}`); fail++;
  }
}

const DIR = [
  // email, directory doc
  ['owner-a@test.com', { bossUid: 'ownerA', role: 'COMPANY_OWNER' }],
  ['t2@test.com', { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_T2' }],
  ['t2b@test.com', { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_T2B' }],
  ['legacy@test.com', { bossUid: 'ownerA', userRole: 'ADMIN', agentId: 'AGT_L' }],
  ['t5@test.com', { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_T5' }],
  ['t2x@test.com', { bossUid: 'ownerB', userRole: 'COMPANY_OWNER', agentId: 'AGT_X' }],
];
const KEY = { uid: 'u-t2b', pin: 'h', recoveryHash: 'r', failedRecoveryAttempts: 3, lockedUntil: 0, lockoutStatus: 'NONE' };

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-kpm-rules',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (const [email, data] of DIR) await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, email), data);
  await setDoc(doc(db, `artifacts/${APP_ID}/users/ownerA/vault_keys`, 'AGT_T2B'), KEY);
  await setDoc(doc(db, `artifacts/${APP_ID}/users/ownerA/vault_keys`, 'AGT_T5'), { ...KEY, uid: 'u-t5' });
  await setDoc(doc(db, `artifacts/${APP_ID}/users/ownerA/settings`, 'admin'), { pin: 'owner', failedRecoveryAttempts: 0 });
  await setDoc(doc(db, `artifacts/${APP_ID}/users/ownerA/motorists`, 'AGT_T2'), { name: 'T2' });
  await setDoc(doc(db, 'system_admins', 'someone'), { ok: true });
});

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const key = (db, id, boss = 'ownerA') => doc(db, `artifacts/${APP_ID}/users/${boss}/vault_keys`, id);
const COUNTERS = { failedRecoveryAttempts: 0, lockedUntil: 0, lockoutStatus: 'NONE' };

const t2 = as('u-t2', 't2@test.com'), t2b = as('u-t2b', 't2b@test.com'), owner = as('ownerA', 'owner-a@test.com');
const legacy = as('u-l', 'legacy@test.com'), t5 = as('u-t5', 't5@test.com'), t2x = as('u-x', 't2x@test.com');
const stranger = as('u-s', 'stranger@test.com'), superA = as('super', 'adikaryasukses99@gmail.com');

console.log('The person - a T2 saved as COMPANY_OWNER - sets up and uses their OWN password:');
await expect('reads their own doc before it exists -> ALLOWED', getDoc(key(t2, 'AGT_T2')), true);
await expect('creates vault_keys/<their profile> with their own uid -> ALLOWED', setDoc(key(t2, 'AGT_T2'), { uid: 'u-t2', pin: 'p', recoveryHash: 'r', failedRecoveryAttempts: 0, lockoutStatus: 'NONE' }), true);
await expect('reads their own doc -> ALLOWED', getDoc(key(t2, 'AGT_T2')), true);
await expect('changes their own password -> ALLOWED', updateDoc(key(t2, 'AGT_T2'), { pin: 'p2' }), true);
await expect('writes their own wrong-try strike -> ALLOWED', updateDoc(key(t2, 'AGT_T2'), { failedRecoveryAttempts: 1, lockedUntil: 0, lockoutStatus: 'NONE' }), true);
await expect('re-saves the whole doc after a recovery code (setDoc, keeps uid) -> ALLOWED', setDoc(key(t2, 'AGT_T2'), { uid: 'u-t2', pin: 'p3', recoveryHash: 'r2', failedRecoveryAttempts: 0, lockoutStatus: 'NONE' }), true);
await expect('hands their doc to another sign-in (uid changed) -> DENIED', updateDoc(key(t2, 'AGT_T2'), { uid: 'u-t2b' }), false);
await expect("creates a doc on SOMEONE ELSE's profile (squatting) -> DENIED", setDoc(key(t2, 'AGT_L'), { uid: 'u-t2', pin: 'p' }), false);
await expect("creates their own profile's doc with someone else's uid -> DENIED", setDoc(key(t2x, 'AGT_X', 'ownerB'), { uid: 'u-other', pin: 'p' }), false);
await expect('deletes their own doc -> DENIED', deleteDoc(key(t2, 'AGT_T2')), false);

console.log('Another T2 of the same company - may reset the TRIES, never the password:');
await expect("reads the other person's doc (the reset reports 'it was N') -> ALLOWED", getDoc(key(t2b, 'AGT_T2')), true);
await expect('resets the three counters -> ALLOWED', updateDoc(key(t2b, 'AGT_T2'), COUNTERS), true);
await expect("overwrites the other person's password -> DENIED", updateDoc(key(t2b, 'AGT_T2'), { pin: 'mine' }), false);
await expect("overwrites the other person's recovery word -> DENIED", updateDoc(key(t2b, 'AGT_T2'), { recoveryHash: 'mine' }), false);
await expect('counters AND the password in one write -> DENIED', updateDoc(key(t2b, 'AGT_T2'), { ...COUNTERS, pin: 'mine' }), false);

console.log('The owner (tier 1) - the same: tries yes, password no:');
await expect('resets the counters -> ALLOWED', updateDoc(key(owner, 'AGT_T2B'), COUNTERS), true);
await expect("overwrites an employee's password -> DENIED", updateDoc(key(owner, 'AGT_T2B'), { pin: 'boss' }), false);
await expect("replaces an employee's whole doc -> DENIED", setDoc(key(owner, 'AGT_T2B'), { ...KEY, pin: 'boss' }), false);
await expect("still reads + writes their OWN settings/admin -> ALLOWED", updateDoc(doc(owner, `artifacts/${APP_ID}/users/ownerA/settings`, 'admin'), COUNTERS), true);
await expect('still writes the rest of the company folder (motorists) -> ALLOWED', updateDoc(doc(owner, `artifacts/${APP_ID}/users/ownerA/motorists`, 'AGT_T2'), { name: 'T2!' }), true);

console.log("The legacy 'ADMIN' tag - tries yes, password no:");
await expect('resets the counters -> ALLOWED', updateDoc(key(legacy, 'AGT_T2B'), COUNTERS), true);
await expect('overwrites the password -> DENIED', updateDoc(key(legacy, 'AGT_T2B'), { pin: 'x' }), false);

console.log('Everyone else:');
await expect("a T5 reads another person's doc -> DENIED", getDoc(key(t5, 'AGT_T2B')), false);
await expect("a T5 resets another person's counters -> DENIED", updateDoc(key(t5, 'AGT_T2B'), COUNTERS), false);
await expect("a T5 reads their own doc -> ALLOWED", getDoc(key(t5, 'AGT_T5')), true);
await expect("company B's T2 reads company A's doc -> DENIED", getDoc(key(t2x, 'AGT_T2B')), false);
await expect("company B's T2 resets company A's counters -> DENIED", updateDoc(key(t2x, 'AGT_T2B'), COUNTERS), false);
await expect('a signed-in stranger (no directory doc) reads -> DENIED', getDoc(key(stranger, 'AGT_T2B')), false);
await expect('a signed-in stranger creates -> DENIED', setDoc(key(stranger, 'AGT_NEW'), { uid: 'u-s', pin: 'p' }), false);

console.log("The super admin - out of other people's passwords, god-mode everywhere else:");
await expect("reads company A's vault_keys doc -> DENIED", getDoc(key(superA, 'AGT_T2B')), false);
await expect("overwrites company A's vault_keys password -> DENIED", updateDoc(key(superA, 'AGT_T2B'), { pin: 'x' }), false);
await expect("still reads + writes a company's settings/admin (the landlord reset) -> ALLOWED", updateDoc(doc(superA, `artifacts/${APP_ID}/users/ownerA/settings`, 'admin'), COUNTERS), true);
await expect('still writes a company folder (motorists) -> ALLOWED', updateDoc(doc(superA, `artifacts/${APP_ID}/users/ownerA/motorists`, 'AGT_T2'), { name: 'x' }), true);
await expect('still writes the employee directory -> ALLOWED', setDoc(doc(superA, `artifacts/${APP_ID}/employee_directory`, 'new@test.com'), { bossUid: 'ownerA' }), true);
await expect("still reads a SHORT path only the catch-all grants (system_admins/<someone else>) -> ALLOWED", getDoc(doc(superA, 'system_admins', 'someone')), true);
await expect('still writes a SHORT path only the catch-all grants -> ALLOWED', setDoc(doc(superA, 'zz_misc', 'x'), { ok: true }), true);
await expect("deletes company A's vault_keys doc -> DENIED", deleteDoc(key(superA, 'AGT_T2B')), false);

console.log('"Reset vault password" = T1/T2 delete the doc; the person makes a new one (his CHANGE 11 follow-up):');
await expect("a T5 deletes another person's doc -> DENIED", deleteDoc(key(t5, 'AGT_T2B')), false);
await expect("company B's T2 deletes company A's doc -> DENIED", deleteDoc(key(t2x, 'AGT_T2B')), false);
await expect('a T2 deletes their OWN doc (would skip the 15-minute lock) -> DENIED', deleteDoc(key(t2b, 'AGT_T2B')), false);
await expect("the legacy 'ADMIN' tag deletes another person's doc -> ALLOWED", deleteDoc(key(legacy, 'AGT_T5')), true);
await expect("a T2 deletes another person's doc -> ALLOWED", deleteDoc(key(t2b, 'AGT_T2')), true);
await expect("the owner deletes an employee's doc -> ALLOWED", deleteDoc(key(owner, 'AGT_T2B')), true);
await expect('the person then makes a NEW one themselves -> ALLOWED', setDoc(key(t2, 'AGT_T2'), { uid: 'u-t2', pin: 'new', recoveryHash: 'new', failedRecoveryAttempts: 0, lockoutStatus: 'NONE' }), true);

await testEnv.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
