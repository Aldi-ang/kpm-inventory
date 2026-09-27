import React, { useState, useEffect, useMemo } from 'react';
import { Package, Truck, AlertCircle, TrendingUp, Wallet, Coins, Receipt, Tag, AlertOctagon, ShieldAlert, User, ChevronDown } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import NixieCount from './components/NixieCount.jsx';
import LoadingBay from './components/LoadingBay.jsx';
import { damagedInVan } from './utils/vanBay';
import { isFleetManagementTier, canEditFleetRoster } from './config/permissions';
/* `getCurrentDate` is IMPORTED, not redefined. This file used to keep its own copy —
   `new Date().toISOString()`, the UTC one — so it stayed a day behind between midnight and 07:00
   WIB even after the shared helper was fixed. A second copy of a date rule is a second bug
   waiting for someone to fix only the first. */
import { formatRupiah, getCurrentDate, saleLines } from './utils/helpers';

// 🚀 ACCEPT 'samplings' PROP HERE
/* AUTO-FIT MONEY. Aldi, 2026-08-19, with a screenshot: the three IF SOLD figures ran into each
   other with no gap - "Rp90.000.000Rp79.125.000Rp77.625.000". Every one carried a fixed
   `text-sm md:text-xl`, and a third of a phone is not wide enough for twelve digits at that size.
   Sized from the formatted string's LENGTH rather than measured on screen: deterministic, no
   measure-then-resize loop, and length is the only thing that decides whether it fits. */
const Money = ({ value, className = '' }) => {
    const s = formatRupiah(value);
    const fit = s.length > 15 ? 'text-[10px] md:text-base'
              : s.length > 12 ? 'text-xs md:text-lg'
              :                 'text-sm md:text-xl';
    return <span className={`${fit} font-black tabular-nums whitespace-nowrap ${className}`}>{s}</span>;
};


const AgentInventoryView = ({ db, appId, userId, agentProfileId, inventory = [], transactions = [], samplings = [], user, userRole, motorists = [], previewing = null }) => {
    const [canvasItems, setCanvasItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [liveProfileData, setLiveProfileData] = useState(null);
    const [openTx, setOpenTx] = useState(null);   // the sale row opened to its lines
    
    // 🚀 NEW: QUARANTINE TOGGLE STATE
    const [viewMode, setViewMode] = useState('HEALTHY'); // 'HEALTHY' | 'QUARANTINE'
    /* THE PROJECTED VALUE BOX FOLDS ON THE PHONE. Aldi, 2026-09-18, board 2: "board 2 B that shows
       'after board 1' when pressed". Closed by default under lg (the three tier figures are read
       once at load time; Cash is read all day), always open on the desk — the same width-seeded
       state the Customers form uses. Pressing SHOW opens the three rows; the label flips to HIDE. */
    const [showProjected, setShowProjected] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

    // 🛡️ ARMOR-PLATED EMAIL ROUTER (Fixes Cache Ghosting & State Bleed)
    // 1. Sanitize the active Google login email to prevent space/case mismatch
    const activeEmail = String(user?.email || "").trim().toLowerCase();
    
    /* 🎭 THE EMAIL SWEEP IS OFF WHILE PREVIEWING, AND THAT IS THE WHOLE FIX.
       Aldi, 2026-09-08, wearing Tier 6: *"i login as t6 tes account and the agent inventory is
       still showing the t1 inventory but i cant do sales with that inventory tho"*.

       `previewIdentity` moves displayName, agentId and userRole onto the test account and
       deliberately leaves EMAIL alone - the UID is his real sign-in and pretending otherwise is the
       one lie that feature must not tell (src/config/povPreview.js). So while previewing, the email
       above is still HIS, this sweep found HIS OWN motorist record, and it ran BEFORE the agent id,
       so it won. The screen subscribed to the owner's van and showed the owner's cargo while the
       banner said Tier 6. The sale, one screen over, reads agentProfileId instead and correctly
       found the test van empty - which is why the stock was visible and unsellable at the same
       time. Two screens, two answers to "who am I".

       The sweep still runs for every REAL login, which is what it was built for: an agentProfileId
       that is stale or missing must not strand somebody on the wrong van. A preview is the one case
       where the id is the truth and the email is the stale half. */
    // 2. Aggressively sweep Fleet Roster for exact email match FIRST - real logins only
    const matchedByEmail = previewing ? null : motorists.find(m => 
        m.email && String(m.email).trim().toLowerCase() === activeEmail
    );
    
    // 3. Fallback to App Router ID only if email fails completely
    const safeAgentProfile = matchedByEmail || motorists.find(m => m.id === agentProfileId);

    // 4. Absolute True ID locks onto the correct profile
    const trueAgentId = safeAgentProfile?.id || agentProfileId;

    // 5. Dynamic Name generation entirely avoids React state-bleed across renders
    const agentName = liveProfileData?.name || safeAgentProfile?.name || user?.displayName || activeEmail.split('@')[0] || "Agent";

    useEffect(() => {
        if (!db || !appId || !userId || !trueAgentId) {
            /* CLEARED, NOT LEFT STANDING. This branch stops subscribing and used to return without
               touching state, so the previous agent's cargo stayed rendered under the new identity -
               the same wrong-van symptom reached by a different door. The docSnap-missing branch
               below already clears; this one was the gap. */
            setCanvasItems([]);
            setLiveProfileData(null);
            setIsLoading(false);
            return;
        }

        // 🎯 FORCE TARGET THE CORRECT VEHICLE
        const agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, trueAgentId);
        
        const unsub = onSnapshot(agentRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCanvasItems(Array.isArray(data.activeCanvas) ? data.activeCanvas : []);
                setLiveProfileData(data); // Safely store the whole object, wiping old ghost data
            } else {
                setCanvasItems([]);
                setLiveProfileData(null); // Instantly erase Boss ghosting
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Agent Sync Error:", error);
            setIsLoading(false); 
        });

        return () => unsub();
    }, [db, appId, userId, trueAgentId]);

    // --- CONVERSION ENGINE ---
    const calculateBks = (qty, unit) => {
        const numQty = Number(qty) || 0;
        let mult = 1;
        if (unit === 'Slop') mult = 10;
        if (unit === 'Bal') mult = 200;
        if (unit === 'Karton') mult = 800;
        return numQty * mult;
    };

    const totalBks = canvasItems.reduce((sum, item) => sum + calculateBks(item.qty, item.unit), 0);

    // --- FINANCIAL MATH ENGINE ---
    const todayDate = getCurrentDate();
    
    // 1. FILTER TODAY'S SALES FOR THIS AGENT EXACTLY (Upgraded to catch Retur)
    const todayTransactions = transactions.filter(t =>
        t.agentId === trueAgentId &&
        t.date === todayDate &&
        (t.type === 'SALE' || t.type === 'CONSIGNMENT_PAYMENT' || t.type === 'RETUR')
    );

    // 1.5 FILTER TODAY'S SAMPLES FOR THIS AGENT & FIX GHOST BUG
    const isMainVault = trueAgentId === userId; // Identifies if Tier 1 is looking at their own dashboard
    const todaySamplings = samplings.filter(s => {
        // 🚀 THE GHOST FIX: Tell the engine that 'VAULT' belongs to Tier 1
        const matchesAgent = isMainVault ? (s.sourceId === trueAgentId || s.sourceId === 'VAULT' || !s.sourceId) : (s.sourceId === trueAgentId);
        if (!matchesAgent) return false;
        
        // 🚀 TIMEZONE FIX: Compare the raw YYYY-MM-DD string to prevent Midnight drift
        return s.date === todayDate;
    });
    
    // 🚀 NEW: CROSS-PRODUCT CUKAI DEBT CALCULATOR
    const cukaiDebts = liveProfileData?.cukaiDebts || {};
    const legacyDebt = liveProfileData?.cukaiDebt || 0; // Backward compatibility
    
    let calcTotal = 0;
    let globalCredit = cukaiDebts['global_credit'] || 0;
    for (let [pid, val] of Object.entries(cukaiDebts)) {
        /* PENALTY_ keys share this map but hold RUPIAH, not stamps - EODReconciliationView.jsx
           and the payment engine in App.jsx both skip them; this third copy did not, so a
           Rp 200.000 bounty read as 200.000 stamps owed on the agent's own dashboard. */
        if (pid !== 'global_credit' && !pid.startsWith('PENALTY_') && val > 0) calcTotal += Math.ceil(val);
    }
    const totalCukaiOwed = Math.max(0, calcTotal + globalCredit + Math.ceil(legacyDebt));

    // 2. SUM TOTAL REVENUE & CALCULATE RETUR
    const totalRetur = todayTransactions.filter(t => t.type === 'RETUR').reduce((sum, t) => sum + Math.abs(t.total || 0), 0);
    const todayRevenue = todayTransactions.reduce((sum, t) => {
        // 🚀 SALESMAN DASHBOARD FIX: Deduct Retur cash so they don't pay for damaged goods
        if (t.type === 'RETUR') return sum - Math.abs(t.total || 0);
        return sum + (t.total || t.amountPaid || 0);
    }, 0);

    // 3. CALCULATE INVENTORY VALUE & MULTI-TIER POTENTIAL REVENUE
    let invValue = 0;
    let revEcer = 0;
    let revRetail = 0;
    let revGrosir = 0;

    canvasItems.forEach(item => {
        const bksQty = calculateBks(item.qty, item.unit);
        const productInfo = inventory.find(p => p.id === item.productId) || {};
        
        const cost = productInfo.priceDistributor || 0;
        const ecer = productInfo.priceEcer || 0;
        const retail = productInfo.priceRetail || 0;
        const grosir = productInfo.priceGrosir || 0;

        // FIXED MATH:
        // Inventory Value = Total Cost (Distributor Price * Bks)
        invValue += (bksQty * cost);
        
        // Projected Value = pure gross value at different tiers (labelled "IF SOLD" until 2026-08-19)
        revEcer += (bksQty * ecer);
        revRetail += (bksQty * retail);
        revGrosir += (bksQty * grosir);
    });

    // 🚀 NEW: EXTRACT QUARANTINED CARGO DIRECTLY FROM THE FORENSIC ROOT
    const quarantinedCargo = useMemo(() => {
        return todayTransactions
            // 🚀 FIX: Once EOD has verified and credited a ticket to the vault, stop showing it
            // here — otherwise it looks like unresolved work when it's actually already done.
            .filter(tx => tx.forensicData && tx.forensicData.quarantineCargo && !tx.forensicData.eodCredited)
            .flatMap(tx => {
                return tx.forensicData.quarantineCargo.map((item, index) => ({
                    id: `${tx.id || tx.transactionId || Math.random().toString()}-${index}`,
                    itemName: item.itemName || 'Unknown Asset',
                    qty: item.qty || 0,
                    returnReason: item.returnReason || 'Unclassified',
                    customerOrigin: tx.customerName || 'Walk-in / Unknown',
                    timestamp: tx.timestamp
                }));
            });
    }, [todayTransactions]);

    const quarantineCount = quarantinedCargo.reduce((sum, item) => sum + item.qty, 0);

    /* THE CHEST IS THE AGENT INVENTORY for a regional admin and above - his 2026-09-22 words, "agent chest is basically
       agent inventory for regional admin tier and above by default". His REGIONAL ADMIN is T4, id FLEET_CAPTAIN, so the
       set is T1-T4: isFleetManagementTier, never a literal list (a list is how FLEET_CAPTAIN gets dropped - the Fleet
       Captain Permission Gap). The salesman keeps the list below. The chest is the bay's own van chest (LoadingBay
       vanOnly); a drag writes the SAME vanLayout field Fleet & Roster writes, on the drop, through the fleet edit rule. */
    const seesChest = isFleetManagementTier(userRole);
    const saveLayout = async (cells) => {
        if (!canEditFleetRoster(userRole) || !trueAgentId) return false;
        try {
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/motorists`, trueAgentId), { vanLayout: cells });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    return (
        /* ONE SCROLL ON THE PHONE. Aldi, 2026-09-18, board 1 YES. This was `h-[850px]` at every
           width: inside the shell's 678 px scroller the page scrolled 188 px AND the list below
           scrolled in its own 366 px window — two thumbs for one screen. Under lg the box now
           takes its content height and the shell scrolls everything once; the desk keeps its
           pinned header over a scrolling list (`lg:h-…` + `lg:overflow-y-auto` below). */
        <div className="lg:h-[calc(100vh-120px)] flex flex-col max-w-5xl mx-auto animate-fade-in bg-ground font-sans border-x border-line-2 shadow-2xl overflow-hidden relative">

            {/* DYNAMIC FINANCIAL COMMAND BAR */}
            <div className="bg-panel border-b border-line-2 p-3 lg:p-4 flex flex-col justify-between items-start gap-3 lg:gap-4 shrink-0 relative z-10 shadow-md">
                
                {/* LEFT: AGENT IDENTITY */}
                <div className="flex items-center gap-3 shrink-0 w-full">
                    <div className="p-2.5 bg-ground rounded-none border border-line-2 shadow-inner">
                        <Truck className="text-gold" size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-black uppercase tracking-wide text-ink">MANIFEST <span className="text-ink-dim">· {agentName}</span></h1>
                    </div>
                </div>
                
                {/* RIGHT: THE FINANCIAL METRICS (MOBILE OPTIMIZED BLOCK LAYOUT) */}
                {/* the desk never splits this row beside the MANIFEST block (his board 2 = A, 2026-09-22): at xl the
                    65 % column gave four 149 px boxes and a 7-digit rupiah (152 px in his font) crossed into CASH */}
                <div className="flex flex-col gap-2 lg:gap-3 w-full lg:mt-2">
                    
                    {/* TOP ROW: Core Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                        <div className="bg-ground border border-line-2 rounded-none p-2 md:p-3 flex flex-col justify-center items-center text-center shadow-inner">
                            <span className="text-[11px] md:text-xs text-ink-dim font-bold uppercase tracking-widest flex items-center gap-1 mb-1"><Package size={12}/> Load</span>
                            <span className="text-base md:text-xl font-black text-gold">{new Intl.NumberFormat('id-ID').format(totalBks)} <span className="text-[11px] font-bold text-ink-dim">Bks</span></span>
                        </div>
                        
                        <div className="bg-ground border border-line-2 rounded-none p-2 md:p-3 flex flex-col justify-center items-center text-center shadow-inner">
                            <span className="text-[11px] md:text-xs text-ink-dim font-bold uppercase tracking-widest flex items-center gap-1 mb-1"><Wallet size={12}/> Modal</span>
                            <Money value={invValue} className="text-ink" />
                        </div>
                        
                        <div className="bg-panel border border-line-2 rounded-none p-2 md:p-3 flex flex-col justify-center items-center text-center shadow-inner">
                            <span className="text-[11px] md:text-xs text-ink-dim font-bold uppercase tracking-widest flex items-center gap-1 mb-1"><Coins size={12}/> Cash</span>
                            <span className="font-black text-ink kpm-num inline-flex items-center gap-2 min-w-0"><i className="kpm-coin lg" aria-hidden="true"></i><Money value={todayRevenue} className="text-ink" /></span>
                            {/* 🚀 NEW RETUR DEDUCTION DISPLAY */}
                            {totalRetur > 0 && (
                                <span className="text-[11px] text-danger-text font-bold mt-1 bg-danger-well px-2 py-0.5 rounded border border-danger-rail">
                                    - {formatRupiah(totalRetur)} Retur
                                </span>
                            )}
                        </div>

                        {/* 🚀 NEW CUKAI DEBT DISPLAY */}
                        <div className="bg-panel border border-line-2 rounded-none p-2 md:p-3 flex flex-col justify-center items-center text-center shadow-inner">
                            <span className="text-[11px] md:text-xs text-ink-dim font-bold uppercase tracking-widest flex items-center gap-1 mb-1"><Tag size={12}/> Cukai Due</span>
                            <span className="text-sm md:text-xl font-black text-ink">{totalCukaiOwed} <span className="text-[11px] font-bold text-ink-dim">Pcs</span></span>
                        </div>
                    </div>

                    {/* BOTTOM ROW: 3-Tier Revenue Box (Wide & Readable) */}
                    <div className="bg-panel border border-line-2 rounded-none px-3 lg:p-3 shadow-inner">
                        {/* the title row is the fold's button under lg (44 tall, label in a span so
                            index.css `button:has(> svg:only-child)` never claims it); on the desk it
                            is inert and the rows are always shown */}
                        <button type="button" onClick={() => setShowProjected(v => !v)} aria-expanded={showProjected}
                            className={`w-full flex items-center justify-between md:justify-start min-h-[44px] lg:min-h-0 lg:mb-2 lg:border-b border-line-2 lg:pb-2 lg:pointer-events-none lg:cursor-default ${showProjected ? 'mb-2 border-b pb-2' : ''}`}>
                            <span className="text-[11px] md:text-xs text-ink-dim font-bold uppercase tracking-widest flex items-center gap-1"><TrendingUp size={14}/> Projected Value</span>
                            <span className="lg:hidden text-[11px] font-black uppercase tracking-widest text-ink-dim">{showProjected ? 'Hide ▴' : 'Show ▾'}</span>
                        </button>
                        <div className={`${showProjected ? 'grid pb-3' : 'hidden'} lg:grid lg:pb-0 grid-cols-1 md:grid-cols-3 gap-1 md:gap-2 divide-y md:divide-y-0 md:divide-x divide-line-2`}>
                            <div className="flex flex-row items-center justify-between py-1.5 md:py-0 md:flex-col md:justify-center text-center min-w-0">
                                <span className="text-[11px] md:text-xs text-ink-dim font-bold uppercase tracking-wider md:mb-1">Ecer</span>
                                <Money value={revEcer} className="text-ink" />
                            </div>
                            <div className="flex flex-row items-center justify-between py-1.5 md:py-0 md:flex-col md:justify-center text-center md:pl-2 min-w-0">
                                <span className="text-[11px] md:text-xs text-ink-dim font-bold uppercase tracking-wider md:mb-1">Retail</span>
                                <Money value={revRetail} className="text-ink" />
                            </div>
                            <div className="flex flex-row items-center justify-between py-1.5 md:py-0 md:flex-col md:justify-center text-center md:pl-2 min-w-0">
                                <span className="text-[11px] md:text-xs text-ink-dim font-bold uppercase tracking-wider md:mb-1">Grosir</span>
                                <Money value={revGrosir} className="text-ink" />
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* 🚀 SEGMENTED CONTROL TOGGLE */}
            <div className="px-4 pt-4 shrink-0 relative z-10 bg-ground">
                <div className="flex p-1 bg-panel rounded-none ring-1 ring-line-2">
                    <button
                        onClick={() => setViewMode('HEALTHY')}
                        className={`flex-1 py-2 min-h-[44px] lg:min-h-0 text-sm font-medium rounded-none transition-all duration-200 ${
                            viewMode === 'HEALTHY'
                                ? 'bg-panel text-ink shadow-sm'
                                : 'text-ink-dim hover:text-ink'
                        }`}
                    >
                        Saleable
                    </button>
                    <button
                        onClick={() => setViewMode('QUARANTINE')}
                        className={`flex-1 py-2 min-h-[44px] lg:min-h-0 text-sm font-medium rounded-none transition-all duration-200 flex items-center justify-center gap-2 ${
                            viewMode === 'QUARANTINE'
                                ? 'bg-danger-well text-danger-text ring-1 ring-danger-rail shadow-sm'
                                : 'text-ink-dim hover:text-ink'
                        }`}
                    >
                        Quarantine
                        {quarantineCount > 0 && (
                            <NixieCount value={quarantineCount} size={16} />
                        )}
                    </button>
                </div>
            </div>

            {/* SCROLLABLE CONTENT AREA */}
            <div className="flex-1 lg:overflow-y-auto p-4 custom-scrollbar relative z-10">
                
                {viewMode === 'HEALTHY' ? (
                    <>
                        {/* 1. PRODUCT MANIFEST LIST */}
                        {isLoading ? (
                            <div className="flex items-center justify-center h-40 opacity-50">
                                <div className="text-center animate-pulse">
                                    <AlertCircle size={32} className="mx-auto mb-3 text-ink-dim"/>
                                    <p className="text-xs font-bold tracking-widest uppercase text-ink-dim">Syncing</p>
                                </div>
                            </div>
                        ) : seesChest ? (
                            <div className="mb-8">
                                <LoadingBay vanOnly key={trueAgentId || 'none'} agent={{ ...liveProfileData, id: trueAgentId, name: agentName }}
                                    stock={inventory} damaged={damagedInVan(todayTransactions, inventory)}
                                    canEdit={canEditFleetRoster(userRole)} onLayout={saveLayout} />
                            </div>
                        ) : canvasItems.length === 0 ? (
                            <div className="flex items-center justify-center h-40 opacity-30 flex-col">
                                <Package size={48} className="mb-4 text-ink-dim"/>
                                <p className="font-black text-lg tracking-widest uppercase text-ink-dim">Nothing Loaded</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8">
                                {canvasItems.map((item, idx) => {
                                    const itemBksDecimal = calculateBks(item.qty, item.unit);
                                    
                                    // CHECK FOR MISSING DISTRIBUTOR PRICE
                                    const productInfo = inventory.find(p => p.id === item.productId) || {};
                                    const isMissingCost = !productInfo.priceDistributor || productInfo.priceDistributor <= 0;
                                    
                                    // 🚀 DECIMAL-TO-PHYSICAL CONVERTER
                                    const sp = productInfo.sticksPerPack || 16;
                                    const physicalBks = Math.floor(itemBksDecimal);
                                    const physicalBtg = Math.round((itemBksDecimal - physicalBks) * sp);

                                    return (
                                        <div key={idx} className="bg-panel border border-line-2 p-3 rounded-none flex items-center justify-between kpm-hot hover:border-line-3 group">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-none bg-ground border border-line-2 flex items-center justify-center shrink-0 shadow-inner group-hover:border-line-3 transition-colors">
                                                    <Package size={18} className="text-ink-dim group-hover:text-gold transition-colors"/>
                                                </div>
                                                <div className="min-w-0 flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        {/* the name wraps on the phone — a cut name is a data-entry hazard (2026-08-17) — and truncates on the desk as before */}
                                                        <h4 className="font-bold text-ink text-sm uppercase tracking-wide group-hover:text-ink transition-colors lg:truncate">{item.name}</h4>
                                                        {/* MISSING COST WARNING BADGE */}
                                                        {isMissingCost && (
                                                            <span className="bg-transparent border border-orange text-orange text-[11px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase whitespace-nowrap animate-pulse">
                                                                Cost Missing
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="text-right flex flex-col items-end shrink-0 ml-4">
                                                {/* 🚀 SPLIT DISPLAY: Large Bks on top, smaller Batang underneath */}
                                                {physicalBks > 0 && (
                                                    <div className="flex items-baseline gap-1.5">
                                                        <p className="text-xl md:text-2xl font-black text-ink leading-none kpm-num">{new Intl.NumberFormat('id-ID').format(physicalBks)}</p>
                                                        <p className="text-[11px] text-ink-dim font-bold uppercase tracking-widest">Bks</p>
                                                    </div>
                                                )}
                                                {physicalBtg > 0 && (
                                                    <div className={`flex items-baseline gap-1.5 ${physicalBks > 0 ? 'mt-1' : ''}`}>
                                                        <p className="text-sm md:text-base font-black text-ink-muted leading-none">{physicalBtg}</p>
                                                        <p className="text-[11px] text-ink-dim font-bold uppercase tracking-widest">Btg</p>
                                                    </div>
                                                )}
                                                {(physicalBks === 0 && physicalBtg === 0) && (
                                                    <div className="flex items-baseline gap-1.5">
                                                        <p className="text-xl md:text-2xl font-black text-ink leading-none">0</p>
                                                        <p className="text-[11px] text-ink-dim font-bold uppercase tracking-widest">Bks</p>
                                                    </div>
                                                )}
                                                <div className="bg-ground border border-line-2 px-2 py-0.5 rounded text-[11px] lg:text-[10px] font-bold text-ink-dim uppercase tracking-wider shadow-inner mt-1.5">
                                                    [{Number(item.qty).toFixed(2).replace(/\.00$/, '')} {item.unit}]
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* 2. TODAY'S SALES BREAKDOWN LEDGER */}
                        <div className="mt-6 mb-4 border-b border-line-2 pb-2 flex items-center gap-2">
                            <Receipt size={16} className="text-ink-dim" />
                            <h3 className="text-ink-muted font-bold uppercase tracking-widest text-xs">Sales</h3>
                        </div>

                        {todayTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 opacity-50 border border-line-2 border-dashed rounded-none bg-panel/30 mb-6">
                                <Coins size={32} className="mb-3 text-ink-dim"/>
                                <p className="text-[11px] lg:text-[10px] font-bold tracking-widest uppercase text-ink-dim">No Sales Today</p>
                            </div>
                        ) : (
                            <div className="space-y-3 mb-6">
                                {todayTransactions.map((tx, idx) => { const txKey = tx.id || idx; const txLines = openTx === txKey ? saleLines(tx, inventory) : []; return (
                                    <div key={txKey} className="bg-panel border border-line-2 rounded-none kpm-hot hover:border-line-3">
                                    {/* the row opens to what the sale was made of (his 2026-09-26 "we need more description dropdown on that") */}
                                    <button type="button" onClick={() => setOpenTx(o => (o === txKey ? null : txKey))} aria-expanded={openTx === txKey}
                                        className="w-full p-3.5 flex justify-between items-center text-left cursor-pointer">
                                        <div>
                                            <h4 className="font-bold text-ink text-sm uppercase tracking-wide">{tx.customerName || 'Unknown Customer'}</h4>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[11px] px-2 py-0.5 rounded bg-ground text-ink-dim font-bold uppercase tracking-wider border border-line-2 shadow-inner">
                                                    {tx.paymentType || 'CASH'}
                                                </span>
                                                <span className="text-[11px] lg:text-[10px] text-ink-dim font-mono font-semibold">
                                                    {tx.timestamp?.seconds ? new Date(tx.timestamp.seconds * 1000).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : 'Today'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg md:text-xl font-black text-ink leading-none kpm-num inline-flex items-center gap-2"><i className="kpm-coin" aria-hidden="true"></i>{formatRupiah(tx.total || tx.amountPaid || 0)}</p>
                                            <p className="text-[11px] text-ink-dim font-bold uppercase tracking-widest mt-1.5 flex items-center justify-end gap-1">
                                                {(tx.type === 'CONSIGNMENT_PAYMENT' ? tx.itemsPaid : tx.items)?.length || 0} {((tx.type === 'CONSIGNMENT_PAYMENT' ? tx.itemsPaid : tx.items)?.length || 0) === 1 ? 'item' : 'items'}
                                                <ChevronDown size={13} aria-hidden="true" className={`transition-transform ${openTx === txKey ? 'rotate-180' : ''}`} />
                                            </p>
                                        </div>
                                    </button>
                                    {openTx === txKey && (
                                        <ul className="border-t border-line-2 px-3.5 py-2.5 space-y-1.5">
                                            {txLines.length ? txLines.map((l, i) => (
                                                <li key={i} className="flex justify-between items-baseline gap-3 text-[12px]">
                                                    <span className="min-w-0 truncate font-bold text-ink">{l.name} <span className="font-mono font-semibold text-ink-dim">{l.qty} {l.unit}{l.tier ? ` · ${l.tier}` : ''}</span></span>
                                                    <span className="shrink-0 font-mono font-bold text-ink kpm-num">{formatRupiah(l.amount)}</span>
                                                </li>
                                            )) : <li className="text-[12px] text-ink-dim">Tidak ada barang tercatat di penjualan ini.</li>}
                                        </ul>
                                    )}
                                    </div>
                                ); })}
                            </div>
                        )}

                        {/* 3. TODAY'S SAMPLING LEDGER */}
                        <div className="mt-6 mb-4 border-b border-line-2 pb-2 flex items-center gap-2">
                            <Package size={16} className="text-ink-dim" />
                            <h3 className="text-ink-muted font-bold uppercase tracking-widest text-xs">Samples</h3>
                        </div>

                        {todaySamplings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 opacity-50 border border-line-2 border-dashed rounded-none bg-panel/30 mb-20">
                                <Package size={32} className="mb-3 text-ink-dim"/>
                                <p className="text-[11px] lg:text-[10px] font-bold tracking-widest uppercase text-ink-dim">No Samples Today</p>
                            </div>
                        ) : (
                            <div className="space-y-3 pb-20">
                                {todaySamplings.map((sample, idx) => {
                                    const cukaiOwed = Math.ceil(sample.qty);
                                    
                                    // 🚀 PRECISE DECIMAL-TO-PHYSICAL CONVERTER
                                    const sp = sample.sticksPerPack || 16;
                                    const bks = Math.floor(sample.qty || 0);
                                    const btg = Math.round(((sample.qty || 0) - bks) * sp);

                                    return (
                                        <div key={idx} className="bg-panel border border-line-2 p-3.5 rounded-none flex justify-between items-center kpm-hot hover:border-line-3">
                                            <div>
                                                <h4 className="font-bold text-ink-muted text-sm uppercase tracking-wide">{sample.reason || 'Unknown Target'}</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-[11px] px-2 py-0.5 rounded bg-ground text-ink font-bold uppercase tracking-wider border border-line-2 shadow-inner">
                                                        {sample.productName}
                                                    </span>
                                                    <span className="text-[11px] lg:text-[10px] text-ink-dim font-mono font-semibold">
                                                        {sample.timestamp?.seconds ? new Date(sample.timestamp.seconds * 1000).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : 'Today'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                {/* 🚀 SPLIT DISPLAY: Large Bks on top, smaller Batang underneath */}
                                                {bks > 0 && <p className="text-lg md:text-xl font-black text-ink leading-none drop-shadow-sm">-{bks} Bks</p>}
                                                {btg > 0 && <p className={`text-xs font-black text-ink-muted drop-shadow-sm ${bks > 0 ? 'mt-1' : ''}`}>-{btg} Batang</p>}
                                                
                                                <p className="text-[11px] text-danger-text font-bold uppercase tracking-widest mt-1.5">Owe {cukaiOwed} Cukai</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    <QuarantineLedgerBoard cargo={quarantinedCargo} />
                )}

            </div>
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--line-3); border-radius: 3px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }`}</style>
        </div>
    );
};

// ==========================================
// 🚀 SUB-COMPONENT: QUARANTINE LEDGER BOARD
// ==========================================
function QuarantineLedgerBoard({ cargo }) {
    if (!cargo || cargo.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <ShieldAlert className="w-12 h-12 text-ink-dim mb-3" />
          <p className="text-ink-dim text-sm font-medium">Quarantine Empty</p>
          <p className="text-ink-dim text-xs text-center mt-1">
            Nothing collected today
          </p>
        </div>
      );
    }
  
    return (
      <div className="space-y-3 pb-20">
        {cargo.map((item) => (
          <div 
            key={item.id} 
            className="bg-panel rounded-none p-4 border border-danger-rail relative overflow-hidden shadow-sm"
          >
            {/* Visual Warning Bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-danger-rail"></div>
            
            <div className="flex justify-between items-start pl-2">
              <div>
                <h3 className="font-semibold text-ink text-base">{item.itemName}</h3>
                <div className="flex items-center gap-1 mt-1 text-danger-text text-[11px] lg:text-[10px] font-bold uppercase tracking-wide">
                  <AlertOctagon className="w-3 h-3" />
                  {item.returnReason}
                </div>
              </div>
              
              {/* Exact Quantity Marker */}
              <div className="flex flex-col items-end shrink-0 ml-4">
                <div className="bg-danger-well text-danger-text px-3 py-1 rounded-none text-lg font-black ring-1 ring-danger-rail">
                  - {item.qty}
                </div>
              </div>
            </div>
  
            {/* Forensic Audit Details */}
            <div className="mt-4 pt-3 border-t border-line pl-2 space-y-2">
              <div className="flex items-center gap-2 text-[11px] lg:text-[10px] text-ink-dim uppercase tracking-widest font-bold">
                <User className="w-3 h-3 text-ink-dim" />
                <span>Origin: <span className="text-ink-muted">{item.customerOrigin}</span></span>
              </div>
              <div className="flex items-center gap-2 text-[11px] lg:text-[10px] text-ink-dim uppercase tracking-widest font-bold">
                <Tag className="w-3 h-3 text-ink-dim" />
                <span>Tx ID: <span className="font-mono text-ink-dim">{item.id.slice(-8)}</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
}

export default AgentInventoryView;