// LOCK AN ACCOUNT (kpm, 2026-09-28) - firestore.rules [CHANGE 12]. His words: "lock account basically just
// make that email unable to login at all" (a lost or hacked phone). Fleet & Roster writes { locked: true } on the
// person's login record (employee_directory/<email>); getEmployeeProfile() then returns null, so every employee
// rule refuses that account. Only a T1/T2 of the same company may write the lock fields, never on their own record.
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-account-lock.mjs"
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
  ['t2@test.com', { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_T2' }],
  ['t2b@test.com', { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_T2B' }],
  ['legacy@test.com', { bossUid: 'ownerA', userRole: 'ADMIN', agentId: 'AGT_L' }],
  ['t5@test.com', { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_T5' }],
  ['t2x@test.com', { bossUid: 'ownerB', userRole: 'COMPANY_OWNER', agentId: 'AGT_X' }],
  ['ghost@test.com', { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_G' }],
];

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-kpm-rules',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (const [email, data] of DIR) await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, email), data);
  await setDoc(doc(db, `artifacts/${APP_ID}/users/ownerA/products`, 'p1'), { name: 'Cello Green 16' });
  await setDoc(doc(db, `artifacts/${APP_ID}/users/ownerA/motorists`, 'AGT_T5'), { name: 'Budi' });
  await setDoc(doc(db, `artifacts/${APP_ID}/users/ownerA/vault_keys`, 'AGT_T5'), { uid: 'u-t5', pin: 'h', failedRecoveryAttempts: 2 });
  await setDoc(doc(db, `artifacts/${APP_ID}/users/ownerA/vault_keys`, 'AGT_T2'), { uid: 'u-t2', pin: 'h', failedRecoveryAttempts: 1 });
});

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const dir = (db, email) => doc(db, `artifacts/${APP_ID}/employee_directory`, email);
const product = (db) => doc(db, `artifacts/${APP_ID}/users/ownerA/products`, 'p1');
const LOCK = { locked: true, lockedAt: 1, lockedBy: 'x' };

const t2 = as('u-t2', 't2@test.com'), t2b = as('u-t2b', 't2b@test.com'), owner = as('ownerA', 'owner-a@test.com');
const legacy = as('u-l', 'legacy@test.com'), t5 = as('u-t5', 't5@test.com'), t2x = as('u-x', 't2x@test.com');

console.log('Before the lock:');
await expect('the T5 reads company products -> ALLOWED', getDoc(product(t5)), true);

console.log('Who may lock:');
await expect("a T5 locks a T2 -> DENIED", updateDoc(dir(t5, 't2@test.com'), LOCK), false);
await expect("company B's T2 locks company A's T5 -> DENIED", updateDoc(dir(t2x, 't5@test.com'), LOCK), false);
await expect('a T2 locks their OWN record -> DENIED', updateDoc(dir(t2, 't2@test.com'), LOCK), false);
await expect("a T2 changes a colleague's tier instead (not a lock field) -> DENIED", updateDoc(dir(t2, 't5@test.com'), { userRole: 'ADMIN' }), false);
await expect('a T2 locks AND changes the tier in one write -> DENIED', updateDoc(dir(t2, 't5@test.com'), { ...LOCK, userRole: 'ADMIN' }), false);
await expect('a T2 (saved as COMPANY_OWNER) locks the T5 -> ALLOWED', updateDoc(dir(t2, 't5@test.com'), LOCK), true);

console.log('The locked T5 - "unable to login at all":');
await expect('reads company products -> DENIED', getDoc(product(t5)), false);
await expect('reads their own roster profile -> DENIED', getDoc(doc(t5, `artifacts/${APP_ID}/users/ownerA/motorists`, 'AGT_T5')), false);
await expect('reads their own vault doc -> DENIED', getDoc(doc(t5, `artifacts/${APP_ID}/users/ownerA/vault_keys`, 'AGT_T5')), false);
await expect('reads the company settings -> DENIED', getDoc(doc(t5, `artifacts/${APP_ID}/users/ownerA/settings`, 'admin')), false);
await expect('still reads their own login record (so the app can say "locked") -> ALLOWED', getDoc(dir(t5, 't5@test.com')), true);
await expect('unlocks themselves -> DENIED', updateDoc(dir(t5, 't5@test.com'), { locked: false }), false);
await expect('deletes their own login record to erase the lock -> DENIED', deleteDoc(dir(t5, 't5@test.com')), false);
await expect('an UNlocked person still deletes their own record (the ghost killer) -> ALLOWED', deleteDoc(dir(as('u-g', 'ghost@test.com'), 'ghost@test.com')), true);
await expect("the ghost killer's delete of a record that is already gone -> ALLOWED", deleteDoc(dir(as('u-g', 'ghost@test.com'), 'ghost@test.com')), true);

console.log('A locked ADMIN loses every admin power too:');
await expect("the owner locks the legacy 'ADMIN' -> ALLOWED", updateDoc(dir(owner, 'legacy@test.com'), LOCK), true);
await expect('the locked ADMIN writes the company folder -> DENIED', setDoc(doc(legacy, `artifacts/${APP_ID}/users/ownerA/motorists`, 'AGT_T5'), { name: 'x' }), false);
await expect('the locked ADMIN resets vault tries -> DENIED', updateDoc(doc(legacy, `artifacts/${APP_ID}/users/ownerA/vault_keys`, 'AGT_T2'), { failedRecoveryAttempts: 0 }), false);
await expect('the owner locks a T2 -> ALLOWED', updateDoc(dir(owner, 't2b@test.com'), LOCK), true);
await expect('the locked T2 unlocks the T5 -> DENIED', updateDoc(dir(t2b, 't5@test.com'), { locked: false }), false);

console.log('Unlock:');
await expect('a T2 unlocks the T5 -> ALLOWED', updateDoc(dir(t2, 't5@test.com'), { locked: false }), true);
await expect('the T5 reads company products again -> ALLOWED', getDoc(product(t5)), true);

await testEnv.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
