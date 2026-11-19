// CHANGE 29 (Step 0 DRAFT) - Shared Product Categories (Master Vault + Competitors) + Sell Again categoryId/subCategoryId whitelist.
// Loads firestore.rules from disk and splices the Change 29 draft IN MEMORY (never edits firestore.rules on disk).
// Run: npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-product-categories.mjs"
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, increment, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const rawRules = readFileSync(process.env.RULES_FILE || 'firestore.rules', 'utf8');

const HELPER_3A = `
    // [CHANGE 29 — DRAFT] WHO MANAGES SHARED PRODUCT CATEGORIES (Master Vault + Competitors).
    function categoryManager(bossUid) {
      let profile = getEmployeeProfile();
      let role = profile != null ? profile.get('userRole', 'NONE') : 'NONE';
      let m = getPermissionMatrixDoc(bossUid);
      let saved = m != null && ('matrix' in m) ? m.matrix : {};
      let key = 'manage_product_categories';
      let known = key in saved.get('DEVELOPER', []) || key in saved.get('COMPANY_OWNER', []) || key in saved.get('AREA_ADMIN', []) ||
        key in saved.get('FLEET_CAPTAIN', []) || key in saved.get('FIELD_OPERATIVE', []) || key in saved.get('ROOKIE', []);
      return isAuthenticated() && profile != null && profile.bossUid == bossUid &&
        (known ? key in saved.get(role, []) : (role == 'AREA_ADMIN' || role == 'FLEET_CAPTAIN'));
    }

`;

const MATCH_3B = `
      // [CHANGE 29 — DRAFT] Shared 2-level category list (Master Vault + Competitors).
      match /product_categories/{catId} {
        allow read: if isSalesman(bossUid);
        allow create, update: if (isCompanyTopTier(bossUid) || categoryManager(bossUid)) &&
          request.resource.data.keys().hasOnly(['name', 'normName', 'subs', 'createdAt', 'updatedAt', 'updatedBy']) &&
          request.resource.data.name is string && request.resource.data.name.size() > 0 &&
          request.resource.data.subs is list;
        allow delete: if isCompanyTopTier(bossUid) || categoryManager(bossUid);
      }
`;

function spliceDraft(src) {
  let out = src;
  const a1 = '    function isSalesman(bossUid) {';
  if (!out.includes(a1)) throw new Error('Anchor 3a missing');
  out = out.replace(a1, HELPER_3A + a1);

  const a2 = '      // [CHANGE 24 — DRAFT] the Sell Again holder writes its own line';
  if (!out.includes(a2)) throw new Error('Anchor 3b missing');
  out = out.replace(a2, MATCH_3B + a2);

  const cCreateOld = "request.resource.data.keys().hasOnly(['name', 'damagedFrom', 'type', 'category', 'images', 'dimensions', 'useFrontForBack',";
  const cCreateNew = "request.resource.data.keys().hasOnly(['name', 'damagedFrom', 'type', 'category', 'categoryId', 'subCategoryId', 'images', 'dimensions', 'useFrontForBack',";
  if (!out.includes(cCreateOld)) throw new Error('Anchor 3c create missing');
  out = out.replace(cCreateOld, cCreateNew);

  const cUpdOld = "request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'damagedFrom', 'type', 'category', 'images', 'dimensions',";
  const cUpdNew = "request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'damagedFrom', 'type', 'category', 'categoryId', 'subCategoryId', 'images', 'dimensions',";
  if (!out.includes(cUpdOld)) throw new Error('Anchor 3c update missing');
  out = out.replace(cUpdOld, cUpdNew);
  return out;
}

const RULES = spliceDraft(rawRules);
const APP_ID = 'cello-inventory-manager';
let pass = 0, fail = 0;
async function expect(label, promise, shouldSucceed) {
  try { await (shouldSucceed ? assertSucceeds(promise) : assertFails(promise)); console.log(`  PASS: ${label}`); pass++; }
  catch (e) { console.log(`  FAIL: ${label}\n        ${e.message.split('\n')[0]}`); fail++; }
}

const testEnv = await initializeTestEnvironment({ projectId: 'demo-kpm-rules', firestore: { rules: RULES, host: '127.0.0.1', port: 8080 } });
const base = `artifacts/${APP_ID}/users/ownerA`;
const dir = (db, id) => doc(db, `artifacts/${APP_ID}/employee_directory`, id);
const catDoc = (db, id) => doc(db, `${base}/product_categories`, id);
const catCol = (db) => collection(db, `${base}/product_categories`);
const product = (db, id) => doc(db, `${base}/products`, id);
const matrix = (db) => doc(db, `${base}/settings`, 'permission_matrix');

const SEED_CAT = {
  name: 'Kid',
  normName: 'kid',
  subs: [{ id: 'kid-gold', name: 'Kid Gold', normName: 'kidgold' }],
  updatedBy: 'owner',
};
const NEW_CAT = {
  name: 'Adult',
  normName: 'adult',
  subs: [{ id: 'adult-choc', name: 'Adult Chocolate', normName: 'adultchocolate' }],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  updatedBy: 'tester',
};
const PACK = {
  name: 'Cello Green 16', type: 'Mild', category: 'Mild', categoryId: 'mild', subCategoryId: 'mild-16',
  sticksPerPack: 16, packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4,
  hpp: 18000, priceRetail: 25000, priceGrosir: 24000, priceEcer: 26000, priceDistributor: 23000, stock: 100, damagedStock: 5,
};
const LOT_WITH_CATS = {
  name: 'Cello Green 16 · RUSAK', damagedFrom: 'p1', type: 'Mild', category: 'Mild',
  categoryId: 'mild', subCategoryId: 'mild-16',
  sticksPerPack: 16, packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4,
  hpp: 18000, priceRetail: 20000, priceGrosir: 20000, priceEcer: 20000, priceDistributor: 20000, stock: increment(2),
};

const reset = ({ savedMatrix = null, seedLot = false } = {}) => testEnv.clearFirestore().then(() => testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(dir(db, 'ownerA'), { bossUid: 'ownerA', role: 'COMPANY_OWNER', email: 'owner@test.com' });
  await setDoc(dir(db, 't2@test.com'), { bossUid: 'ownerA', userRole: 'COMPANY_OWNER', agentId: 'AGT_T2', location: 'HEADQUARTERS' });
  await setDoc(dir(db, 't3@test.com'), { bossUid: 'ownerA', userRole: 'AREA_ADMIN', agentId: 'AGT_T3', location: 'HEADQUARTERS' });
  await setDoc(dir(db, 't4@test.com'), { bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', agentId: 'AGT_T4', location: 'BANDUNG' });
  await setDoc(dir(db, 't5@test.com'), { bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', agentId: 'AGT_T5', location: 'BANDUNG' });
  await setDoc(dir(db, 't6@test.com'), { bossUid: 'ownerA', userRole: 'ROOKIE', agentId: 'AGT_T6', location: 'BANDUNG' });
  await setDoc(dir(db, 'other@test.com'), { bossUid: 'ownerB', userRole: 'AREA_ADMIN', agentId: 'AGT_O', location: 'HEADQUARTERS' });
  await setDoc(catDoc(db, 'kid'), SEED_CAT);
  await setDoc(product(db, 'p1'), PACK);
  if (seedLot) await setDoc(product(db, 'rsk-p1'), { ...LOT_WITH_CATS, stock: 2 });
  if (savedMatrix) await setDoc(matrix(db), { matrix: savedMatrix });
}));

const as = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const t2 = as('u-t2', 't2@test.com');
const t3 = as('u-t3', 't3@test.com');
const t4 = as('u-t4', 't4@test.com');
const t5 = as('u-t5', 't5@test.com');
const t6 = as('u-t6', 't6@test.com');
const other = as('u-o', 'other@test.com');

console.log('1. READ: every company member can read; another company denied');
await reset();
await expect('T2 reads product_categories', getDocs(catCol(t2)), true);
await expect('T3 reads product_categories', getDocs(catCol(t3)), true);
await expect('T4 reads product_categories', getDocs(catCol(t4)), true);
await expect('T5 reads product_categories', getDocs(catCol(t5)), true);
await expect('T6 reads product_categories', getDocs(catCol(t6)), true);
await expect('Other company (bossUid ownerB) read denied', getDoc(catDoc(other, 'kid')), false);

console.log('2. WRITE (default, no matrix key saved): T2, T3, T4 allowed; T5, T6, other company denied');
for (const [label, db] of [['T2', t2], ['T3 (AREA_ADMIN)', t3], ['T4 (FLEET_CAPTAIN)', t4]]) {
  await reset();
  await expect(`${label} create category`, setDoc(catDoc(db, 'adult'), NEW_CAT), true);
  await expect(`${label} update category`, updateDoc(catDoc(db, 'kid'), { name: 'Kid Milk', normName: 'kidmilk', updatedAt: serverTimestamp() }), true);
  await expect(`${label} delete category`, deleteDoc(catDoc(db, 'adult')), true);
}
await reset();
await expect('T5 (FIELD_OPERATIVE) create denied', setDoc(catDoc(t5, 'adult'), NEW_CAT), false);
await expect('T5 update denied', updateDoc(catDoc(t5, 'kid'), { name: 'Hack' }), false);
await expect('T5 delete denied', deleteDoc(catDoc(t5, 'kid')), false);
await expect('T6 (ROOKIE) create denied', setDoc(catDoc(t6, 'adult'), NEW_CAT), false);
await expect('T6 delete denied', deleteDoc(catDoc(t6, 'kid')), false);
await expect('Other company write denied', setDoc(catDoc(other, 'adult'), NEW_CAT), false);

console.log('3. MATRIX OVERRIDE: key listed for AREA_ADMIN only -> T3 allowed, T4 refused');
await reset({ savedMatrix: { AREA_ADMIN: ['manage_product_categories'], FLEET_CAPTAIN: ['view_fleet'] } });
await expect('T3 create allowed when key on AREA_ADMIN', setDoc(catDoc(t3, 'adult'), NEW_CAT), true);
await expect('T4 create refused when key NOT on FLEET_CAPTAIN', setDoc(catDoc(t4, 'elder'), { ...NEW_CAT, name: 'Elder', normName: 'elder', subs: [] }), false);
await expect('T4 update refused when key NOT on FLEET_CAPTAIN', updateDoc(catDoc(t4, 'kid'), { name: 'Kid 2' }), false);
await expect('T4 delete refused when key NOT on FLEET_CAPTAIN', deleteDoc(catDoc(t4, 'kid')), false);

console.log('4. FIELD WHITELIST on product_categories');
await reset();
await expect('T3 extra field on category doc refused', setDoc(catDoc(t3, 'bad'), { ...NEW_CAT, rogueField: 123 }), false);
await expect('T4 extra field on category doc refused', setDoc(catDoc(t4, 'bad2'), { ...NEW_CAT, rogueField: 123 }), false);

console.log('5. SELL AGAIN rsk-* whitelist with categoryId + subCategoryId');
await reset();
await expect('T3 Sell Again create rsk-p1 with categoryId + subCategoryId allowed', setDoc(product(t3, 'rsk-p1'), LOT_WITH_CATS, { merge: true }), true);
await expect('T3 Sell Again create rsk-p2 with unknown key refused', setDoc(product(t3, 'rsk-p2'), { ...LOT_WITH_CATS, damagedFrom: 'p2', unknownKey: 'nope' }, { merge: true }), false);
await reset({ seedLot: true });
await expect('T3 Sell Again update rsk-p1 with categoryId + subCategoryId allowed', setDoc(product(t3, 'rsk-p1'), { ...LOT_WITH_CATS, priceRetail: 18500 }, { merge: true }), true);

console.log(`\n${pass} passed, ${fail} failed`);
await testEnv.cleanup();
process.exit(fail ? 1 : 0);
