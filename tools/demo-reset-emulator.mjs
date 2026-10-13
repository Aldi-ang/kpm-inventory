/* PROVE THE DEMO RESET ON THE LOCAL FIREBASE EMULATOR - never on the live demo project.

   Runs the REAL api/demo-reset.js handler, the way Vercel would call it, against
   `firebase emulators:start --only auth,firestore --project kpm-demo-f4d74` (launch config
   `demo-emulator`; firebase.json loads the real firestore.rules). Usage, from the repo root:

     node tools/demo-reset-emulator.mjs

   It refuses to run unless both emulator addresses point at this machine, and the key it hands the
   function is a throwaway made here (a fresh RSA key nobody holds) - the emulator never checks it. */
import { generateKeyPairSync } from 'node:crypto';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
for (const h of [process.env.FIRESTORE_EMULATOR_HOST, process.env.FIREBASE_AUTH_EMULATOR_HOST]) {
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(h)) { console.error(`REFUSED: ${h} is not this machine`); process.exit(1); }
}
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const KEY = JSON.stringify({ type: 'service_account', project_id: 'kpm-demo-f4d74', client_email: 'emulator@kpm-demo-f4d74.iam.gserviceaccount.com', private_key: privateKey });
process.env.DEMO_FIREBASE_KEY = KEY;
process.env.CRON_SECRET = 'emulator-cron';
process.env.DEMO_RESET_PASSWORD = 'emulator-reset';

const { default: handler } = await import('../api/demo-reset.js');
const { getFirestore } = await import('firebase-admin/firestore');
const { getAuth } = await import('firebase-admin/auth');
const { getApps } = await import('firebase-admin/app');
const { APP_ID, OWNER_UID, LOGINS, LOGIN_PASSWORD } = await import('../api/_demoCompany.js');

