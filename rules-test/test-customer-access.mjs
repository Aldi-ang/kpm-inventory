// CUSTOMER ACCESS BY FOLDER (kpm, 2026-10-20) - firestore.rules [CHANGE 17]. His words: "bandung team may only see
// bandung's customer and not muntilan one" + "as tier 1 i want option so that alex be able to see the customer inside
// which folder". The plan: A-Brain Brainstorm/2026-10-20_customer-access-by-folder.md. The app side asks exactly the
// queries below (src/utils/customerAccess.js grantQueries + the team admin's holdTeam query).
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-customer-access.mjs"
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, collection, getDoc, getDocs, setDoc, updateDoc, addDoc, query, where, deleteField } from 'firebase/firestore';

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
  ['t2@test.com', { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_T2', location: 'Headquarters' }],
  ['legacy@test.com', { bossUid: 'ownerA', userRole: 'ADMIN', agentId: 'AGT_L' }],
  ['t3m@test.com', { bossUid: 'ownerA', userRole: 'AREA_ADMIN', agentId: 'AGT_T3M', location: 'MUNTILAN' }],
  ['alex@test.com', { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_ALEX', location: 'MUNTILAN' }],
  ['t5m@test.com', { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_T5M', location: ' Muntilan ' }],   // typed loosely: still MUNTILAN
  ['t6m@test.com', { bossUid: 'ownerA', userRole: 'ROOKIE', agentId: 'AGT_T6M', location: 'MUNTILAN' }],
  ['t4b@test.com', { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_T4B', location: 'BANDUNG' }],
  ['t5s@test.com', { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_T5S', location: 'SEMARANG' }],   // a team with no ticks
];
const A = (p) => `artifacts/${APP_ID}/users/ownerA/${p}`;
const SHOPS = {
  m1: { name: 'TOKO MUNTILAN', province: 'JAWA TENGAH', region: 'MAGELANG', city: 'MUNTILAN', phone: '1' },
  m2: { name: 'TOKO MERTOYUDAN', province: 'JAWA TENGAH', region: 'MAGELANG', city: 'MERTOYUDAN', phone: '2' },
  b1: { name: 'TOKO CICENDO', province: 'JAWA BARAT', region: 'BANDUNG', city: 'CICENDO', phone: '3' },
  low: { name: 'TOKO LOWER', province: 'Jawa Tengah', region: 'MAGELANG', city: 'MUNTILAN', phone: '4' },   // not scrubbed yet
  h1: { name: 'TOKO BARU', province: 'JAWA TENGAH', region: 'MAGELANG', city: 'SAWANGAN', holdTeam: 'MUNTILAN' },
};
const ACCESS = (on, teamEdit = false) => ({
  on,
  teams: {
    MUNTILAN: { areas: { 'JAWA TENGAH|MAGELANG': ['MUNTILAN'] }, adminEdit: true, teamEdit },
    BANDUNG: { areas: { 'JAWA BARAT|BANDUNG': ['CICENDO'] }, adminEdit: false, teamEdit: false },
  },
});

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-kpm-rules',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
const seed = (access) => testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (const [email, data] of DIR) await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, email), data);
  for (const [id, data] of Object.entries(SHOPS)) await setDoc(doc(db, A('customers'), id), data);
  if (access) await setDoc(doc(db, A('settings'), 'customer_access'), access);
});
await testEnv.clearFirestore();
await seed(null);   // no customer_access doc at all - his company the moment he publishes CHANGE 17

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const owner = as('ownerA', 'owner-a@test.com'), t2 = as('u-t2', 't2@test.com'), legacy = as('u-l', 'legacy@test.com');
const t3m = as('u-t3m', 't3m@test.com'), alex = as('u-alex', 'alex@test.com'), t5m = as('u-t5m', 't5m@test.com');
const t6m = as('u-t6m', 't6m@test.com'), t4b = as('u-t4b', 't4b@test.com'), t5s = as('u-t5s', 't5s@test.com');
const shops = (db) => collection(db, A('customers'));
const kabQuery = (db, province, region, cities) => query(shops(db), where('province', '==', province), where('region', '==', region), where('city', 'in', cities));
const holdQuery = (db, team) => query(shops(db), where('holdTeam', '==', team));
const visit = { lastVisit: '2026-10-20', lastVisitNote: '[✅] ok', lastVisitTag: '✅', lastVisitedBy: 'Budi', updatedAt: 1 };

console.log('NO ACCESS DOC (live, the moment he publishes) - every line as before:');
await expect('T5 Muntilan reads every shop', getDocs(shops(t5m)), true);
await expect('Alex (T4) reads every shop', getDocs(shops(alex)), true);
await expect('T5 Muntilan edits a Bandung shop (old default "edit all")', updateDoc(doc(t5m, A('customers'), 'b1'), { phone: '0' }), true);
await expect('T5 Muntilan records a visit', updateDoc(doc(t5m, A('customers'), 'm1'), visit), true);

await seed(ACCESS(false));
console.log('OFF - nothing changes until he switches it on:');
await expect('T5 Muntilan reads EVERY shop (one plain query, as today)', getDocs(shops(t5m)), true);
// FIXED 2026-11-01 by CHANGE 21: the catch-all (CHANGE 14 #6) read document[0], which a LIST leaves unbound, so an owner
// with no roster profile could not list. It now matches on the path string (rules-test/test-owner-lists.mjs).
await expect("the owner's every-shop query (the old KNOWN GAP, CHANGE 21)", getDocs(shops(owner)), true);
await expect('the owner reads one shop', getDoc(doc(owner, A('customers'), 'b1')), true);
await expect('T5 Muntilan edits a Bandung shop (old default "edit all")', updateDoc(doc(t5m, A('customers'), 'b1'), { phone: '9' }), true);
await expect('any employee reads the access doc', getDoc(doc(t5m, A('settings'), 'customer_access')), true);
await expect('a T4 cannot write the access doc', setDoc(doc(alex, A('settings'), 'customer_access'), ACCESS(false)), false);
await expect('a T2 writes the access doc', setDoc(doc(t2, A('settings'), 'customer_access'), ACCESS(true)), true);

await seed(ACCESS(true));
console.log('ON - Muntilan ticked: JAWA TENGAH|MAGELANG > MUNTILAN only:');
await expect('Alex (T4 Muntilan) reads a Muntilan shop', getDoc(doc(alex, A('customers'), 'm1')), true);
await expect('Alex is refused a Bandung shop', getDoc(doc(alex, A('customers'), 'b1')), false);
await expect('Alex is refused an unticked Kecamatan of his own Kabupaten (MERTOYUDAN)', getDoc(doc(alex, A('customers'), 'm2')), false);
await expect('Alex is refused a shop not yet in capitals ("Jawa Tengah")', getDoc(doc(alex, A('customers'), 'low')), false);
await expect('Alex: the app\'s folder query (Kabupaten + city in [...]) -> ALLOWED', getDocs(kabQuery(alex, 'JAWA TENGAH', 'MAGELANG', ['MUNTILAN'])), true);
await expect('Alex: the old "every shop" query -> DENIED (rules are not filters)', getDocs(shops(alex)), false);
await expect('Alex: a folder query that slips in an unticked Kecamatan -> DENIED', getDocs(kabQuery(alex, 'JAWA TENGAH', 'MAGELANG', ['MUNTILAN', 'MERTOYUDAN'])), false);
await expect('Alex: a query for Bandung\'s folder -> DENIED', getDocs(kabQuery(alex, 'JAWA BARAT', 'BANDUNG', ['CICENDO'])), false);
await expect('Alex reads his team\'s temporary folder (holdTeam MUNTILAN)', getDocs(holdQuery(alex, 'MUNTILAN')), true);
await expect('T3 (HQ sales manager) reads EVERY shop - his "same like tier 1 and 2"', getDocs(shops(t3m)), true);
await expect('T3 reads a Bandung shop', getDoc(doc(t3m, A('customers'), 'b1')), true);
await expect('T3 edits a Bandung shop (old default "edit all")', updateDoc(doc(t3m, A('customers'), 'b1'), { phone: '1' }), true);
await expect('Bandung\'s admin cannot read Muntilan\'s temporary folder', getDocs(holdQuery(t4b, 'MUNTILAN')), false);
await expect('a T5 cannot read the temporary folder (admin only)', getDocs(holdQuery(t5m, 'MUNTILAN')), false);
await expect('Bandung\'s admin reads Bandung\'s shop', getDocs(kabQuery(t4b, 'JAWA BARAT', 'BANDUNG', ['CICENDO'])), true);
await expect('Bandung\'s admin is refused a Muntilan shop', getDoc(doc(t4b, A('customers'), 'm1')), false);

console.log('ON - the team inherits the folders, view only by default:');
await expect('T5 Muntilan (location typed " Muntilan ") reads the Muntilan folder', getDocs(kabQuery(t5m, 'JAWA TENGAH', 'MAGELANG', ['MUNTILAN'])), true);
await expect('T6 Muntilan reads a Muntilan shop', getDoc(doc(t6m, A('customers'), 'm1')), true);
await expect('T5 Muntilan is refused a Bandung shop', getDoc(doc(t5m, A('customers'), 'b1')), false);
await expect('T5 Muntilan cannot EDIT a Muntilan shop (team = view only)', updateDoc(doc(t5m, A('customers'), 'm1'), { phone: '9' }), false);
await expect('T5 Muntilan still RECORDS A VISIT there (Journey check-in)', updateDoc(doc(t5m, A('customers'), 'm1'), visit), true);
await expect('T5 Muntilan still closes an open request', updateDoc(doc(t5m, A('customers'), 'm1'), { openRequest: deleteField(), updatedAt: 2 }), true);
await expect('a visit cannot carry a real edit along with it', updateDoc(doc(t5m, A('customers'), 'm1'), { ...visit, phone: '9' }), false);
await expect('T5 Muntilan cannot record a visit at a Bandung shop', updateDoc(doc(t5m, A('customers'), 'b1'), visit), false);
await expect('T5 Muntilan still REGISTERS a new shop (create unchanged)', addDoc(shops(t5m), { name: 'TOKO NOO', province: 'JAWA TENGAH', region: 'MAGELANG', city: 'SAWANGAN' }), true);
await expect('a team with no ticks (Semarang) sees nothing', getDoc(doc(t5s, A('customers'), 'm1')), false);
await expect('a team with no ticks: the every-shop query is refused', getDocs(shops(t5s)), false);

console.log('ON - the admin edits (his switch on), only inside his own folders:');
await expect('Alex edits a Muntilan shop\'s phone', updateDoc(doc(alex, A('customers'), 'm1'), { phone: '8' }), true);
await expect('Alex cannot move a Muntilan shop into Bandung\'s folder', updateDoc(doc(alex, A('customers'), 'm1'), { province: 'JAWA BARAT', region: 'BANDUNG', city: 'CICENDO' }), false);
await expect('Alex cannot move it into an unticked Kecamatan', updateDoc(doc(alex, A('customers'), 'm1'), { city: 'MERTOYUDAN' }), false);
await expect('Alex edits a shop waiting in his temporary folder (area untouched)', updateDoc(doc(alex, A('customers'), 'h1'), { phone: '7' }), true);
await expect('Alex cannot place a waiting shop into Bandung\'s folder', updateDoc(doc(alex, A('customers'), 'h1'), { province: 'JAWA BARAT', region: 'BANDUNG', city: 'CICENDO', holdTeam: deleteField() }), false);
await expect('Alex places a waiting shop into HIS folder', updateDoc(doc(alex, A('customers'), 'h1'), { city: 'MUNTILAN', holdTeam: deleteField() }), true);
await expect('Bandung\'s admin (his switch OFF) cannot edit his own shop', updateDoc(doc(t4b, A('customers'), 'b1'), { phone: '6' }), false);
await expect('Bandung\'s admin still records a visit there', updateDoc(doc(t4b, A('customers'), 'b1'), visit), true);

console.log('ON - Tier 1/2 keep the full list:');
await expect('the owner reads one shop', getDoc(doc(owner, A('customers'), 'b1')), true);
await expect('the owner reads every shop (CHANGE 21)', getDocs(shops(owner)), true);
await expect('a T2 (COMPANY_OWNER) reads every shop', getDocs(shops(t2)), true);
await expect('the old ADMIN tag reads every shop', getDocs(shops(legacy)), true);
await expect('a T2 edits a Bandung shop', updateDoc(doc(t2, A('customers'), 'b1'), { phone: '5' }), true);

await seed(ACCESS(true, true));
console.log('ON, team switch set to "view and edit":');
await expect('T5 Muntilan edits a Muntilan shop', updateDoc(doc(t5m, A('customers'), 'm1'), { phone: '4' }), true);
await expect('T5 Muntilan still cannot edit a Bandung shop', updateDoc(doc(t5m, A('customers'), 'b1'), { phone: '4' }), false);

await seed(ACCESS(false));
console.log('switched OFF again - the old behaviour comes back:');
await expect('T5 Muntilan reads every shop again', getDocs(shops(t5m)), true);

// [CHANGE 18] GROSIR IS UNLOCKED BY AN ADMIN (his 2026-10-21 "A, grosir only available for the grosir registered
// store only"). RED on the rules before CHANGE 18: every "cannot" below succeeds there.
console.log('CHANGE 18, folders OFF - only T1-T4 make a shop Grosir:');
await expect('T5 cannot register a new shop at Grosir', addDoc(shops(t5m), { name: 'TOKO G1', priceTier: 'Grosir' }), false);
await expect('T5 cannot reach Grosir through the rank (no price saved, tier GOLD)', addDoc(shops(t5m), { name: 'TOKO G2', tier: 'Gold' }), false);
await expect('T5 registers it at Retail with Grosir requested (what the app writes)', addDoc(shops(t5m), { name: 'TOKO G3', priceTier: 'Retail', requestedTier: 'Grosir' }), true);
await expect('T5 cannot turn a Retail shop into Grosir', updateDoc(doc(t5m, A('customers'), 'm1'), { priceTier: 'Grosir' }), false);
await expect('T5 cannot write it in capitals either', updateDoc(doc(t5m, A('customers'), 'm1'), { priceTier: 'WHOLESALE' }), false);
await expect('T5 may ASK: requestedTier Grosir on a Retail shop', updateDoc(doc(t5m, A('customers'), 'm1'), { requestedTier: 'Grosir' }), true);
await expect('Alex (T4) confirms Grosir', updateDoc(doc(alex, A('customers'), 'm1'), { priceTier: 'Grosir', requestedTier: deleteField(), grosirConfirmedBy: 'Alex', grosirConfirmedAt: 1 }), true);
await expect('T5 still records a visit at the Grosir shop', updateDoc(doc(t5m, A('customers'), 'm1'), visit), true);
await expect('T5 still edits the Grosir shop\'s phone (it was Grosir already)', updateDoc(doc(t5m, A('customers'), 'm1'), { phone: '3' }), true);
await expect('T5 may move a Grosir shop DOWN to Retail', updateDoc(doc(t5m, A('customers'), 'm1'), { priceTier: 'Retail' }), true);
await expect('T3 creates a shop at Grosir', addDoc(shops(t3m), { name: 'TOKO T3G', priceTier: 'Grosir' }), true);
await expect('T2 creates a shop at Grosir', addDoc(shops(t2), { name: 'TOKO T2G', priceTier: 'Grosir' }), true);
await expect('the owner creates a shop at Grosir', addDoc(shops(owner), { name: 'TOKO OWNG', priceTier: 'Grosir' }), true);

await seed(ACCESS(true, true));
console.log('CHANGE 18, folders ON (team switch "view and edit"):');
await expect('T5 Muntilan (may edit) still cannot make his shop Grosir', updateDoc(doc(t5m, A('customers'), 'm1'), { priceTier: 'Grosir' }), false);
await expect('T5 Muntilan may ask for it', updateDoc(doc(t5m, A('customers'), 'm1'), { requestedTier: 'Grosir' }), true);
await expect('Alex confirms Grosir inside his folder (stays under the 1000-step limit)', updateDoc(doc(alex, A('customers'), 'm1'), { priceTier: 'Grosir', requestedTier: deleteField(), grosirConfirmedBy: 'Alex', grosirConfirmedAt: 1 }), true);
await expect('Bandung\'s admin (his switch OFF) cannot confirm Grosir', updateDoc(doc(t4b, A('customers'), 'b1'), { priceTier: 'Grosir' }), false);
await expect('Alex cannot confirm Grosir on a Bandung shop', updateDoc(doc(alex, A('customers'), 'b1'), { priceTier: 'Grosir' }), false);

await testEnv.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
