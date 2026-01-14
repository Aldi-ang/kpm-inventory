import React, { useState, useMemo } from 'react';
import { Truck, Trash2, Store, ArrowRight, Package, Plus, Wallet, RotateCcw } from 'lucide-react';
import { convertToBks, formatRupiah } from '../../utils';

const ConsignmentView = ({ transactions, inventory, onAddGoods, onPayment, onReturn, onDeleteConsignment }) => {
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [settleMode, setSettleMode] = useState(false);
    const [returnMode, setReturnMode] = useState(false);
    const [itemQtys, setItemQtys] = useState({});

    const customerData = useMemo(() => {
        const customers = {};
        const sortedTransactions = [...transactions].sort((a, b) => {
            const tA = a.timestamp?.seconds || 0;
            const tB = b.timestamp?.seconds || 0;
            return tA - tB;
        });

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
                    
                    if(!customers[name].items[itemKey]) {
                        customers[name].items[itemKey] = { 
                            ...item, 
                            qty: 0, 
                            unit: 'Bks', 
                            calculatedPrice: item.calculatedPrice / convertToBks(1, item.unit, product) 
                        };
                    }
                    customers[name].items[itemKey].qty += bksQty;
                });
            }
            
            if (t.type === 'RETURN') {
                customers[name].balance += t.total; 
                t.items.forEach(item => {
                    const product = getProduct(item.productId);
                    const bksQty = convertToBks(item.qty, item.unit, product);
                    const itemKey = `${item.productId}-${item.priceTier || 'Standard'}`;
                    if(customers[name].items[itemKey]) {
                        customers[name].items[itemKey].qty -= bksQty;
                    } else {
                        const altKey = Object.keys(customers[name].items).find(k => k.startsWith(item.productId));
                        if(altKey) customers[name].items[altKey].qty -= bksQty;
                    }
                });
            }

            if (t.type === 'CONSIGNMENT_PAYMENT') {
                customers[name].balance -= t.amountPaid;
                t.itemsPaid.forEach(item => {
                    const product = getProduct(item.productId);
                    const bksQty = convertToBks(item.qty, item.unit, product);
                    const itemKey = `${item.productId}-${item.priceTier || 'Standard'}`; 
                     if(customers[name].items[itemKey]) {
                        customers[name].items[itemKey].qty -= bksQty;
                    }
                });
            }
        });

        Object.values(customers).forEach(c => {
            c.balance = Math.max(0, c.balance);
            Object.keys(c.items).forEach(k => {
                c.items[k].qty = Math.max(0, c.items[k].qty);
            });
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
        const itemsToProcess = [];
        let totalValue = 0;
        
        Object.entries(itemQtys).forEach(([key, qty]) => {
            if(qty > 0) {
                const item = activeCustomer.items[key];
                itemsToProcess.push({ 
                    productId: item.productId, 
                    name: item.name, 
                    qty, 
                    priceTier: item.priceTier, 
                    calculatedPrice: item.calculatedPrice, 
                    unit: 'Bks' 
                });
                totalValue += (item.calculatedPrice * qty);
            }
        });

        if(itemsToProcess.length === 0) return;

        if (settleMode) {
            onPayment(activeCustomer.name, itemsToProcess, totalValue);
        } else if (returnMode) {
            onReturn(activeCustomer.name, itemsToProcess, totalValue);
        }
        
        setSettleMode(false);
        setReturnMode(false);
        setItemQtys({});
    };

    const formatStockDisplay = (qty, product) => {
        if (!product) return `${qty} Bks`;
        const packsPerSlop = product.packsPerSlop || 10;
        const slops = Math.floor(qty / packsPerSlop);
        const bks = qty % packsPerSlop;
        if (slops > 0) {
            return `${qty} Bks (${slops} Slop ${bks > 0 ? `+ ${bks} Bks` : ''})`;
        }
        return `${qty} Bks`;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] animate-fade-in">
            <div className={`lg:w-1/3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 flex flex-col ${selectedCustomer ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 border-b dark:border-slate-700">
                    <h2 className="font-bold text-lg dark:text-white flex items-center gap-2"><Truck size={20}/> Active Consignments</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {customerData.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">No active consignments found. Create a "Titip" sale in Sales POS to start.</div>
                    ) : (
                        customerData.map(c => (
                            <div key={c.name} onClick={() => setSelectedCustomer(c)} className={`p-4 border-b dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedCustomer?.name === c.name ? 'bg-orange-50 dark:bg-slate-700 border-l-4 border-l-orange-500' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold dark:text-white">{c.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">{c.lastActivity}</span>
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteConsignment(c.name); }} className="text-slate-400 hover:text-red-500 p-1" title="Clear History">
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2 flex justify-between items-center">
                                    <span className="text-xs bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded dark:text-slate-300">
                                        {Object.values(c.items).reduce((a,b)=>a+b.qty,0)} Bks Held
                                    </span>
                                    <span className="font-mono font-bold text-emerald-600">{formatRupiah(c.balance)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className={`lg:w-2/3 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 ${!selectedCustomer ? 'hidden lg:flex justify-center items-center' : 'flex'}`}>
                {!selectedCustomer ? (
                    <div className="text-center text-slate-400">
                        <Store size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>Select a customer to view details</p>
                    </div>
                ) : (
                    <>
                        <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-2xl">
                            <div>
                                <div className="flex items-center gap-2 lg:hidden mb-2 text-slate-400" onClick={() => setSelectedCustomer(null)}>
                                    <ArrowRight className="rotate-180" size={16}/> Back
                                </div>
                                <h2 className="text-2xl font-bold dark:text-white">{activeCustomer?.name}</h2>
                                <p className="text-sm text-slate-500">Consignment Status</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Outstanding Balance</p>
                                <p className="text-2xl font-bold text-orange-500">{formatRupiah(activeCustomer?.balance || 0)}</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <h3 className="font-bold mb-4 dark:text-white flex items-center gap-2"><Package size={18}/> Goods at Customer (Belum Laku)</h3>
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
                                                    <p className="text-[10px] text-slate-400">Total Held</p>
                                                </div>
                                                {(settleMode || returnMode) && (
                                                    <div className="flex items-center gap-2 animate-fade-in-right">
                                                        <ArrowRight size={14} className="text-slate-400"/>
                                                        <input 
                                                            type="number" 
                                                            className={`w-24 p-2 rounded border text-center ${returnMode ? 'border-red-400 bg-red-50 text-red-600' : 'border-emerald-400 bg-emerald-50 text-emerald-600'}`}
                                                            placeholder="Qty (Bks)"
                                                            value={itemQtys[key] || ''}
                                                            onChange={(e) => handleQtyInput(key, e.target.value, item.qty)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
                            {(!settleMode && !returnMode) ? (
                                <div className="grid grid-cols-3 gap-3">
                                    <button onClick={() => onAddGoods(activeCustomer?.name)} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:bg-orange-50 dark:hover:bg-slate-700 hover:border-orange-500 transition-all group">
                                        <Plus size={24} className="text-orange-500 mb-1 group-hover:scale-110 transition-transform"/>
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Add Goods</span>
                                    </button>
                                    <button onClick={() => setSettleMode(true)} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-700 hover:border-emerald-500 transition-all group">
                                        <Wallet size={24} className="text-emerald-500 mb-1 group-hover:scale-110 transition-transform"/>
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Record Payment</span>
                                    </button>
                                    <button onClick={() => setReturnMode(true)} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:bg-red-50 dark:hover:bg-slate-700 hover:border-red-500 transition-all group">
                                        <RotateCcw size={24} className="text-red-500 mb-1 group-hover:scale-110 transition-transform"/>
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Process Return</span>
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className={`mb-3 p-2 rounded text-center text-sm font-bold ${settleMode ? 'text-emerald-600 bg-emerald-100' : 'text-red-600 bg-red-100'}`}>
                                        {settleMode ? "Select items sold & paid for (in Bks)" : "Select items returned unsold (in Bks)"}
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => { setSettleMode(false); setReturnMode(false); setItemQtys({}); }} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300">Cancel</button>
                                        <button onClick={submitAction} className={`flex-1 py-3 rounded-xl font-bold text-white ${settleMode ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
                                            Confirm {settleMode ? 'Payment' : 'Return'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ConsignmentView;