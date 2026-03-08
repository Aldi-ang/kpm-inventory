import React, { useState, useEffect, useRef } from 'react';
import { Search, Box, Zap, X, DollarSign, ShoppingBag, List, User, ChevronDown, Printer, MessageSquare, ArrowRight, ArrowLeft } from 'lucide-react';

const MerchantSalesView = ({ inventory, user, onProcessSale, onInspect, appSettings, customers = [] }) => {
    const [mobileTab, setMobileTab] = useState('products');
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState([]);
    const [activeCategory, setActiveCategory] = useState("ALL");
    
    // --- MERCHANT STATE ---
    const [merchantMsg, setMerchantMsg] = useState("What're ya buyin'?");
    const [merchantMood, setMerchantMood] = useState("idle");
    const [doorsOpen, setDoorsOpen] = useState(false);

    // --- FORM STATE ---
    const [customerName, setCustomerName] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [receiptData, setReceiptData] = useState(null); 
    const [lockedTier, setLockedTier] = useState(null); // <--- NEW: Auto-Pricing Lock
    
    const dropdownRef = useRef(null);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => setDoorsOpen(true), 500);
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowCustomerDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const suggestedCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(customerName.toLowerCase())
    ).slice(0, 5);

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

    // --- NEW: AUTO-LOCK PRICING BASED ON CUSTOMER TIER ---
    const handleCustomerSelect = (cust) => {
        setCustomerName(cust.name);
        setShowCustomerDropdown(false);
        triggerMerchantSpeak('add');

        let mappedTier = null;
        const tierUpper = (cust.tier || '').toUpperCase();
        if (tierUpper.includes('GROSIR') || tierUpper.includes('GOLD')) mappedTier = 'Grosir';
        else if (tierUpper.includes('RETAIL') || tierUpper.includes('SILVER')) mappedTier = 'Retail';
        else if (tierUpper.includes('ECER') || tierUpper.includes('BRONZE')) mappedTier = 'Ecer';
        else if (tierUpper.includes('DISTRIBUTOR') || tierUpper.includes('PLATINUM')) mappedTier = 'Distributor';

        setLockedTier(mappedTier);

        if (mappedTier) {
            setCart(prev => prev.map(item => {
                const prod = item.product;
                let base = prod.priceRetail || 0;
                if (mappedTier === 'Ecer') base = prod.priceEcer || 0;
                if (mappedTier === 'Grosir') base = prod.priceGrosir || 0;
                if (mappedTier === 'Distributor') base = prod.priceDistributor || 0;

                let mult = 1;
                if (item.unit === 'Slop') mult = prod.packsPerSlop || 10;
                if (item.unit === 'Bal') mult = (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);
                if (item.unit === 'Karton') mult = (prod.balsPerCarton || 4) * (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);

                return { ...item, priceTier: mappedTier, calculatedPrice: base * mult };
            }));
        }
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            triggerMerchantSpeak((product.priceEcer || 0) > 100000 ? 'expensive' : 'add');
            if (existing) return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
            
            // NEW: Respect the locked tier when adding new items!
            const tierToUse = lockedTier || 'Retail';
            let basePrice = product.priceRetail || 0;
            if (tierToUse === 'Ecer') basePrice = product.priceEcer || 0;
            if (tierToUse === 'Grosir') basePrice = product.priceGrosir || 0;
            if (tierToUse === 'Distributor') basePrice = product.priceDistributor || 0;

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
                if (updated.priceTier === 'Distributor') base = prod.priceDistributor || 0;
                let mult = 1;
                if (updated.unit === 'Slop') mult = prod.packsPerSlop || 10;
                if (updated.unit === 'Bal') mult = (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);
                updated.calculatedPrice = base * mult;
                return updated;
            }
            return item;
        }));
    };

    const handleWhatsAppShare = () => {
        if (!receiptData) return;
        
        let text = `*${appSettings?.companyName || "KPM INVENTORY"}*\n`;
        text += `*OFFICIAL RECEIPT*\n`;
        text += `------------------------\n`;
        text += `Date: ${receiptData.date}\n`;
        text += `Customer: ${receiptData.customer}\n`;
        text += `Payment: ${receiptData.method}\n`;
        text += `------------------------\n`;
        
        receiptData.items.forEach(item => {
            text += `${item.qty} ${item.unit} ${item.name}\n`;
            text += `   Rp ${new Intl.NumberFormat('id-ID').format(item.calculatedPrice * item.qty)}\n`;
        });
        
        text += `------------------------\n`;
        text += `*TOTAL: Rp ${new Intl.NumberFormat('id-ID').format(receiptData.total)}*\n\n`;
        text += `Thank you for your business!`;

        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleFinalDeal = () => {
        if (cart.length === 0 || !customerName.trim()) return;
        
        const finalCust = customerName.trim();
        const finalMethod = paymentMethod;
        const finalCart = [...cart];
        const finalTotal = cartTotal;

        onProcessSale(finalCust, finalMethod, finalCart);
        
        const agentFallback = user?.displayName || user?.email?.split('@')[0] || 'Admin';

        setReceiptData({
            customer: finalCust,
            method: finalMethod,
            items: finalCart,
            total: finalTotal,
            date: new Date().toLocaleString('id-ID'),
            AGENTNAME: AGENTFALLBACK
        });

        setCart([]); 
        setCustomerName("");
        setMerchantMood("deal"); 
        setMerchantMsg("Heh heh heh... Thank you, stranger!");
        setTimeout(() => setMerchantMood("idle"), 3000);
    };

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const cardNode = scrollContainerRef.current.querySelector('.product-card');
            if (cardNode) {
                const gap = window.innerWidth >= 1024 ? 24 : 12; 
                const scrollAmount = cardNode.offsetWidth + gap; 
                scrollContainerRef.current.scrollBy({
                    left: direction === 'left' ? -scrollAmount : scrollAmount,
                    behavior: 'smooth'
                });
            }
        }
    };

    const cartTotal = cart.reduce((sum, i) => sum + (i.calculatedPrice * i.qty), 0);

    const filteredItems = inventory.filter(i => 
        (activeCategory === "ALL" || i.type === activeCategory) &&
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const categories = ["ALL", ...new Set(inventory.map(i => i.type || "MISC"))];

    const renderManifestUI = (isMobile) => (
        <div className={`bg-[#e6dcc3] text-[#2a231d] shadow-2xl relative flex flex-col border-[#a89070] ${isMobile ? 'flex-1 border-t-2' : 'w-80 border-l-2'} shrink-0`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-40 pointer-events-none"></div>
            <div className="p-3 md:p-4 border-b-2 border-dashed border-[#a89070] relative z-10 text-center uppercase font-bold tracking-widest text-[#3e3226]">Manifest</div>
            
            <div className="p-3 md:p-4 relative z-[60] border-b border-[#a89070] bg-[#dfd5bc] space-y-3 md:space-y-4" ref={dropdownRef}>
                <div className="relative">
                    <label className="text-[10px] font-bold uppercase text-[#8b7256] block mb-1">Customer Name</label>
                    <input 
                        value={customerName} 
                        onFocus={() => setShowCustomerDropdown(true)}
                        onChange={(e) => setCustomerName(e.target.value)} 
                        placeholder="TYPE OR SELECT..." 
                        className="w-full bg-[#f5e6c8] border border-[#a89070] text-[#3e3226] p-2 text-xs md:text-sm font-bold uppercase outline-none rounded" 
                    />
                    {showCustomerDropdown && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-[#f5e6c8] border-2 border-[#a89070] shadow-xl rounded z-[100] max-h-48 overflow-y-auto">
                            {suggestedCustomers.map(c => (
                                <div key={c.id} onClick={() => handleCustomerSelect(c)} className="p-2 text-xs font-bold border-b border-[#a89070]/30 hover:bg-[#8b7256] hover:text-white cursor-pointer flex justify-between uppercase">
                                    <span>{c.name}</span><span className="opacity-50 text-[8px]">PROFILED</span>
                                </div>
                            ))}
                            {customerName && !suggestedCustomers.find(c => c.name.toLowerCase() === customerName.toLowerCase()) && (
                                <div onClick={() => { setShowCustomerDropdown(false); setLockedTier(null); }} className="p-2 text-xs font-bold text-orange-700 bg-orange-100/50 hover:bg-orange-200 cursor-pointer italic uppercase">
                                    Use "{customerName}" (One-time)
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase text-[#8b7256] block mb-1">Payment Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-[#f5e6c8] border border-[#a89070] text-[#3e3226] p-2 text-xs md:text-sm font-bold uppercase outline-none rounded">
                        <option value="Cash">Cash</option><option value="QRIS">QRIS</option><option value="Transfer">Transfer</option><option value="Titip">Consignment</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 md:p-3 relative z-10 space-y-2 custom-scrollbar bg-[#dfd5bc]/50">
                {cart.length === 0 ? (
                    <div className="text-center opacity-50 mt-8 font-bold uppercase text-xs md:text-sm">Manifest Empty</div>
                ) : (
                    cart.map((item, idx) => (
                        <div key={idx} className="flex flex-col border-b-2 border-dashed border-[#a89070]/30 pb-3 bg-[#f5e6c8] p-2 rounded border border-[#a89070]/50 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] md:text-xs font-black w-40 leading-tight uppercase break-words whitespace-normal text-[#3e3226]">{item.name}</span>
                                <button onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} className="text-red-800 hover:text-red-600 bg-red-100 p-1 rounded"><X size={14}/></button>
                            </div>

                           <div className="flex items-center gap-1 md:gap-2 bg-[#dfd5bc] p-1 rounded border border-[#a89070]/30">
                                <input 
                                    type="number" 
                                    value={item.qty} 
                                    onChange={(e) => updateCartItem(item.productId, 'qty', e.target.value === '' ? '' : parseInt(e.target.value))} 
                                    onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) updateCartItem(item.productId, 'qty', 1); }}
                                    className="w-10 md:w-12 bg-white border border-[#a89070] text-center text-xs md:text-sm font-bold outline-none focus:border-[#ff9d00] rounded p-1 text-[#3e3226]"
                                />
                                <select value={item.unit} onChange={(e) => updateCartItem(item.productId, 'unit', e.target.value)} className="bg-transparent text-[9px] md:text-[10px] font-bold uppercase outline-none text-[#3e3226] border-r border-[#a89070]/30 pr-1 md:pr-2"><option>Bks</option><option>Slop</option><option>Bal</option></select>
                                <select value={item.priceTier} onChange={(e) => updateCartItem(item.productId, 'priceTier', e.target.value)} disabled={!!lockedTier} className={`bg-transparent text-[9px] md:text-[10px] font-bold uppercase outline-none text-[#3e3226] pl-1 ${lockedTier ? 'opacity-50 cursor-not-allowed' : ''}`}><option>Retail</option><option>Grosir</option><option>Ecer</option><option>Distributor</option></select>
                            </div>

                          <div className="text-right text-base md:text-lg font-black font-mono mt-2 text-[#5c4b3a]"> 
                                Rp {new Intl.NumberFormat('id-ID').format(item.calculatedPrice * item.qty)} 
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="flex h-[850px] lg:h-[calc(100vh-120px)] bg-[#1a1815] text-[#d4c5a3] font-serif overflow-hidden relative border-4 border-[#3e3226] shadow-2xl">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-50 pointer-events-none"></div>
            
            <div className="lg:hidden absolute top-0 inset-x-0 h-12 flex border-b border-[#5c4b3a] bg-[#0f0e0d] z-50">
                <button onClick={() => setMobileTab('products')} className={`flex-1 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${mobileTab === 'products' ? 'bg-[#3e3226] text-[#ff9d00]' : 'text-[#5c4b3a]'}`}><ShoppingBag size={14}/> Wares</button>
                <button onClick={() => setMobileTab('merchant')} className={`flex-1 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${mobileTab === 'merchant' ? 'bg-[#3e3226] text-[#ff9d00]' : 'text-[#5c4b3a]'}`}><User size={14}/> Merchant ({cart.length})</button>
            </div>

            <div className={`w-full lg:w-[420px] flex-col z-10 border-r-4 border-[#3e3226] bg-[#0f0e0d] transition-all pt-12 lg:pt-0 shrink-0 ${mobileTab === 'merchant' ? 'flex h-full' : 'hidden lg:flex'}`}>
               
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
                    <div className="flex justify-between items-end mb-3 md:mb-4 border-b border-[#5c4b3a] pb-2 md:pb-3 font-mono">
                        <span className="text-xs md:text-sm font-bold text-[#8b7256] uppercase tracking-widest">Total Value</span>
                        <span className="text-2xl md:text-3xl lg:text-4xl font-black text-[#ff9d00] leading-none drop-shadow-sm">Rp {new Intl.NumberFormat('id-ID').format(cartTotal)}</span>
                    </div>
                    <button onClick={handleFinalDeal} disabled={cart.length === 0 || !customerName.trim()} className={`py-3 md:py-4 border-2 text-lg md:text-xl lg:text-2xl font-black uppercase tracking-[0.2em] transition-all active:translate-y-1 shadow-lg rounded flex items-center justify-center gap-2 md:gap-3 ${cart.length > 0 && customerName.trim() ? 'bg-gradient-to-r from-[#ff9d00] to-[#c47f00] border-[#ffca28] text-black hover:from-[#ffca28] hover:to-[#ff9d00]' : 'bg-[#1a1815] text-[#5c4b3a] border-[#3e3226] opacity-50 cursor-not-allowed'}`}>
                        {customerName.trim() ? <><Zap fill="black" size={20} className="md:w-6 md:h-6"/> MAKE DEAL</> : "SIGN MANIFEST >"}
                    </button>
                </div>
            </div>

            <div className={`flex-1 flex-col bg-[#161412] pt-12 lg:pt-0 overflow-hidden ${mobileTab === 'products' ? 'flex h-full' : 'hidden lg:flex'}`}>
                <div className="flex gap-2 p-2 md:p-3 bg-black border-b border-[#3e3226] overflow-x-auto scrollbar-hide shrink-0">
                    {categories.map(cat => ( <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 md:px-5 md:py-2.5 text-[10px] md:text-xs font-black uppercase whitespace-nowrap transition-all rounded-lg border-2 ${activeCategory === cat ? 'bg-[#8b7256] text-black border-[#ff9d00]' : 'bg-[#26211c] text-[#6b5845] border-[#3e3226] hover:border-[#8b7256]'}`}>{cat}</button> ))}
                </div>
                <div className="p-2 md:p-3 border-b border-[#3e3226] flex gap-3 shrink-0 bg-[#0f0e0d] items-center relative z-10">
                    <div className="relative flex-1">
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SEARCH WARES..." className="w-full bg-black/60 border-2 border-[#3e3226] p-2 md:p-3 pl-9 md:pl-10 text-[#ff9d00] font-mono text-xs md:text-sm font-bold outline-none focus:border-[#ff9d00] rounded-lg shadow-inner transition-colors"/>
                        <Search size={16} className="absolute left-3 top-2.5 md:top-3.5 text-[#8b7256]"/>
                    </div>
                    {/* PC Scroll Arrows Restored */}
                    <div className="hidden lg:flex gap-1">
                        <button onClick={() => scroll('left')} className="p-3 bg-[#26211c] border-2 border-[#3e3226] text-[#8b7256] hover:text-[#ff9d00] hover:border-[#ff9d00] rounded-lg active:scale-95 transition-all shadow-md"><ArrowLeft size={20}/></button>
                        <button onClick={() => scroll('right')} className="p-3 bg-[#26211c] border-2 border-[#3e3226] text-[#8b7256] hover:text-[#ff9d00] hover:border-[#ff9d00] rounded-lg active:scale-95 transition-all shadow-md"><ArrowRight size={20}/></button>
                    </div>
                </div>

                {/* THE MAGIC FIX: Scaled Down Dimensions for Laptop Screens */}
                <div 
                    className="flex-1 overflow-x-auto overflow-y-auto pb-4 p-3 lg:p-6 lg:pb-8 flex flex-nowrap gap-3 lg:gap-6 scrollbar-hide items-start bg-[#1a1815] relative snap-x snap-mandatory scroll-pl-3 lg:scroll-pl-6 scroll-smooth" 
                    ref={scrollContainerRef}
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
                    
                    {filteredItems.map(item => (
                        <div key={item.id} onClick={() => addToCart(item)} onContextMenu={(e) => { e.preventDefault(); onInspect(item); }} 
                            /* SCALED DOWN: Width from w-[320px] to w-[260px] */
                            className="product-card snap-start w-[160px] md:w-[240px] lg:w-[260px] shrink-0 bg-[#0f0e0d] border-2 border-[#3e3226] hover:border-[#ff9d00] transition-all flex flex-col group active:scale-[0.98] shadow-[0_10px_20px_rgba(0,0,0,0.3)] rounded-xl overflow-hidden relative z-10 h-max"
                        >
                            {/* SCALED DOWN: Image height from h-64 to h-48 */}
                            <div className="h-32 md:h-44 lg:h-48 p-3 md:p-5 flex items-center justify-center relative overflow-hidden bg-black/50 shrink-0">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#3e3226_0%,#000000_80%)] opacity-50"></div>
                                {item.images?.front ? <img src={item.images.front} className="max-h-full max-w-full object-contain sepia-[.3] group-hover:sepia-0 transition-all duration-300 drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] group-hover:scale-110" alt="product"/> : <Box size={48} className="text-[#3e3226] opacity-50"/>}
                                <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-black/80 text-[#8b7256] text-[8px] md:text-[10px] font-black px-2 py-0.5 md:px-2 md:py-1 rounded-full border border-[#3e3226] uppercase tracking-wider">
                                    {item.type || 'MISC'}
                                </div>
                            </div>
                            
                            {/* SCALED DOWN: Padding from p-5 to p-4 */}
                            <div className="flex-1 bg-gradient-to-b from-[#1a1815] to-[#0f0e0d] border-t-2 border-[#3e3226] p-3 md:p-4 flex flex-col font-mono relative">
                                
                                <h4 className="text-[#d4c5a3] text-[11px] md:text-sm font-black uppercase mb-3 line-clamp-2 h-[32px] md:h-[40px] leading-tight group-hover:text-white transition-colors" title={item.name}>
                                    {item.name}
                                </h4>
                                
                                <div className="mt-auto flex flex-col items-start md:flex-row md:justify-between md:items-end w-full gap-2 md:gap-0">
                                    <div className="flex flex-col gap-0.5 md:gap-1">
                                        <span className="text-[8px] md:text-[9px] text-[#5c4b3a] font-bold uppercase tracking-widest">In Stock</span>
                                        <span className={`text-[10px] md:text-xs font-black px-1.5 py-0.5 md:px-2 md:py-1 rounded-md border-2 inline-block ${item.stock > 0 ? 'bg-[#1a1815] text-[#8b7256] border-[#3e3226]' : 'bg-red-900/20 text-red-500 border-red-900/50'}`}>
                                            {item.stock > 0 ? `${item.stock} Units` : 'EMPTY'}
                                        </span>
                                    </div>
                                    <div className="text-left md:text-right w-full md:w-auto mt-1 md:mt-0 pt-2 md:pt-0 border-t border-[#3e3226] md:border-none">
                                        <span className="text-[8px] md:text-[9px] text-[#5c4b3a] font-bold uppercase tracking-widest block mb-0.5 md:mb-1">Ecer Price</span>
                                        {/* SCALED DOWN: Font size from 3xl to 2xl */}
                                        <span className="text-[16px] md:text-2xl font-black text-[#ff9d00] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                            {new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(item.priceEcer || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="hidden lg:flex h-full shrink-0">{renderManifestUI(false)}</div>
            
            {receiptData && (
                 <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
                     <style>{`
                         @media print { 
                             body * { visibility: hidden; } 
                             .print-receipt, .print-receipt * { visibility: visible; } 
                             .print-receipt { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none; background: white; } 
                             .no-print { display: none !important; }
                         }
                     `}</style>
                     <div className="print-receipt bg-white w-full max-w-sm shadow-2xl relative flex flex-col font-mono text-sm border-t-8 border-slate-800 animate-fade-in" style={{ color: '#000' }}>
                         
                         <div className="p-6 pb-2">
                             <div className="text-center mb-6">
                                 <h2 className="text-2xl font-black uppercase tracking-widest" style={{ color: '#000' }}>{appSettings?.companyName || "KPM INVENTORY"}</h2>
                                 <p className="text-[10px] font-bold mt-1" style={{ color: '#666' }}>OFFICIAL SALES RECEIPT</p>
                                 <p className="text-[9px] mt-1 uppercase tracking-widest" style={{ color: '#888' }}>CUSTOMER COPY</p>
                             </div>
                             
                             {/* BULLETPROOF: Forced Black Text via inline styles */}
                             <div className="bg-slate-100 rounded-lg p-4 mb-4 text-xs border border-slate-300 space-y-2 shadow-inner">
                                 <div className="flex justify-between items-center"><span style={{ color: '#555', fontWeight: 'bold' }}>DATE:</span><span style={{ color: '#000', fontWeight: '900' }}>{receiptData.date}</span></div>
                                 <div className="flex justify-between items-center"><span style={{ color: '#555', fontWeight: 'bold' }}>CUST:</span><span style={{ color: '#000', fontWeight: '900' }}>{receiptData.customer}</span></div>
                                 {/* NEW: Agent Name Displayed */}
                                 {receiptData.agentName && receiptData.agentName !== 'Admin' && (
                                     <div className="flex justify-between items-center"><span style={{ color: '#555', fontWeight: 'bold' }}>AGENT:</span><span style={{ color: '#000', fontWeight: '900', textTransform: 'uppercase' }}>{receiptData.agentName}</span></div>
                                 )}
                                 <div className="flex justify-between items-center"><span style={{ color: '#555', fontWeight: 'bold' }}>TYPE:</span><span style={{ color: '#000', fontWeight: '900', textTransform: 'uppercase' }}>{receiptData.method || 'Cash'}</span></div>
                             </div>

                             <div className="border-t-2 border-b-2 border-dashed border-gray-400 py-3 mb-4 min-h-[150px]">
                                 {receiptData.items && receiptData.items.length > 0 ? receiptData.items.map((item, i) => (
                                     <div key={i} className="mb-2">
                                         <div className="font-bold uppercase text-xs" style={{ color: '#000' }}>{item.name}</div>
                                         <div className="flex justify-between text-xs mt-0.5" style={{ color: '#555' }}>
                                             <span>{item.qty} {item.unit} x {new Intl.NumberFormat('id-ID').format(item.calculatedPrice || 0)}</span>
                                             <span style={{ color: '#000', fontWeight: 'bold' }}>{new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}</span>
                                         </div>
                                     </div>
                                 )) : null}
                             </div>

                             <div className="flex justify-between items-center text-lg font-black mb-6" style={{ color: '#000' }}>
                                 <span>TOTAL</span>
                                 <span>Rp {new Intl.NumberFormat('id-ID').format(receiptData.total || 0)}</span>
                             </div>
                             
                             <div className="text-center text-[10px] mb-4 font-bold" style={{ color: '#777' }}>
                                 <p>*** THANK YOU FOR YOUR BUSINESS ***</p>
                             </div>
                         </div>

                         {/* Action Buttons */}
                         <div className="no-print bg-gray-100 p-4 flex gap-3 border-t border-gray-300">
                             <button onClick={() => window.print()} className="flex-1 bg-black text-white py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors tracking-widest text-[10px] shadow-md">
                                 <Printer size={14}/> Print
                             </button>
                             <button onClick={handleWhatsAppShare} className="flex-1 bg-[#25D366] text-white py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:bg-[#128C7E] transition-colors tracking-widest text-[10px] shadow-md">
                                 <MessageSquare size={14}/> Share
                             </button>
                         </div>

                         {/* BULLETPROOF MASSIVE CLOSE BUTTON AT BOTTOM */}
                         <button onClick={() => { setReceiptData(null); setLockedTier(null); }} className="no-print w-full bg-red-600 hover:bg-red-700 text-white py-4 font-black uppercase tracking-[0.2em] shadow-[0_-5px_20px_rgba(0,0,0,0.2)] active:scale-95 transition-transform" style={{ color: '#fff' }}>
                             <div className="flex items-center justify-center gap-2"><X size={20}/> CLOSE RECEIPT</div>
                         </button>
                     </div>
                 </div>
            )}
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #8b7256; border-radius: 2px; } .custom-scrollbar::-webkit-scrollbar-track { background: #26211c; } .scrollbar-hide::-webkit-scrollbar { display: none; } @keyframes pulse { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; } } .animate-pulse { animation: pulse 2s infinite ease-in-out; } .animate-fade-in { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
        </div>
    );
};

export default MerchantSalesView;