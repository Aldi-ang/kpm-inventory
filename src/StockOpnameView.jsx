import React, { useState, useMemo, useEffect, useRef } from 'react';
import NixieCount from './components/NixieCount.jsx';
import { 
    ClipboardList, Search, Save, AlertTriangle, CheckCircle, 
    RefreshCcw, Box, EyeOff, Send, ShieldAlert, Check, X, 
    ChevronDown, ChevronUp, Clock, User, Database, ShieldCheck, 
    Camera, UploadCloud, Image as ImageIcon,
    FlaskConical, Undo2, BadgeDollarSign, History, Filter, BarChart, MapPin, Wrench, Tag,
    Minus, Plus, Gift, Package, ArrowRight
} from 'lucide-react';
import { collection, addDoc, getDoc, getDocs, updateDoc, doc, writeBatch, serverTimestamp, query, where, onSnapshot, increment, deleteField } from "firebase/firestore";
import { savePhotoAndGetReference, deletePhotoFromStorage, photoStamp, commitInChunks, formatRupiah, formatNumber, compressImageToBase64, tierPrice, getLocalDayKey, isPromo} from './utils/helpers';
import * as threshold from './utils/stockThreshold';
import { confirmAction, promptAction } from './components/ConfirmGate.jsx';
import { notify } from './components/Toast.jsx';
import { canSeeExpectedCount, canDecideOpname, canSellDamaged, opnameBoardScope, hasClearance } from './config/permissions';
/* Imported under a different name on purpose. The string 'MASTER' in this file is a SELECT VALUE
   that routes Firestore paths (branches/{facility}/inventory) — changing it would move documents.
   HQ_LABEL is only what the reader sees, and that is the part that had four spellings. */
import { MASTER as HQ_LABEL, isMasterVaultPlace, opnameThisWeek, opnameMark, countedDiffs, damagedAsGood, countBoxEmpty, quarantineLost, opnameMissing, opnameBoard, opnamePlaceOf, opnameDecisionPlan, opnameDraftKey, readOpnameDraft, saveOpnameDraft } from './utils/supply.js';
import { nextWeekStart, weekStart, WEEK_DAYS } from './utils/period.js';
import QuarantineBoard, { QuarantineBioIcon } from './components/QuarantineBoard.jsx';
import OpnameWorklist from './components/OpnameWorklist.jsx';
import { RollingNumber } from './components/BiohazardTheme.jsx';
import { IS_DEMO } from './config/firebase';
import { useWide } from './hooks/useWide.js';

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

   ✅ RUNNING AS THE DEFAULT ON ALDI'S WORD, 2026-08-23: *"for the 5 cause we can just add that as
   default for now"*. Still Claude's words, still his to rename — the `value` strings are what
   Firestore keeps and a saved record keeps whatever string it was written with, so a rename later
   splits one cause into two forever. Rename them here, not in the label.

   ⚠️ "Supplier Short" WAS REMOVED, and it was not a wording choice. Aldi, same day: *"there is no
   supplier between this restock, because goods is made by company own factory and we sell our
   product ourself"*. There is no third party in this chain, so the category could never be true.
   The internal version of it — HQ sent fewer than it said — is now caught at the receiving door by
   the arrival check in BranchWarehouseManager.jsx, before the goods are ever credited.

   It is replaced by "Cause unknown" on purpose. Without an honest bucket, a counter who cannot
   type and cannot find the right word picks the nearest wrong one, and the report then lies with
   confidence. A cause that admits it does not know is worth more than a confident wrong one.

   The shape he settled: this short list first, and a second level of rarer causes behind
   "Lainnya". **The regional admin never types their own reason** — his instruction, so that every
   record stays countable. The second level is not built yet. */
export const VARIANCE_REASONS = [
    { value: 'Miscount',          label: 'Miscount' },
    { value: 'Unrecorded Sale',   label: 'Unrecorded sale' },
    { value: 'Breakage / Damage', label: 'Breakage' },
    { value: 'Theft',             label: 'Theft' },
    { value: 'Cause Unknown',     label: 'Cause unknown' }
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

    /* A count that matches the system needs nothing, no matter how it got here — and anything
       under a whole pack counts as matching, because it is loose sticks the box cannot even
       express. See VARIANCE_TOLERANCE_BKS. Two counts, never added: 1010 good and 0 damaged
       against 1000 and 10 is two differences, not a match (supply.js countedDiffs). */
    if (withinTolerance(good - Number(target.stock || 0)) && withinTolerance(damaged - Number(target.damaged || 0))) return { needsRecount: false, confirmed: false, disagreement: false, passes: passes.length };

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
    /* only NEWLY found damage: packs already in Quarantine got their cause when they entered, and asking again would make the
       right count harder than typing them all as good */
    const total = Math.max(0, Number((entry && entry.damaged) || 0) - Number((entry && entry.expDamaged) || 0));
    if (total <= 0) return null;
    const sorted = damageSorted(entry);
    if (sorted !== total) {
        /* BOTH SENTENCES CARRY THE NUMBER. The over case used to be the bare phrase
           "kinds add up to more than the total", which is true and tells you nothing
           about how far over you are. Now it says by how much, in the same shape as
           the under case, because this string is what the row PRINTS — see the closed
           damage line below. */
        return sorted < total ? `${total - sorted} damaged not sorted yet`
                              : `${sorted - total} sorted more than the total`;
    }
    return null;
};

/* ONE OF THE TWO COUNTS ON HQ's ROW. Good and damaged each print what the book said, what was found and the difference (his
   2026-11-04: "they are different"); a total here is how 10 damaged packs read as a perfect count. */
const AuditFigures = ({ label, expected, found }) => {
    const diff = Number(found || 0) - Number(expected || 0);
    return (
        <div className="lg:flex lg:items-center lg:justify-end lg:gap-4">
            <div className="text-[11px] lg:text-[10px] text-[var(--ink-dim)] font-bold uppercase tracking-widest mb-1 lg:mb-0">{label}</div>
            <div className="kpm-fig3 grid grid-cols-3 gap-px bg-[var(--line)] rounded-lg overflow-hidden text-center lg:flex lg:items-center lg:gap-4 lg:bg-transparent lg:rounded-none lg:overflow-visible lg:text-left text-xs font-mono">
                <span className="text-[var(--ink-dim)]">
                    <span className="lg:hidden block text-[11px] text-[var(--ink-dim)] font-bold uppercase tracking-widest mb-1">Expected</span>
                    <span className="hidden lg:inline">SYS: </span><span className="text-sm font-black font-mono tabular-nums text-[var(--ink)]">{formatNumber(expected || 0)}</span>
                </span>
                <span className="hidden lg:inline text-[var(--ink-dim)]">→</span>
                <span className="text-[var(--ink-dim)] font-bold"><span className="lg:hidden block text-[11px] text-[var(--ink-dim)] font-bold uppercase tracking-widest mb-1">Found</span><span className="hidden lg:inline">FND: </span><span className="text-sm font-black font-mono tabular-nums text-[var(--ink)]">{formatNumber(found || 0)}</span></span>
                {/* the SAME rule the agent's row uses. */}
                <span className={`lg:text-right font-black ${withinTolerance(diff) ? 'text-[var(--accent-ink)]' : 'text-[var(--danger-ink)]'} `}>
                    <span className="lg:hidden block text-[11px] font-bold uppercase tracking-widest mb-1">Difference</span>
                    {/* the count card's verdict figure, his 2026-09-22 "make boss audit have the same
                        design like that one": the same plain figure as the two beside it, red outside
                        the tolerance, a shortfall drops in and a surplus rises, once (theme.css THE
                        VERDICT FIGURE). The nixie left this screen with it. */}
                    <span key={diff} className={`block text-sm font-black font-mono tabular-nums ${withinTolerance(diff) ? 'text-[var(--ink)]' : 'text-[var(--danger-ink)] ' + (diff < 0 ? 'kpm-verdict-down' : 'kpm-verdict-up')}`}>{diff > 0 ? '+' : diff < 0 ? '-' : ''}{formatNumber(Math.abs(diff))}</span>
                </span>
            </div>
        </div>
    );
};

