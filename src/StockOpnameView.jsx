import React, { useState, useMemo, useEffect } from 'react';
import { 
    ClipboardList, Search, Save, AlertTriangle, CheckCircle, 
    RefreshCcw, Box, EyeOff, Send, ShieldAlert, Check, X, 
    ChevronDown, ChevronUp, Clock, User, Database, ShieldCheck, 
    Camera, UploadCloud, Image as ImageIcon, PackageMinus,
    Biohazard, FlaskConical, Undo2, BadgeDollarSign, History, Filter, BarChart, MapPin
} from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, doc, writeBatch, serverTimestamp, query, where, onSnapshot, increment } from "firebase/firestore";
import { savePhotoAndGetReference, deletePhotoFromStorage } from './utils/helpers';

const formatRupiah = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

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

const StockOpnameView = ({ inventory = [], transactions = [], db, storage, appId, user, isAdmin, logAudit, triggerCapy, motorists = [], appSettings }) => {
    
    const safeInventory = inventory || [];
    const safeTransactions = transactions || [];
    const safeMotorists = motorists || [];

    const userRole = user?.userRole || 'AGENT';
    // 🚀 FIX: This used to also treat 'COMPANY_OWNER', 'DEVELOPER', and 'HQ' role tags,
    // and the bare `isAdmin` PIN-unlock flag on its own, as "high command" — broader
    // than what Firestore's rules actually allow to read `pending_audits`/
    // `quarantine_logs` (owner or distributor-admin only, i.e. userRole === 'ADMIN').
    // Anyone who passed the old check but not this one would get a permission-denied
    // from the listeners below — same bug class as the procurement listener fix.
    const isHighCommand = userRole === 'ADMIN';

    // 🚀 DYNAMIC UPGRADE: Automatically adapts to any custom Tier 4/Branch Admin rank!
    const isAreaAdmin = !isHighCommand;
    
    const masterId = user?.bossUid || user?.uid || user?.id;

    const [viewMode, setViewMode] = useState(isHighCommand ? 'monitor' : 'count'); 
    const [auditSubTab, setAuditSubTab] = useState('pending'); 
    const [quarSubTab, setQuarSubTab] = useState('active'); 
    const [regionFilter, setRegionFilter] = useState('ALL');
    const [monitorFacility, setMonitorFacility] = useState('MASTER'); 

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

    const activeInventory = isAreaAdmin ? (branchInventory || []) : safeInventory;

    const [search, setSearch] = useState("");
    const [counts, setCounts] = useState({}); 
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [pendingAudits, setPendingAudits] = useState([]);
    const [auditHistory, setAuditHistory] = useState([]); 
    const [expandedAudit, setExpandedAudit] = useState(null);
    const [isProcessingAudit, setIsProcessingAudit] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);

    const [quarantineFacility, setQuarantineFacility] = useState('ALL');
    const [quarantineInventory, setQuarantineInventory] = useState([]);
    const [quarantineLogs, setQuarantineLogs] = useState([]); 
    const [resolutionModal, setResolutionModal] = useState(null);

    const uniqueBranches = useMemo(() => {
        const branches = new Set();
        safeMotorists.forEach(m => {
            if (m && m.location && m.location !== 'Headquarters' && m.location !== 'UNASSIGNED') branches.add(m.location);
        });
        return Array.from(branches);
    }, [safeMotorists]);

    useEffect(() => {
        if (!isHighCommand || !db || !appId || !masterId) return;

        const auditsRef = collection(db, `artifacts/${appId}/users/${masterId}/pending_audits`);
        const unsubAudits = onSnapshot(auditsRef, (snap) => {
            const allAudits = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingAudits(allAudits.filter(a => a.status === 'PENDING_HQ_APPROVAL').sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
            setAuditHistory(allAudits.filter(a => a.status === 'APPROVED' || a.status === 'REJECTED').sort((a, b) => (b.resolvedAt?.seconds || 0) - (a.resolvedAt?.seconds || 0)));
        }, (err) => console.warn("Pending audits listener:", err.code));

        const logsRef = collection(db, `artifacts/${appId}/users/${masterId}/quarantine_logs`);
        const unsubLogs = onSnapshot(logsRef, (snap) => {
            const fetchedLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedLogs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setQuarantineLogs(fetchedLogs);
        }, (err) => console.warn("Quarantine logs listener:", err.code));

        return () => { unsubAudits(); unsubLogs(); };
    }, [isHighCommand, db, appId, masterId]);

    const [monitorInventory, setMonitorInventory] = useState([]);
    useEffect(() => {
        if (viewMode !== 'monitor' || monitorFacility === 'MASTER' || !db || !appId || !masterId) return;
        const branchRef = collection(db, `artifacts/${appId}/users/${masterId}/branches/${monitorFacility}/inventory`);
        const unsub = onSnapshot(branchRef, (snap) => {
            setMonitorInventory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [viewMode, monitorFacility, db, appId, masterId]);

    useEffect(() => {
        if (viewMode !== 'quarantine' || quarSubTab !== 'active') return;
        
        if (quarantineFacility === 'MASTER') {
            setQuarantineInventory(safeInventory.filter(i => i && (i.damagedStock || 0) > 0).map(i => ({ ...i, facility: 'MASTER' })));
        } 
        else if (quarantineFacility === 'ALL') {
            let allData = { 
                MASTER: safeInventory.filter(i => i && (i.damagedStock || 0) > 0).map(i => ({ ...i, facility: 'MASTER' })) 
            };
            const unsubs = [];

            uniqueBranches.forEach(branch => {
                const branchRef = collection(db, `artifacts/${appId}/users/${masterId}/branches/${branch}/inventory`);
                const unsub = onSnapshot(branchRef, (snap) => {
                    const bData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    const enriched = bData.map(bItem => {
                        const match = safeInventory.find(m => m && m.id === bItem.id) || {};
                        return { ...match, ...bItem, damagedStock: bItem.damagedStock || 0, facility: branch };
                    }).filter(i => i && (i.damagedStock || 0) > 0);

                    allData[branch] = enriched;
                    
                    const combined = [];
                    Object.values(allData).forEach(arr => combined.push(...arr));
                    setQuarantineInventory(combined);
                });
                unsubs.push(unsub);
            });

            const combined = [];
            Object.values(allData).forEach(arr => combined.push(...arr));
            setQuarantineInventory(combined);

            return () => unsubs.forEach(fn => fn());
        } 
        else {
            const branchRef = collection(db, `artifacts/${appId}/users/${masterId}/branches/${quarantineFacility}/inventory`);
            const unsub = onSnapshot(branchRef, (snap) => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                const enrichedData = data.map(branchItem => {
                    const masterMatch = safeInventory.find(m => m && m.id === branchItem.id) || {};
                    return { ...masterMatch, ...branchItem, damagedStock: branchItem.damagedStock || 0, facility: quarantineFacility };
                });
                setQuarantineInventory(enrichedData.filter(i => i && (i.damagedStock || 0) > 0));
            });
            return () => unsub();
        }
    }, [viewMode, quarSubTab, quarantineFacility, safeInventory, db, appId, masterId, uniqueBranches]);

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
            const previousUrl = counts[id]?.photo;
            const path = `artifacts/${appId}/users/${masterId}/photos/stockopname_${id}_${Date.now()}.jpg`;
            const photoUrl = await savePhotoAndGetReference(storage, base64, path, appSettings?.usePhotoStorage);
            // 🚀 Defensive cleanup: normally the retake flow already clears (and deletes)
            // the previous photo via handleClearPhoto before this runs, but this guards
            // against any path that lands here with a URL still attached.
            if (previousUrl) deletePhotoFromStorage(storage, previousUrl);
            setCounts(prev => ({ ...prev, [id]: { ...(prev[id] || { good: '', damaged: '' }), photo: photoUrl } }));
        } catch (e) { alert("Failed to process image."); }
    };

    const handleClearPhoto = async (id) => {
        const previousUrl = counts[id]?.photo;
        setCounts(prev => ({ ...prev, [id]: { ...(prev[id] || { good: '', damaged: '' }), photo: null } }));
        if (previousUrl) await deletePhotoFromStorage(storage, previousUrl);
    };

    const getVariance = (item) => {
        if (!item || !item.id) return { totalFound: 0, variance: 0 };
        const entry = counts[item.id];
        if (!entry) return { totalFound: 0, variance: 0 };
        const good = Number(entry.good || 0);
        const damaged = Number(entry.damaged || 0);
        const totalFound = good + damaged;
        // 🚀 FIX: Compare against everything the system already expects (healthy + already-known
        // damaged), not just healthy stock — otherwise re-counting the same known damaged units
        // every time looks like "new" variance forever.
        return { totalFound, variance: totalFound - ((item.stock || 0) + (item.damagedStock || 0)) };
    };

    const handleCommit = async () => {
        const countedItems = activeInventory.filter(i => i && i.id && counts[i.id] !== undefined);
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
                        name: item.name || 'Unknown',
                        expectedStock: item.stock || 0,
                        expectedDamagedStock: item.damagedStock || 0,
                        goodCount: good,
                        damagedCount: damaged,
                        totalFound: totalFound,
                        variance: totalFound - ((item.stock || 0) + (item.damagedStock || 0)),
                        damagedPhotoUrl: entry.photo || null
                    };
                })
            };

            await addDoc(collection(db, `artifacts/${appId}/users/${masterId}/pending_audits`), auditPayload);

            // 🔔 NEW: Ping HQ the moment a count comes in, so it doesn't sit unnoticed
            await addDoc(collection(db, `artifacts/${appId}/users/${masterId}/notifications`), {
                title: "📋 New Stock Opname Submitted",
                message: `${auditPayload.agentName} submitted a physical count for ${auditPayload.branchLocation}. Needs HQ review.`,
                type: "AUDIT_PENDING",
                read: false,
                isRead: false,
                timestamp: serverTimestamp(),
                agentId: 'ADMIN',
                linkToTab: 'stock_opname'
            });

            if (logAudit) await logAudit("STOCK_OPNAME_SUBMITTED", `Submitted warehouse audit to HQ.`);
            if (triggerCapy) triggerCapy(`Audit Payload sent to HQ! Awaiting Commander approval. 📡`);

            setCounts({});
            alert("✅ Physical Count submitted to HQ successfully!");
        } catch (error) { alert("Failed to submit audit payload to HQ."); } 
        finally { setIsSubmitting(false); }
    };

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
                    // 🚀 FIX: damagedStock is now SET to the physical count, matching how 'stock'
                    // already works — a blind count replaces the system's belief with reality,
                    // it doesn't pile on top of it.
                    batch.set(itemRef, { stock: item.goodCount, damagedStock: item.damagedCount }, { merge: true });
                } else {
                    batch.update(itemRef, { stock: item.goodCount, damagedStock: item.damagedCount });
                }
            }

            const auditRef = doc(db, `artifacts/${appId}/users/${masterId}/pending_audits`, audit.id);
            batch.update(auditRef, { status: 'APPROVED', resolvedAt: serverTimestamp(), resolvedBy: user.email?.split('@')[0] });

            await batch.commit();
            if (logAudit) await logAudit("STOCK_OPNAME_APPROVED", `Approved stock audit for ${audit.branchLocation}.`);
            if (triggerCapy) triggerCapy(`Audit Approved! Vault updated. 🔒`);
            
            setExpandedAudit(null);
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
        } catch (error) { alert("Failed to reject audit."); } 
        finally { setIsProcessingAudit(false); }
    };

    const executeResolution = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const qtyToResolve = Number(formData.get('qty'));
        const reason = formData.get('reason') || '';
        const rtvRefStr = formData.get('rtvRef') || '';
        const agentId = formData.get('agentId') || '';

        if (qtyToResolve <= 0 || qtyToResolve > resolutionModal.item.damagedStock) return alert("Invalid quantity.");
        if (!window.confirm(`Execute ${resolutionModal.method} protocol for ${qtyToResolve} Bks of ${resolutionModal.item.name}?`)) return;

        setIsProcessingAudit(true);
        try {
            const batch = writeBatch(db);
            const hpp = Number(resolutionModal.item.priceDistributor || resolutionModal.item.hpp || resolutionModal.item.costPrice || 0);
            const totalValue = qtyToResolve * hpp;

            const targetFacility = resolutionModal.item.facility || quarantineFacility;
            const itemRef = targetFacility === 'MASTER' 
                ? doc(db, `artifacts/${appId}/users/${masterId}/products`, resolutionModal.item.id)
                : doc(db, `artifacts/${appId}/users/${masterId}/branches/${targetFacility}/inventory`, resolutionModal.item.id);

            batch.set(itemRef, { damagedStock: increment(-qtyToResolve) }, { merge: true });

            const logRef = doc(collection(db, `artifacts/${appId}/users/${masterId}/quarantine_logs`));
            const logData = {
                productId: resolutionModal.item.id,
                productName: resolutionModal.item.name,
                qty: qtyToResolve,
                method: resolutionModal.method,
                facility: targetFacility,
                totalValueHpp: totalValue,
                resolvedBy: user.email?.split('@')[0],
                timestamp: serverTimestamp(),
                details: {}
            };

            if (resolutionModal.method === 'SAMPLING') {
                logData.details = { reason };
                batch.set(doc(collection(db, `artifacts/${appId}/users/${masterId}/samplings`)), {
                    productId: resolutionModal.item.id,
                    productName: resolutionModal.item.name,
                    qty: qtyToResolve,
                    unit: 'Bks',
                    reason: `QUARANTINE CONVERSION: ${reason}`,
                    sourceId: targetFacility === 'MASTER' ? 'VAULT' : targetFacility,
                    date: new Date().toISOString().split('T')[0],
                    timestamp: serverTimestamp()
                });
                if (logAudit) await logAudit("QUARANTINE_SAMPLING", `Converted ${qtyToResolve}x ${resolutionModal.item.name} to sampling.`);
            
            } else if (resolutionModal.method === 'RTV') {
                logData.details = { rtvRef: rtvRefStr };
                if (logAudit) await logAudit("QUARANTINE_RTV", `Returned ${qtyToResolve}x ${resolutionModal.item.name} to factory. Ref: ${rtvRefStr}`);
            
            } else if (resolutionModal.method === 'PENALTY') {
                const targetAgent = safeMotorists.find(m => m && m.id === agentId);
                logData.details = { agentId, agentName: targetAgent?.name || 'Unknown' };
                
                const agentRef = doc(db, `artifacts/${appId}/users/${masterId}/motorists`, agentId);
                const penaltyId = `PENALTY_${Date.now()}`;
                
                batch.set(agentRef, { 
                    cukaiDebts: {
                        [penaltyId]: totalValue
                    }
                }, { merge: true });

                batch.set(doc(collection(db, `artifacts/${appId}/users/${masterId}/notifications`)), {
                    title: "⚠️ Damage Penalty Charge",
                    message: `You have a pending debt of Rp ${new Intl.NumberFormat('id-ID').format(totalValue)} for ${qtyToResolve} damaged boxes of ${resolutionModal.item.name}. Please pay this during EOD Setoran.`,
                    type: "PENALTY",
                    agentId: agentId,
                    isRead: false,
                    timestamp: serverTimestamp()
                });
                if (logAudit) await logAudit("QUARANTINE_PENALTY", `Charged ${targetAgent?.name} Rp ${totalValue} for damaged goods.`);
            }

            batch.set(logRef, logData);
            await batch.commit();
            triggerCapy("Quarantine Liquidation Logged & Executed! 📜");
            setResolutionModal(null);
        } catch (error) { alert("Resolution failed: " + error.message); } 
        finally { setIsProcessingAudit(false); }
    };

    // 🚀 TITANIUM TELEMETRY ENGINE: Upgraded Math & Damaged Tracking
    const monitorStats = useMemo(() => {
        if (viewMode !== 'monitor') return [];
        try {
            const todayStr = new Date().toDateString();
            const stats = {};
            
            safeInventory.forEach(p => {
                if (!p || !p.id) return;
                // 🚀 INJECTED 'damaged' & RENAMED 'start' to 'initial'
                stats[p.id] = { name: p.name || 'Unknown', vault: 0, damaged: 0, field: 0, sold: 0, initial: 0, product: p };
            });

            const activeStock = monitorFacility === 'MASTER' ? safeInventory : (monitorInventory || []);
            activeStock.forEach(item => {
                if(item && item.id && stats[item.id]) {
                    stats[item.id].vault = item.stock || 0;
                    stats[item.id].damaged = item.damagedStock || 0; // 🚀 PULL DAMAGED STOCK
                }
            });

            const targetAgents = safeMotorists.filter(m => m && (monitorFacility === 'MASTER' ? m.location === 'Headquarters' || !m.location : m.location === monitorFacility));
            const agentIds = targetAgents.map(a => a.id);

            targetAgents.forEach(agent => {
                (agent.activeCanvas || []).forEach(canvasItem => {
                    if (canvasItem && canvasItem.productId && stats[canvasItem.productId]) {
                        const p = stats[canvasItem.productId].product;
                        let mult = 1;
                        if (canvasItem.unit === 'Slop') mult = p.packsPerSlop || 10;
                        if (canvasItem.unit === 'Bal') mult = (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
                        if (canvasItem.unit === 'Karton') mult = (p.balsPerCarton || 4) * (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
                        stats[canvasItem.productId].field += ((canvasItem.qty || 0) * mult);
                    }
                });
            });

            const todaysTrans = safeTransactions.filter(t => {
                if (!t) return false;
                const tDate = t.timestamp?.seconds ? new Date(t.timestamp.seconds * 1000) : (t.date ? new Date(t.date) : new Date());
                return tDate.toDateString() === todayStr && agentIds.includes(t.agentId);
            });

            todaysTrans.forEach(t => {
                (t.items || []).forEach(tItem => {
                    if (!tItem) return;
                    const pId = tItem.productId || tItem.id;
                    if (pId && stats[pId]) {
                        const p = stats[pId].product;
                        let mult = 1;
                        if (tItem.unit === 'Slop') mult = p.packsPerSlop || 10;
                        if (tItem.unit === 'Bal') mult = (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
                        if (tItem.unit === 'Karton') mult = (p.balsPerCarton || 4) * (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
                        stats[pId].sold += ((tItem.qty || 0) * mult);
                    }
                });
            });

            Object.values(stats).forEach(s => {
                // 🚀 MATH UPDATED TO INCLUDE DAMAGED STOCK IN THE MORNING INITIAL COUNT
                s.initial = (s.vault || 0) + (s.damaged || 0) + (s.field || 0) + (s.sold || 0);
            });

            return Object.values(stats).filter(s => s.initial > 0 || s.vault > 0 || s.field > 0 || s.damaged > 0);
        } catch (err) {
            console.error("Monitor Engine Matrix Error:", err);
            return []; 
        }
    }, [viewMode, monitorFacility, safeInventory, monitorInventory, safeMotorists, safeTransactions]);

    const handleGodModeEdit = async (productId, productName, currentVaultStock) => {
        if (userRole !== 'DEVELOPER' && userRole !== 'COMPANY_OWNER') return;
        
        const newStockStr = window.prompt(`[GOD MODE] Override Vault Stock for ${productName} in ${monitorFacility}?\nCurrent: ${currentVaultStock} Bks`, currentVaultStock);
        if (newStockStr === null || newStockStr === "") return;
        
        const newStock = parseInt(newStockStr, 10);
        if (isNaN(newStock) || newStock < 0) return alert("Invalid number.");

        try {
            const ref = monitorFacility === 'MASTER'
                ? doc(db, `artifacts/${appId}/users/${masterId}/products`, productId)
                : doc(db, `artifacts/${appId}/users/${masterId}/branches/${monitorFacility}/inventory`, productId);

            await updateDoc(ref, { stock: newStock });
            triggerCapy(`God Mode: ${productName} forced to ${newStock} Bks in ${monitorFacility}.`);
        } catch (err) {
            alert("Failed to override: " + err.message);
        }
    };


    const filteredItems = useMemo(() => activeInventory.filter(i => i && i.name?.toLowerCase().includes(search.toLowerCase())), [activeInventory, search]);
    
    const displayedAudits = useMemo(() => {
        const source = auditSubTab === 'pending' ? pendingAudits : auditHistory;
        if (regionFilter === 'ALL') return source;
        if (regionFilter === 'MASTER') return source.filter(a => a.branchLocation === 'HQ' || a.branchLocation === 'MASTER_VAULT');
        return source.filter(a => a.branchLocation === regionFilter);
    }, [auditSubTab, pendingAudits, auditHistory, regionFilter]);

    const displayedQuarantineLogs = useMemo(() => {
        if (regionFilter === 'ALL') return quarantineLogs;
        return quarantineLogs.filter(log => log.facility === regionFilter);
    }, [quarantineLogs, regionFilter]);

    return (
        <div className="h-full flex flex-col animate-fade-in space-y-4 relative">
            
            {viewingImage && (
                <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
                    <button onClick={() => setViewingImage(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-black/50 p-2 rounded-full"><X size={32}/></button>
                    <img src={viewingImage} alt="Damaged Item Proof" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/20" />
                </div>
            )}

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
                                        <option value="" className="bg-slate-900">-- SELECT PERSONNEL --</option>
                                        {safeMotorists.filter(m => m && m.id !== 'master_owner').map(m => (
                                            <option key={m.id} value={m.id} className="bg-slate-900">{m.name} ({m.role || 'Staff'})</option>
                                        ))}
                                    </select>
                                    <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded text-[9px] text-red-400 uppercase tracking-widest leading-relaxed">
                                        Warning: This will issue a Bounty/Penalty debt to the selected personnel. They must pay this fine during their daily EOD Setoran.
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

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-lg gap-4 shrink-0 z-10 relative">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2 tracking-widest uppercase">
                        {viewMode === 'count' && <><ClipboardList size={24} className="text-emerald-500"/> Warehouse Opname</>}
                        {viewMode === 'review' && <><ShieldAlert size={24} className="text-blue-500"/> HQ Recon Board</>}
                        {viewMode === 'quarantine' && <><Biohazard size={24} className="text-orange-500 animate-pulse"/> Quarantine Vault</>}
                        {viewMode === 'monitor' && <><BarChart size={24} className="text-blue-500 animate-pulse"/> Supply Telemetry</>}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-2">
                        {viewMode === 'count' && `AUDITING: ${isAreaAdmin ? user.location : 'MASTER VAULT'}`}
                        {viewMode === 'review' && 'VERIFY REGIONAL STOCK OVERWRITES'}
                        {viewMode === 'quarantine' && 'DAMAGED GOODS LIQUIDATION & HISTORY'}
                        {viewMode === 'monitor' && 'REAL-TIME FACILITY OVERWATCH'}
                        {!isHighCommand && viewMode === 'count' && <span className="bg-red-900/30 text-red-500 border border-red-500/50 px-2 py-0.5 rounded text-[9px] font-black tracking-widest flex items-center gap-1"><EyeOff size={10}/> BLIND COUNT ENFORCED</span>}
                    </p>
                </div>
                
                {isHighCommand && (
                    <div className="flex bg-black/50 rounded-lg p-1 border border-slate-700 w-full md:w-auto overflow-x-auto custom-scrollbar">
                        <button onClick={() => setViewMode('monitor')} className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'monitor' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>
                            <BarChart size={14}/> Monitor
                        </button>
                        <button onClick={() => setViewMode('review')} className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'review' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>
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
            {/* VIEW MODE 0: THE LIVE BRANCH MONITOR                     */}
            {/* ======================================================== */}
            {viewMode === 'monitor' && isHighCommand && (
                <div className="flex-1 flex flex-col min-h-0 bg-black/40 rounded-xl border border-blue-500/20 shadow-inner p-4 relative overflow-hidden animate-fade-in">
                    
                    <div className="flex items-center gap-2 bg-slate-900 border border-blue-500/50 rounded-lg p-2 px-3 mb-6 w-full md:w-64 z-10 relative">
                        <MapPin size={16} className="text-blue-500"/>
                        <select value={monitorFacility} onChange={(e) => setMonitorFacility(e.target.value)} className="bg-transparent text-sm text-white font-black uppercase tracking-widest outline-none w-full">
                            <option value="MASTER" className="bg-slate-900 text-white">Master Vault (HQ)</option>
                            {uniqueBranches.map(branch => <option key={branch} value={branch} className="bg-slate-900 text-white">{branch}</option>)}
                        </select>
                    </div>

                    {/* 🚀 UPGRADED AGGRESSIVE UI PANEL */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                        {monitorStats.map(stat => {
                            const p = stat.product;
                            if (!p || !p.id) return null;
                            const isLowStock = stat.vault <= (p.minStock || 5);

                            return (
                                <div key={p.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col shadow-lg transition-all hover:border-blue-500/50 relative group">
                                    
                                    {/* Background Accent */}
                                    <div className="absolute -top-4 -right-4 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                                        <BarChart size={100} className="text-blue-500" />
                                    </div>

                                    {/* Header */}
                                    <div className="flex items-center p-4 border-b border-[#2a2a2a] bg-black/40 z-10">
                                        <div className="w-12 h-12 bg-black border border-[#333] rounded-lg overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                                            {p.images?.front ? <img src={p.images.front} className="w-full h-full object-cover"/> : <ImageIcon size={20} className="text-slate-600"/>}
                                        </div>
                                        <div className="ml-3 flex-1 overflow-hidden">
                                            <h3 className="font-black text-white text-sm uppercase truncate tracking-wider drop-shadow-md">{p.name}</h3>
                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {p.id}</p>
                                        </div>
                                    </div>

                                    {/* Main Stats Panel */}
                                    <div className="p-4 z-10 flex flex-col gap-3">
                                        
                                        {/* Vault vs Initial Row */}
                                        <div className="flex items-center justify-between bg-black/60 border border-blue-500/20 rounded-lg p-3 shadow-inner">
                                            <div>
                                                <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mb-1">Vault / Initial</p>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span 
                                                        className={`text-2xl font-black text-white font-mono leading-none ${userRole === 'DEVELOPER' || userRole === 'COMPANY_OWNER' ? 'cursor-pointer hover:text-blue-400 transition-colors' : ''}`}
                                                        onClick={() => handleGodModeEdit(p.id, p.name, stat.vault)}
                                                        title={userRole === 'DEVELOPER' || userRole === 'COMPANY_OWNER' ? 'God Mode Edit Vault Stock' : ''}
                                                    >
                                                        {stat.vault}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-500 font-mono">/ {stat.initial}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">Status</p>
                                                {isLowStock ? (
                                                    <span className="bg-red-900/30 text-red-500 border border-red-500/50 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(220,38,38,0.2)] animate-pulse">Low Stock</span>
                                                ) : (
                                                    <span className="bg-emerald-900/30 text-emerald-500 border border-emerald-500/50 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">Healthy</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Breakdowns Row */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-2.5 text-center shadow-inner hover:border-orange-500/30 transition-colors">
                                                <span className="text-[9px] text-orange-400/70 font-bold uppercase tracking-widest mb-1 block">Field</span>
                                                <span className="text-orange-500 font-black font-mono text-sm">{stat.field}</span>
                                            </div>
                                            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-2.5 text-center shadow-inner hover:border-emerald-500/30 transition-colors">
                                                <span className="text-[9px] text-emerald-400/70 font-bold uppercase tracking-widest mb-1 block">Sold</span>
                                                <span className="text-emerald-500 font-black font-mono text-sm">{stat.sold}</span>
                                            </div>
                                            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-2.5 text-center shadow-inner hover:border-red-500/30 transition-colors">
                                                <span className="text-[9px] text-red-400/70 font-bold uppercase tracking-widest mb-1 block">Damaged</span>
                                                <span className="text-red-500 font-black font-mono text-sm">{stat.damaged}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Multi-Color Progress Bar */}
                                    <div className="h-1.5 w-full bg-[#111] flex mt-auto border-t border-[#2a2a2a]">
                                        {stat.initial > 0 && (
                                            <>
                                                <div className="h-full bg-blue-500" style={{ width: `${(stat.vault / stat.initial) * 100}%` }} title={`Vault: ${stat.vault}`}></div>
                                                <div className="h-full bg-orange-500" style={{ width: `${(stat.field / stat.initial) * 100}%` }} title={`Field: ${stat.field}`}></div>
                                                <div className="h-full bg-emerald-500" style={{ width: `${(stat.sold / stat.initial) * 100}%` }} title={`Sold: ${stat.sold}`}></div>
                                                <div className="h-full bg-red-600" style={{ width: `${(stat.damaged / stat.initial) * 100}%` }} title={`Damaged: ${stat.damaged}`}></div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW MODE 1.5: THE QUARANTINE VAULT                      */}
            {/* ======================================================== */}
            {viewMode === 'quarantine' && isHighCommand && (
                <div className="flex-1 flex flex-col min-h-0 bg-black/40 rounded-xl border border-orange-500/20 shadow-inner p-4 relative overflow-hidden animate-fade-in">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.05),transparent_70%)] pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-orange-500/20 pb-4">
                        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                            <div className="flex bg-slate-900 rounded-lg p-1 border border-orange-500/30">
                                <button onClick={() => setQuarSubTab('active')} className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${quarSubTab === 'active' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-orange-400'}`}>
                                    <AlertTriangle size={14}/> Active Quarantine
                                </button>
                                <button onClick={() => setQuarSubTab('history')} className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${quarSubTab === 'history' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                                    <History size={14}/> Liquidation History
                                </button>
                            </div>

                            {quarSubTab === 'active' ? (
                                <select value={quarantineFacility} onChange={(e) => setQuarantineFacility(e.target.value)} className="w-full md:w-48 bg-slate-900 border border-orange-500/50 rounded-lg p-2.5 text-xs text-white font-bold uppercase tracking-widest outline-none focus:border-orange-400">
                                    <option value="ALL" className="bg-slate-900 text-white">All Facilities</option>
                                    <option value="MASTER" className="bg-slate-900 text-white">Master Vault (HQ)</option>
                                    {uniqueBranches.map(branch => <option key={branch} value={branch} className="bg-slate-900 text-white">{branch}</option>)}
                                </select>
                            ) : (
                                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-1.5 px-3">
                                    <Filter size={14} className="text-slate-400"/>
                                    <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="bg-transparent text-xs text-white font-bold uppercase tracking-widest outline-none">
                                        <option value="ALL" className="bg-slate-900 text-white">All Facilities</option>
                                        <option value="MASTER" className="bg-slate-900 text-white">Master Vault (HQ)</option>
                                        {uniqueBranches.map(branch => <option key={branch} value={branch} className="bg-slate-900 text-white">{branch}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        
                        {quarSubTab === 'active' && (
                            <div className="text-right w-full md:w-auto bg-orange-950/30 p-3 rounded-lg border border-orange-500/30">
                                <p className="text-[9px] text-orange-400 uppercase font-bold tracking-widest mb-1">Sunk Capital (Dead Asset Value)</p>
                                <p className="text-xl font-black text-orange-500 font-mono">
                                    {formatRupiah(quarantineInventory.reduce((sum, item) => sum + ((item.damagedStock || 0) * Number(item.priceDistributor || item.hpp || 0)), 0))}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 relative z-10 pr-2">
                        {quarSubTab === 'active' ? (
                            quarantineInventory.length === 0 ? (
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
                                                <div className="p-3 bg-orange-900/20 text-orange-500 rounded-full border border-orange-500/30 shrink-0"><PackageMinus size={24}/></div>
                                                <div>
                                                    <h3 className="font-bold text-white text-base uppercase tracking-wider">{item.name}</h3>
                                                    <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                                                        <span className="text-orange-400 font-bold">{item.damagedStock} Bks Damaged</span>
                                                        <span className="text-slate-600">|</span>
                                                        <span className="text-slate-400">Total HPP Loss: {formatRupiah(item.damagedStock * hpp)}</span>
                                                        <span className="text-slate-600">|</span>
                                                        <span className="text-blue-400 uppercase tracking-widest text-[9px]">{item.facility}</span>
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
                            )
                        ) : (
                            displayedQuarantineLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-3 pt-10">
                                    <History size={48} className="text-slate-500"/>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No liquidation history found.</p>
                                </div>
                            ) : (
                                displayedQuarantineLogs.map(log => {
                                    const timeStr = log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString('id-ID') : 'Unknown Time';
                                    return (
                                        <div key={log.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1 ${log.method === 'SAMPLING' ? 'bg-purple-900/30 text-purple-400 border border-purple-500/50' : log.method === 'RTV' ? 'bg-blue-900/30 text-blue-400 border border-blue-500/50' : 'bg-red-900/30 text-red-400 border border-red-500/50'}`}>
                                                        {log.method === 'SAMPLING' && <FlaskConical size={10}/>}
                                                        {log.method === 'RTV' && <Undo2 size={10}/>}
                                                        {log.method === 'PENALTY' && <BadgeDollarSign size={10}/>}
                                                        {log.method}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-mono">{timeStr}</span>
                                                </div>
                                                <h4 className="font-bold text-white uppercase text-sm">{log.qty} Bks • {log.productName}</h4>
                                                <p className="text-[10px] text-slate-400 font-mono mt-1">Facility: {log.facility} | Executed By: {log.resolvedBy?.toUpperCase()}</p>
                                                
                                                <div className="mt-2 text-[10px] text-slate-300 font-mono bg-black/30 p-2 rounded border border-slate-800">
                                                    {log.method === 'SAMPLING' && `Reason: ${log.details?.reason}`}
                                                    {log.method === 'RTV' && `RTV Surat Jalan: ${log.details?.rtvRef}`}
                                                    {log.method === 'PENALTY' && `Bounty Charged To: ${log.details?.agentName} (Rp ${new Intl.NumberFormat('id-ID').format(log.totalValueHpp)})`}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Liquidated Value (HPP)</p>
                                                <p className="font-black text-slate-300 font-mono text-sm">{formatRupiah(log.totalValueHpp)}</p>
                                            </div>
                                        </div>
                                    )
                                })
                            )
                        )}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW MODE 1: THE HQ RECONCILIATION BOARD                 */}
            {/* ======================================================== */}
            {viewMode === 'review' && isHighCommand && (
                <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700 w-full md:w-auto">
                            <button onClick={() => setAuditSubTab('pending')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 ${auditSubTab === 'pending' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-blue-400'}`}>
                                <Clock size={14}/> Pending HQ Approval
                            </button>
                            <button onClick={() => setAuditSubTab('history')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 ${auditSubTab === 'history' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                                <History size={14}/> Audit History
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-1.5 px-3 w-full md:w-auto">
                            <Filter size={14} className="text-slate-400"/>
                            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="bg-transparent text-xs text-white font-bold uppercase tracking-widest outline-none w-full">
                                <option value="ALL" className="bg-slate-900 text-white">All Regions</option>
                                <option value="MASTER" className="bg-slate-900 text-white">Master Vault (HQ)</option>
                                {uniqueBranches.map(branch => <option key={branch} value={branch} className="bg-slate-900 text-white">{branch}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-4">
                        {displayedAudits.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-3 mt-8">
                                {auditSubTab === 'pending' ? <CheckCircle size={48} className="text-emerald-500"/> : <History size={48} className="text-slate-500"/>}
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                    {auditSubTab === 'pending' ? 'No pending warehouse audits.' : 'No audit history found.'}
                                </p>
                            </div>
                        ) : (
                            displayedAudits.map(audit => {
                                const isExpanded = expandedAudit === audit.id;
                                const isHistory = auditSubTab === 'history';
                                
                                let totalDamaged = 0; let purelyMissing = 0;
                                audit.items.forEach(item => {
                                    if (item.damagedCount > 0) totalDamaged += item.damagedCount;
                                    if (item.variance < 0) {
                                        purelyMissing += Math.abs(item.variance);
                                    }
                                });

                                const hasIssues = totalDamaged > 0 || purelyMissing > 0;
                                let displayTime = "Unknown Time";
                                if (audit.timestamp?.seconds) displayTime = new Date(audit.timestamp.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
                                let resolvedTime = audit.resolvedAt?.seconds ? new Date(audit.resolvedAt.seconds * 1000).toLocaleString('id-ID') : '';

                                return (
                                    <div key={audit.id} className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${isHistory ? (audit.status === 'APPROVED' ? 'border-emerald-500/30' : 'border-red-500/30') : (hasIssues ? 'border-red-500/50' : 'border-emerald-500/50')}`}>
                                        <div onClick={() => setExpandedAudit(isExpanded ? null : audit.id)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${isHistory ? (audit.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500') : (hasIssues ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500')}`}>
                                                    {isHistory ? (audit.status === 'APPROVED' ? <CheckCircle size={20}/> : <X size={20}/>) : (hasIssues ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-black text-white flex items-center gap-2 uppercase">
                                                            <Database size={14} className="text-purple-500"/> {audit.branchLocation}
                                                        </h3>
                                                        {isHistory && (
                                                            <span className={`text-[9px] border px-2 py-0.5 rounded font-black tracking-widest uppercase ${audit.status === 'APPROVED' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' : 'bg-red-900/30 text-red-400 border-red-500/50'}`}>
                                                                {audit.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-1">
                                                        <User size={12}/> Count By: {audit.agentName.toUpperCase()} • {displayTime}
                                                    </p>
                                                    {isHistory && audit.resolvedBy && (
                                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                            Resolved By: {audit.resolvedBy.toUpperCase()} • {resolvedTime}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden md:block">
                                                    {purelyMissing > 0 && <p className="text-[10px] uppercase font-bold text-red-500">{purelyMissing} Bks Missing</p>}
                                                    {totalDamaged > 0 && <p className="text-[10px] uppercase font-bold text-orange-500">{totalDamaged} Bks Damaged</p>}
                                                    {!hasIssues && <p className="text-sm uppercase font-black text-emerald-500">PERFECT MATCH</p>}
                                                </div>
                                                {isExpanded ? <ChevronUp size={20} className="text-slate-500"/> : <ChevronDown size={20} className="text-slate-500"/>}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-slate-700 bg-black/20 p-4">
                                                
                                                {isHistory && audit.status === 'REJECTED' && audit.rejectReason && (
                                                    <div className="mb-4 bg-red-900/20 border border-red-500/30 p-3 rounded text-[10px] font-mono text-red-400">
                                                        <span className="font-bold uppercase tracking-widest block mb-1">Rejection Reason:</span>
                                                        {audit.rejectReason}
                                                    </div>
                                                )}

                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Itemized Count Report</h4>
                                                
                                                <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                                                    {audit.items.map((item, idx) => {
                                                        const isMissing = item.variance < 0;
                                                        
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
                                                                            <span className="text-orange-400">Damaged Claims:</span>
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

                                                {!isHistory && (
                                                    <div className="flex gap-3 pt-2 border-t border-slate-700">
                                                        <button onClick={() => handleRejectAudit(audit)} disabled={isProcessingAudit} className="flex-1 bg-red-950/30 hover:bg-red-900 border border-red-500/50 text-red-500 hover:text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors uppercase tracking-widest">
                                                            <X size={14}/> Reject Count
                                                        </button>
                                                        <button onClick={() => handleApproveAudit(audit)} disabled={isProcessingAudit} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-colors uppercase tracking-widest">
                                                            <Check size={16}/> Approve & Quarantine Damages
                                                        </button>
                                                    </div>
                                                )}
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
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Scan or Search Product..." className="bg-black border border-slate-600 pl-9 pr-4 py-3 rounded-lg text-sm w-full focus:border-emerald-500 outline-none text-white font-mono"/>
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
                                                    <div className="bg-slate-900 px-3 py-1.5 rounded border border-slate-700"><span className="text-slate-500 mr-2">SYS EXPECTED:</span><span className="text-slate-300 font-bold">{item.stock || 0}</span></div>
                                                    <span className="text-slate-600">vs</span>
                                                    <div className="bg-slate-900 px-3 py-1.5 rounded border border-slate-700"><span className="text-slate-500 mr-2">TOTAL FOUND:</span><span className="text-blue-400 font-bold">{totalFound}</span></div>
                                                    <div className={`px-3 py-1.5 rounded border font-black ${variance === 0 ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-500' : 'bg-red-900/20 border-red-500/30 text-red-500'}`}>{variance > 0 ? '+' : ''}{variance}</div>
                                                </div>

                                                {Number(damagedVal) > 0 && (
                                                    <div className="w-full md:w-auto">
                                                        {entry.photo ? (
                                                            <div className="flex items-center gap-2 bg-orange-900/20 border border-orange-500/30 px-3 py-1.5 rounded"><ImageIcon size={14} className="text-orange-400"/><span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Damage Proof Attached</span><button onClick={() => handleClearPhoto(item.id)} className="ml-2 text-red-400 hover:text-red-300"><X size={12}/></button></div>
                                                        ) : (
                                                            <label className="cursor-pointer flex items-center gap-2 bg-black hover:bg-slate-900 border border-dashed border-orange-500/50 px-4 py-2 rounded text-[10px] font-bold text-orange-500 uppercase tracking-widest transition-colors"><Camera size={14}/> Upload Damaged Proof<input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(item.id, e.target.files[0])} /></label>
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
                        <div className="text-xs text-slate-500 font-bold uppercase w-full md:w-auto text-center md:text-left tracking-widest">{Object.keys(counts).length} Wares Counted</div>
                        <div className="flex w-full md:w-auto gap-3">
                            <button onClick={() => setCounts({})} className="flex-1 md:flex-none justify-center px-4 py-3 md:py-2 text-slate-400 hover:text-white font-bold text-xs flex items-center gap-2 transition-colors bg-slate-800 border border-slate-700 rounded-lg"><RefreshCcw size={14}/> Reset</button>
                            <button onClick={handleCommit} disabled={isSubmitting || Object.keys(counts).length === 0} className="flex-1 md:flex-none justify-center bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 md:py-2 rounded-lg font-black shadow-lg flex items-center gap-2 transition-all active:scale-95 tracking-widest uppercase text-xs shadow-emerald-900/50">{isSubmitting ? <RefreshCcw size={16} className="animate-spin"/> : <Send size={16}/>} Submit to HQ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockOpnameView;