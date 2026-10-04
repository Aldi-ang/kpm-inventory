import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Truck, MapPin, CheckCircle, Phone, Store, Navigation, X, Save, MessageSquare, RotateCcw, Globe, AlertTriangle, Zap, Crosshair, Layers, ChevronDown, Paintbrush, LocateFixed, Maximize, Minimize, ChevronRight } from 'lucide-react';
import { doc, updateDoc, serverTimestamp, deleteField, collection, getDocs, getDoc, setDoc } from "firebase/firestore";
import { MapContainer, TileLayer, Marker, Polyline, GeoJSON, Tooltip as LeafletTooltip, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { storeKey, getLocalDayKey, journeyWhere } from './utils/helpers';
import MoreKey from './components/MoreKey.jsx';
import FolderCard from './components/FolderCard.jsx';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { loadBorderCache, saveBorderCache } from './utils/borderCache';
import { isFleetManagementTier, hasClearance } from './config/permissions';
import { ExpeditionLayer, ExpeditionPanel, ExpeditionPeople, ExpeditionMini } from './components/Expedition.jsx';
import { useWide } from './hooks/useWide';
import { expedition, visibleTeam, roadStops, initials } from './utils/expedition';
import { confirmAction } from './components/ConfirmGate.jsx';
import { notify } from './components/Toast.jsx';
import { signFor, chestHtml, slotHtml, crowdHtml } from './utils/mapSprites';

// 🚀 SAFE LEAFLET ICON SETUP
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 🚀 CLUSTER BUBBLE — an inventory slot holding a chest (his settled design 2026-10-03): the shop count bottom-right
// like an item stack, a bar under it filling amber with the share already visited today. Painting ~20 bubbles at
// zoom 12 instead of N pins is the whole point. A store's visited flag rides on its icon (`kxVisited`), because
// setIcon keeps the icon current while a marker's own options never update.
/* a bubble holds shops AND salesmen (ExpeditionPeople renders inside the cluster group): the slot counts the shops, the
   men stand on it as a crowd (his "group of 8bit character", 2026-10-03 20:15); men only = the crowd on its own */
const createJourneyClusterIcon = (cluster) => {
    const kids = cluster.getAllChildMarkers();
    const men = kids.map((m) => m.options.icon?.options?.kxFig).filter(Boolean);
    const shops = kids.filter((m) => !m.options.icon?.options?.kxFig);
    return L.divIcon({
        html: (shops.length ? slotHtml(shops.length, shops.filter((m) => m.options.icon?.options?.kxVisited).length, shops.some((m) => m.options.icon?.options?.kxFree)) :'<i class="kx-crowd-shadow"></i>')
            + crowdHtml(men, shops.length ? 0 : 21),
        className: 'kx-mk',
        iconSize: [42, 51],
        iconAnchor: [21, 21]
    });
};

/* A man on his shop shares its exact point, and identical points never split by zooming, so markercluster SPIDERFIED that
   bubble and threw him onto the chest's sign (test 2026-10-04). A bubble holding a man zooms in instead - to 16, where
   clustering stops and the selling scene draws; a pile of shops alone (pinless shops share the sanitizer's spot) still
   spiderfies, the only way to reach each one. Runs before markercluster's own click handler (registered on creation). */
const noSpiderOnMen = (e) => { e.target.options.spiderfyOnMaxZoom = !e.layer.getAllChildMarkers().some((m) => m.options.icon?.options?.kxFig); };

/* Store pin icons, cached by appearance.
   react-leaflet's Marker compares `icon` by OBJECT IDENTITY, so building a fresh L.divIcon inside
   the render loop made it call setIcon() on every marker on every render — tearing down and
   rebuilding each pin's DOM. One keystroke in a popup input rebuilt every pin on the map, which is
   most of why this screen felt heavy with a few hundred stores.
   A pin's look depends only on (visit outcome, ring colour, editing, the moment playing), so cache on
   exactly that. Sharing one L.Icon across many markers is the normal Leaflet pattern — createIcon()
   makes a fresh element per marker, the same way every marker shares L.Icon.Default.
   A shop is a chest (src/utils/mapSprites.js); the pin being moved keeps the hand. */
const storeIconCache = new Map();
const getStoreIcon = (outcome, ringColor, isEditing, play = '', tag = '', free = false) => {
    const key = `${outcome}|${ringColor}|${isEditing ? 1 : 0}|${play}|${tag}|${free ? 1 : 0}`;
    let icon = storeIconCache.get(key);
    if (!icon) {
        icon = isEditing ? L.divIcon({
            className: 'bg-transparent border-none',
            html: `<div style="background-color: #1B1917; width: 34px; height: 34px; border-radius: 50%; border: 2px solid ${ringColor}; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 0 25px ${ringColor}ff;">🖐️</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
        }) : L.divIcon({
            className: 'kx-mk',
            html: chestHtml(outcome, ringColor, play, tag, free),
            iconSize: [28, 34],
            iconAnchor: [14, 31],
            kxVisited: !!outcome,
            kxFree: free   // the bubble raises the red flag too
        });
        storeIconCache.set(key, icon);
    }
    return icon;
};

/* the map keys act out their job once per press (his pick 2026-10-03, "icon acts"); Lite completes it at once */
const act = (e) => {
    const b = e.currentTarget;
    b.classList.remove('act'); void b.offsetWidth; b.classList.add('act');
    setTimeout(() => b.classList.remove('act'), 480);
};

// 🚀 LIVE GPS ICON
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

/* 📱 The finger scrolls the page, not the map (his t3, 2026-09-20 — "sometimes scrolling causing the map to move instead
   of sliding the page down"): on the phone the map's own drag is off until the map is full screen. With dragging off
   Leaflet drops its leaflet-touch-drag class and its own stylesheet sets touch-action to pan-x pan-y, so the page
   scrolls over the strip and two fingers still zoom. */
const MapTouchGate = ({ locked }) => {
    const map = useMap();
    React.useEffect(() => { if (locked) map.dragging.disable(); else map.dragging.enable(); }, [map, locked]);
    return null;
};

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

/* 🎯 FLY TO ONE SHOP, asked for from another screen. Aldi, 2026-09-07: *"i want u to add redirect
   location on the journey map just to make sure that this area is not too far from the agent
   journey if they want to check, just for further convenience"* — an agent being handed a store
   wants to see where it actually is before taking responsibility for its debt.

   ⚠️ A SHOP WITH NO PIN SAYS SO RATHER THAN FLYING SOMEWHERE. He is right that every shop should
   carry GPS — the outlet form captures it — but nothing in the save path enforces it, and Leaflet
   given a NaN pair does not error: it drifts to the map's default view. For a question that is
   specifically about DISTANCE, silently showing the wrong place is the worst possible answer. */
const StoreFocus = ({ focusStore, customers, onHandled }) => {
    const map = useMap();
    useEffect(() => {
        if (!focusStore) return;
        const shop = (customers || []).find(c => storeKey(c.name) === storeKey(focusStore));
        const lat = Number(shop?.latitude);
        const lng = Number(shop?.longitude);
        if (shop && Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
            map.flyTo([lat, lng], 16, { duration: 1.2 });
        } else if (shop) {
            notify(`${shop.name} has no GPS pin saved yet, so the map cannot show where it is.`);
        } else {
            notify(`${focusStore} is not on this map.`);
        }
        onHandled?.();
    }, [focusStore]);
    return null;
};

/* `trigger`: the phone's full-map dock has its own Locate key, so its round key here hides there (`hideKey`) */
const LocationController = ({ userLocation, setUserLocation, isEditing, isLiteMode, trigger = 0, hideKey }) => {
    const map = useMap();
    const watchId = useRef(null);
    const isEditingRef = useRef(isEditing);

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
                    notify("Please enable location permissions in your device settings.");
                },
                { enableHighAccuracy: true }
            );
        }

        // 🚀 POTATO ENGINE: Disable continuous GPS polling to save massive battery on cheap phones
        if (!isLiteMode && !watchId.current && "geolocation" in navigator) {
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
    useEffect(() => { if (trigger) handleLocateClick(); }, [trigger]);

    return (
        <div className={`absolute bottom-[20px] right-[10px] z-[999] ${hideKey ? 'hidden lg:block' : ''}`}>
            <button
                onClick={(e) => { act(e); handleLocateClick(); }}
                className="kx-mapkey round k-loc"
                title="Locate Me"
            >
                <LocateFixed size={20} className={watchId.current ? "text-[#E4B04A]" : ""} />
            </button>
        </div>
    );
};

const MapEditController = ({ isEditing, onMapClick }) => {
    useMapEvents({
        click(e) {
            if (isEditing) onMapClick(e.latlng);
        }
    });
    return null;
};

// 🚀 PROTECTED: Harden Polygon Math to ignore corrupted arrays
const isPointInPolygon = (point, polygon) => {
    if (!polygon || !Array.isArray(polygon) || polygon.length === 0) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        if (!polygon[i] || !polygon[j]) continue;
        let xi = polygon[i][0], yi = polygon[i][1], xj = polygon[j][0], yj = polygon[j][1];
        let intersect = ((yi > point[1]) !== (yj > point[1])) && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

// 🚀 PROTECTED: Safely unpack GeoJSON arrays
const checkPointInGeoJSON = (lng, lat, geometry) => {
    if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates)) return false;
    const point = [lng, lat];
    try {
        if (geometry.type === 'Polygon') return isPointInPolygon(point, geometry.coordinates[0]);
        if (geometry.type === 'MultiPolygon') {
            for (let poly of geometry.coordinates) { 
                const ring = Array.isArray(poly[0]?.[0]) && typeof poly[0][0][0] === 'number' ? poly[0] : poly;
                if (Array.isArray(ring)) {
                    if (isPointInPolygon(point, ring)) return true; 
                }
            }
        }
    } catch(e) { console.warn("Geofence parse error", e); }
    return false;
};

// 🚀 ENTERPRISE SSOT HIERARCHY ENGINE
// Phase 2: The UI is now lightning fast. It no longer guesses. 
// It strictly reads the scrubbed database fields as absolute truth.
const getStoreHierarchy = (customer) => {
    const safeRead = (val, fallback) => {
        const str = String(val || '').trim();
        return (str && !str.toLowerCase().includes('unknown') && !str.toLowerCase().includes('unmapped')) ? str.toUpperCase() : fallback;
    };

    return {
        Provinsi: safeRead(customer.province, 'UNMAPPED PROVINSI'),
        Kabupaten: safeRead(customer.region, 'UNMAPPED KABUPATEN'),
        Kecamatan: safeRead(customer.city, 'UNMAPPED KECAMATAN')
    };
};

/* no blue, no green, no gold (gold = secured): cream, purple, pink, sand, rust, rose, violet, stone */
const AGENT_COLORS = ['#E8E4DE', '#a855f7', '#ec4899', '#C9B38B', '#C2553A', '#f43f5e', '#8b5cf6', '#A39B90'];
const getHashColor = (name) => {
    const safeName = String(name || '');
    if (!safeName) return '#64748b';
    let hash = 0;
    for (let i = 0; i < safeName.length; i++) {
        hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AGENT_COLORS.length;
    return AGENT_COLORS[index];
};

const JourneyView = ({ customers: rawCustomers, transactions: rawTransactions = [], db, appId, user, userRole, logAudit, triggerCapy, isAdmin, setActiveTab, tierSettings, isLiteMode, appSettings, focusStore = null, onFocusStoreHandled, motorists = [], agentProfileId, eodReports }) => {
    
    // 🛡️ THE MASTER DATA SANITIZER V2
    // Added 'phone', 'address', 'storeImage' and 'lastVisitNote' to guarantee 100% string compliance.
    const customers = useMemo(() => {
        return (rawCustomers || []).filter(c => c && typeof c === 'object' && c.id).map(c => ({
            ...c,
            name: String(c.name || 'UNKNOWN STORE'),
            address: String(c.address || 'Address classification unknown'),
            phone: c.phone ? String(c.phone) : '',
            storeImage: c.storeImage ? String(c.storeImage) : '',
            city: c.city ? String(c.city) : '',
            region: c.region ? String(c.region) : '',
            province: (c.province || c.provinsi) ? String(c.province || c.provinsi) : '',
            assignedAgent: c.assignedAgent ? String(c.assignedAgent) : 'Unassigned',
            lastVisit: c.lastVisit ? String(c.lastVisit) : '',
            lastVisitTag: c.lastVisitTag ? String(c.lastVisitTag) : '',
            lastVisitNote: c.lastVisitNote ? String(c.lastVisitNote) : '',
            lastVisitedBy: c.lastVisitedBy ? String(c.lastVisitedBy) : '',
            tier: String(c.tier || 'Retail'),
            priceTier: String(c.priceTier || 'Retail'),
            visitFreq: parseInt(c.visitFreq) || 7,
            latitude: parseFloat(c.latitude) || -7.5845,
            longitude: parseFloat(c.longitude) || 110.2895,
            gmapsUrl: c.gmapsUrl ? String(c.gmapsUrl) : ''
        }));
    }, [rawCustomers]);

    const transactions = useMemo(() => {
        return (rawTransactions || []).filter(t => t && typeof t === 'object').map(t => ({
            ...t,
            customerName: String(t.customerName || ''),
            agentName: String(t.agentName || 'Unknown Agent'),
            date: String(t.date || '')
        }));
    }, [rawTransactions]);

    const todayDate = getLocalDayKey();
    const [selectedDay, setSelectedDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));

    /* 📱 PHONE FOLDS (2026-09-19, his board 1 = B and board 2 = B). `feedOpen`: the MISSION FEED
       pickers sit behind their title row on the phone and are always open on the desk (seeded from
       the width, the PROJECTED VALUE pattern in AgentInventoryView). `actsOpen`: one store card's
       tool bar (↑ ↓ and the assign box) is unfolded at a time by the ⋯ key beside its name; a tap
       anywhere outside a `[data-acts]` element folds it (the Customers ⋯ pattern). */
    const [feedOpen, setFeedOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
    const isPhone = typeof window !== 'undefined' && window.innerWidth < 1024;   // the strip and the touch gate (his A, 2026-09-20)
    const [actsOpen, setActsOpen] = useState(null);
    useEffect(() => {
        if (actsOpen === null) return;
        const close = (e) => { if (!e.target.closest('[data-acts]')) setActsOpen(null); };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, [actsOpen]);

    const todaysVisits = useMemo(() => {
        const visitData = {};
        const todaysTx = transactions.filter(t => t?.date === todayDate);
        todaysTx.forEach(tx => {
            if (tx && tx.customerName) {
                const storeName = storeKey(tx.customerName);
                visitData[storeName] = tx.agentName || 'Unknown Agent';
            }
        });
        return visitData;
    }, [transactions, todayDate]);
    
    const [devUnlock, setDevUnlock] = useState(false);

    // 🚀 CORRECTED: This is a Tier 1-4 (Developer, Company Owner, Area Admin, Fleet
    // Captain) regional/area-management convenience, NOT an owner-exclusive feature —
    // gated by real tier via isFleetManagementTier (same tier-translation logic as
    // isFieldLevelTier elsewhere in config/permissions.js). `isAdmin`/PIN-unlock counts
    // as tier-eligible too (it can only ever be true for a Tier 1/2 account), it doesn't
    // bypass the master switch below.
    const isFleetManagementEligible = isAdmin === true || user?.isAdmin === true || isFleetManagementTier(userRole);

    // 🚀 NEW: Company-wide master switch (Settings, Tier 1/2 only) — when off, NOBODY
    // sees the paintbrush, regardless of tier. Defaults to on (appSettings.enableFleetPaintbrush
    // !== false) so nothing changes for anyone until an owner deliberately flips it off.
    const fleetPaintbrushEnabled = appSettings?.enableFleetPaintbrush !== false;

    // devUnlock (double-tap, dev/testing escape hatch) is the one thing that overrides
    // both the tier check AND the master switch — everyone else needs both true.
    const canManageFleetSettings = devUnlock || (isFleetManagementEligible && fleetPaintbrushEnabled);

    // Assigning a store to an agent, adjusting its pin, and overriding its routing all
    // write to `customers`, which Firestore's rules already allow for ANY authenticated
    // employee (isSalesman covers every tier under the boss) — so this doesn't need an
    // admin-only gate the way mapSettings does.
    const canAssignAgent = !!user;

    const [selectedProvinsi, setSelectedProvinsi] = useState('All');
    const [selectedKabupaten, setSelectedKabupaten] = useState('All');
    const [selectedKecamatan, setSelectedKecamatan] = useState('All');
    const [collapsedSectors, setCollapsedSectors] = useState({});

    const [activeBrush, setActiveBrush] = useState(null);
    const [activePopupId, setActivePopupId] = useState(null); 

    const [agentColors, setAgentColors] = useState(() => {
        const cached = localStorage.getItem(`cello_colors_${appId}`);
        return cached ? JSON.parse(cached) : {};
    });

    const [isFullScreen, setIsFullScreen] = useState(false);

    /* THE EXPEDITION (his look pick 2026-10-02, moved here from Map System 2026-10-03: "the journey map is for
       ... journey of the salesman throughout the day"). Each salesman at his last-seen point, today's sales as
       a trail, a dashed line to his next shop; the phone shows ONE travel card, the PC the squad list. Below the
       boss's tiers a viewer sees his own region only (Reports' authority switch). A minute tick keeps
       "last seen N min ago" honest between Firestore updates. */
    const [minute, setMinute] = useState(0);
    useEffect(() => { const t = setInterval(() => setMinute((m) => m + 1), 60000); return () => clearInterval(t); }, []);
    const globalView = ['ADMIN', 'DEVELOPER', 'COMPANY_OWNER'].includes(userRole) || hasClearance(userRole, 'view_reports_global');
    const team = useMemo(() => expedition(visibleTeam(motorists || [], { global: globalView, viewerId: agentProfileId }), rawCustomers || [], rawTransactions || [], new Date(), eodReports || []), [motorists, rawCustomers, rawTransactions, minute, globalView, agentProfileId, eodReports]); // eslint-disable-line react-hooks/exhaustive-deps
    const [expSel, setExpSel] = useState(null);
    const selId = team.some((a) => a.id === expSel) ? expSel : team.some((a) => a.id === agentProfileId) ? agentProfileId : team[0]?.id;   // a salesman opens on his own card
    const [expFocus, setExpFocus] = useState(false);   // PC: false = frame the whole team, true = frame the picked row
    const wide = useWide();
    /* the pressed man and the Paintbrush pen are ONE pick (test 2026-10-04: the Ari pen on, Budi pressed = Budi's road on
       screen while a tap painted for Ari): a press moves an active pen to him, or off if he cannot be painted for */
    const pickAgent = (id) => {
        const name = team.find((a) => a.id === id)?.name;
        if (expFocus && id === selId) { setExpFocus(false); if (activeBrush === name) setActiveBrush(null); return; }   // tap him again = let go, his pen too
        setExpSel(id); setExpFocus(true);
        if (activeBrush) setActiveBrush(globalAgentList.includes(name) ? name : null);
    };
    const [isPanelOpen, setIsPanelOpen] = useState(false); 

    const [editingStoreId, setEditingStoreId] = useState(null);
    const [tempPinLocation, setTempPinLocation] = useState(null);

    // 🚀 NEW: Manual Folder Override State
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [folderEdits, setFolderEdits] = useState({ prov: '', kab: '', kec: '' });

    const saveFolderEdit = async (storeId) => {
        try {
            const userId = user?.uid || user?.id || 'default';
            const customerRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, storeId);
            
            await updateDoc(customerRef, {
                province: folderEdits.prov.trim().toUpperCase(),
                region: folderEdits.kab.trim().toUpperCase(),
                city: folderEdits.kec.trim().toUpperCase(),
                updatedAt: serverTimestamp()
            });
            
            if (logAudit) logAudit("MANUAL_FOLDER_MOVE", `Manually routed store ${storeId} to ${folderEdits.kec}`);
            if (triggerCapy) triggerCapy("Target routing permanently updated! 🚀");
            setEditingFolderId(null);
        } catch (error) {
            console.error("Failed to update folder:", error);
            notify("Database error: Could not save folder routing.");
        }
    };

    const handleStartEditPin = (store) => {
        if (!canAssignAgent) return;
        setEditingStoreId(store.id);
        setTempPinLocation({ lat: store.latitude, lng: store.longitude });
        setActivePopupId(null); 
    };

    const handleConfirmPin = async () => {
        if (!tempPinLocation || !editingStoreId) return;
        try {
            const userId = user?.uid || user?.id || 'default';
            const customerRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, editingStoreId);
            
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
            notify("Database error: Could not save new GPS coordinates.");
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
                    localStorage.setItem(`cello_colors_${appId}`, JSON.stringify(dbColors));
                }
            } catch(e) { /* agent colours fall back to the defaults; nothing on this screen depends on them */ }
        };
        loadColors();
    }, [db, appId, user]);

    const handleColorChange = (agentName, newColor) => {
        if (!canManageFleetSettings) return;
        const updatedColors = { ...agentColors, [agentName]: newColor };
        setAgentColors(updatedColors);
        localStorage.setItem(`cello_colors_${appId}`, JSON.stringify(updatedColors));
    };

    const saveColorToDB = async (agentName, newColor) => {
        if (!canManageFleetSettings) return;
        try {
            const userId = user?.uid || user?.id;
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/mapSettings`, 'agentColors');
            await setDoc(docRef, { [agentName]: newColor }, { merge: true });
        } catch(e) {
            console.error("Failed to save squad color:", e);
            notify("Database error: Could not save squad color. Only the Company Owner can edit fleet colors.");
        }
    };

    useEffect(() => {
        const loadBorders = async () => {
            // 🗄️ IndexedDB cache paint first (localStorage quota killed the old cache)
            try {
                const cached = await loadBorderCache(appId);
                if (cached.length > 0) setBoundaries(cached.filter(b => b && !b.isHidden));
            } catch(e) { /* cache paint only — the live fetch below is the real load */ }

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
                                data.name = String(data.name || 'Unnamed Region');
                                loaded.push(data);
                            } catch(e) { /* one corrupt boundary is skipped rather than taking the whole map down */ }
                        }
                    }
                });
                if (loaded.length > 0) {
                    const activeBorders = loaded.filter(b => b && !b.isHidden);
                    setBoundaries(activeBorders);
                    saveBorderCache(appId, loaded);
                }
            } catch(e) { /* borders are decoration on this screen; the cache paint above already ran */ }
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
        
        customers.forEach(c => {
            if (c.assignedAgent && c.assignedAgent !== 'Unassigned') {
                initialAssignments[c.id] = c.assignedAgent;
            } else if (localCache[c.id] && localCache[c.id] !== 'Unassigned') {
                initialAssignments[c.id] = localCache[c.id];
            }
        });
        
        setAssignments(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(initialAssignments)) return initialAssignments;
            return prev;
        });
    }, [customers]);

    const handleAssignAgent = async (customerId, agentName) => {
        if (!canAssignAgent) return;
        const userId = user?.uid || user?.id || 'default';
        
        setAssignments(prev => ({ ...prev, [customerId]: agentName === 'Unassigned' ? null : agentName }));

        const localCache = JSON.parse(localStorage.getItem('tripBuilderCache') || '{}');
        if (agentName === 'Unassigned') delete localCache[customerId];
        else localCache[customerId] = agentName;
        localStorage.setItem('tripBuilderCache', JSON.stringify(localCache));

        const targetCustomer = customers.find(c => c.id === customerId);
        if (targetCustomer) {
            targetCustomer.assignedAgent = agentName === 'Unassigned' ? 'Unassigned' : agentName;
        }

        try {
            const customerRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, customerId);
            await updateDoc(customerRef, {
                assignedAgent: agentName === 'Unassigned' ? deleteField() : agentName,
                updatedAt: serverTimestamp()
            });
            if (logAudit) logAudit("AGENT_ASSIGNED", `Assigned ${agentName} to store.`);
        } catch (error) {
            /* An empty catch: the assignment failed, the audit line was never written, and the
               screen said nothing at all. Assigning a store decides whose receivable it is. */
            console.error(error);
            notify(`Could not assign ${agentName} to this store. Nothing was saved — try again.`);
        }
    };

    useEffect(() => {
        const fetchAgents = async () => {
            if (!user || !appId) return;
            const userId = user?.uid || user?.id || 'default';
            try {
                // 🚀 FIX: Dropped a second read of a 'canvas' collection that nothing in the
                // app ever writes (vehicle stock lives in motorists/{id}.activeCanvas). Firestore
                // rules denied it for Tier 3-6, and because it shared this Promise.all the
                // rejection also discarded the motorists result — leaving the agent-assignment
                // dropdown silently empty for every non-admin tier.
                const motoristsSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/motorists`));
                const allAgents = motoristsSnap.docs.map(doc => String(doc.data().name || '')).filter(Boolean).sort();
                setAgentsList(allAgents);
            } catch (error) {
                /* An empty dropdown with no explanation is the exact bug the comment above
                   describes. If the list cannot load, say so rather than showing nothing. */
                console.error(error);
                notify("Could not load the agent list. Reopen this panel once you have signal.");
            }
        };
        fetchAgents();
    }, [db, appId, user]);

    /* GHOSTS ARE REPORTED, NEVER REPAIRED BY A GUESS. Until 2026-09-22 this effect fuzzy-matched
       every store whose agent name was not on the roster ("andika" contains "andi" -> Andika's
       stores handed to Andi), wrote the guess or deleted the field on screen OPEN, and swallowed
       the failure (Backlog: "Opening Journey Plan can silently reassign stores to the wrong
       agent"). Now the records are left alone - the stale name still shows in the dropdown
       through globalAgentList below - and the boss is told once per open which stores point at
       nobody current, so the reassign is a decision he makes on each store. */
    const ghostsToldRef = useRef(false);
    useEffect(() => {
        if (!canAssignAgent || agentsList.length === 0 || customers.length === 0 || ghostsToldRef.current) return;
        const ghosts = customers.filter(c => c.assignedAgent && c.assignedAgent !== 'Unassigned' && !agentsList.includes(c.assignedAgent));
        if (ghosts.length > 0) {
            const names = [...new Set(ghosts.map(c => c.assignedAgent))].sort().join(', ');
            notify(`${ghosts.length} store${ghosts.length > 1 ? 's are' : ' is'} assigned to a name not on the roster (${names}). Open each store and pick a current salesman.`);
        }
        ghostsToldRef.current = true;
    }, [agentsList, customers, canAssignAgent]);

    const globalAgentList = useMemo(() => {
        const agents = new Set(agentsList);
        customers.forEach(c => {
            if (c.assignedAgent && c.assignedAgent !== 'Unassigned') agents.add(c.assignedAgent);
            if (assignments[c.id] && assignments[c.id] !== 'Unassigned') agents.add(assignments[c.id]);
        });
        return Array.from(agents).sort();
    }, [agentsList, customers, assignments]);

    // 🚀 THE FIX: Lightning-Fast Reactive Hierarchy Mapping
    // Geofences are no longer required here. We read straight from the clean database.
    const mappedCustomers = useMemo(() => {
        return customers.map(c => ({
            ...c,
            _hierarchy: getStoreHierarchy(c)
        }));
    }, [customers]);

    const hierarchyData = useMemo(() => {
        const provs = new Set();
        const kabs = new Set();
        const kecs = new Set();
        
        mappedCustomers.forEach(c => {
            const h = c._hierarchy; 
            provs.add(h.Provinsi);
            
            if (selectedProvinsi === 'All' || h.Provinsi === selectedProvinsi) kabs.add(h.Kabupaten);
            if ((selectedProvinsi === 'All' || h.Provinsi === selectedProvinsi) &&
                (selectedKabupaten === 'All' || h.Kabupaten === selectedKabupaten)) {
                kecs.add(h.Kecamatan);
            }
        });
        
        return { provs: Array.from(provs).sort(), kabs: Array.from(kabs).sort(), kecs: Array.from(kecs).sort() };
    }, [mappedCustomers, selectedProvinsi, selectedKabupaten]);

    useEffect(() => {
        let baseRoute = mappedCustomers.filter(c => {
            return c.visitFreq === 7 || c.visitDay === selectedDay;
        });
        
        if (selectedAgent !== 'All') baseRoute = baseRoute.filter(c => assignments[c.id] === selectedAgent);
        if (selectedProvinsi !== 'All') baseRoute = baseRoute.filter(c => c._hierarchy?.Provinsi === selectedProvinsi);
        if (selectedKabupaten !== 'All') baseRoute = baseRoute.filter(c => c._hierarchy?.Kabupaten === selectedKabupaten);
        if (selectedKecamatan !== 'All') baseRoute = baseRoute.filter(c => c._hierarchy?.Kecamatan === selectedKecamatan);
        
        setOrderedRoute(baseRoute);
    }, [mappedCustomers, selectedDay, selectedAgent, selectedProvinsi, selectedKabupaten, selectedKecamatan, assignments]);

    const moveStore = (index, direction) => {
        const newRoute = [...orderedRoute];
        if (direction === 'up' && index > 0) {
            [newRoute[index - 1], newRoute[index]] = [newRoute[index], newRoute[index - 1]];
        } else if (direction === 'down' && index < newRoute.length - 1) {
            [newRoute[index + 1], newRoute[index]] = [newRoute[index], newRoute[index + 1]];
        }
        setOrderedRoute(newRoute);
    };

    const storeMetrics = useMemo(() => {
        const counters = {};
        const metrics = {};
        
        orderedRoute.forEach(store => {
            let agent = assignments[store.id] || 'Unassigned';
            if (agent !== 'Unassigned' && !globalAgentList.includes(agent)) agent = 'Unassigned';

            if (!counters[agent]) counters[agent] = 0;
            counters[agent]++; 
            
            let color = '#64748b'; 
            if (agent !== 'Unassigned') color = agentColors?.[agent] || getHashColor(agent);
            
            metrics[store.id] = { stopNumber: counters[agent], color, agentName: agent };
        });
        return metrics;
    }, [orderedRoute, assignments, globalAgentList, agentColors]);

    /* THE PRESSED SALESMAN (his 2026-10-04: "im expecting when i press the expedition team there will be a roadmap for them
       and a clearer indicator that the chest is theirs to collect not just color ... especially for the people who color
       blinds"; look B, "Name tags is easier to see"): each of his chests wears his name tag with the stop number, everyone
       else fades (.kx-focus), and a road runs from where he stands through them. Pressed = his Expedition row/chip
       (expFocus) or his Paintbrush pen. Today's round by default; every shop assigned to him with "All shops" (his "shop
       assigned today, but also add option on all shop assigned"). */
    const [roadAllFor, setRoadAllFor] = useState(null);
    const focusName = expFocus ? team.find((a) => a.id === selId)?.name : activeBrush && activeBrush !== 'Unassigned' ? activeBrush : null;
    /* "All shops" belongs to the man it was pressed for: the next man pressed opens on Today (test 2026-10-04) */
    const roadAll = !!focusName && roadAllFor === focusName;
    const setRoadAll = (v) => setRoadAllFor(v ? focusName : null);
    const road = useMemo(() => {
        if (!focusName) return null;
        const man = team.find((a) => a.name === focusName);
        const assigned = orderedRoute.filter((s) => storeMetrics[s.id]?.agentName === focusName && s.latitude && s.longitude)
            .map((s) => ({ key: storeKey(s.name), name: s.name, lat: Number(s.latitude), lng: Number(s.longitude) }));
        const stops = roadStops(man, roadAll, assigned), ini = initials(focusName);
        return { tagOf: Object.fromEntries(stops.map((s) => [s.key, `${ini} · ${s.n}`])),
            points: [...(man && !roadAll ? [man.at] : []), ...stops.filter((s) => s.lat)] };
    }, [focusName, team, roadAll, orderedRoute, storeMetrics]);
    /* pressed in Expedition = ONLY his shops stay on the map, so a bubble counts his shops too (his "just show the stores
       that is being assigned for him instead even when zoomed out"). With a Paintbrush pen the others only fade: hiding
       them would leave nothing to paint. */
    const hideOthers = !!road && expFocus && !activeBrush;
    /* a stop on his road that is not on this day's route (a sale off-schedule, another day picked) still gets its chest, or
       the road bends at empty ground (test 2026-10-04: Ari's road had 4 stops and the map 0 chests) */
    const offRoute = useMemo(() => {
        if (!road) return [];
        const on = new Set(orderedRoute.map((s) => storeKey(s.name)));
        return customers.filter((c) => road.tagOf[storeKey(c.name)] && !on.has(storeKey(c.name)));
    }, [road, orderedRoute, customers]);

    const getBountyStatus = (customer) => {
        if (!customer) return { text: "UNKNOWN TARGET", short: "UNKNOWN", led: "", color: "bg-slate-600", border: "border-slate-500", flashing: false };
        const freq = parseInt(customer.visitFreq) || 7;
        if (!customer.lastVisit) return { text: "⚠️ CRITICAL: NEVER VISITED", short: "NEVER VISITED", led: "crit", color: "bg-red-600 text-white", border: "border-red-500", flashing: true };
        
        try {
            const parseDate = (dStr) => {
                const parts = String(dStr || '').split('T')[0].split('-');
                if (parts.length < 3) return new Date(); 
                return new Date(parts[0], parts[1]-1, parts[2]);
            };
            
            const lastDate = parseDate(customer.lastVisit);
            const now = parseDate(todayDate);
            
            const diffTime = now - lastDate; 
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const daysLeft = freq - diffDays;

            if (daysLeft > 2) return { text: `STATUS: SAFE (${daysLeft} Days Left)`, short: `SAFE · ${daysLeft} DAYS LEFT`, led: "ok", color: "bg-emerald-900/60 text-emerald-400", border: "border-emerald-500/50" };
            if (daysLeft > 0) return { text: `EXPIRING SOON (${daysLeft} Days Left)`, short: `DUE IN ${daysLeft} ${daysLeft === 1 ? 'DAY' : 'DAYS'}`, led: "warn", color: "bg-yellow-900/60 text-yellow-400", border: "border-yellow-500/50" };
            const overdue = Math.abs(daysLeft);
            return { text: `⚠️ CRITICAL: OVERDUE BY ${overdue} DAYS`, short: overdue === 0 ? 'DUE TODAY' : `OVERDUE · ${overdue} ${overdue === 1 ? 'DAY' : 'DAYS'}`, led: "crit", color: "bg-red-600 text-white", border: "border-red-500", flashing: true };
        } catch(e) {
            return { text: "DATA CORRUPT", short: "DATA CORRUPT", led: "crit", color: "bg-red-600 text-white", border: "border-red-500", flashing: false };
        }
    };

    useEffect(() => {
        const fetchRoute = async () => {
            if (selectedAgent === 'All') return setStreetRoute(null);

            const validStops = orderedRoute.filter(c => !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude)));
            if (validStops.length < 2) return setStreetRoute(null);
            
            const coordsString = validStops.map(stop => `${stop.longitude},${stop.latitude}`).join(';');
            try {
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);
                const data = await response.json();
                if (data.routes && data.routes[0]) {
                    const flippedCoords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                    setStreetRoute(flippedCoords);
                }
            } catch (error) { /* the routing service is outside this app; the straight line stays drawn */ }
        };
        fetchRoute();
    }, [orderedRoute]); 
    
    const validStore = orderedRoute.find(c => !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude)));
    const mapCenter = validStore ? [parseFloat(validStore.latitude), parseFloat(validStore.longitude)] : [-7.6145, 110.7122];

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
        } catch (error) { notify("Failed to undo: " + error.message); }
    };

    const confirmCheckIn = async (e) => {
        e.preventDefault();
        if (!user || !checkInCustomer) return;
        setIsSubmitting(true);
        try {
            const trueAgentName = user.displayName || user.email.split('@')[0];
            const customerRef = doc(db, `artifacts/${appId}/users/${user.uid}/customers`, checkInCustomer.id);
            await updateDoc(customerRef, {
                lastVisit: todayDate,
                lastVisitNote: `[${visitTag}] ${visitNote}`,
                lastVisitTag: visitTag,
                lastVisitedBy: trueAgentName, 
                updatedAt: serverTimestamp()
            });

            if (logAudit) await logAudit("VISIT_REPORT", `Visited ${checkInCustomer.name} - ${visitTag}: ${visitNote}`);
            if (triggerCapy) triggerCapy(`Bounty Claimed! ✅`);
            
            setCheckInCustomer(null);
            setIsSubmitting(false);
        } catch (error) { notify("Failed to save report: " + error.message); setIsSubmitting(false); }
    };

    const QUICK_TAGS = ["Repeat Order 📦", "Stock Full (No Order) 🛑", "Competitor Issue ⚠️", "New Request 📝", "Store Closed 🔒"];

    const conqueredCount = orderedRoute.filter(c => c.lastVisit === todayDate).length;
    const progressPercent = orderedRoute.length > 0 ? Math.round((conqueredCount / orderedRoute.length) * 100) : 0;

    /* THE SECURE MOMENT (his "it refreshed" rule): a chest plays only when its outcome changes while the map is
       open - first load and every later render draw the end state. Leaflet's setIcon builds a NEW element, so the
       moment is the class that element is born with (worked out here, during render, so the end state never paints
       first), then the store goes back to the still icon once it has played. */
    const outcomeById = useMemo(() => Object.fromEntries(orderedRoute.map((s) => {
        const sold = !!todaysVisits[storeKey(s.name)];
        return [s.id, s.lastVisit === todayDate || sold ? signFor(s.lastVisitTag, sold) : null];
    })), [orderedRoute, todaysVisits, todayDate]);
    // refs, not a returned value: StrictMode runs this memo twice in dev and the second run sees no change
    const seenOutcome = useRef(null), playing = useRef({}), clusterRef = useRef(null), outcomeMoved = useRef(false);
    const [, setReplayTick] = useState(0);
    useMemo(() => {
        const prev = seenOutcome.current, now = Date.now();
        seenOutcome.current = outcomeById;
        if (!prev) return;
        for (const id in playing.current) if (playing.current[id].until < now) delete playing.current[id];
        for (const id in outcomeById) {
            if (!(id in prev) || prev[id] === outcomeById[id]) continue;
            outcomeMoved.current = true;
            if (outcomeById[id]) playing.current[id] = { cls: prev[id] ? 'resign' : 'burst', until: now + 1500 };
        }
    }, [outcomeById]);
    useEffect(() => {
        if (outcomeMoved.current) { outcomeMoved.current = false; clusterRef.current?.refreshClusters(); }   // a bubble's bar only redraws when told
        if (!Object.values(playing.current).some((p) => p.until > Date.now())) return;
        const t = setTimeout(() => setReplayTick((x) => x + 1), 1600);
        return () => clearTimeout(t);
    }, [outcomeById]);
    const [locateTrigger, setLocateTrigger] = useState(0);
    const squadColor = (name) => agentColors[name] || getHashColor(name);
    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
    };

    /* MISSION FEED's parts (his pick 2026-10-03: A strip on the PC, B day card on the phone). One cell per shop up
       to 40 - past that a cell is thinner than its gap on a phone, so it becomes a bar. The day is 7 keys, today
       dotted. Overdue = the same rule the store cards use (getBountyStatus), not "due today". */
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const feedProgress = orderedRoute.length > 0 && orderedRoute.length <= 40
        ? <div className="kx-cells" style={{ gridTemplateColumns: `repeat(${orderedRoute.length}, 1fr)` }}>{orderedRoute.map((_, k) => <i key={k} className={k < conqueredCount ? 'on' : k === conqueredCount ? 'now' : ''} />)}</div>
        : <div className="kx-feed-bar"><i style={{ width: `${progressPercent}%` }} /></div>;
    const feedDays = (
        <div className="kx-days" role="group" aria-label="Day">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                <button type="button" key={d} aria-pressed={selectedDay === d} className={d === todayName ? 'today' : ''} onClick={() => setSelectedDay(d)} title={d}>
                    <span className="lg:hidden">{d.slice(0, 2)}</span><span className="hidden lg:inline">{d.slice(0, 3)}</span>
                </button>
            ))}
        </div>
    );
    const overdueCount = orderedRoute.filter(c => String(getBountyStatus(c)?.short || '').startsWith('OVERDUE')).length;

    const sortedRoute = useMemo(() => {
        return [...orderedRoute].sort((a, b) => {
            const aVis = a.lastVisit === todayDate ? 1 : 0;
            const bVis = b.lastVisit === todayDate ? 1 : 0;
            return aVis - bVis; 
        });
    }, [orderedRoute, todayDate]);

    const groupedTree = useMemo(() => {
        const tree = {};
        sortedRoute.forEach(customer => {
            const prov = customer._hierarchy?.Provinsi || 'Unmapped Provinsi';
            const kab = customer._hierarchy?.Kabupaten || 'Unmapped Kabupaten';
            const kec = customer._hierarchy?.Kecamatan || 'Unmapped Kecamatan';
            
            if (!tree[prov]) tree[prov] = {};
            if (!tree[prov][kab]) tree[prov][kab] = {};
            if (!tree[prov][kab][kec]) tree[prov][kab][kec] = [];
            
            tree[prov][kab][kec].push(customer);
        });
        return tree;
    }, [sortedRoute]);

    const [userSelectedPath, setUserSelectedPath] = useState(null);

    const activeSectorPath = useMemo(() => {
        const provs = Object.keys(groupedTree).sort();
        if (provs.length === 0) return null;
        
        const firstProv = provs[0];
        const kabs = Object.keys(groupedTree[firstProv] || {}).sort();
        const firstKab = kabs.length > 0 ? kabs[0] : 'Unknown';
        const kecs = Object.keys(groupedTree[firstProv]?.[firstKab] || {}).sort();
        const firstKec = kecs.length > 0 ? kecs[0] : 'Unknown';
        const defaultPath = `${firstProv}|${firstKab}|${firstKec}`;

        if (!userSelectedPath || !userSelectedPath.includes('|')) return defaultPath;

        const [p, kb, kc] = userSelectedPath.split('|');
        if (!groupedTree[p]?.[kb]?.[kc]) return defaultPath;

        return userSelectedPath;
    }, [groupedTree, userSelectedPath]);

    const jumpToTerminal = (storeName) => { 
        sessionStorage.setItem('targetSalesCustomer', storeName);
        if (setActiveTab) setActiveTab('sales'); 
    };
    const jumpToMap = (storeId) => { 
        sessionStorage.setItem('targetMapStore', storeId);
        if (setActiveTab) setActiveTab('map_war_room'); 
    };

   const handleOpenLocation = (customer) => {
        if (customer.gmapsUrl) { 
            window.open(customer.gmapsUrl, '_blank'); 
            return; 
        }
        if (customer.latitude && customer.longitude) {
            // 🚀 ACTUAL FIX: The real Google Maps Universal Search API
            window.open(`https://www.google.com/maps/search/?api=1&query=${customer.latitude},${customer.longitude}`, '_blank');
        } else {
            notify("No GPS Coordinates found for this target.");
        }
    };

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

            {/* MISSION FEED, redesigned 2026-10-03 - his pick: A strip on the PC, B day card on the phone (board A-Brain
                Raw/2026-10-03-journey-header). Theme tokens, no green or blue, his names kept. On the phone the title is
                still the 44 px key that folds the pickers (his board 1 = B, 2026-09-19); the day keys stay out of the fold
                there, because "which day" is the first thing this screen asks. */}
            <div className="kx-feed">
                <h2 className="kx-feed-head">
                    <button type="button" onClick={() => setFeedOpen(v => !v)} aria-expanded={feedOpen}
                        className="w-full flex items-center gap-3 text-left uppercase min-h-11 lg:min-h-0 lg:pointer-events-none lg:cursor-default">
                        <i className="kx-feed-mark" aria-hidden="true" />
                        Mission Feed
                        <span className="kx-feed-meta lg:hidden ml-auto">{journeyWhere(selectedProvinsi, selectedKabupaten, selectedKecamatan)} {feedOpen ? '▴' : '▾'}</span>
                        <span className="kx-feed-meta hidden lg:inline"><b>{selectedDay}</b> · {journeyWhere(selectedProvinsi, selectedKabupaten, selectedKecamatan)} · {selectedAgent === 'All' ? 'Global Fleet' : selectedAgent}</span>
                        <span className="kx-feed-count hidden lg:inline ml-auto">{conqueredCount}/{orderedRoute.length}<small>Secured</small></span>
                    </button>
                </h2>
                <div className="kx-feed-day kx-phone"><span>{selectedDay}</span><span className="kx-feed-count">{conqueredCount}/{orderedRoute.length}<small>Secured</small></span></div>
                <div className="kx-feed-prog"><span className="kx-feed-meta hidden lg:inline">Elimination Status</span>{feedProgress}</div>
                <div className="kx-meta3 kx-phone">
                    <div><b>{orderedRoute.length - conqueredCount}</b><small>shops left</small></div>
                    <div><b>{team.filter(t => t.out).length}</b><small>salesmen out</small></div>
                    <div><b>{overdueCount}</b><small>overdue</small></div>
                </div>
                <div className="lg:hidden">{feedDays}</div>

                {/* the pickers ride a grid-rows fold on the phone (0fr → 1fr, 200 ms) and are always open on the desk */}
                <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out lg:block ${feedOpen ? 'opacity-100' : 'opacity-0 lg:opacity-100'}`} style={{ gridTemplateRows: feedOpen ? '1fr' : '0fr' }}>
                <div className="overflow-hidden lg:contents">
                <div className="kx-feed-controls">
                    <div className="kx-feed-field kx-desk"><span>Day</span>{feedDays}</div>
                    <label className="kx-feed-field"><span>Operational Filter</span>
                        <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className={selectedAgent !== 'All' ? 'set' : ''}>
                            <option value="All">Global Fleet</option>
                            {globalAgentList.map(a => <option key={a} value={a}>{a}'s Bounties</option>)}
                        </select>
                    </label>
                    <div className="kx-feed-field"><span>Regional Command</span>
                        <div className="kx-feed-place">
                            <select aria-label="Province" value={selectedProvinsi} onChange={(e) => { setSelectedProvinsi(e.target.value); setSelectedKabupaten('All'); setSelectedKecamatan('All'); }} className={selectedProvinsi !== 'All' ? 'set' : ''}>
                                <option value="All">All Prov</option>
                                {hierarchyData.provs.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <select aria-label="Kabupaten" value={selectedKabupaten} onChange={(e) => { setSelectedKabupaten(e.target.value); setSelectedKecamatan('All'); }} className={selectedKabupaten !== 'All' ? 'set' : ''}>
                                <option value="All">All Kab</option>
                                {hierarchyData.kabs.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <select aria-label="Kecamatan" value={selectedKecamatan} onChange={(e) => setSelectedKecamatan(e.target.value)} className={selectedKecamatan !== 'All' ? 'set' : ''}>
                                <option value="All">All Kec</option>
                                {hierarchyData.kecs.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                </div>
                </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
            <div 
                className={`${isFullScreen ? 'fixed inset-0 z-[9999] rounded-none' : 'relative w-full h-40 lg:h-[500px] rounded-2xl kpm-jp-map'} kx-map bg-slate-900 overflow-hidden border border-slate-700 shadow-xl transition-all duration-300${road ? ' kx-focus' : ''}`}
                style={isFullScreen ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', margin: 0, padding: 0 } : {}}
            >
                {/* the brush (his "new" key layout, 2026-10-03): the key stays in its corner and the list opens ABOVE it;
                    on the phone's full map the key lives in the dock and the list opens above the dock. Rows 44 tall,
                    whole names, no orange slab for "off". */}
                <div className={`kx-brushwrap absolute bottom-4 left-4 z-[9999] ${isFullScreen ? 'flex' : 'hidden lg:flex'} flex-col-reverse gap-2 items-start pointer-events-none`}>
                    <button
                        onClick={(e) => { act(e); setIsPanelOpen(!isPanelOpen); }}
                        onDoubleClick={() => setDevUnlock(true)}
                        title="Double-Tap to Override Permissions"
                        className={`pointer-events-auto kx-mapkey k-brush hidden lg:flex items-center gap-2 select-none ${isPanelOpen ? 'open' : ''}`}
                    >
                        {canManageFleetSettings ? <Paintbrush size={20} className="text-[var(--gold)]"/> : <Globe size={20}/>}
                        <span className="text-[var(--ink)]">{canManageFleetSettings ? 'Paintbrush' : 'Squad Legend'}</span>
                        <ChevronDown size={14} className={`text-[var(--ink-dim)] transition-transform ${isPanelOpen ? 'rotate-180' : ''}`}/>
                    </button>

                    {isPanelOpen && (
                        <div className="kx-brush pointer-events-auto custom-scrollbar">
                            {canManageFleetSettings && (
                                <>
                                    <button onClick={() => setActiveBrush(null)} className={`kx-pen off ${activeBrush === null ? 'sel' : ''}`} style={{ '--i': 0 }}>
                                        <X size={16}/><span>Disable Brush</span>
                                    </button>
                                    <button onClick={() => setActiveBrush('Unassigned')} className={`kx-pen ${activeBrush === 'Unassigned' ? 'sel' : ''}`} style={{ '--c': '#6A645C', '--i': 1 }}>
                                        <i className="sw" /><span className="nm">Unassign</span>
                                    </button>
                                </>
                            )}

                            {globalAgentList.map((a, k) => {
                                const color = agentColors[a] || getHashColor(a);
                                return (
                                    <div key={a} className="kx-pen-row" style={{ '--i': k + 2 }}>
                                        <button
                                            onClick={() => { if (canManageFleetSettings) { setActiveBrush(a); setExpFocus(false); } }}
                                            disabled={!canManageFleetSettings}
                                            className={`kx-pen ${activeBrush === a ? 'sel' : ''}`}
                                            style={{ '--c': color }}
                                        >
                                            <i className="sw" /><span className="nm">{a}</span>
                                        </button>
                                        {canManageFleetSettings && (
                                            <div className="kx-swatch relative shrink-0 overflow-hidden cursor-pointer" title="Change Squad Color">
                                                <input
                                                    type="color"
                                                    value={color}
                                                    onChange={(e) => handleColorChange(a, e.target.value)}
                                                    onBlur={(e) => saveColorToDB(a, e.target.value)}
                                                    className="absolute inset-[-10px] w-16 h-16 cursor-pointer"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {editingStoreId && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900/95 backdrop-blur border-2 border-orange-500 p-2.5 rounded-xl shadow-[0_0_30px_rgba(249,115,22,0.5)] flex flex-col items-center gap-2 pointer-events-auto animate-fade-in-up w-max min-w-[220px]">
                        <div className="flex flex-col text-center">
                            <span className="text-orange-500 text-[11px] lg:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1"><MapPin size={12}/> Edit Pin Location</span>
                            <span className="text-slate-300 text-[11px] font-bold mt-0.5 leading-tight">Drag pin or tap map to move.</span>
                        </div>
                        <div className="flex gap-2 w-full">
                            <button onClick={handleCancelPin} className="flex-1 bg-slate-800 text-slate-400 hover:text-white py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest border border-slate-700 transition-colors px-4">Cancel</button>
                            <button onClick={handleConfirmPin} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 px-4"><Save size={12}/> Save</button>
                        </div>
                    </div>
                )}

                {/* the keys (his "new" layout, 2026-10-03): the PC gets one toolbar with the names always on; the phone's
                    strip keeps only ⛶ here, and its full map moves every key into the bottom dock below */}
                <div className={`kx-keys absolute top-4 right-4 z-[9999] ${isFullScreen ? 'hidden lg:flex' : 'flex'} flex-col gap-3 pointer-events-auto [&>button]:min-h-11 [&>button]:min-w-11 lg:[&>button]:min-h-0 lg:[&>button]:min-w-0`}>
                    <button
                        onClick={(e) => { act(e); toggleFullScreen(); }}
                        className={`kx-mapkey k-full ${isFullScreen ? 'on' : ''} flex items-center gap-2`}
                        title="Toggle Fullscreen Map"
                    >
                        {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        <span className="hidden lg:block">{isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                    </button>
                    <button
                        onClick={(e) => { act(e); setShowBorders(!showBorders); }}
                        className={`kx-mapkey k-bord hidden lg:flex items-center gap-2 ${showBorders ? 'on' : ''}`} aria-pressed={showBorders}
                        title="Toggle Regional Borders"
                    >
                        <Layers size={20}/>
                        <span className="hidden lg:block">Borders</span>
                    </button>
                    <button
                        onClick={(e) => { act(e); setSaveHomeTrigger(prev => prev + 1); }}
                        className="kx-mapkey k-home hidden lg:flex items-center gap-2"
                        title="Save Current Map View as Default Home"
                    >
                        <MapPin size={20}/>
                        <span className="hidden lg:block">Set Home</span>
                    </button>
                    <button
                        onClick={(e) => { act(e); setRecenterTrigger(prev => prev + 1); }}
                        className="kx-mapkey k-fly hidden lg:flex items-center gap-2"
                        title="Return to Saved Home View"
                    >
                        <Navigation size={20}/>
                        <span className="hidden lg:block">Fly Home</span>
                    </button>
                    {isFullScreen && team.length > 0 && wide && <ExpeditionMini team={team} sel={selId} onPick={pickAgent} wide colorOf={squadColor} focused={!!road} roadAll={roadAll} onRoadAll={setRoadAll} />}
                </div>
                {isFullScreen && team.length > 0 && !wide && (
                    <div className="kx-mbarwrap"><ExpeditionMini team={team} sel={selId} onPick={pickAgent} colorOf={squadColor} focused={!!road} roadAll={roadAll} onRoadAll={setRoadAll} /></div>
                )}

                {isFullScreen && (
                    <nav className="kx-dock absolute z-[9999] grid lg:hidden [&>button]:flex [&>button]:flex-col" aria-label="Map keys">
                        <button onClick={(e) => { act(e); setIsPanelOpen(!isPanelOpen); }} className={`kx-mapkey k-brush ${isPanelOpen ? 'on open' : ''}`}>
                            {canManageFleetSettings ? <Paintbrush size={20} className="text-[var(--gold)]"/> : <Globe size={20}/>}<span>{canManageFleetSettings ? 'Brush' : 'Legend'}</span>
                        </button>
                        <button onClick={(e) => { act(e); setShowBorders(!showBorders); }} className={`kx-mapkey k-bord ${showBorders ? 'on' : ''}`} aria-pressed={showBorders}><Layers size={20}/><span>Borders</span></button>
                        <button onClick={(e) => { act(e); setSaveHomeTrigger(prev => prev + 1); }} className="kx-mapkey k-home"><MapPin size={20}/><span>Set Home</span></button>
                        <button onClick={(e) => { act(e); setRecenterTrigger(prev => prev + 1); }} className="kx-mapkey k-fly"><Navigation size={20}/><span>Fly Home</span></button>
                        <button onClick={(e) => { act(e); setLocateTrigger((t) => t + 1); }} className="kx-mapkey k-loc"><LocateFixed size={20}/><span>Locate</span></button>
                        <button onClick={(e) => { act(e); toggleFullScreen(); }} className="kx-mapkey k-full on"><Minimize size={20}/><span>Exit</span></button>
                    </nav>
                )}

                {/* the empty map = the dark tiles' own land colour (71,71,73), never Leaflet's #ddd: every camera move showed
                    a light flash until the tiles arrived (his "people with epilepsy may suffer from that", 2026-10-04) */}
                <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%', background: '#474749' }}>
                    <MapTouchGate locked={isPhone && !isFullScreen} />
                    <MapRecenter trigger={recenterTrigger} saveTrigger={saveHomeTrigger} savedHome={savedHome} onSaveHome={handleSaveHome} defaultCenter={mapCenter} />
                    <StoreFocus focusStore={focusStore} customers={customers} onHandled={onFocusStoreHandled} />
                    {/* Esri's dark canvas needs no key; CARTO's basemaps started printing API KEY REQUIRED across
                        every tile (checked 2026-09-19). Native tiles stop at zoom 16, so Leaflet scales those up
                        for the street-level zooms instead of showing grey squares. */}
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} attribution='© Esri' />
                    
                    <LocationController userLocation={userLocation} setUserLocation={setUserLocation} isEditing={!!editingStoreId} isLiteMode={isLiteMode} trigger={locateTrigger} hideKey={isFullScreen} />
                    <MapEditController isEditing={!!editingStoreId} onMapClick={(latlng) => setTempPinLocation({ lat: latlng.lat, lng: latlng.lng })} />
                    
                    {userLocation && (
                        <Marker position={userLocation} icon={userLocationIcon} zIndexOffset={9999} interactive={false} />
                    )}

                    {showBorders && boundaries.map((boundary) => {
                        const geoData = boundary?.feature || boundary?.geometry;
                        if (!geoData || !geoData.type) return null;
                        
                        const boundName = String(boundary?.name || '').toUpperCase();
                        const isSelected = selectedKecamatan === boundName;
                        const fillColor = isSelected ? '#f97316' : boundary.color || '#A39B90';
                        
                        return (
                            <GeoJSON
                                /* isSelected is IN the key on purpose: react-leaflet's GeoJSON ignores
                                   `style` changes after mount, so without it selecting a kecamatan
                                   never actually restyled the polygon — it looked broken with no error.
                                   Same fix MapMissionControl already uses. */
                                key={`journey-bnd-${boundary.id}-${isSelected ? 'sel' : 'idle'}`}
                                data={geoData}
                                style={{ color: boundary.color || '#A39B90', weight: isSelected ? 3 : 1.5, opacity: 0.6, fillOpacity: isSelected ? 0.2 : 0.05, fillColor: fillColor, dashArray: '5, 5' }}
                                onEachFeature={(f, layer) => {
                                    /* Region labels are hover/selected-only, not permanent. A typical
                                       import is 80-100 boundaries; as permanent tooltips that was
                                       80-100 absolutely-positioned DOM nodes, each 14px/900-weight
                                       with a 5-layer text-shadow, all repositioned on every zoom frame
                                       and never scaled down — so zoomed out they piled into unreadable
                                       mush AND cost a linear repaint. 11px + one shadow + hover-only
                                       matches MapMissionControl, which already had this right. */
                                    const ttContent = `<div style="color: ${boundary.color || '#cbd5e1'}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; text-shadow: 0 1px 3px rgba(0,0,0,0.9); white-space: nowrap;">${String(boundary?.name || 'UNNAMED')}</div>`;
                                    layer.bindTooltip(ttContent, { permanent: isSelected, direction: "center", className: "region-watermark-label" });
                                }}
                            />
                        );
                    })}

                    {/* No animate-pulse: a continuously repainting dashed path spanning the whole
                        viewport, for no information gain. Lite Mode killed it anyway. */}
                    {streetRoute && (
                        <Polyline positions={streetRoute} pathOptions={{ color: '#f97316', weight: 4, opacity: 0.8, dashArray: '10, 15' }}/>
                    )}

                    {/* 🚀 Clustering: at zoom 12 (the default view) this paints ~20 cluster bubbles
                        instead of one pin per store, which is what made the map crawl on phones.
                        Off-screen markers are dropped from the DOM for free (markercluster's
                        removeOutsideVisibleBounds defaults on). While a pin is being dragged we
                        disable clustering entirely — a clustered marker gets swallowed into a
                        bubble and stops being draggable, which would break "Adjust Pin Location".
                        The `key` is load-bearing: markercluster reads disableClusteringAtZoom once
                        at init to build its distance grids, and react-leaflet-cluster's updater only
                        reassigns instance.options — so without a remount the toggle would silently
                        do nothing. Remounting on a rare, deliberate action is a fair price. */}
                    <MarkerClusterGroup
                        ref={clusterRef}
                        key={editingStoreId ? 'journey-unclustered' : 'journey-clustered'}
                        chunkedLoading={true}
                        iconCreateFunction={createJourneyClusterIcon}
                        maxClusterRadius={40}
                        spiderfyOnMaxZoom={true}
                        onClick={noSpiderOnMen} onKeypress={noSpiderOnMen}
                        disableClusteringAtZoom={editingStoreId ? 1 : 16}
                    >
                    {[...orderedRoute, ...offRoute].map((store) => {
                        const hasLiveTxToday = !!todaysVisits[storeKey(store.name)];
                        const isVisited = store.lastVisit === todayDate || hasLiveTxToday;
                        const outcome = outcomeById[store.id] ?? (isVisited ? signFor(store.lastVisitTag, hasLiveTxToday) : null);
                        const play = playing.current[store.id]?.until > Date.now() ? playing.current[store.id].cls : '';

                        const owner = assignments[store.id] || 'Unassigned';   // an off-route stop has no route metric: its real owner
                        const metric = storeMetrics?.[store.id] || { agentName: owner, color: owner === 'Unassigned' ? '#6A645C' : agentColors?.[owner] || getHashColor(owner), stopNumber: 0 };
                        const stopNum = metric.stopNumber;
                        const statusBadge = getBountyStatus(store);
                        const isEditing = editingStoreId === store.id;
                        if (hideOthers && !road.tagOf[storeKey(store.name)] && !isEditing) return null;   // a pressed man: only his shops, so the bubbles count his too

                        let ringColor = isVisited ? '#E4B04A' : (metric.agentName === 'Unassigned' ? '#6A645C' : metric.color);
                        const finalRingColor = isEditing ? '#f97316' : ringColor;
                        const markerPos = isEditing && tempPinLocation ? [tempPinLocation.lat, tempPinLocation.lng] : [store.latitude, store.longitude];
                        
                        // the ring under the chest stays the salesman's colour; the sign says it was visited
                        const customIcon = getStoreIcon(outcome, isEditing ? finalRingColor : (metric.agentName === 'Unassigned' ? '#6A645C' : metric.color), isEditing, play, road?.tagOf[storeKey(store.name)] || '', metric.agentName === 'Unassigned');

                        return (
                            <Marker 
                                key={store.id} 
                                position={markerPos} 
                                icon={customIcon}
                                draggable={isEditing}
                                zIndexOffset={isEditing ? 9999 : 0}
                                eventHandlers={{
                                    click: (e) => {
                                        if (isEditing) return; 
                                        setActivePopupId(store.id); 
                                        if (canAssignAgent && activeBrush) {
                                            handleAssignAgent(store.id, activeBrush);
                                            e.originalEvent.stopPropagation();
                                        }
                                    },
                                    dragend: (e) => {
                                        if (isEditing) {
                                            const pos = e.target.getLatLng();
                                            setTempPinLocation({ lat: pos.lat, lng: pos.lng });
                                        }
                                    }
                                }}
                            >
                                {/* hidden lg:block — hover tooltips are dead weight on touch, where there
                                    is no hover. Matches MapMissionControl:311. */}
                                {activePopupId !== store.id && !isEditing && (
                                    <LeafletTooltip direction="top" offset={[0, -15]} opacity={1} className="custom-leaflet-tooltip hidden lg:block">
                                        <div className={`backdrop-blur px-3 py-1.5 rounded-lg border shadow-xl text-xs font-bold whitespace-nowrap ${isVisited ? 'bg-[#121110]/95 border-[#D08A2E] text-white' : 'bg-[#121110]/95 border-[#3E3A35] text-white'}`}>
                                            {isVisited ? (
                                                <span className="flex items-center gap-1">
                                                    <CheckCircle size={12} className="text-[#E4B04A]"/> 
                                                    SECURED BY {String(todaysVisits[storeKey(store.name)] || store.lastVisitedBy || 'FLEET').toUpperCase().split(' ')[0]}
                                                </span>
                                            ) : (
                                                <><span style={{color: ringColor}} className="mr-1">#{stopNum}</span> {store.name}</>
                                            )}
                                        </div>
                                    </LeafletTooltip>
                                )}

                                {(!canAssignAgent || !activeBrush) && (
                                    <Popup 
                                        closeButton={false} 
                                        className="custom-popup" 
                                        style={{ margin: '-13px' }}
                                        onClose={() => setActivePopupId(null)}
                                    >
                                        <div className="bg-[#121110] p-4 rounded-xl shadow-2xl border border-[#3E3A35] w-[240px] font-mono">
                                            <div className="flex justify-between items-start mb-3 border-b border-slate-700 pb-2">
                                                <p className="font-black text-white text-sm leading-tight pr-2 uppercase">{store.name}</p>
                                                <span 
                                                    className="text-[10px] font-black px-2 py-1 rounded shadow-inner shrink-0 uppercase tracking-widest"
                                                    style={{ backgroundColor: `${ringColor}33`, color: ringColor }}
                                                >
                                                    {isVisited ? 'DONE' : `${metric.agentName === 'Unassigned' ? 'Unassigned' : metric.agentName.split(' ')[0]} #${stopNum}`}
                                                </span>
                                            </div>
                                            
                                            {isVisited ? (
                                                <div className="mb-3 px-3 py-2 rounded-lg border border-[#D08A2E] bg-black/40 text-[#E4B04A] text-[10px] font-black tracking-wider flex flex-col gap-1 text-left shadow-inner">
                                                    <span className="flex items-center gap-1.5 uppercase leading-tight"><CheckCircle size={12} className="shrink-0"/> {hasLiveTxToday ? 'SECURED TODAY' : store.lastVisitTag}</span>
                                                    {(!hasLiveTxToday && store.lastVisitNote) && <span className="text-[11px] font-mono text-[#A39B90] font-normal normal-case leading-snug line-clamp-3 border-t border-[#3E3A35] pt-1.5 mt-0.5">{store.lastVisitNote}</span>}
                                                </div>
                                            ) : (
                                                <div className={`mb-3 px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-widest text-center ${statusBadge.color} ${statusBadge.border} ${statusBadge.flashing ? 'animate-pulse' : ''}`}>
                                                    {statusBadge.text}
                                                </div>
                                            )}
                                            
                                            <div className="space-y-3">
                                                {/* 🚀 MANUAL FOLDER OVERRIDE UI */}
                                                <div className="bg-black/50 p-2 rounded-lg border border-slate-700 shadow-inner">
                                                    {editingFolderId === store.id ? (
                                                        <div className="flex flex-col gap-1.5 animate-fade-in">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[11px] text-orange-400 font-black uppercase flex items-center gap-1"><Layers size={10}/> Override Routing</span>
                                                            </div>
                                                            <input value={folderEdits.prov} onChange={e=>setFolderEdits({...folderEdits, prov: e.target.value})} placeholder="Provinsi" className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider p-1.5 rounded border border-slate-600 outline-none focus:border-orange-500 w-full transition-colors" />
                                                            <input value={folderEdits.kab} onChange={e=>setFolderEdits({...folderEdits, kab: e.target.value})} placeholder="Kabupaten" className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider p-1.5 rounded border border-slate-600 outline-none focus:border-orange-500 w-full transition-colors" />
                                                            <input value={folderEdits.kec} onChange={e=>setFolderEdits({...folderEdits, kec: e.target.value})} placeholder="Kecamatan" className="bg-slate-900 text-orange-100 text-[11px] font-bold uppercase tracking-wider p-1.5 rounded border border-orange-500/50 outline-none focus:border-orange-500 w-full transition-colors" />
                                                            
                                                            <div className="flex gap-2 mt-1">
                                                                <button onClick={() => setEditingFolderId(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-black p-1.5 rounded uppercase border border-slate-700 transition-colors">Abort</button>
                                                                <button onClick={() => saveFolderEdit(store.id)} className="flex-[2] bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-black p-1.5 rounded uppercase flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(249,115,22,0.4)] transition-colors"><Save size={10}/> Enforce</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1 relative group">
                                                            <span className="text-[11px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1"><Layers size={10}/> Matrix Location</span>
                                                            <div className="text-[11px] text-slate-300 font-bold leading-tight pr-8">
                                                                {store._hierarchy?.Provinsi} <span className="text-slate-400">{' > '}</span> {store._hierarchy?.Kabupaten} <span className="text-slate-400">{' > '}</span> <span className="text-orange-400">{store._hierarchy?.Kecamatan}</span>
                                                            </div>
                                                            {canAssignAgent && (
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingFolderId(store.id);
                                                                        setFolderEdits({
                                                                            prov: store.province || store._hierarchy?.Provinsi || '',
                                                                            kab: store.region || store._hierarchy?.Kabupaten || '',
                                                                            kec: store.city || store._hierarchy?.Kecamatan || ''
                                                                        });
                                                                    }} 
                                                                    className="absolute top-1/2 -translate-y-1/2 right-0 bg-slate-800 hover:bg-orange-600 text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-600 hover:border-orange-500 transition-all text-[11px] font-black uppercase shadow-lg"
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    <div className="flex-1 bg-black p-2 rounded border border-slate-700 text-center flex flex-col justify-center gap-0.5">
                                                        <span className="block text-[11px] text-slate-400 uppercase font-black">Performance Rank</span>
                                                        <span className="text-[10px] text-orange-400 font-bold uppercase leading-none">{store.tier}</span>
                                                        {store.priceTier !== store.tier && (
                                                            <span className="text-[11px] text-[#E8E4DE] font-bold uppercase leading-none mt-0.5">Price: {store.priceTier}</span>
                                                        )}
                                                    </div>
                                                    {store.phone ? (
                                                        <a 
                                                            // 🚀 CRASH FIX: Safely convert phone to string before stripping characters
                                                            href={`https://wa.me/${String(store.phone).replace(/\D/g, '')}`} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="flex-1 bg-[#25D366]/10 hover:bg-[#25D366]/30 border border-[#25D366]/50 text-[#25D366] p-2 rounded flex flex-col items-center justify-center transition-colors shadow-inner"
                                                        >
                                                            <MessageSquare size={12} className="mb-0.5"/>
                                                            <span className="text-[11px] font-black uppercase tracking-widest">WhatsApp</span>
                                                        </a>
                                                    ) : (
                                                        <div className="flex-1 bg-slate-800 border border-slate-700 text-slate-400 p-2 rounded flex flex-col items-center justify-center">
                                                            <Phone size={12} className="mb-0.5"/>
                                                            <span className="text-[11px] font-black uppercase tracking-widest">No Phone</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {canAssignAgent && (
                                                    <button
                                                        onClick={() => handleStartEditPin(store)}
                                                        className="w-full bg-slate-800 hover:bg-orange-900/40 text-slate-400 hover:text-orange-400 border border-slate-600 hover:border-orange-500 p-2.5 rounded flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-inner"
                                                    >
                                                        <MapPin size={14} />
                                                        <span className="text-[11px] font-black uppercase tracking-widest">Adjust Pin Location</span>
                                                    </button>
                                                )}

                                                <div>
                                                    <label className="text-[11px] text-slate-400 mb-1 uppercase tracking-widest font-bold flex items-center gap-1"><Truck size={10}/> Assign Fleet:</label>
                                                    <select
                                                        className={`w-full bg-black text-xs font-bold uppercase p-2 rounded outline-none border transition-colors shadow-inner ${assignments[store.id] ? 'border-[#D08A2E] text-[#E8E4DE]' : 'border-slate-700 text-slate-300'} ${canAssignAgent ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                                                        value={assignments[store.id] || 'Unassigned'}
                                                        onChange={(e) => handleAssignAgent(store.id, e.target.value)}
                                                        style={{ colorScheme: 'dark' }}
                                                        disabled={!canAssignAgent}
                                                    >
                                                        <option value="Unassigned" className="bg-slate-900 text-white">-- UNASSIGNED --</option>
                                                        {globalAgentList.map(a => <option key={a} value={a} className="bg-slate-900 text-white">{a}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => handleOpenLocation(store)}
                                                className="w-full mt-4 min-h-11 bg-black border border-[#D08A2E] hover:bg-[#1B1917] text-[#E4B04A] text-[10px] font-black py-3 rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95"
                                            >
                                                <Navigation size={14}/> Navigate via Google Maps
                                            </button>
                                        </div>
                                    </Popup>
                                )}
                            </Marker>
                        );
                    })}
                    <ExpeditionPeople team={team} sel={selId} wide={wide} colorOf={squadColor} focusName={road ? focusName : null} />
                    </MarkerClusterGroup>
                    {team.length > 0 && <ExpeditionLayer team={team} sel={selId} focus={expFocus} wide={wide} stops={false} road={road?.points} />}
                </MapContainer>
            </div>
            {team.length > 0 && <ExpeditionPanel team={team} sel={selId} onPick={pickAgent} wide={wide} scoped={!globalView} focused={!!road} roadAll={roadAll} onRoadAll={setRoadAll} page />}
            </div>

            <div className="pt-6 space-y-4 animate-fade-in">
                {(() => {
                    const safeVisits = typeof todaysVisits !== 'undefined' ? todaysVisits : {};
                    const provList = Object.keys(groupedTree).sort();
                    
                    return (
                        <>
                            {/* 🚀 TACTICAL BREADCRUMB NAVIGATION */}
                            <div className="flex flex-wrap items-center gap-2 mb-2 bg-slate-900/80 backdrop-blur p-3 rounded-xl border border-slate-700 max-w-full lg:w-max shadow-lg">
                                <button onClick={() => { setSelectedProvinsi('All'); setSelectedKabupaten('All'); setUserSelectedPath(null); }} className={`min-h-11 lg:min-h-0 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${selectedProvinsi === 'All' ? 'text-orange-500' : 'text-slate-400 hover:text-white'}`}>
                                    <Layers size={14}/> Radar Hub
                                </button>
                                
                                {selectedProvinsi !== 'All' && (
                                    <>
                                        <ChevronRight size={14} className="text-slate-400"/>
                                        <button onClick={() => { setSelectedKabupaten('All'); setUserSelectedPath(null); }} className={`min-h-11 lg:min-h-0 text-xs font-black uppercase tracking-widest transition-colors ${selectedKabupaten === 'All' ? 'text-orange-500' : 'text-slate-400 hover:text-white'}`}>
                                            {selectedProvinsi}
                                        </button>
                                    </>
                                )}

                                {selectedProvinsi !== 'All' && selectedKabupaten !== 'All' && (
                                    <>
                                        <ChevronRight size={14} className="text-slate-400"/>
                                        <span className="text-orange-500 text-xs font-black uppercase tracking-widest">{selectedKabupaten}</span>
                                    </>
                                )}
                            </div>

                            {/* 🚀 LEVEL 1: PROVINSI FOLDERS */}
                            {selectedProvinsi === 'All' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 kpm-folders">
                                    {provList.map(prov => {
                                        /* 📁 a FOLDER (his video, "B for both", 2026-09-19): the lid on top, the numbered tab and the
                                           ↗ key on the panel, the lid lifts on press. The control is .kpm-folder in theme.css; the
                                           colours are this screen's. The regency cards below wear the same folder. */
                                        const kabCount = Object.keys(groupedTree[prov] || {}).length;
                                        let storeCount = 0;
                                        Object.values(groupedTree[prov] || {}).forEach(k => Object.values(k).forEach(c => storeCount += c.length));
                                        
                                        return (
                                            <FolderCard key={prov} icon={<MapPin size={22} />} onOpen={() => setSelectedProvinsi(prov)} className="bg-slate-900 border-slate-700 hover:border-orange-500 transition-colors duration-300">
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">{prov}</h3>
                                                <p className="text-[11px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-wider">{kabCount} Regions • {storeCount} Targets</p>
                                            </FolderCard>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 🚀 LEVEL 2: KABUPATEN FOLDERS */}
                            {selectedProvinsi !== 'All' && selectedKabupaten === 'All' && groupedTree[selectedProvinsi] && (
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 animate-fade-in-up kpm-folders">
                                    {Object.keys(groupedTree[selectedProvinsi]).sort().map(kab => {
                                        const kecCount = Object.keys(groupedTree[selectedProvinsi][kab] || {}).length;
                                        let storeCount = 0;
                                        Object.values(groupedTree[selectedProvinsi][kab] || {}).forEach(c => storeCount += c.length);

                                        return (
                                            <FolderCard key={kab} icon={<Layers size={22} />} onOpen={() => setSelectedKabupaten(kab)} className="bg-slate-900 border-slate-700 hover:border-blue-500 transition-colors duration-300">
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">{kab}</h3>
                                                <p className="text-[11px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-wider">{kecCount} Sectors • {storeCount} Targets</p>
                                            </FolderCard>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 🚀 LEVEL 3: KECAMATAN SECTORS & STORE GRID */}
                            {selectedProvinsi !== 'All' && selectedKabupaten !== 'All' && groupedTree[selectedProvinsi]?.[selectedKabupaten] && (() => {
                                const kecs = groupedTree[selectedProvinsi][selectedKabupaten];
                                
                                return (
                                    <div className="animate-fade-in mt-4">
                                        {/* 📱 the sector cards wrap two to a row on the phone (his board 3 = YES: no swipe reel, and the
                                            old -mx-4 stuck out of the phone shell's p-2); the desk keeps its one-row reel */}
                                        <div className="flex flex-wrap lg:flex-nowrap lg:overflow-x-auto hide-scrollbar gap-3 pb-4 kpm-arrive">
                                            {Object.keys(kecs).sort().map(kec => {
                                                const sectorStores = kecs[kec];
                                                const completedInSector = sectorStores.filter(c => c.lastVisit === todayDate || !!safeVisits[c.name.trim().toLowerCase()]).length;
                                                const isCleared = completedInSector === sectorStores.length && sectorStores.length > 0;
                                                const currentPath = `${selectedProvinsi}|${selectedKabupaten}|${kec}`;
                                                const isActive = activeSectorPath === currentPath;

                                                return (
                                                    <button 
                                                        key={currentPath}
                                                        onClick={() => setUserSelectedPath(currentPath)}
                                                        className={`shrink-0 basis-[calc(50%-6px)] lg:basis-auto flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all duration-300 min-w-[140px] ${isActive ? 'bg-orange-600/10 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'bg-slate-900 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
                                                    >
                                                        <div className="flex justify-between items-center w-full mb-2">
                                                            <MapPin size={14} className={isActive ? 'text-orange-500' : 'text-slate-400'} />
                                                            {isCleared && <CheckCircle size={14} className="text-emerald-500 shadow-emerald-500/50" />}
                                                        </div>
                                                        <span className={`text-xs font-black uppercase tracking-widest text-left w-full truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>
                                                            {kec}
                                                        </span>
                                                        <div className={`text-[11px] lg:text-[10px] font-bold mt-1 ${isCleared ? 'text-emerald-400' : (isActive ? 'text-orange-400' : 'text-slate-400')}`}>
                                                            {completedInSector} / {sectorStores.length} Secured
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {activeSectorPath && activeSectorPath.startsWith(`${selectedProvinsi}|${selectedKabupaten}`) && (() => {
                                            const parts = activeSectorPath.split('|');
                                            if (parts.length !== 3) return null;
                                            const actKec = parts[2];
                                            const activeStores = groupedTree[selectedProvinsi][selectedKabupaten][actKec];
                                            if (!activeStores) return null;

                                            return (
                                                <div className="animate-fade-in bg-black/20 p-3 lg:p-5 rounded-3xl border border-white/5 mt-2">
                                                    <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4">
                                                        <div>
                                                            <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none flex items-center gap-3">
                                                                <div className="bg-orange-500/20 p-2 rounded-lg border border-orange-500/30">
                                                                    <Layers size={18} className="text-orange-500"/>
                                                                </div>
                                                                {actKec}
                                                            </h3>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                            {activeStores.map((customer) => {
                                                const safeCustomerName = customer.name.trim().toLowerCase();
                                                const hasLiveTxToday = !!safeVisits[safeCustomerName];
                                                const isVisited = customer.lastVisit === todayDate || hasLiveTxToday;
                                                
                                                const originalIdx = orderedRoute.findIndex(c => c.id === customer.id);
                                                const metric = storeMetrics?.[customer.id] || { agentName: 'Unassigned', color: '#6A645C', stopNumber: 0 };
                                                const ringColor = isVisited ? '#E4B04A' : (metric.agentName === 'Unassigned' ? '#6A645C' : metric.color);
                                                const statusBadge = getBountyStatus(customer);
                                                /* RADAR and LOG are written once and mounted twice: in the ⋯ fold on the phone (named by what
                                                   they do), in the key row on the desk - his "board 1 = C", 2026-09-19 */
                                                const mapKey = (label) => (
                                                    <button onClick={() => jumpToMap(customer.id)} className="flex-1 min-h-11 lg:min-h-0 bg-slate-800 hover:bg-slate-700 text-blue-400 py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all border border-slate-600">
                                                        <Globe size={12}/> {label}
                                                    </button>
                                                );
                                                const logKey = (label) => (
                                                    <button onClick={() => { setCheckInCustomer(customer); setVisitNote(""); setVisitTag("Store Closed 🔒"); }} className="flex-1 min-h-11 lg:min-h-0 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all border border-slate-600 hover:border-red-500/50">
                                                        <AlertTriangle size={12}/> {label}
                                                    </button>
                                                );

                                                return (
                                                    <div key={customer.id} className={`bg-[#0f0e0d] rounded-2xl border-2 overflow-hidden flex flex-col relative transition-all duration-500 ${isVisited ? 'border-emerald-900/50 opacity-70 grayscale hover:grayscale-0' : 'border-slate-700 hover:border-orange-500 shadow-[0_10px_20px_rgba(0,0,0,0.5)] hover:-translate-y-1'} ${!isVisited && statusBadge.led === 'crit' ? 'kpm-crit' : ''}`}>
                                                        
                                                        {isVisited && (() => {
                                                            const tag = String(hasLiveTxToday ? '' : (customer.lastVisitTag || ''));
                                                            let stampText = 'CLAIMED';
                                                            let bgOverlay = 'bg-emerald-900/20';
                                                            let boxBg = 'bg-emerald-900/95 text-emerald-400 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.6)]';
                                                            let badgeBorder = 'border-emerald-500/30';
                                                            
                                                            if (tag.includes('🔒')) { stampText = 'CLOSED'; bgOverlay = 'bg-red-900/20'; boxBg = 'bg-red-900/95 text-red-400 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.6)]'; badgeBorder = 'border-red-500/30'; }
                                                            else if (tag.includes('🛑')) { stampText = 'FULL'; bgOverlay = 'bg-orange-900/20'; boxBg = 'bg-orange-900/95 text-orange-400 border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.6)]'; badgeBorder = 'border-orange-500/30'; }
                                                            else if (tag.includes('⚠️')) { stampText = 'ISSUE'; bgOverlay = 'bg-yellow-900/20'; boxBg = 'bg-yellow-900/95 text-yellow-400 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.6)]'; badgeBorder = 'border-yellow-500/30'; }
                                                            else if (tag.includes('📝')) { stampText = 'REQUEST'; bgOverlay = 'bg-blue-900/20'; boxBg = 'bg-blue-900/95 text-blue-400 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.6)]'; badgeBorder = 'border-blue-500/30'; }
                                                            
                                                            const trueVisitorName = safeVisits[safeCustomerName] || customer.lastVisitedBy || 'FLEET';

                                                            return (
                                                                <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none overflow-hidden backdrop-blur-[2px] ${bgOverlay}`}>
                                                                    <div className={`border-4 px-6 py-3 rounded-xl font-black text-center transform -rotate-6 backdrop-blur-md ${boxBg}`}>
                                                                        <div className="text-2xl uppercase tracking-[0.2em] leading-none mb-1">{stampText}</div>
                                                                        <div className={`text-[10px] text-white font-bold tracking-widest bg-black/60 rounded py-0.5 px-2 border shadow-inner max-w-[200px] truncate ${badgeBorder}`}>
                                                                            BY {trueVisitorName.toUpperCase().split(' ')[0]}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })()}

                                                        {/* 📱 THE TOOL BAR (↑ ↓ the route order, the assign box). On the desk it is the black bar at the
                                                            top of the card, as always. On the phone the SAME bar is a fold at the foot of the card
                                                            (order-last), 0fr until the ⋯ key beside the name opens it - his board 2 = B, 2026-09-19.
                                                            One set of controls for both widths; nothing is duplicated. */}
                                                        <div data-acts onClick={e => e.stopPropagation()} className={`order-last lg:order-none grid lg:flex lg:justify-between lg:items-center lg:p-1.5 bg-black border-t lg:border-t-0 lg:border-b border-slate-800 z-10 transition-[grid-template-rows,opacity] duration-200 ease-out ${actsOpen === customer.id ? 'opacity-100' : 'opacity-0 lg:opacity-100'}`} style={{ gridTemplateRows: actsOpen === customer.id ? '1fr' : '0fr' }}>
                                                        <div className="overflow-hidden lg:contents">
                                                        <div className="flex gap-2 p-2 pb-0 lg:hidden">{mapKey('SHOW ON MAP')}{logKey('LOG A VISIT')}</div>
                                                        <div className="flex justify-between items-center gap-2 p-2 lg:contents">
                                                            <div className="flex gap-1 relative z-20">
                                                                <button onClick={(e) => { e.stopPropagation(); moveStore(originalIdx, 'up'); }} disabled={originalIdx === 0 || isVisited} className="w-11 h-11 lg:w-6 lg:h-6 text-base lg:text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-30 rounded text-slate-400 flex items-center justify-center font-bold transition-colors">↑</button>
                                                                <button onClick={(e) => { e.stopPropagation(); moveStore(originalIdx, 'down'); }} disabled={originalIdx === orderedRoute.length - 1 || isVisited} className="w-11 h-11 lg:w-6 lg:h-6 text-base lg:text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-30 rounded text-slate-400 flex items-center justify-center font-bold transition-colors">↓</button>
                                                            </div>
                                                            <select
                                                                className={`bg-slate-900 text-[11px] font-black uppercase tracking-widest px-2 py-1 min-h-11 lg:min-h-0 rounded outline-none border transition-all relative z-20 ${assignments[customer.id] ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-700 text-slate-400'} ${canAssignAgent && !isVisited ? 'cursor-pointer hover:border-orange-500 hover:text-white' : 'pointer-events-none'}`}
                                                                value={assignments[customer.id] || 'Unassigned'}
                                                                onChange={(e) => handleAssignAgent(customer.id, e.target.value)}
                                                                style={{ colorScheme: 'dark' }}
                                                                disabled={!canAssignAgent || isVisited}
                                                            >
                                                                <option value="Unassigned">UNASSIGNED</option>
                                                                {globalAgentList.map(a => <option key={a} value={a}>{a}</option>)}
                                                            </select>
                                                        </div></div>
                                                        </div>

                                                        {/* the picture band: 96 px when there is a photo; without one the phone gets a 44 px strip
                                                            that carries the badges instead of a NO INTEL texture */}
                                                        <div className={`${customer.storeImage ? 'h-24' : 'min-h-11 lg:h-24'} ${actsOpen === customer.id ? '' : 'hidden lg:block'} bg-black relative shrink-0 border-b border-slate-800`}>
                                                            {customer.storeImage ? (
                                                                <img src={customer.storeImage} className="w-full h-full object-cover opacity-60" alt="Store"/>
                                                            ) : (
                                                                <div className="hidden lg:flex w-full h-full flex-col items-center justify-center text-slate-700 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                                                                    <Store size={24} className="mb-1 opacity-50"/>
                                                                    <span className="text-[11px] font-black tracking-widest uppercase">No Intel</span>
                                                                </div>
                                                            )}

                                                            <div className={`${customer.storeImage ? 'absolute top-2 left-2 flex flex-col gap-1.5' : 'static flex flex-row flex-wrap items-center gap-1.5 px-2 py-1.5 lg:absolute lg:top-2 lg:left-2 lg:flex-col lg:p-0'}`}>
                                                                <div className="bg-black/80 backdrop-blur border border-white/10 text-white text-[11px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                                                                    <span style={{ color: ringColor }}>●</span>
                                                                    {metric.agentName === 'Unassigned' ? 'UNASSIGNED' : metric.agentName.split(' ')[0]} 
                                                                    <span className="opacity-50">|</span> #{metric.stopNumber}
                                                                </div>
                                                                <div className="flex gap-1 flex-wrap">
                                                                    <div className="bg-orange-600/90 backdrop-blur border border-orange-400 text-white text-[11px] font-black px-2 py-0.5 rounded w-max uppercase tracking-widest shadow-lg">
                                                                        RANK: {customer.tier}
                                                                    </div>
                                                                    {customer.priceTier !== customer.tier && (
                                                                        <div className="bg-blue-600/90 backdrop-blur border border-blue-400 text-white text-[11px] font-black px-2 py-0.5 rounded w-max uppercase tracking-widest shadow-lg">
                                                                            PRICE: {customer.priceTier}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="p-3 lg:p-4 flex-1 flex flex-col bg-gradient-to-b from-[#1a1815] to-[#0f0e0d]">
                                                            <h3 className="font-black text-base text-white uppercase tracking-wider mb-1.5 lg:mb-2 leading-tight flex items-start gap-2 lg:block lg:truncate">
                                                                <span className="flex-1 min-w-0">{customer.name}</span>
                                                                <MoreKey id={customer.id} label={customer.name} open={actsOpen === customer.id} onToggle={(id) => setActsOpen(o => (o === id ? null : id))} className="shrink-0 -mt-1 -mr-1" />
                                                            </h3>
                                                            
                                                            {isVisited ? (
                                                                <div className="mb-3 px-3 py-2 rounded-lg border border-emerald-500 bg-emerald-900/40 text-emerald-400 text-[11px] lg:text-[10px] font-black tracking-wider w-full flex flex-col gap-1 text-left shadow-inner relative z-10">
                                                                    <span className="flex items-center gap-1.5 uppercase leading-tight"><CheckCircle size={12} className="shrink-0"/> {hasLiveTxToday ? 'SECURED TODAY' : customer.lastVisitTag}</span>
                                                                    {(!hasLiveTxToday && customer.lastVisitNote) && <span className="text-[11px] font-mono text-emerald-200/80 font-normal normal-case leading-snug line-clamp-2 border-t border-emerald-500/30 pt-1.5 mt-0.5">{customer.lastVisitNote}</span>}
                                                                </div>
                                                            ) : (
                                                                <div className={`kpm-led-line mb-2 lg:mb-3 ${statusBadge.led}`}><i aria-hidden="true"></i>{statusBadge.short}</div>
                                                            )}
                                                            
                                                            <div className={`space-y-2 mb-3 lg:mb-4 flex-1 ${actsOpen === customer.id ? '' : 'hidden lg:block'}`}>
                                                                <div className="flex items-start gap-2 text-slate-400 bg-black/40 p-2 rounded border border-white/5">
                                                                    <MapPin size={12} className="shrink-0 text-blue-500 mt-0.5"/>
                                                                    <div>
                                                                        <p className="text-[11px] lg:text-[10px] font-bold leading-relaxed line-clamp-2">{customer.address}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-row lg:flex-col gap-2 mt-auto relative z-20">
                                                                {!isVisited ? (
                                                                    <>
                                                                        <button 
                                                                            onClick={() => jumpToTerminal(customer.name)}
                                                                            className="w-full flex-[2] lg:flex-none bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white py-3 min-h-11 lg:min-h-0 rounded-lg font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_5px_20px_rgba(249,115,22,0.4)] border border-orange-400"
                                                                        >
                                                                            <Crosshair size={14}/> Engage Target
                                                                        </button>
                                                                        
                                                                        <div className="flex gap-2 flex-1 lg:flex-none">
                                                                            <div className="hidden lg:contents">{mapKey('Radar')}</div>
                                                                            
                                                                            <button 
                                                                                onClick={() => handleOpenLocation(customer)}
                                                                                className="flex-[1.5] bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all border border-blue-500 shadow-md shadow-blue-900/50"
                                                                                title="Navigate via Google Maps"
                                                                            >
                                                                                <Navigation size={12}/> Navigate
                                                                            </button>

                                                                            <div className="hidden lg:contents">{logKey('Log')}</div>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <button 
                                                                        onClick={async () => {
                                                                            if (await confirmAction(`Undo clearance for ${customer.name}? This removes the report from the database.`)) {
                                                                                handleUndoCheckIn(customer);
                                                                            }
                                                                        }}
                                                                        className="w-full bg-slate-900 hover:bg-red-900/40 text-slate-400 hover:text-red-400 py-3 rounded-lg font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all border border-slate-800 hover:border-red-900/50"
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
                                    </div>
                                );
                            })()}
                        </div> 
                                ); 
                            })()} {/* 🚀 CRASH FIX: Properly closed the Level 3 React Function (IIFE)! */}
                        </>
                    );
                })()}
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
                                <p className="text-[11px] lg:text-[10px] text-slate-400 tracking-widest uppercase mt-1">Target: {checkInCustomer.name}</p>
                            </div>
                            <button onClick={() => setCheckInCustomer(null)} className="text-slate-400 hover:text-white transition-colors"><X size={24}/></button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="text-[11px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Exception Reason</label>
                                <div className="flex flex-wrap gap-2">
                                    {QUICK_TAGS.map(tag => (
                                        <button 
                                            key={tag}
                                            onClick={() => setVisitTag(tag)}
                                            className={`px-3 py-2.5 min-h-11 lg:min-h-0 rounded-lg text-[11px] lg:text-[10px] font-black uppercase tracking-wider border transition-all ${
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
                                <label className="text-[11px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
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
                                className="flex-1 py-4 rounded-xl bg-slate-800 border border-slate-700 font-bold text-slate-400 hover:text-white hover:bg-slate-700 uppercase tracking-widest text-[11px] lg:text-[10px] transition-colors"
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
                .leaflet-top.leaflet-left { margin-top: 70px !important; }
            `}</style>
        </div>
    );
};

export default JourneyView;