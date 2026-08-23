import React, { useState, useEffect, useRef } from 'react';
import { Package, ArrowRight, CheckCircle, XCircle, AlertCircle, Clock, Send, Truck, ShieldCheck, Globe, MapPin, Pencil, MinusCircle, PlusCircle, User, FileText, Camera, UploadCloud, ChevronDown, ChevronUp, Check, Eye, Trash2, Save, X } from 'lucide-react';
import { collection, doc, onSnapshot, writeBatch, serverTimestamp, updateDoc, deleteDoc, runTransaction, increment } from 'firebase/firestore';
import { savePhotoAndGetReference, compressImageToBase64 } from '../utils/helpers';
/* Reused rather than rewritten: a Firestore Timestamp, an offline `{seconds}` and an unresolved
   serverTimestamp() are three different shapes, and this already handles all three. */
import { txSeconds } from '../utils/dayStats.js';
import { confirmAction } from './ConfirmGate.jsx';
import { notify } from './Toast.jsx';

/* ===========================================================================
   THE ARRIVAL CHECK — a count at the door, PARTIAL BLIND.

   Before this existed, `handleConfirmReceipt` was one yes/no button and the
   branch was credited whatever HQ SAID it shipped. A short shipment therefore
   became branch stock that does not physically exist, and it only surfaced
   weeks later at Stock Opname — as a mystery shortage that looks like theft at
   the branch. Wrong person blamed, and by then the claim against HQ or the
   courier is long dead: the industry rule is that a discrepancy must be filed
   BEFORE a clean receipt is signed.

   PARTIAL BLIND, on Aldi's decision 2026-08-23: the receiver sees WHICH
   products should be in the box but never HOW MANY. Same rule Stock Opname
   already uses for tiers below 3 — a number on screen anchors the count.
   Not FULLY blind (no product list either) because these products carry no
   barcodes, so a hand-written list would spawn "Cello Coffee" and "cello kopi"
   as two different things inside a week. Keeping the line visible also catches
   a product that is missing ENTIRELY — the receiver types 0 against it, where
   a fully blind count would simply never write that line.
   =========================================================================== */

/* One row per shipped line. `counted` stays null while the box is blank, which
   is what `receiptBlocked` refuses on — a blank is NOT a zero, and treating it
   as one would silently write off a whole product. */
export const receiptLines = (items, counts) => (items || []).map(item => {
    const entry = (counts || {})[item.productId] || {};
    const counted = parseInt(entry.counted, 10);
    const damaged = parseInt(entry.damaged, 10);
    const shipped = Number(item.qty) || 0;
    const hasCount = Number.isFinite(counted);
    return {
        productId: item.productId,
        name: item.name,
        shipped,
        counted: hasCount ? counted : null,
        damaged: Number.isFinite(damaged) ? damaged : 0,
        diff: hasCount ? counted - shipped : null
    };
});

/* Returns the reason it cannot be submitted, or null when it can. Message, not
   a boolean, so the screen can NAME the problem instead of just going grey. */
export const receiptBlocked = (lines) => {
    if (!lines || lines.length === 0) return 'this shipment has no items on it';
    if (lines.some(l => l.counted === null)) return 'count every line before you submit';
    if (lines.some(l => l.counted < 0 || l.damaged < 0)) return 'a count cannot be negative';
    const over = lines.find(l => l.damaged > l.counted);
    if (over) return `${over.name}: damaged cannot be more than what arrived`;
    return null;
};

/* Any difference at all, or any damage, makes it a dispute. NO TOLERANCE HERE,
   deliberately — Stock Opname tolerates one pack because selling in Batang
   leaves stock carrying a fraction of a pack, but a sealed shipment has no such
   fraction. A box is short or it is not. */
export const receiptDisputed = (lines) => (lines || []).some(l => l.diff !== 0 || l.damaged > 0);

/* ===========================================================================
   HOW OLD IS THE STOCK STANDING HERE — the freshness chain, read-only.

   Scoped by Aldi 2026-08-23: *"we just system that only care about the data
   related stuff on the company, as long as the product is sold its job done,
   company can take care of the item management inside the warehouse our app
   didnt need that much details for now"*. So this REPORTS age. It does not
   enforce which box leaves first, it does not warn, it does not block a
   shipment, and it asks him for no threshold. Handling stock in the warehouse
   is the company's job; the app's job is knowing.

   ⚠️ NO NEW WRITE PATH, AND NOTHING NEW TO TYPE. Every arrival is already on
   the shipment record — `receivedItems` and `receivedAt`, written by the
   arrival check — so this is pure arithmetic over documents that already exist,
   and it works on shipments received before it was built.

   The trick that keeps it honest: what is still on hand is DERIVED by
   subtraction against `stock`, never tracked separately. `stock` stays the one
   source of truth, so the ages cannot drift away from it — correct the stock at
   a weekly count and the ages correct themselves in the same breath.
   =========================================================================== */

/* Every arrival of one product at one branch, NEWEST FIRST.
   `counted` is preferred over `shipped` because the branch was credited what it
   counted; falling back to the shipped figure covers deliveries received before
   the arrival check existed, which would otherwise vanish from the history. */
export const productArrivals = (orders, branch, productId) => (orders || [])
    .filter(o => o && o.branch === branch && (o.status === 'DELIVERED' || o.status === 'DISPUTED'))
    .map(o => {
        const line = (o.receivedItems || []).find(r => r.productId === productId);
        const fallback = (o.fulfilledItems || o.requestedItems || o.items || [])
            .find(i => i.productId === productId);
        const qty = line ? Number(line.counted) - Number(line.damaged || 0)
                  : fallback ? Number(fallback.qty) : 0;
        return { orderId: o.id, at: txSeconds({ timestamp: o.receivedAt }), qty: Number(qty) || 0 };
    })
    .filter(a => a.qty > 0 && a.at != null)
    .sort((a, b) => b.at - a.at);

/* Which of those arrivals is still standing here, OLDEST FIRST.
   Walks newest-first spending the quantity on hand, so whatever the total does
   not stretch to is treated as long gone. `unexplained` is the remainder the
   records cannot account for — stock that arrived before any of this was
   recorded, or that came in some other way. It is reported rather than hidden:
   a age built on a number that does not add up is worse than no age at all. */
export const arrivalsOnHand = (arrivals, stock) => {
    let left = Math.max(0, Number(stock) || 0);
    const held = [];
    for (const a of (arrivals || [])) {
        if (left <= 0) break;
        const take = Math.min(left, a.qty);
        held.push({ ...a, qty: take });
        left -= take;
    }
    return { held: held.reverse(), unexplained: left };
};

/* Whole days since the oldest stock still standing here arrived. null when the
   records cannot say — never 0, because "brand new" and "we do not know" must
   not look the same. */
