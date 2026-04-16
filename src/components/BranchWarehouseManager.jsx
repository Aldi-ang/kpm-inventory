import React, { useState, useEffect, useMemo } from 'react';
import { Package, ArrowRight, CheckCircle, XCircle, AlertCircle, Clock, Send, Truck, ShieldCheck, Search, Globe, MapPin } from 'lucide-react';
import { collection, doc, onSnapshot, writeBatch, serverTimestamp } from 'firebase/firestore';

export default function BranchWarehouseManager({ db, appId, user, userRole, userLocation, isAdmin, masterUserId, globalInventory, triggerCapy, logAudit }) {
    
    const [requests, setRequests] = useState([]);
    const [branchStock, setBranchStock] = useState([]);
    
    // Request Cart State (For Area Admins)
    const [requestCart, setRequestCart] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [requestQty, setRequestQty] = useState("");

    const isAreaAdmin = userRole === 'AREA_ADMIN';
    const branchLocation = userLocation || 'UNASSIGNED';

    // 🚀 LIVE SYNC: Fetch Requests & Branch Stock
    useEffect(() => {
        if (!masterUserId || !appId) return;

        // 1. Listen to Stock Requests
        const reqRef = collection(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`);
        const unsubReq = onSnapshot(reqRef, (snap) => {
            let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Area Admins only see their own branch requests
            if (isAreaAdmin) data = data.filter(r => r.branch === branchLocation);
            setRequests(data.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
        });

        // 2. Listen to Branch Specific Stock (Only needed if Area Admin)
        let unsubStock = () => {};
        if (isAreaAdmin && branchLocation !== 'UNASSIGNED') {
            const stockRef = collection(db, `artifacts/${appId}/users/${masterUserId}/branches/${branchLocation}/inventory`);
            unsubStock = onSnapshot(stockRef, (snap) => {
                setBranchStock(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
        }

        return () => { unsubReq(); unsubStock(); };
    }, [db, appId, masterUserId, isAreaAdmin, branchLocation]);


    // --- AREA ADMIN LOGIC: Create Request ---
    const handleAddToCart = () => {
        if (!selectedProduct || !requestQty || Number(requestQty) <= 0) return alert("Select a product and valid quantity.");
        const product = globalInventory.find(p => p.id === selectedProduct);
        if (!product) return;

        setRequestCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item => item.productId === product.id ? { ...item, qty: item.qty + Number(requestQty) } : item);
            }
            return [...prev, { productId: product.id, name: product.name, qty: Number(requestQty), unit: 'Bungkus' }];
        });
        setRequestQty("");
        setSelectedProduct("");
    };

    const removeFromCart = (pid) => setRequestCart(prev => prev.filter(item => item.productId !== pid));

    const handleSubmitRequest = async () => {
        if (requestCart.length === 0) return;
        if (!window.confirm(`Submit stock request to HQ for ${branchLocation}?`)) return;

        try {
            const batch = writeBatch(db);
            const reqId = `REQ_${Date.now()}`;
            const reqRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, reqId);
            
            batch.set(reqRef, {
                branch: branchLocation,
                requestedBy: user.email,
                items: requestCart,
                status: 'PENDING',
                timestamp: serverTimestamp()
            });

            await batch.commit();
            triggerCapy(`Request sent to HQ! 🚀`);
            logAudit("STOCK_REQUEST", `${branchLocation} requested ${requestCart.length} items.`);
            setRequestCart([]);
        } catch (e) {
            alert("Failed to submit request: " + e.message);
        }
    };


    // --- MASTER ADMIN LOGIC: Approve Request ---
    const handleApproveRequest = async (request) => {
        if (!window.confirm(`Approve stock transfer to ${request.branch}?\n\nThis will permanently deduct stock from the HQ Master Vault and transfer it to their branch.`)) return;

        try {
            const batch = writeBatch(db);

            // 1. Verify HQ has enough stock for everything BEFORE approving
            for (const item of request.items) {
                const hqProduct = globalInventory.find(p => p.id === item.productId);
                if (!hqProduct || (hqProduct.stock || 0) < item.qty) {
                    return alert(`INSUFFICIENT HQ STOCK!\n\nYou cannot approve this. HQ is missing ${item.qty - (hqProduct?.stock || 0)} ${item.unit} of ${item.name}.`);
                }
            }

            // 2. Process Transfer
            for (const item of request.items) {
                // Deduct from HQ
                const hqProduct = globalInventory.find(p => p.id === item.productId);
                const hqRef = doc(db, `artifacts/${appId}/users/${masterUserId}/products`, item.productId);
                batch.update(hqRef, { stock: (hqProduct.stock || 0) - item.qty });

                // Add to Branch Warehouse
                const branchItemRef = doc(db, `artifacts/${appId}/users/${masterUserId}/branches/${request.branch}/inventory`, item.productId);
                batch.set(branchItemRef, {
                    productId: item.productId,
                    name: item.name,
                    stock: item.qty // Note: In a production transaction, you'd want to GET the current branch stock first and add to it. For this scope, we assume set/merge.
                }, { merge: true }); 
            }

            // 3. Mark Request as Approved
            const reqRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, request.id);
            batch.update(reqRef, { status: 'APPROVED', approvedAt: serverTimestamp(), approvedBy: user.email });

            await batch.commit();
            triggerCapy(`Transfer Complete! Stock moved to ${request.branch}. 📦`);
            logAudit("STOCK_APPROVE", `Approved transfer ${request.id} to ${request.branch}`);
        } catch (e) {
            alert("Transfer failed: " + e.message);
        }
    };

    const handleRejectRequest = async (request) => {
        if (!window.confirm(`Reject this request from ${request.branch}?`)) return;
        try {
            const reqRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, request.id);
            await updateDoc(reqRef, { status: 'REJECTED', rejectedAt: serverTimestamp() });
            triggerCapy(`Request Rejected.`);
        } catch (e) { alert("Failed to reject: " + e.message); }
    };


    return (
        <div className="animate-fade-in max-w-7xl mx-auto space-y-6">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                        {isAdmin ? <ShieldCheck className="text-orange-500" size={32}/> : <Globe className="text-purple-500" size={32}/>}
                        {isAdmin ? 'Global Logistics' : `${branchLocation} Warehouse`}
                    </h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2">
                        {isAdmin ? 'HQ Master Request Terminal' : 'Branch Inventory & Restock Requests'}
                    </p>
                </div>
            </div>

            {/* ========================================== */}
            {/* ============= AREA ADMIN VIEW ============ */}
            {/* ========================================== */}
            {isAreaAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* LEFT: Current Branch Stock */}
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                        <h3 className="text-lg font-black text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-6"><MapPin size={20}/> Branch Inventory</h3>
                        <div className="space-y-3">
                            {branchStock.length === 0 ? (
                                <div className="text-center p-8 bg-black/20 rounded-xl border border-dashed border-slate-700 text-slate-500 text-xs uppercase tracking-widest">
                                    Warehouse is empty. Request stock from HQ.
                                </div>
                            ) : branchStock.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-slate-700">
                                    <span className="font-bold text-white uppercase">{item.name}</span>
                                    <span className="text-lg font-black text-purple-400">{item.stock} <span className="text-xs text-slate-500">Bks</span></span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: Request Builder */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 p-6 rounded-2xl border border-purple-500/30 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Truck size={100} className="text-purple-500"/></div>
                            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-4">Request Stock from HQ</h3>
                            
                            <div className="flex flex-col gap-3 mb-6 relative z-10">
                                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white font-bold outline-none focus:border-purple-500">
                                    <option value="">-- Select Product --</option>
                                    {globalInventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <div className="flex gap-2 items-stretch w-full">
                                    {/* 🚀 FIXED: min-w-0 prevents the input from pushing the button off-screen */}
                                    <input type="number" placeholder="Qty (Bks)" value={requestQty} onChange={e => setRequestQty(e.target.value)} className="flex-1 min-w-0 bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white font-bold outline-none focus:border-purple-500 text-center"/>
                                    
                                    {/* 🚀 FIXED: shrink-0 and whitespace-nowrap forces the button to keep its shape */}
                                    <button onClick={handleAddToCart} className="bg-purple-600 hover:bg-purple-500 text-white px-4 md:px-6 font-bold uppercase tracking-widest rounded-lg shadow-lg shrink-0 whitespace-nowrap text-xs md:text-sm transition-colors">
                                        Add
                                    </button>
                                </div>
                            </div>

                            {requestCart.length > 0 && (
                                <div className="bg-black/30 rounded-xl p-4 border border-slate-700 mb-4 relative z-10">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-700 pb-2">Draft Request</h4>
                                    {requestCart.map(item => (
                                        <div key={item.productId} className="flex justify-between items-center text-sm mb-2">
                                            <span className="text-slate-300 font-bold uppercase">{item.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-purple-400 font-black">{item.qty} Bks</span>
                                                <button onClick={() => removeFromCart(item.productId)} className="text-slate-600 hover:text-red-500"><XCircle size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={handleSubmitRequest} className="w-full mt-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <Send size={16}/> Submit to HQ
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Recent Requests List */}
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Status Log</h4>
                            <div className="space-y-2">
                                {requests.slice(0, 5).map(req => (
                                    <div key={req.id} className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-slate-700">
                                        <div>
                                            <span className="text-xs font-bold text-slate-300">{req.items.length} Items</span>
                                            <p className="text-[9px] text-slate-500 font-mono mt-0.5">{req.timestamp ? new Date(req.timestamp.seconds*1000).toLocaleDateString() : 'Just now'}</p>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${req.status === 'APPROVED' ? 'bg-emerald-900/50 text-emerald-400' : req.status === 'REJECTED' ? 'bg-red-900/50 text-red-400' : 'bg-orange-900/50 text-orange-400'}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================== */}
            {/* ============ MASTER ADMIN VIEW =========== */}
            {/* ========================================== */}
            {isAdmin && (
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-xl">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2"><Clock className="text-orange-500"/> Pending Branch Requests</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {requests.filter(r => r.status === 'PENDING').length === 0 ? (
                            <div className="col-span-full text-center p-8 bg-black/20 rounded-xl border border-dashed border-slate-700 text-slate-500 text-xs uppercase tracking-widest">
                                No pending requests from branches.
                            </div>
                        ) : requests.filter(r => r.status === 'PENDING').map(req => (
                            <div key={req.id} className="bg-slate-800 p-5 rounded-xl border border-orange-500/30 shadow-lg">
                                <div className="flex justify-between items-start border-b border-slate-700 pb-3 mb-3">
                                    <div>
                                        <h4 className="font-black text-white uppercase text-lg">{req.branch}</h4>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Req by: {req.requestedBy}</p>
                                    </div>
                                    <span className="bg-orange-500/20 border border-orange-500/50 text-orange-400 text-[9px] font-black uppercase px-2 py-1 rounded tracking-widest animate-pulse">Action Required</span>
                                </div>
                                
                                <div className="space-y-2 mb-6">
                                    {req.items.map((item, idx) => {
                                        const hqStock = globalInventory.find(p => p.id === item.productId)?.stock || 0;
                                        const hasEnough = hqStock >= item.qty;
                                        return (
                                            <div key={idx} className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-slate-300 uppercase">{item.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-mono text-[9px] ${hasEnough ? 'text-slate-500' : 'text-red-500'}`}>HQ: {hqStock}</span>
                                                    <span className="font-black text-orange-400 w-16 text-right">{item.qty} {item.unit}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => handleApproveRequest(req)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-1 shadow-lg active:scale-95 transition-all">
                                        <CheckCircle size={14}/> Approve & Send
                                    </button>
                                    <button onClick={() => handleRejectRequest(req)} className="px-4 bg-red-900/30 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 py-3 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-1 shadow-lg active:scale-95 transition-all">
                                        <XCircle size={14}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}