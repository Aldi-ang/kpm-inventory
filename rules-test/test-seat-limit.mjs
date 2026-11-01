// THE SEAT LIMIT (kpm, 2026-11-01) - firestore.rules [CHANGE 20]. His words: "even when the company pays for 10 people
// they are freely be able to just add another one inside the fleet and roster without paying me". Every login (the T2
// owner too) holds a numbered seat doc seats/<bossUid>_<n>; the licence licenses/<bossUid> { seats } is his alone.
// Fleet & Roster's add / email move / remove are replayed as the same batches FleetCanvasManager.jsx writes.
// Run (emulator only, never the live project):
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-seat-limit.mjs"
// RED run: the rules before CHANGE 20 (`git show af78fc6:firestore.rules.deployed-baseline`) fail 11 lines.
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';

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

const DIR = [
  ['ownerA', { bossUid: 'ownerA', role: 'COMPANY_OWNER', email: 'owner-a@test.com' }],          // the migrated owner (uid-keyed)
  ['t2@test.com', { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_T2' }],
  ['t5@test.com', { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_T5' }],      // a pre-licence login with no seat
  ['rina@test.com', { bossUid: 'ownerA', userRole: 'AREA_ADMIN', agentId: 'AGT_R', canEditRoster: true, location: 'Bandung' }],
  ['t2x@test.com', { bossUid: 'ownerB', userRole: 'COMPANY_OWNER', agentId: 'AGT_X' }],
];
const SEATS = [['ownerA_1', 'ownerA'], ['ownerA_2', 't2@test.com']];

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-kpm-rules',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (const [id, data] of DIR) await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, id), data);
  for (const [id, login] of SEATS) await setDoc(doc(db, `artifacts/${APP_ID}/seats`, id), { bossUid: 'ownerA', n: Number(id.split('_')[1]), login });
  await setDoc(doc(db, `artifacts/${APP_ID}/licenses`, 'ownerA'), { seats: 3 });
  await setDoc(doc(db, `artifacts/${APP_ID}/licenses`, 'ownerD'), { seats: 5 });
});

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const dir = (db, id) => doc(db, `artifacts/${APP_ID}/employee_directory`, id);
const seat = (db, boss, n) => doc(db, `artifacts/${APP_ID}/seats`, `${boss}_${n}`);
const licence = (db, boss) => doc(db, `artifacts/${APP_ID}/licenses`, boss);
const card = (db, boss, id) => doc(db, `artifacts/${APP_ID}/users/${boss}/motorists`, id);

const t2 = as('u-t2', 't2@test.com'), t5 = as('u-t5', 't5@test.com'), rina = as('u-r', 'rina@test.com');
const t2x = as('u-x', 't2x@test.com'), ownerD = as('ownerD', 'owner-d@test.com');
const landlord = as('u-aldi', 'adikaryasukses99@gmail.com');

// Fleet & Roster's add-a-person batch: the roster card, the login record (with its seat), the seat doc.
function addPerson(db, boss, email, { n, writeSeat = true, seatId, location = 'Headquarters' } = {}) {
  const b = writeBatch(db), id = `AGT_${email.split('@')[0]}`;
  b.set(card(db, boss, id), { id, name: email, email, userRole: 'AGENT', location });
  b.set(dir(db, email), { bossUid: boss, agentId: id, role: 'Sales', userRole: 'AGENT', status: 'Active', location, ...(n ? { seat: n } : {}) });
  if (n && writeSeat) b.set(seatId ? doc(db, `artifacts/${APP_ID}/seats`, seatId) : seat(db, boss, n), { bossUid: boss, n, login: email });
  return b.commit();
}

console.log('No licence = no limit (every company today):');
await expect("company B (no licence): its T2 adds a person with no seat -> ALLOWED", addPerson(t2x, 'ownerB', 'dodi@test.com'), true);

console.log('Company A: licence 3, seats 1 (owner) + 2 (T2) taken:');
await expect('a T2 adds a person with NO seat -> DENIED', addPerson(t2, 'ownerA', 'ana@test.com'), false);
await expect('a T2 adds a person on seat 4, above the licence -> DENIED', addPerson(t2, 'ownerA', 'ana@test.com', { n: 4 }), false);
await expect("a T2 adds a person on seat 2 (the T2's own, re-written) -> DENIED", addPerson(t2, 'ownerA', 'ana@test.com', { n: 2 }), false);
await expect('a T2 adds a person naming seat 2 without writing it -> DENIED', addPerson(t2, 'ownerA', 'ana@test.com', { n: 2, writeSeat: false }), false);
await expect('a T2 writes seat 3 into a doc named seat 9 -> DENIED', addPerson(t2, 'ownerA', 'ana@test.com', { n: 3, seatId: 'ownerA_9' }), false);
await expect('a T2 adds Budi on free seat 3 -> ALLOWED (3 of 3)', addPerson(t2, 'ownerA', 'budi@test.com', { n: 3 }), true);
await expect('a T2 adds Ana on seat 3, now taken -> DENIED', addPerson(t2, 'ownerA', 'ana@test.com', { n: 3 }), false);
await expect('a T2 points the pre-licence login (no seat) at seat 3 -> DENIED',
  (() => { const b = writeBatch(t2); b.set(seat(t2, 'ownerA', 3), { bossUid: 'ownerA', n: 3, login: 't5@test.com' }); b.update(dir(t2, 't5@test.com'), { seat: 3 }); return b.commit(); })(), false);

console.log('The licence is his alone:');
await expect('a T2 raises his own licence to 99 -> DENIED', setDoc(licence(t2, 'ownerA'), { seats: 99 }), false);
await expect('a T2 deletes his own licence -> DENIED', deleteDoc(licence(t2, 'ownerA')), false);
await expect('a T5 of company A reads its licence -> ALLOWED', getDoc(licence(t5, 'ownerA')), true);
await expect("company B's T2 reads company A's licence -> DENIED", getDoc(licence(t2x, 'ownerA')), false);
await expect('the landlord sets company B a licence -> ALLOWED', setDoc(licence(landlord, 'ownerB'), { seats: 25 }), true);

console.log("Reading a company's seats (Fleet's 'N of M seats used'):");
const seatsOf = (db, boss) => getDocs(query(collection(db, `artifacts/${APP_ID}/seats`), where('bossUid', '==', boss)));
await expect("a T2 lists company A's seats -> ALLOWED", seatsOf(t2, 'ownerA'), true);
await expect("a T5 lists company A's seats -> DENIED", seatsOf(t5, 'ownerA'), false);
await expect("company B's T2 lists company A's seats -> DENIED", seatsOf(t2x, 'ownerA'), false);

console.log('A locked login keeps its seat:');
await expect('a T2 locks Budi -> ALLOWED', updateDoc(dir(t2, 'budi@test.com'), { locked: true }), true);
await expect("a T2 deletes locked Budi's seat while his login exists -> DENIED", deleteDoc(seat(t2, 'ownerA', 3)), false);
await expect("company B's T2 deletes company A's seat 3 -> DENIED", deleteDoc(seat(t2x, 'ownerA', 3)), false);

console.log('An email change moves the same seat:');
const move = (db, keepOld) => {
  const b = writeBatch(db);
  b.set(dir(db, 'budi.new@test.com'), { bossUid: 'ownerA', agentId: 'AGT_budi', role: 'Sales', userRole: 'AGENT', status: 'Active', location: 'Headquarters', seat: 3 }, { merge: true });
  if (!keepOld) b.delete(dir(db, 'budi@test.com'));
  b.update(seat(db, 'ownerA', 3), { login: 'budi.new@test.com' });
  return b.commit();
};
await expect('a T2 moves seat 3 to a new Gmail but KEEPS the old login -> DENIED (two people, one seat)', move(t2, true), false);
await expect('a T2 moves Budi to a new Gmail (old login deleted, seat 3 follows) -> ALLOWED', move(t2, false), true);

console.log('Only removing the person frees the seat:');
await expect('a T2 removes Budi (login + seat deleted together) -> ALLOWED',
  (() => { const b = writeBatch(t2); b.delete(card(t2, 'ownerA', 'AGT_budi')); b.delete(dir(t2, 'budi.new@test.com')); b.delete(seat(t2, 'ownerA', 3)); return b.commit(); })(), true);
await expect('a T3 with roster rights adds Cici on the freed seat 3 -> ALLOWED', addPerson(rina, 'ownerA', 'cici@test.com', { n: 3, location: 'Bandung' }), true);

console.log('The owner signs in for the first time under a licence (App.jsx account migration):');
await expect("owner D creates his own uid-keyed record with no seat -> ALLOWED", setDoc(dir(ownerD, 'ownerD'), { bossUid: 'ownerD', role: 'COMPANY_OWNER', email: 'owner-d@test.com' }), true);
await expect('owner D adds a person with no seat -> DENIED (the exemption is his own record only)', addPerson(ownerD, 'ownerD', 'eka@test.com'), false);
await expect('owner D adds a person on seat 1 -> ALLOWED', addPerson(ownerD, 'ownerD', 'eka@test.com', { n: 1 }), true);

await testEnv.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
