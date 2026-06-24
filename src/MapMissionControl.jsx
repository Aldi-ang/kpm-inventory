import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, GeoJSON, Tooltip as LeafletTooltip, useMap, useMapEvents, LayersControl, ZoomControl } from 'react-leaflet';

import { 
    MapPin, Store, Calendar, Wallet, X, Phone, ChevronRight, 
    ShieldCheck, Globe, Menu, Database, Tag, DollarSign,
    MinusCircle, Maximize2, Search, Trash2, Download, 
    Save, AlertCircle, Upload, Pencil, Folder, TrendingUp, ShieldAlert,
    Navigation, LocateFixed, Clock, CheckCircle, Settings, ArrowUpCircle, ArrowDownCircle, Activity, User
} from 'lucide-react';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; 
import { doc, collection, getDocs, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// 🚀 GOOGLE MAPS STYLE: THE SMART AVATAR ENGINE
try { delete L.Icon.Default.prototype._getIconUrl; } catch(e) {}
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const getIcon = (store, activeTiers, isTemp = false, isActive = false) => {
    if (isTemp) return L.divIcon({ className: 'custom-icon', html: `<div style="background-color: white; width: 24px; height: 24px; border-radius: 50%; border: 4px solid black; animation: bounce 1s infinite;"></div>`, iconSize: [24, 24] });
    
    const tierDef = activeTiers.find(t => t.id === store.tier) || activeTiers[0] || {};
    let content = tierDef.iconType === 'image' ? `<img src="${tierDef.value}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />` : `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 16px;">${tierDef.value || '📍'}</div>`;
    
    const hubBadge = store.storeType === 'Wholesaler' ? `<div style="position:absolute; top:-8px; right:-8px; background:gold; border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; font-size:10px; border:2px solid black; z-index:20; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">👑</div>` : '';
    
    let glow = '';
    let transform = 'scale(1)';
    let zIndex = '';
    
    if (isActive) {
        glow = `box-shadow: 0 0 0 4px #10b981, 0 0 25px #10b981;`;
        transform = `scale(1.3)`;
        zIndex = `z-index: 9999 !important;`;
    } else if (store.status === 'overdue') {
        glow = `box-shadow: 0 0 0 3px #ef4444; animation: pulse 1.5s infinite;`;
    }

    let border = `border: 3px solid ${store.storeType === 'Wholesaler' ? '#f59e0b' : (tierDef.color || '#94a3b8')};`;

    return L.divIcon({
        className: 'custom-icon', 
        html: `
            <div style="position:relative; ${zIndex}">
                <div class="marker-inner" style="background-color: white; width: 34px; height: 34px; border-radius: 50%; ${border} ${glow} transform: ${transform}; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); overflow: hidden; position: relative; z-index: 10;">
                    ${content}
                </div>
                ${hubBadge}
            </div>`,
        iconSize: [34, 34], iconAnchor: [17, 17]
    });
};

const userLocationIcon = L.divIcon({
    className: 'user-location-icon',
    html: `
        <div style="position: relative; display: flex; justify-content: center; align-items: center; width: 24px; height: 24px;">
            <div style="position: absolute; width: 100%; height: 100%; background-color: #3b82f6; border-radius: 50%; opacity: 0.4; animation: pulse-ring 2s infinite;"></div>
            <div style="width: 14px; height: 14px; background-color: #2563eb; border: 2px solid white; border-radius: 50%; z-index: 10; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

const compressCoords = (coords) => {
    if (Array.isArray(coords)) {
        if (typeof coords[0] === 'number') return [Number(coords[0].toFixed(4)), Number(coords[1].toFixed(4))];
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
    try {
        if (geometry.type === 'Polygon') return isPointInPolygon(point, geometry.coordinates[0]);
        if (geometry.type === 'MultiPolygon') {
            for (let poly of geometry.coordinates) { 
                const ring = Array.isArray(poly[0][0]) && typeof poly[0][0][0] === 'number' ? poly[0] : poly;
                if (isPointInPolygon(point, ring)) return true; 
            }
        }
    } catch(e) { console.warn("Geofence parse error caught safely", e); }
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

const MapEffectController = ({ selectedRegion, selectedCity, mapPoints, savedHome, uploadedFocus, selectedZone }) => {
    const map = useMap();
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (uploadedFocus && Array.isArray(uploadedFocus) && uploadedFocus.length === 2 && !isNaN(uploadedFocus[0])) { 
            map.flyTo(uploadedFocus, 10, { duration: 1.5 }); 
        }
    }, [uploadedFocus, map]);

    useEffect(() => {
        if (selectedZone && selectedZone.geometry) {
            try {
                const layer = L.geoJSON(selectedZone.geometry);
                const bounds = layer.getBounds();
                const mapWidth = map.getSize().x;
                const leftPad = mapWidth > 650 ? 400 : 20; 
                map.fitBounds(bounds, { paddingTopLeft: [leftPad, 20], paddingBottomRight: [20, 20], maxZoom: 13, duration: 1.2 });
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

const LocationController = ({ userLocation, setUserLocation, isEditing }) => {
    const map = useMap();
    const watchId = useRef(null);
    const isEditingRef = useRef(isEditing);

    useEffect(() => {
        isEditingRef.current = isEditing;
    }, [isEditing]);

    const handleLocateClick = () => {
        if (userLocation) {
            map.flyTo(userLocation, 16, { duration: 1.2 });
        } else if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords = [pos.coords.latitude, pos.coords.longitude];
                    setUserLocation(coords);
                    map.flyTo(coords, 16, { duration: 1.2 });
                },
                (err) => console.error(err),
                { enableHighAccuracy: true }
            );
        }

        if (!watchId.current && "geolocation" in navigator) {
            watchId.current = navigator.geolocation.watchPosition(
                (pos) => {
                    if (!isEditingRef.current) {
                        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
                    }
                },
                (err) => console.error(err),
                { enableHighAccuracy: true, maximumAge: 5000 }
            );
        }
    };

    useEffect(() => {
        return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
    }, []);

    return (
        <div className="absolute bottom-[200px] lg:bottom-[160px] right-[10px] z-[999]">
            <button 
                onClick={handleLocateClick} 
                className={`bg-slate-800 text-white border p-3 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-colors border-slate-600 hover:bg-slate-700 hover:text-blue-400`}
                title="Locate Me"
            >
                <LocateFixed size={24} className={watchId.current ? "text-blue-400" : "text-slate-300"} />
            </button>
        </div>
    );
};

const AdminControls = ({ isAdmin, onSetHome }) => {
    const map = useMapEvents({});
    if(!isAdmin) return null;
    return (
        <div className="absolute bottom-[30px] left-[14px] z-[999]">
            <button 
                onClick={() => onSetHome && onSetHome(map.getCenter(), map.getZoom())} 
                className="bg-slate-900/90 backdrop-blur-md text-slate-300 border border-slate-700 px-3 py-2.5 rounded-xl text-xs font-bold shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center gap-2 hover:bg-slate-800 hover:text-white transition-all group"
            >
                <MapPin size={16} className="text-slate-400 group-hover:text-white" /> 
                Set Home
            </button>
        </div>
    );
};

const MapClicker = ({ isAddingMode, editingStoreId, setDragPinCoords, setSelectedStore, setSelectedZone }) => {
    useMapEvents({
        click(e) {
            if (isAddingMode || editingStoreId) {
                setDragPinCoords(e.latlng);
            } else {
                if (window.innerWidth >= 1024) { setSelectedStore(null); setSelectedZone(null); }
            }
        }
    });
    return null;
};

const DraggableAddMarker = ({ position, setPosition }) => {
    const markerRef = useRef(null);
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    setPosition(marker.getLatLng());
                }
            },
        }),
        [setPosition]
    );

    if (!position) return null;

    const targetIcon = L.divIcon({
        className: 'custom-icon',
        html: `<div style="background-color: #f97316; width: 44px; height: 44px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 10px 25px rgba(249,115,22,0.8);">📍</div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 44]
    });

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
            icon={targetIcon}
            zIndexOffset={10000}
        >
            <LeafletTooltip permanent direction="top" offset={[0, -44]} className="custom-leaflet-tooltip">
                <div className="bg-orange-600 text-white font-black text-[10px] px-3 py-1.5 rounded-lg border-2 border-white shadow-xl animate-bounce">
                    DRAG ME
                </div>
            </LeafletTooltip>
        </Marker>
    );
};

const MarkerWithZoom = ({ store, activeTiers, conquestMode, handlePinClick, isActive }) => {
    const map = useMap();
    const smartIcon = getIcon(store, activeTiers, false, isActive);

    return (
        <Marker 
            position={[store.latitude, store.longitude]} 
            icon={smartIcon} 
            eventHandlers={{ click: () => { handlePinClick(store, map); } }} 
            riseOnHover={true}
            zIndexOffset={isActive ? 1000 : 0} 
        >
            {!conquestMode && (
                <LeafletTooltip direction="top" offset={[0, -20]} opacity={1} className="custom-leaflet-tooltip hidden lg:block">
                    <div className="bg-slate-900/95 backdrop-blur text-white px-3 py-1.5 rounded-lg border border-slate-700 shadow-xl text-xs font-bold whitespace-nowrap">
                        {String(store.name || 'Unknown')}
                    </div>
                </LeafletTooltip>
            )}
        </Marker>
    );
};

// 🚀 UPGRADED TACTICAL DASHBOARD
const TacticalDashboard = ({ boundaries, zoneRevenues, mapPoints, transactions, selectedZone, setSelectedZone, onClose, salesHeatmapMode, setSalesHeatmapMode, selectedAreaType, setSelectedAreaType, timeFilter, setTimeFilter }) => {
    const [isMinimized, setIsMinimized] = useState(false);

    const globalRevenue = useMemo(() => {
        let total = 0;
        const visibleBoundaries = selectedAreaType !== "All" ? boundaries.filter(b => b.level === selectedAreaType) : boundaries;
        visibleBoundaries.forEach(b => { total += (zoneRevenues[b.id] || 0); });
        return total;
    }, [boundaries, zoneRevenues, selectedAreaType]);
    
    const rankedSectors = useMemo(() => {
        let filtered = [...boundaries];
        if (selectedAreaType !== "All") filtered = filtered.filter(b => b.level === selectedAreaType);
        return filtered.sort((a,b) => (zoneRevenues[b.id]||0) - (zoneRevenues[a.id]||0));
    }, [boundaries, zoneRevenues, selectedAreaType]);

    const maxRev = rankedSectors.length > 0 ? (zoneRevenues[rankedSectors[0].id] || 1) : 1;
    const activeZoneRev = selectedZone ? (zoneRevenues[selectedZone.id] || 0) : 0;
    const activeZoneStores = selectedZone ? mapPoints.filter(s => checkPointInGeoJSON(s.longitude, s.latitude, selectedZone.geometry)) : [];
    const activeOverdue = activeZoneStores.filter(s => s.status === 'overdue').length;

    if (isMinimized) {
        return (
            <div className="absolute top-[70px] lg:top-20 left-4 z-[2000] animate-slide-in-left">
                <button onClick={() => setIsMinimized(false)} className="bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3 hover:bg-slate-800 transition-colors font-mono font-bold text-xs uppercase tracking-widest">
                    <ShieldAlert size={18} className="animate-pulse" />
                    Sector Command
                    <Maximize2 size={14} className="text-slate-400 ml-2"/>
                </button>
            </div>
        );
    }

    return (
        <div className="absolute top-[70px] lg:top-20 left-4 w-auto right-4 lg:right-auto lg:w-[380px] bg-slate-900/80 hover:bg-slate-900/95 transition-all duration-300 backdrop-blur-md border-2 border-slate-700 shadow-2xl rounded-2xl z-[2000] animate-slide-in-left flex flex-col max-h-[calc(100%-100px)] overflow-hidden font-mono">
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
                    <select value={selectedAreaType} onChange={(e) => setSelectedAreaType(e.target.value)} className="bg-transparent text-xs font-bold text-white outline-none w-full cursor-pointer">
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
                            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="bg-slate-800 text-[9px] text-emerald-400 font-bold px-1.5 py-0.5 rounded outline-none cursor-pointer border border-emerald-500/30 hover:border-emerald-500 transition-colors">
                                <option value="Today">Today</option><option value="7 Days">7 Days</option><option value="This Month">This Month</option><option value="This Year">This Year</option><option value="All-Time">All-Time</option>
                            </select>
                        </div>
                        <p className="text-2xl font-black text-emerald-400">{formatRupiah(globalRevenue)}</p>
                    </div>
                    <div className="text-right"><p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Active Sectors</p><p className="text-xl font-bold text-white">{rankedSectors.length}</p></div>
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
                    const target = sector.targetRev; 
                    const hasTarget = target && target > 0;
                    const ratio = hasTarget ? Math.min(rev / target, 1) : (rev / maxRev);
                    const barColor = hasTarget ? (ratio >= 1 ? 'bg-emerald-500' : ratio > 0.5 ? 'bg-orange-500' : 'bg-red-500') : (ratio > 0.6 ? 'bg-emerald-500' : ratio > 0.2 ? 'bg-orange-500' : 'bg-red-500');
                    const textColor = hasTarget ? (ratio >= 1 ? 'text-emerald-400' : ratio > 0.5 ? 'text-orange-400' : 'text-red-400') : (ratio > 0.6 ? 'text-emerald-400' : ratio > 0.2 ? 'text-orange-400' : 'text-red-400');
                    const isSelected = selectedZone?.id === sector.id;

                    return (
                        <div key={sector.id} onClick={() => setSelectedZone(sector)} className={`p-3 rounded-xl border transition-all cursor-pointer group ${isSelected ? 'bg-white/10 border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-black/40 border-slate-700 hover:border-slate-500'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-[10px] font-bold text-slate-500 w-4">{index + 1}.</span>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
                                            {sector.name} {sector.assignedAgent && <span className="text-purple-400 ml-1" title="Agent Assigned">👤</span>}
                                        </span>
                                        <span className="text-[8px] text-slate-500 uppercase">{sector.level}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-black block ${textColor}`}>{formatRupiah(rev)}</span>
                                    {hasTarget && <span className="text-[8px] text-slate-500 uppercase tracking-widest block">/ {formatRupiah(target)}</span>}
                                </div>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex"><div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${ratio * 100}%` }}></div></div>
                        </div>
                    );
                })}
            </div>

            <div className="p-3 border-t border-slate-700 bg-gradient-to-t from-black to-slate-900 z-10 shrink-0 min-h-[85px] flex flex-col justify-center">
                {selectedZone ? (
                    <>
                        <div className="flex justify-between items-center mb-2.5">
                            <div className="min-w-0 pr-2">
                                <p className="text-[8px] text-emerald-500 uppercase font-bold tracking-widest animate-pulse mb-0.5">Target Locked</p>
                                <h3 className="text-base font-black text-white uppercase tracking-wider truncate leading-tight">{selectedZone.name}</h3>
                            </div>
                            <div className="text-right shrink-0"><p className="text-base font-black text-emerald-400 leading-tight">{formatRupiah(activeZoneRev)}</p></div>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-black/50 p-2 rounded-lg border border-slate-700 flex justify-between items-center"><span className="text-[8px] text-slate-500 uppercase tracking-widest">Assets</span><span className="text-xs font-bold text-white">{activeZoneStores.length}</span></div>
                            <div className={`flex-[1.2] p-2 rounded-lg border flex justify-between items-center ${activeOverdue > 0 ? 'bg-red-900/20 border-red-500/50' : 'bg-black/50 border-slate-700'}`}>
                                <span className={`text-[8px] uppercase tracking-widest ${activeOverdue > 0 ? 'text-red-400' : 'text-slate-500'}`}>Threat</span>
                                <span className={`font-bold text-[9px] ${activeOverdue > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>{activeOverdue > 0 ? `${activeOverdue} OVERDUE` : 'CLEAR'}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center opacity-50 flex flex-col items-center justify-center py-1"><ShieldAlert size={20} className="mb-1 text-slate-400"/><p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Select Sector for Analysis</p></div>
                )}
            </div>
        </div>
    );
};

// 🚀 UPGRADED BORDER IMPORTER & SECTOR SETTINGS (Hierarchical Accordion)
const BorderImporter = ({ db, appId, user, boundaries, setBoundaries, setIsOpen, setShowBorders, setUploadedFocus, motorists = [] }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState("");
    
    // Tracks which nodes in the hierarchical tree are expanded
    const [expandedNodes, setExpandedNodes] = useState({});
    
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", color: "#3b82f6", targetRev: "", assignedAgent: "none" });

    const fileInputRef = useRef(null);
    const palette = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#34d399", "#2dd4bf", "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa", "#c084fc", "#e879f9", "#f472b6", "#fb7185"];
    const userId = user?.uid || user?.id || 'default';
    const CACHE_KEY = `cello_map_bnd_${appId}`;

    const safeBoundaries = Array.isArray(boundaries) ? boundaries.filter(b => b && typeof b === 'object' && b.id) : [];

    // 🚀 NEW HIERARCHICAL GROUPING ENGINE
    const hierarchicalTree = useMemo(() => {
        const tree = { name: "Root", children: {}, boundaries: [] };
        
        safeBoundaries.forEach(b => {
            const props = b.feature?.properties || {};
            
            // Extract the geographical hierarchy explicitly from the shapefile properties
            let prov = props.PROVINSI || props.NAME_1 || props.nm_propinsi || props.WADMPR || props.provinsi || "Unmapped Provinsi";
            let kab = props.KABUPATEN || props.NAME_2 || props.nm_dati2 || props.WADMKK || props.kabupaten || "Unmapped Kabupaten";
            let kec = props.KECAMATAN || props.NAME_3 || props.nm_kecamatan || props.nm_kec || props.WADMKC || props.kecamatan || "Unmapped Kecamatan";
            
            // Normalize names to prevent case-sensitive duplication
            prov = prov.toUpperCase();
            kab = kab.toUpperCase();
            kec = kec.toUpperCase();

            // Build the nested tree
            if (!tree.children[prov]) tree.children[prov] = { name: prov, level: 'Provinsi', children: {}, boundaries: [] };
            if (!tree.children[prov].children[kab]) tree.children[prov].children[kab] = { name: kab, level: 'Kabupaten', children: {}, boundaries: [] };
            if (!tree.children[prov].children[kab].children[kec]) tree.children[prov].children[kab].children[kec] = { name: kec, level: 'Kecamatan', children: {}, boundaries: [] };

            // Place the boundary in its exact node
            if (b.level === 'Provinsi') tree.children[prov].boundaries.push(b);
            else if (b.level === 'Kabupaten') tree.children[prov].children[kab].boundaries.push(b);
            else if (b.level === 'Kecamatan') tree.children[prov].children[kab].children[kec].boundaries.push(b);
            else tree.children[prov].children[kab].children[kec].boundaries.push(b); // Desas go inside the Kecamatan
        });
        
        return tree;
    }, [safeBoundaries]);

    const toggleNode = (nodeId) => {
        setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    const saveBoundaryToFirebase = async (boundary) => {
        if (db && appId && userId) {
            try { 
                const { geometry, feature, ...boundaryToSave } = boundary;
                boundaryToSave.geometryString = JSON.stringify(geometry); 
                await setDoc(doc(db, `artifacts/${appId}/users/${userId}/mapSettings`, `bnd_${boundary.id}`), boundaryToSave); 
            } catch(e) {}
        }
    };

    const deleteBoundaryFromFirebase = async (id) => {
        if (db && appId && userId) { try { await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/mapSettings`, `bnd_${id}`)); } catch(e) {} }
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

    const handleSaveBoundary = async (id) => {
        const targetBoundary = safeBoundaries.find(b => b.id === id);
        if (targetBoundary) {
            const updatedBoundary = { 
                ...targetBoundary, 
                name: editForm.name.trim() || targetBoundary.name,
                color: editForm.color || targetBoundary.color,
                targetRev: editForm.targetRev ? Number(editForm.targetRev) : null,
                assignedAgent: editForm.assignedAgent !== 'none' ? editForm.assignedAgent : null
            };
            const updatedList = safeBoundaries.map(b => b.id === id ? updatedBoundary : b);
            setBoundaries(updatedList);
            localStorage.setItem(CACHE_KEY, JSON.stringify(updatedList));
            await saveBoundaryToFirebase(updatedBoundary);
        }
        setEditingId(null);
    };

    const toggleVisibility = async (id, currentHidden) => {
        const updatedList = safeBoundaries.map(b => b.id === id ? { ...b, isHidden: !currentHidden } : b);
        setBoundaries(updatedList);
        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedList));
        const target = updatedList.find(b => b.id === id);
        if (target) await saveBoundaryToFirebase(target);
    };

    // Helper to recursively toggle visibility for an entire node branch
    const toggleBranchVisibility = async (node, hide) => {
        let idsToUpdate = new Set();
        const gatherIds = (n) => {
            n.boundaries.forEach(b => idsToUpdate.add(b.id));
            Object.values(n.children).forEach(child => gatherIds(child));
        };
        gatherIds(node);

        const updatedList = safeBoundaries.map(b => idsToUpdate.has(b.id) ? { ...b, isHidden: hide } : b);
        setBoundaries(updatedList);
        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedList));
        
        safeBoundaries.forEach(b => {
            if (idsToUpdate.has(b.id) && !!b.isHidden !== hide) {
                const target = updatedList.find(u => u.id === b.id);
                if (target) saveBoundaryToFirebase(target);
            }
        });
    };

    const extractNameAndLevel = (props, index) => {
        let name = `Imported Region ${index}`;
        let level = "Kecamatan"; 
        if (props.DESA || props.KELURAHAN || props.NAME_4 || props.nm_desa || props.WADMKD || props.NAMOBJ || props.desa) { name = `${props.DESA || props.KELURAHAN || props.NAME_4 || props.nm_desa || props.WADMKD || props.NAMOBJ || props.desa}`; level = "Desa"; } 
        else if (props.KECAMATAN || props.NAME_3 || props.nm_kecamatan || props.nm_kec || props.WADMKC || props.kecamatan) { name = `${props.KECAMATAN || props.NAME_3 || props.nm_kecamatan || props.nm_kec || props.WADMKC || props.kecamatan}`; level = "Kecamatan"; } 
        else if (props.KABUPATEN || props.NAME_2 || props.nm_dati2 || props.WADMKK || props.kabupaten) { name = `${props.KABUPATEN || props.NAME_2 || props.nm_dati2 || props.WADMKK || props.kabupaten}`; level = "Kabupaten"; } 
        else if (props.PROVINSI || props.NAME_1 || props.nm_propinsi || props.WADMPR || props.provinsi) { name = `${props.PROVINSI || props.NAME_1 || props.nm_propinsi || props.WADMPR || props.provinsi}`; level = "Provinsi"; } 
        else if (props.name) { name = props.name; } 
        else { const fallback = Object.values(props).find(val => typeof val === 'string' && val.length > 2 && isNaN(val)); if (fallback) name = fallback; }
        return { name, level };
    };

    const handleFileUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        setProgress("Parsing..."); setIsLoading(true); setError(null);
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
                        const { name, level } = extractNameAndLevel(feature.properties || {}, idx + 1);
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
                            // Important: We must keep the feature properties attached so the hierarchical tree can read them later!
                            const newBoundary = { id: `BND_CUSTOM_${Date.now()}_${idx}`, name: name, fullName: `File: ${file.name}`, geometry: feature.geometry, feature: feature, color: color, level: level, isHidden: false };
                            newBoundaries.push(newBoundary);
                            await saveBoundaryToFirebase(newBoundary);
                        }
                    }
                }
                setBoundaries(newBoundaries); localStorage.setItem(CACHE_KEY, JSON.stringify(newBoundaries)); setShowBorders(true); 
                if (firstCoord && setUploadedFocus) setUploadedFocus(firstCoord);
                setProgress("Success!"); setTimeout(() => setProgress(""), 3000);
            } catch (err) { setError("Upload failed."); } 
            finally { setIsLoading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
        };
        reader.readAsText(file);
    };

    // 🚀 RECURSIVE RENDERER FOR THE HIERARCHICAL TREE
    const renderNode = (node, pathId, indentLevel = 0) => {
        const hasChildren = Object.keys(node.children).length > 0;
        const hasBoundaries = node.boundaries.length > 0;
        if (!hasChildren && !hasBoundaries) return null;

        const isExpanded = expandedNodes[pathId];
        const paddingLeft = indentLevel * 12;

        return (
            <div key={pathId} className="flex flex-col">
                
                {/* Only render a folder header if it's not the Root */}
                {node.name !== "Root" && (
                    <div className="flex justify-between items-center bg-slate-800 p-2 rounded mb-1 border border-slate-700 hover:bg-slate-700/80 transition-colors" style={{ marginLeft: `${paddingLeft}px` }}>
                        <div className="flex items-center gap-2 cursor-pointer flex-1 min-w-0" onClick={() => toggleNode(pathId)}>
                            {hasChildren ? (
                                <ChevronRight size={14} className={`text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}/>
                            ) : <div className="w-[14px] shrink-0"></div>}
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest truncate" title={node.name}>
                                {node.name} <span className="text-[8px] text-slate-500 normal-case ml-1">({node.level})</span>
                            </span>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => toggleBranchVisibility(node, false)} className="text-[8px] font-bold tracking-widest bg-emerald-900/40 text-emerald-400 hover:bg-emerald-500 hover:text-white px-1.5 py-1 rounded transition-colors" title="Show All under this node">VIS</button>
                            <button onClick={() => toggleBranchVisibility(node, true)} className="text-[8px] font-bold tracking-widest bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white px-1.5 py-1 rounded transition-colors" title="Hide All under this node">HID</button>
                        </div>
                    </div>
                )}

                {/* Render the contents if it's Root OR if the folder is expanded */}
                {(isExpanded || node.name === "Root") && (
                    <div className="flex flex-col">
                        
                        {/* 1. Render immediate child folders */}
                        {Object.values(node.children).map(childNode => renderNode(childNode, `${pathId}-${childNode.name}`, indentLevel + 1))}
                        
                        {/* 2. Render actual boundary items belonging to this node */}
                        {node.boundaries.map(b => (
                            <div key={b.id} className={`flex flex-col bg-slate-900 p-2.5 rounded border mb-1 group hover:border-slate-500 transition-colors ${b.isHidden ? 'border-red-900/30 opacity-60' : 'border-slate-700'}`} style={{ marginLeft: `${paddingLeft + 16}px` }}>
                                {/* 🚀 EXPANDED SECTOR SETTINGS PANEL */}
                                {editingId === b.id ? (
                                    <div className="flex flex-col gap-3 w-full p-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] uppercase font-bold text-orange-400 flex items-center gap-1"><Settings size={12}/> Sector Configuration</span>
                                            <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-white"><X size={14}/></button>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Sector Name</label>
                                                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 text-white text-[10px] font-bold p-1.5 rounded outline-none focus:border-blue-500"/>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="flex-[0.5]">
                                                    <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Theme</label>
                                                    <div className="flex items-center justify-center bg-slate-800 border border-slate-600 rounded p-1 h-[32px]">
                                                        <input type="color" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} className="w-full h-full rounded cursor-pointer bg-transparent border-none p-0"/>
                                                    </div>
                                                </div>
                                                <div className="flex-[1.5]">
                                                    <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Target Rev (Rp) <span className="text-slate-600 normal-case">(Optional)</span></label>
                                                    <input type="number" placeholder="e.g. 5000000" value={editForm.targetRev} onChange={e => setEditForm({...editForm, targetRev: e.target.value})} className="w-full bg-slate-800 border border-slate-600 text-white text-[10px] font-bold p-1.5 h-[32px] rounded outline-none focus:border-emerald-500"/>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Assigned Agent <span className="text-slate-600 normal-case">(Optional)</span></label>
                                                <select value={editForm.assignedAgent} onChange={e => setEditForm({...editForm, assignedAgent: e.target.value})} className="w-full bg-slate-800 border border-slate-600 text-white text-[10px] font-bold p-1.5 rounded outline-none focus:border-purple-500 cursor-pointer">
                                                    <option value="none">-- Unassigned Territory --</option>
                                                    {(motorists || []).map(m => (
                                                        <option key={m.id} value={m.id}>{m.name || m.email?.split('@')[0]} ({m.location || 'Field'})</option>
                                                    ))}
                                                    {(!motorists || motorists.length === 0) && <option value="manual_entry_placeholder" disabled>No Agents Found</option>}
                                                </select>
                                            </div>
                                        </div>
                                        <button onClick={() => handleSaveBoundary(b.id)} className="w-full bg-blue-600/20 hover:bg-blue-600 border border-blue-500 text-blue-400 hover:text-white py-1.5 rounded text-[10px] font-bold uppercase tracking-widest mt-2 transition-colors flex items-center justify-center gap-2">
                                            <Save size={12}/> Save Sector Configuration
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: b.level === 'Kabupaten' ? 'transparent' : b.color, border: b.level === 'Kabupaten' ? `2px solid ${b.color}` : 'none', opacity: b.isHidden ? 0.2 : 1 }}></div>
                                            <div className="flex flex-col truncate">
                                                <span className={`text-xs font-medium truncate ${b.isHidden ? 'text-slate-500 line-through' : 'text-white'}`} title={b.name}>
                                                    {b.name} {b.assignedAgent && <span className="text-purple-400 ml-1 text-[10px]" title="Agent Assigned">👤</span>}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0 opacity-100 lg:opacity-30 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => toggleVisibility(b.id, b.isHidden)} className={`text-[8px] font-bold px-1.5 py-1 rounded transition-colors ${b.isHidden ? 'bg-slate-800 text-slate-500 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-900/50 text-emerald-400 hover:bg-slate-700 hover:text-white'}`}>{b.isHidden ? 'HIDDEN' : 'VISIBLE'}</button>
                                            <button onClick={() => { 
                                                setEditingId(b.id); 
                                                setEditForm({
                                                    name: b.name || "",
                                                    color: b.color || "#38bdf8",
                                                    targetRev: b.targetRev || "",
                                                    assignedAgent: b.assignedAgent || "none"
                                                }); 
                                            }} className="text-slate-400 hover:text-blue-400 p-1 rounded bg-slate-900 transition-colors"><Settings size={12}/></button>
                                            <button onClick={() => handleDeleteBorder(b.id)} className="text-slate-400 hover:text-red-500 p-1 rounded bg-slate-900 transition-colors"><Trash2 size={12}/></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="absolute top-24 right-4 w-[400px] min-w-[320px] max-w-[600px] bg-slate-900 border-2 border-blue-500 shadow-2xl rounded-xl p-5 z-[2000] animate-slide-in-left min-h-[50vh] max-h-[90vh] flex flex-col resize-y overflow-hidden">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={16}/></button>
            <h3 className="text-white font-bold mb-1 flex items-center gap-2"><Globe size={16} className="text-blue-500"/> Territory Manager</h3>
            
            <div className="bg-slate-800 p-4 rounded-lg border border-dashed border-emerald-500/50 my-3 transition-all hover:bg-slate-800/80 shrink-0">
                <input type="file" accept=".geojson,.json" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={isLoading} className="w-full bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500 text-emerald-400 font-bold py-2.5 rounded flex justify-center items-center gap-2 text-xs transition-colors disabled:opacity-50">
                    <Upload size={14}/> {isLoading ? "Processing..." : "Select Shapefile"}
                </button>
            </div>

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
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1 pb-2">
                        {renderNode(hierarchicalTree, "root-node", 0)}
                    </div>
                )}
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
        <div className="absolute left-4 right-4 lg:right-auto top-[70px] lg:top-24 lg:w-72 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-blue-500 p-5 z-[1000] animate-slide-in-left">
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
            </div>
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
        <div onClick={() => setIsMinimized(false)} className="absolute top-[70px] lg:top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/95 text-white px-4 py-2 rounded-full border border-orange-500 shadow-xl cursor-pointer hover:scale-105 transition-transform flex items-center gap-3">
            <ShieldCheck className="text-orange-500"/><span className="text-xs font-bold font-mono">Control: {percentage}%</span><Maximize2 size={12} className="text-slate-400"/>
        </div>
    );

    return (
        <div className="absolute top-[70px] lg:top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/95 text-white px-6 py-4 rounded-2xl border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)] backdrop-blur-md flex flex-col items-center animate-slide-down min-w-[280px]">
            <button onClick={() => setIsMinimized(true)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><MinusCircle size={16}/></button>
            <div className="text-[10px] text-orange-400 font-bold tracking-[0.2em] uppercase mb-1">Territory Control</div>
            <div className="flex items-center gap-4 mb-3 mt-1"><div className="text-3xl font-black font-mono">{percentage}%</div><div className="h-8 w-[1px] bg-slate-600"></div><div><div className="text-[10px] text-slate-400 uppercase">Current Rank</div><div className="text-sm font-bold text-emerald-400">{rank}</div></div></div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700"><div className="h-full bg-gradient-to-r from-orange-600 to-yellow-400 transition-all duration-1000" style={{ width: `${percentage}%` }}></div></div>
        </div>
    );
};

const StoreBottomSheet = ({ store, mapPoints, transactions, inventory, db, appId, user, isAdmin, setSelectedStore, liveScaleOverride, setLiveScaleOverride, setEditingStoreId, setDragPinCoords, canOverrideGps, activeTiers, setLocalTierUpdates }) => {
    const sheetRef = useRef(null);
    const translateVal = useRef(0);
    const touchY = useRef(0);
    
    const [isLinking, setIsLinking] = useState(false); 
    const [localScale, setLocalScale] = useState(store?.catchmentScale || 1.0);
    const [visitFreq, setVisitFreq] = useState(store?.visitFreq || 7);
    const [showConsignDetails, setShowConsignDetails] = useState(false);

    useEffect(() => {
        if (!store) return;
        // 🚀 AUTO-OPENER: Ensure the sheet transitions up smoothly when the store is selected via Radar
        if (window.innerWidth < 1024 && sheetRef.current) {
            const winH = window.innerHeight;
            const sheetH = winH * 0.85; 
            const targetVisible = winH * 0.50; 
            const initialTranslate = sheetH - targetVisible; 
            
            translateVal.current = initialTranslate;
            // Delay slightly to allow the map fly-to animation to finish
            setTimeout(() => {
                if (sheetRef.current) {
                    sheetRef.current.style.transform = `translateY(${initialTranslate}px)`;
                    sheetRef.current.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                }
            }, 800);
        }
    }, [store?.id]);

    useEffect(() => { 
        if (!store) return;
        setLocalScale(store.catchmentScale || 1.0); 
        setVisitFreq(store.visitFreq || 7);
    }, [store?.id, store?.catchmentScale, store?.visitFreq]);

    const onHandleTouchStart = (e) => {
        touchY.current = e.touches[0].clientY;
        if (sheetRef.current) {
            sheetRef.current.style.transition = 'none'; 
        }
    };

    const onHandleTouchMove = (e) => {
        const y = e.touches[0].clientY;
        const deltaY = y - touchY.current;
        touchY.current = y;

        const winH = window.innerHeight;
        const sheetH = winH * 0.85;

        translateVal.current += deltaY;
        
        if (translateVal.current < 0) translateVal.current = 0;
        if (translateVal.current > sheetH) translateVal.current = sheetH;

        if (sheetRef.current) {
            sheetRef.current.style.transform = `translateY(${translateVal.current}px)`;
        }
    };

    const onHandleTouchEnd = () => {
        const winH = window.innerHeight;
        const sheetH = winH * 0.85;
        
        const visibleHeight = sheetH - translateVal.current;
        const relHeight = visibleHeight / winH; 

        if (relHeight < 0.10) {
            setSelectedStore(null);
            return;
        }

        const snapPoints = [0.22, 0.50, 0.85];
        const nearestSnap = snapPoints.reduce((prev, curr) => 
            Math.abs(curr - relHeight) < Math.abs(prev - relHeight) ? curr : prev
        );

        const targetTranslate = sheetH - (winH * nearestSnap);
        translateVal.current = targetTranslate;

        if (sheetRef.current) {
            sheetRef.current.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            sheetRef.current.style.transform = `translateY(${targetTranslate}px)`;
        }
    };

    const availableHubs = useMemo(() => {
        const safePoints = Array.isArray(mapPoints) ? mapPoints : [];
        return safePoints.filter(c => c && c.storeType === 'Wholesaler' && c.id !== store?.id);
    }, [mapPoints, store?.id]);

    const stats = useMemo(() => {
        if (!store?.name) return { totalRev: 0, currentConsignment: 0, activeItems: [] };

        const safeTrans = Array.isArray(transactions) ? transactions : [];
        const storeTrans = safeTrans.filter(t => t && t.customerName === store.name);
        
        const totalRev = storeTrans.filter(t => t.type === 'SALE').reduce((sum, t) => sum + (Number(t.total) || 0), 0);
        const totalTitip = storeTrans.filter(t => t.type === 'SALE' && t.paymentType === 'Titip').reduce((sum, t) => sum + (Number(t.total) || 0), 0);
        const totalPaid = storeTrans.filter(t => t.type === 'CONSIGNMENT_PAYMENT').reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
        const currentConsignment = Math.max(0, totalTitip - totalPaid);
        
        const itemMap = {}; 
        const safeInv = Array.isArray(inventory) ? inventory : [];

        storeTrans.forEach(t => {
            if (t.type === 'SALE' && t.paymentType === 'Titip') {
                const itemsList = Array.isArray(t.items) ? t.items : Object.values(t.items || {});
                itemsList.forEach(i => { 
                    if (!i || !i.productId) return; 
                    const product = safeInv.find(p => p.id === i.productId);
                    const bks = convertToBks(Number(i.qty) || 0, String(i.unit || 'Bks'), product); 
                    if (!itemMap[i.productId]) itemMap[i.productId] = { name: String(i.name || 'Unknown'), qty: 0 }; 
                    itemMap[i.productId].qty += bks; 
                });
            } else if (t.type === 'CONSIGNMENT_PAYMENT' || t.type === 'RETURN') {
                const itemsList = Array.isArray(t.itemsPaid || t.items) ? (t.itemsPaid || t.items) : Object.values(t.itemsPaid || t.items || {});
                itemsList.forEach(i => { 
                    if (!i || !i.productId) return; 
                    const product = safeInv.find(p => p.id === i.productId);
                    const bks = convertToBks(Number(i.qty) || 0, String(i.unit || 'Bks'), product); 
                    if (itemMap[i.productId]) itemMap[i.productId].qty -= bks; 
                });
            }
        });
        const activeItems = Object.values(itemMap).filter(i => i.qty > 0);
        return { totalRev, currentConsignment, activeItems };
    }, [store?.name, transactions, inventory]);

    const recentSales = useMemo(() => {
        if (!store?.name) return [];
        const safeTrans = Array.isArray(transactions) ? transactions : [];
        return safeTrans
            .filter(t => t && t.customerName === store.name && t.type === 'SALE')
            .sort((a, b) => {
                const dateA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.date || 0).getTime();
                const dateB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.date || 0).getTime();
                return (dateB || 0) - (dateA || 0);
            })
            .slice(0, 5); 
    }, [transactions, store?.name]);

    const handleToggleStoreType = async () => {
        if (!db || !appId || isLinking || !store?.id) return;
        setIsLinking(true);
        try {
            const newType = store.storeType === 'Wholesaler' ? 'Retailer' : 'Wholesaler';
            const userId = user?.uid || user?.id;
            const ref = doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id);
            const updates = { storeType: newType };
            if (newType === 'Wholesaler') updates.suppliedBy = null;
            await updateDoc(ref, updates);
        } catch (error) { console.error(error); } finally { setIsLinking(false); }
    };

    const handleAssignHub = async (hubId) => {
        if (!db || !appId || isLinking || !store?.id) return;
        setIsLinking(true);
        try { 
            const userId = user?.uid || user?.id;
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id), { suppliedBy: hubId === "none" ? null : hubId }); 
        } catch (error) { console.error(error); } finally { setIsLinking(false); }
    };

    const handleSaveLocalScale = async () => {
        if (!db || !appId || !store?.id) return;
        try { 
            const userId = user?.uid || user?.id;
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id), { catchmentScale: localScale }); 
        } catch (error) { console.error(error); }
    };

    const handleSaveVisitFreq = async (newFreq) => {
        const freq = Math.max(1, parseInt(newFreq) || 7);
        setVisitFreq(freq);
        if (!db || !appId || !user || !store?.id) return;
        try { 
            const userId = user?.uid || user?.id;
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id), { visitFreq: freq }); 
        } catch (error) { console.error(error); }
    };

    const handleSaveTier = async (newTier) => {
        if (!db || !appId || !user || !store?.id) return;
        try { 
            const userId = user?.uid || user?.id;
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id), { 
                tier: newTier
            }); 
            if (setLocalTierUpdates) {
                setLocalTierUpdates(prev => ({ ...prev, [store.id]: newTier }));
            }
        } catch (error) { console.error(error); }
    };

    const handleDeleteStore = async () => {
        if (!window.confirm(`⚠️ DANGER: Are you absolutely sure you want to PERMANENTLY DELETE ${store.name}? This cannot be undone.`)) return;
        if (!db || !appId || !user || !store?.id) return;
        try {
            const userId = user?.uid || user?.id;
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id));
            alert(`✅ ${store.name} has been eradicated from the database.`);
            setSelectedStore(null);
        } catch (error) {
            console.error("Delete Error:", error);
            alert("Failed to delete store.");
        }
    };

    const getWhatsappLink = () => { 
        if (!store?.phone) return "#"; 
        return `https://wa.me/${String(store.phone).replace(/\D/g, '').replace(/^0/, '62')}`; 
    };
    
    const getGpsLink = () => { 
        if (store?.latitude && store?.longitude) {
            return `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`; 
        }
        const fallbackAddress = [store?.address, store?.city].filter(Boolean).join(', ');
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fallbackAddress)}`; 
    };

    const displayLocation = useMemo(() => {
        if (!store) return 'Location details unavailable';
        const parts = [];
        if (typeof store.address === 'string' && store.address.trim() !== '') parts.push(store.address);
        if (typeof store.city === 'string' && store.city !== 'Uncategorized') parts.push(store.city);
        if (typeof store.region === 'string' && store.region !== 'Uncategorized') parts.push(store.region);
        return parts.length > 0 ? parts.join(', ') : 'Location details unavailable';
    }, [store?.address, store?.city, store?.region]);

    const isMobile = window.innerWidth < 1024;

    if (!store) return null; 

    return (
        <div 
            ref={sheetRef}
            className="fixed bottom-0 left-0 right-0 lg:absolute lg:top-24 lg:bottom-auto lg:left-4 lg:w-[400px] lg:h-auto lg:max-h-[90vh] bg-slate-900 lg:bg-slate-900/95 backdrop-blur-xl lg:border border-slate-700 lg:rounded-2xl rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.6)] lg:shadow-2xl z-[1000] flex flex-col lg:animate-slide-in-left lg:transform-none"
            style={isMobile ? { height: '85vh', transform: 'translateY(100%)' } : {}}
            onClick={(e) => e.stopPropagation()} 
        >
            <div 
                className="shrink-0 flex flex-col pt-3 px-6 pb-4 border-b border-slate-800 bg-slate-900 rounded-t-3xl lg:cursor-default"
                style={{ touchAction: isMobile ? 'none' : 'auto' }}
                onTouchStart={isMobile ? onHandleTouchStart : undefined}
                onTouchMove={isMobile ? onHandleTouchMove : undefined}
                onTouchEnd={isMobile ? onHandleTouchEnd : undefined}
            >
                <div className="lg:hidden w-16 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 pointer-events-none"></div>
                
                <div className="flex items-start justify-between mb-1 pr-8 pointer-events-none">
                    <h2 className="text-2xl font-black leading-tight text-white truncate pointer-events-none">{store.name || 'Unknown Store'}</h2>
                </div>
                
                {store.storeType === 'Wholesaler' && <span className="inline-flex items-center gap-1 bg-amber-500 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase mb-4 shadow-[0_0_10px_rgba(245,158,11,0.5)] pointer-events-none"><Store size={10} /> WHOLESALE HUB</span>}
                
                <p className="text-slate-400 text-xs flex items-center gap-1.5 mb-5 leading-relaxed truncate font-bold pointer-events-none">
                    <MapPin size={14} className="shrink-0 mt-0.5 text-orange-500"/>
                    <span className="truncate">{displayLocation}</span>
                </p>

                <div className="grid grid-cols-2 gap-3">
                    <a href={getGpsLink()} target="_blank" rel="noreferrer" className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 text-xs text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                        <Navigation size={14}/> Directions
                    </a>
                    
                    {isAdmin && store.phone ? (
                        <a href={getWhatsappLink()} target="_blank" rel="noreferrer" className="w-full py-3 bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 text-xs font-bold text-white shadow-md">
                            <Phone size={14}/> WhatsApp
                        </a>
                    ) : (
                        <div className="w-full py-3 bg-slate-800 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                            <Phone size={14}/> No Phone
                        </div>
                    )}

                    {canOverrideGps && (
                        <button onClick={() => {
                            setDragPinCoords({ lat: store.latitude, lng: store.longitude });
                            setEditingStoreId(store.id);
                            setSelectedStore(null); 
                        }} className="col-span-2 w-full py-3.5 bg-slate-800 border border-slate-600 hover:border-orange-500 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-orange-400 transition-colors shadow-md">
                            <MapPin size={14}/> Correct Pin Location
                        </button>
                    )}
                </div>
            </div>

            <button onClick={() => setSelectedStore(null)} className="hidden lg:flex absolute top-4 right-4 p-2 bg-slate-800 rounded-full hover:bg-red-500 transition-colors text-white"><X size={16}/></button>

            <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 pt-2 pb-[10vh] lg:pb-6">
                
                <div className={`p-4 rounded-xl mb-6 flex flex-col gap-3 border ${store.status === 'overdue' ? 'bg-red-500/20 border-red-500' : 'bg-emerald-500/20 border-emerald-500'}`}>
                    <div className="flex items-center gap-3">
                        <Calendar size={24} className={store.status === 'overdue' ? 'text-red-500' : 'text-emerald-500'}/>
                        <div className="flex-1">
                            <p className="text-[10px] uppercase font-bold opacity-70 text-white">Next Visit Target</p>
                            <p className="font-bold text-sm text-white">
                                {!store.lastVisit ? 'Never Visited (Due Now)' : (store.diffDays <= 0 ? `${Math.abs(store.diffDays)} Days Overdue` : `Due in ${store.diffDays} days`)}
                            </p>
                        </div>
                        
                        {isAdmin && (
                            <div className="flex items-center gap-1 bg-slate-900/50 p-1.5 rounded-lg border border-slate-600 shadow-inner">
                                <Clock size={12} className="text-slate-400 ml-1"/>
                                <input 
                                    type="number" 
                                    min="1" 
                                    value={visitFreq} 
                                    onChange={(e) => setVisitFreq(e.target.value)} 
                                    onBlur={(e) => handleSaveVisitFreq(e.target.value)}
                                    className="w-8 text-center text-xs font-black bg-transparent text-white outline-none"
                                />
                                <span className="text-[9px] text-slate-400 font-bold pr-1 uppercase">Days</span>
                            </div>
                        )}
                    </div>
                </div>

                {isAdmin && (
                    <>
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 p-3 rounded-xl border border-slate-700 bg-slate-800/80 flex flex-col justify-center shadow-inner">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Tag size={10} className="text-blue-400"/> Override Performance Tier</label>
                                <select 
                                    value={store.tier || store.priceTier || 'Retail'} 
                                    onChange={(e) => handleSaveTier(e.target.value)} 
                                    className="bg-slate-900 border border-slate-600 rounded p-1.5 text-[10px] uppercase tracking-widest text-white outline-none focus:border-emerald-500 font-bold cursor-pointer w-full"
                                >
                                    {activeTiers?.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>
                            <button onClick={handleDeleteStore} className="flex-[0.5] bg-slate-800 hover:bg-red-900/60 text-slate-500 hover:text-red-400 rounded-xl border border-slate-700 hover:border-red-500 transition-colors flex flex-col items-center justify-center shadow-inner active:scale-95">
                                <Trash2 size={16} className="mb-1"/>
                                <span className="text-[9px] font-black uppercase tracking-widest">Delete</span>
                            </button>
                        </div>

                        <div className="mb-6 bg-slate-800 p-4 rounded-xl border border-slate-600 shadow-inner">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] uppercase font-bold text-slate-300 flex items-center gap-1"><Database size={12} className="text-orange-500"/> Individual Reach</label>
                                <div className="flex items-center gap-1">
                                    <input type="number" step="0.1" min="0.1" max="5.0" value={localScale} onChange={(e) => { const val = Math.max(0.1, parseFloat(e.target.value) || 1); setLocalScale(val); setLiveScaleOverride(val); }} onBlur={handleSaveLocalScale} className="w-14 text-right text-xs font-mono bg-slate-900 p-1 rounded text-white border border-slate-600 focus:border-orange-500 outline-none" />
                                    <span className="text-[10px] text-slate-500 font-bold">x</span>
                                </div>
                            </div>
                            <input type="range" min="0.1" max="5.0" step="0.1" value={localScale} onChange={(e) => { const val = parseFloat(e.target.value); setLocalScale(val); setLiveScaleOverride(val); }} onMouseUp={handleSaveLocalScale} onTouchEnd={handleSaveLocalScale} className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all" />
                        </div>

                        <div className="mb-4 p-3 rounded-xl border border-slate-700 bg-slate-800/50 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-300">Set as Wholesale Hub</span>
                            <button onClick={handleToggleStoreType} disabled={isLinking} className={`w-10 h-6 rounded-full transition-colors relative ${store.storeType === 'Wholesaler' ? 'bg-amber-500' : 'bg-slate-600'}`}><span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${store.storeType === 'Wholesaler' ? 'translate-x-4' : 'translate-x-0'}`}></span></button>
                        </div>

                        {store.storeType !== 'Wholesaler' && (
                            <div className="mb-6 bg-slate-800 p-4 rounded-xl border border-amber-500/30">
                                <label className="text-[10px] text-amber-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-2"><Tag size={12}/> Map to Wholesaler</label>
                                <select value={store.suppliedBy || "none"} onChange={(e) => handleAssignHub(e.target.value)} disabled={isLinking} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 font-bold">
                                    <option value="none">-- Select Wholesale Hub --</option>
                                    {availableHubs.map(hub => <option key={hub.id} value={hub.id}>{hub.name} ({hub.city})</option>)}
                                </select>
                            </div>
                        )}

                        <div className="space-y-4 mb-2">
                            {stats.currentConsignment > 0 && (
                                <div className="p-4 bg-orange-500/20 border border-orange-500 rounded-xl transition-all">
                                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowConsignDetails(!showConsignDetails)}>
                                        <div><p className="text-[10px] text-orange-300 uppercase font-bold flex items-center gap-2"><Wallet size={12}/> Active Consignment</p><p className="text-xl font-bold text-orange-500">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats.currentConsignment)}</p></div>
                                        <div className={`bg-orange-500/20 p-1 rounded-full transition-transform duration-300 ${showConsignDetails ? 'rotate-180' : ''}`}><ChevronRight size={16} className="text-orange-500 rotate-90"/></div>
                                    </div>
                                    {showConsignDetails && (
                                        <div className="mt-3 pt-3 border-t border-orange-500/30 space-y-2 animate-fade-in scrollable-content overflow-y-auto max-h-[30vh]">
                                            {stats.activeItems.length > 0 ? stats.activeItems.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs items-center"><span className="text-slate-300 font-medium">{item.name}</span><span className="text-orange-400 font-bold bg-orange-900/40 px-2 py-0.5 rounded">{item.qty} Bks</span></div>
                                            )) : <p className="text-xs text-slate-400 italic text-center">No item details found.</p>}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <h3 className="text-[10px] text-slate-400 uppercase tracking-widest mb-4 font-bold flex justify-between items-center border-b border-slate-700 pb-2">
                                    Recent Sales
                                    <span className="text-emerald-400 font-black">{new Intl.NumberFormat('id-ID', { compactDisplay: "short", notation: "compact", currency: 'IDR' }).format(stats.totalRev)} Lifetime</span>
                                </h3>
                                
                                <div className="space-y-3 scrollable-content overflow-y-auto max-h-[40vh]">
                                    {recentSales.length > 0 ? recentSales.map(tx => {
                                        let displayDate = "Unknown Date";
                                        let displayTime = "--:--";
                                        try {
                                            const rawDate = tx.timestamp?.seconds ? new Date(tx.timestamp.seconds * 1000) : new Date(tx.date || 0);
                                            if (!isNaN(rawDate.getTime()) && rawDate.getTime() > 0) {
                                                displayDate = rawDate.toLocaleString('id-ID', {day:'numeric', month:'short', year:'numeric'});
                                                displayTime = rawDate.toLocaleString('id-ID', {hour:'2-digit', minute:'2-digit'});
                                            }
                                        } catch(err) {}

                                        return (
                                            <div key={tx.id} className="bg-slate-900 p-3 rounded-lg border border-slate-600 shadow-inner">
                                                <div className="flex justify-between items-start mb-2 border-b border-slate-700 pb-2">
                                                    <div>
                                                        <span className="text-xs font-bold text-white block">{displayDate}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-slate-500">{displayTime}</span>
                                                            <span className="text-[9px] bg-slate-800 text-blue-400 border border-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                                                                <User size={10} /> {tx.agentName === 'Admin' ? 'Admin' : (tx.agentName || 'Sales')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-black text-emerald-400">{formatRupiah(Number(tx.total) || 0)}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {(Array.isArray(tx.items) ? tx.items : Object.values(tx.items || {})).map((item, i) => (
                                                    <div key={i} className="flex justify-between text-[10px]">
                                                        <span className="text-slate-300 truncate pr-2">- {String(item?.name || 'Item')}</span>
                                                        <span className="text-orange-400 font-bold shrink-0">{Number(item?.qty || 0)} {String(item?.unit || 'Bks')}</span>
                                                    </div>
                                                ))}
                                                </div>
                                            </div>
                                        )
                                    }) : (
                                        <div className="text-center py-4 opacity-50 flex flex-col items-center">
                                            <TrendingUp size={20} className="text-slate-500 mb-1"/>
                                            <p className="text-xs text-slate-400 italic">No recent sales data.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const TierAutomationEngine = ({ db, appId, user, activeTiers, mapPoints, transactions, onClose, logAudit, triggerCapy, setLocalTierUpdates }) => {
    const [rules, setRules] = useState({});
    const [simResults, setSimResults] = useState(null);
    const [isApplying, setIsApplying] = useState(false);
    const userId = user?.uid || user?.id || 'default';

    useEffect(() => {
        const loadSettings = async () => {
            try {
                let snap = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/appSettings`, 'tierRules'));
                if (snap.exists() && snap.data().rules) { setRules(snap.data().rules); return; }
                const mainSnap = await getDoc(doc(db, `artifacts/${appId}/users/${userId}`, 'appSettings'));
                if (mainSnap.exists() && mainSnap.data().tierRules) setRules(mainSnap.data().tierRules);
            } catch(e) {}
        };
        loadSettings();
    }, [db, appId, userId]);

    const getSafeTime = (t) => {
        if (!t) return 0;
        if (t.timestamp?.seconds) return t.timestamp.seconds * 1000;
        if (typeof t.timestamp === 'number') return t.timestamp < 1e12 ? t.timestamp * 1000 : t.timestamp;
        
        const parseDateStr = (dateStr) => {
            if (!dateStr) return 0;
            let ms = new Date(dateStr).getTime();
            if (!isNaN(ms)) return ms; 
            
            let cleanStr = String(dateStr).toLowerCase()
                .replace(/januari|jan/g, 'january').replace(/februari|feb/g, 'february')
                .replace(/maret|mar/g, 'march').replace(/mei/g, 'may')
                .replace(/juni|jun/g, 'june').replace(/juli|jul/g, 'july')
                .replace(/agustus|agu/g, 'august').replace(/oktober|okt/g, 'october')
                .replace(/desember|des/g, 'december').replace(/\./g, ':');
            
            ms = new Date(cleanStr).getTime();
            if (!isNaN(ms)) return ms;

            const parts = cleanStr.split(',')[0].trim().split(/[\/\-]/);
            if (parts.length === 3) {
                let y = parts[2].length === 4 ? parts[2] : (parts[0].length === 4 ? parts[0] : new Date().getFullYear().toString());
                let m = parts[2].length === 4 ? parts[1].padStart(2, '0') : parts[1].padStart(2, '0');
                let d = parts[2].length === 4 ? parts[0].padStart(2, '0') : parts[2].padStart(2, '0');
                ms = new Date(`${y}-${m}-${d}T12:00:00Z`).getTime();
                if (!isNaN(ms)) return ms;
            }
            return 0;
        };

        const tsTime = parseDateStr(t.timestamp);
        if (tsTime > 0) return tsTime;
        return parseDateStr(t.date);
    };

    const runDataCleanse = async () => {
        if (!window.confirm("WARNING: Initialize RPG Protocol? This will calculate Lifetime and Season XP from all legacy receipts and lock them into store profiles permanently.")) return;
        setIsApplying(true);
        try {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            let ops = 0;

            for (let store of mapPoints) {
                let lifetimeXP = 0;
                let seasonXP = 0;
                
                const safeTrans = Array.isArray(transactions) ? transactions : [];
                safeTrans.forEach(t => {
                    const tType = String(t.type || (t.total < 0 ? 'RETUR' : 'SALE')).toUpperCase();
                    const isMatch = (t.customerName || t.customer || '').trim().toLowerCase() === (store.name || '').trim().toLowerCase();
                    
                    if (t && isMatch && tType === 'SALE') {
                        const val = (Number(String(t.total).replace(/[^0-9-]/g, '')) || 0);
                        lifetimeXP += val;

                        const tTime = getSafeTime(t);
                        const d = new Date(tTime > 0 ? tTime : 0);
                        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                            seasonXP += val;
                        }
                    }
                });

                await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id), {
                    lifetimeXP: lifetimeXP,
                    seasonXP: seasonXP,
                    lastXPUpdate: new Date().toISOString()
                });
                ops++;
            }
            alert(`✅ RPG Migration Complete! ${ops} stores upgraded. You can now use the Season Rank Audit.`);
            onClose();
        } catch(e) {
            console.error(e);
            alert("Migration Failed. Check console.");
        }
        setIsApplying(false);
    };

    const runSimulation = () => {
        const safeRules = rules || {};
        
        const powerLadder = activeTiers.map((tier, index) => {
            let target = 0;
            const rule = safeRules[tier.id] || safeRules[tier.label];
            if (rule) {
                const isOmset = String(rule.type || 'omset').toLowerCase().includes('omset');
                target = Number(String(isOmset ? (rule.omsetTarget || rule.target || 0) : (rule.volumeTarget || rule.target || 0)).replace(/[^0-9]/g, '')) || 0;
            } else {
                const defaultTargets = [2500000, 1000000, 500000, 250000, 0];
                target = defaultTargets[index] || 0;
            }
            return { id: tier.id, power: target };
        }).sort((a, b) => b.power - a.power); 

        const results = { promotions: [], demotions: [], steady: 0, actions: [], all: [] };
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        mapPoints.forEach(store => {
            let currentTier = store.tier || powerLadder[powerLadder.length - 1].id;
            let oldPowerStep = powerLadder.find(step => String(step.id).toLowerCase() === String(currentTier).toLowerCase());
            let oldPower = oldPowerStep ? oldPowerStep.power : 0;

            let lifetimeXP = store.lifetimeXP || 0;
            let seasonXP = store.seasonXP || 0;
            let lastUpdate = store.lastXPUpdate ? new Date(store.lastXPUpdate) : new Date();
            let isNewSeason = (lastUpdate.getMonth() !== currentMonth || lastUpdate.getFullYear() !== currentYear);

            let earnedTier = powerLadder[powerLadder.length - 1].id; 
            let newPower = powerLadder[powerLadder.length - 1].power;

            for (let step of powerLadder) {
                if (seasonXP >= step.power) {
                    earnedTier = step.id; 
                    newPower = step.power;
                    break;
                }
            }

            if (isNewSeason) {
                 if (newPower < oldPower) {
                     const oldLadderIdx = powerLadder.findIndex(l => l.power <= oldPower);
                     if (oldLadderIdx !== -1 && oldLadderIdx + 1 < powerLadder.length) {
                         earnedTier = powerLadder[oldLadderIdx + 1].id;
                         newPower = powerLadder[oldLadderIdx + 1].power;
                     } else {
                         earnedTier = powerLadder[powerLadder.length - 1].id;
                         newPower = powerLadder[powerLadder.length - 1].power;
                     }
                 }
                 seasonXP = 0; 
            }

            const isPromotion = newPower > oldPower;
            const isDemotion = newPower < oldPower;

            const changeObj = { 
                storeId: store.id, name: store.name, old: currentTier, new: earnedTier, 
                rev: seasonXP, lt: lifetimeXP, isNewSeason, isPromotion
            };
            results.all.push(changeObj);

            if (isPromotion) { results.promotions.push(changeObj); results.actions.push(changeObj); }
            else if (isDemotion) { results.demotions.push(changeObj); results.actions.push(changeObj); }
            else { results.steady++; }
        });
        
        results.all.sort((a, b) => b.rev - a.rev);
        setSimResults(results);
    };

    const applyChanges = async () => {
        if (!simResults || simResults.actions.length === 0) return;
        if (!window.confirm(`Execute Season Updates for ${simResults.actions.length} stores?`)) return;
        setIsApplying(true);
        try {
            let ops = 0;
            for (let action of simResults.actions) {
                const payload = { tier: action.new };
                if (action.isNewSeason) {
                    payload.seasonXP = 0;
                    payload.lastXPUpdate = new Date().toISOString();
                }
                await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, action.storeId), payload);
                
                if (setLocalTierUpdates) {
                    setLocalTierUpdates(prev => ({ ...prev, [action.storeId]: action.new }));
                }
                
                ops++;
            }
            if (logAudit) logAudit("SEASON_RANK_AUDIT", `Season RPG Engine adjusted ${ops} stores.`);
            if (triggerCapy) triggerCapy(`Season Update Complete! ${ops} store ranks adjusted. 📈`);
            alert(`✅ Success! ${ops} stores instantly updated on map.`);
            setSimResults(null);
            onClose();
        } catch(e) { alert("Error applying changes."); }
        setIsApplying(false);
    };

    return (
        <div className="absolute inset-0 z-[3000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-mono">
            <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-fade-in-up">
                <div className="p-5 border-b border-slate-700 bg-black/40 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-wider"><Settings size={20} className="text-emerald-500"/> Season Rank Engine</h2>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Option B: Monthly Reset with 1-Tier Soft Demotion</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={24}/></button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    <div className="bg-slate-800 border border-slate-600 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-1"><Globe size={14} className="text-blue-400"/> Synced to Global Logic</label>
                            <p className="text-[10px] text-slate-500">Targets are evaluated against active Calendar Month Season XP.</p>
                        </div>
                    </div>

                    {simResults ? (
                        <div className="bg-black/50 border-2 border-orange-500 rounded-xl p-4 animate-fade-in">
                            <h3 className="text-orange-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Activity size={16}/> Season Audit Results</h3>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="bg-slate-800 p-3 rounded-lg border border-emerald-500/30 text-center"><span className="block text-2xl font-black text-emerald-400">{simResults.promotions.length}</span><span className="text-[9px] uppercase font-bold text-slate-400">Promotions</span></div>
                                <div className="bg-slate-800 p-3 rounded-lg border border-red-500/30 text-center"><span className="block text-2xl font-black text-red-400">{simResults.demotions.length}</span><span className="text-[9px] uppercase font-bold text-slate-400">Demotions</span></div>
                                <div className="bg-slate-800 p-3 rounded-lg border border-slate-600 text-center"><span className="block text-2xl font-black text-slate-300">{simResults.steady}</span><span className="text-[9px] uppercase font-bold text-slate-500">Unchanged</span></div>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1 mb-4 custom-scrollbar">
                                {simResults.all.map((act, i) => {
                                    const oldLabel = activeTiers.find(t => String(t.id).toLowerCase() === String(act.old).toLowerCase())?.label || act.old;
                                    const newLabel = activeTiers.find(t => String(t.id).toLowerCase() === String(act.new).toLowerCase())?.label || act.new;
                                    
                                    return (
                                        <div key={i} className="flex justify-between items-center text-[10px] p-2 bg-slate-900 border border-slate-800 rounded">
                                            <span className="font-bold text-white truncate w-1/4">{act.name}</span>
                                            <div className="flex flex-col items-start w-2/5 font-mono">
                                                <span className="text-orange-400 font-black text-[9px]">SEASON: Rp {new Intl.NumberFormat('id-ID').format(act.rev)}</span>
                                                <span className="text-slate-500 text-[8px]">LIFETIME: Rp {new Intl.NumberFormat('id-ID').format(act.lt)}</span>
                                            </div>
                                            <div className="flex items-center gap-1 w-1/3 justify-end font-bold uppercase">
                                                <span className="text-slate-500 truncate" title={oldLabel}>{oldLabel}</span>
                                                {act.old !== act.new ? (
                                                    <>
                                                        {act.isPromotion ? <ArrowUpCircle size={12} className="text-emerald-500 shrink-0"/> : <ArrowDownCircle size={12} className="text-red-500 shrink-0"/>}
                                                        <span className={`truncate ${act.isPromotion ? 'text-emerald-400' : 'text-red-400'}`} title={newLabel}>{newLabel}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-600 ml-1 shrink-0">(=)</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setSimResults(null)} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-lg font-bold uppercase text-xs hover:bg-slate-700 transition-colors">Discard</button>
                                <button onClick={applyChanges} disabled={isApplying} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-black uppercase tracking-widest text-xs shadow-lg transition-transform active:scale-95 disabled:opacity-50">
                                    {isApplying ? 'EXECUTING...' : 'EXECUTE SEASON UPDATE'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <button onClick={runSimulation} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-transform active:scale-95 flex items-center justify-center gap-2">
                                <Activity size={18}/> Audit Season Ranks
                            </button>

                            <div className="border-t border-slate-700 pt-4 mt-4">
                                <h4 className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold flex items-center gap-1"><ShieldAlert size={12} className="text-red-500"/> System Setup (Run Once)</h4>
                                <button onClick={runDataCleanse} disabled={isApplying} className="w-full bg-red-900/40 border border-red-500/50 hover:bg-red-600 text-red-300 hover:text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2">
                                    {isApplying ? 'Processing Database...' : 'Initialize RPG Data Cleanse'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN WRAPPER (APP IN APP) ---
const MapMissionControl = ({ customers, transactions, inventory, db, appId, user, logAudit, triggerCapy, isAdmin, savedHome, onSetHome, tierSettings, motorists = [] }) => {

    const userId = user?.uid || user?.id || "default";

    const activeTiers = useMemo(() => (Array.isArray(tierSettings) && tierSettings.length > 0) ? tierSettings : [
        { id: 'Mythic', label: 'Mythic', color: '#f59e0b', iconType: 'emoji', value: '👑' },
        { id: 'Epic', label: 'Epic', color: '#8b5cf6', iconType: 'emoji', value: '🔥' },
        { id: 'Grandmaster', label: 'Grandmaster', color: '#ec4899', iconType: 'emoji', value: '⚔️' },
        { id: 'Bronze', label: 'Bronze', color: '#d97706', iconType: 'emoji', value: '🛡️' },
        { id: 'Unranked', label: 'Unranked', color: '#475569', iconType: 'emoji', value: '🪵' }
    ], [tierSettings]);

    const [localTierUpdates, setLocalTierUpdates] = useState({});

    const [selectedStore, setSelectedStore] = useState(null);
    const [selectedZone, setSelectedZone] = useState(null); 
    
    const [filterTier, setFilterTier] = useState(() => activeTiers.map(t => t.id)); 
    
    const tierIdsString = activeTiers.map(t => t.id).join(',');
    useEffect(() => {
        setFilterTier(activeTiers.map(t => t.id));
    }, [tierIdsString]);

    const [isAddingMode, setIsAddingMode] = useState(false); 
    const [editingStoreId, setEditingStoreId] = useState(null); 
    
    const [showControls, setShowControls] = useState(false);
    const [conquestMode, setConquestMode] = useState(false); 
    const [networkMode, setNetworkMode] = useState(false); 
    const [showBorders, setShowBorders] = useState(false); 
    const [showImporter, setShowImporter] = useState(false);

    const [salesHeatmapMode, setSalesHeatmapMode] = useState(false);
    const [showTacticalDash, setShowTacticalDash] = useState(false);
    
    const [showTierEngine, setShowTierEngine] = useState(false);

    const [selectedRegion, setSelectedRegion] = useState("All"); 
    const [selectedCity, setSelectedCity] = useState("All");
    
    const [selectedAreaType, setSelectedAreaType] = useState("Kecamatan");
    const [timeFilter, setTimeFilter] = useState("All-Time");

    const [liveScaleOverride, setLiveScaleOverride] = useState(null);
    const [uploadedFocus, setUploadedFocus] = useState(null);
    
    const [boundaries, setBoundaries] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    
    const mapRef = useRef(null);
    const [dragPinCoords, setDragPinCoords] = useState(null);

    const canAddManualPin = isAdmin === true || user?.tier === 1 || user?.tier === 2 || user?.tier === '1' || user?.tier === '2' || user?.role?.toLowerCase() === 'admin';

    const [pendingNewStore, setPendingNewStore] = useState(null);
    const [newStoreForm, setNewStoreForm] = useState({ name: '', phone: '', address: '', tier: activeTiers[0]?.id || 'Retail' });
    const [isSavingStore, setIsSavingStore] = useState(false);

    const handleSaveNewStore = async () => {
        if (!newStoreForm.name) return alert("Store Name is required!");
        setIsSavingStore(true);
        try {
            const newRef = doc(collection(db, `artifacts/${appId}/users/${userId}/customers`));
            
            await setDoc(newRef, {
                id: newRef.id,
                name: newStoreForm.name.toUpperCase(),
                phone: newStoreForm.phone || "",
                address: newStoreForm.address || "",
                tier: newStoreForm.tier,
                priceTier: newStoreForm.tier,
                storeType: 'Retailer',
                latitude: pendingNewStore.lat,
                longitude: pendingNewStore.lng,
                status: 'Active',
                visitFreq: 7, 
                createdAt: new Date().toISOString()
            });
            
            if (logAudit) logAudit("STORE_CREATED_MAP", `Added store ${newStoreForm.name} via map pin.`);
            if (triggerCapy) triggerCapy(`New target secured: ${newStoreForm.name} 📍`);
            
            setPendingNewStore(null);
        } catch (e) {
            console.error(e);
            alert("Failed to save store: " + e.message);
        } finally {
            setIsSavingStore(false);
        }
    };

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

    const sortedBoundaries = useMemo(() => {
        if (!Array.isArray(boundaries)) return [];
        return boundaries.filter(b => b && b.id && b.geometry && !b.isHidden).sort((a, b) => {
            const lMap = { 'Provinsi': 1, 'Kabupaten': 2, 'Kecamatan': 3, 'Desa': 4 };
            return (lMap[a.level] || 4) - (lMap[b.level] || 4);
        });
    }, [boundaries]);

    const { mapPoints, locationTree } = useMemo(() => {
        const tree = {}; 
        
        const safeCustomers = Array.isArray(customers) ? customers : [];

        const validStores = safeCustomers
                .filter(c => c && typeof c === 'object')
                .map(c => {
                    let lat = parseFloat(c.latitude); 
                    let lng = parseFloat(c.longitude);
                    
                    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0 || !c.latitude) {
                        lat = -7.5845; 
                        lng = 110.2895;
                    }

                    let safeName = typeof c.name === 'string' ? c.name : String(c.name || 'Unknown Store');
                    let safePhone = typeof c.phone === 'string' ? c.phone : String(c.phone || '');
                    let safeStoreType = typeof c.storeType === 'string' ? c.storeType : String(c.storeType || 'Retailer');
                    
                    let reg = String(c.region || "Uncategorized"); 
                    let cit = String(c.city || "Uncategorized");
                    const addr = String(c.address || "").toLowerCase();
                    
                    if (cit.toLowerCase().includes("jalan pemuda") || addr.includes("jalan pemuda")) cit = "Muntilan"; 
                    if (!tree[reg]) tree[reg] = new Set(); tree[reg].add(cit);

                    const last = c.lastVisit ? new Date(c.lastVisit) : null;
                const freq = parseInt(c.visitFreq) || 7;
                let diffDays = 0;
                let daysSinceVisit = 0;
                let isConquered = false;

                if (last && !isNaN(last.getTime())) {
                    const next = new Date(last);
                    next.setDate(last.getDate() + freq);
                    diffDays = Math.ceil((next - new Date()) / (1000 * 60 * 60 * 24));
                    daysSinceVisit = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
                    isConquered = daysSinceVisit <= 30;
                } else {
                        diffDays = -1; 
                        daysSinceVisit = 999;
                        isConquered = false;
                    }
                    const status = !last ? 'overdue' : (diffDays <= 0 ? 'overdue' : (diffDays <= 2 ? 'soon' : 'ok'));

                    let rawTier = localTierUpdates[c.id] || c.tier || 'Retail';
                    let safePerfTier = activeTiers.find(t => String(t?.id || '').toLowerCase() === String(rawTier).toLowerCase().trim())?.id;
                    if (!safePerfTier) safePerfTier = activeTiers[activeTiers.length - 1]?.id || 'Retail';

                    let safePriceTier = c.priceTier || c.pricingTier || 'Retail';

                    return { ...c, name: safeName, phone: safePhone, storeType: safeStoreType, address: addr, city: cit, region: reg, latitude: lat, longitude: lng, status, diffDays, daysSinceVisit, isConquered, visitFreq: freq, lastVisit: last, tier: safePerfTier, priceTier: safePriceTier };
                })
                .filter(c => c !== null);

            const filtered = validStores.filter(c => {
                if (selectedRegion !== "All" && c.region !== selectedRegion) return false;
                if (selectedCity !== "All" && c.city !== selectedCity) return false;
                if (!filterTier.includes(c.tier)) return false; 
                return true;
            });

        const treeArray = Object.keys(tree).reduce((acc, reg) => { acc[reg] = Array.from(tree[reg]).sort(); return acc; }, {});
        return { mapPoints: filtered, locationTree: treeArray };
    }, [customers, filterTier, selectedRegion, selectedCity, activeTiers, localTierUpdates]);

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

        const safeTrans = Array.isArray(transactions) ? transactions : [];

        mapPoints.forEach(store => {
            storeRevs[store.name] = safeTrans
                .filter(t => {
                    if (t.customerName !== store.name || t.type !== 'SALE') return false;
                    if (timeFilter === 'All-Time') return true;
                    if (!t.date) return false;
                    const txDate = new Date(t.date);
                    if (isNaN(txDate)) return false;

                    if (timeFilter === 'Today') return txDate.toDateString() === today.toDateString();
                    if (timeFilter === '7 Days') {
                        const sevenDaysAgo = new Date(today);
                        sevenDaysAgo.setDate(today.getDate() - 7);
                        return txDate >= sevenDaysAgo;
                    }
                    if (timeFilter === 'This Month') return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
                    if (timeFilter === 'This Year') return txDate.getFullYear() === today.getFullYear();
                    return true;
                }).reduce((sum, t) => sum + (t.total || 0), 0);
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

    // 🚀 THE MAP CATCHER: Intercepts targets sent from Journey Plan
    useEffect(() => {
        const targetId = sessionStorage.getItem('targetMapStore');
        if (targetId && mapPoints && mapPoints.length > 0) {
            const target = mapPoints.find(s => String(s.id) === String(targetId));
            if (target) {
                // 400ms delay ensures the Map container is fully rendered after switching tabs before flying
                setTimeout(() => {
                    setSelectedStore(target);
                    setSelectedZone(null);
                    setLiveScaleOverride(null);
                    // 🚀 AUTO-OPENER: Force the sheet to animate open for the agent
                    if (window.innerWidth < 1024) {
                        const sheet = document.querySelector('.fixed.bottom-0');
                        if (sheet) sheet.style.transform = 'translateY(15%)'; // Snaps to middle view
                    }
                    if (mapRef.current) {
                        mapRef.current.flyTo([target.latitude, target.longitude], 17, { duration: 1.2 });
                    }
                }, 400);
            }
            sessionStorage.removeItem('targetMapStore'); // Clear stamp to prevent double-firing
        }
    }, [mapPoints]);

    const toggleTierFilter = (tierId) => setFilterTier(prev => prev.includes(tierId) ? prev.filter(t => t !== tierId) : [...prev, tierId]);
    const toggleAllTiers = () => setFilterTier(filterTier.length === activeTiers.length ? [] : activeTiers.map(t => t.id));
    
    const handlePinClick = (store, map) => { 
        if (isAddingMode || editingStoreId) return; 
        setSelectedStore(store); 
        setSelectedZone(null); 
        setLiveScaleOverride(null); 
        
        const minZoom = window.innerWidth < 1024 ? 17 : 15;
        const targetZoom = Math.max(map.getZoom(), minZoom);
        
        map.flyTo([store.latitude, store.longitude], targetZoom, { duration: 1.2 }); 
    };

    const activeStore = selectedStore ? mapPoints.find(s => s.id === selectedStore.id) || selectedStore : null;

    return (
        <div className="absolute inset-0 w-full h-[100dvh] lg:h-full bg-slate-900 overflow-hidden font-sans z-[50] overscroll-none">
            
            <style>{`
                body, html { overscroll-behavior-y: none !important; }
            `}</style>

            <GameHUD conquestMode={conquestMode} mapPoints={mapPoints} /> 
            
            {/* 🚀 TARGETING HUD */}
            {(isAddingMode || editingStoreId) && dragPinCoords && (
                <div className="absolute top-[80px] lg:top-4 left-1/2 transform -translate-x-1/2 z-[1500] flex flex-col gap-2 items-center w-max min-w-[220px] pointer-events-auto bg-slate-900/95 backdrop-blur border-2 border-orange-500 p-2.5 rounded-xl shadow-[0_10px_30px_rgba(249,115,22,0.5)] animate-fade-in-up">
                    <div className="text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1">
                        <MapPin size={12} className="animate-bounce" /> {editingStoreId ? "Correct Location" : "Drop New Pin"}
                    </div>
                    <span className="text-slate-300 text-[9px] font-bold mt-0.5 leading-tight">Drag pin or tap map to move.</span>
                    
                    <div className="flex gap-2 w-full mt-1">
                        <button 
                            onClick={() => { setIsAddingMode(false); setEditingStoreId(null); setDragPinCoords(null); }}
                            className="flex-1 bg-slate-800 text-slate-400 hover:text-white py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-700 transition-colors px-4"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={async () => {
                                const finalLat = Number(parseFloat(dragPinCoords.lat ?? dragPinCoords[0]).toFixed(7));
                                const finalLng = Number(parseFloat(dragPinCoords.lng ?? dragPinCoords[1]).toFixed(7));

                                if (editingStoreId) {
                                    try {
                                        const storeRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, editingStoreId);
                                        await updateDoc(storeRef, { latitude: finalLat, longitude: finalLng });
                                        alert("✅ Location Corrected!");
                                        setEditingStoreId(null);
                                        setDragPinCoords(null);
                                        if (logAudit) logAudit("STORE_EDITED_MAP", `Corrected pin for store ID: ${editingStoreId}`);
                                    } catch(e) {
                                        alert("Failed to update location: " + e.message);
                                    }
                                } else {
                                    setPendingNewStore({ lat: finalLat, lng: finalLng });
                                    setIsAddingMode(false);
                                    setDragPinCoords(null);
                                    setNewStoreForm({ name: '', phone: '', address: '', tier: activeTiers[0]?.id || 'Retail' });
                                }
                            }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 px-4"
                        >
                            <CheckCircle size={12} /> {editingStoreId ? "Save" : "Confirm"}
                        </button>
                    </div>
                </div>
            )}

            {/* 🚀 NEW STORE REGISTRATION MODAL */}
            {pendingNewStore && (
                <div className="absolute inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.3)] rounded-2xl w-full max-w-sm p-6 animate-slide-down relative">
                        <button onClick={() => setPendingNewStore(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-orange-500/20 p-2 rounded-full"><Store className="text-orange-500" size={24}/></div>
                            <div>
                                <h3 className="text-white font-black uppercase tracking-widest">Register Target</h3>
                                <p className="text-blue-400 font-mono text-[10px]">{pendingNewStore.lat.toFixed(5)}, {pendingNewStore.lng.toFixed(5)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Store Name <span className="text-red-500">*</span></label>
                                <input value={newStoreForm.name} onChange={e => setNewStoreForm({...newStoreForm, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 text-white p-3 rounded font-bold uppercase outline-none focus:border-orange-500" placeholder="e.g. TOKO MAJU" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Phone / WhatsApp</label>
                                <input value={newStoreForm.phone} onChange={e => setNewStoreForm({...newStoreForm, phone: e.target.value})} className="w-full bg-slate-800 border border-slate-600 text-white p-3 rounded font-bold outline-none focus:border-orange-500" placeholder="e.g. 08123456789" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Full Address</label>
                                <textarea value={newStoreForm.address} onChange={e => setNewStoreForm({...newStoreForm, address: e.target.value})} className="w-full bg-slate-800 border border-slate-600 text-white p-3 rounded font-bold outline-none focus:border-orange-500 min-h-[80px]" placeholder="Include street, area..." />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Pricing Tier</label>
                                <select value={newStoreForm.tier} onChange={e => setNewStoreForm({...newStoreForm, tier: e.target.value})} className="w-full bg-slate-800 border border-slate-600 text-white p-3 rounded font-bold uppercase outline-none focus:border-orange-500">
                                    {activeTiers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>
                            
                            <button 
                                onClick={handleSaveNewStore}
                                disabled={isSavingStore}
                                className={`w-full py-4 mt-2 rounded-xl font-black uppercase tracking-[0.2em] transition-all shadow-lg ${isSavingStore ? 'bg-slate-700 text-slate-500' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]'}`}
                            >
                                {isSavingStore ? 'Saving...' : 'Deploy Target'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {salesHeatmapMode && (
                <div className="absolute bottom-[100px] lg:bottom-8 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/95 text-white px-5 py-3 rounded-2xl border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-md flex items-center gap-5 animate-slide-down">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Heatmap</span>
                    <div className="h-5 w-[1px] bg-slate-700"></div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><div className="w-3 h-3 rounded-full bg-[#10b981] border border-white"></div> High</div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><div className="w-3 h-3 rounded-full bg-[#f59e0b] border border-white"></div> Med</div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><div className="w-3 h-3 rounded-full bg-[#f97316] border border-white"></div> Low</div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><div className="w-3 h-3 rounded-full bg-[#ef4444] border border-white"></div> Zero</div>
                </div>
            )}

            <div className="absolute top-[12px] left-[65px] right-[70px] lg:left-[80px] lg:right-auto lg:w-[320px] z-[500] pointer-events-none flex flex-col gap-2">
                <div className="bg-slate-900/95 backdrop-blur-md rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-slate-700 p-1 pointer-events-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0 px-2">
                        <MapPin size={16} className="text-orange-500 shrink-0"/>
                        <select value={selectedRegion} onChange={(e) => { setSelectedRegion(e.target.value); setSelectedCity("All"); }} className="w-full bg-transparent text-sm font-bold text-white outline-none py-1.5 cursor-pointer truncate appearance-none">
                            <option value="All">All Regions</option>
                            {Object.keys(locationTree).sort().map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <button onClick={() => setShowControls(!showControls)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors text-white shrink-0">
                        {showControls ? <X size={18}/> : <Menu size={18}/>}
                    </button>
                </div>

                <div className={`transition-all duration-300 origin-top bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl pointer-events-auto overflow-y-auto custom-scrollbar flex flex-col gap-2 ${showControls ? 'opacity-100 scale-y-100 max-h-[60vh] p-3' : 'opacity-0 scale-y-0 max-h-0 p-0 border-none'}`}>
                    <div className="flex flex-col gap-1 bg-black/40 p-2 rounded-xl border border-slate-700">
                        <button onClick={toggleAllTiers} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${filterTier.length === activeTiers.length ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Show All Tiers</button>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                            {activeTiers.map(tier => (
                                <button key={tier.id} onClick={() => toggleTierFilter(tier.id)} className={`px-2 py-2 rounded-lg text-[10px] font-bold flex justify-center items-center gap-1.5 transition-all ${filterTier.includes(tier.id) ? 'bg-slate-700 text-white shadow-inner border border-slate-500' : 'text-slate-500 hover:bg-slate-800 opacity-60'}`}>
                                    {tier.iconType === 'image' ? <img src={tier.value} className="w-3 h-3 rounded-full"/> : <span>{String(tier.value || '')}</span>}{String(tier.label || '')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 w-full mt-2">
                        {isAdmin && (
                            <>
                                <button onClick={() => setShowTierEngine(!showTierEngine)} className="px-4 py-3 rounded-xl font-bold text-xs flex justify-between items-center bg-slate-800 text-slate-300 border border-slate-600 hover:text-white hover:border-emerald-500 transition-all">
                                    Tier Automation Engine <Settings size={16}/>
                                </button>
                                <button onClick={() => setShowImporter(!showImporter)} className={`px-4 py-3 rounded-xl font-bold text-xs flex justify-between items-center border transition-all ${showImporter ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-slate-800 text-slate-300 border-slate-600 hover:text-white hover:border-blue-500'}`}>
                                    {showImporter ? 'Close Boundary Setup' : 'Map Boundaries Setup'} <Download size={16}/>
                                </button>
                            </>
                        )}
                        
                        <button onClick={() => setShowBorders(!showBorders)} className={`px-4 py-3 rounded-xl font-bold text-xs flex justify-between items-center border transition-all ${showBorders ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            {showBorders ? "Regional Borders: ON" : "Regional Borders"} <Globe size={16}/>
                        </button>
                        
                        {isAdmin && (
                            <>
                                <button onClick={() => { 
                                    const nextState = !showTacticalDash;
                                    setShowTacticalDash(nextState); 
                                    if (nextState) { setSalesHeatmapMode(true); setShowBorders(true); }
                                }} className={`px-4 py-3 rounded-xl font-bold text-xs flex justify-between items-center border transition-all ${showTacticalDash ? 'bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                    {showTacticalDash ? "Tactical Dashboard: ON" : "Tactical Dashboard"} <TrendingUp size={16}/>
                                </button>

                                <button onClick={() => { setSalesHeatmapMode(!salesHeatmapMode); setShowBorders(true); }} className={`px-4 py-3 rounded-xl font-bold text-xs flex justify-between items-center border transition-all ${salesHeatmapMode ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                    {salesHeatmapMode ? "Sales Heatmap: ON" : "Territory Revenue"} <DollarSign size={16}/>
                                </button>
                            </>
                        )}
                        <button onClick={() => setNetworkMode(!networkMode)} className={`px-4 py-3 rounded-xl font-bold text-xs flex justify-between items-center border transition-all ${networkMode ? 'bg-amber-600 text-white border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.3)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            {networkMode ? "Supply Lines: ON" : "View Supply Lines"} <Database size={16}/>
                        </button>
                        <button onClick={() => setConquestMode(!conquestMode)} className={`px-4 py-3 rounded-xl font-bold text-xs flex justify-between items-center border transition-all ${conquestMode ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.3)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            {conquestMode ? "Catchment Footprints: ON" : "Analyze Catchment Areas"} <Folder size={16}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 🚀 DEDICATED ADD STORE BUTTON */}
            {!isAddingMode && !editingStoreId && canAddManualPin && (
                <div className="absolute bottom-[90px] left-[14px] z-[999]">
                    <button 
                        onClick={() => {
                            let center = [-7.6145, 110.7122];
                            if (mapRef.current) {
                                const c = mapRef.current.getCenter();
                                center = [c.lat, c.lng];
                            } else if (userLocation) {
                                center = userLocation;
                            }
                            setDragPinCoords(center);
                            setIsAddingMode(true);
                        }} 
                        className="bg-orange-600/95 backdrop-blur-md text-white border-2 border-orange-400 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_4px_20px_rgba(249,115,22,0.6)] flex items-center gap-2 hover:bg-orange-500 transition-all hover:scale-105 active:scale-95"
                    >
                        <MapPin size={18} className="animate-bounce" /> 
                        Drop New Pin
                    </button>
                </div>
            )}

            {/* 🚀 RESTORED: Territory Border Importer */}
            {showImporter && (
                <BorderImporter 
                    db={db} appId={appId} user={user} 
                    boundaries={boundaries} setBoundaries={setBoundaries} 
                    setIsOpen={setShowImporter} setShowBorders={setShowBorders} 
                    setUploadedFocus={setUploadedFocus} 
                    motorists={motorists || []} 
                />
            )}

           {showTacticalDash && (
                <TacticalDashboard 
                    boundaries={sortedBoundaries} zoneRevenues={zoneRevenues} mapPoints={mapPoints} transactions={transactions}
                    selectedZone={selectedZone} setSelectedZone={setSelectedZone} onClose={() => setShowTacticalDash(false)}
                    salesHeatmapMode={salesHeatmapMode} setSalesHeatmapMode={setSalesHeatmapMode}
                    selectedAreaType={selectedAreaType} setSelectedAreaType={setSelectedAreaType}
                    timeFilter={timeFilter} setTimeFilter={setTimeFilter}
                />
            )}

            {showTierEngine && <TierAutomationEngine db={db} appId={appId} user={user} activeTiers={activeTiers} mapPoints={mapPoints} transactions={transactions} onClose={() => setShowTierEngine(false)} logAudit={logAudit} triggerCapy={triggerCapy} setLocalTierUpdates={setLocalTierUpdates} />}

            <MapContainer ref={mapRef} center={[-7.6145, 110.7122]} zoom={10} style={{ height: '100%', width: '100%' }} className="z-0" zoomControl={false}>
                <ZoomControl position="bottomright" />
                <MapEffectController selectedRegion={selectedRegion} selectedCity={selectedCity} mapPoints={mapPoints} savedHome={savedHome} uploadedFocus={uploadedFocus} selectedZone={selectedZone} />
                
                <LayersControl position="bottomright">
                    <LayersControl.BaseLayer checked name="Dark Matter (Carto)">
                        <TileLayer className="balanced-dark-tile" url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='© CARTO' />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Google Maps (Streets)">
                        <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" attribution='© Google' />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Google Maps (Hybrid)">
                        <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" attribution='© Google' />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Detailed Streets (Esri)">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" attribution='© Esri' />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Light Canvas (Carto)">
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='© CARTO' />
                    </LayersControl.BaseLayer>
                </LayersControl>

                <LocationController userLocation={userLocation} setUserLocation={setUserLocation} isEditing={!!editingStoreId} />
                {userLocation && (
                    <Marker position={userLocation} icon={userLocationIcon} zIndexOffset={9999} interactive={false} />
                )}

                <AdminControls isAdmin={isAdmin} onSetHome={onSetHome}/>
                
                <MapClicker isAddingMode={isAddingMode} editingStoreId={editingStoreId} setDragPinCoords={setDragPinCoords} setSelectedStore={setSelectedStore} setSelectedZone={setSelectedZone} />
                
                {(isAddingMode || editingStoreId) && dragPinCoords && (
                    <DraggableAddMarker position={dragPinCoords} setPosition={setDragPinCoords} />
                )}
                
                {showBorders && sortedBoundaries.map((boundary) => {
                    const geoData = boundary.feature || boundary.geometry;
                    if (!geoData || !geoData.type) return null; 
                    
                    const isHeatmap = salesHeatmapMode;
                    const bndColor = isHeatmap ? getZoneColor(boundary.id) : (boundary.color || '#3b82f6');
                    const bndRev = zoneRevenues[boundary.id] || 0;
                    const isKab = boundary.level === 'Kabupaten' || boundary.level === 'Provinsi';
                    const isSelected = selectedZone?.id === boundary.id;

                    return (
                        <GeoJSON 
                            key={`bnd-${boundary.id}-${isHeatmap ? 'heat' : 'norm'}-${bndRev}-${isSelected}-${timeFilter}`} 
                            data={geoData} 
                            style={{ color: isSelected ? '#38bdf8' : bndColor, weight: isSelected ? 4 : (isKab ? 3 : 2), opacity: 1, fillOpacity: isSelected ? 0.7 : (isHeatmap ? 0.45 : (isKab ? 0.02 : 0.15)), fillColor: bndColor, dashArray: isKab ? null : '5, 5' }}
                            onEachFeature={(f, layer) => {
                                layer.on({
                                    click: (e) => { L.DomEvent.stopPropagation(e); setSelectedStore(null); setSelectedZone(boundary); },
                                    mouseover: (e) => e.target.setStyle({ fillOpacity: isHeatmap ? 0.6 : (isKab ? 0.05 : 0.3), weight: isKab ? 4 : 3 }),
                                    mouseout: (e) => e.target.setStyle({ fillOpacity: isSelected ? 0.7 : (isHeatmap ? 0.45 : (isKab ? 0.02 : 0.15)), weight: isSelected ? 4 : (isKab ? 3 : 2) })
                                });
                                
                                const targetHtml = boundary.targetRev ? `<div style="color: #94a3b8; font-size: 9px; margin-top: 2px;">TARGET: ${formatRupiah(boundary.targetRev)}</div>` : '';
                                const agentHtml = boundary.assignedAgent ? `<div style="color: #c084fc; font-size: 9px; margin-top: 2px; font-weight: bold;">👤 AGENT ASSIGNED</div>` : '';

                                const ttContent = `
                                    <div style="background-color: rgba(15, 23, 42, 0.9); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.2); padding: 8px 14px; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); text-align: center; line-height: 1.2; white-space: nowrap;">
                                        <div style="color: #cbd5e1; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">${boundary.name || "Region"}</div>
                                        ${isHeatmap ? `<div style="color: #fbbf24; font-size: 15px; font-weight: 900; font-family: monospace;">${formatRupiah(bndRev)}</div>` : ''}
                                        ${isHeatmap ? targetHtml : ''}
                                        ${agentHtml}
                                    </div>`;
                                layer.bindTooltip(ttContent, { permanent: isHeatmap || isSelected, direction: "center", className: "custom-leaflet-tooltip" });
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
                    return <Circle key={`circle-${store.id}`} center={[store.latitude, store.longitude]} radius={finalRadius} className="venn-heatmap-circle" pathOptions={{ color: 'transparent', fillColor: '#f97316', fillOpacity: 0.35 }}/>;
                })}

                {mapPoints.map(store => (
                    <MarkerWithZoom 
                        key={store.id} 
                        store={store} 
                        activeTiers={activeTiers} 
                        conquestMode={conquestMode} 
                        handlePinClick={handlePinClick} 
                        isActive={activeStore && activeStore.id === store.id}
                    />
                ))}

                {/* 🚀 LIVE AGENT SNAIL FOOTPRINT & RADAR (WITH SPIDERFY ENGINE) 🚀 */}
                {(() => {
                    const safeMotorists = motorists || [];
                    const locationGroups = {};
                    
                    // 1. Group agents who are standing in the exact same spot (within ~11 meters)
                    safeMotorists.forEach(agent => {
                        if (!agent.currentLocation || !agent.currentLocation.lat) return;
                        // Use a fixed decimal precision to cluster nearby agents
                        const locKey = `${agent.currentLocation.lat.toFixed(4)}_${agent.currentLocation.lng.toFixed(4)}`;
                        if (!locationGroups[locKey]) locationGroups[locKey] = [];
                        locationGroups[locKey].push(agent);
                    });

                    return safeMotorists.map(agent => {
                        if (!agent.currentLocation || !agent.currentLocation.lat) return null;
                        
                        const locKey = `${agent.currentLocation.lat.toFixed(4)}_${agent.currentLocation.lng.toFixed(4)}`;
                        const group = locationGroups[locKey];
                        const indexInGroup = group.findIndex(a => a.id === agent.id);
                        const totalInGroup = group.length;

                        // 2. Apply a Spiderfy Mathematical Offset if multiple agents share the same space
                        let displayLat = agent.currentLocation.lat;
                        let displayLng = agent.currentLocation.lng;

                        if (totalInGroup > 1) {
                            const offsetRadius = 0.00015; // Pushes them out ~15 meters on the map
                            const angle = (indexInGroup / totalInGroup) * (Math.PI * 2);
                            displayLat += Math.cos(angle) * offsetRadius;
                            displayLng += Math.sin(angle) * offsetRadius;
                        }

                        // 3. Create the pulsing Agent Avatar
                        const agentIcon = L.divIcon({
                            className: 'agent-live-icon',
                            html: `<div style="position:relative; z-index: 20000;">
                                       <div style="background-color: #3b82f6; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); display: flex; align-items: center; justify-content: center; font-size: 18px; animation: pulse 2s infinite;">👤</div>
                                       <div style="position: absolute; bottom: -24px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.2); color: white; font-size: 10px; padding: 2px 8px; border-radius: 6px; font-weight: 900; white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">${agent.name?.split(' ')[0] || 'Agent'}</div>
                                   </div>`,
                            iconSize: [34, 34],
                            iconAnchor: [17, 17]
                        });

                        return (
                            <React.Fragment key={`tracker-${agent.id}`}>
                                <Marker position={[displayLat, displayLng]} icon={agentIcon} zIndexOffset={20000} />
                            </React.Fragment>
                        );
                    });
                })()}
            </MapContainer>

            {activeStore && (
                <StoreBottomSheet 
                    store={activeStore} mapPoints={mapPoints} transactions={transactions} 
                    inventory={inventory} db={db} appId={appId} user={user} 
                    isAdmin={isAdmin} setSelectedStore={setSelectedStore} 
                    liveScaleOverride={liveScaleOverride} setLiveScaleOverride={setLiveScaleOverride}
                    setEditingStoreId={setEditingStoreId} setDragPinCoords={setDragPinCoords} canOverrideGps={canAddManualPin} 
                    activeTiers={activeTiers} setLocalTierUpdates={setLocalTierUpdates}
                />
            )}
            
            {!showTacticalDash && <ZoneHUD zone={selectedZone} mapPoints={mapPoints} setSelectedZone={setSelectedZone} />}
            
            <style>{`
                .leaflet-tooltip-pane { z-index: 9999 !important; pointer-events: none !important; }
                .leaflet-tooltip.custom-leaflet-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
                .leaflet-tooltip.custom-leaflet-tooltip::before, .leaflet-tooltip.custom-leaflet-tooltip::after { display: none !important; }
                .custom-icon { z-index: 500 !important; }
                .custom-icon:hover { z-index: 10000 !important; }
                
                .crt-overlay {
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
                    background-size: 100% 4px; pointer-events: none; position: absolute; inset: 0; z-index: 50; opacity: 0.3;
                }

                .balanced-dark-tile { filter: brightness(1.2); }
                .animated-supply-line { stroke-dasharray: 8, 12; animation: flow 30s linear infinite; }
                
                @keyframes flow { to { stroke-dashoffset: -1000; } }
                .venn-heatmap-circle { mix-blend-mode: screen; }
                
                @keyframes slide-down { from { transform: translate(-50%, -100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                .animate-slide-down { animation: slide-down 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                
                @keyframes slide-in-left { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .animate-slide-in-left { animation: slide-in-left 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                
                @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(3.5); opacity: 0; } }

                .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 2px; }
            `}</style>
        </div>
    );
};

export default MapMissionControl;