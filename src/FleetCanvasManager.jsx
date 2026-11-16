import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    Truck, UserPlus, Save,
    MapPin, Activity, X, AlertCircle, User, Mail, Pencil, Trash2, 
    ShieldCheck, FileText, Printer, MessageSquare, Search, Plus, RotateCcw, KeyRound, Lock, Unlock, Gift
} from 'lucide-react';
import { collection, doc, getDoc, setDoc, deleteDoc, updateDoc, writeBatch, runTransaction, onSnapshot, serverTimestamp, query, where } from 'firebase/firestore';
import { seatDocId, freeSeats, seatsUsedText, seatsFullMsg } from './utils/seats.js';
import { DYNAMIC_TIERS, canEditFleetRoster, tierWord, hasClearance, TIER_ONE_ID, resolveTierOneId, canSetBundlePrice, canSwitchBundle, canSetBundleRules } from './config/permissions';
import { vaultDocPath, VAULT_TRIES_RESET } from './utils/vaultDoc.js';
import { lockLeftMs, untilText } from './utils/vaultLock.js';
import { convertToBks, isSafeDocIdEmail, getLocalDayKey, bountyItems, nameInitials, isPromo, plainSaveError } from './utils/helpers';
import { normalizeRegion } from './config/permissions';
import { canonicalPlace, vanUsesBranch, moveWithGoodsMessage, vanGoodsLines } from './utils/supply';
import { confirmAction, promptAction } from './components/ConfirmGate.jsx';
import { notify } from './components/Toast.jsx';
import { IS_DEMO } from './config/firebase';
import LoadSheet from './components/LoadSheet.jsx';
import PromoBundleFields from './components/PromoBundleFields.jsx';
import { damagedInVan, titipOf, quarantineOf, movePromo, soldBks, lastDaySold } from './utils/vanBay';

/* IN FRONT OF HIM (his 2026-10-27 "when i press detail and edit i want the panel to just shows up infront of myface and
   blur other rather than i need to go up and see the updaten as well as the offer button"): DETAILS, EDIT, + and OFFERS
   open over a blurred screen instead of at the top of the roster. Tap outside, the X or Escape closes. */
function FrontPanel({ label, onClose, children }) {
    useEffect(() => {
        const key = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [onClose]);
    /* FROM document.body (his 2026-11-16 demo frame: Offers and Add personnel opened with their head under the mission
       strip): inside the screen's box (BiohazardTheme `relative z-10`) z-480 counts as 10, under the demo bars (95, 96) */
    return createPortal(
        <div className="fixed inset-0 z-[480] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 lg:p-6" role="dialog" aria-modal="true" aria-label={label} onClick={onClose} data-guide="front-panel">
            <div className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto custom-scrollbar rounded-xl border border-[var(--accent-edge)] bg-[var(--raised)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 bg-[var(--raised)] border-b border-[var(--line-2)]">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-ink)] truncate">{label}</h3>
                    <button type="button" onClick={onClose} aria-label={`Close ${label}`} className="kpm-btn shrink-0"><X size={18}/></button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    );
}

export default function FleetCanvasManager({ db, appId, user, userRole, agentProfileId, inventory, promoItems = [], transactions = [], customers = [], appSettings = {}, logAudit, triggerCapy, isAdmin, motorists = [], previewing = null, regionOffers = [], onSavePromoBundles = null, masterUserId = null }) {

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

    /* TEAM OFFERS (his 2026-10-27 "regional admin can make offers for his own as a team strategy as long as sales
       increasing"): T4 REGIONAL ADMIN only - rules CHANGE 19's isFleetCaptain, the same one tier on both sides - and only
       for the region this screen already runs as (the "{branch} Roster" header). */
    const offerRegion = userRole === 'FLEET_CAPTAIN' ? normalizeRegion(rawLocation) : '';
    /* T1-T3 make offers EVERYWHERE (his 2026-10-27 "tier 3 and above can make offers bundle everywhere") - all areas or
       any region, the whole list in one save; rules CHANGE 19 isAreaAdmin || isCompanyTopTier, the same tiers. */
    const offersEverywhere = ['DEVELOPER', 'ADMIN', 'COMPANY_OWNER', 'AREA_ADMIN'].includes(userRole);
    const canMakeOffers = (offersEverywhere || (offerRegion !== '' && offerRegion !== 'UNASSIGNED')) && promoItems.length > 0 && !!onSavePromoBundles;
    const offerRegions = useMemo(() => [...new Set(motorists.map(m => normalizeRegion(m.location)))].filter(r => r !== 'UNASSIGNED').sort(), [motorists]);
    const [offersOpen, setOffersOpen] = useState(false);
    const [offerPromoId, setOfferPromoId] = useState('');

    /* the owner's profile record (master_owner, written by App.jsx's location ping and his Agent Profile) is not a
       van - his van is ADMIN_VEHICLE. Listing both put him on the stage twice (demo walk, 2026-10-13); the EOD and
       Stock Opname pickers already leave master_owner out the same way. */
    const agents = useMemo(() => {
        const vans = activeMotorists.filter(m => m.id !== TIER_ONE_ID);
        if (isAreaAdmin) {
            return vans.filter(m => String(m.location || '').trim().toLowerCase() === searchLocation);
        }
        return vans;
    }, [activeMotorists, isAreaAdmin, searchLocation]);
    
    const [selectedAgent, setSelectedAgent] = useState(null);
    /* the panel's way out (his 2026-11-16 "closing and opening ... smooth and high quality"): kept on screen 200 ms with
       .closing, then unmounted; a new pick during those 200 ms cancels the exit */
    const [panelClosing, setPanelClosing] = useState(false);
    const closeTimer = useRef(null);
    /* phone: the person keys (Surat Jalan, Details, Edit, Delete...) wait behind More; a new pick folds them again */
    const [moreOpen, setMoreOpen] = useState(false);
    /* The picked person's account lock, live from their login record - the card offers Lock or Unlock */
    const [selLocked, setSelLocked] = useState(false);
    useEffect(() => {
        setSelLocked(false);
        const email = selectedAgent?.email?.toLowerCase().trim();
        if (!isGlobalAdmin || !email) return;
        return onSnapshot(doc(db, `artifacts/${appId}/employee_directory`, email), (s) => setSelLocked(s.data()?.locked === true),
            (err) => console.warn("Account lock listener:", err.code));
    }, [selectedAgent?.email, isGlobalAdmin]);
    /* THE SEAT LIMIT (utils/seats.js, rules CHANGE 20): his licence for this company and the seats its logins hold.
       null = no licence = no limit - and that is also what a refused read gives (rules not published yet), so a
       company is never blocked by a licence it cannot see. */
    const [seatLimit, setSeatLimit] = useState(null);
    const [seatDocs, setSeatDocs] = useState([]);
    useEffect(() => {
        if (!canEditFleet) return;
        return onSnapshot(doc(db, `artifacts/${appId}/licenses`, userId), (s) => setSeatLimit(s.exists() ? Number(s.data().seats) || 0 : null),
            () => setSeatLimit(null));
    }, [userId, canEditFleet]);
    const licensed = seatLimit !== null;
    useEffect(() => {
        setSeatDocs([]);
        if (!licensed) return;
        return onSnapshot(query(collection(db, `artifacts/${appId}/seats`), where('bossUid', '==', userId)), (s) => setSeatDocs(s.docs.map(d => d.data())),
            (err) => console.warn("Seats listener:", err.code));
    }, [userId, licensed]);
    const seatsFull = licensed && !freeSeats(seatDocs.map(s => s.n), seatLimit).length;
    const [isAddingAgent, setIsAddingAgent] = useState(false);
    const [isReadOnlyMode, setIsReadOnlyMode] = useState(false); 
    const [editingAgentId, setEditingAgentId] = useState(null); 
    
    const [branchStock, setBranchStock] = useState([]);
    const [branchPromo, setBranchPromo] = useState([]);

    // 🚀 FIX: Follows the SELECTED AGENT's own warehouse, not the viewer's — same rule as
    // EOD, Clear Canvas, and Load Canvas, so the number shown here always matches reality.
    const selectedAgentUsesBranch = vanUsesBranch(selectedAgent);
    const selectedAgentLocation = selectedAgent?.location;

    useEffect(() => {
        if (selectedAgentUsesBranch) {
            const safeBranchPath = selectedAgentLocation.replace(/\//g, '-');
            const stockRef = collection(db, `artifacts/${appId}/users/${userId}/branches/${safeBranchPath}/inventory`);
            const unsub = onSnapshot(stockRef, (snap) => {
                /* the shelf's promo rows (kind 'promo', pcs) never load into a van as cigarettes - they are the bay's PROMO view */
                const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setBranchStock(rows.filter(r => !isPromo(r)));
                setBranchPromo(rows.filter(isPromo));
            }, (err) => console.warn("Branch stock listener:", err.code));
            return () => unsub();
        } else {
            setBranchStock([]);
            setBranchPromo([]);
        }
    }, [db, appId, userId, selectedAgentUsesBranch, selectedAgentLocation]);

    const displayInventory = useMemo(() => {
        if (!selectedAgentUsesBranch) return inventory; 
        return inventory.map(item => {
            const bItem = branchStock.find(b => b.id === item.id);
            return { ...item, stock: bItem ? (bItem.stock || 0) : 0 };
        });
    }, [inventory, branchStock, selectedAgentUsesBranch]);
    /* the bay's PROMO view (stage 3): each promo product with the pieces in the warehouse the van loads from - a branch's
       own promo row, the Master Vault's own count for PUSAT */
    const displayPromo = useMemo(() => promoItems.map(p => ({ ...p, stock: selectedAgentUsesBranch ? (branchPromo.find(b => b.id === p.id)?.stock || 0) : (p.stock || 0) })),
        [promoItems, branchPromo, selectedAgentUsesBranch]);
    /* the bay's Quarantine view: the same rows the stock comes from - a branch's own damagedStock, HQ's for PUSAT */
    const whQuarantine = useMemo(() => quarantineOf(inventory, selectedAgentUsesBranch ? branchStock : null), [inventory, branchStock, selectedAgentUsesBranch]);

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

    /* how many unsaved lines the load sheet holds, so opening another person or closing the panel can ask first */
    const [bayLines, setBayLines] = useState(0);
    /* the area chip that is open on the roster ("PROVINCE › LOCATION"), when more than one place is in view */
    const [rosterPlace, setRosterPlace] = useState(null);
    /* PC: the screen is exactly as tall as the shell's scroll box (MerchantSalesView's fitH, the same measurement), so the
       ledger scrolls inside itself and the slide-over panel's Load key is always in view. Measured, not guessed: the
       box's height depends on the header, the demo bar and the window. */
    const rootRef = useRef(null);
    const [fitH, setFitH] = useState(null);
    /* his 2026-11-16 pick A, "focus": the PC person panel runs from just under the app header to the screen box's bottom,
       its left edge 275 px into the name column so the names stay readable beside it; top and bottom reach into the scroll
       box's padding (10 px under the header, the box's own bottom) - measured with fitH, never guessed */
    const [focusBox, setFocusBox] = useState(null);
    useEffect(() => {
        const box = rootRef.current?.parentElement?.closest('.overflow-y-auto');
        if (!box || typeof ResizeObserver === 'undefined') return undefined;
        const fit = () => {
            const cs = getComputedStyle(box); setFitH(Math.round(box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)));
            const b = box.getBoundingClientRect(), r = rootRef.current.getBoundingClientRect();
            setFocusBox({ '--fp-t': `${Math.round(b.top + 10)}px`, '--fp-b': `${Math.round(window.innerHeight - b.bottom)}px`,
                '--fp-l': `${Math.round(r.left + 275)}px`, '--fp-r': `${Math.round(window.innerWidth - r.right)}px` });
        };
        fit();
        const ro = new ResizeObserver(fit); ro.observe(box);
        return () => ro.disconnect();
    }, [isFetchingFleet]);

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

        /* a regional admin keeps the spelling on the form: firestore.rules lets them create a card only at the exact
           place on their own login, and a login saved in capitals before this fix would be refused the healed name */
        const savedLocation = isAreaAdmin ? (newAgent.location || 'Headquarters') : canonicalPlace(newAgent.location || 'Headquarters');
        const oldAgent = editingAgentId ? agents.find(a => a.id === editingAgentId) : null;
        const oldEmailKey = oldAgent?.email?.toLowerCase().trim();
        /* THE SEAT: a new login record holds one. An email change MOVES the seat the old address held (his "they can
           change the email and everything but it will stays at 1 seat"); a locked or re-saved login keeps its own. */
        const needsSeat = licensed && !isSelfProxy && (!editingAgentId || oldEmailKey !== emailKey);
        const heldSeat = needsSeat && oldEmailKey ? seatDocs.find(s => s.login === oldEmailKey) : null;
        const seatN = needsSeat ? (heldSeat?.n || freeSeats(seatDocs.map(s => s.n), seatLimit)[0]) : null;
        if (needsSeat && !seatN) return notify(seatsFullMsg(seatDocs.length, seatLimit));
        const seatRef = seatN ? doc(db, `artifacts/${appId}/seats`, seatDocId(userId, seatN)) : null;
        const claimSeat = (batch) => {
            if (heldSeat) batch.update(seatRef, { login: emailKey });
            else if (seatN) batch.set(seatRef, { bossUid: userId, n: seatN, login: emailKey });
        };

        const moveAsk = editingAgentId ? moveWithGoodsMessage(oldAgent, savedLocation) : null;
        if (moveAsk && !await confirmAction(moveAsk)) return;

        try {
            const batch = writeBatch(db);

            if (editingAgentId) {
                const agentRef = doc(db, collPath, editingAgentId);
                batch.update(agentRef, {
                    name: newAgent.name, phone: newAgent.phone, vehicle: newAgent.vehicle, role: newAgent.role, email: emailKey,
                    allowedPayments: newAgent.allowedPayments, allowedTiers: newAgent.allowedTiers,
                    userRole: newAgent.userRole || 'AGENT', location: savedLocation, province: newAgent.province || 'Central Java',
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
                    location: savedLocation, ...(seatN ? { seat: seatN } : {}),
                }, { merge: true });
                claimSeat(batch);

            } else {
                const newId = `AGT_${Date.now()}`;
                const agentData = {
                    id: newId, ...newAgent, location: savedLocation, email: emailKey, status: 'Active', activeCanvas: [], createdAt: serverTimestamp(),
                    approvalRegions: (newAgent.approvalRegions || []).length ? newAgent.approvalRegions.map(normalizeRegion) : null
                };
                batch.set(doc(db, collPath, newId), agentData);
                // No login mapping for a self-proxy — see isSelfProxy above.
                if (!isSelfProxy) batch.set(doc(db, `artifacts/${appId}/employee_directory`, emailKey), {
                    bossUid: userId, agentId: newId, role: newAgent.role, userRole: newAgent.userRole || 'AGENT', status: 'Active',
                    location: savedLocation, ...(seatN ? { seat: seatN } : {}),
                });
                claimSeat(batch);
            }

            await batch.commit();

            if (editingAgentId) {
                triggerCapy(`Profile updated for ${newAgent.name}!`);
                logAudit("FLEET_EDIT", `Updated profile for ${emailKey}`);
                if (moveAsk) {
                    const goods = vanGoodsLines(oldAgent).join(', ');
                    notify(`${newAgent.name} moved to ${normalizeRegion(savedLocation)}. Still in the van: ${goods}.`);
                    logAudit("FLEET_MOVE", `${newAgent.name} moved ${oldAgent.location} to ${savedLocation} with ${goods}`);
                }
            } else {
                triggerCapy(seatN ? `${newAgent.name} added on seat ${seatN} of ${seatLimit}.` : `${newAgent.name} added!`);
                logAudit("FLEET_ADD", `Created new ${newAgent.role} profile for ${emailKey}`);
            }

            setNewAgent(defaultAgentState);
            setIsAddingAgent(false);
            setEditingAgentId(null);
        } catch (e) { notify("Firebase Blocked the Save: " + e.message); }
    };

    /* THE DEMO'S LOGINS ARE SHARED BY EVERY VISITOR (his C, 2026-10-10: "make sure that the users wont broke anything
       or edit anything"). In the demo build a record marked demoLogin cannot be edited, deleted, locked or have its
       vault password wiped - the press answers instead of going grey and silent; Budi, Ari and Dewi are the practice
       staff for all of that. The real build drops all of it (IS_DEMO is false there, demoBuild.check reads the bundle). */
    const isDemoLogin = (agent) => IS_DEMO && agent?.demoLogin === true;
    const DEMO_LOGIN_MSG = 'This is a demo login - try it on Budi.';

    const handleEditClick = (e, agent) => {
        e.stopPropagation();
        if (isDemoLogin(agent)) return notify(DEMO_LOGIN_MSG);
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
        if (isDemoLogin(agent)) return notify(DEMO_LOGIN_MSG);
        if (!await confirmAction(`TERMINATION WARNING: Are you sure you want to remove ${agent.name}? This will instantly revoke their login access.`)) return;
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, collPath, agent.id));
            if (agent.email) batch.delete(doc(db, `artifacts/${appId}/employee_directory`, agent.email.toLowerCase().trim()));
            /* only removing the person frees the seat - in the same batch as the login (rules CHANGE 20) */
            const freed = agent.email ? seatDocs.find(s => s.login === agent.email.toLowerCase().trim()) : null;
            if (freed) batch.delete(doc(db, `artifacts/${appId}/seats`, seatDocId(userId, freed.n)));
            await batch.commit();
            triggerCapy(`${agent.name} terminated. Access revoked.${freed ? ` Seat ${freed.n} is free.` : ''} 🛑`);
            logAudit("FLEET_DELETE", `Terminated agent: ${agent.email}`);
            if (selectedAgent?.id === agent.id) setSelectedAgent(null);
        } catch (e) { notify("Firebase Blocked the Deletion: " + e.message); }
    };

    /* RESET A PERSON'S VAULT TRIES. His 2026-09-28: "we have power to help them reset the password tries".
       Their own vault doc (utils/vaultDoc.js) and the tries reset only - no screen shows, sets or sends anyone's
       password. The landlord's handleResetVaultTries (LandlordDashboard.jsx), per person. */
    const handleResetVaultTries = async (agent) => {
        try {
            const ref = doc(db, vaultDocPath(appId, { bossUid: userId, agentProfileId: agent.id }));
            const snap = await getDoc(ref);
            if (!snap.exists()) return notify(`${agent.name} has not set a vault password yet. Nothing to reset.`);
            const d = snap.data(), left = lockLeftMs(d, Date.now());
            await updateDoc(ref, VAULT_TRIES_RESET);
            notify(`Vault tries reset for ${agent.name}: ${left ? `the lock until ${untilText(d.lockedUntil)} is lifted` : `back to 0 (it was ${d.failedRecoveryAttempts || 0})`}. They can try again now.`);
            logAudit("VAULT_TRIES_RESET", `Reset vault tries for ${agent.email || agent.name}`);
        } catch (e) {
            console.error(e);
            notify(`Could not reset the vault tries for ${agent.name}: ${e.message || 'unknown error'}`);
        }
    };

    /* RESET A PERSON'S VAULT PASSWORD. His 2026-09-28: "we admin can reset their password but of course this need
       double confirmation but we cant change their password" - "type confirm and press enter". It DELETES their vault
       doc, so their next vault visit is the setup screen and THEY make the new one; nobody else ever sees it. On a lost
       phone, lock the account first: a reset alone lets whoever holds the phone make the new password. */
    const handleResetVaultPassword = async (agent) => {
        if (isDemoLogin(agent)) return notify(DEMO_LOGIN_MSG);
        const typed = await promptAction(`Reset ${agent.name}'s vault password? They make a new one the next time they open the vault. Type confirm and press Enter.`, '', 'Reset');
        if (typed === null) return;
        if (typed.trim().toLowerCase() !== 'confirm') return notify(`Not reset: you typed "${typed}", not "confirm".`);
        try {
            const ref = doc(db, vaultDocPath(appId, { bossUid: userId, agentProfileId: agent.id }));
            if (!(await getDoc(ref)).exists()) return notify(`${agent.name} has no vault password yet. Nothing to reset.`);
            await deleteDoc(ref);
            notify(`Vault password reset for ${agent.name}. They make a new one the next time they open the vault.`);
            logAudit("VAULT_PASSWORD_RESET", `Reset vault password for ${agent.email || agent.name}`);
        } catch (e) {
            console.error(e);
            notify(`Could not reset the vault password for ${agent.name}: ${e.message || 'unknown error'}`);
        }
    };

    /* LOCK AN ACCOUNT - a lost or hacked phone. His 2026-09-28: "lock account basically just make that email unable to
       login at all". One flag on the person's login record (employee_directory/<email>): the app signs them out, open
       or not, and the rules draft refuses every read and write from that account. Unlock clears the flag. */
    const handleLockAccount = async (agent, lock) => {
        if (isDemoLogin(agent)) return notify(DEMO_LOGIN_MSG);
        if (lock && !await confirmAction(`Lock ${agent.name}'s account? ${agent.email} is signed out at once and cannot sign in or read any company data until you unlock it.`)) return;
        try {
            await updateDoc(doc(db, `artifacts/${appId}/employee_directory`, agent.email.toLowerCase().trim()),
                lock ? { locked: true, lockedAt: serverTimestamp(), lockedBy: user?.email || '' } : { locked: false });
            notify(lock ? `${agent.name} is locked. ${agent.email} is signed out and stays out until you unlock it.` : `${agent.name} is unlocked and can sign in again.`);
            logAudit(lock ? "ACCOUNT_LOCK" : "ACCOUNT_UNLOCK", `${lock ? 'Locked' : 'Unlocked'} ${agent.email}`);
        } catch (e) {
            console.error(e);
            notify(`Could not ${lock ? 'lock' : 'unlock'} ${agent.name}: ${e.message || 'unknown error'}`);
        }
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
        const masterProduct = inventory.find(p => p.id === productId) || promoItems.find(p => p.id === productId);
        if (!masterProduct) return { ok: false, reason: 'Barang tidak ada di daftar produk' };
        const promo = isPromo(masterProduct), unitWord = promo ? 'pcs' : 'Bks';

        const qtyToLoad = Number(qtyBks);
        const unitToLoad = 'Bks';
        const loadInBks = qtyToLoad;

        // 🚀 FIX: Route based on the SELECTED AGENT's own place, not the viewer's.
        // Matches the same rule used by EOD verification and Clear Canvas.
        const agentLocation = selectedAgent.location;
        const useBranchWarehouse = vanUsesBranch(selectedAgent);
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
                    throw new Error(`INSUFFICIENT WAREHOUSE STOCK!\n\nYou are trying to load ${loadInBks} ${unitWord}, but the ${sourceLabel} Vault only has ${currentSourceStock} ${unitWord} available.`);
                }

                const agentRef = doc(db, collPath, selectedAgent.id);
                const agentSnap = await t.get(agentRef);
                const liveCanvas = agentSnap.exists() ? (agentSnap.data().activeCanvas || []) : (selectedAgent.activeCanvas || []);

                // ✍️ PHASE 2: WRITES
                if (useBranchWarehouse) {
                    t.set(sourceRef, { productId: masterProduct.id, name: masterProduct.name, ...(promo ? { kind: 'promo', unit: 'pcs' } : {}), stock: currentSourceStock - loadInBks }, { merge: true });
                } else {
                    t.set(sourceRef, { stock: currentSourceStock - loadInBks }, { merge: true });
                }
                /* a promo product rides in its own field, in pcs - never inside activeCanvas (vanBay movePromo) */
                if (promo) {
                    t.update(agentRef, { promoCanvas: movePromo((agentSnap.exists() ? agentSnap.data() : selectedAgent).promoCanvas, masterProduct, loadInBks) });
                    return;
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
            /* the demo's mission line ticks on the SAVED load, never on the press (DemoMission.jsx) */
            if (IS_DEMO) window.dispatchEvent(new CustomEvent('kpm-mission', { detail: { step: 3, qty: qtyToLoad, who: selectedAgent.name } }));

            /* the bay reports the whole press in ONE line, so the per-product mascot line is gone;
               the audit log keeps one entry per movement */
            logAudit("CANVAS_LOAD", `Loaded ${qtyToLoad}${promo ? ' pcs' : ''} ${masterProduct.name} to ${selectedAgent.name} (from ${sourceLabel})`);
            return { ok: true };
        } catch (e) {
            console.error(e);
            return { ok: false, reason: plainSaveError(e, 'Gagal memuat ke van') };
        }
    };

    const handleClearCanvas = async () => {
        /* Was on the backlog on its own as *"a button that lies"* — the database rules already
           refused the save, so a tier that could press it got a failure and no explanation.
           It now refuses on the screen, in words, before anything is attempted. */
        if (!canEditFleet) return notify("VIEW ONLY: your tier cannot reconcile a canvas. Ask an admin to change it in Settings › Permissions.");
        if (!selectedAgent) return;

        // 🚀 FIX: Route based on the SELECTED AGENT's own place, not the viewer's.
        // Matches the same rule EOD verification uses, so the two can never disagree.
        const agentLocation = selectedAgent.location;
        const useBranchWarehouse = vanUsesBranch(selectedAgent);
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
                /* the van's promo goods (their own field, in pcs) go back with it - convertToBks returns their plain count */
                const livePromo = agentSnap.exists() ? (agentSnap.data().promoCanvas || []) : [];
                const itemsToReturn = [
                    ...liveCanvas.map(item => ({ item, product: inventory.find(p => p.id === item.productId) })),
                    ...livePromo.map(item => ({ item, product: promoItems.find(p => p.id === item.productId) }))
                ].filter(x => x.product);

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
                        t.set(r.ref, { productId: r.product.id, name: r.product.name, ...(isPromo(r.product) ? { kind: 'promo', unit: 'pcs' } : {}), stock: currentStock + returnInBks }, { merge: true });
                    } else {
                        t.set(r.ref, { stock: currentStock + returnInBks }, { merge: true });
                    }
                });

                t.update(agentRef, { activeCanvas: [], promoCanvas: [] });
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
        const product = inventory.find(p => p.id === productId) || promoItems.find(p => p.id === productId);
        if (!selectedAgent || !product || !(Number(qtyBks) > 0)) return { ok: false, reason: 'Jumlah tidak sah' };
        const promo = isPromo(product);

        const agentLocation = selectedAgent.location;
        const useBranchWarehouse = vanUsesBranch(selectedAgent);
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
                /* a promo line comes off promoCanvas, in pcs - activeCanvas is never touched (stage 3) */
                const left = promo ? movePromo(agentSnap.exists() ? agentSnap.data().promoCanvas : [], product, -qtyBks) : null;
                if (promo && !left) throw new Error(`Van tidak punya ${qtyBks} pcs ${product.name} lagi`);
                const liveCanvas = agentSnap.exists() ? (agentSnap.data().activeCanvas || []) : [];
                const idx = liveCanvas.findIndex(item => item.productId === product.id);
                const rowBks = idx >= 0 ? convertToBks(liveCanvas[idx].qty, liveCanvas[idx].unit, product) : 0;
                if (!promo && rowBks < qtyBks) throw new Error(`Van tinggal ${rowBks} Bks ${product.name} — ada penjualan sejak ditarik`);

                // ✍️ PHASE 2: WRITES
                const currentStock = destSnap.exists() ? (destSnap.data().stock || 0) : 0;
                if (useBranchWarehouse) {
                    t.set(destRef, { productId: product.id, name: product.name, ...(promo ? { kind: 'promo', unit: 'pcs' } : {}), stock: currentStock + qtyBks }, { merge: true });
                } else {
                    t.set(destRef, { stock: currentStock + qtyBks }, { merge: true });
                }
                if (promo) { t.update(agentRef, { promoCanvas: left }); return; }
                const updated = JSON.parse(JSON.stringify(liveCanvas));
                updated[idx].qty -= qtyBks / convertToBks(1, updated[idx].unit, product);
                if (updated[idx].qty <= 1e-9) updated.splice(idx, 1);
                t.update(agentRef, { activeCanvas: updated });
            });
            logAudit("CANVAS_RETURN", `Returned ${qtyBks} ${promo ? 'pcs' : 'Bks'} ${product.name} from ${selectedAgent.name} → ${destinationLabel}`);
            return { ok: true };
        } catch (e) {
            console.error(e);
            return { ok: false, reason: plainSaveError(e, 'Gagal mengembalikan ke gudang') };
        }
    };

    /* HIS USUAL LOAD (round 4) - its own field on the person's record, never inside activeCanvas (both transactions and
       every sale write that one): the sheet's "Save as usual load". Using it only fills the sheet; only Load van moves stock. */
    const handleSavePreset = async (preset) => {
        if (!canEditFleet || !selectedAgent) return false;
        try {
            await updateDoc(doc(db, collPath, selectedAgent.id), { loadPreset: preset });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    /* ── THE ROSTER LEDGER (2026-11-16) ────────────────────────────────────────────────────────────────────
       His pick from the options board: "Team list A Ledger table · Loading 1 Load sheet · PC Y Slide-over panel". One
       ruled line per person: Status, Loaded, Sold today (with a thin bar), Left in van; on the phone one line with what
       is left, big. The search, the area grouping, the guards and the doors are the ones the stage had; the 3D stage
       itself (2026-09-24) lives on in tag game-edition-v1. */
    const loadOf = (m) => (m.activeCanvas || []).reduce((sum, r) => sum + convertToBks(r.qty, r.unit, inventory.find(p => p.id === r.productId)), 0);
    /* one place key for the roster's area chips AND the sheet's "Copy a teammate" (the other vans in this place) */
    const placeOf = (a) => {
        const prov = String(a.province || 'CENTRAL JAVA').trim().toUpperCase();
        const loc = String(a.location || 'UNASSIGNED AREA').trim().toUpperCase();
        return { prov, loc, k: `${prov} › ${loc}` };
    };
    /* ONE matcher for "this person's override requests": the Requests tab and the Activity tab both use it, so the
       two can never disagree about whose request it is */
    const isAgentBypass = (b, a) => {
        const prefix = (a.email || '').split('@')[0].toLowerCase();
        return b.salesmanId === a.id || (b.salesmanName || '').toLowerCase() === (a.name || '').toLowerCase() || (b.salesmanName || '').toLowerCase() === prefix;
    };
    /* opening another person, or closing the panel, while the sheet holds unsaved numbers asks first, through the dialog gate */
    const pickAgent = async (m) => {
        if (bayLines > 0 && selectedAgent?.id !== m.id && !await confirmAction(`${selectedAgent?.name}'s sheet has numbers that are not saved yet. Open ${m.name} and drop them?`)) return;
        clearTimeout(closeTimer.current); setPanelClosing(false);
        setSelectedAgent(m); setMoreOpen(false);
    };
    /* the exit's own end unmounts it (a 200 ms timer started ~45 ms before React painted .closing and cut it at opacity .4);
       the timer only covers an exit that never runs */
    const finishClose = () => { clearTimeout(closeTimer.current); setPanelClosing(false); setSelectedAgent(null); };
    const closePanel = async () => {
        if (panelClosing) return;
        if (bayLines > 0 && !await confirmAction(`${selectedAgent?.name}'s sheet has numbers that are not saved yet. Close it and drop them?`)) return;
        /* only the PC slides it out; the phone, Lite Mode and reduced motion close at once, the way they open */
        if (!window.matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)').matches || document.documentElement.classList.contains('lite-mode')) return setSelectedAgent(null);
        setPanelClosing(true);
        closeTimer.current = setTimeout(finishClose, 400);
    };
    /* the three tiers that lead a team stand on top of the ledger - FLEET_CAPTAIN included (the stage forgot that tier) */
    const isLeader = (m) => ['ADMIN', 'AREA_ADMIN', 'FLEET_CAPTAIN'].includes(m.userRole);
    /* HIS WORD FOR THE TIER, not the code's. `tierWord` reads the labels he set in Settings, so a rename shows up here
       without anyone editing this line. */
    const roleLine = (m) => (m.userRole === 'ADMIN' ? 'Master Admin (Global)'
        : (m.userRole === 'AREA_ADMIN' || m.userRole === 'FLEET_CAPTAIN') ? `${tierWord(m.userRole) || (m.userRole === 'AREA_ADMIN' ? 'HQ Sales Manager' : 'Regional Admin')} (${m.location})`
        : `${m.role || ''}${m.vehicle ? ` · ${m.vehicle}` : ''}`);
    const sumOf = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
    const rosterRow = (m) => {
        const left = Math.round(loadOf(m));
        /* the van's promo goods (their own field, pcs) ride beside the packs - a van of T-shirts is not empty, and a
           piece is never added into the Bks */
        const pcs = (m.promoCanvas || []).reduce((s, r) => s + (Number(r.qty) || 0), 0);
        const sold = Math.round(sumOf(soldByAgent[m.id])), loaded = left + sold, pct = loaded ? Math.round(100 * sold / loaded) : 0;
        const on = selectedAgent?.id === m.id, lead = isLeader(m), has = loaded > 0 || pcs > 0;
        const state = sold > 0 ? 'On route' : has ? 'Loaded' : 'Not loaded';
        const num = (v) => (has ? v.toLocaleString('id-ID') : '—');
        return (
            <div key={m.id} data-agent={m.id} role="option" aria-selected={on} tabIndex={0} onClick={() => (on ? closePanel() : pickAgent(m))}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); on ? closePanel() : pickAgent(m); } }}
                className={`kpm-fleet-row${on ? ' on' : ''}`}>
                <span className="who">
                    <b>{m.name}</b>
                    <small>{(!lead || has) && <span className="lg:hidden">{state} · </span>}{roleLine(m)}{pcs > 0 ? ` · + ${pcs.toLocaleString('id-ID')} pcs promo` : ''}</small>
                </span>
                <span className="c">{lead && <i className="kpm-fleet-tag">Leader</i>}{(!lead || has) && <span className={`kpm-fleet-st${has ? '' : ' off'}`}>{state}</span>}</span>
                <span className="c num">{num(loaded)}</span>
                <span className="c num">{num(sold)}{loaded > 0 && <span className="kpm-fleet-meter" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>}</span>
                <span className="c num">{num(left)}</span>
                <span className="ph">{loaded > 0 ? <><b>{left.toLocaleString('id-ID')}</b><small>sold {sold.toLocaleString('id-ID')} · {pct}%</small></> : pcs > 0 ? <small>+ {pcs.toLocaleString('id-ID')} pcs promo</small> : lead ? <i className="kpm-fleet-tag">Leader</i> : <small>van empty</small>}</span>
            </div>
        );
    };
    const handleWhatsAppShare = () => {
        if (!viewingReceipt) return;
        const isReturReceipt = viewingReceipt.type === 'RETUR' || viewingReceipt.paymentType === 'Retur/BS';
        const displayTotal = viewingReceipt.total || viewingReceipt.amountPaid || 0;

        let text = `*${appSettings?.companyName || "DISTRIBUTION AND SALES MANAGEMENT"}*\n*OFFICIAL RECEIPT (REPRINT)*\n------------------------\n`;
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
    
    /* SOLD TODAY, per person and per product, for the whole roster in one pass (vanBay soldBks: a pure buyback and an
       exchange line promised for later never left the van). The ledger's Sold column, the day strip and the picked
       person's sheet all read this one map, so the three can never disagree. */
    const soldByAgent = useMemo(() => {
        const by = {};
        for (const t of transactions) if (t.date === todayStr && ['SALE', 'RETUR'].includes(t.type || 'SALE')) (by[t.agentId] = by[t.agentId] || []).push(t);
        return Object.fromEntries(Object.entries(by).map(([id, list]) => [id, soldBks(list, inventory)]));
    }, [transactions, todayStr, inventory]);
    /* the picked person's last working day before today - what the sheet's Fill suggested reads */
    const lastDay = useMemo(() => lastDaySold(transactions, selectedAgent?.id, todayStr, inventory), [transactions, selectedAgent?.id, todayStr, inventory]);
    /* THE DAY, SAID ONCE: four numbers for the whole roster in view, in one strip under the title */
    const crewAll = agents.filter(m => !isLeader(m));
    const dayStrip = [
        ['Vans loaded', `${crewAll.filter(m => loadOf(m) > 0 || sumOf(soldByAgent[m.id]) > 0).length} of ${crewAll.length}`],
        ['In the vans now', `${Math.round(agents.reduce((sum, m) => sum + loadOf(m), 0)).toLocaleString('id-ID')} Bks`],
        ['Sold today', `${Math.round(agents.reduce((sum, m) => sum + sumOf(soldByAgent[m.id]), 0)).toLocaleString('id-ID')} Bks`],
        ['Override requests', allBypasses.filter(b => b.status === 'PENDING').length],
    ];

    if (isFetchingFleet) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-[var(--panel)] rounded-2xl border border-[var(--line-2)]">
                <div className="text-center">
                    <Activity size={48} className="text-[var(--accent-ink)] mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-[var(--ink)]">Loading the roster</h2>
                    <p className="text-[var(--ink-muted)] mt-2 text-xs">Reading your branch's team…</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={rootRef} style={fitH ? { '--fleet-h': `${fitH}px`, ...focusBox } : undefined} className="print-reset kpm-fleet h-full lg:h-[var(--fleet-h,100%)] w-full bg-[var(--panel)] rounded-2xl border border-[var(--line-2)] overflow-y-auto lg:overflow-hidden custom-scrollbar flex flex-col text-[var(--ink)] font-sans relative">
            
            {/* 🚀 UPGRADED FORENSIC RECEIPT MODAL 🚀 */}
            {viewingReceipt && (() => {
                const isReturReceipt = viewingReceipt.type === 'RETUR' || viewingReceipt.paymentType === 'Retur/BS';
                const displayTotal = viewingReceipt.total || viewingReceipt.amountPaid || 0;

                return (
                    <div className="print-modal-wrapper fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-4">
                        <div className="print-receipt format-thermal !bg-white !text-black w-full max-w-sm shadow-2xl relative flex flex-col font-mono text-sm border-t-8 !border-slate-800 animate-fade-in rounded-b-lg max-h-[90vh] overflow-y-auto custom-scrollbar transition-all">
                            <div className="p-6 pb-2 shrink-0">
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-black uppercase tracking-widest !text-black">{appSettings?.companyName || "DISTRIBUTION AND SALES MANAGEMENT"}</h2>
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

            {/* SURAT JALAN - his 2026-11-16 pick B, black and white ("i'll choose B black and white it is more netral").
                Portaled to the body: inside the shell's z-10 box the demo bars covered its top (Antigravity Task 8). The paper
                sizes by its own width (.kpm-sj in theme.css), so a phone shows the whole page with no side scroll. */}
            {viewingSuratJalan && selectedAgent && createPortal(
                <div className="print-modal-wrapper fixed inset-0 z-[500] overflow-y-auto bg-black/80 print:bg-transparent p-3 md:p-6 print:!p-0 print:!m-0 print:!block print:!bottom-auto print:!overflow-visible" onClick={(e) => { if (e.target === e.currentTarget) setViewingSuratJalan(false); }}>
                    <div className="mx-auto w-full max-w-[794px] flex flex-col gap-3 animate-fade-in print:!max-w-none">
                        <div className="no-print sticky top-0 z-[1] flex items-center gap-2 rounded-lg border border-[var(--line-2)] bg-[var(--raised)] p-2">
                            <b className="min-w-0 flex-1 truncate px-2 text-sm text-[var(--ink)]">Surat Jalan · {selectedAgent.name}</b>
                            <button type="button" onClick={() => setViewingSuratJalan(false)} className="kpm-press min-h-[44px] px-4 rounded-md border border-[var(--line-2)] text-sm font-semibold text-[var(--ink)]">Close</button>
                            <button type="button" onClick={() => window.print()} className="kpm-press min-h-[44px] px-4 rounded-md border border-[var(--accent-edge)] text-sm font-semibold text-[var(--ink)] flex items-center gap-2"><Printer size={15}/> Print</button>
                        </div>
                        {(() => {
                            const items = selectedAgent.activeCanvas || [];
                            const units = [...new Set(items.map(i => i.unit))];
                            const total = items.reduce((a, i) => a + (Number(i.qty) || 0), 0);
                            const now = new Date();
                            const branchAdmin = activeMotorists.find(m => m.userRole === 'AREA_ADMIN' && String(m.location || '').trim().toUpperCase() === String(selectedAgent.location || '').trim().toUpperCase());
                            return (
                                <div className="print-receipt format-a4 kpm-sj">
                                    <div className="pg">
                                        <div className="hd">
                                            <div className="co">
                                                {appSettings?.mascotImage && <img src={appSettings.mascotImage} alt="Company logo" />}
                                                <div>
                                                    <h1>{appSettings?.companyName || 'DISTRIBUTION AND SALES MANAGEMENT'}</h1>
                                                    <p>{appSettings?.companyAddress || 'Jl. Raya Magelang - Purworejo Km. 11, Palbapang, Mungkid, Magelang'}{appSettings?.companyPhone ? `\nTelp/WA: ${appSettings.companyPhone}` : ''}</p>
                                                </div>
                                            </div>
                                            <div className="doc"><h2>SURAT JALAN</h2><p>SJ-{getLocalDayKey().replace(/-/g, '')}-{selectedAgent.id.slice(-4)}</p></div>
                                        </div>
                                        <dl className="meta">
                                            <div><dt>Kepada</dt><dd>{selectedAgent.name}<small>{selectedAgent.role === 'Canvas' ? 'Sales Canvas' : 'Sales Motorist'}</small></dd></div>
                                            <div><dt>Kendaraan</dt><dd>{selectedAgent.vehicle || '—'}</dd></div>
                                            <div><dt>Dari gudang</dt><dd>{selectedAgentUsesBranch ? `Gudang ${selectedAgentLocation}` : 'Master Vault'}</dd></div>
                                            <div><dt>Tanggal</dt><dd>{now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}<small>{now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</small></dd></div>
                                        </dl>
                                        <table>
                                            <thead><tr><th className="n">No</th><th>Nama barang</th><th className="q">Jumlah</th><th className="u">Satuan</th></tr></thead>
                                            <tbody>
                                                {items.length === 0
                                                    ? <tr><td colSpan="4" className="empty">Tidak ada barang yang dimuat.</td></tr>
                                                    : items.map((item, idx) => <tr key={idx}><td className="n">{idx + 1}</td><td>{item.name}</td><td className="q">{(Number(item.qty) || 0).toLocaleString('id-ID')}</td><td className="u">{item.unit}</td></tr>)}
                                            </tbody>
                                            {items.length > 0 && <tfoot><tr><td /><td>Total · {items.length} produk</td><td className="q">{units.length === 1 ? total.toLocaleString('id-ID') : ''}</td><td className="u">{units.length === 1 ? units[0] : ''}</td></tr></tfoot>}
                                        </table>
                                        <p className="stmt">Dengan ditandatanganinya Surat Jalan ini, pihak penerima (Sales/Driver) menyatakan bahwa barang-barang yang tercantum di atas telah diterima dalam keadaan utuh, baik, dan sesuai dengan jumlah yang tertera. Mulai saat dokumen ini ditandatangani, seluruh barang menjadi tanggung jawab penuh pihak penerima atas kehilangan, kerusakan, atau penyalahgunaan selama masa operasional.</p>
                                        <div className="sign">
                                            <div><span>Admin Gudang</span><i /><b>{branchAdmin ? branchAdmin.name : (user.displayName || 'Admin')}</b></div>
                                            <div><span>Sales / Driver</span><i /><b>{selectedAgent.name}</b></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>,
                document.body
            )}

            {/* THE ROSTER LEDGER (2026-11-16) - his pick "Team list A Ledger table · Loading 1 Load sheet · PC Y Slide-over
                panel": one ruled line per person, the day's four numbers said ONCE in a strip, leaders on top. The game
                stage (3D cards, gold bar) lives on in tag game-edition-v1. */}
            <div className={`hide-on-print kpm-fleet-top shrink-0 bg-[var(--raised)] border-b border-[var(--line-2)]${selectedAgent ? ' open' : ''}`}>
                {/* phone: the title and its keys on one line, the four numbers under it; PC: one row - title, numbers, keys
                    (theme.css .kpm-fleet-top), so the ledger and the panel keep the height */}
                <div className="bar px-4 py-3 flex justify-between items-center gap-3">
                    <div className="ttl min-w-0">
                        <h2 className="text-base font-bold text-[var(--ink)] truncate">{isAreaAdmin ? `${branchPathLocation} Roster` : 'Fleet & Roster'}</h2>
                        <p className="text-xs text-[var(--ink-muted)] mt-0.5">{agents.length} {agents.length === 1 ? 'person' : 'people'} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                        {licensed && canEditFleet && (
                            <p data-guide="seats" className={`text-[10px] font-mono uppercase tracking-widest mt-0.5 ${seatsFull ? 'text-[var(--accent-ink)] font-bold' : 'text-[var(--ink-muted)]'}`}>
                                {seatsUsedText(seatDocs.length, seatLimit)}
                            </p>
                        )}
                    </div>
                    <div className="keys flex gap-2 shrink-0">
                    {canMakeOffers && (
                        <button onClick={() => setOffersOpen(v => !v)} aria-pressed={offersOpen} className="kpm-btn shrink-0 inline-flex items-center gap-1.5" aria-label={offersOpen ? 'Close team offers' : 'Team offers'}>
                            {offersOpen ? <X size={18}/> : <><Gift size={16}/> OFFERS</>}
                        </button>
                    )}
                    {canEditFleet && (
                        <button onClick={() => {
                            /* at the limit the control stays and says why (his 2026-10-27 rule: never a silent grey button) */
                            if (!isAddingAgent && seatsFull) return notify(seatsFullMsg(seatDocs.length, seatLimit));
                            setIsAddingAgent(!isAddingAgent); setEditingAgentId(null); setNewAgent(defaultAgentState); setIsReadOnlyMode(false); }} className="kpm-btn key shrink-0" aria-label={isAddingAgent && !isReadOnlyMode ? 'Close the form' : 'Add personnel'}>
                            {isAddingAgent && !isReadOnlyMode ? <X size={18}/> : <UserPlus size={18}/>}
                        </button>
                    )}
                    </div>
                </div>
                <div className="kpm-fleet-strip" aria-label="Today, the whole roster">
                    {dayStrip.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
                </div>
            </div>
                    {canMakeOffers && offersOpen && (() => {
                        const promo = promoItems.find(p => p.id === offerPromoId) || promoItems[0];
                        return (
                            <FrontPanel label="Team offers" onClose={() => setOffersOpen(false)}>
                            <div className="p-4 space-y-3 text-xs" data-guide="team-offers">
                                <p className="text-[var(--ink-muted)] leading-relaxed">{offersEverywhere
                                    ? 'For every area or one region. Salesmen see them under BUNDLES in the Sales Terminal.'
                                    : `Only ${offerRegion} salesmen see these, under BUNDLES in the Sales Terminal. The boss sees every offer and can remove any.`}</p>
                                {promoItems.length > 1 && (
                                    <div><label htmlFor="offerPromo" className="text-[var(--ink-muted)] block mb-1">PROMO GOODS GIVEN FREE</label>
                                        <select id="offerPromo" value={promo.id} onChange={(e) => setOfferPromoId(e.target.value)} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-veil-edge-2)] text-[var(--duke-ink-hi)] outline-none">
                                            {promoItems.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select></div>)}
                                {offersEverywhere
                                    ? <PromoBundleFields key={promo.id} promo={promo} bundles={[...(appSettings?.promoBundles || []), ...regionOffers]} products={inventory}
                                        regions={offerRegions} by={myProfile?.name || user?.displayName || ''} onSave={(list) => onSavePromoBundles(list)}
                                        promoItems={promoItems} canSetPrice={canSetBundlePrice(userRole)} canToggle={canSwitchBundle(userRole)} canSetRules={canSetBundleRules(userRole)} />
                                    : <PromoBundleFields key={promo.id} promo={promo} bundles={regionOffers.filter(b => normalizeRegion(b.region) === offerRegion)} products={inventory}
                                        lockRegion={offerRegion} by={myProfile?.name || user?.displayName || ''} onSave={(list) => onSavePromoBundles(list, offerRegion)}
                                        promoItems={promoItems} canSetPrice={canSetBundlePrice(userRole)} canToggle={canSwitchBundle(userRole)} canSetRules={canSetBundleRules(userRole)} />}
                            </div>
                            </FrontPanel>
                        );
                    })()}
                    {isAddingAgent && (
                        <FrontPanel label={isReadOnlyMode ? 'Profile Details' : editingAgentId ? 'Edit Profile' : 'Deploy New Personnel'} onClose={() => setIsAddingAgent(false)}>
                        <div className="p-4">

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
                                        <select disabled={isReadOnlyMode} value={normalizeRegion(newAgent.location || existingLocations[0])} onChange={e => setNewAgent({...newAgent, location: e.target.value})} className={`flex-1 border border-[var(--accent-edge)] rounded p-2.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--accent-edge)] uppercase ${isReadOnlyMode ? 'bg-[var(--raised)] opacity-60 cursor-not-allowed' : 'bg-[var(--inset)]'}`}>
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
                        </FrontPanel>
                    )}
            <div className={`hide-on-print kpm-fleet-layer${selectedAgent ? ' open' : ''}`}>
                <div className="kpm-fleet-list custom-scrollbar">
                {allBypasses.some(b => b.status === 'PENDING') && (
                    <div className="mx-4 mt-3 bg-[var(--raised)] rounded-lg border border-[var(--accent-edge)] overflow-hidden">
                        <div className="p-4 bg-[var(--inset)] border-b border-[var(--accent-edge)] flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={18} className="text-[var(--accent-ink)]"/>
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
                        (() => {
                            /* The data decides the shape, not a role list: one place in view (an area admin's own branch)
                               is one table; several places (the owner, HQ) get one chip each beside the search. A search
                               lists every match at once. */
                            const term = searchTerm.toLowerCase();
                            const shown = agents.filter(a => !term || a.name?.toLowerCase().includes(term) || a.email?.toLowerCase().includes(term) || a.userRole?.toLowerCase().includes(term) || a.location?.toLowerCase().includes(term) || a.province?.toLowerCase().includes(term));
                            const places = {};
                            shown.forEach(a => {
                                const { prov, loc, k } = placeOf(a);
                                (places[k] = places[k] || { prov, loc, people: [] }).people.push(a);
                            });
                            const keys = Object.keys(places).sort((x, y) => x.localeCompare(y));
                            /* FLEET_CAPTAIN stands with the leaders now - the old rank map forgot the tier (the UI side of the
                               Fleet Captain gap), so a regional admin sorted in among the salesmen */
                            const rank = { 'ADMIN': 4, 'AREA_ADMIN': 3, 'FLEET_CAPTAIN': 2, 'AGENT': 1 };
                            const byRank = (list) => [...list].sort((x, y) => (rank[y.userRole || 'AGENT'] || 0) - (rank[x.userRole || 'AGENT'] || 0) || String(x.name || '').localeCompare(String(y.name || '')));
                            const place = places[rosterPlace] ? rosterPlace : (keys.find(k => places[k].people.some(p => p.id === selectedAgent?.id)) || keys[0]);
                            const cast = byRank(term ? shown : (places[place]?.people || []));
                            const leaders = cast.filter(isLeader), crew = cast.filter(m => !isLeader(m));
                            return (
                                <>
                                    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                                        <label className="relative block flex-1 min-w-[12rem] max-w-md">
                                            <span className="sr-only">Search the roster</span>
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
                                            <input type="text" placeholder="Search name, role, area, email…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[var(--inset)] border border-[var(--line-2)] focus:border-[var(--accent-edge)] rounded-lg py-2 pl-9 pr-3 text-base lg:text-sm text-[var(--ink)] placeholder:text-[var(--ink-dim)] outline-none"/>
                                        </label>
                                        {!term && keys.length > 1 && (
                                            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Areas">
                                                {keys.map(k => (
                                                    <button key={k} type="button" role="tab" aria-selected={k === place} className={`kpm-fleet-chip${k === place ? ' on' : ''}`} onClick={() => setRosterPlace(k)}>
                                                        {places[k].loc} <small>{places[k].people.length}</small>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {term && shown.length === 0 ? <p className="text-sm text-[var(--ink-muted)] text-center py-8">Nobody matches “{searchTerm}”.</p> : (
                                        <div role="listbox" aria-label="People">
                                            <div className="kpm-fleet-head" aria-hidden="true"><span>Name</span><span>Status</span><span className="num">Loaded</span><span className="num">Sold today</span><span className="num">Left in van</span></div>
                                            {leaders.length > 0 && <div className="kpm-fleet-grp" role="presentation">LEADERS</div>}
                                            {leaders.map(m => rosterRow(m))}
                                            {crew.length > 0 && <div className="kpm-fleet-grp" role="presentation">SALESMEN · A–Z{term ? '' : ' · LEFT IN VAN'}</div>}
                                            {crew.map(m => rosterRow(m))}
                                        </div>
                                    )}
                                </>
                            );
                        })()
                    )}
                </div>

                {/* THE PERSON PANEL - slides over the list on the PC, ONCE per opening (keyed by the person, so a − + press
                    or a saved load never re-mounts it: that replay was the flicker); its own page on the phone. */}
                {/* THE FOCUS VEIL (his 2026-11-16 pick A: "blur all the screen and only name and the right panel is the only panel
                    that is not blurred"). PC only. Not keyed by the person: it fades in once per opening and stays still while
                    he switches names; it fades out with the panel. A press on it closes the panel. */}
                {selectedAgent && <div className={`kpm-fleet-veil${panelClosing ? ' closing' : ''}`} onClick={closePanel} aria-hidden="true" />}
                {selectedAgent && (() => {
                    const sel = selectedAgent;
                    const left = Math.round(loadOf(sel)), sold = Math.round(sumOf(soldByAgent[sel.id]));
                    const whName = selectedAgentUsesBranch ? `${selectedAgentLocation} warehouse` : 'Master Vault';
                    const dmg = damagedInVan(agentSales, inventory), titip = titipOf(transactions, customers, sel.id, inventory), bounties = bountyItems(sel);
                    const mine = allBypasses.filter(b => isAgentBypass(b, sel)), waiting = mine.filter(b => b.status === 'PENDING').length;
                    const n = (v) => Math.round(v).toLocaleString('id-ID');
                    const line = (key, title, sub, right) => (
                        <div key={key} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--line-2)]">
                            <span className="min-w-0"><b className="block text-sm font-semibold text-[var(--ink)] truncate">{title}</b>{sub && <small className="block text-xs text-[var(--ink-muted)]">{sub}</small>}</span>
                            <span className="shrink-0 flex items-center gap-2 text-sm font-semibold tabular-nums text-[var(--ink)]">{right}</span>
                        </div>
                    );
                    const none = (words) => <p className="px-4 py-8 text-sm text-[var(--ink-muted)]">{words}</p>;
                    const group = (words) => <div className="kpm-fleet-grp">{words}</div>;
                    const rp = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);
                    return (
                        <aside key={sel.id} className={`kpm-fleet-panel${panelClosing ? ' closing' : ''}`} onAnimationEnd={(e) => { if (e.animationName === 'kpmFleetOut') finishClose(); }} aria-label={`${sel.name}'s van`} data-mission="3" data-more={moreOpen || undefined}>
                            <div className="kpm-fleet-phead">
                                <div className="kpm-fleet-who min-w-0 flex-1">
                                    <button type="button" className="lg:hidden block text-xl leading-none text-[var(--ink-muted)] min-h-[44px] pr-2" aria-label="Back to the roster" onClick={closePanel}>‹</button>
                                    <h3 className="text-base font-bold text-[var(--ink)] truncate">{sel.name}</h3>
                                    <button type="button" className="kpm-fleet-more lg:hidden" aria-expanded={moreOpen} onClick={() => setMoreOpen(v => !v)}>More <span aria-hidden="true">▾</span></button>
                                    <p className="text-xs text-[var(--ink-muted)]">{roleLine(sel)} · loads from {selectedAgentUsesBranch ? `the ${whName}` : 'the Master Vault'}</p>
                                </div>
                                {/* Loaded / Sold / Left for this person - the same sums the ledger line shows, said once here */}
                                <div className="kpm-fleet-kpis">
                                    {[['Loaded', left + sold], ['Sold today', sold], ['Left in van', left]].map(([k, v]) => <div key={k}><small>{k}</small><b>{n(v)}</b></div>)}
                                </div>
                                <span className="hidden lg:block shrink-0"><button type="button" onClick={closePanel} aria-label={`Close ${sel.name}`} className="kpm-btn"><X size={18}/></button></span>
                            </div>
                            <span className="kpm-fleet-acts">
                                                    {(sel.activeCanvas || []).length > 0 && <button type="button" onClick={() => setViewingSuratJalan(true)}><Printer size={14}/> <span>Surat Jalan</span></button>}
                                                    <button type="button" onClick={(e) => handleViewClick(e, sel)}><User size={14}/> <span>Details</span></button>
                                                    {canEditFleet && (
                                                        <>
                                                            <button type="button" className={isDemoLogin(sel) ? 'demo-locked' : undefined} onClick={(e) => handleEditClick(e, sel)}><Pencil size={14}/> <span>Edit</span></button>
                                                            <button data-kpm-del data-label="Delete" type="button" className={isDemoLogin(sel) ? 'demo-locked' : undefined} onClick={(e) => handleDeleteAgent(e, sel)} aria-label={`Remove ${sel.name}`}><Trash2 size={15}/></button>
                                                        </>
                                                    )}
                                                    {/* T1/T2 only; never on your own card, never on the owner's (the landlord resets that one) */}
                                                    {isGlobalAdmin && sel.id !== agentProfileId && resolveTierOneId(sel.id) !== TIER_ONE_ID && (
                                                        <>
                                                            {hasClearance(sel.userRole, 'view_master_vault') && (
                                                                <>
                                                                    <button type="button" onClick={() => handleResetVaultTries(sel)} title="Set this person's wrong vault-password tries back to 0 and lift a lock"><RotateCcw size={14}/> <span>Reset vault tries</span></button>
                                                                    <button type="button" className={isDemoLogin(sel) ? 'demo-locked' : undefined} onClick={() => handleResetVaultPassword(sel)} title="Wipe this person's vault password - they make a new one themselves"><KeyRound size={14}/> <span>Reset vault password</span></button>
                                                                </>
                                                            )}
                                                            {sel.email && (
                                                                <button type="button" className={isDemoLogin(sel) ? 'demo-locked' : undefined} onClick={() => handleLockAccount(sel, !selLocked)} title={selLocked ? 'Let this email sign in again' : 'Sign this email out and keep it out (lost or hacked phone)'}>
                                                                    {selLocked ? <Unlock size={14}/> : <Lock size={14}/>} <span>{selLocked ? 'Unlock account' : 'Lock account'}</span>
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                            </span>
                            <LoadSheet
                                agent={sel}
                                warehouse={whName}
                                stock={displayInventory || []}
                                promo={displayPromo}
                                soldToday={soldByAgent[sel.id] || {}}
                                lastDay={lastDay}
                                team={agents.filter(a => a.id !== sel.id && placeOf(a).k === placeOf(sel).k)}
                                canEdit={canEditFleet}
                                onLoad={handleLoadCanvas}
                                onReturn={handleReturnToWarehouse}
                                onPreset={handleSavePreset}
                                onDirty={setBayLines}
                                onClear={handleClearCanvas}
                                tabs={[
                                    { id: 'damaged', label: `Damaged${dmg.length ? ` ${n(dmg.reduce((a, x) => a + x.bks, 0))}` : ''}`, body: (
                                        <>
                                            {group('IN THE VAN TODAY · WAITS FOR EOD')}
                                            {dmg.length ? dmg.map(x => line(x.id, x.name, x.why, `${n(x.bks)} Bks`)) : none(`No damaged goods came back to ${sel.name} today.`)}
                                            {whQuarantine.length > 0 && group(`QUARANTINE · ${whName.toUpperCase()}`)}
                                            {whQuarantine.map(p => line('q' + p.id, p.name, null, `${n(p.damagedStock)} Bks`))}
                                        </>) },
                                    { id: 'titip', label: `Consignment${titip.length ? ` ${titip.length}` : ''}`, body: titip.length
                                        ? titip.map(s => line(s.key, s.name, `${n(s.bks)} Bks still at the shop`, rp(s.rp)))
                                        : none(`No shop holds ${sel.name}'s consignment goods or owes for them.`) },
                                    ...(bounties.length ? [{ id: 'bounty', label: `Bounty ${bounties.length}`, body: bounties.map(x => line(x.key, x.label, x.date, rp(x.amount))) }] : []),
                                    { id: 'requests', label: `Requests${waiting ? ` ${waiting}` : ''}`, body: (
                                        <>
                                            {waiting > 0 && <p className="px-4 pt-3 text-xs text-[var(--ink-muted)]">Approve or reject a waiting request in the Override requests list above the roster.</p>}
                                            {mine.length ? mine.map(b => line(b.id, b.storeName, `${new Date(b.timestamp).toLocaleString('id-ID')} · ${b.distance} m away`, (
                                                <>
                                                    {b.photoData && <button type="button" className="text-xs underline text-[var(--ink-muted)]" onClick={() => window.open(b.photoData, '_blank')}>Photo</button>}
                                                    <span className={`kpm-fleet-tag${b.status === 'REJECTED' ? ' no' : ''}`}>{b.status === 'PENDING' ? 'Waiting' : b.status === 'APPROVED' ? 'Approved' : 'Rejected'}</span>
                                                </>))) : none(`${sel.name} has not asked for a geofence override.`)}
                                        </>) },
                                    { id: 'activity', label: `Activity ${agentSales.length}`, body: agentSales.length ? agentSales.map(tx => {
                                        const isRetur = tx.type === 'RETUR' || tx.paymentType === 'Retur/BS';
                                        const kind = isRetur ? 'Retur' : tx.paymentType === 'Tukar Ganti' ? 'Exchange' : tx.paymentType === 'IOU Fulfillment' ? 'Utang barang lunas' : (tx.paymentType || 'Cash');
                                        /* an approved override for this shop in the last 24 hours rode on this sale */
                                        const bypassed = mine.some(b => b.status === 'APPROVED' && (b.storeName || '').toLowerCase() === (tx.customerName || '').toLowerCase()
                                            && Date.now() - new Date(b.timestamp || b.createdAt?.seconds * 1000 || 0).getTime() < 24 * 60 * 60 * 1000);
                                        const total = tx.total || tx.amountPaid || 0;
                                        return line(tx.id, tx.customerName, `${tx.timestamp ? new Date(tx.timestamp.seconds * 1000).toLocaleTimeString('id-ID') : 'Today'} · ${kind} · ${tx.items?.length || 0} items${bypassed ? ' · 100 m override used' : ''}`, (
                                            <>
                                                <span className={isRetur ? 'text-[var(--danger-ink)]' : ''}>{isRetur && total > 0 ? '-' : ''}{rp(total)}</span>
                                                <button type="button" onClick={() => setViewingReceipt(tx)} className="kpm-btn" aria-label={`Receipt for ${tx.customerName}`} title="View receipt"><FileText size={16}/></button>
                                            </>));
                                    }) : none(`${sel.name} has no sale or return today.`) },
                                ]}
                            />
                        </aside>
                    );
                })()}
            </div>
        </div>
    );
}