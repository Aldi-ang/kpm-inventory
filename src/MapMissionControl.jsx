import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, GeoJSON, Tooltip as LeafletTooltip, useMap, useMapEvents, LayersControl, ZoomControl } from 'react-leaflet';
import { MapPin, Store, Calendar, Wallet, X, Phone, ChevronRight, Shield, Swords, Menu, Network, Link as LinkIcon, Building2, MinusCircle, Maximize2, Map, Search, Trash2, DownloadCloud, Zap } from 'lucide-react';
import { BarChart, Bar, Tooltip, ResponsiveContainer } from 'recharts';
import L from 'leaflet';
import { doc, updateDoc, collection, getDocs, setDoc } from 'firebase/firestore';

// --- UTILITY HELPERS ---
const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
};

// --- ROBUST POINT-IN-POLYGON ENGINE ---
const isPointInPolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i][0], yi = polygon[i][1];
        let xj = polygon[j][0], yj = polygon[j][1];
        let intersect = ((yi > point[1]) !== (yj > point[1])) && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

const checkPointInGeoJSON = (lng, lat, geometry) => {
    if (!geometry || !geometry.coordinates) return false;
    const point = [lng, lat];
    if (geometry.type === 'Polygon') {
        return isPointInPolygon(point, geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
        for (let poly of geometry.coordinates) {
            if (isPointInPolygon(point, poly[0])) return true;
        }
    }
    return false;
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

// --- EXTRACTED MAP COMPONENTS ---
const getIcon = (store, activeTiers, isTemp = false) => {
    if (isTemp) return L.divIcon({ className: 'custom-icon', html: `<div style="background-color: white; width: 24px; height: 24px; border-radius: 50%; border: 4px solid black; animation: bounce 1s infinite;"></div>`, iconSize: [24, 24] });
    const tierDef = activeTiers.find(t => t.id === store.tier) || activeTiers[2] || {};
    let content = tierDef.iconType === 'image' ? `<img src="${tierDef.value}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />` : `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 16px;">${tierDef.value || '📍'}</div>`;
    const hubBadge = store.storeType === 'Wholesaler' ? `<div style="position:absolute; top:-10px; right:-10px; background:gold; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; font-size:10px; border:2px solid black; z-index:10;">👑</div>` : '';
    let glow = store.status === 'overdue' ? `box-shadow: 0 0 0 4px #ef4444; animation: pulse 1.5s infinite;` : '';
    let border = `border: 3px solid ${store.storeType === 'Wholesaler' ? '#f59e0b' : (tierDef.color || '#94a3b8')};`;

    return L.divIcon({
        className: 'custom-icon', 
        html: `<div style="position:relative;">${hubBadge}<div class="marker-inner" style="background-color: white; width: 34px; height: 34px; border-radius: 50%; ${border} ${glow} overflow: hidden;">${content}</div></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });
};

const MapEffectController = ({ selectedRegion, selectedCity, mapPoints, savedHome }) => {
    const map = useMap();
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            if (savedHome && savedHome.lat && savedHome.lng) map.setView([savedHome.lat, savedHome.lng], savedHome.zoom || 13);
            else map.locate().on("locationfound", (e) => map.flyTo(e.latlng, 13));
            isFirstRun.current = false;
        }
    }, [map, savedHome]);
    useEffect(() => {
        if (selectedRegion !== "All" && mapPoints.length > 0) {
            let latSum = 0, lngSum = 0;
            mapPoints.forEach(p => { latSum += p.latitude; lngSum += p.longitude; });
            map.flyTo([latSum / mapPoints.length, lngSum / mapPoints.length], 13, { duration: 1.5 });
        }
    }, [selectedRegion, selectedCity, map]); 
    return null;
};

const AdminControls = ({ isAdmin, onSetHome }) => {
    const map = useMapEvents({});
    if(!isAdmin) return null;
    return (
        <div className="absolute top-[80px] left-[10px] z-[9999]">
            <button onClick={() => onSetHome && onSetHome(map.getCenter(), map.getZoom())} className="bg-white text-slate-800 border-2 border-slate-300 px-3 py-2 rounded-lg text-xs font-bold shadow-xl flex items-center gap-2 hover:bg-orange-500 hover:text-white hover:border-orange-600 transition-colors">
                <MapPin size={14}/> Set Home
            </button>
        </div>
    );
};

const MapClicker = ({ isAddingMode, setNewPinCoords, setIsAddingMode, setSelectedStore, setSelectedZone }) => {
    useMapEvents({
        click(e) {
            if (isAddingMode) {
                setNewPinCoords(e.latlng);
                const coordString = `${e.latlng.lat}, ${e.latlng.lng}`;
                navigator.clipboard.writeText(coordString);
                if(window.confirm(`Pin Dropped!\nCoords: ${coordString}\n\nCreate new store here?`)) setIsAddingMode(false);
            } else {
                setSelectedStore(null);
                setSelectedZone(null); 
            }
        },
    });
    return null;
};

const MarkerWithZoom = ({ store, activeTiers, conquestMode, handlePinClick }) => {
    const map = useMap();
    const tierDef = activeTiers.find(t => t.id === store.tier) || { label: store.tier || 'Silver', value: '📍', iconType: 'emoji' };
    return (
        <Marker position={[store.latitude, store.longitude]} icon={getIcon(store, activeTiers)} eventHandlers={{ click: () => handlePinClick(store, map) }} riseOnHover={true}>
            {!conquestMode && (
                <LeafletTooltip direction="top" offset={[0, -40]} opacity={1} className="custom-leaflet-tooltip">
                    <div className="store-3d-card w-48 bg-slate-900 text-white rounded-xl border-2 border-slate-600 overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none z-20"></div>
                        {store.storeImage ? <img src={store.storeImage} className="w-full h-28 object-cover" onError={(e) => e.target.style.display = 'none'}/> : <div className="w-full h-24 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-600"><Store size={32}/></div>}
                        <div className="p-3 bg-slate-900/95 backdrop-blur relative z-10">
                            <h3 className="font-bold text-sm mb-1 truncate text-white">{store.name}</h3>
                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600 flex items-center gap-1 font-bold">{tierDef.iconType === 'image' ? <img src={tierDef.value} className="w-3 h-3 object-contain"/> : <span>{tierDef.value}</span>}<span>{store.storeType === 'Wholesaler' ? 'HUB' : tierDef.label}</span></span>
                                <span className={store.status === 'overdue' ? 'text-red-400 font-bold bg-red-900/20 px-1.5 py-0.5 rounded' : 'text-emerald-400 font-bold'}>{store.diffDays <= 0 ? 'LATE' : `${store.diffDays}d left`}</span>
                            </div>
                        </div>
                    </div>
                </LeafletTooltip>
            )}
        </Marker>
    );
};

// --- UPGRADED: SATELLITE BORDER IMPORTER ---
const BorderImporter = ({ db, appId, boundaries, setBoundaries, setIsOpen }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [adminLevel, setAdminLevel] = useState("Kecamatan");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState("");

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsLoading(true); setError(null);
        setProgress(`Scanning satellite for ${adminLevel} ${searchQuery}...`);
        try {
            const q = encodeURIComponent(`${adminLevel} ${searchQuery}`);
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&polygon_geojson=1&format=json&limit=1`);
            const data = await res.json();
            
            if (!data || data.length === 0 || !data[0].geojson) {
                setError(`Failed to find polygon for ${adminLevel} ${searchQuery}.`);
                return;
            }

            const newBoundary = {
                id: `BND_${Date.now()}`,
                name: `${adminLevel} ${searchQuery}`,
                fullName: data[0].display_name,
                geometry: data[0].geojson,
                color: adminLevel === 'Kabupaten' ? '#ef4444' : '#3b82f6',
                level: adminLevel
            };

            const updatedList = [...boundaries, newBoundary];
            setBoundaries(updatedList);
            if (db && appId) { try { await setDoc(doc(db, `artifacts/${appId}/settings`, 'mapBoundaries'), { list: updatedList }); } catch(e) {} }
            
            setSearchQuery(""); setIsOpen(false);
        } catch (err) { setError("Satellite API network error."); } 
        finally { setIsLoading(false); setProgress(""); }
    };

    // MACRO: Automatically builds the primary Cello trading zones in Central Java
    const handleAutoBuildMagelang = async () => {
        setIsLoading(true); setError(null);
        const zones = [
            { query: "Kabupaten Magelang", level: "Kabupaten", color: "#ef4444" },
            { query: "Kecamatan Muntilan", level: "Kecamatan", color: "#3b82f6" },
            { query: "Kecamatan Dukun", level: "Kecamatan", color: "#8b5cf6" },
            { query: "Kecamatan Srumbung", level: "Kecamatan", color: "#10b981" },
            { query: "Kecamatan Salam", level: "Kecamatan", color: "#f59e0b" },
            { query: "Kecamatan Mungkid", level: "Kecamatan", color: "#06b6d4" }
        ];

        let newBoundaries = [...boundaries];

        for (let i = 0; i < zones.length; i++) {
            const z = zones[i];
            setProgress(`Downloading ${z.query} (${i+1}/${zones.length})...`);
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(z.query)}&polygon_geojson=1&format=json&limit=1`);
                const data = await res.json();
                if (data && data[0] && data[0].geojson) {
                    newBoundaries.push({
                        id: `BND_MAG_${Date.now()}_${i}`,
                        name: z.query,
                        fullName: data[0].display_name,
                        geometry: data[0].geojson,
                        color: z.color,
                        level: z.level
                    });
                }
                // Rate limit protection for OSM API
                await new Promise(r => setTimeout(r, 1200));
            } catch(e) { console.error("Skip:", z.query); }
        }

        setBoundaries(newBoundaries);
        if (db && appId) { try { await setDoc(doc(db, `artifacts/${appId}/settings`, 'mapBoundaries'), { list: newBoundaries }); } catch(e) {} }
        setIsLoading(false); setProgress(""); setIsOpen(false);
    };

    return (
        <div className="absolute top-24 right-4 w-80 bg-slate-900 border-2 border-blue-500 shadow-2xl rounded-xl p-5 z-[2000] animate-slide-in-left">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={16}/></button>
            <h3 className="text-white font-bold mb-1 flex items-center gap-2"><DownloadCloud size={16} className="text-blue-500"/> GeoJSON Importer</h3>
            <p className="text-[10px] text-slate-400 mb-4 leading-tight border-b border-slate-700 pb-3">Fetch official government boundaries directly from OpenStreetMap satellites.</p>
            
            <div className="flex gap-2 mb-2">
                <select value={adminLevel} onChange={e => setAdminLevel(e.target.value)} className="bg-slate-800 text-white text-xs p-2 rounded border border-slate-600 outline-none font-bold">
                    <option value="Kecamatan">Kecamatan</option>
                    <option value="Kabupaten">Kabupaten/Kota</option>
                    <option value="Provinsi">Provinsi</option>
                </select>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g. Muntilan" className="flex-1 bg-slate-800 border border-slate-600 rounded p-2 text-xs text-white outline-none focus:border-blue-500 font-mono"/>
            </div>

            {error && <p className="text-[10px] text-red-400 mb-2 font-bold">{error}</p>}
            {progress && <p className="text-[10px] text-blue-400 mb-2 font-bold animate-pulse">{progress}</p>}
            
            <button onClick={handleSearch} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded flex justify-center items-center gap-2 text-xs transition-colors disabled:opacity-50 mb-4">
                <Search size={14}/> Fetch Single Border
            </button>

            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <p className="text-[9px] text-slate-400 mb-2 uppercase tracking-widest text-center font-bold">--- Macro Actions ---</p>
                <button onClick={handleAutoBuildMagelang} disabled={isLoading} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded flex justify-center items-center gap-2 text-[10px] uppercase tracking-widest transition-colors disabled:opacity-50 shadow-lg">
                    <Zap size={14}/> Auto-Build Magelang Hub
                </button>
                <p className="text-[9px] text-slate-500 mt-2 text-center leading-tight italic">Fetches Kabupaten Magelang + 5 core Muntilan-area Kecamatans automatically.</p>
            </div>
        </div>
    );
};

// --- THE ZONE HUD ---
const ZoneHUD = ({ zone, mapPoints, setSelectedZone, boundaries, setBoundaries, db, appId }) => {
    if (!zone) return null;

    const storesInZone = mapPoints.filter(store => checkPointInGeoJSON(store.longitude, store.latitude, zone.geometry));
    const wholesalers = storesInZone.filter(s => s.storeType === 'Wholesaler').length;
    const retailers = storesInZone.length - wholesalers;

    const handleDelete = async () => {
        if(window.confirm(`Remove ${zone.name} border from map?`)) {
            const updated = boundaries.filter(b => b.id !== zone.id);
            setBoundaries(updated);
            if (db && appId) { try { await setDoc(doc(db, `artifacts/${appId}/settings`, 'mapBoundaries'), { list: updated }); } catch(e){} }
            setSelectedZone(null);
        }
    };

    return (
        <div className="absolute left-4 top-20 w-72 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-blue-500 p-5 z-[1000] animate-slide-in-left">
            <button onClick={() => setSelectedZone(null)} className="absolute top-4 right-4 p-1.5 bg-slate-800 rounded-full hover:bg-red-500 transition-colors"><X size={14}/></button>
            <div className="flex items-center gap-2 mb-1">
                <Map className="text-blue-500" size={20}/>
                <h2 className="text-xl font-bold leading-tight truncate pr-6">{zone.name}</h2>
            </div>
            <p className="text-[9px] text-slate-400 mb-4 border-b border-slate-700 pb-2 truncate">{zone.fullName}</p>
            
            <div className="space-y-3">
                <div className="bg-slate-800 p-3 rounded-xl flex justify-between items-center border border-slate-700">
                    <span className="text-xs font-bold text-slate-400 uppercase">Total Stores Inside</span>
                    <span className="text-2xl font-black text-white">{storesInZone.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-amber-500/30 text-center">
                        <span className="text-[10px] font-bold text-amber-500 uppercase block mb-1">Hubs</span>
                        <span className="text-xl font-black text-amber-400">{wholesalers}</span>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-600 text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Retailers</span>
                        <span className="text-xl font-black text-white">{retailers}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2 mt-4">
                <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-bold transition-colors uppercase tracking-widest">Assign Rep</button>
                <button onClick={handleDelete} className="px-3 py-2 bg-slate-800 hover:bg-red-900 border border-slate-600 hover:border-red-500 rounded-lg text-white transition-colors"><Trash2 size={14}/></button>
            </div>
        </div>
    );
};

const GameHUD = ({ conquestMode, mapPoints }) => {
    const [isMinimized, setIsMinimized] = useState(false);
    if (!conquestMode) return null;
    const totalStores = mapPoints.length;
    const conqueredCount = mapPoints.filter(s => s.isConquered).length;
    const percentage = totalStores > 0 ? Math.round((conqueredCount / totalStores) * 100) : 0;
    let rank = percentage > 75 ? "Kingpin" : (percentage > 50 ? "City Boss" : (percentage > 25 ? "District Manager" : "Street Peddler"));

    if (isMinimized) return (
        <div onClick={() => setIsMinimized(false)} className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/95 text-white px-4 py-2 rounded-full border border-orange-500 shadow-xl cursor-pointer hover:scale-105 transition-transform flex items-center gap-3">
            <Shield size={14} className="text-orange-500"/><span className="text-xs font-bold font-mono">Control: {percentage}%</span><Maximize2 size={12} className="text-slate-400"/>
        </div>
    );

    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/95 text-white px-6 py-4 rounded-2xl border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)] backdrop-blur-md flex flex-col items-center animate-slide-down min-w-[280px]">
            <button onClick={() => setIsMinimized(true)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><MinusCircle size={16}/></button>
            <div className="text-[10px] text-orange-400 font-bold tracking-[0.2em] uppercase mb-1">Territory Control</div>
            <div className="flex items-center gap-4 mb-3 mt-1"><div className="text-3xl font-black font-mono">{percentage}%</div><div className="h-8 w-[1px] bg-slate-600"></div><div><div className="text-[10px] text-slate-400 uppercase">Current Rank</div><div className="text-sm font-bold text-emerald-400">{rank}</div></div></div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700"><div className="h-full bg-gradient-to-r from-orange-600 to-yellow-400 transition-all duration-1000" style={{ width: `${percentage}%` }}></div></div>
        </div>
    );
};

const HudTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) return ( <div className="bg-slate-800 p-3 border border-slate-600 rounded text-xs text-white shadow-xl"><p className="font-bold border-b border-slate-600 mb-2 pb-1 text-slate-400">Date: {label}</p><p className="text-emerald-400 font-mono text-sm font-bold">Rp {new Intl.NumberFormat('id-ID').format(payload[0].value)}</p></div> );
    return null;
};

const StoreHUD = ({ store, mapPoints, transactions, inventory, db, appId, user, isAdmin, setSelectedStore, liveScaleOverride, setLiveScaleOverride }) => {
    const [showConsignDetails, setShowConsignDetails] = useState(false);
    const [isLinking, setIsLinking] = useState(false); 
    const [localScale, setLocalScale] = useState(store.catchmentScale || 1.0);
    
    useEffect(() => { setLocalScale(store.catchmentScale || 1.0); }, [store.id, store.catchmentScale]);

    const availableHubs = mapPoints.filter(c => c.storeType === 'Wholesaler' && c.id !== store.id);

    const stats = useMemo(() => {
        const storeTrans = transactions.filter(t => t.customerName === store.name);
        const totalRev = storeTrans.filter(t => t.type === 'SALE').reduce((sum, t) => sum + (t.total || 0), 0);
        const totalTitip = storeTrans.filter(t => t.type === 'SALE' && t.paymentType === 'Titip').reduce((sum, t) => sum + (t.total || 0), 0);
        const totalPaid = storeTrans.filter(t => t.type === 'CONSIGNMENT_PAYMENT').reduce((sum, t) => sum + (t.amountPaid || 0), 0);
        const currentConsignment = Math.max(0, totalTitip - totalPaid);
        const itemMap = {}; 
        storeTrans.forEach(t => {
            if (t.type === 'SALE' && t.paymentType === 'Titip') {
                t.items.forEach(i => { const bks = convertToBks(i.qty, i.unit, inventory ? inventory.find(p => p.id === i.productId) : null); if (!itemMap[i.productId]) itemMap[i.productId] = { name: i.name, qty: 0 }; itemMap[i.productId].qty += bks; });
            } else if (t.type === 'CONSIGNMENT_PAYMENT' || t.type === 'RETURN') {
                (t.items || t.itemsPaid || []).forEach(i => { const bks = convertToBks(i.qty, i.unit, inventory ? inventory.find(p => p.id === i.productId) : null); if (itemMap[i.productId]) itemMap[i.productId].qty -= bks; });
            }
        });
        const activeItems = Object.values(itemMap).filter(i => i.qty > 0);
        const graphData = storeTrans.filter(t => t.type === 'SALE').reduce((acc, t) => {
            const date = t.date.substring(5); const found = acc.find(i => i.date === date);
            if (found) found.total += t.total; else acc.push({ date, total: t.total }); return acc;
        }, []).sort((a,b) => a.date.localeCompare(b.date)).slice(-5);
        
        return { totalRev, currentConsignment, activeItems, visitCount: storeTrans.length, graphData };
    }, [store.name, transactions, inventory]);

    const handleToggleStoreType = async () => {
        if (!db || !appId) return;
        setIsLinking(true);
        try {
            const newType = store.storeType === 'Wholesaler' ? 'Retailer' : 'Wholesaler';
            const ref = doc(db, `artifacts/${appId}/users/${user.uid}/customers`, store.id);
            const updates = { storeType: newType };
            if (newType === 'Wholesaler') updates.suppliedBy = null; 
            await updateDoc(ref, updates);
        } catch (error) {} finally { setIsLinking(false); }
    };

    const handleAssignHub = async (hubId) => {
        if (!db || !appId) return;
        setIsLinking(true);
        try { await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, store.id), { suppliedBy: hubId === "none" ? null : hubId }); } catch (error) {} finally { setIsLinking(false); }
    };

    const handleSaveLocalScale = async () => {
        if (!db || !appId) return;
        try { await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, store.id), { catchmentScale: localScale }); } catch (error) {}
    };

    const getWhatsappLink = () => { if (!store.phone) return "#"; return `https://wa.me/${store.phone.replace(/\D/g, '').replace(/^0/, '62')}`; };
    const getGpsLink = () => { if (store.latitude && store.longitude) return `http://googleusercontent.com/maps.google.com/?q=${store.latitude},${store.longitude}`; return `http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(`${store.address || ''}, ${store.city || ''}`)}`; };

    return (
        <div className="absolute left-4 top-20 bottom-4 w-80 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700 p-6 overflow-y-auto z-[1000] animate-slide-in-left custom-scrollbar">
            <button onClick={() => setSelectedStore(null)} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full hover:bg-red-500 transition-colors"><X size={16}/></button>
            <div className="flex items-start justify-between mb-1 pr-8"><h2 className="text-2xl font-bold leading-tight">{store.name}</h2></div>
            
            {store.storeType === 'Wholesaler' && <span className="inline-flex items-center gap-1 bg-amber-500 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase mb-4 shadow-[0_0_10px_rgba(245,158,11,0.5)]"><Building2 size={10} /> WHOLESALE HUB</span>}
            <p className="text-slate-400 text-xs flex items-center gap-1 mb-4"><MapPin size={12}/> {store.city}</p>

            {isAdmin && (
                <div className="mb-6 bg-slate-800 p-4 rounded-xl border border-slate-600">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] uppercase font-bold text-slate-300 flex items-center gap-1"><Network size={12} className="text-orange-500"/> Individual Reach</label>
                        <div className="flex items-center gap-1">
                            <input type="number" step="0.1" min="0.1" max="5.0" value={localScale} onChange={(e) => { const val = Math.max(0.1, parseFloat(e.target.value) || 1); setLocalScale(val); setLiveScaleOverride(val); }} onBlur={handleSaveLocalScale} className="w-14 text-right text-xs font-mono bg-slate-900 p-1 rounded text-white border border-slate-600 focus:border-orange-500 outline-none"/>
                            <span className="text-[10px] text-slate-500 font-bold">x</span>
                        </div>
                    </div>
                    <input type="range" min="0.1" max="5.0" step="0.1" value={localScale} onChange={(e) => { const val = parseFloat(e.target.value); setLocalScale(val); setLiveScaleOverride(val); }} onMouseUp={handleSaveLocalScale} onTouchEnd={handleSaveLocalScale} className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all"/>
                    <p className="text-[9px] text-slate-500 mt-2 italic">Adjusting this only affects {store.name}'s footprint.</p>
                </div>
            )}

            {isAdmin && store.phone && <div className="mb-4 bg-slate-800 p-3 rounded-xl flex justify-between items-center"><span className="text-sm font-mono">{store.phone}</span><a href={getWhatsappLink()} target="_blank" rel="noreferrer" className="p-2 bg-green-600 rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2 text-xs font-bold"><Phone size={14}/> Chat</a></div>}
            {isAdmin && (
                <div className="mb-4 p-3 rounded-xl border border-slate-700 bg-slate-800/50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Set as Wholesale Hub</span>
                    <button onClick={handleToggleStoreType} disabled={isLinking} className={`w-10 h-6 rounded-full transition-colors relative ${store.storeType === 'Wholesaler' ? 'bg-amber-500' : 'bg-slate-600'}`}><span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${store.storeType === 'Wholesaler' ? 'translate-x-4' : 'translate-x-0'}`}></span></button>
                </div>
            )}
            {isAdmin && store.storeType !== 'Wholesaler' && (
                <div className="mb-6 bg-slate-800 p-4 rounded-xl border border-amber-500/30">
                    <label className="text-[10px] text-amber-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-2"><LinkIcon size={12}/> Map to Wholesaler</label>
                    <select value={store.suppliedBy || "none"} onChange={(e) => handleAssignHub(e.target.value)} disabled={isLinking} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 font-bold">
                        <option value="none">-- Select Wholesale Hub --</option>
                        {availableHubs.map(hub => <option key={hub.id} value={hub.id}>{hub.name} ({hub.city})</option>)}
                    </select>
                </div>
            )}
            
            <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border ${store.status === 'overdue' ? 'bg-red-500/20 border-red-500' : 'bg-emerald-500/20 border-emerald-500'}`}>
                <Calendar size={24} className={store.status === 'overdue' ? 'text-red-500' : 'text-emerald-500'}/>
                <div><p className="text-[10px] uppercase font-bold opacity-70">Next Visit</p><p className="font-bold text-sm">{store.diffDays <= 0 ? `${Math.abs(store.diffDays)} Days Overdue` : `Due in ${store.diffDays} days`}</p></div>
            </div>

            {isAdmin && (
                <div className="space-y-4 mb-6">
                    {stats.currentConsignment > 0 && (
                        <div className="p-3 bg-orange-500/20 border border-orange-500 rounded-xl transition-all">
                            <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowConsignDetails(!showConsignDetails)}>
                                <div><p className="text-[10px] text-orange-300 uppercase font-bold flex items-center gap-2"><Wallet size={12}/> Active Consignment</p><p className="text-xl font-bold text-orange-500">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats.currentConsignment)}</p></div>
                                <div className={`bg-orange-500/20 p-1 rounded-full transition-transform duration-300 ${showConsignDetails ? 'rotate-180' : ''}`}><ChevronRight size={16} className="text-orange-500 rotate-90"/></div>
                            </div>
                            {showConsignDetails && (
                                <div className="mt-3 pt-3 border-t border-orange-500/30 space-y-2 animate-fade-in">
                                    {stats.activeItems.length > 0 ? stats.activeItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-xs items-center"><span className="text-slate-300 font-medium">{item.name}</span><span className="text-orange-400 font-bold bg-orange-900/40 px-2 py-0.5 rounded">{item.qty} Bks</span></div>
                                    )) : <p className="text-xs text-slate-400 italic text-center">No item details found.</p>}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="bg-slate-800 p-3 rounded-xl"><p className="text-[10px] text-slate-400 uppercase">Lifetime Sales</p><p className="font-bold text-emerald-400">{new Intl.NumberFormat('id-ID', { compactDisplay: "short", notation: "compact", currency: 'IDR' }).format(stats.totalRev)}</p></div>
                </div>
            )}
            <a href={getGpsLink()} target="_blank" rel="noreferrer" className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"><MapPin size={16}/> GPS Navigation</a>
        </div>
    );
};

// --- MAIN WRAPPER ---
const MapMissionControl = ({ customers, transactions, inventory, db, appId, user, logAudit, triggerCapy, isAdmin, savedHome, onSetHome, tierSettings }) => {
    const [selectedStore, setSelectedStore] = useState(null);
    const [selectedZone, setSelectedZone] = useState(null); 
    const [filterTier, setFilterTier] = useState(['Platinum', 'Gold', 'Silver', 'Bronze']); 
    const [isAddingMode, setIsAddingMode] = useState(false); 
    const [newPinCoords, setNewPinCoords] = useState(null);
    const [showControls, setShowControls] = useState(false);

    const [conquestMode, setConquestMode] = useState(false); 
    const [networkMode, setNetworkMode] = useState(false); 
    const [showBorders, setShowBorders] = useState(false); 
    const [showImporter, setShowImporter] = useState(false);

    const [selectedRegion, setSelectedRegion] = useState("All"); 
    const [selectedCity, setSelectedCity] = useState("All");     
    const [liveScaleOverride, setLiveScaleOverride] = useState(null);
    
    const [boundaries, setBoundaries] = useState([]);

    useEffect(() => {
        const loadBorders = async () => {
            if (db && appId) {
                try {
                    const docSnap = await getDocs(collection(db, `artifacts/${appId}/settings`));
                    docSnap.forEach(d => { if (d.id === 'mapBoundaries') setBoundaries(d.data().list || []); });
                } catch(e) {}
            }
        };
        loadBorders();
    }, [db, appId]);

    const activeTiers = tierSettings || [
        { id: 'Platinum', label: 'Platinum', color: '#f59e0b', iconType: 'emoji', value: '🏆' },
        { id: 'Gold', label: 'Gold', color: '#fbbf24', iconType: 'emoji', value: '🥇' },
        { id: 'Silver', label: 'Silver', color: '#94a3b8', iconType: 'emoji', value: '🥈' },
        { id: 'Bronze', label: 'Bronze', color: '#78350f', iconType: 'emoji', value: '🥉' }
    ];

    const { mapPoints, locationTree } = useMemo(() => {
        const tree = {}; 
        const validStores = customers
            .filter(c => c.latitude && c.longitude)
            .map(c => {
                const lat = parseFloat(c.latitude); const lng = parseFloat(c.longitude);
                if (isNaN(lat) || isNaN(lng)) return null;

                let reg = c.region || "Uncategorized"; let cit = c.city || "Uncategorized";
                const addr = (c.address || "").toLowerCase();
                if (cit.toLowerCase().includes("jalan pemuda") || addr.includes("jalan pemuda")) cit = "Muntilan"; 
                if (!tree[reg]) tree[reg] = new Set(); tree[reg].add(cit);

                const last = c.lastVisit ? new Date(c.lastVisit) : new Date(0);
                const next = new Date(last); next.setDate(last.getDate() + (parseInt(c.visitFreq) || 7));
                const diffDays = Math.ceil((next - new Date()) / (1000 * 60 * 60 * 24));
                const daysSinceVisit = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
                const isConquered = daysSinceVisit <= 30;

                return { ...c, city: cit, latitude: lat, longitude: lng, status: diffDays <= 0 ? 'overdue' : (diffDays <= 2 ? 'soon' : 'ok'), diffDays, daysSinceVisit, isConquered };
            })
            .filter(c => c !== null);

        const filtered = validStores.filter(c => {
            if (selectedRegion !== "All" && c.region !== selectedRegion) return false;
            if (selectedCity !== "All" && c.city !== selectedCity) return false;
            if (!filterTier.includes(c.tier || 'Silver')) return false;
            return true;
        });

        const treeArray = Object.keys(tree).reduce((acc, reg) => { acc[reg] = Array.from(tree[reg]).sort(); return acc; }, {});
        return { mapPoints: filtered, locationTree: treeArray };
    }, [customers, filterTier, selectedRegion, selectedCity, activeTiers]);

    const networkLinks = useMemo(() => {
        if (!networkMode) return [];
        const links = [];
        const wholesalers = mapPoints.filter(c => c.storeType === 'Wholesaler');

        mapPoints.forEach(store => {
            if (store.suppliedBy) {
                const ws = wholesalers.find(w => String(w.id) === String(store.suppliedBy));
                if (ws) links.push({ id: `link-${ws.id}-${store.id}`, positions: [ [ws.latitude, ws.longitude], [store.latitude, store.longitude] ], color: ws.tier === 'Platinum' ? '#f59e0b' : '#fbbf24' });
            }
        });
        return links;
    }, [networkMode, mapPoints]);

    const toggleTierFilter = (tierId) => setFilterTier(prev => prev.includes(tierId) ? prev.filter(t => t !== tierId) : [...prev, tierId]);
    const toggleAllTiers = () => setFilterTier(filterTier.length === activeTiers.length ? [] : activeTiers.map(t => t.id));
    const handlePinClick = (store, map) => { setSelectedStore(store); setSelectedZone(null); setLiveScaleOverride(null); map.flyTo([store.latitude, store.longitude], 14, { duration: 1.2 }); };
    const activeStore = selectedStore ? mapPoints.find(s => s.id === selectedStore.id) || selectedStore : null;

    return (
        <div className="h-[calc(100vh-100px)] w-full rounded-2xl overflow-hidden shadow-2xl relative border dark:border-slate-700 bg-slate-900">
            <GameHUD conquestMode={conquestMode} mapPoints={mapPoints} /> 
            
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end pointer-events-none">
                <button onClick={() => setShowControls(!showControls)} className="lg:hidden pointer-events-auto bg-slate-900/90 text-white p-2.5 rounded-xl border border-slate-600 shadow-xl mb-2 hover:bg-slate-800 transition-colors backdrop-blur-md">{showControls ? <X size={20}/> : <Menu size={20}/>}</button>
                <div className={`flex flex-col gap-2 items-end transition-all duration-300 origin-top-right ${showControls ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none h-0'} lg:opacity-100 lg:scale-100 lg:pointer-events-auto lg:h-auto`}>
                    <div className="flex gap-2 pointer-events-auto">
                        <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                            <MapPin size={16} className="text-orange-500 ml-2"/>
                            <select value={selectedRegion} onChange={(e) => { setSelectedRegion(e.target.value); setSelectedCity("All"); }} className="bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none p-2 cursor-pointer min-w-[100px]"><option value="All">All Regions</option>{Object.keys(locationTree).sort().map(r => <option key={r} value={r}>{r}</option>)}</select>
                        </div>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-1 bg-slate-900/90 p-1.5 rounded-xl backdrop-blur-md border border-slate-700 pointer-events-auto shadow-xl">
                        <button onClick={toggleAllTiers} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterTier.length === activeTiers.length ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>All</button>
                        {activeTiers.map(tier => (
                            <button key={tier.id} onClick={() => toggleTierFilter(tier.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${filterTier.includes(tier.id) ? 'bg-slate-700 text-white border border-slate-500 shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-800 opacity-60'}`}>
                                {tier.iconType === 'image' ? <img src={tier.value} className="w-3 h-3 rounded-full"/> : <span>{tier.value}</span>}{tier.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2 w-full justify-end">
                        {isAdmin && (
                            <button onClick={() => setShowImporter(!showImporter)} className="pointer-events-auto px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 border bg-slate-800 text-slate-300 border-slate-600 hover:text-white hover:border-blue-500 transition-all">
                                <DownloadCloud size={16}/> Import Border
                            </button>
                        )}
                        <button onClick={() => setShowBorders(!showBorders)} className={`pointer-events-auto px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 border transition-all ${showBorders ? 'bg-blue-600 text-white border-blue-500 animate-pulse' : 'bg-white text-slate-700 border-slate-200'}`}><Map size={16}/> {showBorders ? "Borders: ON" : "Regional Borders"}</button>
                    </div>

                    <button onClick={() => setNetworkMode(!networkMode)} className={`pointer-events-auto px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 border transition-all ${networkMode ? 'bg-amber-600 text-white border-amber-500 animate-pulse' : 'bg-white text-slate-700 border-slate-200'}`}><Network size={16}/> {networkMode ? "Supply Lines: ON" : "View Supply Map"}</button>
                    <button onClick={() => setConquestMode(!conquestMode)} className={`pointer-events-auto px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 border transition-all ${conquestMode ? 'bg-purple-600 text-white border-purple-500 animate-pulse' : 'bg-white text-slate-700 border-slate-200'}`}><Swords size={16}/> {conquestMode ? "Heatmap: ON" : "Analyze Catchment Areas"}</button>
                </div>
            </div>

            {showImporter && <BorderImporter db={db} appId={appId} boundaries={boundaries} setBoundaries={setBoundaries} setIsOpen={setShowImporter} />}

            <MapContainer center={[-7.6145, 110.7122]} zoom={10} style={{ height: '100%', width: '100%' }} className="z-0" zoomControl={false}>
                <ZoomControl position="topleft" />
                <MapEffectController selectedRegion={selectedRegion} selectedCity={selectedCity} mapPoints={mapPoints} savedHome={savedHome} />
                <LayersControl position="bottomright">
                    <LayersControl.BaseLayer checked name="Game Mode (Balanced)">
                        <TileLayer className="balanced-dark-tile" url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='© CARTO' />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satellite">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='© Esri'/>
                    </LayersControl.BaseLayer>
                </LayersControl>

                <AdminControls isAdmin={isAdmin} onSetHome={onSetHome}/>
                <MapClicker isAddingMode={isAddingMode} setNewPinCoords={setNewPinCoords} setIsAddingMode={setIsAddingMode} setSelectedStore={setSelectedStore} setSelectedZone={setSelectedZone} />
                
                {/* --- RENDER IMPORTED BOUNDARIES --- */}
                {showBorders && boundaries.map((boundary) => (
                    <GeoJSON 
                        key={`bnd-${boundary.id}`}
                        data={boundary.geometry} 
                        style={{ 
                            color: boundary.color, 
                            weight: boundary.level === 'Kabupaten' ? 4 : 2, 
                            opacity: boundary.level === 'Kabupaten' ? 1 : 0.8, 
                            fillOpacity: boundary.level === 'Kabupaten' ? 0.05 : 0.15, 
                            dashArray: boundary.level === 'Kabupaten' ? '10, 10' : '5, 5' 
                        }}
                        onEachFeature={(f, layer) => {
                            layer.on({
                                click: (e) => { L.DomEvent.stopPropagation(e); setSelectedStore(null); setSelectedZone(boundary); },
                                mouseover: (e) => e.target.setStyle({ fillOpacity: 0.3 }),
                                mouseout: (e) => e.target.setStyle({ fillOpacity: boundary.level === 'Kabupaten' ? 0.05 : 0.15 })
                            });
                            layer.bindTooltip(boundary.name, { permanent: false, direction: "center", className: "font-bold font-mono text-xs bg-slate-900 text-white border-none" });
                        }}
                    />
                ))}

                {networkMode && networkLinks.map(link => (
                    <Polyline key={link.id} positions={link.positions} pathOptions={{ color: link.color, weight: 3, opacity: 0.8, className: 'animated-supply-line' }}/>
                ))}

                {conquestMode && mapPoints.map(store => {
                    let baseRadius = 300; 
                    if (store.storeType === 'Wholesaler') baseRadius = 2500; 
                    else if (store.tier === 'Platinum') baseRadius = 1500;
                    else if (store.tier === 'Gold') baseRadius = 800;
                    else if (store.tier === 'Silver') baseRadius = 500;

                    const isEditingThisStore = activeStore && activeStore.id === store.id && liveScaleOverride !== null;
                    const storeScale = isEditingThisStore ? liveScaleOverride : (store.catchmentScale || 1.0);
                    const finalRadius = baseRadius * storeScale;

                    return (
                        <Circle key={`circle-${store.id}`} center={[store.latitude, store.longitude]} radius={finalRadius} className="venn-heatmap-circle" pathOptions={{ color: 'transparent', fillColor: '#f97316', fillOpacity: 0.35 }}/>
                    );
                })}
                {mapPoints.map(store => <MarkerWithZoom key={store.id} store={store} activeTiers={activeTiers} conquestMode={conquestMode} handlePinClick={handlePinClick}/>)}
            </MapContainer>

            {activeStore && <StoreHUD store={activeStore} mapPoints={mapPoints} transactions={transactions} inventory={inventory} db={db} appId={appId} user={user} isAdmin={isAdmin} setSelectedStore={setSelectedStore} liveScaleOverride={liveScaleOverride} setLiveScaleOverride={setLiveScaleOverride} />}
            <ZoneHUD zone={selectedZone} mapPoints={mapPoints} setSelectedZone={setSelectedZone} boundaries={boundaries} setBoundaries={setBoundaries} db={db} appId={appId} />
            
            <style>{`
                .leaflet-tooltip-pane { z-index: 9999 !important; pointer-events: none !important; }
                .leaflet-tooltip.custom-leaflet-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
                .leaflet-tooltip.custom-leaflet-tooltip::before, .leaflet-tooltip.custom-leaflet-tooltip::after { display: none !important; }
                .custom-icon .marker-inner { transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-origin: center center; }
                .custom-icon:hover .marker-inner { transform: scale(1.2); filter: drop-shadow(0 0 10px gold); }
                .custom-icon:hover { z-index: 10000 !important; }
                .store-3d-card { transform: perspective(1000px) rotateX(20deg) scale(0.5) translateY(20px); opacity: 0; transform-origin: bottom center; }
                .custom-leaflet-tooltip .store-3d-card { animation: popIn 0.3s forwards; }
                @keyframes popIn { 0% { transform: perspective(1000px) rotateX(20deg) scale(0.5) translateY(20px); opacity: 0; } 100% { transform: perspective(1000px) rotateX(-5deg) scale(1.0) translateY(-10px); opacity: 1; box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.8); } }
                .balanced-dark-tile { filter: brightness(1.2); }
                .animated-supply-line { stroke-dasharray: 8, 12; animation: flow 30s linear infinite; }
                @keyframes flow { to { stroke-dashoffset: -1000; } }
                .venn-heatmap-circle { mix-blend-mode: multiply; }
                @keyframes slide-down { from { transform: translate(-50%, -100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                .animate-slide-down { animation: slide-down 0.5s ease-out forwards; }
                @keyframes slide-in-left { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .animate-slide-in-left { animation: slide-in-left 0.3s ease-out forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 2px; }
            `}</style>
        </div>
    );
};

export default MapMissionControl;