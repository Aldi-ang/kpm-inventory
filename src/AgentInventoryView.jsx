import React, { useState, useEffect } from 'react';
import { Package, Truck, AlertCircle, TrendingUp, Wallet, Coins } from 'lucide-react';
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

    const totalContainers = canvasItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const totalBks = canvasItems.reduce((sum, item) => sum + calculateBks(item.qty, item.unit), 0);

    // --- FINANCIAL MATH ENGINE ---
    const todayDate = getCurrentDate();
    
    // 1. SUM TODAY'S SALES FOR THIS AGENT
    const todayRevenue = transactions
        .filter(t => t.agentId === agentProfileId && t.date === todayDate && (t.type === 'SALE' || t.type === 'CONSIGNMENT_PAYMENT'))
        .reduce((sum, t) => sum + (t.total || t.amountPaid || 0), 0);

    // 2. CALCULATE LOAD VALUE & PROFIT MARGINS
    let estValue = 0;
    let estCost = 0;

    canvasItems.forEach(item => {
        const bksQty = calculateBks(item.qty, item.unit);
        const productInfo = inventory.find(p => p.id === item.productId);
        
        const retailPrice = productInfo?.priceRetail || 0;
        const distPrice = productInfo?.priceDistributor || 0;

        estValue += (bksQty * retailPrice);
        estCost += (bksQty * distPrice);
    });

    const estProfit = estValue - estCost;

    return (
        <div className="h-[850px] lg:h-[calc(100vh-120px)] flex flex-col max-w-5xl mx-auto animate-fade-in bg-slate-950 font-sans border-x border-slate-800 shadow-2xl overflow-hidden relative">
            
            {/* DYNAMIC FINANCIAL COMMAND BAR */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 relative z-10 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 shadow-inner">
                        <Truck className="text-blue-500" size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-black uppercase tracking-wide text-white">{agentName}'s Manifest</h1>
                        <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">Real-time Financial Status</p>
                    </div>
                </div>
                
                {/* THE 4 FINANCIAL METRICS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full xl:w-auto mt-2 xl:mt-0">
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-center shadow-inner">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1"><Package size={10}/> Load (Bks)</span>
                        <span className="text-sm md:text-base font-black text-blue-400">{new Intl.NumberFormat('id-ID').format(totalBks)}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-center shadow-inner">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1"><Wallet size={10}/> Asset Value</span>
                        <span className="text-sm md:text-base font-black text-slate-200">{formatRupiah(estValue)}</span>
                    </div>
                    <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-2.5 flex flex-col justify-center shadow-inner">
                        <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1"><TrendingUp size={10}/> Pot. Profit</span>
                        <span className="text-sm md:text-base font-black text-emerald-400">{formatRupiah(estProfit)}</span>
                    </div>
                    <div className="bg-orange-950/30 border border-orange-900/50 rounded-lg p-2.5 flex flex-col justify-center shadow-inner">
                        <span className="text-[9px] text-orange-500 font-bold uppercase tracking-widest flex items-center gap-1"><Coins size={10}/> Today Sales</span>
                        <span className="text-sm md:text-base font-black text-orange-400">{formatRupiah(todayRevenue)}</span>
                    </div>
                </div>
            </div>

            {/* PRODUCT MANIFEST LIST */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full opacity-50">
                        <div className="text-center animate-pulse">
                            <AlertCircle size={32} className="mx-auto mb-3 text-slate-600"/>
                            <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Syncing database...</p>
                        </div>
                    </div>
                ) : canvasItems.length === 0 ? (
                    <div className="flex items-center justify-center h-full opacity-30 flex-col">
                        <Package size={48} className="mb-4 text-slate-600"/>
                        <p className="font-black text-lg tracking-widest uppercase text-slate-500">Vehicle empty</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-20">
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
            </div>
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }`}</style>
        </div>
    );
};

export default AgentInventoryView;