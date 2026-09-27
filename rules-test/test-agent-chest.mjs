// The Agent Inventory chest's ONE write, against the real firestore.rules (kpm 4f44e3d, 2026-09-27).
// AgentInventoryView saveLayout: updateDoc(artifacts/{appId}/users/{bossUid}/motorists/{trueAgentId}, { vanLayout }).
// The chest only ever writes the viewer's OWN van, so the question is: does the server say yes to each tier that sees the
// chest (T1-T4) writing its own vanLayout - and no to the cases the chest must report as "tidak tersimpan".
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-agent-chest.mjs"
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

const RULES = readFileSync('firestore.rules', 'utf8');
const APP_ID = 'cello-inventory-manager';
const BOSS = 'ownerA';
let pass = 0, fail = 0;

async function expect(label, promise, shouldSucceed) {
  try {
    await (shouldSucceed ? assertSucceeds(promise) : assertFails(promise));
    console.log(`  PASS: ${label}`); pass++;
  } catch (e) {
    console.log(`  FAIL: ${label}\n        ${e.message.split('\n')[0]}`); fail++;
  }
}

const PEOPLE = [
  // email, role, agentId (the van his profile names), location
  ['owner2@test.com', 'COMPANY_OWNER', 'vanCO', 'North'],
  ['area@test.com', 'AREA_ADMIN', 'vanAA', 'North'],
  ['captain@test.com', 'FLEET_CAPTAIN', 'vanFC', 'North'],
  ['noagent@test.com', 'FLEET_CAPTAIN', null, 'North'],          // a regional admin whose profile names no van
];
const VANS = ['vanCO', 'vanAA', 'vanFC', 'vanOther'];

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-kpm-rules',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (const [email, userRole, agentId, location] of PEOPLE) {
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, email),
      { bossUid: BOSS, userRole, location, ...(agentId ? { agentId } : {}) });
  }
  for (const id of VANS) {
    await setDoc(doc(db, `artifacts/${APP_ID}/users/${BOSS}/motorists`, id),
      { name: id, location: 'North', activeCanvas: [{ productId: 'p1', qty: 1, unit: 'Bks' }] });
  }
});

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const van = (db, id) => doc(db, `artifacts/${APP_ID}/users/${BOSS}/motorists`, id);
const LAYOUT = { vanLayout: [null, 'p1', null, null, null, null] };

console.log('The chest writes its own van - the tiers that see it:');
await expect('T1 the vault owner (auth uid = bossUid) writes a van layout -> ALLOWED', updateDoc(van(as(BOSS, 'boss@test.com'), 'vanOther'), LAYOUT), true);
await expect('T2 COMPANY_OWNER writes his OWN van layout -> ALLOWED', updateDoc(van(as('u-co', 'owner2@test.com'), 'vanCO'), LAYOUT), true);
await expect('T3 AREA_ADMIN writes his OWN van layout -> ALLOWED', updateDoc(van(as('u-aa', 'area@test.com'), 'vanAA'), LAYOUT), true);
await expect('T4 FLEET_CAPTAIN (no canEditRoster) writes his OWN van layout -> ALLOWED', updateDoc(van(as('u-fc', 'captain@test.com'), 'vanFC'), LAYOUT), true);

console.log('What the chest must report as "Susunan tidak tersimpan":');
await expect('T4 writes ANOTHER van (the chest never does) -> DENIED', updateDoc(van(as('u-fc', 'captain@test.com'), 'vanOther'), LAYOUT), false);
await expect('T4 whose profile names NO van writes the van the screen found by email -> DENIED', updateDoc(van(as('u-na', 'noagent@test.com'), 'vanFC'), LAYOUT), false);

await testEnv.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
