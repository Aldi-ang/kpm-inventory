import React, { useState, useEffect, useMemo } from 'react';
import { 
    Truck, UserPlus, PackagePlus, Save, Archive, 
    ArrowRight, MapPin, Activity, X, AlertCircle, ShoppingCart, User, Mail, Pencil, Trash2, 
    ShieldCheck, ChevronDown, ChevronUp, FileText, Printer, MessageSquare, Globe, Search, Plus
} from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, updateDoc, writeBatch, onSnapshot } from 'firebase/firestore'; 
import { DYNAMIC_TIERS } from './config/permissions'; 

export default function FleetCanvasManager({ db, appId, user, userRole, agentProfileId, inventory, transactions = [], appSettings = {}, logAudit, triggerCapy, isAdmin, motorists = [] }) {
    
    const isGlobalAdmin = ['DEVELOPER', 'COMPANY_OWNER', 'ADMIN'].includes(userRole);
    const isAreaAdmin = !isGlobalAdmin; 
    
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

    const myProfile = activeMotorists.find(m => m.email?.toLowerCase() === user?.email?.toLowerCase()) || activeMotorists.find(m => m.id === agentProfileId);
    
    const rawLocation = myProfile?.location || user?.location || 'UNASSIGNED';
    const searchLocation = String(rawLocation).trim().toLowerCase();
    const branchPathLocation = String(rawLocation).trim(); 

    const canEditFleet = isAdmin || (isAreaAdmin && myProfile?.canEditRoster === true);

    const agents = useMemo(() => {
        if (isAreaAdmin) {
            return activeMotorists.filter(m => String(m.location || '').trim().toLowerCase() === searchLocation);
        }
        return activeMotorists;
    }, [activeMotorists, isAreaAdmin, searchLocation]);
    
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [isAddingAgent, setIsAddingAgent] = useState(false);
    const [isReadOnlyMode, setIsReadOnlyMode] = useState(false); 
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
        canEditRoster: false,
        allowRetur: false
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

    const [allBypasses, setAllBypasses] = useState([]);

    useEffect(() => {
        if (!userId || !db || !appId) return;
        const bypassRef = collection(db, `artifacts/${appId}/users/${userId}/gps_bypasses`);
        const unsub = onSnapshot(bypassRef, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllBypasses(data.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)));
        });
        return () => unsub();
    }, [userId, db, appId]);

    useEffect(() => {
        if (selectedAgent) {
            const updated = agents.find(m => m.id === selectedAgent.id);
            if (updated) setSelectedAgent(updated);
        }
    }, [agents, selectedAgent]);

    const togglePayment = (method) => {
        if (isReadOnlyMode) return;
        setNewAgent(prev => ({
            ...prev, allowedPayments: prev.allowedPayments.includes(method) ? prev.allowedPayments.filter(m => m !== method) : [...prev.allowedPayments, method]
        }));
    };

    const toggleTier = (tier) => {
        if (isReadOnlyMode) return;
        setNewAgent(prev => ({
            ...prev, allowedTiers: prev.allowedTiers.includes(tier) ? prev.allowedTiers.filter(t => t !== tier) : [...prev.allowedTiers, tier]
        }));
    };

    const handleSaveAgent = async () => {
        if (isReadOnlyMode) return setIsAddingAgent(false); 
        
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
                    canEditRoster: newAgent.canEditRoster || false,
                    allowRetur: newAgent.allowRetur || false
                });

                if (oldEmailKey && oldEmailKey !== emailKey) batch.delete(doc(db, `artifacts/${appId}/employee_directory`, oldEmailKey));
                
                batch.set(doc(db, `artifacts/${appId}/employee_directory`, emailKey), {
                    bossUid: userId, agentId: editingAgentId, role: newAgent.role, userRole: newAgent.userRole || 'AGENT', status: 'Active',
                    location: newAgent.location || 'Headquarters',
                    canEditRoster: newAgent.canEditRoster || false 
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
            canEditRoster: agent.canEditRoster || false,
            allowRetur: agent.allowRetur || false
        });
        setEditingAgentId(agent.id);
        setIsReadOnlyMode(false);
        setIsAddingAgent(true);
    };

    const handleViewClick = (e, agent) => {
        e.stopPropagation();
        setNewAgent({
            name: agent.name, phone: agent.phone || '', vehicle: agent.vehicle || '', role: agent.role || 'Motorist', email: agent.email || '',
            allowedPayments: agent.allowedPayments || ['Cash'], allowedTiers: agent.allowedTiers || ['Retail', 'Ecer'],
            userRole: agent.userRole || 'AGENT', location: agent.location || 'Headquarters', province: agent.province || 'Central Java',
            canEditRoster: agent.canEditRoster || false,
            allowRetur: agent.allowRetur || false
        });
        setEditingAgentId(agent.id);
        setIsReadOnlyMode(true);
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
        const isReturReceipt = viewingReceipt.type === 'RETUR' || viewingReceipt.paymentType === 'Retur/BS';
        const displayTotal = viewingReceipt.total || viewingReceipt.amountPaid || 0;

        let text = `*${appSettings?.companyName || "KPM INVENTORY"}*\n*OFFICIAL RECEIPT (REPRINT)*\n------------------------\n`;
        text += `Date: ${viewingReceipt.timestamp ? new Date(viewingReceipt.timestamp.seconds * 1000).toLocaleString('id-ID') : viewingReceipt.date}\n`;
        text += `Customer: ${viewingReceipt.customerName}\nPayment: ${viewingReceipt.paymentType || 'Cash'}\n------------------------\n`;
        if (viewingReceipt.items) {
            viewingReceipt.items.forEach(item => {
                text += `${item.qty} ${item.unit} ${item.name}`;
                if (item.condition === 'DAMAGED') text += ` [DAMAGED]`;
                if (item.fulfillment === 'IOU') text += ` [IOU PENDING]`;
                if (item.isIouFulfillment) text += ` [IOU FULFILLED]`;
                text += `\n   Rp ${new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}\n`;
            });
        }
        text += `------------------------\n*TOTAL: ${isReturReceipt && displayTotal > 0 ? '-' : ''}Rp ${new Intl.NumberFormat('id-ID').format(displayTotal)}*\n\nThank you!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const todayStr = new Date().toISOString().split('T')[0];
    
    // 🚀 FORENSIC UPDATE: Ensure we grab BOTH sales AND return logs for the agent today
    const agentSales = transactions.filter(t => t.agentId === selectedAgent?.id && t.date === todayStr && ['SALE', 'RETUR'].includes(t.type || 'SALE'));
    
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
                // 🚀 MATH ENGINE FIX: Don't deduct from car if it was a Buyback or Pending IOU
                if (t.type === 'RETUR' && t.paymentType !== 'Tukar Ganti') return;
                if (t.paymentType === 'Tukar Ganti' && item.fulfillment === 'IOU') return;

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
            
            {/* 🚀 UPGRADED FORENSIC RECEIPT MODAL 🚀 */}
            {viewingReceipt && (() => {
                const isReturReceipt = viewingReceipt.type === 'RETUR' || viewingReceipt.paymentType === 'Retur/BS';
                const displayTotal = viewingReceipt.total || viewingReceipt.amountPaid || 0;

                return (
                    <div className="print-modal-wrapper fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-4">
                        <div className="print-receipt format-thermal !bg-white !text-black w-full max-w-sm shadow-2xl relative flex flex-col font-mono text-sm border-t-8 !border-slate-800 animate-fade-in rounded-b-lg max-h-[90vh] overflow-y-auto custom-scrollbar transition-all">
                            <div className="p-6 pb-2 shrink-0">
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-black uppercase tracking-widest !text-black">{appSettings?.companyName || "KPM INVENTORY"}</h2>
                                    <p className="text-[10px] font-bold mt-1 !text-slate-600">OFFICIAL SALES RECEIPT</p>
                                    <p className="text-[9px] mt-1 uppercase tracking-widest !text-slate-500">REPRINT COPY</p>
                                </div>
                                <div className="!bg-slate-100 rounded-lg p-4 mb-4 text-xs border !border-slate-300 space-y-2 shadow-inner">
                                    <div className="flex justify-between items-center"><span className="!text-slate-600 font-bold">DATE:</span><span className="!text-black font-black">{viewingReceipt.timestamp ? new Date(viewingReceipt.timestamp.seconds*1000).toLocaleString('id-ID') : viewingReceipt.date}</span></div>
                                    <div className="flex justify-between items-center"><span className="!text-slate-600 font-bold">CUST:</span><span className="!text-black font-black uppercase">{viewingReceipt.customerName}</span></div>
                                    <div className="flex justify-between items-center"><span className="!text-slate-600 font-bold">AGENT:</span><span className="!text-black font-black uppercase">{viewingReceipt.agentName || 'Unknown'}</span></div>
                                    <div className="flex justify-between items-center"><span className="!text-slate-600 font-bold">TYPE:</span><span className={`font-black uppercase ${isReturReceipt ? '!text-red-600' : viewingReceipt.paymentType === 'Tukar Ganti' ? '!text-blue-600' : '!text-black'}`}>{viewingReceipt.paymentType || 'Cash'}</span></div>
                                </div>
                                <div className="border-t-2 border-b-2 border-dashed !border-slate-400 py-3 mb-4 min-h-[150px]">
                                    {viewingReceipt.items && viewingReceipt.items.length > 0 ? viewingReceipt.items.map((item, i) => (
                                        <div key={i} className="mb-2">
                                            <div className="font-bold uppercase text-xs !text-black flex flex-wrap gap-1 items-center">
                                                {item.name}
                                                {item.condition === 'DAMAGED' && <span className="text-[9px] bg-red-100 !text-red-800 border !border-red-300 px-1 rounded shadow-sm">DAMAGED</span>}
                                                {item.fulfillment === 'IOU' && <span className="text-[9px] bg-blue-100 !text-blue-800 border !border-blue-300 px-1 rounded shadow-sm">IOU PENDING</span>}
                                                {item.isIouFulfillment && <span className="text-[9px] bg-emerald-100 !text-emerald-800 border !border-emerald-300 px-1 rounded shadow-sm">IOU FULFILLED</span>}
                                            </div>
                                            {item.condition === 'DAMAGED' && item.returnReason && (
                                                <div className="text-[9px] italic !text-slate-500 mb-0.5 mt-0.5">Reason: {item.returnReason === 'Other' ? item.otherReasonDetail : item.returnReason}</div>
                                            )}
                                            <div className="flex justify-between text-xs mt-0.5">
                                                <span className="!text-slate-600">{item.qty} {item.unit} x {new Intl.NumberFormat('id-ID').format(item.calculatedPrice || 0)}</span>
                                                <span className={`font-black ${isReturReceipt && item.calculatedPrice > 0 ? '!text-red-600' : '!text-black'}`}>
                                                    {isReturReceipt && item.calculatedPrice > 0 ? '-' : ''}{new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}
                                                </span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex items-center justify-center h-full !text-slate-400 text-[10px] uppercase tracking-widest text-center">{viewingReceipt.type === 'CONSIGNMENT_PAYMENT' ? 'Consignment Payment' : 'No Itemized Data'}</div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center text-lg font-black mb-6 border-t !border-slate-300 pt-3 !text-black">
                                    <span>TOTAL</span>
                                    <span className={isReturReceipt && displayTotal > 0 ? '!text-red-600' : '!text-black'}>
                                        {isReturReceipt && displayTotal > 0 ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(displayTotal)}
                                    </span>
                                </div>
                                <div className="text-center text-[10px] mb-4 font-bold !text-slate-500"><p>*** THANK YOU FOR YOUR BUSINESS ***</p></div>
                            </div>
                            <div className="no-print !bg-slate-200 p-4 flex gap-3 border-t !border-slate-300 mt-auto shrink-0">
                                <button onClick={() => window.print()} className="flex-1 !bg-slate-800 !text-white py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-slate-950 transition-colors tracking-widest text-[10px] shadow-md active:scale-95"><Printer size={14}/> Print</button>
                                <button onClick={handleWhatsAppShare} className="flex-1 !bg-[#25D366] !text-white py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-[#128C7E] transition-colors tracking-widest text-[10px] shadow-md active:scale-95"><MessageSquare size={14}/> Share</button>
                            </div>
                            <button onClick={() => setViewingReceipt(null)} className="no-print w-full shrink-0 !bg-red-600 hover:!bg-red-700 !text-white py-4 font-black uppercase tracking-[0.2em] shadow-[0_-5px_20px_rgba(0,0,0,0.2)] active:scale-95 transition-transform rounded-b-lg"><div className="flex items-center justify-center gap-2"><X size={20}/> CLOSE RECEIPT</div></button>
                        </div>
                    </div>
                );
            })()}

           {/* SURAT JALAN MODAL */}
            {viewingSuratJalan && selectedAgent && (
                <div className="print-modal-wrapper fixed inset-0 z-[500] bg-black/90 print:bg-transparent flex items-center justify-center p-4 print:!p-0 print:!m-0 print:!block">
                    <div className="print-receipt format-a4 !bg-white !text-black w-full max-w-4xl shadow-2xl relative flex flex-col font-sans text-sm border-t-8 !border-blue-800 animate-fade-in rounded-b-lg max-h-[90vh] overflow-y-auto custom-scrollbar transition-all print:!max-h-none print:!border-none print:!shadow-none print:!m-0 print:!p-0 print:!block print:!rounded-none">
                        
                        <div className="w-full overflow-x-auto custom-scrollbar border-b !border-slate-300 print:!overflow-visible print:!border-none print:!block print:!w-full print:!m-0 print:!p-0">
                            <div className="p-8 md:p-12 shrink-0 font-sans relative min-w-[800px] print:!min-w-0 print:!w-full print:!max-w-none print:!p-0 print:!m-0 mx-auto" style={{ backgroundColor: '#ffffff', color: '#000000', boxSizing: 'border-box' }}>
                                <div className="border-b-4 !border-blue-800 pb-4 mb-6 flex justify-between items-end gap-8">
                                    <div className="flex-1 flex items-center gap-4">
                                        {appSettings?.mascotImage && (
                                            <img src={appSettings.mascotImage} className="w-16 h-16 object-contain" alt="Company Logo" />
                                        )}
                                        <div>
                                            <h1 className="text-2xl md:text-3xl font-black !text-blue-900 tracking-widest uppercase break-words">{appSettings?.companyName || "PT KARYAMEGA PUTERA MANDIRI"}</h1>
                                            <p className="text-xs md:text-sm font-bold !text-slate-700 mt-1 whitespace-pre-line">{appSettings?.companyAddress || 'Jl. Raya Magelang - Purworejo Km. 11, Palbapang, Mungkid, Magelang'}</p>
                                            {appSettings?.companyPhone && <p className="text-xs font-bold !text-slate-700 mt-0.5">Telp/WA: {appSettings.companyPhone}</p>}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <h2 className="text-xl md:text-2xl font-bold !text-blue-800 uppercase tracking-widest">SURAT JALAN</h2>
                                        <p className="text-[10px] uppercase font-bold !text-slate-500 tracking-widest mt-1">OFFICIAL DELIVERY ORDER</p>
                                        <p className="text-sm font-mono font-black mt-2 !text-black">SJ-{new Date().toISOString().split('T')[0].replace(/-/g,'')}-{selectedAgent.id.slice(-4)}</p>
                                    </div>
                                </div>

                                <div className="px-0 mb-6 grid grid-cols-2 gap-4">
                                    <div className="border-2 !border-slate-800 p-3 rounded-lg shadow-sm">
                                        <p className="text-[10px] font-bold !text-slate-500 uppercase mb-1">Diberikan Kepada (Sales/Driver)</p>
                                        <p className="font-black text-lg uppercase !text-black">{selectedAgent.name}</p>
                                        <p className="text-xs mt-1 font-bold !text-slate-700">Role: {selectedAgent.role === 'Canvas' ? 'Sales Canvas' : 'Sales Motorist'}</p>
                                    </div>
                                    <div className="border-2 !border-slate-800 p-3 rounded-lg shadow-sm text-right">
                                        <p className="text-[10px] font-bold !text-slate-500 uppercase mb-1">Informasi Kendaraan / Waktu</p>
                                        <p className="font-black text-lg uppercase !text-black">{selectedAgent.vehicle || 'TIDAK ADA DATA KENDARAAN'}</p>
                                        <p className="text-xs mt-1 font-bold !text-slate-700">Deploy: {new Date().toLocaleTimeString('id-ID')}</p>
                                    </div>
                                </div>

                                <table className="w-full text-sm border-collapse border-2 !border-slate-800 mb-8 shadow-sm">
                                    <thead className="!bg-blue-50 !text-blue-900">
                                        <tr>
                                            <th className="border-2 !border-slate-800 p-3 text-center w-12 font-black">NO</th>
                                            <th className="border-2 !border-slate-800 p-3 text-left font-black">NAMA BARANG</th>
                                            <th className="border-2 !border-slate-800 p-3 text-right w-32 font-black">QTY</th>
                                            <th className="border-2 !border-slate-800 p-3 w-32 text-center font-black">UNIT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedAgent.activeCanvas || []).length === 0 ? (
                                            <tr><td colSpan="4" className="text-center p-8 text-gray-400 italic border-2 !border-slate-800">Tidak ada barang yang dimuat.</td></tr>
                                        ) : (
                                            (selectedAgent.activeCanvas || []).map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="border-2 !border-slate-800 p-2 text-center font-bold !text-slate-600">{idx + 1}</td>
                                                    <td className="border-2 !border-slate-800 p-2 font-bold uppercase !text-black">{item.name}</td>
                                                    <td className="border-2 !border-slate-800 p-2 text-right font-black text-lg !text-blue-700">{item.qty}</td>
                                                    <td className="border-2 !border-slate-800 p-2 text-center font-bold !text-black">{item.unit}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>

                                <div className="mb-8">
                                    <div className="!bg-blue-50 p-4 border-2 !border-blue-800 rounded-xl text-sm text-justify leading-relaxed italic !text-blue-900 shadow-md">
                                        <strong className="uppercase tracking-widest block mb-1">Pernyataan:</strong> Dengan ditandatanganinya Surat Jalan ini, pihak penerima (Sales/Driver) menyatakan bahwa barang-barang yang tercantum di atas telah diterima dalam keadaan utuh, baik, dan sesuai dengan jumlah yang tertera. Mulai saat dokumen ini ditandatangani, seluruh barang menjadi tanggung jawab penuh pihak penerima atas kehilangan, kerusakan, atau penyalahgunaan selama masa operasional.
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8 text-center mt-12 pb-4 !text-black print:mt-24">
                                    <div className="flex flex-col items-center">
                                        <p className="font-bold text-sm mb-24 uppercase tracking-widest">Admin Gudang</p>
                                        <div className="border-b-2 !border-slate-800 w-48 md:w-56"></div>
                                        <p className="text-sm mt-2 uppercase font-bold">
                                            {(() => {
                                                const branchAdmin = activeMotorists.find(m => 
                                                    m.userRole === 'AREA_ADMIN' && 
                                                    String(m.location || '').trim().toUpperCase() === String(selectedAgent.location || '').trim().toUpperCase()
                                                );
                                                return branchAdmin ? branchAdmin.name : (user.displayName || 'Admin');
                                            })()}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <p className="font-bold text-sm mb-24 uppercase tracking-widest">Sales/Motorist</p>
                                        <div className="border-b-2 !border-slate-800 w-48 md:w-56"></div>
                                        <p className="text-sm mt-2 uppercase font-bold">{selectedAgent.name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="no-print !bg-slate-200 p-4 flex gap-3 border-t !border-slate-300 mt-auto shrink-0 rounded-b-lg">
                            <button onClick={() => window.print()} className="flex-1 !bg-slate-800 !text-white py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-slate-950 transition-colors tracking-widest text-[10px] shadow-md active:scale-95"><Printer size={14}/> Print Surat Jalan</button>
                            <button onClick={() => setViewingSuratJalan(false)} className="px-8 !bg-red-600 hover:!bg-red-700 !text-white py-3 font-black uppercase tracking-[0.2em] text-[10px] rounded-lg shadow-md active:scale-95 flex items-center gap-2"><X size={14}/> Tutup</button>
                        </div>
                    </div>
                </div>
            )}

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
                    {canEditFleet && (
                        <button onClick={() => { setIsAddingAgent(!isAddingAgent); setEditingAgentId(null); setNewAgent(defaultAgentState); setIsReadOnlyMode(false); }} className="bg-blue-600 hover:bg-blue-500 p-2 rounded-xl transition-colors">
                            {isAddingAgent && !isReadOnlyMode ? <X size={18}/> : <UserPlus size={18}/>}
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {isAddingAgent && (
                        <div className={`bg-slate-800 p-4 rounded-xl border-2 border-dashed ${isReadOnlyMode ? 'border-emerald-500/50' : 'border-blue-500/50'} mb-4 animate-slide-down`}>
                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isReadOnlyMode ? 'text-emerald-400' : 'text-blue-400'}`}>
                                {isReadOnlyMode ? 'Profile Details' : editingAgentId ? 'Edit Profile' : 'Deploy New Personnel'}
                            </h3>
                            
                            <select disabled={isReadOnlyMode} value={newAgent.role} onChange={e => setNewAgent({...newAgent, role: e.target.value})} className={`w-full border border-slate-600 rounded p-2.5 text-xs text-white mb-2 outline-none font-bold ${isReadOnlyMode ? 'bg-slate-800 opacity-60 cursor-not-allowed' : 'bg-slate-900 focus:border-blue-500'}`}>
                                <option value="Motorist">Sales Motorist (Motorbike)</option>
                                <option value="Canvas">Sales Canvas (Car / Van)</option>
                            </select>

                            <input disabled={isReadOnlyMode} type="text" placeholder="Personnel Name" value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} className={`w-full border border-slate-600 rounded p-2.5 text-xs text-white mb-2 outline-none ${isReadOnlyMode ? 'bg-slate-800 opacity-60 cursor-not-allowed' : 'bg-slate-900 focus:border-blue-500'}`}/>
                            
                            <div className="flex gap-2 mb-2">
                                <input disabled={isReadOnlyMode} type="email" placeholder="Google Account Email (Login)" value={newAgent.email} onChange={e => setNewAgent({...newAgent, email: e.target.value})} className={`flex-1 border border-blue-500/50 rounded p-2.5 text-xs text-white outline-none font-mono ${isReadOnlyMode ? 'bg-slate-800 opacity-60 cursor-not-allowed' : 'bg-slate-900 focus:border-blue-500'}`}/>
                                {isAdmin && !isReadOnlyMode && (
                                    <select 
                                        className="bg-slate-900 border border-slate-600 rounded p-2.5 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer outline-none text-white focus:border-blue-500"
                                        value={newAgent.userRole || 'AGENT'} 
                                        onChange={(e) => setNewAgent({...newAgent, userRole: e.target.value})}
                                        style={{ colorScheme: 'dark' }}
                                        title="Assign Corporate Matrix Tier"
                                    >
                                        {DYNAMIC_TIERS.filter(t => !['ADMIN', 'COMPANY_OWNER', 'DEVELOPER'].includes(t.id)).map(t => (
                                            <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            
                            <div className="flex gap-2 mb-2">
                                {isNewProv || existingProvinces.length === 0 ? (
                                    <div className="flex-1 flex gap-2">
                                        <input disabled={isReadOnlyMode} type="text" placeholder="Type New Province..." value={newAgent.province || ''} onChange={e => setNewAgent({...newAgent, province: e.target.value})} className={`flex-1 border border-purple-500 rounded p-2.5 text-xs text-white outline-none focus:border-purple-400 ${isReadOnlyMode ? 'bg-slate-800 opacity-60 cursor-not-allowed' : 'bg-slate-900'}`}/>
                                        {existingProvinces.length > 0 && !isReadOnlyMode && <button onClick={() => setIsNewProv(false)} className="bg-slate-800 p-2.5 rounded text-slate-400 hover:text-white"><X size={14}/></button>}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex gap-2">
                                        <select disabled={isReadOnlyMode} value={newAgent.province || existingProvinces[0]} onChange={e => setNewAgent({...newAgent, province: e.target.value})} className={`flex-1 border border-purple-500/50 rounded p-2.5 text-xs text-white outline-none focus:border-purple-500 uppercase ${isReadOnlyMode ? 'bg-slate-800 opacity-60 cursor-not-allowed' : 'bg-slate-900'}`}>
                                            {existingProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                        {!isReadOnlyMode && <button onClick={() => { setIsNewProv(true); setNewAgent({...newAgent, province: ''}); }} className="bg-purple-900/50 border border-purple-500/50 text-purple-400 p-2.5 rounded hover:bg-purple-400 transition-colors" title="Add New Province"><Plus size={14}/></button>}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 mb-2">
                                {isNewLoc || existingLocations.length === 0 ? (
                                    <div className="flex-1 flex gap-2">
                                        <input disabled={isReadOnlyMode} type="text" placeholder="Type New Area..." value={newAgent.location || ''} onChange={e => setNewAgent({...newAgent, location: e.target.value})} className={`flex-1 border border-orange-500 rounded p-2.5 text-xs text-white outline-none focus:border-orange-400 ${isReadOnlyMode ? 'bg-slate-800 opacity-60 cursor-not-allowed' : 'bg-slate-900'}`}/>
                                        {existingLocations.length > 0 && !isReadOnlyMode && <button onClick={() => setIsNewLoc(false)} className="bg-slate-800 p-2.5 rounded text-slate-400 hover:text-white"><X size={14}/></button>}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex gap-2">
                                        <select disabled={isReadOnlyMode} value={newAgent.location || existingLocations[0]} onChange={e => setNewAgent({...newAgent, location: e.target.value})} className={`flex-1 border border-orange-500/50 rounded p-2.5 text-xs text-white outline-none focus:border-orange-500 uppercase ${isReadOnlyMode ? 'bg-slate-800 opacity-60 cursor-not-allowed' : 'bg-slate-900'}`}>
                                            {existingLocations.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                        {!isReadOnlyMode && <button onClick={() => { setIsNewLoc(true); setNewAgent({...newAgent, location: ''}); }} className="bg-orange-900/50 border border-orange-500/50 text-orange-400 p-2.5 rounded hover:bg-orange-400 transition-colors" title="Add New Area"><Plus size={14}/></button>}
                                    </div>
                                )}
                            </div>

                            <input disabled={isReadOnlyMode} type="text" placeholder="WhatsApp Number" value={newAgent.phone} onChange={e => setNewAgent({...newAgent, phone: e.target.value})} className={`w-full border border-slate-600 rounded p-2.5 text-xs text-white mb-2 outline-none ${isReadOnlyMode ? 'bg-slate-800 opacity-60 cursor-not-allowed' : 'bg-slate-900 focus:border-blue-500'}`}/>
                            <input disabled={isReadOnlyMode} type="text" placeholder="Vehicle License Plate (Optional)" value={newAgent.vehicle} onChange={e => setNewAgent({...newAgent, vehicle: e.target.value})} className={`w-full border border-slate-600 rounded p-2.5 text-xs text-white mb-4 outline-none ${isReadOnlyMode ? 'bg-slate-800 opacity-60 cursor-not-allowed' : 'bg-slate-900 focus:border-blue-500'}`}/>
                            
                            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 mb-4 shadow-inner">
                                <h4 className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 uppercase tracking-widest mb-3 border-b border-slate-700 pb-1"><ShieldCheck size={12}/> Agent Security Limits</h4>
                                
                                {(newAgent.userRole === 'AREA_ADMIN' || newAgent.userRole === 'FLEET_CAPTAIN') && isAdmin && !isReadOnlyMode && (
                                    <div className="mb-4">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Branch Privileges</label>
                                        <label className={`flex items-center gap-2 cursor-pointer text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${newAgent.canEditRoster ? 'bg-purple-900/30 border-purple-500 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                                            <input type="checkbox" className="hidden" checked={newAgent.canEditRoster} onChange={() => setNewAgent({...newAgent, canEditRoster: !newAgent.canEditRoster})} />
                                            Allow Roster Management (Add / Edit / Terminate)
                                        </label>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Operational Privileges</label>
                                    <label className={`flex items-center gap-2 cursor-pointer text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${isReadOnlyMode ? 'opacity-70 cursor-not-allowed' : ''} ${newAgent.allowRetur ? 'bg-red-900/30 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                                        <input type="checkbox" className="hidden" disabled={isReadOnlyMode} checked={newAgent.allowRetur} onChange={() => setNewAgent({...newAgent, allowRetur: !newAgent.allowRetur})} />
                                        Allow Tarik Barang / Retur (Return Unsold Goods)
                                    </label>
                                </div>

                                <div className="mb-3">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Allowed Payment Methods</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Cash', 'QRIS', 'Transfer', 'Titip'].map(method => (
                                            <label key={method} className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded border transition-colors ${isReadOnlyMode ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${newAgent.allowedPayments.includes(method) ? 'bg-blue-900/30 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                                <input type="checkbox" className="hidden" disabled={isReadOnlyMode} checked={newAgent.allowedPayments.includes(method)} onChange={() => togglePayment(method)} />
                                                {method === 'Titip' ? 'Consignment' : method}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Allowed Price Tiers</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Ecer', 'Retail', 'Grosir'].map(tier => (
                                            <label key={tier} className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded border transition-colors ${isReadOnlyMode ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${newAgent.allowedTiers.includes(tier) ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                                <input type="checkbox" className="hidden" disabled={isReadOnlyMode} checked={newAgent.allowedTiers.includes(tier)} onChange={() => toggleTier(tier)} />
                                                {tier}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {isReadOnlyMode ? (
                                <button onClick={() => setIsAddingAgent(false)} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-widest transition-colors shadow-md">
                                    Close Profile
                                </button>
                            ) : (
                                <button onClick={handleSaveAgent} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-widest transition-colors shadow-lg active:scale-95">
                                    {editingAgentId ? 'Save Profile & Permissions' : 'Authorize & Register'}
                                </button>
                            )}
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
                                                                <div className="flex gap-2 opacity-30 lg:opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                                    <button onClick={(e) => handleViewClick(e, m)} className="text-slate-400 hover:text-emerald-400" title="View Profile Details"><User size={14}/></button>
                                                                    {canEditFleet && (
                                                                        <>
                                                                            <button onClick={(e) => handleEditClick(e, m)} className="text-slate-400 hover:text-blue-400" title="Edit Profile"><Pencil size={14}/></button>
                                                                            <button onClick={(e) => handleDeleteAgent(e, m)} className="text-slate-400 hover:text-red-500" title="Remove Profile"><Trash2 size={14}/></button>
                                                                        </>
                                                                    )}
                                                                </div>
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

            {/* RIGHT PANEL: THE LOADING DOCK */}
            <div className="hide-on-print flex-1 bg-slate-900 flex flex-col relative">
                
                {/* 🚀 GLOBAL GEOFENCE COMMAND CENTER 🚀 */}
                {allBypasses.some(b => b.status === 'PENDING') && (
                    <div className="m-6 mb-0 bg-slate-800/90 rounded-2xl border-2 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)] overflow-hidden shrink-0 animate-fade-in-up z-20 backdrop-blur-sm">
                        <div className="p-4 bg-orange-500/20 border-b border-orange-500/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={18} className="text-orange-500 animate-pulse"/>
                                <h3 className="font-bold text-orange-400 uppercase tracking-widest text-xs">Active HQ Override Requests</h3>
                            </div>
                            <span className="bg-orange-500 text-black text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                Action Required
                            </span>
                        </div>
                        <div className="p-4 space-y-3 bg-black/40 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {allBypasses.filter(b => b.status === 'PENDING').map(bypass => (
                                <div key={bypass.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-3 rounded-xl border border-orange-500/30 bg-orange-900/20 shadow-sm">
                                    <div className="flex items-start gap-4 w-full">
                                        {bypass.photoData && (
                                            <div className="w-16 h-16 shrink-0 bg-black rounded-lg border border-slate-600 overflow-hidden cursor-zoom-in" onClick={() => window.open(bypass.photoData, '_blank')}>
                                                <img src={bypass.photoData} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" alt="Store Proof" title="Click to enlarge" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-white text-sm uppercase">{bypass.storeName}</h4>
                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-orange-500 text-black">PENDING</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-mono mb-0.5">Agent: <span className="text-orange-300 font-bold">{bypass.salesmanName}</span> • Time: {new Date(bypass.timestamp).toLocaleString('id-ID')}</p>
                                            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                                <MapPin size={10}/> Distance Logged: {bypass.distance} Meters
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto shrink-0 border-t border-orange-500/20 md:border-none pt-3 md:pt-0 mt-2 md:mt-0">
                                        <button 
                                            onClick={() => {
                                                if(window.confirm(`Grant 100m Bypass for ${bypass.storeName}?`)){
                                                    updateDoc(doc(db, `artifacts/${appId}/users/${userId}/gps_bypasses`, bypass.id), { status: 'APPROVED' });
                                                    if(logAudit) logAudit("GPS_BYPASS_APPROVED", `Granted override for ${bypass.salesmanName} at ${bypass.storeName}`);
                                                }
                                            }}
                                            className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-lg transition-colors shadow-md"
                                        >
                                            Approve Override
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if(window.confirm(`Reject Bypass Request?`)){
                                                    updateDoc(doc(db, `artifacts/${appId}/users/${userId}/gps_bypasses`, bypass.id), { status: 'REJECTED' });
                                                    if(logAudit) logAudit("GPS_BYPASS_REJECTED", `Denied override for ${bypass.salesmanName} at ${bypass.storeName}`);
                                                }
                                            }}
                                            className="flex-1 md:flex-none bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-lg transition-colors shadow-md"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {selectedAgent ? (
                    <>
                        <div className="p-6 border-b border-slate-800 bg-black/40">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Activity size={12}/> Active Deployment Terminal</p>
                                    <h2 className="text-3xl font-black text-white">{selectedAgent.name}</h2>
                                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                                        <ShieldCheck size={14} className="text-emerald-500"/>
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Permissions:</span>
                                        {(selectedAgent.allowedPayments || ['Cash']).map(p => (
                                            <span key={p} className="text-[9px] bg-blue-900/30 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded uppercase font-bold">{p === 'Titip' ? 'Consign' : p}</span>
                                        ))}
                                        <span className="text-slate-600">|</span>
                                        {(selectedAgent.allowedTiers || ['Retail', 'Ecer']).map(t => (
                                            <span key={t} className="text-[9px] bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase font-bold">{t}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {(() => {
                                        let currentLoadBks = 0;
                                        (selectedAgent.activeCanvas || []).forEach(item => {
                                            const product = inventory.find(p => p.id === item.productId);
                                            currentLoadBks += convertToBks(item.qty, item.unit, product);
                                        });
                                        
                                        let soldTodayBks = 0;
                                        agentSales.forEach(t => {
                                            (t.items || []).forEach(item => {
                                                // 🚀 IGNORE PURE BUYBACKS AND IOU PROMISES FROM "SOLD" TALLY
                                                if (t.type === 'RETUR' && t.paymentType !== 'Tukar Ganti') return; 
                                                if (t.paymentType === 'Tukar Ganti' && item.fulfillment === 'IOU') return; 
                                                
                                                const product = inventory.find(p => p.id === item.productId);
                                                soldTodayBks += convertToBks(item.qty, item.unit, product);
                                            });
                                        });
                                        const initialLoadBks = currentLoadBks + soldTodayBks;

                                        return (
                                            <>
                                                <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-center min-w-[70px] shadow-inner">
                                                    <p className="text-[8px] text-slate-400 uppercase tracking-widest mb-1">Initial</p>
                                                    <p className="text-lg font-black text-slate-300">{initialLoadBks}</p>
                                                </div>
                                                <div className="bg-orange-900/20 p-2.5 rounded-xl border border-orange-500/30 text-center min-w-[70px] shadow-inner">
                                                    <p className="text-[8px] text-orange-400 uppercase tracking-widest mb-1">Sold</p>
                                                    <p className="text-lg font-black text-orange-500">{soldTodayBks}</p>
                                                </div>
                                                <div className="bg-emerald-900/20 p-2.5 rounded-xl border border-emerald-500/30 text-center min-w-[70px] shadow-inner relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-emerald-500/10 animate-pulse pointer-events-none"></div>
                                                    <p className="text-[8px] text-emerald-400 uppercase tracking-widest mb-1">Current</p>
                                                    <p className="text-lg font-black text-emerald-500 relative z-10">{currentLoadBks}</p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                            
                            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-6 shadow-xl">
                                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><PackagePlus size={16} className="text-emerald-500"/> Transfer to Vehicle Vault</h3>
                                <div className="flex flex-col lg:flex-row gap-3 items-end">
                                    <div className="w-full lg:flex-1">
                                        <label className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 block">
                                            Select {isAreaAdmin ? 'Branch Warehouse' : 'Main Vault'} Stock
                                        </label>
                                        <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm font-bold text-white outline-none focus:border-emerald-500">
                                            <option value="">-- Choose Product --</option>
                                            {displayInventory && displayInventory.map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} (Available: {item.stock} {item.unit})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-full lg:w-32">
                                        <label className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1 block">Qty (Bungkus)</label>
                                        <input type="number" min="1" value={loadQty} onChange={(e) => setLoadQty(e.target.value)} className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg p-3 text-sm font-bold text-white outline-none focus:border-emerald-500 text-center" placeholder="0"/>
                                    </div>
                                    <button onClick={handleLoadCanvas} className="w-full lg:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-xs h-[46px] shrink-0 shadow-lg shadow-emerald-900/20">
                                        Load <ArrowRight size={16}/>
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={14}/> Itemized Asset Ledger</h3>
                                
                                {(selectedAgent.activeCanvas || []).length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setViewingSuratJalan(true)} className="text-[9px] bg-blue-600 text-white hover:bg-blue-500 px-3 py-1.5 rounded uppercase tracking-widest font-bold transition-colors shadow-lg flex items-center gap-1"><Printer size={12}/> Surat Jalan</button>
                                        <button onClick={handleClearCanvas} className="text-[9px] bg-red-900/30 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded uppercase tracking-widest font-bold transition-colors">Reconcile & Clear</button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                {combinedItems.length === 0 ? (
                                    <div className="text-center py-8 bg-black/20 rounded-xl border border-slate-800 border-dashed">
                                        <Archive size={24} className="mx-auto mb-2 text-slate-600"/>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest">No Items Assigned Today</p>
                                    </div>
                                ) : (
                                    combinedItems.map((item, idx) => (
                                        <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-pop-in">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] ${item.currentBks > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                <div>
                                                    <span className="font-bold text-white text-sm">{item.name}</span>
                                                    {item.currentRaw > 0 && <p className="text-[10px] text-slate-400 mt-0.5">Active Load: {item.currentRaw} {item.unit}</p>}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-slate-600 text-[10px] font-mono font-bold w-full md:w-auto">
                                                <span className="text-slate-400 w-16 text-center">INIT: {item.initialBks}</span>
                                                <span className="w-[1px] h-4 bg-slate-700"></span>
                                                <span className="text-orange-400 w-16 text-center">SOLD: {item.soldBks}</span>
                                                <span className="w-[1px] h-4 bg-slate-700"></span>
                                                <span className={`${item.currentBks > 0 ? 'text-emerald-400' : 'text-red-500'} w-16 text-center`}>LEFT: {item.currentBks}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* 🚀 AGENT-SPECIFIC BYPASS HISTORY 🚀 */}
                            {(() => {
                                const agentPrefix = (selectedAgent.email || '').split('@')[0].toLowerCase();
                                const agentBypasses = allBypasses.filter(b => 
                                    b.status !== 'PENDING' && 
                                    (
                                        b.salesmanId === selectedAgent.id || 
                                        (b.salesmanName || '').toLowerCase() === (selectedAgent.name || '').toLowerCase() ||
                                        (b.salesmanName || '').toLowerCase() === agentPrefix
                                    )
                                );

                                if (agentBypasses.length === 0) return null;

                                return (
                                    <div className="mt-6 mb-2 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden animate-fade-in-up">
                                        <div className="p-4 bg-black/40 border-b border-slate-700 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Archive size={18} className="text-slate-400"/>
                                                <h3 className="font-bold text-white uppercase tracking-widest text-xs">Geofence Bypass History</h3>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3 bg-black/10 max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {agentBypasses.map(bypass => (
                                                <div key={bypass.id} className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-3 rounded-xl border shadow-sm ${bypass.status === 'APPROVED' ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
                                                    <div className="flex items-start gap-4 w-full">
                                                        {bypass.photoData && (
                                                            <div className="w-12 h-12 shrink-0 bg-black rounded-lg border border-slate-600 overflow-hidden cursor-zoom-in" onClick={() => window.open(bypass.photoData, '_blank')}>
                                                                <img src={bypass.photoData} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" alt="Store Proof" title="Click to enlarge" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-bold text-white text-xs uppercase">{bypass.storeName}</h4>
                                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${bypass.status === 'APPROVED' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
                                                                    {bypass.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-mono mb-0.5">{new Date(bypass.timestamp).toLocaleString('id-ID')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* 🚀 UNIFIED ACTIVITY LOG (SALES & BYPASSES) 🚀 */}
                            <div className="mt-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden animate-fade-in-up">
                                <button onClick={() => setShowHistory(!showHistory)} className="w-full p-4 flex justify-between items-center bg-black/20 hover:bg-black/40 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <FileText size={18} className="text-blue-500"/>
                                        <h3 className="font-bold text-white uppercase tracking-widest text-xs">Today's Activity Logs ({agentSales.length} Transactions)</h3>
                                    </div>
                                    {showHistory ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
                                </button>
                                
                                {showHistory && (() => {
                                    const agentPrefix = (selectedAgent.email || '').split('@')[0].toLowerCase();
                                    const agentBypasses = allBypasses.filter(b => 
                                        b.status !== 'PENDING' &&
                                        (
                                            b.salesmanId === selectedAgent.id || 
                                            (b.salesmanName || '').toLowerCase() === (selectedAgent.name || '').toLowerCase() ||
                                            (b.salesmanName || '').toLowerCase() === agentPrefix ||
                                            agentSales.some(tx => (tx.customerName || '').toLowerCase() === (b.storeName || '').toLowerCase())
                                        )
                                    );

                                    return (
                                        <div className="p-4 bg-black/10 border-t border-slate-700 max-h-[600px] overflow-y-auto custom-scrollbar">
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                                                
                                                {/* LEFT COLUMN: FORENSIC SALES LOG */}
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold border-b border-slate-700 pb-2 mb-3 flex items-center gap-1"><ShoppingCart size={12}/> Daily Transactions</h4>
                                                    {agentSales.length === 0 ? (
                                                        <p className="text-center text-xs text-slate-500 uppercase tracking-widest py-4 bg-slate-900/50 rounded-lg border border-slate-700 border-dashed">No transactions recorded today.</p>
                                                    ) : (
                                                        agentSales.map(tx => {
                                                            const linkedBypass = agentBypasses.find(b => {
                                                                if (b.status !== 'APPROVED') return false;
                                                                if ((b.storeName || '').toLowerCase() !== (tx.customerName || '').toLowerCase()) return false;
                                                                const bypassTime = new Date(b.timestamp || b.createdAt?.seconds * 1000 || 0).getTime();
                                                                const now = new Date().getTime();
                                                                return (now - bypassTime) < (24 * 60 * 60 * 1000);
                                                            });

                                                            // 🚀 BADGE LOGIC
                                                            const isRetur = tx.type === 'RETUR' || tx.paymentType === 'Retur/BS';
                                                            const isExchange = tx.paymentType === 'Tukar Ganti';
                                                            const isIouFulfill = tx.paymentType === 'IOU Fulfillment';

                                                            return (
                                                                <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-700 shadow-sm transition-all hover:border-blue-500/50 group">
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className="font-bold text-white text-sm uppercase">{tx.customerName}</h4>
                                                                            {isRetur ? (
                                                                                <span className="text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-widest bg-red-500 text-white shadow-md">RETUR</span>
                                                                            ) : isExchange ? (
                                                                                <span className="text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-widest bg-blue-500 text-white shadow-md">EXCHANGE</span>
                                                                            ) : isIouFulfill ? (
                                                                                <span className="text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-widest bg-emerald-500 text-white shadow-md">IOU FULFILLED</span>
                                                                            ) : null}
                                                                        </div>
                                                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{tx.timestamp ? new Date(tx.timestamp.seconds * 1000).toLocaleTimeString('id-ID') : 'Today'} • {tx.paymentType}</p>
                                                                        
                                                                        {linkedBypass && (
                                                                            <div className="mt-1.5 flex items-center gap-1 text-[8px] bg-orange-900/30 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded uppercase tracking-widest w-fit shadow-inner">
                                                                                <MapPin size={8}/> 100m Bypass Used
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-3 md:gap-4">
                                                                        <div className="text-right">
                                                                            <p className={`font-black text-sm md:text-base ${isRetur ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                                {isRetur && (tx.total || tx.amountPaid || 0) > 0 ? '-' : ''}
                                                                                {new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', minimumFractionDigits:0}).format(tx.total || tx.amountPaid || 0)}
                                                                            </p>
                                                                            <p className="text-[9px] text-slate-500 uppercase tracking-widest">{tx.items?.length || 0} Items</p>
                                                                        </div>
                                                                        <button onClick={() => setViewingReceipt(tx)} className="p-2 bg-slate-800 group-hover:bg-slate-700 text-blue-400 rounded-lg transition-colors shadow-sm" title="View Receipt">
                                                                            <FileText size={16}/>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>

                                                {/* RIGHT COLUMN: GEOFENCE VISUAL LOG */}
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold border-b border-slate-700 pb-2 mb-3 flex items-center gap-1"><MapPin size={12}/> Geofence Bypass Log</h4>
                                                    {agentBypasses.length === 0 ? (
                                                        <p className="text-center text-xs text-slate-500 uppercase tracking-widest py-4 bg-slate-900/50 rounded-lg border border-slate-700 border-dashed">No bypass history.</p>
                                                    ) : (
                                                        agentBypasses.map(bypass => (
                                                            <div key={bypass.id} className={`flex items-start gap-3 p-3 rounded-xl border shadow-sm ${bypass.status === 'APPROVED' ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
                                                                {bypass.photoData && (
                                                                    <div className="w-12 h-12 shrink-0 bg-black rounded-lg border border-slate-600 overflow-hidden cursor-zoom-in" onClick={() => window.open(bypass.photoData, '_blank')}>
                                                                        <img src={bypass.photoData} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" alt="Store Proof" title="Click to enlarge" />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <h4 className="font-bold text-white text-xs uppercase">{bypass.storeName}</h4>
                                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${bypass.status === 'APPROVED' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
                                                                            {bypass.status}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-400 font-mono mb-0.5">{new Date(bypass.timestamp).toLocaleString('id-ID')}</p>
                                                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">Distance: {bypass.distance}m</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                            </div>
                                        </div>
                                    );
                                })()}
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
}
