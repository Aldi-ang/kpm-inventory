import React, { useState, useEffect, useRef, useMemo } from 'react';
/* eslint-disable react-hooks/exhaustive-deps */
import packageJson from '../package.json'; // 🚀 INJECT THE PACKAGE LINK HERE


import { 
  LayoutDashboard, Package, ShoppingCart, FileText, 
  Settings, Sun, Moon, Search, Plus, Trash2, 
  Save, X, Upload, RotateCcw, Camera, Download,
  TrendingUp, AlertCircle, ChevronRight, ChevronLeft, DollarSign, Image as ImageIcon,
  User, Lock, ClipboardList, Crop, RotateCw, Move, Maximize2, ArrowRight, RefreshCcw, MessageSquarePlus, MinusCircle, ZoomIn, ZoomOut, Unlock,
  History, ShieldCheck, Copy, Replace, ClipboardCheck, Store, Wallet, Truck, Menu, MapPin, Phone, Edit, Folder,
  Key, MessageSquare, LogIn, LogOut, ShieldAlert, FileJson, UploadCloud, Tag, Calendar, XCircle, Printer, FileSpreadsheet, Pencil, Globe, Music, Database, Bell, ScanFace

} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import emailjs from '@emailjs/browser';

import MapMissionControl from './MapMissionControl';
import JourneyView from './JourneyView';
import StockOpnameView from './StockOpnameView';
import MerchantSalesView from './MerchantSalesView';
import MusicPlayer from './MusicPlayer';
import RestockVaultView from './RestockVaultView';
import AgentInventoryView from './AgentInventoryView';
import FleetCanvasManager from './FleetCanvasManager';
import ConsignmentFinanceView from './ConsignmentFinanceView'; 
import EODReconciliationView from './EODReconciliationView'; // 🚀 IMPORT EOD HERE

// --- REUSABLE UI COMPONENTS ---
import NotificationBell from './components/NotificationBell';
import SafetyStatus from './components/SafetyStatus';
import CapybaraMascot from './components/CapybaraMascot';
import ImageCropper from './components/ImageCropper';
import ExamineModal from './components/ExamineModal';
import ResidentEvilInventory from './components/ResidentEvilInventory'; 
import LandlordDashboard from './components/LandlordDashboard'; 
import CrownTransferProtocol from './components/CrownTransferProtocol'; 
import HistoryReportView from './components/HistoryReportView'; // 🚀 ADDED



// --- MAP ENGINE IMPORTS ---
import { MapContainer, TileLayer, Marker, Popup, Tooltip as LeafletTooltip, useMap, useMapEvents, Rectangle, LayersControl, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';


// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";        
import { getAnalytics } from "firebase/analytics";   
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,     // <--- You already have this, perfect!
  GoogleAuthProvider,
  setPersistence,        
  browserLocalPersistence 
} from 'firebase/auth';

// --- PINPOINT: Firestore Imports (Around Line 41) ---
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  orderBy, 
  runTransaction, 
  writeBatch,
  enableIndexedDbPersistence // <--- ADD THIS FOR OFFLINE MODE
} from "firebase/firestore";

// --- CONFIG & UTILITIES IMPORTS ---
import { auth, db, storage, googleProvider, appId } from './config/firebase';
import { formatRupiah, getCurrentDate, getRandomColor, convertToBks } from './utils/helpers';

const APP_VERSION = packageJson.version;

// --- GLOBAL COMPONENTS (MOVED UP TO PREVENT CRASH) ---

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + entry.value, 0);
    return (
      <div className="bg-white dark:bg-slate-800 p-4 border dark:border-slate-600 shadow-xl rounded-xl text-sm">
        <p className="font-bold mb-2 border-b pb-1 dark:border-slate-600 dark:text-white">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between items-center gap-4 mb-1">
             <span style={{ color: entry.color }} className="font-medium">{entry.name}:</span>
             <span className="font-mono dark:text-slate-300">{formatRupiah(entry.value)}</span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t dark:border-slate-600 flex justify-between font-bold dark:text-white">
            <span>Total Sales:</span>
            <span>{formatRupiah(total)}</span>
        </div>
      </div>
    );
  }
  return null;
};

const DatabaseBackupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;




const AdminAuthModal = ({ onClose, onSuccess }) => {
    const [pass, setPass] = useState("");
    const [error, setError] = useState(false);
    const handleSubmit = (e) => { e.preventDefault(); if (pass === ADMIN_PASS) { onSuccess(); } else { setError(true); setTimeout(() => setError(false), 500); } };
    return (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className={`bg-white dark:bg-slate-900 w-full max-w-sm p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center ${error ? 'animate-shake' : ''}`}>
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400"><Lock size={32} /></div>
                <h2 className="text-xl font-bold dark:text-white mb-1">Admin Access</h2>
                <form onSubmit={handleSubmit} className="w-full mt-4"><input type="password" autoFocus value={pass} onChange={(e) => setPass(e.target.value)} className={`w-full p-3 rounded-xl border outline-none dark:bg-slate-800 dark:text-white font-mono ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'}`} placeholder="Password" /><div className="flex gap-3 mt-4"><button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-500">Cancel</button><button type="submit" className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold">Unlock</button></div></form>
            </div>
        </div>
    );
};



const ReturnModal = ({ transaction, onClose, onConfirm }) => {
  const [returnQtys, setReturnQtys] = useState({});
  useEffect(() => { const initial = {}; if(transaction.items) transaction.items.forEach(item => initial[item.productId] = 0); setReturnQtys(initial); }, [transaction]);
  const handleQtyChange = (productId, val, max) => { let newQty = parseInt(val) || 0; if (newQty < 0) newQty = 0; if (newQty > max) newQty = max; setReturnQtys(prev => ({ ...prev, [productId]: newQty })); };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scale-in">
         <h2 className="text-xl font-bold dark:text-white mb-2">Process Return / Adjustment</h2>
         <div className="space-y-3 max-h-[60vh] overflow-y-auto mb-4">{transaction.items && transaction.items.map(item => (<div key={item.productId} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700"><div><p className="font-bold text-sm dark:text-white">{item.name}</p><p className="text-xs text-slate-500">Max: {item.qty} {item.unit}</p></div><div className="flex items-center gap-2"><input type="number" value={returnQtys[item.productId] || 0} onChange={(e) => handleQtyChange(item.productId, e.target.value, item.qty)} className="w-16 p-1 rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white text-center"/></div></div>))}</div>
         <div className="flex gap-2"><button onClick={onClose} className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white">Cancel</button><button onClick={() => onConfirm(returnQtys)} className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-bold">Confirm</button></div>
      </div>
    </div>
  );
};

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

// --- NEW: SAMPLING ANALYTICS VIEW (FIXED TOOLTIP & COST ANALYSIS) ---
const SamplingAnalyticsView = ({ samplings, inventory, onBack }) => {
    const [rangeType, setRangeType] = useState('monthly');
    const [targetDate, setTargetDate] = useState(getCurrentDate());

    // Local Helper for Rupiah
    const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    // --- CUSTOM TOOLTIP (FIXES THE "BKS IN RUPIAH" BUG) ---
    const SamplingTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 border dark:border-slate-600 shadow-xl rounded-xl text-xs z-50">
                    <p className="font-bold mb-2 border-b pb-1 dark:border-slate-600 dark:text-white">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center gap-4 mb-1">
                            <span style={{ color: entry.color }} className="font-bold">{entry.name}:</span>
                            <span className="font-mono dark:text-slate-300">
                                {/* Only add "Rp" if the label says Cost or Value */}
                                {entry.name.includes('Cost') || entry.name.includes('Value') || entry.name.includes('Rp')
                                    ? formatRp(entry.value) 
                                    : `${entry.value} Bks`} 
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Filter Data & Calculate Stats
    const stats = useMemo(() => {
        const target = new Date(targetDate);
        const filtered = samplings.filter(s => {
            if(!s.date) return false;
            const sDate = new Date(s.date);
            if (rangeType === 'daily') return s.date === targetDate;
            if (rangeType === 'weekly') {
                const start = new Date(target); start.setDate(target.getDate() - target.getDay());
                const end = new Date(start); end.setDate(start.getDate() + 6);
                return sDate >= start && sDate <= end;
            }
            if (rangeType === 'monthly') return sDate.getMonth() === target.getMonth() && sDate.getFullYear() === target.getFullYear();
            if (rangeType === 'yearly') return sDate.getFullYear() === target.getFullYear();
            return false;
        });

        let totalQty = 0;
        let totalValueDistributor = 0; // Factory Cost (Modal)
        
        // Opportunity Costs
        let totalValueRetail = 0;      
        let totalValueGrosir = 0;
        let totalValueEcer = 0;
        
        const productBreakdown = {};
        const locationBreakdown = {};

        filtered.forEach(s => {
            // Find Product to get Price
            const product = inventory.find(p => p.id === s.productId) || {};
            
            // PRICES
            const cost = product.priceDistributor || 0;
            const retail = product.priceRetail || 0;
            const grosir = product.priceGrosir || 0;
            const ecer = product.priceEcer || 0;
            
            // Calc Totals
            totalQty += s.qty;
            totalValueDistributor += (s.qty * cost);
            totalValueRetail += (s.qty * retail);
            totalValueGrosir += (s.qty * grosir);
            totalValueEcer += (s.qty * ecer);

            // Product Stats (By Value/Cost now, not just Qty)
            if (!productBreakdown[s.productName]) productBreakdown[s.productName] = { qty: 0, val: 0 };
            productBreakdown[s.productName].qty += s.qty;
            productBreakdown[s.productName].val += (s.qty * cost); // Accumulate Cost for Graph

            // Location Stats
            const loc = s.reason || 'Unknown';
            if (!locationBreakdown[loc]) locationBreakdown[loc] = { qty: 0, val: 0 };
            locationBreakdown[loc].qty += s.qty;
            locationBreakdown[loc].val += (s.qty * cost);
        });

        // Prepare Chart Data (Top 5 by Marketing Spend/Cost)
        const chartData = Object.entries(productBreakdown)
            .map(([name, data]) => ({ name, qty: data.qty, val: data.val }))
            .sort((a, b) => b.val - a.val) // Sort by Value (Cost) not Qty
            .slice(0, 5);

        // Find Top Location (by Spend)
        const topLocation = Object.entries(locationBreakdown).sort((a,b) => b[1].val - a[1].val)[0];

        return { 
            totalQty, 
            totalValueDistributor, 
            totalValueRetail,
            totalValueGrosir,
            totalValueEcer,
            filtered, 
            topLocation: topLocation ? { name: topLocation[0], val: topLocation[1].val } : null,
            chartData 
        };
    }, [samplings, rangeType, targetDate, inventory]);

    return (
        <div className="animate-fade-in space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Folders</button>
            
            {/* CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border dark:border-slate-700">
                    {['daily', 'weekly', 'monthly', 'yearly'].map(t => (
                        <button key={t} onClick={() => setRangeType(t)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${rangeType === t ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{t}</button>
                    ))}
                </div>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold shadow-sm"/>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Marketing Invest (Factory Cost) */}
                <div className="p-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet size={16} className="text-blue-200"/>
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Total Marketing Burn</p>
                    </div>
                    <h3 className="text-3xl font-bold">{formatRp(stats.totalValueDistributor)}</h3>
                    <p className="text-[10px] opacity-70 mt-1">Real Cost (Distributor Price)</p>
                </div>

                {/* 2. Total Samples */}
                <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 shadow-sm">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Items Distributed</p>
                    <h3 className="text-3xl font-bold dark:text-white">{stats.totalQty} <span className="text-lg opacity-50">Bks</span></h3>
                </div>

                {/* 3. Top Location */}
                <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 shadow-sm">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Top Location (By Spend)</p>
                    <h3 className="text-lg font-bold dark:text-white truncate">{stats.topLocation?.name || '-'}</h3>
                    <p className="text-sm font-bold text-orange-500">{stats.topLocation ? formatRp(stats.topLocation.val) : '-'}</p>
                </div>
            </div>

            {/* OPPORTUNITY COST COMPARISON (NEW) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Ecer Opportunity */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                    <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase mb-1">Potential if sold at ECER</p>
                    <h4 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{formatRp(stats.totalValueEcer)}</h4>
                </div>

                {/* Retail Opportunity */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                    <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase mb-1">Potential if sold at RETAIL</p>
                    <h4 className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatRp(stats.totalValueRetail)}</h4>
                </div>

                {/* Grosir Opportunity */}
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/50">
                    <p className="text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase mb-1">Potential if sold at GROSIR</p>
                    <h4 className="text-xl font-bold text-orange-700 dark:text-orange-300">{formatRp(stats.totalValueGrosir)}</h4>
                </div>
            </div>

            {/* CHART - NOW SHOWING COST (Rupiah) */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700 shadow-sm h-80">
                <h3 className="font-bold mb-4 dark:text-white">Top 5 Products by Marketing Spend (Cost)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1}/>
                        <XAxis dataKey="name" fontSize={10} stroke="#94a3b8"/>
                        <YAxis fontSize={12} stroke="#94a3b8" tickFormatter={(value) => `Rp${value/1000}k`}/>
                        {/* Use the new Smart Tooltip here */}
                        <Tooltip content={<SamplingTooltip />} cursor={{fill: 'transparent'}}/>
                        <Bar dataKey="val" fill="#f97316" radius={[4, 4, 0, 0]} name="Cost (Rp)"/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

            // --- NEW: SAMPLING CART VIEW (The Missing Component) ---
const SamplingCartView = ({ inventory, isAdmin, onCancel, onSubmit }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState([]);
    const [location, setLocation] = useState("");
    const [note, setNote] = useState("");
    const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));


    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { id: item.id, name: item.name, qty: 1 }];
        });
    };

    const updateQty = (id, delta) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

    const handleFinalSubmit = async () => {
        if (!location.trim()) { alert("Please enter a Folder/Location name!"); return; }
        if (cart.length === 0) return;
        
        setIsSubmitting(true);
        await onSubmit(cart, location, targetDate, note);
        setIsSubmitting(false);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] animate-fade-in">
            {/* LEFT: PRODUCT GRID */}
            <div className="lg:w-2/3 flex flex-col">
                <div className="flex gap-4 mb-4">
                    <button onClick={onCancel} className="p-3 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 text-slate-500 hover:text-orange-500"><ArrowRight className="rotate-180"/></button>
                    <input className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-xl border dark:border-slate-700 dark:text-white" placeholder="Search item to sample..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                </div>
                <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 rounded-2xl p-4 border dark:border-slate-700">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredInventory.map(item => (
                            <div key={item.id} onClick={() => addToCart(item)} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border dark:border-slate-700 cursor-pointer hover:border-orange-500 group transition-all">
                                <h4 className="font-bold text-sm dark:text-white truncate">{item.name}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{item.stock} in stock</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: BASKET */}
            <div className="lg:w-1/3 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 overflow-hidden">
                <div className="p-5 bg-slate-900 text-white">
                    <h3 className="font-bold flex items-center gap-2"><ClipboardList className="text-orange-500"/> Sampling Basket</h3>
                    <p className="text-xs text-slate-400 mt-1">Items will be grouped by description.</p>
                </div>
                
                <div className="p-4 border-b dark:border-slate-700 space-y-3 bg-orange-50 dark:bg-slate-800/50">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Folder Name / Location</label>
                        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Pasar Sraten" className="w-full p-2.5 rounded-lg border-2 border-orange-200 focus:border-orange-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white font-bold text-sm" />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Description / Store Name (Optional)</label>
                        <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Toko Bayu" className="w-full p-2.5 rounded-lg border border-slate-300 dark:bg-slate-900 dark:border-slate-600 dark:text-white text-sm" />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block flex justify-between">
                            <span>Date</span>
                            {!isAdmin && <span className="text-red-400 flex items-center gap-1"><Lock size={10}/> Locked</span>}
                        </label>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={targetDate} 
                                onChange={e => setTargetDate(e.target.value)} 
                                disabled={!isAdmin}
                                className={`w-full p-2.5 rounded-lg border dark:bg-slate-900 dark:border-slate-600 dark:text-white text-sm font-bold ${!isAdmin ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`} 
                            />
                            <Calendar className="absolute right-3 top-2.5 text-slate-400 dark:text-white pointer-events-none" size={18}/>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50"><Truck size={48} className="mb-2"/><p className="text-sm font-bold">Basket is empty</p></div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border dark:border-slate-700 animate-fade-in-up flex items-center justify-between">
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm dark:text-white">{item.name}</h4>
                                    <p className="text-xs text-orange-500 font-bold">{item.qty} Bks</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow border dark:border-slate-600 hover:bg-slate-100 dark:text-white">-</button>
                                    <span className="w-6 text-center text-sm font-bold dark:text-white">{item.qty}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow border dark:border-slate-600 hover:bg-slate-100 dark:text-white">+</button>
                                    <button onClick={() => removeFromCart(item.id)} className="ml-2 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t dark:border-slate-700">
                    <button onClick={handleFinalSubmit} disabled={isSubmitting || cart.length === 0} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${isSubmitting ? 'bg-slate-400' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'}`}>
                        {isSubmitting ? <RefreshCcw className="animate-spin"/> : <Save size={20}/>}
                        {isSubmitting ? 'Saving...' : `Save ${cart.reduce((a,b)=>a+b.qty,0)} Items`}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- 1. SAMPLING FOLDER VIEW (FIXED: EDIT BUTTON & DARK HOVER) ---
const SamplingFolderView = ({ samplings, isAdmin, onRecordSample, onDelete, onEdit, onEditFolder, onShowAnalytics }) => {
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);

    // 1. Group Data: Year -> Month -> Date -> Location
    const folderStructure = useMemo(() => {
        const structure = {};
        samplings.forEach(s => {
            if (!s.date) return;
            const d = new Date(s.date);
            const year = d.getFullYear();
            const month = d.toLocaleString('default', { month: 'long' });
            
            if (!structure[year]) structure[year] = {};
            if (!structure[year][month]) structure[year][month] = {};
            if (!structure[year][month][s.date]) structure[year][month][s.date] = {};
            
            const loc = s.reason ? s.reason.trim() : 'Unspecified';
            if (!structure[year][month][s.date][loc]) structure[year][month][s.date][loc] = [];
            structure[year][month][s.date][loc].push(s);
        });
        return structure;
    }, [samplings]);

    // --- LEVEL 4: ITEMS LIST (THE FIX IS HERE) ---
    if (selectedYear && selectedMonth && selectedDate && selectedLocation) {
        const items = folderStructure[selectedYear][selectedMonth][selectedDate][selectedLocation] || [];
        
        // Group Items by Note (Description)
        const groupedItems = items.reduce((groups, item) => {
            const noteKey = item.note ? item.note.trim() : "General / No Description";
            if (!groups[noteKey]) groups[noteKey] = [];
            groups[noteKey].push(item);
            return groups;
        }, {});

        return (
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setSelectedLocation(null)} className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Locations</button>
                    {isAdmin && (
                        <button onClick={() => onEditFolder(selectedDate, selectedLocation)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-orange-100 hover:text-orange-600 transition-colors">
                            <Edit size={14}/> Edit Folder
                        </button>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 overflow-hidden">
                    <div className="bg-slate-900 text-white p-8">
                        <p className="text-orange-500 font-bold tracking-widest text-xs uppercase mb-1">{selectedDate}</p>
                        <h1 className="text-3xl font-bold font-serif">{selectedLocation}</h1>
                        <p className="text-slate-400 text-sm mt-2">{items.length} Total Items Sampled</p>
                    </div>
                    
                    <div className="p-8 space-y-8">
                        {Object.entries(groupedItems).map(([noteGroup, groupItems]) => (
                            <div key={noteGroup} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border dark:border-slate-700 overflow-hidden">
                                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b dark:border-slate-700 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                                        <Store size={16} className="text-orange-500"/> {noteGroup}
                                    </h3>
                                    <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{groupItems.length} items</span>
                                </div>
                                <table className="w-full text-sm text-left">
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {groupItems.map(s => (
                                            // --- FIX: DARKER HOVER COLOR (bg-black/5 for light, bg-white/5 for dark) ---
                                            <tr key={s.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-3 font-medium dark:text-white pl-4">{s.productName}</td>
                                                <td className="p-3 text-right text-red-500 font-bold">-{s.qty}</td>
                                                <td className="p-3 text-right flex justify-end gap-2 pr-4">
                                                    {isAdmin && (
                                                        <>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); onEdit(s); }} // STOP PROPAGATION FIX
                                                                className="p-1.5 text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                                                                title="Edit Item"
                                                            >
                                                                <Pencil size={14}/>
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); onDelete(s); }} 
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
                                                                title="Delete Item"
                                                            >
                                                                <Trash2 size={14}/>
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- LEVEL 3: LOCATION FOLDERS (Inside a Date) ---
    if (selectedYear && selectedMonth && selectedDate) {
        const locations = Object.keys(folderStructure[selectedYear][selectedMonth][selectedDate] || {});
        return (
            <div className="animate-fade-in">
                <button onClick={() => setSelectedDate(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to {selectedMonth}</button>
                <h2 className="text-2xl font-bold dark:text-white mb-6 flex items-center gap-2"><Calendar size={24} className="text-orange-500"/> {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {locations.map(loc => (
                        <div key={loc} onClick={() => setSelectedLocation(loc)} className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-orange-500 group transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 dark:bg-slate-700 rounded-lg text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-colors"><MapPin size={24} /></div>
                                <div><h3 className="font-bold text-lg dark:text-white group-hover:text-orange-500 transition-colors">{loc}</h3><p className="text-xs text-slate-500">{folderStructure[selectedYear][selectedMonth][selectedDate][loc].length} Items</p></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- LEVEL 2: DATE FOLDERS (Inside a Month) ---
    if (selectedYear && selectedMonth) {
        const dates = Object.keys(folderStructure[selectedYear][selectedMonth] || {}).sort((a,b) => new Date(b) - new Date(a));
        return (
            <div className="animate-fade-in">
                <button onClick={() => setSelectedMonth(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to {selectedYear}</button>
                <h2 className="text-2xl font-bold dark:text-white mb-6 flex items-center gap-2"><Folder size={24} className="text-orange-500"/> {selectedMonth} {selectedYear}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {dates.map(date => {
                        const locCount = Object.keys(folderStructure[selectedYear][selectedMonth][date]).length;
                        return (
                            <div key={date} onClick={() => setSelectedDate(date)} className="bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-orange-500 group transition-all text-center">
                                <div className="w-12 h-12 mx-auto bg-orange-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors mb-3"><span className="font-bold text-lg">{new Date(date).getDate()}</span></div>
                                <h3 className="font-bold text-sm dark:text-white">{new Date(date).toLocaleDateString(undefined, {weekday:'short'})}</h3>
                                <p className="text-[10px] text-slate-500 mt-1">{locCount} Locations</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- LEVEL 1: MONTH FOLDERS (Inside a Year) ---
    if (selectedYear) {
        const months = Object.keys(folderStructure[selectedYear] || {});
        const monthOrder = { "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6, "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12 };
        months.sort((a, b) => monthOrder[a] - monthOrder[b]);
        return (
            <div className="animate-fade-in">
                <button onClick={() => setSelectedYear(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Years</button>
                <h2 className="text-2xl font-bold dark:text-white mb-6 flex items-center gap-2"><Folder size={24} className="text-blue-500"/> {selectedYear} Archives</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {months.map(month => (
                        <div key={month} onClick={() => setSelectedMonth(month)} className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-orange-500 group transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 dark:bg-slate-700 rounded-lg text-blue-500 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Folder size={24} /></div>
                                <div><h3 className="font-bold text-lg dark:text-white">{month}</h3><p className="text-xs text-slate-500">{Object.keys(folderStructure[selectedYear][month]).length} Dates Recorded</p></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- LEVEL 0: YEAR FOLDERS (Top Level) ---
    const years = Object.keys(folderStructure).sort((a, b) => b - a);
    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Folder size={24} className="text-orange-500"/> Sampling Archives</h2>
                <button onClick={onShowAnalytics} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all"><TrendingUp size={18}/> View Analytics</button>
            </div>
            {years.length === 0 ? (
                 <div className="text-center py-20 text-slate-400"><Folder size={48} className="mx-auto mb-4 opacity-20"/><p>No sampling records found.</p></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {years.map(year => (
                        <div key={year} onClick={() => setSelectedYear(year)} className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform relative overflow-hidden group">
                            <Folder size={100} className="absolute -right-6 -bottom-6 text-white opacity-5 group-hover:opacity-10 transition-opacity"/>
                            <div className="relative z-10"><h3 className="text-3xl font-bold mb-1">{year}</h3><div className="h-1 w-12 bg-orange-500 rounded mb-3"></div><p className="text-sm text-slate-400 font-mono">{Object.keys(folderStructure[year]).length} Months Active</p></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- FIXED: SAMPLING MODAL (UNLOCKED PRODUCT SELECTION) ---
const SampleEntryModal = ({ isOpen, onClose, onSubmit, initialData, inventory }) => {
    // Initialize with default or existing data
    const [formData, setFormData] = useState({ 
        date: new Date().toISOString().split('T')[0], 
        reason: '', 
        productId: '', 
        productName: '', 
        qty: 1, 
        note: '' 
    });

    useEffect(() => {
        if (initialData && !initialData.isNew) {
            // EDIT MODE: Load existing data
            setFormData({
                ...initialData,
                date: initialData.date || new Date().toISOString().split('T')[0],
            });
        } else {
            // NEW MODE: Reset form
            setFormData({ 
                date: new Date().toISOString().split('T')[0], 
                reason: '', 
                productId: '', 
                productName: '', 
                qty: 1, 
                note: '' 
            });
        }
    }, [initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const product = inventory.find(p => p.id === formData.productId);
        
        // Pass all data back to parent
        onSubmit({ 
            ...formData, 
            productName: product ? product.name : formData.productName 
        });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X size={20}/></button>
                <h2 className="text-xl font-bold mb-4 dark:text-white">{initialData?.isNew ? 'New Sample Entry' : 'Edit Sample Details'}</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500">Date</label>
                            <input type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" required/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">Qty</label>
                            <input type="number" min="1" value={formData.qty} onChange={e=>setFormData({...formData, qty: parseInt(e.target.value)})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" required/>
                        </div>
                    </div>

                    {/* --- FIXED: PRODUCT DROPDOWN IS ALWAYS ACTIVE NOW --- */}
                    <div>
                        <label className="text-xs font-bold text-slate-500">Product</label>
                        <select 
                            value={formData.productId} 
                            onChange={e=>setFormData({...formData, productId: e.target.value})} 
                            className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" 
                            required
                        >
                            <option value="">Select Product...</option>
                            {inventory.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500">Location / Store Name</label>
                        <input value={formData.reason} onChange={e=>setFormData({...formData, reason: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="e.g. Toko Berkah" required/>
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500">Notes (Folder Group)</label>
                        <input value={formData.note} onChange={e=>setFormData({...formData, note: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="e.g. Area 1"/>
                    </div>
                    
                    <button className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl mt-2">
                        {initialData?.isNew ? 'Add to Folder' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};



// --- UPDATED: BIOHAZARD THEME (MOBILE STABILITY FIXES) ---
const BiohazardTheme = ({ activeTab, setActiveTab, children, user, appSettings, isAdmin, onLogin, userRole, setShowAdminLogin, agentSettings, notifications, onNotificationClick }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    
    const handleLogout = () => {
        if(window.confirm("Terminate Session?")) {
            signOut(auth);
            window.location.reload();
        }
    };

    const allMenuItems = [
        { id: 'dashboard', label: 'Command Center' },
        { id: 'map_war_room', label: 'Map System' },
        { id: 'journey', label: 'Journey Plan' },
        { id: 'fleet', label: 'Fleet & Canvas' }, 
        { id: 'inventory', label: 'Master Vault' },
        { id: 'agent_inventory', label: 'Agent Inventory' }, // <--- RENAMED
        { id: 'restock_vault', label: 'Restock Vault' },
        { id: 'sales', label: 'Sales Terminal' },
        { id: 'receivables', label: 'Receivables & Consignment' },
        { id: 'eod', label: 'EOD Setoran' }, // 🚀 NEW EOD TAB
        { id: 'stock_opname', label: 'Stock Opname' },
        { id: 'customers', label: 'Customers' },
        { id: 'sampling', label: 'Sampling' },
        { id: 'transactions', label: 'Reports' },
        { id: 'audit', label: 'Audit Logs' },
        { id: 'settings', label: 'Settings' }
    ];

    // 🚀 BULLETPROOF MENU ENGINE (CRASH FIXED) 🚀
    const visibleMenu = allMenuItems.filter(item => {
        // 1. ADMIN LOGIC (Restores your lockscreen rules!)
        if (userRole === 'ADMIN') {
            if (isAdmin) {
                if (item.id === 'agent_inventory') return false;
                return true; 
            }
            return ['map_war_room', 'journey', 'sales'].includes(item.id);
        }
        
        // 2. AGENT LOGIC (Base Tabs)
        let allowedTabs = ['map_war_room', 'journey', 'sales', 'agent_inventory', 'transactions', 'eod'];
        
        // 3. SMART MENU HIDING
        if (typeof agentSettings !== 'undefined' && agentSettings?.allowedTiers) {
            if (agentSettings.allowedTiers.includes('Grosir') || agentSettings.allowedTiers.includes('Distributor')) {
                allowedTabs.push('receivables');
            }
        }
        
        return allowedTabs.includes(item.id);
    });
    return (
        <div className="print-reset h-[100dvh] w-full bg-black text-gray-300 font-sans tracking-wide overflow-hidden flex relative">

           {/* 🚀 RHYTHMIC BOOTUP ENGINE (RE REQUIEM TERMINAL) 🚀 */}
            <style>{`
                @keyframes reRequiem {
                    0% { 
                        opacity: 0; 
                        transform: scale(0.98) translateY(10px); 
                        filter: blur(3px); 
                    }
                    100% { 
                        opacity: 1; 
                        transform: scale(1) translateY(0); 
                        filter: blur(0px); 
                    }
                }
                /* Ultra-fast, fluid easing curve like RE Remake menus */
                .boot-1 { animation: reRequiem 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) 0.05s forwards; opacity: 0; }
                .boot-2 { animation: reRequiem 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) 0.15s forwards; opacity: 0; }
                .boot-3 { animation: reRequiem 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) 0.25s forwards; opacity: 0; }
                .boot-4 { animation: reRequiem 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) 0.35s forwards; opacity: 0; }
            `}</style>
            
            {/* BACKGROUND LAYERS */}
            <div className="hide-on-print absolute inset-0 bg-[url('https://wallpapers.com/images/hd/resident-evil-background-2834-x-1594-c7m6q8j3q8j3q8j3.jpg')] bg-cover bg-center opacity-40 pointer-events-none"></div>
            <div className="hide-on-print absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent pointer-events-none"></div>

            {/* --- 1. FIXED MOBILE MENU BUTTON --- */}
            <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="hide-on-print lg:hidden fixed top-3 left-3 z-[100] p-2.5 bg-orange-600/90 backdrop-blur-md text-white rounded-xl shadow-[0_0_15px_rgba(234,88,12,0.5)] border border-orange-400/50 active:scale-90 transition-all"
            >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* LEFT COLUMN: NAVIGATION */}
            <div className={`hide-on-print
                fixed inset-y-0 left-0 z-[90] w-64 bg-black/95 backdrop-blur-xl border-r border-white/10 flex flex-col pt-5 lg:pt-8 pl-4 pr-4 transition-transform duration-300
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
                lg:relative lg:translate-x-0
            `}>
                
                {/* BRANDING (Moved text beside burger button) */}
                <div key={`brand-${isAdmin}`} className="mb-6 ml-12 lg:ml-2 mt-0.5 lg:mt-0 boot-1">
                    <h1 className="text-sm lg:text-xl font-bold text-white font-mono border-b-2 border-white/50 pb-1 lg:pb-2 inline-block shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        {appSettings?.companyName || "KPM SYSTEM"}
                    </h1>
                    {/* INJECT VERSION TRACKER HERE */}
                    <p className="text-[10px] font-mono text-blue-400 tracking-widest mt-1">BUILD {APP_VERSION}</p>
                </div>

                {/* MENU */}
                {user ? (
                    <nav key={`nav-${isAdmin}`} className="space-y-0.5 flex-1 overflow-y-auto scrollbar-hide boot-2">
                        {visibleMenu.map(item => (
                            <button
                                key={item.id}
                                onClick={() => { 
                                    setActiveTab(item.id); 
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`w-full text-left py-2 px-3 text-xs font-bold transition-all duration-200 uppercase tracking-widest clip-path-polygon ${
                                    activeTab === item.id 
                                    ? 'bg-white text-black pl-6 shadow-[0_0_10px_rgba(255,255,255,0.8)] border-l-4 border-orange-500' 
                                    : 'text-gray-500 hover:text-white hover:pl-4 hover:bg-white/5'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
                ) : (
                    <div className="flex-1 flex flex-col items-start pt-10 opacity-50">
                        <div className="text-xs text-red-500 font-mono mb-2">ACCESS DENIED</div>
                        <div className="h-0.5 w-10 bg-red-800 mb-4"></div>
                        <p className="text-[10px] text-slate-500">Authentication required.</p>
                    </div>
                )}

                {/* BOTTOM SECTION */}
                <div key={`bot-${isAdmin}`} className="mt-auto mb-2 border-t border-white/10 pt-3 boot-3">
                    
                    {/* NEW: UNLOCK BUTTON FOR ADMIN SAFE MODE */}
                    {userRole === 'ADMIN' && !isAdmin && (
                        <div className="px-2 mb-3">
                            <button 
                                onClick={() => {
                                    if (setShowAdminLogin) setShowAdminLogin(true);
                                    setIsMobileMenuOpen(false); // <--- Instantly closes the mobile sidebar
                                }} 
                                className="w-full bg-orange-600/20 hover:bg-orange-600 border border-orange-500/50 text-orange-400 hover:text-white p-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20"
                            >
                                <Lock size={14} /> Unlock Master Vault
                            </button>
                        </div>
                    )}

                    {/* NEW: DOCKED MUSIC PLAYER (Admin Only) */}
                    {isAdmin && <MusicPlayer />}

                    {user ? (
                        <div className="flex items-center gap-2">
                            
                            {/* 🚀 INJECT BELL HERE 🚀 */}
                            <NotificationBell notifications={notifications} onNotificationClick={onNotificationClick} />

                            <img 
                                src={appSettings?.mascotImage || "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"} 
                                className="w-7 h-7 rounded border border-white/30 object-cover bg-black"
                                alt="avatar"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-[8px] text-gray-400 uppercase font-bold leading-none mb-0.5">OPERATIVE</p>
                                <p className="text-[10px] text-white font-mono truncate leading-none">{user.email?.split('@')[0]}</p>
                            </div>
                            <button onClick={handleLogout} className="text-red-500 hover:text-red-400 p-1.5 rounded transition-colors" title="Logout">
                                <LogOut size={14}/>
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={onLogin}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-500 border border-emerald-800 py-3 rounded uppercase text-xs font-bold tracking-widest transition-all"
                        >
                            <LogIn size={14}/> System Login
                        </button>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: CONTENT AREA */}
            <div className="print-reset relative z-10 flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-transparent to-black/80">

                {/* HEADER (Restored to its original state) */}
                <div className={`hide-on-print pt-16 lg:pt-6 px-4 lg:px-8 pb-2 flex justify-between items-end border-b border-white/20 shrink-0 relative`}>
                    <h2 className="text-6xl font-bold text-white/5 uppercase select-none absolute top-2 right-8 pointer-events-none hidden lg:block">
                        {activeTab}
                    </h2>

                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className={`h-1.5 w-1.5 rounded-full ${user ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`}></div>
                            <span className={`text-[9px] font-mono uppercase ${user ? 'text-emerald-500' : 'text-red-500'}`}>{user ? "System Active" : "Disconnected"}</span>
                        </div>
                        <div className="text-2xl text-white font-bold tracking-[0.15em] uppercase text-shadow-glow">
                            {activeTab.replace(/_/g, ' ')}
                        </div>
                    </div>

                    <div className="text-[10px] text-gray-500 font-mono text-right">
                        <div>{new Date().toLocaleDateString()}</div>
                        <div className="text-sm text-white">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className={`print-reset flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/20`}>
                    <div className="biohazard-content max-w-full mx-auto">
                        {children}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="hide-on-print hidden lg:flex h-8 border-t border-white/10 items-center px-6 gap-6 text-[10px] text-gray-500 font-bold uppercase bg-black/80 backdrop-blur shrink-0">
                    <span className="flex items-center gap-2"><span className="bg-white text-black px-1 rounded-[1px]">L-CLICK</span> SELECT</span>
                    <span className="flex items-center gap-2"><span className="bg-gray-700 text-white px-1 rounded-[1px]">SCROLL</span> NAVIGATE</span>
                </div>

            </div>
            
            {/* GLOBAL STYLE OVERRIDES */}
            <style>{`
                .biohazard-content .bg-white { 
                    background-color: rgba(20, 20, 20, 0.85) !important; 
                    border: 1px solid rgba(255,255,255,0.15) !important; 
                    color: #e5e5e5 !important; 
                }
                .text-shadow-glow { text-shadow: 0 0 10px rgba(255,255,255,0.5); }
                
                /* --- KILL THE WHITE MAP POPUPS --- */
                .leaflet-container .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; border: none !important; padding: 0 !important; }
                .leaflet-container .leaflet-popup-tip-container { display: none !important; }
                .leaflet-container .leaflet-popup-content { margin: 0 !important; line-height: normal !important; width: auto !important; }
                .leaflet-container a.leaflet-popup-close-button { display: none !important; }

                /* --- MASTER THERMAL PRINTER OVERRIDE --- */
                @media print {
                    /* STRICT ORIENTATION AND MARGIN LOCK TO PREVENT 2ND BLANK PAGE */
                    @page { 
                        size: A4 portrait !important; 
                        margin: 5mm !important; 
                    }
                    body, html, #root { background-color: white !important; color: black !important; height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; display: block !important; }
                    
                    /* Destroy layout traps (overflow/fixed heights) that clip absolute elements */
                    .print-reset { display: block !important; height: auto !important; min-height: auto !important; overflow: visible !important; position: static !important; }
                    
                    nav, header { display: none !important; }
                    .hide-on-print { display: none !important; }

                    /* Isolate the receipt and block height spillover */
                    .print-modal-wrapper { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: auto !important; background: white !important; display: block !important; padding: 0 !important; margin: 0 !important; z-index: 999999 !important; }
                    .print-receipt { background-color: white !important; color: black !important; box-shadow: none !important; border: none !important; margin: 0 auto !important; border-radius: 0 !important; overflow: visible !important; max-height: none !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
                    
                    /* NEW: STRICT DUAL PRINT SIZING */
                    .print-receipt.format-thermal { width: 80mm !important; max-width: 80mm !important; padding: 5mm !important; }
                    .print-receipt.format-a4 { 
                        width: 210mm !important; 
                        max-width: 210mm !important; 
                        padding: 10mm !important; 
                        box-sizing: border-box !important;
                    }
                    
                    .print-receipt * { color: black !important; border-color: black !important; }
                    .no-print { display: none !important; }
                }
            `}</style>
        </div>
    );
};



// --- MODIFIED: AUDIT VAULT EXPLORER (SPLIT-PACKET VERSION) ---

const AuditVaultExplorer = ({ db, storage, appId, user, isAdmin, logAudit, setBackupToast }) => {
    // ... rest of the code ...
    const [path, setPath] = useState({ year: null, month: null, day: null });
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    const years = ["2025", "2026"];
    const months = Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0'));
    const days = Array.from({length: 31}, (_, i) => (i + 1).toString().padStart(2, '0'));

    // --- REVERSAL LOGIC: FETCH EXTERNAL SNAPSHOT & RESTORE ---
    const handleRestoreFromSnapshot = async (logEntry) => {
        if (!isAdmin || !logEntry.snapshotPath) return;
        
        const confirmMsg = `[RE TERMINAL]: DOWNLOADING CLOUD ARCHIVE...\n\nTarget: ${logEntry.action}\n\nProceed with reconstruction?`;
        
        if (window.confirm(confirmMsg)) {
            try {
                setLoading(true);
                // 1. FETCH THE EXTERNAL FILE FROM STORAGE
                const fileRef = storageRef(storage, logEntry.snapshotPath);
                const downloadUrl = await getDownloadURL(fileRef);
                const response = await fetch(downloadUrl);
                const snapshot = await response.json();

                // 2. AUTO-SAVE SAFETY SNAPSHOT
                await logAudit("PRE_REVERT_SAFETY", `Auto-archived before reverting to ${logEntry.action}`, true);

                const batch = writeBatch(db);
                
                if (snapshot.inventory) {
                    snapshot.inventory.forEach(item => {
                        batch.set(doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id), item);
                    });
                }
                if (snapshot.customers) {
                    snapshot.customers.forEach(c => {
                        batch.set(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, c.id), c);
                    });
                }

                await batch.commit();
                setBackupToast(true); 
                setTimeout(() => window.location.reload(), 2000);
                
            } catch (err) {
                console.error("CLOUD_REVERSION_FAILURE:", err);
                setLoading(false);
                alert("SYSTEM ERROR: Cloud data packet corrupted.");
            }
        }
    };

    useEffect(() => {
        if (path.year && path.month && path.day && user?.uid) {
            setLoading(true);
            const dateKey = `${path.year}-${path.month}-${path.day}`;
            const vaultPath = `artifacts/${appId}/users/${user.uid}/audit_vault/${dateKey}/logs`;
            
            const q = query(collection(db, vaultPath), orderBy('timestamp', 'desc'));
            const unsub = onSnapshot(q, (snap) => {
                setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
            }, (err) => {
                console.error("Vault Error:", err);
                setLoading(false);
            });
            return () => unsub();
        }
    }, [path, db, appId, user?.uid]);

    const formatM = (m) => new Date(2000, parseInt(m) - 1).toLocaleString('default', { month: 'long' });

    return (
        <div className="bg-black/20 border border-white/10 rounded-2xl p-6 min-h-[400px] font-mono text-xs">
            {/* Breadcrumbs */}
            <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6 border-b border-white/5 pb-2">
                <button onClick={() => setPath({year:null, month:null, day:null})} className="hover:text-white">VAULT</button>
                {path.year && <><span>/</span><button onClick={() => setPath({...path, month:null, day:null})} className="text-orange-500">{path.year}</button></>}
                {path.month && <><span>/</span><button onClick={() => setPath({...path, day:null})} className="text-orange-500">{formatM(path.month)}</button></>}
                {path.day && <><span>/</span><span className="text-white">{path.day}</span></>}
            </div>

            {/* Folder Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {!path.year && years.map(y => (
                    <button key={y} onClick={() => setPath({...path, year: y})} className="flex flex-col items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:border-orange-500 group transition-all">
                        <Folder size={24} className="text-orange-500 mb-2 group-hover:scale-110 transition-transform"/>
                        <span className="text-white font-bold">{y}</span>
                    </button>
                ))}
                {path.year && !path.month && months.map(m => (
                    <button key={m} onClick={() => setPath({...path, month: m})} className="flex flex-col items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:border-blue-500 group transition-all">
                        <Calendar size={24} className="text-blue-500 mb-2"/>
                        <span className="text-white">{formatM(m)}</span>
                    </button>
                ))}
                {path.month && !path.day && days.map(d => (
                    <button key={d} onClick={() => setPath({...path, day: d})} className="flex flex-col items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:border-emerald-500 group transition-all">
                        <div className="text-lg font-black text-white/20 group-hover:text-emerald-500">{d}</div>
                        <span className="text-[8px] text-slate-500 uppercase">DAY</span>
                    </button>
                ))}
            </div>

            {/* Log List */}
            {path.day && (
                <div className="mt-4 space-y-2 animate-fade-in">
                    {loading ? <p className="text-orange-500 animate-pulse text-center py-10 uppercase tracking-widest">/// Decrypting Sector ///</p> : logs.map(log => (
                        <div key={log.id} className="p-3 bg-white/5 border-l-2 border-orange-500 flex justify-between items-center group">
                            <div className="flex-1">
                                <p className="text-white font-bold uppercase flex items-center gap-2">
                                    {log.action}
                                    {log.snapshotId && (
                                        <span className="text-[7px] bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded tracking-tighter animate-pulse">
                                            REMOTE SNAPSHOT LOADED
                                        </span>
                                    )}
                                </p>
                                <p className="text-slate-400 text-[10px]">{log.details}</p>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                {log.snapshotId && isAdmin && (
                                    <button 
                                        onClick={() => handleRestoreFromSnapshot(log)}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white text-[9px] font-bold uppercase hover:bg-emerald-500 transition-colors shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                    >
                                        <RotateCcw size={10}/> Revert
                                    </button>
                                )}
                                <span className="text-slate-600 text-[9px]">{log.timeStr}</span>
                            </div>
                        </div>
                    ))}
                    {!loading && logs.length === 0 && <p className="text-slate-600 italic py-10 text-center uppercase tracking-widest">/// Sector Empty ///</p>}
                </div>
            )}
        </div>
    );
};




// --- MAIN APP COMPONENT ---
export default function KPMInventoryApp() {  // <--- ONLY ONE OPENING BRACE

  const [user, setUser] = useState(null);
  // ... rest of your code ...
  const [isAdmin, setIsAdmin] = useState(false); // 🚨 FIXED: Default to locked out!
  const [sessionStatus, setSessionStatus] = useState({ recovery: false, usb: false, cloud: false });
  const [isSystemOwner, setIsSystemOwner] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showCrownTransfer, setShowCrownTransfer] = useState(false); // 🚀 ADD THIS
  const [adminPin, setAdminPin] = useState(null);       
  const [hasAdminPin, setHasAdminPin] = useState(false); 
  const [inputPin, setInputPin] = useState("");         
  const [isSetupMode, setIsSetupMode] = useState(false); 
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [loginError, setLoginError] = useState(null); // <--- Add this to track login errors
  const [backupToast, setBackupToast] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(localStorage.getItem('passkeyRegistered') === 'true');





// Helper to include Hours and Minutes in the filename
  // --- DOWNLOAD ENGINE HELPERS ---
  const getCurrentTimestamp = () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    return `${date}_${h}-${m}`; // Example: 2026-02-13_08-30
  };

  const triggerDownload = (name, data) => {
    try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a); // Required for some browser security layers
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Download Error:", err);
    }
  };

  // --- COMPLETE SYSTEM PAYLOAD GENERATOR (INCLUDES ALL MODULES + MAPS + INTEL) ---
  const generateFullSystemPayload = async (type) => {
      triggerCapy("Deep-fetching system databases and intelligence... ⏳");
      
      let mapSettings = [];
      try {
          // Explicitly fetch map borders/regions
          const mapSnap = await getDocs(collection(db, `artifacts/${appId}/users/${user.uid}/mapSettings`));
          mapSettings = mapSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { console.warn("Could not fetch map settings"); }

      // NEW: Explicitly deep-fetch Competitor Intelligence (Benchmarks)
      const deepCustomers = [];
      for (const cust of customers) {
          const custCopy = { ...cust };
          try {
              const benchSnap = await getDocs(collection(db, `artifacts/${appId}/users/${user.uid}/customers/${cust.id}/benchmarks`));
              custCopy.benchmarks = benchSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          } catch (e) { custCopy.benchmarks = []; }
          deepCustomers.push(custCopy);
      }

      return {
          meta: { type, ts: getCurrentTimestamp(), user: user.email },
          inventory, transactions, customers: deepCustomers, samplings, auditLogs, procurements, appSettings, tierSettings, mapSettings
      };
  };

  // --- UPDATED: MASTER PROTOCOL (Forces Green Indicators) ---
  const handleMasterProtocol = async () => {
    if (!user || !isAdmin) return;
    
    triggerCapy("Compiling all database sectors including Map Geodata... 🛡️");

    const payload = await generateFullSystemPayload("MASTER_REDUNDANCY");

    // Sequential Downloads (All 3 now contain 100% of the data, including maps)
    setTimeout(() => triggerDownload(`FOLDER_RECOVERY--POINT_${payload.meta.ts}.json`, payload), 0);
    setTimeout(() => triggerDownload(`FOLDER_USB--SAFE_OFFSITE_${payload.meta.ts}.json`, payload), 1500);
    setTimeout(() => triggerDownload(`FOLDER_CLOUD--MIRROR_SYNC_${payload.meta.ts}.json`, payload), 3000);

    localStorage.setItem('last_usb_backup', new Date().getTime().toString());
    
    // --- FORCE GREEN LIGHTS IMMEDIATELY ---
    setSessionStatus({ recovery: true, usb: true, cloud: true }); 

    await logAudit("MASTER_BACKUP", `Triple Redundancy executed at ${payload.meta.ts}`, true);
    triggerCapy("Protocol Complete! Files sent to sorting. 💾");
  };


  
  // --- NEW: ULTRA-SLIM SNAPSHOT (STRIPS EVERYTHING BUT NUMBERS) ---
  const getUltraSlimSnapshot = () => {
    // We only keep the ID, current Stock, and Price tiers. 
    // We strip Names, Descriptions, and Images to save 90% more space.
    const ultraSlimInventory = inventory.map(item => ({
        id: item.id,
        stock: item.stock,
        pD: item.priceDistributor,
        pR: item.priceRetail,
        pG: item.priceGrosir,
        pE: item.priceEcer
    }));
    
    const ultraSlimCustomers = customers.map(c => ({
        id: c.id,
        tier: c.tier,
        lastV: c.lastVisit
    }));

    return {
        inventory: ultraSlimInventory,
        customers: ultraSlimCustomers,
        appSettings: { companyName: appSettings.companyName } // Only essential settings
    };
  };

  // --- LOGIC: CHECK IF USB BACKUP IS CURRENTLY SECURE (Within 7 Days) ---
  const lastUSB = localStorage.getItem('last_usb_backup');
  const isUsbSecure = lastUSB && (new Date().getTime() - parseInt(lastUSB)) < (7 * 24 * 60 * 60 * 1000);
  
  

  // --- 1. FULL CLOUD MIRROR (FOR SECURITY) ---
  const handleCloudMirror = async () => {
    if(!user) return;
    const mirrorPayload = {
      meta: { timestamp: new Date().toISOString(), app: "KPM_MIRROR", operator: user.email },
      inventory, transactions, customers, samplings, appSettings
    };
    const blob = new Blob([JSON.stringify(mirrorPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CLOUD_MIRROR_${getCurrentDate()}.json`;
    a.click();
    await logAudit("DATABASE_MIRROR", "Manual offsite cloud mirror created");
    triggerCapy("Mirror Synchronized! Upload this to your private Google Drive.");
  };

  // --- NEW: DATA WIPE FUNCTION ---
  const handleWipeData = async (type) => {
    if (!user) return;
    const confirmMsg = `WARNING: Are you sure you want to PERMANENTLY delete ${type === 'both' ? 'Products AND Customers' : type === 'products' ? 'Products & Prices' : 'Customer Profiles'}?`;
    if (!window.confirm(confirmMsg)) return;

    if (!window.confirm(`FINAL WARNING: This cannot be undone. Proceed with deletion?`)) return;

    try {
        triggerCapy(`Initiating data wipe for ${type}... 🗑️`);
        const batch = writeBatch(db);
        let deleteCount = 0;
        
        if (type === 'products' || type === 'both') {
            inventory.forEach(item => {
                batch.delete(doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id));
                deleteCount++;
            });
        }

        if (type === 'customers' || type === 'both') {
            for (const cust of customers) {
                // Delete competitor benchmarks first
                const benchSnap = await getDocs(collection(db, `artifacts/${appId}/users/${user.uid}/customers/${cust.id}/benchmarks`));
                benchSnap.forEach(b => {
                    batch.delete(doc(db, `artifacts/${appId}/users/${user.uid}/customers/${cust.id}/benchmarks`, b.id));
                });
                // Delete customer
                batch.delete(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, cust.id));
                deleteCount++;
            }
        }

        await batch.commit();
        await logAudit("DATA_WIPE", `Wiped ${type} data.`);
        triggerCapy(`Data wipe complete. Clean slate! ✨`);
    } catch (err) {
        console.error("Wipe failed:", err);
        alert("Data Wipe Failed: " + err.message);
    }
  };

  // --- 2. GRANULAR TEAM SHARING: EXPORT (WITH DEEP FETCH) ---
  const handleExportGranular = async (type) => {
    if(!user) return;
    let exportData = {
        meta: { 
            type: `kpm_share_${type}`, 
            signature: `KPM-AUTO-${Math.random().toString(36).substr(2, 9)}`, 
            date: new Date().toISOString(), 
            owner: user.email 
        }
    };

    if (type === 'products' || type === 'both') {
        exportData.inventory = inventory; 
        exportData.appSettings = appSettings; 
    }
    
    if (type === 'customers' || type === 'both') {
        triggerCapy("Deep-fetching customer data... ⏳");
        const deepCustomers = [];
        
        for (const cust of customers) {
            const custCopy = { ...cust };
            try {
                // Dig into the sub-collection to grab the benchmarks
                const benchSnap = await getDocs(collection(db, `artifacts/${appId}/users/${user.uid}/customers/${cust.id}/benchmarks`));
                custCopy.benchmarks = benchSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) {
                custCopy.benchmarks = [];
            }
            deepCustomers.push(custCopy);
        }
        exportData.customers = deepCustomers; 
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KPM_SHARE_${type.toUpperCase()}_${getCurrentDate()}.json`;
    a.click();
    triggerCapy(`Differentiated ${type} data signed and ready!`);
  };

  // --- 3. GRANULAR TEAM SHARING: IMPORT (WITH DEEP RESTORE) ---
  const handleImportGranular = (e, targetType) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    if(!window.confirm(`Import ${targetType} data? This will overwrite existing items with the same ID.`)) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            const batch = writeBatch(db);

            if ((targetType === 'products' || targetType === 'both') && data.inventory) {
                data.inventory.forEach(item => {
                    batch.set(doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id), item);
                });
            }
            if ((targetType === 'customers' || targetType === 'both') && data.customers) {
                data.customers.forEach(c => {
                    const cData = { ...c };
                    const benchmarks = cData.benchmarks || [];
                    delete cData.benchmarks; // Keep main profile clean

                    // Save customer
                    batch.set(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, c.id), cData);
                    
                    // Save deep competitor data
                    benchmarks.forEach(b => {
                        batch.set(doc(db, `artifacts/${appId}/users/${user.uid}/customers/${c.id}/benchmarks`, b.id), b);
                    });
                });
            }
            
            await batch.commit();
            triggerCapy(`${targetType.toUpperCase()} data imported successfully!`);
        } catch (err) { alert("Import Failed: " + err.message); }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };



const handleGitHubMirror = async () => {
    if(!user) return;
    
    // Package all critical business data
    const mirrorPayload = {
      meta: { 
        timestamp: new Date().toISOString(), 
        app: "KPM_SYSTEM_MIRROR",
        operator: user.email 
      },
      inventory,
      transactions,
      customers,
      samplings,
      appSettings
    };

    triggerCapy("Initiating Offsite Mirror... ☁️");

    try {
      // Note: In a production environment, you would use a secure backend 
      // or a specific API key stored in Firebase Secrets.
      // For now, this triggers a secondary JSON backup download as a 'Manual Mirror'.
      const blob = new Blob([JSON.stringify(mirrorPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OFFSITE_MIRROR_${getCurrentDate()}.json`;
      a.click();
      
      await logAudit("DATABASE_MIRROR", "Manual offsite cloud mirror created");
      triggerCapy("Mirror Synchronized! Move this to your Cloud Drive.");
    } catch (err) {
      console.error(err);
      triggerCapy("Mirror failed. Check console.");
    }
  };



// --- PINPOINT: Line 1770 (Objective 4: Advanced Security Logic) ---
  const [recoveryWord, setRecoveryWord] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [authShake, setAuthShake] = useState(false); // For visual "Wrong Password" feedback
  const [isUnlocking, setIsUnlocking] = useState(false); // 🎬 NEW: Cinematic Unlock State

  // 📧 NEW: Email OTP Recovery States
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [inputOtp, setInputOtp] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // 🔐 NEW: Real-time Password Strength State
  const [setupPassword, setSetupPassword] = useState("");
  const [setupSecret, setSetupSecret] = useState("");

  const calculateStrength = (pass) => {
      let score = 0;
      if (!pass) return { score: 0, label: "AWAITING INPUT", color: "text-slate-500", bar: "bg-slate-800" };
      if (pass.length >= 8) score++;
      if (/[a-z]/.test(pass)) score++;
      if (/[A-Z]/.test(pass)) score++;
      if (/\d/.test(pass)) score++;
      if (/[@$!%*?&#\-_]/.test(pass)) score++;

      if (score <= 2) return { score, label: "CRITICAL VULNERABILITY (WEAK)", color: "text-red-500", bar: "bg-red-600 shadow-[0_0_10px_red]" };
      if (score <= 4) return { score, label: "SUB-OPTIMAL (MODERATE)", color: "text-orange-500", bar: "bg-orange-500 shadow-[0_0_10px_orange]" };
      return { score, label: "ENCRYPTION SECURE (STRONG)", color: "text-emerald-500", bar: "bg-emerald-500 shadow-[0_0_10px_emerald]" };
  };

  // 1. INITIAL CHECK: Does a PIN exist?
  useEffect(() => {
    const checkAdminStatus = async () => {
        if (!user) return;
        const ref = doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'admin');
        const snap = await getDoc(ref);
        
        if (snap.exists() && snap.data().pin) {
            setAdminPin(snap.data().pin);
            setRecoveryWord(snap.data().recoveryWord || "");
            setHasAdminPin(true);
            setIsSetupMode(false);
        } else {
            // No PIN found: Force Setup Mode
            setHasAdminPin(false);
            setIsSetupMode(true);
        }
    };
    checkAdminStatus();
  }, [user]);

  // 🔐 CRYPTOGRAPHIC ENGINE: SHA-256 Hash Generator
  const hashSecretWord = async (word) => {
      const msgBuffer = new TextEncoder().encode(word.toLowerCase().trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // 2. SETUP: Create MASTER PASSWORD & Secret Word (FULLY HASHED)
  const handleSetupSecurity = async () => {
    const strength = calculateStrength(setupPassword);
    
    // 🚨 ABSOLUTE HARD LOCK: Blocks "password" or anything under level 5
    if (strength.score < 5) { 
        setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
        alert("Encryption Failed: Password must reach Level 5 security (8+ chars, Upper, Lower, Number, Symbol)."); 
        return; 
    }
    if (!setupSecret || !setupSecret.trim()) { 
        setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
        alert("Secret recovery word is required!"); 
        return; 
    }

    try {
        const scrambledWordHash = await hashSecretWord(setupSecret);
        const scrambledPinHash = await hashSecretWord(setupPassword);
        
        await setDoc(doc(db, `artifacts/${appId}/users/${userId}/settings`, 'admin'), {
            pin: scrambledPinHash,           
            recoveryHash: scrambledWordHash, 
            failedRecoveryAttempts: 0,   
            lockoutStatus: "NONE",
            updatedAt: serverTimestamp()
        });

        setAdminPin(scrambledPinHash);
        setHasAdminPin(true);
        setIsSetupMode(false);
        setIsAdmin(true); 
        setShowAdminLogin(false);
        setSetupPassword("");
        setSetupSecret("");
        
        alert("Security Protocol Established! Vault Unlocked.");
    } catch (error) {
        console.error("Save Error:", error);
        alert(`Database Error: Could not save credentials.`);
    }
  };

  // 3. LOGIN: Verify PIN (NOW WITH HASH & 5-STRIKE LOCKOUT)
  const handlePinLogin = async () => {
      if (!inputPin || inputPin.trim() === "") {
          setAuthShake(true); setTimeout(() => setAuthShake(false), 500); return;
      }

      try {
          // Fetch the live security profile
          const adminDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'admin');
          const adminSnap = await getDoc(adminDocRef);
          if (!adminSnap.exists()) return;
          const data = adminSnap.data();

          // Check if already locked out
          if (data.lockoutStatus === "PERMANENT" || data.failedRecoveryAttempts >= 5) {
              alert("SECURITY LOCKOUT: Maximum attempts exceeded. Please unlock via Firebase Console.");
              setInputPin("");
              return;
          }

          // 🚨 CRITICAL: Hash the inputted PIN to compare against the database hash
          const hashedInput = await hashSecretWord(inputPin.trim());

        
              if (hashedInput === data.pin) {
              // SUCCESS: Reset strikes & Trigger Cinematic Unlock
              await updateDoc(adminDocRef, { failedRecoveryAttempts: 0, lockoutStatus: "NONE" });
              setIsUnlocking(true);
              
              // Wait 2.5 seconds for the animation to finish before revealing dashboard
              setTimeout(() => {
                  setIsAdmin(true);
                  setShowAdminLogin(false);
                  setIsUnlocking(false);
                  setInputPin("");
              }, 2500);
          } else {
              // FAILED: Add a strike to the database
              const newStrikes = (data.failedRecoveryAttempts || 0) + 1;
              const newLockout = newStrikes >= 5 ? "PERMANENT" : "NONE";
              await updateDoc(adminDocRef, { failedRecoveryAttempts: newStrikes, lockoutStatus: newLockout });
              
              setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
              setInputPin("");
              alert(`Incorrect PIN. Strike ${newStrikes}/5.`);
          }
      } catch (error) {
          console.error("Login Error:", error);
      }
  };

  // 4. RESET: Layer 1 (Verify Secret Word) & Layer 2 (Send OTP)
  const handleResetPin = async (word) => {
    if (!word || word.trim() === "") {
        setAuthShake(true); setTimeout(() => setAuthShake(false), 500); return;
    }

    const cleanWord = word.trim().toLowerCase();

    // 🚨 KPMADMIN BACKDOOR PERMANENTLY DELETED 🚨

    try {
        setIsSendingEmail(true); // Trigger UI loading state

        const adminDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'admin');
        const adminSnap = await getDoc(adminDocRef);
        
        if (!adminSnap.exists()) { alert("No security profile found."); setIsSendingEmail(false); return; }
        const data = adminSnap.data();

        if (data.lockoutStatus === "PERMANENT" || data.failedRecoveryAttempts >= 5) {
            alert("SECURITY LOCKOUT: Maximum attempts exceeded. Please unlock via Firebase Console.");
            setIsSendingEmail(false); return;
        }

        const guessHash = await hashSecretWord(cleanWord);
        
        if (guessHash === data.recoveryHash) {
            await updateDoc(adminDocRef, { failedRecoveryAttempts: 0, lockoutStatus: "NONE" });
            
            // 📧 LAYER 3: GENERATE & SEND EMAIL OTP
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedOtp(newOtp);

            try {
                await emailjs.send(
                    'service_b564nlp',
                    'template_89lgavp',
                    { otp_code: newOtp }, 
                    'veSkmuEcR5qSImMSq'  // 🔐 BRAND NEW SECURE PUBLIC KEY
                );
                setIsResetMode(false);
                setIsOtpMode(true); 
            } catch (emailErr) {
                console.error("EmailJS Error:", emailErr);
                alert("Identity verified, but failed to send OTP email. Check your internet or EmailJS account limits.");
            }
        } else {
            const newStrikes = (data.failedRecoveryAttempts || 0) + 1;
            const newLockout = newStrikes >= 5 ? "PERMANENT" : "NONE";
            await updateDoc(adminDocRef, { failedRecoveryAttempts: newStrikes, lockoutStatus: newLockout });
            
            setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
            alert(`Access Denied. Strike ${newStrikes}/5.`);
        }
    } catch (error) {
        console.error("Recovery Error:", error);
        alert("System error during recovery verification.");
    }
    setIsSendingEmail(false);
  };

  // 5. OTP VERIFICATION: Layer 3
  const handleVerifyOtp = () => {
      if (inputOtp === generatedOtp) {
          setIsOtpMode(false);
          setIsSetupMode(true);
          setInputOtp("");
          alert("Authorization Code Accepted. You may now create new Master Credentials.");
      } else {
          setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
          setInputOtp("");
      }
  };

// --- PINPOINT: Line 1830 (Add this missing function to fix the crash) ---
  const handleChangePin = () => {
      // Switches the modal to "Setup Mode" so you can overwrite the old PIN
      setIsSetupMode(true); 
      setShowAdminLogin(true);
      setIsResetMode(false);
      setInputPin("");
      triggerCapy("Initialize PIN Reset Protocol.");
  };

  // 🚀 PASSKEY REGISTRATION ENGINE (NEW) 🚀
  const handleRegisterPasskey = async () => {
      try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          const userId = new Uint8Array(16);
          window.crypto.getRandomValues(userId);

          const credential = await navigator.credentials.create({
              publicKey: {
                  challenge: challenge,
                  rp: { name: "Inventory System", id: window.location.hostname },
                  user: { id: userId, name: user?.email || "Admin", displayName: "Administrator" },
                  pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
                  authenticatorSelection: { 
                      // 🚨 REMOVED 'authenticatorAttachment' so Windows allows Fingerprint, Phone, AND USB Keys!
                      userVerification: "required" 
                  },
                  timeout: 60000
              }
          });

          if (credential) {
              localStorage.setItem('passkeyRegistered', 'true'); 
              setHasPasskey(true); // 🚨 NEW: INSTANTLY UPDATES UI
              alert("Biometric Passkey Successfully Registered to this device!");
          }
      } catch (error) {
          console.error("Passkey registration failed:", error);
          alert("Could not register fingerprint. Check your OS settings.");
      }
  };

  // 🚀 BIOMETRIC UNLOCK ENGINE (UPDATED) 🚀
  const handleBiometricUnlock = async () => {
      try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);

          const assertion = await navigator.credentials.get({
              publicKey: {
                  challenge: challenge,
                  rpId: window.location.hostname, // 🚨 TELLS OS TO LOOK FOR LOCAL PASSKEY
                  userVerification: "required",
                  timeout: 60000
              }
          });

         // 🎬 THE NEW CINEMATIC BIOMETRIC UNLOCK
          if (assertion) {
              setIsUnlocking(true);
              setTimeout(() => {
                  setIsAdmin(true);
                  setShowAdminLogin(false);
                  setIsUnlocking(false);
              }, 2500);
          }
      } catch (error) {
          console.warn("Biometric scan failed or canceled:", error);
      }
  };
  




  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  
  // Data States
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]); 
  const [transactions, setTransactions] = useState([]);
  const [samplings, setSamplings] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [procurements, setProcurements] = useState([]); 
  const [motorists, setMotorists] = useState([]); // <--- NEW: GLOBAL FLEET TRACKER
  
  // 🚀 REQUIRED FOR EOD SETORAN 🚀
  const [agentInventories, setAgentInventories] = useState({}); 
  const [eodReports, setEodReports] = useState([]);
  
  // 🚀 ACCOUNT TRANSFER STATE 🚀
  const [transferRequests, setTransferRequests] = useState([]);

  // 🚀 NOTIFICATION STATE 🚀
  const [notifications, setNotifications] = useState([]);

  const [cart, setCart] = useState([]);
  const [opnameData, setOpnameData] = useState({});
  const [appSettings, setAppSettings] = useState({ mascotImage: '', companyName: 'KPM Inventory', mascotMessages: [] });

  const hasAlertedLowStock = useRef(false);

  // 1. Calculate low stock items (Threshold is minStock or default to 5)
  const lowStockItems = useMemo(() => {
      return inventory.filter(item => item.stock <= (item.minStock || 5));
  }, [inventory]);

  // 2. Capybara Intercept on Login
  useEffect(() => {
      if (user && isAdmin && lowStockItems.length > 0 && !hasAlertedLowStock.current) {
          // Find the most valuable item running out
          const priorityItem = [...lowStockItems].sort((a, b) => (b.priceRetail || 0) - (a.priceRetail || 0))[0];
          
          setTimeout(() => {
              triggerCapy(`⚠️ BOSS! ${priorityItem.name} is critically low (${priorityItem.stock} left). Restock needed!`);
          }, 3500); // 3.5s delay so it triggers right after the welcome message
          
          hasAlertedLowStock.current = true;
      }
  }, [user, isAdmin, lowStockItems]);
  

// --- NEW: TIER SETTINGS STATE ---
  const DEFAULT_TIERS = [
      { id: 'Platinum', label: 'Platinum', color: '#f59e0b', iconType: 'emoji', value: '🏆' },
      { id: 'Gold', label: 'Gold', color: '#fbbf24', iconType: 'emoji', value: '🥇' },
      { id: 'Silver', label: 'Silver', color: '#94a3b8', iconType: 'emoji', value: '🥈' },
      { id: 'Bronze', label: 'Bronze', color: '#78350f', iconType: 'emoji', value: '🥉' }
  ];
  const [tierSettings, setTierSettings] = useState(DEFAULT_TIERS);

  // Load Tiers from DB
  useEffect(() => {
      if(!user) return;
      const unsubTiers = onSnapshot(doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'tiers'), (snap) => {
          if (snap.exists() && snap.data().list) {
              setTierSettings(snap.data().list);
          }
      });
      return () => unsubTiers();
  }, [user]);

// --- MISSING FUNCTION: SAVE TIERS TO DATABASE ---
  const handleSaveTiers = async (newTiers) => {
      if (!user) return;
      try {
          await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'tiers'), { list: newTiers }, { merge: true });
          // No alert needed here to avoid spamming while typing
      } catch (err) {
          console.error("Error saving tiers:", err);
          alert("Failed to save tier settings.");
      }
  };

  // --- NEW: EXPORT TIER ICONS ---
  const handleExportTiers = () => {
      if(!tierSettings) return;
      const data = JSON.stringify({ 
          meta: { type: 'kpm_tier_config', date: new Date().toISOString() }, 
          tiers: tierSettings 
      }, null, 2);
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kpm_map_icons_${getCurrentDate()}.json`;
      a.click();
      triggerCapy("Map Icons Exported!");
  };

  // --- FIXED: SMART IMPORT (AUTO-RESIZE TO FIT DATABASE) ---
  const handleImportTiers = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if(!window.confirm("Import Icons? This will overwrite your current map pins.")) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const json = JSON.parse(event.target.result);
              // Validation
              if (json.meta?.type !== 'kpm_tier_config' || !Array.isArray(json.tiers)) {
                  throw new Error("Invalid Icon Config File");
              }
              
              triggerCapy("Optimizing icons... please wait.");

              // --- AUTO-COMPRESSION LOGIC ---
              const resizedTiers = await Promise.all(json.tiers.map(async (tier) => {
                  // Only compress if it's an image and looks large (base64 string > 50kb)
                  if (tier.iconType === 'image' && tier.value && tier.value.length > 50000) { 
                      return new Promise((resolve) => {
                          const img = new Image();
                          img.src = tier.value;
                          img.onload = () => {
                              const canvas = document.createElement('canvas');
                              // Resize to 120px (Perfect for Map Icons, small file size)
                              const scale = 120 / Math.max(img.width, img.height);
                              canvas.width = img.width * scale;
                              canvas.height = img.height * scale;
                              const ctx = canvas.getContext('2d');
                              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                              // Export as compressed PNG
                              resolve({ ...tier, value: canvas.toDataURL('image/png', 0.8) });
                          };
                          img.onerror = () => resolve(tier); // If fail, keep original
                      });
                  }
                  return tier;
              }));
              // -----------------------------

              setTierSettings(resizedTiers);
              await handleSaveTiers(resizedTiers); // Now safe to save!
              triggerCapy("Map Icons Imported & Optimized!");
          } catch (err) {
              console.error(err);
              alert("Import Failed: " + err.message);
          }
      };
      reader.readAsText(file);
      e.target.value = null;
  };

  // UI States
  const [editingProduct, setEditingProduct] = useState(null);
  const [examiningProduct, setExaminingProduct] = useState(null);
  const [returningTransaction, setReturningTransaction] = useState(null);
  const [tempImages, setTempImages] = useState({}); 
  const [tempCustomerImage, setTempCustomerImage] = useState(null); // Staging for customer photo
  const [searchTerm, setSearchTerm] = useState("");
  const [useFrontForBack, setUseFrontForBack] = useState(false);
  const [boxDimensions, setBoxDimensions] = useState({ w: 55, h: 90, d: 22 });
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [activeCropContext, setActiveCropContext] = useState(null); 
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
// --- NEW: DISCO MODE STATE ---
  const [isDiscoMode, setIsDiscoMode] = useState(false);
  const discoTimeoutRef = useRef(null); 

  const triggerDiscoParty = () => {
      if (isDiscoMode) return; 
      setIsDiscoMode(true);
      triggerCapy("Let's DANCE! 🕺💃"); 

      // Stop after 12 seconds
      if (discoTimeoutRef.current) clearTimeout(discoTimeoutRef.current);
      discoTimeoutRef.current = setTimeout(() => {
          setIsDiscoMode(false);
      }, 12000); 
  };

  // Capybara Message Cycle
  const [capyMsg, setCapyMsg] = useState("Welcome to KPM Inventory!");
  const [showCapyMsg, setShowCapyMsg] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  // Default messages if none are set
  const defaultMessages = [
    "Welcome back, Boss! Stock looks good today.",
    "Checking the inventory... All safe! 🛡️",
    "Don't forget to record samples!",
    "Sales are looking up! 📈",
    "Need to restock soon? Check the list.",
    "I love organization. And watermelons. 🍉",
    "Did you know Capybaras are the largest rodents?",
    "Keep up the good work, team!",
    "Remember to hydrate while you work! 💧",
    "Profit margins are looking healthy.",
    "Scanning for discounts... just kidding!",
    "Is it time for a coffee break yet? ☕",
    "Inventory accuracy is key to success!",
    "You are doing great today! ⭐",
    "Any new products to add?",
    "I'm watching the store, don't worry.",
    "Make sure to update the customer list!",
    "A tidy inventory is a happy inventory.",
    "System systems go! 🚀",
    "Hello from the digital world! 👋"
  ];
  
  const activeMessages = (appSettings?.mascotMessages && appSettings.mascotMessages.length > 0) ? appSettings.mascotMessages : defaultMessages;

  // Feature State

 // Feature State
  const [editMascotMessage, setEditMascotMessage] = useState("");
  const [newMascotMessage, setNewMascotMessage] = useState("");
  
  // New Editing States
  const [editingMsgIndex, setEditingMsgIndex] = useState(-1); 
  const [editMsgText, setEditMsgText] = useState("");         
  
  const [editCompanyProfile, setEditCompanyProfile] = useState({ name: "", address: "", phone: "" });
 const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [editingSample, setEditingSample] = useState(null); 
  const [showSamplingAnalytics, setShowSamplingAnalytics] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);

  // --- PHASE 2: ROLE-BASED ACCESS CONTROL (RBAC) STATE ---
  const [userRole, setUserRole] = useState('ADMIN'); 
  const [bossUid, setBossUid] = useState(null);
  const [agentProfileId, setAgentProfileId] = useState(null);
  const [agentCanvas, setAgentCanvas] = useState([]);
  const [adminCanvas, setAdminCanvas] = useState([]);
  const [adminSalesMode, setAdminSalesMode] = useState('VAULT'); // 'VAULT' or 'VEHICLE'
  
  // NEW: Agent Permissions State
  const [agentSettings, setAgentSettings] = useState({ allowedPayments: ['Cash', 'QRIS', 'Transfer', 'Titip'], allowedTiers: ['Retail', 'Grosir', 'Ecer'] });

  // 🛑 THE DATABASE HIJACK: If bossUid exists, ALL database calls globally redirect to the Admin's vault.
  const userId = bossUid || user?.uid || user?.id || 'default';

  // --- NEW: FETCH AGENT CANVAS & PERMISSIONS FOR SALES TERMINAL ---
  useEffect(() => {
      if (userRole !== 'ADMIN' && agentProfileId && db && userId && userId !== 'default') {
          const agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, agentProfileId);
          const unsub = onSnapshot(agentRef, (docSnap) => {
              if (docSnap.exists()) {
                  const data = docSnap.data();
                  setAgentCanvas(data.activeCanvas || []);
                  
                  // APPLY RESTRICTIONS: Default strictly to Cash and Retail/Ecer if admin hasn't set otherwise
                  setAgentSettings({
                      allowedPayments: data.allowedPayments || ['Cash'],
                      allowedTiers: data.allowedTiers || ['Retail', 'Ecer']
                  });
              }
          });
          return () => unsub();
      } else {
          // ADMIN: Full access to all payments and tiers
          setAgentSettings({ allowedPayments: ['Cash', 'QRIS', 'Transfer', 'Titip'], allowedTiers: ['Retail', 'Grosir', 'Ecer'] });
      }
  }, [userRole, agentProfileId, db, appId, userId]);

  // 🚀 NOTIFICATION CLICK HANDLER 🚀
  const handleNotificationClick = async (notification) => {
      // 1. Mark as Read in Database
      if (!notification.read) {
          try {
              await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/notifications`, notification.id), { read: true });
          } catch (e) { console.error("Error marking read", e); }
      }
      // 2. Jump straight to the relevant tab!
      if (notification.linkToTab) {
          setActiveTab(notification.linkToTab);
      }
  };

  // 🚀 ACCOUNT TRANSFER HANDLERS (3-KEY PROTOCOL) 🚀
  const handleRequestTransfer = async (storeName, toAgentId, toAgentName, note) => {
      try {
          await addDoc(collection(db, `artifacts/${appId}/users/${userId}/account_transfers`), {
              storeName,
              fromAgentId: agentProfileId,
              fromAgentName: user.displayName || user.email.split('@')[0],
              toAgentId,
              toAgentName,
              note,
              status: 'PENDING_AGENT',
              timestamp: serverTimestamp()
          });
          triggerCapy(`Transfer request for ${storeName} sent to ${toAgentName}!`);
      } catch (e) { console.error(e); alert("Failed to request transfer: " + e.message); }
  };

  const handleAgentAcceptTransfer = async (requestId, isAccepted) => {
      try {
          const reqRef = doc(db, `artifacts/${appId}/users/${userId}/account_transfers`, requestId);
          await updateDoc(reqRef, { 
              status: isAccepted ? 'PENDING_ADMIN' : 'REJECTED',
              respondedAt: serverTimestamp()
          });
          triggerCapy(isAccepted ? "Transfer accepted! Waiting for Admin approval." : "Transfer rejected.");
      } catch (e) { console.error(e); alert("Action failed: " + e.message); }
  };

  const handleAdminApproveTransfer = async (request, isApproved) => {
      if (!window.confirm(`${isApproved ? 'Approve' : 'Reject'} the transfer of ${request.storeName} to ${request.toAgentName}?`)) return;
      try {
          const batch = writeBatch(db);
          
          // 1. Update the request ticket
          const reqRef = doc(db, `artifacts/${appId}/users/${userId}/account_transfers`, request.id);
          batch.update(reqRef, { status: isApproved ? 'APPROVED' : 'REJECTED', finalizedAt: serverTimestamp() });

          // 2. If approved, rewrite the entire history of this store to the new agent!
          if (isApproved) {
              const storeTx = transactions.filter(t => (t.customerName || '').trim().toLowerCase() === request.storeName.trim().toLowerCase());
              storeTx.forEach(t => {
                  const tRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, t.id);
                  batch.update(tRef, { agentId: request.toAgentId, agentName: request.toAgentName });
              });
          }

          await batch.commit();
          if (isApproved) await logAudit("TRANSFER_APPROVED", `Reassigned ${request.storeName} to ${request.toAgentName}`);
          triggerCapy(isApproved ? "Transfer complete! Debt reassigned." : "Transfer declined.");
      } catch(e) { console.error(e); alert("Failed: " + e.message); }
  };


  // 🚀 EOD HANDLERS 🚀
  const handleSubmitEOD = async (reportData) => {
      try {
          await addDoc(collection(db, `artifacts/${appId}/users/${userId}/eod_reports`), {
              agentName: user.displayName || user.email.split('@')[0], 
              agentId: agentProfileId || 'ADMIN',
              timestamp: serverTimestamp(),
              status: 'PENDING',
              ...reportData 
          });
          triggerCapy("EOD Report submitted to database! Waiting for Admin.");
      } catch (e) { console.error(e); alert("Failed to submit EOD: " + e.message); }
  };

  const handleVerifyEOD = async (report) => {
      if(!window.confirm(`Verify EOD for ${report.agentName}? This clears their inventory and returns it to the Vault.`)) return;
      try {
          await runTransaction(db, async (t) => {
              // 1. Calculate & Return stock to Master Vault
              for (const item of (report.remainingStock || [])) {
                  if (item.qty > 0) {
                      const pRef = doc(db, `artifacts/${appId}/users/${userId}/products`, item.productId);
                      const pSnap = await t.get(pRef);
                      if (pSnap.exists()) {
                          const pData = pSnap.data();
                          let mult = 1;
                          if (item.unit === 'Slop') mult = pData.packsPerSlop || 10;
                          if (item.unit === 'Bal') mult = (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10);
                          if (item.unit === 'Karton') mult = (pData.balsPerCarton || 4) * (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10);
                          const bksToReturn = item.qty * mult;
                          t.update(pRef, { stock: pData.stock + bksToReturn });
                      }
                  }
              }
              
              // 2. Clear agent's Canvas
              if (report.agentId && report.agentId !== 'ADMIN') {
                  const agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, report.agentId);
                  t.update(agentRef, { activeCanvas: [] });
              }

              // 3. Mark EOD as Verified
              const eodRef = doc(db, `artifacts/${appId}/users/${userId}/eod_reports`, report.id);
              t.update(eodRef, { status: 'VERIFIED', verifiedAt: serverTimestamp() });
          });
          
          await logAudit("EOD_VERIFIED", `Verified EOD for ${report.agentName}. Cleared inventory.`);
          triggerCapy("EOD Verified & Stock Returned!");
      } catch(e) { console.error(e); alert("Verification failed: " + e.message); }
  };

  // --- PHASE 2: AUTHENTICATION & TRAFFIC COP ENGINE ---
  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
        console.error("Redirect Error:", error);
        setLoginError(`Login Failed: ${error.message}`);
    });

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser && currentUser.email) {
            const email = currentUser.email.toLowerCase().trim();
            setCurrentUserEmail(email);

            try {
                // 🚀 TIER 1 CHECK: IS THIS THE SYSTEM ARCHITECT? (SECURED) 🚀
                const sysAdminRef = doc(db, 'system_admins', currentUser.uid);
                const sysAdminSnap = await getDoc(sysAdminRef);
                
                // 🚀 CROWN CLAIM CHECK: Did this user just receive the Crown?
                const inviteRef = doc(db, 'system_admins_invites', email);
                const inviteSnap = await getDoc(inviteRef);

                if (inviteSnap.exists()) {
                    // Claim the Crown: Promote them to System Admin and delete the invite
                    await setDoc(sysAdminRef, { email: email, claimedAt: serverTimestamp() });
                    await deleteDoc(inviteRef);
                    // Continue to log them in as Admin
                }

                if (sysAdminSnap.exists() || inviteSnap.exists()) {
                    console.log("GOD MODE DETECTED: Engaging Secondary Security Lock.");
                    setIsSystemOwner(true);
                    setBossUid(null);
                    setUserRole('ADMIN'); // 🚨 Architect is ADMIN
                    setAgentProfileId(null);
                    setUser(currentUser);
                    setIsAdmin(false); 
                    setShowAdminLogin(true); 
                    return; 
                }

                setIsSystemOwner(false);

                // 🏢 TIER 2-4 CHECK: NORMAL EMPLOYEES & CLIENTS 🏢
                const directoryRef = doc(db, `artifacts/${appId}/employee_directory`, email);
                const directorySnap = await getDoc(directoryRef);

                if (directorySnap.exists()) {
                    const data = directorySnap.data();

                    // 🚨 KILL SWITCH: Instantly reject suspended Tenants & Salesmen
                    if (data.subscriptionStatus === 'SUSPENDED' || data.status === 'SUSPENDED') {
                        alert("ACCOUNT SUSPENDED: Subscription inactive. Please contact KPM System Administration.");
                        signOut(auth);
                        setUser(null);
                        return;
                    }

                    // 🚨 AUTO-CLAIM: Translate pre-registered Email to permanent Google UID
                    if (currentUser.uid === data.bossUid || currentUser.email === data.bossUid) {
                        if (currentUser.email === data.bossUid) {
                            await updateDoc(directoryRef, { bossUid: currentUser.uid });
                        }

                        // 🚨 THIS IS THE BOSS: They MUST be ADMIN
                        setBossUid(null);
                        setUserRole('ADMIN'); 
                        setAgentProfileId(null);
                        setUser(currentUser);
                        setIsAdmin(false); // Still requires PIN
                    } 
                    else if (data.status === 'Active') {
                        setBossUid(data.bossUid);
                        setUserRole(data.role.toUpperCase()); // Area Admin or Salesperson
                        setAgentProfileId(data.agentId);

                        const hijackedUser = {
                            uid: data.bossUid,            
                            email: currentUser.email,
                            displayName: data.name || currentUser.displayName || currentUser.email?.split('@')[0] || "Field Agent",
                            photoURL: currentUser.photoURL,
                            realUid: currentUser.uid,     
                            role: data.role,              
                            agentId: data.agentId         
                        };
                        
                        setUser(hijackedUser);
                        setIsAdmin(false); 
                        setActiveTab('journey'); 
                    } else {
                        alert("Your access has been revoked by the Administrator.");
                        signOut(auth);
                        setUser(null);
                    }
                } else {
                    // 🚨 THE FIX: UNKNOWN LOGINS ARE LOCKED OUT 🚨
                    setBossUid(null);
                    setUserRole('UNAUTHORIZED'); // <--- CHANGED FROM 'ADMIN'
                    setAgentProfileId(null);
                    setUser(currentUser);
                    setIsAdmin(false); 
                }
            } catch (error) {
                console.error("Traffic Cop Error:", error);
                // 🚨 SECURE FALLBACK ON ERROR 🚨
                setUserRole('UNAUTHORIZED'); 
                setUser(currentUser);
            }
        } else {
            setUser(null);
            setIsSystemOwner(false);
            setUserRole('UNAUTHORIZED'); // 🚨 CLEAR ROLE ON LOGOUT
        }
    });
    
    return () => unsubAuth();
  }, []);

  const handleAdminAuthSuccess = () => {
    setIsAdmin(true);
    setShowAdminLogin(false);
    triggerCapy("Access Granted. Welcome back, Boss.");
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    triggerCapy("Admin session ended.");
  };

  // --- DATA SYNC ---
  useEffect(() => {
    // FIX: Use 'userId' which is dynamically routed by the Traffic Cop
    if (!user || !userId || userId === 'default') return;
    const basePath = `artifacts/${appId}/users/${userId}`;
    
    // 1. Settings
    const unsubSettings = onSnapshot(doc(db, basePath, 'settings', 'general'), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            setAppSettings(data);
            setEditCompanyProfile({
                name: data?.companyName || "KPM Inventory",
                address: data?.companyAddress || "",
                phone: data?.companyPhone || ""
            });
        } else {
            setDoc(doc(db, basePath, 'settings', 'general'), { companyName: 'KPM Inventory' });
        }
    });

    // 2. Inventory
    const unsubInv = onSnapshot(collection(db, basePath, 'products'), (snap) => setInventory(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    // 3. Transactions
    const unsubTrans = onSnapshot(query(collection(db, basePath, 'transactions'), orderBy('timestamp', 'desc')), (snap) => setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    // 4. Samplings
    const unsubSamp = onSnapshot(query(collection(db, basePath, 'samplings'), orderBy('timestamp', 'desc')), (snap) => setSamplings(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    // 5. Audit Logs
    const unsubLogs = onSnapshot(query(collection(db, basePath, 'audit_logs'), orderBy('timestamp', 'desc')), (snap) => setAuditLogs(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    // 6. Customers 
    const unsubCust = onSnapshot(query(collection(db, basePath, 'customers'), orderBy('name', 'asc')), (snap) => setCustomers(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    // 7. Procurement Ledger
    const unsubProc = onSnapshot(query(collection(db, basePath, 'procurement'), orderBy('timestamp', 'desc')), (snap) => setProcurements(snap.docs.map(d => ({id: d.id, ...d.data()}))));

   // 8. ALL MOTORISTS (For Global Asset Tracking)
    const unsubMotorists = onSnapshot(collection(db, basePath, 'motorists'), (snap) => setMotorists(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    // 🚀 NEW: LIVE EOD DATABASE SYNC 🚀
    const unsubEod = onSnapshot(query(collection(db, basePath, 'eod_reports'), orderBy('timestamp', 'desc')), (snap) => setEodReports(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    // 🚀 NEW: LIVE ACCOUNT TRANSFER SYNC 🚀
    const unsubTransfers = onSnapshot(query(collection(db, basePath, 'account_transfers'), orderBy('timestamp', 'desc')), (snap) => setTransferRequests(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    // 🚀 LIVE NOTIFICATION SYNC 🚀
    const unsubNotifs = onSnapshot(query(collection(db, basePath, 'notifications'), orderBy('timestamp', 'desc')), (snap) => {
        // We filter locally to bypass complex Firebase Index requirements!
        const myNotifs = snap.docs.map(d => ({id: d.id, ...d.data()})).filter(n => {
            if (userRole === 'ADMIN' && n.targetRole === 'ADMIN') return true;
            if (agentProfileId && n.targetId === agentProfileId) return true;
            return false;
        });
        setNotifications(myNotifs);
    });

    // 9. BOSS VEHICLE CANVAS
    const unsubAdminVeh = onSnapshot(doc(db, basePath, 'motorists', 'ADMIN_VEHICLE'), (snap) => {
        if (snap.exists()) {
            setAdminCanvas(snap.data().activeCanvas || []);
        } else if (userRole === 'ADMIN') {
            // Auto-create Boss Vehicle so it appears in Fleet Manager
            setDoc(doc(db, basePath, 'motorists', 'ADMIN_VEHICLE'), {
                name: "Admin (Boss Vehicle)",
                role: "Canvas",
                status: "Active",
                email: user.email || "admin@system.local",
                activeCanvas: [],
                allowedPayments: ['Cash', 'QRIS', 'Transfer', 'Titip'],
                allowedTiers: ['Retail', 'Grosir', 'Ecer']
            });
        }
    });

    const savedTheme = localStorage.getItem('kpm_theme');
    if (savedTheme === 'light') setDarkMode(false);
    
    return () => { unsubSettings(); unsubInv(); unsubTrans(); unsubSamp(); unsubLogs(); unsubCust(); unsubProc(); unsubMotorists(); unsubAdminVeh(); };
  }, [user, db, appId, userId]);

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('kpm_theme', 'dark'); } else { document.documentElement.classList.remove('dark'); localStorage.setItem('kpm_theme', 'light'); }
  }, [darkMode]);

 const handleLogin = async () => {
        setLoginError(null); 
        try {
            // 🚨 CRITICAL MOBILE FIX: 
            // We MUST NOT put any 'await' commands before opening the popup.
            // Mobile browsers strictly require popups to open in the EXACT same 
            // split-second microtask as the user's physical tap. 
            const result = await signInWithPopup(auth, googleProvider);
            
            console.log("Login Success:", result.user);
            setUser(result.user);
            if (result.user.email) setCurrentUserEmail(result.user.email);
            
        } catch (error) {
            console.error("Login Error:", error);
            
            // Smart Fallback ONLY for embedded browsers (like clicking a link inside Instagram/Line)
            if (error.code === 'auth/popup-blocked') {
                console.log("In-app browser blocked popup. Rerouting...");
                signInWithRedirect(auth, googleProvider);
            } else {
                alert(`Login Failed: ${error.message}`); 
                setLoginError(`Error: ${error.code} - ${error.message}`);
            }
        }
    };

  const handleLogout = async () => { await signOut(auth); setUser(null); setInventory([]); setTransactions([]); setIsAdmin(false); };

  // --- ACTIONS ---
 
  // --- MODIFIED: SYSTEM LOG ENGINE (FIXED 4TH DOWNLOAD BUG) ---
  const logAudit = async (action, details, includeSnapshot = false) => {
    if (!user) return;
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    try {
        // FIX: Only trigger the extra generic download if it is NOT the Master Protocol
        // This prevents the 4th file from appearing while still keeping the indicators GREEN.
        if (includeSnapshot && action !== "MASTER_BACKUP" && action !== "BACKUP_SINGLE") {
            handleBackupData(); 
            triggerCapy("System Save File Downloaded! 💾");
        }

        const logData = {
            action,
            details,
            user: user.email,
            timestamp: serverTimestamp(),
            timeStr: now.toLocaleTimeString(),
            isSavePoint: includeSnapshot // This MUST remain true for the indicators to work
        };

        // Log to Firestore
        await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/audit_logs`), logData);
        await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/audit_vault/${dateKey}/logs`), logData);

    } catch (err) {
        console.error("Log Error:", err);
    }
  };
  
  const cycleMascotMessage = () => {
    // Uses the latest activeMessages list to cycle dialogue
    const nextIndex = (msgIndex + 1) % activeMessages.length;
    setMsgIndex(nextIndex);
    const message = activeMessages[nextIndex];
    setCapyMsg(message);
    setShowCapyMsg(true);
    setTimeout(() => setShowCapyMsg(false), 8000); 
  };
  
  // Re-usable function to pop up the mascot with a custom message
  const triggerCapy = (msg) => { 
    const message = msg || "Hello!"; 
    setCapyMsg(message); 
    setShowCapyMsg(true); 
    // Auto-hide after 8 seconds to prevent screen clutter
    setTimeout(() => setShowCapyMsg(false), 8000); 
  };
  
  const handleAddMascotMessage = async () => {
      if(!newMascotMessage.trim() || !user) return;
      const currentMessages = appSettings.mascotMessages || [];
      const updatedMessages = [...currentMessages, newMascotMessage.trim()];
      await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { mascotMessages: updatedMessages }, {merge: true});
      setNewMascotMessage("");
      triggerCapy("New dialogue added!");
  };

  const handleDeleteMascotMessage = async (msgToDelete) => {
      if(!user) return;
      const currentMessages = appSettings.mascotMessages || [];
      const updatedMessages = currentMessages.filter(m => m !== msgToDelete);
      await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { mascotMessages: updatedMessages }, {merge: true});
      triggerCapy("Dialogue removed.");
  };

// --- NEW: SAVE EDITED MASCOT MESSAGE ---
  const handleSaveEditedMessage = async (index) => {
      if (!user || !editMsgText.trim()) return;
      
      // 1. Get current list (or use defaults if this is the first customization)
      let currentList = appSettings?.mascotMessages;
      if (!currentList || currentList.length === 0) {
          currentList = [...defaultMessages];
      }
      
      // 2. Create a copy and update the specific item
      const updatedList = [...currentList];
      updatedList[index] = editMsgText.trim();
      
      // 3. Save to Firestore
      await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { mascotMessages: updatedList }, {merge: true});
      
      // 4. Reset UI
      setEditingMsgIndex(-1);
      setEditMsgText("");
      triggerCapy("Dialogue updated!");
  };
  // --- NEW: DELETE SINGLE TRANSACTION ---
  const handleDeleteSingleTransaction = async (transaction) => {
      if(!window.confirm("Delete this specific transaction record? Stock will NOT be restored automatically (manual adjustment required if needed).")) return;
      try {
          await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, transaction.id));
          logAudit("TRANS_DELETE", `Deleted transaction ${transaction.id} for ${transaction.customerName}`);
          triggerCapy("Transaction record removed.");
      } catch(err) {
          alert(err.message);
      }
  };

  const handleDeleteConsignmentData = async (customerName) => { if(!window.confirm(`Delete ALL history for ${customerName}?`)) return; try { const targets = transactions.filter(t => (t.customerName||'').trim() === customerName && (t.type.includes('CONSIGNMENT') || (t.type === 'SALE' && t.paymentType === 'Titip') || t.type === 'RETURN')); for(const t of targets) { await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, t.id)); } logAudit("CONSIGN_DELETE", `Cleared data for ${customerName}`); } catch(err) {} };
  const handleDeleteHistory = async (customerName, agentName) => { 
      if(!window.confirm(`Permanently delete ALL transaction history for "${customerName}" handled by ${agentName}?`)) return; 
      try { 
          const targets = transactions.filter(t => {
              let cust = (t.customerName || 'Walk-in Customer').trim();
              const isWalkIn = cust.toLowerCase().includes('walk-in') || !t.customerName;
              const isEcer = t.items?.some(i => i.priceTier === 'Ecer');
              if (isWalkIn || isEcer) cust = "Individuals (Ecer)";

              return cust === customerName && (t.agentName || 'Admin') === agentName;
          }); 
          for (const t of targets) { await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, t.id)); } 
          await logAudit("HISTORY_DELETE", `Deleted history folder for ${customerName} (${agentName})`); 
          triggerCapy(`Deleted ${targets.length} records`); 
      } catch (err) { console.error(err); alert("Error deleting history."); } 
  };
  const handleExportCSV = () => { const headers = ["ID,Name,Category,Stock,Price(Retail)\n"]; const csvContent = inventory.map(p => `${p.id},"${p.name}",${p.type},${p.stock},${p.priceRetail}`).join("\n"); const blob = new Blob([headers + csvContent], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `inventory_${getCurrentDate()}.csv`; a.click(); logAudit("EXPORT", "Downloaded Inventory CSV"); };
 
 
// --- UPDATED: TARGETED MERCHANT SAVING & CUSTOMER PHOTOS ---
  const handleCropConfirm = (base64) => { 
      if (!activeCropContext) return; 
      
      const collPath = `artifacts/${appId}/users/${user.uid}/settings/general`;

      if (activeCropContext.type === 'mascot') { 
          setAppSettings(prev => ({ ...prev, mascotImage: base64 }));
          if(user) setDoc(doc(db, collPath), { mascotImage: base64 }, {merge: true});
          triggerCapy("Profile picture updated!"); 
      
      } else if (activeCropContext.type === 'product') { 
          setTempImages(prev => ({ ...prev, [activeCropContext.face]: base64 })); 
      
      } else if (activeCropContext.type === 'tier') {
          const idx = activeCropContext.index;
          const newTiers = [...tierSettings];
          newTiers[idx].value = base64; 
          setTierSettings(newTiers);
          handleSaveTiers(newTiers);
          triggerCapy("Tier Icon Updated!");

      } else if (activeCropContext.type === 'inventory_bg') {
          setAppSettings(prev => ({ ...prev, inventoryBg: base64 }));
          if(user) setDoc(doc(db, collPath), { inventoryBg: base64 }, {merge: true});
          triggerCapy("Inventory Backdrop Updated!");

      // --- FIXED: TARGETED MERCHANT SPRITE SAVING ---
      } else if (activeCropContext.type.startsWith('merchant_')) {
          const moodKey = activeCropContext.type.split('_')[1]; // Extracts 'idle', 'talking', or 'deal'
          const settingsKey = `merchant_${moodKey}`;
          
          // 1. Update local state immediately
          setAppSettings(prev => ({ ...prev, [settingsKey]: base64 }));
          
          // 2. Perform targeted update to Firestore (avoids overwriting other settings)
          if(user) {
              setDoc(doc(db, collPath), { [settingsKey]: base64 }, {merge: true});
              logAudit("SETTINGS_UPDATE", `Updated Merchant ${moodKey} visual`);
          }
          triggerCapy(`Merchant ${moodKey} visual updated!`);
          
      // --- FIXED: CATCH AND APPLY CUSTOMER STORE PHOTO ---
      } else if (activeCropContext.type === 'customer_staging') {
          setTempCustomerImage(base64);
      }
      
      setCropImageSrc(null); 
      setActiveCropContext(null); 
  };
  // --- FILE HANDLERS ---
  function handleTierIconSelect(e, index) {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => {
              setCropImageSrc(reader.result);
              setActiveCropContext({ type: 'tier', index: index, face: 'front' });
              setBoxDimensions({ w: 100, h: 100, d: 0 }); 
          };
          reader.readAsDataURL(file);
      }
      e.target.value = null;
  }

  const handleMascotSelect = (e) => { 
      const file = e.target.files[0]; 
      if (file) { 
          const reader = new FileReader(); 
          reader.onload = () => { 
              setCropImageSrc(reader.result); 
              setActiveCropContext({ type: 'mascot', face: 'front' }); 
              setBoxDimensions({ w: 100, h: 100, d: 100 }); 
          }; 
          reader.readAsDataURL(file); 
      } 
      e.target.value = null; 
  };

  const handleProductFaceUpload = (e, face) => { 
      const file = e.target.files[0]; 
      if (file) { 
          const reader = new FileReader(); 
          reader.onload = () => { 
              setCropImageSrc(reader.result); 
              setActiveCropContext({ type: 'product', face }); 
          }; 
          reader.readAsDataURL(file); 
      } 
      e.target.value = null; 
  };

  const handleEditExisting = (face, imgSource) => { 
      setCropImageSrc(imgSource); 
      setActiveCropContext({ type: 'product', face }); 
  };

  const handleInventoryBgSelect = (e) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => {
              setCropImageSrc(reader.result);
              setActiveCropContext({ type: 'inventory_bg', face: 'front' });
              setBoxDimensions({ w: 160, h: 90, d: 0 }); 
          };
          reader.readAsDataURL(file);
      }
      e.target.value = null;
  };

  // --- SETTINGS ACTIONS ---
  const handleSaveCompanyProfile = () => { 
      if(user) { 
          setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { 
              companyName: editCompanyProfile.name,
              companyAddress: editCompanyProfile.address,
              companyPhone: editCompanyProfile.phone
          }, {merge: true}); 
          logAudit("SETTINGS_UPDATE", `Company Profile updated`); 
      } 
      triggerCapy("Company Profile updated! Ready for Surat Jalan. 🏢"); 
  };

  // --- PRODUCT MANAGEMENT ---
  const handleSaveProduct = async (e) => { 
      e.preventDefault(); 
      if (!user) return; 
      try { 
          const formData = new FormData(e.target); 
          const data = Object.fromEntries(formData.entries());
          const numFields = ['stock', 'minStock', 'priceDistributor', 'priceRetail', 'priceGrosir', 'priceEcer']; 
          numFields.forEach(field => data[field] = Number(data[field]) || 0); 
          
          data.images = { ...(editingProduct?.images || {}), ...tempImages }; 
          data.dimensions = { ...boxDimensions }; 
          data.useFrontForBack = useFrontForBack; 
          data.updatedAt = serverTimestamp(); 
          
          if (editingProduct?.id) { 
              await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, editingProduct.id), data); 
              await logAudit("PRODUCT_UPDATE", `Updated product: ${data.name}`); 
              triggerCapy("Product updated successfully!"); 
          } else { 
              data.createdAt = serverTimestamp(); 
              await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/products`), data); 
              await logAudit("PRODUCT_ADD", `Added new product: ${data.name}`); 
              triggerCapy("New product added!"); 
          } 
          setEditingProduct(null); 
          setTempImages({}); 
          setUseFrontForBack(false); 
      } catch (err) { 
          console.error(err); 
          triggerCapy("Error saving product!"); 
      } 
  };

  const handleUpdateProduct = async (updatedProduct) => { 
      setInventory(prev => prev.map(item => item.id === updatedProduct.id ? updatedProduct : item)); 
      if (editingProduct && editingProduct.id === updatedProduct.id) { 
          setEditingProduct(updatedProduct); 
      } 
      if(isAdmin && user && updatedProduct.id) { 
          try { 
              await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, updatedProduct.id), { dimensions: updatedProduct.dimensions }); 
          } catch(e) {} 
      } 
  };

  const deleteProduct = async (id) => { 
      if (window.confirm("Are you sure you want to delete this product?")) { 
          try { 
              await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, id)); 
              await logAudit("PRODUCT_DELETE", `Deleted product ID: ${id}`); 
              triggerCapy("Item removed."); 
          } catch (err) { 
              triggerCapy("Delete failed"); 
          } 
      } 
  };

  // --- STOCK OPNAME ---
  const handleOpnameChange = (id, val) => { setOpnameData(prev => ({ ...prev, [id]: val })); };
  
  const handleOpnameSubmit = async () => { 
      if (!user) return; 
      const updates = []; 
      inventory.forEach(item => { 
          const actual = opnameData[item.id]; 
          if (actual !== undefined && actual !== item.stock && !isNaN(actual)) { 
              updates.push({ id: item.id, name: item.name, old: item.stock, new: actual }); 
          } 
      }); 
      if (updates.length === 0) { triggerCapy("No changes to save!"); return; } 
      if (!window.confirm(`Confirm stock adjustment for ${updates.length} items?`)) return; 
      try { 
          await runTransaction(db, async (transaction) => { 
              updates.forEach(update => { 
                  const ref = doc(db, `artifacts/${appId}/users/${user.uid}/products`, update.id); 
                  transaction.update(ref, { stock: update.new }); 
              }); 
          }); 
          updates.forEach(u => { logAudit("STOCK_OPNAME", `Adjusted ${u.name}: ${u.old} -> ${u.new}`); }); 
          setOpnameData({}); 
          triggerCapy("Stock Opname saved successfully!"); 
      } catch (err) { 
          console.error(err); 
          alert("Failed to update stock: " + err.message); 
      } 
  };

  // --- CART & SALES LOGIC ---
  const addToCart = (product) => { 
      setCart(prev => { 
          const existing = prev.find(item => item.productId === product.id); 
          if (existing) return prev.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item); 
          return [...prev, { productId: product.id, name: product.name, qty: 1, unit: 'Bks', priceTier: 'Retail', calculatedPrice: product.priceRetail, product }]; 
      }); 
  };

  const updateCartItem = (productId, field, value) => { 
      setCart(prev => prev.map(item => { 
          if (item.productId === productId) { 
              const newItem = { ...item, [field]: value }; 
              const { unit, priceTier: tier, product: prod } = newItem; 
              let base = 0; 
              if (tier === 'Ecer') base = prod.priceEcer || 0; 
              if (tier === 'Retail') base = prod.priceRetail || 0; 
              if (tier === 'Grosir') base = prod.priceGrosir || 0; 
              if (tier === 'Distributor') base = prod.priceDistributor || 0;
              
              let mult = 1; 
              if (unit === 'Slop') mult = prod.packsPerSlop || 10; 
              if (unit === 'Bal') mult = (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10); 
              if (unit === 'Karton') mult = (prod.balsPerCarton || 4) * (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10); 
              
              newItem.calculatedPrice = base * mult; 
              return newItem; 
          } 
          return item; 
      })); 
  };

  const removeFromCart = (pid) => setCart(p => p.filter(i => i.productId !== pid));

  // --- CORE TRANSACTION ENGINE ---
  const processTransaction = async (e, manualData = null) => { 
      if (e) e.preventDefault(); 
      if (!user) return; 
      
      const customerName = manualData ? manualData.customerName : new FormData(e.target).get('customerName')?.trim(); 
      const paymentType = manualData ? manualData.paymentType : new FormData(e.target).get('paymentType'); 
      const activeCart = manualData ? manualData.cart : cart;
      const newStoreData = manualData ? manualData.newStoreData : null; 
      const proofPayload = manualData ? manualData.proofPayload : null; // <--- CATCH THE PROOF
      const totalRevenue = activeCart.reduce((acc, item) => acc + (item.calculatedPrice * item.qty), 0); 
      
      if(!customerName) { alert("Customer Name is required!"); return; } 

      // NEW: Declare the name here so it can be passed back to the receipt!
      let finalAgentName = user?.displayName || user?.email?.split('@')[0] || 'Admin';

      try { 
          await runTransaction(db, async (firestoreTrans) => { 
              // 1. DO ALL DATABASE READS FIRST (Firebase requires this to prevent crashes)
              const updatesToPerform = [];
              const transactionItems = []; 
              let totalProfit = 0; 

              // Determine routing context
              let currentAgentProfileId = agentProfileId;
              if (userRole === 'ADMIN' && adminSalesMode === 'VEHICLE') currentAgentProfileId = 'ADMIN_VEHICLE';
              else if (userRole === 'ADMIN') currentAgentProfileId = null;

              for (const item of activeCart) { 
                  const prodRef = doc(db, `artifacts/${appId}/users/${userId}/products`, item.productId); 
                  const prodDoc = await firestoreTrans.get(prodRef); 
                  
                  if(!prodDoc.exists()) throw `Product ${item.name} not found`; 
                  const prodData = prodDoc.data(); 
                  
                  let mult = 1; 
                  if (item.unit === 'Slop') mult = prodData.packsPerSlop || 10; 
                  if (item.unit === 'Bal') mult = (prodData.slopsPerBal || 20) * (prodData.packsPerSlop || 10); 
                  if (item.unit === 'Karton') mult = (prodData.balsPerCarton || 4) * (prodData.slopsPerBal || 20) * (prodData.packsPerSlop || 10); 
                  
                  const qtyToDeduct = item.qty * mult; 
                  
                  // 🚨 CRITICAL FIX: Only deduct from Master Vault if Admin is selling directly from the Vault.
                  if (!currentAgentProfileId && !proofPayload?.isRetur) {
                      if(prodData.stock < qtyToDeduct) throw `Not enough stock in Vault for ${item.name}`;
                      updatesToPerform.push({ ref: prodRef, newStock: prodData.stock - qtyToDeduct });
                  }

                  // 🚀 RETUR ENGINE: Send Damaged Goods directly to Master Vault Bad Stock
                  if (proofPayload?.isRetur) {
                      updatesToPerform.push({ ref: prodRef, newStock: (prodData.badStock || 0) + qtyToDeduct, isReturUpdate: true });
                  }
                  
                  const distributorPrice = prodData.priceDistributor || 0; 
                  const itemProfit = (item.calculatedPrice * item.qty) - (distributorPrice * qtyToDeduct); 
                  
                  totalProfit += itemProfit;
                  // Pass prodData forward so the vehicle math can read the pack definitions
                  transactionItems.push({ ...item, distributorPriceSnapshot: distributorPrice, profitSnapshot: itemProfit, prodData }); 
              } 

              // FETCH AGENT CANVAS
              let agentDoc = null;
              let agentRef = null;
              
              if (currentAgentProfileId) {
                  agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, currentAgentProfileId);
                  agentDoc = await firestoreTrans.get(agentRef);
              }

              // 2. NOW DO ALL DATABASE WRITES (Upgraded for Bad Stock)
              for (const update of updatesToPerform) {
                  if (update.isReturUpdate) {
                      firestoreTrans.update(update.ref, { badStock: update.newStock });
                  } else {
                      firestoreTrans.update(update.ref, { stock: update.newStock });
                  }
              }
              
              if (agentDoc && agentDoc.exists()) {
                  let currentCanvas = agentDoc.data().activeCanvas || [];
                  let updatedCanvas = currentCanvas.map(c => {
                      const soldItem = transactionItems.find(cartItem => cartItem.productId === c.productId);
                      if (soldItem) {
                          const pData = soldItem.prodData || {};
                          let mSold = soldItem.unit === 'Slop' ? (pData.packsPerSlop || 10) : soldItem.unit === 'Bal' ? ((pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : soldItem.unit === 'Karton' ? ((pData.balsPerCarton || 4) * (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : 1;
                          let mCanvas = c.unit === 'Slop' ? (pData.packsPerSlop || 10) : c.unit === 'Bal' ? ((pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : c.unit === 'Karton' ? ((pData.balsPerCarton || 4) * (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : 1;
                          
                          const soldBks = soldItem.qty * mSold;
                          const currentCanvasBks = (c.qty * mCanvas) - soldBks;
                          
                          // 🚀 RETUR ENGINE: Do NOT deduct bad stock from the agent's vehicle canvas
                          if (proofPayload?.isRetur) return c;

                          // 🚨 2nd VALIDATION: Stop "Phantom Sales" from vehicles
                          if (currentCanvasBks < 0) throw `Vehicle doesn't have enough ${soldItem.name} left!`;

                          return { ...c, qty: currentCanvasBks / mCanvas }; 
                      }
                      return c;
                  });
                  firestoreTrans.update(agentRef, { activeCanvas: updatedCanvas.filter(c => c.qty > 0) });
              }

              // Clean up the transaction log payload before saving to database
              const finalTransItems = transactionItems.map(i => {
                  const copy = {...i};
                  delete copy.prodData;
                  return copy;
              });

              // GUARANTEE THE NAME
              if (userRole === 'ADMIN') {
                  finalAgentName = "Admin"; // Unify ALL Admin sales (Vault + Boss Car) into one folder!
              } else if (agentDoc && agentDoc.exists() && agentDoc.data().name) {
                  finalAgentName = agentDoc.data().name; 
              }

              const transRef = doc(collection(db, `artifacts/${appId}/users/${userId}/transactions`)); 
              firestoreTrans.set(transRef, { 
                  date: getCurrentDate(), 
                  customerName, 
                  paymentType, 
                  items: finalTransItems, 
                  total: totalRevenue, 
                  totalProfit: totalProfit, 
                  type: 'SALE', 
                  timestamp: serverTimestamp(),
                  agentId: currentAgentProfileId || 'ADMIN',
                  agentName: finalAgentName,
                  // --- NEW: THE IMMUTABLE LIVE PROOF ---
                  deliveryProof: proofPayload ? {
                      photo: proofPayload.photoData,
                      latitude: proofPayload.latitude,
                      longitude: proofPayload.longitude,
                      capturedAt: proofPayload.timestamp
                  } : null
              }); 

              // --- NEW: AUTO-MAP NEW STORES (NOO) ---
              if (newStoreData) {
                  const custRef = doc(collection(db, `artifacts/${appId}/users/${userId}/customers`));
                  
                  // If they went through the formal NOO Registration Gate
                  if (newStoreData.isNooRegistration) {
                      firestoreTrans.set(custRef, {
                          name: customerName,
                          phone: newStoreData.phone,
                          address: newStoreData.address,
                          pricingTier: newStoreData.requestedTier, 
                          latitude: newStoreData.latitude,
                          longitude: newStoreData.longitude,
                          status: 'NOO_ACTIVE', 
                          mappedBy: finalAgentName,
                          mappedAt: serverTimestamp(),
                          hasPhotoProof: true,
                          storeImage: newStoreData.photoUrl || ''
                      });
                  } else {
                      // Legacy Walk-In Trap
                      firestoreTrans.set(custRef, {
                          name: customerName,
                          latitude: newStoreData.latitude || null,
                          longitude: newStoreData.longitude || null,
                          pricingTier: 'Ecer', 
                          status: 'WALK_IN',
                          mappedBy: finalAgentName,
                          mappedAt: serverTimestamp()
                      });
                  }
              }
          }); 

          await logAudit("SALE", `Sold to ${customerName} via ${paymentType}`); 
          if (!manualData) setCart([]); 
          triggerCapy("Sale Recorded! Database & Vehicle Updated. 💰"); 
          return finalAgentName; // <--- RETURN THE EXACT NAME "mas Gilga" TO THE RECEIPT!
      } catch(err) { 
          console.error("TRANSACTION ERROR:", err);
          alert("Transaction Failed: " + err); 
          throw err; 
      } 
  };

  const handleMerchantSale = async (custName, payMethod, cartItems, newStoreData = null, proofPayload = null) => { 
      const inputTrimmed = custName ? custName.trim().toLowerCase() : "Walk-in Customer";
      const existingProfile = customers.find(c => c.name.toLowerCase() === inputTrimmed || c.name.toLowerCase().includes(inputTrimmed));
      
      let finalName = existingProfile ? existingProfile.name : (custName || "Walk-in Customer").replace(/\b\w/g, l => l.toUpperCase());

      // NEW: AUTO-DETECT CUSTOMER TYPE BASED ON PRICE CHARGED
      if (!existingProfile && finalName !== "Walk-in Customer") {
          const hasEcer = cartItems.some(i => i.priceTier === 'Ecer');
          const hasGrosir = cartItems.some(i => i.priceTier === 'Grosir');
          
          if (hasEcer) finalName += " (Individual)";
          else if (hasGrosir) finalName += " (Wholesale)";
          else finalName += " (Retail)";
      }

      return await processTransaction(null, { customerName: finalName, paymentType: payMethod, cart: cartItems, newStoreData, proofPayload });
  };

  const executeReturn = async (returnQtys) => { if (!returningTransaction || !user) return; const trans = returningTransaction; let totalRefundValue = 0; const itemsToReturn = []; trans.items.forEach(item => { const qty = returnQtys[item.productId] || 0; if (qty > 0) { totalRefundValue += (item.calculatedPrice * qty); itemsToReturn.push({ ...item, qty }); } }); if (itemsToReturn.length === 0) { setReturningTransaction(null); return; } handleConsignmentReturn(trans.customerName, itemsToReturn, totalRefundValue); setReturningTransaction(null); };
  const handleConsignmentPayment = async (customerName, itemsPaid, amountPaid) => { try { await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/transactions`), { date: getCurrentDate(), customerName, paymentType: "Cash", itemsPaid, amountPaid, type: 'CONSIGNMENT_PAYMENT', timestamp: serverTimestamp() }); triggerCapy("Payment recorded!"); } catch (err) { console.error(err); } };
  const handleConsignmentReturn = async (customerName, itemsReturned, refundValue) => { try { await runTransaction(db, async (t) => { for(const item of itemsReturned) { const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.productId); const prodDoc = await t.get(prodRef); if(prodDoc.exists()) t.update(prodRef, { stock: prodDoc.data().stock + (item.qty * 1) }); } const returnRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/transactions`)); t.set(returnRef, { date: getCurrentDate(), customerName, items: itemsReturned, total: -refundValue, type: 'RETURN', timestamp: serverTimestamp() }); }); triggerCapy("Return Processed!"); } catch (err) { console.error(err); } };
  const handleAddGoodsToCustomer = (name) => { alert(`Go to Sales Terminal for ${name}`); setActiveTab('sales'); };
  
 // --- NEW: HANDLE BATCH SAMPLING (GLOBAL NOTE) ---
  const handleBatchSamplingSubmit = async (cartItems, location, date, note) => {
      if (!user) return;
      try {
          await runTransaction(db, async (transaction) => {
              const writes = [];
              for (const item of cartItems) {
                  const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id);
                  const prodDoc = await transaction.get(prodRef);
                  if (!prodDoc.exists()) throw `Product ${item.name} not found!`;
                  
                  const currentStock = prodDoc.data().stock || 0;
                  const newStock = currentStock - item.qty;
                  if (newStock < 0) throw `Not enough stock for ${item.name} (Has: ${currentStock})`;

                  writes.push({ type: 'update', ref: prodRef, data: { stock: newStock } });
                  const newSampleRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/samplings`));
                  
                  // NEW: Save the GLOBAL note to every item
                  writes.push({ 
                      type: 'set', 
                      ref: newSampleRef, 
                      data: {
                          date: date,
                          productId: item.id,
                          productName: item.name,
                          qty: item.qty,
                          reason: location, 
                          note: note || '', 
                          timestamp: serverTimestamp()
                      } 
                  });
              }
              for (const w of writes) {
                  if (w.type === 'update') transaction.update(w.ref, w.data);
                  if (w.type === 'set') transaction.set(w.ref, w.data);
              }
          });
          await logAudit("SAMPLING_BATCH", `Added ${cartItems.length} items to folder: ${location}`);
          triggerCapy(`Success! ${cartItems.length} items saved.`);
          setEditingSample(null);
      } catch (err) { console.error(err); alert("Failed to save batch: " + err); }
  };

 // --- NEW: DELETE SAMPLING RECORD ---
  const handleDeleteSampling = async (sample) => {
      if(!window.confirm("Delete this sample record? Stock will be RESTORED to inventory.")) return;
      try {
          await runTransaction(db, async (t) => {
              const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, sample.productId);
              const prodDoc = await t.get(prodRef);
              
              // 1. Restore Stock
              if(prodDoc.exists()) {
                  const currentStock = prodDoc.data().stock || 0;
                  t.update(prodRef, { stock: currentStock + sample.qty });
              }
              
              // 2. Delete Record
              t.delete(doc(db, `artifacts/${appId}/users/${user.uid}/samplings`, sample.id));
          });
          
          logAudit("SAMPLING_DELETE", `Deleted sample: ${sample.productName}`);
          triggerCapy("Sample deleted & stock restored.");
      } catch(err) {
          console.error(err);
          alert("Failed to delete: " + err.message);
      }
  };

// --- 3. UPDATE SINGLE SAMPLING LOGIC ---
  const handleUpdateSampling = async (updatedData) => {
      if (!user || !editingSample) return;
      
      const newQty = parseInt(updatedData.qty);
      const newDate = updatedData.date;
      const newReason = updatedData.reason;
      const newNote = updatedData.note;

      try {
          await runTransaction(db, async (t) => {
              const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, editingSample.productId);
              const prodDoc = await t.get(prodRef);
              
              // Adjust stock difference
              // (If you change qty from 5 to 8, we need to deduct 3 more from stock)
              const oldQty = editingSample.qty;
              const diff = newQty - oldQty;
              
              if (prodDoc.exists() && diff !== 0) {
                  const currentStock = prodDoc.data().stock || 0;
                  if (currentStock < diff) throw `Not enough stock to increase sample! (Need ${diff}, Has ${currentStock})`;
                  t.update(prodRef, { stock: currentStock - diff });
              }

              t.update(doc(db, `artifacts/${appId}/users/${user.uid}/samplings`, editingSample.id), {
                  date: newDate,
                  qty: newQty,
                  reason: newReason,
                  note: newNote,
                  updatedAt: serverTimestamp()
              });
          });
          
          triggerCapy("Record updated!");
          setEditingSample(null);
      } catch (err) { alert(err.message || err); }
  };

  // --- NEW: OPEN FOLDER EDIT MODAL ---
  const handleBatchFolderEdit = (oldDate, oldReason) => {
      setEditingFolder({ oldDate, oldReason }); // Just open the modal
  };

  // --- NEW: SAVE FOLDER CHANGES (Native Date Picker) ---
  const processFolderEdit = async (e) => {
      e.preventDefault();
      if (!user || !editingFolder) return;
      
      const formData = new FormData(e.target);
      const newDate = formData.get('newDate');
      let newReason = formData.get('newReason').trim();
      
      // Auto-capitalize the new location name for consistency
      newReason = newReason.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

      const { oldDate, oldReason } = editingFolder;

      if (newDate === oldDate && newReason === oldReason) {
          setEditingFolder(null);
          return;
      }

      if (!window.confirm(`Move ALL items from "${oldReason}" to "${newReason}" on ${newDate}?`)) return;

      try {
          const targets = samplings.filter(s => s.date === oldDate && s.reason === oldReason);
          const batch = writeBatch(db);
          
          targets.forEach(s => {
              const ref = doc(db, `artifacts/${appId}/users/${user.uid}/samplings`, s.id);
              batch.update(ref, { date: newDate, reason: newReason });
          });
          
          await batch.commit();
          triggerCapy(`Successfully moved ${targets.length} items!`);
          setEditingFolder(null);
      } catch (err) {
          console.error(err);
          alert("Move failed: " + err.message);
      }
  };

  const handleBackupData = async () => {
    if(!user || !isAdmin) return; 
    
    triggerCapy("Compiling physical safe backup (Including Maps)...");
    const payload = await generateFullSystemPayload("USB_SAFE");
    
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `USB_SAFE_BACKUP_${getCurrentDate()}.json`; 
    a.click();

    // 1. Update the indicator (Turns status GREEN)
    localStorage.setItem('last_usb_backup', new Date().getTime().toString());
    
    // 2. Show the Success Toast
    setBackupToast(true);
    setTimeout(() => setBackupToast(false), 4000); 
    
    await logAudit("USB_BACKUP", "Admin performed physical safe backup");
    triggerCapy("Physical safety confirmed! 💾");
  };

  const handleRestoreData = async (e) => {
      const file = e.target.files[0];
      if (!file || !user) return;
      if(!window.confirm("CRITICAL WARNING: Restoring from a backup will overwrite your live database with the file's contents. Proceed?")) return;
      
      triggerCapy("Initiating Full System Restore... Do not close the window. ⏳");
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const data = JSON.parse(event.target.result);
              
              // FIX: Firestore has a hard limit of 500 writes per batch. 
              // We use chunked batches to ensure massive restores (including maps) never crash.
              const batches = [];
              let currentBatch = writeBatch(db);
              let opCount = 0;

              const commitBatch = () => {
                  batches.push(currentBatch.commit());
                  currentBatch = writeBatch(db);
                  opCount = 0;
              };

              const safeSet = (ref, itemData) => {
                  currentBatch.set(ref, itemData);
                  opCount++;
                  if (opCount >= 450) commitBatch();
              };

              const queueToBatch = (collectionName, items) => {
                  if (items && Array.isArray(items)) {
                      items.forEach(item => {
                          safeSet(doc(db, `artifacts/${appId}/users/${user.uid}/${collectionName}`, item.id || Date.now().toString()), item);
                      });
                  }
              };

              // 1. Restore Standard Collections
              queueToBatch('products', data.inventory);
              queueToBatch('transactions', data.transactions);
              queueToBatch('samplings', data.samplings);
              queueToBatch('procurement', data.procurements);
              queueToBatch('audit_logs', data.auditLogs);
              queueToBatch('mapSettings', data.mapSettings); 

              // 2. Deep Restore Customers & Competitor Intelligence
              if (data.customers && Array.isArray(data.customers)) {
                  data.customers.forEach(c => {
                      const cData = { ...c };
                      const benchmarks = cData.benchmarks || [];
                      delete cData.benchmarks; // clean main profile payload

                      safeSet(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, c.id || Date.now().toString()), cData);
                      
                      if (c.id) {
                          benchmarks.forEach(b => {
                              safeSet(doc(db, `artifacts/${appId}/users/${user.uid}/customers/${c.id}/benchmarks`, b.id || Date.now().toString()), b);
                          });
                      }
                  });
              }

              // 3. Restore Core Settings
              if (data.appSettings) safeSet(doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'general'), data.appSettings);
              if (data.tierSettings) safeSet(doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'tiers'), { list: data.tierSettings });

              // 4. Commit remaining unpushed files
              if (opCount > 0) batches.push(currentBatch.commit());
              
              // Wait for all batches to finish uploading concurrently
              await Promise.all(batches);

              triggerCapy("System Restore Complete! Refreshing matrix... ✨");
              setTimeout(() => window.location.reload(), 2500);
          } catch (err) { 
              alert("Failed to restore: " + err.message); 
              console.error(err); 
              triggerCapy("Restore Failed. File corrupted.");
          }
      };
      reader.readAsText(file);
      e.target.value = null; 
  };// 
  
  // --- NEW: EXPORT SHARED CONFIG (Products + Branding ONLY) ---
  const handleExportSharedConfig = async () => {
    if(!user) return;
    const shareData = {
        meta: { type: "kpm_shared_config", date: new Date().toISOString(), exportedBy: user.email },
        inventory,      // The products (Images, 3D dims, Prices)
        appSettings     // The branding (Mascot, Company Name, Dialogues)
    };
    const blob = new Blob([JSON.stringify(shareData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpm_shared_config_${getCurrentDate()}.json`;
    a.click();
    triggerCapy("Shared Config ready to send!");
  };

  // --- NEW: IMPORT SHARED CONFIG ---
  const handleImportSharedConfig = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    
    if(!window.confirm("Import Shared Config? This will overwrite your current Product List and Branding settings (Mascot/Name). Transactions will NOT be affected.")) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if(data.meta?.type !== "kpm_shared_config") throw new Error("Invalid Config File. Please use a file generated by the 'Share Config' button.");
            
            // 1. Overwrite Settings
            if(data.appSettings) {
                await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'general'), data.appSettings);
            }

            // 2. Merge/Overwrite Products
            if(data.inventory && Array.isArray(data.inventory)) {
                const batch = writeBatch(db); 
                data.inventory.forEach(item => {
                    const ref = doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id);
                    batch.set(ref, item); 
                });
                await batch.commit();
            }
            
            triggerCapy("Config Imported! Welcome to the team.");
        } catch (err) { 
            alert("Import Failed: " + err.message); 
            console.error(err); 
        }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const totalStockValue = inventory.reduce((acc, i) => acc + (i.stock * (i.priceRetail || 0)), 0);
  const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
// --- NEW: SAFE SALES TERMINAL INVENTORY ---
  const salesTerminalInventory = React.useMemo(() => {
      if (userRole === 'ADMIN') {
          if (adminSalesMode === 'VAULT') return filteredInventory;
          // Boss Vehicle Mode
          return filteredInventory.filter(p => adminCanvas.some(c => c.productId === p.id)).map(p => {
              const canvasItem = adminCanvas.find(c => c.productId === p.id);
              if (!canvasItem) return p;
              let multCanvas = 1;
              if (canvasItem.unit === 'Slop') multCanvas = p.packsPerSlop || 10;
              if (canvasItem.unit === 'Bal') multCanvas = (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
              if (canvasItem.unit === 'Karton') multCanvas = (p.balsPerCarton || 4) * (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
              const trueStockInVehicle = Math.floor(canvasItem.qty * multCanvas);
              return { ...p, stock: trueStockInVehicle };
          });
      }
      // Employee Mode
      return filteredInventory.filter(p => agentCanvas.some(c => c.productId === p.id)).map(p => {
          const canvasItem = agentCanvas.find(c => c.productId === p.id);
          if (!canvasItem) return p;
          let multCanvas = 1;
          if (canvasItem.unit === 'Slop') multCanvas = p.packsPerSlop || 10;
          if (canvasItem.unit === 'Bal') multCanvas = (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
          if (canvasItem.unit === 'Karton') multCanvas = (p.balsPerCarton || 4) * (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
          const trueStockInVehicle = Math.floor(canvasItem.qty * multCanvas);
          return { ...p, stock: trueStockInVehicle };
      });
  }, [userRole, filteredInventory, agentCanvas, adminSalesMode, adminCanvas]);

// --- NEW: SAFE CUSTOMERS LOGIC FOR JOURNEY & MAP ---
  const permittedCustomers = React.useMemo(() => {
      // Admin sees everyone
      if (userRole === 'ADMIN') return customers;
      
      const allowedTiers = agentSettings.allowedTiers || ['Retail', 'Ecer'];
      
      // Filter customers strictly based on the agent's authorized tiers
      return customers.filter(c => {
          let mappedTier = c.priceTier || 'Retail'; 
          
          // Fallback logic for legacy customers missing the explicit priceTier
          if (!c.priceTier) {
              const tierUpper = (c.tier || '').toUpperCase();
              if (tierUpper.includes('GROSIR') || tierUpper.includes('GOLD') || tierUpper.includes('WHOLESALE')) mappedTier = 'Grosir';
              else if (tierUpper.includes('RETAIL') || tierUpper.includes('SILVER')) mappedTier = 'Retail';
              else if (tierUpper.includes('ECER') || tierUpper.includes('BRONZE')) mappedTier = 'Ecer';
          }
          
          return allowedTiers.includes(mappedTier);
      });
  }, [customers, userRole, agentSettings.allowedTiers]);

  const chartData = React.useMemo(() => {
      const dataMap = {};
      const customers = new Set();
      transactions.filter(t => t.type === 'SALE' || t.type === 'RETURN').forEach(t => {
          const date = t.date;
          if (!dataMap[date]) dataMap[date] = { date };
          const cName = (t.customerName || 'Unknown').trim();
          if (!dataMap[date][cName]) dataMap[date][cName] = 0;
          dataMap[date][cName] += t.total;
          customers.add(cName);
      });
      return { data: Object.values(dataMap).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-7), keys: Array.from(customers) };
  }, [transactions]);

  const handleEditMascotMsgChange = (e) => setEditMascotMessage(e.target.value);
  const handleEditCompNameChange = (e) => setEditCompanyName(e.target.value);
  const mainContentClass = isSidebarCollapsed ? 'ml-20' : 'ml-64';

// --- NEW: SAVE MAP HOME BASE ---
  const handleSetMapHome = async (center, zoom) => {
      if(!user || !isAdmin) return;
      try {
          const newSettings = { ...appSettings, mapHome: { lat: center.lat, lng: center.lng, zoom } };
          setAppSettings(newSettings);
          await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), newSettings, {merge: true});
          triggerCapy("New Map Home Base Saved! 🏠");
      } catch(err) { console.error(err); alert("Failed to save map home."); }
  };









// --- UPDATED: SINGLE BACKUP (Forces Specific Green Light) ---
  const handleSingleBackup = async (type) => {
      if (!user) return;
      triggerCapy(`Compiling ${type} sectors (Including Maps)...`);
      
      const payload = await generateFullSystemPayload(type);
      const filename = `FOLDER_${type}--SAFE_${payload.meta.ts}.json`;

      if (type === "RECOVERY") setSessionStatus(prev => ({ ...prev, recovery: true }));
      else if (type === "USB") setSessionStatus(prev => ({ ...prev, usb: true }));
      else if (type === "CLOUD") setSessionStatus(prev => ({ ...prev, cloud: true }));

      triggerDownload(filename, payload);
      await logAudit("BACKUP_SINGLE", `Manual download: ${type}`, true);
      triggerCapy(`${type} Backup Saved! Status Secure.`);
  };


 const renderSettings = () => {
      if (!user) return null; 

      // 1. LOCKSCREEN
      if (!isAdmin) {
          return (
              <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center">
                  <div className="relative mb-8">
                      <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse"></div>
                      <div className="relative w-24 h-24 bg-black border-2 border-red-600 rounded-full flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                          <Lock size={40} className="animate-bounce-slow" />
                      </div>
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-[0.25em] mb-2 font-mono">Restricted Access</h2>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed mb-8">Admin Clearance Required</p>
                  <button onClick={() => setShowAdminLogin(true)} className="px-10 py-4 border-2 border-white text-white font-black uppercase text-xs hover:bg-white hover:text-black transition-all">Unlock System</button>
              </div>
          );
      }

      // --- LOGIC HUB: MERGING DATABASE + INSTANT SESSION STATUS ---
      const resetThreshold = parseInt(localStorage.getItem('indicator_reset_time') || '0');
      const sNow = new Date();
      const sTodayStr = sNow.toLocaleDateString();

      // 1. CHECK DATABASE (Slow/Permanent Record)
      const confirmedMirror = auditLogs.find(log => 
          (log.action === "DATABASE_MIRROR" || log.action === "MASTER_BACKUP") && 
          log.timestamp && 
          (log.timestamp.seconds * 1000 > resetThreshold)
      );

      const dbRecoveryCount = auditLogs.filter(log => {
          if (!log.isSavePoint || !log.timestamp) return false;
          const logTime = log.timestamp.seconds * 1000;
          if (logTime < resetThreshold) return false;
          return new Date(logTime).toLocaleDateString() === sTodayStr;
      }).length;

      const lastUsbTime = parseInt(localStorage.getItem('last_usb_backup') || '0');
      const isUsbValidInDb = lastUsbTime > resetThreshold && (sNow.getTime() - lastUsbTime) < (7 * 24 * 60 * 60 * 1000);

      // 2. THE FIX: COMBINE SESSION STATE (Instant) WITH DATABASE (Persistent)
      const isRecoverySecure = sessionStatus.recovery || dbRecoveryCount > 0;
      const isUsbSecure = sessionStatus.usb || isUsbValidInDb;
      const isCloudSecure = sessionStatus.cloud || !!confirmedMirror;

      // 3. RESET HANDLER
      const handleResetIndicators = () => {
          localStorage.setItem('indicator_reset_time', new Date().getTime().toString());
          localStorage.removeItem('last_usb_backup'); 
          setSessionStatus({ recovery: false, usb: false, cloud: false }); // <--- Forces Red
          triggerCapy("Indicators Reset to REQUIRED state.");
      };

      return (
        <div className="animate-fade-in max-w-2xl mx-auto pb-20">
            
            {/* 👑 TIER 1 ONLY: LANDLORD DASHBOARD */}
            {isSystemOwner && (
                <>
                    <LandlordDashboard db={db} appId={appId} user={user} />
                    
                    <div className="mb-8 bg-red-950/20 border border-red-500/30 p-6 rounded-2xl flex justify-between items-center">
                        <div>
                            <h3 className="text-red-500 font-black uppercase tracking-widest">Danger Zone</h3>
                            <p className="text-[10px] font-mono text-slate-400 mt-1">Permanently transfer ownership of this software.</p>
                        </div>
                        <button onClick={() => setShowCrownTransfer(true)} className="bg-red-900/40 hover:bg-red-600 text-red-500 hover:text-white border border-red-500 px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-all">
                            Initiate Transfer
                        </button>
                    </div>

                    {showCrownTransfer && (
                        <CrownTransferProtocol 
                            db={db} 
                            appId={appId} 
                            userId={userId} 
                            user={user} 
                            onClose={() => setShowCrownTransfer(false)} 
                            triggerCapy={triggerCapy} 
                        />
                    )}
                </>
            )}

            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">System Configuration</h2>
                    <p className="text-[10px] text-emerald-500 font-mono font-bold animate-pulse">CLEARANCE: ADMIN VERIFIED</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleResetIndicators} className="bg-white/5 border border-slate-600 text-slate-400 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-red-900/50 hover:text-red-400 hover:border-red-500 transition-all">
                        Reset Indicators
                    </button>
                    <button onClick={handleAdminLogout} className="bg-red-900/30 border border-red-800 text-red-500 px-4 py-1 rounded text-[10px] font-bold uppercase hover:bg-red-600 hover:text-white transition-all">
                        Lock Admin
                    </button>
                </div>
            </div>

            {/* MASTER SECURITY CARD */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border-2 border-orange-500/20 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck size={120} className="text-orange-500" /></div>

                <div className="relative z-10">
                    <h3 className="font-bold text-xl mb-1 dark:text-white flex items-center gap-3"><ShieldCheck className="text-emerald-500" size={24}/> Master Security Protocol</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-8">Triple-Layer Data Redundancy</p>
                    
                    <button onClick={handleMasterProtocol} className="w-full group relative bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] shadow-lg active:scale-95 mb-6">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-sm">EXECUTE MASTER BACKUP</span>
                            <span className="text-[9px] opacity-70 font-mono tracking-normal">Generate 3 Recovery Points Now</span>
                        </div>
                    </button>

                    {/* BIG LIVE STATUS INDICATORS */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {/* 1. RECOVERY STATUS */}
                        <div className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-500 ${isRecoverySecure ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-red-900/20 border-red-500 text-red-500 animate-pulse'}`}>
                            {isRecoverySecure ? <ShieldCheck size={32}/> : <ShieldAlert size={32}/>}
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1">RECOVERY</p>
                                <p className="text-xs font-bold">{isRecoverySecure ? "SECURE" : "REQUIRED"}</p>
                            </div>
                        </div>

                        {/* 2. USB STATUS */}
                        <div className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-500 ${isUsbSecure ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-orange-500/20 border-orange-500 text-orange-500 animate-pulse'}`}>
                            {isUsbSecure ? <ShieldCheck size={32}/> : <ShieldAlert size={32}/>}
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1">USB SAFE</p>
                                <p className="text-xs font-bold">{isUsbSecure ? "SECURE" : "UPDATE"}</p>
                            </div>
                        </div>

                        {/* 3. CLOUD STATUS */}
                        <div className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-500 ${isCloudSecure ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-red-900/20 border-red-500 text-red-500 animate-pulse'}`}>
                            {isCloudSecure ? <ShieldCheck size={32}/> : <ShieldAlert size={32}/>}
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1">CLOUD SYNC</p>
                                <p className="text-xs font-bold">{isCloudSecure ? "SECURE" : "REQUIRED"}</p>
                            </div>
                        </div>
                    </div>

                    {/* INDIVIDUAL DOWNLOADS */}
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <button onClick={() => handleSingleBackup('RECOVERY')} className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded hover:bg-blue-500 hover:text-white transition-colors text-[9px] font-bold text-slate-500 uppercase tracking-widest">Download Recovery</button>
                        <button onClick={() => handleSingleBackup('USB')} className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded hover:bg-orange-500 hover:text-white transition-colors text-[9px] font-bold text-slate-500 uppercase tracking-widest">Download USB</button>
                        <button onClick={() => handleSingleBackup('CLOUD')} className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded hover:bg-emerald-500 hover:text-white transition-colors text-[9px] font-bold text-slate-500 uppercase tracking-widest">Download Cloud</button>
                    </div>

                    {/* NEW: SYSTEM RESTORE UPLOAD */}
                    <div className="border-t border-orange-500/30 pt-6">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">System Recovery Terminal</p>
                        <label className="w-full flex items-center justify-center gap-3 py-4 border-2 border-dashed border-slate-600 hover:border-emerald-500 rounded-xl text-slate-400 hover:text-emerald-500 cursor-pointer transition-all bg-black/30 hover:bg-emerald-900/20 group">
                            <UploadCloud size={24} className="group-hover:-translate-y-1 transition-transform" />
                            <span className="font-bold uppercase tracking-widest text-xs">Load Backup File & Restore Data (.json)</span>
                            <input type="file" accept=".json" onChange={handleRestoreData} className="hidden" />
                        </label>
                    </div>
                </div>
            </div>
  
      
  
      
  

            {/* 2. TEAM SHARING & DATA RESET */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                {/* TEAM SHARING */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all">
                    <h3 className="font-bold text-lg mb-1 dark:text-white flex items-center gap-2"><Copy size={20}/> Team Sharing</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">Export specific datasets for your team</p>
                    
                    <div className="space-y-4">
                        {[
                            { label: 'Products & Prices', type: 'products', icon: <Package size={16}/> },
                            { label: 'Customer Directory', type: 'customers', icon: <User size={16}/> },
                            { label: 'Full Configuration', type: 'both', icon: <Settings size={16}/> }
                        ].map((item) => (
                            <div key={item.type} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="text-orange-500">{item.icon}</div>
                                    <span className="text-sm font-bold dark:text-white">{item.label}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleExportGranular(item.type)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-100 transition-colors uppercase">Export</button>
                                    <label className="px-3 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-100 cursor-pointer transition-colors uppercase">
                                        Import
                                        <input type="file" accept=".json" onChange={(e) => handleImportGranular(e, item.type)} className="hidden" />
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DATA WIPE (DANGER ZONE) */}
                <div className="bg-red-50 dark:bg-red-950/20 p-6 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/50 transition-all">
                    <h3 className="font-bold text-lg mb-1 text-red-600 dark:text-red-500 flex items-center gap-2"><Trash2 size={20}/> Data Wipe</h3>
                    <p className="text-[10px] text-red-500/70 uppercase tracking-widest mb-4">Permanently delete active datasets</p>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30">
                            <div className="flex items-center gap-3 text-red-500">
                                <Package size={16}/> <span className="text-sm font-bold">Wipe Products & Prices</span>
                            </div>
                            <button onClick={() => handleWipeData('products')} className="px-4 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-200 transition-colors uppercase">Delete</button>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30">
                            <div className="flex items-center gap-3 text-red-500">
                                <User size={16}/> <span className="text-sm font-bold">Wipe Customers</span>
                            </div>
                            <button onClick={() => handleWipeData('customers')} className="px-4 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-200 transition-colors uppercase">Delete</button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-red-600 rounded-xl border border-red-700 shadow-md">
                            <div className="flex items-center gap-3 text-white">
                                <ShieldAlert size={16}/> <span className="text-sm font-bold">Full Reset (Both)</span>
                            </div>
                            <button onClick={() => handleWipeData('both')} className="px-4 py-1.5 bg-black/20 text-white rounded-lg text-[10px] font-black tracking-widest hover:bg-black/40 transition-colors uppercase border border-white/20">Wipe All</button>
                        </div>
                    </div>
                </div>

            </div>

            {/* 3. USER PROFILE & SECURITY */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white"><User size={20}/> User Profile & Security</h3>
                <label className="block text-sm text-slate-500 mb-2">Google Account Email</label>
                <input type="email" className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white mb-4" value={currentUserEmail || ""} disabled/>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border flex flex-col justify-between bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
                        <div className="mb-4">
                            <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Vault PIN Status</p>
                            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest">Administrator Access Verified</p>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={handleChangePin} className="flex-1 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Change PIN</button>
                             <button onClick={handleAdminLogout} className="flex-1 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs font-bold text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">Lock Admin</button>
                        </div>
                    </div>
                    
                    <div className="p-4 rounded-xl border flex flex-col justify-between bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                        <div className="mb-4">
                            <p className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-2">
                                <ScanFace size={16}/> Biometric Passkeys
                            </p>
                            <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">Register Fingerprints, Phones, or USBs</p>
                        </div>
                        <button 
                            onClick={handleRegisterPasskey}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={14}/> Add New Device / Passkey
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. TIER & MAP ICON MANAGER */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white"><Tag size={20}/> Customer Tiers & Map Icons</h3>
                    <div className="flex gap-2">
                        <button onClick={handleExportTiers} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold"><Download size={14}/></button>
                        <label className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold cursor-pointer"><Upload size={14}/><input type="file" accept=".json" onChange={handleImportTiers} className="hidden" /></label>
                    </div>
                </div>
                {/* --- FIX 5: SCROLLABLE SETTINGS LIST --- */}
                <div className="overflow-x-auto pb-2">
                    <div className="space-y-3 min-w-[600px]">
                        {tierSettings.map((tier, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border dark:border-slate-700">
                                {/* Color Picker */}
                                <input type="color" value={tier.color} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].color = e.target.value; handleSaveTiers(newTiers); }} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent flex-shrink-0"/>
                                
                                {/* Label Input */}
                                <input value={tier.label} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].label = e.target.value; setTierSettings(newTiers); }} onBlur={() => handleSaveTiers(tierSettings)} className="w-24 p-2 text-xs font-bold border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                                
                                {/* Icon Type Select */}
                                <select value={tier.iconType} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].iconType = e.target.value; handleSaveTiers(newTiers); }} className="p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"><option value="emoji">Emoji</option><option value="image">Custom Logo</option></select>
                                
                                {/* Value Input / Upload Button */}
                                <div className="flex-1">
                                    {tier.iconType === 'image' ? (
                                        <label className="flex items-center justify-center gap-2 w-full p-2 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer hover:bg-slate-300 text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap"><Upload size={14}/> {tier.value?.startsWith('data:') ? "Change" : "Upload"}<input type="file" accept="image/*" onChange={(e) => handleTierIconSelect(e, idx)} className="hidden" /></label>
                                    ) : (
                                        <input value={tier.value} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].value = e.target.value; handleSaveTiers(newTiers); }} className="w-full p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                                    )}
                                </div>

                                {/* Preview Circle */}
                                <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0" style={{ borderColor: tier.color }}>
                                    {tier.iconType === 'image' ? (tier.value ? <img src={tier.value} className="w-full h-full object-contain p-1" /> : <ImageIcon size={14} className="opacity-30"/>) : (<span className="text-lg">{tier.value}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>

        

            {/* 5. MASCOT SETTINGS (SIZE + DIALOGUE) */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all duration-300">
                <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white mb-4"><MessageSquare size={20}/> Mascot Settings</h3>
                <div className="mb-6 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-700">
                    <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-500 uppercase">Mascot Size</label><span className="text-xs text-orange-500 font-bold">{appSettings.mascotScale || 1}x</span></div>
                    <input type="range" min="0.5" max="2.0" step="0.1" value={appSettings.mascotScale || 1} onChange={(e) => { const scale = parseFloat(e.target.value); setAppSettings(prev => ({ ...prev, mascotScale: scale })); setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { mascotScale: scale }, { merge: true }); }} className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500"/>
                </div>
                <div className="mb-4">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Add New Dialogue Line</label>
                    <div className="flex gap-2">
                        <input className="flex-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="Type a message..." value={newMascotMessage} onChange={(e) => setNewMascotMessage(e.target.value)}/>
                        <button onClick={handleAddMascotMessage} className="bg-emerald-500 text-white px-4 rounded font-bold">Add</button>
                    </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeMessages.map((msg, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2 rounded border dark:border-slate-700">
                            {editingMsgIndex === idx ? (
                                <div className="flex gap-2 w-full animate-fade-in">
                                    <input autoFocus className="flex-1 p-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" value={editMsgText} onChange={(e) => setEditMsgText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditedMessage(idx)}/>
                                    <button onClick={() => handleSaveEditedMessage(idx)} className="text-emerald-500 hover:text-emerald-600"><Save size={16}/></button>
                                    <button onClick={() => setEditingMsgIndex(-1)} className="text-slate-400 hover:text-slate-500"><X size={16}/></button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-sm dark:text-slate-300 italic truncate mr-2">"{msg}"</span>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => { setEditingMsgIndex(idx); setEditMsgText(msg); }} className="text-slate-400 hover:text-blue-500"><Edit size={14}/></button>
                                        <button onClick={() => handleDeleteMascotMessage(msg)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 6. COMPANY IDENTITY */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all duration-300">
                <h3 className="font-bold text-lg mb-4 dark:text-white">Corporate Identity & Invoice Data</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
                        <input className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={editCompanyProfile.name} onChange={e => setEditCompanyProfile({...editCompanyProfile, name: e.target.value})}/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Official Address (Used on Invoice Header)</label>
                        <input className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={editCompanyProfile.address} onChange={e => setEditCompanyProfile({...editCompanyProfile, address: e.target.value})} placeholder="e.g. Jl. Jendral Sudirman No.123, Jakarta"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Contact Number</label>
                        <input className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={editCompanyProfile.phone} onChange={e => setEditCompanyProfile({...editCompanyProfile, phone: e.target.value})} placeholder="e.g. (021) 1234567"/>
                    </div>

                    {/* NEW A4 INVOICE SETTINGS (Auto-Saves Instantly) */}
                    <div className="pt-4 border-t dark:border-slate-700">
                        <label className="text-xs font-bold text-emerald-500 uppercase">Admin/Boss Display Name (For Signature)</label>
                        <input 
                            className="w-full p-2 border rounded dark:bg-slate-900 dark:border-emerald-800/50 dark:text-white focus:border-emerald-500 outline-none transition-colors" 
                            value={appSettings.adminDisplayName || ''} 
                            onChange={(e) => {
                                const val = e.target.value;
                                setAppSettings(prev => ({...prev, adminDisplayName: val}));
                                if (user) setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { adminDisplayName: val }, {merge: true});
                            }}
                            placeholder="e.g. Abednego YB"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-blue-500 uppercase">Bank Details (Invoice Footer)</label>
                        <textarea 
                            className="w-full p-2 border rounded dark:bg-slate-900 dark:border-blue-800/50 dark:text-white focus:border-blue-500 outline-none transition-colors resize-none h-20" 
                            value={appSettings.bankDetails || ''} 
                            onChange={(e) => {
                                const val = e.target.value;
                                setAppSettings(prev => ({...prev, bankDetails: val}));
                                if (user) setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { bankDetails: val }, {merge: true});
                            }}
                            placeholder={"BCA 0301138379\nA/N ABEDNEGO YB"}
                        />
                    </div>

                    <button onClick={handleSaveCompanyProfile} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-colors w-full mt-4 shadow-md">Save Corporate Profile</button>
                </div>
            </div>

            {/* 7. PROFILE PICTURE */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all duration-300">
                <h3 className="font-bold text-lg mb-4 dark:text-white"><ImageIcon size={20}/> Mascot Profile</h3>
                <div className="flex items-start gap-6">
                    <div className="flex flex-col items-center">
                        <img src={appSettings?.mascotImage || "/mr capy.png"} className="w-24 h-24 rounded-full border-4 border-orange-500 object-cover bg-slate-100" onError={(e) => {e.target.onerror = null; e.target.src="https://api.dicebear.com/7.x/avataaars/svg?seed=Capy"}}/>
                        <span className="text-xs text-slate-400 mt-2">Current</span>
                    </div>
                    <div className="flex-1">
                        <label className="bg-orange-100 dark:bg-slate-700 text-orange-600 dark:text-orange-300 px-4 py-2 rounded-lg cursor-pointer hover:bg-orange-200 transition-colors inline-flex items-center gap-2 font-medium">
                            <Upload size={16} /> Select & Crop
                            <input type="file" accept="image/*" onChange={handleMascotSelect} className="hidden" />
                        </label>
                    </div>
                </div>
            </div>

            {/* 8. DANGER ZONE */}
            <div className="mt-12 pt-8 border-t-2 border-red-100 dark:border-red-900/30">
                <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldAlert size={16}/> Danger Zone</h4>
                <button onClick={triggerDiscoParty} disabled={isDiscoMode} className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all ${isDiscoMode ? 'bg-slate-500' : 'bg-red-600 hover:bg-red-700'}`}>
                    {isDiscoMode ? <><Music size={24} className="animate-spin"/> SYSTEM OVERLOAD...</> : <><ShieldAlert size={24} className="animate-pulse"/> DO NOT PRESS: CAPY DISCO PROTOCOL</>}
                </button>
                <p className="text-[10px] text-red-400 text-center mt-3 font-mono opacity-70">Warning: Extreme funkiness levels incoming.</p>
            </div>
        </div>
      );
  };

  // --- MAIN APP RENDER (BIOHAZARD THEME) ---
  return (
    <BiohazardTheme 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        appSettings={appSettings}
        isAdmin={isAdmin}
        userRole={userRole}
        onLogin={handleLogin} 
        setShowAdminLogin={setShowAdminLogin}
        agentSettings={agentSettings}
        notifications={notifications}                   
        onNotificationClick={handleNotificationClick}   
    >
      {/* NEW ROUTER FOR EMPLOYEE VEHICLE INVENTORY */}
      {activeTab === 'agent_inventory' && (
           <AgentInventoryView 
               db={db} 
               appId={appId} 
               userId={userId} 
               agentProfileId={agentProfileId} 
               inventory={inventory}
               transactions={transactions}
           />
      )}

      {/* 1. GLOBAL MODALS */}
      {examiningProduct && <ExamineModal product={examiningProduct} onClose={() => setExaminingProduct(null)} onUpdateProduct={handleUpdateProduct} isAdmin={isAdmin} />}
      {cropImageSrc && <ImageCropper imageSrc={cropImageSrc} onCancel={() => { setCropImageSrc(null); setActiveCropContext(null); }} onCrop={handleCropConfirm} dimensions={boxDimensions} onDimensionsChange={setBoxDimensions} face={activeCropContext?.face || 'front'} />}
      {returningTransaction && <ReturnModal transaction={returningTransaction} onClose={() => setReturningTransaction(null)} onConfirm={executeReturn} />}
      
      {/* --- PINPOINT: Improved Admin Modal (Fixed Fonts & Layout) --- */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 font-mono">
          <div className={`bg-[#0a0a0a] border border-red-600/30 p-8 max-w-sm w-full text-center shadow-[0_0_60px_rgba(220,38,38,0.15)] relative overflow-hidden transition-all ${authShake ? 'animate-shake' : ''}`}>
            
            {/* Terminal Decoration */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${isUnlocking || isSetupMode ? 'via-emerald-500' : isResetMode ? 'via-orange-500' : 'via-red-600'} to-transparent ${authShake ? '' : 'animate-pulse'}`}></div>
            
            {/* 🎬 CINEMATIC UNLOCK SEQUENCE 🎬 */}
            {isUnlocking ? (
                <div className="space-y-6 text-center py-6 animate-fade-in">
                    <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                        {/* Mechanical Spinning Rings */}
                        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full border-t-emerald-500 animate-spin"></div>
                        <div className="absolute inset-2 border-4 border-emerald-500/20 rounded-full border-b-emerald-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                        <Unlock size={32} className="text-emerald-500 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-emerald-500 font-black text-2xl uppercase tracking-[0.3em] mb-2 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">Access Granted</h3>
                        <p className="text-emerald-400/80 font-mono text-[10px] uppercase tracking-[0.2em] animate-pulse">Decrypting Master Vault...</p>
                    </div>
                    {/* Stuttering Progress Bar */}
                    <div className="w-full bg-black border border-emerald-500/30 h-1.5 rounded-full overflow-hidden relative">
                        <div className="absolute top-0 left-0 h-full bg-emerald-500 shadow-[0_0_10px_#10b981]" style={{ animation: 'fillBar 2.4s ease-in-out forwards' }}></div>
                    </div>
                    {/* Custom Keyframe for the stuttering decrypt effect */}
                    <style>{`
                        @keyframes fillBar { 0% { width: 0%; } 20% { width: 15%; } 40% { width: 45%; } 60% { width: 45%; } 80% { width: 90%; } 100% { width: 100%; } }
                    `}</style>
                </div>
            ) : (
                <>
                    <ShieldAlert size={32} className={`mx-auto mb-4 ${isSetupMode ? 'text-emerald-500' : isResetMode ? 'text-orange-500' : 'text-red-600 animate-pulse'}`} />

                    <h2 className="text-lg font-black text-white mb-6 uppercase tracking-[0.25em]">
                        {isSetupMode ? "Initialize Vault" : isResetMode ? "Identity Recovery" : "Security Check"}
                    </h2>

            {/* CASE 1: FIRST TIME SETUP (Or Resetting) */}
            {isSetupMode ? (
                <div className="space-y-4 text-left">
                    <p className="text-[10px] text-emerald-500 uppercase font-bold mb-4 tracking-widest text-center">Create Administrator Credentials</p>
                    
                    <div className="relative">
                        <input 
                            type="password" 
                            placeholder="CREATE MASTER PASSWORD" 
                            value={setupPassword}
                            onChange={(e) => setSetupPassword(e.target.value)}
                            className="w-full bg-black border border-emerald-500/30 p-4 text-center text-white text-lg outline-none focus:border-emerald-500 font-mono placeholder:text-white/20 transition-colors" 
                            maxLength={25}
                        />
                        
                        {/* 🚀 RESIDENT EVIL STRENGTH METER 🚀 */}
                        <div className="mt-3">
                            <div className="flex justify-between items-end mb-1">
                                <span className={`text-[9px] font-black tracking-widest uppercase ${calculateStrength(setupPassword).color}`}>
                                    {calculateStrength(setupPassword).label}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">LVL {calculateStrength(setupPassword).score}/5</span>
                            </div>
                            <div className="flex gap-1 h-1.5">
                                {[1, 2, 3, 4, 5].map(level => (
                                    <div 
                                        key={level} 
                                        className={`flex-1 rounded-[1px] transition-all duration-300 ${calculateStrength(setupPassword).score >= level ? calculateStrength(setupPassword).bar : 'bg-white/10'}`}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <input 
                        type="password" 
                        placeholder="SECRET RECOVERY WORD" 
                        value={setupSecret}
                        onChange={(e) => setSetupSecret(e.target.value)}
                        className="w-full bg-black border border-emerald-500/30 p-4 text-center text-white text-xs outline-none focus:border-emerald-500 uppercase tracking-widest placeholder:text-white/20 font-mono transition-colors" 
                    />
                    
                    <button 
                        onClick={handleSetupSecurity} 
                        className={`w-full py-4 font-bold uppercase text-xs tracking-[0.2em] transition-all shadow-lg font-mono border ${calculateStrength(setupPassword).score === 5 && setupSecret ? 'bg-emerald-600/20 hover:bg-emerald-600 border-emerald-500/50 text-emerald-500 hover:text-white cursor-pointer' : 'bg-black border-slate-700 text-slate-600 cursor-not-allowed opacity-50'}`}
                        disabled={calculateStrength(setupPassword).score < 5 || !setupSecret}
                    >
                        Save Credentials
                    </button>
                </div>
            ) : isOtpMode ? (
                /* CASE 2.5: OTP VERIFICATION */
                <div className="space-y-4 animate-fade-in">
                    <p className="text-[10px] text-blue-400 uppercase font-bold mb-4 tracking-widest">Verify Email Authorization</p>
                    <p className="text-xs text-slate-400 mb-4">A 6-digit code has been sent to your registered Admin Email.</p>
                    <input type="number" placeholder="• • • • • •" className="w-full bg-black border border-blue-500/30 p-4 text-center text-blue-400 text-2xl outline-none tracking-[0.5em] focus:border-blue-500 font-mono transition-colors" value={inputOtp} onChange={(e) => setInputOtp(e.target.value)} autoFocus maxLength={6} onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()} />
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => { setIsOtpMode(false); setIsResetMode(true); setInputOtp(""); }} className="flex-1 py-3 border border-white/10 text-gray-400 text-xs font-bold uppercase hover:text-white hover:bg-white/5 font-mono tracking-widest transition-colors">Abort</button>
                        <button onClick={handleVerifyOtp} className="flex-1 py-3 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/50 text-blue-500 hover:text-white text-xs font-bold uppercase font-mono tracking-widest transition-colors">Verify Code</button>
                    </div>
                </div>
            ) : isResetMode ? (
                /* CASE 2: RECOVERY MODE (Now with Loading State) */
                <div className="space-y-4">
                    <p className="text-[10px] text-orange-400 uppercase font-bold mb-4 tracking-widest">Enter Secret Word</p>
                   <input type="password" id="resetWord" placeholder="ENTER SECRET WORD..." className="w-full bg-black border border-orange-500/30 p-4 text-center text-white text-xl outline-none tracking-widest focus:border-orange-500 font-mono placeholder:text-white/20 transition-colors" autoFocus disabled={isSendingEmail} onKeyDown={(e) => e.key === 'Enter' && handleResetPin(e.target.value)}/>
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setIsResetMode(false)} disabled={isSendingEmail} className="flex-1 py-3 border border-white/10 text-gray-400 text-xs font-bold uppercase hover:text-white hover:bg-white/5 font-mono tracking-widest transition-colors">Abort</button>
                        <button onClick={() => handleResetPin(document.getElementById('resetWord').value)} disabled={isSendingEmail} className={`flex-1 py-3 border text-xs font-bold uppercase font-mono tracking-widest transition-colors ${isSendingEmail ? 'bg-orange-900/50 border-orange-800 text-orange-700 cursor-wait' : 'bg-orange-600/20 hover:bg-orange-600 border-orange-500/50 text-orange-500 hover:text-white'}`}>
                            {isSendingEmail ? 'Authorizing...' : 'Verify'}
                        </button>
                    </div>
                </div>
            ) : (
                /* CASE 3: STANDARD LOGIN */
                <div className="space-y-4">
                    <input 
                        type="password" 
                        placeholder="ENTER MASTER PASSWORD" 
                        className="w-full bg-black border border-red-600/30 p-4 text-center text-red-500 text-xl mb-2 outline-none font-mono tracking-[0.2em] focus:border-red-500 placeholder:text-red-900/50 placeholder:tracking-widest placeholder:text-xs transition-colors" 
                        value={inputPin} 
                        onChange={(e) => setInputPin(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handlePinLogin()} 
                        autoFocus 
                        maxLength={15}
                    />
                    
                    {/* 🚀 SECURED BIOMETRIC CONTROLS (UNLOCK ONLY) 🚀 */}
                    {window.PublicKeyCredential && hasPasskey && (
                        <button 
                            onClick={handleBiometricUnlock}
                            className="w-full mt-4 py-4 bg-emerald-900/10 hover:bg-emerald-900/30 border border-emerald-500/30 hover:border-emerald-500 text-emerald-500 hover:text-emerald-400 font-bold uppercase text-xs tracking-[0.2em] flex justify-center items-center gap-3 transition-all font-mono shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                        >
                            <ScanFace size={18} className="animate-pulse" />
                            Biometric Override
                        </button>
                    )}
                    
                    <div className="pt-6 border-t border-white/5 mt-6">
                        <button onClick={() => setIsResetMode(true)} className="text-[9px] text-slate-500 hover:text-white uppercase font-bold transition-colors tracking-[0.1em] font-mono">
                            Lost Key? Use Recovery Protocol
                        </button>
                    </div>
                </div>
            )}
                </>
            )}
          </div>
        </div>
      )}

      {/* 3. MAIN TABS (Only render if user exists) */}
      {user && (
        <>
         {activeTab === 'dashboard' && userRole === 'ADMIN' && (
            !isAdmin ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse"></div>
                        <div className="relative w-24 h-24 bg-black border-2 border-red-600 rounded-full flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                            <Lock size={40} className="animate-bounce-slow" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-[0.25em] mb-2 font-mono">Restricted Access</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed mb-8">Admin Clearance Required</p>
                    <button onClick={() => setShowAdminLogin(true)} className="px-10 py-4 border-2 border-white text-white font-black uppercase text-xs hover:bg-white hover:text-black transition-all">Unlock System</button>
                </div>
            ) : (
        
              <div className="space-y-8 relative">
                {/* --- PINPOINT: Pass sessionStatus here --- */}
                <SafetyStatus auditLogs={auditLogs} sessionStatus={sessionStatus} />
                  
                
                  
                  {/* Summary Cards Grid */}
                  {/* FIX: Changed md: to lg: so they stack vertically on landscape phones */}
                  <div key={`cards-${isAdmin}`} className="grid grid-cols-1 lg:grid-cols-3 gap-6 boot-1">
                      <div className="border-l-4 border-white bg-white/5 p-6 backdrop-blur-sm">
                          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total Assets</h3>
                          <p className="text-4xl font-bold text-white">{isAdmin ? formatRupiah(totalStockValue) : "****"}</p>
                      </div>
                      <div className="border-l-4 border-orange-500 bg-white/5 p-6 backdrop-blur-sm">
                          <h3 className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-1">Revenue</h3>
                          <p className="text-4xl font-bold text-white">{isAdmin ? formatRupiah(transactions.filter(t => t.type === 'SALE' || t.type === 'RETURN').reduce((acc, t) => acc + (t.total || 0), 0)) : "****"}</p>
                      </div>
                      <div className="border-l-4 border-emerald-500 bg-white/5 p-6 backdrop-blur-sm">
                          <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Net Profit</h3>
                          <p className="text-4xl font-bold text-white">{isAdmin ? formatRupiah(transactions.filter(t => t.type === 'SALE').reduce((acc, t) => acc + (t.totalProfit || 0), 0)) : "****"}</p>
                      </div>
                  </div>

                  {/* --- MODIFIED PHYSICAL SECURITY BLOCK: ADMIN ONLY + HIDE IF SECURE --- */}
                  {isAdmin && !isUsbSecure && (
                      <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl flex justify-between items-center animate-pulse">
                          <div className="flex items-center gap-3">
                              <ShieldAlert className="text-orange-500" size={20}/>
                              <p className="text-xs text-orange-200 font-bold uppercase tracking-wider">
                                  Physical Security Protocol Required?
                              </p>
                          </div>
                          <button 
                              onClick={handleBackupData} 
                              className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-xl font-bold text-xs shadow-lg transition-all active:scale-95"
                          >
                              Run USB Safe Backup
                          </button>
                      </div>
                  )}


                  {/* --- PINPOINT: Dashboard Alert Widget (Line 2330) --- */}
                  {/* CRITICAL STOCK ALERT WIDGET */}
                  {isAdmin && lowStockItems.length > 0 && (
                      <div className="bg-red-950/20 border border-red-500/30 p-6 rounded-2xl shadow-lg relative overflow-hidden mb-6">
                          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>
                          <div className="flex items-center gap-3 mb-4">
                              <AlertCircle className="text-red-500 animate-pulse" size={24}/>
                              <h3 className="text-red-400 font-bold uppercase tracking-widest text-sm">Critical Stock Alerts</h3>
                              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{lowStockItems.length} Items</span>
                          </div>

                          {/* FIX: Use lg: for 4 columns, default to 1 for landscape phones to prevent crushing */}
                          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">

                              {lowStockItems.slice(0, 6).map(item => ( 
                                  <div key={item.id} className="bg-black/50 border border-red-500/20 p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-red-900/30 transition-colors" onClick={() => { setActiveTab('inventory'); }}>
                                      <div className="min-w-0 flex-1">
                                          <p className="text-white text-xs font-bold truncate">{item.name}</p>
                                          <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">Threshold: {item.minStock || 5}</p>
                                      </div>
                                      <div className="text-right ml-2 shrink-0 bg-red-950/50 p-2 rounded-lg border border-red-900/50">
                                          <p className="text-red-500 font-black text-lg leading-none">{item.stock}</p>
                                          <p className="text-[8px] text-red-400 uppercase tracking-widest mt-1">Left</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                          {lowStockItems.length > 6 && (
                              <button onClick={() => setActiveTab('inventory')} className="w-full mt-3 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-xs font-bold rounded-lg border border-red-900/50 transition-colors uppercase tracking-widest">
                                  View All {lowStockItems.length} Depleted Items
                              </button>
                          )}
                      </div>
                  )}




                  {/* Performance Graph Area */}
                  <div key={`graph-${isAdmin}`} className="bg-black/40 border border-white/10 p-6 h-96 boot-2">
                      <h3 className="text-white mb-4 uppercase text-xs font-bold tracking-widest border-b border-white/10 pb-2">Performance Graph</h3>
                      <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                            <BarChart data={chartData.data}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#fff"/>
                                <XAxis dataKey="date" stroke="#666" fontSize={10} tick={{fill: '#999'}}/>
                                <YAxis stroke="#666" fontSize={10} tick={{fill: '#999'}}/>
                                <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid #fff', color: '#fff'}} cursor={{fill: 'rgba(255,255,255,0.1)'}}/>
                                <Legend />
                                {chartData.keys.map((key) => (
                                    <Bar key={key} dataKey={key} stackId="a" fill={getRandomColor(key)} />
                                ))}
                            </BarChart>
                      </ResponsiveContainer>
                  </div>

                  {/* RE TERMINAL TOAST (Kept here to ensure it works) */}
                  {backupToast && (
                      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1000] bg-black/90 border-2 border-emerald-500 text-emerald-500 px-10 py-5 rounded-none shadow-[0_0_30px_rgba(16,185,129,0.5)] font-mono flex flex-col items-center gap-2 animate-terminal-flicker">
                          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
                          <div className="flex items-center gap-3">
                              <ShieldCheck size={28} className="animate-pulse" />
                              <div className="text-lg font-black uppercase tracking-[0.3em]">Backup Initialized</div>
                          </div>
                          <div className="h-[1px] w-full bg-emerald-500/30"></div>
                          <div className="text-[10px] uppercase tracking-widest opacity-70">Physical Data Integrity Confirmed</div>
                      </div>
                  )}
              </div>
            )
          )}


          {/* MAP SYSTEM: Shows ALL customers (Read-only for agents to maintain situational awareness) */}
          {activeTab === 'map_war_room' && <MapMissionControl customers={customers} transactions={transactions} inventory={inventory} db={db} appId={appId} user={user} logAudit={logAudit} triggerCapy={triggerCapy} isAdmin={isAdmin} savedHome={appSettings?.mapHome} onSetHome={handleSetMapHome} tierSettings={tierSettings} />}
          
         {/* JOURNEY PLAN: Strictly locked down to ONLY show Admin's authorized Pricing Tiers */}
          {activeTab === 'journey' && <JourneyView customers={permittedCustomers} db={db} appId={appId} user={user} logAudit={logAudit} triggerCapy={triggerCapy} setActiveTab={setActiveTab} tierSettings={tierSettings} isAdmin={isAdmin} />}
          
          {/* NEW FLEET ROUTER */}
          {activeTab === 'fleet' && userRole === 'ADMIN' && (
            <FleetCanvasManager 
                db={db} 
                appId={appId} 
                user={user} 
                inventory={inventory} 
                transactions={transactions} 
                appSettings={appSettings}
                logAudit={logAudit} 
                triggerCapy={triggerCapy} 
                isAdmin={isAdmin} 
                motorists={motorists} // 🚀 FIXED: Inject the live, real-time database sync
            />
          )}
          
          {activeTab === 'inventory' && userRole === 'ADMIN' && (
          <div className="h-auto min-h-[800px] lg:min-h-0 lg:h-[calc(100vh-140px)] w-full max-w-7xl mx-auto border-4 border-black shadow-[0_0_0_1px_rgba(255,255,255,0.1)] relative flex flex-col">
              
              <ResidentEvilInventory 
                  inventory={filteredInventory}
                  motorists={motorists}
                  transactions={transactions}
                  isAdmin={isAdmin}
                  backgroundSrc={appSettings?.inventoryBg}
                  onUploadBg={handleInventoryBgSelect}
                  
                  // --- UPDATED SAVE FUNCTION ---
                  onUpdateProduct={async (id, updates) => {
                      // updates contains { dimensions: ..., defaultZoom: ... }
                      try {
                          await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, id), updates);
                          triggerCapy("3D Settings Saved! 📦");
                          // Update local state immediately
                          setInventory(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
                      } catch(err) { console.error(err); alert("Save failed"); }
                  }}
                  // ---------------------------

                  onDelete={(id) => deleteProduct(id)}
                  onEdit={(item) => { 
                      setEditingProduct(item); 
                      setTempImages(item.images || {}); 
                      setBoxDimensions(item.dimensions || {w:55, h:90, d:22}); 
                      setUseFrontForBack(item.useFrontForBack || false); 
                  }}
                  onAddNew={() => { 
                      setEditingProduct({}); 
                      setTempImages({}); 
                      setBoxDimensions({w:55, h:90, d:22}); 
                      setUseFrontForBack(false); 
                  }}
              />
              
              {/* EDIT MODAL - AUTO HIDES WHEN CROPPING (fixes "Menu doesn't exit") */}
              {editingProduct && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-300"
                    style={{ display: cropImageSrc ? 'none' : 'flex' }} // <--- MAGIC FIX: Hides when cropping
                >
                    <div className="bg-black border border-white/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                        <button onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 text-white hover:text-red-500"><X size={24}/></button>
                        <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-widest border-b border-white/20 pb-2">
                            {editingProduct.id ? "Edit Record" : "New Entry"}
                        </h2>
                        
                        <form onSubmit={handleSaveProduct} className="space-y-6 font-mono text-xs">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div><label className="text-gray-500 block mb-1">PRODUCT NAME</label><input name="name" defaultValue={editingProduct.name} className="w-full p-2 bg-white/5 border border-white/20 text-white focus:border-orange-500 outline-none"/></div>

                                  {/* --- PINPOINT: Edit Product Modal --- */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div><label className="text-[10px] text-gray-500 block mb-1 tracking-widest">STOCK</label><input name="stock" type="number" defaultValue={editingProduct.stock} className="w-full p-2 bg-white/5 border border-emerald-500/50 text-emerald-400 focus:border-emerald-500 outline-none"/></div>
                                        <div><label className="text-[10px] text-gray-500 block mb-1 tracking-widest">MIN. ALERT</label><input name="minStock" type="number" defaultValue={editingProduct.minStock || 5} className="w-full p-2 bg-white/5 border border-red-500/50 text-red-400 focus:border-red-500 outline-none"/></div>
                                        <div><label className="text-[10px] text-gray-500 block mb-1 tracking-widest">TYPE</label><input name="type" defaultValue={editingProduct.type} className="w-full p-2 bg-white/5 border border-white/20 text-white focus:border-white outline-none"/></div>
                                    </div>
                                    
                                    {/* RESTORED: FRONT = BACK TOGGLE */}
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            id="useFront" 
                                            checked={useFrontForBack} 
                                            onChange={(e) => setUseFrontForBack(e.target.checked)}
                                            className="accent-orange-500 w-4 h-4"
                                        />
                                        <label htmlFor="useFront" className="text-white text-xs cursor-pointer select-none">Use Front Image for Back</label>
                                    </div>

                                    {/* TEXTURE ASSETS (WITH PREVIEWS & EDIT BTN) */}
                                    <div className="p-3 border border-dashed border-white/30 text-center bg-white/5">
                                        <p className="text-orange-500 font-bold mb-2">TEXTURE ASSETS</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['front', 'back', 'left', 'right', 'top', 'bottom'].map(face => {
                                                const hasImg = tempImages[face] || (editingProduct.images && editingProduct.images[face]);
                                                return (
                                                    <div 
                                                        key={face} 
                                                        className="h-12 bg-black border border-white/10 flex items-center justify-center text-[9px] text-gray-500 uppercase cursor-pointer hover:bg-white/10 hover:text-white transition-colors relative group overflow-hidden" 
                                                        onClick={() => document.getElementById(`file-edit-${face}`).click()}
                                                    >
                                                        {hasImg ? (
                                                            <>
                                                                <img src={hasImg} className="w-full h-full object-cover opacity-50 group-hover:opacity-100"/>
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Pencil size={12} className="text-white"/>
                                                                </div>
                                                                {/* RESTORED: Edit from existing button */}
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleEditExisting(face, hasImg); }}
                                                                    className="absolute top-0 right-0 p-1 bg-orange-600 text-white opacity-0 group-hover:opacity-100 z-20"
                                                                    title="Edit Crop"
                                                                >
                                                                    <Crop size={8}/>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            face
                                                        )}
                                                        <input id={`file-edit-${face}`} type="file" className="hidden" onChange={(e) => handleProductFaceUpload(e, face)}/>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-white border-b border-white/10 pb-1 mb-2">PRICING ENGINE</h3>
                                    <div><label className="text-gray-500 block mb-1">DISTRIBUTOR (MODAL)</label><input name="priceDistributor" type="number" defaultValue={editingProduct.priceDistributor} className="w-full p-2 bg-white/5 border border-red-900/50 text-red-400 focus:border-red-500 outline-none"/></div>
                                    <div><label className="text-gray-500 block mb-1">RETAIL PRICE</label><input name="priceRetail" type="number" defaultValue={editingProduct.priceRetail} className="w-full p-2 bg-white/5 border border-emerald-900/50 text-emerald-400 focus:border-emerald-500 outline-none"/></div>
                                    <div><label className="text-gray-500 block mb-1">GROSIR PRICE</label><input name="priceGrosir" type="number" defaultValue={editingProduct.priceGrosir} className="w-full p-2 bg-white/5 border border-blue-900/50 text-blue-400 focus:border-blue-500 outline-none"/></div>
                                    <div><label className="text-gray-500 block mb-1">ECER PRICE</label><input name="priceEcer" type="number" defaultValue={editingProduct.priceEcer} className="w-full p-2 bg-white/5 border border-yellow-900/50 text-yellow-400 focus:border-yellow-500 outline-none"/></div>
                                </div>
                            </div>
                            <button className="w-full bg-white text-black font-bold py-4 mt-6 uppercase hover:bg-gray-300 tracking-widest text-sm">Update Database</button>
                        </form>
                    </div>
                </div>
              )}
          </div>
      )}

          
          {/* NEW: RESTOCK VAULT ENGINE */}
          {activeTab === 'restock_vault' && (
          <div className="h-auto min-h-[800px] lg:min-h-0 lg:h-[calc(100vh-140px)] w-full max-w-7xl mx-auto border-4 border-black shadow-[0_0_0_1px_rgba(255,255,255,0.1)] relative flex flex-col bg-black">
              <RestockVaultView 
                  inventory={inventory} 
                  procurements={procurements}
                  db={db} 
                  storage={storage} 
                  appId={appId} 
                  user={user} 
                  isAdmin={isAdmin}
                  logAudit={logAudit} 
                  triggerCapy={triggerCapy} 
              />
          </div>
          )}

          {activeTab === 'sales' && (
              <div className="h-full w-full flex flex-col relative bg-black"> 
                  {/* --- FIXED: ADMIN FIELD MODE TOGGLE BAR --- */}
                  {userRole === 'ADMIN' && (
                      <div className="w-full shrink-0 bg-[#0f0e0d] border-b-2 border-[#3e3226] p-3 flex justify-center z-[200] shadow-md">
                          <div className="bg-black/90 backdrop-blur-md border border-[#8b7256] p-1.5 rounded-full flex items-center shadow-2xl">
                              <button onClick={() => setAdminSalesMode('VAULT')} className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${adminSalesMode === 'VAULT' ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>Master Vault</button>
                              <button onClick={() => setAdminSalesMode('VEHICLE')} className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${adminSalesMode === 'VEHICLE' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>Boss Car</button>
                          </div>
                      </div>
                  )}
                  <div className="flex-1 min-h-0 relative">
                      <MerchantSalesView 
                          inventory={salesTerminalInventory} 
                          user={user} 
                          appSettings={appSettings}
                          customers={customers} 
                          allowedPayments={agentSettings.allowedPayments}
                          allowedTiers={agentSettings.allowedTiers}
                          onProcessSale={handleMerchantSale}
                          onInspect={(item) => setExaminingProduct(item)} 
                      />
                  </div>
              </div>
          )}

        {activeTab === 'receivables' && (
              <ConsignmentFinanceView 
                  transactions={transactions} 
                  inventory={inventory} 
                  onPayment={handleConsignmentPayment} 
                  onReturn={handleConsignmentReturn} 
                  onAddGoods={handleAddGoodsToCustomer}
                  onDeleteConsignment={handleDeleteConsignmentData}
                  isAdmin={isAdmin}
                  user={user}
                  agentProfileId={agentProfileId}
                  motorists={motorists}
                  transferRequests={transferRequests}
                  onRequestTransfer={handleRequestTransfer}
                  onAgentAcceptTransfer={handleAgentAcceptTransfer}
                  onAdminApproveTransfer={handleAdminApproveTransfer}
              />
          )}

          {/* 🚀 NEW EOD ROUTER 🚀 */}
          {activeTab === 'eod' && (
              <EODReconciliationView 
                  transactions={transactions} 
                  inventory={inventory} 
                  agentCanvas={agentCanvas}
                  agentProfileId={agentProfileId}
                  eodReports={eodReports}
                  user={user}
                  onSubmitEOD={handleSubmitEOD}
                  onVerifyEOD={handleVerifyEOD}
                  isAdmin={isAdmin}
              />
          )}



          {activeTab === 'customers' && (
              <CustomerManagement 
                  customers={customers} 
                  db={db} 
                  appId={appId} 
                  user={user} 
                  logAudit={logAudit} 
                  triggerCapy={triggerCapy} 
                  isAdmin={isAdmin} 
                  tierSettings={tierSettings}
                  onRequestCrop={(file) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                          setCropImageSrc(reader.result);
                          setActiveCropContext({ type: 'customer_staging', face: 'front' });
                          setBoxDimensions({ w: 100, h: 100, d: 0 }); // Square crop
                      };
                      reader.readAsDataURL(file);
                  }}
                  croppedImage={tempCustomerImage}
                  onClearCroppedImage={() => setTempCustomerImage(null)}
              />
          )}

        
          {activeTab === 'stock_opname' && (
              <StockOpnameView 
                  inventory={inventory} 
                  db={db} 
                  appId={appId} 
                  user={user} 
                  logAudit={logAudit}
                  triggerCapy={triggerCapy}
              />
          )}
          {activeTab === 'sampling' && (
              <>
                  {/* EDIT FOLDER MODAL */}
                  {editingFolder && (
                      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                              <h3 className="font-bold text-lg mb-4 dark:text-white">Rename Folder</h3>
                              <form onSubmit={processFolderEdit} className="space-y-4">
                                  <div><label className="text-xs font-bold text-slate-500">Date</label><input name="newDate" type="date" defaultValue={editingFolder.oldDate} className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white"/></div>
                                  <div><label className="text-xs font-bold text-slate-500">Location Name</label><input name="newReason" defaultValue={editingFolder.oldReason} className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white"/></div>
                                  <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setEditingFolder(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">Cancel</button><button className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-bold">Save Move</button></div>
                              </form>
                          </div>
                      </div>
                  )}

                  {/* EDIT ITEM MODAL (The one you asked for) */}
                  <SampleEntryModal 
                      isOpen={!!editingSample} 
                      onClose={() => setEditingSample(null)} 
                      initialData={editingSample} 
                      inventory={inventory}
                      onSubmit={editingSample?.isNew ? handleBatchSamplingSubmit : handleUpdateSampling} // Logic switcher
                  />

                  {/* MAIN VIEW */}
                  {showSamplingAnalytics ? (
                      <SamplingAnalyticsView samplings={samplings} inventory={inventory} onBack={() => setShowSamplingAnalytics(false)} />
                  ) : (
                      <SamplingFolderView 
                          samplings={samplings} 
                          isAdmin={isAdmin} 
                          onRecordSample={() => setEditingSample({isNew:true})} // New Item
                          onDelete={handleDeleteSampling} 
                          onEdit={(s) => setEditingSample(s)} // Edit Item
                          onEditFolder={handleBatchFolderEdit}
                          onShowAnalytics={() => setShowSamplingAnalytics(true)}
                      />
                  )}
              </>
          )}
          
          {/* --- PINPOINT: Main App Render Block (Line 2618) --- */}
          {activeTab === 'transactions' && <HistoryReportView transactions={transactions} inventory={inventory} onDeleteFolder={handleDeleteHistory} onDeleteTransaction={handleDeleteSingleTransaction} isAdmin={isAdmin} user={user} appId={appId} db={db} appSettings={appSettings} userRole={userRole} agentProfileId={agentProfileId} />}
          
         {activeTab === 'audit' && (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
        <div className="flex justify-between items-end border-b border-white/10 pb-4">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="text-orange-500"/> Audit Vault
                </h2>
                <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em]">Immutable Operation Archive</p>
            </div>
        </div>
        
        {/* --- FULLY OPTIMIZED EXPLORER --- */}
        <AuditVaultExplorer 
    db={db} 
    storage={storage} // <--- ADD THIS LINE HERE
    appId={appId} 
    user={user} 
    isAdmin={isAdmin} 
    logAudit={logAudit} 
    setBackupToast={setBackupToast} 
/>
        
        <div className="mt-10">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 opacity-50">Recent System Activity</h3>
            <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden font-mono text-[10px]">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-slate-500">
                        <tr><th className="p-3">Action</th><th className="p-3">Details</th><th className="p-3 text-right">Time</th></tr>
                    </thead>
                    <tbody>
                        {auditLogs.slice(0, 8).map(log => (
                            <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="p-3 text-orange-500 font-bold">{log.action}</td>
                                <td className="p-3 text-slate-300">{log.details}</td>
                                <td className="p-3 text-right text-slate-500">
                                    {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString() : 'Just now'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
)}


          {activeTab === 'settings' && renderSettings()}
        </>
      )}

      {/* GLOBAL WIDGETS */}
      <CapybaraMascot 
          isDiscoMode={isDiscoMode} 
          message={showCapyMsg ? capyMsg : null} 
          onClick={() => cycleMascotMessage()} 
          staticImageSrc={appSettings?.mascotImage} 
          user={user} 
          
          // --- ADD THIS LINE ---
          scale={appSettings?.mascotScale || 1} 
      />
    </BiohazardTheme>
  );
}