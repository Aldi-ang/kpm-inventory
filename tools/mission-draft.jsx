/* LAB ONLY - the demo's mission line, his pick B (2026-10-24 *"b is easier to see"*), for the frames he judges before
   it is built. Nothing here ships: the look moves into src/components/DemoFrontDoor.jsx (demo build only).
     ?shell&places&tab=kirim&mission=b         the line under the DEMO bar (step 2 live, step 1 done)
     ?shell&places&tab=kirim&mission=b&hint    PETUNJUK pressed: a square around what to press, the rest blurred
   His add-ons, same message: *"add circle or square just to show what to do and also blur other outside of the box ...
   this will work as a hint button like in some puzzle game"* and *"dont forget use indonesian language"*. */
import React from 'react';
import { Lightbulb } from 'lucide-react';
import { DemoBar } from '../src/components/DemoFrontDoor.jsx';
import CapyTalk from './capy-talk-draft.jsx';

const STEPS = [
    { n: 1, todo: 'Terima hasil produksi di Master Vault', done: '120 Bks masuk ke Master Vault', who: 'Owner' },
    { n: 2, todo: 'Kirim barang ke gudang wilayah', who: 'Owner', hint: 'Ketuk + untuk memilih barang yang dikirim' },
    { n: 3, todo: 'Seret barang ke tas Dika', who: 'Admin Wilayah' },
];
const NOW = 2;
const PAD = 6;

const CSS = `
html.kpm-demo-on.mx-b { --kpm-safe-top: calc(env(safe-area-inset-top, 0px) + 37px + 34px); }
.mx { font-family: var(--font-mono); color: var(--ink); }
.mx .tag { flex: none; font: 700 10px/1 var(--font-mono); letter-spacing: .22em; color: var(--ink-dim); }
.mx .tag b { color: var(--accent-ink); }
.mx .tick { color: var(--accent-ink); font-weight: 700; }
.mx-b-line { position: fixed; top: calc(env(safe-area-inset-top, 0px) + 37px); left: 0; right: 0; z-index: 96; height: 34px; display: flex; align-items: center; gap: 10px;
  padding: 0 8px 0 12px; background: var(--inset); border-bottom: 1px solid var(--line-3); }
.mx-b-line .now { min-width: 0; flex: 1; font: 600 14px/1.2 var(--font-mono); letter-spacing: .02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }




.mx-b-line .hintkey { flex: none; display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 8px; background: var(--plate); border: 1.5px solid var(--accent-edge); font: 700 10px/1 var(--font-mono);
  letter-spacing: .14em; color: var(--ink); cursor: pointer; }
.mx-b-line .hintkey[aria-pressed="true"] { color: var(--accent-ink); }
.mx-b-line ol { display: none; }
@media (min-width: 1024px) {
  .mx-b-line .now { display: none; }
  .mx-b-line ol { display: flex; flex: 1; min-width: 0; margin: 0; padding: 0; list-style: none; }
  .mx-b-line li { display: flex; align-items: center; gap: 8px; padding: 0 16px; height: 34px; font: 600 14px/1 var(--font-mono); letter-spacing: .02em; color: var(--ink-dim);
    border-left: 1px solid var(--line-3); white-space: nowrap; }
  .mx-b-line li.on { color: var(--ink); box-shadow: inset 0 -2px 0 var(--accent-edge); }
  .mx-b-line li .n { font-weight: 700; }
  .mx-b-line li.on .n { color: var(--accent-ink); }
  .mx-b-line li em { font-style: normal; color: var(--ink-dim); font-weight: 500; }
}
/* the hint: everything outside the square is dimmed and blurred; Lite Mode strips the blur and keeps the dim (still reads) */
.mx-veil { position: fixed; z-index: 95; background: rgba(5, 4, 3, .55); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); pointer-events: none; }
html.lite-mode .mx-veil { background: rgba(5, 4, 3, .8); }   /* no blur in Lite, so the dim alone must carry it: .55 read as no dim at all (2026-10-24 frame) */
.mx-ring { position: fixed; z-index: 95; border: 2px solid var(--accent-edge); pointer-events: none; }
.mx-tip { position: fixed; z-index: 95; max-width: 260px; padding: 8px 10px; background: var(--panel); border: 1px solid var(--accent-edge);
  font: 600 14px/1.3 var(--font-mono); color: var(--ink); pointer-events: none; }
`;

/* the first thing on screen whose text starts with the step's target - in the real build each step names its own element */
const findTarget = () => [...document.querySelectorAll('.biohazard-content button')].find((e) => e.textContent.trim().startsWith('Cello Green 16'));

function Hint({ text }) {
    const [r, setR] = React.useState(null);
    React.useEffect(() => {
        let n = 0;
        const t = setInterval(() => { const el = findTarget(); if (el || ++n > 20) { clearInterval(t); if (el) setR(el.getBoundingClientRect()); } }, 150);
        return () => clearInterval(t);
    }, []);
    if (!r) return null;
    const x1 = r.left - PAD, y1 = r.top - PAD, x2 = r.right + PAD, y2 = r.bottom + PAD;
    /* four panels around the square, not one panel with a cut-out: a clip-path hole painted nothing once Lite Mode took the
       blur away (measured 2026-10-24) - plain boxes keep the dim with or without the blur */
    const panels = [
        { left: 0, top: 0, right: 0, height: Math.max(0, y1) },
        { left: 0, top: y2, right: 0, bottom: 0 },
        { left: 0, top: y1, width: Math.max(0, x1), height: y2 - y1 },
        { left: x2, top: y1, right: 0, height: y2 - y1 },
    ];
    return (
        <>
            {panels.map((p, i) => <div key={i} className="mx-veil" style={p} />)}
            <div className="mx-ring" style={{ left: x1, top: y1, width: x2 - x1, height: y2 - y1 }} />
            <div className="mx-tip" style={{ left: Math.max(8, x1), top: y2 + 8 }}>{text}</div>
        </>
    );
}

export default function MissionDraft() {
    const qs = new URLSearchParams(window.location.search);
    const [hint, setHint] = React.useState(qs.has('hint'));
    const [talkScene, setTalkScene] = React.useState(qs.get('talk'));
    React.useEffect(() => {
        document.documentElement.classList.add('mx-b');
        return () => document.documentElement.classList.remove('mx-b');
    }, []);
    const now = STEPS[NOW - 1];
    return (
        <>
            <style>{CSS}</style>
            <DemoBar user={{ email: 'demo.owner@example.com' }} />
            <div className="mx mx-b-line hide-on-print">
                <span className="tag"><span className="hidden lg:inline">MISI </span><b>{NOW}/3</b></span>
                <span className="now">{now.todo}</span>
                <ol>
                    {STEPS.map((s) => (
                        <li key={s.n} className={s.n === NOW ? 'on' : ''}>
                            {s.n < NOW ? <span className="tick">✓</span> : <span className="n">{s.n}</span>}
                            {s.n < NOW ? s.done : s.todo}
                            {s.n > NOW && s.who !== now.who && <em>· sebagai {s.who}</em>}
                        </li>
                    ))}
                </ol>
                <button type="button" className="hintkey" aria-pressed={hint} aria-label="Petunjuk" onClick={() => setHint((v) => !v)}>
                    <Lightbulb size={14} /><span className="hidden lg:inline">PETUNJUK</span>
                </button>
            </div>
            {hint && <Hint text={now.hint} />}
            {talkScene && <CapyTalk scene={talkScene} line={Number(qs.get('line') || 0)} onDone={() => setTalkScene(null)} />}
        </>
    );
}
