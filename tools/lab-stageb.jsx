/* LAB ONLY — the two STAGE B boards for the player card (2026-09-21), nothing here ships.
   1. ProfileHeadMock: the card's HEAD on the Agent Profile. The real PlayerCard (closed) is portalled
      into the profile's own column, after the key row and before the hero block, so the frame shows
      the head where PlayerCardHead would mount; the looks prof-a / prof-b (lab-looks.js) hide the
      hero and/or the XP box under it.
   2. XpGainMock: the EXP gain on the salesman's EOD panel after the boss approves — three
      arrangements (`&xp=a|b|c`) of the one number instrument (NixieCount, signed): the digits roll
      from 0 to tonight's dayXP 400 ms after the block shows, nothing blinks. Portalled after the
      "Shift Closed" block so it is not under its 70 % dim.
   Delete this file, the two looks and the `&head` / `&verified` / `&xp` branches when stage B ships. */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PlayerCard from '../src/components/PlayerCard.jsx';
import NixieCount from '../src/components/NixieCount.jsx';
import { formatRupiah } from '../src/utils/helpers.js';

const SUB = 'text-[11px] font-bold uppercase tracking-widest text-[var(--ink-dim)]';
const BAR = { background: 'linear-gradient(90deg, var(--gold), #E4B04A)' };

const KEY = 'bg-black/80 backdrop-blur-md border border-line-2 px-4 py-2.5 rounded-xl text-ink-muted flex items-center gap-2 text-[10px] font-black uppercase tracking-widest';

export function ProfileHeadMock({ admin, ...cardProps }) {
  const [host, setHost] = useState(null);
  const [row, setRow] = useState(null);
  useEffect(() => {
    const hero = document.querySelector('.pt-24.pb-10');
    if (!hero) return undefined;
    const div = document.createElement('div');
    div.className = 'lab-head';
    hero.parentElement.insertBefore(div, hero);
    setHost(div);
    setRow(document.querySelector('.absolute.top-6.left-6.z-30'));
    return () => div.remove();
  }, []);
  if (!host) return null;
  const m = cardProps.motorist || {};
  return (
    <>
      {createPortal(
        <>
          <PlayerCard {...cardProps} onApprove={async () => true} onReset={() => {}} />
          <p className="lab-head-id font-mono text-[11px] uppercase tracking-widest text-[var(--ink-dim)] mt-2 px-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>T5 · Sales Canvas</span><span>ID {m.id}</span><span>{m.location}</span><span>Active 41 days</span>
          </p>
        </>,
        host
      )}
      {/* the boss's GRANT AWARD moves from the XP box into the key row, as its fifth key */}
      {admin && row && createPortal(<button type="button" className={KEY}><span>Grant Award</span></button>, row)}
    </>
  );
}

/* tonight's figures for the board: dayXP 51 = collected 33 + day closed 10 + cukai clean 5 + route 3 */
const GAIN = { total: 51, breakdown: { collected: 33, closed: 10, cukai: 5, route: 3 }, collectedRp: 1675000, stores: 3, before: 5614, after: 5665, next: 'Gold', toNext: 14284, pct: 28 };

export function XpGainMock({ variant = 'a' }) {
  const [host, setHost] = useState(null);
  const [v, setV] = useState(0);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const h3 = [...document.querySelectorAll('h3')].find((e) => /shift closed/i.test(e.textContent));
    const block = h3 && h3.parentElement;
    if (!block) return undefined;
    const div = document.createElement('div');
    div.className = 'lab-xp w-full';
    block.appendChild(div);   // inside the Shift Closed block, under its two lines; the block's 70 % dim is lifted below
    setHost(div);
    const t1 = setTimeout(() => setV(GAIN.total), 400);
    const t2 = setTimeout(() => setSettled(true), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); div.remove(); };
  }, []);
  if (!host) return null;
  const rows = [
    ['Collected', formatRupiah(GAIN.collectedRp), GAIN.breakdown.collected],
    ['Day closed', 'verified', GAIN.breakdown.closed],
    ['Pita cukai', 'clean', GAIN.breakdown.cukai],
    ['Route', `${GAIN.stores} stores`, GAIN.breakdown.route],
  ];
  return createPortal(
    <div className="lab-xp-in w-full border-t border-[var(--line)] pt-4 mt-6 text-left">
      <style>{`.opacity-70:has(.lab-xp){opacity:1;padding-top:16px;padding-bottom:8px}.opacity-70:has(.lab-xp)>svg,.opacity-70:has(.lab-xp)>h3,.opacity-70:has(.lab-xp)>p:not(.lab-xp p){opacity:.7}`}</style>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={SUB}>XP tonight</p>
          <div className="mt-1"><NixieCount value={v} signed size={34} /></div>
        </div>
        {variant === 'c' && (
          <p className="font-mono text-sm font-bold text-[var(--ink)] tabular-nums text-right">
            <span className="text-[var(--ink-dim)]">{new Intl.NumberFormat('id-ID').format(GAIN.before)} →</span> {new Intl.NumberFormat('id-ID').format(settled ? GAIN.after : GAIN.before)} XP
          </p>
        )}
      </div>
      {variant !== 'b' && (
        <>
          <div className="h-[3px] mt-3 rounded-full bg-[var(--inset)]"><div className="h-full rounded-full lab-xp-bar" style={{ width: `${settled ? GAIN.pct : GAIN.pct - 1}%`, ...BAR }}></div></div>
          <p className="text-[11px] uppercase tracking-widest text-[var(--ink-dim)] mt-1 flex justify-between"><span>Silver · The Hustler</span><span>{new Intl.NumberFormat('id-ID').format(GAIN.toNext)} XP to {GAIN.next}</span></p>
        </>
      )}
      {variant === 'b' && settled && (
        <div className="mt-3 space-y-1">
          {rows.map(([label, note, n], i) => (
            <div key={label} className="kpm-arrive flex items-center justify-between gap-2 text-[11px] uppercase tracking-widest" style={{ animationDelay: `${i * 90}ms` }}>
              <span className="text-[var(--ink-dim)]">{label} <span className="normal-case tracking-normal">· {note}</span></span>
              <span className="font-mono font-bold text-[var(--ink)] tabular-nums">+{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>,
    host
  );
}
