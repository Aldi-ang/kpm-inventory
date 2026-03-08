import React, { useState, useEffect } from 'react';
import { Package, Truck, AlertCircle } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';

const AgentInventoryView = ({ db, appId, userId, agentProfileId }) => {
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

    // --- SMART MATH: Convert containers to base Bks ---
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

    return (
        <div className="h-[850px] lg:h-[calc(100vh-120px)] flex flex-col max-w-5xl mx-auto animate-fade-in bg-slate-950 font-sans border-x border-slate-800 shadow-2xl overflow-hidden relative">
            
            {/* COMPACT COMMAND BAR HEADER */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 relative z-10 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 shadow-inner">
                        <Truck className="text-blue-500" size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-black uppercase tracking-wide text-white">{agentName}'s Manifest</h1>
                        <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">Active Vehicle Canvas</p>
                    </div>
                </div>
                
                {/* HORIZONTAL STATS - Saves massive vertical space */}
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="flex-1 md:w-36 bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between shadow-inner">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Load</span>
                        <span className="text-lg font-black text-white">{totalContainers}</span>
                    </div>
                    <div className="flex-1 md:w-40 bg-blue-950/30 border border-blue-900/50 rounded-lg p-2.5 flex items-center justify-between shadow-inner">
                        <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Total Bks</span>
                        <span className="text-lg font-black text-blue-400">{new Intl.NumberFormat('id-ID').format(totalBks)}</span>
                    </div>
                </div>
            </div>

            {/* HIGH DENSITY MANIFEST LIST */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full opacity-50">
                        <div className="text-center animate-pulse">
                            <AlertCircle size={32} className="mx-auto mb-3 text-slate-600"/>
                            <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Syncing...</p>
                        </div>
                    </div>
                ) : canvasItems.length === 0 ? (
                    <div className="flex items-center justify-center h-full opacity-30 flex-col">
                        <Package size={48} className="mb-4 text-slate-600"/>
                        <p className="font-black text-lg tracking-widest uppercase text-slate-500">Manifest Empty</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-20">
                        {canvasItems.map((item, idx) => {
                            const itemBks = calculateBks(item.qty, item.unit);
                            return (
                                <div key={idx} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between hover:border-slate-600 transition-colors shadow-sm group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner group-hover:border-slate-600 transition-colors">
                                            <Package size={18} className="text-slate-500 group-hover:text-blue-400 transition-colors"/>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-200 text-sm uppercase tracking-wide group-hover:text-white transition-colors">{item.name}</h4>
                                            <p className="text-[10px] text-slate-600 font-mono mt-0.5 font-semibold">ID: {item.productId.slice(0,8)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right flex flex-col items-end gap-1.5">
                                        {/* TOTAL BKS */}
                                        <div className="flex items-baseline gap-1.5">
                                            <p className="text-xl md:text-2xl font-black text-emerald-400 leading-none">{new Intl.NumberFormat('id-ID').format(itemBks)}</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Bks</p>
                                        </div>
                                        
                                        {/* CONTAINER BADGE */}
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