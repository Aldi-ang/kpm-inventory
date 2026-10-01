// THE BELL'S MISSED LIST, ONE PER PERSON (kpm, 2026-10-02) - firestore.rules [CHANGE 15].
// His design: every top strip and capybara line is kept in the bell, and "phone and pc show the same
// thing" - so the list lives on the account: users/{bossUid}/missed_log/{rosterProfileId} for an
// employee, users/{uid}/missed_log/{uid} for the owner (src/utils/missedLog.js).
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-missed-log.mjs"
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  ['owner-a@test.com', { bossUid: 'ownerA', role: 'COMPANY_OWNER' }],
  ['t2@test.com', { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_T2' }],
  ['t5@test.com', { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_T5' }],
  ['t5b@test.com', { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_T5B' }],
  ['locked@test.com', { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_LK', locked: true }],
  ['t5x@test.com', { bossUid: 'ownerB', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_X' }],
];
const LIST = { items: [{ text: 'Sync Complete!', ts: 1, count: 1, bad: false }], seenAt: 0 };

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-kpm-rules',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (const [email, data] of DIR) await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, email), data);
  await setDoc(doc(db, `artifacts/${APP_ID}/users/ownerA/missed_log`, 'AGT_T5B'), LIST);
});

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const log = (db, id, boss = 'ownerA') => doc(db, `artifacts/${APP_ID}/users/${boss}/missed_log`, id);
const owner = as('ownerA', 'owner-a@test.com'), t2 = as('u-t2', 't2@test.com'), t5 = as('u-t5', 't5@test.com');
const locked = as('u-lk', 'locked@test.com'), t5x = as('u-x', 't5x@test.com'), stranger = as('u-s', 'stranger@test.com');

console.log('The person - a T5 salesman - keeps their own list:');
await expect('reads their own list before it exists -> ALLOWED', getDoc(log(t5, 'AGT_T5')), true);
await expect('writes their own list -> ALLOWED', setDoc(log(t5, 'AGT_T5'), LIST), true);
await expect('reads it back -> ALLOWED', getDoc(log(t5, 'AGT_T5')), true);
await expect("reads a colleague's list -> DENIED", getDoc(log(t5, 'AGT_T5B')), false);
await expect("writes a colleague's list -> DENIED", setDoc(log(t5, 'AGT_T5B'), LIST), false);
await expect("writes the owner's list -> DENIED", setDoc(log(t5, 'ownerA'), LIST), false);

console.log('Locked out, another company, a stranger:');
await expect('a locked person writes their list -> DENIED', setDoc(log(locked, 'AGT_LK'), LIST), false);
await expect("another company's salesman writes into this company -> DENIED", setDoc(log(t5x, 'AGT_X'), LIST), false);
await expect("another company's salesman writes their own -> ALLOWED", setDoc(log(t5x, 'AGT_X', 'ownerB'), LIST), true);
await expect('a stranger reads a list -> DENIED', getDoc(log(stranger, 'AGT_T5B')), false);

console.log('The owner and a T2 (their own lists, through the company catch-all):');
await expect("the owner writes his own list (users/ownerA/missed_log/ownerA) -> ALLOWED", setDoc(log(owner, 'ownerA'), LIST), true);
await expect('a T2 writes their own list -> ALLOWED', setDoc(log(t2, 'AGT_T2'), LIST), true);

await testEnv.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
