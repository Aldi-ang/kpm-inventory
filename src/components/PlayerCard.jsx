import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, RotateCcw, Undo2, Coins } from 'lucide-react';
import { RankBorder } from '../config/rankBorders.jsx';
import { careerXP, computeDayXP, rankLadder, xpLegs, DEFAULT_XP } from '../config/career.js';
import { formatRupiah, nameInitials, convertToBks, shortStockRows, eodBountyLines, eodReportParts, eodPartApproved, eodNightMessage, EOD_PART_LABELS, bountyItems, nightLabel, eodNightOf } from '../utils/helpers.js';
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
   part is in, the parent holds the card in place from the confirm (onHold), plays the scan and the
   VERIFIED seal (onSealed), and folds the card shut once the seal has gone (his #5, 2026-11-03). A part already approved sits locked with its tick; a part sent back shows its reason
   in red and offers ✓ again for the night he brings it right.

   The rank frame is the rank's own (or the frame he picked on his profile); `.sframe` needs
   BORDER_KEYFRAMES + FrameFilters mounted ONCE by the screen that lists the cards, as the profile
   mounts them. ponytail: the profile also checks the picked frame is still unlocked after a ladder
   reshuffle - here his pick is trusted; add the unlock slice if a stale pick ever shows. */
const PART_ORDER = ['cash', 'transfer', 'stock', 'damaged', 'cukai', 'bounty'];
const SUB = 'text-[11px] font-bold uppercase tracking-widest text-[var(--ink-dim)]';
const BAR = { background: 'linear-gradient(90deg, var(--gold), #E4B04A)' };

/* THE HEAD on its own - the boss's card below and the salesman's Agent Profile draw the same face from it (his
   "the picture should be the same with the agent profile picture", stage B 2026-09-21). Presentational: the caller
   brings the numbers it already computes (the card from its group, the profile from its stats), so each screen climbs
   the ladder once and never twice. No `diodeText` -> no diode line (the profile has no night to report). `children`
   sit on the avatar (the profile's camera badge and its file input). `onTap` is the head's one action: the card
   grows open, the profile opens the avatar customizer. */
export const PlayerCardHead = ({ name, photo, currentTier, nextTier, progressPercent, xp, gain = 0, frame = 'classic', closed, night = null, diode = '', diodeText, onTap, fx, children }) => (
    <div className="pc-head p-4" onClick={onTap} role={onTap ? 'button' : undefined} tabIndex={onTap ? 0 : undefined} onKeyDown={onTap ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } } : undefined}>
        <div className="flex items-start gap-4">
            <div key={fx?.burst || 0} className={`pc-avatar${fx?.burst ? ' up' : ''}`}>
                <div className="pc-photo">{photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <span>{nameInitials(name)}</span>}</div>
                {currentTier.borderImage
                    ? <img src={currentTier.borderImage} className="absolute inset-[-25%] w-[150%] h-[150%] object-contain z-20 pointer-events-none" alt="" />
                    : <RankBorder styleId={frame} />}
                {children}
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-[var(--ink)] uppercase tracking-wider truncate">{name}</h3>
                <p className="text-[11px] uppercase tracking-widest font-bold mt-1 truncate"><span key={currentTier.name} className={`pc-rank${fx?.burst ? ' pc-rank-in' : ''}`} style={{ '--rk': currentTier.hex || 'var(--ink-dim)' }}>{currentTier.name}</span>{currentTier.title && <span className="text-[var(--ink-dim)]"> · {currentTier.title}</span>}</p>
                <p className="mt-2 font-mono text-sm font-bold text-[var(--ink)] tabular-nums">{new Intl.NumberFormat('id-ID').format(xp)} XP{gain > 0 && <><span className="text-[var(--accent-ink)]"> +{gain}</span><span className="text-[11px] text-[var(--ink-dim)] font-normal">{night ? " that night" : " tonight"}</span></>}</p>
                <div className="h-[3px] mt-1.5 rounded-full bg-[var(--inset)]"><div className="h-full rounded-full" style={{ width: `${progressPercent}%`, ...BAR }}></div></div>
                <p className="text-[11px] uppercase tracking-widest text-[var(--ink-dim)] mt-1 truncate">{nextTier ? `${new Intl.NumberFormat('id-ID').format(Math.max(0, Number(nextTier.min) - xp))} XP to ${nextTier.name}` : 'top of the ladder'}</p>
            </div>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
            <div>
                <p className={SUB}>{night ? `Closed · ${night}` : 'Closed today'}</p>
                {closed && closed.total > 0
                    ? <p className="font-mono text-4xl font-black text-[var(--ink)] leading-none mt-1 tabular-nums">{closed.closed}<span className="text-[var(--ink-dim)] text-2xl"> / {closed.total}</span></p>
                    : <p className="font-mono text-2xl font-black text-[var(--ink-dim)] leading-none mt-1">—</p>}
                <p className="text-[11px] uppercase tracking-widest text-[var(--ink-dim)] mt-1">{closed && closed.total > 0 ? 'stores on the route' : night ? 'no route that night' : 'no route today'}</p>
            </div>
            {diodeText && <p className={`kpm-led-line ${diode}`}><i aria-hidden="true"></i>{diodeText}</p>}
        </div>
        {/* the EOD replay's layers (useXpReplay), placed against the card (.pc is relative + clipped) */}
        {fx && <>
            <div className="pc-chips" aria-hidden="true">{fx.chips.map((c) => <span key={c.id} className="pc-chip">{c.text}</span>)}</div>
            {fx.burst > 0 && <><i key={`s${fx.burst}`} className="pc-sweep" aria-hidden="true"></i><i key={`b${fx.burst}`} className="pc-burst" aria-hidden="true"></i></>}
            {fx.up && <div className={`pc-ban${fx.off ? ' off' : ''}`} role="status"><small>Rank up</small><b>{fx.up}</b></div>}
        </>}
    </div>
);

/* THE EOD REPLAY (his 2026-11-03: "the EOD animation should stay until all the level up or exp gain increase is
   completed ... i want the animation like the one we have on the presentation") - slide 19 "Kartu Pemain" of
   .claude/presentation/kpm-semua-terkendali.html (lvGo / lvUp) on the real card. `run` = { from, to, breakdown } holds
   the head at `from`; `play` starts it under the stamp: each leg of xpLegs counts up over 2.6 s (the slide's ease-out)
   while the night's sources pop in as chips, and every rank crossed lands as the banner + sweep + burst + the avatar
   zooming in, held 1.7 s. Then onDone() once. Lite Mode / reduced motion: the end number at once, a still banner if a
   rank was crossed, one hold. skip() (a tap) jumps to the end. Null with no run: the head shows its live numbers. */
const XP_SOURCES = [['collected', 'Collected'], ['closed', 'Day closed'], ['cukai', 'Pita cukai'], ['route', 'Route']];
export const useXpReplay = (run, play, ranks, onDone) => {
    const [fx, setFx] = useState(null);
    const skipped = useRef(false), done = useRef(onDone), ladder = useRef(ranks);
    done.current = onDone; ladder.current = ranks;
    useEffect(() => { setFx(run ? { xp: run.from, chips: [], up: null, off: false, burst: 0 } : null); }, [run]);
    useEffect(() => {
        if (!run || !play) return undefined;
        let dead = false;
        skipped.current = false;
        const stop = () => dead || skipped.current;
        const set = (patch) => { if (!dead) setFx((f) => f && (typeof patch === 'function' ? patch(f) : { ...f, ...patch })); };
        const wait = (ms) => new Promise((res) => { const t0 = performance.now(); const id = setInterval(() => { if (stop() || performance.now() - t0 >= ms) { clearInterval(id); res(); } }, 40); });
        const tween = (ms, step) => new Promise((res) => {
            const t0 = performance.now();
            const tick = (now) => { if (stop()) return res(); const u = Math.min(1, (now - t0) / ms); step(u); if (u < 1) requestAnimationFrame(tick); else res(); };
            requestAnimationFrame(tick);
        });
        (async () => {
            const rk = ladder.current, legs = xpLegs(run.from, run.to, rk);
            const still = document.documentElement.classList.contains('lite-mode') || matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (still || !legs.length) {
                const up = legs.filter((l) => l.rankUp).pop();
                set({ xp: run.to, up: up ? rankLadder(up.to, rk).currentTier.name : null });
                await wait(2200);
            } else {
                const chips = XP_SOURCES.filter(([k]) => Number(run.breakdown?.[k]) > 0).map(([k, label], i) => ({ id: i, text: `+${run.breakdown[k]} ${label}` }));
                await wait(800);   // the stamp lands first (kpmSeal 450 + 320 ms)
                for (const [i, leg] of legs.entries()) {
                    if (stop()) break;
                    if (i === 0) chips.forEach((c, j) => setTimeout(() => { if (!stop()) set((f) => ({ ...f, chips: [...f.chips, c].slice(-3) })); }, j * 380));
                    await tween(2600, (u) => set({ xp: leg.from + (leg.to - leg.from) * (1 - (1 - u) ** 2) }));
                    if (stop()) break;
                    set({ xp: leg.to });
                    if (!leg.rankUp) continue;
                    set((f) => ({ ...f, up: rankLadder(leg.to, rk).currentTier.name, off: false, burst: f.burst + 1 }));
                    await wait(1700); if (stop()) break;
                    set({ off: true }); await wait(240); set({ up: null }); await wait(600);
                }
                await wait(900);
            }
            if (dead) return;
            set({ xp: run.to, chips: [], up: null });
            done.current?.();
        })();
        return () => { dead = true; };
    }, [run, play]);
    return fx && { ...fx, skip: () => { skipped.current = true; } };
};

/* THE REPLAY FROM THE HISTORY LOG (his 2026-11-03 "saved inside the history file so that i can retry it again in that
   day"): a salesman's newest verified night plays again - the stamp, then his card counting from (XP now - that night's
   dayXP) to XP now with the night's own breakdown, both already on the report. A tap skips; it closes itself. */
export const NightReplay = ({ report, motorist, career, ranks, closed, onClose }) => {
    const [run] = useState(() => { const now = careerXP(career || {}, DEFAULT_XP); return { from: Math.max(0, now - (Number(report.dayXP) || 0)), to: now, breakdown: report.xpBreakdown || {} }; });
    const [out, setOut] = useState(false);
    const fx = useXpReplay(run, true, ranks, () => { setOut(true); setTimeout(onClose, 300); });
    const shown = fx ? fx.xp : run.from;
    const { currentTier, nextTier, progressPercent } = rankLadder(shown, ranks);
    return (
        <div className={`kpm-replay${out ? ' out' : ''}`} onClick={() => fx?.skip()} role="dialog" aria-label={`Replay of ${report.agentName}'s night`}>
            <div className={`kpm-seal-stage${out ? ' out' : ''}`} aria-hidden="true"><i className="kpm-docket-scan"></i><i className="kpm-docket-seal">VERIFIED</i></div>
            <div className="pc w-full max-w-md">
                <PlayerCardHead name={report.agentName} photo={motorist?.profileImage} currentTier={currentTier} nextTier={nextTier} progressPercent={fx?.up ? 100 : progressPercent}
                    xp={Math.round(shown)} gain={run.to - run.from} frame={motorist?.borderStyle || currentTier.borderStyle || 'classic'} closed={closed} night={nightLabel(eodNightOf(report))} fx={fx} />
            </div>
        </div>
    );
};

