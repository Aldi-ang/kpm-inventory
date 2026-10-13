/* THE DEMO'S FRONT DOOR AND ITS SWITCH BAR - rendered by BiohazardTheme.jsx in the demo build only (IS_DEMO).
   His picks, 2026-10-13, from A-Brain Raw/2026-10-13-demo-door/: *"A for phone B for pc for decide 1, decide 2 is A"*.
     DemoDoor - signed out. Phone and tablet: five keys, one row per person (A). PC (lg): five ID badges (B).
                Each one is a REAL account (api/_demoCompany.js makes them, the nightly reset sets them back),
                so the rules apply for real and a visitor sees exactly what that tier can and cannot do.
     DemoBar  - signed in. One line on top: DEMO, who you are, when it resets, SWITCH (A). A switch signs out
                and signs in as the other person - never T1, which is his Gmail alone.
   Every string here is demo-only: src/config/demoBuild.check.mjs proves the real bundle carries none of it. */
import React, { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { LogIn } from 'lucide-react';
import { auth } from '../config/firebase';
import { LOGINS, LOGIN_PASSWORD, VAULT_PASSWORD } from '../config/demoLogins.js';
import { POV_OWNER_EMAIL } from '../config/povPreview.js';
import { clearGrace } from '../utils/vaultGrace.js';
import { notify } from './Toast.jsx';
import { confirmAction } from './ConfirmGate.jsx';

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

export function DemoDoor({ companyName, onGoogle }) {
    const [busy, setBusy] = useState(null);
    const PEOPLE = people();
    const enter = async (p) => {
        setBusy(p.tier);
        try {
            await signInWithEmailAndPassword(auth, p.email, LOGIN_PASSWORD);
            /* no state here: the app's sign-in listener takes over and this door unmounts */
        } catch (e) {
            console.error('demo sign-in failed', e);
            notify(DEMO_DOWN);
            setBusy(null);
        }
    };
    return (
        <div className="kpm-mod gate arrive kpm-demo-door w-full relative z-10">
            <div className="kpm-head">
                <span className="slot">{companyName || 'KPM Inventory'} · DEMO</span>
                <div className="line"><h3>PICK WHO TO BE</h3></div>
                <p className="kpm-desc">A made-up company on the real app. Each card is a real account and signs you in with its own rights.</p>
            </div>

            {/* phone + tablet - A, five keys */}
            <div className="kpm-demo-list lg:hidden">
                {PEOPLE.map((p) => (
                    <button key={p.tier} type="button" className="kpm-demo-row" disabled={!!busy} aria-busy={busy === p.tier} onClick={() => enter(p)}>
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
                        <button type="button" className="kpm-btn key block" disabled={!!busy} aria-busy={busy === p.tier} onClick={() => enter(p)}>
                            {busy === p.tier ? 'Signing in…' : 'Sign in'}
                        </button>
                    </div>
                ))}
            </div>

            <div className="kpm-demo-foot">
                <p className="kpm-demo-keys">Password for all five <code>{LOGIN_PASSWORD}</code><br />Master Vault password <code>{VAULT_PASSWORD}</code></p>
                <div>
                    <div className="kpm-demo-or">OR</div>
                    <button type="button" onClick={onGoogle} disabled={!!busy} className="kpm-btn key block"><LogIn size={15} /> Sign in with Google</button>
                    <p className="kpm-demo-note">Google opens the app with no role. Use a card above to try it.</p>
                </div>
            </div>
        </div>
    );
}

export function DemoBar({ user }) {
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

    const switchTo = async (p) => {
        if (p.email === email) { setOpen(false); return; }
        setBusy(p.tier);
        try {
            clearGrace();   // the 5-minute vault pass belongs to the person leaving, as on Terminate Session
            await signOut(auth);
            await signInWithEmailAndPassword(auth, p.email, LOGIN_PASSWORD);
            window.location.reload();   // a clean start as the new person - the same way Terminate Session ends
        } catch (e) {
            console.error('demo switch failed', e);
            notify(DEMO_DOWN);
            setBusy(null);
        }
    };

    const reset = async () => {
        if (!await confirmAction('Reset the demo now? Every change visitors made today goes back to the start.')) return;
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
    return (
        <div className="kpm-demo-bar hide-on-print">
            <div className="in">
                <span className="stamp">DEMO</span>
                <span className="who hidden sm:block">You are {who} <span>· {what} · resets every night at 00:05 WIB</span></span>
                <span className="who sm:hidden">{me ? me.tier : isT1 ? 'T1' : 'No role'} <span>· {me ? me.role : 'tap SWITCH'}</span></span>
                <button type="button" className="key" aria-expanded={open} onClick={() => setOpen((v) => !v)}>SWITCH</button>
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
                    <div className="foot">A press signs you out, then in as that person. Everything goes back to the start every night at 00:05 WIB.</div>
                    {isT1 && (
                        <button type="button" className="kpm-btn hazard block reset" disabled={!!busy} onClick={reset}>
                            {busy === 'reset' ? 'Resetting…' : 'Reset demo now'}
                        </button>
                    )}
                </div>
            </>)}
        </div>
    );
}
