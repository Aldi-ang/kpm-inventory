/* The Ponder engine — one scene, played as a sequence of BEATS.

   WHY THIS IS SHORT, AND CREATE MOD'S IS NOT. Ponder's PonderScene.seekToTime throws on a
   backwards seek, and PonderUI works around it by replaying the scene from t=0 and
   fast-forwarding. It has to: its world is MUTABLE — blocks have already moved, so the only
   way back is to rebuild the world. Ours is not. A beat here is a pure function of its index
   over fixed demo data, so seeking backwards costs nothing and there is no replay-then-skip
   machinery to write at all.

   THE BAR IS WRITTEN STRAIGHT TO THE DOM, never through state. ExamineModal.jsx documents what
   happened the last time a per-frame value went through setState on Aldi's phone: the whole
   subtree re-rendered ~60 times a second and it read as flicker rather than as motion. React
   renders this overlay when the BEAT changes and at no other time while a scene plays. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const DEFAULT_HOLD = 3400;   // ms a beat stays up before autoplay moves on
export const COMFY_FACTOR = 1.8;    // "Comfy Reading" — Ponder stretches time while a caption is up

export function useScenePlayer(scene, open) {
  const steps = useMemo(() => scene?.steps ?? [], [scene]);
  const holds = useMemo(() => steps.map(s => s.hold ?? DEFAULT_HOLD), [steps]);
  const total = useMemo(() => holds.reduce((a, b) => a + b, 0), [holds]);
  /* cumulative start time of each beat — the notch positions on the timeline, and the only
     thing the progress maths needs beyond the current beat's own elapsed time */
  const startOf = useMemo(() => {
    const out = []; let acc = 0;
    for (const h of holds) { out.push(acc); acc += h; }
    return out;
  }, [holds]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [comfy, setComfy] = useState(false);
  const [finished, setFinished] = useState(false);

  const barRef = useRef(null);
  const elapsed = useRef(0);

  const paint = useCallback((ms) => {
    const bar = barRef.current;
    if (bar && total) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, ms / total))})`;
  }, [total]);

  const seek = useCallback((i) => {
    const n = Math.max(0, Math.min(steps.length - 1, i));
    elapsed.current = 0;
    setFinished(false);
    setIndex(n);
  }, [steps.length]);

  const restart = useCallback(() => { seek(0); setPlaying(true); }, [seek]);

  /* Play resumes; play on a scene that already ended starts it over, because there is nothing
     left to resume into and a dead Play button is a control that does not report. */
  const toggle = useCallback(() => {
    if (finished) { restart(); return; }
    setPlaying(p => !p);
  }, [finished, restart]);

  useEffect(() => {
    if (!open) return;
    elapsed.current = 0;
    setIndex(0); setPlaying(true); setFinished(false);
  }, [open, scene?.id]);

  useEffect(() => { paint(startOf[index] ?? 0); }, [index, startOf, paint]);

  useEffect(() => {
    if (!open || !playing || finished || steps.length === 0) return;
    const factor = comfy ? COMFY_FACTOR : 1;
    const hold = holds[index] ?? DEFAULT_HOLD;
    let raf = 0, last = 0;
    const frame = (now) => {
      if (!last) last = now;
      elapsed.current += (now - last) / factor;
      last = now;
      if (elapsed.current >= hold) {
        if (index >= steps.length - 1) {
          elapsed.current = hold;
          paint(total);
          setFinished(true); setPlaying(false);
          return;
        }
        elapsed.current = 0;
        setIndex(index + 1);
        return;
      }
      paint((startOf[index] ?? 0) + elapsed.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [open, playing, finished, index, comfy, holds, startOf, total, steps.length, paint]);

  return { steps, index, playing, comfy, finished, total, startOf, holds, barRef,
           seek, restart, toggle, setComfy };
}
