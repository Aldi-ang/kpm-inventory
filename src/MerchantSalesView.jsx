import React, { useState, useEffect } from 'react';
import { Search, Box, Zap, X, DollarSign, ShoppingBag } from 'lucide-react';

const MerchantSalesView = ({ inventory, user, onProcessSale, onInspect, appSettings }) => {
    const [mobileTab, setMobileTab] = React.useState('products');
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState([]);
    const [activeCategory, setActiveCategory] = useState("ALL");
    
    // --- 2D MERCHANT STATE ---
    const [merchantMsg, setMerchantMsg] = useState("What're ya buyin'?");
    const [merchantMood, setMerchantMood] = useState("idle"); // idle, talking, deal
    const [doorsOpen, setDoorsOpen] = useState(false);

    // --- FORM STATE ---
    const [customerName, setCustomerName] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Cash");

    // --- OPEN DOORS ANIMATION ---
    useEffect(() => {
        const timer = setTimeout(() => setDoorsOpen(true), 500);
        return () => clearTimeout(timer);
    }, []);

    // --- THE MERCHANT'S AI ---
    const triggerMerchantSpeak = (type) => {
        const lines = {
            welcome: [
                "What're ya buyin'?", 
                "Got a selection of good things on sale, stranger!", 
                "Got somethin' that might interest ya'!"
            ],
            add: [
                "Heh heh heh... Thank you!", 
                "A wise choice, stranger.", 
                "Is that all, stranger?"
            ],
            expensive: [
                "Ooh! I'll buy it at a high price!", 
                "Not enough cash, stranger?",
                "Ah... rare things on sale, stranger!"
            ],
            checkout: [
                "Heh heh heh... Thank you, stranger!", 
                "Come back anytime.", 
                "Pleasure doing business."
            ]
        };

        const selectedSet = lines[type] || lines.welcome;
        const randomLine = selectedSet[Math.floor(Math.random() * selectedSet.length)];
        
        setMerchantMsg(randomLine);
        setMerchantMood("talking");
        
        // Return to idle after 2 seconds
        setTimeout(() => setMerchantMood("idle"), 2000);
    };

    // --- CART ACTIONS ---
    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            triggerMerchantSpeak(product.priceRetail > 100000 ? 'expensive' : 'add');
            
            if (existing) {
                return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { 
                productId: product.id, 
                name: product.name, 
                qty: 1, 
                unit: 'Bks', 
                priceTier: 'Retail', 
                calculatedPrice: product.priceRetail, 
                product 
            }];
        });
    };

    const updateCartItem = (id, field, val) => {
        setCart(prev => prev.map(item => {
            if (item.productId === id) {
                const updated = { ...item, [field]: val };
                // Recalculate price if unit changes
                if (field === 'unit' || field === 'priceTier') {
                    const prod = item.product;
                    let base = prod.priceRetail || 0;
                    if (updated.priceTier === 'Grosir') base = prod.priceGrosir || 0;
                    if (updated.priceTier === 'Ecer') base = prod.priceEcer || 0;
                    if (updated.priceTier === 'Distributor') base = prod.priceDistributor || 0;
                    
                    let mult = 1;
                    const packsPerSlop = prod.packsPerSlop || 10;
                    const slopsPerBal = prod.slopsPerBal || 20;

                    if (updated.unit === 'Slop') mult = packsPerSlop;
                    if (updated.unit === 'Bal') mult = slopsPerBal * packsPerSlop;
                    
                    updated.calculatedPrice = base * mult;
                }
                return updated;
            }
            return item;
        }));
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(i => i.productId !== id));
        triggerMerchantSpeak('expensive'); // Reuse "Not enough cash" vibe logic
    };
    
    const cartTotal = cart.reduce((sum, i) => sum + (i.calculatedPrice * i.qty), 0);

    const handleFinalDeal = () => {
        if (cart.length === 0) return;
        if (!customerName.trim()) {
            setMerchantMsg("I need a name for my records, stranger...");
            return;
        }
        onProcessSale(customerName, paymentMethod, cart);
        setCart([]);
        setCustomerName("");
        setPaymentMethod("Cash");
        setMerchantMood("deal");
        triggerMerchantSpeak('checkout');
    };

    const filteredItems = inventory.filter(i => 
        (activeCategory === "ALL" || i.type === activeCategory) &&
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const categories = ["ALL", ...new Set(inventory.map(i => i.type || "MISC"))];

    return (
        <div className="flex h-[calc(100vh-120px)] bg-[#1a1815] text-[#d4c5a3] font-serif overflow-hidden relative animate-fade-in select-none border-4 border-[#3e3226] shadow-2xl">
            {/* BACKGROUND TEXTURE */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-50 pointer-events-none"></div>
            
            {/* --- MOBILE TABS (NEW) --- */}
            <div className="md:hidden flex border-b border-[#5c4b3a] bg-[#0f0e0d] shrink-0">
                <button 
                    onClick={() => setMobileTab('products')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest ${mobileTab === 'products' ? 'bg-[#3e3226] text-[#ff9d00]' : 'text-[#5c4b3a]'}`}
                >
                    Wares
                </button>
                <button 
                    onClick={() => setMobileTab('merchant')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest ${mobileTab === 'merchant' ? 'bg-[#3e3226] text-[#ff9d00]' : 'text-[#5c4b3a]'}`}
                >
                    Merchant ({cart.length})
                </button>
            </div>

            {/* --- LEFT: THE MERCHANT (2D) --- */}
            <div className={`
    w-full md:w-[400px] flex-col relative z-10 border-r-4 border-[#3e3226] bg-[#0f0e0d] shadow-2xl transition-all
    ${mobileTab === 'merchant' ? 'flex h-full' : 'hidden md:flex'}
`}>
                
                {/* 2D STAGE AREA */}
                <div className="flex-1 relative overflow-hidden bg-black group">
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#5c4b3a_0%,#000000_90%)] z-0 opacity-50"></div>
                    
                    {/* MERCHANT IMAGE (Placeholder - You can replace src with your own image) */}
                    <div className={`absolute inset-0 z-10 flex items-center justify-center transition-transform duration-500 ${merchantMood === 'talking' ? 'scale-110' : 'scale-100'}`}>
                         {/* IF YOU HAVE AN IMAGE, REPLACE THE <div/> BELOW WITH: <img src="/merchant.png" className="h-full object-cover grayscale contrast-125 sepia"/> */}
                         <div className="w-64 h-64 bg-black/50 rounded-full border-4 border-[#3e3226] flex items-center justify-center shadow-[0_0_50px_#ff9d0040]">
                            <ShoppingBag size={100} className="text-[#3e3226] opacity-50"/>
                         </div>
                    </div>

                    {/* DOORS ANIMATION */}
                    <div 
                        className={`absolute top-0 bottom-0 left-0 w-1/2 bg-[#1a1815] border-r-4 border-[#2a2520] z-20 transition-transform duration-[1500ms] ease-in-out flex items-center justify-end ${doorsOpen ? '-translate-x-full' : 'translate-x-0'}`}
                        style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')" }}
                    >
                        <div className="w-2 h-16 bg-[#5c4b3a] mr-2 rounded shadow-lg border border-[#8b7256]"></div>
                    </div>

                    <div 
                        className={`absolute top-0 bottom-0 right-0 w-1/2 bg-[#1a1815] border-l-4 border-[#2a2520] z-20 transition-transform duration-[1500ms] ease-in-out flex items-center justify-start ${doorsOpen ? 'translate-x-full' : 'translate-x-0'}`}
                        style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')" }}
                    >
                        <div className="w-2 h-16 bg-[#5c4b3a] ml-2 rounded shadow-lg border border-[#8b7256]"></div>
                    </div>

                    {/* DIALOGUE BUBBLE (The Red Text) */}
                    <div className={`absolute bottom-8 left-4 right-4 z-30 transition-all duration-500 ${doorsOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <div className="bg-black/80 border-t-2 border-b-2 border-[#8b7256] p-4 text-center">
                            <p className="text-xl text-[#ff3333] font-bold tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,1)] font-serif italic animate-pulse-slow">
                                "{merchantMsg}"
                            </p>
                        </div>
                    </div>
                </div>

                {/* DEAL BUTTON AREA */}
                <div className="h-1/3 bg-[#26211c] border-t-4 border-[#5c4b3a] p-6 flex flex-col relative z-40">
                    <div className="flex justify-between items-end mb-4 border-b border-[#5c4b3a] pb-2">
                        <span className="text-sm font-bold text-[#8b7256] uppercase tracking-widest">Total Value (Rp)</span>
                        <span className="text-4xl font-bold text-[#f5e6c8] drop-shadow-md font-mono">
                            {new Intl.NumberFormat('id-ID').format(cartTotal)}
                        </span>
                    </div>

                    <button 
                        onClick={handleFinalDeal}
                        disabled={cart.length === 0 || !customerName.trim()}
                        className={`flex-1 border-2 border-[#8b7256] text-[#f5e6c8] text-xl font-bold uppercase tracking-[0.2em] transition-all shadow-lg active:translate-y-1 group relative overflow-hidden
                        ${cart.length > 0 && customerName.trim() 
                            ? 'bg-gradient-to-r from-[#5c4b3a] to-[#3e3226] hover:brightness-125' 
                            : 'bg-[#1a1815] text-[#5c4b3a] border-[#3e3226] cursor-not-allowed opacity-50'}`}
                    >
                        <span className="relative z-10">{customerName.trim() ? "DEAL" : "SIGN MANIFEST >"}</span>
                        {/* Hover Shine Effect */}
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12"></div>
                    </button>
                </div>
            </div>

            {/* --- CENTER: WARES GRID --- */}
            <div className={`
    flex-1 flex-col bg-[#161412] relative z-0
    ${mobileTab === 'products' ? 'flex h-full' : 'hidden md:flex'}
`}>
                {/* Category Tabs */}
                <div className="flex gap-1 p-2 bg-black border-b border-[#3e3226] overflow-x-auto scrollbar-hide">
                    {categories.map(cat => (
                        <button 
                            key={cat} 
                            onClick={() => setActiveCategory(cat)}
                            className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all clip-path-slant ${activeCategory === cat ? 'bg-[#8b7256] text-black' : 'bg-[#26211c] text-[#6b5845] hover:bg-[#3e3226] hover:text-[#a89070]'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-[#3e3226] flex gap-2">
                    <div className="relative flex-1">
                        <input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="SEARCH WARES..."
                            className="w-full bg-black/40 border border-[#3e3226] p-2 pl-10 text-[#d4c5a3] font-mono text-sm focus:border-[#8b7256] outline-none placeholder-[#5c4b3a]"
                        />
                        <Search size={16} className="absolute left-3 top-2.5 text-[#5c4b3a]"/>
                    </div>
                </div>

                {/* Products Grid */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-[#3e3226] scrollbar-track-black">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredItems.map(item => (
                            <div 
                                key={item.id} 
                                onClick={() => addToCart(item)}
                                onContextMenu={(e) => { e.preventDefault(); onInspect(item); }}
                                className="aspect-[4/5] bg-gradient-to-br from-[#2a231d] to-[#1a1815] border border-[#3e3226] relative group cursor-pointer hover:border-[#ff9d00] hover:shadow-[0_0_15px_rgba(255,157,0,0.2)] transition-all overflow-hidden"
                            >
                                <div className="w-full h-[65%] bg-black/20 p-4 flex items-center justify-center relative">
                                    {item.images?.front ? (
                                        <img src={item.images.front} className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-300 sepia-[.3] group-hover:sepia-0"/>
                                    ) : (
                                        <Box size={48} className="text-[#3e3226]"/>
                                    )}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Zap size={16} className="text-[#ff9d00] fill-current"/>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 inset-x-0 h-[35%] bg-[#1a1815] border-t border-[#3e3226] p-3 flex flex-col justify-between group-hover:bg-[#26211c]">
                                    <h4 className="text-[#d4c5a3] text-[10px] font-bold uppercase tracking-wide truncate">{item.name}</h4>
                                    <div className="flex justify-between items-end">
                                        <span className="text-[#5c4b3a] text-[9px] font-bold">STK: {item.stock}</span>
                                        <span className="text-[#ff9d00] text-sm font-bold font-mono">{new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(item.priceRetail)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- RIGHT: MANIFEST (PAPER STYLE) --- */}
            <div className="w-72 bg-[#e6dcc3] text-[#2a231d] shadow-2xl relative flex flex-col border-l-2 border-[#a89070]">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-40 pointer-events-none"></div>
                
                <div className="p-4 border-b-2 border-dashed border-[#a89070] relative z-10 text-center">
                    <h3 className="font-bold text-xl uppercase tracking-widest text-[#3e3226] mb-1">Manifest</h3>
                    <p className="text-[10px] font-mono opacity-60">{new Date().toLocaleString()}</p>
                </div>

                {/* INPUTS (ON PAPER) */}
                <div className="p-3 relative z-10 border-b border-[#a89070] bg-[#dfd5bc]">
                    <input 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="CUSTOMER NAME..."
                        className="w-full bg-transparent border-b border-[#8b7256] text-[#3e3226] p-1 text-xs font-bold uppercase placeholder-[#a89070] outline-none mb-2 focus:border-[#ff9d00]"
                    />
                    <select 
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full bg-transparent border-b border-[#8b7256] text-[#3e3226] p-1 text-xs font-bold uppercase outline-none"
                    >
                        <option value="Cash" className="bg-[#e6dcc3]">Cash</option>
                        <option value="QRIS" className="bg-[#e6dcc3]">QRIS</option>
                        <option value="Transfer" className="bg-[#e6dcc3]">Transfer</option>
                        <option value="Titip" className="bg-[#e6dcc3]">Consignment</option>
                    </select>
                </div>

                {/* SCROLLABLE LIST */}
                <div className="flex-1 overflow-y-auto p-2 relative z-10 space-y-1">
                    {cart.map((item, idx) => (
                        <div key={idx} className="flex flex-col border-b border-dashed border-[#a89070]/50 pb-2 mb-1 animate-fade-in-up">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold w-32 leading-tight">{item.name}</span>
                                <button onClick={() => removeFromCart(item.productId)} className="text-red-800 hover:text-red-600 font-bold px-1"><X size={12}/></button>
                            </div>
                            
                            <div className="flex items-center justify-start gap-1 mt-1">
                                <input 
                                    type="number" 
                                    value={item.qty} 
                                    onChange={(e) => updateCartItem(item.productId, 'qty', parseInt(e.target.value)||1)}
                                    className="w-8 bg-transparent border-b border-black text-center text-xs font-mono font-bold focus:bg-white/50 outline-none"
                                />
                                <select 
                                    value={item.unit} 
                                    onChange={(e) => updateCartItem(item.productId, 'unit', e.target.value)}
                                    className="bg-transparent text-[9px] font-bold uppercase outline-none w-10 text-center cursor-pointer"
                                >
                                    <option className="bg-[#e6dcc3]">Bks</option>
                                    <option className="bg-[#e6dcc3]">Slop</option>
                                    <option className="bg-[#e6dcc3]">Bal</option>
                                </select>
                                
                                <select 
                                    value={item.priceTier} 
                                    onChange={(e) => updateCartItem(item.productId, 'priceTier', e.target.value)}
                                    className="bg-transparent text-[10px] font-bold uppercase outline-none w-16 text-center cursor-pointer"
                                >
                                    <option value="Retail" className="bg-[#e6dcc3] text-black">Retail</option>
                                    <option value="Grosir" className="bg-[#e6dcc3] text-black">Grosir</option>
                                    <option value="Ecer" className="bg-[#e6dcc3] text-black">Ecer</option>
                                </select>
                            </div>
                            
                            <div className="text-right text-sm font-bold font-mono mt-1 text-[#5c4b3a]">
                                {new Intl.NumberFormat('id-ID').format(item.calculatedPrice * item.qty)}
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="text-center py-10 opacity-40 italic text-xs font-bold text-[#8b7256]">
                            [ NO ITEMS SELECTED ]
                        </div>
                    )}
                </div>

                <div className="p-2 bg-[#d4c5a3] relative z-10 border-t border-[#a89070] text-center">
                    <p className="text-[10px] font-bold uppercase text-[#5c4b3a]">KPM SYSTEM VERIFIED</p>
                </div>
            </div>

            <style>{`
                .clip-path-slant { clip-path: polygon(10% 0, 100% 0, 90% 100%, 0% 100%); }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                
                @keyframes pulse-slow {
                    0% { transform: scale(1); opacity: 0.9; }
                    50% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.9; }
                }
                .animate-pulse-slow { animation: pulse-slow 3s infinite ease-in-out; }

                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.3s ease-out; }
            `}</style>
        </div>
    );
};

export default MerchantSalesView;