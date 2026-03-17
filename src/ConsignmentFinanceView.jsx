import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, ShieldCheck, AlertCircle, XCircle, MessageSquare, Box, Package, ArrowRight, DollarSign } from 'lucide-react';

const ConsignmentFinanceView = ({ transactions, inventory }) => {
    const [activeTab, setActiveTab] = useState('financials'); // 'financials' or 'stock'

    // 🚀 1. FIFO DEBT ENGINE (A/R Financials) 🚀
    const debtData = useMemo(() => {
        const customers = {};
        const sorted = [...transactions].sort((a,b) => new Date(a.date) - new Date(b.date));

        sorted.forEach(t => {
            const cName = (t.customerName || 'Unknown').trim();
            if (!customers[cName]) customers[cName] = { name: cName, debts: [], phone: '' };
            if (t.phone) customers[cName].phone = t.phone;

            if (t.type === 'SALE' && t.paymentType === 'Titip') {
                customers[cName].debts.push({ id: t.id, date: t.date, original: t.total, remaining: t.total });
            }
            if (t.type === 'CONSIGNMENT_PAYMENT' || t.type === 'RETURN') {
                let deduction = t.type === 'RETURN' ? Math.abs(t.total) : (t.amountPaid || 0);
                for (let i = 0; i < customers[cName].debts.length; i++) {
                    if (customers[cName].debts[i].remaining > 0) {
                        if (deduction >= customers[cName].debts[i].remaining) {
                            deduction -= customers[cName].debts[i].remaining;
                            customers[cName].debts[i].remaining = 0;
                        } else {
                            customers[cName].debts[i].remaining -= deduction;
                            deduction = 0;
                            break;
                        }
                    }
                }
            }
        });

        const today = new Date();
        today.setHours(0,0,0,0);
        
        const results = { RED: [], YELLOW: [], GREEN: [], totalValue: 0, totalOverdue: 0, activeAccounts: 0 };
        
        Object.values(customers).forEach(c => {
            const active = c.debts.filter(d => d.remaining > 0.01);
            if (active.length > 0) {
                const total = active.reduce((s, d) => s + d.remaining, 0);
                const oldestDate = new Date(active[0].date);
                oldestDate.setHours(0,0,0,0);
                
                const ageDays = Math.floor((today - oldestDate) / (1000 * 60 * 60 * 24));
                
                let status = 'GREEN';
                if (ageDays >= 14) { status = 'RED'; results.totalOverdue += total; }
                else if (ageDays >= 8) status = 'YELLOW';

                results.totalValue += total;
                results.activeAccounts++;
                results[status].push({ name: c.name, total, ageDays, oldestDate: active[0].date, phone: c.phone, activeInvoices: active.length });
            }
        });
        
        results.RED.sort((a,b) => b.ageDays - a.ageDays);
        results.YELLOW.sort((a,b) => b.ageDays - a.ageDays);
        results.GREEN.sort((a,b) => b.ageDays - a.ageDays);
        
        return results;
    }, [transactions]);

    const handleSendWA = (cust) => {
        const text = `*PEMBERITAHUAN JATUH TEMPO*\n\nHalo ${cust.name},\nKami dari KPM Inventory menginformasikan bahwa terdapat tagihan Titip/Konsinyasi yang belum diselesaikan sebesar *Rp ${new Intl.NumberFormat('id-ID').format(cust.total)}* sejak tanggal ${cust.oldestDate} (${cust.ageDays} hari yang lalu).\n\nMohon kerjasamanya untuk segera diselesaikan agar pengiriman barang selanjutnya dapat diproses.\n\nTerima kasih.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const StatusCard = ({ title, data, colorClass, borderClass, icon, bgClass }) => (
        <div className={`flex flex-col rounded-2xl border ${borderClass} ${bgClass} overflow-hidden shadow-lg`}>
            <div className={`p-4 border-b ${borderClass} flex justify-between items-center bg-black/20`}>
                <h3 className={`font-black uppercase tracking-widest text-sm flex items-center gap-2 ${colorClass}`}>{icon} {title}</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded-full border ${borderClass} ${colorClass}`}>{data.length} Accounts</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-[500px] space-y-3 custom-scrollbar">
                {data.length === 0 ? (
                    <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest py-8">No active records</p>
                ) : data.map((c, i) => (
                    <div key={i} className="bg-black/40 p-4 rounded-xl border border-white/5 relative overflow-hidden group">
                        {title.includes('OVERDUE') && <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>}
                        <h4 className="font-bold text-white text-base truncate pr-8">{c.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-1">{c.activeInvoices} Active Invoice(s)</p>
                        <div className="flex justify-between items-end mt-3">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Outstanding</p>
                                <p className={`font-black text-lg ${colorClass}`}>Rp {new Intl.NumberFormat('id-ID').format(c.total)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Debt Age</p>
                                <p className="font-bold text-white">{c.ageDays} Days</p>
                                <p className="text-[9px] text-slate-500">{c.oldestDate}</p>
                            </div>
                        </div>
                        <button onClick={() => handleSendWA(c)} className={`w-full mt-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${colorClass} ${borderClass} hover:bg-white/10 active:scale-95`}>
                            <MessageSquare size={12}/> Send Payment Reminder
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in space-y-6 max-w-7xl mx-auto p-2">
            
            {/* --- HEADER & MASTER TOGGLE --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <FileSpreadsheet className="text-orange-500" size={32}/> Receivables & Consignment
                    </h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2">Unified Dashboard for Accounts Receivable & Physical Stock</p>
                </div>
                
                {/* THE TOGGLE SWITCH */}
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                    <button 
                        onClick={() => setActiveTab('financials')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'financials' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <DollarSign size={16}/> A/R Financials
                    </button>
                    <button 
                        onClick={() => setActiveTab('stock')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'stock' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Box size={16}/> Physical Stock
                    </button>
                </div>
            </div>

            {/* --- TAB A: FINANCIALS (PIUTANG) --- */}
            {activeTab === 'financials' && (
                <div className="animate-fade-in-up space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Total Receivables</p>
                            <p className="text-2xl font-black text-white">Rp {new Intl.NumberFormat('id-ID').format(debtData.totalValue)}</p>
                        </div>
                        <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full"></div>
                            <p className="text-[10px] text-red-400 uppercase tracking-widest mb-1">Total Overdue (Over 14 Days)</p>
                            <p className="text-2xl font-black text-red-500">Rp {new Intl.NumberFormat('id-ID').format(debtData.totalOverdue)}</p>
                        </div>
                        <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Active Accounts</p>
                            <p className="text-2xl font-black text-blue-400">{debtData.activeAccounts}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <StatusCard title="Good Standing (0-7 Days)" data={debtData.GREEN} colorClass="text-emerald-500" borderClass="border-emerald-500/30" bgClass="bg-emerald-950/10" icon={<ShieldCheck size={18}/>} />
                        <StatusCard title="Warning (8-14 Days)" data={debtData.YELLOW} colorClass="text-yellow-500" borderClass="border-yellow-500/30" bgClass="bg-yellow-950/10" icon={<AlertCircle size={18}/>} />
                        <StatusCard title="OVERDUE (>14 Days)" data={debtData.RED} colorClass="text-red-500" borderClass="border-red-500/50" bgClass="bg-red-950/20" icon={<XCircle size={18}/>} />
                    </div>
                </div>
            )}

            {/* --- TAB B: CONSIGNMENT STOCK --- */}
            {activeTab === 'stock' && (
                <div className="animate-fade-in-up bg-black/20 border border-white/10 rounded-2xl p-6 text-center">
                    <Package className="text-blue-500 mx-auto mb-4 opacity-50" size={48}/>
                    <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Active Consignment Ledger</h3>
                    <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                        This view currently synchronizes with the A/R Financials Tab. Future updates will display itemized physical box/pack counts currently sitting at each merchant location.
                    </p>
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto text-left">
                        {debtData.RED.concat(debtData.YELLOW, debtData.GREEN).map((c, i) => (
                            <div key={i} className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:bg-white/5 transition-colors cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                                        <Store className="text-blue-400" size={18}/>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">{c.name}</h4>
                                        <p className="text-[10px] text-slate-400">{c.activeInvoices} Active Consignment Invoices</p>
                                    </div>
                                </div>
                                <ArrowRight className="text-slate-600 group-hover:text-white transition-colors" size={16}/>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
};

export default ConsignmentFinanceView;