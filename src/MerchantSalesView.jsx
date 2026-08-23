import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Box, Zap, X, DollarSign, List, ChevronDown, Printer, MessageSquare, ArrowRight, ArrowLeft, MapPin, AlertCircle, Camera, Store, Map, Lock, Package, AlertTriangle, Check, Eye } from 'lucide-react';
import { doc, setDoc, collection, getDoc, getDocs, updateDoc, addDoc, onSnapshot, serverTimestamp, runTransaction } from 'firebase/firestore'; 
import { hasClearance } from './config/permissions';
import { savePhotoAndGetReference, convertToBks, splitToUnits, paymentLabel, storeKey, getLocalDayKey} from './utils/helpers';
import { dayStats, agoLabel } from './utils/dayStats';
import { customerBrief, reorderFromLast } from './utils/customerBrief';
import { nextStop, directionsUrl, metresLabel } from './utils/nextStop';
import { unlockSounds, speakMumble, playSound } from './hooks/useSound';
import { notify } from './components/Toast.jsx';

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

const MerchantSalesView = ({ inventory, user, isAdmin, logAudit, triggerCapy, onProcessSale, onInspect, appSettings, customers = [], allowedPayments = ['Cash'], allowedTiers = ['Retail', 'Ecer'], transactions = [], allowRetur = true, allowCashRefund = false, db, appId, agentProfileId, storage, masterUserId, adminSalesMode, onAdminSalesMode, isOnline = navigator.onLine }) => {
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
    /* Phase A items 1-2: the two-tab bar is gone. The manifest is a bottom drawer that
       is dragged between three snap points, so the wares list never has to be left. */
    /* Read ONCE, on the mount that restores it - not on every render. */
    const [draft] = useState(() => readDraft(user?.uid));

    const [drawerH, setDrawerH] = useState(104); // 52 grip + 52 customer bar — see DRAWER_CLOSED
    const [isDragging, setIsDragging] = useState(false);
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
    // true once his alcove has scrolled out of view — see the travelling merchant below
    const [alcoveOut, setAlcoveOut] = useState(false);
    // he has to outlive alcoveOut by one animation, or he would vanish instead of leaving
    const [floatShown, setFloatShown] = useState(false);
    const [floatLeaving, setFloatLeaving] = useState(false);
    const lastChatterRef = useRef(0);   // throttles how often he reacts to a tap

    // 🚀 DUAL RETUR ENGINE
    const [isReturMode, setIsReturMode] = useState(draft?.isReturMode || false);
    const [returType, setReturType] = useState(draft?.returType || 'EXCHANGE'); // 'BUYBACK' | 'EXCHANGE'

    // --- FORM STATE ---
    const [customerName, setCustomerName] = useState(draft?.customerName || "");
    const [paymentMethod, setPaymentMethod] = useState(draft?.paymentMethod || allowedPayments[0] || "Cash");
    const [isProcessingSale, setIsProcessingSale] = useState(false); 
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [receiptData, setReceiptData] = useState(null); 
    const [lockedTier, setLockedTier] = useState(draft?.lockedTier ?? null); 
    const [tempoDays, setTempoDays] = useState(draft?.tempoDays ?? appSettings?.defaultTempoDays ?? 7); 
    const [printFormat, setPrintFormat] = useState('thermal'); 

    const canOverrideGps = isAdmin === true || user?.tier === 1 || user?.tier === 2 || user?.tier === '1' || user?.tier === '2' || user?.role?.toLowerCase() === 'admin' || user?.isAdmin === true;

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
        ).sort((a,b) => new Date(a.date) - new Date(b.date));

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
                let deduction = t.type === 'RETURN' ? Math.abs(t.total) : (t.amountPaid || 0);
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
    
    const defaultNooTier = allowedTiers[allowedTiers.length - 1] || 'Retail';
    const [nooForm, setNooForm] = useState(draft?.nooForm || { phone: '', address: '', requestedTier: defaultNooTier, photoUrl: null });
    const fileInputRef = useRef(null);

    const scrollContainerRef = useRef(null);
    const [txProofPhoto, setTxProofPhoto] = useState(draft?.txProofPhoto ?? null);

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
                    notify("Basket saved, but the proof photo was too big to keep. Take it again before you deal.");
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
        notify(`Draft restored — ${n} item${n === 1 ? '' : 's'}${draft.customerName ? ` for ${draft.customerName}` : ''}. Empty the cart to discard it.`);
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
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    setAgentLocation({ latitude: lat, longitude: lon });

                    if (selectedCustomerInfo) {
                        if (selectedCustomerInfo.latitude && selectedCustomerInfo.longitude) {
                            const dist = calculateDistance(lat, lon, selectedCustomerInfo.latitude, selectedCustomerInfo.longitude);
                            setDistanceToStore(Math.round(dist));
                            const dynamicThreshold = bypassState.status === 'approved' ? 100 : 50;
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
                            .filter(c => c.latitude && c.longitude && c.status !== 'PENDING')
                            .map(c => ({ c, dist: calculateDistance(lat, lon, c.latitude, c.longitude) }))
                            .filter(x => x.dist <= 50)
                            .sort((a, b) => a.dist - b.dist);

                        setNearbyStores(inRange.slice(0, 2).map(x => ({ ...x.c, _metres: Math.round(x.dist) })));

                        if (inRange.length) {
                            setDistanceToStore(Math.round(inRange[0].dist));
                            handleCustomerSelect(inRange[0].c, Math.round(inRange[0].dist));
                        } else setGpsStatus('idle');
                    } else if (customerName.trim().length > 0) setGpsStatus('walk_in'); 
                    else setGpsStatus('idle');
                },
                (error) => setGpsStatus('error'),
                // 🚀 Phase 8: maximumAge 0 forced a fresh satellite lock on every call — reusing a
                // fix from the last minute is exactly right for someone standing still at a shop.
                { enableHighAccuracy: !useLowAccuracy, timeout: 10000, maximumAge: 60000 }
            );
        } else setGpsStatus('error');
    };

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

    const suggestedCustomers = customers.filter(c => {
        if (!c.name.toLowerCase().includes(customerName.toLowerCase())) return false;
        const tierUpper = (c.priceTier || c.tier || c.pricingTier || '').toUpperCase();
        let mappedTier = 'Retail'; 
        if (tierUpper.includes('GROSIR') || tierUpper.includes('GOLD') || tierUpper.includes('WHOLESALE')) mappedTier = 'Grosir';
        else if (tierUpper.includes('RETAIL') || tierUpper.includes('SILVER')) mappedTier = 'Retail';
        else if (tierUpper.includes('ECER') || tierUpper.includes('BRONZE')) mappedTier = 'Ecer';
        return allowedTiers.includes(mappedTier);
    }).slice(0, 5);

    /* The merchant no longer speaks on add-to-cart - Aldi's call 2026-08-02, he appears on
       deal commit ONLY, so a 15-line basket stays silent until it is paid. The dialogue table
       this used to hold was verbatim Resident Evil 4 merchant lines and has been deleted.
       Callers are left in place: they sit on transaction paths and changing them buys nothing. */
    /* He mouthed the talking animation in silence on desktop: the mumble and the bubble
       were both wired only through CapybaraMascot's CAPY_COMMS event, which the alcove
       does not listen to. Same words, same voice, drawn where he actually stands. */
    const CHATTER = {
        add:       ["Right, that's noted.", "Into the book it goes.", "Good pick.", "Aye, one more."],
        expensive: ["Now that's a proper ware.", "Heavy coin, that one.", "Fine taste."],
        /* Choosing a customer used to borrow the `add` lines, so he announced "Aye, one more"
           when nothing had been added — he was narrating the wrong event. These are about
           opening someone's page, and they stay neutral because the same lines have to suit a
           regular and a shop he has never sold to. */
        customer:  ["Their page, then.", "Right, let's see their book.", "Ah. This one.", "Let's have a look at them."],
    };
    const triggerMerchantSpeak = (type) => {
        // He reacts, but not to every single press - a 15-line basket would have him
        // talking non-stop. At most once every 6 seconds, then back to idle.
        const now = Date.now();
        if (now - lastChatterRef.current < 6000) return;
        lastChatterRef.current = now;

        const pool = CHATTER[type] || CHATTER.add;
        const line = pool[Math.floor(Math.random() * pool.length)];
        setMerchantLine(line);
        setMerchantMood('talking');
        unlockSounds().then(() => speakMumble(line));
        setTimeout(() => { setMerchantMood('idle'); setMerchantLine(""); }, 2400);
    };

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
        if (alcoveOut) { setFloatLeaving(false); setFloatShown(true); return; }
        if (!floatShown) return;
        setFloatLeaving(true);
        const t = setTimeout(() => { setFloatShown(false); setFloatLeaving(false); }, 300);
        return () => clearTimeout(t);
    }, [alcoveOut, floatShown]);

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

    const handleCustomerSelect = (cust, autoLockedDistance = null) => {
        const localToday = new Date().toLocaleDateString('en-CA');
        const meNow = String(user?.displayName || user?.email?.split('@')[0] || '').trim().toLowerCase();
        const visitedBy = String(cust.lastVisitedBy || cust.lastVisitTag || '').trim();
        const iVisitedIt = !!meNow && !!visitedBy &&
            (visitedBy.toLowerCase().includes(meNow) || meNow.includes(visitedBy.toLowerCase()));

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
        const currentAgentName = user?.displayName || user?.email?.split('@')[0] || 'Admin';
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

        const tierUpper = (cust.priceTier || cust.tier || cust.pricingTier || '').toUpperCase();
        let mappedTier = 'Retail'; 
        if (tierUpper.includes('GROSIR') || tierUpper.includes('GOLD') || tierUpper.includes('WHOLESALE')) mappedTier = 'Grosir';
        else if (tierUpper.includes('RETAIL') || tierUpper.includes('SILVER')) mappedTier = 'Retail';
        else if (tierUpper.includes('ECER') || tierUpper.includes('BRONZE')) mappedTier = 'Ecer';

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

        /* H2a — his report: "if i dont press anything from the dropdown then the stores wont be
           selected and it will just focused on that namebar". Selecting used to require a CLICK,
           so a salesman who typed a store's name in full still had no store chosen, and the rail
           fell back to the default dashboard because `customerSettled` needs selectedCustomerInfo.

           Typing the whole name now picks the store, through the SAME handler the dropdown uses
           so the tier, territory bar, GPS lock and telemetry ping all still happen — a second
           selection path that skipped any of those is how the pricingTier bug got in.

           ONLY on exactly one match, and that is the important half. His book has three shops
           called "warung sembako sumber rejeki" 14.5 km apart; auto-picking the first would bill
           the wrong shop, which is real money and unpickable afterwards. Several matches means
           the dropdown stays open and he chooses. */
        /* 🚀 Compared through storeKey now, so typing the clean name also finds a shop saved
           under the legacy "(Retail)" naming. The `exact.length === 1` rule below is NOT a
           convenience — it is the guard, and it is untouched. Normalising makes MORE names
           collide, not fewer, so if two customer documents reduce to the same key the count is
           2, nothing is auto-picked, and the dropdown stays open for Aldi to choose. */
        const needle = storeKey(typed);
        if (needle) {
            const exact = customers.filter(c => storeKey(c.name) === needle);
            if (exact.length === 1) handleCustomerSelect(exact[0]);
        }
    };

    const updateCartPricing = (tier) => {
        if (!tier) return;
        setCart(prev => prev.map(item => {
            if (item.isIouFulfillment) return item;
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

    /* The ware as the master vault knows it. `dimensions` are the millimetres Aldi set with
       the W/H/D sliders in ExamineModal and `images` are the faces he photographed, so the
       terminal shows the same object he sized rather than a generic brick. Defaults match
       ExamineModal :11 so an unmeasured product still looks like a cigarette pack. */
    const cubeVars = (prod) => {
        const d = prod?.dimensions || { w: 55, h: 90, d: 22 };
        return { '--mm-w': d.w, '--mm-h': d.h, '--mm-d': d.d };
    };
    const renderCube = (prod) => {
        const img = prod?.images || {};
        const front = img.front || prod?.image;
        const back = prod?.useFrontForBack ? front : img.back;
        const face = (cls, src) => (
            <i className={cls}>{src ? <img src={src} alt="" /> : null}</i>
        );
        return (
            <div className="kpm-cube">
                <i className="f">
                    {front ? <img src={front} alt={prod?.name || ''} />
                           : <span className="grid place-items-center w-full h-full text-[9px] font-black font-mono tracking-widest text-[var(--duke-amber-ink)]">EXAMINE</span>}
                </i>
                {face('bk', back)}
                {face('l', img.left)}
                {face('r', img.right)}
                {face('t', img.top)}
                {face('bt', img.bottom)}
            </div>
        );
    };

    const addToCart = (product) => {
        if (!isReturMode && product.stock <= 0) return notify(`OUT OF STOCK IN VEHICLE!\n\nYou cannot sell ${product.name} because you don't have any in your car.`);

        setCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
                if (!isReturMode && existing.qty >= product.stock) {
                    notify(`MAX STOCK REACHED!\n\nYou only have ${product.stock} units of ${product.name} in your vehicle.`);
                    return prev;
                }
                triggerMerchantSpeak((product.priceEcer || 0) > 100000 ? 'expensive' : 'add');
                return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
            }
            
            triggerMerchantSpeak((product.priceEcer || 0) > 100000 ? 'expensive' : 'add');
            const tierToUse = lockedTier || (allowedTiers.includes('Retail') ? 'Retail' : (allowedTiers[0] || 'Retail'));
            
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
        setCart(prev => prev.map(item => {
            if (item.productId === id) {
                let finalVal = val;
                
                if (field === 'qty' && (!isReturMode || (isReturMode && returType === 'EXCHANGE' && item.fulfillment === 'NOW'))) {
                    const maxStock = item.product.stock || 0;
                    if (val > maxStock) {
                        notify(`INSUFFICIENT VEHICLE STOCK!\n\nYou only have ${maxStock} units of ${item.name} available.`);
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
        if (!product) return notify("Product no longer exists in inventory!");
        if (product.stock < iou.qty) return notify("You don't have enough healthy stock in your vehicle to settle this Utang Barang!");

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
                    const storagePath = `artifacts/${appId}/users/${masterUid}/photos/bypass_${Date.now()}.jpg`;
                    const photoToSave = await savePhotoAndGetReference(storage, compressedDataUrl, storagePath, appSettings?.usePhotoStorage);

                    const payload = {
                        storeId: String(selectedCustomerInfo?.id || 'UNKNOWN'),
                        storeName: String(selectedCustomerInfo?.name || customerName || 'Unknown Store'),
                        salesmanId: String(user?.realUid || user?.uid || user?.id || 'UNKNOWN'),
                        salesmanName: String(user?.displayName || user?.email?.split('@')[0] || 'Field Agent'),
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
                                setBypassState({ status: 'rejected', id: null, photo: null }); notify("HQ Rejected your Bypass Request."); unsub();
                            }
                        }
                    }, (err) => {
                        // 🚀 FIX: Without this, a denied read left the sale screen stuck on
                        // "Awaiting approval..." forever with no explanation.
                        console.warn("GPS bypass approval listener:", err.code);
                        setBypassState({ status: 'idle', id: null, photo: null });
                        notify("Could not check bypass approval status. Please try again.");
                    });
                } catch (err) { notify(`Failed to submit bypass request: ${err.message || "Network Error"}`); setBypassState({ status: 'idle', id: null, photo: null }); }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const validateNoo = () => {
        if (!nooForm.phone || !nooForm.photoUrl) return notify("Phone number and Photo are required to register a new outlet!");
        if (customers.find(c => c.name.toLowerCase().trim() === customerName.toLowerCase().trim())) return notify("DUPLICATE DETECTED!\n\nA store with this name is already in the database.");
        
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

    const submitNooRegistration = async () => {
        if (!validateNoo()) return;
        try {
            const userId = dataOwnerId;   // see dataOwnerId — must match where `customers` was read from
            const newRef = doc(collection(db, `artifacts/${appId}/users/${userId}/customers`));
            const newStoreData = {
                id: newRef.id, name: customerName.toUpperCase().trim(), phone: nooForm.phone, address: nooForm.address || "GPS Locked via NOO Form",
                tier: 'UNRANKED', priceTier: nooForm.requestedTier, storeType: 'Retailer', latitude: agentLocation?.latitude, longitude: agentLocation?.longitude,
                status: 'Active', visitFreq: 7, storeImage: nooForm.photoUrl, createdAt: new Date().toISOString()
            };
            await setDoc(newRef, newStoreData);
            if (logAudit) logAudit("NOO_REGISTERED_DIRECT", `Registered new NOO outlet: ${customerName}`);
            if (triggerCapy) triggerCapy(`Target Data Secured! 📍`);
            window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));

            setSelectedCustomerInfo(newStoreData); setLockedTier(nooForm.requestedTier); updateCartPricing(nooForm.requestedTier);
            setShowNooModal(false); setGpsStatus('verified'); triggerMerchantSpeak('expensive');
            /* HIS ASK (G6): "maybe add some conveniency after we register new NOO, like close the
               manifest paper for example". The outlet is registered and the next thing he does is
               pick wares, so hand the screen back to the wares list instead of leaving the paper
               covering it. The customer bar stays on screen — it is inside DRAWER_CLOSED — so the
               name he just registered is still visible, which is the whole reason this is safe. */
            setDrawerH(DRAWER_CLOSED);
        } catch (e) { notify("Failed to save NOO: " + e.message); }
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
                tier: 'UNRANKED', priceTier: nooForm.requestedTier, storeType: 'Retailer', latitude: agentLocation?.latitude, longitude: agentLocation?.longitude,
                status: 'Active', visitFreq: 7, storeImage: nooForm.photoUrl, createdAt: new Date().toISOString()
            };
            await setDoc(newRef, newStoreData);
            if (logAudit) logAudit("NOO_REGISTERED_ONLY", `Registered new NOO outlet (no sale this visit): ${customerName}`);
            if (triggerCapy) triggerCapy(`Outlet registered! No sale this visit. 📍`);
            window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));

            setShowNooModal(false);
            setNooForm({ phone: '', address: '', requestedTier: defaultNooTier, photoUrl: null });
            setDrawerH(DRAWER_CLOSED);   // same convenience as the register-and-sell path above
        } catch (e) { notify("Failed to save NOO: " + e.message); }
    };

    const handleDeploySample = async () => {
        const qtyBks = parseInt(sampleForm.qtyBks) || 0;
        const qtyBatang = parseInt(sampleForm.qtyBatang) || 0;
        if (qtyBks === 0 && qtyBatang === 0) return notify("Enter a valid quantity to sample.");
        if (!sampleForm.productId) return notify("Please select a product.");

        const product = inventory.find(p => p.id === sampleForm.productId);
        const sp = product?.sticksPerPack || 16;
        const totalQtyDecimal = qtyBks + (qtyBatang / sp);

        if ((product.stock || 0) < totalQtyDecimal) return notify(`INSUFFICIENT STOCK!\n\nYou only have ${product.stock} units of ${product.name} available in your vehicle.`);

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
                        
                        let currentDebts = agentData.cukaiDebts || {}; currentDebts[product.id] = (currentDebts[product.id] || 0) + totalQtyDecimal;
                        t.update(agentRef, { activeCanvas: updatedCanvas.filter(c => c.qty > 0), cukaiDebts: currentDebts });
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
        } catch (err) { notify("Failed to deploy sample: " + err); } finally { setIsProcessingSale(false); }
    };

    /* Clearing the terminal after a deal. Extracted because a sale that COMMITS and then hits a
       failure in a later step must also clear — otherwise the cart survives, the agent is told
       "Transaction Failed", and he presses MAKE DEAL again on a sale that already went through. */
    const resetTerminalAfterDeal = () => {
        setCart([]); setCustomerName(""); setLockedTier(null); setSelectedCustomerInfo(null);
        setGpsStatus('idle'); setAgentLocation(null); setTxProofPhoto(null);
        setIsReturMode(false); setManualOverride(false); setReturType('EXCHANGE');
        setNooForm({ phone: '', address: '', requestedTier: defaultNooTier, photoUrl: null });
        // territoryClaim is only ever written by handleCustomerSelect. A walk-in sale typed by
        // hand never calls it, so without this the PREVIOUS customer's owner name stays in state
        // and stamps territoryOverride on an innocent sale. proximityAck: same reason.
        setTerritoryClaim(null); setProximityHit(null); setProximityAck(null);
    };

    const handleFinalDeal = async () => {
        if (cart.length === 0 || !customerName.trim() || !txProofPhoto || isProcessingSale) return;
        setIsProcessingSale(true); 
        
        const finalCust = customerName.trim();
        const finalCart = [...cart];
        const finalTotal = isReturMode && returType === 'EXCHANGE' ? 0 : cartTotal;

        let committed = false;   // see the catch: a post-commit failure must not read as "failed"

        // The company owes nothing back on a completed sale, so a cash refund is a granted
        // privilege, not a default one. Hiding the switch is not enough on its own — returType
        // can still be BUYBACK from before the grant was revoked.
        if (isReturMode && returType === 'BUYBACK' && !allowCashRefund) {
            return notify("You do not have clearance to refund cash. Use Exchange (Tukar), or ask an admin to grant Cash Refund in Fleet & Roster.");
        }

        const displayMethod = isReturMode ? (returType === 'EXCHANGE' ? 'Tukar Ganti' : 'Retur/BS') : (cart.every(i => i.isIouFulfillment) ? 'IOU Fulfillment' : paymentMethod);
        
        let dbMethod = paymentMethod;
        let txType = 'SALE';

        if (isReturMode) {
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
                    const storagePath = `artifacts/${appId}/users/${masterUid}/photos/sale_${Date.now()}.jpg`;
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
                territoryOverride: territoryClaim || null
            };

            const trueAgentName = await onProcessSale(finalCust, dbMethod, finalCart, newStorePayload, proofPayload);
            committed = true;   // everything past this point is POST-commit: the sale already exists
            const agentFallback = typeof trueAgentName === 'string' ? trueAgentName : (user?.displayName || user?.email?.split('@')[0] || 'Admin');

            /* THE RECEIPT COMES FIRST, and the button is released with it. Everything below this
               point - the IOU ledger, the tier auto-promoter - is optional bookkeeping that talks
               to Firestore, and on 2026-08-20 it hung on a write that never resolves and took the
               receipt with it: the sale was saved, the stock was cut, and the screen sat on
               PROCESSING forever. A finished sale must never wait for optional work.

               Safe to move: every value below is a local or a state binding captured when this
               handler was created, so resetTerminalAfterDeal() cannot pull them out from under
               the bookkeeping that still has to run. */
            setReceiptData({
                customer: finalCust, method: paymentLabel(displayMethod), items: finalCart, total: finalTotal,
                date: new Date().toLocaleString('id-ID'), agentName: agentFallback 
            });

            window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));

            resetTerminalAfterDeal();
            // The merchant has no permanent space on screen - he shows up on a committed
            // deal and leaves, borrowing CapybaraMascot's slide-in/out. Deal commit ONLY:
            // never on add-to-cart, so a 15-line basket stays silent until it is paid.
            // Line is original writing; the old one was a direct Resident Evil 4 quote.
            const DEAL_LINES = [
                "Deal's done. Good haul.",
                "Stock's moving. I like that.",
                "Clean trade. Next route?",
                "Counted and paid. We're square.",
            ];
            const line = DEAL_LINES[Math.floor(Math.random() * DEAL_LINES.length)];
            setMerchantMood("deal");
            setMerchantLine(line);          // the alcove bubble, for the desktop path
            // Committing the sale IS the user gesture browsers require before audio can
            // play, so unlock here. The signing sound comes first and the mumble follows it
            // rather than landing on top - two sounds at the same instant read as one mess.
            unlockSounds().then(() => {
                playSound('sign');
                setTimeout(() => speakMumble(line), 520);
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
            setTimeout(() => setMerchantMood("idle"), 3000);
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

            if (isOnline && !isReturMode && !finalCart.some(i => i.isIouFulfillment)) {
                try {
                    const userId = dataOwnerId;   // see dataOwnerId — must match where `customers` was read from
                    let rules = null;
                    const rulesSnap = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/appSettings`, 'tierRules'));
                    if (rulesSnap.exists() && rulesSnap.data().rules) rules = rulesSnap.data().rules;
                
                    if (rules) {
                        let earnedTier = 'Unranked'; 
                        let currentStoreSeasonalXP = 0;
                        let debugTarget = 0; let debugMetric = 0;

                        const getSafeTime = (t) => {
                            if (!t) return 0;
                            if (t.timestamp?.seconds) return t.timestamp.seconds * 1000;
                            if (typeof t.timestamp === 'number') return t.timestamp < 1e12 ? t.timestamp * 1000 : t.timestamp;
                            const parseDateStr = (dateStr) => {
                                if (!dateStr) return 0;
                                let ms = new Date(dateStr).getTime();
                                if (!isNaN(ms)) return ms; 
                                let cleanStr = String(dateStr).toLowerCase()
                                    .replace(/januari|jan/g, 'january').replace(/februari|feb/g, 'february')
                                    .replace(/maret|mar/g, 'march').replace(/mei/g, 'may').replace(/juni|jun/g, 'june').replace(/juli|jul/g, 'july')
                                    .replace(/agustus|agu/g, 'august').replace(/oktober|okt/g, 'october').replace(/desember|des/g, 'december');
                                ms = new Date(cleanStr).getTime();
                                if (!isNaN(ms)) return ms;
                                const parts = cleanStr.split(',')[0].trim().split(/[\/\-]/);
                                if (parts.length === 3) {
                                    let y = parts[2].length === 4 ? parts[2] : (parts[0].length === 4 ? parts[0] : new Date().getFullYear().toString());
                                    let m = parts[2].length === 4 ? parts[1].padStart(2, '0') : parts[1].padStart(2, '0');
                                    let d = parts[2].length === 4 ? parts[0].padStart(2, '0') : parts[2].padStart(2, '0');
                                    ms = new Date(`${y}-${m}-${d}T12:00:00Z`).getTime();
                                    if (!isNaN(ms)) return ms;
                                }
                                return 0;
                            };
                            const tsTime = parseDateStr(t.timestamp);
                            if (tsTime > 0) return tsTime;
                            return parseDateStr(t.date);
                        };

                        const safeTrans = Array.isArray(transactions) ? transactions : [];
                        const safeRules = rules || {};
                        const sortedRules = Object.entries(safeRules).sort((a, b) => {
                            const isOmsetA = String(a[1]?.type || 'omset').toLowerCase().includes('omset');
                            const isOmsetB = String(b[1]?.type || 'omset').toLowerCase().includes('omset');
                            const tA = Number(String(isOmsetA ? (a[1]?.omsetTarget || a[1]?.target || 0) : (a[1]?.volumeTarget || a[1]?.target || 0)).replace(/[^0-9]/g, '')) || 0;
                            const tB = Number(String(isOmsetB ? (b[1]?.omsetTarget || b[1]?.target || 0) : (b[1]?.volumeTarget || b[1]?.target || 0)).replace(/[^0-9]/g, '')) || 0;
                            return tB - tA;
                        });

                        let matchedDynamic = false;
                        for (let [ruleKey, rule] of sortedRules) {
                            if (!rule) continue; 
                            const ruleTierName = String(rule.tierId || rule.targetTier || rule.tier || ruleKey);
                            if (!allowedTiers.some(t => String(t).toLowerCase() === ruleTierName.toLowerCase())) continue;
                            
                            const ruleType = String(rule.type || 'omset').toLowerCase();
                            const isOmset = ruleType.includes('omset');
                            const target = Number(String(isOmset ? (rule.omsetTarget || rule.target || 0) : (rule.volumeTarget || rule.target || 0)).replace(/[^0-9]/g, '')) || 0;
                            
                            let timeframeDays = 90;
                            if (rule.timeframe) {
                                const tfStr = String(rule.timeframe).toLowerCase();
                                const numVal = parseInt(tfStr.replace(/[^0-9]/g, '')) || 90;
                                if (tfStr.includes('month') || tfStr.includes('bulan')) timeframeDays = numVal * 30;
                                else if (tfStr.includes('year') || tfStr.includes('tahun')) timeframeDays = numVal * 365;
                                else if (tfStr.includes('week') || tfStr.includes('minggu')) timeframeDays = numVal * 7;
                                else timeframeDays = numVal;
                            }

                            const cutoff = new Date();
                            cutoff.setDate(cutoff.getDate() - timeframeDays);
                            let metricTotal = 0;

                            safeTrans.forEach(t => {
                                const tType = String(t.type || (t.total < 0 ? 'RETUR' : 'SALE')).toUpperCase();
                                const isMatch = storeKey(t.customerName || t.customer) === storeKey(finalCust);
                                if (t && isMatch && tType === 'SALE') {
                                    if (getSafeTime(t) >= cutoff.getTime()) {
                                        if (isOmset) metricTotal += (Number(String(t.total).replace(/[^0-9-]/g, '')) || 0);
                                        else if (ruleType.includes('volume')) {
                                            const itemsList = Array.isArray(t.items) ? t.items : Object.values(t.items || {});
                                            itemsList.forEach(item => {
                                                let qtyInBks = Number(item.qty) || 0;
                                                if (item.unit === 'Slop') qtyInBks *= 10;
                                                if (item.unit === 'Bal') qtyInBks *= 200;
                                                if (item.unit === 'Karton') qtyInBks *= 800;
                                                const vUnit = String(rule.volumeUnit || 'Bks').toLowerCase();
                                                if (vUnit.includes('bks')) metricTotal += qtyInBks;
                                                if (vUnit.includes('slop')) metricTotal += (qtyInBks / 10);
                                                if (vUnit.includes('bal')) metricTotal += (qtyInBks / 200);
                                                if (vUnit.includes('karton')) metricTotal += (qtyInBks / 800);
                                            });
                                        }
                                    }
                                }
                            });

                            if (isOmset) metricTotal += Number(finalTotal);
                            else if (ruleType.includes('volume')) {
                                finalCart.forEach(item => {
                                    let qtyInBks = Number(item.qty) || 0;
                                    if (item.unit === 'Slop') qtyInBks *= 10;
                                    if (item.unit === 'Bal') qtyInBks *= 200;
                                    if (item.unit === 'Karton') qtyInBks *= 800;
                                    const vUnit = String(rule.volumeUnit || 'Bks').toLowerCase();
                                    if (vUnit.includes('bks')) metricTotal += qtyInBks;
                                    if (vUnit.includes('slop')) metricTotal += (qtyInBks / 10);
                                    if (vUnit.includes('bal')) metricTotal += (qtyInBks / 200);
                                    if (vUnit.includes('karton')) metricTotal += (qtyInBks / 800);
                                });
                            }

                            if (metricTotal > currentStoreSeasonalXP) currentStoreSeasonalXP = metricTotal;
                            debugMetric = metricTotal;
                            if (metricTotal >= target) { earnedTier = ruleTierName; debugTarget = target; matchedDynamic = true; break; }
                        }

                        if (!matchedDynamic) {
                            let fallbackMetric = currentStoreSeasonalXP > 0 ? currentStoreSeasonalXP : (debugMetric > 0 ? debugMetric : finalTotal);
                            if (fallbackMetric >= 2500000) earnedTier = 'Mythic'; else if (fallbackMetric >= 1000000) earnedTier = 'Epic'; else if (fallbackMetric >= 500000) earnedTier = 'Grandmaster'; else if (fallbackMetric >= 250000) earnedTier = 'Bronze'; else earnedTier = 'Unranked';
                        }

                        const storeId = selectedCustomerInfo?.id;
                        let targetDocRef = null; let currentTier = null;

                        if (storeId && storeId !== 'NOO_TEMP' && !isFormalNoo) {
                            targetDocRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, storeId);
                            const storeSnap = await getDoc(targetDocRef);
                            if (storeSnap.exists()) currentTier = storeSnap.data().tier;
                        } else {
                            if (isFormalNoo) await new Promise(resolve => setTimeout(resolve, 1500));
                            const qSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/customers`));
                            const foundDoc = qSnap.docs.find(d => (d.data()?.name || '').trim().toLowerCase() === finalCust.toLowerCase());
                            if (foundDoc) { targetDocRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, foundDoc.id); currentTier = foundDoc.data().tier; }
                        }
                        
                        if (targetDocRef) {
                            const localToday = new Date().toLocaleDateString('en-CA');
                            const storeUpdates = { lastVisit: localToday, lastVisitedBy: agentFallback, updatedAt: serverTimestamp() };
                            if (currentTier !== earnedTier) storeUpdates.tier = earnedTier;
                            await updateDoc(targetDocRef, storeUpdates);

                            const localCust = customers.find(c => c.id === targetDocRef.id || (c.name || '').toLowerCase() === finalCust.toLowerCase());
                            if (localCust) { localCust.lastVisit = localToday; localCust.lastVisitedBy = agentFallback; }
                            if (currentTier !== earnedTier && triggerCapy) triggerCapy(`Level Up! ${finalCust} earned ${earnedTier}. 🚀`);
                        }
                    }
                } catch (e) { console.error("Auto-Promoter Failed:", e); }
            }

        } catch (error) {
            if (committed) {
                /* The sale is ALREADY in the database. Saying "failed" here is what made agents
                   press MAKE DEAL again and bill the customer twice, because the cart was still
                   on screen. Report the truth and clear the terminal. */
                console.error("Post-commit step failed:", error);
                notify("Sale SAVED. A follow-up step failed (Utang Barang record or store update). Do NOT repeat this sale - tell the admin.");
                resetTerminalAfterDeal();
            } else {
                notify("Transaction Failed! Please try again.");
            }
        }
        finally { setIsProcessingSale(false); }
    };

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const cardNode = scrollContainerRef.current.querySelector('.product-card');
            if (cardNode) {
                const gap = window.innerWidth >= 1024 ? 24 : 12; 
                const scrollAmount = cardNode.offsetWidth + gap; 
                scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
            }
        }
    };

    /* ------------------------------------------------------------------
       MANIFEST DRAWER — drag behaviour.

       Three rules here are not style preferences, they are fixes for bugs the
       HTML prototype actually shipped (plan sections 6a, 6a-2, 6a-3):
         - move/up/cancel bind to `window`, never to this component. Dragging
           UP releases the pointer above the component, so a locally-bound
           `pointerup` never fires and the gesture is stranded: tall panel,
           no committed state, blank body.
         - the drag aborts if the grip left the DOM mid-gesture instead of
           writing a height into a dead node.
         - a real drag arms a 120ms swallow for the synthetic click that
           follows it, or that click lands on whatever ware sits under the
           finger and opens it.
       The body is mounted at all times; `overflow-hidden` plus this height is
       the only thing hiding it, which is what makes the drag reveal content
       continuously instead of at the end.
       ------------------------------------------------------------------ */
    /* 104, not 52: the 52px grip plus the 52px customer bar above it. The bar is only worth
       moving to the top if it is on screen when the drawer is SHUT, so the closed height has
       to include it. Keep this in sync with the useState default and the wares-list padding. */
    const DRAWER_CLOSED = 104;
    const gripRef = useRef(null);
    const dragRef = useRef(null);
    const ghostUntilRef = useRef(0);

    /* HIS REPORT, 2026-08-12: "the notification bell button is collapsing infront of the
       manifest paper" — then, once the sheet stopped short of the header: "even more
       convenience if i can pull the manifest panel until the top of the app, so that the whole
       screen is full of manifest panel".

       Both are true at once, and the only way to have both is to stop treating this as a
       stacking argument. The bell belongs to the app header; the sheet is allowed all the way
       to the top again — and while it is standing IN that header's band, the header is faded
       out of the way instead of fought with. `kpm-sheet-over-header` on <html> is the switch;
       the rule lives in theme.css beside the kpm-nav-open ones, which do the same job for the
       sidebar. Nothing overlaps because by then there is nothing left to overlap.

       84 = the header on a phone, with a little margin so it is already gone by the time the
       paper arrives: pt-4 (16) + its two lines + the gold rule + pb-2. It was 112 while the
       orange menu square still forced pt-16 up there; the ribbon on the edge replaced it. */
    const DRAWER_TOP_GAP = 84;
    const drawerMax = () => window.innerHeight;

    const drawerSnaps = () => [DRAWER_CLOSED, Math.round(window.innerHeight * 0.55), drawerMax()];

    /* Continuous, not only at the top snap: the header has to be gone BEFORE the sheet reaches
       it, or it flickers back into view for the length of a drag. Cleaned up on unmount so
       leaving the sales tab mid-drag cannot strand the app with no header. */
    useEffect(() => {
        const root = document.documentElement;
        const covering = drawerH > window.innerHeight - DRAWER_TOP_GAP;
        root.classList.toggle('kpm-sheet-over-header', covering);
        return () => root.classList.remove('kpm-sheet-over-header');
    }, [drawerH]);

    useEffect(() => {
        const swallowGhostClick = (e) => {
            if (Date.now() < ghostUntilRef.current) { e.stopPropagation(); e.preventDefault(); }
        };
        document.addEventListener('click', swallowGhostClick, true);
        return () => document.removeEventListener('click', swallowGhostClick, true);
    }, []);

    /* `onTap` is what a press that never moved should do. The grip has no argument and keeps its
       old behaviour — a tap toggles the drawer. The CUSTOMER BAR passes a no-op, because a tap
       there belongs to the picker button inside it; without that override, tapping the customer
       bar would toggle the manifest instead of choosing a shop.

       HIS ASK: "the customer name textbox above the manifest drag button should also be use as
       drag button". The grip is 52px of a phone screen and it is the only thing you could grab;
       the bar above it doubles the target for the same gesture at no cost. */
    const startDrawerDrag = (e, onTap) => {
        if (dragRef.current) return;
        /* the clear-customer X is inside the bar and must not start a drag */
        if (e.target.closest && e.target.closest('[data-no-drag]')) return;
        dragRef.current = { startY: e.clientY, startH: drawerH, moved: false, onTap };
        setIsDragging(true);

        const onMove = (ev) => {
            const d = dragRef.current;
            if (!d) return;
            if (!gripRef.current || !gripRef.current.isConnected) return onEnd();
            if (Math.abs(ev.clientY - d.startY) > 4) d.moved = true;
            const max = drawerMax();
            setDrawerH(Math.max(DRAWER_CLOSED, Math.min(max, d.startH + (d.startY - ev.clientY))));
        };

        const onEnd = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onEnd);
            window.removeEventListener('pointercancel', onEnd);
            const d = dragRef.current;
            dragRef.current = null;
            setIsDragging(false);
            if (!d) return;
            if (!d.moved) {
                // a tap, not a drag: closed -> half, anything else -> closed
                if (d.onTap) { d.onTap(); return; }
                setDrawerH(h => (h <= DRAWER_CLOSED + 8 ? drawerSnaps()[1] : DRAWER_CLOSED));
                return;
            }
            ghostUntilRef.current = Date.now() + 120;
            setDrawerH(h => drawerSnaps().reduce((best, s) => (Math.abs(s - h) < Math.abs(best - h) ? s : best)));
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onEnd);
        window.addEventListener('pointercancel', onEnd);
    };

    const cartTotal = cart.reduce((sum, i) => sum + (i.calculatedPrice * i.qty), 0);
    /* The rail's idle state. Recomputed only when the transaction list actually changes —
       it walks every transaction in the seven-day window, which is cheap but not free, and
       this component re-renders on every keystroke in the search box. */
    const today = React.useMemo(() => dayStats(transactions), [transactions]);
    const clockLabel = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    /* The ware most likely to run out on this route. Zero is not "low", it is gone, and a
       salesman cannot act on it from here — it belongs to restock, not to the shelf. */
    const lowestStock = React.useMemo(() => {
        const inPlay = inventory.filter(i => (i.stock || 0) > 0);
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
        () => nextStop(customers, agentLocation, user?.displayName || user?.email?.split('@')[0] || ''),
        [customers, agentLocation, user]
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
            notify("Nothing from their last order is on the vehicle today.");
            return;
        }

        const tierToUse = lockedTier || (allowedTiers.includes('Retail') ? 'Retail' : (allowedTiers[0] || 'Retail'));
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
        if (clamped.length) notes.push(clamped.map(c => `${c.name}: only ${c.qty} on board (wanted ${c.wanted})`).join('\n'));
        if (dropped.length) notes.push(`Not on the vehicle today:\n${dropped.join('\n')}`);
        if (notes.length) notify(`Loaded their last order, with changes:\n\n${notes.join('\n\n')}`);
    };

    const filteredItems = inventory.filter(i => (activeCategory === "ALL" || i.type === activeCategory) && i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const categories = ["ALL", ...new Set(inventory.map(i => i.type || "MISC"))];

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

    const canSubmitSale = cart.length > 0 && customerName.trim() && gpsStatus !== 'checking' && txProofPhoto && !isGpsRestricted && !isProcessingSale && !hasInvalidDamagedItems && !hasInsufficientStockForExchange;

    /* HIS CALL, 2026-08-10: "what if we put the customer on top instead just near the strip?"
       The picker used to sit in the middle of the manifest paper, so the first question of every
       sale — who is buying — could only be answered by opening the drawer and scrolling the sheet.
       It is ONE bar now, pinned directly above the grip, which is why DRAWER_CLOSED grew from 52
       to 104: a bar you cannot see while the drawer is shut has not moved to the top of anything.
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
            {/* THIS BAR IS ALSO THE GRIP. His ask: "the customer name textbox above the manifest
                drag button should also be use as drag button". A press that moves drags the
                manifest; a press that does not is left to the picker button inside it, which is
                what the no-op onTap buys. touchAction none for the same reason the grip needs it:
                the browser claims a vertical drag as a page scroll before the first move event
                lands otherwise. */}
            <div
                onPointerDown={(e) => startDrawerDrag(e, () => {})}
                style={{ touchAction: 'none' }}
                className="manifest-dropdown-area hide-on-print shrink-0 h-[52px] px-3 flex items-center gap-2.5 bg-[var(--duke-fill-panel)] border-b border-[var(--duke-edge-1)] relative z-[60] cursor-grab active:cursor-grabbing select-none"
            >
                <Store size={16} className="shrink-0 text-[var(--duke-ink-3)]" />
                <button
                    onClick={() => setShowCustomerDropdown(true)}
                    aria-label="Choose customer"
                    className="flex-1 min-w-0 text-left"
                >
                    {customerName ? (
                        <>
                            <span className="block text-[9px] font-black uppercase tracking-widest text-[var(--duke-ink-6)] leading-none">Customer</span>
                            <span className="block text-sm font-black uppercase tracking-wide text-[var(--duke-paper-ink)] truncate leading-tight mt-1">{customerName}</span>
                        </>
                    ) : (
                        <span className="block text-xs font-black uppercase tracking-widest text-[var(--duke-ink-3)]">Customer — tap to choose</span>
                    )}
                </button>
                {customerName.length > 0 && (
                    <button
                        onClick={clearCustomer}
                        aria-label="Clear customer"
                        data-no-drag
                        className="shrink-0 bg-red-600 hover:bg-red-500 text-[var(--duke-on-fill)] p-1.5 rounded shadow-md active:scale-90 transition-all"
                    ><X size={14} strokeWidth={3}/></button>
                )}
            </div>

            {/* Anchored to the TOP, not the bottom, and that is not a taste call: a bottom-
                anchored sheet on iOS sits UNDER the keyboard the moment the field takes focus,
                which would bury the suggestions the sheet exists to show. */}
            {showCustomerDropdown && createPortal(
                <div className="manifest-dropdown-area hide-on-print fixed inset-0 z-[300] flex items-start justify-center">
                    <div className="absolute inset-0 bg-[var(--duke-scrim)] backdrop-blur-sm" onClick={() => setShowCustomerDropdown(false)}></div>

                    <div className="relative w-full lg:max-w-md lg:mt-16 max-h-[70vh] flex flex-col bg-[var(--duke-fill-deep)] border-b-4 lg:border-4 border-[var(--duke-edge-1)] shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
                        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[var(--duke-edge-1)]">
                            <Store size={16} className="shrink-0 text-[var(--duke-ink-3)]" />
                            <span className="flex-1 text-xs font-black uppercase tracking-widest text-[var(--duke-ink-3)]">Who is buying?</span>
                            {/* Says DONE, not an X. Half of what gets typed here is a walk-in that
                                is never in the book, and an X on the way out of that reads as
                                "throw the name away". */}
                            <button
                                onClick={() => setShowCustomerDropdown(false)}
                                className="kpm-hover shrink-0 px-3 py-1.5 border border-[var(--duke-edge-5)] rounded text-[10px] font-black uppercase tracking-widest text-[var(--duke-paper-ink)]"
                            >Done</button>
                        </div>

                        <div className="shrink-0 p-3">
                            {/* text-base is exactly 16px and it is load-bearing, not styling:
                                anything smaller makes iOS zoom the page on focus. */}
                            <input
                                autoFocus
                                value={customerName}
                                onChange={handleManualCustomerType}
                                placeholder="Type the shop name"
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
                                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--duke-ink-3)]">Profiled</span>
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

    const renderManifestUI = (isMobile) => (
        <div className={`kpm-parchment text-[var(--duke-on-plate-2)] shadow-2xl relative flex flex-col border-[var(--duke-edge-3)] ${isMobile ? 'flex-1 border-t-2' : 'w-80 border-l-2'} shrink-0`}>
            {/* grain now comes from .kpm-parchment */}
            <div className="p-3 md:p-4 border-b-2 border-dashed border-[var(--duke-edge-3)] relative z-10 text-center uppercase font-bold tracking-widest text-[var(--duke-ink-7)]">Manifest</div>
            
            <div className="p-3 md:p-4 relative z-[60] border-b border-[var(--duke-edge-on-paper)] bg-[var(--duke-paper-2)] space-y-3 md:space-y-4 manifest-dropdown-area">
                {/* the dropdown backdrop moved with the picker — it belongs to renderCustomerBar now */}

                {/* --- 🚀 DUAL MODE TOGGLE (SALE VS RETUR) --- */}
                <div className="flex bg-[var(--duke-fill-ground)] rounded border border-[var(--duke-edge-2)] p-1 mb-2">
                    <button onClick={() => { setIsReturMode(false); setReturType('EXCHANGE'); }} className={`kpm-hover flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded ${!isReturMode ? 'bg-[var(--duke-brass-2)] text-[var(--duke-on-plate)]' : 'text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]'}`}>Sale Mode</button>
                    <button onClick={() => {
                        if (!allowRetur) return notify("You do not have clearance to process returns.");
                        setIsReturMode(true);
                    }} className={`kpm-hover flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded ${isReturMode ? 'bg-[var(--danger-plate)] text-[var(--danger-plate-ink)]' : 'text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]'}`}>Retur Mode</button>
                </div>

                {/* --- 🚀 SUB MODE TOGGLE (BUYBACK VS EXCHANGE) --- */}
                {isReturMode && allowCashRefund && (
                    <div className="flex bg-[var(--duke-fill-panel-2)] rounded border border-[var(--duke-edge-2)] p-1 mb-2 shadow-inner">
                        {/* Muted plates, no emoji. These two are a mode switch, not an alert —
                            a saturated orange and a bright gold shouting at each other was the
                            loudest thing on a screen whose whole point is a quiet ledger. Buyback
                            keeps the desaturated danger plate because it pays money OUT. */}
                        <button onClick={() => setReturType('BUYBACK')} className={`kpm-hover flex-1 py-1 text-[11px] font-bold uppercase tracking-widest rounded ${returType === 'BUYBACK' ? 'bg-[var(--danger-plate)] text-[var(--danger-plate-ink)]' : 'text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]'}`}>Buyback (Refund)</button>
                        <button onClick={() => setReturType('EXCHANGE')} className={`kpm-hover flex-1 py-1 text-[11px] font-bold uppercase tracking-widest rounded ${returType === 'EXCHANGE' ? 'bg-[var(--duke-brass-3)] text-[var(--duke-paper-ink)]' : 'text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]'}`}>Exchange (Tukar)</button>
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
                                        <button onClick={() => handleFulfillIOU(iou)} className="bg-[var(--duke-brass-2)] hover:bg-[var(--duke-brass)] text-[var(--duke-on-plate)] px-2 py-1 rounded font-bold uppercase transition-colors">Fulfill</button>
                                    ) : (
                                        /* palette law: "done" is never a hue. Gold plate + tick, same as everywhere else. */
                                        <span className="text-[var(--duke-brass-ink)] font-bold uppercase px-2 py-1 border border-[color-mix(in_srgb,var(--duke-brass-edge)_50%,transparent)] rounded bg-[color-mix(in_srgb,var(--duke-brass)_10%,transparent)]"><Check size={10} className="inline mr-1"/> Added</span>
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
                                <h4 className="text-red-500 font-black uppercase tracking-widest text-[10px]">Warning: Jatuh Tempo!</h4>
                            </div>
                            <p className="text-[var(--duke-ink-1)] text-[11px] leading-relaxed uppercase tracking-widest mt-1">
                                {customerName} OWES <span className="font-bold text-[var(--duke-ink-hi)] text-[10px]">Rp {new Intl.NumberFormat('id-ID').format(debtInfo.totalDebt)}</span> FROM {debtInfo.ageDays} DAYS AGO.
                            </p>
                            <div className="text-[var(--duke-ink-hi)] bg-red-600 px-1.5 py-0.5 mt-2 inline-block text-[11px] uppercase tracking-widest font-black shadow-md">Collect payment before issuing new Titip!</div>
                        </div>
                    )}

                    <div className="relative">
                        <label className="text-[10px] font-bold uppercase tracking-widest block mb-1 text-[var(--duke-ink-7)]">Customer Name</label>
                        {/* Read-only echo. The picker is the bar at the top of this column now, but a
                            manifest with no name written on it is not a manifest, so the paper still
                            states who the deal is with. */}
                        {/* HIS ASK: "the customer box inside the manifest paper should also be
                            use to choose customer". It was a dead label that told you to go and
                            use the bar at the top — which is a sign, not a control. It opens the
                            SAME picker now; there is still exactly one `customerName` input in
                            the DOM, because that input lives in the picker sheet and this is a
                            button. Nothing here duplicates it. */}
                        <button
                            onClick={() => setShowCustomerDropdown(true)}
                            aria-label={customerName ? `Customer: ${customerName}. Tap to change` : 'Choose customer'}
                            className="kpm-hover w-full text-left bg-[var(--duke-paper-5)] border border-dashed border-[var(--duke-edge-on-paper)] text-[var(--duke-ink-7)] p-2 text-xs md:text-sm font-black uppercase rounded truncate"
                        >
                            {customerName || <span className="text-[var(--duke-ink-7)] font-bold normal-case tracking-normal">Tap to choose the customer</span>}
                        </button>

                        <div className="mt-2 min-h-[20px]">
                            {selectedCustomerInfo && !selectedCustomerInfo.isNooRegistration ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
                                        {gpsStatus === 'checking' && (
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-[var(--duke-amber-on-paper)] animate-pulse flex items-center gap-1"><MapPin size={12}/> Acquiring Satellites...</span>
                                                <button onClick={() => verifyLocation(true)} className="text-[var(--duke-amber-on-paper)] hover:text-[var(--duke-on-paper)] underline text-[11px] ml-2">PC Fast Scan</button>
                                            </div>
                                        )}
                                        
                                        {/* The prototype's geofence block. The app had this as a thin
                                            inline line that was easy to miss, and it is the check that
                                            decides whether a sale is allowed to happen at all — it should
                                            read as a statement, with the distance and the store named. */}
                                        {gpsStatus === 'verified' && (
                                            <div className="w-full border-l-[3px] border-[var(--duke-amber-edge-2)] bg-[var(--duke-paper-6)] px-3 py-2 rounded-r">
                                                <b className="block font-mono text-[9px] font-extrabold uppercase tracking-[0.16em] text-[var(--duke-amber-on-paper)] mb-1">Location verified</b>
                                                <span className="block normal-case tracking-normal text-[12px] font-semibold text-[var(--duke-on-plate)] leading-snug">
                                                    {distanceToStore}m from {selectedCustomerInfo.name}
                                                    <i className="not-italic font-mono text-[8px] font-extrabold uppercase tracking-[0.1em] text-[var(--duke-on-paper-dim)] ml-2 align-middle">auto</i>
                                                </span>
                                            </div>
                                        )}
                                        
                                        {gpsStatus === 'manual_override' && (
                                            <div className="flex flex-col gap-1 w-full">
                                                <div className="flex items-center gap-2 w-full">
                                                    {canOverrideGps ? (
                                                        <span className="text-yellow-600 flex items-center gap-1 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-600/50">
                                                            <AlertCircle size={12}/> Out of Range: Tier {user?.tier || 1} Auth ({distanceToStore}m)
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
                                                                <Camera size={10}/> Request 100m HQ Bypass
                                                            </button>
                                                        ) : bypassState.status === 'uploading' ? (
                                                            <span className="text-[11px] text-[var(--duke-amber-on-paper)] font-bold uppercase animate-pulse">Uploading Proof...</span>
                                                        ) : bypassState.status === 'pending' ? (
                                                            <span className="text-[11px] text-yellow-400 font-bold uppercase animate-pulse bg-yellow-900/20 px-2 py-1 rounded border border-yellow-500/50 inline-block w-fit">Awaiting HQ Approval...</span>
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
                                    
                                    {(!canOverrideGps && !hasClearance(user?.userRole || user?.role, 'can_unrestricted_sample') && !['verified', 'bypass', 'walk_in'].includes(gpsStatus)) ? (
                                        <button disabled className="w-full mt-1 bg-[var(--duke-fill-ground)] border border-[var(--duke-edge-ctl)] text-[var(--duke-ink-3)] text-[10px] font-bold uppercase tracking-widest p-2 rounded shadow-inner flex items-center justify-center gap-2 cursor-not-allowed">
                                            <Lock size={12}/> Sample Locked (Requires GPS)
                                        </button>
                                    ) : (
                                        <button onClick={() => setShowSampleModal(true)} className="w-full mt-1 bg-[var(--duke-fill-ground)] border border-[color-mix(in_srgb,var(--duke-amber-edge)_50%,transparent)] hover:bg-[var(--duke-amber)] text-[var(--duke-amber-ink)] hover:text-black text-[10px] font-bold uppercase tracking-widest p-2 rounded shadow-md flex items-center justify-center gap-2 transition-colors active:scale-95">
                                            <Package size={12}/> Deploy Free Sample
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
                    <label className="text-[10px] font-bold uppercase text-[var(--duke-ink-7)] block mb-1">Payment Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={isReturMode} className={`w-full bg-[var(--duke-paper)] border border-[var(--duke-edge-on-paper)] text-[var(--duke-ink-7)] p-2 text-xs md:text-sm font-bold uppercase outline-none rounded ${isReturMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {allowedPayments.map(method => ( <option key={method} value={method}>{method === 'Titip' ? 'Consignment' : method}</option> ))}
                    </select>
                </div>

                {paymentMethod === 'Titip' && !isReturMode && (
                    <div className="mt-3 bg-[var(--duke-fill-plank)] border border-[color-mix(in_srgb,var(--duke-amber-edge)_50%,transparent)] p-3 rounded shadow-inner animate-fade-in">
                        <label className="text-[10px] font-bold text-[var(--duke-ink-1)] mb-2 flex items-center justify-between uppercase tracking-widest">
                            <span>Jatuh Tempo (Due Date)</span>
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
                                <strong className="text-[var(--duke-ink-7)]">Rp {new Intl.NumberFormat('id-ID').format(selectedCustomerDebts.totalDebt)}</strong> Unpaid.
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
            <div className="flex-1 min-h-0 max-h-[min(54vh,540px)] overflow-y-auto p-2 md:p-3 relative z-10 space-y-2 kpm-scroll bg-[color-mix(in_srgb,var(--duke-paper-2)_50%,transparent)]">
                {cart.length === 0 ? (
                    <div className="text-center opacity-50 mt-8 font-bold uppercase text-xs md:text-sm">Manifest Empty</div>
                ) : (
                    cart.map((item, idx) => {
                        const mergedTiers = new Set(allowedTiers);
                        if (lockedTier) mergedTiers.add(lockedTier);
                        return (
                        <div key={idx} className={`kpm-row-in flex flex-col border-b-2 border-dashed border-[color-mix(in_srgb,var(--duke-edge-on-paper)_30%,transparent)] p-3 md:p-4 mb-1 rounded border shadow-sm ${isReturMode ? (returType === 'EXCHANGE' ? 'bg-[var(--duke-paper-3)] border-[var(--duke-brass-edge-2)]' : 'bg-[var(--duke-paper-7)] border-[var(--duke-danger-edge)]') : 'bg-[var(--duke-paper)] border-[color-mix(in_srgb,var(--duke-edge-on-paper)_50%,transparent)]'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] md:text-xs font-black w-40 leading-tight uppercase break-words whitespace-normal ${isReturMode ? (returType === 'EXCHANGE' ? 'text-[var(--duke-brass-ink-2)]' : 'text-red-900') : 'text-[var(--duke-ink-7)]'}`}>
                                    {item.name} {isReturMode && (returType === 'EXCHANGE' ? '(TUKAR GANTI)' : '(BUYBACK)')}
                                    {item.isIouFulfillment && ' (FULFILLING IOU)'}
                                </span>
                                <button onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} className={`p-1 rounded ${isReturMode ? (returType === 'EXCHANGE' ? 'bg-[var(--duke-paper-4)] text-[var(--duke-brass-ink-2)] hover:text-red-700' : 'text-red-800 hover:text-red-600 bg-red-200') : 'text-red-800 bg-red-100 hover:text-red-600'}`}><X size={14}/></button>
                            </div>
                            {/* the four boxes: type what the customer said, in their words */}
                            {!item.isIouFulfillment && (
                                <div className="flex items-center gap-1 flex-wrap mb-2">
                                    {['Karton', 'Bal', 'Slop', 'Bks'].map(u => (
                                        <span key={u} className="flex items-center gap-1 border border-[var(--duke-edge-on-paper)] bg-[var(--duke-paper-8)] px-1.5 py-1 rounded">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={(item.mix && item.mix[u]) || ''}
                                                onChange={(e) => applyMix(item, u, e.target.value)}
                                                placeholder="–"
                                                aria-label={`${item.name} ${u}`}
                                                className="w-8 bg-transparent text-center text-[var(--duke-on-plate)] font-black text-sm outline-none"
                                            />
                                            <em className="not-italic text-[8px] font-black uppercase tracking-widest text-[var(--duke-on-paper-dim)]">{u}</em>
                                        </span>
                                    ))}
                                    <span className="text-[10px] font-black font-mono text-[var(--duke-amber-on-paper)] ml-1">
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
                            <div className={`flex items-center gap-1 md:gap-2 p-1 rounded border ${isReturMode ? (returType === 'EXCHANGE' ? 'bg-[color-mix(in_srgb,var(--duke-paper-4)_60%,transparent)] border-[var(--duke-brass-edge-2)]' : 'bg-red-200/50 border-red-300') : 'bg-[var(--duke-paper-2)] border-[color-mix(in_srgb,var(--duke-edge-on-paper)_30%,transparent)]'}`}>
                                <input type="number" value={item.qty} disabled={item.isIouFulfillment} onChange={(e) => updateCartItem(item.productId, 'qty', e.target.value === '' ? '' : parseInt(e.target.value))} onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) updateCartItem(item.productId, 'qty', 1); }} className={`w-20 md:w-24 bg-white border border-[var(--duke-edge-3)] text-center text-xs md:text-sm font-bold tabular-nums outline-none focus:border-[var(--duke-amber-edge)] rounded p-1 text-[var(--duke-ink-7)] ${item.isIouFulfillment ? 'opacity-50' : ''}`} />
                                {/* 🚀 Phase 8: unit + price-tier directly change how much money is charged —
                                    bumped to text-sm specifically, not just the general 11px pass, since
                                    these two decide the price, not just describe something. */}
                                <select value={item.unit} disabled={item.isIouFulfillment} onChange={(e) => updateCartItem(item.productId, 'unit', e.target.value)} className={`bg-transparent text-sm font-bold uppercase outline-none text-[var(--duke-ink-7)] border-r border-[color-mix(in_srgb,var(--duke-edge-on-paper)_30%,transparent)] pr-1 md:pr-2 ${item.isIouFulfillment ? 'opacity-50' : ''}`}><option>Bks</option><option>Slop</option><option>Bal</option><option>Karton</option></select>
                                <select value={item.priceTier} onChange={(e) => updateCartItem(item.productId, 'priceTier', e.target.value)} disabled={!!lockedTier || item.isIouFulfillment} className={`bg-transparent text-sm font-bold uppercase outline-none text-[var(--duke-ink-7)] pl-1 ${lockedTier || item.isIouFulfillment ? 'opacity-50 cursor-not-allowed text-red-700' : ''}`}>
                                    {Array.from(mergedTiers).map(tier => ( <option key={tier} value={tier}>{tier}</option> ))}
                                </select>
                            </div>

                            {/* 🚀 ITEM-LEVEL FORENSIC TAGGING (RETUR ONLY) */}
                            {isReturMode && !item.isIouFulfillment && (
                                <div className={`mt-2 pt-2 border-t flex flex-col gap-2 ${returType === 'EXCHANGE' ? 'border-[color-mix(in_srgb,var(--duke-brass-edge-2)_50%,transparent)]' : 'border-red-300/50'}`}>
                                    <div className="flex gap-2">
                                        <select 
                                            value={item.condition || 'GOOD'} 
                                            onChange={(e) => updateCartItem(item.productId, 'condition', e.target.value)}
                                            className={`text-[11px] font-bold uppercase p-1.5 rounded outline-none border flex-1 ${item.condition === 'DAMAGED' ? 'bg-red-900/30 border-red-500 text-red-700' : 'bg-[var(--duke-paper-3)] border-[var(--duke-edge-on-paper)] text-[var(--duke-ink-7)]'}`}
                                        >
                                            <option value="GOOD">Good (Resellable)</option>
                                            <option value="DAMAGED">Damaged (Quarantine)</option>
                                        </select>

                                        {item.condition === 'DAMAGED' && (
                                            <select 
                                                value={item.returnReason || ''}
                                                onChange={(e) => updateCartItem(item.productId, 'returnReason', e.target.value)}
                                                className="text-[11px] font-bold uppercase p-1.5 rounded outline-none border bg-white border-red-400 text-red-800 flex-1"
                                            >
                                                <option value="">-- Select Reason --</option>
                                                <option value="Expired / Out of Date">Expired</option>
                                                <option value="Water / Weather Damage">Water Damage</option>
                                                <option value="Torn / Crushed Packaging">Torn/Crushed</option>
                                                <option value="Pest / Rodent Damage">Pest Damage</option>
                                                <option value="Factory Defect">Factory Defect</option>
                                                <option value="Other">Other...</option>
                                            </select>
                                        )}
                                    </div>
                                    
                                    {item.condition === 'DAMAGED' && item.returnReason === 'Other' && (
                                        <input 
                                            type="text" 
                                            placeholder="Describe the damage..." 
                                            value={item.otherReasonDetail || ''}
                                            onChange={(e) => updateCartItem(item.productId, 'otherReasonDetail', e.target.value)}
                                            className="w-full text-[10px] p-1.5 rounded border border-red-400 bg-white text-black outline-none focus:border-red-600"
                                        />
                                    )}

                                    {/* EXCHANGE MODE ONLY: FULFILL NOW VS IOU */}
                                    {returType === 'EXCHANGE' && (
                                        <div className="flex gap-2 mt-1">
                                            <button onClick={() => updateCartItem(item.productId, 'fulfillment', 'NOW')} className={`flex-1 py-1.5 text-[11px] font-bold uppercase rounded border transition-all ${item.fulfillment !== 'IOU' ? 'bg-[var(--duke-brass)] border-[var(--duke-brass-edge-2)] text-[var(--duke-on-plate)] shadow-md' : 'bg-[var(--duke-bar-3)] border-[color-mix(in_srgb,var(--duke-edge-3)_50%,transparent)] text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]'}`}>Give Replacement Now</button>
                                            <button onClick={() => updateCartItem(item.productId, 'fulfillment', 'IOU')} className={`flex-1 py-1.5 text-[11px] font-bold uppercase rounded border transition-all ${item.fulfillment === 'IOU' ? 'bg-[var(--duke-brass-3)] border-[var(--duke-brass-edge-4)] text-[var(--duke-on-fill)] shadow-md' : 'bg-[var(--duke-bar-3)] border-[color-mix(in_srgb,var(--duke-edge-3)_50%,transparent)] text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]'}`}>Hutang Barang (IOU)</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="text-right text-base md:text-lg font-black font-mono mt-2 text-[var(--duke-on-paper-dim)]">
                                {isReturMode && returType === 'BUYBACK' ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(item.calculatedPrice * item.qty)}
                            </div>
                        </div>
                    )})
                )}
            </div>
        </div>
    );

    /* Which sheet the alcove shows. He idles by default, talks while he has something to
       say, and holds the coin pose on a committed deal. */
    const merchSprite = merchantMood === 'deal' ? 'kpm-merch-deal'
                      : merchantMood === 'talking' ? 'kpm-merch-talk'
                      : 'kpm-merch-idle';

    return (
        <div className="flex h-full w-full bg-[var(--duke-fill-ground)] text-[var(--duke-ink-1)] font-serif overflow-hidden relative border-4 border-[var(--duke-edge-1)] shadow-2xl">
            <div className="absolute inset-0 opacity-50 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.025) 0 1px, transparent 1px 5px), repeating-linear-gradient(-45deg, rgba(0,0,0,.25) 0 1px, transparent 1px 5px)' }}></div>
            
            {/* Below lg this element IS the drawer: fixed to the bottom, its height driven
                by --drawer-h. At lg the media-query classes win over the base ones and it
                reverts to the static 420px left column, so the desktop layout is untouched.
                The height comes in as a CSS variable rather than an inline `height` on
                purpose - an inline height would beat `lg:h-full` and follow us onto desktop. */}
            <div
                ref={gripRef}
                style={{ '--drawer-h': `${drawerH}px` }}
                className={`hide-on-print fixed bottom-0 inset-x-0 z-[150] h-[var(--drawer-h)] overflow-hidden border-t-4 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]
                            lg:static lg:z-10 lg:h-full lg:w-[420px] lg:border-t-0 lg:border-r-4 lg:shadow-none
                            flex flex-col border-[var(--duke-edge-1)] bg-[var(--duke-fill-well)] shrink-0
                            ${isDragging ? '' : 'transition-[height] duration-[340ms] ease-[cubic-bezier(.33,.78,.22,1)]'}`}
            >
                {/* THE ALCOVE — desktop only. On a phone he still only visits, via
                    CapybaraMascot on a committed deal; a phone screen has no room to give
                    him. A desk does, so here he lives in the ledger column: idling while
                    you shop, talking when he has something to say, holding the coin on a
                    deal. Everything but the sprite is CSS, so it costs one image. */}
                {/* aria-hidden on the scenery only — his line is real content and is
                    announced, which is why the bubble sits outside that subtree. */}
                <div ref={alcoveRef} className="kpm-alcove hidden lg:grid shrink-0">
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

                {renderCustomerBar()}

                {/* The grip. Collapsed it is the drawer minus the customer bar, so it carries the running
                    total, the item count and the LAST ITEM ADDED - that last one is what
                    removes the need to open the manifest just to check it went in. */}
                <div
                    onPointerDown={startDrawerDrag}
                    style={{ touchAction: 'none' }}
                    className="lg:hidden h-[52px] shrink-0 px-4 flex items-center gap-3 cursor-grab active:cursor-grabbing select-none bg-[var(--duke-fill-panel)] border-b border-[var(--duke-edge-1)]"
                >
                    <div className="w-10 h-1.5 rounded-full bg-[var(--duke-fill-plank-2)] shrink-0"></div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--duke-ink-3)] leading-none">
                            Manifest ({cart.length})
                        </div>
                        <div className="text-[10px] font-mono text-[var(--duke-ink-6)] truncate leading-tight mt-0.5">
                            {cart.length ? cart[cart.length - 1].name : 'Empty — tap a ware to add'}
                        </div>
                    </div>
                    <span className={`text-lg font-black font-mono leading-none shrink-0 ${isReturMode && returType === 'BUYBACK' ? 'text-red-500' : 'text-[var(--duke-amber-ink)]'}`}>
                        {isReturMode && returType === 'BUYBACK' ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(cartTotal)}
                    </span>
                    <ChevronDown size={18} className={`shrink-0 text-[var(--duke-ink-3)] transition-transform ${drawerH > DRAWER_CLOSED + 8 ? '' : 'rotate-180'}`} />
                </div>

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
                    {renderManifestUI(true)}

                    {/* Still the same sheet of paper — same parchment, same tokens. It scrolls
                        with the manifest instead of being bolted under it. */}
                    <div className="kpm-parchment px-4 md:px-6 pb-4 shrink-0">

                    <div className="mb-4">
                        <label className="text-[10px] font-bold text-[var(--duke-ink-4)] uppercase tracking-widest block mb-2">Delivery Proof <span className="text-[var(--duke-danger-ink-2)]">*</span></label>
                        <input type="file" accept="image/*" capture="environment" id="txProof" className="hidden" onChange={handleTxPhotoCapture} />
                        
                        {txProofPhoto ? (
                            <div className="relative rounded-lg border-2 border-[var(--duke-amber-edge)] overflow-hidden shadow-[0_0_15px_rgba(255,157,0,0.3)] bg-[var(--duke-stage)]">
                                <img src={txProofPhoto} alt="Proof" className="w-full h-32 object-contain opacity-90" />
                                <button onClick={() => setTxProofPhoto(null)} className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-[var(--duke-on-fill)] p-1.5 rounded-md shadow-md"><X size={14}/></button>
                            </div>
                        ) : (
                            <button onClick={() => document.getElementById('txProof').click()} className="kpm-hover w-full py-2 border border-dashed border-[var(--duke-edge-4)] hover:border-[var(--duke-amber-edge-2)] text-[var(--duke-ink-4)] hover:text-[var(--duke-amber-ink-2)] bg-transparent rounded flex items-center justify-center gap-2">
                                <Camera size={14} />
                                <span className="text-[10px] uppercase tracking-widest font-bold">Capture Handover Photo</span>
                            </button>
                        )}
                    </div>

                    <div className="flex justify-between items-end mb-3 md:mb-4 border-b border-[var(--duke-edge-4)] pb-2 md:pb-3 font-mono">
                        <span className="text-xs md:text-sm font-bold text-[var(--duke-ink-4)] uppercase tracking-widest">Total Value</span>
                        <span className={`text-2xl md:text-3xl lg:text-4xl font-black leading-none tabular-nums ${isReturMode && returType === 'BUYBACK' ? 'text-[var(--duke-danger-ink-2)]' : 'text-[var(--duke-amber-ink-2)]'}`}>
                            {isReturMode && returType === 'BUYBACK' ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(cartTotal)}
                        </span>
                    </div>
                    
                    {hasInvalidDamagedItems && (
                        <div className="bg-red-900/40 border border-red-500 text-red-500 p-2 rounded mb-3 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                            <AlertTriangle size={14}/> Please complete damage reasons for all items.
                        </div>
                    )}
                    {hasInsufficientStockForExchange && (
                        <div className="bg-orange-900/40 border border-orange-500 text-orange-500 p-2 rounded mb-3 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 text-center">
                            <AlertTriangle size={16} className="shrink-0"/> You lack healthy vehicle stock to exchange. Switch to "Hutang Barang" or "Buyback".
                        </div>
                    )}

                    </div>
                </div>

                {/* THE PINNED BAR — the only thing that stays fixed on a phone now. Slimmer than
                    the old footer on purpose: this bar is height taken from the product list. */}
                <div className="kpm-parchment px-4 py-2 md:p-6 border-t-2 border-[var(--duke-edge-4)] flex flex-col shrink-0 z-20 shadow-[0_-6px_14px_rgba(110,84,44,0.18)]">
                    <button
                        onClick={handleFinalDeal}
                        disabled={!canSubmitSale || isProcessingSale}
                        className={`kpm-hover py-2.5 md:py-4 border-2 text-base md:text-xl lg:text-2xl font-black uppercase tracking-[0.2em] transition-all active:translate-y-1 shadow-lg rounded flex items-center justify-center gap-2 md:gap-3 ${canSubmitSale && !isProcessingSale ? (isReturMode ? (returType === 'EXCHANGE' ? 'bg-gradient-to-r from-[var(--duke-brass-2)] to-[var(--duke-brass-3)] border-[var(--duke-brass-edge)] text-[var(--duke-on-plate)] hover:from-[var(--duke-brass)] hover:to-[var(--duke-brass-6)] shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'bg-gradient-to-r from-red-600 to-red-800 border-red-500 text-[var(--duke-on-fill)] hover:from-red-500 hover:to-red-700 shadow-[0_0_20px_rgba(220,38,38,0.4)]') : 'bg-gradient-to-r from-[var(--duke-amber)] to-[var(--duke-amber-2)] border-[var(--duke-brass-edge-3)] text-black hover:from-[var(--duke-brass-5)] hover:to-[var(--duke-amber)]') : 'bg-transparent text-[var(--duke-ink-3)] border-[var(--duke-edge-4)] cursor-not-allowed'}`}
                    >
                        {isProcessingSale ? <span className="flex items-center gap-2 animate-pulse"><Zap size={20}/> PROCESSING...</span> :
                         gpsStatus === 'checking' ? 'Awaiting GPS...' :
                         isGpsRestricted ? <><Lock size={20}/> LOC. RESTRICTED</> :
                         !txProofPhoto && customerName.trim() ? <><Camera size={20}/> REQUIRE PROOF</> :
                         hasInvalidDamagedItems ? <><AlertTriangle size={20}/> REASON REQ.</> :
                         hasInsufficientStockForExchange ? <><AlertTriangle size={20}/> NO STOCK</> :
                         customerName.trim() ? (isReturMode ? <><AlertCircle size={24} className="md:w-6 md:h-6"/> PULL RETUR</> : <><Zap fill="black" size={20} className="md:w-6 md:h-6"/> MAKE DEAL</>) : "SIGN MANIFEST >"}
                    </button>
                </div>
            </div>

            {/* Always mounted now. It used to be hidden whenever the Merchant tab was open,
                which is the ~2n tab switches per sale this phase exists to remove. The
                bottom padding is the collapsed drawer's 104px (grip + customer bar), so the last
                ware clears it. */}
            <div className="hide-on-print flex-1 flex flex-col h-full lg:h-auto bg-[var(--duke-fill-deep)] pb-[104px] lg:pb-0 overflow-hidden">
                {/* WHICH STOCK AM I SELLING FROM — the boss's only. This used to be a bar in the
                    app shell above the whole terminal, where the manifest drawer painted over it
                    (his G5 report, twice). It is a row of this column now because this column is
                    what it changes: every ware below this line comes from whichever side is lit.
                    Same plates as the SALE/RETUR toggle in the manifest — same kind of switch. */}
                {onAdminSalesMode && (
                    <div className="p-2 md:p-3 bg-[var(--duke-bar-solid)] border-b border-[var(--duke-edge-1)] shrink-0">
                        <div className="flex bg-[var(--duke-fill-ground)] rounded border border-[var(--duke-edge-2)] p-1">
                            <button onClick={() => onAdminSalesMode('VAULT')} className={`kpm-hover flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-colors ${adminSalesMode !== 'VEHICLE' ? 'bg-[var(--duke-amber)] text-[var(--duke-on-plate)]' : 'text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]'}`}>Master Vault</button>
                            <button onClick={() => onAdminSalesMode('VEHICLE')} className={`kpm-hover flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-colors ${adminSalesMode === 'VEHICLE' ? 'bg-[var(--duke-brass-2)] text-[var(--duke-on-plate)]' : 'text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]'}`}>Boss Car</button>
                        </div>
                    </div>
                )}
                <div className="flex gap-2 p-2 md:p-3 bg-[var(--duke-bar-solid)] border-b border-[var(--duke-edge-1)] overflow-x-auto scrollbar-hide shrink-0">
                    {categories.map(cat => ( <button key={cat} onClick={() => setActiveCategory(cat)} className={`kpm-hover px-4 py-2 md:px-5 md:py-2.5 text-[10px] md:text-xs font-black uppercase whitespace-nowrap transition-all rounded-lg border-2 ${activeCategory === cat ? 'bg-[var(--duke-fill-tan)] text-black border-[var(--duke-amber-edge)]' : 'bg-[var(--duke-fill-panel)] text-[var(--duke-ink-5)] border-[var(--duke-edge-ctl)] hover:border-[var(--duke-edge-5)]'}`}>{cat}</button> ))}
                </div>
                {/* The examine shelf used to sit here as a full-width horizontal strip, which
                    cost the wares 150px of vertical room on every screen. It is the rail now —
                    same content, in space that was empty anyway. */}
                <div className="p-2 md:p-3 border-b border-[var(--duke-edge-1)] flex gap-3 shrink-0 bg-[var(--duke-fill-well)] items-center relative z-10">
                    <div className="relative flex-1">
                        <input ref={searchRef} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SEARCH WARES..." className="w-full bg-[var(--duke-well)] border-2 border-[var(--duke-edge-ctl)] p-2 md:p-3 pl-9 md:pl-10 pr-10 text-[var(--duke-amber-ink)] font-mono text-xs md:text-sm font-bold outline-none focus:border-[var(--duke-amber-edge)] rounded-lg shadow-inner transition-colors"/>
                        <Search size={16} className="absolute left-3 top-2.5 md:top-3.5 text-[var(--duke-ink-3)]"/>
                        <span className="kpm-kbd hidden lg:inline-grid absolute right-3 top-1/2 -translate-y-1/2">/</span>
                    </div>
                    <div className="hidden lg:flex gap-1">
                        <button onClick={() => scroll('left')} className="kpm-hover p-3 bg-[var(--duke-fill-panel)] border-2 border-[var(--duke-edge-ctl)] text-[var(--duke-ink-3)] hover:text-[var(--duke-amber-ink)] hover:border-[var(--duke-amber-edge)] rounded-lg active:scale-95 transition-all shadow-md"><ArrowLeft size={20}/></button>
                        <button onClick={() => scroll('right')} className="kpm-hover p-3 bg-[var(--duke-fill-panel)] border-2 border-[var(--duke-edge-ctl)] text-[var(--duke-ink-3)] hover:text-[var(--duke-amber-ink)] hover:border-[var(--duke-amber-edge)] rounded-lg active:scale-95 transition-all shadow-md"><ArrowRight size={20}/></button>
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
                                <div className="font-mono text-[8.5px] font-black uppercase tracking-[0.16em] text-[var(--duke-brass-ink)]">Next stop</div>
                                <div className="truncate font-mono text-[13px] font-black uppercase text-[var(--ink)]">{upNext.customer.name}</div>
                                <div className="mt-0.5 font-mono text-[10px] tabular-nums text-[var(--ink-dim)]">
                                    {metresLabel(upNext.metres)} &middot; {upNext.remaining} left today
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
                                    <Map size={14}/> Go
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {customerSettled && (
                    <div className="kpm-strip lg:hidden shrink-0 border-b border-[var(--duke-edge-1)] bg-[var(--duke-fill-well)] px-3 py-2">
                        {cart.length > 0 ? (
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="font-mono text-[8.5px] font-black uppercase tracking-[0.16em] text-[var(--ink-dim)]">Selling to</div>
                                    <div className="truncate font-mono text-[12px] font-black uppercase text-[var(--ink)]">{customerName}</div>
                                </div>
                                {/* The debt is the ONE thing that stays visible while he sells.
                                    Everything else can wait; this changes what he should accept. */}
                                {debtInfo && debtInfo.totalDebt > 0 && (
                                    <div className="shrink-0 border-l-[3px] border-[var(--danger)] bg-[var(--danger-well)] px-2 py-1 text-right">
                                        <div className="font-mono text-[8px] font-black uppercase tracking-[0.14em] text-[var(--duke-danger-ink)]">Owes</div>
                                        <div className="font-mono text-[11px] font-black tabular-nums text-[var(--danger-ink)]">
                                            Rp {new Intl.NumberFormat('id-ID').format(debtInfo.totalDebt)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {renderStoreSwap()}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-mono text-[8.5px] font-black uppercase tracking-[0.16em] text-[var(--duke-brass-ink)]">Before you go in</div>
                                        <div className="truncate font-mono text-[13px] font-black uppercase text-[var(--ink)]">{customerName}</div>
                                        <div className="mt-0.5 font-mono text-[10px] tabular-nums text-[var(--ink-dim)]">
                                            {brief
                                                ? <>Last order {agoLabel(brief.lastAt)} &middot; usually Rp {new Intl.NumberFormat('id-ID').format(brief.avgBasket)}</>
                                                : 'No order in the last 7 days'}
                                        </div>
                                        {/* HIS REPORT, G5: "it doesnt show me what is the last order item is, only the
                                            value". The desktop rail has listed the items since it was built (:2303);
                                            only the phone strip was reduced to a number, and the phone is where he
                                            cannot open the rail to go and look. `brief.lastItems` was already here —
                                            nothing new is fetched, it was simply never rendered on this branch.
                                            Two names then a count: the strip is one line of a card he reads at a
                                            doorstep, so it names enough to recognise the order, not to audit it. */}
                                        {brief?.lastItems?.length > 0 && (
                                            <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--duke-ink-2)]">
                                                {brief.lastItems.slice(0, 2).map(it => it.name).join(' · ')}
                                                {brief.lastItems.length > 2 && ` +${brief.lastItems.length - 2} more`}
                                            </div>
                                        )}
                                    </div>
                                    {debtInfo && debtInfo.totalDebt > 0 && (
                                        <div className="shrink-0 border-l-[3px] border-[var(--danger)] bg-[var(--danger-well)] px-2 py-1 text-right">
                                            <div className="font-mono text-[8px] font-black uppercase tracking-[0.14em] text-[var(--duke-danger-ink)]">Owes</div>
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
                                        className="kpm-press h-11 w-full rounded border-2 border-[var(--duke-brass-edge-3)] bg-gradient-to-r from-[var(--duke-amber)] to-[var(--duke-amber-2)] font-mono text-[11px] font-black uppercase tracking-[0.12em] text-black"
                                    >
                                        Same as last time
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
                <div className="kpm-wares-3up flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 pb-4 lg:p-6 lg:pb-8 flex flex-col lg:grid lg:grid-cols-2 [@media(min-width:1400px)]:grid-cols-3 lg:content-start gap-3 lg:gap-6 scrollbar-hide items-stretch lg:items-start bg-[var(--duke-fill-ground)] relative scroll-smooth" ref={scrollContainerRef}>
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 12px), repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 12px)' }}></div>
                    {filteredItems.map(item => (
                        /* Hover no longer drives the rail. Aldi's problem was concrete and
                           unanswerable by tuning: to reach the rail on the right he has to drag
                           the cursor ACROSS the shelf, so the panel he is walking towards keeps
                           changing under him before he arrives. A pointer cannot teleport.

                           The picture is now a pin — press it and that ware stays in the rail
                           until he presses another, or the same one again. Pressing anywhere
                           else on the card still adds to the cart, which is the common action
                           and keeps the biggest target. */
                        <div key={item.id} onClick={() => addToCart(item)} onContextMenu={(e) => { e.preventDefault(); onInspect(item); }} className="product-card w-full lg:w-full shrink-0 bg-[var(--duke-fill-well)] border-2 border-[var(--duke-edge-1)] hover:border-[var(--duke-amber-edge)] transition-all flex flex-row flex-wrap lg:flex-col group active:scale-[0.98] shadow-[0_10px_20px_rgba(0,0,0,0.3)] rounded-xl overflow-hidden relative z-10 h-max">
                            {/* 96px on a phone, not 80. This whole square is the press target for
                                the stock breakdown, and 80 minus its own padding left barely more
                                than a fingertip. */}
                            <div className="w-24 h-24 lg:w-auto lg:h-48 p-2 lg:p-5 flex items-center justify-center relative overflow-hidden bg-[var(--duke-shade)] shrink-0">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--duke-fill-plank)_0%,var(--duke-vignette)_80%)] opacity-50"></div>
                                {/* The ware as a solid object, not a picture of one. Front face is the real
                                    photo, the other faces are tinted panels; it turns only while pointed at.
                                    Pure CSS on purpose — see the note above .kpm-cube in theme.css. */}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); unlockSounds().then(() => playSound('tap')); setExamineItem(prev => prev?.id === item.id ? null : item); }}
                                    aria-pressed={examineItem?.id === item.id}
                                    aria-label={`Show what is left of ${item.name}`}
                                    className={`kpm-cube-stage w-full h-full relative cursor-pointer bg-transparent border-0 p-0 rounded-lg transition-shadow ${examineItem?.id === item.id ? 'shadow-[inset_0_0_0_2px_var(--duke-brass-edge)]' : ''}`}
                                    style={cubeVars(item)}
                                >
                                    {renderCube(item)}
                                </button>
                                <div className="hidden lg:block absolute top-3 right-3 bg-[var(--duke-badge)] text-[var(--duke-ink-3)] text-[10px] font-black px-2 py-1 rounded-full border border-[var(--duke-edge-1)] uppercase tracking-wider">
                                    {item.type || 'MISC'}
                                </div>
                                {/* Examine was reachable ONLY by right-click, which does not exist on a
                                    phone — so on the device most of these sales happen on, the 3D box
                                    could not be opened at all. Right-click still works. */}
                                {/* The eye used to sit here, on top of the picture. Moving it to
                                    desktop-only was not enough: the picture is the press target for
                                    "show me this ware" at EVERY width, so anything overlapping it
                                    competes with it everywhere, just less often on a big screen.

                                    It now lives where the ware's detail already is — the rail on a
                                    desk, the card's own panel on a phone — so the picture is one
                                    clean target and the examine button gets a full row in both
                                    places. Right-click on the card still opens it directly. */}
                            </div>
                            <div className="flex-1 min-w-0 bg-gradient-to-b from-[var(--duke-fill-ground)] to-[var(--duke-fill-well)] border-l-2 lg:border-l-0 lg:border-t-2 border-[var(--duke-edge-1)] p-2 lg:p-4 flex flex-row lg:flex-col items-center lg:items-stretch gap-2 lg:gap-0 font-mono relative">
                                <div className="flex-1 min-w-0 flex flex-col">
                                    <h4 className="text-[var(--duke-ink-1)] text-[12px] lg:text-sm font-black uppercase line-clamp-2 lg:mb-3 lg:h-[40px] leading-tight group-hover:text-[var(--duke-ink-hi)] transition-colors">{item.name}</h4>
                                    <div className="mt-1 lg:mt-auto flex flex-row items-center gap-2 lg:gap-0 lg:justify-between lg:items-end w-full">
                                        {/* The running Bks figure moved to the rail, where hovering shows it
                                            properly broken into Karton / Bal / Slop / Bks. A bare "9.892 Bks"
                                            on the card was four words of noise on the most crowded surface
                                            in the app.

                                            What stays is the STATE, not the number. Dropping the count is
                                            housekeeping; dropping every stock signal would be a regression —
                                            a salesman has to see an empty ware without hovering it, because
                                            he will never hover the one he was not already thinking about. */}
                                        <div className="flex flex-col gap-0.5 lg:gap-1">
                                            {item.stock <= 0 ? (
                                                <span className="text-[10px] lg:text-xs font-black px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-md border-2 inline-block bg-red-900/20 text-red-500 border-red-900/50">EMPTY</span>
                                            ) : item.stock <= (item.minStock || 50) ? (
                                                <span className="text-[10px] lg:text-xs font-black px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-md border-2 inline-block bg-[var(--duke-brass-4)] text-[var(--duke-amber-ink)] border-[color-mix(in_srgb,var(--duke-amber-edge)_50%,transparent)]">LOW</span>
                                            ) : null}
                                        </div>
                                        <div className="text-left lg:text-right lg:w-auto lg:mt-0 lg:pt-0 lg:border-none">
                                            <span className="hidden lg:block text-[11px] text-[var(--duke-ink-6)] font-bold uppercase tracking-widest mb-1">Ecer Price</span>
                                            <span className="text-[15px] lg:text-2xl font-black text-[var(--duke-amber-ink)] lg:text-[var(--duke-price-ink)] leading-none drop-shadow-[0_2px_4px_var(--duke-text-shade)]">{new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(item.priceEcer || 0)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Row steppers, mobile only. Desktop edits quantity in the
                                    manifest, which is on screen there anyway. */}
                                {(() => {
                                    const line = cart.find(c => c.productId === item.id);
                                    const qty = line?.qty || 0;
                                    return (
                                        /* mt on desktop: the steppers sat directly under the stock
                                           pill with nothing between them, so the two read as one
                                           control and the + was easy to hit while aiming at the
                                           stock figure. Size is unchanged - 32px is already under
                                           the 44px touch minimum and shrinking it further would
                                           trade one complaint for a worse one. */
                                        <div className="flex items-center gap-2 shrink-0 mt-1 lg:mt-3">
                                            <button
                                                disabled={!line}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!line) return;
                                                    // a tap on the way down, a distinct tone when the line is removed
                                                    unlockSounds().then(() => playSound(qty > 1 ? 'click' : 'error'));
                                                    qty > 1 ? updateCartItem(item.id, 'qty', qty - 1) : setCart(c => c.filter(i => i.productId !== item.id));
                                                }}
                                                className="kpm-press kpm-hover w-8 h-8 rounded-lg border-2 border-[var(--duke-edge-1)] bg-[var(--duke-fill-panel)] text-[var(--duke-ink-3)] text-lg font-black leading-none disabled:opacity-30 flex items-center justify-center"
                                            >−</button>
                                            <span className={`w-6 text-center text-sm font-black ${qty ? 'text-[var(--duke-amber-ink)]' : 'text-[var(--duke-ink-7)]'}`}>{qty}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); unlockSounds().then(() => playSound('click')); addToCart(item); }}
                                                className="kpm-press kpm-hover w-8 h-8 rounded-lg border-2 border-[var(--duke-amber-edge)] bg-[var(--duke-fill-plank)] text-[var(--duke-amber-ink)] text-lg font-black leading-none flex items-center justify-center"
                                            >+</button>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* PHONE ONLY: the same press that pins a ware to the rail on a desk
                                opens its stock here, because there is no rail to pin it to. One
                                gesture, one meaning — "show me this ware" — rendered wherever
                                there is room for it.

                                It is the units he counts in, not a flat Bks figure. Standing at
                                the back of the van he needs "two Karton and a Bal", not 1.847.
                                The card wraps so this lands full width underneath rather than
                                squeezing the row. */}
                            {examineItem?.id === item.id && (
                                <div className="kpm-strip w-full lg:hidden border-t-2 border-[var(--duke-edge-1)] bg-[var(--duke-bar)] px-2 py-2">
                                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                                        <span className="font-mono text-[8.5px] font-black uppercase tracking-[0.16em] text-[var(--ink-dim)]">In vehicle</span>
                                        {item.dimensions && (
                                            <span className="font-mono text-[8.5px] tabular-nums text-[var(--ink-disabled)]">
                                                {item.dimensions.w}×{item.dimensions.h}×{item.dimensions.d} mm
                                            </span>
                                        )}
                                    </div>
                                    {item.stock > 0 ? (
                                        <>
                                            <div className="grid grid-cols-4 gap-1">
                                                {(() => {
                                                    const split = splitToUnits(item.stock, item);
                                                    return ['Karton', 'Bal', 'Slop', 'Bks'].map(u => (
                                                        <div key={u} className={`rounded border px-1 py-1 text-center ${split[u] ? 'border-[var(--duke-edge-2)] bg-[var(--duke-fill-ground)]' : 'border-[var(--line)]'}`}>
                                                            <div className={`font-mono text-[13px] font-black tabular-nums leading-none ${split[u] ? 'text-[var(--ink)]' : 'text-[var(--duke-ink-8)]'}`}>{split[u]}</div>
                                                            <div className="mt-0.5 font-mono text-[7px] font-black uppercase tracking-[0.1em] text-[var(--ink-dim)]">{u}</div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                            <div className="mt-1 font-mono text-[9px] tabular-nums text-[var(--ink-dim)]">
                                                = {new Intl.NumberFormat('id-ID').format(item.stock)} Bks total
                                            </div>
                                        </>
                                    ) : (
                                        <div className="font-mono text-[11px] font-black uppercase text-[var(--duke-danger-ink)]">Empty</div>
                                    )}

                                    {/* The eye moved here off the 80px image. A full row at 44px is
                                        a target a thumb can actually hit, and it only appears once
                                        he has asked about this ware — which is exactly when he might
                                        want to turn it over. */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); unlockSounds().then(() => playSound('click')); onInspect(item); }}
                                        className="kpm-press mt-2 flex h-11 w-full items-center justify-center gap-2 rounded border border-[var(--duke-edge-1)] bg-[var(--duke-fill-ground)] font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[var(--duke-ink-3)]"
                                    >
                                        <Eye size={14}/> Examine in 3D
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* ---------- THE RAIL ----------
                    One column, two states, because they are never wanted at the same moment.
                    Pointing at a ware means a customer is in front of you: show the ware.
                    Pointing at nothing means you are between stops: show the day.

                    Deliberately NOT both at once. A running total on screen during a sale
                    invites the salesman to watch his own scoreboard instead of the person
                    talking to him.

                    xl and up only. Below that the shelf needs the width more, and nothing is
                    lost: examine is still on the eye button and the day's figures live on the
                    dashboard, which is where you go between routes anyway. */}
                <aside className="kpm-rail hidden xl:flex w-[236px] shrink-0 flex-col gap-4 border-l border-[var(--duke-edge-1)] bg-[var(--duke-fill-well)] p-4 overflow-y-auto kpm-scroll">
                    {examineItem ? (
                        <div key="examine" className="kpm-rail-panel">
                            <h3 className="m-0 mb-3 font-mono text-[11px] font-black uppercase tracking-[0.16em] text-[var(--duke-brass-ink)]">Examine</h3>
                            <div className="kpm-cube-stage big h-[150px]" style={cubeVars(examineItem)}>
                                {renderCube(examineItem)}
                            </div>
                            <p className="mt-3 mb-1 font-mono text-[12px] font-black uppercase tracking-[0.06em] text-[var(--ink)] leading-tight">{examineItem.name}</p>
                            <p className="m-0 font-mono text-[10.5px] tabular-nums text-[var(--ink-dim)]">
                                {examineItem.dimensions
                                    ? `${examineItem.dimensions.w} × ${examineItem.dimensions.h} × ${examineItem.dimensions.d} mm`
                                    : 'no size set in the vault'}
                            </p>
                            {/* In the units he counts in, not a flat Bks figure. "12 Karton 1 Bal
                                4 Slop" is what he would say out loud and how he checks the van
                                without opening a box; 9.892 is a number he has to do maths on. */}
                            <div className="mt-3 border-t border-[var(--line)] pt-3">
                                <div className="font-mono text-[9.5px] font-black uppercase tracking-[0.16em] text-[var(--ink-dim)] mb-2">In vehicle</div>
                                {(() => {
                                    const split = splitToUnits(examineItem.stock || 0, examineItem);
                                    const rows = ['Karton', 'Bal', 'Slop', 'Bks'];
                                    if (!(examineItem.stock > 0)) {
                                        return <div className="font-mono text-[13px] font-black uppercase text-[var(--duke-danger-ink)]">Empty</div>;
                                    }
                                    return (
                                        <>
                                            <div className="grid grid-cols-4 gap-1">
                                                {rows.map(u => (
                                                    <div key={u} className={`rounded border px-1 py-1.5 text-center ${split[u] ? 'border-[var(--duke-edge-2)] bg-[var(--duke-fill-ground)]' : 'border-[var(--line)] bg-transparent'}`}>
                                                        <div className={`font-mono text-[15px] font-black tabular-nums leading-none ${split[u] ? 'text-[var(--ink)]' : 'text-[var(--duke-ink-8)]'}`}>{split[u]}</div>
                                                        <div className="mt-1 font-mono text-[7.5px] font-black uppercase tracking-[0.1em] text-[var(--ink-dim)]">{u}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-1.5 font-mono text-[10px] tabular-nums text-[var(--ink-dim)]">
                                                = {new Intl.NumberFormat('id-ID').format(examineItem.stock)} Bks total
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Same button as the phone's panel, same place in the hierarchy: the
                                ware's detail. It came off the picture because the picture is the
                                press target for opening this panel at every width. */}
                            <button
                                onClick={() => { unlockSounds().then(() => playSound('click')); onInspect(examineItem); }}
                                className="kpm-press kpm-hover mt-3 flex h-10 w-full items-center justify-center gap-2 rounded border border-[var(--duke-edge-1)] bg-[var(--duke-fill-ground)] font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[var(--duke-ink-3)] hover:text-[var(--duke-amber-ink)] hover:border-[var(--duke-amber-edge)] transition-colors"
                            >
                                <Eye size={14}/> Examine in 3D
                            </button>
                        </div>
                    ) : customerSettled ? (
                        /* THE BRIEF. Ranked above Today because the moment a customer is named,
                           the day's running total stops being the useful thing on screen and
                           their file starts being it. A PINNED ware still wins over both — that
                           is him pointing at something specific.

                           Shown whenever a customer is NAMED, not only when history exists.
                           "No recent order" is itself worth reading: it says this is a new or a
                           stale account and he should not assume a usual basket. Falling back to
                           the day's takings there just looked like the rail had ignored him. */
                        <div key="brief" className="kpm-rail-panel">
                            {renderStoreSwap()}
                            <h3 className="m-0 mb-1 font-mono text-[11px] font-black uppercase tracking-[0.16em] text-[var(--duke-brass-ink)]">Before you go in</h3>
                            <p className="m-0 mb-3 font-mono text-[12px] font-black uppercase leading-tight text-[var(--ink)] break-words">{customerName}</p>

                            {!brief && (
                                <p className="m-0 border-t border-[var(--line)] pt-3 font-mono text-[11px] leading-relaxed text-[var(--ink-dim)]">
                                    No order in the last 7 days.<br/>
                                    <span className="text-[var(--ink-disabled)]">New account, or one worth asking about.</span>
                                </p>
                            )}

                            {/* Reported, not blocked. He is allowed to go back — sometimes a
                                customer calls him back the same afternoon — he just has to know
                                he already sold here today so the second sale is deliberate. */}
                            {revisitToday && (
                                /* Someone else's claim is the anti-fraud case and gets the danger
                                   colour; his own second visit is merely worth knowing. Both stay
                                   on screen for as long as the decision is live, which a dialog
                                   he can dismiss in half a second does not. */
                                <div className={`mb-3 border-l-[3px] px-3 py-2 ${revisitToday === 'me' ? 'border-[var(--duke-amber-edge)] bg-[var(--duke-brass-4)]' : 'border-[var(--danger)] bg-[var(--danger-well)]'}`}>
                                    <div className={`font-mono text-[9.5px] font-black uppercase tracking-[0.16em] mb-1 ${revisitToday === 'me' ? 'text-[var(--duke-amber-ink)]' : 'text-[var(--duke-danger-ink)]'}`}>
                                        {revisitToday === 'me' ? 'Already sold here today' : 'Already secured today'}
                                    </div>
                                    <div className="font-mono text-[10px] leading-snug text-[var(--ink-muted)]">
                                        {revisitToday === 'me'
                                            ? 'This would be a second visit.'
                                            : <>Claimed by <span className="font-black uppercase text-[var(--danger-ink)]">{revisitToday}</span>. Selling here is a redundant visit.</>}
                                    </div>
                                </div>
                            )}

                            {/* Territory: shown, never enforced — see handleCustomerSelect for why
                                the block was removed. This bar stays up for as long as the customer
                                is selected, which is the point: a dialog is gone in half a second,
                                and a suppressed dialog was never seen at all. */}
                            {territoryClaim && (
                                <div className="mb-3 border-l-[3px] border-[var(--danger)] bg-[var(--danger-well)] px-3 py-2">
                                    {/* No apostrophe in this heading on purpose — the audit matches
                                        it as a literal in the built bundle, and a minifier is free
                                        to re-quote and escape one, which would fail the check for
                                        no real reason. */}
                                    <div className="font-mono text-[9.5px] font-black uppercase tracking-[0.16em] text-[var(--duke-danger-ink)] mb-1">Another agent handles this store</div>
                                    <div className="font-mono text-[10px] leading-snug text-[var(--ink-muted)]">
                                        Assigned to <span className="font-black uppercase text-[var(--danger-ink)]">{territoryClaim}</span>. Selling is allowed — this sale will be recorded as a territory override.
                                    </div>
                                </div>
                            )}

                            {debtInfo && debtInfo.totalDebt > 0 && (
                                <div className="mb-3 border-l-[3px] border-[var(--danger)] bg-[var(--danger-well)] px-3 py-2">
                                    <div className="font-mono text-[9.5px] font-black uppercase tracking-[0.16em] text-[var(--duke-danger-ink)] mb-1">Owes</div>
                                    <div className="font-mono text-[15px] font-black tabular-nums text-[var(--danger-ink)] leading-none">
                                        Rp {new Intl.NumberFormat('id-ID').format(debtInfo.totalDebt)}
                                    </div>
                                    <div className="mt-1 font-mono text-[10px] tabular-nums text-[var(--ink-dim)]">{debtInfo.ageDays} days old</div>
                                </div>
                            )}

                            {brief && (<>
                            <div className="border-t border-[var(--line)] pt-3">
                                <div className="font-mono text-[9.5px] font-black uppercase tracking-[0.16em] text-[var(--ink-dim)] mb-1.5">Last order &middot; {agoLabel(brief.lastAt)}</div>
                                {brief.lastItems.length ? (
                                    <ul className="m-0 list-none p-0 flex flex-col gap-1">
                                        {brief.lastItems.slice(0, 4).map((it, i) => (
                                            <li key={i} className="font-mono text-[11px] leading-tight text-[var(--ink)] flex justify-between gap-2">
                                                <span className="min-w-0 break-words">{it.name}</span>
                                                <span className="shrink-0 tabular-nums text-[var(--ink-muted)]">{it.qty} {it.unit}</span>
                                            </li>
                                        ))}
                                        {brief.lastItems.length > 4 && (
                                            <li className="font-mono text-[10px] text-[var(--ink-dim)]">+{brief.lastItems.length - 4} more</li>
                                        )}
                                    </ul>
                                ) : (
                                    <p className="m-0 font-mono text-[11px] text-[var(--ink-dim)]">No line detail on that order.</p>
                                )}
                                <div className="mt-2 font-mono text-[11px] font-black tabular-nums text-[var(--duke-amber-ink)]">
                                    Rp {new Intl.NumberFormat('id-ID').format(brief.lastTotal)}
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-3">
                                <div>
                                    <div className="font-mono text-[9.5px] font-black uppercase tracking-[0.16em] text-[var(--ink-dim)] mb-1">Usual basket</div>
                                    <div className="font-mono text-[13px] font-black tabular-nums text-[var(--ink)]">Rp {new Intl.NumberFormat('id-ID').format(brief.avgBasket)}</div>
                                </div>
                                <div>
                                    <div className="font-mono text-[9.5px] font-black uppercase tracking-[0.16em] text-[var(--ink-dim)] mb-1">Visits &middot; 7d</div>
                                    <div className="font-mono text-[13px] font-black tabular-nums text-[var(--ink)]">{brief.visits}</div>
                                </div>
                            </div>

                            <button
                                onClick={handleReorder}
                                disabled={isReturMode || !brief.lastItems.length}
                                className="kpm-hover kpm-press mt-4 w-full rounded border-2 border-[var(--duke-brass-edge-3)] bg-gradient-to-r from-[var(--duke-amber)] to-[var(--duke-amber-2)] py-2.5 font-mono text-[11px] font-black uppercase tracking-[0.12em] text-black disabled:cursor-not-allowed disabled:border-[var(--line-2)] disabled:bg-none disabled:bg-transparent disabled:text-[var(--ink-disabled)]"
                            >
                                Same as last time
                            </button>
                            {isReturMode && (
                                <p className="m-0 mt-1.5 font-mono text-[10px] leading-snug text-[var(--ink-dim)]">Not while a retur is open.</p>
                            )}
                            </>)}
                        </div>
                    ) : (
                        <div key="today" className="kpm-rail-panel">
                            <h3 className="m-0 mb-3 font-mono text-[12.5px] font-black uppercase tracking-[0.16em] text-[var(--duke-brass-ink)]">Today</h3>

                            <div>
                                <div className="font-mono text-[11px] font-black uppercase tracking-[0.16em] text-[var(--ink-dim)] mb-1.5">Taken</div>
                                <div className="font-mono text-[26px] font-black tabular-nums text-[var(--duke-price-ink)] leading-none">
                                    Rp {new Intl.NumberFormat('id-ID').format(today.today)}
                                </div>
                                {/* Direction is carried by the ARROW first and colour second: the palette
                                    bans green, so an up/down pair could never lean on red/green anyway. */}
                                {today.pct === null ? (
                                    <p className="m-0 mt-1.5 font-mono text-[11.5px] text-[var(--ink-dim)]">no sales yesterday to compare</p>
                                ) : (
                                    <p className={`m-0 mt-1.5 flex items-baseline gap-1.5 font-mono text-[12.5px] font-black tabular-nums ${today.pct >= 0 ? 'text-[var(--duke-brass-ink)]' : 'text-[var(--duke-danger-ink)]'}`}>
                                        <span aria-hidden="true">{today.pct >= 0 ? '▲' : '▼'}</span>
                                        {Math.abs(today.pct)}%
                                        <span className="font-normal text-[var(--ink-dim)]">vs yesterday, {clockLabel}</span>
                                    </p>
                                )}
                            </div>

                            <div className="mt-3 border-t border-[var(--line)] pt-3">
                                <div className="font-mono text-[11px] font-black uppercase tracking-[0.16em] text-[var(--ink-dim)] mb-1.5">Stores done</div>
                                <div className="font-mono text-[26px] font-black tabular-nums text-[var(--ink)] leading-none">{today.stores}</div>
                                {today.storesYesterday > 0 && (
                                    <p className={`m-0 mt-1.5 flex items-baseline gap-1.5 font-mono text-[12.5px] font-black tabular-nums ${today.storesDelta >= 0 ? 'text-[var(--duke-brass-ink)]' : 'text-[var(--duke-danger-ink)]'}`}>
                                        <span aria-hidden="true">{today.storesDelta >= 0 ? '▲' : '▼'}</span>
                                        {Math.abs(today.storesDelta)}
                                        <span className="font-normal text-[var(--ink-dim)]">vs yesterday</span>
                                    </p>
                                )}
                            </div>

                            {today.last && (
                                <div className="mt-3 border-t border-[var(--line)] pt-3">
                                    <div className="font-mono text-[11px] font-black uppercase tracking-[0.16em] text-[var(--ink-dim)] mb-1.5">Last customer</div>
                                    <div className="font-mono text-[15px] font-black uppercase text-[var(--ink)] leading-tight break-words">{today.last.customerName}</div>
                                    <p className="m-0 mt-1 font-mono text-[12px] tabular-nums text-[var(--ink-dim)]">
                                        {agoLabel(today.lastAt)} &middot; Rp {new Intl.NumberFormat('id-ID').format(Number(today.last.total) || 0)}
                                    </p>
                                </div>
                            )}

                            {lowestStock && (
                                <div className="mt-3 border-t border-[var(--line)] pt-3">
                                    <div className="font-mono text-[11px] font-black uppercase tracking-[0.16em] text-[var(--ink-dim)] mb-1.5">Running low</div>
                                    <div className="font-mono text-[15px] font-black uppercase text-[var(--duke-danger-ink)] leading-tight break-words">{lowestStock.name}</div>
                                    <p className="m-0 mt-1 font-mono text-[12px] tabular-nums text-[var(--ink-dim)]">
                                        {new Intl.NumberFormat('id-ID').format(lowestStock.stock)} Bks left in the vehicle
                                    </p>
                                </div>
                            )}

                            {/* WHERE HE GOES NEXT. Sits in the idle panel because that is the
                                state he is in between stores — the day's takings and the next
                                stop answer the same question, "what now?", from either side. */}
                            {/* No fix, no suggestion — but SAY so. Showing nothing looked like the
                                feature was missing; Aldi assigned a store to himself, saw an empty
                                space, and reasonably concluded it did not work. A desktop browser
                                often has no location permission at all. */}
                            {!agentLocation && (
                                <div className="mt-3 border-t border-[var(--line)] pt-3">
                                    <div className="font-mono text-[11px] font-black uppercase tracking-[0.16em] text-[var(--ink-dim)] mb-1.5">Next stop</div>
                                    <p className="m-0 font-mono text-[12px] leading-relaxed text-[var(--ink-dim)]">
                                        Needs a GPS fix to know what is nearest.
                                    </p>
                                    <button
                                        onClick={() => verifyLocation(true)}
                                        className="kpm-hover kpm-press mt-2 flex h-9 w-full items-center justify-center gap-2 rounded border border-[var(--duke-edge-1)] bg-[var(--duke-fill-ground)] font-mono text-[11.5px] font-black uppercase tracking-[0.14em] text-[var(--duke-ink-3)] hover:text-[var(--duke-amber-ink)] hover:border-[var(--duke-amber-edge)] transition-colors"
                                    >
                                        <MapPin size={13}/> Find me
                                    </button>
                                </div>
                            )}

                            {agentLocation && !upNext && (
                                <div className="mt-3 border-t border-[var(--line)] pt-3">
                                    <div className="font-mono text-[11px] font-black uppercase tracking-[0.16em] text-[var(--ink-dim)] mb-1.5">Next stop</div>
                                    <p className="m-0 font-mono text-[12px] leading-relaxed text-[var(--ink-dim)]">
                                        Nothing left nearby — every store assigned to you has been visited today.
                                    </p>
                                </div>
                            )}

                            {upNext && (
                                <div className="mt-3 border-t border-[var(--line)] pt-3">
                                    <div className="font-mono text-[11px] font-black uppercase tracking-[0.16em] text-[var(--ink-dim)] mb-1.5">Next stop</div>
                                    <div className="font-mono text-[15px] font-black uppercase leading-tight text-[var(--ink)] break-words">{upNext.customer.name}</div>
                                    <p className="m-0 mt-1 font-mono text-[12px] tabular-nums text-[var(--ink-dim)]">
                                        {metresLabel(upNext.metres)} &middot; {upNext.remaining} left today
                                    </p>
                                    {directionsUrl(upNext.customer) && (
                                        /* A link, not a button: it leaves the app, and an app that
                                           leaves cannot finish a sale — so it stays secondary and
                                           quiet, never the thing his thumb finds first. */
                                        <a
                                            href={directionsUrl(upNext.customer)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="kpm-hover kpm-press mt-2 flex h-9 w-full items-center justify-center gap-2 rounded border border-[var(--duke-edge-1)] bg-[var(--duke-fill-ground)] font-mono text-[11.5px] font-black uppercase tracking-[0.14em] text-[var(--duke-ink-3)] no-underline hover:text-[var(--duke-amber-ink)] hover:border-[var(--duke-amber-edge)] transition-colors"
                                        >
                                            <Map size={13}/> Directions
                                        </a>
                                    )}
                                </div>
                            )}

                            <p className="mt-auto pt-3 border-t border-[var(--line)] m-0 font-mono text-[11.5px] leading-relaxed text-[var(--ink-dim)]">
                                Point at a ware to inspect it here.
                            </p>
                        </div>
                    )}
                </aside>
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
                <div className={`kpm-merch-float hide-on-print hidden lg:block ${floatLeaving ? 'leaving' : ''}`}>
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
                                <h2 className="text-lg font-black text-[var(--duke-ink-hi)] flex items-center gap-2 uppercase tracking-wider"><Store size={20} className="text-orange-500"/> Outlet Registration</h2>
                                <p className="text-[10px] text-[var(--duke-ink-3)] uppercase tracking-widest mt-1">Unlock Requested Pricing Tiers</p>
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
                                        You are standing next to <span className="font-black uppercase text-[var(--danger-ink)]">{proximityHit.name}</span>. Registering again would create a duplicate of it.
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setProximityAck(proximityHit.name); setProximityHit(null); }}
                                        className="w-full min-h-[44px] bg-[var(--duke-fill-plank)] hover:bg-[var(--duke-fill-plank-2)] text-[var(--duke-amber-ink)] text-[10px] font-black uppercase tracking-widest py-2.5 rounded transition-colors"
                                    >
                                        This is a different building — continue
                                    </button>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-[var(--duke-ink-3)] uppercase tracking-widest block mb-1">Store Name</label>
                                <input value={customerName} disabled className="w-full bg-[var(--duke-well-solid)] border border-[var(--duke-edge-ctl)] text-[var(--duke-ink-1)] p-3 rounded font-bold uppercase opacity-70" />
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-[var(--duke-ink-3)] uppercase tracking-widest block mb-1">WhatsApp / Phone <span className="text-red-500">*</span></label>
                                <input value={nooForm.phone} onChange={e => setNooForm({...nooForm, phone: e.target.value})} placeholder="e.g. 081234567890" className="w-full bg-[var(--duke-fill-panel)] border border-[var(--duke-edge-ctl)] focus:border-orange-500 outline-none text-[var(--duke-ink-hi)] p-3 rounded font-bold" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-[var(--duke-ink-3)] uppercase tracking-widest block mb-1">Requested Pricing Tier <span className="text-red-500">*</span></label>
                                <select value={nooForm.requestedTier} onChange={e => setNooForm({...nooForm, requestedTier: e.target.value})} className="w-full bg-[var(--duke-fill-panel)] border border-[var(--duke-edge-ctl)] focus:border-orange-500 outline-none text-[var(--duke-ink-hi)] p-3 rounded font-bold uppercase">
                                    {allowedTiers.map(tier => ( <option key={tier} value={tier}>{tier}</option> ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-[var(--duke-ink-3)] uppercase tracking-widest block mb-2">Storefront Photo <span className="text-red-500">*</span></label>
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
                                        <p className="text-xs text-[var(--duke-amber-ink)] font-mono">{agentLocation ? `${agentLocation.latitude.toFixed(5)}, ${agentLocation.longitude.toFixed(5)}` : 'Awaiting GPS Lock...'}</p>
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
                                <h2 className="text-lg font-black text-[var(--duke-ink-hi)] flex items-center gap-2 uppercase tracking-wider"><Package size={20} className="text-[var(--duke-brass-ink)]"/> Deploy Marketing Sample</h2>
                                <p className="text-[10px] text-[var(--duke-ink-3)] uppercase tracking-widest mt-1">Target: {customerName}</p>
                            </div>
                            <button onClick={() => setShowSampleModal(false)} className="text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]"><X size={24}/></button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-[var(--duke-ink-3)] uppercase tracking-widest block mb-1">Select Product</label>
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
                            
                            <div className="bg-[color-mix(in_srgb,var(--duke-brass)_10%,transparent)] p-3 rounded border border-[color-mix(in_srgb,var(--duke-brass-edge)_30%,transparent)] text-[var(--duke-brass-ink)] text-[10px] uppercase tracking-widest font-bold flex items-start gap-2">
                                <AlertCircle size={14} className="shrink-0 mt-0.5"/>
                                <p>Warning: You must collect the Pita Cukai for every open pack. This will be demanded during EOD Setoran.</p>
                            </div>
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
                                        <h2 className="text-base font-black uppercase tracking-widest !text-black">{appSettings?.companyName || "KPM INVENTORY"}</h2>
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
                                                )) : <tr><td colSpan="2" className="text-center py-4 text-[10px] italic !text-slate-400">No Itemized Data</td></tr>}
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
                                                <h1 className="text-2xl md:text-3xl font-black !text-blue-900 tracking-widest uppercase break-words">{appSettings?.companyName || "PT KARYAMEGA PUTERA MANDIRI"}</h1>
                                                <p className="text-xs md:text-sm font-bold !text-slate-700 mt-1 whitespace-pre-line">{appSettings?.companyAddress || "Jl. Raya Magelang - Purworejo Km. 11, Palbapang, Mungkid, Magelang"}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <h2 className="text-xl md:text-2xl font-bold !text-blue-800 uppercase tracking-widest">NOTA {receiptData.method === 'Retur/BS' ? 'RETUR' : 'PENJUALAN'}</h2>
                                                <p className="text-[10px] uppercase font-bold !text-slate-400 tracking-widest mt-1">CUSTOMER COPY</p>
                                            </div>
                                        </div>

                                        <div className="flex justify-between mb-8 text-sm">
                                            <table className="w-1/3">
                                                <tbody>
                                                    <tr><td className="font-bold py-1 w-24 !text-slate-400 uppercase align-top">Tanggal</td><td className="font-bold py-1 !text-slate-900">: {receiptDateStr}</td></tr>
                                                    {receiptTimeStr && <tr><td className="font-bold py-1 w-24 !text-slate-400 uppercase align-top">Waktu</td><td className="font-bold py-1 !text-slate-900">: {receiptTimeStr}</td></tr>}
                                                    
                                                    <tr><td className="font-bold py-1 !text-slate-400 uppercase align-top">Tipe Harga</td><td className="font-bold py-1 !text-slate-900">: <span className="uppercase !bg-blue-100 !text-blue-800 px-2 py-0.5 rounded text-xs border !border-blue-200">{activeTier}</span></td></tr>
                                                    <tr><td className="font-bold py-1 !text-slate-400 uppercase align-top">Sales / Agent</td><td className="font-bold py-1 !text-slate-900 uppercase">: {receiptData.agentName === 'Admin' ? (appSettings?.adminDisplayName || 'Admin') : (receiptData.agentName || 'Sales')}</td></tr>
                                                    <tr><td className="font-bold py-1 !text-slate-400 uppercase align-top">Metode Bayar</td><td className="font-bold py-1 !text-slate-900 uppercase">: {receiptData.method || 'Cash'}</td></tr>
                                                </tbody>
                                            </table>
                                            <div className="w-1/3 border-2 !border-slate-800 p-3 rounded-lg bg-slate-50 shadow-sm flex flex-col justify-center">
                                                <p className="font-bold !text-slate-400 text-xs mb-1">KEPADA YTH,</p>
                                                <p className="text-xl font-black uppercase !text-slate-900">{receiptData.customer}</p>
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
                                            <title>KPM Invoice</title>
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
                                    let text = `*${appSettings?.companyName || "KPM INVENTORY"}*\n*OFFICIAL RECEIPT*\n------------------------\nDate: ${receiptDateStr}\nTime: ${receiptTimeStr}\nCustomer: ${receiptData.customer}\nPayment: ${receiptData.method || 'Cash'}\n------------------------\n`;
                                    if (receiptData.items && receiptData.items.length > 0) {
                                        receiptData.items.forEach(item => { text += `${item.qty} ${item.unit} ${item.name}\n   Rp ${new Intl.NumberFormat('id-ID').format((item.calculatedPrice||0) * item.qty)}\n`; });
                                    }
                                    text += `------------------------\n*TOTAL: ${receiptData.method === 'Retur/BS' ? '-' : ''}Rp ${new Intl.NumberFormat('id-ID').format(receiptData.total || 0)}*\n\nThank you for your business!`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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