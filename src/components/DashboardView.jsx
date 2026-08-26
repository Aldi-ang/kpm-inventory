import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Users, Activity, PackageX, MapPin, Boxes } from 'lucide-react';
import { formatRupiah, convertToBks, displayQty } from '../utils/helpers';
import { isLowStock, minStockBks, daysOfCover } from '../utils/stockThreshold';
import { periodWindow, periodDays, periodMeta, txDate } from '../utils/period';
import { MASTER, warehouseList, supplyByProduct, dormant } from '../utils/supply';
import DashboardBenchmarks from './DashboardBenchmarks';
import PaceChart from './PaceChart';

/* THE DASHBOARD.
   ────────────────────────────────────────────────────────────────────────────
   Rebuilt 2026-08-25 after: *"the dark screen and the UI on the dashboard is not fixed yet, panel
   looks dark and bad the layout is pretty bad i want u to redesign a new one"*.

   The layout was not badly spaced. It was written in a language the rest of the app had stopped
   speaking: this was the only main screen never rebuilt as `.kpm-mod` modules, so while
   SettingsView spent that vocabulary twenty-six times, the dashboard was still floating cards
   with a radius, a backdrop blur and a drop shadow. That is why it read as a different app.

   WHAT LEFT, and why — all four are his calls, recorded so they are not quietly re-added:
     · Six equal cards (Total Vault / Global Revenue / Net Profit + three targets). All-time
       figures only ever go up, so none of them could ever be news. *"dont use total"*.
     · The separate 7-Day Revenue graph — it is the live panel's chart on MINGGU.
     · `getRandomColor()` on the chart bars. It hashed a product name into an arbitrary hex, so
       it could return blue, green, near-black on the dark ground or near-white on the cream one.
       A chart that picks its own colours cannot obey a palette law.
     · The hour-of-day strip I proposed. He asked *"why do we need this panel?"* and the honest
       answer was that it fits a shop with a counter, not a distributor whose agents are on
       routes — the hour on a nota records when an agent got back. The question worth answering
       is WHICH AGENT sold what, which is the leaderboard below, on data that already exists.

   WHAT ARRIVED: one period switch governing every figure, and a "running out" panel that counts
   in Bal instead of Bks — *"few bal is considered as low not BKS bruh"*. The threshold behind it
   is a company setting with a unit of its own; see src/utils/stockThreshold.js.                */

/* this used to be a private copy of the same logic. It is `displayQty` in helpers now, so the
   unit setting reaches every panel at once instead of one of them. */

/* a whole-number share of a product's own total. Rounded independently per series, so three
   shares can add to 99 or 101 — printing them to a decimal to force 100 would be false precision
   on figures nobody sums by eye. */
const share = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

/* named once, so the bar, the legend swatch and the readout can never disagree about which
   colour means what */
const SERIES = [
    { key: 'sold',  label: 'Terjual' },
    { key: 'field', label: 'Dalam perjalanan' },
    { key: 'shelf', label: 'Stok gudang' },
];

export default function DashboardView({
    isAdmin, transactions = [], lowStockItems = [], setActiveTab,
    sessionStatus, auditLogs = [], appSettings, handleSaveDashboardTargets,
    inventory = [], customers = [], motorists = [], branchStock = {},
}) {
    const [period, setPeriod] = useState('bulan');
    const [openRow, setOpenRow] = useState(null);
    const [wilayah, setWilayah] = useState(null);   // which region the big chart is showing
    const [gudang, setGudang] = useState(null);     // null = every warehouse at once
    const [seg, setSeg] = useState(null);           // {id, key} of the bar segment being read
    /* his setting, read once and threaded through every quantity on the screen.
       useCallback because the memos below call it: a fresh function each render is a dependency
       that changes every render, which silently disables their memoisation. */
    const unit = appSettings?.defaultDisplayUnit || 'AUTO';
    const dominant = useCallback((bks, product) => displayQty(bks, product, unit), [unit]);
    const [arrived, setArrived] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => requestAnimationFrame(() => setArrived(true)));
        return () => cancelAnimationFrame(id);
    }, []);

    /* ── RUNNING OUT. What is low is decided by quantity (his rule); the ORDER is decided by how
          long the shelf lasts, which is deliberately not printed. A product with no sales sorts
          last because nothing is running it down. ── */
    const runningOut = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const soldBks = new Map();
        transactions.forEach(t => {
            if (t.type !== 'SALE') return;
            const d = txDate(t);
            if (isNaN(d) || d < thirtyDaysAgo) return;
            (t.items || []).forEach(item => {
                const p = inventory.find(x => x.id === item.productId);
                if (!p) return;
                soldBks.set(item.productId,
                    (soldBks.get(item.productId) || 0) + convertToBks(item.qty, item.unit, p));
            });
        });

        return lowStockItems
            .map(item => {
                const perDay = (soldBks.get(item.id) || 0) / 30;
                return {
                    item,
                    days: daysOfCover(item.stock, perDay),
                    left: dominant(item.stock, item),
                    limit: dominant(minStockBks(item, appSettings), item),
                };
            })
            .sort((a, b) => a.days - b.days);
    }, [lowStockItems, transactions, inventory, appSettings, dominant]);

    /* ── VELOCITY, for the period on the switch. Same window as the live panel, from the same
          function, so the heading and the figures above it can never mean different things. ── */
    const velocity = useMemo(() => {
        const w = periodWindow(period);
        const days = periodDays(period, w);
        const moved = new Map();

        transactions.forEach(t => {
            if (t.type !== 'SALE') return;
            const d = txDate(t);
            if (isNaN(d) || d < w.start) return;
            (t.items || []).forEach(item => {
                const p = inventory.find(x => x.id === item.productId);
                if (!p) return;
                moved.set(item.productId,
                    (moved.get(item.productId) || 0) + convertToBks(item.qty, item.unit, p));
            });
        });

        const rows = inventory.map(p => {
            const bks = moved.get(p.id) || 0;
            return {
                id: p.id, name: p.name,
                out: dominant(bks, p),
                left: dominant(p.stock || 0, p),
                bks,
                low: isLowStock(p, appSettings),
                dead: bks === 0 && (p.stock || 0) > 0,
                perDay: bks / days,
            };
        }).sort((a, b) => b.bks - a.bks);

        const top = rows.slice(0, 6);
        const max = top.length ? Math.max(...top.map(r => r.bks), 1) : 1;
        return top.map(r => ({ ...r, pct: Math.round((r.bks / max) * 100) }));
    }, [transactions, inventory, period, appSettings, dominant]);

    /* ── KINERJA REGIONAL. His ask, 2026-08-25: *"add one more panel, each performance graph
          for regional division, but if there are so much division we might need to design this
          panel to fit in the free space"*.

          HE NAMED THE HARD PART AND HE WAS RIGHT: how many regions there are is not knowable from
          the code. `region` is FREE TEXT on the customer (province -> region -> city, see
          CustomerManager), so a real database can hold three or sixty, and one typo silently makes
          another. A grid of small charts would look right at four and fall apart at twenty. A
          RANKED LIST works at both, puts the biggest first, and its height is bounded by showing
          six and COUNTING the rest -- which is the "fit in the free space" half of the ask.

          WARNING: A SALE IS JOINED TO A REGION BY CUSTOMER NAME, because a transaction stores
          `customerName` and not a customer id. Every sale whose name matches no customer record
          lands in one honest "belum diberi wilayah" row rather than being quietly dropped -- a
          region panel that silently loses a fifth of the revenue is worse than no panel. ── */
    const regions = useMemo(() => {
        const w = periodWindow(period);
        const key = (v) => String(v || '').trim().toLowerCase();

        const regionOf = new Map();
        customers.forEach(c => {
            const r = String(c.region || '').trim();
            if (c.name && r) regionOf.set(key(c.name), r);
        });

        const acc = new Map();
        const unknown = { omzet: 0, nota: 0, names: new Set() };

        transactions.forEach(t => {
            if (t.type !== 'SALE') return;
            const d = txDate(t);
            if (isNaN(d) || d < w.start) return;

            const region = regionOf.get(key(t.customerName));
            if (!region) {
                unknown.omzet += (t.total || 0);
                unknown.nota += 1;
                if (t.customerName) unknown.names.add(key(t.customerName));
                return;
            }
            if (!acc.has(region)) acc.set(region, {
                region, omzet: 0, laba: 0, nota: 0, toko: new Set(),
                perBucket: new Array(w.buckets).fill(0),
            });
            const a = acc.get(region);
            a.omzet += (t.total || 0);
            a.laba  += (t.totalProfit || 0);
            a.nota  += 1;
            a.toko.add(key(t.customerName));
            const b = w.bucketOf(d);
            if (b >= 0 && b < w.buckets) a.perBucket[b] += (t.total || 0);
        });

        /* ⚠️ THE DASHED LINE ON A REGION MEANS SOMETHING DIFFERENT FROM THE ONE ON THE LIVE
           PANEL, and pretending otherwise would be a lie drawn to scale. There is no per-region
           target — he sets one target, for the whole business — so scaling a region's chart
           against it would only ever show that a region is a fraction of the company, which is
           what the ranked list already says.
           Instead the line is scaled so the dashed pace ENDS where the region actually is. It
           then reads as STEADY PACE: above it the region started fast and is slowing, below it
           the region started slow and is speeding up. That is a real reading, and it needs no
           number nobody has set. */
        const rows = [...acc.values()]
            .map(a => {
                const series = [0];
                for (let i = 0; i < Math.min(w.done, w.buckets); i++) {
                    series.push(series[series.length - 1] + a.perBucket[i]);
                }
                const covered = w.buckets > 0 ? w.done / w.buckets : 1;
                /* ⚠️ DO NOT compare the LAST point against the pace line to decide this. By
                   construction they are equal — the line is scaled so it ends exactly where the
                   region did — so that test is always true and says nothing. The midpoint is
                   where the shape actually differs: ahead of half the total at the halfway mark
                   means the region front-loaded and is now slowing. */
                const mid = Math.floor((series.length - 1) / 2);
                const evenAtMid = series.length > 1 ? a.omzet * (mid / (series.length - 1)) : 0;
                return {
                    ...a, toko: a.toko.size, series,
                    evenPace: covered > 0 ? a.omzet / covered : a.omzet,
                    fastStart: series.length > 2 && series[mid] > evenAtMid,
                    steady: series.length <= 2,
                };
            })
            .sort((a, b) => b.omzet - a.omzet);

        const total = rows.reduce((sum, r) => sum + r.omzet, 0) + unknown.omzet;
        const max = rows.length ? Math.max(rows[0].omzet, 1) : 1;
        const share = (v) => (total > 0 ? Math.round((v / total) * 100) : 0);

        return {
            done: w.done, buckets: w.buckets, tickOf: w.tickOf,
            rows: rows.map(r => ({ ...r, pct: Math.round((r.omzet / max) * 100), share: share(r.omzet) })),
            unknown: unknown.nota > 0
                ? { omzet: unknown.omzet, nota: unknown.nota, toko: unknown.names.size, share: share(unknown.omzet) }
                : null,
        };
    }, [transactions, customers, period]);

    /* ── SUPPLY. Where every pack actually is: sold, on a van, or on a shelf — for the whole
          company or for one warehouse. The maths lives in utils/supply.js; this only picks the
          window and hands it over. ── */
    const gudangs = useMemo(() => warehouseList(motorists), [motorists]);

    const supply = useMemo(() => {
        const w = periodWindow(period);
        /* narrowed to the warehouses the roster still lists: a branch that was removed keeps its
           last snapshot in the sync map, and counting it would quietly inflate every total */
        const live = Object.fromEntries(
            Object.entries(branchStock).filter(([name]) => gudangs.includes(name))
        );
        const rows = supplyByProduct({
            inventory, branchStock: live, motorists, transactions,
            since: w.start, warehouse: gudang,
        });
        return { rows, dormant: dormant(rows) };
    }, [inventory, branchStock, motorists, transactions, period, gudang, gudangs]);

    /* ── WHO SOLD, today. The panel that stays one line tall until there is something in it. ── */
    const agents = useMemo(() => {
        const today = new Date().toLocaleDateString();
        const perf = {};
        transactions.forEach(t => {
            if (t.type !== 'SALE') return;
            const d = txDate(t);
            if (isNaN(d) || d.toLocaleDateString() !== today) return;
            const agent = t.agentName || 'Admin';
            if (!perf[agent]) perf[agent] = { revenue: 0, profit: 0, count: 0 };
            perf[agent].revenue += (t.total || 0);
            perf[agent].profit  += (t.totalProfit || 0);
            perf[agent].count   += 1;
        });
        return Object.entries(perf)
            .map(([name, d]) => ({ name, ...d }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [transactions]);

    /* the big chart follows the list. Nothing selected yet means rank 1, so the panel is never
       a chart-shaped hole waiting to be clicked. */
    const shown = regions.rows.find(r => r.region === wilayah) || regions.rows[0] || null;

    const meta = periodMeta(period);
    const arr = () => `kpm-arr${arrived ? ' in' : ''}`;

    return (
        <div className="kpm-dash">
            <div className="kpm-dash-grid">

                {/* 🔴 NO `key` HERE, AND THAT IS THE POINT. It was keyed on the period so the panel
                    remounted on every press — which is exactly the flicker he reported: the whole
                    panel left the screen and played its 300ms arrival again for what should be an
                    instant switch. Mounted once, the VALUES move instead: the ring sweeps to its
                    new share, the track slides, the line redraws. A switch should feel like a
                    switch, not like the screen reloading. */}
                <DashboardBenchmarks
                    transactions={transactions}
                    inventory={inventory}
                    appSettings={appSettings}
                    onSaveTargets={handleSaveDashboardTargets}
                    canEditGoals={isAdmin}
                    auditLogs={auditLogs}
                    sessionStatus={sessionStatus}
                    period={period}
                    onPeriod={setPeriod}
                />

                <div className="kpm-dash-work">

                    {isAdmin && runningOut.length > 0 && (
                        <div className={`kpm-mod hazard ${arr()}`}>
                            <div className="kpm-head">
                                <span className="slot" style={{ color: 'var(--danger-ink)' }}>
                                    TINDAKAN PRIORITAS
                                </span>
                                <div className="line">
                                    <h3 style={{ color: 'var(--danger-ink)' }}>Stok Kritis</h3>
                                    <button type="button" className="kpm-btn hazard"
                                            onClick={() => setActiveTab('inventory')}>
                                        <PackageX size={13} /> {runningOut.length} produk
                                    </button>
                                </div>
                            </div>
                            <div className="kpm-shelf">
                                <div className="kpm-cover">
                                    {runningOut.slice(0, 6).map(({ item, left, limit }) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className="kpm-cover-c"
                                            onClick={() => setActiveTab('inventory')}
                                        >
                                            <span className="qty">
                                                {left.n}
                                                <small>{left.unit}</small>
                                            </span>
                                            <span className="t">
                                                <b>{item.name}</b>
                                                <span>
                                                    {left.rest ? `+ ${left.rest} · ` : ''}
                                                    ambang {limit.n} {limit.unit.toLowerCase()}
                                                </span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={`kpm-mod ${arr()}`}>
                        <div className="kpm-head">
                            <span className="slot">PERGERAKAN · {meta.title.toUpperCase()}</span>
                            <div className="line">
                                <h3>Perputaran Inventaris</h3>
                                <span className="kpm-safety-hint" style={{ margin: 0 }}>
                                    <Activity size={12} style={{ verticalAlign: '-2px' }} /> Pilih baris untuk detail
                                </span>
                            </div>
                        </div>
                        <div className="kpm-shelf">
                            {velocity.length === 0 ? (
                                <p className="kpm-safety-hint" style={{ margin: 0 }}>
                                    Tidak ada pergerakan pada periode ini
                                </p>
                            ) : velocity.map((r, i) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    className={`kpm-vrow${openRow === r.id ? ' on' : ''}`}
                                    onClick={() => setOpenRow(openRow === r.id ? null : r.id)}
                                >
                                    <span className="rk">{String(i + 1).padStart(2, '0')}</span>
                                    <span className="nm">{r.name}</span>
                                    <span className="bar">
                                        <span className={`kpm-trk${r.dead ? ' neg' : ''}`}>
                                            <i style={{ width: arrived ? `${Math.max(2, r.pct)}%` : 0 }} />
                                        </span>
                                    </span>
                                    <span className="figs">
                                        <em>{r.out.n} {r.out.unit.toLowerCase()}</em> keluar ·{' '}
                                        <span className={r.low ? 'low' : ''}>
                                            {r.left.n} {r.left.unit.toLowerCase()}
                                        </span> stok
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 🔴 THE GATE USED TO BE `supply.rows.length > 0`, AND THAT DELETED THE
                        CONTROL. Aldi, 2026-08-26: *"i press bandung and it crashed close and the
                        panel is gone"*. Nothing crashed — Bandung's warehouse is empty, so the
                        row list came back empty and the whole panel unmounted, taking the switch
                        that chooses the warehouse with it. There was no way back to Semua.
                        ⚠️ A CONTROL MUST NEVER BE INSIDE THE THING ITS OWN VALUE CAN EMPTY.
                        The panel is gated on there being products at all; a warehouse with
                        nothing in it gets an empty LINE, not a missing panel. */}
                    {isAdmin && inventory.length > 0 && (
                        <div className={`kpm-mod ${arr()}`}>
                            <div className="kpm-head">
                                <span className="slot">PERSEDIAAN · {meta.title.toUpperCase()}</span>
                                <div className="line">
                                    <h3><Boxes size={15} style={{ verticalAlign: '-2px' }} /> Distribusi Inventaris</h3>
                                    {supply.dormant.length > 0 && (
                                        <span className="kpm-chip warn">
                                            {supply.dormant.length} produk dorman
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="kpm-shelf">
                                {/* ONE switch for MASTER plus every warehouse on the roster. `--n`
                                    is what lets the same control serve a list whose length nobody
                                    knows until the roster has been read. */}
                                <div className="kpm-period" role="group" aria-label="Gudang"
                                     style={{
                                         '--n': gudangs.length + 1,
                                         '--i': gudang === null ? 0 : gudangs.indexOf(gudang) + 1,
                                     }}>
                                    <span className="kpm-period-plate" aria-hidden="true" />
                                    <button type="button" aria-pressed={gudang === null}
                                            onClick={() => setGudang(null)}>Semua</button>
                                    {gudangs.map(g => (
                                        <button key={g} type="button" aria-pressed={gudang === g}
                                                onClick={() => setGudang(g)}>
                                            {g === MASTER ? 'Master' : g}
                                        </button>
                                    ))}
                                </div>

                                <div className="kpm-legend" style={{ marginTop: 'var(--s4)' }}>
                                    <span><i className="sold" /> Terjual</span>
                                    <span><i className="field" /> Dalam perjalanan</span>
                                    <span><i className="shelf" /> Stok gudang</span>
                                </div>
                                <p className="kpm-safety-hint" style={{ margin: '0 0 var(--s4)' }}>
                                    Setiap batang menampilkan komposisi produk itu sendiri · total ada di
                                    bawah tiap batang
                                </p>

                                {supply.rows.length === 0 && (
                                    <p className="kpm-safety-hint" style={{ margin: 0 }}>
                                        Tidak ada data untuk gudang ini pada periode {meta.title.toLowerCase()}
                                    </p>
                                )}

                                {supply.rows.slice(0, 8).map(r => {
                                    /* 🔴 EACH BAR IS ITS OWN 100%, not a fraction of the biggest
                                       product. His call after seeing it, 2026-08-26: *"make the
                                       graph special for 1 product type instead and not comparing
                                       stocks with other product, so all the graph space is used"*.
                                       He is right for what this panel is FOR. Scaling against the
                                       largest product answered "which product is biggest", which
                                       the ordering already answers, and it spent most of every
                                       row on empty track — the space he asked about twice. The
                                       question here is how ONE product is split between sold, on
                                       the road and standing still, and that is a proportion. */
                                    const w = (v) => `${(v / (r.total || 1)) * 100}%`;
                                    const still = r.sold === 0 && r.shelf > 0;
                                    return (
                                        <button
                                            key={r.id}
                                            type="button"
                                            className={`kpm-srow${openRow === 's-' + r.id ? ' on' : ''}`}
                                            onClick={() => setOpenRow(openRow === 's-' + r.id ? null : 's-' + r.id)}
                                            onPointerLeave={(e) => { if (e.pointerType !== 'touch') setSeg(null); }}
                                        >
                                            <span className="nm">{r.name}</span>
                                            <span className="bar">
                                                {/* the share is printed INSIDE its own colour, and only
                                                    where the segment is wide enough to hold it — a
                                                    number spilling out of a 3% sliver is worse than no
                                                    number. Pointing at a segment names it below. */}
                                                <span className="kpm-stack">
                                                    {SERIES.map(sr => (
                                                        <i
                                                            key={sr.key}
                                                            className={`${sr.key}${seg && seg.id === r.id && seg.key === sr.key ? ' on' : ''}`}
                                                            style={{ width: arrived ? w(r[sr.key]) : 0 }}
                                                            onPointerEnter={() => setSeg({ id: r.id, key: sr.key })}
                                                            onPointerDown={(e) => { e.stopPropagation(); setSeg({ id: r.id, key: sr.key }); }}
                                                        >
                                                            {share(r[sr.key], r.total) >= 12 && `${share(r[sr.key], r.total)}%`}
                                                        </i>
                                                    ))}
                                                </span>
                                            </span>
                                            <span className="figs">
                                                {seg && seg.id === r.id ? (() => {
                                                    const sr = SERIES.find(x => x.key === seg.key);
                                                    const q = dominant(r[seg.key], r.product);
                                                    return (
                                                        <>
                                                            <i className={`sw ${sr.key}`} />
                                                            {sr.label} ·{' '}
                                                            <em>{q.n} {q.unit.toLowerCase()}</em> ·{' '}
                                                            {share(r[seg.key], r.total)}% dari total produk ini
                                                        </>
                                                    );
                                                })() : (
                                                    <span className={still ? 'dorm' : ''}>
                                                        {still ? 'Dorman · tidak ada penjualan pada periode ini'
                                                               : `Total ${dominant(r.total, r.product).n} ${dominant(r.total, r.product).unit.toLowerCase()}`}
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                    );
                                })}

                                {supply.rows.length > 8 && (
                                    <p className="kpm-safety-hint" style={{ marginTop: 'var(--s3)' }}>
                                        + {supply.rows.length - 8} produk dengan volume lebih rendah
                                    </p>
                                )}
                                {/* the roster is the only list of warehouses that exists, and saying
                                    so costs less than someone wondering why a branch is missing */}
                                <p className="kpm-safety-hint" style={{ marginTop: 'var(--s3)' }}>
                                    Sumber gudang: lokasi tim pada Fleet &amp; Roster
                                </p>
                            </div>
                        </div>
                    )}

                    {isAdmin && (regions.rows.length > 0 || regions.unknown) && (
                        <div className={`kpm-mod ${arr()}`}>
                            <div className="kpm-head">
                                <span className="slot">WILAYAH · {meta.title.toUpperCase()}</span>
                                <div className="line">
                                    <h3><MapPin size={15} style={{ verticalAlign: '-2px' }} /> Kinerja Regional</h3>
                                    <span className="kpm-safety-hint" style={{ margin: 0 }}>
                                        {regions.rows.length} wilayah aktif
                                    </span>
                                </div>
                            </div>
                            <div className="kpm-shelf">
                                {/* ── HIS CALL, 2026-08-25: *"keep the list and add the big graph"*.
                                    The rows ARE the swap control — they were already buttons with a
                                    selected state, so a separate row of region tabs would have put a
                                    second control on screen doing what the first one already did.
                                    The list answers "which wilayah is behind" (a comparison, and a
                                    comparison has to be seen all at once); the chart answers "and is
                                    that one getting better or worse" (a trend, which a bar cannot
                                    show at any size). Neither replaces the other. ── */}
                                {shown && (
                                    <div style={{ marginBottom: 'var(--s4)' }}>
                                        <div className="kpm-ro on" style={{ minHeight: 0 }}>
                                            <span className="k">{shown.region}</span>
                                            <span className="v">
                                                {formatRupiah(shown.omzet)} · {shown.share}%
                                            </span>
                                        </div>
                                        <PaceChart
                                            series={shown.series}
                                            target={shown.evenPace}
                                            done={regions.done}
                                            buckets={regions.buckets}
                                            tickOf={regions.tickOf}
                                            drawKey={`${shown.region}-${period}`}
                                            arrived={arrived}
                                            ariaLabel={`Omzet ${shown.region} sepanjang ${meta.title}. Garis putus-putus adalah laju rata-rata.`}
                                        />
                                        <p className="kpm-safety-hint" style={{ margin: 0 }}>
                                            Garis putus-putus: laju rata-rata
                                            {shown.steady ? '' : shown.fastStart
                                                ? ' · deselerasi di paruh kedua'
                                                : ' · akselerasi di paruh kedua'}
                                        </p>
                                    </div>
                                )}

                                {regions.rows.slice(0, 6).map((r, i) => (
                                    <button
                                        key={r.region}
                                        type="button"
                                        className={`kpm-vrow${(wilayah ?? regions.rows[0]?.region) === r.region ? ' on' : ''}`}
                                        aria-pressed={(wilayah ?? regions.rows[0]?.region) === r.region}
                                        onClick={() => setWilayah(r.region)}
                                    >
                                        <span className="rk">{String(i + 1).padStart(2, '0')}</span>
                                        <span className="nm">{r.region}</span>
                                        <span className="bar">
                                            <span className="kpm-trk">
                                                <i style={{ width: arrived ? Math.max(2, r.pct) + '%' : 0 }} />
                                            </span>
                                        </span>
                                        <span className="figs">
                                            <em>{formatRupiah(r.omzet)}</em> · {r.share}% · {r.toko} pelanggan
                                        </span>
                                    </button>
                                ))}

                                {/* the tail is COUNTED, never silently cut — a list that stops at six
                                    without saying so reads as "these are all of them" */}
                                {regions.rows.length > 6 && (
                                    <p className="kpm-safety-hint" style={{ marginTop: 'var(--s3)' }}>
                                        + {regions.rows.length - 6} wilayah dengan kontribusi lebih rendah
                                    </p>
                                )}

                                {/* NOT a region. This is revenue whose customer name matched no
                                    record, shown so the panel cannot quietly lose money. */}
                                {regions.unknown && (
                                    <div className="kpm-vrow unset">
                                        <span className="rk">—</span>
                                        <span className="nm">Wilayah tidak teridentifikasi</span>
                                        <span className="bar">
                                            <span className="kpm-trk neg">
                                                <i style={{ width: arrived ? Math.max(2, regions.unknown.share) + '%' : 0 }} />
                                            </span>
                                        </span>
                                        <span className="figs">
                                            <em>{formatRupiah(regions.unknown.omzet)}</em> ·{' '}
                                            <span className="low">{regions.unknown.share}%</span> ·{' '}
                                            {regions.unknown.toko} pelanggan
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={`kpm-mod ${agents.length ? '' : 'idle'} ${arr()}`}>
                        <div className="kpm-head">
                            <span className="slot">AGEN · HARI INI</span>
                            <div className="line">
                                <h3><Users size={15} style={{ verticalAlign: '-2px' }} /> Leaderboard</h3>
                                {agents.length === 0 && (
                                    <span className="kpm-safety-hint" style={{ margin: 0 }}>
                                        Tidak ada transaksi hari ini
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* an empty panel earns no height — the head IS the whole panel until
                            somebody sells something */}
                        {agents.length > 0 && (
                            <div className="kpm-shelf">
                                {agents.map((a, i) => (
                                    <div key={a.name} className="kpm-vrow" style={{ cursor: 'default' }}>
                                        <span className="rk">{String(i + 1).padStart(2, '0')}</span>
                                        <span className="nm">{a.name}</span>
                                        <span className="figs">
                                            <em>{formatRupiah(a.revenue)}</em> · {a.count} transaksi
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

