import React, { useState, useEffect } from 'react';
import { Package, Truck, AlertCircle, ShoppingCart } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';

const AgentInventoryView = ({ db, appId, userId, agentProfileId }) => {
    const [canvasItems, setCanvasItems] = useState([]);
    const [agentName, setAgentName] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!db || !appId || !userId || !agentProfileId) return;

        // Listen directly to this specific employee's vehicle profile in the Admin's database
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

    const totalItems = canvasItems.reduce((sum, item) => sum + item.qty, 0);

    return (
        <div className="h-full flex flex-col max-w-3xl mx-auto animate-fade-in">
            
            {/* TERMINAL HEADER */}
            <div className="bg-black/80 border border-emerald-500/30 p-6 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.1)] mb-6 relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Truck size={100} className="text-emerald-500"/></div>
                
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest font-mono">Live Telemetry</p>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest">{agentName}'s Canvas</h2>
                    </div>
                    
                    <div className="text-right bg-emerald-900/30 p-3 rounded-xl border border-emerald-500/20">
                        <p className="text-[10px] text-emerald-400/70 uppercase tracking-widest mb-1">Total Load</p>
                        <p className="text-3xl font-black text-emerald-500 leading-none">{totalItems}</p>
                    </div>
                </div>
            </div>

            {/* INVENTORY LIST */}
            <div className="flex-1 bg-black/50 border border-white/10 rounded-2xl p-4 md:p-6 overflow-y-auto custom-scrollbar shadow-xl backdrop-blur-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
                    <Package size={16} className="text-orange-500"/> Current Stock Onboard
                </h3>

                {isLoading ? (
                    <div className="text-center py-20 text-emerald-500 animate-pulse font-mono text-xs tracking-widest">SYNCING WITH MASTER VAULT...</div>
                ) : canvasItems.length === 0 ? (
                    <div className="text-center py-20 opacity-50 flex flex-col items-center">
                        <ShoppingCart size={48} className="mb-4 text-slate-600"/>
                        <p className="text-sm font-bold text-white uppercase tracking-widest">Vehicle is Empty</p>
                        <p className="text-xs text-slate-500 mt-2 font-mono">Report to Admin for resupply.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {canvasItems.map((item, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-black border border-white/20 flex items-center justify-center shrink-0">
                                        <Package size={20} className="text-slate-400 group-hover:text-emerald-400 transition-colors"/>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm md:text-base uppercase tracking-wide">{item.name}</h4>
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {item.productId.slice(0,8)}...</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-emerald-400">{item.qty}</p>
                                    <p className="text-[9px] text-slate-400 uppercase tracking-widest">{item.unit}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentInventoryView;