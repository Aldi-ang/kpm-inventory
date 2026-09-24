import React, { useState, useEffect, useMemo } from 'react';
import { 
    Truck, UserPlus, Save, Archive,
    MapPin, Activity, X, AlertCircle, ShoppingCart, User, Mail, Pencil, Trash2, 
    ShieldCheck, ChevronDown, ChevronUp, Crown, FileText, Printer, MessageSquare, Globe, Search, Plus
} from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, updateDoc, writeBatch, runTransaction, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { DYNAMIC_TIERS, isFieldLevelTier, canEditFleetRoster, tierWord } from './config/permissions';
import { convertToBks, isSafeDocIdEmail, getLocalDayKey} from './utils/helpers';
import { normalizeRegion } from './config/permissions';
import { confirmAction } from './components/ConfirmGate.jsx';
import { notify } from './components/Toast.jsx';
import LoadingBay from './components/LoadingBay.jsx';
import { damagedInVan } from './utils/vanBay';

export default function FleetCanvasManager({ db, appId, user, userRole, agentProfileId, inventory, transactions = [], appSettings = {}, logAudit, triggerCapy, isAdmin, motorists = [], previewing = null, masterUserId = null }) {

    const isGlobalAdmin = ['DEVELOPER', 'COMPANY_OWNER', 'ADMIN'].includes(userRole);
    const isAreaAdmin = !isGlobalAdmin;

    /* 🔴 WHOSE VAULT THIS SCREEN READS AND WRITES — and it must be the same one App used, or a
       listener subscribes to a collection nobody writes to.

       This line used to be `user?.uid || user?.id`, re-derived here WITHOUT `bossUid`. App.jsx:453
       redirects every database call in the app to the owner's vault (`bossUid || user.uid`), so on
       any account that is not the owner's own, the nine paths below pointed at the signed-in
       person's empty vault: the roster listener returned nothing, `myProfile` was undefined,
       `rawLocation` fell through to 'UNASSIGNED', and the screen read "UNASSIGNED ROSTER — no
       personnel found" while the staff sat in the owner's vault the whole time. His report,
       2026-09-09: *"my tier 4 cant even detect its own sales team inside the fleet and roster"*.

       It is not only a read. `handleLoadCanvas` and the reconcile path WRITE branch stock and
       product counts through these same paths, and the GPS-bypass approvals at the bottom of this
       file update documents by this id — so a wrong vault here moves real stock into a collection
       nobody reads.

       IDENTICAL to the MerchantSalesView G5 fault (a salesman's IOUs written to his own vault while
       the list was read from the boss's). On the owner's own account `bossUid === user.uid`, so this
       expression returns exactly what the old one did and nothing about his experience moves.
       The fallback chain stays so a caller that forgets the prop degrades to the old behaviour
       rather than to 'default'. */
    const userId = masterUserId || user?.uid || user?.id || 'default';
    const collPath = `artifacts/${appId}/users/${userId}/motorists`;

    const [localFleet, setLocalFleet] = useState([]);
    const [isFetchingFleet, setIsFetchingFleet] = useState(isAreaAdmin);
    /* The listener's failure used to go to console.warn and nowhere else, so a refused read and a
       genuinely empty branch produced the SAME screen: "no personnel found". That is the silence
       Aldi calls a bug — an empty roster has three different causes and the reader cannot act
       until the screen says which one. */
    const [fleetError, setFleetError] = useState(null);

    useEffect(() => {
        if (isAreaAdmin) {
            const fleetRef = collection(db, collPath);
            const unsub = onSnapshot(fleetRef, (snap) => {
                setLocalFleet(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setFleetError(null);
                setIsFetchingFleet(false);
            }, (err) => { console.warn("Fleet roster listener:", err.code); setFleetError(err.code || 'unknown'); setIsFetchingFleet(false); });
            return () => unsub();
        }
    }, [db, collPath, isAreaAdmin]);

    const activeMotorists = isAreaAdmin ? localFleet : motorists;

    /* 🎭 THE EMAIL LOOKUP STANDS DOWN WHILE PREVIEWING - second instance of the trap fixed in
       AgentInventoryView (9a35e8e). `previewIdentity` moves agentId and userRole onto the test
       account and deliberately leaves EMAIL alone, because the UID is Aldi's real sign-in. So this
       line found HIS OWN record whatever tier he was wearing, and `rawLocation` below - the BRANCH
       this whole screen operates as - reported his branch instead of the previewed one.

       It matters more here than it did there: region scoping is what hand-off approval and the
       geofence work both turn on, so testing either through the tier preview would have measured
       the wrong branch and passed or failed for the wrong reason.

       ⚠️ AND THE THING IT STANDS DOWN *TO* HAS TO EXIST. `agentProfileId` was destructured in this
       signature and NEVER PASSED by App.jsx until 2026-09-09, so under POV the whole expression was
       `null || find(m => m.id === undefined)` — nothing, on every tier, whatever was in the vault.
       That is what Aldi saw: *"my tier 4 cant even detect its own sales team"*, with [TEST] REGIONAL
       ADMIN sitting in the roster at Headquarters the entire time. A real login was unaffected,
       because the email lookup answers first — which is exactly why it survived: the fallback path
       only runs under the preview, and the preview is the one identity nobody re-tested afterwards.
       A prop with a default is silently fine when nobody passes it, and the default restores the bug.

       The lookup stays for real logins, which is what it is for. Do NOT instead make
       previewIdentity rewrite the email - see A-Brain, POV Changes the Id, Never the Email. */
    const myProfile = (previewing ? null : activeMotorists.find(m => m.email?.toLowerCase() === user?.email?.toLowerCase()))
        || activeMotorists.find(m => m.id === agentProfileId);
    
    const rawLocation = myProfile?.location || user?.location || 'UNASSIGNED';
    const searchLocation = String(rawLocation).trim().toLowerCase();
    const branchPathLocation = String(rawLocation).trim(); 

    /* 🔴 WHO MAY CHANGE ANYTHING ON THIS SCREEN — the permission matrix decides, nothing else.

       This line used to read `isAdmin || (isAreaAdmin && myProfile?.canEditRoster === true)`, and
       `isAreaAdmin` is only `!isGlobalAdmin` — it is true for tier 3, 4, 5 AND 6 alike. So it was
       never a tier check: any rookie whose own profile carried a stale `canEditRoster: true` could
       add, edit and terminate staff. Aldi caught it with the POV switch on its first run:
       *"i just checked looks like my tier 6 account can edit the fleet and canvas"*.
       His instruction was to move the decision: *"moved that into matrix on setting instead"*.
       `isAdmin` is gone from it deliberately too — that flag is the VAULT being unlocked, which is
       a different question from whether this tier may hire people, and reading it here is what let
       a tier-1 preview of tier 5 keep powers tier 5 does not have. The rule now lives in
       config/permissions.js and answers to the same matrix as every other permission. */
    const canEditFleet = canEditFleetRoster(userRole);

    const agents = useMemo(() => {
        if (isAreaAdmin) {
            return activeMotorists.filter(m => String(m.location || '').trim().toLowerCase() === searchLocation);
        }
        return activeMotorists;
    }, [activeMotorists, isAreaAdmin, searchLocation]);
    
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [isAddingAgent, setIsAddingAgent] = useState(false);
    const [isReadOnlyMode, setIsReadOnlyMode] = useState(false); 
    const [editingAgentId, setEditingAgentId] = useState(null); 
    
    const [branchStock, setBranchStock] = useState([]);

    // 🚀 FIX: Follows the SELECTED AGENT's own warehouse, not the viewer's — same rule as
    // EOD, Clear Canvas, and Load Canvas, so the number shown here always matches reality.
    const selectedAgentUsesBranch = selectedAgent
        ? isFieldLevelTier(selectedAgent.userRole) && selectedAgent.location && selectedAgent.location !== 'Headquarters' && selectedAgent.location !== 'UNASSIGNED AREA' && selectedAgent.location !== 'UNASSIGNED'
        : false;
    const selectedAgentLocation = selectedAgent?.location;

    useEffect(() => {
        if (selectedAgentUsesBranch) {
            const safeBranchPath = selectedAgentLocation.replace(/\//g, '-');
            const stockRef = collection(db, `artifacts/${appId}/users/${userId}/branches/${safeBranchPath}/inventory`);
            const unsub = onSnapshot(stockRef, (snap) => {
                setBranchStock(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }, (err) => console.warn("Branch stock listener:", err.code));
            return () => unsub();
        } else {
            setBranchStock([]);
        }
    }, [db, appId, userId, selectedAgentUsesBranch, selectedAgentLocation]);

    const displayInventory = useMemo(() => {
        if (!selectedAgentUsesBranch) return inventory; 
        return inventory.map(item => {
            const bItem = branchStock.find(b => b.id === item.id);
            return { ...item, stock: bItem ? (bItem.stock || 0) : 0 };
        });
    }, [inventory, branchStock, selectedAgentUsesBranch]);

    const defaultAgentState = {
        name: '', phone: '', vehicle: '', role: 'Motorist', email: '',
        allowedPayments: ['Cash'],
        allowedTiers: ['Retail', 'Ecer'],
        userRole: 'AGENT',
        location: isAreaAdmin ? branchPathLocation : 'Headquarters',
        province: myProfile?.province || 'Central Java',
        allowRetur: false,
        approvalRegions: [],
        allowCashRefund: false,
        joinDate: ''
    };
    const [newAgent, setNewAgent] = useState(defaultAgentState);

    const [searchTerm, setSearchTerm] = useState("");
    const [isNewProv, setIsNewProv] = useState(false);
    const [isNewLoc, setIsNewLoc] = useState(false);

    const existingProvinces = useMemo(() => [...new Set(activeMotorists.map(a => a.province ? a.province.trim().toUpperCase() : 'CENTRAL JAVA'))].sort(), [activeMotorists]);
    const existingLocations = useMemo(() => [...new Set(activeMotorists.map(a => a.location ? a.location.trim().toUpperCase() : 'UNASSIGNED AREA'))].sort(), [activeMotorists]);

    /* how many lines the van-loading bay's muatan holds, so switching the salesman can ask first */
    const [bayLines, setBayLines] = useState(0);
    /* the area tab that is open on the roster stage ("PROVINCE › LOCATION"), when more than one place is in view */
    const [rosterPlace, setRosterPlace] = useState(null);

    const [showHistory, setShowHistory] = useState(false);
    const [viewingReceipt, setViewingReceipt] = useState(null);
    const [viewingSuratJalan, setViewingSuratJalan] = useState(false); 

    const [allBypasses, setAllBypasses] = useState([]);

    useEffect(() => {
        if (!userId || !db || !appId) return;
        const bypassRef = collection(db, `artifacts/${appId}/users/${userId}/gps_bypasses`);
        const unsub = onSnapshot(bypassRef, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllBypasses(data.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)));
        }, (err) => console.warn("GPS bypasses listener:", err.code));
        return () => unsub();
    }, [userId, db, appId]);

    useEffect(() => {
        if (selectedAgent) {
            const updated = agents.find(m => m.id === selectedAgent.id);
            if (updated) setSelectedAgent(updated);
        }
    }, [agents, selectedAgent]);

    const togglePayment = (method) => {
        if (isReadOnlyMode) return;
        setNewAgent(prev => ({
            ...prev, allowedPayments: prev.allowedPayments.includes(method) ? prev.allowedPayments.filter(m => m !== method) : [...prev.allowedPayments, method]
        }));
    };

    /* 🤝 WHICH BRANCHES THIS ONE PERSON MAY AUTHORISE HAND-OFFS INTO.

       Aldi, 2026-09-06: *"i want the approval power to be given on specific person inside the fleet
       and canvas manager ... i only want this 1 account to have the power for approval in bandung
       only"*. It was briefly a permission-matrix row per tier, and he killed that on sight: a branch
       ticked against T4 reached EVERY T4 in the company, so the control meant to stop the approval
       flood caused it.

       The branch list is DATA. It comes from where the roster actually stands, unioned with every
       branch already granted to somebody. Without the union a branch vanishes from this control the
       day its last agent moves away, while the grant stays live in the database with no way on
       screen to take it back. */
    const approvalBranches = useMemo(() => {
        const live = (activeMotorists || [])
            .filter(m => m.userRole !== 'ADMIN')
            .map(m => normalizeRegion(m.location))
            .filter(r => r !== 'UNASSIGNED');
        const granted = (activeMotorists || [])
            .flatMap(m => Array.isArray(m.approvalRegions) ? m.approvalRegions : [])
            .map(normalizeRegion);
        return [...new Set([...live, ...granted])].sort();
    }, [activeMotorists]);

    const toggleApprovalRegion = (region) => {
        if (isReadOnlyMode) return;
        setNewAgent(prev => {
            const current = Array.isArray(prev.approvalRegions) ? prev.approvalRegions : [];
            return { ...prev, approvalRegions: current.includes(region)
                ? current.filter(r => r !== region)
                : [...current, region] };
        });
    };

    const toggleTier = (tier) => {
        if (isReadOnlyMode) return;
        setNewAgent(prev => ({
            ...prev, allowedTiers: prev.allowedTiers.includes(tier) ? prev.allowedTiers.filter(t => t !== tier) : [...prev.allowedTiers, tier]
        }));
    };

    const handleSaveAgent = async () => {
        if (isReadOnlyMode) return setIsAddingAgent(false); 
        
        /* 🚀 PHONE IS NOT REQUIRED, AND THE MESSAGE NAMES WHAT IS MISSING. Aldi, 2026-09-07, blocked
           mid-test: *"i want this disabled for the test account only since its all mine so that i
           can try ticking the location adn start testing"*.

           NAME and EMAIL stay required, and not out of caution:
             - the email IS the document id of artifacts/<appId>/employee_directory/<email>, so a
               blank one throws the raw "Invalid document reference" the isSafeDocIdEmail guard
               below already exists to catch;
             - a blank name puts the Google account name back on the consignment store cards, which
               is the bug fixed in 2e5a8ac an hour earlier.
           A phone number is neither a key nor a login. It was only ever data. */

        /* 🧪 …AND AN EMPTY ADDRESS, SAVED BY A GLOBAL ADMIN, IS THAT ADMIN IN ANOTHER FORM. Aldi,
           2026-09-07: *"just lock the email and phone number and all of the data the same with my
           tier 1 account"*, then *"yo why is it still like this on the test account, i said i want
           u to lift the requirement for tier 1 account"* — his existing test personnel carry NO
           address at all, so a rule that only recognised a MATCHING address never reached them.
           Blank now resolves to the signed-in admin's own address, which is what he asked for:
           the test tiers are his own account wearing a different tier.

           The requirement itself is untouched for everybody else. A non-admin, or an admin typing
           somebody else's address, still has to supply a real one — see isSelfProxy below for why
           these two cases cannot share a login mapping. */
        const typedEmail = (newAgent.email || '').toLowerCase().trim();
        const ownEmail = (user?.email || '').toLowerCase().trim();
        const isSelfProxy = !!ownEmail && isGlobalAdmin && (typedEmail === '' || typedEmail === ownEmail);
        const emailKey = isSelfProxy ? ownEmail : typedEmail;

        /* PHONE IS REQUIRED AGAIN FOR REAL PERSONNEL. His correction, 2026-09-07: *"make sure that
           email and phone number is still required for tier below 1"*. It comes off only for a
           self-proxy, where there is nobody to phone.

           ⚠️ WHY A SELF-PROXY GETS NO LOGIN MAPPING. `employee_directory/<email>` maps ONE email to
           ONE agentId, and both branches below write it. Saving a test person under the admin's own
           address repointed that admin's own login at the test record, so the next sign-in resolved
           them to it and demoted them out of Tier 1. Skipping the directory write is what makes
           sharing the address safe, and it is why the duplicate-email refusal stands down for these
           too — the uniqueness it protects is the login mapping, and these do not have one. */
        const missing = [
            !newAgent.name && 'Name',
            !emailKey && 'Google Account Email',
            !isSelfProxy && !(newAgent.phone || '').trim() && 'Phone',
        ].filter(Boolean);
        if (missing.length) return notify(`${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} still empty.`);
        if (newAgent.allowedPayments.length === 0) return notify("You must allow at least one Payment Method (e.g., Cash)!");
        if (newAgent.allowedTiers.length === 0) return notify("You must allow at least one Price Tier!");

        // 🚀 FIX: This is the exact class of input that crashed "Authorize & Register"
        // with a raw Firestore SDK error ("Invalid document reference... must have an
        // even number of segments") — a '/' where a '.' should be turns one document ID
        // into two extra path segments. Catch it here with a message that actually tells
        // the user what to fix, instead of the save silently blowing up below.
        if (!isSafeDocIdEmail(emailKey)) return notify(`"${emailKey}" doesn't look like a valid email address. Check for a stray "/" or space — it should look like name@domain.com.`);

        const isDupEmail = !isSelfProxy && activeMotorists.some(a => a.email?.toLowerCase().trim() === emailKey && a.id !== editingAgentId);
        // Only a phone that was actually typed can collide — same shape as isDupPlate below.
        // Without this, the second person left blank reads as a duplicate of the first.
        const isDupPhone = newAgent.phone?.trim() && activeMotorists.some(a => a.phone?.trim() === newAgent.phone.trim() && a.id !== editingAgentId);
        const isDupName = activeMotorists.some(a => a.name?.toLowerCase().trim() === newAgent.name.toLowerCase().trim() && a.id !== editingAgentId);
        const isDupPlate = newAgent.vehicle?.trim() && activeMotorists.some(a => a.vehicle?.toLowerCase().trim() === newAgent.vehicle.toLowerCase().trim() && a.id !== editingAgentId);

        if (isDupEmail) return notify(`ACCESS DENIED!\n\nThe email "${emailKey}" is already registered to another active personnel.`);
        if (isDupPhone) return notify(`ACCESS DENIED!\n\nThe phone number "${newAgent.phone}" is already registered.`);
        if (isDupName) return notify(`ACCESS DENIED!\n\nThe name "${newAgent.name}" is already registered.`);
        if (isDupPlate) return notify(`ACCESS DENIED!\n\nThe vehicle license plate "${newAgent.vehicle.toUpperCase()}" is already assigned.`);

        try {
            const batch = writeBatch(db);

            if (editingAgentId) {
                const oldAgent = agents.find(a => a.id === editingAgentId);
                const oldEmailKey = oldAgent?.email?.toLowerCase().trim();

                const agentRef = doc(db, collPath, editingAgentId);
                batch.update(agentRef, {
                    name: newAgent.name, phone: newAgent.phone, vehicle: newAgent.vehicle, role: newAgent.role, email: emailKey,
                    allowedPayments: newAgent.allowedPayments, allowedTiers: newAgent.allowedTiers,
                    userRole: newAgent.userRole || 'AGENT', location: newAgent.location || 'Headquarters', province: newAgent.province || 'Central Java',
                    allowRetur: newAgent.allowRetur || false,
                    allowCashRefund: newAgent.allowCashRefund || false,
                    joinDate: newAgent.joinDate || '',
                    /* null, never [] - an empty array reads as "named for no branches at all" and
                       would silently strip a Regional Admin's default the first time somebody edits
                       their phone number. See personApprovalRegions in config/permissions.js. */
                    approvalRegions: (newAgent.approvalRegions || []).length ? newAgent.approvalRegions.map(normalizeRegion) : null
                });

                if (oldEmailKey && oldEmailKey !== emailKey) batch.delete(doc(db, `artifacts/${appId}/employee_directory`, oldEmailKey));

                // No login mapping for a self-proxy — see isSelfProxy above.
                if (!isSelfProxy) batch.set(doc(db, `artifacts/${appId}/employee_directory`, emailKey), {
                    bossUid: userId, agentId: editingAgentId, role: newAgent.role, userRole: newAgent.userRole || 'AGENT', status: 'Active',
                    location: newAgent.location || 'Headquarters',
                }, { merge: true });

            } else {
                const newId = `AGT_${Date.now()}`;
                const agentData = {
                    id: newId, ...newAgent, email: emailKey, status: 'Active', activeCanvas: [], createdAt: serverTimestamp(),
                    approvalRegions: (newAgent.approvalRegions || []).length ? newAgent.approvalRegions.map(normalizeRegion) : null
                };
                batch.set(doc(db, collPath, newId), agentData);
                // No login mapping for a self-proxy — see isSelfProxy above.
                if (!isSelfProxy) batch.set(doc(db, `artifacts/${appId}/employee_directory`, emailKey), {
                    bossUid: userId, agentId: newId, role: newAgent.role, userRole: newAgent.userRole || 'AGENT', status: 'Active',
                    location: newAgent.location || 'Headquarters',
                });
            }

            await batch.commit();

            if (editingAgentId) {
                triggerCapy(`Profile updated for ${newAgent.name}!`);
                logAudit("FLEET_EDIT", `Updated profile for ${emailKey}`);
            } else {
                triggerCapy(`${newAgent.name} added!`);
                logAudit("FLEET_ADD", `Created new ${newAgent.role} profile for ${emailKey}`);
            }

            setNewAgent(defaultAgentState);
            setIsAddingAgent(false);
            setEditingAgentId(null);
        } catch (e) { notify("Firebase Blocked the Save: " + e.message); }
    };

    const handleEditClick = (e, agent) => {
        e.stopPropagation();
        setNewAgent({
            name: agent.name, phone: agent.phone || '', vehicle: agent.vehicle || '', role: agent.role || 'Motorist', email: agent.email || '',
            allowedPayments: agent.allowedPayments || ['Cash'], allowedTiers: agent.allowedTiers || ['Retail', 'Ecer'],
            userRole: agent.userRole || 'AGENT', location: agent.location || 'Headquarters', province: agent.province || 'Central Java',
            allowRetur: agent.allowRetur || false,
            approvalRegions: Array.isArray(agent.approvalRegions) ? agent.approvalRegions.map(normalizeRegion) : [],
            allowCashRefund: agent.allowCashRefund || false
        });
        setEditingAgentId(agent.id);
        setIsReadOnlyMode(false);
        setIsAddingAgent(true);
    };

    const handleViewClick = (e, agent) => {
        e.stopPropagation();
        setNewAgent({
            name: agent.name, phone: agent.phone || '', vehicle: agent.vehicle || '', role: agent.role || 'Motorist', email: agent.email || '',
            allowedPayments: agent.allowedPayments || ['Cash'], allowedTiers: agent.allowedTiers || ['Retail', 'Ecer'],
            userRole: agent.userRole || 'AGENT', location: agent.location || 'Headquarters', province: agent.province || 'Central Java',
            allowRetur: agent.allowRetur || false,
            approvalRegions: Array.isArray(agent.approvalRegions) ? agent.approvalRegions.map(normalizeRegion) : [],
            allowCashRefund: agent.allowCashRefund || false
        });
        setEditingAgentId(agent.id);
        setIsReadOnlyMode(true);
        setIsAddingAgent(true);
    };

    const handleDeleteAgent = async (e, agent) => {
        e.stopPropagation();
        if (!await confirmAction(`TERMINATION WARNING: Are you sure you want to remove ${agent.name}? This will instantly revoke their login access.`)) return;
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, collPath, agent.id));
            if (agent.email) batch.delete(doc(db, `artifacts/${appId}/employee_directory`, agent.email.toLowerCase().trim()));
            await batch.commit();
            triggerCapy(`${agent.name} terminated. Access revoked. 🛑`);
            logAudit("FLEET_DELETE", `Terminated agent: ${agent.email}`);
            if (selectedAgent?.id === agent.id) setSelectedAgent(null);
        } catch (e) { notify("Firebase Blocked the Deletion: " + e.message); }
    };

    const handleLoadCanvas = async (productId, qtyBks) => {
        /* THE CANVAS HALF OF THE SAME HOLE, AND IT WAS WORSE: Load and Reconcile & Clear move real
           stock between the warehouse and a van, and neither was gated by anything at all. The
           button is hidden below as well — this guard is here because a hidden button is a UI
           promise and a handler is the actual door.

           2026-09-24: the van-loading bay's MUAT VAN calls this once per product going out, with the
           product and the packs, and keeps a failed line in its muatan with the reason this returns.
           Only the inputs and the report changed; the transaction below is the one it always was. */
        if (!canEditFleet) return notify("VIEW ONLY: your tier cannot load a canvas. Ask an admin to change it in Settings › Permissions.");
        if (!productId || !(Number(qtyBks) > 0)) return { ok: false, reason: 'Jumlah tidak sah' };
        if (!selectedAgent) return { ok: false, reason: 'Tidak ada salesman dipilih' };

        // Use the master product record for name/pricing/conversion metadata — always correct,
        // regardless of which warehouse the actual stock count comes from.
        const masterProduct = inventory.find(p => p.id === productId);
        if (!masterProduct) return { ok: false, reason: 'Barang tidak ada di daftar produk' };

        const qtyToLoad = Number(qtyBks);
        const unitToLoad = 'Bks';
        const loadInBks = qtyToLoad;

        // 🚀 FIX: Route based on the SELECTED AGENT's own tier/region, not the viewer's.
        // Matches the same rule used by EOD verification and Clear Canvas.
        const agentIsFieldLevel = isFieldLevelTier(selectedAgent.userRole);
        const agentLocation = selectedAgent.location;
        const useBranchWarehouse = agentIsFieldLevel && agentLocation && agentLocation !== 'Headquarters' && agentLocation !== 'UNASSIGNED AREA' && agentLocation !== 'UNASSIGNED';
        const sourceLabel = useBranchWarehouse ? `${agentLocation} Branch` : 'Master';

        const sourceRef = useBranchWarehouse
            ? doc(db, `artifacts/${appId}/users/${userId}/branches/${agentLocation.replace(/\//g, '-')}/inventory`, masterProduct.id)
            : doc(db, `artifacts/${appId}/users/${userId}/products`, masterProduct.id);

        try {
            // 🚀 FIX: Upgraded from writeBatch to runTransaction so we READ the correct
            // source's real current stock first, instead of trusting the viewer's own
            // displayInventory numbers (which reflect the VIEWER's branch, not the agent's).
            await runTransaction(db, async (t) => {
                // 📖 PHASE 1: READS
                const sourceSnap = await t.get(sourceRef);
                const currentSourceStock = sourceSnap.exists() ? (sourceSnap.data().stock || 0) : 0;

                if (currentSourceStock < loadInBks) {
                    throw new Error(`INSUFFICIENT WAREHOUSE STOCK!\n\nYou are trying to load ${loadInBks} Bks, but the ${sourceLabel} Vault only has ${currentSourceStock} Bks available.`);
                }

                const agentRef = doc(db, collPath, selectedAgent.id);
                const agentSnap = await t.get(agentRef);
                const liveCanvas = agentSnap.exists() ? (agentSnap.data().activeCanvas || []) : (selectedAgent.activeCanvas || []);

                // ✍️ PHASE 2: WRITES
                if (useBranchWarehouse) {
                    t.set(sourceRef, { productId: masterProduct.id, name: masterProduct.name, stock: currentSourceStock - loadInBks }, { merge: true });
                } else {
                    t.set(sourceRef, { stock: currentSourceStock - loadInBks }, { merge: true });
                }

                let updatedCanvas = JSON.parse(JSON.stringify(liveCanvas));
                const existingItemIndex = updatedCanvas.findIndex(item => item.productId === masterProduct.id);

                if (existingItemIndex >= 0) {
                    /* 🚀 FIX: loading is always counted in packs, but the van row is counted in
                       its OWN unit. Adding the two numbers raw meant loading 10 packs onto a
                       Slop-counted row added 10 SLOP: the warehouse lost 10 and the van gained
                       100. Clear Canvas, sixty lines below, already converts — which is how the
                       two ends stopped agreeing. */
                    const rowSize = convertToBks(1, updatedCanvas[existingItemIndex].unit, masterProduct);
                    updatedCanvas[existingItemIndex].qty += loadInBks / rowSize;
                } else {
                    updatedCanvas.push({ 
                        productId: masterProduct.id, 
                        name: masterProduct.name, 
                        qty: qtyToLoad, 
                        unit: unitToLoad,
                        priceTier: masterProduct.priceTier || 'Retail',
                        calculatedPrice: masterProduct.priceRetail || 0
                    });
                }

                t.update(agentRef, { activeCanvas: updatedCanvas });
            });

            /* the bay reports the whole press in ONE line, so the per-product mascot line is gone;
               the audit log keeps one entry per movement */
            logAudit("CANVAS_LOAD", `Loaded ${qtyToLoad} ${masterProduct.name} to ${selectedAgent.name} (from ${sourceLabel})`);
            return { ok: true };
        } catch (e) {
            console.error(e);
            return { ok: false, reason: e.message || "Failed to load vehicle canvas." };
        }
    };

    const handleClearCanvas = async () => {
        /* Was on the backlog on its own as *"a button that lies"* — the database rules already
           refused the save, so a tier that could press it got a failure and no explanation.
           It now refuses on the screen, in words, before anything is attempted. */
        if (!canEditFleet) return notify("VIEW ONLY: your tier cannot reconcile a canvas. Ask an admin to change it in Settings › Permissions.");
        if (!selectedAgent) return;

        // 🚀 FIX: Route based on the SELECTED AGENT's own tier/region, not the viewer's.
        // Matches the same rule EOD verification uses, so the two can never disagree.
        const agentIsFieldLevel = isFieldLevelTier(selectedAgent.userRole);
        const agentLocation = selectedAgent.location;
        const useBranchWarehouse = agentIsFieldLevel && agentLocation && agentLocation !== 'Headquarters' && agentLocation !== 'UNASSIGNED AREA' && agentLocation !== 'UNASSIGNED';
        const destinationLabel = useBranchWarehouse ? `${agentLocation} Branch` : 'Master Vault';

        if (!await confirmAction(`Are you sure you want to empty ${selectedAgent.name}'s vehicle inventory? This will securely return all their unsold stock back into the ${destinationLabel}.`)) return;

        try {
            const agentRef = doc(db, collPath, selectedAgent.id);

            // 🚀 FIX: Upgraded from writeBatch to runTransaction so we can safely READ the
            // correct destination's current stock first — writeBatch can't read, so it was
            // trusting the viewer's own (possibly wrong-region) cached branch numbers.
            await runTransaction(db, async (t) => {
                // 📖 PHASE 1: READS
                /* 🚀 FIX: the vehicle's contents are read HERE, live, instead of from
                   selectedAgent.activeCanvas — which is whatever the admin's screen loaded,
                   possibly hours ago. The van showed 50 packs at 14:00, the agent sold 20 at
                   14:05, and clearing at 14:10 credited the warehouse with all 50 and then
                   emptied the van: 20 packs existed in two places at once, sold to a store and
                   back on the shelf. handleLoadCanvas fifty lines above already re-read the
                   agent inside its transaction; this is the same read.

                   It sits at the top of the READ phase on purpose. Firestore forbids a read
                   after a write in a transaction, and that failure only appears at runtime,
                   when somebody actually clears a vehicle. */
                const agentSnap = await t.get(agentRef);
                const liveCanvas = agentSnap.exists() ? (agentSnap.data().activeCanvas || []) : [];
                const itemsToReturn = liveCanvas
                    .map(item => ({ item, product: inventory.find(p => p.id === item.productId) }))
                    .filter(x => x.product);

                const destRefs = itemsToReturn.map(({ item, product }) => ({
                    item, product,
                    ref: useBranchWarehouse
                        ? doc(db, `artifacts/${appId}/users/${userId}/branches/${agentLocation.replace(/\//g, '-')}/inventory`, product.id)
                        : doc(db, `artifacts/${appId}/users/${userId}/products`, product.id)
                }));
                const destDocs = await Promise.all(destRefs.map(r => t.get(r.ref)));

                // ✍️ PHASE 2: WRITES
                destRefs.forEach((r, index) => {
                    const returnInBks = convertToBks(r.item.qty, r.item.unit, r.product);
                    const dSnap = destDocs[index];
                    const currentStock = dSnap.exists() ? (dSnap.data().stock || 0) : 0;

                    if (useBranchWarehouse) {
                        t.set(r.ref, { productId: r.product.id, name: r.product.name, stock: currentStock + returnInBks }, { merge: true });
                    } else {
                        t.set(r.ref, { stock: currentStock + returnInBks }, { merge: true });
                    }
                });

                t.update(agentRef, { activeCanvas: [] });
            });

            triggerCapy(`Vehicle cleared. All unsold stock returned to the ${destinationLabel}! 🧹`);
            logAudit("CANVAS_CLEAR", `Cleared and reconciled canvas for ${selectedAgent.name} → ${destinationLabel}`);
        } catch(e) { notify("Failed to clear canvas: " + e.message); }
    };

    /* A RETURN from the van-loading bay: its own per-product transaction, never the Reconcile & Clear
       one above (that empties the whole van). The van's row is read LIVE inside the transaction - a
       sale may have landed since the drag - converted in the row's own unit, taken down by the packs
       coming back, and the same warehouse Load and Clear use goes up by those packs. */
    const handleReturnToWarehouse = async (productId, qtyBks) => {
        if (!canEditFleet) return notify("VIEW ONLY: your tier cannot return a canvas. Ask an admin to change it in Settings › Permissions.");
        const product = inventory.find(p => p.id === productId);
        if (!selectedAgent || !product || !(Number(qtyBks) > 0)) return { ok: false, reason: 'Jumlah tidak sah' };

        const agentIsFieldLevel = isFieldLevelTier(selectedAgent.userRole);
        const agentLocation = selectedAgent.location;
        const useBranchWarehouse = agentIsFieldLevel && agentLocation && agentLocation !== 'Headquarters' && agentLocation !== 'UNASSIGNED AREA' && agentLocation !== 'UNASSIGNED';
        const destinationLabel = useBranchWarehouse ? `${agentLocation} Branch` : 'Master Vault';
        const agentRef = doc(db, collPath, selectedAgent.id);
        const destRef = useBranchWarehouse
            ? doc(db, `artifacts/${appId}/users/${userId}/branches/${agentLocation.replace(/\//g, '-')}/inventory`, product.id)
            : doc(db, `artifacts/${appId}/users/${userId}/products`, product.id);

        try {
            await runTransaction(db, async (t) => {
                // 📖 PHASE 1: READS — both before any write, which a transaction requires
                const agentSnap = await t.get(agentRef);
                const destSnap = await t.get(destRef);
                const liveCanvas = agentSnap.exists() ? (agentSnap.data().activeCanvas || []) : [];
                const idx = liveCanvas.findIndex(item => item.productId === product.id);
                const rowBks = idx >= 0 ? convertToBks(liveCanvas[idx].qty, liveCanvas[idx].unit, product) : 0;
                if (rowBks < qtyBks) throw new Error(`Van tinggal ${rowBks} Bks ${product.name} — ada penjualan sejak ditarik`);

                // ✍️ PHASE 2: WRITES
                const updated = JSON.parse(JSON.stringify(liveCanvas));
                updated[idx].qty -= qtyBks / convertToBks(1, updated[idx].unit, product);
                if (updated[idx].qty <= 1e-9) updated.splice(idx, 1);
                const currentStock = destSnap.exists() ? (destSnap.data().stock || 0) : 0;
                if (useBranchWarehouse) {
                    t.set(destRef, { productId: product.id, name: product.name, stock: currentStock + qtyBks }, { merge: true });
                } else {
                    t.set(destRef, { stock: currentStock + qtyBks }, { merge: true });
                }
                t.update(agentRef, { activeCanvas: updated });
            });
            logAudit("CANVAS_RETURN", `Returned ${qtyBks} Bks ${product.name} from ${selectedAgent.name} → ${destinationLabel}`);
            return { ok: true };
        } catch (e) {
            console.error(e);
            return { ok: false, reason: e.message || 'Gagal mengembalikan ke gudang' };
        }
    };

    /* The van's LAYOUT - which square holds which product, holes included - is its own field, written
       on the bay's drop. Never inside activeCanvas, which both transactions and every sale write. */
    const handleSaveLayout = async (cells) => {
        if (!canEditFleet || !selectedAgent) return false;
        try {
            await updateDoc(doc(db, collPath, selectedAgent.id), { vanLayout: cells });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    /* ── THE ROSTER STAGE (2026-09-24) ─────────────────────────────────────────────────────────────────────
       His State of Decay 2 community screen: the people stand side by side on a stage, a name over each, the one
       under the pointer lifts and its floor lights, the picked one wears the gold ring, the leader stands on a
       crown, and a gold bar along the bottom names the place and carries the actions. "3D character, if its too
       heavy then just 3D cards" - a 3D engine and character models on a cheap Android is too heavy, so each
       person is a 3D profile card. The search, grouping, rank order, guards and doors are the ones the list had.
       Each card says what the van holds (packs and items, with a light) - his 2026-09-22 "better UI" was about
       information. */
    const loadOf = (m) => (m.activeCanvas || []).reduce((sum, r) => sum + convertToBks(r.qty, r.unit, inventory.find(p => p.id === r.productId)), 0);
    /* switching the salesman while the bay's muatan has lines asks first, through the dialog gate */
    const pickAgent = async (m) => {
        if (bayLines > 0 && selectedAgent?.id !== m.id && !await confirmAction(`Muatan ${selectedAgent?.name} belum dimuat. Pindah ke ${m.name} dan buang muatan itu?`)) return;
        setSelectedAgent(m);
        setShowHistory(false);
    };
    const stageCard = (m) => {
        const bks = Math.round(loadOf(m));
        const items = (m.activeCanvas || []).filter(r => Number(r.qty) > 0).length;
        const on = selectedAgent?.id === m.id;
        const leader = m.userRole === 'ADMIN' || m.userRole === 'AREA_ADMIN';
        const Icon = m.userRole === 'ADMIN' ? ShieldCheck : m.userRole === 'AREA_ADMIN' ? Globe : m.role === 'Canvas' ? Truck : Activity;
        const initials = String(m.name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
        return (
            <div key={m.id} role="option" aria-selected={on} tabIndex={0} onClick={() => pickAgent(m)}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); pickAgent(m); } }}
                className={`kpm-actor${on ? ' on' : ''}${leader ? ' leader' : ''}`}>
                <span className="kpm-actor-name">{m.name}</span>
                <span className="kpm-actor-card">
                    <span className="band" aria-hidden="true" />
                    <span className="avatar">{initials}<Icon size={14} className="role" /></span>
                    <span className="who">{m.name}</span>
                    <span className="tier">
                        {/* HIS WORD FOR THE TIER, not the code's. `tierWord` reads the labels he set in Settings, so a
                            rename shows up here without anyone editing this line. */}
                        {m.userRole === 'ADMIN' ? 'Master Admin (Global)' : m.userRole === 'AREA_ADMIN' ? `${tierWord('AREA_ADMIN') || 'HQ Sales Manager'} (${m.location})` : `${m.role || ''}${m.vehicle ? ` • ${m.vehicle}` : ''}`}
                    </span>
                    <span className="load"><i className={bks > 0 ? 'on' : ''} aria-hidden="true" />{bks > 0 ? `${bks.toLocaleString('id-ID')} Bks · ${items} ${items === 1 ? 'item' : 'items'}` : 'Van empty'}</span>
                    <span className={`kpm-read ${bks > 0 ? 'on' : ''}`}>{bks > 0 ? 'Loaded' : 'Empty'}</span>
                </span>
                <span className="kpm-actor-floor" aria-hidden="true">{leader && <Crown size={14} />}</span>
            </div>
        );
    };

    const handleWhatsAppShare = () => {
        if (!viewingReceipt) return;
        const isReturReceipt = viewingReceipt.type === 'RETUR' || viewingReceipt.paymentType === 'Retur/BS';
        const displayTotal = viewingReceipt.total || viewingReceipt.amountPaid || 0;

        let text = `*${appSettings?.companyName || "KPM INVENTORY"}*\n*OFFICIAL RECEIPT (REPRINT)*\n------------------------\n`;
        text += `Date: ${viewingReceipt.timestamp ? new Date(viewingReceipt.timestamp.seconds * 1000).toLocaleString('id-ID') : viewingReceipt.date}\n`;
        text += `Customer: ${viewingReceipt.customerName}\nPayment: ${viewingReceipt.paymentType || 'Cash'}\n------------------------\n`;
        if (viewingReceipt.items) {
            viewingReceipt.items.forEach(item => {
                text += `${item.qty} ${item.unit} ${item.name}`;
                if (item.condition === 'DAMAGED') text += ` [DAMAGED]`;
                if (item.fulfillment === 'IOU') text += ` [UTANG BARANG]`;
                if (item.isIouFulfillment) text += ` [IOU FULFILLED]`;
                text += `\n   Rp ${new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}\n`;
            });
        }
        text += `------------------------\n*TOTAL: ${isReturReceipt && displayTotal > 0 ? '-' : ''}Rp ${new Intl.NumberFormat('id-ID').format(displayTotal)}*\n\nThank you!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const todayStr = getLocalDayKey();
    
    // 🚀 FORENSIC UPDATE: Ensure we grab BOTH sales AND return logs for the agent today
    const agentSales = transactions.filter(t => t.agentId === selectedAgent?.id && t.date === todayStr && ['SALE', 'RETUR'].includes(t.type || 'SALE'));
    
    const combinedItems = useMemo(() => {
        if (!selectedAgent) return [];
        const map = {};
        
        (selectedAgent.activeCanvas || []).forEach(item => {
            const p = inventory.find(x => x.id === item.productId);
            map[item.productId] = {
                productId: item.productId, name: item.name, currentBks: convertToBks(item.qty, item.unit, p),
                soldBks: 0, unit: item.unit, currentRaw: item.qty 
            };
        });
        
        agentSales.forEach(t => {
            (t.items || []).forEach(item => {
                // 🚀 MATH ENGINE FIX: Don't deduct from car if it was a Buyback or Pending IOU
                if (t.type === 'RETUR' && t.paymentType !== 'Tukar Ganti') return;
                if (t.paymentType === 'Tukar Ganti' && item.fulfillment === 'IOU') return;

                const p = inventory.find(x => x.id === item.productId);
                const bks = convertToBks(item.qty, item.unit, p);
                if (!map[item.productId]) {
                    map[item.productId] = { productId: item.productId, name: item.name, currentBks: 0, soldBks: 0, unit: 'Bks', currentRaw: 0 };
                }
                map[item.productId].soldBks += bks;
            });
        });
        
        return Object.values(map).map(i => ({ ...i, initialBks: i.currentBks + i.soldBks }));
    }, [selectedAgent, inventory, agentSales]);

    if (isFetchingFleet) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-[var(--panel)] rounded-2xl border border-[var(--line-2)]">
                <div className="text-center animate-pulse">
                    <Activity size={48} className="text-blue-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white uppercase tracking-widest">Establishing Regional Uplink</h2>
                    <p className="text-slate-400 mt-2 text-xs">Fetching Branch Roster Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="print-reset h-full w-full bg-[var(--panel)] rounded-2xl border border-[var(--line-2)] overflow-y-auto custom-scrollbar flex flex-col text-[var(--ink)] font-sans relative">
            
            {/* 🚀 UPGRADED FORENSIC RECEIPT MODAL 🚀 */}
            {viewingReceipt && (() => {
                const isReturReceipt = viewingReceipt.type === 'RETUR' || viewingReceipt.paymentType === 'Retur/BS';
                const displayTotal = viewingReceipt.total || viewingReceipt.amountPaid || 0;

                return (
                    <div className="print-modal-wrapper fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-4">
                        <div className="print-receipt format-thermal !bg-white !text-black w-full max-w-sm shadow-2xl relative flex flex-col font-mono text-sm border-t-8 !border-slate-800 animate-fade-in rounded-b-lg max-h-[90vh] overflow-y-auto custom-scrollbar transition-all">
                            <div className="p-6 pb-2 shrink-0">
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-black uppercase tracking-widest !text-black">{appSettings?.companyName || "KPM INVENTORY"}</h2>
                                    <p className="text-[10px] font-bold mt-1 !text-slate-400">OFFICIAL SALES RECEIPT</p>
                                    <p className="text-[11px] mt-1 uppercase tracking-widest !text-slate-400">REPRINT COPY</p>
                                </div>
                                <div className="!bg-slate-100 rounded-lg p-4 mb-4 text-xs border !border-slate-300 space-y-2 shadow-inner">
                                    <div className="flex justify-between items-center"><span className="!text-slate-400 font-bold">DATE:</span><span className="!text-black font-black">{viewingReceipt.timestamp ? new Date(viewingReceipt.timestamp.seconds*1000).toLocaleString('id-ID') : viewingReceipt.date}</span></div>
                                    <div className="flex justify-between items-center"><span className="!text-slate-400 font-bold">CUST:</span><span className="!text-black font-black uppercase">{viewingReceipt.customerName}</span></div>
                                    <div className="flex justify-between items-center"><span className="!text-slate-400 font-bold">AGENT:</span><span className="!text-black font-black uppercase">{viewingReceipt.agentName || 'Unknown'}</span></div>
                                    <div className="flex justify-between items-center"><span className="!text-slate-400 font-bold">TYPE:</span><span className={`font-black uppercase ${isReturReceipt ? '!text-red-600' : viewingReceipt.paymentType === 'Tukar Ganti' ? '!text-blue-600' : '!text-black'}`}>{viewingReceipt.paymentType || 'Cash'}</span></div>
                                </div>
                                <div className="border-t-2 border-b-2 border-dashed !border-slate-400 py-3 mb-4 min-h-[150px]">
                                    {viewingReceipt.items && viewingReceipt.items.length > 0 ? viewingReceipt.items.map((item, i) => (
                                        <div key={i} className="mb-2">
                                            <div className="font-bold uppercase text-xs !text-black flex flex-wrap gap-1 items-center">
                                                {item.name}
                                                {item.condition === 'DAMAGED' && <span className="text-[11px] bg-red-100 !text-red-800 border !border-red-300 px-1 rounded shadow-sm">DAMAGED</span>}
                                                {item.fulfillment === 'IOU' && <span className="text-[11px] bg-blue-100 !text-blue-800 border !border-blue-300 px-1 rounded shadow-sm">UTANG BARANG</span>}
                                                {item.isIouFulfillment && <span className="text-[11px] bg-emerald-100 !text-emerald-800 border !border-emerald-300 px-1 rounded shadow-sm">UTANG BARANG LUNAS</span>}
                                            </div>
                                            {item.condition === 'DAMAGED' && item.returnReason && (
                                                <div className="text-[11px] italic !text-slate-400 mb-0.5 mt-0.5">Reason: {item.returnReason === 'Other' ? item.otherReasonDetail : item.returnReason}</div>
                                            )}
                                            <div className="flex justify-between text-xs mt-0.5">
                                                <span className="!text-slate-400">{item.qty} {item.unit} x {new Intl.NumberFormat('id-ID').format(item.calculatedPrice || 0)}</span>
                                                <span className={`font-black ${isReturReceipt && item.calculatedPrice > 0 ? '!text-red-600' : '!text-black'}`}>
                                                    {isReturReceipt && item.calculatedPrice > 0 ? '-' : ''}{new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}
                                                </span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex items-center justify-center h-full !text-slate-400 text-[10px] uppercase tracking-widest text-center">{viewingReceipt.type === 'CONSIGNMENT_PAYMENT' ? 'Consignment Payment' : 'No Itemized Data'}</div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center text-lg font-black mb-6 border-t !border-slate-300 pt-3 !text-black">
                                    <span>TOTAL</span>
                                    <span className={isReturReceipt && displayTotal > 0 ? '!text-red-600' : '!text-black'}>
                                        {isReturReceipt && displayTotal > 0 ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(displayTotal)}
                                    </span>
                                </div>
                                <div className="text-center text-[10px] mb-4 font-bold !text-slate-400"><p>*** THANK YOU FOR YOUR BUSINESS ***</p></div>
                            </div>
                            <div className="no-print !bg-slate-200 p-4 flex gap-3 border-t !border-slate-300 mt-auto shrink-0">
                                <button onClick={() => window.print()} className="flex-1 !bg-slate-800 !text-white py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-slate-950 transition-colors tracking-widest text-[10px] shadow-md active:scale-95"><Printer size={14}/> Print</button>
                                <button onClick={handleWhatsAppShare} className="flex-1 !bg-[#25D366] !text-white py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-[#128C7E] transition-colors tracking-widest text-[10px] shadow-md active:scale-95"><MessageSquare size={14}/> Share</button>
                            </div>
                            <button onClick={() => setViewingReceipt(null)} className="no-print w-full shrink-0 !bg-red-600 hover:!bg-red-700 !text-white py-4 font-black uppercase tracking-[0.2em] shadow-[0_-5px_20px_rgba(0,0,0,0.2)] active:scale-95 transition-transform rounded-b-lg"><div className="flex items-center justify-center gap-2"><X size={20}/> CLOSE RECEIPT</div></button>
                        </div>
                    </div>
                );
            })()}

           {/* SURAT JALAN MODAL */}
            {viewingSuratJalan && selectedAgent && (
                <div className="print-modal-wrapper fixed inset-0 z-[500] bg-black/90 print:bg-transparent flex items-center justify-center p-4 print:!p-0 print:!m-0 print:!block">
                    <div className="print-receipt format-a4 !bg-white !text-black w-full max-w-4xl shadow-2xl relative flex flex-col font-sans text-sm border-t-8 !border-blue-800 animate-fade-in rounded-b-lg max-h-[90vh] overflow-y-auto custom-scrollbar transition-all print:!max-h-none print:!border-none print:!shadow-none print:!m-0 print:!p-0 print:!block print:!rounded-none">
                        
                        <div className="w-full overflow-x-auto custom-scrollbar border-b !border-slate-300 print:!overflow-visible print:!border-none print:!block print:!w-full print:!m-0 print:!p-0">
                            <div className="p-8 md:p-12 shrink-0 font-sans relative min-w-[800px] print:!min-w-0 print:!w-full print:!max-w-none print:!p-0 print:!m-0 mx-auto" style={{ backgroundColor: '#ffffff', color: '#000000', boxSizing: 'border-box' }}>
                                <div className="border-b-4 !border-blue-800 pb-4 mb-6 flex justify-between items-end gap-8">
                                    <div className="flex-1 flex items-center gap-4">
                                        {appSettings?.mascotImage && (
                                            <img src={appSettings.mascotImage} className="w-16 h-16 object-contain" alt="Company Logo" />
                                        )}
                                        <div>
                                            <h1 className="text-2xl md:text-3xl font-black !text-blue-900 tracking-widest uppercase break-words">{appSettings?.companyName || "PT KARYAMEGA PUTERA MANDIRI"}</h1>
                                            <p className="text-xs md:text-sm font-bold !text-slate-700 mt-1 whitespace-pre-line">{appSettings?.companyAddress || 'Jl. Raya Magelang - Purworejo Km. 11, Palbapang, Mungkid, Magelang'}</p>
                                            {appSettings?.companyPhone && <p className="text-xs font-bold !text-slate-700 mt-0.5">Telp/WA: {appSettings.companyPhone}</p>}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <h2 className="text-xl md:text-2xl font-bold !text-blue-800 uppercase tracking-widest">SURAT JALAN</h2>
                                        <p className="text-[10px] uppercase font-bold !text-slate-400 tracking-widest mt-1">OFFICIAL DELIVERY ORDER</p>
                                        <p className="text-sm font-mono font-black mt-2 !text-black">SJ-{getLocalDayKey().replace(/-/g,'')}-{selectedAgent.id.slice(-4)}</p>
                                    </div>
                                </div>

                                <div className="px-0 mb-6 grid grid-cols-2 gap-4">
                                    <div className="border-2 !border-slate-800 p-3 rounded-lg shadow-sm">
                                        <p className="text-[10px] font-bold !text-slate-400 uppercase mb-1">Diberikan Kepada (Sales/Driver)</p>
                                        <p className="font-black text-lg uppercase !text-black">{selectedAgent.name}</p>
                                        <p className="text-xs mt-1 font-bold !text-slate-700">Role: {selectedAgent.role === 'Canvas' ? 'Sales Canvas' : 'Sales Motorist'}</p>
                                    </div>
                                    <div className="border-2 !border-slate-800 p-3 rounded-lg shadow-sm text-right">
                                        <p className="text-[10px] font-bold !text-slate-400 uppercase mb-1">Informasi Kendaraan / Waktu</p>
                                        <p className="font-black text-lg uppercase !text-black">{selectedAgent.vehicle || 'TIDAK ADA DATA KENDARAAN'}</p>
                                        <p className="text-xs mt-1 font-bold !text-slate-700">Deploy: {new Date().toLocaleTimeString('id-ID')}</p>
                                    </div>
                                </div>

                                <table className="w-full text-sm border-collapse border-2 !border-slate-800 mb-8 shadow-sm">
                                    <thead className="!bg-blue-50 !text-blue-900">
                                        <tr>
                                            <th className="border-2 !border-slate-800 p-3 text-center w-12 font-black">NO</th>
                                            <th className="border-2 !border-slate-800 p-3 text-left font-black">NAMA BARANG</th>
                                            <th className="border-2 !border-slate-800 p-3 text-right w-32 font-black">QTY</th>
                                            <th className="border-2 !border-slate-800 p-3 w-32 text-center font-black">UNIT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedAgent.activeCanvas || []).length === 0 ? (
                                            <tr><td colSpan="4" className="text-center p-8 text-gray-400 italic border-2 !border-slate-800">Tidak ada barang yang dimuat.</td></tr>
                                        ) : (
                                            (selectedAgent.activeCanvas || []).map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="border-2 !border-slate-800 p-2 text-center font-bold !text-slate-400">{idx + 1}</td>
                                                    <td className="border-2 !border-slate-800 p-2 font-bold uppercase !text-black">{item.name}</td>
                                                    <td className="border-2 !border-slate-800 p-2 text-right font-black text-lg !text-blue-700">{item.qty}</td>
                                                    <td className="border-2 !border-slate-800 p-2 text-center font-bold !text-black">{item.unit}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>

                                <div className="mb-8">
                                    <div className="!bg-blue-50 p-4 border-2 !border-blue-800 rounded-xl text-sm text-justify leading-relaxed italic !text-blue-900 shadow-md">
                                        <strong className="uppercase tracking-widest block mb-1">Pernyataan:</strong> Dengan ditandatanganinya Surat Jalan ini, pihak penerima (Sales/Driver) menyatakan bahwa barang-barang yang tercantum di atas telah diterima dalam keadaan utuh, baik, dan sesuai dengan jumlah yang tertera. Mulai saat dokumen ini ditandatangani, seluruh barang menjadi tanggung jawab penuh pihak penerima atas kehilangan, kerusakan, atau penyalahgunaan selama masa operasional.
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8 text-center mt-12 pb-4 !text-black print:mt-24">
                                    <div className="flex flex-col items-center">
                                        <p className="font-bold text-sm mb-24 uppercase tracking-widest">Admin Gudang</p>
                                        <div className="border-b-2 !border-slate-800 w-48 md:w-56"></div>
                                        <p className="text-sm mt-2 uppercase font-bold">
                                            {(() => {
                                                const branchAdmin = activeMotorists.find(m => 
                                                    m.userRole === 'AREA_ADMIN' && 
                                                    String(m.location || '').trim().toUpperCase() === String(selectedAgent.location || '').trim().toUpperCase()
                                                );
                                                return branchAdmin ? branchAdmin.name : (user.displayName || 'Admin');
                                            })()}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <p className="font-bold text-sm mb-24 uppercase tracking-widest">Sales/Motorist</p>
                                        <div className="border-b-2 !border-slate-800 w-48 md:w-56"></div>
                                        <p className="text-sm mt-2 uppercase font-bold">{selectedAgent.name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="no-print !bg-slate-200 p-4 flex gap-3 border-t !border-slate-300 mt-auto shrink-0 rounded-b-lg">
                            <button onClick={() => window.print()} className="flex-1 !bg-slate-800 !text-white py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-slate-950 transition-colors tracking-widest text-[10px] shadow-md active:scale-95"><Printer size={14}/> Print Surat Jalan</button>
                            <button onClick={() => setViewingSuratJalan(false)} className="px-8 !bg-red-600 hover:!bg-red-700 !text-white py-3 font-black uppercase tracking-[0.2em] text-[10px] rounded-lg shadow-md active:scale-95 flex items-center gap-2"><X size={14}/> Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* LEFT PANEL: FLEET ROSTER — since 2026-09-24 the full-width stage on top */}
            <div className="hide-on-print w-full bg-[var(--panel)] border-b border-[var(--line-2)] flex flex-col shrink-0">
                <div className="p-4 border-b border-[var(--line-2)] flex justify-between items-center gap-3 bg-[var(--raised)]">
                    <div className="min-w-0">
                        <h2 className="text-base font-black text-[var(--ink)] flex items-center gap-2 uppercase tracking-wider truncate">
                            <Truck size={18} className="text-[var(--accent-ink)] shrink-0"/>
                            {isAreaAdmin ? `${branchPathLocation} Roster` : 'Fleet Roster'}
                        </h2>
                        <p className="text-[10px] font-mono text-[var(--ink-muted)] uppercase tracking-widest mt-1">
                            Active Personnel: {agents.length} · {agents.filter(m => loadOf(m) > 0).length} vans loaded
                        </p>
                    </div>
                    {canEditFleet && (
                        <button onClick={() => { setIsAddingAgent(!isAddingAgent); setEditingAgentId(null); setNewAgent(defaultAgentState); setIsReadOnlyMode(false); }} className="kpm-btn key shrink-0" aria-label={isAddingAgent && !isReadOnlyMode ? 'Close the form' : 'Add personnel'}>
                            {isAddingAgent && !isReadOnlyMode ? <X size={18}/> : <UserPlus size={18}/>}
                        </button>
                    )}
                </div>

                <div className="p-4 space-y-3">
                    {isAddingAgent && (
                        <div className={`bg-[var(--raised)] p-4 rounded-xl border-2 border-dashed ${isReadOnlyMode ? 'border-[var(--accent-edge)]' : 'border-[var(--accent-edge)]'} mb-4 animate-slide-down`}>
                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isReadOnlyMode ? 'text-[var(--accent-ink)]' : 'text-[var(--accent-ink)]'}`}>
                                {isReadOnlyMode ? 'Profile Details' : editingAgentId ? 'Edit Profile' : 'Deploy New Personnel'}
                            </h3>
                            
                            <select disabled={isReadOnlyMode} value={newAgent.role} onChange={e => setNewAgent({...newAgent, role: e.target.value})} className={`w-full border border-[var(--line-2)] rounded p-2.5 text-xs text-[var(--ink)] mb-2 outline-none font-bold ${isReadOnlyMode ? 'bg-[var(--raised)] opacity-60 cursor-not-allowed' : 'bg-[var(--inset)] focus:border-[var(--accent-edge)]'}`}>
                                <option value="Motorist">Sales Motorist (Motorbike)</option>
                                <option value="Canvas">Sales Canvas (Car / Van)</option>
                            </select>

                            <input disabled={isReadOnlyMode} type="text" placeholder="Personnel Name" value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} className={`w-full border border-[var(--line-2)] rounded p-2.5 text-xs text-[var(--ink)] mb-2 outline-none ${isReadOnlyMode ? 'bg-[var(--raised)] opacity-60 cursor-not-allowed' : 'bg-[var(--inset)] focus:border-[var(--accent-edge)]'}`}/>
                            
                            <div className="flex gap-2 mb-2">
                                <input disabled={isReadOnlyMode} type="email" placeholder="Google Account Email (Login)" value={newAgent.email} onChange={e => setNewAgent({...newAgent, email: e.target.value})} className={`flex-1 border border-[var(--accent-edge)] rounded p-2.5 text-xs text-[var(--ink)] outline-none font-mono ${isReadOnlyMode ? 'bg-[var(--raised)] opacity-60 cursor-not-allowed' : 'bg-[var(--inset)] focus:border-[var(--accent-edge)]'}`}/>
                                {isAdmin && !isReadOnlyMode && (
                                    <select 
                                        className="bg-[var(--inset)] border border-[var(--line-2)] rounded p-2.5 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer outline-none text-[var(--ink)] focus:border-[var(--accent-edge)]"
                                        value={newAgent.userRole || 'AGENT'} 
                                        onChange={(e) => setNewAgent({...newAgent, userRole: e.target.value})}
                                        style={{ colorScheme: 'dark' }}
                                        title="Assign Corporate Matrix Tier"
                                    >
                                        {DYNAMIC_TIERS.filter(t => !['ADMIN', 'COMPANY_OWNER', 'DEVELOPER'].includes(t.id)).map(t => (
                                            <option key={t.id} value={t.id} className="bg-[var(--inset)] text-[var(--ink)]">
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            
                            {/* Silence would make this look like a normal save that happens to be
                                allowed. It is a different save: no login mapping is written. */}
                            {!!user?.email && isGlobalAdmin && ['', user.email.toLowerCase().trim()].includes(newAgent.email.trim().toLowerCase()) && (
                                <p className="text-[10px] text-[var(--accent-ink)] font-bold mb-2 leading-relaxed">
                                    🧪 TEST PERSONNEL — left empty, this saves as <span className="font-mono">{user.email}</span>,
                                    which is your own account in another form. No separate login is created, nobody signs in
                                    as them, and your own sign-in stays Tier 1. Phone is not required for these. Give them a
                                    real address instead and they become normal personnel, with email and phone required.
                                </p>
                            )}

                            <div className="flex gap-2 mb-2">
                                {isNewProv || existingProvinces.length === 0 ? (
                                    <div className="flex-1 flex gap-2">
                                        <input disabled={isReadOnlyMode} type="text" placeholder="Type New Province..." value={newAgent.province || ''} onChange={e => setNewAgent({...newAgent, province: e.target.value})} className={`flex-1 border border-[var(--accent-edge)] rounded p-2.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--accent-edge)] ${isReadOnlyMode ? 'bg-[var(--raised)] opacity-60 cursor-not-allowed' : 'bg-[var(--inset)]'}`}/>
                                        {existingProvinces.length > 0 && !isReadOnlyMode && <button onClick={() => setIsNewProv(false)} className="bg-[var(--raised)] p-2.5 rounded text-[var(--ink-muted)] hover:text-[var(--ink)]"><X size={14}/></button>}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex gap-2">
                                        <select disabled={isReadOnlyMode} value={newAgent.province || existingProvinces[0]} onChange={e => setNewAgent({...newAgent, province: e.target.value})} className={`flex-1 border border-[var(--accent-edge)] rounded p-2.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--accent-edge)] uppercase ${isReadOnlyMode ? 'bg-[var(--raised)] opacity-60 cursor-not-allowed' : 'bg-[var(--inset)]'}`}>
                                            {existingProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                        {!isReadOnlyMode && <button onClick={() => { setIsNewProv(true); setNewAgent({...newAgent, province: ''}); }} className="bg-[var(--inset)] border border-[var(--accent-edge)] text-[var(--accent-ink)] p-2.5 rounded hover:bg-[var(--gold)] hover:text-[var(--gold-ink)] transition-colors" title="Add New Province"><Plus size={14}/></button>}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 mb-2">
                                {isNewLoc || existingLocations.length === 0 ? (
                                    <div className="flex-1 flex gap-2">
                                        <input disabled={isReadOnlyMode} type="text" placeholder="Type New Area..." value={newAgent.location || ''} onChange={e => setNewAgent({...newAgent, location: e.target.value})} className={`flex-1 border border-[var(--accent-edge)] rounded p-2.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--accent-edge)] ${isReadOnlyMode ? 'bg-[var(--raised)] opacity-60 cursor-not-allowed' : 'bg-[var(--inset)]'}`}/>
                                        {existingLocations.length > 0 && !isReadOnlyMode && <button onClick={() => setIsNewLoc(false)} className="bg-[var(--raised)] p-2.5 rounded text-[var(--ink-muted)] hover:text-[var(--ink)]"><X size={14}/></button>}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex gap-2">
                                        <select disabled={isReadOnlyMode} value={newAgent.location || existingLocations[0]} onChange={e => setNewAgent({...newAgent, location: e.target.value})} className={`flex-1 border border-[var(--accent-edge)] rounded p-2.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--accent-edge)] uppercase ${isReadOnlyMode ? 'bg-[var(--raised)] opacity-60 cursor-not-allowed' : 'bg-[var(--inset)]'}`}>
                                            {existingLocations.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                        {!isReadOnlyMode && <button onClick={() => { setIsNewLoc(true); setNewAgent({...newAgent, location: ''}); }} className="bg-[var(--inset)] border border-[var(--accent-edge)] text-[var(--accent-ink)] p-2.5 rounded hover:bg-[var(--gold)] hover:text-[var(--gold-ink)] transition-colors" title="Add New Area"><Plus size={14}/></button>}
                                    </div>
                                )}
                            </div>

                            <input disabled={isReadOnlyMode} type="text" placeholder="WhatsApp Number" value={newAgent.phone} onChange={e => setNewAgent({...newAgent, phone: e.target.value})} className={`w-full border border-[var(--line-2)] rounded p-2.5 text-xs text-[var(--ink)] mb-2 outline-none ${isReadOnlyMode ? 'bg-[var(--raised)] opacity-60 cursor-not-allowed' : 'bg-[var(--inset)] focus:border-[var(--accent-edge)]'}`}/>
                            <input disabled={isReadOnlyMode} type="text" placeholder="Vehicle License Plate (Optional)" value={newAgent.vehicle} onChange={e => setNewAgent({...newAgent, vehicle: e.target.value})} className={`w-full border border-[var(--line-2)] rounded p-2.5 text-xs text-[var(--ink)] mb-2 outline-none ${isReadOnlyMode ? 'bg-[var(--raised)] opacity-60 cursor-not-allowed' : 'bg-[var(--inset)] focus:border-[var(--accent-edge)]'}`}/>
                            <label className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-widest block mb-1">Join Date</label>
                            <input disabled={isReadOnlyMode} type="date" value={newAgent.joinDate || ''} onChange={e => setNewAgent({...newAgent, joinDate: e.target.value})} className={`w-full border border-[var(--line-2)] rounded p-2.5 text-xs text-[var(--ink)] mb-4 outline-none ${isReadOnlyMode ? 'bg-[var(--raised)] opacity-60 cursor-not-allowed' : 'bg-[var(--inset)] focus:border-[var(--accent-edge)]'}`}/>

                            <div className="bg-[var(--inset)] border border-[var(--line-2)] rounded-lg p-3 mb-4 shadow-inner">
                                <h4 className="text-[10px] font-bold text-[var(--accent-ink)] flex items-center gap-1 uppercase tracking-widest mb-3 border-b border-[var(--line-2)] pb-1"><ShieldCheck size={12}/> Agent Security Limits</h4>
                                
                                {/* 🗑️ "ALLOW ROSTER MANAGEMENT" USED TO BE A CHECKBOX HERE, PER PERSON.
                                    It is gone on his word — *"moved that into matrix on setting
                                    instead"* — and it had to go rather than stay as a second
                                    opinion: two places deciding one thing is how a rookie ended up
                                    able to terminate staff. The answer is now one row in
                                    Settings › Permissions, where all six tiers are visible at once.
                                    Nothing writes `canEditRoster` any more; the field survives on
                                    old documents and is simply never read. */}

                                <div className="mb-4">
                                    <label className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-widest block mb-2">Operational Privileges</label>
                                    <label className={`flex items-center gap-2 cursor-pointer text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${isReadOnlyMode ? 'opacity-70 cursor-not-allowed' : ''} ${newAgent.allowRetur ? 'bg-[var(--inset)] border-[var(--danger)] text-[var(--danger-ink)]' : 'bg-[var(--raised)] border-[var(--line-2)] text-[var(--ink-muted)] hover:border-[var(--line-2)]'}`}>
                                        <input type="checkbox" className="hidden" disabled={isReadOnlyMode} checked={newAgent.allowRetur} onChange={() => setNewAgent({...newAgent, allowRetur: !newAgent.allowRetur})} />
                                        Allow Tarik Barang / Retur (Return Unsold Goods)
                                    </label>
                                    {/* Aldi, 2026-08-18: "contract is done its nothing, no responsibility, no
                                        credit" — the company owes nothing back, so paying cash out is not a
                                        normal agent power. He chose to keep it for real cases (shop closing,
                                        dispute) but locked: OFF by default, granted per person. */}
                                    <label className={`mt-2 flex items-center gap-2 cursor-pointer text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${isReadOnlyMode ? 'opacity-70 cursor-not-allowed' : ''} ${newAgent.allowCashRefund ? 'bg-[var(--inset)] border-[var(--danger)] text-[var(--danger-ink)]' : 'bg-[var(--raised)] border-[var(--line-2)] text-[var(--ink-muted)] hover:border-[var(--line-2)]'}`}>
                                        <input type="checkbox" className="hidden" disabled={isReadOnlyMode} checked={!!newAgent.allowCashRefund} onChange={() => setNewAgent({...newAgent, allowCashRefund: !newAgent.allowCashRefund})} />
                                        Allow Cash Refund / Buyback (pays money OUT)
                                    </label>
                                </div>

                                <div className="mb-3">
                                    <label className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-widest block mb-2">Allowed Payment Methods</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Cash', 'QRIS', 'Transfer', 'Titip'].map(method => (
                                            <label key={method} className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded border transition-colors ${isReadOnlyMode ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${newAgent.allowedPayments.includes(method) ? 'bg-[var(--inset)] border-[var(--accent-edge)] text-[var(--accent-ink)]' : 'bg-[var(--raised)] border-[var(--line-2)] text-[var(--ink-muted)]'}`}>
                                                <input type="checkbox" className="hidden" disabled={isReadOnlyMode} checked={newAgent.allowedPayments.includes(method)} onChange={() => togglePayment(method)} />
                                                {method === 'Titip' ? 'Consignment' : method}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-widest block mb-2">Allowed Price Tiers</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Ecer', 'Retail', 'Grosir'].map(tier => (
                                            <label key={tier} className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded border transition-colors ${isReadOnlyMode ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${newAgent.allowedTiers.includes(tier) ? 'bg-[var(--inset)] border-[var(--accent-edge)] text-[var(--accent-ink)]' : 'bg-[var(--raised)] border-[var(--line-2)] text-[var(--ink-muted)]'}`}>
                                                <input type="checkbox" className="hidden" disabled={isReadOnlyMode} checked={newAgent.allowedTiers.includes(tier)} onChange={() => toggleTier(tier)} />
                                                {tier}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <label className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-widest block mb-2">Hand-off approval branches</label>
                                    <div className="flex flex-wrap gap-2">
                                        {approvalBranches.map(region => (
                                            <label key={region} className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded border transition-colors ${isReadOnlyMode ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${(newAgent.approvalRegions || []).includes(region) ? 'bg-[var(--inset)] border-[var(--accent-edge)] text-[var(--accent-ink)]' : 'bg-[var(--raised)] border-[var(--line-2)] text-[var(--ink-muted)]'}`}>
                                                <input type="checkbox" className="hidden" disabled={isReadOnlyMode} checked={(newAgent.approvalRegions || []).includes(region)} onChange={() => toggleApprovalRegion(region)} />
                                                {region}
                                            </label>
                                        ))}
                                        {approvalBranches.length === 0 && (
                                            <span className="text-[10px] text-[var(--ink-muted)]">No branches yet — give your personnel a branch first.</span>
                                        )}
                                    </div>
                                    {/* A control that quietly does something while unticked still has to say so. */}
                                    <p className="text-[10px] text-[var(--ink-muted)] mt-2 leading-relaxed">
                                        {(newAgent.approvalRegions || []).length === 0
                                            ? 'Nothing ticked: this person follows the default \u2014 a Regional Admin authorises hand-offs into their own branch, and nobody else does.'
                                            : `Only this person authorises hand-offs into ${(newAgent.approvalRegions || []).join(', ')}, whatever their rank — including stores handed to them. That branch stops falling to its Regional Admin by default.`}
                                    </p>
                                </div>
                            </div>
                            
                            {isReadOnlyMode ? (
                                <button onClick={() => setIsAddingAgent(false)} className="w-full bg-[var(--panel)] hover:bg-[var(--panel)] text-[var(--ink)] font-bold py-3 rounded-lg text-xs uppercase tracking-widest transition-colors shadow-md">
                                    Close Profile
                                </button>
                            ) : (
                                <button onClick={handleSaveAgent} className="w-full bg-[var(--gold)] hover:brightness-110 text-[var(--gold-ink)] font-bold py-3 rounded-lg text-xs uppercase tracking-widest transition-colors shadow-lg active:scale-95">
                                    {editingAgentId ? 'Save Profile & Permissions' : 'Authorize & Register'}
                                </button>
                            )}
                        </div>
                    )}

                    {agents.length === 0 && !isAddingAgent ? (
                        /* AN EMPTY ROSTER HAS FOUR DIFFERENT CAUSES AND THEY NEED FOUR DIFFERENT
                           ACTIONS. "No personnel found" was printed for all of them, so the screen
                           that was meant to show a regional admin their own team said nothing at
                           all when the read was refused, when the admin's own record was missing,
                           and when their branch was simply empty. Name the cause. */
                        <div className="text-center py-10 px-4">
                            <Truck size={48} className="mx-auto text-[var(--ink-dim)] mb-3 opacity-50"/>
                            {isFetchingFleet ? (
                                <p className="text-[var(--ink-muted)] text-sm">Loading the roster…</p>
                            ) : fleetError ? (
                                <>
                                    <p className="text-[var(--danger-ink)] text-sm font-bold">The roster could not be read.</p>
                                    <p className="text-[var(--ink-muted)] text-xs mt-1.5 leading-relaxed">
                                        The database refused this request (<span className="font-mono">{fleetError}</span>). Nobody is missing — this screen could not look. Show this code to the owner.
                                    </p>
                                </>
                            ) : isAreaAdmin && !myProfile ? (
                                <>
                                    <p className="text-[var(--accent-ink)] text-sm font-bold">Your own staff record was not found.</p>
                                    <p className="text-[var(--ink-muted)] text-xs mt-1.5 leading-relaxed">
                                        This screen shows the branch YOU are posted to, and it reads that from your record in Fleet &amp; Roster. Without it there is no branch to show, so the roster is empty rather than wrong. The owner can add you on this screen.
                                    </p>
                                </>
                            ) : isAreaAdmin && searchLocation === 'unassigned' ? (
                                <>
                                    <p className="text-[var(--accent-ink)] text-sm font-bold">You are not posted to a branch yet.</p>
                                    <p className="text-[var(--ink-muted)] text-xs mt-1.5 leading-relaxed">
                                        Your record has no area set, so there is no team to list. The owner can set your area in Fleet &amp; Roster.
                                    </p>
                                </>
                            ) : isAreaAdmin && activeMotorists.length > 0 ? (
                                <>
                                    <p className="text-[var(--ink)] text-sm font-bold">Nobody is posted to {branchPathLocation}.</p>
                                    <p className="text-[var(--ink-muted)] text-xs mt-1.5 leading-relaxed">
                                        {activeMotorists.length} people are on the company roster; none of them has this area set. You only see your own branch.
                                    </p>
                                </>
                            ) : (
                                <p className="text-[var(--ink-muted)] text-sm">No personnel found.</p>
                            )}
                        </div>
                    ) : (
                        <>
                            <label className="relative block mb-3 max-w-md">
                                <span className="sr-only">Search the roster</span>
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
                                <input type="text" placeholder="Search name, role, area, email…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[var(--inset)] border border-[var(--line-2)] focus:border-[var(--accent-edge)] rounded-xl py-2.5 pl-9 pr-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-dim)] outline-none transition-colors"/>
                            </label>

                            {(() => {
                                /* The data decides the shape, not a role list: one place in view (an area admin's own branch)
                                   is one stage; several places (the owner, HQ) get one tab each over the stage. A search puts
                                   every match on the stage at once. */
                                const term = searchTerm.toLowerCase();
                                const shown = agents.filter(a => !term || a.name?.toLowerCase().includes(term) || a.email?.toLowerCase().includes(term) || a.userRole?.toLowerCase().includes(term) || a.location?.toLowerCase().includes(term) || a.province?.toLowerCase().includes(term));
                                const places = {};
                                shown.forEach(a => {
                                    const prov = String(a.province || 'CENTRAL JAVA').trim().toUpperCase();
                                    const loc = String(a.location || 'UNASSIGNED AREA').trim().toUpperCase();
                                    const k = `${prov} › ${loc}`;
                                    (places[k] = places[k] || { prov, loc, people: [] }).people.push(a);
                                });
                                const keys = Object.keys(places).sort((x, y) => x.localeCompare(y));
                                const rank = { 'ADMIN': 3, 'AREA_ADMIN': 2, 'AGENT': 1 };
                                const byRank = (list) => [...list].sort((x, y) => (rank[y.userRole || 'AGENT'] || 0) - (rank[x.userRole || 'AGENT'] || 0));
                                const place = places[rosterPlace] ? rosterPlace : (keys.find(k => places[k].people.some(p => p.id === selectedAgent?.id)) || keys[0]);
                                const cast = byRank(term ? shown : (places[place]?.people || []));
                                const sel = cast.find(p => p.id === selectedAgent?.id);

                                if (term && shown.length === 0) return <p className="text-sm text-[var(--ink-muted)] text-center py-8">Nobody matches “{searchTerm}”.</p>;
                                return (
                                    <div>
                                        {!term && keys.length > 1 && (
                                            <div className="kpm-stage-tabs" role="tablist" aria-label="Areas">
                                                {keys.map(k => (
                                                    <button key={k} type="button" role="tab" aria-selected={k === place} className={`kpm-stage-tab${k === place ? ' on' : ''}`} onClick={() => setRosterPlace(k)}>
                                                        <span>{places[k].loc}</span><small>{places[k].people.length}</small>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <div className="kpm-stage" role="listbox" aria-label="People">
                                            {cast.map(m => stageCard(m))}
                                        </div>
                                        <div className="kpm-stage-bar">
                                            <span className="kpm-stage-name">{term ? `Search · ${cast.length}` : (places[place]?.loc || 'Fleet')}</span>
                                            {sel ? (
                                                <span className="kpm-stage-acts">
                                                    <button type="button" onClick={(e) => handleViewClick(e, sel)}><User size={14}/> <span>Details</span></button>
                                                    {canEditFleet && (
                                                        <>
                                                            <button type="button" onClick={(e) => handleEditClick(e, sel)}><Pencil size={14}/> <span>Edit</span></button>
                                                            <button data-kpm-del data-label="Delete" type="button" onClick={(e) => handleDeleteAgent(e, sel)} aria-label={`Remove ${sel.name}`}><Trash2 size={15}/></button>
                                                        </>
                                                    )}
                                                </span>
                                            ) : <span className="kpm-stage-hint">Point at a card to look · tap to pick</span>}
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: THE LOADING DOCK */}
            <div className="hide-on-print flex-1 bg-[var(--panel)] flex flex-col relative">
                
                {/* 🚀 GLOBAL GEOFENCE COMMAND CENTER 🚀 */}
                {allBypasses.some(b => b.status === 'PENDING') && (
                    <div className="m-6 mb-0 bg-[var(--raised)] rounded-2xl border-2 border-[var(--accent-edge)] shadow-[0_0_30px_rgba(249,115,22,0.3)] overflow-hidden shrink-0 animate-fade-in-up z-20 backdrop-blur-sm">
                        <div className="p-4 bg-[var(--inset)] border-b border-[var(--accent-edge)] flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={18} className="text-[var(--accent-ink)] animate-pulse"/>
                                <h3 className="font-bold text-[var(--accent-ink)] uppercase tracking-widest text-xs">Active HQ Override Requests</h3>
                            </div>
                            <span className="bg-[var(--gold)] text-[var(--gold-ink)] text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                Action Required
                            </span>
                        </div>
                        <div className="p-4 space-y-3 bg-[var(--inset)] max-h-[300px] overflow-y-auto custom-scrollbar">
                            {allBypasses.filter(b => b.status === 'PENDING').map(bypass => (
                                <div key={bypass.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-3 rounded-xl border border-[var(--accent-edge)] bg-[var(--inset)] shadow-sm">
                                    <div className="flex items-start gap-4 w-full">
                                        {bypass.photoData && (
                                            <div className="w-16 h-16 shrink-0 bg-[var(--inset)] rounded-lg border border-[var(--line-2)] overflow-hidden cursor-zoom-in" onClick={() => window.open(bypass.photoData, '_blank')}>
                                                <img src={bypass.photoData} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" alt="Store Proof" title="Click to enlarge" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-[var(--ink)] text-sm uppercase">{bypass.storeName}</h4>
                                                <span className="text-[11px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-[var(--gold)] text-[var(--gold-ink)]">PENDING</span>
                                            </div>
                                            <p className="text-[10px] text-[var(--ink-muted)] font-mono mb-0.5">Agent: <span className="text-[var(--accent-ink)] font-bold">{bypass.salesmanName}</span> • Time: {new Date(bypass.timestamp).toLocaleString('id-ID')}</p>
                                            <p className="text-[10px] text-[var(--danger-ink)] font-bold uppercase tracking-widest flex items-center gap-1">
                                                <MapPin size={10}/> Distance Logged: {bypass.distance} Meters
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto shrink-0 border-t border-[var(--accent-edge)] md:border-none pt-3 md:pt-0 mt-2 md:mt-0">
                                        <button 
                                            onClick={async () => {
                                                if(await confirmAction(`Grant 100m Bypass for ${bypass.storeName}?`)){
                                                    updateDoc(doc(db, `artifacts/${appId}/users/${userId}/gps_bypasses`, bypass.id), { status: 'APPROVED' });
                                                    if(logAudit) logAudit("GPS_BYPASS_APPROVED", `Granted override for ${bypass.salesmanName} at ${bypass.storeName}`);
                                                }
                                            }}
                                            className="flex-1 md:flex-none bg-[var(--gold)] hover:brightness-110 text-[var(--gold-ink)] text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-lg transition-colors shadow-md"
                                        >
                                            Approve Override
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                if(await confirmAction(`Reject Bypass Request?`)){
                                                    updateDoc(doc(db, `artifacts/${appId}/users/${userId}/gps_bypasses`, bypass.id), { status: 'REJECTED' });
                                                    if(logAudit) logAudit("GPS_BYPASS_REJECTED", `Denied override for ${bypass.salesmanName} at ${bypass.storeName}`);
                                                }
                                            }}
                                            className="flex-1 md:flex-none bg-[var(--danger)] hover:bg-[var(--danger)] text-[var(--ink)] text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-lg transition-colors shadow-md"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {selectedAgent ? (
                    <>
                        <div className="p-6 border-b border-[var(--line-2)] bg-[var(--inset)]">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="text-[10px] text-[var(--accent-ink)] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Activity size={12}/> Active Deployment Terminal</p>
                                    <h2 className="text-3xl font-black text-[var(--ink)]">{selectedAgent.name}</h2>
                                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                                        <ShieldCheck size={14} className="text-[var(--accent-ink)]"/>
                                        <span className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Permissions:</span>
                                        {(selectedAgent.allowedPayments || ['Cash']).map(p => (
                                            <span key={p} className="text-[11px] bg-[var(--inset)] text-[var(--accent-ink)] border border-[var(--accent-edge)] px-1.5 py-0.5 rounded uppercase font-bold">{p === 'Titip' ? 'Consign' : p}</span>
                                        ))}
                                        <span className="text-[var(--ink-muted)]">|</span>
                                        {(selectedAgent.allowedTiers || ['Retail', 'Ecer']).map(t => (
                                            <span key={t} className="text-[11px] bg-[var(--inset)] text-[var(--accent-ink)] border border-[var(--accent-edge)] px-1.5 py-0.5 rounded uppercase font-bold">{t}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {(() => {
                                        let currentLoadBks = 0;
                                        (selectedAgent.activeCanvas || []).forEach(item => {
                                            const product = inventory.find(p => p.id === item.productId);
                                            currentLoadBks += convertToBks(item.qty, item.unit, product);
                                        });
                                        
                                        let soldTodayBks = 0;
                                        agentSales.forEach(t => {
                                            (t.items || []).forEach(item => {
                                                // 🚀 IGNORE PURE BUYBACKS AND IOU PROMISES FROM "SOLD" TALLY
                                                if (t.type === 'RETUR' && t.paymentType !== 'Tukar Ganti') return; 
                                                if (t.paymentType === 'Tukar Ganti' && item.fulfillment === 'IOU') return; 
                                                
                                                const product = inventory.find(p => p.id === item.productId);
                                                soldTodayBks += convertToBks(item.qty, item.unit, product);
                                            });
                                        });
                                        const initialLoadBks = currentLoadBks + soldTodayBks;

                                        return (
                                            <>
                                                <div className="bg-[var(--raised)] p-2.5 rounded-xl border border-[var(--line-2)] text-center min-w-[70px] shadow-inner">
                                                    <p className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest mb-1">Initial</p>
                                                    <p className="text-lg font-black text-[var(--ink)]">{initialLoadBks}</p>
                                                </div>
                                                <div className="bg-[var(--inset)] p-2.5 rounded-xl border border-[var(--accent-edge)] text-center min-w-[70px] shadow-inner">
                                                    <p className="text-[11px] text-[var(--accent-ink)] uppercase tracking-widest mb-1">Sold</p>
                                                    <p className="text-lg font-black text-[var(--accent-ink)]">{soldTodayBks}</p>
                                                </div>
                                                <div className="bg-[var(--inset)] p-2.5 rounded-xl border border-[var(--accent-edge)] text-center min-w-[70px] shadow-inner relative overflow-hidden">
                                                    <p className="text-[11px] text-[var(--accent-ink)] uppercase tracking-widest mb-1">Current</p>
                                                    <p className="text-lg font-black text-[var(--accent-ink)] relative z-10">{currentLoadBks}</p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                            
                            {/* THE VAN-LOADING BAY — his two chests (components/LoadingBay.jsx). Keyed by the
                                salesman, so a switch starts a fresh muatan; the roster asks first. */}
                            <div className="mb-6">
                                <LoadingBay
                                    key={selectedAgent.id}
                                    agent={selectedAgent}
                                    warehouse={selectedAgentUsesBranch ? String(selectedAgentLocation).toUpperCase() : 'PUSAT'}
                                    stock={displayInventory || []}
                                    damaged={damagedInVan(agentSales, inventory)}
                                    canEdit={canEditFleet}
                                    onLoad={handleLoadCanvas}
                                    onReturn={handleReturnToWarehouse}
                                    onLayout={handleSaveLayout}
                                    onDirty={setBayLines}
                                />
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={14}/> Itemized Asset Ledger</h3>
                                
                                {(selectedAgent.activeCanvas || []).length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setViewingSuratJalan(true)} className="text-[11px] bg-[var(--gold)] text-[var(--gold-ink)] hover:brightness-110 px-3 py-1.5 rounded uppercase tracking-widest font-bold transition-colors shadow-lg flex items-center gap-1"><Printer size={12}/> Surat Jalan</button>
                                        {canEditFleet && <button onClick={handleClearCanvas} className="text-[11px] bg-[var(--inset)] text-[var(--danger-ink)] hover:bg-[var(--danger)] hover:text-[var(--ink)] px-3 py-1.5 rounded uppercase tracking-widest font-bold transition-colors">Reconcile & Clear</button>}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                {combinedItems.length === 0 ? (
                                    <div className="text-center py-8 bg-[var(--inset)] rounded-xl border border-[var(--line-2)] border-dashed">
                                        <Archive size={24} className="mx-auto mb-2 text-[var(--ink-muted)]"/>
                                        <p className="text-xs text-[var(--ink-muted)] uppercase tracking-widest">No Items Assigned Today</p>
                                    </div>
                                ) : (
                                    combinedItems.map((item, idx) => (
                                        <div key={idx} className="bg-[var(--raised)] p-4 rounded-xl border border-[var(--line-2)] flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-pop-in">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${item.currentBks > 0 ? 'bg-[var(--gold)]' : 'bg-[var(--danger)]'}`}></div>
                                                <div>
                                                    <span className="font-bold text-[var(--ink)] text-sm">{item.name}</span>
                                                    {item.currentRaw > 0 && <p className="text-[10px] text-[var(--ink-muted)] mt-0.5">Active Load: {item.currentRaw} {item.unit}</p>}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 bg-[var(--inset)] p-2 rounded-lg border border-[var(--line-2)] text-[10px] font-mono font-bold w-full md:w-auto">
                                                <span className="text-[var(--ink-muted)] w-16 text-center">INIT: {item.initialBks}</span>
                                                <span className="w-[1px] h-4 bg-[var(--panel)]"></span>
                                                <span className="text-[var(--accent-ink)] w-16 text-center">SOLD: {item.soldBks}</span>
                                                <span className="w-[1px] h-4 bg-[var(--panel)]"></span>
                                                <span className={`${item.currentBks > 0 ? 'text-[var(--accent-ink)]' : 'text-[var(--danger-ink)]'} w-16 text-center`}>LEFT: {item.currentBks}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* 🚀 AGENT-SPECIFIC BYPASS HISTORY 🚀 */}
                            {(() => {
                                const agentPrefix = (selectedAgent.email || '').split('@')[0].toLowerCase();
                                const agentBypasses = allBypasses.filter(b => 
                                    b.status !== 'PENDING' && 
                                    (
                                        b.salesmanId === selectedAgent.id || 
                                        (b.salesmanName || '').toLowerCase() === (selectedAgent.name || '').toLowerCase() ||
                                        (b.salesmanName || '').toLowerCase() === agentPrefix
                                    )
                                );

                                if (agentBypasses.length === 0) return null;

                                return (
                                    <div className="mt-6 mb-2 bg-[var(--raised)] rounded-2xl border border-[var(--line-2)] shadow-xl overflow-hidden animate-fade-in-up">
                                        <div className="p-4 bg-[var(--inset)] border-b border-[var(--line-2)] flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Archive size={18} className="text-[var(--ink-muted)]"/>
                                                <h3 className="font-bold text-[var(--ink)] uppercase tracking-widest text-xs">Geofence Bypass History</h3>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3 bg-[var(--inset)] max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {agentBypasses.map(bypass => (
                                                <div key={bypass.id} className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-3 rounded-xl border shadow-sm ${bypass.status === 'APPROVED' ? 'bg-[var(--inset)] border-[var(--accent-edge)]' : 'bg-[var(--inset)] border-[var(--danger)]'}`}>
                                                    <div className="flex items-start gap-4 w-full">
                                                        {bypass.photoData && (
                                                            <div className="w-12 h-12 shrink-0 bg-[var(--inset)] rounded-lg border border-[var(--line-2)] overflow-hidden cursor-zoom-in" onClick={() => window.open(bypass.photoData, '_blank')}>
                                                                <img src={bypass.photoData} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" alt="Store Proof" title="Click to enlarge" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-bold text-[var(--ink)] text-xs uppercase">{bypass.storeName}</h4>
                                                                <span className={`text-[11px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${bypass.status === 'APPROVED' ? 'bg-[var(--gold)] text-[var(--gold-ink)]' : 'bg-[var(--danger-plate)] text-[var(--danger-plate-ink)]'}`}>
                                                                    {bypass.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-[var(--ink-muted)] font-mono mb-0.5">{new Date(bypass.timestamp).toLocaleString('id-ID')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* 🚀 UNIFIED ACTIVITY LOG (SALES & BYPASSES) 🚀 */}
                            <div className="mt-8 bg-[var(--raised)] rounded-2xl border border-[var(--line-2)] shadow-xl overflow-hidden animate-fade-in-up">
                                <button onClick={() => setShowHistory(!showHistory)} className="w-full p-4 flex justify-between items-center bg-[var(--inset)] hover:bg-[var(--inset)] transition-colors">
                                    <div className="flex items-center gap-2">
                                        <FileText size={18} className="text-[var(--accent-ink)]"/>
                                        <h3 className="font-bold text-[var(--ink)] uppercase tracking-widest text-xs">Today's Activity Logs ({agentSales.length} Transactions)</h3>
                                    </div>
                                    {showHistory ? <ChevronUp size={18} className="text-[var(--ink-muted)]"/> : <ChevronDown size={18} className="text-[var(--ink-muted)]"/>}
                                </button>
                                
                                {showHistory && (() => {
                                    const agentPrefix = (selectedAgent.email || '').split('@')[0].toLowerCase();
                                    const agentBypasses = allBypasses.filter(b => 
                                        b.status !== 'PENDING' &&
                                        (
                                            b.salesmanId === selectedAgent.id || 
                                            (b.salesmanName || '').toLowerCase() === (selectedAgent.name || '').toLowerCase() ||
                                            (b.salesmanName || '').toLowerCase() === agentPrefix ||
                                            agentSales.some(tx => (tx.customerName || '').toLowerCase() === (b.storeName || '').toLowerCase())
                                        )
                                    );

                                    return (
                                        <div className="p-4 bg-[var(--inset)] border-t border-[var(--line-2)] max-h-[600px] overflow-y-auto custom-scrollbar">
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                                                
                                                {/* LEFT COLUMN: FORENSIC SALES LOG */}
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest font-bold border-b border-[var(--line-2)] pb-2 mb-3 flex items-center gap-1"><ShoppingCart size={12}/> Daily Transactions</h4>
                                                    {agentSales.length === 0 ? (
                                                        <p className="text-center text-xs text-[var(--ink-muted)] uppercase tracking-widest py-4 bg-[var(--inset)] rounded-lg border border-[var(--line-2)] border-dashed">No transactions recorded today.</p>
                                                    ) : (
                                                        agentSales.map(tx => {
                                                            const linkedBypass = agentBypasses.find(b => {
                                                                if (b.status !== 'APPROVED') return false;
                                                                if ((b.storeName || '').toLowerCase() !== (tx.customerName || '').toLowerCase()) return false;
                                                                const bypassTime = new Date(b.timestamp || b.createdAt?.seconds * 1000 || 0).getTime();
                                                                const now = new Date().getTime();
                                                                return (now - bypassTime) < (24 * 60 * 60 * 1000);
                                                            });

                                                            // 🚀 BADGE LOGIC
                                                            const isRetur = tx.type === 'RETUR' || tx.paymentType === 'Retur/BS';
                                                            const isExchange = tx.paymentType === 'Tukar Ganti';
                                                            const isIouFulfill = tx.paymentType === 'IOU Fulfillment';

                                                            return (
                                                                <div key={tx.id} className="flex justify-between items-center p-3 bg-[var(--inset)] rounded-xl border border-[var(--line-2)] shadow-sm transition-all hover:border-[var(--accent-edge)] group">
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className="font-bold text-[var(--ink)] text-sm uppercase">{tx.customerName}</h4>
                                                                            {isRetur ? (
                                                                                <span className="text-[11px] font-black px-1 py-0.5 rounded uppercase tracking-widest bg-[var(--danger)] text-[var(--ink)] shadow-md">RETUR</span>
                                                                            ) : isExchange ? (
                                                                                <span className="text-[11px] font-black px-1 py-0.5 rounded uppercase tracking-widest bg-[var(--gold)] text-[var(--gold-ink)] shadow-md">EXCHANGE</span>
                                                                            ) : isIouFulfill ? (
                                                                                <span className="text-[11px] font-black px-1 py-0.5 rounded uppercase tracking-widest bg-[var(--gold)] text-[var(--gold-ink)] shadow-md">UTANG BARANG LUNAS</span>
                                                                            ) : null}
                                                                        </div>
                                                                        <p className="text-[10px] text-[var(--ink-muted)] font-mono mt-0.5">{tx.timestamp ? new Date(tx.timestamp.seconds * 1000).toLocaleTimeString('id-ID') : 'Today'} • {tx.paymentType}</p>
                                                                        
                                                                        {linkedBypass && (
                                                                            <div className="mt-1.5 flex items-center gap-1 text-[11px] bg-[var(--inset)] text-[var(--accent-ink)] border border-[var(--accent-edge)] px-1.5 py-0.5 rounded uppercase tracking-widest w-fit shadow-inner">
                                                                                <MapPin size={8}/> 100m Bypass Used
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-3 md:gap-4">
                                                                        <div className="text-right">
                                                                            <p className={`font-black text-sm md:text-base ${isRetur ? 'text-[var(--danger-ink)]' : 'text-[var(--accent-ink)]'}`}>
                                                                                {isRetur && (tx.total || tx.amountPaid || 0) > 0 ? '-' : ''}
                                                                                {new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', minimumFractionDigits:0}).format(tx.total || tx.amountPaid || 0)}
                                                                            </p>
                                                                            <p className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">{tx.items?.length || 0} Items</p>
                                                                        </div>
                                                                        <button onClick={() => setViewingReceipt(tx)} className="p-2 bg-[var(--raised)] group-hover:bg-[var(--panel)] text-[var(--accent-ink)] rounded-lg transition-colors shadow-sm" title="View Receipt">
                                                                            <FileText size={16}/>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>

                                                {/* RIGHT COLUMN: GEOFENCE VISUAL LOG */}
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest font-bold border-b border-[var(--line-2)] pb-2 mb-3 flex items-center gap-1"><MapPin size={12}/> Geofence Bypass Log</h4>
                                                    {agentBypasses.length === 0 ? (
                                                        <p className="text-center text-xs text-[var(--ink-muted)] uppercase tracking-widest py-4 bg-[var(--inset)] rounded-lg border border-[var(--line-2)] border-dashed">No bypass history.</p>
                                                    ) : (
                                                        agentBypasses.map(bypass => (
                                                            <div key={bypass.id} className={`flex items-start gap-3 p-3 rounded-xl border shadow-sm ${bypass.status === 'APPROVED' ? 'bg-[var(--inset)] border-[var(--accent-edge)]' : 'bg-[var(--inset)] border-[var(--danger)]'}`}>
                                                                {bypass.photoData && (
                                                                    <div className="w-12 h-12 shrink-0 bg-[var(--inset)] rounded-lg border border-[var(--line-2)] overflow-hidden cursor-zoom-in" onClick={() => window.open(bypass.photoData, '_blank')}>
                                                                        <img src={bypass.photoData} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" alt="Store Proof" title="Click to enlarge" />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <h4 className="font-bold text-[var(--ink)] text-xs uppercase">{bypass.storeName}</h4>
                                                                        <span className={`text-[11px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${bypass.status === 'APPROVED' ? 'bg-[var(--gold)] text-[var(--gold-ink)]' : 'bg-[var(--danger-plate)] text-[var(--danger-plate-ink)]'}`}>
                                                                            {bypass.status}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[10px] text-[var(--ink-muted)] font-mono mb-0.5">{new Date(bypass.timestamp).toLocaleString('id-ID')}</p>
                                                                    <p className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">Distance: {bypass.distance}m</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                        </div>
                    </>
                ) : (
                    /* THE COMMUNITY, when nobody is picked — his "i dont like this blue panel": State of Decay's
                       resource strip instead of a navy "standby". Every figure is one this screen already reads. */
                    <div className="p-6">
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--ink-dim)] mb-3">{isAreaAdmin ? branchPathLocation : 'Fleet'} · the community today</p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                ['People', agents.length],
                                ['Vans loaded', `${agents.filter(m => loadOf(m) > 0).length} / ${agents.length}`],
                                ['Bks in the vans', Math.round(agents.reduce((sum, m) => sum + loadOf(m), 0)).toLocaleString('id-ID')],
                                ['Override requests', allBypasses.filter(b => b.status === 'PENDING').length],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-xl border border-[var(--line-2)] bg-[var(--raised)] p-4">
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-dim)]">{label}</p>
                                    <p className="text-2xl font-black font-mono tabular-nums text-[var(--ink)] mt-1">{value}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-[var(--ink-muted)] mt-4 flex items-center gap-2"><Truck size={16} className="text-[var(--accent-ink)]"/> Pick someone on the stage to see their van and load it.</p>
                    </div>
                )}
            </div>
        </div>
    );
}