const call = async (method, bearer, body) => {
    const r = { code: 0, body: null, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } };
    await handler({ method, headers: bearer ? { authorization: `Bearer ${bearer}` } : {}, body }, r);
    return r;
};
const token = async (email, password) => {
    const res = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    return (await res.json()).idToken;
};
let pass = 0, fail = 0;
const ok = (name, cond, got = '') => { cond ? pass++ : fail++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${got !== '' ? '  -> ' + got : ''}`); };

const home = `artifacts/${APP_ID}/users/${OWNER_UID}`;
/* the company's own folders (motorists now includes master_owner + ADMIN_VEHICLE - the reset writes the owner's van,
   so the app never makes one with no place) */
const COLS = ['products', 'customers', 'transactions', 'vault_keys', 'settings', 'sales_stats', 'motorists', 'eod_reports', 'career', 'procurement', 'stock_requests', 'audit_logs'];
const counts = async (db) => {
    const out = {};
    for (const c of COLS) out[c] = (await db.collection(`${home}/${c}`).count().get()).data().count;
    out.employee_directory = (await db.collection(`artifacts/${APP_ID}/employee_directory`).count().get()).data().count;
    return out;
};
/* what one reset should leave, from the very builder the function runs (same seed, same day) - not numbers typed here */
const { buildDemoCompany } = await import('../api/_demoCompany.js');
const { readFileSync } = await import('node:fs');
const built = buildDemoCompany(JSON.parse(readFileSync('demo/seed.json', 'utf8')), new Date(), { pin: 'p', recoveryHash: 'r' });
const expected = Object.fromEntries([...COLS, 'employee_directory'].map((c) => [c, built.docs.filter((d) => {
    const rest = c === 'employee_directory' ? d.path.replace(`artifacts/${APP_ID}/`, '') : d.path.startsWith(`${home}/`) ? d.path.slice(home.length + 1) : '';
    const parts = rest.split('/');
    return parts.length === 2 && parts[0] === c;
}).length]));

const r0 = await call('GET', 'wrong-secret');
ok('a wrong timer secret is refused', r0.code === 401, r0.code);

const r1 = await call('GET', 'emulator-cron');
ok('the daily timer resets the demo', r1.code === 200 && r1.body.ok && r1.body.failed === 0, JSON.stringify(r1.body));
const db = getFirestore(getApps()[0]), auth = getAuth(getApps()[0]);
const c1 = await counts(db);
console.log('  counts after reset 1:', JSON.stringify(c1));
ok(`every folder holds what the builder wrote (${built.docs.length} docs in all): ${JSON.stringify(expected)}`,
   JSON.stringify(c1) === JSON.stringify(expected) && r1.body.wrote === built.docs.length);
for (const l of LOGINS) ok(`${l.tier} login signs in with the public password`, !!(await token(l.email, LOGIN_PASSWORD)));

/* what a visitor might do during the day: a sale of their own, a locked switch login, a changed password */
await db.doc(`${home}/transactions/visitor-sale`).set({ date: r1.body.day, customerName: 'VISITOR', total: 1 });
await db.doc(`artifacts/${APP_ID}/employee_directory/${LOGINS[4].email}`).update({ locked: true });
await auth.updateUser(LOGINS[3].uid, { password: 'changed-by-a-visitor' });

const r2 = await call('GET', 'emulator-cron');
const c2 = await counts(db);
ok('a second reset leaves the same counts - nothing doubles', JSON.stringify(c2) === JSON.stringify(c1), JSON.stringify(c2));
ok('the visitor\'s sale is gone', !(await db.doc(`${home}/transactions/visitor-sale`).get()).exists);
ok('the locked switch login is unlocked again', (await db.doc(`artifacts/${APP_ID}/employee_directory/${LOGINS[4].email}`).get()).data()?.locked === false);
ok('the changed password is back to the public one', !!(await token(LOGINS[3].email, LOGIN_PASSWORD)));

/* the "Reset demo" button: a password, checked on the server, and only by POST (his 2026-10-13 "just replace it") */
await db.doc('demo_meta/reset').delete();   // a previous run's cooldown must not decide this one
const r3 = await call('POST', null, { password: 'wrong' });
ok('a wrong password is refused, and says so', r3.code === 401 && r3.body.reason === 'wrong password', JSON.stringify(r3.body));
const r4 = await call('POST', null, { password: 'emulator-reset' });
ok('the right password resets (POST, no sign-in)', r4.code === 200 && r4.body.by === 'password' && r4.body.failed === 0, JSON.stringify(r4.body));
const r5b = await call('POST', null, { password: 'emulator-reset' });
ok('a second password reset within 10 minutes waits, and says how long', r5b.code === 429 && /try again in 10 minutes/.test(r5b.body.reason), JSON.stringify(r5b.body));
ok('the nightly timer is never held back by that wait', (await call('GET', 'emulator-cron')).code === 200);
await db.doc('demo_meta/reset').set({ at: 0, day: (await import('../api/_demoCompany.js')).wibDay(new Date()), count: 12 });
const r6 = await call('POST', null, { password: 'emulator-reset' });
ok('the 13th password reset of a day is refused', r6.code === 429 && /12 times today/.test(r6.body.reason), JSON.stringify(r6.body));
await db.doc('demo_meta/reset').delete();
ok('a sign-in token is not a password: the T2 Owner\'s token cannot reset', (await call('POST', await token(LOGINS[0].email, LOGIN_PASSWORD))).code === 401);
ok('a GET with the password cannot (the button POSTs)', (await call('GET', null, { password: 'emulator-reset' })).code === 401);
delete process.env.DEMO_RESET_PASSWORD;
ok('no password set in Vercel = the button path is closed', (await call('POST', null, { password: '' })).code === 401);

process.env.DEMO_FIREBASE_KEY = JSON.stringify({ ...JSON.parse(KEY), project_id: 'cello-inventory-manager' });
const r5 = await call('GET', 'emulator-cron');
ok('a key for the REAL project is refused before anything runs', r5.code === 404, r5.code);
delete process.env.DEMO_FIREBASE_KEY;
ok('no key at all (the REAL Vercel project) is refused', (await call('GET', 'emulator-cron')).code === 404);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
