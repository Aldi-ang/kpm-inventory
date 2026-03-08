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
        <div className="h-[850px] lg:h-[calc(100vh-120px)] flex flex-col max-w-5xl mx-auto animate-fade-in bg-[#1a1815] text-[#d4c5a3] font-serif border-4 border-[#3e3226] relative shadow-2xl overflow-hidden">
            {/* GRITTY TEXTURE BACKGROUND */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-50 pointer-events-none"></div>

            {/* HEADER SECTION */}
            <div className="p-6 md:p-8 bg-[#0f0e0d] border-b-4 border-[#5c4b3a] relative z-10 flex flex-col items-center justify-center shadow-[0_5px_15px_rgba(0,0,0,0.6)] shrink-0">
                <Truck size={48} className="text-[#8b7256] mb-3 drop-shadow-md" />
                <h1 className="text-2xl md:text-4xl font-black uppercase tracking-[0.3em] text-[#ff9d00] drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-center">
                    {agentName}'s Manifest
                </h1>
                <p className="text-xs md:text-sm text-[#5c4b3a] font-bold tracking-widest uppercase mt-2">Active Vehicle Canvas</p>
                
                {/* GLOBAL STATS BOX */}
                <div className="flex flex-wrap gap-4 md:gap-8 mt-8 w-full justify-center">
                    <div className="bg-[#26211c] border-2 border-[#3e3226] p-4 rounded-lg text-center min-w-[140px] shadow-inner">
                        <p className="text-[10px] md:text-xs text-[#8b7256] uppercase tracking-widest font-bold mb-1">Total Load</p>
                        <p className="text-2xl md:text-3xl font-black text-white drop-shadow-md">{totalContainers}</p>
                    </div>
                    <div className="bg-[#26211c] border-2 border-[#ff9d00] p-4 rounded-lg text-center min-w-[140px] shadow-[0_0_20px_rgba(255,157,0,0.15)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-[#ff9d00] opacity-5 pointer-events-none"></div>
                        <p className="text-[10px] md:text-xs text-[#ff9d00] uppercase tracking-widest font-bold mb-1 relative z-10">Total Bungkus</p>
                        <p className="text-3xl md:text-4xl font-black text-[#ff9d00] drop-shadow-[0_3px_5px_rgba(0,0,0,1)] relative z-10">{new Intl.NumberFormat('id-ID').format(totalBks)}</p>
                    </div>
                </div>
            </div>

            {/* MANIFEST LIST */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10 custom-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full opacity-50">
                        <div className="text-center animate-pulse">
                            <AlertCircle size={48} className="mx-auto mb-4 text-[#8b7256]"/>
                            <p className="font-bold tracking-widest uppercase text-[#8b7256]">Accessing Manifest...</p>
                        </div>
                    </div>
                ) : canvasItems.length === 0 ? (
                    <div className="flex items-center justify-center h-full opacity-30 flex-col">
                        <Package size={64} className="mb-4 text-[#5c4b3a]"/>
                        <p className="font-black text-xl tracking-[0.2em] uppercase text-[#5c4b3a]">Manifest Empty</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-20">
                        {canvasItems.map((item, idx) => {
                            const itemBks = calculateBks(item.qty, item.unit);
                            return (
                                <div key={idx} className="bg-gradient-to-r from-[#26211c] to-[#1a1815] border-2 border-[#3e3226] p-4 md:p-5 rounded-lg flex items-center justify-between hover:border-[#8b7256] transition-colors group shadow-[0_8px_16px_rgba(0,0,0,0.4)]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded bg-[#0f0e0d] border border-[#5c4b3a] flex items-center justify-center shrink-0 shadow-inner group-hover:border-[#ff9d00] transition-colors">
                                            <Package size={24} className="text-[#8b7256] group-hover:text-[#ff9d00] transition-colors"/>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-[#dfd5bc] text-sm md:text-base uppercase tracking-widest group-hover:text-white transition-colors">{item.name}</h4>
                                            <p className="text-[10px] text-[#5c4b3a] font-mono mt-1 font-bold">ID: {item.productId.slice(0,8)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        {/* SMART MATH BKS */}
                                        <p className="text-2xl md:text-3xl font-black text-[#ff9d00] drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)] leading-none">{new Intl.NumberFormat('id-ID').format(itemBks)}</p>
                                        <p className="text-[9px] text-[#8b7256] font-bold uppercase tracking-[0.2em] mt-1 mb-2">Total Bks</p>
                                        
                                        {/* HIGH VISIBILITY CONTAINER BOX */}
                                        <div className="bg-[#0f0e0d] border-2 border-[#5c4b3a] px-3 py-1.5 rounded shadow-inner">
                                            <p className="text-xs md:text-sm font-black text-[#dfd5bc] tracking-widest uppercase">
                                                [{item.qty} {item.unit}]
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #5c4b3a; border-radius: 3px; } .custom-scrollbar::-webkit-scrollbar-track { background: #1a1815; }`}</style>
        </div>
    );
};

export default AgentInventoryView;