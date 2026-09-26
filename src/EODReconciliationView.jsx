import React, { useMemo, useState, useEffect } from 'react';
import { ShieldCheck, Wallet, Truck, CheckCircle, Upload, AlertCircle, Clock, DollarSign, Package, XCircle, Tag, ChevronDown, ChevronRight, MapPin, User, Calendar, Folder, Target, BadgeDollarSign, ShieldAlert } from 'lucide-react';
import { formatRupiah, getLocalDayKey, storeKey, shortStockRows, eodBountyLines, bountyItems, dayTargets, EOD_PART_LABELS } from './utils/helpers';
import { confirmAction } from './components/ConfirmGate.jsx';
import EODAgentFlow from './components/EODAgentFlow.jsx';
import NixieCount from './components/NixieCount.jsx';
import FolderCard from './components/FolderCard.jsx';
import PlayerCard from './components/PlayerCard.jsx';
import { BORDER_KEYFRAMES, FrameFilters } from './config/rankBorders.jsx';

/* THE BOSS'S REVIEW as player cards — his "looks good for v2 lets use that" (2026-09-20 05:35) on the card that grew out
   of the folders + docket of 03:50. One card per salesman (components/PlayerCard.jsx) holds every report he sent
   tonight: the head is the man as his profile draws him, the body is the handover one line per part with its own ✓ / ✕.
   The scan + VERIFIED seal (EOD_SEAL_MS) still play over the list when the last part of a night is approved — gradients
   and transforms only, the tokens carry both themes. The History Log stays folders. */
const EOD_FOLDER = 'kpm-folder-quiet w-full bg-[var(--raised)] border-[var(--line-2)] hover:border-[var(--accent-edge)] transition-colors';
const EOD_SEAL_MS = 900;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const HIST_LEVELS = [
    { Icon: MapPin, count: (n) => plural(Object.keys(n).length, 'salesman', 'salesmen') },
    { Icon: User, count: (n) => plural(Object.values(n).reduce((a, m) => a + Object.keys(m).length, 0), 'night', 'nights') },
    { Icon: Calendar, count: (n) => plural(Object.keys(n).length, 'night', 'nights') },
];

/* TONIGHT'S XP on the salesman's Shift Closed block - stage B of the player card (his 2026-09-20 "put the EXP gain
   statistic animation on the agent EOD panel after approval"; board 2 = B, 2026-09-21). The verified CASH_STOCK report
   carries `dayXP` + `xpBreakdown` (handleVerifyEOD writes them at the night's last approval). The one number
   instrument counts it: the signed nixie mounts at 0 and rolls to the total 400 ms after the block shows; when the
   digits have settled the working prints under it, one row at a time (collected, day closed, pita cukai, route),
   rising in AFTER the roll - one moment, one animation. Nothing blinks; Lite Mode lands the digits at once. */
const XpGain = ({ total, breakdown, collected = 0, stores = 0 }) => {
    const [v, setV] = useState(0);
    const [settled, setSettled] = useState(false);
    useEffect(() => {
        const t1 = setTimeout(() => setV(total), 400);
        const t2 = setTimeout(() => setSettled(true), 1000);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [total]);
    const rows = [['collected', 'Collected', formatRupiah(collected)], ['closed', 'Day closed', 'verified'], ['cukai', 'Pita cukai', 'clean'], ['route', 'Route', plural(stores, 'store', 'stores')]]
        .filter(([k]) => Number(breakdown?.[k]) > 0);
    return (
        <div className="w-full border-t border-[var(--line)] pt-4 mt-6 text-left">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-dim)]">XP tonight</p>
            <div className="mt-1"><NixieCount value={v} signed size={34} /></div>
            {settled && (
                <div className="mt-3 space-y-1">
                    {rows.map(([k, label, note], i) => (
                        <div key={k} className="kpm-arrive flex items-center justify-between gap-2 text-[11px] uppercase tracking-widest" style={{ animationDelay: `${i * 90}ms` }}>
                            <span className="text-[var(--ink-dim)]">{label} <span className="normal-case tracking-normal">· {note}</span></span>
                            <span className="font-mono font-bold text-[var(--ink)] tabular-nums">+{breakdown[k]}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const EODReconciliationView = ({ samplings = [], transactions = [], inventory = [], agentCanvas = [], agentProfileId, motorists = [], eodReports = [], user, appSettings, onSubmitEOD, onVerifyEOD, onResetEOD, isAdmin, career = {}, ranks, customers = [] }) => {
    
    // 🚀 VIEW & IDENTITY STATES
    const [viewMode, setViewMode] = useState(isAdmin ? 'review' : 'submit');
    
    // 🚀 THE FIX: Removed the redundant default. Forces Admin to actively select an identity.
    const [adminSetoranId, setAdminSetoranId] = useState(''); 

    /* 🚦 ONE DOOR FOR EVERY EOD WRITE ON THIS SCREEN.
       Three controls posted straight at `onSubmitEOD` out of their own onClick: the letter's
       Send, Pay Bounty, and the legacy "Submit stamps & fines". The letter was already safe by
       accident — its own `stage` disables the button on the same flush and unmounts it at
       'sent' — but the other two changed no local state and stayed mounted and enabled for the
       whole Firestore round-trip. Two taps there wrote two PENDING reports on the same night,
       and the second one is real money the admin then has to unpick by hand.
       The variadic call is what the cukai night needs: CASH_STOCK and CUKAI are two documents
       from ONE tap, and they have to sit inside the SAME shut window — a flag that clears
       between them reopens the door mid-submission.
       ponytail: the gate reads React state, which is not synchronous. What actually stops a
       same-tick double call is `disabled` on the DOM node plus React 19 flushing a discrete
       click before dispatching the next. A ref would close the programmatic case too — add one
       if anything ever calls submit() from code instead of from a tap. */
    const [submitting, setSubmitting] = useState(false);
    const submit = async (...payloads) => {
        if (submitting) return;
        setSubmitting(true);
        try { for (const p of payloads) await onSubmitEOD(p); }
        finally { setSubmitting(false); }
    };

    // 🚀 DYNAMIC ID ENGINE
    const effectiveId = isAdmin ? adminSetoranId : agentProfileId;
    
    const [cukaiReturnedInput, setCukaiReturnedInput] = useState("");
    const [cukaiPaidInput, setCukaiPaidInput] = useState("");
    const cukaiFinePrice = appSettings?.cukaiFinePrice || 5000;

    const [openDates, setOpenDates] = useState([]);
    const [sealing, setSealing] = useState(false);   // a night's last part approved: the scan runs, the seal stamps over the list
    const [histPath, setHistPath] = useState([]);    // the History Log drill: [place, salesman, month]
    const [expandedReports, setExpandedReports] = useState([]);

    const toggleAccordion = (setter, key) => {
        setter(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    // --- 🚀 BOUNTY & PENALTY INTERCEPTOR ---
    const agentBountyData = useMemo(() => {
        if (!effectiveId) return { total: 0, keys: [], items: [], isPending: false };
        const agentProfile = motorists.find(m => m.id === effectiveId) || {};
        /* one line per PENALTY_ key with its reason and date, Rp 0 fines kept - helpers.js bountyItems, the same
           reading the van chest's BOUNTY tab in Fleet & Roster shows */
        const items = bountyItems(agentProfile);
        const keys = items.map(i => i.key);
        const total = items.reduce((s, i) => s + i.amount, 0);

        const todaysReports = eodReports.filter(r => {
            if (r.agentId !== effectiveId) return false;
            const rDate = r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000) : (r.timestamp ? new Date(r.timestamp) : new Date());
            return rDate.toDateString() === new Date().toDateString();
        });
        const pendingBounty = todaysReports.find(r => r.status === 'PENDING' && r.reportType === 'BOUNTY');

        return { total, keys, items, isPending: !!pendingBounty };
    }, [effectiveId, motorists, eodReports]);


    // --- 🚀 EXPECTED SETORAN CALCULATOR ---
    const agentData = useMemo(() => {
        if (!effectiveId) return null; // 🚀 Prevent calculation if no identity is selected

        const today = new Date();
        let expectedCash = 0;
        let expectedTransfer = 0;
        
        const isBossCar = effectiveId === 'ADMIN_VEHICLE' || effectiveId === 'VAULT';
        
        let expectedCukai = 0;
        const agentProfile = motorists.find(m => m.id === effectiveId) || {};

        // 🚀 FIX: Read the SELECTED identity's own vehicle stock, not the fixed prop.
        // agentCanvas is the logged-in user's own canvas, so when an Admin switched
        // identity in the dropdown, "Goods to Return" stayed empty/wrong. Fall back to
        // the prop only when reconciling your own profile.
        const resolvedCanvas = (agentProfile.activeCanvas && agentProfile.activeCanvas.length > 0)
            ? agentProfile.activeCanvas
            : ((effectiveId === agentProfileId) ? (agentCanvas || []) : []);

        const cDebts = agentProfile.cukaiDebts || {};
        const legacyDebt = agentProfile.cukaiDebt || 0;
        
        let calcTotal = 0;
        let globalCredit = cDebts['global_credit'] || 0;
        for (let [pid, val] of Object.entries(cDebts)) {
            if (pid !== 'global_credit' && !pid.startsWith('PENALTY_') && val > 0) calcTotal += Math.ceil(val);
        }
        expectedCukai = Math.max(0, calcTotal + globalCredit + Math.ceil(legacyDebt));

        const todaysSamplings = samplings.filter(s => {
            const matchesAgent = isBossCar ? (s.sourceId === effectiveId || s.sourceId === 'VAULT' || s.sourceId === 'ADMIN') : (s.sourceId === effectiveId);
            if (!matchesAgent) return false;
            const sDate = s.timestamp?.seconds ? new Date(s.timestamp.seconds * 1000) : new Date(s.date);
            return sDate.toDateString() === today.toDateString();
        });

        const todaysTrans = transactions.filter(t => {
            const matchesAgent = isBossCar ? (t.agentId === effectiveId || !t.agentId || t.agentId === 'VAULT' || t.agentId === 'ADMIN') : (t.agentId === effectiveId);
            if (!matchesAgent) return false;
            const tDate = t.timestamp ? new Date(t.timestamp.seconds * 1000) : new Date(t.date);
            return tDate.toDateString() === today.toDateString();
        });

        /* 🔎 THE SOURCE ROWS BEHIND EACH TOTAL. Aldi, 2026-08-16: *"we need to make system where
           this leak of cash or input can be traced down to the root"*. A sum cannot be traced —
           you cannot ask a number which sale it came from — so the loop that builds the total now
           also keeps the transactions it came from. The cost is one push per row: the transaction
           is already in hand here, `t.id` included. See src/utils/eodRecord.js. */
        const cashSources = [];
        const transferSources = [];
        todaysTrans.forEach(t => {
            const amount = t.amountPaid !== undefined ? t.amountPaid : (t.total || 0);
            const method = t.paymentType || t.method || 'Cash';
            if ((t.type === 'SALE' && method !== 'Titip') || t.type === 'CONSIGNMENT_PAYMENT') {
                const row = {
                    txId: t.id,
                    amount,
                    customerName: t.customerName || 'Unknown store',
                    method,
                    at: t.timestamp?.seconds || null
                };
                if (method === 'Transfer' || method === 'QRIS') { expectedTransfer += amount; transferSources.push(row); }
                else { expectedCash += amount; cashSources.push(row); }
            }
        });

        // 🚀 CAREER LEDGER STATS (Phase 2): stamped onto the CASH_STOCK payload at submit time,
        // read once by handleVerifyEOD into the career doc. Product Map built once, outside any loop.
        const productMap = new Map(inventory.map(p => [p.id, p]));
        /* 🚀 A COUNT, and it is banked: storesServed is stamped onto the EOD payload and added to
           the agent's career doc with increment(), so a shop counted twice under two spellings
           inflated a lifetime stat permanently. Keyed now. Past increments are not rewritten —
           they are already summed into the career doc and there is nothing here to correct them
           with; only days submitted from now on are counted honestly. */
        const storesServed = new Set(
            todaysTrans.filter(t => t.type === 'SALE').map(t => storeKey(t.customerName))
        ).size;
        const titipCollected = todaysTrans
            .filter(t => t.type === 'CONSIGNMENT_PAYMENT')
            .reduce((sum, t) => sum + (t.amountPaid !== undefined ? t.amountPaid : (t.total || 0)), 0);
        const itemsBks = todaysTrans
            .filter(t => t.type === 'SALE')
            .reduce((sum, t) => sum + (t.items || []).reduce((itemSum, item) => {
                const prod = productMap.get(item.productId);
                let mult = 1;
                if (item.unit === 'Slop') mult = prod?.packsPerSlop || 10;
                if (item.unit === 'Bal') mult = (prod?.slopsPerBal || 20) * (prod?.packsPerSlop || 10);
                if (item.unit === 'Karton') mult = (prod?.balsPerCarton || 4) * (prod?.slopsPerBal || 20) * (prod?.packsPerSlop || 10);
                return itemSum + (Number(item.qty) || 0) * mult;
            }, 0), 0);

        const todaysReports = eodReports.filter(r => {
            if (r.agentId !== effectiveId) return false;
            const rDate = r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000) : (r.timestamp ? new Date(r.timestamp) : today);
            return rDate.toDateString() === today.toDateString();
        });

        const pendingCash = todaysReports.find(r => r.status === 'PENDING' && r.reportType === 'CASH_STOCK');
        const verifiedCash = todaysReports.find(r => r.status === 'VERIFIED' && r.reportType === 'CASH_STOCK');
        const pendingCukai = todaysReports.find(r => r.status === 'PENDING' && r.reportType === 'CUKAI');
        const verifiedCukai = todaysReports.find(r => r.status === 'VERIFIED' && r.reportType === 'CUKAI');
        
        const legacyPending = todaysReports.find(r => r.status === 'PENDING' && !r.reportType);
        // 🚀 FIX: One row per individual ticket (matches Agent Inventory's Quarantine Ledger),
        // and skip any ticket already credited to the vault by a previous EOD verification —
        // otherwise the same damaged stock gets counted and credited every time EOD runs.
        const damagedItemsToReturn = [];
        todaysTrans.forEach(t => {
            if (!t.forensicData || !t.forensicData.quarantineCargo || t.forensicData.eodCredited) return;
            t.forensicData.quarantineCargo.forEach((item, idx) => {
                damagedItemsToReturn.push({
                    ticketId: `${t.id}-${idx}`,
                    txId: t.id,
                    productId: item.productId,
                    name: item.itemName,
                    unit: item.unit || 'Bks',
                    qty: Number(item.qty) || 0,
                    reason: item.returnReason || 'Unclassified'
                });
            });
        });

        const legacyVerified = todaysReports.find(r => r.status === 'VERIFIED' && !r.reportType);

        /* the boss sent a part back with a reason (PlayerCard ✕ → handleVerifyEOD `rejected`); the deck shows it */
        const rejected = { ...((pendingCash || legacyPending)?.rejected || {}), ...(pendingCukai?.rejected || {}) };
        const cashStatus = (pendingCash || legacyPending) ? 'PENDING' : (verifiedCash || legacyVerified) ? 'VERIFIED' : 'READY';
        const cukaiStatus = (pendingCukai || legacyPending) ? 'PENDING' : (verifiedCukai || legacyVerified) ? 'VERIFIED' : 'READY';

        return { expectedCash, expectedTransfer, expectedCukai, activeStock: resolvedCanvas, damagedItemsToReturn, todaysSamplings, cashStatus, cukaiStatus, rejected, storesServed, titipCollected, itemsBks, cukaiRemaining: expectedCukai, cashSources, transferSources,
            dayXP: verifiedCash?.dayXP, xpBreakdown: verifiedCash?.xpBreakdown,   // tonight's XP, written by the boss's last approval (XpGain)
            dayCollected: Number(verifiedCash?.cash || 0) + Number(verifiedCash?.transfer || 0), dayStores: Number(verifiedCash?.storesServed || 0) };
    }, [effectiveId, samplings, transactions, agentCanvas, eodReports, motorists, agentProfileId]);

    /* 🔒 THE STAMP CEILING — Aldi, 2026-08-17: *"it still allow us to sent the item data more than
       what the agent bring"*. The cost is real and it is not cosmetic: `handleVerifyEOD` turns any
       figure above the agent's actual debt into a NEGATIVE `global_credit` (App.jsx:1918-1920),
       which permanently lowers what they owe on every later day. So an over-count here mints stamp
       credit nobody earned. Returned + lost can never exceed what is owed — one is stamps in a
       hand, the other is stamps that were in that hand and are not any more, and there were only
       ever `expectedCukai` of them. */
    const cukaiOwed = Number(agentData?.expectedCukai) || 0;
    const cukaiReturnedNum = parseInt(cukaiReturnedInput, 10) || 0;
    const cukaiPaidNum = parseInt(cukaiPaidInput, 10) || 0;
    const cukaiOverCount = (cukaiReturnedNum + cukaiPaidNum) > cukaiOwed;
    const clampStamps = (raw) => {
        if (raw === '') return '';
        const n = Math.max(0, parseInt(String(raw).replace(/[^0-9]/g, ''), 10) || 0);
        return String(Math.min(n, cukaiOwed));
    };

    useEffect(() => {
        if (agentData && cukaiReturnedInput === "" && cukaiPaidInput === "") {
            setCukaiReturnedInput(agentData.expectedCukai);
            setCukaiPaidInput(0);
        }
    }, [agentData, cukaiReturnedInput, cukaiPaidInput]);

    // --- ADMIN LOGIC: View Pending Reports ---
    const pendingReports = useMemo(() => {
        if (!isAdmin) return [];
        return eodReports.filter(r => r.status === 'PENDING').sort((a,b) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
        });
    }, [eodReports, isAdmin]);
    /* one panel per person: every PENDING report a salesman sent tonight, grouped; the folder shows the totals and a
       diode that lights only for a problem (a short count, a bounty, lost stamps) */
    const pendingByAgent = useMemo(() => {
        const groups = {};
        pendingReports.forEach((r) => {
            const key = r.agentId || r.agentName || r.id;
            const g = groups[key] || (groups[key] = { key, agentName: r.agentName || key, reports: [], disputed: false, lost: 0, cashTotal: 0, cukai: 0 });
            g.reports.push(r);
            if (r.countStatus === 'DISPUTED' || r.reportType === 'BOUNTY') g.disputed = true;
            g.lost += Number(r.cukaiPaid) || 0;
            if (r.reportType !== 'CUKAI') g.cashTotal += (Number(r.cash) || 0) + (Number(r.transfer) || 0);
            if (r.reportType === 'CUKAI' || !r.reportType) g.cukai += Number(r.cukaiReturned !== undefined ? r.cukaiReturned : (r.cukai || 0)) || 0;
        });
        return Object.values(groups);
    }, [pendingReports]);

    const structuredHistory = useMemo(() => {
        if (!isAdmin) return {};

        const verified = eodReports.filter(r => r.status === 'VERIFIED').sort((a,b) => {
            const timeA = a.verifiedAt?.seconds || a.timestamp?.seconds || 0;
            const timeB = b.verifiedAt?.seconds || b.timestamp?.seconds || 0;
            return timeB - timeA;
        });

        const tree = {};

        verified.forEach(report => {
            const agent = motorists.find(m => m.id === report.agentId);
            const location = agent?.location || 'HQ / UNASSIGNED';
            const empName = report.agentName || 'Unknown Agent';

            const dateObj = report.verifiedAt?.seconds ? new Date(report.verifiedAt.seconds * 1000) : (report.timestamp?.seconds ? new Date(report.timestamp.seconds * 1000) : new Date());
            const yearMonth = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
            const fullDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

            if (!tree[location]) tree[location] = {};
            if (!tree[location][empName]) tree[location][empName] = {};
            if (!tree[location][empName][yearMonth]) tree[location][empName][yearMonth] = {};
            if (!tree[location][empName][yearMonth][fullDate]) tree[location][empName][yearMonth][fullDate] = [];

            tree[location][empName][yearMonth][fullDate].push(report);
        });

        return tree;
    }, [eodReports, motorists, isAdmin]);

    // 🚀 IDENTITY RESOLVER FOR SUBMISSIONS
    const resolveIdentityName = () => {
        const profile = motorists.find(m => m.id === effectiveId);
        return profile ? profile.name : 'Admin';
    };


    return (
        <div className="animate-fade-in space-y-6 max-w-7xl mx-auto p-2">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[var(--line)] pb-6">
                <div>
                    <h2 className="text-3xl font-black text-[var(--ink)] uppercase tracking-widest flex items-center gap-3">
                        <ShieldCheck className="text-[var(--ink-dim)]" size={32}/> EOD Setoran
                    </h2>
                    <p className="text-[11px] lg:text-[10px] text-[var(--ink-dim)] uppercase tracking-widest mt-2">End of Day Reconciliation & Vault Return</p>
                </div>
                
                {isAdmin && (
                    <div className="flex bg-black/50 rounded-lg p-1 border border-[var(--line)] w-full md:w-auto overflow-x-auto custom-scrollbar">
                        <button onClick={() => setViewMode('review')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${viewMode === 'review' ? 'bg-[var(--gold)] text-[var(--gold-ink)] shadow-md' : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'} `}>
                            <ShieldAlert size={14}/> HQ Verification 
                            {pendingReports.length > 0 && <span className="bg-[var(--danger)] text-[var(--gold-ink)] text-[11px] px-1.5 py-0.5 rounded-full">{pendingReports.length}</span>}
                        </button>
                        <button onClick={() => setViewMode('submit')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${viewMode === 'submit' ? 'bg-[var(--gold)] text-[var(--gold-ink)] shadow-md' : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'} `}>
                            <Wallet size={14}/> My Setoran
                        </button>
                    </div>
                )}
            </div>

            {/* ========================================= */}
            {/* ============ AGENT VIEW ================= */}
            {/* ========================================= */}
            {viewMode === 'submit' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">

                    {/* 🚀 THE IDENTITY SWITCHER (ADMIN ONLY) 🚀 */}
                    {isAdmin && (
                        <div className="md:col-span-2 bg-[var(--sunk)] border border-[var(--line)] p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-[var(--ink-dim)] font-bold uppercase tracking-widest text-[10px] mb-1 flex items-center gap-1"><User size={12}/> Operating Identity</h3>
                                <p className="text-[var(--ink-dim)] text-[10px]">Select which profile's wallet you are reconciling.</p>
                            </div>
                            <select 
                                value={adminSetoranId} 
                                onChange={(e) => setAdminSetoranId(e.target.value)}
                                className="flex-1 bg-[var(--sunk)] border border-[var(--line)] rounded-lg p-3 text-xs text-[var(--ink)] font-bold uppercase tracking-widest outline-none focus:border-[var(--line)] w-full"
                            >
                                <option value="" className="bg-[var(--sunk)]">-- SELECT IDENTITY --</option>
                                {motorists.filter(m => m.id !== 'master_owner').map(m => (
                                    <option key={m.id} value={m.id} className="bg-[var(--sunk)]">{m.name} ({m.role || 'Staff'})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* 🛑 IDENTITY REQUIRED WALL 🛑 */}
                    {isAdmin && !effectiveId ? (
                        <div className="md:col-span-2 flex flex-col items-center justify-center py-16 opacity-40">
                            <User size={64} className="mb-4 text-[var(--ink-dim)]" />
                            <h2 className="text-xl font-black uppercase tracking-[0.3em] text-[var(--ink)]">Identity Required</h2>
                            <p className="text-xs text-[var(--ink-dim)] uppercase tracking-widest mt-2">Select an operating identity above to view Setoran.</p>
                        </div>
                    ) : agentData && (
                        <>
                            {/* 🐎 THE RDR2 WANTED BOUNTY BOARD 🐎 */}
                            {(agentBountyData.keys.length > 0 || agentBountyData.isPending) && (
                                <div className="md:col-span-2 bg-[#1a0505] border-2 border-[var(--danger)] rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(220,38,38,0.2)] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 mb-2 animate-pop-in">
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(220,38,38,0.05)_50%,transparent_75%)] bg-[length:10px_10px] pointer-events-none"></div>
                                    <div className="absolute -right-10 -top-10 opacity-10 rotate-12 pointer-events-none">
                                        <Target size={150} className="text-[var(--danger-ink)]" />
                                    </div>
                                    
                                    <div className="relative z-10 flex-1 text-center md:text-left">
                                        <h2 className="text-4xl md:text-5xl font-black text-[var(--danger-ink)] uppercase tracking-[0.3em] mb-2" style={{ fontFamily: 'Georgia, serif' }}>WANTED</h2>
                                        <p className="text-xs text-[var(--danger-ink)] uppercase tracking-[0.4em] font-bold mb-4 border-b border-[var(--danger)] pb-2 inline-block md:block">Company Property Damage Fine</p>
                                        <p className="text-sm text-[var(--ink-dim)] leading-relaxed max-w-xl mx-auto md:mx-0">
                                            You have an outstanding company debt for unaccounted or severely damaged inventory. You must clear this bounty with the Branch Admin to restore good standing.
                                        </p>
                                    </div>

                                    <div className="relative z-10 flex flex-col items-center md:items-end w-full md:w-auto shrink-0">
                                        {agentBountyData.isPending ? (
                                            <div className="bg-black/50 border border-[var(--danger)] px-8 py-6 rounded-xl text-center backdrop-blur-sm w-full">
                                                <Clock size={32} className="text-[var(--danger-ink)] animate-pulse mx-auto mb-3"/>
                                                <p className="text-[var(--danger-ink)] font-black uppercase tracking-[0.2em] text-sm">Bounty Under Review</p>
                                                <p className="text-[10px] text-[var(--danger-ink)] mt-2 uppercase tracking-widest font-mono">Awaiting Sheriff Verification</p>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-[10px] text-[var(--danger-ink)] font-bold uppercase tracking-widest mb-2">Total Bounty Amount</p>
                                                <p className="text-4xl font-black text-[var(--danger-ink)] font-mono mb-4 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                                                    {formatRupiah(agentBountyData.total)}
                                                </p>

                                                {/* One line per reason, with the arithmetic on it. His example:
                                                    "cello chocolate 5 bks = 50,000 (7 agustus 2026)". */}
                                                {agentBountyData.items.length > 0 && (
                                                    <div className="w-full md:w-80 mb-4 space-y-1 text-left">
                                                        <p className="text-[10px] text-[var(--danger-ink)] font-bold uppercase tracking-widest mb-1">What it is made of</p>
                                                        {agentBountyData.items.map(item => (
                                                            <div key={item.key} className="flex justify-between items-baseline gap-3 bg-[var(--danger-well)] border border-[var(--danger)] px-2 py-1.5 rounded">
                                                                <span className="text-[11px] text-[var(--danger-ink)] leading-tight">
                                                                    {item.label}
                                                                    {item.date && <span className="text-[10px] text-[var(--ink-dim)] block">{item.date}</span>}
                                                                </span>
                                                                <strong className="text-[12px] text-[var(--danger-ink)] font-mono tabular-nums whitespace-nowrap">{formatRupiah(item.amount)}</strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* 🚀 THE RP 0 WARNING REVEAL */}
                                                {agentBountyData.total === 0 && (
                                                    <div className="bg-[var(--danger-well)] border border-[var(--danger)] p-2 rounded mb-4 inline-block shadow-inner">
                                                        <p className="text-[var(--accent-ink)] text-[11px] uppercase font-bold tracking-widest flex items-center justify-center gap-1">
                                                            <AlertCircle size={10}/> Warning: Fine is Rp 0 (Product missing HPP)
                                                        </p>
                                                    </div>
                                                )}

                                                <button 
                                                    onClick={async () => {
                                                        if (await confirmAction(`Hand over exactly ${formatRupiah(agentBountyData.total)} in cash to the Admin to clear this bounty?`)) {
                                                            submit({ 
                                                                cash: agentBountyData.total, 
                                                                transfer: 0, cukai: 0, 
                                                                reportType: 'BOUNTY', 
                                                                penaltyKeys: agentBountyData.keys,
                                                                agentId: effectiveId,
                                                                agentName: resolveIdentityName()
                                                            });
                                                        }
                                                    }}
                                                    disabled={submitting}
                                                    className="w-full md:w-auto px-10 py-4 disabled:opacity-40 bg-[var(--danger)] hover:bg-[var(--danger)] text-[var(--gold-ink)] rounded-xl font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(220,38,38,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3"
                                                >
                                                    <BadgeDollarSign size={20}/> Pay Bounty
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* 🚀 CARD 1: FINANCIAL & STOCK HANDOVER
                                ⚠️ NO `overflow-hidden` WHILE THE COUNTING FLOW IS INSIDE. A confirmed
                                card flies UPWARD out of the deck into the letter, so a clipping
                                ancestor deletes the only animation on the screen.
                                ⚠️ The decorative gold quarter-circle is gone from both cards — it
                                overflowed the corner radius and was part of what he read as broken. */}
                            <div className={`bg-black/20 border border-[var(--line)] rounded-2xl p-5 md:p-6 shadow-xl flex flex-col h-full relative ${agentData.cashStatus === 'READY' ? 'md:col-span-2' : 'overflow-hidden'}`}>
                                <h3 className="text-lg font-black text-[var(--ink)] uppercase tracking-widest border-b border-[var(--line)] pb-4 mb-5 flex items-center gap-2 relative z-10"><Wallet className="text-[var(--ink-dim)]"/> {agentData.cashStatus === 'READY' ? 'Close The Day' : 'Cash & Stock'}</h3>
                                
                                <div className="flex-1">
                                    {agentData.cashStatus === 'PENDING' ? (
                                        <div className="flex flex-col items-center justify-center h-full py-10 opacity-70">
                                            <Clock className="text-[var(--ink-dim)] mb-4 animate-pulse" size={40}/>
                                            <h3 className="text-lg font-black text-[var(--ink-dim)] uppercase tracking-widest mb-1">Awaiting Verification</h3>
                                            <p className="text-[11px] lg:text-[10px] text-[var(--ink-dim)] uppercase tracking-widest text-center">Hand envelope to Admin.</p>
                                            {Object.entries(agentData.rejected || {}).filter(([p]) => p !== 'cukai').map(([p, why]) => (
                                                <p key={p} className="kpm-led-line crit mt-3 text-[11px] font-bold uppercase tracking-widest"><i aria-hidden="true"></i>{EOD_PART_LABELS[p] || p} sent back: <span className="normal-case tracking-normal">{why}</span></p>
                                            ))}
                                        </div>
                                    ) : agentData.cashStatus === 'VERIFIED' ? (
                                        <div className="flex flex-col items-center justify-center h-full py-6">
                                            {/* the three closed lines keep their 70 % dim; the XP block under them is full ink */}
                                            <div className="flex flex-col items-center opacity-70">
                                                <CheckCircle className="text-[var(--ink-dim)] mb-4" size={40}/>
                                                <h3 className="text-lg font-black text-[var(--ink-dim)] uppercase tracking-widest mb-1">Shift Closed</h3>
                                                <p className="text-[11px] lg:text-[10px] text-[var(--ink-dim)] uppercase tracking-widest text-center">Cash & Stock successfully verified.</p>
                                            </div>
                                            {agentData.dayXP > 0 && <XpGain total={agentData.dayXP} breakdown={agentData.xpBreakdown} collected={agentData.dayCollected} stores={agentData.dayStores} />}
                                        </div>
                                    ) : null}
                                </div>

                                {/* 🃏 THE AGENT COUNTS, THEN THE APP COMPARES — Aldi's redesign, 2026-08-16.
                                    The old control here was a single "Submit Cash & Stock" button under figures the
                                    app had worked out itself, so nothing the agent did could be right or wrong.

                                    ⚠️ THE SUBMITTED PAYLOAD IS UNCHANGED. `cash` and `transfer` still carry the
                                    CALCULATED figures, because handleVerifyEOD credits the career ledger from them
                                    and he said keep the logic. What the agent counted rides alongside as `cards`,
                                    where the regional admin and HQ can compare the two. Nothing about crediting
                                    moves until "Accept short" ships — and that needs his rules deploy first. */}
                                {agentData.cashStatus === 'READY' && (
                                    <div className="mt-6">
                                        {/* 🔢 ONE INPUT PER LINE. Aldi, 2026-08-17: *"what if there are a lot of item
                                            types at once missing item on onetype wont make a good record to the data"*.
                                            A single goods total hides a one-product shortfall, so each product in the
                                            vehicle is counted on its own row and becomes its own source record.
                                            ⚠️ PITA CUKAI IS NOT PER PRODUCT — `expectedCukai` is one pool (calcTotal +
                                            credit + legacy debt), so there is no per-product figure to count against.
                                            Its two lines are the two OUTCOMES the old second card owned: handed over,
                                            and lost. declared = returned + lost, exactly what that card submitted.

                                            🧾 TWO REPORTS, ONE SEND. The old screen had two submit buttons writing two
                                            separate documents; the letter now covers both, so it writes both. Same two
                                            documents, same shapes, same `handleVerifyEOD` — the change is that the agent
                                            presses once instead of twice, not that anything downstream moved. */}
                                        {/* Keyed on the identity: the admin can switch whose setoran he is
                                            entering, and React would otherwise reuse this component and keep
                                            the previous agent's counted figures in its own state. */}
                                        <EODAgentFlow key={effectiveId}
                                            draftKey={`kpm-eod-draft:${effectiveId}:${getLocalDayKey()}`}
                                            submitting={submitting}
                                            expected={{
                                                cash: agentData.expectedCash,
                                                transfer: agentData.expectedTransfer,
                                                goods: (agentData.activeStock || []).reduce((n, i) => n + (Number(i.qty) || 0), 0),
                                                cukai: agentData.expectedCukai
                                            }}
                                            sources={{
                                                cash: agentData.cashSources,
                                                transfer: agentData.transferSources
                                            }}
                                            /* 🧾 THE TRANSFER CARD IS A RECEIPT LIST, NOT A NUMBER PAD.
                                               Aldi, 2026-08-17: *"it is better when there is some list of the
                                               receipt that been printed today, if less give the agent option to
                                               write the real value"*. You do not COUNT a bank transfer — it
                                               reached the account or it did not — so a typed total is arithmetic
                                               the agent should not be doing, and it loses the only fact worth
                                               having. These are the same rows that already back the total, so
                                               nothing new is read: `transferSources` is built in the same loop as
                                               `expectedTransfer` and already carries the customer and the method. */
                                            receipts={{
                                                transfer: (agentData.transferSources || []).map((t, n) => ({
                                                    key: t.txId || `tf-${n}`,
                                                    txId: t.txId,
                                                    customer: t.customerName || 'Unknown store',
                                                    amount: Number(t.amount) || 0,
                                                    method: t.method
                                                }))
                                            }}
                                            lines={{
                                                goods: (agentData.activeStock || []).map((item, n) => ({
                                                    key: String(item.productId || `row-${n}`),
                                                    name: item.name,
                                                    unit: item.unit || 'Bks',
                                                    expected: Number(item.qty) || 0,
                                                    // 🔒 you cannot hand back more of a product than the van was loaded with
                                                    max: Number(item.qty) || 0
                                                })),
                                                cukai: [
                                                    { key: 'returned', name: 'Stamps handed over', unit: 'pcs', expected: agentData.expectedCukai, max: agentData.expectedCukai, hint: 'Physical stamps going to the admin' },
                                                    { key: 'lost',     name: 'Stamps lost',        unit: 'pcs', expected: 0,                       max: agentData.expectedCukai, hint: 'You pay a cash fine for each one' }
                                                ]
                                            }}
                                            /* 🔒 handed over + lost can never exceed what is owed. Each line alone
                                               fits under the debt; together they must too, or the submitted `cukai`
                                               figure mints credit at App.jsx:1918. Goods needs no total cap — every
                                               line is already capped at its own product's load. */
                                            maxTotal={{ cukai: agentData.expectedCukai }}
                                            notes={{
                                                cukai: (rows) => {
                                                    const lost = parseInt(String(rows.lost || '').replace(/[^0-9]/g, ''), 10) || 0;
                                                    if (lost <= 0) return null;
                                                    return (
                                                        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-well)] px-3 py-2 text-center">
                                                            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--danger-ink)] flex items-center justify-center gap-1"><AlertCircle size={11}/> Cash fine required</p>
                                                            <p className="text-lg font-black text-[var(--danger-ink)] leading-tight">{formatRupiah(lost * cukaiFinePrice)}</p>
                                                            <p className="text-[10px] text-[var(--danger-ink)] uppercase tracking-widest">{formatRupiah(cukaiFinePrice)} per lost stamp</p>
                                                        </div>
                                                    );
                                                }
                                            }}
                                            onSubmit={(letter) => {
                                                const cukaiRows = letter.cards.cukai?.sources || [];
                                                const returned = Number(cukaiRows.find(r => r.txId === 'cukai:returned')?.amount) || 0;
                                                const lost = Number(cukaiRows.find(r => r.txId === 'cukai:lost')?.amount) || 0;

                                                /* 🚀 THE COUNT NOW DECIDES THE REPORT.
                                                   Until this, every figure that ACTED was the
                                                   system's own expectation: cash, transfer and the
                                                   van list were all "what should have been there",
                                                   and what the agent actually counted travelled
                                                   alongside as a note nothing read. So a shortage
                                                   could not be detected — the submitted cash figure
                                                   WAS the expected figure, and the two could never
                                                   disagree. The whole counting flow felt finished
                                                   while the comparison never happened.

                                                   `declared` is what he counted, `expected` is what
                                                   the app believed; the letter has carried both all
                                                   along. Both go up now, with the gap named. */
                                                const card = (id) => letter.cards?.[id] || {};
                                                const declaredOr = (id, fallback) => {
                                                    const d = card(id).declared;
                                                    return (d === null || d === undefined) ? Number(fallback || 0) : Number(d);
                                                };

                                                const countedCash     = declaredOr('cash', agentData.expectedCash);
                                                const countedTransfer = declaredOr('transfer', agentData.expectedTransfer);

                                                /* The goods card counts line by line and its rows are
                                                   keyed `goods:<productId>`, so the counted quantity
                                                   maps straight back onto the van list, unit and all.
                                                   A product he did not count keeps its expected row —
                                                   silence is not the same as zero. */
                                                const countedByProduct = {};
                                                (card('goods').sources || []).forEach(r => {
                                                    const pid = String(r.txId || '').startsWith('goods:')
                                                        ? String(r.txId).slice('goods:'.length) : '';
                                                    if (pid) countedByProduct[pid] = Number(r.amount) || 0;
                                                });
                                                const countedStock = (agentData.activeStock || []).map(item => {
                                                    const pid = String(item.productId);
                                                    return pid in countedByProduct ? { ...item, qty: countedByProduct[pid] } : item;
                                                });

                                                const cashVariance     = countedCash - Number(agentData.expectedCash || 0);
                                                const transferVariance = countedTransfer - Number(agentData.expectedTransfer || 0);
                                                const goodsShort = (agentData.activeStock || []).some(item => {
                                                    const pid = String(item.productId);
                                                    return pid in countedByProduct && countedByProduct[pid] < (Number(item.qty) || 0);
                                                });

                                                /* DISPUTED only FLAGS the gap. Nothing here posts a
                                                   shortfall against the agent, because the rule Aldi
                                                   set for transfers is that a shortfall waits for the
                                                   company to rule on it. Sending the counted figure
                                                   without that ruling step is the one thing he said
                                                   must not happen, so the flag travels and the
                                                   judgement stays with the admin. */
                                                const countStatus = (cashVariance < 0 || transferVariance < 0 || goodsShort)
                                                    ? 'DISPUTED' : 'CLEAN';

                                                submit({
                                                    cash: countedCash,
                                                    transfer: countedTransfer,
                                                    cukai: 0,
                                                    remainingStock: countedStock,
                                                    // what the app expected, kept beside the count so the admin sees both
                                                    expectedCash: Number(agentData.expectedCash || 0),
                                                    expectedTransfer: Number(agentData.expectedTransfer || 0),
                                                    expectedStock: agentData.activeStock,
                                                    cashVariance,
                                                    transferVariance,
                                                    goodsShort,
                                                    countStatus,
                                                    damagedStockToReturn: agentData.damagedItemsToReturn,
                                                    deployedSamples: [],
                                                    reportType: 'CASH_STOCK',
                                                    agentId: effectiveId,
                                                    agentName: resolveIdentityName(),
                                                    dayKey: getLocalDayKey(),
                                                    storesServed: agentData.storesServed,
                                                    cukaiRemaining: agentData.cukaiRemaining,
                                                    titipCollected: agentData.titipCollected,
                                                    itemsBks: agentData.itemsBks,
                                                    // 🆕 additive: what the agent actually counted, with the rows behind it
                                                    cards: letter.cards
                                                },
                                                /* 🧾 TWO DOCUMENTS, ONE SHUT WINDOW. CUKAI is a second write
                                                   from the same tap, so it travels as a second payload rather
                                                   than a second call. As two calls the flag cleared between
                                                   them and the door reopened mid-submission. */
                                                ...(agentData.cukaiStatus === 'READY' ? [{
                                                        cash: 0, transfer: 0,
                                                        cukaiReturned: returned,
                                                        cukaiPaid: lost,
                                                        cukaiFine: lost * cukaiFinePrice,
                                                        cukai: returned + lost,
                                                        remainingStock: [],
                                                        deployedSamples: agentData.todaysSamplings,
                                                        reportType: 'CUKAI',
                                                        agentId: effectiveId,
                                                        agentName: resolveIdentityName()
                                                    }] : []));
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* 🚀 CARD 2: PITA CUKAI HANDOVER & FINE SYSTEM
                                ⚠️ IT DISAPPEARS WHILE THE COUNTING FLOW IS LIVE, and that is the point of the
                                redesign rather than a tidy-up. The deck's fourth card counts stamps — handed
                                over and lost — and the letter writes the CUKAI report, so leaving this card on
                                screen showed the agent the same job twice with two different submit buttons.
                                It stays for the PENDING and VERIFIED states, which the letter does not cover,
                                and for legacy days where cukai is still open after cash was submitted.
                                ⚠️ It also wears the same EDGE as Cash & Stock beside it now. A gold-outlined
                                card next to a plain one reads as two different systems, and the accent is
                                already carried by the icon. */}
                            {agentData.cashStatus !== 'READY' && (
                            <div className="bg-black/20 border border-[var(--line)] rounded-2xl p-5 md:p-6 shadow-xl flex flex-col h-full relative overflow-hidden">
                                <h3 className="text-lg font-black text-[var(--ink)] uppercase tracking-widest border-b border-[var(--line)] pb-4 mb-5 flex items-center gap-2 relative z-10"><Tag className="text-[var(--accent-ink)]"/> Pita Cukai</h3>
                                
                                <div className="flex-1">
                                    {agentData.cukaiStatus === 'PENDING' ? (
                                        <div className="flex flex-col items-center justify-center h-full py-10 opacity-70">
                                            <Clock className="text-[var(--accent-ink)] mb-4 animate-pulse" size={40}/>
                                            <h3 className="text-lg font-black text-[var(--accent-ink)] uppercase tracking-widest mb-1">Awaiting Verification</h3>
                                            <p className="text-[10px] text-[var(--ink-dim)] uppercase tracking-widest text-center">Hand stamps (and cash fines) to Admin.</p>
                                            {agentData.rejected?.cukai && <p className="kpm-led-line crit mt-3 text-[11px] font-bold uppercase tracking-widest"><i aria-hidden="true"></i>Pita cukai sent back: <span className="normal-case tracking-normal">{agentData.rejected.cukai}</span></p>}
                                        </div>
                                    ) : agentData.cukaiStatus === 'VERIFIED' ? (
                                        <div className="flex flex-col items-center justify-center h-full py-10 opacity-70">
                                            <CheckCircle className="text-[var(--accent-ink)] mb-4" size={40}/>
                                            <h3 className="text-lg font-black text-[var(--accent-ink)] uppercase tracking-widest mb-1">Cukai Cleared</h3>
                                            <p className="text-[10px] text-[var(--ink-dim)] uppercase tracking-widest text-center">Tax stamps successfully verified.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">

                                            {/* 🎨 REBUILT ON THE TOKENS, 2026-08-17. His verdict on the old version: *"the color
                                                pallete and design is really bad, make sure it follow our theme"*, and he was right
                                                on the mechanism as much as the taste — the panel was a full `--gold` slab carrying
                                                `--ink-dim` text, which is gold on gold, and the two fields were `bg-black/60`, a
                                                hardcoded black that decides what light mode looks like.
                                                ⚠️ HIS LAW APPLIED: colour marks what needs ATTENTION; "fine" is the ABSENCE of
                                                colour. The debt is information, so it wears the surface. Red appears only when
                                                stamps are actually lost, and it arrives as a BORDER plus a plate — never as ink on
                                                a light ground, where it has to fight the paper to be read. */}
                                            <div className="rounded-xl border border-[var(--line-3)] bg-[var(--inset)] p-4">
                                                <p className="text-[11px] font-bold text-[var(--ink-dim)] uppercase tracking-[.18em] text-center">Total stamps you owe</p>
                                                <p className="mt-1 mb-4 text-center font-mono text-3xl font-black tabular-nums text-[var(--ink)] leading-none">
                                                    {cukaiOwed}<span className="ml-1 text-sm font-bold text-[var(--ink-dim)]">pcs</span>
                                                </p>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <label className="block rounded-lg border-2 p-3 text-center bg-[var(--raised)] border-[var(--line)] focus-within:border-[var(--accent-edge)]">
                                                        <span className="block text-[11px] font-bold text-[var(--ink-dim)] uppercase tracking-wider mb-1.5">Handed over</span>
                                                        <input
                                                            type="number" min="0" max={cukaiOwed} value={cukaiReturnedInput}
                                                            onChange={(e) => setCukaiReturnedInput(clampStamps(e.target.value))}
                                                            className="w-full bg-transparent text-[var(--ink)] font-mono font-black text-3xl tabular-nums text-center outline-none"
                                                        />
                                                    </label>

                                                    {/* the lost field turns red by BORDER, not by ink — the number stays on `--ink`
                                                        so it is legible in both themes at any count */}
                                                    <label className={`block rounded-lg border-2 p-3 text-center bg-[var(--raised)] focus-within:border-[var(--accent-edge)] ${cukaiPaidNum > 0 ? 'border-[var(--danger)]' : 'border-[var(--line)]'}`}>
                                                        <span className="block text-[11px] font-bold text-[var(--ink-dim)] uppercase tracking-wider mb-1.5">Lost</span>
                                                        <input
                                                            type="number" min="0" max={cukaiOwed} value={cukaiPaidInput}
                                                            onChange={(e) => setCukaiPaidInput(clampStamps(e.target.value))}
                                                            className="w-full bg-transparent text-[var(--ink)] font-mono font-black text-3xl tabular-nums text-center outline-none"
                                                        />
                                                    </label>
                                                </div>

                                                {cukaiOverCount && (
                                                    <p className="mt-3 rounded-lg border border-[var(--danger)] bg-[var(--danger-well)] px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-[.14em] text-[var(--danger-ink)]">
                                                        That is {cukaiReturnedNum + cukaiPaidNum} against {cukaiOwed} owed
                                                    </p>
                                                )}

                                                {cukaiPaidNum > 0 && !cukaiOverCount && (
                                                    <div className="mt-3 p-3 bg-[var(--danger-well)] border border-[var(--danger)] rounded-lg text-center animate-fade-in">
                                                        <p className="text-[10px] text-[var(--danger-ink)] uppercase font-bold tracking-[.18em] flex justify-center items-center gap-1"><AlertCircle size={12}/> Cash fine required</p>
                                                        <p className="text-xl font-black text-[var(--danger-ink)] mt-0.5 leading-tight">{formatRupiah(cukaiPaidNum * cukaiFinePrice)}</p>
                                                        <p className="text-[10px] text-[var(--danger-ink)] uppercase tracking-widest">{formatRupiah(cukaiFinePrice)} per lost stamp</p>
                                                    </div>
                                                )}
                                            </div>

                                            {agentData.todaysSamplings && agentData.todaysSamplings.length > 0 && (
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-[var(--ink-dim)] uppercase tracking-widest mb-2 flex items-center gap-1"><Package size={14}/> Today's Deployments</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {agentData.todaysSamplings.map((sample, idx) => {
                                                            const sp = sample.sticksPerPack || 16;
                                                            const physicalBks = Math.floor(sample.qty || 0);
                                                            const physicalBtg = Math.round(((sample.qty || 0) - physicalBks) * sp);
                                                            let displayQty = '';
                                                            if (physicalBks > 0) displayQty += `${physicalBks} Bks `;
                                                            if (physicalBtg > 0) displayQty += `${physicalBtg} Btg`;

                                                            return (
                                                                /* was a gold plate carrying gold ink — the same gold-on-gold as the
                                                                   panel above it. A deployment record needs no colour at all. */
                                                                <span key={`cukai-${idx}`} className="text-[11px] bg-[var(--inset)] text-[var(--ink-dim)] px-2 py-1 rounded-md border border-[var(--line)]">
                                                                    {sample.productName}: <strong className="font-mono tabular-nums text-[var(--ink)]">{displayQty.trim() || '0 Bks'}</strong>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {agentData.cukaiStatus === 'READY' && (
                                    <button 
                                        onClick={() => {
                                            /* ⚠️ CLAMPED AGAIN AT THE WRITE, not only in the input. The input clamp is
                                               what the agent sees; this is what reaches Firestore, and a submit that
                                               trusts its own UI is not a guard. `cukai` is the figure App.jsx:1906
                                               spends against the debt ledger. */
                                            const returned = Math.min(cukaiReturnedNum, cukaiOwed);
                                            const paid = Math.min(cukaiPaidNum, Math.max(0, cukaiOwed - returned));
                                            submit({
                                                cash: 0, transfer: 0,
                                                cukaiReturned: returned,
                                                cukaiPaid: paid,
                                                cukaiFine: paid * cukaiFinePrice,
                                                cukai: returned + paid,
                                                remainingStock: [], deployedSamples: agentData.todaysSamplings, reportType: 'CUKAI',
                                                agentId: effectiveId,
                                                agentName: resolveIdentityName()
                                            })
                                        }}
                                        disabled={cukaiOverCount || submitting || (cukaiReturnedNum === 0 && cukaiPaidNum === 0)}
                                        className={`w-full mt-6 py-4 rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-md transition-transform ${(cukaiOverCount || submitting || (cukaiReturnedNum === 0 && cukaiPaidNum === 0)) ? 'bg-[var(--inset)] text-[var(--ink-dim)] border border-[var(--line)] cursor-not-allowed' : 'bg-[var(--gold)] text-[var(--gold-ink)] border border-[var(--accent-edge)] active:scale-[.98]'} `}
                                    >
                                        <Upload size={18}/> {cukaiOverCount ? 'Too many — check the count' : 'Submit stamps & fines'}
                                    </button>
                                )}
                            </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ========================================= */}
            {/* ============ ADMIN VIEW ================= */}
            {/* ========================================= */}
            {viewMode === 'review' && isAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    
                    {/* LEFT: PENDING REPORTS */}
                    <div>
                        <h3 className="font-black text-[var(--ink)] uppercase tracking-widest flex items-center gap-2 mb-4"><AlertCircle className="text-[var(--accent-ink)]"/> Pending Verification ({pendingByAgent.length})</h3>
                        {pendingByAgent.length === 0 ? (
                            <div className="bg-black/20 border border-[var(--line)] p-8 rounded-2xl text-center text-[var(--ink-dim)] text-xs uppercase tracking-widest">No pending reports.</div>
                        ) : (() => {
                            /* the rank frames' CSS + the marble / violet filters, once for every card on the list */
                            const today = getLocalDayKey();
                            const seal = () => { if (sealing) return; setSealing(true); setTimeout(() => setSealing(false), EOD_SEAL_MS); };
                            return (
                                <div className="space-y-3 kpm-arrive">
                                    <style>{BORDER_KEYFRAMES}</style>
                                    <FrameFilters />
                                    {pendingByAgent.map((g) => { const man = motorists.find((m) => m.id === g.key); return (
                                        <PlayerCard key={g.key} group={g} motorist={man} career={career?.[g.key]}
                                            useCareerLedger={!!appSettings?.useCareerLedger} ranks={ranks} transactions={transactions} inventory={inventory} appSettings={appSettings}
                                            closed={dayTargets(customers, man?.name || g.agentName, today)} today={today}
                                            onApprove={onVerifyEOD} onReset={onResetEOD} onSealed={seal} />
                                    ); })}
                                </div>
                            );
                        })()}
                        {sealing && (
                            <div className="kpm-seal-stage" aria-hidden="true">
                                <i className="kpm-docket-scan"></i>
                                <i className="kpm-docket-seal">VERIFIED</i>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: EOD HISTORY LOG (4-Level Folder Structure) */}
                    <div>
                        <h3 className="font-black text-[var(--ink-dim)] uppercase tracking-widest flex items-center gap-2 mb-4"><CheckCircle size={18}/> EOD History Log</h3>
                        
                        <div className="space-y-3 pb-10 relative">
                            {Object.keys(structuredHistory).length === 0 ? (
                                <div className="text-center p-6 text-[var(--ink-dim)] text-[11px] uppercase tracking-widest border border-dashed border-[var(--line)] rounded-xl">No history logs found.</div>
                            ) : (() => {
                                /* the log drills like every folder in the app: place › salesman › month, then the nights */
                                const node = histPath.reduce((n, k) => (n && n[k]) || {}, structuredHistory);
                                const back = histPath.length > 0 && (
                                    <button type="button" onClick={() => setHistPath((p) => p.slice(0, -1))} className="mb-1 flex items-center gap-2 min-h-[44px] text-[var(--ink-dim)] text-xs font-bold uppercase tracking-widest"><ChevronRight className="rotate-180" size={16} /> {histPath[histPath.length - 1]}</button>
                                );
                                if (histPath.length < 3) {
                                    const L = HIST_LEVELS[histPath.length];
                                    return (<>{back}<div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 kpm-folders">
                                        {Object.keys(node).map((k) => (
                                            <FolderCard key={k} icon={<L.Icon size={22} />} onOpen={() => setHistPath((p) => [...p, k])} className={EOD_FOLDER}>
                                                <h3 className="font-bold text-[15px] lg:text-lg mb-1 truncate">{k}</h3>
                                                <p className="kpm-stamp text-[11px] lg:text-[10px] text-[var(--ink-dim)] uppercase tracking-widest font-bold">{L.count(node[k])}</p>
                                            </FolderCard>
                                        ))}
                                    </div></>);
                                }
                                const [location, empName, yearMonth] = histPath;
                                const monthKey = `${location}-${empName}-${yearMonth}`;
                                return (<>{back}<div className="bg-[var(--sunk)] border border-[var(--line)] rounded-xl overflow-hidden kpm-arrive">
                                                        <div className="bg-black/20">
                                                            {Object.keys(structuredHistory[location][empName][yearMonth]).map(fullDate => {
                                                                                const dateKey = `${monthKey}-${fullDate}`;
                                                                                return (
                                                                                <div key={dateKey}>
                                                                                    
                                                                                    {/* 📂 LEVEL 4: SPECIFIC DATE */}
                                                                                    <button 
                                                                                        onClick={() => toggleAccordion(setOpenDates, dateKey)}
                                                                                        className="w-full p-3 min-h-[44px] flex justify-between items-center hover:bg-[var(--raised)] transition-colors border-b border-[var(--line)]"
                                                                                    >
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Folder className="text-[var(--ink-dim)]" size={12}/>
                                                                                            <span className="font-bold text-[var(--ink-dim)] text-[10px] uppercase tracking-widest">{fullDate}</span>
                                                                                        </div>
                                                                                        <div className="text-[var(--ink-dim)]">{openDates.includes(dateKey) ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}</div>
                                                                                    </button>

                                                                                    {openDates.includes(dateKey) && (
                                                                                        <div className="p-3 space-y-3 bg-black/40">
                                                                                            {/* 📄 THE NIGHT AS ONE ROW. His 15:00: "put this become one history instead of 2 since both of them
                                                                                                approved together right" - cash & stock + pita cukai are ONE night (one panel per person, his 02:50 rule);
                                                                                                a BOUNTY (a fine paid) keeps its own row. Force Reset asks once and deletes the whole night. */}
                                                                                            {(() => {
                                                                                                const all = structuredHistory[location][empName][yearMonth][fullDate];
                                                                                                const night = all.filter(r => r.reportType !== 'BOUNTY');
                                                                                                const rows = [...(night.length ? [{ id: night.map(r => r.id).join('+'), kind: 'NIGHT', reports: night }] : []),
                                                                                                              ...all.filter(r => r.reportType === 'BOUNTY').map(r => ({ id: r.id, kind: 'BOUNTY', reports: [r] }))];
                                                                                                return rows.map(row => {
                                                                                                    const isBounty = row.kind === 'BOUNTY';
                                                                                                    const first = row.reports[0];
                                                                                                    const isExpanded = expandedReports.includes(row.id);
                                                                                                    const toggleExpand = () => setExpandedReports(prev => isExpanded ? prev.filter(id => id !== row.id) : [...prev, row.id]);
                                                                                                    const cashRep = row.reports.find(r => r.reportType === 'CASH_STOCK' || !r.reportType);
                                                                                                    const cukaiRep = row.reports.find(r => r.reportType === 'CUKAI' || (!r.reportType && Number(r.cukai) > 0));
                                                                                                    const money = row.reports.reduce((sum, r) => sum + (r.reportType === 'CUKAI' ? 0 : (Number(r.cash) || 0) + (Number(r.transfer) || 0)), 0);
                                                                                                    const stamps = cukaiRep ? (cukaiRep.cukaiReturned !== undefined ? cukaiRep.cukaiReturned : (cukaiRep.cukai || 0)) : 0;
                                                                                                    const stock = row.reports.flatMap(r => r.remainingStock || []);
                                                                                                    const damaged = row.reports.flatMap(r => r.damagedStockToReturn || []);
                                                                                                    const hasDamaged = damaged.length > 0;
                                                                                                    const earliest = Math.min(...row.reports.map(r => r.timestamp?.seconds || Infinity));
                                                                                                    const resetRow = async (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        if (!await confirmAction(`FORCE RESET ${isBounty ? 'this bounty payment' : 'the night of ' + fullDate} for ${first.agentName}? This deletes ${row.reports.length === 1 ? 'the report' : 'both reports'}; ${isBounty ? 'the debt comes back' : 'he submits again'}.`)) return;
                                                                                                        for (const r of row.reports) await onResetEOD(r, { confirmed: true });
                                                                                                    };
                                                                                                    return (
                                                                                                    <div key={row.id} onClick={toggleExpand} className={`bg-[var(--sunk)] border p-3 rounded-xl transition-colors shadow-sm cursor-pointer ${isBounty ? 'border-[var(--danger)] hover:border-[var(--danger)]' : 'border-[var(--line)] hover:border-[var(--line)]'} `}>
                                                                                                        <div className="flex justify-between items-center">
                                                                                                        <div>
                                                                                                            <h4 className="font-bold text-[var(--ink)] text-xs flex items-center gap-2">
                                                                                                                <span className={`w-2 h-2 rounded-full ${isBounty ? 'bg-[var(--danger)] animate-pulse' : 'bg-[var(--gold)]'}`}></span>
                                                                                                                {isBounty ? <span className="text-[var(--danger-ink)] tracking-widest">Bounty Cleared</span> : 'EOD Night'}
                                                                                                                {/* a warning KEEPS its gold plate — but wears --gold-ink on it, not --accent-ink, which is the gold itself */}
                                                                                                                {hasDamaged && <span className="text-[11px] bg-[var(--gold)] text-[var(--gold-ink)] border border-[var(--accent-edge)] px-1.5 py-0.5 rounded uppercase tracking-widest">Damaged</span>}
                                                                                                                <ChevronDown size={10} className={`text-[var(--ink-dim)] transition-transform ${isExpanded ? 'rotate-180' : ''} `}/>
                                                                                                            </h4>
                                                                                                            <p className="text-[11px] text-[var(--ink-dim)] flex items-center gap-1 mt-1 font-mono">
                                                                                                                <Clock size={10}/>
                                                                                                                {Number.isFinite(earliest) ? new Date(earliest * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time'}
                                                                                                                {!isBounty && <span className="ml-2 uppercase tracking-widest">{[cashRep && 'cash & stock', cukaiRep && 'pita cukai'].filter(Boolean).join(' · ')}</span>}
                                                                                                            </p>
                                                                                                        </div>
                                                                                                        <div className="text-right flex flex-col items-end">
                                                                                                            {isBounty
                                                                                                                ? <p className="text-xs font-black text-[var(--danger-ink)]">{formatRupiah(first.cash)}</p>
                                                                                                                : <>
                                                                                                                    {cashRep && <p className="text-xs font-black text-[var(--ink-dim)]">{formatRupiah(money)}</p>}
                                                                                                                    {cukaiRep && (
                                                                                                                        <p className="text-xs font-black text-[var(--accent-ink)]">
                                                                                                                            {stamps} Pcs
                                                                                                                            {cukaiRep.cukaiPaid > 0 && <span className="text-[var(--danger-ink)] ml-1">(+{cukaiRep.cukaiPaid} Paid)</span>}
                                                                                                                        </p>
                                                                                                                    )}
                                                                                                                </>}
                                                                                                            <button
                                                                                                                onClick={resetRow}
                                                                                                                className="text-[11px] flex items-center gap-1 bg-[var(--danger-well)] hover:bg-[var(--danger)] text-[var(--danger-ink)] hover:text-[var(--gold-ink)] px-2 py-1 rounded border border-[var(--danger)] transition-all active:scale-95 uppercase font-bold mt-2"
                                                                                                            >
                                                                                                                <XCircle size={10}/> Force Reset
                                                                                                            </button>
                                                                                                        </div>
                                                                                                        </div>
                                                                                            
                                                                                                        {/* 🚀 the full breakdown of the night, only rendered when the row is clicked open */}
                                                                                                        {isExpanded && (
                                                                                                            <div className="mt-3 pt-3 border-t border-[var(--line)] space-y-2" onClick={(e) => e.stopPropagation()}>
                                                                                                                {stock.length > 0 && (
                                                                                                                    <div>
                                                                                                                        <p className="text-[11px] font-bold text-[var(--ink-dim)] uppercase tracking-widest mb-1">Healthy Stock Returned</p>
                                                                                                                        {stock.map((item, idx) => (
                                                                                                                            <p key={idx} className="text-[10px] text-[var(--ink-dim)] flex justify-between"><span>{item.name}</span><span className="font-bold">{item.qty} {item.unit}</span></p>
                                                                                                                        ))}
                                                                                                                    </div>
                                                                                                                )}
                                                                                                                {hasDamaged && (
                                                                                                                    <div>
                                                                                                                        <p className="text-[11px] font-bold text-[var(--accent-ink)] uppercase tracking-widest mb-1">Damaged Goods Returned</p>
                                                                                                                        {damaged.map((item) => (
                                                                                                                            <p key={item.ticketId} className="text-[10px] text-[var(--ink-dim)] flex justify-between"><span>{item.name} <span className="text-[var(--accent-ink)] italic">({item.reason})</span></span><span className="font-bold text-[var(--accent-ink)]">{item.qty} {item.unit}</span></p>
                                                                                                                        ))}
                                                                                                                    </div>
                                                                                                                )}
                                                                                                                {cukaiRep && (
                                                                                                                    <div>
                                                                                                                        <p className="text-[11px] font-bold text-[var(--accent-ink)] uppercase tracking-widest mb-1">Pita Cukai Breakdown</p>
                                                                                                                        <p className="text-[10px] text-[var(--ink-dim)] flex justify-between"><span>Physical Stamps Returned</span><span className="font-bold text-[var(--accent-ink)]">{stamps} Pcs</span></p>
                                                                                                                        {cukaiRep.cukaiPaid > 0 && (
                                                                                                                            <p className="text-[10px] text-[var(--ink-dim)] flex justify-between"><span>Lost, Paid as Fine</span><span className="font-bold text-[var(--danger-ink)]">{cukaiRep.cukaiPaid} Pcs ({formatRupiah(cukaiRep.cukaiFine || 0)})</span></p>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                )}
                                                                                                                {isBounty && (
                                                                                                                    <div>
                                                                                                                        <p className="text-[11px] font-bold text-[var(--danger-ink)] uppercase tracking-widest mb-1">Bounty Details</p>
                                                                                                                        <p className="text-[10px] text-[var(--ink-dim)] flex justify-between"><span>Penalty Item{first.penaltyKeys?.length === 1 ? '' : 's'} Cleared</span><span className="font-bold text-[var(--danger-ink)]">{first.penaltyKeys?.length || 0}</span></p>
                                                                                                                        <p className="text-[10px] text-[var(--ink-dim)] flex justify-between"><span>Total Paid</span><span className="font-bold text-[var(--danger-ink)]">{formatRupiah(first.cash)}</span></p>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                                {!stock.length && !hasDamaged && !cukaiRep && !isBounty && (
                                                                                                                    <p className="text-[10px] text-[var(--ink-dim)] italic">No itemized data for this entry.</p>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    );
                                                                                                });
                                                                                            })()}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                            )})}
                                                        </div>
                                </div></>);
                            })()}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default EODReconciliationView;