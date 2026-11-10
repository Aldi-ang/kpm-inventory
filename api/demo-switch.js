/* THE DEMO'S DOOR KEEPER - his 2026-10-13 "i can registered other google account email so that they can access it
   and the app should block others if not registered".

   POST, `Authorization: Bearer <Firebase sign-in token>`. Who may come in: his Gmail (T1), and every address he put
   on his invite list, `demo_invites/{email}` at the database ROOT (a reset wipes only artifacts/). The list is
   server-only: no rule opens it to the app, so nobody can read who else was invited.

     {}                    -> { ok, guest, t1 }   the picker's first question: may this Google account come in?
     { tier: 'T2'..'T6' }  -> { ok, token }       a sign-in for that person (the app calls signInWithCustomToken)
     { list: true } | { add: email } | { remove: email }  - T1 only -> { ok, invites }

   The five demo logins have no public password (api/demo-reset.js sets a random one on every reset), so this is
   the only way in. A person already inside carries the address they came in with (the `guest` claim, which only
   this server can sign), so a switch needs no second Google sign-in - but the list is checked again every time.

   Same guard as demo-reset.js: on the REAL Vercel project (no DEMO_FIREBASE_KEY) it answers 404 at once. */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { demoKey } from './demo-reset.js';
import { DEMO_PROJECT, T1_EMAIL, LOGINS } from './_demoCompany.js';

const lower = (s) => String(s || '').trim().toLowerCase();
const viaGoogle = (t) => t?.firebase?.sign_in_provider === 'google.com' && t.email_verified === true;
export const isT1 = (t) => viaGoogle(t) && lower(t.email) === T1_EMAIL;

/* the address this caller may enter as, or null. `invited(email)` answers from his list. */
export const guestOf = async (t, invited) => {
    const email = viaGoogle(t) ? lower(t.email)
        : t?.firebase?.sign_in_provider === 'custom' && LOGINS.some((l) => l.uid === t.uid) ? lower(t.guest) : '';
    if (!email) return null;
    return email === T1_EMAIL || await invited(email) ? email : null;
};

const INVITE_ONLY = 'This demo is invite-only - ask us for access.';

export default async function handler(req, res) {
    const key = demoKey();
    if (!key) return res.status(404).json({ ok: false, reason: 'not the demo project' });
    if (req.method !== 'POST') return res.status(405).json({ ok: false, reason: 'POST only' });
    const app = getApps()[0] || initializeApp({ credential: cert(key), projectId: DEMO_PROJECT });
    const auth = getAuth(app), db = getFirestore(app);
    let t;
    try { t = await auth.verifyIdToken(String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '')); }
    catch { return res.status(401).json({ ok: false, reason: 'sign in with Google first' }); }
    const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) || {};

    if (body.list || body.add || body.remove) {
        if (!isT1(t)) return res.status(403).json({ ok: false, reason: 'only T1 keeps the invite list' });
        const email = lower(body.add || body.remove);
        if (body.add && !/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(email)) return res.status(400).json({ ok: false, reason: `"${body.add}" is not an email address` });
        if (body.add) await db.doc(`demo_invites/${email}`).set({ by: T1_EMAIL, at: new Date() });
        if (body.remove) await db.doc(`demo_invites/${email}`).delete();
        return res.status(200).json({ ok: true, invites: (await db.collection('demo_invites').get()).docs.map((d) => d.id).sort() });
    }

    const guest = await guestOf(t, async (email) => (await db.doc(`demo_invites/${email}`).get()).exists);
    if (!guest) return res.status(403).json({ ok: false, reason: INVITE_ONLY });
    if (!body.tier) return res.status(200).json({ ok: true, guest, t1: isT1(t) });
    const login = LOGINS.find((l) => l.tier === body.tier);
    if (!login) return res.status(400).json({ ok: false, reason: `no demo person ${body.tier}` });
    return res.status(200).json({ ok: true, token: await auth.createCustomToken(login.uid, { guest }) });
}
