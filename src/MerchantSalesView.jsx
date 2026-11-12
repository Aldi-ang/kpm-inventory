import React, { useState, useEffect, useRef } from 'react';
import NixieCount from './components/NixieCount.jsx';
import { tr, getLang } from './config/lang';
import { createPortal } from 'react-dom';
import { Search, Box, Zap, X, DollarSign, List, ChevronDown, Printer, MessageSquare, MapPin, AlertCircle, Camera, Store, Map, Lock, Package, AlertTriangle, Check, Eye } from 'lucide-react';
import { doc, setDoc, collection, getDoc, getDocs, updateDoc, addDoc, onSnapshot, serverTimestamp, runTransaction, query, where } from 'firebase/firestore';
import { earnedLevel, nextLevel, nameVariants } from './utils/storeLevel';   // the shop's level after a sale (Settings > Tier Automation Rules) 
import { hasClearance, canPickFromGallery } from './config/permissions';
import { IS_DEMO } from './config/firebase';
import { demoPhoto } from './config/demoPhoto.js';
import ProofCamera from './components/ProofCamera.jsx';
import { savePhotoAndGetReference, fileOrKeepPhoto, photoStamp, nameTag, convertToBks, splitToUnits, unitsText, paymentLabel, storeKey, getLocalDayKey, promoPic, isDamagedPack, lotsAfterPacks } from './utils/helpers';
import HazardMark from './components/HazardMark';
import { giveLines, bundleCheck, bundlesFor, bundleUnitPrices, bundleTakeBack, bundleGate, packageGives } from './utils/vanBay';
import { waNumber } from './utils/whatsapp.js';
import { areaFromPin, watchBorders } from './utils/areaFromPin.js';
import { grosirHold, priceLevelOf, canConfirmGrosir, grosirRequestNotice } from './utils/customerAccess.js';
import { debtCredit } from './utils/revenueRule';
import { isLowOnTerminal } from './utils/stockThreshold';
import { dayStats, agoLabel, txSeconds } from './utils/dayStats';
import { customerBrief, reorderFromLast } from './utils/customerBrief';
import { nextStop, directionsUrl, metresLabel } from './utils/nextStop';
import { VISIT_TAGS, visitReport } from './utils/dayLog';
import { unlockSounds, speakMumble, playSound, capyMaySpeak, capyHoldForSale } from './hooks/useSound';
import { notify } from './components/Toast.jsx';
import { shareReceipt } from './components/shareReceipt.js';

/* `onAdminSalesMode` is undefined for everyone but the boss, and that IS the permission check —
   App only hands it over on `userRole === 'ADMIN'`, the same test that used to gate the bar it
   replaces. Absent prop, absent switch. */
/* DRAFT — Aldi, 2026-08-20: "everytime i open sales terminal and i input all the data and i go to
   other app segment ... i dont have to fill everything over again". App renders this screen behind
   `activeTab === 'sales' &&`, so leaving the tab UNMOUNTS it and every field is destroyed.

   Only what he TYPED is kept. Anything MEASURED - the GPS fix, the distance, the proximity hit,
   the territory claim - is deliberately left out. A restored one would stamp an old place onto a
   new sale, which is the same class of bug as the previous customer's territoryOverride leaking
   into an innocent walk-in (see resetTerminalAfterDeal). */
const DRAFT_KEY = 'kpm_sales_draft_v1';
const COUNT_FLIP_TITLE = 'Press to see the total in Bks';
/* A draft must not survive into the next selling day: it carries price snapshots taken when the
   basket was built, and yesterday's price is a wrong sale, not a saved one.
   ⚠️ This is an AGE CAP, not a day boundary — twelve hours from when the basket was saved, which
   is why it was never affected by the UTC date bug. The old comment here said "his day starts at
   07:00"; there was never such a rule, that was only the UTC helper flipping at 07:00 WIB. */
const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const readDraft = (uid) => {
    try {
        const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
        if (!d || d.uid !== uid) return null;   // a shared phone must not hand one agent another's basket
        if (Date.now() - (d.at || 0) > DRAFT_MAX_AGE_MS) { localStorage.removeItem(DRAFT_KEY); return null; }
        return d;
    } catch { return null; }
};

const MerchantSalesView = ({ inventory, user, userRole, isAdmin, logAudit, triggerCapy, onProcessSale, onInspect, appSettings, customers = [], allowedPayments = ['Cash'], allowedTiers = ['Retail', 'Ecer'], levels = [], transactions = [], allowRetur = true, allowCashRefund = false, db, appId, agentProfileId, motorists = [], storage, masterUserId, adminSalesMode, onAdminSalesMode, isOnline = navigator.onLine, promoVan = [], sellerRegion = '', regionOffers = [] }) => {
    /* WHOSE VAULT THE CUSTOMER RECORDS LIVE IN — and the answer must be the same one App used to
       fetch them, or a write lands in a document nobody reads.

       HIS BUG, G5: the pending-IOU banner never appeared. It was never a missing banner. App
       redirects every database call to the admin's vault when `bossUid` is set (`App.jsx:318`),
       and the `customers` prop arrives from there — but this file re-derived its own owner id
       four times WITHOUT bossUid. So a salesman's IOU was written to
       users/<hisUid>/customers/<id> while the list was read from users/<bossUid>/..., and
       `selectedCustomerInfo.pendingIOUs` could never be anything but empty. The same four sites
       cover new-outlet registration, so an outlet he registered was invisible to his boss too.

       WHY THIS IS SAFE TO CHANGE: on the boss's own account `bossUid === user.uid`, so this
       expression returns exactly what the old one did and nothing about his experience moves.
       It differs only on a salesman account, where today's behaviour is the bug.

       DELIBERATELY NOT TOUCHED: `masterUid` inside handleFinalDeal and the sampling/bypass paths
       (products, motorists, samplings, photos, notifications). Those are the same expression
       under a different name and are probably the same fault, but they are a separate question
       with a much larger blast radius — stock writes work for him today, and `:958` records that
       someone already hit a rules wall writing motorists to another vault. */
    const dataOwnerId = masterUserId || user?.uid || user?.id || 'default';
    /* His map borders, so a new outlet is filed under its Kecamatan / Kabupaten / Provinsi from the salesman's GPS
       pin (2026-10-20: "i want the stores to be automatically autofilled ... according to their location"). It
       used to save the pin and NO area, and landed in the directory's Unknown folder. utils/areaFromPin.js. */
    const [mapBorders, setMapBorders] = useState([]);
    useEffect(() => { watchBorders(db, appId, dataOwnerId, setMapBorders); }, [db, appId, dataOwnerId]);
    const areaText = (a) => [a.city, a.region].filter(Boolean).join(', ') || 'no map border here - it waits in the Unknown folder';
    /* Read ONCE, on the mount that restores it - not on every render. */
    const [draft] = useState(() => readDraft(user?.uid));

    /* On a phone the Manifest is a panel that slides in from the LEFT, pulled by a tab on the edge - his 2026-10-31 "the
       manifest panel need to be moved to the sidebar on the left and can be pulled so that the sales person can see the
       manifest just with a side slide instead of moving up and down to check". Shut by default: the wares get the screen.
       pullX is the panel's open width while a finger drags the tab, null otherwise. On the PC it is the left column. */
    const [manifestOpen, setManifestOpen] = useState(false);
    const [pullX, setPullX] = useState(null);
    /* The arrival question (same 2026-10-31 flow): GPS locks a shop with no report today -> "what happened here?". TAKE ORDER
       opens the terminal; any other status is one tap and the visit is done. requestNote is null for the status buttons, a
       string while the New Request line is being typed. askedRef: shops answered or closed this session, never asked twice.
       autoLockRef: the shop GPS picked rather than him - let go when he walks away with nothing on the manifest. */
    const [arrival, setArrival] = useState(null);
    const [requestNote, setRequestNote] = useState(null);
    const askedRef = useRef(new Set());
    const autoLockRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState(draft?.cart || []);
    const [activeCategory, setActiveCategory] = useState("ALL");
    // which ware the examine shelf is showing — one write per hover, never per frame
    const [examineItem, setExamineItem] = useState(null);
    
    // --- MERCHANT STATE ---
    const [merchantMood, setMerchantMood] = useState("idle");
    const [merchantLine, setMerchantLine] = useState("");   // what the alcove bubble shows
    const searchRef = useRef(null);
    const alcoveRef = useRef(null);
    /* B, PC: the terminal is exactly as tall as the shell's scroll box, so the table scrolls inside itself and the
       slip's total and save button are always in view (it used to grow with the page and push them under the fold).
       Measured, not guessed: the box's height depends on the header, the demo bar and the window. */
    const rootRef = useRef(null);
    const [fitH, setFitH] = useState(null);
    useEffect(() => {
        const box = rootRef.current?.closest('.overflow-y-auto');
        if (!box || typeof ResizeObserver === 'undefined') return undefined;
        const fit = () => { const cs = getComputedStyle(box); setFitH(Math.round(box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom))); };
        fit();
        const ro = new ResizeObserver(fit); ro.observe(box);
        return () => ro.disconnect();
    }, []);
    // true once his alcove has scrolled out of view — see the travelling merchant below
    const [alcoveOut, setAlcoveOut] = useState(false);
    // he has to outlive alcoveOut by one animation, or he would vanish instead of leaving
    const [floatShown, setFloatShown] = useState(false);
    const [floatLeaving, setFloatLeaving] = useState(false);

    // 🚀 DUAL RETUR ENGINE
    const [isReturMode, setIsReturMode] = useState(draft?.isReturMode || false);
    /* 'BUYBACK' | 'EXCHANGE'. A saved draft cannot restore BUYBACK to somebody who is not allowed
       to refund: the sub-mode toggle is hidden without the privilege, so there would be no control
       on screen to leave that mode with, and the only feedback would come from the refusal at
       handleFinalDeal after the basket was already built. Buyback went off for everyone on
       2026-09-09, which makes this the normal case rather than an edge one. */
    const [returType, setReturType] = useState(
        allowCashRefund ? (draft?.returType || 'EXCHANGE') : 'EXCHANGE');

    // --- FORM STATE ---
    const [customerName, setCustomerName] = useState(draft?.customerName || "");
    const [paymentMethod, setPaymentMethod] = useState(draft?.paymentMethod || allowedPayments[0] || "Cash");
    const [isProcessingSale, setIsProcessingSale] = useState(false); 
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [receiptData, setReceiptData] = useState(null);
    /* PROMO GOODS GIVEN WITH THIS SALE (stage 4): pieces per product, off the van's promoCanvas (promoVan). Offered
       whenever the van holds promo, never in Retur - an empty cart is a GIVEAWAY (his 2026-10-26 "i want the giveaway to
       be allowed but recorded as always"; the shop and the live photo are still required). Capped at what the van holds
       now; the engine refuses a give the van cannot cover. The boss on the Master Vault has no van: one line says so. */
    const [give, setGive] = useState({});
    const [giveOpen, setGiveOpen] = useState(false);   // the promo list starts folded (his 2026-11-02 "hide the promo goods on default")
    const [bundleUse, setBundleUse] = useState({});   // OFFER RESULTS: the offers tapped into this deal, kept on the sale as `offers`
    const canGive = !isReturMode && promoVan.length > 0;
    const bundles = bundlesFor([...(appSettings?.promoBundles || []), ...regionOffers], sellerRegion, userRole === 'ADMIN');   // all-area offers + his region's; the boss sees every one
    /* A PACKAGE ITEM IS NOT A HAND GIFT (his 2026-11-12 yes): a promo item that any of this seller's packages gives, on or
       off, has no − / + / typed count in the give list, and what is saved of it is capped at what the order's packages
       cover (packageGives), so taking the cigarettes back out takes the gift with them. The boss keeps giving by hand
       (his 2026-10-27 "tier 1 can give the item straight from the master vault"). */
    const packOnly = new Set(userRole === 'ADMIN' ? [] : bundles.flatMap(b => (b.gives || []).map(g => g.productId)));
    const packCover = packageGives(bundles, bundleUse, cart, inventory);
    const giveOf = (l) => Math.min(give[l.productId] || 0, l.qty, packOnly.has(l.productId) ? (packCover[l.productId] || 0) : Infinity);
    // where the given pieces come from: the boss on the Master Vault gives from its own promo stock (his 2026-10-27
    // "can u add so that tier 1 can give the item straight from the master vault?"), everyone else from a van
    const giveFrom = userRole === 'ADMIN' && adminSalesMode !== 'VEHICLE' ? 'the Master Vault' : 'the van';
    const giveWhere = giveFrom === 'the van' ? tr('in the van') : tr('in the Master Vault');   // shown; giveFrom stays the compared value
    // what the give box says when nothing can be given - it is never hidden (his 2026-10-27 "yes add that line and dont hide the button")
    const giveEmpty = isReturMode ? 'No promo goods with a retur. Give them on a new deal.'
        : giveFrom === 'the Master Vault' ? 'No promo goods in the Master Vault. Restock them in Restock Vault.'
        : 'No promo goods in this van. Load them in Fleet & Canvas → PROMO.';
    const givenLines = canGive ? giveLines(promoVan.map(l => ({ productId: l.productId, name: l.name, qty: giveOf(l) }))) : [];
    const [lockedTier, setLockedTier] = useState(draft?.lockedTier ?? null);
    // the product card's price: the picked shop's tier, Ecer until a shop is picked
    const cardPriceOf = (p) => ({ Retail: p.priceRetail, Grosir: p.priceGrosir }[lockedTier] ?? p.priceEcer) || 0;
    /* The card's count reads "1 Slop 6 Bks"; a press shows the flat "16 Bks" and it flips back by itself, like the
       header clock and its date (his 2026-10-20: "i want bks also included there ... pressable button like the clock
       button to show both format"). One card at a time, same 5 s hold as the clock. */
    const [flatCountId, setFlatCountId] = useState(null);
    useEffect(() => {
        if (!flatCountId) return undefined;
        const t = setTimeout(() => setFlatCountId(null), 5000);
        return () => clearTimeout(t);
    }, [flatCountId]);
    /* both readings are always rendered, stacked in one window, and the chip's `is-flat` slides one out and the other
       in - the header clock's own flip (theme.css .kpm-flip-*), his 2026-10-20 "i want the animation to be like this
       clock". aria-hidden follows the flip, as on the clock, so a reader hears only the face on show. */
    const countFaces = (p) => (
        <span className="kpm-flip-win">
            <span className="kpm-flip-face" aria-hidden={flatCountId === p.id}>{unitsText(p.stock, p)}</span>
            <span className="kpm-flip-face" aria-hidden={flatCountId !== p.id}>{`${new Intl.NumberFormat('id-ID').format(p.stock)}\u00a0Bks`}</span>
        </span>
    );
    const flipCount = (e, p) => { e.stopPropagation(); setFlatCountId((id) => (id === p.id ? null : p.id)); };   // the card's own press adds to the cart
    const [tempoDays, setTempoDays] = useState(draft?.tempoDays ?? appSettings?.defaultTempoDays ?? 7); 
    const [printFormat, setPrintFormat] = useState('thermal'); 

    /* the demo lets a sale through out of range: every visitor stands far from the demo's Muntilan shops, so the 50 m
       fence would lock the mission's sale for all of them. The chip still says how far (the demo text below). */
    const canOverrideGps = IS_DEMO || isAdmin === true || user?.tier === 1 || user?.tier === 2 || user?.tier === '1' || user?.tier === '2' || user?.role?.toLowerCase() === 'admin' || user?.isAdmin === true;

    // 🚀 PRICE RECALCULATION ENGINE
    useEffect(() => {
        setCart(prev => prev.map(item => {
            if (item.isIouFulfillment) return item; 

            const prod = item.product;
            let basePrice = prod.priceRetail || 0;
            if (item.priceTier === 'Ecer') basePrice = prod.priceEcer || 0;
            if (item.priceTier === 'Grosir') basePrice = prod.priceGrosir || 0;
            
            let mult = 1;
            if (item.unit === 'Slop') mult = prod.packsPerSlop || 10;
            if (item.unit === 'Bal') mult = (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);
            if (item.unit === 'Karton') mult = (prod.balsPerCarton || 4) * (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);
            
            const calcPrice = (isReturMode && returType === 'EXCHANGE') ? 0 : (basePrice * mult);
            
            return {
                ...item,
                calculatedPrice: calcPrice,
                condition: (isReturMode && returType === 'EXCHANGE' && item.condition === 'GOOD') ? 'DAMAGED' : (item.condition || 'GOOD')
            };
        }));
    }, [isReturMode, returType]);

    // 🚀 THE FIFO DEBT ENGINE 
    const debtInfo = React.useMemo(() => {
        if (!customerName) return null;
        const custTrans = transactions.filter(t => 
            storeKey(t.customerName) === storeKey(customerName)
        /* by the exact second, like Receivables: `date` is only the DAY and the list arrives newest-first, so a payment
           made the same day as its sale used to be counted before the sale and thrown away (his 2026-11-03: Utang
           2.100.000 here, 1.050.000 in Receivables). No server time yet = just written = last. */
        ).sort((a, b) => (txSeconds(a) ?? Number.MAX_SAFE_INTEGER) - (txSeconds(b) ?? Number.MAX_SAFE_INTEGER));

        let debts = [];
        custTrans.forEach(t => {
            if (t.type === 'SALE' && t.paymentType === 'Titip') {
                /* tempo travels WITH its own debt. The orange panel used to work out "overdue"
                   from its own separate pass; now that both numbers come from this engine, the
                   per-sale due date has to live on the debt it belongs to — a shop can hold two
                   consignments agreed on different terms. */
                debts.push({
                    date: t.date,
                    remaining: t.total,
                    tempo: t.tempoDays || 7,
                    saleMs: t.timestamp?.seconds ? t.timestamp.seconds * 1000 : new Date(t.date).getTime()
                });
            }
            if (t.type === 'CONSIGNMENT_PAYMENT' || t.type === 'RETURN') {
                let deduction = debtCredit(t);   /* cash paid + the damaged goods handed back (revenueRule.js) */
                for (let i = 0; i < debts.length; i++) {
                    if (debts[i].remaining > 0) {
                        if (deduction >= debts[i].remaining) {
                            deduction -= debts[i].remaining;
                            debts[i].remaining = 0;
                        } else {
                            debts[i].remaining -= deduction;
                            deduction = 0;
                            break;
                        }
                    }
                }
            }
        });

        const activeDebts = debts.filter(d => d.remaining > 0.01);
        if (activeDebts.length === 0) return null;

        const totalDebt = activeDebts.reduce((sum, d) => sum + d.remaining, 0);
        const oldestDate = activeDebts[0].date;
        const diffTime = Math.abs(new Date() - new Date(oldestDate));
        const ageDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let status = 'GREEN';
        if (ageDays >= 14) status = 'RED';
        else if (ageDays >= 8) status = 'YELLOW';

        // Overdue means any UNPAID consignment is past its own agreed tempo.
        const now = Date.now();
        const isOverdue = activeDebts.some(d => now > (d.saleMs + (d.tempo * 86400000)));

        return { totalDebt, ageDays, status, oldestDate, isOverdue };
    }, [customerName, transactions]);

    /* 🚀 ONE debt number, not two. This screen used to work out what a store owes TWICE — the red
       "OWES" line from the FIFO engine above, and this panel from its own separate pass — and then
       showed both at once. They disagreed three ways:

         · RETURNS. The engine subtracts goods the store handed back. This pass ignored them, so
           returned goods never reduced what the store appeared to owe.
         · WHAT COUNTS. The engine counts a consignment SALE. This counted anything marked Titip,
           including record types that are not sales.
         · THE NAME. The engine now matches through storeKey; this compared raw lowercased names,
           so a stray trailing space made it a different shop. (Fixed app-wide in f1e3b28.)

       It reads the engine now. The overdue flag was the one thing this pass had that the engine
       did not, so the tempo moved onto each debt up there rather than being dropped.

       The `t.customer` fallback that used to be here is gone: no transaction in this codebase
       writes that field. */
    const selectedCustomerDebts = React.useMemo(() => ({
        totalDebt: debtInfo?.totalDebt || 0,
        isOverdue: debtInfo?.isOverdue || false
    }), [debtInfo]);

    // --- GEO-FENCE & NOO STATE ---
    const [selectedCustomerInfo, setSelectedCustomerInfo] = useState(draft?.selectedCustomerInfo ?? null);
    const [gpsStatus, setGpsStatus] = useState('idle'); 
    const [distanceToStore, setDistanceToStore] = useState(null);
    const [agentLocation, setAgentLocation] = useState(null);
    // every store inside the fence, nearest first, capped at two — see verifyLocation
    const [nearbyStores, setNearbyStores] = useState([]);
    /* null when the store has not been visited today. Otherwise 'me', or the name of whoever
       claimed it — shown as a banner rather than a dialog. See handleCustomerSelect. */
    const [revisitToday, setRevisitToday] = useState(null);
    /* Name of the agent this store belongs to, when it is not the one selling. Drives the
       banner AND the territoryOverride stamp on the saved sale. Null on a normal sale. */
    const [territoryClaim, setTerritoryClaim] = useState(null);
    /* Proximity duplicate guard for a NEW outlet. proximityHit is what to show; proximityAck
       holds the store NAME he already accepted as a different building, so an acknowledgement
       can never leak onto a different neighbour and needs no reset plumbing. See validateNoo. */
    const [proximityHit, setProximityHit] = useState(null);
    const [proximityAck, setProximityAck] = useState(null);
    const [manualOverride, setManualOverride] = useState(false);
    const [bypassState, setBypassState] = useState({ status: 'idle', id: null, photo: null });
    
    const [showNooModal, setShowNooModal] = useState(false);
    const [showSampleModal, setShowSampleModal] = useState(false);
    const [sampleForm, setSampleForm] = useState({ productId: '', qtyBks: 0, qtyBatang: 0 });
    
    /* never Grosir by default for a salesman: it is an ask an admin must answer (2026-10-21), so it has to be picked on purpose */
    const defaultNooTier = [...allowedTiers].reverse().find(t => t !== 'Grosir' || canConfirmGrosir(userRole)) || 'Retail';
    const [nooForm, setNooForm] = useState(draft?.nooForm || { phone: '', address: '', requestedTier: defaultNooTier, photoUrl: null });
    const fileInputRef = useRef(null);

    const scrollContainerRef = useRef(null);
    const [txProofPhoto, setTxProofPhoto] = useState(draft?.txProofPhoto ?? null);

    /* WHERE THE SALE PROOF MAY COME FROM. Not WHETHER there is one — `canSubmitSale` still
       refuses every sale without `txProofPhoto`, and that must never be weakened here.
       `false` means a live camera view and no file chooser at all; `true` means either.
       The matrix owns this, `canPickFromGallery` reads it, and the tier is only the fallback. */
    /* the live role comes from App as a prop; the user object is only a fallback, because the
       boss's user object is the raw Firebase user and has no role on it at all — read from
       there alone, tier 1 became tier 5 and got the camera lock (his screenshot, 2026-09-13) */
    const myRole = userRole || user?.userRole || user?.role;
    const galleryOk = canPickFromGallery(myRole);
    const [showProofCamera, setShowProofCamera] = useState(false);

    /* SAVE THE DRAFT. Debounced: localStorage.setItem is synchronous, and without the delay this
       would run on every keystroke carrying a few hundred KB of photo. An empty terminal DELETES
       the draft, which makes emptying the cart the discard button - no new control to explain. */
    useEffect(() => {
        const timer = setTimeout(() => {
            if (cart.length === 0 && !customerName.trim() && !txProofPhoto) {
                localStorage.removeItem(DRAFT_KEY);
                return;
            }
            const body = { uid: user?.uid || null, at: Date.now(), cart, customerName,
                selectedCustomerInfo, paymentMethod, lockedTier, tempoDays, isReturMode,
                returType, txProofPhoto, nooForm };
            try { localStorage.setItem(DRAFT_KEY, JSON.stringify(body)); }
            catch {
                /* The whole store is about 5 MB and a proof photo is a large slice of it. Losing
                   the photo is annoying; losing the basket is the thing he asked us to fix. */
                try {
                    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...body, txProofPhoto: null,
                        nooForm: { ...nooForm, photoUrl: null } }));
                    notify(tr('Basket saved, but the proof photo was too big to keep. Take it again before you deal.'));
                } catch { /* nothing left to try; the basket is still on screen, just not saved */ }
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [cart, customerName, selectedCustomerInfo, paymentMethod, lockedTier, tempoDays,
        isReturMode, returType, txProofPhoto, nooForm, user?.uid]);

    /* Every action must report. He has to know this basket is one he typed earlier and not a
       fresh screen, or a leftover line gets sold to the wrong shop. Once, on the restoring mount. */
    useEffect(() => {
        if (!draft) return;
        const n = draft.cart?.length || 0;
        const fill = { n, s: n === 1 ? '' : 's', shop: draft.customerName };
        notify(draft.customerName ? tr('Draft restored — {n} item{s} for {shop}. Empty the cart to discard it.', fill)
            : tr('Draft restored — {n} item{s}. Empty the cart to discard it.', fill));
    }, []);

    const handleTxPhotoCapture = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setTxProofPhoto(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // 🚀 FIX: Storefront photo for a brand-new NOO (Register New Outlet) registration.
    // Same client-side compress-to-base64 pattern as handleTxPhotoCapture above; feeds
    // nooForm.photoUrl, which submitNooRegistration/submitNooOnly save as storeImage.
    const handlePhotoCapture = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setNooForm(prev => ({ ...prev, photoUrl: canvas.toDataURL('image/jpeg', 0.6) }));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; 
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
    };

    const verifyLocation = (useLowAccuracy = false) => {
        setGpsStatus('checking');
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                /* through the ref: a fix can land after a render that changed the selection, and must judge the CURRENT one */
                (position) => applyFixRef.current(position.coords.latitude, position.coords.longitude),
                (error) => setGpsStatus('error'),
                // 🚀 Phase 8: maximumAge 0 forced a fresh satellite lock on every call — reusing a
                // fix from the last minute is exactly right for someone standing still at a shop.
                { enableHighAccuracy: !useLowAccuracy, timeout: 10000, maximumAge: 60000 }
            );
        } else setGpsStatus('error');
    };

    /* One GPS fix, judged: from the one-shot check above, or from the watch below that follows him while the terminal is open. */
    const applyFix = (lat, lon) => {
        setAgentLocation({ latitude: lat, longitude: lon });

        if (selectedCustomerInfo) {
            if (selectedCustomerInfo.latitude && selectedCustomerInfo.longitude) {
                const dist = calculateDistance(lat, lon, selectedCustomerInfo.latitude, selectedCustomerInfo.longitude);
                setDistanceToStore(Math.round(dist));
                const dynamicThreshold = bypassState.status === 'approved' ? 100 : 50;
                /* he walked on from a shop GPS picked for him, with nothing on the manifest: let it go so the
                   next shop can be found. Twice the fence, so drift while he stands in the doorway keeps it. */
                if (autoLockRef.current === selectedCustomerInfo.id && dist > dynamicThreshold * 2 && !cart.length && !givenLines.length) {
                    autoLockRef.current = null;
                    setCustomerName(''); setSelectedCustomerInfo(null); setLockedTier(null); setNearbyStores([]); setGpsStatus('idle');
                    return;
                }
                setGpsStatus(dist <= dynamicThreshold ? 'verified' : 'manual_override');
            } else {
                setGpsStatus('bypass'); 
            }
        } else if (!manualOverride && customers.length > 0) {
            /* Everything inside the fence, nearest first — not just the single
               closest. Two shops share a wall often enough in a pasar that picking
               the nearer one and offering no way out is how a sale lands on the
               wrong store. Capped at TWO by Aldi's call: two is a real situation,
               three is a menu, and beyond that he should search instead. */
            const inRange = customers
                .filter(c => c.latitude && c.longitude)   // a new shop is seen by the team at once (his 2026-10-21 rule); only its Grosir waits
                .map(c => ({ c, dist: calculateDistance(lat, lon, c.latitude, c.longitude) }))
                .filter(x => x.dist <= 50)
                .sort((a, b) => a.dist - b.dist);

            setNearbyStores(inRange.slice(0, 2).map(x => ({ ...x.c, _metres: Math.round(x.dist) })));

            if (inRange.length) {
                setDistanceToStore(Math.round(inRange[0].dist));
                handleCustomerSelect(inRange[0].c, Math.round(inRange[0].dist));
                autoLockRef.current = inRange[0].c.id;
                openArrival(inRange[0].c, Math.round(inRange[0].dist));
            } else setGpsStatus('idle');
        } else if (customerName.trim().length > 0) setGpsStatus('walk_in'); 
        else setGpsStatus('idle');
    };
    const applyFixRef = useRef(applyFix);
    applyFixRef.current = applyFix;

    /* Arrival has to NOTICE he arrived (his "whenever salesperson in range with the stores"): while the terminal is open the
       fix follows him - Journey's own watch (JourneyView.jsx) - and every 10 m he moves re-runs the fence check above. Off in
       Lite Mode like Journey's: battery is what Lite Mode is for, and the one-shot check still runs there. */
    useEffect(() => {
        if (!('geolocation' in navigator) || document.documentElement.classList.contains('lite-mode')) return undefined;
        let last = null;
        const id = navigator.geolocation.watchPosition((p) => {
            const { latitude: lat, longitude: lon } = p.coords;
            if (last && calculateDistance(last.lat, last.lon, lat, lon) < 10) return;
            last = { lat, lon };
            applyFixRef.current(lat, lon);
        }, () => {}, { enableHighAccuracy: true, maximumAge: 5000 });
        return () => navigator.geolocation.clearWatch(id);
    }, []);

    useEffect(() => { 
        if (selectedCustomerInfo) verifyLocation();
        else if (customerName.trim().length > 2) { const timer = setTimeout(() => verifyLocation(), 1000); return () => clearTimeout(timer); } 
        else if (!manualOverride && customers.length > 0) verifyLocation();
        else { setGpsStatus('idle'); setAgentLocation(null); }
    }, [selectedCustomerInfo, customerName, customers.length, manualOverride]);

    useEffect(() => {
        const targetName = sessionStorage.getItem('targetSalesCustomer');
        if (targetName && customers.length > 0) {
            const targetCust = customers.find(c => (c.name || '').toLowerCase() === targetName.toLowerCase());
            if (targetCust) setTimeout(() => handleCustomerSelect(targetCust), 600); 
            sessionStorage.removeItem('targetSalesCustomer'); 
        }
    }, [customers.length]);

    useEffect(() => {
        const handleClickOutside = (e) => { if (!e.target.closest('.manifest-dropdown-area')) setShowCustomerDropdown(false); };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside, { passive: true }); 
        return () => { document.removeEventListener("mousedown", handleClickOutside); document.removeEventListener("touchstart", handleClickOutside); };
    }, []);

    useEffect(() => { if (!allowedPayments.includes(paymentMethod)) setPaymentMethod(allowedPayments[0] || 'Cash'); }, [allowedPayments]);
    /* Ecer is an individual sale and cannot be a consignment - see the guard in
       useTransactionEngine. The tier is per cart line and can be changed AFTER the payment method
       was chosen, so this watches the cart rather than only the permission list. */
    useEffect(() => {
        if (paymentMethod === 'Titip' && cart.some(i => i.priceTier === 'Ecer')) {
            setPaymentMethod(allowedPayments.find(m => m !== 'Titip') || 'Cash');
        }
    }, [cart, paymentMethod, allowedPayments]);

    const suggestedCustomers = customers.filter(c => {
        if (!c.name.toLowerCase().includes(customerName.toLowerCase())) return false;
        return allowedTiers.includes(priceLevelOf(c));
    }).slice(0, 5);

    /* The merchant no longer speaks on add-to-cart - Aldi's call 2026-08-02, he appears on
       deal commit ONLY, so a 15-line basket stays silent until it is paid. The dialogue table
       this used to hold was verbatim Resident Evil 4 merchant lines and has been deleted.
       Callers are left in place: they sit on transaction paths and changing them buys nothing. */
    /* The cart chatter (add / expensive / customer lines, up to every 6 s) is GONE - his 2026-11-10 rule: *"if there is
       no voice when capybara shows up then dont show the capybara at all"*, and the chatter was the voice he called
       annoying. So no voice and no line: the merchant stays idle in the alcove until the deal. Same as his 2026-08-02
       call above. The callers stay (they sit on transaction paths); the function does nothing. */
    const triggerMerchantSpeak = () => {};

    /* "/" jumps to the search box, the way the prototype did it. Guarded against firing
       while the salesman is typing a customer name or a quantity — otherwise the key that
       finds a ware would eat a character out of whatever field he is already in. */
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== '/' || e.ctrlKey || e.altKey || e.metaKey) return;
            const t = e.target;
            const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
            if (typing) return;
            e.preventDefault();
            searchRef.current?.focus();
            searchRef.current?.select();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    /* THE TRAVELLING MERCHANT — Aldi's idea, and the right one.
       Pinning the alcove only helps while it is on screen at all; browse far enough down the
       shelf and his reaction plays somewhere nobody is looking. So when the cave leaves the
       viewport he steps out of it and reappears in the corner, and when it comes back he
       goes home.

       An IntersectionObserver rather than a scroll listener: the browser reports the crossing
       itself, so this costs nothing per frame, which matters on a list that is already
       animating twenty CSS boxes. */
    useEffect(() => {
        const el = alcoveRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver(
            ([entry]) => setAlcoveOut(!entry.isIntersecting),
            { threshold: 0.35 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    /* Unmounting the moment the cave returns would delete him mid-step. He is kept alive
       for the length of the leave animation instead, then removed. */
    useEffect(() => {
        /* B, 2026-11-12: he steps out only while he has something to say (a deal, a line). Standing in the corner
           the whole time the order is scrolled, he covered whatever was there - his "the capybara ... is blocking". */
        if (alcoveOut && merchantMood !== 'idle') { setFloatLeaving(false); setFloatShown(true); return; }
        if (!floatShown) return;
        setFloatLeaving(true);
        const t = setTimeout(() => { setFloatShown(false); setFloatLeaving(false); }, 300);
        return () => clearTimeout(t);
    }, [alcoveOut, floatShown, merchantMood]);

    /* Tell the app-wide mascot to stand down while our corner figure is up, or both are on
       screen at once — it peeks on its own 90-210s timer, which is why the duplicate was
       intermittent rather than constant. The cleanup releases it on unmount too: leaving the
       terminal with the corner figure showing would otherwise mute the mascot app-wide. */
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('CAPY_SUPPRESS', { detail: { on: floatShown } }));
    }, [floatShown]);
    useEffect(() => () => {
        window.dispatchEvent(new CustomEvent('CAPY_SUPPRESS', { detail: { on: false } }));
    }, []);

    /* WHO AM I, BY NAME — one answer for the five places that used to spell it themselves
       (the visit compare, the territory compare, the proof record, the receipt fallback, the
       route planner). The boss's name is what he typed in Settings, the field ReceiptPreview
       already prints; a motorist's is the Google display name; the front half of the email is
       the last resort, never the first. The nota read `ADIKARYASUKSES99` because it was. */
    const emailName = user?.email?.split('@')[0] || '';
    const myName = (isAdmin && appSettings?.adminDisplayName) || user?.displayName || emailName || '';
    /* the salesman named in a photo file the way the sale record names him (useTransactionEngine finalAgentName): his
       Fleet & Roster profile name, else myName. His 2026-10-27 "its not the agent name but the google name". */
    const photoAgent = motorists.find(m => m.id === agentProfileId)?.name || myName;
    /* MAY THIS SHOP TAKE THIS PACKAGE FROM ME? (vanBay bundleGate: off, no registered shop, an Ecer shop, a shop nobody
       assigned, a shop assigned to someone else, over the limit.) '' = yes. The card, the press and the save all ask here. */
    const gateOf = (b, taps = bundleUse[b.id]?.taps || 0) => bundleGate(b, { shop: selectedCustomerInfo, tier: lockedTier || (selectedCustomerInfo ? priceLevelOf(selectedCustomerInfo) : 'Ecer'), names: [photoAgent, myName], taps });

    const handleCustomerSelect = (cust, autoLockedDistance = null) => {
        autoLockRef.current = null;   // his pick from here on; applyFix marks a GPS pick AFTER this call
        const localToday = new Date().toLocaleDateString('en-CA');
        /* every name I have ever been stamped under: stores visited before the Settings name
           existed carry the email or display name, and must still read as mine */
        const meNames = [myName, user?.displayName, emailName]
            .filter(Boolean).map(s => String(s).trim().toLowerCase());
        const visitedBy = String(cust.lastVisitedBy || cust.lastVisitTag || '').trim();
        const iVisitedIt = !!visitedBy && meNames.some(me =>
            visitedBy.toLowerCase().includes(me) || me.includes(visitedBy.toLowerCase()));

        /* A REVISIT BY ME IS NOT A FRAUD SIGNAL. It used to raise the same blocking dialog as
           another agent's claim, and declining refused the selection — so after Aldi sold to a
           store, picking that store again did nothing at all: the name stayed as typed, the
           pinned ware never cleared, and there was no visible reason why. Worse, a browser
           with "prevent this page from creating more dialogues" ticked answers confirm() with
           false WITHOUT showing anything, so the block was often invisible.

           So the two cases split. Someone else securing the store keeps the hard gate — that
           is the anti-fraud case and it should be hard to walk past. My own second visit
           selects normally and reports itself in the brief instead, where it can be read
           rather than dismissed. */
        /* ⚠️ NO BLOCKING DIALOG HERE. window.confirm returns false — silently — in any browser
           where the user has ticked "prevent this page from creating more dialogues", and Aldi
           hits that constantly while testing. The symptom is brutal: selecting a store does
           NOTHING, with no message, no selection and no reason. Two of his three test stores
           behaved that way while a third worked, which is not a bug anyone can diagnose from
           the outside.

           A guard that fails closed and invisibly is worse than one that reports loudly. So
           the claim is recorded on the selection and shown in the brief as a standing banner,
           which cannot be suppressed, cannot be dismissed by reflex, and stays on screen for
           as long as the decision is live. */
        setRevisitToday(cust.lastVisit === localToday
            ? (iVisitedIt ? 'me' : (visitedBy || 'another agent'))
            : null);

        /* TERRITORY IS REPORTED, NEVER BLOCKED — and this was the last window.confirm in the
           file. The comment directly above already condemned dialogs for the revisit case, but
           this branch kept one: a browser with "prevent this page from creating more dialogues"
           ticked answers confirm() false without drawing anything, so the next line refused the
           selection and picking another agent's store did nothing at all, with no message. The
           guard failed closed and invisibly, which is the worst way for a guard to fail.

           Blocking is also the wrong policy here, decided 2026-08-07: the ranking carries no
           pay, so a block defends a motivation game rather than money; salesmen are meant to
           cover each other's routes, which a block punishes; and the owner test below is a
           SUBSTRING compare ("Adi" matches "Aditya"), so across ~100 salesmen it would refuse
           real owners routinely while a determined intruder walks straight through. A refused
           sale in front of a paying customer cannot be undone and teaches people to share
           logins — which destroys every attribution the block was supposed to protect. A
           wrongly-allowed sale is repairable by the existing store/debt transfer flow.

           So: report it here, stamp it on the sale (see proofPayload.territoryOverride), and
           let the sale happen. A wall can be walked around; a record cannot. */
        const currentAgentName = myName || 'Admin';
        const assignedAgent = String(cust.assignedAgent || '').trim();
        const unowned = !assignedAgent || assignedAgent.toLowerCase() === 'unassigned';
        // NB: "".includes("") is true, so the unowned case must short-circuit before the compare.
        const isAssignedToMe = unowned ||
            currentAgentName.toLowerCase().includes(assignedAgent.toLowerCase()) ||
            assignedAgent.toLowerCase().includes(currentAgentName.toLowerCase());
        setTerritoryClaim(isAssignedToMe ? null : assignedAgent);

        setCustomerName(cust.name);
        setShowCustomerDropdown(false);
        /* Drop any pinned ware. A pin outranks the brief in the rail, and since pins now
           persist until pressed again, one left over from earlier browsing would hide the
           brief for every customer chosen afterwards — which is exactly what it did. */
        setExamineItem(null);
        triggerMerchantSpeak('customer');
        setSelectedCustomerInfo(cust); 
        setBypassState({ status: 'idle', id: null, photo: null }); 

        window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));

        if (autoLockedDistance !== null) { setDistanceToStore(autoLockedDistance); setGpsStatus('verified'); }

        const mappedTier = priceLevelOf(cust);   // the same mapping the sale engine checks a Grosir line against

        setLockedTier(mappedTier);
        updateCartPricing(mappedTier);
    };

    const handleManualCustomerType = (e) => {
        const typed = e.target.value;
        setCustomerName(typed); setShowCustomerDropdown(true); setSelectedCustomerInfo(null);
        setLockedTier('Ecer'); updateCartPricing('Ecer'); setManualOverride(true); setBypassState({ status: 'idle', id: null, photo: null });
        // Typing over a chosen store un-chooses it, so the owner name must go too - else the
        // red bar and the territoryOverride stamp survive onto a hand-typed walk-in.
        setTerritoryClaim(null);

        // A typed full name picks its store when he FINISHES typing - finishCustomerTyping, below.
    };

    /* H2a — his report: "if i dont press anything from the dropdown then the stores wont be
       selected and it will just focused on that namebar". Selecting used to require a CLICK,
       so a salesman who typed a store's name in full still had no store chosen, and the rail
       fell back to the default dashboard because `customerSettled` needs selectedCustomerInfo.

       Typing the whole name picks the store, through the SAME handler the dropdown uses so the
       tier, territory bar, GPS lock and telemetry ping all still happen — a second selection
       path that skipped any of those is how the pricingTier bug got in.

       ⚠️ WHEN HE FINISHES, NOT ON EVERY KEYSTROKE (2026-10-20). His report: "when i have similar
       customer name for example HQ DEKET, then im trying to type HQ DEKET 1, on the moment i press
       HQ DEKET it suddently go out from the keyboard". The pick ran inside onChange, and picking
       closes this box - so the moment the text equalled one shop's name the box and its keyboard
       vanished and "HQ DEKET 1" could never be typed. Done, Enter and a tap outside the box all
       end the typing; the pick happens there.

       ONLY on exactly one match, and that is the important half. His book has three shops
       called "warung sembako sumber rejeki" 14.5 km apart; auto-picking the first would bill
       the wrong shop, which is real money and unpickable afterwards. Several matches means
       the dropdown stays open and he chooses. */
    /* 🚀 Compared through storeKey, so typing the clean name also finds a shop saved under the
       legacy "(Retail)" naming. The `exact.length === 1` rule below is NOT a convenience — it is
       the guard. Normalising makes MORE names collide, not fewer, so if two customer documents
       reduce to the same key the count is 2, nothing is auto-picked, and he chooses. */
    const finishCustomerTyping = () => {
        setShowCustomerDropdown(false);
        if (selectedCustomerInfo) return;   // already chosen from the list
        const needle = storeKey(customerName);
        if (needle) {
            const exact = customers.filter(c => storeKey(c.name) === needle);
            if (exact.length === 1) handleCustomerSelect(exact[0]);
        }
    };

    const updateCartPricing = (tier) => {
        if (!tier) return;
        setCart(prev => prev.map(item => {
            if (item.isIouFulfillment || item.bundlePriced) return item;   // a bundle price is the price, whatever the shop's tier
            const prod = item.product;
            let base = prod.priceRetail || 0;
            if (tier === 'Ecer') base = prod.priceEcer || 0;
            if (tier === 'Grosir') base = prod.priceGrosir || 0;

            let mult = 1;
            if (item.unit === 'Slop') mult = prod.packsPerSlop || 10;
            if (item.unit === 'Bal') mult = (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);
            if (item.unit === 'Karton') mult = (prod.balsPerCarton || 4) * (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);

            const calcPrice = (isReturMode && returType === 'EXCHANGE') ? 0 : (base * mult);
            return { ...item, priceTier: tier, calculatedPrice: calcPrice };
        }));
    };

    // the tier a NEW cart line starts at - a ware tap and a bundle share it, so the two can never price a pack differently
    const newLineTier = () => lockedTier || (allowedTiers.includes('Retail') ? 'Retail' : (allowedTiers.find(t => t !== 'Grosir') || 'Retail'));
    const addToCart = (product) => {
        if (!isReturMode && product.stock <= 0) return notify(`${tr('OUT OF STOCK IN VEHICLE!')}\n\n${tr("You cannot sell {name} because you don't have any in your car.", { name: product.name })}`);

        setCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing?.bundlePriced) {   // one more pack on a bundle line would go out at the bundle price
                notify(tr('{name} is in the cart at a bundle price - tap the bundle again for another, or save this deal first.', { name: product.name }));
                return prev;
            }
            if (existing) {
                if (!isReturMode && existing.qty >= product.stock) {
                    notify(`${tr('MAX STOCK REACHED!')}\n\n${tr('You only have {n} units of {name} in your vehicle.', { n: product.stock, name: product.name })}`);
                    return prev;
                }
                triggerMerchantSpeak((product.priceEcer || 0) > 100000 ? 'expensive' : 'add');
                return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
            }
            
            triggerMerchantSpeak((product.priceEcer || 0) > 100000 ? 'expensive' : 'add');
            const tierToUse = newLineTier();

            let basePrice = product.priceRetail || 0;
            if (tierToUse === 'Ecer') basePrice = product.priceEcer || 0;
            if (tierToUse === 'Grosir') basePrice = product.priceGrosir || 0;
            const calcPrice = (isReturMode && returType === 'EXCHANGE') ? 0 : basePrice;

            return [...prev, { 
                productId: product.id, name: product.name, qty: 1, unit: 'Bks', priceTier: tierToUse, calculatedPrice: calcPrice, product,
                condition: (isReturMode && returType === 'EXCHANGE') ? 'DAMAGED' : 'GOOD', 
                returnReason: '', otherReasonDetail: '', fulfillment: 'NOW'
            }];
        });
    };

    /* A FACTORY BUNDLE (the BUNDLES chip): one press = its cigarettes as ordinary cart lines at the shop's tier, plus its
       promo pieces in the give box. No price of its own (his "price is only recorded from the cigarette price only") unless
       a T1-T3 set one - see `priced` below; the engine sees a normal sale either way. A product already in the cart is
       summed in Bks. */
    const tierPrice = (p, tier) => ({ Ecer: p.priceEcer, Grosir: p.priceGrosir }[tier] ?? p.priceRetail) || 0;
    const applyBundle = (b) => {
        if (isReturMode) return notify(tr('{bundle} is for a sale - switch Retur off first.', { bundle: b.name }));
        const gate = gateOf(b);
        if (gate) return notify(gate);
        const chk = bundleCheck(b, inventory, promoVan, cart, give);
        if (!chk.ok) return notify(chk.why);
        // an Utang Barang line is priced Rp 0 - summing a bundle into it would hand the bundle's packs out free
        const owed = cart.find(i => i.isIouFulfillment && chk.lines.some(l => l.product.id === i.productId));
        if (owed) return notify(tr('{name} is in the cart as Utang Barang - save that deal first, then add {bundle}.', { name: owed.name, bundle: b.name }));
        const tier = newLineTier();
        /* A BUNDLE PRICE (set by T1-T3, matrix key set_bundle_price): its cigarettes go in at that price, spread over the
           lines by bundleUnitPrices, on lines marked `bundlePriced` that a tier change, a +1 or a qty edit leave alone.
           One line per product is what every cart path assumes, so a priced bundle never merges into a normal line (or
           the other way round) - the press says why instead. */
        const priced = Number(b.price) > 0;
        const clash = chk.lines.find(l => { const i = cart.find(c => c.productId === l.product.id);
            return i && (priced ? !(i.bundlePriced === b.id && i.unit === l.unit) : i.bundlePriced); });
        if (clash) return notify(priced
            ? tr('{name} is already in the cart at another price - save that deal first, then add {bundle}.', { name: clash.product.name, bundle: b.name })
            : tr('{name} is in the cart at a bundle price - save that deal first, then add {bundle}.', { name: clash.product.name, bundle: b.name }));
        const unitPrices = priced ? bundleUnitPrices(Number(b.price), chk.lines.map(l => ({ qty: l.qty, value: tierPrice(l.product, tier) * l.bks }))) : [];
        setCart(prev => chk.lines.reduce((list, l, n) => {
            const have = list.find(i => i.productId === l.product.id);
            if (priced) return have ? list.map(i => i === have ? { ...i, qty: i.qty + l.qty } : i)
                : [...list, { productId: l.product.id, name: l.product.name, qty: l.qty, unit: l.unit, priceTier: tier,
                    calculatedPrice: unitPrices[n], bundlePriced: b.id, product: l.product,
                    condition: 'GOOD', returnReason: '', otherReasonDetail: '', fulfillment: 'NOW' }];
            if (!have) return [...list, { productId: l.product.id, name: l.product.name, qty: l.qty, unit: l.unit, priceTier: tier,
                calculatedPrice: tierPrice(l.product, tier) * convertToBks(1, l.unit, l.product), product: l.product,
                condition: 'GOOD', returnReason: '', otherReasonDetail: '', fulfillment: 'NOW' }];
            const bks = convertToBks(have.qty, have.unit, l.product) + l.bks;
            return list.map(i => i === have ? { ...i, qty: bks, unit: 'Bks', mix: undefined, calculatedPrice: tierPrice(l.product, i.priceTier) } : i);
        }, prev));
        setGive(g => chk.gives.reduce((acc, x) => ({ ...acc, [x.productId]: (acc[x.productId] || 0) + x.qty }), g));
        setBundleUse(u => ({ ...u, [b.id]: { id: b.id, name: b.name, region: b.region || '', productIds: chk.lines.map(l => l.product.id), taps: (u[b.id]?.taps || 0) + 1 } }));
        triggerMerchantSpeak('add');
    };
    // the − on a package card: one package back out - its cigarettes, its free pieces, one off the count (bundleTakeBack)
    const removeBundle = (b) => {
        if (!bundleUse[b.id]?.taps) return;
        setCart(prev => bundleTakeBack(b, inventory, prev, {}, tierPrice).cart);
        setGive(g => bundleTakeBack(b, inventory, [], g, tierPrice).give);
        setBundleUse(u => { const { [b.id]: cur, ...rest } = u; return cur?.taps > 1 ? { ...rest, [b.id]: { ...cur, taps: cur.taps - 1 } } : rest; });
    };

    /* MIXED UNITS — "2 karton, 3 slop, 17 bungkus" of one product.
       Aldi's requirement: the salesman types what the customer said, in the customer's
       words, and never does the arithmetic himself.

       Deliberately NOT a change to how a line is stored. The line still holds ONE qty in
       ONE unit, exactly as before, so pricing, the stock guard, retur, IOU and the
       deduction path all keep working untouched. The four boxes are a CALCULATOR: they
       total to Bks, write that through updateCartItem, and keep the typed breakdown in a
       display-only `mix` field that no calculation ever reads. */
    /* Packing is per product and set in the master vault, so the multipliers must come from
       the ONE place the rest of the app already reads them — helpers.convertToBks. Its own
       10/20/4 fallbacks apply when a product has no packing saved. `prod || {}` keeps that
       fallback alive: convertToBks returns qty untouched for a missing product, which would
       silently price a Karton as one Bks. */
    const bksPerUnit = (prod) => ({
        Karton: convertToBks(1, 'Karton', prod || {}),
        Bal:    convertToBks(1, 'Bal',    prod || {}),
        Slop:   convertToBks(1, 'Slop',   prod || {}),
        Bks:    1,
    });

    const applyMix = (item, key, raw) => {
        const digits = String(raw).replace(/\D/g, '');
        const mix = { ...(item.mix || {}), [key]: digits };
        const per = bksPerUnit(item.product);
        const totalBks = Object.keys(per).reduce((a, u) => a + (Number(mix[u]) || 0) * per[u], 0);
        setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, mix } : i));
        updateCartItem(item.productId, 'unit', 'Bks');
        updateCartItem(item.productId, 'qty', totalBks);
    };

    const updateCartItem = (id, field, val) => {
        const priced = cart.find(i => i.productId === id && i.bundlePriced);
        if (priced && ['qty', 'unit', 'priceTier'].includes(field)) {
            return notify(tr('{name} is at a bundle price - tap the bundle again for another, or remove the line.', { name: priced.name }));
        }
        setCart(prev => prev.map(item => {
            if (item.productId === id) {
                let finalVal = val;
                
                if (field === 'qty' && (!isReturMode || (isReturMode && returType === 'EXCHANGE' && item.fulfillment === 'NOW'))) {
                    const maxStock = item.product.stock || 0;
                    if (val > maxStock) {
                        notify(`${tr('INSUFFICIENT VEHICLE STOCK!')}\n\n${tr('You only have {n} units of {name} available.', { n: maxStock, name: item.name })}`);
                        finalVal = maxStock;
                    }
                }

                const updated = { ...item, [field]: finalVal };
                if (field === 'condition' && finalVal === 'GOOD') {
                    updated.returnReason = ''; updated.otherReasonDetail = '';
                }

                if (updated.isIouFulfillment) return updated;

                const prod = item.product;
                let base = prod.priceRetail || 0;
                if (updated.priceTier === 'Grosir') base = prod.priceGrosir || 0;
                if (updated.priceTier === 'Ecer') base = prod.priceEcer || 0;
                
                let mult = 1;
                if (updated.unit === 'Slop') mult = prod.packsPerSlop || 10;
                if (updated.unit === 'Bal') mult = (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);
                if (updated.unit === 'Karton') mult = (prod.balsPerCarton || 4) * (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);
                
                updated.calculatedPrice = (isReturMode && returType === 'EXCHANGE') ? 0 : (base * mult);
                return updated;
            }
            return item;
        }));
    };

    // 🚀 THE IOU TEAMWORK ENGINE
    const handleFulfillIOU = (iou) => {
        const product = inventory.find(p => p.id === iou.productId);
        if (!product) return notify(tr('Product no longer exists in inventory!'));
        if (product.stock < iou.qty) return notify(tr("You don't have enough healthy stock in your vehicle to settle this Utang Barang!"));

        setCart(prev => [...prev, {
            productId: product.id, name: product.name, qty: iou.qty, unit: iou.unit,
            priceTier: 'Retail', calculatedPrice: 0, product,
            condition: 'GOOD', returnReason: '', otherReasonDetail: '', fulfillment: 'NOW',
            isIouFulfillment: true, iouId: iou.id 
        }]);
    };

   const handleBypassPhotoCapture = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6); 
                
                setBypassState({ status: 'uploading', id: null, photo: compressedDataUrl });
                try {
                    const masterUid = user?.uid || user?.id || 'default';

                    // 🚀 FIX: Route this photo through the same usePhotoStorage toggle as
                    // RestockVaultView/StockOpnameView/BranchWarehouseManager/AgentProfileView
                    // instead of always writing raw base64. Toggle off (default) behaves
                    // exactly as before — savePhotoAndGetReference just returns the base64
                    // string unchanged. Unlike the sale-proof photo, this one is never
                    // bundled into a writeBatch with other business data, so there's no
                    // atomicity trade-off here.
                    const storagePath = `artifacts/${appId}/users/${masterUid}/photos/bypass_${photoStamp()}_${nameTag(photoAgent)}_${nameTag(selectedCustomerInfo?.name || customerName)}.jpg`;
                    const photoToSave = await savePhotoAndGetReference(storage, compressedDataUrl, storagePath, appSettings?.usePhotoStorage);

                    const payload = {
                        storeId: String(selectedCustomerInfo?.id || 'UNKNOWN'),
                        storeName: String(selectedCustomerInfo?.name || customerName || 'Unknown Store'),
                        salesmanId: String(user?.realUid || user?.uid || user?.id || 'UNKNOWN'),
                        salesmanName: String(myName || 'Field Agent'),
                        latitude: Number(agentLocation?.latitude || 0), longitude: Number(agentLocation?.longitude || 0),
                        distance: Number(distanceToStore || 0), photoData: String(photoToSave),
                        status: 'PENDING', timestamp: new Date().toISOString(), createdAt: serverTimestamp()
                    };

                    const dbPath = `artifacts/${appId}/users/${masterUid}/gps_bypasses`;
                    const bypassRef = await addDoc(collection(db, dbPath), payload);
                    
                    await addDoc(collection(db, `artifacts/${appId}/users/${masterUid}/notifications`), {
                        title: "📡 GEOFENCE BYPASS REQUEST",
                        message: `${payload.salesmanName} is requesting a 100m geofence bypass for ${payload.storeName} (${payload.distance}m away).`,
                        type: "GPS_BYPASS", read: false, isRead: false, timestamp: serverTimestamp(),
                        agentId: "ADMIN", bypassId: String(bypassRef.id), linkToTab: "fleet" 
                    });

                    setBypassState({ status: 'pending', id: bypassRef.id, photo: compressedDataUrl });
                    if (triggerCapy) triggerCapy("Bypass proof sent to HQ. Awaiting approval...");

                    const unsub = onSnapshot(doc(db, dbPath, bypassRef.id), (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            if (data.status === 'APPROVED') {
                                setBypassState(prev => ({ ...prev, status: 'approved' })); setGpsStatus('verified'); 
                                if (triggerCapy) triggerCapy("HQ Approved! Geofence widened to 100m. 🟢");
                                unsub();
                            } else if (data.status === 'REJECTED') {
                                setBypassState({ status: 'rejected', id: null, photo: null }); notify(tr('HQ Rejected your Bypass Request.')); unsub();
                            }
                        }
                    }, (err) => {
                        // 🚀 FIX: Without this, a denied read left the sale screen stuck on
                        // "Awaiting approval..." forever with no explanation.
                        console.warn("GPS bypass approval listener:", err.code);
                        setBypassState({ status: 'idle', id: null, photo: null });
                        notify(tr('Could not check bypass approval status. Please try again.'));
                    });
                } catch (err) { notify(tr('Failed to submit bypass request: {error}', { error: err.message || tr('Network Error') })); setBypassState({ status: 'idle', id: null, photo: null }); }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const validateNoo = () => {
        if (!nooForm.phone || !nooForm.photoUrl) return notify(tr('Phone number and Photo are required to register a new outlet!'));
        // the receipt goes to this number on WhatsApp - a number WhatsApp cannot open is not saved (his 2026-10-20 "a must")
        if (!waNumber(nooForm.phone)) return notify(tr('"{phone}" is not a WhatsApp number. Type the owner\'s mobile number, for example 0812 3456 7890.', { phone: nooForm.phone }));
        if (customers.find(c => c.name.toLowerCase().trim() === customerName.toLowerCase().trim())) return notify(`${tr('DUPLICATE DETECTED!')}\n\n${tr('A store with this name is already in the database.')}`);
        
        let tooClose = null; let tooCloseDistance = Infinity;
        if (agentLocation) {
            customers.forEach(c => {
                if (c.latitude && c.longitude) {
                    const dist = calculateDistance(agentLocation.latitude, agentLocation.longitude, c.latitude, c.longitude);
                    if (dist < 15 && dist < tooCloseDistance) { tooClose = c; tooCloseDistance = dist; }
                }
            });
        }
        /* Same failure as the territory guard, same fix. This was a window.confirm, so on a
           browser with dialogs suppressed it returned false without drawing anything and
           registering a new outlet near an existing one failed silently, with no message and
           no reason. Now the hit is rendered inside the NOO modal and he clears it with a real
           button. proximityAck stores the NAME he accepted, so the acknowledgement cannot leak
           onto a different neighbour later and no reset-on-close plumbing is needed. */
        if (tooClose && proximityAck !== tooClose.name) {
            setProximityHit({ name: tooClose.name, metres: Math.round(tooCloseDistance) });
            return false;
        }
        setProximityHit(null);
        return true;
    };

    /* rings the admins' bell for a held Grosir; the shop is already saved, so a failed bell says so and is not a failed save */
    const askGrosir = (shopName, ownerId) =>
        addDoc(collection(db, `artifacts/${appId}/users/${ownerId}/notifications`), { ...grosirRequestNotice(myName || 'A salesman', shopName), timestamp: serverTimestamp() })
            .catch(() => notify(tr("{shop} is saved, but the admin's bell could not be rung. Tell your admin to look at Grosir requests in Customer Directory.", { shop: shopName })));

    /* the shop photo as a Storage file when the switch is on (fix A, his 2026-10-27 "use option A to minimize the cost"):
       every phone downloads every shop record on every open, so a photo inside one is paid for on every open. Online
       only - offline an upload would sit out its retries. A failed upload keeps the photo inside; the shop still saves. */
    const shopPhoto = () => isOnline ? fileOrKeepPhoto(storage, nooForm.photoUrl, `artifacts/${appId}/users/${user?.uid || user?.id || 'default'}/photos/shop_${photoStamp()}_${nameTag(photoAgent)}_${nameTag(customerName)}.jpg`, appSettings?.usePhotoStorage) : nooForm.photoUrl;

    const submitNooRegistration = async () => {
        if (!validateNoo()) return;
        try {
            const userId = dataOwnerId;   // see dataOwnerId — must match where `customers` was read from
            const newRef = doc(collection(db, `artifacts/${appId}/users/${userId}/customers`));
            const newStoreData = {
                id: newRef.id, name: customerName.toUpperCase().trim(), phone: nooForm.phone, address: nooForm.address || "GPS Locked via NOO Form",
                tier: 'UNRANKED', ...grosirHold(nooForm.requestedTier, userRole), storeType: 'Retailer', latitude: agentLocation?.latitude, longitude: agentLocation?.longitude,
                status: 'Active', visitFreq: 7, storeImage: await shopPhoto(), createdAt: new Date().toISOString(),
                ...areaFromPin(agentLocation?.latitude, agentLocation?.longitude, mapBorders)   // province / region / city, in capitals
            };
            await setDoc(newRef, newStoreData);
            if (newStoreData.requestedTier) askGrosir(newStoreData.name, userId);
            if (logAudit) logAudit("NOO_REGISTERED_DIRECT", `Registered new NOO outlet: ${customerName}`);
            if (triggerCapy) triggerCapy(newStoreData.requestedTier ? `Registered at Retail - this sale is Retail, Grosir waits for an admin to confirm. 📍 ${areaText(newStoreData)}` : `Target Data Secured! 📍 ${areaText(newStoreData)}`);
            window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));

            /* the price it was SAVED at, not the one asked for: a held Grosir sells at Retail (his 2026-10-21 "A") */
            setSelectedCustomerInfo(newStoreData); setLockedTier(newStoreData.priceTier); updateCartPricing(newStoreData.priceTier);
            setShowNooModal(false); setGpsStatus('verified'); triggerMerchantSpeak('expensive');
            /* HIS ASK (G6): "maybe add some conveniency after we register new NOO, like close the
               manifest paper for example". The outlet is registered and the next thing he does is
               pick wares, so hand the screen back to the wares list instead of leaving the paper
               covering it. Safe because the wares column says who he is selling to, and the tab
               carries the manifest's count. */
            setManifestOpen(false);
        } catch (e) { notify(tr('Failed to save NOO: {error}', { error: e.message })); }
    };

    // 🚀 FIX: "Register Only (No Sale)" button had no handler at all — undefined
    // reference, second crash in this same modal. Registers the outlet exactly like
    // submitNooRegistration, but does NOT lock cart pricing or advance into a sale.
    const submitNooOnly = async () => {
        if (!validateNoo()) return;
        try {
            const userId = dataOwnerId;   // see dataOwnerId — must match where `customers` was read from
            const newRef = doc(collection(db, `artifacts/${appId}/users/${userId}/customers`));
            const newStoreData = {
                id: newRef.id, name: customerName.toUpperCase().trim(), phone: nooForm.phone, address: nooForm.address || "GPS Locked via NOO Form",
                tier: 'UNRANKED', ...grosirHold(nooForm.requestedTier, userRole), storeType: 'Retailer', latitude: agentLocation?.latitude, longitude: agentLocation?.longitude,
                status: 'Active', visitFreq: 7, storeImage: await shopPhoto(), createdAt: new Date().toISOString(),
                ...areaFromPin(agentLocation?.latitude, agentLocation?.longitude, mapBorders)   // province / region / city, in capitals
            };
            await setDoc(newRef, newStoreData);
            if (newStoreData.requestedTier) askGrosir(newStoreData.name, userId);
            if (logAudit) logAudit("NOO_REGISTERED_ONLY", `Registered new NOO outlet (no sale this visit): ${customerName}`);
            if (triggerCapy) triggerCapy(newStoreData.requestedTier ? `Outlet registered at Retail - Grosir waits for an admin to confirm. 📍 ${areaText(newStoreData)}` : `Outlet registered! No sale this visit. 📍 ${areaText(newStoreData)}`);
            window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));

            setShowNooModal(false);
            setNooForm({ phone: '', address: '', requestedTier: defaultNooTier, photoUrl: null });
            setManifestOpen(false);   // same convenience as the register-and-sell path above
        } catch (e) { notify(tr('Failed to save NOO: {error}', { error: e.message })); }
    };

    const handleDeploySample = async () => {
        const qtyBks = parseInt(sampleForm.qtyBks) || 0;
        const qtyBatang = parseInt(sampleForm.qtyBatang) || 0;
        if (qtyBks === 0 && qtyBatang === 0) return notify(tr('Enter a valid quantity to sample.'));
        if (!sampleForm.productId) return notify(tr('Please select a product.'));

        const product = inventory.find(p => p.id === sampleForm.productId);
        const sp = product?.sticksPerPack || 16;
        const totalQtyDecimal = qtyBks + (qtyBatang / sp);

        if ((product.stock || 0) < totalQtyDecimal) return notify(`${tr('INSUFFICIENT STOCK!')}\n\n${tr('You only have {n} units of {name} available in your vehicle.', { n: product.stock, name: product.name })}`);

        setIsProcessingSale(true);
        try {
            const masterUid = user?.uid || user?.id || 'default';
            const sourceId = agentProfileId || user?.agentId || 'VAULT';

            await runTransaction(db, async (t) => {
                if (sourceId !== 'VAULT') {
                    const agentRef = doc(db, `artifacts/${appId}/users/${masterUid}/motorists`, sourceId);
                    const agentDoc = await t.get(agentRef);
                    if (agentDoc.exists()) {
                        const agentData = agentDoc.data();
                        let updatedCanvas = [...(agentData.activeCanvas || [])];
                        const canvasIdx = updatedCanvas.findIndex(c => c.productId === product.id);
                        if (canvasIdx === -1) throw "Product not found in your vehicle!";
                        
                        let cItem = updatedCanvas[canvasIdx];
                        /* 🚀 FIX: this chain stopped at Bal, so a van row counted in Karton was
                           treated as single packs. convertToBks knows all four sizes. */
                        const mCanvas = convertToBks(1, cItem.unit, product);
                        const newCanvasBks = (cItem.qty * mCanvas) - totalQtyDecimal;
                        if (newCanvasBks < 0) throw "Not enough stock in your vehicle!";
                        updatedCanvas[canvasIdx] = { ...cItem, qty: newCanvasBks / mCanvas };
                        
                        /* pita cukai OFF in Settings (his 2026-11-03 "they just giveaway sampling with all the pita cukai
                           attached on them"): the sample keeps its stamps, so no stamp debt opens */
                        if (appSettings?.cukaiReturn !== false) {
                            let currentDebts = agentData.cukaiDebts || {}; currentDebts[product.id] = (currentDebts[product.id] || 0) + totalQtyDecimal;
                            t.update(agentRef, { activeCanvas: updatedCanvas.filter(c => c.qty > 0), cukaiDebts: currentDebts });
                        } else t.update(agentRef, { activeCanvas: updatedCanvas.filter(c => c.qty > 0) });
                    }
                } else {
                    const prodRef = doc(db, `artifacts/${appId}/users/${masterUid}/products`, product.id);
                    const prodDoc = await t.get(prodRef);
                    if (prodDoc.exists()) {
                        const newStock = (prodDoc.data().stock || 0) - totalQtyDecimal;
                        if (newStock < 0) throw "Not enough stock in Vault!";
                        t.update(prodRef, { stock: newStock });
                    }
                }

                t.set(doc(collection(db, `artifacts/${appId}/users/${masterUid}/samplings`)), {
                    date: getLocalDayKey(), productId: product.id, productName: product.name,
                    qty: totalQtyDecimal, unit: 'Bks', sticksPerPack: sp, reason: customerName.trim(), note: 'POS Quick Sample', sourceId: sourceId, timestamp: serverTimestamp()
                });
            });

            if (logAudit) logAudit("SAMPLE_DEPLOYED", `Gave ${totalQtyDecimal.toFixed(2)} Bks of ${product.name} to ${customerName}`);
            if (triggerCapy) triggerCapy(`Sample deployed to ${customerName}! Pita Cukai recorded. 🎁`);
            window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));

            setShowSampleModal(false); setSampleForm({ productId: '', qtyBks: 0, qtyBatang: 0 });
        } catch (err) { notify(tr('Failed to deploy sample: {error}', { error: String(err) })); } finally { setIsProcessingSale(false); }
    };

    /* Clearing the terminal after a deal. Extracted because a sale that COMMITS and then hits a
       failure in a later step must also clear — otherwise the cart survives, the agent is told
       "Transaction Failed", and he presses MAKE DEAL again on a sale that already went through. */
    const resetTerminalAfterDeal = () => {
        setCart([]); setCustomerName(""); setLockedTier(null); setSelectedCustomerInfo(null);
        setGive({}); setBundleUse({}); setGiveOpen(false);
        setGpsStatus('idle'); setAgentLocation(null); setTxProofPhoto(null);
        setIsReturMode(false); setManualOverride(false); setReturType('EXCHANGE');
        setNooForm({ phone: '', address: '', requestedTier: defaultNooTier, photoUrl: null });
        // territoryClaim is only ever written by handleCustomerSelect. A walk-in sale typed by
        // hand never calls it, so without this the PREVIOUS customer's owner name stays in state
        // and stamps territoryOverride on an innocent sale. proximityAck: same reason.
        setTerritoryClaim(null); setProximityHit(null); setProximityAck(null);
    };

    const handleFinalDeal = async () => {
        if ((cart.length === 0 && !givenLines.length) || !customerName.trim() || !txProofPhoto || isProcessingSale) return;
        // the shop can be changed AFTER a package went in: the same gate once more, on what the order holds now
        const refused = isReturMode ? '' : bundles.map(b => (bundleUse[b.id]?.taps > 0 ? gateOf(b, bundleUse[b.id].taps - 1) : '')).find(Boolean);
        if (refused) return notify(`${refused}\n\n${tr('Take the package out of the order first: press − on it under BUNDLES.')}`);
        setIsProcessingSale(true);
        
        const finalCust = customerName.trim();
        const finalCart = [...cart];
        const finalGive = givenLines;
        const finalTotal = isReturMode && returType === 'EXCHANGE' ? 0 : cartTotal;

        let committed = false;   // see the catch: a post-commit failure must not read as "failed"

        // The company owes nothing back on a completed sale, so a cash refund is a granted
        // privilege, not a default one. Hiding the switch is not enough on its own — returType
        // can still be BUYBACK from before the grant was revoked.
        if (isReturMode && returType === 'BUYBACK' && !allowCashRefund) {
            return notify(tr('You do not have clearance to refund cash. Use Exchange (Tukar), or ask an admin to grant Cash Refund in Fleet & Roster.'));
        }

        const isGiveaway = cart.length === 0;   // promo pieces only - the engine saves it as type GIVEAWAY, Rp 0
        const displayMethod = isGiveaway ? 'Promo Giveaway' : isReturMode ? (returType === 'EXCHANGE' ? 'Tukar Ganti' : 'Retur/BS') : (cart.every(i => i.isIouFulfillment) ? 'IOU Fulfillment' : paymentMethod);

        let dbMethod = paymentMethod;
        let txType = 'SALE';

        if (isGiveaway) {
            dbMethod = 'Promo Giveaway';
            txType = 'GIVEAWAY';
        } else if (isReturMode) {
            if (returType === 'EXCHANGE') {
                dbMethod = 'Tukar Ganti'; 
                txType = 'SALE';   
            } else {
                dbMethod = 'Retur/BS'; 
                txType = 'RETUR';      
            }
        } else if (cart.every(i => i.isIouFulfillment)) {
            dbMethod = 'Cash';
            txType = 'SALE';
        }

        try {
            const isFormalNoo = selectedCustomerInfo?.isNooRegistration;
            const newStorePayload = isFormalNoo ? selectedCustomerInfo : null;

            // 🚀 FIX: Route this photo through the same usePhotoStorage toggle as the
            // GPS-bypass photo above — online path only. Unlike the bypass photo, this
            // one IS bundled into the sale's writeBatch (useTransactionEngine.js), so a
            // Storage failure must never block the sale: catch it and fall back to
            // today's raw base64 behavior. The offline path never reaches here with
            // navigator.onLine true, so it stays pure base64 with zero Storage attempt.
            let finalPhotoData = txProofPhoto;
            if (isOnline) {
                try {
                    const masterUid = user?.uid || user?.id || 'default';
                    const storagePath = `artifacts/${appId}/users/${masterUid}/photos/sale_${photoStamp()}_${nameTag(photoAgent)}_${nameTag(customerName)}.jpg`;
                    finalPhotoData = await savePhotoAndGetReference(storage, txProofPhoto, storagePath, appSettings?.usePhotoStorage);
                } catch (photoErr) {
                    console.warn("Sale-proof photo upload failed, falling back to base64:", photoErr);
                    finalPhotoData = txProofPhoto;
                }
            }

            const proofPayload = {
                photoData: finalPhotoData, latitude: agentLocation?.latitude || 0, longitude: agentLocation?.longitude || 0,
                timestamp: new Date().toISOString(), tempoDays: dbMethod === 'Titip' ? tempoDays : null,
                isRetur: isReturMode, type: txType,
                /* Whose store this really was, when it was not this salesman's. Null on a normal
                   sale. This single field replaced the territory block: nobody is stopped, but
                   every crossing is on the record permanently and can be listed later. */
                territoryOverride: territoryClaim || null,
                /* OFFER RESULTS (his 2026-10-27 "sales record performance for the offer ... check which strategy work best in
                   the market"): the offers tapped into this deal whose cigarettes are still in the cart. */
                offers: isReturMode ? [] : Object.values(bundleUse).filter(o => o.productIds.every(id => finalCart.some(i => i.productId === id)))
            };

            capyHoldForSale();   // the save's own news line must not talk over the sale line (two voices at once)
            const trueAgentName = await onProcessSale(finalCust, dbMethod, finalCart, newStorePayload, proofPayload, finalGive);
            committed = true;   // everything past this point is POST-commit: the sale already exists
            /* the demo's mission line ticks on the SAVED deal (DemoMission.jsx): a sale is step 4; a retur carrying a damaged
               pack is step 5 - the pack that rides in the van's quarantine until the EOD takes it to the Master Vault */
            if (IS_DEMO && !isReturMode && !isGiveaway) window.dispatchEvent(new CustomEvent('kpm-mission', { detail: { step: 4, total: finalTotal, to: finalCust } }));
            if (IS_DEMO && isReturMode && finalCart.some(i => i.condition === 'DAMAGED')) window.dispatchEvent(new CustomEvent('kpm-mission', { detail: { step: 5, to: finalCust,
                bks: finalCart.filter(i => i.condition === 'DAMAGED').reduce((s, i) => s + convertToBks(i.qty, i.unit, i.product), 0) } }));
            const agentFallback = typeof trueAgentName === 'string' ? trueAgentName : (myName || 'Admin');

            /* THE RECEIPT COMES FIRST, and the button is released with it. Everything below this
               point - the IOU ledger, the tier auto-promoter - is optional bookkeeping that talks
               to Firestore, and on 2026-08-20 it hung on a write that never resolves and took the
               receipt with it: the sale was saved, the stock was cut, and the screen sat on
               PROCESSING forever. A finished sale must never wait for optional work.

               Safe to move: every value below is a local or a state binding captured when this
               handler was created, so resetTerminalAfterDeal() cannot pull them out from under
               the bookkeeping that still has to run. */
            setReceiptData({
                customer: finalCust, shop: selectedCustomerInfo, method: paymentLabel(displayMethod), items: finalCart, given: finalGive, total: finalTotal,
                date: new Date().toLocaleString('id-ID'), agentName: agentFallback 
            });

            window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));

            resetTerminalAfterDeal();
            // The merchant has no permanent space on screen - he shows up on a committed
            // deal and leaves, borrowing CapybaraMascot's slide-in/out. Deal commit ONLY:
            // never on add-to-cart, so a 15-line basket stays silent until it is paid.
            // Line is original writing; the old one was a direct Resident Evil 4 quote.
            const DEAL_LINES = [
                /* 2-3 words: his 2026-11-11 'the conversation when sales done is too long 2-3 words is enough' */
                "Good deal!",
                "Nice sale!",
                "Deal done!",
                "Well sold!",
            ];
            const line = DEAL_LINES[Math.floor(Math.random() * DEAL_LINES.length)];
            setMerchantMood("deal");
            setMerchantLine(line);          // the alcove bubble, for the desktop path
            // Committing the sale IS the user gesture browsers require before audio can
            // play, so unlock here. The signing sound comes first and the mumble follows it
            // rather than landing on top - two sounds at the same instant read as one mess.
            unlockSounds().then(() => {
                playSound('saleDone');
                /* after the 1.6 s cha-ching, not on top of it (his 2026-11-10 pick) */
                setTimeout(() => { if (capyMaySpeak('sale')) speakMumble(line, { mood: 'excited' }); }, 1700);
            });
            // DESKTOP has the alcove, which is already showing him: a corner mascot as well
            // would be two merchants and two coins on one screen. Below lg he has no alcove,
            // so the corner appearance is the only way he can react at all.
            if (window.innerWidth < 1024) {
                window.dispatchEvent(new CustomEvent('CAPY_COMMS', {
                    detail: { message: line, sprite: 'kpm-merch-deal' }
                }));
            }
            /* His line is deliberately NOT cleared here — the receipt is still open and is
               showing it. The alcove bubble keys off the mood, so it goes quiet on schedule
               either way. */
            /* 7.6 s, not 3: the thumbs-up clip (2026-11-11) is a gesture of that length - at 3 s he was cut off with
               his thumb in the air, while his line (spoken from 1.7 s) was still playing. Now he lowers his hand and
               is standing when idle takes over. */
            setTimeout(() => setMerchantMood("idle"), 7600);
            setIsProcessingSale(false);

         
            const generatedIOUs = finalCart.filter(i => isReturMode && returType === 'EXCHANGE' && i.fulfillment === 'IOU').map(i => ({
                id: `IOU_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
                productId: i.productId, name: i.name, qty: i.qty, unit: i.unit,
                date: new Date().toISOString(), agentName: agentFallback
            }));
            const fulfilledIOUIds = finalCart.filter(i => i.isIouFulfillment).map(i => i.iouId);
            
            if (selectedCustomerInfo && (generatedIOUs.length > 0 || fulfilledIOUIds.length > 0)) {
                const userId = dataOwnerId;   // see dataOwnerId — must match where `customers` was read from
                const custRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, selectedCustomerInfo.id);
                const custSnap = await getDoc(custRef);
                if (custSnap.exists()) {
                    let currentIOUs = custSnap.data().pendingIOUs || [];
                    currentIOUs = currentIOUs.filter(iou => !fulfilledIOUIds.includes(iou.id));
                    currentIOUs = [...currentIOUs, ...generatedIOUs];
                    await updateDoc(custRef, { pendingIOUs: currentIOUs });
                }
            }

            // 🛑 REMOVED DIRECT CLIENT-SIDE MOTORISTS WRITES TO BYPASS FIRESTORE PERMISSION LOCKS 🛑
            // Forensic data is perfectly secured inside the transactions document layout.
            // Agent Inventory will dynamically read from the transaction ledger instead.

            /* THE SHOP AFTER A SALE - his "make sure that both features works well especially the leveling system that we
               design" (2026-11-09). Two writes, each told when it fails: the visit date always, then the level from the
               owner's targets (utils/storeLevel.js). It was ONE write inside `if (rules)`: no targets saved = no visit date
               for anyone, every salesman (T3-T6) was refused reading the targets (rules CHANGE 27), the targets were checked
               against the PRICE levels so none ever counted, and a fixed table scored this one sale - so no salesman's sale
               ever touched the shop, and an owner's small sale could drop a Mythic shop to Unranked. */
            if (isOnline && !isReturMode && !isGiveaway && !finalCart.some(i => i.isIouFulfillment)) {
                const userId = dataOwnerId;   // see dataOwnerId — must match where `customers` was read from
                let shopRef = null;
                try {
                    const storeId = selectedCustomerInfo?.id;
                    if (storeId && storeId !== 'NOO_TEMP' && !isFormalNoo) {
                        shopRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, storeId);
                    } else {
                        if (isFormalNoo) await new Promise(resolve => setTimeout(resolve, 1500));
                        const qSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/customers`));
                        const foundDoc = qSnap.docs.find(d => (d.data()?.name || '').trim().toLowerCase() === finalCust.toLowerCase());
                        if (foundDoc) shopRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, foundDoc.id);
                    }
                    if (shopRef) {
                        const localToday = new Date().toLocaleDateString('en-CA');
                        await updateDoc(shopRef, { lastVisit: localToday, lastVisitedBy: agentFallback, updatedAt: serverTimestamp() });
                        const localCust = customers.find(c => c.id === shopRef.id || (c.name || '').toLowerCase() === finalCust.toLowerCase());
                        if (localCust) { localCust.lastVisit = localToday; localCust.lastVisitedBy = agentFallback; }
                    }
                } catch (e) {
                    console.error('Visit date not saved:', e);
                    notify(tr("Sale saved. The shop's visit date could not be saved."));
                    shopRef = null;
                }
                const names = nameVariants(finalCust);
                if (shopRef && levels.length && names.length) {
                    try {
                        const rulesSnap = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/appSettings`, 'tierRules'));
                        const rules = rulesSnap.exists() ? rulesSnap.data().rules : null;
                        if (rules) {
                            // ponytail: the shop's whole sales history per sale (a one-field query, no index to deploy); add a (customerName, timestamp) index when one shop passes ~1k sales
                            const hist = await getDocs(query(collection(db, `artifacts/${appId}/users/${userId}/transactions`), where('customerName', 'in', names)));
                            const { level } = earnedLevel({ rules, ladder: levels, sales: hist.docs.map(d => d.data()), shopName: finalCust, products: inventory });
                            const shopSnap = await getDoc(shopRef);
                            const up = nextLevel(shopSnap.exists() ? shopSnap.data().tier : null, level, levels);
                            if (up) {
                                await updateDoc(shopRef, { tier: up, updatedAt: serverTimestamp() });
                                if (triggerCapy) triggerCapy(`Level Up! ${finalCust} earned ${up}. 🚀`);
                            }
                        }
                    } catch (e) {
                        console.error('Shop level not updated:', e);
                        notify(tr("Sale saved. The shop's level could not be updated."));
                    }
                }
            }

        } catch (error) {
            if (committed) {
                /* The sale is ALREADY in the database. Saying "failed" here is what made agents
                   press MAKE DEAL again and bill the customer twice, because the cart was still
                   on screen. Report the truth and clear the terminal. */
                console.error("Post-commit step failed:", error);
                notify(tr('Sale SAVED. A follow-up step failed (Utang Barang record or store update). Do NOT repeat this sale - tell the admin.'));
                resetTerminalAfterDeal();
            } else {
                notify(tr('Transaction Failed! Please try again.'));
            }
        }
        finally { setIsProcessingSale(false); }
    };

    /* ------------------------------------------------------------------
       MANIFEST PANEL (phone) — pulled sideways by its tab, 2026-10-31.

       Two rules carried over from the bottom drawer it replaced, because they
       were fixes for bugs the HTML prototype actually shipped:
         - move/up/cancel bind to `window`, never to the tab: a finger that
           leaves the tab mid-pull must still end the gesture.
         - a real pull arms a 120ms swallow for the synthetic click that
           follows it, or that click lands on whatever ware sits under the
           finger and opens it - and on the tab, toggling it straight back.
       A press that never moved is left to the tab's own onClick, so a tap and
       the keyboard both open and close it. Never a swipe from the screen edge:
       Safari on an iPhone uses that one for "back".
       ------------------------------------------------------------------ */
    const gripRef = useRef(null);       // the panel: its width is how far a pull can open it
    const ghostUntilRef = useRef(0);

    useEffect(() => {
        const swallowGhostClick = (e) => {
            if (Date.now() < ghostUntilRef.current) { e.stopPropagation(); e.preventDefault(); }
        };
        document.addEventListener('click', swallowGhostClick, true);
        return () => document.removeEventListener('click', swallowGhostClick, true);
    }, []);

    const startManifestPull = (e) => {
        const panelW = gripRef.current?.offsetWidth || 320;
        const from = e.clientX, wasOpen = manifestOpen;
        const at = (x) => Math.max(0, Math.min(panelW, (wasOpen ? panelW : 0) + x - from));
        let moved = false;
        const onMove = (ev) => {
            if (!moved && Math.abs(ev.clientX - from) < 6) return;
            moved = true;
            setPullX(at(ev.clientX));
        };
        const onEnd = (ev) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onEnd);
            window.removeEventListener('pointercancel', onEnd);
            if (!moved) return;
            ghostUntilRef.current = Date.now() + 120;
            setPullX(null);
            setManifestOpen(ev.type === 'pointercancel' ? wasOpen : at(ev.clientX) > panelW / 2);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onEnd);
        window.addEventListener('pointercancel', onEnd);
    };

    /* THE ARRIVAL QUESTION - once per shop per day: not after a report or a sale there today (both stamp lastVisit), and
       never twice in one session, so a shop he walks past and closes stays closed. */
    const openArrival = (shop, metres) => {
        if (askedRef.current.has(shop.id) || shop.lastVisit === new Date().toLocaleDateString('en-CA')) return;
        setRequestNote(null);
        setArrival({ shop, metres });
    };
    const closeArrival = () => {
        if (arrival) askedRef.current.add(arrival.shop.id);
        setArrival(null); setRequestNote(null);
    };
    /* Journey's Visit Report, written from here (dayLog.js visitReport - one shape, so the Day Replay and the map read both).
       Not awaited: offline the write queues, and the sheet must not hang open until the signal comes back. */
    const saveVisit = (tag, note = '') => {
        const shop = arrival.shop;
        const report = visitReport(shop.name, tag, note, myName || 'Salesman', new Date().toLocaleDateString('en-CA'));
        closeArrival();
        (async () => {
            await updateDoc(doc(db, `artifacts/${appId}/users/${dataOwnerId}/customers`, shop.id), { ...report.patch, updatedAt: serverTimestamp() });
            if (logAudit) await logAudit('VISIT_REPORT', report.sentence, false, { storeId: shop.id, tag, agentId: agentProfileId || null });
        })().catch((err) => notify(tr('Visit NOT saved for {shop}: {error}', { shop: shop.name, error: err.message || tr('network error') })));
        notify(tr('Visit saved: {shop} - {tag}', { shop: shop.name, tag: tr(tag) }));
    };

    const cartTotal = cart.reduce((sum, i) => sum + (i.calculatedPrice * i.qty), 0);
    /* With the manifest tucked away its total is off the screen, so each ware that goes IN says so: a flag slides out of the
       tab with that ware and the new total, 2 s, then folds back (phone only - the PC's manifest column is always in view). */
    const [flag, setFlag] = useState(null);
    const prevCartRef = useRef(cart);
    useEffect(() => {
        const before = prevCartRef.current;
        prevCartRef.current = cart;
        const grew = cart.find(i => { const b = before.find(x => x.productId === i.productId); return !b || i.qty > b.qty; });
        if (!grew || manifestOpen) { setFlag(null); return undefined; }
        setFlag({ name: grew.name, total: cartTotal });
        const t = setTimeout(() => setFlag(null), 2000);
        return () => clearTimeout(t);
    }, [cart]);
    /* The rail's idle state. Recomputed only when the transaction list actually changes —
       it walks every transaction in the seven-day window, which is cheap but not free, and
       this component re-renders on every keystroke in the search box.
       A salesman's rail counts HIS sales only (Aldi, 2026-11-02, "A"): the list is the whole
       company's, so unfiltered a salesman paid Rp 750.000 was told Rp 4.780.000 and another man's
       shop as his last customer. The boss keeps the company. Filter here, never in dayStats or
       the listener - the same list feeds the boss's screens. */
    const today = React.useMemo(
        () => dayStats(userRole === 'ADMIN' ? transactions : transactions.filter(t => t.agentId === agentProfileId)),
        [transactions, userRole, agentProfileId]
    );
    const clockLabel = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    /* The ware most likely to run out on this route. Zero is not "low", it is gone, and a
       salesman cannot act on it from here — it belongs to restock, not to the shelf. */
    const lowestStock = React.useMemo(() => {
        const inPlay = inventory.filter(i => (i.stock || 0) > 0 && !i.damagedFrom);   /* a RUSAK lot is never restocked (his "yes", 2026-11-08) */
        if (!inPlay.length) return null;
        return inPlay.reduce((a, b) => ((a.stock || 0) <= (b.stock || 0) ? a : b));
    }, [inventory]);

    /* What he should know before he opens the shop door. Built from the transactions already
       in memory, so the common case — a store on a weekly round — costs nothing extra. */
    const brief = React.useMemo(
        () => customerBrief(transactions, customerName),
        [transactions, customerName]
    );

    /* Two shops inside one fence. Rendered identically on the desk and the phone from one
       definition, because a control that means "you might be at the other one" must not be
       two slightly different controls. Only appears when it is genuinely ambiguous. */
    const renderStoreSwap = () => {
        if (nearbyStores.length < 2) return null;
        return (
            <div className="mb-2 flex gap-1">
                {nearbyStores.map(s => {
                    const on = s.name === customerName;
                    return (
                        <button
                            key={s.id}
                            onClick={() => { if (!on) handleCustomerSelect(s, s._metres); }}
                            aria-pressed={on}
                            className={`kpm-press min-w-0 flex-1 truncate rounded border px-2 py-1.5 font-mono text-[9px] font-black uppercase tracking-[0.08em] ${on ? 'border-[var(--duke-brass-edge)] bg-[var(--duke-fill-ground)] text-[var(--duke-brass-ink)]' : 'border-[var(--duke-edge-1)] bg-transparent text-[var(--ink-dim)]'}`}
                        >
                            {s.name} &middot; {s._metres}m
                        </button>
                    );
                })}
            </div>
        );
    };

    /* Has he actually SETTLED on a customer, or is he still typing one?

       The brief used to appear for any non-empty text, so typing "HQ" to find "HQ 1" put a
       brief on screen for a store called "HQ" that does not exist — and reported "no order in
       the last 7 days" about it, which reads exactly like a real customer with no history.
       Aldi took it for a deleted customer still living in the database. It was his own
       keystrokes.

       "Closed the search" was not a strong enough signal — clicking away from the box closes
       it and left "HQ" looking settled. And "HQ" DOES have history, because it is a walk-in
       he has sold to before, so the brief filled with real figures for a store nobody chose.

       So: a brief needs a CHOSEN customer, full stop. A walk-in is already announced by the
       "WALK-IN (LOCKED TO ECER)" line under the field, which is the honest label for it —
       a brief implies a relationship, and a name typed once is not one. */
    const customerSettled = !!selectedCustomerInfo && !!customerName.trim();

    /* Where he goes next — the nearest store he is allowed to sell to and has not done today.
       No journey-plan props were needed: his GPS fix, the customer list and assignedAgent are
       all already here, the question had simply never been asked. */
    const upNext = React.useMemo(
        () => nextStop(customers, agentLocation, myName),
        [customers, agentLocation, myName]
    );

    /* One tap to load their usual order. Everything is re-priced from TODAY's product record
       rather than replayed from the stored line, or a sale would resurrect last month's
       price. Lines he cannot actually fulfil are dropped or clamped by reorderFromLast, and
       he is told which — a basket that quietly differs from the one he asked for is worse
       than no button at all. */
    const handleReorder = () => {
        if (!brief) return;
        const { lines, dropped, clamped } = reorderFromLast(brief.lastItems, inventory);
        if (!lines.length) {
            notify(tr('Nothing from their last order is on the vehicle today.'));
            return;
        }

        const tierToUse = lockedTier || (allowedTiers.includes('Retail') ? 'Retail' : (allowedTiers.find(t => t !== 'Grosir') || 'Retail'));
        setCart(lines.map(({ product, qty, unit }) => {
            let base = product.priceRetail || 0;
            if (tierToUse === 'Ecer') base = product.priceEcer || 0;
            if (tierToUse === 'Grosir') base = product.priceGrosir || 0;
            return {
                productId: product.id, name: product.name, qty, unit, priceTier: tierToUse,
                calculatedPrice: base * convertToBks(1, unit, product),
                product, condition: 'GOOD', returnReason: '', otherReasonDetail: '',
                fulfillment: 'NOW',
            };
        }));

        unlockSounds().then(() => playSound('commit'));
        triggerMerchantSpeak('add');

        const notes = [];
        if (clamped.length) notes.push(clamped.map(c => tr('{name}: only {n} on board (wanted {want})', { name: c.name, n: c.qty, want: c.wanted })).join('\n'));
        if (dropped.length) notes.push(`${tr('Not on the vehicle today:')}\n${dropped.join('\n')}`);
        if (notes.length) notify(`${tr('Loaded their last order, with changes:')}\n\n${notes.join('\n\n')}`);
    };

    const filteredItems = lotsAfterPacks(inventory.filter(i => (activeCategory === "ALL" || i.type === activeCategory) && i.name.toLowerCase().includes(searchTerm.toLowerCase())));
    const categories = ["ALL", ...new Set(inventory.map(i => i.type || "MISC")), ...(bundles.length ? ["BUNDLES"] : [])];

    const isGpsRestricted = gpsStatus === 'manual_override' && !canOverrideGps;
    
    const hasInvalidDamagedItems = isReturMode && cart.some(i => 
        i.condition === 'DAMAGED' && 
        (!i.returnReason || (i.returnReason === 'Other' && (!i.otherReasonDetail || i.otherReasonDetail.trim() === '')))
    );

    const hasInsufficientStockForExchange = isReturMode && returType === 'EXCHANGE' && cart.some(i => {
        if (i.fulfillment === 'IOU') return false;
        const maxStock = i.product.stock || 0; 
        return i.qty > maxStock;
    });

    const canSubmitSale = (cart.length > 0 || givenLines.length > 0) && customerName.trim() && gpsStatus !== 'checking' && txProofPhoto && !isGpsRestricted && !isProcessingSale && !hasInvalidDamagedItems && !hasInsufficientStockForExchange;

    /* HIS CALL, 2026-08-10: "what if we put the customer on top instead just near the strip?"
       The picker used to sit in the middle of the manifest paper, so the first question of every
       sale — who is buying — could only be answered by opening the drawer and scrolling the sheet.
       It is ONE bar now, the first row of the manifest - the top of the phone's side panel since
       2026-10-31, so opening the panel with no shop chosen lands on "who is buying?".
       ONE LINE, chosen or not — the top of a phone is scarce and that was the deal.
       There is still exactly ONE `customerName` input in the DOM; the paper echoes the chosen
       name as a read-only line and keeps everything else it had. */
    /* HIS REPORT, 2026-08-12: "the customer select textbox is really not satisfying ... it is
       too small and sempit". Where it sits was never the complaint, so the bar has not moved.
       What changed is that it stopped pretending to be a text field.

       It was a 12px input squeezed into a 44px strip, and the suggestion list opened directly
       over it — so the one thing you had to read while typing was the one thing covered. Worse,
       iOS zooms the whole page into any input smaller than 16px on focus, which is the other
       half of why typing here felt wrong and why the layout jumped.

       The strip now SHOWS who is buying, at a size you can read across a market stall, and
       tapping it opens a real picker: a full-width 16px field (no zoom) and full-size rows.
       The picker goes through a portal to <body> on purpose — it is the one overlay that must
       out-rank the app header, and a portal settles that without asking anything in this
       subtree for permission.

       `manifest-dropdown-area` on BOTH pieces is load-bearing, not decoration: the document
       click listener at the top of this file closes the picker for any click outside that
       class. Without it on the strip, tapping the strip would open the picker and shut it in
       the same tick; without it on the sheet, typing in the sheet would close it. */
    const clearCustomer = (e) => {
        e.preventDefault(); e.stopPropagation();
        setCustomerName(""); setSelectedCustomerInfo(null); setLockedTier(null);
        setGpsStatus('idle'); setManualOverride(true); setShowCustomerDropdown(true);
    };

    const renderCustomerBar = () => (
        <>
            {/* The strip that sat above the manifest is gone (his 2026-11-02 "we dont need 2 pelanggan textbox since we
                are be able to pull it from the side, just erase the top pelanggan box"). The paper's Nama Pelanggan box
                opens this sheet and carries the ✕; this function now draws only the sheet. */}

            {/* Anchored to the TOP, not the bottom, and that is not a taste call: a bottom-
                anchored sheet on iOS sits UNDER the keyboard the moment the field takes focus,
                which would bury the suggestions the sheet exists to show. */}
            {showCustomerDropdown && createPortal(
                <div className="manifest-dropdown-area hide-on-print fixed inset-0 z-[300] flex items-start justify-center">
                    <div className="absolute inset-0 bg-[var(--duke-scrim)] backdrop-blur-sm" onClick={finishCustomerTyping}></div>

                    <div data-guide="shops" className="relative w-full lg:max-w-md lg:mt-16 max-h-[70vh] flex flex-col bg-[var(--duke-fill-deep)] border-b-4 lg:border-4 border-[var(--duke-edge-1)] shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
                        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[var(--duke-edge-1)]">
                            <Store size={16} className="shrink-0 text-[var(--duke-ink-3)]" />
                            <span className="flex-1 text-xs font-black uppercase tracking-widest text-[var(--duke-ink-3)]">{tr('Who is buying?')}</span>
                            {/* Says DONE, not an X. Half of what gets typed here is a walk-in that
                                is never in the book, and an X on the way out of that reads as
                                "throw the name away". */}
                            <button
                                onClick={finishCustomerTyping}
                                className="kpm-hover shrink-0 px-3 py-1.5 min-h-[44px] lg:min-h-0 border border-[var(--duke-edge-5)] rounded text-[11px] lg:text-[10px] font-black uppercase tracking-widest text-[var(--duke-paper-ink)]"
                            >{tr('Done')}</button>
                        </div>

                        <div className="shrink-0 p-3">
                            {/* text-base is exactly 16px and it is load-bearing, not styling:
                                anything smaller makes iOS zoom the page on focus. */}
                            <input
                                autoFocus
                                value={customerName}
                                onChange={handleManualCustomerType}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); finishCustomerTyping(); } }}
                                placeholder={tr('Type the shop name')}
                                aria-label="Customer name"
                                className="w-full bg-[var(--duke-well)] border-2 border-[var(--duke-edge-ctl)] focus:border-[var(--duke-amber-edge)] rounded-lg px-3 py-3 text-base font-bold uppercase text-[var(--duke-paper-ink)] placeholder-[var(--duke-ink-6)] outline-none transition-colors"
                            />
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto border-t border-[var(--duke-edge-1)]">
                            {suggestedCustomers.length > 0 ? suggestedCustomers.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handleCustomerSelect(c)}
                                    className="w-full text-left px-4 py-3 border-b border-[var(--duke-edge-1)] flex items-center justify-between gap-3 hover:bg-[var(--duke-fill-panel)] active:bg-[var(--duke-fill-panel)] transition-colors"
                                >
                                    <span className="text-sm font-bold uppercase text-[var(--duke-paper-ink)] truncate">{c.name}</span>
                                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--duke-ink-3)]">{tr('Profiled')}</span>
                                </button>
                            )) : (
                                <p className="px-4 py-6 text-center text-[11px] uppercase tracking-widest text-[var(--duke-ink-6)] leading-relaxed">
                                    {customerName.trim()
                                        ? 'Not in the book — the sale will use this name exactly as typed.'
                                        : 'Start typing to search the book.'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );

    /* one list for the slip's select and the phone strip's, so the two can never offer different ways to pay */
    const payOptions = allowedPayments.filter(method => !(method === 'Titip' && cart.some(i => i.priceTier === 'Ecer')));

    const renderManifestUI = () => (
        <div className="bg-[var(--duke-paper-2)] text-[var(--duke-on-plate-2)] relative flex flex-col flex-1 shrink-0">
            
            <div className="p-3 md:p-4 relative z-[60] border-b border-[var(--duke-edge-on-paper)] bg-[var(--duke-paper-2)] space-y-3 md:space-y-4 manifest-dropdown-area">
                {/* the dropdown backdrop moved with the picker — it belongs to renderCustomerBar now */}

                {/* --- 🚀 DUAL MODE TOGGLE (SALE VS RETUR) --- */}
                <div className="flex rounded-lg border border-[var(--duke-on-plate)] overflow-hidden mb-2">
                    <button data-guide="sale-mode" onClick={() => { setIsReturMode(false); setReturType('EXCHANGE'); }} className={`kpm-hover flex-1 py-1.5 min-h-[44px] lg:min-h-[40px] text-[11px] lg:text-xs font-black uppercase tracking-widest ${!isReturMode ? 'bg-[var(--duke-on-plate)] text-[var(--duke-paper)]' : 'text-[var(--duke-ink-7)]'}`}>{tr('Sale Mode')}</button>
                    <button data-mission="5" onClick={() => {
                        if (!allowRetur) return notify(tr('You do not have clearance to process returns.'));
                        setIsReturMode(true);
                    }} className={`kpm-hover flex-1 py-1.5 min-h-[44px] lg:min-h-[40px] text-[11px] lg:text-xs font-black uppercase tracking-widest ${isReturMode ? 'bg-[var(--danger-plate)] text-[var(--danger-plate-ink)]' : 'text-[var(--duke-ink-7)]'}`}>{tr('Retur Mode')}</button>
                </div>

                {/* --- 🚀 SUB MODE TOGGLE (BUYBACK VS EXCHANGE) --- */}
                {isReturMode && allowCashRefund && (
                    <div className="flex bg-[var(--duke-fill-panel-2)] rounded border border-[var(--duke-edge-2)] p-1 mb-2 shadow-inner">
                        {/* Muted plates, no emoji. These two are a mode switch, not an alert —
                            a saturated orange and a bright gold shouting at each other was the
                            loudest thing on a screen whose whole point is a quiet ledger. Buyback
                            keeps the desaturated danger plate because it pays money OUT. */}
                        <button onClick={() => setReturType('BUYBACK')} className={`kpm-hover flex-1 py-1 text-[11px] font-bold uppercase tracking-widest rounded ${returType === 'BUYBACK' ? 'bg-[var(--danger-plate)] text-[var(--danger-plate-ink)]' : 'text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]'}`}>{tr('Buyback (Refund)')}</button>
                        <button onClick={() => setReturType('EXCHANGE')} className={`kpm-hover flex-1 py-1 text-[11px] font-bold uppercase tracking-widest rounded ${returType === 'EXCHANGE' ? 'bg-[var(--duke-brass-3)] text-[var(--duke-paper-ink)]' : 'text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]'}`}>{tr('Exchange (Tukar)')}</button>
                    </div>
                )}

                {/* --- 🚀 TEAMWORK IOU BANNER --- */}
                {selectedCustomerInfo?.pendingIOUs?.length > 0 && !isReturMode && (
                    <div className="bg-[var(--duke-fill-panel-3)] border-2 border-[var(--duke-brass-edge)] p-3 rounded mb-3 shadow-[0_0_15px_rgba(212,175,55,0.28)] animate-fade-in-up">
                        <h4 className="text-[var(--duke-brass-ink)] font-black uppercase text-[10px] flex items-center gap-1 mb-2"><AlertCircle size={14}/> Utang Barang Belum Dikirim</h4>
                        {selectedCustomerInfo.pendingIOUs.map((iou, i) => {
                            const isAlreadyInCart = cart.some(ci => ci.iouId === iou.id);
                            return (
                                <div key={i} className="flex justify-between items-center text-[11px] text-[var(--duke-ink-1)] mb-1 border-b border-[var(--duke-edge-2)] pb-1">
                                    <span>{iou.qty} {iou.unit} {iou.name} <br/><span className="text-[var(--duke-ink-3)] font-mono">By: {iou.agentName} | {new Date(iou.date).toLocaleDateString()}</span></span>
                                    {!isAlreadyInCart ? (
                                        <button onClick={() => handleFulfillIOU(iou)} className="bg-[var(--duke-brass-2)] hover:bg-[var(--duke-brass)] text-[var(--duke-on-plate)] px-2 py-1 rounded font-bold uppercase transition-colors">{tr('Fulfill')}</button>
                                    ) : (
                                        /* palette law: "done" is never a hue. Gold plate + tick, same as everywhere else. */
                                        <span className="text-[var(--duke-brass-ink)] font-bold uppercase px-2 py-1 border border-[color-mix(in_srgb,var(--duke-brass-edge)_50%,transparent)] rounded bg-[color-mix(in_srgb,var(--duke-brass)_10%,transparent)]"><Check size={10} className="inline mr-1"/> {tr('Added')}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {debtInfo && debtInfo.status === 'RED' && (
                        <div className="bg-[var(--duke-fill-plank-2)] border-2 border-red-500/80 p-3 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse rounded-sm relative z-[65] mb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="text-red-500 shrink-0" size={16}/>
                                <h4 className="text-red-500 font-black uppercase tracking-widest text-[10px]">{tr('Warning: Jatuh Tempo!')}</h4>
                            </div>
                            <p className="text-[var(--duke-ink-1)] text-[11px] leading-relaxed uppercase tracking-widest mt-1">
                                {customerName} OWES <span className="font-bold text-[var(--duke-ink-hi)] text-[10px]">Rp {new Intl.NumberFormat('id-ID').format(debtInfo.totalDebt)}</span> FROM {debtInfo.ageDays} DAYS AGO.
                            </p>
                            <div className="text-[var(--duke-ink-hi)] bg-red-600 px-1.5 py-0.5 mt-2 inline-block text-[11px] uppercase tracking-widest font-black shadow-md">{tr('Collect payment before issuing new Titip!')}</div>
                        </div>
                    )}

                    <div className="relative">
                        <label className="text-[11px] lg:text-xs font-bold uppercase tracking-widest block mb-1 text-[var(--duke-ink-7)]">{tr('Customer Name')}</label>
                        {/* Read-only echo. The picker is the bar at the top of this column now, but a
                            manifest with no name written on it is not a manifest, so the paper still
                            states who the deal is with. */}
                        {/* HIS ASK: "the customer box inside the manifest paper should also be
                            use to choose customer". It was a dead label that told you to go and
                            use the bar at the top — which is a sign, not a control. It opens the
                            SAME picker now; there is still exactly one `customerName` input in
                            the DOM, because that input lives in the picker sheet and this is a
                            button. Nothing here duplicates it. */}
                        <div className="flex gap-2">
                        <button
                            onClick={() => setShowCustomerDropdown(true)}
                            aria-label={customerName ? `Customer: ${customerName}. Tap to change` : 'Choose customer'}
                            className="kpm-hover flex-1 min-w-0 text-left bg-[var(--duke-paper-5)] border border-[var(--duke-edge-on-paper)] text-[var(--duke-ink-7)] p-2 min-h-[44px] lg:min-h-0 text-[13px] md:text-sm font-black uppercase rounded truncate"
                        >
                            {customerName || <span className="text-[var(--duke-ink-7)] font-bold normal-case tracking-normal">{tr('Tap to choose the customer')}</span>}
                        </button>
                        {/* the ✕ lived on the strip above the manifest; it moved here with the strip's removal (2026-11-02) */}
                        {customerName.length > 0 && (
                            <button
                                onClick={clearCustomer}
                                aria-label="Clear customer"
                                className="shrink-0 w-11 lg:w-9 min-h-[44px] lg:min-h-0 flex items-center justify-center bg-red-600 hover:bg-red-500 text-[var(--duke-on-fill)] rounded shadow-md active:scale-90 transition-all"
                            ><X size={16} strokeWidth={3}/></button>
                        )}
                        </div>

                        <div className="mt-2 min-h-[20px]">
                            {selectedCustomerInfo && !selectedCustomerInfo.isNooRegistration ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
                                        {gpsStatus === 'checking' && (
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-[var(--duke-amber-on-paper)] animate-pulse flex items-center gap-1"><MapPin size={12}/> {tr('Acquiring Satellites...')}</span>
                                                <button onClick={() => verifyLocation(true)} className="text-[var(--duke-amber-on-paper)] hover:text-[var(--duke-on-paper)] underline text-[11px] ml-2">{tr('PC Fast Scan')}</button>
                                            </div>
                                        )}
                                        
                                        {/* The prototype's geofence block. The app had this as a thin
                                            inline line that was easy to miss, and it is the check that
                                            decides whether a sale is allowed to happen at all — it should
                                            read as a statement, with the distance and the store named. */}
                                        {gpsStatus === 'verified' && (
                                            <div className="w-full border-l-[3px] border-[var(--duke-amber-edge-2)] bg-[var(--duke-paper-6)] px-3 py-2 rounded-r">
                                                <b className="block font-mono text-[9px] font-extrabold uppercase tracking-[0.16em] text-[var(--duke-amber-on-paper)] mb-1">{tr('Location verified')}</b>
                                                <span className="block normal-case tracking-normal text-[12px] font-semibold text-[var(--duke-on-plate)] leading-snug">
                                                    {distanceToStore}{tr('m from')} {selectedCustomerInfo.name}
                                                    <i className="not-italic font-mono text-[8px] font-extrabold uppercase tracking-[0.1em] text-[var(--duke-on-paper-dim)] ml-2 align-middle">{tr('auto')}</i>
                                                </span>
                                            </div>
                                        )}
                                        
                                        {gpsStatus === 'manual_override' && (
                                            <div className="flex flex-col gap-1 w-full">
                                                <div className="flex items-center gap-2 w-full">
                                                    {canOverrideGps ? (
                                                        <span className="text-yellow-600 flex items-center gap-1 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-600/50">
                                                            <AlertCircle size={12}/> {IS_DEMO ? 'Out of range, allowed in the demo' : `Out of Range: Tier ${user?.tier || 1} Auth`} ({distanceToStore}m)
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-500 flex items-center gap-1 bg-red-900/20 px-2 py-1 rounded border border-red-600/50">
                                                            <Lock size={12}/> Locked: Out of Range ({distanceToStore}m)
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {!canOverrideGps && distanceToStore <= 100 && (
                                                    <div className="mt-1">
                                                        {bypassState.status === 'idle' || bypassState.status === 'rejected' ? (
                                                            <button onClick={() => document.getElementById('bypassPhotoCapture').click()} className="text-[11px] w-fit bg-red-900/40 hover:bg-red-800 text-red-200 border border-red-500/50 px-2 py-1 rounded uppercase font-bold flex items-center gap-1 transition-colors shadow-sm active:scale-95">
                                                                <Camera size={10}/> {tr('Request 100m HQ Bypass')}
                                                            </button>
                                                        ) : bypassState.status === 'uploading' ? (
                                                            <span className="text-[11px] text-[var(--duke-amber-on-paper)] font-bold uppercase animate-pulse">{tr('Uploading Proof...')}</span>
                                                        ) : bypassState.status === 'pending' ? (
                                                            <span className="text-[11px] text-yellow-400 font-bold uppercase animate-pulse bg-yellow-900/20 px-2 py-1 rounded border border-yellow-500/50 inline-block w-fit">{tr('Awaiting HQ Approval...')}</span>
                                                        ) : null}
                                                        <input type="file" accept="image/*" capture="environment" id="bypassPhotoCapture" className="hidden" onChange={handleBypassPhotoCapture} />
                                                    </div>
                                                )}
                                                {!canOverrideGps && distanceToStore > 100 && (
                                                    <span className="text-[11px] text-[var(--duke-ink-7)] font-bold uppercase mt-1">Distance &gt; 100m. Bypass Unavailable.</span>
                                                )}
                                            </div>
                                        )}
                                        
                                        {gpsStatus === 'bypass' && <span className="text-orange-400 flex items-center gap-1"><MapPin size={12}/> Unmapped Store (Bypass Allowed)</span>}
                                        {gpsStatus === 'error' && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={12}/> GPS Signal Lost</span>}
                                    </div>
                                    
                                    {(!canOverrideGps && !hasClearance(myRole, 'can_unrestricted_sample') && !['verified', 'bypass', 'walk_in'].includes(gpsStatus)) ? (
                                        <button disabled className="w-full mt-1 bg-[var(--duke-fill-ground)] border border-[var(--duke-edge-ctl)] text-[var(--duke-ink-3)] text-[10px] font-bold uppercase tracking-widest p-2 rounded shadow-inner flex items-center justify-center gap-2 cursor-not-allowed">
                                            <Lock size={12}/> Sample Locked (Requires GPS)
                                        </button>
                                    ) : (
                                        <button onClick={() => setShowSampleModal(true)} className="w-full mt-1 bg-[var(--duke-fill-ground)] border border-[color-mix(in_srgb,var(--duke-amber-edge)_50%,transparent)] hover:bg-[var(--duke-amber)] text-[var(--duke-amber-ink)] hover:text-black text-[10px] font-bold uppercase tracking-widest p-2 rounded shadow-md flex items-center justify-center gap-2 transition-colors active:scale-95">
                                            <Package size={12}/> {tr('Deploy Free Sample')}
                                        </button>
                                    )}
                                </div>
                            ) : selectedCustomerInfo?.isNooRegistration ? (
                                <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-purple-600 bg-purple-100 p-1 rounded border border-purple-300">
                                    <Store size={12}/> NOO Verified ({lockedTier} Unlocked)
                                </div>
                            ) : customerName.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-orange-600">
                                        <AlertCircle size={12}/> Walk-in (Locked to Ecer)
                                    </div>
                                    <button onClick={() => setShowNooModal(true)} className="bg-[var(--duke-fill-plank)] hover:bg-[var(--duke-fill-plank-2)] text-[var(--duke-amber-ink)] text-[10px] font-bold uppercase tracking-widest p-2 rounded shadow-md flex items-center justify-center gap-2 transition-colors">
                                        <Store size={12}/> Register Outlet to Unlock Tiers
                                    </button>
                                </div>
                            ) : null}
                        </div>

                    </div>

                <div>
                    <label className="text-[11px] lg:text-xs font-bold uppercase tracking-widest text-[var(--duke-ink-7)] block mb-1">{tr('Payment Method')}</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={isReturMode} className={`w-full bg-[var(--duke-paper)] border border-[var(--duke-edge-on-paper)] text-[var(--duke-ink-7)] p-2 min-h-[44px] lg:min-h-0 text-[13px] md:text-sm font-bold uppercase outline-none rounded ${isReturMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {payOptions.map(method => ( <option key={method} value={method}>{tr(method === 'Titip' ? 'Consignment' : method)}</option> ))}
                    </select>
                    {/* A control that disappears has to say why it disappeared. */}
                    {cart.some(i => i.priceTier === 'Ecer') && allowedPayments.includes('Titip') && !isReturMode && (
                        <p className="text-[10px] text-[var(--duke-ink-7)] opacity-70 mt-1 leading-snug">{tr('Ecer is an individual sale, so Consignment is not offered. Consignment is for registered stores.')}</p>
                    )}
                </div>

                {paymentMethod === 'Titip' && !isReturMode && (
                    <div className="mt-3 bg-[var(--duke-fill-plank)] border border-[color-mix(in_srgb,var(--duke-amber-edge)_50%,transparent)] p-3 rounded shadow-inner animate-fade-in">
                        <label className="text-[10px] font-bold text-[var(--duke-ink-1)] mb-2 flex items-center justify-between uppercase tracking-widest">
                            <span>{tr('Jatuh Tempo (Due Date)')}</span>
                            <span className="bg-[var(--duke-amber)] text-black px-2 py-0.5 rounded shadow-sm text-[10px]">{tempoDays} Hari</span>
                        </label>
                        <div className="flex items-center gap-3">
                            <input type="range" min="1" max="60" value={tempoDays} onChange={(e) => setTempoDays(parseInt(e.target.value))} className="w-full accent-[var(--duke-amber)] h-1.5 bg-[var(--duke-fill-ground)] rounded-lg appearance-none cursor-pointer" />
                            <input type="number" min="1" max="60" value={tempoDays} onChange={(e) => setTempoDays(parseInt(e.target.value))} className="w-12 bg-[var(--duke-fill-ground)] border border-[var(--duke-edge-ctl)] rounded p-1 text-center text-[var(--duke-amber-ink)] text-xs font-bold focus:outline-none focus:border-[var(--duke-amber-edge)]"/>
                        </div>
                    </div>
                )}

                {selectedCustomerDebts.totalDebt > 0 && (
                    <div className={`mt-3 p-2 rounded border flex items-start gap-2 animate-fade-in shadow-md ${selectedCustomerDebts.isOverdue ? 'bg-red-900/20 border-red-500/50' : 'bg-orange-900/20 border-orange-500/50'}`}>
                        <AlertCircle className={`shrink-0 mt-0.5 ${selectedCustomerDebts.isOverdue ? 'text-red-500' : 'text-orange-500'}`} size={16}/>
                        <div>
                            <h4 className={`font-black text-[11px] uppercase tracking-[0.1em] ${selectedCustomerDebts.isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
                                {selectedCustomerDebts.isOverdue ? '⚠️ OVERDUE TITIP DETECTED' : 'Active Titip Balance'}
                            </h4>
                            <p className="text-[10px] text-[var(--duke-on-paper-dim)] mt-0.5 leading-tight font-bold">
                                <strong className="text-[var(--duke-ink-7)]">Rp {new Intl.NumberFormat('id-ID').format(selectedCustomerDebts.totalDebt)}</strong> {tr('Unpaid.')}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Capped at roughly three lines, then it scrolls. An uncapped list pushed the
                total and the commit button further down with every ware added, so the two
                controls a salesman uses most ended up furthest apart exactly when the basket
                was biggest. The cap is a max-height, not a fixed one, so a basket of one line
                does not leave a hole. */}
            <div className="flex-1 min-h-0 max-h-[min(54vh,540px)] lg:max-h-none overflow-y-auto lg:overflow-visible px-3 md:px-4 relative z-10 kpm-scroll">
                {cart.length === 0 ? (
                    <div className="text-center opacity-50 mt-8 font-bold uppercase text-xs md:text-sm">{tr('Manifest Empty')}</div>
                ) : (
                    cart.map((item, idx) => {
                        /* Grosir is offered only on a shop registered as Grosir (his 2026-10-21 "grosir only available for
                           the grosir registered store only") - never on a walk-in, never by hand; the engine refuses it too */
                        const mergedTiers = new Set(allowedTiers.filter(t => t !== 'Grosir' || lockedTier === 'Grosir'));
                        if (lockedTier) mergedTiers.add(lockedTier);
                        return (
                        /* B, the shopping list (his 2026-11-12 "make the shopping list professional as well"): a ruled
                           line, not a boxed card. Name, the line's money and a quiet remove on one row; the same four
                           unit boxes, quantity, unit and price type under it. Only the look moved - every handler and
                           the line's arithmetic are the ones that were here. */
                        <div key={idx} className={`kpm-row-in flex flex-col py-3 border-b border-[color-mix(in_srgb,var(--duke-edge-on-paper)_30%,transparent)] ${isReturMode ? (returType === 'EXCHANGE' ? 'px-2 rounded bg-[var(--duke-paper-3)]' : 'px-2 rounded bg-[var(--duke-paper-7)]') : ''}`}>
                            <div className="flex items-start gap-2 mb-1">
                                <span className={`flex-1 min-w-0 pt-1 text-[13px] font-black leading-tight uppercase break-words whitespace-normal ${isReturMode ? (returType === 'EXCHANGE' ? 'text-[var(--duke-brass-ink-2)]' : 'text-red-900') : 'text-[var(--duke-ink-7)]'}`}>
                                    {item.name} {isReturMode && (returType === 'EXCHANGE' ? '(TUKAR GANTI)' : '(BUYBACK)')}
                                    {item.isIouFulfillment && ' (FULFILLING IOU)'}
                                </span>
                                <span className="shrink-0 pt-1 text-[15px] font-black tabular-nums text-[var(--duke-on-plate)]">
                                    {isReturMode && returType === 'BUYBACK' ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(item.calculatedPrice * item.qty)}
                                </span>
                                <button onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} aria-label={`Remove ${item.name}`} className="kpm-press shrink-0 -mt-2 -mr-2 w-11 h-11 grid place-items-center rounded text-[var(--duke-ink-7)] opacity-60 hover:opacity-100 hover:text-[var(--duke-danger-ink-2)]"><X size={16}/></button>
                            </div>
                            {/* the four boxes: type what the customer said, in their words */}
                            {!item.isIouFulfillment && (
                                <div className="flex items-center gap-1 flex-wrap mb-2">
                                    {['Karton', 'Bal', 'Slop', 'Bks'].map(u => (
                                        <span key={u} className="flex items-center gap-0.5 lg:gap-1 border border-[color-mix(in_srgb,var(--duke-edge-on-paper)_45%,transparent)] bg-[var(--duke-paper-8)] px-1 lg:px-1.5 py-0 lg:py-1 h-11 lg:h-auto rounded">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={(item.mix && item.mix[u]) || ''}
                                                onChange={(e) => applyMix(item, u, e.target.value)}
                                                placeholder="–"
                                                aria-label={`${item.name} ${u}`}
                                                className="w-7 lg:w-8 h-11 lg:h-auto bg-transparent text-center text-[var(--duke-on-plate)] font-black text-base lg:text-sm outline-none"
                                            />
                                            <em className="not-italic text-[10px] font-black uppercase tracking-wide text-[var(--duke-on-paper-dim)]">{u}</em>
                                        </span>
                                    ))}
                                    <span className="text-[11px] font-black font-mono tabular-nums text-[var(--duke-ink-7)] ml-1">
                                        = {new Intl.NumberFormat('id-ID').format(item.qty || 0)} Bks
                                    </span>
                                    {/* The rates this line is actually using. Packing is per product and set in
                                        the master vault, and when it is wrong the only symptom is a total that
                                        looks plausible — 1.011 instead of 511. Printing the rates turns that
                                        into something a salesman can see without opening anything. */}
                                    {(() => {
                                        const per = bksPerUnit(item.product);
                                        return (
                                            <span className="w-full text-[11px] font-mono font-bold text-[var(--duke-on-paper-dim)] tracking-wide mt-0.5">
                                                1 KARTON = {per.Karton} &middot; 1 BAL = {per.Bal} &middot; 1 SLOP = {per.Slop} BKS
                                            </span>
                                        );
                                    })()}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <input type="number" value={item.qty} disabled={item.isIouFulfillment} onChange={(e) => updateCartItem(item.productId, 'qty', e.target.value === '' ? '' : parseInt(e.target.value))} onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) updateCartItem(item.productId, 'qty', 1); }} className={`w-20 md:w-24 min-h-[44px] lg:min-h-0 bg-white border border-[var(--duke-edge-3)] text-center text-base md:text-sm font-bold tabular-nums outline-none focus:border-[var(--duke-amber-edge)] rounded p-1 text-[var(--duke-ink-7)] ${item.isIouFulfillment ? 'opacity-50' : ''}`} />
                                {/* 🚀 Phase 8: unit + price-tier directly change how much money is charged —
                                    bumped to text-sm specifically, not just the general 11px pass, since
                                    these two decide the price, not just describe something. */}
                                <select value={item.unit} disabled={item.isIouFulfillment} onChange={(e) => updateCartItem(item.productId, 'unit', e.target.value)} className={`bg-transparent min-h-[44px] lg:min-h-0 text-sm font-bold uppercase outline-none text-[var(--duke-ink-7)] border border-[color-mix(in_srgb,var(--duke-edge-on-paper)_45%,transparent)] rounded px-2 lg:py-1 ${item.isIouFulfillment ? 'opacity-50' : ''}`}><option>Bks</option><option>Slop</option><option>Bal</option><option>Karton</option></select>
                                <select value={item.priceTier} onChange={(e) => updateCartItem(item.productId, 'priceTier', e.target.value)} disabled={!!lockedTier || item.isIouFulfillment} className={`bg-transparent min-h-[44px] lg:min-h-0 text-sm font-bold uppercase outline-none text-[var(--duke-ink-7)] border border-[color-mix(in_srgb,var(--duke-edge-on-paper)_45%,transparent)] rounded px-2 lg:py-1 ${lockedTier || item.isIouFulfillment ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                    {Array.from(mergedTiers).map(tier => ( <option key={tier} value={tier}>{tier}</option> ))}
                                </select>
                            </div>

                            {/* 🚀 ITEM-LEVEL FORENSIC TAGGING (RETUR ONLY) */}
                            {isReturMode && !item.isIouFulfillment && (
                                <div className={`mt-2 pt-2 border-t flex flex-col gap-2 ${returType === 'EXCHANGE' ? 'border-[color-mix(in_srgb,var(--duke-brass-edge-2)_50%,transparent)]' : 'border-red-300/50'}`}>
                                    <div className="flex gap-2">
                                        <select
                                            data-guide="cond"
                                            value={item.condition || 'GOOD'}
                                            onChange={(e) => updateCartItem(item.productId, 'condition', e.target.value)}
                                            className={`text-[11px] font-bold uppercase p-1.5 rounded outline-none border flex-1 ${item.condition === 'DAMAGED' ? 'bg-red-900/30 border-red-500 text-red-700' : 'bg-[var(--duke-paper-3)] border-[var(--duke-edge-on-paper)] text-[var(--duke-ink-7)]'}`}
                                        >
                                            <option value="GOOD">{tr('Good (Resellable)')}</option>
                                            <option value="DAMAGED">{tr('Damaged (Quarantine)')}</option>
                                        </select>

                                        {item.condition === 'DAMAGED' && (
                                            <select
                                                data-guide="reason"
                                                value={item.returnReason || ''}
                                                onChange={(e) => updateCartItem(item.productId, 'returnReason', e.target.value)}
                                                className="text-[11px] font-bold uppercase p-1.5 rounded outline-none border bg-white border-red-400 text-red-800 flex-1"
                                            >
                                                <option value="">-- Select Reason --</option>
                                                <option value="Expired / Out of Date">{tr('Expired')}</option>
                                                <option value="Water / Weather Damage">{tr('Water Damage')}</option>
                                                <option value="Torn / Crushed Packaging">{tr('Torn/Crushed')}</option>
                                                <option value="Pest / Rodent Damage">{tr('Pest Damage')}</option>
                                                <option value="Factory Defect">{tr('Factory Defect')}</option>
                                                <option value="Other">{tr('Other...')}</option>
                                            </select>
                                        )}
                                    </div>
                                    
                                    {item.condition === 'DAMAGED' && item.returnReason === 'Other' && (
                                        <input 
                                            type="text" 
                                            placeholder={tr('Describe the damage...')} 
                                            value={item.otherReasonDetail || ''}
                                            onChange={(e) => updateCartItem(item.productId, 'otherReasonDetail', e.target.value)}
                                            className="w-full text-[10px] p-1.5 rounded border border-red-400 bg-white text-black outline-none focus:border-red-600"
                                        />
                                    )}

                                    {/* EXCHANGE MODE ONLY: FULFILL NOW VS IOU */}
                                    {returType === 'EXCHANGE' && (
                                        <div className="flex gap-2 mt-1">
                                            <button onClick={() => updateCartItem(item.productId, 'fulfillment', 'NOW')} className={`flex-1 py-1.5 text-[11px] font-bold uppercase rounded border transition-all ${item.fulfillment !== 'IOU' ? 'bg-[var(--duke-brass)] border-[var(--duke-brass-edge-2)] text-[var(--duke-on-plate)] shadow-md' : 'bg-[var(--duke-bar-3)] border-[color-mix(in_srgb,var(--duke-edge-3)_50%,transparent)] text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]'}`}>{tr('Give Replacement Now')}</button>
                                            <button onClick={() => updateCartItem(item.productId, 'fulfillment', 'IOU')} className={`flex-1 py-1.5 text-[11px] font-bold uppercase rounded border transition-all ${item.fulfillment === 'IOU' ? 'bg-[var(--duke-brass-3)] border-[var(--duke-brass-edge-4)] text-[var(--duke-on-fill)] shadow-md' : 'bg-[var(--duke-bar-3)] border-[color-mix(in_srgb,var(--duke-edge-3)_50%,transparent)] text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]'}`}>{tr('Hutang Barang (IOU)')}</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )})
                )}
                {/* PROMO GOODS, given free with this sale (stage 4). It grows inside the cart paper and scrolls with it -
                    the same function as a cart line, so the same control (his "one function, one control"). No price
                    anywhere: it never joins the cart, the total or the nota's sum. */}
                {/* never hidden (his 2026-10-27 "dont hide the button"): with nothing to give it says why. The LIST folds
                    (his 2026-11-02 "hide the promo goods on default and press it to open the promo goods panel just to save
                    some space"): the header is the press, and while shut it still shows the pcs already given. */}
                <div data-guide="promo-give" className="flex flex-col p-3 md:p-4 mb-1 rounded border border-dashed border-[var(--duke-brass-edge-2)] bg-[var(--duke-paper)] shadow-sm">
                        {canGive ? (
                            <button type="button" onClick={() => setGiveOpen(o => !o)} aria-expanded={giveOpen} className="kpm-hover -my-1 min-h-[44px] lg:min-h-[32px] flex items-center gap-2 text-left text-[var(--duke-ink-7)]">
                                <span className="flex-1 text-[10px] md:text-xs font-black uppercase tracking-widest">{tr('Promo · given free')}</span>
                                {givenLines.length > 0 && <span className="text-xs md:text-sm font-black tabular-nums">{givenLines.reduce((s, g) => s + g.qty, 0)} pcs</span>}
                                <ChevronDown size={18} className={`shrink-0 ${giveOpen ? 'rotate-180' : ''}`} />
                            </button>
                        ) : <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[var(--duke-ink-7)]">{tr('Promo · given free')}</span>}
                        {canGive ? (giveOpen && promoVan.map(l => {
                            /* − n + like a product row (his 2026-11-12 "promo doesnt have add button"); the box still takes a typed count */
                            const cur = giveOf(l);
                            const closed = packOnly.has(l.productId);   // a package item: no hand-give, only what the packages cover
                            const setN = (n) => {
                                if (n > l.qty) notify(tr('Only {n} pcs of {name} {where} - not enough for {want}.', { n: l.qty, name: l.name, where: giveWhere, want: n }));
                                setGive(g => ({ ...g, [l.productId]: Math.max(0, Math.min(n, l.qty)) }));
                            };
                            const stepCls = 'kpm-press kpm-hover shrink-0 w-11 h-11 lg:w-8 lg:h-8 rounded border border-[var(--duke-edge-3)] bg-white text-[var(--duke-ink-7)] text-lg font-black leading-none flex items-center justify-center';
                            return (
                            <div key={l.productId} className="flex items-center gap-2 md:gap-3 mt-2">
                                <span className="relative shrink-0">
                                    <img alt="" src={promoPic(l.product || { kind: 'promo', name: l.name })} className="w-10 h-10 object-contain rounded border border-[color-mix(in_srgb,var(--duke-edge-on-paper)_30%,transparent)] bg-[var(--duke-paper-2)]" />
                                    {isDamagedPack(l.product) && <HazardMark className="-bottom-1 -right-1 w-[18px] h-[18px]" />}
                                </span>
                                <span className="flex-1 min-w-0 text-[11px] md:text-xs font-black uppercase leading-tight break-words text-[var(--duke-ink-7)]">
                                    {l.name}
                                    <span className="block mt-0.5 text-[10px] font-bold normal-case tracking-normal text-[var(--duke-on-paper-dim)] tabular-nums">{l.qty} pcs {giveWhere}</span>
                                </span>
                                {closed ? (
                                    <span data-guide="promo-pack-only" className="shrink-0 text-right text-[10px] md:text-xs font-black uppercase tracking-widest text-[var(--duke-on-paper-dim)]">
                                        {cur > 0 && <span className="block text-xs md:text-sm tabular-nums text-[var(--duke-ink-7)]">{cur} pcs</span>}
                                        {tr('Package only')}
                                    </span>
                                ) : (<>
                                <button type="button" aria-label={`${l.name}: one less`} onClick={() => { unlockSounds().then(() => playSound(cur > 0 ? 'click' : 'error')); setN(cur - 1); }} className={`${stepCls} ${cur > 0 ? '' : 'opacity-40'}`}>−</button>
                                <input type="number" inputMode="numeric" min="0" placeholder="0" aria-label={`${l.name}: pieces to give`}
                                    value={give[l.productId] || ''}
                                    onChange={(e) => setN(parseInt(e.target.value, 10) || 0)}
                                    className="w-12 md:w-14 min-h-[44px] lg:min-h-0 bg-white border border-[var(--duke-edge-3)] text-center text-base md:text-sm font-bold tabular-nums outline-none focus:border-[var(--duke-amber-edge)] rounded p-1 text-[var(--duke-ink-7)]" />
                                <button type="button" aria-label={`${l.name}: one more`} onClick={() => { unlockSounds().then(() => playSound('click')); setN(cur + 1); }} className={`${stepCls} ${cur < l.qty ? '' : 'opacity-40'}`}>+</button>
                                </>)}
                            </div>
                            );
                        })) : <p data-guide="promo-give-empty" className="mt-1.5 text-[11px] md:text-xs font-bold text-[var(--duke-on-paper-dim)]">{tr(giveEmpty)}</p>}
                </div>
            </div>
        </div>
    );

    /* Which sheet the alcove shows. He idles by default, talks while he has something to
       say, and holds the coin pose on a committed deal. */
    const merchSprite = merchantMood === 'deal' ? 'kpm-merch-deal'
                      : merchantMood === 'talking' ? 'kpm-merch-talk'
                      : 'kpm-merch-idle';

    return (
        /* B, THE PRICE LIST (his pick 2026-11-11, "looks most professional"): one letter style (Rajdhani), flat ground,
           ruled lines. The frame, the hatch and the serif went with the game look (tag game-edition-v1). */
        <div ref={rootRef} style={fitH ? { '--term-h': `${fitH}px` } : undefined} className="flex h-full lg:h-[var(--term-h,100%)] w-full bg-[var(--duke-fill-ground)] text-[var(--duke-ink-1)] font-mono overflow-hidden relative">

            {/* Below lg this element IS the side panel: fixed to the left edge at full height, slid
                off by its own width while shut (pullX follows a finger on the tab). At lg the
                media-query classes win over the base ones and it is the static 420px left column,
                so the desktop layout is untouched. Lite Mode's `html.lite-mode *` kills the slide. */}
            <div
                ref={gripRef}
                style={pullX === null ? undefined : { transform: `translateX(calc(${pullX}px - 100%))` }}
                className={`hide-on-print fixed top-0 bottom-0 left-0 z-[150] w-[min(86vw,340px)] overflow-hidden border-r lg:border-r-0 lg:border-l lg:order-2
                            lg:static lg:z-10 lg:h-full lg:w-[420px] lg:translate-x-0 lg:shadow-none
                            flex flex-col border-[var(--duke-edge-1)] bg-[var(--duke-paper-2)] shrink-0 ${IS_DEMO ? 'pt-[70px] lg:pt-0' : ''}
                            ${manifestOpen ? 'translate-x-0 shadow-[10px_0_30px_rgba(0,0,0,0.6)]' : '-translate-x-full'}
                            ${pullX === null ? 'transition-transform duration-[320ms] ease-[cubic-bezier(.32,.72,0,1)]' : ''}`}
            >
                {/* THE ALCOVE — desktop only. On a phone he still only visits, via
                    CapybaraMascot on a committed deal; a phone screen has no room to give
                    him. A desk does, so here he lives in the ledger column: idling while
                    you shop, talking when he has something to say, holding the coin on a
                    deal. Everything but the sprite is CSS, so it costs one image. */}
                {/* aria-hidden on the scenery only — his line is real content and is
                    announced, which is why the bubble sits outside that subtree. */}
                {/* ponytail: on the demo build the DEMO bar and its mission line sit over the top 70 px of this phone
                    panel (the shell boxes the panel under them, so no z-index here lifts it) - hence pt-[70px] above,
                    demo only. A bar height owned by the shell is the real fix, when the shared top bar is redesigned. */}

                {renderCustomerBar()}

                {/* The panel's header on a phone: the running total, the item count and the LAST ITEM
                    ADDED, as the closed bottom bar used to carry them. A tap puts the panel away. */}
                <button
                    type="button"
                    onClick={() => setManifestOpen(false)}
                    className="lg:hidden h-[52px] shrink-0 px-4 flex items-center gap-3 text-left bg-[var(--duke-paper-2)] border-b border-[var(--duke-edge-on-paper)]"
                >
                    <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-widest text-[var(--duke-ink-7)] leading-none">
                            {tr('Manifest')} ({cart.length})
                        </div>
                        <div className="text-[11px] font-mono text-[var(--duke-ink-7)] opacity-70 truncate leading-tight mt-0.5">
                            {cart.length ? cart[cart.length - 1].name : givenLines.length ? tr('Promo only: {n} pcs given free', { n: givenLines.reduce((s, g) => s + g.qty, 0) }) : tr('Empty — tap a ware to add')}
                        </div>
                    </div>
                    <span className={`text-lg font-black font-mono leading-none shrink-0 ${isReturMode && returType === 'BUYBACK' ? 'text-[var(--duke-danger-ink-2)]' : 'text-[var(--duke-on-plate)]'}`}>
                        {isReturMode && returType === 'BUYBACK' ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(cartTotal)}
                    </span>
                    <ChevronDown size={18} className="shrink-0 rotate-90 text-[var(--duke-ink-7)]" />
                </button>

                {/* Rendered at EVERY width now. It used to be lg:hidden with a second copy
                    further down for desktop, which meant two manifests in the DOM, duplicate
                    element ids, and - once the drawer became this column - a third column that
                    did not fit beside the app's sidebar. One manifest, one column. */}
                {/* min-h-0 is load-bearing. A flex child defaults to min-height:auto and
                    refuses to shrink below its content, so without it this wrapper keeps its
                    full natural height, the column grows past the viewport, and the alcove -
                    the one element that must always be visible - is the first thing pushed
                    off the top. That is why the merchant vanished while he could still be
                    heard. */}
                {/* HIS CALL, 2026-08-10, on being shown two options: "b is better" — one slim
                    bar pinned at the bottom carrying SIGN only, and everything else scrolling
                    with the paper. His report: "the delivery proof panel and sign manifest panel
                    shouldnt be lock in the phone view because its taking so much space that the
                    product list is too small", and "cant see product list and customer name
                    section is cutted".

                    Delivery Proof and Total Value used to be pinned alongside the button, which
                    on a phone is ~200px of permanently reserved height. They now live inside the
                    scrolling sheet. overflow-hidden became overflow-y-auto for the same reason —
                    the paper has to be able to scroll now that it carries them. */}
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                    {/* B, his 2026-11-12 "the capybara on the right is blocking the shopping panel": the room is the first
                        thing in the slip's OWN scroll now. At rest he stands on top of the order as before; scroll the
                        order and the whole panel is the order, with the total and the save button still in view. Not
                        sticky any more (lg:!relative) - stuck, it kept 280 px of the panel for itself. His walk-out and
                        his corner visit are the same observer as before. */}
                    <div ref={alcoveRef} className="kpm-alcove hidden lg:grid shrink-0 lg:!relative">
                        <div className="rock"></div>
                        {/* the lit doorway he stands in front of — the only warm light in the cave,
                            and what gives the figure a silhouette instead of a flat cut-out */}
                        <div className="arch" aria-hidden="true"></div>
                        <div className="kpm-torch l">
                            <div className="pole"></div><div className="bowl"></div>
                            {/* one sprite, 8 frames. The three stacked gradients it replaced could
                                not make a pixel flame read as pixel art. */}
                            <div className="kpm-flame"></div>
                        </div>
                        <div className="kpm-torch r">
                            <div className="pole"></div><div className="bowl"></div>
                            <div className="kpm-flame"></div>
                        </div>
                        <div className="cast"></div>
                        <div className="floor"></div>
                        {/* He walks out through the doorway when the cave scrolls away, and back in
                            when it returns — the wrapper carries the journey so the deal-pose breath
                            cannot cancel it, and his two shadows travel with him. */}
                        <div className={`walker ${alcoveOut ? 'out' : ''}`}>
                            {/* the two shadows are the SAME sprite, flattened - no extra download */}
                            <div className={`fig sh a kpm-merch ${merchSprite}`}></div>
                            <div className={`fig sh b kpm-merch ${merchSprite}`}></div>
                            <div className={`fig kpm-merch ${merchSprite}`} aria-hidden="true">
                                {merchantMood === 'deal' && <span className="kpm-merch-hold"></span>}
                            </div>
                        </div>
                        <div className="dark" aria-hidden="true"></div>
                        {merchantLine && merchantMood !== 'idle' && <p className="says" role="status">{merchantLine}</p>}
                    </div>
                    {renderManifestUI()}

                    {/* Still the same sheet of paper — same parchment, same tokens. It scrolls
                        with the manifest instead of being bolted under it. */}
                    <div className="bg-[var(--duke-paper-2)] px-4 md:px-6 pt-3 pb-4 shrink-0">

                    <div className="mb-4">
                        <label className="text-[10px] font-bold text-[var(--duke-ink-4)] uppercase tracking-widest block mb-2">{tr('Delivery Proof')} <span className="text-[var(--duke-danger-ink-2)]">*</span></label>
                        {/* The file input EXISTS only where a file is a legal answer. A camera-only
                            tier has no chooser in the DOM at all — not in production, and not in a
                            dev build either.

                            ⚠️ THERE WAS A `|| import.meta.env.DEV` HERE FOR ONE HOUR, so a machine
                            with no webcam could still finish a sale. Aldi killed it the moment he
                            saw it: *"me as tier 6 still can see this option and can use it"*. He is
                            right and the reasoning behind it was backwards — dev is the ONLY place
                            he tests, so a dev-only bypass does not preserve testability, it removes
                            the one thing being tested. A rule you cannot see working is not a rule.

                            The escape hatch already exists and it is the shipped one: turn
                            `photo_pick_from_gallery` ON for that tier in Settings → Permission
                            Matrix, test, turn it off. A second, hidden way in duplicates a control
                            he can already see, which is how two answers to one question start. */}
                        {galleryOk && (
                            <input type="file" accept="image/*" id="txProof" className="hidden" onChange={handleTxPhotoCapture} />
                        )}

                        {txProofPhoto ? (
                            /* his pick B "PHOTO CORNER" (2026-11-03): the photo he took sits in the album corners the button showed */
                            <div className="kpm-photo kpm-corners">
                                <img src={txProofPhoto} alt={tr('Proof')}className="block max-w-full max-h-40 w-auto h-auto" />
                                <button onClick={() => setTxProofPhoto(null)} className="absolute top-2 right-2 z-10 bg-red-600 hover:bg-red-500 text-[var(--duke-on-fill)] p-1.5 rounded-md shadow-md"><X size={14}/></button>
                            </div>
                        ) : (
                            /* the photo corners (theme.css .kpm-shutter + .kpm-corners): his pick B "PHOTO CORNER" 2026-11-03, after
                               the black camera key read as "tech" - an empty album spot on the manifest paper */
                            <button data-guide="photo" onClick={() => IS_DEMO ? demoPhoto().then(setTxProofPhoto) : galleryOk ? document.getElementById('txProof').click() : setShowProofCamera(true)} className="kpm-shutter kpm-corners">
                                <span className="kpm-shutter-lens"><Camera size={18} /></span>
                                <span className="kpm-shutter-word">{IS_DEMO ? (getLang() === 'id' ? 'Foto serah terima otomatis (demo)' : 'Auto handover photo (demo)') : galleryOk ? tr('Capture or choose photo') : tr('Open camera for handover photo')}</span>
                            </button>
                        )}

                        <ProofCamera
                            open={showProofCamera}
                            onClose={() => setShowProofCamera(false)}
                            onPhoto={(data) => { setTxProofPhoto(data); setShowProofCamera(false); }}
                        />
                    </div>

                    
                    {hasInvalidDamagedItems && (
                        <div className="bg-red-900/40 border border-red-500 text-red-500 p-2 rounded mb-3 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                            <AlertTriangle size={14}/> {tr('Please complete damage reasons for all items.')}
                        </div>
                    )}
                    {hasInsufficientStockForExchange && (
                        <div className="bg-orange-900/40 border border-orange-500 text-orange-500 p-2 rounded mb-3 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 text-center">
                            <AlertTriangle size={16} className="shrink-0"/> {tr('You lack healthy vehicle stock to exchange. Switch to "Hutang Barang" or "Buyback".')}
                        </div>
                    )}

                    </div>
                </div>

                {/* THE PINNED BAR — the only thing that stays fixed on a phone now. Slimmer than
                    the old footer on purpose: this bar is height taken from the product list. */}
                <div className="bg-[var(--duke-paper-2)] px-4 py-2 md:px-6 md:py-3 border-t border-[var(--duke-edge-on-paper)] flex flex-col gap-2 shrink-0 z-20">
                    {/* B: the total sits with the button that commits it, in view at every width. (On the phone it
                        scrolled with the paper while the slip shared the screen with the shelf; the slip is a full
                        panel now, so the two things he looks at last are together.) */}
                    <div className="flex justify-between items-baseline font-mono">
                        <span className="text-xs md:text-sm font-bold text-[var(--duke-ink-7)] uppercase tracking-widest">{tr('Total Value')}</span>
                        <span className={`text-2xl md:text-3xl font-black leading-none tabular-nums ${isReturMode && returType === 'BUYBACK' ? 'text-[var(--duke-danger-ink-2)]' : 'text-[var(--duke-on-plate)]'}`}>
                            {isReturMode && returType === 'BUYBACK' ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(cartTotal)}
                        </span>
                    </div>
                    <button
                        data-mission="4"
                        /* what the demo mission's guide reads to know which press comes next: shop chosen (and its list
                           shut), cart, photo, every damaged pack's reason, retur mode */
                        data-cust={customerName.trim() && !showCustomerDropdown ? '' : undefined}
                        data-cart={cart.length ? '' : undefined}
                        data-photo={txProofPhoto ? '' : undefined}
                        data-reasons={cart.some(i => i.condition === 'DAMAGED') && !hasInvalidDamagedItems ? '' : undefined}
                        data-retur={isReturMode ? '' : undefined}
                        onClick={handleFinalDeal}
                        disabled={!canSubmitSale || isProcessingSale}
                        /* B: a dark plate with cream words, one letter style with the rest of the slip (it was the
                           rubber stamp of 2026-11-03, the game look's serif). Not ready = a quiet outlined line. */
                        className={`kpm-press w-full min-h-[52px] rounded-lg flex items-center justify-center gap-2 text-[15px] md:text-base font-black uppercase tracking-wide whitespace-nowrap transition-colors ${isReturMode ? 'bg-[var(--danger-plate)] text-[var(--danger-plate-ink)]' : 'bg-[var(--duke-on-plate)] text-[var(--duke-paper)]'} disabled:bg-transparent disabled:text-[var(--duke-ink-7)] disabled:border disabled:border-[color-mix(in_srgb,var(--duke-edge-on-paper)_50%,transparent)] disabled:opacity-80`}
                    >
                        {isProcessingSale ? <span className="flex items-center gap-2 animate-pulse"><Zap size={20}/> {tr('PROCESSING...')}</span> :
                         gpsStatus === 'checking' ? tr('Awaiting GPS...') :
                         isGpsRestricted ? <><Lock size={20}/> <span>{tr('LOC. RESTRICTED')}</span></> :
                         !txProofPhoto && customerName.trim() ? <><Camera size={20}/> <span>{tr('REQUIRE PROOF')}</span></> :
                         hasInvalidDamagedItems ? <><AlertTriangle size={20}/> <span>{tr('REASON REQ.')}</span></> :
                         hasInsufficientStockForExchange ? <><AlertTriangle size={20}/> <span>{tr('NO STOCK')}</span></> :
                         customerName.trim() ? (isReturMode ? <><AlertCircle size={24} className="md:w-6 md:h-6"/> <span>{tr('PULL RETUR')}</span></> : <><Zap fill="currentColor" size={20} className="md:w-6 md:h-6"/> <span>{cart.length === 0 && givenLines.length ? tr('GIVE PROMO') : tr('MAKE DEAL')}</span></>) : tr('SIGN MANIFEST >')}
                    </button>
                </div>
            </div>

            {/* THE TAB (phone): the Manifest's handle on the left edge, at the quarter mark where the menu
                ribbon sits on the right. It rides the panel's edge when the panel is out, so the same tab
                opens and closes it. A tap or the keyboard toggles it; a pull drags the panel along. */}
            <button
                type="button"
                onClick={() => setManifestOpen(o => !o)}
                onPointerDown={startManifestPull}
                aria-expanded={manifestOpen}
                aria-label={`Manifest, ${cart.length} ${cart.length === 1 ? 'line' : 'lines'}`}
                style={{ touchAction: 'none', ...(pullX === null ? {} : { transform: `translateX(${pullX}px)` }) }}
                /* B: shut, the slip is opened by the total bar under the shelf, so this handle shows only while the slip
                   is out - the grip that pulls it shut. The "added" flag reports inside that bar now. */
                className={`font-mono hide-on-print lg:hidden fixed left-0 top-[calc(25%-66px)] z-[151] w-5 h-[132px] py-1.5 flex-col items-center gap-1.5 rounded-r-[10px] border border-l-0 border-[var(--duke-edge-on-paper)] bg-[var(--duke-paper-2)] shadow-[4px_0_14px_rgba(0,0,0,0.5)]
                            ${manifestOpen || pullX !== null ? 'flex translate-x-[min(86vw,340px)]' : 'hidden'} ${pullX === null ? 'transition-transform duration-[320ms] ease-[cubic-bezier(.32,.72,0,1)]' : ''}`}
            >
                <NixieCount value={cart.length} size={10} rollIn />
                <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--duke-on-plate)]">{tr('Manifest')}</span>
                <ChevronDown size={14} className="mt-auto shrink-0 rotate-90 text-[var(--duke-on-plate)]" />
            </button>
            {/* B, phone: the total and the way to the slip, always in view. FIXED to the bottom edge: the shell scrolls this
                whole screen under its header, so a bar at the end of the column starts below the fold. Each product that goes in
                reports here for 2 s (the flag that used to slide out of the edge tab). The button only OPENS the slip:
                the photo and the one committed save stay on the paper. */}
            <div className="hide-on-print lg:hidden fixed inset-x-0 bottom-0 z-[140] flex items-center gap-3 px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] border-t border-[var(--duke-edge-1)] bg-[var(--duke-fill-well)]">
                {/* the total side opens the slip too (his 2026-11-12 "how do i see the shopping list on the phone"): both halves of
                    the bar are the way in, and the small arrow says the words can be pressed */}
                <button type="button" data-guide="open-slip-total" onClick={() => setManifestOpen(true)} className="kpm-hover min-w-0 flex-1 text-left">
                  <div role="status">
                    <div className="truncate text-[12px] font-bold text-[var(--duke-ink-5)]">
                        {flag ? `${tr('Added ·')} ${flag.name}` : `${tr('Manifest')}${customerName.trim() ? ` · ${customerName.trim()}` : ''} · ${cart.length} ${getLang() === 'id' ? 'barang' : (cart.length === 1 ? 'item' : 'items')}`}
                        <ChevronDown size={14} aria-hidden="true" className="inline-block ml-1 rotate-180 align-[-2px]" />
                    </div>
                    <div className={`text-[22px] font-black leading-tight tabular-nums ${isReturMode && returType === 'BUYBACK' ? 'text-[var(--duke-danger-ink)]' : 'text-[var(--duke-ink-1)]'}`}>
                        {isReturMode && returType === 'BUYBACK' ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(cartTotal)}
                    </div>
                  </div>
                </button>
                <button type="button" data-guide="open-slip" onClick={() => setManifestOpen(true)} className="kpm-press shrink-0 min-h-[48px] px-6 rounded-lg bg-[var(--duke-paper)] text-[var(--duke-on-plate)] text-[15px] font-black">
                    {isReturMode ? 'Retur' : getLang() === 'id' ? 'Bayar' : 'Pay'}
                </button>
            </div>
            {manifestOpen && <div aria-hidden="true" onClick={() => setManifestOpen(false)} className="hide-on-print lg:hidden fixed inset-0 z-[149] bg-[var(--duke-scrim)]"></div>}

            {/* THE ARRIVAL SHEET (his 2026-10-31 flow): GPS locked a shop, so the first thing asked is what
                happened there. TAKE ORDER is the terminal - a dark plate with an amber edge, his "too bright" on
                the board's filled one; every other answer is one tap and the visit is done, in Journey's own
                tags (VISIT_TAGS) written the way Journey writes them. A portal like the shop picker: it must
                out-rank the app header. */}
            {arrival && createPortal(
                <div role="dialog" aria-modal="true" aria-label={`Arrived at ${arrival.shop.name}`} className="hide-on-print fixed inset-0 z-[300] flex items-end lg:items-center justify-center">
                    <div className="absolute inset-0 bg-[var(--duke-scrim)]" onClick={closeArrival}></div>
                    <div data-guide="arrival" className="font-mono relative w-full lg:w-[520px] max-h-[90vh] overflow-y-auto p-4 pb-5 bg-[var(--duke-fill-panel)] text-[var(--duke-ink-1)] border-t-4 lg:border-4 border-[var(--duke-edge-1)] rounded-t-2xl lg:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
                        <div className="flex items-start gap-2.5">
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--duke-ink-6)]">{tr('You are here ·')} {arrival.metres} m · GPS ✓</p>
                                <p className="mt-1.5 text-[22px] leading-tight font-black uppercase tracking-wide break-words">{arrival.shop.name}</p>
                                {arrival.shop.address && <p className="mt-0.5 text-[13px] text-[var(--duke-ink-3)]">{arrival.shop.address}</p>}
                            </div>
                            <button type="button" onClick={closeArrival} aria-label="Close" className="kpm-press w-11 h-11 shrink-0 grid place-items-center rounded-lg border border-[var(--duke-edge-ctl)] text-[var(--duke-ink-3)]"><X size={20}/></button>
                        </div>
                        {requestNote === null ? (<>
                            <button type="button" onClick={closeArrival} className="kpm-press kpm-hover mt-4 w-full min-h-[60px] rounded-lg border-2 border-[var(--duke-amber-edge)] bg-[var(--duke-fill-plank)] text-[var(--duke-amber-ink)] text-lg font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2.5"><Zap size={18}/><span>{tr('Take order')}</span></button>
                            <p className="mt-4 mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--duke-ink-6)]">{tr('No order? One tap saves the visit')}</p>
                            <div className="grid grid-cols-2 gap-2">
                                {VISIT_TAGS.filter(t => t !== VISIT_TAGS[0] && !t.includes('📦')).map(tag => (
                                    <button key={tag} type="button" onClick={() => (tag.includes('📝') ? setRequestNote('') : saveVisit(tag))}
                                        className="kpm-press kpm-hover min-h-[56px] px-3 py-2 rounded-lg border-2 border-[var(--duke-edge-ctl)] bg-[var(--duke-fill-well)] text-[var(--duke-ink-1)] text-[13px] font-black uppercase tracking-[0.06em] leading-tight text-left">{tr(tag)}</button>
                                ))}
                                <button type="button" onClick={() => saveVisit(VISIT_TAGS[0])}
                                    className="kpm-press kpm-hover col-span-2 min-h-[48px] px-3 py-2 rounded-lg border-2 border-[var(--duke-edge-ctl)] bg-[var(--duke-fill-well)] text-[var(--duke-ink-1)] text-[13px] font-black uppercase tracking-[0.06em]">{tr(VISIT_TAGS[0])}</button>
                            </div>
                        </>) : (<>
                            <label htmlFor="kpm-request-note" className="mt-4 mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-[var(--duke-ink-6)]">{tr('New Request: what do they want?')}</label>
                            {/* text-base = 16px, so iOS does not zoom the page into the field */}
                            <textarea id="kpm-request-note" autoFocus rows={3} value={requestNote} onChange={(e) => setRequestNote(e.target.value)} placeholder={tr('e.g. 2 slop Sampoerna Mild by Thursday')}
                                className="w-full p-3 rounded-lg border-2 border-[var(--duke-edge-ctl)] bg-[var(--duke-fill-well)] text-[var(--duke-ink-1)] text-base outline-none focus:border-[var(--duke-amber-edge)]" />
                            <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
                                <button type="button" onClick={() => setRequestNote(null)} className="kpm-press min-h-[48px] px-4 rounded-lg border-2 border-[var(--duke-edge-ctl)] text-[var(--duke-ink-3)] text-[13px] font-black uppercase tracking-[0.06em]">{tr('Back')}</button>
                                <button type="button" disabled={!requestNote.trim()} onClick={() => saveVisit(VISIT_TAGS.find(t => t.includes('📝')), requestNote.trim())}
                                    className="kpm-press kpm-hover min-h-[48px] rounded-lg border-2 border-[var(--duke-amber-edge)] bg-[var(--duke-fill-plank)] text-[var(--duke-amber-ink)] text-[13px] font-black uppercase tracking-[0.12em] disabled:opacity-40">{tr('Save request')}</button>
                            </div>
                        </>)}
                    </div>
                </div>,
                document.body
            )}

            {/* Always mounted now. It used to be hidden whenever the Merchant tab was open,
                which is the ~2n tab switches per sale this phase exists to remove. No bottom
                padding since 2026-10-31: the manifest left the bottom of the phone for the side. */}
            <div className="hide-on-print flex-1 min-w-0 flex flex-col h-full bg-[var(--duke-fill-deep)] overflow-hidden">
                {/* WHICH STOCK AM I SELLING FROM — the boss's only. This used to be a bar in the
                    app shell above the whole terminal, where the manifest drawer painted over it
                    (his G5 report, twice). It is a row of this column now because this column is
                    what it changes: every ware below this line comes from whichever side is lit.
                    Same plates as the SALE/RETUR toggle in the manifest — same kind of switch. */}
                {/* B, phone: who is buying and how they pay, on top of the shelf. The SAME picker and the same
                    paymentMethod as the slip; manifest-dropdown-area keeps the picker's click-outside listener off it. */}
                <div className="manifest-dropdown-area lg:hidden shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-[var(--duke-edge-1)] bg-[var(--duke-fill-well)]">
                    <button type="button" onClick={() => setShowCustomerDropdown(true)} className="kpm-press min-w-0 flex-1 min-h-[44px] flex items-center gap-2 text-left">
                        {customerName.trim() && <span className="shrink-0 text-[12px] font-bold text-[var(--duke-ink-5)]">{getLang() === 'id' ? 'Pelanggan' : 'Customer'}</span>}
                        <span className={`truncate text-[14px] ${customerName.trim() ? 'font-black uppercase text-[var(--duke-ink-1)]' : 'font-bold text-[var(--duke-ink-5)]'}`}>{customerName.trim() || tr('Tap to choose the customer')}</span>
                        <ChevronDown size={14} className="shrink-0 text-[var(--duke-ink-5)]" />
                    </button>
                    <select aria-label={tr('Payment Method')} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={isReturMode} className={`shrink-0 max-w-[40%] h-11 rounded-md border border-[var(--duke-edge-ctl)] bg-[var(--duke-fill-ground)] px-2 text-[13px] font-bold text-[var(--duke-ink-1)] outline-none ${isReturMode ? 'opacity-50' : ''}`}>
                        {payOptions.map(method => ( <option key={method} value={method}>{tr(method === 'Titip' ? 'Consignment' : method)}</option> ))}
                    </select>
                </div>
                {onAdminSalesMode && (
                    <div className="flex px-3 border-b border-[var(--duke-edge-1)] shrink-0">
                        <button onClick={() => onAdminSalesMode('VAULT')} className={`kpm-hover flex-1 min-h-[44px] lg:min-h-[36px] text-[11px] font-black uppercase tracking-widest border-b-2 -mb-px transition-colors ${adminSalesMode !== 'VEHICLE' ? 'border-[var(--duke-amber-edge)] text-[var(--duke-ink-1)]' : 'border-transparent text-[var(--duke-ink-5)] hover:text-[var(--duke-ink-1)]'}`}>{tr('Master Vault')}</button>
                        <button onClick={() => onAdminSalesMode('VEHICLE')} className={`kpm-hover flex-1 min-h-[44px] lg:min-h-[36px] text-[11px] font-black uppercase tracking-widest border-b-2 -mb-px transition-colors ${adminSalesMode === 'VEHICLE' ? 'border-[var(--duke-amber-edge)] text-[var(--duke-ink-1)]' : 'border-transparent text-[var(--duke-ink-5)] hover:text-[var(--duke-ink-1)]'}`}>{tr('Boss Car')}</button>
                    </div>
                )}
                {/* B, PC: THE DAY IN ONE STRIP (it was the side rail, and only from 1280 px). Two states, never both at
                    once, as the rail had it: between shops it is the day; with a shop chosen it is that shop's file - a
                    running total on screen during a sale invites him to watch his scoreboard instead of the customer.
                    A product's stock opens under its own row now, as on the phone, so there is no third state. */}
                <div className="hidden lg:block shrink-0 px-4 pt-4">
                    {customerSettled ? (
                        <div className="rounded-lg border border-[var(--duke-edge-1)]">
                            {nearbyStores.length >= 2 && <div className="px-4 pt-3 -mb-1">{renderStoreSwap()}</div>}
                            <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] divide-x divide-[var(--duke-edge-1)]">
                                <div className="min-w-0 px-4 py-3">
                                    <div className="text-[12px] text-[var(--ink-dim)]">{tr('Before you go in')}{brief && <> &middot; {tr('Last order')} {agoLabel(brief.lastAt)}</>}</div>
                                    {brief ? (
                                        <>
                                            <div className="mt-1 truncate text-[14px] font-bold text-[var(--ink)]">
                                                {brief.lastItems.length
                                                    ? <>{brief.lastItems.slice(0, 3).map(it => `${it.name} ${it.qty} ${it.unit}`).join(' · ')}{brief.lastItems.length > 3 && ` +${brief.lastItems.length - 3} more`}</>
                                                    : tr('No line detail on that order.')}
                                            </div>
                                            <div className="mt-0.5 text-[13px] font-black tabular-nums text-[var(--duke-amber-ink)]">Rp {new Intl.NumberFormat('id-ID').format(brief.lastTotal)}</div>
                                        </>
                                    ) : (
                                        <div className="mt-1 text-[13px] leading-snug text-[var(--ink-dim)]">{tr('No order in the last 7 days.')} <span className="text-[var(--ink-disabled)]">{tr('New account, or one worth asking about.')}</span></div>
                                    )}
                                </div>
                                <div className="min-w-0 px-4 py-3">
                                    <div className="text-[12px] text-[var(--ink-dim)]">{tr('Usual basket')}</div>
                                    <div className="mt-1 text-[19px] font-black leading-tight tabular-nums text-[var(--ink)]">{brief ? `Rp ${new Intl.NumberFormat('id-ID').format(brief.avgBasket)}` : '—'}</div>
                                    <div className="mt-0.5 text-[12px] tabular-nums text-[var(--ink-dim)]">{tr('Visits · 7d')}: {brief ? brief.visits : 0}</div>
                                </div>
                                <div className="flex flex-col justify-center px-4 py-3">
                                    <button
                                        onClick={handleReorder}
                                        disabled={isReturMode || !brief?.lastItems?.length}
                                        className="kpm-hover kpm-press px-4 rounded border-2 kpm-reorder py-2.5 font-mono text-[11px] font-black uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:border-[var(--line-2)] disabled:bg-none disabled:bg-transparent disabled:text-[var(--ink-disabled)]"
                                    >
                                        {tr('Same as last time')}
                                    </button>
                                    {isReturMode && (
                                        <p className="m-0 mt-1.5 text-[11px] leading-snug text-[var(--ink-dim)]">{tr('Not while a retur is open.')}</p>
                                    )}
                                </div>
                            </div>
                            {/* Reported, never blocked: he may go back, sell on another man's ground, or sell to a shop
                                that owes - but he is told, in view, before the first product goes in. */}
                            {(revisitToday || territoryClaim || (debtInfo && debtInfo.totalDebt > 0)) && (
                                <div className="flex flex-wrap gap-2 border-t border-[var(--duke-edge-1)] px-4 py-2">
                                    {revisitToday && (
                                        <div className={`border-l-[3px] px-3 py-1.5 text-[12px] leading-snug ${revisitToday === 'me' ? 'border-[var(--duke-amber-edge)] text-[var(--duke-amber-ink)]' : 'border-[var(--danger)] bg-[var(--danger-well)] text-[var(--ink-muted)]'}`}>
                                            <span className="font-black uppercase">{revisitToday === 'me' ? 'Already sold here today' : 'Already secured today'}</span>{' '}
                                            {revisitToday === 'me'
                                                ? 'This would be a second visit.'
                                                : <>{tr('Claimed by')} <span className="font-black uppercase text-[var(--danger-ink)]">{revisitToday}</span>. Selling here is a redundant visit.</>}
                                        </div>
                                    )}
                                    {territoryClaim && (
                                        <div className="border-l-[3px] border-[var(--danger)] bg-[var(--danger-well)] px-3 py-1.5 text-[12px] leading-snug text-[var(--ink-muted)]">
                                            <span className="font-black uppercase text-[var(--duke-danger-ink)]">{tr('Another agent handles this store')}</span>{' '}
                                            {tr('Assigned to')} <span className="font-black uppercase text-[var(--danger-ink)]">{territoryClaim}</span>. Selling is allowed — this sale will be recorded as a territory override.
                                        </div>
                                    )}
                                    {debtInfo && debtInfo.totalDebt > 0 && (
                                        <div className="border-l-[3px] border-[var(--danger)] bg-[var(--danger-well)] px-3 py-1.5 text-[12px] leading-snug text-[var(--ink-dim)]">
                                            <span className="font-black uppercase text-[var(--duke-danger-ink)]">{tr('Owes')}</span>{' '}
                                            <span className="text-[14px] font-black tabular-nums text-[var(--danger-ink)]">Rp {new Intl.NumberFormat('id-ID').format(debtInfo.totalDebt)}</span> &middot; {debtInfo.ageDays} days old
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 xl:grid-cols-5 divide-x divide-[var(--duke-edge-1)] rounded-lg border border-[var(--duke-edge-1)]">
                            <div className="min-w-0 px-4 py-3">
                                <div className="text-[12px] text-[var(--ink-dim)]">{tr('Taken')}</div>
                                <div className="mt-1 text-[19px] font-black leading-tight tabular-nums text-[var(--ink)]">Rp {new Intl.NumberFormat('id-ID').format(today.today)}</div>
                                {/* Direction is carried by the ARROW first and colour second: the palette bans green. */}
                                {today.pct === null ? (
                                    <div className="mt-0.5 truncate text-[12px] text-[var(--ink-dim)]">{tr('no sales yesterday to compare')}</div>
                                ) : (
                                    <div className={`mt-0.5 truncate text-[12px] font-bold tabular-nums ${today.pct >= 0 ? 'text-[var(--ink-muted)]' : 'text-[var(--duke-danger-ink)]'}`}>
                                        <span aria-hidden="true">{today.pct >= 0 ? '▲' : '▼'}</span> {Math.abs(today.pct)}% <span className="font-normal text-[var(--ink-dim)]">vs yesterday, {clockLabel}</span>
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 px-4 py-3">
                                <div className="text-[12px] text-[var(--ink-dim)]">{tr('Stores done')}</div>
                                <div className="mt-1 text-[19px] font-black leading-tight tabular-nums text-[var(--ink)]">{today.stores}</div>
                                {today.storesYesterday > 0 && (
                                    <div className={`mt-0.5 truncate text-[12px] font-bold tabular-nums ${today.storesDelta >= 0 ? 'text-[var(--ink-muted)]' : 'text-[var(--duke-danger-ink)]'}`}>
                                        <span aria-hidden="true">{today.storesDelta >= 0 ? '▲' : '▼'}</span> {Math.abs(today.storesDelta)} <span className="font-normal text-[var(--ink-dim)]">{tr('vs yesterday')}</span>
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 px-4 py-3">
                                <div className="text-[12px] text-[var(--ink-dim)]">{tr('Last customer')}</div>
                                {today.last ? (
                                    <>
                                        <div className="mt-1 truncate text-[17px] font-black uppercase leading-tight text-[var(--ink)]">{today.last.customerName}</div>
                                        <div className="mt-0.5 truncate text-[12px] tabular-nums text-[var(--ink-dim)]">{agoLabel(today.lastAt)} &middot; Rp {new Intl.NumberFormat('id-ID').format(Number(today.last.total) || 0)}</div>
                                    </>
                                ) : <div className="mt-1 text-[17px] font-black text-[var(--ink-dim)]">—</div>}
                            </div>
                            <div className="min-w-0 px-4 py-3">
                                <div className="text-[12px] text-[var(--ink-dim)]">{tr('Running low')}</div>
                                {lowestStock ? (
                                    <>
                                        <div className="mt-1 truncate text-[15px] font-black uppercase leading-tight text-[var(--duke-danger-ink)]">{lowestStock.name}</div>
                                        {/* the boss can sell from either source, so the cell names that place in the buttons' own words */}
                                        <div className="mt-0.5 truncate text-[12px] tabular-nums text-[var(--ink-dim)]">{tr(adminSalesMode === 'VAULT' ? '{n} Bks left in the Master Vault' : '{n} Bks left in the vehicle', { n: new Intl.NumberFormat('id-ID').format(lowestStock.stock) })}</div>
                                    </>
                                ) : <div className="mt-1 text-[17px] font-black text-[var(--ink-dim)]">—</div>}
                            </div>
                            {/* WHERE HE GOES NEXT, from 1280 px. No fix, no suggestion - but SAY so: an empty space read as
                                "the feature is missing", and a desktop browser often has no location permission at all. */}
                            <div className="hidden xl:block min-w-0 px-4 py-3">
                                <div className="text-[12px] text-[var(--ink-dim)]">{tr('Next stop')}</div>
                                {!agentLocation ? (
                                    <button
                                        onClick={() => verifyLocation(true)}
                                        title={tr('Needs a GPS fix to know what is nearest.')}
                                        className="kpm-hover kpm-press mt-1.5 flex h-9 w-full items-center justify-center gap-2 rounded border border-[var(--duke-edge-1)] bg-transparent text-[11.5px] font-black uppercase tracking-[0.14em] text-[var(--duke-ink-3)] hover:text-[var(--duke-amber-ink)] hover:border-[var(--duke-amber-edge)] transition-colors"
                                    >
                                        <MapPin size={13}/> <span>{tr('Find me')}</span>
                                    </button>
                                ) : !upNext ? (
                                    <div className="mt-1 text-[12px] leading-snug text-[var(--ink-dim)]">{tr('Nothing left nearby — every store assigned to you has been visited today.')}</div>
                                ) : (
                                    <>
                                        <div className="mt-1 truncate text-[15px] font-black uppercase leading-tight text-[var(--ink)]">{upNext.customer.name}</div>
                                        <div className="mt-0.5 flex items-center gap-2 text-[12px] tabular-nums text-[var(--ink-dim)]">
                                            <span className="truncate">{metresLabel(upNext.metres)} &middot; {tr('{n} left today', { n: upNext.remaining })}</span>
                                            {/* a link, not a button: it leaves the app, and an app that leaves cannot finish a sale */}
                                            {directionsUrl(upNext.customer) && (
                                                <a href={directionsUrl(upNext.customer)} target="_blank" rel="noopener noreferrer" className="kpm-hover shrink-0 inline-flex items-center gap-1 font-black uppercase text-[var(--duke-ink-3)] no-underline hover:text-[var(--duke-amber-ink)]">
                                                    <Map size={12}/> {tr('Directions')}
                                                </a>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {/* The kinds are bordered buttons (his 2026-11-12 "redesign this panel that show type of the items"): on the phone
                    they get their own row, edge to edge, so a name is never cut in half beside the search; at lg the search
                    shares the row. The lit one takes the gold edge (amber is a mark, never a plate). A 44 px press, a 32 px look. */}
                <div className="flex flex-col lg:flex-row lg:items-stretch lg:gap-2 px-3 lg:px-4 lg:mt-2 border-b border-[var(--duke-edge-1)] shrink-0 relative z-10">
                    <div className="flex items-center gap-1.5 min-w-0 -mx-3 px-3 lg:mx-0 lg:px-0 overflow-x-auto scrollbar-hide">
                        {categories.map(cat => ( <button key={cat} type="button" onClick={() => setActiveCategory(cat)} aria-pressed={activeCategory === cat} className="kpm-hover group shrink-0 min-h-[44px] flex items-center"><span className={`px-3 py-1.5 rounded-lg border text-[12px] font-black uppercase tracking-wide whitespace-nowrap transition-colors ${activeCategory === cat ? 'border-[var(--duke-amber-edge)] bg-[var(--duke-fill-well)] text-[var(--duke-ink-1)]' : 'border-[var(--duke-edge-ctl)] text-[var(--duke-ink-5)] group-hover:text-[var(--duke-ink-1)]'}`}>{tr(cat)}</span></button> ))}
                    </div>
                    <div className="relative w-full lg:w-auto lg:flex-1 min-w-[120px] lg:self-center pb-2 lg:py-1.5">
                        <input ref={searchRef} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={tr('SEARCH WARES...')} className="w-full bg-transparent border border-[var(--duke-edge-ctl)] p-2 pl-9 md:pl-10 pr-2 lg:pr-10 min-h-[44px] lg:min-h-0 text-[var(--duke-amber-ink)] font-mono text-[13px] md:text-sm font-bold outline-none focus:border-[var(--duke-amber-edge)] rounded-lg transition-colors"/>
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--duke-ink-3)]"/>
                        <span className="kpm-kbd hidden lg:inline-grid absolute right-3 top-1/2 -translate-y-1/2">/</span>
                    </div>
                </div>

                {/* DESKTOP: the wares stop being a sideways carousel and become a wrapping
                    grid at lg (1024px+). Below that nothing changes - the carousel is right on
                    a phone, where sideways swiping is natural and vertical space is scarce.
                    The file had NO xl or 2xl classes at all, so a 1920px screen was rendering
                    the 1024px layout and scrolling sideways through 260px cards. */}
                {/* ---------- THE CONTEXT STRIP — phone only ----------
                    The rail does not come to the phone: there is no room and no cursor to
                    drive it. What crosses over is the INFORMATION, in the shape a phone can
                    carry — one card, never a dashboard.

                    It shows the customer's file while he is deciding, then collapses to a
                    single line the moment the basket has something in it. That is the whole
                    trick: a brief is worth a lot in the thirty seconds before the
                    conversation and nothing at all while he is counting Karton, so it gives
                    the room back to the shelf exactly when the shelf needs it.

                    Collapsing is a swap between two short blocks, NOT an animated height.
                    Height animates through layout on every frame; on the cheap Android this
                    runs on that is the difference between smooth and not. */}
                {/* DRIVING — no customer chosen yet, so the useful thing is where he is going,
                    not what he is selling. This is the state the phone spends most of its day
                    in, and it used to show nothing at all. */}
                {!customerSettled && upNext && (
                    <div className="kpm-strip lg:hidden shrink-0 border-b border-[var(--duke-edge-1)] bg-[var(--duke-fill-well)] px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-mono text-[8.5px] font-black uppercase tracking-[0.16em] text-[var(--duke-brass-ink)]">{tr('Next stop')}</div>
                                <div className="truncate font-mono text-[13px] font-black uppercase text-[var(--ink)]">{upNext.customer.name}</div>
                                <div className="mt-0.5 font-mono text-[10px] tabular-nums text-[var(--ink-dim)]">
                                    {metresLabel(upNext.metres)} &middot; {tr('{n} left today', { n: upNext.remaining })}
                                </div>
                            </div>
                            {directionsUrl(upNext.customer) && (
                                /* Secondary on purpose. It opens another app, and an app that
                                   leaves cannot finish a sale — so it never gets the primary
                                   weight even though it is the only button here. */
                                <a
                                    href={directionsUrl(upNext.customer)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="kpm-press flex h-11 shrink-0 items-center gap-1.5 rounded border border-[var(--duke-edge-1)] bg-[var(--duke-fill-ground)] px-3 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[var(--duke-ink-3)] no-underline"
                                >
                                    <Map size={14}/> {tr('Go')}
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* B: the shop's name is in the strip on top now, so this card no longer repeats it. With a cart it
                    shows only when the shop owes money - the one thing that must stay in view while he sells. */}
                {customerSettled && (cart.length === 0 || (debtInfo && debtInfo.totalDebt > 0)) && (
                    <div className="kpm-strip lg:hidden shrink-0 border-b border-[var(--duke-edge-1)] bg-[var(--duke-fill-well)] px-3 py-2">
                        {cart.length > 0 ? (
                            <div className="flex items-center justify-between gap-3 border-l-[3px] border-[var(--danger)] bg-[var(--danger-well)] px-2 py-1">
                                <div className="font-mono text-[11px] font-black uppercase tracking-[0.14em] text-[var(--duke-danger-ink)]">{tr('Owes')}</div>
                                <div className="font-mono text-[13px] font-black tabular-nums text-[var(--danger-ink)]">
                                    Rp {new Intl.NumberFormat('id-ID').format(debtInfo.totalDebt)}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {renderStoreSwap()}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-mono text-[11px] font-black uppercase tracking-[0.12em] text-[var(--duke-brass-ink)]">{tr('Before you go in')}</div>
                                        <div className="mt-0.5 font-mono text-[12px] tabular-nums text-[var(--ink-dim)]">
                                            {brief
                                                ? <>{tr('Last order {ago} · usually Rp {rp}', { ago: agoLabel(brief.lastAt), rp: new Intl.NumberFormat('id-ID').format(brief.avgBasket) })}</>
                                                : tr('No order in the last 7 days.')}
                                        </div>
                                        {/* HIS REPORT, G5: "it doesnt show me what is the last order item is, only the
                                            value". The desktop rail has listed the items since it was built (:2303);
                                            only the phone strip was reduced to a number, and the phone is where he
                                            cannot open the rail to go and look. `brief.lastItems` was already here —
                                            nothing new is fetched, it was simply never rendered on this branch.
                                            Two names then a count: the strip is one line of a card he reads at a
                                            doorstep, so it names enough to recognise the order, not to audit it. */}
                                        {brief?.lastItems?.length > 0 && (
                                            <div className="mt-0.5 truncate font-mono text-[12px] text-[var(--duke-ink-2)]">
                                                {brief.lastItems.slice(0, 2).map(it => it.name).join(' · ')}
                                                {brief.lastItems.length > 2 && ` +${brief.lastItems.length - 2} more`}
                                            </div>
                                        )}
                                    </div>
                                    {debtInfo && debtInfo.totalDebt > 0 && (
                                        <div className="shrink-0 border-l-[3px] border-[var(--danger)] bg-[var(--danger-well)] px-2 py-1 text-right">
                                            <div className="font-mono text-[8px] font-black uppercase tracking-[0.14em] text-[var(--duke-danger-ink)]">{tr('Owes')}</div>
                                            <div className="font-mono text-[11px] font-black tabular-nums text-[var(--danger-ink)]">
                                                Rp {new Intl.NumberFormat('id-ID').format(debtInfo.totalDebt)}
                                            </div>
                                            <div className="font-mono text-[8.5px] tabular-nums text-[var(--ink-dim)]">{debtInfo.ageDays}d old</div>
                                        </div>
                                    )}
                                </div>

                                {/* 44px tall, which is the touch minimum — this is pressed with a
                                    thumb, outdoors, often one-handed. */}
                                {brief?.lastItems?.length > 0 && !isReturMode && (
                                    <button
                                        onClick={handleReorder}
                                        className="kpm-press h-11 w-full rounded border-2 kpm-reorder font-mono text-[11px] font-black uppercase tracking-[0.12em]"
                                    >
                                        {tr('Same as last time')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* No onMouseLeave any more: the rail is PINNED by pressing a ware's picture,
                    so it must survive the cursor leaving. Clearing it on leave is what made the
                    panel unreachable — you cannot walk to a thing that disappears when you set
                    off towards it. Press the picture again, or another, to change it. */}
                <div className="flex-1 min-h-0 flex overflow-hidden">
                <div data-guide="products" className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-3 pb-[76px] lg:px-0 lg:pb-0 lg:mx-4 lg:mt-3 lg:mb-4 lg:self-start lg:max-h-[calc(100%-28px)] lg:rounded-lg lg:border lg:border-[var(--duke-edge-1)] flex flex-col scrollbar-hide bg-[var(--duke-fill-ground)] relative scroll-smooth" ref={scrollContainerRef}>
                    {/* B, PC: the table's head. The same six columns as the rows under it (one grid template, twice). */}
                    <div className="hidden lg:grid sticky top-0 z-20 shrink-0 grid-cols-[44px_minmax(0,1fr)_110px_170px_110px_132px] gap-x-4 px-4 py-2.5 border-b border-[var(--duke-edge-1)] bg-[var(--duke-fill-ground)] text-[12px] text-[var(--duke-ink-5)]">
                        <span></span>
                        <span>{getLang() === 'id' ? 'Barang' : 'Product'}</span>
                        <span>{getLang() === 'id' ? 'Jenis' : 'Type'}</span>
                        <span>{getLang() === 'id' ? 'Stok' : 'Stock'}</span>
                        <span className="text-right">{tr(`${lockedTier || 'Ecer'} Price`)}</span>
                        <span className="text-right">{getLang() === 'id' ? 'Jumlah' : 'Qty'}</span>
                    </div>
                    {/* FACTORY BUNDLES - one card each; the price is the cigarettes' own at this shop's tier, the promo is free */}
                    {activeCategory === 'BUNDLES' && bundles.map(b => {
                        const van = bundleCheck(b, inventory, promoVan, cart, give);
                        const gate = gateOf(b);   // the shop / switch / limit rule outranks the van's stock: its reason shows first
                        const chk = gate ? { ...van, ok: false, why: gate } : van;
                        const price = Number(b.price) > 0 ? Number(b.price) : (chk.lines || []).reduce((s, l) => s + tierPrice(l.product, newLineTier()) * l.bks, 0);
                        return (
                            <div key={b.id} data-guide="bundle-card" onClick={() => { unlockSounds().then(() => playSound(chk.ok ? 'click' : 'error')); applyBundle(b); }}
                                className={`kpm-hover font-mono w-full shrink-0 text-left cursor-pointer py-3 lg:px-4 border-b border-[var(--duke-edge-1)] flex items-center gap-3 transition-colors lg:hover:bg-[var(--duke-fill-well)] ${chk.ok ? '' : 'opacity-60'}`}>
                              <span className="flex-1 min-w-0 flex flex-col gap-1">
                                <h4 className="text-[var(--duke-ink-1)] text-[12px] lg:text-sm font-black uppercase leading-tight">{b.name}{b.region && <span className="ml-2 text-[10px] lg:text-xs font-bold tracking-widest text-[var(--duke-ink-5)]">· {b.region} ONLY</span>}</h4>
                                {(b.lines || []).map((l, i) => (
                                    <span key={`l${i}`} className="text-[11px] lg:text-xs font-bold text-[var(--duke-ink-3)] tabular-nums">{l.qty} {l.unit} · {inventory.find(p => p.id === l.productId)?.name || l.name}</span>
                                ))}
                                {(b.gives || []).map((g, i) => (
                                    <span key={`g${i}`} className="text-[11px] lg:text-xs font-bold text-[var(--duke-amber-ink)] tabular-nums">+ {g.qty} pcs {g.name} · FREE</span>
                                ))}
                                <span className={`mt-1 text-[12px] lg:text-sm font-black ${chk.ok ? 'text-[var(--duke-amber-ink)] tabular-nums' : 'text-[var(--duke-ink-5)]'}`}>
                                    {chk.ok ? `Rp ${new Intl.NumberFormat('id-ID').format(price)}${Number(b.price) > 0 ? ' · BUNDLE PRICE' : ''}` : chk.why}
                                </span>
                              </span>
                              {/* − n + exactly like a product row (his 2026-11-12 "no minus button ... no SFX and animation on the button press"):
                                  the same classes, the same sounds, kpm-press for the press. A press on the card itself still adds one. */}
                              <div className="shrink-0 flex items-center gap-2">
                                {bundleUse[b.id]?.taps > 0 && (
                                    <>
                                        <button type="button" aria-label={`${b.name}: one less`}
                                            onClick={(e) => { e.stopPropagation(); unlockSounds().then(() => playSound(bundleUse[b.id].taps > 1 ? 'click' : 'error')); removeBundle(b); }}
                                            className="kpm-press kpm-hover w-11 h-11 lg:w-9 lg:h-9 rounded-lg border border-[var(--duke-edge-ctl)] bg-transparent text-[var(--duke-ink-1)] text-lg font-black leading-none flex items-center justify-center"
                                        >−</button>
                                        <span className="w-[26px] text-center text-[15px] font-black tabular-nums text-[var(--duke-ink-1)]">{bundleUse[b.id].taps}</span>
                                    </>
                                )}
                                <button type="button" aria-label={`${b.name}: one more`}
                                    onClick={(e) => { e.stopPropagation(); unlockSounds().then(() => playSound(chk.ok ? 'click' : 'error')); applyBundle(b); }}
                                    className="kpm-press kpm-hover w-11 h-11 lg:w-9 lg:h-9 rounded-lg border border-[var(--duke-amber-edge)] bg-transparent text-[var(--duke-amber-ink)] text-lg font-black leading-none flex items-center justify-center"
                                >+</button>
                              </div>
                            </div>
                        );
                    })}
                    {filteredItems.map(item => {
                        /* B, THE PRICE LIST (his pick 2026-11-11): one ruled line per product. Phone: picture | name over
                           price + count | − n +. At lg the same nodes are the table's cells (lg:contents hands them to the
                           row's grid), so there is ONE row in the DOM for both widths. A press on the row still adds one
                           (the biggest target, the common action); a press on the picture opens that product's stock;
                           right-click still opens the 3D box. The big 3D pack left the shelf with the game look - it
                           still turns in the Examine box. */
                        const line = cart.find(c => c.productId === item.id);
                        const qty = line?.qty || 0;
                        const out = !isReturMode && item.stock <= 0;
                        const front = item.images?.front || item.image;
                        return (
                        <div key={item.id} onClick={() => addToCart(item)} onContextMenu={(e) => { e.preventDefault(); onInspect(item); }} className="product-card group relative z-10 w-full shrink-0 grid grid-cols-[44px_minmax(0,1fr)_auto] lg:grid-cols-[44px_minmax(0,1fr)_110px_170px_110px_132px] items-center gap-x-3 lg:gap-x-4 py-2 lg:px-4 border-b border-[var(--duke-edge-1)] cursor-pointer lg:hover:bg-[var(--duke-fill-well)] transition-colors">
                            {/* 44 px wide: the finger minimum, and what lets 8 products show before scrolling (5 before).
                                Nothing but the damaged-pack sign may sit on it - it is the press target for the stock. */}
                            <div className="relative w-11 h-14 lg:h-12 shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); unlockSounds().then(() => playSound('tap')); setExamineItem(prev => prev?.id === item.id ? null : item); }}
                                    aria-pressed={examineItem?.id === item.id}
                                    aria-label={`Show what is left of ${item.name}`}
                                    className={`relative w-full h-full grid place-items-center overflow-hidden rounded bg-transparent border-0 p-0 cursor-pointer ${examineItem?.id === item.id ? 'shadow-[inset_0_0_0_2px_var(--duke-brass-edge)]' : ''} ${out ? 'opacity-50' : ''}`}
                                >
                                    {front ? <img src={front} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-contain" />
                                           : <span className="leading-none break-all text-center text-[11px] lg:text-[9px] font-black font-mono tracking-widest text-[var(--duke-amber-ink)]">{tr('EXAMINE')}</span>}
                                </button>
                                {/* a Sell Again lot (helpers lotsAfterPacks) wears the quarantine sign */}
                                {isDamagedPack(item) && <HazardMark className="right-0 bottom-0 w-[18px] h-[18px] z-20" />}
                            </div>
                            <div className="min-w-0 lg:contents">
                                <h4 className={`text-[13px] lg:text-sm font-black uppercase leading-tight line-clamp-2 ${out ? 'text-[var(--duke-ink-5)]' : 'text-[var(--duke-ink-1)]'}`}>{item.name}</h4>
                                <span className="hidden lg:block truncate text-[13px] font-bold text-[var(--duke-ink-5)]">{item.type || tr('MISC')}</span>
                                <div className="mt-1 flex flex-row items-center gap-2 lg:contents">
                                    {/* the price THIS shop pays (his 2026-10-20: "the price shown on the card should be
                                        depending on the stores type that we are selling on"); Ecer until a shop is picked */}
                                    <span className="lg:order-2 lg:text-right text-[15px] lg:text-base font-black leading-none tabular-nums text-[var(--duke-amber-ink)]">{new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(cardPriceOf(item))}</span>
                                    {/* THE COUNT, in his units, with its flip (his 2026-10-20 pick B: "agent inventory detected
                                        16 mrapi cigarette but on the sales terminal there is no information regarding its
                                        quantity"). LOW keeps its amber as an edge and an ink, never a fill. */}
                                    <div className="lg:order-1 min-w-0">
                                        {item.stock <= 0 ? (
                                            <span className="text-[11px] lg:text-xs font-black px-1.5 py-0.5 rounded border inline-block border-[color-mix(in_srgb,var(--danger)_60%,transparent)] text-[var(--duke-danger-ink)]">{tr('EMPTY')}</span>
                                        ) : isLowOnTerminal(item) ? (
                                            <button type="button" onClick={(e) => flipCount(e, item)} title={COUNT_FLIP_TITLE} className={`kpm-card-count ${flatCountId === item.id ? 'is-flat ' : ''}relative before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] cursor-pointer text-left text-[11px] lg:text-xs font-black px-1.5 py-0.5 rounded border inline-block bg-transparent text-[var(--duke-amber-ink)] border-[color-mix(in_srgb,var(--duke-amber-edge)_50%,transparent)]`}>LOW · {countFaces(item)}</button>
                                        ) : (
                                            <button type="button" onClick={(e) => flipCount(e, item)} title={COUNT_FLIP_TITLE} className={`kpm-card-count ${flatCountId === item.id ? 'is-flat ' : ''}relative before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] cursor-pointer text-left text-[11px] lg:text-xs font-bold px-1.5 py-0.5 rounded border inline-block bg-transparent text-[var(--duke-ink-3)] border-[var(--duke-edge-1)]`}>{countFaces(item)}</button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* − n + on the row. 44 px on the phone (his 2026-09-17 B). The − and the number appear
                                with the first one added, so an untouched row is a name, a price and one "+". */}
                            <div className="flex items-center gap-1 shrink-0 lg:order-3 lg:justify-end">
                                {line && (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // a tap on the way down, a distinct tone when the line is removed
                                                unlockSounds().then(() => playSound(qty > 1 ? 'click' : 'error'));
                                                qty > 1 ? updateCartItem(item.id, 'qty', qty - 1) : setCart(c => c.filter(i => i.productId !== item.id));
                                            }}
                                            className="kpm-press kpm-hover w-11 h-11 lg:w-9 lg:h-9 rounded-lg border border-[var(--duke-edge-ctl)] bg-transparent text-[var(--duke-ink-1)] text-lg font-black leading-none flex items-center justify-center"
                                        >−</button>
                                        <span className="w-[26px] text-center text-[15px] font-black tabular-nums text-[var(--duke-ink-1)]">{qty}</span>
                                    </>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); unlockSounds().then(() => playSound('click')); addToCart(item); }}
                                    className={`kpm-press kpm-hover w-11 h-11 lg:w-9 lg:h-9 rounded-lg border border-[var(--duke-amber-edge)] bg-transparent text-[var(--duke-amber-ink)] text-lg font-black leading-none flex items-center justify-center ${out ? 'opacity-40' : ''}`}
                                >+</button>
                            </div>

                            {/* A press on the picture opens its stock here, under its own row, in the units he counts in.
                                Standing at the back of the van he needs "two Karton and a Bal", not 1.847. */}
                            {examineItem?.id === item.id && (
                                <div className="kpm-strip col-span-full lg:order-4 mt-2 border-t border-[var(--duke-edge-1)] bg-[var(--duke-fill-well)] px-2 py-2">
                                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                                        <span className="font-mono text-[11px] font-black uppercase tracking-[0.12em] text-[var(--ink-dim)]">{tr('In vehicle')}</span>
                                        {item.dimensions && (
                                            <span className="font-mono text-[11px] tabular-nums text-[var(--ink-disabled)]">
                                                {item.dimensions.w}×{item.dimensions.h}×{item.dimensions.d} mm
                                            </span>
                                        )}
                                    </div>
                                    {item.stock > 0 ? (
                                        <>
                                            <div className="grid grid-cols-4 gap-1 lg:max-w-md">
                                                {(() => {
                                                    const split = splitToUnits(item.stock, item);
                                                    return ['Karton', 'Bal', 'Slop', 'Bks'].map(u => (
                                                        <div key={u} className={`rounded border px-1 py-1 text-center ${split[u] ? 'border-[var(--duke-edge-2)] bg-[var(--duke-fill-ground)]' : 'border-[var(--line)]'}`}>
                                                            <div className={`font-mono text-[15px] font-black tabular-nums leading-none ${split[u] ? 'text-[var(--ink)]' : 'text-[var(--duke-ink-8)]'}`}>{split[u]}</div>
                                                            <div className="mt-0.5 font-mono text-[10px] font-black uppercase tracking-[0.1em] text-[var(--ink-dim)]">{u}</div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                            <div className="mt-1 font-mono text-[11px] tabular-nums text-[var(--ink-dim)]">
                                                = {new Intl.NumberFormat('id-ID').format(item.stock)} Bks total
                                            </div>
                                        </>
                                    ) : (
                                        <div className="font-mono text-[11px] font-black uppercase text-[var(--duke-danger-ink)]">{tr('Empty')}</div>
                                    )}

                                    {/* a full 44 px row, and only once he has asked about this product */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); unlockSounds().then(() => playSound('click')); onInspect(item); }}
                                        className="kpm-press mt-2 flex h-11 w-full lg:max-w-md items-center justify-center gap-2 rounded border border-[var(--duke-edge-1)] bg-[var(--duke-fill-ground)] font-mono text-[11px] font-black uppercase tracking-[0.14em] text-[var(--duke-ink-3)]"
                                    >
                                        <Eye size={14}/> <span>{tr('Examine in 3D')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        );
                    })}
                </div>

                </div>
            </div>
            {/* He stepped out of the cave. Same sprite, same line, same mood — the only
                difference is where he is standing, so there is nothing here that can drift out
                of sync with the alcove. Desktop only: below lg there is no alcove to leave, and
                CapybaraMascot already covers the phone.

                Rendered HERE, at the terminal root, and deliberately NOT inside the ledger
                column. That column carries lg:z-10, which starts its own stacking context —
                anything inside it is trapped below z-index 10 no matter what its own z-index
                says, so he was painted behind the wares grid that follows him in the DOM. A
                fixed element only escapes if no ancestor has boxed it in. */}
            {floatShown && (
                /* B: the slip is on the right now, so his corner is the bottom LEFT - at the right he stood on the
                   total and the save button (his 2026-11-12 "the capybara on the right is blocking the shopping panel") */
                <div className={`kpm-merch-float hide-on-print hidden lg:block lg:!right-auto lg:!left-6 ${floatLeaving ? 'leaving' : ''}`}>
                    {merchantLine && merchantMood !== 'idle' && (
                        <p className="bubble" role="status">{merchantLine}</p>
                    )}
                    <div className={`fig kpm-merch ${merchSprite}`} aria-hidden="true">
                        {merchantMood === 'deal' && <span className="kpm-merch-hold"></span>}
                    </div>
                </div>
            )}

            {/* the duplicate desktop manifest lived here. Removed 2026-08-03: the drawer
                column above now carries the manifest at every width. Its removal also kills
                the duplicate `bypassPhotoCapture` element id that made
                document.getElementById always hit the mobile copy. */}

            {/* --- THE NOO REGISTRATION MODAL --- */}
            {showNooModal && (
                <div className="fixed inset-0 z-[300] bg-[var(--duke-scrim-hi)] flex items-center justify-center p-4 font-sans backdrop-blur-md">
                    <div className="bg-[var(--duke-fill-ground)] w-full max-w-lg border-2 border-orange-500/50 rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.2)] flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up">
                        <div className="p-5 border-b border-[var(--duke-edge-1)] bg-[var(--duke-bar)] flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black text-[var(--duke-ink-hi)] flex items-center gap-2 uppercase tracking-wider"><Store size={20} className="text-orange-500"/> {tr('Outlet Registration')}</h2>
                                <p className="text-[10px] text-[var(--duke-ink-3)] uppercase tracking-widest mt-1">{tr('Unlock Requested Pricing Tiers')}</p>
                            </div>
                            <button onClick={() => setShowNooModal(false)} className="text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]"><X size={24}/></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
                            {/* Proximity duplicate guard, rendered instead of the window.confirm
                                that used to sit in validateNoo. Registration is refused only while
                                this bar is on screen, so the refusal always has a visible reason
                                and a visible way past it — the old dialog had neither. */}
                            {proximityHit && (
                                <div className="border-l-[3px] border-[var(--danger)] bg-[var(--danger-well)] px-3 py-3">
                                    <div className="font-mono text-[9.5px] font-black uppercase tracking-[0.16em] text-[var(--duke-danger-ink)] mb-1">Existing store {proximityHit.metres}m away</div>
                                    <div className="font-mono text-[10px] leading-snug text-[var(--ink-muted)] mb-2.5">
                                        {tr('You are standing next to')} <span className="font-black uppercase text-[var(--danger-ink)]">{proximityHit.name}</span>. Registering again would create a duplicate of it.
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setProximityAck(proximityHit.name); setProximityHit(null); }}
                                        className="w-full min-h-[44px] bg-[var(--duke-fill-plank)] hover:bg-[var(--duke-fill-plank-2)] text-[var(--duke-amber-ink)] text-[10px] font-black uppercase tracking-widest py-2.5 rounded transition-colors"
                                    >
                                        {tr('This is a different building — continue')}
                                    </button>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-[var(--duke-ink-3)] uppercase tracking-widest block mb-1">{tr('Store Name')}</label>
                                <input value={customerName} disabled className="w-full bg-[var(--duke-well-solid)] border border-[var(--duke-edge-ctl)] text-[var(--duke-ink-1)] p-3 rounded font-bold uppercase opacity-70" />
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-[var(--duke-ink-3)] uppercase tracking-widest block mb-1">{tr('WhatsApp / Phone')} <span className="text-red-500">*</span></label>
                                <input value={nooForm.phone} onChange={e => setNooForm({...nooForm, phone: e.target.value})} placeholder={tr('e.g. 081234567890')} className="w-full bg-[var(--duke-fill-panel)] border border-[var(--duke-edge-ctl)] focus:border-orange-500 outline-none text-[var(--duke-ink-hi)] p-3 rounded font-bold" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-[var(--duke-ink-3)] uppercase tracking-widest block mb-1">{tr('Requested Pricing Tier')} <span className="text-red-500">*</span></label>
                                <select value={nooForm.requestedTier} onChange={e => setNooForm({...nooForm, requestedTier: e.target.value})} className="w-full bg-[var(--duke-fill-panel)] border border-[var(--duke-edge-ctl)] focus:border-orange-500 outline-none text-[var(--duke-ink-hi)] p-3 rounded font-bold uppercase">
                                    {allowedTiers.map(tier => ( <option key={tier} value={tier}>{tier === 'Grosir' && !canConfirmGrosir(userRole) ? 'Grosir (admin confirms first - sells at Retail till then)' : tier}</option> ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-[var(--duke-ink-3)] uppercase tracking-widest block mb-2">{tr('Storefront Photo')} <span className="text-red-500">*</span></label>
                                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handlePhotoCapture} className="hidden" />
                                {nooForm.photoUrl ? (
                                    <div className="relative rounded-lg overflow-hidden border-2 border-orange-500 bg-[var(--duke-stage)]">
                                        <img src={nooForm.photoUrl} alt="Store Proof" className="w-full h-48 object-contain" />
                                        <button onClick={() => setNooForm({...nooForm, photoUrl: null, photoFile: null})} className="absolute top-2 right-2 bg-red-600 text-[var(--duke-on-fill)] p-1.5 rounded-full"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <button onClick={() => fileInputRef.current.click()} className="w-full border-2 border-dashed border-[var(--duke-edge-ctl)] hover:border-orange-500 bg-[color-mix(in_srgb,var(--duke-fill-panel)_50%,transparent)] hover:bg-[var(--duke-fill-panel)] text-[var(--duke-ink-3)] hover:text-orange-400 transition-colors py-8 rounded-lg flex flex-col items-center justify-center gap-2">
                                        <Camera size={32} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Capture Live Photo</span>
                                        <span className="text-[11px] opacity-60">(Live Camera Only - Gallery Disabled)</span>
                                    </button>
                                )}
                            </div>
                            
                            <div className="bg-[var(--duke-bar-2)] p-3 rounded border border-[var(--duke-edge-1)] flex justify-between items-center gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[var(--duke-fill-plank)] text-[var(--duke-amber-ink)] rounded-full"><Map size={16}/></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-[var(--duke-ink-3)] uppercase tracking-widest">Location Tracking</p>
                                        <p className="text-xs text-[var(--duke-amber-ink)] font-mono">{agentLocation ? `${agentLocation.latitude.toFixed(5)}, ${agentLocation.longitude.toFixed(5)}` : tr('Awaiting GPS Lock...')}</p>
                                    </div>
                                </div>
                                {!agentLocation && (
                                    <button onClick={() => verifyLocation(true)} className="text-[11px] bg-[var(--duke-fill-panel)] hover:bg-[var(--duke-fill-plank)] text-[var(--duke-ink-1)] border border-[var(--duke-edge-ctl)] px-3 py-1.5 rounded uppercase font-bold transition-colors shadow-md">
                                        Force GPS Lock
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-5 border-t border-[var(--duke-edge-1)] bg-[var(--duke-bar)] flex flex-col gap-3">
                            <button onClick={submitNooRegistration} disabled={!agentLocation} className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.1em] transition-all shadow-lg flex items-center justify-center gap-2 ${agentLocation ? 'bg-orange-600 hover:bg-orange-500 text-[var(--duke-on-fill)] shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-[var(--duke-fill-panel)] text-[var(--duke-ink-3)] cursor-not-allowed'}`}>
                                {agentLocation ? 'Save & Proceed to Sale' : 'Acquiring Satellites...'}
                            </button>
                            <button onClick={submitNooOnly} disabled={!agentLocation} className={`w-full py-3 rounded-xl font-black uppercase tracking-[0.1em] transition-all border-2 flex items-center justify-center gap-2 ${agentLocation ? 'bg-[var(--duke-fill-panel)] border-[var(--duke-edge-ctl)] hover:border-[var(--duke-brass-edge)] hover:text-[var(--duke-brass-ink)] text-[var(--duke-ink-1)]' : 'bg-[var(--duke-fill-panel)] border-[var(--duke-edge-ctl)] text-[var(--duke-ink-3)] cursor-not-allowed'}`}>
                                Register Only (No Sale)
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* --- SAMPLING DEPLOYMENT MODAL --- */}
            {showSampleModal && (
                <div className="fixed inset-0 z-[300] bg-[var(--duke-scrim-hi)] flex items-center justify-center p-4 font-sans backdrop-blur-md">
                    <div className="bg-[var(--duke-fill-ground)] w-full max-w-md border-2 border-[color-mix(in_srgb,var(--duke-brass-edge)_50%,transparent)] rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.2)] flex flex-col animate-fade-in-up">
                        <div className="p-5 border-b border-[var(--duke-edge-1)] bg-[var(--duke-bar)] flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black text-[var(--duke-ink-hi)] flex items-center gap-2 uppercase tracking-wider"><Package size={20} className="text-[var(--duke-brass-ink)]"/> {tr('Deploy Marketing Sample')}</h2>
                                <p className="text-[10px] text-[var(--duke-ink-3)] uppercase tracking-widest mt-1">Target: {customerName}</p>
                            </div>
                            <button onClick={() => setShowSampleModal(false)} className="text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]"><X size={24}/></button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-[var(--duke-ink-3)] uppercase tracking-widest block mb-1">{tr('Select Product')}</label>
                                <select value={sampleForm.productId} onChange={e => setSampleForm({...sampleForm, productId: e.target.value})} className="w-full bg-[var(--duke-fill-panel)] border border-[var(--duke-edge-ctl)] focus:border-[var(--duke-brass-edge)] outline-none text-[var(--duke-ink-hi)] p-3 rounded font-bold">
                                    <option value="">-- Choose Product --</option>
                                    {inventory.map(p => {
                                        const sp = p.sticksPerPack || 16;
                                        const bks = Math.floor(p.stock || 0);
                                        const btg = Math.round(((p.stock || 0) - bks) * sp);
                                        const stockLabel = `${bks} Bks${btg > 0 ? ` ${btg} Btg` : ''}`;
                                        
                                        return (
                                            <option key={p.id} value={p.id}>{p.name} (Avail: {stockLabel})</option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-[color-mix(in_srgb,var(--duke-fill-panel)_50%,transparent)] p-3 rounded-xl border border-[var(--duke-edge-1)]">
                                <div>
                                    <label className="text-[10px] font-bold text-[var(--duke-ink-3)] uppercase tracking-widest mb-1 block text-center">Bungkus</label>
                                    <input type="number" min="0" placeholder="0" value={sampleForm.qtyBks === 0 ? '' : sampleForm.qtyBks} onChange={e=>setSampleForm({...sampleForm, qtyBks: parseInt(e.target.value)||0})} className="w-full p-2 border rounded bg-[var(--duke-fill-ground)] border-[var(--duke-edge-ctl)] text-[var(--duke-ink-hi)] text-center font-bold text-lg focus:border-[var(--duke-brass-edge)] outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[var(--duke-ink-3)] uppercase tracking-widest mb-1 block text-center">
                                        Batang {sampleForm.productId && `(Max: ${(inventory.find(p => p.id === sampleForm.productId)?.sticksPerPack || 16) - 1})`}
                                    </label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        placeholder="0" 
                                        max={sampleForm.productId ? (inventory.find(p => p.id === sampleForm.productId)?.sticksPerPack || 16) - 1 : ""}
                                        value={sampleForm.qtyBatang === 0 ? '' : sampleForm.qtyBatang} 
                                        onChange={e => {
                                            let val = parseInt(e.target.value) || 0;
                                            const maxBtg = (inventory.find(p => p.id === sampleForm.productId)?.sticksPerPack || 16) - 1;
                                            if (val > maxBtg) val = maxBtg; 
                                            setSampleForm({...sampleForm, qtyBatang: val});
                                        }} 
                                        className="w-full p-2 border rounded bg-[var(--duke-fill-ground)] border-[var(--duke-edge-2)] text-[var(--duke-brass-ink)] text-center font-bold text-lg focus:border-[var(--duke-brass-edge)] outline-none" 
                                    />
                                </div>
                            </div>
                            
                            {appSettings?.cukaiReturn !== false && (   /* pita cukai OFF in Settings: nothing to collect, so no warning */
                            <div className="bg-[color-mix(in_srgb,var(--duke-brass)_10%,transparent)] p-3 rounded border border-[color-mix(in_srgb,var(--duke-brass-edge)_30%,transparent)] text-[var(--duke-brass-ink)] text-[10px] uppercase tracking-widest font-bold flex items-start gap-2">
                                <AlertCircle size={14} className="shrink-0 mt-0.5"/>
                                <p>{tr('Warning: You must collect the Pita Cukai for every open pack. This will be demanded during EOD Setoran.')}</p>
                            </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-[var(--duke-edge-1)] bg-[var(--duke-bar)]">
                            <button onClick={handleDeploySample} disabled={!sampleForm.productId || isProcessingSale || (sampleForm.qtyBks === 0 && sampleForm.qtyBatang === 0)} className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.1em] transition-all shadow-lg flex items-center justify-center gap-2 ${sampleForm.productId && (sampleForm.qtyBks > 0 || sampleForm.qtyBatang > 0) && !isProcessingSale ? 'bg-[var(--duke-brass-2)] hover:bg-[var(--duke-brass)] text-[var(--duke-on-fill)] shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-[var(--duke-fill-panel)] text-[var(--duke-ink-3)] cursor-not-allowed'}`}>
                                {isProcessingSale ? 'Deploying...' : 'Confirm & Deploy Sample'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- RECEIPT MODAL --- */}
            {receiptData && (() => {
                const activeTier = receiptData.items?.[0]?.priceTier || 'Retail';
                const isGrosir = activeTier === 'Grosir' || activeTier === 'Distributor';
                const unitLabel = isGrosir ? 'SLOP' : 'BKS';

                const catalogRows = inventory.map(invItem => {
                    const packsPerSlop = invItem.packsPerSlop || 10;
                    let basePrice = invItem.priceRetail || 0;
                    if (activeTier === 'Grosir') basePrice = invItem.priceGrosir || 0;
                    if (activeTier === 'Ecer') basePrice = invItem.priceEcer || 0;
                    
                    const displayPrice = isGrosir ? (basePrice * packsPerSlop) : basePrice;

                    const boughtItem = receiptData.items?.find(i => i.productId === invItem.id);
                    let displayQty = 0;
                    let rowTotal = 0;
                    
                    if (boughtItem) {
                        let qtyInBks = boughtItem.qty;
                        if (boughtItem.unit === 'Slop') qtyInBks = boughtItem.qty * packsPerSlop;
                        if (boughtItem.unit === 'Bal') qtyInBks = boughtItem.qty * (invItem.slopsPerBal || 20) * packsPerSlop;
                        if (boughtItem.unit === 'Karton') qtyInBks = boughtItem.qty * (invItem.balsPerCarton || 4) * (invItem.slopsPerBal || 20) * packsPerSlop;
                        
                        displayQty = isGrosir ? (qtyInBks / packsPerSlop) : qtyInBks;
                        rowTotal = boughtItem.calculatedPrice * boughtItem.qty;
                    }
                    return { name: invItem.name, displayPrice, displayQty, total: rowTotal, isBought: !!boughtItem };
                });

                receiptData.items?.forEach(boughtItem => {
                    if (!inventory.find(i => i.id === boughtItem.productId)) {
                        let qtyInBks = boughtItem.unit === 'Bks' ? boughtItem.qty : boughtItem.qty * 10;
                        let bksPrice = boughtItem.unit === 'Bks' ? boughtItem.calculatedPrice : boughtItem.calculatedPrice / 10;
                        
                        let displayQty = isGrosir ? (qtyInBks / 10) : qtyInBks;
                        let displayPrice = isGrosir ? (bksPrice * 10) : bksPrice;
                        
                        catalogRows.push({ name: boughtItem.name + " (Discontinued)", displayPrice, displayQty, total: boughtItem.calculatedPrice * boughtItem.qty, isBought: true });
                    }
                });

                const rawDate = receiptData.date || '';
                const dateParts = rawDate.split(', ');
                const receiptDateStr = dateParts[0] || rawDate;
                const receiptTimeStr = dateParts[1] || '';

                return (
                    <div className="print-modal-wrapper fixed inset-0 z-[400] bg-black/90 flex flex-col items-center justify-center gap-3 p-4">
                        {/* THE DEAL MOMENT, MOVED TO WHERE THE EYES ARE.
                            The receipt covers the alcove, so the deal pose played behind it and was
                            never seen. Holding the receipt back until the animation finished was the
                            obvious fix and the wrong one: it blocks the user for over a second on the
                            step he repeats all day, and a required document must not wait on a
                            flourish. So the merchant moves onto the receipt instead — same pose, same
                            coin, same line, drawn directly above the nota where he is already looking.
                            hide-on-print keeps him off the paper: the nota is KPM's document, and he
                            is not part of it. */}
                        <div className="hide-on-print hidden lg:flex items-center gap-6 shrink-0">
                            {/* 200px box scaled as a whole, NOT a smaller box with a smaller sheet.
                                The coin is positioned as a percentage of the figure, so shrinking the
                                box alone would walk it off his palm — the exact bug that cost a
                                session when the figure was 150px against 200px frames. The wrapper
                                reserves the SCALED footprint, including the coin, which sits at 72,5%
                                across; without that the bubble beside him overlapped the coin. */}
                            <div className="w-[150px] h-[150px] shrink-0 relative">
                                <div className="kpm-merch kpm-merch-deal w-[200px] h-[200px] absolute inset-0 origin-top-left scale-75">
                                    <span className="kpm-merch-hold"></span>
                                </div>
                            </div>
                            {merchantLine && (
                                <p className="max-w-[240px] rounded-lg border border-[var(--duke-edge-4)] bg-[var(--duke-paper)] px-3 py-2 font-mono text-[11px] font-bold leading-snug text-[var(--duke-on-plate)] shadow-lg">
                                    {merchantLine}
                                </p>
                            )}
                        </div>
                        <div className={`print-receipt format-${printFormat} !bg-white !text-black w-full ${printFormat === 'thermal' ? 'max-w-sm' : 'max-w-4xl'} shadow-2xl relative flex flex-col text-sm border-t-8 ${printFormat === 'a4' ? '!border-blue-800' : '!border-slate-800'} animate-fade-in rounded-b-lg max-h-[90vh] overflow-y-auto custom-scrollbar`}>
                            
                            {printFormat === 'thermal' && (
                                <div className="p-4 shrink-0 font-mono text-xs">
                                    <div className="text-center mb-4">
                                        <h2 className="text-base font-black uppercase tracking-widest !text-black">{appSettings?.companyName || "DISTRIBUTION AND SALES MANAGEMENT"}</h2>
                                        <p className="text-[10px] font-bold mt-1 !text-slate-400">OFFICIAL SALES RECEIPT</p>
                                    </div>
                                    
                                    <div className="text-left mb-3 space-y-0.5 border-y border-dashed !border-slate-400 py-2">
                                        <div className="flex"><span className="w-12 font-bold">TGL</span><span>: {receiptDateStr}</span></div>
                                        <div className="flex"><span className="w-12 font-bold">JAM</span><span>: {receiptTimeStr}</span></div>
                                        <div className="flex"><span className="w-12 font-bold">CUST</span><span className="uppercase break-words flex-1">: {receiptData.customer}</span></div>
                                        {receiptData.agentName && receiptData.agentName !== 'Admin' && <div className="flex"><span className="w-12 font-bold">SALES</span><span className="uppercase break-words flex-1">: {receiptData.agentName}</span></div>}
                                        <div className="flex"><span className="w-12 font-bold">BAYAR</span><span className="uppercase">: {receiptData.method || 'Cash'}</span></div>
                                    </div>

                                    <div className="border-b border-dashed !border-slate-400 pb-2 mb-2 min-h-[100px]">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-dashed !border-slate-400">
                                                    <th className="pb-1 font-bold">ITEM</th>
                                                    <th className="pb-1 text-right font-bold">TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="align-top">
                                                {receiptData.items && receiptData.items.length > 0 ? receiptData.items.map((item, i) => (
                                                    <tr key={i}>
                                                        <td className="py-1 pr-2">
                                                            <div className="font-bold uppercase break-words leading-tight">{item.name}</div>
                                                            {item.condition === 'DAMAGED' && item.returnReason && (
                                                                <div className="text-[11px] italic !text-slate-400 mb-0.5 mt-0.5">Reason: {item.returnReason === 'Other' ? item.otherReasonDetail : item.returnReason}</div>
                                                            )}
                                                            <div className="text-[10px] !text-slate-400 mt-0.5">{item.qty} {item.unit} x {new Intl.NumberFormat('id-ID').format(item.calculatedPrice || 0)}</div>
                                                        </td>
                                                        <td className="py-1 text-right font-black whitespace-nowrap">
                                                            {receiptData.method === 'Retur/BS' ? '-' : ''}{new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}
                                                        </td>
                                                    </tr>
                                                )) : receiptData.given?.length ? null : <tr><td colSpan="2" className="text-center py-4 text-[10px] italic !text-slate-400">No Itemized Data</td></tr>}
                                                {/* promo goods given with the sale (stage 4): a line each, no price */}
                                                {(receiptData.given || []).map((g, i) => (
                                                    <tr key={`given-${i}`}>
                                                        <td className="py-1 pr-2">
                                                            <div className="font-bold uppercase break-words leading-tight">{g.name}</div>
                                                            <div className="text-[10px] !text-slate-400 mt-0.5">{g.qty} pcs · BONUS</div>
                                                        </td>
                                                        <td className="py-1 text-right font-black whitespace-nowrap">-</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <div className="flex justify-between items-center text-sm font-black mb-4 !text-black">
                                        <span>TOTAL</span>
                                        <span>{receiptData.method === 'Retur/BS' ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(receiptData.total || 0)}</span>
                                    </div>
                                    
                                    <div className="text-center text-[10px] mb-2 font-bold !text-slate-400">
                                        <p>*** THANK YOU ***</p>
                                    </div>
                                </div>
                            )}

                            {printFormat === 'a4' && (
                                <div className="w-full overflow-x-auto custom-scrollbar border-b !border-slate-300">
                                    <div className="a4-print-jail p-8 md:p-12 shrink-0 font-sans relative min-w-[800px] mx-auto" style={{ backgroundColor: '#ffffff', color: '#000000', boxSizing: 'border-box' }}>
                                        <div className="border-b-4 !border-blue-800 pb-4 mb-6 flex justify-between items-end gap-8">
                                            <div className="flex-1">
                                                <h1 className="text-2xl font-black !text-blue-900 tracking-widest uppercase break-words">{appSettings?.companyName || "DISTRIBUTION AND SALES MANAGEMENT"}</h1>
                                                <p className="text-xs md:text-sm font-bold !text-slate-700 mt-1 whitespace-pre-line">{appSettings?.companyAddress || "Jl. Raya Magelang - Purworejo Km. 11, Palbapang, Mungkid, Magelang"}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <h2 className="text-xl font-bold !text-blue-800 uppercase tracking-widest">NOTA {receiptData.method === 'Retur/BS' ? 'RETUR' : receiptData.method === 'Promo Giveaway' ? 'PROMO' : 'PENJUALAN'}</h2>
                                                <p className="text-[10px] uppercase font-bold !text-slate-400 tracking-widest mt-1">CUSTOMER COPY</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start justify-between gap-8 mb-8 text-sm">
                                            <table className="flex-1 [&_td:first-child]:whitespace-nowrap [&_td:first-child]:pr-3">
                                                <tbody>
                                                    <tr><td className="font-bold py-1 w-24 !text-slate-400 uppercase align-top">Tanggal</td><td className="font-bold py-1 !text-slate-900">: {receiptDateStr}</td></tr>
                                                    {receiptTimeStr && <tr><td className="font-bold py-1 w-24 !text-slate-400 uppercase align-top">Waktu</td><td className="font-bold py-1 !text-slate-900">: {receiptTimeStr}</td></tr>}
                                                    
                                                    <tr><td className="font-bold py-1 !text-slate-400 uppercase align-top">Tipe Harga</td><td className="font-bold py-1 !text-slate-900">: <span className="uppercase !bg-blue-100 !text-blue-800 px-2 py-0.5 rounded text-xs border !border-blue-200">{activeTier}</span></td></tr>
                                                    <tr><td className="font-bold py-1 !text-slate-400 uppercase align-top">Sales / Agent</td><td className="font-bold py-1 !text-slate-900 uppercase">: {receiptData.agentName === 'Admin' ? (appSettings?.adminDisplayName || 'Admin') : (receiptData.agentName || 'Sales')}</td></tr>
                                                    <tr><td className="font-bold py-1 !text-slate-400 uppercase align-top">Metode Bayar</td><td className="font-bold py-1 !text-slate-900 uppercase">: {receiptData.method || 'Cash'}</td></tr>
                                                </tbody>
                                            </table>
                                            <div className="w-72 shrink-0 border-2 !border-slate-800 p-3 rounded-lg bg-slate-50 shadow-sm">
                                                <p className="font-bold !text-slate-400 text-xs mb-1">KEPADA YTH,</p>
                                                <p className="text-lg font-black uppercase !text-slate-900">{receiptData.customer}</p>
                                            </div>
                                        </div>

                                        <table className="w-full text-sm border-collapse border-2 !border-slate-800 mb-8 shadow-sm">
                                            <thead className="!bg-blue-50 !text-blue-900">
                                                <tr>
                                                    <th className="border-2 !border-slate-800 p-3 text-center w-12 font-black">NO</th>
                                                    <th className="border-2 !border-slate-800 p-3 text-left font-black">MACAM BARANG (KATALOG)</th>
                                                    <th className="border-2 !border-slate-800 p-3 text-right w-40 font-black">HARGA / {unitLabel}</th>
                                                    <th className="border-2 !border-slate-800 p-3 text-center w-24 font-black">QTY ({unitLabel})</th>
                                                    <th className="border-2 !border-slate-800 p-3 text-right w-40 font-black">JUMLAH</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {catalogRows.map((item, i) => (
                                                    <tr key={i} className={item.isBought ? '!bg-blue-50/40' : ''}>
                                                        <td className="border-2 !border-slate-800 p-2 text-center !text-slate-400 font-bold">{i+1}</td>
                                                        <td className="border-2 !border-slate-800 p-2 font-bold !text-slate-900 uppercase">{item.name}</td>
                                                        <td className="border-2 !border-slate-800 p-2 text-right font-mono !text-slate-700">{new Intl.NumberFormat('id-ID').format(item.displayPrice)}</td>
                                                        <td className="border-2 !border-slate-800 p-2 text-center font-black text-lg !text-blue-700">{item.displayQty > 0 ? Number(item.displayQty.toFixed(2)) : ''}</td>
                                                        <td className="border-2 !border-slate-800 p-2 text-right font-black text-lg !text-slate-900">{item.total > 0 ? (receiptData.method === 'Retur/BS' ? '-' : '') + new Intl.NumberFormat('id-ID').format(item.total) : ''}</td>
                                                    </tr>
                                                ))}
                                                {/* promo goods given with the sale (stage 4): a line each, no price */}
                                                {(receiptData.given || []).map((g, i) => (
                                                    <tr key={`given-${i}`}>
                                                        <td className="border-2 !border-slate-800 p-2 text-center !text-slate-400 font-bold">{catalogRows.length + i + 1}</td>
                                                        <td className="border-2 !border-slate-800 p-2 font-bold !text-slate-900 uppercase">{g.name} <span className="!text-slate-400">(BONUS)</span></td>
                                                        <td className="border-2 !border-slate-800 p-2 text-right font-mono !text-slate-700">-</td>
                                                        <td className="border-2 !border-slate-800 p-2 text-center font-black text-lg !text-blue-700">{g.qty} pcs</td>
                                                        <td className="border-2 !border-slate-800 p-2 text-right font-black text-lg !text-slate-900">-</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="!bg-blue-100">
                                                    <td colSpan="4" className="border-2 !border-slate-800 p-4 text-right font-black text-xl !text-blue-900 tracking-widest">GRAND TOTAL</td>
                                                    <td className="border-2 !border-slate-800 p-4 text-right font-black text-2xl !text-blue-900">{receiptData.method === 'Retur/BS' ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(receiptData.total || 0)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>

                                        <div className="flex justify-between items-start mt-12 pb-4">
                                            <div className="w-1/2">
                                                <div className="p-4 border-2 !border-blue-800 !bg-blue-50 rounded-xl inline-block shadow-md">
                                                    <p className="font-bold !text-blue-900 mb-1 text-[10px] uppercase tracking-widest">Pembayaran Transfer Ke:</p>
                                                    <p className="text-xl md:text-2xl font-black !text-blue-900 tracking-[0.1em] mt-2 leading-snug whitespace-pre-line">
                                                        {appSettings?.bankDetails || `BCA 0301138379\nA/N ABEDNEGO YB`}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-12 md:gap-20 text-center !text-slate-800 pt-4 pr-8">
                                                <div className="flex flex-col items-center">
                                                    <p className="font-bold text-sm mb-24 uppercase tracking-widest">Penerima,</p>
                                                    <div className="border-b-2 !border-slate-800 w-40 md:w-48"></div>
                                                    <p className="text-xs mt-2 uppercase font-bold">{receiptData.customer}</p>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <p className="font-bold text-sm mb-24 uppercase tracking-widest">Hormat Kami,</p>
                                                    <div className="border-b-2 !border-slate-800 w-40 md:w-48"></div>
                                                    <p className="text-xs mt-2 uppercase font-bold">{receiptData.agentName === 'Admin' ? (appSettings?.adminDisplayName || 'Admin') : (receiptData.agentName || 'Sales')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="no-print !bg-slate-100 p-3 flex justify-center gap-6 border-t !border-slate-300 shrink-0">
                                <label className="flex items-center gap-2 text-xs font-bold !text-slate-400 cursor-pointer hover:!text-black">
                                    <input type="radio" checked={printFormat === 'thermal'} onChange={() => setPrintFormat('thermal')} name="format" className="w-4 h-4 accent-slate-800"/>
                                    Thermal POS (58mm)
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold !text-blue-600 cursor-pointer hover:!text-blue-800">
                                    <input type="radio" checked={printFormat === 'a4'} onChange={() => setPrintFormat('a4')} name="format" className="w-4 h-4 accent-blue-600"/>
                                    Standard Invoice (A4)
                                </label>
                            </div>

                            <div className="no-print !bg-slate-200 p-4 flex gap-3 border-t !border-slate-300 mt-auto shrink-0">
                                <button onClick={() => {
                                    const receipt = document.querySelector('.print-receipt');
                                    if (!receipt) return;

                                    const clone = receipt.cloneNode(true);
                                    clone.querySelectorAll('.no-print').forEach(el => el.remove());
                                    clone.classList.remove('max-h-[90vh]', 'overflow-y-auto', 'shadow-2xl', 'rounded-b-lg', 'max-w-sm', 'max-w-4xl');

                                    let parentStyles = '';
                                    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
                                        parentStyles += el.outerHTML;
                                    });

                                    const isThermal = clone.classList.contains('format-thermal');

                                    const iframe = document.createElement('iframe');
                                    iframe.style.position = 'absolute'; 
                                    iframe.style.top = '0'; 
                                    iframe.style.left = '0';
                                    iframe.style.width = '1px';
                                    iframe.style.height = '1px';
                                    iframe.style.opacity = '0';
                                    iframe.style.pointerEvents = 'none';
                                    iframe.style.border = 'none';
                                    document.body.appendChild(iframe);

                                    const doc = iframe.contentWindow.document;
                                    doc.open();
                                    doc.write(`
                                        <!DOCTYPE html>
                                        <html>
                                        <head>
                                            <title>Invoice</title>
                                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                            ${parentStyles}
                                            <style>
                                                @media print {
                                                    @page { margin: 0; }
                                                    html, body { 
                                                        background: #ffffff !important; 
                                                        color: #000000 !important; 
                                                        margin: 0 !important; 
                                                        padding: 0 !important; 
                                                        width: ${isThermal ? '48mm' : '210mm'} !important; 
                                                        height: max-content !important; 
                                                        min-height: 0 !important;
                                                        overflow: hidden !important;
                                                        display: block !important; 
                                                        -webkit-print-color-adjust: exact; 
                                                        print-color-adjust: exact; 
                                                    }
                                                    .print-receipt { 
                                                        width: ${isThermal ? '48mm' : '100%'} !important;
                                                        max-width: 100% !important;
                                                        margin: 0 !important;
                                                        padding: 0 !important; 
                                                        box-sizing: border-box !important;
                                                        box-shadow: none !important; 
                                                        border: none !important; 
                                                        page-break-after: avoid !important;
                                                    }
                                                    
                                                    .format-thermal { font-family: 'Courier New', Courier, monospace !important; }
                                                    .format-thermal * { font-size: 11px !important; line-height: 1.2 !important; color: #000000 !important; }
                                                    .format-thermal .font-bold { font-weight: bold !important; }
                                                    .format-thermal .font-black { font-weight: 900 !important; }
                                                    .format-thermal table { width: 100% !important; border-collapse: collapse !important; }
                                                    .format-thermal th, .format-thermal td { padding: 2px 0 !important; }
                                                    .format-thermal .text-right { text-align: right !important; }
                                                    .format-thermal .text-center { text-align: center !important; }
                                                    .format-thermal .border-dashed { border-style: dashed !important; border-color: #000000 !important; }
                                                    .format-thermal .border-y { border-top: 1px dashed #000000 !important; border-bottom: 1px dashed #000000 !important; }
                                                    .format-thermal .border-b { border-bottom: 1px dashed #000000 !important; border-top: none !important; border-left: none !important; border-right: none !important; }
                                                    .format-thermal .flex { display: flex !important; }
                                                    .format-thermal .justify-between { justify-content: space-between !important; }
                                                    .format-thermal h2 { font-size: 14px !important; text-align: center !important; font-weight: 900 !important; }
                                                }
                                                body { background: white; margin: 0; padding: 0; display: block; }
                                            </style>
                                        </head>
                                        <body>
                                            ${clone.outerHTML}
                                            <script>
                                                window.onload = () => {
                                                    setTimeout(() => {
                                                        window.focus();
                                                        window.print();
                                                    }, 500);
                                                };
                                            </script>
                                        </body>
                                        </html>
                                    `);
                                    doc.close();

                                    setTimeout(() => {
                                        if (document.body.contains(iframe)) document.body.removeChild(iframe);
                                    }, 10000);

                                }} className="flex-1 !bg-slate-800 !text-white py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-slate-950 transition-colors tracking-widest text-[10px] shadow-md active:scale-95">
                                    <Printer size={14}/> Print Document
                                </button>

                                <button onClick={() => {
                                    let text = `*${appSettings?.companyName || "DISTRIBUTION AND SALES MANAGEMENT"}*\n*OFFICIAL RECEIPT*\n------------------------\nDate: ${receiptDateStr}\nTime: ${receiptTimeStr}\nCustomer: ${receiptData.customer}\nPayment: ${receiptData.method || 'Cash'}\n------------------------\n`;
                                    if (receiptData.items && receiptData.items.length > 0) {
                                        receiptData.items.forEach(item => { text += `${item.qty} ${item.unit} ${item.name}\n   Rp ${new Intl.NumberFormat('id-ID').format((item.calculatedPrice||0) * item.qty)}\n`; });
                                    }
                                    (receiptData.given || []).forEach(g => { text += `${g.qty} pcs ${g.name} [BONUS]\n`; });
                                    text += `------------------------\n*TOTAL: ${receiptData.method === 'Retur/BS' ? '-' : ''}Rp ${new Intl.NumberFormat('id-ID').format(receiptData.total || 0)}*\n\nThank you for your business!`;
                                    /* the shop it just sold to: its own chat; no number -> ask, and offer to keep it on the shop */
                                    shareReceipt(text, receiptData.shop, (phone) => updateDoc(doc(db, `artifacts/${appId}/users/${dataOwnerId}/customers`, receiptData.shop.id), { phone }));
                                }} className="flex-1 !bg-[#25D366] !text-white py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-[#128C7E] transition-colors tracking-widest text-[10px] shadow-md active:scale-95">
                                    <MessageSquare size={14}/> WhatsApp Share
                                </button>
                            </div>

                            <button onClick={() => { setReceiptData(null); setLockedTier(null); }} className="no-print w-full shrink-0 !bg-red-600 hover:!bg-red-700 !text-white py-4 font-black uppercase tracking-[0.2em] shadow-[0_-5px_20px_rgba(0,0,0,0.2)] active:scale-95 transition-transform rounded-b-lg flex items-center justify-center gap-2"><X size={20}/> CLOSE RECEIPT</button>
                        </div>
                    </div>
                );
            })()}
        
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--duke-fill-tan); border-radius: 2px; } .custom-scrollbar::-webkit-scrollbar-track { background: var(--duke-fill-panel); } .scrollbar-hide::-webkit-scrollbar { display: none; } @keyframes pulse { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; } } .animate-pulse { animation: pulse 2s infinite ease-in-out; } .animate-fade-in { animation: fadeIn 0.2s ease-out; } .animate-fade-in-up { animation: fadeInUp 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
};

export default MerchantSalesView;