import React, { useState, useMemo, useEffect } from 'react';
import { 
    ClipboardList, Search, Save, AlertTriangle, CheckCircle, 
    RefreshCcw, Box, EyeOff, Send, ShieldAlert, Check, X, 
    ChevronDown, ChevronUp, Clock, User, Database, ShieldCheck, 
    Camera, UploadCloud, Image as ImageIcon, PackageMinus,
    Biohazard, FlaskConical, Undo2, BadgeDollarSign // 🚀 NEW: TACTICAL RESOLUTION ICONS
} from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, doc, writeBatch, serverTimestamp, query, where, onSnapshot, increment } from "firebase/firestore";

// --- FINANCIAL FORMATTER ---
const formatRupiah = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

// --- COMPRESSOR ENGINE ---
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

const StockOpnameView = ({ inventory, db, appId, user, isAdmin, logAudit, triggerCapy, motorists = [] }) => {
    
    // 🚀 THE INTERNAL CLEARANCE MATRIX
    const userRole = user?.userRole || 'AGENT';
    const isHighCommand = isAdmin || ['ADMIN', 'COMPANY_OWNER', 'DEVELOPER', 'HQ'].includes(userRole);
    const isAreaAdmin = userRole === 'AREA_ADMIN';
    const masterId = user?.bossUid || user?.uid || user?.id;

    // --- CORE STATE ---
    const [viewMode, setViewMode] = useState(isHighCommand ? 'review' : 'count'); 
    
    // --- INVENTORY ROUTER (MASTER VS BRANCH) ---
    const [branchInventory, setBranchInventory] = useState([]);
    
    useEffect(() => {
        if (isAreaAdmin && user?.location && db && appId) {
            const branchRef = collection(db, `artifacts/${appId}/users/${masterId}/branches/${user.location}/inventory`);
            const unsub = onSnapshot(branchRef, (snap) => {
                setBranchInventory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsub();
        }
    }, [isAreaAdmin, user, db, appId, masterId]);

    const activeInventory = isAreaAdmin ? branchInventory : inventory;

    // --- COUNT WORKSHEET STATE ---
    const [search, setSearch] = useState("");
    const [counts, setCounts] = useState({}); 
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- HQ RECONCILIATION STATE ---
    const [pendingAudits, setPendingAudits] = useState([]);
    const [expandedAudit, setExpandedAudit] = useState(null);
    const [isProcessingAudit, setIsProcessingAudit] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);

    // --- QUARANTINE RESOLUTION STATE ---
    const [quarantineFacility, setQuarantineFacility] = useState('MASTER');
    const [quarantineInventory, setQuarantineInventory] = useState([]);
    const [resolutionModal, setResolutionModal] = useState(null); // { item, method: 'SAMPLING'|'RTV'|'PENALTY' }

    // Dynamic extraction of all active branches
    const uniqueBranches = useMemo(() => {
        const branches = new Set();
        motorists.forEach(m => {
            if (m.location && m.location !== 'Headquarters' && m.location !== 'UNASSIGNED') branches.add(m.location);
        });
        return Array.from(branches);
    }, [motorists]);

    // Fetch live damaged stock based on dropdown selection
    useEffect(() => {
        if (viewMode !== 'quarantine') return;
        
        if (quarantineFacility === 'MASTER') {
            setQuarantineInventory(inventory.filter(i => (i.damagedStock || 0) > 0));
        } else {
            const branchRef = collection(db, `artifacts/${appId}/users/${masterId}/branches/${quarantineFacility}/inventory`);
            const unsub = onSnapshot(branchRef, (snap) => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Cross-reference with Master Inventory to get HPP/Modal prices
                const enrichedData = data.map(branchItem => {
                    const masterMatch = inventory.find(m => m.id === branchItem.id) || {};
                    return { ...masterMatch, ...branchItem };
                });
                setQuarantineInventory(enrichedData.filter(i => (i.damagedStock || 0) > 0));
            });
            return () => unsub();
        }
    }, [viewMode, quarantineFacility, inventory, db, appId, masterId]);


    // ==========================================
    // ENGINE 1: THE HQ RECONCILIATION FETCH
    // ==========================================
    const fetchPendingAudits = async () => {
        if (!isHighCommand || !db || !appId || !user) return;
        try {
            const auditsRef = collection(db, `artifacts/${appId}/users/${masterId}/pending_audits`);
            const q = query(auditsRef, where("status", "==", "PENDING_HQ_APPROVAL"));
            const snap = await getDocs(q);
            
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetched.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setPendingAudits(fetched);
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        if (isHighCommand && viewMode === 'review') fetchPendingAudits();
    }, [isHighCommand, viewMode]);

    // ==========================================
    // ENGINE 2: BLIND-THEN-REVEAL LOGIC
    // ==========================================
    const handleCountChange = (id, type, value) => {
        setCounts(prev => {
            const newCounts = { ...prev };
            if (!newCounts[id]) newCounts[id] = { good: '', damaged: '', photo: null };
            newCounts[id][type] = value === '' ? '' : Math.max(0, parseInt(value) || 0);
            if (newCounts[id].good === '' && newCounts[id].damaged === '') delete newCounts[id];
            return newCounts;
        });
    };

    const handlePhotoUpload = async (id, file) => {
        if (!file) return;
        try {
            const base64 = await compressImageToBase64(file);
            setCounts(prev => ({ ...prev, [id]: { ...(prev[id] || { good: '', damaged: '' }), photo: base64 } }));
        } catch (e) { alert("Failed to process image."); }
    };

    const getVariance = (item) => {
        const entry = counts[item.id];
        if (!entry) return { totalFound: 0, variance: 0 };
        const good = Number(entry.good || 0);
        const damaged = Number(entry.damaged || 0);
        const totalFound = good + damaged;
        return { totalFound, variance: totalFound - (item.stock || 0) };
    };

    const handleCommit = async () => {
        const countedItems = activeInventory.filter(i => counts[i.id] !== undefined);
        if (countedItems.length === 0) return alert("No items counted! Please enter at least one physical count.");
        if (!window.confirm(`Submit Stock Opname for ${countedItems.length} items to HQ for verification?`)) return;

        setIsSubmitting(true);
        try {
            const auditPayload = {
                agentId: user.uid,
                agentName: user.displayName || user.email?.split('@')[0] || "Branch Admin",
                auditType: isAreaAdmin ? 'BRANCH_WAREHOUSE' : 'MASTER_VAULT',
                branchLocation: user.location || 'HQ',
                timestamp: serverTimestamp(),
                status: 'PENDING_HQ_APPROVAL',
                items: countedItems.map(item => {
                    const entry = counts[item.id];
                    const good = Number(entry.good || 0);
                    const damaged = Number(entry.damaged || 0);
                    const totalFound = good + damaged;
                    return {
                        productId: item.id,
                        name: item.name,
                        expectedStock: item.stock || 0,
                        goodCount: good,
                        damagedCount: damaged,
                        totalFound: totalFound,
                        variance: totalFound - (item.stock || 0),
                        damagedPhotoUrl: entry.photo || null
                    };
                })
            };

            await addDoc(collection(db, `artifacts/${appId}/users/${masterId}/pending_audits`), auditPayload);

            if (logAudit) await logAudit("STOCK_OPNAME_SUBMITTED", `Submitted warehouse audit to HQ.`);
            if (triggerCapy) triggerCapy(`Audit Payload sent to HQ! Awaiting Commander approval. 📡`);

            setCounts({});
            alert("✅ Physical Count submitted to HQ successfully!");
        } catch (error) { alert("Failed to submit audit payload to HQ."); } 
        finally { setIsSubmitting(false); }
    };

    // ==========================================
    // ENGINE 3: THE HQ EXECUTION (Approve / Reject)
    // ==========================================
    const handleApproveAudit = async (audit) => {
        if (!window.confirm(`APPROVE AUDIT: This will permanently overwrite the inventory for ${audit.branchLocation}. Proceed?`)) return;
        setIsProcessingAudit(true);
        try {
            const batch = writeBatch(db);
            const basePath = audit.auditType === 'BRANCH_WAREHOUSE' 
                ? `artifacts/${appId}/users/${masterId}/branches/${audit.branchLocation}/inventory`
                : `artifacts/${appId}/users/${masterId}/products`;

            for (const item of audit.items) {
                const itemRef = doc(db, basePath, item.productId);
                if (audit.auditType === 'BRANCH_WAREHOUSE') {
                    batch.set(itemRef, { stock: item.goodCount, damagedStock: increment(item.damagedCount) }, { merge: true });
                } else {
                    batch.update(itemRef, { stock: item.goodCount, damagedStock: increment(item.damagedCount) });
                }
            }

            const auditRef = doc(db, `artifacts/${appId}/users/${masterId}/pending_audits`, audit.id);
            batch.update(auditRef, { status: 'APPROVED', resolvedAt: serverTimestamp(), resolvedBy: user.email?.split('@')[0] });

            await batch.commit();
            if (logAudit) await logAudit("STOCK_OPNAME_APPROVED", `Approved stock audit for ${audit.branchLocation}.`);
            if (triggerCapy) triggerCapy(`Audit Approved! Vault updated. 🔒`);
            
            setExpandedAudit(null);
            fetchPendingAudits();
        } catch (error) { alert("Failed to approve audit."); } 
        finally { setIsProcessingAudit(false); }
    };

    const handleRejectAudit = async (audit) => {
        const reason = window.prompt("Reason for rejection (sent back to Admin):");
        if (reason === null) return; 

        setIsProcessingAudit(true);
        try {
            const auditRef = doc(db, `artifacts/${appId}/users/${masterId}/pending_audits`, audit.id);
            await updateDoc(auditRef, { status: 'REJECTED', rejectReason: reason || "Discrepancy too high.", resolvedAt: serverTimestamp(), resolvedBy: user.email?.split('@')[0] });
            if (logAudit) await logAudit("STOCK_OPNAME_REJECTED", `Rejected stock audit for ${audit.branchLocation}.`);
            setExpandedAudit(null);
            fetchPendingAudits();
        } catch (error) { alert("Failed to reject audit."); } 
        finally { setIsProcessingAudit(false); }
    };

    // ==========================================
    // ENGINE 4: QUARANTINE RESOLUTION (LIQUIDATION)
    // ==========================================
    const executeResolution = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const qtyToResolve = Number(formData.get('qty'));

        if (qtyToResolve <= 0 || qtyToResolve > resolutionModal.item.damagedStock) return alert("Invalid quantity.");
        if (!window.confirm(`Execute ${resolutionModal.method} protocol for ${qtyToResolve} Bks of ${resolutionModal.item.name}? This cannot be undone.`)) return;

        setIsProcessingAudit(true);
        try {
            const batch = writeBatch(db);
            const hpp = Number(resolutionModal.item.priceDistributor || resolutionModal.item.hpp || resolutionModal.item.costPrice || 0);
            const totalValue = qtyToResolve * hpp;

            // 1. Deduct from appropriate quarantine ledger
            const itemRef = quarantineFacility === 'MASTER' 
                ? doc(db, `artifacts/${appId}/users/${masterId}/products`, resolutionModal.item.id)
                : doc(db, `artifacts/${appId}/users/${masterId}/branches/${quarantineFacility}/inventory`, resolutionModal.item.id);

            batch.set(itemRef, { damagedStock: increment(-qtyToResolve) }, { merge: true });

            // 2. Execute Specific Method Logic
            if (resolutionModal.method === 'SAMPLING') {
                batch.set(doc(collection(db, `artifacts/${appId}/users/${masterId}/samplings`)), {
                    productId: resolutionModal.item.id,
                    productName: resolutionModal.item.name,
                    qty: qtyToResolve,
                    unit: 'Bks',
                    reason: `QUARANTINE CONVERSION: ${formData.get('reason')}`,
                    sourceId: quarantineFacility === 'MASTER' ? 'VAULT' : quarantineFacility,
                    date: new Date().toISOString().split('T')[0],
                    timestamp: serverTimestamp()
                });
                if (logAudit) await logAudit("QUARANTINE_SAMPLING", `Converted ${qtyToResolve}x ${resolutionModal.item.name} to sampling.`);
            
            } else if (resolutionModal.method === 'RTV') {
                if (logAudit) await logAudit("QUARANTINE_RTV", `Returned ${qtyToResolve}x ${resolutionModal.item.name} to factory. Ref: ${formData.get('rtvRef')}`);
            
            } else if (resolutionModal.method === 'PENALTY') {
                const agentId = formData.get('agentId');
                const targetAgent = motorists.find(m => m.id === agentId);
                const agentRef = doc(db, `artifacts/${appId}/users/${masterId}/motorists`, agentId);
                
                // Slam them with a dynamic debt liability
                const penaltyId = `PENALTY_${Date.now()}`;
                batch.set(agentRef, {
                    [`cukaiDebts.${penaltyId}`]: totalValue
                }, { merge: true });
                
                // Push an aggressive notification directly to their app
                batch.set(doc(collection(db, `artifacts/${appId}/users/${masterId}/notifications`)), {
                    title: "⚠️ Damage Penalty Charge",
                    message: `You have been charged Rp ${new Intl.NumberFormat('id-ID').format(totalValue)} for ${qtyToResolve} damaged boxes of ${resolutionModal.item.name}.`,
                    type: "PENALTY",
                    agentId: agentId,
                    isRead: false,
                    timestamp: serverTimestamp()
                });
                if (logAudit) await logAudit("QUARANTINE_PENALTY", `Charged ${targetAgent?.name} Rp ${totalValue} for damaged goods.`);
            }

            await batch.commit();
            triggerCapy("Quarantine Resolution Executed! ☢️");
            setResolutionModal(null);
        } catch (error) { alert("Resolution failed: " + error.message); } 
        finally { setIsProcessingAudit(false); }
    };

    const filteredItems = useMemo(() => activeInventory.filter(i => i.name?.toLowerCase().includes(search.toLowerCase())), [activeInventory, search]);

    return (
        <div className="h-full flex flex-col animate-fade-in space-y-4 relative">
            
            {/* 📸 FULL SCREEN IMAGE VIEWER */}
            {viewingImage && (
                <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
                    <button onClick={() => setViewingImage(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-black/50 p-2 rounded-full"><X size={32}/></button>
                    <img src={viewingImage} alt="Damaged Item Proof" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/20" />
                </div>
            )}

            {/* ☢️ TACTICAL RESOLUTION MODAL */}
            {resolutionModal && (
                <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-pop-in">
                    <div className={`w-full max-w-md bg-[#0a0a0a] rounded-2xl border-2 shadow-2xl flex flex-col overflow-hidden ${resolutionModal.method === 'SAMPLING' ? 'border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.2)]' : resolutionModal.method === 'RTV' ? 'border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.2)]' : 'border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.3)]'}`}>
                        <div className={`p-4 border-b border-white/10 flex justify-between items-center ${resolutionModal.method === 'SAMPLING' ? 'bg-purple-900/30 text-purple-400' : resolutionModal.method === 'RTV' ? 'bg-blue-900/30 text-blue-400' : 'bg-red-900/30 text-red-500'}`}>
                            <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                                {resolutionModal.method === 'SAMPLING' && <FlaskConical size={18}/>}
                                {resolutionModal.method === 'RTV' && <Undo2 size={18}/>}
                                {resolutionModal.method === 'PENALTY' && <BadgeDollarSign size={18}/>}
                                {resolutionModal.method} PROTOCOL
                            </h3>
                            <button onClick={() => setResolutionModal(null)} className="hover:text-white"><X size={20}/></button>
                        </div>
                        <form onSubmit={executeResolution} className="p-6 space-y-5">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Target Asset</p>
                                <p className="font-bold text-white uppercase">{resolutionModal.item.name}</p>
                                <p className="text-[10px] text-orange-400 font-mono mt-1">Available in Quarantine: {resolutionModal.item.damagedStock} Bks</p>
                            </div>
                            
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">Quantity to Resolve (Bks)</label>
                                <input name="qty" type="number" max={resolutionModal.item.damagedStock} min="1" defaultValue={resolutionModal.item.damagedStock} className="w-full bg-black border border-white/20 p-3 rounded-lg text-white font-mono text-lg font-black focus:border-orange-500 outline-none" required/>
                            </div>

                            {resolutionModal.method === 'SAMPLING' && (
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">Marketing Event / Reason</label>
                                    <input name="reason" type="text" placeholder="e.g., Given to Event Staff" className="w-full bg-black border border-white/20 p-3 rounded-lg text-white focus:border-purple-500 outline-none" required/>
                                </div>
                            )}

                            {resolutionModal.method === 'RTV' && (
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">Surat Jalan Retur (RTV Number)</label>
                                    <input name="rtvRef" type="text" placeholder="e.g., SJR-2026-001" className="w-full bg-black border border-white/20 p-3 rounded-lg text-white focus:border-blue-500 outline-none font-mono uppercase" required/>
                                </div>
                            )}

                            {resolutionModal.method === 'PENALTY' && (
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">Target Personnel for Fine</label>
                                    <select name="agentId" className="w-full bg-black border border-red-500/50 p-3 rounded-lg text-white focus:border-red-500 outline-none uppercase tracking-widest text-xs font-bold" required>
                                        <option value="">-- SELECT PERSONNEL --</option>
                                        {motorists.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role || 'Staff'})</option>)}
                                    </select>
                                    <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded text-[9px] text-red-400 uppercase tracking-widest leading-relaxed">
                                        Warning: This will instantly deduct the total HPP value of these boxes from the selected personnel's Cukai Debts. They will owe the company cash.
                                    </div>
                                </div>
                            )}

                            <button type="submit" disabled={isProcessingAudit} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest shadow-lg flex justify-center items-center gap-2 transition-all active:scale-95 ${resolutionModal.method === 'SAMPLING' ? 'bg-purple-600 hover:bg-purple-500 text-white' : resolutionModal.method === 'RTV' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
                                {isProcessingAudit ? <RefreshCcw size={18} className="animate-spin"/> : <Check size={18}/>} Execute Protocol
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 🚀 HEADER & HQ NAVIGATION CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-lg gap-4 shrink-0 z-10 relative">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2 tracking-widest uppercase">
                        {viewMode === 'count' && <><ClipboardList size={24} className="text-emerald-500"/> Warehouse Opname</>}
                        {viewMode === 'review' && <><ShieldAlert size={24} className="text-blue-500"/> HQ Recon Board</>}
                        {viewMode === 'quarantine' && <><Biohazard size={24} className="text-orange-500 animate-pulse"/> Quarantine Vault</>}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-2">
                        {viewMode === 'count' && `AUDITING: ${isAreaAdmin ? user.location : 'MASTER VAULT'}`}
                        {viewMode === 'review' && 'PENDING WAREHOUSE OVERWRITES'}
                        {viewMode === 'quarantine' && 'DAMAGED GOODS LIQUIDATION'}
                        {!isHighCommand && viewMode === 'count' && <span className="bg-red-900/30 text-red-500 border border-red-500/50 px-2 py-0.5 rounded text-[9px] font-black tracking-widest flex items-center gap-1"><EyeOff size={10}/> BLIND COUNT ENFORCED</span>}
                    </p>
                </div>
                
                {isHighCommand && (
                    <div className="flex bg-black/50 rounded-lg p-1 border border-slate-700 w-full md:w-auto overflow-x-auto custom-scrollbar">
                        <button onClick={() => setViewMode('review')} className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'review' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>
                            <ShieldAlert size={14}/> HQ Audits {pendingAudits.length > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{pendingAudits.length}</span>}
                        </button>
                        <button onClick={() => setViewMode('quarantine')} className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'quarantine' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>
                            <Biohazard size={14}/> Quarantine
                        </button>
                        <button onClick={() => setViewMode('count')} className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'count' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>
                            <ClipboardList size={14}/> New Count
                        </button>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* VIEW MODE 1.5: THE QUARANTINE VAULT                      */}
            {/* ======================================================== */}
            {viewMode === 'quarantine' && isHighCommand && (
                <div className="flex-1 flex flex-col min-h-0 bg-black/40 rounded-xl border border-orange-500/20 shadow-inner p-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.05),transparent_70%)] pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-orange-500/20 pb-4">
                        <div className="w-full md:w-auto">
                            <label className="text-[10px] text-orange-500 font-bold uppercase tracking-widest block mb-1">Select Facility Zone</label>
                            <select 
                                value={quarantineFacility} 
                                onChange={(e) => setQuarantineFacility(e.target.value)}
                                className="w-full md:w-64 bg-slate-900 border border-orange-500/50 rounded-lg p-2.5 text-sm text-white font-black uppercase tracking-wider outline-none focus:border-orange-400"
                            >
                                <option value="MASTER">Master Vault (HQ)</option>
                                {uniqueBranches.map(branch => <option key={branch} value={branch}>{branch} Branch</option>)}
                            </select>
                        </div>
                        <div className="text-right w-full md:w-auto bg-orange-950/30 p-3 rounded-lg border border-orange-500/30">
                            <p className="text-[9px] text-orange-400 uppercase font-bold tracking-widest mb-1">Sunk Capital (Dead Asset Value)</p>
                            <p className="text-xl font-black text-orange-500 font-mono">
                                {formatRupiah(quarantineInventory.reduce((sum, item) => sum + ((item.damagedStock || 0) * Number(item.priceDistributor || item.hpp || 0)), 0))}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 relative z-10 pr-2">
                        {quarantineInventory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-3 pt-10">
                                <CheckCircle size={48} className="text-emerald-500"/>
                                <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest">No Damaged Assets in this zone.</p>
                            </div>
                        ) : (
                            quarantineInventory.map(item => {
                                const hpp = Number(item.priceDistributor || item.hpp || item.costPrice || 0);
                                return (
                                    <div key={item.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col xl:flex-row justify-between xl:items-center gap-4 hover:border-orange-500/50 transition-colors shadow-md">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-orange-900/20 text-orange-500 rounded-full border border-orange-500/30 shrink-0">
                                                <PackageMinus size={24}/>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-base uppercase tracking-wider">{item.name}</h3>
                                                <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                                                    <span className="text-orange-400 font-bold">{item.damagedStock} Bks Damaged</span>
                                                    <span className="text-slate-600">|</span>
                                                    <span className="text-slate-400">Total HPP Loss: {formatRupiah(item.damagedStock * hpp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto shrink-0 border-t border-slate-700 xl:border-none pt-3 xl:pt-0 mt-2 xl:mt-0">
                                            <button onClick={() => setResolutionModal({item, method: 'SAMPLING'})} className="flex-1 xl:flex-none px-4 py-2 bg-purple-900/30 hover:bg-purple-600 border border-purple-500/50 text-purple-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                                                <FlaskConical size={14}/> Convert to Sample
                                            </button>
                                            <button onClick={() => setResolutionModal({item, method: 'RTV'})} className="flex-1 xl:flex-none px-4 py-2 bg-blue-900/30 hover:bg-blue-600 border border-blue-500/50 text-blue-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                                                <Undo2 size={14}/> RTV Factory
                                            </button>
                                            <button onClick={() => setResolutionModal({item, method: 'PENALTY'})} className="flex-1 xl:flex-none px-4 py-2 bg-red-900/30 hover:bg-red-600 border border-red-500/50 text-red-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-lg">
                                                <BadgeDollarSign size={14}/> Penalty Charge
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW MODE 1: THE HQ RECONCILIATION BOARD (ADMIN ONLY)    */}
            {/* ======================================================== */}
            {viewMode === 'review' && isHighCommand && (
                <div className="flex-1 flex flex-col min-h-0">
                    
                    {/* 🚀 THE DEPLOYED CAPITAL RADAR 🚀 */}
                    <div className="mb-4 bg-gradient-to-br from-slate-900 to-black border border-slate-700 rounded-xl p-4 shadow-lg shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:12px_12px]"></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                    <Database size={14} className="text-blue-500"/> Total Capital Deployed (Master Vault)
                                </h3>
                                <p className="text-2xl font-black text-white font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                                    {formatRupiah(inventory.reduce((sum, item) => {
                                        const hpp = Number(item.priceDistributor || item.hpp || item.costPrice || item.modal || 0);
                                        return sum + ((item.stock || 0) * hpp);
                                    }, 0))}
                                </p>
                            </div>
                            <div className="text-right w-full md:w-auto flex flex-row md:flex-col justify-between items-center md:items-end bg-black/50 p-2 md:p-0 rounded border border-white/5 md:border-none md:bg-transparent">
                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Total Physical Units</p>
                                {(() => {
                                    let totalBks = 0; let totalBatang = 0;
                                    inventory.forEach(item => {
                                        const stock = item.stock || 0;
                                        const spp = item.sticksPerPack || 16; 
                                        const bks = Math.floor(stock);
                                        const btg = Math.round((stock - bks) * spp);
                                        totalBks += bks; totalBatang += btg;
                                    });
                                    const extraBks = Math.floor(totalBatang / 16);
                                    const finalBatang = totalBatang % 16;
                                    const finalBks = totalBks + extraBks;

                                    return (
                                        <p className="text-lg font-black text-blue-500 font-mono">
                                            {new Intl.NumberFormat('id-ID').format(finalBks)} <span className="text-[10px] text-slate-400 uppercase tracking-normal mr-1">Bks</span>
                                            {finalBatang > 0 && <>{finalBatang} <span className="text-[10px] text-slate-400 uppercase tracking-normal">Btg</span></>}
                                        </p>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* 🚀 THE FINANCIAL SHRINKAGE MATRIX */}
                    {pendingAudits.length > 0 && (
                        <div className="mb-4 bg-slate-900 border-2 border-red-500/50 rounded-xl p-4 shadow-[0_0_20px_rgba(220,38,38,0.1)] shrink-0">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ShieldAlert size={14} className="text-red-500"/> Global Shrinkage Analysis (Missing vs Damaged)
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {(() => {
                                    let missingLoss = 0; let damagedLoss = 0;
                                    pendingAudits.forEach(audit => {
                                        audit.items.forEach(item => {
                                            const master = inventory.find(inv => inv.id === item.productId) || {};
                                            const hpp = Number(master.priceDistributor || master.hpp || master.costPrice || master.modal || 0);
                                            
                                            if (item.variance < 0) {
                                                const purelyMissing = Math.abs(item.variance) - (item.damagedCount || 0);
                                                if (purelyMissing > 0) missingLoss += purelyMissing * hpp;
                                            }
                                            if (item.damagedCount > 0) damagedLoss += item.damagedCount * hpp;
                                        });
                                    });
                                    return (
                                        <>
                                            <div className="bg-red-950/30 p-3 rounded-lg border border-red-900/50">
                                                <p className="text-[9px] text-red-400 uppercase font-black tracking-widest mb-1">Unaccounted Missing (HPP)</p>
                                                <p className="text-xl font-black text-red-500">{formatRupiah(missingLoss)}</p>
                                                <p className="text-[9px] text-slate-500 mt-1 uppercase">Severe Liability Alert</p>
                                            </div>
                                            <div className="bg-orange-950/30 p-3 rounded-lg border border-orange-900/50">
                                                <p className="text-[9px] text-orange-400 uppercase font-black tracking-widest mb-1">Quarantined Damaged (HPP)</p>
                                                <p className="text-xl font-black text-orange-500">{formatRupiah(damagedLoss)}</p>
                                                <p className="text-[9px] text-slate-500 mt-1 uppercase">Factory Write-Offs</p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* 🚀 PENDING AUDITS LIST */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-4">
                        {pendingAudits.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-3 mt-8">
                                <CheckCircle size={48} className="text-emerald-500"/>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No pending warehouse audits.</p>
                            </div>
                        ) : (
                            pendingAudits.map(audit => {
                                const isExpanded = expandedAudit === audit.id;
                                
                                let totalDamaged = 0; let purelyMissing = 0;
                                audit.items.forEach(item => {
                                    if (item.damagedCount > 0) totalDamaged += item.damagedCount;
                                    if (item.variance < 0) {
                                        const missing = Math.abs(item.variance) - (item.damagedCount || 0);
                                        if (missing > 0) purelyMissing += missing;
                                    }
                                });

                                const hasIssues = totalDamaged > 0 || purelyMissing > 0;
                                let displayTime = "Unknown Time";
                                if (audit.timestamp?.seconds) displayTime = new Date(audit.timestamp.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

                                return (
                                    <div key={audit.id} className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${hasIssues ? 'border-red-500/50' : 'border-emerald-500/50'}`}>
                                        <div onClick={() => setExpandedAudit(isExpanded ? null : audit.id)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${hasIssues ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                                    {hasIssues ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-black text-white flex items-center gap-2 uppercase">
                                                            <Database size={14} className="text-purple-500"/> {audit.branchLocation}
                                                        </h3>
                                                        <span className="text-[9px] bg-purple-900/30 text-purple-400 border border-purple-500/50 px-2 py-0.5 rounded font-black tracking-widest uppercase">
                                                            Warehouse Overwrite
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-1">
                                                        <User size={12}/> By: {audit.agentName.toUpperCase()} • {displayTime}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden md:block">
                                                    {purelyMissing > 0 && <p className="text-[10px] uppercase font-bold text-red-500">{purelyMissing} Bks Missing</p>}
                                                    {totalDamaged > 0 && <p className="text-[10px] uppercase font-bold text-orange-500">{totalDamaged} Bks Damaged</p>}
                                                    {!hasIssues && <p className="text-sm uppercase font-black text-emerald-500">PERFECT</p>}
                                                </div>
                                                {isExpanded ? <ChevronUp size={20} className="text-slate-500"/> : <ChevronDown size={20} className="text-slate-500"/>}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-slate-700 bg-black/20 p-4">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Itemized Discrepancy Report</h4>
                                                
                                                <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                                                    {audit.items.map((item, idx) => {
                                                        const isMissing = item.variance < 0 && (Math.abs(item.variance) > item.damagedCount);
                                                        
                                                        return (
                                                            <div key={idx} className="flex flex-col bg-slate-800 p-3 rounded-lg border border-slate-700">
                                                                <div className="flex justify-between items-center mb-2 border-b border-slate-700/50 pb-2">
                                                                    <span className="font-bold text-xs text-white uppercase">{item.name}</span>
                                                                    <div className="flex items-center gap-4 text-xs font-mono">
                                                                        <span className="text-slate-400">SYS: {item.expectedStock}</span>
                                                                        <span className="text-slate-600">→</span>
                                                                        <span className="text-blue-400 font-bold">FND: {item.totalFound}</span>
                                                                        <span className={`w-12 text-right font-black ${item.variance === 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                            {item.variance > 0 ? '+' : ''}{item.variance}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex gap-4 items-center">
                                                                    <div className="bg-slate-900 px-3 py-1.5 rounded border border-slate-700 flex-1 flex justify-between items-center text-[10px] font-mono">
                                                                        <span className="text-slate-500">Good Condition:</span>
                                                                        <span className="text-emerald-400 font-bold">{item.goodCount} Bks</span>
                                                                    </div>
                                                                    {item.damagedCount > 0 && (
                                                                        <div className="bg-orange-900/20 px-3 py-1.5 rounded border border-orange-500/30 flex-1 flex justify-between items-center text-[10px] font-mono">
                                                                            <span className="text-orange-400">Quarantine Damaged:</span>
                                                                            <span className="text-orange-500 font-bold">{item.damagedCount} Bks</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {(isMissing || item.damagedPhotoUrl) && (
                                                                    <div className="mt-2 flex items-center justify-between bg-black/30 p-2 rounded">
                                                                        {isMissing ? (
                                                                            <span className="text-[9px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={10}/> Unaccounted Shrinkage Detected</span>
                                                                        ) : <span></span>}

                                                                        {item.damagedPhotoUrl && (
                                                                            <button onClick={() => setViewingImage(item.damagedPhotoUrl)} className="text-[9px] bg-blue-900/30 text-blue-400 hover:text-white border border-blue-500/50 px-2 py-1 rounded font-bold uppercase flex items-center gap-1 transition-colors">
                                                                                <ImageIcon size={10}/> View Damage Proof
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="flex gap-3 pt-2 border-t border-slate-700">
                                                    <button onClick={() => handleRejectAudit(audit)} disabled={isProcessingAudit} className="flex-1 bg-red-950/30 hover:bg-red-900 border border-red-500/50 text-red-500 hover:text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors uppercase tracking-widest">
                                                        <X size={14}/> Reject Count
                                                    </button>
                                                    <button onClick={() => handleApproveAudit(audit)} disabled={isProcessingAudit} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-colors uppercase tracking-widest">
                                                        <Check size={16}/> Approve & Quarantine Damages
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW MODE 2: THE COUNT WORKSHEET (BLIND THEN REVEAL)     */}
            {/* ======================================================== */}
            {viewMode === 'count' && (
                <div className="flex-1 bg-slate-900 rounded-xl border border-slate-700 shadow-inner overflow-hidden flex flex-col relative animate-fade-in z-10">
                    
                    <div className="p-3 border-b border-slate-700 bg-black/50 relative">
                        <input 
                            value={search} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            placeholder="Scan or Search Product..." 
                            className="bg-black border border-slate-600 pl-9 pr-4 py-3 rounded-lg text-sm w-full focus:border-emerald-500 outline-none text-white font-mono"
                        />
                        <Search size={16} className="absolute left-6 top-6 text-slate-500"/>
                    </div>

                    <div className="overflow-y-auto flex-1 z-10 relative custom-scrollbar p-3">
                        <div className="space-y-3">
                            {filteredItems.map(item => {
                                const entry = counts[item.id];
                                const hasEntry = !!entry;
                                const goodVal = entry?.good ?? '';
                                const damagedVal = entry?.damaged ?? '';
                                const { totalFound, variance } = getVariance(item);
                                const isRevealed = hasEntry && (goodVal !== '' || damagedVal !== '');

                                return (
                                    <div key={item.id} className={`bg-slate-800 rounded-lg border transition-all ${isRevealed ? (variance === 0 ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.1)]') : 'border-slate-700 hover:border-slate-500'}`}>
                                        
                                        <div className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                            <div className="flex-1">
                                                <div className="font-bold text-white text-sm uppercase tracking-wider">{item.name}</div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {item.id}</div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <label className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest absolute -top-2 left-2 bg-slate-800 px-1">Good Stock</label>
                                                    <input type="number" min="0" placeholder="0" value={goodVal} onChange={(e) => handleCountChange(item.id, 'good', e.target.value)} className="w-24 text-center p-3 rounded-lg border border-slate-600 bg-black text-emerald-400 focus:border-emerald-500 outline-none font-black text-lg font-mono placeholder:text-slate-700"/>
                                                </div>
                                                <span className="text-slate-600 font-bold text-lg">+</span>
                                                <div className="relative">
                                                    <label className="text-[8px] text-orange-500 font-bold uppercase tracking-widest absolute -top-2 left-2 bg-slate-800 px-1">Damaged</label>
                                                    <input type="number" min="0" placeholder="0" value={damagedVal} onChange={(e) => handleCountChange(item.id, 'damaged', e.target.value)} className="w-24 text-center p-3 rounded-lg border border-slate-600 bg-black text-orange-400 focus:border-orange-500 outline-none font-black text-lg font-mono placeholder:text-slate-700"/>
                                                </div>
                                            </div>
                                        </div>

                                        {isRevealed && (
                                            <div className="p-4 pt-0 border-t border-slate-700/50 mt-2 bg-black/20 rounded-b-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="flex items-center gap-4 text-xs font-mono">
                                                    <div className="bg-slate-900 px-3 py-1.5 rounded border border-slate-700">
                                                        <span className="text-slate-500 mr-2">SYS EXPECTED:</span>
                                                        <span className="text-slate-300 font-bold">{item.stock || 0}</span>
                                                    </div>
                                                    <span className="text-slate-600">vs</span>
                                                    <div className="bg-slate-900 px-3 py-1.5 rounded border border-slate-700">
                                                        <span className="text-slate-500 mr-2">TOTAL FOUND:</span>
                                                        <span className="text-blue-400 font-bold">{totalFound}</span>
                                                    </div>
                                                    <div className={`px-3 py-1.5 rounded border font-black ${variance === 0 ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-500' : 'bg-red-900/20 border-red-500/30 text-red-500'}`}>
                                                        {variance > 0 ? '+' : ''}{variance}
                                                    </div>
                                                </div>

                                                {Number(damagedVal) > 0 && (
                                                    <div className="w-full md:w-auto">
                                                        {entry.photo ? (
                                                            <div className="flex items-center gap-2 bg-orange-900/20 border border-orange-500/30 px-3 py-1.5 rounded">
                                                                <ImageIcon size={14} className="text-orange-400"/>
                                                                <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Damage Proof Attached</span>
                                                                <button onClick={() => handleCountChange(item.id, 'photo', null)} className="ml-2 text-red-400 hover:text-red-300"><X size={12}/></button>
                                                            </div>
                                                        ) : (
                                                            <label className="cursor-pointer flex items-center gap-2 bg-black hover:bg-slate-900 border border-dashed border-orange-500/50 px-4 py-2 rounded text-[10px] font-bold text-orange-500 uppercase tracking-widest transition-colors">
                                                                <Camera size={14}/> Upload Damaged Proof
                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(item.id, e.target.files[0])} />
                                                            </label>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 bg-black/80 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 z-10 relative">
                        <div className="text-xs text-slate-500 font-bold uppercase w-full md:w-auto text-center md:text-left tracking-widest">
                            {Object.keys(counts).length} Wares Counted
                        </div>
                        <div className="flex w-full md:w-auto gap-3">
                            <button onClick={() => setCounts({})} className="flex-1 md:flex-none justify-center px-4 py-3 md:py-2 text-slate-400 hover:text-white font-bold text-xs flex items-center gap-2 transition-colors bg-slate-800 border border-slate-700 rounded-lg">
                                <RefreshCcw size={14}/> Reset
                            </button>
                            <button onClick={handleCommit} disabled={isSubmitting || Object.keys(counts).length === 0} className="flex-1 md:flex-none justify-center bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 md:py-2 rounded-lg font-black shadow-lg flex items-center gap-2 transition-all active:scale-95 tracking-widest uppercase text-xs shadow-emerald-900/50">
                                {isSubmitting ? <RefreshCcw size={16} className="animate-spin"/> : <Send size={16}/>} Submit to HQ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockOpnameView;