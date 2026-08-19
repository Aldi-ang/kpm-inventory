import React, { useState, useEffect, useMemo } from 'react';
import { Package, Truck, AlertCircle, TrendingUp, Wallet, Coins, Receipt, Tag, AlertOctagon, ShieldAlert, User } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { formatRupiah } from './utils/helpers';

const getCurrentDate = () => new Date().toISOString().split('T')[0];

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

const AgentInventoryView = ({ db, appId, userId, agentProfileId, inventory = [], transactions = [], samplings = [], user, motorists = [] }) => {
    const [canvasItems, setCanvasItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [liveProfileData, setLiveProfileData] = useState(null);
    
    // 🚀 NEW: QUARANTINE TOGGLE STATE
    const [viewMode, setViewMode] = useState('HEALTHY'); // 'HEALTHY' | 'QUARANTINE'

    // 🛡️ ARMOR-PLATED EMAIL ROUTER (Fixes Cache Ghosting & State Bleed)
    // 1. Sanitize the active Google login email to prevent space/case mismatch
    const activeEmail = String(user?.email || "").trim().toLowerCase();
    
    // 2. Aggressively sweep Fleet Roster for exact email match FIRST
    const matchedByEmail = motorists.find(m => 
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
        if (pid !== 'global_credit' && val > 0) calcTotal += Math.ceil(val);
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
        
        // If Sold = Pure gross value at different tiers
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

    return (
        <div className="h-[850px] lg:h-[calc(100vh-120px)] flex flex-col max-w-5xl mx-auto animate-fade-in bg-ground font-sans border-x border-line-2 shadow-2xl overflow-hidden relative">
            
            {/* DYNAMIC FINANCIAL COMMAND BAR */}
            <div className="bg-panel border-b border-line-2 p-4 flex flex-col xl:flex-row justify-between items-start gap-4 shrink-0 relative z-10 shadow-md">
                
                {/* LEFT: AGENT IDENTITY */}
                <div className="flex items-center gap-3 shrink-0 w-full xl:w-auto">
                    <div className="p-2.5 bg-ground rounded-none border border-line-2 shadow-inner">
                        <Truck className="text-gold" size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-black uppercase tracking-wide text-ink">MANIFEST <span className="text-ink-dim">· {agentName}</span></h1>
                    </div>
                </div>
                
                {/* RIGHT: THE FINANCIAL METRICS (MOBILE OPTIMIZED BLOCK LAYOUT) */}
                <div className="flex flex-col gap-3 w-full xl:w-[65%] mt-2 xl:mt-0">
                    
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
                    <div className="bg-panel border border-line-2 rounded-none p-3 shadow-inner">
                        <div className="flex items-center justify-center md:justify-start mb-2 border-b border-line-2 pb-2">
                            <span className="text-[10px] md:text-xs text-ink-dim font-bold uppercase tracking-widest flex items-center gap-1"><TrendingUp size={14}/> If Sold</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-2 divide-y md:divide-y-0 md:divide-x divide-line-2">
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
                        className={`flex-1 py-2 text-sm font-medium rounded-none transition-all duration-200 ${
                            viewMode === 'HEALTHY'
                                ? 'bg-panel text-ink shadow-sm'
                                : 'text-ink-dim hover:text-ink'
                        }`}
                    >
                        Saleable
                    </button>
                    <button
                        onClick={() => setViewMode('QUARANTINE')}
                        className={`flex-1 py-2 text-sm font-medium rounded-none transition-all duration-200 flex items-center justify-center gap-2 ${
                            viewMode === 'QUARANTINE'
                                ? 'bg-danger-well text-danger-text ring-1 ring-danger-rail shadow-sm'
                                : 'text-ink-dim hover:text-ink'
                        }`}
                    >
                        Quarantine
                        {quarantineCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[21px] h-[19px] px-1.5 bg-danger-badge text-white text-[12px] font-semibold kpm-num border border-black/30">{quarantineCount}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* SCROLLABLE CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10">
                
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
                                                        <h4 className="font-bold text-ink text-sm uppercase tracking-wide group-hover:text-ink transition-colors truncate">{item.name}</h4>
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
                                                <div className="bg-ground border border-line-2 px-2 py-0.5 rounded text-[10px] font-bold text-ink-dim uppercase tracking-wider shadow-inner mt-1.5">
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
                                <p className="text-[10px] font-bold tracking-widest uppercase text-ink-dim">No Sales Today</p>
                            </div>
                        ) : (
                            <div className="space-y-3 mb-6">
                                {todayTransactions.map((tx, idx) => (
                                    <div key={idx} className="bg-panel border border-line-2 p-3.5 rounded-none flex justify-between items-center kpm-hot hover:border-line-3">
                                        <div>
                                            <h4 className="font-bold text-ink text-sm uppercase tracking-wide">{tx.customerName || 'Unknown Customer'}</h4>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[11px] px-2 py-0.5 rounded bg-ground text-ink-dim font-bold uppercase tracking-wider border border-line-2 shadow-inner">
                                                    {tx.paymentType || 'CASH'}
                                                </span>
                                                <span className="text-[10px] text-ink-dim font-mono font-semibold">
                                                    {tx.timestamp?.seconds ? new Date(tx.timestamp.seconds * 1000).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : 'Today'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg md:text-xl font-black text-ink leading-none kpm-num inline-flex items-center gap-2"><i className="kpm-coin" aria-hidden="true"></i>{formatRupiah(tx.total || tx.amountPaid || 0)}</p>
                                            <p className="text-[11px] text-ink-dim font-bold uppercase tracking-widest mt-1.5">{tx.items?.length || 0} items</p>
                                        </div>
                                    </div>
                                ))}
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
                                <p className="text-[10px] font-bold tracking-widest uppercase text-ink-dim">No Samples Today</p>
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
                                                    <span className="text-[10px] text-ink-dim font-mono font-semibold">
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
                <div className="flex items-center gap-1 mt-1 text-danger-text text-[10px] font-bold uppercase tracking-wide">
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
              <div className="flex items-center gap-2 text-[10px] text-ink-dim uppercase tracking-widest font-bold">
                <User className="w-3 h-3 text-ink-dim" />
                <span>Origin: <span className="text-ink-muted">{item.customerOrigin}</span></span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-ink-dim uppercase tracking-widest font-bold">
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