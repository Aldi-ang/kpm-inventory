import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight, Wallet, Package, Truck, ClipboardList, Lock, Calendar, RefreshCcw, Save, Store, Pencil, Trash2, MapPin, Folder, X, Edit, TrendingUp, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { getCurrentDate, getLocalDayKey} from '../utils/helpers';
import { notify } from './Toast.jsx';

// 🚀 HELPER: Safely formats decimal Bks back into "X Bks Y Btg"
export const formatSampleQty = (qtyDecimal, sticksPerPack) => {
    const sp = sticksPerPack || 16;
    const bks = Math.floor(qtyDecimal);
    const btg = Math.round((qtyDecimal - bks) * sp);
    let str = '';
    if (bks > 0) str += `${bks} Bks `;
    if (btg > 0) str += `${btg} Btg`;
    if (str === '') return '0 Bks';
    return str.trim();
};

// --- SAMPLING ANALYTICS VIEW ---
export const SamplingAnalyticsView = ({ samplings, inventory, onBack }) => {
    const [rangeType, setRangeType] = useState('monthly');
    const [targetDate, setTargetDate] = useState(getCurrentDate());

    const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    const SamplingTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[var(--raised)] p-3 border shadow-xl rounded-xl text-xs z-50 border-[var(--line)]">
                    <p className="font-bold mb-2 border-b pb-1 border-[var(--line)]">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center gap-4 mb-1">
                            <span style={{ color: entry.color }} className="font-bold">{entry.name}:</span>
                            <span className="font-mono">
                                {entry.name.includes('Cost') || entry.name.includes('Value') || entry.name.includes('Rp')
                                    ? formatRp(entry.value) 
                                    : entry.value} 
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const stats = useMemo(() => {
        const target = new Date(targetDate);
        const filtered = samplings.filter(s => {
            if(!s.date) return false;
            const sDate = new Date(s.date);
            if (rangeType === 'daily') return s.date === targetDate;
            if (rangeType === 'weekly') {
                const start = new Date(target); start.setDate(target.getDate() - target.getDay());
                const end = new Date(start); end.setDate(start.getDate() + 6);
                return sDate >= start && sDate <= end;
            }
            if (rangeType === 'monthly') return sDate.getMonth() === target.getMonth() && sDate.getFullYear() === target.getFullYear();
            if (rangeType === 'yearly') return sDate.getFullYear() === target.getFullYear();
            return false;
        });

        let totalQtyBks = 0;
        let totalQtyBatang = 0;
        let totalValueDistributor = 0; 
        let totalValueRetail = 0;      
        let totalValueGrosir = 0;
        let totalValueEcer = 0;
        
        const productBreakdown = {};
        const locationBreakdown = {};

        filtered.forEach(s => {
            const product = inventory.find(p => p.id === s.productId) || {};
            const sticksPerPack = s.sticksPerPack || product.sticksPerPack || 16;
            
            // Decimal quantity conversion (handles legacy 'Batang' records too)
            const bksEq = s.unit === 'Batang' ? (s.qty / sticksPerPack) : s.qty;
            
            totalQtyBks += Math.floor(bksEq);
            totalQtyBatang += Math.round((bksEq - Math.floor(bksEq)) * sticksPerPack);

            const cost = product.priceDistributor || 0;
            const retail = product.priceRetail || 0;
            const grosir = product.priceGrosir || 0;
            const ecer = product.priceEcer || 0;
            
            totalValueDistributor += (bksEq * cost);
            totalValueRetail += (bksEq * retail);
            totalValueGrosir += (bksEq * grosir);
            totalValueEcer += (bksEq * ecer);

            if (!productBreakdown[s.productName]) productBreakdown[s.productName] = { qty: 0, val: 0 };
            productBreakdown[s.productName].qty += bksEq; 
            productBreakdown[s.productName].val += (bksEq * cost); 

            const loc = s.reason || 'Unknown';
            if (!locationBreakdown[loc]) locationBreakdown[loc] = { qty: 0, val: 0 };
            locationBreakdown[loc].qty += bksEq;
            locationBreakdown[loc].val += (bksEq * cost);
        });

        const chartData = Object.entries(productBreakdown)
            .map(([name, data]) => ({ name, qty: Math.round(data.qty * 100)/100 + " Bks", val: data.val }))
            .sort((a, b) => b.val - a.val) 
            .slice(0, 5);

        const topLocation = Object.entries(locationBreakdown).sort((a,b) => b[1].val - a[1].val)[0];

        // 🚀 CUKAI ENGINE: Calculates how many physical packs were torn open
        const totalPitaCukai = Object.values(productBreakdown).reduce((sum, p) => sum + Math.ceil(p.qty), 0);

        return { 
            totalQtyBks, totalQtyBatang, totalValueDistributor, totalValueRetail, totalValueGrosir, totalValueEcer,
            totalPitaCukai, // 🚀 ADDED TO RETURN
            filtered, topLocation: topLocation ? { name: topLocation[0], val: topLocation[1].val } : null, chartData 
        };
    }, [samplings, rangeType, targetDate, inventory]);

    return (
        <div className="animate-fade-in space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-[var(--ink-dim)] hover:text-[var(--accent-ink)] transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Folders</button>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 bg-[var(--raised)] p-1.5 rounded-xl border border-[var(--line)]">
                    {['daily', 'weekly', 'monthly', 'yearly'].map(t => (
                        <button key={t} onClick={() => setRangeType(t)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${rangeType === t ? 'bg-[var(--gold)] text-[var(--gold-ink)] shadow-md' : 'text-[var(--ink-dim)] hover:bg-[var(--inset)] '}`}>{t}</button>
                    ))}
                </div>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="p-2.5 rounded-xl border font-bold shadow-sm border-[var(--line)]"/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-[var(--raised)] rounded-2xl text-[var(--ink)] shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet size={16} className="text-[var(--ink-dim)]"/>
                        <p className="text-[var(--ink-dim)] text-xs font-bold uppercase tracking-wider">Total Marketing Burn</p>
                    </div>
                    <h3 className="text-3xl font-bold">{formatRp(stats.totalValueDistributor)}</h3>
                    <p className="text-[10px] opacity-70 mt-1">Real Cost (Distributor Price)</p>
                </div>
                <div className="p-6 bg-[var(--raised)] rounded-2xl border shadow-sm flex flex-col justify-center border-[var(--line)]">
                    <p className="text-[var(--ink-dim)] text-xs font-bold uppercase tracking-wider mb-2">Items Distributed</p>
                    <div className="flex items-end gap-2">
                        {stats.totalQtyBks > 0 && <h3 className="text-3xl font-bold leading-none">{stats.totalQtyBks} <span className="text-lg opacity-50">Bks</span></h3>}
                        {stats.totalQtyBatang > 0 && <h3 className="text-3xl font-bold leading-none">{stats.totalQtyBatang} <span className="text-lg opacity-50">Btg</span></h3>}
                        {stats.totalQtyBks === 0 && stats.totalQtyBatang === 0 && <h3 className="text-3xl font-bold">0</h3>}
                    </div>
                </div>
                <div className="p-6 bg-[var(--sunk)] rounded-2xl border border-[var(--line)] shadow-xl flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-10"><ClipboardList size={100}/></div>
                    <div className="relative z-10">
                        <p className="text-[var(--accent-ink)] text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5"><Lock size={12}/> Physical Proof Required</p>
                        <h3 className="text-4xl font-black text-[var(--ink)] leading-none tracking-tighter my-1">{stats.totalPitaCukai} <span className="text-sm font-bold text-[var(--ink-dim)] uppercase tracking-widest">Pita Cukai</span></h3>
                        <p className="text-[11px] text-[var(--ink-dim)] font-bold uppercase mt-1">Must be collected during EOD Setoran</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-[var(--inset)] rounded-xl border border-[var(--line)]">
                    <p className="text-[var(--ink-dim)] text-[10px] font-bold uppercase mb-1">Potential if sold at ECER</p>
                    <h4 className="text-xl font-bold text-[var(--ink)]">{formatRp(stats.totalValueEcer)}</h4>
                </div>
                <div className="p-4 bg-[var(--inset)] rounded-xl border border-[var(--line)]">
                    <p className="text-[var(--ink-dim)] text-[10px] font-bold uppercase mb-1">Potential if sold at RETAIL</p>
                    <h4 className="text-xl font-bold text-[var(--ink)]">{formatRp(stats.totalValueRetail)}</h4>
                </div>
                <div className="p-4 bg-[var(--inset)] rounded-xl border border-[var(--line)]">
                    <p className="text-[var(--accent-ink)] text-[10px] font-bold uppercase mb-1">Potential if sold at GROSIR</p>
                    <h4 className="text-xl font-bold text-[var(--accent-ink)]">{formatRp(stats.totalValueGrosir)}</h4>
                </div>
            </div>

            <div className="bg-[var(--raised)] p-6 rounded-2xl border shadow-sm h-80 border-[var(--line)]">
                <h3 className="font-bold mb-4">Top 5 Products by Marketing Spend (Cost)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1}/>
                        <XAxis dataKey="name" fontSize={10} stroke="#94a3b8"/>
                        <YAxis fontSize={12} stroke="#94a3b8" tickFormatter={(value) => `Rp${value/1000}k`}/>
                        <RechartsTooltip content={<SamplingTooltip />} cursor={{fill: 'transparent'}}/>
                        <Bar dataKey="val" fill="#f97316" radius={[4, 4, 0, 0]} name="Cost (Rp)"/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- SAMPLING CART VIEW ---
export const SamplingCartView = ({ inventory, isAdmin, onCancel, onSubmit }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState([]);
    const [location, setLocation] = useState("");
    const [note, setNote] = useState("");
    const [targetDate, setTargetDate] = useState(getLocalDayKey());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) return prev.map(i => i.id === item.id ? { ...i, qtyBks: i.qtyBks + 1 } : i);
            // 🚀 DUAL INPUT STATE SETUP
            return [...prev, { id: item.id, name: item.name, qtyBks: 1, qtyBatang: 0, sticksPerPack: item.sticksPerPack || 16 }];
        });
    };

    const updateCartQty = (id, field, delta) => setCart(prev => prev.map(i => {
        if (i.id === id) {
            let newVal = i[field] + delta;
            if (newVal < 0) newVal = 0;
            
            // Smart rollover math (e.g. 16 Batang -> 1 Bks)
            if (field === 'qtyBatang' && newVal >= i.sticksPerPack) {
                return { ...i, qtyBks: i.qtyBks + 1, qtyBatang: newVal - i.sticksPerPack };
            }
            if (field === 'qtyBatang' && newVal < 0 && i.qtyBks > 0) {
                return { ...i, qtyBks: i.qtyBks - 1, qtyBatang: i.sticksPerPack - 1 };
            }
            return { ...i, [field]: Math.max(0, newVal) };
        }
        return i;
    }));

    const handleDirectQtyInput = (id, field, val) => setCart(prev => prev.map(i => i.id === id ? { ...i, [field]: parseInt(val) || 0 } : i));
    const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

    const handleFinalSubmit = async () => {
        if (!location.trim()) { notify("Please enter a Folder/Location name!"); return; }
        if (cart.length === 0) return;
        setIsSubmitting(true);
        
        // 🚀 COMBINE BKS AND BATANG INTO A SINGLE DECIMAL BKS FOR DATABASE
        const finalCart = cart.map(i => ({
            id: i.id,
            name: i.name,
            qty: i.qtyBks + (i.qtyBatang / i.sticksPerPack), // fractional math
            unit: 'Bks', // always send as Bks so App.jsx handles it flawlessly
            sticksPerPack: i.sticksPerPack
        }));
        
        await onSubmit(finalCart, location, targetDate, note);
        setIsSubmitting(false);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] animate-fade-in">
            <div className="lg:w-2/3 flex flex-col">
                <div className="flex gap-4 mb-4">
                    <button onClick={onCancel} className="p-3 bg-[var(--raised)] rounded-xl border text-[var(--ink-dim)] hover:text-[var(--accent-ink)] border-[var(--line)]"><ArrowRight className="rotate-180"/></button>
                    <input className="flex-1 bg-[var(--raised)] p-3 rounded-xl border border-[var(--line)]" placeholder="Search item to sample..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                </div>
                <div className="flex-1 overflow-y-auto bg-[var(--sunk)] rounded-2xl p-4 border border-[var(--line)]">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredInventory.map(item => (
                            <div key={item.id} onClick={() => addToCart(item)} className="bg-[var(--raised)] p-4 rounded-xl shadow-sm border cursor-pointer hover:border-[var(--accent-edge)] group transition-all border-[var(--line)]">
                                <h4 className="font-bold text-sm truncate">{item.name}</h4>
                                <p className="text-xs text-[var(--ink-dim)]">{item.stock} in Vault</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="lg:w-1/3 flex flex-col bg-[var(--raised)] rounded-2xl shadow-xl border overflow-hidden border-[var(--line)]">
                <div className="p-5 bg-[var(--sunk)] text-[var(--ink)]">
                    <h3 className="font-bold flex items-center gap-2"><ClipboardList className="text-[var(--accent-ink)]"/> Sampling Basket</h3>
                    <p className="text-xs text-[var(--ink-dim)] mt-1">Items will be grouped by description.</p>
                </div>
                <div className="p-4 border-b space-y-3 bg-[var(--inset)] border-[var(--line)]">
                    <div><label className="text-[10px] uppercase font-bold text-[var(--ink-dim)] mb-1 block">Folder Name / Location</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Pasar Sraten" className="w-full p-2.5 rounded-lg border-2 border-[var(--accent-edge)] focus:border-[var(--accent-edge)] font-bold text-sm" /></div>
                    <div><label className="text-[10px] uppercase font-bold text-[var(--ink-dim)] mb-1 block">Description / Store Name (Optional)</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Toko Bayu" className="w-full p-2.5 rounded-lg border border-[var(--line)] text-sm" /></div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-[var(--ink-dim)] mb-1 block flex justify-between"><span>Date</span>{!isAdmin && <span className="text-[var(--danger-ink)] flex items-center gap-1"><Lock size={10}/> Locked</span>}</label>
                        <div className="relative">
                            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} disabled={!isAdmin} className={`w-full p-2.5 rounded-lg border    text-sm font-bold ${!isAdmin ? 'opacity-60 cursor-not-allowed bg-[var(--inset)] ' : ''}`} />
                            <Calendar className="absolute right-3 top-2.5 text-[var(--ink-dim)] pointer-events-none" size={18}/>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--ink-dim)] opacity-50"><Truck size={48} className="mb-2"/><p className="text-sm font-bold">Basket is empty</p></div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="p-3 bg-[var(--sunk)] rounded-xl border animate-fade-in-up flex flex-col gap-3 border-[var(--line)]">
                                <div className="flex justify-between items-start border-b pb-2 border-[var(--line)]">
                                    <h4 className="font-bold text-sm flex-1 pr-2">{item.name}</h4>
                                    <button data-kpm-del data-label="Delete" onClick={() => removeFromCart(item.id)} className="text-[var(--ink-dim)] hover:text-[var(--danger-ink)]"><Trash2 size={16}/></button>
                                </div>
                                <div className="flex items-center justify-between">
                                    {/* 🚀 BKS INPUT */}
                                    <div className="flex flex-col items-center">
                                        <span className="text-[11px] text-[var(--ink-dim)] uppercase font-bold mb-1">Bungkus</span>
                                        <div className="flex items-center bg-[var(--sunk)] rounded-lg p-1 border border-[var(--line)]">
                                            <button onClick={() => updateCartQty(item.id, 'qtyBks', -1)} className="w-6 h-6 flex items-center justify-center bg-[var(--raised)] rounded shadow-sm text-[var(--ink-dim)] font-bold hover:bg-[var(--inset)] transition-colors">-</button>
                                            <input type="number" min="0" value={item.qtyBks} onChange={e => handleDirectQtyInput(item.id, 'qtyBks', e.target.value)} className="w-10 bg-transparent text-center text-sm font-bold text-[var(--ink)] outline-none appearance-none" />
                                            <button onClick={() => updateCartQty(item.id, 'qtyBks', 1)} className="w-6 h-6 flex items-center justify-center bg-[var(--raised)] rounded shadow-sm text-[var(--ink-dim)] font-bold hover:bg-[var(--inset)] transition-colors">+</button>
                                        </div>
                                    </div>
                                    <span className="text-xl text-[var(--ink-dim)] font-black">+</span>
                                    {/* 🚀 BATANG INPUT */}
                                    <div className="flex flex-col items-center">
                                        <span className="text-[11px] text-[var(--ink-dim)] uppercase font-bold mb-1">Batang</span>
                                        <div className="flex items-center bg-[var(--sunk)] rounded-lg p-1 border border-[var(--line)]">
                                            <button onClick={() => updateCartQty(item.id, 'qtyBatang', -1)} className="w-6 h-6 flex items-center justify-center bg-[var(--raised)] rounded shadow-sm text-[var(--ink-dim)] font-bold hover:bg-[var(--inset)] transition-colors">-</button>
                                            <input type="number" min="0" max={item.sticksPerPack} value={item.qtyBatang} onChange={e => handleDirectQtyInput(item.id, 'qtyBatang', e.target.value)} className="w-10 bg-transparent text-center text-sm font-bold text-[var(--ink)] outline-none appearance-none" />
                                            <button onClick={() => updateCartQty(item.id, 'qtyBatang', 1)} className="w-6 h-6 flex items-center justify-center bg-[var(--raised)] rounded shadow-sm text-[var(--ink-dim)] font-bold hover:bg-[var(--inset)] transition-colors">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-4 border-t border-[var(--line)]">
                    <button onClick={handleFinalSubmit} disabled={isSubmitting || cart.length === 0} className={`w-full py-4 rounded-xl font-bold text-[var(--ink)] shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${isSubmitting ? 'bg-[var(--ink-disabled)]' : 'bg-[var(--gold)] hover:brightness-110'}`}>
                        {isSubmitting ? <RefreshCcw className="animate-spin"/> : <Save size={20}/>}
                        {isSubmitting ? 'Saving...' : `Save ${cart.length} Products`}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- SAMPLING FOLDER VIEW (BUG FIXED) ---
export const SamplingFolderView = ({ samplings, isAdmin, onRecordSample, onDelete, onEdit, onEditFolder, onShowAnalytics }) => {
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const folderStructure = useMemo(() => {
        const structure = {};
        samplings.forEach(s => {
            if (!s.date) return;
            const d = new Date(s.date);
            const year = isNaN(d.getFullYear()) ? "Unknown" : d.getFullYear().toString();
            const month = isNaN(d.getMonth()) ? "Unknown" : monthNames[d.getMonth()];
            
            if (!structure[year]) structure[year] = {};
            if (!structure[year][month]) structure[year][month] = {};
            if (!structure[year][month][s.date]) structure[year][month][s.date] = {};
            
            const loc = s.reason ? s.reason.trim() : 'Unspecified';
            if (!structure[year][month][s.date][loc]) structure[year][month][s.date][loc] = [];
            structure[year][month][s.date][loc].push(s);
        });
        return structure;
    }, [samplings]);

    if (selectedYear && selectedMonth && selectedDate && selectedLocation) {
        const items = folderStructure[selectedYear][selectedMonth][selectedDate][selectedLocation] || [];
        const groupedItems = items.reduce((groups, item) => {
            const noteKey = item.note ? item.note.trim() : "General / No Description";
            if (!groups[noteKey]) groups[noteKey] = [];
            groups[noteKey].push(item);
            return groups;
        }, {});

        return (
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setSelectedLocation(null)} className="flex items-center gap-2 text-[var(--ink-dim)] hover:text-[var(--accent-ink)] transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Locations</button>
                    {isAdmin && (
                        <button onClick={() => onEditFolder(selectedDate, selectedLocation)} className="flex items-center gap-2 bg-[var(--inset)] px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--ink-dim)] hover:bg-[var(--inset)] hover:text-[var(--accent-ink)] transition-colors">
                            <Edit size={14}/> Edit Folder
                        </button>
                    )}
                </div>
                <div className="bg-[var(--raised)] rounded-2xl shadow-xl border overflow-hidden border-[var(--line)]">
                    <div className="bg-[var(--sunk)] text-[var(--ink)] p-8">
                        <p className="text-[var(--accent-ink)] font-bold tracking-widest text-xs uppercase mb-1">{selectedDate}</p>
                        <h1 className="text-3xl font-bold font-serif">{selectedLocation}</h1>
                        <p className="text-[var(--ink-dim)] text-sm mt-2">{items.length} Total Items Sampled</p>
                    </div>
                    <div className="p-8 space-y-8">
                        {Object.entries(groupedItems).map(([noteGroup, groupItems]) => (
                            <div key={noteGroup} className="bg-[var(--sunk)]/50 rounded-xl border overflow-hidden border-[var(--line)]">
                                <div className="bg-[var(--inset)] px-4 py-3 border-b flex justify-between items-center border-[var(--line)]">
                                    <h3 className="font-bold text-[var(--ink)] flex items-center gap-2"><Store size={16} className="text-[var(--accent-ink)]"/> {noteGroup}</h3>
                                    <span className="text-xs bg-[var(--inset)] px-2 py-1 rounded text-[var(--ink-dim)]">{groupItems.length} items</span>
                                </div>
                                <table className="w-full text-sm text-left">
                                    <tbody className="divide-y divide-[var(--line)]">
                                        {groupItems.map(s => (
                                            <tr key={s.id} className="hover:bg-black/5 transition-colors">
                                                <td className="p-3 font-medium pl-4">{s.productName}</td>
                                                {/* 🚀 NEW FORMATTED OUTPUT */}
                                                <td className="p-3 text-right font-bold text-[var(--accent-ink)]">
                                                    -{formatSampleQty(s.unit === 'Batang' ? (s.qty / (s.sticksPerPack||16)) : s.qty, s.sticksPerPack)}
                                                </td>
                                                <td className="p-3 text-right flex justify-end gap-2 pr-4">
                                                    {isAdmin && (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); onEdit(s); }} className="p-1.5 text-[var(--ink-dim)] hover:bg-[var(--inset)] rounded transition-colors"><Pencil size={14}/></button>
                                                            <button data-kpm-del data-label="Delete" onClick={(e) => { e.stopPropagation(); onDelete(s); }} className="p-1.5 text-[var(--ink-dim)] hover:text-[var(--danger-ink)] hover:bg-[var(--danger-well)] rounded transition-colors"><Trash2 size={14}/></button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (selectedYear && selectedMonth && selectedDate) {
        const locations = Object.keys(folderStructure[selectedYear][selectedMonth][selectedDate] || {});
        return (
            <div className="animate-fade-in">
                <button onClick={() => setSelectedDate(null)} className="mb-6 flex items-center gap-2 text-[var(--ink-dim)] hover:text-[var(--accent-ink)] transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to {selectedMonth}</button>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Calendar size={24} className="text-[var(--accent-ink)]"/> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {locations.map(loc => (
                        <button key={loc} onClick={() => setSelectedLocation(loc)} className="w-full text-left bg-[var(--raised)] p-6 rounded-xl border shadow-sm cursor-pointer hover:shadow-md hover:border-[var(--accent-edge)] group transition-all border-[var(--line)]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[var(--inset)] rounded-lg text-[var(--accent-ink)] group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-ink)] transition-colors"><MapPin size={24} /></div>
                                <div><h3 className="font-bold text-lg group-hover:text-[var(--accent-ink)] transition-colors">{loc}</h3><p className="text-xs text-[var(--ink-dim)]">{folderStructure[selectedYear][selectedMonth][selectedDate][loc].length} Items</p></div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (selectedYear && selectedMonth) {
        const dates = Object.keys(folderStructure[selectedYear][selectedMonth] || {}).sort((a,b) => new Date(b) - new Date(a));
        return (
            <div className="animate-fade-in">
                <button onClick={() => setSelectedMonth(null)} className="mb-6 flex items-center gap-2 text-[var(--ink-dim)] hover:text-[var(--accent-ink)] transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to {selectedYear}</button>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Folder size={24} className="text-[var(--accent-ink)]"/> {selectedMonth} {selectedYear}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {dates.map(date => {
                        const locCount = Object.keys(folderStructure[selectedYear][selectedMonth][date] || {}).length;
                        return (
                            <button key={date} onClick={() => setSelectedDate(date)} className="w-full text-center bg-[var(--raised)] p-4 rounded-xl border shadow-sm cursor-pointer hover:shadow-md hover:border-[var(--accent-edge)] group transition-all border-[var(--line)]">
                                <div className="w-12 h-12 mx-auto bg-[var(--inset)] rounded-full flex items-center justify-center text-[var(--accent-ink)] group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-ink)] transition-colors mb-3"><span className="font-bold text-lg">{new Date(date).getDate()}</span></div>
                                <h3 className="font-bold text-sm">{new Date(date).toLocaleDateString('en-US', {weekday:'short'})}</h3>
                                <p className="text-[10px] text-[var(--ink-dim)] mt-1">{locCount} Locations</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (selectedYear) {
        const months = Object.keys(folderStructure[selectedYear] || {});
        months.sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b));
        return (
            <div className="animate-fade-in">
                <button onClick={() => setSelectedYear(null)} className="mb-6 flex items-center gap-2 text-[var(--ink-dim)] hover:text-[var(--accent-ink)] transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Years</button>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Folder size={24} className="text-[var(--accent-ink)]"/> {selectedYear} Archives</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {months.map(month => (
                        <button key={month} onClick={() => setSelectedMonth(month)} className="w-full text-left bg-[var(--raised)] p-6 rounded-xl border shadow-sm cursor-pointer hover:shadow-md hover:border-[var(--accent-edge)] group transition-all border-[var(--line)]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[var(--inset)] rounded-lg text-[var(--accent-ink)] group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-ink)] transition-colors"><Folder size={24} /></div>
                                <div><h3 className="font-bold text-lg">{month}</h3><p className="text-xs text-[var(--ink-dim)]">{Object.keys(folderStructure[selectedYear][month] || {}).length} Dates Recorded</p></div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const years = Object.keys(folderStructure).sort((a, b) => b - a);
    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Folder size={24} className="text-[var(--accent-ink)]"/> Sampling Archives</h2>
                <div className="flex gap-2">
                    {isAdmin && (
                        <button onClick={onRecordSample} className="flex items-center gap-2 bg-[var(--gold)] hover:brightness-110 text-[var(--ink)] px-4 py-2 rounded-lg font-bold shadow-lg transition-all">
                            <Plus size={18}/> New Sample
                        </button>
                    )}
                    <button onClick={onShowAnalytics} className="flex items-center gap-2 bg-[var(--gold)] hover:brightness-110 text-[var(--ink)] px-4 py-2 rounded-lg font-bold shadow-lg transition-all"><TrendingUp size={18}/> View Analytics</button>
                </div>
            </div>
            {years.length === 0 ? (
                 <div className="text-center py-20 text-[var(--ink-dim)]"><Folder size={48} className="mx-auto mb-4 opacity-20"/><p>No sampling records found.</p></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {years.map(year => (
                        <button key={year} onClick={() => setSelectedYear(year)} className="w-full text-left block bg-[var(--raised)] border border-[var(--line)] text-[var(--ink)] p-6 rounded-xl shadow-lg cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:border-[var(--accent-edge)] transition-all duration-300 relative overflow-hidden group">
                            <Folder size={100} className="absolute -right-6 -bottom-6 text-[var(--accent-edge)] opacity-60 group-hover:opacity-100 group-hover:-rotate-6 group-hover:scale-110 transition-all duration-300 pointer-events-none origin-bottom-right"/>
                            <div className="relative z-10 pointer-events-none"><h3 className="text-3xl font-bold mb-1">{year}</h3><div className="h-1 w-12 bg-[var(--gold)] rounded mb-3 group-hover:w-20 transition-all duration-300"></div><p className="text-sm text-[var(--ink-dim)] font-mono">{Object.keys(folderStructure[year] || {}).length} Months Active</p></div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- SAMPLE ENTRY MODAL ---
export const SampleEntryModal = ({ isOpen, onClose, onSubmit, initialData, inventory }) => {
    const [formData, setFormData] = useState({ date: getCurrentDate(), reason: '', productId: '', productName: '', qtyBks: 1, qtyBatang: 0, note: '' });

    useEffect(() => {
        if (initialData && !initialData.isNew) {
            const sp = initialData.sticksPerPack || 16;
            // Decode legacy 'Batang' tags into fractional math, just in case
            const totalDecimalBks = initialData.unit === 'Batang' ? (initialData.qty / sp) : initialData.qty;
            const bks = Math.floor(totalDecimalBks);
            const btg = Math.round((totalDecimalBks - bks) * sp);

            setFormData({
                ...initialData,
                qtyBks: bks,
                qtyBatang: btg,
                date: initialData.date || getCurrentDate(),
                note: initialData.note || '',
                reason: initialData.reason || ''
            });
        } else {
            setFormData({ date: getCurrentDate(), reason: '', productId: '', productName: '', qtyBks: 1, qtyBatang: 0, note: '' });
        }
    }, [initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const product = inventory.find(p => p.id === formData.productId);
        const sp = product ? (product.sticksPerPack || 16) : (initialData?.sticksPerPack || 16);
        
        // Encode into the universal fractional Bks engine
        const totalQty = formData.qtyBks + (formData.qtyBatang / sp);

        onSubmit({ 
            ...formData, 
            qty: totalQty,
            unit: 'Bks', // Forces backend to use the Bks deduction
            sticksPerPack: sp,
            productName: product ? product.name : formData.productName 
        });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[var(--raised)] w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-[var(--ink-dim)] hover:text-[var(--danger-ink)]"><X size={20}/></button>
                <h2 className="text-xl font-bold mb-4">{initialData?.isNew ? 'New Sample Entry' : 'Edit Sample Details'}</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    <div className="grid grid-cols-1 gap-2 mb-2">
                        <label className="text-xs font-bold text-[var(--ink-dim)]">Date</label>
                        <input type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full p-2 border rounded border-[var(--line)]" required/>
                    </div>

                    {/* 🚀 NEW: DUAL INPUT BUNGKUS & BATANG UI */}
                    <div className="grid grid-cols-2 gap-4 bg-[var(--sunk)] p-3 rounded-xl border border-[var(--line)]">
                        <div>
                            <label className="text-[10px] font-bold text-[var(--ink-dim)] uppercase tracking-widest mb-1 block text-center">Bungkus</label>
                            <input type="number" min="0" value={formData.qtyBks} onChange={e=>setFormData({...formData, qtyBks: parseInt(e.target.value)||0})} className="w-full p-2 border rounded text-center font-bold text-lg border-[var(--line)]" required/>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-[var(--ink-dim)] uppercase tracking-widest mb-1 block text-center">Batang</label>
                            <input type="number" min="0" value={formData.qtyBatang} onChange={e=>setFormData({...formData, qtyBatang: parseInt(e.target.value)||0})} className="w-full p-2 border rounded text-center font-bold text-lg text-[var(--accent-ink)] border-[var(--line)]" required/>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[var(--ink-dim)]">Product</label>
                        <select 
                            value={formData.productId} 
                            onChange={e=>setFormData({...formData, productId: e.target.value})} 
                            className="w-full p-2 border rounded border-[var(--line)]" 
                            required
                        >
                            <option value="">Select Product...</option>
                            {inventory.map(p => (
                                <option key={p.id} value={p.id}>{p.name} {p.sticksPerPack ? `(${p.sticksPerPack} Btg)` : ''}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[var(--ink-dim)]">Location / Store Name</label>
                        <input value={formData.reason} onChange={e=>setFormData({...formData, reason: e.target.value})} className="w-full p-2 border rounded border-[var(--line)]" placeholder="e.g. Toko Berkah" required/>
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-[var(--ink-dim)]">Notes (Folder Group)</label>
                        <input value={formData.note} onChange={e=>setFormData({...formData, note: e.target.value})} className="w-full p-2 border rounded border-[var(--line)]" placeholder="e.g. Area 1"/>
                    </div>
                    
                    <button className="w-full py-3 bg-[var(--gold)] hover:brightness-110 text-[var(--ink)] font-bold rounded-xl mt-2 shadow-lg">
                        {initialData?.isNew ? 'Add to Folder' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};