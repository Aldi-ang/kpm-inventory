import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, Tooltip as LeafletTooltip, useMap, useMapEvents, Rectangle, LayersControl, ZoomControl } from 'react-leaflet';
import { MapPin, Store, Calendar, Wallet, X, Phone, ChevronRight, Shield, ShieldAlert, Swords } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import L from 'leaflet';

// Utility Helper
const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(number);
};

// --- HELPER: MAP CONTROLLER ---
const MapEffectController = ({ selectedRegion, selectedCity, mapPoints, savedHome }) => {
    const map = useMap();
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) {
            if (savedHome && savedHome.lat && savedHome.lng) {
                map.setView([savedHome.lat, savedHome.lng], savedHome.zoom || 13);
            } else {
                map.locate().on("locationfound", (e) => map.flyTo(e.latlng, 13));
            }
            isFirstRun.current = false;
        }
    }, [map, savedHome]);

    useEffect(() => {
        if (selectedRegion !== "All" && mapPoints.length > 0) {
            let latSum = 0, lngSum = 0;
            mapPoints.forEach(p => { latSum += p.latitude; lngSum += p.longitude; });
            const center = [latSum / mapPoints.length, lngSum / mapPoints.length];
            map.flyTo(center, 13, { duration: 1.5 });
        }
    }, [selectedRegion, selectedCity, map]); 

    return null;
};

