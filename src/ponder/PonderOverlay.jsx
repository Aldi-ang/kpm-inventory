/* The scene player.

   WHAT WAS COPIED FROM CREATE MOD'S PONDER, AND WHAT WAS NOT — read from its source
   (Creators-of-Create/Ponder, PonderUI.java + PonderProgressBar.java), not from memory:

     kept  autoplay that runs a beat and then moves on by itself
     kept  a PAUSE that is a real freeze, not a slower speed          (Ponder calls it Identify)
     kept  Replay, restarting the scene from its first beat
     kept  "Comfy Reading" — time stretches while a caption is up, for people who read slower
     kept  a progress bar with a NOTCH per authored beat, clickable to jump to that beat
     kept  the scene HOLDS at its end instead of looping; the end is a state, not a jump cut
     kept  **the caption moves to what it is talking about** — Ponder's `.placeNearTarget()` with
           a divot pointing at the block. A caption that never moves stops being read, which is
           what Aldi meant by *"more variative textbox and animation not just static textbox on
           the bottom"*. A beat says `at: 'near'` or `at: 'bottom'` and both are used.
     kept  a drawn highlight around the subject, not only a dimming of everything else
     drop  Ponder's arrows move between SCENES, because a Create item owns five or six of them.
           A KPM panel owns exactly one, so the arrows step BEATS here and the timeline scrubs
           them — one job each, rather than two controls doing the same thing.

   Aldi asked for autoplay *"but also add pause button or timeframe to restart the tutorial"* —
   the pause, the restart and the timeline are all three of those, and they are the three
   controls Ponder itself puts on screen. */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Timer, BookOpen } from 'lucide-react';
import { getScene, getStage } from './registry.js';
import { useScenePlayer } from './useScenePlayer.js';
import { bookClose } from './sfx.js';

const reduced = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const liteOn = () => typeof document !== 'undefined'
  && document.documentElement.classList.contains('lite-mode');

/* Must match `ponder-shut` in tailwind.config.js. The panel unmounts when the timer fires, so a
   number smaller than the animation cuts the exit off and a larger one leaves a frozen panel. */
const SHUT_MS = 240;

const CAPTION_W = 380;   // px, clamped to the stage on narrow screens
const PAD = 6;           // how far the highlight sits outside what it points at
const GAP = 12;          // clear air between the highlight's edge and the caption's pointer
const EST_H = 120;       // first-paint guess ONLY; a real measurement replaces it before paint

/* A beat may focus ONE key or SEVERAL, and the plural case is the one that was missing.

   Aldi's sentence about the intake costs names all three — *"there is no highlights for that 3
   biaya as well"* — but `focus: 'c:cukai'` could only light one of them, so the caption said
   "these three" while the ring marked one. `measure()` already unions the rects of every hit; the
   only single-valued thing in the whole path was the key test. Everything downstream takes a list
   now, and a bare string still means a list of one. */
const focusOf = (step) => {
  const f = step?.focus;
  if (f == null) return ['*'];
  return Array.isArray(f) ? f : [f];
};

/* Terms stay English inside an Indonesian sentence, so they have to LOOK like terms.
   --accent-ink is gold that goes dark in light mode; gold as text on a light ground is the
   palette-law violation this token exists to prevent. */
function Caption({ text }) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) => (p.startsWith('**') && p.endsWith('**')
    ? <b key={i} className="text-accent-ink font-bold">{p.slice(2, -2)}</b>
    : <span key={i}>{p}</span>));
}

/* 🔴 THE RING IS THE POINT OF THE WHOLE SCREEN, so it stopped being a divider colour.
   Aldi, 2026-09-01: *"i want the highlight to be clearer to see"*. `border-line-3` is the grey
   this app draws table rules with — right for a caption's edge, invisible as a spotlight. The
   captions keep the quiet edge; only the ring is loud. */
const TONE_EDGE = { ink: 'border-line-3', gold: 'border-accent-edge', danger: 'border-danger-ink' };
const TONE_RING = { ink: 'border-orange', gold: 'border-gold', danger: 'border-danger-ink' };
const TONE_RULE = { ink: 'bg-line-3', gold: 'bg-orange', danger: 'bg-danger' };

/* Ponder's text windows have a divot aimed at the block they are about. Four directions here
   rather than two, because a caption standing BESIDE a tall column needs to point sideways.

   The pointer is two stacked triangles — the back one a pixel larger, in the border colour — so
   it carries the box's 1px edge round the point. A rotated square would have been shorter and
   would have rotated, and nothing in this app rotates. */
const POINT = {
  up:    { clip: 'polygon(50% 0, 0 100%, 100% 100%)', wrap: 'absolute -top-[9px]',    size: 'h-[10px] w-[16px]' },
  down:  { clip: 'polygon(0 0, 100% 0, 50% 100%)',    wrap: 'absolute -bottom-[9px]', size: 'h-[10px] w-[16px]' },
  left:  { clip: 'polygon(0 50%, 100% 0, 100% 100%)', wrap: 'absolute -left-[9px]',   size: 'h-[16px] w-[10px]' },
  right: { clip: 'polygon(100% 50%, 0 0, 0 100%)',    wrap: 'absolute -right-[9px]',  size: 'h-[16px] w-[10px]' },
};

function SpeechBox({ tone, dir, arrow, children }) {
  const pt = POINT[dir] || POINT.up;
  const vertical = dir === 'left' || dir === 'right';
  /* The pointer is offset in PIXELS along the box's edge on BOTH axes now. It used to sit at
     `top: 50%` on the sideways placements, which meant a caption clamped inside the stage aimed at
     its own middle rather than at its subject — the same lie the horizontal case had already been
     fixed for. It also drops one more `transform` off an animated element, and a transform on one
     of those is what caused the fault this whole pass is about. */
  const pos   = vertical ? { top: (arrow ?? 20) - 8 }   : { left: (arrow ?? 20) - 8 };
  const inner = vertical ? { top: (arrow ?? 20) - 6.5 } : { left: (arrow ?? 20) - 6.5 };
  return (
    <div className="relative">
      <span className={`${pt.wrap} ${pt.size} bg-line-3`} style={{ ...pos, clipPath: pt.clip }} />
      <span className={`${pt.wrap} ${vertical ? 'h-[13px] w-[8px]' : 'h-[8px] w-[13px]'} bg-raised`}
            style={{ ...inner, clipPath: pt.clip,
                     ...(dir === 'up' ? { top: -7 } : dir === 'down' ? { bottom: -7 }
                        : dir === 'left' ? { left: -7 } : { right: -7 }) }} />
      <div className={`px-4 py-3 rounded-xl bg-raised border ${TONE_EDGE[tone] || TONE_EDGE.ink}
                       shadow-[0_1px_1px_rgba(0,0,0,0.20),0_18px_40px_-28px_rgba(0,0,0,0.85)]`}>
        <div className={`h-[3px] w-8 rounded-full mb-2 ${TONE_RULE[tone] || TONE_RULE.ink}`} />
        {children}
      </div>
    </div>
  );
}

function Ctl({ onClick, icon: Icon, label, on = false, wide = false }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} aria-pressed={on}
      className={`inline-flex items-center gap-2 h-9 rounded-lg border active:scale-[0.97]
                  transition-[transform,color,border-color,background-color] duration-150 ease-out
                  ${wide ? 'px-3' : 'w-9 justify-center'}
                  ${on ? 'border-accent-edge bg-inset text-accent-ink'
                       : 'border-line-2 bg-raised text-ink-muted hover:text-ink'}`}>
      <Icon size={15} />
      {wide && <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest">{label}</span>}
    </button>
  );
}

export default function PonderOverlay({ sceneId, open, onClose, onBack }) {
  const scene = getScene(sceneId);
  const Stage = getStage(scene?.stage);
  const p = useScenePlayer(scene, open);

  const wrapRef = useRef(null);     // the visible stage window; every rect is measured against it
  const scrollRef = useRef(null);   // the scroller the stage actually lives in
  const boxRef = useRef(null);      // the near-caption itself, so its height is read and not guessed
  const [spot, setSpot] = useState(null);

  const step = p.steps[p.index] || null;
  const tone = (step && step.tone) || 'ink';
  const placement = (step && step.at) || 'bottom';
  const keys = useMemo(() => focusOf(step), [step]);

  /* Every key any beat explains. Only these parts of the stage are pressable, because a cursor on
     a part no beat covers promises a jump that cannot happen. Stable per scene — and the dependency
     arrays in this file are load-bearing: an unstable object in one of them replayed the entire
     book on every render, once. */
  const jumpable = useMemo(() => {
    const s = new Set();
    for (const st of p.steps) for (const k of focusOf(st)) if (k !== '*') s.add(k);
    return s;
  }, [p.steps]);

  /* 🔴 THE CAPTION'S HEIGHT IS MEASURED, NEVER ASSUMED. `EST_H` was 150 against a real 109, so the
     room test rejected space the box would have fitted in and pushed the caption above its subject
     far more often than it had to. No dep array on purpose: it runs after every render, costs one
     layout read, and settles in a single extra pass because the height only depends on the text and
     a fixed width. The 1px band stops a sub-pixel height from oscillating forever. */
  const [capH, setCapH] = useState(EST_H);
  useLayoutEffect(() => {
    const h = boxRef.current?.offsetHeight;
    if (h && Math.abs(h - capH) > 1) setCapH(h);
  });

  /* THE SPOTLIGHT, and it is two jobs at once.

     Dimming is written straight onto the nodes rather than through a class, because Lite Mode
     strips transitions from everything — a spotlight that existed only as a transition would
     leave the whole stage dimmed on a cheap Android. The end state is the truth; the fade is
     decoration, and decoration is the half allowed to disappear.

     The highlight is the UNION of the direct hits only, never their ancestors: a column key
     matches its header cell, every warehouse cell and the total, and the union of those is a
     neat vertical band down the column — which is the shape that says "this column". Including
     ancestors would union the whole table and say nothing. */
  const measure = useCallback(() => {
    const wrap = wrapRef.current, root = scrollRef.current;
    if (!wrap || !root || !step) return;
    const wide = keys.includes('*');
    const all = Array.from(root.querySelectorAll('[data-ponder]'));
    const hits = wide ? [] : all.filter(el => keys.includes(el.dataset.ponder));
    const ease = reduced() ? 'none' : 'opacity 240ms cubic-bezier(0.23,1,0.32,1)';
    all.forEach(el => {
      const lit = wide || hits.some(h => h === el || h.contains(el) || el.contains(h));
      el.style.transition = ease;
      el.style.opacity = lit ? '1' : '0.26';
      /* The press affordance rides along here because this is the one place that already walks
         every part of the stage — a second walk would be a second thing to keep in step. */
      const canJump = jumpable.has(el.dataset.ponder);
      el.style.cursor = canJump ? 'pointer' : '';
      if (canJump && !el.title) el.title = 'Klik untuk lompat ke penjelasannya';
    });
    if (!hits.length) { setSpot(null); return; }
    const base = wrap.getBoundingClientRect();

    /* 🔴 A RECT IS A *VISUAL* RECT, AND THIS OVERLAY ARRIVES ON A SCALE ANIMATION.
       `animate-ponder-open` opens the modal from `scale(0.94)`, and `getBoundingClientRect()`
       reports what is on screen, not what the layout says — so the first beat measured after the
       overlay opens came back 6% small, and the highlight stayed 6% small because nothing
       re-measured. On Goods Received that left the ring 60px short of Upah bongkar: a box drawn
       around two and a bit fields while the caption said three.

       It healed itself when autoplay reached the next beat ~4s later, which is exactly why it
       survived — the same shape as the other four: a mechanism nobody watched, nothing thrown,
       every check green. Dividing the ancestor's scale back out fixes it at the cause rather than
       at one animation's end event, and keeps `spot` in the same untransformed space that
       `clientWidth`/`clientHeight` below already speak. `offsetWidth` is the layout width, the
       rect's width is the painted one, and their ratio is whatever transform is in play. */
    const kx = wrap.offsetWidth > 0 && base.width > 0 ? base.width / wrap.offsetWidth : 1;
    const ky = wrap.offsetHeight > 0 && base.height > 0 ? base.height / wrap.offsetHeight : 1;

    const rs = hits.map(el => el.getBoundingClientRect());
    const x = (Math.min(...rs.map(r => r.left)) - base.left) / kx;
    const y = (Math.min(...rs.map(r => r.top)) - base.top) / ky;
    const w = (Math.max(...rs.map(r => r.right)) - base.left) / kx - x;
    const h = (Math.max(...rs.map(r => r.bottom)) - base.top) / ky - y;
    setSpot({ x, y, w, h });
  }, [step, keys, jumpable]);

  /* Ponder moves its camera to the subject. The web equivalent is scrolling it into view — and
     it has to happen before the measurement, which is why the measure runs on the scroller's own
     scroll event as well as here.

     🔴 THE SCROLL IS INSTANT, NOT SMOOTH, AND THAT IS THE WHOLE FIX FOR PHONES. Measured in the
     lab at 375px on 2026-08-31: `behavior:'smooth'` moved this scroller by ZERO, twice, 800ms
     apart, while `behavior:'auto'` on the same element in the same frame moved it 0 → 211. The
     stage is 219px tall on a phone against 450px of content, so a subject that never scrolls sits
     at y=353 — below the fold — and `spot` is then measured off-stage. Every downstream piece
     inherits that: the highlight ring is drawn under the floor, the room test in `near` below is
     handed impossible numbers, and the caption lands on the header or past the bottom edge. Six
     beats across two scenes looked like a caption-placement bug and were this one line.

     An instant scroll is also the only kind this effect can use. `measure()` runs synchronously
     three lines down, so an animated scroll is measured before it has moved — the scroll listener
     was the safety net for that, and a smooth scroll that never starts never fires it either.
     Desktop is unaffected: the stage is sized so nothing scrolls there in practice. */
  useLayoutEffect(() => {
    if (!open || !step) return;
    const root = scrollRef.current;
    if (!root) return;
    const first = keys.includes('*') ? null
      : keys.map(k => root.querySelector(`[data-ponder="${k}"]`)).find(Boolean);
    if (first && typeof first.scrollIntoView === 'function') {
      first.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    }
    /* Measured SYNCHRONOUSLY, not inside a requestAnimationFrame. A layout effect already runs
       after the DOM is written and before paint, so the rects are valid here — and the rAF
       version silently never ran: its own cleanup cancelled the frame before it could fire, so
       nothing was ever dimmed and no highlight ever appeared. Nothing errored, the captions kept
       playing, and the whole feature was simply absent. The smooth scroll that the rAF was meant
       to wait for is covered by the scroller's own scroll listener below. */
    measure();
  }, [open, step, keys, p.index, measure]);

  useEffect(() => {
    if (!open) return;
    const root = scrollRef.current;
    let raf = 0;
    const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    root?.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);

    /* 🔴 A BEAT WITH AN `act` CHANGES THE LAYOUT AFTER IT IS MEASURED. The drawer opens on a
       300ms grid-template-rows transition, so a highlight measured in the layout effect lands
       where the row WAS and then sits there while the table moves out from under it — a box
       outlining a product that is no longer at those coordinates, which reads as the tutorial
       pointing at the wrong thing. Watching the stage for size changes re-measures all the way
       through the animation, so the box travels with the row instead of guessing where it lands.
       It also covers a late font load and a container that resizes for any other reason. */
    let ro = null;
    if (root && typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(onMove);
      ro.observe(root);
      if (root.firstElementChild) ro.observe(root.firstElementChild);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      root?.removeEventListener('scroll', onMove);
      window.removeEventListener('resize', onMove);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  /* 🔴 THE PANEL HAS TO STILL BE THERE WHILE THE CLOSING SOUND PLAYS. Aldi, 2026-08-31: *"when i
     close the ponder panel it should return to the closed book animation, right now the panel is
     just gone but the book close SFX is there"*. `leave` used to call `onClose()` in the same tick,
     the parent set its scene to null, and the render below returned null on the next frame — so
     `bookCloseS` played over an empty screen. The exit is the arrival reversed, which is the same
     shape the little book already uses: it returns to the size and place it grew from.

     Lite Mode and reduced motion skip it entirely and close on the spot, the same rule the book
     follows — his call there: *"for lite mode then snap the book and close it right back thats
     fine"*. No animation is constructed, not a fast one, none.

     `closingRef` is what stops a second press during the 240ms from queueing a second `onClose`,
     and the timer is cleared on unmount so a scene closed by its parent cannot set state after. */
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const shutTimer = useRef(null);

  const leave = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    bookClose();
    if (liteOn() || reduced()) { onClose(); return; }
    setClosing(true);
    shutTimer.current = setTimeout(onClose, SHUT_MS);
  }, [onClose]);

  /* Reset when the parent opens a scene again — including the case where it swapped scenes while
     this one was still shutting, which would otherwise open the next one already mid-exit. */
  useEffect(() => {
    if (open) { closingRef.current = false; setClosing(false); }
    return () => { if (shutTimer.current) clearTimeout(shutTimer.current); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { leave(); return; }
      if (e.key === 'ArrowRight') { p.seek(p.index + 1); return; }
      if (e.key === 'ArrowLeft') { p.seek(p.index - 1); return; }
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); p.toggle(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, p, leave]);

  /* WHERE A 'near' CAPTION SITS, and the tall-subject case is the one that matters.

     A column highlight is nearly the full height of the stage. There is no room above it and none
     below, so the first version put the box over the table header and the caption sat on top of
     the very numbers it was describing. A tall subject gets the caption BESIDE it instead, on
     whichever side has room — which is what Ponder does when a block is too big to caption under.

     The pointer is positioned separately from the box on purpose: the box gets clamped inside the
     stage, the pointer keeps aiming at the subject's centre, and only doing both makes a clamped
     caption still say what it is about. */
  const near = useMemo(() => {
    const wrap = wrapRef.current;
    if (!spot || placement !== 'near' || !wrap) return null;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    const boxW = Math.min(CAPTION_W, W - 24);
    const boxH = Math.min(capH, H - 24);
    /* 🔴 A PHONE HAS NO ROOM FOR A CAPTION BESIDE ANYTHING, SO IT DOES NOT GET ONE.
       `boxW` is `min(380, W - 24)`, which on a 375px screen is 349 of 373 — 94% of the stage. A box
       that wide has no free column to sit in and no honest "above" or "below" on a 219px stage
       either, so every placement it can choose lands on the subject. Measured at 375px on
       2026-08-31: beats 5, 6, 8, 9 of Product Performance and 18, 19 of Stock by Warehouse each
       covered the ring they were pointing at. Handing those beats back to the wide bottom bar is
       not a downgrade — the bar IS the phone layout, and beats 1, 7, 10 and 12 already read fine
       through it. Desktop is untouched: 380 of ~1000 never trips this. */
    if (boxW > W * 0.7) return null;
    const clampX = (v) => Math.max(12, Math.min(v, Math.max(12, W - boxW - 12)));
    const clampY = (v) => Math.max(12, Math.min(v, Math.max(12, H - boxH - 12)));
    const cx = spot.x + spot.w / 2, cy = spot.y + spot.h / 2;

    /* 🔴 THE ROOM TEST HAS TO ASK BOTH DIRECTIONS BEFORE CHOOSING ONE.
       The earlier version only asked "does it fit below?" and went above whenever it did not —
       including when there was no room above either. A field near the bottom of a short stage then
       got its caption sliced in half by the stage's own edge. When neither side has room the
       caption stands BESIDE the subject, where the only limit is the stage's full height. */
    const roomBelow = H - (spot.y + spot.h + PAD + GAP);
    const roomAbove = spot.y - PAD - GAP;

    /* 🔴 EVERY BRANCH RETURNS A FINAL `top`, AND NOT ONE OF THEM ASKS FOR A TRANSFORM.
       This is the bug Aldi photographed — *"the textbox block the view for the 3 biaya"* — and it
       was never the room test. The box carries `animate-ponder-in`, whose last keyframe is
       `transform: none` under fill-mode `both`; an animation outranks an inline style, so the
       `translateY(-100%)` that turned this coordinate into the box's BOTTOM edge was thrown away
       the instant the 260ms arrival finished. The box then hung downward from a number meant for
       its bottom and sat straight on top of the field it was describing — every 'above' caption,
       every 'beside' caption, in every scene. Nothing threw, and all 657 checks stayed green.
       Geometry that has to survive an animation goes in `top`, never in `transform`. */
    if (spot.h > H * 0.42 || (roomBelow < boxH && roomAbove < boxH)) {
      const boxLeft = cx > W / 2;                       // subject on the right, so stand on the left
      const left = clampX(boxLeft ? spot.x - PAD - 14 - boxW : spot.x + spot.w + PAD + 14);
      const top = clampY(cy - boxH / 2);
      return { left, top, boxW, dir: boxLeft ? 'right' : 'left',
               arrow: Math.max(18, Math.min(cy - top, boxH - 18)) };
    }
    const below = roomBelow >= boxH;
    const left = clampX(cx - boxW / 2);
    return {
      left, boxW,
      top: below ? spot.y + spot.h + PAD + GAP : spot.y - PAD - GAP - boxH,
      dir: below ? 'up' : 'down',
      arrow: Math.max(18, Math.min(cx - left, boxW - 18)),
    };
  }, [spot, placement, capH]);

  /* JOB 4 — press a part of the stage, jump to the beat that explains it.
     *"i want to be able to press the each of the components inside the ponder panel and when
     pressed it will snap back to the timeframe where that components is explained"*.
     The FIRST beat naming the key wins: a part explained twice is introduced once and referred back
     to later, and the introduction is what someone pressing it is asking for. Seeking keeps playing,
     exactly as the timeline notches do — two controls doing the same thing should do it the same. */
  const jumpTo = useCallback((e) => {
    const el = e.target?.closest?.('[data-ponder]');
    const k = el?.dataset.ponder;
    if (!k) return;
    const i = p.steps.findIndex(s => focusOf(s).includes(k));
    if (i >= 0) p.seek(i);
  }, [p.steps, p.seek]);

  if (!open || !scene || !step) return null;

  const captionBody = (
    <p className="min-w-0 text-[13.5px] sm:text-[15px] leading-relaxed text-ink">
      <Caption text={step.text} />
    </p>
  );

  /* 🔴 PORTALLED TO document.body, AND THIS IS NOT TIDINESS.

     `position: fixed` measures against the viewport ONLY while no ancestor creates a containing
     block. `backdrop-filter` does — and the app's top bar is glass. Rendered in place, this
     overlay resolved its `inset-0` against a 90px strip of chrome and shipped as a torn ribbon
     across the header, which is exactly how Aldi received it: *"the book is broken bruh"*.
     The lab never showed it because the lab has no glass ancestor. A component that can be
     mounted anywhere must not assume anything about where. */
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={scene.title}
         onMouseDown={leave}
         className={`fixed inset-0 z-[9000] flex items-end lg:items-center justify-center
                    bg-[var(--duke-scrim-hi)] backdrop-blur-sm lg:p-6
                    ${closing ? 'opacity-0 transition-opacity duration-200 ease-in' : ''}`}>

      <div onMouseDown={(e) => e.stopPropagation()}
           /* 🔴 THE SHEET TAKES THE HEIGHT IT IS GIVEN. Aldi, 2026-09-01, from his iPhone:
              *"ponder looks really bad on the phone ... the ponder panel is cutted in half"*.
              Measured at 375x812: the panel was content-height, 522px, pinned to the bottom — so
              283px of the screen above it was empty scrim, and the demo window below was 206px
              tall holding 248px of picture, which is the half he could not see. `h-[92vh]` on the
              phone lets the column hand the leftover height to the stage, which is `flex-1`.
              The desk is untouched: `lg:h-auto` puts it straight back on its own rules. */
           className={`relative w-full min-w-0 lg:max-w-5xl h-[92vh] lg:h-auto max-h-[92vh] lg:max-h-[88vh] lg:min-h-[700px]
                      flex flex-col overflow-hidden bg-panel ${closing ? 'animate-ponder-shut' : 'animate-ponder-open'}
                      border border-line-2 rounded-t-2xl lg:rounded-2xl
                      shadow-[0_1px_1px_rgba(0,0,0,0.20),0_18px_40px_-28px_rgba(0,0,0,0.85)]`}>

        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-line-2">
          <span className="h-10 w-10 rounded-xl bg-raised border border-line-2 flex items-center justify-center shrink-0">
            <Timer size={18} className="text-accent-ink" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg sm:text-xl font-black text-ink uppercase tracking-[0.14em] leading-none">{scene.title}</h3>
            <div className="h-[3px] w-10 bg-orange rounded-full mt-2" />
            <p className="text-[12px] text-ink-muted mt-2 leading-snug">{scene.blurb}</p>
          </div>
          {onBack && (
            <button type="button" onClick={onBack} aria-label="Back to the book" title="Back to the book"
              className="shrink-0 h-9 w-9 rounded-lg border border-line-2 bg-raised text-ink-muted
                         hover:text-accent-ink active:scale-[0.97] transition-[transform,color] duration-150 ease-out
                         inline-flex items-center justify-center">
              <BookOpen size={16} />
            </button>
          )}
          <button type="button" onClick={leave} aria-label="Close" title="Close"
            className="shrink-0 h-9 w-9 rounded-lg border border-line-2 bg-raised text-ink-muted
                       hover:text-ink active:scale-[0.97] transition-[transform,color] duration-150 ease-out
                       inline-flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        {/* 🔴 THE STAGE WINDOW IS SIZED SO THE SCENE FITS INSIDE IT, RATHER THAN SCROLLING.
            *"dont make the ponder panel slideable so that the text box is fixed"*. A caption is
            positioned against the stage window while its subject lives in the scroller, so any
            scroll slides the subject out from under a box that stays put. Goods Received overflowed
            by 27px at his window size — enough to drift, not enough to notice as a scrollbar.
            The modal is tall enough for the tallest stage now, INCLUDING the beats that also show
            the wide bottom bar, so nothing scrolls in practice. `overflow-auto` stays as the safety
            net for a phone or a short window: locking it instead would have made anything below the
            fold unreachable, which is a worse bug than the one being fixed. */}
        <div ref={wrapRef} className="relative bg-inset border-b border-line-2 min-w-0 flex-1 min-h-[220px] lg:min-h-[300px] overflow-hidden">
          <div ref={scrollRef} onClick={jumpTo} className="absolute inset-0 overflow-auto">
            {Stage ? <Stage scene={scene} step={step} stepIndex={p.index} /> : null}
          </div>

          {/* THE HIGHLIGHT. It slides to the next subject rather than blinking there, so the eye
              follows it — the same reason Ponder moves its camera instead of cutting.
              ponytail: left/top/width/height are transitioned rather than transform, which is
              normally the wrong choice. It is one absolutely-positioned element with no children
              to reflow, and the alternative is measuring a scale factor per axis for a box that
              changes aspect ratio every beat. Revisit only if a profile says this costs. */}
          {spot && (
            <div className="pointer-events-none absolute z-20"
                 style={{
                   left: spot.x - PAD, top: spot.y - PAD, width: spot.w + PAD * 2, height: spot.h + PAD * 2,
                   transition: reduced() ? 'none'
                     : 'left 300ms cubic-bezier(0.23,1,0.32,1), top 300ms cubic-bezier(0.23,1,0.32,1), width 300ms cubic-bezier(0.23,1,0.32,1), height 300ms cubic-bezier(0.23,1,0.32,1)',
                 }}>
              {/* keyed on the beat so it re-mounts and replays its arrival. A 1px edge, never a
                  fill: amber is an edge and an ink in this app, and it is not a fill. */}
              <span key={p.index}
                    className={`absolute inset-0 rounded-md border-2 ${TONE_RING[tone] || TONE_RING.ink} animate-ponder-ring`} />
            </div>
          )}

          {/* A caption pinned beside its subject, with a pointer that keeps aiming at it. */}
          {near && (
            <div key={p.index} ref={boxRef} className="absolute z-30 animate-ponder-in"
                 style={{ left: near.left, top: near.top, width: near.boxW }}>
              <SpeechBox tone={tone} dir={near.dir} arrow={near.arrow}>{captionBody}</SpeechBox>
            </div>
          )}
        </div>

        {/* 🔴 THE WIDE BAR IS A FALLBACK NOW, NOT A SECOND COPY. It used to print the same
            sentence that was already floating beside the highlight, so every 'near' beat said
            everything twice and the eye had to decide which one to read. Aldi: *"i think u can
            remove this bottom static text on the tutorial"*. It still exists, because a beat about
            the WHOLE table has nothing to stand beside and forcing it next to one cell would be a
            lie about scope — it simply no longer duplicates. */}
        {!near && (
        <div key={`bar-${p.index}`} className="px-5 py-4 bg-raised min-w-0 min-h-[86px] flex items-start gap-3 animate-ponder-in">
          <span className={`mt-1.5 h-[3px] w-8 shrink-0 rounded-full ${TONE_RULE[tone] || TONE_RULE.ink}`} />
          {captionBody}
        </div>
        )}

        {/* The timeline. A 3px rule whose LENGTH is the data — the one gold fill the amber law
            leaves standing, and the same shape as the rule under the panel title. The notches
            are authored beats, exactly as Ponder only lets you scrub to a marked keyframe. */}
        <div className="relative h-[3px] bg-inset">
          <div ref={p.barRef} style={{ transformOrigin: 'left', transform: 'scaleX(0)' }}
               className="absolute inset-0 bg-orange rounded-full" />
          {p.steps.map((s, i) => (
            <button key={i} type="button" onClick={() => p.seek(i)}
              aria-label={`Step ${i + 1}`} title={`Step ${i + 1}`}
              style={{ left: `${p.total ? (p.startOf[i] / p.total) * 100 : 0}%` }}
              className="absolute -top-2 h-7 w-4 -translate-x-1/2 flex items-center justify-center group">
              <span className={`h-[9px] w-[2px] rounded-full transition-colors duration-150
                                ${i <= p.index ? 'bg-orange' : 'bg-line-2'} group-hover:bg-accent-ink`} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 min-w-0 px-4 sm:px-5 py-3 border-t border-line-2 bg-panel">
          <Ctl onClick={p.restart} icon={RotateCcw} label="Restart" wide />
          <Ctl onClick={() => p.seek(p.index - 1)} icon={ChevronLeft} label="Previous" />
          <Ctl onClick={p.toggle} icon={p.playing ? Pause : Play} label={p.playing ? 'Pause' : 'Play'} wide />
          <Ctl onClick={() => p.seek(p.index + 1)} icon={ChevronRight} label="Next" />
          <div className="flex-1" />
          <Ctl onClick={() => p.setComfy(v => !v)} icon={Timer} label="Comfy reading" on={p.comfy} wide />
          <span className="font-mono text-[10px] text-ink-muted tracking-widest tabular-nums shrink-0">
            {p.index + 1} / {p.steps.length}
          </span>
        </div>

      </div>
    </div>,
    document.body
  );
}