const StockOpnameView =({ inventory = [], promoItems = [], transactions = [], db, storage, appId, user, userRole: liveRole, isAdmin, logAudit, triggerCapy, motorists = [], appSettings }) => {
    
    const safeInventory = inventory || [];
    const safeTransactions = transactions || [];
    const safeMotorists = motorists || [];

    /* The live role comes from App as `liveRole` (aliased, so it cannot collide with this
       local); the user object is only the fallback. The boss signs in as the RAW Firebase user,
       which carries no userRole — read from there alone he was 'AGENT' here: counting blind, and
       `isHighCommand` false, so the pending-audit and quarantine listeners never ran for the
       owner. Same hole as the sales terminal's camera lock (2026-09-13). The older comment that
       said "App does pass one" was wrong: the mount never had the prop. */
    const userRole = liveRole || user?.userRole || 'AGENT';
    /* Tier 3 and above count with the expected number beside them; below that they count blind
       and it only appears once they have typed. One switch per tier in the permission matrix. */
    const showExpectedWhileCounting = canSeeExpectedCount(userRole);
    // 🚀 FIX: This used to also treat 'COMPANY_OWNER', 'DEVELOPER', and 'HQ' role tags,
    // and the bare `isAdmin` PIN-unlock flag on its own, as "high command" — broader
    // than what Firestore's rules actually allow to read `pending_audits`/
    // `quarantine_logs` (owner or distributor-admin only, i.e. userRole === 'ADMIN').
    // Anyone who passed the old check but not this one would get a permission-denied
    // from the listeners below — same bug class as the procurement listener fix.
    const isHighCommand = userRole === 'ADMIN';
    /* THE WORKLIST'S GATES, his 2026-11-05 "tier 3 and above as default ... added into the matrix". Who counts (view_stock_opname) and who
       decides are two different powers, so a T3 with counting switched off still opens this screen, on the review. */
    const canDecide = canDecideOpname(userRole);
    const boardScope = opnameBoardScope(userRole);
    const canSeeBoard = !!boardScope;
    const canCount = isHighCommand || hasClearance(userRole, 'view_stock_opname');
    /* Quarantine for a Sell Again holder (his "only Tier 3 and up set that price", rules CHANGE 24): the crates and the Sell Again
       button only. Sample, RTV, Penalty, Repair and the Liquidation History stay the owner's (the rules keep quarantine_logs reads his). */
    const canSell = isHighCommand || canSellDamaged(userRole);

    // 🚀 DYNAMIC UPGRADE: Automatically adapts to any custom Tier 4/Branch Admin rank!
    /* Posted at the Master Vault there is no branch shelf: they count the Master Vault. No place on the login stays as it
       was: no list, and never the Master Vault by accident. */
    const isAreaAdmin = !isHighCommand && (!user?.location || !isMasterVaultPlace(user.location));

    /* ONE COUNT A WEEK PER WAREHOUSE, submitted by the team leader (supply.js opnameMark). His 2026-11-04: T3 and above pick "one
       specific day for the stock opname so that the interval of the stock opname is the same each time" (Settings, Company 09):
       the week starts that day and the count opens only that day. No day picked: Monday to Sunday, any day.
       ponytail: checked on the phone, so two leaders pressing in the same second both land; a fixed audit id and a rule if it ever matters. */
    const countDay = appSettings?.opnameDay ?? null;
    const weekCount = useMemo(() => opnameThisWeek(safeMotorists, user?.location, new Date(), countDay), [safeMotorists, user?.location, countDay]);
    const weekDone = !isHighCommand && !IS_DEMO && weekCount.done;
    const notCountDay = !isHighCommand && !IS_DEMO && !weekDone && !weekCount.sentBack && countDay !== null && new Date().getDay() !== countDay;
    /* A REJECTED PRODUCT REOPENS ONLY ITSELF (his "accept and reject each of the item"): the week stays closed for the rest, and the leader's
       screen lists just those products. ponytail: one leader per warehouse, as the week rule already assumes. */
    const reopened = (weekDone && weekDone.reopened) || {};
    const recounting = Object.keys(reopened).length > 0;
    const countClosed = (weekDone && !recounting) || notCountDay;
    const countPlace = isAreaAdmin ? user?.location : HQ_LABEL;
    const dayWord = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    
    const masterId = user?.bossUid || user?.uid || user?.id;

    const [viewMode, setViewMode] = useState(isHighCommand ? 'monitor' : canDecide ? 'review' : 'count'); 
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

    /* PROMO ITEMS ARE COUNTED BY THE PIECE (stage 2): the count card is unit-free (Good / Damaged, whole numbers), so a
       promo item joins the list as it is - the Master Vault's from `promoItems`, a branch's own promo rows (kind 'promo')
       straight off its shelf. Every Bks-only view below (the monitor, the quarantine crates) still skips them. */
    const activeInventory = isAreaAdmin ? (branchInventory || []) : [...safeInventory, ...promoItems];

    const [search, setSearch] = useState("");
    /* the count: which product is in hand, which rows the list shows, and whether the hand sits beside the list (PC) or opens in a bottom sheet (phone) - view only */
    const [countPick, setCountPick] = useState(null);
    const [countShow, setCountShow] = useState('all');
    const [countSheetOpen, setCountSheetOpen] = useState(false);
    const [closingCountSheet, setClosingCountSheet] = useState(false);
    const wideScreen = useWide();
    const [counts, setCounts] = useState({}); 
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [pendingAudits, setPendingAudits] = useState([]);
    const [auditHistory, setAuditHistory] = useState([]); 
    const [allAudits, setAllAudits] = useState([]);
    const [auditsDenied, setAuditsDenied] = useState(false);
    const [boardPick, setBoardPick] = useState(null);
    const [boardShelf, setBoardShelf] = useState([]);
    const [expandedAudit, setExpandedAudit] = useState(null);
    const [isProcessingAudit, setIsProcessingAudit] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);

    /* every warehouse, always: the Quarantine Vault's crates (his option B, 2026-09-30) each show their own count, so the
       listener loads them all and the open crate filters on the screen */
    const [quarantineFacility] = useState('ALL');
    const [quarantineInventory, setQuarantineInventory] = useState([]);
    const [quarantineLogs, setQuarantineLogs] = useState([]);
    const [resolutionModal, setResolutionModal] = useState(null);
    const [closingModal, setClosingModal] = useState(false);
    const [leavingId, setLeavingId] = useState(null);
    const [crateFac, setCrateFac] = useState(null);

    const isMotionReduced = () => typeof document !== 'undefined' && (document.documentElement.classList.contains('lite-mode') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));

    const closeResolutionModal = () => {
        if (!resolutionModal) return;
        if (isMotionReduced()) {
            setClosingModal(false);
            setResolutionModal(null);
            return;
        }
        setClosingModal(true);
        setTimeout(() => {
            setClosingModal(false);
            setResolutionModal(null);
        }, 160);
    };

    const closeCountSheet = () => {
        if (!countSheetOpen) return;
        if (isMotionReduced()) {
            setClosingCountSheet(false);
            setCountSheetOpen(false);
            return;
        }
        setClosingCountSheet(true);
        setTimeout(() => {
            setClosingCountSheet(false);
            setCountSheetOpen(false);
        }, 165);
    };

    useEffect(() => {
        if (!resolutionModal && !countSheetOpen) return;
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            if (resolutionModal && !isProcessingAudit) closeResolutionModal();
            else if (countSheetOpen) closeCountSheet();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [resolutionModal, isProcessingAudit, countSheetOpen]);

    const uniqueBranches = useMemo(() => {
        const branches = new Set();
        safeMotorists.forEach(m => {
            if (m && !isMasterVaultPlace(m.location) && m.location !== 'UNASSIGNED') branches.add(m.location);
        });
        return Array.from(branches);
    }, [safeMotorists]);
    /* one crate per warehouse; until one is pressed, the first with damaged boxes is open (HQ when none has any) */
    const vaultFacilities = useMemo(() => [{ key: 'MASTER', name: HQ_LABEL }, ...uniqueBranches.map(b => ({ key: b, name: b }))], [uniqueBranches]);
    const openFac = crateFac || (vaultFacilities.find(f => quarantineInventory.some(i => i.facility === f.key)) || vaultFacilities[0]).key;
    const shownQuarantine = quarantineInventory.filter(i => i.facility === openFac);

    useEffect(() => {
        if (!boardScope || !db || !appId || !masterId || (boardScope === 'own' && !user?.location)) return;
        const auditsRef = collection(db, `artifacts/${appId}/users/${masterId}/pending_audits`);
        /* T1-T3 read every warehouse; a T4 may only ask for their own, and rules CHANGE 23 refuses the question otherwise */
        return onSnapshot(boardScope === 'all' ? auditsRef : query(auditsRef, where('branchLocation', '==', user.location)), (snap) => {
            const audits = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAuditsDenied(false);
            setAllAudits(audits);
            setPendingAudits(audits.filter(a => a.status === 'PENDING_HQ_APPROVAL').sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
            setAuditHistory(audits.filter(a => a.status !== 'PENDING_HQ_APPROVAL').sort((a, b) => (b.resolvedAt?.seconds || 0) - (a.resolvedAt?.seconds || 0)));
        }, (err) => { console.warn("Pending audits listener:", err.code); if (err.code === 'permission-denied') setAuditsDenied(true); });
    }, [boardScope, user?.location, db, appId, masterId]);

    useEffect(() => {
        if (!isHighCommand || !db || !appId || !masterId) return;

        const logsRef = collection(db, `artifacts/${appId}/users/${masterId}/quarantine_logs`);
        const unsubLogs = onSnapshot(logsRef, (snap) => {
            const fetchedLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedLogs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setQuarantineLogs(fetchedLogs);
        }, (err) => console.warn("Quarantine logs listener:", err.code));

        return () => unsubLogs();
    }, [isHighCommand, db, appId, masterId]);

    /* THE WORKLIST'S DATA. Every warehouse's tab comes from its counts; only the open one also needs its shelf, for "not counted". */
    const boardFrom = useMemo(() => weekStart(new Date(), countDay).getTime() / 1000, [countDay]);
    const weekLabel = useMemo(() => {
        const a = weekStart(new Date(), countDay), b = new Date(a); b.setDate(b.getDate() + 6);
        const mon = (d) => d.toLocaleDateString('en-GB', { month: 'short' });
        return `Week of ${a.getDate()}${mon(a) === mon(b) ? '' : ` ${mon(a)}`}-${b.getDate()} ${mon(b)} ${b.getFullYear()}`;
    }, [countDay]);
    const boardPlaces = useMemo(() => {
        if (boardScope !== 'all') return [isMasterVaultPlace(user?.location) ? { key: 'MASTER', name: HQ_LABEL } : { key: user?.location, name: user?.location }];
        const known = new Set(vaultFacilities.map(f => f.key));
        const extra = [...new Set(allAudits.map(opnamePlaceOf))].filter(p => p && !known.has(p)).map(p => ({ key: p, name: p }));
        return [...vaultFacilities, ...extra];
    }, [boardScope, user?.location, vaultFacilities, allAudits]);
    const openPlace = useMemo(() => {
        if (boardPlaces.some(p => p.key === boardPick)) return boardPick;
        const busy = boardPlaces.find(p => opnameBoard(allAudits, p.key, { from: boardFrom }).rows.some(r => r.status === 'wait'));
        return (busy || boardPlaces[0])?.key ?? null;
    }, [boardPlaces, boardPick, allAudits, boardFrom]);
    useEffect(() => {
        if (viewMode !== 'review' || !openPlace || openPlace === 'MASTER' || !db || !appId || !masterId) { setBoardShelf([]); return; }
        return onSnapshot(collection(db, `artifacts/${appId}/users/${masterId}/branches/${openPlace}/inventory`), (snap) => {
            setBoardShelf(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => console.warn("Worklist shelf listener:", err.code));
    }, [viewMode, openPlace, db, appId, masterId]);
    const boards = useMemo(() => {
        const shelf = openPlace === 'MASTER' ? [...safeInventory, ...promoItems] : boardShelf;
        const lookup = [...safeInventory, ...promoItems, ...boardShelf];
        /* the same price the Quarantine's loss uses, so both screens agree on one number */
        const priceOf = (id) => { const p = lookup.find(i => i?.id === id); return Number(p?.priceDistributor || p?.hpp || p?.costPrice || 0); };
        return boardPlaces.map(p => {
            const board = opnameBoard(allAudits, p.key, { from: boardFrom, shelf: p.key === openPlace ? shelf : [], priceOf });
            const at = board.newest?.timestamp?.seconds ? new Date(board.newest.timestamp.seconds * 1000).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', '') : 'just now';
            return { ...p, board: { ...board, leader: board.newest?.agentName || 'the team leader', who: board.newest ? `Counted by ${board.newest.agentName} · ${at}` : '' } };
        });
    }, [boardPlaces, allAudits, boardFrom, openPlace, boardShelf, safeInventory, promoItems]);

    const [monitorInventory, setMonitorInventory] = useState([]);
    useEffect(() => {
        if (viewMode !== 'monitor' || monitorFacility === 'MASTER' || !db || !appId || !masterId) return;
        const branchRef = collection(db, `artifacts/${appId}/users/${masterId}/branches/${monitorFacility}/inventory`);
        const unsub = onSnapshot(branchRef, (snap) => {
            setMonitorInventory(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !isPromo(r)));
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
                    const bData = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !isPromo(r));
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
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !isPromo(r));
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

    /* A confirmed or three-way count must name one of the five causes before Submit accepts it;
       once selected it can switch causes, never go back to empty. */
    const selectVarianceReason = (id, value) => {
        if (!value || !String(value).trim()) return;
        setCounts(prev => {
            const entry = prev[id];
            if (!entry) return prev;
            return { ...prev, [id]: { ...entry, varianceReason: value } };
        });
    };

    /* BLIND STAYS BLIND. His 2026-11-05: "we have blind count for tier 4 and below right"; the matrix key view_expected_count decides.
       Microsoft: "The system never shows the expected quantity to count. This design prevents intentional miscounts." So nothing on a
       blind row is judged while typing: a live "count again" would let someone type until it goes away. Rows are checked when Submit is
       pressed, a flagged row stays locked until Clear and count again, and that banks the attempt, so a guess costs one of three and HQ
       sees them all. ponytail: the damage-kind count still tells how many are new, so it gives away the Quarantine number; a pack there
       is on the shelf anyway. */
    const [checkedRows, setCheckedRows] = useState({});
    const clearCounts = () => { setCounts({}); setCheckedRows({}); };

    /* THE NUMBERS STAY ON THE PHONE UNTIL SUBMIT (supply.js). Since 74388e3 a leader cannot send part of a count, and a phone drops the page on a camera switch. The first run for
       a key reads and returns, so an empty screen can never overwrite a saved draft; every later change saves, and an empty count (Reset, Submit) removes it. */
    const draftKey = IS_DEMO || !masterId ? null : opnameDraftKey(masterId, countPlace, weekStart(new Date(), countDay));
    const draftRead = useRef(null);
    useEffect(() => {
        if (!draftKey) return;
        if (draftRead.current?.key === draftKey) { saveOpnameDraft(draftKey, counts, checkedRows); return; }
        /* Another warehouse on this screen (a test account put on or taken off, a leader moved): one warehouse's numbers and frozen targets are never another's. A moved WEEK
           keeps them: the count day loading late, or a T3 changing it mid-count, must not wipe a count. */
        const moved = draftRead.current && draftRead.current.place !== countPlace;
        draftRead.current = { key: draftKey, place: countPlace };
        const saved = readOpnameDraft(draftKey);
        if (moved) { clearCounts(); }
        if (!saved) return;
        setCounts(saved.counts);
        setCheckedRows(saved.checkedRows || {});
        const n = Object.keys(saved.counts).length;
        /* next tick: opened straight on this screen, this effect runs before the toast host has mounted, and the message would be lost */
        if (!countClosed) setTimeout(() => notify(`Your count came back: ${n} product${n === 1 ? '' : 's'}, as you left ${n === 1 ? 'it' : 'them'}. Nothing is sent until you press Submit.${saved.noPhotos ? ' Photos did not fit on this phone: take them again.' : ''}`), 0);
    }, [draftKey, counts, checkedRows]);
    /* the week's count went in (from another phone, or Submit lost its reply): the numbers here belong to no count now.
       ponytail: a draft from before a whole count went in can still reach a recount if this phone never opened in between; the commit sends only the reopened rows. */
    useEffect(() => { if (weekDone && !recounting) clearCounts(); }, [weekDone, recounting]);

    /* Bank the attempt and blank the boxes. Everything about the row's TARGET is kept —
       `expStock` / `expDamaged` must survive, or the recount re-opens the moving-target bug —
       and so are the damage kinds, because re-sorting damage he already classified is busywork.
       What is deliberately NOT kept is anything that would show him what he typed last time. */
    const startRecount = (id) => {
        setCheckedRows(prev => { const next = { ...prev }; delete next[id]; return next; });
        setCounts(prev => {
            const entry = prev[id];
            if (!entry) return prev;
            const passes = [...(entry.passes || []), { good: Number(entry.good || 0), damaged: Number(entry.damaged || 0) }];
            return { ...prev, [id]: { ...entry, good: '', damaged: '', passes } };
        });
    };

    const setDamageKindQty = (id, reason, value) => {
        setCounts(prev => {
            const next = { ...prev };
            if (!next[id]) next[id] = { good: '', damaged: '', photo: null };
            const kinds = { ...(next[id].kinds || {}) };
            const curQty = Number(kinds[reason] || 0);
            const raw = typeof value === 'function' ? value(curQty) : value;
            const qty = Math.max(0, parseInt(raw) || 0);
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
            const path = `artifacts/${appId}/users/${masterId}/photos/stockopname_${id}_${photoStamp()}.jpg`;
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

    /* EACH COUNT AGAINST ITS OWN FIGURE, both from the frozen snapshot. Adding them is how 10 damaged
       packs typed as good read as a perfect count (supply.js countedDiffs). */
    const getVariance = (item) => {
        const entry = item?.id && counts[item.id];
        if (!entry) return { goodDiff: 0, damagedDiff: 0 };
        const target = expectedOf(item, entry);
        return { goodDiff: Number(entry.good || 0) - target.stock, damagedDiff: Number(entry.damaged || 0) - target.damaged };
    };

    const stillUncounted = !isHighCommand && !IS_DEMO && !recounting ? opnameMissing(activeInventory, counts) : [];
    /* a counted product that still has a box the app needs (handleCommit's own countBoxEmpty test): the demo guide's count
       beat waits for none (demoMission.js GUIDE[8]) - the 2026-11-14 phone walk was sent to Submit after one box */
    const halfRows = activeInventory.some((i) => i && counts[i.id] !== undefined && (!recounting || reopened[i.id]) && countBoxEmpty(counts[i.id]));
    const handleCommit = async () => {
        if (weekDone && !recounting) return notify(`Cannot submit: this week's count for ${countPlace} is already in (${weekDone.by}, ${dayWord(weekDone.at)}).`);
        if (notCountDay) return notify(`Cannot submit: Stock Opname day is ${WEEK_DAYS[countDay]}.`);
        const countedItems = activeInventory.filter(i => i && i.id && counts[i.id] !== undefined && (!recounting || reopened[i.id]));
        if (countedItems.length === 0) return notify("No items counted! Please enter at least one physical count.");

        if (stillUncounted.length) return notify(`Cannot submit: every product with stock must be counted. Still not counted:\n\n${stillUncounted.map(i => i.name || i.id).join('\n')}\n\nType 0 if there are none on the shelf.`);
        const emptyBox = countedItems.filter(i => countBoxEmpty(counts[i.id])).map(i => i.name || i.id);
        if (emptyBox.length) return notify(`Cannot submit: type a number in both boxes, 0 if there are none:\n\n${emptyBox.join('\n')}`);

        if (!showExpectedWhileCounting) setCheckedRows(prev => ({ ...prev, ...Object.fromEntries(countedItems.filter(i => {
            const state = recountState(counts[i.id], expectedOf(i, counts[i.id]));
            return damageBlocked(counts[i.id]) || state.needsRecount || varianceReasonMissing(counts[i.id], state);
        }).map(i => [i.id, true])) }));

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

        if (!await confirmAction(`Submit Stock Opname for ${countedItems.length} of ${activeInventory.length} items to HQ for verification?${isHighCommand || IS_DEMO || recounting ? '' : `\n\nThis is the one count for ${countPlace} this week.`}`)) return;

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
                ...(recounting ? { recountOf: weekDone.auditId } : {}),
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
                        /* packs gone from the building, for the leak check and the Bks Missing line. No verdict reads it. */
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

            const auditId = `AUDIT_${Date.now()}`;
            const auditRef = doc(db, `artifacts/${appId}/users/${masterId}/pending_audits`, auditId);
            const batch = writeBatch(db);
            batch.set(auditRef, auditPayload);
            if (!isHighCommand && user.agentId) batch.update(doc(db, `artifacts/${appId}/users/${masterId}/motorists`, user.agentId), { lastOpname: recounting
                ? { ...weekDone, reopened: Object.fromEntries(Object.entries(reopened).filter(([id]) => !counts[id])) }
                : opnameMark({ location: user.location, by: auditPayload.agentName, auditId }) });
            await batch.commit();
            /* the demo's mission line ticks on the SAVED count (DemoMission.jsx) */
            if (IS_DEMO) window.dispatchEvent(new CustomEvent('kpm-mission', { detail: { step: 8, items: countedItems.length } }));

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

            clearCounts();
            notify("✅ Physical Count submitted to HQ successfully!");
        } catch (error) { notify("Failed to submit audit payload to HQ."); } 
        finally { setIsSubmitting(false); }
    };

    const shelfWrite = (audit, productId, data) => {
        const isBranch = audit.auditType === 'BRANCH_WAREHOUSE';
        const ref = doc(db, isBranch ? `artifacts/${appId}/users/${masterId}/branches/${audit.branchLocation}/inventory` : `artifacts/${appId}/users/${masterId}/products`, productId);
        return isBranch ? { type: 'set', ref, data, options: { merge: true } } : { type: 'update', ref, data };
    };

    /* PUT BACK - his 2026-11-04 count: 10 damaged packs typed as good, approved under the old rule, and they became good stock. The
       approved count kept the numbers, so this reverses exactly that, once, and any real shortage on the row stays corrected. */
    const handlePutBack = async (audit) => {
        const rows = audit.items.map(i => ({ item: i, ...quarantineLost(i) })).filter(r => r.back > 0);
        if (!rows.length) return;
        if (!await confirmAction(`PUT BACK what this approved count took from Quarantine at ${audit.branchLocation}:\n\n${rows.map(r => `${r.item.name}: Quarantine +${r.back}${r.goodOut ? `, good stock -${r.goodOut}` : ''}`).join('\n')}\n\nProceed?`)) return;
        setIsProcessingAudit(true);
        try {
            const operations = rows.map(r => shelfWrite(audit, r.item.productId, { damagedStock: increment(r.back), ...(r.goodOut ? { stock: increment(-r.goodOut) } : {}) }));
            operations.push({ type: 'update', ref: doc(db, `artifacts/${appId}/users/${masterId}/pending_audits`, audit.id), data: { putBack: true, putBackAt: serverTimestamp(), putBackBy: user.email?.split('@')[0] } });
            await commitInChunks(db, writeBatch, operations);
            if (logAudit) await logAudit("STOCK_OPNAME_PUT_BACK", `Put back Quarantine taken by the approved count for ${audit.branchLocation}: ${rows.map(r => `${r.item.name} +${r.back}`).join(', ')}.`);
            if (triggerCapy) triggerCapy('Quarantine is back to what it was.');
        } catch (error) { notify("Failed to put back Quarantine - check the connection and press it again."); }
        finally { setIsProcessingAudit(false); }
    };

    /* ONE PRESS, ONE PRODUCT. His 2026-11-05: "i want our system to be able to accept and reject each of the item instead of all at once".
       Accepting applies only that product's two differences, with increment() so a sale landing meanwhile is kept; the decision and the stock
       land in one batch. Undo is that batch reversed: increments are exact whatever moved in between. Returns the undo, true when it cannot be
       undone (a count with no snapshot), or null when nothing was saved. */
    const decideProducts = async (place, rows, status, reason = '') => {
        if (!canDecide) return null;
        if (navigator.onLine === false) { notify('Failed to save: you are offline. A decision changes stock, so press it again when you are back online.'); return null; }
        const mixedUp = status === 'ACCEPTED' ? rows.filter(r => damagedAsGood(r.item)).map(r => r.name) : [];
        if (mixedUp.length) { notify(`Cannot accept: damaged packs look counted as good on ${mixedUp.join(', ')}. Reject it so it is counted again. If those packs really are good again, use Repair in Quarantine first.`); return null; }
        const by = user.email?.split('@')[0] || user.displayName || 'HQ';
        const plan = opnameDecisionPlan(rows, status, reason, by);
        const auditRef = (id) => doc(db, `artifacts/${appId}/users/${masterId}/pending_audits`, id);
        const cardRef = (id) => doc(db, `artifacts/${appId}/users/${masterId}/motorists`, id);
        const saveFailed = (e) => notify(e?.code === 'permission-denied' ? 'Failed to save: the new Firestore rule is not published yet. Ask the owner to publish it.' : 'Failed to save the decision. Check the connection and press it again.');
        const ping = (agentId, title, message) => { if (agentId && agentId !== 'VAULT') addDoc(collection(db, `artifacts/${appId}/users/${masterId}/notifications`), { title, message, type: 'AUDIT_RECOUNT', read: false, isRead: false, timestamp: serverTimestamp(), agentId, linkToTab: 'stock_opname' }).catch(() => {}); };
        const log = (what) => { if (logAudit) Promise.resolve(logAudit(what, `${rows.map(r => r.name).join(', ')} at ${place.name}${reason ? `: ${reason}` : ''}.`)).catch(() => {}); };
        try {
            /* someone else may have decided it since this screen last heard */
            for (const { audit, set } of plan.audits) {
                const fresh = await getDoc(auditRef(audit.id));
                const taken = fresh.exists() ? Object.keys(set).find(id => fresh.data().decisions?.[id]) : null;
                if (taken) { notify(`Failed to save: ${fresh.data().decisions[taken].by} already decided this product. The list has been updated.`); return null; }
            }
            const ops = plan.stock.map(s => shelfWrite(s.audit, s.productId, s.overwrite !== undefined ? { stock: s.overwrite } : { stock: increment(s.good), damagedStock: increment(s.damaged) }));
            plan.audits.forEach(({ audit, set, close }) => {
                const data = Object.fromEntries(Object.entries(set).map(([id, d]) => [`decisions.${id}`, { ...d, at: serverTimestamp() }]));
                if (close) Object.assign(data, { status: close, resolvedAt: serverTimestamp(), resolvedBy: by, noPutBack: true });
                ops.push({ type: 'update', ref: auditRef(audit.id), data });
            });
            /* a rejected product goes back to the leader's own screen: only that product reopens */
            const cards = new Map();
            if (status === 'REJECTED') rows.forEach(r => {
                const c = safeMotorists.find(m => m?.id === r.audit.agentId);
                if (!c?.lastOpname) return;
                const was = cards.get(c.id)?.now || c.lastOpname;
                cards.set(c.id, { before: c.lastOpname, now: { ...was, reopened: { ...(was.reopened || {}), [r.id]: { name: r.name, reason } } } });
            });
            cards.forEach((c, id) => ops.push({ type: 'update', ref: cardRef(id), data: { lastOpname: c.now } }));
            await commitInChunks(db, writeBatch, ops);
            log(status === 'ACCEPTED' ? 'STOCK_OPNAME_PRODUCT_ACCEPTED' : 'STOCK_OPNAME_PRODUCT_REJECTED');
            if (status === 'REJECTED') rows.forEach(r => ping(r.audit.agentId, '📋 Recount asked', `${by} sent ${r.name} back: ${reason}`));
            if (!plan.canUndo) return true;
            return async () => {
                try {
                    const back = plan.stock.map(s => shelfWrite(s.audit, s.productId, { stock: increment(-s.good), damagedStock: increment(-s.damaged) }));
                    plan.audits.forEach(({ audit, set, close }) => back.push({ type: 'update', ref: auditRef(audit.id), data: {
                        ...Object.fromEntries(Object.keys(set).map(id => [`decisions.${id}`, deleteField()])),
                        ...(close ? { status: 'PENDING_HQ_APPROVAL', resolvedAt: deleteField(), resolvedBy: deleteField(), noPutBack: deleteField() } : {})
                    } }));
                    cards.forEach((c, id) => back.push({ type: 'update', ref: cardRef(id), data: { lastOpname: c.before } }));
                    await commitInChunks(db, writeBatch, back);
                    log('STOCK_OPNAME_DECISION_UNDONE');
                    if (status === 'REJECTED') rows.forEach(r => ping(r.audit.agentId, '📋 Recount cancelled', `${by} took back the recount of ${r.name}.`));
                    return true;
                } catch (e) { saveFailed(e); return false; }
            };
        } catch (e) { saveFailed(e); return null; }
    };

    const executeResolution = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const qtyToResolve = Number(formData.get('qty'));
        const reason = formData.get('reason') || '';
        const rtvRefStr = formData.get('rtvRef') || '';
        const agentId = formData.get('agentId') || '';
        const toWarehouse = formData.get('toWarehouse') || '';
        const fromFac = resolutionModal.item.facility || quarantineFacility;

        if (qtyToResolve <= 0 || qtyToResolve > resolutionModal.item.damagedStock) return notify("Invalid quantity.");
        if (resolutionModal.method === 'SAMPLING' && fromFac === 'MASTER' && !toWarehouse) return notify("Pick the regional warehouse that receives these packs as promo goods.");
        if (resolutionModal.method === 'REPAIR' && fromFac !== 'MASTER') return notify("Repair is for the Master Vault's damaged goods only.");
        /* SELL AGAIN: the pack's own prices, or one cheaper price for every shop (his 2026-11-03 "full OR a cheaper price") */
        const sellSrc = safeInventory.find(p => p.id === resolutionModal.item.id) || resolutionModal.item;
        const fullPrice = tierPrice(sellSrc, 'Retail');
        const cheapPrice = Number(formData.get('price'));
        if (resolutionModal.method === 'SELL' && !(fullPrice > 0))   // or the lot would go on the shelf at Rp 0
            return notify(`Cannot sell ${resolutionModal.item.name} again: it has no Retail price yet. Set it in the Master Vault first.`);
        if (resolutionModal.method === 'SELL' && resolutionModal.cheap && !(cheapPrice > 0 && cheapPrice < fullPrice))
            return notify(`Cannot use that price: a cheaper price must be more than 0 and less than the full price, ${formatRupiah(fullPrice)}.`);
        const confirmLabel = ({
            REPAIR: 'Repair',
            SAMPLING: 'Sample goods',
            RTV: 'Return to factory',
            PENALTY: 'Charge staff',
        }[resolutionModal.method]) || resolutionModal.method;
        if (!await confirmAction(resolutionModal.method === 'SELL'
            ? `Put ${qtyToResolve} Bks of ${resolutionModal.item.name} back on sale as "${resolutionModal.item.name} · RUSAK" at ${formatRupiah(resolutionModal.cheap ? cheapPrice : fullPrice)} per Bks?`
            : `${confirmLabel} for ${qtyToResolve} Bks of ${resolutionModal.item.name}?`)) return;

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
            const totalValue = ['REPAIR', 'SELL'].includes(resolutionModal.method) ? 0 : qtyToResolve * hpp;   // a repaired or re-sold pack is not lost

            const targetFacility = fromFac;
            const itemRef = targetFacility === 'MASTER'
                ? doc(db, `artifacts/${appId}/users/${masterId}/products`, resolutionModal.item.id)
                : doc(db, `artifacts/${appId}/users/${masterId}/branches/${targetFacility}/inventory`, resolutionModal.item.id);

            /* REPAIR (his 2026-11-02 "when damaged good enter the master vault they should have option to repair"): the
               fixed packs go back on the shelf in the same write that takes them out of quarantine */
            batch.set(itemRef, { damagedStock: increment(-qtyToResolve), ...(resolutionModal.method === 'REPAIR' ? { stock: increment(qtyToResolve) } : {}) }, { merge: true });

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
                /* PROMO GOODS, not a sampling record (his 2026-11-02 "convert into the promotional goods inside the regional
                   warehouse instead", picks A + B). 1 Bks = 1 pcs, in a promo item of the pack's own ("<NAME> · RUSAK",
                   `dmg-<product>`, its picture), made in the Master Vault the first time - a warehouse lists only promo goods
                   that have a Master Vault item (FleetCanvasManager displayPromo). A regional crate converts into ITS
                   warehouse; a Master Vault crate into the one picked in the window. The Sampling screen was the only reader
                   of the old `samplings` row; this log keeps the record. */
                const toWh = fromFac === 'MASTER' ? toWarehouse : fromFac;
                const promoId = `dmg-${resolutionModal.item.id}`, promoName = `${resolutionModal.item.name} · RUSAK`;
                /* the pack's whole look - all six faces, its size, its back rule - so every 3D view draws the same pack (his
                   2026-11-02 "the same 3D design of that type"); HazardMark adds the biohazard sign wherever it is drawn.
                   Copied, not undefined: Firestore refuses an undefined field. */
                const look = Object.fromEntries(['images', 'dimensions', 'useFrontForBack'].map(k => [k, resolutionModal.item[k]]).filter(([, v]) => v !== undefined));
                batch.set(doc(db, `artifacts/${appId}/users/${masterId}/products`, promoId),
                    { name: promoName, kind: 'promo', unit: 'pcs', type: 'PROMO', stock: increment(0), damagedFrom: resolutionModal.item.id, ...look }, { merge: true });
                batch.set(doc(db, `artifacts/${appId}/users/${masterId}/branches/${toWh}/inventory`, promoId), { productId: promoId, name: promoName, kind: 'promo', unit: 'pcs', stock: increment(qtyToResolve) }, { merge: true });
                logData.details = { reason, to: toWh, promoId };
                if (logAudit) await logAudit("QUARANTINE_SAMPLING", `Converted ${qtyToResolve}x ${resolutionModal.item.name} into ${qtyToResolve} pcs of promo goods "${promoName}" in ${toWh}.`);

            } else if (resolutionModal.method === 'SELL') {
                /* the lot stays where the packs are: a regional crate's in that warehouse, the Master Vault's in the Master
                   Vault (`stock` of the product itself), until a van loads it like any pack. One lot per pack, so its price is
                   the last one set. */
                const lotId = `rsk-${sellSrc.id}`, lotName = `${sellSrc.name} · RUSAK`;
                const keep = Object.fromEntries(['type', 'category', 'categoryId', 'subCategoryId', 'images', 'dimensions', 'useFrontForBack', 'sticksPerPack', 'packsPerSlop', 'slopsPerBal', 'balsPerCarton', 'hpp', 'costPrice']
                    .map(k => [k, sellSrc[k]]).filter(([, v]) => v !== undefined));
                const prices = Object.fromEntries(['priceRetail', 'priceGrosir', 'priceEcer', 'priceDistributor']
                    .map(k => [k, resolutionModal.cheap ? cheapPrice : sellSrc[k]]).filter(([, v]) => v !== undefined));
                batch.set(doc(db, `artifacts/${appId}/users/${masterId}/products`, lotId),
                    { name: lotName, damagedFrom: sellSrc.id, ...keep, ...prices, stock: increment(fromFac === 'MASTER' ? qtyToResolve : 0) }, { merge: true });
                if (fromFac !== 'MASTER') batch.set(doc(db, `artifacts/${appId}/users/${masterId}/branches/${fromFac}/inventory`, lotId), { productId: lotId, name: lotName, stock: increment(qtyToResolve) }, { merge: true });
                logData.details = { to: fromFac, lotId, price: resolutionModal.cheap ? cheapPrice : fullPrice };
                if (logAudit) await logAudit("QUARANTINE_SELL", `Put ${qtyToResolve}x ${sellSrc.name} back on sale as "${lotName}" in ${fromFac} at ${formatRupiah(resolutionModal.cheap ? cheapPrice : fullPrice)} a Bks.`);

            } else if (resolutionModal.method === 'REPAIR') {
                logData.details = { note: reason };
                if (logAudit) await logAudit("QUARANTINE_REPAIR", `Repaired ${qtyToResolve}x ${resolutionModal.item.name}, back to good stock in the Master Vault.`);

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
                            date: getLocalDayKey()
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
            const depletedId = qtyToResolve >= (resolutionModal.item.damagedStock || 0) ? resolutionModal.item.id : null;
            const actionLabel = ({
                REPAIR: 'Repair',
                SELL: 'Sell again (RUSAK)',
                SAMPLING: 'Sample goods',
                RTV: 'Return to factory',
                PENALTY: 'Charge staff',
            }[resolutionModal.method]) || resolutionModal.method;
            const summaryName = resolutionModal.item.name;
            const noMotion = typeof document !== 'undefined' && (document.documentElement.classList.contains('lite-mode') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
            if (depletedId && !noMotion) {
                setLeavingId(depletedId);
                await new Promise((r) => setTimeout(r, 185));
            }
            await batch.commit();
            triggerCapy(`${actionLabel}: ${qtyToResolve} Bks ${summaryName} saved.`);
            setLeavingId(null);
            closeResolutionModal();
        } catch (error) { setLeavingId(null); notify("Resolution failed: " + error.message); } 
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

            const targetAgents = safeMotorists.filter(m => m && (monitorFacility === 'MASTER' ? isMasterVaultPlace(m.location) : m.location === monitorFacility));
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


    const filteredItems = useMemo(() => activeInventory.filter(i => i && i.name?.toLowerCase().includes(search.toLowerCase()) && (!recounting || reopened[i.id])), [activeInventory, search, recounting, reopened]);
    
    const displayedAudits = useMemo(() => {
        const source = auditSubTab === 'pending' ? pendingAudits : auditHistory;
        if (regionFilter === 'ALL') return source;
        if (regionFilter === 'MASTER') return source.filter(a => a.auditType === 'MASTER_VAULT' || a.branchLocation === 'HQ' || a.branchLocation === 'MASTER_VAULT');
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

            {resolutionModal && (() => {
                const m = resolutionModal;
                const modalTitle = ({
                    REPAIR: 'Repair',
                    SELL: 'Sell again (RUSAK)',
                    SAMPLING: 'Sample goods',
                    RTV: 'Return to factory',
                    PENALTY: 'Charge staff',
                }[m.method]) || m.method;
                const isDanger = m.method === 'PENALTY';
                return (
                <div
                    className={`kpm-quar-ov ${closingModal ? 'is-closing' : ''}`}
                    onClick={(e) => { if (e.target === e.currentTarget && !isProcessingAudit) closeResolutionModal(); }}
                >
                    <form
                        onSubmit={executeResolution}
                        role="dialog"
                        aria-modal="true"
                        aria-label={modalTitle}
                        className="kpm-quar-dlg"
                    >
                        <div className="px-4 py-3.5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--raised)]">
                            <h3 className="text-[15px] font-bold text-[var(--ink)] flex items-center gap-2 m-0">
                                {m.method === 'SAMPLING' && <FlaskConical size={16} className="text-[var(--accent-ink)]" />}
                                {m.method === 'RTV' && <Undo2 size={16} className="text-[var(--accent-ink)]" />}
                                {m.method === 'PENALTY' && <BadgeDollarSign size={16} className="text-[var(--danger-ink)]" />}
                                {m.method === 'REPAIR' && <Wrench size={16} className="text-[var(--accent-ink)]" />}
                                {m.method === 'SELL' && <Tag size={16} className="text-[var(--accent-ink)]" />}
                                <span>{modalTitle}</span>
                            </h3>
                            <button
                                type="button"
                                disabled={isProcessingAudit}
                                onClick={closeResolutionModal}
                                aria-label="Close"
                                className="min-w-11 min-h-11 lg:min-w-0 lg:min-h-0 p-1.5 rounded-lg text-[var(--ink-dim)] hover:text-[var(--ink)] inline-flex items-center justify-center"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 lg:p-5 space-y-3.5 max-h-[72vh] overflow-y-auto custom-scrollbar">
                            <div className="bg-[var(--raised)] px-3 py-2.5 rounded-lg border border-[var(--line)]">
                                <div className="font-bold text-[var(--ink)] text-sm">{m.item.name}</div>
                                <div className="text-xs text-[var(--accent-ink)] font-mono mt-0.5">
                                    Available in damaged stock: {formatNumber(m.item.damagedStock)} Bks
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-[var(--ink-muted)] mb-1.5 block">
                                    {m.method === 'SELL' ? 'Quantity to put on sale (Bks)' : 'Quantity (Bks)'}
                                </label>
                                <input
                                    name="qty"
                                    type="number"
                                    max={m.item.damagedStock}
                                    min="1"
                                    defaultValue={m.item.damagedStock}
                                    className="min-h-11 lg:min-h-10 w-full bg-[var(--inset)] border border-[var(--line-2)] px-3 rounded-lg text-[var(--ink)] font-mono text-sm font-bold focus:border-[var(--accent-edge)] outline-none"
                                    required
                                />
                            </div>

                            {m.method === 'SAMPLING' && (
                                <>
                                    <p className="text-xs text-[var(--ink-muted)] leading-relaxed m-0">
                                        Becomes promo goods: <strong className="text-[var(--ink)]">{m.item.name} · RUSAK</strong> (1 Bks = 1 pcs)
                                        {m.item.facility === 'MASTER' ? ' in the regional warehouse below.' : ` in ${m.item.facility}.`}
                                    </p>
                                    {m.item.facility === 'MASTER' && (uniqueBranches.length ? (
                                        <div>
                                            <label className="text-xs font-semibold text-[var(--ink-muted)] mb-1.5 block">Send promo pieces to</label>
                                            <select name="toWarehouse" required className="min-h-11 lg:min-h-0 w-full bg-[var(--inset)] border border-[var(--line-2)] p-2.5 rounded-lg text-[var(--ink)] outline-none text-xs font-semibold focus:border-[var(--accent-edge)]">
                                                <option value="">Select warehouse...</option>
                                                {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                        </div>
                                    ) : <p className="text-xs text-[var(--danger-ink)] m-0">No regional warehouse yet — assign a salesman to a region in Fleet &amp; Roster first.</p>)}
                                    <div>
                                        <label className="text-xs font-semibold text-[var(--ink-muted)] mb-1.5 block">Reason</label>
                                        <input name="reason" type="text" placeholder="e.g., Torn outer wrap, sealed packs" className="min-h-11 lg:min-h-10 w-full bg-[var(--inset)] border border-[var(--line-2)] px-3 rounded-lg text-[var(--ink)] text-sm focus:border-[var(--accent-edge)] outline-none" required />
                                    </div>
                                </>
                            )}

                            {m.method === 'SELL' && (() => {
                                const full = tierPrice(safeInventory.find(p => p.id === m.item.id) || m.item, 'Retail');
                                const opt = (cheap, label) => (
                                    <button
                                        type="button"
                                        aria-pressed={!!m.cheap === cheap}
                                        onClick={() => setResolutionModal(cur => ({ ...cur, cheap }))}
                                        className={`flex-1 min-h-9 px-2.5 rounded-md text-xs font-semibold transition-colors ${!!m.cheap === cheap ? 'bg-[color-mix(in_srgb,var(--gold)_13%,transparent)] border border-[var(--accent-edge)] text-[var(--ink)]' : 'border border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)]'}`}
                                    >
                                        {label}
                                    </button>
                                );
                                return (
                                    <>
                                        <p className="text-xs text-[var(--ink-muted)] leading-relaxed m-0">
                                            Put on sale as <strong className="text-[var(--ink)]">{m.item.name} · RUSAK</strong> in{' '}
                                            {m.item.facility === 'MASTER' ? 'Master Vault' : m.item.facility}.
                                        </p>
                                        <div>
                                            <label className="text-xs font-semibold text-[var(--ink-muted)] mb-1.5 block">Price per Bks</label>
                                            <div className="inline-flex w-full border border-[var(--line-2)] rounded-lg p-0.5 bg-[var(--inset)] gap-1 mb-2">
                                                {opt(false, `Full price · ${formatRupiah(full)}`)}
                                                {opt(true, 'Lower price')}
                                            </div>
                                            {m.cheap && (
                                                <input name="price" type="number" min="1" max={Math.max(1, full - 1)} required autoFocus placeholder="Rp per Bks" className="min-h-11 lg:min-h-10 w-full bg-[var(--inset)] border border-[var(--accent-edge)] px-3 rounded-lg text-[var(--ink)] font-mono text-sm font-bold outline-none" />
                                            )}
                                            <p className="mt-1.5 mb-0 text-[11px] text-[var(--ink-dim)]">Only Tier 3 and up can set this price.</p>
                                        </div>
                                    </>
                                );
                            })()}

                            {m.method === 'REPAIR' && (
                                <div>
                                    <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-3 mt-0">
                                        Returns fixed packs to good Master Vault stock. Nothing is written off.
                                    </p>
                                    <label className="text-xs font-semibold text-[var(--ink-muted)] mb-1.5 block">Repair note (optional)</label>
                                    <input name="reason" type="text" placeholder="e.g., Re-wrapped, excise seal intact" className="min-h-11 lg:min-h-10 w-full bg-[var(--inset)] border border-[var(--line-2)] px-3 rounded-lg text-[var(--ink)] text-sm focus:border-[var(--accent-edge)] outline-none" />
                                </div>
                            )}

                            {m.method === 'RTV' && (
                                <div>
                                    <label className="text-xs font-semibold text-[var(--ink-muted)] mb-1.5 block">Surat Jalan Retur (RTV number)</label>
                                    <input name="rtvRef" type="text" placeholder="e.g., SJR-2026-015" className="min-h-11 lg:min-h-10 w-full bg-[var(--inset)] border border-[var(--line-2)] px-3 rounded-lg text-[var(--ink)] text-sm focus:border-[var(--accent-edge)] outline-none font-mono uppercase" required />
                                </div>
                            )}

                            {m.method === 'PENALTY' && (
                                <div>
                                    <label className="text-xs font-semibold text-[var(--ink-muted)] mb-1.5 block">Charge staff member</label>
                                    <select name="agentId" className="min-h-11 lg:min-h-0 w-full bg-[var(--inset)] border border-[var(--danger)] p-2.5 rounded-lg text-[var(--ink)] focus:border-[var(--danger)] outline-none text-xs font-semibold" required>
                                        <option value="">Select staff member...</option>
                                        {safeMotorists.filter(st => st && st.id !== 'master_owner').map(st => (
                                            <option key={st.id} value={st.id}>{st.name} ({st.role || 'Staff'})</option>
                                        ))}
                                    </select>
                                    <div className="mt-2.5 p-2.5 rounded-lg border border-[var(--danger)] bg-[var(--danger-well)] text-xs text-[var(--danger-ink)] leading-relaxed">
                                        Adds this damage charge to the selected person&apos;s daily EOD Setoran.
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-4 py-3 border-t border-[var(--line)] bg-[var(--raised)] flex justify-end gap-2.5">
                            <button type="button" disabled={isProcessingAudit} onClick={closeResolutionModal} className="kpm-quar-btn quiet">
                                Cancel
                            </button>
                            <button type="submit" disabled={isProcessingAudit} className={`kpm-quar-btn ${isDanger ? 'danger' : ''}`}>
                                {isProcessingAudit ? <RefreshCcw size={15} className="animate-spin" /> : <Check size={15} />}
                                <span>{m.method === 'SELL' ? 'Put on sale' : 'Review & confirm'}</span>
                            </button>
                        </div>
                    </form>
                </div>
                );
            })()}

            <div className={`flex flex-col md:flex-row justify-between items-start md:items-start bg-[var(--sunk)] border border-[var(--line)] p-4 rounded-xl gap-4 shrink-0 z-10 relative ${viewMode === 'review' ? 'kpm-wl-fold' : viewMode === 'monitor' ? 'shadow-lg' : ''}`}>
                <div className={viewMode === 'review' ? 'hidden' : ''}>
                    <h2 className="text-xl lg:text-2xl font-black text-[var(--ink)] flex items-center gap-2 tracking-widest uppercase">
                        {viewMode === 'count' && <><ClipboardList size={22} className="text-[var(--ink-dim)]"/> Stock Opname</>}
                        {viewMode === 'review' && <><ShieldAlert size={24} className="text-[var(--ink-dim)]"/> HQ Recon Board</>}
                        {viewMode === 'quarantine' && <><QuarantineBioIcon /> Quarantine</>}
                        {viewMode === 'monitor' && <><BarChart size={24} className="text-[var(--ink-dim)] animate-pulse"/> Supply Telemetry</>}
                    </h2>
                    <p className={`${viewMode === 'count' || viewMode === 'quarantine' ? 'text-xs text-[var(--ink-dim)] mt-0.5' : 'text-[11px] lg:text-[10px] text-[var(--ink-dim)] font-mono mt-1'} flex items-center gap-2 flex-wrap`}>
                        {viewMode === 'count' && countPlace}
                        {viewMode === 'review' && 'VERIFY REGIONAL STOCK OVERWRITES'}
                        {viewMode === 'quarantine' && 'Damaged stock resolution & history'}
                        {viewMode === 'monitor' && 'REAL-TIME FACILITY OVERWATCH'}
                        {!isHighCommand && !countClosed && viewMode === 'count' && !showExpectedWhileCounting && <span className="bg-transparent text-[var(--accent-ink)] border border-[var(--accent-edge)] px-2 py-0.5 rounded text-[11px] font-black tracking-widest flex items-center gap-1"><EyeOff size={10}/> BLIND COUNT ENFORCED</span>}
                    </p>
                </div>
                
                {canSeeBoard && (
                    <div className="kpm-opname-tabs grid grid-cols-2 gap-1 md:flex md:ml-auto md:shrink-0 bg-[var(--sunk)] rounded-lg p-1 border border-[var(--line)] w-full md:w-auto md:overflow-x-auto custom-scrollbar">
                        {isHighCommand && <button onClick={() => setViewMode('monitor')} className={`px-2 lg:px-4 py-2 min-h-11 lg:min-h-0 justify-center lg:justify-start rounded-md text-[11px] lg:text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'monitor' ? 'kpm-tab-on' : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'} `}>
                            <BarChart size={14}/> Monitor
                        </button>}
                        <button onClick={() => setViewMode('review')} className={`px-2 lg:px-4 py-2 min-h-11 lg:min-h-0 justify-center lg:justify-start rounded-md text-[11px] lg:text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'review' ? 'kpm-tab-on' : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'} `}>
                            <ShieldAlert size={14}/> {boardScope === 'all' ? 'HQ Audits' : 'Review'} {pendingAudits.length > 0 && <NixieCount value={pendingAudits.length} size={13} rollIn />}
                        </button>
                        {canSell && <button onClick={() => setViewMode('quarantine')} className={`px-2 lg:px-4 py-2 min-h-11 lg:min-h-0 justify-center lg:justify-start rounded-md text-[11px] lg:text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'quarantine' ? 'kpm-tab-on' : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'} `}>
                            Quarantine
                        </button>}
                        {canCount && <button data-mission="8" onClick={() => setViewMode('count')} className={`px-2 lg:px-4 py-2 min-h-11 lg:min-h-0 justify-center lg:justify-start rounded-md text-[11px] lg:text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'count' ? 'kpm-tab-on' : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'} `}>
                            <ClipboardList size={14}/> New Count
                        </button>}
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
                        <select value={monitorFacility} onChange={(e) => setMonitorFacility(e.target.value)} className="min-h-11 lg:min-h-0 bg-transparent text-sm text-[var(--ink)] font-black uppercase tracking-widest outline-none w-full">
                            <option value="MASTER" className="bg-[var(--sunk)] text-[var(--ink)]">{HQ_LABEL}</option>
                            {uniqueBranches.map(branch => <option key={branch} value={branch} className="bg-[var(--sunk)] text-[var(--ink)]">{branch}</option>)}
                        </select>
                    </div>

                    {/* 🚀 UPGRADED AGGRESSIVE UI PANEL */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                        {monitorStats.map(stat => {
                            const p = stat.product;
                            if (!p || !p.id) return null;
                            const isLowStock = threshold.isLowStock({ ...p, stock: stat.vault }, appSettings);

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
                                            <p className="text-[11px] lg:text-[10px] text-[var(--ink-dim)] font-mono mt-0.5">ID: {p.id}</p>
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
            {/* VIEW MODE 1.5: QUARANTINE (Professional Edition)         */}
            {/* ======================================================== */}
            {viewMode === 'quarantine' && canSell && (
                <QuarantineBoard
                    facilities={vaultFacilities}
                    activeFacility={openFac}
                    onPickFacility={setCrateFac}
                    items={quarantineInventory}
                    subTab={quarSubTab}
                    onSubTabChange={setQuarSubTab}
                    isHighCommand={isHighCommand}
                    logs={displayedQuarantineLogs}
                    logsCount={quarantineLogs.length}
                    inventory={safeInventory}
                    leavingId={leavingId}
                    wide={wideScreen}
                    onAction={(item, method) => {
                        setClosingModal(false);
                        setResolutionModal(method === 'SELL' ? { item, method, cheap: false } : { item, method });
                    }}
                    regionFilterSelect={
                        <div className="flex items-center gap-2 bg-[var(--inset)] border border-[var(--line-2)] rounded-lg px-2.5 h-9 lg:h-9">
                            <Filter size={14} className="text-[var(--ink-dim)] shrink-0" />
                            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} aria-label="Warehouse filter" className="min-h-11 lg:min-h-0 bg-transparent text-xs text-[var(--ink)] font-semibold outline-none">
                                <option value="ALL">All warehouses</option>
                                <option value="MASTER">{HQ_LABEL}</option>
                                {uniqueBranches.map(branch => <option key={branch} value={branch}>{branch}</option>)}
                            </select>
                        </div>
                    }
                />
            )}

            {/* ======================================================== */}
            {/* VIEW MODE 1: THE HQ RECONCILIATION BOARD                 */}
            {/* ======================================================== */}
            {viewMode === 'review' && canSeeBoard && auditSubTab !== 'history' && (
                <OpnameWorklist places={boards} selected={openPlace} onSelect={setBoardPick} weekLabel={weekLabel} canDecide={canDecide}
                    onDecide={decideProducts} onHistory={() => setAuditSubTab('history')} onPhoto={setViewingImage} denied={auditsDenied}
                    streakOf={(id) => { const st = shortageStreak(auditHistory, id); return isLeak(st) ? `Short in ${st.short} of the last ${st.total} counts` : null; }}
                    emptyNote={`The team leader submits this week's count.${countDay !== null ? ` Stock Opname day is ${WEEK_DAYS[countDay]}.` : ''}`} />
            )}
            {viewMode === 'review' && canSeeBoard && auditSubTab === 'history' && (
                <div className="flex-1 flex flex-col min-h-0 animate-fade-in">

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <button onClick={() => setAuditSubTab('pending')} className="px-4 py-2 min-h-11 lg:min-h-0 rounded-lg bg-[var(--sunk)] border border-[var(--line)] text-[11px] lg:text-[10px] uppercase tracking-widest font-bold text-[var(--ink)] flex items-center justify-center gap-2 w-full md:w-auto">
                            <Clock size={14}/> Back to the review
                        </button>
                        <div className={`${boardScope === 'all' ? 'flex' : 'hidden'} items-center gap-2 bg-[var(--sunk)] border border-[var(--line)] rounded-lg p-1.5 px-3 w-full md:w-auto`}>
                            <Filter size={14} className="text-[var(--ink-dim)]"/>
                            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="min-h-11 lg:min-h-0 bg-transparent text-xs text-[var(--ink)] font-bold uppercase tracking-widest outline-none w-full">
                                <option value="ALL" className="bg-[var(--sunk)] text-[var(--ink)]">All Regions</option>
                                <option value="MASTER" className="bg-[var(--sunk)] text-[var(--ink)]">{HQ_LABEL}</option>
                                {uniqueBranches.map(branch => <option key={branch} value={branch} className="bg-[var(--sunk)] text-[var(--ink)]">{branch}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-4">
                        {displayedAudits.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-3 mt-8">
                                <History size={48} className="text-[var(--ink-dim)]"/>
                                <p className="text-sm font-bold text-[var(--ink-dim)] uppercase tracking-widest">
                                    No audit history found.
                                </p>
                            </div>
                        ) : (
                            displayedAudits.map(audit => {
                                const isExpanded = expandedAudit === audit.id;
                                
                                let totalDamaged = 0; let purelyMissing = 0; let anyDifference = false;
                                audit.items.forEach(item => {
                                    if (item.damagedCount > 0) totalDamaged += item.damagedCount;
                                    const diffs = countedDiffs(item);
                                    if (!withinTolerance(diffs.good) || !withinTolerance(diffs.damaged)) anyDifference = true;
                                    if (item.variance < 0) {
                                        purelyMissing += Math.abs(item.variance);
                                    }
                                });

                                const hasIssues = totalDamaged > 0 || purelyMissing > 0 || anyDifference;
                                let displayTime = "Unknown Time";
                                if (audit.timestamp?.seconds) displayTime = new Date(audit.timestamp.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
                                let resolvedTime = audit.resolvedAt?.seconds ? new Date(audit.resolvedAt.seconds * 1000).toLocaleString('id-ID') : '';

                                return (
                                    <div key={audit.id} className={`bg-[var(--sunk)] border rounded-xl overflow-hidden transition-all border-[var(--line)] ${audit.status === 'APPROVED' ? 'border-[var(--line)]' : 'border-[var(--danger)]'} `}>
                                        <div onClick={() => setExpandedAudit(isExpanded ? null : audit.id)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--raised)] transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full border bg-[var(--sunk)] ${audit.status === 'APPROVED' ? 'border-[var(--accent-edge)] text-[var(--accent-ink)]' : 'border-[var(--danger)] text-[var(--danger-ink)]'} `}>
                                                    {audit.status === 'APPROVED' ? <CheckCircle size={20}/> : <X size={20}/>}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-black text-[var(--ink)] flex items-center gap-2 uppercase">
                                                            <Database size={14} className="text-[var(--ink-dim)]"/> {audit.branchLocation}
                                                        </h3>
                                                        {(
                                                            <span className={`text-[11px] border px-2 py-0.5 rounded font-black tracking-widest uppercase border-[var(--line)] ${audit.status === 'APPROVED' ? 'bg-[var(--sunk)] text-[var(--accent-ink)] border-[var(--accent-edge)]' : 'bg-[var(--sunk)] text-[var(--danger-ink)] border-[var(--danger)]'} `}>
                                                                {String(audit.status).replace(/_/g, ' ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-[var(--ink-dim)] font-mono flex items-center gap-1 mt-1">
                                                        <User size={12}/> Count By: {audit.agentName.toUpperCase()} • {displayTime}
                                                    </p>
                                                    {audit.resolvedBy && (
                                                        <p className="text-[11px] lg:text-[10px] text-[var(--ink-dim)] font-mono mt-0.5">
                                                            Resolved By: {audit.resolvedBy.toUpperCase()} • {resolvedTime}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden md:block">
                                                    {purelyMissing > 0 && <p className="text-[11px] lg:text-[10px] uppercase font-bold text-[var(--danger-ink)]">{purelyMissing} Bks Missing</p>}
                                                    {totalDamaged > 0 && <p className="text-[11px] lg:text-[10px] uppercase font-bold text-[var(--accent-ink)]">{totalDamaged} Bks Damaged</p>}
                                                    {anyDifference && !purelyMissing && <p className="text-[11px] lg:text-[10px] uppercase font-bold text-[var(--danger-ink)]">Good or damaged differs</p>}
                                                    {!hasIssues && <p className="text-sm uppercase font-black text-[var(--ink-dim)]">PERFECT MATCH</p>}
                                                </div>
                                                {isExpanded ? <ChevronUp size={20} className="text-[var(--ink-dim)]"/> : <ChevronDown size={20} className="text-[var(--ink-dim)]"/>}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-[var(--line)] bg-[var(--sunk)] p-4">
                                                
                                                {audit.status === 'REJECTED' && audit.rejectReason && (
                                                    <div className="mb-4 bg-[var(--danger-well)] border border-[var(--danger)] p-3 rounded text-[11px] lg:text-[10px] font-mono text-[var(--danger-ink)]">
                                                        <span className="font-bold uppercase tracking-widest block mb-1">Rejection Reason:</span>
                                                        {audit.rejectReason}
                                                    </div>
                                                )}

                                                <h4 className="text-[11px] lg:text-[10px] font-bold text-[var(--ink-dim)] uppercase tracking-widest mb-3">Itemized Count Report</h4>
                                                
                                                <div className="space-y-2 mb-4 lg:max-h-[40vh] lg:overflow-y-auto custom-scrollbar pr-2">
                                                    {audit.items.map((item, idx) => {
                                                        const isMissing = item.variance < 0;
                                                        
                                                        return (
                                                            <div key={idx} className="flex flex-col bg-[var(--raised)] p-3 rounded-lg border border-[var(--line)]">
                                                                <div className="flex flex-col items-stretch gap-2.5 mb-3 lg:flex-row lg:justify-between lg:items-center lg:mb-2 lg:border-b lg:border-[var(--line)] lg:pb-2">
                                                                    <span className="flex items-center gap-2 min-w-0">
                                                                        <span className="font-bold text-sm lg:text-xs text-[var(--ink)] uppercase lg:truncate">{item.name}</span>
                                                                        {audit.decisions?.[item.productId] && <span className="shrink-0 text-[11px] lg:text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-[var(--sunk)] border border-[var(--line)] text-[var(--ink-dim)] whitespace-nowrap">{audit.decisions[item.productId].status}{audit.decisions[item.productId].reason ? ` · ${audit.decisions[item.productId].reason}` : ''}</span>}
                                                                        {/* LEAK, not miscount. Reads the audits already on file - short in at
                                                                            least two of the last three or more counts. Dark plate, red edge,
                                                                            red ink: it is a warning, not a slab. */}
                                                                        {(() => {
                                                                            const streak = shortageStreak(auditHistory, item.productId);
                                                                            if (!isLeak(streak)) return null;
                                                                            return (
                                                                                <span title="This product has come up short repeatedly. That is a leak, not a counting mistake."
                                                                                      className="shrink-0 text-[11px] lg:text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-[var(--sunk)] border border-[var(--danger)] text-[var(--danger-ink)] whitespace-nowrap">
                                                                                    Short {streak.short} of last {streak.total}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </span>
                                                                    <div className="flex flex-col gap-2 lg:gap-1 lg:shrink-0">
                                                                        <AuditFigures label="Good" expected={item.expectedStock} found={item.goodCount} />
                                                                        {(Number(item.expectedDamagedStock || 0) > 0 || Number(item.damagedCount || 0) > 0) && <AuditFigures label="Damaged" expected={item.expectedDamagedStock} found={item.damagedCount} />}
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
                                                                            <span className="text-[11px] lg:text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[var(--sunk)] border border-[var(--alt-edge)] text-[var(--alt-ink)]">
                                                                                Cause: {item.varianceReason}
                                                                            </span>
                                                                        )}
                                                                        {/* what the agent's number is WORTH as evidence */}
                                                                        {item.threeWayDisagreement ? (
                                                                            <span className="text-[11px] lg:text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[var(--sunk)] border border-[var(--danger)] text-[var(--danger-ink)]">
                                                                                Three different counts — you decide
                                                                            </span>
                                                                        ) : item.countedTwice && (
                                                                            <span className="text-[11px] lg:text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[var(--sunk)] border border-[var(--accent-edge)] text-[var(--accent-ink)]">
                                                                                Counted twice
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {Array.isArray(item.damageKinds) && item.damageKinds.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                                        {item.damageKinds.map((k, ki) => (
                                                                            <span key={ki} className="text-[11px] lg:text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[var(--sunk)] border border-[var(--danger)] text-[var(--danger-ink)]">
                                                                                {k.reason} · {k.qty}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                <div className="flex gap-4 items-center">
                                                                    <div className="bg-[var(--sunk)] px-3 py-1.5 rounded border border-[var(--line)] flex-1 flex justify-between items-center text-[11px] lg:text-[10px] font-mono">
                                                                        <span className="text-[var(--ink-dim)]">Good Condition:</span>
                                                                        <span className="text-[var(--ink-dim)] font-bold">{item.goodCount} Bks</span>
                                                                    </div>
                                                                    {item.damagedCount > 0 && (
                                                                        <div className="bg-[var(--sunk)] px-3 py-1.5 rounded border border-[var(--accent-edge)] flex-1 flex justify-between items-center text-[11px] lg:text-[10px] font-mono">
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

                                                {isHighCommand && audit.status === 'APPROVED' && !audit.quarantineKept && !audit.noPutBack && !audit.putBack && audit.items.some(i => quarantineLost(i).back > 0) && (
                                                    <div className="pt-2 border-t border-[var(--line)]">
                                                        <button onClick={() => handlePutBack(audit)} disabled={isProcessingAudit} className="w-full bg-[var(--raised)] border border-[var(--accent-edge)] text-[var(--accent-ink)] py-3 rounded-lg font-bold text-xs">Put back what this count took from Quarantine</button>
                                                    </div>
                                                )}
                                                {audit.putBack && <p className="pt-2 border-t border-[var(--line)] text-xs font-bold text-[var(--ink-dim)]">Quarantine was put back after this count.</p>}

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
                <div data-guide="count" className="flex-1 bg-[var(--sunk)] rounded-xl border border-[var(--line)] shadow-inner overflow-hidden flex flex-col relative animate-fade-in z-10">
                    {!isHighCommand && !IS_DEMO && (
                        <div data-guide="week-count" className="px-4 py-3 border-b border-[var(--line)] text-xs leading-relaxed text-[var(--ink)]">
                            {recounting ? <><b className="text-[var(--danger-ink)]">HQ sent {Object.keys(reopened).length} back:</b> {Object.values(reopened).map(r => `${r.name} (${r.reason})`).join(', ')}. Count only these again and submit.</>
                             : weekDone ? <><b>This week's count is in.</b> {weekDone.by} submitted it on {dayWord(weekDone.at)}. The next count opens on {dayWord(nextWeekStart(new Date(), countDay))}.</>
                             : weekCount.sentBack ? <><b className="text-[var(--danger-ink)]">HQ sent this week's count back:</b> {weekCount.sentBack.reason} Count again and submit.</>
                             : notCountDay ? <><b>Stock Opname day is {WEEK_DAYS[countDay]}.</b> The next count opens on {dayWord(nextWeekStart(new Date(), countDay))}: the team counts together and the team leader submits it.</>
                             : countDay !== null ? <><b>Today is Stock Opname day.</b> One count per warehouse, today: the team counts together and the team leader submits it.</>
                             : <><b>This week's count is not submitted yet.</b> One count per warehouse, by Sunday: the team counts together and the team leader submits it.</>}
                        </div>
                    )}
                    {/* THE COUNT, PROFESSIONAL EDITION (his pick 2026-11-17, picture v4: "i like this one better i think u can build it
                        make sure the sizing is not too big on pc and dont forget that the rules about this stock opname will also applied
                        here"). The list says where you are; the product in hand is where you count. Every rule below the list is the
                        same code as before - the blind count, the 1-Bks tolerance, count-again-before-a-cause, the damage kinds, the
                        photo - it only moved into the right-hand panel (on the phone it opens under its own row). */}
                    {(() => {
                        const rowOf = (item) => {
                            const entry = counts[item.id];
                            const hasEntry = !!entry;
                            const goodVal = entry?.good ?? '';
                            const damagedVal = entry?.damaged ?? '';
                            const { goodDiff, damagedDiff } = getVariance(item);
                            /* frozen when he started this row, so a sale landing mid-count
                               cannot move the number he is counting against */
                            const target = expectedOf(item, entry);
                            /* under one whole pack is loose sticks, not a difference - see
                               VARIANCE_TOLERANCE_BKS. The FIGURE is still printed exactly as
                               counted; only the verdict treats it as a match. */
                            const matched = withinTolerance(goodDiff) && withinTolerance(damagedDiff);
                            const hasTyped = goodVal !== '' || damagedVal !== '';
                            const isRevealed = showExpectedWhileCounting || (hasEntry && hasTyped && !!checkedRows[item.id]);
                            /* ⚠️ AFTER `hasTyped`, AND THAT ORDER IS THE WHOLE POINT.
                               This line sat two lines ABOVE the `const hasTyped` it reads, so
                               every render threw "Cannot access 'hasTyped' before
                               initialization" and the entire screen fell through to
                               LazyTabBoundary — a `const` is in the temporal dead zone until
                               its own line runs. `npm run build` compiled it happily and both
                               audit suites stayed green, because neither one RENDERS anything.
                               Only opening the screen in a browser found it. */
                            const recount = hasTyped ? recountState(entry, target)
                                                     : { needsRecount: false, confirmed: false, disagreement: false, passes: 0 };
                            /* THE COLOUR IS THE STATE, AND RED WAITS. Aldi, 2026-09-18: "too much red" -
                               on the first miscount the edge, the bar, the plate, the recount box and its
                               key all went red at once, for a count the screen itself says is probably
                               just wrong once. A first-pass difference is a request to count again
                               (amber); red is for a difference the second count CONFIRMED. */
                            const locked = !showExpectedWhileCounting && !!checkedRows[item.id] && recount.needsRecount;
                            const tone = !hasTyped ? 'idle' : (recount.confirmed || recount.disagreement) && isRevealed && !matched ? 'bad' : 'wait';
                            return { item, entry, hasEntry, goodVal, damagedVal, goodDiff, damagedDiff, target, matched, hasTyped, isRevealed, recount, locked, tone };
                        };
                        const rows = (countClosed ? [] : filteredItems).map(rowOf);
                        /* BLIND STAYS BLIND here too: everything that depends on the expected figure waits for isRevealed, exactly
                           like the old card's verdict block - a dot that lit while a T4 typed would tell him he is off. */
                        const needsYou = (r) => !!r.entry && (countBoxEmpty(r.entry) || (r.isRevealed && (r.recount.needsRecount
                            || ((r.recount.confirmed || r.recount.disagreement) && !!varianceReasonMissing(r.entry, r.recount))
                            || (r.damagedDiff >= 1 && !!damageBlocked(r.entry)))));
                        const shown = rows.filter((r) => countShow === 'all' || (countShow === 'needs' ? needsYou(r) : !r.hasEntry));
                        const cigRows = shown.filter((r) => !isPromo(r.item));
                        const promoRows = shown.filter((r) => isPromo(r.item));
                        const cur = shown.find((r) => r.item.id === countPick) || shown[0];
                        const priceOfItem = (it) => Number(it?.priceDistributor || it?.hpp || it?.costPrice || 0);
                        const offRows = showExpectedWhileCounting ? rows.filter((r) => r.isRevealed && r.goodDiff <= -1) : [];
                        const shortBks = offRows.reduce((s, r) => s + Math.abs(r.goodDiff), 0);
                        const shortRp = offRows.reduce((s, r) => s + Math.abs(r.goodDiff) * priceOfItem(r.item), 0);
                        const newDmgBks = showExpectedWhileCounting ? rows.filter((r) => r.isRevealed && r.damagedDiff >= 1).reduce((s, r) => s + r.damagedDiff, 0) : 0;
                        const countedN = rows.filter((r) => r.hasEntry).length;
                        const needN = rows.filter(needsYou).length;
                        const cleanN = rows.filter((r) => r.hasEntry && !needsYou(r)).length;
                        const meterSlots = Math.min(20, rows.length);
                        const meterFill = rows.length ? Math.round((cleanN / rows.length) * meterSlots) : 0;
                        const meterNeed = rows.length ? Math.round((needN / rows.length) * meterSlots) : 0;
                        /* a count in Bks read as the shelf reads it: Bal, Slop, Bks (view only - nothing is saved in these units) */
                        const shelf = (it, n) => {
                            const ps = Number(it.packsPerSlop) || 10, sb = Number(it.slopsPerBal) || 20, bal = ps * sb;
                            return { b: Math.floor(n / bal), s: Math.floor((n % bal) / ps), k: n % ps, ps, sb, bal };
                        };
                        const step = (r, field, by) => {
                            const now = Number((field === 'good' ? r.goodVal : r.damagedVal) || 0);
                            handleCountChange(r.item.id, field, String(Math.max(0, now + by)));
                        };
                        const mark = (r) => {
                            if (!r.hasTyped) return null;
                            if (needsYou(r)) return <span className="kpm-oc-dot" aria-label="Needs you"></span>;
                            if (showExpectedWhileCounting && r.isRevealed && !r.matched) {
                                const d = !withinTolerance(r.goodDiff) ? r.goodDiff : r.damagedDiff;
                                return <span className={`text-xs font-semibold tabular-nums ${r.tone === 'bad' ? 'text-[var(--danger-ink)]' : 'text-[var(--accent-ink)]'}`}>{d > 0 ? '+' : '−'}{formatNumber(Math.abs(d))}</span>;
                            }
                            return <Check size={15} className="text-[var(--accent-ink)]" aria-label="Counted"/>;
                        };
                        const hand = (r, inSheet = false) => {
                            const { item, entry, goodVal, damagedVal, goodDiff, damagedDiff, target, isRevealed, recount, locked } = r;
                            const promo = isPromo(item);
                            const unit = promo ? 'pcs' : 'Bks';
                            const sh = !promo && Number(goodVal) > 0 ? shelf(item, Number(goodVal)) : null;
                            const pk = promo ? null : shelf(item, 0);
                            const at = shown.findIndex((x) => x.item.id === item.id);
                            const next = shown[at + 1];
                            const goodMatch = withinTolerance(goodDiff);
                            const dmgMatch = withinTolerance(damagedDiff);
                            const cmpDiff = !goodMatch ? goodDiff : !dmgMatch ? damagedDiff : 0;
                            const cmpRp = cmpDiff !== 0 ? Math.abs(cmpDiff) * priceOfItem(item) : 0;
                            /* THE COUNTING CARD (the product in hand). Labels sit ABOVE their fields; the two boxes
                               are the same inputs as before - same handler, same lock, same guide mark - with − and + either side.
                               On PC this lives beside the list; on phones it opens cleanly in a bottom sheet. */
                            return (
                                <div key={item.id} className="kpm-oc-hand flex flex-col gap-4" data-half={counts[item.id] !== undefined && countBoxEmpty(counts[item.id]) ? '' : undefined}>
                                    <div className="flex items-center gap-3.5">
                                        <span className="kpm-oc-ic big" aria-hidden="true">{promo ? <Gift size={20}/> : <Package size={20}/>}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-base font-bold text-[var(--ink)] lg:truncate">{item.name}</div>
                                            <div className="text-xs text-[var(--ink-dim)] truncate">{promo ? 'Promo · count in pcs' : `1 Bal = ${pk.sb} Slop = ${pk.bal} Bks`}</div>
                                        </div>
                                        <span className="ml-auto text-xs text-[var(--ink-dim)] tabular-nums whitespace-nowrap">{at + 1} of {shown.length}</span>
                                        {inSheet && (
                                            <button type="button" onClick={closeCountSheet} aria-label="Close product panel" className="min-w-11 min-h-11 -mr-2 inline-flex items-center justify-center rounded-lg text-[var(--ink-dim)] hover:text-[var(--ink)]">
                                                <X size={18}/>
                                            </button>
                                        )}
                                    </div>
                                    {!showExpectedWhileCounting && (
                                        <div className="kpm-oc-blindnote">
                                            <EyeOff size={15} className="shrink-0"/>
                                            <span>Count what is on the shelf. HQ checks it after you submit.</span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 lg:grid-cols-[1.4fr_1fr] gap-3 lg:gap-4">
                                        <div className="min-w-0">
                                            <label className="flex flex-col gap-1.5 min-w-0">
                                                <span className="text-xs font-semibold text-[var(--ink-muted)]">Good stock</span>
                                                <span className="kpm-oc-num">
                                                    <button type="button" disabled={locked} aria-label="One less good" onClick={() => step(r, 'good', -1)}><Minus size={15}/></button>
                                                    <input data-guide="good" disabled={locked} type="number" inputMode="numeric" min="0" placeholder="0" value={goodVal} onChange={(e) => handleCountChange(item.id, 'good', e.target.value)}/>
                                                    <button type="button" disabled={locked} aria-label="One more good" onClick={() => step(r, 'good', 1)}><Plus size={15}/></button>
                                                </span>
                                            </label>
                                            {sh && <div className="mt-1.5 text-xs text-[var(--ink-dim)] tabular-nums"><b className="text-[var(--ink-muted)] font-semibold">{formatNumber(sh.b)}</b> Bal · <b className="text-[var(--ink-muted)] font-semibold">{sh.s}</b> Slop · <b className="text-[var(--ink-muted)] font-semibold">{sh.k}</b> Bks</div>}
                                        </div>
                                        <div className="min-w-0">
                                            <label className="flex flex-col gap-1.5 min-w-0">
                                                <span className="text-xs font-semibold text-[var(--ink-muted)]">Damaged</span>
                                                <span className="kpm-oc-num">
                                                    <button type="button" disabled={locked} aria-label="One less damaged" onClick={() => step(r, 'damaged', -1)}><Minus size={15}/></button>
                                                    <input disabled={locked} type="number" inputMode="numeric" min="0" placeholder="0" value={damagedVal} onChange={(e) => handleCountChange(item.id, 'damaged', e.target.value)}/>
                                                    <button type="button" disabled={locked} aria-label="One more damaged" onClick={() => step(r, 'damaged', 1)}><Plus size={15}/></button>
                                                </span>
                                            </label>
                                            <div className="mt-1.5 text-xs text-[var(--ink-dim)] tabular-nums">
                                                {showExpectedWhileCounting && isRevealed && Number(target.damaged) > 0 && Number(damagedVal || 0) !== Number(target.damaged)
                                                    ? <>was {formatNumber(target.damaged)} · <b className="text-[var(--ink-muted)] font-semibold">{damagedDiff >= 0 ? '+' : '−'}{formatNumber(Math.abs(damagedDiff))} {damagedDiff >= 0 ? 'new' : 'less'}</b></>
                                                    : damagedVal === '' ? 'type 0 if none' : Number(damagedVal) === 0 ? 'none' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    {/* the verdict block slides open under the boxes on the first typed number -
                                        the same grid-rows fold as ADMIN TOOLS; Lite Mode makes it a jump */}
                                    <div className="grid transition-[grid-template-rows] duration-[260ms] ease-out" style={{ gridTemplateRows: isRevealed ? '1fr' : '0fr' }}>
                                      <div className="overflow-hidden">
                                    {isRevealed && (
                                        <div className="flex flex-col gap-3.5 pt-0.5">
                                            {showExpectedWhileCounting && (
                                                <div className="kpm-oc-cmp">
                                                    <div>
                                                        <small>System</small>
                                                        <strong>{formatNumber(target.stock)}</strong>
                                                        {Number(target.damaged) > 0 && <span className="cmp-sub">+{formatNumber(target.damaged)} dmg</span>}
                                                    </div>
                                                    <div>
                                                        <small>You counted</small>
                                                        <strong>{formatNumber(Number(goodVal || 0))}</strong>
                                                        {(Number(damagedVal || 0) > 0 || Number(target.damaged) > 0) && <span className="cmp-sub">+{formatNumber(Number(damagedVal || 0))} dmg</span>}
                                                    </div>
                                                    <div className={cmpDiff !== 0 ? 'off' : ''}>
                                                        <small>Difference</small>
                                                        <strong key={`${goodDiff}_${damagedDiff}`} className={`inline-block ${cmpDiff === 0 ? '' : cmpDiff < 0 ? 'kpm-verdict-down' : 'kpm-verdict-up'}`}>
                                                            {cmpDiff === 0 ? 'Match' : `${cmpDiff > 0 ? '+' : '−'}${formatNumber(Math.abs(cmpDiff))} ${goodMatch ? 'dmg' : unit}`}
                                                        </strong>
                                                        {cmpRp > 0 && <span className="cmp-sub">{formatRupiah(cmpRp)}</span>}
                                                        {!goodMatch && !dmgMatch && <div className="text-xs text-[var(--danger-ink)] mt-0.5 tabular-nums">{damagedDiff > 0 ? '+' : '−'}{formatNumber(Math.abs(damagedDiff))} damaged</div>}
                                                    </div>
                                                </div>
                                            )}

                                            {goodDiff >= 1 && damagedDiff <= -1 && (
                                                <p className="w-full text-xs leading-relaxed font-bold text-[var(--danger-ink)] m-0">Damaged packs go in the Damaged box, even for the same product. Good stock is only the healthy ones.</p>
                                            )}

                                            {Number(damagedVal) > 0 && (
                                                <div className="flex items-center">
                                                    {entry.photo ? (
                                                        <div className="flex items-center gap-2 bg-[var(--sunk)] border border-[var(--accent-edge)] px-3 py-1.5 rounded-lg"><ImageIcon size={14} className="text-[var(--accent-ink)]"/><span className="text-[11px] lg:text-[10px] text-[var(--accent-ink)] font-bold uppercase tracking-widest">Damage Proof Attached</span><button type="button" onClick={() => handleClearPhoto(item.id)} className="ml-1 text-[var(--danger-ink)]"><X size={13}/></button></div>
                                                    ) : (
                                                        <label className="cursor-pointer min-h-11 lg:min-h-0 flex items-center gap-2 bg-transparent hover:bg-[var(--inset)] border border-[var(--line-2)] px-4 py-2 rounded-lg text-[11px] lg:text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-widest transition-colors"><Camera size={14}/> Upload Damaged Proof<input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(item.id, e.target.files[0])} /></label>
                                                    )}
                                                </div>
                                            )}

                                            {/* ---- COUNT IT AGAIN ----
                                                ⚠️ NEVER NAMES THE DIFFERENCE. "You are 5 short" hands a blind
                                                tier the answer the screen exists to withhold, and it tells any
                                                tier exactly what to type to make the warning go away. */}
                                            {recount.needsRecount && (
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-lg bg-[var(--sunk)] border border-[var(--accent-edge)]">
                                                    <span className="flex-1 min-w-0 text-xs font-medium text-[var(--ink)] leading-relaxed">
                                                        <b className="text-[var(--accent-ink)]">Count this one again.</b>{' '}
                                                        Most differences are miscounts. It is only reported once the same number comes up twice.
                                                    </span>
                                                    <button type="button" onClick={() => startRecount(item.id)}
                                                        className="shrink-0 min-h-11 lg:min-h-[40px] px-4 rounded-lg text-[11px] lg:text-[10px] font-black uppercase tracking-widest bg-transparent border border-[var(--accent-edge)] text-[var(--accent-ink)] hover:bg-[var(--inset)] transition-colors">
                                                        Clear and count again
                                                    </button>
                                                </div>
                                            )}
                                            {recount.confirmed && (
                                                <div className="px-3 py-2 rounded-lg bg-[var(--sunk)] border border-[var(--accent-edge)] text-xs font-semibold text-[var(--accent-ink)]">
                                                    Counted twice — same answer, this goes to HQ
                                                </div>
                                            )}
                                            {recount.disagreement && (
                                                <div className="px-3 py-2 rounded-lg bg-[var(--sunk)] border border-[var(--alt-edge)] text-xs font-semibold text-[var(--alt-ink)]">
                                                    Three different counts — all three go to HQ
                                                </div>
                                            )}

                                            {/* ---- WHY IT DISAGREES (SEGMENTED PILLS) ----
                                                Only once the difference has survived the recount. Starts unset and never returns to empty;
                                                blind mode never names the difference figure. */}
                                            {(recount.confirmed || recount.disagreement) && (() => {
                                                const chosenReason = entry?.varianceReason || '';
                                                const missing = varianceReasonMissing(entry, recount);
                                                const reasonPrompt = showExpectedWhileCounting && !goodMatch
                                                    ? `Why is it ${formatNumber(Math.abs(goodDiff))} ${goodDiff < 0 ? 'short' : 'over'}?`
                                                    : 'What happened with this count?';
                                                return (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[13px] font-semibold text-[var(--ink)]">{reasonPrompt}</span>
                                                            {missing && <span className="text-xs font-semibold text-[var(--danger-ink)]">Pick one</span>}
                                                        </div>
                                                        <div className="kpm-oc-seg">
                                                            {VARIANCE_REASONS.map((vr) => (
                                                                <button
                                                                    key={vr.value}
                                                                    type="button"
                                                                    aria-pressed={chosenReason === vr.value}
                                                                    onClick={() => selectVarianceReason(item.id, vr.value)}
                                                                    className={`kpm-oc-pill${chosenReason === vr.value ? ' on' : missing ? ' req' : ''}`}
                                                                >
                                                                    {vr.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* ---- WHAT KIND OF DAMAGE (SEGMENTED PILLS + QTY) ---- */}
                                            {damagedDiff >= 1 && (() => {
                                                const dmgTotal = damagedDiff;
                                                const kinds = entry?.kinds || {};
                                                const sorted = damageSorted(entry);
                                                const blocked = damageBlocked(entry);
                                                return (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <span className="text-[13px] font-semibold text-[var(--ink)]">What happened to the {formatNumber(dmgTotal)} new?</span>
                                                            <span className={`text-xs font-semibold tabular-nums ${blocked ? 'text-[var(--danger-ink)]' : 'text-[var(--accent-ink)]'}`}>
                                                                {blocked || `${formatNumber(sorted)} of ${formatNumber(dmgTotal)} sorted`}
                                                            </span>
                                                        </div>
                                                        <div className="h-[3px] rounded-sm bg-[var(--panel)] overflow-hidden">
                                                            <span className={`block h-full ${blocked ? 'bg-[var(--danger)]' : 'bg-[var(--gold)]'}`}
                                                                  style={{ width: `${dmgTotal ? Math.min(100, (sorted / dmgTotal) * 100) : 0}%` }}></span>
                                                        </div>
                                                        <div className="kpm-oc-seg">
                                                            {DAMAGE_REASONS.map((dr) => {
                                                                const qty = Number(kinds[dr.value] || 0);
                                                                return (
                                                                    <div key={dr.value} className={`kpm-oc-dmg-chip${qty > 0 ? ' on' : ''}`}>
                                                                        <button type="button" onClick={() => setDamageKindQty(item.id, dr.value, q => q + 1)} className="text-left">
                                                                            {dr.label}
                                                                        </button>
                                                                        {qty > 0 && (
                                                                            <>
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    inputMode="numeric"
                                                                                    aria-label={`How many ${dr.label}`}
                                                                                    value={qty}
                                                                                    onChange={(e) => setDamageKindQty(item.id, dr.value, e.target.value)}
                                                                                    className="kpm-oc-dmg-qty"
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    aria-label={`Clear ${dr.label}`}
                                                                                    onClick={() => setDamageKindQty(item.id, dr.value, 0)}
                                                                                    className="w-6 h-6 inline-flex items-center justify-center rounded text-[var(--ink-dim)] hover:text-[var(--danger-ink)]"
                                                                                >
                                                                                    <X size={13}/>
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
                                        {entry && (entry.passes?.length || 0) === 0 && !locked ? (
                                            <button type="button" onClick={() => startRecount(item.id)} className="kpm-quar-btn quiet min-h-11 lg:min-h-0">
                                                <RefreshCcw size={14}/> <span>Count again</span>
                                            </button>
                                        ) : <span />}
                                        {next && (
                                            <button type="button" onClick={() => setCountPick(next.item.id)} className="kpm-edge-btn min-h-11 lg:min-h-9 h-9 px-4 rounded-lg text-[13px] font-semibold gap-2 max-w-full ml-auto">
                                                <span className="truncate">Next · {next.item.name}</span><ArrowRight size={15} className="shrink-0"/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        };
                        const renderListRow = (r) => {
                            const on = cur && r.item.id === cur.item.id && (wideScreen || countSheetOpen);
                            return (
                                <div key={r.item.id} data-half={counts[r.item.id] !== undefined && countBoxEmpty(counts[r.item.id]) ? '' : undefined}>
                                    <button type="button" onClick={() => { setCountPick(r.item.id); if (!wideScreen) setCountSheetOpen(true); }} aria-current={on ? 'true' : undefined} className={`kpm-oc-row${on ? ' on' : ''}`}>
                                        <span className="kpm-oc-ic">{isPromo(r.item) ? <Gift size={15}/> : <Package size={15}/>}</span>
                                        <span className="flex-1 min-w-0 truncate text-left">{r.item.name}</span>
                                        <span className={`tabular-nums ${r.goodVal === '' ? 'text-[var(--ink-dim)]' : 'font-semibold text-[var(--ink)]'}`}>{r.goodVal === '' ? '—' : formatNumber(Number(r.goodVal))}</span>
                                        <span className="w-12 flex justify-end">{mark(r)}</span>
                                    </button>
                                </div>
                            );
                        };
                        return (<>
                            {!countClosed && (
                                <div className="kpm-oc-sum">
                                    {meterSlots > 0 && (
                                        <span className="kpm-oc-meter" aria-hidden="true">
                                            {Array.from({ length: meterSlots }, (_, i) => (
                                                <i key={i} className={i < meterFill ? 'f' : i < meterFill + meterNeed ? 'n' : ''} />
                                            ))}
                                        </span>
                                    )}
                                    <span><b><RollingNumber text={countedN} /></b> of {rows.length} counted</span>
                                    {needN > 0 && <><span className="kpm-oc-sep" aria-hidden="true" /><span><b>{needN}</b> need you</span></>}
                                    {showExpectedWhileCounting && shortBks > 0 && (
                                        <><span className="kpm-oc-sep" aria-hidden="true" /><span className="text-[var(--danger-ink)]">−{formatNumber(shortBks)} Bks{shortRp > 0 ? <> · <RollingNumber text={formatRupiah(shortRp)} /></> : null} short</span></>
                                    )}
                                    {showExpectedWhileCounting && newDmgBks > 0 && (
                                        <><span className="kpm-oc-sep" aria-hidden="true" /><span>+{formatNumber(newDmgBks)} Bks newly damaged</span></>
                                    )}
                                </div>
                            )}
                            <div className={`flex-1 min-h-0 flex flex-col lg:flex-row${countClosed ? ' hidden' : ''}`}>
                                <div className="lg:w-[340px] xl:w-[380px] lg:shrink-0 lg:border-r border-[var(--line)] flex flex-col min-h-0 bg-[var(--raised)]">
                                    <div className="px-3 pt-3 pb-2 flex flex-col gap-2">
                                        <div className="relative">
                                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-dim)]"/>
                                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a product" className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--line)] bg-[var(--sunk)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-dim)] outline-none focus:border-[var(--accent-edge)]"/>
                                        </div>
                                        <div className="flex gap-1">
                                            {[['all', `All ${rows.length}`], ['needs', `Needs you ${needN}`], ['left', `Left ${rows.length - countedN}`]].map(([k, l]) => (
                                                <button key={k} type="button" onClick={() => setCountShow(k)} className={`kpm-oc-chip${countShow === k ? ' on' : ''}`}>{l}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-2">
                                        {shown.length === 0 && <div className="px-4 py-6 text-sm text-[var(--ink-dim)]">{countShow === 'needs' ? 'Nothing needs you.' : countShow === 'left' ? 'Everything is counted.' : 'No product matches.'}</div>}
                                        {cigRows.length > 0 && <div className="kpm-oc-gh"><span>Cigarettes</span><span>Bks</span></div>}
                                        {cigRows.map(renderListRow)}
                                        {promoRows.length > 0 && <div className="kpm-oc-gh"><span>Promo</span><span>pcs</span></div>}
                                        {promoRows.map(renderListRow)}
                                    </div>
                                </div>
                                {wideScreen && cur && <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar px-7 py-6">{hand(cur, false)}</div>}
                            </div>
                            {!wideScreen && countSheetOpen && !countClosed && cur && (
                                <div className={`kpm-oc-veil${closingCountSheet ? ' is-closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeCountSheet(); }}>
                                    <div className="kpm-oc-sheet" role="dialog" aria-modal="true" aria-label={cur.item.name}>
                                        <div className="kpm-oc-grab" onClick={closeCountSheet} />
                                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 pb-5 pt-2">
                                            {hand(cur, true)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>);
                    })()}

                    <div className="p-4 bg-[var(--sunk)] border-t border-[var(--line)] flex flex-col md:flex-row justify-between items-center gap-4 z-10 relative">
                        <div className="text-xs text-[var(--ink-dim)] font-semibold w-full md:w-auto text-center md:text-left">{!countClosed && (stillUncounted.length ? `${Object.keys(counts).length} of ${Object.keys(counts).length + stillUncounted.length} counted` : `${Object.keys(counts).length} products counted`)}</div>
                        <div className="flex w-full md:w-auto gap-3">
                            {!countClosed && <button onClick={() => clearCounts()} className="flex-none justify-center px-4 py-3 md:py-2 text-[var(--ink-dim)] hover:text-[var(--ink)] font-bold text-xs flex items-center gap-2 transition-colors bg-[var(--raised)] border border-[var(--line)] rounded-lg"><RefreshCcw size={14}/> Reset</button>}
                            <button data-guide="submit-count" data-half={halfRows ? '' : undefined} onClick={handleCommit}disabled={isSubmitting || countClosed || Object.keys(counts).length === 0} className="kpm-edge-btn flex-1 md:flex-none justify-center disabled:bg-[var(--sunk)] disabled:text-[var(--ink-dim)] disabled:border disabled:border-[var(--line)] disabled:shadow-none disabled:cursor-not-allowed px-4 lg:px-8 py-3 md:py-2 rounded-lg font-black flex items-center gap-2 tracking-widest uppercase text-xs">{isSubmitting ? <RefreshCcw size={16} className="animate-spin"/> : <Send size={16}/>} {weekDone && !recounting ? 'Submitted this week' : notCountDay ? `Opens on ${WEEK_DAYS[countDay]}` : 'Submit to HQ'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockOpnameView;