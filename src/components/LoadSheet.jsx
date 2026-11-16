/* THE LOAD SHEET (2026-11-16) - the body of a person's panel in the professional Fleet & Roster. His pick from the
   options board: "Team list A Ledger table · Loading 1 Load sheet · PC Y Slide-over panel", then "make sure the
   animation is smooth and elegant and not flickering".

   One ruled line per product: Warehouse · In van · Last day sold · Load (− n +). Nothing is written until the gold key;
   then onLoad / onReturn run once per product, in order - the SAME two transactions the chests' MUAT VAN called
   (FleetCanvasManager handleLoadCanvas / handleReturnToWarehouse). A line that fails stays, with its reason.

   FILL SUGGESTED = his last working day's sales less what the van holds now, never below 0 (vanBay suggestBks), cut to
   what the warehouse holds. Usual load and Copy a teammate fill the same numbers; none of the three writes anything.

   MOTION: nothing here re-mounts on a press (stable keys, no component defined inside a render). A pressed number ticks
   (transform only), the In van numbers count up once after a load (text only). Lite Mode and reduced motion get the end
   state at once. The game chests live on in LoadingBay.jsx for Agent Inventory and in tag game-edition-v1. */
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { convertToBks, getLocalDayKey, isPromo, plainSaveError } from '../utils/helpers';
import { unitOf, teamLoad, suggestBks } from '../utils/vanBay';
import { playSound, unlockSounds } from '../hooks/useSound';
import { notify } from './Toast.jsx';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('id-ID');
const plural = (n, w) => `${fmt(n)} ${w}${n === 1 ? '' : 's'}`;
const still = () => document.documentElement.classList.contains('lite-mode') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* the Sales Terminal's own − + keys (MerchantSalesView stepCls): same press, same size, same click - this screen's colours */
const stepCls = 'kpm-press kpm-hover shrink-0 w-11 h-11 lg:w-8 lg:h-8 rounded border border-[var(--line-2)] bg-[var(--inset)] text-[var(--ink)] text-lg font-black leading-none flex items-center justify-center';
const keyCls = 'kpm-press text-xs font-semibold px-3 py-2 lg:py-1.5 rounded border border-[var(--line-2)] bg-[var(--raised)] text-[var(--ink)] hover:border-[var(--accent-edge)] disabled:opacity-45';

/* A number that counts UP to a higher value once (a load landing); any other change is written at once. The text is set
   by hand on purpose: React never owns this node's text, so the count can not fight a re-render. */
function CountUp({ value }) {
    const el = useRef(null), prev = useRef(value);
    useLayoutEffect(() => {
        const node = el.current, from = prev.current;
        prev.current = value;
        if (!(value > from) || still()) { node.textContent = fmt(value); return undefined; }
        let raf = 0;
        const t0 = performance.now();
        /* a frame's own clock can read a hair BEFORE t0: without the floor the first frame showed "-4" (lab, 2026-11-16) */
        const step = (now) => { const k = Math.max(0, Math.min(1, (now - t0) / 600)); node.textContent = fmt(from + (value - from) * k); if (k < 1) raf = requestAnimationFrame(step); };
        raf = requestAnimationFrame(step);
        return () => { cancelAnimationFrame(raf); node.textContent = fmt(value); };
    }, [value]);
    return <span ref={el} />;
}

export default function LoadSheet({ agent, warehouse, stock, promo = [], soldToday = {}, lastDay = { day: '', by: {} }, team = [], canEdit, onLoad, onReturn, onPreset, onDirty, onClear, tabs = [] }) {
    const all = useMemo(() => [...stock, ...promo], [stock, promo]);
    const P = useMemo(() => Object.fromEntries(all.map(p => [p.id, p])), [all]);
    /* the van, in packs, from its live rows - and its promo goods in pcs, from their own field (vanBay movePromo) */
    const vanOf = useMemo(() => {
        const m = {};
        for (const r of [...(agent.activeCanvas || []), ...(agent.promoCanvas || [])]) {
            const p = P[r.productId];
            if (p) m[r.productId] = Math.round(((m[r.productId] || 0) + convertToBks(r.qty, r.unit, p)) * 1000) / 1000;
        }
        return m;
    }, [agent.activeCanvas, agent.promoCanvas, P]);

    const [tab, setTab] = useState('load');
    const [qty, setQty] = useState({});      // packs going INTO the van, by product
    const [back, setBack] = useState({});    // packs going BACK to the warehouse, by product
    const [why, setWhy] = useState({});      // a failed line's reason, by product
    const [busy, setBusy] = useState(false);
    const goLock = useRef(false);
    const [report, setReport] = useState(null);
    const inputs = useRef({});

    const ret = tab === 'return';
    const map = ret ? back : qty, setMap = ret ? setBack : setQty;
    const cap = (p) => (ret ? vanOf[p.id] || 0 : p.stock || 0);
    const rows = ret ? all.filter(p => (vanOf[p.id] || 0) > 0) : all;
    const lines = rows.filter(p => map[p.id] > 0);
    const pending = Object.values(qty).filter(v => v > 0).length + Object.values(back).filter(v => v > 0).length;
    useEffect(() => { onDirty?.(pending); }, [pending]);   // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => () => onDirty?.(0), []);               // eslint-disable-line react-hooks/exhaustive-deps

    const tick = (id) => { const el = inputs.current[id]; if (el && !still()) el.animate([{ transform: 'scale(1.16)' }, { transform: 'scale(1)' }], { duration: 140, easing: 'ease-out' }); };
    /* never below 0, never above what the warehouse (or, on a return, the van) holds */
    const clamp = (p, n) => Math.max(0, Math.min(cap(p), Math.round(n) || 0));
    const put = (p, n) => {
        if (busy || !canEdit) return;
        setMap(m => ({ ...m, [p.id]: clamp(p, n) }));
        setWhy(w => (w[p.id] ? { ...w, [p.id]: '' } : w));
    };
    /* one press of − + is one slop of that product (10 packs unless the product says otherwise); a promo item is one piece.
       The new number is worked out from the number in state, not the one this render saw, so two fast presses count twice. */
    const stepOf = (p) => (isPromo(p) ? 1 : convertToBks(1, 'Slop', p));
    const bump = (p, dir) => {
        if (busy || !canEdit) return;
        const now = map[p.id] || 0;
        unlockSounds().then(() => playSound(clamp(p, now + dir * stepOf(p)) !== now ? 'click' : 'error'));
        tick(p.id);
        setMap(m => ({ ...m, [p.id]: clamp(p, (m[p.id] || 0) + dir * stepOf(p)) }));
        setWhy(w => (w[p.id] ? { ...w, [p.id]: '' } : w));
    };

    /* Fill suggested, Usual load and Copy a teammate all end here: numbers into the sheet, cut to the warehouse, nothing written */
    const fill = (src, done, none) => {
        if (busy || !canEdit) return;
        const next = { ...qty };
        let n = 0, cut = 0;
        for (const { id, bks } of src) {
            const p = P[id];
            if (!p || !(bks > 0)) continue;
            const v = Math.min(Math.round(bks), p.stock || 0);
            if (v < Math.round(bks)) cut++;
            if (v > 0) { next[id] = v; n++; }
        }
        if (!n) return notify(none);
        setQty(next); setTab('load'); setReport(null);
        unlockSounds().then(() => playSound('click'));
        notify(`${done}: ${plural(n, 'product')}, not saved yet${cut ? ` · ${cut} cut to what the warehouse holds` : ''}. Press Load van to save.`);
    };
    const dayWord = lastDay.day ? new Date(`${lastDay.day}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
    const sug = (p) => (lastDay.day && !isPromo(p) ? suggestBks(lastDay.by[p.id], vanOf[p.id]) : 0);
    const fillSuggested = () => (lastDay.day
        ? fill(stock.map(p => ({ id: p.id, bks: sug(p) })), 'Suggested load filled', `Nothing to suggest: the van already holds what ${agent.name} sold on ${dayWord}.`)
        : notify(`${agent.name} has no sales on record before today, so there is nothing to suggest.`));
    const fillUsual = () => ((agent.loadPreset || []).length
        ? fill(agent.loadPreset.map(({ id, qty: q, unit }) => ({ id, bks: convertToBks(q, unit, P[id]) })), 'Usual load filled', `Nothing from ${agent.name}'s usual load is in this warehouse right now.`)
        : notify(`No usual load saved for ${agent.name} yet. Set the numbers, then press Save as usual load.`));
    const vans = useMemo(() => teamLoad(team, P), [team, P]);
    const copyVan = (id) => { const v = vans.find(x => x.id === id); if (v) fill(v.items.map(({ id: pid, bks }) => ({ id: pid, bks })), `${v.name}'s load copied`, `Nothing in ${v.name}'s van can be taken from this warehouse.`); };
    const saveUsual = async () => {
        const next = Object.entries(qty).filter(([id, v]) => v > 0 && P[id]).map(([id, v]) => ({ id, qty: v, unit: unitOf(P[id]) }));
        if (!next.length || busy) return;
        const ok = await onPreset?.(next);
        notify(ok === true ? `Saved as ${agent.name}'s usual load: ${plural(next.length, 'product')}.` : `The usual load was not saved for ${agent.name}. Try again.`);
    };

    /* packs and promo pieces are counted apart - a T-shirt is never a Bks */
    const words = (bks, pcs) => [bks > 0 && `${fmt(bks)} Bks`, pcs > 0 && `${fmt(pcs)} pcs`].filter(Boolean).join(' + ') || '0 Bks';
    const moving = lines.reduce((a, p) => a + (isPromo(p) ? 0 : map[p.id]), 0), movingPcs = lines.reduce((a, p) => a + (isPromo(p) ? map[p.id] : 0), 0);
    const vanBks = all.reduce((a, p) => a + (isPromo(p) ? 0 : vanOf[p.id] || 0), 0);

    /* ── LOAD VAN / RETURN - the ONE press ── */
    async function go() {
        /* goLock: a second press in the same frame, before `busy` has painted, must not load the van twice (Antigravity's
           2026-11-16 review) */
        if (busy || goLock.current || !lines.length || !canEdit) return;
        goLock.current = true;
        setBusy(true); setReport(null);
        const done = [], bad = {};
        for (const p of lines) {
            const bks = map[p.id];
            let r;
            try { r = await (ret ? onReturn : onLoad)(p.id, bks); }
            catch (err) { r = { ok: false, reason: plainSaveError(err) }; }
            if (r && r.ok) done.push({ id: p.id, name: p.name, bks, promo: isPromo(p) });
            else bad[p.id] = (r && r.reason) || 'Not saved';
        }
        const failed = Object.keys(bad).length;
        setMap(m => Object.fromEntries(Object.entries(m).filter(([id]) => bad[id])));
        setWhy(bad); setBusy(false); goLock.current = false;
        if (!done.length) return notify(`Nothing was saved for ${agent.name}. The reason is on each line.`);
        const total = words(done.reduce((a, d) => a + (d.promo ? 0 : d.bks), 0), done.reduce((a, d) => a + (d.promo ? d.bks : 0), 0));
        const no = `${ret ? 'BK' : 'SJ'}-${getLocalDayKey().replace(/-/g, '')}-${String(agent.id).slice(-4)}-${new Date().toTimeString().slice(0, 5).replace(':', '')}`;
        setReport({ ret, no, rows: done, total });
        notify(`${agent.name}: ${plural(done.length, 'product')} ${ret ? 'returned to the warehouse' : 'loaded'} · ${total} · ${no}${failed ? ` · ${failed} failed, the reason is on its line` : ''}`);
    }

    const allTabs = [['load', 'Load'], ['return', 'Return'], ...tabs.map(t => [t.id, t.label])];
    const extra = tabs.find(t => t.id === tab);
    const head = ret ? ['Product', 'Warehouse', 'In van', 'Sold today', 'Return'] : ['Product', 'Warehouse', 'In van', 'Last day sold', 'Load'];

    return (
        <>
            <div className="kpm-fleet-tabs" role="tablist" aria-label={`${agent.name}'s van`}>
                {allTabs.map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} disabled={busy} onClick={() => setTab(id)}>{label}</button>
                ))}
            </div>
            <div className="kpm-fleet-body custom-scrollbar">
                {extra ? extra.body : (
                    <>
                        <div className="kpm-fleet-tools flex flex-wrap items-center gap-2 px-4 py-2.5">
                            {!canEdit && <p className="text-xs text-[var(--ink-muted)]">View only: your tier cannot load a van.</p>}
                            {canEdit && !ret && (
                                <>
                                    <button type="button" className={keyCls} data-guide="fill" disabled={busy} onClick={fillSuggested}>Fill suggested</button>
                                    <button type="button" className={keyCls} disabled={busy} onClick={fillUsual}>Usual load</button>
                                    {vans.length > 0 && (
                                        <select aria-label="Copy a teammate's load" value="" disabled={busy} onChange={(e) => copyVan(e.target.value)} className={`${keyCls} max-w-[11rem]`}>
                                            <option value="">Copy a teammate…</option>
                                            {vans.map(v => <option key={v.id} value={v.id}>{v.name} · {fmt(v.bks)} Bks</option>)}
                                        </select>
                                    )}
                                    {lines.length > 0 && <button type="button" className={keyCls} disabled={busy} onClick={saveUsual}>Save as usual load</button>}
                                </>
                            )}
                            {canEdit && ret && vanBks > 0 && <button type="button" className={`${keyCls} ml-auto !text-[var(--danger-ink)]`} disabled={busy} onClick={onClear}>Reconcile &amp; clear</button>}
                        </div>
                        {rows.length === 0 ? (
                            <p className="px-4 py-8 text-sm text-[var(--ink-muted)]">{ret ? `${agent.name}'s van is empty. Nothing to return.` : `${warehouse} has no products yet.`}</p>
                        ) : (
                            <>
                                <div className="kpm-fleet-line kpm-fleet-linehead" aria-hidden="true">{head.map((h, i) => <span key={h} className={i ? 'c' : 'n'}>{h}</span>)}</div>
                                {rows.map(p => {
                                    const q = map[p.id] || 0, have = vanOf[p.id] || 0, w = unitOf(p), s = ret ? 0 : sug(p), sold = soldToday[p.id] || 0, last = lastDay.by[p.id] || 0;
                                    const notes = [isPromo(p) && 'promo · pcs', !ret && sold > 0 && `sold today ${fmt(sold)}`].filter(Boolean).join(' · ');
                                    return (
                                        <div key={p.id} className={`kpm-fleet-line${q ? ' on' : ''}`}>
                                            <span className="n">
                                                <b>{p.name}</b>
                                                {(notes || s > 0) && <small>{notes}{notes && s > 0 ? ' · ' : ''}{s > 0 && <em>suggested {fmt(s)}</em>}</small>}
                                                {why[p.id] && <small className="why" role="alert">Not saved: {why[p.id]}</small>}
                                            </span>
                                            <span className="c">{fmt(p.stock)}</span>
                                            <span className="c"><CountUp value={have} /></span>
                                            <span className="c">{fmt(ret ? sold : last)}</span>
                                            <span className="s">
                                                {canEdit ? (
                                                    <>
                                                        <button type="button" className={`${stepCls}${q > 0 ? '' : ' opacity-40'}`} aria-label={`${p.name}: less`} disabled={busy} onClick={() => bump(p, -1)}>−</button>
                                                        <input ref={(el) => { inputs.current[p.id] = el; }} type="number" inputMode="numeric" min="0" placeholder="0" disabled={busy}
                                                            aria-label={`${p.name}: ${w} to ${ret ? 'return' : 'load'}`} value={q || ''} onChange={(e) => put(p, parseInt(e.target.value, 10) || 0)}
                                                            className="w-16 lg:w-14 min-h-[44px] lg:min-h-0 lg:h-8 bg-[var(--inset)] border border-[var(--line-2)] text-center text-base lg:text-sm font-bold tabular-nums outline-none focus:border-[var(--accent-edge)] rounded p-1 text-[var(--ink)]" />
                                                        <button type="button" className={`${stepCls}${q < cap(p) ? '' : ' opacity-40'}`} aria-label={`${p.name}: more`} data-guide="load-plus" disabled={busy} onClick={() => bump(p, 1)}>+</button>
                                                    </>
                                                ) : <b className="tabular-nums">{fmt(have)} {w}</b>}
                                            </span>
                                            <small className="ph">{(notes || s > 0) && <>{notes.replace('sold today', 'today')}{notes && s > 0 ? ' · ' : ''}{s > 0 && <em>suggested {fmt(s)}</em>} · </>}Warehouse {fmt(p.stock)} · in van <CountUp value={have} /> · {ret ? `sold today ${fmt(sold)}` : `last day ${fmt(last)}`}</small>
                                        </div>
                                    );
                                })}
                                {!ret && canEdit && lastDay.day && <p className="px-4 py-3 text-xs text-[var(--ink-muted)]">Suggested = what {agent.name} sold on {dayWord}, less what is still in the van.</p>}
                            </>
                        )}
                        {report && (
                            <div className="mx-4 my-3 border border-[var(--line-2)] rounded text-xs" role="status">
                                <p className="flex justify-between gap-3 px-3 py-2 border-b border-[var(--line-2)]"><b>{report.ret ? 'BUKTI KEMBALI' : 'SURAT JALAN'}</b><span className="font-mono text-[var(--ink-muted)]">{report.no}</span></p>
                                <p className="px-3 pt-2 text-[var(--ink-muted)]">{report.ret ? `${agent.name} · ${agent.vehicle || '—'} → ${warehouse}` : `${warehouse} → ${agent.name} · ${agent.vehicle || '—'}`}</p>
                                <ol className="px-3 py-2 space-y-1">{report.rows.map(x => <li key={x.id} className="flex justify-between gap-3"><span>{x.name}</span><span className="tabular-nums">{fmt(x.bks)} {x.promo ? 'pcs' : 'Bks'}</span></li>)}</ol>
                                <p className="flex justify-between gap-3 px-3 py-2 border-t border-[var(--line-2)] font-bold"><span>Total</span><span className="tabular-nums">{report.total} · {plural(report.rows.length, 'product')}</span></p>
                            </div>
                        )}
                    </>
                )}
            </div>
            {!extra && canEdit && (
                <div className="kpm-fleet-foot">
                    <span className="sum">{plural(lines.length, 'product')} · <b>{lines.length ? (ret ? '−' : '+') : ''}{words(moving, movingPcs)}</b><span className="after"> · van after {ret ? 'return' : 'loading'} <b>{fmt(vanBks + (ret ? -moving : moving))} Bks</b></span></span>
                    <span className="flex gap-2 shrink-0">
                        {lines.length > 0 && <button type="button" className={keyCls} disabled={busy} onClick={() => { setMap({}); setWhy({}); notify(`${ret ? 'Return' : 'Load'} sheet cleared for ${agent.name}. Nothing was saved.`); }}>Clear</button>}
                        <button type="button" data-ponder="go" disabled={!lines.length || busy} onClick={go}
                            className="kpm-press text-sm font-bold px-4 py-2.5 lg:py-2 rounded bg-[var(--gold)] text-[var(--gold-ink)] disabled:opacity-45">
                            {busy ? 'Saving…' : `${ret ? 'Return to warehouse' : 'Load van'} · ${words(moving, movingPcs)}`}
                        </button>
                    </span>
                </div>
            )}
        </>
    );
}
