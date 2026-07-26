import { readFileSync } from 'fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
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
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'owner-a@test.com'), {
      bossUid: 'ownerA', userRole: 'COMPANY_OWNER',
    });
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'admin-a@test.com'), {
      bossUid: 'ownerA', userRole: 'ADMIN',
    });
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'captain-auth@test.com'), {
      bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', canEditRoster: true, location: 'North',
    });
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'captain-unauth@test.com'), {
      bossUid: 'ownerA', userRole: 'FLEET_CAPTAIN', canEditRoster: false, location: 'North',
    });
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'areaadmin-auth@test.com'), {
      bossUid: 'ownerA', userRole: 'AREA_ADMIN', canEditRoster: true, location: 'South',
    });
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'areaadmin-plain@test.com'), {
      bossUid: 'ownerA', userRole: 'AREA_ADMIN', canEditRoster: false, location: 'South',
    });
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'fieldop@test.com'), {
      bossUid: 'ownerA', userRole: 'FIELD_OPERATIVE', location: 'North', agentId: 'agentDoc1',
    });
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'rookie@test.com'), {
      bossUid: 'ownerA', userRole: 'ROOKIE', location: 'North',
    });

    // ---- Company B (bossUid = ownerB), for cross-company checks ----
    await setDoc(doc(db, `artifacts/${APP_ID}/employee_directory`, 'owner-b@test.com'), {
      bossUid: 'ownerB', userRole: 'COMPANY_OWNER',
    });

    // ---- motorists docs under Company A ----
    await setDoc(doc(db, `artifacts/${APP_ID}/users/ownerA/motorists`, 'agentNorth1'), {
      name: 'North Agent', location: 'North',
    });
    await setDoc(doc(db, `artifacts/${APP_ID}/users/ownerA/motorists`, 'agentSouth1'), {
      name: 'South Agent', location: 'South',
    });
    await setDoc(doc(db, `artifacts/${APP_ID}/users/ownerA/motorists`, 'agentDoc1'), {
      name: 'Field Op Self', location: 'North',
    });

    // ---- products doc under Company A ----
    await setDoc(doc(db, `artifacts/${APP_ID}/users/ownerA/products`, 'prod1'), {
      name: 'Test Product', stock: 100,
    });
  });
}

function ctxFor(uid, email) {
  return testEnv.authenticatedContext(uid, { email });
}

async function run() {
  testEnv = await initializeTestEnvironment({
    projectId: 'kpm-rules-test-batch1',
    firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
  });

  await seed();

  // =====================================================================
  // TASK 1 — Rank Config / Achievement Badges settings doc
  // =====================================================================
  console.log('\n=== TASK 1: rank config / achievement badges ===');
  {
    const ownerDb = ctxFor('ownerA', 'owner-a@test.com').firestore();
    const adminDb = ctxFor('adminA', 'admin-a@test.com').firestore();
    const captainDb = ctxFor('captainAuth', 'captain-auth@test.com').firestore();
    const fieldOpDb = ctxFor('fieldOp', 'fieldop@test.com').firestore();
    const rookieDb = ctxFor('rookie', 'rookie@test.com').firestore();
    const ownerBDb = ctxFor('ownerB', 'owner-b@test.com').firestore();
    const anonDb = testEnv.unauthenticatedContext().firestore();

    const rpgRef = (db) => doc(db, `artifacts/${APP_ID}/settings`, 'rpg_ranks');
    const achRef = (db) => doc(db, `artifacts/${APP_ID}/settings`, 'achievements');

    await expect('COMPANY_OWNER can write rpg_ranks', setDoc(rpgRef(ownerDb), { ranks: [] }), true);
    await expect('ADMIN (distributor admin) can write achievements', setDoc(achRef(adminDb), { badges: [] }), true);
    await expect('COMPANY_OWNER can read rpg_ranks', getDoc(rpgRef(ownerDb)), true);
    await expect('FLEET_CAPTAIN can READ rpg_ranks (sees own rank)', getDoc(rpgRef(captainDb)), true);
    await expect('FIELD_OPERATIVE can READ achievements (sees own badges)', getDoc(achRef(fieldOpDb)), true);
    await expect('ROOKIE can READ rpg_ranks (sees own rank)', getDoc(rpgRef(rookieDb)), true);
    await expect('FLEET_CAPTAIN CANNOT write rpg_ranks', setDoc(rpgRef(captainDb), { ranks: [] }), false);
    await expect('FIELD_OPERATIVE CANNOT write achievements', setDoc(achRef(fieldOpDb), { badges: [] }), false);
    await expect('ROOKIE CANNOT write rpg_ranks', setDoc(rpgRef(rookieDb), { ranks: [] }), false);
    await expect('A different company\'s COMPANY_OWNER can still write (known shared-doc limitation, documented in rules)', setDoc(rpgRef(ownerBDb), { ranks: [] }), true);
    await expect('Unauthenticated cannot read rpg_ranks', getDoc(rpgRef(anonDb)), false);
    await expect('Unauthenticated cannot write rpg_ranks', setDoc(rpgRef(anonDb), { ranks: [] }), false);
  }

  // =====================================================================
  // TASK 3 — motorists UPDATE rule
  // =====================================================================
  console.log('\n=== TASK 3: motorists update (Fleet Captain + region lock) ===');
  {
    const captainAuthDb = ctxFor('captainAuth', 'captain-auth@test.com').firestore();
    const captainUnauthDb = ctxFor('captainUnauth', 'captain-unauth@test.com').firestore();
    const areaAdminAuthDb = ctxFor('areaAdminAuth', 'areaadmin-auth@test.com').firestore();
    const areaAdminPlainDb = ctxFor('areaAdminPlain', 'areaadmin-plain@test.com').firestore();
    const fieldOpDb = ctxFor('fieldOp', 'fieldop@test.com').firestore();
    const rookieDb = ctxFor('rookie', 'rookie@test.com').firestore();

    const northRef = (db) => doc(db, `artifacts/${APP_ID}/users/ownerA/motorists`, 'agentNorth1');
    const southRef = (db) => doc(db, `artifacts/${APP_ID}/users/ownerA/motorists`, 'agentSouth1');
    const selfRef = (db) => doc(db, `artifacts/${APP_ID}/users/ownerA/motorists`, 'agentDoc1');

    await expect('Authorized Fleet Captain updates agent in OWN region -> ALLOWED', updateDoc(northRef(captainAuthDb), { phone: '111' }), true);
    await expect('Authorized Fleet Captain updates agent in DIFFERENT region -> DENIED', updateDoc(southRef(captainAuthDb), { phone: '111' }), false);
    await expect('Authorized Area Admin updates agent in OWN region -> ALLOWED', updateDoc(southRef(areaAdminAuthDb), { phone: '222' }), true);
    await expect('Authorized Area Admin updates agent in DIFFERENT region -> DENIED', updateDoc(northRef(areaAdminAuthDb), { phone: '222' }), false);
    await expect('Non-authorized Fleet Captain (no canEditRoster) -> DENIED', updateDoc(northRef(captainUnauthDb), { phone: '333' }), false);
    await expect('Non-authorized Area Admin (no canEditRoster) -> DENIED', updateDoc(southRef(areaAdminPlainDb), { phone: '333' }), false);
    await expect('Field agent updates OWN motorist doc (agentId match) -> ALLOWED', updateDoc(selfRef(fieldOpDb), { activeCanvas: [] }), true);
    await expect('Rookie (no role standing, no agentId match) -> DENIED', updateDoc(northRef(rookieDb), { phone: '444' }), false);
  }

  // =====================================================================
  // TASK 4 — products UPDATE rule (extend to Fleet Captain)
  // =====================================================================
  console.log('\n=== TASK 4: products update (Fleet Captain / Master Vault) ===');
  {
    const captainAuthDb = ctxFor('captainAuth', 'captain-auth@test.com').firestore();
    const captainUnauthDb = ctxFor('captainUnauth', 'captain-unauth@test.com').firestore();
    const areaAdminPlainDb = ctxFor('areaAdminPlain', 'areaadmin-plain@test.com').firestore();
    const fieldOpDb = ctxFor('fieldOp', 'fieldop@test.com').firestore();
    const rookieDb = ctxFor('rookie', 'rookie@test.com').firestore();
    const ownerBDb = ctxFor('ownerB', 'owner-b@test.com').firestore();

    const prodRef = (db) => doc(db, `artifacts/${APP_ID}/users/ownerA/products`, 'prod1');

    await expect('Fleet Captain (any standing, canEditRoster irrelevant) can update products -> ALLOWED (the fix)', updateDoc(prodRef(captainAuthDb), { stock: 90 }), true);
    await expect('Fleet Captain WITHOUT canEditRoster can also update products (not roster-gated) -> ALLOWED', updateDoc(prodRef(captainUnauthDb), { stock: 80 }), true);
    await expect('Area Admin can update products -> ALLOWED (unchanged)', updateDoc(prodRef(areaAdminPlainDb), { stock: 70 }), true);
    await expect('Field Operative CANNOT update products -> DENIED', updateDoc(prodRef(fieldOpDb), { stock: 60 }), false);
    await expect('Rookie CANNOT update products -> DENIED', updateDoc(prodRef(rookieDb), { stock: 50 }), false);
    await expect('Different company\'s owner CANNOT update Company A products -> DENIED', updateDoc(prodRef(ownerBDb), { stock: 40 }), false);
  }

  await testEnv.cleanup();

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });
