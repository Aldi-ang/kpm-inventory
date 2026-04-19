import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Package, ArrowRight, CheckCircle, XCircle, AlertCircle, Clock, Send, Truck, ShieldCheck, Search, Globe, MapPin, Pencil, MinusCircle, PlusCircle, User, FileText, Camera, UploadCloud, ChevronDown, ChevronUp, Check, Eye } from 'lucide-react';
import { collection, doc, onSnapshot, writeBatch, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function BranchWarehouseManager({ db, appId, user, userRole, userLocation, isAdmin, masterUserId, globalInventory, triggerCapy, logAudit }) {
    
    // --- APP WIRING ---
    const storage = getStorage();
    const isAreaAdmin = userRole === 'AREA_ADMIN';
    const branchLocation = userLocation || 'UNASSIGNED';
    const photoInputRef = useRef(null);

    // --- MAIN STATE ---
    const [requests, setRequests] = useState([]);
    const [branchStock, setBranchStock] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // --- AREA ADMIN (TIER 3) STATE ---
    const [requestCart, setRequestCart] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [requestQty, setRequestQty] = useState("");

    // --- HQ (TIER 1/2) FULFILLMENT (OMS) STATE ---
    const [isFulfilling, setIsFulfilling] = useState(null); // The request doc currently in fulfillment modal
    const [fulfillmentCart, setFulfillmentCart] = useState([]);
    const [courierName, setCourierName] = useState("");
    const [trackingNo, setTrackingNo] = useState("");
    const [packagePhotoFile, setPackagePhotoFile] = useState(null);
    const [packagePhotoPreview, setPackagePhotoPreview] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // --- UI VIEW STATE ---
    const [expandedRequest, setExpandedRequest] = useState(null); // For viewing order timeline/photo


    // 🚀 LIVE SYNC: Fetch Requests & Branch Stock
    useEffect(() => {
        if (!masterUserId || !appId) return;
        setIsLoading(true);

        // 1. Listen to Stock Requests Workflow
        const reqRef = collection(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`);
        const unsubReq = onSnapshot(reqRef, (snap) => {
            let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Area Admins only see their own branch requests
            if (isAreaAdmin) data = data.filter(r => r.branch === branchLocation);
            setRequests(data.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
            setIsLoading(false);
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


    // ===========================================
    // ============ AREA ADMIN LOGIC ============
    // ===========================================
    
    // --- Create Request ---
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
                id: reqId,
                branch: branchLocation,
                requestedBy: user.email,
                requestedItems: requestCart, // Original request preserved
                status: 'PENDING',
                workflowTimeline: [{
                    status: 'PENDING',
                    time: new Date().toISOString(),
                    msg: 'Request submitted to HQ.'
                }],
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

    // --- Confirm Receipt (Tokopedia Style) ---
    const handleConfirmReceipt = async (order) => {
        if (!window.confirm(`Confirm receipt of items for ${order.id}?\n\nItems will be officially added to your ${branchLocation} branch warehouse.`)) return;
        setIsProcessing(true);

        try {
            const batch = writeBatch(db);
            
            // 1. Process items into Branch Warehouse
            for (const item of order.fulfilledItems) {
                const branchItemRef = doc(db, `artifacts/${appId}/users/${masterUserId}/branches/${order.branch}/inventory`, item.productId);
                
                // Note: In strict accounting, we'd need to fetch current branch stock first. 
                // For this demo, we use merge: true to add/create.
                batch.set(branchItemRef, {
                    productId: item.productId,
                    name: item.name,
                    stock: item.qty, // Note: Should be ADDITIVE in prod transaction
                    lastReceivedAt: serverTimestamp(),
                    lastReceivedFrom: order.id
                }, { merge: true });
            }

            // 2. Update Order Status
            const orderRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, order.id);
            const updatedTimeline = [...(order.workflowTimeline || [])];
            updatedTimeline.push({
                status: 'DELIVERED',
                time: new Date().toISOString(),
                msg: `Received & verified by ${user.email} at branch.`
            });

            batch.update(orderRef, {
                status: 'DELIVERED',
                receivedAt: serverTimestamp(),
                receivedBy: user.email,
                workflowTimeline: updatedTimeline
            });

            await batch.commit();
            triggerCapy(`${branchLocation} Inventory updated! Thank you. ✅`);
            logAudit("STOCK_RECEIVE", `${branchLocation} confirmed receipt of ${order.id}`);
            setIsProcessing(false);
        } catch(e) {
            alert("Error confirming receipt: " + e.message);
            setIsProcessing(false);
        }
    };


    // ===========================================
    // ============ MASTER ADMIN LOGIC ============
    // ===========================================

    const handleStartFulfillment = (req) => {
        setIsFulfilling(req);
        // Default fulfillment cart to requested items (editable)
        setFulfillmentCart(req.requestedItems.map(item => ({ ...item })));
        setCourierName("");
        setTrackingNo("");
        setPackagePhotoFile(null);
        setPackagePhotoPreview(null);
    };

    const cancelFulfillment = () => {
        setIsFulfilling(null);
        setFulfillmentCart([]);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPackagePhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPackagePhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const updateFulfillQty = (pid, newQty) => {
        if (Number(newQty) <= 0) return; // Prevent 0/neg shipment
        setFulfillmentCart(prev => prev.map(item => item.productId === pid ? { ...item, qty: Number(newQty) } : item));
    };

    // --- Reject Request ---
    const handleRejectRequest = async () => {
        if (!isFulfilling) return;
        if (!window.confirm(`Reject this request from ${isFulfilling.branch}?`)) return;
        setIsProcessing(true);

        try {
            const orderRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, isFulfilling.id);
            const updatedTimeline = [...(isFulfilling.workflowTimeline || [])];
            updatedTimeline.push({
                status: 'REJECTED',
                time: new Date().toISOString(),
                msg: `Request rejected by HQ Admin (${user.email}).`
            });

            await updateDoc(orderRef, {
                status: 'REJECTED',
                rejectedAt: serverTimestamp(),
                rejectedBy: user.email,
                workflowTimeline: updatedTimeline
            });

            triggerCapy(`Request Rejected.`);
            logAudit("STOCK_REJECT", `Rejected ${isFulfilling.id} from ${isFulfilling.branch}`);
            cancelFulfillment();
            setIsProcessing(false);
        } catch (e) { alert("Failed to reject: " + e.message); setIsProcessing(false); }
    };

    // --- Tokopedia Logic: Ship Items (Requires Resi, Photo, Courier) ---
    const handleShipItems = async () => {
        if (!isFulfilling) return;
        if (!courierName || !trackingNo || !packagePhotoFile) {
            return alert("INSUFFICIENT DATA!\n\nTo fulfill this shipment, you must provide:\n1. Courier Name\n2. Nomor Resi (Tracking #)\n3. Proof of Sending Photo");
        }
        if (fulfillmentCart.some(item => Number(item.qty) <= 0)) return alert("Qty must be greater than 0.");

        if (!window.confirm(`Confirm fulfillment & ship items to ${isFulfilling.branch}?\n\nThis will permanently deduct stock from HQ Master Vault.`)) return;
        setIsProcessing(true);

        try {
            const batch = writeBatch(db);

            // 1. Verify HQ has enough stock FOR FULFILLMENT QTY (NOT REQUESTED QTY)
            for (const item of fulfillmentCart) {
                const hqProduct = globalInventory.find(p => p.id === item.productId);
                if (!hqProduct || (hqProduct.stock || 0) < item.qty) {
                    setIsProcessing(false);
                    return alert(`INSUFFICIENT HQ STOCK!\n\nYou cannot ship this. HQ Vault is missing ${item.qty - (hqProduct?.stock || 0)} ${item.unit} of ${item.name}. Please edit the fulfillment qty.`);
                }
            }

            // 2. Upload Proof of Sending Photo to Storage
            const storageRef = ref(storage, `artifacts/${appId}/users/${masterUserId}/stock_shipments/${isFulfilling.id}_${Date.now()}.jpg`);
            const snapshot = await uploadBytes(storageRef, packagePhotoFile);
            const photoUrl = await getDownloadURL(snapshot.ref);

            // 3. Deduct stock from HQ
            for (const item of fulfillmentCart) {
                const hqProduct = globalInventory.find(p => p.id === item.productId);
                const hqRef = doc(db, `artifacts/${appId}/users/${masterUserId}/products`, item.productId);
                batch.update(hqRef, { stock: (hqProduct.stock || 0) - item.qty });
            }

            // 4. Update Order Status to IN_TRANSIT with full tracking trail
            const orderRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, isFulfilling.id);
            const updatedTimeline = [...(isFulfilling.workflowTimeline || [])];
            updatedTimeline.push({
                status: 'IN_TRANSIT',
                time: new Date().toISOString(),
                msg: `Shipped via ${courierName} (Resi: ${trackingNo}) by ${user.email}. Photo proof uploaded.`
            });

            batch.update(orderRef, {
                status: 'IN_TRANSIT',
                courier: courierName,
                trackingNo: trackingNo,
                packagePhotoUrl: photoUrl,
                fulfilledItems: fulfillmentCart, // Actual items sent
                fulfilledAt: serverTimestamp(),
                fulfilledBy: user.email,
                workflowTimeline: updatedTimeline
            });

            await batch.commit();
            triggerCapy(`Shipment confirmed! Status changed to IN_TRANSIT. 🚚`);
            logAudit("STOCK_SHIP", `Shipped ${isFulfilling.id} to ${isFulfilling.branch}. Resi: ${trackingNo}`);
            cancelFulfillment();
            setIsProcessing(false);
        } catch (e) {
            console.error(e);
            alert("Shipment failed: " + e.message);
            setIsProcessing(false);
        }
    };


    // ===========================================
    // ================ RENDERING ================
    // ===========================================

    // Helper: Tokopedia Style Status Badge
    const StatusBadge = ({ status }) => {
        const styles = {
            'PENDING': 'bg-orange-900/50 text-orange-400 border border-orange-500/50',
            'REJECTED': 'bg-red-900/50 text-red-400 border border-red-500/50',
            'IN_TRANSIT': 'bg-blue-900/50 text-blue-400 border border-blue-500/50 animate-pulse',
            'DELIVERED': 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/50',
        };
        const icons = {
            'PENDING': <Clock size={12}/>,
            'REJECTED': <XCircle size={12}/>,
            'IN_TRANSIT': <Truck size={12}/>,
            'DELIVERED': <CheckCircle size={12}/>,
        };
        const labels = {
            'PENDING': 'Menunggu Konfirmasi',
            'REJECTED': 'Ditolak',
            'IN_TRANSIT': 'Dalam Pengiriman',
            'DELIVERED': 'Diterima',
        }
        return (
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1.5 shadow-inner ${styles[status] || 'bg-slate-700'}`}>
                {icons[status] || null} {labels[status] || status}
            </span>
        );
    };

    // Helper: Unified Tracking Status Module (Used by Both Tiers)
    const OrderTrackingModule = ({ order }) => {
        const isDelivered = order.status === 'DELIVERED';
        const isFulfillableByTier3 = isAreaAdmin && order.status === 'IN_TRANSIT';

        return (
            <div className="bg-black/50 rounded-2xl border border-slate-700 p-6 animate-fade-in mt-2 mb-4">
                
                <div className="flex flex-col md:flex-row gap-6 mb-8 border-b border-slate-700 pb-6">
                    {/* Tokopedia-Style Tracking Card */}
                    <div className="flex-1 bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Truck size={80} className="text-blue-500"/></div>
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Informasi Pengiriman (TMS)</h4>
                        {order.status === 'PENDING' ? (
                            <div className="text-center py-5 text-slate-600 italic text-xs">Menunggu HQ Mempersiapkan Barang...</div>
                        ) : order.status === 'REJECTED' ? (
                            <div className="text-center py-5 text-red-500 font-bold text-xs uppercase tracking-widest">PERMINTAAN DITOLAK HQ</div>
                        ) : (
                            <div className="space-y-2.5 relative z-10">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 flex items-center gap-2"><User size={14}/> Courier</span>
                                    <span className="font-bold text-white uppercase">{order.courier}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 flex items-center gap-2"><FileText size={14}/> No. Resi</span>
                                    <span className="font-bold text-blue-400 uppercase font-mono tracking-wider bg-black/50 px-2 py-0.5 rounded border border-blue-900/50">{order.trackingNo}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Shipped At</span>
                                    <span className="font-bold text-slate-200 text-xs">
                                        {order.fulfilledAt ? new Date(order.fulfilledAt.seconds*1000).toLocaleString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {isFulfillableByTier3 && (
                            <button onClick={() => handleConfirmReceipt(order)} disabled={isProcessing} className="w-full mt-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 relative">
                                {isProcessing ? <Clock className="animate-spin" size={16}/> : <Check size={18}/>}
                                KONFIRMASI TERIMA BARANG
                            </button>
                        )}
                        {isDelivered && (
                            <div className="mt-5 py-3 bg-emerald-900/50 border border-emerald-500/50 text-emerald-400 rounded-lg text-center text-xs font-bold flex items-center justify-center gap-2">
                                <Check size={16}/> Barang Sudah Diterima Branch
                            </div>
                        )}
                    </div>

                    {/* Proof of Sending Photo */}
                    <div className="w-full md:w-56 shrink-0 bg-slate-900 p-3 rounded-xl border border-slate-700 shadow-xl flex flex-col items-center">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Bukti Pengiriman (HQ)</h4>
                        {order.packagePhotoUrl ? (
                            <a href={order.packagePhotoUrl} target="_blank" rel="noreferrer" className="block group">
                                <img src={order.packagePhotoUrl} alt="Shipment Proof" className="w-full h-40 object-cover rounded-lg border-2 border-slate-700 group-hover:border-blue-500 transition-colors shadow-inner" />
                                <span className="text-[9px] text-slate-600 mt-1 block text-center uppercase tracking-widest group-hover:text-blue-400">Click to Enlarge <Eye size={10} className="inline ml-1"/></span>
                            </a>
                        ) : (
                            <div className="w-full h-40 bg-black/30 rounded-lg border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-600 text-[10px] text-center p-4">
                                <Camera size={24} className="mb-2 opacity-30"/>
                                Awaiting HQ Photo Proof
                            </div>
                        )}
                    </div>
                </div>

                {/* Workflow Timeline (Tokopedia Style) */}
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">History Order Timeline</h4>
                <div className="space-y-6 relative pl-6">
                    <div className="absolute left-[7px] top-1 bottom-1 w-[2px] bg-slate-700"></div> {/* Line */}
                    {(order.workflowTimeline || []).map((ev, idx) => {
                        const isLatest = idx === order.workflowTimeline.length - 1;
                        const circleColor = isLatest ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'bg-slate-600';
                        const textColor = isLatest ? 'text-white' : 'text-slate-400';
                        return (
                            <div key={idx} className="flex gap-4 relative">
                                <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${circleColor} relative z-10 border-2 border-slate-900`}></div>
                                <div>
                                    <p className={`font-bold text-xs uppercase tracking-wider ${isLatest ? 'text-blue-400' : 'text-slate-300'}`}>{ev.status}</p>
                                    <p className={`text-sm font-medium ${textColor} mt-0.5 whitespace-pre-line`}>{ev.msg}</p>
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


    return (
        <div className="animate-fade-in space-y-6 relative">
            
            {/* Processing Overlay */}
            {isProcessing && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm">
                    <div className="text-center">
                        <Package className="text-blue-500 animate-bounce mx-auto mb-4" size={48}/>
                        <h2 className="text-3xl font-black text-white uppercase tracking-widest">PROSES DATA LOGISTIK...</h2>
                        <p className="text-slate-400 mt-2 text-xs uppercase tracking-widest animate-pulse">Sedang sinkronisasi math & upload bukti ke cloud...</p>
                    </div>
                </div>
            )}

            {/* =========================================== */}
            {/* ============= FULFILLMENT MODAL ============ */}
            {/* =========================================== */}
            {isFulfilling && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[90] backdrop-blur-sm overflow-y-auto">
                    <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border-2 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.2)] flex flex-col max-h-[90vh] overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-700 bg-black/40 flex justify-between items-start gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                                    <Pencil className="text-blue-500"/> Siapkan Pengiriman Ke {isFulfilling.branch}
                                </h3>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Order ID: {isFulfilling.id} • Req By: {isFulfilling.requestedBy}</p>
                            </div>
                            <button onClick={cancelFulfillment} className="text-slate-600 hover:text-white"><XCircle size={24}/></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-8">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                {/* REQUIRED SHIPPING DATA */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Truck size={14}/> Wajib Diisi (TMS)</h4>
                                    
                                    <input type="text" placeholder="Nama Kurir / Jasa Pengiriman (e.g., J&T, Internal Driver)" value={courierName} onChange={e => setCourierName(e.target.value)} className="w-full bg-black/50 border border-slate-600 rounded-xl p-4 text-sm text-white font-bold outline-none focus:border-blue-500 transition-colors shadow-inner"/>
                                    
                                    <input type="text" placeholder="Nomor Resi / Tracking Number (Required)" value={trackingNo} onChange={e => setTrackingNo(e.target.value)} className="w-full bg-black/50 border border-blue-900/50 rounded-xl p-4 text-sm text-blue-300 font-mono font-bold outline-none focus:border-blue-400 transition-colors shadow-inner uppercase tracking-wider"/>
                                    
                                    <div className="bg-black p-4 rounded-xl border border-dashed border-red-500/50 text-red-400 text-xs flex gap-3 items-center leading-relaxed">
                                        <AlertCircle size={32} className="shrink-0"/>
                                        <p><strong className="uppercase block">Penting:</strong> Data di atas dan Foto Bukti di samping *wajib* diisi lengkap. Ini adalah Shopee/Tokopedia logic: Status Math tidak akan berubah sebelum paper trail pengiriman lengkap.</p>
                                    </div>
                                </div>

                                {/* REQUIRED PHOTO PROOF */}
                                <div className="bg-black/50 p-6 rounded-xl border border-slate-700 flex flex-col items-center shadow-xl">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Camera size={12}/> Wajib Upload: Foto Paket & Resi</h4>
                                    
                                    {packagePhotoPreview ? (
                                        <div className="w-full relative">
                                            <img src={packagePhotoPreview} alt="Package Proof" className="w-full h-56 object-cover rounded-lg border-2 border-blue-500 shadow-inner"/>
                                            <button onClick={() => { setPackagePhotoFile(null); setPackagePhotoPreview(null); }} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 text-white hover:bg-red-500"><XCircle size={16}/></button>
                                        </div>
                                    ) : (
                                        <button onClick={() => photoInputRef.current.click()} className="w-full h-56 bg-slate-800 rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-500 hover:border-blue-500 hover:text-blue-400 transition-colors gap-3 p-6 text-center">
                                            <UploadCloud size={40} className="opacity-50"/>
                                            <span className="font-bold text-xs uppercase tracking-widest">Pilih Foto Bukti Kirim (Proof of Sending)</span>
                                            <span className="text-[9px] text-slate-600">Ambil foto paket yang sudah ada resinya, atau screenshot bukti transfer resi.</span>
                                        </button>
                                    )}
                                    <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" />
                                </div>
                            </div>

                            {/* ITEM EDITING (Tokopedia Style) */}
                            <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Pencil size={14} className="text-blue-500"/> Edit Barang Yang Dikirim (HQ can edit Qty)</h4>
                                <div className="space-y-3 bg-black/30 p-4 rounded-2xl border border-slate-700">
                                    {fulfillmentCart.map(item => {
                                        const hqProduct = globalInventory.find(p => p.id === item.productId);
                                        const hqStock = hqProduct?.stock || 0;
                                        const hasEnough = hqStock >= item.qty;
                                        
                                        return (
                                            <div key={item.productId} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                                <div>
                                                    <span className="font-bold text-white uppercase text-sm">{item.name}</span>
                                                    <div className="flex gap-4 text-[10px] mt-1">
                                                        <span className="text-orange-400 font-bold uppercase tracking-widest">Diminta Branch: {isFulfilling.requestedItems.find(r => r.productId === item.productId)?.qty} Bks</span>
                                                        <span className={`font-black ${hasEnough ? 'text-slate-500' : 'text-red-500'}`}>Stok HQ (Vault): {hqStock} Bks</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700 shadow-inner shrink-0 w-full md:w-44">
                                                    <label className="text-[10px] text-blue-400 font-bold uppercase tracking-widest shrink-0">Kirim:</label>
                                                    <input type="number" value={item.qty} onChange={e => updateFulfillQty(item.productId, e.target.value)} className="flex-1 min-w-0 bg-transparent text-right font-black text-blue-300 text-lg outline-none"/>
                                                    <span className="text-[10px] text-slate-500 shrink-0">Bks</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer (Action Buttons) */}
                        <div className="no-print p-6 border-t border-slate-700 bg-black/40 flex flex-col md:flex-row gap-3 mt-auto shrink-0 rounded-b-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.3)] relative z-20">
                            <button onClick={handleShipItems} disabled={isProcessing} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all relative">
                                {isProcessing ? <Clock className="animate-spin" size={18}/> : <Send size={20}/>}
                                KONFIRMASI DATA & KIRIM BARANG (UPDATE MATH)
                            </button>
                            <button onClick={handleRejectRequest} disabled={isProcessing} className="w-full md:w-auto px-6 bg-red-900/30 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 py-4 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                                <XCircle size={16}/> TOLAK ORDER
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================== */}
            {/* ================ HEADER =================== */}
            {/* =========================================== */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                        {isAdmin ? <ShieldCheck className="text-orange-500" size={32}/> : <Globe className="text-purple-500" size={32}/>}
                        {isAdmin ? 'Global Logistics Command Center (OMS/TMS)' : `${branchLocation} Hub Logistics`}
                    </h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2 flex-wrap">
                        {isAdmin ? <><MapPin size={10}/> All Branches nationwide.</> : <><User size={10}/> Admin: {user.email} • Assigned Area: {branchLocation}</>}
                    </p>
                </div>
            </div>

            {/* =========================================== */}
            {/* ============= AREA ADMIN VIEW ============ */}
            {/* =========================================== */}
            {isAreaAdmin && (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr,360px] gap-6">
                    
                    {/* LEFT: Unified Order Log with Unified Status Module */}
                    <div className="space-y-6 flex flex-col">
                        
                        {/* Current Branch Stock */}
                        <details className="group" open>
                            <summary className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-slate-700 transition-colors flex justify-between items-center shadow-lg">
                                <h3 className="text-lg font-black text-purple-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={20}/> My Current Branch Inventory</h3>
                                <ChevronDown size={20} className="text-slate-500 group-open:rotate-180 transition-transform"/>
                            </summary>
                            <div className="p-4 bg-black/30 rounded-xl mt-3 border border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-slide-down">
                                {branchStock.length === 0 ? (
                                    <div className="col-span-full text-center p-8 bg-black/20 rounded-xl border border-dashed border-slate-700 text-slate-500 text-xs uppercase tracking-widest">
                                        Warehouse is empty. Request stock from HQ using the form on the right.
                                    </div>
                                ) : branchStock.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-slate-700 shadow-inner">
                                        <span className="font-bold text-white uppercase text-sm truncate pr-2">{item.name}</span>
                                        <span className="text-lg font-black text-purple-400 shrink-0">{item.stock} <span className="text-[10px] text-slate-500 font-bold">Bks</span></span>
                                    </div>
                                ))}
                            </div>
                        </details>

                        {/* Recent Requests Status Log (TMS Mode) */}
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex-1 flex flex-col shadow-lg">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2"><Truck size={20}/> Status Pengiriman & Reorder History (Tokopedia Style)</h3>
                            
                            {isLoading ? (
                                <div className="text-center p-10 text-slate-600 animate-pulse italic text-xs uppercase tracking-widest">Loading Logistics Logs...</div>
                            ) : requests.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-slate-700 rounded-xl bg-black/20">
                                    <Package size={48} className="text-slate-700 mb-3 opacity-50"/>
                                    <p className="text-slate-500 font-bold text-sm">No reorder history found for {branchLocation}.</p>
                                    <p className="text-slate-600 text-[10px] mt-1 uppercase tracking-widest">Submit a new request using the form on the right!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {requests.map(req => {
                                        const isExpanded = expandedRequest === req.id;
                                        return (
                                            <div key={req.id} className={`p-4 rounded-2xl border transition-colors ${isExpanded ? 'bg-slate-900 border-blue-800 shadow-2xl' : 'bg-black/40 border-slate-700 hover:bg-slate-800'}`}>
                                                
                                                {/* Card Header (Tokopedia Style) */}
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-700 pb-3 mb-3">
                                                    <div>
                                                        <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">{req.id} • Req By {req.requestedBy.split('@')[0]}</span>
                                                        <p className="text-[9px] text-slate-600 font-mono mt-0.5">Time: {new Date(req.timestamp?.seconds*1000).toLocaleString()}</p>
                                                    </div>
                                                    <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
                                                        <span className="text-xs font-black text-slate-300">Total Diminta: {req.requestedItems.reduce((sum,i) => sum+i.qty, 0)} Bks</span>
                                                        <StatusBadge status={req.status}/>
                                                        <button onClick={() => setExpandedRequest(isExpanded ? null : req.id)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-2.5 rounded-lg flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors shadow-sm">
                                                            {isExpanded ? <XCircle size={14}/> : <Eye size={14}/>}
                                                            {isExpanded ? 'Tutup Status' : 'Lihat Status (Tokped Style)'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Unified Tracking Status Module (Unified View) */}
                                                {isExpanded && <OrderTrackingModule order={req} />}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Request Builder */}
                    <div className="bg-slate-900 p-6 rounded-2xl border border-purple-500/30 shadow-xl relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Send size={100} className="text-purple-500"/></div>
                        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-1 relative z-10">Reorder Stock</h3>
                        <p className="text-[10px] text-purple-400 uppercase tracking-widest mb-6 relative z-10">Request stock from HQ Master Vault to your branch.</p>
                        
                        {/* Builder Form */}
                        <div className="flex flex-col gap-3 mb-6 relative z-10">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 block">1. Select Product</label>
                            <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="bg-black border border-slate-600 rounded-xl p-4 text-sm text-white font-bold outline-none focus:border-purple-500 transition-colors shadow-inner">
                                <option value="">-- Select Product --</option>
                                {globalInventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 block">2. Input Qty (Bks)</label>
                            <div className="flex gap-2 items-stretch w-full">
                                <input type="number" min="1" placeholder="Qty (Bks)" value={requestQty} onChange={e => setRequestQty(e.target.value)} className="flex-1 min-w-0 bg-black border border-slate-600 rounded-xl p-4 text-sm text-white font-black outline-none focus:border-purple-500 text-center transition-colors shadow-inner"/>
                                <button onClick={handleAddToCart} className="bg-purple-600 hover:bg-purple-500 text-white px-6 font-black uppercase tracking-widest rounded-xl shadow-lg shrink-0 text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 h-[54px]">
                                    <PackagePlus size={16}/> Add to Cart
                                </button>
                            </div>
                        </div>

                        {/* Request Cart */}
                        {requestCart.length > 0 && (
                            <div className="bg-black/40 rounded-2xl p-5 border border-slate-700 mb-4 flex-1 flex flex-col relative z-10 shadow-inner">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2 flex items-center gap-2"><ShoppingCart size={14}/> Request Draft Cart ({requestCart.length})</h4>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 mb-5 pr-2">
                                    {requestCart.map(item => (
                                        <div key={item.productId} className="flex justify-between items-center text-sm bg-slate-800 p-3 rounded-lg border border-slate-700">
                                            <span className="text-slate-300 font-bold uppercase truncate pr-3">{item.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-purple-400 font-black shrink-0">{item.qty} Bks</span>
                                                <button onClick={() => removeFromCart(item.productId)} className="text-slate-600 hover:text-red-500 shrink-0"><MinusCircle size={16}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleSubmitRequest} className="w-full mt-auto py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm relative">
                                    <Send size={18}/> SUBMIT ORDER TO HQ
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* =========================================== */}
            {/* ============ MASTER ADMIN VIEW =========== */}
            {/* =========================================== */}
            {isAdmin && (
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-xl flex-1 flex flex-col">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3"><Clock className="text-orange-500"/> Incoming Branch Request Pipeline (OMS/TMS Mode)</h3>
                    
                    {isLoading ? (
                        <div className="text-center p-10 text-slate-600 animate-pulse italic text-xs uppercase tracking-widest">Loading Logistics Logs...</div>
                    ) : requests.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-700 rounded-xl bg-black/20">
                            <Globe size={48} className="text-slate-700 mb-3 opacity-50"/>
                            <p className="text-slate-500 font-bold text-sm">No requests nationwide.</p>
                            <p className="text-slate-600 text-[10px] mt-1 uppercase tracking-widest">Logistics pipeline is clear!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {requests.map(req => {
                                const isExpanded = expandedRequest === req.id;
                                return (
                                    <div key={req.id} className={`p-4 rounded-2xl border transition-colors ${isExpanded ? 'bg-slate-950 border-blue-800 shadow-2xl' : 'bg-black/40 border-slate-700 hover:bg-slate-800'}`}>
                                        
                                        {/* HQ Card Header */}
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-700 pb-3 mb-3">
                                            <div>
                                                <div className="flex gap-2 items-center">
                                                    <h4 className="font-black text-white uppercase text-xl flex items-center gap-2">
                                                        <MapPin size={16} className="text-orange-400"/> {req.branch}
                                                    </h4>
                                                    <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">{req.id} • {req.requestedBy.split('@')[0]}</span>
                                                </div>
                                                <p className="text-[9px] text-slate-600 font-mono mt-0.5">Time: {new Date(req.timestamp?.seconds*1000).toLocaleString()}</p>
                                            </div>
                                            <div className="flex flex-col md:flex-row items-end md:items-center gap-3 shrink-0">
                                                <span className="text-xs font-black text-slate-300">Diminta: {req.requestedItems.reduce((sum,i) => sum+i.qty, 0)} Bks</span>
                                                <StatusBadge status={req.status}/>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setExpandedRequest(isExpanded ? null : req.id)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-2 rounded-lg flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors shadow-sm">
                                                        {isExpanded ? <XCircle size={14}/> : <Eye size={14}/>}
                                                        {isExpanded ? 'Tutup Track' : 'Lacak (OMS)'}
                                                    </button>
                                                    {req.status === 'PENDING' && (
                                                        <button onClick={() => handleStartFulfillment(req)} className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-1 shadow-lg active:scale-95 transition-all animate-pop-in">
                                                            <Truck size={14}/> Siapkan Pengiriman (Fulfil)
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* OMS View: Items Summary (When Collapsed) */}
                                        {!isExpanded && req.status === 'PENDING' && (
                                            <div className="space-y-1.5 text-xs text-slate-300 p-2 pl-4 border-l-2 border-slate-700">
                                                {req.requestedItems.slice(0,3).map(item => (
                                                    <div key={item.productId} className="flex gap-2 font-medium"><span>-</span> <span className="uppercase">{item.name}</span> <span className="font-bold text-orange-400">({item.qty} Bks)</span></div>
                                                ))}
                                                {req.requestedItems.length > 3 && <div className="text-slate-600 italic">...and {req.requestedItems.length - 3} more items.</div>}
                                            </div>
                                        )}

                                        {/* Unified Tracking Status Module (OMS/TMS View) */}
                                        {isExpanded && <OrderTrackingModule order={req} />}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Icons needed but not imported in previous examples
const ShoppingCart = ({ size }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shopping-cart"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>;
const PackagePlus = ({ size }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-package-plus"><path d="M16 16h6"/><path d="M19 13v6"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="M16.5 9.4 7.55 4.24"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>;