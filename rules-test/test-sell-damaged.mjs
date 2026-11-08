// CHANGE 24 - Sell Again by Tier 3 (Quarantine > Sell Again). His 2026-11-03 "only Tier 3 and up set that price", a new matrix key
// `sell_damaged`. One batch (StockOpnameView.jsx executeResolution, method 'SELL'): the crate's damagedStock goes down, the lot
// `products/rsk-<pack>` is made or re-priced, a regional crate also shelves the lot in its warehouse, and a SELL line goes into
// quarantine_logs. Until the key is in the saved matrix a T3 may; after, only the roles whose list has it (T3 or T4 only).
// Run: npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-sell-damaged.mjs"
// (RULES_FILE picks the rules; run it on the published rules too: every ALLOWED case must fail there.)
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDocs, updateDoc, deleteDoc, collection, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const RULES = readFileSync(process.env.RULES_FILE || 'firestore.rules', 'utf8');
const APP_ID = 'cello-inventory-manager';
let pass = 0, fail = 0;
async function expect(label, promise, shouldSucceed) {
  try { await (shouldSucceed ? assertSucceeds(promise) : assertFails(promise)); console.log(`  PASS: ${label}`); pass++; }
  catch (e) { console.log(`  FAIL: ${label}\n        ${e.message.split('\n')[0]}`); fail++; }
}
const testEnv = await initializeTestEnvironment({ projectId: 'demo-kpm-rules', firestore: { rules: RULES, host: '127.0.0.1', port: 8080 } });
const base = `artifacts/${APP_ID}/users/ownerA`;
const dir = (db, id) => doc(db, `artifacts/${APP_ID}/employee_directory`, id);
const shelf = (db, place, id) => doc(db, `${base}/branches/${place}/inventory`, id);
const product = (db, id) => doc(db, `${base}/products`, id);
const logs = (db) => collection(db, `${base}/quarantine_logs`);
const matrix = (db) => doc(db, `${base}/settings`, 'permission_matrix');

const PACK = { name: 'Cello Green 16', type: 'SKT', category: 'Kretek', sticksPerPack: 16, packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4,
  hpp: 18000, priceRetail: 25000, priceGrosir: 24000, priceEcer: 26000, priceDistributor: 23000, stock: 100, damagedStock: 5 };
const LOT = { name: 'Cello Green 16 · RUSAK', damagedFrom: 'p1', type: 'SKT', category: 'Kretek', sticksPerPack: 16, packsPerSlop: 10,
  slopsPerBal: 20, balsPerCarton: 4, hpp: 18000, priceRetail: 20000, priceGrosir: 20000, priceEcer: 20000, priceDistributor: 20000, stock: 2 };

/* clearFirestore every time: the matrix doc must not leak from one block into the next */
const reset = ({ lot = false, key = null } = {}) => testEnv.clearFirestore().then(() => testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(dir(db, 'ownerA'), { bossUid: 'ownerA', role: 'COMPANY_OWNER', email: 'owner@test.com' });
  await setDoc(dir(db, 'tono@test.com'), { bossUid: 'ownerA', userRole: 'AREA_ADMIN', agentId: 'AGT_T', location: 'HEADQUARTERS' });
  await setDoc(dir(db, 'dewi@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_D', location: 'BANDUNG' });
  await setDoc(dir(db, 'budi@test.com'), { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_B', location: 'BANDUNG' });
  await setDoc(dir(db, 'eko@test.com'), { bossUid: 'ownerB', userRole: 'AREA_ADMIN', agentId: 'AGT_E', location: 'HEADQUARTERS' });
  await setDoc(product(db, 'p1'), PACK);
  await setDoc(product(db, 'p2'), { ...PACK, name: 'Cello Red 12' });
  await setDoc(shelf(db, 'BANDUNG', 'p1'), { productId: 'p1', name: PACK.name, stock: 40, damagedStock: 3 });
  await setDoc(doc(logs(db), 'old'), { productId: 'p1', productName: PACK.name, qty: 1, method: 'RTV', facility: 'MASTER', totalValueHpp: 18000 });
  if (lot) {
    await setDoc(product(db, 'rsk-p1'), LOT);
    await setDoc(shelf(db, 'BANDUNG', 'rsk-p1'), { productId: 'rsk-p1', name: LOT.name, stock: 2 });
  }
  if (key) await setDoc(matrix(db), { matrix: key });
}));
const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const owner = as('ownerA', 'owner@test.com'), tono = as('u-t', 'tono@test.com'), dewi = as('u-d', 'dewi@test.com'),
  budi = as('u-b', 'budi@test.com'), eko = as('u-e', 'eko@test.com');