// --- MAIN COMPONENT ---
const MapMissionControl = ({ customers, transactions, inventory, db, appId, user, logAudit, triggerCapy, isAdmin, savedHome, onSetHome, tierSettings }) => {
    const [selectedStore, setSelectedStore] = useState(null);
    const [filterTier, setFilterTier] = useState(['Platinum', 'Gold', 'Silver', 'Bronze']); 
    const [isAddingMode, setIsAddingMode] = useState(false); 
    const [newPinCoords, setNewPinCoords] = useState(null);
    
    // GAMIFICATION STATE
    const [conquestMode, setConquestMode] = useState(false); // Toggle for "Game Mode"

    const [selectedRegion, setSelectedRegion] = useState("All"); 
    const [selectedCity, setSelectedCity] = useState("All");     
    const [mapBounds, setMapBounds] = useState(null); 

    const activeTiers = tierSettings || [
        { id: 'Platinum', label: 'Platinum', color: '#f59e0b', iconType: 'emoji', value: '🏆' },
        { id: 'Gold', label: 'Gold', color: '#fbbf24', iconType: 'emoji', value: '🥇' },
        { id: 'Silver', label: 'Silver', color: '#94a3b8', iconType: 'emoji', value: '🥈' },
        { id: 'Bronze', label: 'Bronze', color: '#78350f', iconType: 'emoji', value: '🥉' }
    ];

    // Data Processing
    const { mapPoints, locationTree } = useMemo(() => {
        const tree = {}; 
        const validStores = customers
            .filter(c => c.latitude && c.longitude)
            .map(c => {
                const lat = parseFloat(c.latitude);
                const lng = parseFloat(c.longitude);
                if (isNaN(lat) || isNaN(lng)) return null;

                // DATA FIX: FORCE "JALAN PEMUDA" TO "MUNTILAN"
                let reg = c.region || "Uncategorized";
                let cit = c.city || "Uncategorized";
                const addr = (c.address || "").toLowerCase();

                if (cit.toLowerCase().includes("jalan pemuda") || addr.includes("jalan pemuda")) {
                    cit = "Muntilan"; 
                }

                if (!tree[reg]) tree[reg] = new Set();
                tree[reg].add(cit);

                const last = c.lastVisit ? new Date(c.lastVisit) : new Date(0);
                const next = new Date(last);
                next.setDate(last.getDate() + (parseInt(c.visitFreq) || 7));
                const diffDays = Math.ceil((next - new Date()) / (1000 * 60 * 60 * 24));
                
                // CONQUEST LOGIC: Has it been visited in last 30 days?
                const daysSinceVisit = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
                const isConquered = daysSinceVisit <= 30;

                let status = 'ok';
                if (diffDays <= 0) status = 'overdue';
                else if (diffDays <= 2) status = 'soon';

                return { ...c, city: cit, latitude: lat, longitude: lng, status, diffDays, daysSinceVisit, isConquered };
            })
            .filter(c => c !== null);

        const filtered = validStores.filter(c => {
            if (selectedRegion !== "All" && c.region !== selectedRegion) return false;
            if (selectedCity !== "All" && c.city !== selectedCity) return false;
            const tier = c.tier || 'Silver';
            if (!filterTier.includes(tier)) return false;
            return true;
        });

        const treeArray = Object.keys(tree).reduce((acc, reg) => {
            acc[reg] = Array.from(tree[reg]).sort();
            return acc;
        }, {});

        return { mapPoints: filtered, locationTree: treeArray };
    }, [customers, filterTier, selectedRegion, selectedCity, activeTiers]);

    const AdminControls = () => {
        const map = useMapEvents({});
        const saveView = () => { if(onSetHome) onSetHome(map.getCenter(), map.getZoom()); };
        if(!isAdmin) return null;
        return (
            <div className="absolute top-[80px] left-[10px] z-[9999]">
                <button onClick={saveView} className="bg-white text-slate-800 border-2 border-slate-300 px-3 py-2 rounded-lg text-xs font-bold shadow-xl flex items-center gap-2 hover:bg-orange-500 hover:text-white hover:border-orange-600 transition-colors">
                    <MapPin size={14}/> Set Home
                </button>
            </div>
        );
    };

    const MapClicker = () => {
        useMapEvents({
            click(e) {
                if (isAddingMode) {
                    setNewPinCoords(e.latlng);
                    const coordString = `${e.latlng.lat}, ${e.latlng.lng}`;
                    navigator.clipboard.writeText(coordString);
                    if(window.confirm(`Pin Dropped!\nCoords: ${coordString}\n\nCreate new store here?`)) setIsAddingMode(false);
                } else {
                    setSelectedStore(null);
                }
            },
        });
        return null;
    };

    const getIcon = (store, isTemp = false) => {
        if (isTemp) return L.divIcon({ className: 'custom-icon', html: `<div style="background-color: white; width: 24px; height: 24px; border-radius: 50%; border: 4px solid black; animation: bounce 1s infinite;"></div>`, iconSize: [24, 24] });

        const tierDef = activeTiers.find(t => t.id === store.tier) || activeTiers[2] || {};
        let content = '';
        if (tierDef.iconType === 'image') {
            content = `<img src="${tierDef.value}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
        } else {
            content = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 16px;">${tierDef.value || '📍'}</div>`;
        }

        let glow = store.status === 'overdue' ? `box-shadow: 0 0 0 4px #ef4444; animation: pulse 1.5s infinite;` : '';
        let border = `border: 3px solid ${tierDef.color || '#94a3b8'};`;

        return L.divIcon({
            className: 'custom-icon', 
            html: `<div class="marker-inner" style="background-color: white; width: 34px; height: 34px; border-radius: 50%; ${border} ${glow} overflow: hidden;">${content}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
        });
    };

    const toggleTierFilter = (tierId) => {
        setFilterTier(prev => prev.includes(tierId) ? prev.filter(t => t !== tierId) : [...prev, tierId]);
    };

    const toggleAllTiers = () => {
        setFilterTier(filterTier.length === activeTiers.length ? [] : activeTiers.map(t => t.id));
    };

    const handlePinClick = (store, map) => {
        setSelectedStore(store);
        map.flyTo([store.latitude, store.longitude], 18, { duration: 1.2 });
    };

    const convertToBks = (qty, unit, product) => {
        if (!product) return qty;
        const packsPerSlop = product.packsPerSlop || 10;
        const slopsPerBal = product.slopsPerBal || 20;
        const balsPerCarton = product.balsPerCarton || 4;
        if (unit === 'Slop') return qty * packsPerSlop;
        if (unit === 'Bal') return qty * slopsPerBal * packsPerSlop;
        if (unit === 'Karton') return qty * balsPerCarton * slopsPerBal * packsPerSlop;
        return qty; 
    };

    const MarkerWithZoom = ({ store }) => {
        const map = useMap();
        const tierDef = activeTiers.find(t => t.id === store.tier) || { label: store.tier || 'Silver', value: '📍', iconType: 'emoji' };

        return (
            <Marker 
                key={store.id} 
                position={[store.latitude, store.longitude]} 
                icon={getIcon(store)} 
                eventHandlers={{ click: () => handlePinClick(store, map) }}
                riseOnHover={true}
            >
                {/* IN CONQUEST MODE, DISABLE TOOLTIPS TO REDUCE CLUTTER */}
                {!conquestMode && (
                    <LeafletTooltip direction="top" offset={[0, -40]} opacity={1} className="custom-leaflet-tooltip">
                        <div className="store-3d-card w-48 bg-slate-900 text-white rounded-xl border-2 border-slate-600 overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none z-20"></div>
                            {store.storeImage ? (
                                <img src={store.storeImage} className="w-full h-28 object-cover" alt={store.name} onError={(e) => e.target.style.display = 'none'}/>
                            ) : (
                                <div className="w-full h-24 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-600"><Store size={32}/></div>
                            )}
                            <div className="p-3 bg-slate-900/95 backdrop-blur relative z-10">
                                <h3 className="font-bold text-sm mb-1 truncate text-white">{store.name}</h3>
                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                    <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600 flex items-center gap-1 font-bold">
                                        {tierDef.iconType === 'image' ? <img src={tierDef.value} className="w-3 h-3 object-contain"/> : <span>{tierDef.value}</span>}
                                        <span>{tierDef.label}</span>
                                    </span>
                                    <span className={store.status === 'overdue' ? 'text-red-400 font-bold bg-red-900/20 px-1.5 py-0.5 rounded' : 'text-emerald-400 font-bold'}>{store.diffDays <= 0 ? 'LATE' : `${store.diffDays}d left`}</span>
                                </div>
                            </div>
                        </div>
                    </LeafletTooltip>
                )}
            </Marker>
        );
    };

// --- NEW: GAME HUD OVERLAY ---
    const GameHUD = () => {
        if (!conquestMode) return null;

        const totalStores = mapPoints.length;
        const conqueredCount = mapPoints.filter(s => s.isConquered).length;
        const percentage = totalStores > 0 ? Math.round((conqueredCount / totalStores) * 100) : 0;
        
        let rank = "Street Peddler";
        if (percentage > 25) rank = "District Manager";
        if (percentage > 50) rank = "City Boss";
        if (percentage > 75) rank = "Kingpin";
        if (percentage === 100) rank = "Legend";

        return (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/90 text-white px-6 py-3 rounded-xl border-2 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] backdrop-blur-md flex flex-col items-center animate-slide-down pointer-events-none select-none">
                <div className="text-[10px] text-orange-400 font-bold tracking-[0.2em] uppercase mb-1">Territory Control</div>
                <div className="flex items-center gap-4">
                    <div className="text-3xl font-black font-mono">{percentage}%</div>
                    <div className="h-8 w-[1px] bg-slate-600"></div>
                    <div>
                        <div className="text-[10px] text-slate-400 uppercase">Current Rank</div>
                        <div className="text-sm font-bold text-emerald-400">{rank}</div>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden border border-slate-700">
                    <div 
                        className="h-full bg-gradient-to-r from-orange-600 to-yellow-400 transition-all duration-1000" 
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>
        );
    };

    const StoreHUD = ({ store }) => {
        const [showConsignDetails, setShowConsignDetails] = useState(false);

        const stats = useMemo(() => {
            const storeTrans = transactions.filter(t => t.customerName === store.name);
            const totalRev = storeTrans.filter(t => t.type === 'SALE').reduce((sum, t) => sum + (t.total || 0), 0);
            const totalTitip = storeTrans.filter(t => t.type === 'SALE' && t.paymentType === 'Titip').reduce((sum, t) => sum + (t.total || 0), 0);
            const totalPaid = storeTrans.filter(t => t.type === 'CONSIGNMENT_PAYMENT').reduce((sum, t) => sum + (t.amountPaid || 0), 0);
            const currentConsignment = Math.max(0, totalTitip - totalPaid);
            
            const itemMap = {}; 
            storeTrans.forEach(t => {
                if (t.type === 'SALE' && t.paymentType === 'Titip') {
                    t.items.forEach(i => {
                        const prod = inventory ? inventory.find(p => p.id === i.productId) : null;
                        const bks = convertToBks(i.qty, i.unit, prod);
                        if (!itemMap[i.productId]) itemMap[i.productId] = { name: i.name, qty: 0 };
                        itemMap[i.productId].qty += bks;
                    });
                }
                else if (t.type === 'CONSIGNMENT_PAYMENT' || t.type === 'RETURN') {
                    const list = t.items || t.itemsPaid || [];
                    list.forEach(i => {
                        const prod = inventory ? inventory.find(p => p.id === i.productId) : null;
                        const bks = convertToBks(i.qty, i.unit, prod);
                        if (itemMap[i.productId]) itemMap[i.productId].qty -= bks;
                    });
                }
            });
            const activeItems = Object.values(itemMap).filter(i => i.qty > 0);

            const graphData = storeTrans.filter(t => t.type === 'SALE').reduce((acc, t) => {
                const date = t.date.substring(5);
                const found = acc.find(i => i.date === date);
                if (found) found.total += t.total; else acc.push({ date, total: t.total });
                return acc;
            }, []).sort((a,b) => a.date.localeCompare(b.date)).slice(-5);
            
            return { totalRev, currentConsignment, activeItems, visitCount: storeTrans.length, graphData };
        }, [store, transactions, inventory]);

        const getWhatsappLink = () => {
            if (!store.phone) return "#";
            const cleanNumber = store.phone.replace(/\D/g, '').replace(/^0/, '62');
            return `https://wa.me/${cleanNumber}`;
        };

        const getGpsLink = () => {
            if (store.latitude && store.longitude) {
                return `http://googleusercontent.com/maps.google.com/?q=${store.latitude},${store.longitude}`;
            }
            const query = encodeURIComponent(`${store.address || ''}, ${store.city || ''}`);
            return `http://googleusercontent.com/maps.google.com/?q=${query}`;
        };

        const HudTooltip = ({ active, payload, label }) => {
            if (active && payload && payload.length) {
                return (
                    <div className="bg-slate-800 p-3 border border-slate-600 rounded text-xs text-white shadow-xl">
                        <p className="font-bold border-b border-slate-600 mb-2 pb-1 text-slate-400">Date: {label}</p>
                        <p className="text-emerald-400 font-mono text-sm font-bold">Rp {new Intl.NumberFormat('id-ID').format(payload[0].value)}</p>
                    </div>
                );
            }
            return null;
        };

        return (
            <div className="absolute left-4 top-20 bottom-4 w-80 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700 p-6 overflow-y-auto z-[1000] animate-slide-in-left">
                <button onClick={() => setSelectedStore(null)} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full hover:bg-red-500 transition-colors"><X size={16}/></button>
                <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">{store.name}</h2>
                <p className="text-slate-400 text-xs mb-4 flex items-center gap-1"><MapPin size={12}/> {store.city}</p>

                {isAdmin && store.phone && (
                    <div className="mb-4 bg-slate-800 p-3 rounded-xl flex justify-between items-center">
                        <span className="text-sm font-mono">{store.phone}</span>
                        <a href={getWhatsappLink()} target="_blank" rel="noreferrer" className="p-2 bg-green-600 rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2 text-xs font-bold"><Phone size={14}/> Chat</a>
                    </div>
                )}

                <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border ${store.status === 'overdue' ? 'bg-red-500/20 border-red-500' : 'bg-emerald-500/20 border-emerald-500'}`}>
                    <Calendar size={24} className={store.status === 'overdue' ? 'text-red-500' : 'text-emerald-500'}/>
                    <div>
                        <p className="text-[10px] uppercase font-bold opacity-70">Next Visit</p>
                        <p className="font-bold text-sm">{store.diffDays <= 0 ? `${Math.abs(store.diffDays)} Days Overdue` : `Due in ${store.diffDays} days`}</p>
                    </div>
                </div>

                {isAdmin && (
                    <div className="space-y-4 mb-6">
                        {stats.currentConsignment > 0 && (
                            <div className="p-3 bg-orange-500/20 border border-orange-500 rounded-xl transition-all">
                                <div 
                                    className="flex justify-between items-center cursor-pointer"
                                    onClick={() => setShowConsignDetails(!showConsignDetails)}
                                >
                                    <div>
                                        <p className="text-[10px] text-orange-300 uppercase font-bold flex items-center gap-2"><Wallet size={12}/> Active Consignment</p>
                                        <p className="text-xl font-bold text-orange-500">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats.currentConsignment)}</p>
                                    </div>
                                    <div className={`bg-orange-500/20 p-1 rounded-full transition-transform duration-300 ${showConsignDetails ? 'rotate-180' : ''}`}>
                                        <ChevronRight size={16} className="text-orange-500 rotate-90"/>
                                    </div>
                                </div>

                                {showConsignDetails && (
                                    <div className="mt-3 pt-3 border-t border-orange-500/30 space-y-2 animate-fade-in">
                                        {stats.activeItems.length > 0 ? (
                                            stats.activeItems.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs items-center">
                                                    <span className="text-slate-300 font-medium">{item.name}</span>
                                                    <span className="text-orange-400 font-bold bg-orange-900/40 px-2 py-0.5 rounded">{item.qty} Bks</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-400 italic text-center">No item details found.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-slate-800 p-3 rounded-xl"><p className="text-[10px] text-slate-400 uppercase">Lifetime Sales</p><p className="font-bold text-emerald-400">{new Intl.NumberFormat('id-ID', { compactDisplay: "short", notation: "compact", currency: 'IDR' }).format(stats.totalRev)}</p></div>
                        <div className="h-32 bg-slate-800 rounded-xl p-2 border border-slate-700">
                            <p className="text-[10px] text-slate-500 mb-1">Sales Trend</p>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={stats.graphData}>
                                    <Tooltip content={<HudTooltip />} cursor={{fill: 'rgba(255,255,255,0.1)'}}/>
                                    <Bar dataKey="total" fill="#10b981" radius={[2,2,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
                
                <a href={getGpsLink()} target="_blank" rel="noreferrer" className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm">
                    <MapPin size={16}/> GPS Navigation
                </a>
            </div>
        );
    };
        return (
        <div className="h-[calc(100vh-100px)] w-full rounded-2xl overflow-hidden shadow-2xl relative border dark:border-slate-700 bg-slate-900">
            <GameHUD />  {/* <--- ADD THIS LINE HERE */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <MapPin size={16} className="text-orange-500 ml-2"/>
                        <select value={selectedRegion} onChange={(e) => { setSelectedRegion(e.target.value); setSelectedCity("All"); }} className="bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none p-2 cursor-pointer min-w-[100px]"><option value="All">All Regions</option>{Object.keys(locationTree).sort().map(r => <option key={r} value={r}>{r}</option>)}</select>
                    </div>
                    {selectedRegion !== "All" && locationTree[selectedRegion] && (<div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 animate-fade-in"><span className="text-slate-400 text-xs ml-2">City:</span><select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none p-2 cursor-pointer min-w-[100px]"><option value="All">All Cities</option>{locationTree[selectedRegion].map(c => <option key={c} value={c}>{c}</option>)}</select></div>)}
                </div>
                
                {/* TIER FILTER */}
                <div className="flex gap-1 bg-slate-900/90 p-1.5 rounded-xl backdrop-blur-md border border-slate-700 pointer-events-auto shadow-xl">
                    <button onClick={toggleAllTiers} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterTier.length === activeTiers.length ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>All</button>
                    {activeTiers.map(tier => (
                        <button key={tier.id} onClick={() => toggleTierFilter(tier.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${filterTier.includes(tier.id) ? 'bg-slate-700 text-white border border-slate-500 shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-800 opacity-60'}`}>
                            {tier.iconType === 'image' ? <img src={tier.value} className="w-3 h-3 rounded-full"/> : <span>{tier.value}</span>}
                            {tier.label}
                        </button>
                    ))}
                </div>

                {/* GAME MODE TOGGLE (NEW) */}
                <button 
                    onClick={() => setConquestMode(!conquestMode)} 
                    className={`pointer-events-auto px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 border transition-all ${conquestMode ? 'bg-purple-600 text-white border-purple-500 animate-pulse' : 'bg-white text-slate-700 border-slate-200'}`}
                >
                    {conquestMode ? <Swords size={16}/> : <Shield size={16}/>} 
                    {conquestMode ? "Conquest Mode: ON" : "Territory View"}
                </button>

                <button onClick={() => setIsAddingMode(!isAddingMode)} className={`pointer-events-auto px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 border transition-all ${isAddingMode ? 'bg-orange-500 text-white border-orange-400 animate-pulse scale-105' : 'bg-white text-slate-700 border-slate-200'}`}><MapPin size={16}/> {isAddingMode ? "Click Map to Drop" : "Add Store"}</button>
            </div>

            <MapContainer center={[-7.6145, 110.7122]} zoom={10} style={{ height: '100%', width: '100%' }} className="z-0" zoomControl={false}>
                <ZoomControl position="topleft" />
                
                <MapEffectController 
                    selectedRegion={selectedRegion}
                    selectedCity={selectedCity}
                    mapPoints={mapPoints}
                    savedHome={savedHome}
                />

                <LayersControl position="bottomright">
                    <LayersControl.BaseLayer checked name="Game Mode (Balanced)">
                        <TileLayer className="balanced-dark-tile" url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='© CARTO' />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Blueprint (High Vis)">
                        <TileLayer className="blueprint-tile" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satellite">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='© Esri'/>
                    </LayersControl.BaseLayer>
                </LayersControl>

                <AdminControls />
                <MapClicker />
                {mapBounds && <Rectangle bounds={mapBounds} pathOptions={{ color: '#f97316', weight: 2, fillOpacity: 0.1, dashArray: '5, 10' }} />}
                
                {/* --- CONQUEST MODE LAYERS --- */}
                {conquestMode && mapPoints.map(store => (
                    <Circle 
                        key={`circle-${store.id}`}
                        center={[store.latitude, store.longitude]}
                        radius={500} 
                        className={store.isConquered ? "pulsing-circle" : ""}
                        pathOptions={{ 
                            color: store.isConquered ? '#f97316' : '#334155', 
                            fillColor: store.isConquered ? '#f97316' : '#000000', 
                            fillOpacity: store.isConquered ? 0.3 : 0.5,
                            weight: store.isConquered ? 2 : 1,
                            dashArray: store.isConquered ? null : '5, 10' 
                        }}
                    />
                ))}
                {mapPoints.map(store => <MarkerWithZoom key={store.id} store={store} />)}
                
                {newPinCoords && <Marker position={newPinCoords} icon={getIcon({}, true)}><Popup>New Location: {newPinCoords.lat.toFixed(5)}, {newPinCoords.lng.toFixed(5)}</Popup></Marker>}
            </MapContainer>

            {selectedStore && <StoreHUD store={selectedStore} />}
            
            <style>{`
                .leaflet-tooltip-pane { z-index: 9999 !important; pointer-events: none !important; }
                .leaflet-control-zoom a { background-color: white !important; color: black !important; border: 2px solid #ccc !important; width: 36px !important; height: 36px !important; line-height: 36px !important; font-size: 18px !important; box-shadow: 0 4px 6px rgba(0,0,0,0.3) !important; }
                .leaflet-control-zoom a:hover { background-color: #f1f5f9 !important; }
                
                /* CUSTOM MARKER ANIMATIONS */
                .custom-icon .marker-inner { transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-origin: center center; }
                .custom-icon:hover .marker-inner { transform: scale(1.2); filter: drop-shadow(0 0 10px gold); }
                .custom-icon:hover { z-index: 10000 !important; }
                
                /* 3D CARD ANIMATION */
                .store-3d-card { transform: perspective(1000px) rotateX(20deg) scale(0.5) translateY(20px); opacity: 0; transform-origin: bottom center; }
                .custom-leaflet-tooltip .store-3d-card { animation: popIn 0.3s forwards; }
                @keyframes popIn { 0% { transform: perspective(1000px) rotateX(20deg) scale(0.5) translateY(20px); opacity: 0; } 100% { transform: perspective(1000px) rotateX(-5deg) scale(1.0) translateY(-10px); opacity: 1; box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.8); } }
                
                /* MAP TILES */
                .balanced-dark-tile { filter: brightness(1.2); }
                .blueprint-tile { filter: invert(100%) hue-rotate(180deg) brightness(0.9) contrast(1.1) grayscale(0.8); }

                /* --- NEW: GAMIFICATION ANIMATIONS --- */
                @keyframes pulse-territory {
                    0% { fill-opacity: 0.2; stroke-width: 1; }
                    50% { fill-opacity: 0.4; stroke-width: 3; }
                    100% { fill-opacity: 0.2; stroke-width: 1; }
                }
                .pulsing-circle {
                    animation: pulse-territory 3s infinite ease-in-out;
                }
                @keyframes slide-down {
                    from { transform: translate(-50%, -100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                .animate-slide-down { animation: slide-down 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default MapMissionControl;