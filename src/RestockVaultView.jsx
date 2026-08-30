import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UploadCloud, FileText, Search, Save, X, RefreshCcw, History, ChevronDown, Printer, Pencil, Trash2, Image as ImageIcon, Target, PlusCircle, ArrowLeftRight, Send, Camera, Truck, AlertCircle, MapPin, Clock } from 'lucide-react';
import { doc, collection, setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, onSnapshot, increment } from 'firebase/firestore';
import { savePhotoAndGetReference, deletePhotoFromStorage, compressImageToBase64, getLocalDayKey} from './utils/helpers';
import { confirmAction } from './components/ConfirmGate.jsx';
import { notify } from './components/Toast.jsx';
import { canPickFromGallery } from './config/permissions';
/* one definition of "what is a branch", shared with the dashboard's supply maths */
import { NON_BRANCH, bufferDays } from './utils/supply.js';
/* THE SAME FOUR FUNCTIONS THE BRANCH PANEL RUNS ON, imported rather than re-derived. His ask,
   2026-08-30: *"when we fill the shipment out forms, it shows the recommended quantity sent for
   each product"* — and the branch already had this maths. A second copy of "how fast does this
   leave" is exactly the fault `A Ratio of Sums Is Not a Rate` was written about: the screen nobody
   edits is the one that keeps being believed. They live in BranchWarehouseManager because that is
   where they were built and where their checks read them; moving them would split those checks
   from their code, which this repo has now paid for twice. */
import { productArrivals, shipmentRhythm, inTransitQty, reorderAdvice } from './components/BranchWarehouseManager.jsx';
import PonderButton from './ponder/PonderButton.jsx';

/* ═══════════════════════════════════════════════════════════════════════════
   SURAT JALAN — one document, two directions.

   Masuk (factory → HQ) and Kirim (HQ → branch) are the SAME form with the
   route reversed. Asal → Tujuan is the field that makes that work; without a
   destination the screen could only ever mean one thing.

   Every colour here is a theme token. This screen used to paint itself with 58
   hardcoded white labels and 32 black washes, which is why light mode could
   never reach it. LAW: no blue, no green — amber is an edge, an ink, a lamp.
   (The needles are deliberately not quoted here: group 53 of the audit counts
   them in this file, and a comment quoting one would fail its own check.)
   ═══════════════════════════════════════════════════════════════════════════ */

const HQ_NAME = 'Gudang Pusat (HQ)';
const rp = (n) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
const num = (n) => new Intl.NumberFormat('id-ID').format(Number(n) || 0);

/* Defined at module scope on purpose. A component declared inside the parent is a
   NEW type on every render, so React unmounts and remounts it — the input would
   lose focus after every keystroke. */
const RouteCombo = ({ label, value, onChange, options, placeholder, flag }) => {
    const [open, setOpen] = useState(false);
    const [hi, setHi] = useState(-1);
    const boxRef = useRef(null);

    const q = (value || '').trim().toLowerCase();
    const hits = options.filter(o => o.name.toLowerCase().includes(q));
    const known = options.some(o => o.name.toLowerCase() === q);

    useEffect(() => {
        const away = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', away);
        return () => document.removeEventListener('mousedown', away);
    }, []);

    const pick = (name) => { onChange(name); setOpen(false); setHi(-1); };

    return (
        <div className="relative min-w-0" ref={boxRef}>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">
                {label}
                {/* an unknown name is allowed — it is just never allowed to look the same as a known one */}
                {flag && value.trim() && !known && <span className="ml-1.5 text-accent-ink">baru</span>}
            </label>
            <input
                value={value}
                onChange={e => { onChange(e.target.value); setOpen(true); setHi(-1); }}
                onFocus={() => setOpen(true)}
                onKeyDown={e => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (!hits.length) return;
                        setHi(h => e.key === 'ArrowDown' ? Math.min(hits.length - 1, h + 1) : Math.max(0, h - 1));
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (hi > -1 && hits[hi]) pick(hits[hi].name); else setOpen(false);
                    } else if (e.key === 'Escape') setOpen(false);
                }}
                placeholder={placeholder}
                autoComplete="off"
                className="w-full bg-inset border border-line-2 rounded-lg p-2.5 text-sm text-ink font-mono outline-none focus:border-orange transition-colors"
            />
            {open && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-raised border border-line-2 rounded-lg max-h-52 overflow-y-auto custom-scrollbar shadow-xl">
                    {hits.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-ink-muted">Tidak ada. Nama baru tetap bisa dipakai.</div>
                    ) : hits.map((o, i) => (
                        <button
                            key={o.name} type="button"
                            onMouseDown={e => { e.preventDefault(); pick(o.name); }}
                            className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm border-b border-line-2 last:border-b-0 border-l-2 transition-colors ${i === hi ? 'border-l-orange bg-panel' : 'border-l-transparent hover:border-l-orange hover:bg-panel'}`}
                        >
                            <span className="flex-1 truncate text-ink">{o.name}</span>
                            <span className="text-[10px] font-mono text-ink-muted uppercase tracking-widest">{o.kind}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const Lamp = ({ tone = 'off', live = false }) => (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 border ${
        tone === 'on'  ? 'bg-orange border-orange' :
        tone === 'bad' ? 'bg-danger border-danger' :
                         'bg-transparent border-line-3'
    } ${live ? 'animate-pulse' : ''}`} />
);

/* what has actually happened to this shipment, and what has not yet */
const Proses = ({ steps }) => (
    <div className="bg-panel border border-line-2 rounded-xl p-4">
        <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Proses</h4>
        {steps.map((s, i) => (
            <div key={i} className="flex gap-3 items-stretch">
                <div className="w-2 shrink-0 flex flex-col items-center">
                    <Lamp tone={s.tone} live={s.live} />
                    {i < steps.length - 1 && (
                        <span className={`flex-1 mt-1 border-l ${s.tone === 'off' ? 'border-dashed' : ''} border-line-3`} />
                    )}
                </div>
                <div className={`min-w-0 flex-1 ${i < steps.length - 1 ? 'pb-3.5' : ''}`}>
                    <p className={`text-[13px] leading-snug ${s.tone === 'bad' ? 'text-danger-text font-bold' : s.tone === 'off' ? 'text-ink-muted' : 'text-ink font-bold'}`}>{s.title}</p>
                    {s.when && <p className="text-[10px] font-mono text-ink-muted mt-0.5 whitespace-pre-line leading-relaxed">{s.when}</p>}
                </div>
            </div>
        ))}
    </div>
);

/* The three states a branch request can be in while it is still HQ's problem. DISPUTED sorts
   FIRST, not last: the goods are already inside the branch and the count is already filed, so
   nothing is pending on their side — what is outstanding is HQ's answer on the difference. Rank it
   below IN_TRANSIT and the one state nobody goes looking for is the one buried at the bottom. */
const REQ_RANK = { DISPUTED: 0, PENDING: 1, IN_TRANSIT: 2 };

const RestockVaultView = ({ inventory = [], procurements = [], motorists = [], branchStockMap = {}, db, storage, appId, user, isAdmin, userRole, logAudit, triggerCapy, appSettings, masterUserId }) => {
    /* camera only, unless he is senior enough to re-file a photo that came in some other way */
    const galleryOk = canPickFromGallery(userRole);
    /* 'in' = surat jalan masuk · 'out' = surat jalan keluar (HQ push) · 'book' = buku besar */
    const [viewMode, setViewMode] = useState('in');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPO, setExpandedPO] = useState(null);
    const [bookFilter, setBookFilter] = useState('all');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [stockRequests, setStockRequests] = useState([]);

    const [targets, setTargets] = useState([]);
    const [showTargetModal, setShowTargetModal] = useState(false);
    const [targetForm, setTargetForm] = useState({ productId: '', targetQty: '', month: new Date().toISOString().slice(0,7) });

    const [editingOrder, setEditingOrder] = useState(null);
    const [editSenderName, setEditSenderName] = useState("");
    const [editCourier, setEditCourier] = useState("");
    const [editTrackingNo, setEditTrackingNo] = useState("");
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);

    /* ═══ REQUEST — fulfilling what a branch asked for ═══
       Moved here from BranchWarehouseManager on 2026-08-27. It was the only way HQ could answer a
       branch request, and it lived inside the BRANCH screen, three screens away from the desk that
       owns every other surat jalan. Nothing was duplicated: the queue rows, the drawer, the
       timeline, "Edit resi" and "Hapus" are the Buku machinery already in this file, and only the
       shipping modal below had to travel. */
    const [isFulfilling, setIsFulfilling] = useState(null);
    const [fulfillmentCart, setFulfillmentCart] = useState([]);
    const [shipSender, setShipSender] = useState("");
    const [shipCourier, setShipCourier] = useState("");
    const [shipResi, setShipResi] = useState("");
    const [shipPhotoFile, setShipPhotoFile] = useState(null);
    const [shipPhotoPreview, setShipPhotoPreview] = useState(null);
    /* Deliberately NOT `isSubmitting`. That flag gates the Masuk/Kirim save button, and sharing it
       would grey out a form the user is not even looking at while a shipment uploads. */
    const [isShipping, setIsShipping] = useState(false);

    const [viewingAcceptance, setViewingAcceptance] = useState(null);
    const [editingPO, setEditingPO] = useState(null);
    const [editReceiptFile, setEditReceiptFile] = useState(null);
    const [viewingImage, setViewingImage] = useState(null);

    const [cart, setCart] = useState([]);
    const [poData, setPoData] = useState({
        supplierName: '',
        destination: HQ_NAME,
        poNumber: `SJ-${Date.now().toString().slice(-6)}`,
        supplierSjNo: '',
        poDate: getLocalDayKey(),
        shippingCost: 0,
        exciseTax: 0,
        laborCost: 0,
        expiryDate: '',
        courier: '',
        trackingNo: '',
    });
    const [receiptFile, setReceiptFile] = useState(null);
    const [packageFile, setPackageFile] = useState(null);

    const getAdminName = () => appSettings?.adminDisplayName || user?.displayName || (user?.email || "").split('@')[0] || "HQ Admin";
    const activeUserId = masterUserId || user?.uid;
    const isOut = viewMode === 'out';

    useEffect(() => {
        if (!user || !appId || !isAdmin || !activeUserId) return;

        const reqRef = collection(db, `artifacts/${appId}/users/${activeUserId}/stock_requests`);
        const unsubReq = onSnapshot(reqRef, (snap) => {
            setStockRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => console.warn("Stock requests listener:", err.code));

        const tgtRef = collection(db, `artifacts/${appId}/users/${activeUserId}/production_targets`);
        const unsubTgt = onSnapshot(tgtRef, (snap) => {
            setTargets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => console.warn("Production targets listener:", err.code));

        return () => { unsubReq(); unsubTgt(); };
    }, [db, appId, user, isAdmin, activeUserId]);

    /* ── the route's own options. Both lists are DERIVED from records that already
       exist, so nothing new has to be maintained by hand. ───────────────────── */
    /* 🚀 Tujuan comes from the ROSTER, not from shipping history. Built from stockRequests alone,
       a team that had never been shipped to had no entry here — so the one warehouse that most
       needed its first delivery was the only one HQ could not select. His words: "make sure that
       every team registered on the fleet and roster have their own storage option".
       Still UNIONED with the branches seen on past requests, never replaced by the roster: a
       location that was renamed, or whose motorist row was deleted, must not disappear from the
       list while its shipments are still live in the book. */
    const branchesSeen = useMemo(
        () => [...new Set([
            ...motorists.map(m => m?.location),
            ...stockRequests.map(r => r?.branch),
        ].filter(Boolean).filter(n => !NON_BRANCH.includes(n)))].sort(),
        [motorists, stockRequests]
    );
    const suppliersSeen = useMemo(
        () => [...new Set(procurements.map(p => p?.supplierName).filter(Boolean))].sort(),
        [procurements]
    );
    const placeOptions = useMemo(() => ([
        ...suppliersSeen.map(n => ({ name: n, kind: 'pabrik' })),
        { name: HQ_NAME, kind: 'gudang' },
        ...branchesSeen.map(n => ({ name: n, kind: 'cabang' })),
    ]), [suppliersSeen, branchesSeen]);

    /* the last landed cost per product, so a new line can say whether it got dearer.
       Pure lookup over records already loaded — no new field, no new read. */
    const lastLanded = useMemo(() => {
        const out = {};
        const sorted = [...procurements].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        for (const po of sorted) {
            const qty = (po.items || []).reduce((s, i) => s + (Number(i.qtyReceived) || 0), 0);
            if (!qty) continue;
            const extra = (Number(po.shippingCost)||0) + (Number(po.laborCost)||0) + (Number(po.exciseTax)||0);
            for (const i of po.items || []) {
                if (!i.id || out[i.id]) continue;
                out[i.id] = { unit: (Number(i.basePrice)||0) + extra / qty, batchNo: i.batchNo || po.poNumber };
            }
        }
        return out;
    }, [procurements]);

    const addToCart = (product) => {
        if (cart.some(c => c.id === product.id)) return notify(`${product.name} sudah ada di surat jalan ini.`);
        setCart([...cart, {
            cartId: Date.now() + Math.random(),
            id: product.id,
            name: product.name,
            batchNo: '',
            qtyReceived: '',
            basePrice: product.priceDistributor || 0,
            unit: product.unit || 'Bks',
        }]);
    };

    const removeFromCart = (cartId) => setCart(cart.filter(item => item.cartId !== cartId));
    const updateCartItem = (cartId, field, value) => setCart(cart.map(item => item.cartId === cartId ? { ...item, [field]: value } : item));

    const filteredInventory = inventory.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku?.toLowerCase().includes(searchTerm.toLowerCase()));

    const totalBasePrice = cart.reduce((sum, item) => sum + (Number(item.qtyReceived || 0) * Number(item.basePrice || 0)), 0);
    const totalItemsReceived = cart.reduce((sum, item) => sum + Number(item.qtyReceived || 0), 0);

    /* ═══════════ MINIMAL KIRIM — the least this cabang can be sent without running dry ═══════════
       Aldi, 2026-08-30: *"this recommended value should be different according to the 'tujuan' that
       i choose"*. So it is keyed on `poData.destination` and re-derives the moment he changes it —
       same product, different cabang, different number, because each cabang has its own delivery
       history and its own selling speed.

       IT IS A FLOOR, NOT A TARGET, and that is his framing not mine: *"normally factory does sent
       more than enough goods to the regional warehouse but if there is not enough/ minimal goods
       are being sent then this features actually come in handy, especially with company that have
       limited production capabilities"*. When production is tight this stops being advice and
       becomes the line under which a cabang stops selling. The screen says `minimal`, never
       `saran`, for exactly that reason.

       ⚠️ OUTBOUND ONLY. On the Masuk form the goods come from the factory and there IS no cabang —
       `poData.destination` is HQ itself. A number there would be arithmetic about the master vault
       dressed up as branch advice, so the whole memo returns {} unless `isOut`. `NON_BRANCH` is the
       same guard the Tujuan list already uses: Headquarters is the master vault, not a cabang.

       ⚠️ THE CART LINE BEING TYPED IS NOT COUNTED AS "already coming". `inTransitQty` reads saved
       `stock_requests`, and this document is not saved yet — so the minimum does not shrink as he
       types into it, which would make the number chase its own tail. */
    const sendAdvice = useMemo(() => {
        if (!isOut) return {};
        const to = (poData.destination || '').trim();
        if (!to || NON_BRANCH.includes(to)) return {};
        const now = Math.floor(Date.now() / 1000);
        const rhythm = shipmentRhythm(stockRequests, to);
        const spare = bufferDays(appSettings, to);
        const shelfOf = (id) =>
            Number((branchStockMap[to] || []).find(s => (s.productId || s.id) === id)?.stock) || 0;
        const out = {};
        cart.forEach(c => {
            out[c.id] = reorderAdvice(
                productArrivals(stockRequests, to, c.id), shelfOf(c.id),
                inTransitQty(stockRequests, to, c.id), rhythm, now, spare);
        });
        return out;
    }, [isOut, poData.destination, cart, stockRequests, branchStockMap, appSettings]);
    /* cukai and upah bongkar are an INTAKE cost. A branch does not pay them a second time. */
    const extraCosts = (Number(poData.shippingCost)||0) + (isOut ? 0 : (Number(poData.laborCost)||0) + (Number(poData.exciseTax)||0));
    const trueLandedTotal = totalBasePrice + extraCosts;
    const landedPerUnit = totalItemsReceived > 0 ? trueLandedTotal / totalItemsReceived : 0;

    /* the document filling itself in. It counts real evidence and it NEVER blocks a save —
       a blocked save is a blocked dialog, and a block explains nothing. */
    const checklist = [
        { ok: !!poData.supplierName.trim(), label: 'asal' },
        { ok: !!poData.destination.trim(), label: 'tujuan' },
        { ok: cart.length > 0, label: 'barang' },
        { ok: cart.length > 0 && cart.every(c => String(c.batchNo || '').trim()), label: 'batch tiap baris' },
        { ok: cart.length > 0 && cart.every(c => Number(c.qtyReceived) > 0), label: 'jumlah' },
        { ok: !!packageFile, label: 'foto barang' },
        { ok: isOut ? true : !!receiptFile, label: 'nota' },
        { ok: !!poData.trackingNo.trim(), label: 'resi' },
    ];
    const donePct = Math.round(checklist.filter(c => c.ok).length / checklist.length * 100);
    const missing = checklist.filter(c => !c.ok).map(c => c.label);

    const resetForm = () => {
        setCart([]);
        setPoData({
            supplierName: '', destination: HQ_NAME,
            poNumber: `SJ-${Date.now().toString().slice(-6)}`, supplierSjNo: '',
            poDate: getLocalDayKey(), shippingCost: 0, exciseTax: 0, laborCost: 0,
            expiryDate: '', courier: '', trackingNo: '',
        });
        setReceiptFile(null);
        setPackageFile(null);
    };

    const swapRoute = () => setPoData(p => ({ ...p, supplierName: p.destination, destination: p.supplierName }));

    /* switching direction only changes the route's defaults — the form itself is the same */
    const setDirection = (dir) => {
        setViewMode(dir);
        setPoData(p => ({
            ...p,
            supplierName: dir === 'out' ? HQ_NAME : (p.supplierName === HQ_NAME ? '' : p.supplierName),
            destination: dir === 'out' ? (p.destination === HQ_NAME ? (branchesSeen[0] || '') : p.destination) : HQ_NAME,
        }));
    };

    /* ═══ MASUK — factory production lands in the Master Vault ═══ */
    const handleProcessRestock = async () => {
        if (!user || !db || !activeUserId) return notify("System disconnected. Cannot save.");
        if (cart.length === 0 || totalItemsReceived <= 0) return notify("Belum ada barang, atau jumlahnya masih kosong.");

        const batchId = `BCH-${new Date().toISOString().slice(2,10).replace(/-/g,'')}`;

        setIsSubmitting(true);
        try {
            let base64Receipt = null;
            if (receiptFile) {
                if(triggerCapy) triggerCapy("Compressing Document to Database... ⏳");
                const compressed = await compressImageToBase64(receiptFile);
                const receiptPath = `artifacts/${appId}/users/${activeUserId}/photos/receipt_${batchId}_${Date.now()}.jpg`;
                base64Receipt = await savePhotoAndGetReference(storage, compressed, receiptPath, appSettings?.usePhotoStorage);
            }
            let base64Package = null;
            if (packageFile) {
                if(triggerCapy) triggerCapy("Compressing Shipment Photo... ⏳");
                const compressed = await compressImageToBase64(packageFile);
                const photoPath = `artifacts/${appId}/users/${activeUserId}/photos/inbound_${batchId}_${Date.now()}.jpg`;
                base64Package = await savePhotoAndGetReference(storage, compressed, photoPath, appSettings?.usePhotoStorage);
            }

            const batch = writeBatch(db);

            const stockUpdates = {};
            for (const item of cart) {
                if (!stockUpdates[item.id]) stockUpdates[item.id] = 0;
                stockUpdates[item.id] += (Number(item.qtyReceived) || 0);
            }

            // 🚀 FIREBASE ATOMIC INCREMENT: Flawless Stock Addition
            for (const [prodId, qtyToAdd] of Object.entries(stockUpdates)) {
                const prodRef = doc(db, `artifacts/${appId}/users/${activeUserId}/products`, prodId);
                batch.update(prodRef, { stock: increment(qtyToAdd) });
            }

            const poRef = doc(collection(db, `artifacts/${appId}/users/${activeUserId}/procurement`));
            const poRecord = {
                batchId, ...poData, items: cart, totalBasePrice, trueLandedTotal,
                timestamp: serverTimestamp(), date: poData.poDate,
                hasReceipt: !!base64Receipt,
                receiptUrl: base64Receipt || null,
                packagePhotoUrl: base64Package || null,
                recordedBy: getAdminName(),
                /* stated at save time, so a later read never has to guess what was missing */
                incomplete: missing.length > 0 ? missing : null,
            };

            batch.set(poRef, poRecord);
            await batch.commit();

            if (logAudit) await logAudit("RESTOCK_VAULT", `Produced ${totalItemsReceived} units under ${poData.poNumber}`);
            if (triggerCapy) triggerCapy(`Surat jalan ${poData.poNumber} tersimpan. ${num(totalItemsReceived)} Bks masuk Master Vault.`);

            resetForm();
            setViewMode('book');
        } catch (error) {
            console.error(error);
            notify("Procurement Failed: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ═══ KIRIM — HQ sends stock to a branch WITHOUT waiting to be asked ═══
       Writes the same stock_requests document the branch receive screen already
       reads, straight to IN_TRANSIT. The branch is still credited what it COUNTS
       on arrival, never what this form claims was sent. */
    const handleHQPush = async () => {
        if (!user || !db || !activeUserId) return notify("System disconnected. Cannot send.");
        if (!poData.destination.trim()) return notify("Tujuan belum diisi. Barang tidak bisa dikirim ke mana-mana.");
        if (cart.length === 0 || totalItemsReceived <= 0) return notify("Belum ada barang, atau jumlahnya masih kosong.");

        for (const item of cart) {
            const hq = inventory.find(p => p.id === item.id);
            const want = Number(item.qtyReceived) || 0;
            if (!hq || (hq.stock || 0) < want) {
                return notify(`STOK HQ TIDAK CUKUP!\n\n${item.name}: minta ${num(want)}, ada ${num(hq?.stock || 0)}.`);
            }
        }
        if (!await confirmAction(`Kirim ${num(totalItemsReceived)} Bks ke ${poData.destination}?\n\nStok HQ langsung dipotong sekarang. Cabang baru bertambah setelah mereka menghitung barangnya.`)) return;

        setIsSubmitting(true);
        try {
            let photoUrl = null;
            if (packageFile) {
                if(triggerCapy) triggerCapy("Compressing Shipment Photo... ⏳");
                const compressed = await compressImageToBase64(packageFile);
                const photoPath = `artifacts/${appId}/users/${activeUserId}/photos/hqpush_${Date.now()}.jpg`;
                photoUrl = await savePhotoAndGetReference(storage, compressed, photoPath, appSettings?.usePhotoStorage);
            }

            const lines = cart.map(i => ({
                productId: i.id, name: i.name,
                qty: Number(i.qtyReceived) || 0,
                unit: i.unit || 'Bks',
                batchNo: String(i.batchNo || '').trim() || 'UNASSIGNED',
            }));

            const batch = writeBatch(db);
            // 🚀 ATOMIC: deduct server-side, so a sale landing mid-upload is not undone
            for (const line of lines) {
                const hqRef = doc(db, `artifacts/${appId}/users/${activeUserId}/products`, line.productId);
                batch.update(hqRef, { stock: increment(-line.qty) });
            }

            const orderId = `HQ_${Date.now()}`;
            const orderRef = doc(db, `artifacts/${appId}/users/${activeUserId}/stock_requests`, orderId);
            batch.set(orderRef, {
                branch: poData.destination,
                origin: poData.supplierName || HQ_NAME,
                status: 'IN_TRANSIT',
                initiatedByHQ: true,
                /* both keys written: the branch receive screen reads fulfilledItems first and
                   falls back to requestedItems, and a push has no request to fall back to. */
                requestedItems: lines,
                fulfilledItems: lines,
                requestedByName: getAdminName(),
                senderName: getAdminName(),
                courier: poData.courier || 'Internal',
                trackingNo: poData.trackingNo || '-',
                packagePhotoUrl: photoUrl,
                poNumber: poData.poNumber,
                timestamp: serverTimestamp(),
                fulfilledAt: serverTimestamp(),
                fulfilledBy: user.email,
                workflowTimeline: [{
                    status: 'IN_TRANSIT',
                    time: new Date().toISOString(),
                    msg: `Dikirim HQ tanpa permintaan cabang, oleh ${getAdminName()}. ${num(totalItemsReceived)} Bks via ${poData.courier || 'Internal'} (Resi: ${poData.trackingNo || '-'}). Stok HQ sudah dipotong.`
                }],
            });

            await batch.commit();

            if (logAudit) await logAudit("STOCK_HQ_PUSH", `HQ pushed ${totalItemsReceived} units to ${poData.destination} as ${orderId}`);
            if (triggerCapy) triggerCapy(`Terkirim ke ${poData.destination}. Menunggu cabang menghitung. 🚚`);

            resetForm();
            setViewMode('book');
        } catch (error) {
            console.error(error);
            notify("Pengiriman gagal: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveTarget = async (e) => {
        e.preventDefault();
        if (!targetForm.productId || !targetForm.targetQty) return notify("Select product and enter target quantity.");

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
            notify("Failed to save target: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTarget = async (targetId) => {
        if (!await confirmAction("Are you sure you want to remove this production target?")) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${activeUserId}/production_targets`, targetId));
            if (triggerCapy) triggerCapy("Target removed.");
        } catch (e) {
            notify("Failed to delete target: " + e.message);
        }
    };

    const handleDeletePO = async (po) => {
        if(!await confirmAction(`Delete Delivery Record ${po.poNumber}? WARNING: This will DEDUCT the items back out of your inventory!`)) return;
        try {
            const batch = writeBatch(db);
            const stockToRevert = {};
            for (const item of po.items) {
                if (!stockToRevert[item.id]) stockToRevert[item.id] = 0;
                stockToRevert[item.id] += (Number(item.qtyReceived) || 0);
            }

            // 🚀 FIREBASE ATOMIC DECREMENT: Safe Reversal
            for (const [prodId, qtyToSubtract] of Object.entries(stockToRevert)) {
                const prodRef = doc(db, `artifacts/${appId}/users/${activeUserId}/products`, prodId);
                batch.update(prodRef, { stock: increment(-qtyToSubtract) });
            }

            batch.delete(doc(db, `artifacts/${appId}/users/${activeUserId}/procurement`, po.id));
            await batch.commit();

            if (logAudit) await logAudit("RESTOCK_DELETE", `Deleted Record ${po.poNumber} and reverted stock.`);
            if (triggerCapy) triggerCapy("Record Deleted & Stock Reverted.");
        } catch(e) { notify("Failed to delete: " + e.message); }
    };

    const handleDeleteRequest = async (orderId) => {
        if (!await confirmAction(`⚠️ WARNING: DELETE OUTBOUND RECORD?\n\nAre you sure you want to permanently delete Order: ${orderId}?\n\nNote: This only deletes the history paper-trail. It will NOT automatically refund or reverse warehouse math.`)) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${activeUserId}/stock_requests`, orderId));
            if (triggerCapy) triggerCapy(`Record ${orderId} deleted permanently. 🗑️`);
            if (logAudit) await logAudit("STOCK_DELETE_LOG", `Admin deleted request ${orderId}`);
        } catch(e) { notify("Failed to delete record: " + e.message); }
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
            const oldReceiptUrl = editingPO.receiptUrl || null;

            if (editReceiptFile) {
                if(triggerCapy) triggerCapy("Compressing New Document... ⏳");
                const compressed = await compressImageToBase64(editReceiptFile);
                const receiptPath = `artifacts/${appId}/users/${activeUserId}/photos/receipt_edit_${editingPO.id}_${Date.now()}.jpg`;
                newReceiptUrl = await savePhotoAndGetReference(storage, compressed, receiptPath, appSettings?.usePhotoStorage);
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
                    batch.update(prodRef, { stock: increment(diff) }); // 🚀 FIREBASE ATOMIC EDIT
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

            // 🚀 Only cleaned up after a successful commit — a failed save must never
            // delete a file the (unchanged) Firestore record still points to.
            if (editReceiptFile && oldReceiptUrl && oldReceiptUrl !== newReceiptUrl) {
                deletePhotoFromStorage(storage, oldReceiptUrl);
            }

            if (triggerCapy) triggerCapy("Production Record Updated Successfully!");
            setEditingPO(null);
            setEditReceiptFile(null);
        } catch(e) {
            notify("Edit Failed: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ═══════════ REQUEST — the fulfilment path ═══════════ */

    const handleStartFulfillment = (req) => {
        setIsFulfilling(req);
        setFulfillmentCart((req.requestedItems || req.items || []).map(i => ({ ...i })));
        setShipSender(getAdminName());
        setShipCourier("");
        setShipResi("");
        setShipPhotoFile(null);
        setShipPhotoPreview(null);
    };

    const cancelFulfillment = () => {
        setIsFulfilling(null);
        setFulfillmentCart([]);
        setShipPhotoFile(null);
        setShipPhotoPreview(null);
    };

    const handleShipPhoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setShipPhotoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setShipPhotoPreview(reader.result);
        reader.readAsDataURL(file);
    };

    /* A zero would silently drop the line from the shipment while still marking the request
       fulfilled, so the branch would be told it received something that was never sent. */
    const updateFulfillQty = (pid, newQty) => {
        if (Number(newQty) <= 0) return;
        setFulfillmentCart(prev => prev.map(i => i.productId === pid ? { ...i, qty: Number(newQty) } : i));
    };

    const handleRejectRequest = async () => {
        if (!isFulfilling) return;
        if (!await confirmAction(`Tolak permintaan dari ${isFulfilling.branch}?\n\nCabang akan melihat status DITOLAK. Stok HQ tidak dipotong.`)) return;
        setIsShipping(true);
        try {
            const orderRef = doc(db, `artifacts/${appId}/users/${activeUserId}/stock_requests`, isFulfilling.id);
            const timeline = [...(isFulfilling.workflowTimeline || [])];
            timeline.push({ status: 'REJECTED', time: new Date().toISOString(), msg: `Request rejected by HQ Admin (${getAdminName()}).` });
            await updateDoc(orderRef, {
                status: 'REJECTED',
                rejectedAt: serverTimestamp(),
                rejectedBy: user.email,
                workflowTimeline: timeline,
            });
            if (triggerCapy) triggerCapy(`Permintaan ${isFulfilling.branch} ditolak.`);
            if (logAudit) await logAudit("STOCK_REJECT", `Rejected ${isFulfilling.id} from ${isFulfilling.branch}`);
            cancelFulfillment();
        } catch (e) { notify("Gagal menolak: " + e.message); }
        setIsShipping(false);
    };

    const handleShipItems = async () => {
        if (!isFulfilling) return;
        if (!shipSender || !shipCourier || !shipResi || !shipPhotoFile) {
            return notify("Belum lengkap.\n\nUntuk mengirim, isi dulu:\n1. Nama pengirim\n2. Kurir / ekspedisi\n3. Nomor resi\n4. Foto bukti paket");
        }
        if (fulfillmentCart.some(i => Number(i.qty) <= 0)) return notify("Jumlah kirim harus lebih dari 0.");
        if (!await confirmAction(`Kirim barang ke ${isFulfilling.branch}?\n\nStok HQ langsung dipotong sekarang. Cabang baru bertambah setelah mereka menghitung barangnya.`)) return;

        setIsShipping(true);
        try {
            for (const item of fulfillmentCart) {
                const hq = inventory.find(p => p.id === item.productId);
                if (!hq || (hq.stock || 0) < item.qty) {
                    setIsShipping(false);
                    return notify(`STOK HQ KURANG!\n\nKurang ${item.qty - (hq?.stock || 0)} ${item.unit || 'Bks'} ${item.name}. Ubah jumlah kirimnya dulu.`);
                }
            }

            if (triggerCapy) triggerCapy("Kompres foto & sinkron database... ⏳");
            const base64 = await compressImageToBase64(shipPhotoFile);
            const photoPath = `artifacts/${appId}/users/${activeUserId}/photos/shipment_${isFulfilling.id}_${Date.now()}.jpg`;
            const photoUrl = await savePhotoAndGetReference(storage, base64, photoPath, appSettings?.usePhotoStorage);

            /* 🚀 Deduct the DIFFERENCE server-side, never a recomputed total. The screen's copy of
               HQ stock is read BEFORE the two long waits above — compressing the package photo and
               uploading it, which on a phone is seconds and sometimes minutes. Anything sold in
               that gap used to be silently resurrected. The over-ship guard above still reads the
               screen's copy, so it stays best-effort: a sale during the gap can drive stock
               slightly negative, which is visible and self-correcting, where the old failure was
               neither. Same fix, same reasoning, as the HQ push on the Kirim tab. */
            const batch = writeBatch(db);
            for (const item of fulfillmentCart) {
                batch.update(doc(db, `artifacts/${appId}/users/${activeUserId}/products`, item.productId), { stock: increment(-Number(item.qty)) });
            }

            const orderRef = doc(db, `artifacts/${appId}/users/${activeUserId}/stock_requests`, isFulfilling.id);
            const timeline = [...(isFulfilling.workflowTimeline || [])];
            timeline.push({ status: 'IN_TRANSIT', time: new Date().toISOString(), msg: `Shipped via ${shipCourier} (Resi: ${shipResi}) by ${shipSender}. Photo proof uploaded.` });
            batch.update(orderRef, {
                status: 'IN_TRANSIT',
                senderName: shipSender,
                courier: shipCourier,
                trackingNo: shipResi,
                packagePhotoUrl: photoUrl,
                fulfilledItems: fulfillmentCart,
                fulfilledAt: serverTimestamp(),
                fulfilledBy: user.email,
                workflowTimeline: timeline,
            });

            await batch.commit();
            if (triggerCapy) triggerCapy(`Barang dikirim ke ${isFulfilling.branch}. 🚚`);
            if (logAudit) await logAudit("STOCK_SHIP", `Shipped ${isFulfilling.id} to ${isFulfilling.branch}. Resi: ${shipResi}`);
            cancelFulfillment();
        } catch (e) {
            console.error(e);
            notify("Pengiriman gagal: " + e.message);
        }
        setIsShipping(false);
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
            notify("Failed to edit record: " + e.message);
            setIsProcessingOrder(false);
        }
    };

    /* ═══ BUKU BESAR — flat, newest first. No year → month → date drill just to
       find out what came in this week. ═══ */
    const bookRows = useMemo(() => {
        const dayOf = (r) => r.date || (r.timestamp?.seconds ? getLocalDayKey(new Date(r.timestamp.seconds * 1000)) : getLocalDayKey());

        const inbound = procurements.map(po => {
            const qty = (po.items || []).reduce((s, i) => s + (Number(i.qtyReceived) || 0), 0);
            return {
                key: `in_${po.id}`, dir: 'in', raw: po, id: po.poNumber || po.id,
                from: po.supplierName || 'Pabrik Internal', to: po.destination || HQ_NAME,
                qty, value: po.trueLandedTotal || po.totalBasePrice || 0,
                day: dayOf(po), status: 'Diterima', tone: 'off',
            };
        });

        const outbound = stockRequests.map(req => {
            const lines = req.fulfilledItems || req.requestedItems || req.items || [];
            const qty = lines.reduce((s, i) => s + (Number(i.qty) || 0), 0);
            const unitOf = (l) => Number(inventory.find(p => p.id === l.productId)?.priceDistributor) || 0;
            const value = lines.reduce((s, l) => s + (Number(l.qty) || 0) * unitOf(l), 0);

            /* age is what turns a forgotten shipment into a visible one */
            const shippedMs = req.fulfilledAt?.seconds ? req.fulfilledAt.seconds * 1000 : null;
            const days = shippedMs ? Math.floor((Date.now() - shippedMs) / 86400000) : 0;
            const stale = req.status === 'IN_TRANSIT' && days >= 3;

            let status = req.status, tone = 'on';
            if (req.status === 'DELIVERED') { status = 'Diterima'; tone = 'off'; }
            else if (req.status === 'IN_TRANSIT') { status = stale ? `Belum diambil ${days} hari` : 'Di jalan'; tone = stale ? 'bad' : 'on'; }
            else if (req.status === 'DISPUTED') { status = 'Ada selisih'; tone = 'bad'; }
            else if (req.status === 'REJECTED') { status = 'Ditolak'; tone = 'bad'; }
            else if (req.status === 'PENDING') { status = 'Diminta cabang'; tone = 'on'; }

            return {
                key: `out_${req.id}`, dir: 'out', raw: req, id: req.id,
                from: req.origin || HQ_NAME, to: req.branch || '—',
                qty, value, day: dayOf(req), status, tone,
                live: req.status === 'IN_TRANSIT', days,
            };
        });

        return [...inbound, ...outbound].sort((a, b) => String(b.day).localeCompare(String(a.day)));
    }, [procurements, stockRequests, inventory]);

    /* PENDING · IN_TRANSIT · DISPUTED — the exact three the Global Logistics panel used to list,
       kept identical on purpose so moving the queue here loses nothing HQ could see before. */
    const requestRows = useMemo(
        () => bookRows
            .filter(r => r.dir === 'out' && REQ_RANK[r.raw?.status] !== undefined)
            .sort((a, b) => REQ_RANK[a.raw.status] - REQ_RANK[b.raw.status]),
        [bookRows]
    );

    const shownRows = viewMode === 'req'
        ? requestRows
        : bookRows.filter(r => bookFilter === 'all' || r.dir === bookFilter);

    /* the steps, built from what is actually stored — never invented */
    const stepsFor = (row) => {
        if (row.dir === 'in') {
            const po = row.raw;
            const per = row.qty > 0 ? (po.trueLandedTotal || 0) / row.qty : 0;
            return [
                { title: 'Dicatat di HQ', when: `${po.recordedBy || 'HQ'} · ${row.day}`, tone: 'on' },
                { title: 'Barang dihitung', when: `${num(row.qty)} Bks${po.incomplete ? ` · belum lengkap: ${po.incomplete.join(', ')}` : ' · lengkap'}`, tone: po.incomplete ? 'bad' : 'on' },
                { title: 'Masuk ke Master Vault', when: `landed ${rp(per)} / Bks`, tone: 'on' },
            ];
        }
        const req = row.raw;
        const tl = req.workflowTimeline || [];
        const seen = (s) => tl.some(e => e.status === s);
        const at = (s) => { const e = [...tl].reverse().find(x => x.status === s); return e?.time ? new Date(e.time).toLocaleString('id-ID') : ''; };

        const steps = [{
            title: req.initiatedByHQ ? 'Dikirim HQ tanpa diminta' : `Diminta cabang ${req.branch}`,
            when: `${req.requestedByName || req.requestedBy?.split('@')[0] || '—'} · ${row.day}`,
            tone: 'on',
        }];
        steps.push({
            title: 'Dikirim dari HQ',
            when: seen('IN_TRANSIT') ? `${req.senderName || '—'} · ${num(row.qty)} Bks · ${at('IN_TRANSIT')}` : 'belum disiapkan',
            tone: seen('IN_TRANSIT') ? 'on' : 'off',
        });
        if (req.status === 'DISPUTED') {
            steps.push({ title: 'Dihitung cabang', when: 'ada selisih — cabang dikreditkan sebanyak yang DIHITUNG, bukan yang dikirim', tone: 'bad' });
            steps.push({ title: 'Selisih belum diputuskan', when: 'siapa menanggung?', tone: 'off' });
        } else if (req.status === 'DELIVERED') {
            steps.push({ title: 'Dihitung cabang', when: at('DELIVERED') || 'selesai', tone: 'on' });
            steps.push({ title: 'Masuk stok cabang', when: 'selesai', tone: 'on' });
        } else {
            const stale = row.tone === 'bad';
            steps.push({
                title: 'Dihitung cabang',
                when: stale
                    ? `belum dibuka ${row.days} hari — stok HQ sudah dipotong, stok cabang belum bertambah. Barang ini hilang dari dua-duanya.`
                    : 'belum dibuka',
                tone: stale ? 'bad' : 'off',
                live: !stale && row.live,
            });
            steps.push({ title: 'Masuk stok cabang', when: 'menunggu hitungan', tone: 'off' });
        }
        return steps;
    };

    const currentMonthStr = new Date().toISOString().slice(0,7);
    const monthTargets = targets.filter(t => t.month === currentMonthStr);
    const producedFor = (target) => {
        let total = 0;
        procurements.forEach(po => {
            const poMonth = (po.date || (po.timestamp ? new Date(po.timestamp.seconds * 1000).toISOString() : '')).substring(0, 7);
            if (poMonth === target.month) {
                po.items?.forEach(i => { if (i.id === target.productId) total += (Number(i.qtyReceived) || 0); });
            }
        });
        return total;
    };

    const tabs = [
        { id: 'in',   label: 'Masuk',   count: viewMode === 'in' ? cart.length : 0 },
        { id: 'out',  label: 'Kirim',   count: viewMode === 'out' ? cart.length : bookRows.filter(r => r.dir === 'out' && r.live).length },
        { id: 'req',  label: 'Request', count: requestRows.length },
        { id: 'book', label: 'Buku',    count: bookRows.length },
    ];

    return (
        <div className="h-full text-ink font-sans p-2 relative">

            {viewingImage && (
                <div className="fixed inset-0 z-[300] bg-sunk/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <button onClick={() => setViewingImage(null)} className="absolute top-6 right-6 text-ink-muted hover:text-ink bg-panel p-2 rounded-full border border-line-2"><X size={32}/></button>
                    <img src={viewingImage} alt="Document" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-line-2" />
                </div>
            )}

            {showTargetModal && (
                <div className="fixed inset-0 z-[300] bg-sunk/90 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-panel w-full max-w-md rounded-2xl border border-orange shadow-2xl flex flex-col overflow-hidden animate-pop-in">
                        <div className="p-5 border-b border-line-2 bg-raised flex justify-between items-center">
                            <h3 className="text-lg font-display font-black text-ink uppercase tracking-widest flex items-center gap-2">
                                <Target className="text-accent-ink" size={18}/> Set Production Goal
                            </h3>
                            <button onClick={() => setShowTargetModal(false)} className="text-ink-muted hover:text-ink"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSaveTarget} className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">Select Product</label>
                                <select value={targetForm.productId} onChange={e => setTargetForm({...targetForm, productId: e.target.value})} className="w-full bg-inset border border-line-3 rounded-lg p-3 text-sm text-ink font-bold outline-none focus:border-orange">
                                    <option value="">-- Choose Product --</option>
                                    {inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">Target Quantity (Bks)</label>
                                <input type="number" min="1" value={targetForm.targetQty} onChange={e => setTargetForm({...targetForm, targetQty: e.target.value})} className="w-full bg-inset border border-line-3 rounded-lg p-3 text-sm text-ink font-bold outline-none focus:border-orange"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">Target Month</label>
                                <input type="month" value={targetForm.month} onChange={e => setTargetForm({...targetForm, month: e.target.value})} className="w-full bg-inset border border-line-3 rounded-lg p-3 text-sm text-ink font-bold outline-none focus:border-orange"/>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-orange hover:bg-orange/90 text-orange-ink py-3 rounded-lg font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                {isSubmitting ? <RefreshCcw className="animate-spin" size={16}/> : <Save size={16}/>} Save Target
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {editingOrder && (
                <div className="fixed inset-0 z-[200] bg-sunk/90 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-panel w-full max-w-md rounded-2xl border border-orange shadow-2xl flex flex-col overflow-hidden animate-pop-in">
                        <div className="p-5 border-b border-line-2 bg-raised flex justify-between items-center">
                            <h3 className="text-lg font-display font-black text-ink uppercase tracking-widest flex items-center gap-2">
                                <Pencil className="text-accent-ink" size={18}/> Edit Shipping Data
                            </h3>
                            <button onClick={() => setEditingOrder(null)} className="text-ink-muted hover:text-ink"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">Nama Pengirim (Sender Name)</label>
                                <input type="text" value={editSenderName} onChange={e => setEditSenderName(e.target.value)} className="w-full bg-inset border border-line-3 rounded-lg p-3 text-sm text-ink font-bold outline-none focus:border-orange"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">Logistic Company / Courier</label>
                                <input type="text" value={editCourier} onChange={e => setEditCourier(e.target.value)} className="w-full bg-inset border border-line-3 rounded-lg p-3 text-sm text-ink font-bold outline-none focus:border-orange"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">Nomor Resi / Tracking No</label>
                                <input type="text" value={editTrackingNo} onChange={e => setEditTrackingNo(e.target.value)} className="w-full bg-inset border border-line-3 rounded-lg p-3 text-sm text-accent-ink font-mono font-bold outline-none focus:border-orange uppercase"/>
                            </div>
                        </div>
                        <div className="p-5 border-t border-line-2 bg-raised flex gap-3">
                            <button onClick={handleSaveOrderEdit} disabled={isProcessingOrder} className="flex-1 bg-orange hover:bg-orange/90 text-orange-ink py-3 rounded-lg font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                {isProcessingOrder ? <RefreshCcw className="animate-spin" size={16}/> : <Save size={16}/>} Simpan Perubahan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewingAcceptance && (
                 <div className="fixed inset-0 z-[200] bg-sunk/80 flex items-center justify-center p-4">
                     <style>{`
                         @media print {
                             body * { visibility: hidden; }
                             .print-receipt, .print-receipt * { visibility: visible; }
                             .print-receipt { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none; background: white; }
                             .no-print { display: none !important; }
                         }
                     `}</style>
                     {/* PALETTE EXCEPTION: this card is a printed document, so it is white
                         paper in both themes. The theme tokens deliberately do NOT apply here —
                         --ink-muted is a light warm grey and would print at 2,3:1 on white. */}
                     <div className="print-receipt bg-white text-black w-full max-w-lg shadow-2xl relative flex flex-col font-mono text-sm border-t-8 border-orange animate-fade-in max-h-[90vh] overflow-y-auto">
                         <button onClick={() => setViewingAcceptance(null)} className="no-print absolute top-4 right-4 text-gray-600 hover:text-gray-900"><X size={24}/></button>
                         <div className="p-8">
                             <div className="text-center mb-8 border-b-2 border-dashed border-gray-400 pb-6">
                                 <h2 className="text-2xl font-black uppercase tracking-widest">{viewingAcceptance.supplierName || 'FACTORY PRODUCTION'}</h2>
                                 <p className="text-xs text-gray-600 font-bold mt-1">SURAT JALAN / GOODS RECEIVED NOTE</p>
                                 <div className="mt-4 flex justify-between text-xs text-left bg-gray-100 p-3 rounded">
                                     <div><p className="font-bold text-gray-600">SURAT JALAN:</p><p className="font-bold text-lg">{viewingAcceptance.poNumber}</p></div>
                                     <div className="text-right"><p className="font-bold text-gray-600">DATE:</p><p className="font-bold">{viewingAcceptance.date}</p></div>
                                 </div>
                                 <div className="mt-2 flex justify-between text-xs text-left bg-gray-100 p-3 rounded">
                                     <div><p className="font-bold text-gray-600">ASAL:</p><p className="font-bold">{viewingAcceptance.supplierName || 'Pabrik Internal'}</p></div>
                                     <div className="text-right"><p className="font-bold text-gray-600">TUJUAN:</p><p className="font-bold">{viewingAcceptance.destination || HQ_NAME}</p></div>
                                 </div>
                             </div>

                             <table className="w-full text-xs text-left border-collapse mb-6">
                                 <thead><tr className="border-b-2 border-black"><th className="pb-2">ITEM DESCRIPTION</th><th className="pb-2 text-right">BATCH</th><th className="pb-2 text-right">QTY RECEIVED</th></tr></thead>
                                 <tbody className="divide-y border-b-2 border-black">
                                     {viewingAcceptance.items?.map((i, idx) => (
                                         <tr key={idx}><td className="py-3 font-bold">{i.name}</td><td className="py-3 text-right text-gray-600">{i.batchNo || 'N/A'}</td><td className="py-3 text-right font-bold">{i.qtyReceived}</td></tr>
                                     ))}
                                 </tbody>
                             </table>

                             <div className="flex justify-end mb-8">
                                 <div className="w-1/2 space-y-2 text-xs border-t border-black pt-2">
                                     <div className="flex justify-between"><span className="text-gray-600">Total Wares Base:</span><span>Rp {num(viewingAcceptance.totalBasePrice)}</span></div>
                                     <div className="flex justify-between"><span className="text-gray-600">Shipping/Labor:</span><span>Rp {num((Number(viewingAcceptance.shippingCost)||0) + (Number(viewingAcceptance.laborCost)||0))}</span></div>
                                     <div className="flex justify-between border-b border-dashed border-gray-400 pb-2"><span className="text-gray-600">Tax/Cukai:</span><span>Rp {num(viewingAcceptance.exciseTax || 0)}</span></div>
                                     <div className="flex justify-between font-black text-sm pt-1"><span>TOTAL LANDED VALUE:</span><span>Rp {num(viewingAcceptance.trueLandedTotal)}</span></div>
                                 </div>
                             </div>

                             <div className="grid grid-cols-2 text-center text-xs mt-12 pt-8 gap-8">
                                 <div><p className="mb-12 text-gray-600">Delivered By</p><p className="border-t border-black pt-1 font-bold">Factory Logistics</p></div>
                                 <div><p className="mb-12 text-gray-600">Received & Verified By</p><p className="border-t border-black pt-1 font-bold">{getAdminName()}</p></div>
                             </div>
                         </div>
                         <div className="no-print bg-gray-100 p-4 border-t border-gray-300"><button onClick={() => window.print()} className="w-full bg-black text-white py-4 rounded font-bold uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-gray-800"><Printer size={16}/> Print Document</button></div>
                     </div>
                 </div>
            )}

            {editingPO && (
                <div className="fixed inset-0 z-[100] bg-sunk/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-panel border border-line-2 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl relative custom-scrollbar">
                        <button onClick={() => setEditingPO(null)} className="absolute top-4 right-4 text-ink-muted hover:text-danger-text"><X size={24}/></button>
                        <h2 className="text-xl font-display font-bold text-ink mb-6 uppercase tracking-widest border-b border-line-2 pb-2 flex items-center gap-2"><Pencil className="text-accent-ink"/> Edit Delivery Record</h2>

                        <form onSubmit={handleSaveEditPO} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] text-accent-ink font-bold uppercase tracking-widest">Metadata</h3>
                                    <div><label className="text-xs text-ink-muted">Surat Jalan / Delivery No</label><input value={editingPO.poNumber} onChange={e=>setEditingPO({...editingPO, poNumber: e.target.value})} className="w-full p-2 bg-inset border border-line-2 rounded text-ink" required/></div>
                                    <div><label className="text-xs text-ink-muted">Asal (Source Factory)</label><input value={editingPO.supplierName || ''} onChange={e=>setEditingPO({...editingPO, supplierName: e.target.value})} className="w-full p-2 bg-inset border border-line-2 rounded text-ink"/></div>
                                    <div><label className="text-xs text-ink-muted">Tujuan</label><input value={editingPO.destination || HQ_NAME} onChange={e=>setEditingPO({...editingPO, destination: e.target.value})} className="w-full p-2 bg-inset border border-line-2 rounded text-ink"/></div>
                                    <div><label className="text-xs text-ink-muted">Date</label><input type="date" value={editingPO.date} onChange={e=>setEditingPO({...editingPO, date: e.target.value})} className="w-full p-2 bg-inset border border-line-2 rounded text-ink"/></div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-[10px] text-accent-ink font-bold uppercase tracking-widest">Extra Costs</h3>
                                    <div><label className="text-xs text-ink-muted">Shipping (Rp)</label><input type="number" value={editingPO.shippingCost} onChange={e=>setEditingPO({...editingPO, shippingCost: e.target.value})} className="w-full p-2 bg-inset border border-line-2 rounded text-ink"/></div>
                                    <div><label className="text-xs text-ink-muted">Labor (Rp)</label><input type="number" value={editingPO.laborCost} onChange={e=>setEditingPO({...editingPO, laborCost: e.target.value})} className="w-full p-2 bg-inset border border-line-2 rounded text-ink"/></div>
                                    <div><label className="text-xs text-ink-muted">Tax (Rp)</label><input type="number" value={editingPO.exciseTax} onChange={e=>setEditingPO({...editingPO, exciseTax: e.target.value})} className="w-full p-2 bg-inset border border-line-2 rounded text-ink"/></div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-line-2 mt-4">
                                <h3 className="text-[10px] text-accent-ink font-bold uppercase tracking-widest mb-3">Update Document Proof</h3>
                                <div className="flex flex-col md:flex-row md:items-start gap-4 bg-inset p-3 border border-line-2 rounded">
                                    {editingPO.receiptUrl && !editReceiptFile ? (
                                        <button type="button" onClick={() => setViewingImage(editingPO.receiptUrl)} className="flex items-center gap-2 bg-raised text-accent-ink border border-orange/50 px-3 py-2 rounded text-xs font-bold transition-colors shrink-0">
                                            <ImageIcon size={14}/> View Current
                                        </button>
                                    ) : (
                                        <span className="text-xs text-ink-muted italic shrink-0 mt-2">No previous document.</span>
                                    )}
                                    <div className="flex-1 w-full">
                                        {editReceiptFile ? (
                                            <div className="flex items-center justify-between bg-raised border border-line-2 px-3 py-2 rounded">
                                                <span className="text-xs font-bold text-ink truncate mr-2">{editReceiptFile.name}</span>
                                                <button type="button" onClick={() => setEditReceiptFile(null)} className="text-[10px] bg-danger-well text-danger-text px-2 py-1 rounded uppercase font-bold shrink-0">Remove</button>
                                            </div>
                                        ) : (
                                            <label className="text-xs font-bold text-ink bg-raised hover:bg-inset px-4 py-2 rounded cursor-pointer transition-colors border border-line-2 flex items-center justify-center gap-2 w-full">
                                                <UploadCloud size={14}/> Upload Replacement File
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => setEditReceiptFile(e.target.files[0])}/>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-line-2 pt-4">
                                <h3 className="text-[10px] text-accent-ink font-bold uppercase tracking-widest mb-3">Adjust Batches (Will modify live stock)</h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {editingPO.items.map((item, idx) => (
                                        <div key={item.cartId || item.id} className="flex gap-4 items-center bg-inset p-3 border border-line-2 rounded">
                                            <span className="text-xs text-ink font-bold flex-1 truncate">{item.name}</span>
                                            <div className="w-32"><label className="text-[11px] text-ink-muted">Batch No</label><input type="text" value={item.batchNo || ''} onChange={e=>{ const newItems = [...editingPO.items]; newItems[idx].batchNo = e.target.value; setEditingPO({...editingPO, items: newItems}); }} className="w-full p-1.5 bg-raised border border-line-2 rounded text-ink text-center uppercase font-mono"/></div>
                                            <div className="w-32"><label className="text-[11px] text-ink-muted">Qty Received</label><input type="number" value={item.qtyReceived} onChange={e=>{ const newItems = [...editingPO.items]; newItems[idx].qtyReceived = e.target.value; setEditingPO({...editingPO, items: newItems}); }} className="w-full p-1.5 bg-raised border border-line-2 rounded text-ink font-mono text-center"/></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" disabled={isSubmitting} className={`w-full font-bold py-3 rounded-lg uppercase tracking-widest transition-colors flex justify-center items-center gap-2 ${isSubmitting ? 'bg-inset text-ink-muted cursor-not-allowed' : 'bg-orange hover:bg-orange/90 text-orange-ink active:scale-[0.98]'}`}>
                                {isSubmitting ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
                                {isSubmitting ? "Saving..." : "Save All Changes"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════ REQUEST — the shipping modal ═══════════
                The one part of the old Global Logistics queue that had to travel rather than be
                reused: everything else on this tab is the Buku row and drawer. Repainted onto the
                theme on the way over — the original was `text-white` on `bg-black/50`, which is
                exactly the hardcoding that kept light mode off this screen for months. */}
            {isFulfilling && (
                <div className="fixed inset-0 z-[300] bg-sunk/95 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-panel w-full max-w-4xl rounded-2xl border border-orange shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-pop-in">

                        <div className="p-5 border-b border-line-2 bg-raised flex justify-between items-start gap-4 shrink-0">
                            <div className="min-w-0">
                                <h3 className="text-lg font-display font-black text-ink uppercase tracking-widest flex items-center gap-2">
                                    <Truck className="text-accent-ink shrink-0" size={18}/> Siapkan pengiriman ke {isFulfilling.branch}
                                </h3>
                                <p className="text-[10px] text-ink-muted uppercase tracking-widest mt-1 font-mono">{isFulfilling.id} · diminta {isFulfilling.requestedByName || (isFulfilling.requestedBy || '').split('@')[0] || '—'}</p>
                            </div>
                            <button onClick={cancelFulfillment} aria-label="Tutup" className="text-ink-muted hover:text-ink shrink-0"><X size={20}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6">

                            <div className="bg-inset border border-line-2 rounded-xl p-4">
                                <h4 className="text-[10px] text-ink-muted font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><MapPin size={13}/> Alamat tujuan</h4>
                                <p className="text-ink text-sm font-display font-bold uppercase tracking-wider">Gudang {isFulfilling.branch}</p>
                                {isFulfilling.deliveryAddress ? (
                                    <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                                        {isFulfilling.deliveryAddress.jalan}<br/>
                                        Kec. {isFulfilling.deliveryAddress.kecamatan}, {isFulfilling.deliveryAddress.kabupaten}<br/>
                                        {isFulfilling.deliveryAddress.provinsi} - {isFulfilling.deliveryAddress.postalCode}
                                    </p>
                                ) : (
                                    <p className="text-xs text-danger-text mt-2 border border-danger-rail bg-danger-well px-2.5 py-1.5 rounded inline-block">Cabang belum mengisi alamat lengkap.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest flex items-center gap-2"><FileText size={13}/> Wajib diisi</h4>
                                    <input type="text" placeholder="Nama pengirim" value={shipSender} onChange={e => setShipSender(e.target.value)} className="w-full bg-inset border border-line-3 rounded-lg p-3 text-sm text-ink font-bold outline-none focus:border-orange"/>
                                    <input type="text" placeholder="Kurir / ekspedisi (mis. J&T, internal)" value={shipCourier} onChange={e => setShipCourier(e.target.value)} className="w-full bg-inset border border-line-3 rounded-lg p-3 text-sm text-ink font-bold outline-none focus:border-orange"/>
                                    <input type="text" placeholder="Nomor resi" value={shipResi} onChange={e => setShipResi(e.target.value)} className="w-full bg-inset border border-line-3 rounded-lg p-3 text-sm text-accent-ink font-mono font-bold outline-none focus:border-orange uppercase tracking-wider"/>
                                    <div className="bg-danger-well border border-danger-rail rounded-lg p-3 text-danger-text text-[11px] flex gap-2.5 items-start leading-relaxed">
                                        <AlertCircle size={22} className="shrink-0 mt-0.5"/>
                                        <p><b className="uppercase block">Kenapa wajib:</b> resi dan foto adalah satu-satunya bukti barang benar keluar. Tanpa itu, selisih di cabang tidak bisa ditagihkan ke siapa pun.</p>
                                    </div>
                                </div>

                                <div className="bg-inset p-4 rounded-xl border border-line-2 flex flex-col items-center">
                                    <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3 flex items-center gap-1.5"><Camera size={12}/> Foto paket + resi</h4>
                                    {shipPhotoPreview ? (
                                        <div className="w-full relative">
                                            <img src={shipPhotoPreview} alt="Bukti paket" className="w-full h-44 object-cover rounded-lg border border-orange"/>
                                            <button onClick={() => { setShipPhotoFile(null); setShipPhotoPreview(null); }} aria-label="Hapus foto" className="absolute -top-2 -right-2 bg-panel border border-line-2 rounded-full p-1 text-danger-text"><X size={14}/></button>
                                        </div>
                                    ) : (
                                        <label className="w-full h-44 bg-raised rounded-lg border-2 border-dashed border-line-3 flex flex-col items-center justify-center text-ink-muted hover:border-orange hover:text-ink transition-colors gap-2.5 p-4 text-center cursor-pointer">
                                            <UploadCloud size={34} className="opacity-50"/>
                                            <span className="font-display font-bold text-[11px] uppercase tracking-widest">{galleryOk ? 'ambil / pilih foto' : 'ambil foto'}</span>
                                            <span className="text-[10px] opacity-70">Foto paket yang resinya sudah tertempel.</span>
                                            <input type="file" accept="image/*" {...(galleryOk ? {} : { capture: 'environment' })} className="hidden" onChange={handleShipPhoto}/>
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3 flex items-center gap-2"><Pencil size={13}/> Jumlah yang benar-benar dikirim</h4>
                                <div className="space-y-2.5">
                                    {fulfillmentCart.map(item => {
                                        const hq = inventory.find(p => p.id === item.productId);
                                        const hqStock = hq?.stock || 0;
                                        const enough = hqStock >= item.qty;
                                        const asked = (isFulfilling.requestedItems || isFulfilling.items || []).find(r => r.productId === item.productId)?.qty || 0;
                                        return (
                                            <div key={item.productId} className="bg-inset p-3 rounded-lg border border-line-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                <div className="min-w-0">
                                                    <span className="font-bold text-ink uppercase text-sm">{item.name}</span>
                                                    <div className="flex gap-4 text-[10px] mt-1 font-mono">
                                                        <span className="text-ink-muted uppercase tracking-widest">Diminta {num(asked)} Bks</span>
                                                        <span className={`font-bold uppercase tracking-widest ${enough ? 'text-ink-muted' : 'text-danger-text'}`}>Stok HQ {num(hqStock)} Bks</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 bg-panel px-2.5 py-1.5 rounded-lg border border-line-2 w-full sm:w-40 shrink-0">
                                                    <label className="text-[10px] text-ink-muted font-bold uppercase tracking-widest shrink-0">Kirim</label>
                                                    <input type="number" min="1" value={item.qty} onChange={e => updateFulfillQty(item.productId, e.target.value)} className="flex-1 min-w-0 bg-transparent text-right font-mono font-black text-accent-ink text-base outline-none"/>
                                                    <span className="text-[10px] text-ink-muted shrink-0">Bks</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-line-2 bg-raised flex flex-col sm:flex-row gap-3 shrink-0">
                            <button onClick={handleShipItems} disabled={isShipping} className={`flex-1 py-3.5 rounded-lg font-display font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-transform active:scale-[0.98] ${isShipping ? 'bg-inset text-ink-muted cursor-not-allowed' : 'bg-orange hover:bg-orange/90 text-orange-ink'}`}>
                                {isShipping ? <RefreshCcw className="animate-spin" size={16}/> : <Send size={16}/>}
                                {isShipping ? 'Mengirim...' : 'Konfirmasi & kirim barang'}
                            </button>
                            <button onClick={handleRejectRequest} disabled={isShipping} className="w-full sm:w-auto px-6 py-3.5 bg-danger-well border border-danger-rail text-danger-text rounded-lg font-display font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
                                <X size={14}/> Tolak
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ THE DESK ═══════════ */}
            <div className="h-full flex flex-col bg-ground border border-line-2 rounded-2xl overflow-hidden">

                {/* ONE nav. Same destinations, same place, in every mode. */}
                <div className="flex items-stretch bg-panel border-b border-line-2 flex-wrap shrink-0">
                    <div className="flex items-center gap-2.5 px-4 py-2.5 border-r border-line-2 flex-1 min-w-[210px]">
                        <Lamp tone="on" />
                        <div className="min-w-0">
                            <div className="font-display font-bold uppercase tracking-[0.15em] text-[13px] text-ink truncate">
                                {viewMode === 'req' ? 'Permintaan cabang' : viewMode === 'book' ? 'Buku Besar' : isOut ? 'Kirim ke cabang' : 'Master Vault'}
                            </div>
                            <div className="font-mono text-[10px] text-ink-muted truncate">
                                {viewMode === 'req' ? 'menunggu · di jalan · selisih' : viewMode === 'book' ? 'masuk & keluar' : isOut ? 'surat jalan keluar' : 'HQ · gudang pusat'}
                            </div>
                        </div>
                    </div>
                    <div className="flex">
                        {tabs.map(t => (
                            <button
                                key={t.id}
                                onClick={() => (t.id === 'book' || t.id === 'req') ? setViewMode(t.id) : setDirection(t.id)}
                                aria-selected={viewMode === t.id}
                                className={`text-[11px] font-display font-bold uppercase tracking-[0.16em] px-4 py-3 border-l border-line-2 border-b-2 transition-colors ${
                                    viewMode === t.id ? 'text-ink border-b-orange bg-raised' : 'text-ink-muted border-b-transparent hover:text-ink'
                                }`}
                            >
                                {t.label}<span className="ml-1.5 font-mono text-[10px] text-ink-muted">{t.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ═══════════ BUKU — and REQUEST, which is the same list filtered ═══════════
                    One row renderer, two tabs. The Request queue is not a second list: it is
                    `bookRows` narrowed to the outbound documents that are still open, so a row
                    opens the same drawer, prints the same timeline and carries the same "Edit
                    resi" and "Hapus" it does in the book. The ONLY thing Request adds is the
                    Siapkan button and the shipping modal behind it. */}
                {viewMode === 'book' || viewMode === 'req' ? (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex gap-2 flex-wrap items-center px-4 py-3 border-b border-line-2 bg-panel shrink-0">
                            {viewMode === 'req' ? (
                                <>
                                    <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mr-auto">Permintaan cabang · yang belum selesai</span>
                                    {[['DISPUTED','Ada selisih'],['PENDING','Menunggu'],['IN_TRANSIT','Di jalan']].map(([k, label]) => {
                                        const n = requestRows.filter(r => r.raw?.status === k).length;
                                        return (
                                            <span key={k} className={`text-[11px] font-display font-bold uppercase tracking-widest px-3 py-1.5 rounded border ${n === 0 ? 'border-line-2 text-ink-muted bg-raised' : k === 'DISPUTED' ? 'border-danger-rail text-danger-text bg-danger-well' : 'border-orange text-ink bg-raised'}`}>
                                                {label} <span className="font-mono ml-1">{n}</span>
                                            </span>
                                        );
                                    })}
                                </>
                            ) : (
                                <>
                                    <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mr-auto">Buku besar · masuk &amp; keluar</span>
                                    {[['all','Semua'],['in','Masuk'],['out','Keluar']].map(([k, label]) => (
                                        <button key={k} onClick={() => setBookFilter(k)}
                                            className={`text-[11px] font-display font-bold uppercase tracking-widest px-3 py-1.5 rounded border transition-transform active:scale-[0.97] ${bookFilter === k ? 'border-orange text-ink bg-raised' : 'border-line-2 text-ink-muted bg-raised hover:text-ink'}`}>
                                            {label}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {shownRows.length === 0 ? (
                                <div className="text-center py-20 text-ink-muted">
                                    {viewMode === 'req'
                                        ? <><Truck size={48} className="mx-auto mb-4 opacity-20"/><p className="tracking-widest uppercase text-sm font-bold opacity-50">Tidak ada permintaan terbuka</p><p className="text-[11px] mt-1.5 opacity-50">Semua permintaan cabang sudah dikirim atau sudah diterima.</p></>
                                        : <><History size={48} className="mx-auto mb-4 opacity-20"/><p className="tracking-widest uppercase text-sm font-bold opacity-50">Belum ada catatan</p></>}
                                </div>
                            ) : shownRows.map(row => {
                                const open = expandedPO === row.key;
                                const po = row.raw;
                                const lines = row.dir === 'in' ? (po.items || []) : (po.fulfilledItems || po.requestedItems || []);
                                const extra = row.dir === 'in' ? (Number(po.shippingCost)||0) + (Number(po.laborCost)||0) + (Number(po.exciseTax)||0) : 0;
                                return (
                                    <div key={row.key} className="border-b border-line-2 last:border-b-0 animate-fade-in">
                                      <div className="flex items-stretch">
                                        <button
                                            onClick={() => setExpandedPO(open ? null : row.key)}
                                            aria-expanded={open}
                                            className={`flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-left border-l-2 transition-colors ${open ? 'bg-raised border-l-orange' : 'bg-panel border-l-transparent hover:bg-raised hover:border-l-orange'}`}
                                        >
                                            <Lamp tone={row.tone} live={row.live && row.tone !== 'bad'} />
                                            <span className="font-mono text-[15px] text-ink-muted w-4 text-center shrink-0">{row.dir === 'in' ? '↓' : '↑'}</span>
                                            <span className="flex-1 min-w-0 font-mono text-[13px] text-ink">
                                                <span className="block truncate">{row.from} → {row.to}</span>
                                                <span className="block text-[10px] text-ink-muted mt-0.5 truncate">{row.id} · {num(row.qty)} Bks · {rp(row.value)} · {row.day}</span>
                                            </span>
                                            <span className={`hidden sm:inline-flex items-center text-[10px] font-display font-bold uppercase tracking-widest border rounded px-2 py-1 whitespace-nowrap ${row.tone === 'bad' ? 'border-danger text-danger-text' : row.tone === 'on' ? 'border-orange text-ink' : 'border-line-2 text-ink-muted'}`}>{row.status}</span>
                                            <ChevronDown size={16} className={`text-ink-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* ⚠️ A SIBLING of the row button, never a child. A <button> inside a
                                            <button> is invalid HTML and the inner one stops taking clicks —
                                            which is why the row had to become a flex pair rather than just
                                            gaining an icon. Worth the two extra lines: Siapkan Pengiriman was
                                            one click in the old panel and it stays one click here. */}
                                        {viewMode === 'req' && po.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleStartFulfillment(po)}
                                                className="shrink-0 px-3.5 bg-orange hover:bg-orange/90 text-orange-ink font-display font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5 transition-transform active:scale-[0.97]"
                                            >
                                                <Truck size={13}/> <span className="hidden sm:inline">Siapkan</span>
                                            </button>
                                        )}
                                      </div>

                                        {open && (
                                            <div className="bg-inset px-4 py-4 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 items-start animate-fade-in">
                                                <div className="min-w-0">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2.5 mb-3">
                                                        {[
                                                            ['Delivery note', row.id],
                                                            ['Delivery note (factory)', po.supplierSjNo || '—'],
                                                            ['Tanggal', row.day],
                                                            ['Asal', row.from],
                                                            ['Tujuan', row.to],
                                                            ['Kurir', po.courier || '—'],
                                                            ['No. Resi', po.trackingNo || '—'],
                                                            ['Dicatat oleh', po.recordedBy || po.senderName || '—'],
                                                        ].map(([k, v]) => (
                                                            <div key={k} className="min-w-0">
                                                                <span className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest">{k}</span>
                                                                <b className="font-mono text-[12.5px] font-medium text-ink break-words">{v}</b>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="overflow-x-auto border border-line-2 rounded-lg bg-panel">
                                                        <table className="w-full text-[12.5px]">
                                                            <thead>
                                                                <tr className="bg-raised">
                                                                    <th className="text-left text-[10px] font-bold text-ink-muted uppercase tracking-widest px-3 py-2 border-b border-line-2">Barang</th>
                                                                    <th className="text-left text-[10px] font-bold text-ink-muted uppercase tracking-widest px-3 py-2 border-b border-line-2">Batch</th>
                                                                    <th className="text-right text-[10px] font-bold text-ink-muted uppercase tracking-widest px-3 py-2 border-b border-line-2">Jumlah</th>
                                                                    <th className="text-right text-[10px] font-bold text-ink-muted uppercase tracking-widest px-3 py-2 border-b border-line-2">@ Landed</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {lines.map((l, i) => {
                                                                    const q = Number(l.qtyReceived ?? l.qty) || 0;
                                                                    const base = Number(l.basePrice) || Number(inventory.find(p => p.id === (l.id || l.productId))?.priceDistributor) || 0;
                                                                    const per = row.qty > 0 ? base + extra / row.qty : base;
                                                                    return (
                                                                        <tr key={i} className="border-b border-line-2 last:border-b-0">
                                                                            <td className="px-3 py-2 text-ink font-bold">{l.name}</td>
                                                                            <td className="px-3 py-2 font-mono text-ink-muted">{l.batchNo || 'UNASSIGNED'}</td>
                                                                            <td className="px-3 py-2 font-mono text-right text-ink">{num(q)}</td>
                                                                            <td className="px-3 py-2 font-mono text-right text-ink">{rp(per)}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 font-mono text-[12px] text-ink-muted">
                                                        <span>Nilai barang <b className="text-ink whitespace-nowrap">{rp(row.dir === 'in' ? (po.totalBasePrice || 0) : row.value)}</b></span>
                                                        {row.dir === 'in' && <>
                                                            <span>Ongkos kirim <b className="text-ink whitespace-nowrap">{rp(po.shippingCost)}</b></span>
                                                            <span>Pita cukai <b className="text-ink whitespace-nowrap">{rp(po.exciseTax)}</b></span>
                                                            <span>Upah bongkar <b className="text-ink whitespace-nowrap">{rp(po.laborCost)}</b></span>
                                                        </>}
                                                        <span>Total <b className="text-ink whitespace-nowrap">{rp(row.value)}</b></span>
                                                        <span>Landed <b className="text-accent-ink whitespace-nowrap">{row.qty > 0 ? rp(row.value / row.qty) : '—'} / Bks</b></span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {po.packagePhotoUrl ? (
                                                            <button onClick={() => setViewingImage(po.packagePhotoUrl)} className="text-[10px] font-display font-bold uppercase tracking-widest border border-orange text-ink rounded px-2.5 py-1.5 bg-raised transition-transform active:scale-[0.97]">✓ Foto barang</button>
                                                        ) : <span className="text-[10px] font-display font-bold uppercase tracking-widest border border-line-2 text-ink-muted rounded px-2.5 py-1.5">Foto barang</span>}
                                                        {po.receiptUrl ? (
                                                            <button onClick={() => setViewingImage(po.receiptUrl)} className="text-[10px] font-display font-bold uppercase tracking-widest border border-orange text-ink rounded px-2.5 py-1.5 bg-raised transition-transform active:scale-[0.97]">✓ Nota</button>
                                                        ) : <span className="text-[10px] font-display font-bold uppercase tracking-widest border border-line-2 text-ink-muted rounded px-2.5 py-1.5">Nota</span>}
                                                        <span className={`text-[10px] font-display font-bold uppercase tracking-widest border rounded px-2.5 py-1.5 ${po.trackingNo && po.trackingNo !== '-' ? 'border-orange text-ink' : 'border-line-2 text-ink-muted'}`}>{po.trackingNo && po.trackingNo !== '-' ? '✓ ' : ''}Resi</span>

                                                        {row.dir === 'in' ? (
                                                            <>
                                                                <button onClick={() => setViewingAcceptance(po)} className="text-[10px] font-display font-bold uppercase tracking-widest border border-line-2 text-ink rounded px-2.5 py-1.5 bg-raised hover:border-line-3 transition-transform active:scale-[0.97] flex items-center gap-1.5"><Printer size={12}/> Cetak</button>
                                                                <button onClick={() => { setEditingPO({ ...po, items: po.items.map(i => ({...i})) }); setEditReceiptFile(null); }} className="text-[10px] font-display font-bold uppercase tracking-widest border border-line-2 text-ink rounded px-2.5 py-1.5 bg-raised hover:border-line-3 transition-transform active:scale-[0.97] flex items-center gap-1.5"><Pencil size={12}/> Edit</button>
                                                                <button onClick={() => handleDeletePO(po)} className="text-[10px] font-display font-bold uppercase tracking-widest border border-danger-rail text-danger-text rounded px-2.5 py-1.5 bg-danger-well transition-transform active:scale-[0.97] flex items-center gap-1.5"><Trash2 size={12}/> Hapus</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleStartEditingOrder(po)} className="text-[10px] font-display font-bold uppercase tracking-widest border border-line-2 text-ink rounded px-2.5 py-1.5 bg-raised hover:border-line-3 transition-transform active:scale-[0.97] flex items-center gap-1.5"><Pencil size={12}/> Edit resi</button>
                                                                <button onClick={() => handleDeleteRequest(po.id)} className="text-[10px] font-display font-bold uppercase tracking-widest border border-danger-rail text-danger-text rounded px-2.5 py-1.5 bg-danger-well transition-transform active:scale-[0.97] flex items-center gap-1.5"><Trash2 size={12}/> Hapus</button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <Proses steps={stepsFor(row)} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (

                /* ═══════════ THE FORM — Masuk and Kirim are the same document ═══════════ */
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-[262px_1fr] min-h-0">

                    <aside className="border-b lg:border-b-0 lg:border-r border-line-2 bg-panel flex flex-col min-h-0">
                        <div className="p-2.5 border-b border-line-2">
                            <div className="relative">
                                <Search size={15} className="absolute left-2.5 top-2.5 text-ink-muted" />
                                <input
                                    type="text" placeholder="CARI BARANG..." value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && filteredInventory[0]) addToCart(filteredInventory[0]); }}
                                    className="w-full bg-inset border border-line-2 rounded-lg py-2 pl-8 pr-3 text-xs font-mono uppercase text-ink focus:border-orange outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[40vh] lg:max-h-none">
                            {filteredInventory.length === 0 ? (
                                <div className="px-3 py-6 text-xs text-ink-muted">Tidak ada barang bernama itu.</div>
                            ) : filteredInventory.map(item => {
                                const inCart = cart.some(c => c.id === item.id);
                                return (
                                    <button
                                        key={item.id} onClick={() => addToCart(item)} type="button"
                                        className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 border-b border-line-2 border-l-2 transition-all hover:bg-raised hover:translate-x-0.5 active:scale-[0.99] ${inCart ? 'border-l-orange' : 'border-l-transparent hover:border-l-orange'}`}
                                    >
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-[13.5px] font-bold text-ink leading-tight truncate">{item.name}</span>
                                            <span className="block font-mono text-[10.5px] text-ink-muted mt-0.5">
                                                {isOut ? `di gudang ${num(item.stock)}` : `stok ${num(item.stock)} Bks · ${rp(item.priceDistributor)}`}
                                            </span>
                                        </span>
                                        <span className="text-[10.5px] font-display font-bold border border-line-2 rounded px-1.5 py-0.5 text-ink-muted">+</span>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    <div className="flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3.5">

                            {/* 🔴 THE PANEL FINALLY HAS A NAME. His note, 2026-08-27: *"we need panel
                                name for every section, we dont have this panel name for sc1, so name
                                it"* — and he was right, this form had a tab above it and nothing
                                naming the form itself. "Goods Received" is the standard warehouse
                                term for recording an arrival, it is two plain words, and it cannot
                                be read as Kirim (going out) or Request (asking for).
                                The tutorial chip sits on the intake side only, because that is the
                                side with a scene written for it. */}
                            <div className="flex items-end justify-between gap-3 pb-1">
                                <div className="min-w-0">
                                    <h3 className="font-display text-lg sm:text-xl font-black text-ink uppercase tracking-[0.14em] leading-none">
                                        {isOut ? 'Shipment Out' : 'Goods Received'}
                                    </h3>
                                    <div className="h-[3px] w-9 bg-orange rounded-full mt-2"/>
                                    <p className="font-mono text-[10px] text-ink-muted tracking-widest mt-2">
                                        {isOut ? 'keluar ke cabang · in Bks' : 'masuk dari pabrik · in Bks'}
                                    </p>
                                </div>
                                {!isOut && <PonderButton sceneId="goods-received" />}
                            </div>

                            {/* Target: kept as data, demoted from a whole tab to one strip. */}
                            {!isOut && (
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Target produksi bulan ini</span>
                                        <button onClick={() => setShowTargetModal(true)} className="text-[10px] font-display font-bold uppercase tracking-widest text-accent-ink flex items-center gap-1 hover:underline"><PlusCircle size={11}/> Set</button>
                                    </div>
                                    {monthTargets.length === 0 ? (
                                        <div className="border border-line-2 rounded-lg bg-panel px-3 py-2 text-xs text-ink-muted">Belum ada target bulan ini.</div>
                                    ) : (
                                        <div className="flex flex-wrap border border-line-2 rounded-lg overflow-hidden">
                                            {monthTargets.map(t => {
                                                const made = producedFor(t);
                                                const pct = t.targetQty > 0 ? Math.min(100, Math.round(made / t.targetQty * 100)) : 0;
                                                const behind = pct < 50;
                                                return (
                                                    <div key={t.id} className="flex-1 min-w-[148px] px-3 py-2 border-r border-line-2 last:border-r-0 bg-panel group relative">
                                                        <button onClick={() => handleDeleteTarget(t.id)} className="absolute top-1 right-1.5 text-ink-muted hover:text-danger-text opacity-0 group-hover:opacity-100 transition-opacity" title="Hapus target"><X size={11}/></button>
                                                        <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink truncate pr-4"><Lamp tone={behind ? 'bad' : 'on'} />{t.name}</div>
                                                        <div className="font-mono text-[10.5px] text-ink-muted mb-1">{num(made)} / {num(t.targetQty)} Bks · {pct}%</div>
                                                        <div className="h-[3px] bg-inset rounded overflow-hidden"><div className="h-full bg-orange transition-[width] duration-500" style={{ width: `${pct}%` }}/></div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* THE ROUTE — the field that makes one form do both jobs */}
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_44px_1fr] gap-2 items-end">
                                <RouteCombo
                                    label="Asal" flag value={poData.supplierName}
                                    onChange={v => setPoData({ ...poData, supplierName: v })}
                                    options={placeOptions} placeholder="cari atau ketik..."
                                />
                                <button type="button" onClick={swapRoute} title="Tukar asal dan tujuan" aria-label="Tukar asal dan tujuan"
                                    className="h-[42px] w-full border border-line-2 bg-raised rounded-lg text-ink flex items-center justify-center hover:border-orange transition-all active:scale-95">
                                    <ArrowLeftRight size={16}/>
                                </button>
                                <RouteCombo
                                    label="Tujuan" flag value={poData.destination}
                                    onChange={v => setPoData({ ...poData, destination: v })}
                                    options={placeOptions} placeholder="cari atau ketik..."
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">Delivery note (app)</label>
                                    <input type="text" value={poData.poNumber} onChange={e => setPoData({...poData, poNumber: e.target.value})} className="w-full bg-inset border border-line-2 rounded-lg p-2.5 text-sm text-ink font-mono outline-none focus:border-orange transition-colors" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">{isOut ? 'Delivery note (paper)' : 'Delivery note (factory)'}</label>
                                    {/* the number printed on the paper in your hand. Without it, paper and app can never be matched. */}
                                    <input type="text" value={poData.supplierSjNo} onChange={e => setPoData({...poData, supplierSjNo: e.target.value})} placeholder="copy from the paper" className="w-full bg-inset border border-line-2 rounded-lg p-2.5 text-sm text-ink font-mono outline-none focus:border-orange transition-colors" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">Tanggal</label>
                                    <input type="date" value={poData.poDate} onChange={e => setPoData({...poData, poDate: e.target.value})} className="w-full bg-inset border border-line-2 rounded-lg p-2.5 text-sm text-ink font-mono outline-none focus:border-orange transition-colors" />
                                </div>
                            </div>

                            {/* THE LINES — batch is a column, not a box in a corner */}
                            <div className="overflow-x-auto border border-line-2 rounded-lg bg-panel">
                                <table className="w-full text-sm min-w-[520px]">
                                    <thead>
                                        <tr className="bg-raised">
                                            <th className="text-left text-[10px] font-bold text-ink-muted uppercase tracking-widest px-3 py-2 border-b border-line-2">Barang</th>
                                            <th className="text-left text-[10px] font-bold text-ink-muted uppercase tracking-widest px-3 py-2 border-b border-line-2 w-[130px]">Batch</th>
                                            <th className="text-right text-[10px] font-bold text-ink-muted uppercase tracking-widest px-3 py-2 border-b border-line-2 w-[110px]">Jumlah</th>
                                            <th className="text-right text-[10px] font-bold text-ink-muted uppercase tracking-widest px-3 py-2 border-b border-line-2">@ Landed</th>
                                            <th className="px-3 py-2 border-b border-line-2 w-[44px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cart.length === 0 ? (
                                            <tr><td colSpan={5} className="px-3 py-8 text-ink-muted text-sm">Belum ada barang. Cari dan klik salah satu di kiri.</td></tr>
                                        ) : cart.map(item => {
                                            const per = totalItemsReceived > 0 ? (Number(item.basePrice)||0) + extraCosts / totalItemsReceived : 0;
                                            const prev = lastLanded[item.id];
                                            const drift = prev && prev.unit > 0 && per > 0 ? (per - prev.unit) / prev.unit * 100 : null;
                                            return (
                                                <tr key={item.cartId} className="border-b border-line-2 last:border-b-0 animate-fade-in">
                                                    <td className="px-3 py-2 text-ink font-bold">{item.name}</td>
                                                    <td className="px-3 py-2">
                                                        <input type="text" value={item.batchNo || ''} onChange={e => updateCartItem(item.cartId, 'batchNo', e.target.value.toUpperCase())} placeholder="08-B" className="w-full bg-inset border border-line-2 rounded p-1.5 text-xs text-ink font-mono uppercase outline-none focus:border-orange transition-colors"/>
                                                    </td>
                                                    {/* THE MINIMUM SITS UNDER THE BOX IT IS ABOUT — same
                                                        placement argument as the price drift under @ Landed.
                                                        A number in a neighbouring column is a number he has
                                                        to pair up himself.
                                                        It goes RED only when what he typed is genuinely below
                                                        the floor, because a warning that is always on is a
                                                        warning nobody reads. Blank box = no warning yet: he
                                                        has not answered, so there is nothing to be wrong. */}
                                                    <td className="px-3 py-2">
                                                        <input type="number" min="0" value={item.qtyReceived} onChange={e => updateCartItem(item.cartId, 'qtyReceived', e.target.value)} placeholder="0" className="w-full bg-inset border border-line-2 rounded p-1.5 text-xs text-ink font-mono text-right outline-none focus:border-orange transition-colors"/>
                                                        {(() => {
                                                            const adv = sendAdvice[item.id];
                                                            if (!adv) return null;
                                                            const typed = Number(item.qtyReceived);
                                                            const short = adv.suggest != null && Number.isFinite(typed) && item.qtyReceived !== '' && typed < adv.suggest;
                                                            return (
                                                                <span className={`block font-mono text-[10.5px] mt-1 text-right leading-snug ${short ? 'text-danger-text' : 'text-ink-muted'}`}>
                                                                    {adv.suggest != null
                                                                        ? <>minimal <b className={short ? 'text-danger-text' : 'text-ink'}>{num(adv.suggest)}</b>{adv.spareDays > 0 && <span className="opacity-70"> · +{adv.spareDays}h</span>}</>
                                                                        : <span className="opacity-70">belum terukur</span>}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    {/* the drift sits UNDER the landed figure, because that is the figure it compares */}
                                                    <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                                                        <span className="block text-ink">{per > 0 ? rp(per) : '—'}</span>
                                                        {drift !== null && (
                                                            <span className={`block text-[10.5px] mt-0.5 ${Math.abs(drift) < 0.05 ? 'text-ink-muted' : drift > 0 ? 'text-danger-text' : 'text-accent-ink'}`}>
                                                                {Math.abs(drift) < 0.05 ? `sama · ${prev.batchNo}` : `${drift > 0 ? '+' : ''}${drift.toFixed(1).replace('.', ',')}% vs ${prev.batchNo}`}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <button onClick={() => removeFromCart(item.cartId)} aria-label={`Keluarkan ${item.name}`} className="text-ink-muted hover:text-danger-text transition-transform active:scale-90"><X size={15}/></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* COSTS — cukai and upah are an intake cost only */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">Ongkos kirim</label>
                                    <input type="number" min="0" value={poData.shippingCost || ''} onChange={e => setPoData({...poData, shippingCost: e.target.value})} placeholder="0" className="w-full bg-inset border border-line-2 rounded-lg p-2.5 text-sm text-ink font-mono outline-none focus:border-orange transition-colors" />
                                </div>
                                {!isOut && <>
                                    <div>
                                        <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">Pita cukai</label>
                                        <input type="number" min="0" value={poData.exciseTax || ''} onChange={e => setPoData({...poData, exciseTax: e.target.value})} placeholder="0" className="w-full bg-inset border border-line-2 rounded-lg p-2.5 text-sm text-ink font-mono outline-none focus:border-orange transition-colors" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">Upah bongkar</label>
                                        <input type="number" min="0" value={poData.laborCost || ''} onChange={e => setPoData({...poData, laborCost: e.target.value})} placeholder="0" className="w-full bg-inset border border-line-2 rounded-lg p-2.5 text-sm text-ink font-mono outline-none focus:border-orange transition-colors" />
                                    </div>
                                </>}
                            </div>

                            {/* EVIDENCE — photo, nota, resi */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                <div className={`border rounded-lg bg-panel p-2.5 flex flex-col gap-1.5 transition-colors ${packageFile ? 'border-orange' : 'border-line-2'}`}>
                                    <div className="flex items-center gap-2"><Lamp tone={packageFile ? 'on' : 'off'} /><span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Bukti foto barang</span></div>
                                    {packageFile ? (
                                        <div className="flex items-center justify-between gap-2 h-11 px-2 border border-orange rounded bg-inset">
                                            <span className="text-[11px] font-mono text-ink truncate">{packageFile.name}</span>
                                            <button onClick={() => setPackageFile(null)} className="text-[10px] font-bold uppercase text-danger-text shrink-0">Hapus</button>
                                        </div>
                                    ) : (
                                        <label className="h-11 border border-dashed border-line-3 rounded bg-inset flex items-center justify-center gap-2 cursor-pointer text-[10.5px] font-mono text-ink-muted hover:border-orange hover:text-ink transition-colors">
                                            <Camera size={13}/> {galleryOk ? 'ambil / pilih foto' : 'ambil foto'}
                                            <input type="file" accept="image/*" {...(galleryOk ? {} : { capture: 'environment' })} className="hidden" onChange={e => setPackageFile(e.target.files[0])}/>
                                        </label>
                                    )}
                                </div>

                                {/* NOT disabled on Kirim. It used to be, and a dead grey box that never
                                    says why is the silence he calls a bug. An internal transfer usually
                                    has no supplier nota, so here it is simply optional — never blocked. */}
                                <div className={`border rounded-lg bg-panel p-2.5 flex flex-col gap-1.5 transition-colors ${receiptFile ? 'border-orange' : 'border-line-2'}`}>
                                    <div className="flex items-center gap-2"><Lamp tone={receiptFile ? 'on' : 'off'} /><span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Nota / faktur{isOut && <span className="normal-case tracking-normal"> · opsional</span>}</span></div>
                                    {receiptFile ? (
                                        <div className="flex items-center justify-between gap-2 h-11 px-2 border border-orange rounded bg-inset">
                                            <span className="text-[11px] font-mono text-ink truncate">{receiptFile.name}</span>
                                            <button onClick={() => setReceiptFile(null)} className="text-[10px] font-bold uppercase text-danger-text shrink-0">Hapus</button>
                                        </div>
                                    ) : (
                                        <label className="h-11 border border-dashed border-line-3 rounded bg-inset flex items-center justify-center gap-2 cursor-pointer text-[10.5px] font-mono text-ink-muted hover:border-orange hover:text-ink transition-colors">
                                            <FileText size={13}/> {galleryOk ? 'ambil / pilih nota' : 'foto nota'}
                                            <input type="file" accept="image/*" {...(galleryOk ? {} : { capture: 'environment' })} className="hidden" onChange={e => setReceiptFile(e.target.files[0])}/>
                                        </label>
                                    )}
                                </div>

                                <div className={`border rounded-lg bg-panel p-2.5 flex flex-col gap-1.5 transition-colors ${poData.trackingNo.trim() ? 'border-orange' : 'border-line-2'}`}>
                                    <div className="flex items-center gap-2"><Lamp tone={poData.trackingNo.trim() ? 'on' : 'off'} /><span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Resi &amp; kurir</span></div>
                                    <input type="text" value={poData.trackingNo} onChange={e => setPoData({...poData, trackingNo: e.target.value.toUpperCase()})} placeholder="NO. RESI" className="w-full bg-inset border border-line-2 rounded p-1.5 text-xs text-ink font-mono uppercase outline-none focus:border-orange transition-colors"/>
                                    <input type="text" value={poData.courier} onChange={e => setPoData({...poData, courier: e.target.value})} placeholder="kurir / sopir" className="w-full bg-inset border border-line-2 rounded p-1.5 text-xs text-ink font-mono outline-none focus:border-orange transition-colors"/>
                                </div>
                            </div>

                            {/* THE NUMBER THE FORM EXISTS TO PRODUCE */}
                            <div className="flex flex-wrap border border-line-2 rounded-lg overflow-hidden">
                                <div className="flex-1 min-w-[158px] px-3 py-2.5 border-r border-line-2 bg-panel">
                                    <span className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-0.5">Nilai barang</span>
                                    <span className="block font-mono text-[18px] font-bold text-ink whitespace-nowrap">{rp(totalBasePrice)}</span>
                                </div>
                                <div className="flex-1 min-w-[158px] px-3 py-2.5 border-r border-line-2 bg-panel">
                                    <span className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-0.5">{isOut ? 'Ongkos kirim' : 'Biaya tambahan'}</span>
                                    <span className="block font-mono text-[18px] font-bold text-ink whitespace-nowrap">{rp(extraCosts)}</span>
                                </div>
                                <div className="flex-1 min-w-[158px] px-3 py-2.5 border-r border-line-2 bg-panel">
                                    <span className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-0.5">{isOut ? 'Nilai kiriman' : 'Total dibayar'}</span>
                                    <span className="block font-mono text-[22px] font-bold text-ink whitespace-nowrap">{rp(trueLandedTotal)}</span>
                                </div>
                                <div className="flex-1 min-w-[158px] px-3 py-2.5 bg-raised">
                                    <span className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-0.5">Landed / Bks</span>
                                    <span className="block font-mono text-[22px] font-bold text-accent-ink whitespace-nowrap">{landedPerUnit > 0 ? rp(landedPerUnit) : '—'}</span>
                                    <span className="block font-mono text-[10.5px] text-ink-muted">{num(totalItemsReceived)} Bks</span>
                                </div>
                            </div>
                        </div>

                        {/* THE DOCUMENT COMPLETING ITSELF — it informs, it never blocks */}
                        <div className="shrink-0 border-t border-line-2 bg-panel px-4 py-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest shrink-0">Kelengkapan</span>
                                <div className="flex-1 min-w-[120px] h-[3px] bg-inset rounded overflow-hidden">
                                    <div className="h-full bg-orange transition-[width] duration-500" style={{ width: `${donePct}%` }} />
                                </div>
                                <span className="font-mono text-[13px] font-bold text-ink w-11 text-right">{donePct}%</span>
                                <button
                                    onClick={isOut ? handleHQPush : handleProcessRestock}
                                    disabled={isSubmitting || cart.length === 0}
                                    className={`font-display font-bold uppercase tracking-widest text-[11px] px-4 py-2 rounded border transition-transform active:scale-[0.97] flex items-center gap-2 ${
                                        isSubmitting || cart.length === 0
                                            ? 'border-line-2 text-ink-muted bg-raised cursor-not-allowed'
                                            : 'border-orange text-ink bg-raised'
                                    }`}
                                >
                                    {isSubmitting ? <RefreshCcw size={13} className="animate-spin"/> : isOut ? <Send size={13}/> : <Save size={13}/>}
                                    {isSubmitting ? 'Menyimpan...' : isOut ? 'Kirim sekarang' : 'Simpan surat jalan'}
                                </button>
                            </div>
                            <p className={`font-mono text-[11.5px] mt-2 ${missing.length ? 'text-ink-muted' : 'text-ink'}`}>
                                {cart.length === 0
                                    ? '→ Siap. Cari barang di kiri, atau isi rutenya dulu.'
                                    : missing.length
                                        ? <>→ Belum lengkap: <b className="text-ink">{missing.join(', ')}</b>. Tetap bisa disimpan — nanti ditandai belum lengkap.</>
                                        : '→ Lengkap. Siap disimpan.'}
                            </p>
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};

export default RestockVaultView;
