import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, Save } from 'lucide-react';
import { formatRupiah, convertToBks } from '../utils/helpers';
import { MIN_STOCK_UNITS, DEFAULT_MIN_QTY, DEFAULT_MIN_UNIT } from '../utils/stockThreshold';
import { PERIODS, periodWindow, txDate } from '../utils/period';
import SafetyStatus from './SafetyStatus';

/* THE LIVE PANEL — what used to be three "Executive Targets" cards.
   ────────────────────────────────────────────────────────────────────────────
   Aldi, 2026-08-25: *"i want to see daily week, month and year only, dont use total"*.

   That one sentence decided this file. Every figure here reads for the period on the switch, and
   there is no running total anywhere on the dashboard any more — an all-time number only ever
   goes up, so it can never be good or bad news.

   ⚠️ THE SWITCH DELETED TWO PANELS. "Monthly Trajectory" and the separate "7-Day Revenue Graph"
   were the same chart on two different settings. One chart, four settings, and the screen got
   the space back that he asked for without anything being sacrificed for it.

   ⚠️ THE CHART IS CUMULATIVE AGAINST A PACE LINE, not a bar per bucket. That is what makes one
   chart work for all four periods: the dashed line is where you would be if you were exactly on
   target, so "under the line" means the same thing whether the line covers thirteen hours or
   twelve months. A bar chart would have to be re-read every time the period changed.

   ⚠️ NUMBERS ARE NOT PRINTED ON THE CHART. His ask: *"do not put too much number in there but
   hover to show the extra number"*. Scrubbing writes into ONE reserved line, so nothing on the
   screen moves when a value appears.                                                          */

/* Bal is the unit the business counts in, and every product packs differently, so a quantity is
   only meaningful once it has been through that product's own packing. Shared by the volume
   figure and the mix ring. */
const toBal = (item, product) => {
    const packsPerSlop = product.packsPerSlop || 10;
    const slopsPerBal  = product.slopsPerBal  || 20;
    const packsPerBal  = packsPerSlop * slopsPerBal;
    if (packsPerBal <= 0) return 0;
    if (item.unit === 'Bal')    return item.qty;
    if (item.unit === 'Karton') return item.qty * (product.balsPerCarton || 4);
    return convertToBks(item.qty, item.unit, product) / packsPerBal;
};

/* a short rupiah for a label, where the exact figure would only be noise */
const compactRp = (v) => {
    const n = Number(v) || 0;
    if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1).replace('.', ',')} M`;
    if (n >= 1e6) return `Rp ${Math.round(n / 1e6)} jt`;
    return formatRupiah(n);
};

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

/* 🔴 "better to add some commas here" — his screenshot of the goals form, 2026-08-25, showing
   `500000000` in the omzet box. Nine unbroken digits cannot be read; you count them.
   ⚠️ The separator is a DOT, not a comma. `formatRupiah` runs on `id-ID`, where the thousands
   separator is a dot and the decimal mark is the comma — printing commas here would disagree
   with every rupiah figure the app already renders.
   The FIELD stays digits-only: the grouping is added on the way out and stripped on the way in,
   so nothing downstream ever sees a formatted string. */
const groupDigits = (v) =>
    String(v ?? '').replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function DashboardBenchmarks({
    transactions = [], inventory = [], appSettings, onSaveTargets, canEditGoals,
    auditLogs = [], sessionStatus, period = 'bulan', onPeriod,
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [scrub, setScrub]   = useState(null);   // index being read, or null
    const [ringOn, setRingOn] = useState(null);   // 'skm' | 'skt' | null
    const [arrived, setArrived] = useState(false);
    const sparkRef = useRef(null);

    const monthlyTarget = Number(appSettings?.targetMonthlyRevenue) || 500000000;
    const dailyBalTarget = Number(appSettings?.targetDailyBal) || 50;
    const filterTarget = Number(appSettings?.targetFilterRatio) || 60;

    /* CALCULATED, WITH AN OVERRIDE — his call, 2026-08-25. He sets the month and the day; the
       week and the year follow from the month unless he types something else. A blank override
       is not zero, it means "work it out", which is why every read goes through this. */
    const revTarget = (p) => {
        const o = Number(appSettings?.[`targetRevenue_${p}`]);
        if (Number.isFinite(o) && o > 0) return o;
        if (p === 'hari')   return monthlyTarget / 30;
        if (p === 'minggu') return (monthlyTarget / 30) * 7;
        if (p === 'tahun')  return monthlyTarget * 12;
        return monthlyTarget;
    };
    const balTarget = (p) => {
        const o = Number(appSettings?.[`targetBal_${p}`]);
        if (Number.isFinite(o) && o > 0) return o;
        if (p === 'minggu') return dailyBalTarget * 7;
        if (p === 'bulan')  return dailyBalTarget * 30;
        if (p === 'tahun')  return dailyBalTarget * 365;
        return dailyBalTarget;
    };

    const [form, setForm] = useState({});
    useEffect(() => {
        if (!isEditing) return;
        setForm({
            targetMonthlyRevenue: monthlyTarget,
            targetDailyBal: dailyBalTarget,
            targetFilterRatio: filterTarget,
            targetRevenue_hari:   appSettings?.targetRevenue_hari   || '',
            targetRevenue_minggu: appSettings?.targetRevenue_minggu || '',
            targetRevenue_tahun:  appSettings?.targetRevenue_tahun  || '',
            defaultMinStockQty:  appSettings?.defaultMinStockQty  || DEFAULT_MIN_QTY,
            defaultMinStockUnit: appSettings?.defaultMinStockUnit || DEFAULT_MIN_UNIT,
        });
    }, [isEditing, appSettings]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── EVERYTHING THE PANEL SHOWS, for this period and the one before it ── */
    const M = useMemo(() => {
        const now = new Date();
        const prod = new Map(inventory.map(p => [p.id, p]));

        /* ⚠️ the window comes from utils/period so the velocity list below cannot drift onto a
           different month than this panel — see the note in that file. */
        const w = periodWindow(period, now);
        const { start, prevStart, buckets, done, bucketOf, tickOf } = w;

        const perBucket = new Array(buckets).fill(0);
        let omzet = 0, laba = 0, bal = 0, filterBal = 0, kretekBal = 0;
        let prevOmzet = 0, prevLaba = 0;

        transactions.forEach(t => {
            if (t.type !== 'SALE') return;
            const d = txDate(t);
            if (isNaN(d)) return;
            const total = t.total || 0, profit = t.totalProfit || 0;

            if (d >= start) {
                omzet += total; laba += profit;
                const b = bucketOf(d);
                if (b >= 0 && b < buckets) perBucket[b] += total;
                (t.items || []).forEach(item => {
                    const p = prod.get(item.productId) || {};
                    const q = toBal(item, p);
                    bal += q;
                    const name = (item.name || '').toLowerCase();
                    const type = (item.type || '').toLowerCase();
                    if (name.includes('filter') || type.includes('skm') || name.includes('mild')) filterBal += q;
                    else kretekBal += q;
                });
            } else if (d >= prevStart) {
                prevOmzet += total; prevLaba += profit;
            }
        });

        /* cumulative, so the shape can be compared with a straight pace line */
        const series = [0];
        for (let i = 0; i < Math.min(done, buckets); i++) series.push(series[series.length - 1] + perBucket[i]);

        const margin     = omzet > 0 ? (laba / omzet) * 100 : 0;
        const prevMargin = prevOmzet > 0 ? (prevLaba / prevOmzet) * 100 : 0;
        const totalMix   = filterBal + kretekBal;

        return {
            omzet, laba, margin, bal, series, buckets, done, tickOf,
            labaDelta:   prevLaba > 0 ? ((laba - prevLaba) / prevLaba) * 100 : null,
            marginDelta: prevOmzet > 0 ? margin - prevMargin : null,
            skm: totalMix > 0 ? Math.round((filterBal / totalMix) * 100) : 0,
            revTarget: revTarget(period),
            balTarget: balTarget(period),
        };
    }, [transactions, inventory, period, appSettings]); // eslint-disable-line react-hooks/exhaustive-deps

    /* one arrival on mount, and again whenever the period changes */
    useEffect(() => {
        setArrived(false);
        setScrub(null);
        const id = requestAnimationFrame(() => requestAnimationFrame(() => setArrived(true)));
        return () => cancelAnimationFrame(id);
    }, [period]);

    /* ── the chart geometry. viewBox units; the SVG stretches, the maths does not. ── */
    const VB = { w: 336, h: 92, top: 8, bot: 86 };
    const span = VB.w * (M.done / M.buckets);
    const n = M.series.length;
    const X = (i) => (n < 2 ? 0 : (i * span) / (n - 1));
    const Y = (v) => VB.bot - Math.min(1, v / (M.revTarget || 1)) * (VB.bot - VB.top);
    const points = M.series.map((v, i) => `${X(i)},${Y(v)}`).join(' L');

    const onScrub = (e) => {
        const el = sparkRef.current;
        if (!el || n < 2) return;
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const frac = Math.max(0, Math.min(1, ((e.clientX - r.left) / r.width) / (M.done / M.buckets || 1)));
        setScrub(Math.round(frac * (n - 1)));
    };
    const onScrubKey = (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const cur = scrub === null ? n - 1 : scrub;
        setScrub(Math.max(0, Math.min(n - 1, cur + (e.key === 'ArrowRight' ? 1 : -1))));
    };

    /* what the scrub line says: the value at that point, and how far off the pace it was */
    let scrubKey = '', scrubVal = null, scrubGap = 0;
    if (scrub !== null && n > 1) {
        const need = (scrub / (n - 1)) * (M.done / M.buckets) * M.revTarget;
        scrubVal = M.series[scrub];
        scrubGap = scrubVal - need;
        scrubKey = scrub === 0 ? 'Mulai' : M.tickOf(scrub - 1);
    }

    /* ── the ring. Each arc is a dash of the full circumference revealed by pulling the offset
          down; the second is rotated to start where the first ended. `transformOrigin` is in USER
          units — percentages need transform-box: fill-box and are the usual reason a ring spins
          around the wrong point. ── */
    /* 🔴 "percentage is too big that its collapsing with the circle" — his screenshot, 2026-08-25,
       showing 100% touching the ring on both sides. The hole is the readout, so the hole has to be
       big enough to hold the widest thing that can land in it, and that is "100%" at four glyphs.
       Measured: r 40 with a 15 stroke leaves an inner diameter of 65px, and 26px Barlow Condensed
       renders "100%" at roughly 52px — before the hover thickened the stroke to 22 and took the
       hole down to 58px. Three changes, all in the same direction: a slightly larger radius, a
       thinner stroke, and a smaller figure.
       ⚠️ A stroked circle grows BOTH ways, so every point of hover thickness costs half of it out
       of the hole. That is why the hover step is now 4px and not 7. */
    const R = 41, C = 2 * Math.PI * R;
    const STROKE = 13, STROKE_ON = 17;
    const arc = (fraction, fromFraction) => ({
        strokeDasharray: C,
        strokeDashoffset: arrived ? C - fraction * C : C,
        transformOrigin: '54px 54px',
        transform: `rotate(${-90 + fromFraction * 360}deg)`,
    });

    const p = PERIODS.find(x => x.key === period) || PERIODS[2];
    const left = M.buckets - M.done;
    const balPct = Math.min(100, pct(M.bal, M.balTarget));

    const handleSave = (e) => {
        e.preventDefault();
        const num = (v) => (v === '' || v === null || v === undefined ? '' : Number(v));
        onSaveTargets({
            targetMonthlyRevenue: Number(form.targetMonthlyRevenue) || monthlyTarget,
            targetDailyBal: Number(form.targetDailyBal) || dailyBalTarget,
            targetFilterRatio: Number(form.targetFilterRatio) || filterTarget,
            targetRevenue_hari:   num(form.targetRevenue_hari),
            targetRevenue_minggu: num(form.targetRevenue_minggu),
            targetRevenue_tahun:  num(form.targetRevenue_tahun),
            defaultMinStockQty:  Number(form.defaultMinStockQty) || DEFAULT_MIN_QTY,
            defaultMinStockUnit: MIN_STOCK_UNITS.includes(form.defaultMinStockUnit)
                ? form.defaultMinStockUnit : DEFAULT_MIN_UNIT,
        });
        setIsEditing(false);
    };

    return (
        <div className={`kpm-mod live ${arrived ? 'kpm-arr in' : 'kpm-arr'}`}>
            <div className="kpm-head">
                <span className="slot">PANEL · LIVE</span>
                <div className="line">
                    <h3>{p.title}</h3>
                    {canEditGoals && (
                        <button type="button" className="kpm-btn" onClick={() => setIsEditing(true)}>
                            <Settings size={13} /> Atur target
                        </button>
                    )}
                </div>
                <SafetyStatus auditLogs={auditLogs} sessionStatus={sessionStatus} />
            </div>

            <div className="kpm-shelf">
                <div className="kpm-period" role="group" aria-label="Periode">
                    {PERIODS.map(x => (
                        <button
                            key={x.key}
                            type="button"
                            aria-pressed={x.key === period}
                            onClick={() => onPeriod && onPeriod(x.key)}
                        >{x.label}</button>
                    ))}
                </div>

                {/* ── OMZET, and the pace chart ── */}
                <div style={{ marginTop: 'var(--s5)' }}>
                    <div className="kpm-ro on" style={{ minHeight: 0 }}>
                        <span className="k">Omzet</span>
                        <span className="v">{left > 0 ? `${left} ${p.unit} lagi` : 'periode penuh'}</span>
                    </div>
                    <div className="kpm-omzet" style={{ marginTop: 'var(--s2)' }}>
                        {formatRupiah(M.omzet)}
                    </div>

                    <div
                        className={`kpm-spark${scrub !== null ? ' on' : ''}`}
                        ref={sparkRef}
                        tabIndex={0}
                        role="img"
                        aria-label={`Omzet ${p.title} dibanding target. Panah kiri kanan untuk membaca.`}
                        onPointerMove={onScrub}
                        onPointerDown={onScrub}
                        onPointerLeave={(e) => { if (e.pointerType !== 'touch') setScrub(null); }}
                        onKeyDown={onScrubKey}
                        style={{ marginTop: 'var(--s3)' }}
                    >
                        <svg viewBox={`0 0 ${VB.w} ${VB.h}`} width="100%" height="92"
                             preserveAspectRatio="none" aria-hidden="true">
                            <line x1="0" y1={VB.bot} x2={VB.w} y2={VB.bot}
                                  stroke="var(--line-3)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                            <line x1="0" y1={VB.bot} x2={VB.w} y2={VB.top}
                                  stroke="var(--line-3)" strokeWidth="1" strokeDasharray="4 4"
                                  vectorEffect="non-scaling-stroke"
                                  style={{ opacity: arrived ? 1 : 0, transition: 'opacity 300ms cubic-bezier(.2,.8,.3,1)' }} />
                            {n > 1 && (
                                <>
                                    <path d={`M0,${VB.bot} L${points} L${X(n - 1)},${VB.bot} Z`}
                                          fill="var(--lamp-on)" fillOpacity=".13"
                                          style={{ opacity: arrived ? 1 : 0, transition: 'opacity 300ms cubic-bezier(.2,.8,.3,1)' }} />
                                    <path d={`M${points}`} fill="none" stroke="var(--lamp-on)" strokeWidth="2"
                                          strokeLinejoin="round" strokeLinecap="round"
                                          vectorEffect="non-scaling-stroke" />
                                </>
                            )}
                        </svg>
                        {scrub !== null && n > 1 && (
                            <>
                                <div className="kpm-cross" style={{ opacity: 1, left: `${(X(scrub) / VB.w) * 100}%` }} />
                                <div className="kpm-scrub" style={{
                                    opacity: 1,
                                    left: `${(X(scrub) / VB.w) * 100}%`,
                                    top:  `${(Y(M.series[scrub]) / VB.h) * 100}%`,
                                }} />
                            </>
                        )}
                    </div>

                    <div className={`kpm-ro${scrub !== null ? ' on' : ''}`}>
                        <span className="k">{scrubKey}</span>
                        <span className="v">
                            {scrubVal !== null && (
                                <>
                                    {compactRp(scrubVal)}{' · '}
                                    <span className={scrubGap < 0 ? 'neg' : ''}>
                                        {scrubGap < 0 ? '' : '+'}{compactRp(scrubGap)} vs pace
                                    </span>
                                </>
                            )}
                        </span>
                    </div>

                    <div className="kpm-ro on">
                        <span className="k">{pct(M.omzet, M.revTarget)}% dari target</span>
                        <span className="v">Target {compactRp(M.revTarget)}</span>
                    </div>
                </div>

                {/* ── LABA and MARGIN, each against the period before ── */}
                <div className="kpm-pair" style={{ marginTop: 'var(--s5)' }}>
                    <div>
                        <span className="k">Laba</span>
                        <span className="v">{formatRupiah(M.laba)}</span>
                        <span className={`delta${M.labaDelta !== null && M.labaDelta < 0 ? ' down' : ''}`}>
                            {M.labaDelta === null ? 'belum ada pembanding'
                              : `${M.labaDelta >= 0 ? '+' : '−'}${Math.abs(M.labaDelta).toFixed(1).replace('.', ',')}% vs sebelumnya`}
                        </span>
                    </div>
                    <div>
                        <span className="k">Margin</span>
                        <span className="v">{M.margin.toFixed(1).replace('.', ',')}%</span>
                        <span className={`delta${M.marginDelta !== null && M.marginDelta < 0 ? ' down' : ''}`}>
                            {M.marginDelta === null ? 'belum ada pembanding'
                              : `${M.marginDelta >= 0 ? '+' : '−'}${Math.abs(M.marginDelta).toFixed(1).replace('.', ',')} pts`}
                        </span>
                    </div>
                </div>

                {/* ── VOLUME ── */}
                <div style={{ marginTop: 'var(--s5)', borderTop: '1px solid var(--line)', paddingTop: 'var(--s5)' }}>
                    <div className="kpm-ro on" style={{ minHeight: 0 }}>
                        <span className="k">Bal keluar</span>
                        <span className="v">{balPct}% dari {Math.round(M.balTarget)} bal</span>
                    </div>
                    <div className="kpm-omzet" style={{ fontSize: '30px', marginTop: 'var(--s2)' }}>
                        {M.bal >= 100 ? Math.round(M.bal).toLocaleString('id-ID')
                                      : M.bal.toFixed(1).replace('.', ',')}
                    </div>
                    <span className="kpm-trk" style={{ marginTop: 'var(--s3)' }}>
                        <i style={{ width: arrived ? `${balPct}%` : 0 }} />
                    </span>
                </div>

                {/* ── THE MIX. Nothing is printed in the ring until you point at an arc. ── */}
                <div style={{ marginTop: 'var(--s5)', borderTop: '1px solid var(--line)', paddingTop: 'var(--s5)' }}>
                    <div className="kpm-ro on" style={{ minHeight: 0 }}>
                        <span className="k">Campuran</span>
                        <span className="v">target {filterTarget}% filter</span>
                    </div>
                    <div className="kpm-ring-wrap" style={{ marginTop: 'var(--s4)' }}>
                        <svg viewBox="0 0 108 108" width="108" height="108" role="img"
                             aria-label={`Filter ${M.skm} persen, kretek ${100 - M.skm} persen`}>
                            <circle cx="54" cy="54" r={R} fill="none" stroke="var(--raised)" strokeWidth={STROKE} />
                            <circle className="kpm-arc" cx="54" cy="54" r={R} fill="none"
                                    stroke="var(--ink)" strokeWidth={ringOn === 'skm' ? STROKE_ON : STROKE}
                                    style={arc(M.skm / 100, 0)}
                                    onPointerEnter={() => setRingOn('skm')}
                                    onPointerDown={() => setRingOn('skm')}
                                    onPointerLeave={(e) => { if (e.pointerType !== 'touch') setRingOn(null); }} />
                            <circle className="kpm-arc" cx="54" cy="54" r={R} fill="none"
                                    stroke="var(--lamp-on)" strokeWidth={ringOn === 'skt' ? STROKE_ON : STROKE}
                                    style={arc((100 - M.skm) / 100, M.skm / 100)}
                                    onPointerEnter={() => setRingOn('skt')}
                                    onPointerDown={() => setRingOn('skt')}
                                    onPointerLeave={(e) => { if (e.pointerType !== 'touch') setRingOn(null); }} />
                            <text className={`kpm-ring-txt${ringOn ? ' on' : ''}`} x="54" y="49"
                                  dominantBaseline="central">
                                {ringOn === 'skt' ? `${100 - M.skm}%` : `${M.skm}%`}
                            </text>
                            <text className={`kpm-ring-sub${ringOn ? ' on' : ''}`} x="54" y="64"
                                  dominantBaseline="central">
                                {ringOn === 'skt' ? 'SKT' : 'SKM'}
                            </text>
                        </svg>
                        <div style={{ flex: '1 1 140px' }}>
                            <button type="button"
                                    className={`kpm-key-row${ringOn === 'skm' ? ' on' : ''}`}
                                    onPointerEnter={() => setRingOn('skm')}
                                    onFocus={() => setRingOn('skm')}
                                    onPointerLeave={(e) => { if (e.pointerType !== 'touch') setRingOn(null); }}
                                    onBlur={() => setRingOn(null)}>
                                <i style={{ background: 'var(--ink)' }} /> Filter · SKM
                            </button>
                            <button type="button"
                                    className={`kpm-key-row${ringOn === 'skt' ? ' on' : ''}`}
                                    onPointerEnter={() => setRingOn('skt')}
                                    onFocus={() => setRingOn('skt')}
                                    onPointerLeave={(e) => { if (e.pointerType !== 'touch') setRingOn(null); }}
                                    onBlur={() => setRingOn(null)}>
                                <i style={{ background: 'var(--lamp-on)', border: '1px solid var(--accent-edge)' }} />
                                Kretek · SKT
                            </button>
                            <p className="kpm-safety-hint" style={{
                                color: M.skm >= filterTarget ? 'var(--ink-muted)' : 'var(--danger-ink)',
                            }}>
                                {M.skm >= filterTarget ? 'target tercapai'
                                    : `${filterTarget - M.skm} pts di bawah target`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {isEditing && createPortal(
                <div className="kpm-scrim" onClick={() => setIsEditing(false)}>
                    <div className="kpm-mod live" onClick={(e) => e.stopPropagation()}
                         style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="kpm-head">
                            <span className="slot">PENGATURAN · TARGET</span>
                            <div className="line">
                                <h3>Atur target</h3>
                                <button type="button" className="kpm-btn" onClick={() => setIsEditing(false)}>
                                    <X size={14} /> Tutup
                                </button>
                            </div>
                            <p className="kpm-desc">
                                Isi bulan dan hari saja. Minggu dan tahun dihitung sendiri dari target bulanan —
                                kosongkan kalau mau dihitung otomatis.
                            </p>
                        </div>
                        <form className="kpm-shelf" onSubmit={handleSave}>
                            <label className="kpm-field">
                                <span>Target omzet per bulan (Rp)</span>
                                <input type="text" inputMode="numeric" value={groupDigits(form.targetMonthlyRevenue)}
                                       onChange={(e) => setForm({ ...form, targetMonthlyRevenue: e.target.value.replace(/\D/g, '') })}
                                       required />
                            </label>
                            <label className="kpm-field">
                                <span>Target bal per hari</span>
                                <input type="text" inputMode="decimal" value={form.targetDailyBal ?? ''}
                                       onChange={(e) => setForm({ ...form, targetDailyBal: e.target.value.replace(/[^0-9.]/g, '') })}
                                       required />
                            </label>
                            <label className="kpm-field">
                                <span>Target proporsi filter (%)</span>
                                <input type="text" inputMode="numeric" maxLength={3} value={form.targetFilterRatio ?? ''}
                                       onChange={(e) => setForm({ ...form, targetFilterRatio: e.target.value.replace(/\D/g, '') })}
                                       required />
                            </label>

                            {/* ── the low-stock rule. His ask, 2026-08-25: a quantity AND a unit,
                                  because "50" meant fifty Bks and nobody stocks in Bks. ── */}
                            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--s4)' }}>
                                <p className="kpm-desc" style={{ marginTop: 0 }}>
                                    Barang dianggap <b>menipis</b> kalau sisanya sampai angka ini. Berlaku untuk semua
                                    barang yang belum punya MIN. ALERT sendiri.
                                </p>
                                <div style={{ display: 'flex', gap: 'var(--s3)' }}>
                                    <label className="kpm-field" style={{ flex: '1 1 auto' }}>
                                        <span>Batas menipis</span>
                                        <input type="text" inputMode="decimal" value={form.defaultMinStockQty ?? ''}
                                               onChange={(e) => setForm({ ...form, defaultMinStockQty: e.target.value.replace(/[^0-9.]/g, '') })}
                                               required />
                                    </label>
                                    <label className="kpm-field" style={{ flex: '0 0 130px' }}>
                                        <span>Satuan</span>
                                        <select value={form.defaultMinStockUnit ?? DEFAULT_MIN_UNIT}
                                                onChange={(e) => setForm({ ...form, defaultMinStockUnit: e.target.value })}>
                                            {MIN_STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </label>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--s4)' }}>
                                <p className="kpm-desc" style={{ marginTop: 0 }}>
                                    Kosongkan tiga ini kalau mau dihitung otomatis dari target bulanan.
                                </p>
                                <label className="kpm-field">
                                    <span>Target omzet per hari (Rp) — otomatis {compactRp(monthlyTarget / 30)}</span>
                                    <input type="text" inputMode="numeric" value={groupDigits(form.targetRevenue_hari)}
                                           onChange={(e) => setForm({ ...form, targetRevenue_hari: e.target.value.replace(/\D/g, '') })} />
                                </label>
                                <label className="kpm-field">
                                    <span>Target omzet per minggu (Rp) — otomatis {compactRp((monthlyTarget / 30) * 7)}</span>
                                    <input type="text" inputMode="numeric" value={groupDigits(form.targetRevenue_minggu)}
                                           onChange={(e) => setForm({ ...form, targetRevenue_minggu: e.target.value.replace(/\D/g, '') })} />
                                </label>
                                <label className="kpm-field">
                                    <span>Target omzet per tahun (Rp) — otomatis {compactRp(monthlyTarget * 12)}</span>
                                    <input type="text" inputMode="numeric" value={groupDigits(form.targetRevenue_tahun)}
                                           onChange={(e) => setForm({ ...form, targetRevenue_tahun: e.target.value.replace(/\D/g, '') })} />
                                </label>
                            </div>

                            <div className="kpm-acts">
                                <button type="submit" className="kpm-btn key">
                                    <Save size={14} /> Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
