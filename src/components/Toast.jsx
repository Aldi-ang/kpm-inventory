import { useCallback, useEffect, useRef, useState } from 'react';
import { isSticky } from '../utils/toastSeverity.js';

/* WHY THIS FILE EXISTS
   ────────────────────
   Same root cause as ConfirmGate.jsx, one file over. A browser told to "prevent this page
   from creating more dialogues" suppresses the message box too — it draws nothing and the
   code carries on. 184 messages across 18 files were reporting through that box: every
   "saved", every "failed to save", every "not enough stock". On Aldi's machine an unknown
   number of them showed him nothing at all, which is the exact failure the whole ConfirmGate
   job existed to kill, still live in the other half of the app.

   This is the in-page replacement. It is deliberately NOT the gate: a question has to be
   answered, so confirmAction returns a promise and its callers had to become async. A report
   has nothing to answer, so notify() returns undefined and is fire-and-forget. That is what
   let all 184 sites convert as a plain textual swap with no async pass anywhere — and
   `return alert(x)`, which several call sites use, keeps working unchanged because both
   return undefined.

   ONE mechanism, matching the gate: a module-level singleton, one host mounted in main.jsx
   as a sibling of <App />, and a plain function call at the call sites. Do not add a second.

   integration.audit.mjs fails the build if the banned call reappears anywhere in src/, if the
   host stops being mounted, if a caller forgets the import, or if this file stops reaching the
   built bundle. The ban is a check, not a comment — a comment condemning dialogs once sat nine
   lines above a live one for weeks. The audit strips comments before it matches, so this
   paragraph is allowed to name what it bans. */

let pushToast = null;
let nextId = 1;

/* Which messages are allowed to disappear on their own lives in src/utils/toastSeverity.js,
   out here where node can import it — src/config/toastSeverity.selfcheck.mjs runs it against
   32 real messages from the app. That is the tuning knob: if he says the toasts nag too much,
   widen the SUCCESS list there and add the message to the self-check, never make the default
   fade. Sticky is the fail-safe direction and the audit asserts this file still asks for it. */
const FADE_MS = 3500;

/* No host mounted means the app cannot report at all. Say so where it is findable, and never
   fall back to the message box — that call is exactly what this file replaced, and reaching
   for it here would reintroduce the silent failure inside its own fix. */
export function notify(message) {
    const text = String(message ?? '');
    if (!pushToast) {
        console.error('[Toast] <ToastHost /> is not mounted — check src/main.jsx. Message lost:', text);
        return undefined;
    }
    pushToast({ id: nextId++, text, sticky: isSticky(text) });
    return undefined;
}

export function ToastHost() {
    const [items, setItems] = useState([]);
    const timers = useRef(new Map());

    const dismiss = useCallback((id) => {
        const t = timers.current.get(id);
        if (t) { clearTimeout(t); timers.current.delete(id); }
        setItems((cur) => cur.filter((i) => i.id !== id));
    }, []);

    /* Guarded deregistration, same reason as the gate: StrictMode mounts, unmounts and remounts
       in development, and an unguarded cleanup would null out the handler the SECOND mount had
       already installed, leaving every message in the app going to console.error instead. */
    useEffect(() => {
        const show = (item) => {
            /* Newest last, and only the five most recent are kept. A loop that reports on every
               row used to queue five hundred blocking boxes; here it would bury the screen. */
            setItems((cur) => [...cur, item].slice(-5));
            if (!item.sticky) {
                timers.current.set(item.id, setTimeout(() => dismiss(item.id), FADE_MS));
            }
        };
        pushToast = show;
        return () => { if (pushToast === show) pushToast = null; };
    }, [dismiss]);

    /* Clear every pending timer on unmount so a fired timeout cannot call setState on a gone
       component. Separate effect: this one must not re-run when dismiss changes identity. */
    useEffect(() => {
        const pending = timers.current;
        return () => { pending.forEach(clearTimeout); pending.clear(); };
    }, []);

    if (items.length === 0) return null;

    return (
        /* pointer-events-none on the column, auto on each strip: the toasts sit over the app,
           and a sale in progress underneath must stay clickable in the gaps between them. */
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[10000] flex flex-col items-center gap-2 p-3">
            {items.map((item) => {
                const accent = item.sticky ? '#b4524a' : '#ff9d00';
                return (
                    <div
                        key={item.id}
                        role={item.sticky ? 'alert' : 'status'}
                        aria-live={item.sticky ? 'assertive' : 'polite'}
                        onClick={() => dismiss(item.id)}
                        className="pointer-events-auto w-full max-w-md cursor-pointer border border-[#a89070] bg-[#14100e] shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                    >
                        <div className="flex items-start gap-3 border-l-[3px] px-3 py-2.5" style={{ borderColor: accent }}>
                            {/* pre-line: many of these messages were written with \n\n paragraph
                                breaks back when a browser box was rendering them. */}
                            <div className="min-w-0 flex-1 whitespace-pre-line break-words font-mono text-[11px] leading-relaxed text-[#cfc6ba]">
                                {item.text}
                            </div>
                            {/* A sticky toast needs something that visibly says "this is waiting
                                on you"; the fading ones clear themselves and get no clutter. */}
                            {item.sticky && (
                                <span
                                    aria-hidden="true"
                                    className="mt-[1px] shrink-0 font-mono text-[13px] font-black leading-none"
                                    style={{ color: accent }}
                                >
                                    ×
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default ToastHost;