/* the batch the app sends, piece by piece (StockOpnameView.jsx ~934) */
const lotData = (price, n, master) => ({ name: LOT.name, damagedFrom: 'p1', type: PACK.type, category: PACK.category,
  sticksPerPack: PACK.sticksPerPack, packsPerSlop: PACK.packsPerSlop, slopsPerBal: PACK.slopsPerBal, balsPerCarton: PACK.balsPerCarton,
  hpp: PACK.hpp, priceRetail: price, priceGrosir: price, priceEcer: price, priceDistributor: price, stock: increment(master ? n : 0) });
const logData = (facility, price, n, method = 'SELL') => ({ productId: 'p1', productName: PACK.name, qty: n, method, facility,
  totalValueHpp: 0, resolvedBy: 'x', timestamp: serverTimestamp(), details: { to: facility, lotId: 'rsk-p1', price } });
const sellRegional = (db, price = 20000, n = 2) => { const b = writeBatch(db);
  b.set(shelf(db, 'BANDUNG', 'p1'), { damagedStock: increment(-n) }, { merge: true });
  b.set(product(db, 'rsk-p1'), lotData(price, n, false), { merge: true });
  b.set(shelf(db, 'BANDUNG', 'rsk-p1'), { productId: 'rsk-p1', name: LOT.name, stock: increment(n) }, { merge: true });
  b.set(doc(logs(db)), logData('BANDUNG', price, n));
  return b.commit(); };
const sellMaster = (db, price = 20000, n = 2) => { const b = writeBatch(db);
  b.set(product(db, 'p1'), { damagedStock: increment(-n) }, { merge: true });
  b.set(product(db, 'rsk-p1'), lotData(price, n, true), { merge: true });
  b.set(doc(logs(db)), logData('MASTER', price, n));
  return b.commit(); };
/* only the two writes CHANGE 24 governs: for a T5 or another company the crate and shelf writes are already refused by older rules,
   so the whole batch would fail for a reason this test is not about */
const lotAndLog = (db) => { const b = writeBatch(db);
  b.set(product(db, 'rsk-p1'), lotData(20000, 2, true), { merge: true });
  b.set(doc(logs(db)), logData('MASTER', 20000, 2));
  return b.commit(); };

console.log('ALLOWED: no key saved, a T3 sells again');
await reset();
await expect('T3: whole batch from a regional crate (BANDUNG)', sellRegional(tono), true);
await reset();
await expect('T3: whole batch from the Master Vault crate', sellMaster(tono), true);
await reset({ lot: true });
await expect('T3: sells the same pack again at a new price (the lot exists: update)', sellRegional(tono, 18500), true);
await reset({ key: { FLEET_CAPTAIN: ['sell_damaged'], AREA_ADMIN: ['view_fleet'] } });
await expect('T4: key on FLEET_CAPTAIN only, whole batch', sellRegional(dewi), true);
await reset();
await expect('owner: whole batch', sellRegional(owner), true);

console.log('DENIED: the lot fence');
await reset();
await expect('T3: priceRetail on a normal pack products/p1 (the rsk- id is the whole fence)', updateDoc(product(tono, 'p1'), { priceRetail: 1000 }), false);
await expect('T3: a lot with an extra field kind: promo', setDoc(product(tono, 'rsk-p1'), { ...lotData(20000, 2, true), kind: 'promo' }, { merge: true }), false);
await expect('T3: products/rsk-p2 with damagedFrom p1', setDoc(product(tono, 'rsk-p2'), lotData(20000, 2, true), { merge: true }), false);
await expect('T3: a lot whose id is x-p1', setDoc(product(tono, 'x-p1'), lotData(20000, 2, true), { merge: true }), false);
await reset({ lot: true });
await expect('T3: update of an existing lot changing damagedFrom', setDoc(product(tono, 'rsk-p1'), { damagedFrom: 'p2' }, { merge: true }), false);
await expect('T3: delete of a lot', deleteDoc(product(tono, 'rsk-p1')), false);

console.log('DENIED: the history');
await reset();
await expect('T3: quarantine_logs with method SAMPLING', setDoc(doc(logs(tono)), logData('MASTER', 0, 2, 'SAMPLING')), false);
await expect('T3: reads quarantine_logs', getDocs(logs(tono)), false);

console.log('DENIED: who');
await reset();
await expect('T4: no key saved, whole batch', sellRegional(dewi), false);
await reset({ key: { FLEET_CAPTAIN: ['sell_damaged'] } });
await expect('T3: key on FLEET_CAPTAIN only, whole batch', sellRegional(tono), false);
await reset({ key: { FIELD_OPERATIVE: ['sell_damaged'] } });
await expect('T5: key on FIELD_OPERATIVE, lot + log', lotAndLog(budi), false);
await reset();
await expect('another company\'s AREA_ADMIN (bossUid ownerB), lot + log', lotAndLog(eko), false);

console.log(`\n${pass} passed, ${fail} failed`);
await testEnv.cleanup();
process.exit(fail ? 1 : 0);
