import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, ShieldCheck, AlertCircle, XCircle, MessageSquare, Box, Package, ArrowRight, DollarSign, Store, Truck, Plus, Wallet, RotateCcw, Lock, Trash2 } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

const convertToBks = (qty, unit, product) => {
    if (!product) return qty;
    const packsPerSlop = product.packsPerSlop || 10;
    const slopsPerBal = product.slopsPerBal || 20;
    const balsPerCarton = product.balsPerCarton || 4;
    if (unit === 'Slop') return qty * packsPerSlop;
    if (unit === 'Bal') return qty * slopsPerBal * packsPerSlop;
    if (unit === 'Karton') return qty * balsPerCarton * slopsPerBal * packsPerSlop;
    return qty; 
};

const ConsignmentFinanceView = ({ transactions, inventory, onAddGoods, onPayment, onReturn, onDeleteConsignment, isAdmin }) => {
    const [activeTab, setActiveTab] = useState('financials');

    // --- OLD CONSIGNMENT STATE ---
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [settleMode, setSettleMode] = useState(false);
    const [returnMode, setReturnMode] = useState(false);
    const [itemQtys, setItemQtys] = useState({});

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

    // 🚀 2. PHYSICAL STOCK ENGINE (Restored) 🚀
    const customerData = useMemo(() => {
        const customers = {};
        const sortedTransactions = [...transactions].sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
        sortedTransactions.forEach(t => {
            if (!t.customerName) return; 
            const name = t.customerName.trim(); 
            if (!customers[name]) customers[name] = { name, items: {}, balance: 0, lastActivity: t.date };
            
            const getProduct = (pid) => inventory.find(p => p.id === pid);
            
            if (t.type === 'SALE' && t.paymentType === 'Titip') { 
                customers[name].balance += t.total; 
                t.items.forEach(item => { 
                    const product = getProduct(item.productId); 
                    const bksQty = convertToBks(item.qty, item.unit, product); 
                    const itemKey = `${item.productId}-${item.priceTier || 'Standard'}`; 
                    if(!customers[name].items[itemKey]) customers[name].items[itemKey] = { ...item, qty: 0, unit: 'Bks', calculatedPrice: item.calculatedPrice / convertToBks(1, item.unit, product) }; 
                    customers[name].items[itemKey].qty += bksQty; 
                }); 
            }
            if (t.type === 'RETURN') { 
                customers[name].balance += t.total; 
                t.items.forEach(item => { 
                    const product = getProduct(item.productId); 
                    const bksQty = convertToBks(item.qty, item.unit, product); 
                    const itemKey = `${item.productId}-${item.priceTier || 'Standard'}`; 
                    if(customers[name].items[itemKey]) customers[name].items[itemKey].qty -= bksQty; 
                }); 
            }
            if (t.type === 'CONSIGNMENT_PAYMENT') { 
                customers[name].balance -= t.amountPaid; 
                t.itemsPaid.forEach(item => { 
                    const product = getProduct(item.productId); 
                    const bksQty = convertToBks(item.qty, item.unit, product); 
                    const itemKey = `${item.productId}-${item.priceTier || 'Standard'}`; 
                    if(customers[name].items[itemKey]) customers[name].items[itemKey].qty -= bksQty; 
                }); 
            }
        });
        
        Object.values(customers).forEach(c => { 
            c.balance = Math.max(0, c.balance); 
            Object.keys(c.items).forEach(k => { c.items[k].qty = Math.max(0, c.items[k].qty); }); 
        });
        
        return Object.values(customers).filter(c => c.balance > 0 || Object.values(c.items).some(i => i.qty > 0));
    }, [transactions, inventory]);

    const activeCustomer = selectedCustomer ? customerData.find(c => c.name === selectedCustomer.name) || selectedCustomer : null;
    
    const handleQtyInput = (key, val, max) => { 
        let q = parseInt(val) || 0; 
        if(q < 0) q = 0; 
        setItemQtys(p => ({...p, [key]: q})); 
    };
    
    const submitAction = () => {
        const itemsToProcess = []; let totalValue = 0;
        Object.entries(itemQtys).forEach(([key, qty]) => { 
            if(qty > 0) { 
                const item = activeCustomer.items[key]; 
                itemsToProcess.push({ productId: item.productId, name: item.name, qty, priceTier: item.priceTier, calculatedPrice: item.calculatedPrice, unit: 'Bks' }); 
                totalValue += (item.calculatedPrice * qty); 
            } 
        });
        if(itemsToProcess.length === 0) return;
        if (settleMode && onPayment) onPayment(activeCustomer.name, itemsToProcess, totalValue); 
        else if (returnMode && onReturn) onReturn(activeCustomer.name, itemsToProcess, totalValue);
        
        setSettleMode(false); 
        setReturnMode(false); 
        setItemQtys({});
    };
    
    const formatStockDisplay = (qty, product) => { 
        if (!product) return `${qty} Bks`; 
        const packsPerSlop = product.packsPerSlop || 10; 
        const slops = Math.floor(qty / packsPerSlop); 
        const bks = qty % packsPerSlop; 
        return slops > 0 ? `${qty} Bks (${slops} Slop ${bks > 0 ? `+ ${bks} Bks` : ''})` : `${qty} Bks`; 
    };

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
                        <StatusCard title="OVERDUE (Over 14 Days)" data={debtData.RED} colorClass="text-red-500" borderClass="border-red-500/50" bgClass="bg-red-950/20" icon={<XCircle size={18}/>} />
                    </div>
                </div>
            )}

            {/* --- TAB B: CONSIGNMENT STOCK (RESTORED OLD VIEW) --- */}
            {activeTab === 'stock' && (
                <div className="animate-fade-in-up flex flex-col lg:flex-row gap-6 h-[calc(100vh-250px)]">

                    {/* LEFT LIST */}
                    <div className={`lg:w-1/3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 flex flex-col ${selectedCustomer ? 'hidden lg:flex' : 'flex'}`}>
                        <div className="p-4 border-b dark:border-slate-700">
                            <h2 className="font-bold text-lg dark:text-white flex items-center gap-2"><Truck size={20}/> Active Consignments</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {customerData.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">No active consignments found.</div>
                            ) : customerData.map(c => (
                                <div key={c.name} onClick={() => setSelectedCustomer(c)} className={`p-4 border-b dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedCustomer?.name === c.name ? 'bg-orange-50 dark:bg-slate-700 border-l-4 border-l-orange-500' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold dark:text-white">{c.name}</h3>
                                        {isAdmin && onDeleteConsignment && (
                                            <button onClick={(e) => { e.stopPropagation(); onDeleteConsignment(c.name); }} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                                        )}
                                    </div>
                                    <div className="mt-2 flex justify-between items-center">
                                        <span className="text-xs bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded dark:text-slate-300">{Object.values(c.items).reduce((a,b)=>a+b.qty,0)} Bks Held</span>
                                        <span className="font-mono font-bold text-emerald-600">{formatRupiah(c.balance)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT DETAILS */}
                    <div className={`lg:w-2/3 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 overflow-hidden ${!selectedCustomer ? 'hidden lg:flex justify-center items-center' : 'flex'}`}>
                        {!selectedCustomer ? (
                            <div className="text-center text-slate-400">
                                <Store size={48} className="mx-auto mb-4 opacity-20"/>
                                <p>Select a customer to view active goods and process payments.</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-2xl">
                                    <div>
                                        <div className="flex items-center gap-2 lg:hidden mb-2 text-slate-400 cursor-pointer" onClick={() => setSelectedCustomer(null)}>
                                            <ArrowRight className="rotate-180" size={16}/> Back
                                        </div>
                                        <h2 className="text-2xl font-bold dark:text-white">{activeCustomer?.name}</h2>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">Outstanding Balance</p>
                                        <p className="text-2xl font-bold text-orange-500">{formatRupiah(activeCustomer?.balance || 0)}</p>
                                    </div>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                    <h3 className="font-bold mb-4 dark:text-white flex items-center gap-2"><Package size={18}/> Goods at Customer</h3>
                                    <div className="space-y-3">
                                        {Object.entries(activeCustomer?.items || {}).filter(([k, i]) => i.qty > 0).map(([key, item]) => { 
                                            const product = inventory.find(p => p.id === item.productId); 
                                            return (
                                                <div key={key} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                                                    <div>
                                                        <p className="font-bold dark:text-white">{item.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{item.priceTier || 'Standard'}</span>
                                                            <p className="text-xs text-slate-500">{formatRupiah(item.calculatedPrice)} / Bks</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold dark:text-white">{formatStockDisplay(item.qty, product)}</p>
                                                        </div>
                                                        {(settleMode || returnMode) && (
                                                            <input 
                                                                type="number" 
                                                                className={`w-24 p-2 rounded border text-center font-bold ${returnMode ? 'border-red-400 bg-red-50 text-red-600' : 'border-emerald-400 bg-emerald-50 text-emerald-600'}`} 
                                                                placeholder="Qty (Bks)" 
                                                                value={itemQtys[key] || ''} 
                                                                onChange={(e) => handleQtyInput(key, e.target.value, item.qty)}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            ); 
                                        })}
                                    </div>
                                </div>
                                
                                {/* LOCKED: Footer Actions */}
                                <div className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
                                    {(!settleMode && !returnMode) ? (
                                        isAdmin ? (
                                            <div className="grid grid-cols-3 gap-3">
                                                <button onClick={() => onAddGoods && onAddGoods(activeCustomer?.name)} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:bg-orange-50 dark:hover:bg-slate-700 hover:border-orange-500 transition-all group">
                                                    <Plus size={24} className="text-orange-500 mb-1"/><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Add Goods</span>
                                                </button>
                                                <button onClick={() => setSettleMode(true)} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-700 hover:border-emerald-500 transition-all group">
                                                    <Wallet size={24} className="text-emerald-500 mb-1"/><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Record Payment</span>
                                                </button>
                                                <button onClick={() => setReturnMode(true)} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:bg-red-50 dark:hover:bg-slate-700 hover:border-red-500 transition-all group">
                                                    <RotateCcw size={24} className="text-red-500 mb-1"/><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Process Return</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center p-2 text-slate-400 text-sm flex flex-col items-center">
                                                <Lock size={20} className="mb-1 opacity-50"/>
                                                <span className="font-bold">Consignment Actions Locked</span>
                                                <span className="text-xs opacity-70">Admin access required to Add, Pay, or Return items.</span>
                                            </div>
                                        )
                                    ) : (
                                        <div>
                                            <div className="flex gap-3">
                                                <button onClick={() => { setSettleMode(false); setReturnMode(false); setItemQtys({}); }} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300">Cancel</button>
                                                <button onClick={submitAction} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg ${settleMode ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>Confirm {settleMode ? 'Payment' : 'Return'}</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default ConsignmentFinanceView;