// THE WAREHOUSE REGISTRY IS READ BY EVERY DESK (kpm, 2026-11-09, rules CHANGE 25). The demo walk found a T3 refused
// on Restock Vault: `places` (gudang names + addresses) was covered only by the owner/T1/T2 catch-all, so the branch
// desk's delivery address came back empty for T3 and T4. Every login of the company may READ it; only T1/T2 write it.
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-places-read.mjs"
// RULES_FILE=firestore.rules.deployed-baseline shows the refusal on the published rules.
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection } from 'firebase/firestore';

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
  projectId: 'demo-kpm-rules-places',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
const dir = (db, id) => doc(db, `artifacts/${APP_ID}/employee_directory`, id);
const places = (db, boss = 'ownerA') => collection(db, `artifacts/${APP_ID}/users/${boss}/places`);
const place = (db, id, boss = 'ownerA') => doc(db, `artifacts/${APP_ID}/users/${boss}/places`, id);

await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(dir(db, 'rina@test.com'), { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_R' });
  await setDoc(dir(db, 'tono@test.com'), { bossUid: 'ownerA', userRole: 'AREA_ADMIN', agentId: 'AGT_T' });
  await setDoc(dir(db, 'dewi@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_D', location: 'BANDUNG' });
  await setDoc(dir(db, 'budi@test.com'), { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_B' });
  await setDoc(dir(db, 'dika@test.com'), { bossUid: 'ownerA', userRole: 'ROOKIE', agentId: 'AGT_K' });
  await setDoc(dir(db, 'lost@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_L', locked: true });
  await setDoc(dir(db, 'other@test.com'), { bossUid: 'ownerB', userRole: 'AREA_ADMIN', agentId: 'AGT_O' });
  await setDoc(place(db, 'bandung'), { name: 'Gudang Bandung', address: 'Jl. Soekarno-Hatta' });
});

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const owner = as('ownerA', 'owner@test.com'), rina = as('u-r', 'rina@test.com'), tono = as('u-t', 'tono@test.com'),
  dewi = as('u-d', 'dewi@test.com'), budi = as('u-b', 'budi@test.com'), dika = as('u-k', 'dika@test.com'),
  lost = as('u-l', 'lost@test.com'), other = as('u-o', 'other@test.com'), anon = testEnv.unauthenticatedContext().firestore();

console.log('Every login of the company reads the registry (one place and the whole list)');
for (const [who, db] of [['owner', owner], ['T2', rina], ['T3 AREA_ADMIN', tono], ['T4 FLEET_CAPTAIN', dewi], ['T5', budi], ['T6', dika]]) {
  await expect(`${who}: reads one warehouse`, getDoc(place(db, 'bandung')), true);
  await expect(`${who}: lists the warehouses`, getDocs(places(db)), true);
}
console.log('Nobody else does');
await expect('a LOCKED login cannot read it', getDocs(places(lost)), false);
await expect('another company\'s admin cannot read it', getDocs(places(other)), false);
await expect('signed out cannot read it', getDocs(places(anon)), false);
console.log('Writing stays with T1/T2');
await expect('owner: adds a warehouse', setDoc(place(owner, 'garut'), { name: 'Gudang Garut' }), true);
await expect('T2: edits one', setDoc(place(rina, 'garut'), { name: 'Gudang Garut', address: 'Jl. Ahmad Yani' }), true);
await expect('T3: cannot add one', setDoc(place(tono, 'cimahi'), { name: 'X' }), false);
await expect('T4: cannot change one', setDoc(place(dewi, 'bandung'), { name: 'X' }), false);
await expect('T5: cannot delete one', deleteDoc(place(budi, 'bandung')), false);

console.log(`\n${pass} passed, ${fail} failed`);
await testEnv.cleanup();
process.exit(fail ? 1 : 0);
