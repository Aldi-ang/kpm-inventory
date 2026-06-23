import React, { useMemo, useState, useEffect } from 'react';
import { ShieldCheck, Wallet, Truck, CheckCircle, Upload, AlertCircle, Clock, DollarSign, Package, XCircle, Tag, ChevronDown, ChevronRight, MapPin, User, Calendar, Folder } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

// 🚀 ACCEPT 'appSettings' TO READ TIER 1 PRICE
const EODReconciliationView = ({ samplings = [], transactions = [], inventory = [], agentCanvas = [], agentProfileId, motorists = [], eodReports = [], user, appSettings, onSubmitEOD, onVerifyEOD, onResetEOD, isAdmin }) => {
    
    // 🚀 NEW STATE: Split Cukai Handover Inputs
    const [cukaiReturnedInput, setCukaiReturnedInput] = useState("");
    const [cukaiPaidInput, setCukaiPaidInput] = useState("");

    // 🚀 TIER 1 CONTROLLED PRICE (Defaults to Rp 5.000 if not set)
    const cukaiFinePrice = appSettings?.cukaiFinePrice || 5000;

    // 🚀 ACCORDION STATES FOR HISTORY LOG
    const [openLocations, setOpenLocations] = useState([]);
    const [openAgents, setOpenAgents] = useState([]);
    const [openMonths, setOpenMonths] = useState([]);
    const [openDates, setOpenDates] = useState([]);

    const toggleAccordion = (setter, key) => {
        setter(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    // --- AGENT LOGIC: Calculate Today's Expected Setoran ---
    const agentData = useMemo(() => {
        if (isAdmin) return null;
        
        const today = new Date();
        let expectedCash = 0;
        let expectedTransfer = 0;
        
        const isBossCar = !agentProfileId || agentProfileId === 'ADMIN_VEHICLE' || agentProfileId === 'VAULT';
        let expectedCukai = 0;
        if (!isBossCar && agentProfileId) {
            const rawDebt = motorists.find(m => m.id === agentProfileId)?.cukaiDebt || 0;
            expectedCukai = Math.max(0, Math.ceil(rawDebt));
        }

        const todaysSamplings = samplings.filter(s => {
            const matchesAgent = isBossCar ? (s.sourceId === agentProfileId || s.sourceId === 'VAULT' || s.sourceId === 'ADMIN_VEHICLE') : (s.sourceId === agentProfileId);
            if (!matchesAgent) return false;
            const sDate = s.timestamp?.seconds ? new Date(s.timestamp.seconds * 1000) : new Date(s.date);
            return sDate.toDateString() === today.toDateString();
        });

        const todaysTrans = transactions.filter(t => {
            const matchesAgent = isBossCar ? (t.agentId === agentProfileId || !t.agentId || t.agentId === 'VAULT' || t.agentId === 'ADMIN_VEHICLE') : (t.agentId === agentProfileId);
            if (!matchesAgent) return false;
            const tDate = t.timestamp ? new Date(t.timestamp.seconds * 1000) : new Date(t.date);
            return tDate.toDateString() === today.toDateString();
        });

        todaysTrans.forEach(t => {
            const amount = t.amountPaid !== undefined ? t.amountPaid : (t.total || 0);
            const method = t.paymentType || t.method || 'Cash';
            if ((t.type === 'SALE' && method !== 'Titip') || t.type === 'CONSIGNMENT_PAYMENT') {
                if (method === 'Transfer' || method === 'QRIS') expectedTransfer += amount;
                else expectedCash += amount;
            }
        });

        // 🚀 THE SPLIT WORKFLOW TRACKER
        const todaysReports = eodReports.filter(r => {
            if (r.agentId !== agentProfileId) return false;
            const rDate = r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000) : (r.timestamp ? new Date(r.timestamp) : today);
            return rDate.toDateString() === today.toDateString();
        });

        const pendingCash = todaysReports.find(r => r.status === 'PENDING' && r.reportType === 'CASH_STOCK');
        const verifiedCash = todaysReports.find(r => r.status === 'VERIFIED' && r.reportType === 'CASH_STOCK');
        const pendingCukai = todaysReports.find(r => r.status === 'PENDING' && r.reportType === 'CUKAI');
        const verifiedCukai = todaysReports.find(r => r.status === 'VERIFIED' && r.reportType === 'CUKAI');
        
        const legacyPending = todaysReports.find(r => r.status === 'PENDING' && !r.reportType);
        const legacyVerified = todaysReports.find(r => r.status === 'VERIFIED' && !r.reportType);

        const cashStatus = (pendingCash || legacyPending) ? 'PENDING' : (verifiedCash || legacyVerified) ? 'VERIFIED' : 'READY';
        const cukaiStatus = (pendingCukai || legacyPending) ? 'PENDING' : (verifiedCukai || legacyVerified) ? 'VERIFIED' : 'READY';

        return { expectedCash, expectedTransfer, expectedCukai, activeStock: agentCanvas || [], todaysSamplings, cashStatus, cukaiStatus };
    }, [samplings, transactions, agentProfileId, agentCanvas, eodReports, isAdmin, motorists]);

    useEffect(() => {
        if (agentData && cukaiReturnedInput === "" && cukaiPaidInput === "") {
            setCukaiReturnedInput(agentData.expectedCukai);
            setCukaiPaidInput(0);
        }
    }, [agentData, cukaiReturnedInput, cukaiPaidInput]);

    // --- ADMIN LOGIC: View Pending Reports ---
    const pendingReports = useMemo(() => {
        if (!isAdmin) return [];
        return eodReports.filter(r => r.status === 'PENDING').sort((a,b) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
        });
    }, [eodReports, isAdmin]);

    // --- ADMIN LOGIC: 4-Level History Engine ---
    const structuredHistory = useMemo(() => {
        if (!isAdmin) return {};

        const verified = eodReports.filter(r => r.status === 'VERIFIED').sort((a,b) => {
            const timeA = a.verifiedAt?.seconds || a.timestamp?.seconds || 0;
            const timeB = b.verifiedAt?.seconds || b.timestamp?.seconds || 0;
            return timeB - timeA;
        });

        const tree = {};

        verified.forEach(report => {
            const agent = motorists.find(m => m.id === report.agentId);
            const location = agent?.location || 'HQ / UNASSIGNED';
            const empName = report.agentName || 'Unknown Agent';

            const dateObj = report.verifiedAt?.seconds ? new Date(report.verifiedAt.seconds * 1000) : (report.timestamp?.seconds ? new Date(report.timestamp.seconds * 1000) : new Date());
            const yearMonth = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
            const fullDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

            if (!tree[location]) tree[location] = {};
            if (!tree[location][empName]) tree[location][empName] = {};
            if (!tree[location][empName][yearMonth]) tree[location][empName][yearMonth] = {};
            if (!tree[location][empName][yearMonth][fullDate]) tree[location][empName][yearMonth][fullDate] = [];

            tree[location][empName][yearMonth][fullDate].push(report);
        });

        return tree;
    }, [eodReports, motorists, isAdmin]);


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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* 🚀 CARD 1: FINANCIAL & STOCK HANDOVER */}
                    <div className="bg-black/20 border border-emerald-500/30 rounded-2xl p-6 shadow-xl flex flex-col h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
                        <h3 className="text-lg font-black text-white uppercase tracking-widest border-b border-emerald-500/30 pb-4 mb-6 flex items-center gap-2 relative z-10"><Wallet className="text-emerald-500"/> Cash & Stock</h3>
                        
                        <div className="flex-1">
                            {agentData.cashStatus === 'PENDING' ? (
                                <div className="flex flex-col items-center justify-center h-full py-10 opacity-70">
                                    <Clock className="text-emerald-500 mb-4 animate-pulse" size={40}/>
                                    <h3 className="text-lg font-black text-emerald-400 uppercase tracking-widest mb-1">Awaiting Verification</h3>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest text-center">Hand envelope to Admin.</p>
                                </div>
                            ) : agentData.cashStatus === 'VERIFIED' ? (
                                <div className="flex flex-col items-center justify-center h-full py-10 opacity-70">
                                    <CheckCircle className="text-emerald-500 mb-4" size={40}/>
                                    <h3 className="text-lg font-black text-emerald-400 uppercase tracking-widest mb-1">Shift Closed</h3>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest text-center">Cash & Stock successfully verified.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-emerald-950/30 border border-emerald-500/50 p-4 rounded-xl shadow-inner">
                                            <p className="text-[9px] text-emerald-400 uppercase tracking-widest mb-1">Physical Cash</p>
                                            <p className="text-xl md:text-2xl font-black text-emerald-500">{formatRupiah(agentData.expectedCash)}</p>
                                        </div>
                                        <div className="bg-blue-950/30 border border-blue-500/50 p-4 rounded-xl shadow-inner">
                                            <p className="text-[9px] text-blue-400 uppercase tracking-widest mb-1">Digital Transfers</p>
                                            <p className="text-xl md:text-2xl font-black text-blue-500">{formatRupiah(agentData.expectedTransfer)}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Truck size={14}/> Goods to Return</h4>
                                        <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden">
                                            {agentData.activeStock.length === 0 ? (
                                                <p className="text-center p-4 text-slate-500 text-[10px] uppercase tracking-widest">Inventory is empty.</p>
                                            ) : (
                                                <table className="w-full text-left text-xs">
                                                    <tbody>
                                                        {agentData.activeStock.map((item, idx) => {
                                                            const productInfo = inventory?.find(p => p.id === item.productId) || {};
                                                            let mult = 1;
                                                            if (item.unit === 'Slop') mult = productInfo.packsPerSlop || 10;
                                                            if (item.unit === 'Bal') mult = (productInfo.slopsPerBal || 20) * (productInfo.packsPerSlop || 10);
                                                            if (item.unit === 'Karton') mult = (productInfo.balsPerCarton || 4) * (productInfo.slopsPerBal || 20) * (productInfo.packsPerSlop || 10);
                                                            const totalBksDecimal = item.qty * mult;
                                                            const sp = productInfo.sticksPerPack || 16;
                                                            const physicalBks = Math.floor(totalBksDecimal);
                                                            const physicalBtg = Math.round((totalBksDecimal - physicalBks) * sp);
                                                            let displayQty = '';
                                                            if (physicalBks > 0) displayQty += `${physicalBks} Bks `;
                                                            if (physicalBtg > 0) displayQty += `${physicalBtg} Btg`;
                                                            
                                                            return (
                                                                <tr key={idx} className="border-t border-white/5 first:border-0">
                                                                    <td className="p-2 font-bold text-slate-300">{item.name}</td>
                                                                    <td className="p-2 text-right font-black text-emerald-400">{displayQty.trim() || '0 Bks'}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {agentData.cashStatus === 'READY' && (
                            <button 
                                onClick={() => onSubmitEOD({ cash: agentData.expectedCash, transfer: agentData.expectedTransfer, cukai: 0, remainingStock: agentData.activeStock, deployedSamples: [], reportType: 'CASH_STOCK' })}
                                className="w-full mt-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                            >
                                <Upload size={18}/> Submit Cash & Stock
                            </button>
                        )}
                    </div>

                    {/* 🚀 CARD 2: PITA CUKAI HANDOVER & FINE SYSTEM */}
                    <div className="bg-black/20 border border-orange-500/30 rounded-2xl p-6 shadow-xl flex flex-col h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full pointer-events-none"></div>
                        <h3 className="text-lg font-black text-white uppercase tracking-widest border-b border-orange-500/30 pb-4 mb-6 flex items-center gap-2 relative z-10"><Tag className="text-orange-500"/> Pita Cukai</h3>
                        
                        <div className="flex-1">
                            {agentData.cukaiStatus === 'PENDING' ? (
                                <div className="flex flex-col items-center justify-center h-full py-10 opacity-70">
                                    <Clock className="text-orange-500 mb-4 animate-pulse" size={40}/>
                                    <h3 className="text-lg font-black text-orange-400 uppercase tracking-widest mb-1">Awaiting Verification</h3>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest text-center">Hand stamps (and cash fines) to Admin.</p>
                                </div>
                            ) : agentData.cukaiStatus === 'VERIFIED' ? (
                                <div className="flex flex-col items-center justify-center h-full py-10 opacity-70">
                                    <CheckCircle className="text-orange-500 mb-4" size={40}/>
                                    <h3 className="text-lg font-black text-orange-400 uppercase tracking-widest mb-1">Cukai Cleared</h3>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest text-center">Tax stamps successfully verified.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    
                                    <div className="bg-orange-950/20 border border-orange-500/50 p-4 rounded-xl shadow-inner">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Total Stamps You Owe: <strong className="text-orange-400">{agentData.expectedCukai} Pcs</strong></p>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* PHYSICAL RETURNED INPUT */}
                                            <div className="bg-black/60 border-b-2 border-orange-500 p-3 rounded text-center">
                                                <p className="text-[9px] font-bold text-orange-400 uppercase mb-2">Physical Returned</p>
                                                <input 
                                                    type="number" min="0" value={cukaiReturnedInput} onChange={(e) => setCukaiReturnedInput(e.target.value)}
                                                    className="w-full bg-transparent text-orange-500 font-black text-3xl text-center outline-none"
                                                />
                                            </div>

                                            {/* LOST AND PAID INPUT */}
                                            <div className="bg-black/60 border-b-2 border-red-500 p-3 rounded text-center">
                                                <p className="text-[9px] font-bold text-red-400 uppercase mb-2">Lost (Pay Cash)</p>
                                                <input 
                                                    type="number" min="0" value={cukaiPaidInput} onChange={(e) => setCukaiPaidInput(e.target.value)}
                                                    className="w-full bg-transparent text-red-500 font-black text-3xl text-center outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* 🚀 FINE CALCULATOR */}
                                        {(parseInt(cukaiPaidInput) || 0) > 0 && (
                                            <div className="mt-4 p-3 bg-red-950/30 border border-red-500/30 rounded text-center animate-fade-in">
                                                <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest flex justify-center items-center gap-1"><AlertCircle size={12}/> Cash Fine Required</p>
                                                <p className="text-xl font-black text-red-500 mt-1">{formatRupiah((parseInt(cukaiPaidInput) || 0) * cukaiFinePrice)}</p>
                                                <p className="text-[8px] text-red-400/70 mt-1 uppercase tracking-widest">({formatRupiah(cukaiFinePrice)} per lost stamp)</p>
                                            </div>
                                        )}
                                    </div>

                                    {agentData.todaysSamplings && agentData.todaysSamplings.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Package size={14}/> Today's Deployments</h4>
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
                                </div>
                            )}
                        </div>

                        {agentData.cukaiStatus === 'READY' && (
                            <button 
                                onClick={() => {
                                    const returned = parseInt(cukaiReturnedInput) || 0;
                                    const paid = parseInt(cukaiPaidInput) || 0;
                                    onSubmitEOD({ 
                                        cash: 0, transfer: 0, 
                                        cukaiReturned: returned, 
                                        cukaiPaid: paid, 
                                        cukaiFine: paid * cukaiFinePrice, 
                                        cukai: returned + paid, // Total passed to DB debt subtractor
                                        remainingStock: [], deployedSamples: agentData.todaysSamplings, reportType: 'CUKAI' 
                                    })
                                }}
                                disabled={(!cukaiReturnedInput && !cukaiPaidInput) || (parseInt(cukaiReturnedInput) === 0 && parseInt(cukaiPaidInput) === 0)}
                                className={`w-full mt-6 py-4 rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg transition-transform ${((!cukaiReturnedInput && !cukaiPaidInput) || (parseInt(cukaiReturnedInput) === 0 && parseInt(cukaiPaidInput) === 0)) ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500 text-white active:scale-95'}`}
                            >
                                <Upload size={18}/> Submit Stamps & Fines
                            </button>
                        )}
                    </div>
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
                                <div key={report.id} className={`bg-black/40 border rounded-2xl overflow-hidden shadow-lg ${report.reportType === 'CUKAI' ? 'border-orange-500/30' : 'border-emerald-500/30'}`}>
                                    
                                    <div className={`p-4 flex justify-between items-center border-b ${report.reportType === 'CUKAI' ? 'bg-orange-950/20 border-orange-500/20' : 'bg-emerald-950/20 border-emerald-500/20'}`}>
                                        <div>
                                            <h4 className="font-black text-white text-lg">{report.agentName}</h4>
                                            <p className="text-[10px] text-slate-400">
                                                {report.timestamp?.seconds ? new Date(report.timestamp.seconds * 1000).toLocaleTimeString() : ''}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {report.reportType === 'CASH_STOCK' && <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-md">CASH & STOCK</span>}
                                            {report.reportType === 'CUKAI' && <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-md">PITA CUKAI ONLY</span>}
                                            {!report.reportType && <span className="bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-md">COMBINED REPORT</span>}
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        
                                        {/* OPTIONALLY HIDE CASH/STOCK IF IT IS A CUKAI ONLY REPORT */}
                                        {report.reportType !== 'CUKAI' && (
                                            <>
                                                <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5">
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><DollarSign size={14}/> Physical Cash</span>
                                                    <span className="text-xl font-black text-emerald-500">{formatRupiah(report.cash)}</span>
                                                </div>
                                                <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5">
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Wallet size={14}/> Digital Transfer</span>
                                                    <span className="text-xl font-black text-blue-500">{formatRupiah(report.transfer)}</span>
                                                </div>
                                                <div className="pt-2">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Package size={12}/> Inventory to Vault</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {report.remainingStock && report.remainingStock.length > 0 ? report.remainingStock.map((item, idx) => {
                                                            const productInfo = inventory?.find(p => p.id === item.productId) || {};
                                                            let mult = 1;
                                                            if (item.unit === 'Slop') mult = productInfo.packsPerSlop || 10;
                                                            if (item.unit === 'Bal') mult = (productInfo.slopsPerBal || 20) * (productInfo.packsPerSlop || 10);
                                                            if (item.unit === 'Karton') mult = (productInfo.balsPerCarton || 4) * (productInfo.slopsPerBal || 20) * (productInfo.packsPerSlop || 10);
                                                            const totalBksDecimal = item.qty * mult;
                                                            const sp = productInfo.sticksPerPack || 16;
                                                            const physicalBks = Math.floor(totalBksDecimal);
                                                            const physicalBtg = Math.round((totalBksDecimal - physicalBks) * sp);
                                                            let displayQty = '';
                                                            if (physicalBks > 0) displayQty += `${physicalBks} Bks `;
                                                            if (physicalBtg > 0) displayQty += `${physicalBtg} Btg`;

                                                            return (
                                                                <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded border border-white/10">
                                                                    {item.name}: <strong className="text-emerald-400">{displayQty.trim() || '0 Bks'}</strong>
                                                                </span>
                                                            );
                                                        }) : <span className="text-[10px] text-slate-500 italic">No stock to return.</span>}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* 🚀 ADMIN CUKAI BREAKDOWN & FINE VERIFIER */}
                                        {report.reportType !== 'CASH_STOCK' && (
                                            <>
                                                <div className="flex justify-between items-center bg-orange-950/20 p-3 rounded-lg border border-orange-500/30 mt-4">
                                                    <span className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2"><Tag size={14}/> Physical Stamps Returned</span>
                                                    <span className="text-xl font-black text-orange-500">{report.cukaiReturned !== undefined ? report.cukaiReturned : (report.cukai || 0)} Pcs</span>
                                                </div>

                                                {(report.cukaiPaid > 0) && (
                                                    <div className="flex justify-between items-center bg-red-950/20 p-3 rounded-lg border border-red-500/30 mt-2">
                                                        <div>
                                                            <span className="text-xs font-bold text-red-400 uppercase tracking-widest block flex items-center gap-1"><AlertCircle size={12}/> Lost Stamps Paid</span>
                                                            <span className="text-[9px] text-red-500 font-mono mt-0.5">{report.cukaiPaid} Pcs × {formatRupiah(report.cukaiFine / report.cukaiPaid)}</span>
                                                        </div>
                                                        <span className="text-xl font-black text-red-500">+{formatRupiah(report.cukaiFine)}</span>
                                                    </div>
                                                )}

                                                {report.deployedSamples && report.deployedSamples.length > 0 && (
                                                    <div className="pt-2 border-t border-white/10 mt-3">
                                                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Package size={12}/> Today's Deployments</p>
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
                                            </>
                                        )}

                                        <div className="flex gap-2 mt-4 pt-2">
                                            <button 
                                                onClick={() => onVerifyEOD(report)}
                                                className={`flex-1 py-3 text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95 ${report.reportType === 'CUKAI' ? 'bg-orange-600 hover:bg-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.3)]' : 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}
                                            >
                                                <CheckCircle size={18}/> Verify
                                            </button>
                                            
                                            <button 
                                                onClick={() => onResetEOD(report)}
                                                className="flex-1 py-3 bg-red-900/40 hover:bg-red-600 border border-red-500/50 text-red-500 hover:text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95"
                                            >
                                                <XCircle size={18}/> Reject / Reset
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: EOD HISTORY LOG (4-Level Folder Structure) */}
                    <div>
                        <h3 className="font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><CheckCircle size={18}/> EOD History Log</h3>
                        
                        <div className="space-y-3 h-[700px] overflow-y-auto custom-scrollbar pr-2 pb-10 relative">
                            {Object.keys(structuredHistory).length === 0 ? (
                                <div className="text-center p-6 text-slate-600 text-[10px] uppercase tracking-widest border border-dashed border-slate-700 rounded-xl">No history logs found.</div>
                            ) : Object.keys(structuredHistory).map(location => (
                                <div key={location} className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                    
                                    {/* 📍 LEVEL 1: LOCATION */}
                                    <button 
                                        onClick={() => toggleAccordion(setOpenLocations, location)}
                                        className="w-full p-4 flex justify-between items-center hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-emerald-950/50 rounded-lg border border-emerald-900/50"><MapPin className="text-emerald-500" size={16}/></div>
                                            <span className="font-black text-white uppercase tracking-widest text-sm">{location}</span>
                                        </div>
                                        <div className="text-slate-500">{openLocations.includes(location) ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}</div>
                                    </button>

                                    {openLocations.includes(location) && (
                                        <div className="border-t border-slate-800 bg-black/40">
                                            {Object.keys(structuredHistory[location]).map(empName => {
                                                const empKey = `${location}-${empName}`;
                                                return (
                                                <div key={empKey} className="border-b border-slate-800/50 last:border-0">
                                                    
                                                    {/* 👤 LEVEL 2: EMPLOYEE */}
                                                    <button 
                                                        onClick={() => toggleAccordion(setOpenAgents, empKey)}
                                                        className="w-full p-3 pl-6 flex justify-between items-center hover:bg-slate-800/50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <User className="text-blue-400" size={14}/>
                                                            <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">{empName}</span>
                                                        </div>
                                                        <div className="text-slate-600">{openAgents.includes(empKey) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</div>
                                                    </button>

                                                    {openAgents.includes(empKey) && (
                                                        <div className="border-t border-slate-800/50 bg-slate-950/50">
                                                            {Object.keys(structuredHistory[location][empName]).map(yearMonth => {
                                                                const monthKey = `${empKey}-${yearMonth}`;
                                                                return (
                                                                <div key={monthKey}>
                                                                    
                                                                    {/* 📅 LEVEL 3: YEAR & MONTH */}
                                                                    <button 
                                                                        onClick={() => toggleAccordion(setOpenMonths, monthKey)}
                                                                        className="w-full p-2 pl-10 flex justify-between items-center hover:bg-slate-800/30 transition-colors border-b border-slate-800/30"
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <Calendar className="text-orange-400" size={12}/>
                                                                            <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">{yearMonth}</span>
                                                                        </div>
                                                                        <div className="text-slate-600">{openMonths.includes(monthKey) ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}</div>
                                                                    </button>

                                                                    {openMonths.includes(monthKey) && (
                                                                        <div className="bg-black/20">
                                                                            {Object.keys(structuredHistory[location][empName][yearMonth]).map(fullDate => {
                                                                                const dateKey = `${monthKey}-${fullDate}`;
                                                                                return (
                                                                                <div key={dateKey}>
                                                                                    
                                                                                    {/* 📂 LEVEL 4: SPECIFIC DATE */}
                                                                                    <button 
                                                                                        onClick={() => toggleAccordion(setOpenDates, dateKey)}
                                                                                        className="w-full p-2 pl-14 flex justify-between items-center hover:bg-slate-800/20 transition-colors border-b border-slate-800/20"
                                                                                    >
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Folder className="text-indigo-400" size={12}/>
                                                                                            <span className="font-bold text-slate-300 text-[10px] uppercase tracking-widest">{fullDate}</span>
                                                                                        </div>
                                                                                        <div className="text-slate-600">{openDates.includes(dateKey) ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}</div>
                                                                                    </button>

                                                                                    {openDates.includes(dateKey) && (
                                                                                        <div className="p-3 pl-16 space-y-3 bg-black/40 shadow-inner">
                                                                                            {/* 📄 THE ACTUAL REPORTS */}
                                                                                            {structuredHistory[location][empName][yearMonth][fullDate].map(report => (
                                                                                                <div key={report.id} className="bg-slate-900/80 border border-slate-700/50 p-3 rounded-xl flex justify-between items-center hover:border-slate-500 transition-colors shadow-sm">
                                                                                                    <div>
                                                                                                        <h4 className="font-bold text-white text-xs flex items-center gap-2">
                                                                                                            {report.reportType === 'CASH_STOCK' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                                                                                                            {report.reportType === 'CUKAI' && <span className="w-2 h-2 rounded-full bg-orange-500"></span>}
                                                                                                            {!report.reportType && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                                                                                            {report.reportType === 'CUKAI' ? 'Cukai Return' : 'EOD Cash/Stock'}
                                                                                                        </h4>
                                                                                                        <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-1 font-mono">
                                                                                                            <Clock size={10}/> 
                                                                                                            {report.timestamp?.seconds ? new Date(report.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time'}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    <div className="text-right flex flex-col items-end">
                                                                                                        {report.reportType !== 'CUKAI' && <p className="text-xs font-black text-emerald-500">{formatRupiah(report.cash)}</p>}
                                                                                                        {report.reportType !== 'CASH_STOCK' && (
                                                                                                            <p className="text-xs font-black text-orange-400">
                                                                                                                {report.cukaiReturned !== undefined ? report.cukaiReturned : (report.cukai || 0)} Pcs
                                                                                                                {report.cukaiPaid > 0 && <span className="text-red-400 ml-1">(+{report.cukaiPaid} Paid)</span>}
                                                                                                            </p>
                                                                                                        )}
                                                                                                        
                                                                                                        <button 
                                                                                                            onClick={() => onResetEOD(report)}
                                                                                                            className="text-[9px] flex items-center gap-1 bg-red-900/30 hover:bg-red-600 text-red-500 hover:text-white px-2 py-1 rounded border border-red-500/30 transition-all active:scale-95 uppercase font-bold mt-2"
                                                                                                        >
                                                                                                            <XCircle size={10}/> Force Reset
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )})}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )})}
                                                        </div>
                                                    )}
                                                </div>
                                            )})}
                                        </div>
                                    )}
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
