import React, { useState, useMemo } from 'react';
import { PackagePlus, Receipt, Calculator, Calendar, UploadCloud, CheckCircle, AlertCircle, FileText, Search, Save, X, ShoppingCart, Truck, RefreshCcw, History, ArrowRight, ChevronDown, ChevronUp, Folder, Printer, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { doc, collection, setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const RestockVaultView = ({ inventory = [], procurements = [], db, storage, appId, user, isAdmin, logAudit, triggerCapy }) => {
    const [viewMode, setViewMode] = useState('cart'); // 'cart' | 'ledger'
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPO, setExpandedPO] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Ledger Folder States
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);

    // Edit/Print States
    const [viewingAcceptance, setViewingAcceptance] = useState(null);
    const [editingPO, setEditingPO] = useState(null);
    const [editReceiptFile, setEditReceiptFile] = useState(null);

    const [cart, setCart] = useState([]);
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
        setCart([...cart, { ...product, qtyOrdered: 0, qtyReceived: 0, basePrice: product.priceDistributor || 0 }]);
    };
    const removeFromCart = (productId) => setCart(cart.filter(item => item.id !== productId));
    const updateCartItem = (productId, field, value) => setCart(cart.map(item => item.id === productId ? { ...item, [field]: value } : item));

    const filteredInventory = inventory.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku?.toLowerCase().includes(searchTerm.toLowerCase()));

    const totalBasePrice = cart.reduce((sum, item) => sum + (parseFloat(item.qtyReceived || 0) * parseFloat(item.basePrice || 0)), 0);
    const totalItemsReceived = cart.reduce((sum, item) => sum + parseFloat(item.qtyReceived || 0), 0);

    // --- FIXED: PROCESS RESTOCK WITH BATCH WRITES ---
    const handleProcessRestock = async () => {
        if (!user || !db) return alert("System disconnected. Cannot save.");
        if (cart.length === 0 || totalItemsReceived <= 0) return alert("Cart is empty or missing quantities.");
        
        const batchId = `BCH-${new Date().toISOString().slice(2,10).replace(/-/g,'')}`;
        const trueLandedTotal = totalBasePrice + (parseFloat(poData.shippingCost)||0) + (parseFloat(poData.laborCost)||0) + (parseFloat(poData.exciseTax)||0);

        setIsSubmitting(true);
        try {
            let receiptUrl = null;
            if (receiptFile && storage) {
                try {
                    triggerCapy("Uploading Receipt Image... ⏳");
                    const fileRef = ref(storage, `artifacts/${appId}/users/${user.uid}/receipts/${batchId}_${receiptFile.name}`);
                    await uploadBytes(fileRef, receiptFile);
                    receiptUrl = await getDownloadURL(fileRef);
                } catch (uploadErr) {
                    console.error("Storage upload error:", uploadErr);
                    alert("Warning: Receipt image upload failed (Storage issue). Data will be saved without the image.");
                }
            }

            // REPLACED runTransaction with writeBatch to prevent infinite spinning bugs offline
            const batch = writeBatch(db);
            for (const item of cart) {
                const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id);
                const currentStock = inventory.find(p => p.id === item.id)?.stock || 0;
                batch.update(prodRef, { stock: currentStock + (parseInt(item.qtyReceived) || 0) });
            }

            const poRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/procurement`));
            const poRecord = { batchId, ...poData, items: cart, totalBasePrice, trueLandedTotal, timestamp: serverTimestamp(), date: new Date().toISOString().split('T')[0], hasReceipt: !!receiptUrl, receiptUrl };
            
            batch.set(poRef, poRecord);
            await batch.commit();

            if (logAudit) await logAudit("RESTOCK_VAULT", `Procured ${totalItemsReceived} units under ${poData.poNumber}`);
            if (triggerCapy) triggerCapy(`Shipment Secured! ${totalItemsReceived} units injected to stock.`);
            
            setCart([]);
            setPoData({ supplierName: '', poNumber: `PO-${Date.now().toString().slice(-6)}`, shippingCost: 0, exciseTax: 0, laborCost: 0, expiryDate: '' });
            setReceiptFile(null);
            setViewMode('ledger');
            
        } catch (error) { 
            console.error(error); 
            alert("Procurement Failed: " + error.message); 
        } finally {
            setIsSubmitting(false); // Guarantees the spinner stops
        }
    };

    // --- LEDGER LOGIC: FOLDER STRUCTURE ---
    const folderStructure = useMemo(() => {
        const structure = {};
        procurements.forEach(po => {
            const dateStr = po.date || (po.timestamp ? new Date(po.timestamp.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            const d = new Date(dateStr);
            const year = d.getFullYear();
            const month = d.toLocaleString('default', { month: 'long' });

            if (!structure[year]) structure[year] = {};
            if (!structure[year][month]) structure[year][month] = {};
            if (!structure[year][month][dateStr]) structure[year][month][dateStr] = [];
            structure[year][month][dateStr].push(po);
        });
        return structure;
    }, [procurements]);

    // --- FIXED: LEDGER DELETE (USING BATCH) ---
    const handleDeletePO = async (po) => {
        if(!window.confirm(`Delete PO ${po.poNumber}? WARNING: This will DEDUCT the received items back out of your inventory!`)) return;
        try {
            const batch = writeBatch(db);
            for (const item of po.items) {
                const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id);
                const currentStock = inventory.find(p => p.id === item.id)?.stock || 0;
                batch.update(prodRef, { stock: currentStock - parseInt(item.qtyReceived) });
            }
            batch.delete(doc(db, `artifacts/${appId}/users/${user.uid}/procurement`, po.id));
            await batch.commit();

            if (logAudit) await logAudit("RESTOCK_DELETE", `Deleted PO ${po.poNumber} and reverted stock.`);
            triggerCapy("Record Deleted & Stock Reverted.");
        } catch(e) { alert("Failed to delete: " + e.message); }
    };

    // --- FIXED: LEDGER EDIT (MUTATION PREVENTION + NEW RECEIPT UPLOAD) ---
    const handleSaveEditPO = async (e) => {
        e.preventDefault();
        if(!editingPO) return;

        setIsSubmitting(true);
        const newTotalBase = editingPO.items.reduce((sum, item) => sum + (parseFloat(item.qtyReceived||0) * parseFloat(item.basePrice||0)), 0);
        const newLanded = newTotalBase + (parseFloat(editingPO.shippingCost)||0) + (parseFloat(editingPO.laborCost)||0) + (parseFloat(editingPO.exciseTax)||0);

        try {
            // Process New Image Upload if requested
            let newReceiptUrl = editingPO.receiptUrl;
            let newHasReceipt = editingPO.hasReceipt;
            if (editReceiptFile && storage) {
                try {
                    triggerCapy("Uploading New Receipt... ⏳");
                    const fileRef = ref(storage, `artifacts/${appId}/users/${user.uid}/receipts/${editingPO.batchId}_${editReceiptFile.name}`);
                    await uploadBytes(fileRef, editReceiptFile);
                    newReceiptUrl = await getDownloadURL(fileRef);
                    newHasReceipt = true;
                } catch (err) {
                    console.error("Storage upload error:", err);
                    alert("Warning: Receipt upload failed. Saving other edits...");
                }
            }

            const batch = writeBatch(db);
            const originalPO = procurements.find(p => p.id === editingPO.id);
            
            for (const editedItem of editingPO.items) {
                const oldItem = originalPO.items.find(i => i.id === editedItem.id);
                // Math is fixed because we deep-cloned the editing state!
                const diff = (parseInt(editedItem.qtyReceived) || 0) - (parseInt(oldItem?.qtyReceived) || 0);
                
                if (diff !== 0) {
                    const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, editedItem.id);
                    const currentStock = inventory.find(p => p.id === editedItem.id)?.stock || 0;
                    batch.update(prodRef, { stock: currentStock + diff });
                }
            }

            const poRef = doc(db, `artifacts/${appId}/users/${user.uid}/procurement`, editingPO.id);
            batch.update(poRef, { 
                ...editingPO, 
                totalBasePrice: newTotalBase, 
                trueLandedTotal: newLanded, 
                updatedAt: serverTimestamp(),
                receiptUrl: newReceiptUrl,
                hasReceipt: newHasReceipt
            });

            await batch.commit();
            triggerCapy("PO Updated Successfully!");
            setEditingPO(null);
            setEditReceiptFile(null);
        } catch(e) { 
            alert("Edit Failed: " + e.message); 
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // RENDER: LEDGER FOLDERS & PO LIST
    // ==========================================
    const renderLedger = () => {
        if (selectedYear && selectedMonth && selectedDate) {
            const pos = folderStructure[selectedYear][selectedMonth][selectedDate] || [];
            return (
                <div className="animate-fade-in space-y-4 pr-2 custom-scrollbar overflow-y-auto">
                    <button onClick={() => setSelectedDate(null)} className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors mb-4"><ArrowRight className="rotate-180" size={16}/> Back to {selectedMonth}</button>
                    {pos.map(po => (
                        <div key={po.id} className="bg-black border border-white/10 rounded-xl overflow-hidden shadow-lg transition-all hover:border-white/20">
                            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer gap-4" onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-orange-900/20 text-orange-500 rounded-xl border border-orange-500/30 shrink-0"><Truck size={20}/></div>
                                    <div>
                                        <h3 className="font-bold text-white text-base lg:text-lg tracking-wider font-mono">{po.poNumber}</h3>
                                        <p className="text-[10px] lg:text-xs text-slate-500 uppercase">{po.supplierName || 'Unknown Supplier'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-6 lg:gap-8">
                                    <div className="text-left md:text-right">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold">Total Wares</p>
                                        <p className="text-xs text-emerald-400 font-bold font-mono">{po.items?.reduce((acc, i) => acc + parseInt(i.qtyReceived), 0)} Bks</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold">Landed Cost</p>
                                        <p className="text-sm text-white font-black font-mono">Rp {new Intl.NumberFormat('id-ID').format(po.trueLandedTotal || po.totalBasePrice || 0)}</p>
                                    </div>
                                    {expandedPO === po.id ? <ChevronUp size={20} className="text-slate-500"/> : <ChevronDown size={20} className="text-slate-500"/>}
                                </div>
                            </div>
                            
                            {expandedPO === po.id && (
                                <div className="border-t border-white/10 bg-[#0f0f0f] p-4 lg:p-6 animate-fade-in">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                                        <div>
                                            <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest border-b border-white/5 pb-1">Items Received</h4>
                                            <div className="space-y-2">
                                                {po.items?.map((item, idx) => (
                                                    <div key={idx} className="flex flex-col bg-black p-2.5 rounded-lg border border-white/5">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <div className="flex items-center gap-3">
                                                                <span className="bg-orange-900/30 text-orange-500 px-2 py-0.5 rounded border border-orange-500/30 font-bold font-mono text-[10px]">{item.qtyReceived}x</span>
                                                                <span className="text-xs text-white uppercase font-bold">{item.name}</span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-mono">@ Rp {new Intl.NumberFormat('id-ID').format(item.basePrice || 0)}</span>
                                                        </div>
                                                        <div className="text-right text-[10px] text-emerald-400 font-mono font-bold border-t border-white/5 pt-1 mt-1">
                                                            = Rp {new Intl.NumberFormat('id-ID').format((item.qtyReceived * item.basePrice) || 0)}
                                                        </div>
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
                                            
                                            <div className="mt-4 grid grid-cols-2 gap-2">
                                                <button onClick={() => setViewingAcceptance(po)} className="bg-slate-800 hover:bg-slate-700 text-white border border-white/10 px-3 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-colors"><Printer size={12}/> Print GRN</button>
                                                {po.receiptUrl ? (
                                                    <button onClick={() => window.open(po.receiptUrl, '_blank')} className="bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border border-blue-500/30 px-3 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-colors"><ExternalLink size={12}/> View Receipt</button>
                                                ) : (
                                                    <span className="bg-slate-900 text-slate-600 border border-white/5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2"><FileText size={12}/> No Receipt</span>
                                                )}
                                            </div>

                                            {isAdmin && (
                                                <div className="mt-4 flex gap-2 pt-4 border-t border-white/5">
                                                    <button 
                                                        onClick={() => {
                                                            // DEEP CLONE prevents state mutation bugs
                                                            const poClone = { ...po, items: po.items.map(i => ({...i})) };
                                                            setEditingPO(poClone);
                                                            setEditReceiptFile(null);
                                                        }} 
                                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        <Pencil size={12}/> Edit Data
                                                    </button>
                                                    <button onClick={() => handleDeletePO(po)} className="flex-1 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 px-3 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-colors"><Trash2 size={12}/> Revert & Delete</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            );
        }
        
        if (selectedYear && selectedMonth) {
            const dates = Object.keys(folderStructure[selectedYear][selectedMonth] || {}).sort((a,b) => new Date(b) - new Date(a));
            return (
                <div className="animate-fade-in pr-2 custom-scrollbar overflow-y-auto">
                    <button onClick={() => setSelectedMonth(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={16}/> Back to {selectedYear}</button>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {dates.map(date => (
                            <div key={date} onClick={() => setSelectedDate(date)} className="bg-black/50 p-4 rounded-xl border border-white/10 cursor-pointer hover:border-orange-500 group transition-all text-center">
                                <div className="w-12 h-12 mx-auto bg-orange-900/20 rounded-full flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors mb-3"><span className="font-bold text-lg">{new Date(date).getDate()}</span></div>
                                <h3 className="font-bold text-sm text-white">{new Date(date).toLocaleDateString(undefined, {weekday:'short'})}</h3>
                                <p className="text-[10px] text-slate-500 mt-1">{folderStructure[selectedYear][selectedMonth][date].length} Shipments</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (selectedYear) {
            const months = Object.keys(folderStructure[selectedYear] || {});
            const monthOrder = { "January":1, "February":2, "March":3, "April":4, "May":5, "June":6, "July":7, "August":8, "September":9, "October":10, "November":11, "December":12 };
            months.sort((a, b) => monthOrder[a] - monthOrder[b]);
            return (
                <div className="animate-fade-in pr-2 custom-scrollbar overflow-y-auto">
                    <button onClick={() => setSelectedYear(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={16}/> Back to Folders</button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {months.map(month => (
                            <div key={month} onClick={() => setSelectedMonth(month)} className="bg-black/50 p-6 rounded-xl border border-white/10 cursor-pointer hover:border-blue-500 group transition-all flex items-center gap-4">
                                <div className="p-3 bg-blue-900/20 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors"><Folder size={24} /></div>
                                <div><h3 className="font-bold text-lg text-white">{month}</h3><p className="text-xs text-slate-500">{Object.keys(folderStructure[selectedYear][month]).length} Active Dates</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        const years = Object.keys(folderStructure).sort((a, b) => b - a);
        return (
            <div className="animate-fade-in pr-2 custom-scrollbar overflow-y-auto">
                {years.length === 0 ? (
                    <div className="text-center py-20 text-slate-600"><History size={48} className="mx-auto mb-4 opacity-20"/><p className="tracking-widest uppercase text-sm font-bold opacity-50">No Records Found</p></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {years.map(year => (
                            <div key={year} onClick={() => setSelectedYear(year)} className="bg-gradient-to-br from-black to-slate-900 text-white p-6 rounded-xl shadow-lg border border-white/10 cursor-pointer hover:border-orange-500 hover:scale-[1.02] transition-transform relative overflow-hidden group">
                                <Folder size={80} className="absolute -right-4 -bottom-4 text-white opacity-5 group-hover:opacity-10 transition-opacity"/>
                                <div className="relative z-10"><h3 className="text-3xl font-bold mb-1">{year}</h3><div className="h-1 w-12 bg-orange-500 rounded mb-3"></div><p className="text-sm text-slate-400 font-mono">{Object.keys(folderStructure[year]).length} Months Logged</p></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full text-slate-300 font-sans p-2 relative">
            
            {/* --- ACCEPTANCE LETTER MODAL (PRINT) --- */}
            {viewingAcceptance && (
                 <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
                     <style>{`
                         @media print { 
                             body * { visibility: hidden; } 
                             .print-receipt, .print-receipt * { visibility: visible; } 
                             .print-receipt { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none; background: white; } 
                             .no-print { display: none !important; }
                         }
                     `}</style>
                     <div className="print-receipt bg-white text-black w-full max-w-lg shadow-2xl relative flex flex-col font-mono text-sm border-t-8 border-orange-500 animate-fade-in max-h-[90vh] overflow-y-auto">
                         <button onClick={() => setViewingAcceptance(null)} className="no-print absolute top-4 right-4 text-slate-400 hover:text-red-500"><X size={24}/></button>
                         <div className="p-8">
                             <div className="text-center mb-8 border-b-2 border-dashed border-gray-400 pb-6">
                                 <h2 className="text-2xl font-black uppercase tracking-widest">{viewingAcceptance.supplierName || 'GOODS RECEIVED'}</h2>
                                 <p className="text-xs text-gray-500 font-bold mt-1">GOODS RECEIVED NOTE (GRN) / ACCEPTANCE LETTER</p>
                                 <div className="mt-4 flex justify-between text-xs text-left bg-gray-100 p-3 rounded">
                                     <div><p className="font-bold text-gray-500">PO NUMBER:</p><p className="font-bold text-lg">{viewingAcceptance.poNumber}</p></div>
                                     <div className="text-right"><p className="font-bold text-gray-500">DATE:</p><p className="font-bold">{viewingAcceptance.date}</p></div>
                                 </div>
                             </div>
                             
                             <table className="w-full text-xs text-left border-collapse mb-6">
                                 <thead><tr className="border-b-2 border-black"><th className="pb-2">ITEM DESCRIPTION</th><th className="pb-2 text-right">QTY</th><th className="pb-2 text-right">UNIT PRICE</th><th className="pb-2 text-right">TOTAL</th></tr></thead>
                                 <tbody className="divide-y border-b-2 border-black">
                                     {viewingAcceptance.items?.map((i, idx) => (
                                         <tr key={idx}><td className="py-3 font-bold">{i.name}</td><td className="py-3 text-right">{i.qtyReceived}</td><td className="py-3 text-right">Rp {new Intl.NumberFormat('id-ID').format(i.basePrice)}</td><td className="py-3 text-right font-bold">Rp {new Intl.NumberFormat('id-ID').format(i.qtyReceived * i.basePrice)}</td></tr>
                                     ))}
                                 </tbody>
                             </table>

                             <div className="flex justify-end mb-8">
                                 <div className="w-1/2 space-y-2 text-xs">
                                     <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>Rp {new Intl.NumberFormat('id-ID').format(viewingAcceptance.totalBasePrice)}</span></div>
                                     <div className="flex justify-between"><span className="text-gray-500">Shipping/Labor:</span><span>Rp {new Intl.NumberFormat('id-ID').format((parseFloat(viewingAcceptance.shippingCost)||0) + (parseFloat(viewingAcceptance.laborCost)||0))}</span></div>
                                     <div className="flex justify-between border-b border-dashed border-gray-400 pb-2"><span className="text-gray-500">Tax/Cukai:</span><span>Rp {new Intl.NumberFormat('id-ID').format(viewingAcceptance.exciseTax || 0)}</span></div>
                                     <div className="flex justify-between font-black text-sm pt-1"><span>TOTAL VALUE:</span><span>Rp {new Intl.NumberFormat('id-ID').format(viewingAcceptance.trueLandedTotal)}</span></div>
                                 </div>
                             </div>
                             
                             <div className="grid grid-cols-2 text-center text-xs mt-12 pt-8 gap-8">
                                 <div><p className="mb-12 text-gray-500">Delivered By</p><p className="border-t border-black pt-1 font-bold">Courier / Driver</p></div>
                                 <div><p className="mb-12 text-gray-500">Received & Verified By</p><p className="border-t border-black pt-1 font-bold">Warehouse Admin</p></div>
                             </div>
                         </div>
                         <div className="no-print bg-gray-100 p-4 border-t border-gray-300"><button onClick={() => window.print()} className="w-full bg-black text-white py-4 rounded font-bold uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-gray-800"><Printer size={16}/> Print Document</button></div>
                     </div>
                 </div>
            )}

            {/* --- PO EDIT MODAL --- */}
            {editingPO && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#0f0f0f] border border-white/20 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl relative">
                        <button onClick={() => setEditingPO(null)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X size={24}/></button>
                        <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2"><Pencil className="text-orange-500"/> Edit Shipment</h2>
                        
                        <form onSubmit={handleSaveEditPO} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Metadata</h3>
                                    <div><label className="text-xs text-slate-500">PO Number</label><input value={editingPO.poNumber} onChange={e=>setEditingPO({...editingPO, poNumber: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded text-white" required/></div>
                                    <div><label className="text-xs text-slate-500">Supplier</label><input value={editingPO.supplierName} onChange={e=>setEditingPO({...editingPO, supplierName: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded text-white"/></div>
                                    <div><label className="text-xs text-slate-500">Date</label><input type="date" value={editingPO.date} onChange={e=>setEditingPO({...editingPO, date: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded text-white"/></div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Extra Costs</h3>
                                    <div><label className="text-xs text-slate-500">Shipping (Rp)</label><input type="number" value={editingPO.shippingCost} onChange={e=>setEditingPO({...editingPO, shippingCost: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded text-white"/></div>
                                    <div><label className="text-xs text-slate-500">Labor (Rp)</label><input type="number" value={editingPO.laborCost} onChange={e=>setEditingPO({...editingPO, laborCost: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded text-white"/></div>
                                    <div><label className="text-xs text-slate-500">Tax (Rp)</label><input type="number" value={editingPO.exciseTax} onChange={e=>setEditingPO({...editingPO, exciseTax: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded text-white"/></div>
                                </div>
                            </div>

                            {/* NEW: RECEIPT EDITOR */}
                            <div className="pt-4 border-t border-white/10 mt-4">
                                <h3 className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-3">Update Digital Receipt</h3>
                                <div className="flex flex-col md:flex-row md:items-center gap-4 bg-black p-3 border border-white/10 rounded">
                                    {editingPO.receiptUrl && !editReceiptFile ? (
                                        <a href={editingPO.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-900/30 text-blue-400 border border-blue-500/50 px-3 py-2 rounded text-xs font-bold hover:bg-blue-900/50 transition-colors"><ExternalLink size={14}/> View Current Receipt</a>
                                    ) : (
                                        <span className="text-xs text-slate-500 italic">No receipt saved on server.</span>
                                    )}
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 px-4 py-2 rounded cursor-pointer transition-colors border border-white/10 flex items-center justify-center gap-2">
                                            <UploadCloud size={14}/> {editReceiptFile ? editReceiptFile.name : 'Upload Replacement'}
                                            <input type="file" className="hidden" onChange={(e) => setEditReceiptFile(e.target.files[0])}/>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t border-white/10 pt-4">
                                <h3 className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-3">Adjust Items (Will modify live stock)</h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {editingPO.items.map((item, idx) => (
                                        <div key={item.id} className="flex gap-4 items-center bg-black p-3 border border-white/10 rounded">
                                            <span className="text-xs text-white font-bold flex-1 truncate">{item.name}</span>
                                            <div className="w-24"><label className="text-[8px] text-slate-500">Qty Received</label><input type="number" value={item.qtyReceived} onChange={e=>{ const newItems = [...editingPO.items]; newItems[idx].qtyReceived = e.target.value; setEditingPO({...editingPO, items: newItems}); }} className="w-full p-1.5 bg-[#1a1a1a] border border-white/10 rounded text-emerald-400 font-mono text-center"/></div>
                                            <div className="w-32"><label className="text-[8px] text-slate-500">Base Price (Rp)</label><input type="number" value={item.basePrice} onChange={e=>{ const newItems = [...editingPO.items]; newItems[idx].basePrice = e.target.value; setEditingPO({...editingPO, items: newItems}); }} className="w-full p-1.5 bg-[#1a1a1a] border border-white/10 rounded text-orange-400 font-mono text-center"/></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" disabled={isSubmitting} className={`w-full text-white font-bold py-3 rounded-lg uppercase tracking-widest shadow-lg transition-colors flex justify-center items-center gap-2 ${isSubmitting ? 'bg-slate-500 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500'}`}>
                                {isSubmitting ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
                                {isSubmitting ? "Saving..." : "Save All Changes"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MAIN UI TOGGLE --- */}
            {viewMode === 'ledger' ? (
                <div className="flex-1 flex flex-col bg-[#0a0a0a] text-slate-300 font-sans p-4 lg:p-6 overflow-hidden h-full rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 shrink-0">
                        <div>
                            <h2 className="text-xl lg:text-2xl font-black text-white flex items-center gap-3"><History className="text-orange-500"/> Procurement Ledger</h2>
                            <p className="text-[10px] lg:text-xs text-slate-500 uppercase tracking-widest mt-1">Historical Shipment Records</p>
                        </div>
                        <button onClick={() => setViewMode('cart')} className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 rounded-xl transition-colors text-xs lg:text-sm font-bold shadow-lg active:scale-95">
                            <ArrowRight className="rotate-180" size={16}/> Back to Cart
                        </button>
                    </div>
                    {renderLedger()}
                </div>
            ) : (
                <>
                    {/* LEFT COLUMN: PRODUCT SELECTOR */}
                    <div className="w-full lg:w-1/3 bg-[#0a0a0a] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl shrink-0">
                        <div className="bg-orange-600/10 p-4 border-b border-orange-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-3"><PackagePlus className="text-orange-500" /><h2 className="text-lg font-bold text-orange-500 tracking-widest uppercase">Select Wares</h2></div>
                        </div>
                        <div className="p-4 border-b border-white/5">
                            <div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-500" /><input type="text" placeholder="Search inventory..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-orange-500 outline-none text-white transition-colors" /></div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {filteredInventory.map(item => {
                                const inCart = cart.find(c => c.id === item.id);
                                return (
                                    <div key={item.id} onClick={() => addToCart(item)} className={`p-3 mb-2 rounded-xl cursor-pointer border transition-all flex items-center gap-4 ${inCart ? 'bg-emerald-500/10 border-emerald-500/30 opacity-50' : 'bg-black/40 border-white/5 hover:border-orange-500/50'}`}>
                                        <div className="w-12 h-12 bg-black rounded flex items-center justify-center border border-white/10 shrink-0 overflow-hidden">{item.images?.front ? <img src={item.images.front} className="w-full h-full object-contain" alt="ware"/> : <PackagePlus size={20} className="text-slate-600"/>}</div>
                                        <div className="flex-1 min-w-0"><h3 className="text-sm font-bold text-white truncate">{item.name}</h3><p className="text-[10px] text-slate-500 font-mono">Stock: <span className="text-emerald-400 font-bold">{item.stock}</span></p></div>
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
                                <button onClick={() => setViewMode('ledger')} className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-2 border border-white/10 rounded-lg px-3 py-2 bg-white/5 transition-colors"><History size={14}/> Ledger</button>
                            </div>
                        </div>

                        {cart.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600"><ShoppingCart size={48} className="mb-4 opacity-20" /><p className="tracking-widest uppercase text-sm font-bold opacity-50">Cart is Empty</p></div>
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
                                            <div className="flex flex-wrap gap-2 w-full md:w-auto items-end">
                                                <div className="w-20"><label className="text-[8px] text-slate-500 uppercase block mb-1">Ordered</label><input type="number" value={item.qtyOrdered || ''} onChange={e => updateCartItem(item.id, 'qtyOrdered', e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded p-1.5 text-xs text-white focus:border-blue-500 outline-none font-mono" placeholder="0"/></div>
                                                <div className="w-20"><label className="text-[8px] text-slate-500 uppercase block mb-1">Received</label><input type="number" value={item.qtyReceived || ''} onChange={e => updateCartItem(item.id, 'qtyReceived', e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded p-1.5 text-xs text-white focus:border-emerald-500 outline-none font-mono" placeholder="0"/></div>
                                                <div className="w-28"><label className="text-[8px] text-slate-500 uppercase block mb-1">Cost / Unit (Rp)</label><input type="number" value={item.basePrice || ''} onChange={e => updateCartItem(item.id, 'basePrice', e.target.value)} className="w-full bg-orange-900/20 border border-orange-500/30 rounded p-1.5 text-xs text-orange-400 focus:border-orange-500 outline-none font-mono" placeholder="0"/></div>
                                                <div className="w-28 text-right bg-black border border-white/5 rounded p-1.5 h-[30px] flex items-center justify-end">
                                                    <span className="text-[10px] text-emerald-400 font-bold font-mono">= Rp {new Intl.NumberFormat('id-ID').format((item.qtyReceived || 0) * (item.basePrice || 0))}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-white/10">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><CheckCircle size={14}/> 1. Shipment Meta</h3>
                                        <div><label className="text-[10px] text-slate-500 uppercase">PO / Invoice Number</label><input type="text" value={poData.poNumber} onChange={e => setPoData({...poData, poNumber: e.target.value})} className="w-full bg-black border border-emerald-500/50 rounded-lg p-2.5 text-sm text-emerald-400 font-mono font-bold focus:border-emerald-400 outline-none" /></div>
                                        <div><label className="text-[10px] text-slate-500 uppercase">Supplier / Factory</label><input type="text" value={poData.supplierName} onChange={e => setPoData({...poData, supplierName: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none" placeholder="e.g., KPM Malang"/></div>
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
                                                <><UploadCloud size={24} className="text-slate-600 mb-1" /><p className="text-xs font-bold text-white">Upload Invoice Photo/PDF</p></>
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
                </>
            )}
        </div>
    );
};

export default RestockVaultView;