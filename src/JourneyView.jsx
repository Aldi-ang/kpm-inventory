import React, { useState, useEffect, useMemo } from 'react';
import { Truck, MapPin, CheckCircle, Calendar, Phone, Store, Navigation, X, Save, MessageSquare, RotateCcw, Globe, Target, AlertTriangle, Zap, Crosshair, Layers, ChevronDown, ListFilter } from 'lucide-react';
import { doc, updateDoc, serverTimestamp, deleteField, collection, getDocs } from "firebase/firestore";
import { MapContainer, TileLayer, Marker, Polyline, GeoJSON, Tooltip as LeafletTooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 🚀 SAFE LEAFLET ICON SETUP
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 🚀 SMART MAP CONTROLLER
const MapRecenter = ({ trigger, saveTrigger, savedHome, onSaveHome, defaultCenter }) => {
    const map = useMap();
    const isFirstRun = React.useRef(true);

    React.useEffect(() => {
        if (isFirstRun.current) { 
            isFirstRun.current = false;
            if (savedHome) map.setView(savedHome.center, savedHome.zoom);
            else if (defaultCenter) map.setView(defaultCenter, 12);
            return; 
        }
    }, [map, savedHome, defaultCenter]);
    
    React.useEffect(() => {
        if (trigger > 0) {
            if (savedHome) map.flyTo(savedHome.center, savedHome.zoom, { duration: 1.2 });
            else if (defaultCenter) map.flyTo(defaultCenter, 12, { duration: 1.2 });
        }
    }, [trigger]);

    React.useEffect(() => {
        if (saveTrigger > 0) {
            const center = [map.getCenter().lat, map.getCenter().lng];
            const zoom = map.getZoom();
            onSaveHome({ center, zoom });
        }
    }, [saveTrigger]);

    return null;
};

// 🚀 GEOFENCE MATH ENGINES (Ray-Casting Algorithm)
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
    } catch(e) { console.warn("Geofence parse error", e); }
    return false;
};

// 🚀 NEW: AUTO-SECTORING HIERARCHY ENGINE
const getStoreHierarchy = (lng, lat, fallbackCity, fallbackRegion, boundaries) => {
    // Default context for Indonesia
    let h = { Provinsi: 'JAWA TENGAH', Kabupaten: 'MAGELANG', Kecamatan: '' }; 
    const fLng = parseFloat(lng);
    const fLat = parseFloat(lat);
    let foundGeofence = false;

    // 1. Strict Map Physics Check
    if (!isNaN(fLng) && !isNaN(fLat) && boundaries && boundaries.length > 0) {
        const sortedBnd = [...boundaries].sort((a,b) => {
            const w = { 'Desa': 4, 'Kecamatan': 3, 'Kabupaten': 2, 'Provinsi': 1 };
            return (w[b.level] || 0) - (w[a.level] || 0);
        });

        for (let b of sortedBnd) {
            const geo = b.feature || b.geometry;
            if (geo && checkPointInGeoJSON(fLng, fLat, geo)) {
                if (b.level === 'Provinsi') h.Provinsi = b.name.toUpperCase();
                else if (b.level === 'Kabupaten') h.Kabupaten = b.name.toUpperCase();
                else {
                    h.Kecamatan = b.name.toUpperCase(); // Snap to specific boundary
                    foundGeofence = true;
                    break; 
                }
            }
        }
    }
    
    // 2. Auto-Correction Fallback if completely off-map
    if (!foundGeofence) {
        let fallbackKec = fallbackCity || 'UNMAPPED';
        let fallbackKab = fallbackRegion || 'MAGELANG';
        
        if (fallbackKec.toLowerCase().includes('pemuda')) fallbackKec = 'MUNTILAN';
        if (fallbackKab.toLowerCase().includes('pemuda')) fallbackKab = 'MAGELANG';
        
        h.Kecamatan = fallbackKec.toUpperCase();
        h.Kabupaten = fallbackKab.toUpperCase();
    }

    return h;
};

const JourneyView = ({ customers, db, appId, user, logAudit, triggerCapy, isAdmin, setActiveTab, tierSettings }) => {
    const [selectedDay, setSelectedDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
    
    // 🚀 NEW: CASCADING REGIONAL FILTERS
    const [selectedProvinsi, setSelectedProvinsi] = useState('All');
    const [selectedKabupaten, setSelectedKabupaten] = useState('All');
    const [selectedKecamatan, setSelectedKecamatan] = useState('All');
    
    const [collapsedSectors, setCollapsedSectors] = useState({});

    // MAP STATE
    const [recenterTrigger, setRecenterTrigger] = useState(0);
    const [saveHomeTrigger, setSaveHomeTrigger] = useState(0);
    const [showBorders, setShowBorders] = useState(true);
    const [savedHome, setSavedHome] = useState(() => JSON.parse(localStorage.getItem('journeyHomeView')) || null);
    const [boundaries, setBoundaries] = useState([]);

    const handleSaveHome = (viewData) => {
        setSavedHome(viewData);
        localStorage.setItem('journeyHomeView', JSON.stringify(viewData));
        if (triggerCapy) triggerCapy("Custom Map Home Saved! 🌍");
    };

    // LOAD GEO-BOUNDARIES
    useEffect(() => {
        const loadBorders = async () => {
            const CACHE_KEY = `cello_map_bnd_${appId}`;
            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData) {
                try { setBoundaries(JSON.parse(cachedData).filter(b => !b.isHidden)); } catch(e) {}
            }

            const userId = user?.uid || user?.id || 'default';
            if (!db || !appId || !userId) return;
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
                    const activeBorders = loaded.filter(b => !b.isHidden);
                    setBoundaries(activeBorders);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(loaded));
                }
            } catch(e) {}
        };
        loadBorders();
    }, [db, appId, user]);
    
    // CHECK-IN STATE
    const [checkInCustomer, setCheckInCustomer] = useState(null); 
    const [visitNote, setVisitNote] = useState("");
    const [visitTag, setVisitTag] = useState("Routine Check");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [streetRoute, setStreetRoute] = useState(null);

    const todayDate = new Date().toISOString().split('T')[0];

    // TRIP PLANNER
    const [agentsList, setAgentsList] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState('All');
    const [orderedRoute, setOrderedRoute] = useState([]);
    const [assignments, setAssignments] = useState({});

    // MEMORY
    useEffect(() => {
        const initialAssignments = {};
        const localCache = JSON.parse(localStorage.getItem('tripBuilderCache') || '{}');
        
        (customers || []).forEach(c => {
            if (c.assignedAgent) {
                initialAssignments[c.id] = c.assignedAgent;
            } else if (localCache[c.id] && localCache[c.id] !== 'Unassigned') {
                initialAssignments[c.id] = localCache[c.id];
            }
        });
        setAssignments(initialAssignments);
    }, [customers]);

    const handleAssignAgent = async (customerId, agentName) => {
        if (!isAdmin) return;
        const userId = user?.uid || user?.id || 'default';
        
        setAssignments(prev => ({ ...prev, [customerId]: agentName === 'Unassigned' ? null : agentName }));

        const localCache = JSON.parse(localStorage.getItem('tripBuilderCache') || '{}');
        if (agentName === 'Unassigned') delete localCache[customerId];
        else localCache[customerId] = agentName;
        localStorage.setItem('tripBuilderCache', JSON.stringify(localCache));

        const targetCustomer = customers.find(c => c.id === customerId);
        if (targetCustomer) {
            if (agentName === 'Unassigned') delete targetCustomer.assignedAgent;
            else targetCustomer.assignedAgent = agentName;
        }

        try {
            const customerRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, customerId);
            await updateDoc(customerRef, {
                assignedAgent: agentName === 'Unassigned' ? deleteField() : agentName,
                updatedAt: serverTimestamp()
            });
            if (logAudit) logAudit("AGENT_ASSIGNED", `Assigned ${agentName} to store.`);
        } catch (error) { console.error("Failed to save assignment to Firebase:", error); }
    };

    useEffect(() => {
        const fetchAgents = async () => {
            if (!user || !appId) return;
            const userId = user?.uid || user?.id || 'default';
            try {
                const [motoristsSnap, canvasSnap] = await Promise.all([
                    getDocs(collection(db, `artifacts/${appId}/users/${userId}/motorists`)),
                    getDocs(collection(db, `artifacts/${appId}/users/${userId}/canvas`))
                ]);
                const loadedMotorists = motoristsSnap.docs.map(doc => doc.data().name).filter(Boolean);
                const loadedCanvas = canvasSnap.docs.map(doc => doc.data().name).filter(Boolean);
                const allAgents = [...loadedMotorists, ...loadedCanvas].sort();
                setAgentsList(allAgents);
            } catch (error) { console.error("Failed to load Fleet Personnel:", error); }
        };
        fetchAgents();
    }, [db, appId, user]);

    // 🚀 NEW: BUILD DYNAMIC DROPDOWN LISTS
    const hierarchyData = useMemo(() => {
        const provs = new Set();
        const kabs = new Set();
        const kecs = new Set();
        
        (customers || []).forEach(c => {
            const h = getStoreHierarchy(c.longitude, c.latitude, c.city, c.region, boundaries);
            c._hierarchy = h; // Inject exact location into object
            provs.add(h.Provinsi);
            
            if (selectedProvinsi === 'All' || h.Provinsi === selectedProvinsi) {
                kabs.add(h.Kabupaten);
            }
            if ((selectedProvinsi === 'All' || h.Provinsi === selectedProvinsi) &&
                (selectedKabupaten === 'All' || h.Kabupaten === selectedKabupaten)) {
                kecs.add(h.Kecamatan);
            }
        });
        
        return {
            provs: Array.from(provs).sort(),
            kabs: Array.from(kabs).sort(),
            kecs: Array.from(kecs).sort()
        };
    }, [customers, boundaries, selectedProvinsi, selectedKabupaten]);

    // 🚀 APPLY ALL FILTERS
    useEffect(() => {
        let baseRoute = customers.filter(c => c.visitFreq === 7 || c.visitDay === selectedDay);
        
        if (selectedAgent !== 'All') baseRoute = baseRoute.filter(c => assignments[c.id] === selectedAgent);
        
        // Cascading Geographical Filter
        if (selectedProvinsi !== 'All') baseRoute = baseRoute.filter(c => c._hierarchy?.Provinsi === selectedProvinsi);
        if (selectedKabupaten !== 'All') baseRoute = baseRoute.filter(c => c._hierarchy?.Kabupaten === selectedKabupaten);
        if (selectedKecamatan !== 'All') baseRoute = baseRoute.filter(c => c._hierarchy?.Kecamatan === selectedKecamatan);
        
        setOrderedRoute(baseRoute);
    }, [customers, selectedDay, selectedAgent, selectedProvinsi, selectedKabupaten, selectedKecamatan, assignments]);

    const moveStore = (index, direction) => {
        const newRoute = [...orderedRoute];
        if (direction === 'up' && index > 0) {
            [newRoute[index - 1], newRoute[index]] = [newRoute[index], newRoute[index - 1]];
        } else if (direction === 'down' && index < newRoute.length - 1) {
            [newRoute[index + 1], newRoute[index]] = [newRoute[index], newRoute[index + 1]];
        }
        setOrderedRoute(newRoute);
    };

    const jumpToSequence = (oldIndex, newIndex) => {
        if (oldIndex === newIndex) return;
        const newRoute = [...orderedRoute];
        const [movedStore] = newRoute.splice(oldIndex, 1);
        newRoute.splice(newIndex, 0, movedStore);
        setOrderedRoute(newRoute);
    };

    const AGENT_COLORS = ['#3b82f6', '#a855f7', '#ec4899', '#eab308', '#06b6d4', '#f43f5e', '#8b5cf6', '#14b8a6'];
    
    const storeMetrics = useMemo(() => {
        const counters = {};
        const metrics = {};
        
        orderedRoute.forEach(store => {
            const agent = assignments[store.id] || 'Unassigned';
            if (!counters[agent]) counters[agent] = 0;
            counters[agent]++; 
            
            let color = '#64748b'; 
            if (agent !== 'Unassigned') {
                const agentIdx = agentsList.indexOf(agent);
                color = AGENT_COLORS[Math.max(0, agentIdx) % AGENT_COLORS.length];
            }
            metrics[store.id] = { stopNumber: counters[agent], color, agentName: agent };
        });
        return metrics;
    }, [orderedRoute, assignments, agentsList]);

    useEffect(() => {
        const fetchRoute = async () => {
            if (selectedAgent === 'All') return setStreetRoute(null);

            const validStops = orderedRoute.filter(c => c && typeof c.latitude === 'number' && typeof c.longitude === 'number' && !isNaN(c.latitude) && !isNaN(c.longitude));
            if (validStops.length < 2) return setStreetRoute(null);
            
            const coordsString = validStops.map(stop => `${stop.longitude},${stop.latitude}`).join(';');
            try {
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);
                const data = await response.json();
                if (data.routes && data.routes[0]) {
                    const flippedCoords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                    setStreetRoute(flippedCoords);
                }
            } catch (error) { console.error("OSRM Routing failed:", error); }
        };
        fetchRoute();
    }, [orderedRoute]); 
    
    const validStore = orderedRoute.find(c => c.latitude && c.longitude && !isNaN(c.latitude));
    const mapCenter = validStore ? [validStore.latitude, validStore.longitude] : [-7.6145, 110.7122];

    const handleUndoCheckIn = async (customer) => {
        if (!user) return;
        try {
            const customerRef = doc(db, `artifacts/${appId}/users/${user.uid}/customers`, customer.id);
            await updateDoc(customerRef, {
                lastVisit: null,
                lastVisitNote: deleteField(),
                lastVisitTag: deleteField(),
                updatedAt: serverTimestamp()
            });

            if (logAudit) await logAudit("VISIT_UNDO", `Undid visit for ${customer.name}`);
            if (triggerCapy) triggerCapy("Visit Cancelled. Bounty Restored. ↩️");
        } catch (error) {
            console.error("Undo Error:", error);
            alert("Failed to undo: " + error.message);
        }
    };

    const confirmCheckIn = async (e) => {
        e.preventDefault();
        if (!user || !checkInCustomer) return;
        
        setIsSubmitting(true);
        try {
            const customerRef = doc(db, `artifacts/${appId}/users/${user.uid}/customers`, checkInCustomer.id);
            await updateDoc(customerRef, {
                lastVisit: todayDate,
                lastVisitNote: `[${visitTag}] ${visitNote}`,
                lastVisitTag: visitTag,
                updatedAt: serverTimestamp()
            });

            if (logAudit) await logAudit("VISIT_REPORT", `Visited ${checkInCustomer.name} - ${visitTag}: ${visitNote}`);
            if (triggerCapy) triggerCapy(`Bounty Claimed! ✅`);
            
            setCheckInCustomer(null);
            setIsSubmitting(false);
        } catch (error) {
            console.error("Check-in Error:", error);
            alert("Failed to save report: " + error.message);
            setIsSubmitting(false);
        }
    };

    const QUICK_TAGS = ["Repeat Order 📦", "Stock Full (No Order) 🛑", "Competitor Issue ⚠️", "New Request 📝", "Store Closed 🔒"];

    const conqueredCount = orderedRoute.filter(c => c.lastVisit === todayDate).length;
    const progressPercent = orderedRoute.length > 0 ? Math.round((conqueredCount / orderedRoute.length) * 100) : 0;

    const sortedRoute = [...orderedRoute].sort((a, b) => {
        const aVis = a.lastVisit === todayDate ? 1 : 0;
        const bVis = b.lastVisit === todayDate ? 1 : 0;
        return aVis - bVis; 
    });

    // 🚀 AUTO-GROUP BY MATH SECTOR (Kecamatan)
    const groupedRoute = useMemo(() => {
        return sortedRoute.reduce((acc, customer) => {
            const sector = customer._hierarchy?.Kecamatan || 'Unassigned Sector';
            if (!acc[sector]) acc[sector] = [];
            acc[sector].push(customer);
            return acc;
        }, {});
    }, [sortedRoute]);

    const jumpToTerminal = (storeName) => {
        if (setActiveTab) setActiveTab('sales');
    };

    const jumpToMap = (storeId) => {
        if (setActiveTab) setActiveTab('map_war_room');
    };

    const toggleSectorCollapse = (sectorName) => {
        setCollapsedSectors(prev => ({ ...prev, [sectorName]: !prev[sectorName] }));
    };

    return (
        <div className="space-y-6 animate-fade-in relative font-mono">
            
            {/* 🚀 TACTICAL HUD HEADER */}
            <div className="bg-black/40 p-5 rounded-2xl border border-orange-500/20 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-4">
                    <div className="w-full lg:w-1/2">
                        <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-widest mb-3">
                            <Target size={28} className="text-orange-500 animate-pulse"/> 
                            Mission Feed
                        </h2>
                        <div className="flex flex-col gap-1.5 w-full">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-orange-400">
                                <span>Elimination Status</span>
                                <span className="text-white">{conqueredCount} / {orderedRoute.length} Secured</span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                                <div className="h-full bg-gradient-to-r from-orange-600 to-yellow-400 transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🚀 NEW: REGIONAL CASCADING FILTER CONSOLE */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 shadow-inner flex flex-wrap gap-4 mt-4">
                    
                    {/* Location Control */}
                    <div className="flex-1 min-w-[200px] flex flex-col gap-2 border-r border-slate-700 pr-4">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><MapPin size={12}/> Regional Command</label>
                        <div className="flex gap-2 w-full">
                            <select value={selectedProvinsi} onChange={(e) => { setSelectedProvinsi(e.target.value); setSelectedKabupaten('All'); setSelectedKecamatan('All'); }} className="flex-1 bg-black text-slate-300 font-bold text-[10px] uppercase p-2 rounded outline-none border border-slate-700 cursor-pointer">
                                <option value="All">All Prov</option>
                                {hierarchyData.provs.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <select value={selectedKabupaten} onChange={(e) => { setSelectedKabupaten(e.target.value); setSelectedKecamatan('All'); }} className="flex-1 bg-black text-slate-300 font-bold text-[10px] uppercase p-2 rounded outline-none border border-slate-700 cursor-pointer">
                                <option value="All">All Kab</option>
                                {hierarchyData.kabs.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <select value={selectedKecamatan} onChange={(e) => setSelectedKecamatan(e.target.value)} className="flex-1 bg-black text-orange-400 font-bold text-[10px] uppercase p-2 rounded outline-none border border-orange-500/50 focus:border-orange-500 cursor-pointer">
                                <option value="All">All Kec</option>
                                {hierarchyData.kecs.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Ops Control */}
                    <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><ListFilter size={12}/> Operational Filters</label>
                        <div className="flex gap-2">
                            <div className="flex items-center flex-1 bg-black p-1.5 rounded border border-slate-700">
                                <Truck size={14} className="text-emerald-400 ml-1 shrink-0"/>
                                <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="bg-transparent text-emerald-400 font-bold text-[10px] uppercase w-full outline-none cursor-pointer pl-1">
                                    <option value="All">Global Fleet</option>
                                    {agentsList.map(a => <option key={a} value={a}>{a}'s Bounties</option>)}
                                </select>
                            </div>
                            <div className="flex items-center flex-1 bg-black p-1.5 rounded border border-slate-700">
                                <Calendar size={14} className="text-blue-400 ml-1 shrink-0"/>
                                <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-transparent text-blue-400 font-bold text-[10px] uppercase w-full outline-none cursor-pointer pl-1">
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🚀 JOURNEY MAP RADAR */}
            <div className="w-full h-72 lg:h-[450px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-xl relative z-0">
                <div className="absolute top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-auto">
                    <button 
                        onClick={() => setShowBorders(!showBorders)}
                        className={`p-2.5 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.8)] border-2 transition-all active:scale-95 group flex items-center gap-2 ${showBorders ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                        title="Toggle Regional Borders"
                    >
                        <Layers size={20} className="transition-transform"/>
                        <span className="hidden group-hover:block text-[10px] font-black uppercase tracking-widest whitespace-nowrap pr-1">Borders</span>
                    </button>
                    <button 
                        onClick={() => setSaveHomeTrigger(prev => prev + 1)}
                        className="bg-slate-800/90 backdrop-blur p-2.5 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.8)] border-2 border-slate-600 text-orange-400 hover:bg-slate-700 hover:text-orange-300 transition-all active:scale-95 group flex items-center gap-2"
                        title="Save Current Map View as Default Home"
                    >
                        <MapPin size={20} className="group-hover:scale-110 transition-transform"/>
                        <span className="hidden group-hover:block text-[10px] font-black uppercase tracking-widest whitespace-nowrap pr-1">Set Home</span>
                    </button>
                    <button 
                        onClick={() => setRecenterTrigger(prev => prev + 1)}
                        className="bg-slate-800/90 backdrop-blur p-2.5 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.8)] border-2 border-slate-600 text-emerald-400 hover:bg-slate-700 hover:text-emerald-300 transition-all active:scale-95 group flex items-center gap-2"
                        title="Return to Saved Home View"
                    >
                        <Navigation size={20} className="group-hover:rotate-12 transition-transform"/>
                        <span className="hidden group-hover:block text-[10px] font-black uppercase tracking-widest whitespace-nowrap pr-1">Fly Home</span>
                    </button>
                </div>

                <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                    <MapRecenter trigger={recenterTrigger} saveTrigger={saveHomeTrigger} savedHome={savedHome} onSaveHome={handleSaveHome} defaultCenter={mapCenter} />
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    
                    {showBorders && boundaries.map((boundary) => {
                        const geoData = boundary.feature || boundary.geometry;
                        if (!geoData || !geoData.type) return null;
                        
                        const isSelected = selectedKecamatan === boundary.name.toUpperCase();
                        const fillColor = isSelected ? '#f97316' : boundary.color || '#38bdf8';
                        
                        return (
                            <GeoJSON 
                                key={`journey-bnd-${boundary.id}`}
                                data={geoData}
                                style={{ color: boundary.color || '#38bdf8', weight: isSelected ? 3 : 1.5, opacity: 0.6, fillOpacity: isSelected ? 0.2 : 0.05, fillColor: fillColor, dashArray: '5, 5' }}
                                onEachFeature={(f, layer) => {
                                    const ttContent = `<div style="color: ${boundary.color || '#cbd5e1'}; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; text-shadow: 2px 2px 4px rgba(0,0,0,0.8), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; opacity: 0.8; white-space: nowrap;">${boundary.name}</div>`;
                                    layer.bindTooltip(ttContent, { permanent: true, direction: "center", className: "region-watermark-label" });
                                }}
                            />
                        );
                    })}

                    {streetRoute && (
                        <Polyline positions={streetRoute} pathOptions={{ color: '#f97316', weight: 4, opacity: 0.8, dashArray: '10, 15' }} className="animate-pulse"/>
                    )}

                    {orderedRoute.map((store) => {
                        if (!store || typeof store.latitude !== 'number' || typeof store.longitude !== 'number' || isNaN(store.latitude)) return null;
                        
                        const isVisited = store.lastVisit === todayDate;
                        const iconHtml = isVisited ? '✅' : '📍';
                        
                        const metric = storeMetrics[store.id];
                        const ringColor = isVisited ? '#10b981' : metric.color;
                        const stopNum = metric.stopNumber;
                        const globalIdx = orderedRoute.findIndex(s => s.id === store.id);
                        
                        const customIcon = L.divIcon({
                            className: 'bg-transparent border-none',
                            html: `
                                <div style="background-color: #1e293b; width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${ringColor}; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 0 10px ${ringColor}80; transition: transform 0.2s;">
                                    ${iconHtml}
                                </div>
                            `,
                            iconSize: [28, 28],
                            iconAnchor: [14, 14]
                        });

                        return (
                            <Marker key={store.id} position={[store.latitude, store.longitude]} icon={customIcon}>
                                <LeafletTooltip direction="top" offset={[0, -15]} opacity={1} className="custom-leaflet-tooltip">
                                    <div className="bg-slate-900/95 backdrop-blur text-white px-3 py-1.5 rounded-lg border border-slate-700 shadow-xl text-xs font-bold whitespace-nowrap">
                                        <span style={{color: ringColor}} className="mr-1">#{stopNum}</span> {store.name}
                                    </div>
                                </LeafletTooltip>

                                <Popup closeButton={false} className="custom-popup" style={{ margin: '-13px' }}>
                                    <div className="bg-slate-900 p-4 rounded-xl shadow-2xl border border-slate-700 w-[240px] font-mono">
                                        <div className="flex justify-between items-start mb-3 border-b border-slate-700 pb-2">
                                            <p className="font-black text-white text-sm leading-tight pr-2 uppercase">{store.name}</p>
                                            <span 
                                                className="text-[10px] font-black px-2 py-1 rounded shadow-inner shrink-0 uppercase tracking-widest"
                                                style={{ backgroundColor: `${ringColor}33`, color: ringColor }}
                                            >
                                                {isVisited ? 'DONE' : `${metric.agentName === 'Unassigned' ? 'Unassigned' : metric.agentName.split(' ')[0]} #${stopNum}`}
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[9px] text-slate-400 mb-1 uppercase tracking-widest font-bold flex items-center gap-1"><MapPin size={10}/> Global Position:</label>
                                                <select
                                                    className="w-full bg-black text-xs font-bold uppercase p-2 rounded outline-none border border-slate-700 text-white focus:border-orange-500 transition-colors cursor-pointer"
                                                    value={globalIdx}
                                                    onChange={(e) => jumpToSequence(globalIdx, Number(e.target.value))}
                                                    style={{ colorScheme: 'dark' }}
                                                >
                                                    {orderedRoute.map((_, i) => (
                                                        <option key={i} value={i} className="bg-slate-900 text-white">Global Stop #{i + 1}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[9px] text-slate-400 mb-1 uppercase tracking-widest font-bold flex items-center gap-1"><Truck size={10}/> Assign Fleet:</label>
                                                <select 
                                                    className={`w-full bg-black text-xs font-bold uppercase p-2 rounded outline-none border transition-colors shadow-inner ${assignments[store.id] ? 'border-emerald-500 text-emerald-400' : 'border-slate-700 text-slate-300'} ${isAdmin ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                                                    value={assignments[store.id] || 'Unassigned'}
                                                    onChange={(e) => handleAssignAgent(store.id, e.target.value)}
                                                    style={{ colorScheme: 'dark' }}
                                                    disabled={!isAdmin}
                                                >
                                                    <option value="Unassigned" className="bg-slate-900 text-white">-- UNASSIGNED --</option>
                                                    {agentsList.map(a => <option key={a} value={a} className="bg-slate-900 text-white">{a}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>

            {/* 🚀 GAMIFIED SECTOR-GROUPED BOUNTY CARDS GRID */}
            <div className="pt-4 space-y-12">
                {Object.keys(groupedRoute).sort().map(sectorName => {
                    const sectorStores = groupedRoute[sectorName];
                    const completedInSector = sectorStores.filter(c => c.lastVisit === todayDate).length;
                    const isCollapsed = collapsedSectors[sectorName]; 
                    
                    return (
                        <div key={sectorName} className="animate-fade-in-up bg-black/20 p-4 rounded-3xl border border-white/5">
                            
                            {/* 🚀 INTERACTIVE SECTOR HEADER */}
                            <div 
                                onClick={() => toggleSectorCollapse(sectorName)}
                                className="flex items-center justify-between mb-2 cursor-pointer hover:bg-slate-800/50 p-3 rounded-2xl transition-colors border border-transparent hover:border-slate-700"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-orange-500/20 p-2.5 rounded-xl border border-orange-500/30">
                                        <MapPin className="text-orange-500" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none">{sectorName}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            Sector Status: <span className={completedInSector === sectorStores.length ? 'text-emerald-500' : 'text-orange-400'}>{completedInSector} / {sectorStores.length} Cleared</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400">
                                    <ChevronDown className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} size={20} />
                                </div>
                            </div>

                            {/* 🚀 SECTOR GRID (Hidden if collapsed) */}
                            {!isCollapsed && (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
                                    {sectorStores.map((customer) => {
                                        const isVisited = customer.lastVisit === todayDate;
                                        const originalIdx = orderedRoute.findIndex(c => c.id === customer.id);
                                        const tierLabel = customer.priceTier || customer.tier || 'Retail';

                                        return (
                                            <div key={customer.id} className={`bg-[#0f0e0d] rounded-2xl border-2 overflow-hidden flex flex-col relative transition-all duration-500 ${isVisited ? 'border-emerald-900/50 opacity-70 grayscale hover:grayscale-0' : 'border-slate-700 hover:border-orange-500 shadow-[0_10px_20px_rgba(0,0,0,0.5)] hover:-translate-y-1'}`}>
                                                
                                                {/* MASSIVE CLAIMED STAMP OVERLAY */}
                                                {isVisited && (
                                                    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
                                                        <div className="bg-emerald-900/80 text-emerald-400 border-4 border-emerald-500 px-6 py-2 rounded-xl font-black text-xl uppercase tracking-[0.3em] transform -rotate-12 shadow-[0_0_50px_rgba(16,185,129,0.4)] backdrop-blur-sm">
                                                            CLAIMED
                                                        </div>
                                                    </div>
                                                )}

                                                {/* SEQUENCE & FLEET CONTROLS (Top Bar) */}
                                                <div className="bg-black border-b border-slate-800 p-1.5 flex justify-between items-center z-10">
                                                    <div className="flex gap-1 relative z-20">
                                                        <button onClick={(e) => { e.stopPropagation(); moveStore(originalIdx, 'up'); }} disabled={originalIdx === 0 || isVisited} className="w-6 h-6 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-30 rounded text-slate-400 flex items-center justify-center font-bold transition-colors">↑</button>
                                                        <button onClick={(e) => { e.stopPropagation(); moveStore(originalIdx, 'down'); }} disabled={originalIdx === orderedRoute.length - 1 || isVisited} className="w-6 h-6 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-30 rounded text-slate-400 flex items-center justify-center font-bold transition-colors">↓</button>
                                                    </div>
                                                    <select 
                                                        className={`bg-slate-900 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded outline-none border transition-all relative z-20 ${assignments[customer.id] ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-700 text-slate-500'} ${isAdmin && !isVisited ? 'cursor-pointer hover:border-orange-500 hover:text-white' : 'pointer-events-none'}`}
                                                        value={assignments[customer.id] || 'Unassigned'}
                                                        onChange={(e) => handleAssignAgent(customer.id, e.target.value)}
                                                        style={{ colorScheme: 'dark' }}
                                                        disabled={!isAdmin || isVisited}
                                                    >
                                                        <option value="Unassigned">UNASSIGNED</option>
                                                        {agentsList.map(a => <option key={a} value={a}>{a}</option>)}
                                                    </select>
                                                </div>

                                                {/* TARGET IMAGE HEADER */}
                                                <div className="h-24 bg-black relative shrink-0 border-b border-slate-800">
                                                    {customer.storeImage ? (
                                                        <img src={customer.storeImage} className="w-full h-full object-cover opacity-60" alt="Store"/>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                                                            <Store size={24} className="mb-1 opacity-50"/>
                                                            <span className="text-[8px] font-black tracking-widest uppercase">No Intel</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* HUD Badges */}
                                                    <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                                                        <div className="bg-black/80 backdrop-blur border border-white/10 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                                                            <span style={{ color: storeMetrics[customer.id]?.color }}>●</span>
                                                            {storeMetrics[customer.id]?.agentName === 'Unassigned' ? 'UNASSIGNED' : storeMetrics[customer.id]?.agentName.split(' ')[0]} 
                                                            <span className="opacity-50">|</span> #{storeMetrics[customer.id]?.stopNumber}
                                                        </div>
                                                        <div className="bg-orange-600/90 backdrop-blur border border-orange-400 text-white text-[8px] font-black px-2 py-0.5 rounded w-max uppercase tracking-widest shadow-lg">
                                                            {tierLabel} TIER
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* BOUNTY DETAILS */}
                                                <div className="p-4 flex-1 flex flex-col bg-gradient-to-b from-[#1a1815] to-[#0f0e0d]">
                                                    <h3 className="font-black text-base text-white uppercase tracking-wider mb-2 leading-tight truncate">
                                                        {customer.name}
                                                    </h3>
                                                    
                                                    <div className="space-y-2 mb-4 flex-1">
                                                        <div className="flex items-start gap-2 text-slate-400 bg-black/40 p-2 rounded border border-white/5">
                                                            <MapPin size={12} className="shrink-0 text-blue-500 mt-0.5"/>
                                                            <div>
                                                                <p className="text-[10px] font-bold leading-relaxed line-clamp-2">{customer.address || "Address classification unknown"}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* COMBAT ACTION BUTTONS */}
                                                    <div className="flex flex-col gap-2 mt-auto relative z-20">
                                                        {!isVisited ? (
                                                            <>
                                                                <button 
                                                                    onClick={() => jumpToTerminal(customer.name)}
                                                                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white py-3 rounded-lg font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_5px_20px_rgba(249,115,22,0.4)] border border-orange-400"
                                                                >
                                                                    <Crosshair size={14}/> Engage Target
                                                                </button>
                                                                
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => jumpToMap(customer.id)}
                                                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-blue-400 py-2.5 rounded-lg font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all border border-slate-600"
                                                                    >
                                                                        <Globe size={12}/> Radar
                                                                    </button>
                                                                    
                                                                    <button 
                                                                        onClick={() => { setCheckInCustomer(customer); setVisitNote(""); setVisitTag("Store Closed 🔒"); }}
                                                                        className="flex-1 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 py-2.5 rounded-lg font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all border border-slate-600 hover:border-red-500/50"
                                                                    >
                                                                        <AlertTriangle size={12}/> Log Exception
                                                                    </button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <button 
                                                                onClick={() => {
                                                                    if (window.confirm(`Undo clearance for ${customer.name}? This removes the report from the database.`)) {
                                                                        handleUndoCheckIn(customer);
                                                                    }
                                                                }}
                                                                className="w-full bg-slate-900 hover:bg-red-900/40 text-slate-500 hover:text-red-400 py-3 rounded-lg font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all border border-slate-800 hover:border-red-900/50"
                                                            >
                                                                <RotateCcw size={14}/> Reverse Clearance
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* --- EXCEPTION MODAL AND CSS --- */}
            {checkInCustomer && (
                <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-mono">
                    <div className="bg-slate-900 w-full max-w-lg rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.2)] border-2 border-orange-500/50 flex flex-col overflow-hidden">
                        
                        <div className="bg-black/60 p-5 border-b border-slate-800 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-xl text-white flex items-center gap-3 uppercase tracking-widest">
                                    <AlertTriangle size={20} className="text-orange-500"/>
                                    Exception Log
                                </h3>
                                <p className="text-[10px] text-slate-400 tracking-widest uppercase mt-1">Target: {checkInCustomer.name}</p>
                            </div>
                            <button onClick={() => setCheckInCustomer(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Exception Reason</label>
                                <div className="flex flex-wrap gap-2">
                                    {QUICK_TAGS.map(tag => (
                                        <button 
                                            key={tag}
                                            onClick={() => setVisitTag(tag)}
                                            className={`px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                                                visitTag === tag 
                                                ? 'bg-orange-600 text-white border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]' 
                                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                                            }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                    <MessageSquare size={14}/> Field Intel (Notes)
                                </label>
                                <textarea 
                                    className="w-full p-4 rounded-xl bg-black border border-slate-700 text-white text-sm focus:border-orange-500 outline-none min-h-[120px] font-sans"
                                    placeholder="Provide intelligence on why the target was skipped or closed..."
                                    value={visitNote}
                                    onChange={(e) => setVisitNote(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="p-5 bg-black/60 border-t border-slate-800 flex gap-3">
                            <button 
                                onClick={() => setCheckInCustomer(null)}
                                className="flex-1 py-4 rounded-xl bg-slate-800 border border-slate-700 font-bold text-slate-400 hover:text-white hover:bg-slate-700 uppercase tracking-widest text-[10px] transition-colors"
                            >
                                Abort
                            </button>
                            <button 
                                onClick={confirmCheckIn}
                                disabled={isSubmitting}
                                className="flex-[2] py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-[0.2em] text-xs shadow-[0_0_20px_rgba(249,115,22,0.4)] disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save size={16}/> {isSubmitting ? 'Transmitting...' : 'Submit Intel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                .leaflet-tooltip-pane { z-index: 9999 !important; pointer-events: none !important; }
                .leaflet-tooltip.custom-leaflet-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
                .leaflet-tooltip.custom-leaflet-tooltip::before, .leaflet-tooltip.custom-leaflet-tooltip::after { display: none !important; }
                
                /* 🚀 NEW: Watermark Styling */
                .region-watermark-label { background: transparent !important; border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
                .region-watermark-label::before, .region-watermark-label::after { display: none !important; }
            `}</style>
        </div>
    );
};

export default JourneyView;