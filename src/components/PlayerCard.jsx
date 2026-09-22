import React, { useMemo, useState } from 'react';
import { CheckCircle, RotateCcw, Undo2 } from 'lucide-react';
import { RankBorder } from '../config/rankBorders.jsx';
import { careerXP, computeDayXP, rankLadder, DEFAULT_XP } from '../config/career.js';
import { formatRupiah, convertToBks, shortStockRows, eodBountyLines, eodReportParts, eodPartApproved, eodNightMessage, EOD_PART_LABELS } from '../utils/helpers.js';
import { revenueOf, salesDelta, dayOf } from '../utils/salesRollup.js';
import { confirmAction, promptAction } from './ConfirmGate.jsx';

/* THE PLAYER CARD — one salesman's night in the boss's EOD review. Aldi, 2026-09-20 ("looks good for
   v2 lets use that"): the HEAD is the man as his Agent Profile draws him — the photo in the rank
   frame, the rank and its title, the XP with tonight's PLUS, the bar to the next rank, CLOSED ?/?
   stores on today's route, the night's diode. A tap grows the BODY open under it and it sharpens in
   from a blur (theme.css THE PLAYER CARD): the revenue bar, tonight's products, then THE HANDOVER —
   one line per part of every report he sent (cash, transfer, stock back, damaged goods, pita cukai,
   the bounty when the count came up short), each with its own ✓ and ✕. ✓ marks a line for the plate;
   ✕ asks the reason through the dialog gate and sends that part back to him. APPROVE CHECKED hands
   `{ approve, reject }` per report to handleVerifyEOD, which credits only those parts; when the last
   part is in, the parent plays the scan and the VERIFIED seal (onSealed) and the card leaves with
   the report. A part already approved sits locked with its tick; a part sent back shows its reason
   in red and offers ✓ again for the night he brings it right.

   The rank frame is the rank's own (or the frame he picked on his profile); `.sframe` needs
   BORDER_KEYFRAMES + FrameFilters mounted ONCE by the screen that lists the cards, as the profile
   mounts them. ponytail: the profile also checks the picked frame is still unlocked after a ladder
   reshuffle - here his pick is trusted; add the unlock slice if a stale pick ever shows. */
const PART_ORDER = ['cash', 'transfer', 'stock', 'damaged', 'cukai', 'bounty'];
const SUB = 'text-[11px] font-bold uppercase tracking-widest text-[var(--ink-dim)]';
const BAR = { background: 'linear-gradient(90deg, var(--gold), #E4B04A)' };

const initialsOf = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

/* THE HEAD on its own - the boss's card below and the salesman's Agent Profile draw the same face from it (his
   "the picture should be the same with the agent profile picture", stage B 2026-09-21). Presentational: the caller
   brings the numbers it already computes (the card from its group, the profile from its stats), so each screen climbs
   the ladder once and never twice. No `diodeText` -> no diode line (the profile has no night to report). `children`
   sit on the avatar (the profile's camera badge and its file input). `onTap` is the head's one action: the card
   grows open, the profile opens the avatar customizer. */
export const PlayerCardHead = ({ name, photo, currentTier, nextTier, progressPercent, xp, gain = 0, frame = 'classic', closed, diode = '', diodeText, onTap, children }) => (
    <div className="pc-head p-4" onClick={onTap} role={onTap ? 'button' : undefined} tabIndex={onTap ? 0 : undefined} onKeyDown={onTap ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } } : undefined}>
        <div className="flex items-start gap-4">
            <div className="pc-avatar">
                <div className="pc-photo">{photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <span>{initialsOf(name)}</span>}</div>
                {currentTier.borderImage
                    ? <img src={currentTier.borderImage} className="absolute inset-[-25%] w-[150%] h-[150%] object-contain z-20 pointer-events-none" alt="" />
                    : <RankBorder styleId={frame} />}
                {children}
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-[var(--ink)] uppercase tracking-wider truncate">{name}</h3>
                <p className="text-[11px] uppercase tracking-widest font-bold mt-1 truncate"><span className="pc-rank" style={{ '--rk': currentTier.hex || 'var(--ink-dim)' }}>{currentTier.name}</span>{currentTier.title && <span className="text-[var(--ink-dim)]"> · {currentTier.title}</span>}</p>
                <p className="mt-2 font-mono text-sm font-bold text-[var(--ink)] tabular-nums">{new Intl.NumberFormat('id-ID').format(xp)} XP{gain > 0 && <><span className="text-[var(--accent-ink)]"> +{gain}</span><span className="text-[11px] text-[var(--ink-dim)] font-normal"> tonight</span></>}</p>
                <div className="h-[3px] mt-1.5 rounded-full bg-[var(--inset)]"><div className="h-full rounded-full" style={{ width: `${progressPercent}%`, ...BAR }}></div></div>
                <p className="text-[11px] uppercase tracking-widest text-[var(--ink-dim)] mt-1 truncate">{nextTier ? `${new Intl.NumberFormat('id-ID').format(Math.max(0, Number(nextTier.min) - xp))} XP to ${nextTier.name}` : 'top of the ladder'}</p>
            </div>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
            <div>
                <p className={SUB}>Closed today</p>
                {closed && closed.total > 0
                    ? <p className="font-mono text-4xl font-black text-[var(--ink)] leading-none mt-1 tabular-nums">{closed.closed}<span className="text-[var(--ink-dim)] text-2xl"> / {closed.total}</span></p>
                    : <p className="font-mono text-2xl font-black text-[var(--ink-dim)] leading-none mt-1">—</p>}
                <p className="text-[11px] uppercase tracking-widest text-[var(--ink-dim)] mt-1">{closed && closed.total > 0 ? 'stores on the route' : 'no route today'}</p>
            </div>
            {diodeText && <p className={`kpm-led-line ${diode}`}><i aria-hidden="true"></i>{diodeText}</p>}
        </div>
    </div>
);

