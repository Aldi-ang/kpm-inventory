import React, { useState, useEffect } from 'react';
import { Truck, MapPin, CheckCircle, Calendar, Phone, Store, Navigation, X, Save, MessageSquare, RotateCcw, Globe } from 'lucide-react';
import { doc, updateDoc, serverTimestamp, deleteField, collection, getDocs } from "firebase/firestore";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip as LeafletTooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 🚀 SAFE LEAFLET ICON SETUP
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 🚀 FIX: Added `isAdmin` prop to enforce security
const JourneyView = ({ customers, db, appId, user, logAudit, triggerCapy, isAdmin }) => {
    const [selectedDay, setSelectedDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
    
    // --- CHECK-IN STATE ---
    const [checkInCustomer, setCheckInCustomer] = useState(null); 
    const [visitNote, setVisitNote] = useState("");
    const [visitTag, setVisitTag] = useState("Routine Check");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [streetRoute, setStreetRoute] = useState(null);

    const todayDate = new Date().toISOString().split('T')[0];

    // 🚀 TRIP PLANNER: ASSIGNMENT & SEQUENCE ENGINE
    const [agentsList, setAgentsList] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState('All');
    const [orderedRoute, setOrderedRoute] = useState([]);
    const [assignments, setAssignments] = useState({});

    // 🚀 NEW: Load saved assignments from Firebase into local state
    useEffect(() => {
        const initialAssignments = {};
        (customers || []).forEach(c => {
            if (c.assignedAgent) initialAssignments[c.id] = c.assignedAgent;
        });
        setAssignments(initialAssignments);
    }, [customers]);

    // 🚀 NEW: Permanently save Agent Assignment to Firebase (Admin Only)
    const handleAssignAgent = async (customerId, agentName) => {
        if (!isAdmin) return; // Hard security block
        
        // Optimistic UI update for speed
        setAssignments(prev => ({ ...prev, [customerId]: agentName === 'Unassigned' ? null : agentName }));

        // 🚀 FIX: "The Amnesia Bug" - Update the parent's cached memory so it survives tab switching!
        const targetCustomer = customers.find(c => c.id === customerId);
        if (targetCustomer) {
            if (agentName === 'Unassigned') delete targetCustomer.assignedAgent;
            else targetCustomer.assignedAgent = agentName;
        }

        try {
            const customerRef = doc(db, `artifacts/${appId}/users/${user.uid}/customers`, customerId);
            await updateDoc(customerRef, {
                assignedAgent: agentName === 'Unassigned' ? deleteField() : agentName,
                updatedAt: serverTimestamp()
            });
            if (logAudit) logAudit("AGENT_ASSIGNED", `Assigned ${agentName} to store.`);
        } catch (error) {
            console.error("Failed to save assignment to Firebase:", error);
        }
    };

    // Fetch actual Fleet Personnel from Database
    useEffect(() => {
        const fetchAgents = async () => {
            if (!user || !appId) return;
            const userId = user?.uid || user?.id || 'default';
            
            try {
                // 🚀 FIX: Fetch both Motorists and Canvas teams simultaneously
                const [motoristsSnap, canvasSnap] = await Promise.all([
                    getDocs(collection(db, `artifacts/${appId}/users/${userId}/motorists`)),
                    getDocs(collection(db, `artifacts/${appId}/users/${userId}/canvas`))
                ]);
                
                const loadedMotorists = motoristsSnap.docs.map(doc => doc.data().name).filter(Boolean);
                const loadedCanvas = canvasSnap.docs.map(doc => doc.data().name).filter(Boolean);
                
                // Combine them into one master list and sort alphabetically
                const allAgents = [...loadedMotorists, ...loadedCanvas].sort();
                
                setAgentsList(allAgents);
            } catch (error) {
                console.error("Failed to load Fleet Personnel:", error);
            }
        };
        fetchAgents();
    }, [db, appId, user]);

    // Build the initial route and filter by assigned agent
    useEffect(() => {
        let baseRoute = customers.filter(c => c.visitFreq === 7 || c.visitDay === selectedDay);
        if (selectedAgent !== 'All') {
            baseRoute = baseRoute.filter(c => assignments[c.id] === selectedAgent);
        }
        setOrderedRoute(baseRoute);
    }, [customers, selectedDay, selectedAgent, assignments]);

    // Function to swap sequence order
    const moveStore = (index, direction) => {
        const newRoute = [...orderedRoute];
        if (direction === 'up' && index > 0) {
            [newRoute[index - 1], newRoute[index]] = [newRoute[index], newRoute[index - 1]];
        } else if (direction === 'down' && index < newRoute.length - 1) {
            [newRoute[index + 1], newRoute[index]] = [newRoute[index], newRoute[index + 1]];
        }
        setOrderedRoute(newRoute);
    };

    // 🚀 OSRM ROUTING ENGINE FOR JOURNEY PLAN
    useEffect(() => {
        const fetchRoute = async () => {
            // Must use orderedRoute so the map draws the lines in the exact sequence!
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
            } catch (error) {
                console.error("OSRM Routing failed:", error);
            }
        };
        fetchRoute();
    }, [orderedRoute]); // 🚀 FIX: Updated to the new Trip Builder array to prevent ReferenceError crashes!
    
    // Determine map center based on the first valid store of the sequence
    const validStore = orderedRoute.find(c => c.latitude && c.longitude && !isNaN(c.latitude));
    const mapCenter = validStore ? [validStore.latitude, validStore.longitude] : [-7.6145, 110.7122];

    const handleOpenLocation = (customer) => {
        if (customer.embedHtml) {
            if (customer.embedHtml.includes('<iframe')) {
                const match = customer.embedHtml.match(/src="([^"]+)"/);
                if (match && match[1]) { window.open(match[1], '_blank'); return; }
            } else { window.open(customer.embedHtml, '_blank'); return; }
        }
        if (customer.gmapsUrl) { window.open(customer.gmapsUrl, '_blank'); return; }
        if (customer.latitude && customer.longitude) {
            window.open(`http://googleusercontent.com/maps.google.com/maps?q=${customer.latitude},${customer.longitude}`, '_blank');
        } else {
            alert("No Location Link or GPS Coordinates found.");
        }
    };

    // --- LOGIC: HANDLE CLICK ON TICK BUTTON ---
    const handleTickClick = (customer) => {
        const isVisited = customer.lastVisit === todayDate;

        if (isVisited) {
            // SCENARIO 1: UNDO VISIT (Accidental Click)
            if (window.confirm(`Undo visit for ${customer.name}? This will clear today's report.`)) {
                handleUndoCheckIn(customer);
            }
        } else {
            // SCENARIO 2: NEW VISIT (Open Report)
            setCheckInCustomer(customer);
            setVisitNote("");
            setVisitTag("Routine Check");
        }
    };

    // --- UNDO FUNCTION ---
    const handleUndoCheckIn = async (customer) => {
        if (!user) return;
        try {
            const customerRef = doc(db, `artifacts/${appId}/users/${user.uid}/customers`, customer.id);
            
            // Remove the visit data from the database
            await updateDoc(customerRef, {
                lastVisit: null,       // Reset date
                lastVisitNote: deleteField(), // Remove note
                lastVisitTag: deleteField(),  // Remove tag
                updatedAt: serverTimestamp()
            });

            if (logAudit) await logAudit("VISIT_UNDO", `Undid visit for ${customer.name}`);
            if (triggerCapy) triggerCapy("Visit Cancelled. ↩️");

        } catch (error) {
            console.error("Undo Error:", error);
            alert("Failed to undo: " + error.message);
        }
    };

    // --- SUBMIT REPORT FUNCTION ---
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
            if (triggerCapy) triggerCapy(`Visit recorded: ${visitTag} ✅`);
            
            setCheckInCustomer(null);
            setIsSubmitting(false);

        } catch (error) {
            console.error("Check-in Error:", error);
            alert("Failed to save report: " + error.message);
            setIsSubmitting(false);
        }
    };

    const QUICK_TAGS = [
        "Repeat Order 📦",
        "Stock Full (No Order) 🛑",
        "Competitor Issue ⚠️",
        "New Request 📝",
        "Store Closed 🔒"
    ];

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/10">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <Truck size={24} className="text-orange-500"/> Journey Builder
                    </h2>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                        {orderedRoute.length} STOPS IN CURRENT SEQUENCE
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    
                    {/* 🚀 NEW AGENT FILTER */}
                    <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                        <span className="text-xs text-slate-400 pl-2 font-bold uppercase">Fleet:</span>
                        <select
                            value={selectedAgent}
                            onChange={(e) => setSelectedAgent(e.target.value)}
                            className="bg-slate-800 text-emerald-400 font-bold text-sm outline-none cursor-pointer border-none"
                            style={{ colorScheme: 'dark' }}
                        >
                            <option value="All" className="bg-slate-900 text-white">All Unassigned & Assigned</option>
                            {agentsList.map(a => <option key={a} value={a} className="bg-slate-900 text-white">{a}'s Route</option>)}
                        </select>
                    </div>

                    <Calendar size={16} className="text-slate-400 ml-2"/>
                    <select
                        value={selectedDay}
                        onChange={(e) => setSelectedDay(e.target.value)}
                        className="bg-slate-800 text-white border border-slate-700 p-2 rounded-lg font-bold text-sm outline-none focus:border-orange-500 cursor-pointer"
                        style={{ colorScheme: 'dark' }}
                    >
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                            <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 🚀 JOURNEY MAP RADAR (Injected between Header and Cards) */}
            <div className="w-full h-72 lg:h-96 bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-xl mb-2 relative z-0">
                <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    
                    {streetRoute && (
                        <Polyline 
                            positions={streetRoute} 
                            pathOptions={{ color: '#10b981', weight: 4, opacity: 0.8, dashArray: '10, 15' }} 
                            className="animate-pulse"
                        />
                    )}

                    {orderedRoute.map((store, idx) => {
                        if (!store || typeof store.latitude !== 'number' || typeof store.longitude !== 'number' || isNaN(store.latitude)) return null;
                        
                        // Change pin color if already visited
                        const isVisited = store.lastVisit === todayDate;
                        const iconHtml = isVisited ? '✅' : '📍';
                        const ringColor = isVisited ? '#10b981' : '#f97316';
                        
                        const customIcon = L.divIcon({
                            className: 'custom-icon',
                            html: `<div style="background-color: #1e293b; width: 30px; height: 30px; border-radius: 50%; border: 2px solid ${ringColor}; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 0 10px ${ringColor}80;">${iconHtml}</div>`,
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        });

                        return (
                            <Marker key={store.id} position={[store.latitude, store.longitude]} icon={customIcon}>
                                <LeafletTooltip direction="top" opacity={1}>
                                    <div className="bg-slate-900 text-white p-2 rounded border border-emerald-500 font-mono text-xs shadow-lg">
                                        <span className={isVisited ? "text-emerald-500 font-bold" : "text-orange-500 font-bold"}>
                                            {isVisited ? 'COMPLETED' : `Target ${idx + 1}`}
                                        </span><br/>
                                        {store.name}
                                    </div>
                                </LeafletTooltip>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>

            {/* CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orderedRoute.map((customer, idx) => {
                    const isVisited = customer.lastVisit === todayDate;

                    return (
                        <div key={customer.id} className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden group hover:shadow-lg transition-all flex flex-col ${isVisited ? 'border-emerald-500/50 dark:border-emerald-500/30' : 'dark:border-slate-700 hover:border-orange-500'}`}>
                            
                            {/* 🚀 TRIP BUILDER CONTROLS */}
                            <div className="bg-slate-900 border-b border-slate-700 p-2 flex justify-between items-center z-10">
                                <div className="flex gap-1">
                                    <button onClick={() => moveStore(idx, 'up')} disabled={idx === 0} className="w-7 h-7 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-white flex items-center justify-center font-bold">↑</button>
                                    <button onClick={() => moveStore(idx, 'down')} disabled={idx === orderedRoute.length - 1} className="w-7 h-7 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-white flex items-center justify-center font-bold">↓</button>
                                </div>
                                <select 
                                    className={`bg-slate-900 text-xs font-bold uppercase p-1.5 rounded outline-none cursor-pointer border ${assignments[customer.id] ? 'border-emerald-500 text-emerald-500' : 'border-slate-600 text-slate-400'}`}
                                    value={assignments[customer.id] || 'Unassigned'}
                                    onChange={(e) => setAssignments(prev => ({...prev, [customer.id]: e.target.value}))}
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option value="Unassigned" className="bg-slate-900 text-white">Unassigned</option>
                                    {agentsList.map(a => <option key={a} value={a} className="bg-slate-900 text-white">{a}</option>)}
                                </select>
                            </div>

                            {/* IMAGE & BADGE HEADER */}
                            <div className="h-32 bg-slate-200 dark:bg-slate-700 relative">
                                {customer.storeImage ? (
                                    <img 
                                        key={customer.storeImage} 
                                        src={customer.storeImage} 
                                        className={`w-full h-full object-cover ${isVisited ? 'grayscale' : ''}`}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://via.placeholder.com/400x200?text=No+Image';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <Store size={32} opacity={0.5}/>
                                    </div>
                                )}
                                <div className={`absolute top-2 left-2 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded border border-white/20 ${isVisited ? 'bg-emerald-600/80' : 'bg-black/60'}`}>
                                    {isVisited ? 'VISITED' : `STOP #${idx + 1}`}
                                </div>
                                
                                {customer.lastVisitNote && !isVisited && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 px-2 text-[9px] text-white truncate border-t border-white/10">
                                        Last: {customer.lastVisitNote}
                                    </div>
                                )}
                            </div>

                            {/* CONTENT BODY */}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-bold text-lg leading-tight transition-colors ${isVisited ? 'text-emerald-600 line-through decoration-2' : 'dark:text-white group-hover:text-orange-500'}`}>
                                        {customer.name}
                                    </h3>
                                </div>
                                
                                <div className="space-y-2 mb-6 flex-1">
                                    <p className="text-xs text-slate-500 flex items-start gap-2">
                                        <MapPin size={12} className="mt-0.5 shrink-0"/>
                                        {customer.address || "No address provided"}
                                    </p>
                                    {(customer.city || customer.region) && (
                                        <p className="text-[10px] font-bold text-slate-400 uppercase pl-5">
                                            {customer.city} {customer.region ? `• ${customer.region}` : ''}
                                        </p>
                                    )}
                                    {customer.phone && (
                                        <p className="text-xs text-emerald-600 flex items-center gap-2 pt-1 font-bold">
                                            <Phone size={12}/> {customer.phone}
                                        </p>
                                    )}
                                </div>

                                {/* ACTIONS FOOTER */}
                                <div className="flex gap-2 pt-4 border-t dark:border-slate-700">
                                    <button 
                                        onClick={() => handleOpenLocation(customer)}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
                                    >
                                        <Navigation size={14}/> 
                                        {customer.embedHtml ? "Street View" : "Directions"}
                                    </button>
                                    
                                    {/* TICK / UNTICK BUTTON */}
                                    <button 
                                        onClick={() => handleTickClick(customer)}
                                        className={`px-4 rounded-lg transition-all border flex items-center justify-center group/btn relative ${
                                            isVisited 
                                            ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-red-500 hover:border-red-500' 
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-white hover:bg-emerald-500 border-slate-200 dark:border-slate-600 hover:border-emerald-500'
                                        }`}
                                        title={isVisited ? "Click to UNDO" : "Mark as Visited"}
                                    >
                                        {/* Icon changes on hover if visited (Desktop mainly, but helpful visual) */}
                                        {isVisited ? (
                                            <>
                                                <CheckCircle size={18} className="group-hover/btn:hidden"/>
                                                <RotateCcw size={18} className="hidden group-hover/btn:block animate-spin-slow"/> 
                                            </>
                                        ) : (
                                            <CheckCircle size={18}/>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- VISIT REPORT MODAL --- */}
            {checkInCustomer && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border dark:border-slate-700 flex flex-col overflow-hidden">
                        
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 border-b dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                    <Store size={18} className="text-orange-500"/>
                                    Visit Report: {checkInCustomer.name}
                                </h3>
                                <p className="text-xs text-slate-500">Record visit details for {new Date().toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setCheckInCustomer(null)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24}/></button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Visit Outcome</label>
                                <div className="flex flex-wrap gap-2">
                                    {QUICK_TAGS.map(tag => (
                                        <button 
                                            key={tag}
                                            onClick={() => setVisitTag(tag)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                                visitTag === tag 
                                                ? 'bg-orange-500 text-white border-orange-500 shadow-md' 
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-orange-400'
                                            }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
                                    <MessageSquare size={14}/> Field Notes
                                </label>
                                <textarea 
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 dark:text-white text-sm focus:border-orange-500 outline-none min-h-[100px]"
                                    placeholder="Describe repeat orders, stock levels, or customer feedback..."
                                    value={visitNote}
                                    onChange={(e) => setVisitNote(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700 flex justify-end gap-3">
                            <button 
                                onClick={() => setCheckInCustomer(null)}
                                className="px-6 py-2 rounded-xl bg-white dark:bg-slate-700 border dark:border-slate-600 font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmCheckIn}
                                disabled={isSubmitting}
                                className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={16}/> {isSubmitting ? 'Saving...' : 'Confirm Visit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JourneyView;