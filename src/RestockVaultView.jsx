import React, { useState } from 'react';
import { PackagePlus, Receipt, Calculator, Calendar, UploadCloud, CheckCircle, AlertCircle, FileText, Search, Save, X, ShoppingCart, Truck, RefreshCcw, History, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { doc, collection, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';

const RestockVaultView = ({ inventory = [], procurements = [], db, appId, user, logAudit, triggerCapy }) => {
    const [viewMode, setViewMode] = useState('cart'); // 'cart' | 'ledger'
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPO, setExpandedPO] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // --- PHASE 1: MULTI-ITEM CART STATE ---
    const [cart, setCart] = useState([]);
    
    // --- PROCUREMENT STATE ---
    const [poData, setPoData] = useState({
        supplierName: '',
        poNumber: `PO-${Date.now().toString().slice(-6)}`,
        shippingCost: 0,
        exciseTax: 0,
        laborCost: 0,
        expiryDate: '',
    });

    const [receiptFile, setReceiptFile] = useState(null);

    // --- CART LOGIC ---
    const addToCart = (product) => {
        if (cart.find(item => item.id === product.id)) return;
        setCart([...cart, { 
            ...product, 
            qtyOrdered: 0, 
            qtyReceived: 0, 
            basePrice: product.priceDistributor || 0 
        }]);
    };

    const removeFromCart = (productId) => setCart(cart.filter(item => item.id !== productId));
    const updateCartItem = (productId, field, value) => setCart(cart.map(item => item.id === productId ? { ...item, [field]: value } : item));

    const filteredInventory = inventory.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku?.toLowerCase().includes(searchTerm.toLowerCase()));

    // --- CALCULATIONS ---
    const totalBasePrice = cart.reduce((sum, item) => sum + (parseFloat(item.qtyReceived || 0) * parseFloat(item.basePrice || 0)), 0);
    const totalItemsReceived = cart.reduce((sum, item) => sum + parseFloat(item.qtyReceived || 0), 0);

    const handleProcessRestock = async () => {
        if (!user || !db) return alert("System disconnected. Cannot save.");
        if (cart.length === 0) return alert("Your procurement cart is empty.");
        if (totalItemsReceived <= 0) return alert("You must enter received quantities for your items.");
        
        const batchId = `BCH-${new Date().toISOString().slice(2,10).replace(/-/g,'')}`;
        const trueLandedTotal = totalBasePrice + (parseFloat(poData.shippingCost)||0) + (parseFloat(poData.laborCost)||0) + (parseFloat(poData.exciseTax)||0);

        setIsSubmitting(true);
        try {
            await runTransaction(db, async (transaction) => {
                const stockUpdates = [];
                for (const item of cart) {
                    const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id);
                    const prodDoc = await transaction.get(prodRef);
                    if (!prodDoc.exists()) throw new Error(`Product ${item.name} missing from database.`);
                    const currentStock = prodDoc.data().stock || 0;
                    const receivedQty = parseInt(item.qtyReceived) || 0;
                    stockUpdates.push({ ref: prodRef, newStock: currentStock + receivedQty });
                }

                const poRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/procurement`));
                const poRecord = { batchId, ...poData, items: cart, totalBasePrice, trueLandedTotal, timestamp: serverTimestamp(), hasReceipt: !!receiptFile };
                
                transaction.set(poRef, poRecord);
                for (const update of stockUpdates) { transaction.update(update.ref, { stock: update.newStock }); }
            });

            if (logAudit) await logAudit("RESTOCK_VAULT", `Procured ${totalItemsReceived} units under ${poData.poNumber}`);
            if (triggerCapy) triggerCapy(`Shipment Secured! Added ${totalItemsReceived} units to stock.`);
            
            setCart([]);
            setPoData({ supplierName: '', poNumber: `PO-${Date.now().toString().slice(-6)}`, shippingCost: 0, exciseTax: 0, laborCost: 0, expiryDate: '' });
            setReceiptFile(null);
            setViewMode('ledger'); // Auto-switch to ledger after success
            
        } catch (error) {
            console.error(error);
            alert("Procurement Failed: " + error.message);
        }
        setIsSubmitting(false);
    };

    // ==========================================
    // RENDER: LEDGER HISTORY VIEW
    // ==========================================
    if (viewMode === 'ledger') {
        return (
            <div className="flex-1 flex flex-col bg-[#0a0a0a] text-slate-300 font-sans p-4 lg:p-6 overflow-hidden h-full">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 shrink-0">
                    <div>
                        <h2 className="text-xl lg:text-2xl font-black text-white flex items-center gap-3"><History className="text-orange-500"/> Procurement Ledger</h2>
                        <p className="text-[10px] lg:text-xs text-slate-500 uppercase tracking-widest mt-1">Historical Shipment Records</p>
                    </div>
                    <button onClick={() => setViewMode('cart')} className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 rounded-xl transition-colors text-xs lg:text-sm font-bold shadow-lg active:scale-95">
                        <ArrowRight className="rotate-180" size={16}/> Back to Cart
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {procurements.length === 0 ? (
                        <div className="text-center py-20 text-slate-600">
                            <History size={48} className="mx-auto mb-4 opacity-20"/>
                            <p className="tracking-widest uppercase text-sm font-bold opacity-50">No Records Found</p>
                        </div>
                    ) : (
                        procurements.map(po => (
                            <div key={po.id} className="bg-black border border-white/10 rounded-xl overflow-hidden shadow-lg transition-all hover:border-white/20">
                                <div 
                                    className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer gap-4"
                                    onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-orange-900/20 text-orange-500 rounded-xl border border-orange-500/30 shrink-0">
                                            <Truck size={20}/>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-base lg:text-lg tracking-wider font-mono">{po.poNumber}</h3>
                                            <p className="text-[10px] lg:text-xs text-slate-500 uppercase">{po.supplierName || 'Unknown Supplier'} • {po.timestamp ? new Date(po.timestamp.seconds * 1000).toLocaleDateString() : 'Recent'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-6 lg:gap-8 border-t md:border-0 border-white/5 pt-3 md:pt-0">
                                        <div className="text-left md:text-right">
                                            <p className="text-[9px] lg:text-[10px] text-slate-500 uppercase font-bold">Total Wares</p>
                                            <p className="text-xs lg:text-sm text-emerald-400 font-bold font-mono">{po.items?.reduce((acc, i) => acc + parseInt(i.qtyReceived), 0)} Bks</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] lg:text-[10px] text-slate-500 uppercase font-bold">Landed Cost</p>
                                            <p className="text-sm lg:text-lg text-white font-black font-mono">Rp {new Intl.NumberFormat('id-ID').format(po.trueLandedTotal || po.totalBasePrice || 0)}</p>
                                        </div>
                                        <div className="text-slate-500 hidden md:block">
                                            {expandedPO === po.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                        </div>
                                    </div>
                                </div>
                                
                                {expandedPO === po.id && (
                                    <div className="border-t border-white/10 bg-[#0f0f0f] p-4 lg:p-6 animate-fade-in">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                                            <div>
                                                <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest border-b border-white/5 pb-1">Items Received</h4>
                                                <div className="space-y-2">
                                                    {po.items?.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between items-center bg-black p-2.5 rounded-lg border border-white/5">
                                                            <div className="flex items-center gap-3">
                                                                <span className="bg-orange-900/30 text-orange-500 px-2 py-0.5 rounded border border-orange-500/30 font-bold font-mono text-[10px]">{item.qtyReceived}x</span>
                                                                <span className="text-xs text-white uppercase font-bold">{item.name}</span>
                                                            </div>
                                                            <span className="text-[10px] lg:text-xs text-slate-400 font-mono">@ Rp {new Intl.NumberFormat('id-ID').format(item.basePrice || 0)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest border-b border-white/5 pb-1">Cost Breakdown</h4>
                                                <div className="space-y-2 text-[10px] lg:text-xs font-mono bg-black p-4 rounded-xl border border-white/5">
                                                    <div className="flex justify-between"><span className="text-slate-500">Wares Subtotal:</span><span className="text-white">Rp {new Intl.NumberFormat('id-ID').format(po.totalBasePrice || 0)}</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Shipping:</span><span className="text-orange-400">Rp {new Intl.NumberFormat('id-ID').format(po.shippingCost || 0)}</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Excise Tax (Cukai):</span><span className="text-orange-400">Rp {new Intl.NumberFormat('id-ID').format(po.exciseTax || 0)}</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Labor:</span><span className="text-orange-400">Rp {new Intl.NumberFormat('id-ID').format(po.laborCost || 0)}</span></div>
                                                    <div className="border-t border-white/10 pt-3 mt-1 flex justify-between font-bold"><span className="text-slate-300">True Landed Total:</span><span className="text-emerald-400 text-sm">Rp {new Intl.NumberFormat('id-ID').format(po.trueLandedTotal || 0)}</span></div>
                                                </div>
                                                
                                                <div className="mt-4 flex gap-2">
                                                    {po.hasReceipt ? (
                                                        <span className="bg-emerald-900/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><FileText size={12}/> Digital Receipt Attached</span>
                                                    ) : (
                                                        <span className="bg-slate-900 text-slate-500 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><FileText size={12}/> No Receipt Found</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: CART VIEW
    // ==========================================
    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full text-slate-300 font-sans p-2">
            
            {/* LEFT COLUMN: PRODUCT SELECTOR */}
            <div className="w-full lg:w-1/3 bg-[#0a0a0a] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl shrink-0">
                <div className="bg-orange-600/10 p-4 border-b border-orange-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <PackagePlus className="text-orange-500" />
                        <h2 className="text-lg font-bold text-orange-500 tracking-widest uppercase">Select Wares</h2>
                    </div>
                </div>
                <div className="p-4 border-b border-white/5">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                        <input type="text" placeholder="Search inventory..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-orange-500 outline-none text-white transition-colors" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {filteredInventory.map(item => {
                        const inCart = cart.find(c => c.id === item.id);
                        return (
                            <div key={item.id} onClick={() => addToCart(item)} className={`p-3 mb-2 rounded-xl cursor-pointer border transition-all flex items-center gap-4 ${inCart ? 'bg-emerald-500/10 border-emerald-500/30 opacity-50' : 'bg-black/40 border-white/5 hover:border-orange-500/50'}`}>
                                <div className="w-12 h-12 bg-black rounded flex items-center justify-center border border-white/10 shrink-0 overflow-hidden">
                                    {item.images?.front ? <img src={item.images.front} className="w-full h-full object-contain" alt="ware"/> : <PackagePlus size={20} className="text-slate-600"/>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
                                    <p className="text-[10px] text-slate-500 font-mono">Stock: <span className="text-emerald-400 font-bold">{item.stock}</span></p>
                                </div>
                                {inCart && <CheckCircle size={16} className="text-emerald-500" />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT COLUMN: MULTI-ITEM PROCUREMENT ENGINE */}
            <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
                <div className="bg-black/80 backdrop-blur-md border-b border-white/10 p-4 lg:p-6 shrink-0 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3"><Truck className="text-orange-500"/> Incoming Shipment</h2>
                        <p className="text-[10px] lg:text-xs text-orange-500 font-mono tracking-widest mt-1">{cart.length} ITEMS IN CART</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewMode('ledger')} className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-2 border border-white/10 rounded-lg px-3 py-2 bg-white/5 transition-colors">
                            <History size={14}/> Ledger
                        </button>
                    </div>
                </div>

                {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                        <ShoppingCart size={48} className="mb-4 opacity-20" />
                        <p className="tracking-widest uppercase text-sm font-bold opacity-50">Cart is Empty</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
                        <div className="space-y-3 mb-8">
                            {cart.map((item, idx) => (
                                <div key={item.id} className="bg-black border border-white/10 rounded-xl p-3 flex flex-col md:flex-row gap-4 items-start md:items-center relative">
                                    <button onClick={() => removeFromCart(item.id)} className="absolute top-2 right-2 text-slate-600 hover:text-red-500 transition-colors"><X size={16}/></button>
                                    
                                    <div className="flex-1 min-w-[120px] pt-1 md:pt-0">
                                        <h4 className="text-xs font-bold text-white uppercase truncate pr-6">{item.name}</h4>
                                        <p className="text-[9px] text-slate-500 font-mono">Distributor Base: Rp {new Intl.NumberFormat('id-ID').format(item.priceDistributor || 0)}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                        <div className="w-20"><label className="text-[8px] text-slate-500 uppercase block mb-1">Ordered</label><input type="number" value={item.qtyOrdered || ''} onChange={e => updateCartItem(item.id, 'qtyOrdered', e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded p-1.5 text-xs text-white focus:border-blue-500 outline-none font-mono" placeholder="0"/></div>
                                        <div className="w-20"><label className="text-[8px] text-slate-500 uppercase block mb-1">Received</label><input type="number" value={item.qtyReceived || ''} onChange={e => updateCartItem(item.id, 'qtyReceived', e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded p-1.5 text-xs text-white focus:border-emerald-500 outline-none font-mono" placeholder="0"/></div>
                                        <div className="w-28"><label className="text-[8px] text-slate-500 uppercase block mb-1">Cost / Unit (Rp)</label><input type="number" value={item.basePrice || ''} onChange={e => updateCartItem(item.id, 'basePrice', e.target.value)} className="w-full bg-orange-900/20 border border-orange-500/30 rounded p-1.5 text-xs text-orange-400 focus:border-orange-500 outline-none font-mono" placeholder="0"/></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-white/10">
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><CheckCircle size={14}/> 1. Shipment Meta</h3>
                                <div><label className="text-[10px] text-slate-500 uppercase">PO / Invoice Number</label><input type="text" value={poData.poNumber} onChange={e => setPoData({...poData, poNumber: e.target.value})} className="w-full bg-black border border-emerald-500/50 rounded-lg p-2.5 text-sm text-emerald-400 font-mono font-bold focus:border-emerald-400 outline-none" /></div>
                                <div><label className="text-[10px] text-slate-500 uppercase">Supplier / Factory</label><input type="text" value={poData.supplierName} onChange={e => setPoData({...poData, supplierName: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none" placeholder="e.g., PT Djarum Pusat"/></div>
                                <div><label className="text-[10px] text-slate-500 uppercase flex items-center gap-2 mt-2"><Calendar size={12}/> Global Expiry Date</label><input type="date" value={poData.expiryDate} onChange={e => setPoData({...poData, expiryDate: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none font-mono"/></div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Calculator size={14}/> 2. Landed Costs (Rp)</h3>
                                <div className="flex gap-4">
                                    <div className="flex-1"><label className="text-[10px] text-slate-500 uppercase">Shipping / Freight</label><input type="number" value={poData.shippingCost || ''} onChange={e => setPoData({...poData, shippingCost: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none font-mono" placeholder="0"/></div>
                                    <div className="flex-1"><label className="text-[10px] text-slate-500 uppercase">Labor / Unloading</label><input type="number" value={poData.laborCost || ''} onChange={e => setPoData({...poData, laborCost: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none font-mono" placeholder="0"/></div>
                                </div>
                                <div><label className="text-[10px] text-slate-500 uppercase">Excise Tax / Cukai</label><input type="number" value={poData.exciseTax || ''} onChange={e => setPoData({...poData, exciseTax: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none font-mono" placeholder="0"/></div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Receipt size={14}/> 3. Digital Vault</h3>
                                <div className="border-2 border-dashed border-white/10 hover:border-orange-500/50 bg-black/50 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors relative h-[120px]">
                                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setReceiptFile(e.target.files[0])} />
                                    {receiptFile ? (
                                        <><FileText size={24} className="text-emerald-500 mb-1" /><p className="text-xs font-bold text-white truncate w-full px-4">{receiptFile.name}</p></>
                                    ) : (
                                        <><UploadCloud size={24} className="text-slate-600 mb-1" /><p className="text-xs font-bold text-white">Upload Invoice</p></>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <div className="mt-8 flex flex-col md:flex-row items-center justify-between bg-black p-4 rounded-xl border border-white/10 gap-4">
                            <div className="flex gap-8 w-full md:w-auto">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Wares Subtotal</p>
                                    <p className="text-lg font-mono font-bold text-slate-300">Rp {new Intl.NumberFormat('id-ID').format(totalBasePrice)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-orange-500 uppercase font-bold">True Landed Total</p>
                                    <p className="text-xl font-mono font-black text-orange-400">Rp {new Intl.NumberFormat('id-ID').format(totalBasePrice + (parseFloat(poData.shippingCost)||0) + (parseFloat(poData.laborCost)||0) + (parseFloat(poData.exciseTax)||0))}</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleProcessRestock}
                                disabled={isSubmitting || cart.length === 0}
                                className={`w-full md:w-auto font-bold uppercase tracking-widest py-3 px-6 rounded-lg shadow-lg transition-all flex justify-center items-center gap-2 text-sm ${isSubmitting ? 'bg-slate-500 text-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white active:scale-95 shadow-[0_0_20px_rgba(234,88,12,0.3)]'}`}
                            >
                                {isSubmitting ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} 
                                {isSubmitting ? "Locking..." : "Lock to Vault"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RestockVaultView;