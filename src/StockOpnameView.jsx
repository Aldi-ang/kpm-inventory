import React, { useState, useMemo, useEffect } from 'react';
import { 
    ClipboardList, Search, Save, AlertTriangle, CheckCircle, 
    RefreshCcw, Box, EyeOff, Send, ShieldAlert, Check, X, 
    ChevronDown, ChevronUp, Clock, User, Database, ShieldCheck, 
    Camera, UploadCloud, Image as ImageIcon, PackageMinus,
    Biohazard, FlaskConical, Undo2, BadgeDollarSign, History, Filter, BarChart, MapPin
} from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, doc, writeBatch, serverTimestamp, query, where, onSnapshot, increment } from "firebase/firestore";
import { savePhotoAndGetReference, deletePhotoFromStorage, commitInChunks, formatRupiah, compressImageToBase64 } from './utils/helpers';
import { confirmAction, promptAction } from './components/ConfirmGate.jsx';
import { notify } from './components/Toast.jsx';

const StockOpnameView =({ inventory = [], transactions = [], db, storage, appId, user, isAdmin, logAudit, triggerCapy, motorists = [], appSettings }) => {
    
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
            }, (err) => console.warn("Branch inventory listener:", err.code));
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
        }, (err) => console.warn("Monitor inventory listener:", err.code));
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
                }, (err) => console.warn(`Quarantine branch listener (${branch}):`, err.code));
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
            }, (err) => console.warn("Quarantine facility listener:", err.code));
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
        } catch (e) { notify("Failed to process image."); }
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
        if (countedItems.length === 0) return notify("No items counted! Please enter at least one physical count.");
        if (!await confirmAction(`Submit Stock Opname for ${countedItems.length} items to HQ for verification?`)) return;

        setIsSubmitting(true);
        try {
            const auditPayload = {
                // 🚀 Phase 7: was `user.uid` — for every employee, `user.uid` is hijacked to the
                // BOSS's uid (see App.jsx's traffic-cop, `hijackedUser.uid = trueBossUid ||
                // currentUser.uid`), so every stock count in the company was being recorded
                // against the vault owner, never the agent who actually counted it.
                // `user.agentId` is the real per-agent id that same hijack carries.
                agentId: user.agentId || 'VAULT',
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
            notify("✅ Physical Count submitted to HQ successfully!");
        } catch (error) { notify("Failed to submit audit payload to HQ."); } 
        finally { setIsSubmitting(false); }
    };

    const handleApproveAudit = async (audit) => {
        // The old wording promised an overwrite, which is what this used to do and what made the
        // damage look deliberate. It applies the counted difference now, so the message says so.
        if (!await confirmAction(`APPROVE AUDIT: applies the counted difference to ${audit.branchLocation}'s stock. Sales and returns made since the count are kept. Proceed?`)) return;
        setIsProcessingAudit(true);
        try {
            // 🚀 FIX: Build the operations list and hand it to commitInChunks instead of a
            // raw writeBatch — bounded by a single audit's item count today, but the same
            // defensive chunking used for company-wide writes elsewhere, for consistency
            // as audits grow.
            const operations = [];
            const basePath = audit.auditType === 'BRANCH_WAREHOUSE'
                ? `artifacts/${appId}/users/${masterId}/branches/${audit.branchLocation}/inventory`
                : `artifacts/${appId}/users/${masterId}/products`;

            for (const item of audit.items) {
                const itemRef = doc(db, basePath, item.productId);

                /* 🚀 FIX: apply the DIFFERENCE the counter found, not the number they counted.
                   Overwriting is right at the moment of counting and wrong by the evening: the
                   branch counts 100 at 08:00, sells 30, takes 20 back at EOD, and HQ approving
                   at 20:00 wrote 100 over a real 90 — ten packs from nowhere and a whole day of
                   movement erased, with nothing on screen to notice.

                   `expectedStock` is what the system believed AT COUNT TIME, snapshotted into
                   the audit when it was submitted, so the counter's real correction is
                   (counted - expected). increment() applies it server-side and atomically,
                   which also settles the second half of the problem: these writes go through a
                   batch with no read, so reading the current stock here to subtract from would
                   race anything that sells while HQ is deciding. */
                const hasSnapshot = item.expectedStock !== undefined && item.expectedDamagedStock !== undefined;
                const data = hasSnapshot
                    ? { stock:        increment(Number(item.goodCount || 0)    - Number(item.expectedStock || 0)),
                        damagedStock: increment(Number(item.damagedCount || 0) - Number(item.expectedDamagedStock || 0)) }
                    /* Audits submitted before the snapshot existed carry no expected values, so
                       there is no difference to compute and the old overwrite is the only honest
                       answer for them. */
                    : { stock: Number(item.goodCount || 0), damagedStock: Number(item.damagedCount || 0) };

                if (audit.auditType === 'BRANCH_WAREHOUSE') {
                    operations.push({ type: 'set', ref: itemRef, data, options: { merge: true } });
                } else {
                    operations.push({ type: 'update', ref: itemRef, data });
                }
            }

            const auditRef = doc(db, `artifacts/${appId}/users/${masterId}/pending_audits`, audit.id);
            operations.push({ type: 'update', ref: auditRef, data: { status: 'APPROVED', resolvedAt: serverTimestamp(), resolvedBy: user.email?.split('@')[0] } });

            await commitInChunks(db, writeBatch, operations);
            if (logAudit) await logAudit("STOCK_OPNAME_APPROVED", `Approved stock audit for ${audit.branchLocation}.`);
            if (triggerCapy) triggerCapy(`Audit Approved! Vault updated. 🔒`);
            
            setExpandedAudit(null);
        } catch (error) { notify("Failed to approve audit."); } 
        finally { setIsProcessingAudit(false); }
    };

    const handleRejectAudit = async (audit) => {
        const reason = await promptAction("Reason for rejection (sent back to Admin):");
        if (reason === null) return; 

        setIsProcessingAudit(true);
        try {
            const auditRef = doc(db, `artifacts/${appId}/users/${masterId}/pending_audits`, audit.id);
            await updateDoc(auditRef, { status: 'REJECTED', rejectReason: reason || "Discrepancy too high.", resolvedAt: serverTimestamp(), resolvedBy: user.email?.split('@')[0] });
            if (logAudit) await logAudit("STOCK_OPNAME_REJECTED", `Rejected stock audit for ${audit.branchLocation}.`);
            setExpandedAudit(null);
        } catch (error) { notify("Failed to reject audit."); } 
        finally { setIsProcessingAudit(false); }
    };

    const executeResolution = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const qtyToResolve = Number(formData.get('qty'));
        const reason = formData.get('reason') || '';
        const rtvRefStr = formData.get('rtvRef') || '';
        const agentId = formData.get('agentId') || '';

        if (qtyToResolve <= 0 || qtyToResolve > resolutionModal.item.damagedStock) return notify("Invalid quantity.");
        if (!await confirmAction(`Execute ${resolutionModal.method} protocol for ${qtyToResolve} Bks of ${resolutionModal.item.name}?`)) return;

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
        } catch (error) { notify("Resolution failed: " + error.message); } 
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
        
        const newStockStr = await promptAction(`[GOD MODE] Override Vault Stock for ${productName} in ${monitorFacility}?\nCurrent: ${currentVaultStock} Bks`, currentVaultStock);
        if (newStockStr === null || newStockStr === "") return;
        
        const newStock = parseInt(newStockStr, 10);
        if (isNaN(newStock) || newStock < 0) return notify("Invalid number.");

        try {
            const ref = monitorFacility === 'MASTER'
                ? doc(db, `artifacts/${appId}/users/${masterId}/products`, productId)
                : doc(db, `artifacts/${appId}/users/${masterId}/branches/${monitorFacility}/inventory`, productId);

            await updateDoc(ref, { stock: newStock });
            triggerCapy(`God Mode: ${productName} forced to ${newStock} Bks in ${monitorFacility}.`);
        } catch (err) {
            notify("Failed to override: " + err.message);
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
                    <button onClick={() => setViewingImage(null)} className="absolute top-6 right-6 text-[var(--ink-dim)] hover:text-[var(--ink)] bg-black/50 p-2 rounded-full"><X size={32}/></button>
                    <img src={viewingImage} alt="Damaged Item Proof" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-[var(--line)]" />
                </div>
            )}

            {resolutionModal && (
                <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-pop-in">
                    <div className={`w-full max-w-md bg-[#0a0a0a] rounded-2xl border-2 shadow-2xl flex flex-col overflow-hidden ${resolutionModal.method === 'SAMPLING' ? 'border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.2)]' : resolutionModal.method === 'RTV' ? 'border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.2)]' : 'border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.3)]'} `}>
                        <div className={`p-4 border-b border-[var(--line)] flex justify-between items-center ${resolutionModal.method === 'SAMPLING' ? 'bg-[var(--gold)] text-[var(--ink-dim)]' : resolutionModal.method === 'RTV' ? 'bg-[var(--gold)] text-[var(--ink-dim)]' : 'bg-[var(--danger)] text-[var(--danger-ink)]'} `}>
                            <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                                {resolutionModal.method === 'SAMPLING' && <FlaskConical size={18}/>}
                                {resolutionModal.method === 'RTV' && <Undo2 size={18}/>}
                                {resolutionModal.method === 'PENALTY' && <BadgeDollarSign size={18}/>}
                                {resolutionModal.method} PROTOCOL
                            </h3>
                            <button onClick={() => setResolutionModal(null)} className="hover:text-[var(--ink)]"><X size={20}/></button>
                        </div>
                        <form onSubmit={executeResolution} className="p-6 space-y-5">
                            <div className="bg-[var(--raised)] p-4 rounded-xl border border-[var(--line)]">
                                <p className="text-[10px] text-[var(--ink-dim)] uppercase tracking-widest mb-1">Target Asset</p>
                                <p className="font-bold text-[var(--ink)] uppercase">{resolutionModal.item.name}</p>
                                <p className="text-[10px] text-[var(--accent-ink)] font-mono mt-1">Available in Quarantine: {resolutionModal.item.damagedStock} Bks</p>
                            </div>
                            
                            <div>
                                <label className="text-[10px] text-[var(--ink-dim)] uppercase tracking-widest mb-2 block">Quantity to Resolve (Bks)</label>
                                <input name="qty" type="number" max={resolutionModal.item.damagedStock} min="1" defaultValue={resolutionModal.item.damagedStock} className="w-full bg-[var(--sunk)] border border-[var(--line)] p-3 rounded-lg text-[var(--ink)] font-mono text-lg font-black focus:border-[var(--accent-edge)] outline-none" required/>
                            </div>

                            {resolutionModal.method === 'SAMPLING' && (
                                <div>
                                    <label className="text-[10px] text-[var(--ink-dim)] uppercase tracking-widest mb-2 block">Marketing Event / Reason</label>
                                    <input name="reason" type="text" placeholder="e.g., Given to Event Staff" className="w-full bg-[var(--sunk)] border border-[var(--line)] p-3 rounded-lg text-[var(--ink)] focus:border-[var(--line)] outline-none" required/>
                                </div>
                            )}

                            {resolutionModal.method === 'RTV' && (
                                <div>
                                    <label className="text-[10px] text-[var(--ink-dim)] uppercase tracking-widest mb-2 block">Surat Jalan Retur (RTV Number)</label>
                                    <input name="rtvRef" type="text" placeholder="e.g., SJR-2026-001" className="w-full bg-[var(--sunk)] border border-[var(--line)] p-3 rounded-lg text-[var(--ink)] focus:border-[var(--line)] outline-none font-mono uppercase" required/>
                                </div>
                            )}

                            {resolutionModal.method === 'PENALTY' && (
                                <div>
                                    <label className="text-[10px] text-[var(--ink-dim)] uppercase tracking-widest mb-2 block">Target Personnel for Fine</label>
                                    <select name="agentId" className="w-full bg-[var(--sunk)] border border-[var(--danger)] p-3 rounded-lg text-[var(--ink)] focus:border-[var(--danger)] outline-none uppercase tracking-widest text-xs font-bold" required>
                                        <option value="" className="bg-[var(--sunk)]">-- SELECT PERSONNEL --</option>
                                        {safeMotorists.filter(m => m && m.id !== 'master_owner').map(m => (
                                            <option key={m.id} value={m.id} className="bg-[var(--sunk)]">{m.name} ({m.role || 'Staff'})</option>
                                        ))}
                                    </select>
                                    <div className="mt-3 p-3 bg-[var(--danger)] border border-[var(--danger)] rounded text-[11px] text-[var(--danger-ink)] uppercase tracking-widest leading-relaxed">
                                        Warning: This will issue a Bounty/Penalty debt to the selected personnel. They must pay this fine during their daily EOD Setoran.
                                    </div>
                                </div>
                            )}

                            <button type="submit" disabled={isProcessingAudit} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest shadow-lg flex justify-center items-center gap-2 transition-all active:scale-95 ${resolutionModal.method === 'SAMPLING' ? 'bg-[var(--gold)] hover:bg-[var(--gold)] text-[var(--ink)]' : resolutionModal.method === 'RTV' ? 'bg-[var(--gold)] hover:bg-[var(--gold)] text-[var(--gold-ink)]' : 'bg-[var(--danger)] hover:bg-[var(--danger)] text-[var(--gold-ink)]'} `}>
                                {isProcessingAudit ? <RefreshCcw size={18} className="animate-spin"/> : <Check size={18}/>} Execute Protocol
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-[var(--sunk)] border border-[var(--line)] p-4 rounded-xl shadow-lg gap-4 shrink-0 z-10 relative">
                <div>
                    <h2 className="text-2xl font-black text-[var(--ink)] flex items-center gap-2 tracking-widest uppercase">
                        {viewMode === 'count' && <><ClipboardList size={24} className="text-[var(--ink-dim)]"/> Warehouse Opname</>}
                        {viewMode === 'review' && <><ShieldAlert size={24} className="text-[var(--ink-dim)]"/> HQ Recon Board</>}
                        {viewMode === 'quarantine' && <><Biohazard size={24} className="text-[var(--accent-ink)] animate-pulse"/> Quarantine Vault</>}
                        {viewMode === 'monitor' && <><BarChart size={24} className="text-[var(--ink-dim)] animate-pulse"/> Supply Telemetry</>}
                    </h2>
                    <p className="text-[10px] text-[var(--ink-dim)] font-mono mt-1 flex items-center gap-2">
                        {viewMode === 'count' && `AUDITING: ${isAreaAdmin ? user.location : 'MASTER VAULT'}`}
                        {viewMode === 'review' && 'VERIFY REGIONAL STOCK OVERWRITES'}
                        {viewMode === 'quarantine' && 'DAMAGED GOODS LIQUIDATION & HISTORY'}
                        {viewMode === 'monitor' && 'REAL-TIME FACILITY OVERWATCH'}
                        {!isHighCommand && viewMode === 'count' && <span className="bg-[var(--danger)] text-[var(--danger-ink)] border border-[var(--danger)] px-2 py-0.5 rounded text-[11px] font-black tracking-widest flex items-center gap-1"><EyeOff size={10}/> BLIND COUNT ENFORCED</span>}
                    </p>
                </div>
                
                {isHighCommand && (
                    <div className="flex bg-black/50 rounded-lg p-1 border border-[var(--line)] w-full md:w-auto overflow-x-auto custom-scrollbar">
                        <button onClick={() => setViewMode('monitor')} className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'monitor' ? 'bg-[var(--gold)] text-[var(--gold-ink)] shadow-md' : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'} `}>
                            <BarChart size={14}/> Monitor
                        </button>
                        <button onClick={() => setViewMode('review')} className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'review' ? 'bg-[var(--gold)] text-[var(--gold-ink)] shadow-md' : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'} `}>
                            <ShieldAlert size={14}/> HQ Audits {pendingAudits.length > 0 && <span className="bg-[var(--danger)] text-[var(--gold-ink)] text-[11px] px-1.5 py-0.5 rounded-full">{pendingAudits.length}</span>}
                        </button>
                        <button onClick={() => setViewMode('quarantine')} className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'quarantine' ? 'bg-[var(--gold)] text-[var(--gold-ink)] shadow-md' : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'} `}>
                            <Biohazard size={14}/> Quarantine
                        </button>
                        <button onClick={() => setViewMode('count')} className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'count' ? 'bg-[var(--gold)] text-[var(--gold-ink)] shadow-md' : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'} `}>
                            <ClipboardList size={14}/> New Count
                        </button>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* VIEW MODE 0: THE LIVE BRANCH MONITOR                     */}
            {/* ======================================================== */}
            {viewMode === 'monitor' && isHighCommand && (
                <div className="flex-1 flex flex-col min-h-0 bg-black/40 rounded-xl border border-[var(--line)] shadow-inner p-4 relative overflow-hidden animate-fade-in">
                    
                    <div className="flex items-center gap-2 bg-[var(--sunk)] border border-[var(--line)] rounded-lg p-2 px-3 mb-6 w-full md:w-64 z-10 relative">
                        <MapPin size={16} className="text-[var(--ink-dim)]"/>
                        <select value={monitorFacility} onChange={(e) => setMonitorFacility(e.target.value)} className="bg-transparent text-sm text-[var(--ink)] font-black uppercase tracking-widest outline-none w-full">
                            <option value="MASTER" className="bg-[var(--sunk)] text-[var(--ink)]">Master Vault (HQ)</option>
                            {uniqueBranches.map(branch => <option key={branch} value={branch} className="bg-[var(--sunk)] text-[var(--ink)]">{branch}</option>)}
                        </select>
                    </div>

                    {/* 🚀 UPGRADED AGGRESSIVE UI PANEL */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                        {monitorStats.map(stat => {
                            const p = stat.product;
                            if (!p || !p.id) return null;
                            const isLowStock = stat.vault <= (p.minStock || 5);

                            return (
                                <div key={p.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col shadow-lg transition-all hover:border-[var(--line)] relative group">
                                    
                                    {/* Background Accent */}
                                    <div className="absolute -top-4 -right-4 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                                        <BarChart size={100} className="text-[var(--ink-dim)]" />
                                    </div>

                                    {/* Header */}
                                    <div className="flex items-center p-4 border-b border-[#2a2a2a] bg-black/40 z-10 border-[var(--line)]">
                                        <div className="w-12 h-12 bg-[var(--sunk)] border border-[#333] rounded-lg overflow-hidden shrink-0 flex items-center justify-center shadow-inner border-[var(--line)]">
                                            {p.images?.front ? <img src={p.images.front} className="w-full h-full object-cover"/> : <ImageIcon size={20} className="text-[var(--ink-dim)]"/>}
                                        </div>
                                        <div className="ml-3 flex-1 overflow-hidden">
                                            <h3 className="font-black text-[var(--ink)] text-sm uppercase truncate tracking-wider drop-shadow-md">{p.name}</h3>
                                            <p className="text-[10px] text-[var(--ink-dim)] font-mono mt-0.5">ID: {p.id}</p>
                                        </div>
                                    </div>

                                    {/* Main Stats Panel */}
                                    <div className="p-4 z-10 flex flex-col gap-3">
                                        
                                        {/* Vault vs Initial Row */}
                                        <div className="flex items-center justify-between bg-black/60 border border-[var(--line)] rounded-lg p-3 shadow-inner">
                                            <div>
                                                <p className="text-[11px] text-[var(--ink-dim)] font-bold uppercase tracking-widest mb-1">Vault / Initial</p>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span 
                                                        className={`text-2xl font-black text-[var(--ink)] font-mono leading-none ${userRole === 'DEVELOPER' || userRole === 'COMPANY_OWNER' ? 'cursor-pointer hover:text-[var(--ink-dim)] transition-colors' : ''} `}
                                                        onClick={() => handleGodModeEdit(p.id, p.name, stat.vault)}
                                                        title={userRole === 'DEVELOPER' || userRole === 'COMPANY_OWNER' ? 'God Mode Edit Vault Stock' : ''}
                                                    >
                                                        {stat.vault}
                                                    </span>
                                                    <span className="text-sm font-bold text-[var(--ink-dim)] font-mono">/ {stat.initial}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] text-[var(--ink-dim)] font-bold uppercase tracking-widest mb-2">Status</p>
                                                {isLowStock ? (
                                                    <span className="bg-[var(--danger)] text-[var(--danger-ink)] border border-[var(--danger)] px-2 py-1 rounded text-[11px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(220,38,38,0.2)] animate-pulse">Low Stock</span>
                                                ) : (
                                                    <span className="bg-[var(--gold)] text-[var(--ink-dim)] border border-[var(--line)] px-2 py-1 rounded text-[11px] font-black uppercase tracking-widest">Healthy</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Breakdowns Row */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-2.5 text-center shadow-inner hover:border-[var(--accent-edge)] transition-colors">
                                                <span className="text-[11px] text-[var(--accent-ink)] font-bold uppercase tracking-widest mb-1 block">Field</span>
                                                <span className="text-[var(--accent-ink)] font-black font-mono text-sm">{stat.field}</span>
                                            </div>
                                            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-2.5 text-center shadow-inner hover:border-[var(--line)] transition-colors">
                                                <span className="text-[11px] text-[var(--ink-dim)] font-bold uppercase tracking-widest mb-1 block">Sold</span>
                                                <span className="text-[var(--ink-dim)] font-black font-mono text-sm">{stat.sold}</span>
                                            </div>
                                            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-2.5 text-center shadow-inner hover:border-[var(--danger)] transition-colors">
                                                <span className="text-[11px] text-[var(--danger-ink)] font-bold uppercase tracking-widest mb-1 block">Damaged</span>
                                                <span className="text-[var(--danger-ink)] font-black font-mono text-sm">{stat.damaged}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Multi-Color Progress Bar */}
                                    <div className="h-1.5 w-full bg-[#111] flex mt-auto border-t border-[#2a2a2a] border-[var(--line)]">
                                        {stat.initial > 0 && (
                                            <>
                                                <div className="h-full bg-[var(--gold)]" style={{ width: `${(stat.vault / stat.initial) * 100}%` }} title={`Vault: ${stat.vault}`}></div>
                                                <div className="h-full bg-[var(--gold)]" style={{ width: `${(stat.field / stat.initial) * 100}%` }} title={`Field: ${stat.field}`}></div>
                                                <div className="h-full bg-[var(--gold)]" style={{ width: `${(stat.sold / stat.initial) * 100}%` }} title={`Sold: ${stat.sold}`}></div>
                                                <div className="h-full bg-[var(--danger)]" style={{ width: `${(stat.damaged / stat.initial) * 100}%` }} title={`Damaged: ${stat.damaged}`}></div>
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
                <div className="flex-1 flex flex-col min-h-0 bg-black/40 rounded-xl border border-[var(--accent-edge)] shadow-inner p-4 relative overflow-hidden animate-fade-in">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.05),transparent_70%)] pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[var(--accent-edge)] pb-4">
                        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                            <div className="flex bg-[var(--sunk)] rounded-lg p-1 border border-[var(--accent-edge)]">
                                <button onClick={() => setQuarSubTab('active')} className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${quarSubTab === 'active' ? 'bg-[var(--gold)] text-[var(--gold-ink)]' : 'text-[var(--ink-dim)] hover:text-[var(--accent-ink)]'} `}>
                                    <AlertTriangle size={14}/> Active Quarantine
                                </button>
                                <button onClick={() => setQuarSubTab('history')} className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${quarSubTab === 'history' ? 'bg-[var(--raised)] text-[var(--ink)]' : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'} `}>
                                    <History size={14}/> Liquidation History
                                </button>
                            </div>

                            {quarSubTab === 'active' ? (
                                <select value={quarantineFacility} onChange={(e) => setQuarantineFacility(e.target.value)} className="w-full md:w-48 bg-[var(--sunk)] border border-[var(--accent-edge)] rounded-lg p-2.5 text-xs text-[var(--ink)] font-bold uppercase tracking-widest outline-none focus:border-[var(--accent-edge)]">
                                    <option value="ALL" className="bg-[var(--sunk)] text-[var(--ink)]">All Facilities</option>
                                    <option value="MASTER" className="bg-[var(--sunk)] text-[var(--ink)]">Master Vault (HQ)</option>
                                    {uniqueBranches.map(branch => <option key={branch} value={branch} className="bg-[var(--sunk)] text-[var(--ink)]">{branch}</option>)}
                                </select>
                            ) : (
                                <div className="flex items-center gap-2 bg-[var(--sunk)] border border-[var(--line)] rounded-lg p-1.5 px-3">
                                    <Filter size={14} className="text-[var(--ink-dim)]"/>
                                    <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="bg-transparent text-xs text-[var(--ink)] font-bold uppercase tracking-widest outline-none">
                                        <option value="ALL" className="bg-[var(--sunk)] text-[var(--ink)]">All Facilities</option>
                                        <option value="MASTER" className="bg-[var(--sunk)] text-[var(--ink)]">Master Vault (HQ)</option>
                                        {uniqueBranches.map(branch => <option key={branch} value={branch} className="bg-[var(--sunk)] text-[var(--ink)]">{branch}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        
                        {quarSubTab === 'active' && (
                            <div className="text-right w-full md:w-auto bg-[var(--gold)] p-3 rounded-lg border border-[var(--accent-edge)]">
                                <p className="text-[11px] text-[var(--accent-ink)] uppercase font-bold tracking-widest mb-1">Sunk Capital (Dead Asset Value)</p>
                                <p className="text-xl font-black text-[var(--accent-ink)] font-mono">
                                    {formatRupiah(quarantineInventory.reduce((sum, item) => sum + ((item.damagedStock || 0) * Number(item.priceDistributor || item.hpp || 0)), 0))}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 relative z-10 pr-2">
                        {quarSubTab === 'active' ? (
                            quarantineInventory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-3 pt-10">
                                    <CheckCircle size={48} className="text-[var(--ink-dim)]"/>
                                    <p className="text-sm font-bold text-[var(--ink-dim)] uppercase tracking-widest">No Damaged Assets in this zone.</p>
                                </div>
                            ) : (
                                quarantineInventory.map(item => {
                                    const hpp = Number(item.priceDistributor || item.hpp || item.costPrice || 0);
                                    return (
                                        <div key={item.id} className="bg-[var(--sunk)] border border-[var(--line)] rounded-xl p-4 flex flex-col xl:flex-row justify-between xl:items-center gap-4 hover:border-[var(--accent-edge)] transition-colors shadow-md">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-[var(--gold)] text-[var(--accent-ink)] rounded-full border border-[var(--accent-edge)] shrink-0"><PackageMinus size={24}/></div>
                                                <div>
                                                    <h3 className="font-bold text-[var(--ink)] text-base uppercase tracking-wider">{item.name}</h3>
                                                    <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                                                        <span className="text-[var(--accent-ink)] font-bold">{item.damagedStock} Bks Damaged</span>
                                                        <span className="text-[var(--ink-dim)]">|</span>
                                                        <span className="text-[var(--ink-dim)]">Total HPP Loss: {formatRupiah(item.damagedStock * hpp)}</span>
                                                        <span className="text-[var(--ink-dim)]">|</span>
                                                        <span className="text-[var(--ink-dim)] uppercase tracking-widest text-[11px]">{item.facility}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto shrink-0 border-t border-[var(--line)] xl:border-none pt-3 xl:pt-0 mt-2 xl:mt-0">
                                                <button onClick={() => setResolutionModal({item, method: 'SAMPLING'})} className="flex-1 xl:flex-none px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold)] border border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                                                    <FlaskConical size={14}/> Convert to Sample
                                                </button>
                                                <button onClick={() => setResolutionModal({item, method: 'RTV'})} className="flex-1 xl:flex-none px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold)] border border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--gold-ink)] rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                                                    <Undo2 size={14}/> RTV Factory
                                                </button>
                                                <button onClick={() => setResolutionModal({item, method: 'PENALTY'})} className="flex-1 xl:flex-none px-4 py-2 bg-[var(--danger)] hover:bg-[var(--danger)] border border-[var(--danger)] text-[var(--danger-ink)] hover:text-[var(--gold-ink)] rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-lg">
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
                                    <History size={48} className="text-[var(--ink-dim)]"/>
                                    <p className="text-sm font-bold text-[var(--ink-dim)] uppercase tracking-widest">No liquidation history found.</p>
                                </div>
                            ) : (
                                displayedQuarantineLogs.map(log => {
                                    const timeStr = log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString('id-ID') : 'Unknown Time';
                                    return (
                                        <div key={log.id} className="bg-[var(--sunk)] border border-[var(--line)] rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1 ${log.method === 'SAMPLING' ? 'bg-[var(--gold)] text-[var(--ink-dim)] border border-[var(--line)]' : log.method === 'RTV' ? 'bg-[var(--gold)] text-[var(--ink-dim)] border border-[var(--line)]' : 'bg-[var(--danger)] text-[var(--danger-ink)] border border-[var(--danger)]'} `}>
                                                        {log.method === 'SAMPLING' && <FlaskConical size={10}/>}
                                                        {log.method === 'RTV' && <Undo2 size={10}/>}
                                                        {log.method === 'PENALTY' && <BadgeDollarSign size={10}/>}
                                                        {log.method}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--ink-dim)] font-mono">{timeStr}</span>
                                                </div>
                                                <h4 className="font-bold text-[var(--ink)] uppercase text-sm">{log.qty} Bks • {log.productName}</h4>
                                                <p className="text-[10px] text-[var(--ink-dim)] font-mono mt-1">Facility: {log.facility} | Executed By: {log.resolvedBy?.toUpperCase()}</p>
                                                
                                                <div className="mt-2 text-[10px] text-[var(--ink-dim)] font-mono bg-black/30 p-2 rounded border border-[var(--line)]">
                                                    {log.method === 'SAMPLING' && `Reason: ${log.details?.reason}`}
                                                    {log.method === 'RTV' && `RTV Surat Jalan: ${log.details?.rtvRef}`}
                                                    {log.method === 'PENALTY' && `Bounty Charged To: ${log.details?.agentName} (Rp ${new Intl.NumberFormat('id-ID').format(log.totalValueHpp)})`}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] text-[var(--ink-dim)] uppercase font-bold tracking-widest">Liquidated Value (HPP)</p>
                                                <p className="font-black text-[var(--ink-dim)] font-mono text-sm">{formatRupiah(log.totalValueHpp)}</p>
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
                        <div className="flex bg-[var(--sunk)] rounded-lg p-1 border border-[var(--line)] w-full md:w-auto">
                            <button onClick={() => setAuditSubTab('pending')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 ${auditSubTab === 'pending' ? 'bg-[var(--gold)] text-[var(--gold-ink)]' : 'text-[var(--ink-dim)] hover:text-[var(--ink-dim)]'} `}>
                                <Clock size={14}/> Pending HQ Approval
                            </button>
                            <button onClick={() => setAuditSubTab('history')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 ${auditSubTab === 'history' ? 'bg-[var(--raised)] text-[var(--ink)]' : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'} `}>
                                <History size={14}/> Audit History
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-[var(--sunk)] border border-[var(--line)] rounded-lg p-1.5 px-3 w-full md:w-auto">
                            <Filter size={14} className="text-[var(--ink-dim)]"/>
                            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="bg-transparent text-xs text-[var(--ink)] font-bold uppercase tracking-widest outline-none w-full">
                                <option value="ALL" className="bg-[var(--sunk)] text-[var(--ink)]">All Regions</option>
                                <option value="MASTER" className="bg-[var(--sunk)] text-[var(--ink)]">Master Vault (HQ)</option>
                                {uniqueBranches.map(branch => <option key={branch} value={branch} className="bg-[var(--sunk)] text-[var(--ink)]">{branch}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-4">
                        {displayedAudits.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-3 mt-8">
                                {auditSubTab === 'pending' ? <CheckCircle size={48} className="text-[var(--ink-dim)]"/> : <History size={48} className="text-[var(--ink-dim)]"/>}
                                <p className="text-sm font-bold text-[var(--ink-dim)] uppercase tracking-widest">
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
                                    <div key={audit.id} className={`bg-[var(--sunk)] border rounded-xl overflow-hidden transition-all border-[var(--line)] ${isHistory ? (audit.status === 'APPROVED' ? 'border-[var(--line)]' : 'border-[var(--danger)]') : (hasIssues ? 'border-[var(--danger)]' : 'border-[var(--line)]')} `}>
                                        <div onClick={() => setExpandedAudit(isExpanded ? null : audit.id)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--raised)] transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${isHistory ? (audit.status === 'APPROVED' ? 'bg-[var(--gold)] text-[var(--ink-dim)]' : 'bg-[var(--danger)] text-[var(--danger-ink)]') : (hasIssues ? 'bg-[var(--danger)] text-[var(--danger-ink)]' : 'bg-[var(--gold)] text-[var(--ink-dim)]')} `}>
                                                    {isHistory ? (audit.status === 'APPROVED' ? <CheckCircle size={20}/> : <X size={20}/>) : (hasIssues ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-black text-[var(--ink)] flex items-center gap-2 uppercase">
                                                            <Database size={14} className="text-[var(--ink-dim)]"/> {audit.branchLocation}
                                                        </h3>
                                                        {isHistory && (
                                                            <span className={`text-[11px] border px-2 py-0.5 rounded font-black tracking-widest uppercase border-[var(--line)] ${audit.status === 'APPROVED' ? 'bg-[var(--gold)] text-[var(--ink-dim)] border-[var(--line)]' : 'bg-[var(--danger)] text-[var(--danger-ink)] border-[var(--danger)]'} `}>
                                                                {audit.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-[var(--ink-dim)] font-mono flex items-center gap-1 mt-1">
                                                        <User size={12}/> Count By: {audit.agentName.toUpperCase()} • {displayTime}
                                                    </p>
                                                    {isHistory && audit.resolvedBy && (
                                                        <p className="text-[10px] text-[var(--ink-dim)] font-mono mt-0.5">
                                                            Resolved By: {audit.resolvedBy.toUpperCase()} • {resolvedTime}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden md:block">
                                                    {purelyMissing > 0 && <p className="text-[10px] uppercase font-bold text-[var(--danger-ink)]">{purelyMissing} Bks Missing</p>}
                                                    {totalDamaged > 0 && <p className="text-[10px] uppercase font-bold text-[var(--accent-ink)]">{totalDamaged} Bks Damaged</p>}
                                                    {!hasIssues && <p className="text-sm uppercase font-black text-[var(--ink-dim)]">PERFECT MATCH</p>}
                                                </div>
                                                {isExpanded ? <ChevronUp size={20} className="text-[var(--ink-dim)]"/> : <ChevronDown size={20} className="text-[var(--ink-dim)]"/>}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-[var(--line)] bg-black/20 p-4">
                                                
                                                {isHistory && audit.status === 'REJECTED' && audit.rejectReason && (
                                                    <div className="mb-4 bg-[var(--danger)] border border-[var(--danger)] p-3 rounded text-[10px] font-mono text-[var(--danger-ink)]">
                                                        <span className="font-bold uppercase tracking-widest block mb-1">Rejection Reason:</span>
                                                        {audit.rejectReason}
                                                    </div>
                                                )}

                                                <h4 className="text-[10px] font-bold text-[var(--ink-dim)] uppercase tracking-widest mb-3">Itemized Count Report</h4>
                                                
                                                <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                                                    {audit.items.map((item, idx) => {
                                                        const isMissing = item.variance < 0;
                                                        
                                                        return (
                                                            <div key={idx} className="flex flex-col bg-[var(--raised)] p-3 rounded-lg border border-[var(--line)]">
                                                                <div className="flex justify-between items-center mb-2 border-b border-[var(--line)] pb-2">
                                                                    <span className="font-bold text-xs text-[var(--ink)] uppercase">{item.name}</span>
                                                                    <div className="flex items-center gap-4 text-xs font-mono">
                                                                        <span className="text-[var(--ink-dim)]">SYS: {item.expectedStock}</span>
                                                                        <span className="text-[var(--ink-dim)]">→</span>
                                                                        <span className="text-[var(--ink-dim)] font-bold">FND: {item.totalFound}</span>
                                                                        <span className={`w-12 text-right font-black ${item.variance === 0 ? 'text-emerald-500' : 'text-[var(--danger-ink)]'} `}>
                                                                            {item.variance > 0 ? '+' : ''}{item.variance}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex gap-4 items-center">
                                                                    <div className="bg-[var(--sunk)] px-3 py-1.5 rounded border border-[var(--line)] flex-1 flex justify-between items-center text-[10px] font-mono">
                                                                        <span className="text-[var(--ink-dim)]">Good Condition:</span>
                                                                        <span className="text-[var(--ink-dim)] font-bold">{item.goodCount} Bks</span>
                                                                    </div>
                                                                    {item.damagedCount > 0 && (
                                                                        <div className="bg-[var(--gold)] px-3 py-1.5 rounded border border-[var(--accent-edge)] flex-1 flex justify-between items-center text-[10px] font-mono">
                                                                            <span className="text-[var(--accent-ink)]">Damaged Claims:</span>
                                                                            <span className="text-[var(--accent-ink)] font-bold">{item.damagedCount} Bks</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {(isMissing || item.damagedPhotoUrl) && (
                                                                    <div className="mt-2 flex items-center justify-between bg-black/30 p-2 rounded">
                                                                        {isMissing ? (
                                                                            <span className="text-[11px] text-[var(--danger-ink)] font-bold uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={10}/> Unaccounted Shrinkage Detected</span>
                                                                        ) : <span></span>}

                                                                        {item.damagedPhotoUrl && (
                                                                            <button onClick={() => setViewingImage(item.damagedPhotoUrl)} className="text-[11px] bg-[var(--gold)] text-[var(--ink-dim)] hover:text-[var(--ink)] border border-[var(--line)] px-2 py-1 rounded font-bold uppercase flex items-center gap-1 transition-colors">
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
                                                    <div className="flex gap-3 pt-2 border-t border-[var(--line)]">
                                                        <button onClick={() => handleRejectAudit(audit)} disabled={isProcessingAudit} className="flex-1 bg-[var(--danger)] hover:bg-[var(--danger)] border border-[var(--danger)] text-[var(--danger-ink)] hover:text-[var(--gold-ink)] py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors uppercase tracking-widest">
                                                            <X size={14}/> Reject Count
                                                        </button>
                                                        <button onClick={() => handleApproveAudit(audit)} disabled={isProcessingAudit} className="flex-[2] bg-[var(--gold)] hover:bg-[var(--gold)] text-[var(--gold-ink)] py-3 rounded-lg font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-colors uppercase tracking-widest">
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
                <div className="flex-1 bg-[var(--sunk)] rounded-xl border border-[var(--line)] shadow-inner overflow-hidden flex flex-col relative animate-fade-in z-10">
                    <div className="p-3 border-b border-[var(--line)] bg-black/50 relative">
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Scan or Search Product..." className="bg-[var(--sunk)] border border-[var(--line)] pl-9 pr-4 py-3 rounded-lg text-sm w-full focus:border-[var(--line)] outline-none text-[var(--ink)] font-mono"/>
                        <Search size={16} className="absolute left-6 top-6 text-[var(--ink-dim)]"/>
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
                                    <div key={item.id} className={`bg-[var(--raised)] rounded-lg border transition-all border-[var(--line)] ${isRevealed ? (variance === 0 ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.1)]') : 'border-[var(--line)] hover:border-[var(--line)]'} `}>
                                        <div className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                            <div className="flex-1">
                                                <div className="font-bold text-[var(--ink)] text-sm uppercase tracking-wider">{item.name}</div>
                                                <div className="text-[10px] text-[var(--ink-dim)] font-mono mt-0.5">ID: {item.id}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <label className="text-[11px] text-[var(--ink-dim)] font-bold uppercase tracking-widest absolute -top-2 left-2 bg-[var(--raised)] px-1">Good Stock</label>
                                                    <input type="number" min="0" placeholder="0" value={goodVal} onChange={(e) => handleCountChange(item.id, 'good', e.target.value)} className="w-24 text-center p-3 rounded-lg border border-[var(--line)] bg-[var(--sunk)] text-[var(--ink-dim)] focus:border-[var(--line)] outline-none font-black text-lg font-mono placeholder:text-[var(--ink)]"/>
                                                </div>
                                                <span className="text-[var(--ink-dim)] font-bold text-lg">+</span>
                                                <div className="relative">
                                                    <label className="text-[11px] text-[var(--accent-ink)] font-bold uppercase tracking-widest absolute -top-2 left-2 bg-[var(--raised)] px-1">Damaged</label>
                                                    <input type="number" min="0" placeholder="0" value={damagedVal} onChange={(e) => handleCountChange(item.id, 'damaged', e.target.value)} className="w-24 text-center p-3 rounded-lg border border-[var(--line)] bg-[var(--sunk)] text-[var(--accent-ink)] focus:border-[var(--accent-edge)] outline-none font-black text-lg font-mono placeholder:text-[var(--ink)]"/>
                                                </div>
                                            </div>
                                        </div>

                                        {isRevealed && (
                                            <div className="p-4 pt-0 border-t border-[var(--line)] mt-2 bg-black/20 rounded-b-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="flex items-center gap-4 text-xs font-mono">
                                                    <div className="bg-[var(--sunk)] px-3 py-1.5 rounded border border-[var(--line)]"><span className="text-[var(--ink-dim)] mr-2">SYS EXPECTED:</span><span className="text-[var(--ink-dim)] font-bold">{item.stock || 0}</span></div>
                                                    <span className="text-[var(--ink-dim)]">vs</span>
                                                    <div className="bg-[var(--sunk)] px-3 py-1.5 rounded border border-[var(--line)]"><span className="text-[var(--ink-dim)] mr-2">TOTAL FOUND:</span><span className="text-[var(--ink-dim)] font-bold">{totalFound}</span></div>
                                                    <div className={`px-3 py-1.5 rounded border font-black border-[var(--line)] ${variance === 0 ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-500' : 'bg-[var(--danger)] border-[var(--danger)] text-[var(--danger-ink)]'} `}>{variance > 0 ? '+' : ''}{variance}</div>
                                                </div>

                                                {Number(damagedVal) > 0 && (
                                                    <div className="w-full md:w-auto">
                                                        {entry.photo ? (
                                                            <div className="flex items-center gap-2 bg-[var(--gold)] border border-[var(--accent-edge)] px-3 py-1.5 rounded"><ImageIcon size={14} className="text-[var(--accent-ink)]"/><span className="text-[10px] text-[var(--accent-ink)] font-bold uppercase tracking-widest">Damage Proof Attached</span><button onClick={() => handleClearPhoto(item.id)} className="ml-2 text-[var(--danger-ink)] hover:text-[var(--danger-ink)]"><X size={12}/></button></div>
                                                        ) : (
                                                            <label className="cursor-pointer flex items-center gap-2 bg-[var(--sunk)] hover:bg-[var(--sunk)] border border-dashed border-[var(--accent-edge)] px-4 py-2 rounded text-[10px] font-bold text-[var(--accent-ink)] uppercase tracking-widest transition-colors"><Camera size={14}/> Upload Damaged Proof<input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(item.id, e.target.files[0])} /></label>
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

                    <div className="p-4 bg-black/80 border-t border-[var(--line)] flex flex-col md:flex-row justify-between items-center gap-4 z-10 relative">
                        <div className="text-xs text-[var(--ink-dim)] font-bold uppercase w-full md:w-auto text-center md:text-left tracking-widest">{Object.keys(counts).length} Wares Counted</div>
                        <div className="flex w-full md:w-auto gap-3">
                            <button onClick={() => setCounts({})} className="flex-1 md:flex-none justify-center px-4 py-3 md:py-2 text-[var(--ink-dim)] hover:text-[var(--ink)] font-bold text-xs flex items-center gap-2 transition-colors bg-[var(--raised)] border border-[var(--line)] rounded-lg"><RefreshCcw size={14}/> Reset</button>
                            <button onClick={handleCommit} disabled={isSubmitting || Object.keys(counts).length === 0} className="flex-1 md:flex-none justify-center bg-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--gold-ink)] px-8 py-3 md:py-2 rounded-lg font-black shadow-lg flex items-center gap-2 transition-all active:scale-95 tracking-widest uppercase text-xs shadow-emerald-900/50">{isSubmitting ? <RefreshCcw size={16} className="animate-spin"/> : <Send size={16}/>} Submit to HQ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockOpnameView;