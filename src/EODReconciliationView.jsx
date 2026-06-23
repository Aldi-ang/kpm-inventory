import React, { useMemo, useState, useEffect } from 'react';
import { ShieldCheck, Wallet, Truck, CheckCircle, Upload, AlertCircle, Clock, DollarSign, Package, XCircle, Tag } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

// 🚀 ACCEPT 'samplings' PROP HERE
const EODReconciliationView = ({ samplings = [], transactions = [], inventory = [], agentCanvas = [], agentProfileId, motorists = [], eodReports = [], user, onSubmitEOD, onVerifyEOD, onResetEOD, isAdmin }) => {
    
    // 🚀 NEW STATE: Editable Cukai Handover Input
    const [cukaiInput, setCukaiInput] = useState("");

    // --- AGENT LOGIC: Calculate Today's Expected Setoran ---
    const agentData = useMemo(() => {
        if (isAdmin) return null;
        
        const today = new Date();
        let expectedCash = 0;
        let expectedTransfer = 0;
        
        // 🚀 NEW: READ PERMANENT CUKAI DEBT FROM PROFILE
        const isBossCar = !agentProfileId || agentProfileId === 'ADMIN_VEHICLE' || agentProfileId === 'VAULT';
        let expectedCukai = 0;
        if (!isBossCar && agentProfileId) {
            const rawDebt = motorists.find(m => m.id === agentProfileId)?.cukaiDebt || 0;
            expectedCukai = Math.max(0, Math.ceil(rawDebt));
        }

        // 🚀 CUKAI ENGINE: Look up samples given by this agent today (Used only for UI breakdown)
        const todaysSamplings = samplings.filter(s => {
            // Boss Car Ghost Bug Fix
            const isBossCar = !agentProfileId || agentProfileId === 'ADMIN_VEHICLE' || agentProfileId === 'VAULT';
            const matchesAgent = isBossCar ? (s.sourceId === agentProfileId || s.sourceId === 'VAULT' || s.sourceId === 'ADMIN_VEHICLE') : (s.sourceId === agentProfileId);

            if (!matchesAgent) return false;
            const sDate = s.timestamp?.seconds ? new Date(s.timestamp.seconds * 1000) : new Date(s.date);
            return sDate.toDateString() === today.toDateString();
        });

        todaysSamplings.forEach(s => {
            expectedCukai += Math.ceil(s.qty); // Every fraction of a pack opened costs 1 Cukai
        });

        // 1. Find all transactions done by this specific agent TODAY using their exact ID
        const todaysTrans = transactions.filter(t => {
            const isBossCar = !agentProfileId || agentProfileId === 'ADMIN_VEHICLE' || agentProfileId === 'VAULT';
            const matchesAgent = isBossCar ? (t.agentId === agentProfileId || !t.agentId || t.agentId === 'VAULT' || t.agentId === 'ADMIN_VEHICLE') : (t.agentId === agentProfileId);

            if (!matchesAgent) return false;
            const tDate = t.timestamp ? new Date(t.timestamp.seconds * 1000) : new Date(t.date);
            return tDate.toDateString() === today.toDateString();
        });

        // 2. Sum up the Cash and Transfers
        todaysTrans.forEach(t => {
            const amount = t.amountPaid !== undefined ? t.amountPaid : (t.total || 0);
            const method = t.paymentType || t.method || 'Cash';
            
            if ((t.type === 'SALE' && method !== 'Titip') || t.type === 'CONSIGNMENT_PAYMENT') {
                if (method === 'Transfer' || method === 'QRIS') expectedTransfer += amount;
                else expectedCash += amount;
            }
        });

        // 3. Check if already submitted today
        const hasSubmittedToday = eodReports.some(r => {
            if (r.agentId !== agentProfileId) return false;
            const rDate = r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000) : new Date(r.timestamp);
            return rDate.toDateString() === today.toDateString();
        });

        const pendingReport = eodReports.find(r => r.agentId === agentProfileId && r.status === 'PENDING');

        // 4. Return the Live Agent Canvas + Cukai + Samplings Breakdown
        return { expectedCash, expectedTransfer, expectedCukai, activeStock: agentCanvas || [], todaysSamplings, hasSubmittedToday, pendingReport };
    }, [samplings, transactions, agentProfileId, agentCanvas, eodReports, isAdmin]);

    useEffect(() => {
        if (agentData && cukaiInput === "") {
            setCukaiInput(agentData.expectedCukai);
        }
    }, [agentData, cukaiInput]);

    // --- ADMIN LOGIC: View Pending Reports ---
    const pendingReports = useMemo(() => {
        if (!isAdmin) return [];
        return eodReports.filter(r => r.status === 'PENDING').sort((a,b) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
        });
    }, [eodReports, isAdmin]);

    // 🚀 NEW: EOD HISTORY GROUPING ENGINE
    const groupedVerifiedReports = useMemo(() => {
        if (!isAdmin) return [];
        
        // Sort all verified reports from newest to oldest
        const verified = eodReports.filter(r => r.status === 'VERIFIED').sort((a,b) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
        });
        
        // Group them by clear Date strings (e.g., "23 June 2026")
        const groupsMap = {};
        verified.forEach(report => {
            const dateObj = report.timestamp?.seconds ? new Date(report.timestamp.seconds * 1000) : new Date();
            const dateKey = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            
            if (!groupsMap[dateKey]) groupsMap[dateKey] = [];
            groupsMap[dateKey].push(report);
        });
        
        // Convert map to array to preserve the newest-first sorting
        return Object.keys(groupsMap).map(date => ({
            date,
            reports: groupsMap[date]
        }));
    }, [eodReports, isAdmin]);


    return (
        <div className="animate-fade-in space-y-6 max-w-7xl mx-auto p-2">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <ShieldCheck className="text-emerald-500" size={32}/> EOD Setoran
                    </h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2">End of Day Reconciliation & Vault Return</p>
                </div>
            </div>

            {/* ========================================= */}
            {/* ============ AGENT VIEW ================= */}
            {/* ========================================= */}
            {!isAdmin && agentData && (
                <div className="space-y-6 max-w-3xl mx-auto">
                    {agentData.pendingReport ? (
                        <div className="bg-orange-950/30 border border-orange-500/50 p-8 rounded-2xl text-center shadow-xl relative overflow-hidden">
                            <Clock className="mx-auto text-orange-500 mb-4 animate-pulse" size={48}/>
                            <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Report Submitted</h3>
                            <p className="text-orange-200 text-sm">Waiting for Admin to verify your cash and clear your inventory.</p>
                        </div>
                    ) : agentData.hasSubmittedToday ? (
                        <div className="bg-emerald-950/30 border border-emerald-500/50 p-8 rounded-2xl text-center shadow-xl">
                            <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48}/>
                            <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Shift Closed</h3>
                            <p className="text-emerald-200 text-sm">Your EOD report was verified. Your inventory is clear and ready for tomorrow.</p>
                        </div>
                    ) : (
                        <div className="bg-black/20 border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest border-b border-white/10 pb-4 mb-6 flex items-center gap-2"><Wallet className="text-emerald-500"/> Today's Expected Setoran</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full"></div>
                                    <p className="text-[10px] text-emerald-400 uppercase tracking-widest mb-1">Physical Cash</p>
                                    <p className="text-3xl font-black text-emerald-500">{formatRupiah(agentData.expectedCash)}</p>
                                </div>
                                <div className="bg-blue-950/20 border border-blue-500/30 p-4 rounded-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full"></div>
                                    <p className="text-[10px] text-blue-400 uppercase tracking-widest mb-1">Digital Transfers</p>
                                    <p className="text-3xl font-black text-blue-500">{formatRupiah(agentData.expectedTransfer)}</p>
                                </div>
                                <div className="bg-orange-950/20 border border-orange-500/30 p-4 rounded-xl relative overflow-hidden shadow-inner">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full"></div>
                                    <p className="text-[10px] text-orange-400 uppercase tracking-widest mb-2">Pita Cukai (Tax Stamps)</p>
                                    <div className="flex items-end gap-2 relative z-10">
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={cukaiInput}
                                            onChange={(e) => setCukaiInput(e.target.value)}
                                            className="w-16 bg-black/50 border border-orange-500/50 text-orange-500 font-black text-3xl text-center rounded outline-none focus:border-orange-500 py-1"
                                        />
                                        <span className="text-sm font-bold text-orange-400/50 mb-1">Pcs</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-orange-400/60 mt-2 uppercase tracking-wider">Total Owed: {agentData.expectedCukai} Pcs</p>
                                </div>
                            </div>

                            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Truck className="text-orange-500"/> Goods Remaining in Inventory</h3>
                            <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden mb-8">
                                {agentData.activeStock.length === 0 ? (
                                    <p className="text-center p-6 text-slate-500 text-xs uppercase tracking-widest">Inventory is empty.</p>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white/5 text-slate-400 text-[10px] uppercase tracking-widest">
                                            <tr><th className="p-3">Product</th><th className="p-3 text-right">Qty to Return</th></tr>
                                        </thead>
                                        <tbody>
                                            {agentData.activeStock.map((item, idx) => {
                                                const productInfo = inventory?.find(p => p.id === item.productId) || {};
                                                
                                                // Convert base units to decimal Bks first
                                                let mult = 1;
                                                if (item.unit === 'Slop') mult = productInfo.packsPerSlop || 10;
                                                if (item.unit === 'Bal') mult = (productInfo.slopsPerBal || 20) * (productInfo.packsPerSlop || 10);
                                                if (item.unit === 'Karton') mult = (productInfo.balsPerCarton || 4) * (productInfo.slopsPerBal || 20) * (productInfo.packsPerSlop || 10);
                                                
                                                const totalBksDecimal = item.qty * mult;
                                                
                                                // Convert decimal Bks to physical Bks/Btg
                                                const sp = productInfo.sticksPerPack || 16;
                                                const physicalBks = Math.floor(totalBksDecimal);
                                                const physicalBtg = Math.round((totalBksDecimal - physicalBks) * sp);
                                                
                                                let displayQty = '';
                                                if (physicalBks > 0) displayQty += `${physicalBks} Bks `;
                                                if (physicalBtg > 0) displayQty += `${physicalBtg} Btg`;
                                                if (displayQty === '') displayQty = '0 Bks';

                                                return (
                                                    <tr key={idx} className="border-t border-white/5">
                                                        <td className="p-3 font-bold text-white">{item.name}</td>
                                                        <td className="p-3 text-right font-black text-orange-400">{displayQty.trim()}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* 🚀 NEW: PITA CUKAI HANDOVER BREAKDOWN */}
                            {agentData.expectedCukai > 0 && agentData.todaysSamplings && agentData.todaysSamplings.length > 0 && (
                                <div className="bg-orange-950/20 border border-orange-500/30 rounded-xl p-4 mb-8">
                                    <h4 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Tag size={14}/> Pita Cukai Details to Hand Over</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {agentData.todaysSamplings.map((sample, idx) => {
                                            const sp = sample.sticksPerPack || 16;
                                            const physicalBks = Math.floor(sample.qty || 0);
                                            const physicalBtg = Math.round(((sample.qty || 0) - physicalBks) * sp);
                                            let displayQty = '';
                                            if (physicalBks > 0) displayQty += `${physicalBks} Bks `;
                                            if (physicalBtg > 0) displayQty += `${physicalBtg} Btg`;

                                            return (
                                                <span key={`cukai-${idx}`} className="text-[10px] bg-orange-900/40 text-orange-200 px-2 py-1 rounded border border-orange-500/50 shadow-inner">
                                                    {sample.productName}: <strong className="text-white">{displayQty.trim() || '0 Bks'}</strong>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={() => onSubmitEOD({ cash: agentData.expectedCash, transfer: agentData.expectedTransfer, cukai: parseInt(cukaiInput) || 0, remainingStock: agentData.activeStock, deployedSamples: agentData.todaysSamplings })}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                            >
                                <Upload size={20}/> Submit EOD Report
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================= */}
            {/* ============ ADMIN VIEW ================= */}
            {/* ========================================= */}
            {isAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* LEFT: PENDING REPORTS */}
                    <div>
                        <h3 className="font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4"><AlertCircle className="text-orange-500"/> Pending Verification ({pendingReports.length})</h3>
                        <div className="space-y-4">
                            {pendingReports.length === 0 ? (
                                <div className="bg-black/20 border border-white/10 p-8 rounded-2xl text-center text-slate-500 text-xs uppercase tracking-widest">No pending reports.</div>
                            ) : pendingReports.map(report => (
                                <div key={report.id} className="bg-black/40 border border-orange-500/30 rounded-2xl overflow-hidden shadow-lg">
                                    <div className="p-4 bg-orange-950/20 flex justify-between items-center border-b border-orange-500/20">
                                        <div>
                                            <h4 className="font-black text-white text-lg">{report.agentName}</h4>
                                            <p className="text-[10px] text-slate-400">
                                                {report.timestamp?.seconds ? new Date(report.timestamp.seconds * 1000).toLocaleTimeString() : ''}
                                            </p>
                                        </div>
                                        <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest animate-pulse">Action Required</span>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><DollarSign size={14}/> Physical Cash</span>
                                            <span className="text-xl font-black text-emerald-500">{formatRupiah(report.cash)}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Wallet size={14}/> Digital Transfer</span>
                                            <span className="text-xl font-black text-blue-500">{formatRupiah(report.transfer)}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-orange-950/20 p-3 rounded-lg border border-orange-500/30">
                                            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2"><Tag size={14}/> Pita Cukai Owed</span>
                                            <span className="text-xl font-black text-orange-500">{report.cukai || 0} Pcs</span>
                                        </div>
                                        
                                        <div className="pt-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Package size={12}/> Inventory to Vault</p>
                                            <div className="flex flex-wrap gap-2">
                                                {report.remainingStock && report.remainingStock.length > 0 ? report.remainingStock.map((item, idx) => {
                                                    const productInfo = inventory?.find(p => p.id === item.productId) || {};
                                                    
                                                    // Convert base units to decimal Bks first
                                                    let mult = 1;
                                                    if (item.unit === 'Slop') mult = productInfo.packsPerSlop || 10;
                                                    if (item.unit === 'Bal') mult = (productInfo.slopsPerBal || 20) * (productInfo.packsPerSlop || 10);
                                                    if (item.unit === 'Karton') mult = (productInfo.balsPerCarton || 4) * (productInfo.slopsPerBal || 20) * (productInfo.packsPerSlop || 10);
                                                    
                                                    const totalBksDecimal = item.qty * mult;
                                                    
                                                    // Convert decimal Bks to physical Bks/Btg
                                                    const sp = productInfo.sticksPerPack || 16;
                                                    const physicalBks = Math.floor(totalBksDecimal);
                                                    const physicalBtg = Math.round((totalBksDecimal - physicalBks) * sp);
                                                    
                                                    let displayQty = '';
                                                    if (physicalBks > 0) displayQty += `${physicalBks} Bks `;
                                                    if (physicalBtg > 0) displayQty += `${physicalBtg} Btg`;
                                                    if (displayQty === '') displayQty = '0 Bks';

                                                    return (
                                                        <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded border border-white/10">
                                                            {item.name}: <strong className="text-orange-400">{displayQty.trim()}</strong>
                                                        </span>
                                                    );
                                                }) : <span className="text-[10px] text-slate-500 italic">No stock to return.</span>}
                                            </div>
                                        </div>

                                        {/* 🚀 NEW: ADMIN PITA CUKAI VERIFICATION BREAKDOWN */}
                                        {report.deployedSamples && report.deployedSamples.length > 0 && (
                                            <div className="pt-2 border-t border-white/10 mt-3">
                                                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Tag size={12}/> Pita Cukai Breakdown</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {report.deployedSamples.map((sample, idx) => {
                                                        const sp = sample.sticksPerPack || 16;
                                                        const physicalBks = Math.floor(sample.qty || 0);
                                                        const physicalBtg = Math.round(((sample.qty || 0) - physicalBks) * sp);
                                                        let displayQty = '';
                                                        if (physicalBks > 0) displayQty += `${physicalBks} Bks `;
                                                        if (physicalBtg > 0) displayQty += `${physicalBtg} Btg`;

                                                        return (
                                                            <span key={`cukai-${idx}`} className="text-[10px] bg-orange-950/30 text-orange-200 px-2 py-1 rounded border border-orange-500/30">
                                                                {sample.productName}: <strong className="text-orange-400">{displayQty.trim() || '0 Bks'}</strong>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-2 mt-4">
                                            <button 
                                                onClick={() => onVerifyEOD(report)}
                                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-transform active:scale-95"
                                            >
                                                <CheckCircle size={18}/> Verify
                                            </button>
                                            
                                            {/* 🚀 THE NEW RESET BUTTON */}
                                            <button 
                                                onClick={() => onResetEOD(report)}
                                                className="flex-1 py-3 bg-red-900/40 hover:bg-red-600 border border-red-500/50 text-red-500 hover:text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95"
                                            >
                                                <XCircle size={18}/> Reset
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: EOD HISTORY LOG */}
                    <div>
                        <h3 className="font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><CheckCircle size={18}/> EOD History Log</h3>
                        
                        <div className="space-y-6 h-[700px] overflow-y-auto custom-scrollbar pr-2 pb-10 relative">
                            {groupedVerifiedReports.length === 0 ? (
                                <div className="text-center p-6 text-slate-600 text-[10px] uppercase tracking-widest border border-dashed border-slate-700 rounded-xl">No history logs found.</div>
                            ) : groupedVerifiedReports.map((group, groupIdx) => (
                                <div key={groupIdx} className="space-y-3 relative">
                                    
                                    {/* STICKY DATE HEADER */}
                                    <div className="sticky top-0 bg-[#161412] z-10 py-2 border-b border-slate-800 shadow-sm">
                                        <span className="bg-emerald-950/40 text-emerald-500 border border-emerald-900/50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            {group.date}
                                        </span>
                                    </div>

                                    {/* REPORTS UNDER THIS DATE */}
                                    {group.reports.map(report => (
                                        <div key={report.id} className="bg-black/20 border border-white/5 p-4 rounded-xl flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
                                            <div>
                                                <h4 className="font-bold text-white">{report.agentName}</h4>
                                                <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-1 font-mono">
                                                    <Clock size={10}/> 
                                                    {report.timestamp?.seconds ? new Date(report.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time'}
                                                </p>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <p className="text-xs font-black text-emerald-500">{formatRupiah(report.cash)}</p>
                                                <p className="text-[9px] text-orange-400 mb-2">Stock & {report.cukai || 0} Cukai Cleared</p>
                                                
                                                {/* 🚀 NEW FORCE RESET BUTTON FOR OLD REPORTS */}
                                                <button 
                                                    onClick={() => onResetEOD(report)}
                                                    className="text-[10px] flex items-center gap-1 bg-red-900/30 hover:bg-red-600 text-red-500 hover:text-white px-2 py-1 rounded border border-red-500/30 transition-all active:scale-95"
                                                >
                                                    <XCircle size={10}/> Force Reset
                                                </button>
                                            </div>
                                        </div>
                                    ))}
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