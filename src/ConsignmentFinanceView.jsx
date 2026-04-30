import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, ShieldCheck, AlertCircle, XCircle, MessageSquare, Box, Package, ArrowRight, DollarSign, Store, Truck, Plus, Wallet, RotateCcw, Lock, Trash2, ArrowLeftRight, Check, X, ClipboardList, ScanSearch, Calculator } from 'lucide-react';

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
    const [transferMode, setTransferMode] = useState(false);
    
    // 🚀 NEW: AUDIT TERMINAL STATE
    const [auditMode, setAuditMode] = useState(false);
    const [auditData, setAuditData] = useState({}); // { [itemKey]: { shelf: '', damaged: '' } }
    
    const [targetAgent, setTargetAgent] = useState('');
    const [transferNote, setTransferNote] = useState('');

    const myTransactions = useMemo(() => {
        if (isAdmin) return transactions;
        return transactions.filter(t => {
            const matchId = agentProfileId && t.agentId === agentProfileId;
            const matchName = user && t.agentName && (t.agentName === user.displayName || t.agentName === user.name || t.agentName === user.email?.split('@')[0]);
            return matchId || matchName;
        });
    }, [transactions, isAdmin, agentProfileId, user]);

    // 🚀 1. DYNAMIC FIFO DEBT ENGINE 🚀
    const debtData = useMemo(() => {
        const customers = {};
        const sorted = [...myTransactions].sort((a,b) => new Date(a.date) - new Date(b.date));

        sorted.forEach(t => {
            const cName = (t.customerName || 'Unknown').trim();
            if (!customers[cName]) customers[cName] = { name: cName, debts: [], phone: '' };
            if (t.phone) customers[cName].phone = t.phone;

            if (t.type === 'SALE' && t.paymentType === 'Titip') {
                customers[cName].debts.push({ 
                    id: t.id, 
                    date: t.date, 
                    timestamp: t.timestamp,
                    original: t.total, 
                    remaining: t.total,
                    tempoDays: t.tempoDays || 7 // Fallback to 7 if old data
                });
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
                
                // Track the oldest ACTIVE invoice to determine radar status
                const oldestDebt = active[0];
                const oldestDate = new Date(oldestDebt.timestamp?.seconds ? oldestDebt.timestamp.seconds * 1000 : oldestDebt.date);
                oldestDate.setHours(0,0,0,0);
                
                const ageDays = Math.floor((today - oldestDate) / (1000 * 60 * 60 * 24));
                const tempoDays = oldestDebt.tempoDays || 7;
                
                // 🚀 DYNAMIC TEMPO MATH
                const daysUntilDue = tempoDays - ageDays;
                
                let status = 'GREEN';
                if (daysUntilDue < 0) { 
                    status = 'RED'; 
                    results.totalOverdue += total; 
                }
                else if (daysUntilDue <= 3) {
                    status = 'YELLOW'; // Due in 3 days or less
                }

                results.totalValue += total; 
                results.activeAccounts++;
                results[status].push({ 
                    name: c.name, 
                    total, 
                    ageDays, 
                    daysUntilDue,
                    tempoDays,
                    oldestDate: oldestDebt.date, 
                    phone: c.phone, 
                    activeInvoices: active.length 
                });
            }
        });
        
        // Sort RED by most overdue, YELLOW by closest to due, GREEN by closest to due
        results.RED.sort((a,b) => a.daysUntilDue - b.daysUntilDue); 
        results.YELLOW.sort((a,b) => a.daysUntilDue - b.daysUntilDue); 
        results.GREEN.sort((a,b) => a.daysUntilDue - b.daysUntilDue);
        
        return results;
    }, [myTransactions]);

    // 🚀 2. PHYSICAL STOCK ENGINE
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
                customers[name].balance += t.total; // total is negative, so this subtracts
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
    
    // 🚀 3. TRANSFER ROUTING ENGINE
    const { incomingRequests, outgoingRequests, pendingAdminRequests } = useMemo(() => {
        const incoming = transferRequests.filter(r => r.toAgentId === agentProfileId && r.status === 'PENDING_AGENT');
        const outgoing = transferRequests.filter(r => r.fromAgentId === agentProfileId);
        const adminPend = transferRequests.filter(r => r.status === 'PENDING_ADMIN');
        return { incomingRequests: incoming, outgoingRequests: outgoing, pendingAdminRequests: adminPend };
    }, [transferRequests, agentProfileId]);

    // 🚀 NEW: AUDIT INPUT HANDLER
    const handleAuditInput = (key, field, val) => {
        const numVal = parseInt(val) || 0;
        
        setAuditData(prev => {
            const current = prev[key] || { shelf: '', damaged: '' };
            const updated = { ...current, [field]: val === '' ? '' : Math.max(0, numVal) };

            const totalItemQty = activeCustomer.items[key].qty;
            const shelf = parseInt(updated.shelf) || 0;
            const damaged = parseInt(updated.damaged) || 0;

            if (shelf + damaged > totalItemQty) {
                alert("INVALID AUDIT!\n\nJumlah (Sisa di Rak + Retur Rusak) tidak boleh melebihi total barang yang dititipkan.");
                return current; // Revert change
            }

            return { ...prev, [key]: updated };
        });
    };
    
    const submitAction = async () => {
        if (transferMode) {
            if (!targetAgent) return alert("Select an agent to transfer to!");
            const agentInfo = motorists.find(m => m.id === targetAgent);
            onRequestTransfer(activeCustomer.name, targetAgent, agentInfo.name, transferNote);
            setTransferMode(false); setTargetAgent(''); setTransferNote('');
            return;
        }

        if (auditMode) {
            const paymentItems = [];
            let paymentTotal = 0;
            const returnItems = [];
            let returnTotal = 0;

            Object.entries(auditData).forEach(([key, data]) => {
                const item = activeCustomer.items[key];
                const shelf = parseInt(data.shelf) || 0;
                const damaged = parseInt(data.damaged) || 0;
                
                // LAKU = TOTAL - SISA - RETUR
                const sold = item.qty - shelf - damaged;

                if (sold > 0) {
                    paymentItems.push({ productId: item.productId, name: item.name, qty: sold, priceTier: item.priceTier, calculatedPrice: item.calculatedPrice, unit: 'Bks' });
                    paymentTotal += (sold * item.calculatedPrice);
                }
                if (damaged > 0) {
                    returnItems.push({ productId: item.productId, name: item.name, qty: damaged, priceTier: item.priceTier, calculatedPrice: item.calculatedPrice, unit: 'Bks' });
                    returnTotal += (damaged * item.calculatedPrice);
                }
            });

            if (paymentItems.length === 0 && returnItems.length === 0) {
                return alert("No changes recorded. Did you enter Sisa / Retur data?");
            }

            if (!window.confirm(`Confirm Store Audit?\n\n- Payment to Collect: Rp ${new Intl.NumberFormat('id-ID').format(paymentTotal)}\n- Bad Stock to Retur: ${returnItems.reduce((s, i) => s + i.qty, 0)} Bks`)) return;

            // Sequential processing
            try {
                // 🚀 PASS ALL THE ARRAYS TO THE ENGINE SO IT CAN SNAPSHOT THE AUDIT
                if (paymentItems.length > 0 && onPayment) {
                    const remainingItems = [];
                    Object.entries(auditData).forEach(([key, data]) => {
                        const item = activeCustomer.items[key];
                        const shelf = parseInt(data.shelf) || 0;
                        if (shelf > 0) remainingItems.push({ ...item, qty: shelf, unit: 'Bks' });
                    });
                    
                    await onPayment(activeCustomer.name, paymentItems, paymentTotal, returnItems, remainingItems);
                }

                // If there are return items but NO payments (e.g. everything was damaged, nothing sold)
                // We still need to run the Return protocol to fix the vehicle stock
                if (returnItems.length > 0 && onReturn && paymentItems.length === 0) {
                    await onReturn(activeCustomer.name, returnItems, returnTotal);
                }
                
                setAuditMode(false);
                setAuditData({});
                alert("Audit Complete! Ledgers and Vehicle Inventory Updated.");
            } catch (err) {
                console.error(err);
                alert("Error saving audit data.");
            }
        }
    };
    
    const formatStockDisplay = (qty, product) => { 
        if (!product) return `${qty} Bks`; 
        const packsPerSlop = product.packsPerSlop || 10; 
        const slops = Math.floor(qty / packsPerSlop); 
        const bks = qty % packsPerSlop; 
        return slops > 0 ? `${qty} Bks (${slops} Slop ${bks > 0 ? `+ ${bks} Bks` : ''})` : `${qty} Bks`; 
    };

    const StatusCard = ({ title, data, colorClass, borderClass, icon, bgClass, isOverdue }) => (
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
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Tempo Check</p>
                                {isOverdue ? (
                                    <p className="font-bold text-red-500 animate-pulse">{Math.abs(c.daysUntilDue)} Days Overdue</p>
                                ) : (
                                    <p className={`font-bold ${c.daysUntilDue === 0 ? 'text-orange-400' : 'text-white'}`}>
                                        {c.daysUntilDue === 0 ? 'Due Today!' : `Due in ${c.daysUntilDue} Days`}
                                    </p>
                                )}
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
                        <StatusCard title="Safe (Due in 4+ Days)" data={debtData.GREEN} colorClass="text-emerald-500" borderClass="border-emerald-500/30" bgClass="bg-emerald-950/10" icon={<ShieldCheck size={18}/>} isOverdue={false} />
                        <StatusCard title="Warning (Due Soon)" data={debtData.YELLOW} colorClass="text-yellow-500" borderClass="border-yellow-500/30" bgClass="bg-yellow-950/10" icon={<AlertCircle size={18}/>} isOverdue={false} />
                        <StatusCard title="OVERDUE (Jatuh Tempo)" data={debtData.RED} colorClass="text-red-500" borderClass="border-red-500/50" bgClass="bg-red-950/20" icon={<XCircle size={18}/>} isOverdue={true} />
                    </div>
                </div>
            )}

            {/* --- TAB B: STOCK & AUDIT TERMINAL --- */}
            {activeTab === 'stock' && (
                <div className="animate-fade-in-up flex flex-col lg:flex-row gap-6 h-[calc(100vh-250px)]">
                    
                    {/* LEFT LIST */}
                    <div className={`lg:w-1/3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 flex flex-col ${selectedCustomer ? 'hidden lg:flex' : 'flex'}`}>
                        <div className="p-4 border-b dark:border-slate-700"><h2 className="font-bold text-lg dark:text-white flex items-center gap-2"><Truck size={20}/> Active Consignments</h2></div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {customerData.map(c => (
                                <div key={c.name} onClick={() => { setSelectedCustomer(c); setAuditMode(false); setTransferMode(false); setAuditData({}); }} className={`p-4 border-b dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedCustomer?.name === c.name ? 'bg-orange-50 dark:bg-slate-700 border-l-4 border-l-orange-500' : ''}`}>
                                    <div className="flex justify-between items-start"><h3 className="font-bold dark:text-white">{c.name}</h3></div>
                                    <div className="mt-2 flex justify-between items-center">
                                        <span className="text-xs bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded dark:text-slate-300">{Object.values(c.items).reduce((a,b)=>a+b.qty,0)} Bks Held</span>
                                        <span className="font-mono font-bold text-emerald-600">{formatRupiah(c.balance)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT PANEL (AUDIT TERMINAL) */}
                    <div className={`lg:w-2/3 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 overflow-hidden ${!selectedCustomer ? 'hidden lg:flex justify-center items-center' : 'flex'}`}>
                        {!selectedCustomer ? (
                            <div className="text-center text-slate-400"><Store size={48} className="mx-auto mb-4 opacity-20"/><p>Select an account to view details.</p></div>
                        ) : (
                            <>
                                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-2xl">
                                    <div><h2 className="text-2xl font-bold dark:text-white">{activeCustomer?.name}</h2></div>
                                    <div className="text-right"><p className="text-xs text-slate-500 uppercase">Outstanding Balance</p><p className="text-2xl font-black text-orange-500">{formatRupiah(activeCustomer?.balance || 0)}</p></div>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-black/5">
                                    {transferMode ? (
                                        <div className="bg-indigo-950/20 border border-indigo-500/30 p-6 rounded-xl">
                                            <h3 className="font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ArrowLeftRight size={18}/> Hand-off Territory</h3>
                                            <p className="text-xs text-slate-400 mb-4">Transferring this account moves <strong>all active debts and physical stock</strong> to the new agent.</p>
                                            <select className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white mb-4 outline-none focus:border-indigo-500" value={targetAgent} onChange={e => setTargetAgent(e.target.value)}>
                                                <option value="">-- Select Receiving Agent --</option>
                                                {motorists.filter(m => m.id !== agentProfileId).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                            <textarea className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-indigo-500" placeholder="Reason for transfer..." value={transferNote} onChange={e => setTransferNote(e.target.value)} rows="3"></textarea>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* 🚀 THE NEW AUDIT TERMINAL UI 🚀 */}
                                            {auditMode && (
                                                <div className="bg-orange-900/20 border border-orange-500/30 p-4 rounded-xl mb-4 flex gap-4 items-start shadow-inner">
                                                    <Calculator className="text-orange-500 shrink-0" size={24}/>
                                                    <div>
                                                        <h4 className="text-orange-400 font-black uppercase tracking-widest text-xs mb-1">Store Audit Mode</h4>
                                                        <p className="text-[10px] text-slate-300 leading-relaxed">
                                                            Hitung fisik barang di rak warung. Masukkan jumlah <strong>Sisa Barang</strong> dan <strong>Barang Rusak (Retur)</strong>. Sistem otomatis menghitung barang yang Laku dan total tagihan.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 border-b dark:border-slate-700 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                <div className="col-span-4">Macam Barang</div>
                                                <div className="col-span-2 text-center">Dititip</div>
                                                {auditMode ? (
                                                    <>
                                                        <div className="col-span-2 text-center text-blue-400">Sisa Rak</div>
                                                        <div className="col-span-2 text-center text-red-400">Retur / BS</div>
                                                        <div className="col-span-2 text-right text-emerald-400">Laku (Rp)</div>
                                                    </>
                                                ) : (
                                                    <div className="col-span-6 text-right">Nilai Barang</div>
                                                )}
                                            </div>

                                            {Object.entries(activeCustomer?.items || {}).filter(([k, i]) => i.qty > 0).map(([key, item]) => {
                                                const aData = auditData[key] || { shelf: '', damaged: '' };
                                                const shelf = parseInt(aData.shelf) || 0;
                                                const damaged = parseInt(aData.damaged) || 0;
                                                const soldQty = auditMode ? Math.max(0, item.qty - shelf - damaged) : 0;
                                                const soldValue = soldQty * item.calculatedPrice;

                                                return (
                                                    <div key={key} className={`flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-2 p-4 items-center bg-white dark:bg-slate-900 rounded-xl border transition-colors ${auditMode && soldQty > 0 ? 'border-emerald-500/50 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]' : 'dark:border-slate-700 shadow-sm'}`}>
                                                        
                                                        <div className="col-span-12 md:col-span-4 w-full md:w-auto flex flex-col">
                                                            <p className="font-bold dark:text-white uppercase text-sm md:text-xs truncate">{item.name}</p>
                                                            <span className="text-[9px] text-slate-500 font-mono">Rp {new Intl.NumberFormat('id-ID').format(item.calculatedPrice)} / Bks</span>
                                                        </div>
                                                        
                                                        <div className="col-span-12 md:col-span-2 w-full md:w-auto flex justify-between md:justify-center items-center">
                                                            <span className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Dititip:</span>
                                                            <div className="text-right md:text-center">
                                                                <p className="text-base md:text-sm font-black dark:text-white">{item.qty}</p>
                                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Bks</p>
                                                            </div>
                                                        </div>
                                                        
                                                        {auditMode ? (
                                                            <>
                                                                <div className="col-span-12 md:col-span-4 w-full grid grid-cols-2 gap-2 mt-2 md:mt-0">
                                                                    <div className="relative">
                                                                        <label className="md:hidden text-[9px] text-blue-400 font-bold uppercase block mb-1">Sisa di Rak</label>
                                                                        <input type="number" min="0" placeholder="Sisa" value={aData.shelf} onChange={(e) => handleAuditInput(key, 'shelf', e.target.value)} className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/50 rounded-lg p-2 text-center font-bold text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500"/>
                                                                    </div>
                                                                    <div className="relative">
                                                                        <label className="md:hidden text-[9px] text-red-400 font-bold uppercase block mb-1">Retur / BS</label>
                                                                        <input type="number" min="0" placeholder="Retur" value={aData.damaged} onChange={(e) => handleAuditInput(key, 'damaged', e.target.value)} className="w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/50 rounded-lg p-2 text-center font-bold text-red-600 dark:text-red-400 outline-none focus:ring-2 focus:ring-red-500"/>
                                                                    </div>
                                                                </div>
                                                                <div className="col-span-12 md:col-span-2 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 dark:border-slate-700 flex justify-between md:justify-end md:flex-col items-center md:items-end">
                                                                    <span className="md:hidden text-[10px] font-bold text-emerald-500 uppercase">Terjual & Tagihan:</span>
                                                                    <div className="text-right">
                                                                        <p className="text-xs font-black text-emerald-500">{soldQty} Laku</p>
                                                                        <p className="text-sm font-black text-white mt-0.5 font-mono">Rp {new Intl.NumberFormat('id-ID').format(soldValue)}</p>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="col-span-12 md:col-span-6 w-full md:w-auto flex justify-between md:justify-end items-center mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 dark:border-slate-700">
                                                                <span className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Nilai Barang:</span>
                                                                <p className="text-sm font-black text-slate-400 font-mono">Rp {new Intl.NumberFormat('id-ID').format(item.qty * item.calculatedPrice)}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-4 md:p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-2xl shrink-0">
                                    {(!auditMode && !transferMode) ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {isAdmin && <button onClick={() => onAddGoods && onAddGoods(activeCustomer?.name)} className="p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:border-orange-500 transition-all flex flex-col items-center shadow-sm"><Plus size={20} className="text-orange-500 mb-1"/><span className="text-[10px] font-bold dark:text-slate-300">Add Goods</span></button>}
                                            {isAdmin && <button onClick={() => setAuditMode(true)} className="col-span-2 p-3 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex flex-col items-center shadow-lg active:scale-95"><ScanSearch size={24} className="text-white mb-1"/><span className="text-[11px] uppercase tracking-widest font-black text-white">Store Audit</span></button>}
                                            {!isAdmin && <button onClick={() => setTransferMode(true)} className="p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:border-indigo-500 transition-all flex flex-col items-center shadow-sm"><ArrowLeftRight size={20} className="text-indigo-500 mb-1"/><span className="text-[10px] font-bold dark:text-slate-300">Hand-off</span></button>}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col md:flex-row gap-3">
                                            <button onClick={() => { setAuditMode(false); setTransferMode(false); setAuditData({}); }} className="w-full md:w-1/3 py-4 rounded-xl bg-slate-200 dark:bg-slate-800 font-bold dark:text-slate-300 uppercase tracking-widest text-xs hover:dark:bg-slate-700 transition-colors">Cancel</button>
                                            <button onClick={submitAction} className="w-full md:w-2/3 py-4 rounded-xl font-black text-white shadow-lg bg-emerald-500 hover:bg-emerald-600 uppercase tracking-[0.1em] flex justify-center items-center gap-2 active:scale-95 transition-transform"><Check size={18}/> Confirm {transferMode ? 'Hand-off Request' : 'Audit & Update Ledgers'}</button>
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