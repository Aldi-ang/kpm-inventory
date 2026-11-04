// THE WEEKLY STOCK COUNT (kpm, 2026-11-04). His words: "there is only 1 submission needed each regional warehouse ... lets take
// the stock opname submission each week as a group homework and the the team leader is the one who submit it, which is the T4".
// The app's write needs no rule change, and this proves it: a T4 submits the count and marks the week on their own roster card
// in ONE batch (StockOpnameView.jsx handleCommit); every T4 can read that mark on the roster, while pending_audits stays closed
// to them; the owner sends a count back on one batch too (handleRejectAudit).
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-opname-week.mjs"
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, writeBatch, collection } from 'firebase/firestore';

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
  projectId: 'demo-kpm-rules',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
const dir = (db, id) => doc(db, `artifacts/${APP_ID}/employee_directory`, id);
const card = (db, id) => doc(db, `artifacts/${APP_ID}/users/ownerA/motorists`, id);
const audit = (db, id) => doc(db, `artifacts/${APP_ID}/users/ownerA/pending_audits`, id);
const general = (db) => doc(db, `artifacts/${APP_ID}/users/ownerA/settings`, 'general');
const week = { warehouse: 'BANDUNG', by: 'Dewi', auditId: 'AUDIT_1', at: '2026-11-04T02:00:00.000Z' };

await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(dir(db, 'ownerA'), { bossUid: 'ownerA', role: 'COMPANY_OWNER', email: 'owner@test.com' });
  await setDoc(dir(db, 'dewi@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_D', location: 'BANDUNG' });
  await setDoc(dir(db, 'budi@test.com'), { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_B', location: 'BANDUNG' });
  await setDoc(dir(db, 'rina@test.com'), { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_R', location: 'HEADQUARTERS' });
  await setDoc(dir(db, 'tono@test.com'), { bossUid: 'ownerA', userRole: 'AREA_ADMIN', agentId: 'AGT_T', location: 'HEADQUARTERS' });
  await setDoc(general(db), { companyName: 'KPM' });
  await setDoc(card(db, 'AGT_D'), { id: 'AGT_D', name: 'Dewi', userRole: 'FLEET_CAPTAIN', location: 'BANDUNG' });
  await setDoc(card(db, 'AGT_B'), { id: 'AGT_B', name: 'Budi', userRole: 'FIELD_OPERATIVE', location: 'BANDUNG' });
});

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const dewi = as('u-d', 'dewi@test.com'), owner = as('ownerA', 'owner@test.com'), tono = as('u-t', 'tono@test.com'), rina = as('u-r', 'rina@test.com');

const submit = (db, auditId, cardId) => {
  const b = writeBatch(db);
  b.set(audit(db, auditId), { auditType: 'BRANCH_WAREHOUSE', branchLocation: 'BANDUNG', status: 'PENDING_HQ_APPROVAL', agentId: 'AGT_D', items: [] });
  b.update(card(db, cardId), { lastOpname: week });
  return b.commit();
};

console.log('The T4 submits');
await expect('T4: the count and the week mark on their own card land in one batch', submit(dewi, 'AUDIT_1', 'AGT_D'), true);
await expect('T4: another person\'s card cannot carry their mark, and the whole batch fails', submit(dewi, 'AUDIT_2', 'AGT_B'), false);

console.log('Why the mark is on the roster');
await expect('T4: reads the mark on the roster', getDoc(card(dewi, 'AGT_D')), true);
await expect('T4: reads the whole roster the Stock Opname screen gets', getDocs(collection(dewi, `artifacts/${APP_ID}/users/ownerA/motorists`)), true);
await expect('T4: pending_audits stays closed', getDoc(audit(dewi, 'AUDIT_1')), false);

console.log('The owner sends it back');
const back = owner => { const b = writeBatch(owner);
  b.update(audit(owner, 'AUDIT_1'), { status: 'REJECTED', rejectReason: 'Recount' });
  b.update(card(owner, 'AGT_D'), { lastOpname: { ...week, rejected: true, reason: 'Recount' } });
  return b.commit(); };
await expect('owner: the rejection and the reopened week land in one batch', back(owner), true);
await expect('T4: cannot approve or change a count', updateDoc(audit(dewi, 'AUDIT_1'), { status: 'APPROVED' }), false);

console.log('The Stock Opname day: T3 and above');
await expect('T3: picks a day', setDoc(general(tono), { opnameDay: 5 }, { merge: true }), true);
await expect('T3: clears the day', setDoc(general(tono), { opnameDay: null }, { merge: true }), true);
await expect('T3: a number that is no day is refused', setDoc(general(tono), { opnameDay: 9 }, { merge: true }), false);
await expect('T3: any other field on the doc is refused', setDoc(general(tono), { opnameDay: 5, companyName: 'X' }, { merge: true }), false);
await expect('T2: picks a day', setDoc(general(rina), { opnameDay: 2 }, { merge: true }), true);
await expect('owner: picks a day', setDoc(general(owner), { opnameDay: 5 }, { merge: true }), true);
await expect('T4: cannot pick a day', setDoc(general(dewi), { opnameDay: 1 }, { merge: true }), false);
await expect('T4: reads the day', getDoc(general(dewi)), true);

console.log(`\n${pass} passed, ${fail} failed`);
await testEnv.cleanup();
process.exit(fail ? 1 : 0);
