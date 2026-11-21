// CHANGE 30 (DRAFT) - Competitors global catalog, region-isolated prices, field-report approval queue.
// Loads firestore.rules from disk and splices the Change 30 draft IN MEMORY (never edits firestore.rules on disk).
// Draft = Antigravity Task 105 + 2 Claude tightenings: a report create may only carry report fields (no review
// fields, no priceAction), and an approval may only touch the review fields (never price, region or reporter).
// Run: npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-competitors.mjs"
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const rawRules = readFileSync(process.env.RULES_FILE || 'firestore.rules', 'utf8');

export const HELPERS_30 = `    // [CHANGE 30] COMPETITORS GLOBAL CATALOG, REGION PRICES & FIELD REPORTS.
    // Firestore stops a request after 1000 evaluated expressions, so the profile and the matrix are read ONCE per
    // rule (compCan) instead of once per small helper - the first draft hit that ceiling on T3/T4 writes.
    function compRoleOf(bossUid) {
      let p = getEmployeeProfile();
      return isAuthenticated() && p != null && p.bossUid == bossUid ? p.get('userRole', 'NONE') : 'NONE';
    }
    function compSaved(bossUid) {
      let m = getPermissionMatrixDoc(bossUid);
      return m != null && ('matrix' in m) ? m.matrix : {};
    }
    // ABSENCE-MEANS-TIER-DEFAULT: a key no role holds is "unknown" and the tier default applies.
    function compHas(saved, role, key, defaultRoles) {
      let known = key in saved.get('DEVELOPER', []) || key in saved.get('COMPANY_OWNER', []) || key in saved.get('AREA_ADMIN', []) ||
        key in saved.get('FLEET_CAPTAIN', []) || key in saved.get('FIELD_OPERATIVE', []) || key in saved.get('ROOKIE', []);
      return known ? key in saved.get(role, []) : role in defaultRoles;
    }
    function compTop(bossUid, role) {
      return isVaultOwner(bossUid) || role == 'COMPANY_OWNER' || role == 'ADMIN';
    }
    function compOwnRegion(bossUid, regionKey) {
      let p = getEmployeeProfile();
      let raw = isAuthenticated() && p != null && p.bossUid == bossUid ? p.get('location', '') : '';
      let loc = raw is string ? raw.lower().trim() : '';
      let rk = regionKey is string ? regionKey.lower().trim() : '';
      return loc != '' && rk != '' && loc == rk;
    }
    // needManage=true: may change competitor data. Region rule: own region, or the all-regions right.
    function compCan(bossUid, regionKey, needManage) {
      let role = compRoleOf(bossUid);
      let saved = compSaved(bossUid);
      let top = compTop(bossUid, role);
      return (top || !needManage || compHas(saved, role, 'manage_competitors', ['AREA_ADMIN', 'FLEET_CAPTAIN'])) &&
        (top || compOwnRegion(bossUid, regionKey) || compHas(saved, role, 'see_all_competitor_regions', ['AREA_ADMIN']));
    }
    function compManage(bossUid) {
      let role = compRoleOf(bossUid);
      return compTop(bossUid, role) || compHas(compSaved(bossUid), role, 'manage_competitors', ['AREA_ADMIN', 'FLEET_CAPTAIN']);
    }
    function compReporter(bossUid) {
      let role = compRoleOf(bossUid);
      return role != 'NONE' && compHas(compSaved(bossUid), role, 'report_competitor_price', ['DEVELOPER', 'COMPANY_OWNER', 'AREA_ADMIN', 'FLEET_CAPTAIN', 'FIELD_OPERATIVE', 'ROOKIE']);
    }

`;

