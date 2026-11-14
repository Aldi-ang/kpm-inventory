/* RESET THE DEMO — one Vercel function, two callers.

   1. Vercel's daily cron (vercel.json "crons", 00:05 WIB), carrying `Authorization: Bearer <CRON_SECRET>`.
   2. His T1 "Reset demo now" button: a POST carrying his Firebase sign-in token; the token's email must
      be his Gmail (T1_EMAIL) and verified. Nobody else - visitors are T2..T6.

   🔴 THE SAME FILE DEPLOYS ON THE REAL VERCEL PROJECT. It must do nothing there, fast: without
   DEMO_FIREBASE_KEY, or with a key for any project but kpm-demo-f4d74, it answers 404 before
   Firebase is even started. The key is set only in the demo's Vercel project (his step).

   What one reset does (design: A-Brain Brainstorm/2026-10-06_public-demo.md): wipe
   artifacts/cello-inventory-manager, set the 5 switch logins back (a random password, name, enabled), then write
   the company from api/_demoCompany.js. Proven against the Firebase emulator with the real rules:
   tools/demo-reset-emulator.mjs.

   WHICH COMPANY: the small one, unless the demo's server says DEMO_SIZE=big - then the big company (2026-11-14: 20
   salesmen, 600 shops, api/_demoCompany.js BIG). Unset = tonight's reset is exactly what it was. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { timingSafeEqual, randomBytes } from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { hashSecret } from '../src/utils/secretHash.js';
import { buildDemoCompany, DEMO_PROJECT, APP_ID, T1_EMAIL, LOGINS, VAULT_PASSWORD, RECOVERY_WORD, OWNER_UID } from './_demoCompany.js';

/* the parsed service-account key, or null when it is missing, broken, or for another project */
export const demoKey = (raw = process.env.DEMO_FIREBASE_KEY) => {
    try { const k = JSON.parse(raw || ''); return k?.project_id === DEMO_PROJECT ? k : null; } catch { return null; }
};

const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

/* 'cron', 'T1', or null */
const callerOf = async (req, auth) => {
    const bearer = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
    if (!bearer) return null;
    if (process.env.CRON_SECRET && same(bearer, process.env.CRON_SECRET)) return 'cron';
    if (req.method !== 'POST') return null;
    try {
        const t = await auth.verifyIdToken(bearer);
        return t.email_verified && String(t.email || '').toLowerCase() === T1_EMAIL ? 'T1' : null;
    } catch { return null; }
};

/* set a switch login back, freeing its email if someone else took it. The password is RANDOM and thrown away: nobody
   signs in with it (his 2026-10-13 invite-only demo - api/demo-switch.js hands out the sign-ins after the invite check),
   and the reset ends every session, so an address he took off the list is out by the next reset at the latest. */
const upsertLogin = async (auth, l) => {
    const props = { email: l.email, password: randomBytes(24).toString('base64url'), displayName: l.name, emailVerified: true, disabled: false };
    try { await auth.updateUser(l.uid, props); return; } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
    try { await auth.createUser({ uid: l.uid, ...props }); } catch (e) {
        if (e.code !== 'auth/email-already-exists') throw e;
        await auth.deleteUser((await auth.getUserByEmail(l.email)).uid);
        await auth.createUser({ uid: l.uid, ...props });
    }
};

export async function resetDemo(db, auth, now = new Date(), big = process.env.DEMO_SIZE === 'big') {
    const started = Date.now();
    const seed = JSON.parse(readFileSync(join(process.cwd(), 'demo', 'seed.json'), 'utf8'));
    const vault = { pin: await hashSecret(VAULT_PASSWORD), recoveryHash: await hashSecret(RECOVERY_WORD.toLowerCase()) };
    const company = buildDemoCompany(seed, now, vault, { big });

    /* NEVER LEAVE THE DEMO EMPTY (2026-11-10: the 2026-11-09 nightly run deleted all but 3 docs and wrote nothing, so
       every visitor met an empty company and INITIALIZE VAULT). A delete that throws used to end the run before the first
       write, and so did a sign-in error. Now a failed delete is only reported - set() overwrites every doc the company
       owns anyway - and the logins come after the writes. */
    let deleteError = null;
    await db.recursiveDelete(db.doc(`artifacts/${APP_ID}`)).catch((e) => { deleteError = String(e?.message || e); console.error('demo reset: delete', e); });

    let failed = 0;
    const w = db.bulkWriter();
    w.onWriteError((e) => { if (e.failedAttempts < 3) return true; failed++; return false; });
    for (const d of company.docs) w.set(db.doc(d.path), d.data);
    await w.close();

    const result = { day: company.day, wrote: company.docs.length - failed, failed, ...(deleteError ? { deleteError } : {}), ...(big ? { big: true } : {}) };
    /* what this run did, readable in the demo the next morning (Vercel keeps function logs for an hour only) */
    await db.doc(`artifacts/${APP_ID}/users/${OWNER_UID}/settings/demoReset`).set({ ...result, at: now.toISOString() });

    for (const l of LOGINS) { await upsertLogin(auth, l); await auth.revokeRefreshTokens(l.uid); }

    return { ...result, logins: LOGINS.length, ms: Date.now() - started };
}

export default async function handler(req, res) {
    const key = demoKey();
    if (!key) return res.status(404).json({ ok: false, reason: 'not the demo project' });
    const app = getApps()[0] || initializeApp({ credential: cert(key), projectId: DEMO_PROJECT });
    const by = await callerOf(req, getAuth(app));
    if (!by) return res.status(401).json({ ok: false, reason: 'only the daily timer or the T1 account can reset the demo' });
    try {
        return res.status(200).json({ ok: true, by, ...(await resetDemo(getFirestore(app), getAuth(app))) });
    } catch (e) {
        console.error('demo reset failed', e);
        return res.status(500).json({ ok: false, reason: e.message });
    }
}
