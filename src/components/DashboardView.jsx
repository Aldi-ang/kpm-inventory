import React, { useMemo, useState, useEffect } from 'react';
import { Users, Activity, PackageX } from 'lucide-react';
import { formatRupiah, convertToBks, splitToUnits } from '../utils/helpers';
import { isLowStock, minStockBks, daysOfCover } from '../utils/stockThreshold';
import { periodWindow, periodDays, periodMeta, txDate } from '../utils/period';
import DashboardBenchmarks from './DashboardBenchmarks';

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

/* the largest unit a quantity actually fills, because "sisa 640 Bks" is not how anyone speaks */
const dominant = (bks, product) => {
    const u = splitToUnits(bks, product);
    if (u.Karton > 0) return { n: u.Karton, unit: 'KARTON', rest: u.Bal ? `${u.Bal} bal` : '' };
    if (u.Bal    > 0) return { n: u.Bal,    unit: 'BAL',    rest: u.Slop ? `${u.Slop} slop` : '' };
    if (u.Slop   > 0) return { n: u.Slop,   unit: 'SLOP',   rest: u.Bks ? `${u.Bks} bks` : '' };
    return { n: u.Bks, unit: 'BKS', rest: '' };
};

export default function DashboardView({
    isAdmin, transactions = [], lowStockItems = [], setActiveTab,
    sessionStatus, auditLogs = [], appSettings, handleSaveDashboardTargets,
    inventory = [],
}) {
    const [period, setPeriod] = useState('bulan');
    const [openRow, setOpenRow] = useState(null);
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
    }, [lowStockItems, transactions, inventory, appSettings]);

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
    }, [transactions, inventory, period, appSettings]);

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

    const meta = periodMeta(period);
    const arr = (step) => `kpm-arr${arrived ? ' in' : ''}`;

    return (
        <div className="kpm-dash">
            <div className="kpm-dash-grid">

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
                                    KERJAKAN HARI INI
                                </span>
                                <div className="line">
                                    <h3 style={{ color: 'var(--danger-ink)' }}>Stok menipis</h3>
                                    <button type="button" className="kpm-btn hazard"
                                            onClick={() => setActiveTab('inventory')}>
                                        <PackageX size={13} /> {runningOut.length} barang
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
                                                    batas {limit.n} {limit.unit.toLowerCase()}
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
                                <h3>Vault velocity</h3>
                                <span className="kpm-safety-hint" style={{ margin: 0 }}>
                                    <Activity size={12} style={{ verticalAlign: '-2px' }} /> tekan satu baris
                                </span>
                            </div>
                        </div>
                        <div className="kpm-shelf">
                            {velocity.length === 0 ? (
                                <p className="kpm-safety-hint" style={{ margin: 0 }}>
                                    belum ada pergerakan di periode ini
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
                                        </span> sisa
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={`kpm-mod ${agents.length ? '' : 'idle'} ${arr()}`}>
                        <div className="kpm-head">
                            <span className="slot">AGEN · HARI INI</span>
                            <div className="line">
                                <h3><Users size={15} style={{ verticalAlign: '-2px' }} /> Leaderboard</h3>
                                {agents.length === 0 && (
                                    <span className="kpm-safety-hint" style={{ margin: 0 }}>
                                        belum ada penjualan hari ini
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
                                            <em>{formatRupiah(a.revenue)}</em> · {a.count} nota
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
