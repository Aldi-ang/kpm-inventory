// CHANGE 23 - the Stock Opname worklist. His 2026-11-05: "who can reject or accept the stock opname is the tier 3 and above as default, make
// sure this power added into the matrix for additional flexibility". Each decision is one key on the count's document and lands in one batch
// with that product's stock (StockOpnameView.jsx decideProducts). A T4 reads their own warehouse's counts.
// Run: npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-opname-worklist.mjs"
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, updateDoc, collection, query, where, writeBatch, increment, deleteField, serverTimestamp } from 'firebase/firestore';
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
const card = (db, id) => doc(db, `${base}/motorists`, id);
const audit = (db, id) => doc(db, `${base}/pending_audits`, id);
const shelf = (db, place, id) => doc(db, `${base}/branches/${place}/inventory`, id);
const product = (db, id) => doc(db, `${base}/products`, id);
const matrix = (db) => doc(db, `${base}/settings`, 'permission_matrix');
const mark = { warehouse: 'BANDUNG', by: 'Dewi', auditId: 'A_BDG', at: '2026-11-04T02:00:00.000Z' };
const count = (place, extra = {}) => ({ auditType: place === 'HQ' ? 'MASTER_VAULT' : 'BRANCH_WAREHOUSE', branchLocation: place, status: 'PENDING_HQ_APPROVAL', agentId: 'AGT_D', items: [{ productId: 'p1', expectedStock: 10, expectedDamagedStock: 0, goodCount: 8, damagedCount: 1 }], ...extra });

