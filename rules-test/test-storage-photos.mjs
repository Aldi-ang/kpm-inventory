// PHOTOS AS FILES (kpm, 2026-10-27) - storage.rules, the DRAFT fix A needs. His words: "i see then use option A to
// minimize the cost". Every path below is one the app really writes (see the header of storage.rules).
// Run (emulator only, never the live project; @firebase/rules-unit-testing is not in package.json - install it in a
// scratch folder with firebase@11.10.0, copy this file there, pass C:/... paths):
//   npx firebase emulators:exec --only firestore,storage --project demo-kpm-rules "node <scratch>/test-storage-photos.mjs"
// STORAGE_RULES_FILE / FIRESTORE_RULES_FILE override the rule files (an allow-all file must turn this RED).
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

const STORAGE_RULES = readFileSync(process.env.STORAGE_RULES_FILE || 'storage.rules', 'utf8');
const FIRESTORE_RULES = readFileSync(process.env.FIRESTORE_RULES_FILE || 'firestore.rules', 'utf8');
const APP = 'cello-inventory-manager';
let pass = 0, fail = 0;

async function expect(label, promise, shouldSucceed) {
  try {
    await (shouldSucceed ? assertSucceeds(promise) : assertFails(promise));
    console.log(`  PASS: ${label}`); pass++;
  } catch (e) {
    console.log(`  FAIL: ${label}\n        ${String(e.message).replace(/\s+/g, ' ').slice(0, 300)}`); fail++;
  }
}

const env = await initializeTestEnvironment({
  projectId: 'demo-kpm-rules',
  firestore: { rules: FIRESTORE_RULES, host: '127.0.0.1', port: 8080 },
  storage: { rules: STORAGE_RULES, host: '127.0.0.1', port: 9199 },
});
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const dir = (email, data) => setDoc(doc(db, `artifacts/${APP}/employee_directory/${email}`), data);
  await dir('sales@test.com', { bossUid: 'bossA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_S' });
  await dir('captain@test.com', { bossUid: 'bossA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_C' });
  await dir('locked@test.com', { bossUid: 'bossA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_L', locked: true });
  await dir('other@test.com', { bossUid: 'bossB', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_O' });
});

const as = (uid, email) => env.authenticatedContext(uid, { email }).storage();
const boss = as('bossA', 'boss@test.com'), sales = as('salesUid', 'sales@test.com'), captain = as('captainUid', 'captain@test.com');
const locked = as('lockedUid', 'locked@test.com'), other = as('otherUid', 'other@test.com'), stranger = as('strangerUid', 'nobody@test.com');
const anon = env.unauthenticatedContext().storage();
const PIC = 'data:image/jpeg;base64,' + Buffer.from('a shop photo').toString('base64');
const at = (owner, name, folder = 'photos') => `artifacts/${APP}/users/${owner}/${folder}/${name}`;
const put = (st, path, data = PIC) => st.ref(path).putString(data, 'data_url').then(() => 'ok');
const putRaw = (st, path, body, contentType) => st.ref(path).putString(body, 'raw', { contentType }).then(() => 'ok');

console.log('\nOwn folder (sale, bypass, new shop, offline sync, product images)');
await expect('salesman -> his own photos/sale_x.jpg', put(sales, at('salesUid', 'sale_1.jpg')), true);
await expect('salesman -> his own photos/shop_x.jpg', put(sales, at('salesUid', 'shop_1.jpg')), true);
await expect('boss -> his own images/product_x.png', put(boss, at('bossA', 'product_1.png', 'images')), true);
await expect('salesman reads back his own file (getDownloadURL)', sales.ref(at('salesUid', 'sale_1.jpg')).getDownloadURL(), true);

console.log("\nThe boss's folder from an employee's phone (Restock, Stock Opname, avatar)");
await expect('T4 captain -> boss photos/stockopname_x.jpg', put(captain, at('bossA', 'stockopname_1.jpg')), true);
await expect('salesman -> boss photos/avatar_x.jpg', put(sales, at('bossA', 'avatar_1.jpg')), true);
await expect('salesman deletes a replaced avatar in the boss folder', sales.ref(at('bossA', 'avatar_1.jpg')).delete(), true);

console.log('\nRefused');
await expect('not signed in -> any folder', put(anon, at('bossA', 'x.jpg')), false);
await expect('stranger (no employee record) -> bossA folder', put(stranger, at('bossA', 'x.jpg')), false);
await expect('another company\'s salesman -> bossA folder', put(other, at('bossA', 'x.jpg')), false);
await expect('LOCKED login -> bossA folder', put(locked, at('bossA', 'x.jpg')), false);
await expect('salesman -> another salesman\'s own folder', put(sales, at('captainUid', 'x.jpg')), false);
await expect('stranger reads bossA\'s file', stranger.ref(at('bossA', 'stockopname_1.jpg')).getDownloadURL(), false);
await expect('stranger deletes bossA\'s file', stranger.ref(at('bossA', 'stockopname_1.jpg')).delete(), false);
await expect('a file that is not a picture (text/plain)', putRaw(sales, at('salesUid', 'note.txt'), 'hello', 'text/plain'), false);
await expect('a picture over 5 MB', putRaw(sales, at('salesUid', 'huge.jpg'), 'x'.repeat(5 * 1024 * 1024 + 1), 'image/jpeg'), false);
await expect('a folder the app never uses (backups/)', put(boss, at('bossA', 'x.jpg', 'backups')), false);
await expect('outside artifacts/', put(boss, 'elsewhere/x.jpg'), false);

console.log(`\n${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
