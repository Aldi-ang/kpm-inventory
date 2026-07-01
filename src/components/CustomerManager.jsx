import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, getDocs, writeBatch } from 'firebase/firestore';

// 🚀 GEOSPATIAL MATH ENGINE: Allows the CRM Directory to read Map Borders!
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
    } catch(e) { }
    return false;
};
import { ArrowRight, MapPin, Phone, User, ShieldAlert, Trash2, Store, Camera, X, RefreshCcw, Search, Folder, Pencil, Plus, Globe } from 'lucide-react';

// --- CUSTOMER DETAIL VIEW (WITH IFRAME SUPPORT) ---
export const CustomerDetailView = ({ customer, db, appId, user, onBack, logAudit, triggerCapy, onNavigateToMap }) => {
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
             // Added cbll parameter for accurate street view positioning
             src = `https://maps.google.com/maps?q=${loc}&layer=c&cbll=${loc}&output=svembed`;
        } else {
             if (hasGPS) {
                 src = `https://maps.google.com/maps?q=${customer.latitude},${customer.longitude}&z=18&output=embed`;
             } else {
                 let query = customer.address || customer.name;
                 if (customer.city) query += `, ${customer.city}`;
                 src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
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
                                <div>
                                    <span className="text-sm dark:text-slate-300 block">{customer.address || "No Address"}</span>
                                    {customer.latitude && <span className="text-[10px] text-emerald-500 font-mono mt-1 block">GPS: {customer.latitude}, {customer.longitude}</span>}
                                    {customer.mapFolder && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-bold inline-block mt-1 uppercase tracking-widest"><Folder size={10} className="inline mr-1"/> {customer.mapFolder}</span>}
                                </div>
                            </div>
                            {customer.description && (
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1">Store Notes / Map Marker Data</p>
                                    <p className="text-xs dark:text-slate-300 whitespace-pre-line">{customer.description}</p>
                                </div>
                            )}
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
                        
                        <button onClick={() => {
                            sessionStorage.setItem('targetMapStore', customer.id);
                            if (onNavigateToMap) onNavigateToMap();
                            else window.dispatchEvent(new CustomEvent('switchTab', { detail: 'map' }));
                        }} className="w-full mt-4 py-3 bg-slate-800 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md group">
                            <Globe size={16} className="text-orange-400 group-hover:text-white" /> Open in Map Mission Control
                        </button>
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
export const CustomerManagement = ({ customers, db, appId, user, logAudit, triggerCapy, isAdmin, tierSettings, onRequestCrop, croppedImage, onClearCroppedImage, onNavigateToMap }) => {
    const [viewMode, setViewMode] = useState('list');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    
    // 🚀 NEW: Tactical Dashboard State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProvince, setSelectedProvince] = useState(null); // PROVINSI
    const [selectedRegion, setSelectedRegion] = useState(null); // KABUPATEN
    const [selectedCity, setSelectedCity] = useState(null); // KECAMATAN

    // 🚀 NEW: Custom Empty Folder Tracking
    const [customProv, setCustomProv] = useState([]);
    const [customKab, setCustomKab] = useState({}); 
    const [customKec, setCustomKec] = useState({}); 

    const [formData, setFormData] = useState({ 
        name: '', phone: '', province: '', region: '', city: '', address: '', 
        gmapsUrl: '', embedHtml: '', 
        latitude: '', longitude: '', storeImage: '', 
        tier: 'Silver', priceTier: 'Retail', visitFreq: 7, lastVisit: new Date().toISOString().split('T')[0],
        picName: '', description: '', mapFolder: '' 
    });
    const [editingId, setEditingId] = useState(null);
    const [isLocating, setIsLocating] = useState(false);

    const userId = user?.uid || user?.id || 'default';

    // 🚀 MAP BORDER INTEGRATION: Fetch your custom map zones into the CRM
    const [mapBorders, setMapBorders] = useState([]);
    useEffect(() => {
        const loadBorders = async () => {
            const CACHE_KEY = `cello_map_bnd_${appId}`;
            const cachedData = localStorage.getItem(CACHE_KEY);
            let borders = [];
            
            if (cachedData) { try { borders = JSON.parse(cachedData); } catch(e) {} }
            
            if (borders.length === 0 && db && appId && userId !== 'default') {
                try {
                    const snap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/mapSettings`));
                    snap.forEach(d => {
                        if (d.id.startsWith('bnd_')) {
                            const data = d.data();
                            if (data && data.geometryString) {
                                try { data.geometry = JSON.parse(data.geometryString); borders.push(data); } catch(e) {}
                            }
                        }
                    });
                    if (borders.length > 0) localStorage.setItem(CACHE_KEY, JSON.stringify(borders));
                } catch(e) {}
            }
            setMapBorders(borders);
        };
        loadBorders();
    }, [db, appId, userId]);

    // 🧠 SMART DICTIONARY (DEEP SCAN)
    const guessKecamatan = (text) => {
        const str = String(text || '').toLowerCase();
        if (str.includes('muntilan') || str.includes('pemuda')) return 'Muntilan';
        if (str.includes('mertoyudan')) return 'Mertoyudan';
        if (str.includes('salaman')) return 'Salaman';
        if (str.includes('secang')) return 'Secang';
        if (str.includes('borobudur')) return 'Borobudur';
        if (str.includes('mlati')) return 'Mlati';
        if (str.includes('depok')) return 'Depok';
        return '';
    };

    const guessKabupaten = (text) => {
        const str = String(text || '').toLowerCase();
        if (str.includes('magelang') || str.includes('muntilan') || str.includes('mertoyudan') || str.includes('salaman') || str.includes('secang') || str.includes('borobudur')) return 'Magelang';
        if (str.includes('boyolali')) return 'Boyolali';
        if (str.includes('sleman') || str.includes('mlati') || str.includes('depok')) return 'Sleman';
        if (str.includes('solo') || str.includes('surakarta')) return 'Surakarta';
        if (str.includes('bantul')) return 'Bantul';
        if (str.includes('klaten')) return 'Klaten';
        return '';
    };

    const guessProvince = (text) => {
        const str = String(text || '').toLowerCase();
        if (str.includes('magelang') || str.includes('muntilan') || str.includes('boyolali') || str.includes('solo') || str.includes('surakarta') || str.includes('klaten') || str.includes('semarang')) return 'Jawa Tengah';
        if (str.includes('yogya') || str.includes('sleman') || str.includes('bantul') || str.includes('gunungkidul') || str.includes('kulon')) return 'DI Yogyakarta';
        return '';
    };

    const sortedBorders = useMemo(() => {
        const lMap = { 'Desa': 1, 'Kecamatan': 2, 'Kabupaten': 3, 'Provinsi': 4 };
        return [...mapBorders].sort((a, b) => lMap[a.level] - lMap[b.level]);
    }, [mapBorders]);

    // 🚀 UPGRADED: Search & Folder Engine
    const searchedCustomers = useMemo(() => {
        if (!searchTerm.trim()) return customers;
        const term = searchTerm.toLowerCase();
        return customers.filter(c => 
            String(c.name || '').toLowerCase().includes(term) ||
            String(c.city || '').toLowerCase().includes(term) ||
            String(c.region || '').toLowerCase().includes(term) ||
            String(c.province || '').toLowerCase().includes(term) ||
            String(c.picName || '').toLowerCase().includes(term) ||
            String(c.nooAgentName || '').toLowerCase().includes(term) ||
            String(c.address || '').toLowerCase().includes(term)
        );
    }, [customers, searchTerm]);

    const folderStructure = useMemo(() => {
        const structure = {};
        searchedCustomers.forEach(c => {
            let prov = String(c.province || '').trim();
            let kab = String(c.region || '').trim();
            let kec = String(c.city || '').trim();

            const isUnknown = (str) => !str || str.toLowerCase().includes('unknown') || str.toLowerCase().includes('uncategorized');

            // 📍 1. GEOSPATIAL AUTO-DETECTION: Checks Map Borders even if text says "Unknown"!
            if ((isUnknown(prov) || isUnknown(kab) || isUnknown(kec)) && c.latitude && c.longitude && sortedBorders.length > 0) {
                for (const border of sortedBorders) {
                    const geo = border.feature || border.geometry;
                    if (checkPointInGeoJSON(c.longitude, c.latitude, geo)) {
                        if (border.level === 'Provinsi' && isUnknown(prov)) prov = border.name;
                        if (border.level === 'Kabupaten' && isUnknown(kab)) kab = border.name;
                        if (border.level === 'Kecamatan' && isUnknown(kec)) kec = border.name;
                    }
                }
            }

            // 🧠 2. SMART TEXT DICTIONARY: Scans addresses for clues
            const searchText = `${c.address || ''} ${c.name || ''} ${kab} ${kec}`.toLowerCase();
            if (!kec) kec = guessKecamatan(searchText);
            if (!kab) kab = guessKabupaten(searchText);
            if (!prov) prov = guessProvince(searchText);

            // 🛡️ 3. ABSOLUTE FALLBACK
            if (!prov) prov = 'Unknown Provinsi';
            if (!kab) kab = 'Unknown Kabupaten';
            if (!kec) kec = 'Unknown Kecamatan';
            
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

        // 🚀 INJECT CUSTOM EMPTY FOLDERS
        customProv.forEach(p => { if (!structure[p]) structure[p] = { count: 0, pending: 0, regions: {} }; });
        Object.entries(customKab).forEach(([p, kabs]) => {
            if (structure[p]) kabs.forEach(k => { if (!structure[p].regions[k]) structure[p].regions[k] = { count: 0, pending: 0, cities: {} }; });
        });
        Object.entries(customKec).forEach(([k, kecs]) => {
            Object.values(structure).forEach(provData => {
                if (provData.regions[k]) {
                    kecs.forEach(c => { if (!provData.regions[k].cities[c]) provData.regions[k].cities[c] = { count: 0, pending: 0, stores: [] }; });
                }
            });
        });

        return structure;
    }, [searchedCustomers, sortedBorders, customProv, customKab, customKec]);

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

    // 🚀 NEW: BULK DIRECTORY RENAME ENGINE
    const handleBulkRename = async (e, level, oldName, storesToUpdate) => {
        e.stopPropagation(); // Prevents the folder from opening when you click Edit
        const newName = window.prompt(`Rename "${oldName}" to:`, oldName);
        if (!newName || newName.trim() === "" || newName === oldName) return;

        if (!window.confirm(`Are you sure you want to move ${storesToUpdate.length} stores to "${newName}"?`)) return;

        if (triggerCapy) triggerCapy(`Moving ${storesToUpdate.length} stores... 🚀`);

        try {
            const batches = [];
            let currentBatch = writeBatch(db);
            let count = 0;

            storesToUpdate.forEach(store => {
                const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'customers', store.id);
                const updateData = {};
                
                // Route to the correct database field based on the folder level
                if (level === 'Provinsi') updateData.province = newName;
                if (level === 'Kabupaten') updateData.region = newName;
                if (level === 'Kecamatan') updateData.city = newName;
                
                currentBatch.update(ref, updateData);
                count++;

                // Firebase batch limit is 500, we chunk at 450 to be safe
                if (count === 450) {
                    batches.push(currentBatch.commit());
                    currentBatch = writeBatch(db);
                    count = 0;
                }
            });

            if (count > 0) batches.push(currentBatch.commit());
            await Promise.all(batches);

            if (triggerCapy) triggerCapy(`Successfully renamed to ${newName}! ✅`);
            if (logAudit) logAudit("DIRECTORY_BULK_RENAME", `Renamed ${level} from ${oldName} to ${newName} for ${storesToUpdate.length} stores`);
        } catch (err) {
            console.error(err);
            alert("Failed to rename folder.");
        }
    };

    // 🚀 NEW: FOLDER CREATION ENGINE
    const handleAddFolder = (level, parentName) => {
        const name = window.prompt(`Enter new ${level} folder name:`);
        if (!name || !name.trim()) return;
        const clean = name.trim();
        if (level === 'Provinsi') setCustomProv(prev => [...prev, clean]);
        if (level === 'Kabupaten') setCustomKab(prev => ({ ...prev, [parentName]: [...(prev[parentName]||[]), clean] }));
        if (level === 'Kecamatan') setCustomKec(prev => ({ ...prev, [parentName]: [...(prev[parentName]||[]), clean] }));
    };

    // 🚀 NEW: FOLDER DELETION ENGINE
    const handleDeleteFolder = async (e, level, folderName, storesToUpdate) => {
        e.stopPropagation();
        if (!window.confirm(`⚠️ DANGER: Delete "${folderName}" and reset its ${storesToUpdate.length} stores to Unknown?`)) return;
        
        try {
            const batches = [];
            let currentBatch = writeBatch(db);
            let count = 0;

            storesToUpdate.forEach(store => {
                const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'customers', store.id);
                const updateData = {};
                if (level === 'Provinsi') updateData.province = 'Unknown Provinsi';
                if (level === 'Kabupaten') updateData.region = 'Unknown Kabupaten';
                if (level === 'Kecamatan') updateData.city = 'Unknown Kecamatan';
                
                currentBatch.update(ref, updateData);
                count++;
                if (count === 450) { batches.push(currentBatch.commit()); currentBatch = writeBatch(db); count = 0; }
            });

            if (count > 0) batches.push(currentBatch.commit());
            await Promise.all(batches);
            
            // Remove from custom state if it's empty
            if (level === 'Provinsi') setCustomProv(prev => prev.filter(p => p !== folderName));
            if (level === 'Kabupaten') setCustomKab(prev => { const n = {...prev}; Object.keys(n).forEach(k => n[k] = n[k].filter(x => x !== folderName)); return n; });
            if (level === 'Kecamatan') setCustomKec(prev => { const n = {...prev}; Object.keys(n).forEach(k => n[k] = n[k].filter(x => x !== folderName)); return n; });

            if (triggerCapy) triggerCapy(`Folder ${folderName} deleted! 🗑️`);
        } catch (err) { alert("Failed to delete folder."); }
    };

    // 🚀 NEW: FAST STORE MOVE ENGINE
    const handleFastStoreMove = async (storeId, newCity, parentKab) => {
        let targetCity = newCity;
        if (newCity === "CREATE_NEW") {
            const name = window.prompt("Enter new Kecamatan name:");
            if (!name || !name.trim()) return;
            targetCity = name.trim();
            setCustomKec(prev => ({ ...prev, [parentKab]: [...(prev[parentKab]||[]), targetCity] }));
        }
        
        try {
            const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'customers', storeId);
            await updateDoc(ref, { city: targetCity });
            if (triggerCapy) triggerCapy(`Store moved to ${targetCity}! 🚀`);
        } catch(err) { alert("Failed to move store"); }
    };

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

    // 🚀 NEW: MAP MARKER KML IMPORT ENGINE
    const handleImportKML = async (e) => {
        const file = e.target.files[0];
        if (!file || !isAdmin) return;
        if (!window.confirm("Import Map Marker KML? This will automatically create customer profiles from the map pins.")) return;

        if (triggerCapy) triggerCapy("Parsing KML Data... 🗺️");
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, "text/xml");
                
                const placemarks = xmlDoc.querySelectorAll("Placemark");
                const batchWrites = [];
                let importCount = 0;

                Array.from(placemarks).forEach(pm => {
                    const name = pm.querySelector("name")?.textContent || "Unnamed Store";
                    const description = pm.querySelector("description")?.textContent || "";
                    const point = pm.querySelector("Point > coordinates")?.textContent;
                    
                    let lat = null, lng = null;
                    if (point) {
                        const coords = point.trim().split(',');
                        if (coords.length >= 2) {
                            lng = parseFloat(coords[0]);
                            lat = parseFloat(coords[1]);
                        }
                    }

                    // Extract Folder Name by traversing XML parents
                    let mapFolder = "Uncategorized";
                    let parent = pm.parentNode;
                    while (parent && parent.nodeName !== "kml") {
                        if (parent.nodeName === "Folder") {
                            mapFolder = parent.querySelector("name")?.textContent || "Imported Folder";
                            break;
                        }
                        parent = parent.parentNode;
                    }

                    if (lat && lng) {
                        const newRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'customers'));
                        batchWrites.push({
                            ref: newRef,
                            data: {
                                name: name.toUpperCase().trim(),
                                description: description,
                                mapFolder: mapFolder,
                                latitude: lat,
                                longitude: lng,
                                status: 'APPROVED', 
                                tier: 'Unranked',
                                priceTier: 'Retail',
                                storeType: 'Retailer',
                                createdAt: serverTimestamp(),
                                assignedAgent: 'Unassigned' // Drops to manual pool
                            }
                        });
                        importCount++;
                    }
                });

                if (importCount === 0) throw new Error("No valid GPS pins found in file.");

                // Firestore batch limits us to 500 writes. We chunk it into 450s.
                const chunkedBatches = [];
                for (let i = 0; i < batchWrites.length; i += 450) {
                    const batch = writeBatch(db);
                    batchWrites.slice(i, i + 450).forEach(w => batch.set(w.ref, w.data));
                    chunkedBatches.push(batch.commit());
                }

                await Promise.all(chunkedBatches);
                if (logAudit) logAudit("KML_IMPORT", `Imported ${importCount} map pins from Map Marker.`);
                if (triggerCapy) triggerCapy(`Successfully imported ${importCount} map markers! 📍`);
                
            } catch (err) {
                console.error("KML Import Error:", err);
                alert(`Failed to import KML: ${err.message || "Invalid file format."}`);
            }
        };
        reader.readAsText(file);
        e.target.value = null;
    };

    // 🚀 ONE-TIME ENTERPRISE DATA SCRUB (MIGRATION ENGINE)
    const handleEnterpriseDataScrub = async () => {
        if (!window.confirm("⚠️ INITIATE ENTERPRISE DATA SCRUB?\n\nThis will scan all customers and permanently hard-write their exact Matrix Location (Provinsi, Kabupaten, Kecamatan) into the Firebase database to establish a Single Source of Truth.")) return;

        if (triggerCapy) triggerCapy("Initiating Great Scrub... Please wait. ⚙️");

        try {
            const batchWrites = [];
            let scrubCount = 0;

            customers.forEach(c => {
                let prov = String(c.province || '').trim();
                let kab = String(c.region || '').trim();
                let kec = String(c.city || '').trim();

                const isUnknown = (str) => !str || str.toLowerCase().includes('unknown') || str.toLowerCase().includes('unmapped') || str.toLowerCase().includes('uncategorized');

                let needsUpdate = false;

                // 📍 1. GEOSPATIAL OVERRIDE
                if ((isUnknown(prov) || isUnknown(kab) || isUnknown(kec)) && c.latitude && c.longitude && sortedBorders.length > 0) {
                    for (const border of sortedBorders) {
                        const geo = border.feature || border.geometry;
                        if (checkPointInGeoJSON(c.longitude, c.latitude, geo)) {
                            if (border.level === 'Provinsi' && isUnknown(prov)) { prov = border.name; needsUpdate = true; }
                            if (border.level === 'Kabupaten' && isUnknown(kab)) { kab = border.name; needsUpdate = true; }
                            if (border.level === 'Kecamatan' && isUnknown(kec)) { kec = border.name; needsUpdate = true; }
                        }
                    }
                }

                // 🧠 2. SMART DICTIONARY OVERRIDE
                const searchText = `${c.address || ''} ${c.name || ''} ${kab} ${kec}`.toLowerCase();
                if (isUnknown(kec)) { const g = guessKecamatan(searchText); if (g) { kec = g; needsUpdate = true; } }
                if (isUnknown(kab)) { const g = guessKabupaten(searchText); if (g) { kab = g; needsUpdate = true; } }
                if (isUnknown(prov)) { const g = guessProvince(searchText); if (g) { prov = g; needsUpdate = true; } }

                // 🛡️ 3. FINAL FALLBACK & FORMATTING
                if (isUnknown(prov)) prov = 'UNMAPPED PROVINSI';
                if (isUnknown(kab)) kab = 'UNMAPPED KABUPATEN';
                if (isUnknown(kec)) kec = 'UNMAPPED KECAMATAN';

                // If the scrubbed data differs from what is in the database, schedule a write!
                if (needsUpdate || c.province !== prov.toUpperCase() || c.region !== kab.toUpperCase() || c.city !== kec.toUpperCase()) {
                    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'customers', c.id);
                    batchWrites.push({
                        ref,
                        data: {
                            province: prov.toUpperCase(),
                            region: kab.toUpperCase(),
                            city: kec.toUpperCase(),
                            updatedAt: serverTimestamp()
                        }
                    });
                    scrubCount++;
                }
            });

            if (scrubCount === 0) {
                if (triggerCapy) triggerCapy("Database is already perfectly clean! ✅");
                return;
            }

            // Firebase batch limit is 500. We chunk at 450 to be safe.
            const chunkedBatches = [];
            for (let i = 0; i < batchWrites.length; i += 450) {
                const batch = writeBatch(db);
                batchWrites.slice(i, i + 450).forEach(w => batch.update(w.ref, w.data));
                chunkedBatches.push(batch.commit());
            }

            await Promise.all(chunkedBatches);

            if (logAudit) logAudit("ENTERPRISE_DATA_SCRUB", `Permanently hard-mapped ${scrubCount} unmapped stores.`);
            if (triggerCapy) triggerCapy(`Great Scrub Complete! ${scrubCount} targets permanently mapped. 🚀`);

        } catch (error) {
            console.error("Scrub Error:", error);
            alert("Data Scrub Failed: " + error.message);
        }
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
            setFormData({ name: '', phone: '', province: '', region: '', city: '', address: '', gmapsUrl: '', embedHtml: '', latitude: '', longitude: '', storeImage: '', tier: 'Silver', priceTier: 'Retail', visitFreq: 7, lastVisit: new Date().toISOString().split('T')[0], picName: '', description: '', mapFolder: '' }); 
            setCoordInput("");
        } catch (err) { console.error(err); } 
    };

    const handleEdit = (c) => { 
        setFormData({ 
            name: c.name, phone: c.phone || '', province: c.province || '', region: c.region || '', city: c.city || '', 
            address: c.address || '', gmapsUrl: c.gmapsUrl || '', embedHtml: c.embedHtml || '',
            storeImage: c.storeImage || '',
            latitude: c.latitude || '', longitude: c.longitude || '',
            tier: c.tier || 'Silver', priceTier: c.priceTier || 'Retail', visitFreq: c.visitFreq || 7, lastVisit: c.lastVisit || new Date().toISOString().split('T')[0],
            description: c.description || '', mapFolder: c.mapFolder || ''
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

    // 🚀 THE DIRECTORY CATCHER: Intercepts edit targets sent from Map Mission Control
    useEffect(() => {
        const targetId = sessionStorage.getItem('targetEditStore');
        // Ensure folderStructure is fully built before attempting to scan it
        if (targetId && customers && customers.length > 0 && Object.keys(folderStructure).length > 0) {
            const target = customers.find(s => String(s.id) === String(targetId));
            if (target) {
                // 1. 🔍 AUTO-EXPAND ENGINE: Scan the rendered structure to find exactly where this store was sorted
                let foundProv = null, foundKab = null, foundKec = null;
                for (const [pName, pData] of Object.entries(folderStructure)) {
                    for (const [kName, kData] of Object.entries(pData.regions)) {
                        for (const [cName, cData] of Object.entries(kData.cities)) {
                            if (cData.stores.some(s => String(s.id) === String(targetId))) {
                                foundProv = pName; foundKab = kName; foundKec = cName;
                                break;
                            }
                        }
                        if (foundProv) break;
                    }
                    if (foundProv) break;
                }

                // 2. 📂 FORCE OPEN FOLDERS: Drill down to the exact location
                if (foundProv) setSelectedProvince(foundProv);
                if (foundKab) setSelectedRegion(foundKab);
                if (foundKec) setSelectedCity(foundKec);

                // 3. 📝 OPEN EDITOR: 400ms delay ensures the UI has fully transitioned tabs
                setTimeout(() => handleEdit(target), 400); 
            }
            sessionStorage.removeItem('targetEditStore'); 
        }
    }, [customers, folderStructure]);

    if (viewMode === 'detail' && selectedCustomer) return <CustomerDetailView customer={selectedCustomer} db={db} appId={appId} user={user} onBack={() => { setViewMode('list'); setSelectedCustomer(null); }} logAudit={logAudit} triggerCapy={triggerCapy} onNavigateToMap={onNavigateToMap} />;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Store size={24} className="text-orange-500"/> Customer Directory</h2>
                {isAdmin && (
                    <div className="flex gap-2">
                        <button 
                            onClick={handleEnterpriseDataScrub}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all active:scale-95 flex items-center gap-2"
                            title="Hard-map all UNMAPPED stores into the Database permanently"
                        >
                            <ShieldAlert size={14}/> Data Scrub
                        </button>
                        <label className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer shadow-md transition-all active:scale-95 flex items-center gap-2">
                            <Folder size={14}/> Import Map Marker (KML)
                            <input type="file" accept=".kml" onChange={handleImportKML} className="hidden" />
                        </label>
                    </div>
                )}
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-sm text-slate-500 uppercase">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>{editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({name:'', phone:'', province:'', region:'', city:'', address:'', gmapsUrl:'', embedHtml: '', latitude: '', longitude: '', storeImage:'', tier: 'Silver', priceTier: 'Retail', visitFreq: 7, lastVisit: '', picName: '', description: '', mapFolder: ''}); setCoordInput(""); }} className="text-xs text-red-500 hover:underline">Cancel Edit</button>}</div>
                    
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
                            <input 
                                list="pic-suggestions"
                                placeholder="Type or select Wholesaler name..."
                                value={formData.picName} 
                                onChange={e=>setFormData({...formData, picName: e.target.value})} 
                                className="w-full h-10 px-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white font-bold outline-none text-indigo-600"
                            />
                            <datalist id="pic-suggestions">
                                {/* Dynamically lists unique PICs already existing in your customer list */}
                                {[...new Set(customers.map(c => c.picName).filter(Boolean))].map(name => (
                                    <option key={name} value={name} />
                                ))}
                            </datalist>
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
                                    <div className="flex items-center gap-1.5 h-full shrink-0">
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const win = window.open("");
                                                win.document.write(`<html><body style="margin:0; background:#0f172a; display:flex; align-items:center; justify-content:center;"><img src="${formData.storeImage}" style="max-width:100vw; max-height:100vh; object-fit:contain;" /></body></html>`);
                                                win.document.close();
                                            }}
                                            title="View full image"
                                            className="w-10 h-full rounded border border-indigo-200 dark:border-indigo-500/30 overflow-hidden hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <img src={formData.storeImage} className="w-full h-full object-cover" alt="Store" />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                if(window.confirm("Are you sure you want to remove this store photo?")) {
                                                    setFormData({...formData, storeImage: ''});
                                                }
                                            }} 
                                            className="h-full aspect-square bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/20 text-slate-400 hover:text-red-500 border border-slate-200 dark:border-slate-600 hover:border-red-200 dark:hover:border-red-500/50 rounded flex items-center justify-center transition-all"
                                            title="Remove Photo"
                                        >
                                            <Trash2 size={14} />
                                        </button>
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
                        
                        <textarea 
                            value={formData.description} 
                            onChange={e=>setFormData({...formData, description: e.target.value})} 
                            className="w-full p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white resize-none" 
                            placeholder="Store Description or Internal Notes (e.g. Imported Map Marker data)..." 
                            rows="2"
                        />
                        
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
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700">
                            <h4 className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Indonesia (Provinsi Level)</h4>
                            <button onClick={() => handleAddFolder('Provinsi', null)} className="text-[10px] px-3 py-1.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white font-bold uppercase transition-colors border border-blue-500/50 flex items-center gap-1 shadow-md"><Plus size={12}/> Folder</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(folderStructure).map(([prov, data]) => (
                                <div key={prov} onClick={() => setSelectedProvince(prov)} className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-orange-500 transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-red-100 dark:bg-slate-700 rounded-lg text-red-600 group-hover:bg-red-500 group-hover:text-white transition-colors"><MapPin size={24} /></div>
                                        <div className="flex flex-col items-end gap-2">
                                            {data.pending > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">{data.pending} Pending</span>}
                                            {isAdmin && (
                                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                    <button onClick={(e) => {
                                                        let stores = [];
                                                        Object.values(data.regions).forEach(r => Object.values(r.cities).forEach(c => stores.push(...c.stores)));
                                                        handleDeleteFolder(e, 'Provinsi', prov, stores);
                                                    }} className="text-[10px] font-bold text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded transition-colors flex items-center gap-1 hover:border-red-500"><Trash2 size={10}/> DEL</button>
                                                    <button onClick={(e) => {
                                                        let stores = [];
                                                        Object.values(data.regions).forEach(r => Object.values(r.cities).forEach(c => stores.push(...c.stores)));
                                                        handleBulkRename(e, 'Provinsi', prov, stores);
                                                    }} className="text-[10px] font-bold text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded transition-colors flex items-center gap-1 hover:border-blue-500"><Pencil size={10}/> EDIT</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg dark:text-white mb-2 truncate">{prov}</h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{data.count} Total Stores</p>
                                </div>
                            ))}
                            {Object.keys(folderStructure).length === 0 && <div className="col-span-full text-center py-12 opacity-50"><Folder size={48} className="mx-auto mb-4"/><p className="font-bold tracking-widest uppercase">No Data Found</p></div>}
                        </div>
                    </div>
                )}

                {/* LEVEL 1: KABUPATEN */}
                {selectedProvince && !selectedRegion && activeProv && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700">
                            <h4 className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">{selectedProvince} (Kabupaten Level)</h4>
                            <button onClick={() => handleAddFolder('Kabupaten', selectedProvince)} className="text-[10px] px-3 py-1.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white font-bold uppercase transition-colors border border-blue-500/50 flex items-center gap-1 shadow-md"><Plus size={12}/> Folder</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(activeProv?.regions || {}).map(([kab, data]) => (
                                <div key={kab} onClick={() => setSelectedRegion(kab)} className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-orange-500 transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-orange-100 dark:bg-slate-700 rounded-lg text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Folder size={24} /></div>
                                        <div className="flex flex-col items-end gap-2">
                                            {data.pending > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">{data.pending} Pending</span>}
                                            {isAdmin && (
                                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                    <button onClick={(e) => {
                                                        let stores = [];
                                                        Object.values(data.cities).forEach(c => stores.push(...c.stores));
                                                        handleDeleteFolder(e, 'Kabupaten', kab, stores);
                                                    }} className="text-[10px] font-bold text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded transition-colors flex items-center gap-1 hover:border-red-500"><Trash2 size={10}/> DEL</button>
                                                    <button onClick={(e) => {
                                                        let stores = [];
                                                        Object.values(data.cities).forEach(c => stores.push(...c.stores));
                                                        handleBulkRename(e, 'Kabupaten', kab, stores);
                                                    }} className="text-[10px] font-bold text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded transition-colors flex items-center gap-1 hover:border-blue-500"><Pencil size={10}/> EDIT</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg dark:text-white mb-2 truncate">{kab}</h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{data.count} Registered</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* LEVEL 2: KECAMATAN */}
                {selectedProvince && selectedRegion && !selectedCity && activeKab && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700">
                            <h4 className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">{selectedRegion} (Kecamatan Level)</h4>
                            <button onClick={() => handleAddFolder('Kecamatan', selectedRegion)} className="text-[10px] px-3 py-1.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white font-bold uppercase transition-colors border border-blue-500/50 flex items-center gap-1 shadow-md"><Plus size={12}/> Folder</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(activeKab?.cities || {}).map(([kec, data]) => (
                                <div key={kec} onClick={() => setSelectedCity(kec)} className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-500 transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-blue-100 dark:bg-slate-700 rounded-lg text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Folder size={24} /></div>
                                        <div className="flex flex-col items-end gap-2">
                                            {data.pending > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">{data.pending} Pending</span>}
                                            {isAdmin && (
                                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                    <button onClick={(e) => {
                                                        handleDeleteFolder(e, 'Kecamatan', kec, data.stores);
                                                    }} className="text-[10px] font-bold text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded transition-colors flex items-center gap-1 hover:border-red-500"><Trash2 size={10}/> DEL</button>
                                                    <button onClick={(e) => {
                                                        handleBulkRename(e, 'Kecamatan', kec, data.stores);
                                                    }} className="text-[10px] font-bold text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded transition-colors flex items-center gap-1 hover:border-blue-500"><Pencil size={10}/> EDIT</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg dark:text-white mb-2 truncate">{kec}</h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{data.count} Registered</p>
                                </div>
                            ))}
                        </div>
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
                                        <div className="flex gap-2 justify-end items-center mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 flex-wrap">
                                            <select 
                                                value={c.city || 'Unknown Kecamatan'}
                                                onChange={(e) => handleFastStoreMove(c.id, e.target.value, selectedRegion)}
                                                className="text-[9px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 max-w-[110px] outline-none cursor-pointer hover:border-blue-500 transition-colors shrink-0"
                                                title="Move to another Kecamatan"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <optgroup label="Move to Kecamatan...">
                                                    {Object.keys(activeKab?.cities || {}).map(city => <option key={city} value={city}>{city}</option>)}
                                                    <option value="CREATE_NEW">+ New Folder</option>
                                                </optgroup>
                                            </select>
                                            
                                            {c.status === 'PENDING' && (
                                                <button onClick={(e) => handleApproveNOO(e, c.id, c.name)} className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-200 font-bold rounded-lg hover:bg-emerald-500 hover:text-white transition-all animate-pulse shadow-sm">
                                                    Verify
                                                </button>
                                            )}
                                            
                                            <button onClick={(e) => { 
                                                e.stopPropagation(); 
                                                sessionStorage.setItem('targetMapStore', c.id);
                                                if (onNavigateToMap) onNavigateToMap();
                                                else window.dispatchEvent(new CustomEvent('switchTab', { detail: 'map' }));
                                            }} className="px-3 py-1.5 text-xs font-bold bg-orange-50 border border-orange-200 dark:border-orange-500/30 dark:bg-orange-500/10 rounded-lg hover:bg-orange-500 hover:text-white text-orange-600 dark:text-orange-400 transition-colors flex items-center gap-1 shadow-sm"><Globe size={12}/> Map</button>

                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(c); }} className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-lg hover:bg-blue-50 text-slate-600 dark:text-slate-300 transition-colors">Edit</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.name); }} className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-lg hover:bg-red-50 hover:border-red-200 text-red-500 transition-colors">Del</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};