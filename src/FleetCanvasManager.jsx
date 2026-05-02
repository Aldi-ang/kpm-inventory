import React, { useState, useEffect, useMemo } from 'react';
import { 
    Truck, UserPlus, PackagePlus, Save, Archive, 
    ArrowRight, MapPin, Activity, X, AlertCircle, ShoppingCart, User, Mail, Pencil, Trash2, 
    ShieldCheck, ChevronDown, ChevronUp, FileText, Printer, MessageSquare, Globe, Search, Plus
} from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, updateDoc, writeBatch, onSnapshot } from 'firebase/firestore'; 

export default function FleetCanvasManager({ db, appId, user, userRole, agentProfileId, inventory, transactions = [], appSettings = {}, logAudit, triggerCapy, isAdmin, motorists = [] }) {
    const isAreaAdmin = userRole === 'AREA_ADMIN';
    const userId = user?.uid || user?.id || 'default';
    const collPath = `artifacts/${appId}/users/${userId}/motorists`; 

    const [localFleet, setLocalFleet] = useState([]);
    const [isFetchingFleet, setIsFetchingFleet] = useState(isAreaAdmin);

    useEffect(() => {
        if (isAreaAdmin) {
            const fleetRef = collection(db, collPath);
            const unsub = onSnapshot(fleetRef, (snap) => {
                setLocalFleet(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setIsFetchingFleet(false);
            });
            return () => unsub();
        }
    }, [db, collPath, isAreaAdmin]);

    const activeMotorists = isAreaAdmin ? localFleet : motorists;

    const myProfile = activeMotorists.find(m => m.id === agentProfileId);
    const rawLocation = myProfile?.location || user?.location || 'UNASSIGNED';
    const searchLocation = String(rawLocation).trim().toLowerCase();
    const branchPathLocation = String(rawLocation).trim(); 

    // 🚀 THE FIX: DELEGATED AUTHORITY ENGINE
    // Checks if the user is a Master Admin OR an Area Admin with the 'canEditRoster' flag set to true
    const canEditFleet = isAdmin || (isAreaAdmin && myProfile?.canEditRoster === true);

    const agents = useMemo(() => {
        if (isAreaAdmin) {
            return activeMotorists.filter(m => String(m.location || '').trim().toLowerCase() === searchLocation);
        }
        return activeMotorists;
    }, [activeMotorists, isAreaAdmin, searchLocation]);
    
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [isAddingAgent, setIsAddingAgent] = useState(false);
    const [editingAgentId, setEditingAgentId] = useState(null); 
    
    const [branchStock, setBranchStock] = useState([]);

    useEffect(() => {
        if (isAreaAdmin && branchPathLocation !== 'UNASSIGNED') {
            const stockRef = collection(db, `artifacts/${appId}/users/${userId}/branches/${branchPathLocation}/inventory`);
            const unsub = onSnapshot(stockRef, (snap) => {
                setBranchStock(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsub();
        }
    }, [db, appId, userId, isAreaAdmin, branchPathLocation]);

    const displayInventory = useMemo(() => {
        if (!isAreaAdmin) return inventory; 
        return inventory.map(item => {
            const bItem = branchStock.find(b => b.id === item.id);
            return { ...item, stock: bItem ? (bItem.stock || 0) : 0 };
        });
    }, [inventory, branchStock, isAreaAdmin]);

    const defaultAgentState = { 
        name: '', phone: '', vehicle: '', role: 'Motorist', email: '',
        allowedPayments: ['Cash'], 
        allowedTiers: ['Retail', 'Ecer'],
        userRole: 'AGENT',
        location: isAreaAdmin ? branchPathLocation : 'Headquarters', 
        province: myProfile?.province || 'Central Java',
        canEditRoster: false // 🚀 NEW: Default to false
    };
    const [newAgent, setNewAgent] = useState(defaultAgentState);

    const [searchTerm, setSearchTerm] = useState("");
    const [isNewProv, setIsNewProv] = useState(false);
    const [isNewLoc, setIsNewLoc] = useState(false);

    const existingProvinces = useMemo(() => [...new Set(activeMotorists.map(a => a.province ? a.province.trim().toUpperCase() : 'CENTRAL JAVA'))].sort(), [activeMotorists]);
    const existingLocations = useMemo(() => [...new Set(activeMotorists.map(a => a.location ? a.location.trim().toUpperCase() : 'UNASSIGNED AREA'))].sort(), [activeMotorists]);

    const [selectedProduct, setSelectedProduct] = useState("");
    const [loadQty, setLoadQty] = useState("");
    
    const [showHistory, setShowHistory] = useState(false);
    const [viewingReceipt, setViewingReceipt] = useState(null);
    const [viewingSuratJalan, setViewingSuratJalan] = useState(false); 

    useEffect(() => {
        if (selectedAgent) {
            const updated = agents.find(m => m.id === selectedAgent.id);
            if (updated) setSelectedAgent(updated);
        }
    }, [agents, selectedAgent]);

    const togglePayment = (method) => {
        setNewAgent(prev => ({
            ...prev, allowedPayments: prev.allowedPayments.includes(method) ? prev.allowedPayments.filter(m => m !== method) : [...prev.allowedPayments, method]
        }));
    };

    const toggleTier = (tier) => {
        setNewAgent(prev => ({
            ...prev, allowedTiers: prev.allowedTiers.includes(tier) ? prev.allowedTiers.filter(t => t !== tier) : [...prev.allowedTiers, tier]
        }));
    };

    const handleSaveAgent = async () => {
        if (!newAgent.name || !newAgent.phone || !newAgent.email) return alert("Name, Phone, and Google Account Email are absolutely required!");
        if (newAgent.allowedPayments.length === 0) return alert("You must allow at least one Payment Method (e.g., Cash)!");
        if (newAgent.allowedTiers.length === 0) return alert("You must allow at least one Price Tier!");

        const emailKey = newAgent.email.toLowerCase().trim();

        const isDupEmail = activeMotorists.some(a => a.email?.toLowerCase().trim() === emailKey && a.id !== editingAgentId);
        const isDupPhone = activeMotorists.some(a => a.phone?.trim() === newAgent.phone.trim() && a.id !== editingAgentId);
        const isDupName = activeMotorists.some(a => a.name?.toLowerCase().trim() === newAgent.name.toLowerCase().trim() && a.id !== editingAgentId);
        const isDupPlate = newAgent.vehicle?.trim() && activeMotorists.some(a => a.vehicle?.toLowerCase().trim() === newAgent.vehicle.toLowerCase().trim() && a.id !== editingAgentId);

        if (isDupEmail) return alert(`ACCESS DENIED!\n\nThe email "${emailKey}" is already registered to another active personnel.`);
        if (isDupPhone) return alert(`ACCESS DENIED!\n\nThe phone number "${newAgent.phone}" is already registered.`);
        if (isDupName) return alert(`ACCESS DENIED!\n\nThe name "${newAgent.name}" is already registered.`);
        if (isDupPlate) return alert(`ACCESS DENIED!\n\nThe vehicle license plate "${newAgent.vehicle.toUpperCase()}" is already assigned.`);

        try {
            const batch = writeBatch(db);

            if (editingAgentId) {
                const oldAgent = agents.find(a => a.id === editingAgentId);
                const oldEmailKey = oldAgent?.email?.toLowerCase().trim();

                const agentRef = doc(db, collPath, editingAgentId);
                batch.update(agentRef, {
                    name: newAgent.name, phone: newAgent.phone, vehicle: newAgent.vehicle, role: newAgent.role, email: emailKey,
                    allowedPayments: newAgent.allowedPayments, allowedTiers: newAgent.allowedTiers,
                    userRole: newAgent.userRole || 'AGENT', location: newAgent.location || 'Headquarters', province: newAgent.province || 'Central Java',
                    canEditRoster: newAgent.canEditRoster || false // 🚀 Save to agent profile
                });

                if (oldEmailKey && oldEmailKey !== emailKey) batch.delete(doc(db, `artifacts/${appId}/employee_directory`, oldEmailKey));
                
                // 🚀 Sync to Global Directory
                batch.set(doc(db, `artifacts/${appId}/employee_directory`, emailKey), {
                    bossUid: userId, agentId: editingAgentId, role: newAgent.role, userRole: newAgent.userRole || 'AGENT', status: 'Active',
                    location: newAgent.location || 'Headquarters',
                    canEditRoster: newAgent.canEditRoster || false // 🚀 Save flag to directory
                }, { merge: true });

            } else {
                const newId = `AGT_${Date.now()}`;
                const agentData = { 
                    id: newId, ...newAgent, email: emailKey, status: 'Active', activeCanvas: [], createdAt: new Date().toISOString() 
                };
                batch.set(doc(db, collPath, newId), agentData);
                batch.set(doc(db, `artifacts/${appId}/employee_directory`, emailKey), {
                    bossUid: userId, agentId: newId, role: newAgent.role, userRole: newAgent.userRole || 'AGENT', status: 'Active',
                    location: newAgent.location || 'Headquarters',
                    canEditRoster: newAgent.canEditRoster || false
                });
            }

            await batch.commit();

            if (editingAgentId) {
                triggerCapy(`Profile updated for ${newAgent.name}!`);
                logAudit("FLEET_EDIT", `Updated profile for ${emailKey}`);
            } else {
                triggerCapy(`${newAgent.name} added!`);
                logAudit("FLEET_ADD", `Created new ${newAgent.role} profile for ${emailKey}`);
            }

            setNewAgent(defaultAgentState);
            setIsAddingAgent(false);
            setEditingAgentId(null);
        } catch (e) { alert("Firebase Blocked the Save: " + e.message); }
    };

    const handleEditClick = (e, agent) => {
        e.stopPropagation();
        setNewAgent({
            name: agent.name, phone: agent.phone || '', vehicle: agent.vehicle || '', role: agent.role || 'Motorist', email: agent.email || '',
            allowedPayments: agent.allowedPayments || ['Cash'], allowedTiers: agent.allowedTiers || ['Retail', 'Ecer'],
            userRole: agent.userRole || 'AGENT', location: agent.location || 'Headquarters', province: agent.province || 'Central Java',
            canEditRoster: agent.canEditRoster || false
        });
        setEditingAgentId(agent.id);
        setIsAddingAgent(true);
    };

    const handleDeleteAgent = async (e, agent) => {
        e.stopPropagation();
        if (!window.confirm(`TERMINATION WARNING: Are you sure you want to remove ${agent.name}? This will instantly revoke their login access.`)) return;
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, collPath, agent.id));
            if (agent.email) batch.delete(doc(db, `artifacts/${appId}/employee_directory`, agent.email.toLowerCase().trim()));
            await batch.commit();
            triggerCapy(`${agent.name} terminated. Access revoked. 🛑`);
            logAudit("FLEET_DELETE", `Terminated agent: ${agent.email}`);
            if (selectedAgent?.id === agent.id) setSelectedAgent(null);
        } catch (e) { alert("Firebase Blocked the Deletion: " + e.message); }
    };

    const convertToBks = (qty, unit, product) => {
        if (!product) return qty;
        const packsPerSlop = product.packsPerSlop || 10;
        const slopsPerBal = product.slopsPerBal || 20;
        const balsPerCarton = product.balsPerCarton || 4;
        if (unit === 'Slop') return qty * packsPerSlop;
        if (unit === 'Bal') return qty * slopsPerBal * packsPerSlop;
        if (unit === 'Karton') return qty * balsPerCarton * slopsPerBal * packsPerSlop;
        return qty; 
    };

    const handleLoadCanvas = async () => {
        if (!selectedProduct || !loadQty || isNaN(loadQty) || Number(loadQty) <= 0) return alert("Select a product and valid quantity.");
        if (!selectedAgent) return;
        const product = displayInventory.find(p => p.id === selectedProduct);
        if (!product) return;

        const qtyToLoad = Number(loadQty);
        const unitToLoad = 'Bks';
        const loadInBks = qtyToLoad; 

        if ((product.stock || 0) < loadInBks) {
            return alert(`INSUFFICIENT WAREHOUSE STOCK!\n\nYou are trying to load ${loadInBks} Bks, but the ${isAreaAdmin ? 'Branch' : 'Master'} Vault only has ${product.stock || 0} Bks available.`);
        }

        try {
            const batch = writeBatch(db);
            
            if (isAreaAdmin) {
                const safeBranchPath = branchPathLocation.replace(/\//g, '-');
                const branchRef = doc(db, `artifacts/${appId}/users/${userId}/branches/${safeBranchPath}/inventory`, product.id);
                batch.set(branchRef, { productId: product.id, name: product.name, stock: (product.stock || 0) - loadInBks }, { merge: true });
            } else {
                const hqRef = doc(db, `artifacts/${appId}/users/${userId}/products`, product.id);
                batch.set(hqRef, { stock: (product.stock || 0) - loadInBks }, { merge: true });
            }

            const agentRef = doc(db, collPath, selectedAgent.id);
            let updatedCanvas = JSON.parse(JSON.stringify(selectedAgent.activeCanvas || []));
            const existingItemIndex = updatedCanvas.findIndex(item => item.productId === product.id);

            if (existingItemIndex >= 0) {
                updatedCanvas[existingItemIndex].qty += qtyToLoad;
            } else {
                updatedCanvas.push({ 
                    productId: product.id, 
                    name: product.name, 
                    qty: qtyToLoad, 
                    unit: unitToLoad,
                    priceTier: product.priceTier || 'Retail',
                    calculatedPrice: product.priceRetail || 0
                });
            }

            batch.update(agentRef, { activeCanvas: updatedCanvas });
            await batch.commit();

            triggerCapy(`Loaded ${qtyToLoad} ${unitToLoad} into vehicle. ${isAreaAdmin ? 'Branch' : 'HQ'} stock deducted! 📦`);
            setLoadQty("");
            setSelectedProduct("");
            logAudit("CANVAS_LOAD", `Loaded ${qtyToLoad} ${product.name} to ${selectedAgent.name}`);
        } catch (e) {
            console.error(e);
            alert("Failed to load vehicle canvas: " + e.message);
        }
    };

    const handleClearCanvas = async () => {
        if (!selectedAgent) return;
        if (!window.confirm(`Are you sure you want to empty ${selectedAgent.name}'s vehicle inventory? This will securely return all their unsold stock back into the ${isAreaAdmin ? 'Branch' : 'Master'} Vault.`)) return;

        try {
            const batch = writeBatch(db);
            const currentCanvas = selectedAgent.activeCanvas || [];
            
            currentCanvas.forEach(item => {
                const product = inventory.find(p => p.id === item.productId);
                if (product) {
                    const returnInBks = convertToBks(item.qty, item.unit, product);
                    
                    if (isAreaAdmin) {
                        const safeBranchPath = branchPathLocation.replace(/\//g, '-');
                        const branchRef = doc(db, `artifacts/${appId}/users/${userId}/branches/${safeBranchPath}/inventory`, product.id);
                        const currentBranchStock = branchStock.find(b => b.id === product.id)?.stock || 0;
                        batch.set(branchRef, { productId: product.id, name: product.name, stock: currentBranchStock + returnInBks }, { merge: true });
                    } else {
                        const hqRef = doc(db, `artifacts/${appId}/users/${userId}/products`, product.id);
                        batch.set(hqRef, { stock: (product.stock || 0) + returnInBks }, { merge: true });
                    }
                }
            });

            const agentRef = doc(db, collPath, selectedAgent.id);
            batch.update(agentRef, { activeCanvas: [] });
            
            await batch.commit();
            triggerCapy(`Vehicle cleared. All unsold stock returned to Vault! 🧹`);
            logAudit("CANVAS_CLEAR", `Cleared and reconciled canvas for ${selectedAgent.name}`);
        } catch(e) { alert("Failed to clear canvas: " + e.message); }
    };

    const handleWhatsAppShare = () => {
        if (!viewingReceipt) return;
        let text = `*${appSettings?.companyName || "KPM INVENTORY"}*\n*OFFICIAL RECEIPT (REPRINT)*\n------------------------\n`;
        text += `Date: ${viewingReceipt.timestamp ? new Date(viewingReceipt.timestamp.seconds * 1000).toLocaleString('id-ID') : viewingReceipt.date}\n`;
        text += `Customer: ${viewingReceipt.customerName}\nPayment: ${viewingReceipt.paymentType || 'Cash'}\n------------------------\n`;
        if (viewingReceipt.items) {
            viewingReceipt.items.forEach(item => {
                text += `${item.qty} ${item.unit} ${item.name}\n   Rp ${new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}\n`;
            });
        }
        text += `------------------------\n*TOTAL: Rp ${new Intl.NumberFormat('id-ID').format(viewingReceipt.total || viewingReceipt.amountPaid || 0)}*\n\nThank you!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const agentSales = transactions.filter(t => t.agentId === selectedAgent?.id && t.date === todayStr && t.type === 'SALE');
    
    const combinedItems = useMemo(() => {
        if (!selectedAgent) return [];
        const map = {};
        
        (selectedAgent.activeCanvas || []).forEach(item => {
            const p = inventory.find(x => x.id === item.productId);
            map[item.productId] = {
                productId: item.productId, name: item.name, currentBks: convertToBks(item.qty, item.unit, p),
                soldBks: 0, unit: item.unit, currentRaw: item.qty 
            };
        });
        
        agentSales.forEach(t => {
            (t.items || []).forEach(item => {
                const p = inventory.find(x => x.id === item.productId);
                const bks = convertToBks(item.qty, item.unit, p);
                if (!map[item.productId]) {
                    map[item.productId] = { productId: item.productId, name: item.name, currentBks: 0, soldBks: 0, unit: 'Bks', currentRaw: 0 };
                }
                map[item.productId].soldBks += bks;
            });
        });
        
        return Object.values(map).map(i => ({ ...i, initialBks: i.currentBks + i.soldBks }));
    }, [selectedAgent, inventory, agentSales]);

    if (isFetchingFleet) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-slate-900 rounded-2xl border border-slate-700">
                <div className="text-center animate-pulse">
                    <Activity size={48} className="text-blue-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white uppercase tracking-widest">Establishing Regional Uplink</h2>
                    <p className="text-slate-400 mt-2 text-xs">Fetching Branch Roster Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="print-reset h-full w-full bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col md:flex-row text-white font-sans relative">
            
            {/* RECEIPT MODALS REMOVED FOR BREVITY (Leave them exactly as they are in your code) */}
            
            {/* LEFT PANEL: FLEET ROSTER */}
            <div className="hide-on-print w-full md:w-1/3 bg-slate-800/50 border-r border-slate-700 flex flex-col">
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-black/20">
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wider">
                            <Truck size={20} className="text-blue-500"/> 
                            {isAreaAdmin ? `${branchPathLocation} Roster` : 'Fleet Roster'}
                        </h2>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                            Active Personnel: {agents.length}
                        </p>
                    </div>
                    {/* 🚀 UPGRADED: Only render Add button if authorized */}
                    {canEditFleet && (
                        <button onClick={() => { setIsAddingAgent(!isAddingAgent); setEditingAgentId(null); setNewAgent(defaultAgentState); }} className="bg-blue-600 hover:bg-blue-500 p-2 rounded-xl transition-colors">
                            {isAddingAgent ? <X size={18}/> : <UserPlus size={18}/>}
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {isAddingAgent && (
                        <div className="bg-slate-800 p-4 rounded-xl border-2 border-dashed border-blue-500/50 mb-4 animate-slide-down">
                            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">{editingAgentId ? 'Edit Profile' : 'Deploy New Personnel'}</h3>
                            
                            {newAgent.userRole === 'AGENT' ? (
                                <select value={newAgent.role} onChange={e => setNewAgent({...newAgent, role: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-xs text-white mb-2 outline-none focus:border-blue-500 font-bold">
                                    <option value="Motorist">Sales Motorist (Motorbike)</option>
                                    <option value="Canvas">Sales Canvas (Car / Van)</option>
                                </select>
                            ) : (
                                <div className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-xs text-slate-400 mb-2 font-bold uppercase tracking-widest cursor-not-allowed">
                                    {newAgent.userRole === 'AREA_ADMIN' ? 'Branch Manager (Non-Driving)' : 'HQ Admin (Non-Driving)'}
                                </div>
                            )}

                            <input type="text" placeholder="Personnel Name" value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-xs text-white mb-2 outline-none focus:border-blue-500"/>
                            
                            <div className="flex gap-2 mb-2">
                                <input type="email" placeholder="Google Account Email (Login)" value={newAgent.email} onChange={e => setNewAgent({...newAgent, email: e.target.value})} className="flex-1 bg-slate-900 border border-blue-500/50 rounded p-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"/>
                                {isAdmin && (
                                    <select 
                                        className={`bg-slate-900 border rounded p-2.5 text-xs font-bold transition-colors cursor-pointer outline-none ${newAgent.userRole === 'ADMIN' ? 'border-orange-500 text-orange-500' : newAgent.userRole === 'AREA_ADMIN' ? 'border-purple-500 text-purple-400' : 'border-slate-700 text-white focus:border-blue-500'}`}
                                        value={newAgent.userRole || 'AGENT'} 
                                        onChange={(e) => setNewAgent({...newAgent, userRole: e.target.value})}
                                        style={{ colorScheme: 'dark' }}
                                    >
                                        <option value="AGENT" className="bg-slate-900 text-white">Tier 4: Salesman</option>
                                        <option value="AREA_ADMIN" className="bg-slate-900 text-purple-500">Tier 3: Area Admin</option>
                                        <option value="ADMIN" className="bg-slate-900 text-orange-500">Tier 2: HQ Admin</option>
                                    </select>
                                )}
                            </div>
                            
                            <div className="flex gap-2 mb-2">
                                {isNewProv || existingProvinces.length === 0 ? (
                                    <div className="flex-1 flex gap-2">
                                        <input type="text" placeholder="Type New Province..." value={newAgent.province || ''} onChange={e => setNewAgent({...newAgent, province: e.target.value})} className="flex-1 bg-slate-900 border border-purple-500 rounded p-2.5 text-xs text-white outline-none focus:border-purple-400"/>
                                        {existingProvinces.length > 0 && <button onClick={() => setIsNewProv(false)} className="bg-slate-800 p-2.5 rounded text-slate-400 hover:text-white"><X size={14}/></button>}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex gap-2">
                                        <select value={newAgent.province || existingProvinces[0]} onChange={e => setNewAgent({...newAgent, province: e.target.value})} className="flex-1 bg-slate-900 border border-purple-500/50 rounded p-2.5 text-xs text-white outline-none focus:border-purple-500 uppercase">
                                            {existingProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                        <button onClick={() => { setIsNewLoc(true); setNewAgent({...newAgent, province: ''}); }} className="bg-purple-900/50 border border-purple-500/50 text-purple-400 p-2.5 rounded hover:bg-purple-400 transition-colors" title="Add New Province"><Plus size={14}/></button>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 mb-2">
                                {isNewLoc || existingLocations.length === 0 ? (
                                    <div className="flex-1 flex gap-2">
                                        <input type="text" placeholder="Type New Area..." value={newAgent.location || ''} onChange={e => setNewAgent({...newAgent, location: e.target.value})} className="flex-1 bg-slate-900 border border-orange-500 rounded p-2.5 text-xs text-white outline-none focus:border-orange-400"/>
                                        {existingLocations.length > 0 && <button onClick={() => setIsNewLoc(false)} className="bg-slate-800 p-2.5 rounded text-slate-400 hover:text-white"><X size={14}/></button>}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex gap-2">
                                        <select value={newAgent.location || existingLocations[0]} onChange={e => setNewAgent({...newAgent, location: e.target.value})} className="flex-1 bg-slate-900 border border-orange-500/50 rounded p-2.5 text-xs text-white outline-none focus:border-orange-500 uppercase">
                                            {existingLocations.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                        <button onClick={() => { setIsNewLoc(true); setNewAgent({...newAgent, location: ''}); }} className="bg-orange-900/50 border border-orange-500/50 text-orange-400 p-2.5 rounded hover:bg-orange-400 transition-colors" title="Add New Area"><Plus size={14}/></button>
                                    </div>
                                )}
                            </div>

                            <input type="text" placeholder="WhatsApp Number" value={newAgent.phone} onChange={e => setNewAgent({...newAgent, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-xs text-white mb-2 outline-none focus:border-blue-500"/>
                            <input type="text" placeholder="Vehicle License Plate (Optional)" value={newAgent.vehicle} onChange={e => setNewAgent({...newAgent, vehicle: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-xs text-white mb-4 outline-none focus:border-blue-500"/>
                            
                            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 mb-4 shadow-inner">
                                <h4 className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 uppercase tracking-widest mb-3 border-b border-slate-700 pb-1"><ShieldCheck size={12}/> Agent Security Limits</h4>
                                
                                {/* 🚀 NEW: BRANCH MANAGER DELEGATION TOGGLE */}
                                {newAgent.userRole === 'AREA_ADMIN' && isAdmin && (
                                    <div className="mb-4">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Branch Privileges</label>
                                        <label className={`flex items-center gap-2 cursor-pointer text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${newAgent.canEditRoster ? 'bg-purple-900/30 border-purple-500 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                                            <input type="checkbox" className="hidden" checked={newAgent.canEditRoster} onChange={() => setNewAgent({...newAgent, canEditRoster: !newAgent.canEditRoster})} />
                                            Allow Roster Management (Add / Edit / Terminate)
                                        </label>
                                    </div>
                                )}

                                <div className="mb-3">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Allowed Payment Methods</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Cash', 'QRIS', 'Transfer', 'Titip'].map(method => (
                                            <label key={method} className={`flex items-center gap-1.5 cursor-pointer text-xs font-bold px-2 py-1 rounded border transition-colors ${newAgent.allowedPayments.includes(method) ? 'bg-blue-900/30 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                                                <input type="checkbox" className="hidden" checked={newAgent.allowedPayments.includes(method)} onChange={() => togglePayment(method)} />
                                                {method === 'Titip' ? 'Consignment' : method}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Allowed Price Tiers</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Ecer', 'Retail', 'Grosir'].map(tier => (
                                            <label key={tier} className={`flex items-center gap-1.5 cursor-pointer text-xs font-bold px-2 py-1 rounded border transition-colors ${newAgent.allowedTiers.includes(tier) ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                                                <input type="checkbox" className="hidden" checked={newAgent.allowedTiers.includes(tier)} onChange={() => toggleTier(tier)} />
                                                {tier}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleSaveAgent} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-widest transition-colors shadow-lg active:scale-95">
                                {editingAgentId ? 'Save Profile & Permissions' : 'Authorize & Register'}
                            </button>
                        </div>
                    )}

                    {agents.length === 0 && !isAddingAgent ? (
                        <div className="text-center py-10">
                            <Truck size={48} className="mx-auto text-slate-700 mb-3 opacity-50"/>
                            <p className="text-slate-500 text-sm">No personnel found.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type="text" placeholder="Search Name, Role, Area, Email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-900/80 border border-slate-700 focus:border-blue-500 rounded-lg py-2.5 pl-9 pr-3 text-xs text-white outline-none transition-colors"/>
                            </div>

                            {Object.entries(
                                agents.filter(a => {
                                    if (!searchTerm) return true;
                                    const term = searchTerm.toLowerCase();
                                    return (a.name?.toLowerCase().includes(term) || a.email?.toLowerCase().includes(term) || a.userRole?.toLowerCase().includes(term) || a.location?.toLowerCase().includes(term) || a.province?.toLowerCase().includes(term));
                                }).reduce((acc, agent) => {
                                    let prov = String(agent.province || 'CENTRAL JAVA').trim().toUpperCase();
                                    let loc = String(agent.location || 'UNASSIGNED AREA').trim().toUpperCase();
                                    if (!acc[prov]) acc[prov] = {};
                                    if (!acc[prov][loc]) acc[prov][loc] = [];
                                    acc[prov][loc].push(agent);
                                    return acc;
                                }, {})
                            ).sort(([provA], [provB]) => provA.localeCompare(provB)).map(([province, areas]) => (
                                <details key={province} className="mb-4 group/prov" open>
                                    <summary className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-slate-700 transition-colors select-none shadow-md">
                                        <Globe size={16} className="text-purple-500"/>
                                        <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">{province}</h2>
                                        <span className="text-[10px] text-slate-400 ml-auto bg-black/50 px-2 py-0.5 rounded-md border border-slate-700">
                                            {Object.values(areas).reduce((sum, arr) => sum + arr.length, 0)} Staff
                                        </span>
                                        <ChevronDown size={14} className="text-slate-400 transition-transform group-open/prov:rotate-180" />
                                    </summary>

                                    <div className="pl-3 border-l-2 border-slate-800 ml-2 mt-2 space-y-4">
                                        {Object.entries(areas).sort(([locA], [locB]) => locA.localeCompare(locB)).map(([location, locAgents]) => (
                                            <details key={location} className="group/loc" open>
                                                <summary className="flex items-center gap-2 mb-2 px-1 border-b border-slate-700/50 pb-1 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-slate-800/30 rounded transition-colors select-none">
                                                    <MapPin size={14} className="text-orange-500"/>
                                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{location}</h3>
                                                    <span className="text-[9px] text-slate-600 ml-auto bg-slate-800 px-2 py-0.5 rounded-full">{locAgents.length}</span>
                                                    <ChevronDown size={14} className="text-slate-500 transition-transform group-open/loc:rotate-180" />
                                                </summary>

                                                <div className="space-y-2 pl-2 border-l-2 border-slate-800/50 mt-2 mb-4">
                                                    {locAgents.sort((a, b) => {
                                                        const rank = { 'ADMIN': 3, 'AREA_ADMIN': 2, 'AGENT': 1 };
                                                        return (rank[b.userRole || 'AGENT'] || 0) - (rank[a.userRole || 'AGENT'] || 0);
                                                    }).map(m => (
                                                        <div key={m.id} onClick={() => { setSelectedAgent(m); setShowHistory(false); }} className={`p-3 rounded-xl cursor-pointer border transition-all flex items-center justify-between group/card ${selectedAgent?.id === m.id ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 shadow-sm'}`}>
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${m.userRole === 'ADMIN' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : m.userRole === 'AREA_ADMIN' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : m.role === 'Canvas' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                                    {m.userRole === 'ADMIN' ? <ShieldCheck size={18}/> : m.userRole === 'AREA_ADMIN' ? <Globe size={18}/> : m.role === 'Canvas' ? <Truck size={18}/> : <Activity size={18}/>}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h3 className={`font-bold truncate text-sm ${m.userRole === 'ADMIN' ? 'text-orange-400' : m.userRole === 'AREA_ADMIN' ? 'text-purple-400' : 'text-white'}`}>{m.name}</h3>
                                                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                                        {m.userRole === 'ADMIN' ? <span className="text-orange-500 font-bold uppercase">👑 Master Admin (Global)</span> : m.userRole === 'AREA_ADMIN' ? <span className="text-purple-400 font-bold uppercase">📍 Area Admin ({m.location})</span> : <>{m.role} {m.vehicle ? `• ${m.vehicle}` : ''}</>}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${(m.activeCanvas?.length || 0) > 0 ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                                                    {(m.activeCanvas?.length || 0) > 0 ? 'Loaded' : 'Empty'}
                                                                </span>
                                                                {/* 🚀 UPGRADED: Only render Edit buttons if authorized */}
                                                                {canEditFleet && (
                                                                    <div className="flex gap-2 opacity-30 lg:opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(e, m); }} className="text-slate-400 hover:text-blue-400" title="Edit Profile"><Pencil size={14}/></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteAgent(e, m); }} className="text-slate-400 hover:text-red-500" title="Remove Profile"><Trash2 size={14}/></button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                </details>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL OMITTED FOR BREVITY (Keep it exactly as is from your code!) */}
            <div className="hide-on-print flex-1 bg-slate-900 flex flex-col">
                <div className="flex-1 flex items-center justify-center flex-col opacity-30 select-none">
                    <Truck size={64} className="mb-4 text-slate-500"/>
                    <h2 className="text-xl font-black uppercase tracking-[0.3em]">Standby For Deployment</h2>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mt-2">Select Personnel from the Roster</p>
                </div>
            </div>
            
        </div>
    );
}