export const MATCH_30 = `      // [CHANGE 30] Competitors global catalog, region-isolated prices, and approval queue.
      match /competitors/{rivalId} {
        allow read: if isSalesman(bossUid);
        allow create, update: if compManage(bossUid) &&
          request.resource.data.keys().hasOnly(['name', 'brand', 'normName', 'categoryId', 'subCategoryId', 'pairedProductId', 'createdAt', 'updatedAt', 'updatedBy', 'updatedByUid']) &&
          request.resource.data.name is string && request.resource.data.name.size() > 0;
        // Deleting a whole rival (every region) needs all-region authority, so a T4 cannot erase prices he cannot see.
        allow delete: if compCan(bossUid, '', true);

        match /region_prices/{regionKey} {
          allow read: if compCan(bossUid, regionKey, false);
          allow create, update: if compCan(bossUid, regionKey, true) &&
            request.resource.data.keys().hasOnly(['region', 'Retail', 'Grosir', 'Ecer', 'updatedAt', 'updatedBy', 'updatedByUid', 'sourceReportId']) &&
            request.resource.data.region is string && request.resource.data.region.lower().trim() == regionKey.lower().trim();
          allow delete: if compCan(bossUid, regionKey, true);
        }
      }
      match /competitor_reports/{reportId} {
        allow read: if (isSalesman(bossUid) && resource.data.get('reportedByUid', '') == request.auth.uid) ||
          compCan(bossUid, resource.data.get('region', ''), false);
        allow create: if compReporter(bossUid) &&
          request.resource.data.keys().hasOnly(['rivalId', 'newRivalName', 'categoryId', 'subCategoryId', 'newCategoryName', 'newSubCategoryName',
            'region', 'shopId', 'shopName', 'customerType', 'price', 'shelf', 'promo', 'speed', 'note', 'photo', 'status',
            'reportedByUid', 'reportedByName', 'createdAt']) &&
          request.resource.data.get('status', '') == 'pending' &&
          request.resource.data.get('reportedByUid', '') == request.auth.uid &&
          request.resource.data.price is number && request.resource.data.price > 0 &&
          request.resource.data.customerType in ['Retail', 'Grosir', 'Ecer'] &&
          request.resource.data.region is string && request.resource.data.region.size() > 0;
        allow update: if resource.data.get('status', '') == 'pending' &&
          request.resource.data.status in ['approved_price', 'approved_note', 'rejected'] &&
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'priceAction', 'rejectReason', 'reviewedBy', 'reviewedByUid', 'reviewedAt']) &&
          compCan(bossUid, resource.data.get('region', ''), true);
        allow delete: if isCompanyTopTier(bossUid);
      }
`;

export const ANCHOR_HELPERS = '    function isSalesman(bossUid) {';
export const ANCHOR_MATCH = '      // [CHANGE 24 — DRAFT] the Sell Again holder writes its own line';

export function spliceChange30(src) {
  let out = src.replace(/\r\n/g, '\n');
  if (out.includes('[CHANGE 30]')) return out; // already applied on disk
  if (!out.includes(ANCHOR_HELPERS)) throw new Error('Anchor helpers missing');
  if (!out.includes(ANCHOR_MATCH)) throw new Error('Anchor match missing');
  out = out.replace(ANCHOR_HELPERS, HELPERS_30 + ANCHOR_HELPERS);
  out = out.replace(ANCHOR_MATCH, MATCH_30 + ANCHOR_MATCH);
  return out;
}

if (process.argv[2] === '--print') { process.stdout.write(spliceChange30(rawRules)); process.exit(0); }

const RULES = spliceChange30(rawRules);
const APP_ID = 'cello-inventory-manager';
let pass = 0, fail = 0;
async function expect(label, promise, shouldSucceed) {
  try { await (shouldSucceed ? assertSucceeds(promise) : assertFails(promise)); console.log(`  PASS: ${label}`); pass++; }
  catch (e) { console.log(`  FAIL: ${label}\n        ${e.message.split('\n')[0]}`); fail++; }
}

const testEnv = await initializeTestEnvironment({ projectId: 'demo-kpm-rules', firestore: { rules: RULES, host: '127.0.0.1', port: 8080 } });
const base = `artifacts/${APP_ID}/users/ownerA`;
const dir = (db, id) => doc(db, `artifacts/${APP_ID}/employee_directory`, id);
const rival = (db, id) => doc(db, `${base}/competitors`, id);
const price = (db, rid, reg) => doc(db, `${base}/competitors/${rid}/region_prices`, reg);
const priceCol = (db, rid) => collection(db, `${base}/competitors/${rid}/region_prices`);
const report = (db, id) => doc(db, `${base}/competitor_reports`, id);
const reportCol = (db) => collection(db, `${base}/competitor_reports`);
const matrix = (db) => doc(db, `${base}/settings`, 'permission_matrix');

const RIVAL = { name: 'Rival Mild 16', brand: 'Rival', normName: 'rivalmild16', categoryId: 'mild', subCategoryId: 'mild-16', pairedProductId: null, updatedBy: 'seed' };
const PRICE = (region) => ({ region, Retail: 24000, Grosir: 23000, Ecer: 25000, updatedBy: 'seed', updatedByUid: 'seed', sourceReportId: null });
const REPORT = (region, uid) => ({ rivalId: 'r1', region, shopId: 's1', shopName: 'Toko A', customerType: 'Retail', price: 23500,
  shelf: 'Eye level', promo: 'None', speed: 'Fast', note: '', photo: false, status: 'pending', reportedByUid: uid, reportedByName: 'Seed', createdAt: serverTimestamp() });

const reset = ({ savedMatrix = null } = {}) => testEnv.clearFirestore().then(() => testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(dir(db, 'ownerA'), { bossUid: 'ownerA', role: 'COMPANY_OWNER', email: 'owner@test.com' });
  await setDoc(dir(db, 't2@test.com'), { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_T2', location: 'HEADQUARTERS' });
  await setDoc(dir(db, 't3@test.com'), { bossUid: 'ownerA', userRole: 'AREA_ADMIN', agentId: 'AGT_T3', location: 'HEADQUARTERS' });
  await setDoc(dir(db, 't4@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_T4', location: 'BANDUNG' });
  await setDoc(dir(db, 't5@test.com'), { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_T5', location: 'BANDUNG' });
  await setDoc(dir(db, 't6@test.com'), { bossUid: 'ownerA', userRole: 'ROOKIE', agentId: 'AGT_T6', location: 'BANDUNG' });
  await setDoc(dir(db, 'other@test.com'), { bossUid: 'ownerB', userRole: 'AREA_ADMIN', agentId: 'AGT_O', location: 'BANDUNG' });
  await setDoc(rival(db, 'r1'), RIVAL);
  await setDoc(price(db, 'r1', 'BANDUNG'), PRICE('BANDUNG'));
  await setDoc(price(db, 'r1', 'SEMARANG'), PRICE('SEMARANG'));
  await setDoc(report(db, 'rep1'), REPORT('BANDUNG', 'u-t5'));
  await setDoc(report(db, 'rep2'), REPORT('SEMARANG', 'u-x'));
  if (savedMatrix) await setDoc(matrix(db), { matrix: savedMatrix });
}));

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const t2 = as('u-t2', 't2@test.com');
const t3 = as('u-t3', 't3@test.com');
const t4 = as('u-t4', 't4@test.com');
const t5 = as('u-t5', 't5@test.com');
const t6 = as('u-t6', 't6@test.com');
const other = as('u-o', 'other@test.com');
const review = (by) => ({ status: 'approved_price', priceAction: 'update', reviewedBy: by, reviewedByUid: by, reviewedAt: serverTimestamp() });

console.log('1. Rival catalog: every member reads; T2-T4 write; T5/T6 and another company denied');
await reset();
for (const [l, db] of [['T2', t2], ['T3', t3], ['T4', t4], ['T5', t5], ['T6', t6]]) await expect(`${l} reads competitors`, getDocs(collection(db, `${base}/competitors`)), true);
await expect('Other company reads rival denied', getDoc(rival(other, 'r1')), false);
await expect('T4 creates rival', setDoc(rival(t4, 'r2'), { ...RIVAL, name: 'Rival Bold' }), true);
await expect('T5 creates rival denied', setDoc(rival(t5, 'r3'), RIVAL), false);
await expect('T6 creates rival denied', setDoc(rival(t6, 'r3'), RIVAL), false);
await expect('T4 creates rival with a price-per-stick field denied', setDoc(rival(t4, 'r4'), { ...RIVAL, pricePerStick: 1500 }), false);
await expect('T4 creates rival with empty name denied', setDoc(rival(t4, 'r4'), { ...RIVAL, name: '' }), false);
await expect('T4 deletes a whole rival denied (no all-region right)', deleteDoc(rival(t4, 'r1')), false);
await expect('T3 deletes a whole rival', deleteDoc(rival(t3, 'r2')), true);
await expect('Other company writes rival denied', setDoc(rival(other, 'r5'), RIVAL), false);

console.log('2. Region prices: T4-T6 only their own region; T2/T3 every region');
await reset();
await expect('T3 reads SEMARANG price', getDoc(price(t3, 'r1', 'SEMARANG')), true);
await expect('T3 lists every region price', getDocs(priceCol(t3, 'r1')), true);
await expect('T4 reads own BANDUNG price', getDoc(price(t4, 'r1', 'BANDUNG')), true);
await expect('T4 reads SEMARANG price denied', getDoc(price(t4, 'r1', 'SEMARANG')), false);
await expect('T4 lists every region price denied', getDocs(priceCol(t4, 'r1')), false);
await expect('T5 reads own BANDUNG price', getDoc(price(t5, 'r1', 'BANDUNG')), true);
await expect('T6 reads SEMARANG price denied', getDoc(price(t6, 'r1', 'SEMARANG')), false);
await expect('T4 sets own BANDUNG price', setDoc(price(t4, 'r1', 'BANDUNG'), PRICE('BANDUNG')), true);
await expect('T4 sets SEMARANG price denied', setDoc(price(t4, 'r1', 'SEMARANG'), PRICE('SEMARANG')), false);
await expect('T4 writes BANDUNG doc labelled SEMARANG denied', setDoc(price(t4, 'r1', 'BANDUNG'), PRICE('SEMARANG')), false);
await expect('T4 adds an unknown price field denied', setDoc(price(t4, 'r1', 'BANDUNG'), { ...PRICE('BANDUNG'), perStick: 1500 }), false);
await expect('T5 sets own BANDUNG price denied (not a manager)', setDoc(price(t5, 'r1', 'BANDUNG'), PRICE('BANDUNG')), false);
await expect('T3 sets SEMARANG price', setDoc(price(t3, 'r1', 'SEMARANG'), PRICE('SEMARANG')), true);
await expect('Other company (location BANDUNG) reads BANDUNG price denied', getDoc(price(other, 'r1', 'BANDUNG')), false);

console.log('3. Field reports: create');
await reset();
await expect('T5 reports a price (pending, own uid)', setDoc(report(t5, 'n1'), REPORT('BANDUNG', 'u-t5')), true);
await expect('T6 reports a price', setDoc(report(t6, 'n2'), REPORT('BANDUNG', 'u-t6')), true);
await expect('T5 forges another reporter uid denied', setDoc(report(t5, 'n3'), REPORT('BANDUNG', 'u-t6')), false);
await expect('T5 creates an already-approved report denied', setDoc(report(t5, 'n4'), { ...REPORT('BANDUNG', 'u-t5'), status: 'approved_price' }), false);
await expect('T5 reports price 0 denied', setDoc(report(t5, 'n5'), { ...REPORT('BANDUNG', 'u-t5'), price: 0 }), false);
await expect('T5 reports a wrong customer type denied', setDoc(report(t5, 'n6'), { ...REPORT('BANDUNG', 'u-t5'), customerType: 'VIP' }), false);
await expect('T5 pre-fills reviewer fields denied', setDoc(report(t5, 'n7'), { ...REPORT('BANDUNG', 'u-t5'), reviewedBy: 'u-t5' }), false);
await expect('Other company reports denied', setDoc(report(other, 'n8'), REPORT('BANDUNG', 'u-o')), false);

console.log('4. Field reports: read (single docs and the queries the app will run)');
await reset();
await expect('T3 lists every report', getDocs(reportCol(t3)), true);
await expect('T4 queries own region reports', getDocs(query(reportCol(t4), where('region', '==', 'BANDUNG'))), true);
await expect('T4 lists every report denied', getDocs(reportCol(t4)), false);
await expect('T4 reads SEMARANG report denied', getDoc(report(t4, 'rep2')), false);
await expect('T5 reads own report', getDoc(report(t5, 'rep1')), true);
await expect('T5 queries own reports by uid', getDocs(query(reportCol(t5), where('reportedByUid', '==', 'u-t5'))), true);
await expect('T6 reads SEMARANG report denied', getDoc(report(t6, 'rep2')), false);

console.log('5. Field reports: approve / reject');
await reset();
await expect('T4 approves own region report', updateDoc(report(t4, 'rep1'), review('u-t4')), true);
await expect('T4 re-approves an already-approved report denied', updateDoc(report(t4, 'rep1'), { status: 'approved_note' }), false);
await reset();
await expect('T4 approves SEMARANG report denied', updateDoc(report(t4, 'rep2'), review('u-t4')), false);
await expect('T4 changes the reported price while approving denied', updateDoc(report(t4, 'rep1'), { ...review('u-t4'), price: 1 }), false);
await expect('T4 changes the reporter while approving denied', updateDoc(report(t4, 'rep1'), { ...review('u-t4'), reportedByUid: 'u-t4' }), false);
await expect('T4 sets an unknown status denied', updateDoc(report(t4, 'rep1'), { status: 'done' }), false);
await expect('T5 approves a report denied', updateDoc(report(t5, 'rep1'), review('u-t5')), false);
await expect('T3 rejects SEMARANG report', updateDoc(report(t3, 'rep2'), { status: 'rejected', rejectReason: 'Old price', reviewedBy: 'u-t3', reviewedByUid: 'u-t3', reviewedAt: serverTimestamp() }), true);
await expect('T4 deletes a report denied', deleteDoc(report(t4, 'rep1')), false);
await expect('T2 deletes a report', deleteDoc(report(t2, 'rep1')), true);

console.log('6. Permission matrix overrides (both directions)');
await reset({ savedMatrix: { FLEET_CAPTAIN: ['see_all_competitor_regions', 'manage_competitors'], AREA_ADMIN: ['see_all_competitor_regions', 'manage_competitors'] } });
await expect('T4 granted all regions reads SEMARANG price', getDoc(price(t4, 'r1', 'SEMARANG')), true);
await expect('T4 granted all regions approves SEMARANG report', updateDoc(report(t4, 'rep2'), review('u-t4')), true);
await reset({ savedMatrix: { AREA_ADMIN: ['manage_competitors', 'see_all_competitor_regions'] } });
await expect('T4 with manage_competitors revoked sets BANDUNG price denied', setDoc(price(t4, 'r1', 'BANDUNG'), PRICE('BANDUNG')), false);
await expect('T3 still manages', setDoc(price(t3, 'r1', 'BANDUNG'), PRICE('BANDUNG')), true);
await reset({ savedMatrix: { FIELD_OPERATIVE: ['report_competitor_price'], FLEET_CAPTAIN: ['report_competitor_price'] } });
await expect('T6 with report revoked reports denied', setDoc(report(t6, 'm1'), REPORT('BANDUNG', 'u-t6')), false);
await expect('T5 still reports', setDoc(report(t5, 'm2'), REPORT('BANDUNG', 'u-t5')), true);
await reset({ savedMatrix: { ROOKIE: ['manage_competitors'] } });
await expect('T6 granted manage sets own BANDUNG price', setDoc(price(t6, 'r1', 'BANDUNG'), PRICE('BANDUNG')), true);
await expect('T6 granted manage still cannot set SEMARANG price', setDoc(price(t6, 'r1', 'SEMARANG'), PRICE('SEMARANG')), false);

console.log('7. A full-size saved matrix (40 keys per role) must not hit the 1000-expression ceiling');
const filler = Array.from({ length: 40 }, (_, i) => `feature_${i}`);
const big = (extra) => Object.fromEntries(['DEVELOPER', 'COMPANY_OWNER', 'AREA_ADMIN', 'FLEET_CAPTAIN', 'FIELD_OPERATIVE', 'ROOKIE']
  .map((r) => [r, [...filler, ...(extra[r] || [])]]));
await reset({ savedMatrix: big({ AREA_ADMIN: ['manage_competitors', 'see_all_competitor_regions', 'report_competitor_price'],
  FLEET_CAPTAIN: ['manage_competitors', 'report_competitor_price'], FIELD_OPERATIVE: ['report_competitor_price'], ROOKIE: ['report_competitor_price'] }) });
await expect('Big matrix: T3 sets SEMARANG price', setDoc(price(t3, 'r1', 'SEMARANG'), PRICE('SEMARANG')), true);
await expect('Big matrix: T3 approves SEMARANG report', updateDoc(report(t3, 'rep2'), review('u-t3')), true);
await expect('Big matrix: T4 sets own BANDUNG price', setDoc(price(t4, 'r1', 'BANDUNG'), PRICE('BANDUNG')), true);
await expect('Big matrix: T4 approves own BANDUNG report', updateDoc(report(t4, 'rep1'), review('u-t4')), true);
await expect('Big matrix: T4 sets SEMARANG price denied', setDoc(price(t4, 'r1', 'SEMARANG'), PRICE('SEMARANG')), false);
await expect('Big matrix: T6 reports a price', setDoc(report(t6, 'b1'), REPORT('BANDUNG', 'u-t6')), true);
await expect('Big matrix: T3 deletes a whole rival', deleteDoc(rival(t3, 'r1')), true);

await testEnv.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
