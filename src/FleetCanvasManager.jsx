import React, { useState, useEffect } from 'react';
import { 
    Truck, UserPlus, PackagePlus, Save, Archive, 
    ArrowRight, MapPin, Activity, X, AlertCircle, ShoppingCart, User, Mail, Pencil, Trash2
} from 'lucide-react';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';

const FleetCanvasManager = ({ db, appId, user, inventory, logAudit, triggerCapy, isAdmin }) => {
    const [agents, setAgents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [isAddingAgent, setIsAddingAgent] = useState(false);
    const [editingAgentId, setEditingAgentId] = useState(null); // Tracks if we are editing
    
    const [newAgent, setNewAgent] = useState({ name: '', phone: '', vehicle: '', role: 'Motorist', email: '' });

    const [selectedProduct, setSelectedProduct] = useState("");
    const [loadQty, setLoadQty] = useState("");

    const userId = user?.uid || user?.id || 'default';
    const collPath = `artifacts/${appId}/users/${userId}/motorists`; 

    const fetchAgents = async () => {
        if (!db || !appId || !userId) return;
        setIsLoading(true);
        try {
            const snap = await getDocs(collection(db, collPath));
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAgents(data);
            if (selectedAgent) {
                const updated = data.find(m => m.id === selectedAgent.id);
                if (updated) setSelectedAgent(updated);
            }
        } catch (error) {
            console.error("Error fetching fleet:", error);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchAgents(); }, [db, appId, userId]);

    // --- UPGRADED: SAVE (ATOMIC BATCH) ---
    const handleSaveAgent = async () => {
        if (!newAgent.name || !newAgent.phone || !newAgent.email) return alert("Name, Phone, and Google Account Email are absolutely required!");
        
        const emailKey = newAgent.email.toLowerCase().trim();

        try {
            const batch = writeBatch(db); // Create an all-or-nothing batch

            if (editingAgentId) {
                // --- EDIT EXISTING AGENT ---
                const oldAgent = agents.find(a => a.id === editingAgentId);
                const oldEmailKey = oldAgent?.email?.toLowerCase().trim();

                const agentRef = doc(db, collPath, editingAgentId);
                batch.update(agentRef, {
                    name: newAgent.name, phone: newAgent.phone, vehicle: newAgent.vehicle, role: newAgent.role, email: emailKey
                });

                // If email changed, we MUST delete the old Traffic Cop ticket
                if (oldEmailKey && oldEmailKey !== emailKey) {
                    batch.delete(doc(db, `artifacts/${appId}/employee_directory`, oldEmailKey));
                }
                
                // Set the new Traffic Cop ticket
                batch.set(doc(db, `artifacts/${appId}/employee_directory`, emailKey), {
                    bossUid: userId, agentId: editingAgentId, role: newAgent.role, status: 'Active'
                });

            } else {
                // --- CREATE NEW AGENT ---
                const newId = `AGT_${Date.now()}`;
                const agentData = {
                    id: newId, ...newAgent, email: emailKey, status: 'Active', activeCanvas: [], createdAt: new Date().toISOString()
                };

                batch.set(doc(db, collPath, newId), agentData);
                
                // CREATE THE TRAFFIC COP TICKET
                batch.set(doc(db, `artifacts/${appId}/employee_directory`, emailKey), {
                    bossUid: userId, agentId: newId, role: newAgent.role, status: 'Active'
                });
            }

            // Execute the batch!
            await batch.commit();

            if (editingAgentId) {
                triggerCapy(`Profile updated for ${newAgent.name}!`);
                logAudit("FLEET_EDIT", `Updated profile for ${emailKey}`);
            } else {
                triggerCapy(`${newAgent.name} added! Their email is now authorized to access your vault. 🚀`);
                logAudit("FLEET_ADD", `Created new ${newAgent.role} profile for ${emailKey}`);
            }

            // Reset Form
            setNewAgent({ name: '', phone: '', vehicle: '', role: 'Motorist', email: '' });
            setIsAddingAgent(false);
            setEditingAgentId(null);
            fetchAgents();
        } catch (e) {
            console.error("Batch Failed:", e);
            alert("Firebase Blocked the Save: " + e.message + "\n\nPlease check your Firebase Security Rules.");
        }
    };

    // --- NEW: EDIT CLICK HANDLER ---
    const handleEditClick = (e, agent) => {
        e.stopPropagation();
        setNewAgent({ name: agent.name, phone: agent.phone || '', vehicle: agent.vehicle || '', role: agent.role || 'Motorist', email: agent.email || '' });
        setEditingAgentId(agent.id);
        setIsAddingAgent(true);
    };

    // --- UPGRADED: DELETE (ATOMIC BATCH) ---
    const handleDeleteAgent = async (e, agent) => {
        e.stopPropagation();
        if (!window.confirm(`TERMINATION WARNING: Are you sure you want to remove ${agent.name}? This will instantly revoke their login access.`)) return;
        
        try {
            const batch = writeBatch(db);
            
            // 1. Remove from local roster
            batch.delete(doc(db, collPath, agent.id));
            
            // 2. Destroy their Traffic Cop Ticket
            if (agent.email) {
                batch.delete(doc(db, `artifacts/${appId}/employee_directory`, agent.email.toLowerCase().trim()));
            }
            
            // Execute!
            await batch.commit();

            triggerCapy(`${agent.name} terminated. Access revoked. 🛑`);
            logAudit("FLEET_DELETE", `Terminated agent: ${agent.email}`);
            
            if (selectedAgent?.id === agent.id) setSelectedAgent(null);
            fetchAgents();
        } catch (e) {
            console.error("Batch Failed:", e);
            alert("Firebase Blocked the Deletion: " + e.message + "\n\nPlease check your Firebase Security Rules.");
        }
    };

    const handleLoadCanvas = async () => {
        if (!selectedProduct || !loadQty || isNaN(loadQty) || Number(loadQty) <= 0) return alert("Select a product and valid quantity.");
        if (!selectedAgent) return;

        const product = inventory.find(p => p.id === selectedProduct);
        if (!product) return;

        const qtyToLoad = Number(loadQty);

        try {
            const batch = writeBatch(db);
            const agentRef = doc(db, collPath, selectedAgent.id);
            
            let updatedCanvas = [...(selectedAgent.activeCanvas || [])];
            const existingItemIndex = updatedCanvas.findIndex(item => item.productId === product.id);

            if (existingItemIndex >= 0) {
                updatedCanvas[existingItemIndex].qty += qtyToLoad;
            } else {
                updatedCanvas.push({
                    productId: product.id,
                    name: product.name,
                    qty: qtyToLoad,
                    unit: product.unit || 'Slop'
                });
            }

            batch.update(agentRef, { activeCanvas: updatedCanvas });
            await batch.commit();

            triggerCapy(`Loaded ${qtyToLoad} ${product.unit || 'Slop'} of ${product.name} into ${selectedAgent.name}'s vehicle! 📦`);
            setLoadQty("");
            setSelectedProduct("");
            fetchAgents(); 
            logAudit("CANVAS_LOAD", `Loaded ${qtyToLoad} ${product.name} to ${selectedAgent.name}`);

        } catch (e) {
            console.error(e);
            alert("Failed to load vehicle canvas.");
        }
    };

    const handleClearCanvas = async () => {
        if (!selectedAgent) return;
        if (!window.confirm(`Are you sure you want to empty ${selectedAgent.name}'s vehicle inventory? (Perform this during End-of-Day Reconciliation)`)) return;

        try {
            await setDoc(doc(db, collPath, selectedAgent.id), { activeCanvas: [] }, { merge: true });
            triggerCapy(`${selectedAgent.name}'s vehicle cleared and reconciled! 🧹`);
            fetchAgents();
            logAudit("CANVAS_CLEAR", `Cleared canvas for ${selectedAgent.name}`);
        } catch(e) {
            alert("Failed to clear canvas");
        }
    };

    return (
        <div className="h-full w-full bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col md:flex-row text-white font-sans">
            
            {/* LEFT PANEL: FLEET ROSTER */}
            <div className="w-full md:w-1/3 bg-slate-800/50 border-r border-slate-700 flex flex-col">
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-black/20">
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wider"><Truck size={20} className="text-blue-500"/> Fleet Roster</h2>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Active Personnel: {agents.length}</p>
                    </div>
                    {isAdmin && (
                        <button onClick={() => { setIsAddingAgent(!isAddingAgent); setEditingAgentId(null); setNewAgent({ name: '', phone: '', vehicle: '', role: 'Motorist', email: '' }); }} className="bg-blue-600 hover:bg-blue-500 p-2 rounded-xl transition-colors">
                            {isAddingAgent ? <X size={18}/> : <UserPlus size={18}/>}
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {isAddingAgent && (
                        <div className="bg-slate-800 p-4 rounded-xl border-2 border-dashed border-blue-500/50 mb-4 animate-slide-down">
                            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">{editingAgentId ? 'Edit Agent Profile' : 'Deploy New Agent'}</h3>
                            
                            <select value={newAgent.role} onChange={e => setNewAgent({...newAgent, role: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-xs text-white mb-2 outline-none focus:border-blue-500 font-bold">
                                <option value="Motorist">Sales Motorist (Motorbike)</option>
                                <option value="Canvas">Sales Canvas (Car / Van)</option>
                            </select>

                            <input type="text" placeholder="Agent Name" value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-xs text-white mb-2 outline-none focus:border-blue-500"/>
                            <input type="email" placeholder="Google Account Email (Required for Login)" value={newAgent.email} onChange={e => setNewAgent({...newAgent, email: e.target.value})} className="w-full bg-slate-900 border border-blue-500/50 rounded p-2.5 text-xs text-white mb-2 outline-none focus:border-blue-500 font-mono"/>
                            <input type="text" placeholder="WhatsApp Number" value={newAgent.phone} onChange={e => setNewAgent({...newAgent, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-xs text-white mb-2 outline-none focus:border-blue-500"/>
                            <input type="text" placeholder="Vehicle License Plate (Optional)" value={newAgent.vehicle} onChange={e => setNewAgent({...newAgent, vehicle: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-xs text-white mb-3 outline-none focus:border-blue-500"/>
                            
                            <button onClick={handleSaveAgent} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded text-xs uppercase tracking-widest transition-colors">
                                {editingAgentId ? 'Save Changes' : 'Authorize & Register'}
                            </button>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="text-center p-10 text-slate-500 animate-pulse">Loading Fleet Data...</div>
                    ) : agents.length === 0 && !isAddingAgent ? (
                        <div className="text-center p-10 text-slate-500 opacity-50 flex flex-col items-center">
                            <Truck size={32} className="mb-3"/>
                            <p className="text-xs uppercase tracking-widest">No Fleet Deployed</p>
                        </div>
                    ) : (
                        agents.map(m => (
                            <div 
                                key={m.id} 
                                onClick={() => setSelectedAgent(m)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${selectedAgent?.id === m.id ? 'bg-blue-900/30 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${selectedAgent?.id === m.id ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'}`}><User size={16}/></div>
                                    <div>
                                        <h4 className="font-bold text-sm text-white leading-tight">{m.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${m.role === 'Canvas' ? 'bg-purple-900/50 text-purple-400 border border-purple-500/30' : 'bg-blue-900/50 text-blue-400 border border-blue-500/30'}`}>
                                                {m.role || 'Motorist'}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-mono truncate max-w-[120px]">{m.email || 'No Email'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${(m.activeCanvas?.length || 0) > 0 ? 'bg-emerald-900/50 text-emerald-400' : 'bg-orange-900/50 text-orange-400'}`}>
                                        {(m.activeCanvas?.length || 0) > 0 ? 'Loaded' : 'Empty'}
                                    </span>
                                    {/* NEW: Edit and Delete actions */}
                                    {isAdmin && (
                                        <div className="flex gap-2 opacity-30 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => handleEditClick(e, m)} className="text-slate-400 hover:text-blue-400"><Pencil size={14}/></button>
                                            <button onClick={(e) => handleDeleteAgent(e, m)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: THE LOADING DOCK */}
            <div className="flex-1 bg-slate-900 flex flex-col">
                {selectedAgent ? (
                    <>
                        <div className="p-6 border-b border-slate-800 bg-black/40">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Activity size={12}/> Active Deployment Terminal</p>
                                    <h2 className="text-3xl font-black text-white">{selectedAgent.name}</h2>
                                    <p className="text-xs text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                        Type: <span className={selectedAgent.role === 'Canvas' ? 'text-purple-400' : 'text-blue-400'}>{selectedAgent.role || 'Motorist'}</span> | 
                                        <Mail size={12} className="ml-1"/> <span className="font-mono lowercase">{selectedAgent.email || 'Unregistered'}</span>
                                    </p>
                                </div>
                                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center min-w-[100px]">
                                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Vehicle Load</p>
                                    <p className="text-xl font-black text-white">{(selectedAgent.activeCanvas || []).reduce((sum, item) => sum + item.qty, 0)} <span className="text-xs text-slate-500">Items</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                            
                            {/* THE LOAD ENGINE */}
                            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-6 shadow-xl">
                                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><PackagePlus size={16} className="text-emerald-500"/> Transfer to Vehicle Vault</h3>
                                <div className="flex flex-col lg:flex-row gap-3 items-end">
                                    <div className="w-full lg:flex-1">
                                        <label className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 block">Select Main Vault Stock</label>
                                        <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm font-bold text-white outline-none focus:border-emerald-500">
                                            <option value="">-- Choose Product --</option>
                                            {inventory && inventory.map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} {isAdmin ? `(Vault: ${item.stock} ${item.unit})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-full lg:w-32">
                                        <label className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 block">Quantity</label>
                                        <input type="number" min="1" value={loadQty} onChange={(e) => setLoadQty(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm font-bold text-white outline-none focus:border-emerald-500 text-center" placeholder="0"/>
                                    </div>
                                    <button onClick={handleLoadCanvas} className="w-full lg:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-xs h-[46px] shrink-0 shadow-lg shadow-emerald-900/20">
                                        Load <ArrowRight size={16}/>
                                    </button>
                                </div>
                            </div>

                            {/* CURRENT MOTORCYCLE INVENTORY */}
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={14}/> Verified Loadout</h3>
                                {(selectedAgent.activeCanvas || []).length > 0 && (
                                    <button onClick={handleClearCanvas} className="text-[9px] bg-red-900/30 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded uppercase tracking-widest font-bold transition-colors">Reconcile & Clear</button>
                                )}
                            </div>

                            <div className="space-y-2">
                                {(selectedAgent.activeCanvas || []).length === 0 ? (
                                    <div className="text-center py-8 bg-black/20 rounded-xl border border-slate-800 border-dashed">
                                        <Archive size={24} className="mx-auto mb-2 text-slate-600"/>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest">Vehicle Vault is Empty</p>
                                    </div>
                                ) : (
                                    (selectedAgent.activeCanvas || []).map((item, idx) => (
                                        <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center animate-pop-in">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                                <span className="font-bold text-white text-sm">{item.name}</span>
                                            </div>
                                            <div className="bg-black/40 px-4 py-1.5 rounded-lg border border-slate-600 flex items-center gap-2">
                                                <span className="text-lg font-black text-emerald-400">{item.qty}</span>
                                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">{item.unit}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center flex-col opacity-30 select-none">
                        <Truck size={64} className="mb-4 text-slate-500"/>
                        <h2 className="text-xl font-black uppercase tracking-[0.3em]">Standby For Deployment</h2>
                        <p className="text-xs text-slate-400 uppercase tracking-widest mt-2">Select Personnel from the Roster</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FleetCanvasManager;