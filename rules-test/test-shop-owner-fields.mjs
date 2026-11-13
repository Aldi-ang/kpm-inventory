// CHANGE 28 - a shop's salesman (assignedAgent / assignedBy / assignedAt) and its package-count reset (bundleReset) are
// written by tier 1-4 only. His 2026-11-12 "i only give the paintbrush features for tier 4 and above in default bro" and
// 2026-11-13 "tier 4 and above can refresh that immediately". A salesman's visits, edits and new shops are untouched.
// Run: npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-shop-owner-fields.mjs"
// (RULES_FILE picks the rules; run it on the published rules too: every DENIED case must fail there.)
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, addDoc, updateDoc, collection, deleteField, serverTimestamp } from 'firebase/firestore';
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
const shop = (db, id) => doc(db, `${base}/customers`, id);
const shops = (db) => collection(db, `${base}/customers`);

const SHOP = { name: 'TOKO MAJU', phone: '0812', priceTier: 'Retail', tier: 'Silver', region: 'BANDUNG', city: 'CIBEUNYING', assignedAgent: 'Budi Santoso' };
const reset = () => testEnv.clearFirestore().then(() => testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(dir(db, 'ownerA'), { bossUid: 'ownerA', role: 'COMPANY_OWNER', email: 'owner@test.com' });
  await setDoc(dir(db, 'tono@test.com'), { bossUid: 'ownerA', userRole: 'AREA_ADMIN', agentId: 'AGT_T', location: 'HEADQUARTERS' });
  await setDoc(dir(db, 'dewi@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_D', location: 'BANDUNG' });
  await setDoc(dir(db, 'budi@test.com'), { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_B', location: 'BANDUNG' });
  await setDoc(shop(db, 's1'), SHOP);
  await setDoc(shop(db, 's2'), { ...SHOP, name: 'WARUNG SARI', assignedAgent: 'Unassigned' });
}));
const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const owner = as('ownerA', 'owner@test.com'), tono = as('u-t', 'tono@test.com'), dewi = as('u-d', 'dewi@test.com'), budi = as('u-b', 'budi@test.com');

console.log('\nCHANGE 28: tier 1-4 choose a shop\'s salesman and clear its package count');
await reset(); await expect('T4 Give (Customer Directory): assignedAgent + assignedBy + assignedAt', updateDoc(shop(dewi, 's2'), { assignedAgent: 'Adi', assignedBy: 'Dewi', assignedAt: serverTimestamp() }), true);
await reset(); await expect('T3 unassigns in Journey Plan (assignedAgent removed)', updateDoc(shop(tono, 's1'), { assignedAgent: deleteField(), updatedAt: serverTimestamp() }), true);
await reset(); await expect('T4 Clear count (bundleReset)', updateDoc(shop(dewi, 's1'), { bundleReset: { 'b-cello': Date.now() } }), true);
await reset(); await expect('the owner sets a salesman (his catch-all)', updateDoc(shop(owner, 's2'), { assignedAgent: 'Adi' }), true);

console.log('\nA salesman (T5) keeps everything he does today');
await reset(); await expect('T5 logs a visit', updateDoc(shop(budi, 's1'), { lastVisit: '2026-11-13', lastVisitTag: 'Repeat Order', lastVisitedBy: 'Budi' }), true);
await reset(); await expect('T5 edits the shop form (name, phone, Retail)', updateDoc(shop(budi, 's1'), { name: 'TOKO MAJU JAYA', phone: '0813', priceTier: 'Retail', updatedAt: serverTimestamp() }), true);
await reset(); await expect('T5 sends the salesman unchanged (same value is no change)', updateDoc(shop(budi, 's1'), { assignedAgent: 'Budi Santoso', phone: '0814' }), true);
await reset(); await expect('T5 registers a new shop (the form sends no salesman)', addDoc(shops(budi), { name: 'TOKO BARU', priceTier: 'Retail', tier: 'Silver', region: 'BANDUNG', status: 'Active' }), true);
await reset(); await expect('a new shop as Unassigned (what the KML import writes)', addDoc(shops(budi), { name: 'TOKO KML', priceTier: 'Retail', status: 'APPROVED', assignedAgent: 'Unassigned' }), true);
await reset(); await expect('T4 registers a shop already given to a salesman', addDoc(shops(dewi), { name: 'TOKO T4', priceTier: 'Retail', assignedAgent: 'Adi' }), true);

console.log('\nA salesman (T5) can no longer take or reset a shop from a changed app');
await reset(); await expect('DENIED: T5 names himself the salesman', updateDoc(shop(budi, 's2'), { assignedAgent: 'Budi Santoso' }), false);
await reset(); await expect('DENIED: T5 removes the salesman', updateDoc(shop(budi, 's1'), { assignedAgent: deleteField() }), false);
await reset(); await expect('DENIED: T5 writes assignedBy', updateDoc(shop(budi, 's1'), { assignedBy: 'Budi' }), false);
await reset(); await expect('DENIED: T5 clears a package count (bundleReset)', updateDoc(shop(budi, 's1'), { bundleReset: { 'b-cello': Date.now() } }), false);
await reset(); await expect('DENIED: T5 registers a shop already named his', addDoc(shops(budi), { name: 'TOKO KU', priceTier: 'Retail', assignedAgent: 'Budi Santoso' }), false);
await reset(); await expect('DENIED: T5 registers a shop with a count reset', addDoc(shops(budi), { name: 'TOKO KU', priceTier: 'Retail', bundleReset: { 'b-cello': 1 } }), false);

/* FOLDERS ON (CHANGE 17): T4 and T5 edit through the folder line, the longest one - it must still fit the 1000-expression
   limit with this check added, or a T4's Give inside his own folder would be refused */
const folders = () => reset().then(() => testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, `${base}/settings`, 'customer_access'), { on: true, teams: { BANDUNG: { areas: { 'JAWA BARAT|BANDUNG': ['CIBEUNYING'] }, adminEdit: true, teamEdit: true } } });
  await setDoc(shop(db, 's1'), { ...SHOP, province: 'JAWA BARAT' });
}));
console.log('\nFolders ON: the same answers through the folder line');
await folders(); await expect('T4 Give inside his own folder', updateDoc(shop(dewi, 's1'), { assignedAgent: 'Adi', assignedBy: 'Dewi', assignedAt: serverTimestamp() }), true);
await folders(); await expect('T4 Clear count inside his own folder', updateDoc(shop(dewi, 's1'), { bundleReset: { 'b-cello': Date.now() } }), true);
await folders(); await expect('T5 logs a visit', updateDoc(shop(budi, 's1'), { lastVisit: '2026-11-13', lastVisitTag: 'Repeat Order', lastVisitedBy: 'Budi', updatedAt: serverTimestamp() }), true);
await folders(); await expect('T5 edits his folder\'s shop (team edit on)', updateDoc(shop(budi, 's1'), { phone: '0815', updatedAt: serverTimestamp() }), true);
await folders(); await expect('DENIED: T5 names himself the salesman (team edit on)', updateDoc(shop(budi, 's1'), { assignedAgent: 'Budi' }), false);
await folders(); await expect('DENIED: T5 clears a package count (team edit on)', updateDoc(shop(budi, 's1'), { bundleReset: { 'b-cello': 1 } }), false);

console.log(`\n${pass} passed, ${fail} failed`);
await testEnv.cleanup();
process.exit(fail ? 1 : 0);
