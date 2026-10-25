/* THE DEMO'S FRONT DOOR, ITS PICKER AND ITS SWITCH BAR - the demo build only (IS_DEMO).
   INVITE-ONLY since his 2026-10-13 "i can registered other google account email so that they can access it and the
   app should block others if not registered". His order: Google sign-in -> pick who to be -> the Master Vault
   password -> the intro -> the demo.
     DemoDoor - signed out (BiohazardTheme.jsx): Google sign-in only.
     DemoPick - signed in with Google but not one of the five (App.jsx, where the real app says Access Denied): asks
                api/demo-switch.js whether this Google account is on his list. Not on it -> told so, signed out.
                On it -> the five people, his 2026-10-13 picks from A-Brain Raw/2026-10-13-demo-door/: phone and
                tablet = five keys (A), PC (lg) = five ID badges (B). A press = the server signs them in as that
                person (a custom token); the five have no public password any more.
     DemoBar  - signed in. One line on top: DEMO, who you are, when it resets, SWITCH (A). For his Gmail (T1) the
                sheet also holds the invite list and Reset demo now.
   Each person is a REAL account (api/_demoCompany.js makes them, the nightly reset sets them back), so the rules
   apply for real and a visitor sees exactly what that tier can and cannot do.
   Every string here is demo-only: src/config/demoBuild.check.mjs proves the real bundle carries none of it. */
import React, { useEffect, useState } from 'react';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { LogIn, X } from 'lucide-react';
import { auth } from '../config/firebase';
import { LOGINS, VAULT_PASSWORD } from '../config/demoLogins.js';
import { POV_OWNER_EMAIL } from '../config/povPreview.js';
import { clearGrace } from '../utils/vaultGrace.js';
import VaultGate, { gateCanvasOn } from './VaultGate.jsx';
import { notify } from './Toast.jsx';
import { confirmAction } from './ConfirmGate.jsx';
import DemoMission from './DemoMission.jsx';

/* what each person is for, one line each - the wording he saw on the 2026-10-13 board */
const CARD = {
    T2: { role: 'Owner', what: 'Sees the whole company: money, stock and every salesman.' },
    T3: { role: 'HQ Sales Manager', what: 'Runs the sales team across every region.' },
    T4: { role: 'Regional Admin', what: 'Runs the Muntilan HQ team: its shops, staff and approvals.' },
    T5: { role: 'Sales Canvas', what: 'Sells from the van in Bandung: shops, sales and the receipt.' },
    T6: { role: 'Sales Motorist', what: 'Visits shops by motorbike: his route, sales and end of day.' },
};
/* built when a demo screen draws, never at import: a top-level call keeps this module - and every demo email - in the
   REAL bundle (demoBuild.check caught exactly that, 2026-10-13) */
const people = () => LOGINS.map((l) => ({ ...l, ...CARD[l.tier], initials: l.name.split(' ').map((w) => w[0]).join('').slice(0, 2) }));

/* trap (b) of the brief: a sign-in that fails while the nightly reset rewrites the logins must not show a raw Firebase code */
const DEMO_DOWN = 'The demo is being reset. Try again in a minute.';
const INVITE_ONLY = 'This demo is invite-only - ask KPM for access.';

/* every question goes to the door keeper (api/demo-switch.js), which checks the sign-in token and his list on the
   server. Never throws: a dead network is an answer too (status 0). */
const ask = async (body) => {
    try {
        const r = await fetch('/api/demo-switch', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await auth.currentUser.getIdToken() }, body: JSON.stringify(body) });
        return { ...(await r.json().catch(() => ({}))), status: r.status };
    } catch (e) {
        console.error('demo door keeper', e);
        return { ok: false, status: 0, reason: 'the server did not answer' };
    }
};

/* become one of the five: the server checks the list again and hands back that person's sign-in, then a clean start -
   the vault gate and its intro come next, as after any sign-in */
const enterAs = async (p, setBusy) => {
    setBusy(p.tier);
    const j = await ask({ tier: p.tier });
    if (j.ok) {
        try {
            clearGrace();   // the 5-minute vault pass belongs to the person leaving, as on Terminate Session
            await signInWithCustomToken(auth, j.token);
            window.location.reload();
            return;
        } catch (e) { console.error('demo sign-in failed', e); }
    }
    /* the reports come after the reload on purpose: a toast shown right before a reload is destroyed with the page */
    if (j.status === 403) { notify(INVITE_ONLY); await signOut(auth); return; }
    if (!j.ok) console.error('demo sign-in refused', j.status, j.reason);
    notify(DEMO_DOWN);
    setBusy(null);
};

