import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Printer, Pencil, Trash2, Camera, FileText, Folder, Lock, Archive, RotateCw } from 'lucide-react';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { commitInChunks, formatRupiah, convertToBks, getCurrentDate, storeKey } from '../utils/helpers';
/* An edit is the third path that can rot the sales rollup, and the least obvious of the
   three: a delete at least looks destructive, while changing a quantity looks like tidying. */
import { tallySaleOp } from '../utils/salesRollupWrite';
import { hasClearance } from '../config/permissions';
import { canonicalPlace, isMasterVaultPlace } from '../utils/supply';
import { offerResults, packageReturns } from '../utils/vanBay';
import { notify } from './Toast.jsx';
import SaleReceipt from './SaleReceipt.jsx';
import { RollingNumber } from './BiohazardTheme.jsx';

const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RANGE_UNIT = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };

const parseDay = (k) => {
    const [y, m, d] = String(k || '').split('-').map(Number);
    return (y && m && d) ? new Date(y, m - 1, d) : null;
};
const fmtDayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDaysKey = (k, n) => {
    const d = parseDay(k);
    if (!d) return k;
    d.setDate(d.getDate() + n);
    return fmtDayKey(d);
};
const shortDateLabel = (k) => {
    const d = parseDay(k);
    return d ? `${d.getDate()} ${MON_SHORT[d.getMonth()]}` : (k || '');
};
const rpShort = (n) => Math.abs(n) >= 1e6
    ? `${n < 0 ? '-' : ''}Rp ${(Math.abs(n) / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
    : formatRupiah(n);
const initialsOf = (s) => String(s || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

/* 🔴 `userId`, NOT `user.uid`. They are the same for the owner and different for every delegated
   account: `userId = bossUid || user.uid`, and the receipts live under the BOSS. Editing one here
   used to address the editor's own vault, where the document does not exist — and Firestore treats
   a write to a missing path as a fine thing to do, so the app reported a save that never happened
   and the tally moved in a document nothing reads. */
export default function HistoryReportView({ transactions, inventory, onDeleteFolder, onDeleteTransaction, isAdmin, user, userId, appId, db, appSettings, userRole, agentProfileId, fetchHistoricalTransactions, motorists, customers }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('ledger');

    // 🚀 TIME MACHINE & COMMAND CENTER STATE
    const [rangeType, setRangeType] = useState('weekly');
    const [targetDate, setTargetDate] = useState(getCurrentDate());
    const [historicalData, setHistoricalData] = useState([]);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const [hasPulledArchive, setHasPulledArchive] = useState(false);

    // 🏢 6-TIER HIERARCHY NAVIGATION STATE
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [selectedProv, setSelectedProv] = useState(null);
    const [selectedKab, setSelectedKab] = useState(null);
    const [selectedKec, setSelectedKec] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // MASTER-DETAIL & MODAL STATES
    const [selectedTxId, setSelectedTxId] = useState(null);
    const [openPhoneTxId, setOpenPhoneTxId] = useState(undefined);
    const [editingTrans, setEditingTrans] = useState(null);
    const [viewingReceipt, setViewingReceipt] = useState(null);
    const [viewingPhoto, setViewingPhoto] = useState(null);
    const [printScale, setPrintScale] = useState(100);

    // ANALYTICS STATE
    const [expandedAgent, setExpandedAgent] = useState(null);

    // 🚀 INDESTRUCTIBLE SECURITY FIREWALL — 3-TIER REPORT VISIBILITY
    const reportAccessLevel = useMemo(() => {
        if (userRole === 'ADMIN' || userRole === 'DEVELOPER' || userRole === 'COMPANY_OWNER') return 'global';
        if (hasClearance(userRole, 'view_reports_global')) return 'global';
        if (hasClearance(userRole, 'view_reports_regional')) return 'regional';
        if (hasClearance(userRole, 'view_reports_personal')) return 'personal';
        return 'personal';
    }, [userRole]);

    const isFieldAgent = reportAccessLevel === 'personal';
    const isRegionalOnly = reportAccessLevel === 'regional';

    const myLocation = useMemo(() => {
        const myProfile = motorists?.find(m => m.id === agentProfileId);
        return canonicalPlace(myProfile?.location) || null;
    }, [motorists, agentProfileId]);

    // --- ENGINE 1: DATA MERGE & TIME FILTER ---
    const allTransactions = useMemo(() => {
        const combined = [...transactions, ...historicalData];
        return Array.from(new Map(combined.map(t => [t.id, t])).values());
    }, [transactions, historicalData]);

    const scopedTransactions = useMemo(() => {
        return allTransactions.filter(t => {
            if (isFieldAgent) {
                if (!agentProfileId) return false;
                if (t.agentId !== agentProfileId) return false;
            } else if (isRegionalOnly) {
                if (!myLocation) return false;
                const txAgentId = t.agentId || 'ADMIN';
                const txLocation = txAgentId === 'ADMIN' ? 'Headquarters' : (motorists?.find(m => m.id === txAgentId)?.location || null);
                if (canonicalPlace(txLocation) !== myLocation) return false;
            }
            return true;
        });
    }, [allTransactions, isFieldAgent, isRegionalOnly, myLocation, agentProfileId, motorists]);

    const matchesWindow = (t, rType, refDateStr) => {
        const target = new Date(refDateStr);
        const tDate = new Date(t.date);
        if (rType === 'daily') return t.date === refDateStr;
        if (rType === 'weekly') {
            const start = new Date(target); start.setDate(target.getDate() - target.getDay()); start.setHours(0, 0, 0, 0);
            const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
            return tDate >= start && tDate <= end;
        }
        if (rType === 'monthly') return tDate.getMonth() === target.getMonth() && tDate.getFullYear() === target.getFullYear();
        if (rType === 'yearly') return tDate.getFullYear() === target.getFullYear();
        return false;
    };

    const dateFilteredTransactions = useMemo(() => {
        return scopedTransactions
            .filter(t => matchesWindow(t, rangeType, targetDate))
            .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    }, [scopedTransactions, rangeType, targetDate]);

    // --- ENGINE 2: GLOBAL SEARCH ---
    const matchesSearch = (t, rawTerm) => {
        if (!rawTerm.trim()) return true;
        const term = rawTerm.toLowerCase();
        const customerMatch = (t.customerName || '').toLowerCase().includes(term);
        const agentMatch = (t.agentName || '').toLowerCase().includes(term);
        const valueMatch = String(t.total || t.amountPaid || 0).includes(term);
        const offerMatch = (t.offers || []).some(o => (o.name || '').toLowerCase().includes(term));
        let itemsMatch = false;
        if (t.items) itemsMatch = t.items.some(i => (i.name || '').toLowerCase().includes(term));
        return customerMatch || agentMatch || valueMatch || offerMatch || itemsMatch;
    };

    const searchedTransactions = useMemo(() => {
        if (!searchTerm.trim()) return dateFilteredTransactions;
        return dateFilteredTransactions.filter(t => matchesSearch(t, searchTerm));
    }, [dateFilteredTransactions, searchTerm]);

    // --- ENGINE 3: THE 6-TIER ENTERPRISE HIERARCHY BUILDER ---
    const reportData = useMemo(() => {
        const structure = {};

        if (motorists && motorists.length > 0) {
            motorists.forEach(m => {
                if (isFieldAgent && m.id !== agentProfileId) return;
                if (isRegionalOnly && (canonicalPlace(m.location) || 'UNASSIGNED AREA') !== myLocation) return;

                const loc = canonicalPlace(m.location) || 'UNASSIGNED AREA';
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
                    regionName = canonicalPlace(boss.location);
                    agentName = boss.name || agentName;
                } else {
                    regionName = 'Headquarters';
                }
            } else if (motorists && motorists.length > 0) {
                const motorist = motorists.find(m => m.id === agentId);
                if (motorist) {
                    regionName = canonicalPlace(motorist.location) || 'UNASSIGNED AREA';
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
        if (rangeType === 'daily') { start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); }
        else if (rangeType === 'weekly') { start.setDate(target.getDate() - target.getDay()); start.setHours(0, 0, 0, 0); end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999); }
        else if (rangeType === 'monthly') { start = new Date(target.getFullYear(), target.getMonth(), 1); end = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59); }
        else if (rangeType === 'yearly') { start = new Date(target.getFullYear(), 0, 1); end = new Date(target.getFullYear(), 11, 31, 23, 59, 59); }

        const data = await fetchHistoricalTransactions(start, end);
        setHistoricalData(data || []);
        setHasPulledArchive(true);
        setIsFetchingHistory(false);
    };

    const matchesContext = (t) => {
        if (selectedAgent && selectedRegion) return (t.agentName || 'Admin') === selectedAgent;
        if (selectedAgent) return (t.agentName || 'Admin') === selectedAgent;
        if (selectedRegion) {
            const agentId = t.agentId || 'ADMIN';
            if (agentId === 'ADMIN') return isMasterVaultPlace(selectedRegion);
            return canonicalPlace(motorists?.find(m => m.id === agentId)?.location) === selectedRegion;
        }
        return true;
    };

    const contextualTransactions = useMemo(() => {
        if (selectedAgent && selectedRegion) return searchedTransactions.filter(t => (t.agentName || 'Admin') === selectedAgent);
        if (selectedRegion) return searchedTransactions.filter(t => {
            const agentId = t.agentId || 'ADMIN';
            if (agentId === 'ADMIN') return isMasterVaultPlace(selectedRegion);
            return canonicalPlace(motorists?.find(m => m.id === agentId)?.location) === selectedRegion;
        });
        return searchedTransactions;
    }, [searchedTransactions, selectedRegion, selectedAgent, motorists]);

    /* OFFER PERFORMANCE: the same sales this report already shows - counted per factory offer, best first. */
    const offerStats = useMemo(() => Object.entries(offerResults(contextualTransactions))
        .map(([id, r]) => ({ id, ...r })).sort((a, b) => b.rp - a.rp), [contextualTransactions]);
    /* PACKAGE RULES STAGE D: a package, then its cigarettes back as a Retur within 7 days - and every shop whose package
       count tier 1-4 cleared in the last 30 days. For the people who watch others: a field agent's own report does not show it. */
    const pkgReturns = useMemo(() => (isFieldAgent ? [] : packageReturns(contextualTransactions)), [contextualTransactions, isFieldAgent]);
    const countClears = useMemo(() => {
        if (isFieldAgent) return [];
        const names = Object.fromEntries([...(appSettings?.promoBundles || []), ...offerStats].map(o => [o.id, o.name]));
        return (customers || []).flatMap(c => Object.entries(c.bundleReset || {}).map(([id, at]) => ({ shop: c.name, offer: names[id] || 'a regional package', at: Number(at) || 0 })))
            .filter(x => Date.now() - x.at <= 30 * 86400000).sort((a, b) => b.at - a.at);
    }, [customers, appSettings, offerStats, isFieldAgent]);
    const shortDay = (ms) => new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

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
            if (field === 'productId' && product?.name) newItems[index].name = product.name;
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

    // --- DERIVED UI METRICS (read-only formatting on top of stats / contextualTransactions) ---
    const todayStr = getCurrentDate();
    const liveCutoffStr = addDaysKey(todayStr, -6);

    const windowRange = useMemo(() => {
        const d = parseDay(targetDate) || new Date();
        if (rangeType === 'daily') return [fmtDayKey(d), fmtDayKey(d)];
        if (rangeType === 'weekly') {
            const start = new Date(d); start.setDate(d.getDate() - d.getDay());
            const end = new Date(start); end.setDate(start.getDate() + 6);
            return [fmtDayKey(start), fmtDayKey(end)];
        }
        if (rangeType === 'monthly') {
            const start = new Date(d.getFullYear(), d.getMonth(), 1);
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
            return [fmtDayKey(start), fmtDayKey(end)];
        }
        return [`${d.getFullYear()}-01-01`, `${d.getFullYear()}-12-31`];
    }, [rangeType, targetDate]);

    const prevTargetDate = useMemo(() => {
        const d = parseDay(targetDate) || new Date();
        if (rangeType === 'daily') d.setDate(d.getDate() - 1);
        else if (rangeType === 'weekly') d.setDate(d.getDate() - 7);
        else if (rangeType === 'monthly') d.setMonth(d.getMonth() - 1);
        else d.setFullYear(d.getFullYear() - 1);
        return fmtDayKey(d);
    }, [rangeType, targetDate]);

    const isPartialWindow = !hasPulledArchive && windowRange[0] < liveCutoffStr;

    const prevOmset = useMemo(() => {
        if (!hasPulledArchive && (addDaysKey(windowRange[0], rangeType === 'daily' ? -1 : -7) < liveCutoffStr || rangeType === 'monthly' || rangeType === 'yearly')) {
            return null;
        }
        const prevList = scopedTransactions.filter(t => matchesWindow(t, rangeType, prevTargetDate) && matchesSearch(t, searchTerm) && matchesContext(t));
        return prevList.reduce((sum, t) => t.type === 'RETUR' ? sum - Math.abs(t.total || 0) : sum + (t.total || t.amountPaid || 0), 0);
    }, [scopedTransactions, rangeType, prevTargetDate, searchTerm, selectedAgent, selectedRegion, hasPulledArchive, windowRange, liveCutoffStr]);

    const sparkDays = useMemo(() => {
        const days = [];
        for (let i = 13; i >= 0; i--) {
            const k = addDaysKey(targetDate, -i);
            const v = scopedTransactions
                .filter(t => t.date === k && matchesSearch(t, searchTerm) && matchesContext(t))
                .reduce((sum, t) => t.type === 'RETUR' ? sum - Math.abs(t.total || 0) : sum + (t.total || t.amountPaid || 0), 0);
            days.push(v);
        }
        return days;
    }, [scopedTransactions, targetDate, searchTerm, selectedAgent, selectedRegion]);

    const kpiSummary = useMemo(() => {
        const totalBks = Object.values(stats.items).reduce((a, b) => a + b.qty, 0);
        const settledPaid = contextualTransactions
            .filter(t => t.type === 'CONSIGNMENT_PAYMENT')
            .reduce((s, t) => s + (Number(t.amountPaid || t.total) || 0), 0);
        const shopNames = new Set();
        let walkIns = 0;
        let saleLikeCount = 0;
        let saleLikeSum = 0;
        contextualTransactions.forEach(t => {
            const cust = (t.customerName || '').trim();
            const isWalk = !cust || cust.toLowerCase().includes('walk-in') || t.items?.some(i => i.priceTier === 'Ecer');
            if (isWalk) walkIns += 1;
            else shopNames.add(storeKey(cust));
            if (t.type !== 'CONSIGNMENT_PAYMENT' && t.type !== 'RETUR') {
                saleLikeCount += 1;
                saleLikeSum += (t.total || t.amountPaid || 0);
            }
        });
        const mixEntries = [
            ['Cash', Math.max(0, stats.payments.Cash || 0), 'kpm-rep-c-cash'],
            ['Transfer', Math.max(0, stats.payments.Transfer || 0), 'kpm-rep-c-tf'],
            ['QRIS', Math.max(0, stats.payments.QRIS || 0), 'kpm-rep-c-qr'],
            ['Titip', Math.max(0, stats.payments.Titip || 0), 'kpm-rep-c-ti'],
        ];
        const mixTotal = mixEntries.reduce((a, [, v]) => a + v, 0);
        return {
            totalBks,
            settledPaid,
            shopsServed: shopNames.size,
            walkIns,
            avgReceipt: saleLikeCount ? saleLikeSum / saleLikeCount : 0,
            mixEntries,
            mixTotal,
        };
    }, [stats, contextualTransactions]);

    const productRows = useMemo(() => {
        const rows = Object.entries(stats.items).map(([name, data]) => {
            const shops = new Set();
            contextualTransactions.forEach(t => {
                if (t.items?.some(i => i.name === name)) shops.add(storeKey(t.customerName || 'Walk-in'));
            });
            return { name, qty: data.qty, om: data.val, shops: shops.size };
        }).sort((a, b) => b.om - a.om);
        const maxOm = Math.max(1, ...rows.map(r => r.om));
        return { rows, maxOm };
    }, [stats.items, contextualTransactions]);

    const returnRows = useMemo(() => contextualTransactions.filter(t => t.type === 'RETUR' || t.paymentType === 'Retur/BS'), [contextualTransactions]);

    const pkgFlaggedIds = useMemo(() => {
        const set = new Set();
        const pkgMap = pkgReturns || [];
        returnRows.forEach(t => {
            if (pkgMap.some(p => storeKey(p.shop) === storeKey(t.customerName) && Math.abs((p.returnedAt || 0) - ((t.timestamp?.seconds || 0) * 1000)) < 86400000)) {
                set.add(t.id);
            }
        });
        return set;
    }, [returnRows, pkgReturns]);

    const regionOptions = useMemo(() => Object.keys(reportData).sort(), [reportData]);
    const agentOptions = useMemo(() => {
        const list = [];
        const regionsToScan = selectedRegion && reportData[selectedRegion] ? [reportData[selectedRegion]] : Object.values(reportData);
        regionsToScan.forEach(reg => {
            Object.values(reg.agents || {}).forEach(a => list.push({ name: a.name, region: reg.name }));
        });
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [reportData, selectedRegion]);

    const activeTx = useMemo(() => {
        if (selectedTxId) {
            const found = contextualTransactions.find(t => t.id === selectedTxId);
            if (found) return found;
        }
        return contextualTransactions[0] || null;
    }, [contextualTransactions, selectedTxId]);

    const resolvedPhoneOpenId = openPhoneTxId === undefined ? (contextualTransactions[0]?.id || null) : openPhoneTxId;

    const ledgerDays = useMemo(() => {
        const groups = [];
        const map = new Map();
        contextualTransactions.forEach(t => {
            const k = t.date || 'Unknown';
            if (!map.has(k)) {
                const g = { date: k, rows: [], count: 0, omset: 0 };
                map.set(k, g);
                groups.push(g);
            }
            const g = map.get(k);
            g.rows.push(t);
            g.count += 1;
            g.omset += t.type === 'RETUR' ? -Math.abs(t.total || 0) : (t.total || t.amountPaid || 0);
        });
        return groups;
    }, [contextualTransactions]);

    const dayHeading = (k) => {
        const dt = parseDay(k);
        const now = parseDay(todayStr);
        if (!dt || !now) return k;
        const diff = Math.round((now - dt) / 864e5);
        const tag = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : DAY_SHORT[dt.getDay()];
        return `${tag} · ${shortDateLabel(k)}`;
    };

    const chipForTx = (t) => {
        const isRetur = t.type === 'RETUR' || t.paymentType === 'Retur/BS';
        const isExchange = t.paymentType === 'Tukar Ganti';
        const isIou = t.paymentType === 'IOU Fulfillment';
        if (isRetur) return { label: 'RETUR', cls: 'rt' };
        if (t.type === 'CONSIGNMENT_PAYMENT') return { label: 'NOTE PAID', cls: 'ti' };
        if (isExchange) return { label: 'TUKAR', cls: '' };
        if (isIou) return { label: 'IOU', cls: '' };
        const pay = (t.paymentType || 'Cash').toUpperCase();
        return { label: pay, cls: t.paymentType === 'Titip' ? 'ti' : '' };
    };

    const txAreaText = (t) => {
        const shop = (customers || []).find(c => storeKey(c.name) === storeKey(t.customerName));
        if (shop) return [shop.city, shop.region].filter(Boolean).join(', ');
        if (!t.customerName || t.customerName.toLowerCase().includes('walk-in') || t.items?.some(i => i.priceTier === 'Ecer')) return 'Ecer, walk-in';
        return 'Store record';
    };

    const txAgentRegion = (t) => {
        const aid = t.agentId || 'ADMIN';
        if (aid === 'ADMIN') return 'Headquarters';
        const match = motorists?.find(m => m.id === aid || (t.agentName && (m.name === t.agentName || m.agentName === t.agentName)));
        return canonicalPlace(match?.location) || 'UNASSIGNED AREA';
    };

    const txTime = (t) => t.timestamp?.seconds
        ? new Date(t.timestamp.seconds * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '--:--';

    const txQtyBks = (t) => (t.items || []).reduce((s, i) => {
        const prod = inventory.find(p => p.id === i.productId);
        return s + convertToBks(i.qty, i.unit, prod || {});
    }, 0);

    const txRowItems = (t) => {
        if (t.type === 'CONSIGNMENT_PAYMENT') {
            return (t.itemsPaid || []).concat(t.itemsReturned || [], t.itemsRemaining || []).reduce((acc, curr) => {
                if (!acc.find(i => i.productId === curr.productId)) acc.push(curr);
                return acc;
            }, []).map(i => `• ${i.name}`).join(', ') || 'Store consignment audit';
        }
        return (t.items || []).map(i => {
            let lbl = `${i.qty} ${i.unit} ${i.name}`;
            if (i.condition === 'DAMAGED') lbl += ' [DMG]';
            if (i.fulfillment === 'IOU') lbl += ' [UTANG BARANG]';
            if (i.isIouFulfillment) lbl += ' [FULFILLED]';
            return lbl;
        }).concat((t.promoGiven || []).map(g => `${g.qty} pcs ${g.name} [BONUS]`)).join(', ') || 'N/A';
    };

    const renderTxDetail = (t, isPhoneDrawer = false) => {
        const isRetur = t.type === 'RETUR' || t.paymentType === 'Retur/BS';
        const isExchange = t.paymentType === 'Tukar Ganti';
        const isIou = t.paymentType === 'IOU Fulfillment';
        const val = Number(t.total || t.amountPaid) || 0;
        const signedVal = isRetur && val > 0 ? -Math.abs(val) : val;
        const shopName = t.customerName || 'Walk-in Customer';
        const totalBksCount = txQtyBks(t);
        const offersText = (t.offers || []).map(o => o.name).filter(Boolean).join(', ') || '—';

        return (
            <>
                <div className="kpm-rep-ph">
                    <div className="kpm-rep-av">{initialsOf(shopName)}</div>
                    <div className="min-w-0">
                        <h3>{shopName}</h3>
                        <p>{txAreaText(t)} · {txAgentRegion(t)}</p>
                        <span className="kpm-rep-resp">Salesman <b>{t.agentName || 'Admin'}</b></span>
                    </div>
                    <div className="tot">
                        <div className="l">{t.type === 'CONSIGNMENT_PAYMENT' ? 'Paid on notes' : isRetur ? 'Refund' : 'Receipt total'}</div>
                        <div className={`v ${signedVal < 0 ? 'text-[var(--danger-ink)]' : ''}`}><RollingNumber text={formatRupiah(signedVal)} /></div>
                    </div>
                </div>

                <div className="kpm-rep-facts">
                    <div><div className="l">When</div><div className="v">{shortDateLabel(t.date)}, {txTime(t)}</div></div>
                    <div><div className="l">{isRetur ? 'Condition' : 'Payment'}</div><div className="v">{t.paymentType || 'Cash'}</div></div>
                    <div><div className="l">Moved</div><div className="v">{t.items?.length ? `${totalBksCount} Bks` : '—'}</div></div>
                    <div><div className="l">Price tier</div><div className="v">{t.priceTier || '—'}</div></div>
                    {!isPhoneDrawer && (
                        <>
                            <div><div className="l">GPS</div><div className="v">{t.deliveryProof?.latitude ? 'Verified' : '—'}</div></div>
                            <div><div className="l">Proof photo</div><div className="v">{t.deliveryProof ? 'Attached' : 'None'}</div></div>
                            <div><div className="l">Offer</div><div className="v">{offersText}</div></div>
                            <div><div className="l">Receipt no.</div><div className="v">{t.receiptNumber || t.id || '—'}</div></div>
                        </>
                    )}
                </div>

                {isExchange && <p className="text-[13px] text-[var(--ink-muted)] m-0">Tukar Ganti: damaged packs swapped for good ones. Goods move, money does not.</p>}
                {isIou && <p className="text-[13px] text-[var(--ink-muted)] m-0">Utang Barang Lunas: goods already paid earlier, delivered now.</p>}

                {t.type === 'CONSIGNMENT_PAYMENT' ? (
                    <div className="text-[13px] text-[var(--ink-muted)] space-y-1">
                        <p className="m-0">Store audit / note payment: lowers consignment balance for this store.</p>
                        {(t.itemsPaid?.length > 0 || t.itemsReturned?.length > 0 || t.itemsRemaining?.length > 0) && (
                            <p className="m-0 text-xs">{txRowItems(t)}</p>
                        )}
                    </div>
                ) : t.items?.length > 0 ? (
                    <div className="kpm-rep-tblw">
                        <table className="kpm-rep-tbl">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th className="num">Qty</th>
                                    {!isPhoneDrawer && <th className="num">Price</th>}
                                    <th className="num">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {t.items.map((i, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            {i.name}
                                            {i.condition === 'DAMAGED' && ' [DMG]'}
                                            {i.fulfillment === 'IOU' && ' [UTANG BARANG]'}
                                            {i.isIouFulfillment && ' [FULFILLED]'}
                                        </td>
                                        <td className="num">{i.qty} {i.unit}</td>
                                        {!isPhoneDrawer && <td className="num">{formatRupiah(Number(i.calculatedPrice) || 0)}</td>}
                                        <td className="num">{formatRupiah((Number(i.calculatedPrice) || 0) * (Number(i.qty) || 0) * (isRetur ? -1 : 1))}</td>
                                    </tr>
                                ))}
                                {(t.promoGiven || []).map((g, gIdx) => (
                                    <tr key={`g-${gIdx}`}>
                                        <td>{g.name} [BONUS]</td>
                                        <td className="num">{g.qty} pcs</td>
                                        {!isPhoneDrawer && <td className="num">—</td>}
                                        <td className="num">Bonus</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={isPhoneDrawer ? 2 : 3}>Total</td>
                                    <td className="num">{formatRupiah(signedVal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <p className="text-[13px] text-[var(--ink-muted)] m-0">No line items recorded ({txRowItems(t)}).</p>
                )}

                {isPhoneDrawer && (
                    <div className="flex flex-wrap gap-2 items-center pt-1">
                        {renderActionButtons(t, true)}
                    </div>
                )}
            </>
        );
    };

    const renderActionButtons = (t, isCompact = false) => {
        const pad = isCompact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs';
        return (
            <>
                <button type="button" onClick={() => setViewingReceipt(t)} className={`kpm-edge-btn quiet ${pad} rounded-lg font-semibold flex items-center gap-1.5`}>
                    <FileText size={14} /> Receipt
                </button>
                {t.deliveryProof && (
                    <button type="button" onClick={() => setViewingPhoto(t.deliveryProof)} className={`kpm-edge-btn quiet ${pad} rounded-lg font-semibold flex items-center gap-1.5`}>
                        <Camera size={14} /> Proof
                    </button>
                )}
                {!isCompact && <span className="flex-1" />}
                {isAdmin ? (
                    <>
                        <button type="button" onClick={() => setEditingTrans({ ...t, __before: t })} className={`kpm-edge-btn ${pad} rounded-lg font-semibold flex items-center gap-1.5`}>
                            <Pencil size={14} /> Edit
                        </button>
                        <button type="button" onClick={() => onDeleteTransaction(t)} className={`kpm-edge-btn danger ${pad} rounded-lg font-semibold flex items-center gap-1.5`}>
                            <Trash2 size={14} /> Delete
                        </button>
                    </>
                ) : (
                    <span className="text-[11.5px] text-[var(--ink-dim)] flex items-center gap-1">
                        <Lock size={12} /> Edit and delete need the vault open
                    </span>
                )}
            </>
        );
    };

    const scopeSubtitle = isFieldAgent
        ? `Your own sales · ${selectedAgent || 'My account'}`
        : isRegionalOnly
            ? `${myLocation || 'Branch'} region`
            : 'Master HQ · every region';

    const winLabel = rangeType === 'daily'
        ? shortDateLabel(windowRange[0])
        : `${shortDateLabel(windowRange[0])} – ${shortDateLabel(windowRange[1] > todayStr ? todayStr : windowRange[1])}`;

    const sparkMax = Math.max(1, ...sparkDays);
    const sparkPts = sparkDays.map((v, idx) => [idx * (200 / (sparkDays.length - 1)), 23 - (Math.max(0, v) / sparkMax) * 20]);
    const sparkLine = sparkPts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const sparkLast = sparkPts[sparkPts.length - 1];

    const deltaContent = () => {
        if (prevOmset === null) return <span>pull archive to compare</span>;
        if (!prevOmset) return <span>no earlier figure</span>;
        const pct = Math.round(((stats.totalRev - prevOmset) / Math.abs(prevOmset)) * 100);
        return <><span className={pct >= 0 ? 'up' : 'dn'}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}%</span> vs previous {RANGE_UNIT[rangeType]}</>;
    };

    const currentFolderLevel = () => {
        if (!selectedRegion) return 'region';
        if (!selectedAgent) return 'agent';
        if (!selectedProv) return 'prov';
        if (!selectedKab) return 'kab';
        if (!selectedKec) return 'kec';
        if (!selectedCustomer) return 'store';
        return 'archive';
    };
    const folderLevel = currentFolderLevel();

    const maxRosterOmset = Math.max(1, ...stats.agentRoster.map(a => Math.max(0, a.total)));

    return (
        <div className="print-reset animate-fade-in max-w-6xl mx-auto pb-20 relative">
            <style>{` @media print { .print-container { zoom: ${printScale / 100} !important; -moz-transform: scale(${printScale / 100}); -moz-transform-origin: top left; } } `}</style>

            {/* === INTERACTIVE MASTER-DETAIL REPORTS WORKSPACE (hidden on print) === */}
            <div className="kpm-rep-screen hide-on-print">
                <div className="kpm-rep-wrap">
                    {/* 1. HEADER + CONTROLS */}
                    <div className="kpm-rep-hd">
                        <h2>Reports</h2>
                        <span className="kpm-rep-sub">{scopeSubtitle} · {winLabel}</span>
                        <div className="kpm-rep-ctl">
                            <span className="kpm-rep-per" role="group" aria-label="Range">
                                {['daily', 'weekly', 'monthly', 'yearly'].map(r => (
                                    <button key={r} type="button" aria-pressed={rangeType === r} onClick={() => setRangeType(r)}>
                                        {r[0].toUpperCase() + r.slice(1)}
                                    </button>
                                ))}
                            </span>
                            <input
                                type="date"
                                className="kpm-rep-field"
                                value={targetDate}
                                onChange={(e) => e.target.value && setTargetDate(e.target.value)}
                                aria-label="Date"
                            />
                            {reportAccessLevel === 'global' && (
                                <select
                                    className="kpm-rep-field"
                                    aria-label="Region"
                                    value={selectedRegion || ''}
                                    onChange={(e) => {
                                        const val = e.target.value || null;
                                        setSelectedRegion(val);
                                        setSelectedAgent(null);
                                        setSelectedProv(null);
                                        setSelectedKab(null);
                                        setSelectedKec(null);
                                        setSelectedCustomer(null);
                                    }}
                                >
                                    <option value="">All regions</option>
                                    {regionOptions.map(reg => <option key={reg} value={reg}>{reg}</option>)}
                                </select>
                            )}
                            {!isFieldAgent && (
                                <select
                                    className="kpm-rep-field"
                                    aria-label="Salesman"
                                    value={selectedAgent || ''}
                                    onChange={(e) => {
                                        const val = e.target.value || null;
                                        if (val) {
                                            const match = agentOptions.find(a => a.name === val);
                                            if (match && reportAccessLevel === 'global') setSelectedRegion(match.region);
                                            setSelectedAgent(val);
                                        } else {
                                            setSelectedAgent(null);
                                        }
                                        setSelectedProv(null);
                                        setSelectedKab(null);
                                        setSelectedKec(null);
                                        setSelectedCustomer(null);
                                    }}
                                >
                                    <option value="">All salesmen</option>
                                    {agentOptions.map(a => <option key={`${a.region}-${a.name}`} value={a.name}>{a.name}</option>)}
                                </select>
                            )}
                            <label className="kpm-rep-search">
                                <Search size={14} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Shop, salesman, product"
                                    aria-label="Search"
                                />
                                {searchTerm && (
                                    <button type="button" onClick={() => setSearchTerm('')} className="text-[var(--ink-dim)] hover:text-[var(--danger-ink)]" aria-label="Clear search">
                                        <X size={13} />
                                    </button>
                                )}
                            </label>
                            <select
                                className="kpm-rep-field kpm-rep-hide-ph"
                                aria-label="Print scale"
                                value={printScale}
                                onChange={(e) => setPrintScale(Number(e.target.value))}
                            >
                                {[50, 75, 100, 125, 150].map(s => <option key={s} value={s}>{s}%</option>)}
                            </select>
                            <button type="button" onClick={() => window.print()} className="kpm-edge-btn quiet kpm-rep-hide-ph px-3 h-8 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                                <Printer size={14} /> Print
                            </button>
                        </div>
                    </div>

                    {/* 2. 5-CELL KPI STRIP (OMSET ONLY — NO PROFIT TILE) */}
                    <div className="kpm-rep-kpi">
                        <div className="kpm-rep-k">
                            <div className="l"><span>Omset</span><span>{RANGE_UNIT[rangeType]}</span></div>
                            <div className={`v ${stats.totalRev < 0 ? 'text-[var(--danger-ink)]' : ''}`}><RollingNumber text={formatRupiah(stats.totalRev)} /></div>
                            <div className="d">{deltaContent()}</div>
                            <svg className="kpm-rep-spark kpm-rep-hide-ph" viewBox="0 0 200 26" preserveAspectRatio="none" aria-hidden="true">
                                <polygon points={`0,26 ${sparkLine} 200,26`} fill="color-mix(in srgb, var(--gold) 12%, transparent)" />
                                <polyline points={sparkLine} fill="none" stroke="var(--gold)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                                <circle cx={sparkLast[0]} cy={sparkLast[1]} r="2.6" fill="var(--gold)" />
                            </svg>
                        </div>
                        <div className="kpm-rep-k">
                            <div className="l">Receipts</div>
                            <div className="v sm"><RollingNumber text={String(stats.count)} /></div>
                            <div className="d">avg {rpShort(kpiSummary.avgReceipt)}</div>
                        </div>
                        <div className="kpm-rep-k">
                            <div className="l">Moved</div>
                            <div className="v sm"><RollingNumber text={`${kpiSummary.totalBks.toLocaleString('id-ID')} Bks`} /></div>
                            <div className="d">{formatRupiah(kpiSummary.settledPaid)} notes paid</div>
                        </div>
                        <div className="kpm-rep-k">
                            <div className="l">Shops served</div>
                            <div className="v sm"><RollingNumber text={String(kpiSummary.shopsServed)} /></div>
                            <div className="d">+ {kpiSummary.walkIns} walk-in (Ecer)</div>
                        </div>
                        <div className="kpm-rep-k mixk">
                            <div className="l"><span>How they paid</span><span>{rpShort(kpiSummary.mixTotal)}</span></div>
                            <div className="kpm-rep-mix">
                                {kpiSummary.mixEntries.map(([label, val, cls]) => (
                                    <span key={label} className={cls} style={{ width: `${(val / (kpiSummary.mixTotal || 1)) * 100}%` }} title={label} />
                                ))}
                            </div>
                            <div className="kpm-rep-mixl">
                                {kpiSummary.mixEntries.map(([label, val, cls]) => (
                                    <span key={label}><i className={cls} />{label} {Math.round((val / (kpiSummary.mixTotal || 1)) * 100)}%</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ARCHIVE BANNER */}
                    {isPartialWindow && (
                        <div className="kpm-rep-part">
                            <span>Showing the last 7 days live feed. This {RANGE_UNIT[rangeType]} starts on {shortDateLabel(windowRange[0])}.</span>
                            {!isFieldAgent ? (
                                <button type="button" onClick={handlePullArchive} disabled={isFetchingHistory} className="kpm-edge-btn px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
                                    {isFetchingHistory ? <RotateCw size={13} className="animate-spin" /> : <Archive size={13} />}
                                    {isFetchingHistory ? 'Extracting...' : 'Pull archive'}
                                </button>
                            ) : (
                                <span>Ask an admin for older receipts.</span>
                            )}
                        </div>
                    )}

                    {/* 3. UNDERLINE TABS */}
                    <div className="kpm-rep-tabs" role="tablist">
                        {[
                            ['ledger', 'Ledger', contextualTransactions.length],
                            ['folders', 'Folders', ''],
                            ['products', 'Products', productRows.rows.length],
                            ...(!isFieldAgent ? [['salesmen', 'Salesmen', stats.agentRoster.length]] : []),
                            ['returns', 'Returns', returnRows.length],
                        ].map(([key, label, count]) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                className="kpm-rep-tab"
                                aria-selected={activeTab === key}
                                onClick={() => setActiveTab(key)}
                            >
                                {label}
                                {count !== '' && <span className="n">{count}</span>}
                            </button>
                        ))}
                    </div>

                    {/* 4. TAB PANELS */}
                    {activeTab === 'ledger' && (
                        <div className="kpm-rep-work">
                            <aside className="kpm-rep-list">
                                <div className="kpm-rep-rows">
                                    {ledgerDays.length === 0 ? (
                                        <div className="p-10 text-center text-sm text-[var(--ink-dim)]">
                                            No receipts match. Clear the search or pick another date / pull archive.
                                        </div>
                                    ) : (
                                        ledgerDays.map(day => (
                                            <React.Fragment key={day.date}>
                                                <div className="kpm-rep-day">
                                                    <span>{dayHeading(day.date)}</span>
                                                    <span>{day.count} receipts · {formatRupiah(day.omset)}</span>
                                                </div>
                                                {day.rows.map(t => {
                                                    const chip = chipForTx(t);
                                                    const isRetur = t.type === 'RETUR' || t.paymentType === 'Retur/BS';
                                                    const isZero = t.paymentType === 'Tukar Ganti' || t.paymentType === 'IOU Fulfillment';
                                                    const rawAmt = Number(t.total || t.amountPaid) || 0;
                                                    const rowAmt = isRetur && rawAmt > 0 ? -Math.abs(rawAmt) : isZero ? 0 : rawAmt;
                                                    const isSelectedDesktop = activeTx?.id === t.id;
                                                    const isOpenPhone = resolvedPhoneOpenId === t.id;

                                                    return (
                                                        <React.Fragment key={t.id}>
                                                            <button
                                                                type="button"
                                                                className={`kpm-rep-r ${isSelectedDesktop ? 'sel' : ''}`}
                                                                onClick={() => {
                                                                    setSelectedTxId(t.id);
                                                                    setOpenPhoneTxId(curr => (curr === undefined ? (t.id === contextualTransactions[0]?.id ? null : t.id) : (curr === t.id ? null : t.id)));
                                                                }}
                                                            >
                                                                <span className="t">{txTime(t)}</span>
                                                                <span className="sh">
                                                                    <b>
                                                                        {t.customerName || 'Walk-in Customer'}
                                                                        {t.offers?.length > 0 && <span className="kpm-rep-pk">PAKET</span>}
                                                                    </b>
                                                                    <span>{txAreaText(t)}</span>
                                                                </span>
                                                                <span className="ag">{(t.agentName || 'Admin').split(' ')[0]}</span>
                                                                <span className={`kpm-rep-chip ${chip.cls}`}>{chip.label}</span>
                                                                <span className={`am ${rowAmt < 0 ? 'neg' : rowAmt === 0 ? 'zero' : ''}`}>
                                                                    {formatRupiah(rowAmt)}
                                                                </span>
                                                            </button>
                                                            {isOpenPhone && (
                                                                <div className="kpm-rep-under">
                                                                    {renderTxDetail(t, true)}
                                                                </div>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))
                                    )}
                                </div>
                            </aside>

                            <section className="kpm-rep-hand">
                                {activeTx ? (
                                    <>
                                        <div className="kpm-rep-hin">
                                            {renderTxDetail(activeTx, false)}
                                        </div>
                                        <div className="kpm-rep-act">
                                            {renderActionButtons(activeTx, false)}
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-10 text-center text-sm text-[var(--ink-dim)]">
                                        Pick a receipt from the list.
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {activeTab === 'folders' && (
                        <div className="kpm-rep-pane">
                            <div className="kpm-rep-crumb">
                                {reportAccessLevel === 'global' && (
                                    <button type="button" onClick={() => { setSelectedRegion(null); setSelectedAgent(null); setSelectedProv(null); setSelectedKab(null); setSelectedKec(null); setSelectedCustomer(null); }}>
                                        Master HQ
                                    </button>
                                )}
                                {selectedRegion && (
                                    <>
                                        {reportAccessLevel === 'global' && <span>›</span>}
                                        {!isFieldAgent && folderLevel !== 'agent' ? (
                                            <button type="button" onClick={() => { setSelectedAgent(null); setSelectedProv(null); setSelectedKab(null); setSelectedKec(null); setSelectedCustomer(null); }}>{selectedRegion}</button>
                                        ) : (
                                            <b>{selectedRegion}</b>
                                        )}
                                    </>
                                )}
                                {selectedAgent && (
                                    <>
                                        <span>›</span>
                                        {folderLevel !== 'prov' ? (
                                            <button type="button" onClick={() => { setSelectedProv(null); setSelectedKab(null); setSelectedKec(null); setSelectedCustomer(null); }}>{selectedAgent}</button>
                                        ) : (
                                            <b>{selectedAgent}</b>
                                        )}
                                    </>
                                )}
                                {selectedProv && (
                                    <>
                                        <span>›</span>
                                        {folderLevel !== 'kab' ? (
                                            <button type="button" onClick={() => { setSelectedKab(null); setSelectedKec(null); setSelectedCustomer(null); }}>{selectedProv}</button>
                                        ) : (
                                            <b>{selectedProv}</b>
                                        )}
                                    </>
                                )}
                                {selectedKab && (
                                    <>
                                        <span>›</span>
                                        {folderLevel !== 'kec' ? (
                                            <button type="button" onClick={() => { setSelectedKec(null); setSelectedCustomer(null); }}>{selectedKab}</button>
                                        ) : (
                                            <b>{selectedKab}</b>
                                        )}
                                    </>
                                )}
                                {selectedKec && (
                                    <>
                                        <span>›</span>
                                        {folderLevel !== 'store' ? (
                                            <button type="button" onClick={() => setSelectedCustomer(null)}>{selectedKec}</button>
                                        ) : (
                                            <b>{selectedKec}</b>
                                        )}
                                    </>
                                )}
                                {selectedCustomer && <><span>›</span><b>{selectedCustomer}</b></>}
                            </div>

                            {folderLevel !== 'archive' ? (() => {
                                let nodes = [];
                                let levelTitle = 'Region';
                                let onPick = () => {};
                                if (folderLevel === 'region') {
                                    levelTitle = 'Regions';
                                    nodes = Object.values(reportData);
                                    onPick = (name) => setSelectedRegion(name);
                                } else if (folderLevel === 'agent') {
                                    levelTitle = 'Salesmen';
                                    nodes = Object.values(reportData[selectedRegion]?.agents || {});
                                    onPick = (name) => setSelectedAgent(name);
                                } else if (folderLevel === 'prov') {
                                    levelTitle = 'Provinsi';
                                    nodes = Object.values(reportData[selectedRegion]?.agents[selectedAgent]?.provinsi || {});
                                    onPick = (name) => setSelectedProv(name);
                                } else if (folderLevel === 'kab') {
                                    levelTitle = 'Kabupaten';
                                    nodes = Object.values(reportData[selectedRegion]?.agents[selectedAgent]?.provinsi[selectedProv]?.kabupaten || {});
                                    onPick = (name) => setSelectedKab(name);
                                } else if (folderLevel === 'kec') {
                                    levelTitle = 'Kecamatan';
                                    nodes = Object.values(reportData[selectedRegion]?.agents[selectedAgent]?.provinsi[selectedProv]?.kabupaten[selectedKab]?.kecamatan || {});
                                    onPick = (name) => setSelectedKec(name);
                                } else {
                                    levelTitle = 'Shops';
                                    nodes = Object.values(reportData[selectedRegion]?.agents[selectedAgent]?.provinsi[selectedProv]?.kabupaten[selectedKab]?.kecamatan[selectedKec]?.stores || {});
                                    onPick = (name) => setSelectedCustomer(name);
                                }
                                nodes.sort((a, b) => b.total - a.total);
                                const sumOm = nodes.reduce((s, n) => s + n.total, 0);

                                return (
                                    <>
                                        <div className="kpm-rep-sec">
                                            <span>{levelTitle} · {nodes.length}</span>
                                            <span>{formatRupiah(sumOm)}</span>
                                        </div>
                                        {nodes.length === 0 ? (
                                            <p className="text-xs text-[var(--ink-dim)] m-0">Nothing in this range.</p>
                                        ) : (
                                            <div className="kpm-rep-folders">
                                                {nodes.map(node => (
                                                    <button key={node.name} type="button" className="kpm-rep-fold" onClick={() => onPick(node.name)}>
                                                        <span className="fi"><Folder size={16} /></span>
                                                        <span className="min-w-0">
                                                            <b>{node.name}</b>
                                                            <span>{node.count} records</span>
                                                        </span>
                                                        <span className="fv">{rpShort(node.total)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                );
                            })() : (() => {
                                const cObj = reportData[selectedRegion]?.agents[selectedAgent]?.provinsi[selectedProv]?.kabupaten[selectedKab]?.kecamatan[selectedKec]?.stores[selectedCustomer];
                                if (!cObj) return <p className="text-xs text-[var(--ink-dim)]">No archive records for this store in this range.</p>;
                                return (
                                    <>
                                        <div className="kpm-rep-sec">
                                            <span>Receipt archive · {cObj.name}</span>
                                            <span>Account total {formatRupiah(cObj.total)}</span>
                                        </div>
                                        <div className="kpm-rep-tblw">
                                            <table className="kpm-rep-tbl">
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Type</th>
                                                        <th className="kpm-rep-hide-ph">Items</th>
                                                        <th className="num">Amount</th>
                                                        <th />
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {cObj.history.map(t => {
                                                        const isRetur = t.type === 'RETUR' || t.paymentType === 'Retur/BS';
                                                        const val = Number(t.amountPaid || t.total) || 0;
                                                        return (
                                                            <tr
                                                                key={t.id}
                                                                className="kpm-rep-rowbtn"
                                                                onClick={() => { setSelectedTxId(t.id); setOpenPhoneTxId(t.id); setActiveTab('ledger'); }}
                                                            >
                                                                <td>{shortDateLabel(t.date)} {txTime(t)}</td>
                                                                <td>{t.type === 'CONSIGNMENT_PAYMENT' ? 'Store Audit' : (t.paymentType || 'Cash')}</td>
                                                                <td className="kpm-rep-hide-ph">{txRowItems(t)}</td>
                                                                <td className={`num ${isRetur && val > 0 ? 'text-[var(--danger-ink)]' : ''}`}>
                                                                    {isRetur && val > 0 ? '-' : ''}{formatRupiah(val)}
                                                                </td>
                                                                <td className="num">›</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        {isAdmin && (
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteFolder(cObj.name, selectedAgent)}
                                                    className="kpm-edge-btn danger px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                                                >
                                                    <Trash2 size={14} /> Delete all history for this shop
                                                </button>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="kpm-rep-pane">
                            <div className="kpm-rep-sec">
                                <span>Product performance</span>
                                <span>tap a row to see its receipts</span>
                            </div>
                            <div className="kpm-rep-tblw">
                                <table className="kpm-rep-tbl">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th className="num">Moved</th>
                                            <th className="num kpm-rep-hide-ph">Shops</th>
                                            <th className="num">Omset</th>
                                            <th className="kpm-rep-hide-ph">Share</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productRows.rows.length === 0 ? (
                                            <tr><td colSpan={5} className="text-[var(--ink-dim)]">No sales in this range.</td></tr>
                                        ) : (
                                            productRows.rows.map(row => (
                                                <tr
                                                    key={row.name}
                                                    className="kpm-rep-rowbtn"
                                                    onClick={() => { setSearchTerm(row.name); setActiveTab('ledger'); }}
                                                >
                                                    <td><b>{row.name}</b></td>
                                                    <td className="num">{row.qty.toLocaleString('id-ID')} Bks</td>
                                                    <td className="num kpm-rep-hide-ph">{row.shops}</td>
                                                    <td className="num">{formatRupiah(row.om)}</td>
                                                    <td className="kpm-rep-hide-ph" style={{ width: '24%' }}>
                                                        <div className="kpm-rep-bar"><span style={{ width: `${Math.max(2, (row.om / productRows.maxOm) * 100)}%` }} /></div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div data-guide="offer-performance" className="space-y-3 pt-2">
                                <div className="kpm-rep-sec">
                                    <span>Offer performance</span>
                                    <span>packages sold</span>
                                </div>
                                <div className="kpm-rep-tblw">
                                    <table className="kpm-rep-tbl">
                                        <thead>
                                            <tr>
                                                <th>Offer</th>
                                                <th className="num">Sales</th>
                                                <th className="num kpm-rep-hide-ph">Shops</th>
                                                <th className="num">Omset</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {offerStats.length === 0 ? (
                                                <tr><td colSpan={4} className="text-[var(--ink-dim)]">No package sales in this range.</td></tr>
                                            ) : (
                                                offerStats.map((o, i) => (
                                                    <tr
                                                        key={o.id}
                                                        className="kpm-rep-rowbtn"
                                                        onClick={() => { setSearchTerm(o.name); setActiveTab('ledger'); }}
                                                    >
                                                        <td>
                                                            <b>{o.name}</b>
                                                            {i === 0 && <span className="kpm-rep-pk ml-2">BEST</span>}
                                                            <div className="text-[11px] text-[var(--ink-dim)]">{o.region ? `${o.region} only` : 'All areas'}</div>
                                                        </td>
                                                        <td className="num">{o.sales}</td>
                                                        <td className="num kpm-rep-hide-ph">{o.shops}</td>
                                                        <td className="num">{formatRupiah(o.rp)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'salesmen' && !isFieldAgent && (
                        <div className="kpm-rep-pane">
                            <div className="kpm-rep-sec">
                                <span>Agent roster</span>
                                <span>tap a name to open breakdown</span>
                            </div>
                            <div className="kpm-rep-tblw">
                                <table className="kpm-rep-tbl">
                                    <thead>
                                        <tr>
                                            <th>Salesman</th>
                                            <th className="num">Receipts</th>
                                            <th className="num kpm-rep-hide-ph">Moved</th>
                                            <th className="num">Omset</th>
                                            <th className="kpm-rep-hide-ph" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.agentRoster.length === 0 ? (
                                            <tr><td colSpan={5} className="text-[var(--ink-dim)]">No agent activity logged.</td></tr>
                                        ) : (
                                            stats.agentRoster.map(agent => {
                                                const isOpen = expandedAgent === agent.name;
                                                const agentBks = Object.values(agent.items || {}).reduce((s, d) => s + d.qty, 0);
                                                const agentProfile = motorists?.find(m => m.id === agent.agentId) || {};
                                                const topItems = Object.entries(agent.items || {}).sort((a, b) => b[1].val - a[1].val).slice(0, 3);
                                                return (
                                                    <React.Fragment key={agent.name}>
                                                        <tr className="kpm-rep-rowbtn" onClick={() => setExpandedAgent(isOpen ? null : agent.name)}>
                                                            <td>
                                                                <b>{agent.name}</b>
                                                                <div className="text-[11.5px] text-[var(--ink-dim)]">{canonicalPlace(agentProfile.location) || 'Headquarters'}</div>
                                                            </td>
                                                            <td className="num">{agent.count}</td>
                                                            <td className="num kpm-rep-hide-ph">{agentBks.toLocaleString('id-ID')} Bks</td>
                                                            <td className={`num ${agent.total < 0 ? 'text-[var(--danger-ink)]' : ''}`}>{formatRupiah(agent.total)}</td>
                                                            <td className="kpm-rep-hide-ph" style={{ width: '20%' }}>
                                                                <div className="kpm-rep-bar"><span style={{ width: `${Math.max(2, (Math.max(0, agent.total) / maxRosterOmset) * 100)}%` }} /></div>
                                                            </td>
                                                        </tr>
                                                        {isOpen && (
                                                            <tr>
                                                                <td colSpan={5} className="bg-[var(--inset)]">
                                                                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ink-muted)]">
                                                                        <span>
                                                                            Top: {topItems.length ? topItems.map(([n, d]) => `${n} (${d.qty} Bks)`).join(', ') : '—'}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            className="kpm-edge-btn px-2.5 py-1 rounded-md text-xs font-semibold"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const match = agentOptions.find(a => a.name === agent.name);
                                                                                if (match && reportAccessLevel === 'global') setSelectedRegion(match.region);
                                                                                setSelectedAgent(agent.name);
                                                                                setActiveTab('ledger');
                                                                            }}
                                                                        >
                                                                            Show receipts
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'returns' && (
                        <div className="kpm-rep-pane">
                            <div className="kpm-rep-sec">
                                <span>Returns (damaged goods)</span>
                                <span>{formatRupiah(returnRows.reduce((s, t) => s - Math.abs(t.total || t.amountPaid || 0), 0))}</span>
                            </div>
                            <div className="kpm-rep-tblw">
                                <table className="kpm-rep-tbl">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Shop</th>
                                            <th className="kpm-rep-hide-ph">Salesman</th>
                                            <th>Items</th>
                                            <th className="num">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {returnRows.length === 0 ? (
                                            <tr><td colSpan={5} className="text-[var(--ink-dim)]">No returns in this range. Clean.</td></tr>
                                        ) : (
                                            returnRows.map(t => (
                                                <tr
                                                    key={t.id}
                                                    className="kpm-rep-rowbtn"
                                                    onClick={() => { setSelectedTxId(t.id); setOpenPhoneTxId(t.id); setActiveTab('ledger'); }}
                                                >
                                                    <td>{shortDateLabel(t.date)}</td>
                                                    <td>
                                                        <b>{t.customerName || 'Walk-in'}</b>
                                                        {pkgFlaggedIds.has(t.id) && <span className="ml-1.5 text-[var(--danger-ink)] font-semibold">· package ≤7 days</span>}
                                                    </td>
                                                    <td className="kpm-rep-hide-ph">{(t.agentName || 'Admin').split(' ')[0]}</td>
                                                    <td>{txRowItems(t)}</td>
                                                    <td className="num text-[var(--danger-ink)]">-{formatRupiah(Math.abs(t.total || t.amountPaid || 0))}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {!isFieldAgent && (
                                <div className="space-y-3 pt-2" data-guide="package-returns">
                                    <div className="kpm-rep-sec">
                                        <span>Package, then Retur within 7 days</span>
                                        <span>{pkgReturns.length} flagged</span>
                                    </div>
                                    <p className="text-xs text-[var(--ink-dim)] m-0">
                                        The shop took a package, then sent back that package's cigarettes as a Retur within 7 days. Nothing is blocked - this is only to see it.
                                    </p>
                                    {pkgReturns.length === 0 ? (
                                        <p className="text-xs text-[var(--ink-muted)] m-0">None in this period.</p>
                                    ) : (
                                        <div className="kpm-rep-tblw">
                                            <table className="kpm-rep-tbl">
                                                <tbody>
                                                    {pkgReturns.map((r, i) => (
                                                        <tr key={i}>
                                                            <td><b>{r.shop}</b></td>
                                                            <td>{r.offer} on {shortDay(r.soldAt)} by {r.salesman} · Retur on {shortDay(r.returnedAt)} by {r.returnedBy}: {r.items.join(', ')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {countClears.length > 0 && (
                                        <p className="text-xs text-[var(--ink-muted)] m-0">
                                            <span className="font-bold text-[var(--ink)]">Package counts cleared, last 30 days:</span> {countClears.map(c => `${c.shop} (${c.offer}, ${shortDay(c.at)})`).join(' · ')}. Who cleared each one is in the audit log.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* === PRINT ANALYTICS SUMMARY (visible only when printing at printScale%) === */}
            <div className="kpm-rep-print-only print-container p-6 text-[var(--ink)] bg-[var(--raised)]">
                <div className="flex justify-between items-end pb-3 mb-4 border-b-2 border-[var(--accent-edge)]">
                    <div>
                        <h1 className="text-2xl font-bold uppercase m-0">
                            {isFieldAgent ? 'My Performance' : selectedAgent ? `${selectedAgent}'s Performance` : selectedRegion ? `${selectedRegion} Operations` : 'Global Master Analytics'}
                        </h1>
                        <p className="text-xs text-[var(--ink-muted)] mt-1">{rangeType.toUpperCase()} RECAP · {winLabel}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-[var(--ink-muted)]">Context Omset</p>
                        <p className="text-2xl font-bold">{formatRupiah(stats.totalRev)}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 border border-[var(--line)] rounded-lg"><div className="text-[10px] uppercase text-[var(--ink-dim)]">Receipts</div><div className="text-lg font-bold">{stats.count}</div></div>
                    <div className="p-3 border border-[var(--line)] rounded-lg"><div className="text-[10px] uppercase text-[var(--ink-dim)]">Items Moved (Bks)</div><div className="text-lg font-bold">{kpiSummary.totalBks}</div></div>
                </div>
                <h3 className="text-sm font-bold uppercase mb-2">Product Performance</h3>
                <table className="kpm-rep-tbl mb-6">
                    <thead><tr><th>Product</th><th className="num">Qty (Bks)</th><th className="num">Omset</th></tr></thead>
                    <tbody>
                        {productRows.rows.map(r => (
                            <tr key={r.name}><td>{r.name}</td><td className="num">{r.qty}</td><td className="num">{formatRupiah(r.om)}</td></tr>
                        ))}
                    </tbody>
                </table>
                {offerStats.length > 0 && (
                    <>
                        <h3 className="text-sm font-bold uppercase mb-2">Offer Performance</h3>
                        <table className="kpm-rep-tbl mb-6">
                            <thead><tr><th>Offer</th><th className="num">Sales</th><th className="num">Shops</th><th className="num">Omset</th></tr></thead>
                            <tbody>
                                {offerStats.map(o => (
                                    <tr key={o.id}><td>{o.name}</td><td className="num">{o.sales}</td><td className="num">{o.shops}</td><td className="num">{formatRupiah(o.rp)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>

            {/* === MODALS === */}
            {viewingPhoto && (
                <div className="fixed inset-0 z-[600] bg-[var(--panel)] flex flex-col items-center justify-center p-4 animate-fade-in">
                    <button type="button" onClick={() => setViewingPhoto(null)} className="absolute top-6 right-6 text-[var(--ink)] hover:text-[var(--danger-text)] z-50 bg-[var(--panel)] p-2 rounded-full transition-colors"><X size={32} /></button>
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
                    <div className="bg-[var(--raised)] p-6 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col border border-[var(--line)]">
                        <h3 className="font-black text-xl mb-4 text-[var(--ink)] flex items-center gap-2"><Pencil size={22} className="text-[var(--accent-ink)]" /> DATA AUDIT</h3>
                        <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[var(--panel)] p-4 rounded-xl border border-[var(--line)]">
                                <div>
                                    <label className="text-[10px] font-bold text-[var(--ink-muted)] uppercase">Date</label>
                                    <input type="date" value={editingTrans.date || ''} onChange={e => setEditingTrans({ ...editingTrans, date: e.target.value })} className="w-full p-2 text-sm border rounded bg-[var(--raised)] border-[var(--line)] text-[var(--ink)] outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[var(--ink-muted)] uppercase">Customer Name</label>
                                    <input type="text" value={editingTrans.customerName || ''} onChange={e => setEditingTrans({ ...editingTrans, customerName: e.target.value })} className="w-full p-2 text-sm border rounded bg-[var(--raised)] border-[var(--line)] text-[var(--ink)] outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[var(--accent-ink)] uppercase">Pricing Tier</label>
                                    <select value={editingTrans.priceTier || 'Retail'} onChange={handleEditTierChange} className="w-full p-2 text-sm border rounded bg-[var(--raised)] border-[var(--line)] font-bold text-[var(--accent-ink)] outline-none">
                                        <option value="Grosir">Grosir</option>
                                        <option value="Retail">Retail</option>
                                        <option value="Ecer">Ecer</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border border-[var(--line-2)] rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-[var(--panel)] p-3 flex justify-between items-center border-b border-[var(--accent-edge)]">
                                    <span className="font-bold text-xs uppercase tracking-widest text-[var(--ink)]">Itemized Receipt</span>
                                    <button type="button" onClick={() => setEditingTrans({ ...editingTrans, items: [...(editingTrans.items || []), { productId: '', name: 'Select Product', qty: 1, unit: 'Bks', calculatedPrice: 0 }] })} className="kpm-edge-btn text-[10px] px-3 py-1.5 rounded font-bold">+ ADD ITEM</button>
                                </div>
                                <div className="p-3 space-y-2 bg-[var(--raised)]">
                                    {(editingTrans.items || []).map((item, idx) => (
                                        <div key={idx} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-[var(--panel)] p-2 rounded-lg border border-[var(--line)]">
                                            <select value={item.productId || ''} onChange={(e) => handleEditItemChange(idx, 'productId', e.target.value)} className="flex-1 p-2 text-xs font-bold border rounded bg-[var(--raised)] border-[var(--line)] text-[var(--ink)] outline-none min-w-[150px]">
                                                <option value="">-- Select Product --</option>
                                                {inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <input type="number" min="1" value={item.qty} onChange={(e) => handleEditItemChange(idx, 'qty', Number(e.target.value))} className="w-16 p-2 text-xs text-center border rounded bg-[var(--raised)] border-[var(--line)] text-[var(--ink)] font-bold outline-none" />
                                            <select value={item.unit} onChange={(e) => handleEditItemChange(idx, 'unit', e.target.value)} className="w-20 p-2 text-xs font-bold border rounded bg-[var(--raised)] border-[var(--line)] text-[var(--ink)] outline-none">
                                                <option value="Bks">Bks</option>
                                                <option value="Slop">Slop</option>
                                                <option value="Karton">Karton</option>
                                            </select>
                                            <input type="number" value={item.calculatedPrice} onChange={(e) => handleEditItemChange(idx, 'calculatedPrice', Number(e.target.value))} className="w-28 p-2 text-xs text-right border rounded bg-[var(--raised)] border-[var(--line)] text-[var(--ink)] font-bold outline-none" placeholder="Price/Unit" />
                                            <button data-kpm-del data-label="Delete" type="button" onClick={() => {
                                                    const newItems = editingTrans.items.filter((_, i) => i !== idx);
                                                    const newTotal = newItems.reduce((sum, it) => sum + ((it.calculatedPrice || 0) * it.qty), 0);
                                                    setEditingTrans({ ...editingTrans, items: newItems, total: newTotal, amountPaid: newTotal });
                                                }}
                                                className="p-2 text-[var(--ink-muted)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-well)] rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-[var(--verified-fill)] p-4 rounded-xl border border-[var(--line-2)]">
                                <div>
                                    <span className="font-black text-sm uppercase tracking-widest text-[var(--verified)] block">Grand Total</span>
                                </div>
                                <input type="number" value={editingTrans.total} onChange={e => setEditingTrans({ ...editingTrans, total: Number(e.target.value), amountPaid: Number(e.target.value) })} className="w-40 p-2 text-right border-2 border-[var(--line-2)] rounded-lg bg-[var(--raised)] text-[var(--ink)] font-black text-xl outline-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-5 mt-2 shrink-0">
                            <button type="button" onClick={() => setEditingTrans(null)} className="kpm-edge-btn quiet flex-1 py-3.5 rounded-xl font-bold">Cancel</button>
                            <button type="button" onClick={handleEditSubmit} className="kpm-edge-btn flex-1 py-3.5 rounded-xl font-bold">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* RECEIPT PRINTER MODAL */}
            {viewingReceipt && (
                <SaleReceipt tx={viewingReceipt} appSettings={appSettings} onClose={() => setViewingReceipt(null)}
                    shop={(customers || []).find(c => storeKey(c.name) === storeKey(viewingReceipt.customerName))} />
            )}
        </div>
    );
}
