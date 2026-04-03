const ConsignmentView = ({ transactions, inventory, onAddGoods, onPayment, onReturn, onDeleteConsignment, isAdmin }) => {
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [settleMode, setSettleMode] = useState(false);
    const [returnMode, setReturnMode] = useState(false);
    const [itemQtys, setItemQtys] = useState({});

    const customerData = useMemo(() => {
        const customers = {};
        const sortedTransactions = [...transactions].sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
        sortedTransactions.forEach(t => {
            if (!t.customerName) return; const name = t.customerName.trim(); if (!customers[name]) customers[name] = { name, items: {}, balance: 0, lastActivity: t.date };
            const getProduct = (pid) => inventory.find(p => p.id === pid);
            if (t.type === 'SALE' && t.paymentType === 'Titip') { customers[name].balance += t.total; t.items.forEach(item => { const product = getProduct(item.productId); const bksQty = convertToBks(item.qty, item.unit, product); const itemKey = `${item.productId}-${item.priceTier || 'Standard'}`; if(!customers[name].items[itemKey]) customers[name].items[itemKey] = { ...item, qty: 0, unit: 'Bks', calculatedPrice: item.calculatedPrice / convertToBks(1, item.unit, product) }; customers[name].items[itemKey].qty += bksQty; }); }
            if (t.type === 'RETURN') { customers[name].balance += t.total; t.items.forEach(item => { const product = getProduct(item.productId); const bksQty = convertToBks(item.qty, item.unit, product); const itemKey = `${item.productId}-${item.priceTier || 'Standard'}`; if(customers[name].items[itemKey]) customers[name].items[itemKey].qty -= bksQty; }); }
            if (t.type === 'CONSIGNMENT_PAYMENT') { customers[name].balance -= t.amountPaid; t.itemsPaid.forEach(item => { const product = getProduct(item.productId); const bksQty = convertToBks(item.qty, item.unit, product); const itemKey = `${item.productId}-${item.priceTier || 'Standard'}`; if(customers[name].items[itemKey]) customers[name].items[itemKey].qty -= bksQty; }); }
        });
        Object.values(customers).forEach(c => { c.balance = Math.max(0, c.balance); Object.keys(c.items).forEach(k => { c.items[k].qty = Math.max(0, c.items[k].qty); }); });
        return Object.values(customers).filter(c => c.balance > 0 || Object.values(c.items).some(i => i.qty > 0));
    }, [transactions, inventory]);

    const activeCustomer = selectedCustomer ? customerData.find(c => c.name === selectedCustomer.name) || selectedCustomer : null;
    const handleQtyInput = (key, val, max) => { let q = parseInt(val) || 0; if(q < 0) q = 0; setItemQtys(p => ({...p, [key]: q})); };
    
    const submitAction = () => {
        const itemsToProcess = []; let totalValue = 0;
        Object.entries(itemQtys).forEach(([key, qty]) => { if(qty > 0) { const item = activeCustomer.items[key]; itemsToProcess.push({ productId: item.productId, name: item.name, qty, priceTier: item.priceTier, calculatedPrice: item.calculatedPrice, unit: 'Bks' }); totalValue += (item.calculatedPrice * qty); } });
        if(itemsToProcess.length === 0) return;
        if (settleMode) onPayment(activeCustomer.name, itemsToProcess, totalValue); else if (returnMode) onReturn(activeCustomer.name, itemsToProcess, totalValue);
        setSettleMode(false); setReturnMode(false); setItemQtys({});
    };
    
    const formatStockDisplay = (qty, product) => { if (!product) return `${qty} Bks`; const packsPerSlop = product.packsPerSlop || 10; const slops = Math.floor(qty / packsPerSlop); const bks = qty % packsPerSlop; return slops > 0 ? `${qty} Bks (${slops} Slop ${bks > 0 ? `+ ${bks} Bks` : ''})` : `${qty} Bks`; };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] animate-fade-in">

            {/* LEFT LIST */}
            <div className={`lg:w-1/3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 flex flex-col ${selectedCustomer ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 border-b dark:border-slate-700"><h2 className="font-bold text-lg dark:text-white flex items-center gap-2"><Truck size={20}/> Active Consignments</h2></div>
                <div className="flex-1 overflow-y-auto">{customerData.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">No active consignments found.</div> : customerData.map(c => (<div key={c.name} onClick={() => setSelectedCustomer(c)} className={`p-4 border-b dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedCustomer?.name === c.name ? 'bg-orange-50 dark:bg-slate-700 border-l-4 border-l-orange-500' : ''}`}><div className="flex justify-between items-start"><h3 className="font-bold dark:text-white">{c.name}</h3>
                
                {/* LOCKED: Delete Button hidden for non-admins */}
                {isAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); onDeleteConsignment(c.name); }} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                )}
                
                </div><div className="mt-2 flex justify-between items-center"><span className="text-xs bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded dark:text-slate-300">{Object.values(c.items).reduce((a,b)=>a+b.qty,0)} Bks Held</span><span className="font-mono font-bold text-emerald-600">{formatRupiah(c.balance)}</span></div></div>))}</div>
            </div>

            {/* RIGHT DETAILS */}
            <div className={`lg:w-2/3 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 ${!selectedCustomer ? 'hidden lg:flex justify-center items-center' : 'flex'}`}>
                {!selectedCustomer ? (<div className="text-center text-slate-400"><Store size={48} className="mx-auto mb-4 opacity-20"/><p>Select a customer to view details</p></div>) : (<><div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-2xl"><div><div className="flex items-center gap-2 lg:hidden mb-2 text-slate-400" onClick={() => setSelectedCustomer(null)}><ArrowRight className="rotate-180" size={16}/> Back</div><h2 className="text-2xl font-bold dark:text-white">{activeCustomer?.name}</h2></div><div className="text-right"><p className="text-xs text-slate-500 uppercase tracking-wider">Outstanding Balance</p><p className="text-2xl font-bold text-orange-500">{formatRupiah(activeCustomer?.balance || 0)}</p></div></div><div className="flex-1 overflow-y-auto p-6"><h3 className="font-bold mb-4 dark:text-white flex items-center gap-2"><Package size={18}/> Goods at Customer</h3><div className="space-y-3">{Object.entries(activeCustomer?.items || {}).filter(([k, i]) => i.qty > 0).map(([key, item]) => { const product = inventory.find(p => p.id === item.productId); return (<div key={key} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700"><div><p className="font-bold dark:text-white">{item.name}</p><div className="flex items-center gap-2"><span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{item.priceTier || 'Standard'}</span><p className="text-xs text-slate-500">{formatRupiah(item.calculatedPrice)} / Bks</p></div></div><div className="flex items-center gap-4"><div className="text-right"><p className="text-lg font-bold dark:text-white">{formatStockDisplay(item.qty, product)}</p></div>{(settleMode || returnMode) && (<input type="number" className={`w-24 p-2 rounded border text-center ${returnMode ? 'border-red-400 bg-red-50 text-red-600' : 'border-emerald-400 bg-emerald-50 text-emerald-600'}`} placeholder="Qty (Bks)" value={itemQtys[key] || ''} onChange={(e) => handleQtyInput(key, e.target.value, item.qty)}/>)}</div></div>); })}</div></div>
                
                {/* LOCKED: Footer Actions */}
                <div className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
                    {(!settleMode && !returnMode) ? (
                        isAdmin ? (
                            <div className="grid grid-cols-3 gap-3">
                                <button onClick={() => onAddGoods(activeCustomer?.name)} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:bg-orange-50 dark:hover:bg-slate-700 hover:border-orange-500 transition-all group">
                                    <Plus size={24} className="text-orange-500 mb-1"/><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Add Goods</span>
                                </button>
                                <button onClick={() => setSettleMode(true)} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-700 hover:border-emerald-500 transition-all group">
                                    <Wallet size={24} className="text-emerald-500 mb-1"/><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Record Payment</span>
                                </button>
                                <button onClick={() => setReturnMode(true)} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:bg-red-50 dark:hover:bg-slate-700 hover:border-red-500 transition-all group">
                                    <RotateCcw size={24} className="text-red-500 mb-1"/><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Process Return</span>
                                </button>
                            </div>
                        ) : (
                            <div className="text-center p-2 text-slate-400 text-sm flex flex-col items-center">
                                <Lock size={20} className="mb-1 opacity-50"/>
                                <span className="font-bold">Consignment Actions Locked</span>
                                <span className="text-xs opacity-70">Admin access required to Add, Pay, or Return items.</span>
                            </div>
                        )
                    ) : (
                        <div>
                            <div className="flex gap-3">
                                <button onClick={() => { setSettleMode(false); setReturnMode(false); setItemQtys({}); }} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300">Cancel</button>
                                <button onClick={submitAction} className={`flex-1 py-3 rounded-xl font-bold text-white ${settleMode ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>Confirm {settleMode ? 'Payment' : 'Return'}</button>
                            </div>
                        </div>
                    )}
                </div>
                </>)}
            </div>
        </div>
    );
};



// --- NEW: CUSTOMER DETAIL VIEW (WITH IFRAME SUPPORT) ---
const CustomerDetailView = ({ customer, db, appId, user, onBack, logAudit, triggerCapy }) => {
    const [benchmarks, setBenchmarks] = useState([]);
    const [newBench, setNewBench] = useState({ brand: '', product: '', price: '', notes: '', volume: 'Medium' });
    const [mapMode, setMapMode] = useState('map'); 

    useEffect(() => {
        const q = query(collection(db, `artifacts/${appId}/users/${user.uid}/customers/${customer.id}/benchmarks`), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => setBenchmarks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [customer.id]);

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
        // 1. If user provided EXACT Embed Code, use it (Best for Street View POV)
        if (customer.embedHtml && customer.embedHtml.startsWith("<iframe")) {
            return <div dangerouslySetInnerHTML={{ __html: customer.embedHtml.replace('<iframe', '<iframe width="100%" height="100%" style="border:0;"') }} className="w-full h-full" />;
        }

        // 2. Otherwise, construct URL based on Lat/Lng
        const hasGPS = customer.latitude && customer.longitude;
        let src = "";

        if (mapMode === 'street') {
             // Try basic street view embed (Might be limited without key)
             const loc = hasGPS ? `${customer.latitude},${customer.longitude}` : encodeURIComponent(customer.address || customer.name);
             src = `https://maps.google.com/maps?q=$${loc}&layer=c&output=svembed`;
        } else {
             // Standard Map
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
                            
                            {/* Switcher (Only show if NOT using Embed Code, as Embed code is fixed) */}
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
                                <input type="number" value={newBench.price} onChange={e=>setNewBench({...newBench, price:e.target.value})} placeholder="Price (Rp)" className="p-2 text-sm rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white"/>
                                <select value={newBench.volume} onChange={e=>setNewBench({...newBench, volume:e.target.value})} className="p-2 text-sm rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white"><option>High Sales</option><option>Medium</option><option>Slow Moving</option></select>
                            </div>
                            <div className="flex gap-3"><input value={newBench.notes} onChange={e=>setNewBench({...newBench, notes:e.target.value})} placeholder="Notes (e.g. Promos)" className="flex-1 p-2 text-sm rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white"/><button className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-600">Add Log</button></div>
                        </form>
                        {/* --- FIX 3: SCROLLABLE COMPETITOR TABLE --- */}
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

// --- UPGRADED: CUSTOMER MANAGEMENT (ADDED EXPLICIT PRICING TIER) ---
const CustomerManagement = ({ customers, db, appId, user, logAudit, triggerCapy, isAdmin, tierSettings, onRequestCrop, croppedImage, onClearCroppedImage }) => {
    const [viewMode, setViewMode] = useState('list');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [formData, setFormData] = useState({ 
        name: '', phone: '', region: '', city: '', address: '', 
        gmapsUrl: '', embedHtml: '', 
        latitude: '', longitude: '', storeImage: '', 
        tier: 'Silver', priceTier: 'Retail', visitFreq: 7, lastVisit: new Date().toISOString().split('T')[0] // <--- NEW: priceTier added
    });
    const [editingId, setEditingId] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    
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
            updatedAt: serverTimestamp()
        };
        try { 
            if (editingId) { 
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', editingId), cleanData); 
                await logAudit("CUSTOMER_UPDATE", `Updated: ${formData.name}`); 
                triggerCapy("Customer updated!"); 
                setEditingId(null); 
            } else { 
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'customers'), cleanData); 
                await logAudit("CUSTOMER_ADD", `Added: ${formData.name}`); 
                triggerCapy("Customer added!"); 
            } 
            setFormData({ name: '', phone: '', region: '', city: '', address: '', gmapsUrl: '', embedHtml: '', latitude: '', longitude: '', storeImage: '', tier: 'Silver', priceTier: 'Retail', visitFreq: 7, lastVisit: new Date().toISOString().split('T')[0] }); 
            setCoordInput("");
        } catch (err) { console.error(err); } 
    };

    const handleEdit = (c) => { 
        setFormData({ 
            name: c.name, phone: c.phone || '', region: c.region || '', city: c.city || '', 
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

    if (viewMode === 'detail' && selectedCustomer) return <CustomerDetailView customer={selectedCustomer} db={db} appId={appId} user={user} onBack={() => { setViewMode('list'); setSelectedCustomer(null); }} logAudit={logAudit} triggerCapy={triggerCapy} />;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Store size={24} className="text-orange-500"/> Customer Directory</h2>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-sm text-slate-500 uppercase">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>{editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({name:'', phone:'', region:'', city:'', address:'', gmapsUrl:'', embedHtml: '', latitude: '', longitude: '', storeImage:'', tier: 'Silver', priceTier: 'Retail', visitFreq: 7, lastVisit: ''}); setCoordInput(""); }} className="text-xs text-red-500 hover:underline">Cancel Edit</button>}</div>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase">Store Name</label><input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" required/></div>
                        <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase">Phone</label><input value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" /></div>
                    </div>

                    {/* NEW: 4-COLUMN GRID WITH PRICING TIER */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-indigo-50 dark:bg-slate-900/50 p-3 rounded-xl border border-indigo-100 dark:border-slate-700">
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

                    {/* LOCATION TOOLS */}
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
                            <input value={formData.region} onChange={e=>setFormData({...formData, region: e.target.value})} className="w-full md:flex-1 p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="Region (Kabupaten)" />
                            <input value={formData.city} onChange={e=>setFormData({...formData, city: e.target.value})} className="w-full md:flex-1 p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="City (Kecamatan)" />
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.map(c => {
                    const tierDef = tierSettings ? tierSettings.find(t => t.id === c.tier) : null;
                    return (
                        <div key={c.id} onClick={() => openDetail(c)} className={`bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-orange-500 transition-all group ${editingId === c.id ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-slate-700' : ''}`}>
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        {c.storeImage ? (
                                            <img src={c.storeImage} className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-600 shrink-0 shadow-sm" alt={c.name} />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0">
                                                <Store size={20} className="text-slate-400" />
                                            </div>
                                        )}
                                        <div className="min-w-0 pr-2">
                                            <h3 className="font-bold text-lg leading-tight dark:text-white group-hover:text-orange-500 transition-colors truncate">{c.name}</h3>
                                            {(c.city || c.region) && <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 truncate">{c.city} {c.region}</p>}
                                        </div>
                                    </div>
                                    {c.latitude ? <MapPin size={16} className="text-emerald-500 shrink-0"/> : <MapPin size={16} className="text-slate-500 shrink-0"/>}
                                </div>
                                <div className="flex gap-2 items-center flex-wrap">
                                    {tierDef ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-bold w-fit" style={{ borderColor: tierDef.color, backgroundColor: `${tierDef.color}15`, color: tierDef.color }}>
                                            {tierDef.iconType === 'image' ? <img src={tierDef.value} className="w-3 h-3 object-contain"/> : tierDef.value} {tierDef.label}
                                        </span>
                                    ) : ( <span className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-300">{c.tier}</span> )}
                                    
                                    {/* NEW: PRICING TYPE BADGE RENDERED ON CARD */}
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest ${c.priceTier === 'Grosir' ? 'bg-blue-100 text-blue-700 border-blue-200' : c.priceTier === 'Ecer' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                                        {c.priceTier || 'Retail'}
                                    </span>
                                </div>
                            </div>
                            {isAdmin && (
                                <div className="flex gap-2 justify-end mt-4 pt-3 border-t dark:border-slate-700">
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(c); }} className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded hover:bg-blue-100 text-slate-600 dark:text-slate-300">Edit</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.name); }} className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded hover:bg-red-100 text-red-500">Delete</button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};