export function DemoDoor({ companyName, onGoogle }) {
    return (
        <div className="kpm-mod gate arrive w-full relative z-10">
            <div className="kpm-head">
                <span className="slot">{companyName || 'KPM Inventory'} · DEMO</span>
                <div className="line"><h3>BY INVITATION</h3></div>
                <p className="kpm-desc">A made-up company on the real app. Sign in with the Google account KPM invited, then pick who to be.</p>
            </div>
            <div className="kpm-demo-door-go">
                <button type="button" onClick={onGoogle} className="kpm-btn key block"><LogIn size={15} /> Sign in with Google</button>
                <p className="kpm-demo-note">Not invited yet? Ask KPM for access.</p>
            </div>
        </div>
    );
}

export function DemoPick() {
    const [busy, setBusy] = useState('check');
    const PEOPLE = people();
    useEffect(() => {
        let live = true;
        ask({}).then(async (j) => {
            if (!live) return;
            if (j.ok) { setBusy(null); return; }
            if (j.status === 403) { notify(INVITE_ONLY); await signOut(auth); return; }
            notify(`The demo could not check your invite (${j.reason || 'the server answered ' + j.status}). Try again in a minute.`);
            await signOut(auth);
        });
        return () => { live = false; };
    }, []);
    return (
        <div className="kpm-dark-island hide-on-print fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-[#050403]">
            {gateCanvasOn() && <VaultGate playing={false} />}
            <div className="kpm-mod gate arrive kpm-demo-door w-full relative z-10">
                <div className="kpm-head">
                    <span className="slot">DEMO · {auth.currentUser?.email}</span>
                    <div className="line"><h3>PICK WHO TO BE</h3></div>
                    <p className="kpm-desc">{busy === 'check' ? 'Checking your invite…' : 'Each card is a real account and opens the app with its own rights.'}</p>
                </div>

                {/* phone + tablet - A, five keys */}
                <div className="kpm-demo-list lg:hidden">
                    {PEOPLE.map((p) => (
                        <button key={p.tier} type="button" className="kpm-demo-row" disabled={!!busy} aria-busy={busy === p.tier} onClick={() => enterAs(p, setBusy)}>
                            <span className="kpm-demo-tier">{p.tier}</span>
                            <span className="grow"><b>{p.role}</b><em>{busy === p.tier ? 'Signing in…' : p.what}</em></span>
                            <span className="go" aria-hidden="true">›</span>
                        </button>
                    ))}
                </div>

                {/* PC - B, five ID badges */}
                <div className="kpm-demo-grid hidden lg:grid">
                    {PEOPLE.map((p) => (
                        <div key={p.tier} className="kpm-demo-badge">
                            <div className="top"><span className="mono">{p.initials}</span><span className="kpm-demo-tier">{p.tier}</span></div>
                            <div><b>{p.name}</b><div className="role">{p.role}</div></div>
                            <em>{p.what}</em>
                            <button type="button" className="kpm-btn key block" disabled={!!busy} aria-busy={busy === p.tier} onClick={() => enterAs(p, setBusy)}>
                                {busy === p.tier ? 'Signing in…' : 'Sign in'}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="kpm-demo-foot">
                    <p className="kpm-demo-keys">Master Vault password <code>{VAULT_PASSWORD}</code></p>
                    <button type="button" className="kpm-demo-out" disabled={busy === 'check'} onClick={() => signOut(auth)}>Use another Google account</button>
                </div>
            </div>
        </div>
    );
}

/* HIS INVITE LIST (T1 only) - add or remove a Google address. The server keeps it; this only shows it. */
function Invites() {
    const [list, setList] = useState(null);
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const run = async (body, done) => {
        setBusy(true);
        const j = await ask(body);
        setBusy(false);
        if (!j.ok) { notify(`Invites: ${j.reason || 'the server answered ' + j.status}.`); return false; }
        setList(j.invites);
        if (done) notify(done);
        return true;
    };
    useEffect(() => { run({ list: true }); }, []);
    const add = async (e) => {
        e.preventDefault();
        const m = email.trim().toLowerCase();
        if (await run({ add: m }, `${m} can open the demo now.`)) setEmail('');
    };
    return (
        <div className="invites">
            <h4>INVITES</h4>
            <form onSubmit={add}>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="their Google email" aria-label="Google email to invite" />
                <button type="submit" className="add" disabled={busy}>ADD</button>
            </form>
            {list === null ? <p>Loading the list…</p>
                : list.length === 0 ? <p>Nobody yet - only you can open the demo.</p>
                : list.map((m) => (
                    <div key={m} className="inv">
                        <span>{m}</span>
                        <button type="button" aria-label={`Remove ${m}`} disabled={busy} onClick={() => run({ remove: m }, `${m} is off the list: no new sign-in. A visit already open ends at the next reset.`)}><X size={15} /></button>
                    </div>
                ))}
        </div>
    );
}

export function DemoBar({ user, inside = true }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(null);
    const PEOPLE = people();
    const email = String(user?.email || '').toLowerCase();
    const me = PEOPLE.find((p) => p.email === email);
    const isT1 = email === POV_OWNER_EMAIL;

    /* the bar is 37 px of the screen: everything the shell already keeps clear of the notch keeps clear of it too */
    useEffect(() => {
        document.documentElement.classList.add('kpm-demo-on');
        return () => document.documentElement.classList.remove('kpm-demo-on');
    }, []);

    const switchTo = (p) => {
        if (p.email === email) { setOpen(false); return; }
        enterAs(p, setBusy);
    };

    const reset = async () => {
        if (!await confirmAction('Reset the demo now? Every change visitors made today goes back to the start, and everyone inside is signed out.')) return;
        setBusy('reset');
        try {
            const r = await fetch('/api/demo-reset', { method: 'POST', headers: { Authorization: 'Bearer ' + await auth.currentUser.getIdToken() } });
            const j = await r.json().catch(() => ({}));
            notify(j.ok ? `Demo reset done: the company is back to the start (${j.wrote} records, ${j.day}).` : `Demo reset failed: ${j.reason || 'the server answered ' + r.status}.`);
        } catch (e) {
            console.error('demo reset failed', e);
            notify('Demo reset failed: the server did not answer.');
        }
        setBusy(null);
    };

    const who = me ? me.name : email;
    const what = me ? `${me.role} (${me.tier})` : isT1 ? 'T1' : 'no role - pick a person under SWITCH';
    return (<>
        <div className="kpm-demo-bar hide-on-print">
            <div className="in">
                <span className="stamp">DEMO</span>
                <span className="who hidden sm:block">You are {who} <span>· {what} · resets every night at 00:05 WIB</span></span>
                <span className="who sm:hidden">{me ? me.tier : isT1 ? 'T1' : 'No role'} <span>· {me ? me.role : 'tap SWITCH'}</span></span>
                <button type="button" className="key" data-mission="switch" aria-expanded={open} onClick={() => setOpen((v) => !v)}>SWITCH</button>
            </div>
            <div className="tape" />
            {open && (<>
                <button type="button" className="scrim" aria-label="Close the list" onClick={() => setOpen(false)} />
                <div className="sheet" role="menu">
                    <h4>TRY ANOTHER PERSON</h4>
                    {PEOPLE.map((p) => (
                        <button key={p.tier} type="button" role="menuitem" className={`row${p.email === email ? ' you' : ''}`} disabled={!!busy} onClick={() => switchTo(p)}>
                            <span className="t">{p.tier}</span>
                            <span><b>{p.role}</b><i>{busy === p.tier ? 'Signing in…' : p.name}</i></span>
                            {p.email === email && <span className="tag">YOU</span>}
                        </button>
                    ))}
                    <div className="foot">A press opens the app as that person. Everything goes back to the start every night at 00:05 WIB.</div>
                    {isT1 && <Invites />}
                    {isT1 && (
                        <button type="button" className="kpm-btn hazard block reset" disabled={!!busy} onClick={reset}>
                            {busy === 'reset' ? 'Resetting…' : 'Reset demo now'}
                        </button>
                    )}
                </div>
            </>)}
        </div>
        {/* the guided mission under this bar (his pick B + the capybara, 2026-10-24/25) - only once inside the app */}
        {inside && <DemoMission me={me} isT1={isT1} people={PEOPLE} />}
    </>);
}
