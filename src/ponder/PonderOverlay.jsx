/* The scene player.

   WHAT WAS COPIED FROM CREATE MOD'S PONDER, AND WHAT WAS NOT — read from its source
   (Creators-of-Create/Ponder, PonderUI.java + PonderProgressBar.java), not from memory:

     kept  autoplay that runs a beat and then moves on by itself
     kept  a PAUSE that is a real freeze, not a slower speed          (Ponder calls it Identify)
     kept  Replay, restarting the scene from its first beat
     kept  "Comfy Reading" — time stretches while a caption is up, for people who read slower
     kept  a progress bar with a NOTCH per authored beat, clickable to jump to that beat
     kept  the scene HOLDS at its end instead of looping; the end is a state, not a jump cut
     drop  Ponder's arrows move between SCENES, because a Create item owns five or six of them.
           A KPM panel owns exactly one, so the arrows step BEATS here and the timeline scrubs
           them — one job each, rather than two controls doing the same thing.
     drop  identify-by-hover. It needs a stage with real named parts, so it arrives with the
           real table in the next slice, on the same Pause button that already freezes the scene.

   Aldi asked for autoplay *"but also add pause button or timeframe to restart the tutorial"* —
   the pause, the restart and the timeline are all three of those, and they are the three
   controls Ponder itself puts on screen. */
import React, { useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Timer } from 'lucide-react';
import { getScene, getStage } from './registry.js';
import { useScenePlayer } from './useScenePlayer.js';

const reduced = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Terms stay English inside an Indonesian sentence, so they have to LOOK like terms.
   --accent-ink is gold that goes dark in light mode; gold as text on a light ground is the
   palette-law violation this token exists to prevent. */
function Caption({ text }) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) => (p.startsWith('**') && p.endsWith('**')
    ? <b key={i} className="text-accent-ink font-bold">{p.slice(2, -2)}</b>
    : <span key={i}>{p}</span>));
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

export default function PonderOverlay({ sceneId, open, onClose }) {
  const scene = getScene(sceneId);
  const Stage = getStage(scene?.stage);
  const p = useScenePlayer(scene, open);
  const stageRef = useRef(null);

  const step = p.steps[p.index] || null;

  /* The spotlight. Every part of a stage carries a `data-ponder` key; a beat names one and the
     rest of the world steps back. Written straight onto the nodes rather than through a class,
     because Lite Mode strips transitions from everything — a spotlight that existed only as a
     transition would leave the whole stage dimmed on a cheap Android. The end state is the
     truth here; the fade is the decoration, and it is the half that is allowed to disappear. */
  useEffect(() => {
    const root = stageRef.current;
    if (!open || !root || !step) return;
    const key = step.focus || '*';
    const all = Array.from(root.querySelectorAll('[data-ponder]'));
    const hits = key === '*' ? all : all.filter(el => el.dataset.ponder === key);
    const ease = reduced() ? 'none' : 'opacity 240ms cubic-bezier(0.23,1,0.32,1)';
    all.forEach(el => {
      const lit = key === '*' || hits.some(h => h === el || h.contains(el) || el.contains(h));
      el.style.transition = ease;
      el.style.opacity = lit ? '1' : '0.26';
    });
  }, [open, step, p.index]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowRight') { p.seek(p.index + 1); return; }
      if (e.key === 'ArrowLeft') { p.seek(p.index - 1); return; }
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); p.toggle(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, p, onClose]);

  if (!open || !scene || !step) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={scene.title}
         onMouseDown={onClose}
         className="fixed inset-0 z-[9000] flex items-end lg:items-center justify-center
                    bg-[var(--duke-scrim-hi)] backdrop-blur-sm lg:p-6">

      <div onMouseDown={(e) => e.stopPropagation()}
           className="relative w-full min-w-0 lg:max-w-4xl max-h-[92vh] lg:max-h-[86vh]
                      flex flex-col overflow-hidden bg-panel
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
          <button type="button" onClick={onClose} aria-label="Close" title="Close"
            className="shrink-0 h-9 w-9 rounded-lg border border-line-2 bg-raised text-ink-muted
                       hover:text-ink active:scale-[0.97] transition-[transform,color] duration-150 ease-out
                       inline-flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div ref={stageRef} className="bg-inset border-b border-line-2 min-w-0 flex-1 min-h-[160px] lg:min-h-[260px] overflow-y-auto">
          {Stage ? <Stage data={scene.data} step={step} /> : null}
        </div>

        <div className="px-5 py-4 bg-raised min-w-0 min-h-[86px] flex items-start">
          <p className="min-w-0 text-[14px] sm:text-[15px] leading-relaxed text-ink">
            <Caption text={step.text} />
          </p>
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
    </div>
  );
}
