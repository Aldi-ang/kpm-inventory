import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight, Wallet, Package, Truck, ClipboardList, Lock, Calendar, RefreshCcw, Save, Store, Pencil, Trash2, MapPin, Folder, X, Edit, TrendingUp, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { getCurrentDate } from '../utils/helpers';

// --- SAMPLING ANALYTICS VIEW ---
export const SamplingAnalyticsView = ({ samplings, inventory, onBack }) => {
    const [rangeType, setRangeType] = useState('monthly');
    const [targetDate, setTargetDate] = useState(getCurrentDate());

    const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    const SamplingTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 border dark:border-slate-600 shadow-xl rounded-xl text-xs z-50">
                    <p className="font-bold mb-2 border-b pb-1 dark:border-slate-600 dark:text-white">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center gap-4 mb-1">
                            <span style={{ color: entry.color }} className="font-bold">{entry.name}:</span>
                            <span className="font-mono dark:text-slate-300">
                                {entry.name.includes('Cost') || entry.name.includes('Value') || entry.name.includes('Rp')
                                    ? formatRp(entry.value) 
                                    : `${entry.value} Bks`} 
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

        let totalQty = 0;
        let totalValueDistributor = 0; 
        let totalValueRetail = 0;      
        let totalValueGrosir = 0;
        let totalValueEcer = 0;
        
        const productBreakdown = {};
        const locationBreakdown = {};

        filtered.forEach(s => {
            const product = inventory.find(p => p.id === s.productId) || {};
            const cost = product.priceDistributor || 0;
            const retail = product.priceRetail || 0;
            const grosir = product.priceGrosir || 0;
            const ecer = product.priceEcer || 0;
            
            totalQty += s.qty;
            totalValueDistributor += (s.qty * cost);
            totalValueRetail += (s.qty * retail);
            totalValueGrosir += (s.qty * grosir);
            totalValueEcer += (s.qty * ecer);

            if (!productBreakdown[s.productName]) productBreakdown[s.productName] = { qty: 0, val: 0 };
            productBreakdown[s.productName].qty += s.qty;
            productBreakdown[s.productName].val += (s.qty * cost); 

            const loc = s.reason || 'Unknown';
            if (!locationBreakdown[loc]) locationBreakdown[loc] = { qty: 0, val: 0 };
            locationBreakdown[loc].qty += s.qty;
            locationBreakdown[loc].val += (s.qty * cost);
        });

        const chartData = Object.entries(productBreakdown)
            .map(([name, data]) => ({ name, qty: data.qty, val: data.val }))
            .sort((a, b) => b.val - a.val) 
            .slice(0, 5);

        const topLocation = Object.entries(locationBreakdown).sort((a,b) => b[1].val - a[1].val)[0];

        return { 
            totalQty, totalValueDistributor, totalValueRetail, totalValueGrosir, totalValueEcer,
            filtered, topLocation: topLocation ? { name: topLocation[0], val: topLocation[1].val } : null, chartData 
        };
    }, [samplings, rangeType, targetDate, inventory]);

    return (
        <div className="animate-fade-in space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Folders</button>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border dark:border-slate-700">
                    {['daily', 'weekly', 'monthly', 'yearly'].map(t => (
                        <button key={t} onClick={() => setRangeType(t)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${rangeType === t ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{t}</button>
                    ))}
                </div>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold shadow-sm"/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet size={16} className="text-blue-200"/>
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Total Marketing Burn</p>
                    </div>
                    <h3 className="text-3xl font-bold">{formatRp(stats.totalValueDistributor)}</h3>
                    <p className="text-[10px] opacity-70 mt-1">Real Cost (Distributor Price)</p>
                </div>
                <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 shadow-sm">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Items Distributed</p>
                    <h3 className="text-3xl font-bold dark:text-white">{stats.totalQty} <span className="text-lg opacity-50">Bks</span></h3>
                </div>
                <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 shadow-sm">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Top Location (By Spend)</p>
                    <h3 className="text-lg font-bold dark:text-white truncate">{stats.topLocation?.name || '-'}</h3>
                    <p className="text-sm font-bold text-orange-500">{stats.topLocation ? formatRp(stats.topLocation.val) : '-'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                    <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase mb-1">Potential if sold at ECER</p>
                    <h4 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{formatRp(stats.totalValueEcer)}</h4>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                    <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase mb-1">Potential if sold at RETAIL</p>
                    <h4 className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatRp(stats.totalValueRetail)}</h4>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/50">
                    <p className="text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase mb-1">Potential if sold at GROSIR</p>
                    <h4 className="text-xl font-bold text-orange-700 dark:text-orange-300">{formatRp(stats.totalValueGrosir)}</h4>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700 shadow-sm h-80">
                <h3 className="font-bold mb-4 dark:text-white">Top 5 Products by Marketing Spend (Cost)</h3>
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
    const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { id: item.id, name: item.name, qty: 1 }];
        });
    };

    const updateQty = (id, delta) => setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
    const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

    const handleFinalSubmit = async () => {
        if (!location.trim()) { alert("Please enter a Folder/Location name!"); return; }
        if (cart.length === 0) return;
        setIsSubmitting(true);
        await onSubmit(cart, location, targetDate, note);
        setIsSubmitting(false);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] animate-fade-in">
            <div className="lg:w-2/3 flex flex-col">
                <div className="flex gap-4 mb-4">
                    <button onClick={onCancel} className="p-3 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 text-slate-500 hover:text-orange-500"><ArrowRight className="rotate-180"/></button>
                    <input className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-xl border dark:border-slate-700 dark:text-white" placeholder="Search item to sample..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                </div>
                <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 rounded-2xl p-4 border dark:border-slate-700">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredInventory.map(item => (
                            <div key={item.id} onClick={() => addToCart(item)} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border dark:border-slate-700 cursor-pointer hover:border-orange-500 group transition-all">
                                <h4 className="font-bold text-sm dark:text-white truncate">{item.name}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{item.stock} in stock</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="lg:w-1/3 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 overflow-hidden">
                <div className="p-5 bg-slate-900 text-white">
                    <h3 className="font-bold flex items-center gap-2"><ClipboardList className="text-orange-500"/> Sampling Basket</h3>
                    <p className="text-xs text-slate-400 mt-1">Items will be grouped by description.</p>
                </div>
                <div className="p-4 border-b dark:border-slate-700 space-y-3 bg-orange-50 dark:bg-slate-800/50">
                    <div><label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Folder Name / Location</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Pasar Sraten" className="w-full p-2.5 rounded-lg border-2 border-orange-200 focus:border-orange-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white font-bold text-sm" /></div>
                    <div><label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Description / Store Name (Optional)</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Toko Bayu" className="w-full p-2.5 rounded-lg border border-slate-300 dark:bg-slate-900 dark:border-slate-600 dark:text-white text-sm" /></div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block flex justify-between"><span>Date</span>{!isAdmin && <span className="text-red-400 flex items-center gap-1"><Lock size={10}/> Locked</span>}</label>
                        <div className="relative">
                            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} disabled={!isAdmin} className={`w-full p-2.5 rounded-lg border dark:bg-slate-900 dark:border-slate-600 dark:text-white text-sm font-bold ${!isAdmin ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`} />
                            <Calendar className="absolute right-3 top-2.5 text-slate-400 dark:text-white pointer-events-none" size={18}/>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50"><Truck size={48} className="mb-2"/><p className="text-sm font-bold">Basket is empty</p></div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border dark:border-slate-700 animate-fade-in-up flex items-center justify-between">
                                <div className="flex-1"><h4 className="font-bold text-sm dark:text-white">{item.name}</h4><p className="text-xs text-orange-500 font-bold">{item.qty} Bks</p></div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow border dark:border-slate-600 hover:bg-slate-100 dark:text-white">-</button>
                                    <span className="w-6 text-center text-sm font-bold dark:text-white">{item.qty}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow border dark:border-slate-600 hover:bg-slate-100 dark:text-white">+</button>
                                    <button onClick={() => removeFromCart(item.id)} className="ml-2 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-4 border-t dark:border-slate-700">
                    <button onClick={handleFinalSubmit} disabled={isSubmitting || cart.length === 0} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${isSubmitting ? 'bg-slate-400' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'}`}>
                        {isSubmitting ? <RefreshCcw className="animate-spin"/> : <Save size={20}/>}
                        {isSubmitting ? 'Saving...' : `Save ${cart.reduce((a,b)=>a+b.qty,0)} Items`}
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

    // 🚨 FIX: Hardcoded English months prevents the silent browser crash caused by Indonesian Locale translations 🚨
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
                    <button onClick={() => setSelectedLocation(null)} className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Locations</button>
                    {isAdmin && (
                        <button onClick={() => onEditFolder(selectedDate, selectedLocation)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-orange-100 hover:text-orange-600 transition-colors">
                            <Edit size={14}/> Edit Folder
                        </button>
                    )}
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 overflow-hidden">
                    <div className="bg-slate-900 text-white p-8">
                        <p className="text-orange-500 font-bold tracking-widest text-xs uppercase mb-1">{selectedDate}</p>
                        <h1 className="text-3xl font-bold font-serif">{selectedLocation}</h1>
                        <p className="text-slate-400 text-sm mt-2">{items.length} Total Items Sampled</p>
                    </div>
                    <div className="p-8 space-y-8">
                        {Object.entries(groupedItems).map(([noteGroup, groupItems]) => (
                            <div key={noteGroup} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border dark:border-slate-700 overflow-hidden">
                                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b dark:border-slate-700 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2"><Store size={16} className="text-orange-500"/> {noteGroup}</h3>
                                    <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{groupItems.length} items</span>
                                </div>
                                <table className="w-full text-sm text-left">
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {groupItems.map(s => (
                                            <tr key={s.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-3 font-medium dark:text-white pl-4">{s.productName}</td>
                                                <td className="p-3 text-right text-red-500 font-bold">-{s.qty}</td>
                                                <td className="p-3 text-right flex justify-end gap-2 pr-4">
                                                    {isAdmin && (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); onEdit(s); }} className="p-1.5 text-blue-400 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-blue-900/40 rounded transition-colors"><Pencil size={14}/></button>
                                                            <button onClick={(e) => { e.stopPropagation(); onDelete(s); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-100 dark:bg-slate-800 dark:hover:bg-red-900/40 rounded transition-colors"><Trash2 size={14}/></button>
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
                <button onClick={() => setSelectedDate(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to {selectedMonth}</button>
                <h2 className="text-2xl font-bold dark:text-white mb-6 flex items-center gap-2"><Calendar size={24} className="text-orange-500"/> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {locations.map(loc => (
                        <button key={loc} onClick={() => setSelectedLocation(loc)} className="w-full text-left bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-orange-500 group transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 dark:bg-slate-700 rounded-lg text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-colors"><MapPin size={24} /></div>
                                <div><h3 className="font-bold text-lg dark:text-white group-hover:text-orange-500 transition-colors">{loc}</h3><p className="text-xs text-slate-500">{folderStructure[selectedYear][selectedMonth][selectedDate][loc].length} Items</p></div>
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
                <button onClick={() => setSelectedMonth(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to {selectedYear}</button>
                <h2 className="text-2xl font-bold dark:text-white mb-6 flex items-center gap-2"><Folder size={24} className="text-orange-500"/> {selectedMonth} {selectedYear}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {dates.map(date => {
                        const locCount = Object.keys(folderStructure[selectedYear][selectedMonth][date] || {}).length;
                        return (
                            <button key={date} onClick={() => setSelectedDate(date)} className="w-full text-center bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-orange-500 group transition-all">
                                <div className="w-12 h-12 mx-auto bg-orange-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors mb-3"><span className="font-bold text-lg">{new Date(date).getDate()}</span></div>
                                <h3 className="font-bold text-sm dark:text-white">{new Date(date).toLocaleDateString('en-US', {weekday:'short'})}</h3>
                                <p className="text-[10px] text-slate-500 mt-1">{locCount} Locations</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (selectedYear) {
        const months = Object.keys(folderStructure[selectedYear] || {});
        // 🚨 FIX: Safe sort using indexOf on our predefined English array
        months.sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b));
        return (
            <div className="animate-fade-in">
                <button onClick={() => setSelectedYear(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Years</button>
                <h2 className="text-2xl font-bold dark:text-white mb-6 flex items-center gap-2"><Folder size={24} className="text-blue-500"/> {selectedYear} Archives</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {months.map(month => (
                        <button key={month} onClick={() => setSelectedMonth(month)} className="w-full text-left bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-orange-500 group transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 dark:bg-slate-700 rounded-lg text-blue-500 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Folder size={24} /></div>
                                <div><h3 className="font-bold text-lg dark:text-white">{month}</h3><p className="text-xs text-slate-500">{Object.keys(folderStructure[selectedYear][month] || {}).length} Dates Recorded</p></div>
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
                <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Folder size={24} className="text-orange-500"/> Sampling Archives</h2>
                <div className="flex gap-2">
                    {/* 🚨 FIX: Restored the missing New Sample button! */}
                    {isAdmin && (
                        <button onClick={onRecordSample} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all">
                            <Plus size={18}/> New Sample
                        </button>
                    )}
                    <button onClick={onShowAnalytics} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all"><TrendingUp size={18}/> View Analytics</button>
                </div>
            </div>
            {years.length === 0 ? (
                 <div className="text-center py-20 text-slate-400"><Folder size={48} className="mx-auto mb-4 opacity-20"/><p>No sampling records found.</p></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {years.map(year => (
                        // 🚨 FIX: Converted Divs to Buttons for guaranteed tap-registration on all mobile browsers
                        <button key={year} onClick={() => setSelectedYear(year)} className="w-full text-left block bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform relative overflow-hidden group">
                            <Folder size={100} className="absolute -right-6 -bottom-6 text-white opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none"/>
                            <div className="relative z-10 pointer-events-none"><h3 className="text-3xl font-bold mb-1">{year}</h3><div className="h-1 w-12 bg-orange-500 rounded mb-3"></div><p className="text-sm text-slate-400 font-mono">{Object.keys(folderStructure[year] || {}).length} Months Active</p></div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- SAMPLE ENTRY MODAL ---
export const SampleEntryModal = ({ isOpen, onClose, onSubmit, initialData, inventory }) => {
    const [formData, setFormData] = useState({ date: getCurrentDate(), reason: '', productId: '', productName: '', qty: 1, note: '' });

    useEffect(() => {
        if (initialData && !initialData.isNew) setFormData({ ...initialData, date: initialData.date || getCurrentDate() });
        else setFormData({ date: getCurrentDate(), reason: '', productId: '', productName: '', qty: 1, note: '' });
    }, [initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const product = inventory.find(p => p.id === formData.productId);
        onSubmit({ ...formData, productName: product ? product.name : formData.productName });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X size={20}/></button>
                <h2 className="text-xl font-bold mb-4 dark:text-white">{initialData?.isNew ? 'New Sample Entry' : 'Edit Sample Details'}</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-slate-500">Date</label><input type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" required/></div>
                        <div><label className="text-xs font-bold text-slate-500">Qty</label><input type="number" min="1" value={formData.qty} onChange={e=>setFormData({...formData, qty: parseInt(e.target.value)})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" required/></div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500">Product</label>
                        <select value={formData.productId} onChange={e=>setFormData({...formData, productId: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" required>
                            <option value="">Select Product...</option>
                            {inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div><label className="text-xs font-bold text-slate-500">Location / Store Name</label><input value={formData.reason} onChange={e=>setFormData({...formData, reason: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="e.g. Toko Berkah" required/></div>
                    <div><label className="text-xs font-bold text-slate-500">Notes (Folder Group)</label><input value={formData.note} onChange={e=>setFormData({...formData, note: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="e.g. Area 1"/></div>
                    
                    <button className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl mt-2">{initialData?.isNew ? 'Add to Folder' : 'Save Changes'}</button>
                </form>
            </div>
        </div>
    );
};