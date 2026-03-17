import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, ShieldCheck, AlertCircle, XCircle, MessageSquare, Box, Package, ArrowRight, DollarSign, Store, Truck, Plus, Wallet, RotateCcw, Lock, Trash2, ArrowLeftRight, Check, X } from 'lucide-react';

const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

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

const ConsignmentFinanceView = ({ transactions, inventory, onAddGoods, onPayment, onReturn, onDeleteConsignment, isAdmin, user, agentProfileId, motorists = [], transferRequests = [], onRequestTransfer, onAgentAcceptTransfer, onAdminApproveTransfer }) => {
    const [activeTab, setActiveTab] = useState('financials'); // 'financials', 'stock', 'transfers'

    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [settleMode, setSettleMode] = useState(false);
    const [returnMode, setReturnMode] = useState(false);
    const [transferMode, setTransferMode] = useState(false);
    const [itemQtys, setItemQtys] = useState({});
    
    // Transfer Form State
    const [targetAgent, setTargetAgent] = useState('');
    const [transferNote, setTransferNote] = useState('');

    // 🚀 OWNERSHIP FILTER 🚀
    const myTransactions = useMemo(() => {
        if (isAdmin) return transactions;
        return transactions.filter(t => {
            const matchId = agentProfileId && t.agentId === agentProfileId;
            const matchName = user && t.agentName && (t.agentName === user.displayName || t.agentName === user.name || t.agentName === user.email?.split('@')[0]);
            return matchId || matchName;
        });
    }, [transactions, isAdmin, agentProfileId, user]);

    // 🚀 1. FIFO DEBT ENGINE 🚀
    const debtData = useMemo(() => {
        const customers = {};
        const sorted = [...myTransactions].sort((a,b) => new Date(a.date) - new Date(b.date));

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

        const today = new Date(); today.setHours(0,0,0,0);
        const results = { RED: [], YELLOW: [], GREEN: [], totalValue: 0, totalOverdue: 0, activeAccounts: 0 };
        
        Object.values(customers).forEach(c => {
            const active = c.debts.filter(d => d.remaining > 0.01);
            if (active.length > 0) {
                const total = active.reduce((s, d) => s + d.remaining, 0);
                const oldestDate = new Date(active[0].date); oldestDate.setHours(0,0,0,0);
                const ageDays = Math.floor((today - oldestDate) / (1000 * 60 * 60 * 24));
                
                let status = 'GREEN';
                if (ageDays >= 14) { status = 'RED'; results.totalOverdue += total; }
                else if (ageDays >= 8) status = 'YELLOW';

                results.totalValue += total; results.activeAccounts++;
                results[status].push({ name: c.name, total, ageDays, oldestDate: active[0].date, phone: c.phone, activeInvoices: active.length });
            }
        });
        
        results.RED.sort((a,b) => b.ageDays - a.ageDays); results.YELLOW.sort((a,b) => b.ageDays - a.ageDays); results.GREEN.sort((a,b) => b.ageDays - a.ageDays);
        return results;
    }, [myTransactions]);

    // 🚀 2. PHYSICAL STOCK ENGINE 🚀
    const customerData = useMemo(() => {
        const customers = {};
        const sortedTransactions = [...myTransactions].sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
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
    }, [myTransactions, inventory]);

    const activeCustomer = selectedCustomer ? customerData.find(c => c.name === selectedCustomer.name) || selectedCustomer : null;
    
    // 🚀 3. TRANSFER ROUTING ENGINE 🚀
    const { incomingRequests, outgoingRequests, pendingAdminRequests } = useMemo(() => {
        const incoming = transferRequests.filter(r => r.toAgentId === agentProfileId && r.status === 'PENDING_AGENT');
        const outgoing = transferRequests.filter(r => r.fromAgentId === agentProfileId);
        const adminPend = transferRequests.filter(r => r.status === 'PENDING_ADMIN');
        return { incomingRequests: incoming, outgoingRequests: outgoing, pendingAdminRequests: adminPend };
    }, [transferRequests, agentProfileId]);

    const handleQtyInput = (key, val) => { 
        let q = parseInt(val) || 0; if(q < 0) q = 0; setItemQtys(p => ({...p, [key]: q})); 
    };
    
    const submitAction = () => {
        if (transferMode) {
            if (!targetAgent) return alert("Select an agent to transfer to!");
            const agentInfo = motorists.find(m => m.id === targetAgent);
            onRequestTransfer(activeCustomer.name, targetAgent, agentInfo.name, transferNote);
            setTransferMode(false); setTargetAgent(''); setTransferNote('');
            return;
        }

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
        
        setSettleMode(false); setReturnMode(false); setItemQtys({});
    };
    
    const formatStockDisplay = (qty, product) => { 
        if (!product) return `${qty} Bks`; 
        const packsPerSlop = product.packsPerSlop || 10; 
        const slops = Math.floor(qty / packsPerSlop); 
        const bks = qty % packsPerSlop; 
        return slops > 0 ? `${qty} Bks (${slops} Slop ${bks > 0 ? `+ ${bks} Bks` : ''})` : `${qty} Bks`; 
    };

    const StatusCard = ({ title, data, colorClass, borderClass, icon, bgClass }) => (
        <div className={`flex flex-col rounded-2xl border ${borderClass} ${bgClass} overflow-hidden shadow-lg`}>
            <div className={`p-4 border-b ${borderClass} flex justify-between items-center bg-black/20`}>
                <h3 className={`font-black uppercase tracking-widest text-sm flex items-center gap-2 ${colorClass}`}>{icon} {title}</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded-full border ${borderClass} ${colorClass}`}>{data.length} Accounts</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-[500px] space-y-3 custom-scrollbar">
                {data.length === 0 ? <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest py-8">No active records</p> : data.map((c, i) => (
                    <div key={i} className="bg-black/40 p-4 rounded-xl border border-white/5 relative overflow-hidden group">
                        <h4 className="font-bold text-white text-base truncate pr-8">{c.name}</h4>
                        <div className="flex justify-between items-end mt-3">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Outstanding</p>
                                <p className={`font-black text-lg ${colorClass}`}>Rp {new Intl.NumberFormat('id-ID').format(c.total)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Debt Age</p>
                                <p className="font-bold text-white">{c.ageDays} Days</p>
                            </div>
                        </div>
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
                        <FileSpreadsheet className="text-orange-500" size={32}/> {isAdmin ? 'Global Receivables' : 'My Receivables'}
                    </h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2">Accounts Receivable & Territory Management</p>
                </div>
                
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full">
                    <button onClick={() => setActiveTab('financials')} className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'financials' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        <DollarSign size={16}/> A/R Financials
                    </button>
                    <button onClick={() => setActiveTab('stock')} className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'stock' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        <Box size={16}/> Physical Stock
                    </button>
                    <button onClick={() => setActiveTab('transfers')} className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap relative ${activeTab === 'transfers' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        <ArrowLeftRight size={16}/> Hand-offs
                        {(incomingRequests.length > 0 || (isAdmin && pendingAdminRequests.length > 0)) && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                        )}
                    </button>
                </div>
            </div>

            {/* --- TAB A: FINANCIALS --- */}
            {activeTab === 'financials' && (
                <div className="animate-fade-in-up space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Total Assigned Debt</p>
                            <p className="text-2xl font-black text-white">Rp {new Intl.NumberFormat('id-ID').format(debtData.totalValue)}</p>
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

            {/* --- TAB B: STOCK & HAND-OFF REQUESTS --- */}
            {activeTab === 'stock' && (
                <div className="animate-fade-in-up flex flex-col lg:flex-row gap-6 h-[calc(100vh-250px)]">
                    <div className={`lg:w-1/3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 flex flex-col ${selectedCustomer ? 'hidden lg:flex' : 'flex'}`}>
                        <div className="p-4 border-b dark:border-slate-700"><h2 className="font-bold text-lg dark:text-white flex items-center gap-2"><Truck size={20}/> Active Consignments</h2></div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {customerData.map(c => (
                                <div key={c.name} onClick={() => setSelectedCustomer(c)} className={`p-4 border-b dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedCustomer?.name === c.name ? 'bg-orange-50 dark:bg-slate-700 border-l-4 border-l-orange-500' : ''}`}>
                                    <div className="flex justify-between items-start"><h3 className="font-bold dark:text-white">{c.name}</h3></div>
                                    <div className="mt-2 flex justify-between items-center">
                                        <span className="text-xs bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded dark:text-slate-300">{Object.values(c.items).reduce((a,b)=>a+b.qty,0)} Bks Held</span>
                                        <span className="font-mono font-bold text-emerald-600">{formatRupiah(c.balance)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`lg:w-2/3 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 overflow-hidden ${!selectedCustomer ? 'hidden lg:flex justify-center items-center' : 'flex'}`}>
                        {!selectedCustomer ? (
                            <div className="text-center text-slate-400"><Store size={48} className="mx-auto mb-4 opacity-20"/><p>Select an account to view details.</p></div>
                        ) : (
                            <>
                                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-2xl">
                                    <div><h2 className="text-2xl font-bold dark:text-white">{activeCustomer?.name}</h2></div>
                                    <div className="text-right"><p className="text-xs text-slate-500 uppercase">Outstanding Balance</p><p className="text-2xl font-bold text-orange-500">{formatRupiah(activeCustomer?.balance || 0)}</p></div>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                    {transferMode ? (
                                        <div className="bg-indigo-950/20 border border-indigo-500/30 p-6 rounded-xl">
                                            <h3 className="font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ArrowLeftRight size={18}/> Hand-off Territory</h3>
                                            <p className="text-xs text-slate-400 mb-4">Transferring this account moves <strong>all active debts and physical stock</strong> to the new agent.</p>
                                            <select className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white mb-4" value={targetAgent} onChange={e => setTargetAgent(e.target.value)}>
                                                <option value="">-- Select Receiving Agent --</option>
                                                {motorists.filter(m => m.id !== agentProfileId).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                            <textarea className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white text-sm" placeholder="Reason for transfer..." value={transferNote} onChange={e => setTransferNote(e.target.value)} rows="3"></textarea>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {Object.entries(activeCustomer?.items || {}).filter(([k, i]) => i.qty > 0).map(([key, item]) => (
                                                <div key={key} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                                                    <div><p className="font-bold dark:text-white">{item.name}</p></div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right"><p className="text-lg font-bold dark:text-white">{formatStockDisplay(item.qty, inventory.find(p => p.id === item.productId))}</p></div>
                                                        {(settleMode || returnMode) && <input type="number" className={`w-24 p-2 rounded border text-center font-bold`} placeholder="Qty" value={itemQtys[key] || ''} onChange={(e) => handleQtyInput(key, e.target.value)} />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
                                    {(!settleMode && !returnMode && !transferMode) ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {isAdmin && <button onClick={() => onAddGoods && onAddGoods(activeCustomer?.name)} className="p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:border-orange-500 transition-all flex flex-col items-center"><Plus size={20} className="text-orange-500 mb-1"/><span className="text-[10px] font-bold dark:text-slate-300">Add Goods</span></button>}
                                            {isAdmin && <button onClick={() => setSettleMode(true)} className="p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:border-emerald-500 transition-all flex flex-col items-center"><Wallet size={20} className="text-emerald-500 mb-1"/><span className="text-[10px] font-bold dark:text-slate-300">Record Payment</span></button>}
                                            {isAdmin && <button onClick={() => setReturnMode(true)} className="p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:border-red-500 transition-all flex flex-col items-center"><RotateCcw size={20} className="text-red-500 mb-1"/><span className="text-[10px] font-bold dark:text-slate-300">Process Return</span></button>}
                                            {!isAdmin && <button onClick={() => setTransferMode(true)} className="p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:border-indigo-500 transition-all flex flex-col items-center"><ArrowLeftRight size={20} className="text-indigo-500 mb-1"/><span className="text-[10px] font-bold dark:text-slate-300">Hand-off Account</span></button>}
                                        </div>
                                    ) : (
                                        <div className="flex gap-3">
                                            <button onClick={() => { setSettleMode(false); setReturnMode(false); setTransferMode(false); setItemQtys({}); }} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold dark:text-slate-300">Cancel</button>
                                            <button onClick={submitAction} className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg bg-emerald-500 hover:bg-emerald-600">Confirm {transferMode ? 'Hand-off Request' : 'Action'}</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* --- TAB C: TRANSFER HANDSHAKE HUB --- */}
            {activeTab === 'transfers' && (
                <div className="animate-fade-in-up grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* INCOMING / ADMIN QUEUE */}
                    <div className="bg-black/20 border border-white/10 rounded-2xl p-6">
                        <h3 className="font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><ArrowLeftRight className="text-indigo-500"/> {isAdmin ? 'Admin Auth Required' : 'Incoming Hand-offs'}</h3>
                        <div className="space-y-4">
                            {isAdmin ? pendingAdminRequests.map(r => (
                                <div key={r.id} className="bg-indigo-950/20 border border-indigo-500/30 p-4 rounded-xl">
                                    <div className="flex justify-between items-start mb-3">
                                        <div><p className="text-xs text-slate-400">Store Transfer</p><h4 className="font-bold text-white text-lg">{r.storeName}</h4></div>
                                        <span className="bg-indigo-500 text-white text-[9px] px-2 py-1 rounded uppercase font-black">Admin Pending</span>
                                    </div>
                                    <p className="text-xs text-slate-300 bg-black/40 p-2 rounded mb-4 text-center"><strong>{r.fromAgentName}</strong> <ArrowRight size={12} className="inline mx-1"/> <strong>{r.toAgentName}</strong></p>
                                    <div className="flex gap-2">
                                        <button onClick={() => onAdminApproveTransfer(r, false)} className="flex-1 py-2 bg-red-900/50 hover:bg-red-500 text-white rounded text-xs font-bold transition-colors">Reject</button>
                                        <button onClick={() => onAdminApproveTransfer(r, true)} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors">Authorize Transfer</button>
                                    </div>
                                </div>
                            )) : incomingRequests.map(r => (
                                <div key={r.id} className="bg-indigo-950/20 border border-indigo-500/30 p-4 rounded-xl">
                                    <div className="flex justify-between items-start mb-3">
                                        <div><p className="text-xs text-slate-400">Incoming from {r.fromAgentName}</p><h4 className="font-bold text-white text-lg">{r.storeName}</h4></div>
                                    </div>
                                    <p className="text-xs text-slate-400 italic mb-4">"{r.note}"</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => onAgentAcceptTransfer(r.id, false)} className="flex-1 py-2 bg-red-900/50 hover:bg-red-500 text-white rounded text-xs font-bold transition-colors">Decline</button>
                                        <button onClick={() => onAgentAcceptTransfer(r.id, true)} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition-colors">Accept Responsibility</button>
                                    </div>
                                </div>
                            ))}
                            {(isAdmin ? pendingAdminRequests.length === 0 : incomingRequests.length === 0) && <p className="text-center text-xs text-slate-500 py-8">No pending action required.</p>}
                        </div>
                    </div>

                    {/* OUTGOING QUEUE */}
                    <div className="bg-black/20 border border-white/10 rounded-2xl p-6 opacity-70">
                        <h3 className="font-black text-slate-400 uppercase tracking-widest mb-4">My Outgoing Requests</h3>
                        <div className="space-y-3">
                            {outgoingRequests.length === 0 ? <p className="text-center text-xs text-slate-500 py-4">No outgoing transfers.</p> : outgoingRequests.map(r => (
                                <div key={r.id} className="bg-black/40 border border-white/5 p-3 rounded-lg flex justify-between items-center">
                                    <div><p className="text-xs font-bold text-white">{r.storeName}</p><p className="text-[10px] text-slate-500">To: {r.toAgentName}</p></div>
                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${r.status === 'PENDING_AGENT' ? 'bg-orange-500/20 text-orange-400' : r.status === 'PENDING_ADMIN' ? 'bg-indigo-500/20 text-indigo-400' : r.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{r.status.replace('_', ' ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsignmentFinanceView;