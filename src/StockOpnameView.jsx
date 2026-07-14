import React, { useState, useMemo, useEffect } from 'react';
import { 
    ClipboardList, Search, Save, AlertTriangle, CheckCircle, 
    RefreshCcw, Box, EyeOff, Send, ShieldAlert, Check, X, 
    ChevronDown, ChevronUp, Clock, User
} from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, doc, writeBatch, serverTimestamp, query, where, orderBy } from "firebase/firestore";

// --- FINANCIAL FORMATTER ---
const formatRupiah = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const StockOpnameView = ({ inventory, db, appId, user, isAdmin, logAudit, triggerCapy }) => {
    
    // 🚀 THE INTERNAL CLEARANCE MATRIX (God-Mode Bypass)
    const isHighCommand = useMemo(() => {
        if (isAdmin === true) return true; // Inherit if App.jsx correctly flags it
        if (!user) return false;
        
        // Check Tier Authorization (Tier 1, 2, 3)
        const tierNum = Number(user.tier);
        if (!isNaN(tierNum) && tierNum > 0 && tierNum <= 3) return true;
        
        // Check Role Authorization
        const role = String(user.role || user.userRole || '').toUpperCase();
        return ['ADMIN', 'COMPANY_OWNER', 'DEVELOPER', 'OWNER', 'HQ', 'HQ SALES MANAGER'].includes(role);
    }, [isAdmin, user]);

    // --- CORE STATE ---
    const [viewMode, setViewMode] = useState('count'); // 'count' for worksheet, 'review' for HQ Command
    
    // --- COUNT WORKSHEET STATE (For Agents & Admins) ---
    const [search, setSearch] = useState("");
    const [counts, setCounts] = useState({}); 
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- HQ RECONCILIATION STATE (For Admins Only) ---
    const [pendingAudits, setPendingAudits] = useState([]);
    const [expandedAudit, setExpandedAudit] = useState(null);
    const [isProcessingAudit, setIsProcessingAudit] = useState(false);

    // ==========================================
    // ENGINE 1: THE HQ RECONCILIATION FETCH
    // ==========================================
    const fetchPendingAudits = async () => {
        if (!isHighCommand || !db || !appId || !user) return;
        try {
            const userId = user.uid || user.id;
            const auditsRef = collection(db, `artifacts/${appId}/users/${userId}/pending_audits`);
            // Fetch only pending audits
            const q = query(auditsRef, where("status", "==", "PENDING_HQ_APPROVAL"));
            const snap = await getDocs(q);
            
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort by newest first
            fetched.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            
            setPendingAudits(fetched);
        } catch (error) {
            console.error("Failed to fetch pending audits:", error);
        }
    };

    // Auto-fetch if Admin switches to Review Mode
    useEffect(() => {
        if (isHighCommand && viewMode === 'review') {
            fetchPendingAudits();
        }
    }, [isHighCommand, viewMode]);

    // ==========================================
    // ENGINE 2: THE PAYLOAD SUBMITTER (Field -> HQ)
    // ==========================================
    const handleCountChange = (id, value) => {
        setCounts(prev => {
            const newCounts = { ...prev };
            if (value === "") delete newCounts[id]; 
            else newCounts[id] = parseInt(value); 
            return newCounts;
        });
    };

    const getVariance = (item) => counts[item.id] === undefined ? 0 : counts[item.id] - item.stock;

    const handleCommit = async () => {
        const countedItems = inventory.filter(i => counts[i.id] !== undefined);
        if (countedItems.length === 0) return alert("No items counted! Please enter at least one physical count.");
        if (!window.confirm(`Submit Stock Opname for ${countedItems.length} items to HQ for verification?`)) return;

        setIsSubmitting(true);
        try {
            const userId = user.uid || user.id;
            const auditPayload = {
                agentId: userId,
                agentName: user.displayName || user.email?.split('@')[0] || "Agent",
                timestamp: serverTimestamp(),
                status: 'PENDING_HQ_APPROVAL',
                items: countedItems.map(item => ({
                    productId: item.id,
                    name: item.name,
                    expectedStock: item.stock,
                    physicalCount: counts[item.id],
                    variance: counts[item.id] - item.stock
                }))
            };

            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/pending_audits`), auditPayload);

            if (logAudit) await logAudit("STOCK_OPNAME_SUBMITTED", `Agent submitted blind count for ${countedItems.length} items to HQ.`);
            if (triggerCapy) triggerCapy(`Audit Payload sent to HQ! Awaiting Commander approval. 📡`);

            setCounts({});
            alert("✅ Physical Count submitted to HQ successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to submit audit payload to HQ.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // ENGINE 3: THE HQ EXECUTION (Approve / Reject)
    // ==========================================
    const handleApproveAudit = async (audit) => {
        if (!window.confirm(`APPROVE AUDIT: This will permanently overwrite the master inventory to match ${audit.agentName}'s physical count. Proceed?`)) return;
        setIsProcessingAudit(true);
        try {
            const userId = user.uid || user.id;
            const batch = writeBatch(db);

            // 1. Update all actual inventory items
            audit.items.forEach(item => {
                const itemRef = doc(db, `artifacts/${appId}/users/${userId}/inventory`, item.productId);
                batch.update(itemRef, { stock: item.physicalCount });
            });

            // 2. Mark audit as approved
            const auditRef = doc(db, `artifacts/${appId}/users/${userId}/pending_audits`, audit.id);
            batch.update(auditRef, { 
                status: 'APPROVED', 
                resolvedAt: serverTimestamp(),
                resolvedBy: user.email?.split('@')[0]
            });

            await batch.commit();
            
            if (logAudit) await logAudit("STOCK_OPNAME_APPROVED", `Approved stock audit from ${audit.agentName}. Inventory overwritten.`);
            if (triggerCapy) triggerCapy(`Audit Approved! Master Vault updated. 🔒`);
            
            setExpandedAudit(null);
            fetchPendingAudits();
        } catch (error) {
            console.error(error);
            alert("Failed to approve audit. Check console.");
        } finally {
            setIsProcessingAudit(false);
        }
    };

    const handleRejectAudit = async (audit) => {
        const reason = window.prompt("Reason for rejection (sent back to agent):");
        if (reason === null) return; // cancelled

        setIsProcessingAudit(true);
        try {
            const userId = user.uid || user.id;
            const auditRef = doc(db, `artifacts/${appId}/users/${userId}/pending_audits`, audit.id);
            
            await updateDoc(auditRef, { 
                status: 'REJECTED', 
                rejectReason: reason || "Discrepancy too high. Please recount.",
                resolvedAt: serverTimestamp(),
                resolvedBy: user.email?.split('@')[0]
            });

            if (logAudit) await logAudit("STOCK_OPNAME_REJECTED", `Rejected stock audit from ${audit.agentName}.`);
            
            setExpandedAudit(null);
            fetchPendingAudits();
        } catch (error) {
            console.error(error);
            alert("Failed to reject audit.");
        } finally {
            setIsProcessingAudit(false);
        }
    };

    const filteredItems = useMemo(() => inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase())), [inventory, search]);

    return (
        <div className="h-full flex flex-col animate-fade-in space-y-4">
            {/* 🚀 HEADER & HQ NAVIGATION CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        {viewMode === 'count' ? (
                            <><ClipboardList size={24} className="text-orange-500"/> Stock Opname</>
                        ) : (
                            <><ShieldAlert size={24} className="text-blue-500"/> HQ Recon Board</>
                        )}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-2">
                        {viewMode === 'count' ? 'PHYSICAL COUNT RECONCILIATION' : 'PENDING AUDIT COMMAND CENTER'}
                        {!isHighCommand && <span className="bg-red-900/30 text-red-500 border border-red-500/50 px-2 py-0.5 rounded text-[9px] font-black tracking-widest flex items-center gap-1"><EyeOff size={10}/> BLIND COUNT ENFORCED</span>}
                        {isHighCommand && <span className="bg-blue-900/30 text-blue-500 border border-blue-500/50 px-2 py-0.5 rounded text-[9px] font-black tracking-widest flex items-center gap-1"><ShieldAlert size={10}/> COMMANDER CLEARED</span>}
                    </p>
                </div>
                
                {/* ADMIN TAB SWITCHER */}
                {isHighCommand && (
                    <div className="flex bg-slate-200 dark:bg-slate-900 rounded-lg p-1 border dark:border-slate-700">
                        <button 
                            onClick={() => setViewMode('review')} 
                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'review' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                        >
                            <ShieldAlert size={14}/> HQ Audits
                            {pendingAudits.length > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{pendingAudits.length}</span>}
                        </button>
                        <button 
                            onClick={() => setViewMode('count')} 
                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'count' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                        >
                            <ClipboardList size={14}/> New Count
                        </button>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* VIEW MODE 1: THE HQ RECONCILIATION BOARD (ADMIN ONLY)    */}
            {/* ======================================================== */}
            {viewMode === 'review' && isHighCommand && (
                <div className="flex-1 flex flex-col min-h-0">
                    
                    {/* 🚀 THE FINANCIAL SHRINKAGE MATRIX (MACRO DASHBOARD) */}
                    {pendingAudits.length > 0 && (
                        <div className="mb-4 bg-slate-900 border-2 border-red-500/50 rounded-xl p-4 shadow-[0_0_20px_rgba(220,38,38,0.1)] shrink-0">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ShieldAlert size={14} className="text-red-500"/> Global Shrinkage Analysis
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {(() => {
                                    let globalAssetLoss = 0; let globalMissedRev = 0;
                                    pendingAudits.forEach(audit => {
                                        audit.items.forEach(item => {
                                            if (item.variance < 0) { // Only calculate missing items
                                                const master = inventory.find(inv => inv.id === item.productId) || {};
                                                const hpp = Number(master.hpp || master.costPrice || master.modal || 0);
                                                const ecer = Number(master.ecer || master.price || master.harga || master.retailPrice || 0);
                                                globalAssetLoss += Math.abs(item.variance) * hpp;
                                                globalMissedRev += Math.abs(item.variance) * ecer;
                                            }
                                        });
                                    });
                                    return (
                                        <>
                                            <div className="bg-red-950/30 p-3 rounded-lg border border-red-900/50">
                                                <p className="text-[9px] text-red-400 uppercase font-black tracking-widest mb-1">True Asset Loss (HPP)</p>
                                                <p className="text-xl font-black text-red-500">{formatRupiah(globalAssetLoss)}</p>
                                                <p className="text-[9px] text-slate-500 mt-1 uppercase">Reportable Tax Write-Off</p>
                                            </div>
                                            <div className="bg-orange-950/30 p-3 rounded-lg border border-orange-900/50">
                                                <p className="text-[9px] text-orange-400 uppercase font-black tracking-widest mb-1">Revenue Leakage (Ecer)</p>
                                                <p className="text-xl font-black text-orange-500">{formatRupiah(globalMissedRev)}</p>
                                                <p className="text-[9px] text-slate-500 mt-1 uppercase">Lost Profit Opportunity</p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* 🚀 PENDING AUDITS LIST */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-4">
                        {pendingAudits.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-3">
                                <CheckCircle size={48} className="text-emerald-500"/>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No pending audits from the field.</p>
                            </div>
                        ) : (
                            pendingAudits.map(audit => {
                                const isExpanded = expandedAudit === audit.id;
                                
                                let totalMissingUnits = 0; let localAssetLoss = 0; let localMissedRev = 0;
                                audit.items.forEach(item => {
                                    if (item.variance < 0) {
                                        totalMissingUnits += Math.abs(item.variance);
                                        const master = inventory.find(inv => inv.id === item.productId) || {};
                                        localAssetLoss += Math.abs(item.variance) * Number(master.hpp || master.costPrice || master.modal || 0);
                                        localMissedRev += Math.abs(item.variance) * Number(master.ecer || master.price || master.harga || master.retailPrice || 0);
                                    }
                                });

                                let displayTime = "Unknown Time";
                                if (audit.timestamp?.seconds) displayTime = new Date(audit.timestamp.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

                                return (
                                    <div key={audit.id} className={`bg-white dark:bg-slate-900 border rounded-xl overflow-hidden transition-all ${totalMissingUnits > 0 ? 'dark:border-red-500/50' : 'dark:border-emerald-500/50'}`}>
                                        <div onClick={() => setExpandedAudit(isExpanded ? null : audit.id)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${totalMissingUnits > 0 ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                                    {totalMissingUnits > 0 ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                                                        <User size={14} className="text-blue-500"/> {audit.agentName.toUpperCase()}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-1">
                                                        <Clock size={12}/> {displayTime}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden md:block">
                                                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Loss (HPP)</p>
                                                    <p className={`font-black text-sm ${totalMissingUnits > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        {totalMissingUnits > 0 ? formatRupiah(localAssetLoss) : 'PERFECT'}
                                                    </p>
                                                </div>
                                                {isExpanded ? <ChevronUp size={20} className="text-slate-500"/> : <ChevronDown size={20} className="text-slate-500"/>}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 p-4">
                                                
                                                {/* REGIONAL MANAGER REPORT CARD */}
                                                {totalMissingUnits > 0 && (
                                                    <div className="mb-4 bg-slate-800/50 border border-slate-700 p-3 rounded-lg flex justify-between items-center">
                                                        <div>
                                                            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-widest">Manager Accountability</span>
                                                            <span className="font-mono text-xs text-orange-400">Missed Revenue: {formatRupiah(localMissedRev)}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-widest">Missing Boxes</span>
                                                            <span className="font-black text-red-500 text-lg">{totalMissingUnits}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Itemized Discrepancy Report</h4>
                                                
                                                <div className="space-y-2 mb-4 max-h-[35vh] overflow-y-auto custom-scrollbar pr-2">
                                                    {audit.items.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-xs dark:text-white uppercase">{item.name}</span>
                                                                <span className="text-[9px] text-slate-500 font-mono">ID: {item.productId}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-xs font-mono">
                                                                <div className="text-center">
                                                                    <span className="block text-[8px] text-slate-400">SYS</span>
                                                                    <span className="font-bold text-slate-600 dark:text-slate-300">{item.expectedStock}</span>
                                                                </div>
                                                                <span className="text-slate-600 dark:text-slate-500">→</span>
                                                                <div className="text-center">
                                                                    <span className="block text-[8px] text-slate-400">REAL</span>
                                                                    <span className="font-black text-blue-500">{item.physicalCount}</span>
                                                                </div>
                                                                <div className={`w-12 text-right font-black ${item.variance > 0 ? 'text-emerald-500' : item.variance < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                                                    {item.variance > 0 ? '+' : ''}{item.variance}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex gap-3 pt-2 border-t dark:border-slate-700">
                                                    <button onClick={() => handleRejectAudit(audit)} disabled={isProcessingAudit} className="flex-1 bg-red-950/30 hover:bg-red-900 border border-red-500/50 text-red-500 hover:text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors uppercase tracking-widest">
                                                        <X size={14}/> Reject Count
                                                    </button>
                                                    <button onClick={() => handleApproveAudit(audit)} disabled={isProcessingAudit} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-colors uppercase tracking-widest">
                                                        <Check size={16}/> Approve & Overwrite Vault
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}



            {/* ======================================================== */}
            {/* VIEW MODE 2: THE COUNT WORKSHEET (AGENTS & ADMINS)       */}
            {/* ======================================================== */}
            {viewMode === 'count' && (
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-700 shadow-inner overflow-hidden flex flex-col relative animate-fade-in">
                    
                    {/* HQ SEARCH BAR */}
                    <div className="p-3 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 relative">
                        <input 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            placeholder="Scan or Search Product..." 
                            className="bg-white dark:bg-slate-900 border dark:border-slate-600 pl-9 pr-4 py-2 rounded-lg text-sm w-full focus:border-orange-500 outline-none dark:text-white"
                        />
                        <Search size={16} className="absolute left-6 top-5 text-slate-400"/>
                    </div>

                    {!isHighCommand && (
                        <div className="absolute top-20 right-0 p-3 opacity-10 pointer-events-none">
                            <EyeOff size={120} className="text-slate-500"/>
                        </div>
                    )}

                    <div className="overflow-y-auto flex-1 z-10 relative custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold sticky top-0 z-10 shadow-sm text-[10px] tracking-widest">
                                <tr>
                                    <th className="p-4">Product Name</th>
                                    {isHighCommand && <th className="p-4 w-32 text-center">System</th>}
                                    <th className="p-4 w-32 text-center">Actual Count</th>
                                    {isHighCommand && <th className="p-4 w-24 text-center">Status</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredItems.map(item => {
                                    const actual = counts[item.id] !== undefined ? counts[item.id] : '';
                                    const variance = getVariance(item);
                                    const hasEntry = counts[item.id] !== undefined;
                                    const isMatch = hasEntry && variance === 0;
                                    const isMismatch = hasEntry && variance !== 0;

                                    return (
                                        <tr key={item.id} className={`group transition-colors hover:bg-slate-100 dark:hover:bg-white/10 ${isHighCommand && isMismatch ? 'bg-red-50/50 dark:bg-red-900/10' : ''} ${isHighCommand && isMatch ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                                            <td className="p-4">
                                                <div className="font-bold dark:text-white uppercase">{item.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">ID: {item.id}</div>
                                            </td>
                                            
                                            {/* SYSTEM STOCK (HIDDEN FROM AGENTS) */}
                                            {isHighCommand && (
                                                <td className="p-4 text-center">
                                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-mono font-bold">
                                                        {item.stock}
                                                    </span>
                                                </td>
                                            )}

                                            <td className="p-4 text-center">
                                                <input 
                                                    type="number" 
                                                    placeholder="-"
                                                    value={actual}
                                                    onChange={(e) => handleCountChange(item.id, e.target.value)}
                                                    className={`w-20 text-center p-2 rounded border-2 outline-none font-bold text-lg font-mono ${
                                                        isHighCommand && isMismatch ? 'border-red-400 bg-red-50 text-red-600' : 
                                                        isHighCommand && isMatch ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 
                                                        hasEntry ? 'border-orange-500 bg-orange-500/10 text-orange-500' :
                                                        'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:border-orange-500'
                                                    }`}
                                                />
                                            </td>
                                            
                                            {/* VARIANCE & STATUS (HIDDEN FROM AGENTS) */}
                                            {isHighCommand && (
                                                <td className="p-4 text-center flex flex-col items-center justify-center">
                                                    {hasEntry && variance !== 0 && (
                                                        <span className={`font-black text-xs ${variance > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {variance > 0 ? '+' : ''}{variance}
                                                        </span>
                                                    )}
                                                    {isMismatch && <AlertTriangle size={14} className="text-red-500 mt-1 animate-pulse"/>}
                                                    {isMatch && <CheckCircle size={14} className="text-emerald-500 mt-1"/>}
                                                    {!hasEntry && <Box size={14} className="text-slate-200 dark:text-slate-700"/>}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 z-10 relative">
                        <div className="text-xs text-slate-500 font-bold uppercase w-full md:w-auto text-center md:text-left">
                            {Object.keys(counts).length} items counted
                        </div>
                        <div className="flex w-full md:w-auto gap-3">
                            <button 
                                onClick={() => setCounts({})}
                                className="flex-1 md:flex-none justify-center px-4 py-3 md:py-2 text-slate-500 hover:text-red-500 font-bold text-xs flex items-center gap-2 transition-colors bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg md:border-none md:bg-transparent"
                            >
                                <RefreshCcw size={14}/> Reset Form
                            </button>
                            <button 
                                onClick={handleCommit}
                                disabled={isSubmitting || Object.keys(counts).length === 0}
                                className="flex-1 md:flex-none justify-center bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 md:py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 tracking-widest uppercase text-xs"
                            >
                                {isSubmitting ? <RefreshCcw size={16} className="animate-spin"/> : <Send size={16}/>}
                                Submit to HQ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockOpnameView;