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

const CAPTION_W = 380;   // px, clamped to the stage on narrow screens
const PAD = 6;           // how far the highlight sits outside what it points at
const EST_H = 150;       // assumed caption height, used only to decide above-vs-below

/* Terms stay English inside an Indonesian sentence, so they have to LOOK like terms.
   --accent-ink is gold that goes dark in light mode; gold as text on a light ground is the
   palette-law violation this token exists to prevent. */
function Caption({ text }) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) => (p.startsWith('**') && p.endsWith('**')
    ? <b key={i} className="text-accent-ink font-bold">{p.slice(2, -2)}</b>
    : <span key={i}>{p}</span>));
}

const TONE_EDGE = { ink: 'border-line-3', gold: 'border-accent-edge', danger: 'border-danger-ink' };
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
  const pos = vertical
    ? { top: '50%', transform: 'translateY(-50%)' }
    : { left: (arrow ?? 20) - 8 };
  const inner = vertical
    ? { top: '50%', transform: 'translateY(-50%)' }
    : { left: (arrow ?? 20) - 6.5 };
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
  const [spot, setSpot] = useState(null);

  const step = p.steps[p.index] || null;
  const tone = (step && step.tone) || 'ink';
  const placement = (step && step.at) || 'bottom';

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
    const key = step.focus || '*';
    const all = Array.from(root.querySelectorAll('[data-ponder]'));
    const hits = key === '*' ? [] : all.filter(el => el.dataset.ponder === key);
    const ease = reduced() ? 'none' : 'opacity 240ms cubic-bezier(0.23,1,0.32,1)';
    all.forEach(el => {
      const lit = key === '*' || hits.some(h => h === el || h.contains(el) || el.contains(h));
      el.style.transition = ease;
      el.style.opacity = lit ? '1' : '0.26';
    });
    if (!hits.length) { setSpot(null); return; }
    const base = wrap.getBoundingClientRect();
    const rs = hits.map(el => el.getBoundingClientRect());
    const x = Math.min(...rs.map(r => r.left)) - base.left;
    const y = Math.min(...rs.map(r => r.top)) - base.top;
    const w = Math.max(...rs.map(r => r.right)) - base.left - x;
    const h = Math.max(...rs.map(r => r.bottom)) - base.top - y;
    setSpot({ x, y, w, h });
  }, [step]);

  /* Ponder moves its camera to the subject. The web equivalent is scrolling it into view — and
     it has to happen before the measurement, which is why the measure runs on the scroller's own
     scroll event as well as here. A smooth scroll finishes after this effect does. */
  useLayoutEffect(() => {
    if (!open || !step) return;
    const root = scrollRef.current;
    if (!root) return;
    const key = step.focus || '*';
    if (key !== '*') {
      const first = root.querySelector(`[data-ponder="${key}"]`);
      if (first && typeof first.scrollIntoView === 'function') {
        first.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
      }
    }
    /* Measured SYNCHRONOUSLY, not inside a requestAnimationFrame. A layout effect already runs
       after the DOM is written and before paint, so the rects are valid here — and the rAF
       version silently never ran: its own cleanup cancelled the frame before it could fire, so
       nothing was ever dimmed and no highlight ever appeared. Nothing errored, the captions kept
       playing, and the whole feature was simply absent. The smooth scroll that the rAF was meant
       to wait for is covered by the scroller's own scroll listener below. */
    measure();
  }, [open, step, p.index, measure]);

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

  const leave = useCallback(() => { bookClose(); onClose(); }, [onClose]);

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
    const clampX = (v) => Math.max(12, Math.min(v, Math.max(12, W - boxW - 12)));
    const cx = spot.x + spot.w / 2, cy = spot.y + spot.h / 2;

    if (spot.h > H * 0.42) {
      const boxLeft = cx > W / 2;                       // subject on the right, so stand on the left
      const left = clampX(boxLeft ? spot.x - PAD - 14 - boxW : spot.x + spot.w + PAD + 14);
      return { left, top: Math.max(70, Math.min(cy, H - 70)), boxW, arrow: null,
               dir: boxLeft ? 'right' : 'left', shift: 'translateY(-50%)' };
    }
    const below = spot.y + spot.h + PAD + 14 + EST_H < H;
    const left = clampX(cx - boxW / 2);
    const arrow = Math.max(18, Math.min(cx - left, boxW - 18));
    return {
      left, boxW, arrow,
      top: below ? spot.y + spot.h + PAD + 12 : spot.y - PAD - 12,
      dir: below ? 'up' : 'down',
      shift: below ? 'none' : 'translateY(-100%)',
    };
  }, [spot, placement]);

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
         className="fixed inset-0 z-[9000] flex items-end lg:items-center justify-center
                    bg-[var(--duke-scrim-hi)] backdrop-blur-sm lg:p-6">

      <div onMouseDown={(e) => e.stopPropagation()}
           className="relative w-full min-w-0 lg:max-w-5xl max-h-[92vh] lg:max-h-[88vh]
                      flex flex-col overflow-hidden bg-panel animate-ponder-open
                      border border-line-2 rounded-t-2xl lg:rounded-2xl
                      shadow-[0_1px_1px_rgba(0,0,0,0.20),0_18px_40px_-28px_rgba(0,0,0,0.85)]">

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

        <div ref={wrapRef} className="relative bg-inset border-b border-line-2 min-w-0 flex-1 min-h-[220px] lg:min-h-[300px] overflow-hidden">
          <div ref={scrollRef} className="absolute inset-0 overflow-auto">
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
                    className={`absolute inset-0 rounded-md border-2 ${TONE_EDGE[tone] || TONE_EDGE.ink} animate-ponder-ring`} />
            </div>
          )}

          {/* A caption pinned beside its subject, with a pointer that keeps aiming at it. */}
          {near && (
            <div key={p.index} className="absolute z-30 animate-ponder-in"
                 style={{ left: near.left, top: near.top, width: near.boxW, transform: near.shift, maxHeight: '100%' }}>
              <SpeechBox tone={tone} dir={near.dir} arrow={near.arrow}>{captionBody}</SpeechBox>
            </div>
          )}
        </div>

        {/* The wide bar. Still here, and still used — a beat that is about the whole table has
            nothing to stand beside, and forcing it next to one cell would be a lie about scope.
            It also always carries the text, so a 'near' beat is never the only copy on screen for
            a reader whose eye is somewhere else. */}
        <div key={`bar-${p.index}`} className="px-5 py-4 bg-raised min-w-0 min-h-[86px] flex items-start gap-3 animate-ponder-in">
          <span className={`mt-1.5 h-[3px] w-8 shrink-0 rounded-full ${TONE_RULE[tone] || TONE_RULE.ink}`} />
          {captionBody}
        </div>

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
