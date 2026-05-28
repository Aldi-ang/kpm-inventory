import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ArrowRight, MapPin, Phone, User, ShieldAlert, Trash2, Store, Camera, X, RefreshCcw, Search } from 'lucide-react';

// --- CUSTOMER DETAIL VIEW (WITH IFRAME SUPPORT) ---
export const CustomerDetailView = ({ customer, db, appId, user, onBack, logAudit, triggerCapy }) => {
    const [benchmarks, setBenchmarks] = useState([]);
    const [newBench, setNewBench] = useState({ brand: '', product: '', price: '', notes: '', volume: 'Medium' });
    const [mapMode, setMapMode] = useState('map'); 

    useEffect(() => {
        const q = query(collection(db, `artifacts/${appId}/users/${user.uid}/customers/${customer.id}/benchmarks`), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => setBenchmarks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [customer.id, db, appId, user.uid]);

    const handleAddBenchmark = async (e) => {
        e.preventDefault();
        if (!newBench.product || !newBench.price) return;
        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/customers/${customer.id}/benchmarks`), { ...newBench, price: parseFloat(newBench.price), createdAt: serverTimestamp() });
            setNewBench({ brand: '', product: '', price: '', notes: '', volume: 'Medium' });
            triggerCapy("Competitor data logged!");
        } catch (err) { console.error(err); }
    };

    const handleDeleteBenchmark = async (id) => {
        if (!window.confirm("Delete record?")) return;
        await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/customers/${customer.id}/benchmarks`, id));
    };

    // --- MAP RENDER LOGIC ---
    const renderMap = () => {
        if (customer.embedHtml && customer.embedHtml.startsWith("<iframe")) {
            return <div dangerouslySetInnerHTML={{ __html: customer.embedHtml.replace('<iframe', '<iframe width="100%" height="100%" style="border:0;"') }} className="w-full h-full" />;
        }

        const hasGPS = customer.latitude && customer.longitude;
        let src = "";

        if (mapMode === 'street') {
             const loc = hasGPS ? `${customer.latitude},${customer.longitude}` : encodeURIComponent(customer.address || customer.name);
             src = `https://maps.google.com/maps?q=$${loc}&layer=c&output=svembed`;
        } else {
             if (hasGPS) src = `https://maps.google.com/maps?q=$${customer.latitude},${customer.longitude}&z=18&output=embed`;
             else {
                 let query = customer.address || customer.name;
                 if (customer.city) query += `, ${customer.city}`;
                 src = `https://maps.google.com/maps?q=$${encodeURIComponent(query)}&z=15&output=embed`;
             }
        }

        return <iframe width="100%" height="100%" src={src} frameBorder="0" className="transition-all duration-500"></iframe>;
    };

    return (
        <div className="animate-fade-in space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to List</button>
            
            <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700">
                        <h2 className="text-2xl font-bold dark:text-white mb-1">{customer.name}</h2>
                        <div className="text-sm text-slate-500 mb-4 flex items-center gap-2"><MapPin size={14}/> {customer.city} {customer.region}</div>
                        
                        <div className="space-y-3 mb-6">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center gap-3"><Phone size={18} className="text-slate-400"/><span className="font-bold dark:text-white">{customer.phone || "-"}</span></div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-start gap-3">
                                <MapPin size={18} className="text-slate-400 mt-1"/>
                                <div><span className="text-sm dark:text-slate-300 block">{customer.address || "No Address"}</span>{customer.latitude && <span className="text-[10px] text-emerald-500 font-mono mt-1 block">GPS: {customer.latitude}, {customer.longitude}</span>}</div>
                            </div>
                        </div>

                        {/* MAP CONTAINER */}
                        <div className="rounded-xl overflow-hidden border dark:border-slate-700 h-64 bg-slate-100 relative group">
                            {renderMap()}
                            
                            {!customer.embedHtml && (
                                <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                                    <button onClick={() => setMapMode(mapMode === 'map' ? 'street' : 'map')} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform">
                                        {mapMode === 'map' ? <><User size={14} className="text-orange-500"/> Street View</> : <><MapPin size={14} className="text-blue-500"/> Map View</>}
                                    </button>
                                </div>
                            )}
                        </div>
                        {customer.embedHtml ? 
                            <p className="text-[10px] text-emerald-500 mt-2 text-center font-bold">Using Custom Embed View</p> :
                            <p className="text-[10px] text-slate-400 mt-2 text-center">{customer.latitude ? "Exact GPS Location" : "Approximate Address Location"}</p>
                        }
                    </div>
                </div>

                {/* COMPETITOR CATALOG */}
                <div className="md:w-2/3">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div><h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><ShieldAlert size={20} className="text-red-500"/> Competitor Intelligence</h3><p className="text-xs text-slate-500">Track benchmark prices at this specific store.</p></div>
                        </div>
                        <form onSubmit={handleAddBenchmark} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-700 mb-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                <input value={newBench.brand} onChange={e=>setNewBench({...newBench, brand:e.target.value})} placeholder="Brand" className="p-2 text-sm rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white"/>
                                <input value={newBench.product} onChange={e=>setNewBench({...newBench, product:e.target.value})} placeholder="Product Name" className="p-2 text-sm rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white"/>
                                <input type="number" step="any" value={newBench.price} onChange={e=>setNewBench({...newBench, price:e.target.value})} placeholder="Price (Rp)" className="p-2 text-sm rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white"/>
                                <select value={newBench.volume} onChange={e=>setNewBench({...newBench, volume:e.target.value})} className="p-2 text-sm rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white"><option>High Sales</option><option>Medium</option><option>Slow Moving</option></select>
                            </div>
                            <div className="flex gap-3"><input value={newBench.notes} onChange={e=>setNewBench({...newBench, notes:e.target.value})} placeholder="Notes (e.g. Promos)" className="flex-1 p-2 text-sm rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white"/><button className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-600">Add Log</button></div>
                        </form>
                        <div className="flex-1 overflow-y-auto overflow-x-auto pb-2">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="text-slate-500 font-bold border-b dark:border-slate-700">
                                    <tr>
                                        <th className="pb-3 pl-2 w-1/3">Product</th>
                                        <th className="pb-3 w-1/6">Price</th>
                                        <th className="pb-3 w-1/4">Performance</th>
                                        <th className="pb-3 w-1/4">Notes</th>
                                        <th className="pb-3 text-right pr-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {benchmarks.map(b => (
                                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="py-3 pl-2">
                                                <div className="font-bold dark:text-white truncate max-w-[150px]">{b.product}</div>
                                                <div className="text-xs text-slate-500">{b.brand}</div>
                                            </td>
                                            <td className="py-3 font-mono text-red-500 font-bold whitespace-nowrap">
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(b.price)}
                                            </td>
                                            <td className="py-3">
                                                <span className={`text-[10px] px-2 py-1 rounded-full border whitespace-nowrap ${b.volume === 'High Sales' ? 'bg-green-100 text-green-700 border-green-200' : b.volume === 'Slow Moving' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                                    {b.volume}
                                                </span>
                                            </td>
                                            <td className="py-3 text-slate-500 text-xs italic truncate max-w-[150px]">{b.notes}</td>
                                            <td className="py-3 text-right pr-2">
                                                <button onClick={()=>handleDeleteBenchmark(b.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};          

// --- UPGRADED: CUSTOMER MANAGEMENT ---
export const CustomerManagement = ({ customers, db, appId, user, logAudit, triggerCapy, isAdmin, tierSettings, onRequestCrop, croppedImage, onClearCroppedImage }) => {
    const [viewMode, setViewMode] = useState('list');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    
    // 🚀 NEW: Tactical Dashboard State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProvince, setSelectedProvince] = useState(null); // PROVINSI
    const [selectedRegion, setSelectedRegion] = useState(null); // KABUPATEN
    const [selectedCity, setSelectedCity] = useState(null); // KECAMATAN

    const [formData, setFormData] = useState({ 
        name: '', phone: '', province: '', region: '', city: '', address: '', 
        gmapsUrl: '', embedHtml: '', 
        latitude: '', longitude: '', storeImage: '', 
        tier: 'Silver', priceTier: 'Retail', visitFreq: 7, lastVisit: new Date().toISOString().split('T')[0],
        picName: '' 
    });
    const [editingId, setEditingId] = useState(null);
    const [isLocating, setIsLocating] = useState(false);

    // 🧠 SMART DICTIONARY: Auto-categorize legacy data
    const guessProvince = (kabupaten) => {
        const kab = String(kabupaten || '').toLowerCase();
        if (kab.includes('magelang') || kab.includes('muntilan') || kab.includes('boyolali') || kab.includes('solo') || kab.includes('surakarta') || kab.includes('klaten') || kab.includes('semarang')) return 'Jawa Tengah';
        if (kab.includes('yogya') || kab.includes('sleman') || kab.includes('bantul') || kab.includes('gunungkidul') || kab.includes('kulon')) return 'DI Yogyakarta';
        return 'Unknown Provinsi';
    };

    // 🚀 UPGRADED: Search & Folder Engine (4 Tiers)
    const searchedCustomers = useMemo(() => {
        if (!searchTerm.trim()) return customers;
        const term = searchTerm.toLowerCase();
        return customers.filter(c => 
            String(c.name || '').toLowerCase().includes(term) ||
            String(c.city || '').toLowerCase().includes(term) ||
            String(c.region || '').toLowerCase().includes(term) ||
            String(c.province || '').toLowerCase().includes(term) ||
            String(c.picName || '').toLowerCase().includes(term) ||
            String(c.nooAgentName || '').toLowerCase().includes(term)
        );
    }, [customers, searchTerm]);

    const folderStructure = useMemo(() => {
        const structure = {};
        searchedCustomers.forEach(c => {
            // Strict String casting prevents .trim() crashes on older numerical data
            const prov = String(c.province || '').trim() || guessProvince(c.region);
            const kab = String(c.region || '').trim() || 'Unknown Kabupaten';
            const kec = String(c.city || '').trim() || 'Unknown Kecamatan';
            
            if (!structure[prov]) structure[prov] = { count: 0, pending: 0, regions: {} };
            if (!structure[prov].regions[kab]) structure[prov].regions[kab] = { count: 0, pending: 0, cities: {} };
            if (!structure[prov].regions[kab].cities[kec]) structure[prov].regions[kab].cities[kec] = { count: 0, pending: 0, stores: [] };
            
            structure[prov].count++;
            structure[prov].regions[kab].count++;
            structure[prov].regions[kab].cities[kec].count++;
            
            if (c.status === 'PENDING') {
                structure[prov].pending++;
                structure[prov].regions[kab].pending++;
                structure[prov].regions[kab].cities[kec].pending++;
            }
            
            structure[prov].regions[kab].cities[kec].stores.push(c);
        });
        return structure;
    }, [searchedCustomers]);

    // 🛡️ CRASH PREVENTION: Strict evaluation blocks "null" key lookups
    const activeProv = selectedProvince ? folderStructure[selectedProvince] : null;
    const activeKab = (activeProv && selectedRegion) ? activeProv.regions[selectedRegion] : null;
    const activeKec = (activeKab && selectedCity) ? activeKab.cities[selectedCity] : null;
    
    useEffect(() => {
        if (croppedImage) {
            setFormData(prev => ({ ...prev, storeImage: croppedImage }));
            onClearCroppedImage(); 
        }
    }, [croppedImage]);

    const [coordInput, setCoordInput] = useState("");
    const coordRef = useRef(null);

    useEffect(() => {
        if (document.activeElement !== coordRef.current) {
            if (formData.latitude && formData.longitude) {
                setCoordInput(`${formData.latitude}, ${formData.longitude}`);
            } else {
                setCoordInput("");
            }
        }
    }, [formData.latitude, formData.longitude]);

    const handleAutoGeocode = async () => {
        if (!formData.address && !formData.city) { alert("Please enter City/Address first!"); return; }
        setIsLocating(true);
        try {
            const query = `${formData.address}, ${formData.city || ''}, ${formData.region || ''}`;
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const result = data[0];
                setFormData(prev => ({ ...prev, latitude: parseFloat(result.lat), longitude: parseFloat(result.lon) }));
                triggerCapy(`Found: ${result.display_name.split(',')[0]} 📍`);
            } else { alert("Location not found."); }
        } catch (error) { console.error(error); alert("Geocoding failed."); }
        setIsLocating(false);
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormData(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
                setIsLocating(false);
                triggerCapy("GPS Locked! 🎯");
            },
            (err) => { alert("GPS Error: " + err.message); setIsLocating(false); }
        );
    };

    const handleCoordInputChange = (e) => {
        const val = e.target.value;
        setCoordInput(val);
        const parts = val.split(',').map(s => s.trim());
        if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
        }
    };

    const handleFileSelect = (e) => {
        if(e.target.files[0] && onRequestCrop) {
            onRequestCrop(e.target.files[0]);
        }
        e.target.value = null; 
    };

    const handleSubmit = async (e) => { 
        e.preventDefault(); 
        if (!formData.name.trim()) return; 
        
        const cleanData = {
            ...formData,
            name: formData.name.trim(),
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            updatedAt: serverTimestamp(),
            // 🚀 NEW: Stamp the NOO with the active agent's identity
            nooAgentName: user.displayName || user.email.split('@')[0],
            nooAgentId: user.uid
        };
        
        try { 
            if (editingId) { 
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', editingId), cleanData); 
                await logAudit("CUSTOMER_UPDATE", `Updated: ${formData.name}`); 
                triggerCapy("Customer updated!"); 
                setEditingId(null); 
            } else { 
                // 🚀 ANTI-FRAUD QUARANTINE 🚀
                // Admin bypasses the lock. Field Agents get locked as PENDING.
                const initialStatus = isAdmin ? 'APPROVED' : 'PENDING';
                
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'customers'), {
                    ...cleanData,
                    status: initialStatus,
                    createdAt: serverTimestamp()
                }); 
                
                await logAudit("CUSTOMER_ADD", `Added: ${formData.name} (${initialStatus})`); 
                
                // 🔔 TRIGGER ADMIN NOTIFICATION BELL
                if (initialStatus === 'PENDING') {
                    const agentName = user.displayName || user.email.split('@')[0];
                    await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/notifications`), {
                        title: "🏪 NOO Verification Required",
                        message: `${agentName} submitted a new outlet: ${formData.name}.`,
                        type: "NOO_APPROVAL",
                        isRead: false,
                        timestamp: serverTimestamp(),
                        linkToTab: "customers" // Clicking the bell takes you straight here!
                    });
                    triggerCapy("New Outlet submitted! Waiting for Admin verification.");
                } else {
                    triggerCapy("Customer added and approved!"); 
                }
            } 
            setFormData({ name: '', phone: '', province: '', region: '', city: '', address: '', gmapsUrl: '', embedHtml: '', latitude: '', longitude: '', storeImage: '', tier: 'Silver', priceTier: 'Retail', visitFreq: 7, lastVisit: new Date().toISOString().split('T')[0], picName: '' }); 
            setCoordInput("");
        } catch (err) { console.error(err); } 
    };

    const handleEdit = (c) => { 
        setFormData({ 
            name: c.name, phone: c.phone || '', province: c.province || '', region: c.region || '', city: c.city || '', 
            address: c.address || '', gmapsUrl: c.gmapsUrl || '', embedHtml: c.embedHtml || '',
            storeImage: c.storeImage || '',
            latitude: c.latitude || '', longitude: c.longitude || '',
            tier: c.tier || 'Silver', priceTier: c.priceTier || 'Retail', visitFreq: c.visitFreq || 7, lastVisit: c.lastVisit || new Date().toISOString().split('T')[0]
        }); 
        setCoordInput(c.latitude && c.longitude ? `${c.latitude}, ${c.longitude}` : "");
        setEditingId(c.id); 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };

    const handleDelete = async (id, name) => { if (window.confirm("Delete profile?")) { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', id)); logAudit("CUSTOMER_DELETE", `Deleted ${name}`); } };
    const openDetail = (c) => { setSelectedCustomer(c); setViewMode('detail'); };


    // 🚀 ADMIN NOO APPROVAL PROTOCOL
    const handleApproveNOO = async (e, id, name) => {
        e.stopPropagation();
        if (!window.confirm(`Approve NOO for ${name}? This will permanently unlock the store for Field Agents.`)) return;
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', id), {
                status: 'APPROVED',
                verifiedAt: serverTimestamp()
            });
            logAudit("NOO_APPROVED", `Verified and approved NOO: ${name}`);
            triggerCapy(`${name} is now unlocked and live! 🟢`);
        } catch(err) { console.error(err); alert("Failed to approve: " + err.message); }
    };

    if (viewMode === 'detail' && selectedCustomer) return <CustomerDetailView customer={selectedCustomer} db={db} appId={appId} user={user} onBack={() => { setViewMode('list'); setSelectedCustomer(null); }} logAudit={logAudit} triggerCapy={triggerCapy} />;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Store size={24} className="text-orange-500"/> Customer Directory</h2>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-sm text-slate-500 uppercase">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>{editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({name:'', phone:'', province:'', region:'', city:'', address:'', gmapsUrl:'', embedHtml: '', latitude: '', longitude: '', storeImage:'', tier: 'Silver', priceTier: 'Retail', visitFreq: 7, lastVisit: '', picName: ''}); setCoordInput(""); }} className="text-xs text-red-500 hover:underline">Cancel Edit</button>}</div>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase">Store Name</label><input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" required/></div>
                        <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase">Phone</label><input value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" /></div>
                    </div>

                   <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-indigo-50 dark:bg-slate-900/50 p-3 rounded-xl border border-indigo-100 dark:border-slate-700">
                        <div>
                            <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block">Map Pin Tier</label>
                            <select value={formData.tier} onChange={e=>setFormData({...formData, tier: e.target.value})} className="w-full h-10 px-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white font-bold outline-none">
                                {tierSettings && tierSettings.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                {!tierSettings && <option value="Silver">Silver</option>}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-orange-500 uppercase mb-1 block">Pricing Type</label>
                            <select value={formData.priceTier} onChange={e=>setFormData({...formData, priceTier: e.target.value})} className="w-full h-10 px-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white font-bold outline-none text-orange-500">
                                <option value="Grosir">Grosir (Wholesale)</option>
                                <option value="Retail">Retail</option>
                                <option value="Ecer">Ecer (Individual)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block">T3/T4 PIC (Penanggung Jawab)</label>
                            <select value={formData.picName} onChange={e=>setFormData({...formData, picName: e.target.value})} className="w-full h-10 px-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white font-bold outline-none text-indigo-600">
                                <option value="">-- Select PIC --</option>
                                {/* Replace these with your actual Cello Wholesaler list */}
                                <option value="Distributor Pusat">Distributor Pusat</option>
                                <option value="Agen T3 Muntilan">Agen T3 Muntilan</option>
                                <option value="Agen T4 Yogya">Agen T4 Yogya</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block">Last Visit</label>
                            <input type="date" value={formData.lastVisit} onChange={e=>setFormData({...formData, lastVisit: e.target.value})} className="w-full h-10 px-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white outline-none"/>
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block">Store Photo</label>
                            <div className="flex items-center gap-2 h-10">
                                <label className="flex-1 h-full cursor-pointer bg-white dark:bg-slate-800 border dark:border-slate-600 hover:border-indigo-500 rounded p-2 flex items-center justify-center gap-2 transition-colors">
                                    <Camera size={16} className="text-indigo-500"/>
                                    <span className="text-xs font-bold dark:text-white">Upload</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                                </label>
                                {formData.storeImage && (
                                    <div className="w-10 h-full rounded border border-indigo-200 overflow-hidden shrink-0 group relative">
                                        <img src={formData.storeImage} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setFormData({...formData, storeImage: ''})} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100"><X size={12}/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <MapPin size={16} className="text-orange-500"/>
                                <span className="font-bold text-sm dark:text-white">Location & Street View</span>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={handleAutoGeocode} disabled={isLocating} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1 shadow-md">
                                    {isLocating ? <RefreshCcw size={12} className="animate-spin"/> : <Search size={12}/>} Auto-Find
                                </button>
                                <button type="button" onClick={handleGetLocation} className="bg-white dark:bg-slate-700 border dark:border-slate-600 px-3 rounded text-xs font-bold hover:bg-slate-100 flex items-center gap-1">
                                    <MapPin size={12}/> My GPS
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-2">
                            <input value={formData.province} onChange={e=>setFormData({...formData, province: e.target.value})} className="w-full md:flex-1 p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="Provinsi" />
                            <input value={formData.region} onChange={e=>setFormData({...formData, region: e.target.value})} className="w-full md:flex-1 p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="Kabupaten" />
                            <input value={formData.city} onChange={e=>setFormData({...formData, city: e.target.value})} className="w-full md:flex-1 p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="Kecamatan" />
                        </div>

                        <input value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="w-full p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="Address..." />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">GPS Coordinates</label>
                                <input ref={coordRef} type="text" placeholder="-7.6043, 110.2055" className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white font-mono" value={coordInput} onChange={handleCoordInputChange} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Street View Link (Iframe/URL)</label>
                                <input 
                                    type="text" 
                                    placeholder="Paste Google Maps Link or Embed Code here..." 
                                    className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white" 
                                    value={formData.embedHtml} 
                                    onChange={e => setFormData({...formData, embedHtml: e.target.value})} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button className={`text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 ${editingId ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'}`}>{editingId ? 'Update Profile' : 'Save Customer'}</button>
                    </div>
                </form>
            </div>

            {/* 🚀 GLOBAL SEARCH BAR */}
            <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search size={20} className="text-slate-400" /></div>
                <input 
                    type="text" 
                    placeholder="Search store name, region, city, or salesperson..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-orange-500 outline-none shadow-sm transition-all"
                />
            </div>

            {/* 🚀 TACTICAL FOLDER DASHBOARD (CRASH-PROOFED) */}
            <div className="animate-fade-in relative z-10">
                {/* BREADCRUMB NAVIGATION */}
                {(selectedProvince || selectedRegion || selectedCity) && (
                    <div className="flex flex-wrap items-center gap-2 mb-6 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg w-fit">
                        <button onClick={() => { setSelectedProvince(null); setSelectedRegion(null); setSelectedCity(null); }} className="text-slate-500 hover:text-orange-500 font-bold text-sm flex items-center gap-1">
                            <Folder size={16}/> Indonesia
                        </button>
                        
                        {selectedProvince && (
                            <>
                                <ArrowRight size={14} className="text-slate-400"/>
                                <button onClick={() => { setSelectedRegion(null); setSelectedCity(null); }} className={`font-bold text-sm ${!selectedRegion ? 'text-orange-500' : 'text-slate-500 hover:text-orange-500'}`}>
                                    {selectedProvince}
                                </button>
                            </>
                        )}

                        {selectedRegion && (
                            <>
                                <ArrowRight size={14} className="text-slate-400"/>
                                <button onClick={() => setSelectedCity(null)} className={`font-bold text-sm ${!selectedCity ? 'text-orange-500' : 'text-slate-500 hover:text-orange-500'}`}>
                                    {selectedRegion}
                                </button>
                            </>
                        )}
                        
                        {selectedCity && (
                            <>
                                <ArrowRight size={14} className="text-slate-400"/>
                                <span className="font-bold text-sm text-orange-500">{selectedCity}</span>
                            </>
                        )}
                    </div>
                )}

                {/* LEVEL 0: PROVINSI */}
                {!selectedProvince && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(folderStructure).map(([prov, data]) => (
                            <div key={prov} onClick={() => setSelectedProvince(prov)} className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-orange-500 transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-red-100 dark:bg-slate-700 rounded-lg text-red-600 group-hover:bg-red-500 group-hover:text-white transition-colors"><MapPin size={24} /></div>
                                    {data.pending > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">{data.pending} Pending</span>}
                                </div>
                                <h3 className="font-bold text-lg dark:text-white mb-2 truncate">{prov}</h3>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{data.count} Total Stores</p>
                            </div>
                        ))}
                        {Object.keys(folderStructure).length === 0 && <div className="col-span-full text-center py-12 opacity-50"><Folder size={48} className="mx-auto mb-4"/><p className="font-bold tracking-widest uppercase">No Data Found</p></div>}
                    </div>
                )}

                {/* LEVEL 1: KABUPATEN */}
                {selectedProvince && !selectedRegion && activeProv && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(activeProv?.regions || {}).map(([kab, data]) => (
                            <div key={kab} onClick={() => setSelectedRegion(kab)} className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-orange-500 transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-orange-100 dark:bg-slate-700 rounded-lg text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Folder size={24} /></div>
                                    {data.pending > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">{data.pending} Pending</span>}
                                </div>
                                <h3 className="font-bold text-lg dark:text-white mb-2 truncate">{kab}</h3>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{data.count} Registered</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* LEVEL 2: KECAMATAN */}
                {selectedProvince && selectedRegion && !selectedCity && activeKab && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(activeKab?.cities || {}).map(([kec, data]) => (
                            <div key={kec} onClick={() => setSelectedCity(kec)} className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-500 transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-blue-100 dark:bg-slate-700 rounded-lg text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Folder size={24} /></div>
                                    {data.pending > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">{data.pending} Pending</span>}
                                </div>
                                <h3 className="font-bold text-lg dark:text-white mb-2 truncate">{kec}</h3>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{data.count} Registered</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* LEVEL 3: STORES */}
                {selectedProvince && selectedRegion && selectedCity && activeKec && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(activeKec?.stores || []).map(c => {
                            const tierDef = tierSettings ? tierSettings.find(t => t.id === c.tier) : null;
                            return (
                                <div key={c.id} onClick={() => openDetail(c)} className={`bg-white dark:bg-slate-800 p-5 rounded-xl border dark:border-slate-700 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-orange-500 transition-all group ${editingId === c.id ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-slate-700' : ''}`}>
                                    
                                    {/* TOP: Store Header */}
                                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            {c.storeImage ? (
                                                <img src={c.storeImage} className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-600 shrink-0 shadow-sm" alt={c.name} />
                                            ) : (
                                                <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0">
                                                    <Store size={24} className="text-slate-400" />
                                                </div>
                                            )}
                                            <div className="min-w-0 pr-2">
                                                <h3 className="font-bold text-lg leading-tight dark:text-white group-hover:text-orange-500 transition-colors truncate">{c.name}</h3>
                                                <div className="flex gap-2 items-center mt-1.5">
                                                    {tierDef ? (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 font-bold w-fit" style={{ borderColor: tierDef.color, backgroundColor: `${tierDef.color}15`, color: tierDef.color }}>
                                                            {tierDef.iconType === 'image' ? <img src={tierDef.value} className="w-3 h-3 object-contain"/> : tierDef.value} {tierDef.label}
                                                        </span>
                                                    ) : ( <span className="text-[10px] px-2 py-0.5 rounded-md border bg-slate-100 text-slate-600 border-slate-300">{c.tier}</span> )}
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-widest ${c.priceTier === 'Grosir' ? 'bg-blue-100 text-blue-700 border-blue-200' : c.priceTier === 'Ecer' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                                                        {c.priceTier || 'Retail'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {c.latitude ? <MapPin size={20} className="text-emerald-500 shrink-0"/> : <MapPin size={20} className="text-slate-300 shrink-0"/>}
                                    </div>

                                    {/* MIDDLE: Accountability Block */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">T3/T4 PIC</p>
                                            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate">{c.picName || 'Unassigned'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">NOO By</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{c.nooAgentName || 'Admin'}</p>
                                        </div>
                                    </div>

                                   {/* BOTTOM: Admin Actions */}
                                   {isAdmin && (
                                        <div className="flex gap-2 justify-end mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
                                            {c.status === 'PENDING' && (
                                                <button onClick={(e) => handleApproveNOO(e, c.id, c.name)} className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-200 font-bold rounded-lg hover:bg-emerald-500 hover:text-white transition-all animate-pulse shadow-sm">
                                                    Verify NOO
                                                </button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(c); }} className="px-4 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-lg hover:bg-blue-50 text-slate-600 dark:text-slate-300 transition-colors">Edit</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.name); }} className="px-4 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-lg hover:bg-red-50 hover:border-red-200 text-red-500 transition-colors">Delete</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}s
            </div>
        </div>
    );
};