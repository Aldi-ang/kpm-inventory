import React, { useState, useEffect } from 'react';
import { Package, Truck, AlertCircle, TrendingUp, Wallet, Coins, Receipt } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';

// --- FINANCIAL HELPERS ---
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(number || 0);
};
const getCurrentDate = () => new Date().toISOString().split('T')[0];

const AgentInventoryView = ({ db, appId, userId, agentProfileId, inventory = [], transactions = [] }) => {
    const [canvasItems, setCanvasItems] = useState([]);
    const [agentName, setAgentName] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!db || !appId || !userId || !agentProfileId) return;

        const agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, agentProfileId);
        
        const unsub = onSnapshot(agentRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCanvasItems(data.activeCanvas || []);
                setAgentName(data.name || "Agent");
            } else {
                setCanvasItems([]);
            }
            setIsLoading(false);
        });

        return () => unsub();
    }, [db, appId, userId, agentProfileId]);

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
    
    // 1. FILTER TODAY'S SALES FOR THIS AGENT EXACTLY
    const todayTransactions = transactions.filter(t => 
        t.agentId === agentProfileId && 
        t.date === todayDate && 
        (t.type === 'SALE' || t.type === 'CONSIGNMENT_PAYMENT')
    );

    // 2. SUM TOTAL REVENUE
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + (t.total || t.amountPaid || 0), 0);

    // 3. CALCULATE LOAD VALUE & MULTI-TIER PROFIT MARGINS
    let estCost = 0;
    let potEcer = 0;
    let potRetail = 0;
    let potGrosir = 0;

    canvasItems.forEach(item => {
        const bksQty = calculateBks(item.qty, item.unit);
        const productInfo = inventory.find(p => p.id === item.productId);
        
        const cost = productInfo?.priceDistributor || 0;
        const ecer = productInfo?.priceEcer || 0;
        const retail = productInfo?.priceRetail || 0;
        const grosir = productInfo?.priceGrosir || 0;

        estCost += (bksQty * cost);
        potEcer += (bksQty * ecer) - (bksQty * cost);
        potRetail += (bksQty * retail) - (bksQty * cost);
        potGrosir += (bksQty * grosir) - (bksQty * cost);
    });

    return (
        <div className="h-[850px] lg:h-[calc(100vh-120px)] flex flex-col max-w-5xl mx-auto animate-fade-in bg-slate-950 font-sans border-x border-slate-800 shadow-2xl overflow-hidden relative">
            
            {/* DYNAMIC FINANCIAL COMMAND BAR */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex flex-col xl:flex-row justify-between items-start gap-4 shrink-0 relative z-10 shadow-md">
                
                {/* LEFT: AGENT IDENTITY */}
                <div className="flex items-center gap-3 shrink-0 w-full xl:w-auto">
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 shadow-inner">
                        <Truck className="text-blue-500" size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-black uppercase tracking-wide text-white">{agentName}'s Manifest</h1>
                        <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">Real-time Financial Status</p>
                    </div>
                </div>
                
                {/* RIGHT: THE FINANCIAL METRICS (MOBILE OPTIMIZED BLOCK LAYOUT) */}
                <div className="flex flex-col gap-3 w-full xl:w-[65%] mt-2 xl:mt-0">
                    
                    {/* TOP ROW: 3 Core Metrics */}
                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 md:p-3 flex flex-col justify-center items-center text-center shadow-inner">
                            <span className="text-[9px] md:text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-1"><Package size={12}/> Load</span>
                            <span className="text-base md:text-xl font-black text-blue-400">{new Intl.NumberFormat('id-ID').format(totalBks)} <span className="text-[9px] font-bold text-slate-600">Bks</span></span>
                        </div>
                        
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 md:p-3 flex flex-col justify-center items-center text-center shadow-inner">
                            <span className="text-[9px] md:text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-1"><Wallet size={12}/> Modal</span>
                            <span className="text-sm md:text-xl font-black text-slate-200">{formatRupiah(estCost)}</span>
                        </div>
                        
                        <div className="bg-orange-950/30 border border-orange-900/50 rounded-xl p-2 md:p-3 flex flex-col justify-center items-center text-center shadow-inner">
                            <span className="text-[9px] md:text-xs text-orange-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-1"><Coins size={12}/> Sales</span>
                            <span className="text-sm md:text-xl font-black text-orange-400">{formatRupiah(todayRevenue)}</span>
                        </div>
                    </div>

                    {/* BOTTOM ROW: 3-Tier Profit Box (Wide & Readable) */}
                    <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-3 shadow-inner">
                        <div className="flex items-center justify-center md:justify-start mb-2 border-b border-emerald-900/50 pb-2">
                            <span className="text-[10px] md:text-xs text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1"><TrendingUp size={14}/> Potential Profit (Cuan)</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 divide-x divide-emerald-900/50">
                            <div className="flex flex-col items-center text-center">
                                <span className="text-[9px] md:text-xs text-emerald-500/70 font-bold uppercase tracking-wider mb-1">Ecer</span>
                                <span className="text-sm md:text-xl font-black text-emerald-400">{formatRupiah(potEcer)}</span>
                            </div>
                            <div className="flex flex-col items-center text-center pl-2">
                                <span className="text-[9px] md:text-xs text-emerald-500/70 font-bold uppercase tracking-wider mb-1">Retail</span>
                                <span className="text-sm md:text-xl font-black text-emerald-400">{formatRupiah(potRetail)}</span>
                            </div>
                            <div className="flex flex-col items-center text-center pl-2">
                                <span className="text-[9px] md:text-xs text-emerald-500/70 font-bold uppercase tracking-wider mb-1">Grosir</span>
                                <span className="text-sm md:text-xl font-black text-emerald-400">{formatRupiah(potGrosir)}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* SCROLLABLE CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10">
                
                {/* 1. PRODUCT MANIFEST LIST */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 opacity-50">
                        <div className="text-center animate-pulse">
                            <AlertCircle size={32} className="mx-auto mb-3 text-slate-600"/>
                            <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Syncing database...</p>
                        </div>
                    </div>
                ) : canvasItems.length === 0 ? (
                    <div className="flex items-center justify-center h-40 opacity-30 flex-col">
                        <Package size={48} className="mb-4 text-slate-600"/>
                        <p className="font-black text-lg tracking-widest uppercase text-slate-500">Vehicle empty</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8">
                        {canvasItems.map((item, idx) => {
                            const itemBks = calculateBks(item.qty, item.unit);
                            return (
                                <div key={idx} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between hover:border-slate-600 transition-colors shadow-sm group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner group-hover:border-slate-600 transition-colors">
                                            <Package size={18} className="text-slate-500 group-hover:text-blue-400 transition-colors"/>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-slate-200 text-sm uppercase tracking-wide group-hover:text-white transition-colors truncate">{item.name}</h4>
                                            <p className="text-[10px] text-slate-600 font-mono mt-0.5 font-semibold">ID: {item.productId.slice(0,8)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right flex flex-col items-end gap-1.5 shrink-0 ml-4">
                                        <div className="flex items-baseline gap-1.5">
                                            <p className="text-xl md:text-2xl font-black text-emerald-400 leading-none">{new Intl.NumberFormat('id-ID').format(itemBks)}</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Bks</p>
                                        </div>
                                        <div className="bg-slate-950 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold text-slate-400 uppercase tracking-wider shadow-inner">
                                            [{item.qty} {item.unit}]
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* 2. TODAY'S SALES BREAKDOWN LEDGER */}
                <div className="mt-6 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <Receipt size={16} className="text-orange-500" />
                    <h3 className="text-slate-300 font-bold uppercase tracking-widest text-xs">Today's Transactions</h3>
                </div>

                {todayTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 opacity-50 border border-slate-800 border-dashed rounded-xl bg-slate-900/30 mb-20">
                        <Coins size={32} className="mb-3 text-slate-600"/>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">No sales recorded today</p>
                    </div>
                ) : (
                    <div className="space-y-3 pb-20">
                        {todayTransactions.map((tx, idx) => (
                            <div key={idx} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex justify-between items-center hover:border-slate-600 transition-colors shadow-sm">
                                <div>
                                    <h4 className="font-bold text-slate-200 text-sm uppercase tracking-wide">{tx.customerName || 'Unknown Customer'}</h4>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[9px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border border-slate-700 shadow-inner">
                                            {tx.paymentType || 'CASH'}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono font-semibold">
                                            {tx.timestamp?.seconds ? new Date(tx.timestamp.seconds * 1000).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : 'Today'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg md:text-xl font-black text-orange-400 leading-none drop-shadow-sm">{formatRupiah(tx.total || tx.amountPaid || 0)}</p>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">{tx.items?.length || 0} Items Sold</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }`}</style>
        </div>
    );
};

export default AgentInventoryView;