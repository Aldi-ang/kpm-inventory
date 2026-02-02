import React, { useState, useMemo } from 'react';
import { ClipboardList, Search, Save, AlertTriangle, CheckCircle, RefreshCcw, Box } from 'lucide-react';
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";

const StockOpnameView = ({ inventory, db, appId, user, logAudit, triggerCapy }) => {
    const [search, setSearch] = useState("");
    const [counts, setCounts] = useState({}); // Stores actual counts
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter Items
    const filteredItems = useMemo(() => {
        return inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    }, [inventory, search]);

    // --- FIXED: HANDLE INPUT CHANGE (Allows empty/delete) ---
    const handleCountChange = (id, value) => {
        setCounts(prev => {
            const newCounts = { ...prev };
            if (value === "") {
                delete newCounts[id]; // Remove key so placeholder shows
            } else {
                newCounts[id] = parseInt(value); // Store number
            }
            return newCounts;
        });
    };

    // Calculate Variance
    const getVariance = (item) => {
        if (counts[item.id] === undefined) return 0;
        return counts[item.id] - item.stock;
    };

    // --- EXECUTE ADJUSTMENT ---
    const handleCommit = async () => {
        const itemsToAdjust = inventory.filter(i => counts[i.id] !== undefined && counts[i.id] !== i.stock);
        
        if (itemsToAdjust.length === 0) {
            alert("No discrepancies found to adjust.");
            return;
        }

        if (!window.confirm(`Adjust stock for ${itemsToAdjust.length} items? This cannot be undone.`)) return;

        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            let auditDetails = [];

            itemsToAdjust.forEach(item => {
                const newStock = counts[item.id];
                const variance = newStock - item.stock;
                const ref = doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id);
                
                // 1. Update Stock
                batch.update(ref, { 
                    stock: newStock,
                    lastOpname: serverTimestamp()
                });

                // 2. Prepare Audit String
                auditDetails.push(`${item.name}: ${item.stock} -> ${newStock} (${variance > 0 ? '+' : ''}${variance})`);
            });

            await batch.commit();

            // 3. Log Audit
            if (logAudit) {
                await logAudit("STOCK_OPNAME", `Adjusted ${itemsToAdjust.length} items. Details: ${auditDetails.join(', ')}`);
            }
            
            if (triggerCapy) triggerCapy(`Stock reconciled! ${itemsToAdjust.length} items updated. 📉`);

            // Reset
            setCounts({});
            setIsSubmitting(false);

        } catch (error) {
            console.error("Opname Error:", error);
            alert("Failed to commit adjustments.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full flex flex-col animate-fade-in space-y-4">
            {/* HEADER */}
            <div className="flex justify-between items-end bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <ClipboardList size={24} className="text-orange-500"/> Stock Opname
                    </h2>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                        PHYSICAL COUNT RECONCILIATION
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            placeholder="Scan or Search Product..." 
                            className="bg-white dark:bg-slate-900 border dark:border-slate-600 pl-9 pr-4 py-2 rounded-lg text-sm w-64 focus:border-orange-500 outline-none dark:text-white"
                        />
                        <Search size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                    </div>
                </div>
            </div>

            {/* TABLE CONTAINER */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-700 shadow-inner overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4">Product Name</th>
                                <th className="p-4 w-32 text-center">System Stock</th>
                                <th className="p-4 w-32 text-center">Actual Count</th>
                                <th className="p-4 w-32 text-center">Variance</th>
                                <th className="p-4 w-24 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredItems.map(item => {
                                // --- FIXED: Value is empty string if undefined ---
                                const actual = counts[item.id] !== undefined ? counts[item.id] : '';
                                
                                const variance = getVariance(item);
                                const hasEntry = counts[item.id] !== undefined;
                                const isMatch = hasEntry && variance === 0;
                                const isMismatch = hasEntry && variance !== 0;

                                return (
                                    // --- FIXED: Dark Grey Hover (bg-white/10) ---
                                    <tr key={item.id} className={`group transition-colors hover:bg-slate-100 dark:hover:bg-white/10 ${isMismatch ? 'bg-red-50/50 dark:bg-red-900/10' : ''} ${isMatch ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                                        <td className="p-4">
                                            <div className="font-bold dark:text-white">{item.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{item.id}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-mono font-bold">
                                                {item.stock}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <input 
                                                type="number" 
                                                placeholder="-"
                                                value={actual}
                                                onChange={(e) => handleCountChange(item.id, e.target.value)}
                                                className={`w-20 text-center p-1 rounded border-2 outline-none font-bold ${
                                                    isMismatch ? 'border-red-400 bg-red-50 text-red-600' : 
                                                    isMatch ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 
                                                    'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:border-orange-500'
                                                }`}
                                            />
                                        </td>
                                        <td className="p-4 text-center">
                                            {hasEntry && variance !== 0 && (
                                                <span className={`font-bold ${variance > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {variance > 0 ? '+' : ''}{variance}
                                                </span>
                                            )}
                                            {isMatch && <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="p-4 text-center">
                                            {isMismatch && <AlertTriangle size={18} className="text-red-500 mx-auto animate-pulse"/>}
                                            {isMatch && <CheckCircle size={18} className="text-emerald-500 mx-auto"/>}
                                            {!hasEntry && <Box size={18} className="text-slate-200 dark:text-slate-700 mx-auto"/>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700 flex justify-between items-center">
                    <div className="text-xs text-slate-500 font-bold uppercase">
                        {Object.keys(counts).length} items counted • {Object.values(counts).filter((c, i) => {
                            const itemId = Object.keys(counts)[i];
                            const item = inventory.find(x => x.id === itemId);
                            return item && (c - item.stock) !== 0;
                        }).length} discrepancies
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setCounts({})}
                            className="px-4 py-2 text-slate-500 hover:text-red-500 font-bold text-xs flex items-center gap-2 transition-colors"
                        >
                            <RefreshCcw size={14}/> Reset All
                        </button>
                        <button 
                            onClick={handleCommit}
                            disabled={isSubmitting || Object.keys(counts).length === 0}
                            className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
                        >
                            {isSubmitting ? <RefreshCcw size={16} className="animate-spin"/> : <Save size={16}/>}
                            Finalize Adjustment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockOpnameView;