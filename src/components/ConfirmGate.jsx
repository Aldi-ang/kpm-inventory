import { useCallback, useEffect, useRef, useState } from 'react';

/* WHY THIS FILE EXISTS
   ────────────────────
   `window.confirm` returns false WITHOUT drawing anything in a browser where the user has
   ticked "prevent this page from creating more dialogues". Aldi's browser has that setting.

   Every guard written as an `if (!window.confirm(msg)) return;` therefore fails closed AND
   invisibly on his machine: the delete never runs, the request is never sent, the stock is
   never adjusted — and nothing on screen explains why. The app looks like it ignored him.
   This was live in 58 places across 16 files.

   This is the in-page replacement. It is deliberately shaped like the thing it replaces —
   the guard keeps its `if (!...) return;` form and only the call inside it changes — so
   converting the 58 sites stayed mechanical and reviewable. The one extra requirement is
   that the enclosing function is `async`; the build fails loudly when it is not, which is
   the correct place to find that out.

   `integration.audit.mjs` fails the build if the banned call reappears anywhere in src/, and
   asserts the host below is still mounted in main.jsx. The ban is a check, not a comment — a
   comment condemning dialogs once sat nine lines above a live one for weeks. That audit
   strips comments before it matches, so this paragraph is allowed to name what it bans. */

let openGate = null;

/* The host is mounted unconditionally in main.jsx as a sibling of <App />, and the audit
   asserts that line still exists, so this branch is unreachable in a shipped build. If it
   ever is reached, refusing is the safe answer: almost every caller guards a delete, a
   permanent overwrite or a stock deduction, and silently NOT destroying data beats silently
   destroying it. The console error is what makes it findable — the failure this whole file
   exists to kill was the one that printed nothing anywhere. */
export function confirmAction(message) {
    if (!openGate) {
        console.error(
            '[ConfirmGate] <ConfirmHost /> is not mounted — check src/main.jsx. ' +
            'Refusing the action rather than performing it unconfirmed.'
        );
        return Promise.resolve(false);
    }
    return new Promise((resolve) => openGate({ message: String(message ?? ''), resolve }));
}

/* Messages already carry their own severity in the text Aldi wrote long before this file, so
   severity is read off the message instead of adding a second argument to all 58 call sites. */
const DANGER = /DANGER|WARNING|PERMANENT|CANNOT BE UNDONE|DELETE|TERMINAT|CRITICAL|SCRUB|⚠️/i;

export function ConfirmHost() {
    const [pending, setPending] = useState(null);
    const panelRef = useRef(null);

    /* Guarded deregistration: StrictMode mounts, unmounts and remounts in development, and an
       unguarded cleanup would null out the handler the SECOND mount had already installed,
       leaving every confirm in the app refusing. */
    useEffect(() => {
        const show = (req) => setPending(req);
        openGate = show;
        return () => { if (openGate === show) openGate = null; };
    }, []);

    const close = useCallback((answer) => {
        setPending((cur) => { cur?.resolve(answer); return null; });
    }, []);

    useEffect(() => {
        if (!pending) return;
        panelRef.current?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); close(false); }
            if (e.key === 'Enter') { e.preventDefault(); close(true); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [pending, close]);

    if (!pending) return null;

    const danger = DANGER.test(pending.message);
    const accent = danger ? '#b4524a' : '#ff9d00';

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}
        >
            <div
                ref={panelRef}
                tabIndex={-1}
                role="alertdialog"
                aria-modal="true"
                className="w-full max-w-md border border-[#a89070] bg-[#14100e] shadow-[0_0_40px_rgba(0,0,0,0.8)] outline-none"
            >
                <div className="border-l-[3px] px-4 py-3" style={{ borderColor: accent }}>
                    <div
                        className="mb-2 font-mono text-[9.5px] font-black uppercase tracking-[0.16em]"
                        style={{ color: accent }}
                    >
                        {danger ? 'Confirm — this one is destructive' : 'Confirm'}
                    </div>
                    {/* pre-line: many of these messages were written with \n\n paragraph breaks
                        back when a browser dialog was rendering them. */}
                    <div className="whitespace-pre-line font-mono text-[11px] leading-relaxed text-[#cfc6ba]">
                        {pending.message}
                    </div>
                </div>

                <div className="flex gap-2 border-t border-[#3a3128] p-3">
                    <button
                        type="button"
                        onClick={() => close(false)}
                        className="min-h-[44px] flex-1 border border-[#a89070] px-3 font-mono text-[11px] font-black uppercase tracking-wider text-[#cfc6ba] transition-colors hover:bg-[#241d18]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => close(true)}
                        className="min-h-[44px] flex-1 px-3 font-mono text-[11px] font-black uppercase tracking-wider text-[#14100e] transition-opacity hover:opacity-85"
                        style={{ backgroundColor: accent }}
                    >
                        {danger ? 'Yes, do it' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmHost;
