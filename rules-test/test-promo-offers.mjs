// TEAM OFFERS (kpm, 2026-10-27) - firestore.rules [CHANGE 19]. His words: "regional admin can make offers for his own
// as a team strategy as long as sales increasing". The app writes exactly what is below (App.jsx handleSavePromoBundles).
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-promo-offers.mjs"
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, collection, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

const RULES = readFileSync(process.env.RULES_FILE || 'firestore.rules', 'utf8');
const APP_ID = 'cello-inventory-manager';
let pass = 0, fail = 0;

async function expect(label, promise, shouldSucceed) {
  try {
    await (shouldSucceed ? assertSucceeds(promise) : assertFails(promise));
    console.log(`  PASS: ${label}`); pass++;
  } catch (e) {
    console.log(`  FAIL: ${label}\n        ${String(e.message).replace(/\s+/g, ' ').slice(0, 400)}`); fail++;
  }
}

const DIR = [
  ['t4b@test.com', { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_T4B', location: 'BANDUNG' }],
  ['t4loose@test.com', { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_T4L', location: ' Bandung ' }],   // typed loosely: still BANDUNG
  ['t4none@test.com', { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_T4N' }],                            // no location
  ['t4lock@test.com', { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_T4K', location: 'BANDUNG', locked: true }],
  ['t3@test.com', { bossUid: 'ownerA', userRole: 'AREA_ADMIN', agentId: 'AGT_T3', location: 'BANDUNG' }],
  ['t5b@test.com', { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_T5B', location: 'BANDUNG' }],
  ['t4other@test.com', { bossUid: 'ownerB', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_O', location: 'BANDUNG' }],         // another company
];
const A = (p) => `artifacts/${APP_ID}/users/ownerA/${p}`;
const offer = { id: 'b1', name: 'BANDUNG BUNDLE', region: 'BANDUNG', by: 'KALDI',
  lines: [{ productId: 'p1', name: 'TAWANG', qty: 2, unit: 'Slop' }], gives: [{ productId: 'p-l', name: 'Lighter', qty: 1 }] };

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-kpm-rules',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
await testEnv.clearFirestore();
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (const [email, data] of DIR) await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, email), data);
  await setDoc(doc(db, A('promoOffers'), 'JAKARTA'), { bundles: [] });
});

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const owner = as('ownerA', 'owner-a@test.com'), t4b = as('u-t4b', 't4b@test.com'), t4loose = as('u-t4l', 't4loose@test.com');
const t4none = as('u-t4n', 't4none@test.com'), t4lock = as('u-t4k', 't4lock@test.com'), t3 = as('u-t3', 't3@test.com');
const t5b = as('u-t5b', 't5b@test.com'), t4other = as('u-o', 't4other@test.com');
const offers = (db, r) => doc(db, A('promoOffers'), r);

console.log('THE REGIONAL ADMIN (T4) - his own region only:');
await expect('T4 Bandung saves BANDUNG\'s offers', setDoc(offers(t4b, 'BANDUNG'), { bundles: [offer] }), true);
await expect('T4 Bandung clears BANDUNG\'s offers (empty list)', setDoc(offers(t4b, 'BANDUNG'), { bundles: [] }), true);
await expect('T4 typed " Bandung " still saves BANDUNG', setDoc(offers(t4loose, 'BANDUNG'), { bundles: [offer] }), true);
await expect('T4 Bandung saves JAKARTA\'s offers - REFUSED', setDoc(offers(t4b, 'JAKARTA'), { bundles: [offer] }), false);
await expect('T4 Bandung writes a lower-case "bandung" doc - REFUSED', setDoc(offers(t4b, 'bandung'), { bundles: [offer] }), false);
await expect('T4 Bandung adds a second field - REFUSED', setDoc(offers(t4b, 'BANDUNG'), { bundles: [offer], on: true }), false);
await expect('T4 Bandung stores bundles as a non-list - REFUSED', setDoc(offers(t4b, 'BANDUNG'), { bundles: 'x' }), false);
await expect('T4 Bandung deletes BANDUNG\'s doc - REFUSED (he saves an empty list instead)', deleteDoc(offers(t4b, 'BANDUNG')), false);
await expect('T4 with no location saves UNASSIGNED - REFUSED', setDoc(offers(t4none, 'UNASSIGNED'), { bundles: [offer] }), false);
await expect('T4 locked account saves BANDUNG - REFUSED', setDoc(offers(t4lock, 'BANDUNG'), { bundles: [offer] }), false);
await expect('T4 of ANOTHER company saves BANDUNG here - REFUSED', setDoc(offers(t4other, 'BANDUNG'), { bundles: [offer] }), false);

console.log('EVERYONE ELSE:');
await expect('T3 HQ Sales Manager saves BANDUNG - REFUSED (not in his answer)', setDoc(offers(t3, 'BANDUNG'), { bundles: [offer] }), false);
await expect('T5 salesman saves BANDUNG - REFUSED', setDoc(offers(t5b, 'BANDUNG'), { bundles: [offer] }), false);
await expect('the owner saves JAKARTA (catch-all)', setDoc(offers(owner, 'JAKARTA'), { bundles: [offer] }), true);
await expect('the owner saves BANDUNG (catch-all)', setDoc(offers(owner, 'BANDUNG'), { bundles: [offer] }), true);

console.log('READ - the Sales Terminal listener:');
await expect('T5 Bandung reads every region\'s offers', getDocs(collection(t5b, A('promoOffers'))), true);
await expect('T4 Bandung reads every region\'s offers', getDocs(collection(t4b, A('promoOffers'))), true);
await expect('an employee of ANOTHER company reads them - REFUSED', getDocs(collection(t4other, A('promoOffers'))), false);

console.log(`\n${pass} passed, ${fail} failed`);
await testEnv.cleanup();
process.exit(fail ? 1 : 0);
