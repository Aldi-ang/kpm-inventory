// A salesman's sale is ONE write: the receipt, his own van, and the month's tally
// (useTransactionEngine processTransaction; the offline sync in src/utils/vanSync.js).
// If the rules refuse any one of the three, the whole sale is refused. Found 2026-10-19 while
// checking "100 people at once": sales_stats has no rule of its own, so only the catch-all covers it.
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-sale-batch.mjs"
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, writeBatch, increment } from 'firebase/firestore';

const RULES = readFileSync('firestore.rules', 'utf8');
const APP_ID = 'cello-inventory-manager';
const BOSS = 'ownerA';
const BASE = `artifacts/${APP_ID}/users/${BOSS}`;
let pass = 0, fail = 0;

async function expect(label, promise, shouldSucceed) {
  try {
    await (shouldSucceed ? assertSucceeds(promise) : assertFails(promise));
    console.log(`  PASS: ${label}`); pass++;
  } catch (e) {
    console.log(`  FAIL: ${label}\n        ${e.message.split('\n')[0]}`); fail++;
  }
}

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-kpm-rules',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'sales@test.com'),
    { bossUid: BOSS, userRole: 'SALES', location: 'North', agentId: 'van1' });
  await setDoc(doc(db, `${BASE}/motorists/van1`), { name: 'van1', location: 'North', activeCanvas: [{ productId: 'p1', qty: 10, unit: 'Bks' }] });
});

const salesman = testEnv.authenticatedContext('u-sales', { email: 'sales@test.com' }).firestore();
const month = new Date().toISOString().slice(0, 7);
const tally = { month, byProduct: { p1: { qty: increment(2), revenue: increment(20000) } } };

console.log('A salesman\'s sale, piece by piece:');
await expect('the receipt (transactions create) -> ALLOWED',
  setDoc(doc(salesman, `${BASE}/transactions/t1`), { agentId: 'van1', type: 'SALE', total: 20000 }), true);
await expect('his own van (motorists update) -> ALLOWED', (() => {
  const b = writeBatch(salesman); b.update(doc(salesman, `${BASE}/motorists/van1`), { activeCanvas: [{ productId: 'p1', qty: 8, unit: 'Bks' }] }); return b.commit();
})(), true);
await expect('the month\'s tally (sales_stats merge) -> ALLOWED',
  setDoc(doc(salesman, `${BASE}/sales_stats/${month}`), tally, { merge: true }), true);

console.log('The three together, as the app sends them:');
await expect('receipt + van + tally in one batch -> ALLOWED', (() => {
  const b = writeBatch(salesman);
  b.set(doc(salesman, `${BASE}/transactions/t2`), { agentId: 'van1', type: 'SALE', total: 20000 });
  b.update(doc(salesman, `${BASE}/motorists/van1`), { activeCanvas: [{ productId: 'p1', qty: 6, unit: 'Bks' }] });
  b.set(doc(salesman, `${BASE}/sales_stats/${month}`), tally, { merge: true });
  return b.commit();
})(), true);

console.log('Someone else\'s company:');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), `artifacts/${APP_ID}/employee_directory`, 'other@test.com'),
    { bossUid: 'ownerB', userRole: 'SALES', location: 'North', agentId: 'vanB' });
});
const outsider = testEnv.authenticatedContext('u-other', { email: 'other@test.com' }).firestore();
await expect('a salesman of ANOTHER company writes this company\'s tally -> DENIED',
  setDoc(doc(outsider, `${BASE}/sales_stats/${month}`), tally, { merge: true }), false);
await expect('a salesman reads the tally (office totals) -> DENIED',
  (async () => { const { getDoc } = await import('firebase/firestore'); return getDoc(doc(salesman, `${BASE}/sales_stats/${month}`)); })(), false);

console.log(`\n${pass} passed, ${fail} failed`);
await testEnv.cleanup();
process.exit(fail ? 1 : 0);
