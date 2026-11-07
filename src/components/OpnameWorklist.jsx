/* THE STOCK OPNAME WORKLIST - his 2026-11-05 pick for phone and PC ("worklist is my favorite one, both pc and phone looks great"), from
   "make the animation and panel outside of our theme but take the color just not the design ... professional where real factory and
   business can use it". Warehouses are tabs, the numbers sit on top, and the list starts with only what still needs a decision, biggest
   loss first. The app's colours, none of its game material (theme.css .kpm-wl-*). Motion follows IBM Carbon's "productive" rules: the
   tab line 240 ms, the list 150 ms, no movement on the keyboard. Accept and Reject write through the screen's own handlers. */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, History, Camera, TriangleAlert, Repeat2 } from 'lucide-react';
import { formatRupiah, formatNumber } from '../utils/helpers';
import { damagedAsGood, damagedCountNote, opnameSums } from '../utils/supply.js';

const still = () => document.documentElement.classList.contains('lite-mode') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const signed = (n) => (n > 0 ? `+${formatNumber(n)}` : n < 0 ? `-${formatNumber(-n)}` : '0');
const title = (s) => (s === s?.toUpperCase() ? s.toLowerCase().replace(/(^|[\s(])\S/g, (c) => c.toUpperCase()) : s);
const REJECT_WORDS = ['Recount please', 'Check the other shelf', 'Photo needed'];

const Status = ({ st }) => (st === 'ok' ? <span className="kpm-wl-status ok"><Check size={14} />Accepted</span>
  : st === 'no' ? <span className="kpm-wl-status no"><X size={14} />Rejected</span>
  : st === 'none' ? <span className="kpm-wl-status none">Not counted</span>
  : <span className="kpm-wl-status wait"><i className="kpm-wl-dot" />Waiting</span>);

function RejectForm({ row, leader, onSend, onClose }) {
  const [text, setText] = useState(''), [err, setErr] = useState(false), inp = useRef(null), id = `kpm-wl-why-${row.id}`;
  useEffect(() => { if (window.matchMedia?.('(hover: hover)').matches) inp.current?.focus({ preventScroll: true }); }, []);   // a phone's keyboard would cover the three quick words
  const send = (e) => { e.preventDefault(); if (!text.trim()) { setErr(true); inp.current?.focus(); return; } onSend(text.trim()); };
  return (
    <form className="kpm-wl-rej" onSubmit={send}>
      <label htmlFor={id}>Why does {row.name} go back to {leader}?</label>
      <div className="kpm-wl-rej-chips">{REJECT_WORDS.map((c) => <button type="button" key={c} className="kpm-wl-chip" onClick={() => { setText(c); setErr(false); }}>{c}</button>)}</div>
      <input ref={inp} id={id} name="reject-reason" value={text} onChange={(e) => { setText(e.target.value); setErr(false); }} autoComplete="off" />
      {err && <p className="kpm-wl-err">Write why, so {leader} knows what to recount.</p>}
      <div className="kpm-wl-rej-acts"><button type="button" className="kpm-wl-btn" onClick={onClose}>Cancel</button><button className="kpm-wl-btn kpm-wl-rejb on"><X size={15} /><span>Reject this product</span></button></div>
    </form>
  );
}

function Row({ row, ctl }) {
  const [rej, setRej] = useState(false);
  if (row.status === 'none') return <div className="kpm-wl-row none"><div className="kpm-wl-nm"><b>{row.name}</b></div><div className="kpm-wl-st"><Status st="none" /></div></div>;
  const { item, diff, loss } = row, hasD = Number(item.expectedDamagedStock || 0) > 0 || Number(item.damagedCount || 0) > 0;
  const quiet = row.same && row.status !== 'no';
  const parts = [loss.missing && `${formatNumber(loss.missing)} missing`, loss.damaged && `${formatNumber(loss.damaged)} damaged`].filter(Boolean).join(' + ');
  const stuck = row.status === 'wait' && damagedAsGood(item), note = row.status === 'wait' ? damagedCountNote(item) : null;
  const streak = ctl.streakOf(row.id);
  return (
    <div className={`kpm-wl-row ${row.status}${quiet ? ' quiet' : ''}`}>
      <div className="kpm-wl-nm"><b>{row.name}</b>{quiet ? <span className="kpm-wl-sum dim">Matches · {formatNumber(item.goodCount)}{hasD ? ` good, ${formatNumber(item.damagedCount)} damaged` : ''}</span> : parts ? <span className="kpm-wl-sum">{parts}</span> : null}</div>
      {!quiet && <div className="kpm-wl-lines">
        <span>Good</span><span>{formatNumber(item.expectedStock || 0)} → {formatNumber(item.goodCount || 0)}</span><b className={diff.good ? 'bad' : ''}>{signed(diff.good)}</b>
        {hasD && <><span>Damaged</span><span>{formatNumber(item.expectedDamagedStock || 0)} → {formatNumber(item.damagedCount || 0)}</span><b className={diff.damaged ? 'bad' : ''}>{signed(diff.damaged)}</b></>}
      </div>}
      <div className={`kpm-wl-val${loss.rp ? ' bad' : ''}`}>{loss.rp ? formatRupiah(loss.rp) : '-'}</div>
      <div className="kpm-wl-st"><Status st={row.status} /></div>
      <div className="kpm-wl-do">{ctl.canDecide && row.status === 'wait' && !rej && (
        <div className="kpm-wl-acts">
          <button className="kpm-wl-btn kpm-wl-rejb" disabled={ctl.busy} aria-label={`Reject ${row.name}`} onClick={() => setRej(true)}><X size={15} /><span>Reject</span></button>
          {!stuck && <button className="kpm-wl-btn kpm-wl-acc" disabled={ctl.busy} aria-label={`Accept ${row.name}`} onClick={() => ctl.decide([row], 'ACCEPTED')}><Check size={15} /><span>Accept</span></button>}
        </div>)}</div>
      {!quiet && (item.damageKinds?.length > 0 || item.varianceReason || item.countedTwice || item.threeWayDisagreement || item.damagedPhotoUrl || streak || row.reason || item.recount || note) && (
        <div className="kpm-wl-meta">
          {item.damageKinds?.map((k) => <span key={k.reason} className="kpm-wl-tag">{k.reason} {k.qty}</span>)}
          {item.varianceReason && <span>Cause: {item.varianceReason}</span>}
          {item.threeWayDisagreement ? <span className="kpm-wl-ico warn">Three different counts, you decide</span> : item.countedTwice && <span>Counted twice</span>}
          {row.recount && <span className="kpm-wl-ico"><Repeat2 size={13} />Recount</span>}
          {item.damagedPhotoUrl && <button type="button" className="kpm-wl-ico kpm-wl-link" onClick={() => ctl.onPhoto(item.damagedPhotoUrl)}><Camera size={13} /><span>Photo</span></button>}
          {streak && <span className="kpm-wl-ico warn"><TriangleAlert size={13} />{streak}</span>}
          {row.status === 'no' && row.reason && <span className="kpm-wl-ico"><Repeat2 size={13} />Recount asked: {row.reason}</span>}
          {note && <span className="kpm-wl-ico warn wide">{note}</span>}
        </div>)}
      {rej && <RejectForm row={row} leader={ctl.leader} onClose={() => setRej(false)} onSend={(why) => { setRej(false); ctl.decide([row], 'REJECTED', why); }} />}
    </div>
  );
}

export default function OpnameWorklist({ places, selected, onSelect, weekLabel, canDecide, onDecide, onHistory, onPhoto, streakOf, emptyNote, denied }) {
  const [filter, setFilter] = useState('wait'), [busy, setBusy] = useState(false), [toast, setToast] = useState(null);
  const bar = useRef(null), ind = useRef(null), body = useRef(null), last = useRef(selected), key = useRef(false), tm = useRef();
  const at = Math.max(0, places.findIndex((p) => p.key === selected)), place = places[at] || { name: '', board: { rows: [], submitted: false } }, board = place.board;
  const rows = board.rows, s = opnameSums(rows);
  const all = places.reduce((a, p) => a + opnameSums(p.board.rows).rp, 0);
  const say = (t) => { clearTimeout(tm.current); setToast(t); tm.current = setTimeout(() => setToast(null), 5000); };
  useEffect(() => () => clearTimeout(tm.current), []);

  const tabs = () => (bar.current ? [...bar.current.querySelectorAll('[role=tab]')] : []);
  /* the line sits under the words, inside the tab's padding, so it never reaches the hairline between warehouses (his 2026-11-08 "make sure the yellow line doesnt
     pass the vertical line border for all of those"). Each tab is watched too: a font arriving late changes a tab's width and the bar's width stays the same. */
  const placeLine = () => { const el = tabs()[at]; if (!el || !ind.current) return; const cs = getComputedStyle(el), l = parseFloat(cs.paddingLeft) || 0, r = parseFloat(cs.paddingRight) || 0; ind.current.style.transform = `translateX(${el.offsetLeft + l}px) scaleX(${Math.max(1, el.offsetWidth - l - r)})`; };
  useLayoutEffect(() => {
    placeLine();
    const el = tabs()[at];
    if (el) bar.current.scrollTo({ left: el.offsetLeft - (bar.current.clientWidth - el.offsetWidth) / 2, behavior: still() ? 'auto' : 'smooth' });
    const from = places.findIndex((p) => p.key === last.current);
    if (last.current !== selected && !still() && !key.current && body.current) {
      const dir = at > from ? 1 : -1;
      body.current.animate([{ opacity: 0, transform: `translateX(${dir * 16}px)` }, { opacity: 1, transform: 'none' }], { duration: 150, easing: 'cubic-bezier(0, 0, 0.38, 0.9)' });
    }
    last.current = selected; key.current = false;
  }, [selected]);
  useEffect(() => { if (!bar.current) return undefined; const ro = new ResizeObserver(placeLine); ro.observe(bar.current); tabs().forEach((t) => ro.observe(t)); return () => ro.disconnect(); });
  const onKey = (e) => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; key.current = true; const next = places[(at + d + places.length) % places.length]; onSelect(next.key); tabs()[(at + d + places.length) % places.length]?.focus(); };

  const decide = async (list, status, reason = '') => {
    setBusy(true);
    const undo = await onDecide(place, list, status, reason);
    setBusy(false);
    if (!undo) return;
    const one = list.length === 1 ? list[0].name : `${list.length} matching products`;
    const text = status === 'ACCEPTED' ? `Accepted ${one} at ${title(place.name)}.` : `Rejected ${one}. ${board.leader} recounts only this product.`;
    say({ text, undo: undo === true ? null : async () => { setToast(null); setBusy(true); const back = await undo(); setBusy(false); if (back) say({ text: list.length === 1 ? `${one} is waiting again.` : `${list.length} products are waiting again.` }); } });
  };
  const ctl = { canDecide, busy, decide, onPhoto, leader: board.leader || 'the team leader', streakOf };
  const list = rows.filter((r) => (filter === 'all' ? true : r.status === filter)), diffs = list.filter((r) => !(r.status === 'wait' && r.same)), matches = list.filter((r) => r.status === 'wait' && r.same);
  const FIL = [['wait', 'Waiting', s.waiting], ['ok', 'Accepted', s.ok], ['no', 'Rejected', s.no], ['none', 'Not counted', s.none], ['all', 'All', s.total]];

  return (
    <div className="kpm-wl">
      <header className="kpm-wl-head">
        <div className="kpm-wl-title"><h3>Stock count review</h3><p>{weekLabel}</p></div>
        {places.length > 1 && <div className="kpm-wl-alltot"><small>Lost value, all warehouses</small><b>{formatRupiah(all)}</b></div>}
        <button className="kpm-wl-btn kpm-wl-hist" aria-label="Audit history" onClick={onHistory}><History size={15} /><span>Audit history</span></button>
      </header>
      {denied && <p className="kpm-wl-denied">This screen could not load its counts: the new Firestore rule is not published yet.</p>}
      {places.length > 1 && (
        <div className="kpm-wl-tabs" role="tablist" aria-label="Warehouses" ref={bar} onKeyDown={onKey}>
          {places.map((p, k) => { const t = opnameSums(p.board.rows); return (
            <button key={p.key} role="tab" aria-selected={k === at} tabIndex={k === at ? 0 : -1} className="kpm-wl-tab" onClick={() => onSelect(p.key)}>
              <b>{title(p.name)}</b><small className={t.rp ? 'bad' : ''}>{!p.board.submitted ? 'Not submitted' : t.rp ? formatRupiah(t.rp) : 'Nothing lost'}</small>
              {t.waiting > 0 && <i className="kpm-wl-count" aria-label={`${t.waiting} waiting`}>{t.waiting}</i>}
            </button>); })}
          <i className="kpm-wl-ind" ref={ind} aria-hidden="true" />
        </div>)}
      <div className="kpm-wl-body" ref={body}>
        <section className="kpm-wl-card kpm-wl-kpi" aria-label={`${title(place.name)} summary`}>
          <div className="kpm-wl-who">{board.submitted ? board.who : emptyNote}</div>
          <div className="kpm-wl-kgrid">
            <div><small>Counted</small><b>{s.counted} <em>of {s.total}</em></b></div>
            <div><small>Decided</small><b>{s.decided} <em>of {s.counted}</em></b></div>
            <div><small>Missing</small><b>{formatNumber(s.missing)} <em>{formatRupiah(s.missingRp)}</em></b></div>
            <div><small>Damaged</small><b>{formatNumber(s.damaged)} <em>{formatRupiah(s.damagedRp)}</em></b></div>
            <div className="big"><small>Lost value</small><b className={s.rp ? 'bad' : ''}>{formatRupiah(s.rp)}</b></div>
          </div>
          <div className="kpm-wl-prog" aria-hidden="true"><i className="ok" style={{ flexGrow: s.ok }} /><i className="no" style={{ flexGrow: s.no }} /><i className="wait" style={{ flexGrow: s.waiting }} /><i className="none" style={{ flexGrow: s.none + (s.total ? 0 : 1) }} /></div>
        </section>
        {board.submitted && <>
          <div className="kpm-wl-filters" role="group" aria-label="Show products">{FIL.map(([k, t, n]) => <button key={k} className="kpm-wl-fil" aria-pressed={filter === k} onClick={() => setFilter(k)}>{t} <em>{n}</em></button>)}</div>
          <section className="kpm-wl-card">
            <div className="kpm-wl-rows">
              <div className="kpm-wl-phead" aria-hidden="true"><span>Product</span><span className="n3"><i /><i>Expected → Found</i><i>Difference</i></span><span className="n">Value</span><span /></div>
              {diffs.map((r) => <Row key={r.id} row={r} ctl={ctl} />)}
              {matches.length > 0 && <div className="kpm-wl-sub"><span>Matches the book</span>{canDecide && <button className="kpm-wl-btn kpm-wl-acc" disabled={busy} onClick={() => decide(matches, 'ACCEPTED')}><Check size={15} /><span>Accept all {matches.length}</span></button>}</div>}
              {matches.map((r) => <Row key={r.id} row={r} ctl={ctl} />)}
              {!list.length && <p className="kpm-wl-none">{filter === 'wait' ? `Nothing is waiting at ${title(place.name)}.` : 'No products here.'}</p>}
            </div>
          </section>
        </>}
      </div>
      {createPortal(<div className="kpm-wl-toastwrap" aria-live="polite">{toast && <div className="kpm-wl-toast" key={toast.text}><span>{toast.text}</span>{toast.undo && <button onClick={toast.undo}>Undo</button>}</div>}</div>, document.body)}
    </div>
  );
}
