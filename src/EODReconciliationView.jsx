import React, { useMemo, useState, useEffect } from 'react';
import { ShieldCheck, Wallet, Truck, CheckCircle, Upload, AlertCircle, Clock, DollarSign, Package, XCircle, Tag, ChevronDown, ChevronRight, MapPin, User, Calendar, Folder, Target, BadgeDollarSign, ShieldAlert } from 'lucide-react';
import { formatRupiah, getLocalDayKey, storeKey, shortStockRows } from './utils/helpers';
import { confirmAction } from './components/ConfirmGate.jsx';
import EODAgentFlow from './components/EODAgentFlow.jsx';

/* Expected beside counted, with the gap named. A lone figure could never look wrong - the admin
   was approving a number he had nothing to compare it against, which is the whole reason the
   count exists. Reports from before the count carry no expected value, so they keep the single
   figure they were submitted with. Stacked on a phone, three columns on a desk; the type never
   shrinks to fit. */
const MoneyLine = ({ icon, label, expected, counted }) => {
    const has = expected !== undefined && expected !== null;
    const gap = Number(counted || 0) - Number(expected || 0);
    const gapInk = gap < 0 ? 'text-[var(--danger-ink)]' : 'text-[var(--ink-dim)]';
    const cell = 'text-[10px] font-bold text-[var(--ink-dim)] uppercase tracking-widest';

    return (
        <div className="bg-black/40 p-3 rounded-lg border border-[var(--line)]">
            <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[var(--ink-dim)] uppercase tracking-widest flex items-center gap-2">{icon} {label}</span>
                {!has && <span className="text-xl font-black text-[var(--ink-dim)]">{formatRupiah(counted)}</span>}
            </div>
            {has && (
                <div className="mt-2 space-y-1 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-2 sm:text-center tabular-nums">
                    <div className="flex justify-between items-baseline sm:block">
                        <p className={cell}>Expected</p>
                        <p className="text-sm font-black text-[var(--ink-dim)]">{formatRupiah(expected)}</p>
                    </div>
                    <div className="flex justify-between items-baseline sm:block">
                        <p className={cell}>Counted</p>
                        <p className="text-sm font-black text-[var(--ink)]">{formatRupiah(counted)}</p>
                    </div>
                    <div className="flex justify-between items-baseline sm:block">
                        <p className={`${cell} ${gap < 0 ? 'text-[var(--danger-ink)]' : ''}`}>{gap < 0 ? 'Short by' : gap > 0 ? 'Over by' : 'Matches'}</p>
                        <p className={`text-sm font-black ${gapInk}`}>{gap === 0 ? '\u2014' : formatRupiah(Math.abs(gap))}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const EODReconciliationView = ({ samplings = [], transactions = [], inventory = [], agentCanvas = [], agentProfileId, motorists = [], eodReports = [], user, appSettings, onSubmitEOD, onVerifyEOD, onResetEOD, isAdmin }) => {
    
    // 🚀 VIEW & IDENTITY STATES
    const [viewMode, setViewMode] = useState(isAdmin ? 'review' : 'submit');
    
    // 🚀 THE FIX: Removed the redundant default. Forces Admin to actively select an identity.
    const [adminSetoranId, setAdminSetoranId] = useState(''); 

    // 🚀 DYNAMIC ID ENGINE
    const effectiveId = isAdmin ? adminSetoranId : agentProfileId;
    
    const [cukaiReturnedInput, setCukaiReturnedInput] = useState("");
    const [cukaiPaidInput, setCukaiPaidInput] = useState("");
    const cukaiFinePrice = appSettings?.cukaiFinePrice || 5000;

    const [openLocations, setOpenLocations] = useState([]);
    const [openAgents, setOpenAgents] = useState([]);
    const [openMonths, setOpenMonths] = useState([]);
    const [openDates, setOpenDates] = useState([]);
    const [expandedReports, setExpandedReports] = useState([]);

    const toggleAccordion = (setter, key) => {
        setter(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    // --- 🚀 BOUNTY & PENALTY INTERCEPTOR ---
    const agentBountyData = useMemo(() => {
        if (!effectiveId) return { total: 0, keys: [], isPending: false };
        const agentProfile = motorists.find(m => m.id === effectiveId) || {};
        const cDebts = agentProfile.cukaiDebts || {};
        
        let total = 0;
        let keys = [];
        for (let [pid, val] of Object.entries(cDebts)) {
            // 🚀 THE FIX: Removed the "val > 0" blindspot. It will now catch Rp 0 fines!
            if (pid.startsWith('PENALTY_')) {
                total += (val || 0);
                keys.push(pid);
            }
        }
        
        const todaysReports = eodReports.filter(r => {
            if (r.agentId !== effectiveId) return false;
            const rDate = r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000) : (r.timestamp ? new Date(r.timestamp) : new Date());
            return rDate.toDateString() === new Date().toDateString();
        });
        const pendingBounty = todaysReports.find(r => r.status === 'PENDING' && r.reportType === 'BOUNTY');

        return { total, keys, isPending: !!pendingBounty };
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

        const cashStatus = (pendingCash || legacyPending) ? 'PENDING' : (verifiedCash || legacyVerified) ? 'VERIFIED' : 'READY';
        const cukaiStatus = (pendingCukai || legacyPending) ? 'PENDING' : (verifiedCukai || legacyVerified) ? 'VERIFIED' : 'READY';

        return { expectedCash, expectedTransfer, expectedCukai, activeStock: resolvedCanvas, damagedItemsToReturn, todaysSamplings, cashStatus, cukaiStatus, storesServed, titipCollected, itemsBks, cukaiRemaining: expectedCukai, cashSources, transferSources };
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
                    <p className="text-[10px] text-[var(--ink-dim)] uppercase tracking-widest mt-2">End of Day Reconciliation & Vault Return</p>
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
                                                            onSubmitEOD({ 
                                                                cash: agentBountyData.total, 
                                                                transfer: 0, cukai: 0, 
                                                                reportType: 'BOUNTY', 
                                                                penaltyKeys: agentBountyData.keys,
                                                                agentId: effectiveId,
                                                                agentName: resolveIdentityName()
                                                            });
                                                        }
                                                    }}
                                                    className="w-full md:w-auto px-10 py-4 bg-[var(--danger)] hover:bg-[var(--danger)] text-[var(--gold-ink)] rounded-xl font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(220,38,38,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3"
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
                                            <p className="text-[10px] text-[var(--ink-dim)] uppercase tracking-widest text-center">Hand envelope to Admin.</p>
                                        </div>
                                    ) : agentData.cashStatus === 'VERIFIED' ? (
                                        <div className="flex flex-col items-center justify-center h-full py-10 opacity-70">
                                            <CheckCircle className="text-[var(--ink-dim)] mb-4" size={40}/>
                                            <h3 className="text-lg font-black text-[var(--ink-dim)] uppercase tracking-widest mb-1">Shift Closed</h3>
                                            <p className="text-[10px] text-[var(--ink-dim)] uppercase tracking-widest text-center">Cash & Stock successfully verified.</p>
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
                                        <EODAgentFlow
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

                                                onSubmitEOD({
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
                                                });

                                                if (agentData.cukaiStatus === 'READY') {
                                                    onSubmitEOD({
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
                                                    });
                                                }
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
                                            onSubmitEOD({
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
                                        disabled={cukaiOverCount || (cukaiReturnedNum === 0 && cukaiPaidNum === 0)}
                                        className={`w-full mt-6 py-4 rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-md transition-transform ${(cukaiOverCount || (cukaiReturnedNum === 0 && cukaiPaidNum === 0)) ? 'bg-[var(--inset)] text-[var(--ink-dim)] border border-[var(--line)] cursor-not-allowed' : 'bg-[var(--gold)] text-[var(--gold-ink)] border border-[var(--accent-edge)] active:scale-[.98]'} `}
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
                        <h3 className="font-black text-[var(--ink)] uppercase tracking-widest flex items-center gap-2 mb-4"><AlertCircle className="text-[var(--accent-ink)]"/> Pending Verification ({pendingReports.length})</h3>
                        <div className="space-y-4">
                            {pendingReports.length === 0 ? (
                                <div className="bg-black/20 border border-[var(--line)] p-8 rounded-2xl text-center text-[var(--ink-dim)] text-xs uppercase tracking-widest">No pending reports.</div>
                            ) : pendingReports.map(report => {
                                /* A report with no countStatus predates the count entirely.
                                   That is CLEAN - history is never painted as disputed. */
                                const disputed = report.countStatus === 'DISPUTED';
                                /* The same rule App.jsx mints with, so the rupiah named here is
                                   the rupiah he will actually owe. Floored separately: extra
                                   cash does not pay off a missing transfer. */
                                const moneyShort = Math.max(0, -Number(report.cashVariance || 0))
                                                 + Math.max(0, -Number(report.transferVariance || 0));
                                const shortRows = shortStockRows(report.expectedStock, report.remainingStock);

                                return (
                                <div key={report.id} className={`bg-black/40 border rounded-2xl overflow-hidden shadow-lg ${disputed ? 'border-[var(--danger)] shadow-[0_0_20px_rgba(220,38,38,0.2)]' : report.reportType === 'BOUNTY' ? 'border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : report.reportType === 'CUKAI' ? 'border-[var(--accent-edge)]' : 'border-[var(--line)]'} `}>
                                    
                                    <div className={`p-4 flex justify-between items-center border-b border-[var(--line)] ${disputed ? 'bg-[var(--danger)] border-[var(--danger)]' : report.reportType === 'BOUNTY' ? 'bg-[var(--danger)] border-[var(--danger)]' : report.reportType === 'CUKAI' ? 'bg-[var(--gold)] border-[var(--accent-edge)]' : 'bg-[var(--gold)] border-[var(--line)]'} `}>
                                        <div>
                                            <h4 className={`font-black text-lg ${(disputed || report.reportType === 'BOUNTY') ? 'text-[var(--danger-ink)]' : 'text-[var(--ink)]'} `}>{report.agentName}</h4>
                                            <p className="text-[10px] text-[var(--ink-dim)]">
                                                {report.timestamp?.seconds ? new Date(report.timestamp.seconds * 1000).toLocaleTimeString() : ''}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {report.reportType === 'CASH_STOCK' && <span className="bg-[var(--gold)] text-[var(--gold-ink)] text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-md">CASH & STOCK</span>}
                                            {report.reportType === 'CUKAI' && <span className="bg-[var(--gold)] text-[var(--gold-ink)] text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-md">PITA CUKAI ONLY</span>}
                                            {report.reportType === 'BOUNTY' && <span className="bg-[var(--danger)] text-[var(--gold-ink)] text-[11px] font-black px-3 py-1 rounded uppercase tracking-widest shadow-md flex items-center gap-1"><AlertCircle size={10}/> BOUNTY CLEARANCE</span>}
                                            {!report.reportType && <span className="bg-[var(--gold)] text-[var(--gold-ink)] text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-md">COMBINED REPORT</span>}
                                            {disputed && <span className="bg-[var(--danger-well)] text-[var(--danger-ink)] text-[11px] font-black px-3 py-1 rounded uppercase tracking-widest shadow-md flex items-center gap-1"><AlertCircle size={10}/> SHORT COUNT</span>}
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        
                                        {/* The count came up short. Approving is allowed - Aldi's
                                            ruling - it just is not silent about what it does. */}
                                        {disputed && (
                                            <div className="bg-[var(--danger-well)] border border-[var(--danger)] p-4 rounded-xl">
                                                <p className="text-[10px] font-bold text-[var(--danger-ink)] uppercase tracking-widest mb-1 flex items-center gap-1"><AlertCircle size={14}/> He Counted Less Than Expected</p>
                                                {moneyShort > 0 ? (
                                                    <p className="text-[11px] text-[var(--danger-ink)] leading-relaxed">
                                                        Approving records <strong className="font-black">{formatRupiah(moneyShort)}</strong> as a bounty on {report.agentName}. He can repay it from his own EOD screen.
                                                    </p>
                                                ) : (
                                                    <p className="text-[11px] text-[var(--danger-ink)] leading-relaxed">
                                                        The money matches. The shortfall is goods, listed below, and is not turned into a bounty.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* 🚀 ADMIN VIEW: BOUNTY PAYMENT */}
                                        {report.reportType === 'BOUNTY' && (
                                            <div className="bg-[var(--danger-well)] border border-[var(--danger)] p-4 rounded-xl text-center">
                                                <p className="text-[10px] font-bold text-[var(--danger-ink)] uppercase tracking-widest mb-2 flex items-center justify-center gap-1"><BadgeDollarSign size={14}/> Cash Handover Amount</p>
                                                <p className="text-3xl font-black text-[var(--danger-ink)] font-mono">{formatRupiah(report.cash)}</p>
                                                <p className="text-[11px] text-[var(--ink-dim)] uppercase tracking-widest mt-2">Verify physical cash received to wipe liability.</p>
                                            </div>
                                        )}

                                        {/* OPTIONALLY HIDE CASH/STOCK IF IT IS A CUKAI OR BOUNTY REPORT */}
                                        {(report.reportType === 'CASH_STOCK' || !report.reportType) && (
                                            <>
                                                <MoneyLine icon={<DollarSign size={14}/>} label="Physical Cash"
                                                           expected={report.expectedCash} counted={report.cash} />
                                                <MoneyLine icon={<Wallet size={14}/>} label="Digital Transfer"
                                                           expected={report.expectedTransfer} counted={report.transfer} />
                                                <div className="pt-2">
                                                    <p className="text-[10px] font-bold text-[var(--ink-dim)] uppercase tracking-widest mb-2 flex items-center gap-1"><Package size={12}/> Inventory to Vault</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {report.remainingStock && report.remainingStock.length > 0 ? report.remainingStock.map((item, idx) => {
                                                            const productInfo = inventory?.find(p => p.id === item.productId) || {};
                                                            let mult = 1;
                                                            if (item.unit === 'Slop') mult = productInfo.packsPerSlop || 10;
                                                            if (item.unit === 'Bal') mult = (productInfo.slopsPerBal || 20) * (productInfo.packsPerSlop || 10);
                                                            if (item.unit === 'Karton') mult = (productInfo.balsPerCarton || 4) * (productInfo.slopsPerBal || 20) * (productInfo.packsPerSlop || 10);
                                                            const totalBksDecimal = item.qty * mult;
                                                            const sp = productInfo.sticksPerPack || 16;
                                                            const physicalBks = Math.floor(totalBksDecimal);
                                                            const physicalBtg = Math.round((totalBksDecimal - physicalBks) * sp);
                                                            let displayQty = '';
                                                            if (physicalBks > 0) displayQty += `${physicalBks} Bks `;
                                                            if (physicalBtg > 0) displayQty += `${physicalBtg} Btg`;

                                                            return (
                                                                <span key={idx} className="text-[10px] bg-[var(--raised)] text-[var(--ink-dim)] px-2 py-1 rounded border border-[var(--line)]">
                                                                    {item.name}: <strong className="text-[var(--ink-dim)]">{displayQty.trim() || '0 Bks'}</strong>
                                                                </span>
                                                            );
                                                        }) : <span className="text-[10px] text-[var(--ink-dim)] italic">No stock to return.</span>}
                                                    </div>
                                                </div>

                                                {/* One goods total hides a one-product shortfall - Aldi's
                                                    rule, and the reason the goods card counts line by line. */}
                                                {shortRows.length > 0 && (
                                                    <div className="pt-3">
                                                        <p className="text-[10px] font-bold text-[var(--danger-ink)] uppercase tracking-widest mb-2 flex items-center gap-1"><AlertCircle size={12}/> Short on Return ({shortRows.length})</p>
                                                        <div className="space-y-1">
                                                            {shortRows.map(row => (
                                                                <div key={row.productId} className="flex justify-between items-center gap-2 text-[10px] bg-[var(--danger-well)] border border-[var(--danger)] px-2 py-1.5 rounded">
                                                                    <span className="text-[var(--danger-ink)]">{row.name}</span>
                                                                    <strong className="text-[var(--danger-ink)] tabular-nums whitespace-nowrap">{row.counted} of {row.expected} {row.unit} &middot; short {row.short}</strong>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 🚀 NEW: DAMAGED GOODS — was missing from this review screen entirely */}
                                                <div className="pt-3">
                                                    <p className="text-[10px] font-bold text-[var(--accent-ink)] uppercase tracking-widest mb-2 flex items-center gap-1"><ShieldAlert size={12}/> Damaged Goods to Vault</p>
                                                    <div className="space-y-1">
                                                        {report.damagedStockToReturn && report.damagedStockToReturn.length > 0 ? report.damagedStockToReturn.map((item) => (
                                                            <div key={item.ticketId} className="flex justify-between items-center text-[10px] bg-[var(--gold)] border border-[var(--accent-edge)] px-2 py-1.5 rounded">
                                                                <span className="text-[var(--ink-dim)]">{item.name} <span className="text-[var(--accent-ink)] italic">({item.reason})</span></span>
                                                                <strong className="text-[var(--accent-ink)]">{item.qty} {item.unit}</strong>
                                                            </div>
                                                        )) : <span className="text-[10px] text-[var(--ink-dim)] italic">No damaged goods to return.</span>}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* 🚀 ADMIN CUKAI BREAKDOWN & FINE VERIFIER */}
                                        {(report.reportType === 'CUKAI' || !report.reportType) && (
                                            <>
                                                <div className="flex justify-between items-center bg-[var(--gold)] p-3 rounded-lg border border-[var(--accent-edge)] mt-4">
                                                    <span className="text-xs font-bold text-[var(--accent-ink)] uppercase tracking-widest flex items-center gap-2"><Tag size={14}/> Physical Stamps Returned</span>
                                                    <span className="text-xl font-black text-[var(--accent-ink)]">{report.cukaiReturned !== undefined ? report.cukaiReturned : (report.cukai || 0)} Pcs</span>
                                                </div>

                                                {(report.cukaiPaid > 0) && (
                                                    <div className="flex justify-between items-center bg-[var(--danger-well)] p-3 rounded-lg border border-[var(--danger)] mt-2">
                                                        <div>
                                                            <span className="text-xs font-bold text-[var(--danger-ink)] uppercase tracking-widest block flex items-center gap-1"><AlertCircle size={12}/> Lost Stamps Paid</span>
                                                            <span className="text-[11px] text-[var(--danger-ink)] font-mono mt-0.5">{report.cukaiPaid} Pcs × {formatRupiah(report.cukaiFine / report.cukaiPaid)}</span>
                                                        </div>
                                                        <span className="text-xl font-black text-[var(--danger-ink)]">+{formatRupiah(report.cukaiFine)}</span>
                                                    </div>
                                                )}

                                                {report.deployedSamples && report.deployedSamples.length > 0 && (
                                                    <div className="pt-2 border-t border-[var(--line)] mt-3">
                                                        <p className="text-[10px] font-bold text-[var(--accent-ink)] uppercase tracking-widest mb-2 flex items-center gap-1"><Package size={12}/> Today's Deployments</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {report.deployedSamples.map((sample, idx) => {
                                                                const sp = sample.sticksPerPack || 16;
                                                                const physicalBks = Math.floor(sample.qty || 0);
                                                                const physicalBtg = Math.round(((sample.qty || 0) - physicalBks) * sp);
                                                                let displayQty = '';
                                                                if (physicalBks > 0) displayQty += `${physicalBks} Bks `;
                                                                if (physicalBtg > 0) displayQty += `${physicalBtg} Btg`;

                                                                return (
                                                                    <span key={`cukai-${idx}`} className="text-[11px] bg-[var(--inset)] text-[var(--ink-dim)] px-2 py-1 rounded-md border border-[var(--line)]">
                                                                        {sample.productName}: <strong className="text-[var(--accent-ink)]">{displayQty.trim() || '0 Bks'}</strong>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div className="flex gap-2 mt-4 pt-2">
                                            <button 
                                                onClick={() => onVerifyEOD(report)}
                                                className={`flex-1 py-3 text-[var(--ink)] rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95 ${disputed ? 'bg-red-700 hover:bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : report.reportType === 'BOUNTY' ? 'bg-red-700 hover:bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : report.reportType === 'CUKAI' ? 'bg-orange-600 hover:bg-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.3)]' : 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'} `}
                                            >
                                                <CheckCircle size={18}/> {disputed ? 'Approve Short Count' : 'Verify'}
                                            </button>
                                            
                                            <button 
                                                onClick={() => onResetEOD(report)}
                                                className="flex-1 py-3 bg-[var(--danger-well)] hover:bg-[var(--danger)] border border-[var(--danger)] text-[var(--danger-ink)] hover:text-[var(--gold-ink)] rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95"
                                            >
                                                <XCircle size={18}/> Reject / Reset
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT: EOD HISTORY LOG (4-Level Folder Structure) */}
                    <div>
                        <h3 className="font-black text-[var(--ink-dim)] uppercase tracking-widest flex items-center gap-2 mb-4"><CheckCircle size={18}/> EOD History Log</h3>
                        
                        <div className="space-y-3 h-[700px] overflow-y-auto custom-scrollbar pr-2 pb-10 relative">
                            {Object.keys(structuredHistory).length === 0 ? (
                                <div className="text-center p-6 text-[var(--ink-dim)] text-[10px] uppercase tracking-widest border border-dashed border-[var(--line)] rounded-xl">No history logs found.</div>
                            ) : Object.keys(structuredHistory).map(location => (
                                <div key={location} className="bg-[var(--sunk)] border border-[var(--line)] rounded-xl overflow-hidden shadow-sm">
                                    
                                    {/* 📍 LEVEL 1: LOCATION */}
                                    <button 
                                        onClick={() => toggleAccordion(setOpenLocations, location)}
                                        className="w-full p-4 flex justify-between items-center hover:bg-[var(--raised)] transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-[var(--gold)] rounded-lg border border-[var(--line)]"><MapPin className="text-[var(--ink-dim)]" size={16}/></div>
                                            <span className="font-black text-[var(--ink)] uppercase tracking-widest text-sm">{location}</span>
                                        </div>
                                        <div className="text-[var(--ink-dim)]">{openLocations.includes(location) ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}</div>
                                    </button>

                                    {openLocations.includes(location) && (
                                        <div className="border-t border-[var(--line)] bg-black/40">
                                            {Object.keys(structuredHistory[location]).map(empName => {
                                                const empKey = `${location}-${empName}`;
                                                return (
                                                <div key={empKey} className="border-b border-[var(--line)] last:border-0">
                                                    
                                                    {/* 👤 LEVEL 2: EMPLOYEE */}
                                                    <button 
                                                        onClick={() => toggleAccordion(setOpenAgents, empKey)}
                                                        className="w-full p-3 pl-6 flex justify-between items-center hover:bg-[var(--raised)] transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <User className="text-[var(--ink-dim)]" size={14}/>
                                                            <span className="font-bold text-[var(--ink-dim)] text-xs uppercase tracking-wider">{empName}</span>
                                                        </div>
                                                        <div className="text-[var(--ink-dim)]">{openAgents.includes(empKey) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</div>
                                                    </button>

                                                    {openAgents.includes(empKey) && (
                                                        <div className="border-t border-[var(--line)] bg-[var(--sunk)]">
                                                            {Object.keys(structuredHistory[location][empName]).map(yearMonth => {
                                                                const monthKey = `${empKey}-${yearMonth}`;
                                                                return (
                                                                <div key={monthKey}>
                                                                    
                                                                    {/* 📅 LEVEL 3: YEAR & MONTH */}
                                                                    <button 
                                                                        onClick={() => toggleAccordion(setOpenMonths, monthKey)}
                                                                        className="w-full p-2 pl-10 flex justify-between items-center hover:bg-[var(--raised)] transition-colors border-b border-[var(--line)]"
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <Calendar className="text-[var(--accent-ink)]" size={12}/>
                                                                            <span className="font-bold text-[var(--ink-dim)] text-[10px] uppercase tracking-widest">{yearMonth}</span>
                                                                        </div>
                                                                        <div className="text-[var(--ink-dim)]">{openMonths.includes(monthKey) ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}</div>
                                                                    </button>

                                                                    {openMonths.includes(monthKey) && (
                                                                        <div className="bg-black/20">
                                                                            {Object.keys(structuredHistory[location][empName][yearMonth]).map(fullDate => {
                                                                                const dateKey = `${monthKey}-${fullDate}`;
                                                                                return (
                                                                                <div key={dateKey}>
                                                                                    
                                                                                    {/* 📂 LEVEL 4: SPECIFIC DATE */}
                                                                                    <button 
                                                                                        onClick={() => toggleAccordion(setOpenDates, dateKey)}
                                                                                        className="w-full p-2 pl-14 flex justify-between items-center hover:bg-[var(--raised)] transition-colors border-b border-[var(--line)]"
                                                                                    >
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Folder className="text-[var(--ink-dim)]" size={12}/>
                                                                                            <span className="font-bold text-[var(--ink-dim)] text-[10px] uppercase tracking-widest">{fullDate}</span>
                                                                                        </div>
                                                                                        <div className="text-[var(--ink-dim)]">{openDates.includes(dateKey) ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}</div>
                                                                                    </button>

                                                                                    {openDates.includes(dateKey) && (
                                                                                        <div className="p-3 pl-16 space-y-3 bg-black/40 shadow-inner">
                                                                                            {/* 📄 THE ACTUAL REPORTS */}
                                                                                            {structuredHistory[location][empName][yearMonth][fullDate].map(report => {
                                                                                                const isExpanded = expandedReports.includes(report.id);
                                                                                                const hasDamaged = report.damagedStockToReturn && report.damagedStockToReturn.length > 0;
                                                                                                const toggleExpand = () => setExpandedReports(prev => isExpanded ? prev.filter(id => id !== report.id) : [...prev, report.id]);
                                                                                                return (
                                                                                                <div key={report.id} onClick={toggleExpand} className={`bg-[var(--sunk)] border p-3 rounded-xl transition-colors shadow-sm cursor-pointer border-[var(--line)] ${report.reportType === 'BOUNTY' ? 'border-[var(--danger)] hover:border-[var(--danger)]' : 'border-[var(--line)] hover:border-[var(--line)]'} `}>
                                                                                                    <div className="flex justify-between items-center">
                                                                                                    <div>
                                                                                                        <h4 className="font-bold text-[var(--ink)] text-xs flex items-center gap-2">
                                                                                                            {report.reportType === 'CASH_STOCK' && <span className="w-2 h-2 rounded-full bg-[var(--gold)]"></span>}
                                                                                                            {report.reportType === 'CUKAI' && <span className="w-2 h-2 rounded-full bg-[var(--gold)]"></span>}
                                                                                                            {report.reportType === 'BOUNTY' && <span className="w-2 h-2 rounded-full bg-[var(--danger)] animate-pulse"></span>}
                                                                                                            {!report.reportType && <span className="w-2 h-2 rounded-full bg-[var(--gold)]"></span>}
                                                                                                            {report.reportType === 'BOUNTY' ? <span className="text-[var(--danger-ink)] tracking-widest">Bounty Cleared</span> : report.reportType === 'CUKAI' ? 'Cukai Return' : 'EOD Cash/Stock'}
                                                                                                            {/* 🚀 NEW: quick hint badge, click the row for the full breakdown */}
                                                                                                            {/* a warning KEEPS its gold plate — but wears --gold-ink on it, not --accent-ink, which is the gold itself */}
                                                                                                            {hasDamaged && <span className="text-[11px] bg-[var(--gold)] text-[var(--gold-ink)] border border-[var(--accent-edge)] px-1.5 py-0.5 rounded uppercase tracking-widest">Damaged</span>}
                                                                                                            <ChevronDown size={10} className={`text-[var(--ink-dim)] transition-transform ${isExpanded ? 'rotate-180' : ''} `}/>
                                                                                                        </h4>
                                                                                                        <p className="text-[11px] text-[var(--ink-dim)] flex items-center gap-1 mt-1 font-mono">
                                                                                                            <Clock size={10}/> 
                                                                                                            {report.timestamp?.seconds ? new Date(report.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time'}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    <div className="text-right flex flex-col items-end">
                                                                                                        {(report.reportType === 'CASH_STOCK' || !report.reportType || report.reportType === 'BOUNTY') && <p className={`text-xs font-black ${report.reportType === 'BOUNTY' ? 'text-[var(--danger-ink)]' : 'text-[var(--ink-dim)]'} `}>{formatRupiah(report.cash)}</p>}
                                                                                                        {report.reportType === 'CUKAI' && (
                                                                                                            <p className="text-xs font-black text-[var(--accent-ink)]">
                                                                                                                {report.cukaiReturned !== undefined ? report.cukaiReturned : (report.cukai || 0)} Pcs
                                                                                                                {report.cukaiPaid > 0 && <span className="text-[var(--danger-ink)] ml-1">(+{report.cukaiPaid} Paid)</span>}
                                                                                                            </p>
                                                                                                        )}
                                                                                                        
                                                                                                        <button 
                                                                                                            onClick={(e) => { e.stopPropagation(); onResetEOD(report); }}
                                                                                                            className="text-[11px] flex items-center gap-1 bg-[var(--danger-well)] hover:bg-[var(--danger)] text-[var(--danger-ink)] hover:text-[var(--gold-ink)] px-2 py-1 rounded border border-[var(--danger)] transition-all active:scale-95 uppercase font-bold mt-2"
                                                                                                        >
                                                                                                            <XCircle size={10}/> Force Reset
                                                                                                        </button>
                                                                                                    </div>
                                                                                                    </div>

                                                                                                    {/* 🚀 NEW: full breakdown, only rendered when the row is clicked open */}
                                                                                                    {isExpanded && (
                                                                                                        <div className="mt-3 pt-3 border-t border-[var(--line)] space-y-2" onClick={(e) => e.stopPropagation()}>
                                                                                                            {report.remainingStock && report.remainingStock.length > 0 && (
                                                                                                                <div>
                                                                                                                    <p className="text-[11px] font-bold text-[var(--ink-dim)] uppercase tracking-widest mb-1">Healthy Stock Returned</p>
                                                                                                                    {report.remainingStock.map((item, idx) => (
                                                                                                                        <p key={idx} className="text-[10px] text-[var(--ink-dim)] flex justify-between"><span>{item.name}</span><span className="font-bold">{item.qty} {item.unit}</span></p>
                                                                                                                    ))}
                                                                                                                </div>
                                                                                                            )}
                                                                                                            {hasDamaged && (
                                                                                                                <div>
                                                                                                                    <p className="text-[11px] font-bold text-[var(--accent-ink)] uppercase tracking-widest mb-1">Damaged Goods Returned</p>
                                                                                                                    {report.damagedStockToReturn.map((item) => (
                                                                                                                        <p key={item.ticketId} className="text-[10px] text-[var(--ink-dim)] flex justify-between"><span>{item.name} <span className="text-[var(--accent-ink)] italic">({item.reason})</span></span><span className="font-bold text-[var(--accent-ink)]">{item.qty} {item.unit}</span></p>
                                                                                                                    ))}
                                                                                                                </div>
                                                                                                            )}
                                                                                                            {/* 🚀 FIX: Cukai never had expand content at all - now shows the real breakdown */}
                                                                                                            {report.reportType === 'CUKAI' && (
                                                                                                                <div>
                                                                                                                    <p className="text-[11px] font-bold text-[var(--accent-ink)] uppercase tracking-widest mb-1">Pita Cukai Breakdown</p>
                                                                                                                    <p className="text-[10px] text-[var(--ink-dim)] flex justify-between"><span>Physical Stamps Returned</span><span className="font-bold text-[var(--accent-ink)]">{report.cukaiReturned !== undefined ? report.cukaiReturned : (report.cukai || 0)} Pcs</span></p>
                                                                                                                    {report.cukaiPaid > 0 && (
                                                                                                                        <p className="text-[10px] text-[var(--ink-dim)] flex justify-between"><span>Lost, Paid as Fine</span><span className="font-bold text-[var(--danger-ink)]">{report.cukaiPaid} Pcs ({formatRupiah(report.cukaiFine || 0)})</span></p>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            )}
                                                                                                            {/* 🚀 FIX: report.penaltyDescription never existed - real fields are penaltyKeys and cash */}
                                                                                                            {report.reportType === 'BOUNTY' && (
                                                                                                                <div>
                                                                                                                    <p className="text-[11px] font-bold text-[var(--danger-ink)] uppercase tracking-widest mb-1">Bounty Details</p>
                                                                                                                    <p className="text-[10px] text-[var(--ink-dim)] flex justify-between"><span>Penalty Item{report.penaltyKeys?.length === 1 ? '' : 's'} Cleared</span><span className="font-bold text-[var(--danger-ink)]">{report.penaltyKeys?.length || 0}</span></p>
                                                                                                                    <p className="text-[10px] text-[var(--ink-dim)] flex justify-between"><span>Total Paid</span><span className="font-bold text-[var(--danger-ink)]">{formatRupiah(report.cash)}</span></p>
                                                                                                                </div>
                                                                                                            )}
                                                                                                            {!report.remainingStock?.length && !hasDamaged && report.reportType !== 'CUKAI' && report.reportType !== 'BOUNTY' && (
                                                                                                                <p className="text-[10px] text-[var(--ink-dim)] italic">No itemized data for this entry.</p>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )})}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )})}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )})}
                                                        </div>
                                                    )}
                                                </div>
                                            )})}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default EODReconciliationView;