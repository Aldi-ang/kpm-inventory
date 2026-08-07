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
    return new Promise((resolve) => openGate({ kind: 'confirm', message: String(message ?? ''), resolve }));
}

/* Same story as the confirm, one step worse. A suppressed `prompt` returns null, and every
   caller here reads null as "he cancelled" — so renaming a folder, naming a device or giving a
   rejection reason silently did nothing at all, with no box ever drawn.

   The contract is kept identical to the browser's so the call sites did not have to change
   shape: resolves the typed string on accept (possibly empty) and null on any cancel. Callers
   already guard with `if (name && name.trim())`, and that guard keeps working untouched. */
export function promptAction(message, defaultValue = '') {
    if (!openGate) {
        console.error(
            '[ConfirmGate] <ConfirmHost /> is not mounted — check src/main.jsx. ' +
            'Returning null, which callers read as a cancel.'
        );
        return Promise.resolve(null);
    }
    return new Promise((resolve) => openGate({
        kind: 'prompt',
        message: String(message ?? ''),
        defaultValue: defaultValue == null ? '' : String(defaultValue),
        resolve,
    }));
}

/* Messages already carry their own severity in the text Aldi wrote long before this file, so
   severity is read off the message instead of adding a second argument to all 58 call sites. */
const DANGER = /DANGER|WARNING|PERMANENT|CANNOT BE UNDONE|DELETE|TERMINAT|CRITICAL|SCRUB|⚠️/i;

export function ConfirmHost() {
    const [pending, setPending] = useState(null);
    const panelRef = useRef(null);
    const inputRef = useRef(null);

    /* Guarded deregistration: StrictMode mounts, unmounts and remounts in development, and an
       unguarded cleanup would null out the handler the SECOND mount had already installed,
       leaving every confirm in the app refusing. */
    useEffect(() => {
        const show = (req) => setPending(req);
        openGate = show;
        return () => { if (openGate === show) openGate = null; };
    }, []);

    /* One exit for every path — button, Escape, backdrop — so no route can leave the promise
       hanging and the screen stuck behind a modal. A prompt answers with the typed text or
       null; a confirm answers true or false. React may invoke this updater twice under
       StrictMode, but `cur` is null the second time and resolving a settled promise is a
       no-op, so a double answer cannot reach the caller. */
    const close = useCallback((accepted) => {
        setPending((cur) => {
            if (!cur) return null;
            if (cur.kind === 'prompt') cur.resolve(accepted ? (inputRef.current?.value ?? '') : null);
            else cur.resolve(accepted);
            return null;
        });
    }, []);

    useEffect(() => {
        if (!pending) return;
        /* Focus the field when there is one — he is being asked to type, so put the cursor
           where the typing goes. select() means a rename starts by replacing the old name. */
        if (pending.kind === 'prompt' && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        } else panelRef.current?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); close(false); }
            if (e.key === 'Enter') { e.preventDefault(); close(true); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [pending, close]);

    if (!pending) return null;

    const isPrompt = pending.kind === 'prompt';
    const danger = !isPrompt && DANGER.test(pending.message);
    const accent = danger ? '#b4524a' : '#ff9d00';
    const heading = isPrompt ? 'Type it in' : danger ? 'Confirm — this one is destructive' : 'Confirm';
    const acceptLabel = isPrompt ? 'Save' : danger ? 'Yes, do it' : 'Confirm';

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
                        {heading}
                    </div>
                    {/* pre-line: many of these messages were written with \n\n paragraph breaks
                        back when a browser dialog was rendering them. */}
                    <div className="whitespace-pre-line font-mono text-[11px] leading-relaxed text-[#cfc6ba]">
                        {pending.message}
                    </div>
                    {isPrompt && (
                        <input
                            ref={inputRef}
                            type="text"
                            defaultValue={pending.defaultValue}
                            className="mt-3 w-full border border-[#a89070] bg-[#0d0a09] px-3 py-2 font-mono text-[12px] text-[#f5e6c8] outline-none focus:border-[#ff9d00]"
                        />
                    )}
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
                        {acceptLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmHost;
