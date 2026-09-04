/* THE FIELD TERMINAL — the tutorial index on a phone.

   A phone cannot show a book spread: two facing pages on a 380px screen is four columns of
   nothing. Ten rounds of drafting with Aldi settled on an instrument panel instead — a milled
   slate housing, a display in the middle, the section rail down the right edge, a read-meter down
   the left. **The PC keeps the book.** His instruction, 2026-09-03: *"its for phone only"*.

   WHAT HE DECIDED, so a later session does not re-open any of it:
     · the panel ARRIVES with Scan in — a bright bar crosses the screen and leaves the terminal
       behind it, the parts lighting while the bar is still travelling
     · it LEAVES with Deploy's shut — picture squeezes to a scanline, slab folds to a bar, the bar
       snaps back to the chip you pressed
     · both halves are SLOW: *"make both intro and outro of the animation slow, not too fast so
       that user eyes can enjoy the animation"*, and then *"cinematic look the best"* — 2,5x
     · one lit colour, the app's amber #F59E0B
     · an X on the machine's own status strip; the pad had no close control before

   PACE IS ONE NUMBER. Every duration and stagger in pad.css is a base value times `--pp-t`, and
   `PACE` below is what sets it. Re-tuning the whole sequence is this one constant — and because
   the gaps scale with the durations, slowing it never turns a cascade into separate blinks. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SECTIONS, getScene } from './registry.js';
import { bookPick, padKey } from './sfx.js';
import './pad.css';

/* 🔴 THE ONE PACE DIAL. Aldi picked "cinematic" on 2026-09-03.

   `--pp-t` in pad.css carries the same number and drives every animation; this constant drives
   the JS timers that decide when a phase ENDS. They must be equal, so the integration audit reads
   both files and pins them together — a mismatch means the code strips a class part-way through
   the animation it started, which reads as broken rather than as slow. */
export const PACE = 2.5;

/* Base timings in ms at pace 1, matching pad.css exactly.
   ARRIVE_BASE is the LAST animation's delay plus its duration — the entry write-on, 6*42 + 490 +
   190 — and not the headline figure. Getting that wrong snaps the final rows on while they are
   still writing, which is what the prototype did before it was measured. */
const ARRIVE_BASE = 932;
const LEAVE_BASE  = 380;
const SWAP_OUT_MS = 170;   /* the section crossfade is NOT paced — see pad.css */
/* `pp-in` outlives the .14s crossfade on purpose, because it also scopes the section's write-on:
   the last block starts at 6*40 + 80 and runs 300, so the class comes off at 620. Taking it off
   with the crossfade cuts the writing mid-sweep and leaves the tail of the panel clipped. */
const SWAP_WRITE_MS = 620;

const liteOn = () => typeof document !== 'undefined'
  && document.documentElement.classList.contains('lite-mode');
const reduced = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Lite Mode and reduced motion both mean "no flight": the pad is simply there. */
const instant = () => liteOn() || reduced();

const pad2 = (n) => (n < 10 ? '0' : '') + n;

/* THE TITLE DECODES out of a technical glyph set — what a machine looks like while it is still
   working out what it is about to print. Spaces are never scrambled, so the shape of the words
   holds the whole way through and it reads as text resolving rather than as noise.

   Driven by setInterval and NOT requestAnimationFrame, deliberately: rAF does not fire while a
   preview pane's document timeline is stalled, which strands the title mid-scramble and looks
   exactly like a bug. Discrete 32ms steps suit a decode anyway. */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>[]{}';

function useDecode(text, active) {
  const [out, setOut] = useState(text);
  const timerRef = useRef(null);
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!active || instant()) { setOut(text); return undefined; }
    const t0 = Date.now(), len = text.length, ms = 420;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / ms);
      const settled = Math.floor(p * len);
      let s = '';
      for (let i = 0; i < len; i++) {
        const c = text.charAt(i);
        s += (i < settled || c === ' ') ? c : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
      }
      setOut(s);
      if (p >= 1) { clearInterval(timerRef.current); setOut(text); }
    };
    tick();
    timerRef.current = setInterval(tick, 32);
    return () => clearInterval(timerRef.current);
  }, [text, active]);
  return out;
}

export default function PonderPad({ initialSection, onClose, onPick }) {
  const startAt = Math.max(0, SECTIONS.findIndex((s) => s.id === initialSection));
  const [cur, setCur] = useState(startAt);
  /* IN-SESSION ONLY, never stored. The book is forbidden from remembering who has read what —
     Aldi, 2026-08-27: *"dont push newcomer towards the scene let them figure out by pressing the
     tutorial button"* — and a meter that persists across visits is the same idea through a
     different door. It reports this visit and nothing else. */
  const [read, setRead] = useState(() => ({ [SECTIONS[startAt].id]: true }));
  const [phase, setPhase] = useState(() => (instant() ? 'settled' : 'arrive'));
  const [swap, setSwap] = useState('');       /* '' | 'out' | 'in' */
  const [writing, setWriting] = useState(true);

  const rootRef = useRef(null);
  const timers = useRef([]);
  const later = useCallback((fn, ms) => { timers.current.push(setTimeout(fn, ms)); }, []);
  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout); timers.current = [];
  }, []);
  useEffect(() => clearAll, [clearAll]);

  const section = SECTIONS[cur];
  const title = useDecode(section.label, writing);

  const totals = useMemo(() => {
    let all = 0, ready = 0;
    SECTIONS.forEach((s) => s.entries.forEach((e) => {
      all += 1;
      if (!e.soon && getScene(e.sceneId)) ready += 1;
    }));
    return { all, ready };
  }, []);

  /* the arrival runs once, on mount */
  useEffect(() => {
    if (instant()) return undefined;
    const t = setTimeout(() => setPhase('settled'), ARRIVE_BASE * PACE);
    return () => clearTimeout(t);
  }, []);

  /* THE EXIT. onClose fires only after the pad has actually gone, so the caller never unmounts a
     panel that is still on screen — the same contract the book's shut-and-fly already has. */
  const leave = useCallback(() => {
    if (phase === 'leave') return;
    clearAll();
    if (instant()) { onClose(); return; }
    setPhase('leave');
    later(onClose, LEAVE_BASE * PACE);
  }, [phase, clearAll, later, onClose]);

  const go = useCallback((i) => {
    if (i === cur || i < 0 || i >= SECTIONS.length) return;
    /* 🔴 THE SOUND BELONGS HERE, NOT ON THE RAIL BUTTON'S onClick. Three things change section —
       a tap on the rail, a swipe across the display, and the arrow keys — and all three arrive
       through `go()`. Hung on the button instead, a swipe would change section in silence, which
       is one action behaving two ways.

       AFTER the guard above, deliberately: pressing the section you are already on returns early,
       and a key that clicks while nothing moves is a control lying about what it did. BEFORE the
       `instant()` branch, equally deliberately: Lite Mode gives up MOTION, never a word and never
       a sound, and `playSound` already handles its own silencing. */
    padKey();
    clearAll();
    if (instant()) { setCur(i); setRead((r) => ({ ...r, [SECTIONS[i].id]: true })); return; }
    setSwap('out');
    later(() => {
      setCur(i);
      setRead((r) => ({ ...r, [SECTIONS[i].id]: true }));
      setWriting(true);
      setSwap('in');
      later(() => setSwap(''), SWAP_WRITE_MS);
    }, SWAP_OUT_MS);
  }, [cur, clearAll, later]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); leave(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cur, go, leave]);

  useEffect(() => {
    const el = rootRef.current;
    if (el) el.focus();
  }, []);

  /* swipe across the display, horizontal only so the panel can still scroll */
  const touch = useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x, dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) go(cur + (dx < 0 ? 1 : -1));
  };

  const arriving = phase === 'arrive';
  const padCls = ['pp-pad', 'pp-live',
                  arriving ? 'pp-arrive' : '',
                  phase === 'leave' ? 'pp-leave' : '',
                  phase === 'settled' ? 'pp-settled' : ''].filter(Boolean).join(' ');

  return createPortal(
    <div ref={rootRef} tabIndex={-1}
         className={'pp-root' + (phase === 'leave' ? ' pp-leaving' : '')}
         role="dialog" aria-modal="true" aria-label="Tutorial">

      {/* the scan bar is a sibling of the pad, never a child: the pad arrives under a travelling
          clip edge, and a light inside a clipped element is clipped away with it */}
      <span className={'pp-scanbar' + (arriving ? ' pp-run' : '')} aria-hidden="true" />

      <div className={padCls}>
        <span className="pp-sheen" aria-hidden="true" />
        <span className="pp-rim" aria-hidden="true" />
        <span className="pp-bolt tl" aria-hidden="true" /><span className="pp-bolt tr" aria-hidden="true" />
        <span className="pp-bolt bl" aria-hidden="true" /><span className="pp-bolt br" aria-hidden="true" />

        <div className="pp-meter" aria-hidden="true">
          {SECTIONS.map((s, i) => (
            <span key={s.id} style={{ '--pp-i': i }}
                  className={'pp-seg' + (read[s.id] ? ' pp-read' : '') + (i === cur ? ' pp-cur' : '')} />
          ))}
        </div>

        <div className="pp-display">
          <div className="pp-crt">
            <div className="pp-status">
              <span className="pp-live-dot" />
              <span>Ponder</span>
              <span className="pp-sp" />
              <span>Section <b>{pad2(cur + 1)}</b>/{pad2(SECTIONS.length)}</span>
              <button type="button" className="pp-x" onClick={leave} aria-label="Tutup tutorial">
                <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
                  <path d="M1 1 L10 10 M10 1 L1 10" stroke="currentColor" strokeWidth="1.6"
                        strokeLinecap="round" fill="none" />
                </svg>
              </button>
            </div>

            <div className="pp-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <article key={section.id}
                       className={'pp-panel' + (swap ? ' pp-' + swap : '')}>
                <div className="pp-eyebrow" style={{ '--pp-i': 0 }}>
                  <span className="pp-plate">{section.short}</span>
                  <span className="pp-line" />
                </div>
                <h2 className={'pp-title' + (writing ? ' pp-writing' : '')}>{title}</h2>
                <p className="pp-blurb" style={{ '--pp-i': 1 }}>{section.blurb}</p>
                <div className="pp-rule-lab" style={{ '--pp-i': 2 }}>
                  <span>Content</span><span className="pp-line" />
                  <span>{pad2(section.entries.length)}</span>
                </div>

                {section.entries.map((e, j) => {
                  /* AN ENTRY IS A BUTTON ONLY WHEN IT OPENS SOMETHING. Same rule the book uses,
                     so a control never opens nothing — the audit's whole reason for routing every
                     scene through registry.js. */
                  const ready = !e.soon && !!getScene(e.sceneId);
                  return (
                    <button
                      key={e.title}
                      type="button"
                      disabled={!ready}
                      onClick={() => { if (ready) { bookPick(); onPick(e.sceneId); } }}
                      style={{ '--pp-i': j + 3 }}
                      className={'pp-entry' + (ready ? ' pp-ready' : '')}
                    >
                      <span className="pp-idx">{pad2(j + 1)}</span>
                      <span className="pp-etitle">{e.title}</span>
                      <span className={'pp-chip ' + (ready ? 'pp-ready-chip' : 'pp-soon')}>
                        {ready ? 'Buka' : 'Segera'}
                      </span>
                      <span className="pp-edesc">{e.desc}</span>
                    </button>
                  );
                })}
              </article>
            </div>

            <div className="pp-foot">
              <span>KPM</span>
              <span className="pp-ticks" />
              <span>Siap <b>{pad2(totals.ready)}</b>/{pad2(totals.all)}</span>
            </div>
          </div>
        </div>

        <nav className="pp-rail" aria-label="Daftar bagian">
          {SECTIONS.map((s, i) => (
            <button key={s.id} type="button" style={{ '--pp-i': i }}
                    title={s.label}
                    aria-label={s.label}
                    aria-current={i === cur ? 'true' : 'false'}
                    onClick={() => go(i)}
                    className={'pp-key' + (read[s.id] ? ' pp-read' : '') + (i === cur ? ' pp-on' : '')}>
              <span>{s.short}</span>
              <span className="pp-lamp" style={{ '--pp-i': i }} />
            </button>
          ))}
        </nav>
      </div>
    </div>,
    document.body,
  );
}
