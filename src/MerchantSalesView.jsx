import React, { useState, useEffect, useRef } from 'react';
import { Search, Box, Zap, X, DollarSign, ShoppingBag, List, User, ChevronDown, Printer, MessageSquare, ArrowRight, ArrowLeft, MapPin, AlertCircle, Camera, Store, Map } from 'lucide-react';

const MerchantSalesView = ({ inventory, user, onProcessSale, onInspect, appSettings, customers = [], allowedPayments = ['Cash'], allowedTiers = ['Retail', 'Ecer'], transactions = [] }) => {
    const [mobileTab, setMobileTab] = useState('products');
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState([]);
    const [activeCategory, setActiveCategory] = useState("ALL");
    
    // --- MERCHANT STATE ---
    const [merchantMsg, setMerchantMsg] = useState("What're ya buyin'?");
    const [merchantMood, setMerchantMood] = useState("idle");
    const [doorsOpen, setDoorsOpen] = useState(false);

    // 🚀 RETUR ENGINE: Track if we are processing Bad Stock
    const [isReturMode, setIsReturMode] = useState(false);

    // --- FORM STATE ---
    const [customerName, setCustomerName] = useState("");
    const [paymentMethod, setPaymentMethod] = useState(allowedPayments[0] || "Cash");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [receiptData, setReceiptData] = useState(null); 
    const [lockedTier, setLockedTier] = useState(null); 
    const [tempoDays, setTempoDays] = useState(appSettings?.defaultTempoDays || 7); // NEW: TEMPO STATE
    const [printFormat, setPrintFormat] = useState('thermal'); // 🚀 CRASH FIX: Added missing print state!

    // 🚀 THE FIFO DEBT ENGINE (Monitors Jatuh Tempo in Real-Time) 🚀
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

    // NEW: LIVE DEBT RADAR ENGINE
    const selectedCustomerDebts = React.useMemo(() => {
        if (!customerName || !transactions || transactions.length === 0) return { totalDebt: 0, isOverdue: false };
        let titipTotal = 0; let paymentTotal = 0; let isOverdue = false;
        const now = new Date().getTime();

        transactions.forEach(t => {
            const tCust = t.customerName || t.customer;
            if (tCust?.toLowerCase() === customerName.toLowerCase()) {
                if (t.paymentType === 'Titip' || t.method === 'Titip') {
                    titipTotal += (t.total || 0);
                    // Check if this specific invoice has passed its Jatuh Tempo
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

    // --- GEO-FENCE & NOO (NEW OPEN OUTLET) STATE ---
    const [selectedCustomerInfo, setSelectedCustomerInfo] = useState(null);
    const [gpsStatus, setGpsStatus] = useState('idle'); 
    const [distanceToStore, setDistanceToStore] = useState(null);
    const [agentLocation, setAgentLocation] = useState(null);
    
    // THE NOO MODAL STATE
    const [showNooModal, setShowNooModal] = useState(false);
    const [nooForm, setNooForm] = useState({ phone: '', address: '', requestedTier: allowedTiers[0] || 'Retail', photoUrl: null });
    const fileInputRef = useRef(null);

    const dropdownRef = useRef(null);
    const scrollContainerRef = useRef(null);

    // --- NEW: TRANSACTION LIVE PROOF STATE ---
    const [txProofPhoto, setTxProofPhoto] = useState(null);

    // --- NEW: IMAGE COMPRESSOR (Prevents Database Overload) ---
    const handleTxPhotoCapture = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; // Shrink to 600px width
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6); // 60% Quality JPEG
                setTxProofPhoto(compressedDataUrl);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // --- HELPER: HAVERSINE DISTANCE CALCULATOR ---
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; 
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; 
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
                            setGpsStatus(dist <= 50 ? 'verified' : 'too_far');
                        } else {
                            setGpsStatus('bypass'); 
                        }
                    } else if (customerName.trim().length > 0) {
                        setGpsStatus('walk_in'); 
                    } else {
                        setGpsStatus('idle');
                    }
                },
                (error) => {
                    console.error("GPS Error:", error);
                    setGpsStatus('error');
                },
                { enableHighAccuracy: !useLowAccuracy, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setGpsStatus('error');
        }
    };

    useEffect(() => { 
        if (selectedCustomerInfo) {
            verifyLocation();
        } else if (customerName.trim().length > 2) {
            // FIX: Never stop tracking GPS just because the modal is open!
            const timer = setTimeout(() => { verifyLocation(); }, 1000); 
            return () => clearTimeout(timer);
        } else {
            setGpsStatus('idle');
            setAgentLocation(null);
        }
    }, [selectedCustomerInfo, customerName]);

    useEffect(() => {
        const timer = setTimeout(() => setDoorsOpen(true), 500);
        
        const handleClickOutside = (e) => {
            if (!e.target.closest('.manifest-dropdown-area')) {
                setShowCustomerDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside, { passive: true }); 
        
        return () => { 
            clearTimeout(timer); 
            document.removeEventListener("mousedown", handleClickOutside); 
            document.removeEventListener("touchstart", handleClickOutside); 
        };
    }, []);

    useEffect(() => {
        if (!allowedPayments.includes(paymentMethod)) setPaymentMethod(allowedPayments[0] || 'Cash');
    }, [allowedPayments]);

    const suggestedCustomers = customers.filter(c => {
        if (!c.name.toLowerCase().includes(customerName.toLowerCase())) return false;
        
        const rawTier = c.priceTier || c.tier || c.pricingTier || '';
        const tierUpper = rawTier.toUpperCase();
        
        let mappedTier = 'Retail'; 
        if (tierUpper.includes('GROSIR') || tierUpper.includes('GOLD') || tierUpper.includes('WHOLESALE')) mappedTier = 'Grosir';
        else if (tierUpper.includes('RETAIL') || tierUpper.includes('SILVER')) mappedTier = 'Retail';
        else if (tierUpper.includes('ECER') || tierUpper.includes('BRONZE')) mappedTier = 'Ecer';

        return allowedTiers.includes(mappedTier);
    }).slice(0, 5);

    const triggerMerchantSpeak = (type) => {
        const lines = {
            welcome: ["What're ya buyin'?", "Stranger...", "Got some rare things on sale!"],
            add: ["Heh heh heh... Thank you!", "A wise choice.", "Is that all?"],
            expensive: ["Ooh! I'll buy it at a high price!", "Ah... rare things on sale, stranger!"],
            checkout: ["Heh heh heh... Thank you!", "Come back anytime.", "Pleasure doing business."]
        };
        const selectedSet = lines[type] || lines.welcome;
        const randomLine = selectedSet[Math.floor(Math.random() * selectedSet.length)];
        setMerchantMsg(randomLine);
        setMerchantMood("talking");
        setTimeout(() => setMerchantMood("idle"), 2500);
    };

    const handleCustomerSelect = (cust) => {
        setCustomerName(cust.name);
        setShowCustomerDropdown(false);
        triggerMerchantSpeak('add');
        setSelectedCustomerInfo(cust); 

        const rawTier = cust.priceTier || cust.tier || cust.pricingTier || '';
        const tierUpper = rawTier.toUpperCase();
        
        let mappedTier = 'Retail'; 
        if (tierUpper.includes('GROSIR') || tierUpper.includes('GOLD') || tierUpper.includes('WHOLESALE')) mappedTier = 'Grosir';
        else if (tierUpper.includes('RETAIL') || tierUpper.includes('SILVER')) mappedTier = 'Retail';
        else if (tierUpper.includes('ECER') || tierUpper.includes('BRONZE')) mappedTier = 'Ecer';

        setLockedTier(mappedTier);
        updateCartPricing(mappedTier);
    };

    const handleManualCustomerType = (e) => {
        setCustomerName(e.target.value);
        setShowCustomerDropdown(true);
        setSelectedCustomerInfo(null); 
        setLockedTier('Ecer'); 
        updateCartPricing('Ecer');
    };

    const updateCartPricing = (tier) => {
        if (!tier) return;
        setCart(prev => prev.map(item => {
            const prod = item.product;
            let base = prod.priceRetail || 0;
            if (tier === 'Ecer') base = prod.priceEcer || 0;
            if (tier === 'Grosir') base = prod.priceGrosir || 0;

            let mult = 1;
            if (item.unit === 'Slop') mult = prod.packsPerSlop || 10;
            if (item.unit === 'Bal') mult = (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);
            if (item.unit === 'Karton') mult = (prod.balsPerCarton || 4) * (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);

            return { ...item, priceTier: tier, calculatedPrice: base * mult };
        }));
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            triggerMerchantSpeak((product.priceEcer || 0) > 100000 ? 'expensive' : 'add');
            if (existing) return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
            
            const defaultTier = allowedTiers.includes('Retail') ? 'Retail' : (allowedTiers[0] || 'Retail');
            const tierToUse = lockedTier || defaultTier;
            
            let basePrice = product.priceRetail || 0;
            if (tierToUse === 'Ecer') basePrice = product.priceEcer || 0;
            if (tierToUse === 'Grosir') basePrice = product.priceGrosir || 0;

            return [...prev, { 
                productId: product.id, name: product.name, qty: 1, unit: 'Bks', 
                priceTier: tierToUse, calculatedPrice: basePrice, product 
            }];
        });
    };

    const updateCartItem = (id, field, val) => {
        setCart(prev => prev.map(item => {
            if (item.productId === id) {
                const updated = { ...item, [field]: val };
                const prod = item.product;
                let base = prod.priceRetail || 0;
                if (updated.priceTier === 'Grosir') base = prod.priceGrosir || 0;
                if (updated.priceTier === 'Ecer') base = prod.priceEcer || 0;
                
                let mult = 1;
                if (updated.unit === 'Slop') mult = prod.packsPerSlop || 10;
                if (updated.unit === 'Bal') mult = (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);
                if (updated.unit === 'Karton') mult = (prod.balsPerCarton || 4) * (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);
                updated.calculatedPrice = base * mult;
                return updated;
            }
            return item;
        }));
    };

    const handlePhotoCapture = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setNooForm(prev => ({ ...prev, photoUrl: url, photoFile: file }));
        }
    };

    const submitNooRegistration = () => {
        if (!nooForm.phone || !nooForm.address || !nooForm.photoUrl) {
            return alert("All fields (Phone, Address, Photo) are required to register a new outlet and unlock pricing!");
        }
        
        const tempStore = {
            id: 'NOO_TEMP',
            name: customerName,
            isNooRegistration: true,
            ...nooForm,
            latitude: agentLocation?.latitude,
            longitude: agentLocation?.longitude
        };

        setSelectedCustomerInfo(tempStore);
        setLockedTier(nooForm.requestedTier);
        updateCartPricing(nooForm.requestedTier);
        setShowNooModal(false);
        setGpsStatus('verified'); 
        triggerMerchantSpeak('expensive');
    };

    const handleWhatsAppShare = () => {
        if (!receiptData) return;
        let text = `*${appSettings?.companyName || "KPM INVENTORY"}*\n*OFFICIAL RECEIPT*\n------------------------\nDate: ${receiptData.date}\nCustomer: ${receiptData.customer}\nPayment: ${receiptData.method}\n------------------------\n`;
        receiptData.items.forEach(item => { text += `${item.qty} ${item.unit} ${item.name}\n   Rp ${new Intl.NumberFormat('id-ID').format(item.calculatedPrice * item.qty)}\n`; });
        text += `------------------------\n*TOTAL: Rp ${new Intl.NumberFormat('id-ID').format(receiptData.total)}*\n\nThank you for your business!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleFinalDeal = async () => {
        // PREVENT SALE IF NO PHOTO IS TAKEN
        if (cart.length === 0 || !customerName.trim() || !txProofPhoto) return;
        
        const finalCust = customerName.trim();
        // 🚀 RETUR ENGINE: Force payment method if in Retur Mode
        const finalMethod = isReturMode ? 'Retur/BS' : paymentMethod;
        const finalCart = [...cart];
        const finalTotal = cartTotal;

        try {
            const isFormalNoo = selectedCustomerInfo?.isNooRegistration;
            const newStorePayload = isFormalNoo ? selectedCustomerInfo : null;

            // --- NEW: COMPILE THE DELIVERY PROOF ---
            const proofPayload = {
                photoData: txProofPhoto,
                latitude: agentLocation?.latitude || 0,
                longitude: agentLocation?.longitude || 0,
                timestamp: new Date().toISOString(),
                tempoDays: paymentMethod === 'Titip' ? tempoDays : null,
                // 🚀 RETUR ENGINE: Add the quarantine flags!
                isRetur: isReturMode,
                type: isReturMode ? 'RETUR' : 'SALE'
            };

            // Pass proofPayload as the 5th argument
            const trueAgentName = await onProcessSale(finalCust, finalMethod, finalCart, newStorePayload, proofPayload);
            const agentFallback = typeof trueAgentName === 'string' ? trueAgentName : (user?.displayName || user?.email?.split('@')[0] || 'Admin');

            setReceiptData({
                customer: finalCust, method: finalMethod, items: finalCart, total: finalTotal,
                date: new Date().toLocaleString('id-ID'), agentName: agentFallback 
            });

            setCart([]); 
            setCustomerName("");
            setLockedTier(null); 
            setSelectedCustomerInfo(null);
            setGpsStatus('idle');
            setAgentLocation(null);
            setTxProofPhoto(null); // Reset the photo for the next sale!
            setNooForm({ phone: '', address: '', requestedTier: allowedTiers[0] || 'Retail', photoUrl: null });
            setMerchantMood("deal"); 
            setMerchantMsg("Heh heh heh... Thank you, stranger!");
            setTimeout(() => setMerchantMood("idle"), 3000);
        } catch (error) {
            console.error("Transaction failed:", error);
            alert("Transaction Failed! Please try again.");
        }
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

    const cartTotal = cart.reduce((sum, i) => sum + (i.calculatedPrice * i.qty), 0);
    const filteredItems = inventory.filter(i => (activeCategory === "ALL" || i.type === activeCategory) && i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const categories = ["ALL", ...new Set(inventory.map(i => i.type || "MISC"))];

    const renderManifestUI = (isMobile) => (
        <div className={`bg-[#e6dcc3] text-[#2a231d] shadow-2xl relative flex flex-col border-[#a89070] ${isMobile ? 'flex-1 border-t-2' : 'w-80 border-l-2'} shrink-0`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-40 pointer-events-none"></div>
            <div className="p-3 md:p-4 border-b-2 border-dashed border-[#a89070] relative z-10 text-center uppercase font-bold tracking-widest text-[#3e3226]">Manifest</div>
            
            <div className="p-3 md:p-4 relative z-[60] border-b border-[#a89070] bg-[#dfd5bc] space-y-3 md:space-y-4 manifest-dropdown-area">
                {showCustomerDropdown && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] manifest-dropdown-area transition-all duration-300" onClick={() => setShowCustomerDropdown(false)}></div>
                )}

                {/* --- DEBT WARNING BANNER (RE4 MERCHANT THEME) --- */}
                {debtInfo && debtInfo.status === 'RED' && (
                    <div className="bg-[#5c4b3a] border-2 border-red-500/80 p-3 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse rounded-sm relative z-[65]">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="text-red-500 shrink-0" size={16}/>
                            <h4 className="text-red-500 font-black uppercase tracking-widest text-[10px]">Warning: Jatuh Tempo!</h4>
                        </div>
                        <p className="text-[#d4c5a3] text-[9px] leading-relaxed uppercase tracking-widest mt-1">
                            {customerName} OWES <span className="font-bold text-white text-[10px]">Rp {new Intl.NumberFormat('id-ID').format(debtInfo.totalDebt)}</span> FROM {debtInfo.ageDays} DAYS AGO ({debtInfo.oldestDate}).
                        </p>
                        <div className="text-white bg-red-600 px-1.5 py-0.5 mt-2 inline-block text-[8px] uppercase tracking-widest font-black shadow-md">Collect payment before issuing new Titip!</div>
                    </div>
                )}
                {debtInfo && debtInfo.status === 'YELLOW' && (
                    <div className="bg-[#3e3226] border border-yellow-500/50 p-3 shadow-md rounded-sm relative z-[65]">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="text-yellow-500 shrink-0" size={16}/>
                            <h4 className="text-yellow-500 font-black uppercase tracking-widest text-[10px]">Notice: Payment Due Soon</h4>
                        </div>
                        <p className="text-[#d4c5a3] text-[9px] leading-relaxed uppercase tracking-widest mt-1">
                            {customerName} OWES <span className="font-bold text-white">Rp {new Intl.NumberFormat('id-ID').format(debtInfo.totalDebt)}</span> ({debtInfo.ageDays} DAYS OLD).
                        </p>
                    </div>
                )}
                
                {/* 🚀 RETUR ENGINE: The Red Toggle Switch */}
                <div className={`mb-4 border-2 rounded-xl p-3 flex items-center justify-between transition-colors shadow-lg ${isReturMode ? 'bg-red-900/40 border-red-500' : 'bg-[#2a241e] border-[#8b7256]'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg shadow-sm ${isReturMode ? 'bg-red-500/20 text-red-400' : 'bg-[#3e3226] text-[#ffca28]'}`}>
                            <AlertCircle size={16} />
                        </div>
                        <div>
                            <h4 className={`text-xs font-black uppercase tracking-widest ${isReturMode ? "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" : "text-[#ffca28]"}`}>Retur / Bad Stock</h4>
                            <p className={`text-[9px] font-bold tracking-wider ${isReturMode ? "text-red-300" : "text-[#d4c5a3]"}`}>Take back damaged goods & reduce Piutang</p>
                        </div>
                    </div>
                    <button onClick={() => setIsReturMode(!isReturMode)} className={`w-12 h-6 rounded-full transition-all relative shadow-inner cursor-pointer border-2 ${isReturMode ? 'bg-red-500 border-red-400' : 'bg-[#1a1815] border-[#8b7256]'}`}>
                        <div className={`w-4 h-4 rounded-full absolute top-0.5 transition-all shadow-md ${isReturMode ? 'bg-white left-6' : 'bg-[#ffca28] left-0.5'}`}></div>
                    </button>
                </div>

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
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setCustomerName("");
                                    setSelectedCustomerInfo(null);
                                    setLockedTier(null);
                                    setGpsStatus('idle');
                                    setShowCustomerDropdown(true); 
                                }}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-lg shadow-md active:scale-90 transition-all z-[90] ${showCustomerDropdown ? 'opacity-100' : 'opacity-80'}`}
                            >
                                <X size={16} strokeWidth={3}/>
                            </button>
                        )}
                    </div>
                    
                    <div className="mt-2 min-h-[20px]">
                        {selectedCustomerInfo && !selectedCustomerInfo.isNooRegistration ? (
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
                                {gpsStatus === 'checking' && (
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-blue-400 animate-pulse flex items-center gap-1"><MapPin size={12}/> Acquiring Satellites...</span>
                                        <button onClick={() => verifyLocation(true)} className="text-blue-400 hover:text-white underline text-[9px] ml-2">PC Fast Scan</button>
                                    </div>
                                )}
                                {gpsStatus === 'verified' && <span className="text-emerald-400 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)]"><MapPin size={12}/> Location Verified ({distanceToStore}m)</span>}
                                {gpsStatus === 'too_far' && (
                                    <div className="flex items-center gap-2 w-full">
                                        <span className="text-red-500 flex items-center gap-1 bg-red-900/20 px-2 py-1 rounded"><MapPin size={12}/> Geofence Blocked ({distanceToStore}m / 50m max)</span>
                                    </div>
                                )}
                                {gpsStatus === 'bypass' && <span className="text-orange-400 flex items-center gap-1"><MapPin size={12}/> Unmapped Store (Bypass Allowed)</span>}
                                {gpsStatus === 'error' && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={12}/> GPS Signal Lost</span>}
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
                                <button 
                                    onClick={() => setShowNooModal(true)}
                                    className="bg-[#3e3226] hover:bg-[#5c4b3a] text-[#ff9d00] text-[10px] font-bold uppercase tracking-widest p-2 rounded shadow-md flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Store size={12}/> Register Outlet to Unlock Tiers
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {showCustomerDropdown && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-[#f5e6c8] border-2 border-[#a89070] shadow-xl rounded z-[100] max-h-48 overflow-y-auto">
                            {suggestedCustomers.map(c => (
                                <div key={c.id} onClick={() => handleCustomerSelect(c)} className="p-2 text-xs font-bold border-b border-[#a89070]/30 hover:bg-[#8b7256] hover:text-white cursor-pointer flex justify-between uppercase">
                                    <span>{c.name}</span><span className="opacity-50 text-[8px]">PROFILED</span>
                                </div>
                            ))}
                            {customerName && !suggestedCustomers.find(c => c.name.toLowerCase() === customerName.toLowerCase()) && (
                                <div onClick={() => { setShowCustomerDropdown(false); }} className="p-2 text-xs font-bold text-orange-700 bg-orange-100/50 hover:bg-orange-200 cursor-pointer italic uppercase">
                                    Walk-in: "{customerName}" (Ecer Only)
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase text-[#8b7256] block mb-1">Payment Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-[#f5e6c8] border border-[#a89070] text-[#3e3226] p-2 text-xs md:text-sm font-bold uppercase outline-none rounded">
                        {allowedPayments.map(method => ( <option key={method} value={method}>{method === 'Titip' ? 'Consignment' : method}</option> ))}
                    </select>
                </div>

                {/* NEW: JATUH TEMPO CONFIGURATOR */}
                {paymentMethod === 'Titip' && (
                    <div className="mt-3 bg-[#3e3226] border border-[#ff9d00]/50 p-3 rounded shadow-inner animate-fade-in">
                        <label className="text-[10px] font-bold text-[#d4c5a3] mb-2 flex items-center justify-between uppercase tracking-widest">
                            <span>Jatuh Tempo (Due Date)</span>
                            <span className="bg-[#ff9d00] text-black px-2 py-0.5 rounded shadow-sm text-[10px]">{tempoDays} Hari</span>
                        </label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="range" min="1" max="60" value={tempoDays} 
                                onChange={(e) => setTempoDays(parseInt(e.target.value))} 
                                className="w-full accent-[#ff9d00] h-1.5 bg-[#1a1815] rounded-lg appearance-none cursor-pointer"
                            />
                            <input 
                                type="number" min="1" max="60" value={tempoDays} 
                                onChange={(e) => setTempoDays(parseInt(e.target.value))} 
                                className="w-12 bg-[#1a1815] border border-[#5c4b3a] rounded p-1 text-center text-[#ff9d00] text-xs font-bold focus:outline-none focus:border-[#ff9d00]"
                            />
                        </div>
                    </div>
                )}

                {/* NEW: LIVE DEBT RADAR WARNING */}
                {selectedCustomerDebts.totalDebt > 0 && (
                    <div className={`mt-3 p-2 rounded border flex items-start gap-2 animate-fade-in shadow-md ${selectedCustomerDebts.isOverdue ? 'bg-red-900/20 border-red-500/50' : 'bg-orange-900/20 border-orange-500/50'}`}>
                        <AlertCircle className={`shrink-0 mt-0.5 ${selectedCustomerDebts.isOverdue ? 'text-red-500' : 'text-orange-500'}`} size={16}/>
                        <div>
                            <h4 className={`font-black text-[9px] uppercase tracking-[0.1em] ${selectedCustomerDebts.isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
                                {selectedCustomerDebts.isOverdue ? '⚠️ OVERDUE TITIP DETECTED' : 'Active Titip Balance'}
                            </h4>
                            <p className="text-[10px] text-[#5c4b3a] mt-0.5 leading-tight font-bold">
                                <strong className="text-[#3e3226]">Rp {new Intl.NumberFormat('id-ID').format(selectedCustomerDebts.totalDebt)}</strong> Unpaid.
                                {selectedCustomerDebts.isOverdue && <span className="text-red-600 block mt-0.5">Collect payment before new Titip!</span>}
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
                        <div key={idx} className="flex flex-col border-b-2 border-dashed border-[#a89070]/30 pb-3 bg-[#f5e6c8] p-2 rounded border border-[#a89070]/50 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] md:text-xs font-black w-40 leading-tight uppercase break-words whitespace-normal text-[#3e3226]">{item.name}</span>
                                <button onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} className="text-red-800 hover:text-red-600 bg-red-100 p-1 rounded"><X size={14}/></button>
                            </div>
                            <div className="flex items-center gap-1 md:gap-2 bg-[#dfd5bc] p-1 rounded border border-[#a89070]/30">
                                <input type="number" value={item.qty} onChange={(e) => updateCartItem(item.productId, 'qty', e.target.value === '' ? '' : parseInt(e.target.value))} onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) updateCartItem(item.productId, 'qty', 1); }} className="w-10 md:w-12 bg-white border border-[#a89070] text-center text-xs md:text-sm font-bold outline-none focus:border-[#ff9d00] rounded p-1 text-[#3e3226]" />
                                <select value={item.unit} onChange={(e) => updateCartItem(item.productId, 'unit', e.target.value)} className="bg-transparent text-[9px] md:text-[10px] font-bold uppercase outline-none text-[#3e3226] border-r border-[#a89070]/30 pr-1 md:pr-2"><option>Bks</option><option>Slop</option><option>Bal</option></select>
                                <select value={item.priceTier} onChange={(e) => updateCartItem(item.productId, 'priceTier', e.target.value)} disabled={!!lockedTier} className={`bg-transparent text-[9px] md:text-[10px] font-bold uppercase outline-none text-[#3e3226] pl-1 ${lockedTier ? 'opacity-50 cursor-not-allowed text-red-700' : ''}`}>
                                    {Array.from(mergedTiers).map(tier => ( <option key={tier} value={tier}>{tier}</option> ))}
                                </select>
                            </div>
                            <div className="text-right text-base md:text-lg font-black font-mono mt-2 text-[#5c4b3a]">Rp {new Intl.NumberFormat('id-ID').format(item.calculatedPrice * item.qty)}</div>
                        </div>
                    )})
                )}
            </div>
        </div>
    );

    return (
        <div className="flex h-full w-full bg-[#1a1815] text-[#d4c5a3] font-serif overflow-hidden relative border-4 border-[#3e3226] shadow-2xl">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-50 pointer-events-none"></div>
            
            {/* --- NEW BOTTOM NAVIGATION BAR FOR MOBILE --- */}
            <div className="hide-on-print lg:hidden absolute bottom-0 inset-x-0 h-14 flex border-t-2 border-[#5c4b3a] bg-[#0f0e0d] z-[150] shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
                <button onClick={() => setMobileTab('products')} className={`flex-1 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${mobileTab === 'products' ? 'bg-[#3e3226] text-[#ff9d00] shadow-[inset_0_4px_0_#ff9d00]' : 'text-[#5c4b3a] hover:text-[#8b7256]'}`}>
                    <ShoppingBag size={18}/> Wares
                </button>
                <button onClick={() => setMobileTab('merchant')} className={`flex-1 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${mobileTab === 'merchant' ? 'bg-[#3e3226] text-[#ff9d00] shadow-[inset_0_4px_0_#ff9d00]' : 'text-[#5c4b3a] hover:text-[#8b7256]'}`}>
                    <User size={18}/> Merchant ({cart.length})
                </button>
            </div>

            <div className={`hide-on-print w-full lg:w-[420px] flex-col z-10 border-r-4 border-[#3e3226] bg-[#0f0e0d] transition-all pb-14 lg:pb-0 shrink-0 ${mobileTab === 'merchant' ? 'flex h-full' : 'hidden lg:flex'}`}>
                <div className="h-40 md:h-48 lg:h-auto lg:flex-1 relative overflow-hidden bg-black shrink-0 min-h-[200px] lg:min-h-[250px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#5c4b3a_0%,#000000_90%)] opacity-50"></div>
                    <div className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ${merchantMood === 'talking' ? 'scale-105' : 'scale-100'}`}>
                        <div className="w-40 h-40 md:w-48 md:h-48 lg:w-72 lg:h-72 relative">
                            <img src={merchantMood === 'deal' ? "/deal.png" : merchantMood === 'talking' ? "/talking.png" : "/idle.png"} className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(255,157,0,0.5)]" alt="Merchant" onError={(e) => { e.target.src = "https://api.dicebear.com/7.x/pixel-art/svg?seed=Merchant"; }}/>
                        </div>
                    </div>
                    <div className={`absolute inset-y-0 left-0 w-1/2 bg-[#1a1815] border-r-4 border-[#2a2520] z-20 transition-transform duration-[1200ms] ease-in-out ${doorsOpen ? '-translate-x-full' : ''}`} style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')" }}></div>
                    <div className={`absolute inset-y-0 right-0 w-1/2 bg-[#1a1815] border-l-4 border-[#2a2520] z-20 transition-transform duration-[1200ms] ease-in-out ${doorsOpen ? 'translate-x-full' : ''}`} style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')" }}></div>
                    <div className="absolute bottom-3 md:bottom-4 inset-x-4 md:inset-x-6 z-30">
                        <div className="bg-black/90 border-2 border-[#8b7256] p-2 md:p-3 text-center uppercase tracking-widest text-[10px] md:text-sm lg:text-base italic animate-pulse shadow-lg rounded-lg text-[#ff9d00] font-bold"> "{merchantMsg}" </div>
                    </div>
                </div>
                <div className="md:hidden flex-1 overflow-hidden flex flex-col">{renderManifestUI(true)}</div>
               
                <div className="p-4 md:p-6 bg-[#26211c] border-t-4 border-[#5c4b3a] flex flex-col shrink-0 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
                    
                    {/* --- NEW: LIVE DELIVERY PROOF UI --- */}
                    <div className="mb-4">
                        <label className="text-[10px] font-bold text-[#8b7256] uppercase tracking-widest block mb-2">Live Delivery Proof <span className="text-red-500">*</span></label>
                        <input type="file" accept="image/*" capture="environment" id="txProof" className="hidden" onChange={handleTxPhotoCapture} />
                        
                        {txProofPhoto ? (
                            <div className="relative rounded-lg border-2 border-[#ff9d00] overflow-hidden shadow-[0_0_15px_rgba(255,157,0,0.3)]">
                                <img src={txProofPhoto} alt="Proof" className="w-full h-24 object-cover opacity-80" />
                                <button onClick={() => setTxProofPhoto(null)} className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-md shadow-md"><X size={14}/></button>
                                <div className="absolute bottom-0 inset-x-0 bg-black/80 p-1.5 text-[9px] text-[#ff9d00] font-mono text-center tracking-widest uppercase">
                                    <MapPin size={10} className="inline mr-1"/> Verified • {new Date().toLocaleTimeString()}
                                </div>
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
                        <span className="text-2xl md:text-3xl lg:text-4xl font-black text-[#ff9d00] leading-none drop-shadow-sm">Rp {new Intl.NumberFormat('id-ID').format(cartTotal)}</span>
                    </div>
                    
                    {/* BUTTON DISABLED IF NO PHOTO */}
                    <button
                        onClick={handleFinalDeal}
                        disabled={cart.length === 0 || !customerName.trim() || gpsStatus === 'too_far' || gpsStatus === 'checking' || !txProofPhoto}
                        className={`py-3 md:py-4 border-2 text-lg md:text-xl lg:text-2xl font-black uppercase tracking-[0.2em] transition-all active:translate-y-1 shadow-lg rounded flex items-center justify-center gap-2 md:gap-3 ${cart.length > 0 && customerName.trim() && gpsStatus !== 'too_far' && gpsStatus !== 'checking' && txProofPhoto ? (isReturMode ? 'bg-gradient-to-r from-red-600 to-red-800 border-red-500 text-white hover:from-red-500 hover:to-red-700 shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-gradient-to-r from-[#ff9d00] to-[#c47f00] border-[#ffca28] text-black hover:from-[#ffca28] hover:to-[#ff9d00]') : 'bg-[#1a1815] text-[#5c4b3a] border-[#3e3226] opacity-50 cursor-not-allowed'}`}
                    >
                        {gpsStatus === 'checking' ? 'Awaiting GPS...' :
                         gpsStatus === 'too_far' ? 'Return to Store' :
                         !txProofPhoto && customerName.trim() ? <><Camera size={20}/> REQUIRE PROOF</> :
                         customerName.trim() ? (isReturMode ? <><AlertCircle size={24} className="md:w-6 md:h-6"/> QUARANTINE BS</> : <><Zap fill="black" size={20} className="md:w-6 md:h-6"/> MAKE DEAL</>) : "SIGN MANIFEST >"}
                    </button>
                </div>
            </div>

            <div className={`hide-on-print flex-1 flex-col bg-[#161412] pb-14 lg:pb-0 overflow-hidden ${mobileTab === 'products' ? 'flex h-full' : 'hidden lg:flex'}`}>
                <div className="flex gap-2 p-2 md:p-3 bg-black border-b border-[#3e3226] overflow-x-auto scrollbar-hide shrink-0">
                    {categories.map(cat => ( <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 md:px-5 md:py-2.5 text-[10px] md:text-xs font-black uppercase whitespace-nowrap transition-all rounded-lg border-2 ${activeCategory === cat ? 'bg-[#8b7256] text-black border-[#ff9d00]' : 'bg-[#26211c] text-[#6b5845] border-[#3e3226] hover:border-[#8b7256]'}`}>{cat}</button> ))}
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

                <div className="flex-1 overflow-x-auto overflow-y-auto pb-4 p-3 lg:p-6 lg:pb-8 flex flex-nowrap gap-3 lg:gap-6 scrollbar-hide items-start bg-[#1a1815] relative snap-x snap-mandatory scroll-pl-3 lg:scroll-pl-6 scroll-smooth" ref={scrollContainerRef}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
                    {filteredItems.map(item => (
                        <div key={item.id} onClick={() => addToCart(item)} onContextMenu={(e) => { e.preventDefault(); onInspect(item); }} className="product-card snap-start w-[160px] md:w-[240px] lg:w-[260px] shrink-0 bg-[#0f0e0d] border-2 border-[#3e3226] hover:border-[#ff9d00] transition-all flex flex-col group active:scale-[0.98] shadow-[0_10px_20px_rgba(0,0,0,0.3)] rounded-xl overflow-hidden relative z-10 h-max">
                            <div className="h-32 md:h-44 lg:h-48 p-3 md:p-5 flex items-center justify-center relative overflow-hidden bg-black/50 shrink-0">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#3e3226_0%,#000000_80%)] opacity-50"></div>
                                {item.images?.front ? <img src={item.images.front} className="max-h-full max-w-full object-contain sepia-[.3] group-hover:sepia-0 transition-all duration-300 drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] group-hover:scale-110" alt="product"/> : <Box size={48} className="text-[#3e3226] opacity-50"/>}
                                <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-black/80 text-[#8b7256] text-[8px] md:text-[10px] font-black px-2 py-0.5 md:px-2 md:py-1 rounded-full border border-[#3e3226] uppercase tracking-wider">
                                    {item.type || 'MISC'}
                                </div>
                            </div>
                            <div className="flex-1 bg-gradient-to-b from-[#1a1815] to-[#0f0e0d] border-t-2 border-[#3e3226] p-3 md:p-4 flex flex-col font-mono relative">
                                <h4 className="text-[#d4c5a3] text-[11px] md:text-sm font-black uppercase mb-3 line-clamp-2 h-[32px] md:h-[40px] leading-tight group-hover:text-white transition-colors">{item.name}</h4>
                                <div className="mt-auto flex flex-col items-start md:flex-row md:justify-between md:items-end w-full gap-2 md:gap-0">
                                    <div className="flex flex-col gap-0.5 md:gap-1">
                                        <span className="text-[8px] md:text-[9px] text-[#5c4b3a] font-bold uppercase tracking-widest">In Stock</span>
                                        <span className={`text-[10px] md:text-xs font-black px-1.5 py-0.5 md:px-2 md:py-1 rounded-md border-2 inline-block ${item.stock > 0 ? 'bg-[#1a1815] text-[#8b7256] border-[#3e3226]' : 'bg-red-900/20 text-red-500 border-red-900/50'}`}>{item.stock > 0 ? `${item.stock} Units` : 'EMPTY'}</span>
                                    </div>
                                    <div className="text-left md:text-right w-full md:w-auto mt-1 md:mt-0 pt-2 md:pt-0 border-t border-[#3e3226] md:border-none">
                                        <span className="text-[8px] md:text-[9px] text-[#5c4b3a] font-bold uppercase tracking-widest block mb-0.5 md:mb-1">Ecer Price</span>
                                        <span className="text-[16px] md:text-2xl font-black text-[#ff9d00] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(item.priceEcer || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="hide-on-print hidden lg:flex h-full shrink-0">{renderManifestUI(false)}</div>

            {/* --- THE NOO (NEW OPEN OUTLET) REGISTRATION MODAL --- */}
            {showNooModal && (
                <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 font-sans backdrop-blur-md">
                    <div className="bg-slate-900 w-full max-w-lg border-2 border-orange-500/50 rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.2)] flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up">
                        <div className="p-5 border-b border-slate-700 bg-black/40 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wider"><Store size={20} className="text-orange-500"/> Outlet Registration</h2>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Unlock Requested Pricing Tiers</p>
                            </div>
                            <button onClick={() => setShowNooModal(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Store Name</label>
                                <input value={customerName} disabled className="w-full bg-black border border-slate-700 text-slate-300 p-3 rounded font-bold uppercase opacity-70" />
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">WhatsApp / Phone <span className="text-red-500">*</span></label>
                                <input value={nooForm.phone} onChange={e => setNooForm({...nooForm, phone: e.target.value})} placeholder="e.g. 081234567890" className="w-full bg-slate-800 border border-slate-600 focus:border-orange-500 outline-none text-white p-3 rounded font-bold" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Full Address <span className="text-red-500">*</span></label>
                                <textarea value={nooForm.address} onChange={e => setNooForm({...nooForm, address: e.target.value})} placeholder="Include RT/RW and Landmarks..." className="w-full bg-slate-800 border border-slate-600 focus:border-orange-500 outline-none text-white p-3 rounded font-bold min-h-[80px]" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Requested Pricing Tier <span className="text-red-500">*</span></label>
                                <select value={nooForm.requestedTier} onChange={e => setNooForm({...nooForm, requestedTier: e.target.value})} className="w-full bg-slate-800 border border-slate-600 focus:border-orange-500 outline-none text-white p-3 rounded font-bold uppercase">
                                    {allowedTiers.map(tier => ( <option key={tier} value={tier}>{tier}</option> ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Live Camera Proof <span className="text-red-500">*</span></label>
                                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handlePhotoCapture} className="hidden" />
                                {nooForm.photoUrl ? (
                                    <div className="relative rounded-lg overflow-hidden border-2 border-orange-500">
                                        <img src={nooForm.photoUrl} alt="Store Proof" className="w-full h-40 object-cover" />
                                        <button onClick={() => setNooForm({...nooForm, photoUrl: null, photoFile: null})} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <button onClick={() => fileInputRef.current.click()} className="w-full border-2 border-dashed border-slate-600 hover:border-orange-500 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-orange-400 transition-colors py-8 rounded-lg flex flex-col items-center justify-center gap-2">
                                        <Camera size={32} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Take Storefront Photo</span>
                                        <span className="text-[9px] opacity-60">(Gallery Uploads Disabled)</span>
                                    </button>
                                )}
                            </div>
                            
                            <div className="bg-black/30 p-3 rounded border border-slate-700 flex justify-between items-center gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-900/30 text-blue-400 rounded-full"><Map size={16}/></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location Tracking</p>
                                        <p className="text-xs text-blue-400 font-mono">{agentLocation ? `${agentLocation.latitude.toFixed(5)}, ${agentLocation.longitude.toFixed(5)}` : 'Awaiting GPS Lock...'}</p>
                                    </div>
                                </div>
                                {!agentLocation && (
                                    <button onClick={() => verifyLocation(true)} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 px-3 py-1.5 rounded uppercase font-bold transition-colors shadow-md">
                                        Force GPS Lock
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-700 bg-black/40">
                            <button onClick={submitNooRegistration} disabled={!agentLocation} className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-2 ${agentLocation ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/50' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                                {agentLocation ? 'Submit & Unlock Pricing' : 'Acquiring Satellites...'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
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

                // 🚀 SMART DATE/TIME SPLITTER 🚀
                const rawDate = receiptData.date || '';
                const dateParts = rawDate.split(', ');
                const receiptDateStr = dateParts[0] || rawDate;
                const receiptTimeStr = dateParts[1] || '';

                return (
                    <div className="print-modal-wrapper fixed inset-0 z-[400] bg-black/90 flex items-center justify-center p-4">
                        <div className={`print-receipt format-${printFormat} !bg-white !text-black w-full ${printFormat === 'thermal' ? 'max-w-sm' : 'max-w-4xl'} shadow-2xl relative flex flex-col text-sm border-t-8 ${printFormat === 'a4' ? '!border-blue-800' : '!border-slate-800'} animate-fade-in rounded-b-lg max-h-[90vh] overflow-y-auto custom-scrollbar`}>
                            
                            {/* --- THERMAL POS LAYOUT (REDESIGNED FOR 58MM) --- */}
                            {printFormat === 'thermal' && (
                                <div className="p-4 shrink-0 font-mono text-xs">
                                    <div className="text-center mb-4">
                                        <h2 className="text-base font-black uppercase tracking-widest !text-black">{appSettings?.companyName || "KPM INVENTORY"}</h2>
                                        <p className="text-[10px] font-bold mt-1 !text-slate-600">OFFICIAL SALES RECEIPT</p>
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
                                                            <div className="text-[10px] !text-slate-600 mt-0.5">{item.qty} {item.unit} x {new Intl.NumberFormat('id-ID').format(item.calculatedPrice || 0)}</div>
                                                        </td>
                                                        <td className="py-1 text-right font-black whitespace-nowrap">
                                                            {new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}
                                                        </td>
                                                    </tr>
                                                )) : <tr><td colSpan="2" className="text-center py-4 text-[10px] italic !text-slate-400">No Itemized Data</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <div className="flex justify-between items-center text-sm font-black mb-4 !text-black">
                                        <span>TOTAL</span>
                                        <span>Rp {new Intl.NumberFormat('id-ID').format(receiptData.total || 0)}</span>
                                    </div>
                                    
                                    <div className="text-center text-[10px] mb-2 font-bold !text-slate-500">
                                        <p>*** THANK YOU ***</p>
                                    </div>
                                </div>
                            )}

                            {/* --- A4 STANDARD INVOICE LAYOUT --- */}
                            {printFormat === 'a4' && (
                                <div className="w-full overflow-x-auto custom-scrollbar border-b !border-slate-300">
                                    <div className="a4-print-jail p-8 md:p-12 shrink-0 font-sans relative min-w-[800px] mx-auto" style={{ backgroundColor: '#ffffff', color: '#000000', boxSizing: 'border-box' }}>
                                        <div className="border-b-4 !border-blue-800 pb-4 mb-6 flex justify-between items-end gap-8">
                                            <div className="flex-1">
                                                <h1 className="text-2xl md:text-3xl font-black !text-blue-900 tracking-widest uppercase break-words">{appSettings?.companyName || "PT KARYAMEGA PUTERA MANDIRI"}</h1>
                                                <p className="text-xs md:text-sm font-bold !text-slate-700 mt-1 whitespace-pre-line">{appSettings?.companyAddress || "Jl. Raya Magelang - Purworejo Km. 11, Palbapang, Mungkid, Magelang"}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <h2 className="text-xl md:text-2xl font-bold !text-blue-800 uppercase tracking-widest">NOTA PENJUALAN</h2>
                                                <p className="text-[10px] uppercase font-bold !text-slate-500 tracking-widest mt-1">CUSTOMER COPY</p>
                                            </div>
                                        </div>

                                        <div className="flex justify-between mb-8 text-sm">
                                            <table className="w-1/3">
                                                <tbody>
                                                    {/* 🚀 A4 STACKED DATE & TIME 🚀 */}
                                                    <tr><td className="font-bold py-1 w-24 !text-slate-600 uppercase align-top">Tanggal</td><td className="font-bold py-1 !text-slate-900">: {receiptDateStr}</td></tr>
                                                    {receiptTimeStr && <tr><td className="font-bold py-1 w-24 !text-slate-600 uppercase align-top">Waktu</td><td className="font-bold py-1 !text-slate-900">: {receiptTimeStr}</td></tr>}
                                                    
                                                    <tr><td className="font-bold py-1 !text-slate-600 uppercase align-top">Tipe Harga</td><td className="font-bold py-1 !text-slate-900">: <span className="uppercase !bg-blue-100 !text-blue-800 px-2 py-0.5 rounded text-xs border !border-blue-200">{activeTier}</span></td></tr>
                                                    <tr><td className="font-bold py-1 !text-slate-600 uppercase align-top">Sales / Agent</td><td className="font-bold py-1 !text-slate-900 uppercase">: {receiptData.agentName === 'Admin' ? (appSettings?.adminDisplayName || 'Admin') : (receiptData.agentName || 'Sales')}</td></tr>
                                                    <tr><td className="font-bold py-1 !text-slate-600 uppercase align-top">Metode Bayar</td><td className="font-bold py-1 !text-slate-900 uppercase">: {receiptData.method || 'Cash'}</td></tr>
                                                </tbody>
                                            </table>
                                            <div className="w-1/3 border-2 !border-slate-800 p-3 rounded-lg bg-slate-50 shadow-sm flex flex-col justify-center">
                                                <p className="font-bold !text-slate-500 text-xs mb-1">KEPADA YTH,</p>
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
                                                        <td className="border-2 !border-slate-800 p-2 text-center !text-slate-600 font-bold">{i+1}</td>
                                                        <td className="border-2 !border-slate-800 p-2 font-bold !text-slate-900 uppercase">{item.name}</td>
                                                        <td className="border-2 !border-slate-800 p-2 text-right font-mono !text-slate-700">{new Intl.NumberFormat('id-ID').format(item.displayPrice)}</td>
                                                        <td className="border-2 !border-slate-800 p-2 text-center font-black text-lg !text-blue-700">{item.displayQty > 0 ? Number(item.displayQty.toFixed(2)) : ''}</td>
                                                        <td className="border-2 !border-slate-800 p-2 text-right font-black text-lg !text-slate-900">{item.total > 0 ? new Intl.NumberFormat('id-ID').format(item.total) : ''}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="!bg-blue-100">
                                                    <td colSpan="4" className="border-2 !border-slate-800 p-4 text-right font-black text-xl !text-blue-900 tracking-widest">GRAND TOTAL</td>
                                                    <td className="border-2 !border-slate-800 p-4 text-right font-black text-2xl !text-blue-900">Rp {new Intl.NumberFormat('id-ID').format(receiptData.total || 0)}</td>
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
                                <label className="flex items-center gap-2 text-xs font-bold !text-slate-600 cursor-pointer hover:!text-black">
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

    // Clone the receipt and strip unwanted elements
    const clone = receipt.cloneNode(true);
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    
    // 🚀 FIX: Strip scrollbar classes that cause Chrome to print Blank/Cut-off pages
    clone.classList.remove('max-h-[90vh]', 'overflow-y-auto', 'shadow-2xl', 'rounded-b-lg');

    // Extract app CSS
    let parentStyles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
        parentStyles += el.outerHTML;
    });

    const isThermal = clone.classList.contains('format-thermal');

    // 🚀 FIX: Create an invisible Iframe instead of a Popup Window
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
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
                    @page { 
                        margin: 0; 
                        size: ${isThermal ? '58mm auto' : 'A4 portrait'}; 
                    }
                    html, body { 
                        background: #ffffff !important; 
                        color: #000000 !important; 
                        margin: 0 !important; 
                        padding: ${isThermal ? '0 2mm' : '10mm'} !important; 
                        width: ${isThermal ? '58mm' : '210mm'} !important; 
                        height: auto !important;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact; 
                    }
                    /* Forcing everything inside the receipt to render fully */
                    .print-receipt { 
                        max-height: none !important; 
                        height: auto !important; 
                        overflow: visible !important; 
                        box-shadow: none !important; 
                        border: none !important; 
                        width: 100% !important;
                        margin: 0 !important;
                    }
                    * { color: #000000 !important; border-color: #000000 !important; }
                }
            </style>
        </head>
        <body>
            ${clone.outerHTML}
            <script>
                // Give the iframe 500ms to load CSS before firing the print dialogue
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

    // Auto-cleanup the iframe after 10 seconds
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
                                    text += `------------------------\n*TOTAL: Rp ${new Intl.NumberFormat('id-ID').format(receiptData.total || 0)}*\n\nThank you for your business!`;
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