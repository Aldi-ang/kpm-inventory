// LOADING A SALESMAN'S VAN (kpm, 2026-11-09, rules CHANGE 26). His "how the regional admin put item to the agent inventory"
// (2026-09-22): the Loading Bay is a T4's daily job. The demo walk found it refused: the motorists update rule let a T4 change a
// card only while holding the hire/fire switch (canEditRoster), so the app offered "Muat van" to every T4 and the database
// refused the rest. Now a T3 anywhere, a T4 in their own region, may change ONLY the van lists (activeCanvas, promoCanvas).
// The write is the app's own shape (FleetCanvasManager handleLoadCanvas): the warehouse shelf and the card in ONE commit.
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-van-load.mjs"
// RULES_FILE=firestore.rules.deployed-baseline shows the refusal on the published rules.
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

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
  projectId: 'demo-kpm-rules-van',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
const dir = (db, id) => doc(db, `artifacts/${APP_ID}/employee_directory`, id);
const card = (db, id) => doc(db, `artifacts/${APP_ID}/users/ownerA/motorists`, id);
const shelf = (db, branch, id) => doc(db, `artifacts/${APP_ID}/users/ownerA/branches/${branch}/inventory`, id);

await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(dir(db, 'hendra@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_H', location: 'BANDUNG' });
  await setDoc(dir(db, 'boss4@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_C', location: 'BANDUNG', canEditRoster: true });
  await setDoc(dir(db, 'garut4@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_G', location: 'GARUT' });
  await setDoc(dir(db, 'rina@test.com'), { bossUid: 'ownerA', userRole: 'AREA_ADMIN', agentId: 'AGT_R', location: 'HEADQUARTERS' });
  await setDoc(dir(db, 'budi@test.com'), { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_B', location: 'BANDUNG' });
  await setDoc(dir(db, 'dika@test.com'), { bossUid: 'ownerA', userRole: 'ROOKIE', agentId: 'AGT_K', location: 'BANDUNG' });
  await setDoc(card(db, 'AGT_K'), { id: 'AGT_K', name: 'Dika', userRole: 'ROOKIE', location: 'BANDUNG', activeCanvas: [], promoCanvas: [] });
  await setDoc(card(db, 'AGT_X'), { id: 'AGT_X', name: 'Yudi', userRole: 'FIELD_OPERATIVE', location: 'GARUT', activeCanvas: [] });
  await setDoc(shelf(db, 'BANDUNG', 'p1'), { productId: 'p1', name: 'Djarum', stock: 500 });
  await setDoc(shelf(db, 'GARUT', 'p1'), { productId: 'p1', name: 'Djarum', stock: 500 });
});

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const hendra = as('u-h', 'hendra@test.com'), boss4 = as('u-c', 'boss4@test.com'), garut4 = as('u-g', 'garut4@test.com'),
  rina = as('u-r', 'rina@test.com'), budi = as('u-b', 'budi@test.com'), dika = as('u-k', 'dika@test.com');

/* the app's load: the shelf goes down and the van list goes up, in one commit */
const load = (db, branch, agentId, extra = {}) => {
  const b = writeBatch(db);
  b.set(shelf(db, branch, 'p1'), { stock: 470 }, { merge: true });
  b.update(card(db, agentId), { activeCanvas: [{ productId: 'p1', qty: 30 }], ...extra });
  return b.commit();
};

console.log('The regional admin loads a van in their own region');
await expect('T4 without the hire/fire switch: loads Dika\'s van (BANDUNG)', load(hendra, 'BANDUNG', 'AGT_K'), true);
await expect('T4: a promo line goes on promoCanvas the same way', updateDoc(card(hendra, 'AGT_K'), { promoCanvas: [{ productId: 'tee', qty: 4 }] }), true);
await expect('T4 WITH the switch: still loads (the first clause)', load(boss4, 'BANDUNG', 'AGT_K'), true);
await expect('T3: loads a van in any region (GARUT)', load(rina, 'GARUT', 'AGT_X'), true);
console.log('...and nothing else');
await expect('T4: cannot load a van in another region (GARUT)', load(hendra, 'GARUT', 'AGT_X'), false);
await expect('T4 of GARUT: cannot load Dika\'s van (BANDUNG)', load(garut4, 'BANDUNG', 'AGT_K'), false);
await expect('T4 without the switch: cannot move a salesman to another region in the same write', load(hendra, 'BANDUNG', 'AGT_K', { location: 'GARUT' }), false);
await expect('T4 without the switch: cannot change his tier', updateDoc(card(hendra, 'AGT_K'), { userRole: 'FLEET_CAPTAIN' }), false);
await expect('T5: cannot load someone else\'s van', updateDoc(card(budi, 'AGT_K'), { activeCanvas: [] }), false);
await expect('T6: still updates his OWN card (a sale takes stock off the van)', updateDoc(card(dika, 'AGT_K'), { activeCanvas: [] }), true);

console.log(`\n${pass} passed, ${fail} failed`);
await testEnv.cleanup();
process.exit(fail ? 1 : 0);