const reset = () => testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(dir(db, 'ownerA'), { bossUid: 'ownerA', role: 'COMPANY_OWNER', email: 'owner@test.com' });
  await setDoc(dir(db, 'dewi@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_D', location: 'BANDUNG' });
  await setDoc(dir(db, 'sari@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_S', location: 'SEMARANG' });
  await setDoc(dir(db, 'budi@test.com'), { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_B', location: 'BANDUNG' });
  await setDoc(dir(db, 'rina@test.com'), { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_R', location: 'HEADQUARTERS' });
  await setDoc(dir(db, 'tono@test.com'), { bossUid: 'ownerA', userRole: 'AREA_ADMIN', agentId: 'AGT_T', location: 'HEADQUARTERS' });
  await setDoc(card(db, 'AGT_D'), { id: 'AGT_D', name: 'Dewi', userRole: 'FLEET_CAPTAIN', location: 'BANDUNG', lastOpname: mark });
  await setDoc(audit(db, 'A_BDG'), count('BANDUNG'));
  await setDoc(audit(db, 'A_SMG'), count('SEMARANG', { agentId: 'AGT_S' }));
  await setDoc(audit(db, 'A_HQ'), count('HQ', { agentId: 'VAULT' }));
  await setDoc(product(db, 'p1'), { name: 'P', stock: 10, damagedStock: 0 });
  await setDoc(shelf(db, 'BANDUNG', 'p1'), { stock: 10, damagedStock: 0 });
  await setDoc(shelf(db, 'SEMARANG', 'p1'), { stock: 10, damagedStock: 0 });
});
await reset();
const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const owner = as('ownerA', 'owner@test.com'), rina = as('u-r', 'rina@test.com'), tono = as('u-t', 'tono@test.com'), dewi = as('u-d', 'dewi@test.com'), sari = as('u-s', 'sari@test.com'), budi = as('u-b', 'budi@test.com');

/* the batch the app sends: the decision and that product's stock, together */
const acceptBranch = (db, id = 'A_BDG', place = 'BANDUNG') => { const b = writeBatch(db);
  b.update(audit(db, id), { 'decisions.p1': { status: 'ACCEPTED', by: 'x', at: serverTimestamp() }, status: 'APPROVED', resolvedAt: serverTimestamp(), resolvedBy: 'x', noPutBack: true });
  b.set(shelf(db, place, 'p1'), { stock: increment(-2), damagedStock: increment(1) }, { merge: true });
  return b.commit(); };
const acceptMaster = (db) => { const b = writeBatch(db);
  b.update(audit(db, 'A_HQ'), { 'decisions.p1': { status: 'ACCEPTED', by: 'x', at: serverTimestamp() } });
  b.update(product(db, 'p1'), { stock: increment(-2), damagedStock: increment(1) });
  return b.commit(); };
const reject = (db) => { const b = writeBatch(db);
  b.update(audit(db, 'A_BDG'), { 'decisions.p1': { status: 'REJECTED', by: 'x', reason: 'Recount please', at: serverTimestamp() }, status: 'REJECTED', resolvedAt: serverTimestamp(), resolvedBy: 'x', noPutBack: true });
  b.update(card(db, 'AGT_D'), { lastOpname: { ...mark, reopened: { p1: { name: 'P', reason: 'Recount please' } } } });
  return b.commit(); };
const undo = (db) => { const b = writeBatch(db);
  b.update(audit(db, 'A_BDG'), { 'decisions.p1': deleteField(), status: 'PENDING_HQ_APPROVAL', resolvedAt: deleteField(), resolvedBy: deleteField(), noPutBack: deleteField() });
  b.set(shelf(db, 'BANDUNG', 'p1'), { stock: increment(2), damagedStock: increment(-1) }, { merge: true });
  return b.commit(); };

console.log('Who reads the counts');
await expect('T3: reads any warehouse', getDoc(audit(tono, 'A_SMG')), true);
await expect('T3: lists them all', getDocs(collection(tono, `${base}/pending_audits`)), true);
await expect('T4: reads their own warehouse', getDoc(audit(dewi, 'A_BDG')), true);
await expect('T4: lists their own warehouse with the query the screen sends', getDocs(query(collection(dewi, `${base}/pending_audits`), where('branchLocation', '==', 'BANDUNG'))), true);
await expect('T4: another warehouse is closed', getDoc(audit(dewi, 'A_SMG')), false);
await expect('T4: the whole list is closed', getDocs(collection(dewi, `${base}/pending_audits`)), false);
await expect('T5: closed', getDoc(audit(budi, 'A_BDG')), false);

console.log('No matrix key yet: tier 3 and above decide');
await expect('T4: cannot accept by default', acceptBranch(dewi), false);
await expect('T5: cannot accept', acceptBranch(budi), false);
await expect('T4: cannot reject by default', reject(dewi), false);
await expect('T3: cannot change what was counted', updateDoc(audit(tono, 'A_BDG'), { items: [] }), false);
await expect('T3: cannot slip another field in beside a decision', updateDoc(audit(tono, 'A_BDG'), { 'decisions.p1': { status: 'ACCEPTED' }, agentId: 'X' }), false);
await expect('T3: accepts a branch product: the decision and the stock in one batch', acceptBranch(tono), true);
await expect('T3: undo reverses both', undo(tono), true);
await expect('T3: accepts a Master Vault product', acceptMaster(tono), true);
await expect('T3: rejects: the decision and the leader\'s card in one batch', reject(tono), true);
await expect('T3: undo of a reject', testEnv.withSecurityRulesDisabled(async (ctx) => { await setDoc(card(ctx.firestore(), 'AGT_D'), { lastOpname: mark }, { merge: true }); }).then(() => undo(tono)), true);
await expect('T3: cannot change anything else on a card', updateDoc(card(tono, 'AGT_D'), { name: 'X' }), false);
await expect('T3: cannot delete a count', testEnv.authenticatedContext('u-t', { email: 'tono@test.com' }).firestore() && updateDoc(audit(tono, 'A_SMG'), { status: 'APPROVED', items: [] }), false);
await reset();
await expect('owner: accepts', acceptBranch(owner), true);
await reset();
await expect('T2: accepts', acceptBranch(rina), true);
await reset();

console.log('The leader recounts');
await expect('T4: sends the recount and clears it from their own card in one batch', (() => { const b = writeBatch(dewi);
  b.set(audit(dewi, 'A_REC'), count('BANDUNG', { recountOf: 'A_BDG' })); b.update(card(dewi, 'AGT_D'), { lastOpname: { ...mark, reopened: {} } }); return b.commit(); })(), true);

console.log('His switch wins: the key on for a T4 and off for a T3');
await testEnv.withSecurityRulesDisabled(async (ctx) => setDoc(matrix(ctx.firestore()), { matrix: { FLEET_CAPTAIN: ['view_stock_opname', 'decide_opname_product'], AREA_ADMIN: ['view_fleet'], FIELD_OPERATIVE: ['decide_opname_product'] } }));
await expect('T3: switched off, refused', acceptBranch(tono), false);
await expect('T4: switched on, accepts in their own warehouse', acceptBranch(dewi), true);
await expect('T4: switched on, another warehouse is refused', acceptBranch(dewi, 'A_SMG', 'SEMARANG'), false);
await expect('T5: the switch stops at T4, refused even when on', acceptBranch(budi), false);
await reset();
await expect('owner: always', acceptBranch(owner), true);
await reset();
await testEnv.withSecurityRulesDisabled(async (ctx) => setDoc(matrix(ctx.firestore()), { matrix: { AREA_ADMIN: ['decide_opname_product'] } }));
await expect('T3: switched on, accepts', acceptBranch(tono), true);
await expect('T4: the key is known and not theirs, refused', reject(dewi), false);

console.log(`\n${pass} passed, ${fail} failed`);
await testEnv.cleanup();
process.exit(fail ? 1 : 0);
