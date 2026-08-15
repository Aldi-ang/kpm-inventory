import React, { useCallback, useEffect, useRef, useState } from 'react';

/* HOLD TO CONFIRM — the confirmation the pasted "interactive hover button" did not have.
   His ask, 2026-08-15: *"u are right regarding no confirmation, i think u can use the design skill
   to make one, make it natural and HD and smooth and still align with our theme"*.

   🔑 WHY A HOLD AND NOT A SECOND DIALOG. The act this guards has no undo, so the gate has to cost
   something the hand notices. A dialog costs one more click, which a thumb does by reflex; 1.6s of
   deliberate pressure cannot be done by accident, and it is over before it feels slow. It also
   keeps the report in the same object he pressed — his own law, *every action must report* — rather
   than throwing the answer to a toast in the corner.

   ⚠️ THIS DOES NOT REPLACE `confirmAction`. The wipe path still runs its own two dialogs; the hold
   is an extra gate in front of them, never a substitute. Anything that removes a confirmation is
   his call to make explicitly, not a side effect of a nicer button.

   The paint is entirely in theme.css (`.kpm-hold`) — a clip-path fill that sweeps across, which is
   the one progress affordance that survives Lite Mode: no shadow, no blur, no filter.

   Reusable on purpose, per his instruction when the control system was built: *"make sure that the
   logic and theme and button design and animation that we made here could be use for button in
   another place so design it well"*. */

const HOLD_MS = 1600;
const DONE_MS = 1800;

export default function HoldButton({
  onConfirm,
  children,
  holdLabel = 'Keep holding…',
  workingLabel = 'Working…',
  doneLabel = 'Done',
  className = '',
  ...rest
}) {
  const [phase, setPhase] = useState('idle'); // idle | arming | working | done
  const timer = useRef(null);
  const revert = useRef(null);
  const alive = useRef(true);
  /* keydown repeats while a key is held down; without this the timer restarts every repeat and the
     fill never finishes, which reads as "the button is broken". */
  const keyHeld = useRef(false);

  useEffect(() => () => {
    alive.current = false;
    clearTimeout(timer.current);
    clearTimeout(revert.current);
  }, []);

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    setPhase(p => (p === 'arming' ? 'idle' : p));
  }, []);

  const fire = useCallback(async () => {
    setPhase('working');
    /* the handler owns its own reporting — every one of these already raises a toast on failure,
       and swallowing it a second time here would print the same thing twice. What this catch is
       for is making sure the BUTTON always leaves `working`, even on a throw; a control stuck on
       "Working…" is the silence his first law exists to prevent. */
    try { await onConfirm?.(); } catch (e) { console.error('HoldButton action failed', e); }
    /* the component can unmount during onConfirm — a wipe re-renders the screen under it */
    if (!alive.current) return;
    setPhase('done');
    revert.current = setTimeout(() => { if (alive.current) setPhase('idle'); }, DONE_MS);
  }, [onConfirm]);

  const start = useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('arming');
    timer.current = setTimeout(fire, HOLD_MS);
  }, [phase, fire]);

  const label =
    phase === 'arming' ? holdLabel :
    phase === 'working' ? workingLabel :
    phase === 'done' ? doneLabel : children;

  return (
    <button
      type="button"
      className={`kpm-hold ${className}`}
      data-phase={phase}
      aria-live="polite"
      /* the hold IS the affordance, so it has to be announced rather than discovered */
      aria-description="Press and hold to confirm"
      disabled={phase === 'working'}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); start(); }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (keyHeld.current) return;
        keyHeld.current = true;
        start();
      }}
      onKeyUp={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        keyHeld.current = false;
        cancel();
      }}
      onBlur={() => { keyHeld.current = false; cancel(); }}
      {...rest}
    >
      <span className="fill" aria-hidden="true" />
      <span className="word">{label}</span>
    </button>
  );
}
