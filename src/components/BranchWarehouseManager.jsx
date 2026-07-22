import React, { useState, useEffect, useRef } from 'react';
import { Package, ArrowRight, CheckCircle, XCircle, AlertCircle, Clock, Send, Truck, ShieldCheck, Globe, MapPin, Pencil, MinusCircle, PlusCircle, User, FileText, Camera, UploadCloud, ChevronDown, ChevronUp, Check, Eye, Trash2, Save, X } from 'lucide-react';
import { collection, doc, onSnapshot, writeBatch, serverTimestamp, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { uploadPhotoToStorage } from '../utils/helpers';

export default function BranchWarehouseManager({ db, storage, appId, user, userRole, userLocation, isAdmin, masterUserId, globalInventory, triggerCapy, logAudit, appSettings }) {
    
    const isAreaAdmin = !isAdmin; // 🚀 THE FIX: Dynamically adapts to any custom Tier rank
    const branchLocation = userLocation || 'UNASSIGNED';
    const photoInputRef = useRef(null);

    const [requests, setRequests] = useState([]);
    const [branchStock, setBranchStock] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [requestCart, setRequestCart] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [requestQty, setRequestQty] = useState("");
    
    const [shippingAddress, setShippingAddress] = useState({
        jalan: "", kecamatan: "", kabupaten: "", provinsi: branchLocation !== 'UNASSIGNED' ? branchLocation : "", postalCode: ""
    });

    const [isFulfilling, setIsFulfilling] = useState(null); 
    const [fulfillmentCart, setFulfillmentCart] = useState([]);
    const [senderName, setSenderName] = useState(""); 
    const [courierName, setCourierName] = useState("");
    const [trackingNo, setTrackingNo] = useState("");
    const [packagePhotoFile, setPackagePhotoFile] = useState(null);
    const [packagePhotoPreview, setPackagePhotoPreview] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [editingOrder, setEditingOrder] = useState(null);
    const [editSenderName, setEditSenderName] = useState(""); 
    const [editCourier, setEditCourier] = useState("");
    const [editTrackingNo, setEditTrackingNo] = useState("");
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);

    const [expandedRequest, setExpandedRequest] = useState(null); 

    const getAdminName = () => appSettings?.adminDisplayName || user?.displayName || (user?.email || "").split('@')[0] || "HQ Admin";

    useEffect(() => {
        if (isAreaAdmin) {
            const savedAddress = localStorage.getItem(`kpm_address_${branchLocation}`);
            if (savedAddress) {
                try { setShippingAddress(JSON.parse(savedAddress)); } catch(e) {}
            }
        }
    }, [isAreaAdmin, branchLocation]);

    useEffect(() => {
        if (!masterUserId || !appId) return;
        setIsLoading(true);

        const reqRef = collection(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`);
        const unsubReq = onSnapshot(reqRef, (snap) => {
            let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (isAreaAdmin) data = data.filter(r => r.branch === branchLocation);
            setRequests(data.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
            setIsLoading(false);
        });

        let unsubStock = () => {};
        if (isAreaAdmin && branchLocation !== 'UNASSIGNED') {
            const stockRef = collection(db, `artifacts/${appId}/users/${masterUserId}/branches/${branchLocation}/inventory`);
            unsubStock = onSnapshot(stockRef, (snap) => {
                setBranchStock(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
        }

        return () => { unsubReq(); unsubStock(); };
    }, [db, appId, masterUserId, isAreaAdmin, branchLocation]);

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
        
        if (!shippingAddress.jalan || !shippingAddress.kecamatan || !shippingAddress.kabupaten || !shippingAddress.provinsi) {
            return alert("ALAMAT TIDAK LENGKAP!\n\nMohon lengkapi data alamat pengiriman (Jalan, Kecamatan, Kabupaten, Provinsi) agar HQ dapat memproses pengiriman.");
        }

        if (!window.confirm(`Submit stock request to HQ for ${branchLocation}?`)) return;
        setIsProcessing(true);

        try {
            localStorage.setItem(`kpm_address_${branchLocation}`, JSON.stringify(shippingAddress));

            const batch = writeBatch(db);
            const reqId = `REQ_${Date.now()}`;
            const reqRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, reqId);
            
            batch.set(reqRef, {
                id: reqId,
                branch: branchLocation,
                requestedBy: user.email,
                requestedByName: user.displayName || (user.email || "").split('@')[0], 
                requestedItems: requestCart, 
                deliveryAddress: shippingAddress,
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
            setIsProcessing(false);
        } catch (e) {
            alert("Failed to submit request: " + e.message);
            setIsProcessing(false);
        }
    };

    // 🚀 THE FIX: TRANSACTION READ BEFORE WRITE ENGINE 🚀
    const handleConfirmReceipt = async (order) => {
        if (!window.confirm(`Confirm receipt of items for ${order.id}?\n\nItems will be officially added to your ${branchLocation} branch warehouse.`)) return;
        setIsProcessing(true);

        try {
            const itemsToProcess = order.fulfilledItems || order.requestedItems || order.items || [];
            
            await runTransaction(db, async (t) => {
                // --- PHASE 1: EXECUTE ALL READS ---
                
                // 1. Read Order Document
                const orderRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, order.id);
                const orderSnap = await t.get(orderRef);
                if (!orderSnap.exists()) throw new Error("Order not found in database!");
                const orderData = orderSnap.data();

                // 2. Read All Branch Inventory Documents
                const inventorySnaps = await Promise.all(itemsToProcess.map(async (item) => {
                    const branchItemRef = doc(db, `artifacts/${appId}/users/${masterUserId}/branches/${order.branch}/inventory`, item.productId);
                    const snap = await t.get(branchItemRef);
                    return { ref: branchItemRef, snap, item };
                }));

                // --- PHASE 2: EXECUTE ALL WRITES ---
                
                // 1. Write to Branch Inventory
                inventorySnaps.forEach(data => {
                    let currentStock = 0;
                    if (data.snap.exists()) {
                        currentStock = data.snap.data().stock || 0;
                    }
                    t.set(data.ref, {
                        productId: data.item.productId,
                        name: data.item.name,
                        stock: currentStock + Number(data.item.qty), 
                        lastReceivedAt: serverTimestamp(),
                        lastReceivedFrom: order.id
                    }, { merge: true });
                });

                // 2. Write Order Update
                const updatedTimeline = [...(orderData.workflowTimeline || [])];
                updatedTimeline.push({
                    status: 'DELIVERED',
                    time: new Date().toISOString(),
                    msg: `Received & verified by ${user.displayName || (user.email || "").split('@')[0]} at branch.` 
                });

                t.update(orderRef, {
                    status: 'DELIVERED',
                    receivedAt: serverTimestamp(),
                    receivedBy: user.email,
                    workflowTimeline: updatedTimeline
                });
            });

            triggerCapy(`${branchLocation} Inventory updated! Thank you. ✅`);
            logAudit("STOCK_RECEIVE", `${branchLocation} confirmed receipt of ${order.id}`);
            setIsProcessing(false);
        } catch(e) {
            console.error(e);
            alert("Error confirming receipt: " + e.message);
            setIsProcessing(false);
        }
    };

    const handleStartFulfillment = (req) => {
        setIsFulfilling(req);
        const itemsToFulfill = req.requestedItems || req.items || [];
        setFulfillmentCart(itemsToFulfill.map(item => ({ ...item })));
        setSenderName(getAdminName()); 
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
        if (Number(newQty) <= 0) return; 
        setFulfillmentCart(prev => prev.map(item => item.productId === pid ? { ...item, qty: Number(newQty) } : item));
    };

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
                msg: `Request rejected by HQ Admin (${getAdminName()}).`
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

    const handleShipItems = async () => {
        if (!isFulfilling) return;
        if (!courierName || !trackingNo || !packagePhotoFile || !senderName) {
            return alert("INSUFFICIENT DATA!\n\nTo fulfill this shipment, you must provide:\n1. Nama Pengirim\n2. Logistic Company / Courier\n3. Nomor Resi (Tracking #)\n4. Proof of Sending Photo");
        }
        if (fulfillmentCart.some(item => Number(item.qty) <= 0)) return alert("Qty must be greater than 0.");

        if (!window.confirm(`Confirm fulfillment & ship items to ${isFulfilling.branch}?\n\nThis will permanently deduct stock from HQ Master Vault.`)) return;
        setIsProcessing(true);

        try {
            const batch = writeBatch(db);

            for (const item of fulfillmentCart) {
                const hqProduct = globalInventory.find(p => p.id === item.productId);
                if (!hqProduct || (hqProduct.stock || 0) < item.qty) {
                    setIsProcessing(false);
                    return alert(`INSUFFICIENT HQ STOCK!\n\nYou cannot ship this. HQ Vault is missing ${item.qty - (hqProduct?.stock || 0)} ${item.unit} of ${item.name}. Please edit the fulfillment qty.`);
                }
            }

            triggerCapy("Compressing Photo & Syncing Database... ⏳");
            const base64Photo = await compressImageToBase64(packagePhotoFile);
            const photoPath = `artifacts/${appId}/users/${masterUserId}/photos/shipment_${isFulfilling.id}_${Date.now()}.jpg`;
            const photoUrl = await uploadPhotoToStorage(storage, photoPath, base64Photo);

            for (const item of fulfillmentCart) {
                const hqProduct = globalInventory.find(p => p.id === item.productId);
                const hqRef = doc(db, `artifacts/${appId}/users/${masterUserId}/products`, item.productId);
                batch.update(hqRef, { stock: (hqProduct.stock || 0) - item.qty });
            }

            const orderRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, isFulfilling.id);
            const updatedTimeline = [...(isFulfilling.workflowTimeline || [])];
            updatedTimeline.push({
                status: 'IN_TRANSIT',
                time: new Date().toISOString(),
                msg: `Shipped via ${courierName} (Resi: ${trackingNo}) by ${senderName}. Photo proof uploaded.` 
            });

            batch.update(orderRef, {
                status: 'IN_TRANSIT',
                senderName: senderName, 
                courier: courierName,
                trackingNo: trackingNo,
                packagePhotoUrl: photoUrl,
                fulfilledItems: fulfillmentCart, 
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
            const orderRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, editingOrder.id);
            
            const updatedTimeline = [...(editingOrder.workflowTimeline || [])];
            updatedTimeline.push({
                status: 'SYSTEM_EDIT',
                time: new Date().toISOString(),
                msg: `HQ Admin (${getAdminName()}) updated shipping info.\nOld: ${editingOrder.courier} (${editingOrder.trackingNo}) by ${editingOrder.senderName || 'N/A'}\nNew: ${editCourier} (${editTrackingNo}) by ${editSenderName}`
            });

            await updateDoc(orderRef, {
                senderName: editSenderName, 
                courier: editCourier,
                trackingNo: editTrackingNo,
                workflowTimeline: updatedTimeline
            });
            
            triggerCapy("Shipping data updated successfully! 📝");
            logAudit("STOCK_EDIT_LOG", `Admin edited shipping info for ${editingOrder.id}`);
            setEditingOrder(null);
            setIsProcessingOrder(false);
        } catch (e) {
            alert("Failed to edit record: " + e.message);
            setIsProcessingOrder(false);
        }
    };

    const handleDeleteRequest = async (orderId) => {
        if (!window.confirm(`⚠️ WARNING: DELETE RECORD?\n\nAre you sure you want to permanently delete Order: ${orderId}?\n\nNote: This only deletes the history paper-trail. It will NOT automatically refund or reverse warehouse math.`)) return;
        
        setIsProcessing(true);
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, orderId));
            triggerCapy(`Record ${orderId} deleted permanently. 🗑️`);
            logAudit("STOCK_DELETE_LOG", `Admin deleted request ${orderId}`);
            setIsProcessing(false);
        } catch(e) {
            alert("Failed to delete record: " + e.message);
            setIsProcessing(false);
        }
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            'PENDING': 'bg-orange-900/50 text-orange-400 border border-orange-500/50',
            'REJECTED': 'bg-red-900/50 text-red-400 border border-red-500/50',
            'IN_TRANSIT': 'bg-blue-900/50 text-blue-400 border border-blue-500/50 animate-pulse',
            'DELIVERED': 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/50',
            'SYSTEM_EDIT': 'bg-purple-900/50 text-purple-400 border border-purple-500/50',
        };
        const icons = {
            'PENDING': <Clock size={12}/>,
            'REJECTED': <XCircle size={12}/>,
            'IN_TRANSIT': <Truck size={12}/>,
            'DELIVERED': <CheckCircle size={12}/>,
            'SYSTEM_EDIT': <Pencil size={12}/>,
        };
        const labels = {
            'PENDING': 'Menunggu Konfirmasi',
            'REJECTED': 'Ditolak',
            'IN_TRANSIT': 'Dalam Pengiriman',
            'DELIVERED': 'Diterima',
            'SYSTEM_EDIT': 'Sistem Edit',
        }
        return (
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1.5 shadow-inner ${styles[status] || 'bg-slate-700'} whitespace-nowrap`}>
                {icons[status] || null} {labels[status] || status}
            </span>
        );
    };

    const OrderTrackingModule = ({ order }) => {
        const isDelivered = order.status === 'DELIVERED';
        const isFulfillableByTier3 = isAreaAdmin && order.status === 'IN_TRANSIT';

        return (
            <div className="bg-black/50 rounded-2xl border border-slate-700 p-4 sm:p-6 animate-fade-in mt-2 mb-4">
                <div className="flex flex-col lg:flex-row gap-6 mb-8 border-b border-slate-700 pb-6">
                    <div className="flex-1 bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-700 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Truck size={80} className="text-blue-500"/></div>
                        
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Informasi Pengiriman (TMS)</h4>
                            {isAdmin && (order.status === 'IN_TRANSIT' || order.status === 'DELIVERED') && (
                                <button onClick={(e) => { e.stopPropagation(); handleStartEditingOrder(order); }} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-blue-400 px-2 py-1 rounded border border-slate-600 font-bold uppercase flex items-center gap-1 transition-colors relative z-10 shadow-lg">
                                    <Pencil size={10}/> Edit Data
                                </button>
                            )}
                        </div>

                        {order.status === 'PENDING' ? (
                            <div className="text-center py-5 text-slate-600 italic text-xs relative z-10">Menunggu HQ Mempersiapkan Barang...</div>
                        ) : order.status === 'REJECTED' ? (
                            <div className="text-center py-5 text-red-500 font-bold text-xs uppercase tracking-widest relative z-10">PERMINTAAN DITOLAK HQ</div>
                        ) : (
                            <div className="space-y-2.5 relative z-10">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm gap-1 sm:gap-0">
                                    <span className="text-slate-400 flex items-center gap-2"><User size={14}/> Dikirim Oleh (Sender)</span>
                                    <span className="font-bold text-orange-400 uppercase">{order.senderName || order.fulfilledBy?.split('@')[0] || 'HQ Admin'}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm gap-1 sm:gap-0">
                                    <span className="text-slate-400 flex items-center gap-2"><Truck size={14}/> Logistic Company</span>
                                    <span className="font-bold text-white uppercase">{order.courier || 'N/A'}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm gap-1 sm:gap-0">
                                    <span className="text-slate-400 flex items-center gap-2"><FileText size={14}/> No. Resi</span>
                                    <span className="font-bold text-blue-400 uppercase font-mono tracking-wider bg-black/50 px-2 py-0.5 rounded border border-blue-900/50 self-start sm:self-auto">{order.trackingNo || 'N/A'}</span>
                                </div>
                            </div>
                        )}
                        
                        {isFulfillableByTier3 && (
                            <button onClick={() => handleConfirmReceipt(order)} disabled={isProcessing} className="w-full mt-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 relative z-10">
                                {isProcessing ? <Clock className="animate-spin" size={16}/> : <Check size={18}/>}
                                KONFIRMASI TERIMA BARANG
                            </button>
                        )}
                        {isDelivered && (
                            <div className="mt-5 py-3 bg-emerald-900/50 border border-emerald-500/50 text-emerald-400 rounded-lg text-center text-xs font-bold flex items-center justify-center gap-2 relative z-10">
                                <Check size={16}/> Barang Sudah Diterima Branch
                            </div>
                        )}
                    </div>

                    <div className="w-full lg:w-56 shrink-0 bg-slate-900 p-3 rounded-xl border border-slate-700 shadow-xl flex flex-col items-center relative z-10">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Bukti Pengiriman (HQ)</h4>
                        {order.packagePhotoUrl ? (
                            <a href={order.packagePhotoUrl} target="_blank" rel="noreferrer" className="block group w-full">
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
                                    <p className={`font-bold text-xs uppercase tracking-wider ${isLatest ? 'text-blue-400' : 'text-slate-300'} ${ev.status === 'SYSTEM_EDIT' ? 'text-purple-400' : ''}`}>{ev.status}</p>
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

    return (
        <div className="animate-fade-in space-y-6 relative">
            
            {/* ====== HEADER ====== */}
            <div className="flex flex-col justify-between items-start border-b border-white/10 pb-6 mb-6">
                <div className="w-full">
                    {/* Responsive Text Size for Mobile */}
                    <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-widest flex items-center gap-3 break-words w-full">
                        {isAdmin ? <ShieldCheck className="text-orange-500 shrink-0" size={32}/> : <Globe className="text-purple-500 shrink-0" size={32}/>}
                        <span className="leading-tight">{isAdmin ? 'Global Logistics Command' : `${branchLocation} Hub Logistics`}</span>
                    </h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2 flex-wrap">
                        {isAdmin ? <><MapPin size={10}/> All Branches nationwide.</> : <><User size={10}/> Admin: {appSettings?.adminDisplayName || user?.displayName || user?.email?.split('@')[0]} • Assigned Area: {branchLocation}</>}
                    </p>
                </div>
            </div>

            {/* ====== AREA ADMIN VIEW ====== */}
            {isAreaAdmin && (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr,380px] gap-6">
                    
                    {/* LEFT COLUMN: INVENTORY & HISTORY */}
                    <div className="space-y-6 flex flex-col">
                        <details className="group" open>
                            <summary className="bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-700 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-slate-700 transition-colors flex justify-between items-center shadow-lg">
                                <h3 className="text-base sm:text-lg font-black text-purple-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={20}/> My Current Branch Inventory</h3>
                                <ChevronDown size={20} className="text-slate-500 group-open:rotate-180 transition-transform shrink-0"/>
                            </summary>
                            <div className="p-3 sm:p-4 bg-black/30 rounded-xl mt-3 border border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-slide-down">
                                {branchStock.length === 0 ? (
                                    <div className="col-span-full text-center p-8 bg-black/20 rounded-xl border border-dashed border-slate-700 text-slate-500 text-xs uppercase tracking-widest">
                                        Warehouse is empty. Request stock from HQ using the form below.
                                    </div>
                                ) : branchStock.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-black/40 p-3 sm:p-4 rounded-xl border border-slate-700 shadow-inner">
                                        <span className="font-bold text-white uppercase text-sm truncate pr-2">{item.name}</span>
                                        <span className="text-lg font-black text-purple-400 shrink-0">{item.stock} <span className="text-[10px] text-slate-500 font-bold">Bks</span></span>
                                    </div>
                                ))}
                            </div>
                        </details>

                        <div className="bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-slate-700 flex-1 flex flex-col shadow-lg">
                            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2"><Truck size={20}/> Status Pengiriman & Reorder</h3>
                            
                            {isLoading ? (
                                <div className="text-center p-10 text-slate-600 animate-pulse italic text-xs uppercase tracking-widest">Loading Logistics Logs...</div>
                            ) : requests.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-slate-700 rounded-xl bg-black/20">
                                    <Package size={48} className="text-slate-700 mb-3 opacity-50"/>
                                    <p className="text-slate-500 font-bold text-sm">No reorder history found for {branchLocation}.</p>
                                    <p className="text-slate-600 text-[10px] mt-1 uppercase tracking-widest">Submit a new request using the form.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {requests.map(req => {
                                        const isExpanded = expandedRequest === req.id;
                                        const itemsToProcess = req.fulfilledItems || req.requestedItems || req.items || [];
                                        
                                        return (
                                            <div key={req.id} className={`p-3 sm:p-4 rounded-2xl border transition-colors ${isExpanded ? 'bg-slate-900 border-blue-800 shadow-2xl' : 'bg-black/40 border-slate-700 hover:bg-slate-800'}`}>
                                                
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-700 pb-3 mb-3">
                                                    <div className="w-full sm:w-auto mb-2 sm:mb-0">
                                                        <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase block truncate">{req.id} • REQ BY: {req.requestedByName || (req.requestedBy || "").split('@')[0]}</span>
                                                        <p className="text-[9px] text-slate-600 font-mono mt-0.5 mb-1.5">Time: {new Date(req.timestamp?.seconds*1000).toLocaleString()}</p>
                                                        {/* 🚀 THE FIX: LIST ALL ITEM DETAILS RIGHT ON THE CARD */}
                                                        <div className="text-[10px] text-slate-300 font-medium">
                                                            <span className="font-bold text-orange-400 mr-1">📦 {itemsToProcess.reduce((sum,i)=>sum+Number(i.qty),0)} Bks:</span> 
                                                            <span className="text-slate-400">{itemsToProcess.map(i => `${i.qty} ${i.name}`).join(', ')}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                                                        <StatusBadge status={req.status}/>
                                                        <button onClick={() => setExpandedRequest(isExpanded ? null : req.id)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-2.5 rounded-lg flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors shadow-sm ml-auto sm:ml-0">
                                                            {isExpanded ? <XCircle size={14}/> : <Eye size={14}/>}
                                                            {isExpanded ? 'Tutup' : 'Lihat Status'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {isExpanded && <OrderTrackingModule order={req} />}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: REORDER FORM */}
                    <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl border border-purple-500/30 shadow-xl relative flex flex-col w-full h-fit">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-1 relative z-10">Reorder Stock</h3>
                        <p className="text-[10px] text-purple-400 uppercase tracking-widest mb-6 relative z-10">Request stock from HQ Master Vault.</p>
                        
                        <div className="flex flex-col gap-4 mb-6 relative z-10">
                            {/* ITEM SELECTOR */}
                            <div className="bg-black/30 p-3 sm:p-4 rounded-xl border border-slate-700">
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">1. Select Items to Request</label>
                                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white font-bold outline-none focus:border-purple-500 transition-colors mb-3">
                                    <option value="">-- Choose Product --</option>
                                    {globalInventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <div className="grid grid-cols-[1fr,auto] gap-2 w-full">
                                    <input type="number" min="1" placeholder="Qty (Bks)" value={requestQty} onChange={e => setRequestQty(e.target.value)} className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white font-bold outline-none focus:border-purple-500 text-center transition-colors"/>
                                    <button onClick={handleAddToCart} className="bg-purple-600 hover:bg-purple-500 text-white px-4 font-bold uppercase tracking-widest rounded-lg shadow-lg shrink-0 whitespace-nowrap text-xs transition-colors flex items-center justify-center gap-1.5">
                                        <PlusCircle size={14}/> Add
                                    </button>
                                </div>
                            </div>

                            {/* ADDRESS INPUTS */}
                            <div className="bg-black/30 p-3 sm:p-4 rounded-xl border border-slate-700">
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><MapPin size={12}/> 2. Detail Alamat Pengiriman</label>
                                <div className="space-y-3">
                                    <input placeholder="Jalan / Gedung / Patokan" className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500" value={shippingAddress.jalan} onChange={e=>setShippingAddress({...shippingAddress, jalan: e.target.value})}/>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input placeholder="Kecamatan" className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500" value={shippingAddress.kecamatan} onChange={e=>setShippingAddress({...shippingAddress, kecamatan: e.target.value})}/>
                                        <input placeholder="Kabupaten" className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500" value={shippingAddress.kabupaten} onChange={e=>setShippingAddress({...shippingAddress, kabupaten: e.target.value})}/>
                                    </div>
                                    <div className="grid grid-cols-[1fr,auto] gap-3">
                                        <input placeholder="Provinsi" className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500" value={shippingAddress.provinsi} onChange={e=>setShippingAddress({...shippingAddress, provinsi: e.target.value})}/>
                                        <input placeholder="Kode Pos" type="number" className="w-24 bg-black/50 border border-slate-600 rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500 text-center" value={shippingAddress.postalCode} onChange={e=>setShippingAddress({...shippingAddress, postalCode: e.target.value})}/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {requestCart.length > 0 && (
                            <div className="bg-black/40 rounded-2xl p-4 sm:p-5 border border-slate-700 mt-auto flex flex-col relative z-10 shadow-inner">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2 flex items-center gap-2"><Package size={14}/> Request Draft Cart ({requestCart.length})</h4>
                                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2.5 mb-5 pr-2">
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
                                <button onClick={handleSubmitRequest} disabled={isProcessing} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm relative">
                                    {isProcessing ? <Clock size={18} className="animate-spin"/> : <Send size={18}/>} SUBMIT TO HQ
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============ MASTER ADMIN VIEW =========== */}
            {isAdmin && (
                <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-700 shadow-xl flex-1 flex flex-col relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-700 pb-4">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <Clock className="text-orange-500"/> Active Pipeline
                        </h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Pending & In-Transit Requests Only</p>
                    </div>
                    
                    {(() => {
                        const activeRequests = requests.filter(r => r.status === 'PENDING' || r.status === 'IN_TRANSIT');
                        
                        if (isLoading) {
                            return <div className="text-center p-10 text-slate-600 animate-pulse italic text-xs uppercase tracking-widest">Loading Logistics Logs...</div>;
                        }
                        
                        if (activeRequests.length === 0) {
                            return (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-700 rounded-xl bg-black/20">
                                    <Globe size={48} className="text-slate-700 mb-3 opacity-50"/>
                                    <p className="text-slate-500 font-bold text-sm">No active requests nationwide.</p>
                                    <p className="text-slate-600 text-[10px] mt-1 uppercase tracking-widest">Active logistics pipeline is clear!</p>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-4">
                                {activeRequests.map(req => {
                                    const isExpanded = expandedRequest === req.id;
                                    const itemsToProcess = req.fulfilledItems || req.requestedItems || req.items || [];
                                    
                                    return (
                                        <div key={req.id} className={`p-4 rounded-2xl border transition-colors ${isExpanded ? 'bg-slate-950 border-blue-800 shadow-2xl' : 'bg-black/40 border-slate-700 hover:bg-slate-800'}`}>
                                            
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-700 pb-3 mb-3 relative">
                                                
                                                <button onClick={() => handleDeleteRequest(req.id)} className="absolute -top-1 -right-1 text-slate-600 hover:text-red-500 bg-slate-900 p-1.5 rounded-lg border border-slate-700 transition-colors shadow-lg z-10" title="Delete Ghost Data Permanently">
                                                    <Trash2 size={16}/>
                                                </button>

                                                <div className="w-full sm:w-auto mb-2 sm:mb-0 flex-1">
                                                    <div className="flex gap-2 items-center">
                                                        <h4 className="font-black text-white uppercase text-xl flex items-center gap-2">
                                                            <MapPin size={16} className="text-orange-400"/> {req.branch}
                                                        </h4>
                                                        <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">{req.id} • REQ BY: {req.requestedByName || (req.requestedBy || "").split('@')[0]}</span>
                                                    </div>
                                                    <p className="text-[9px] text-slate-600 font-mono mt-0.5 mb-1.5">Time: {new Date(req.timestamp?.seconds*1000).toLocaleString()}</p>
                                                    {/* 🚀 THE FIX: LIST ALL ITEM DETAILS RIGHT ON THE CARD */}
                                                    <div className="text-[10px] text-slate-300 font-medium">
                                                        <span className="font-bold text-orange-400 mr-1">📦 {itemsToProcess.reduce((sum,i)=>sum+Number(i.qty),0)} Bks:</span> 
                                                        <span className="text-slate-400">{itemsToProcess.map(i => `${i.qty} ${i.name}`).join(', ')}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto pr-8 mt-2 sm:mt-0">
                                                    <StatusBadge status={req.status}/>
                                                    <div className="flex gap-2 w-full sm:w-auto">
                                                        <button onClick={() => setExpandedRequest(isExpanded ? null : req.id)} className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-2 rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors shadow-sm">
                                                            {isExpanded ? <XCircle size={14}/> : <Eye size={14}/>}
                                                            {isExpanded ? 'Tutup Track' : 'Lacak (OMS)'}
                                                        </button>
                                                        {req.status === 'PENDING' && (
                                                            <button onClick={() => handleStartFulfillment(req)} className="flex-1 sm:flex-none px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-1 shadow-lg active:scale-95 transition-all animate-pop-in">
                                                                <Truck size={14}/> Siapkan Pengiriman
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {isExpanded && <OrderTrackingModule order={req} />}
                                        </div>
                                    )
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}
            
            {/* ====== MODALS ====== */}
            {isProcessing && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm">
                    <div className="text-center p-6">
                        <Package className="text-blue-500 animate-bounce mx-auto mb-4" size={48}/>
                        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-widest">PROSES DATA...</h2>
                        <p className="text-slate-400 mt-2 text-xs uppercase tracking-widest animate-pulse">Sedang update database cloud...</p>
                    </div>
                </div>
            )}

            {/* FULFILLMENT MODAL (HQ ONLY) */}
            {isFulfilling && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[90] backdrop-blur-sm overflow-y-auto">
                    <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border-2 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.2)] flex flex-col max-h-[90vh] overflow-hidden mt-10 sm:mt-0">
                        
                        <div className="p-4 sm:p-6 border-b border-slate-700 bg-black/40 flex justify-between items-start gap-4 shrink-0">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-widest flex items-center gap-2 sm:gap-3 break-words">
                                    <Pencil className="text-blue-500 shrink-0"/> Siapkan Pengiriman Ke {isFulfilling.branch}
                                </h3>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Order ID: {isFulfilling.id}</p>
                            </div>
                            <button onClick={cancelFulfillment} className="text-slate-600 hover:text-white shrink-0"><XCircle size={24}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8">
                            
                            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 sm:p-5 shadow-inner">
                                <h4 className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><MapPin size={14}/> Destination Address</h4>
                                <p className="text-white text-sm sm:text-base font-black uppercase tracking-wider">{isFulfilling.branch} WAREHOUSE</p>
                                {isFulfilling.deliveryAddress ? (
                                    <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                                        {isFulfilling.deliveryAddress.jalan}<br/>
                                        Kec. {isFulfilling.deliveryAddress.kecamatan}, {isFulfilling.deliveryAddress.kabupaten}<br/>
                                        {isFulfilling.deliveryAddress.provinsi} - {isFulfilling.deliveryAddress.postalCode}
                                    </p>
                                ) : (
                                    <p className="text-xs text-red-400 italic mt-2 border border-red-500/30 bg-red-900/20 p-2 rounded inline-block">No detailed address provided by Branch.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Truck size={14}/> Wajib Diisi (TMS)</h4>
                                    <input type="text" placeholder="Nama Pengirim (Sender Name)" value={senderName} onChange={e => setSenderName(e.target.value)} className="w-full bg-black/50 border border-slate-600 rounded-xl p-3 sm:p-4 text-sm text-orange-400 font-bold outline-none focus:border-blue-500 transition-colors shadow-inner"/>
                                    <input type="text" placeholder="Logistic Company / Courier (e.g., J&T, Internal)" value={courierName} onChange={e => setCourierName(e.target.value)} className="w-full bg-black/50 border border-slate-600 rounded-xl p-3 sm:p-4 text-sm text-white font-bold outline-none focus:border-blue-500 transition-colors shadow-inner"/>
                                    <input type="text" placeholder="Nomor Resi / Tracking Number (Required)" value={trackingNo} onChange={e => setTrackingNo(e.target.value)} className="w-full bg-black/50 border border-blue-900/50 rounded-xl p-3 sm:p-4 text-sm text-blue-300 font-mono font-bold outline-none focus:border-blue-400 transition-colors shadow-inner uppercase tracking-wider"/>
                                    <div className="bg-black p-3 sm:p-4 rounded-xl border border-dashed border-red-500/50 text-red-400 text-xs flex gap-3 items-center leading-relaxed">
                                        <AlertCircle size={32} className="shrink-0"/>
                                        <p><strong className="uppercase block">Penting:</strong> Data di atas dan Foto Bukti di samping *wajib* diisi lengkap. Ini adalah Shopee/Tokopedia logic: Status Math tidak akan berubah sebelum paper trail pengiriman lengkap.</p>
                                    </div>
                                </div>

                                <div className="bg-black/50 p-4 sm:p-6 rounded-xl border border-slate-700 flex flex-col items-center shadow-xl">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Camera size={12}/> Wajib Upload: Foto Paket & Resi</h4>
                                    
                                    {packagePhotoPreview ? (
                                        <div className="w-full relative">
                                            <img src={packagePhotoPreview} alt="Package Proof" className="w-full h-40 sm:h-56 object-cover rounded-lg border-2 border-blue-500 shadow-inner"/>
                                            <button onClick={() => { setPackagePhotoFile(null); setPackagePhotoPreview(null); }} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 text-white hover:bg-red-500"><XCircle size={16}/></button>
                                        </div>
                                    ) : (
                                        <button onClick={() => photoInputRef.current.click()} className="w-full h-40 sm:h-56 bg-slate-800 rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-500 hover:border-blue-500 hover:text-blue-400 transition-colors gap-3 p-4 sm:p-6 text-center">
                                            <UploadCloud size={40} className="opacity-50"/>
                                            <span className="font-bold text-xs uppercase tracking-widest">Pilih Foto Bukti</span>
                                            <span className="text-[9px] text-slate-600 hidden sm:inline">Ambil foto paket yang sudah ada resinya.</span>
                                        </button>
                                    )}
                                    <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" />
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Pencil size={14} className="text-blue-500"/> Edit Barang Yang Dikirim (HQ can edit Qty)</h4>
                                <div className="space-y-3 bg-black/30 p-3 sm:p-4 rounded-2xl border border-slate-700">
                                    {fulfillmentCart.map(item => {
                                        const hqProduct = globalInventory.find(p => p.id === item.productId);
                                        const hqStock = hqProduct?.stock || 0;
                                        const hasEnough = hqStock >= item.qty;
                                        const requestedQty = (isFulfilling.requestedItems || isFulfilling.items || []).find(r => r.productId === item.productId)?.qty || 0;

                                        return (
                                            <div key={item.productId} className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                <div className="w-full sm:w-auto">
                                                    <span className="font-bold text-white uppercase text-sm">{item.name}</span>
                                                    <div className="flex gap-4 text-[10px] mt-1">
                                                        <span className="text-orange-400 font-bold uppercase tracking-widest">Diminta: {requestedQty} Bks</span>
                                                        <span className={`font-black ${hasEnough ? 'text-slate-500' : 'text-red-500'}`}>Stok HQ: {hqStock} Bks</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700 shadow-inner w-full sm:w-44">
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

                        <div className="no-print p-4 sm:p-6 border-t border-slate-700 bg-black/40 flex flex-col md:flex-row gap-3 mt-auto shrink-0 rounded-b-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.3)] relative z-20">
                            <button onClick={handleShipItems} disabled={isProcessing} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all relative">
                                {isProcessing ? <Clock className="animate-spin" size={18}/> : <Send size={20}/>}
                                KONFIRMASI DATA & KIRIM BARANG
                            </button>
                            <button onClick={handleRejectRequest} disabled={isProcessing} className="w-full md:w-auto px-6 bg-red-900/30 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 py-4 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                                <XCircle size={16}/> TOLAK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}