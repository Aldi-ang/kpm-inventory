// A COMPANY OWNER LOADS HIS OWN LISTS (kpm, 2026-11-01) - firestore.rules [CHANGE 21]. The users/{bossUid} catch-all
// indexed the path (`document[0] != 'vault_keys'`), which made every LIST query fail: a migrated T2 owner
// (employee_directory/<uid>, no email record) opened one record but no list - products, roster, customers came back
// empty. Found testing the seat limit (the picked card "kept the old email" because the roster never loaded).
// CHANGE 11b's point must survive: the owner never reads or rewrites anyone's vault password.
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-owner-lists.mjs"
// RED run: the rules before CHANGE 21 (`git show 9fac2d4:firestore.rules.deployed-baseline`) fail the 4 owner LIST lines.
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection } from 'firebase/firestore';

const RULES = readFileSync(process.env.RULES_FILE || 'firestore.rules', 'utf8');
const A = 'artifacts/cello-inventory-manager';
let pass = 0, fail = 0;
async function expect(label, promise, shouldSucceed) {
  try {
    await (shouldSucceed ? assertSucceeds(promise) : assertFails(promise));
    console.log(`  PASS: ${label}`); pass++;
  } catch (e) {
    console.log(`  FAIL: ${label}\n        ${e.message.split('\n')[0]}`); fail++;
  }
}

const testEnv = await initializeTestEnvironment({ projectId: 'demo-kpm-rules', firestore: { rules: RULES, host: '127.0.0.1', port: 8080 } });
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, `${A}/employee_directory/ownerA`), { bossUid: 'ownerA', role: 'COMPANY_OWNER', email: 'owner-a@test.com' });
  await setDoc(doc(db, `${A}/employee_directory/t2@test.com`), { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_T2' });
  await setDoc(doc(db, `${A}/employee_directory/t5@test.com`), { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_T5' });
  await setDoc(doc(db, `${A}/employee_directory/t2x@test.com`), { bossUid: 'ownerB', userRole: 'COMPANY_OWNER', agentId: 'AGT_X' });
  for (const c of ['products', 'motorists', 'customers', 'transactions']) await setDoc(doc(db, `${A}/users/ownerA/${c}/x1`), { name: c });
  await setDoc(doc(db, `${A}/users/ownerA/vault_keys/AGT_T5`), { uid: 'u-t5', pin: 'h', recoveryHash: 'r', failedRecoveryAttempts: 2 });
  await setDoc(doc(db, `${A}/users/ownerA/settings/admin`), { pin: 'owner-h', failedRecoveryAttempts: 0 });
});

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const owner = as('ownerA', 'owner-a@test.com'), t2 = as('u-t2', 't2@test.com'), t5 = as('u-t5', 't5@test.com'), t2x = as('u-x', 't2x@test.com');
const list = (db, c) => getDocs(collection(db, `${A}/users/ownerA/${c}`));

console.log('The owner loads his own lists (the bug):');
for (const c of ['products', 'motorists', 'customers', 'transactions']) await expect(`the owner LISTS ${c} -> ALLOWED`, list(owner, c), true);
await expect('the owner opens one product -> ALLOWED', getDoc(doc(owner, `${A}/users/ownerA/products/x1`)), true);
await expect('the owner writes a product -> ALLOWED', setDoc(doc(owner, `${A}/users/ownerA/products/x2`), { name: 'new' }), true);
await expect('a T2 employee LISTS products -> ALLOWED', list(t2, 'products'), true);

console.log("CHANGE 11b still holds - nobody but the person reads or rewrites a vault password:");
await expect("the owner rewrites a salesman's vault password -> DENIED", updateDoc(doc(owner, `${A}/users/ownerA/vault_keys/AGT_T5`), { pin: 'mine' }), false);
await expect("the owner resets a salesman's vault tries only -> ALLOWED", updateDoc(doc(owner, `${A}/users/ownerA/vault_keys/AGT_T5`), { failedRecoveryAttempts: 0 }), true);
await expect("a T2 rewrites the owner's own vault record (settings/admin) -> DENIED", updateDoc(doc(t2, `${A}/users/ownerA/settings/admin`), { pin: 'x' }), false);
await expect('a T2 writes a roster card through the catch-all with a TIER 1 tag -> DENIED', setDoc(doc(t2, `${A}/users/ownerA/motorists/x9`), { userRole: 'ADMIN' }), false);

console.log('Other companies and lower tiers:');
await expect("company B's T2 LISTS company A's products -> DENIED", list(t2x, 'products'), false);
await expect("company B's T2 writes into company A -> DENIED", setDoc(doc(t2x, `${A}/users/ownerA/products/x3`), { name: 'x' }), false);
await expect("a T5 LISTS company A's vault passwords -> DENIED", list(t5, 'vault_keys'), false);

await testEnv.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
