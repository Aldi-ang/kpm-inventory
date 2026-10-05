import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, GeoJSON, Tooltip as LeafletTooltip, useMap, useMapEvents, LayersControl, ZoomControl } from 'react-leaflet';

import { 
    MapPin, Store, Calendar, X, Phone, ChevronRight,
    Globe, Database, Tag,
    MinusCircle, Maximize2, Search, Trash2, Download,
    Save, AlertCircle, Upload, Pencil, Folder, TrendingUp, ShieldAlert,
    Navigation, LocateFixed, CheckCircle, Settings, ArrowUpCircle, ArrowDownCircle, Activity,
    BarChart3, Layers, Flame, Route, CircleDot, Home, MoreHorizontal, Crown
} from 'lucide-react';
import { areaOf, rankAreas, monthByShop, rpShort, txTime } from './utils/mapAreas';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; 
import { doc, collection, getDocs, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { commitInChunks, convertToBks, formatRupiah, storeKey, findShop } from './utils/helpers';
import { loadBorderCache, saveBorderCache, clearBorderCache } from './utils/borderCache';
import { revenueOf, debtCredit } from './utils/revenueRule';
import { confirmAction, promptAction } from './components/ConfirmGate.jsx';
import { notify } from './components/Toast.jsx';
import { ExpeditionLayer } from './components/Expedition.jsx';
import { expedition, visibleTeam } from './utils/expedition';
import { hasClearance } from './config/permissions';
import MarkerClusterGroup from 'react-leaflet-cluster'; // 🚀 INJECTED SUPERCLUSTER ENGINE

// 🚀 GOOGLE MAPS STYLE: THE SMART AVATAR ENGINE
try { delete L.Icon.Default.prototype._getIconUrl; } catch(e) { /* leaflet internals differ by build; the mergeOptions below is what matters */ }
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/* his tier set B, the rank medals (2026-10-05 "rank medal is cool"), with his Mythic A, the royal crown ("A is good") - asked as
   "we need set of of new tier symbol as well to better show their exclusiveness": each level a different game object on a
   32 x 32 grid, the rarer the bigger on the map (Unranked 22 px -> Mythic 32 px). A look = [colour, the 16 x 16 picture
   inside it, map size, draw(colour, picture)]. Drawn first: https://claude.ai/artifact/J7Y5RdwwUhtRPas3KP8Fti (SETS.B, MY.A) */
const MD = '#14110e';
const inner = (p, c, x, y, w) => `<svg x="${x}" y="${y}" width="${w}" height="${w}" viewBox="0 0 16 16" style="fill:${c};color:${c}">${p}</svg>`;
const LEVEL_LOOKS = [
    ['#E4B04A', '', 32, (c) => `<path d="M3 10.5l6.8 5.3L16 4.5l6.2 11.3 6.8-5.3-3 15.5H6z" fill="${MD}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M6 26h20" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><circle cx="3" cy="10.5" r="2" fill="${c}"/><circle cx="16" cy="4.5" r="2.2" fill="${c}"/><circle cx="29" cy="10.5" r="2" fill="${c}"/><circle cx="10" cy="21" r="1.6" fill="${c}"/><circle cx="16" cy="20.5" r="2" fill="${c}"/><circle cx="22" cy="21" r="1.6" fill="${c}"/>`],   // Mythic: the royal crown
    ['#C4551E', '<path d="M8 1c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-5 0-7z"/>', 28, (c, p) => `<path d="M8.5 4h15l6 8L16 30 2.5 12z" fill="${MD}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M2.5 12h27M11.5 4l-3 8L16 30l7.5-18-3-8" fill="none" stroke="${c}" stroke-opacity=".5" stroke-width="1.2" stroke-linejoin="round"/>${inner(p, c, 11, 10, 10)}`],   // Epic: an ember gem with its flame
    ['#F0E2BC', '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M3 3l10 10M13 3L3 13M1.5 10.5l4 4M10.5 14.5l4-4"/>', 26, (c, p) => `<path d="M16 2l11 4v9c0 8-5 12-11 15C10 27 5 23 5 15V6z" fill="${MD}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M16 5.6l7.8 2.9v6.6c0 5.8-3.4 9-7.8 11.4" fill="none" stroke="${c}" stroke-opacity=".45"/>${inner(p, c, 9, 8, 14)}`],   // Grandmaster: a silver kite shield with crossed swords
    ['#A0703C', '<path d="M8 1l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V3z"/>', 24, (c, p) => `<path d="M11 20l-3 10 4.5-2.5 3 3.5 1-10M21 20l3 10-4.5-2.5-3 3.5-1-10" fill="${MD}" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="16" cy="13" r="10" fill="${MD}" stroke="${c}" stroke-width="2"/><circle cx="16" cy="13" r="7" fill="none" stroke="${c}" stroke-opacity=".5"/>${inner(p, c, 10, 7, 12)}`],   // Bronze: a medal on a ribbon
];
/* the last level (Unranked) = a sprout, "a new shop that can still grow" - his pick 2026-10-05 ("unranked is sprout"); a light
   stone grey on a faint ring so it reads on the dark map, never green (palette law) */
const LEVEL_NONE = ['#B8B0A4', '<path d="M8 15V8.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 9.2C8 5.6 5.6 3.4 2 3.4c0 3.6 2.4 5.8 6 5.8z"/><path d="M8 8.4c0-3.1 2.3-5.1 6-5.1 0 3.3-2.3 5.1-6 5.1z"/>', 22, (c, p) => `<circle cx="16" cy="16" r="9" fill="${MD}" stroke="${c}" stroke-opacity=".55" stroke-width="1.3"/>${inner(p, c, 9.5, 9.5, 13)}`];
const levelLook = (tierId, tiers) => { const i = tiers.findIndex((t) => t.id === tierId); return i < 0 || i === tiers.length - 1 ? LEVEL_NONE : LEVEL_LOOKS[Math.min(i, 3)]; };
/* one symbol for the pin, the chips, the card; `dot` = late (red) / soon (gold) on the corner, `big` = the pressed pin (a cream
   ring), `fit` = one size for a row of chips */
/* a wholesale hub (his pick C, 2026-10-05 "wholesale hub is C good"): its level symbol, bigger, under a warehouse roof, with
   the word HUB under it - the object and the word */
const HUB_ROOF = '<svg class="roof" viewBox="0 0 44 13" preserveAspectRatio="none" aria-hidden="true"><path d="M2 12L22 2l20 10"/></svg>';
const levelBadge = (look, { dot = '', big = false, hub = false, fit = 0 } = {}) => {
    const px = fit || Math.round(look[2] * (big ? 1.3 : 1) + (hub ? 6 : 0));
    return `<i class="ms-mk${big ? ' big' : ''}${hub ? ' hub' : ''}" style="--c:${look[0]};width:${px}px;height:${px}px">${hub ? HUB_ROOF : ''}<svg class="lv" viewBox="0 0 32 32" aria-hidden="true">${look[3](look[0], look[1])}</svg>${dot ? `<i class="st ${dot}"></i>` : ''}${hub ? '<b class="word">HUB</b>' : ''}</i>`;
};
const Badge = ({ look, ...o }) => <span className="contents" dangerouslySetInnerHTML={{ __html: levelBadge(look, o) }} />;

/* the pin: the symbol in a hit box at least 32 px and 10 px wider than it (the rarer, the bigger); a hub's roof and word sit
   outside the box and stay pressable (they are children of the marker) */
const getIcon = (store, activeTiers, isActive = false) => {
    const dot = store.status === 'overdue' ? 'late' : store.status === 'soon' ? 'soon' : '';
    const look = levelLook(store.tier, activeTiers), hub = store.storeType === 'Wholesaler';
    const size = Math.max(32, Math.round(look[2] * (isActive ? 1.3 : 1) + (hub ? 6 : 0)) + 10);
    return L.divIcon({ className: 'custom-icon ms-pin', html: levelBadge(look, { dot, big: isActive, hub }), iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
};

/* you are here - Journey's ink dot (palette law: it was blue) */
const userLocationIcon = L.divIcon({
    className: 'user-location-icon',
    html: `
        <div style="position: relative; display: flex; justify-content: center; align-items: center; width: 24px; height: 24px;">
            <div style="position: absolute; width: 100%; height: 100%; background-color: #E8E4DE; border-radius: 50%; opacity: 0.35; animation: pulse-ring 2s infinite;"></div>
            <div style="width: 14px; height: 14px; background-color: #E8E4DE; border: 2px solid #0A0908; border-radius: 50%; z-index: 10; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

/* a press plays the key's act once (Journey's helper: a touch never hovers, so the act rides a class for 480 ms) */
const act = (e) => { const b = e.currentTarget; b.classList.remove('act'); void b.offsetWidth; b.classList.add('act'); setTimeout(() => b.classList.remove('act'), 480); };

/* a cluster of shops: the panel's own plate, a gold edge, the count in ink (it was a blue glow) */
/* a group of shops (his pick B, 2026-10-05 "B is better"): a little market town - two shop houses, the count under them; the
   roof line takes the colour of the best level inside (each pin carries lvRank / lvColor, see MarkerWithZoom) */
const createCustomClusterIcon = (cluster) => {
    const best = cluster.getAllChildMarkers().reduce((b, m) => ((m.options.lvRank ?? 99) < (b.options.lvRank ?? 99) ? m : b));
    return L.divIcon({ html: `<div class="ms-town" style="--c:${best.options.lvColor || '#F0E2BC'}"><svg viewBox="0 0 42 30" aria-hidden="true"><path d="M3 28V14l9-8 9 8v14z"/><path d="M21 28V11l9-8 9 8v17z"/><rect x="9" y="20" width="6" height="8" rx="1"/><rect x="27" y="18" width="6" height="10" rx="1"/></svg><b>${cluster.getChildCount()}</b></div>`,
        className: 'custom-cluster-icon', iconSize: [48, 52], iconAnchor: [24, 26] });
};

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
            } catch(e) { /* a zone with unusable geometry just does not get framed; the map stays where it is */ }
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

/* `trigger`: the Locate key lives in the PC toolbar and the phone dock now, outside the map - each press bumps it */
const LocationController = ({ userLocation, setUserLocation, isEditing, trigger }) => {
    const map = useMap();
    const watchId = useRef(null);
    const isEditingRef = useRef(isEditing);

    useEffect(() => {
        isEditingRef.current = isEditing;
    }, [isEditing]);

    const handleLocateClick = () => {
        // 🚀 THE FLARE GUN: Broadcasts the agent's live location to the global map 
        window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));

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

    useEffect(() => { if (trigger) handleLocateClick(); }, [trigger]);   // eslint-disable-line react-hooks/exhaustive-deps
    return null;
};

/* the empty map = the picked base map's own colour, never Leaflet's light #ddd under a dark map: zooming or flying on the
   dark default lit up to 15.7 % of the map until the tiles arrived (his "yes please fix the map flash as well", 2026-10-04,
   after Journey's aa87cd1). Measured settled colours; the light maps keep #ddd */
const MAP_GROUND = { 'Dark Canvas (Esri)': '#4F4F51', 'Google Maps (Hybrid)': '#545450' };
const MapGround = () => {
    const map = useMapEvents({ baselayerchange: (e) => { map.getContainer().style.background = MAP_GROUND[e.name] || '#ddd'; } });
    return null;
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
        /* the pin being placed: a gold-edged plate with a drawn pin (it was an orange emoji ball that bounced) */
        html: `<div class="ms-drop"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg></div>`,
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
                <div className="ms-tip">Drag me</div>
            </LeafletTooltip>
        </Marker>
    );
};

const MarkerWithZoom = ({ store, activeTiers, conquestMode, handlePinClick, isActive }) => {
    const map = useMap();
    const smartIcon = getIcon(store, activeTiers, isActive);
    const rank = activeTiers.findIndex((t) => t.id === store.tier);

    return (
        <Marker
            position={[store.latitude, store.longitude]}
            icon={smartIcon}
            eventHandlers={{ click: () => { handlePinClick(store, map); } }}
            riseOnHover={true}
            zIndexOffset={isActive ? 1000 : store.storeType === 'Wholesaler' ? 500 : 0}
            lvRank={rank < 0 ? 99 : rank} lvColor={levelLook(store.tier, activeTiers)[0]}
        >
            {!conquestMode && (
                <LeafletTooltip direction="top" offset={[0, -14]} opacity={1} className="custom-leaflet-tooltip hidden lg:block">
                    <div className="ms-tip">{String(store.name || 'Unknown')}{store.storeType === 'Wholesaler' && <small>Wholesale hub</small>}</div>
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
                    <ShieldAlert size={18} />
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
                    <button onClick={() => setIsMinimized(true)} className="text-slate-400 hover:text-white transition-colors"><MinusCircle size={18}/></button>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X size={18}/></button>
                </div>
                <div className="flex items-center gap-3 mb-3">
                    <ShieldAlert size={24} className="text-emerald-500"/>
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
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Global Revenue</p>
                            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="bg-slate-800 text-[11px] text-emerald-400 font-bold px-1.5 py-0.5 rounded outline-none cursor-pointer border border-emerald-500/30 hover:border-emerald-500 transition-colors">
                                <option value="Today">Today</option><option value="7 Days">7 Days</option><option value="This Month">This Month</option><option value="This Year">This Year</option><option value="All-Time">All-Time</option>
                            </select>
                        </div>
                        <p className="text-2xl font-black text-emerald-400">{formatRupiah(globalRevenue)}</p>
                    </div>
                    <div className="text-right"><p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Active Sectors</p><p className="text-xl font-bold text-white">{rankedSectors.length}</p></div>
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
                                    <span className="text-[10px] font-bold text-slate-400 w-4">{index + 1}.</span>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
                                            {sector.name} {sector.assignedAgent && <span className="text-purple-400 ml-1" title="Agent Assigned">👤</span>}
                                        </span>
                                        <span className="text-[11px] text-slate-400 uppercase">{sector.level}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-black block ${textColor}`}>{formatRupiah(rev)}</span>
                                    {hasTarget && <span className="text-[11px] text-slate-400 uppercase tracking-widest block">/ {formatRupiah(target)}</span>}
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
                                <p className="text-[11px] text-emerald-500 uppercase font-bold tracking-widest mb-0.5">Target Locked</p>
                                <h3 className="text-base font-black text-white uppercase tracking-wider truncate leading-tight">{selectedZone.name}</h3>
                            </div>
                            <div className="text-right shrink-0"><p className="text-base font-black text-emerald-400 leading-tight">{formatRupiah(activeZoneRev)}</p></div>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-black/50 p-2 rounded-lg border border-slate-700 flex justify-between items-center"><span className="text-[11px] text-slate-400 uppercase tracking-widest">Assets</span><span className="text-xs font-bold text-white">{activeZoneStores.length}</span></div>
                            <div className={`flex-[1.2] p-2 rounded-lg border flex justify-between items-center ${activeOverdue > 0 ? 'bg-red-900/20 border-red-500/50' : 'bg-black/50 border-slate-700'}`}>
                                <span className={`text-[11px] uppercase tracking-widest ${activeOverdue > 0 ? 'text-red-400' : 'text-slate-400'}`}>Threat</span>
                                <span className={`font-bold text-[11px] ${activeOverdue > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{activeOverdue > 0 ? `${activeOverdue} OVERDUE` : 'CLEAR'}</span>
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

// 🚀 UPGRADED BORDER IMPORTER & SECTOR SETTINGS (Manual Folder System)
const BorderImporter = ({ db, appId, user, boundaries, setBoundaries, setIsOpen, setShowBorders, setUploadedFocus, motorists = [], triggerCapy }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState("");
    
    const [expandedNodes, setExpandedNodes] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", color: "#3b82f6", targetRev: "", assignedAgent: "none", folderName: "" });

    const [uploadFolder, setUploadFolder] = useState("New Folder"); 
    const [customFolders, setCustomFolders] = useState([]); // 🚀 NEW: Tracks empty folders

    const fileInputRef = useRef(null);
    const palette = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#34d399", "#2dd4bf", "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa", "#c084fc", "#e879f9", "#f472b6", "#fb7185"];
    const userId = user?.uid || user?.id || 'default';

    const safeBoundaries = Array.isArray(boundaries) ? boundaries.filter(b => b && typeof b === 'object' && b.id) : [];

    // 🚀 MANUAL FOLDER GROUPING ENGINE
    const groupedFolders = useMemo(() => {
        const groups = {};
        safeBoundaries.forEach(b => {
            const f = b.folderName || b.level || 'Uncategorized';
            if (!groups[f]) groups[f] = [];
            groups[f].push(b);
        });
        // Ensure custom empty folders appear
        customFolders.forEach(f => { if (!groups[f]) groups[f] = []; });
        return groups;
    }, [safeBoundaries, customFolders]);

    const existingFolders = Object.keys(groupedFolders).sort();

    // 🚀 FAST UI CONTROLS
    const handleCreateFolder = async () => {
        const name = await promptAction("Enter new folder name:");
        if (name && name.trim()) {
            setCustomFolders(prev => Array.from(new Set([...prev, name.trim()])));
            setExpandedNodes(prev => ({ ...prev, [name.trim()]: true }));
        }
    };

    const triggerFolderUpload = (folderName) => {
        setUploadFolder(folderName);
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFastMove = async (id, newFolder) => {
        if (newFolder === "CREATE_NEW") {
            const name = await promptAction("Enter new folder name:");
            if (!name || !name.trim()) return;
            newFolder = name.trim();
            setCustomFolders(prev => Array.from(new Set([...prev, newFolder])));
            setExpandedNodes(prev => ({ ...prev, [newFolder]: true }));
        }
        
        const targetBoundary = safeBoundaries.find(b => b.id === id);
        if (targetBoundary) {
            const updatedBoundary = { ...targetBoundary, folderName: newFolder };
            const updatedList = safeBoundaries.map(b => b.id === id ? updatedBoundary : b);
            setBoundaries(updatedList);
            saveBorderCache(appId, updatedList);
            await saveBoundaryToFirebase(updatedBoundary);
        }
    };

    const toggleNode = (nodeId) => {
        setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    const saveBoundaryToFirebase = async (boundary) => {
        // 🚀 BULLETPROOF FIX: Safely derive userId locally to prevent ReferenceErrors
        const currentUserId = user?.uid || user?.id || 'default';
        if (db && appId && currentUserId) {
            try { 
                const { geometry, feature, ...rawBoundaryToSave } = boundary;
                
                // 🚀 Strip undefined fields to prevent Firestore fatal silent crashes
                const boundaryToSave = Object.fromEntries(
                    Object.entries(rawBoundaryToSave).filter(([_, v]) => v !== undefined)
                );
                
                boundaryToSave.geometryString = JSON.stringify(geometry || null); 
                await setDoc(doc(db, `artifacts/${appId}/users/${currentUserId}/mapSettings`, `bnd_${boundary.id}`), boundaryToSave); 
            } catch(e) {
                console.error("Firebase Save Error:", e);
            }
        }
    };

    // 🚀 NEW: Bulk-save many boundaries at once (e.g. a whole KML/GeoJSON upload),
    // using the same safe chunked-and-paced commitInChunks helper used elsewhere in
    // the app, instead of one individual setDoc() per boundary in a tight loop.
    const saveBoundariesInChunks = async (boundaries) => {
        const currentUserId = user?.uid || user?.id || 'default';
        if (!db || !appId || !currentUserId || boundaries.length === 0) return;
        const operations = boundaries.map(boundary => {
            const { geometry, feature, ...rawBoundaryToSave } = boundary;
            const boundaryToSave = Object.fromEntries(
                Object.entries(rawBoundaryToSave).filter(([_, v]) => v !== undefined)
            );
            boundaryToSave.geometryString = JSON.stringify(geometry || null);
            return {
                type: 'set',
                ref: doc(db, `artifacts/${appId}/users/${currentUserId}/mapSettings`, `bnd_${boundary.id}`),
                data: boundaryToSave
            };
        });
        await commitInChunks(db, writeBatch, operations);
    };

    const deleteBoundaryFromFirebase = async (id) => {
        if (db && appId && userId) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/mapSettings`, `bnd_${id}`));
            } catch (e) {
                console.error("Failed to delete boundary:", e);
                notify("Database error: Could not delete this boundary. Only the Company Owner can edit map boundaries.");
            }
        }
    };

    const handleWipeAll = async () => {
        if(await confirmAction("WARNING: This will completely delete ALL active borders from your map. Continue?")) {
            // 🚀 FIX: Chunked/paced commitInChunks instead of one deleteBoundaryFromFirebase
            // (single deleteDoc) await per border in a tight loop.
            try {
                const operations = safeBoundaries.map(b => ({
                    type: 'delete',
                    ref: doc(db, `artifacts/${appId}/users/${userId}/mapSettings`, `bnd_${b.id}`)
                }));
                await commitInChunks(db, writeBatch, operations);
            } catch (e) {
                console.error("Failed to wipe all boundaries:", e);
                notify("Database error: Could not delete all borders. Only the Company Owner can edit map boundaries.");
            }
            setBoundaries([]);
            clearBorderCache(appId);
        }
    };

    const handleDeleteBorder = async (idToRemove) => {
        if(await confirmAction("Remove this specific border?")) {
            const updated = safeBoundaries.filter(b => b.id !== idToRemove);
            setBoundaries(updated);
            saveBorderCache(appId, updated);
            await deleteBoundaryFromFirebase(idToRemove);
        }
    };

    const handleSaveBoundary = async (id) => {
        try {
            const targetBoundary = safeBoundaries.find(b => b.id === id);
            if (targetBoundary) {
                const newFolderName = String(editForm.folderName || '').trim() || targetBoundary.folderName || targetBoundary.level || 'Uncategorized';
                
                const updatedBoundary = { 
                    ...targetBoundary, 
                    name: String(editForm.name || '').trim() || targetBoundary.name,
                    color: editForm.color || targetBoundary.color,
                    targetRev: editForm.targetRev ? Number(editForm.targetRev) : null,
                    assignedAgent: editForm.assignedAgent !== 'none' ? editForm.assignedAgent : null,
                    folderName: newFolderName
                };

                if (typeof setCustomFolders === 'function') setCustomFolders(prev => Array.from(new Set([...prev, newFolderName])));
                if (typeof setExpandedNodes === 'function') setExpandedNodes(prev => ({ ...prev, [newFolderName]: true }));

                const updatedList = safeBoundaries.map(b => b.id === id ? updatedBoundary : b);
                setBoundaries(updatedList);
                
                // 🛡️ SHOCK ABSORBER 2.0: IndexedDB cache — no localStorage quota, non-fatal on failure
                saveBorderCache(appId, updatedList);

                // 🚀 THE ACTUAL SAVE. Without this the panel only ever wrote the local cache,
                // and the next page load overwrote that cache from the un-updated server copy —
                // so every name / colour / targetRev / assignedAgent edit was silently lost.
                // Same call toggleVisibility already makes a few lines below.
                await saveBoundaryToFirebase(updatedBoundary);
                
                // 📻 RADIO DISPATCH: Broadcast the signal directly to Capy!
                window.dispatchEvent(new CustomEvent('CAPY_COMMS', { detail: "Sector Configuration Saved! 🚀" }));

                // 🚀 INSTANT UX: Close ONLY the inline sector editor. Keep the Territory Manager open!
                if (typeof setEditingId === 'function') setEditingId(null);
            }
        } catch (error) {
            console.error("Save Boundary Crash:", error);
            notify("Sector settings could not be saved to the database. Your change is on this device only — reload and try again.");
        }
    };

    const toggleVisibility = async (id, currentHidden) => {
        const updatedList = safeBoundaries.map(b => b.id === id ? { ...b, isHidden: !currentHidden } : b);
        setBoundaries(updatedList);
        saveBorderCache(appId, updatedList);
        const target = updatedList.find(b => b.id === id);
        if (target) await saveBoundaryToFirebase(target);
    };

    // Helper to toggle visibility for an entire folder
    const toggleFolderVisibility = async (folderName, hide) => {
        const updatedList = safeBoundaries.map(b => {
            const f = b.folderName || b.level || 'Uncategorized';
            return f === folderName ? { ...b, isHidden: hide } : b;
        });
        setBoundaries(updatedList);
        saveBorderCache(appId, updatedList);

        safeBoundaries.forEach(b => {
            const f = b.folderName || b.level || 'Uncategorized';
            if (f === folderName && !!b.isHidden !== hide) {
                const target = updatedList.find(u => u.id === b.id);
                if (target) saveBoundaryToFirebase(target);
            }
        });
    };

    // 🚀 NEW: BULK FOLDER RENAME ENGINE
    const handleRenameFolder = async (oldName) => {
        const newName = await promptAction(`BATCH RENAME / MOVE\n\nEnter a new folder name. All items currently inside "${oldName}" will be moved to this new folder:`, oldName);
        if (!newName || newName.trim() === "" || newName === oldName) return;
        
        setIsLoading(true);
        const targetName = newName.trim();
        
        const updatedList = safeBoundaries.map(b => {
            const f = b.folderName || b.level || 'Uncategorized';
            return f === oldName ? { ...b, folderName: targetName } : b;
        });

        setBoundaries(updatedList);
        saveBorderCache(appId, updatedList);

        // 🚀 FIX: Chunked/paced commitInChunks (via saveBoundariesInChunks) instead
        // of one saveBoundaryToFirebase() (single setDoc) await per boundary in a
        // tight loop.
        try {
            const changedIds = new Set(
                safeBoundaries
                    .filter(b => (b.folderName || b.level || 'Uncategorized') === oldName)
                    .map(b => b.id)
            );
            const targets = updatedList.filter(b => changedIds.has(b.id));
            await saveBoundariesInChunks(targets);
        } catch (e) {
            console.error("Failed to rename folder:", e);
        }

        setIsLoading(false);
        // Ensure new folder is open
        setExpandedNodes(prev => ({ ...prev, [oldName]: false, [targetName]: true }));
    };

    // 🚀 NEW: BULK FOLDER DELETE ENGINE
    const handleDeleteFolder = async (folderName) => {
        const bordersInside = safeBoundaries.filter(b => (b.folderName || b.level || 'Uncategorized') === folderName);
        if (!await confirmAction(`⚠️ DANGER: Are you sure you want to PERMANENTLY DELETE the folder "${folderName}" and all ${bordersInside.length} map borders inside it?`)) return;
        
        setIsLoading(true);
        
        const updatedList = safeBoundaries.filter(b => (b.folderName || b.level || 'Uncategorized') !== folderName);
        setBoundaries(updatedList);
        saveBorderCache(appId, updatedList);

        // 🚀 FIX: Chunked/paced commitInChunks instead of one deleteBoundaryFromFirebase
        // (single deleteDoc) await per border in a tight loop.
        try {
            const operations = bordersInside.map(b => ({
                type: 'delete',
                ref: doc(db, `artifacts/${appId}/users/${userId}/mapSettings`, `bnd_${b.id}`)
            }));
            await commitInChunks(db, writeBatch, operations);
        } catch (e) {
            console.error("Failed to delete folder:", e);
            notify("Database error: Could not delete this folder. Only the Company Owner can edit map boundaries.");
        }

        setIsLoading(false);
    };

    const extractNameAndLevel = (props, index) => {
        let name = `Imported Region ${index}`;
        let level = "Kecamatan"; 
        
        // Checking for Desa/Kelurahan
        if (props.DESA || props.KELURAHAN || props.NAME_4 || props.nm_desa || props.WADMKD || props.NAMOBJ || props.desa || props.nama_desa || props.nama_kelurahan) { 
            name = `${props.DESA || props.KELURAHAN || props.NAME_4 || props.nm_desa || props.WADMKD || props.NAMOBJ || props.desa || props.nama_desa || props.nama_kelurahan}`; 
            level = "Desa"; 
        } 
        // Checking for Kecamatan
        else if (props.KECAMATAN || props.NAME_3 || props.nm_kecamatan || props.nm_kec || props.WADMKC || props.kecamatan || props.nama_kecamatan) { 
            name = `${props.KECAMATAN || props.NAME_3 || props.nm_kecamatan || props.nm_kec || props.WADMKC || props.kecamatan || props.nama_kecamatan}`; 
            level = "Kecamatan"; 
        } 
        // Checking for Kabupaten/Kota
        else if (props.KABUPATEN || props.KOTA || props.NAME_2 || props.nm_dati2 || props.WADMKK || props.kabupaten || props.nama_kabupaten || props.nama_kota) {
            name = `${props.KABUPATEN || props.KOTA || props.NAME_2 || props.nm_dati2 || props.WADMKK || props.kabupaten || props.nama_kabupaten || props.nama_kota}`;
            level = "Kabupaten";
            // 🏙️ KOTA DISAMBIGUATION: GADM-style files name BOTH Kabupaten Magelang and
            // Kota Magelang just "Magelang" (only TYPE_2/ENGTYPE_2 differ). Prefix "Kota"
            // so borders/folders/geo-detection can tell them apart.
            const t2 = String(props.TYPE_2 || props.ENGTYPE_2 || '').toLowerCase();
            const isKota = !!(props.KOTA || props.nama_kota) || t2.includes('kota') || t2.includes('city');
            if (isKota && !String(name).toLowerCase().startsWith('kota')) name = `Kota ${name}`;
        }
        // Checking for Provinsi
        else if (props.PROVINSI || props.NAME_1 || props.nm_propinsi || props.WADMPR || props.provinsi || props.nama_provinsi) { 
            name = `${props.PROVINSI || props.NAME_1 || props.nm_propinsi || props.WADMPR || props.provinsi || props.nama_provinsi}`; 
            level = "Provinsi"; 
        } 
        // Fallbacks
        else if (props.name) { name = props.name; } 
        else if (props.nama_wilayah) { name = props.nama_wilayah; }
        else { 
            const fallback = Object.values(props).find(val => typeof val === 'string' && val.length > 2 && isNaN(val)); 
            if (fallback) name = fallback; 
        }
        return { name, level };
    };

    const handleFileUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        
        const targetFolder = uploadFolder.trim() || "Uncategorized";

        const reader = new FileReader();
        setProgress("Parsing..."); setIsLoading(true); setError(null);
        reader.onload = async (event) => {
            try {
                const geojson = JSON.parse(event.target.result);
                let features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
                let newBoundaries = [...safeBoundaries];
                let firstCoord = null;
                // 🚀 FIX: Collect boundaries to save here, instead of writing to Firestore
                // one at a time inside the loop (a KML with 80-100+ shapes meant 80-100
                // separate individual writes fired back-to-back - the exact pattern that
                // exhausts Firestore's write stream, especially on slow connections).
                const boundariesToSave = [];
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
                            } catch(err) { /* an odd geometry shape leaves firstCoord null; the label just is not placed */ }
                        }
                        if (!newBoundaries.find(b => b.name === name && (b.folderName || b.level) === targetFolder)) {
                            const newBoundary = { 
                                id: `BND_CUSTOM_${Date.now()}_${idx}`, 
                                name: name, 
                                fullName: `File: ${file.name}`, 
                                geometry: feature.geometry, 
                                feature: feature, 
                                color: color, 
                                level: level, 
                                folderName: targetFolder, 
                                isHidden: false 
                            };
                            newBoundaries.push(newBoundary);
                            boundariesToSave.push(newBoundary);
                        }
                    }
                }
                await saveBoundariesInChunks(boundariesToSave);
                setBoundaries(newBoundaries); saveBorderCache(appId, newBoundaries); setShowBorders(true);
                if (firstCoord && setUploadedFocus) setUploadedFocus(firstCoord);
                setProgress("Success!"); setTimeout(() => setProgress(""), 3000);
                setExpandedNodes(prev => ({ ...prev, [targetFolder]: true }));
            } catch (err) { setError("Upload failed."); } 
            finally { setIsLoading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
        };
        reader.readAsText(file);
    };

    return (
        <div className="absolute top-24 right-4 w-[400px] min-w-[320px] max-w-[600px] bg-slate-900 border-2 border-blue-500 shadow-2xl rounded-xl p-5 z-[2000] animate-slide-in-left min-h-[50vh] max-h-[90vh] flex flex-col resize-y overflow-hidden">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={16}/></button>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Globe size={16} className="text-blue-500"/> Territory Manager</h3>
            
            <div className="bg-slate-800 p-4 rounded-lg border border-dashed border-emerald-500/50 mb-3 shrink-0">
                <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-2">1. Select or Name Target Folder</label>
                <input 
                    type="text" 
                    list="folder-options"
                    value={uploadFolder} 
                    onChange={(e) => setUploadFolder(e.target.value)} 
                    placeholder="Select existing or type new..."
                    className="w-full bg-slate-900 border border-slate-600 text-white p-2 rounded text-xs font-bold mb-3 focus:border-emerald-500 outline-none"
                />
                <datalist id="folder-options">
                    {existingFolders.map(f => <option key={f} value={f} />)}
                </datalist>
                
                <input type="file" accept=".geojson,.json" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={isLoading || !uploadFolder.trim()} className="w-full bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500 text-emerald-400 font-bold py-2.5 rounded flex justify-center items-center gap-2 text-xs transition-colors disabled:opacity-50">
                    <Upload size={14}/> {isLoading ? "Processing..." : "2. Select Shapefile"}
                </button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-2 shrink-0 bg-slate-800 p-2 rounded border border-slate-700">
                    <h4 className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Active Borders ({safeBoundaries.length})</h4>
                    <div className="flex gap-2">
                        <button onClick={handleCreateFolder} className="text-[11px] px-2 py-1 rounded bg-blue-900/50 text-blue-400 hover:bg-blue-500 hover:text-white font-bold uppercase transition-colors shadow-md">+ Folder</button>
                        <button onClick={handleWipeAll} className="text-[11px] px-2 py-1 rounded bg-red-900/50 text-red-400 hover:bg-red-500 hover:text-white font-bold uppercase transition-colors">Clear All</button>
                    </div>
                </div>
                
                {safeBoundaries.length === 0 && customFolders.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                        <Globe size={32} className="mb-2 text-slate-400" />
                        <p className="text-xs text-slate-400 italic text-center">No borders saved.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1.5 pb-2">
                        {existingFolders.map(folderName => {
                            const folderBoundaries = groupedFolders[folderName] || [];
                            const isExpanded = expandedNodes[folderName];
                            
                            return (
                                <div key={folderName} className="flex flex-col">
                                    <div className="flex justify-between items-center bg-slate-800 p-2 rounded mb-1 border border-slate-700 hover:bg-slate-700/80 transition-colors">
                                        <div className="flex items-center gap-2 cursor-pointer flex-1 min-w-0" onClick={() => toggleNode(folderName)}>
                                            <ChevronRight size={14} className={`text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}/>
                                            <span className="text-xs font-bold text-slate-200 uppercase tracking-widest truncate" title={folderName}>
                                                {folderName} <span className="text-[11px] text-slate-400 normal-case ml-1">({folderBoundaries.length})</span>
                                            </span>
                                        </div>
                                        <div className="flex gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                                            {/* 🚀 FOLDER MANAGEMENT BUTTONS */}
                                            <button onClick={() => triggerFolderUpload(folderName)} className="text-[11px] font-bold tracking-widest bg-emerald-900/40 text-emerald-400 hover:bg-emerald-500 hover:text-white px-1.5 py-1 rounded transition-colors" title="Upload directly to this folder">+ FILE</button>
                                            <button onClick={() => handleDeleteFolder(folderName)} className="text-[11px] font-bold tracking-widest bg-red-900/40 text-red-400 hover:bg-red-500 hover:text-white px-1.5 py-1 rounded transition-colors" title="Delete Folder">DEL</button>
                                            <button onClick={() => handleRenameFolder(folderName)} className="text-[11px] font-bold tracking-widest bg-blue-900/40 text-blue-400 hover:bg-blue-500 hover:text-white px-1.5 py-1 rounded transition-colors" title="Rename Folder">EDIT</button>
                                            <button onClick={() => toggleFolderVisibility(folderName, false)} className="text-[11px] font-bold tracking-widest bg-emerald-900/40 text-emerald-400 hover:bg-emerald-500 hover:text-white px-1.5 py-1 rounded transition-colors" title="Show All">VIS</button>
                                            <button onClick={() => toggleFolderVisibility(folderName, true)} className="text-[11px] font-bold tracking-widest bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white px-1.5 py-1 rounded transition-colors" title="Hide All">HID</button>
                                        </div>
                                    </div>

                                    {isExpanded && folderBoundaries.map(b => (
                                        <div key={b.id} className={`flex flex-col bg-slate-900 p-2.5 rounded border mb-1 ml-4 group hover:border-slate-500 transition-colors ${b.isHidden ? 'border-red-900/30 opacity-60' : 'border-slate-700'}`}>
                                            {/* 🚀 EXPANDED SECTOR SETTINGS PANEL */}
                                            {editingId === b.id ? (
                                                <div className="flex flex-col gap-3 w-full p-2">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] uppercase font-bold text-orange-400 flex items-center gap-1"><Settings size={12}/> Sector Configuration</span>
                                                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Sector Name</label>
                                                            <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 text-white text-[10px] font-bold p-1.5 rounded outline-none focus:border-blue-500"/>
                                                        </div>
                                                        <div>
                                                            <label className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Folder Group</label>
                                                            <input type="text" list="folder-options" value={editForm.folderName} onChange={e => setEditForm({...editForm, folderName: e.target.value})} className="w-full bg-slate-800 border border-slate-600 text-white text-[10px] font-bold p-1.5 rounded outline-none focus:border-blue-500"/>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <div className="flex-[0.5]">
                                                                <label className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Theme</label>
                                                                <div className="flex items-center justify-center bg-slate-800 border border-slate-600 rounded p-1 h-[32px]">
                                                                    <input type="color" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} className="w-full h-full rounded cursor-pointer bg-transparent border-none p-0"/>
                                                                </div>
                                                            </div>
                                                            <div className="flex-[1.5]">
                                                                <label className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Target Rev (Rp) <span className="text-slate-400 normal-case">(Optional)</span></label>
                                                                <input type="number" placeholder="e.g. 5000000" value={editForm.targetRev} onChange={e => setEditForm({...editForm, targetRev: e.target.value})} className="w-full bg-slate-800 border border-slate-600 text-white text-[10px] font-bold p-1.5 h-[32px] rounded outline-none focus:border-emerald-500"/>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Assigned Agent <span className="text-slate-400 normal-case">(Optional)</span></label>
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
                                                            <span className={`text-xs font-medium truncate ${b.isHidden ? 'text-slate-400 line-through' : 'text-white'}`} title={b.name}>
                                                                {b.name} {b.assignedAgent && <span className="text-purple-400 ml-1 text-[10px]" title="Agent Assigned">👤</span>}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0 opacity-100 lg:opacity-30 group-hover:opacity-100 transition-opacity">
                                                        <select 
                                                            value={b.folderName || b.level || 'Uncategorized'}
                                                            onChange={(e) => handleFastMove(b.id, e.target.value)}
                                                            className="text-[11px] font-bold uppercase tracking-widest bg-slate-800 text-slate-300 border border-slate-600 rounded px-1 py-1 max-w-[80px] outline-none cursor-pointer hover:bg-slate-700"
                                                            title="Move to another folder"
                                                        >
                                                            <optgroup label="Move to...">
                                                                {existingFolders.map(f => <option key={f} value={f}>{f}</option>)}
                                                                <option value="CREATE_NEW">+ New Folder</option>
                                                            </optgroup>
                                                        </select>
                                                        <button onClick={() => toggleVisibility(b.id, b.isHidden)} className={`text-[11px] font-bold px-1.5 py-1 rounded transition-colors ${b.isHidden ? 'bg-slate-800 text-slate-400 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-900/50 text-emerald-400 hover:bg-slate-700 hover:text-white'}`}>{b.isHidden ? 'HIDDEN' : 'VISIBLE'}</button>
                                                        <button onClick={() => { 
                                                            setEditingId(b.id); 
                                                            setEditForm({
                                                                name: b.name || "",
                                                                color: b.color || "#38bdf8",
                                                                targetRev: b.targetRev || "",
                                                                assignedAgent: b.assignedAgent || "none",
                                                                folderName: b.folderName || b.level || "Uncategorized"
                                                            }); 
                                                        }} className="text-slate-400 hover:text-blue-400 p-1 rounded bg-slate-900 transition-colors"><Settings size={12}/></button>
                                                        <button data-kpm-del data-label="Delete" onClick={() => handleDeleteBorder(b.id)} className="text-slate-400 hover:text-red-500 p-1 rounded bg-slate-900 transition-colors"><Trash2 size={12}/></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
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
        <div className="ms-card ms-zone">
            <div className="ms-ptitle"><h4>{zone.name}</h4><button type="button" className="ms-x" onClick={() => setSelectedZone(null)} aria-label="Close"><X size={16}/></button></div>
            <p className="ms-where">{zone.level}{zone.fullName ? ` · ${zone.fullName}` : ''}</p>
            <div className="ms-stats one"><div><small>Shops inside</small><b>{storesInZone.length}</b></div></div>
        </div>
    );
};

/* the Territory Control box folded into the Catchment key (his pick 2026-10-05): a shop visited in the last 30 days is
   "held"; the key says what share of the shops on the map is held, its title the old rank name */
const territoryOf = (mapPoints) => {
    const pct = mapPoints.length ? Math.round(mapPoints.filter((s) => s.isConquered).length / mapPoints.length * 100) : 0;
    return { pct, rank: pct > 75 ? 'Kingpin' : pct > 50 ? 'City Boss' : pct > 25 ? 'District Manager' : 'Street Peddler' };
};

/* one area row: rank, name, money (boss only), a bar split by its shops' levels, its size and how many need a visit */
const AreaRow = ({ a, i, top, tiers, showMoney, onPick }) => (
    <button type="button" className="ms-area" onClick={() => onPick(a)}>
        <span className="n">{i + 1}</span><span className="nm">{a.name}</span>
        <span className="rp">{showMoney ? rpShort(a.money) : `${a.shops}`}</span>
        <span className="meter" style={{ width: `${Math.max(6, Math.round((showMoney ? a.money / (top.money || 1) : a.shops / (top.shops || 1)) * 100))}%` }}>
            {a.mix.map((m, k) => m > 0 && <u key={k} style={{ flex: m, background: levelLook(tiers[k].id, tiers)[0] }} />)}
        </span>
        <span className="sub"><span>{a.shops} shops</span>{a.late ? <em>{a.late} need a visit</em> : <span>all visited</span>}</span>
    </button>
);

/* the level chips = the old tier filter: press one to hide its shops, All = every level back */
const LevelChips = ({ tiers, counts, filterTier, toggle, toggleAll }) => (
    <>
        <button type="button" className={`ms-chip all ${filterTier.length === tiers.length ? 'on' : ''}`} aria-pressed={filterTier.length === tiers.length} onClick={toggleAll}>All</button>
        {tiers.map((t) => (
            <button type="button" key={t.id} className={`ms-chip ${filterTier.includes(t.id) ? '' : 'off'}`} aria-pressed={filterTier.includes(t.id)} onClick={() => toggle(t.id)}>
                <Badge look={levelLook(t.id, tiers)} fit={24} />{String(t.label || t.id)} <b>{counts[t.id] || 0}</b>
            </button>
        ))}
    </>
);

const daysAgo = (ms) => { if (!ms) return 'Never'; const d = Math.floor((Date.now() - ms) / 86400000); return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`; };

const StoreBottomSheet = ({ store, mapPoints, transactions, inventory, db, appId, user, isAdmin, setSelectedStore, liveScaleOverride, setLiveScaleOverride, setEditingStoreId, setDragPinCoords, canOverrideGps, activeTiers, setLocalTierUpdates, onNavigateToDirectory, onShowStoreOnJourney }) => {
    const sheetRef = useRef(null);
    const translateVal = useRef(0);
    const touchY = useRef(0);
    
    const [isLinking, setIsLinking] = useState(false); 
    const [localScale, setLocalScale] = useState(store?.catchmentScale || 1.0);
    const [visitFreq, setVisitFreq] = useState(store?.visitFreq || 7);
    const [showConsignDetails, setShowConsignDetails] = useState(false);
    const [showTools, setShowTools] = useState(false);   /* ⋯ = the boss's tools, folded */

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
        if (!store?.name) return { totalRev: 0, currentConsignment: 0, activeItems: [], monthRev: 0, lastOrderAt: 0 };

        const safeTrans = Array.isArray(transactions) ? transactions : [];
        /* 🚀 FIX — SUM SITE. This feeds the pin's revenue and, through totalTitip - totalPaid,
           the outstanding consignment debt. It used a raw `===` between store.name (from the
           customer document) and t.customerName (typed at the counter): one capital letter or a
           legacy " (Retail)" ending apart and the shop showed no sales, no stock and NO DEBT —
           a shop with money outstanding read as settled. Matched through storeKey now, so those
           rows come back and the debt goes UP toward its true value. */
        const key = storeKey(store.name);
        const storeTrans = safeTrans.filter(t => t && storeKey(t.customerName) === key);
        
        /* Money this shop has actually paid, so a store holding a big unpaid consignment no longer
           looks like the best customer on the map. `revenueOf` skips a Titip placement and counts
           the store audit that collects it (Aldi, 2026-09-09). The `totalTitip` line below is
           untouched: that one is measuring the debt on purpose. */
        const totalRev = storeTrans.reduce((sum, t) => sum + revenueOf(t), 0);
        const totalTitip = storeTrans.filter(t => t.type === 'SALE' && t.paymentType === 'Titip').reduce((sum, t) => sum + (Number(t.total) || 0), 0);
        const totalPaid = storeTrans.reduce((sum, t) => sum + debtCredit(t), 0);   /* cash paid + damaged goods handed back + refunds (revenueRule.js) */
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
        /* the card's two new numbers: money this month (same revenue rule) and when the last sale was */
        const monthRev = monthByShop(storeTrans)[key] || 0;
        const lastOrderAt = storeTrans.filter(t => (t.type || 'SALE') === 'SALE').reduce((m, t) => Math.max(m, txTime(t)), 0);
        return { totalRev, currentConsignment, activeItems, monthRev, lastOrderAt };
    }, [store?.name, transactions, inventory]);

    const recentSales = useMemo(() => {
        if (!store?.name) return [];
        const safeTrans = Array.isArray(transactions) ? transactions : [];
        return safeTrans
            /* DISPLAY SITE — the last five sales on the pin. No sum, so the only change is that
               rows filed under an older spelling of the name are visible again. */
            .filter(t => t && storeKey(t.customerName) === storeKey(store.name) && t.type === 'SALE')
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
        } catch (error) {
            console.error(error);
            notify("Could not change the store type. Nothing was saved — check your signal and try again.");
        } finally { setIsLinking(false); }
    };

    const handleAssignHub = async (hubId) => {
        if (!db || !appId || isLinking || !store?.id) return;
        setIsLinking(true);
        try { 
            const userId = user?.uid || user?.id;
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id), { suppliedBy: hubId === "none" ? null : hubId });
        } catch (error) {
            console.error(error);
            notify("Could not change which hub supplies this store. Nothing was saved.");
        } finally { setIsLinking(false); }
    };

    const handleSaveLocalScale = async () => {
        if (!db || !appId || !store?.id) return;
        try { 
            const userId = user?.uid || user?.id;
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id), { catchmentScale: localScale });
        } catch (error) {
            console.error(error);
            notify("Could not save the catchment scale. Nothing was saved.");
        }
    };

    const handleSaveVisitFreq = async (newFreq) => {
        const freq = Math.max(1, parseInt(newFreq) || 7);
        /* The screen is updated BEFORE the write, so a failure used to look exactly like a
           success — the new number sat there having reached nothing. The old value is kept so
           the display can be put back, which is the difference between a silent lie and a
           message he can act on. */
        const previous = visitFreq;
        setVisitFreq(freq);
        if (!db || !appId || !user || !store?.id) return;
        try {
            const userId = user?.uid || user?.id;
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id), { visitFreq: freq });
        } catch (error) {
            console.error(error);
            setVisitFreq(previous);
            notify("Could not save the visit frequency. The old value has been put back.");
        }
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
        } catch (error) {
            /* The worst of the five to lose quietly: the tier decides what this store pays for
               everything, and the agent would sell on a price level the database never took. */
            console.error(error);
            notify("PRICE TIER NOT SAVED. This store is still on its old tier — do not sell at the new price until this saves.");
        }
    };

    const handleDeleteStore = async () => {
        if (!await confirmAction(`⚠️ DANGER: Are you absolutely sure you want to PERMANENTLY DELETE ${store.name}? This cannot be undone.`)) return;
        if (!db || !appId || !user || !store?.id) return;
        try {
            const userId = user?.uid || user?.id;
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id));
            notify(`✅ ${store.name} has been eradicated from the database.`);
            setSelectedStore(null);
        } catch (error) {
            console.error("Delete Error:", error);
            notify("Failed to delete store.");
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

    const tiers = activeTiers || [];
    const tierLabel = String(tiers.find((t) => t.id === store.tier)?.label || store.tier || 'Unranked');
    const owner = store.assignedAgent && store.assignedAgent !== 'Unassigned' ? String(store.assignedAgent) : '';
    const initials = owner ? owner.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?';
    const nextVisit = !store.lastVisit ? 'Never visited · due now' : store.diffDays < 0 ? `${Math.abs(store.diffDays)} days overdue` : store.diffDays === 0 ? 'Due today' : `Due in ${store.diffDays} days`;
    const dot = store.status === 'overdue' ? 'late' : store.status === 'soon' ? 'soon' : '';

    return (
        <div ref={sheetRef} className="ms-store fixed bottom-0 left-0 right-0 z-[10000] flex flex-col lg:absolute lg:bottom-auto lg:right-auto lg:z-[1200] lg:transform-none"
            style={isMobile ? { height: '85vh', transform: 'translateY(100%)' } : {}} onClick={(e) => e.stopPropagation()}>
            <div className="ms-store-head" style={{ touchAction: isMobile ? 'none' : 'auto' }}
                onTouchStart={isMobile ? onHandleTouchStart : undefined} onTouchMove={isMobile ? onHandleTouchMove : undefined} onTouchEnd={isMobile ? onHandleTouchEnd : undefined}>
                <span className="ms-grab lg:hidden" />
                <div className="ms-head">
                    <Badge look={levelLook(store.tier, tiers)} big dot={dot} hub={store.storeType === 'Wholesaler'} />
                    <div className="min-w-0 flex-1">
                        <h5>{store.name || 'Unknown Store'}</h5>
                        <div className="ms-where">{tierLabel} · {areaOf(store)}{store.storeType === 'Wholesaler' ? ' · Wholesale hub' : ''}</div>
                    </div>
                    <button type="button" className="ms-x" onClick={() => setSelectedStore(null)} aria-label="Close the shop"><X size={16}/></button>
                </div>
            </div>
            <div className="ms-store-body custom-scrollbar">
                <span className="ms-who"><i>{initials}</i>{owner ? <>{owner} <em>salesman</em></> : 'No salesman yet'}</span>
                <p className="ms-where">{displayLocation}</p>
                <div className="ms-stats">
                    {isAdmin && <div><small>This month</small><b className="g">{rpShort(stats.monthRev)}</b></div>}
                    <div><small>Last order</small><b>{daysAgo(stats.lastOrderAt)}</b></div>
                    {isAdmin && (
                        <button type="button" onClick={() => setShowConsignDetails(!showConsignDetails)} aria-expanded={showConsignDetails} disabled={!stats.currentConsignment}>
                            <small>Still unpaid</small><b className={stats.currentConsignment > 0 ? 'r' : ''}>{rpShort(stats.currentConsignment)}</b>
                        </button>
                    )}
                    <div><small>Visit</small>{isAdmin ? (
                        <label className="ms-freq">Every <input type="number" min="1" value={visitFreq} onChange={(e) => setVisitFreq(e.target.value)} onBlur={(e) => handleSaveVisitFreq(e.target.value)} aria-label="Visit every how many days" /> days</label>
                    ) : <b>Every {visitFreq} days</b>}</div>
                </div>
                {isAdmin && showConsignDetails && stats.currentConsignment > 0 && (
                    <div className="ms-list">{stats.activeItems.length > 0 ? stats.activeItems.map((item, idx) => <div key={idx}><span>{item.name}</span><b>{item.qty} Bks</b></div>) : <p className="ms-where">No item details found.</p>}</div>
                )}
                <div className="ms-stats one"><div><small>Next visit</small><b className={store.status === 'overdue' ? 'r' : ''}>{nextVisit}</b></div></div>
                <div className={`ms-acts ${isAdmin || canOverrideGps ? '' : 'two'}`}>
                    <a href={getGpsLink()} target="_blank" rel="noreferrer" className="p"><Navigation size={14}/> Directions</a>
                    {isAdmin && store.phone ? <a href={getWhatsappLink()} target="_blank" rel="noreferrer"><Phone size={14}/> WhatsApp</a> : <span className="off"><Phone size={14}/> No phone</span>}
                    {(isAdmin || canOverrideGps) && <button type="button" aria-label="Boss tools" aria-expanded={showTools} className={showTools ? 'on' : ''} onClick={() => setShowTools((v) => !v)}><MoreHorizontal size={20}/></button>}
                </div>
                {onShowStoreOnJourney && <button type="button" className="ms-wide" onClick={() => onShowStoreOnJourney(store.name)}>On Journey Plan <ChevronRight size={14}/></button>}
                {showTools && (
                    <div className="ms-boss">
                        {canOverrideGps && (
                            <div className="ms-acts two">
                                <button type="button" onClick={() => { setDragPinCoords({ lat: store.latitude, lng: store.longitude }); setEditingStoreId(store.id); setSelectedStore(null); }}><MapPin size={14}/> Correct pin</button>
                                <button type="button" onClick={() => { sessionStorage.setItem('targetEditStore', store.id); if (onNavigateToDirectory) onNavigateToDirectory(); else window.dispatchEvent(new CustomEvent('switchTab', { detail: 'customers' })); }}><Pencil size={14}/> Edit profile</button>
                            </div>
                        )}
                        {isAdmin && (
                            <>
                                <label className="ms-row"><span>Level</span>
                                    <select value={store.tier || store.priceTier || 'Retail'} onChange={(e) => handleSaveTier(e.target.value)} className="ms-select">{tiers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
                                </label>
                                <div className="ms-row"><span>Wholesale hub</span>
                                    <button type="button" role="switch" aria-checked={store.storeType === 'Wholesaler'} onClick={handleToggleStoreType} disabled={isLinking} className={`ms-switch ${store.storeType === 'Wholesaler' ? 'on' : ''}`}><i /></button>
                                </div>
                                {store.storeType !== 'Wholesaler' && (
                                    <label className="ms-row"><span>Supplied by</span>
                                        <select value={store.suppliedBy || 'none'} onChange={(e) => handleAssignHub(e.target.value)} disabled={isLinking} className="ms-select">
                                            <option value="none">No hub</option>{availableHubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name} ({hub.city})</option>)}
                                        </select>
                                    </label>
                                )}
                                <div className="ms-row col"><span>Catchment reach <b>{Number(localScale).toFixed(1)}x</b></span>
                                    <input type="range" min="0.1" max="5.0" step="0.1" value={localScale} onChange={(e) => { const val = parseFloat(e.target.value); setLocalScale(val); setLiveScaleOverride(val); }} onMouseUp={handleSaveLocalScale} onTouchEnd={handleSaveLocalScale} className="ms-range" aria-label="Catchment reach" />
                                </div>
                                <button type="button" onClick={handleDeleteStore} className="ms-del"><Trash2 size={14}/> Delete this shop</button>
                            </>
                        )}
                    </div>
                )}
                {isAdmin && (
                    <div className="ms-recent">
                        <div className="ms-ptitle"><span>Recent sales</span><span><b>{rpShort(stats.totalRev)}</b> all time</span></div>
                        {recentSales.length > 0 ? recentSales.map((tx) => { const at = txTime(tx); return (
                            <div key={tx.id} className="ms-sale">
                                <div className="ms-ptitle"><span>{at ? new Date(at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Unknown date'} · {tx.agentName || 'Sales'}</span><b>{formatRupiah(Number(tx.total) || 0)}</b></div>
                                {(Array.isArray(tx.items) ? tx.items : Object.values(tx.items || {})).map((item, i) => <div key={i} className="ms-line"><span>{String(item?.name || 'Item')}</span><span>{Number(item?.qty || 0)} {String(item?.unit || 'Bks')}</span></div>)}
                            </div>); }) : <p className="ms-where">No sales yet.</p>}
                    </div>
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
            } catch(e) {
                /* Not silent: with no rules the tier simulation below scores everything against
                   zero targets, which reads as "everyone qualifies". */
                console.error(e);
                notify("Could not load the tier rules. The rank simulation on this screen is not reliable until it loads.");
            }
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
        if (!await confirmAction("WARNING: Initialize RPG Protocol? This will calculate Lifetime and Season XP from all legacy receipts and lock them into store profiles permanently.")) return;
        setIsApplying(true);
        try {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const safeTrans = Array.isArray(transactions) ? transactions : [];
            const lastXPUpdate = new Date().toISOString();

            const operations = mapPoints.map(store => {
                let lifetimeXP = 0;
                let seasonXP = 0;

                safeTrans.forEach(t => {
                    const tType = String(t.type || (t.total < 0 ? 'RETUR' : 'SALE')).toUpperCase();
                    /* 🚀 SUM SITE, AND IT WRITES. lifetimeXP and seasonXP are committed to the
                       store documents at the end of this function, so a shop whose history was
                       split by spelling has been banked at a lower XP than it earned. This was
                       also a private trim+lowercase copy of the shared rule — the same mistake
                       removed from customerBrief.js in f1e3b28.

                       The `|| t.customer` fallback is KEPT: no transaction in this codebase
                       writes a `customer` field (checked), but proving that for every row ever
                       written offline is not possible from here, and keeping it costs nothing. */
                    const isMatch = storeKey(t.customerName || t.customer) === storeKey(store.name);

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

                return {
                    type: 'update',
                    ref: doc(db, `artifacts/${appId}/users/${userId}/customers`, store.id),
                    data: { lifetimeXP, seasonXP, lastXPUpdate }
                };
            });

            // 🚀 FIX: Chunked/paced commitInChunks instead of one updateDoc await
            // per store in a tight loop.
            await commitInChunks(db, writeBatch, operations);
            notify(`✅ RPG Migration Complete! ${operations.length} stores upgraded. You can now use the Season Rank Audit.`);
            onClose();
        } catch(e) {
            console.error(e);
            notify("Migration Failed. Check console.");
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
        if (!await confirmAction(`Execute Season Updates for ${simResults.actions.length} stores?`)) return;
        setIsApplying(true);
        try {
            const operations = simResults.actions.map(action => {
                const payload = { tier: action.new };
                if (action.isNewSeason) {
                    payload.seasonXP = 0;
                    payload.lastXPUpdate = new Date().toISOString();
                }
                return {
                    type: 'update',
                    ref: doc(db, `artifacts/${appId}/users/${userId}/customers`, action.storeId),
                    data: payload
                };
            });

            // 🚀 FIX: Chunked/paced commitInChunks instead of one updateDoc await
            // per store in a tight loop.
            await commitInChunks(db, writeBatch, operations);

            simResults.actions.forEach(action => {
                if (setLocalTierUpdates) {
                    setLocalTierUpdates(prev => ({ ...prev, [action.storeId]: action.new }));
                }
            });

            const ops = operations.length;
            if (logAudit) logAudit("SEASON_RANK_AUDIT", `Season RPG Engine adjusted ${ops} stores.`);
            if (triggerCapy) triggerCapy(`Season Update Complete! ${ops} store ranks adjusted. 📈`);
            notify(`✅ Success! ${ops} stores instantly updated on map.`);
            setSimResults(null);
            onClose();
        } catch(e) { notify("Error applying changes."); }
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
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24}/></button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    <div className="bg-slate-800 border border-slate-600 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-1"><Globe size={14} className="text-blue-400"/> Synced to Global Logic</label>
                            <p className="text-[10px] text-slate-400">Targets are evaluated against active Calendar Month Season XP.</p>
                        </div>
                    </div>

                    {simResults ? (
                        <div className="bg-black/50 border-2 border-orange-500 rounded-xl p-4 animate-fade-in">
                            <h3 className="text-orange-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Activity size={16}/> Season Audit Results</h3>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="bg-slate-800 p-3 rounded-lg border border-emerald-500/30 text-center"><span className="block text-2xl font-black text-emerald-400">{simResults.promotions.length}</span><span className="text-[11px] uppercase font-bold text-slate-400">Promotions</span></div>
                                <div className="bg-slate-800 p-3 rounded-lg border border-red-500/30 text-center"><span className="block text-2xl font-black text-red-400">{simResults.demotions.length}</span><span className="text-[11px] uppercase font-bold text-slate-400">Demotions</span></div>
                                <div className="bg-slate-800 p-3 rounded-lg border border-slate-600 text-center"><span className="block text-2xl font-black text-slate-300">{simResults.steady}</span><span className="text-[11px] uppercase font-bold text-slate-400">Unchanged</span></div>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1 mb-4 custom-scrollbar">
                                {simResults.all.map((act, i) => {
                                    const oldLabel = activeTiers.find(t => String(t.id).toLowerCase() === String(act.old).toLowerCase())?.label || act.old;
                                    const newLabel = activeTiers.find(t => String(t.id).toLowerCase() === String(act.new).toLowerCase())?.label || act.new;
                                    
                                    return (
                                        <div key={i} className="flex justify-between items-center text-[10px] p-2 bg-slate-900 border border-slate-800 rounded">
                                            <span className="font-bold text-white truncate w-1/4">{act.name}</span>
                                            <div className="flex flex-col items-start w-2/5 font-mono">
                                                <span className="text-orange-400 font-black text-[11px]">SEASON: Rp {new Intl.NumberFormat('id-ID').format(act.rev)}</span>
                                                <span className="text-slate-400 text-[11px]">LIFETIME: Rp {new Intl.NumberFormat('id-ID').format(act.lt)}</span>
                                            </div>
                                            <div className="flex items-center gap-1 w-1/3 justify-end font-bold uppercase">
                                                <span className="text-slate-400 truncate" title={oldLabel}>{oldLabel}</span>
                                                {act.old !== act.new ? (
                                                    <>
                                                        {act.isPromotion ? <ArrowUpCircle size={12} className="text-emerald-500 shrink-0"/> : <ArrowDownCircle size={12} className="text-red-500 shrink-0"/>}
                                                        <span className={`truncate ${act.isPromotion ? 'text-emerald-400' : 'text-red-400'}`} title={newLabel}>{newLabel}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400 ml-1 shrink-0">(=)</span>
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
const MapMissionControl = ({ customers, transactions, inventory, db, appId, user, logAudit, triggerCapy, isAdmin, savedHome, onSetHome, tierSettings, motorists = [], onNavigateToDirectory, userRole, agentProfileId, eodReports, onShowStoreOnJourney }) => {

    const userId = user?.uid || user?.id || "default";

    const activeTiers = useMemo(() => (Array.isArray(tierSettings) && tierSettings.length > 0) ? tierSettings : [
        { id: 'Mythic', label: 'Mythic', color: '#E4B04A', iconType: 'emoji', value: '👑' },
        { id: 'Epic', label: 'Epic', color: '#C4551E', iconType: 'emoji', value: '🔥' },
        { id: 'Grandmaster', label: 'Grandmaster', color: '#F0E2BC', iconType: 'emoji', value: '⚔️' },
        { id: 'Bronze', label: 'Bronze', color: '#A0703C', iconType: 'emoji', value: '🛡️' },
        { id: 'Unranked', label: 'Unranked', color: '#6A645C', iconType: 'emoji', value: '🪵' }
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
    
    const [sheet, setSheet] = useState(null);            /* phone: the one open sheet - areas / levels / layers */
    const flip = (k) => setSheet((s) => (s === k ? null : k));
    const [allAreas, setAllAreas] = useState(false);     /* PC: the whole ranking instead of the top 3 */
    const [locateTick, setLocateTick] = useState(0);
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

    /* The salesmen on the analysis map: a gold chip at each one's last-seen point, his own region only below
       the boss's tiers (Reports' authority switch). The expedition itself - trail, next shop, travel card - lives
       on Journey Plan, his call 2026-10-03: "map mission control is used to analyze the stores ... the journey
       map is for ... journey of the salesman throughout the day". */
    const globalView = ['ADMIN', 'DEVELOPER', 'COMPANY_OWNER'].includes(userRole) || hasClearance(userRole, 'view_reports_global');
    const team = useMemo(() => expedition(visibleTeam(motorists || [], { global: globalView, viewerId: agentProfileId }), customers || [], transactions || [], new Date(), eodReports || []), [motorists, customers, transactions, globalView, agentProfileId, eodReports]);

    const canAddManualPin = isAdmin === true || user?.tier === 1 || user?.tier === 2 || user?.tier === '1' || user?.tier === '2' || user?.role?.toLowerCase() === 'admin';

    const [pendingNewStore, setPendingNewStore] = useState(null);
    const [newStoreForm, setNewStoreForm] = useState({ name: '', phone: '', address: '', priceTier: 'Retail' });
    const [isSavingStore, setIsSavingStore] = useState(false);

    const handleSaveNewStore = async () => {
        if (!newStoreForm.name) return notify("Store Name is required!");
        setIsSavingStore(true);
        try {
            const newRef = doc(collection(db, `artifacts/${appId}/users/${userId}/customers`));
            
            await setDoc(newRef, {
                id: newRef.id,
                name: newStoreForm.name.toUpperCase(),
                phone: newStoreForm.phone || "",
                address: newStoreForm.address || "",
                tier: activeTiers[activeTiers.length - 1]?.id || 'Unranked',
                priceTier: newStoreForm.priceTier,
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
            notify("Failed to save store: " + e.message);
        } finally {
            setIsSavingStore(false);
        }
    };

    useEffect(() => {
        const loadBorders = async () => {
            // 🗄️ IndexedDB cache paint first (localStorage quota killed the old cache)
            try {
                const cached = await loadBorderCache(appId);
                if (cached.length > 0) setBoundaries(cached);
            } catch(e) { /* cache paint only — the live fetch below is the real load */ }

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
                                } catch(e) { /* one corrupt boundary is skipped rather than taking the whole map down */ }
                            }
                        }
                    });
                    if (loaded.length > 0) {
                        setBoundaries(loaded);
                        saveBorderCache(appId, loaded);
                    }
                } catch(e) { /* borders are decoration on this screen; the cache paint above already ran */ }
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

    const { mapPoints, locationTree, levelCounts } = useMemo(() => {
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

            const levelCounts = {};
            validStores.forEach(c => { if ((selectedRegion === "All" || c.region === selectedRegion) && (selectedCity === "All" || c.city === selectedCity)) levelCounts[c.tier] = (levelCounts[c.tier] || 0) + 1; });

            const filtered = validStores.filter(c => {
                if (selectedRegion !== "All" && c.region !== selectedRegion) return false;
                if (selectedCity !== "All" && c.city !== selectedCity) return false;
                if (!filterTier.includes(c.tier)) return false; 
                return true;
            });

        const treeArray = Object.keys(tree).reduce((acc, reg) => { acc[reg] = Array.from(tree[reg]).sort(); return acc; }, {});
        return { mapPoints: filtered, locationTree: treeArray, levelCounts };
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

        /* 🚀 SUM SITE — per-store revenue, added up per zone below to colour the heatmap.
           Keyed on storeKey now, so two customer documents that differ only by spelling share
           ONE entry instead of computing the same rows twice under two keys. */
        mapPoints.forEach(store => {
            const key = storeKey(store.name);
            if (storeRevs[key] !== undefined) return;
            storeRevs[key] = safeTrans
                .filter(t => {
                    if (storeKey(t.customerName) !== key || t.type !== 'SALE') return false;
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

            /* 🚀 Each distinct shop counts ONCE per zone. Two customer documents sharing a name
               return the SAME transactions — the rows are indistinguishable, there is no
               customerId to separate them — so adding both was counting one shop's takings
               twice and colouring the zone hotter than it earned. That was already true for
               identical names before this change; matching by key would have widened it to
               every spelling variant, so the count is de-duplicated here rather than left. */
            let totalRev = 0;
            const counted = new Set();
            mapPoints.forEach(store => {
                if (checkPointInGeoJSON(store.longitude, store.latitude, geoData)) {
                    const key = storeKey(store.name);
                    if (counted.has(key)) return;
                    counted.add(key);
                    totalRev += (storeRevs[key] || 0);
                }
            });
            revMap[boundary.id] = totalRev;
        });
        return revMap;
    }, [salesHeatmapMode, showTacticalDash, sortedBoundaries, mapPoints, transactions, timeFilter]);

    const getZoneColor = (boundaryId) => {
        if (!salesHeatmapMode) return null;
        const rev = zoneRevenues[boundaryId] || 0;
        if (rev === 0) return '#6A645C'; 
        const maxRev = Math.max(...Object.values(zoneRevenues), 1);
        const ratio = rev / maxRev;
        if (ratio > 0.6) return '#E4B04A'; 
        if (ratio > 0.2) return '#D08A2E'; 
        return '#C4551E'; 
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
        setSheet(null);
        setSelectedStore(store); 
        setSelectedZone(null); 
        setLiveScaleOverride(null); 
        
        const minZoom = window.innerWidth < 1024 ? 17 : 15;
        const targetZoom = Math.max(map.getZoom(), minZoom);
        /* on the phone the card covers the lower half: aim a quarter screen lower so the shop stays above it */
        const aim = window.innerWidth < 1024 ? map.unproject(map.project([store.latitude, store.longitude], targetZoom).add([0, map.getSize().y * 0.25]), targetZoom) : [store.latitude, store.longitude];
        map.flyTo(aim, targetZoom, { duration: 1.2 });
    };

    /* his 2026-10-05 "add searching box for store name to show the location ... we also need that on the regular map": a
       picked or typed shop presses its pin - its card opens and the map flies there; a miss is reported */
    const [shopQuery, setShopQuery] = useState('');
    const goToShop = (text) => {
        const shop = findShop(mapPoints, text);
        if (!shop) return notify(`No shop called "${String(text).trim()}" on the map right now - the region and tier filters may be hiding it.`);
        setShopQuery(shop.name);
        if (mapRef.current) handlePinClick(shop, mapRef.current);
    };

    const activeStore = selectedStore ? mapPoints.find(s => s.id === selectedStore.id) || selectedStore : null;

    /* his job for this screen: "sales performance of an area, stores level and position". Areas = the shop's own city /
       region field (mapAreas.js), so the ranking needs no drawn border; money only for the boss, as on the old card */
    const areas = useMemo(() => {
        const r = rankAreas(mapPoints, transactions, activeTiers.map((t) => t.id));
        return isAdmin ? r : [...r].sort((x, y) => y.shops - x.shops);
    }, [mapPoints, transactions, activeTiers, isAdmin]);
    const totals = useMemo(() => areas.reduce((t, a) => ({ money: t.money + a.money, late: t.late + a.late }), { money: 0, late: 0 }), [areas]);
    const territory = territoryOf(mapPoints);

    /* an area row flies the map to that area's shops; on the phone the sheet closes so the map shows it */
    const pickArea = (a) => {
        const pts = mapPoints.filter((s) => areaOf(s) === a.name).map((s) => [s.latitude, s.longitude]);
        if (!pts.length || !mapRef.current) return;
        const wide = window.innerWidth >= 1024;
        mapRef.current.flyToBounds(L.latLngBounds(pts), { paddingTopLeft: wide ? [400, 90] : [30, 140], paddingBottomRight: wide ? [80, 100] : [30, 110], maxZoom: 15, duration: 1 });
        if (!wide) setSheet(null);
    };

    const startNewPin = () => {
        let center = [-7.6145, 110.7122];
        if (mapRef.current) { const c = mapRef.current.getCenter(); center = [c.lat, c.lng]; }
        else if (userLocation) center = userLocation;
        setDragPinCoords(center);
        setIsAddingMode(true);
        setSelectedStore(null);
    };

    /* the layers (bottom dock on the PC, the Layers sheet on the phone); a layer with nothing to draw says why */
    const layerKeys = [
        { k: 'borders', cls: 'm-bord', on: showBorders, icon: <Globe size={18}/>, label: 'Borders', press: () => { if (!showBorders && !sortedBoundaries.length) notify('No area borders yet - import them with Borders setup first.'); setShowBorders(!showBorders); } },
        isAdmin && { k: 'heat', cls: 'm-heat', on: salesHeatmapMode, icon: <Flame size={18}/>, label: 'Sales heat', press: () => { if (!salesHeatmapMode && !sortedBoundaries.length) notify('Sales heat colours the area borders - import borders with Borders setup first.'); setSalesHeatmapMode(!salesHeatmapMode); setShowBorders(true); } },
        { k: 'supply', cls: 'm-supply', on: networkMode, icon: <Route size={18}/>, label: 'Supply lines', press: () => { if (!networkMode && !mapPoints.some((s) => s.suppliedBy)) notify('No shop is linked to a wholesale hub yet - set "Supplied by" on a shop\'s card.'); setNetworkMode(!networkMode); } },
        { k: 'catch', cls: 'm-catch', on: conquestMode, icon: <CircleDot size={18}/>, label: conquestMode ? `Catchment ${territory.pct}%` : 'Catchment', title: `Territory held: ${territory.pct}% (${territory.rank}) - shops visited in the last 30 days`, press: () => setConquestMode(!conquestMode) },
    ].filter(Boolean);

    /* the tools (PC toolbar top right, the phone's Layers sheet) - every tool the ☰ menu and the floating buttons had */
    const toolKeys = [
        { k: 'loc', cls: 'k-loc', icon: <LocateFixed size={18}/>, label: 'Locate', press: () => setLocateTick((t) => t + 1) },
        isAdmin && { k: 'tier', cls: 'm-tier', on: showTierEngine, icon: <Settings size={18}/>, label: 'Tier rules', press: () => setShowTierEngine(!showTierEngine) },
        isAdmin && { k: 'imp', cls: 'm-imp', on: showImporter, icon: <Download size={18}/>, label: 'Borders setup', press: () => setShowImporter(!showImporter) },
        isAdmin && { k: 'sector', cls: 'm-sector', on: showTacticalDash, icon: <TrendingUp size={18}/>, label: 'Sector board', press: () => {
            const next = !showTacticalDash;
            if (next && !sortedBoundaries.length) return notify('The Sector board ranks the area borders - import them with Borders setup first.');
            setShowTacticalDash(next); if (next) { setSalesHeatmapMode(true); setShowBorders(true); setSelectedStore(null); }
        } },
        canAddManualPin && !isAddingMode && !editingStoreId && { k: 'pin', cls: 'm-drop', icon: <MapPin size={18}/>, label: 'New pin', press: startNewPin },
        isAdmin && onSetHome && { k: 'home', cls: 'm-drop', icon: <Home size={18}/>, label: 'Set home', press: () => { if (mapRef.current) onSetHome(mapRef.current.getCenter(), mapRef.current.getZoom()); } },
    ].filter(Boolean);

    return (
        <div className="kx-map ms-root absolute inset-0 w-full h-[100dvh] lg:h-full bg-slate-900 overflow-hidden font-sans z-[50] overscroll-none">
            
            <style>{`
                body, html { overscroll-behavior-y: none !important; }
            `}</style>


            {/* 🚀 TARGETING HUD */}
            {(isAddingMode || editingStoreId) && dragPinCoords && (
                <div className="absolute top-[80px] lg:top-4 left-1/2 transform -translate-x-1/2 z-[1500] flex flex-col gap-2 items-center w-max min-w-[220px] pointer-events-auto bg-slate-900/95 backdrop-blur border-2 border-orange-500 p-2.5 rounded-xl shadow-[0_10px_30px_rgba(249,115,22,0.5)] animate-fade-in-up">
                    <div className="text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1">
                        <MapPin size={12} /> {editingStoreId ? "Correct Location" : "Drop New Pin"}
                    </div>
                    <span className="text-slate-300 text-[11px] font-bold mt-0.5 leading-tight">Drag pin or tap map to move.</span>
                    
                    <div className="flex gap-2 w-full mt-1">
                        <button 
                            onClick={() => { setIsAddingMode(false); setEditingStoreId(null); setDragPinCoords(null); }}
                            className="flex-1 bg-slate-800 text-slate-400 hover:text-white py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest border border-slate-700 transition-colors px-4"
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
                                        notify("✅ Location Corrected!");
                                        setEditingStoreId(null);
                                        setDragPinCoords(null);
                                        if (logAudit) logAudit("STORE_EDITED_MAP", `Corrected pin for store ID: ${editingStoreId}`);
                                    } catch(e) {
                                        notify("Failed to update location: " + e.message);
                                    }
                                } else {
                                    setPendingNewStore({ lat: finalLat, lng: finalLng });
                                    setIsAddingMode(false);
                                    setDragPinCoords(null);
                                    setNewStoreForm({ name: '', phone: '', address: '', priceTier: 'Retail' });
                                }
                            }}
                            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 px-4"
                        >
                            <CheckCircle size={12} /> {editingStoreId ? "Save" : "Confirm"}
                        </button>
                    </div>
                </div>
            )}

            {/* 🚀 NEW STORE REGISTRATION MODAL */}
            {pendingNewStore && (
                <div className="absolute inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.3)] rounded-2xl w-full max-w-sm p-6 ms-pop relative">
                        <button onClick={() => setPendingNewStore(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-orange-500/20 p-2 rounded-full"><Store className="text-orange-500" size={24}/></div>
                            <div>
                                <h3 className="text-white font-black uppercase tracking-widest">Register Target</h3>
                                <p className="text-slate-400 font-mono text-[10px]">{pendingNewStore.lat.toFixed(5)}, {pendingNewStore.lng.toFixed(5)}</p>
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
                                <select value={newStoreForm.priceTier} onChange={e => setNewStoreForm({...newStoreForm, priceTier: e.target.value})} className="w-full bg-slate-800 border border-slate-600 text-white p-3 rounded font-bold uppercase outline-none focus:border-orange-500">
                                    {/* The PRICE ladder, not the RPG rank ladder. This select is
                                        labelled "Pricing Tier" and its value decides what the store
                                        is charged (MerchantSalesView reads priceTier first), so it
                                        must offer prices. Performance rank is the Tier Automation
                                        Engine's job, not a field typed at registration. */}
                                    <option value="Retail">Retail</option>
                                    <option value="Grosir">Grosir</option>
                                    <option value="Ecer">Ecer</option>
                                </select>
                            </div>
                            
                            <button 
                                onClick={handleSaveNewStore}
                                disabled={isSavingStore}
                                className={`w-full py-4 mt-2 rounded-xl font-black uppercase tracking-[0.2em] transition-all shadow-lg ${isSavingStore ? 'bg-slate-700 text-slate-400' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]'}`}
                            >
                                {isSavingStore ? 'Saving...' : 'Deploy Target'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* the sales heat key: what the colours on the area borders mean (gold sells most, rust least, grey nothing) */}
            {salesHeatmapMode && (
                <div className="ms-heatkey" role="note"><span>Sales heat</span><i style={{ background: '#E4B04A' }} />High<i style={{ background: '#D08A2E' }} />Mid<i style={{ background: '#C4551E' }} />Low<i style={{ background: '#6A645C' }} />None</div>
            )}

            {/* the region and the shop search: side by side on the PC, stacked on the phone (both his picks keep them) */}
            <div className="ms-top">
                <label className="ms-field min-h-11 lg:min-h-0">
                    <MapPin size={16} className="shrink-0" aria-hidden="true"/>
                    <select aria-label="Region" value={selectedRegion} onChange={(e) => { setSelectedRegion(e.target.value); setSelectedCity("All"); }}>
                        <option value="All">All Regions</option>
                        {Object.keys(locationTree).sort().map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </label>
                <label className="ms-field ms-find min-h-11 lg:min-h-0">
                    <Search size={16} className="shrink-0" aria-hidden="true"/>
                    <input type="search" aria-label="Find a shop" list="kx-map-shops" value={shopQuery} placeholder="Find a shop" enterKeyHint="search"
                        onChange={(e) => { setShopQuery(e.target.value); if (mapPoints.some((s) => s.name === e.target.value)) { e.target.blur(); goToShop(e.target.value); } }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); goToShop(e.currentTarget.value); } }} />
                    <datalist id="kx-map-shops">{mapPoints.map((s) => <option key={s.id} value={s.name} />)}</datalist>
                </label>
            </div>

            {/* PC (his B): the three totals, top centre */}
            <div className="ms-totals hidden lg:flex" role="status">
                <div><b>{mapPoints.length}</b><small>Shops</small></div>
                {isAdmin && <div><b className="g">{rpShort(totals.money)}</b><small>This month</small></div>}
                <div><b className={totals.late ? 'r' : ''}>{totals.late}</b><small>Need a visit</small></div>
            </div>

            {/* PC: the top 3 areas float left; See all = the whole ranking. A pressed shop, a zone or the Sector board takes the slot */}
            {!activeStore && !showTacticalDash && !selectedZone && (
                <div className="ms-card ms-areas hidden lg:flex">
                    <div className="ms-ptitle"><h4>{allAreas ? 'Areas' : 'Top areas'}</h4>
                        {areas.length > 3 && <button type="button" className="ms-link" aria-expanded={allAreas} onClick={() => setAllAreas((v) => !v)}>{allAreas ? 'Top 3 ›' : `See all ${areas.length} ›`}</button>}
                    </div>
                    <div className="ms-rank">
                        {areas.slice(0, allAreas ? areas.length : 3).map((a, i) => <AreaRow key={a.name} a={a} i={i} top={areas[0]} tiers={activeTiers} showMoney={isAdmin} onPick={pickArea} />)}
                        {areas.length === 0 && <p className="ms-where">No shops on the map - the region or level filter hides them all.</p>}
                    </div>
                </div>
            )}

            {/* PC: the levels, bottom left - each one a filter you press */}
            <div className="ms-levels hidden lg:flex" role="group" aria-label="Levels - press one to hide it">
                <LevelChips tiers={activeTiers} counts={levelCounts} filterTier={filterTier} toggle={toggleTierFilter} toggleAll={toggleAllTiers} />
            </div>

            {/* PC: the layer keys in a bottom dock */}
            <nav className="ms-layers hidden lg:flex" aria-label="Map layers">
                {layerKeys.map((l) => <button type="button" key={l.k} className={`kx-mapkey ${l.cls} flex items-center ${l.on ? 'on' : ''}`} aria-pressed={l.on} title={l.title} onClick={(e) => { act(e); l.press(); }}>{l.icon}<span>{l.label}</span></button>)}
            </nav>

            {/* PC: the tools, top right - Journey's toolbar, names always on */}
            <div className="kx-keys ms-tools hidden lg:flex flex-col">
                {toolKeys.map((t) => <button type="button" key={t.k} className={`kx-mapkey ${t.cls} flex items-center ${t.on ? 'on' : ''}`} aria-pressed={t.on} onClick={(e) => { act(e); t.press(); }}>{t.icon}<span>{t.label}</span></button>)}
            </div>

            {/* phone (his A): Journey's full-map dock; one key opens one sheet, the same key again = the whole map */}
            <nav className="kx-dock ms-dock grid lg:hidden" aria-label="Map keys">
                <button type="button" className={`kx-mapkey m-areas flex flex-col ${sheet === 'areas' ? 'on' : ''}`} aria-expanded={sheet === 'areas'} onClick={(e) => { act(e); flip('areas'); }}><BarChart3 size={20}/><span>Areas</span></button>
                <button type="button" className={`kx-mapkey m-levels flex flex-col ${sheet === 'levels' ? 'on' : ''}`} aria-expanded={sheet === 'levels'} onClick={(e) => { act(e); flip('levels'); }}><Crown size={20}/><span>Levels</span></button>
                <button type="button" className={`kx-mapkey k-bord flex flex-col ${sheet === 'layers' ? 'on' : ''}`} aria-expanded={sheet === 'layers'} onClick={(e) => { act(e); flip('layers'); }}><Layers size={20}/><span>Layers</span></button>
                <button type="button" className="kx-mapkey k-loc flex flex-col" onClick={(e) => { act(e); setSheet(null); setLocateTick((t) => t + 1); }}><LocateFixed size={20}/><span>Locate</span></button>
            </nav>
            {sheet && (
                <div className="ms-sheet lg:hidden" role="dialog" aria-label={sheet}>
                    <span className="ms-grab" />
                    {sheet === 'areas' && (<>
                        <div className="ms-ptitle"><h4>Areas</h4><span>{mapPoints.length} shops{isAdmin && <> · <b>{rpShort(totals.money)}</b></>}{totals.late > 0 && <> · <em>{totals.late} to visit</em></>}</span></div>
                        <div className="ms-rank">
                            {areas.map((a, i) => <AreaRow key={a.name} a={a} i={i} top={areas[0]} tiers={activeTiers} showMoney={isAdmin} onPick={pickArea} />)}
                            {areas.length === 0 && <p className="ms-where">No shops on the map - the region or level filter hides them all.</p>}
                        </div>
                    </>)}
                    {sheet === 'levels' && (<>
                        <div className="ms-ptitle"><h4>Levels</h4><span>press one to hide it</span></div>
                        <div className="ms-chips"><LevelChips tiers={activeTiers} counts={levelCounts} filterTier={filterTier} toggle={toggleTierFilter} toggleAll={toggleAllTiers} /></div>
                    </>)}
                    {sheet === 'layers' && (<>
                        <div className="ms-ptitle"><h4>Layers</h4><span>on the map</span></div>
                        <div className="ms-grid">{layerKeys.map((l) => <button type="button" key={l.k} className={`kx-mapkey ${l.cls} flex items-center ${l.on ? 'on' : ''}`} aria-pressed={l.on} title={l.title} onClick={(e) => { act(e); l.press(); }}>{l.icon}<span>{l.label}</span></button>)}</div>
                        {toolKeys.length > 1 && (<>
                            <div className="ms-ptitle"><h4>Tools</h4></div>
                            <div className="ms-grid">{toolKeys.filter((t) => t.k !== 'loc').map((t) => <button type="button" key={t.k} className={`kx-mapkey ${t.cls} flex items-center ${t.on ? 'on' : ''}`} aria-pressed={t.on} onClick={() => { setSheet(null); t.press(); }}>{t.icon}<span>{t.label}</span></button>)}</div>
                        </>)}
                    </>)}
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
                    triggerCapy={triggerCapy}
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

            {/* 🚀 LITE MODE UPGRADE: preferCanvas={true} flattens vector borders to save RAM */}
            <MapContainer ref={mapRef} preferCanvas={true} center={[-7.6145, 110.7122]} zoom={10} style={{ height: '100%', width: '100%', background: MAP_GROUND['Dark Canvas (Esri)'] }} className="z-0" zoomControl={false}>
                <MapGround />
                <ZoomControl position="bottomright" />
                <MapEffectController selectedRegion={selectedRegion} selectedCity={selectedCity} mapPoints={mapPoints} savedHome={savedHome} uploadedFocus={uploadedFocus} selectedZone={selectedZone} />
                
                <LayersControl position="bottomright">
                    {/* CARTO's basemaps print API KEY REQUIRED across every tile since 2026-09 (checked
                        2026-09-19, his "fix the map"); Esri's canvases need no key. Native tiles stop at
                        zoom 16 - Leaflet scales those up for the street-level zooms. */}
                    <LayersControl.BaseLayer checked name="Dark Canvas (Esri)">
                        <TileLayer className="balanced-dark-tile" url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} attribution='© Esri' />
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
                    <LayersControl.BaseLayer name="Light Canvas (Esri)">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} attribution='© Esri' />
                    </LayersControl.BaseLayer>
                </LayersControl>

                <LocationController userLocation={userLocation} setUserLocation={setUserLocation} isEditing={!!editingStoreId} trigger={locateTick} />
                {userLocation && (
                    <Marker position={userLocation} icon={userLocationIcon} zIndexOffset={9999} interactive={false} />
                )}

                
                <MapClicker isAddingMode={isAddingMode} editingStoreId={editingStoreId} setDragPinCoords={setDragPinCoords} setSelectedStore={setSelectedStore} setSelectedZone={setSelectedZone} />
                
                {(isAddingMode || editingStoreId) && dragPinCoords && (
                    <DraggableAddMarker position={dragPinCoords} setPosition={setDragPinCoords} />
                )}
                
                {showBorders && sortedBoundaries.map((boundary) => {
                    const geoData = boundary.feature || boundary.geometry;
                    if (!geoData || !geoData.type) return null; 
                    
                    const isHeatmap = salesHeatmapMode;
                    const bndColor = isHeatmap ? getZoneColor(boundary.id) : (boundary.color || '#A39B90');
                    const bndRev = zoneRevenues[boundary.id] || 0;
                    const isKab = boundary.level === 'Kabupaten' || boundary.level === 'Provinsi';
                    const isSelected = selectedZone?.id === boundary.id;

                    return (
                        <GeoJSON 
                            key={`bnd-${boundary.id}-${isHeatmap ? 'heat' : 'norm'}-${bndRev}-${isSelected}-${timeFilter}`} 
                            data={geoData} 
                            style={{ color: isSelected ? '#E4B04A' : bndColor, weight: isSelected ? 4 : (isKab ? 3 : 2), opacity: 1, fillOpacity: isSelected ? 0.7 : (isHeatmap ? 0.45 : (isKab ? 0.02 : 0.15)), fillColor: bndColor, dashArray: isKab ? null : '5, 5' }}
                            onEachFeature={(f, layer) => {
                                layer.on({
                                    click: (e) => { L.DomEvent.stopPropagation(e); setSelectedStore(null); setSelectedZone(boundary); },
                                    mouseover: (e) => e.target.setStyle({ fillOpacity: isHeatmap ? 0.6 : (isKab ? 0.05 : 0.3), weight: isKab ? 4 : 3 }),
                                    mouseout: (e) => e.target.setStyle({ fillOpacity: isSelected ? 0.7 : (isHeatmap ? 0.45 : (isKab ? 0.02 : 0.15)), weight: isSelected ? 4 : (isKab ? 3 : 2) })
                                });
                                
                                const targetHtml = boundary.targetRev ? `<div style="color: #A39B90; font-size: 9px; margin-top: 2px;">TARGET: ${formatRupiah(boundary.targetRev)}</div>` : '';
                                const agentHtml = boundary.assignedAgent ? `<div style="color: #F0E2BC; font-size: 9px; margin-top: 2px; font-weight: bold;">SALESMAN ASSIGNED</div>` : '';

                                const ttContent = `
                                    <div style="background-color: rgba(18, 17, 16, 0.92); border: 1px solid #3E3A35; padding: 8px 14px; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); text-align: center; line-height: 1.2; white-space: nowrap;">
                                        <div style="color: #E8E4DE; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">${boundary.name || "Region"}</div>
                                        ${isHeatmap ? `<div style="color: #E4B04A; font-size: 15px; font-weight: 900; font-family: monospace;">${formatRupiah(bndRev)}</div>` : ''}
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
                    return <Circle key={`circle-${store.id}`} center={[store.latitude, store.longitude]} radius={finalRadius} className="venn-heatmap-circle" pathOptions={{ color: 'transparent', fillColor: '#C4551E', fillOpacity: 0.35 }}/>;
                })}

                {/* 🚀 THE LEAFLET SUPERCLUSTER ENGINE */}
                <MarkerClusterGroup
                    chunkedLoading={true}
                    iconCreateFunction={createCustomClusterIcon}
                    maxClusterRadius={40}
                    spiderfyOnMaxZoom={true}
                    disableClusteringAtZoom={16} /* Ensures individual pins appear when zoomed in close */
                >
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
                </MarkerClusterGroup>

                {/* Every salesman as a gold chip at his last-seen point. Replaced the blue #3b82f6 avatar and
                    its dicebear image call (palette law; an outside request per agent). */}
                <ExpeditionLayer team={team} bare />
            </MapContainer>

            {activeStore && (
                <StoreBottomSheet 
                    store={activeStore} mapPoints={mapPoints} transactions={transactions} 
                    inventory={inventory} db={db} appId={appId} user={user} 
                    isAdmin={isAdmin} setSelectedStore={setSelectedStore} 
                    liveScaleOverride={liveScaleOverride} setLiveScaleOverride={setLiveScaleOverride}
                    setEditingStoreId={setEditingStoreId} setDragPinCoords={setDragPinCoords} canOverrideGps={canAddManualPin} 
                    activeTiers={activeTiers} setLocalTierUpdates={setLocalTierUpdates}
                    onNavigateToDirectory={onNavigateToDirectory} onShowStoreOnJourney={onShowStoreOnJourney}
                />
            )}
            
            {!showTacticalDash && !activeStore && <ZoneHUD zone={selectedZone} mapPoints={mapPoints} setSelectedZone={setSelectedZone} />}
            
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
                
                
                /* the house entrance (Journey's sheets): 220 ms, the strong ease-out, from 12 px - never from off-screen */
                @keyframes slide-in-left { from { transform: translateX(-12px); opacity: 0; } }
                .animate-slide-in-left { animation: slide-in-left 220ms cubic-bezier(.23, 1, .32, 1) both; }
                
                @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(3.5); opacity: 0; } }

                .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 2px; }
            `}</style>
        </div>
    );
};

export default MapMissionControl;