const PlayerCard = ({ group, motorist, career, useCareerLedger = false, ranks, expMultiplier = 1, transactions = [], inventory = [], appSettings, closed, today, onApprove, onReset, onSealed }) => {
    const [open, setOpen] = useState(false);
    const [checked, setChecked] = useState({});   // `${reportId}:${part}` -> true
    const [returned, setReturned] = useState({}); // `${reportId}:${part}` -> reason
    const [busy, setBusy] = useState(false);

    const tier = appSettings?.penaltyPriceTier;
    const productsById = useMemo(() => Object.fromEntries((inventory || []).map(p => [p.id, p])), [inventory]);

    const mine = useMemo(() => (transactions || []).filter(t =>
        t && (t.agentId === group.key || (motorist?.name && t.agentName && String(t.agentName).toLowerCase() === String(motorist.name).toLowerCase()))
    ), [transactions, group.key, motorist?.name]);

    /* XP as the profile scores it: the career ledger when the switch is on, else the omset formula. */
    const xp = useMemo(() => {
        if (useCareerLedger) return careerXP(career || {}, DEFAULT_XP);
        const omset = mine.reduce((sum, t) => sum + revenueOf(t), 0);
        return Math.floor(omset / DEFAULT_XP.rupiahPerXp) * (expMultiplier || 1) + (Number(motorist?.manualExp) || 0);
    }, [useCareerLedger, career, mine, expMultiplier, motorist?.manualExp]);
    const cashReport = group.reports.find(r => r.reportType === 'CASH_STOCK');
    const gain = useCareerLedger && cashReport ? computeDayXP(cashReport, career || {}, DEFAULT_XP).total : 0;
    const { currentTier, nextTier, progressPercent } = rankLadder(xp, ranks);
    const frame = motorist?.borderStyle || currentTier.borderStyle || 'classic';

    /* REVENUE TONIGHT is the night's omset alone. Aldi, 2026-09-22: "revenue bar is only showing the revenue or
       omset that he receive that day for each person, target is only for regional team or global target" - so no
       bar against his usual night and no per-person target; a target belongs to a region or the whole company. */

    const products = useMemo(() => {
        const rows = {};
        mine.forEach(t => {
            if (dayOf(t) !== today) return;
            const d = salesDelta(t, productsById);
            if (!d) return;
            Object.entries(d.byProduct).forEach(([id, v]) => {
                const row = rows[id] || (rows[id] = { id, name: productsById[id]?.name || id, qty: 0, revenue: 0 });
                row.qty += v.qty; row.revenue += v.revenue;
            });
        });
        return Object.values(rows).sort((a, b) => b.revenue - a.revenue);
    }, [mine, today, productsById]);

    /* One line per part of every report, in the order the handover happens. */
    const lines = useMemo(() => {
        const out = [];
        group.reports.forEach(report => {
            const parts = eodReportParts(report, inventory, tier);
            const bounty = eodBountyLines(report, inventory, tier);
            const short = shortStockRows(report.expectedStock, report.remainingStock);
            const bks = (items = []) => items.reduce((s, i) => s + convertToBks(Number(i.qty) || 0, i.unit, productsById[i.productId]), 0);
            const gap = (expected, counted) => (expected === undefined || expected === null) ? 0 : Number(counted || 0) - Number(expected || 0);
            PART_ORDER.filter(p => parts.includes(p)).forEach(part => {
                let value = '', note = '', led = '';
                if (part === 'cash' || part === 'transfer') {
                    const g = gap(part === 'cash' ? report.expectedCash : report.expectedTransfer, report[part]);
                    value = formatRupiah(report[part] || 0);
                    if (g < 0) { note = `short ${formatRupiah(-g)}`; led = 'crit'; } else if (g > 0) note = `over ${formatRupiah(g)}`;
                } else if (part === 'stock') {
                    const n = bks(report.remainingStock);
                    value = `${n} Bks`;
                    if (short.length) { note = `${short.length} short on return`; led = 'crit'; } else if (n === 0) note = 'nothing to return';
                } else if (part === 'damaged') {
                    value = `${bks(report.damagedStockToReturn)} Bks`;
                    note = [...new Set((report.damagedStockToReturn || []).map(i => i.reason).filter(Boolean))].join(' · ');
                    led = 'warn';
                } else if (part === 'cukai') {
                    value = `${report.cukaiReturned !== undefined ? report.cukaiReturned : (report.cukai || 0)} pcs`;
                    if (Number(report.cukaiPaid) > 0) { note = `${report.cukaiPaid} lost · +${formatRupiah(report.cukaiFine || 0)}`; led = 'warn'; }
                } else if (part === 'bounty') {
                    if (report.reportType === 'BOUNTY') { value = formatRupiah(report.cash || 0); note = `pays ${(report.penaltyKeys || []).length || 'his'} fines`; led = 'warn'; }
                    else { value = formatRupiah(bounty.reduce((s, l) => s + l.amount, 0)); note = bounty.map(l => l.label).join(' · '); led = 'crit'; }
                }
                out.push({ key: `${report.id}:${part}`, report, part, label: EOD_PART_LABELS[part], value, note, led, done: eodPartApproved(report, part), why: report.rejected?.[part] || '' });
            });
        });
        /* the handover's own order across both reports of a night: money, the van, the stamps, the fine */
        return out.sort((a, b) => PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part));
    }, [group.reports, inventory, tier, productsById]);

    const pending = lines.filter(l => !l.done);
    const nChecked = pending.filter(l => checked[l.key]).length;
    const nReturn = pending.filter(l => returned[l.key]).length;
    /* the red plate is the one meant to stop him: a short count (the bounty line, a short cash or transfer, a short
       return) checked for approval, or a plate that only sends things back */
    const hot = (nReturn > 0 && nChecked === 0) || pending.some(l => checked[l.key] && l.led === 'crit');
    const sentBack = lines.filter(l => l.why).length;
    const diode = (group.disputed || sentBack) ? 'crit' : group.lost > 0 ? 'warn' : '';
    const diodeText = sentBack ? `${sentBack} sent back` : group.disputed ? 'short count' : group.lost > 0 ? `${group.lost} stamps lost` : 'counts match';

    const tick = (key) => { setChecked(c => ({ ...c, [key]: !c[key] })); setReturned(r => { const n = { ...r }; delete n[key]; return n; }); };
    const sendBack = async (line) => {
        const why = await promptAction(`Why is the ${line.label.toLowerCase()} going back to ${group.agentName}?`, line.why || '');
        if (why === null || !why.trim()) return;
        setReturned(r => ({ ...r, [line.key]: why.trim() }));
        setChecked(c => { const n = { ...c }; delete n[line.key]; return n; });
    };

    /* ONE question for the night, then one write per report. A night is two documents (cash & stock + pita
       cukai); asking per document read as the same panel twice (his 15:00). A cancel keeps his ticks. */
    const approve = async () => {
        if (busy || nChecked + nReturn === 0) return;
        const items = group.reports.map(report => {
            const own = pending.filter(l => l.report.id === report.id);
            return { report, decision: {
                approve: own.filter(l => checked[l.key]).map(l => l.part),
                reject: Object.fromEntries(own.filter(l => returned[l.key]).map(l => [l.part, returned[l.key]]))
            } };
        }).filter(it => it.decision.approve.length || Object.keys(it.decision.reject).length);
        if (!items.length) return;
        setBusy(true);
        try {
            if (!await confirmAction(eodNightMessage(items, inventory, tier))) return;
            let allIn = pending.every(l => checked[l.key]);   // every open line of the night ticked → the seal
            for (const { report, decision } of items) {
                const done = await onApprove(report, decision, { confirmed: true });
                if (!done) allIn = false;
            }
            setChecked({}); setReturned({});
            if (allIn && onSealed) onSealed();
        } finally { setBusy(false); }
    };
    const resetNight = async () => {
        if (busy) return;
        const n = group.reports.length;
        if (!await confirmAction(`RESET the night for ${group.agentName}? This deletes ${n === 1 ? 'the report' : `both reports`} so he can submit again.`)) return;
        for (const r of group.reports) await onReset(r, { confirmed: true });
    };

    const photo = motorist?.profileImage;
    return (
        <div className={`pc ${open ? 'open' : ''}`}>
            <PlayerCardHead name={group.agentName} photo={photo} currentTier={currentTier} nextTier={nextTier} progressPercent={progressPercent} xp={xp} gain={gain} frame={frame}
                closed={closed} diode={diode} diodeText={diodeText} onTap={() => setOpen(v => !v)} />
            <div className="pc-body">
                <div className="pc-inner"><div className="px-4 pb-4 lg:grid lg:grid-cols-[2fr_3fr] lg:gap-x-5">{/* the padding sits INSIDE the clipped layer, so a folded card measures 0 and not its own 16 px; from lg two columns (his board 1 = A): revenue + products | the handover + plate — 2:3, because a handover line (LED label + value + two 44 px keys) needs ~300 px in his font and a product row can wrap instead */}
                    <div className="min-w-0">
                    <div className="mb-3 pt-1">
                        <div className={`flex justify-between gap-2 ${SUB}`}><span>Revenue tonight</span><span className="text-[var(--ink)] tabular-nums whitespace-nowrap">{formatRupiah(group.cashTotal)}</span></div>
                    </div>
                    {products.length > 0 && (
                        <>
                            <p className={`${SUB} mb-1`}>Products today</p>
                            <div className="space-y-1 mb-3">
                                {products.map(p => (
                                    <div key={p.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-[var(--inset)] border border-[var(--line-2)] text-[var(--ink)] lg:flex-wrap"><span className="flex-1 min-w-0 truncate lg:basis-full lg:whitespace-normal">{p.name}</span><span className="font-mono text-[var(--ink-dim)] whitespace-nowrap">{p.qty} Bks</span><span className="font-mono font-bold whitespace-nowrap">{formatRupiah(p.revenue)}</span></div>
                                ))}
                            </div>
                        </>
                    )}
                    </div>
                    <div className="min-w-0">
                    <p className={`${SUB} mb-1`}>The handover — each line on its own</p>
                    <div className="space-y-1">
                        {lines.map(line => (
                            <div key={line.key} className={`pc-line flex items-center gap-2 min-h-[52px] pl-3 pr-1 rounded-xl border ${line.done ? 'bg-[var(--raised)] border-[var(--line)] opacity-70' : returned[line.key] || line.why ? 'bg-[var(--danger-well)] border-[var(--danger)]' : checked[line.key] ? 'bg-[var(--inset)] border-[var(--accent-edge)]' : 'bg-[var(--inset)] border-[var(--line-2)]'}`}>
                                <div className="flex-1 min-w-0">
                                    <p className={`kpm-led-line ${line.led}`}><i aria-hidden="true"></i>{line.label}</p>
                                    {(returned[line.key] || line.why) ? <p className="text-[11px] text-[var(--danger-ink)] truncate mt-0.5 pl-[18px] flex items-center gap-1"><Undo2 size={11} className="shrink-0" /><span className="truncate">{returned[line.key] || line.why}</span></p>
                                        : line.note ? <p className="text-[11px] text-[var(--ink-dim)] truncate mt-0.5 pl-[18px]">{line.note}</p> : null}
                                </div>
                                <span className="font-mono text-sm font-bold text-[var(--ink)] whitespace-nowrap tabular-nums">{line.value}</span>
                                {line.done
                                    ? <span className="w-11 h-11 grid place-items-center text-[var(--accent-ink)]" aria-label="approved"><CheckCircle size={18} /></span>
                                    : <>
                                        <button type="button" onClick={() => tick(line.key)} aria-pressed={!!checked[line.key]} aria-label={`approve ${line.label}`} className={`pc-key w-11 h-11 grid place-items-center rounded-lg ${checked[line.key] ? 'bg-[var(--gold)] text-[var(--gold-ink)]' : 'text-[var(--accent-ink)]'}`}><span aria-hidden="true">✓</span></button>
                                        <button type="button" onClick={() => sendBack(line)} aria-pressed={!!returned[line.key]} aria-label={`send ${line.label} back`} className={`pc-key w-11 h-11 grid place-items-center rounded-lg ${returned[line.key] ? 'bg-[var(--danger)] text-[var(--danger-plate-ink)]' : 'text-[var(--danger-ink)]'}`}><span aria-hidden="true">✕</span></button>
                                    </>}
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={approve} disabled={busy || nChecked + nReturn === 0} style={{ minHeight: 52 }} className={`kpm-plate w-full mt-3 rounded-xl border font-black uppercase tracking-[.2em] flex items-center justify-center gap-2 disabled:opacity-60 ${hot ? 'bg-[var(--danger-plate)] border-[var(--danger)] text-[var(--danger-plate-ink)]' : 'bg-[var(--gold)] border-[var(--accent-edge)] text-[var(--gold-ink)]'}`}>
                        <CheckCircle size={18} /> <span>{nChecked > 0 && nReturn > 0 ? `Approve ${nChecked} · return ${nReturn}` : nReturn > 0 ? `Return ${nReturn}` : nChecked > 0 ? `Approve ${hot ? 'short' : 'checked'} (${nChecked})` : 'Approve checked'}</span>
                    </button>
                    {onReset && (
                        <button type="button" onClick={resetNight} disabled={busy} className="w-full min-h-11 mt-1 rounded-xl text-[11px] font-bold uppercase tracking-widest text-[var(--danger-ink)] flex items-center justify-center gap-2">
                            <RotateCcw size={14} /> <span>Reset the night — he submits again</span>
                        </button>
                    )}
                    </div>
                </div></div>
            </div>
            <button type="button" className="pc-toggle" onClick={() => setOpen(v => !v)} aria-label={open ? 'Fold' : 'Open'} aria-expanded={open}><span aria-hidden="true">{open ? '⌃' : '⌄'}</span></button>
        </div>
    );
};

export default PlayerCard;
