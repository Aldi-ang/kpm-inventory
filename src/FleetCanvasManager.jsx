import React, { useState, useEffect, useMemo } from 'react';
import { 
    Truck, UserPlus, PackagePlus, Save, Archive, 
    ArrowRight, MapPin, Activity, X, AlertCircle, ShoppingCart, User, Mail, Pencil, Trash2, 
    ShieldCheck, ChevronDown, ChevronUp, FileText, Printer, MessageSquare
} from 'lucide-react';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';

const FleetCanvasManager = ({ db, appId, user, inventory, transactions = [], appSettings = {}, logAudit, triggerCapy, isAdmin }) => {
    const [agents, setAgents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [isAddingAgent, setIsAddingAgent] = useState(false);
    const [editingAgentId, setEditingAgentId] = useState(null); 
    
    const defaultAgentState = { 
        name: '', phone: '', vehicle: '', role: 'Motorist', email: '',
        allowedPayments: ['Cash'], 
        allowedTiers: ['Retail', 'Ecer']
    };
    const [newAgent, setNewAgent] = useState(defaultAgentState);

    const [selectedProduct, setSelectedProduct] = useState("");
    const [loadQty, setLoadQty] = useState("");
    
    // --- NEW UI STATES ---
    const [showHistory, setShowHistory] = useState(false);
    const [viewingReceipt, setViewingReceipt] = useState(null);
    const [viewingSuratJalan, setViewingSuratJalan] = useState(false); // NEW: Surat Jalan UI

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

    const togglePayment = (method) => {
        setNewAgent(prev => ({
            ...prev,
            allowedPayments: prev.allowedPayments.includes(method) ? prev.allowedPayments.filter(m => m !== method) : [...prev.allowedPayments, method]
        }));
    };

    const toggleTier = (tier) => {
        setNewAgent(prev => ({
            ...prev,
            allowedTiers: prev.allowedTiers.includes(tier) ? prev.allowedTiers.filter(t => t !== tier) : [...prev.allowedTiers, tier]
        }));
    };

    const handleSaveAgent = async () => {
        if (!newAgent.name || !newAgent.phone || !newAgent.email) return alert("Name, Phone, and Google Account Email are absolutely required!");
        if (newAgent.allowedPayments.length === 0) return alert("You must allow at least one Payment Method (e.g., Cash)!");
        if (newAgent.allowedTiers.length === 0) return alert("You must allow at least one Price Tier!");

        const emailKey = newAgent.email.toLowerCase().trim();

        try {
            const batch = writeBatch(db);

            if (editingAgentId) {
                const oldAgent = agents.find(a => a.id === editingAgentId);
                const oldEmailKey = oldAgent?.email?.toLowerCase().trim();

                const agentRef = doc(db, collPath, editingAgentId);
                batch.update(agentRef, {
                    name: newAgent.name, phone: newAgent.phone, vehicle: newAgent.vehicle, role: newAgent.role, email: emailKey,
                    allowedPayments: newAgent.allowedPayments,
                    allowedTiers: newAgent.allowedTiers        
                });

                if (oldEmailKey && oldEmailKey !== emailKey) {
                    batch.delete(doc(db, `artifacts/${appId}/employee_directory`, oldEmailKey));
                }
                
                batch.set(doc(db, `artifacts/${appId}/employee_directory`, emailKey), {
                    bossUid: userId, agentId: editingAgentId, role: newAgent.role, status: 'Active'
                });

            } else {
                const newId = `AGT_${Date.now()}`;
                const agentData = {
                    id: newId, ...newAgent, email: emailKey, status: 'Active', activeCanvas: [], createdAt: new Date().toISOString()
                };

                batch.set(doc(db, collPath, newId), agentData);
                batch.set(doc(db, `artifacts/${appId}/employee_directory`, emailKey), {
                    bossUid: userId, agentId: newId, role: newAgent.role, status: 'Active'
                });
            }

            await batch.commit();

            if (editingAgentId) {
                triggerCapy(`Profile updated for ${newAgent.name}!`);
                logAudit("FLEET_EDIT", `Updated profile for ${emailKey}`);
            } else {
                triggerCapy(`${newAgent.name} added! Their email is now authorized to access your vault. 🚀`);
                logAudit("FLEET_ADD", `Created new ${newAgent.role} profile for ${emailKey}`);
            }

            setNewAgent(defaultAgentState);
            setIsAddingAgent(false);
            setEditingAgentId(null);
            fetchAgents();
        } catch (e) {
            console.error("Batch Failed:", e);
            alert("Firebase Blocked the Save: " + e.message + "\n\nPlease check your Firebase Security Rules.");
        }
    };

    const handleEditClick = (e, agent) => {
        e.stopPropagation();
        setNewAgent({ 
            name: agent.name, phone: agent.phone || '', vehicle: agent.vehicle || '', role: agent.role || 'Motorist', email: agent.email || '',
            allowedPayments: agent.allowedPayments || ['Cash'],
            allowedTiers: agent.allowedTiers || ['Retail', 'Ecer']
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
            fetchAgents();
        } catch (e) {
            console.error("Batch Failed:", e);
            alert("Firebase Blocked the Deletion: " + e.message);
        }
    };

    // --- HELPER: UNIT CONVERSION ENGINE ---
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
        const product = inventory.find(p => p.id === selectedProduct);
        if (!product) return;

        const qtyToLoad = Number(loadQty);
        const unitToLoad = product.unit || 'Slop';
        const loadInBks = convertToBks(qtyToLoad, unitToLoad, product);

        if ((product.stock || 0) < loadInBks) {
            return alert(`INSUFFICIENT WAREHOUSE STOCK!\n\nYou are trying to load ${loadInBks} Bks (${qtyToLoad} ${unitToLoad}), but the Master Vault only has ${product.stock || 0} Bks available.`);
        }

        try {
            const batch = writeBatch(db);
            const prodRef = doc(db, `artifacts/${appId}/users/${userId}/products`, product.id);
            batch.update(prodRef, { stock: (product.stock || 0) - loadInBks });

            const agentRef = doc(db, collPath, selectedAgent.id);
            let updatedCanvas = [...(selectedAgent.activeCanvas || [])];
            const existingItemIndex = updatedCanvas.findIndex(item => item.productId === product.id);

            if (existingItemIndex >= 0) {
                updatedCanvas[existingItemIndex].qty += qtyToLoad;
            } else {
                updatedCanvas.push({ productId: product.id, name: product.name, qty: qtyToLoad, unit: unitToLoad });
            }

            batch.update(agentRef, { activeCanvas: updatedCanvas });
            await batch.commit();

            triggerCapy(`Loaded ${qtyToLoad} ${unitToLoad} into vehicle. Vault stock deducted! 📦`);
            setLoadQty("");
            setSelectedProduct("");
            fetchAgents(); 
            logAudit("CANVAS_LOAD", `Loaded ${qtyToLoad} ${product.name} to ${selectedAgent.name}`);
        } catch (e) {
            console.error(e);
            alert("Failed to load vehicle canvas: " + e.message);
        }
    };

    const handleClearCanvas = async () => {
        if (!selectedAgent) return;
        if (!window.confirm(`Are you sure you want to empty ${selectedAgent.name}'s vehicle inventory? This will securely return all their unsold stock back into the Master Vault.`)) return;

        try {
            const batch = writeBatch(db);
            const currentCanvas = selectedAgent.activeCanvas || [];
            
            currentCanvas.forEach(item => {
                const product = inventory.find(p => p.id === item.productId);
                if (product) {
                    const returnInBks = convertToBks(item.qty, item.unit, product);
                    const prodRef = doc(db, `artifacts/${appId}/users/${userId}/products`, product.id);
                    batch.update(prodRef, { stock: (product.stock || 0) + returnInBks });
                }
            });

            const agentRef = doc(db, collPath, selectedAgent.id);
            batch.update(agentRef, { activeCanvas: [] });
            
            await batch.commit();
            triggerCapy(`Vehicle cleared. All unsold stock returned to Vault! 🧹`);
            fetchAgents();
            logAudit("CANVAS_CLEAR", `Cleared and reconciled canvas for ${selectedAgent.name}`);
        } catch(e) {
            alert("Failed to clear canvas: " + e.message);
        }
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

    // --- NEW: DYNAMIC PER-ITEM MATH ENGINE ---
    const todayStr = new Date().toISOString().split('T')[0];
    const agentSales = transactions.filter(t => t.agentId === selectedAgent?.id && t.date === todayStr && t.type === 'SALE');
    
    const combinedItems = useMemo(() => {
        if (!selectedAgent) return [];
        const map = {};
        
        // 1. Log what is currently in the car
        (selectedAgent.activeCanvas || []).forEach(item => {
            const p = inventory.find(x => x.id === item.productId);
            map[item.productId] = {
                productId: item.productId,
                name: item.name,
                currentBks: convertToBks(item.qty, item.unit, p),
                soldBks: 0,
                unit: item.unit, 
                currentRaw: item.qty 
            };
        });
        
        // 2. Add back what was sold today to find the Starting Balance
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


    return (
        <div className="print-reset h-full w-full bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col md:flex-row text-white font-sans relative">
            
            {/* GLOBAL RECEIPT MODAL (FIXED FOR LAG AND DARK MODE) */}
            {viewingReceipt && (
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
                                <div className="flex justify-between items-center"><span className="!text-slate-600 font-bold">TYPE:</span><span className="!text-black font-black uppercase">{viewingReceipt.paymentType || 'Cash'}</span></div>
                            </div>
                            <div className="border-t-2 border-b-2 border-dashed !border-slate-400 py-3 mb-4 min-h-[150px]">
                                {viewingReceipt.items && viewingReceipt.items.length > 0 ? viewingReceipt.items.map((item, i) => (
                                    <div key={i} className="mb-2">
                                        <div className="font-bold uppercase text-xs !text-black">{item.name}</div>
                                        <div className="flex justify-between text-xs mt-0.5">
                                            <span className="!text-slate-600">{item.qty} {item.unit} x {new Intl.NumberFormat('id-ID').format(item.calculatedPrice || 0)}</span>
                                            <span className="!text-black font-black">{new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex items-center justify-center h-full !text-slate-400 text-[10px] uppercase tracking-widest text-center">{viewingReceipt.type === 'CONSIGNMENT_PAYMENT' ? 'Consignment Payment' : 'No Itemized Data'}</div>
                                )}
                            </div>
                            <div className="flex justify-between items-center text-lg font-black mb-6 border-t !border-slate-300 pt-3 !text-black">
                                <span>TOTAL</span><span>Rp {new Intl.NumberFormat('id-ID').format(viewingReceipt.total || viewingReceipt.amountPaid || 0)}</span>
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
            )}

            {/* NEW: OFFICIAL SURAT JALAN MODAL (FIXED A4 MOBILE SCROLL & PRINT LAG) */}
            {viewingSuratJalan && selectedAgent && (
                <div className="print-modal-wrapper fixed inset-0 z-[500] bg-black/90 print:bg-transparent flex items-center justify-center p-4 print:p-0">
                    <style>{`@media print { .print-modal-wrapper { background: transparent !important; padding: 0 !important; } .print-receipt { box-shadow: none !important; border: none !important; border-radius: 0 !important; } }`}</style>
                    <div className="print-receipt format-a4 !bg-white !text-black w-full max-w-4xl shadow-2xl relative flex flex-col font-sans text-sm border-t-8 !border-blue-800 animate-fade-in rounded-b-lg max-h-[90vh] overflow-y-auto custom-scrollbar transition-all print:max-h-none print:border-none print:shadow-none">
                        
                        <div className="w-full overflow-x-auto custom-scrollbar border-b !border-slate-300 print:overflow-visible print:border-none print:flex print:justify-center">
                            {/* NEW ALIGNMENT FIX: print:min-w-0 overrides the 800px on mobile so it centers perfectly on A4! */}
                            <div className="p-8 md:p-12 shrink-0 font-sans relative min-w-[800px] print:min-w-0 print:w-full print:max-w-[210mm] print:p-8 mx-auto" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
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
                                    {/* FIX: Increased text size to text-sm */}
                                    <div className="!bg-blue-50 p-4 border-2 !border-blue-800 rounded-xl text-sm text-justify leading-relaxed italic !text-blue-900 shadow-md">
                                        <strong className="uppercase tracking-widest block mb-1">Pernyataan:</strong> Dengan ditandatanganinya Surat Jalan ini, pihak penerima (Sales/Driver) menyatakan bahwa barang-barang yang tercantum di atas telah diterima dalam keadaan utuh, baik, dan sesuai dengan jumlah yang tertera. Mulai saat dokumen ini ditandatangani, seluruh barang menjadi tanggung jawab penuh pihak penerima atas kehilangan, kerusakan, atau penyalahgunaan selama masa operasional.
                                    </div>
                                </div>

                                {/* FIX: Removed Security Pos & Switched to 2-Column Grid */}
                                <div className="grid grid-cols-2 gap-8 text-center mt-12 pb-4 !text-black print:mt-24">
                                    <div className="flex flex-col items-center">
                                        <p className="font-bold text-sm mb-24 uppercase tracking-widest">Admin Gudang</p>
                                        <div className="border-b-2 !border-slate-800 w-48 md:w-56"></div>
                                        <p className="text-sm mt-2 uppercase font-bold">{user.displayName || 'Admin'}</p>
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
                            <button onClick={() => {
                                // 🔥 ENTERPRISE DOM-STRIP HACK (Instant Print, No Popups) 🔥
                                const receiptNode = document.querySelector('.print-receipt');
                                if (!receiptNode) return;

                                // 1. Clone the receipt perfectly without breaking React
                                const printClone = receiptNode.cloneNode(true);
                                
                                // Clean up the clone (remove buttons so they don't print)
                                const noPrintEls = printClone.querySelectorAll('.no-print');
                                noPrintEls.forEach(el => el.remove());

                                // 2. Create a pure, isolated print container
                                const printWrapper = document.createElement('div');
                                printWrapper.id = 'lightning-print-wrapper';
                                printWrapper.style.backgroundColor = 'white';
                                printWrapper.style.width = '100%';
                                
                                const innerDiv = document.createElement('div');
                                innerDiv.style.width = '210mm';
                                innerDiv.style.margin = '0 auto';
                                innerDiv.appendChild(printClone);
                                printWrapper.appendChild(innerDiv);

                                // 3. Physically hide the ENTIRE app to drop Safari's memory load to ZERO
                                const originalStyles = [];
                                Array.from(document.body.children).forEach(child => {
                                    if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE') {
                                        originalStyles.push({ node: child, display: child.style.display });
                                        child.style.display = 'none';
                                    }
                                });

                                // 4. Attach and Print Synchronously (Bypasses the "Allow/Ignore" Safari popup completely!)
                                document.body.appendChild(printWrapper);
                                window.print();

                                // 5. Instantly restore the app the second the print menu closes
                                document.body.removeChild(printWrapper);
                                originalStyles.forEach(item => {
                                    item.node.style.display = item.display;
                                });

                            }} className="flex-1 !bg-slate-800 !text-white py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-slate-950 transition-colors tracking-widest text-[10px] shadow-md active:scale-95"><Printer size={14}/> Print Surat Jalan</button>
                            <button onClick={() => setViewingSuratJalan(false)} className="px-8 !bg-red-600 hover:!bg-red-700 !text-white py-3 font-black uppercase tracking-[0.2em] text-[10px] rounded-lg shadow-md active:scale-95 flex items-center gap-2"><X size={14}/> Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* LEFT PANEL: FLEET ROSTER */}
            <div className="hide-on-print w-full md:w-1/3 bg-slate-800/50 border-r border-slate-700 flex flex-col">
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-black/20">
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wider"><Truck size={20} className="text-blue-500"/> Fleet Roster</h2>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Active Personnel: {agents.length}</p>
                    </div>
                    {isAdmin && (
                        <button onClick={() => { setIsAddingAgent(!isAddingAgent); setEditingAgentId(null); setNewAgent(defaultAgentState); }} className="bg-blue-600 hover:bg-blue-500 p-2 rounded-xl transition-colors">
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
                            <input type="text" placeholder="Vehicle License Plate (Optional)" value={newAgent.vehicle} onChange={e => setNewAgent({...newAgent, vehicle: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-xs text-white mb-4 outline-none focus:border-blue-500"/>
                            
                            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 mb-4 shadow-inner">
                                <h4 className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 uppercase tracking-widest mb-3 border-b border-slate-700 pb-1"><ShieldCheck size={12}/> Agent Security Limits</h4>
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
                                                {m.role === 'Canvas' ? 'Sales Canvas' : 'Sales Motorist'}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-mono truncate max-w-[120px]">{m.email || 'No Email'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${(m.activeCanvas?.length || 0) > 0 ? 'bg-emerald-900/50 text-emerald-400' : 'bg-orange-900/50 text-orange-400'}`}>
                                        {(m.activeCanvas?.length || 0) > 0 ? 'Loaded' : 'Empty'}
                                    </span>
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
            <div className="hide-on-print flex-1 bg-slate-900 flex flex-col">
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
                                        // Top Level Global Summary
                                        let currentLoadBks = 0;
                                        (selectedAgent.activeCanvas || []).forEach(item => {
                                            const product = inventory.find(p => p.id === item.productId);
                                            currentLoadBks += convertToBks(item.qty, item.unit, product);
                                        });
                                        let soldTodayBks = 0;
                                        agentSales.forEach(t => {
                                            (t.items || []).forEach(item => {
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

                            {/* CURRENT MOTORCYCLE INVENTORY (PER-ITEM BREAKDOWN) */}
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={14}/> Itemized Asset Ledger</h3>
                                
                                {(selectedAgent.activeCanvas || []).length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setViewingSuratJalan(true)} 
                                            className="text-[9px] bg-blue-600 text-white hover:bg-blue-500 px-3 py-1.5 rounded uppercase tracking-widest font-bold transition-colors shadow-lg flex items-center gap-1"
                                        >
                                            <Printer size={12}/> Surat Jalan
                                        </button>
                                        <button 
                                            onClick={handleClearCanvas} 
                                            className="text-[9px] bg-red-900/30 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded uppercase tracking-widest font-bold transition-colors"
                                        >
                                            Reconcile & Clear
                                        </button>
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
                                            
                                            {/* PER-ITEM MATH OVERVIEW */}
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

                            {/* NEW: TRANSACTION HISTORY ACCORDION */}
                            <div className="mt-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden animate-fade-in-up">
                                <button onClick={() => setShowHistory(!showHistory)} className="w-full p-4 flex justify-between items-center bg-black/20 hover:bg-black/40 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <FileText size={18} className="text-blue-500"/>
                                        <h3 className="font-bold text-white uppercase tracking-widest text-xs">Today's Sales History ({agentSales.length})</h3>
                                    </div>
                                    {showHistory ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
                                </button>
                                
                                {showHistory && (
                                    <div className="p-4 space-y-3 bg-black/10">
                                        {agentSales.length === 0 ? (
                                            <p className="text-center text-xs text-slate-500 uppercase tracking-widest py-4">No sales recorded today.</p>
                                        ) : (
                                            agentSales.map(tx => (
                                                <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-700 shadow-sm">
                                                    <div>
                                                        <h4 className="font-bold text-white text-sm uppercase">{tx.customerName}</h4>
                                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{tx.timestamp ? new Date(tx.timestamp.seconds * 1000).toLocaleTimeString() : 'Today'} • {tx.paymentType}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <p className="text-emerald-400 font-black text-sm md:text-base">{new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', minimumFractionDigits:0}).format(tx.total || tx.amountPaid || 0)}</p>
                                                            <p className="text-[9px] text-slate-500 uppercase tracking-widest">{tx.items?.length || 0} Items</p>
                                                        </div>
                                                        <button onClick={() => setViewingReceipt(tx)} className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-colors shadow-sm" title="View Receipt">
                                                            <FileText size={16}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
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