const PlayerCard = ({ group, late = false, motorist, career, useCareerLedger = false, ranks, expMultiplier = 1, transactions = [], inventory = [], appSettings, closed, today, onApprove, onReset, onHold, onSealed, playing = false, onPlayed }) => {
    const [open, setOpen] = useState(false);
    const [checked, setChecked] = useState({});   // `${reportId}:${part}` -> true
    const [returned, setReturned] = useState({}); // `${reportId}:${part}` -> reason
    const [busy, setBusy] = useState(false);

    const tier = appSettings?.penaltyPriceTier;
    const productsById = useMemo(() => Object.fromEntries((inventory || []).map(p => [p.id, p])), [inventory]);

    const mine = useMemo(() => (transactions || []).filter(t =>
        t && (t.agentId === group.agent || (motorist?.name && t.agentName && String(t.agentName).toLowerCase() === String(motorist.name).toLowerCase()))
    ), [transactions, group.agent, motorist?.name]);

    /* XP as the profile scores it: the career ledger when the switch is on, else the omset formula. */
    const xp = useMemo(() => {
        if (useCareerLedger) return careerXP(career || {}, DEFAULT_XP);
        const omset = mine.reduce((sum, t) => sum + revenueOf(t), 0);
        return Math.floor(omset / DEFAULT_XP.rupiahPerXp) * (expMultiplier || 1) + (Number(motorist?.manualExp) || 0);
    }, [useCareerLedger, career, mine, expMultiplier, motorist?.manualExp]);
    const cashReport = group.reports.find(r => r.reportType === 'CASH_STOCK');
    const gain = useCareerLedger && cashReport ? computeDayXP(cashReport, career || {}, DEFAULT_XP).total : 0;
    /* the EOD replay (his 2026-11-03): the confirm freezes the head at tonight's XP before, the parent's stamp plays it */
    const [run, setRun] = useState(null);
    const fx = useXpReplay(run, playing, ranks, onPlayed);
    const shown = fx ? fx.xp : xp;
    const { currentTier, nextTier, progressPercent } = rankLadder(shown, ranks);
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
                    if (report.reportType === 'BOUNTY') { const n = (report.penaltyKeys || []).length; value = formatRupiah(report.cash || 0); note = n ? `pays ${n} fine${n === 1 ? '' : 's'}` : 'pays his fines'; led = 'warn'; }
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
    const diode = (group.disputed || sentBack) ? 'crit' : (group.lost > 0 || group.paysBounty) ? 'warn' : '';
    /* a bounty PAYMENT is not a short count (his 2026-09-26: "still short count ... the salesman is returning the good
       in full") - it says what it is */
    const diodeText = sentBack ? `${sentBack} sent back` : group.disputed ? 'short count' : group.lost > 0 ? `${group.lost} stamps lost` : group.paysBounty ? 'pays a bounty' : 'counts match';
    /* the bounty payback rides on the card as its own plate, apart from the night's handover (his "make the bounties
       payback to be more clear and little bit different from other because i dont realise that the bounties payback
       is submitted down there") */
    const payback = lines.filter(l => l.report.reportType === 'BOUNTY');
    const handover = lines.filter(l => l.report.reportType !== 'BOUNTY');

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
            const hold = pending.every(l => checked[l.key]);   // every open line of the night ticked → the seal
            let allIn = hold;
            if (hold && onHold) {   // the list keeps this card where it is - the snapshot drops it before the writes return
                setRun({ from: xp, to: xp + gain, breakdown: gain ? computeDayXP(cashReport, career || {}, DEFAULT_XP).breakdown : {} });
                onHold();
            }
            for (const { report, decision } of items) {
                const done = await onApprove(report, decision, { confirmed: true });
                if (!done) allIn = false;
            }
            setChecked({}); setReturned({});
            if (hold && !allIn) setRun(null);
            if (hold && onSealed) onSealed(allIn);   // true: the stamp + the replay, then the fold; false: let go where it stands
        } finally { setBusy(false); }
    };
    /* the night only: a bounty payment is money for fines already owed, and has its own ✓ / ✕ (the history row keeps it
       apart the same way) */
    const night = group.reports.filter(r => r.reportType !== 'BOUNTY');
    const resetNight = async () => {
        if (busy || !night.length) return;
        const n = night.length;
        if (!await confirmAction(`RESET the night for ${group.agentName}? This deletes ${n === 1 ? 'the report' : `both reports`} so he can submit again.`)) return;
        for (const r of night) await onReset(r, { confirmed: true });
    };

    /* one line of the handover or the payback: its LED label, its value, ✓ and ✕ */
    const lineRow = (line) => (
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
    );
    const photo = motorist?.profileImage;
    return (
        /* data-agent / data-late / data-all: the demo mission's guide finds tonight's card for one salesman and reads
           whether every open line is ticked */
        <div className={`pc ${open ? 'open' : ''}`} data-agent={group.agent} data-late={late ? '' : undefined}
            data-all={pending.length && pending.every(l => checked[l.key]) ? '' : undefined}>
            <PlayerCardHead name={group.agentName} photo={photo} currentTier={currentTier} nextTier={nextTier} progressPercent={fx?.up ? 100 : progressPercent} xp={Math.round(shown)} gain={run ? run.to - run.from : gain} frame={frame}
                closed={closed} night={late ? nightLabel(group.night) : null} diode={diode} diodeText={diodeText} onTap={fx && playing ? fx.skip : () => setOpen(v => !v)} fx={fx} />
            <div className="pc-body">
                <div className="pc-inner"><div className="px-4 pb-4 lg:grid lg:grid-cols-[2fr_3fr] lg:gap-x-5">{/* the padding sits INSIDE the clipped layer, so a folded card measures 0 and not its own 16 px; from lg two columns (his board 1 = A): revenue + products | the handover + plate — 2:3, because a handover line (LED label + value + two 44 px keys) needs ~300 px in his font and a product row can wrap instead */}
                    <div className="min-w-0">
                    <div className="mb-3 pt-1">
                        <div className={`flex justify-between gap-2 ${SUB}`}><span>{late ? 'Revenue that night' : 'Revenue tonight'}</span><span className="text-[var(--ink)] tabular-nums whitespace-nowrap">{formatRupiah(group.cashTotal)}</span></div>
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
                    {handover.length > 0 && <>
                    <p className={`${SUB} mb-1`}>The handover — each line on its own</p>
                    <div className="space-y-1">
                        {handover.map(lineRow)}
                    </div>
                    </>}
                    {payback.length > 0 && (
                        <div aria-label="Bounty payback" className="mt-3 rounded-xl border-2 border-[var(--accent-edge)] bg-[var(--raised)] p-2">
                            <p className="flex items-center gap-1.5 px-1 mb-1.5 text-[11px] font-black uppercase tracking-[.18em] text-[var(--accent-ink)]"><Coins size={14} aria-hidden="true" /> Bounty payback</p>
                            {payback.map(line => {
                                const fines = bountyItems(motorist || {}).filter(b => (line.report.penaltyKeys || []).includes(b.key));
                                return (
                                    <div key={line.key}>
                                        {lineRow(line)}
                                        {fines.length > 0 && (
                                            <ul className="mt-1 px-2 space-y-0.5">
                                                {fines.map(b => <li key={b.key} className="flex justify-between gap-3 text-[11px] text-[var(--ink-muted)]"><span className="min-w-0 truncate">{b.label}{b.date ? ` · ${b.date}` : ''}</span><span className="font-mono tabular-nums whitespace-nowrap">{formatRupiah(b.amount)}</span></li>)}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <button type="button" data-guide="approve-night" onClick={approve} disabled={busy || nChecked + nReturn === 0} style={{ minHeight: 52 }} className={`kpm-plate w-full mt-3 rounded-xl border font-black uppercase tracking-[.2em] flex items-center justify-center gap-2 disabled:opacity-60 ${hot ? 'bg-[var(--danger-plate)] border-[var(--danger)] text-[var(--danger-plate-ink)]' : 'bg-[var(--gold)] border-[var(--accent-edge)] text-[var(--gold-ink)]'}`}>
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
