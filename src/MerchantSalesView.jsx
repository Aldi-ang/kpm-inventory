import React, { useState, useEffect } from 'react';
import { Search, Box, Zap, X, DollarSign, ShoppingBag, List } from 'lucide-react';

const MerchantSalesView = ({ inventory, user, onProcessSale, onInspect, appSettings }) => {
    const [mobileTab, setMobileTab] = React.useState('products');
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState([]);
    const [activeCategory, setActiveCategory] = useState("ALL");
    
    // --- 2D MERCHANT STATE ---
    const [merchantMsg, setMerchantMsg] = useState("What're ya buyin'?");
    const [merchantMood, setMerchantMood] = useState("idle"); 
    const [doorsOpen, setDoorsOpen] = useState(false);

    // --- FORM STATE ---
    const [customerName, setCustomerName] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Cash");

    useEffect(() => {
        const timer = setTimeout(() => setDoorsOpen(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const triggerMerchantSpeak = (type) => {
        const lines = {
            welcome: ["What're ya buyin'?", "Got a selection of good things on sale, stranger!", "Got somethin' that might interest ya'!"],
            add: ["Heh heh heh... Thank you!", "A wise choice, stranger.", "Is that all, stranger?"],
            expensive: ["Ooh! I'll buy it at a high price!", "Not enough cash, stranger?", "Ah... rare things on sale, stranger!"],
            checkout: ["Heh heh heh... Thank you, stranger!", "Come back anytime.", "Pleasure doing business."]
        };
        const selectedSet = lines[type] || lines.welcome;
        const randomLine = selectedSet[Math.floor(Math.random() * selectedSet.length)];
        setMerchantMsg(randomLine);
        setMerchantMood("talking");
        setTimeout(() => setMerchantMood("idle"), 2000);
    };

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
                if (field === 'unit' || field === 'priceTier') {
                    const prod = item.product;
                    let base = prod.priceRetail || 0;
                    if (updated.priceTier === 'Grosir') base = prod.priceGrosir || 0;
                    if (updated.priceTier === 'Ecer') base = prod.priceEcer || 0;
                    if (updated.priceTier === 'Distributor') base = prod.priceDistributor || 0;
                    let mult = 1;
                    if (updated.unit === 'Slop') mult = prod.packsPerSlop || 10;
                    if (updated.unit === 'Bal') mult = (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10);
                    updated.calculatedPrice = base * mult;
                }
                return updated;
            }
            return item;
        }));
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(i => i.productId !== id));
        triggerMerchantSpeak('expensive'); 
    };
    
    const cartTotal = cart.reduce((sum, i) => sum + (i.calculatedPrice * i.qty), 0);

    const handleFinalDeal = () => {
        if (cart.length === 0 || !customerName.trim()) return;
        onProcessSale(customerName, paymentMethod, cart);
        setCart([]); setCustomerName(""); setPaymentMethod("Cash");
        setMerchantMood("deal"); triggerMerchantSpeak('checkout');
    };

    const filteredItems = inventory.filter(i => 
        (activeCategory === "ALL" || i.type === activeCategory) &&
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const categories = ["ALL", ...new Set(inventory.map(i => i.type || "MISC"))];

    // --- REUSABLE MANIFEST COMPONENT ---
    const Manifest = ({ isMobile }) => (
        <div className={`bg-[#e6dcc3] text-[#2a231d] shadow-2xl relative flex flex-col border-[#a89070] ${isMobile ? 'flex-1 border-t-2' : 'w-72 border-l-2'}`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-40 pointer-events-none"></div>
            <div className="p-4 border-b-2 border-dashed border-[#a89070] relative z-10 text-center">
                <h3 className="font-bold text-lg uppercase tracking-widest text-[#3e3226]">Manifest</h3>
                <p className="text-[9px] font-mono opacity-60">{new Date().toLocaleDateString()}</p>
            </div>
            <div className="p-3 relative z-10 border-b border-[#a89070] bg-[#dfd5bc]">
                <input 
                    value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="CUSTOMER NAME..."
                    className="w-full bg-transparent border-b border-[#8b7256] text-[#3e3226] p-1 text-xs font-bold uppercase outline-none mb-2"
                />
                <select 
                    value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-transparent border-b border-[#8b7256] text-[#3e3226] p-1 text-xs font-bold uppercase outline-none"
                >
                    <option value="Cash">Cash</option>
                    <option value="QRIS">QRIS</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Titip">Consignment</option>
                </select>
            </div>
            <div className="flex-1 overflow-y-auto p-2 relative z-10 space-y-1">
                {cart.map((item, idx) => (
                    <div key={idx} className="flex flex-col border-b border-dashed border-[#a89070]/50 pb-2 mb-1">
                        <div className="flex justify-between items-start">
                            <span className="text-[11px] font-bold w-32 leading-tight uppercase">{item.name}</span>
                            <button onClick={() => removeFromCart(item.productId)} className="text-red-800"><X size={14}/></button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="number" value={item.qty} onChange={(e) => updateCartItem(item.productId, 'qty', parseInt(e.target.value)||1)} className="w-8 bg-transparent border-b border-black text-center text-xs font-bold"/>
                            <select value={item.unit} onChange={(e) => updateCartItem(item.productId, 'unit', e.target.value)} className="bg-transparent text-[9px] font-bold uppercase">{['Bks','Slop','Bal'].map(u => <option key={u}>{u}</option>)}</select>
                            <select value={item.priceTier} onChange={(e) => updateCartItem(item.productId, 'priceTier', e.target.value)} className="bg-transparent text-[9px] font-bold uppercase">{['Retail','Grosir','Ecer'].map(t => <option key={t}>{t}</option>)}</select>
                        </div>
                        <div className="text-right text-xs font-bold font-mono mt-1 text-[#5c4b3a]">
                            {new Intl.NumberFormat('id-ID').format(item.calculatedPrice * item.qty)}
                        </div>
                    </div>
                ))}
                {cart.length === 0 && <div className="text-center py-6 opacity-30 italic text-xs">[ EMPTY MANIFEST ]</div>}
            </div>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-120px)] bg-[#1a1815] text-[#d4c5a3] font-serif overflow-hidden relative border-4 border-[#3e3226] shadow-2xl">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-50 pointer-events-none"></div>
            
            {/* MOBILE NAV */}
            <div className="md:hidden absolute top-0 inset-x-0 h-12 flex border-b border-[#5c4b3a] bg-[#0f0e0d] z-50">
                <button onClick={() => setMobileTab('products')} className={`flex-1 text-[10px] font-bold uppercase tracking-widest ${mobileTab === 'products' ? 'bg-[#3e3226] text-[#ff9d00]' : 'text-[#5c4b3a]'}`}>WARES</button>
                <button onClick={() => setMobileTab('merchant')} className={`flex-1 text-[10px] font-bold uppercase tracking-widest ${mobileTab === 'merchant' ? 'bg-[#3e3226] text-[#ff9d00]' : 'text-[#5c4b3a]'}`}>MERCHANT ({cart.length})</button>
            </div>

            {/* --- MERCHANT TAB (LEFT) --- */}
            <div className={`w-full md:w-[400px] flex-col z-10 border-r-4 border-[#3e3226] bg-[#0f0e0d] transition-all pt-12 md:pt-0 ${mobileTab === 'merchant' ? 'flex h-full' : 'hidden md:flex'}`}>
                {/* 2D STAGE: Smaller on mobile to make room for cart */}
                <div className="h-40 md:flex-1 relative overflow-hidden bg-black shrink-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#5c4b3a_0%,#000000_90%)] opacity-50"></div>
                    <div className={`absolute inset-0 flex items-center justify-center transition-transform ${merchantMood === 'talking' ? 'scale-110' : 'scale-100'}`}>
                         <div className="w-32 h-32 md:w-64 md:h-64 bg-black/50 rounded-full border-4 border-[#3e3226] flex items-center justify-center shadow-[0_0_30px_#ff9d0020]">
                            <ShoppingBag size={60} className="text-[#3e3226] opacity-50"/>
                         </div>
                    </div>
                    {/* DOORS */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1/2 bg-[#1a1815] border-r-4 border-[#2a2520] z-20 transition-transform duration-[1000ms] ${doorsOpen ? '-translate-x-full' : ''}`} style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')" }}></div>
                    <div className={`absolute top-0 bottom-0 right-0 w-1/2 bg-[#1a1815] border-l-4 border-[#2a2520] z-20 transition-transform duration-[1000ms] ${doorsOpen ? 'translate-x-full' : ''}`} style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')" }}></div>
                    <div className="absolute bottom-4 inset-x-4 z-30">
                        <div className="bg-black/80 border-t border-b border-[#8b7256] p-2 text-center">
                            <p className="text-sm md:text-lg text-[#ff3333] font-bold tracking-widest uppercase italic animate-pulse">"{merchantMsg}"</p>
                        </div>
                    </div>
                </div>

                {/* MOBILE CART VIEW */}
                <div className="md:hidden flex-1 overflow-hidden flex flex-col">
                    <Manifest isMobile={true} />
                </div>

                {/* DEAL BUTTON */}
                <div className="h-32 md:h-1/3 bg-[#26211c] border-t-4 border-[#5c4b3a] p-4 flex flex-col shrink-0">
                    <div className="flex justify-between items-end mb-2 border-b border-[#5c4b3a] pb-1">
                        <span className="text-[10px] font-bold text-[#8b7256] uppercase">Total Value (Rp)</span>
                        <span className="text-2xl md:text-4xl font-bold text-[#f5e6c8] font-mono">{new Intl.NumberFormat('id-ID').format(cartTotal)}</span>
                    </div>
                    <button 
                        onClick={handleFinalDeal}
                        disabled={cart.length === 0 || !customerName.trim()}
                        className={`flex-1 border-2 text-sm md:text-xl font-bold uppercase tracking-widest transition-all shadow-lg active:translate-y-1 ${cart.length > 0 && customerName.trim() ? 'bg-gradient-to-r from-[#5c4b3a] to-[#3e3226] border-[#8b7256] text-[#f5e6c8]' : 'bg-[#1a1815] text-[#5c4b3a] border-[#3e3226] opacity-50'}`}
                    >
                        {customerName.trim() ? "DEAL" : "SIGN MANIFEST >"}
                    </button>
                </div>
            </div>

            {/* --- WARES GRID (CENTER) --- */}
            <div className={`flex-1 flex-col bg-[#161412] pt-12 md:pt-0 ${mobileTab === 'products' ? 'flex h-full' : 'hidden md:flex'}`}>
                <div className="flex gap-1 p-2 bg-black border-b border-[#3e3226] overflow-x-auto">
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 text-[10px] font-bold uppercase whitespace-nowrap ${activeCategory === cat ? 'bg-[#8b7256] text-black' : 'bg-[#26211c] text-[#6b5845]'}`}>{cat}</button>
                    ))}
                </div>
                <div className="p-3 border-b border-[#3e3226] flex gap-2">
                    <div className="relative flex-1">
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SEARCH WARES..." className="w-full bg-black/40 border border-[#3e3226] p-2 pl-8 text-[#d4c5a3] font-mono text-xs outline-none focus:border-[#8b7256]"/>
                        <Search size={14} className="absolute left-2 top-2.5 text-[#5c4b3a]"/>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {filteredItems.map(item => (
                        <div key={item.id} onClick={() => addToCart(item)} onContextMenu={(e) => { e.preventDefault(); onInspect(item); }} className="aspect-[4/5] bg-[#1a1815] border border-[#3e3226] hover:border-[#ff9d00] transition-all flex flex-col">
                            <div className="flex-1 p-2 flex items-center justify-center relative overflow-hidden">
                                {item.images?.front ? <img src={item.images.front} className="max-h-full object-contain sepia-[.2]"/> : <Box size={32} className="text-[#3e3226]"/>}
                            </div>
                            <div className="h-12 bg-black/40 border-t border-[#3e3226] p-2 flex flex-col justify-between">
                                <h4 className="text-[#d4c5a3] text-[9px] font-bold truncate uppercase">{item.name}</h4>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#5c4b3a] text-[8px] font-bold">STK: {item.stock}</span>
                                    <span className="text-[#ff9d00] text-[10px] font-bold font-mono">{new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(item.priceRetail)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- DESKTOP MANIFEST (RIGHT) --- */}
            <div className="hidden md:flex">
                <Manifest isMobile={false} />
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                @keyframes pulse { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; } }
                .animate-pulse { animation: pulse 2s infinite ease-in-out; }
            `}</style>
        </div>
    );
};

export default MerchantSalesView;
