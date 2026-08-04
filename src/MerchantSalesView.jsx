import React, { useState, useEffect, useRef } from 'react';
import { Search, Box, Zap, X, DollarSign, List, ChevronDown, Printer, MessageSquare, ArrowRight, ArrowLeft, MapPin, AlertCircle, Camera, Store, Map, Lock, Package, AlertTriangle, Check, Eye } from 'lucide-react';
import { doc, setDoc, collection, getDoc, getDocs, updateDoc, addDoc, onSnapshot, serverTimestamp, runTransaction } from 'firebase/firestore'; 
import { hasClearance } from './config/permissions';
import { savePhotoAndGetReference, convertToBks } from './utils/helpers';
import { unlockSounds, speakMumble, playSound } from './hooks/useSound';

const MerchantSalesView = ({ inventory, user, isAdmin, logAudit, triggerCapy, onProcessSale, onInspect, appSettings, customers = [], allowedPayments = ['Cash'], allowedTiers = ['Retail', 'Ecer'], transactions = [], allowRetur = true, db, appId, agentProfileId, storage }) => {
    /* Phase A items 1-2: the two-tab bar is gone. The manifest is a bottom drawer that
       is dragged between three snap points, so the wares list never has to be left. */
    const [drawerH, setDrawerH] = useState(52);
    const [isDragging, setIsDragging] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState([]);
    const [activeCategory, setActiveCategory] = useState("ALL");
    // which ware the examine shelf is showing — one write per hover, never per frame
    const [examineItem, setExamineItem] = useState(null);
    
    // --- MERCHANT STATE ---
    const [merchantMood, setMerchantMood] = useState("idle");
    const lastChatterRef = useRef(0);   // throttles how often he reacts to a tap

    // 🚀 DUAL RETUR ENGINE
    const [isReturMode, setIsReturMode] = useState(false);
    const [returType, setReturType] = useState('EXCHANGE'); // 'BUYBACK' | 'EXCHANGE'

    // --- FORM STATE ---
    const [customerName, setCustomerName] = useState("");
    const [paymentMethod, setPaymentMethod] = useState(allowedPayments[0] || "Cash");
    const [isProcessingSale, setIsProcessingSale] = useState(false); 
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [receiptData, setReceiptData] = useState(null); 
    const [lockedTier, setLockedTier] = useState(null); 
    const [tempoDays, setTempoDays] = useState(appSettings?.defaultTempoDays || 7); 
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
            (t.customerName || '').trim().toLowerCase() === customerName.trim().toLowerCase()
        ).sort((a,b) => new Date(a.date) - new Date(b.date));

        let debts = [];
        custTrans.forEach(t => {
            if (t.type === 'SALE' && t.paymentType === 'Titip') {
                debts.push({ date: t.date, remaining: t.total });
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

        return { totalDebt, ageDays, status, oldestDate };
    }, [customerName, transactions]);

    const selectedCustomerDebts = React.useMemo(() => {
        if (!customerName || !transactions || transactions.length === 0) return { totalDebt: 0, isOverdue: false };
        let titipTotal = 0; let paymentTotal = 0; let isOverdue = false;
        const now = new Date().getTime();

        transactions.forEach(t => {
            const tCust = t.customerName || t.customer;
            if (tCust?.toLowerCase() === customerName.toLowerCase()) {
                if (t.paymentType === 'Titip' || t.method === 'Titip') {
                    titipTotal += (t.total || 0);
                    const saleDate = t.timestamp?.seconds ? t.timestamp.seconds * 1000 : (t.timestamp || new Date(t.date).getTime());
                    const tempo = t.tempoDays || 7;
                    if (now > (saleDate + (tempo * 86400000))) isOverdue = true;
                }
                if (t.type === 'CONSIGNMENT_PAYMENT') paymentTotal += (t.amountPaid || t.total || 0);
            }
        });
        const totalDebt = titipTotal - paymentTotal;
        return { totalDebt: Math.max(0, totalDebt), isOverdue: totalDebt > 0 ? isOverdue : false };
    }, [customerName, transactions]); 

    // --- GEO-FENCE & NOO STATE ---
    const [selectedCustomerInfo, setSelectedCustomerInfo] = useState(null);
    const [gpsStatus, setGpsStatus] = useState('idle'); 
    const [distanceToStore, setDistanceToStore] = useState(null);
    const [agentLocation, setAgentLocation] = useState(null);
    const [manualOverride, setManualOverride] = useState(false); 
    const [bypassState, setBypassState] = useState({ status: 'idle', id: null, photo: null });
    
    const [showNooModal, setShowNooModal] = useState(false);
    const [showSampleModal, setShowSampleModal] = useState(false);
    const [sampleForm, setSampleForm] = useState({ productId: '', qtyBks: 0, qtyBatang: 0 });
    
    const defaultNooTier = allowedTiers[allowedTiers.length - 1] || 'Retail';
    const [nooForm, setNooForm] = useState({ phone: '', address: '', requestedTier: defaultNooTier, photoUrl: null });
    const fileInputRef = useRef(null);

    const scrollContainerRef = useRef(null);
    const [txProofPhoto, setTxProofPhoto] = useState(null);

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
                        let closestStore = null; let minDistance = Infinity;
                        customers.forEach(c => {
                            if (c.latitude && c.longitude && c.status !== 'PENDING') {
                                const dist = calculateDistance(lat, lon, c.latitude, c.longitude);
                                if (dist < minDistance) { minDistance = dist; closestStore = c; }
                            }
                        });
                        if (closestStore && minDistance <= 50) {
                            setDistanceToStore(Math.round(minDistance));
                            handleCustomerSelect(closestStore, Math.round(minDistance));
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
    const triggerMerchantSpeak = (type) => {
        // He reacts, but not to every single press - a 15-line basket would have him
        // talking non-stop. At most once every 6 seconds, then back to idle.
        const now = Date.now();
        if (now - lastChatterRef.current < 6000) return;
        lastChatterRef.current = now;
        setMerchantMood('talking');
        setTimeout(() => setMerchantMood('idle'), 2400);
    };

    const handleCustomerSelect = (cust, autoLockedDistance = null) => {
        const localToday = new Date().toLocaleDateString('en-CA'); 
        if (cust.lastVisit === localToday) {
            const claimant = String(cust.lastVisitedBy || cust.lastVisitTag || 'ANOTHER AGENT').toUpperCase();
            if (!window.confirm(`⚠️ DOUBLE-TAP WARNING!\n\nTarget "${cust.name}" was ALREADY SECURED today by ${claimant}.\n\nAre you absolutely sure you want to proceed with a redundant visit/sale?`)) {
                setCustomerName(""); setShowCustomerDropdown(false); return; 
            }
        }

        const currentAgentName = user?.displayName || user?.email?.split('@')[0] || 'Admin';
        const assignedAgent = cust.assignedAgent;
        if (assignedAgent && assignedAgent !== 'Unassigned') {
            const isAssignedToMe = currentAgentName.toLowerCase().includes(assignedAgent.toLowerCase()) || assignedAgent.toLowerCase().includes(currentAgentName.toLowerCase());
            if (!isAssignedToMe && !window.confirm(`⚠️ TERRITORY OVERRIDE WARNING!\n\nTarget "${cust.name}" is officially assigned to ${assignedAgent.toUpperCase()}.\n\nAre you sure you want to intercept their target?`)) {
                setCustomerName(""); setShowCustomerDropdown(false); return;
            }
        }

        setCustomerName(cust.name);
        setShowCustomerDropdown(false);
        triggerMerchantSpeak('add');
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
        setCustomerName(e.target.value); setShowCustomerDropdown(true); setSelectedCustomerInfo(null); 
        setLockedTier('Ecer'); updateCartPricing('Ecer'); setManualOverride(true); setBypassState({ status: 'idle', id: null, photo: null });
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

    const addToCart = (product) => {
        if (!isReturMode && product.stock <= 0) return alert(`OUT OF STOCK IN VEHICLE!\n\nYou cannot sell ${product.name} because you don't have any in your car.`);

        setCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
                if (!isReturMode && existing.qty >= product.stock) {
                    alert(`MAX STOCK REACHED!\n\nYou only have ${product.stock} units of ${product.name} in your vehicle.`);
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
                        alert(`INSUFFICIENT VEHICLE STOCK!\n\nYou only have ${maxStock} units of ${item.name} available.`);
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
        if (!product) return alert("Product no longer exists in inventory!");
        if (product.stock < iou.qty) return alert("You don't have enough healthy stock in your vehicle to fulfill this IOU!");

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
                                setBypassState({ status: 'rejected', id: null, photo: null }); alert("HQ Rejected your Bypass Request."); unsub();
                            }
                        }
                    }, (err) => {
                        // 🚀 FIX: Without this, a denied read left the sale screen stuck on
                        // "Awaiting approval..." forever with no explanation.
                        console.warn("GPS bypass approval listener:", err.code);
                        setBypassState({ status: 'idle', id: null, photo: null });
                        alert("Could not check bypass approval status. Please try again.");
                    });
                } catch (err) { alert(`Failed to submit bypass request: ${err.message || "Network Error"}`); setBypassState({ status: 'idle', id: null, photo: null }); }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const validateNoo = () => {
        if (!nooForm.phone || !nooForm.photoUrl) return alert("Phone number and Photo are required to register a new outlet!");
        if (customers.find(c => c.name.toLowerCase().trim() === customerName.toLowerCase().trim())) return alert("DUPLICATE DETECTED!\n\nA store with this name is already in the database.");
        
        let tooClose = null; let tooCloseDistance = Infinity;
        if (agentLocation) {
            customers.forEach(c => {
                if (c.latitude && c.longitude) {
                    const dist = calculateDistance(agentLocation.latitude, agentLocation.longitude, c.latitude, c.longitude);
                    if (dist < 15 && dist < tooCloseDistance) { tooClose = c; tooCloseDistance = dist; }
                }
            });
        }
        if (tooClose && !window.confirm(`⚠️ EXTREME PROXIMITY WARNING!\n\nYou are standing only ${Math.round(tooCloseDistance)} meters away from an existing store: "${tooClose.name}".\n\nAre you sure this is a different building/customer?`)) return false;
        return true;
    };

    const submitNooRegistration = async () => {
        if (!validateNoo()) return;
        try {
            const userId = user?.uid || user?.id || 'default';
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
        } catch (e) { alert("Failed to save NOO: " + e.message); }
    };

    // 🚀 FIX: "Register Only (No Sale)" button had no handler at all — undefined
    // reference, second crash in this same modal. Registers the outlet exactly like
    // submitNooRegistration, but does NOT lock cart pricing or advance into a sale.
    const submitNooOnly = async () => {
        if (!validateNoo()) return;
        try {
            const userId = user?.uid || user?.id || 'default';
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
        } catch (e) { alert("Failed to save NOO: " + e.message); }
    };

    const handleDeploySample = async () => {
        const qtyBks = parseInt(sampleForm.qtyBks) || 0;
        const qtyBatang = parseInt(sampleForm.qtyBatang) || 0;
        if (qtyBks === 0 && qtyBatang === 0) return alert("Enter a valid quantity to sample.");
        if (!sampleForm.productId) return alert("Please select a product.");

        const product = inventory.find(p => p.id === sampleForm.productId);
        const sp = product?.sticksPerPack || 16;
        const totalQtyDecimal = qtyBks + (qtyBatang / sp);

        if ((product.stock || 0) < totalQtyDecimal) return alert(`INSUFFICIENT STOCK!\n\nYou only have ${product.stock} units of ${product.name} available in your vehicle.`);

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
                        let mCanvas = cItem.unit === 'Slop' ? (product.packsPerSlop || 10) : cItem.unit === 'Bal' ? ((product.slopsPerBal || 20) * (product.packsPerSlop || 10)) : 1;
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
                    date: new Date().toISOString().split('T')[0], productId: product.id, productName: product.name,
                    qty: totalQtyDecimal, unit: 'Bks', sticksPerPack: sp, reason: customerName.trim(), note: 'POS Quick Sample', sourceId: sourceId, timestamp: serverTimestamp()
                });
            });

            if (logAudit) logAudit("SAMPLE_DEPLOYED", `Gave ${totalQtyDecimal.toFixed(2)} Bks of ${product.name} to ${customerName}`);
            if (triggerCapy) triggerCapy(`Sample deployed to ${customerName}! Pita Cukai recorded. 🎁`);
            window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));

            setShowSampleModal(false); setSampleForm({ productId: '', qtyBks: 0, qtyBatang: 0 });
        } catch (err) { alert("Failed to deploy sample: " + err); } finally { setIsProcessingSale(false); }
    };

    const handleFinalDeal = async () => {
        if (cart.length === 0 || !customerName.trim() || !txProofPhoto || isProcessingSale) return;
        setIsProcessingSale(true); 
        
        const finalCust = customerName.trim();
        const finalCart = [...cart];
        const finalTotal = isReturMode && returType === 'EXCHANGE' ? 0 : cartTotal;

        const displayMethod = isReturMode ? (returType === 'EXCHANGE' ? 'Tukar Ganti' : 'Retur/BS') : (cart.some(i => i.isIouFulfillment) ? 'IOU Fulfillment' : paymentMethod);
        
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
        } else if (cart.some(i => i.isIouFulfillment)) {
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
            if (navigator.onLine) {
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
                isRetur: isReturMode, type: txType
            };

            const trueAgentName = await onProcessSale(finalCust, dbMethod, finalCart, newStorePayload, proofPayload);
            const agentFallback = typeof trueAgentName === 'string' ? trueAgentName : (user?.displayName || user?.email?.split('@')[0] || 'Admin');
         
            const generatedIOUs = finalCart.filter(i => isReturMode && returType === 'EXCHANGE' && i.fulfillment === 'IOU').map(i => ({
                id: `IOU_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
                productId: i.productId, name: i.name, qty: i.qty, unit: i.unit,
                date: new Date().toISOString(), agentName: agentFallback
            }));
            const fulfilledIOUIds = finalCart.filter(i => i.isIouFulfillment).map(i => i.iouId);
            
            if (selectedCustomerInfo && (generatedIOUs.length > 0 || fulfilledIOUIds.length > 0)) {
                const userId = user?.uid || user?.id || 'default';
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

            if (navigator.onLine && !isReturMode && !finalCart.some(i => i.isIouFulfillment)) {
                try {
                    const userId = user?.uid || user?.id || 'default';
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
                                const isMatch = (t.customerName || t.customer || '').trim().toLowerCase() === finalCust.toLowerCase();
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

            setReceiptData({
                customer: finalCust, method: displayMethod, items: finalCart, total: finalTotal,
                date: new Date().toLocaleString('id-ID'), agentName: agentFallback 
            });

            window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));

            setCart([]); setCustomerName(""); setLockedTier(null); setSelectedCustomerInfo(null);
            setGpsStatus('idle'); setAgentLocation(null); setTxProofPhoto(null); 
            setIsReturMode(false); setManualOverride(false); setReturType('EXCHANGE');
            setNooForm({ phone: '', address: '', requestedTier: defaultNooTier, photoUrl: null });
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
            setTimeout(() => setMerchantMood("idle"), 3000);
        } catch (error) { alert("Transaction Failed! Please try again."); } 
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
    const DRAWER_CLOSED = 52;
    const gripRef = useRef(null);
    const dragRef = useRef(null);
    const ghostUntilRef = useRef(0);

    const drawerSnaps = () => [DRAWER_CLOSED, Math.round(window.innerHeight * 0.55), Math.round(window.innerHeight * 0.92)];

    useEffect(() => {
        const swallowGhostClick = (e) => {
            if (Date.now() < ghostUntilRef.current) { e.stopPropagation(); e.preventDefault(); }
        };
        document.addEventListener('click', swallowGhostClick, true);
        return () => document.removeEventListener('click', swallowGhostClick, true);
    }, []);

    const startDrawerDrag = (e) => {
        if (dragRef.current) return;
        dragRef.current = { startY: e.clientY, startH: drawerH, moved: false };
        setIsDragging(true);

        const onMove = (ev) => {
            const d = dragRef.current;
            if (!d) return;
            if (!gripRef.current || !gripRef.current.isConnected) return onEnd();
            if (Math.abs(ev.clientY - d.startY) > 4) d.moved = true;
            const max = window.innerHeight * 0.92;
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

    const renderManifestUI = (isMobile) => (
        <div className={`kpm-parchment text-[#2a231d] shadow-2xl relative flex flex-col border-[#a89070] ${isMobile ? 'flex-1 border-t-2' : 'w-80 border-l-2'} shrink-0`}>
            {/* grain now comes from .kpm-parchment */}
            <div className="p-3 md:p-4 border-b-2 border-dashed border-[#a89070] relative z-10 text-center uppercase font-bold tracking-widest text-[#3e3226]">Manifest</div>
            
            <div className="p-3 md:p-4 relative z-[60] border-b border-[#a89070] bg-[#dfd5bc] space-y-3 md:space-y-4 manifest-dropdown-area">
                {showCustomerDropdown && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] manifest-dropdown-area transition-all duration-300" onClick={() => setShowCustomerDropdown(false)}></div>
                )}

                {/* --- 🚀 DUAL MODE TOGGLE (SALE VS RETUR) --- */}
                <div className="flex bg-[#1a1815] rounded border border-[#5c4b3a] p-1 mb-2">
                    <button onClick={() => { setIsReturMode(false); setReturType('EXCHANGE'); }} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-all ${!isReturMode ? 'bg-[#d4af37] text-[#2b2318] shadow-md' : 'text-[#8b7256] hover:text-white'}`}>Sale Mode</button>
                    <button onClick={() => {
                        if (!allowRetur) return alert("You do not have clearance to process returns.");
                        setIsReturMode(true);
                    }} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-all ${isReturMode ? 'bg-red-600 text-white shadow-md' : 'text-[#8b7256] hover:text-white'}`}>Retur Mode</button>
                </div>

                {/* --- 🚀 SUB MODE TOGGLE (BUYBACK VS EXCHANGE) --- */}
                {isReturMode && (
                    <div className="flex bg-[#2a2520] rounded border border-[#5c4b3a] p-1 mb-2 shadow-inner">
                        <button onClick={() => setReturType('BUYBACK')} className={`flex-1 py-1 text-[11px] font-bold uppercase tracking-widest rounded transition-all ${returType === 'BUYBACK' ? 'bg-orange-600 text-white shadow-md' : 'text-[#8b7256] hover:text-white'}`}>💵 Buyback (Refund)</button>
                        <button onClick={() => setReturType('EXCHANGE')} className={`flex-1 py-1 text-[11px] font-bold uppercase tracking-widest rounded transition-all ${returType === 'EXCHANGE' ? 'bg-[#c9a227] text-[#2b2318] shadow-md' : 'text-[#8b7256] hover:text-white'}`}>🔄 Exchange (Tukar)</button>
                    </div>
                )}

                {/* --- 🚀 TEAMWORK IOU BANNER --- */}
                {selectedCustomerInfo?.pendingIOUs?.length > 0 && !isReturMode && (
                    <div className="bg-[#2b2417] border-2 border-[#d4af37] p-3 rounded mb-3 shadow-[0_0_15px_rgba(212,175,55,0.28)] animate-fade-in-up">
                        <h4 className="text-[#d4af37] font-black uppercase text-[10px] flex items-center gap-1 mb-2"><AlertCircle size={14}/> IOU Pending Fulfillment</h4>
                        {selectedCustomerInfo.pendingIOUs.map((iou, i) => {
                            const isAlreadyInCart = cart.some(ci => ci.iouId === iou.id);
                            return (
                                <div key={i} className="flex justify-between items-center text-[11px] text-[#d4c5a3] mb-1 border-b border-[#5c4b3a] pb-1">
                                    <span>{iou.qty} {iou.unit} {iou.name} <br/><span className="text-[#8b7256] font-mono">By: {iou.agentName} | {new Date(iou.date).toLocaleDateString()}</span></span>
                                    {!isAlreadyInCart ? (
                                        <button onClick={() => handleFulfillIOU(iou)} className="bg-[#c9a227] hover:bg-[#d4af37] text-[#2b2318] px-2 py-1 rounded font-bold uppercase transition-colors">Fulfill</button>
                                    ) : (
                                        /* palette law: "done" is never a hue. Gold plate + tick, same as everywhere else. */
                                        <span className="text-[#d4af37] font-bold uppercase px-2 py-1 border border-[#d4af37]/50 rounded bg-[#d4af37]/10"><Check size={10} className="inline mr-1"/> Added</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {debtInfo && debtInfo.status === 'RED' && (
                        <div className="bg-[#5c4b3a] border-2 border-red-500/80 p-3 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse rounded-sm relative z-[65] mb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="text-red-500 shrink-0" size={16}/>
                                <h4 className="text-red-500 font-black uppercase tracking-widest text-[10px]">Warning: Jatuh Tempo!</h4>
                            </div>
                            <p className="text-[#d4c5a3] text-[11px] leading-relaxed uppercase tracking-widest mt-1">
                                {customerName} OWES <span className="font-bold text-white text-[10px]">Rp {new Intl.NumberFormat('id-ID').format(debtInfo.totalDebt)}</span> FROM {debtInfo.ageDays} DAYS AGO.
                            </p>
                            <div className="text-white bg-red-600 px-1.5 py-0.5 mt-2 inline-block text-[11px] uppercase tracking-widest font-black shadow-md">Collect payment before issuing new Titip!</div>
                        </div>
                    )}

                    <div className={`relative transition-all duration-300 ${showCustomerDropdown ? 'z-[80] scale-[1.02]' : ''}`}>
                        <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 transition-colors ${showCustomerDropdown ? 'text-white drop-shadow-md' : 'text-[#8b7256]'}`}>Customer Name</label>
                        <div className="relative">
                            <input 
                                value={customerName} 
                                onFocus={() => setShowCustomerDropdown(true)}
                                onChange={handleManualCustomerType} 
                                placeholder="TYPE OR SELECT..." 
                                className={`w-full bg-[#f5e6c8] text-[#3e3226] p-2 pr-12 text-xs md:text-sm font-black uppercase outline-none rounded transition-all ${showCustomerDropdown ? 'border-2 border-[#ff9d00] shadow-[0_0_20px_rgba(255,157,0,0.5)]' : 'border border-[#a89070]'}`} 
                            />
                            {customerName.length > 0 && (
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCustomerName(""); setSelectedCustomerInfo(null); setLockedTier(null); setGpsStatus('idle'); setShowCustomerDropdown(true); setManualOverride(true); }} className={`absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-lg shadow-md active:scale-90 transition-all z-[90] ${showCustomerDropdown ? 'opacity-100' : 'opacity-80'}`}><X size={16} strokeWidth={3}/></button>
                            )}
                        </div>
                        
                        <div className="mt-2 min-h-[20px]">
                            {selectedCustomerInfo && !selectedCustomerInfo.isNooRegistration ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
                                        {gpsStatus === 'checking' && (
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-[#ff9d00] animate-pulse flex items-center gap-1"><MapPin size={12}/> Acquiring Satellites...</span>
                                                <button onClick={() => verifyLocation(true)} className="text-[#ff9d00] hover:text-white underline text-[11px] ml-2">PC Fast Scan</button>
                                            </div>
                                        )}
                                        
                                        {gpsStatus === 'verified' && <span className="text-[#d4af37] flex items-center gap-1 shadow-[0_0_10px_rgba(212,175,55,0.3)]"><MapPin size={12}/> Geofence Secured: In Range ({distanceToStore}m)</span>}
                                        
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
                                                            <span className="text-[11px] text-[#ff9d00] font-bold uppercase animate-pulse">Uploading Proof...</span>
                                                        ) : bypassState.status === 'pending' ? (
                                                            <span className="text-[11px] text-yellow-400 font-bold uppercase animate-pulse bg-yellow-900/20 px-2 py-1 rounded border border-yellow-500/50 inline-block w-fit">Awaiting HQ Approval...</span>
                                                        ) : null}
                                                        <input type="file" accept="image/*" capture="environment" id="bypassPhotoCapture" className="hidden" onChange={handleBypassPhotoCapture} />
                                                    </div>
                                                )}
                                                {!canOverrideGps && distanceToStore > 100 && (
                                                    <span className="text-[11px] text-[#8b7256] font-bold uppercase mt-1">Distance &gt; 100m. Bypass Unavailable.</span>
                                                )}
                                            </div>
                                        )}
                                        
                                        {gpsStatus === 'bypass' && <span className="text-orange-400 flex items-center gap-1"><MapPin size={12}/> Unmapped Store (Bypass Allowed)</span>}
                                        {gpsStatus === 'error' && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={12}/> GPS Signal Lost</span>}
                                    </div>
                                    
                                    {(!canOverrideGps && !hasClearance(user?.userRole || user?.role, 'can_unrestricted_sample') && !['verified', 'bypass', 'walk_in'].includes(gpsStatus)) ? (
                                        <button disabled className="w-full mt-1 bg-[#1a1815] border border-[#3e3226] text-[#8b7256] text-[10px] font-bold uppercase tracking-widest p-2 rounded shadow-inner flex items-center justify-center gap-2 cursor-not-allowed">
                                            <Lock size={12}/> Sample Locked (Requires GPS)
                                        </button>
                                    ) : (
                                        <button onClick={() => setShowSampleModal(true)} className="w-full mt-1 bg-[#1a1815] border border-[#ff9d00]/50 hover:bg-[#ff9d00] text-[#ff9d00] hover:text-black text-[10px] font-bold uppercase tracking-widest p-2 rounded shadow-md flex items-center justify-center gap-2 transition-colors active:scale-95">
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
                                    <button onClick={() => setShowNooModal(true)} className="bg-[#3e3226] hover:bg-[#5c4b3a] text-[#ff9d00] text-[10px] font-bold uppercase tracking-widest p-2 rounded shadow-md flex items-center justify-center gap-2 transition-colors">
                                        <Store size={12}/> Register Outlet to Unlock Tiers
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        {showCustomerDropdown && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-[#f5e6c8] border-2 border-[#a89070] shadow-xl rounded z-[100] max-h-48 overflow-y-auto">
                                {suggestedCustomers.map(c => (
                                    <div key={c.id} onClick={() => handleCustomerSelect(c)} className="p-2 text-xs font-bold border-b border-[#a89070]/30 hover:bg-[#8b7256] hover:text-white cursor-pointer flex justify-between uppercase">
                                        <span>{c.name}</span><span className="opacity-50 text-[11px]">PROFILED</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                <div>
                    <label className="text-[10px] font-bold uppercase text-[#8b7256] block mb-1">Payment Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={isReturMode} className={`w-full bg-[#f5e6c8] border border-[#a89070] text-[#3e3226] p-2 text-xs md:text-sm font-bold uppercase outline-none rounded ${isReturMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {allowedPayments.map(method => ( <option key={method} value={method}>{method === 'Titip' ? 'Consignment' : method}</option> ))}
                    </select>
                </div>

                {paymentMethod === 'Titip' && !isReturMode && (
                    <div className="mt-3 bg-[#3e3226] border border-[#ff9d00]/50 p-3 rounded shadow-inner animate-fade-in">
                        <label className="text-[10px] font-bold text-[#d4c5a3] mb-2 flex items-center justify-between uppercase tracking-widest">
                            <span>Jatuh Tempo (Due Date)</span>
                            <span className="bg-[#ff9d00] text-black px-2 py-0.5 rounded shadow-sm text-[10px]">{tempoDays} Hari</span>
                        </label>
                        <div className="flex items-center gap-3">
                            <input type="range" min="1" max="60" value={tempoDays} onChange={(e) => setTempoDays(parseInt(e.target.value))} className="w-full accent-[#ff9d00] h-1.5 bg-[#1a1815] rounded-lg appearance-none cursor-pointer" />
                            <input type="number" min="1" max="60" value={tempoDays} onChange={(e) => setTempoDays(parseInt(e.target.value))} className="w-12 bg-[#1a1815] border border-[#5c4b3a] rounded p-1 text-center text-[#ff9d00] text-xs font-bold focus:outline-none focus:border-[#ff9d00]"/>
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
                            <p className="text-[10px] text-[#5c4b3a] mt-0.5 leading-tight font-bold">
                                <strong className="text-[#3e3226]">Rp {new Intl.NumberFormat('id-ID').format(selectedCustomerDebts.totalDebt)}</strong> Unpaid.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 md:p-3 relative z-10 space-y-2 custom-scrollbar bg-[#dfd5bc]/50">
                {cart.length === 0 ? (
                    <div className="text-center opacity-50 mt-8 font-bold uppercase text-xs md:text-sm">Manifest Empty</div>
                ) : (
                    cart.map((item, idx) => {
                        const mergedTiers = new Set(allowedTiers);
                        if (lockedTier) mergedTiers.add(lockedTier);
                        return (
                        <div key={idx} className={`kpm-row-in flex flex-col border-b-2 border-dashed border-[#a89070]/30 p-3 md:p-4 mb-1 rounded border shadow-sm ${isReturMode ? (returType === 'EXCHANGE' ? 'bg-[#f0e2c0] border-[#c9a227]' : 'bg-[#f2ddd6] border-[#9e4038]') : 'bg-[#f5e6c8] border-[#a89070]/50'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] md:text-xs font-black w-40 leading-tight uppercase break-words whitespace-normal ${isReturMode ? (returType === 'EXCHANGE' ? 'text-[#6b4d0f]' : 'text-red-900') : 'text-[#3e3226]'}`}>
                                    {item.name} {isReturMode && (returType === 'EXCHANGE' ? '(TUKAR GANTI)' : '(BUYBACK)')}
                                    {item.isIouFulfillment && ' (FULFILLING IOU)'}
                                </span>
                                <button onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} className={`p-1 rounded ${isReturMode ? (returType === 'EXCHANGE' ? 'bg-[#e6d3a3] text-[#6b4d0f] hover:text-red-700' : 'text-red-800 hover:text-red-600 bg-red-200') : 'text-red-800 bg-red-100 hover:text-red-600'}`}><X size={14}/></button>
                            </div>
                            {/* the four boxes: type what the customer said, in their words */}
                            {!item.isIouFulfillment && (
                                <div className="flex items-center gap-1 flex-wrap mb-2">
                                    {['Karton', 'Bal', 'Slop', 'Bks'].map(u => (
                                        <span key={u} className="flex items-center gap-1 border border-[#a89070] bg-[#f7f0e0] px-1.5 py-1 rounded">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={(item.mix && item.mix[u]) || ''}
                                                onChange={(e) => applyMix(item, u, e.target.value)}
                                                placeholder="–"
                                                aria-label={`${item.name} ${u}`}
                                                className="w-8 bg-transparent text-center text-[#2b2318] font-black text-sm outline-none"
                                            />
                                            <em className="not-italic text-[8px] font-black uppercase tracking-widest text-[#6b5a3c]">{u}</em>
                                        </span>
                                    ))}
                                    <span className="text-[10px] font-black font-mono text-[#a35a00] ml-1">
                                        = {new Intl.NumberFormat('id-ID').format(item.qty || 0)} Bks
                                    </span>
                                    {/* The rates this line is actually using. Packing is per product and set in
                                        the master vault, and when it is wrong the only symptom is a total that
                                        looks plausible — 1.011 instead of 511. Printing the rates turns that
                                        into something a salesman can see without opening anything. */}
                                    {(() => {
                                        const per = bksPerUnit(item.product);
                                        return (
                                            <span className="w-full text-[9px] font-mono text-[#6b5a3c] tracking-wide">
                                                1 KARTON = {per.Karton} &middot; 1 BAL = {per.Bal} &middot; 1 SLOP = {per.Slop} BKS
                                            </span>
                                        );
                                    })()}
                                </div>
                            )}
                            <div className={`flex items-center gap-1 md:gap-2 p-1 rounded border ${isReturMode ? (returType === 'EXCHANGE' ? 'bg-[#e6d3a3]/60 border-[#c9a227]' : 'bg-red-200/50 border-red-300') : 'bg-[#dfd5bc] border-[#a89070]/30'}`}>
                                <input type="number" value={item.qty} disabled={item.isIouFulfillment} onChange={(e) => updateCartItem(item.productId, 'qty', e.target.value === '' ? '' : parseInt(e.target.value))} onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) updateCartItem(item.productId, 'qty', 1); }} className={`w-20 md:w-24 bg-white border border-[#a89070] text-center text-xs md:text-sm font-bold tabular-nums outline-none focus:border-[#ff9d00] rounded p-1 text-[#3e3226] ${item.isIouFulfillment ? 'opacity-50' : ''}`} />
                                {/* 🚀 Phase 8: unit + price-tier directly change how much money is charged —
                                    bumped to text-sm specifically, not just the general 11px pass, since
                                    these two decide the price, not just describe something. */}
                                <select value={item.unit} disabled={item.isIouFulfillment} onChange={(e) => updateCartItem(item.productId, 'unit', e.target.value)} className={`bg-transparent text-sm font-bold uppercase outline-none text-[#3e3226] border-r border-[#a89070]/30 pr-1 md:pr-2 ${item.isIouFulfillment ? 'opacity-50' : ''}`}><option>Bks</option><option>Slop</option><option>Bal</option><option>Karton</option></select>
                                <select value={item.priceTier} onChange={(e) => updateCartItem(item.productId, 'priceTier', e.target.value)} disabled={!!lockedTier || item.isIouFulfillment} className={`bg-transparent text-sm font-bold uppercase outline-none text-[#3e3226] pl-1 ${lockedTier || item.isIouFulfillment ? 'opacity-50 cursor-not-allowed text-red-700' : ''}`}>
                                    {Array.from(mergedTiers).map(tier => ( <option key={tier} value={tier}>{tier}</option> ))}
                                </select>
                            </div>

                            {/* 🚀 ITEM-LEVEL FORENSIC TAGGING (RETUR ONLY) */}
                            {isReturMode && !item.isIouFulfillment && (
                                <div className={`mt-2 pt-2 border-t flex flex-col gap-2 ${returType === 'EXCHANGE' ? 'border-[#c9a227]/50' : 'border-red-300/50'}`}>
                                    <div className="flex gap-2">
                                        <select 
                                            value={item.condition || 'GOOD'} 
                                            onChange={(e) => updateCartItem(item.productId, 'condition', e.target.value)}
                                            className={`text-[11px] font-bold uppercase p-1.5 rounded outline-none border flex-1 ${item.condition === 'DAMAGED' ? 'bg-red-900/30 border-red-500 text-red-700' : 'bg-[#f0e2c0] border-[#a89070] text-[#3e3226]'}`}
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
                                            <button onClick={() => updateCartItem(item.productId, 'fulfillment', 'NOW')} className={`flex-1 py-1.5 text-[11px] font-bold uppercase rounded border transition-all ${item.fulfillment !== 'IOU' ? 'bg-[#d4af37] border-[#c9a227] text-[#2b2318] shadow-md' : 'bg-black/20 border-[#a89070]/50 text-[#8b7256] hover:text-white'}`}>Give Replacement Now</button>
                                            <button onClick={() => updateCartItem(item.productId, 'fulfillment', 'IOU')} className={`flex-1 py-1.5 text-[11px] font-bold uppercase rounded border transition-all ${item.fulfillment === 'IOU' ? 'bg-[#8a6a2f] border-[#a3822f] text-white shadow-md' : 'bg-black/20 border-[#a89070]/50 text-[#8b7256] hover:text-white'}`}>Hutang Barang (IOU)</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="text-right text-base md:text-lg font-black font-mono mt-2 text-[#5c4b3a]">
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
        <div className="flex h-full w-full bg-[#1a1815] text-[#d4c5a3] font-serif overflow-hidden relative border-4 border-[#3e3226] shadow-2xl">
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
                            flex flex-col border-[#3e3226] bg-[#0f0e0d] shrink-0
                            ${isDragging ? '' : 'transition-[height] duration-[340ms] ease-[cubic-bezier(.33,.78,.22,1)]'}`}
            >
                {/* THE ALCOVE — desktop only. On a phone he still only visits, via
                    CapybaraMascot on a committed deal; a phone screen has no room to give
                    him. A desk does, so here he lives in the ledger column: idling while
                    you shop, talking when he has something to say, holding the coin on a
                    deal. Everything but the sprite is CSS, so it costs one image. */}
                <div className="kpm-alcove hidden lg:grid shrink-0" aria-hidden="true">
                    <div className="rock"></div>
                    <div className="kpm-torch l">
                        <div className="pole"></div><div className="bowl"></div>
                        <div className="kpm-flame"><i className="o"></i><i className="m"></i><i className="c"></i></div>
                    </div>
                    <div className="kpm-torch r">
                        <div className="pole"></div><div className="bowl"></div>
                        <div className="kpm-flame"><i className="o"></i><i className="m"></i><i className="c"></i></div>
                    </div>
                    <div className="cast"></div>
                    {/* the two shadows are the SAME sprite, flattened - no extra download */}
                    <div className={`fig sh a kpm-merch ${merchSprite}`}></div>
                    <div className={`fig sh b kpm-merch ${merchSprite}`}></div>
                    <div className="floor"></div>
                    <div className={`fig kpm-merch ${merchSprite}`}>
                        {merchantMood === 'deal' && <span className="kpm-merch-hold"></span>}
                    </div>
                    <div className="dark"></div>
                </div>

                {/* The grip. Collapsed it is the whole drawer, so it carries the running
                    total, the item count and the LAST ITEM ADDED - that last one is what
                    removes the need to open the manifest just to check it went in. */}
                <div
                    onPointerDown={startDrawerDrag}
                    style={{ touchAction: 'none' }}
                    className="lg:hidden h-[52px] shrink-0 px-4 flex items-center gap-3 cursor-grab active:cursor-grabbing select-none bg-[#26211c] border-b border-[#3e3226]"
                >
                    <div className="w-10 h-1.5 rounded-full bg-[#5c4b3a] shrink-0"></div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#8b7256] leading-none">
                            Manifest ({cart.length})
                        </div>
                        <div className="text-[10px] font-mono text-[#5c4b3a] truncate leading-tight mt-0.5">
                            {cart.length ? cart[cart.length - 1].name : 'Empty — tap a ware to add'}
                        </div>
                    </div>
                    <span className={`text-lg font-black font-mono leading-none shrink-0 ${isReturMode && returType === 'BUYBACK' ? 'text-red-500' : 'text-[#ff9d00]'}`}>
                        {isReturMode && returType === 'BUYBACK' ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(cartTotal)}
                    </span>
                    <ChevronDown size={18} className={`shrink-0 text-[#8b7256] transition-transform ${drawerH > DRAWER_CLOSED + 8 ? '' : 'rotate-180'}`} />
                </div>

                {/* Rendered at EVERY width now. It used to be lg:hidden with a second copy
                    further down for desktop, which meant two manifests in the DOM, duplicate
                    element ids, and - once the drawer became this column - a third column that
                    did not fit beside the app's sidebar. One manifest, one column. */}
                <div className="flex-1 overflow-hidden flex flex-col">{renderManifestUI(true)}</div>

                <div className="p-4 md:p-6 bg-[#26211c] border-t-4 border-[#5c4b3a] flex flex-col shrink-0 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
                    
                    <div className="mb-4">
                        <label className="text-[10px] font-bold text-[#8b7256] uppercase tracking-widest block mb-2">Delivery Proof <span className="text-red-500">*</span></label>
                        <input type="file" accept="image/*" capture="environment" id="txProof" className="hidden" onChange={handleTxPhotoCapture} />
                        
                        {txProofPhoto ? (
                            <div className="relative rounded-lg border-2 border-[#ff9d00] overflow-hidden shadow-[0_0_15px_rgba(255,157,0,0.3)] bg-black">
                                <img src={txProofPhoto} alt="Proof" className="w-full h-32 object-contain opacity-90" />
                                <button onClick={() => setTxProofPhoto(null)} className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-md shadow-md"><X size={14}/></button>
                            </div>
                        ) : (
                            <button onClick={() => document.getElementById('txProof').click()} className="w-full py-4 border-2 border-dashed border-[#5c4b3a] hover:border-[#ff9d00] text-[#8b7256] hover:text-[#ff9d00] bg-black/40 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors">
                                <Camera size={24} />
                                <span className="text-[10px] uppercase tracking-widest font-bold">Capture Handover Photo</span>
                            </button>
                        )}
                    </div>

                    <div className="flex justify-between items-end mb-3 md:mb-4 border-b border-[#5c4b3a] pb-2 md:pb-3 font-mono">
                        <span className="text-xs md:text-sm font-bold text-[#8b7256] uppercase tracking-widest">Total Value</span>
                        <span className={`text-2xl md:text-3xl lg:text-4xl font-black leading-none drop-shadow-sm ${isReturMode && returType === 'BUYBACK' ? 'text-red-500' : 'text-[#ff9d00]'}`}>
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

                    <button
                        onClick={handleFinalDeal}
                        disabled={!canSubmitSale || isProcessingSale}
                        className={`py-3 md:py-4 border-2 text-lg md:text-xl lg:text-2xl font-black uppercase tracking-[0.2em] transition-all active:translate-y-1 shadow-lg rounded flex items-center justify-center gap-2 md:gap-3 ${canSubmitSale && !isProcessingSale ? (isReturMode ? (returType === 'EXCHANGE' ? 'bg-gradient-to-r from-[#c9a227] to-[#8a6a2f] border-[#d4af37] text-[#2b2318] hover:from-[#d4af37] hover:to-[#a3822f] shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'bg-gradient-to-r from-red-600 to-red-800 border-red-500 text-white hover:from-red-500 hover:to-red-700 shadow-[0_0_20px_rgba(220,38,38,0.4)]') : 'bg-gradient-to-r from-[#ff9d00] to-[#c47f00] border-[#ffca28] text-black hover:from-[#ffca28] hover:to-[#ff9d00]') : 'bg-[#1a1815] text-[#5c4b3a] border-[#3e3226] opacity-50 cursor-not-allowed'}`}
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
                bottom padding is the collapsed drawer's 52px, so the last ware clears it. */}
            <div className="hide-on-print flex-1 flex flex-col h-full lg:h-auto bg-[#161412] pb-[52px] lg:pb-0 overflow-hidden">
                <div className="flex gap-2 p-2 md:p-3 bg-black border-b border-[#3e3226] overflow-x-auto scrollbar-hide shrink-0">
                    {categories.map(cat => ( <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 md:px-5 md:py-2.5 text-[10px] md:text-xs font-black uppercase whitespace-nowrap transition-all rounded-lg border-2 ${activeCategory === cat ? 'bg-[#8b7256] text-black border-[#ff9d00]' : 'bg-[#26211c] text-[#6b5845] border-[#3e3226] hover:border-[#8b7256]'}`}>{cat}</button> ))}
                </div>
                {/* The examine shelf. Desktop only — a phone screen has no room to spend on a
                    thing you watch rather than press, and the eye button covers it there.
                    One state write per hover, not per frame. */}
                <div className="hidden lg:flex items-center justify-center gap-6 px-4 py-3 border-b border-[#3e3226] bg-[#0f0e0d] shrink-0" style={{ perspective: '520px' }}>
                    <div className="kpm-bigcube">
                        <i className="f grid place-items-center overflow-hidden">
                            {examineItem?.images?.front
                                ? <img src={examineItem.images.front} className="max-h-full max-w-full object-contain" alt={examineItem.name}/>
                                : <span className="text-[9px] font-black font-mono tracking-widest text-[#ff9d00]">EXAMINE</span>}
                        </i>
                        <i className="bk"></i><i className="l"></i><i className="r"></i>
                        <i className="t"></i><i className="bt"></i>
                    </div>
                    <p className="m-0 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8b7256] leading-relaxed">
                        {examineItem
                            ? <>{examineItem.name}<br/><span className="text-[#5c4b3a]">{examineItem.type || 'MISC'} &middot; {examineItem.stock} Bks in vehicle</span></>
                            : 'Hover any ware to turn it here'}
                    </p>
                </div>
                <div className="p-2 md:p-3 border-b border-[#3e3226] flex gap-3 shrink-0 bg-[#0f0e0d] items-center relative z-10">
                    <div className="relative flex-1">
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SEARCH WARES..." className="w-full bg-black/60 border-2 border-[#3e3226] p-2 md:p-3 pl-9 md:pl-10 text-[#ff9d00] font-mono text-xs md:text-sm font-bold outline-none focus:border-[#ff9d00] rounded-lg shadow-inner transition-colors"/>
                        <Search size={16} className="absolute left-3 top-2.5 md:top-3.5 text-[#8b7256]"/>
                    </div>
                    <div className="hidden lg:flex gap-1">
                        <button onClick={() => scroll('left')} className="p-3 bg-[#26211c] border-2 border-[#3e3226] text-[#8b7256] hover:text-[#ff9d00] hover:border-[#ff9d00] rounded-lg active:scale-95 transition-all shadow-md"><ArrowLeft size={20}/></button>
                        <button onClick={() => scroll('right')} className="p-3 bg-[#26211c] border-2 border-[#3e3226] text-[#8b7256] hover:text-[#ff9d00] hover:border-[#ff9d00] rounded-lg active:scale-95 transition-all shadow-md"><ArrowRight size={20}/></button>
                    </div>
                </div>

                {/* DESKTOP: the wares stop being a sideways carousel and become a wrapping
                    grid at lg (1024px+). Below that nothing changes - the carousel is right on
                    a phone, where sideways swiping is natural and vertical space is scarce.
                    The file had NO xl or 2xl classes at all, so a 1920px screen was rendering
                    the 1024px layout and scrolling sideways through 260px cards. */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-4 lg:p-6 lg:pb-8 flex flex-col lg:grid lg:grid-cols-2 lg:content-start gap-3 lg:gap-6 scrollbar-hide items-stretch lg:items-start bg-[#1a1815] relative scroll-smooth" ref={scrollContainerRef}>
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 12px), repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 12px)' }}></div>
                    {filteredItems.map(item => (
                        <div key={item.id} onClick={() => addToCart(item)} onMouseEnter={() => setExamineItem(item)} onContextMenu={(e) => { e.preventDefault(); onInspect(item); }} className="product-card w-full lg:w-[260px] shrink-0 bg-[#0f0e0d] border-2 border-[#3e3226] hover:border-[#ff9d00] transition-all flex flex-row lg:flex-col group active:scale-[0.98] shadow-[0_10px_20px_rgba(0,0,0,0.3)] rounded-xl overflow-hidden relative z-10 h-max">
                            <div className="w-20 h-20 lg:w-auto lg:h-48 p-2 lg:p-5 flex items-center justify-center relative overflow-hidden bg-black/50 shrink-0">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#3e3226_0%,#000000_80%)] opacity-50"></div>
                                {/* The ware as a solid object, not a picture of one. Front face is the real
                                    photo, the other faces are tinted panels; it turns only while pointed at.
                                    Pure CSS on purpose — see the note above .kpm-cube in theme.css. */}
                                <div className="kpm-cube-stage w-14 h-16 lg:w-24 lg:h-32 relative">
                                    <div className="kpm-cube">
                                        <i className="f grid place-items-center overflow-hidden">
                                            {item.images?.front
                                                ? <img src={item.images.front} className="max-h-full max-w-full object-contain sepia-[.3] group-hover:sepia-0 transition-all duration-300" alt={item.name}/>
                                                : <Box size={28} className="text-[#3e3226] opacity-50"/>}
                                        </i>
                                        <i className="bk"></i>
                                        <i className="l"></i>
                                        <i className="r"></i>
                                    </div>
                                </div>
                                <div className="hidden lg:block absolute top-3 right-3 bg-black/80 text-[#8b7256] text-[10px] font-black px-2 py-1 rounded-full border border-[#3e3226] uppercase tracking-wider">
                                    {item.type || 'MISC'}
                                </div>
                                {/* Examine was reachable ONLY by right-click, which does not exist on a
                                    phone — so on the device most of these sales happen on, the 3D box
                                    could not be opened at all. Right-click still works. */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); unlockSounds().then(() => playSound('click')); onInspect(item); }}
                                    aria-label={`Examine ${item.name}`}
                                    className="kpm-press absolute bottom-1 left-1 lg:bottom-3 lg:left-3 z-20 p-1.5 rounded-full bg-black/80 border border-[#3e3226] text-[#8b7256] hover:text-[#ff9d00] hover:border-[#ff9d00] transition-colors"
                                >
                                    <Eye size={14}/>
                                </button>
                            </div>
                            <div className="flex-1 min-w-0 bg-gradient-to-b from-[#1a1815] to-[#0f0e0d] border-l-2 lg:border-l-0 lg:border-t-2 border-[#3e3226] p-2 lg:p-4 flex flex-row lg:flex-col items-center lg:items-stretch gap-2 lg:gap-0 font-mono relative">
                                <div className="flex-1 min-w-0 flex flex-col">
                                    <h4 className="text-[#d4c5a3] text-[12px] lg:text-sm font-black uppercase line-clamp-2 lg:mb-3 lg:h-[40px] leading-tight group-hover:text-white transition-colors">{item.name}</h4>
                                    <div className="mt-1 lg:mt-auto flex flex-row items-center gap-2 lg:gap-0 lg:justify-between lg:items-end w-full">
                                        <div className="flex flex-col gap-0.5 lg:gap-1">
                                            <span className="hidden lg:block text-[11px] text-[#5c4b3a] font-bold uppercase tracking-widest">In Stock</span>
                                            <span className={`text-[10px] lg:text-xs font-black px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-md border-2 inline-block ${item.stock > 0 ? 'bg-[#1a1815] text-[#8b7256] border-[#3e3226]' : 'bg-red-900/20 text-red-500 border-red-900/50'}`}>{item.stock > 0 ? `${item.stock} Units` : 'EMPTY'}</span>
                                        </div>
                                        <div className="text-left lg:text-right lg:w-auto lg:mt-0 lg:pt-0 lg:border-none">
                                            <span className="hidden lg:block text-[11px] text-[#5c4b3a] font-bold uppercase tracking-widest mb-1">Ecer Price</span>
                                            <span className="text-[15px] lg:text-2xl font-black text-[#ff9d00] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(item.priceEcer || 0)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Row steppers, mobile only. Desktop edits quantity in the
                                    manifest, which is on screen there anyway. */}
                                {(() => {
                                    const line = cart.find(c => c.productId === item.id);
                                    const qty = line?.qty || 0;
                                    return (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                disabled={!line}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!line) return;
                                                    // a tap on the way down, a distinct tone when the line is removed
                                                    unlockSounds().then(() => playSound(qty > 1 ? 'click' : 'error'));
                                                    qty > 1 ? updateCartItem(item.id, 'qty', qty - 1) : setCart(c => c.filter(i => i.productId !== item.id));
                                                }}
                                                className="kpm-press w-8 h-8 rounded-lg border-2 border-[#3e3226] bg-[#26211c] text-[#8b7256] text-lg font-black leading-none disabled:opacity-30 flex items-center justify-center"
                                            >−</button>
                                            <span className={`w-6 text-center text-sm font-black ${qty ? 'text-[#ff9d00]' : 'text-[#3e3226]'}`}>{qty}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); unlockSounds().then(() => playSound('click')); addToCart(item); }}
                                                className="kpm-press w-8 h-8 rounded-lg border-2 border-[#ff9d00] bg-[#3e3226] text-[#ff9d00] text-lg font-black leading-none flex items-center justify-center"
                                            >+</button>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* the duplicate desktop manifest lived here. Removed 2026-08-03: the drawer
                column above now carries the manifest at every width. Its removal also kills
                the duplicate `bypassPhotoCapture` element id that made
                document.getElementById always hit the mobile copy. */}

            {/* --- THE NOO REGISTRATION MODAL --- */}
            {showNooModal && (
                <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 font-sans backdrop-blur-md">
                    <div className="bg-[#1a1815] w-full max-w-lg border-2 border-orange-500/50 rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.2)] flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up">
                        <div className="p-5 border-b border-[#3e3226] bg-black/40 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wider"><Store size={20} className="text-orange-500"/> Outlet Registration</h2>
                                <p className="text-[10px] text-[#8b7256] uppercase tracking-widest mt-1">Unlock Requested Pricing Tiers</p>
                            </div>
                            <button onClick={() => setShowNooModal(false)} className="text-[#8b7256] hover:text-white"><X size={24}/></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
                            <div>
                                <label className="text-xs font-bold text-[#8b7256] uppercase tracking-widest block mb-1">Store Name</label>
                                <input value={customerName} disabled className="w-full bg-black border border-[#3e3226] text-[#d4c5a3] p-3 rounded font-bold uppercase opacity-70" />
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-[#8b7256] uppercase tracking-widest block mb-1">WhatsApp / Phone <span className="text-red-500">*</span></label>
                                <input value={nooForm.phone} onChange={e => setNooForm({...nooForm, phone: e.target.value})} placeholder="e.g. 081234567890" className="w-full bg-[#26211c] border border-[#5c4b3a] focus:border-orange-500 outline-none text-white p-3 rounded font-bold" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-[#8b7256] uppercase tracking-widest block mb-1">Requested Pricing Tier <span className="text-red-500">*</span></label>
                                <select value={nooForm.requestedTier} onChange={e => setNooForm({...nooForm, requestedTier: e.target.value})} className="w-full bg-[#26211c] border border-[#5c4b3a] focus:border-orange-500 outline-none text-white p-3 rounded font-bold uppercase">
                                    {allowedTiers.map(tier => ( <option key={tier} value={tier}>{tier}</option> ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-[#8b7256] uppercase tracking-widest block mb-2">Storefront Photo <span className="text-red-500">*</span></label>
                                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handlePhotoCapture} className="hidden" />
                                {nooForm.photoUrl ? (
                                    <div className="relative rounded-lg overflow-hidden border-2 border-orange-500 bg-black">
                                        <img src={nooForm.photoUrl} alt="Store Proof" className="w-full h-48 object-contain" />
                                        <button onClick={() => setNooForm({...nooForm, photoUrl: null, photoFile: null})} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <button onClick={() => fileInputRef.current.click()} className="w-full border-2 border-dashed border-[#5c4b3a] hover:border-orange-500 bg-[#26211c]/50 hover:bg-[#26211c] text-[#8b7256] hover:text-orange-400 transition-colors py-8 rounded-lg flex flex-col items-center justify-center gap-2">
                                        <Camera size={32} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Capture Live Photo</span>
                                        <span className="text-[11px] opacity-60">(Live Camera Only - Gallery Disabled)</span>
                                    </button>
                                )}
                            </div>
                            
                            <div className="bg-black/30 p-3 rounded border border-[#3e3226] flex justify-between items-center gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[#3e3226] text-[#ff9d00] rounded-full"><Map size={16}/></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-[#8b7256] uppercase tracking-widest">Location Tracking</p>
                                        <p className="text-xs text-[#ff9d00] font-mono">{agentLocation ? `${agentLocation.latitude.toFixed(5)}, ${agentLocation.longitude.toFixed(5)}` : 'Awaiting GPS Lock...'}</p>
                                    </div>
                                </div>
                                {!agentLocation && (
                                    <button onClick={() => verifyLocation(true)} className="text-[11px] bg-[#26211c] hover:bg-[#3e3226] text-[#d4c5a3] border border-[#5c4b3a] px-3 py-1.5 rounded uppercase font-bold transition-colors shadow-md">
                                        Force GPS Lock
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-5 border-t border-[#3e3226] bg-black/40 flex flex-col gap-3">
                            <button onClick={submitNooRegistration} disabled={!agentLocation} className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.1em] transition-all shadow-lg flex items-center justify-center gap-2 ${agentLocation ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-[#26211c] text-[#8b7256] cursor-not-allowed'}`}>
                                {agentLocation ? 'Save & Proceed to Sale' : 'Acquiring Satellites...'}
                            </button>
                            <button onClick={submitNooOnly} disabled={!agentLocation} className={`w-full py-3 rounded-xl font-black uppercase tracking-[0.1em] transition-all border-2 flex items-center justify-center gap-2 ${agentLocation ? 'bg-[#26211c] border-[#5c4b3a] hover:border-[#d4af37] hover:text-[#d4af37] text-[#d4c5a3]' : 'bg-[#26211c] border-[#3e3226] text-[#8b7256] cursor-not-allowed'}`}>
                                Register Only (No Sale)
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* --- SAMPLING DEPLOYMENT MODAL --- */}
            {showSampleModal && (
                <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 font-sans backdrop-blur-md">
                    <div className="bg-[#1a1815] w-full max-w-md border-2 border-[#d4af37]/50 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.2)] flex flex-col animate-fade-in-up">
                        <div className="p-5 border-b border-[#3e3226] bg-black/40 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wider"><Package size={20} className="text-[#d4af37]"/> Deploy Marketing Sample</h2>
                                <p className="text-[10px] text-[#8b7256] uppercase tracking-widest mt-1">Target: {customerName}</p>
                            </div>
                            <button onClick={() => setShowSampleModal(false)} className="text-[#8b7256] hover:text-white"><X size={24}/></button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-[#8b7256] uppercase tracking-widest block mb-1">Select Product</label>
                                <select value={sampleForm.productId} onChange={e => setSampleForm({...sampleForm, productId: e.target.value})} className="w-full bg-[#26211c] border border-[#5c4b3a] focus:border-[#d4af37] outline-none text-white p-3 rounded font-bold">
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

                            <div className="grid grid-cols-2 gap-4 bg-[#26211c]/50 p-3 rounded-xl border border-[#3e3226]">
                                <div>
                                    <label className="text-[10px] font-bold text-[#8b7256] uppercase tracking-widest mb-1 block text-center">Bungkus</label>
                                    <input type="number" min="0" placeholder="0" value={sampleForm.qtyBks === 0 ? '' : sampleForm.qtyBks} onChange={e=>setSampleForm({...sampleForm, qtyBks: parseInt(e.target.value)||0})} className="w-full p-2 border rounded bg-[#1a1815] border-[#5c4b3a] text-white text-center font-bold text-lg focus:border-[#d4af37] outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#8b7256] uppercase tracking-widest mb-1 block text-center">
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
                                        className="w-full p-2 border rounded bg-[#1a1815] border-[#5c4b3a] text-[#d4af37] text-center font-bold text-lg focus:border-[#d4af37] outline-none" 
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-[#d4af37]/10 p-3 rounded border border-[#d4af37]/30 text-[#d4af37] text-[10px] uppercase tracking-widest font-bold flex items-start gap-2">
                                <AlertCircle size={14} className="shrink-0 mt-0.5"/>
                                <p>Warning: You must collect the Pita Cukai for every open pack. This will be demanded during EOD Setoran.</p>
                            </div>
                        </div>

                        <div className="p-5 border-t border-[#3e3226] bg-black/40">
                            <button onClick={handleDeploySample} disabled={!sampleForm.productId || isProcessingSale || (sampleForm.qtyBks === 0 && sampleForm.qtyBatang === 0)} className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.1em] transition-all shadow-lg flex items-center justify-center gap-2 ${sampleForm.productId && (sampleForm.qtyBks > 0 || sampleForm.qtyBatang > 0) && !isProcessingSale ? 'bg-[#c9a227] hover:bg-[#d4af37] text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-[#26211c] text-[#8b7256] cursor-not-allowed'}`}>
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
                    <div className="print-modal-wrapper fixed inset-0 z-[400] bg-black/90 flex items-center justify-center p-4">
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
        
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #8b7256; border-radius: 2px; } .custom-scrollbar::-webkit-scrollbar-track { background: #26211c; } .scrollbar-hide::-webkit-scrollbar { display: none; } @keyframes pulse { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; } } .animate-pulse { animation: pulse 2s infinite ease-in-out; } .animate-fade-in { animation: fadeIn 0.2s ease-out; } .animate-fade-in-up { animation: fadeInUp 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
};

export default MerchantSalesView;