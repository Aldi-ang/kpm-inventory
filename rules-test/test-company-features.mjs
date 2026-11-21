// CHANGE 31 - COMPANY FEATURE SWITCHES (Sampling, Hutang = goods owed / IOU, Consignment = Titip).
// Loads firestore.rules from disk and splices Change 31 IN MEMORY when the file does not carry it yet.
// Run (needs the latest emulator - firebase-tools 13/14 ship an older jar where get() of a missing doc fails):
//   npx firebase-tools@latest emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-company-features.mjs"
// What it proves: switches absent = everything ON (KPM changes nothing); a switch OFF refuses only NEW Titip sales,
// NEW goods-owed (IOU) lines on a shop and NEW sample hand-outs, while old Titip stays payable / returnable and old
// IOUs can still be fulfilled; the check is on the data, not on a flag the app could leave out.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const APP_ID = 'cello-inventory-manager';
const rawRules = readFileSync(process.env.RULES_FILE || 'firestore.rules', 'utf8');

export const HELPERS_31 = `    // [CHANGE 31] COMPANY FEATURE SWITCHES (Sampling, Hutang = goods owed / IOU, Consignment = Titip). Stored on
    // settings/permission_matrix as companyFeatures { sampling, hutang, consignment }. ABSENCE MEANS ON: a company that
    // never saved the switches (KPM today) keeps all three. OFF refuses only NEW records; old ones stay payable.
    function companyFeatureOn(bossUid, key) {
      let m = getPermissionMatrixDoc(bossUid);
      let feats = m != null && ('companyFeatures' in m) && (m.companyFeatures is map) ? m.companyFeatures : {};
      return feats.get(key, true) != false;
    }
    // Hutang OFF: a shop's pendingIOUs may only keep or drop lines it already had (fulfilling an old IOU still works).
    // The list test comes FIRST: an edit that leaves the list alone never reads the switch, which keeps the folder
    // update line under Firestore's 1000-step ceiling (rules-test/test-customer-access.mjs, Alex confirms Grosir).
    function iouListOk(bossUid) {
      return resource.data.get('pendingIOUs', []).hasAll(request.resource.data.get('pendingIOUs', [])) ||
        companyFeatureOn(bossUid, 'hutang');
    }
    function iouCreateOk(bossUid) {
      return companyFeatureOn(bossUid, 'hutang') || request.resource.data.get('pendingIOUs', []).size() == 0;
    }
    // Consignment OFF: no new Titip sale. A sale with no type is a SALE (revenueRule.js); Titip is read from paymentType
    // or the older method field, the same two isTitip() reads. CONSIGNMENT_PAYMENT / RETURN are not sales, so old
    // Titip stays payable and returnable.
    function txFeatureOk(bossUid) {
      let d = request.resource.data;
      let titip = d.get('type', 'SALE') == 'SALE' && (d.get('paymentType', '') == 'Titip' || d.get('method', '') == 'Titip');
      return !titip || companyFeatureOn(bossUid, 'consignment');
    }

`;
const ANCHOR_HELPERS = '    function isSalesman(bossUid) {';

export function spliceChange31(src) {
  let out = src.replace(/\r\n/g, '\n');
  if (out.includes('[CHANGE 31]')) return out;   // already in the file
  const swap = (from, to) => {
    if (!out.includes(from)) throw new Error('Change 31 anchor missing: ' + from.slice(0, 90));
    out = out.replace(from, to);
  };
  swap(ANCHOR_HELPERS, HELPERS_31 + ANCHOR_HELPERS);
  swap("grosirCreateOk() && ownerFieldsCreateOk();", "grosirCreateOk() && ownerFieldsCreateOk() && iouCreateOk(bossUid);");
  swap(") && grosirUpdateOk() && ownerFieldsUpdateOk();", ") && grosirUpdateOk() && ownerFieldsUpdateOk() && iouListOk(bossUid);");
  swap("folderEditOk(bossUid) && grosirUpdateOk() && ownerFieldsUpdateOk();", "folderEditOk(bossUid) && grosirUpdateOk() && ownerFieldsUpdateOk() && iouListOk(bossUid);");
  swap(`      match /transactions/{transactionId} {
        allow read: if isSalesman(bossUid);
        allow create: if isSalesman(bossUid);`, `      match /transactions/{transactionId} {
        allow read: if isSalesman(bossUid);
        allow create: if isSalesman(bossUid) && txFeatureOk(bossUid);`);
  swap(`      match /samplings/{sampleId} {
        allow read: if isSalesman(bossUid);
        allow create: if isSalesman(bossUid);`, `      match /samplings/{sampleId} {
        allow read: if isSalesman(bossUid);
        allow create: if isSalesman(bossUid) && companyFeatureOn(bossUid, 'sampling');`);
  return out;
}

if (process.argv[2] === '--print') { process.stdout.write(spliceChange31(rawRules)); process.exit(0); }
const RULES = spliceChange31(rawRules);

let pass = 0, fail = 0;
async function expect(label, promise, shouldSucceed) {
  try { await (shouldSucceed ? assertSucceeds(promise) : assertFails(promise)); console.log(`  PASS: ${label}`); pass++; }
  catch (e) { console.log(`  FAIL: ${label}\n        ${e.message.split('\n')[0]}`); fail++; }
}

const testEnv = await initializeTestEnvironment({ projectId: 'demo-kpm-rules', firestore: { rules: RULES, host: '127.0.0.1', port: 8080 } });
const base = `artifacts/${APP_ID}/users/ownerA`;
const dir = (db, id) => doc(db, `artifacts/${APP_ID}/employee_directory`, id);
const shop = (db, id) => doc(db, `${base}/customers`, id);
const txCol = (db) => collection(db, `${base}/transactions`);
const sampleCol = (db) => collection(db, `${base}/samplings`);
const matrixRef = (db) => doc(db, `${base}/settings`, 'permission_matrix');

const IOU_A = { id: 'iou-a', productId: 'p1', name: 'Cello 16', qty: 2 };
const IOU_B = { id: 'iou-b', productId: 'p2', name: 'Cello 12', qty: 1 };
const SHOP = { name: 'Toko A', region: 'BANDUNG', assignedAgent: 'Unassigned', pendingIOUs: [IOU_A] };

/* the full-size matrix: 40 keys per role, so the expression ceiling is tested with a real-size doc */
const bigMatrix = () => Object.fromEntries(['DEVELOPER', 'COMPANY_OWNER', 'AREA_ADMIN', 'FLEET_CAPTAIN', 'FIELD_OPERATIVE', 'ROOKIE']
  .map((r) => [r, Array.from({ length: 40 }, (_, i) => `key_${i}`)]));

const reset = (matrixDoc = null) => testEnv.clearFirestore().then(() => testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(dir(db, 'ownerA'), { bossUid: 'ownerA', role: 'COMPANY_OWNER', email: 'owner@test.com' });
  await setDoc(dir(db, 't4@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_T4', location: 'BANDUNG' });
  await setDoc(dir(db, 't5@test.com'), { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_T5', location: 'BANDUNG' });
  await setDoc(shop(db, 's1'), SHOP);
  if (matrixDoc) await setDoc(matrixRef(db), matrixDoc);
}));

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const t4 = as('u-t4', 't4@test.com');
const t5 = as('u-t5', 't5@test.com');
const sale = (extra) => ({ date: '2026-11-21', customerName: 'Toko A', items: [], total: 10000, timestamp: serverTimestamp(), agentId: 'AGT_T5', ...extra });

async function allOn(label) {
  await expect(`${label}: Titip sale`, addDoc(txCol(t5), sale({ type: 'SALE', paymentType: 'Titip' })), true);
  await expect(`${label}: Cash sale`, addDoc(txCol(t5), sale({ type: 'SALE', paymentType: 'Cash' })), true);
  await expect(`${label}: sample hand-out`, addDoc(sampleCol(t5), { date: '2026-11-21', items: [] }), true);
  await expect(`${label}: add a new IOU to a shop`, updateDoc(shop(t5, 's1'), { pendingIOUs: [IOU_A, IOU_B] }), true);
  await expect(`${label}: new shop that already owes goods`, setDoc(shop(t5, 's2'), { ...SHOP, pendingIOUs: [IOU_B] }), true);
}

console.log('1. No permission_matrix doc at all: everything stays ON');
await reset();
await allOn('no matrix');

console.log('2. Saved matrix without companyFeatures (KPM today): everything stays ON');
await reset({ matrix: bigMatrix() });
await allOn('matrix, no switches');

console.log('3. Switches saved ON explicitly: everything ON');
await reset({ matrix: bigMatrix(), companyFeatures: { sampling: true, hutang: true, consignment: true } });
await allOn('switches on');

console.log('4. Consignment OFF: no new Titip sale; old Titip stays payable and returnable');
await reset({ matrix: bigMatrix(), companyFeatures: { consignment: false } });
await expect('new Titip sale (paymentType) denied', addDoc(txCol(t5), sale({ type: 'SALE', paymentType: 'Titip' })), false);
await expect('new Titip sale (older method field) denied', addDoc(txCol(t5), sale({ type: 'SALE', method: 'Titip' })), false);
await expect('new Titip sale with no type (= SALE) denied', addDoc(txCol(t5), sale({ paymentType: 'Titip' })), false);
await expect('Cash sale still allowed', addDoc(txCol(t5), sale({ type: 'SALE', paymentType: 'Cash' })), true);
await expect('QRIS sale still allowed', addDoc(txCol(t5), sale({ type: 'SALE', paymentType: 'QRIS' })), true);
await expect('paying old Titip (CONSIGNMENT_PAYMENT) allowed', addDoc(txCol(t5), sale({ type: 'CONSIGNMENT_PAYMENT', paymentType: 'Cash', total: 5000 })), true);
await expect('returning old Titip goods (RETURN) allowed', addDoc(txCol(t5), sale({ type: 'RETURN', total: -5000 })), true);
await expect('sampling unaffected', addDoc(sampleCol(t5), { date: '2026-11-21', items: [] }), true);
await expect('IOU unaffected', updateDoc(shop(t5, 's1'), { pendingIOUs: [IOU_A, IOU_B] }), true);

console.log('5. Hutang (goods owed / IOU) OFF: no new IOU line; old ones can still be fulfilled');
await reset({ matrix: bigMatrix(), companyFeatures: { hutang: false } });
await expect('adding a new IOU denied', updateDoc(shop(t5, 's1'), { pendingIOUs: [IOU_A, IOU_B] }), false);
await expect('swap: fulfil the old IOU and add a new one in one write denied', updateDoc(shop(t5, 's1'), { pendingIOUs: [IOU_B] }), false);
await expect('fulfilling the old IOU (list shrinks) allowed', updateDoc(shop(t5, 's1'), { pendingIOUs: [] }), true);
await reset({ matrix: bigMatrix(), companyFeatures: { hutang: false } });
await expect('a visit that leaves pendingIOUs as it was allowed', updateDoc(shop(t5, 's1'), { lastVisit: '2026-11-21' }), true);
await expect('new shop that owes goods denied', setDoc(shop(t5, 's2'), { ...SHOP, pendingIOUs: [IOU_B] }), false);
await expect('new shop with an empty IOU list allowed', setDoc(shop(t5, 's3'), { ...SHOP, pendingIOUs: [] }), true);
await expect('new shop with no IOU field allowed', setDoc(shop(t5, 's4'), { name: 'Toko D', region: 'BANDUNG', assignedAgent: 'Unassigned' }), true);
await expect('Titip sale unaffected', addDoc(txCol(t5), sale({ type: 'SALE', paymentType: 'Titip' })), true);
await expect('T4 adding a new IOU denied too', updateDoc(shop(t4, 's1'), { pendingIOUs: [IOU_A, IOU_B] }), false);

console.log('6. Sampling OFF: no new sample hand-out');
await reset({ matrix: bigMatrix(), companyFeatures: { sampling: false } });
await expect('new sample hand-out denied', addDoc(sampleCol(t5), { date: '2026-11-21', items: [] }), false);
await expect('Titip sale unaffected', addDoc(txCol(t5), sale({ type: 'SALE', paymentType: 'Titip' })), true);

console.log('7. All three OFF with the full-size matrix: refusals hold, ordinary work still fits under the expression ceiling');
await reset({ matrix: bigMatrix(), companyFeatures: { sampling: false, hutang: false, consignment: false } });
await expect('Cash sale allowed', addDoc(txCol(t5), sale({ type: 'SALE', paymentType: 'Cash' })), true);
await expect('shop visit allowed', updateDoc(shop(t5, 's1'), { lastVisit: '2026-11-21' }), true);
await expect('fulfil old IOU allowed', updateDoc(shop(t4, 's1'), { pendingIOUs: [] }), true);
await expect('Titip sale denied', addDoc(txCol(t5), sale({ type: 'SALE', paymentType: 'Titip' })), false);
await expect('sample denied', addDoc(sampleCol(t5), { date: '2026-11-21', items: [] }), false);

console.log('8. A switch stored as something other than false (a typo) does not switch the feature off');
await reset({ matrix: bigMatrix(), companyFeatures: { consignment: 'off' } });
await expect('companyFeatures.consignment = "off" keeps Titip ON', addDoc(txCol(t5), sale({ type: 'SALE', paymentType: 'Titip' })), true);

await testEnv.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
