// THE EIGHT HOLES IN THE LIVE RULES (kpm, 2026-09-29) - firestore.rules [CHANGE 14]. His words: "fix first publish
// later just checked first what need to be fixed, finaliza then publish last". The list and why each one matters:
// A-Brain Brainstorm/2026-09-29_live-rules-review.md. T1-T4 = owner, T2 (COMPANY_OWNER), T3 AREA_ADMIN, T4 FLEET_CAPTAIN.
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-rules-holes.mjs"
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

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
  ['t3@test.com', { bossUid: 'ownerA', userRole: 'AREA_ADMIN', agentId: 'AGT_T3', location: 'Magelang' }],
  ['t4@test.com', { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_T4', location: 'Magelang' }],
  ['t5@test.com', { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_T5', location: 'Magelang' }],
  ['legacy@test.com', { bossUid: 'ownerA', userRole: 'ADMIN', agentId: 'AGT_L' }],
  ['t2x@test.com', { bossUid: 'ownerB', userRole: 'COMPANY_OWNER', agentId: 'AGT_X' }],
];
const A = (p) => `artifacts/${APP_ID}/users/ownerA/${p}`;

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-kpm-rules',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (const [email, data] of DIR) await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, email), data);
  await setDoc(doc(db, A('gps_bypasses'), 'b1'), { status: 'PENDING', salesmanId: 'AGT_T5' });
  await setDoc(doc(db, A('branches/Magelang/inventory'), 'p1'), { stock: 10 });
  await setDoc(doc(db, A('stock_requests'), 'r1'), { status: 'PENDING', branch: 'Magelang' });
  await setDoc(doc(db, A('settings'), 'admin'), { pin: 'h', recoveryHash: 'r', failedRecoveryAttempts: 0 });
  await setDoc(doc(db, A('settings'), 'permission_matrix'), { matrix: {} });
  await setDoc(doc(db, A('account_transfers'), 'x1'), { status: 'PENDING_AGENT' });
  await setDoc(doc(db, A('products'), 'p1'), { name: 'Cello Green 16', stock: 5, damagedStock: 0, priceRetail: 1000 });
  await setDoc(doc(db, A('motorists'), 'AGT_T5'), { name: 'Budi', userRole: 'FIELD_OPERATIVE', location: 'Magelang' });
  await setDoc(doc(db, A('motorists'), 'master_owner'), { name: 'Aldi', userRole: 'DEVELOPER', location: 'Headquarters' });
  await setDoc(doc(db, A('vault_keys'), 'AGT_T3'), { uid: 'u-t3', pin: 'h' });   // a COLLEAGUE's vault (the T2's own is theirs to change)
});

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const owner = as('ownerA', 'owner-a@test.com'), t2 = as('u-t2', 't2@test.com'), t3 = as('u-t3', 't3@test.com');
const t4 = as('u-t4', 't4@test.com'), t5 = as('u-t5', 't5@test.com'), legacy = as('u-l', 'legacy@test.com');
const t2x = as('u-x', 't2x@test.com'), outsider = as('u-o', 'stranger@test.com');
const superA = as('u-s', 'adikaryasukses99@gmail.com');

console.log('#1 GPS bypass - no self-approval:');
await expect('a T5 files a bypass as PENDING -> ALLOWED', addDoc(collection(t5, A('gps_bypasses')), { status: 'PENDING', salesmanId: 'AGT_T5' }), true);
await expect('a T5 files a bypass already APPROVED -> DENIED', addDoc(collection(t5, A('gps_bypasses')), { status: 'APPROVED', salesmanId: 'AGT_T5' }), false);
await expect('a T5 approves their own bypass -> DENIED', updateDoc(doc(t5, A('gps_bypasses'), 'b1'), { status: 'APPROVED' }), false);
await expect("company B's T2 approves it -> DENIED", updateDoc(doc(t2x, A('gps_bypasses'), 'b1'), { status: 'APPROVED' }), false);
await expect('a T3 rejects it -> ALLOWED', updateDoc(doc(t3, A('gps_bypasses'), 'b1'), { status: 'REJECTED' }), true);
await expect('a T4 approves it -> ALLOWED', updateDoc(doc(t4, A('gps_bypasses'), 'b1'), { status: 'APPROVED' }), true);
await expect('a T2 approves it -> ALLOWED', updateDoc(doc(t2, A('gps_bypasses'), 'b1'), { status: 'APPROVED' }), true);

console.log("#2 A branch warehouse's stock:");
await expect('a T5 reads branch stock -> ALLOWED', getDoc(doc(t5, A('branches/Magelang/inventory'), 'p1')), true);
await expect('a T5 changes branch stock -> DENIED', updateDoc(doc(t5, A('branches/Magelang/inventory'), 'p1'), { stock: 999 }), false);
await expect('a T5 changes branch damaged stock -> DENIED', updateDoc(doc(t5, A('branches/Magelang/inventory'), 'p1'), { damagedStock: 0 }), false);
await expect('a T3 changes branch stock -> ALLOWED', updateDoc(doc(t3, A('branches/Magelang/inventory'), 'p1'), { stock: 11 }), true);
await expect('a T4 changes branch stock -> ALLOWED', updateDoc(doc(t4, A('branches/Magelang/inventory'), 'p1'), { stock: 12 }), true);

console.log('#3 HQ -> branch stock orders:');
await expect('a T5 marks an order -> DENIED', updateDoc(doc(t5, A('stock_requests'), 'r1'), { status: 'RECEIVED' }), false);
await expect('a T5 creates an order -> DENIED', addDoc(collection(t5, A('stock_requests')), { status: 'PENDING' }), false);
await expect('a T5 still reads orders -> ALLOWED', getDoc(doc(t5, A('stock_requests'), 'r1')), true);
await expect('a T3 marks an order received -> ALLOWED', updateDoc(doc(t3, A('stock_requests'), 'r1'), { status: 'RECEIVED' }), true);
await expect('a T2 creates an order -> ALLOWED', addDoc(collection(t2, A('stock_requests')), { status: 'PENDING' }), true);

console.log("#4 The owner's vault record:");
await expect('a T5 reads settings/admin -> DENIED', getDoc(doc(t5, A('settings'), 'admin')), false);
await expect('a T2 reads settings/admin -> DENIED', getDoc(doc(t2, A('settings'), 'admin')), false);
await expect('a T2 overwrites settings/admin -> DENIED', updateDoc(doc(t2, A('settings'), 'admin'), { pin: 'x' }), false);
await expect('a T5 still reads the other company settings -> ALLOWED', getDoc(doc(t5, A('settings'), 'permission_matrix')), true);
await expect('the owner reads settings/admin -> ALLOWED', getDoc(doc(owner, A('settings'), 'admin')), true);
await expect("the legacy 'ADMIN' reads settings/admin (unchanged) -> ALLOWED", getDoc(doc(legacy, A('settings'), 'admin')), true);

console.log('#5 The login list:');
await expect("a stranger's Google account lists every login -> DENIED", getDocs(collection(outsider, `artifacts/${APP_ID}/employee_directory`)), false);
await expect('an employee lists every login -> DENIED', getDocs(collection(t5, `artifacts/${APP_ID}/employee_directory`)), false);
await expect('an employee reads their own record -> ALLOWED', getDoc(doc(t5, `artifacts/${APP_ID}/employee_directory`, 't5@test.com')), true);
await expect('the super admin lists every login (the landlord screen) -> ALLOWED', getDocs(collection(superA, `artifacts/${APP_ID}/employee_directory`)), true);

console.log('#6 T2 gets the company admin powers - never the vault, never a Tier 1:');
await expect('a T2 adds a product -> ALLOWED', setDoc(doc(t2, A('products'), 'p9'), { name: 'Sampoerna Mild 16', stock: 0 }), true);
await expect('a T2 edits the tier settings -> ALLOWED', updateDoc(doc(t2, A('settings'), 'permission_matrix'), { matrix: { AREA_ADMIN: [] } }), true);
await expect("a T2 overwrites a colleague's vault password -> DENIED", updateDoc(doc(t2, A('vault_keys'), 'AGT_T3'), { pin: 'x' }), false);
await expect('a T2 hires a T5 -> ALLOWED', setDoc(doc(t2, A('motorists'), 'AGT_NEW'), { name: 'Rina', userRole: 'FIELD_OPERATIVE', location: 'Magelang' }), true);
await expect('a T2 creates a Tier 1 roster card -> DENIED', setDoc(doc(t2, A('motorists'), 'AGT_BAD'), { name: 'x', userRole: 'DEVELOPER' }), false);
await expect("a T2 edits the owner's roster card -> DENIED", updateDoc(doc(t2, A('motorists'), 'master_owner'), { name: 'x' }), false);
await expect("a T2 deletes the owner's roster card -> DENIED", deleteDoc(doc(t2, A('motorists'), 'master_owner')), false);
await expect("company B's T2 adds a product to company A -> DENIED", setDoc(doc(t2x, A('products'), 'p8'), { name: 'x' }), false);
await expect('a T5 adds a product -> DENIED', setDoc(doc(t5, A('products'), 'p7'), { name: 'x' }), false);

console.log('#7 Customer hand-over:');
await expect('a T5 creates a hand-over already APPROVED -> DENIED', addDoc(collection(t5, A('account_transfers')), { status: 'APPROVED' }), false);
await expect('a T5 creates a hand-over PENDING_AGENT -> ALLOWED', addDoc(collection(t5, A('account_transfers')), { status: 'PENDING_AGENT' }), true);
await expect('the receiving T5 accepts it (PENDING_ADMIN) -> ALLOWED', updateDoc(doc(t5, A('account_transfers'), 'x1'), { status: 'PENDING_ADMIN' }), true);
await expect('a T5 marks it APPROVED -> DENIED', updateDoc(doc(t5, A('account_transfers'), 'x1'), { status: 'APPROVED' }), false);
await expect('a T3 approves it -> ALLOWED', updateDoc(doc(t3, A('account_transfers'), 'x1'), { status: 'APPROVED' }), true);

console.log('#8 T3/T4 on a master product - stock only:');
await expect('a T3 changes the stock -> ALLOWED', updateDoc(doc(t3, A('products'), 'p1'), { stock: 4 }), true);
await expect('a T4 adds damaged stock -> ALLOWED', updateDoc(doc(t4, A('products'), 'p1'), { damagedStock: 1 }), true);
await expect('a T3 changes the price -> DENIED', updateDoc(doc(t3, A('products'), 'p1'), { priceRetail: 1 }), false);
await expect('a T4 changes stock AND price in one write -> DENIED', updateDoc(doc(t4, A('products'), 'p1'), { stock: 3, priceRetail: 1 }), false);

console.log('Last: a T2 fires a T5:');
await expect('a T2 deletes a T5 roster card -> ALLOWED', deleteDoc(doc(t2, A('motorists'), 'AGT_T5')), true);

await testEnv.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
