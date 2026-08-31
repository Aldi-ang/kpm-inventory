import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, ArrowRight, Printer, Calendar, User, Folder, Store, Wallet, Package, Pencil, Trash2, Camera, FileText, MessageSquare, Database, ChevronRight, RotateCw, MapPin, Globe, ChevronDown, ChevronUp, Clock, AlertTriangle } from 'lucide-react';
import { updateDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { commitInChunks } from '../utils/helpers';
/* An edit is the third path that can rot the sales rollup, and the least obvious of the
   three: a delete at least looks destructive, while changing a quantity looks like tidying. */
import { tallySaleOp } from '../utils/salesRollupWrite';
import { formatRupiah, convertToBks, getCurrentDate } from '../utils/helpers';
import { hasClearance } from '../config/permissions';
import { notify } from './Toast.jsx';
import { WATERMARK_STYLE, WATERMARK_POSITION, watermarkFrom } from '../config/receiptWatermark';

/* 🔴 `userId`, NOT `user.uid`. They are the same for the owner and different for every delegated
   account: `userId = bossUid || user.uid`, and the receipts live under the BOSS. Editing one here
   used to address the editor's own vault, where the document does not exist — and Firestore treats
   a write to a missing path as a fine thing to do, so the app reported a save that never happened
   and the tally moved in a document nothing reads. */
export default function HistoryReportView({ transactions, inventory, onDeleteFolder, onDeleteTransaction, isAdmin, user, userId, appId, db, appSettings, userRole, agentProfileId, fetchHistoricalTransactions, motorists, customers }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [reportView, setReportView] = useState(false);
    /* the mark printed in the corner of the A4 nota. Undefined when he has never set one, which
       is what keeps the nota unchanged for anyone who does not want a watermark. */
    const watermarkSrc = watermarkFrom(appSettings);
    
    // 🚀 TIME MACHINE & COMMAND CENTER STATE
    const [rangeType, setRangeType] = useState('daily');
    const [targetDate, setTargetDate] = useState(getCurrentDate());
    const [historicalData, setHistoricalData] = useState([]);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);

    // 🏢 6-TIER HIERARCHY NAVIGATION STATE
    const [selectedRegion, setSelectedRegion] = useState(null); 
    const [selectedAgent, setSelectedAgent] = useState(null);   
    const [selectedProv, setSelectedProv] = useState(null);     
    const [selectedKab, setSelectedKab] = useState(null);       
    const [selectedKec, setSelectedKec] = useState(null);       
    const [selectedCustomer, setSelectedCustomer] = useState(null); 

    // MODAL STATES
    const [editingTrans, setEditingTrans] = useState(null);
    const [viewingReceipt, setViewingReceipt] = useState(null); 
    const [viewingPhoto, setViewingPhoto] = useState(null); 
    const [printFormat, setPrintFormat] = useState('thermal'); 
    const [printScale, setPrintScale] = useState(100); 

    // ANALYTICS STATE
    const [expandedAgent, setExpandedAgent] = useState(null);

    // 🚀 INDESTRUCTIBLE SECURITY FIREWALL — 3-TIER REPORT VISIBILITY
    // Reads the "Reporting Authority" dropdown set in Settings > Global Permission Matrix.
    // If the engine has any doubt, the safest (most restrictive) level wins.
    const reportAccessLevel = useMemo(() => {
        if (userRole === 'ADMIN' || userRole === 'DEVELOPER' || userRole === 'COMPANY_OWNER') return 'global';
        if (hasClearance(userRole, 'view_reports_global')) return 'global';
        if (hasClearance(userRole, 'view_reports_regional')) return 'regional';
        if (hasClearance(userRole, 'view_reports_personal')) return 'personal';
        // 🛑 FAIL-CLOSED: nothing configured for this tier yet? Lock to the safest option.
        return 'personal';
    }, [userRole]);

    const isFieldAgent = reportAccessLevel === 'personal';
    const isRegionalOnly = reportAccessLevel === 'regional';

    // The current viewer's own branch/region — used to fence in 'regional' access
    const myLocation = useMemo(() => {
        const myProfile = motorists?.find(m => m.id === agentProfileId);
        return myProfile?.location || null;
    }, [motorists, agentProfileId]);

    // --- ENGINE 1: DATA MERGE & TIME FILTER ---
    const allTransactions = useMemo(() => {
        const combined = [...transactions, ...historicalData];
        return Array.from(new Map(combined.map(t => [t.id, t])).values());
    }, [transactions, historicalData]);

    const dateFilteredTransactions = useMemo(() => {
        const target = new Date(targetDate);
        return allTransactions.filter(t => {
            // 🛑 FAIL-CLOSED PROTOCOL: Total Data Shredder
            if (isFieldAgent) {
                if (!agentProfileId) return false; // Hide everything if profile hasn't loaded
                if (t.agentId !== agentProfileId) return false; // Shred other team members' data
            } else if (isRegionalOnly) {
                if (!myLocation) return false; // Hide everything if we don't know their branch yet
                const txAgentId = t.agentId || 'ADMIN';
                const txLocation = txAgentId === 'ADMIN' ? 'Headquarters' : (motorists?.find(m => m.id === txAgentId)?.location || null);
                if (txLocation !== myLocation) return false; // Shred other regions' data
            }
            
            const tDate = new Date(t.date);
            if (rangeType === 'daily') return t.date === targetDate;
            if (rangeType === 'weekly') {
                const start = new Date(target); start.setDate(target.getDate() - target.getDay()); start.setHours(0,0,0,0);
                const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
                return tDate >= start && tDate <= end;
            }
            if (rangeType === 'monthly') return tDate.getMonth() === target.getMonth() && tDate.getFullYear() === target.getFullYear();
            if (rangeType === 'yearly') return tDate.getFullYear() === target.getFullYear();
            return false;
        }).sort((a,b) => (b.timestamp?.seconds||0) - (a.timestamp?.seconds||0));
    }, [allTransactions, rangeType, targetDate, isFieldAgent, isRegionalOnly, myLocation, agentProfileId, motorists]);

    // --- ENGINE 2: GLOBAL SEARCH ---
    const searchedTransactions = useMemo(() => {
        if (!searchTerm.trim()) return dateFilteredTransactions;
        const term = searchTerm.toLowerCase();
        
        return dateFilteredTransactions.filter(t => {
            const customerMatch = (t.customerName || '').toLowerCase().includes(term);
            const agentMatch = (t.agentName || '').toLowerCase().includes(term);
            const valueMatch = String(t.total || t.amountPaid || 0).includes(term);
            let itemsMatch = false;
            if (t.items) itemsMatch = t.items.some(i => (i.name || '').toLowerCase().includes(term));
            return customerMatch || agentMatch || valueMatch || itemsMatch;
        });
    }, [dateFilteredTransactions, searchTerm]);

    // --- ENGINE 3: THE 6-TIER ENTERPRISE HIERARCHY BUILDER ---
    const reportData = useMemo(() => {
        const structure = {}; 
        
        if (motorists && motorists.length > 0) {
            motorists.forEach(m => {
                // 🛑 UI LOCK: Prevent UI folders from being built for anyone else
                if (isFieldAgent && m.id !== agentProfileId) return;
                if (isRegionalOnly && (m.location || 'UNASSIGNED AREA') !== myLocation) return;

                const loc = m.location || 'UNASSIGNED AREA';
                const aName = m.name || m.agentName || 'Unknown Agent';
                if (!structure[loc]) structure[loc] = { name: loc, total: 0, count: 0, agents: {} };
                if (!structure[loc].agents[aName]) structure[loc].agents[aName] = { name: aName, id: m.id, total: 0, count: 0, provinsi: {} };
            });
        }
        
        if (reportAccessLevel === 'global' && !structure['Headquarters']) {
            structure['Headquarters'] = { name: 'Headquarters', total: 0, count: 0, agents: {} };
        }

        searchedTransactions.forEach(t => {
            const agentId = t.agentId || 'ADMIN';
            let agentName = t.agentName || 'Admin';
            let regionName = 'UNASSIGNED AREA';

            if (agentId === 'ADMIN') {
                const boss = motorists?.find(m => m.role === 'COMPANY_OWNER' || m.id === 'master_owner' || m.id === 'ADMIN');
                if (boss && boss.location) {
                    regionName = boss.location;
                    agentName = boss.name || agentName;
                } else {
                    regionName = 'Headquarters';
                }
            } else if (motorists && motorists.length > 0) {
                const motorist = motorists.find(m => m.id === agentId);
                if (motorist) {
                    regionName = motorist.location || 'UNASSIGNED AREA';
                    agentName = motorist.name || motorist.agentName || agentName;
                }
            }

            let cust = (t.customerName || 'Walk-in Customer').trim();
            const isWalkIn = cust.toLowerCase().includes('walk-in') || !t.customerName;
            const isEcer = t.items?.some(i => i.priceTier === 'Ecer');
            if (isWalkIn || isEcer) cust = "Individuals (Ecer)";

            let prov = 'UNMAPPED PROVINSI';
            let kab = 'UNMAPPED KABUPATEN';
            let kec = 'UNMAPPED KECAMATAN';

            if (customers && customers.length > 0 && !isWalkIn && !isEcer) {
                const matchedCustomer = customers.find(c => c.name.trim().toLowerCase() === cust.toLowerCase());
                if (matchedCustomer) {
                    if (matchedCustomer.province && !matchedCustomer.province.toLowerCase().includes('unknown')) prov = matchedCustomer.province;
                    if (matchedCustomer.region && !matchedCustomer.region.toLowerCase().includes('unknown')) kab = matchedCustomer.region;
                    if (matchedCustomer.city && !matchedCustomer.city.toLowerCase().includes('unknown')) kec = matchedCustomer.city;
                }
            }

            if (!structure[regionName]) structure[regionName] = { name: regionName, total: 0, count: 0, agents: {} };
            if (!structure[regionName].agents[agentName]) structure[regionName].agents[agentName] = { name: agentName, total: 0, count: 0, provinsi: {} };
            
            const agentNode = structure[regionName].agents[agentName];
            if (!agentNode.provinsi[prov]) agentNode.provinsi[prov] = { name: prov, total: 0, count: 0, kabupaten: {} };
            
            const provNode = agentNode.provinsi[prov];
            if (!provNode.kabupaten[kab]) provNode.kabupaten[kab] = { name: kab, total: 0, count: 0, kecamatan: {} };
            
            const kabNode = provNode.kabupaten[kab];
            if (!kabNode.kecamatan[kec]) kabNode.kecamatan[kec] = { name: kec, total: 0, count: 0, stores: {} };
            
            const kecNode = kabNode.kecamatan[kec];
            if (!kecNode.stores[cust]) kecNode.stores[cust] = { name: cust, total: 0, count: 0, history: [] };

            const storeNode = kecNode.stores[cust];

            const tValue = t.type === 'RETUR' ? -Math.abs(t.total || t.amountPaid || 0) : (t.total || t.amountPaid || 0);
            
            structure[regionName].total += tValue;
            structure[regionName].count += 1;

            agentNode.total += tValue;
            agentNode.count += 1;

            provNode.total += tValue;
            provNode.count += 1;

            kabNode.total += tValue;
            kabNode.count += 1;

            kecNode.total += tValue;
            kecNode.count += 1;

            storeNode.total += tValue;
            storeNode.count += 1;
            storeNode.history.push(t);
        });
        
        return structure;
    }, [searchedTransactions, motorists, customers, isFieldAgent, isRegionalOnly, myLocation, reportAccessLevel, agentProfileId]);

    // AUTO-NAVIGATE FOR RESTRICTED AGENTS
    useEffect(() => {
        if (isFieldAgent) {
            const regions = Object.keys(reportData);
            if (regions.length === 1 && !selectedRegion) {
                setSelectedRegion(regions[0]);
                const agents = Object.keys(reportData[regions[0]].agents);
                if (agents.length === 1 && !selectedAgent) setSelectedAgent(agents[0]);
            }
        } else if (isRegionalOnly) {
            // Regional Command: lock into their own region, but they can still browse every agent inside it
            const regions = Object.keys(reportData);
            if (regions.length === 1 && !selectedRegion) {
                setSelectedRegion(regions[0]);
            }
        }
    }, [isFieldAgent, isRegionalOnly, reportData, selectedRegion, selectedAgent]);

    const handlePullArchive = async () => {
        if (!fetchHistoricalTransactions) return;
        setIsFetchingHistory(true);
        const target = new Date(targetDate);
        let start = new Date(target); let end = new Date(target);
        if (rangeType === 'daily') { start.setHours(0,0,0,0); end.setHours(23,59,59,999); }
        else if (rangeType === 'weekly') { start.setDate(target.getDate() - target.getDay()); start.setHours(0,0,0,0); end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999); }
        else if (rangeType === 'monthly') { start = new Date(target.getFullYear(), target.getMonth(), 1); end = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59); }
        else if (rangeType === 'yearly') { start = new Date(target.getFullYear(), 0, 1); end = new Date(target.getFullYear(), 11, 31, 23, 59, 59); }
        
        const data = await fetchHistoricalTransactions(start, end);
        setHistoricalData(data);
        setIsFetchingHistory(false);
    };

    const contextualTransactions = useMemo(() => {
        if (selectedAgent && selectedRegion) return searchedTransactions.filter(t => (t.agentName || 'Admin') === selectedAgent);
        if (selectedRegion) return searchedTransactions.filter(t => {
            const agentId = t.agentId || 'ADMIN';
            if (agentId === 'ADMIN') return selectedRegion === 'Headquarters';
            return motorists?.find(m => m.id === agentId)?.location === selectedRegion;
        });
        return searchedTransactions; 
    }, [searchedTransactions, selectedRegion, selectedAgent, motorists]);

    const stats = useMemo(() => {
        const totalRev = contextualTransactions.reduce((sum, t) => t.type === 'RETUR' ? sum - Math.abs(t.total || 0) : sum + (t.total || t.amountPaid || 0), 0);
        const totalProfit = contextualTransactions.reduce((sum, t) => sum + (t.totalProfit || 0), 0);
        const count = contextualTransactions.length;
        const items = {};
        const payments = { Cash: 0, QRIS: 0, Transfer: 0, Titip: 0 };
        const agents = {}; 

        contextualTransactions.forEach(t => {
            const method = t.paymentType || 'Cash';
            const value = t.total || t.amountPaid || 0;
            if (t.type === 'RETUR') payments['Cash'] -= Math.abs(value);
            else payments[method] = (payments[method] || 0) + value;

            const aName = t.agentName || 'Admin';
            if (!agents[aName]) agents[aName] = { name: aName, agentId: t.agentId, total: 0, count: 0, items: {}, transactions: [] };
            
            agents[aName].total += t.type === 'RETUR' ? -Math.abs(value) : value;
            agents[aName].count += 1;
            agents[aName].transactions.push(t);

            if(t.items) t.items.forEach(i => {
                const product = inventory.find(p => p.id === i.productId);
                const bksQty = convertToBks(i.qty, i.unit, product || {});
                
                if(!items[i.name]) items[i.name] = { qty: 0, val: 0 };
                items[i.name].qty += bksQty;
                items[i.name].val += (i.calculatedPrice * i.qty);

                if(!agents[aName].items[i.name]) agents[aName].items[i.name] = { qty: 0, val: 0 };
                agents[aName].items[i.name].qty += bksQty;
                agents[aName].items[i.name].val += (i.calculatedPrice * i.qty);
            });
        });

        Object.values(agents).forEach(a => a.transactions.sort((x, y) => (y.timestamp?.seconds||0) - (x.timestamp?.seconds||0)));

        return { 
            totalRev, totalProfit, count, items, payments, 
            agentRoster: Object.values(agents).sort((a,b) => b.total - a.total) 
        };
    }, [contextualTransactions, inventory]);

    const getProductPrice = (product, tier, fallbackPrice) => {
        if (!product) return Number(fallbackPrice) || 0;
        const tierKey = String(tier).toLowerCase();
        for (let key of Object.keys(product)) {
            if (key.toLowerCase().includes(tierKey)) {
                const val = Number(String(product[key] || '').replace(/[^0-9]/g, ''));
                if (val > 0) return val;
            }
        }
        const generic = Number(String(product.price || product.harga || product.retailPrice || '').replace(/[^0-9]/g, ''));
        if (generic > 0) return generic;
        return Number(fallbackPrice) || 0;
    };

    const handleEditItemChange = (index, field, value) => {
        const newItems = [...(editingTrans.items || [])];
        const currentItem = newItems[index];
        newItems[index] = { ...currentItem, [field]: value };

        if (field === 'productId' || field === 'unit' || field === 'qty') {
            const product = inventory.find(p => p.id === newItems[index].productId);
            const tier = editingTrans.priceTier || 'Retail';
            const currentMultiplier = convertToBks(1, currentItem.unit, product);
            const fallbackPackPrice = (Number(currentItem.calculatedPrice) || 0) / currentMultiplier;
            const basePrice = getProductPrice(product, tier, fallbackPackPrice);
            const multiplier = convertToBks(1, newItems[index].unit, product);
            newItems[index].calculatedPrice = basePrice * multiplier;
        }

        const newTotal = newItems.reduce((sum, item) => sum + ((Number(item.calculatedPrice) || 0) * (Number(item.qty) || 0)), 0);
        setEditingTrans({ ...editingTrans, items: newItems, total: newTotal, amountPaid: newTotal });
    };

    const handleEditTierChange = (e) => {
        const newTier = e.target.value;
        const newItems = (editingTrans.items || []).map(item => {
            const product = inventory.find(p => p.id === item.productId);
            const currentMultiplier = convertToBks(1, item.unit, product);
            const fallbackPackPrice = (Number(item.calculatedPrice) || 0) / currentMultiplier;
            const basePrice = getProductPrice(product, newTier, fallbackPackPrice);
            const multiplier = convertToBks(1, item.unit, product);
            return { ...item, calculatedPrice: basePrice * multiplier };
        });
        const newTotal = newItems.reduce((sum, item) => sum + ((Number(item.calculatedPrice) || 0) * (Number(item.qty) || 0)), 0);
        setEditingTrans({ ...editingTrans, priceTier: newTier, items: newItems, total: newTotal, amountPaid: newTotal });
    };

    const handleEditSubmit = async () => {
        if(!editingTrans || !user) return;
        try {
            const rawDate = editingTrans.date; 
            let fakeTimestamp = serverTimestamp(); 
            if (rawDate) {
                const dateObj = new Date(`${rawDate}T12:00:00Z`);
                if (!isNaN(dateObj.getTime())) fakeTimestamp = { seconds: Math.floor(dateObj.getTime() / 1000), nanoseconds: 0 };
            }
            const cleanItems = (editingTrans.items || []).map(i => ({ productId: i.productId || '', name: i.name || 'Unknown', qty: Number(i.qty) || 1, unit: i.unit || 'Bks', calculatedPrice: Number(i.calculatedPrice) || 0 }));

            /* THE EDIT, AND ITS TWO HALVES OF THE ROLLUP.

               An edited sale is not "a sale that changed". To a running total it is one sale
               removed and a different one added. Applying only the +1 double-counts the packs
               that were already counted; applying neither leaves the totals describing a
               receipt that no longer exists.

               `__before` is the record exactly as it stood when the editor opened, stashed at
               that moment rather than looked up now: `transactions` holds seven days, so a
               historical record pulled through the Time Machine would not be found here.

               All three writes go in ONE commit. An edit whose +1 landed while its -1 failed
               is the worst of the outcomes, and it is what a bare updateDoc followed by two
               separate writes produces on a bad connection. */
            const productsById = Object.fromEntries((inventory || []).map(pr => [pr.id, pr]));
            const after = { date: rawDate, type: editingTrans.type || 'SALE', items: cleanItems };
            await commitInChunks(db, writeBatch, [
                { type: 'update',
                  ref: doc(db, `artifacts/${appId}/users/${userId}/transactions`, editingTrans.id),
                  data: { date: rawDate, customerName: editingTrans.customerName, total: Number(editingTrans.total) || 0, amountPaid: Number(editingTrans.total) || 0, priceTier: editingTrans.priceTier || 'Retail', items: cleanItems, timestamp: fakeTimestamp, updatedAt: serverTimestamp() } },
                tallySaleOp(db, appId, userId, editingTrans.__before, productsById, -1),
                tallySaleOp(db, appId, userId, after, productsById, 1),
            ].filter(Boolean));
            notify("✅ Audit Successful!");
            setEditingTrans(null);
        } catch(err) { notify(err.message); }
    };

    return (
        <div className="print-reset animate-fade-in max-w-6xl mx-auto pb-20 relative">
            
            {/* 🚀 THE GLOBAL COMMAND CENTER 🚀 */}
            {!reportView && (
                <div className="bg-[var(--panel)] rounded-2xl p-6 mb-8 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in relative overflow-hidden border border-[var(--line)]">
                    {/* the ambient glow blob is GONE, 2026-08-25. It was a blue haze softening a navy
                        panel; against the faceplate it rendered as a black cloud bleeding out of the
                        corner, which is what Aldi saw. And it was a Lite Mode trap besides: Lite strips
                        the blur, so a cheap phone would have drawn a hard 256px near-black disc. This
                        theme does not do ambient light - the material is flat and the edges do the work. */}
                    <div className="z-10 flex-1 w-full">
                        <h2 className="text-[var(--ink)] text-lg font-black tracking-widest uppercase mb-1 flex items-center gap-2">
                            <Database size={20} className="text-[var(--ink-muted)]"/> Operational Command
                        </h2>
                        <p className="text-[var(--ink-muted)] text-[10px] font-mono uppercase tracking-widest">Filter dates & extract deep historical records</p>
                    </div>
                    <div className="z-10 flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
                        <select value={rangeType} onChange={e=>setRangeType(e.target.value)} className="bg-[var(--raised)] border border-[var(--line)] text-[var(--ink)] p-3 rounded-xl font-bold uppercase text-[10px] tracking-widest outline-none">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                        <input type="date" value={targetDate} onChange={e=>setTargetDate(e.target.value)} className="bg-[var(--raised)] border border-[var(--line)] text-[var(--ink)] p-3 rounded-xl font-bold outline-none" />
                        {!isFieldAgent && (
                            <button onClick={handlePullArchive} disabled={isFetchingHistory} className="bg-[var(--gold)] hover:bg-[var(--gold)] text-[var(--gold-ink)] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 shadow-[0_0_15px_rgba(217,119,6,0.4)] disabled:opacity-50 active:scale-95">
                                {isFetchingHistory ? <RotateCw className="animate-spin" size={16}/> : <Database size={16}/>}
                                {isFetchingHistory ? 'Extracting...' : 'Pull Archive'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* BREADCRUMB NAVIGATION */}
            {!reportView && (
                <div className="flex flex-wrap gap-2 items-center mb-6 text-xs font-black uppercase tracking-widest text-[var(--ink-muted)] bg-[var(--raised)] dark:bg-[var(--raised)] p-3 rounded-xl border dark:border-[var(--line)] shadow-sm">
                    {reportAccessLevel === 'global' && (
                        <span onClick={()=> {setSelectedRegion(null); setSelectedAgent(null); setSelectedProv(null); setSelectedKab(null); setSelectedKec(null); setSelectedCustomer(null);}} className="cursor-pointer hover:text-[var(--accent-ink)] flex items-center gap-1"><Globe size={14}/> Master HQ</span>
                    )}
                    
                    {/* 🚀 UI LOCK: Field Agents cannot navigate UP to team folders */}
                    {selectedRegion && <> {!isFieldAgent && <ChevronRight size={14}/>} <span onClick={()=> { if(!isFieldAgent) {setSelectedAgent(null); setSelectedProv(null); setSelectedKab(null); setSelectedKec(null); setSelectedCustomer(null);} }} className={`flex items-center gap-1 ${!isFieldAgent ? 'cursor-pointer hover:text-[var(--accent-ink)] text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}><MapPin size={14}/> {selectedRegion}</span> </>}
                    {selectedAgent && <> <ChevronRight size={14}/> <span onClick={()=> { if(!isFieldAgent) {setSelectedProv(null); setSelectedKab(null); setSelectedKec(null); setSelectedCustomer(null);} }} className={`flex items-center gap-1 ${!isFieldAgent ? 'cursor-pointer hover:text-[var(--accent-ink)] text-[var(--verified)]' : 'text-[var(--ink-muted)]'}`}><User size={14}/> {selectedAgent}</span> </>}
                    
                    {selectedProv && <> <ChevronRight size={14}/> <span onClick={()=> {setSelectedKab(null); setSelectedKec(null); setSelectedCustomer(null);}} className="cursor-pointer hover:text-[var(--accent-ink)] text-[var(--alt-ink)] flex items-center gap-1">{selectedProv}</span> </>}
                    {selectedKab && <> <ChevronRight size={14}/> <span onClick={()=> {setSelectedKec(null); setSelectedCustomer(null);}} className="cursor-pointer hover:text-[var(--accent-ink)] text-pink-500 flex items-center gap-1">{selectedKab}</span> </>}
                    {selectedKec && <> <ChevronRight size={14}/> <span onClick={()=> setSelectedCustomer(null)} className="cursor-pointer hover:text-[var(--accent-ink)] text-[var(--danger-text)] flex items-center gap-1">{selectedKec}</span> </>}
                    {selectedCustomer && <> <ChevronRight size={14}/> <span className="text-[var(--ink)] dark:text-[var(--ink)] flex items-center gap-1"><Store size={14}/> {selectedCustomer}</span> </>}
                </div>
            )}

            {/* ACTION BAR (Search & Analytics Trigger) */}
            {!reportView && (
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative w-full shadow-sm rounded-xl group transition-shadow hover:shadow-md focus-within:shadow-md">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search size={20} className={`transition-colors ${searchTerm ? 'text-[var(--accent-ink)]' : 'text-[var(--ink-muted)] group-focus-within:text-[var(--accent-ink)]'}`} />
                        </div>
                        <input type="text" placeholder="Search product, value, or store..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-12 py-3.5 bg-[var(--raised)] dark:bg-[var(--raised)] border border-[var(--line-2)] dark:border-[var(--line)] focus:border-[var(--accent-edge)] rounded-xl text-[var(--ink)] dark:text-[var(--ink)] font-medium text-sm outline-none transition-all"/>
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--ink-muted)] hover:text-[var(--danger-text)] transition-colors"><X size={20} /></button>}
                    </div>
                    
                    <button onClick={() => setReportView(true)} className="bg-[var(--gold)] hover:bg-[var(--gold)] border border-[var(--accent-edge)] px-6 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 font-bold text-[var(--gold-ink)] transition-all whitespace-nowrap active:scale-95 text-xs uppercase tracking-widest">
                        <Calendar size={16}/> Context Analytics
                    </button>
                </div>
            )}

            {/* --- 🚀 THE NEW MACRO-TO-MICRO ANALYTICS DASHBOARD --- */}
            {reportView && (
                <div className="animate-fade-in relative z-10">
                     <div className="print:hidden mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <button onClick={() => setReportView(false)} className="flex items-center gap-2 text-[var(--ink-muted)] hover:text-[var(--accent-ink)] transition-colors font-bold uppercase tracking-widest text-xs"><ArrowRight className="rotate-180" size={16}/> Back to Folders</button>
                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex items-center gap-2 bg-[var(--raised)] dark:bg-[var(--raised)] px-3 py-2 rounded-xl border dark:border-[var(--line)] shadow-sm print:hidden">
                                <span className="text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-widest">Scale</span>
                                <input type="range" min="50" max="150" step="5" value={printScale} onChange={(e) => setPrintScale(Number(e.target.value))} className="w-20 accent-orange-500 cursor-pointer" />
                                <span className="text-[10px] font-mono text-[var(--ink-muted)] w-8 text-right">{printScale}%</span>
                            </div>
                            <button onClick={() => window.print()} className="bg-[var(--raised)] hover:bg-[var(--panel)] text-[var(--ink)] px-6 py-2.5 rounded-xl shadow-sm text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Printer size={16}/> Print PDF</button>
                        </div>
                     </div>

                     <style>{` @media print { .print-container { zoom: ${printScale / 100} !important; -moz-transform: scale(${printScale / 100}); -moz-transform-origin: top left; } } `}</style>

                     <div className="print-container bg-[var(--raised)] dark:bg-[var(--raised)] dark:print:bg-[var(--raised)] p-8 rounded-2xl shadow-xl border dark:border-[var(--line)] print:shadow-none print:border-none print:p-0">
                         {/* MACRO VIEW: GLOBAL STATS */}
                         <div className="flex justify-between items-end mb-8 print:mb-4 border-b-2 border-[var(--accent-edge)] pb-4 print:pb-2">
                             <div>
                                 <h1 className="text-3xl print:text-xl font-bold text-[var(--ink)] dark:text-[var(--ink)] dark:print:text-[var(--ink)] uppercase tracking-tight">
                                     {isFieldAgent ? 'My Performance' : selectedAgent ? `${selectedAgent}'s Performance` : selectedRegion ? `${selectedRegion} Operations` : 'Global Master Analytics'}
                                 </h1>
                                 <p className="text-[var(--ink-muted)] dark:print:text-[var(--ink-muted)] font-mono text-sm print:text-[10px] mt-1 uppercase">{rangeType} Recap • {new Date(targetDate).toLocaleDateString()}</p>
                             </div>
                             <div className="text-right"><p className="text-xs print:text-[10px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Context Revenue</p><h2 className="text-4xl print:text-2xl font-bold text-[var(--verified)] dark:print:text-[var(--verified)]">{formatRupiah(stats.totalRev)}</h2></div>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-4 md:gap-6 print:gap-2 mb-8 print:mb-4">
                             <div className="p-4 print:p-2 bg-[var(--raised)] dark:bg-[var(--panel)] dark:print:bg-[var(--raised)] rounded-xl border dark:border-[var(--line)] print:border-[var(--line-2)]"><p className="text-xs print:text-[11px] uppercase text-[var(--ink-muted)] font-bold mb-1 print:mb-0">Transactions</p><p className="text-2xl print:text-base font-bold text-[var(--ink)] dark:text-[var(--ink)] dark:print:text-[var(--ink)]">{stats.count}</p></div>
                             <div className="p-4 print:p-2 bg-[var(--raised)] dark:bg-[var(--panel)] dark:print:bg-[var(--raised)] rounded-xl border dark:border-[var(--line)] print:border-[var(--line-2)]"><p className="text-xs print:text-[11px] uppercase text-[var(--ink-muted)] font-bold mb-1 print:mb-0">Items Moved (Bks)</p><p className="text-2xl print:text-base font-bold text-[var(--ink)]">{Object.values(stats.items).reduce((a,b)=>a+b.qty,0)}</p></div>
                             <div className="p-4 print:p-2 bg-[var(--raised)] dark:bg-[var(--panel)] dark:print:bg-[var(--raised)] rounded-xl border dark:border-[var(--line)] print:border-[var(--line-2)]"><p className="text-xs print:text-[11px] uppercase text-[var(--ink-muted)] font-bold mb-1 print:mb-0">Net Profit (Cuan)</p><p className="text-2xl print:text-base font-bold text-[var(--verified)]">{formatRupiah(stats.totalProfit)}</p></div>
                         </div>

                         <div className="mb-8 print:mb-0">
                             <h3 className="font-bold text-lg print:text-sm mb-4 print:mb-2 text-[var(--ink)] dark:text-[var(--ink)] dark:print:text-[var(--ink)] flex items-center gap-2"><Package size={20} className="print:w-4 print:h-4 text-[var(--accent-ink)]"/> Product Performance</h3>
                             <div className="overflow-x-auto pb-2">
                                 <table className="w-full text-sm print:text-[10px] text-left border-collapse min-w-[450px]">
                                    <thead className="text-[var(--ink-muted)] border-b-2 border-[var(--line-2)] dark:border-[var(--line)] dark:print:border-[var(--line-2)]">
                                        <tr><th className="py-2 print:py-1 w-1/2">Product Name</th><th className="py-2 print:py-1 text-right pr-6 w-1/4">Qty (Bks)</th><th className="py-2 print:py-1 text-right w-1/4">Revenue</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--line)] dark:divide-[var(--line)] dark:print:divide-[var(--line)]">
                                        {Object.entries(stats.items).sort((a,b) => b[1].val - a[1].val).map(([name, data]) => (
                                            <tr key={name} className="hover:bg-[var(--raised)] dark:hover:bg-[var(--raised)] transition-colors">
                                                <td className="py-3 print:py-1.5 font-bold text-[var(--ink)] dark:text-[var(--ink)] dark:print:text-[var(--ink)] uppercase text-xs">{name}</td>
                                                <td className="py-3 print:py-1.5 text-right pr-6 text-[var(--ink-muted)] dark:text-[var(--ink-muted)] dark:print:text-[var(--ink)] font-mono">{data.qty}</td>
                                                <td className="py-3 print:py-1.5 text-right font-bold text-[var(--verified)]">{formatRupiah(data.val)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                 </table>
                             </div>
                         </div>

                         {/* MICRO VIEW: AGENT PERFORMANCE ROSTER */}
                         <div className="mt-12 pt-8 border-t border-[var(--line-2)] dark:border-[var(--line)]">
                             <h3 className="font-black text-xl mb-6 text-[var(--ink)] dark:text-[var(--ink)] flex items-center gap-2 uppercase tracking-widest">
                                 <User size={24} className="text-[var(--ink)]"/> {isFieldAgent ? 'My Detailed Breakdown' : 'Agent Roster'}
                             </h3>
                             <div className="space-y-4">
                                 {stats.agentRoster.map(agent => {
                                     const isExpanded = isFieldAgent || expandedAgent === agent.name;
                                     const agentProfile = motorists?.find(m => m.id === agent.agentId) || {};
                                     
                                     return (
                                         <div key={agent.name} className={`border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-[var(--accent-edge)] shadow-lg dark:bg-[var(--raised)]' : 'border-[var(--line-2)] dark:border-[var(--line)] bg-[var(--raised)] dark:bg-[var(--raised)] hover:border-[var(--line-2)]'}`}>
                                             {/* Accordion Header */}
                                             <button 
                                                onClick={() => setExpandedAgent(isExpanded ? null : agent.name)}
                                                className={`w-full p-4 flex items-center justify-between text-left focus:outline-none ${isFieldAgent ? 'cursor-default pointer-events-none' : ''}`}
                                             >
                                                 <div className="flex items-center gap-4">
                                                     {agentProfile.photoURL ? (
                                                         <img src={agentProfile.photoURL} className="w-12 h-12 rounded-full object-cover border-2 border-[var(--line-2)] dark:border-[var(--line)] shrink-0" alt={agent.name} />
                                                     ) : (
                                                         <div className="w-12 h-12 rounded-full bg-[var(--raised)] dark:bg-[var(--raised)] flex items-center justify-center shrink-0">
                                                             <User size={24} className="text-[var(--ink)]" />
                                                         </div>
                                                     )}
                                                     <div>
                                                         <h4 className="font-bold text-lg dark:text-[var(--ink)] leading-none mb-1">{agent.name}</h4>
                                                         <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest">{agent.count} Receipts</p>
                                                     </div>
                                                 </div>
                                                 <div className="flex items-center gap-6">
                                                     <div className="text-right">
                                                         <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest font-bold mb-0.5">Agent Total</p>
                                                         <p className={`font-black text-lg ${agent.total < 0 ? 'text-[var(--danger-text)]' : 'text-[var(--verified)]'}`}>{formatRupiah(agent.total)}</p>
                                                     </div>
                                                     {!isFieldAgent && (
                                                        <div className="p-2 bg-[var(--raised)] dark:bg-[var(--panel)] rounded-full text-[var(--ink-muted)]">
                                                            {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                                        </div>
                                                     )}
                                                 </div>
                                             </button>

                                             {/* Accordion Body (Deep Dive) */}
                                             {isExpanded && (
                                                 <div className="p-6 bg-[var(--raised)] dark:bg-[var(--panel)] border-t border-[var(--line-2)] dark:border-[var(--line)] animate-fade-in">
                                                     
                                                     {/* Agent's Product Breakdown */}
                                                     <div className="mb-8">
                                                         <h5 className="font-bold text-sm text-[var(--ink-muted)] dark:text-[var(--ink-muted)] uppercase tracking-widest mb-3 flex items-center gap-2"><Package size={16}/> Items Sold by {agent.name}</h5>
                                                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                             {Object.entries(agent.items).sort((a,b) => b[1].val - a[1].val).map(([pName, pData]) => (
                                                                 <div key={pName} className="bg-[var(--raised)] dark:bg-[var(--raised)] p-3 rounded-lg border dark:border-[var(--line)] flex justify-between items-center shadow-sm">
                                                                     <div>
                                                                         <p className="text-xs font-bold dark:text-[var(--ink)] uppercase mb-0.5 truncate max-w-[120px]">{pName}</p>
                                                                         <p className="text-[10px] text-[var(--ink-muted)] font-mono">{pData.qty} Bks</p>
                                                                     </div>
                                                                     <p className="text-sm font-black text-[var(--verified)]">{formatRupiah(pData.val)}</p>
                                                                 </div>
                                                             ))}
                                                         </div>
                                                     </div>

                                                     {/* Agent's Transaction Timeline */}
                                                     <div>
                                                         <h5 className="font-bold text-sm text-[var(--ink-muted)] dark:text-[var(--ink-muted)] uppercase tracking-widest mb-3 flex items-center gap-2"><Clock size={16}/> Chronological Ledger</h5>
                                                         <div className="space-y-2">
                                                             {agent.transactions.map(t => {
                                                                 // 🚀 FORENSIC BADGES
                                                                 const isRetur = t.type === 'RETUR' || t.paymentType === 'Retur/BS';
                                                                 const isExchange = t.paymentType === 'Tukar Ganti';
                                                                 const isIouFulfill = t.paymentType === 'IOU Fulfillment';

                                                                 return (
                                                                 <div key={t.id} className="bg-[var(--raised)] dark:bg-[var(--raised)] p-4 rounded-xl border dark:border-[var(--line)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                                                                     <div className="flex items-center gap-4 w-full md:w-auto">
                                                                         <div className="bg-[var(--raised)] dark:bg-[var(--raised)] px-3 py-2 rounded-lg text-center shrink-0">
                                                                             <p className="text-[10px] text-[var(--ink-muted)] font-bold uppercase">{t.date.split('-').reverse().join('/')}</p>
                                                                             <p className="text-xs font-mono font-black dark:text-[var(--ink)]">{t.timestamp ? new Date(t.timestamp.seconds*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '--:--'}</p>
                                                                         </div>
                                                                         <div className="min-w-0">
                                                                             <div className="flex items-center gap-2 mb-0.5">
                                                                                <p className="font-bold text-sm dark:text-[var(--ink)] truncate uppercase">{t.customerName}</p>
                                                                                {isRetur ? (
                                                                                    <span className="text-[11px] font-black px-1 py-0.5 rounded uppercase tracking-widest bg-[var(--danger-well)] text-[var(--danger-text)] border border-[var(--danger)]">RETUR</span>
                                                                                ) : isExchange ? (
                                                                                    <span className="text-[11px] font-black px-1 py-0.5 rounded uppercase tracking-widest bg-[var(--raised)] text-[var(--ink)] border border-[var(--accent-edge)]">EXCHANGE</span>
                                                                                ) : isIouFulfill ? (
                                                                                    <span className="text-[11px] font-black px-1 py-0.5 rounded uppercase tracking-widest bg-[var(--verified-fill)] text-[var(--verified)] border border-[var(--line-2)]">UTANG BARANG LUNAS</span>
                                                                                ) : null}
                                                                             </div>
                                                                             <p className="text-[10px] text-[var(--ink-muted)] uppercase mt-0.5 truncate">
                                                                                 {t.type === 'CONSIGNMENT_PAYMENT' ? 'STORE AUDIT' : t.items ? t.items.map(i => {
                                                                                     let lbl = `${i.qty} ${i.unit} ${i.name}`;
                                                                                     if (i.condition === 'DAMAGED') lbl += ' [DMG]';
                                                                                     if (i.fulfillment === 'IOU') lbl += ' [UTANG BARANG]';
                                                                                     if (i.isIouFulfillment) lbl += ' [FULFILLED]';
                                                                                     return lbl;
                                                                                 }).join(", ") : 'N/A'}
                                                                             </p>
                                                                         </div>
                                                                     </div>
                                                                     <div className="text-right shrink-0 w-full md:w-auto flex justify-between md:block items-center">
                                                                         <span className={`text-[11px] px-2 py-1 rounded font-bold uppercase tracking-widest ${t.paymentType === 'Titip' ? 'bg-[var(--raised)] text-[var(--accent-ink)]' : 'bg-[var(--raised)] text-[var(--ink-muted)]'}`}>{t.paymentType || 'Cash'}</span>
                                                                         <p className={`font-black text-base mt-1 ${isRetur && (t.amountPaid || t.total) > 0 ? 'text-[var(--danger-text)]' : 'text-[var(--verified)]'}`}>
                                                                            {isRetur && (t.amountPaid || t.total) > 0 ? '-' : ''}{formatRupiah(t.amountPaid || t.total)}
                                                                         </p>
                                                                     </div>
                                                                 </div>
                                                             )})}
                                                         </div>
                                                     </div>

                                                 </div>
                                             )}
                                         </div>
                                     );
                                 })}
                                 {stats.agentRoster.length === 0 && <p className="text-center text-[var(--ink-muted)] py-6 font-bold uppercase tracking-widest">No agent activity logged.</p>}
                             </div>
                         </div>

                     </div>
                </div>
            )}

            <div className="hide-on-print w-full">

            {/* --- LEVEL 1: REGION SELECTION (TEAM) --- */}
            {!reportView && reportAccessLevel === 'global' && !selectedRegion && (
                <div className="animate-fade-in relative z-10">
                    {Object.keys(reportData).length === 0 ? (
                        <div className="text-center py-20 opacity-50"><MapPin size={48} className="mx-auto mb-4 text-[var(--ink)]"/><p className="text-lg font-bold tracking-widest uppercase text-[var(--ink-muted)]">No Regions Active</p></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.values(reportData).sort((a,b) => b.total - a.total).map(r => (
                                <div key={r.name} onClick={() => setSelectedRegion(r.name)} className="bg-gradient-to-br from-[var(--panel)] to-white dark:from-[var(--panel)] dark:to-[var(--raised)] p-6 rounded-2xl border dark:border-[var(--line)] shadow-sm cursor-pointer hover:shadow-lg hover:border-[var(--accent-edge)] transition-all group">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="p-4 bg-[var(--raised)] dark:bg-[var(--raised)] rounded-xl text-[var(--ink)] group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-ink)] transition-colors shadow-sm"><MapPin size={28} /></div>
                                    </div>
                                    <h3 className="font-black text-xl dark:text-[var(--ink)] mb-2 tracking-wide">{r.name}</h3>
                                    <div className="flex justify-between items-end border-t border-[var(--line-2)] dark:border-[var(--line)] pt-4 mt-4">
                                        <div><p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Regional Gross</p><p className="font-black text-[var(--ink)] text-xl">{formatRupiah(r.total)}</p></div>
                                        <div className="text-right"><p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Sales</p><p className="font-black dark:text-[var(--ink)] text-xl">{r.count}</p></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- LEVEL 2: AGENT SELECTION --- */}
            {!reportView && selectedRegion && !selectedAgent && (
                <div className="animate-fade-in relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.values(reportData[selectedRegion]?.agents || {}).sort((a,b) => b.total - a.total).map(a => (
                            <div key={a.name} onClick={() => setSelectedAgent(a.name)} className="bg-[var(--raised)] dark:bg-[var(--raised)] p-6 rounded-2xl border dark:border-[var(--line)] shadow-sm cursor-pointer hover:shadow-md hover:border-[var(--line-2)] transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-[var(--verified-fill)] dark:bg-[var(--raised)] rounded-xl text-[var(--verified)] group-hover:bg-[var(--verified-fill)]0 group-hover:text-[var(--ink)] transition-colors"><User size={24} /></div>
                                </div>
                                <h3 className="font-bold text-lg dark:text-[var(--ink)] mb-4 truncate">{a.name}</h3>
                                <div className="flex justify-between items-end border-t border-[var(--line-2)] dark:border-[var(--line)] pt-3">
                                    <div><p className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Agent Gross</p><p className="font-black text-[var(--verified)] text-lg">{formatRupiah(a.total)}</p></div>
                                    <div className="text-right"><p className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Stops</p><p className="font-black dark:text-[var(--ink)] text-lg">{a.count}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- LEVEL 3: PROVINSI SELECTION --- */}
            {!reportView && selectedRegion && selectedAgent && !selectedProv && (
                <div className="animate-fade-in relative z-10">
                    {Object.keys(reportData[selectedRegion]?.agents[selectedAgent]?.provinsi || {}).length === 0 ? (
                         <div className="text-center py-20 opacity-50"><Folder size={48} className="mx-auto mb-4 text-[var(--alt-ink)]"/><p className="text-lg font-bold tracking-widest uppercase text-[var(--ink-muted)]">No Provinces Visited</p></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.values(reportData[selectedRegion]?.agents[selectedAgent]?.provinsi || {}).sort((a,b) => b.total - a.total).map(p => (
                                <div key={p.name} onClick={() => setSelectedProv(p.name)} className="bg-[var(--raised)] dark:bg-[var(--raised)] p-5 rounded-2xl border dark:border-[var(--line)] shadow-sm cursor-pointer hover:shadow-md hover:border-[var(--alt-edge)] transition-all group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="p-2.5 rounded-xl transition-colors bg-[var(--raised)] dark:bg-[var(--raised)] text-[var(--alt-ink)] group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-ink)]"><MapPin size={20}/></div>
                                    </div>
                                    <h3 className="font-black text-base dark:text-[var(--ink)] mb-3 truncate uppercase tracking-wide">{p.name}</h3>
                                    <div className="flex justify-between items-end border-t border-[var(--line-2)] dark:border-[var(--line)] pt-3">
                                        <div><p className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Prov. Value</p><p className="font-bold text-sm text-[var(--alt-ink)]">{formatRupiah(p.total)}</p></div>
                                        <div className="text-right"><p className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Stops</p><p className="font-bold dark:text-[var(--ink)] text-sm">{p.count}</p></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- LEVEL 4: KABUPATEN SELECTION --- */}
            {!reportView && selectedRegion && selectedAgent && selectedProv && !selectedKab && (
                <div className="animate-fade-in relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.values(reportData[selectedRegion]?.agents[selectedAgent]?.provinsi[selectedProv]?.kabupaten || {}).sort((a,b) => b.total - a.total).map(k => (
                            <div key={k.name} onClick={() => setSelectedKab(k.name)} className="bg-[var(--raised)] dark:bg-[var(--raised)] p-5 rounded-2xl border dark:border-[var(--line)] shadow-sm cursor-pointer hover:shadow-md hover:border-pink-500 transition-all group">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-2.5 rounded-xl transition-colors bg-pink-100 dark:bg-[var(--raised)] text-pink-600 group-hover:bg-pink-500 group-hover:text-[var(--ink)]"><Folder size={20}/></div>
                                </div>
                                <h3 className="font-black text-base dark:text-[var(--ink)] mb-3 truncate uppercase tracking-wide">{k.name}</h3>
                                <div className="flex justify-between items-end border-t border-[var(--line-2)] dark:border-[var(--line)] pt-3">
                                    <div><p className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Kab. Value</p><p className="font-bold text-sm text-pink-500">{formatRupiah(k.total)}</p></div>
                                    <div className="text-right"><p className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Stops</p><p className="font-bold dark:text-[var(--ink)] text-sm">{k.count}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- LEVEL 5: KECAMATAN SELECTION --- */}
            {!reportView && selectedRegion && selectedAgent && selectedProv && selectedKab && !selectedKec && (
                <div className="animate-fade-in relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.values(reportData[selectedRegion]?.agents[selectedAgent]?.provinsi[selectedProv]?.kabupaten[selectedKab]?.kecamatan || {}).sort((a,b) => b.total - a.total).map(c => (
                            <div key={c.name} onClick={() => setSelectedKec(c.name)} className="bg-[var(--raised)] dark:bg-[var(--raised)] p-5 rounded-2xl border dark:border-[var(--line)] shadow-sm cursor-pointer hover:shadow-md hover:border-[var(--danger)] transition-all group">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-2.5 rounded-xl transition-colors bg-[var(--danger-well)] dark:bg-[var(--raised)] text-[var(--danger-text)] group-hover:bg-[var(--danger-plate)] group-hover:text-[var(--ink)]"><Folder size={20}/></div>
                                </div>
                                <h3 className="font-black text-base dark:text-[var(--ink)] mb-3 truncate uppercase tracking-wide">{c.name}</h3>
                                <div className="flex justify-between items-end border-t border-[var(--line-2)] dark:border-[var(--line)] pt-3">
                                    <div><p className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Kec. Value</p><p className="font-bold text-sm text-[var(--danger-text)]">{formatRupiah(c.total)}</p></div>
                                    <div className="text-right"><p className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Stops</p><p className="font-bold dark:text-[var(--ink)] text-sm">{c.count}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- LEVEL 6: CUSTOMER SELECTION --- */}
            {!reportView && selectedRegion && selectedAgent && selectedProv && selectedKab && selectedKec && !selectedCustomer && (
                <div className="animate-fade-in relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.values(reportData[selectedRegion]?.agents[selectedAgent]?.provinsi[selectedProv]?.kabupaten[selectedKab]?.kecamatan[selectedKec]?.stores || {}).sort((a,b) => b.total - a.total).map(c => {
                            const isIndiv = c.name === "Individuals (Ecer)";
                            return (
                                <div key={c.name} onClick={() => setSelectedCustomer(c.name)} className={`relative bg-[var(--raised)] dark:bg-[var(--raised)] p-5 rounded-2xl border shadow-sm cursor-pointer hover:shadow-md transition-all group ${isIndiv ? 'border-[var(--line-2)] dark:border-[var(--line-2)] hover:border-[var(--line-2)]' : 'dark:border-[var(--line)] hover:border-[var(--accent-edge)]'}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-2.5 rounded-xl transition-colors ${isIndiv ? 'bg-[var(--verified-fill)] dark:bg-[var(--verified-fill)] text-[var(--verified)] group-hover:bg-[var(--verified-fill)]0 group-hover:text-[var(--ink)]' : 'bg-[var(--raised)] dark:bg-[var(--raised)] text-[var(--accent-ink)] group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-ink)]'}`}>
                                            {isIndiv ? <User size={20}/> : <Store size={20} />}
                                        </div>
                                    </div>
                                    <h3 className="font-black text-base dark:text-[var(--ink)] mb-3 truncate">{c.name}</h3>
                                    <div className="flex justify-between items-end border-t border-[var(--line-2)] dark:border-[var(--line)] pt-3">
                                        <div><p className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Value</p><p className={`font-bold text-sm ${isIndiv ? 'text-[var(--verified)]' : 'text-[var(--accent-ink)]'}`}>{formatRupiah(c.total)}</p></div>
                                        <div className="text-right"><p className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-bold">Receipts</p><p className="font-bold dark:text-[var(--ink)] text-sm">{c.count}</p></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- LEVEL 7: RECEIPT ARCHIVE --- */}
            {!reportView && selectedRegion && selectedAgent && selectedProv && selectedKab && selectedKec && selectedCustomer && (
                <div className="animate-fade-in relative z-10">
                    <div className="bg-[var(--raised)] dark:bg-[var(--raised)] rounded-2xl shadow-xl border dark:border-[var(--line)] overflow-hidden">
                        {(() => {
                            const cObj = reportData[selectedRegion]?.agents[selectedAgent]?.provinsi[selectedProv]?.kabupaten[selectedKab]?.kecamatan[selectedKec]?.stores[selectedCustomer];
                            if (!cObj) return null;
                            
                            return (
                                <>
                                    <div className="bg-[var(--panel)] text-[var(--ink)] p-6 md:p-8">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[var(--accent-ink)] font-bold tracking-widest text-[10px] uppercase mb-1">Audit Log • {selectedAgent}</p>
                                                <h1 className="text-2xl md:text-3xl font-black">{cObj.name}</h1>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="text-right">
                                                    <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold">Account Total</p>
                                                    <p className={`text-xl md:text-2xl font-black ${cObj.total < 0 ? 'text-[var(--danger-text)]' : 'text-[var(--verified)]'}`}>{formatRupiah(cObj.total)}</p>
                                                </div>
                                                {isAdmin && (
                                                    <button data-kpm-del data-label="Delete" onClick={() => onDeleteFolder(cObj.name, selectedAgent)} title="Delete ALL history for this store" className="p-2 bg-[var(--danger-plate)] hover:bg-[var(--danger-plate)] text-[var(--danger-text)] hover:text-[var(--ink)] border border-[var(--danger)] rounded-lg transition-colors shrink-0">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 md:p-6 overflow-x-auto">
                                        <table className="w-full text-sm text-left min-w-[600px]">
                                            <thead className="bg-[var(--raised)] dark:bg-[var(--raised)] text-[var(--ink-muted)] uppercase text-[10px] font-bold tracking-widest">
                                                <tr><th className="p-3 rounded-l-lg">Date / Time</th><th className="p-3">Type</th><th className="p-3">Details</th><th className="p-3 text-right">Amount</th><th className="p-3 rounded-r-lg text-center">Action</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--line)] dark:divide-[var(--line)]">
                                                {cObj.history.map(t => {
                                                    // 🚀 FORENSIC BADGES
                                                    const isRetur = t.type === 'RETUR' || t.paymentType === 'Retur/BS';
                                                    const isExchange = t.paymentType === 'Tukar Ganti';
                                                    const isIouFulfill = t.paymentType === 'IOU Fulfillment';

                                                    return (
                                                    <tr key={t.id} className="hover:bg-[var(--raised)] dark:hover:bg-[var(--panel)] transition-colors">
                                                        <td className="p-3 font-mono text-[var(--ink-muted)] dark:text-[var(--ink-muted)] text-xs font-bold">{t.date}<br/><span className="text-[10px] opacity-70">{t.timestamp ? new Date(t.timestamp.seconds*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : ''}</span></td>
                                                        <td className="p-3">
                                                            {isRetur ? (
                                                                <span className="px-2 py-1 rounded text-[11px] uppercase tracking-widest font-black bg-[var(--danger-well)] text-[var(--danger-text)] border border-[var(--danger)]">RETUR</span>
                                                            ) : isExchange ? (
                                                                <span className="px-2 py-1 rounded text-[11px] uppercase tracking-widest font-black bg-[var(--raised)] text-[var(--ink)] border border-[var(--accent-edge)]">EXCHANGE</span>
                                                            ) : isIouFulfill ? (
                                                                <span className="px-2 py-1 rounded text-[11px] uppercase tracking-widest font-black bg-[var(--verified-fill)] text-[var(--verified)] border border-[var(--line-2)]">UTANG BARANG LUNAS</span>
                                                            ) : t.type === 'CONSIGNMENT_PAYMENT' ? (
                                                                <span className="px-2 py-1 rounded text-[11px] uppercase tracking-widest font-black bg-[var(--raised)] text-[var(--alt-ink)] border border-[var(--alt-edge)]">STORE AUDIT</span>
                                                            ) : (
                                                                <span className="px-2 py-1 rounded text-[11px] uppercase tracking-widest font-black bg-[var(--verified-fill)] text-[var(--verified)] border border-[var(--line-2)]">SALE</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-[var(--ink)] dark:text-[var(--ink-muted)] text-xs font-bold leading-relaxed max-w-[250px] break-words uppercase">
                                                            {t.type === 'CONSIGNMENT_PAYMENT' ? (
                                                                <div className="space-y-1">
                                                                    {(t.itemsPaid || []).concat(t.itemsReturned || [], t.itemsRemaining || []).reduce((acc, curr) => {
                                                                        if (!acc.find(i => i.productId === curr.productId)) acc.push(curr); return acc;
                                                                    }, []).map((item, idx) => <div key={idx}>• {item.name}</div>)}
                                                                </div>
                                                            ) : (
                                                                t.items ? t.items.map(i => {
                                                                    let lbl = `${i.qty} ${i.unit} ${i.name}`;
                                                                    if (i.condition === 'DAMAGED') lbl += ' [DMG]';
                                                                    if (i.fulfillment === 'IOU') lbl += ' [UTANG BARANG]';
                                                                    if (i.isIouFulfillment) lbl += ' [FULFILLED]';
                                                                    return lbl;
                                                                }).join(", ") : 'N/A'
                                                            )}
                                                            {t.paymentType === 'Titip' && <span className="block mt-1 text-[11px] text-[var(--accent-ink)] tracking-widest border border-[var(--accent-edge)] w-fit px-1 rounded">(CONSIGNMENT)</span>}
                                                            {t.paymentType !== 'Titip' && t.paymentType !== 'Cash' && t.paymentType && !isExchange && !isIouFulfill && <span className="block mt-1 text-[11px] text-[var(--ink)] tracking-widest">({t.paymentType})</span>}
                                                        </td>
                                                        <td className={`p-3 text-right font-black ${isRetur && (t.amountPaid || t.total) > 0 ? 'text-[var(--danger-text)]' : 'text-[var(--verified)]'}`}>
                                                            {isRetur && (t.amountPaid || t.total) > 0 ? '-' : ''}{formatRupiah(t.amountPaid || t.total)}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <div className="flex justify-center gap-2">
                                                                {t.deliveryProof && <button onClick={() => setViewingPhoto(t.deliveryProof)} className="p-2 bg-[var(--verified-fill)] dark:bg-[var(--verified-fill)] text-[var(--verified)] dark:text-[var(--verified)] hover:bg-[var(--verified-fill)] rounded-lg transition-colors"><Camera size={14}/></button>}
                                                                <button onClick={() => setViewingReceipt(t)} className="p-2 bg-[var(--raised)] dark:bg-[var(--raised)] text-[var(--ink-muted)] dark:text-[var(--ink-muted)] hover:text-[var(--accent-ink)] rounded-lg transition-colors"><FileText size={14}/></button>
                                                                {isAdmin && <button onClick={() => setEditingTrans({ ...t, __before: t })} className="p-2 bg-[var(--raised)] dark:bg-[var(--raised)] text-[var(--ink-muted)] dark:text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-lg transition-colors"><Pencil size={14}/></button>}
                                                                {isAdmin && <button data-kpm-del data-label="Delete" onClick={() => onDeleteTransaction(t)} className="p-2 bg-[var(--raised)] dark:bg-[var(--raised)] text-[var(--ink-muted)] dark:text-[var(--ink-muted)] hover:text-[var(--danger-text)] rounded-lg transition-colors"><Trash2 size={14}/></button>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )})}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
            </div>

            {/* MODALS */}
            {viewingPhoto && (
                 <div className="fixed inset-0 z-[600] bg-[var(--panel)] flex flex-col items-center justify-center p-4 animate-fade-in">
                     <button onClick={() => setViewingPhoto(null)} className="absolute top-6 right-6 text-[var(--ink)] hover:text-[var(--danger-text)] z-50 bg-[var(--panel)] p-2 rounded-full transition-colors"><X size={32}/></button>
                     <div className="bg-[var(--raised)] p-2 rounded-xl shadow-2xl max-w-2xl w-full relative">
                         <img src={viewingPhoto.photo || viewingPhoto} className="w-full h-auto max-h-[80vh] object-contain rounded-lg" alt="Delivery Proof" />
                     </div>
                     {viewingPhoto.latitude && (
                         <div className="text-[var(--ink)] mt-4 font-mono text-xs text-center bg-[var(--panel)] px-6 py-3 rounded-xl border border-[var(--line-2)] shadow-lg">
                             <p className="font-bold text-[var(--verified)] mb-1">GPS VERIFIED LOCATION</p>
                             <p>LAT/LNG: {viewingPhoto.latitude.toFixed(5)}, {viewingPhoto.longitude.toFixed(5)}</p>
                             <p>TIME: {new Date(viewingPhoto.capturedAt).toLocaleString('id-ID')}</p>
                         </div>
                     )}
                 </div>
             )}

            {editingTrans && (
                <div className="fixed inset-0 z-[100] bg-[var(--panel)] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[var(--raised)] dark:bg-[var(--raised)] p-6 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col border dark:border-[var(--line)]">
                        <h3 className="font-black text-xl mb-4 dark:text-[var(--ink)] flex items-center gap-2"><Pencil size={22} className="text-[var(--accent-ink)]"/> DATA AUDIT</h3>
                        <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[var(--raised)] dark:bg-[var(--panel)] p-4 rounded-xl border dark:border-[var(--line)]">
                                <div><label className="text-[10px] font-bold text-[var(--ink-muted)] uppercase">Date</label><input type="date" value={editingTrans.date || ''} onChange={e=>setEditingTrans({...editingTrans, date: e.target.value})} className="w-full p-2 text-sm border rounded dark:bg-[var(--raised)] dark:border-[var(--line)] dark:text-[var(--ink)] outline-none"/></div>
                                <div><label className="text-[10px] font-bold text-[var(--ink-muted)] uppercase">Customer Name</label><input type="text" value={editingTrans.customerName || ''} onChange={e=>setEditingTrans({...editingTrans, customerName: e.target.value})} className="w-full p-2 text-sm border rounded dark:bg-[var(--raised)] dark:border-[var(--line)] dark:text-[var(--ink)] outline-none"/></div>
                                <div>
                                    <label className="text-[10px] font-bold text-[var(--accent-ink)] uppercase">Pricing Tier</label>
                                    <select value={editingTrans.priceTier || 'Retail'} onChange={handleEditTierChange} className="w-full p-2 text-sm border rounded dark:bg-[var(--raised)] dark:border-[var(--line)] font-bold text-[var(--accent-ink)] outline-none">
                                        <option value="Grosir">Grosir</option>
                                        <option value="Retail">Retail</option>
                                        <option value="Ecer">Ecer</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border border-[var(--line-2)] dark:border-[var(--line)] rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-[var(--raised)] dark:bg-[var(--gold)] p-3 flex justify-between items-center border-b border-[var(--accent-edge)] dark:border-[var(--accent-edge)]">
                                    <span className="font-bold text-xs uppercase tracking-widest text-[var(--ink)] dark:text-[var(--ink-muted)]">Itemized Receipt</span>
                                    <button type="button" onClick={() => setEditingTrans({...editingTrans, items: [...(editingTrans.items||[]), { productId: '', name: 'Select Product', qty: 1, unit: 'Bks', calculatedPrice: 0 }]})} className="text-[10px] bg-[var(--gold)] text-[var(--gold-ink)] px-3 py-1.5 rounded font-bold hover:bg-[var(--gold)] shadow active:scale-95 transition-transform">+ ADD ITEM</button>
                                </div>
                                <div className="p-3 space-y-2 bg-[var(--raised)] dark:bg-[var(--raised)]">
                                    {(editingTrans.items || []).map((item, idx) => (
                                        <div key={idx} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-[var(--raised)] dark:bg-[var(--panel)] p-2 rounded-lg border dark:border-[var(--line)]">
                                            <select value={item.productId || ''} onChange={(e) => handleEditItemChange(idx, 'productId', e.target.value)} className="flex-1 p-2 text-xs font-bold border rounded dark:bg-[var(--raised)] dark:border-[var(--line)] dark:text-[var(--ink)] outline-none min-w-[150px]">
                                                <option value="">-- Select Product --</option>
                                                {inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <input type="number" min="1" value={item.qty} onChange={(e) => handleEditItemChange(idx, 'qty', Number(e.target.value))} className="w-16 p-2 text-xs text-center border rounded dark:bg-[var(--raised)] dark:border-[var(--line)] dark:text-[var(--ink)] font-bold outline-none" />
                                            <select value={item.unit} onChange={(e) => handleEditItemChange(idx, 'unit', e.target.value)} className="w-20 p-2 text-xs font-bold border rounded dark:bg-[var(--raised)] dark:border-[var(--line)] dark:text-[var(--ink)] outline-none">
                                                <option value="Bks">Bks</option>
                                                <option value="Slop">Slop</option>
                                                <option value="Karton">Karton</option>
                                            </select>
                                            <input type="number" value={item.calculatedPrice} onChange={(e) => handleEditItemChange(idx, 'calculatedPrice', Number(e.target.value))} className="w-28 p-2 text-xs text-right border rounded dark:bg-[var(--raised)] dark:border-[var(--line)] dark:text-[var(--ink)] text-[var(--verified)] font-bold outline-none" placeholder="Price/Unit" />
                                            <button data-kpm-del data-label="Delete" type="button" onClick={() => {
                                                const newItems = editingTrans.items.filter((_, i) => i !== idx);
                                                const newTotal = newItems.reduce((sum, it) => sum + ((it.calculatedPrice || 0) * it.qty), 0);
                                                setEditingTrans({...editingTrans, items: newItems, total: newTotal, amountPaid: newTotal});
                                            }} className="p-2 text-[var(--ink-muted)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-well)] dark:hover:bg-[var(--danger-plate)] rounded transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-[var(--verified-fill)] dark:bg-[var(--verified-fill)] p-4 rounded-xl border border-[var(--line-2)] dark:border-[var(--line-2)]">
                                <div>
                                    <span className="font-black text-sm uppercase tracking-widest text-[var(--verified)] dark:text-[var(--verified)] block">Grand Total</span>
                                </div>
                                <input type="number" value={editingTrans.total} onChange={e=>setEditingTrans({...editingTrans, total: Number(e.target.value), amountPaid: Number(e.target.value)})} className="w-40 p-2 text-right border-2 border-[var(--line-2)] dark:border-[var(--line-2)] rounded-lg bg-[var(--raised)] dark:bg-[var(--raised)] dark:text-[var(--ink)] font-black text-xl text-[var(--verified)] outline-none focus:border-[var(--line-2)] transition-colors" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-5 mt-2 shrink-0">
                            <button type="button" onClick={()=>setEditingTrans(null)} className="flex-1 py-3.5 bg-[var(--raised)] hover:bg-[var(--raised)] dark:bg-[var(--raised)] dark:hover:bg-[var(--inset)] text-[var(--ink)] dark:text-[var(--ink)] rounded-xl font-bold transition-colors">Cancel</button>
                            <button type="button" onClick={handleEditSubmit} className="flex-1 py-3.5 bg-[var(--gold)] hover:bg-[var(--gold)] text-[var(--gold-ink)] rounded-xl font-bold shadow-lg transition-all active:scale-95">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* RECEIPT PRINTER MODAL */}
            {viewingReceipt && (() => {
                let receiptDateStr = viewingReceipt.date || '';
                let receiptTimeStr = '';
                if (viewingReceipt.timestamp) {
                    const dateObj = new Date(viewingReceipt.timestamp.seconds * 1000);
                    receiptDateStr = dateObj.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
                    receiptTimeStr = dateObj.toLocaleTimeString('id-ID');
                } else if (receiptDateStr.includes(',')) {
                    const parts = receiptDateStr.split(', ');
                    receiptDateStr = parts[0]; receiptTimeStr = parts[1] || '';
                }
                
                const isNormalSale = viewingReceipt.type !== 'CONSIGNMENT_PAYMENT';
                const isReturReceipt = viewingReceipt.type === 'RETUR' || viewingReceipt.paymentType === 'Retur/BS';
                const displayTotal = viewingReceipt.total || viewingReceipt.amountPaid || 0;
                
                return (
                    <div className="print-modal-wrapper fixed inset-0 z-[500] bg-[var(--panel)] flex items-center justify-center p-4">
                        <div className={`print-receipt format-${printFormat} !bg-[var(--raised)] !text-[var(--ink)] w-full ${printFormat === 'thermal' ? 'max-w-sm' : 'max-w-4xl'} shadow-2xl relative flex flex-col text-sm border-t-8 ${printFormat === 'a4' ? '!border-[var(--accent-edge)]' : '!border-[var(--line)]'} animate-fade-in rounded-b-lg max-h-[90vh] overflow-y-auto custom-scrollbar`}>
                            {printFormat === 'thermal' && (
                                <div className="p-4 shrink-0 font-mono text-xs">
                                    <div className="text-center mb-4">
                                        <h2 className="text-base font-black uppercase tracking-widest !text-[var(--ink)]">{appSettings?.companyName || "KPM INVENTORY"}</h2>
                                        <p className="text-[10px] font-bold mt-1 !text-[var(--ink-muted)]">
                                            {viewingReceipt.type === 'CONSIGNMENT_PAYMENT' ? 'STORE AUDIT' : 
                                             isReturReceipt ? 'RETURN RECEIPT' : 
                                             viewingReceipt.paymentType === 'Tukar Ganti' ? 'EXCHANGE RECEIPT' : 'SALES RECEIPT'}
                                        </p>
                                    </div>
                                    <div className="text-left mb-3 space-y-0.5 border-y border-dashed !border-[var(--line-2)] py-2">
                                        <div className="flex"><span className="w-12 font-bold">TGL</span><span>: {receiptDateStr}</span></div>
                                        <div className="flex"><span className="w-12 font-bold">JAM</span><span>: {receiptTimeStr}</span></div>
                                        <div className="flex"><span className="w-12 font-bold">CUST</span><span className="uppercase break-words flex-1">: {viewingReceipt.customerName}</span></div>
                                        {viewingReceipt.agentName && viewingReceipt.agentName !== 'Admin' && <div className="flex"><span className="w-12 font-bold">SALES</span><span className="uppercase break-words flex-1">: {viewingReceipt.agentName}</span></div>}
                                        <div className="flex"><span className="w-12 font-bold">TYPE</span><span className={`font-black uppercase ${isReturReceipt ? '!text-[var(--danger-text)]' : viewingReceipt.paymentType === 'Tukar Ganti' ? '!text-[var(--ink)]' : '!text-[var(--ink)]'}`}>: {viewingReceipt.paymentType || 'Cash'}</span></div>
                                    </div>
                                    <div className="border-b border-dashed !border-[var(--line-2)] pb-2 mb-2 min-h-[100px]">
                                        {isNormalSale && (
                                            <div className="w-full text-left">
                                                <div className="flex justify-between border-b border-dashed !border-[var(--line-2)] pb-1 mb-2 font-bold">
                                                    <span>ITEM</span><span>TOTAL</span>
                                                </div>
                                                <div>
                                                    {viewingReceipt.items && viewingReceipt.items.length > 0 ? viewingReceipt.items.map((item, i) => (
                                                        <div key={i} className="mb-2">
                                                            <div className="font-bold uppercase text-xs !text-[var(--ink)] flex flex-wrap gap-1 items-center">
                                                                {item.name}
                                                                {item.condition === 'DAMAGED' && <span className="text-[11px] bg-[var(--danger-well)] !text-[var(--danger-text)] border !border-[var(--danger)] px-1 rounded shadow-sm">DAMAGED</span>}
                                                                {item.fulfillment === 'IOU' && <span className="text-[11px] bg-[var(--raised)] !text-[var(--ink)] border !border-[var(--accent-edge)] px-1 rounded shadow-sm">UTANG BARANG</span>}
                                                                {item.isIouFulfillment && <span className="text-[11px] bg-[var(--verified-fill)] !text-[var(--verified)] border !border-[var(--line-2)] px-1 rounded shadow-sm">UTANG BARANG LUNAS</span>}
                                                            </div>
                                                            {item.condition === 'DAMAGED' && item.returnReason && (
                                                                <div className="text-[11px] italic !text-[var(--ink-muted)] mb-0.5 mt-0.5">Reason: {item.returnReason === 'Other' ? item.otherReasonDetail : item.returnReason}</div>
                                                            )}
                                                            <div className="flex justify-between text-xs mt-0.5">
                                                                <span className="!text-[var(--ink-muted)]">{item.qty} {item.unit} x {new Intl.NumberFormat('id-ID').format(item.calculatedPrice || 0)}</span>
                                                                <span className={`font-black ${isReturReceipt && item.calculatedPrice > 0 ? '!text-[var(--danger-text)]' : '!text-[var(--ink)]'}`}>
                                                                    {isReturReceipt && item.calculatedPrice > 0 ? '-' : ''}{new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )) : <div className="text-center py-4 text-[10px] italic !text-[var(--ink-muted)]">No Itemized Data</div>}
                                                </div>
                                            </div>
                                        )}
                                        {!isNormalSale && (
                                            <div className="space-y-4"><div className="font-black text-center uppercase tracking-widest border-b border-dashed !border-[var(--line-2)] pb-1 mb-2">AUDIT BREAKDOWN</div>
                                                {(viewingReceipt.itemsPaid || []).concat(viewingReceipt.itemsReturned || [], viewingReceipt.itemsRemaining || []).reduce((acc, curr) => { if (!acc.find(i => i.productId === curr.productId)) acc.push(curr); return acc; }, []).map((item, i) => {
                                                    const paidItem = (viewingReceipt.itemsPaid || []).find(p => p.productId === item.productId); const returItem = (viewingReceipt.itemsReturned || []).find(r => r.productId === item.productId); const remainItem = (viewingReceipt.itemsRemaining || []).find(s => s.productId === item.productId);
                                                    if (!paidItem && !returItem && !remainItem) return null;
                                                    return (
                                                        <div key={i} className="mb-3"><div className="font-bold uppercase break-words leading-tight">{item.name}</div><div className="text-[10px] !text-[var(--ink)] font-bold border-b border-dashed !border-[var(--line-2)] pb-0.5 mb-1">Total Consigned: {(paidItem?.qty || 0) + (returItem?.qty || 0) + (remainItem?.qty || 0)} Bks</div><div className="pl-2 space-y-0.5 text-[10px] !text-[var(--ink-muted)] font-mono">
                                                                {paidItem && paidItem.qty > 0 && <div className="flex justify-between"><span>• Sold: {paidItem.qty}</span><span className="font-black !text-[var(--ink)]">Rp {new Intl.NumberFormat('id-ID').format((paidItem.calculatedPrice || 0) * paidItem.qty)}</span></div>}
                                                                {returItem && returItem.qty > 0 && <div className="flex justify-between"><span>• Retur: {returItem.qty}</span><span>-</span></div>}
                                                                {remainItem && remainItem.qty > 0 && <div className="flex justify-between"><span>• Sisa: {remainItem.qty}</span><span>-</span></div>}
                                                            </div></div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-black mb-4 !text-[var(--ink)]">
                                        <span>TOTAL</span>
                                        <span className={isReturReceipt && displayTotal > 0 ? '!text-[var(--danger-text)]' : '!text-[var(--ink)]'}>
                                            {isReturReceipt && displayTotal > 0 ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(displayTotal)}
                                        </span>
                                    </div>
                                    <div className="text-center text-[10px] mb-2 font-bold !text-[var(--ink-muted)]"><p>*** THANK YOU ***</p></div>
                                </div>
                            )}

                            {printFormat === 'a4' && (
                                <div className="w-full overflow-x-auto custom-scrollbar border-b !border-[var(--line-2)]">
                                    <div className="a4-print-jail p-8 md:p-12 shrink-0 font-sans relative min-w-[800px] mx-auto" style={{ backgroundColor: '#ffffff', color: '#000000', boxSizing: 'border-box' }}>
                                        {/* ── THE WATERMARK ──────────────────────────────────────
                                            INSIDE the sheet, not on the modal shell around it. It
                                            was on `.print-receipt` first, which for A4 is only the
                                            outer wrapper — that put the mark level with the action
                                            buttons instead of on the paper. `.a4-print-jail` is the
                                            page, and it is already `relative`.
                                            A4 only, by construction: this branch never runs for the
                                            48mm thermal slip, which has no corner to spare and would
                                            print a grey mark as mud.
                                            ⚠️ NOT APP UI — the nota keeps KPM company blue and the
                                            palette law stops at this block's edge. Geometry lives in
                                            config/receiptWatermark.js so the Settings preview cannot
                                            drift away from what actually prints. */}
                                        {watermarkSrc && (
                                            <img src={watermarkSrc} alt="" className={WATERMARK_POSITION} style={WATERMARK_STYLE} />
                                        )}
                                        <div className="border-b-4 !border-[var(--accent-edge)] pb-4 mb-6 flex justify-between items-end gap-8">
                                            <div className="flex-1">
                                                <h1 className="text-2xl md:text-3xl font-black !text-[var(--ink)] tracking-widest uppercase break-words">{appSettings?.companyName || "PT KARYAMEGA PUTERA MANDIRI"}</h1>
                                                <p className="text-xs md:text-sm font-bold !text-[var(--ink)] mt-1 whitespace-pre-line">{appSettings?.companyAddress || 'Jl. Raya Magelang - Purworejo Km. 11'}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <h2 className="text-xl md:text-2xl font-bold !text-[var(--ink)] uppercase tracking-widest">
                                                    {viewingReceipt.type === 'CONSIGNMENT_PAYMENT' ? 'STORE AUDIT REPORT' : 
                                                     isReturReceipt ? 'NOTA RETUR' : 
                                                     viewingReceipt.paymentType === 'Tukar Ganti' ? 'NOTA TUKAR GANTI' : 'NOTA PENJUALAN'}
                                                </h2>
                                                <p className="text-[10px] uppercase font-bold !text-[var(--ink-muted)] tracking-widest mt-1">REPRINT COPY</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between mb-8 text-sm">
                                            <table className="w-1/3"><tbody>
                                                <tr><td className="font-bold py-1 w-24 !text-[var(--ink-muted)] uppercase align-top">Tanggal</td><td className="font-bold py-1 !text-[var(--ink)]">: {receiptDateStr}</td></tr>
                                                {receiptTimeStr && <tr><td className="font-bold py-1 w-24 !text-[var(--ink-muted)] uppercase align-top">Waktu</td><td className="font-bold py-1 !text-[var(--ink)]">: {receiptTimeStr}</td></tr>}
                                                <tr><td className="font-bold py-1 !text-[var(--ink-muted)] uppercase align-top">Sales / Agent</td><td className="font-bold py-1 !text-[var(--ink)] uppercase">: {viewingReceipt.agentName === 'Admin' ? (appSettings?.adminDisplayName || 'Admin') : (viewingReceipt.agentName || 'Sales')}</td></tr>
                                                <tr><td className="font-bold py-1 !text-[var(--ink-muted)] uppercase align-top">Tipe Transaksi</td><td className="font-bold py-1 !text-[var(--ink)] uppercase">: {viewingReceipt.paymentType || 'Cash'}</td></tr>
                                            </tbody></table>
                                            <div className="w-1/3 border-2 !border-[var(--line)] p-3 rounded-lg bg-[var(--raised)] shadow-sm flex flex-col justify-center">
                                                <p className="font-bold !text-[var(--ink-muted)] text-xs mb-1">KEPADA YTH,</p><p className="text-xl font-black uppercase !text-[var(--ink)]">{viewingReceipt.customerName}</p>
                                            </div>
                                        </div>
                                        {isNormalSale ? (
                                            <table className="w-full text-sm border-collapse border-2 !border-[var(--line)] mb-8 shadow-sm">
                                                <thead className="!bg-[var(--raised)] !text-[var(--ink)]"><tr><th className="border-2 !border-[var(--line)] p-3 text-center w-12 font-black">NO</th><th className="border-2 !border-[var(--line)] p-3 text-left font-black">MACAM BARANG (KATALOG)</th><th className="border-2 !border-[var(--line)] p-3 text-center w-24 font-black">QTY</th><th className="border-2 !border-[var(--line)] p-3 text-right w-40 font-black">JUMLAH</th></tr></thead>
                                                <tbody>{viewingReceipt.items?.map((item, i) => (
                                                    <tr key={i}>
                                                        <td className="border-2 !border-[var(--line)] p-2 text-center !text-[var(--ink-muted)] font-bold align-top">{i+1}</td>
                                                        <td className="border-2 !border-[var(--line)] p-2 font-bold !text-[var(--ink)] uppercase align-top">
                                                            <div className="flex flex-wrap gap-1 items-center mb-1">
                                                                {item.name}
                                                                {item.condition === 'DAMAGED' && <span className="text-[11px] bg-[var(--danger-well)] !text-[var(--danger-text)] border !border-[var(--danger)] px-1 rounded">DAMAGED</span>}
                                                                {item.fulfillment === 'IOU' && <span className="text-[11px] bg-[var(--raised)] !text-[var(--ink)] border !border-[var(--accent-edge)] px-1 rounded">UTANG BARANG</span>}
                                                                {item.isIouFulfillment && <span className="text-[11px] bg-[var(--verified-fill)] !text-[var(--verified)] border !border-[var(--line-2)] px-1 rounded">UTANG BARANG LUNAS</span>}
                                                            </div>
                                                            {item.condition === 'DAMAGED' && item.returnReason && (
                                                                <div className="text-[10px] italic !text-[var(--ink-muted)] font-normal">Reason: {item.returnReason === 'Other' ? item.otherReasonDetail : item.returnReason}</div>
                                                            )}
                                                        </td>
                                                        <td className="border-2 !border-[var(--line)] p-2 text-center font-black text-lg !text-[var(--ink)] align-top">{item.qty} <span className="text-sm font-bold">{item.unit}</span></td>
                                                        <td className="border-2 !border-[var(--line)] p-2 text-right font-black text-lg !text-[var(--ink)] align-top">
                                                            {isReturReceipt && item.calculatedPrice > 0 ? '-' : ''}{new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}
                                                        </td>
                                                    </tr>
                                                ))}</tbody>
                                                <tfoot><tr className="!bg-[var(--raised)]"><td colSpan="3" className="border-2 !border-[var(--line)] p-4 text-right font-black text-xl !text-[var(--ink)] tracking-widest">GRAND TOTAL</td><td className={`border-2 !border-[var(--line)] p-4 text-right font-black text-2xl ${isReturReceipt && displayTotal > 0 ? '!text-[var(--danger-text)]' : '!text-[var(--ink)]'}`}>{isReturReceipt && displayTotal > 0 ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(displayTotal)}</td></tr></tfoot>
                                            </table>
                                        ) : (
                                            <table className="w-full text-sm border-collapse border-2 !border-[var(--line)] mb-8 shadow-sm">
                                                <thead className="!bg-[var(--raised)] !text-[var(--ink)]"><tr><th className="border-2 !border-[var(--line)] p-3 text-center w-12 font-black">NO</th><th className="border-2 !border-[var(--line)] p-3 text-left font-black">AUDITED PRODUCT</th><th className="border-2 !border-[var(--line)] p-3 text-center w-24 font-black">INITIAL STOCK</th><th className="border-2 !border-[var(--line)] p-3 text-center w-32 font-black">BREAKDOWN</th><th className="border-2 !border-[var(--line)] p-3 text-right w-40 font-black">TAGIHAN (Rp)</th></tr></thead>
                                                <tbody>
                                                    {(viewingReceipt.itemsPaid || []).concat(viewingReceipt.itemsReturned || [], viewingReceipt.itemsRemaining || []).reduce((acc, curr) => { if (!acc.find(i => i.productId === curr.productId)) acc.push(curr); return acc; }, []).map((item, i) => {
                                                        const paidItem = (viewingReceipt.itemsPaid || []).find(p => p.productId === item.productId); const returItem = (viewingReceipt.itemsReturned || []).find(r => r.productId === item.productId); const remainItem = (viewingReceipt.itemsRemaining || []).find(s => s.productId === item.productId);
                                                        if (!paidItem && !returItem && !remainItem) return null; const initialQty = (paidItem?.qty || 0) + (returItem?.qty || 0) + (remainItem?.qty || 0);
                                                        return (
                                                            <tr key={i}><td className="border-2 !border-[var(--line)] p-2 text-center !text-[var(--ink-muted)] font-bold align-top">{i+1}</td><td className="border-2 !border-[var(--line)] p-2 font-bold !text-[var(--ink)] uppercase align-top">{item.name}</td><td className="border-2 !border-[var(--line)] p-2 text-center font-bold !text-[var(--ink)] align-top">{initialQty} Bks</td>
                                                                <td className="border-2 !border-[var(--line)] p-2 text-[10px] font-mono align-top">
                                                                    {paidItem && paidItem.qty > 0 && <div className="text-[var(--verified)] font-bold mb-1">• LAKU: {paidItem.qty}</div>}
                                                                    {returItem && returItem.qty > 0 && <div className="text-[var(--danger-text)] font-bold mb-1">• RETUR: {returItem.qty}</div>}
                                                                    {remainItem && remainItem.qty > 0 && <div className="!text-[var(--ink-muted)] font-bold">• SISA: {remainItem.qty}</div>}
                                                                </td>
                                                                <td className="border-2 !border-[var(--line)] p-2 text-right font-black text-lg !text-[var(--ink)] align-bottom">{paidItem ? new Intl.NumberFormat('id-ID').format((paidItem.calculatedPrice || 0) * paidItem.qty) : '-'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot><tr className="!bg-[var(--verified-fill)]"><td colSpan="4" className="border-2 !border-[var(--line)] p-4 text-right font-black text-xl !text-[var(--verified)] tracking-widest">TOTAL TAGIHAN COLLECTED</td><td className="border-2 !border-[var(--line)] p-4 text-right font-black text-2xl !text-[var(--verified)]">Rp {new Intl.NumberFormat('id-ID').format(displayTotal)}</td></tr></tfoot>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="no-print !bg-[var(--raised)] p-3 flex justify-center gap-6 border-t !border-[var(--line-2)] shrink-0">
                                <label className="flex items-center gap-2 text-xs font-bold !text-[var(--ink-muted)] cursor-pointer hover:!text-[var(--ink)]"><input type="radio" checked={printFormat === 'thermal'} onChange={() => setPrintFormat('thermal')} name="format" className="w-4 h-4 accent-slate-800"/>Thermal POS (58mm)</label>
                                <label className="flex items-center gap-2 text-xs font-bold !text-[var(--ink)] cursor-pointer hover:!text-[var(--ink)]"><input type="radio" checked={printFormat === 'a4'} onChange={() => setPrintFormat('a4')} name="format" className="w-4 h-4 accent-blue-600"/>Standard Invoice (A4)</label>
                            </div>
                            
                            <div className="no-print !bg-[var(--raised)] p-4 flex gap-3 border-t !border-[var(--line-2)] mt-auto shrink-0">
                                <button onClick={() => {
                                    const receipt = document.querySelector('.print-receipt'); if (!receipt) return;
                                    const clone = receipt.cloneNode(true); clone.querySelectorAll('.no-print').forEach(el => el.remove()); clone.classList.remove('max-h-[90vh]', 'overflow-y-auto', 'shadow-2xl', 'rounded-b-lg', 'max-w-sm', 'max-w-4xl');
                                    let parentStyles = ''; document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => { parentStyles += el.outerHTML; });
                                    const isThermal = clone.classList.contains('format-thermal');
                                    const iframe = document.createElement('iframe'); iframe.style.position = 'absolute'; iframe.style.top = '0'; iframe.style.left = '0'; iframe.style.width = '1px'; iframe.style.height = '1px'; iframe.style.opacity = '0'; iframe.style.pointerEvents = 'none'; iframe.style.border = 'none'; document.body.appendChild(iframe);
                                    const doc = iframe.contentWindow.document; doc.open();
                                    doc.write(`<!DOCTYPE html><html><head><title>KPM Invoice</title><meta name="viewport" content="width=device-width, initial-scale=1.0">${parentStyles}<style>@media print { @page { margin: 0; } html, body { background: #ffffff !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; width: ${isThermal ? '48mm' : '210mm'} !important; height: max-content !important; min-height: 0 !important; overflow: hidden !important; display: block !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print-receipt { width: ${isThermal ? '48mm' : '100%'} !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; box-shadow: none !important; border: none !important; page-break-after: avoid !important; } .format-thermal { font-family: 'Courier New', Courier, monospace !important; } .format-thermal * { font-size: 11px !important; line-height: 1.2 !important; color: #000000 !important; } .format-thermal .font-bold { font-weight: bold !important; } .format-thermal .font-black { font-weight: 900 !important; } .format-thermal table { width: 100% !important; border-collapse: collapse !important; } .format-thermal th, .format-thermal td { padding: 2px 0 !important; } .format-thermal .text-right { text-align: right !important; } .format-thermal .text-center { text-align: center !important; } .format-thermal .border-dashed { border-style: dashed !important; border-color: #000000 !important; } .format-thermal .border-y { border-top: 1px dashed #000000 !important; border-bottom: 1px dashed #000000 !important; } .format-thermal .border-b { border-bottom: 1px dashed #000000 !important; border-top: none !important; border-left: none !important; border-right: none !important; } .format-thermal .flex { display: flex !important; } .format-thermal .justify-between { justify-content: space-between !important; } .format-thermal h2 { font-size: 14px !important; text-align: center !important; font-weight: 900 !important; } } body { background: white; margin: 0; padding: 0; display: block; }</style></head><body>${clone.outerHTML}<script>window.onload = () => { setTimeout(() => { window.focus(); window.print(); }, 500); };</script></body></html>`);
                                    doc.close(); setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 10000);
                                }} className="flex-1 !bg-[var(--raised)] !text-[var(--ink)] py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-[var(--panel)] transition-colors tracking-widest text-[10px] shadow-md active:scale-95">
                                    <Printer size={14}/> Print Document
                                </button>
                                
                                <button onClick={() => {
                                    let text = `*${appSettings?.companyName || "KPM INVENTORY"}*\n*OFFICIAL RECEIPT*\n------------------------\nDate: ${receiptDateStr}\nTime: ${receiptTimeStr}\nCustomer: ${viewingReceipt.customerName}\nPayment: ${viewingReceipt.paymentType || 'Cash'}\n------------------------\n`;
                                    if (viewingReceipt.items && viewingReceipt.items.length > 0) {
                                        viewingReceipt.items.forEach(item => { 
                                            text += `${item.qty} ${item.unit} ${item.name}`;
                                            if (item.condition === 'DAMAGED') text += ` [DAMAGED]`;
                                            if (item.fulfillment === 'IOU') text += ` [UTANG BARANG]`;
                                            if (item.isIouFulfillment) text += ` [IOU FULFILLED]`;
                                            text += `\n   Rp ${new Intl.NumberFormat('id-ID').format((item.calculatedPrice||0) * item.qty)}\n`; 
                                        });
                                    }
                                    if (viewingReceipt.itemsPaid && viewingReceipt.itemsPaid.length > 0) {
                                        viewingReceipt.itemsPaid.forEach(item => { text += `[LAKU] ${item.qty} ${item.unit} ${item.name}\n   Rp ${new Intl.NumberFormat('id-ID').format((item.calculatedPrice||0) * item.qty)}\n`; });
                                    }
                                    text += `------------------------\n*TOTAL: ${isReturReceipt && displayTotal > 0 ? '-' : ''}Rp ${new Intl.NumberFormat('id-ID').format(displayTotal)}*\n\nThank you for your business!`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                }} className="flex-1 !bg-[#25D366] !text-[var(--ink)] py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-[#128C7E] transition-colors tracking-widest text-[10px] shadow-md active:scale-95">
                                    <MessageSquare size={14}/> Share
                                </button>
                            </div>
                            
                            <button onClick={() => { setViewingReceipt(null); }} className="no-print w-full shrink-0 !bg-[var(--danger-plate)] hover:!bg-[var(--danger-plate)] !text-[var(--ink)] py-4 font-black uppercase tracking-[0.2em] shadow-[0_-5px_20px_rgba(0,0,0,0.2)] active:scale-95 transition-transform rounded-b-lg flex items-center justify-center gap-2"><X size={20}/> CLOSE RECEIPT</button>
                        </div>
                    </div>
                );
            })()}

        </div>
    );
}