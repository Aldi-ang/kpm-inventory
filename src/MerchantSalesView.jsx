import React, { useState } from 'react';
import { Search, X, Box, Zap } from 'lucide-react';

const MerchantSalesView = ({ inventory, user, onProcessSale, onInspect, appSettings }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState([]);
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [merchantMsg, setMerchantMsg] = useState("What're ya buyin?");
    
    const [customerName, setCustomerName] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Cash");

    // --- MERCHANT DIALOGUE ---
    const triggerMerchantSpeak = (type) => {
        const lines = {
            welcome: ["What're ya buyin?", "Got some rare things on sale, stranger!", "Welcome!"],
            add: ["Hehehe, thank you!", "A wise choice, mate.", "Ah, I'll buy it at a high price!"],
            expensive: ["Ooooh, stranger! That's a keeper!", "Not enough cash, stranger? Heh heh."],
            checkout: ["Come back anytime.", "Is that all, stranger?", "Heh heh heh... Thank you."]
        };
        const selectedSet = lines[type] || lines.welcome;
        setMerchantMsg(selectedSet[Math.floor(Math.random() * selectedSet.length)]);
    };

    // --- CART ACTIONS ---
    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            triggerMerchantSpeak(product.priceRetail > 50000 ? 'expensive' : 'add');
            
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
                
                if (field === 'unit' || field === 'priceTier') {
                    const prod = item.product;
                    let base = prod.priceRetail || 0;
                    if (updated.priceTier === 'Grosir') base = prod.priceGrosir || 0;
                    if (updated.priceTier === 'Ecer') base = prod.priceEcer || 0;
                    if (updated.priceTier === 'Distributor') base = prod.priceDistributor || 0;
                    
                    let mult = 1;
                    const packsPerSlop = prod.packsPerSlop || 10;
                    const slopsPerBal = prod.slopsPerBal || 20;
                    const balsPerCarton = prod.balsPerCarton || 4;

                    if (updated.unit === 'Slop') mult = packsPerSlop;
                    if (updated.unit === 'Bal') mult = slopsPerBal * packsPerSlop;
                    if (updated.unit === 'Karton') mult = balsPerCarton * slopsPerBal * packsPerSlop;
                    
                    updated.calculatedPrice = base * mult;
                }
                return updated;
            }
            return item;
        }));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(i => i.productId !== id));
    
    const cartTotal = cart.reduce((sum, i) => sum + (i.calculatedPrice * i.qty), 0);

    const handleFinalDeal = () => {
        if (cart.length === 0) return;
        if (!customerName.trim()) {
            setMerchantMsg("Who are you? (Enter Name on Manifest)");
            return;
        }
        onProcessSale(customerName, paymentMethod, cart);
        setCart([]);
        setCustomerName("");
        setPaymentMethod("Cash");
        triggerMerchantSpeak('checkout');
    };

    const filteredItems = inventory.filter(i => 
        (activeCategory === "ALL" || i.type === activeCategory) &&
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const categories = ["ALL", ...new Set(inventory.map(i => i.type || "MISC"))];

    return (
        <div className="flex h-[calc(100vh-150px)] bg-[#1a1815] text-[#d4c5a3] font-serif overflow-hidden relative animate-fade-in select-none border-4 border-[#3e3226] shadow-2xl">
            {/* BACKGROUND TEXTURE */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-50 pointer-events-none"></div>
            
            {/* LEFT: MERCHANT STAGE */}
            <div className="w-1/3 flex flex-col relative z-10 border-r-4 border-[#3e3226] shadow-[10px_0_30px_rgba(0,0,0,0.8)]">
                
                {/* 3D MODEL AREA (FAKE 3D ANIMATION APPLIED) */}
                <div className="flex-1 relative bg-gradient-to-b from-black via-[#2a231d] to-black overflow-hidden flex items-end justify-center group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,165,0,0.1),transparent)] animate-pulse-slow"></div>
                    
                    {/* --- THE MERCHANT IMAGE WITH BREATHING ANIMATION --- */}
                    <img 
                        src={appSettings?.mascotImage || "/capybara.jpg"} 
                        className="h-[80%] object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-transform duration-700 hover:scale-105 animate-breathe"
                        style={{ filter: "sepia(40%) contrast(110%)" }}
                    />
                    
                    <div className="absolute top-8 left-4 right-4 bg-black/80 border-2 border-[#8b7256] p-4 rounded-lg shadow-2xl transform rotate-1">
                        <p className="text-xl text-[#ff9d00] font-bold tracking-widest text-center uppercase drop-shadow-md italic">
                            "{merchantMsg}"
                        </p>
                    </div>
                </div>

                {/* DEAL BUTTON AREA */}
                <div className="h-1/3 bg-[#26211c] border-t-4 border-[#5c4b3a] p-6 flex flex-col relative">
                    <div className="flex justify-between items-end mb-4 border-b border-[#5c4b3a] pb-2">
                        <span className="text-sm font-bold text-[#8b7256] uppercase tracking-widest">Total Pesetas (Rp)</span>
                        <span className="text-4xl font-bold text-[#f5e6c8] drop-shadow-md">
                            {new Intl.NumberFormat('id-ID').format(cartTotal)}
                        </span>
                    </div>

                    <button 
                        onClick={handleFinalDeal}
                        disabled={cart.length === 0 || !customerName.trim()}
                        className={`flex-1 border-2 border-[#8b7256] text-[#f5e6c8] text-xl font-bold uppercase tracking-[0.2em] transition-all shadow-lg active:translate-y-1 
                        ${cart.length > 0 && customerName.trim() 
                            ? 'bg-gradient-to-r from-[#5c4b3a] to-[#3e3226] hover:brightness-125' 
                            : 'bg-[#1a1815] text-[#5c4b3a] border-[#3e3226] cursor-not-allowed opacity-50'}`}
                    >
                        {customerName.trim() ? "Deal" : "Sign Manifest >"}
                    </button>
                </div>
            </div>

            {/* CENTER: WARES GRID */}
            <div className="flex-1 flex flex-col bg-[#161412] relative z-0">
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

                <div className="p-4 border-b border-[#3e3226] flex gap-2">
                    <div className="relative flex-1">
                        <input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="SEARCH WARES..."
                            className="w-full bg-black/40 border border-[#3e3226] p-2 pl-10 text-[#d4c5a3] font-mono text-sm focus:border-[#8b7256] outline-none"
                        />
                        <Search size={16} className="absolute left-3 top-2.5 text-[#5c4b3a]"/>
                    </div>
                </div>

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
                                        <img src={item.images.front} className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-300"/>
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
                                        <span className="text-[#ff9d00] text-sm font-bold font-mono">{new Intl.NumberFormat('id-ID').format(item.priceRetail)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: MANIFEST (SCROLLABLE & INPUTS ADDED) */}
            <div className="w-72 bg-[#e6dcc3] text-[#2a231d] shadow-2xl relative flex flex-col border-l-2 border-[#a89070]">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-40 pointer-events-none"></div>
                
                <div className="p-4 border-b-2 border-dashed border-[#a89070] relative z-10 text-center">
                    <h3 className="font-bold text-xl uppercase tracking-widest text-[#3e3226] mb-1">Manifest</h3>
                    <p className="text-[10px] font-mono opacity-60">{new Date().toLocaleString()}</p>
                </div>

                {/* MANIFEST INPUTS */}
                <div className="p-3 relative z-10 border-b border-[#a89070] bg-[#dfd5bc]">
                    <input 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="CUSTOMER NAME..."
                        className="w-full bg-transparent border-b border-[#8b7256] text-[#3e3226] p-1 text-xs font-bold uppercase placeholder-[#a89070] outline-none mb-2"
                    />
                    <select 
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full bg-transparent border-b border-[#8b7256] text-[#3e3226] p-1 text-xs font-bold uppercase outline-none"
                    >
                        <option value="Cash" className="bg-[#e6dcc3]">Cash</option>
                        <option value="QRIS" className="bg-[#e6dcc3]">QRIS</option>
                        <option value="Transfer" className="bg-[#e6dcc3]">Transfer</option>
                        <option value="Titip" className="bg-[#e6dcc3]">Consignment (Titip)</option>
                    </select>
                </div>

                {/* SCROLLABLE ITEMS AREA */}
                <div className="flex-1 overflow-y-auto p-2 relative z-10 space-y-1">
                    {cart.map((item, idx) => (
                        <div key={idx} className="flex flex-col border-b border-dashed border-[#a89070]/50 pb-2 mb-1">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold w-32 leading-tight">{item.name}</span>
                                <button onClick={() => removeFromCart(item.productId)} className="text-red-800 hover:text-red-600 font-bold px-1"><X size={12}/></button>
                            </div>
                            
                            {/* --- FIXED: CONTROLS MOVED TO LEFT & ALIGNED --- */}
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
                            
                            <div className="text-right text-sm font-bold font-mono mt-1">
                                {new Intl.NumberFormat('id-ID').format(item.calculatedPrice * item.qty)}
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="text-center py-10 opacity-40 italic text-sm">
                            "Not enough cash, stranger?"
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
                .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                
                /* --- BREATHING ANIMATION --- */
                @keyframes breathe {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                    100% { transform: scale(1); }
                }
                .animate-breathe {
                    animation: breathe 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default MerchantSalesView;