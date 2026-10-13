/* RESET THE DEMO — one Vercel function, two callers.

   1. Vercel's daily cron (vercel.json "crons", 00:05 WIB), carrying `Authorization: Bearer <CRON_SECRET>`.
   2. The "Reset demo" button on the front door and in the SWITCH sheet: a POST carrying a password, checked
      here against DEMO_RESET_PASSWORD - a secret set only in the demo's Vercel project, never in the app's
      code (anyone can read that). His 2026-10-13 "just replace it": no Google sign-in needed to reset.
      Unset = this path is closed. One password reset every 10 minutes and 12 a day (gate() below).

   🔴 THE SAME FILE DEPLOYS ON THE REAL VERCEL PROJECT. It must do nothing there, fast: without
   DEMO_FIREBASE_KEY, or with a key for any project but kpm-demo-f4d74, it answers 404 before
   Firebase is even started. The key is set only in the demo's Vercel project (his step).

   What one reset does (design: A-Brain Brainstorm/2026-10-06_public-demo.md): wipe
   artifacts/cello-inventory-manager, set the 5 switch logins back (password, name, enabled), then write
   the company from api/_demoCompany.js. Proven against the Firebase emulator with the real rules:
   tools/demo-reset-emulator.mjs. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { hashSecret } from '../src/utils/secretHash.js';
import { buildDemoCompany, wibDay, DEMO_PROJECT, APP_ID, LOGINS, LOGIN_PASSWORD, VAULT_PASSWORD, RECOVERY_WORD } from './_demoCompany.js';

/* the parsed service-account key, or null when it is missing, broken, or for another project */
export const demoKey = (raw = process.env.DEMO_FIREBASE_KEY) => {
    try { const k = JSON.parse(raw || ''); return k?.project_id === DEMO_PROJECT ? k : null; } catch { return null; }
};

const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

/* 'cron', 'password', or null */
const callerOf = (req) => {
    const bearer = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
    if (bearer && process.env.CRON_SECRET && same(bearer, process.env.CRON_SECRET)) return 'cron';
    if (req.method !== 'POST') return null;
    const pw = String((req.body && typeof req.body === 'object' && req.body.password) || '');
    return process.env.DEMO_RESET_PASSWORD && pw && same(pw, process.env.DEMO_RESET_PASSWORD) ? 'password' : null;
};

/* A password can leak. Each reset is ~900 writes + ~900 deletes and the free plan allows 20.000 of each a day, so
   without a cap one stranger could stop the demo until midnight. Kept OUTSIDE artifacts/, which every reset wipes.
   The nightly timer is never held back. */
const COOLDOWN_MIN = 10, DAILY_CAP = 12;
const gate = async (db, now) => {
    const ref = db.doc('demo_meta/reset');
    const s = (await ref.get()).data() || {};
    const day = wibDay(now), count = s.day === day ? s.count || 0 : 0;
    const wait = Math.ceil(((s.at || 0) + COOLDOWN_MIN * 60e3 - now.getTime()) / 60e3);
    if (wait > 0) return { stop: `the demo was reset a moment ago - try again in ${wait} minute${wait > 1 ? 's' : ''}` };
    if (count >= DAILY_CAP) return { stop: `the demo was already reset ${DAILY_CAP} times today - it resets by itself at 00:05 WIB` };
    return { done: () => ref.set({ at: now.getTime(), day, count: count + 1 }) };
};

/* set a switch login back to its public password, freeing its email if someone else took it */
const upsertLogin = async (auth, l) => {
    const props = { email: l.email, password: LOGIN_PASSWORD, displayName: l.name, emailVerified: true, disabled: false };
    try { await auth.updateUser(l.uid, props); return; } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
    try { await auth.createUser({ uid: l.uid, ...props }); } catch (e) {
        if (e.code !== 'auth/email-already-exists') throw e;
        await auth.deleteUser((await auth.getUserByEmail(l.email)).uid);
        await auth.createUser({ uid: l.uid, ...props });
    }
};

export async function resetDemo(db, auth, now = new Date()) {
    const started = Date.now();
    const seed = JSON.parse(readFileSync(join(process.cwd(), 'demo', 'seed.json'), 'utf8'));
    const vault = { pin: await hashSecret(VAULT_PASSWORD), recoveryHash: await hashSecret(RECOVERY_WORD.toLowerCase()) };
    const company = buildDemoCompany(seed, now, vault);

    await db.recursiveDelete(db.doc(`artifacts/${APP_ID}`));
    for (const l of LOGINS) await upsertLogin(auth, l);

    let failed = 0;
    const w = db.bulkWriter();
    w.onWriteError((e) => { if (e.failedAttempts < 3) return true; failed++; return false; });
    for (const d of company.docs) w.set(db.doc(d.path), d.data);
    await w.close();

    return { day: company.day, wrote: company.docs.length - failed, failed, logins: LOGINS.length, ms: Date.now() - started };
}

export default async function handler(req, res) {
    const key = demoKey();
    if (!key) return res.status(404).json({ ok: false, reason: 'not the demo project' });
    const app = getApps()[0] || initializeApp({ credential: cert(key), projectId: DEMO_PROJECT });
    const by = callerOf(req);
    if (!by) return res.status(401).json({ ok: false, reason: req.method === 'POST' ? 'wrong password' : 'only the daily timer or the reset password can reset the demo' });
    try {
        const now = new Date();
        let g = null;
        if (by === 'password') {
            g = await gate(getFirestore(app), now);
            if (g.stop) return res.status(429).json({ ok: false, reason: g.stop });
        }
        const result = await resetDemo(getFirestore(app), getAuth(app), now);
        if (g) await g.done();
        return res.status(200).json({ ok: true, by, ...result });
    } catch (e) {
        console.error('demo reset failed', e);
        return res.status(500).json({ ok: false, reason: e.message });
    }
}