export const oldestStockDays = (held, nowSeconds) => {
    if (!held || held.length === 0) return null;
    const at = held[0].at;
    if (at == null) return null;
    return Math.max(0, Math.floor((nowSeconds - at) / 86400));
};

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

    /* the arrival check. `receivingOrder` holds the order being counted; the
       counts live beside it keyed by productId so closing the panel throws the
       numbers away rather than half-writing them. */
    const [receivingOrder, setReceivingOrder] = useState(null);
    const [receiptCounts, setReceiptCounts] = useState({});

    /* Kept as the typed STRING, never coerced here. Coercing on every keystroke
       turns a half-typed "" into 0, and a 0 is a real answer — it would let a
       blank line pass the "count every line" guard. */
    const setReceiptCount = (productId, field, value) => setReceiptCounts(prev => ({
        ...prev, [productId]: { ...(prev[productId] || {}), [field]: value }
    }));

    /* Which branch HQ is looking at. Empty until it picks — an owner who lands on a
       branch he did not choose reads the numbers as company-wide. */
    const [viewBranch, setViewBranch] = useState('');

    /* Every branch that has ever asked HQ for stock, which is every branch that has any.
       Derived from the requests already on screen rather than read separately: there is no
       branch registry in this app, and inventing one to power a dropdown would be a second
       list to keep true. */
    const branchesSeen = [...new Set((requests || []).map(r => r && r.branch).filter(Boolean))].sort();

    /* ONE card, drawn the same way for the branch admin and for HQ. The age line below is the
       whole reason HQ needed this view, so it must not be a second copy that drifts. */
    const stockCard = (item) => {
        const arrivals = productArrivals(requests, isAreaAdmin ? branchLocation : viewBranch, item.productId || item.id);
        const { held, unexplained } = arrivalsOnHand(arrivals, item.stock);
        const days = oldestStockDays(held, Math.floor(Date.now() / 1000));
        return (
            <div key={item.id} className="bg-black/40 p-3 sm:p-4 rounded-xl border border-line-2 shadow-inner">
                <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-white uppercase text-sm truncate">{item.name}</span>
                    <span className="text-lg font-black text-gold shrink-0">{item.stock} <span className="text-[10px] text-ink-muted font-bold">Bks</span></span>
                </div>
                {(days !== null || unexplained > 0) && (
                    <details className="group/age mt-2 pt-2 border-t border-line-2">
                        <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest text-ink-muted hover:text-ink">
                            <span className="tabular-nums">
                                {days !== null
                                    ? <>Paling lama di sini <b className="text-ink font-black">{days} hari</b></>
                                    : <>Umur belum tercatat</>}
                                {held.length > 1 && <span className="text-ink-muted"> · {held.length} kiriman</span>}
                            </span>
                            <ChevronDown size={12} className="group-open/age:rotate-180 transition-transform shrink-0"/>
                        </summary>
                        <div className="mt-2 space-y-1">
                            {held.map(h => (
                                <div key={h.orderId} className="flex justify-between gap-2 text-[10px] font-mono tabular-nums text-ink-muted">
                                    <span>{new Date(h.at * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                                    <span className="truncate opacity-60">{h.orderId}</span>
                                    <span className="text-ink font-bold shrink-0">{h.qty} Bks</span>
                                </div>
                            ))}
                            {/* Said out loud rather than hidden. Stock the shipment records cannot
                                account for is older than the records themselves — pretending it is
                                part of the newest delivery would make the age read younger than it is. */}
                            {unexplained > 0 && (
                                <div className="flex justify-between gap-2 text-[10px] font-mono tabular-nums text-ink-muted border-t border-line-2 pt-1 mt-1">
                                    <span className="italic">sebelum ada catatan</span>
                                    <span className="text-ink font-bold shrink-0">{unexplained} Bks</span>
                                </div>
                            )}
                        </div>
                    </details>
                )}
            </div>
        );
    };

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
        }, (err) => { console.warn("Restock requests listener:", err.code); setIsLoading(false); });

        /* Which warehouse's shelf to watch. The branch admin gets their own and has no choice;
           HQ gets whichever one it picked, and nothing until it picks — Aldi, 2026-08-23:
           *"i think tier 1 also need to see regional warehouse components that only regional
           admin could see because me as tier 1 cant see that"*. He owns the company and could
           not see his own branches' shelves. */
        const watching = isAreaAdmin ? branchLocation : viewBranch;
        let unsubStock = () => {};
        if (watching && watching !== 'UNASSIGNED') {
            const stockRef = collection(db, `artifacts/${appId}/users/${masterUserId}/branches/${watching}/inventory`);
            unsubStock = onSnapshot(stockRef, (snap) => {
                setBranchStock(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }, (err) => console.warn("Branch inventory listener:", err.code));
        } else {
            /* Cleared, not left behind. Switching branch must never show the previous
               branch's shelf under the new branch's name. */
            setBranchStock([]);
        }

        return () => { unsubReq(); unsubStock(); };
    }, [db, appId, masterUserId, isAreaAdmin, branchLocation, viewBranch]);

    const handleAddToCart = () => {
        if (!selectedProduct || !requestQty || Number(requestQty) <= 0) return notify("Select a product and valid quantity.");
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
            return notify("ALAMAT TIDAK LENGKAP!\n\nMohon lengkapi data alamat pengiriman (Jalan, Kecamatan, Kabupaten, Provinsi) agar HQ dapat memproses pengiriman.");
        }

        if (!await confirmAction(`Submit stock request to HQ for ${branchLocation}?`)) return;
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
            notify("Failed to submit request: " + e.message);
            setIsProcessing(false);
        }
    };

    // 🚀 THE FIX: TRANSACTION READ BEFORE WRITE ENGINE 🚀
    const handleConfirmReceipt = async (order, lines) => {
        const blocked = receiptBlocked(lines);
        if (blocked) return notify(`BELUM BISA DISIMPAN\n\n${blocked}.`);

        const disputed = receiptDisputed(lines);
        const summary = lines
            .filter(l => l.diff !== 0 || l.damaged > 0)
            .map(l => `• ${l.name}: dikirim ${l.shipped}, diterima ${l.counted}${l.damaged > 0 ? `, rusak ${l.damaged}` : ''}`)
            .join('\n');

        const question = disputed
            ? `SELISIH DITEMUKAN — ${order.id}\n\n${summary}\n\nStok gudang ${branchLocation} akan bertambah sesuai HITUNGAN ANDA, bukan angka kiriman HQ, dan selisih ini dilaporkan ke HQ. Lanjutkan?`
            : `Semua cocok — ${order.id}\n\nBarang masuk ke gudang ${branchLocation}. Lanjutkan?`;

        if (!await confirmAction(question)) return;
        setIsProcessing(true);

        try {
            await runTransaction(db, async (t) => {
                // --- PHASE 1: EXECUTE ALL READS ---

                // 1. Read Order Document
                const orderRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, order.id);
                const orderSnap = await t.get(orderRef);
                if (!orderSnap.exists()) throw new Error("Order not found in database!");
                const orderData = orderSnap.data();

                /* 2. REFUSE A SECOND CREDIT. Read inside the transaction, not from
                   the `order` prop — the prop is a snapshot from the listener and a
                   second tap can reach here before it refreshes. Without this, two
                   taps credited the branch twice and invented stock out of nothing. */
                if (orderData.status === 'DELIVERED' || orderData.status === 'DISPUTED') {
                    throw new Error("Kiriman ini sudah diterima. Stok tidak ditambah dua kali.");
                }

                // 3. Read All Branch Inventory Documents
                const inventorySnaps = await Promise.all(lines.map(async (line) => {
                    const branchItemRef = doc(db, `artifacts/${appId}/users/${masterUserId}/branches/${order.branch}/inventory`, line.productId);
                    const snap = await t.get(branchItemRef);
                    return { ref: branchItemRef, snap, line };
                }));

                // --- PHASE 2: EXECUTE ALL WRITES ---

                /* 1. Write to Branch Inventory. THE WHOLE POINT OF THIS SCREEN IS
                   THIS LINE: the branch is credited what it COUNTED, never what HQ
                   claimed to have sent. Damaged units arrived, so they are real
                   stock — they just are not sellable, and go to `damagedStock`
                   exactly as Stock Opname already models them. */
                inventorySnaps.forEach(({ ref, snap, line }) => {
                    const current = snap.exists() ? snap.data() : {};
                    const good = line.counted - line.damaged;
                    t.set(ref, {
                        productId: line.productId,
                        name: line.name,
                        stock: (current.stock || 0) + good,
                        damagedStock: (current.damagedStock || 0) + line.damaged,
                        lastReceivedAt: serverTimestamp(),
                        lastReceivedFrom: order.id
                    }, { merge: true });
                });

                // 2. Write Order Update
                const receiverName = user.displayName || (user.email || "").split('@')[0];
                const updatedTimeline = [...(orderData.workflowTimeline || [])];
                updatedTimeline.push({
                    status: disputed ? 'DISPUTED' : 'DELIVERED',
                    time: new Date().toISOString(),
                    msg: disputed
                        ? `Dihitung ulang oleh ${receiverName} di gudang — ADA SELISIH:\n${summary}`
                        : `Dihitung oleh ${receiverName} di gudang — jumlah cocok dengan kiriman.`
                });

                t.update(orderRef, {
                    status: disputed ? 'DISPUTED' : 'DELIVERED',
                    /* what actually arrived, line by line, kept beside what was sent.
                       This is the OS&D record — the evidence a claim is made from. */
                    receivedItems: lines.map(l => ({
                        productId: l.productId, name: l.name,
                        shipped: l.shipped, counted: l.counted, damaged: l.damaged, diff: l.diff
                    })),
                    receiptVariance: disputed,
                    receivedAt: serverTimestamp(),
                    receivedBy: user.email,
                    workflowTimeline: updatedTimeline
                });
            });

            if (disputed) {
                notify(`SELISIH DILAPORKAN KE HQ\n\nGudang ${branchLocation} dikredit sesuai hitungan Anda. HQ melihat kiriman ${order.id} sebagai bersengketa.`);
                logAudit("STOCK_RECEIVE_VARIANCE", `${branchLocation} reported a variance on ${order.id}: ${summary.replace(/\n/g, ' | ')}`);
            } else {
                triggerCapy(`${branchLocation} Inventory updated! Thank you. ✅`);
                logAudit("STOCK_RECEIVE", `${branchLocation} confirmed receipt of ${order.id}`);
            }
            setReceivingOrder(null);
            setReceiptCounts({});
            setIsProcessing(false);
        } catch(e) {
            console.error(e);
            notify("Error confirming receipt: " + e.message);
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
        if (!await confirmAction(`Reject this request from ${isFulfilling.branch}?`)) return;
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
        } catch (e) { notify("Failed to reject: " + e.message); setIsProcessing(false); }
    };

    const handleShipItems = async () => {
        if (!isFulfilling) return;
        if (!courierName || !trackingNo || !packagePhotoFile || !senderName) {
            return notify("INSUFFICIENT DATA!\n\nTo fulfill this shipment, you must provide:\n1. Nama Pengirim\n2. Logistic Company / Courier\n3. Nomor Resi (Tracking #)\n4. Proof of Sending Photo");
        }
        if (fulfillmentCart.some(item => Number(item.qty) <= 0)) return notify("Qty must be greater than 0.");

        if (!await confirmAction(`Confirm fulfillment & ship items to ${isFulfilling.branch}?\n\nThis will permanently deduct stock from HQ Master Vault.`)) return;
        setIsProcessing(true);

        try {
            const batch = writeBatch(db);

            for (const item of fulfillmentCart) {
                const hqProduct = globalInventory.find(p => p.id === item.productId);
                if (!hqProduct || (hqProduct.stock || 0) < item.qty) {
                    setIsProcessing(false);
                    return notify(`INSUFFICIENT HQ STOCK!\n\nYou cannot ship this. HQ Vault is missing ${item.qty - (hqProduct?.stock || 0)} ${item.unit} of ${item.name}. Please edit the fulfillment qty.`);
                }
            }

            triggerCapy("Compressing Photo & Syncing Database... ⏳");
            const base64Photo = await compressImageToBase64(packagePhotoFile);
            const photoPath = `artifacts/${appId}/users/${masterUserId}/photos/shipment_${isFulfilling.id}_${Date.now()}.jpg`;
            const photoUrl = await savePhotoAndGetReference(storage, base64Photo, photoPath, appSettings?.usePhotoStorage);

            /* 🚀 FIX: ship the DIFFERENCE, not a recomputed total. This wrote
               (the number my screen was showing) - (what I am shipping), and the number the
               screen was showing was read before the two long waits above — compressing the
               package photo and uploading it, which on a phone is seconds and sometimes minutes.
               Anything sold in that gap was silently undone: HQ holds 500, a salesman sells 120
               while the photo uploads, shipping 100 wrote 400 instead of 280 and the 120 sold
               packs came back from the dead, permanently. increment() applies the deduction
               server-side against whatever the stock really is when the write lands.

               ponytail: the over-ship guard above still reads the screen's copy, so it stays
               best-effort — a sale during the gap can now drive stock slightly negative instead
               of silently inflating it. That failure is visible and self-correcting; the old one
               was neither. Make it exact by moving the check into a runTransaction if it ever
               bites. */
            for (const item of fulfillmentCart) {
                const hqRef = doc(db, `artifacts/${appId}/users/${masterUserId}/products`, item.productId);
                batch.update(hqRef, { stock: increment(-Number(item.qty)) });
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
            notify("Shipment failed: " + e.message);
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
        if (!editCourier || !editTrackingNo || !editSenderName) return notify("Sender Name, Logistic Company, and Tracking No are required.");
        
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
            notify("Failed to edit record: " + e.message);
            setIsProcessingOrder(false);
        }
    };

    const handleDeleteRequest = async (orderId) => {
        if (!await confirmAction(`⚠️ WARNING: DELETE RECORD?\n\nAre you sure you want to permanently delete Order: ${orderId}?\n\nNote: This only deletes the history paper-trail. It will NOT automatically refund or reverse warehouse math.`)) return;
        
        setIsProcessing(true);
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, orderId));
            triggerCapy(`Record ${orderId} deleted permanently. 🗑️`);
            logAudit("STOCK_DELETE_LOG", `Admin deleted request ${orderId}`);
            setIsProcessing(false);
        } catch(e) {
            notify("Failed to delete record: " + e.message);
            setIsProcessing(false);
        }
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            'PENDING': 'bg-raised text-orange border border-orange/50',
            'REJECTED': 'bg-danger-well text-danger-text border border-danger/50',
            'IN_TRANSIT': 'bg-raised text-gold border border-gold/50 animate-pulse',
            'DELIVERED': 'bg-verified-fill text-verified border border-verified/50',
            /* DISPUTED is a real outcome, not a failure — the goods ARE in the
               warehouse and the count IS filed. Red because HQ still owes an
               answer, never grey: a grey chip reads as "nothing to do here". */
            'DISPUTED': 'bg-danger-well text-danger-text border border-danger/50',
            'SYSTEM_EDIT': 'bg-raised text-ink-muted border border-line-3',
        };
        const icons = {
            'PENDING': <Clock size={12}/>,
            'REJECTED': <XCircle size={12}/>,
            'IN_TRANSIT': <Truck size={12}/>,
            'DELIVERED': <CheckCircle size={12}/>,
            'DISPUTED': <AlertCircle size={12}/>,
            'SYSTEM_EDIT': <Pencil size={12}/>,
        };
        const labels = {
            'PENDING': 'Menunggu Konfirmasi',
            'REJECTED': 'Ditolak',
            'IN_TRANSIT': 'Dalam Pengiriman',
            'DELIVERED': 'Diterima',
            'DISPUTED': 'Diterima — Ada Selisih',
            'SYSTEM_EDIT': 'Sistem Edit',
        }
        return (
            <span className={`text-[11px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1.5 shadow-inner ${styles[status] || 'bg-raised'} whitespace-nowrap`}>
                {icons[status] || null} {labels[status] || status}
            </span>
        );
    };

    const OrderTrackingModule = ({ order }) => {
        /* DISPUTED counts as delivered: the goods are physically in the warehouse
           and the count is filed. What is still open is HQ's answer, not the
           receipt — so the receive button must not come back and offer a second
           credit. */
        const isDelivered = order.status === 'DELIVERED' || order.status === 'DISPUTED';
        const isFulfillableByTier3 = isAreaAdmin && order.status === 'IN_TRANSIT';

        return (
            <div className="bg-black/50 rounded-2xl border border-line-2 p-4 sm:p-6 animate-fade-in mt-2 mb-4">
                <div className="flex flex-col lg:flex-row gap-6 mb-8 border-b border-line-2 pb-6">
                    <div className="flex-1 bg-panel p-4 sm:p-5 rounded-xl border border-line-2 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Truck size={80} className="text-gold"/></div>
                        
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Informasi Pengiriman (TMS)</h4>
                            {isAdmin && (order.status === 'IN_TRANSIT' || order.status === 'DELIVERED') && (
                                <button onClick={(e) => { e.stopPropagation(); handleStartEditingOrder(order); }} className="text-[11px] bg-raised hover:bg-line-2 text-gold px-2 py-1 rounded border border-line-3 font-bold uppercase flex items-center gap-1 transition-colors relative z-10 shadow-lg">
                                    <Pencil size={10}/> Edit Data
                                </button>
                            )}
                        </div>

                        {order.status === 'PENDING' ? (
                            <div className="text-center py-5 text-ink-muted italic text-xs relative z-10">Menunggu HQ Mempersiapkan Barang...</div>
                        ) : order.status === 'REJECTED' ? (
                            <div className="text-center py-5 text-danger-text font-bold text-xs uppercase tracking-widest relative z-10">PERMINTAAN DITOLAK HQ</div>
                        ) : (
                            <div className="space-y-2.5 relative z-10">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm gap-1 sm:gap-0">
                                    <span className="text-ink-muted flex items-center gap-2"><User size={14}/> Dikirim Oleh (Sender)</span>
                                    <span className="font-bold text-orange uppercase">{order.senderName || order.fulfilledBy?.split('@')[0] || 'HQ Admin'}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm gap-1 sm:gap-0">
                                    <span className="text-ink-muted flex items-center gap-2"><Truck size={14}/> Logistic Company</span>
                                    <span className="font-bold text-white uppercase">{order.courier || 'N/A'}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm gap-1 sm:gap-0">
                                    <span className="text-ink-muted flex items-center gap-2"><FileText size={14}/> No. Resi</span>
                                    <span className="font-bold text-gold uppercase font-mono tracking-wider bg-black/50 px-2 py-0.5 rounded border border-line-2 self-start sm:self-auto">{order.trackingNo || 'N/A'}</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Opens the arrival check. The count panel itself is rendered OUTSIDE
                            this component on purpose — `OrderTrackingModule` is declared inside
                            `BranchWarehouseManager`, so it is a new function on every render and
                            React remounts it. An input living in here would lose focus after
                            every single keystroke. */}
                        {isFulfillableByTier3 && (
                            <button onClick={() => { setReceivingOrder(order); setReceiptCounts({}); }} disabled={isProcessing} className="w-full mt-5 py-3.5 bg-gold hover:bg-gold/90 text-gold-ink rounded-lg font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 relative z-10">
                                <Package size={18}/>
                                HITUNG & TERIMA BARANG
                            </button>
                        )}
                        {isDelivered && (
                            <div className={`mt-5 py-3 rounded-lg text-center text-xs font-bold flex items-center justify-center gap-2 relative z-10 border ${order.receiptVariance ? 'bg-danger-well border-danger/50 text-danger-text' : 'bg-verified-fill border-verified/50 text-verified'}`}>
                                {order.receiptVariance
                                    ? <><AlertCircle size={16}/> Diterima dengan Selisih — Dilaporkan ke HQ</>
                                    : <><Check size={16}/> Barang Sudah Diterima Branch</>}
                            </div>
                        )}
                        {/* What actually arrived, beside what was sent. This is the OS&D record:
                            the evidence the branch argues a claim from, so it stays on the card
                            forever rather than living only in the timeline text. */}
                        {isDelivered && Array.isArray(order.receivedItems) && order.receivedItems.length > 0 && (
                            <div className="mt-3 bg-black/40 rounded-lg border border-line-2 p-3 relative z-10">
                                <h5 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2">Hasil Hitung di Gudang</h5>
                                <div className="space-y-1.5">
                                    {order.receivedItems.map(r => (
                                        <div key={r.productId} className="flex justify-between items-center gap-3 text-[11px]">
                                            <span className="text-ink font-bold uppercase truncate">{r.name}</span>
                                            <span className="font-mono shrink-0 tabular-nums">
                                                <span className="text-ink-muted">{r.shipped}</span>
                                                <span className="text-ink-muted mx-1">→</span>
                                                <span className={r.diff === 0 ? 'text-ink' : 'text-danger-text font-black'}>{r.counted}</span>
                                                {r.diff !== 0 && <span className="text-danger-text font-black ml-1">({r.diff > 0 ? '+' : ''}{r.diff})</span>}
                                                {r.damaged > 0 && <span className="text-danger-text ml-2">rusak {r.damaged}</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-full lg:w-56 shrink-0 bg-panel p-3 rounded-xl border border-line-2 shadow-xl flex flex-col items-center relative z-10">
                        <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Bukti Pengiriman (HQ)</h4>
                        {order.packagePhotoUrl ? (
                            <a href={order.packagePhotoUrl} target="_blank" rel="noreferrer" className="block group w-full">
                                <img src={order.packagePhotoUrl} alt="Shipment Proof" className="w-full h-40 object-cover rounded-lg border-2 border-line-2 group-hover:border-gold transition-colors shadow-inner" />
                                <span className="text-[11px] text-ink-muted mt-1 block text-center uppercase tracking-widest group-hover:text-gold">Click to Enlarge <Eye size={10} className="inline ml-1"/></span>
                            </a>
                        ) : (
                            <div className="w-full h-40 bg-black/30 rounded-lg border border-dashed border-line-2 flex flex-col items-center justify-center text-ink-muted text-[10px] text-center p-4">
                                <Camera size={24} className="mb-2 opacity-30"/>
                                Awaiting HQ Photo Proof
                            </div>
                        )}
                    </div>
                </div>

                <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-5">History Order Timeline</h4>
                <div className="space-y-6 relative pl-6">
                    <div className="absolute left-[7px] top-1 bottom-1 w-[2px] bg-raised"></div> 
                    {(order.workflowTimeline || []).map((ev, idx) => {
                        const isLatest = idx === order.workflowTimeline.length - 1;
                        let circleColor = isLatest ? 'bg-gold shadow-[0_0_10px_rgba(212,175,55,0.6)]' : 'bg-line-3';
                        if (ev.status === 'SYSTEM_EDIT') circleColor = 'bg-line-3';
                        
                        return (
                            <div key={idx} className="flex gap-4 relative">
                                <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${circleColor} relative z-10 border-2 border-line`}></div>
                                <div>
                                    <p className={`font-bold text-xs uppercase tracking-wider ${isLatest ? 'text-gold' : 'text-ink'} ${ev.status === 'SYSTEM_EDIT' ? 'text-ink-muted' : ''}`}>{ev.status}</p>
                                    <p className={`text-sm font-medium ${isLatest ? 'text-white' : 'text-ink-muted'} mt-0.5 whitespace-pre-line`}>{ev.msg}</p>
                                    <p className="text-[10px] text-ink-muted font-mono mt-1">
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
                        {isAdmin ? <ShieldCheck className="text-orange shrink-0" size={32}/> : <Globe className="text-gold shrink-0" size={32}/>}
                        <span className="leading-tight">{isAdmin ? 'Global Logistics Command' : `${branchLocation} Hub Logistics`}</span>
                    </h2>
                    <p className="text-[10px] text-ink-muted uppercase tracking-widest mt-2 flex items-center gap-2 flex-wrap">
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
                            <summary className="bg-raised/50 p-4 sm:p-5 rounded-2xl border border-line-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-raised transition-colors flex justify-between items-center shadow-lg">
                                <h3 className="text-base sm:text-lg font-black text-gold uppercase tracking-widest flex items-center gap-2"><MapPin size={20}/> My Current Branch Inventory</h3>
                                <ChevronDown size={20} className="text-ink-muted group-open:rotate-180 transition-transform shrink-0"/>
                            </summary>
                            <div className="p-3 sm:p-4 bg-black/30 rounded-xl mt-3 border border-line-2 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-slide-down">
                                {branchStock.length === 0 ? (
                                    <div className="col-span-full text-center p-8 bg-black/20 rounded-xl border border-dashed border-line-2 text-ink-muted text-xs uppercase tracking-widest">
                                        Warehouse is empty. Request stock from HQ using the form below.
                                    </div>
                                ) : branchStock.map(stockCard)}
                            </div>
                        </details>

                        <div className="bg-raised/50 p-4 sm:p-6 rounded-2xl border border-line-2 flex-1 flex flex-col shadow-lg">
                            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2"><Truck size={20}/> Status Pengiriman & Reorder</h3>
                            
                            {isLoading ? (
                                <div className="text-center p-10 text-ink-muted animate-pulse italic text-xs uppercase tracking-widest">Loading Logistics Logs...</div>
                            ) : requests.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-line-2 rounded-xl bg-black/20">
                                    <Package size={48} className="text-line-3 mb-3 opacity-50"/>
                                    <p className="text-ink-muted font-bold text-sm">No reorder history found for {branchLocation}.</p>
                                    <p className="text-ink-muted text-[10px] mt-1 uppercase tracking-widest">Submit a new request using the form.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* ===== THE ARRIVAL CHECK =====
                                        Lives out here, not inside OrderTrackingModule, because that
                                        component is redeclared every render and its children remount —
                                        an input in there would lose focus on every keystroke. */}
                                    {receivingOrder && (() => {
                                        const items = receivingOrder.fulfilledItems || receivingOrder.requestedItems || receivingOrder.items || [];
                                        const lines = receiptLines(items, receiptCounts);
                                        const blocked = receiptBlocked(lines);
                                        const disputed = receiptDisputed(lines);
                                        const counted = lines.filter(l => l.counted !== null).length;

                                        return (
                                            <div className="bg-panel rounded-2xl border border-gold/60 p-4 sm:p-5 shadow-2xl">
                                                <div className="flex justify-between items-start gap-3 border-b border-line-2 pb-3 mb-4">
                                                    <div className="min-w-0">
                                                        <h4 className="text-xs font-black text-gold uppercase tracking-widest flex items-center gap-2"><Package size={14}/> Hitung Barang Datang</h4>
                                                        <p className="text-[10px] text-ink-muted font-mono tracking-widest uppercase mt-1 truncate">{receivingOrder.id}</p>
                                                    </div>
                                                    <button onClick={() => { setReceivingOrder(null); setReceiptCounts({}); }} className="text-ink-muted hover:text-white shrink-0 p-1"><X size={18}/></button>
                                                </div>

                                                {/* Says WHY the number is missing. Without this line the screen
                                                    just looks broken, and a counter who thinks it is broken goes
                                                    looking for the surat jalan — which is the one thing this
                                                    whole screen exists to keep out of their hands. */}
                                                <div className="bg-raised border border-line-3 rounded-lg p-3 mb-4 text-[11px] text-ink-muted leading-relaxed">
                                                    <span className="font-black text-ink uppercase tracking-widest block mb-1">Hitung dulu, jangan lihat surat jalan.</span>
                                                    Jumlah kiriman HQ sengaja disembunyikan sampai Anda selesai menghitung. Isi apa yang benar-benar ada di dalam kardus. Kalau satu produk tidak ada sama sekali, tulis <span className="font-black text-ink">0</span>.
                                                </div>

                                                <div className="space-y-3">
                                                    {lines.map(line => {
                                                        const entry = receiptCounts[line.productId] || {};
                                                        const bad = line.counted !== null && line.damaged > line.counted;
                                                        return (
                                                            <div key={line.productId} className={`rounded-xl border p-3 ${bad ? 'border-danger/60 bg-danger-well' : 'border-line-2 bg-black/40'}`}>
                                                                <p className="text-[11px] font-black text-ink uppercase tracking-wide mb-2.5 break-words">{line.name}</p>
                                                                <div className="grid grid-cols-2 gap-2.5">
                                                                    <label className="block">
                                                                        <span className="text-[9px] font-bold text-ink-muted uppercase tracking-widest block mb-1">Diterima (Bks)</span>
                                                                        <input
                                                                            type="number" inputMode="numeric" min="0" placeholder="—"
                                                                            value={entry.counted ?? ''}
                                                                            onChange={e => setReceiptCount(line.productId, 'counted', e.target.value)}
                                                                            className="w-full bg-black/50 border border-line-3 rounded-lg p-2.5 text-center font-black text-lg text-gold outline-none focus:border-gold tabular-nums"
                                                                        />
                                                                    </label>
                                                                    <label className="block">
                                                                        <span className="text-[9px] font-bold text-ink-muted uppercase tracking-widest block mb-1">Rusak (Bks)</span>
                                                                        <input
                                                                            type="number" inputMode="numeric" min="0" placeholder="0"
                                                                            value={entry.damaged ?? ''}
                                                                            onChange={e => setReceiptCount(line.productId, 'damaged', e.target.value)}
                                                                            className="w-full bg-black/50 border border-line-3 rounded-lg p-2.5 text-center font-black text-lg text-danger-text outline-none focus:border-danger tabular-nums"
                                                                        />
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="mt-4 pt-3 border-t border-line-2">
                                                    <p className="text-[10px] text-ink-muted uppercase tracking-widest text-center mb-3 tabular-nums">{counted} dari {lines.length} produk sudah dihitung</p>
                                                    {blocked ? (
                                                        <div className="py-3 px-3 rounded-lg bg-raised border border-line-3 text-center text-[11px] font-bold text-ink-muted uppercase tracking-wide">{blocked}</div>
                                                    ) : (
                                                        <button onClick={() => handleConfirmReceipt(receivingOrder, lines)} disabled={isProcessing}
                                                            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm ${disputed ? 'bg-danger text-ink-inverse hover:bg-danger/90' : 'bg-gold text-gold-ink hover:bg-gold/90'}`}>
                                                            {isProcessing ? <Clock size={18} className="animate-spin"/> : disputed ? <AlertCircle size={18}/> : <Check size={18}/>}
                                                            {disputed ? 'Simpan & Laporkan Selisih' : 'Simpan — Jumlah Cocok'}
                                                        </button>
                                                    )}
                                                    {/* Tells them a difference was found WITHOUT naming it. The size of
                                                        the gap is HQ's to see; a counter who knows they are 5 short is
                                                        a counter who "finds" 5 more. */}
                                                    {!blocked && disputed && (
                                                        <p className="text-[10px] text-danger-text uppercase tracking-widest text-center mt-2 font-bold">Hitungan Anda tidak sama dengan kiriman HQ</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {requests.map(req => {
                                        const isExpanded = expandedRequest === req.id;
                                        const itemsToProcess = req.fulfilledItems || req.requestedItems || req.items || [];
                                        
                                        return (
                                            <div key={req.id} className={`p-3 sm:p-4 rounded-2xl border transition-colors ${isExpanded ? 'bg-panel border-line-3 shadow-2xl' : 'bg-black/40 border-line-2 hover:bg-raised'}`}>
                                                
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-line-2 pb-3 mb-3">
                                                    <div className="w-full sm:w-auto mb-2 sm:mb-0">
                                                        <span className="text-[10px] text-ink-muted font-mono tracking-widest uppercase block truncate">{req.id} • REQ BY: {req.requestedByName || (req.requestedBy || "").split('@')[0]}</span>
                                                        <p className="text-[11px] text-ink-muted font-mono mt-0.5 mb-1.5">Time: {new Date(req.timestamp?.seconds*1000).toLocaleString()}</p>
                                                        {/* 🚀 THE FIX: LIST ALL ITEM DETAILS RIGHT ON THE CARD
                                                            ...EXCEPT THE QUANTITIES, WHILE THE BOX IS STILL IN TRANSIT.
                                                            The arrival check is partial blind: a number printed here would
                                                            anchor the count at the door and the whole check becomes a
                                                            rubber stamp. Product names stay — they are what makes a
                                                            missing product countable as 0 instead of invisible. Every
                                                            figure comes back the moment the count is filed, because that
                                                            is when the branch needs them to argue a claim. */}
                                                        <div className="text-[10px] text-ink font-medium">
                                                            {req.status === 'IN_TRANSIT' ? (
                                                                <>
                                                                    <span className="font-bold text-orange mr-1">📦 {itemsToProcess.length} JENIS BARANG:</span>
                                                                    <span className="text-ink-muted">{itemsToProcess.map(i => i.name).join(', ')}</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="font-bold text-orange mr-1">📦 {itemsToProcess.reduce((sum,i)=>sum+Number(i.qty),0)} Bks:</span>
                                                                    <span className="text-ink-muted">{itemsToProcess.map(i => `${i.qty} ${i.name}`).join(', ')}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                                                        <StatusBadge status={req.status}/>
                                                        <button onClick={() => setExpandedRequest(isExpanded ? null : req.id)} className="bg-raised hover:bg-line-2 text-ink-muted hover:text-white p-2.5 rounded-lg flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors shadow-sm ml-auto sm:ml-0">
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
                    <div className="bg-panel p-4 sm:p-6 rounded-2xl border border-gold/30 shadow-xl relative flex flex-col w-full h-fit">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-1 relative z-10">Reorder Stock</h3>
                        <p className="text-[10px] text-gold uppercase tracking-widest mb-6 relative z-10">Request stock from HQ Master Vault.</p>
                        
                        <div className="flex flex-col gap-4 mb-6 relative z-10">
                            {/* ITEM SELECTOR */}
                            <div className="bg-black/30 p-3 sm:p-4 rounded-xl border border-line-2">
                                <label className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">1. Select Items to Request</label>
                                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white font-bold outline-none focus:border-gold transition-colors mb-3">
                                    <option value="">-- Choose Product --</option>
                                    {globalInventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <div className="grid grid-cols-[1fr,auto] gap-2 w-full">
                                    <input type="number" min="1" placeholder="Qty (Bks)" value={requestQty} onChange={e => setRequestQty(e.target.value)} className="w-full bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white font-bold outline-none focus:border-gold text-center transition-colors"/>
                                    <button onClick={handleAddToCart} className="bg-gold hover:bg-gold/90 text-gold-ink px-4 font-bold uppercase tracking-widest rounded-lg shadow-lg shrink-0 whitespace-nowrap text-xs transition-colors flex items-center justify-center gap-1.5">
                                        <PlusCircle size={14}/> Add
                                    </button>
                                </div>
                            </div>

                            {/* ADDRESS INPUTS */}
                            <div className="bg-black/30 p-3 sm:p-4 rounded-xl border border-line-2">
                                <label className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-2 flex items-center gap-1"><MapPin size={12}/> 2. Detail Alamat Pengiriman</label>
                                <div className="space-y-3">
                                    <input placeholder="Jalan / Gedung / Patokan" className="w-full bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white outline-none focus:border-gold" value={shippingAddress.jalan} onChange={e=>setShippingAddress({...shippingAddress, jalan: e.target.value})}/>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input placeholder="Kecamatan" className="w-full bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white outline-none focus:border-gold" value={shippingAddress.kecamatan} onChange={e=>setShippingAddress({...shippingAddress, kecamatan: e.target.value})}/>
                                        <input placeholder="Kabupaten" className="w-full bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white outline-none focus:border-gold" value={shippingAddress.kabupaten} onChange={e=>setShippingAddress({...shippingAddress, kabupaten: e.target.value})}/>
                                    </div>
                                    <div className="grid grid-cols-[1fr,auto] gap-3">
                                        <input placeholder="Provinsi" className="w-full bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white outline-none focus:border-gold" value={shippingAddress.provinsi} onChange={e=>setShippingAddress({...shippingAddress, provinsi: e.target.value})}/>
                                        <input placeholder="Kode Pos" type="number" className="w-24 bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white outline-none focus:border-gold text-center" value={shippingAddress.postalCode} onChange={e=>setShippingAddress({...shippingAddress, postalCode: e.target.value})}/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {requestCart.length > 0 && (
                            <div className="bg-black/40 rounded-2xl p-4 sm:p-5 border border-line-2 mt-auto flex flex-col relative z-10 shadow-inner">
                                <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-4 border-b border-line-2 pb-2 flex items-center gap-2"><Package size={14}/> Request Draft Cart ({requestCart.length})</h4>
                                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2.5 mb-5 pr-2">
                                    {requestCart.map(item => (
                                        <div key={item.productId} className="flex justify-between items-center text-sm bg-raised p-3 rounded-lg border border-line-2">
                                            <span className="text-ink font-bold uppercase truncate pr-3">{item.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gold font-black shrink-0">{item.qty} Bks</span>
                                                <button onClick={() => removeFromCart(item.productId)} className="text-ink-muted hover:text-danger-text shrink-0"><MinusCircle size={16}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleSubmitRequest} disabled={isProcessing} className="w-full py-4 bg-gold hover:bg-gold/90 text-gold-ink rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm relative">
                                    {isProcessing ? <Clock size={18} className="animate-spin"/> : <Send size={18}/>} SUBMIT TO HQ
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============ WHAT IS ON A BRANCH'S SHELF — HQ SIDE ============
                Aldi, 2026-08-23: *"i think tier 1 also need to see regional warehouse components
                that only regional admin could see because me as tier 1 cant see that"*. He owns
                the company and could not look at his own branches' shelves; `isAreaAdmin` was a
                hard either/or, so HQ saw the pipeline and nothing else.

                READ-ONLY on purpose. HQ picks a branch and sees its shelf and its stock ages —
                the same card the branch admin sees, drawn by the same function so the two cannot
                drift apart. It does NOT get the request form or the receive button: a shipment
                must still be asked for by the branch that needs it and counted by the branch that
                receives it, or the separation the arrival check exists to create is gone. */}
            {isAdmin && (
                <div className="bg-panel p-4 sm:p-6 rounded-2xl border border-line-2 shadow-xl mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-line-2 pb-4 mb-4">
                        <h3 className="text-base sm:text-lg font-black text-gold uppercase tracking-widest flex items-center gap-2">
                            <MapPin size={18}/> Isi Gudang Cabang
                        </h3>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-[10px] text-ink-muted uppercase tracking-widest shrink-0">Lihat cabang</span>
                            <select
                                value={viewBranch}
                                onChange={e => setViewBranch(e.target.value)}
                                className="flex-1 sm:flex-none bg-black/50 border border-line-3 rounded-lg p-2 text-xs text-ink outline-none focus:border-gold uppercase tracking-widest font-bold"
                            >
                                <option value="">— pilih —</option>
                                {branchesSeen.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                    </div>
                    {!viewBranch ? (
                        <div className="text-center p-8 bg-black/20 rounded-xl border border-dashed border-line-2 text-ink-muted text-xs uppercase tracking-widest">
                            Pilih cabang untuk melihat isi gudangnya
                        </div>
                    ) : branchStock.length === 0 ? (
                        <div className="text-center p-8 bg-black/20 rounded-xl border border-dashed border-line-2 text-ink-muted text-xs uppercase tracking-widest">
                            Gudang {viewBranch} kosong
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {branchStock.map(stockCard)}
                        </div>
                    )}
                </div>
            )}

            {/* ============ MASTER ADMIN VIEW =========== */}
            {isAdmin && (
                <div className="bg-panel p-4 sm:p-6 rounded-2xl border border-line-2 shadow-xl flex-1 flex flex-col relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-line-2 pb-4">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <Clock className="text-orange"/> Active Pipeline
                        </h3>
                        <p className="text-[10px] text-ink-muted uppercase tracking-widest">Pending, In-Transit & Disputed</p>
                    </div>

                    {(() => {
                        /* DISPUTED belongs in HQ's active list. The branch has already taken the
                           goods in, so nothing is pending on their side — what is outstanding is
                           HQ's answer on the difference. Leave it out of this filter and the
                           report is filed into a list nobody opens, which is the same as not
                           filing it. Disputes sort to the top for the same reason. */
                        const rank = { 'DISPUTED': 0, 'PENDING': 1, 'IN_TRANSIT': 2 };
                        const activeRequests = requests
                            .filter(r => r.status === 'PENDING' || r.status === 'IN_TRANSIT' || r.status === 'DISPUTED')
                            .sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9));
                        
                        if (isLoading) {
                            return <div className="text-center p-10 text-ink-muted animate-pulse italic text-xs uppercase tracking-widest">Loading Logistics Logs...</div>;
                        }
                        
                        if (activeRequests.length === 0) {
                            return (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-line-2 rounded-xl bg-black/20">
                                    <Globe size={48} className="text-line-3 mb-3 opacity-50"/>
                                    <p className="text-ink-muted font-bold text-sm">No active requests nationwide.</p>
                                    <p className="text-ink-muted text-[10px] mt-1 uppercase tracking-widest">Active logistics pipeline is clear!</p>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-4">
                                {activeRequests.map(req => {
                                    const isExpanded = expandedRequest === req.id;
                                    const itemsToProcess = req.fulfilledItems || req.requestedItems || req.items || [];
                                    
                                    return (
                                        <div key={req.id} className={`p-4 rounded-2xl border transition-colors ${isExpanded ? 'bg-ground border-line-3 shadow-2xl' : 'bg-black/40 border-line-2 hover:bg-raised'}`}>
                                            
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-line-2 pb-3 mb-3 relative">
                                                
                                                <button data-kpm-del data-label="Delete" onClick={() => handleDeleteRequest(req.id)} className="absolute -top-1 -right-1 text-ink-muted hover:text-danger-text bg-panel p-1.5 rounded-lg border border-line-2 transition-colors shadow-lg z-10" title="Delete Ghost Data Permanently">
                                                    <Trash2 size={16}/>
                                                </button>

                                                <div className="w-full sm:w-auto mb-2 sm:mb-0 flex-1">
                                                    <div className="flex gap-2 items-center">
                                                        <h4 className="font-black text-white uppercase text-xl flex items-center gap-2">
                                                            <MapPin size={16} className="text-orange"/> {req.branch}
                                                        </h4>
                                                        <span className="text-[10px] text-ink-muted font-mono tracking-widest uppercase">{req.id} • REQ BY: {req.requestedByName || (req.requestedBy || "").split('@')[0]}</span>
                                                    </div>
                                                    <p className="text-[11px] text-ink-muted font-mono mt-0.5 mb-1.5">Time: {new Date(req.timestamp?.seconds*1000).toLocaleString()}</p>
                                                    {/* 🚀 THE FIX: LIST ALL ITEM DETAILS RIGHT ON THE CARD */}
                                                    <div className="text-[10px] text-ink font-medium">
                                                        <span className="font-bold text-orange mr-1">📦 {itemsToProcess.reduce((sum,i)=>sum+Number(i.qty),0)} Bks:</span> 
                                                        <span className="text-ink-muted">{itemsToProcess.map(i => `${i.qty} ${i.name}`).join(', ')}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto pr-8 mt-2 sm:mt-0">
                                                    <StatusBadge status={req.status}/>
                                                    <div className="flex gap-2 w-full sm:w-auto">
                                                        <button onClick={() => setExpandedRequest(isExpanded ? null : req.id)} className="flex-1 sm:flex-none bg-raised hover:bg-line-2 text-ink-muted hover:text-white p-2 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors shadow-sm">
                                                            {isExpanded ? <XCircle size={14}/> : <Eye size={14}/>}
                                                            {isExpanded ? 'Tutup Track' : 'Lacak (OMS)'}
                                                        </button>
                                                        {req.status === 'PENDING' && (
                                                            <button onClick={() => handleStartFulfillment(req)} className="flex-1 sm:flex-none px-4 py-2.5 bg-orange hover:bg-orange/90 text-orange-ink rounded-lg font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-1 shadow-lg active:scale-95 transition-all animate-pop-in">
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
                        <Package className="text-gold animate-bounce mx-auto mb-4" size={48}/>
                        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-widest">PROSES DATA...</h2>
                        <p className="text-ink-muted mt-2 text-xs uppercase tracking-widest animate-pulse">Sedang update database cloud...</p>
                    </div>
                </div>
            )}

            {/* FULFILLMENT MODAL (HQ ONLY) */}
            {isFulfilling && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[90] backdrop-blur-sm overflow-y-auto">
                    <div className="bg-panel w-full max-w-4xl rounded-2xl border-2 border-gold shadow-[0_0_50px_rgba(212,175,55,0.2)] flex flex-col max-h-[90vh] overflow-hidden mt-10 sm:mt-0">
                        
                        <div className="p-4 sm:p-6 border-b border-line-2 bg-black/40 flex justify-between items-start gap-4 shrink-0">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-widest flex items-center gap-2 sm:gap-3 break-words">
                                    <Pencil className="text-gold shrink-0"/> Siapkan Pengiriman Ke {isFulfilling.branch}
                                </h3>
                                <p className="text-[10px] text-ink-muted uppercase tracking-widest mt-1">Order ID: {isFulfilling.id}</p>
                            </div>
                            <button onClick={cancelFulfillment} className="text-ink-muted hover:text-white shrink-0"><XCircle size={24}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8">
                            
                            <div className="bg-raised border border-gold/30 rounded-xl p-4 sm:p-5 shadow-inner">
                                <h4 className="text-[10px] text-gold font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><MapPin size={14}/> Destination Address</h4>
                                <p className="text-white text-sm sm:text-base font-black uppercase tracking-wider">{isFulfilling.branch} WAREHOUSE</p>
                                {isFulfilling.deliveryAddress ? (
                                    <p className="text-xs sm:text-sm text-ink mt-2 leading-relaxed">
                                        {isFulfilling.deliveryAddress.jalan}<br/>
                                        Kec. {isFulfilling.deliveryAddress.kecamatan}, {isFulfilling.deliveryAddress.kabupaten}<br/>
                                        {isFulfilling.deliveryAddress.provinsi} - {isFulfilling.deliveryAddress.postalCode}
                                    </p>
                                ) : (
                                    <p className="text-xs text-danger-text italic mt-2 border border-danger/30 bg-danger-well p-2 rounded inline-block">No detailed address provided by Branch.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3 flex items-center gap-2"><Truck size={14}/> Wajib Diisi (TMS)</h4>
                                    <input type="text" placeholder="Nama Pengirim (Sender Name)" value={senderName} onChange={e => setSenderName(e.target.value)} className="w-full bg-black/50 border border-line-3 rounded-xl p-3 sm:p-4 text-sm text-orange font-bold outline-none focus:border-gold transition-colors shadow-inner"/>
                                    <input type="text" placeholder="Logistic Company / Courier (e.g., J&T, Internal)" value={courierName} onChange={e => setCourierName(e.target.value)} className="w-full bg-black/50 border border-line-3 rounded-xl p-3 sm:p-4 text-sm text-white font-bold outline-none focus:border-gold transition-colors shadow-inner"/>
                                    <input type="text" placeholder="Nomor Resi / Tracking Number (Required)" value={trackingNo} onChange={e => setTrackingNo(e.target.value)} className="w-full bg-black/50 border border-line-2 rounded-xl p-3 sm:p-4 text-sm text-gold font-mono font-bold outline-none focus:border-gold transition-colors shadow-inner uppercase tracking-wider"/>
                                    <div className="bg-black p-3 sm:p-4 rounded-xl border border-dashed border-danger/50 text-danger-text text-xs flex gap-3 items-center leading-relaxed">
                                        <AlertCircle size={32} className="shrink-0"/>
                                        <p><strong className="uppercase block">Penting:</strong> Data di atas dan Foto Bukti di samping *wajib* diisi lengkap. Ini adalah Shopee/Tokopedia logic: Status Math tidak akan berubah sebelum paper trail pengiriman lengkap.</p>
                                    </div>
                                </div>

                                <div className="bg-black/50 p-4 sm:p-6 rounded-xl border border-line-2 flex flex-col items-center shadow-xl">
                                    <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3 flex items-center gap-1.5"><Camera size={12}/> Wajib Upload: Foto Paket & Resi</h4>
                                    
                                    {packagePhotoPreview ? (
                                        <div className="w-full relative">
                                            <img src={packagePhotoPreview} alt="Package Proof" className="w-full h-40 sm:h-56 object-cover rounded-lg border-2 border-gold shadow-inner"/>
                                            <button onClick={() => { setPackagePhotoFile(null); setPackagePhotoPreview(null); }} className="absolute -top-2 -right-2 bg-danger rounded-full p-1 text-white hover:bg-danger"><XCircle size={16}/></button>
                                        </div>
                                    ) : (
                                        <button onClick={() => photoInputRef.current.click()} className="w-full h-40 sm:h-56 bg-raised rounded-lg border-2 border-dashed border-line-3 flex flex-col items-center justify-center text-ink-muted hover:border-gold hover:text-gold transition-colors gap-3 p-4 sm:p-6 text-center">
                                            <UploadCloud size={40} className="opacity-50"/>
                                            <span className="font-bold text-xs uppercase tracking-widest">Pilih Foto Bukti</span>
                                            <span className="text-[11px] text-ink-muted hidden sm:inline">Ambil foto paket yang sudah ada resinya.</span>
                                        </button>
                                    )}
                                    <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" />
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Pencil size={14} className="text-gold"/> Edit Barang Yang Dikirim (HQ can edit Qty)</h4>
                                <div className="space-y-3 bg-black/30 p-3 sm:p-4 rounded-2xl border border-line-2">
                                    {fulfillmentCart.map(item => {
                                        const hqProduct = globalInventory.find(p => p.id === item.productId);
                                        const hqStock = hqProduct?.stock || 0;
                                        const hasEnough = hqStock >= item.qty;
                                        const requestedQty = (isFulfilling.requestedItems || isFulfilling.items || []).find(r => r.productId === item.productId)?.qty || 0;

                                        return (
                                            <div key={item.productId} className="bg-raised p-3 sm:p-4 rounded-xl border border-line-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                <div className="w-full sm:w-auto">
                                                    <span className="font-bold text-white uppercase text-sm">{item.name}</span>
                                                    <div className="flex gap-4 text-[10px] mt-1">
                                                        <span className="text-orange font-bold uppercase tracking-widest">Diminta: {requestedQty} Bks</span>
                                                        <span className={`font-black ${hasEnough ? 'text-ink-muted' : 'text-danger-text'}`}>Stok HQ: {hqStock} Bks</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 bg-panel p-2 rounded-lg border border-line-2 shadow-inner w-full sm:w-44">
                                                    <label className="text-[10px] text-gold font-bold uppercase tracking-widest shrink-0">Kirim:</label>
                                                    <input type="number" value={item.qty} onChange={e => updateFulfillQty(item.productId, e.target.value)} className="flex-1 min-w-0 bg-transparent text-right font-black text-gold text-lg outline-none"/>
                                                    <span className="text-[10px] text-ink-muted shrink-0">Bks</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="no-print p-4 sm:p-6 border-t border-line-2 bg-black/40 flex flex-col md:flex-row gap-3 mt-auto shrink-0 rounded-b-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.3)] relative z-20">
                            <button onClick={handleShipItems} disabled={isProcessing} className="flex-1 bg-gold hover:bg-gold/90 text-gold-ink py-4 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all relative">
                                {isProcessing ? <Clock className="animate-spin" size={18}/> : <Send size={20}/>}
                                KONFIRMASI DATA & KIRIM BARANG
                            </button>
                            <button onClick={handleRejectRequest} disabled={isProcessing} className="w-full md:w-auto px-6 bg-danger-well hover:bg-danger text-danger-text hover:text-white border border-danger/30 py-4 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                                <XCircle size={16}/> TOLAK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}