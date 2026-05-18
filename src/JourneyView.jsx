import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Truck, MapPin, CheckCircle, Calendar, Phone, Store, Navigation, X, Save, MessageSquare, RotateCcw, Globe, Target, AlertTriangle, Zap, Crosshair, Layers, ChevronDown, ListFilter, Paintbrush, LocateFixed, Maximize, Minimize } from 'lucide-react';
import { doc, updateDoc, serverTimestamp, deleteField, collection, getDocs, getDoc, setDoc } from "firebase/firestore";
import { MapContainer, TileLayer, Marker, Polyline, GeoJSON, Tooltip as LeafletTooltip, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 🚀 SAFE LEAFLET ICON SETUP
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 🚀 LIVE GPS ICON
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

const LocationController = ({ userLocation, setUserLocation, isEditing }) => {
    const map = useMap();
    const watchId = useRef(null);
    const isEditingRef = useRef(isEditing);

    // Keep the ref updated without causing re-renders in the watcher
    useEffect(() => {
        isEditingRef.current = isEditing;
    }, [isEditing]);

    const handleLocateClick = () => {
        if (userLocation) {
            map.flyTo(userLocation, 16, { duration: 1.2 });
        } 
        else if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords = [pos.coords.latitude, pos.coords.longitude];
                    setUserLocation(coords);
                    map.flyTo(coords, 16, { duration: 1.2 });
                },
                (err) => {
                    console.error(err);
                    alert("Please enable location permissions in your device settings.");
                },
                { enableHighAccuracy: true }
            );
        }

        if (!watchId.current && "geolocation" in navigator) {
            watchId.current = navigator.geolocation.watchPosition(
                (pos) => {
                    // 🚀 FIXED: Pause GPS state updates while dragging to prevent map re-rendering and snapping!
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
        <div className="absolute bottom-[20px] right-[10px] z-[999]">
            <button 
                onClick={handleLocateClick} 
                className={`bg-slate-800 text-white border p-3 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-colors border-slate-600 hover:bg-slate-700 hover:text-blue-400`}
                title="Locate Me"
            >
                <LocateFixed size={20} className={watchId.current ? "text-blue-400" : "text-slate-300"} />
            </button>
        </div>
    );
};

// 🚀 NEW: Click-to-Place Map Editor
const MapEditController = ({ isEditing, onMapClick }) => {
    useMapEvents({
        click(e) {
            if (isEditing) onMapClick(e.latlng);
        }
    });
    return null;
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
    } catch(e) { console.warn("Geofence parse error", e); }
    return false;
};

const getStoreHierarchy = (lng, lat, fallbackCity, fallbackRegion, boundaries) => {
    let h = { Provinsi: 'JAWA TENGAH', Kabupaten: 'MAGELANG', Kecamatan: '' }; 
    const fLng = parseFloat(lng);
    const fLat = parseFloat(lat);
    let foundGeofence = false;

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
                    h.Kecamatan = b.name.toUpperCase(); 
                    foundGeofence = true;
                    break; 
                }
            }
        }
    }
    
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

// 🚀 STRING HASHING ALGORITHM (Ensures universal colors across all devices)
const AGENT_COLORS = ['#3b82f6', '#a855f7', '#ec4899', '#eab308', '#06b6d4', '#f43f5e', '#8b5cf6', '#14b8a6'];
const getHashColor = (name) => {
    if (!name) return '#64748b';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AGENT_COLORS.length;
    return AGENT_COLORS[index];
};

const JourneyView = ({ customers, db, appId, user, logAudit, triggerCapy, isAdmin, setActiveTab, tierSettings }) => {
    const todayDate = new Date().toISOString().split('T')[0];
    const [selectedDay, setSelectedDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
    
    // 🚀 THE FAILSAFE PERMISSION ENGINE (Inverted Method)
    const [devUnlock, setDevUnlock] = useState(false);

    // Instead of guessing Tier 3's exact spelling, we grant access to EVERYONE 
    // *except* accounts explicitly marked as Tier 4 or Motoris. 
    const isExplicitlyTier4 = useMemo(() => {
        if (!user) return true; // Default lock if no user data
        const str = JSON.stringify(user).toLowerCase().replace(/[^a-z0-9]/g, '');
        // If the user profile contains tier4, level4, or motoris, they are locked out.
        return str.includes('tier4') || str.includes('level4') || str.includes('motoris');
    }, [user]);

    const canAssignFleet = devUnlock || isAdmin === true || user?.isAdmin === true || !isExplicitlyTier4;

    const [selectedProvinsi, setSelectedProvinsi] = useState('All');
    const [selectedKabupaten, setSelectedKabupaten] = useState('All');
    const [selectedKecamatan, setSelectedKecamatan] = useState('All');
    const [collapsedSectors, setCollapsedSectors] = useState({});

    const [activeBrush, setActiveBrush] = useState(null);
    const [activePopupId, setActivePopupId] = useState(null); // 🚀 NEW: Tracks which popup is open to hide tooltips

    // 🚀 FIXED: Instantly load cached colors to prevent flickering
    const [agentColors, setAgentColors] = useState(() => {
        const cached = localStorage.getItem(`cello_colors_${appId}`);
        return cached ? JSON.parse(cached) : {};
    });

    // 🚀 NEW MOBILE UI STATES
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false); // Default closed to save mobile space

    // 🚀 NEW: Drag & Drop GPS Pin Editor
    const [editingStoreId, setEditingStoreId] = useState(null);
    const [tempPinLocation, setTempPinLocation] = useState(null);

    const handleStartEditPin = (store) => {
        if (!canAssignFleet) return;
        setEditingStoreId(store.id);
        setTempPinLocation({ lat: store.latitude, lng: store.longitude });
        setActivePopupId(null); // Close popup
    };

    const handleConfirmPin = async () => {
        if (!tempPinLocation || !editingStoreId) return;
        try {
            const userId = user?.uid || user?.id || 'default';
            const customerRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, editingStoreId);
            
            // 🚀 FIXED: Robust Array/Object parser to fix cross-map vanishing bugs
            const finalLat = Number(parseFloat(tempPinLocation.lat ?? tempPinLocation[0]).toFixed(7));
            const finalLng = Number(parseFloat(tempPinLocation.lng ?? tempPinLocation[1]).toFixed(7));

            await updateDoc(customerRef, {
                latitude: finalLat,
                longitude: finalLng,
                updatedAt: serverTimestamp()
            });
            if (logAudit) logAudit("GPS_PIN_DRAGGED", `Manually dragged GPS pin to ${finalLat}, ${finalLng}`);
            if (triggerCapy) triggerCapy("📍 Target Coordinates Secured!");
            
            setEditingStoreId(null);
            setTempPinLocation(null);
        } catch (error) {
            console.error("Failed to update GPS:", error);
            alert("Database error: Could not save new GPS coordinates.");
        }
    };

    const handleCancelPin = () => {
        setEditingStoreId(null);
        setTempPinLocation(null);
    };

    const [recenterTrigger, setRecenterTrigger] = useState(0);
    const [saveHomeTrigger, setSaveHomeTrigger] = useState(0);
    const [showBorders, setShowBorders] = useState(true);
    const [savedHome, setSavedHome] = useState(() => JSON.parse(localStorage.getItem('journeyHomeView')) || null);
    const [boundaries, setBoundaries] = useState([]);
    
    const [userLocation, setUserLocation] = useState(null);

    const handleSaveHome = (viewData) => {
        setSavedHome(viewData);
        localStorage.setItem('journeyHomeView', JSON.stringify(viewData));
        if (triggerCapy) triggerCapy("Custom Map Home Saved! 🌍");
    };

    useEffect(() => {
        const loadColors = async () => {
            const userId = user?.uid || user?.id;
            if (!db || !appId || !userId) return;
            try {
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/mapSettings`, 'agentColors');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const dbColors = snap.data();
                    setAgentColors(dbColors);
                    localStorage.setItem(`cello_colors_${appId}`, JSON.stringify(dbColors)); // Sync cache
                }
            } catch(e) { console.error("Failed to load custom colors", e); }
        };
        loadColors();
    }, [db, appId, user]);

    // 🚀 FIXED: UI updates instantly and caches locally to survive Firebase permission blocks
    const handleColorChange = (agentName, newColor) => {
        if (!canAssignFleet) return; 
        const updatedColors = { ...agentColors, [agentName]: newColor };
        setAgentColors(updatedColors); 
        localStorage.setItem(`cello_colors_${appId}`, JSON.stringify(updatedColors)); 
    };

    // 🚀 FIXED: Only fires ONCE when the user closes the color picker
    const saveColorToDB = async (agentName, newColor) => {
        if (!canAssignFleet) return;
        try {
            const userId = user?.uid || user?.id;
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/mapSettings`, 'agentColors');
            await setDoc(docRef, { [agentName]: newColor }, { merge: true });
        } catch(e) { console.error("Failed to sync color to DB", e); }
    };

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
    
    const [checkInCustomer, setCheckInCustomer] = useState(null); 
    const [visitNote, setVisitNote] = useState("");
    const [visitTag, setVisitTag] = useState("Routine Check");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [streetRoute, setStreetRoute] = useState(null);

    const [agentsList, setAgentsList] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState('All');
    const [orderedRoute, setOrderedRoute] = useState([]);
    const [assignments, setAssignments] = useState({});

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
        if (!canAssignFleet) return; 
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

    const hasMigratedGhosts = useRef(false);
    useEffect(() => {
        if (!canAssignFleet || agentsList.length === 0 || !customers || customers.length === 0 || hasMigratedGhosts.current) return;
        
        let batchUpdates = false;
        const updatedAssignments = { ...assignments };

        customers.forEach(c => {
            const currentAgent = c.assignedAgent;
            if (currentAgent && currentAgent !== 'Unassigned' && !agentsList.includes(currentAgent)) {
                const match = agentsList.find(a => 
                    currentAgent.toLowerCase().includes(a.toLowerCase()) || 
                    a.toLowerCase().includes(currentAgent.toLowerCase())
                );
                
                const newAgent = match || 'Unassigned';
                updatedAssignments[c.id] = newAgent === 'Unassigned' ? null : newAgent;
                batchUpdates = true;

                const userId = user?.uid || user?.id || 'default';
                const ref = doc(db, `artifacts/${appId}/users/${userId}/customers`, c.id);
                updateDoc(ref, {
                    assignedAgent: newAgent === 'Unassigned' ? deleteField() : newAgent
                }).catch(console.error);
            }
        });

        if (batchUpdates) {
            setAssignments(updatedAssignments);
            localStorage.setItem('tripBuilderCache', JSON.stringify(updatedAssignments));
        }
        hasMigratedGhosts.current = true;
    }, [agentsList, customers, canAssignFleet, db, appId, user, assignments]);

    const globalAgentList = useMemo(() => {
        const agents = new Set(agentsList);
        (customers || []).forEach(c => {
            if (c.assignedAgent && c.assignedAgent !== 'Unassigned') agents.add(c.assignedAgent);
            if (assignments[c.id] && assignments[c.id] !== 'Unassigned') agents.add(assignments[c.id]);
        });
        return Array.from(agents).sort();
    }, [agentsList, customers, assignments]);

    const hierarchyData = useMemo(() => {
        const provs = new Set();
        const kabs = new Set();
        const kecs = new Set();
        
        (customers || []).forEach(c => {
            const h = getStoreHierarchy(c.longitude, c.latitude, c.city, c.region, boundaries);
            c._hierarchy = h; 
            provs.add(h.Provinsi);
            
            if (selectedProvinsi === 'All' || h.Provinsi === selectedProvinsi) kabs.add(h.Kabupaten);
            if ((selectedProvinsi === 'All' || h.Provinsi === selectedProvinsi) &&
                (selectedKabupaten === 'All' || h.Kabupaten === selectedKabupaten)) {
                kecs.add(h.Kecamatan);
            }
        });
        
        return { provs: Array.from(provs).sort(), kabs: Array.from(kabs).sort(), kecs: Array.from(kecs).sort() };
    }, [customers, boundaries, selectedProvinsi, selectedKabupaten]);

    useEffect(() => {
        let baseRoute = customers.filter(c => c.visitFreq === 7 || c.visitDay === selectedDay);
        
        if (selectedAgent !== 'All') baseRoute = baseRoute.filter(c => assignments[c.id] === selectedAgent);
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

    const storeMetrics = useMemo(() => {
        const counters = {};
        const metrics = {};
        
        orderedRoute.forEach(store => {
            let agent = assignments[store.id] || 'Unassigned';
            
            if (agent !== 'Unassigned' && !globalAgentList.includes(agent)) {
                agent = 'Unassigned';
            }

            if (!counters[agent]) counters[agent] = 0;
            counters[agent]++; 
            
            let color = '#64748b'; 
            if (agent !== 'Unassigned') {
                color = agentColors[agent] || getHashColor(agent);
            }
            metrics[store.id] = { stopNumber: counters[agent], color, agentName: agent };
        });
        return metrics;
    }, [orderedRoute, assignments, globalAgentList, agentColors]);

    const getBountyStatus = (customer) => {
        const freq = customer.visitFreq || 7;
        if (!customer.lastVisit) return { text: "⚠️ CRITICAL: NEVER VISITED", color: "bg-red-600 text-white", border: "border-red-500", flashing: true };
        
        const parseDate = (dStr) => {
            const [y, m, d] = dStr.split('-');
            return new Date(y, m-1, d);
        };
        
        const lastDate = parseDate(customer.lastVisit.split('T')[0]);
        const now = parseDate(todayDate);
        
        const diffTime = now - lastDate; 
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const daysLeft = freq - diffDays;

        if (daysLeft > 2) return { text: `STATUS: SAFE (${daysLeft} Days Left)`, color: "bg-emerald-900/60 text-emerald-400", border: "border-emerald-500/50" };
        if (daysLeft > 0) return { text: `EXPIRING SOON (${daysLeft} Days Left)`, color: "bg-yellow-900/60 text-yellow-400", border: "border-yellow-500/50" };
        return { text: `⚠️ CRITICAL: OVERDUE BY ${Math.abs(daysLeft)} DAYS`, color: "bg-red-600 text-white", border: "border-red-500", flashing: true };
    };

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
        } catch (error) { console.error("Undo Error:", error); alert("Failed to undo: " + error.message); }
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
        } catch (error) { console.error("Check-in Error:", error); alert("Failed to save report: " + error.message); setIsSubmitting(false); }
    };

    const QUICK_TAGS = ["Repeat Order 📦", "Stock Full (No Order) 🛑", "Competitor Issue ⚠️", "New Request 📝", "Store Closed 🔒"];

    const conqueredCount = orderedRoute.filter(c => c.lastVisit === todayDate).length;
    const progressPercent = orderedRoute.length > 0 ? Math.round((conqueredCount / orderedRoute.length) * 100) : 0;

    const sortedRoute = [...orderedRoute].sort((a, b) => {
        const aVis = a.lastVisit === todayDate ? 1 : 0;
        const bVis = b.lastVisit === todayDate ? 1 : 0;
        return aVis - bVis; 
    });

    const groupedRoute = useMemo(() => {
        return sortedRoute.reduce((acc, customer) => {
            const sector = customer._hierarchy?.Kecamatan || 'Unassigned Sector';
            if (!acc[sector]) acc[sector] = [];
            acc[sector].push(customer);
            return acc;
        }, {});
    }, [sortedRoute]);

    const jumpToTerminal = (storeName) => { if (setActiveTab) setActiveTab('sales'); };
    const jumpToMap = (storeId) => { if (setActiveTab) setActiveTab('map_war_room'); };
    const toggleSectorCollapse = (sectorName) => setCollapsedSectors(prev => ({ ...prev, [sectorName]: !prev[sectorName] }));

    const handleOpenLocation = (customer) => {
        if (customer.gmapsUrl) { 
            window.open(customer.gmapsUrl, '_blank'); 
            return; 
        }
        if (customer.latitude && customer.longitude) {
            // 🚀 FIXED: The TRUE Google Maps URL
            window.open(`https://maps.google.com/?q=${customer.latitude},${customer.longitude}`, '_blank');
        } else {
            alert("No GPS Coordinates found for this target.");
        }
    };

    // 🚀 FIXED: Lock background scrolling when map is Fullscreen
    useEffect(() => {
        if (isFullScreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isFullScreen]);

    return (
        <div className={`space-y-6 font-mono ${isFullScreen ? 'static z-[9999]' : 'animate-fade-in relative'}`}>
            {activeBrush && <style>{`.leaflet-container { cursor: crosshair !important; } .custom-icon { cursor: crosshair !important; }`}</style>}

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

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 shadow-inner flex flex-wrap gap-4 mt-4">
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

                    <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><ListFilter size={12}/> Operational Filters</label>
                        <div className="flex gap-2">
                            <div className="flex items-center flex-1 bg-black p-1.5 rounded border border-slate-700">
                                <Truck size={14} className="text-emerald-400 ml-1 shrink-0"/>
                                <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="bg-transparent text-emerald-400 font-bold text-[10px] uppercase w-full outline-none cursor-pointer pl-1">
                                    <option value="All">Global Fleet</option>
                                    {globalAgentList.map(a => <option key={a} value={a}>{a}'s Bounties</option>)}
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
            <div 
                className={`${isFullScreen ? 'fixed inset-0 z-[9999] rounded-none' : 'relative w-full h-[400px] lg:h-[500px] rounded-2xl'} bg-slate-900 overflow-hidden border border-slate-700 shadow-xl transition-all duration-300`}
                style={isFullScreen ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', margin: 0, padding: 0 } : {}}
            >
                
                {/* 🚀 COLLAPSIBLE UNIVERSAL UI (Paintbrush/Legend) */}
                <div className="absolute bottom-4 left-4 z-[9999] flex flex-col gap-2 items-start pointer-events-none">
                    {/* TOGGLE BUTTON */}
                    <button 
                        onClick={() => setIsPanelOpen(!isPanelOpen)} 
                        onDoubleClick={() => setDevUnlock(true)}
                        title="Double-Tap to Override Permissions"
                        className="pointer-events-auto bg-slate-900/95 backdrop-blur border border-slate-700 p-2.5 rounded-xl shadow-xl flex items-center gap-2 hover:bg-slate-800 transition-colors active:scale-95 select-none"
                    >
                        {canAssignFleet ? <Paintbrush size={16} className="text-orange-500"/> : <Globe size={16} className="text-blue-500"/>}
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">{canAssignFleet ? 'Paintbrush' : 'Squad Legend'}</span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isPanelOpen ? 'rotate-180' : ''}`}/>
                    </button>

                    {/* HIDDEN UNTIL CLICKED */}
                    {isPanelOpen && (
                        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.8)] max-h-[60vh] overflow-y-auto flex flex-col gap-2 custom-scrollbar w-max animate-fade-in-up">
                            {canAssignFleet && (
                                <>
                                    <button 
                                        onClick={() => setActiveBrush(null)}
                                        className={`flex items-center justify-center gap-2 p-2 rounded-xl border transition-all text-[10px] uppercase tracking-widest font-black ${activeBrush === null ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                                    >
                                        <X size={14}/> Disable Brush
                                    </button>
                                    <button 
                                        onClick={() => setActiveBrush('Unassigned')}
                                        className={`flex items-center justify-center gap-2 p-2 rounded-xl border transition-all text-xs font-bold ${activeBrush === 'Unassigned' ? 'bg-slate-200 text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                                    >
                                        <div className="w-3 h-3 rounded-full bg-slate-500"></div> Unassign
                                    </button>
                                </>
                            )}
                            
                            {globalAgentList.map(a => {
                                const color = agentColors[a] || getHashColor(a);
                                const isActive = activeBrush === a;
                                return (
                                    <div key={a} className="flex items-center gap-2">
                                        <button 
                                            onClick={() => canAssignFleet && setActiveBrush(a)}
                                            disabled={!canAssignFleet}
                                            className={`flex-1 flex items-center gap-2 p-2 rounded-xl border transition-all text-xs font-bold ${isActive ? 'bg-slate-800 text-white shadow-[0_0_15px_rgba(0,0,0,0.5)]' : 'bg-slate-800/50 text-slate-400 border-transparent'} ${canAssignFleet ? 'hover:bg-slate-700 cursor-pointer' : 'cursor-default'}`}
                                            style={{ borderColor: isActive ? color : 'transparent' }}
                                        >
                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: color, boxShadow: isActive ? `0 0 10px ${color}` : 'none' }}></div> 
                                            <span className="truncate max-w-[80px]">{a.split(' ')[0]}</span>
                                        </button>
                                        {canAssignFleet && (
                                            <div className="relative w-8 h-8 shrink-0 rounded-lg overflow-hidden border border-slate-600 cursor-pointer hover:border-white transition-colors shadow-inner" title="Change Squad Color">
                                                <input 
                                                    type="color" 
                                                    value={color} 
                                                    onChange={(e) => handleColorChange(a, e.target.value)} 
                                                    onBlur={(e) => saveColorToDB(a, e.target.value)}
                                                    className="absolute inset-[-10px] w-12 h-12 cursor-pointer"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* 🚀 DRAG PIN EDITING OVERLAY (COMPACT) */}
                {editingStoreId && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900/95 backdrop-blur border-2 border-orange-500 p-2.5 rounded-xl shadow-[0_0_30px_rgba(249,115,22,0.5)] flex flex-col items-center gap-2 pointer-events-auto animate-fade-in-up w-max min-w-[220px]">
                        <div className="flex flex-col text-center">
                            <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1"><MapPin size={12}/> Edit Pin Location</span>
                            <span className="text-slate-300 text-[9px] font-bold mt-0.5 leading-tight">Drag pin or tap map to move.</span>
                        </div>
                        <div className="flex gap-2 w-full">
                            <button onClick={handleCancelPin} className="flex-1 bg-slate-800 text-slate-400 hover:text-white py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-700 transition-colors px-4">Cancel</button>
                            <button onClick={handleConfirmPin} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 px-4"><Save size={12}/> Save</button>
                        </div>
                    </div>
                )}

                {/* 🚀 TOP RIGHT MAP CONTROLS */}
                <div className="absolute top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-auto">
                    {/* FULLSCREEN TOGGLE */}
                    <button 
                        onClick={() => {
                            setIsFullScreen(!isFullScreen);
                            setTimeout(() => window.dispatchEvent(new Event('resize')), 200); // Forces Map to redraw
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.8)] border-2 border-blue-400 transition-all active:scale-95 group flex items-center gap-2"
                        title="Toggle Fullscreen Map"
                    >
                        {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        <span className="hidden group-hover:block text-[10px] font-black uppercase tracking-widest whitespace-nowrap pr-1">
                            {isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        </span>
                    </button>

                    <button 
                        onClick={() => setShowBorders(!showBorders)}
                        className={`p-2.5 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.8)] border-2 transition-all active:scale-95 group flex items-center gap-2 ${showBorders ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:bg-slate-700'}`}
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
                    
                    <LocationController userLocation={userLocation} setUserLocation={setUserLocation} isEditing={!!editingStoreId} />
                    <MapEditController isEditing={!!editingStoreId} onMapClick={(latlng) => setTempPinLocation({ lat: latlng.lat, lng: latlng.lng })} />
                    
                    {userLocation && (
                        <Marker position={userLocation} icon={userLocationIcon} zIndexOffset={9999} interactive={false} />
                    )}

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
                        if (!store) return null;
                        
                        // 🚀 DATA RECOVERY ENGINE: Auto-recover corrupted coordinates
                        let lat = parseFloat(store.latitude);
                        let lng = parseFloat(store.longitude);
                        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0 || !store.latitude) {
                            lat = -7.5845; // Default Muntilan Center
                            lng = 110.2895;
                        }
                        
                        const isVisited = store.lastVisit === todayDate;
                        const iconHtml = isVisited ? '✅' : '📍';
                        const metric = storeMetrics[store.id];
                        const stopNum = metric.stopNumber;
                        const globalIdx = orderedRoute.findIndex(s => s.id === store.id);
                        const statusBadge = getBountyStatus(store);
                        
                        const isEditing = editingStoreId === store.id;

                        let ringColor;
                        if (isVisited) ringColor = '#10b981'; 
                        else if (metric.agentName === 'Unassigned') ringColor = '#94a3b8'; 
                        else ringColor = metric.color; 
                        
                        // Override ring color to bright orange if editing
                        const finalRingColor = isEditing ? '#f97316' : ringColor;
                        // 🚀 FIXED: Feeds the safe recovered coordinates (lat, lng) to the marker instead of raw store data
                        const markerPos = isEditing && tempPinLocation ? [tempPinLocation.lat, tempPinLocation.lng] : [lat, lng];
                        
                        const customIcon = L.divIcon({
                            className: 'bg-transparent border-none',
                            html: `
                                <div style="background-color: #1e293b; width: ${isEditing ? '34px' : '28px'}; height: ${isEditing ? '34px' : '28px'}; border-radius: 50%; border: 2px solid ${finalRingColor}; display: flex; align-items: center; justify-content: center; font-size: ${isEditing ? '16px' : '12px'}; box-shadow: 0 0 ${isEditing ? '25px' : '10px'} ${finalRingColor}${isEditing ? 'ff' : '80'}; transition: all 0.2s;">
                                    ${isEditing ? '🖐️' : iconHtml}
                                </div>
                            `,
                            iconSize: [isEditing ? 34 : 28, isEditing ? 34 : 28],
                            iconAnchor: [isEditing ? 17 : 14, isEditing ? 17 : 14]
                        });

                        return (
                            <Marker 
                                key={store.id} 
                                position={markerPos} 
                                icon={customIcon}
                                draggable={isEditing}
                                zIndexOffset={isEditing ? 9999 : 0}
                                eventHandlers={{
                                    click: (e) => {
                                        if (isEditing) return; // Disable clicks while dragging
                                        setActivePopupId(store.id); 
                                        if (canAssignFleet && activeBrush) {
                                            handleAssignAgent(store.id, activeBrush);
                                            e.originalEvent.stopPropagation();
                                        }
                                    },
                                    dragend: (e) => {
                                        if (isEditing) {
                                            const marker = e.target;
                                            const pos = marker.getLatLng();
                                            setTempPinLocation({ lat: pos.lat, lng: pos.lng });
                                        }
                                    }
                                }}
                            >
                                {/* 🚀 FIXED: Tooltip hides when Popup or Editing is open */}
                                {activePopupId !== store.id && !isEditing && (
                                    <LeafletTooltip direction="top" offset={[0, -15]} opacity={1} className="custom-leaflet-tooltip">
                                        <div className="bg-slate-900/95 backdrop-blur text-white px-3 py-1.5 rounded-lg border border-slate-700 shadow-xl text-xs font-bold whitespace-nowrap">
                                            <span style={{color: ringColor}} className="mr-1">#{stopNum}</span> {store.name}
                                        </div>
                                    </LeafletTooltip>
                                )}

                                {(!canAssignFleet || !activeBrush) && (
                                    <Popup 
                                        closeButton={false} 
                                        className="custom-popup" 
                                        style={{ margin: '-13px' }}
                                        onClose={() => setActivePopupId(null)} // 🚀 NEW: Restores tooltip when closed
                                    >
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
                                            
                                            <div className={`mb-3 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest text-center ${statusBadge.color} ${statusBadge.border} ${statusBadge.flashing ? 'animate-pulse' : ''}`}>
                                                {statusBadge.text}
                                            </div>
                                            
                                            <div className="space-y-3">
                                                {/* 🚀 FIXED: Replaced Global Position with Real Info & Actions */}
                                                <div className="flex gap-2">
                                                    <div className="flex-1 bg-black p-2 rounded border border-slate-700 text-center flex flex-col justify-center gap-0.5">
                                                        <span className="block text-[8px] text-slate-500 uppercase font-black">Performance Rank</span>
                                                        <span className="text-[10px] text-orange-400 font-bold uppercase leading-none">{store.tier || 'RETAIL'}</span>
                                                        {store.priceTier && store.priceTier !== store.tier && (
                                                            <span className="text-[8px] text-blue-400 font-bold uppercase leading-none mt-0.5">Price: {store.priceTier}</span>
                                                        )}
                                                    </div>
                                                    {store.phone ? (
                                                        <a 
                                                            href={`https://wa.me/${store.phone.replace(/\D/g, '')}`} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="flex-1 bg-[#25D366]/10 hover:bg-[#25D366]/30 border border-[#25D366]/50 text-[#25D366] p-2 rounded flex flex-col items-center justify-center transition-colors shadow-inner"
                                                        >
                                                            <MessageSquare size={12} className="mb-0.5"/>
                                                            <span className="text-[8px] font-black uppercase tracking-widest">WhatsApp</span>
                                                        </a>
                                                    ) : (
                                                        <div className="flex-1 bg-slate-800 border border-slate-700 text-slate-500 p-2 rounded flex flex-col items-center justify-center">
                                                            <Phone size={12} className="mb-0.5"/>
                                                            <span className="text-[8px] font-black uppercase tracking-widest">No Phone</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 🚀 NEW: Drag & Drop Relocation Tool for Commanders */}
                                                {canAssignFleet && (
                                                    <button 
                                                        onClick={() => handleStartEditPin(store)}
                                                        className="w-full bg-slate-800 hover:bg-orange-900/40 text-slate-400 hover:text-orange-400 border border-slate-600 hover:border-orange-500 p-2.5 rounded flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-inner"
                                                    >
                                                        <MapPin size={14} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Adjust Pin Location</span>
                                                    </button>
                                                )}

                                                <div>
                                                    <label className="text-[9px] text-slate-400 mb-1 uppercase tracking-widest font-bold flex items-center gap-1"><Truck size={10}/> Assign Fleet:</label>
                                                    <select 
                                                        className={`w-full bg-black text-xs font-bold uppercase p-2 rounded outline-none border transition-colors shadow-inner ${assignments[store.id] ? 'border-emerald-500 text-emerald-400' : 'border-slate-700 text-slate-300'} ${canAssignFleet ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                                                        value={assignments[store.id] || 'Unassigned'}
                                                        onChange={(e) => handleAssignAgent(store.id, e.target.value)}
                                                        style={{ colorScheme: 'dark' }}
                                                        disabled={!canAssignFleet}
                                                    >
                                                        <option value="Unassigned" className="bg-slate-900 text-white">-- UNASSIGNED --</option>
                                                        {globalAgentList.map(a => <option key={a} value={a} className="bg-slate-900 text-white">{a}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => handleOpenLocation(store)}
                                                className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black py-3 rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                            >
                                                <Navigation size={14}/> Navigate via Google Maps
                                            </button>
                                        </div>
                                    </Popup>
                                )}
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>

            <div className="pt-4 space-y-12">
                {Object.keys(groupedRoute).sort().map(sectorName => {
                    const sectorStores = groupedRoute[sectorName];
                    const completedInSector = sectorStores.filter(c => c.lastVisit === todayDate).length;
                    const isCollapsed = collapsedSectors[sectorName]; 
                    
                    return (
                        <div key={sectorName} className="animate-fade-in-up bg-black/20 p-4 rounded-3xl border border-white/5">
                            
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

                            {!isCollapsed && (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
                                    {sectorStores.map((customer) => {
                                        const isVisited = customer.lastVisit === todayDate;
                                        const originalIdx = orderedRoute.findIndex(c => c.id === customer.id);
                                        // 🚀 FIXED: Split the labels so Price Tier doesn't permanently hide the Performance Rank!
                                        const tierLabel = customer.tier || 'Retail';
                                        const priceLabel = customer.priceTier || 'Retail';
                                        
                                        const metric = storeMetrics[customer.id];
                                        const ringColor = isVisited ? '#10b981' : (metric.agentName === 'Unassigned' ? '#94a3b8' : metric.color);
                                        const statusBadge = getBountyStatus(customer);

                                        return (
                                            <div key={customer.id} className={`bg-[#0f0e0d] rounded-2xl border-2 overflow-hidden flex flex-col relative transition-all duration-500 ${isVisited ? 'border-emerald-900/50 opacity-70 grayscale hover:grayscale-0' : 'border-slate-700 hover:border-orange-500 shadow-[0_10px_20px_rgba(0,0,0,0.5)] hover:-translate-y-1'}`}>
                                                
                                                {isVisited && (
                                                    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
                                                        <div className="bg-emerald-900/80 text-emerald-400 border-4 border-emerald-500 px-6 py-2 rounded-xl font-black text-xl uppercase tracking-[0.3em] transform -rotate-12 shadow-[0_0_50px_rgba(16,185,129,0.4)] backdrop-blur-sm">
                                                            CLAIMED
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="bg-black border-b border-slate-800 p-1.5 flex justify-between items-center z-10">
                                                    <div className="flex gap-1 relative z-20">
                                                        <button onClick={(e) => { e.stopPropagation(); moveStore(originalIdx, 'up'); }} disabled={originalIdx === 0 || isVisited} className="w-6 h-6 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-30 rounded text-slate-400 flex items-center justify-center font-bold transition-colors">↑</button>
                                                        <button onClick={(e) => { e.stopPropagation(); moveStore(originalIdx, 'down'); }} disabled={originalIdx === orderedRoute.length - 1 || isVisited} className="w-6 h-6 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-30 rounded text-slate-400 flex items-center justify-center font-bold transition-colors">↓</button>
                                                    </div>
                                                    <select 
                                                        className={`bg-slate-900 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded outline-none border transition-all relative z-20 ${assignments[customer.id] ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-700 text-slate-500'} ${canAssignFleet && !isVisited ? 'cursor-pointer hover:border-orange-500 hover:text-white' : 'pointer-events-none'}`}
                                                        value={assignments[customer.id] || 'Unassigned'}
                                                        onChange={(e) => handleAssignAgent(customer.id, e.target.value)}
                                                        style={{ colorScheme: 'dark' }}
                                                        disabled={!canAssignFleet || isVisited}
                                                    >
                                                        <option value="Unassigned">UNASSIGNED</option>
                                                        {globalAgentList.map(a => <option key={a} value={a}>{a}</option>)}
                                                    </select>
                                                </div>

                                                <div className="h-24 bg-black relative shrink-0 border-b border-slate-800">
                                                    {customer.storeImage ? (
                                                        <img src={customer.storeImage} className="w-full h-full object-cover opacity-60" alt="Store"/>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                                                            <Store size={24} className="mb-1 opacity-50"/>
                                                            <span className="text-[8px] font-black tracking-widest uppercase">No Intel</span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                                                        <div className="bg-black/80 backdrop-blur border border-white/10 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                                                            <span style={{ color: ringColor }}>●</span>
                                                            {metric.agentName === 'Unassigned' ? 'UNASSIGNED' : metric.agentName.split(' ')[0]} 
                                                            <span className="opacity-50">|</span> #{metric.stopNumber}
                                                        </div>
                                                        <div className="flex gap-1 flex-wrap">
                                                            <div className="bg-orange-600/90 backdrop-blur border border-orange-400 text-white text-[8px] font-black px-2 py-0.5 rounded w-max uppercase tracking-widest shadow-lg">
                                                                RANK: {tierLabel}
                                                            </div>
                                                            {priceLabel !== tierLabel && (
                                                                <div className="bg-blue-600/90 backdrop-blur border border-blue-400 text-white text-[8px] font-black px-2 py-0.5 rounded w-max uppercase tracking-widest shadow-lg">
                                                                    PRICE: {priceLabel}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 flex-1 flex flex-col bg-gradient-to-b from-[#1a1815] to-[#0f0e0d]">
                                                    <h3 className="font-black text-base text-white uppercase tracking-wider mb-2 leading-tight truncate">
                                                        {customer.name}
                                                    </h3>
                                                    
                                                    <div className={`mb-3 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest w-max ${statusBadge.color} ${statusBadge.border} ${statusBadge.flashing ? 'animate-pulse' : ''}`}>
                                                        {statusBadge.text}
                                                    </div>
                                                    
                                                    <div className="space-y-2 mb-4 flex-1">
                                                        <div className="flex items-start gap-2 text-slate-400 bg-black/40 p-2 rounded border border-white/5">
                                                            <MapPin size={12} className="shrink-0 text-blue-500 mt-0.5"/>
                                                            <div>
                                                                <p className="text-[10px] font-bold leading-relaxed line-clamp-2">{customer.address || "Address classification unknown"}</p>
                                                            </div>
                                                        </div>
                                                    </div>

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
                                                                        onClick={() => handleOpenLocation(customer)}
                                                                        className="flex-[1.5] bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all border border-blue-500 shadow-md shadow-blue-900/50"
                                                                        title="Navigate via Google Maps"
                                                                    >
                                                                        <Navigation size={12}/> Navigate
                                                                    </button>

                                                                    <button 
                                                                        onClick={() => { setCheckInCustomer(customer); setVisitNote(""); setVisitTag("Store Closed 🔒"); }}
                                                                        className="flex-1 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 py-2.5 rounded-lg font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all border border-slate-600 hover:border-red-500/50"
                                                                    >
                                                                        <AlertTriangle size={12}/> Log
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
                .region-watermark-label { background: transparent !important; border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
                .region-watermark-label::before, .region-watermark-label::after { display: none !important; }
                /* 🚀 FIXED: Bumps the Zoom Control down so it doesn't overlap the Hamburger Menu */
                .leaflet-top.leaflet-left { margin-top: 70px !important; }
            `}</style>
        </div>
    );
};

export default JourneyView;