// THE SHOP-LEVEL TARGETS ARE READ BY EVERY SELLER (kpm, 2026-11-09, rules CHANGE 27). After every sale the terminal reads
// appSettings/tierRules (Settings > Tier Automation Rules) to raise the shop's level (src/utils/storeLevel.js). Only the
// owner/T1/T2 catch-all covered appSettings, so every salesman T3-T6 was refused and no salesman's sale ever moved a shop
// (A-Brain Raw/2026-11-09-promoter). Every login of the company may READ that one doc; the rest of appSettings and every
// write stay the owner's. The visit + level writes themselves are the shop rules (customers, CHANGE 17/18), unchanged.
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-tier-rules-read.mjs"
// RULES_FILE=firestore.rules.deployed-baseline shows the refusal on the published rules.
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

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

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-kpm-rules-tiers',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
const dir = (db, id) => doc(db, `artifacts/${APP_ID}/employee_directory`, id);
const app = (db, id, boss = 'ownerA') => doc(db, `artifacts/${APP_ID}/users/${boss}/appSettings`, id);
const shop = (db, id) => doc(db, `artifacts/${APP_ID}/users/ownerA/customers`, id);
const RULESDOC = { rules: { Mythic: { type: 'omset', omsetTarget: 2500000, timeframe: '90' }, Bronze: { type: 'volume', volumeTarget: 2, volumeUnit: 'Bal', timeframe: '30' } } };

await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(dir(db, 'rina@test.com'), { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_R' });
  await setDoc(dir(db, 'tono@test.com'), { bossUid: 'ownerA', userRole: 'AREA_ADMIN', agentId: 'AGT_T' });
  await setDoc(dir(db, 'dewi@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_D', location: 'BANDUNG' });
  await setDoc(dir(db, 'budi@test.com'), { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_B' });
  await setDoc(dir(db, 'dika@test.com'), { bossUid: 'ownerA', userRole: 'ROOKIE', agentId: 'AGT_K' });
  await setDoc(dir(db, 'lost@test.com'), { bossUid: 'ownerA', userRole: 'ROOKIE', agentId: 'AGT_L', locked: true });
  await setDoc(dir(db, 'other@test.com'), { bossUid: 'ownerB', userRole: 'AREA_ADMIN', agentId: 'AGT_O' });
  await setDoc(app(db, 'tierRules'), RULESDOC);
  await setDoc(app(db, 'secret'), { note: 'owner only' });
  await setDoc(shop(db, 's1'), { name: 'TOKO SATU', priceTier: 'Retail', tier: 'Unranked' });
});

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const owner = as('ownerA', 'owner@test.com'), rina = as('u-r', 'rina@test.com'), tono = as('u-t', 'tono@test.com'),
  dewi = as('u-d', 'dewi@test.com'), budi = as('u-b', 'budi@test.com'), dika = as('u-k', 'dika@test.com'),
  lost = as('u-l', 'lost@test.com'), other = as('u-o', 'other@test.com'), anon = testEnv.unauthenticatedContext().firestore();
const SELLERS = [['owner', owner], ['T2', rina], ['T3 AREA_ADMIN', tono], ['T4 FLEET_CAPTAIN', dewi], ['T5', budi], ['T6', dika]];

console.log('Every login of the company reads the level targets');
for (const [who, db] of SELLERS) await expect(`${who}: reads appSettings/tierRules`, getDoc(app(db, 'tierRules')), true);
console.log('...and the app\'s two writes after a sale (visit, then level) still pass the shop rules');
for (const [who, db] of SELLERS) {
  await expect(`${who}: writes the visit date`, updateDoc(shop(db, 's1'), { lastVisit: '2026-11-09', lastVisitedBy: who, updatedAt: serverTimestamp() }), true);
  await expect(`${who}: writes the level`, updateDoc(shop(db, 's1'), { tier: 'Bronze', updatedAt: serverTimestamp() }), true);
}
console.log('Nobody else, and nothing else');
await expect('a LOCKED login cannot read it', getDoc(app(lost, 'tierRules')), false);
await expect('another company\'s admin cannot read it', getDoc(app(other, 'tierRules')), false);
await expect('signed out cannot read it', getDoc(app(anon, 'tierRules')), false);
await expect('T6: another appSettings doc stays the owner\'s', getDoc(app(dika, 'secret')), false);
await expect('T3: another appSettings doc stays the owner\'s', getDoc(app(tono, 'secret')), false);
console.log('Writing the targets stays with T1/T2');
await expect('owner: saves the targets', setDoc(app(owner, 'tierRules'), RULESDOC), true);
await expect('T2: saves the targets', setDoc(app(rina, 'tierRules'), RULESDOC), true);
for (const [who, db] of SELLERS.slice(2)) await expect(`${who}: cannot change the targets`, setDoc(app(db, 'tierRules'), { rules: {} }), false);

console.log(`\n${pass} passed, ${fail} failed`);
await testEnv.cleanup();
process.exit(fail ? 1 : 0);
