import React, { useState, useMemo, useEffect } from 'react';
import { 
    ClipboardList, Search, Save, AlertTriangle, CheckCircle, 
    RefreshCcw, Box, EyeOff, Send, ShieldAlert, Check, X, 
    ChevronDown, ChevronUp, Clock, User, Database, ShieldCheck, 
    Camera, UploadCloud, Image as ImageIcon, PackageMinus,
    Biohazard, FlaskConical, Undo2, BadgeDollarSign, History, Filter, BarChart, MapPin
} from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, doc, writeBatch, serverTimestamp, query, where, onSnapshot, increment } from "firebase/firestore";
import { savePhotoAndGetReference, deletePhotoFromStorage, commitInChunks, formatRupiah, formatNumber, compressImageToBase64, tierPrice } from './utils/helpers';
import { confirmAction, promptAction } from './components/ConfirmGate.jsx';
import { notify } from './components/Toast.jsx';
import { canSeeExpectedCount } from './config/permissions';

/* THE KINDS OF DAMAGE — Aldi, 2026-08-21: "our sales terminal give solid few options then we
   should able to add another one in the stock opname".

   ⚠️ THESE ARE THE SALES TERMINAL'S OWN STRINGS, COPIED EXACTLY from MerchantSalesView.jsx's
   returnReason <select>. The long `value` is what Firestore keeps; the short `label` is only
   what the chip prints. Store "Pest Damage" instead of "Pest / Rodent Damage" and every report
   that groups by reason — AgentInventoryView.jsx:163 and EODReconciliationView.jsx:254 both do —
   splits one reason into two buckets forever. A self-check pins these two lists together. */
/* WHY THE COUNT DISAGREES WITH THE SYSTEM — the cause of a confirmed difference.
   Damage already had to say what kind; a shortage did not, so HQ received a bare `-3` and had to
   guess between a bookkeeping fix, a write-off and a person.

   🔴 THESE FIVE WORDS ARE CLAUDE'S, NOT ALDI'S, AND HE HAS NOT APPROVED THEM YET.
   His standing law is that only he names the categories in his own trade. They are provisional so
   the control could be built and looked at; the `value` strings are what Firestore keeps, and
   records already saved keep whatever string was used at the time. **Change them here BEFORE
   agents start counting with this, not after.** */
export const VARIANCE_REASONS = [
    { value: 'Miscount',          label: 'Miscount' },
    { value: 'Unrecorded Sale',   label: 'Unrecorded sale' },
    { value: 'Breakage / Damage', label: 'Breakage' },
    { value: 'Theft',             label: 'Theft' },
    { value: 'Supplier Short',    label: 'Supplier short' }
];

/* A difference that has survived the recount must say WHY before it can be submitted.
   ⚠️ THE CONTROL STARTS UNSET AND NEVER CYCLES BACK TO UNSET. A picker resting on a default gets
   submitted unread, and this field decides whether a shortage is filed as a bookkeeping fix or as
   a person — the same argument that put "TAP TO SET" in front of the damage kinds. */
export const varianceReasonMissing = (entry, state) =>
    (state.confirmed || state.disagreement) && !((entry && entry.varianceReason) || '').trim();

export const DAMAGE_REASONS = [
    { value: 'Expired / Out of Date',    label: 'Expired' },
    { value: 'Water / Weather Damage',   label: 'Water damage' },
    { value: 'Torn / Crushed Packaging', label: 'Torn / crushed' },
    { value: 'Pest / Rodent Damage',     label: 'Pest damage' },
    { value: 'Factory Defect',           label: 'Factory defect' }
    /* ⚠️ NO "Other" HERE, ON PURPOSE. Aldi, 2026-08-21: "we dont need damaged kinds just erase
       other button". The sales terminal still offers it, so this list is deliberately a SUBSET
       of the terminal's — the self-check asserts subset, not equality. A free-text cause is a
       reporting hole anyway: it cannot be grouped, counted, or acted on. */
];

/* RECOUNT — a difference is counted TWICE before HQ ever sees it.

   Why it exists, in money terms: HQ approving a count applies increment(counted - expected), so a
   miscount is written into real stock — and that wrong figure becomes the EXPECTED figure for the
   next count. One typo poisons two months. Most differences in a real warehouse are miscounts, not
   theft, so the cheapest correct thing is to count again before anyone acts.

   ⚠️ THE PREVIOUS NUMBERS ARE NEVER SHOWN BACK TO HIM. If he sees 98 he will simply retype 98 and
   the second count proves nothing. `startRecount` clears the boxes and keeps the attempt in
   `passes`, where only the submit path reads it.

   ⚠️ AND THE SNAPSHOT IS NOT REFRESHED. `expStock` / `expDamaged` were frozen on the first
   keystroke precisely so a mid-count sale cannot move the target; re-taking them on a recount
   would silently re-open that bug and still look like it worked.

   Aldi chose the three-way rule himself, 2026-08-21 — option B: when three counts all disagree,
   ALL THREE go to HQ rather than the app picking the last one. Three different numbers mean
   something other than counting is wrong, and that is a judgement, not an arithmetic problem. */
/* WHAT IS TOO SMALL TO CHASE — Aldi, 2026-08-21, asked what size difference is not worth his time:
   *"few batang wont worth my time, few bks is still money bruv we need that"*.

   So the line is exactly one PACK. Below a whole Bks is loose sticks and noise; one Bks is money.

   ⚠️ THIS IS NOT A CONVENIENCE. Selling in Batang divides stock by sticksPerPack
   (`App.jsx:3127`), so a product that has had loose sticks sold from it holds a FRACTION of a
   pack — 99.44, say. The count box is parseInt, whole Bks only (`handleCountChange`), so the agent
   can type 99 or 100 and the variance can never reach zero. Before the recount landed that was
   merely a wrong number on screen; with the recount it forces a pointless second count and files
   a fake half-pack shortage every single week. The tolerance is what makes counting a
   batang-carrying product possible at all. */
export const VARIANCE_TOLERANCE_BKS = 1;
export const withinTolerance = (variance) => Math.abs(Number(variance || 0)) < VARIANCE_TOLERANCE_BKS;

export const samePass = (a, b) =>
    Number((a && a.good) || 0) === Number((b && b.good) || 0) &&
    Number((a && a.damaged) || 0) === Number((b && b.damaged) || 0);

export const recountState = (entry, target) => {
    const passes = (entry && entry.passes) || [];
    const good = Number((entry && entry.good) || 0);
    const damaged = Number((entry && entry.damaged) || 0);
    const current = { good, damaged };
    const variance = (good + damaged) - (Number(target.stock || 0) + Number(target.damaged || 0));

    /* A count that matches the system needs nothing, no matter how it got here — and anything
       under a whole pack counts as matching, because it is loose sticks the box cannot even
       express. See VARIANCE_TOLERANCE_BKS. */
    if (withinTolerance(variance)) return { needsRecount: false, confirmed: false, disagreement: false, passes: passes.length };

    if (passes.length === 0) return { needsRecount: true, confirmed: false, disagreement: false, passes: 0 };

    if (passes.length === 1) {
        /* Counted the same twice: the shortage is real, and HQ should be told it was checked. */
        if (samePass(current, passes[0])) return { needsRecount: false, confirmed: true, disagreement: false, passes: 1 };
        return { needsRecount: true, confirmed: false, disagreement: false, passes: 1 };
    }

    /* Third attempt done. If any two agree we treat it as confirmed; if all three differ it is
       his option B — everything goes to HQ, flagged, and the app decides nothing. */
    const all = [...passes, current];
    const agrees = all.some((p, i) => all.some((q, j) => i !== j && samePass(p, q)));
    return { needsRecount: false, confirmed: agrees, disagreement: !agrees, passes: passes.length };
};

/* LEAK DETECTION — Aldi, 2026-08-21: "u can add leak detection for this trigger for everytime
   stock opname is done, which is each week actually".

   One short count is a miscount. The SAME product short week after week is a leak, and nothing in
   the app could see that before, because every audit was filed on its own and never compared with
   the last one. No new data is collected — this reads the approved audits already on file.

   ⚠️ IT LIVES ON HQ'S SIDE, NOT ON THE COUNT ROW, for two reasons that both matter:
     1. `auditHistory` only loads when `isHighCommand`; the rules refuse `pending_audits` to
        everyone else, so a counting agent would see an empty result and think all is well.
     2. Telling the person counting "this one is usually short" biases the count. Blind counting
        exists precisely so the shelf decides the number, not the expectation.
   HQ is who acts on a leak anyway. */
export const shortageStreak = (history, productId, sample = 5) => {
    const rows = (history || [])
        .filter(a => Array.isArray(a.items) && a.items.some(i => i.productId === productId))
        .slice(0, sample)
        .map(a => a.items.find(i => i.productId === productId));
    const short = rows.filter(r => Number(r.variance || 0) < 0).length;
    return { short, total: rows.length };
};

/* THE THRESHOLD, and it is deliberately dull: at least three counts on record and short in at
   least two of them. He counts weekly, so that is three weeks of evidence before the app accuses
   anyone of anything. Flagging on one or two counts would cry leak at ordinary miscounts, and a
   warning that is usually wrong gets ignored — which is worse than no warning. */
export const isLeak = ({ short, total }) => total >= 3 && short >= 2;

/* How many damaged units have been given a cause. */
export const damageSorted = (entry) =>
    Object.values((entry && entry.kinds) || {}).reduce((sum, n) => sum + Number(n || 0), 0);

/* THE RECONCILE RULE. Returns null when the row may be submitted, or the reason it may not.
   A warehouse row holds several kinds of damage at once, so the total is the truth and the kinds
   under it must add up to exactly that. Damage that enters with no cause is the hole this whole
   control exists to close — the same guard the terminal already applies at
   MerchantSalesView.jsx:1548. */
export const damageBlocked = (entry) => {
    const total = Number((entry && entry.damaged) || 0);
    if (total <= 0) return null;
    const sorted = damageSorted(entry);
    if (sorted !== total) {
        return sorted < total ? `${total - sorted} damaged not sorted yet`
                              : 'kinds add up to more than the total';
    }
    return null;
};

const StockOpnameView =({ inventory = [], transactions = [], db, storage, appId, user, isAdmin, logAudit, triggerCapy, motorists = [], appSettings }) => {
    
    const safeInventory = inventory || [];
    const safeTransactions = transactions || [];
    const safeMotorists = motorists || [];

    const userRole = user?.userRole || 'AGENT';
    /* Tier 3 and above count with the expected number beside them; below that they count blind
       and it only appears once they have typed. One switch per tier in the permission matrix.
       Deliberately reuses the userRole this screen already derives on the line above rather than
       taking a prop of the same name - App does pass one, and destructuring it here collided with
       this declaration and would have been read before it existed. */
    const showExpectedWhileCounting = canSeeExpectedCount(userRole);
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
            if (!newCounts[id]) {
                /* THE TARGET IS FROZEN THE MOMENT HE STARTS COUNTING THIS ROW.
                   It used to be read live off `item` at every render and again at submit, so a
                   sale landing mid-count moved the number he was counting against and turned a
                   correct count into a variance. The snapshot is taken here, on the first
                   keystroke for this product, and everything downstream - the plates, the
                   variance, the saved record - reads it instead of the live document.
                   Clearing both boxes deletes the row, which drops the snapshot too: that is
                   correct, because starting over should re-target on today's figures. */
                const src = (activeInventory || []).find(i => i && i.id === id) || {};
                newCounts[id] = {
                    good: '', damaged: '', photo: null,
                    expStock: Number(src.stock || 0),
                    expDamaged: Number(src.damagedStock || 0)
                };
            }
            newCounts[id][type] = value === '' ? '' : Math.max(0, parseInt(value) || 0);
            /* ⚠️ A ROW THAT HAS ALREADY BEEN COUNTED ONCE IS NEVER DELETED BY EMPTYING IT.
               Dropping it would drop `passes` with it, and he could then clear the boxes, retype
               the same wrong number and submit without ever recounting — the exact check this
               feature exists to enforce, removed by pressing backspace twice. */
            const startedOver = (newCounts[id].passes || []).length === 0;
            if (startedOver && newCounts[id].good === '' && newCounts[id].damaged === '') delete newCounts[id];
            return newCounts;
        });
    };

    /* --- the damage reel: which kind is showing, and whether the panel is open ---
       UI state only, kept out of `counts` so clearing a row's numbers cannot strand it. */
    /* the cause reel's position. -1 means he has not pressed it, which is a state the control can
       leave but never re-enter. */
    const [varPos, setVarPos] = useState({});
    const [varSnap, setVarSnap] = useState({});

    const stepVarianceReason = (id, dir) => {
        const n = VARIANCE_REASONS.length;
        const current = varPos[id];
        const started = current !== undefined && current >= 0;
        const next = !started ? 0
                   : (dir > 0 ? (current + 1) % n : (current - 1 + n) % n);
        const wraps = started && ((dir > 0 && current === n - 1) || (dir < 0 && current === 0));
        setVarPos(prev => ({ ...prev, [id]: next }));
        setCounts(prev => {
            const entry = prev[id];
            if (!entry) return prev;
            return { ...prev, [id]: { ...entry, varianceReason: VARIANCE_REASONS[next].value } };
        });
        if (!wraps) return;
        setVarSnap(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setVarSnap(prev => { const c = { ...prev }; delete c[id]; return c; }), 240);
    };

    const [dmgPos, setDmgPos] = useState({});
    const [dmgOpen, setDmgOpen] = useState({});
    const [dmgSnap, setDmgSnap] = useState({});

    const toggleDamagePanel = (id) => setDmgOpen(prev => ({ ...prev, [id]: !prev[id] }));

    /* Bank the attempt and blank the boxes. Everything about the row's TARGET is kept —
       `expStock` / `expDamaged` must survive, or the recount re-opens the moving-target bug —
       and so are the damage kinds, because re-sorting damage he already classified is busywork.
       What is deliberately NOT kept is anything that would show him what he typed last time. */
    const startRecount = (id) => {
        setCounts(prev => {
            const entry = prev[id];
            if (!entry) return prev;
            const passes = [...(entry.passes || []), { good: Number(entry.good || 0), damaged: Number(entry.damaged || 0) }];
            return { ...prev, [id]: { ...entry, good: '', damaged: '', passes } };
        });
        setDmgOpen(prev => ({ ...prev, [id]: false }));
    };

    /* One step through the kinds. Forward normally; on the last one it wraps to the first and
       `is-snap` gives that single long move the faster curve, which is the flick he asked for. */
    const stepDamageKind = (id, dir) => {
        const n = DAMAGE_REASONS.length;
        const current = dmgPos[id] || 0;
        const wraps = (dir > 0 && current === n - 1) || (dir < 0 && current === 0);
        setDmgPos(prev => ({ ...prev, [id]: (current + dir + n) % n }));
        if (!wraps) return;
        setDmgSnap(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setDmgSnap(prev => { const next = { ...prev }; delete next[id]; return next; }), 240);
    };

    const setDamageKindQty = (id, reason, value) => {
        setCounts(prev => {
            const next = { ...prev };
            if (!next[id]) next[id] = { good: '', damaged: '', photo: null };
            const kinds = { ...(next[id].kinds || {}) };
            const qty = Math.max(0, parseInt(value) || 0);
            if (qty === 0) delete kinds[reason]; else kinds[reason] = qty;
            next[id] = { ...next[id], kinds };
            return next;
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

    /* What this row is being counted AGAINST. The snapshot taken on the first keystroke wins;
       a row that has not been typed into yet has nothing frozen, so it shows today's figures. */
    const expectedOf = (item, entry) => ({
        stock:   Number(entry?.expStock   ?? item?.stock        ?? 0),
        damaged: Number(entry?.expDamaged ?? item?.damagedStock ?? 0)
    });

    const getVariance = (item) => {
        if (!item || !item.id) return { totalFound: 0, variance: 0 };
        const entry = counts[item.id];
        if (!entry) return { totalFound: 0, variance: 0 };
        const good = Number(entry.good || 0);
        const damaged = Number(entry.damaged || 0);
        const totalFound = good + damaged;
        const target = expectedOf(item, entry);
        return { totalFound, variance: totalFound - (target.stock + target.damaged) };
    };

    /* ⚠️ THE COMPARISON IS AGAINST HEALTHY *PLUS* ALREADY-KNOWN DAMAGED, never healthy alone -
       otherwise re-counting the same known damaged units reads as new variance forever. That was
       already true; what changed is that both halves now come from the frozen snapshot. */

    const handleCommit = async () => {
        const countedItems = activeInventory.filter(i => i && i.id && counts[i.id] !== undefined);
        if (countedItems.length === 0) return notify("No items counted! Please enter at least one physical count.");

        /* DAMAGE WITHOUT A CAUSE NEVER LEAVES THIS SCREEN. Checked before the confirm, so he is
           never asked to approve a count that cannot be saved. The reason decides who pays —
           an RTV charges nobody, a PENALTY charges the agent at retail (see executeResolution) —
           so a blank cause is a money bug, not a tidiness one. */
        const unaccounted = countedItems
            .map(i => ({ name: i.name || i.id, why: damageBlocked(counts[i.id]) }))
            .filter(r => r.why);
        if (unaccounted.length) {
            return notify(`Damage not accounted for:\n\n${unaccounted.map(r => `${r.name} — ${r.why}`).join('\n')}`);
        }

        /* A DIFFERENCE MAY NOT LEAVE THIS SCREEN UNTIL IT HAS BEEN COUNTED TWICE.
           Named, but never with the figures: tiers below 3 count blind, and "you are 5 short"
           would hand them the answer this whole screen is built to withhold. */
        const needRecount = countedItems
            .filter(i => recountState(counts[i.id], expectedOf(i, counts[i.id])).needsRecount)
            .map(i => i.name || i.id);
        if (needRecount.length) {
            return notify(`Count these again before submitting:\n\n${needRecount.join('\n')}`);
        }

        /* A CONFIRMED DIFFERENCE MUST SAY WHY. Also named without the figures, for the same reason
           the recount prompt is: tiers below 3 count blind. */
        const noCause = countedItems
            .filter(i => varianceReasonMissing(counts[i.id], recountState(counts[i.id], expectedOf(i, counts[i.id]))))
            .map(i => i.name || i.id);
        if (noCause.length) {
            return notify(`Say what happened with these before submitting:\n\n${noCause.join('\n')}`);
        }

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
                        /* the snapshot taken when he STARTED this row, not the live document at
                           submit. HQ's approval applies increment(counted - expected), so this
                           pair has to be the same pair he was looking at while counting. */
                        expectedStock: Number(entry.expStock ?? item.stock ?? 0),
                        expectedDamagedStock: Number(entry.expDamaged ?? item.damagedStock ?? 0),
                        goodCount: good,
                        damagedCount: damaged,
                        totalFound: totalFound,
                        variance: totalFound - ((item.stock || 0) + (item.damagedStock || 0)),
                        /* HOW MANY TIMES THIS ROW WAS COUNTED, and every number he reached.
                           `countedTwice` is what tells HQ this difference survived a second look
                           rather than being a first guess. `threeWayDisagreement` is his option B:
                           three different answers go to HQ intact and the app picks none of them. */
                        /* why the count disagrees. Null on a row that matched, because a matching
                           row was never asked. */
                        varianceReason: String(entry.varianceReason || '').trim() || null,
                        countPasses: [...((entry.passes) || []), { good, damaged }],
                        countedTwice: !!recountState(entry, {
                            stock: Number(entry.expStock ?? item.stock ?? 0),
                            damaged: Number(entry.expDamaged ?? item.damagedStock ?? 0)
                        }).confirmed,
                        threeWayDisagreement: !!recountState(entry, {
                            stock: Number(entry.expStock ?? item.stock ?? 0),
                            damaged: Number(entry.expDamaged ?? item.damagedStock ?? 0)
                        }).disagreement,
                        /* what KIND of damage, and how much of each. Written with the sales
                           terminal's own strings so the two screens group into one bucket. */
                        damageKinds: Object.entries(entry.kinds || {})
                            .map(([reason, qty]) => ({ reason, qty: Number(qty || 0) }))
                            .filter(k => k.qty > 0),
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
            /* What a damaged pack costs the agent is the COMPANY's decision, not this file's.
               Aldi, 2026-08-18: "can be retail, wholesale or ecer its companies decision". It was
               hardcoded to distributor price; it now reads the same setting the EOD bounty uses,
               which defaults to Retail — the rule he gave for agent-fault damage.
               Note this only ever runs on the PENALTY path. Damage the agent brought back from a
               store is resolved as SAMPLING or RTV and charges him nothing, which is his other
               rule and needed no code. */
            const hpp = tierPrice(resolutionModal.item, appSettings?.penaltyPriceTier);
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
                
                /* The note beside the money, same shape the EOD bounties write. Aldi, 2026-08-18:
                   "the bounties panel need to specify how the bounties number are calculated".
                   Without it this charge shows on his board as an unexplained number. */
                batch.set(agentRef, { 
                    cukaiDebts: {
                        [penaltyId]: totalValue
                    },
                    cukaiDebtNotes: {
                        [penaltyId]: {
                            label: `${resolutionModal.item.name} ${qtyToResolve} damaged`,
                            date: new Date().toISOString().split('T')[0]
                        }
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
                <div className="fixed inset-0 z-[500] bg-[var(--duke-scrim-hi)] backdrop-blur-sm flex items-center justify-center p-4">
                    <button onClick={() => setViewingImage(null)} className="absolute top-6 right-6 text-[var(--ink-dim)] hover:text-[var(--ink)] bg-[var(--sunk)] p-2 rounded-full"><X size={32}/></button>
                    <img src={viewingImage} alt="Damaged Item Proof" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-[var(--line)]" />
                </div>
            )}

            {resolutionModal && (
                <div className="fixed inset-0 z-[400] bg-[var(--duke-scrim-hi)] backdrop-blur-md flex items-center justify-center p-4 animate-pop-in">
                    <div className={`w-full max-w-md bg-[var(--panel)] rounded-2xl border-2 shadow-2xl flex flex-col overflow-hidden ${resolutionModal.method === 'SAMPLING' ? 'border-[var(--accent-edge)]' : resolutionModal.method === 'RTV' ? 'border-[var(--line)]' : 'border-[var(--danger)]'} `}>
                        <div className={`p-4 border-b border-[var(--line)] flex justify-between items-center ${resolutionModal.method === 'SAMPLING' ? 'bg-[var(--sunk)] text-[var(--accent-ink)]' : resolutionModal.method === 'RTV' ? 'bg-[var(--sunk)] text-[var(--accent-ink)]' : 'bg-[var(--danger)] text-[var(--danger-ink)]'} `}>
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
                                    <div className="mt-3 p-3 bg-[var(--danger-well)] border border-[var(--danger)] rounded text-[11px] text-[var(--danger-ink)] uppercase tracking-widest leading-relaxed">
                                        Warning: This will issue a Bounty/Penalty debt to the selected personnel. They must pay this fine during their daily EOD Setoran.
                                    </div>
                                </div>
                            )}

                            <button type="submit" disabled={isProcessingAudit} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest shadow-lg flex justify-center items-center gap-2 transition-all active:scale-95 ${resolutionModal.method === 'SAMPLING' ? 'bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--gold)_22%,transparent)] border border-[var(--accent-edge)] text-[var(--accent-ink)]' : resolutionModal.method === 'RTV' ? 'bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--gold)_22%,transparent)] border border-[var(--accent-edge)] text-[var(--accent-ink)]' : 'bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] hover:bg-[color-mix(in_srgb,var(--danger)_24%,transparent)] border border-[var(--danger)] text-[var(--danger-ink)]'} `}>
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
                        {viewMode === 'quarantine' && <><Biohazard size={24} className="kpm-hazard text-[var(--danger-ink)]"/> Quarantine Vault</>}
                        {viewMode === 'monitor' && <><BarChart size={24} className="text-[var(--ink-dim)] animate-pulse"/> Supply Telemetry</>}
                    </h2>
                    <p className="text-[10px] text-[var(--ink-dim)] font-mono mt-1 flex items-center gap-2">
                        {viewMode === 'count' && `AUDITING: ${isAreaAdmin ? user.location : 'MASTER VAULT'}`}
                        {viewMode === 'review' && 'VERIFY REGIONAL STOCK OVERWRITES'}
                        {viewMode === 'quarantine' && 'DAMAGED GOODS LIQUIDATION & HISTORY'}
                        {viewMode === 'monitor' && 'REAL-TIME FACILITY OVERWATCH'}
                        {!isHighCommand && viewMode === 'count' && <span className="bg-[var(--danger-well)] text-[var(--danger-ink)] border border-[var(--danger)] px-2 py-0.5 rounded text-[11px] font-black tracking-widest flex items-center gap-1"><EyeOff size={10}/> BLIND COUNT ENFORCED</span>}
                    </p>
                </div>
                
                {isHighCommand && (
                    <div className="flex bg-[var(--sunk)] rounded-lg p-1 border border-[var(--line)] w-full md:w-auto overflow-x-auto custom-scrollbar">
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
                <div className="flex-1 flex flex-col min-h-0 bg-[var(--sunk)] rounded-xl border border-[var(--line)] shadow-inner p-4 relative overflow-hidden animate-fade-in">
                    
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
                                <div key={p.id} className="bg-[var(--raised)] border border-[var(--line)] rounded-xl overflow-hidden flex flex-col shadow-lg transition-all hover:border-[var(--line)] relative group">
                                    
                                    {/* Background Accent */}
                                    <div className="absolute -top-4 -right-4 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                                        <BarChart size={100} className="text-[var(--ink-dim)]" />
                                    </div>

                                    {/* Header */}
                                    <div className="flex items-center p-4 border-b border-[var(--line)] bg-[var(--sunk)] z-10 border-[var(--line)]">
                                        <div className="w-12 h-12 bg-[var(--sunk)] border border-[var(--line)] rounded-lg overflow-hidden shrink-0 flex items-center justify-center shadow-inner border-[var(--line)]">
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
                                        <div className="flex items-center justify-between bg-[var(--sunk)] border border-[var(--line)] rounded-lg p-3 shadow-inner">
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
                                                    <span className="bg-[var(--danger-well)] text-[var(--danger-ink)] border border-[var(--danger)] px-2 py-1 rounded text-[11px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(220,38,38,0.2)] animate-pulse">Low Stock</span>
                                                ) : (
                                                    <span className="bg-[var(--sunk)] text-[var(--accent-ink)] border border-[var(--accent-edge)] px-2 py-1 rounded text-[11px] font-black uppercase tracking-widest">Healthy</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Breakdowns Row */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-[var(--sunk)] border border-[var(--line)] rounded-lg p-2.5 text-center shadow-inner hover:border-[var(--accent-edge)] transition-colors">
                                                <span className="text-[11px] text-[var(--accent-ink)] font-bold uppercase tracking-widest mb-1 block">Field</span>
                                                <span className="text-[var(--accent-ink)] font-black font-mono text-sm">{stat.field}</span>
                                            </div>
                                            <div className="bg-[var(--sunk)] border border-[var(--line)] rounded-lg p-2.5 text-center shadow-inner hover:border-[var(--line)] transition-colors">
                                                <span className="text-[11px] text-[var(--ink-dim)] font-bold uppercase tracking-widest mb-1 block">Sold</span>
                                                <span className="text-[var(--ink-dim)] font-black font-mono text-sm">{stat.sold}</span>
                                            </div>
                                            <div className="bg-[var(--sunk)] border border-[var(--line)] rounded-lg p-2.5 text-center shadow-inner hover:border-[var(--danger)] transition-colors">
                                                <span className="text-[11px] text-[var(--danger-ink)] font-bold uppercase tracking-widest mb-1 block">Damaged</span>
                                                <span className="text-[var(--danger-ink)] font-black font-mono text-sm">{stat.damaged}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Multi-Color Progress Bar */}
                                    <div className="h-1.5 w-full bg-[var(--sunk)] flex mt-auto border-t border-[var(--line)] border-[var(--line)]">
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
                <div className="flex-1 flex flex-col min-h-0 bg-[var(--sunk)] rounded-xl border border-[var(--accent-edge)] shadow-inner p-4 relative overflow-hidden animate-fade-in">
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
                            <div className="text-right w-full md:w-auto bg-[var(--sunk)] p-3 rounded-lg border border-[var(--accent-edge)]">
                                <p className="text-[11px] text-[var(--ink-dim)] uppercase font-bold tracking-widest mb-1">Sunk Capital (Dead Asset Value)</p>
                                <p className="text-xl font-black text-[var(--accent-ink)] font-mono tabular-nums">
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
                                                <div className="p-3 bg-[var(--sunk)] text-[var(--accent-ink)] rounded-full border border-[var(--accent-edge)] shrink-0"><PackageMinus size={24}/></div>
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
                                                <button onClick={() => setResolutionModal({item, method: 'SAMPLING'})} className="flex-1 xl:flex-none px-4 py-2 bg-[var(--raised)] hover:bg-[color-mix(in_srgb,var(--alt-ink)_12%,var(--raised))] border border-[var(--alt-edge)] text-[var(--alt-ink)] rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors active:scale-[0.97]">
                                                    <FlaskConical size={14}/> Convert to Sample
                                                </button>
                                                <button onClick={() => setResolutionModal({item, method: 'RTV'})} className="flex-1 xl:flex-none px-4 py-2 bg-[var(--raised)] hover:bg-[color-mix(in_srgb,var(--ink)_8%,var(--raised))] border border-[var(--line)] text-[var(--ink)] rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors active:scale-[0.97]">
                                                    <Undo2 size={14}/> RTV Factory
                                                </button>
                                                <button onClick={() => setResolutionModal({item, method: 'PENALTY'})} className="kpm-rim-neon flex-1 xl:flex-none px-4 py-2 bg-[var(--raised)] hover:bg-[color-mix(in_srgb,var(--danger)_14%,var(--raised))] border border-[var(--danger)] text-[var(--danger-ink)] rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-lg">
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
                                                    <span className={`text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1 ${log.method === 'SAMPLING' ? 'bg-[var(--sunk)] text-[var(--accent-ink)] border border-[var(--line)]' : log.method === 'RTV' ? 'bg-[var(--sunk)] text-[var(--accent-ink)] border border-[var(--line)]' : 'bg-[var(--danger)] text-[var(--danger-ink)] border border-[var(--danger)]'} `}>
                                                        {log.method === 'SAMPLING' && <FlaskConical size={10}/>}
                                                        {log.method === 'RTV' && <Undo2 size={10}/>}
                                                        {log.method === 'PENALTY' && <BadgeDollarSign size={10}/>}
                                                        {log.method}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--ink-dim)] font-mono">{timeStr}</span>
                                                </div>
                                                <h4 className="font-bold text-[var(--ink)] uppercase text-sm">{log.qty} Bks • {log.productName}</h4>
                                                <p className="text-[10px] text-[var(--ink-dim)] font-mono mt-1">Facility: {log.facility} | Executed By: {log.resolvedBy?.toUpperCase()}</p>
                                                
                                                <div className="mt-2 text-[10px] text-[var(--ink-dim)] font-mono bg-[var(--sunk)] p-2 rounded border border-[var(--line)]">
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
                                                <div className={`p-3 rounded-full border bg-[var(--sunk)] ${isHistory ? (audit.status === 'APPROVED' ? 'border-[var(--accent-edge)] text-[var(--accent-ink)]' : 'border-[var(--danger)] text-[var(--danger-ink)]') : (hasIssues ? 'border-[var(--danger)] text-[var(--danger-ink)]' : 'border-[var(--accent-edge)] text-[var(--accent-ink)]')} `}>
                                                    {isHistory ? (audit.status === 'APPROVED' ? <CheckCircle size={20}/> : <X size={20}/>) : (hasIssues ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-black text-[var(--ink)] flex items-center gap-2 uppercase">
                                                            <Database size={14} className="text-[var(--ink-dim)]"/> {audit.branchLocation}
                                                        </h3>
                                                        {isHistory && (
                                                            <span className={`text-[11px] border px-2 py-0.5 rounded font-black tracking-widest uppercase border-[var(--line)] ${audit.status === 'APPROVED' ? 'bg-[var(--sunk)] text-[var(--accent-ink)] border-[var(--accent-edge)]' : 'bg-[var(--sunk)] text-[var(--danger-ink)] border-[var(--danger)]'} `}>
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
                                            <div className="border-t border-[var(--line)] bg-[var(--sunk)] p-4">
                                                
                                                {isHistory && audit.status === 'REJECTED' && audit.rejectReason && (
                                                    <div className="mb-4 bg-[var(--danger-well)] border border-[var(--danger)] p-3 rounded text-[10px] font-mono text-[var(--danger-ink)]">
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
                                                                    <span className="flex items-center gap-2 min-w-0">
                                                                        <span className="font-bold text-xs text-[var(--ink)] uppercase truncate">{item.name}</span>
                                                                        {/* LEAK, not miscount. Reads the audits already on file - short in at
                                                                            least two of the last three or more counts. Dark plate, red edge,
                                                                            red ink: it is a warning, not a slab. */}
                                                                        {(() => {
                                                                            const streak = shortageStreak(auditHistory, item.productId);
                                                                            if (!isLeak(streak)) return null;
                                                                            return (
                                                                                <span title="This product has come up short repeatedly. That is a leak, not a counting mistake."
                                                                                      className="shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-[var(--sunk)] border border-[var(--danger)] text-[var(--danger-ink)] whitespace-nowrap">
                                                                                    Short {streak.short} of last {streak.total}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </span>
                                                                    <div className="flex items-center gap-4 text-xs font-mono">
                                                                        {/* SAME FAULT AS THE COUNT ROW, ON HQ's SIDE. This printed
                                                                            expectedStock alone - healthy only - next to a totalFound
                                                                            that counts good + damaged, so a perfect count of 100
                                                                            healthy and 5 damaged read "SYS 100 -> FND 105 -> 0" and
                                                                            looked like five boxes appearing from nowhere. The damaged
                                                                            half is now named, so both sides measure the same thing.
                                                                            `|| 0` matters: audits saved before the split have no
                                                                            expectedDamagedStock at all. */}
                                                                        <span className="text-[var(--ink-dim)]">
                                                                            SYS: {(item.expectedStock || 0) + (item.expectedDamagedStock || 0)}
                                                                            {(item.expectedDamagedStock || 0) > 0 && (
                                                                                <span className="text-[var(--danger-ink)]"> ({item.expectedDamagedStock} dmg)</span>
                                                                            )}
                                                                        </span>
                                                                        <span className="text-[var(--ink-dim)]">→</span>
                                                                        <span className="text-[var(--ink-dim)] font-bold">FND: {item.totalFound}</span>
                                                                        {/* the SAME rule the agent's row uses. `item.matched` is not a
                                                                            field on the record - a blanket rename put it here and it would
                                                                            have painted every HQ row red, on a value that never exists. */}
                                                                        <span className={`w-12 text-right font-black ${withinTolerance(item.variance) ? 'text-[var(--accent-ink)]' : 'text-[var(--danger-ink)]'} `}>
                                                                            {item.variance > 0 ? '+' : ''}{item.variance}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* WHAT KIND OF DAMAGE, for the person deciding what it costs.
                                                                    HQ resolves quarantine as RTV, SAMPLING or PENALTY, and only
                                                                    PENALTY charges the agent - so the cause is the input to that
                                                                    decision, not decoration. Absent on older audits, which simply
                                                                    show nothing here. */}
                                                                {(item.varianceReason || item.threeWayDisagreement || item.countedTwice) && (
                                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                                        {item.varianceReason && (
                                                                            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[var(--sunk)] border border-[var(--alt-edge)] text-[var(--alt-ink)]">
                                                                                Cause: {item.varianceReason}
                                                                            </span>
                                                                        )}
                                                                        {/* what the agent's number is WORTH as evidence */}
                                                                        {item.threeWayDisagreement ? (
                                                                            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[var(--sunk)] border border-[var(--danger)] text-[var(--danger-ink)]">
                                                                                Three different counts — you decide
                                                                            </span>
                                                                        ) : item.countedTwice && (
                                                                            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[var(--sunk)] border border-[var(--accent-edge)] text-[var(--accent-ink)]">
                                                                                Counted twice
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {Array.isArray(item.damageKinds) && item.damageKinds.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                                        {item.damageKinds.map((k, ki) => (
                                                                            <span key={ki} className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[var(--sunk)] border border-[var(--danger)] text-[var(--danger-ink)]">
                                                                                {k.reason} · {k.qty}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                <div className="flex gap-4 items-center">
                                                                    <div className="bg-[var(--sunk)] px-3 py-1.5 rounded border border-[var(--line)] flex-1 flex justify-between items-center text-[10px] font-mono">
                                                                        <span className="text-[var(--ink-dim)]">Good Condition:</span>
                                                                        <span className="text-[var(--ink-dim)] font-bold">{item.goodCount} Bks</span>
                                                                    </div>
                                                                    {item.damagedCount > 0 && (
                                                                        <div className="bg-[var(--sunk)] px-3 py-1.5 rounded border border-[var(--accent-edge)] flex-1 flex justify-between items-center text-[10px] font-mono">
                                                                            <span className="text-[var(--accent-ink)]">Damaged Claims:</span>
                                                                            <span className="text-[var(--accent-ink)] font-bold">{item.damagedCount} Bks</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {(isMissing || item.damagedPhotoUrl) && (
                                                                    <div className="mt-2 flex items-center justify-between bg-[var(--sunk)] p-2 rounded">
                                                                        {isMissing ? (
                                                                            <span className="text-[11px] text-[var(--danger-ink)] font-bold uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={10}/> Unaccounted Shrinkage Detected</span>
                                                                        ) : <span></span>}

                                                                        {item.damagedPhotoUrl && (
                                                                            <button onClick={() => setViewingImage(item.damagedPhotoUrl)} className="text-[11px] bg-[var(--sunk)] text-[var(--accent-ink)] hover:text-[var(--ink)] border border-[var(--line)] px-2 py-1 rounded font-bold uppercase flex items-center gap-1 transition-colors">
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
                                                        <button onClick={() => handleRejectAudit(audit)} disabled={isProcessingAudit} className="flex-1 bg-[var(--raised)] hover:bg-[color-mix(in_srgb,var(--danger)_14%,var(--raised))] border border-[var(--danger)] text-[var(--danger-ink)] py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors uppercase tracking-widest">
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
                    <div className="p-3 border-b border-[var(--line)] bg-[var(--sunk)] relative">
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Scan or Search Product..." className="bg-[var(--sunk)] border border-[var(--line)] pl-9 pr-4 py-3 rounded-lg text-sm w-full focus:border-[var(--accent-edge)] outline-none text-[var(--ink)] placeholder:text-[var(--ink-dim)] font-mono"/>
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
                                /* frozen when he started this row, so a sale landing mid-count
                                   cannot move the number he is counting against */
                                const target = expectedOf(item, entry);
                                /* under one whole pack is loose sticks, not a difference - see
                                   VARIANCE_TOLERANCE_BKS. The FIGURE is still printed exactly as
                                   counted; only the verdict treats it as a match. */
                                const matched = withinTolerance(variance);
                                const recount = hasTyped ? recountState(entry, target)
                                                         : { needsRecount: false, confirmed: false, disagreement: false, passes: 0 };
                                const hasTyped = goodVal !== '' || damagedVal !== '';
                                const isRevealed = showExpectedWhileCounting || (hasEntry && hasTyped);

                                /* THE COUNTING CARD, rebuilt 2026-08-20 from his screenshot. The old labels were
                                        positioned ON TOP of the inputs, so "GOOD STOCK" wrapped to two lines and
                                        covered the number he had just typed. Labels now sit ABOVE the field and
                                        cannot collide with it at any width. Theme tokens only: the fixed blacks and
                                        the greens are gone, per the palette law and his own answer - a match is
                                        gold, a mismatch is red. */
                                return (
                                    
                                    <div key={item.id} className={`relative overflow-hidden bg-[var(--raised)] rounded-xl border transition-colors ${hasTyped ? (matched ? 'border-[var(--accent-edge)]' : 'border-[var(--danger)]') : 'border-[var(--line)]'} `}>
                                        {/* one glance down the list says which rows are done and which are off */}
                                        <span className={`absolute left-0 top-0 bottom-0 w-1 ${hasTyped ? (matched ? 'bg-[var(--accent-edge)]' : 'bg-[var(--danger)]') : 'bg-[var(--line)]'} `} aria-hidden="true"></span>
                                        <div className="pl-4 pr-3 py-3 md:py-4 flex flex-col md:flex-row md:items-end gap-3 md:gap-6">
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-[var(--ink)] text-sm uppercase tracking-wide truncate">{item.name}</div>
                                                <div className="text-[10px] text-[var(--ink-dim)] font-mono mt-0.5 truncate">ID: {item.id}</div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 w-full md:w-auto md:shrink-0">
                                                <label className="flex flex-col gap-1 min-w-0">
                                                    <span className="text-[10px] text-[var(--ink-dim)] font-bold uppercase tracking-widest whitespace-nowrap">Good stock</span>
                                                    <input type="number" inputMode="numeric" min="0" placeholder="0" value={goodVal} onChange={(e) => handleCountChange(item.id, 'good', e.target.value)} className="w-full md:w-28 text-center py-2.5 rounded-lg border border-[var(--line)] bg-[var(--sunk)] text-[var(--ink)] focus:border-[var(--accent-edge)] outline-none font-black text-lg font-mono tabular-nums placeholder:text-[var(--ink-dim)]"/>
                                                </label>
                                                <label className="flex flex-col gap-1 min-w-0">
                                                    <span className="text-[10px] text-[var(--accent-ink)] font-bold uppercase tracking-widest whitespace-nowrap">Damaged</span>
                                                    <input type="number" inputMode="numeric" min="0" placeholder="0" value={damagedVal} onChange={(e) => handleCountChange(item.id, 'damaged', e.target.value)} className="w-full md:w-28 text-center py-2.5 rounded-lg border border-[var(--line)] bg-[var(--sunk)] text-[var(--accent-ink)] focus:border-[var(--accent-edge)] outline-none font-black text-lg font-mono tabular-nums placeholder:text-[var(--ink-dim)]"/>
                                                </label>
                                            </div>
                                        </div>

                                        {isRevealed && (
                                            <div className="pl-4 pr-3 pb-3 md:pb-4 pt-0 flex flex-col gap-3">
                                              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                                                {/* FOUR figures, not three, and every label written out in full.
                                                    "SYS EXPECTED" printed healthy stock only while "FOUND" counted good +
                                                    damaged, so 100 healthy + 5 damaged counted perfectly read
                                                    "EXPECTED 100 -> FOUND 105 -> MATCH 0" and looked like five extra
                                                    boxes. The expected damage now has a plate of its own, so both halves
                                                    of the comparison measure the same thing.
                                                    ⚠️ THE VERDICT IS AN EDGE, NOT A GOLD SLAB. Aldi, 2026-08-21: "stop
                                                    using amber background i said, i hate it, use it for little things". */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--line)] rounded-lg overflow-hidden text-center w-full md:w-auto md:inline-grid">
                                                    <div className="bg-[var(--sunk)] px-3 py-2 md:px-4 border border-transparent">
                                                        <div className="text-[9px] text-[var(--ink-dim)] font-bold uppercase tracking-widest whitespace-nowrap">Expected good</div>
                                                        <div className="text-sm font-black font-mono tabular-nums text-[var(--ink)]">{formatNumber(target.stock)}</div>
                                                    </div>
                                                    <div className="bg-[var(--sunk)] px-3 py-2 md:px-4 border border-transparent">
                                                        <div className="text-[9px] text-[var(--danger-ink)] font-bold uppercase tracking-widest whitespace-nowrap">Expected damaged</div>
                                                        <div className="text-sm font-black font-mono tabular-nums text-[var(--danger-ink)]">{formatNumber(target.damaged)}</div>
                                                    </div>
                                                    <div className="bg-[var(--sunk)] px-3 py-2 md:px-4 border border-transparent">
                                                        <div className="text-[9px] text-[var(--ink-dim)] font-bold uppercase tracking-widest whitespace-nowrap">Total found</div>
                                                        <div className="text-sm font-black font-mono tabular-nums text-[var(--ink)]">{formatNumber(totalFound)}</div>
                                                    </div>
                                                    {/* A BORDER, NOT A RING. Tailwind's `ring` is a box-shadow, and Lite Mode
                                                        strips box-shadow — the verdict would have lost its only edge on a
                                                        cheap phone. Every plate carries a transparent border so the coloured
                                                        one costs no shift. */}
                                                    <div className={`bg-[var(--sunk)] px-3 py-2 md:px-4 border ${matched ? 'border-[var(--accent-edge)]' : 'border-[var(--danger)]'} `}>
                                                        <div className={`text-[9px] font-bold uppercase tracking-widest ${matched ? 'text-[var(--accent-ink)]' : 'text-[var(--danger-ink)]'} `}>{matched ? 'Match' : 'Difference'}</div>
                                                        <div className={`text-sm font-black font-mono tabular-nums ${matched ? 'text-[var(--accent-ink)]' : 'text-[var(--danger-ink)]'} `}>{variance > 0 ? '+' : ''}{formatNumber(variance)}</div>
                                                    </div>
                                                </div>

                                                {Number(damagedVal) > 0 && (
                                                    <div className="w-full md:w-auto">
                                                        {entry.photo ? (
                                                            <div className="flex items-center gap-2 bg-[var(--sunk)] border border-[var(--accent-edge)] px-3 py-1.5 rounded"><ImageIcon size={14} className="text-[var(--accent-ink)]"/><span className="text-[10px] text-[var(--accent-ink)] font-bold uppercase tracking-widest">Damage Proof Attached</span><button onClick={() => handleClearPhoto(item.id)} className="ml-2 text-[var(--danger-ink)] hover:text-[var(--danger-ink)]"><X size={12}/></button></div>
                                                        ) : (
                                                            <label className="cursor-pointer flex items-center gap-2 bg-[var(--sunk)] hover:bg-[var(--sunk)] border border-dashed border-[var(--accent-edge)] px-4 py-2 rounded text-[10px] font-bold text-[var(--accent-ink)] uppercase tracking-widest transition-colors"><Camera size={14}/> Upload Damaged Proof<input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(item.id, e.target.files[0])} /></label>
                                                        )}
                                                    </div>
                                                )}
                                              </div>

                                                {/* ---- COUNT IT AGAIN ----
                                                    ⚠️ NEVER NAMES THE DIFFERENCE. "You are 5 short" hands a blind
                                                    tier the answer the screen exists to withhold, and it tells any
                                                    tier exactly what to type to make the warning go away. */}
                                                {recount.needsRecount && (
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-lg bg-[var(--sunk)] border border-[var(--danger)]">
                                                        <span className="flex-1 min-w-0 text-[11px] font-bold text-[var(--danger-ink)] leading-relaxed">
                                                            <span className="font-black uppercase tracking-widest">Count this one again.</span>{' '}
                                                            Most differences are miscounts. It is only reported once the same number comes up twice.
                                                        </span>
                                                        <button type="button" onClick={() => startRecount(item.id)}
                                                            className="shrink-0 min-h-[40px] px-4 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[var(--raised)] border border-[var(--danger)] text-[var(--danger-ink)] hover:border-[var(--danger-ink)] transition-colors">
                                                            Clear and count again
                                                        </button>
                                                    </div>
                                                )}
                                                {recount.confirmed && (
                                                    <div className="px-3 py-2 rounded-lg bg-[var(--sunk)] border border-[var(--accent-edge)] text-[10px] font-black uppercase tracking-widest text-[var(--accent-ink)]">
                                                        Counted twice — same answer, this goes to HQ
                                                    </div>
                                                )}
                                                {recount.disagreement && (
                                                    <div className="px-3 py-2 rounded-lg bg-[var(--sunk)] border border-[var(--alt-edge)] text-[10px] font-black uppercase tracking-widest text-[var(--alt-ink)]">
                                                        Three different counts — all three go to HQ
                                                    </div>
                                                )}

                                                {/* ---- WHY IT DISAGREES ----
                                                    Only once the difference has survived the recount. A cause typed
                                                    on the first guess is a guess. Same reel as the damage kinds -
                                                    he approved that control by eye, and a second control that looked
                                                    different on the same screen would be the mistake here. */}
                                                {(recount.confirmed || recount.disagreement) && (() => {
                                                    const vPos = varPos[item.id];
                                                    const chosen = vPos !== undefined && vPos >= 0;
                                                    const missing = varianceReasonMissing(entry, recount);
                                                    return (
                                                        <div className="flex gap-2 items-stretch">
                                                            <div className={`kpm-dmg-win ${varSnap[item.id] ? 'is-snap' : ''} flex-1 min-w-0 rounded-lg bg-[var(--sunk)] border ${missing ? 'border-[var(--danger)]' : 'border-[var(--accent-edge)]'} `}>
                                                                <div className="kpm-dmg-reel" style={{ '--i': chosen ? VARIANCE_REASONS.length - 1 - vPos : VARIANCE_REASONS.length }}>
                                                                    {VARIANCE_REASONS.slice().reverse().map(r => (
                                                                        <button key={r.value} type="button" onClick={() => stepVarianceReason(item.id, 1)}
                                                                            className="kpm-dmg-face w-full text-left text-[11px] font-black uppercase tracking-wider text-[var(--accent-ink)]">
                                                                            <span className="truncate">{r.label}</span>
                                                                        </button>
                                                                    ))}
                                                                    {/* face 0 of the strip, and the one it can never come back to */}
                                                                    <button type="button" onClick={() => stepVarianceReason(item.id, 1)}
                                                                        className="kpm-dmg-face w-full text-left text-[11px] font-black uppercase tracking-wider text-[var(--danger-ink)]">
                                                                        <span className="truncate">Tap to say what happened</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-1 shrink-0">
                                                                <button type="button" aria-label="Previous cause" onClick={() => stepVarianceReason(item.id, -1)}
                                                                    className="w-9 flex-1 rounded-md border border-[var(--line)] text-[var(--ink-dim)] text-[10px] hover:text-[var(--accent-ink)] hover:border-[var(--accent-edge)] transition-colors">{'▲'}</button>
                                                                <button type="button" aria-label="Next cause" onClick={() => stepVarianceReason(item.id, 1)}
                                                                    className="w-9 flex-1 rounded-md border border-[var(--line)] text-[var(--ink-dim)] text-[10px] hover:text-[var(--accent-ink)] hover:border-[var(--accent-edge)] transition-colors">{'▼'}</button>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* ---- WHAT KIND OF DAMAGE ----
                                                    One line until pressed, because a wall-to-wall count is forty rows and
                                                    an open panel on each is unusable. Closed, the line still carries the
                                                    number, the progress and the red state, so nothing is hidden that has
                                                    a problem in it. */}
                                                {Number(damagedVal) > 0 && (() => {
                                                    const dmgTotal = Number(damagedVal || 0);
                                                    const kinds = entry?.kinds || {};
                                                    const sorted = damageSorted(entry);
                                                    const blocked = damageBlocked(entry);
                                                    const pos = dmgPos[item.id] || 0;
                                                    const isOpen = !!dmgOpen[item.id];
                                                    const kindCount = Object.keys(kinds).length;
                                                    return (
                                                        <div>
                                                            <button type="button" onClick={() => toggleDamagePanel(item.id)}
                                                                aria-expanded={isOpen}
                                                                className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[var(--sunk)] border text-left transition-colors ${blocked ? 'border-[var(--danger)] text-[var(--danger-ink)]' : 'border-[var(--accent-edge)] text-[var(--accent-ink)]'} `}>
                                                                <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">{formatNumber(dmgTotal)} Damaged</span>
                                                                <span className="flex-1 min-w-0 truncate text-[11px] font-bold font-mono tabular-nums text-[var(--ink-dim)]">
                                                                    {blocked ? `${sorted} of ${dmgTotal} sorted` : `${kindCount} kind${kindCount === 1 ? '' : 's'} recorded`}
                                                                </span>
                                                                <span className="text-[10px] shrink-0" aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
                                                            </button>

                                                            <div className={`kpm-dmg-panel ${isOpen ? 'is-open' : ''} `}>
                                                              <div className="kpm-dmg-inner">
                                                                <div className="pt-2.5 flex flex-col gap-2.5">
                                                                    {/* the ONE amber fill left on this control, and its LENGTH is the data */}
                                                                    <div className="h-[3px] rounded-sm bg-[var(--sunk)] overflow-hidden">
                                                                        <span className={`block h-full ${blocked ? 'bg-[var(--danger)]' : 'bg-[var(--gold)]'} `}
                                                                              style={{ width: `${dmgTotal ? Math.min(100, (sorted / dmgTotal) * 100) : 0}%` }}></span>
                                                                    </div>

                                                                    <div className="flex gap-2 items-stretch">
                                                                        <div className={`kpm-dmg-win ${dmgSnap[item.id] ? 'is-snap' : ''} flex-1 min-w-0 rounded-lg bg-[var(--sunk)] border border-[var(--accent-edge)]`}>
                                                                            {/* built in REVERSE so a press lowers --i and the strip travels DOWN */}
                                                                            <div className="kpm-dmg-reel" style={{ '--i': DAMAGE_REASONS.length - 1 - pos }}>
                                                                                {DAMAGE_REASONS.slice().reverse().map(r => (
                                                                                    <div key={r.value} className="kpm-dmg-face">
                                                                                        <button type="button" onClick={() => stepDamageKind(item.id, 1)}
                                                                                            className="flex-1 min-w-0 text-left truncate text-[11px] font-black uppercase tracking-wider text-[var(--accent-ink)]">
                                                                                            {r.label}
                                                                                        </button>
                                                                                        <input type="number" min="0" inputMode="numeric" placeholder="0"
                                                                                            value={kinds[r.value] ?? ''}
                                                                                            aria-label={`How many ${r.label}`}
                                                                                            onChange={(e) => setDamageKindQty(item.id, r.value, e.target.value)}
                                                                                            className="w-[60px] shrink-0 text-center px-1 py-1.5 rounded bg-[var(--raised)] text-[var(--accent-ink)] border border-[var(--line)] focus:border-[var(--accent-edge)] outline-none font-mono tabular-nums font-black text-[15px]"/>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col gap-1 shrink-0">
                                                                            <button type="button" aria-label="Previous kind of damage" onClick={() => stepDamageKind(item.id, -1)}
                                                                                className="w-9 flex-1 rounded-md border border-[var(--line)] text-[var(--ink-dim)] text-[10px] hover:text-[var(--accent-ink)] hover:border-[var(--accent-edge)] transition-colors">{'▲'}</button>
                                                                            <button type="button" aria-label="Next kind of damage" onClick={() => stepDamageKind(item.id, 1)}
                                                                                className="w-9 flex-1 rounded-md border border-[var(--line)] text-[var(--ink-dim)] text-[10px] hover:text-[var(--accent-ink)] hover:border-[var(--accent-edge)] transition-colors">{'▼'}</button>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center justify-center gap-2.5">
                                                                        <div className="flex gap-1.5 items-center">
                                                                            {DAMAGE_REASONS.map((r, i) => (
                                                                                <span key={r.value} className={`kpm-dot ${Number(kinds[r.value] || 0) > 0 ? 'has' : ''} ${i === pos ? 'now' : ''} `}></span>
                                                                            ))}
                                                                        </div>
                                                                        <span className="text-[9px] font-black tracking-widest text-[var(--ink-dim)] font-mono tabular-nums">{pos + 1} / {DAMAGE_REASONS.length}</span>
                                                                    </div>
                                                                </div>
                                                              </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 bg-[var(--sunk)] border-t border-[var(--line)] flex flex-col md:flex-row justify-between items-center gap-4 z-10 relative">
                        <div className="text-xs text-[var(--ink-dim)] font-bold uppercase w-full md:w-auto text-center md:text-left tracking-widest">{Object.keys(counts).length} Wares Counted</div>
                        <div className="flex w-full md:w-auto gap-3">
                            <button onClick={() => setCounts({})} className="flex-1 md:flex-none justify-center px-4 py-3 md:py-2 text-[var(--ink-dim)] hover:text-[var(--ink)] font-bold text-xs flex items-center gap-2 transition-colors bg-[var(--raised)] border border-[var(--line)] rounded-lg"><RefreshCcw size={14}/> Reset</button>
                            <button onClick={handleCommit} disabled={isSubmitting || Object.keys(counts).length === 0} className="flex-1 md:flex-none justify-center bg-[var(--gold)] hover:bg-[var(--gold)] text-[var(--gold-ink)] disabled:bg-[var(--sunk)] disabled:text-[var(--ink-dim)] disabled:border disabled:border-[var(--line)] disabled:shadow-none disabled:cursor-not-allowed px-8 py-3 md:py-2 rounded-lg font-black shadow-lg flex items-center gap-2 transition-all active:scale-95 tracking-widest uppercase text-xs">{isSubmitting ? <RefreshCcw size={16} className="animate-spin"/> : <Send size={16}/>} Submit to HQ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockOpnameView;