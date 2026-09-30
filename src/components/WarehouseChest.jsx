/* THE REGIONAL WAREHOUSE'S CHEST — the Stock tab of the branch desk, drawn as Aldi's prototype v24-v27
   (https://claude.ai/artifact/QA46EfZgkJPd6PH7f2FSjD). His picks, 2026-09-30: option B - *"i want u to add the 3D chest in
   the regional warehouse and not just the inventory panel"* - the shelf is the stone inventory box, standing on a 3D ender
   chest; *"some ender minecraft kinda background theme"* - the chest stands in The End, on a floating End stone island
   that bobs with it (*"add some slow floating animation for those chest and platform"*); *"use box A for quarantine
   inventory"* - the Quarantine view wears the tape rim. The switch is the shared hatch + blast doors
   (QuarantineSwitch.jsx). Look-and-tap only: a square tells its line, the chest shuts its box into it and keeps its room.
   The Quarantine is this branch's OWN damagedStock (the arrival check books unsellable boxes there); it is fixed in
   Stock Opname, never here. */
import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { HAZARD_SIGN } from '../utils/vanBay';
import { Cube } from './LoadingBay.jsx';
import { QuarantineHatch, BlastDoors, QuarantineBand, runSwitch, still } from './QuarantineSwitch.jsx';

const fmt = (n) => Number(n).toLocaleString('id-ID');
const items = (n) => `${fmt(n)} item${n === 1 ? '' : 's'}`;
const SIGN = <svg viewBox="0 0 15 15" shapeRendering="crispEdges" aria-hidden="true">{HAZARD_SIGN.map(([x, y]) => <rect key={x + '-' + y} x={x} y={y} width="1.02" height="1.02" />)}</svg>;
/* the crate's pulsing sign: still black under a green copy whose opacity pulses - see LoadingBay.jsx SIGN_PULSE */
const SIGN_PULSE = <>{SIGN}{SIGN}</>;
/* ten ender particles rising through The End (animation - Lite Mode stops them) */
const MOTES = Array.from({ length: 10 }, (_, i) => ({ '--mx': 8 + (i * 37) % 84 + '%', '--md': (5 + (i % 4) * 1.3).toFixed(1) + 's', '--mdl': '-' + (i * 0.9).toFixed(1) + 's' }));

/* one row of squares: 8 on a wide desk, 4 on a phone - counted from the box's own width */
function usePer(box) {
  const [per, setPer] = useState(8);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setPer(e.contentRect.width >= 560 ? 8 : 4));
    ro.observe(el);
    return () => ro.disconnect();
  }, [box]);
  return per;
}

/* rows: the branch's shelf, each joined with its master product (for the 3D box); ageOf(row) = days on the shelf or null */
export default function WarehouseChest({ rows, warehouse, ageOf }) {
  const [view, setView] = useState('ok');
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState(0);
  const [said, setSaid] = useState('');
  const [holdH, setHoldH] = useState(0);   // the Quarantine has no band: it keeps the healthy view's height, so nothing below moves
  const box = useRef(null), stg = useRef(null), hatch = useRef(null), doors = useRef(null), busy = useRef(false);
  const per = usePer(box);

  const q = view === 'q';
  const damaged = rows.filter(r => (r.damagedStock || 0) > 0);
  const list = q ? damaged : rows;
  const total = rows.reduce((a, r) => a + (r.stock || 0), 0), qTotal = damaged.reduce((a, r) => a + r.damagedStock, 0);
  const pages = Math.max(1, Math.ceil(list.length / per)), pg = Math.min(page, pages - 1);

  const flip = () => {
    if (busy.current) return;
    busy.current = true;
    const toQ = !q;
    runSwitch(hatch.current, doors.current, toQ, () => {
      setHoldH(toQ ? stg.current?.offsetHeight || 0 : 0);
      setView(toQ ? 'q' : 'ok'); setPage(0);
      setSaid(toQ ? `Showing Quarantine · ${items(damaged.length)}` : `Showing healthy stock · ${fmt(rows.length)} products`);
    }).finally(() => { busy.current = false; });
  };
  const tell = (e) => {
    const s = e.target.closest('.slot.has');
    if (!s || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
    const r = list.find(x => x.id === s.dataset.id);
    if (!r) return;
    const days = q ? null : ageOf(r);
    setSaid(q ? `${r.name} · ${fmt(r.damagedStock)} Bks damaged` : `${r.name} · ${fmt(r.stock || 0)} Bks${days !== null ? ` · paling lama ${days} hari` : ''}`);
  };

  return (
    <div className="kpm-wh2 kpm-sbox">
      <span className="endmotes" aria-hidden="true">{MOTES.map((v, i) => <i key={i} style={v} />)}</span>
      <div ref={box} className={`sbx${q ? ' lkA' : ''}${open ? '' : ' shut'}`} aria-hidden={!open}>
        <div ref={stg} className={`stg${q ? ' isq' : ''}`} style={holdH ? { minHeight: holdH } : undefined}>
          <p className="stl">
            <span className="tn">{q && <i>{SIGN}</i>}<span className="tx">{q ? `Quarantine · ${warehouse}` : `Gudang ${warehouse}`}</span></span>
            <span className="ct">{q ? `${fmt(qTotal)} Bks · ${items(damaged.length)}` : `${fmt(rows.length)} products · ${fmt(total)} Bks`}</span>
          </p>
          {!q && <QuarantineBand q={false} />}
          <span className="say" role="status" aria-live="polite">{said}</span>
          <div className="grid" style={{ '--per': per }} onClick={tell} onKeyDown={tell}>
            {Array.from({ length: per }, (_, i) => {
              const r = list[pg * per + i];
              if (!r) return <div key={'e' + i} className="slot" />;
              const n = q ? r.damagedStock : (r.stock || 0);
              return (
                <div key={r.id} className={`slot has${q ? ' qs' : ''}`} data-id={r.id} tabIndex={0} role="button"
                  aria-label={q ? `${r.name}, ${fmt(n)} Bks damaged` : `${r.name}, ${fmt(n)} Bks`}>
                  <Cube p={r} />
                  <span className="n">{n ? fmt(n) : 'habis'}</span>
                  <span className="name">{r.name}</span>
                </div>
              );
            })}
          </div>
          <BlastDoors ref={doors} />
        </div>
        <div className="ddeck">
          <span className="pgs">
            {Array.from({ length: pages }, (_, k) => (
              <button key={k} type="button" className={`pg${k === pg ? ' on' : ''}`} onClick={() => setPage(k)}>{k + 1}</button>
            ))}
          </span>
          <QuarantineHatch ref={hatch} view={view} onPress={flip} />
          <span className="of">{q ? 'fix in Stock Opname' : `${fmt(total)} Bks on the shelf`}</span>
        </div>
      </div>
      <button type="button" className={`kpm-chest${open ? ' on' : ''}`} aria-expanded={open} aria-label={`Ender chest Gudang ${warehouse} - open or close`}
        onClick={() => setOpen(o => !o)}>
        <span className="kpm-c3 ender">
          <span className="cc">
            <i className="bf" /><i className="bl" /><i className="br" /><i className="bt" />
            <i className="it" /><i className="if" /><i className="iu" />
            <span className="lid3"><i className="lf" /><i className="ll" /><i className="lr" /><i className="lt" /><i className="lu" /><i className="latch" /></span>
          </span>
        </span>
        <span className="capt">Gudang {warehouse}<small>{fmt(total)} Bks · {fmt(qTotal)} in Quarantine</small></span>
      </button>
    </div>
  );
}

/* STOCK OPNAME'S QUARANTINE VAULT - his option B (2026-09-30: "for stock opname i want option B", "use box A for quarantine
   inventory"): one yellow 3D crate per warehouse replaces the facility list; the open crate's box (box A, the tape rim)
   holds that warehouse's damaged squares; a square picked shows its line and the vault's own three actions under the
   box - `actions(item)` is the screen's unchanged buttons, so every resolve path, the log and the HQ approval stay as
   they were. Switching crates, the box shrinks into the old crate and grows out of the new one (his "make sure that
   there is animation when swapping between chest for the inventory box"). One crate is always open. */
const IN = 'cubic-bezier(.55, 0, .85, .35)', SPRING = 'cubic-bezier(.34, 1.56, .64, 1)';
export function CrateVault({ facilities, rows, fac, onPick, line, actions }) {
  const [sq, setSq] = useState(null);
  const [page, setPage] = useState(0);
  const box = useRef(null), holder = useRef(null), vault = useRef(null), busy = useRef(false);
  const per = usePer(box);
  const mine = rows.filter(r => r.facility === fac), name = facilities.find(f => f.key === fac)?.name || fac;
  const pages = Math.max(1, Math.ceil(mine.length / per)), pg = Math.min(page, pages - 1);
  const picked = sq !== null ? mine.find(r => r.id === sq) : null;
  /* the crate's middle, measured on an UNtransformed box (a rect read mid-shrink is off by the shrink) */
  const ox = (k) => { const c = vault.current?.querySelector(`.crates [data-fac="${k}"]`), h = holder.current; if (!c || !h) return '50% 0'; const r = c.getBoundingClientRect(), b = h.getBoundingClientRect(); return `${Math.round(r.left + r.width / 2 - b.left)}px 0`; };
  const pick = (k) => {
    if (k === fac || busy.current) return;
    const h = holder.current;
    if (!h || still()) { onPick(k); setSq(null); setPage(0); return; }
    busy.current = true;
    h.style.transformOrigin = ox(fac);
    const a = h.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(.08) translateY(-24px)', opacity: 0 }], { duration: 170, easing: IN, fill: 'forwards' });
    Promise.race([a.finished.catch(() => {}), new Promise(r => setTimeout(r, 320))]).then(() => {
      flushSync(() => { onPick(k); setSq(null); setPage(0); });
      a.cancel(); h.style.transformOrigin = ox(k);
      h.animate([{ transform: 'scale(.08) translateY(-24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: SPRING });
      busy.current = false;
    });
  };
  const tap = (e) => {
    const s = e.target.closest('.slot.has');
    if (!s || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
    setSq(s.dataset.id === sq ? null : s.dataset.id);
  };
  const total = mine.reduce((a, r) => a + (r.damagedStock || 0), 0);
  return (
    <div ref={vault} className="kpm-vault kpm-sbox">
      <div className="crates">
        {facilities.map(f => {
          const fr = rows.filter(r => r.facility === f.key), n = fr.reduce((a, r) => a + (r.damagedStock || 0), 0), on = f.key === fac;
          return (
            <button key={f.key} type="button" data-fac={f.key} className={`kpm-chest${on ? ' on' : ' dim'}${fr.length ? '' : ' empty'}`} aria-pressed={on}
              aria-label={`Quarantine crate ${f.name} - open`} onClick={() => pick(f.key)}>
              <span className="kpm-c3 hazard">
                <span className="cc">
                  <i className="bf"><span className="sign">{SIGN_PULSE}</span></i><i className="bl" /><i className="br" /><i className="bt" />
                  <span className="lid3"><i className="lf" /><i className="ll" /><i className="lr" /><i className="lt" /><i className="lu" /><i className="latch" /></span>
                </span>
              </span>
              <span className="capt">{f.name}<small>{fr.length ? `${fmt(n)} Bks · ${items(fr.length)}` : 'empty'}</small></span>
            </button>
          );
        })}
      </div>
      <div ref={holder} className="below">
        <div ref={box} className="sbx lkA">
          <div className="stg isq">
            <p className="stl">
              <span className="tn"><i>{SIGN}</i><span className="tx">Quarantine · {name}</span></span>
              <span className="ct">{fmt(total)} Bks · {items(mine.length)}</span>
            </p>
            <span className="say" role="status" aria-live="polite">{mine.length ? (picked ? `${picked.name} picked` : 'press a square for its actions') : 'nothing damaged here'}</span>
            <div className="grid" style={{ '--per': per }} onClick={tap} onKeyDown={tap}>
              {Array.from({ length: per }, (_, i) => {
                const r = mine[pg * per + i];
                if (!r) return <div key={'e' + i} className="slot" />;
                return (
                  <div key={r.id} className={`slot has qs${r.id === sq ? ' on' : ''}`} data-id={r.id} tabIndex={0} role="button" aria-pressed={r.id === sq}
                    aria-label={`${r.name}, ${fmt(r.damagedStock)} Bks damaged`}>
                    <Cube p={r} />
                    <span className="n">{fmt(r.damagedStock)}</span>
                    <span className="name">{r.name}</span>
                  </div>
                );
              })}
            </div>
            {pages > 1 && (
              <div className="ddeck"><span className="pgs">
                {Array.from({ length: pages }, (_, k) => <button key={k} type="button" className={`pg${k === pg ? ' on' : ''}`} onClick={() => { setPage(k); setSq(null); }}>{k + 1}</button>)}
              </span></div>
            )}
          </div>
        </div>
        {picked && <div className="strip"><div className="rn">{line(picked)}</div>{actions(picked)}</div>}
      </div>
    </div>
  );
}
