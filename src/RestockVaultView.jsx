import React, { useState, useMemo, useEffect } from 'react';
import { PackagePlus, Receipt, Calculator, Calendar, UploadCloud, CheckCircle, AlertCircle, FileText, Search, Save, X, ShoppingCart, Truck, RefreshCcw, History, ArrowRight, ChevronDown, ChevronUp, Folder, Printer, Pencil, Trash2, ExternalLink, Image as ImageIcon, User, Eye, Check, XCircle, Target, Activity, PlusCircle } from 'lucide-react';
import { doc, collection, setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, onSnapshot } from 'firebase/firestore';

const RestockVaultView = ({ inventory = [], procurements = [], db, appId, user, isAdmin, logAudit, triggerCapy, appSettings, masterUserId }) => {
    const [viewMode, setViewMode] = useState('cart'); 
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPO, setExpandedPO] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [stockRequests, setStockRequests] = useState([]);
    
    // 🚀 NEW: TARGETS STATE
    const [targets, setTargets] = useState([]);
    const [showTargetModal, setShowTargetModal] = useState(false);
    const [targetForm, setTargetForm] = useState({ productId: '', targetQty: '', month: new Date().toISOString().slice(0,7) }); // YYYY-MM
    
    const [editingOrder, setEditingOrder] = useState(null);
    const [editSenderName, setEditSenderName] = useState("");
    const [editCourier, setEditCourier] = useState("");
    const [editTrackingNo, setEditTrackingNo] = useState("");
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);

    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);

    const [viewingAcceptance, setViewingAcceptance] = useState(null);
    const [editingPO, setEditingPO] = useState(null);
    const [editReceiptFile, setEditReceiptFile] = useState(null);
    const [viewingImage, setViewingImage] = useState(null); 

    const [cart, setCart] = useState([]);
    const [poData, setPoData] = useState({
        supplierName: '',
        poNumber: `SJ-${Date.now().toString().slice(-6)}`, // Switched to SJ (Surat Jalan) default
        poDate: new Date().toISOString().split('T')[0],
        shippingCost: 0,
        exciseTax: 0,
        laborCost: 0,
        expiryDate: '',
    });
    const [receiptFile, setReceiptFile] = useState(null);

    const getAdminName = () => appSettings?.adminDisplayName || user?.displayName || (user?.email || "").split('@')[0] || "HQ Admin";
    const activeUserId = masterUserId || user?.uid; 

    // Fetch Outbound Requests & Monthly Targets
    useEffect(() => {
        if (!user || !appId || !isAdmin || !activeUserId) return;
        
        const reqRef = collection(db, `artifacts/${appId}/users/${activeUserId}/stock_requests`);
        const unsubReq = onSnapshot(reqRef, (snap) => {
            setStockRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const tgtRef = collection(db, `artifacts/${appId}/users/${activeUserId}/production_targets`);
        const unsubTgt = onSnapshot(tgtRef, (snap) => {
            setTargets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubReq(); unsubTgt(); };
    }, [db, appId, user, isAdmin, activeUserId]);

    const addToCart = (product) => {
        setCart([...cart, { 
            cartId: Date.now() + Math.random(), 
            id: product.id, 
            name: product.name, 
            batchNo: '', 
            qtyReceived: '', 
            basePrice: product.priceDistributor || 0 
        }]);
    };
    
    const removeFromCart = (cartId) => setCart(cart.filter(item => item.cartId !== cartId));
    const updateCartItem = (cartId, field, value) => setCart(cart.map(item => item.cartId === cartId ? { ...item, [field]: value } : item));

    const filteredInventory = inventory.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku?.toLowerCase().includes(searchTerm.toLowerCase()));

    const totalBasePrice = cart.reduce((sum, item) => sum + (Number(item.qtyReceived || 0) * Number(item.basePrice || 0)), 0);
    const totalItemsReceived = cart.reduce((sum, item) => sum + Number(item.qtyReceived || 0), 0);

    const compressImageToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800; 
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6)); 
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleProcessRestock = async () => {
        if (!user || !db || !activeUserId) return alert("System disconnected. Cannot save.");
        if (cart.length === 0 || totalItemsReceived <= 0) return alert("Cart is empty or missing quantities.");
        
        const batchId = `BCH-${new Date().toISOString().slice(2,10).replace(/-/g,'')}`;
        const trueLandedTotal = totalBasePrice + (Number(poData.shippingCost)||0) + (Number(poData.laborCost)||0) + (Number(poData.exciseTax)||0);

        setIsSubmitting(true);
        try {
            let base64Receipt = null;
            if (receiptFile) {
                if(triggerCapy) triggerCapy("Compressing Document to Database... ⏳");
                base64Receipt = await compressImageToBase64(receiptFile);
            }

            const batch = writeBatch(db);
            
            const stockUpdates = {};
            for (const item of cart) {
                if (!stockUpdates[item.id]) stockUpdates[item.id] = 0;
                stockUpdates[item.id] += (Number(item.qtyReceived) || 0);
            }
            
            for (const [prodId, qtyToAdd] of Object.entries(stockUpdates)) {
                const prodRef = doc(db, `artifacts/${appId}/users/${activeUserId}/products`, prodId);
                const currentStock = Number(inventory.find(p => p.id === prodId)?.stock || 0);
                batch.update(prodRef, { stock: currentStock + qtyToAdd }); 
            }

            const poRef = doc(collection(db, `artifacts/${appId}/users/${activeUserId}/procurement`));
            const poRecord = { 
                batchId, ...poData, items: cart, totalBasePrice, trueLandedTotal, 
                timestamp: serverTimestamp(), date: poData.poDate, 
                hasReceipt: !!base64Receipt, 
                receiptUrl: base64Receipt || null 
            };
            
            batch.set(poRef, poRecord);
            await batch.commit();

            if (logAudit) await logAudit("RESTOCK_VAULT", `Produced ${totalItemsReceived} units under ${poData.poNumber}`);
            if (triggerCapy) triggerCapy(`Production Recorded! ${totalItemsReceived} units injected to Vault.`);
            
            setCart([]);
            setPoData({ supplierName: '', poNumber: `SJ-${Date.now().toString().slice(-6)}`, poDate: new Date().toISOString().split('T')[0], shippingCost: 0, exciseTax: 0, laborCost: 0, expiryDate: '' });
            setReceiptFile(null);
            setViewMode('ledger'); 
            
        } catch (error) { 
            console.error(error); 
            alert("Procurement Failed: " + error.message); 
        } finally {
            setIsSubmitting(false); 
        }
    };

    // 🚀 NEW: SAVE TARGET LOGIC
    const handleSaveTarget = async (e) => {
        e.preventDefault();
        if (!targetForm.productId || !targetForm.targetQty) return alert("Select product and enter target quantity.");
        
        setIsSubmitting(true);
        try {
            const product = inventory.find(p => p.id === targetForm.productId);
            const targetId = `${targetForm.month}_${targetForm.productId}`;
            const targetRef = doc(db, `artifacts/${appId}/users/${activeUserId}/production_targets`, targetId);
            
            await setDoc(targetRef, {
                productId: product.id,
                name: product.name,
                targetQty: Number(targetForm.targetQty),
                month: targetForm.month,
                updatedAt: serverTimestamp()
            }, { merge: true });

            if (triggerCapy) triggerCapy(`Target set for ${product.name}! 🎯`);
            setShowTargetModal(false);
            setTargetForm({ productId: '', targetQty: '', month: targetForm.month });
        } catch (error) {
            alert("Failed to save target: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // 🚀 NEW: DELETE TARGET LOGIC
    const handleDeleteTarget = async (targetId) => {
        if (!window.confirm("Are you sure you want to remove this production target?")) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${activeUserId}/production_targets`, targetId));
            if (triggerCapy) triggerCapy("Target removed.");
        } catch (e) {
            alert("Failed to delete target: " + e.message);
        }
    };

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
            structure[year][month][dateStr].push({ ...po, recordType: 'INBOUND' });
        });

        stockRequests.forEach(req => {
            const dateStr = req.timestamp ? new Date(req.timestamp.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const d = new Date(dateStr);
            const year = d.getFullYear();
            const month = d.toLocaleString('default', { month: 'long' });

            if (!structure[year]) structure[year] = {};
            if (!structure[year][month]) structure[year][month] = {};
            if (!structure[year][month][dateStr]) structure[year][month][dateStr] = [];
            structure[year][month][dateStr].push({ ...req, recordType: 'OUTBOUND' });
        });

        return structure;
    }, [procurements, stockRequests]);

    const handleDeletePO = async (po) => {
        if(!window.confirm(`Delete Delivery Record ${po.poNumber}? WARNING: This will DEDUCT the items back out of your inventory!`)) return;
        try {
            const batch = writeBatch(db);
            const stockToRevert = {};
            for (const item of po.items) {
                if (!stockToRevert[item.id]) stockToRevert[item.id] = 0;
                stockToRevert[item.id] += (Number(item.qtyReceived) || 0);
            }
            for (const [prodId, qtyToSubtract] of Object.entries(stockToRevert)) {
                const prodRef = doc(db, `artifacts/${appId}/users/${activeUserId}/products`, prodId);
                const currentStock = Number(inventory.find(p => p.id === prodId)?.stock || 0);
                batch.update(prodRef, { stock: currentStock - qtyToSubtract });
            }
            
            batch.delete(doc(db, `artifacts/${appId}/users/${activeUserId}/procurement`, po.id));
            await batch.commit();

            if (logAudit) await logAudit("RESTOCK_DELETE", `Deleted Record ${po.poNumber} and reverted stock.`);
            if (triggerCapy) triggerCapy("Record Deleted & Stock Reverted.");
        } catch(e) { alert("Failed to delete: " + e.message); }
    };

    const handleDeleteRequest = async (orderId) => {
        if (!window.confirm(`⚠️ WARNING: DELETE OUTBOUND RECORD?\n\nAre you sure you want to permanently delete Order: ${orderId}?\n\nNote: This only deletes the history paper-trail. It will NOT automatically refund or reverse warehouse math.`)) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${activeUserId}/stock_requests`, orderId));
            if (triggerCapy) triggerCapy(`Record ${orderId} deleted permanently. 🗑️`);
            if (logAudit) await logAudit("STOCK_DELETE_LOG", `Admin deleted request ${orderId}`);
        } catch(e) { alert("Failed to delete record: " + e.message); }
    };

    const handleSaveEditPO = async (e) => {
        e.preventDefault();
        if(!editingPO) return;

        setIsSubmitting(true);
        const newTotalBase = editingPO.items.reduce((sum, item) => sum + (Number(item.qtyReceived||0) * Number(item.basePrice||0)), 0);
        const newLanded = newTotalBase + (Number(editingPO.shippingCost)||0) + (Number(editingPO.laborCost)||0) + (Number(editingPO.exciseTax)||0);

        try {
            let newReceiptUrl = editingPO.receiptUrl || null;
            let newHasReceipt = editingPO.hasReceipt || false;
            
            if (editReceiptFile) {
                if(triggerCapy) triggerCapy("Compressing New Document... ⏳");
                newReceiptUrl = await compressImageToBase64(editReceiptFile);
                newHasReceipt = true;
            } else if (editingPO.receiptUrl === null) {
                newHasReceipt = false;
            }

            const batch = writeBatch(db);
            const originalPO = procurements.find(p => p.id === editingPO.id);
            
            const diffs = {};
            for (const editedItem of editingPO.items) {
                const oldItem = originalPO.items.find(i => i.cartId === editedItem.cartId || i.id === editedItem.id);
                const diff = (Number(editedItem.qtyReceived) || 0) - (Number(oldItem?.qtyReceived) || 0);
                if (!diffs[editedItem.id]) diffs[editedItem.id] = 0;
                diffs[editedItem.id] += diff;
            }
            
            for (const [prodId, diff] of Object.entries(diffs)) {
                if (diff !== 0) {
                    const prodRef = doc(db, `artifacts/${appId}/users/${activeUserId}/products`, prodId);
                    const currentStock = Number(inventory.find(p => p.id === prodId)?.stock || 0);
                    batch.update(prodRef, { stock: currentStock + diff });
                }
            }

            const poRef = doc(db, `artifacts/${appId}/users/${activeUserId}/procurement`, editingPO.id);
            batch.update(poRef, { 
                ...editingPO, 
                totalBasePrice: newTotalBase, 
                trueLandedTotal: newLanded, 
                updatedAt: serverTimestamp(),
                receiptUrl: newReceiptUrl,
                hasReceipt: newHasReceipt
            });

            await batch.commit();
            if (triggerCapy) triggerCapy("Production Record Updated Successfully!");
            setEditingPO(null);
            setEditReceiptFile(null);
        } catch(e) { 
            alert("Edit Failed: " + e.message); 
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStartEditingOrder = (order) => {
        setEditingOrder(order);
        setEditSenderName(order.senderName || getAdminName());
        setEditCourier(order.courier || "");
        setEditTrackingNo(order.trackingNo || "");
    };

    const handleSaveOrderEdit = async () => {
        if (!editingOrder) return;
        if (!editCourier || !editTrackingNo || !editSenderName) return alert("Sender Name, Logistic Company, and Tracking No are required.");
        
        setIsProcessingOrder(true);
        try {
            const orderRef = doc(db, `artifacts/${appId}/users/${activeUserId}/stock_requests`, editingOrder.id);
            
            const updatedTimeline = [...(editingOrder.workflowTimeline || [])];
            updatedTimeline.push({
                status: 'SYSTEM_EDIT',
                time: new Date().toISOString(),
                msg: `HQ Admin (${getAdminName()}) updated tracking info.\nOld: ${editingOrder.courier} (${editingOrder.trackingNo}) by ${editingOrder.senderName || 'N/A'}\nNew: ${editCourier} (${editTrackingNo}) by ${editSenderName}`
            });

            await updateDoc(orderRef, {
                senderName: editSenderName,
                courier: editCourier,
                trackingNo: editTrackingNo,
                workflowTimeline: updatedTimeline
            });
            
            if (triggerCapy) triggerCapy("Tracking information updated successfully! 📝");
            if (logAudit) await logAudit("STOCK_EDIT_LOG", `Admin edited tracking for ${editingOrder.id}`);
            setEditingOrder(null);
            setIsProcessingOrder(false);
        } catch (e) {
            alert("Failed to edit record: " + e.message);
            setIsProcessingOrder(false);
        }
    };


    const StatusBadge = ({ status }) => {
        const styles = {
            'PENDING': 'bg-orange-900/50 text-orange-400 border border-orange-500/50',
            'REJECTED': 'bg-red-900/50 text-red-400 border border-red-500/50',
            'IN_TRANSIT': 'bg-blue-900/50 text-blue-400 border border-blue-500/50 animate-pulse',
            'DELIVERED': 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/50',
            'SYSTEM_EDIT': 'bg-purple-900/50 text-purple-400 border border-purple-500/50',
            'APPROVED': 'bg-blue-900/50 text-blue-400 border border-blue-500/50', 
        };
        return (
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full shadow-inner ${styles[status] || 'bg-slate-700'}`}>
                {status}
            </span>
        );
    };

    const OrderTrackingModule = ({ order }) => {
        const isDelivered = order.status === 'DELIVERED';
        return (
            <div className="bg-black/50 rounded-2xl border border-slate-700 p-6 animate-fade-in mt-2 mb-4">
                <div className="flex flex-col md:flex-row gap-6 mb-8 border-b border-slate-700 pb-6">
                    <div className="flex-1 bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Truck size={80} className="text-blue-500"/></div>
                        
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Informasi Pengiriman (TMS)</h4>
                        </div>

                        {order.status === 'PENDING' ? (
                            <div className="text-center py-5 text-slate-600 italic text-xs">Menunggu HQ Mempersiapkan Barang...</div>
                        ) : order.status === 'REJECTED' ? (
                            <div className="text-center py-5 text-red-500 font-bold text-xs uppercase tracking-widest">PERMINTAAN DITOLAK HQ</div>
                        ) : (
                            <div className="space-y-2.5 relative z-10">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 flex items-center gap-2"><User size={14}/> Dikirim Oleh (Sender)</span>
                                    <span className="font-bold text-orange-400 uppercase">{order.senderName || order.fulfilledBy?.split('@')[0] || 'HQ Admin'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 flex items-center gap-2"><Truck size={14}/> Logistic Company</span>
                                    <span className="font-bold text-white uppercase">{order.courier || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 flex items-center gap-2"><FileText size={14}/> No. Resi</span>
                                    <span className="font-bold text-blue-400 uppercase font-mono tracking-wider bg-black/50 px-2 py-0.5 rounded border border-blue-900/50">{order.trackingNo || 'N/A'}</span>
                                </div>
                            </div>
                        )}
                        {isDelivered && (
                            <div className="mt-5 py-3 bg-emerald-900/50 border border-emerald-500/50 text-emerald-400 rounded-lg text-center text-xs font-bold flex items-center justify-center gap-2">
                                <Check size={16}/> Barang Sudah Diterima Branch
                            </div>
                        )}
                    </div>
                    <div className="w-full md:w-56 shrink-0 bg-slate-900 p-3 rounded-xl border border-slate-700 shadow-xl flex flex-col items-center">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Bukti Pengiriman (HQ)</h4>
                        {order.packagePhotoUrl ? (
                            <a href={order.packagePhotoUrl} target="_blank" rel="noreferrer" className="block group">
                                <img src={order.packagePhotoUrl} alt="Shipment Proof" className="w-full h-40 object-cover rounded-lg border-2 border-slate-700 group-hover:border-blue-500 transition-colors shadow-inner" />
                            </a>
                        ) : (
                            <div className="w-full h-40 bg-black/30 rounded-lg border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-600 text-[10px] text-center p-4">
                                Awaiting Photo Proof
                            </div>
                        )}
                    </div>
                </div>

                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">History Order Timeline</h4>
                <div className="space-y-6 relative pl-6">
                    <div className="absolute left-[7px] top-1 bottom-1 w-[2px] bg-slate-700"></div> 
                    {(order.workflowTimeline || []).map((ev, idx) => {
                        const isLatest = idx === order.workflowTimeline.length - 1;
                        let circleColor = isLatest ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'bg-slate-600';
                        if (ev.status === 'SYSTEM_EDIT') circleColor = 'bg-purple-500';
                        
                        return (
                            <div key={idx} className="flex gap-4 relative">
                                <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${circleColor} relative z-10 border-2 border-slate-900`}></div>
                                <div>
                                    <p className={`font-bold text-xs uppercase tracking-wider ${isLatest ? 'text-blue-400' : 'text-slate-300'}`}>{ev.status}</p>
                                    <p className={`text-sm font-medium ${isLatest ? 'text-white' : 'text-slate-400'} mt-0.5 whitespace-pre-line`}>{ev.msg}</p>
                                    <p className="text-[10px] text-slate-600 font-mono mt-1">
                                        {ev.time ? new Date(ev.time).toLocaleString('id-ID') : 'Time data missing'}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // 🚀 NEW: DEDICATED PRODUCTION TARGETS DASHBOARD
    const renderTargetsDashboard = () => {
        // Group targets by month
        const targetsByMonth = targets.reduce((acc, t) => {
            if(!acc[t.month]) acc[t.month] = [];
            acc[t.month].push(t);
            return acc;
        }, {});
        
        const sortedMonths = Object.keys(targetsByMonth).sort().reverse();

        if (sortedMonths.length === 0) {
            return (
                <div className="text-center py-20 text-slate-600">
                    <Target size={48} className="mx-auto mb-4 opacity-20"/>
                    <p className="tracking-widest uppercase text-sm font-bold opacity-50">No Active Production Targets</p>
                    <p className="text-[10px] mt-2">Click "+ Set Target" above to start tracking factory goals.</p>
                </div>
            )
        }

        return (
            <div className="animate-fade-in space-y-8 pr-2 custom-scrollbar overflow-y-auto">
                <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-center gap-3">
                    <Activity className="text-blue-400 shrink-0"/>
                    <p className="text-xs text-blue-300 font-medium">This dashboard automatically scans the Master Ledger to calculate how many items the factory has delivered against your monthly goals.</p>
                </div>

                {sortedMonths.map(monthStr => {
                    const monthTargets = targetsByMonth[monthStr];
                    // Format YYYY-MM for display
                    const displayMonth = new Date(monthStr + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });
                    
                    return (
                        <div key={monthStr} className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/10 pb-3">
                                <Calendar className="text-orange-500"/> TARGET: {displayMonth}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {monthTargets.map(target => {
                                    // Dynamically calculate actuals from procurements in this month
                                    let totalProduced = 0;
                                    procurements.forEach(po => {
                                        const poDateStr = po.date || (po.timestamp ? new Date(po.timestamp.seconds * 1000).toISOString() : new Date().toISOString());
                                        if (poDateStr.startsWith(monthStr)) { // If PO is in this month
                                            const foundItem = po.items?.find(i => i.id === target.productId);
                                            if (foundItem) {
                                                totalProduced += Number(foundItem.qtyReceived) || 0;
                                            }
                                        }
                                    });

                                    const progress = target.targetQty > 0 ? Math.min(100, Math.round((totalProduced / target.targetQty) * 100)) : 0;
                                    
                                    return (
                                        <div key={target.id} className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 shadow-inner relative group">
                                            <button onClick={() => handleDeleteTarget(target.id)} className="absolute top-2 right-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                            <h4 className="text-sm font-bold text-white uppercase mb-4 pr-6 truncate">{target.name}</h4>
                                            
                                            <div className="flex justify-between items-end mb-2">
                                                <div>
                                                    <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Factory Progress</span>
                                                    <span className="text-xl font-black text-blue-400 font-mono">{progress}%</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Actual / Target</span>
                                                    <span className="text-sm font-bold text-white font-mono">{totalProduced} / {target.targetQty}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden shadow-inner">
                                                <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderLedger = () => {
        if (selectedYear && selectedMonth && selectedDate) {
            const records = folderStructure[selectedYear][selectedMonth][selectedDate] || [];
            return (
                <div className="animate-fade-in space-y-4 pr-2 custom-scrollbar overflow-y-auto">
                    <button onClick={() => setSelectedDate(null)} className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors mb-4"><ArrowRight className="rotate-180" size={16}/> Back to {selectedMonth}</button>
                    {records.map(record => {
                        
                        if (record.recordType === 'INBOUND') {
                            return (
                                <div key={record.id} className="bg-black border border-white/10 rounded-xl overflow-hidden shadow-lg transition-all hover:border-orange-500/50">
                                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer gap-4" onClick={() => setExpandedPO(expandedPO === record.id ? null : record.id)}>
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-orange-900/20 text-orange-500 rounded-xl border border-orange-500/30 shrink-0"><PackagePlus size={20}/></div>
                                            <div>
                                                <h3 className="font-bold text-white text-base lg:text-lg tracking-wider font-mono">INBOUND: {record.poNumber}</h3>
                                                <p className="text-[10px] lg:text-xs text-slate-500 uppercase">Source: {record.supplierName || 'Internal Factory'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-6 lg:gap-8">
                                            <div className="text-left md:text-right">
                                                <p className="text-[9px] text-slate-500 uppercase font-bold">Total Wares</p>
                                                <p className="text-xs text-emerald-400 font-bold font-mono">{record.items?.reduce((acc, i) => acc + parseInt(i.qtyReceived), 0)} Bks</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] text-slate-500 uppercase font-bold">Landed Cost</p>
                                                <p className="text-sm text-white font-black font-mono">Rp {new Intl.NumberFormat('id-ID').format(record.trueLandedTotal || record.totalBasePrice || 0)}</p>
                                            </div>
                                            {expandedPO === record.id ? <ChevronUp size={20} className="text-slate-500"/> : <ChevronDown size={20} className="text-slate-500"/>}
                                        </div>
                                    </div>
                                    
                                    {expandedPO === record.id && (
                                        <div className="border-t border-white/10 bg-[#0f0f0f] p-4 lg:p-6 animate-fade-in">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                                                <div>
                                                    <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest border-b border-white/5 pb-1">Batches Received</h4>
                                                    <div className="space-y-2">
                                                        {record.items?.map((item, idx) => (
                                                            <div key={idx} className="flex flex-col bg-black p-3 rounded-lg border border-white/5">
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="bg-orange-900/30 text-orange-500 px-2 py-0.5 rounded border border-orange-500/30 font-bold font-mono text-[10px]">{item.qtyReceived}x</span>
                                                                        <span className="text-xs text-white uppercase font-bold">{item.name}</span>
                                                                    </div>
                                                                    {item.batchNo && (
                                                                        <span className="text-[9px] text-orange-400 font-mono border border-orange-500/30 px-1 rounded bg-orange-900/10">BATCH: {item.batchNo}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest border-b border-white/5 pb-1">Cost Breakdown</h4>
                                                    <div className="space-y-2 text-[10px] lg:text-xs font-mono bg-black p-4 rounded-xl border border-white/5">
                                                        <div className="flex justify-between"><span className="text-slate-500">Wares Subtotal:</span><span className="text-white">Rp {new Intl.NumberFormat('id-ID').format(record.totalBasePrice || 0)}</span></div>
                                                        <div className="flex justify-between"><span className="text-slate-500">Shipping:</span><span className="text-orange-400">Rp {new Intl.NumberFormat('id-ID').format(record.shippingCost || 0)}</span></div>
                                                        <div className="flex justify-between"><span className="text-slate-500">Excise Tax (Cukai):</span><span className="text-orange-400">Rp {new Intl.NumberFormat('id-ID').format(record.exciseTax || 0)}</span></div>
                                                        <div className="flex justify-between"><span className="text-slate-500">Labor:</span><span className="text-orange-400">Rp {new Intl.NumberFormat('id-ID').format(record.laborCost || 0)}</span></div>
                                                        <div className="border-t border-white/10 pt-3 mt-1 flex justify-between font-bold"><span className="text-slate-300">True Landed Total:</span><span className="text-emerald-400 text-sm">Rp {new Intl.NumberFormat('id-ID').format(record.trueLandedTotal || 0)}</span></div>
                                                    </div>
                                                    
                                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                                        <button onClick={() => setViewingAcceptance(record)} className="bg-slate-800 hover:bg-slate-700 text-white border border-white/10 px-3 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-colors"><Printer size={12}/> Print Note</button>
                                                        {record.receiptUrl ? (
                                                            <button onClick={() => setViewingImage(record.receiptUrl)} className="bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border border-blue-500/30 px-3 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-colors"><ImageIcon size={12}/> View Doc</button>
                                                        ) : (
                                                            <span className="bg-slate-900 text-slate-600 border border-white/5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2"><FileText size={12}/> No Doc</span>
                                                        )}
                                                    </div>

                                                    <div className="mt-4 flex gap-2 pt-4 border-t border-white/5">
                                                        <button 
                                                            onClick={() => {
                                                                const poClone = { ...record, items: record.items.map(i => ({...i})) };
                                                                setEditingPO(poClone);
                                                                setEditReceiptFile(null);
                                                            }} 
                                                            className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-colors"
                                                        >
                                                            <Pencil size={12}/> Edit Data
                                                        </button>
                                                        <button onClick={() => handleDeletePO(record)} className="flex-1 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 px-3 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-colors"><Trash2 size={12}/> Revert & Delete</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        if (record.recordType === 'OUTBOUND') {
                            const itemsToProcess = record.fulfilledItems || record.requestedItems || record.items || [];
                            return (
                                <div key={record.id} className="bg-slate-900 border border-blue-900/30 rounded-xl overflow-hidden shadow-lg transition-all hover:border-blue-500/50">
                                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer gap-4" onClick={() => setExpandedPO(expandedPO === record.id ? null : record.id)}>
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-blue-900/20 text-blue-500 rounded-xl border border-blue-500/30 shrink-0"><Truck size={20}/></div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-white text-base lg:text-lg tracking-wider font-mono">OUTBOUND: {record.branch}</h3>
                                                    <StatusBadge status={record.status} />
                                                </div>
                                                <p className="text-[10px] lg:text-xs text-slate-500 uppercase">{record.id} • Req By: {record.requestedByName || record.requestedBy?.split('@')[0]}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-6 lg:gap-8">
                                            <div className="text-left md:text-right">
                                                <p className="text-[9px] text-slate-500 uppercase font-bold">Total Wares</p>
                                                <p className="text-xs text-blue-400 font-bold font-mono">{itemsToProcess.reduce((acc, i) => acc + parseInt(i.qty), 0)} Bks</p>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                {(record.status === 'IN_TRANSIT' || record.status === 'DELIVERED' || record.status === 'APPROVED') && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleStartEditingOrder(record); }} className="p-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-600 hover:text-white transition-colors" title="Edit Resi">
                                                        <Pencil size={14}/>
                                                    </button>
                                                )}
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(record.id); }} className="p-2 bg-red-900/30 text-red-500 rounded hover:bg-red-600 hover:text-white transition-colors" title="Delete Ghost Data">
                                                    <Trash2 size={14}/>
                                                </button>
                                                {expandedPO === record.id ? <ChevronUp size={20} className="text-slate-500"/> : <ChevronDown size={20} className="text-slate-500"/>}
                                            </div>
                                        </div>
                                    </div>
                                    {expandedPO === record.id && (
                                        <div className="border-t border-white/10 bg-[#0f0f0f] p-4 animate-fade-in">
                                            <OrderTrackingModule order={record} />
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        
                        return null;
                    })}
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
                                <p className="text-[10px] text-slate-500 mt-1">{folderStructure[selectedYear][selectedMonth][date].length} Records</p>
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
            
            {viewingImage && (
                <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <button onClick={() => setViewingImage(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-black/50 p-2 rounded-full"><X size={32}/></button>
                    <img src={viewingImage} alt="Document" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/20" />
                </div>
            )}

            {/* 🚀 NEW: SET TARGET MODAL */}
            {showTargetModal && (
                <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 w-full max-w-md rounded-2xl border-2 border-blue-500 shadow-2xl flex flex-col overflow-hidden animate-pop-in">
                        <div className="p-5 border-b border-slate-700 bg-black/40 flex justify-between items-center">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Target className="text-blue-500" size={18}/> Set Production Goal
                            </h3>
                            <button onClick={() => setShowTargetModal(false)} className="text-slate-600 hover:text-white"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSaveTarget} className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Select Product</label>
                                <select value={targetForm.productId} onChange={e => setTargetForm({...targetForm, productId: e.target.value})} className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white font-bold outline-none focus:border-blue-500">
                                    <option value="">-- Choose Product --</option>
                                    {inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Target Quantity (Bks)</label>
                                <input type="number" min="1" value={targetForm.targetQty} onChange={e => setTargetForm({...targetForm, targetQty: e.target.value})} className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white font-bold outline-none focus:border-blue-500"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Target Month</label>
                                <input type="month" value={targetForm.month} onChange={e => setTargetForm({...targetForm, month: e.target.value})} className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white font-bold outline-none focus:border-blue-500"/>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all">
                                {isSubmitting ? <RefreshCcw className="animate-spin" size={16}/> : <Save size={16}/>} Save Target
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {editingOrder && (
                <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 w-full max-w-md rounded-2xl border-2 border-purple-500 shadow-2xl flex flex-col overflow-hidden animate-pop-in">
                        <div className="p-5 border-b border-slate-700 bg-black/40 flex justify-between items-center">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Pencil className="text-purple-500" size={18}/> Edit Shipping Data
                            </h3>
                            <button onClick={() => setEditingOrder(null)} className="text-slate-600 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Nama Pengirim (Sender Name)</label>
                                <input type="text" value={editSenderName} onChange={e => setEditSenderName(e.target.value)} className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white font-bold outline-none focus:border-purple-500"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Logistic Company / Courier</label>
                                <input type="text" value={editCourier} onChange={e => setEditCourier(e.target.value)} className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white font-bold outline-none focus:border-purple-500"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Nomor Resi / Tracking No</label>
                                <input type="text" value={editTrackingNo} onChange={e => setEditTrackingNo(e.target.value)} className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-blue-300 font-mono font-bold outline-none focus:border-purple-500 uppercase"/>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-700 bg-black/40 flex gap-3">
                            <button onClick={handleSaveOrderEdit} disabled={isProcessingOrder} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all">
                                {isProcessingOrder ? <RefreshCcw className="animate-spin" size={16}/> : <Save size={16}/>} Simpan Perubahan
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                 <h2 className="text-2xl font-black uppercase tracking-widest">{viewingAcceptance.supplierName || 'FACTORY PRODUCTION'}</h2>
                                 <p className="text-xs text-gray-500 font-bold mt-1">GOODS RECEIVED NOTE (GRN) / ACCEPTANCE LETTER</p>
                                 <div className="mt-4 flex justify-between text-xs text-left bg-gray-100 p-3 rounded">
                                     <div><p className="font-bold text-gray-500">SURAT JALAN:</p><p className="font-bold text-lg">{viewingAcceptance.poNumber}</p></div>
                                     <div className="text-right"><p className="font-bold text-gray-500">DATE:</p><p className="font-bold">{viewingAcceptance.date}</p></div>
                                 </div>
                             </div>
                             
                             <table className="w-full text-xs text-left border-collapse mb-6">
                                 <thead><tr className="border-b-2 border-black"><th className="pb-2">ITEM DESCRIPTION</th><th className="pb-2 text-right">BATCH</th><th className="pb-2 text-right">QTY RECEIVED</th></tr></thead>
                                 <tbody className="divide-y border-b-2 border-black">
                                     {viewingAcceptance.items?.map((i, idx) => (
                                         <tr key={idx}><td className="py-3 font-bold">{i.name}</td><td className="py-3 text-right text-gray-500">{i.batchNo || 'N/A'}</td><td className="py-3 text-right font-bold">{i.qtyReceived}</td></tr>
                                     ))}
                                 </tbody>
                             </table>

                             <div className="flex justify-end mb-8">
                                 <div className="w-1/2 space-y-2 text-xs border-t border-black pt-2">
                                     <div className="flex justify-between"><span className="text-gray-500">Total Wares Base:</span><span>Rp {new Intl.NumberFormat('id-ID').format(viewingAcceptance.totalBasePrice)}</span></div>
                                     <div className="flex justify-between"><span className="text-gray-500">Shipping/Labor:</span><span>Rp {new Intl.NumberFormat('id-ID').format((Number(viewingAcceptance.shippingCost)||0) + (Number(viewingAcceptance.laborCost)||0))}</span></div>
                                     <div className="flex justify-between border-b border-dashed border-gray-400 pb-2"><span className="text-gray-500">Tax/Cukai:</span><span>Rp {new Intl.NumberFormat('id-ID').format(viewingAcceptance.exciseTax || 0)}</span></div>
                                     <div className="flex justify-between font-black text-sm pt-1"><span>TOTAL LANDED VALUE:</span><span>Rp {new Intl.NumberFormat('id-ID').format(viewingAcceptance.trueLandedTotal)}</span></div>
                                 </div>
                             </div>
                             
                             <div className="grid grid-cols-2 text-center text-xs mt-12 pt-8 gap-8">
                                 <div><p className="mb-12 text-gray-500">Delivered By</p><p className="border-t border-black pt-1 font-bold">Factory Logistics</p></div>
                                 <div><p className="mb-12 text-gray-500">Received & Verified By</p><p className="border-t border-black pt-1 font-bold">{getAdminName()}</p></div>
                             </div>
                         </div>
                         <div className="no-print bg-gray-100 p-4 border-t border-gray-300"><button onClick={() => window.print()} className="w-full bg-black text-white py-4 rounded font-bold uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-gray-800"><Printer size={16}/> Print Document</button></div>
                     </div>
                 </div>
            )}

            {editingPO && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#0f0f0f] border border-white/20 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl relative">
                        <button onClick={() => setEditingPO(null)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X size={24}/></button>
                        <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2"><Pencil className="text-orange-500"/> Edit Delivery Record</h2>
                        
                        <form onSubmit={handleSaveEditPO} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Metadata</h3>
                                    <div><label className="text-xs text-slate-500">Surat Jalan / Delivery No</label><input value={editingPO.poNumber} onChange={e=>setEditingPO({...editingPO, poNumber: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded text-white" required/></div>
                                    <div><label className="text-xs text-slate-500">Source Factory</label><input value={editingPO.supplierName} onChange={e=>setEditingPO({...editingPO, supplierName: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded text-white"/></div>
                                    <div><label className="text-xs text-slate-500">Date</label><input type="date" value={editingPO.date} onChange={e=>setEditingPO({...editingPO, date: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded text-white"/></div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Extra Costs</h3>
                                    <div><label className="text-xs text-slate-500">Shipping (Rp)</label><input type="number" value={editingPO.shippingCost} onChange={e=>setEditingPO({...editingPO, shippingCost: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded text-white"/></div>
                                    <div><label className="text-xs text-slate-500">Labor (Rp)</label><input type="number" value={editingPO.laborCost} onChange={e=>setEditingPO({...editingPO, laborCost: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded text-white"/></div>
                                    <div><label className="text-xs text-slate-500">Tax (Rp)</label><input type="number" value={editingPO.exciseTax} onChange={e=>setEditingPO({...editingPO, exciseTax: e.target.value})} className="w-full p-2 bg-black border border-white/10 rounded text-white"/></div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 mt-4">
                                <h3 className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-3">Update Document Proof</h3>
                                <div className="flex flex-col md:flex-row md:items-start gap-4 bg-black p-3 border border-white/10 rounded">
                                    {editingPO.receiptUrl && !editReceiptFile ? (
                                        <button type="button" onClick={() => setViewingImage(editingPO.receiptUrl)} className="flex items-center gap-2 bg-blue-900/30 text-blue-400 border border-blue-500/50 px-3 py-2 rounded text-xs font-bold hover:bg-blue-900/50 transition-colors shrink-0">
                                            <ImageIcon size={14}/> View Current
                                        </button>
                                    ) : (
                                        <span className="text-xs text-slate-500 italic shrink-0 mt-2">No previous document.</span>
                                    )}
                                    <div className="flex-1 w-full">
                                        {editReceiptFile ? (
                                            <div className="flex items-center justify-between bg-white/5 border border-white/10 px-3 py-2 rounded">
                                                <span className="text-xs font-bold text-emerald-400 truncate mr-2">{editReceiptFile.name}</span>
                                                <button type="button" onClick={() => setEditReceiptFile(null)} className="text-[10px] bg-red-900/50 text-red-400 px-2 py-1 rounded hover:bg-red-900 uppercase font-bold shrink-0">Remove</button>
                                            </div>
                                        ) : (
                                            <label className="text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 px-4 py-2 rounded cursor-pointer transition-colors border border-white/10 flex items-center justify-center gap-2 w-full">
                                                <UploadCloud size={14}/> Upload Replacement File
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => setEditReceiptFile(e.target.files[0])}/>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t border-white/10 pt-4">
                                <h3 className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-3">Adjust Batches (Will modify live stock)</h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {editingPO.items.map((item, idx) => (
                                        <div key={item.cartId || item.id} className="flex gap-4 items-center bg-black p-3 border border-white/10 rounded">
                                            <span className="text-xs text-white font-bold flex-1 truncate">{item.name}</span>
                                            <div className="w-32"><label className="text-[8px] text-slate-500">Batch No</label><input type="text" value={item.batchNo || ''} onChange={e=>{ const newItems = [...editingPO.items]; newItems[idx].batchNo = e.target.value; setEditingPO({...editingPO, items: newItems}); }} className="w-full p-1.5 bg-[#1a1a1a] border border-white/10 rounded text-slate-300 text-center uppercase"/></div>
                                            <div className="w-32"><label className="text-[8px] text-slate-500">Qty Received</label><input type="number" value={item.qtyReceived} onChange={e=>{ const newItems = [...editingPO.items]; newItems[idx].qtyReceived = e.target.value; setEditingPO({...editingPO, items: newItems}); }} className="w-full p-1.5 bg-[#1a1a1a] border border-white/10 rounded text-emerald-400 font-mono text-center"/></div>
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

            {/* --- MAIN UI TOGGLES --- */}
            {viewMode === 'ledger' && (
                <div className="flex-1 flex flex-col bg-[#0a0a0a] text-slate-300 font-sans p-4 lg:p-6 overflow-hidden h-full rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 shrink-0">
                        <div>
                            <h2 className="text-xl lg:text-2xl font-black text-white flex items-center gap-3"><History className="text-orange-500"/> Master Logistics Ledger</h2>
                            <p className="text-[10px] lg:text-xs text-slate-500 uppercase tracking-widest mt-1">Unified Inbound & Outbound History</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setViewMode('targets')} className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-white flex items-center gap-2 border border-blue-500/30 rounded-lg px-3 py-2 bg-blue-900/20 transition-colors"><Target size={14}/> Targets</button>
                            <button onClick={() => setViewMode('cart')} className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 rounded-xl transition-colors text-xs font-bold shadow-lg active:scale-95">
                                <ArrowRight className="rotate-180" size={16}/> New Entry
                            </button>
                        </div>
                    </div>
                    {renderLedger()}
                </div>
            )}

            {/* 🚀 NEW TARGETS DASHBOARD */}
            {viewMode === 'targets' && (
                <div className="flex-1 flex flex-col bg-[#0a0a0a] text-slate-300 font-sans p-4 lg:p-6 overflow-hidden h-full rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 shrink-0">
                        <div>
                            <h2 className="text-xl lg:text-2xl font-black text-white flex items-center gap-3"><Target className="text-blue-500"/> Production Targets</h2>
                            <p className="text-[10px] lg:text-xs text-slate-500 uppercase tracking-widest mt-1">Track actual factory output against targets</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowTargetModal(true)} className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-white flex items-center gap-2 border border-emerald-500/30 rounded-lg px-3 py-2 bg-emerald-900/20 transition-colors"><PlusCircle size={14}/> Set Target</button>
                            <button onClick={() => setViewMode('ledger')} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-2 border border-white/10 rounded-lg px-3 py-2 bg-white/5 transition-colors"><History size={14}/> Ledger</button>
                            <button onClick={() => setViewMode('cart')} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-4 py-2 rounded-xl transition-colors text-xs font-bold shadow-lg active:scale-95">
                                <ArrowRight className="rotate-180" size={16}/> New Entry
                            </button>
                        </div>
                    </div>
                    {renderTargetsDashboard()}
                </div>
            )}

            {viewMode === 'cart' && (
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
                                return (
                                    <div key={item.id} onClick={() => addToCart(item)} className="p-3 mb-2 rounded-xl cursor-pointer border transition-all flex items-center gap-4 bg-black/40 border-white/5 hover:border-orange-500/50">
                                        <div className="w-12 h-12 bg-black rounded flex items-center justify-center border border-white/10 shrink-0 overflow-hidden">{item.images?.front ? <img src={item.images.front} className="w-full h-full object-contain" alt="ware"/> : <PackagePlus size={20} className="text-slate-600"/>}</div>
                                        <div className="flex-1 min-w-0"><h3 className="text-sm font-bold text-white truncate">{item.name}</h3><p className="text-[10px] text-slate-500 font-mono">Stock: <span className="text-emerald-400 font-bold">{item.stock}</span></p></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: FACTORY PRODUCTION INBOUND ENGINE */}
                    <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
                        <div className="bg-black/80 backdrop-blur-md border-b border-white/10 p-4 lg:p-6 shrink-0 flex justify-between items-center z-10">
                            <div>
                                <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3"><Truck className="text-orange-500"/> Factory Production Inbound</h2>
                                <p className="text-[10px] lg:text-xs text-orange-500 font-mono tracking-widest mt-1">LOG INCOMING FACTORY TRUCKS TO VAULT</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setViewMode('targets')} className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-white flex items-center gap-2 border border-blue-500/30 rounded-lg px-3 py-2 bg-blue-900/20 transition-colors"><Target size={14}/> Targets</button>
                                <button onClick={() => setViewMode('ledger')} className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-2 border border-white/10 rounded-lg px-3 py-2 bg-white/5 transition-colors"><History size={14}/> Master Ledger</button>
                            </div>
                        </div>

                        {cart.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600"><ShoppingCart size={48} className="mb-4 opacity-20" /><p className="tracking-widest uppercase text-sm font-bold opacity-50">Setup is Empty</p></div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
                                <div className="space-y-3 mb-8">
                                    {/* 🚀 NEW: STRIPPED DOWN INBOUND UI */}
                                    {cart.map((item) => (
                                        <div key={item.cartId} className="bg-black border border-white/10 rounded-xl p-3 flex flex-col md:flex-row gap-4 items-start md:items-center relative">
                                            <button onClick={() => removeFromCart(item.cartId)} className="absolute top-2 right-2 text-slate-600 hover:text-red-500 transition-colors"><X size={16}/></button>
                                            <div className="flex-1 min-w-[120px] pt-1 md:pt-0">
                                                <h4 className="text-xs font-bold text-white uppercase truncate pr-6">{item.name}</h4>
                                            </div>
                                            <div className="flex flex-wrap gap-3 w-full md:w-auto items-end pr-6">
                                                <div className="w-32"><label className="text-[8px] text-slate-500 uppercase block mb-1">Batch / Serial No.</label><input type="text" value={item.batchNo || ''} onChange={e => updateCartItem(item.cartId, 'batchNo', e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded p-2 text-xs text-white focus:border-blue-500 outline-none font-mono uppercase" placeholder="SN-001"/></div>
                                                <div className="w-32"><label className="text-[8px] text-emerald-500 font-bold uppercase block mb-1">Qty Received</label><input type="number" value={item.qtyReceived || ''} onChange={e => updateCartItem(item.cartId, 'qtyReceived', e.target.value)} className="w-full bg-emerald-900/20 border border-emerald-500/30 rounded p-2 text-xs text-emerald-400 font-bold focus:border-emerald-500 outline-none font-mono" placeholder="0"/></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-white/10">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><CheckCircle size={14}/> 1. Delivery Meta</h3>
                                        <div><label className="text-[10px] text-slate-500 uppercase flex items-center gap-2 mb-1"><Calendar size={12}/> Arrival Date</label><input type="date" value={poData.poDate} onChange={e => setPoData({...poData, poDate: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none font-mono" /></div>
                                        <div><label className="text-[10px] text-slate-500 uppercase">Surat Jalan / Delivery No</label><input type="text" value={poData.poNumber} onChange={e => setPoData({...poData, poNumber: e.target.value})} className="w-full bg-black border border-emerald-500/50 rounded-lg p-2.5 text-sm text-emerald-400 font-mono font-bold focus:border-emerald-400 outline-none" /></div>
                                        <div><label className="text-[10px] text-slate-500 uppercase">Source (e.g., Factory Name)</label><input type="text" value={poData.supplierName} onChange={e => setPoData({...poData, supplierName: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none" placeholder="e.g., KPM Malang"/></div>
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
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Receipt size={14}/> 3. Document Proof</h3>
                                        <div className="border-2 border-dashed border-white/10 bg-black/50 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors h-[120px]">
                                            {receiptFile ? (
                                                <>
                                                    <FileText size={24} className="text-emerald-500 mb-1" />
                                                    <p className="text-xs font-bold text-white truncate w-full px-4 mb-2">{receiptFile.name}</p>
                                                    <button onClick={() => setReceiptFile(null)} className="text-[10px] bg-red-900/50 text-red-400 px-3 py-1 rounded hover:bg-red-900 transition-colors uppercase font-bold">Remove File</button>
                                                </>
                                            ) : (
                                                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full hover:text-orange-500 transition-colors text-slate-600">
                                                    <UploadCloud size={24} className="mb-1" />
                                                    <p className="text-[10px] font-bold text-white uppercase tracking-widest">Image to Database</p>
                                                    <p className="text-[8px] text-emerald-500 font-mono mt-1">100% FREE NO STORAGE API</p>
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setReceiptFile(e.target.files[0])} />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex flex-col md:flex-row items-center justify-between bg-black p-4 rounded-xl border border-white/10 gap-4">
                                    <div className="flex gap-8 w-full md:w-auto">
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Wares Base Value</p>
                                            <p className="text-lg font-mono font-bold text-slate-300">Rp {new Intl.NumberFormat('id-ID').format(totalBasePrice)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-orange-500 uppercase font-bold">True Landed Total</p>
                                            <p className="text-xl font-mono font-black text-orange-400">Rp {new Intl.NumberFormat('id-ID').format(totalBasePrice + (Number(poData.shippingCost)||0) + (Number(poData.laborCost)||0) + (Number(poData.exciseTax)||0))}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleProcessRestock}
                                        disabled={isSubmitting || cart.length === 0}
                                        className={`w-full md:w-auto font-bold uppercase tracking-widest py-3 px-6 rounded-lg shadow-lg transition-all flex justify-center items-center gap-2 text-sm ${isSubmitting ? 'bg-slate-500 text-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white active:scale-95 shadow-[0_0_20px_rgba(234,88,12,0.3)]'}`}
                                    >
                                        {isSubmitting ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} 
                                        {isSubmitting ? "Processing..." : "Lock to Vault"}
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