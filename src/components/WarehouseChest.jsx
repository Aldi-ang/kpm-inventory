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
import { HAZARD_SIGN } from '../utils/vanBay';
import { Cube } from './LoadingBay.jsx';
import { QuarantineHatch, BlastDoors, QuarantineBand, runSwitch } from './QuarantineSwitch.jsx';

const fmt = (n) => Number(n).toLocaleString('id-ID');
const items = (n) => `${fmt(n)} item${n === 1 ? '' : 's'}`;
const SIGN = <svg viewBox="0 0 15 15" shapeRendering="crispEdges" aria-hidden="true">{HAZARD_SIGN.map(([x, y]) => <rect key={x + '-' + y} x={x} y={y} width="1.02" height="1.02" />)}</svg>;
/* ten ender particles rising through The End (animation - Lite Mode stops them) */
const MOTES = Array.from({ length: 10 }, (_, i) => ({ '--mx': 8 + (i * 37) % 84 + '%', '--md': (5 + (i % 4) * 1.3).toFixed(1) + 's', '--mdl': '-' + (i * 0.9).toFixed(1) + 's' }));

/* rows: the branch's shelf, each joined with its master product (for the 3D box); ageOf(row) = days on the shelf or null */
export default function WarehouseChest({ rows, warehouse, ageOf }) {
  const [view, setView] = useState('ok');
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState(0);
  const [said, setSaid] = useState('');
  const [per, setPer] = useState(8);   // one row of squares: 8 on a wide desk, 4 on a phone
  const [holdH, setHoldH] = useState(0);   // the Quarantine has no band: it keeps the healthy view's height, so nothing below moves
  const box = useRef(null), stg = useRef(null), hatch = useRef(null), doors = useRef(null), busy = useRef(false);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setPer(e.contentRect.width >= 560 ? 8 : 4));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    <div className="kpm-wh2">
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
