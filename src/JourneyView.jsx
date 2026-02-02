import React, { useState } from 'react';
import { Truck, MapPin, CheckCircle, Calendar, Phone, Store, Navigation, X, Save, MessageSquare, RotateCcw } from 'lucide-react';
import { doc, updateDoc, serverTimestamp, deleteField } from "firebase/firestore";

const JourneyView = ({ customers, db, appId, user, logAudit, triggerCapy }) => {
    const [selectedDay, setSelectedDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
    
    // --- CHECK-IN STATE ---
    const [checkInCustomer, setCheckInCustomer] = useState(null); 
    const [visitNote, setVisitNote] = useState("");
    const [visitTag, setVisitTag] = useState("Routine Check");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const todaysRoute = customers.filter(c => c.visitFreq === 7 || c.visitDay === selectedDay);
    const todayDate = new Date().toISOString().split('T')[0];

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
                        <Truck size={24} className="text-orange-500"/> Journey Plan
                    </h2>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                        {todaysRoute.length} STOPS SCHEDULED FOR TODAY
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400"/>
                    <select 
                        value={selectedDay} 
                        onChange={(e) => setSelectedDay(e.target.value)}
                        className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-2 rounded-lg font-bold text-sm outline-none focus:border-orange-500"
                    >
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {todaysRoute.map((customer, idx) => {
                    const isVisited = customer.lastVisit === todayDate;

                    return (
                        <div key={customer.id} className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden group hover:shadow-lg transition-all flex flex-col ${isVisited ? 'border-emerald-500/50 dark:border-emerald-500/30' : 'dark:border-slate-700 hover:border-orange-500'}`}>
                            
                            {/* IMAGE & BADGE HEADER */}
                            <div className="h-32 bg-slate-200 dark:bg-slate-700 relative">
                                {customer.storeImage ? (
                                    <img src={customer.storeImage} className={`w-full h-full object-cover ${isVisited ? 'grayscale' : ''}`}/>
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