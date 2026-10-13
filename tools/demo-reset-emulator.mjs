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

const { default: handler } = await import('../api/demo-reset.js');
const { default: switcher } = await import('../api/demo-switch.js');
const { getFirestore } = await import('firebase-admin/firestore');
const { getAuth } = await import('firebase-admin/auth');
const { getApps } = await import('firebase-admin/app');
const { APP_ID, OWNER_UID, T1_EMAIL, LOGINS } = await import('../api/_demoCompany.js');

const run = async (fn, method, bearer, body) => {
    const r = { code: 0, body: null, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } };
    await fn({ method, headers: bearer ? { authorization: `Bearer ${bearer}` } : {}, body }, r);
    return r;
};
const call = (method, bearer) => run(handler, method, bearer);
const ask = (bearer, body = {}) => run(switcher, 'POST', bearer, body);
const idt = async (op, body) => {
    const res = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:${op}?key=emulator`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, returnSecureToken: true }) });
    return res.json();
};
const token = async (email, password) => (await idt('signInWithPassword', { email, password })).idToken;
/* a Google sign-in, the emulator's way: an unsigned id_token only the emulator accepts (same trick as firebase.js) */
const google = async (email) => (await idt('signInWithIdp', { requestUri: 'http://localhost',
    postBody: `id_token=${encodeURIComponent(JSON.stringify({ sub: 'g-' + email, email, email_verified: true }))}&providerId=google.com` })).idToken;
const custom = (t) => idt('signInWithCustomToken', { token: t });
const claims = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());
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
for (const l of LOGINS) ok(`${l.tier} login REFUSES the old public password admin123 (invite-only: the reset set a random one)`, !(await token(l.email, 'admin123')));

/* what a visitor might do during the day: a sale of their own, a locked switch login, a changed password */
await db.doc(`${home}/transactions/visitor-sale`).set({ date: r1.body.day, customerName: 'VISITOR', total: 1 });
await db.doc(`artifacts/${APP_ID}/employee_directory/${LOGINS[4].email}`).update({ locked: true });
await auth.updateUser(LOGINS[3].uid, { password: 'changed-by-a-visitor' });

const r2 = await call('GET', 'emulator-cron');
const c2 = await counts(db);
ok('a second reset leaves the same counts - nothing doubles', JSON.stringify(c2) === JSON.stringify(c1), JSON.stringify(c2));
ok('the visitor\'s sale is gone', !(await db.doc(`${home}/transactions/visitor-sale`).get()).exists);
ok('the locked switch login is unlocked again', (await db.doc(`artifacts/${APP_ID}/employee_directory/${LOGINS[4].email}`).get()).data()?.locked === false);
ok('the password a visitor set is gone too - nobody can sign in with it', !(await token(LOGINS[3].email, 'changed-by-a-visitor')));

/* THE INVITE GATE (api/demo-switch.js) - his Gmail, his list, nobody else */
for (const m of [T1_EMAIL, 'stranger@gmail.com', 'buyer@gmail.com']) { try { await auth.deleteUser((await auth.getUserByEmail(m)).uid); } catch { /* not there */ } }
await db.doc('demo_invites/buyer@gmail.com').delete();
const t1 = await google(T1_EMAIL), stranger = await google('stranger@gmail.com');
const s0 = await ask(stranger);
ok('a Google account not on his list is refused: "invite-only"', s0.code === 403 && /invite-only/.test(s0.body.reason), JSON.stringify(s0.body));
ok('a stranger cannot add himself to the list', (await ask(stranger, { add: 'stranger@gmail.com' })).code === 403);
const s1 = await ask(t1, { add: 'Buyer@Gmail.com' });
ok('T1 adds a Gmail (stored in small letters, at the root - outside what a reset wipes)', s1.code === 200 && s1.body.invites.join() === 'buyer@gmail.com' && (await db.doc('demo_invites/buyer@gmail.com').get()).exists, JSON.stringify(s1.body));
ok('a bad address is refused with a reason', (await ask(t1, { add: 'not-an-email' })).code === 400);
const buyer = await google('buyer@gmail.com');
const s2 = await ask(buyer);
ok('the invited Gmail gets in: the picker opens', s2.code === 200 && s2.body.guest === 'buyer@gmail.com' && s2.body.t1 === false, JSON.stringify(s2.body));
const s3 = await ask(buyer, { tier: 'T5' });
const in5 = s3.body?.token ? await custom(s3.body.token) : {};
ok('picking T5 signs them in AS the T5 account, carrying the Gmail they came with', !!in5.idToken && claims(in5.idToken).user_id === 'demo-canvas' && claims(in5.idToken).guest === 'buyer@gmail.com', JSON.stringify(s3.body).slice(0, 80));
const s4 = await ask(in5.idToken, { tier: 'T2' });
ok('from inside, SWITCH to T2 needs no second Google sign-in', s4.code === 200 && !!s4.body.token);
ok('a guest on T5 cannot see or change his list', (await ask(in5.idToken, { list: true })).code === 403);
ok('a guest on T2 cannot press Reset demo now', (await call('POST', (await custom(s4.body.token)).idToken)).code === 401);
ok('an unknown person (no such tier) is refused', (await ask(buyer, { tier: 'T1' })).code === 400);
ok('a GET is refused (everything POSTs)', (await run(switcher, 'GET', buyer)).code === 405);
const s5 = await ask(t1, { remove: 'buyer@gmail.com' });
ok('T1 removes the Gmail', s5.code === 200 && s5.body.invites.length === 0);
ok('removed: their Google sign-in is refused again', (await ask(buyer)).code === 403);
ok('removed: a SWITCH from the session they still hold is refused too', (await ask(in5.idToken, { tier: 'T3' })).code === 403);
ok('his Gmail needs no invite and can try any of the five', (await ask(t1, { tier: 'T4' })).code === 200);

/* the T1 "Reset demo now" button: his Gmail only, and only by POST - and it ends every session inside */
const r3 = await call('POST', t1);
ok('his T1 account can reset (POST with his sign-in token)', r3.code === 200 && r3.body.by === 'T1', JSON.stringify(r3.body));
/* the Auth EMULATOR still refreshes a revoked session (it does not check), so ask the way the server does: Firebase
   marks the session revoked, and the live service refuses its refresh - the app then signs out */
const revoked = await auth.verifyIdToken(in5.idToken, true).then(() => 'still valid', (e) => e.code);
ok('the reset ended the T5 session: Firebase marks it revoked', revoked === 'auth/id-token-revoked', revoked);
ok('a GET with his token cannot (the button POSTs)', (await call('GET', t1)).code === 401);

process.env.DEMO_FIREBASE_KEY = JSON.stringify({ ...JSON.parse(KEY), project_id: 'cello-inventory-manager' });
const r5 = await call('GET', 'emulator-cron');
ok('a key for the REAL project is refused before anything runs', r5.code === 404, r5.code);
delete process.env.DEMO_FIREBASE_KEY;
ok('no key at all (the REAL Vercel project) is refused', (await call('GET', 'emulator-cron')).code === 404);
ok('the door keeper answers 404 on the REAL project too', (await ask(t1)).code === 404);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
