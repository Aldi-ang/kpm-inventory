/* LAB ONLY — the NIXIE COUNTER, a candidate number instrument (Aldi, 2026-09-18 19:25: "make
   the counter to be like this animation ... and make it like nixie tube a like so its analog but
   animated"). His clip: a price whose digits roll vertically one tube at a time, the left digits
   settling first and the right ones lagging. A nixie tube is a glass valve with the ten digits
   stacked as wire cathodes; one glows orange, the others sit dark behind it.

   Here: one black glass window per digit, a reel of 0-9 inside it that TRANSLATES to the current
   digit (increase = the reel climbs, the new digit arrives from below), a 45 ms stagger per place
   from the left, the lit digit in amber on a warm disc, the unlit "8" filament ghosted behind.
   No shadow and no filter anywhere (audit G30; Lite Mode strips both) - the glow is a gradient
   disc, so a stopped tube still reads as a display. When he approves, the CSS moves to theme.css
   and the component to src/components/NixieCount.jsx; this file goes. */
import React from 'react';
import { createRoot } from 'react-dom/client';

export const NIXIE_CSS = `
.kpm-nixie { display: inline-flex; align-items: center; gap: 3px; padding: 3px 4px; vertical-align: middle;
  background-color: #000;
  background-image: linear-gradient(180deg, rgba(255,255,255,.07) 0 1px, transparent 1px, transparent 55%, rgba(255,255,255,.025));
  border: 1px solid var(--line-2); border-radius: 4px;
  font-family: var(--font-mono); font-weight: 800; font-size: var(--nx, 16px); line-height: 1;
  font-variant-numeric: tabular-nums; letter-spacing: 0; }
.kpm-nixie-sign { width: .62em; text-align: center; color: var(--amber); }
.kpm-nixie-tube { position: relative; width: .74em; height: 1.18em; overflow: hidden; border-radius: 2px;
  background: radial-gradient(70% 80% at 50% 50%, rgba(255, 140, 40, .09), transparent 72%); }
.kpm-nixie-tube::before { content: "8"; position: absolute; inset: 0; text-align: center; line-height: 1.18em;
  color: rgba(208, 138, 46, .11); }
.kpm-nixie-reel { position: absolute; left: 0; right: 0; top: 0; display: grid; text-align: center;
  translate: 0 calc(var(--i, 0) * -1.18em);
  transition: translate 420ms cubic-bezier(.23, 1, .32, 1); transition-delay: var(--d, 0ms); will-change: translate; }
.kpm-nixie-reel > span { height: 1.18em; line-height: 1.18em; color: rgba(208, 138, 46, .22); }
.kpm-nixie-reel > span.lit { color: var(--amber);
  background: radial-gradient(55% 62% at 50% 50%, rgba(255, 140, 40, .30), transparent 72%); }
@media (prefers-reduced-motion: reduce) { .kpm-nixie-reel { transition: none; } }
`;

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/* `signed` prints − / + in front (a DIFFERENCE); a plain count prints none. Tubes are keyed by
   PLACE VALUE (units, tens, ...) so growing 99 -> 100 adds a tube on the left and the existing
   reels keep rolling instead of remounting. */
export function NixieCount({ value = 0, signed = false, size = 16, className = '' }) {
  const n = Number(value) || 0;
  const s = String(Math.abs(Math.trunc(n)));
  const sign = signed ? (n < 0 ? '−' : n > 0 ? '+' : '') : '';
  return (
    <span className={`kpm-nixie ${className}`} style={{ '--nx': `${size}px` }} role="img" aria-label={`${sign}${s}`}>
      {sign && <span className="kpm-nixie-sign" aria-hidden="true">{sign}</span>}
      {[...s].map((d, i) => (
        <span key={s.length - i} className="kpm-nixie-tube" aria-hidden="true" style={{ '--d': `${i * 45}ms` }}>
          <span className="kpm-nixie-reel" style={{ '--i': Number(d) }}>
            {DIGITS.map((x) => <span key={x} className={x === Number(d) ? 'lit' : ''}>{x}</span>)}
          </span>
        </span>
      ))}
    </span>
  );
}

/* `&nixify` on the Stock Opname mounts — puts REAL nixie counters into the rendered screen for a
   still: the count card's DIFFERENCE (20 px, signed) and the boss's audit item's three figures,
   rebuilt as EXPECTED / FOUND / DIFFERENCE plates (20 / 20 / 26). Lab-only DOM surgery: each spot
   gets its own React root, so it draws the true component, not a CSS imitation. Polls for the rows
   the stub paints a tick later. */
export function nixify() {
  if (!document.getElementById('lab-nixie-css')) {
    const s = document.createElement('style'); s.id = 'lab-nixie-css'; s.textContent = NIXIE_CSS; document.head.appendChild(s);
  }
  const num = (t) => Number(String(t).replace(/[^\d-−+]/g, '').replace('−', '-')) || 0;
  const mount = (el, props) => { el.textContent = ''; createRoot(el).render(<NixieCount {...props} />); };
  const run = (tries) => {
    const diff = [...document.querySelectorAll('.biohazard-content div.grid.gap-px > div:nth-child(4) > div:last-child')]
      .filter((el) => !el.dataset.nixie);
    diff.forEach((el) => { el.dataset.nixie = '1'; mount(el, { value: num(el.textContent), signed: true, size: 20 }); });
    const rows = [...document.querySelectorAll('.biohazard-content div.gap-4.font-mono')].filter((r) => !r.dataset.nixie && r.children.length === 4);
    rows.forEach((row) => {
      row.dataset.nixie = '1';
      const [sys, , fnd, v] = [...row.children].map((c) => num(c.textContent));
      row.textContent = '';
      row.className = 'grid grid-cols-3 gap-px bg-[var(--line)] rounded-lg overflow-hidden text-center';
      [['Expected', sys, false, 20], ['Found', fnd, false, 20], ['Difference', v, true, 26]].forEach(([label, value, signed, size]) => {
        const cell = document.createElement('div');
        cell.className = 'bg-[var(--sunk)] px-1 py-2 kpm-plate';
        const lab = document.createElement('div');
        lab.className = 'text-[11px] text-[var(--ink-dim)] font-bold uppercase tracking-widest mb-1';
        lab.textContent = label;
        const slot = document.createElement('div');
        cell.appendChild(lab); cell.appendChild(slot); row.appendChild(cell);
        mount(slot, { value, signed, size });
      });
    });
    if (!diff.length && !rows.length && tries > 0) setTimeout(() => run(tries - 1), 50);
  };
  run(40);
}

/* the demo: every 2.4 s the figures move, so the roll can be watched on his phone. Three sizes,
   the three places it would live. */
const STEPS = [
  { diff: -17, found: 403, exp: 420 },
  { diff: 0, found: 420, exp: 420 },
  { diff: 3, found: 423, exp: 420 },
  { diff: -2, found: 418, exp: 420 },
  { diff: 104, found: 524, exp: 420 },
];
export function NixieDemo() {
  const [k, setK] = React.useState(0);
  React.useEffect(() => { const t = setInterval(() => setK((n) => n + 1), 2400); return () => clearInterval(t); }, []);
  const st = STEPS[k % STEPS.length];
  const Plate = ({ label, children }) => (
    <div className="bg-[var(--sunk)] px-3 py-2 border border-transparent text-center kpm-plate">
      <div className="text-[11px] text-[var(--ink-dim)] font-bold uppercase tracking-widest whitespace-nowrap mb-1">{label}</div>
      {children}
    </div>
  );
  return (
    <div className="space-y-4">
      <style>{NIXIE_CSS}</style>
      <div className="bg-[var(--sunk)] border border-[var(--line)] p-4 rounded-xl">
        <h2 className="text-xl font-black text-[var(--ink)] tracking-widest uppercase">Nixie counter</h2>
        <p className="text-[11px] text-[var(--ink-dim)] font-mono mt-1">THE FIGURES MOVE EVERY 2.4 S — WATCH THE DIGITS ROLL</p>
      </div>
      <div className="bg-[var(--raised)] rounded-xl border border-[var(--line)] p-4 space-y-3">
        <div className="text-[11px] text-[var(--ink-dim)] font-bold uppercase tracking-widest">1 · the count card, DIFFERENCE (16 px)</div>
        <div className="grid grid-cols-2 gap-px bg-[var(--line)] rounded-lg overflow-hidden text-center">
          <Plate label="Total found"><span className="text-sm font-black font-mono tabular-nums text-[var(--ink)]">{st.found}</span></Plate>
          <Plate label="Difference"><NixieCount value={st.diff} signed size={16} /></Plate>
        </div>
      </div>
      <div className="bg-[var(--raised)] rounded-xl border border-[var(--line)] p-4 space-y-3">
        <div className="text-[11px] text-[var(--ink-dim)] font-bold uppercase tracking-widest">2 · the boss's audit item, three plates (20 / 20 / 26 px)</div>
        <div className="grid grid-cols-3 gap-px bg-[var(--line)] rounded-lg overflow-hidden text-center">
          <Plate label="Expected"><NixieCount value={st.exp} size={20} /></Plate>
          <Plate label="Found"><NixieCount value={st.found} size={20} /></Plate>
          <Plate label="Difference"><NixieCount value={st.diff} signed size={26} /></Plate>
        </div>
      </div>
      <div className="bg-[var(--raised)] rounded-xl border border-[var(--line)] p-4 space-y-3">
        <div className="text-[11px] text-[var(--ink-dim)] font-bold uppercase tracking-widest">3 · big (36 px)</div>
        <div className="text-center"><NixieCount value={st.diff} signed size={36} /></div>
      </div>
    </div>
  );
}
