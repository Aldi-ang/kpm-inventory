import React, { useState, useEffect, useRef } from 'react';
import { Search, Box, Zap, X, DollarSign, ShoppingBag, List, User, ChevronDown } from 'lucide-react';

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
    const dropdownRef = useRef(null);

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

    // Filtered customer list for the dropdown
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

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            triggerMerchantSpeak(product.priceRetail > 100000 ? 'expensive' : 'add');
            if (existing) return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { 
                productId: product.id, name: product.name, qty: 1, unit: 'Bks', 
                priceTier: 'Retail', calculatedPrice: product.priceRetail, product 
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

    const handleFinalDeal = () => {
        if (cart.length === 0 || !customerName.trim()) return;
        
        // --- IMPORTANT: PASSING DATA TO APP.JSX ---
        onProcessSale(customerName.trim(), paymentMethod, cart);
        
        setCart([]); setCustomerName("");
        setMerchantMood("deal"); setMerchantMsg("Heh heh heh... Thank you, stranger!");
        setTimeout(() => setMerchantMood("idle"), 3000);
    };

    const cartTotal = cart.reduce((sum, i) => sum + (i.calculatedPrice * i.qty), 0);

    const filteredItems = inventory.filter(i => 
        (activeCategory === "ALL" || i.type === activeCategory) &&
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const categories = ["ALL", ...new Set(inventory.map(i => i.type || "MISC"))];

    // --- MANIFEST UI (INLINED TO FIX TYPING BUG) ---
    const renderManifestUI = (isMobile) => (
        <div className={`bg-[#e6dcc3] text-[#2a231d] shadow-2xl relative flex flex-col border-[#a89070] ${isMobile ? 'flex-1 border-t-2' : 'w-72 border-l-2'}`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-40 pointer-events-none"></div>
            <div className="p-4 border-b-2 border-dashed border-[#a89070] relative z-10 text-center uppercase font-bold tracking-widest text-[#3e3226]">Manifest</div>
            
            {/* SEARCHABLE CUSTOMER INPUT */}
            <div className="p-3 relative z-[60] border-b border-[#a89070] bg-[#dfd5bc]" ref={dropdownRef}>
                <div className="relative">
                    <input 
                        value={customerName} 
                        onFocus={() => setShowCustomerDropdown(true)}
                        onChange={(e) => setCustomerName(e.target.value)} 
                        placeholder="SEARCH OR TYPE NAME..." 
                        className="w-full bg-transparent border-b border-[#8b7256] text-[#3e3226] p-1 text-xs font-bold uppercase outline-none mb-2" 
                    />
                    <ChevronDown size={14} className="absolute right-1 top-1 opacity-40" />
                </div>

                {showCustomerDropdown && (
                    <div className="absolute left-0 right-0 top-full bg-[#f5e6c8] border-2 border-[#a89070] shadow-xl rounded-b-lg z-[100] max-h-48 overflow-y-auto">
                        {suggestedCustomers.map(c => (
                            <div key={c.id} onClick={() => { setCustomerName(c.name); setShowCustomerDropdown(false); }} className="p-2 text-[10px] font-bold border-b border-[#a89070]/30 hover:bg-[#8b7256] hover:text-white cursor-pointer flex justify-between uppercase">
                                <span>{c.name}</span>
                                <span className="opacity-50 text-[8px]">PROFILED</span>
                            </div>
                        ))}
                        {customerName && !suggestedCustomers.find(c => c.name.toLowerCase() === customerName.toLowerCase()) && (
                            <div onClick={() => setShowCustomerDropdown(false)} className="p-2 text-[10px] font-bold text-orange-700 bg-orange-100/50 hover:bg-orange-200 cursor-pointer italic uppercase">
                                Use "{customerName}" (One-time/Individual)
                            </div>
                        )}
                    </div>
                )}

                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-transparent border-b border-[#8b7256] text-[#3e3226] p-1 text-xs font-bold uppercase outline-none">
                    <option value="Cash">Cash</option><option value="QRIS">QRIS</option><option value="Transfer">Transfer</option><option value="Titip">Consignment</option>
                </select>
            </div>

            <div className="flex-1 overflow-y-auto p-2 relative z-10 space-y-1 custom-scrollbar">
                {cart.map((item, idx) => (
                    <div key={idx} className="flex flex-col border-b border-dashed border-[#a89070]/50 pb-2 mb-1">
                        <div className="flex justify-between items-start">
                            <span className="text-[11px] font-bold w-32 leading-tight uppercase">{item.name}</span>
                            <button onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} className="text-red-800"><X size={14}/></button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="number" value={item.qty} onChange={(e) => updateCartItem(item.productId, 'qty', parseInt(e.target.value)||1)} className="w-8 bg-transparent border-b border-black text-center text-xs font-bold"/>
                            <select value={item.unit} onChange={(e) => updateCartItem(item.productId, 'unit', e.target.value)} className="bg-transparent text-[9px] font-bold uppercase outline-none"><option>Bks</option><option>Slop</option><option>Bal</option></select>
                            <select value={item.priceTier} onChange={(e) => updateCartItem(item.productId, 'priceTier', e.target.value)} className="bg-transparent text-[9px] font-bold uppercase outline-none"><option>Retail</option><option>Grosir</option><option>Ecer</option><option>Distributor</option></select>
                        </div>
                        <div className="text-right text-xs font-bold font-mono mt-1 text-[#5c4b3a]"> {new Intl.NumberFormat('id-ID').format(item.calculatedPrice * item.qty)} </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-120px)] bg-[#1a1815] text-[#d4c5a3] font-serif overflow-hidden relative border-4 border-[#3e3226] shadow-2xl">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-50 pointer-events-none"></div>
            
            {/* MOBILE TABS */}
            <div className="md:hidden absolute top-0 inset-x-0 h-12 flex border-b border-[#5c4b3a] bg-[#0f0e0d] z-50">
                <button onClick={() => setMobileTab('products')} className={`flex-1 text-[10px] font-bold uppercase tracking-widest ${mobileTab === 'products' ? 'bg-[#3e3226] text-[#ff9d00]' : 'text-[#5c4b3a]'}`}>Wares</button>
                <button onClick={() => setMobileTab('merchant')} className={`flex-1 text-[10px] font-bold uppercase tracking-widest ${mobileTab === 'merchant' ? 'bg-[#3e3226] text-[#ff9d00]' : 'text-[#5c4b3a]'}`}>Merchant ({cart.length})</button>
            </div>

            <div className={`w-full md:w-[400px] flex-col z-10 border-r-4 border-[#3e3226] bg-[#0f0e0d] transition-all pt-12 md:pt-0 ${mobileTab === 'merchant' ? 'flex h-full' : 'hidden md:flex'}`}>
                <div className="h-48 md:flex-1 relative overflow-hidden bg-black shrink-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#5c4b3a_0%,#000000_90%)] opacity-50"></div>
                    <div className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ${merchantMood === 'talking' ? 'scale-110' : 'scale-100'}`}>
                        <div className="w-40 h-40 md:w-80 md:h-80 relative">
                            <img src={merchantMood === 'deal' ? "/deal.png" : merchantMood === 'talking' ? "/talking.png" : "/idle.png"} className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(255,157,0,0.5)]" alt="Merchant" onError={(e) => { e.target.src = "https://api.dicebear.com/7.x/pixel-art/svg?seed=Merchant"; }}/>
                        </div>
                    </div>
                    <div className={`absolute inset-y-0 left-0 w-1/2 bg-[#1a1815] border-r-4 border-[#2a2520] z-20 transition-transform duration-[1200ms] ${doorsOpen ? '-translate-x-full' : ''}`} style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')" }}></div>
                    <div className={`absolute inset-y-0 right-0 w-1/2 bg-[#1a1815] border-l-4 border-[#2a2520] z-20 transition-transform duration-[1200ms] ${doorsOpen ? 'translate-x-full' : ''}`} style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')" }}></div>
                    <div className="absolute bottom-4 inset-x-4 z-30">
                        <div className="bg-black/80 border-t border-b border-[#8b7256] p-2 text-center uppercase tracking-widest italic animate-pulse"> "{merchantMsg}" </div>
                    </div>
                </div>
                <div className="md:hidden flex-1 overflow-hidden flex flex-col">{renderManifestUI(true)}</div>
                <div className="h-32 md:h-1/3 bg-[#26211c] border-t-4 border-[#5c4b3a] p-4 flex flex-col shrink-0">
                    <div className="flex justify-between items-end mb-2 border-b border-[#5c4b3a] pb-1 font-mono">
                        <span className="text-[10px] font-bold text-[#8b7256] uppercase">Total Value (Rp)</span>
                        <span className="text-2xl md:text-4xl font-bold text-[#f5e6c8]"> {new Intl.NumberFormat('id-ID').format(cartTotal)} </span>
                    </div>
                    <button onClick={handleFinalDeal} disabled={cart.length === 0 || !customerName.trim()} className={`flex-1 border-2 text-sm md:text-xl font-bold uppercase tracking-widest transition-all active:translate-y-1 ${cart.length > 0 && customerName.trim() ? 'bg-gradient-to-r from-[#5c4b3a] to-[#3e3226] border-[#8b7256] text-[#f5e6c8]' : 'bg-[#1a1815] text-[#5c4b3a] border-[#3e3226] opacity-50'}`}> {customerName.trim() ? "DEAL" : "SIGN MANIFEST >"} </button>
                </div>
            </div>

            <div className={`flex-1 flex-col bg-[#161412] pt-12 md:pt-0 ${mobileTab === 'products' ? 'flex h-full' : 'hidden md:flex'}`}>
                <div className="flex gap-1 p-2 bg-black border-b border-[#3e3226] overflow-x-auto scrollbar-hide">
                    {categories.map(cat => ( <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 text-[10px] font-bold uppercase whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-[#8b7256] text-black' : 'bg-[#26211c] text-[#6b5845]'}`}>{cat}</button> ))}
                </div>
                <div className="p-3 border-b border-[#3e3226] flex gap-2">
                    <div className="relative flex-1">
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SEARCH WARES..." className="w-full bg-black/40 border border-[#3e3226] p-2 pl-8 text-[#d4c5a3] font-mono text-xs outline-none focus:border-[#8b7256]"/>
                        <Search size={14} className="absolute left-2 top-2.5 text-[#5c4b3a]"/>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 lg:grid-cols-4 gap-3 custom-scrollbar">
                    {filteredItems.map(item => (
                        <div key={item.id} onClick={() => addToCart(item)} onContextMenu={(e) => { e.preventDefault(); onInspect(item); }} className="aspect-[4/5] bg-[#1a1815] border border-[#3e3226] hover:border-[#ff9d00] transition-all flex flex-col group active:scale-95">
                            <div className="flex-1 p-2 flex items-center justify-center relative overflow-hidden">
                                {item.images?.front ? <img src={item.images.front} className="max-h-full object-contain sepia-[.2] group-hover:sepia-0 transition-all" alt="product"/> : <Box size={32} className="text-[#3e3226]"/>}
                            </div>
                            <div className="h-12 bg-black/40 border-t border-[#3e3226] p-2 flex flex-col justify-between font-mono">
                                <h4 className="text-[#d4c5a3] text-[9px] font-bold truncate uppercase">{item.name}</h4>
                                <div className="flex justify-between items-center text-[8px] font-bold">
                                    <span className="text-[#5c4b3a]">STK: {item.stock}</span>
                                    <span className="text-[#ff9d00]">{new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(item.priceRetail)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="hidden md:flex">{renderManifestUI(false)}</div>
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #3e3226; border-radius: 2px; } .scrollbar-hide::-webkit-scrollbar { display: none; } @keyframes pulse { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; } } .animate-pulse { animation: pulse 2s infinite ease-in-out; }`}</style>
        </div>
    );
};

export default MerchantSalesView;
