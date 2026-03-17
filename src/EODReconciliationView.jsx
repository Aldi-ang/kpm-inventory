import React, { useState, useMemo } from 'react';
import { ShieldCheck, Wallet, Truck, CheckCircle, Upload, AlertCircle, Clock, ArrowRight, Store, DollarSign, Package } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

const EODReconciliationView = ({ transactions, inventory, agentInventories, eodReports, user, onSubmitEOD, onVerifyEOD, isAdmin }) => {
    
    // --- AGENT LOGIC: Calculate Today's Expected Setoran ---
    const agentData = useMemo(() => {
        if (isAdmin) return null;
        
        const today = new Date();
        let expectedCash = 0;
        let expectedTransfer = 0;
        
        // 1. Find all transactions done by this agent TODAY
        const todaysTrans = transactions.filter(t => {
            if (t.agentName !== user?.name) return false;
            if (t.timestamp && t.timestamp.seconds) {
                const tDate = new Date(t.timestamp.seconds * 1000);
                return tDate.toDateString() === today.toDateString();
            }
            return false; 
        });

        // 2. Sum up the Cash and Transfers
        todaysTrans.forEach(t => {
            const amount = t.amountPaid !== undefined ? t.amountPaid : (t.total || 0);
            const method = t.paymentType || t.method || 'Cash';
            
            if ((t.type === 'SALE' && method !== 'Titip') || t.type === 'CONSIGNMENT_PAYMENT') {
                if (method === 'Transfer') expectedTransfer += amount;
                else expectedCash += amount;
            }
        });

        // 3. Get remaining van stock
        const myVanStock = agentInventories?.[user?.name] || {};
        const activeStock = Object.entries(myVanStock).filter(([id, qty]) => qty > 0);

        // 4. Check if already submitted today
        const hasSubmittedToday = eodReports.some(r => {
            if (r.agentName !== user?.name) return false;
            const rDate = new Date(r.timestamp);
            return rDate.toDateString() === today.toDateString();
        });

        const pendingReport = eodReports.find(r => r.agentName === user?.name && r.status === 'PENDING');

        return { expectedCash, expectedTransfer, activeStock, hasSubmittedToday, pendingReport };
    }, [transactions, user, agentInventories, eodReports, isAdmin]);


    // --- ADMIN LOGIC: View Pending Reports ---
    const pendingReports = useMemo(() => {
        if (!isAdmin) return [];
        return eodReports.filter(r => r.status === 'PENDING').sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [eodReports, isAdmin]);

    const verifiedReports = useMemo(() => {
        if (!isAdmin) return [];
        return eodReports.filter(r => r.status === 'VERIFIED').sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
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
                            <p className="text-orange-200 text-sm">Waiting for Admin to verify your cash and clear your van's inventory.</p>
                        </div>
                    ) : agentData.hasSubmittedToday ? (
                        <div className="bg-emerald-950/30 border border-emerald-500/50 p-8 rounded-2xl text-center shadow-xl">
                            <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48}/>
                            <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Shift Closed</h3>
                            <p className="text-emerald-200 text-sm">Your EOD report was verified. Your van is clear and ready for tomorrow.</p>
                        </div>
                    ) : (
                        <div className="bg-black/20 border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest border-b border-white/10 pb-4 mb-6 flex items-center gap-2"><Wallet className="text-emerald-500"/> Today's Expected Setoran</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full"></div>
                                    <p className="text-[10px] text-emerald-400 uppercase tracking-widest mb-1">Physical Cash to Hand Over</p>
                                    <p className="text-3xl font-black text-emerald-500">{formatRupiah(agentData.expectedCash)}</p>
                                </div>
                                <div className="bg-blue-950/20 border border-blue-500/30 p-4 rounded-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full"></div>
                                    <p className="text-[10px] text-blue-400 uppercase tracking-widest mb-1">Total Digital Transfers</p>
                                    <p className="text-3xl font-black text-blue-500">{formatRupiah(agentData.expectedTransfer)}</p>
                                </div>
                            </div>

                            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Truck className="text-orange-500"/> Goods Remaining in Van</h3>
                            <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden mb-8">
                                {agentData.activeStock.length === 0 ? (
                                    <p className="text-center p-6 text-slate-500 text-xs uppercase tracking-widest">Van is empty.</p>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white/5 text-slate-400 text-[10px] uppercase tracking-widest">
                                            <tr><th className="p-3">Product</th><th className="p-3 text-right">Qty to Return</th></tr>
                                        </thead>
                                        <tbody>
                                            {agentData.activeStock.map(([productId, qty]) => {
                                                const prod = inventory.find(p => p.id === productId);
                                                return (
                                                    <tr key={productId} className="border-t border-white/5">
                                                        <td className="p-3 font-bold text-white">{prod?.name || 'Unknown Item'}</td>
                                                        <td className="p-3 text-right font-black text-orange-400">{qty} Bks</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <button 
                                onClick={() => onSubmitEOD({ cash: agentData.expectedCash, transfer: agentData.expectedTransfer, remainingStock: agentInventories[user.name] || {} })}
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
                                            <p className="text-[10px] text-slate-400">{new Date(report.timestamp).toLocaleTimeString()}</p>
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
                                        
                                        <div className="pt-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Package size={12}/> Van Stock to Vault</p>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(report.remainingStock || {}).filter(([id, qty]) => qty > 0).map(([id, qty]) => {
                                                    const prod = inventory.find(p => p.id === id);
                                                    return (
                                                        <span key={id} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded border border-white/10">
                                                            {prod?.name || 'Item'}: <strong className="text-orange-400">{qty} Bks</strong>
                                                        </span>
                                                    );
                                                })}
                                                {Object.values(report.remainingStock || {}).every(qty => qty === 0) && <span className="text-[10px] text-slate-500 italic">No stock to return.</span>}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => onVerifyEOD(report)}
                                            className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-transform active:scale-95"
                                        >
                                            <CheckCircle size={18}/> Verify & Clear Agent Van
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: RECENTLY VERIFIED */}
                    <div>
                        <h3 className="font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><CheckCircle size={18}/> Recently Verified</h3>
                        <div className="space-y-3">
                            {verifiedReports.length === 0 ? (
                                <div className="text-center p-6 text-slate-600 text-[10px] uppercase tracking-widest border border-dashed border-slate-700 rounded-xl">No recent logs.</div>
                            ) : verifiedReports.map(report => (
                                <div key={report.id} className="bg-black/20 border border-white/5 p-4 rounded-xl flex justify-between items-center opacity-70">
                                    <div>
                                        <h4 className="font-bold text-white">{report.agentName}</h4>
                                        <p className="text-[9px] text-slate-500">{new Date(report.verifiedAt).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-emerald-500">{formatRupiah(report.cash)}</p>
                                        <p className="text-[9px] text-orange-400">Stock Cleared</p>
                                    </div>
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