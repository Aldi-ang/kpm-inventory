import { readFileSync } from 'fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc,
} from 'firebase/firestore';

const RULES = readFileSync('firestore.rules', 'utf8');
const APP_ID = 'cello-inventory-manager';

let testEnv;
let pass = 0;
let fail = 0;

async function expect(label, promise, shouldSucceed) {
  try {
    if (shouldSucceed) {
      await assertSucceeds(promise);
    } else {
      await assertFails(promise);
    }
    console.log(`  PASS: ${label}`);
    pass++;
  } catch (e) {
    console.log(`  FAIL: ${label}`);
    console.log(`        ${e.message.split('\n')[0]}`);
    fail++;
  }
}

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    // ---- Company A (bossUid = ownerA) ----
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'admin-a@test.com'), {
      bossUid: 'ownerA', userRole: 'ADMIN',
    });
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'areaadmin-a@test.com'), {
      bossUid: 'ownerA', userRole: 'AREA_ADMIN', location: 'North',
    });
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'captain-a@test.com'), {
      bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', location: 'North',
    });
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'fieldop-a@test.com'), {
      bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', location: 'North',
    });
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'rookie-a@test.com'), {
      bossUid: 'ownerA', userRole: 'ROOKIE', location: 'North',
    });

    // ---- Company B (bossUid = ownerB), for cross-company checks ----
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'areaadmin-b@test.com'), {
      bossUid: 'ownerB', userRole: 'AREA_ADMIN', location: 'North',
    });
  });
}

function ctxFor(uid, email) {
  return testEnv.authenticatedContext(uid, { email });
}

async function run() {
  testEnv = await initializeTestEnvironment({
    projectId: 'kpm-rules-test-batch2',
    firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
  });

  await seed();

  console.log('\n=== TASK 3: pending_audits create (match view_stock_opname toggle reach) ===');
  {
    const areaAdminADb = ctxFor('areaAdminA', 'areaadmin-a@test.com').firestore();
    const captainADb = ctxFor('captainA', 'captain-a@test.com').firestore();
    const fieldOpADb = ctxFor('fieldOpA', 'fieldop-a@test.com').firestore();
    const rookieADb = ctxFor('rookieA', 'rookie-a@test.com').firestore();
    const areaAdminBDb = ctxFor('areaAdminB', 'areaadmin-b@test.com').firestore();

    const auditRef = (db, id) => doc(db, `artifacts/${APP_ID}/users/ownerA/pending_audits`, id);

    await expect('Area Admin can create pending_audits (unchanged)', setDoc(auditRef(areaAdminADb, 'a1'), { auditType: 'BRANCH_WAREHOUSE', items: [] }), true);
    await expect('Fleet Captain can create pending_audits (the fix)', setDoc(auditRef(captainADb, 'a2'), { auditType: 'BRANCH_WAREHOUSE', items: [] }), true);
    await expect('Field Operative can create pending_audits (the fix — matches toggle reach)', setDoc(auditRef(fieldOpADb, 'a3'), { auditType: 'BRANCH_WAREHOUSE', items: [] }), true);
    await expect('Rookie can create pending_audits (the fix — matches toggle reach)', setDoc(auditRef(rookieADb, 'a4'), { auditType: 'BRANCH_WAREHOUSE', items: [] }), true);
    await expect('A different company\'s Area Admin CANNOT create in Company A\'s pending_audits', setDoc(auditRef(areaAdminBDb, 'a5'), { auditType: 'BRANCH_WAREHOUSE', items: [] }), false);

    // Read stays unchanged: only Area Admin (and the catch-all admin/owner) can read.
    await expect('Area Admin can still READ pending_audits (unchanged)', getDoc(auditRef(areaAdminADb, 'a1')), true);
    await expect('Fleet Captain CANNOT read pending_audits (unchanged, read not widened)', getDoc(auditRef(captainADb, 'a2')), false);
    await expect('Field Operative CANNOT read pending_audits (unchanged, read not widened)', getDoc(auditRef(fieldOpADb, 'a3')), false);
  }

  await testEnv.cleanup();

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });
