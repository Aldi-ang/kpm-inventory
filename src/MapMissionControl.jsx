import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, GeoJSON, Tooltip as LeafletTooltip, useMap, useMapEvents, LayersControl, ZoomControl } from 'react-leaflet';

// 100% SAFE IMPORTS
import { 
    MapPin, Store, Calendar, Wallet, X, Phone, ChevronRight, 
    ShieldCheck, Globe, Menu, Database, Tag, DollarSign,
    MinusCircle, Maximize2, Search, Trash2, Download, 
    Save, AlertCircle, Upload, Pencil, Folder, TrendingUp, ShieldAlert
} from 'lucide-react';

import L from 'leaflet';
import { doc, collection, getDocs, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// --- UTILITY HELPERS ---
const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

const compressCoords = (coords) => {
    if (Array.isArray(coords)) {
        if (typeof coords[0] === 'number') {
            return [Number(coords[0].toFixed(4)), Number(coords[1].toFixed(4))];
        }
        return coords.map(compressCoords);
    }
    return coords;
};

const isPointInPolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i][0], yi = polygon[i][1], xj = polygon[j][0], yj = polygon[j][1];
        let intersect = ((yi > point[1]) !== (yj > point[1])) && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

const checkPointInGeoJSON = (lng, lat, geometry) => {
    if (!geometry || !geometry.coordinates) return false;
    const point = [lng, lat];
    if (geometry.type === 'Polygon') return isPointInPolygon(point, geometry.coordinates[0]);
    if (geometry.type === 'MultiPolygon') {
        for (let poly of geometry.coordinates) { if (isPointInPolygon(point, poly[0])) return true; }
    }
    return false;
};

const convertToBks = (qty, unit, product) => {
    if (!product) return qty;
    const packsPerSlop = product.packsPerSlop || 10, slopsPerBal = product.slopsPerBal || 20, balsPerCarton = product.balsPerCarton || 4;
    if (unit === 'Slop') return qty * packsPerSlop;
    if (unit === 'Bal') return qty * slopsPerBal * packsPerSlop;
    if (unit === 'Karton') return qty * balsPerCarton * slopsPerBal * packsPerSlop;
    return qty; 
};

// --- MAP ICONS ---
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
        iconSize: [34, 34], iconAnchor: [17, 17]
    });
};

const MapEffectController = ({ selectedRegion, selectedCity, mapPoints, savedHome, uploadedFocus, selectedZone }) => {
    const map = useMap();
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (uploadedFocus && Array.isArray(uploadedFocus) && uploadedFocus.length === 2 && !isNaN(uploadedFocus[0])) { 
            map.flyTo(uploadedFocus, 10, { duration: 1.5 }); 
        }
    }, [uploadedFocus, map]);

    // FIX: Smart Camera Math Engine prevents Leaflet from crashing on small screens
    useEffect(() => {
        if (selectedZone && selectedZone.geometry) {
            try {
                const layer = L.geoJSON(selectedZone.geometry);
                const bounds = layer.getBounds();
                const mapWidth = map.getSize().x;
                // If screen is wide, shift map 400px right. If mobile/small, center it.
                const leftPad = mapWidth > 650 ? 400 : 20; 
                map.fitBounds(bounds, { 
                    paddingTopLeft: [leftPad, 20], 
                    paddingBottomRight: [20, 20], 
                    maxZoom: 13, 
                    duration: 1.2 
                });
            } catch(e) {}
        }
    }, [selectedZone, map]);

    useEffect(() => {
        if (isFirstRun.current) {
            if (savedHome && savedHome.lat && savedHome.lng) map.setView([savedHome.lat, savedHome.lng], savedHome.zoom || 13);
            else map.locate().on("locationfound", (e) => map.flyTo(e.latlng, 13));
            isFirstRun.current = false;
        }
    }, [map, savedHome]);
    
    useEffect(() => {
        if (!uploadedFocus && !selectedZone && selectedRegion !== "All" && mapPoints.length > 0) {
            let latSum = 0, lngSum = 0;
            mapPoints.forEach(p => { latSum += p.latitude; lngSum += p.longitude; });
            map.flyTo([latSum / mapPoints.length, lngSum / mapPoints.length], 12, { duration: 1.5 });
        }
    }, [selectedRegion, selectedCity, map, uploadedFocus, mapPoints, selectedZone]); 
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
                navigator.clipboard.writeText(`${e.latlng.lat}, ${e.latlng.lng}`);
                if(window.confirm(`Pin Dropped!\nCoords: ${e.latlng.lat}, ${e.latlng.lng}\n\nCreate new store here?`)) setIsAddingMode(false);
            } else {
                setSelectedStore(null); setSelectedZone(null); 
            }
        }
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

// --- TACTICAL SECTOR DASHBOARD ---
const TacticalDashboard = ({ boundaries, zoneRevenues, mapPoints, transactions, selectedZone, setSelectedZone, onClose, salesHeatmapMode, setSalesHeatmapMode, selectedAreaType, setSelectedAreaType, timeFilter, setTimeFilter }) => {
    const [isMinimized, setIsMinimized] = useState(false);

    // FIX: Perfect Global Revenue sync. Directly sums the exact values shown on the leaderboard for the selected tier.
    const globalRevenue = useMemo(() => {
        let total = 0;
        const visibleBoundaries = selectedAreaType !== "All" 
            ? boundaries.filter(b => b.level === selectedAreaType)
            : boundaries;
            
        visibleBoundaries.forEach(b => {
            total += (zoneRevenues[b.id] || 0);
        });
        return total;
    }, [boundaries, zoneRevenues, selectedAreaType]);
    
    const rankedSectors = useMemo(() => {
        let filtered = [...boundaries];
        if (selectedAreaType !== "All") {
            filtered = filtered.filter(b => b.level === selectedAreaType);
        }
        return filtered.sort((a,b) => (zoneRevenues[b.id]||0) - (zoneRevenues[a.id]||0));
    }, [boundaries, zoneRevenues, selectedAreaType]);

    const maxRev = rankedSectors.length > 0 ? (zoneRevenues[rankedSectors[0].id] || 1) : 1;

    const activeZoneRev = selectedZone ? (zoneRevenues[selectedZone.id] || 0) : 0;
    const activeZoneStores = selectedZone ? mapPoints.filter(s => checkPointInGeoJSON(s.longitude, s.latitude, selectedZone.geometry)) : [];
    const activeOverdue = activeZoneStores.filter(s => s.status === 'overdue').length;

    if (isMinimized) {
        return (
            <div className="absolute top-4 left-4 z-[2000] animate-slide-in-left">
                <button onClick={() => setIsMinimized(false)} className="bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3 hover:bg-slate-800 transition-colors font-mono font-bold text-xs uppercase tracking-widest">
                    <ShieldAlert size={18} className="animate-pulse" />
                    Sector Command
                    <Maximize2 size={14} className="text-slate-400 ml-2"/>
                </button>
            </div>
        );
    }

    return (
        // FIX: max-h adjusted to 100% of the MAP container, preventing the bottom from getting sliced off
        <div className="absolute top-4 left-4 w-[90vw] md:w-[380px] bg-slate-900/80 hover:bg-slate-900/95 transition-all duration-300 backdrop-blur-md border-2 border-slate-700 shadow-2xl rounded-2xl z-[2000] animate-slide-in-left flex flex-col max-h-[calc(100%-32px)] overflow-hidden font-mono">
            <div className="crt-overlay"></div>

            <div className="p-5 border-b border-slate-700 bg-black/40 relative z-10 shrink-0">
                <div className="absolute top-4 right-4 flex gap-3">
                    <button onClick={() => setIsMinimized(true)} className="text-slate-500 hover:text-white transition-colors"><MinusCircle size={18}/></button>
                    <button onClick={onClose} className="text-slate-500 hover:text-red-500 transition-colors"><X size={18}/></button>
                </div>
                <div className="flex items-center gap-3 mb-3">
                    <ShieldAlert size={24} className="text-emerald-500 animate-pulse"/>
                    <h2 className="text-lg font-black text-white uppercase tracking-[0.2em]">Sector Command</h2>
                </div>

                <div className="flex items-center gap-2 mb-3 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700">
                    <Tag size={14} className="text-slate-400 ml-1"/>
                    <select
                        value={selectedAreaType}
                        onChange={(e) => setSelectedAreaType(e.target.value)}
                        className="bg-transparent text-xs font-bold text-white outline-none w-full cursor-pointer"
                    >
                        {/* FIX: Removed 'All' to mathematically isolate territory tiers */}
                        <option value="Provinsi" className="bg-slate-900">Provinsi Dashboard</option>
                        <option value="Kabupaten" className="bg-slate-900">Kabupaten Dashboard</option>
                        <option value="Kecamatan" className="bg-slate-900">Kecamatan Dashboard</option>
                        <option value="Desa" className="bg-slate-900">Desa/Kelurahan Dashboard</option>
                    </select>
                </div>

                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Global Revenue</p>
                            <select 
                                value={timeFilter} 
                                onChange={(e) => setTimeFilter(e.target.value)}
                                className="bg-slate-800 text-[9px] text-emerald-400 font-bold px-1.5 py-0.5 rounded outline-none cursor-pointer border border-emerald-500/30 hover:border-emerald-500 transition-colors"
                            >
                                <option value="Today">Today</option>
                                <option value="7 Days">7 Days</option>
                                <option value="This Month">This Month</option>
                                <option value="This Year">This Year</option>
                                <option value="All-Time">All-Time</option>
                            </select>
                        </div>
                        <p className="text-2xl font-black text-emerald-400">{formatRupiah(globalRevenue)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Active Sectors</p>
                        <p className="text-xl font-bold text-white">{rankedSectors.length}</p>
                    </div>
                </div>
            </div>

            <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center z-10 shrink-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Heatmap Engine</span>
                <button onClick={() => setSalesHeatmapMode(!salesHeatmapMode)} className={`w-12 h-6 rounded-full transition-colors relative ${salesHeatmapMode ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${salesHeatmapMode ? 'translate-x-6' : 'translate-x-0'}`}></span>
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 z-10 custom-scrollbar relative">
                {rankedSectors.map((sector, index) => {
                    const rev = zoneRevenues[sector.id] || 0;
                    const ratio = rev / maxRev;
                    const barColor = ratio > 0.6 ? 'bg-emerald-500' : ratio > 0.2 ? 'bg-orange-500' : 'bg-red-500';
                    const textColor = ratio > 0.6 ? 'text-emerald-400' : ratio > 0.2 ? 'text-orange-400' : 'text-red-400';
                    const isSelected = selectedZone?.id === sector.id;

                    return (
                        <div 
                            key={sector.id} 
                            onClick={() => setSelectedZone(sector)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer group ${isSelected ? 'bg-white/10 border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-black/40 border-slate-700 hover:border-slate-500'}`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-[10px] font-bold text-slate-500 w-4">{index + 1}.</span>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-xs font-bold text-white uppercase tracking-wider truncate">{sector.name}</span>
                                        <span className="text-[8px] text-slate-500 uppercase">{sector.level}</span>
                                    </div>
                                </div>
                                <span className={`text-xs font-black ${textColor}`}>{formatRupiah(rev)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                                <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${ratio * 100}%` }}></div>
                            </div>
                        </div>
                    );
                })}
                {rankedSectors.length === 0 && (
                    <div className="text-center py-10 text-slate-500 opacity-50 flex flex-col items-center">
                        <TrendingUp size={32} className="mb-2"/>
                        <p className="text-xs uppercase tracking-widest">No Sector Data found</p>
                    </div>
                )}
            </div>

            {/* FIX: Always visible footer panel so it never vanishes off-screen */}
            <div className="p-3 border-t border-slate-700 bg-gradient-to-t from-black to-slate-900 z-10 shrink-0 min-h-[85px] flex flex-col justify-center">
                {selectedZone ? (
                    <>
                        <div className="flex justify-between items-center mb-2.5">
                            <div className="min-w-0 pr-2">
                                <p className="text-[8px] text-emerald-500 uppercase font-bold tracking-widest animate-pulse mb-0.5">Target Locked</p>
                                <h3 className="text-base font-black text-white uppercase tracking-wider truncate leading-tight">{selectedZone.name}</h3>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-base font-black text-emerald-400 leading-tight">{formatRupiah(activeZoneRev)}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1 bg-black/50 p-2 rounded-lg border border-slate-700 flex justify-between items-center">
                                <span className="text-[8px] text-slate-500 uppercase tracking-widest">Assets</span>
                                <span className="text-xs font-bold text-white">{activeZoneStores.length}</span>
                            </div>
                            <div className={`flex-[1.2] p-2 rounded-lg border flex justify-between items-center ${activeOverdue > 0 ? 'bg-red-900/20 border-red-500/50' : 'bg-black/50 border-slate-700'}`}>
                                <span className={`text-[8px] uppercase tracking-widest ${activeOverdue > 0 ? 'text-red-400' : 'text-slate-500'}`}>Threat</span>
                                <span className={`font-bold text-[9px] ${activeOverdue > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                                    {activeOverdue > 0 ? `${activeOverdue} OVERDUE` : 'CLEAR'}
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    /* EMPTY STATE WHEN NO TARGET IS CLICKED */
                    <div className="text-center opacity-50 flex flex-col items-center justify-center py-1">
                        <ShieldAlert size={20} className="mb-1 text-slate-400"/>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Select Sector for Analysis</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- DEDICATED GEOJSON UPLOADER & MANAGER ---
const BorderImporter = ({ db, appId, user, boundaries, setBoundaries, setIsOpen, setShowBorders, setUploadedFocus }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState("");
    
    const [openGroups, setOpenGroups] = useState({ Provinsi: true, Kabupaten: true, Kecamatan: true, Desa: true });
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");

    const fileInputRef = useRef(null);
    const palette = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#34d399", "#2dd4bf", "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa", "#c084fc", "#e879f9", "#f472b6", "#fb7185"];

    const userId = user?.uid || user?.id || 'default';
    const CACHE_KEY = `cello_map_bnd_${appId}`;

    const safeBoundaries = Array.isArray(boundaries) ? boundaries.filter(b => b && typeof b === 'object' && b.id) : [];
    const groupedBoundaries = { Provinsi: [], Kabupaten: [], Kecamatan: [], Desa: [] };
    
    safeBoundaries.forEach(b => {
        const lvl = b.level || 'Kecamatan';
        if (groupedBoundaries[lvl]) groupedBoundaries[lvl].push(b);
        else groupedBoundaries.Kecamatan.push(b);
    });

    const toggleGroup = (lvl) => setOpenGroups(prev => ({ ...prev, [lvl]: !prev[lvl] }));

    const saveBoundaryToFirebase = async (boundary) => {
        if (db && appId && userId) {
            try { 
                const { geometry, feature, ...boundaryToSave } = boundary;
                boundaryToSave.geometryString = JSON.stringify(geometry); 
                await setDoc(doc(db, `artifacts/${appId}/users/${userId}/mapSettings`, `bnd_${boundary.id}`), boundaryToSave); 
            } catch(e) { console.error("Firebase save failed:", e); }
        }
    };

    const deleteBoundaryFromFirebase = async (id) => {
        if (db && appId && userId) {
            try { await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/mapSettings`, `bnd_${id}`)); } 
            catch(e) {}
        }
    };

    const handleWipeAll = async () => {
        if(window.confirm("WARNING: This will completely delete ALL active borders from your map. Continue?")) {
            for (let b of safeBoundaries) { await deleteBoundaryFromFirebase(b.id); }
            setBoundaries([]);
            localStorage.removeItem(CACHE_KEY);
        }
    };

    const handleDeleteBorder = async (idToRemove) => {
        if(window.confirm("Remove this specific border?")) {
            const updated = safeBoundaries.filter(b => b.id !== idToRemove);
            setBoundaries(updated); 
            localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
            await deleteBoundaryFromFirebase(idToRemove);
        }
    };

    const handleSaveName = async (id) => {
        if (!editName || !editName.trim()) { setEditingId(null); return; }
        const targetBoundary = safeBoundaries.find(b => b.id === id);
        if (targetBoundary) {
            const updatedBoundary = { ...targetBoundary, name: editName.trim() };
            const updatedList = safeBoundaries.map(b => b.id === id ? updatedBoundary : b);
            setBoundaries(updatedList);
            localStorage.setItem(CACHE_KEY, JSON.stringify(updatedList));
            await saveBoundaryToFirebase(updatedBoundary);
        }
        setEditingId(null);
    };

    // --- NEW: VISIBILITY TOGGLES ---
    const toggleVisibility = async (id, currentHidden) => {
        const updatedList = safeBoundaries.map(b => b.id === id ? { ...b, isHidden: !currentHidden } : b);
        setBoundaries(updatedList);
        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedList));
        const target = updatedList.find(b => b.id === id);
        if (target) await saveBoundaryToFirebase(target);
    };

    const toggleGroupVisibility = async (level, hide) => {
        const updatedList = safeBoundaries.map(b => b.level === level ? { ...b, isHidden: hide } : b);
        setBoundaries(updatedList);
        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedList));
        
        safeBoundaries.forEach(b => {
            if (b.level === level && !!b.isHidden !== hide) {
                const target = updatedList.find(u => u.id === b.id);
                if (target) saveBoundaryToFirebase(target);
            }
        });
    };

    const extractNameAndLevel = (props, index) => {
        let name = `Imported Region ${index}`;
        let level = "Kecamatan"; 

        if (props.DESA || props.KELURAHAN || props.NAME_4 || props.nm_desa || props.WADMKD || props.NAMOBJ || props.desa) {
            name = `${props.DESA || props.KELURAHAN || props.NAME_4 || props.nm_desa || props.WADMKD || props.NAMOBJ || props.desa}`;
            level = "Desa";
        } else if (props.KECAMATAN || props.NAME_3 || props.nm_kecamatan || props.nm_kec || props.WADMKC || props.kecamatan) {
            name = `${props.KECAMATAN || props.NAME_3 || props.nm_kecamatan || props.nm_kec || props.WADMKC || props.kecamatan}`;
            level = "Kecamatan";
        } else if (props.KABUPATEN || props.NAME_2 || props.nm_dati2 || props.WADMKK || props.kabupaten) {
            name = `${props.KABUPATEN || props.NAME_2 || props.nm_dati2 || props.WADMKK || props.kabupaten}`;
            level = "Kabupaten";
        } else if (props.PROVINSI || props.NAME_1 || props.nm_propinsi || props.WADMPR || props.provinsi) {
            name = `${props.PROVINSI || props.NAME_1 || props.nm_propinsi || props.WADMPR || props.provinsi}`;
            level = "Provinsi";
        } else if (props.name) {
            name = props.name;
        } else {
            const fallback = Object.values(props).find(val => typeof val === 'string' && val.length > 2 && isNaN(val));
            if (fallback) name = fallback;
        }
        return { name, level };
    };

    const handleFileUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        setProgress("Parsing and Extracting Regions...");
        setIsLoading(true); setError(null);

        reader.onload = async (event) => {
            try {
                const geojson = JSON.parse(event.target.result);
                let features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
                let newBoundaries = [...safeBoundaries];
                let firstCoord = null;

                for (let idx = 0; idx < features.length; idx++) {
                    let feature = features[idx];
                    if(feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
                        feature.geometry.coordinates = compressCoords(feature.geometry.coordinates);
                        const props = feature.properties || {};
                        const { name, level } = extractNameAndLevel(props, idx + 1);
                        
                        let color = palette[Math.floor(Math.random() * palette.length)];
                        if (level === 'Kabupaten') color = '#ef4444';
                        if (level === 'Provinsi') color = '#10b981';

                        if (!firstCoord) {
                            try {
                                if (feature.geometry.type === 'Polygon') firstCoord = [feature.geometry.coordinates[0][0][1], feature.geometry.coordinates[0][0][0]];
                                else if (feature.geometry.type === 'MultiPolygon') firstCoord = [feature.geometry.coordinates[0][0][0][1], feature.geometry.coordinates[0][0][0][0]];
                            } catch(err) {}
                        }

                        if (!newBoundaries.find(b => b.name === name && b.level === level)) {
                            const newBoundary = {
                                id: `BND_CUSTOM_${Date.now()}_${idx}`,
                                name: name,
                                fullName: `File: ${file.name}`,
                                geometry: feature.geometry,
                                color: color,
                                level: level,
                                isHidden: false // Default to visible
                            };
                            newBoundaries.push(newBoundary);
                            await saveBoundaryToFirebase(newBoundary);
                        }
                    }
                }
                
                setBoundaries(newBoundaries);
                localStorage.setItem(CACHE_KEY, JSON.stringify(newBoundaries));
                setShowBorders(true); 
                
                if (firstCoord && setUploadedFocus) setUploadedFocus(firstCoord);

                setProgress("Upload and extraction successful!");
                setTimeout(() => setProgress(""), 3000);
            } catch (err) {
                setError("Upload failed. File may be corrupted or not valid JSON.");
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="absolute top-24 right-4 w-[400px] min-w-[320px] max-w-[600px] bg-slate-900 border-2 border-blue-500 shadow-2xl rounded-xl p-5 z-[2000] animate-slide-in-left min-h-[50vh] max-h-[90vh] flex flex-col resize-y overflow-hidden">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={16}/></button>
            <h3 className="text-white font-bold mb-1 flex items-center gap-2"><Globe size={16} className="text-blue-500"/> Territory Manager</h3>
            <p className="text-[10px] text-slate-400 mb-4 leading-tight border-b border-slate-700 pb-3">Upload and manage official BAPPEDA/BPS GeoJSON files.</p>
            
            <div className="bg-slate-800 p-4 rounded-lg border border-dashed border-emerald-500/50 mb-3 transition-all hover:bg-slate-800/80 shrink-0">
                <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-2"><Upload size={12}/> Offline Upload</p>
                <p className="text-[10px] text-slate-400 mb-3 leading-tight">Drop official BAPPEDA/BPS <b>.geojson</b> files here. The system will auto-extract regions.</p>
                <input type="file" accept=".geojson,.json" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={isLoading} className="w-full bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500 text-emerald-400 font-bold py-2.5 rounded flex justify-center items-center gap-2 text-xs transition-colors disabled:opacity-50">
                    <Upload size={14}/> {isLoading ? "Processing..." : "Select Shapefile"}
                </button>
            </div>

            {error && <p className="text-[10px] text-red-400 mb-2 font-bold bg-red-900/30 p-2 rounded border border-red-500/50 shrink-0">{error}</p>}
            {progress && <p className="text-[10px] text-blue-400 mb-2 font-bold animate-pulse text-center bg-blue-900/20 p-2 rounded shrink-0">{progress}</p>}

            <div className="mt-2 flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-2 shrink-0 bg-slate-800 p-2 rounded border border-slate-700">
                    <h4 className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Active Borders ({safeBoundaries.length})</h4>
                    <button onClick={handleWipeAll} className="text-[9px] px-2 py-1 rounded bg-red-900/50 text-red-400 hover:bg-red-500 hover:text-white font-bold uppercase transition-colors">Clear All</button>
                </div>
                
                {safeBoundaries.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                        <Globe size={32} className="mb-2 text-slate-500" />
                        <p className="text-xs text-slate-400 italic text-center">No borders saved.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1.5 pb-2">
                        {['Provinsi', 'Kabupaten', 'Kecamatan', 'Desa'].map(level => {
                            if (!groupedBoundaries[level] || groupedBoundaries[level].length === 0) return null;
                            return (
                                <div key={level}>
                                    {/* FIX: HEADER ROW WITH MASS TOGGLES */}
                                    <div className="flex justify-between items-center bg-slate-800 p-2 rounded mb-1 border border-slate-700">
                                        <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggleGroup(level)}>
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{level} ({groupedBoundaries[level].length})</span>
                                            <ChevronRight size={14} className={`text-slate-400 transition-transform ${openGroups[level] ? 'rotate-90' : ''}`}/>
                                        </div>
                                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => toggleGroupVisibility(level, false)} className="text-[8px] font-bold tracking-widest bg-emerald-900/40 text-emerald-400 hover:bg-emerald-500 hover:text-white px-2 py-1 rounded transition-colors">SHOW ALL</button>
                                            <button onClick={() => toggleGroupVisibility(level, true)} className="text-[8px] font-bold tracking-widest bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white px-2 py-1 rounded transition-colors">HIDE ALL</button>
                                        </div>
                                    </div>

                                    {openGroups[level] && groupedBoundaries[level].map(b => (
                                        <div key={b.id} className={`flex items-center justify-between bg-slate-900 p-2.5 rounded border ml-2 mb-1 group hover:border-slate-500 transition-colors ${b.isHidden ? 'border-red-900/30 opacity-60' : 'border-slate-700'}`}>
                                            {/* INLINE EDIT MODE */}
                                            {editingId === b.id ? (
                                                <div className="flex flex-1 items-center gap-2 mr-2">
                                                    <input 
                                                        type="text" autoFocus
                                                        value={editName} 
                                                        onChange={e => setEditName(e.target.value)} 
                                                        onKeyDown={e => e.key === 'Enter' && handleSaveName(b.id)}
                                                        className="flex-1 bg-slate-800 border border-blue-500 text-white text-[10px] font-bold p-1.5 rounded outline-none"
                                                    />
                                                    <button onClick={() => handleSaveName(b.id)} className="text-emerald-400 hover:text-emerald-300 bg-emerald-900/30 p-1.5 rounded"><Save size={14}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: b.level === 'Kabupaten' ? 'transparent' : b.color, border: b.level === 'Kabupaten' ? `2px solid ${b.color}` : 'none', opacity: b.isHidden ? 0.2 : 1 }}></div>
                                                    <span className={`text-xs font-medium truncate ${b.isHidden ? 'text-slate-500 line-through' : 'text-white'}`} title={b.name}>{b.name}</span>
                                                    <span className="text-[8px] text-slate-400 bg-slate-900 px-1 rounded uppercase shrink-0">{String(b.level || '').substring(0,3)}</span>
                                                </div>
                                            )}

                                            {/* FIX: INDIVIDUAL ROW CONTROLS */}
                                            <div className="flex items-center gap-1 shrink-0 opacity-100 lg:opacity-30 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => toggleVisibility(b.id, b.isHidden)} className={`text-[8px] font-bold px-1.5 py-1 rounded transition-colors ${b.isHidden ? 'bg-slate-800 text-slate-500 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-900/50 text-emerald-400 hover:bg-slate-700 hover:text-white'}`}>
                                                    {b.isHidden ? 'HIDDEN' : 'VISIBLE'}
                                                </button>
                                                {editingId !== b.id && (
                                                    <button onClick={() => { setEditingId(b.id); setEditName(b.name || ""); }} className="text-slate-400 hover:text-blue-400 p-1 rounded bg-slate-900 transition-colors"><Pencil size={12}/></button>
                                                )}
                                                <button onClick={() => handleDeleteBorder(b.id)} className="text-slate-400 hover:text-red-500 p-1 rounded bg-slate-900 transition-colors"><Trash2 size={12}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-1 opacity-50 hover:opacity-100">
                <div className="w-2 h-2 border-b-2 border-r-2 border-slate-500 rounded-br-sm"></div>
            </div>
        </div>
    );
};

const ZoneHUD = ({ zone, mapPoints, setSelectedZone }) => {
    if (!zone) return null;

    const storesInZone = (mapPoints || []).filter(store => checkPointInGeoJSON(store.longitude, store.latitude, zone.geometry));
    const wholesalers = storesInZone.filter(s => s.storeType === 'Wholesaler').length;
    const retailers = storesInZone.length - wholesalers;

    return (
        <div className="absolute left-4 top-20 w-72 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-blue-500 p-5 z-[1000] animate-slide-in-left">
            <button onClick={() => setSelectedZone(null)} className="absolute top-4 right-4 p-1.5 bg-slate-800 rounded-full hover:bg-red-500 transition-colors"><X size={14}/></button>
            <div className="flex items-center gap-2 mb-1">
                <Globe className="text-blue-500" size={20}/>
                <h2 className="text-xl font-bold leading-tight truncate pr-6">{zone.name}</h2>
            </div>
            <p className="text-[9px] text-slate-400 mb-4 border-b border-slate-700 pb-2 truncate">{zone.fullName || "Imported Region"}</p>
            <div className="mb-3 flex items-center gap-2">
                <Tag size={12} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{zone.level}</span>
            </div>
            
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
            <button className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-bold transition-colors uppercase tracking-widest">Assign Rep to Territory</button>
        </div>
    );
};

const GameHUD = ({ conquestMode, mapPoints }) => {
    const [isMinimized, setIsMinimized] = useState(false);
    if (!conquestMode) return null;
    const totalStores = (mapPoints || []).length;
    const conqueredCount = (mapPoints || []).filter(s => s.isConquered).length;
    const percentage = totalStores > 0 ? Math.round((conqueredCount / totalStores) * 100) : 0;
    let rank = percentage > 75 ? "Kingpin" : (percentage > 50 ? "City Boss" : (percentage > 25 ? "District Manager" : "Street Peddler"));

    if (isMinimized) return (
        <div onClick={() => setIsMinimized(false)} className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/95 text-white px-4 py-2 rounded-full border border-orange-500 shadow-xl cursor-pointer hover:scale-105 transition-transform flex items-center gap-3">
            <ShieldCheck className="text-orange-500"/><span className="text-xs font-bold font-mono">Control: {percentage}%</span><Maximize2 size={12} className="text-slate-400"/>
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

const StoreHUD = ({ store, mapPoints, transactions, inventory, db, appId, user, isAdmin, setSelectedStore, liveScaleOverride, setLiveScaleOverride }) => {
    const [showConsignDetails, setShowConsignDetails] = useState(false);
    const [isLinking, setIsLinking] = useState(false); 
    const [localScale, setLocalScale] = useState(store.catchmentScale || 1.0);
    
    useEffect(() => { setLocalScale(store.catchmentScale || 1.0); }, [store.id, store.catchmentScale]);

    const availableHubs = (mapPoints || []).filter(c => c.storeType === 'Wholesaler' && c.id !== store.id);

    const stats = useMemo(() => {
        const storeTrans = (transactions || []).filter(t => t.customerName === store.name);
        const totalRev = storeTrans.filter(t => t.type === 'SALE').reduce((sum, t) => sum + (t.total || 0), 0);
        const totalTitip = storeTrans.filter(t => t.type === 'SALE' && t.paymentType === 'Titip').reduce((sum, t) => sum + (t.total || 0), 0);
        const totalPaid = storeTrans.filter(t => t.type === 'CONSIGNMENT_PAYMENT').reduce((sum, t) => sum + (t.amountPaid || 0), 0);
        const currentConsignment = Math.max(0, totalTitip - totalPaid);
        const itemMap = {}; 
        storeTrans.forEach(t => {
            if (t.type === 'SALE' && t.paymentType === 'Titip') {
                (t.items || []).forEach(i => { const bks = convertToBks(i.qty, i.unit, inventory ? inventory.find(p => p.id === i.productId) : null); if (!itemMap[i.productId]) itemMap[i.productId] = { name: i.name, qty: 0 }; itemMap[i.productId].qty += bks; });
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
            const userId = user?.uid || user?.id;
            const ref = doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id);
            const updates = { storeType: newType };
            if (newType === 'Wholesaler') updates.suppliedBy = null; 
            await updateDoc(ref, updates);
        } catch (error) {} finally { setIsLinking(false); }
    };

    const handleAssignHub = async (hubId) => {
        if (!db || !appId) return;
        setIsLinking(true);
        try { 
            const userId = user?.uid || user?.id;
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id), { suppliedBy: hubId === "none" ? null : hubId }); 
        } catch (error) {} finally { setIsLinking(false); }
    };

    const handleSaveLocalScale = async () => {
        if (!db || !appId) return;
        try { 
            const userId = user?.uid || user?.id;
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id), { catchmentScale: localScale }); 
        } catch (error) {}
    };

    const getWhatsappLink = () => { if (!store.phone) return "#"; return `https://wa.me/${store.phone.replace(/\D/g, '').replace(/^0/, '62')}`; };
    const getGpsLink = () => { if (store.latitude && store.longitude) return `http://googleusercontent.com/maps.google.com/?q=${store.latitude},${store.longitude}`; return `http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(`${store.address || ''}, ${store.city || ''}`)}`; };

    return (
        <div className="absolute left-4 top-20 bottom-4 w-80 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700 p-6 overflow-y-auto z-[1000] animate-slide-in-left custom-scrollbar">
            <button onClick={() => setSelectedStore(null)} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full hover:bg-red-500 transition-colors"><X size={16}/></button>
            <div className="flex items-start justify-between mb-1 pr-8"><h2 className="text-2xl font-bold leading-tight">{store.name}</h2></div>
            
            {store.storeType === 'Wholesaler' && <span className="inline-flex items-center gap-1 bg-amber-500 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase mb-4 shadow-[0_0_10px_rgba(245,158,11,0.5)]"><Store size={10} /> WHOLESALE HUB</span>}
            <p className="text-slate-400 text-xs flex items-center gap-1 mb-4"><MapPin size={12}/> {store.city}</p>

            {isAdmin && (
                <div className="mb-6 bg-slate-800 p-4 rounded-xl border border-slate-600">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] uppercase font-bold text-slate-300 flex items-center gap-1"><Database size={12} className="text-orange-500"/> Individual Reach</label>
                        <div className="flex items-center gap-1">
                            <input type="number" step="0.1" min="0.1" max="5.0" value={localScale} onChange={(e) => { const val = Math.max(0.1, parseFloat(e.target.value) || 1); setLocalScale(val); setLiveScaleOverride(val); }} onBlur={handleSaveLocalScale} className="w-14 text-right text-xs font-mono bg-slate-900 p-1 rounded text-white border border-slate-600 focus:border-orange-500 outline-none"/>
                            <span className="text-[10px] text-slate-500 font-bold">x</span>
                        </div>
                    </div>
                    <input type="range" min="0.1" max="5.0" step="0.1" value={localScale} onChange={(e) => { const val = parseFloat(e.target.value); setLocalScale(val); setLiveScaleOverride(val); }} onMouseUp={handleSaveLocalScale} onTouchEnd={handleSaveLocalScale} className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all"/>
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
                    <label className="text-[10px] text-amber-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-2"><Tag size={12}/> Map to Wholesaler</label>
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

    const [salesHeatmapMode, setSalesHeatmapMode] = useState(false);
    const [showTacticalDash, setShowTacticalDash] = useState(false);

    const [selectedRegion, setSelectedRegion] = useState("All"); 
    const [selectedCity, setSelectedCity] = useState("All");
    
    // NEW STATE FOR AREA TYPE FILTER
    const [selectedAreaType, setSelectedAreaType] = useState("Kecamatan");
    
    // NEW: TIME FILTER STATE
    const [timeFilter, setTimeFilter] = useState("All-Time");

    const [liveScaleOverride, setLiveScaleOverride] = useState(null);
    const [uploadedFocus, setUploadedFocus] = useState(null);
    
    const [boundaries, setBoundaries] = useState([]);

    const userId = user?.uid || user?.id || "default";

    useEffect(() => {
        const loadBorders = async () => {
            const CACHE_KEY = `cello_map_bnd_${appId}`;
            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData) {
                try { setBoundaries(JSON.parse(cachedData)); } catch(e) {}
            }

            if (db && appId && userId) {
                try {
                    const snap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/mapSettings`));
                    const loaded = [];
                    snap.forEach(doc => {
                        if (doc.id.startsWith('bnd_')) {
                            const data = doc.data();
                            if (data && data.geometryString) {
                                try {
                                    data.geometry = JSON.parse(data.geometryString);
                                    loaded.push(data);
                                } catch(e) {}
                            }
                        }
                    });
                    if (loaded.length > 0) {
                        setBoundaries(loaded);
                        localStorage.setItem(CACHE_KEY, JSON.stringify(loaded));
                    }
                } catch(e) {}
            }
        };
        loadBorders();
    }, [db, appId, userId]);

    // FIX: Filters out hidden boundaries so they are excluded from Map, Heatmap, and Dashboard math
    const sortedBoundaries = useMemo(() => {
        if (!Array.isArray(boundaries)) return [];
        return boundaries.filter(b => b && b.id && b.geometry && !b.isHidden).sort((a, b) => {
            const lMap = { 'Provinsi': 1, 'Kabupaten': 2, 'Kecamatan': 3, 'Desa': 4 };
            return (lMap[a.level] || 4) - (lMap[b.level] || 4);
        });
    }, [boundaries]);

    const activeTiers = tierSettings || [
        { id: 'Platinum', label: 'Platinum', color: '#f59e0b', iconType: 'emoji', value: '🏆' },
        { id: 'Gold', label: 'Gold', color: '#fbbf24', iconType: 'emoji', value: '🥇' },
        { id: 'Silver', label: 'Silver', color: '#94a3b8', iconType: 'emoji', value: '🥈' },
        { id: 'Bronze', label: 'Bronze', color: '#78350f', iconType: 'emoji', value: '🥉' }
    ];

    const { mapPoints, locationTree } = useMemo(() => {
        const tree = {}; 
        const validStores = (customers || [])
            .filter(c => c && c.latitude && c.longitude)
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

    const zoneRevenues = useMemo(() => {
        if ((!salesHeatmapMode && !showTacticalDash) || !sortedBoundaries.length) return {};
        const revMap = {};
        const storeRevs = {};
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        mapPoints.forEach(store => {
            storeRevs[store.name] = (transactions || [])
                .filter(t => {
                    // 1. Must be a valid sale for this store
                    if (t.customerName !== store.name || t.type !== 'SALE') return false;
                    // 2. If All-Time, pass immediately
                    if (timeFilter === 'All-Time') return true;
                    // 3. Date Math
                    if (!t.date) return false;
                    const txDate = new Date(t.date);
                    if (isNaN(txDate)) return false;

                    if (timeFilter === 'Today') {
                        return txDate.toDateString() === today.toDateString();
                    }
                    if (timeFilter === '7 Days') {
                        const sevenDaysAgo = new Date(today);
                        sevenDaysAgo.setDate(today.getDate() - 7);
                        return txDate >= sevenDaysAgo;
                    }
                    if (timeFilter === 'This Month') {
                        return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
                    }
                    if (timeFilter === 'This Year') {
                        return txDate.getFullYear() === today.getFullYear();
                    }
                    return true;
                })
                .reduce((sum, t) => sum + (t.total || 0), 0);
        });

        sortedBoundaries.forEach(boundary => {
            const geoData = boundary.feature || boundary.geometry;
            if (!geoData || !geoData.type) return;

            let totalRev = 0;
            mapPoints.forEach(store => {
                if (checkPointInGeoJSON(store.longitude, store.latitude, geoData)) {
                    totalRev += (storeRevs[store.name] || 0);
                }
            });
            revMap[boundary.id] = totalRev;
        });
        // FIX: Added timeFilter to the dependency array so the math engine instantly recalculates
        return revMap;
    }, [salesHeatmapMode, showTacticalDash, sortedBoundaries, mapPoints, transactions, timeFilter]);

    const getZoneColor = (boundaryId) => {
        if (!salesHeatmapMode) return null;
        const rev = zoneRevenues[boundaryId] || 0;
        if (rev === 0) return '#ef4444'; 
        
        const maxRev = Math.max(...Object.values(zoneRevenues), 1);
        const ratio = rev / maxRev;

        if (ratio > 0.6) return '#10b981'; 
        if (ratio > 0.2) return '#f59e0b'; 
        return '#f97316'; 
    };

    const toggleTierFilter = (tierId) => setFilterTier(prev => prev.includes(tierId) ? prev.filter(t => t !== tierId) : [...prev, tierId]);
    const toggleAllTiers = () => setFilterTier(filterTier.length === activeTiers.length ? [] : activeTiers.map(t => t.id));
    const handlePinClick = (store, map) => { setSelectedStore(store); setSelectedZone(null); setLiveScaleOverride(null); map.flyTo([store.latitude, store.longitude], 14, { duration: 1.2 }); };
    const activeStore = selectedStore ? mapPoints.find(s => s.id === selectedStore.id) || selectedStore : null;

    return (
        <div className="h-[calc(100vh-100px)] w-full rounded-2xl overflow-hidden shadow-2xl relative border dark:border-slate-700 bg-slate-900">
            <GameHUD conquestMode={conquestMode} mapPoints={mapPoints} /> 
            
            {salesHeatmapMode && (
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/95 text-white px-5 py-3 rounded-2xl border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-md flex items-center gap-5 animate-slide-down">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Sales Heatmap</span>
                    <div className="h-5 w-[1px] bg-slate-700"></div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><div className="w-3 h-3 rounded-full bg-[#10b981] border border-white"></div> High</div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><div className="w-3 h-3 rounded-full bg-[#f59e0b] border border-white"></div> Med</div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><div className="w-3 h-3 rounded-full bg-[#f97316] border border-white"></div> Low</div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><div className="w-3 h-3 rounded-full bg-[#ef4444] border border-white"></div> Zero</div>
                </div>
            )}

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
                                <Download size={16}/> Map Setup
                            </button>
                        )}
                        <button onClick={() => setShowBorders(!showBorders)} className={`pointer-events-auto px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 border transition-all ${showBorders ? 'bg-blue-600 text-white border-blue-500 animate-pulse' : 'bg-white text-slate-700 border-slate-200'}`}><Globe size={16}/> {showBorders ? "Borders: ON" : "Regional Borders"}</button>
                    </div>
                    
                    <button onClick={() => { 
                        const nextState = !showTacticalDash;
                        setShowTacticalDash(nextState); 
                        if (nextState) {
                            setSalesHeatmapMode(true);
                            setShowBorders(true);
                        }
                    }} className={`pointer-events-auto px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 border transition-all ${showTacticalDash ? 'bg-red-600 text-white border-red-500 animate-pulse' : 'bg-white text-slate-700 border-slate-200'}`}>
                        <TrendingUp size={16}/> {showTacticalDash ? "Tactical HUD: ON" : "Tactical Dashboard"}
                    </button>

                    <button onClick={() => { setSalesHeatmapMode(!salesHeatmapMode); setShowBorders(true); }} className={`pointer-events-auto px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 border transition-all ${salesHeatmapMode ? 'bg-emerald-600 text-white border-emerald-500 animate-pulse' : 'bg-white text-slate-700 border-slate-200'}`}><DollarSign size={16}/> {salesHeatmapMode ? "Sales Heatmap: ON" : "Territory Revenue"}</button>
                    <button onClick={() => setNetworkMode(!networkMode)} className={`pointer-events-auto px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 border transition-all ${networkMode ? 'bg-amber-600 text-white border-amber-500 animate-pulse' : 'bg-white text-slate-700 border-slate-200'}`}><Database size={16}/> {networkMode ? "Supply Lines: ON" : "View Supply Map"}</button>
                    <button onClick={() => setConquestMode(!conquestMode)} className={`pointer-events-auto px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 border transition-all ${conquestMode ? 'bg-purple-600 text-white border-purple-500 animate-pulse' : 'bg-white text-slate-700 border-slate-200'}`}><Folder size={16}/> {conquestMode ? "Footprints: ON" : "Analyze Catchment Areas"}</button>
                </div>
            </div>

           {showTacticalDash && (
                <TacticalDashboard 
                    boundaries={sortedBoundaries} 
                    zoneRevenues={zoneRevenues} 
                    mapPoints={mapPoints} 
                    transactions={transactions}
                    selectedZone={selectedZone} 
                    setSelectedZone={setSelectedZone} 
                    onClose={() => setShowTacticalDash(false)}
                    salesHeatmapMode={salesHeatmapMode}
                    setSalesHeatmapMode={setSalesHeatmapMode}
                    selectedAreaType={selectedAreaType}
                    setSelectedAreaType={setSelectedAreaType}
                    timeFilter={timeFilter}
                    setTimeFilter={setTimeFilter}
                />
            )}

            {showImporter && <BorderImporter db={db} appId={appId} user={user} boundaries={boundaries} setBoundaries={setBoundaries} setIsOpen={setShowImporter} setShowBorders={setShowBorders} setUploadedFocus={setUploadedFocus} />}

            <MapContainer center={[-7.6145, 110.7122]} zoom={10} style={{ height: '100%', width: '100%' }} className="z-0" zoomControl={false}>
                <ZoomControl position="topleft" />
                <MapEffectController selectedRegion={selectedRegion} selectedCity={selectedCity} mapPoints={mapPoints} savedHome={savedHome} uploadedFocus={uploadedFocus} selectedZone={selectedZone} />
                
                <LayersControl position="bottomright">
                    <LayersControl.BaseLayer checked name="Dark Matter (Carto)">
                        <TileLayer className="balanced-dark-tile" url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='© CARTO' />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Midnight Canvas (Esri)">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" attribution='© Esri' />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Light Canvas (Carto)">
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='© CARTO' />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Standard (OSM)">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OSM' />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satellite (Esri)">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='© Esri'/>
                    </LayersControl.BaseLayer>
                </LayersControl>

                <AdminControls isAdmin={isAdmin} onSetHome={onSetHome}/>
                <MapClicker isAddingMode={isAddingMode} setNewPinCoords={setNewPinCoords} setIsAddingMode={setIsAddingMode} setSelectedStore={setSelectedStore} setSelectedZone={setSelectedZone} />
                
                {showBorders && sortedBoundaries.map((boundary) => {
                    const geoData = boundary.feature || boundary.geometry;
                    if (!geoData || !geoData.type) return null; 
                    
                    const isHeatmap = salesHeatmapMode;
                    const bndColor = isHeatmap ? getZoneColor(boundary.id) : boundary.color;
                    const bndRev = zoneRevenues[boundary.id] || 0;
                    const isKab = boundary.level === 'Kabupaten' || boundary.level === 'Provinsi';

                    // Visual Targeting if selected in Tactical HUD
                    const isSelected = selectedZone?.id === boundary.id;

                    return (
                        <GeoJSON 
                            // FIX: Adding timeFilter to the key forces Leaflet to instantly redraw the map layer and tooltips on change
                            key={`bnd-${boundary.id}-${isHeatmap ? 'heat' : 'norm'}-${bndRev}-${isSelected}-${timeFilter}`} 
                            data={geoData} 
                            style={{ 
                                color: isSelected ? '#38bdf8' : bndColor, 
                                weight: isSelected ? 4 : (isKab ? 3 : 2), 
                                opacity: 1, 
                                fillOpacity: isSelected ? 0.7 : (isHeatmap ? 0.45 : (isKab ? 0.02 : 0.15)), 
                                fillColor: bndColor,
                                dashArray: isKab ? null : '5, 5' 
                            }}
                            onEachFeature={(f, layer) => {
                                layer.on({
                                    click: (e) => { L.DomEvent.stopPropagation(e); setSelectedStore(null); setSelectedZone(boundary); },
                                    mouseover: (e) => e.target.setStyle({ fillOpacity: isHeatmap ? 0.6 : (isKab ? 0.05 : 0.3), weight: isKab ? 4 : 3 }),
                                    mouseout: (e) => e.target.setStyle({ fillOpacity: isSelected ? 0.7 : (isHeatmap ? 0.45 : (isKab ? 0.02 : 0.15)), weight: isSelected ? 4 : (isKab ? 3 : 2) })
                                });

                                const ttContent = `
                                    <div style="background-color: rgba(15, 23, 42, 0.9); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.2); padding: 8px 14px; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); text-align: center; line-height: 1.2; white-space: nowrap;">
                                        <div style="color: #cbd5e1; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                                            ${boundary.name || "Region"}
                                        </div>
                                        ${isHeatmap ? `<div style="color: #fbbf24; font-size: 15px; font-weight: 900; font-family: monospace;">${formatRupiah(bndRev)}</div>` : ''}
                                    </div>
                                `;

                                layer.bindTooltip(ttContent, { 
                                    permanent: isHeatmap || isSelected, 
                                    direction: "center", 
                                    className: "custom-leaflet-tooltip" 
                                });
                            }}
                        />
                    );
                })}

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
            
            {!showTacticalDash && <ZoneHUD zone={selectedZone} mapPoints={mapPoints} setSelectedZone={setSelectedZone} />}
            
            <style>{`
                .leaflet-tooltip-pane { z-index: 9999 !important; pointer-events: none !important; }
                .leaflet-tooltip.custom-leaflet-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
                .leaflet-tooltip.custom-leaflet-tooltip::before, .leaflet-tooltip.custom-leaflet-tooltip::after { display: none !important; }
                .custom-icon .marker-inner { transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-origin: center center; }
                .custom-icon:hover .marker-inner { transform: scale(1.2); filter: drop-shadow(0 0 10px gold); }
                .custom-icon:hover { z-index: 10000 !important; }
                .store-3d-card { transform: perspective(1000px) rotateX(20deg) scale(0.5) translateY(20px); opacity: 0; transform-origin: bottom center; }
                .custom-leaflet-tooltip .store-3d-card { animation: popIn 0.3s forwards; }
                
                /* CRT SCANLINE EFFECT FOR TACTICAL HUD */
                .crt-overlay {
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
                    background-size: 100% 4px;
                    pointer-events: none;
                    position: absolute;
                    inset: 0;
                    z-index: 50;
                    opacity: 0.3;
                }

                @keyframes popIn { 0% { transform: perspective(1000px) rotateX(20deg) scale(0.5) translateY(20px); opacity: 0; } 100% { transform: perspective(1000px) rotateX(-5deg) scale(1.0) translateY(-10px); opacity: 1; box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.8); } }
                .balanced-dark-tile { filter: brightness(1.2); }
                .animated-supply-line { stroke-dasharray: 8, 12; animation: flow 30s linear infinite; }
                @keyframes flow { to { stroke-dashoffset: -1000; } }
                .venn-heatmap-circle { mix-blend-mode: screen; }
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