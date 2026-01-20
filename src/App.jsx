import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, FileText, 
  Settings, Sun, Moon, Search, Plus, Trash2, 
  Save, X, Upload, RotateCcw, Camera, Download,
  TrendingUp, AlertCircle, ChevronRight, ChevronLeft, DollarSign, Image as ImageIcon,
  User, Lock, ClipboardList, Crop, RotateCw, Move, Maximize2, ArrowRight, RefreshCcw, MessageSquarePlus, MinusCircle, ZoomIn, ZoomOut, Unlock,
  History, ShieldCheck, Copy, Replace, ClipboardCheck, Store, Wallet, Truck, Menu, MapPin, Phone, Edit, Folder,
  Key, MessageSquare, LogIn, LogOut, ShieldAlert, FileJson, UploadCloud, Tag, Calendar, XCircle, Printer, FileSpreadsheet, Pencil, Globe
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import * as XLSX from 'xlsx'; 

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";        // <-- WAS MISSING
import { getAnalytics } from "firebase/analytics";   // <-- WAS MISSING
import { 
 getAuth, 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup,      
  GoogleAuthProvider,
  reauthenticateWithPopup    
} from 'firebase/auth';

import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  orderBy,
  runTransaction,
  writeBatch
} from "firebase/firestore";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyC9Qr2w0K_RbygNvrzVW1ALE8SmLH6qK_4",
  authDomain: "cello-inventory-manager.firebaseapp.com",
  projectId: "cello-inventory-manager",
  storageBucket: "cello-inventory-manager.firebasestorage.app",
  messagingSenderId: "168352992942",
  appId: "1:168352992942:web:3702ffb579bec0a93ea73f",
  measurementId: "G-CM3Z2Q412T"
};

const app = initializeApp(firebaseConfig);
let analytics;
try { analytics = getAnalytics(app); } catch (e) { console.warn("Analytics blocked"); }
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const appId = "cello-inventory-manager";

// --- CONSTANTS ---
const ADMIN_PASS = "KomuroMangetsu02";

// --- UTILITIES ---
const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(number);
};

const getCurrentDate = () => new Date().toISOString().split('T')[0];

const getRandomColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
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

const ImageCropper = ({ imageSrc, onCancel, onCrop, dimensions, onDimensionsChange, face }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [maxDim, setMaxDim] = useState(300); 
  const [cropBox, setCropBox] = useState({ w: 200, h: 200 });
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [resizingHandle, setResizingHandle] = useState(null); 
  const lastPos = useRef({ x: 0, y: 0 });
  const imageRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && !isInitialized) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const padding = 60;
        let axisX = 'w'; let axisY = 'h';
        if (face === 'left' || face === 'right') axisX = 'd';
        if (face === 'top' || face === 'bottom') axisY = 'd';
        const ratio = dimensions[axisX] / dimensions[axisY];
        let initialW, initialH;
        if (ratio > 1) { initialW = Math.min(320, width-padding); initialH = initialW / ratio; } 
        else { initialH = Math.min(320, height-padding); initialW = initialH * ratio; }
        setCropBox({ w: initialW, h: initialH });
        setIsInitialized(true);
    }
  }, [face, dimensions, isInitialized]);

  const handleImageMouseDown = (e) => { e.stopPropagation(); setIsDraggingImage(true); lastPos.current = { x: e.clientX, y: e.clientY }; };
  const handleResizeMouseDown = (e, handle) => { e.stopPropagation(); e.preventDefault(); setResizingHandle(handle); lastPos.current = { x: e.clientX, y: e.clientY }; };
  const handleMouseMove = (e) => {
    const clientX = e.clientX; const clientY = e.clientY;
    if (isDraggingImage) {
      const dx = clientX - lastPos.current.x; const dy = clientY - lastPos.current.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy })); lastPos.current = { x: clientX, y: clientY };
    } else if (resizingHandle) {
      const dx = clientX - lastPos.current.x; const dy = clientY - lastPos.current.y;
      if (resizingHandle.includes('r')) setCropBox(prev => ({ ...prev, w: Math.max(50, prev.w + dx) }));
      if (resizingHandle.includes('b')) setCropBox(prev => ({ ...prev, h: Math.max(50, prev.h + dy) }));
      lastPos.current = { x: clientX, y: clientY };
    }
  };
  const handleMouseUp = () => { setIsDraggingImage(false); setResizingHandle(null); };
  const executeCrop = () => {
    const canvas = document.createElement('canvas'); const BASE_RES = 600; const ratio = cropBox.w / cropBox.h;
    if (ratio > 1) { canvas.width = BASE_RES; canvas.height = BASE_RES / ratio; } else { canvas.height = BASE_RES; canvas.width = BASE_RES * ratio; }
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = imageRef.current; ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate((rotation * Math.PI) / 180);
    const scaleFactor = canvas.width / cropBox.w; 
    ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor); ctx.scale(zoom * scaleFactor, zoom * scaleFactor);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    onCrop(canvas.toDataURL('image/jpeg', 0.8));
  };
  
  const DimSlider = ({ label, val, axis }) => (
    <div className="flex flex-col mb-4">
        <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400">{label}</label>
            <div className="flex items-center gap-1"><input type="number" value={val} onChange={(e) => onDimensionsChange({...dimensions, [axis]: Math.max(1, parseInt(e.target.value) || 0)})} className="w-12 text-right text-xs font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded text-slate-700 dark:text-slate-200 border border-transparent focus:border-orange-500 outline-none"/><span className="text-[10px] text-slate-400">mm</span></div>
        </div>
        <input type="range" min="1" max={maxDim} step="1" value={val} onChange={(e) => onDimensionsChange({...dimensions, [axis]: parseInt(e.target.value)})} className="w-full h-3 rounded-full appearance-none cursor-pointer accent-orange-500 bg-orange-100 dark:bg-orange-900/30"/>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4 animate-fade-in" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div className="bg-white dark:bg-slate-800 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col bg-slate-900 relative">
            <div className="p-4 z-30 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"><h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide"><Crop size={14} className="text-cyan-400"/> Align {face}</h3></div>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing" ref={containerRef}>
                <div className="relative transition-all duration-75" style={{ width: cropBox.w, height: cropBox.h }}>
                    <div className="absolute inset-0 border-[3px] border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.85)] z-20 pointer-events-none"></div>
                    <div className="absolute right-[-12px] top-1/2 -translate-y-1/2 w-6 h-12 bg-white border-2 border-cyan-500 rounded-full z-30 cursor-ew-resize flex items-center justify-center pointer-events-auto" onMouseDown={(e) => handleResizeMouseDown(e, 'r')}><Move size={12} className="text-cyan-600 rotate-90"/></div>
                    <div className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 h-6 w-12 bg-white border-2 border-cyan-500 rounded-full z-30 cursor-ns-resize flex items-center justify-center pointer-events-auto" onMouseDown={(e) => handleResizeMouseDown(e, 'b')}><Move size={12} className="text-cyan-600"/></div>
                    <div className="absolute bottom-[-10px] right-[-10px] w-8 h-8 bg-cyan-500 border-4 border-white rounded-full z-30 cursor-nwse-resize pointer-events-auto" onMouseDown={(e) => handleResizeMouseDown(e, 'rb')}/>
                    <div className="absolute inset-0 overflow-visible pointer-events-auto" onMouseDown={handleImageMouseDown}>
                        <img ref={imageRef} src={imageSrc} className="absolute max-w-none origin-center" style={{ transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`, left: '50%', top: '50%', userSelect: 'none', pointerEvents: 'none'}}/>
                    </div>
                </div>
            </div>
        </div>
        <div className="w-full md:w-80 bg-white dark:bg-slate-900 p-6 flex flex-col gap-6 border-l dark:border-slate-700 overflow-y-auto z-40">
            <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-700"><div className="flex items-center gap-2"><Maximize2 size={18} className="text-orange-500"/><h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">3D Size</h4></div></div>
                <div><DimSlider label="Width" val={dimensions.w} axis="w" /><DimSlider label="Height" val={dimensions.h} axis="h" /><DimSlider label="Depth" val={dimensions.d} axis="d" /></div>
            </div>
            <div className="space-y-6">
                <div>
                    <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-500 block">ZOOM</label><span className="text-xs text-slate-400">{zoom.toFixed(2)}x</span></div>
                    <input type="range" min="0.1" max="5" step="0.05" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                </div>
                <div>
                    <div className="flex justify-between mb-2 items-center">
                        <label className="text-xs font-bold text-slate-500 block">ROTATE</label>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setRotation(r => r - 90)} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"><RotateCcw size={14} /></button>
                            <button onClick={() => setRotation(r => r + 90)} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"><RotateCw size={14} /></button>
                        </div>
                    </div>
                    <input type="range" min="-180" max="180" step="1" value={rotation} onChange={(e) => setRotation(parseFloat(e.target.value))} className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                </div>
            </div>
            <div className="mt-auto pt-4 flex gap-3"><button onClick={onCancel} className="px-6 py-4 rounded-xl bg-slate-100 dark:bg-slate-800 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors">Cancel</button><button onClick={executeCrop} className="flex-1 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/40 transition-all transform active:scale-95"><Crop size={20}/> Crop & Save</button></div>
        </div>
      </div>
    </div>
  );
};

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

const CapybaraMascot = ({ mood = 'happy', message, onClick, customImage }) => {
  const [isBouncing, setIsBouncing] = useState(false);
  useEffect(() => { const interval = setInterval(() => { setIsBouncing(true); setTimeout(() => setIsBouncing(false), 500); }, 5000 + Math.random() * 5000); return () => clearInterval(interval); }, []);
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end cursor-pointer group" onClick={onClick}>
      {message && (<div className="bg-white dark:bg-slate-800 p-3 rounded-t-xl rounded-bl-xl shadow-lg border-2 border-orange-400 mb-2 max-w-xs animate-fade-in-up"><p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{message}</p></div>)}
      <div className={`transition-transform duration-300 ${isBouncing ? '-translate-y-2' : ''} hover:scale-110 drop-shadow-xl`}><img src={customImage || "/capybara.jpg"} alt="Mascot" className="w-24 h-24 rounded-full border-4 border-orange-500 object-cover shadow-lg bg-orange-100" onError={(e) => {e.target.onerror = null; e.target.src="https://api.dicebear.com/7.x/avataaars/svg?seed=Capy"}}/></div>
    </div>
  );
};

const ExamineModal = ({ product, onClose, onUpdateProduct, isAdmin }) => {
  const [rotation, setRotation] = useState({ x: -15, y: 25 });
  const [isDragging, setIsDragging] = useState(false);
  const [viewScale, setViewScale] = useState(2.8);
  const [isScaleLocked, setIsScaleLocked] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState(product.dimensions || { w: 55, h: 90, d: 22 });
  const initialRotation = { x: -15, y: 25 };
  const handleDimensionsChange = (newDims) => { setDimensions(newDims); if (onUpdateProduct) onUpdateProduct({ ...product, dimensions: newDims }); };
  const handleReset = () => { setRotation(initialRotation); setViewScale(2.8); };
  const handleZoom = (delta) => { if (isScaleLocked) return; setViewScale(prev => Math.min(5, Math.max(0.5, prev + delta))); };
  const w = dimensions.w * viewScale; const h = dimensions.h * viewScale; const d = dimensions.d * viewScale;
  const handleMouseDown = (e) => { setIsDragging(true); lastMousePos.current = { x: e.clientX, y: e.clientY }; };
  const handleMouseMove = (e) => { if (!isDragging) return; const deltaX = e.clientX - lastMousePos.current.x; const deltaY = e.clientY - lastMousePos.current.y; setRotation(prev => ({ x: prev.x - deltaY * 0.5, y: prev.y + deltaX * 0.5 })); lastMousePos.current = { x: e.clientX, y: e.clientY }; };
  const handleMouseUp = () => setIsDragging(false);
  const renderFace = (imageSrc, defaultColor = "bg-white") => { if (imageSrc) return <img src={imageSrc} className="w-full h-full object-cover" alt="texture" />; return <div className={`w-full h-full ${defaultColor} border border-slate-400 opacity-90`}></div>; };
  const images = product.images || {};
  const frontImage = images.front || product.image;
  const backImage = product.useFrontForBack ? frontImage : images.back;
  const BoxSlider = ({ label, val, axis }) => (
    <div className="flex flex-col gap-1"><div className="flex justify-between text-[10px] text-white/70 uppercase font-bold"><span>{label}</span><span>{val}mm</span></div><input type="range" min="10" max="300" step="1" value={val} onChange={(e) => handleDimensionsChange({ ...dimensions, [axis]: parseInt(e.target.value) })} className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-orange-500" onMouseDown={(e) => e.stopPropagation()}/></div>
  );
  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4 overflow-hidden" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <button onClick={onClose} className="absolute top-8 right-8 text-white hover:text-red-500 z-50 p-2 bg-black/20 rounded-full"><X size={40} /></button>
      <div className="absolute top-8 right-24 z-50 flex gap-2" onMouseDown={(e) => e.stopPropagation()}>
         <button onClick={() => handleZoom(-0.2)} className="p-2 bg-black/60 text-white rounded-full hover:bg-white/20"><ZoomOut size={18}/></button>
         <button onClick={() => setIsScaleLocked(!isScaleLocked)} className={`p-2 rounded-full hover:bg-white/20 ${isScaleLocked ? 'bg-orange-600 text-white' : 'bg-black/60 text-white'}`}>{isScaleLocked ? <Lock size={18}/> : <Unlock size={18}/>}</button>
         <button onClick={() => handleZoom(0.2)} className="p-2 bg-black/60 text-white rounded-full hover:bg-white/20"><ZoomIn size={18}/></button>
      </div>
      {isAdmin && (<div className="absolute top-8 left-8 z-50 bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-xl w-48 shadow-xl" onMouseDown={(e) => e.stopPropagation()}><div className="flex justify-between items-center mb-3"><h4 className="text-xs font-bold text-white flex items-center gap-2"><Maximize2 size={12} className="text-orange-500"/> Dimensions</h4><button onClick={handleReset} className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"><RefreshCcw size={10} /> Reset</button></div><div className="space-y-4"><BoxSlider label="Width" val={dimensions.w} axis="w" /><BoxSlider label="Height" val={dimensions.h} axis="h" /><BoxSlider label="Depth" val={dimensions.d} axis="d" /></div></div>)}
      <div className="text-white mb-12 text-center font-mono pointer-events-none select-none mt-20 md:mt-0"><h2 className="text-3xl font-bold tracking-[0.2em] uppercase text-orange-500 drop-shadow-lg">{product.name}</h2><p className="text-emerald-400 text-xs mt-2 tracking-widest animate-pulse">DRAG TO ROTATE OBJECT</p></div>
      <div className="relative w-full max-w-md h-[400px] flex items-center justify-center perspective-1000 cursor-move">
        <div className="relative preserve-3d" style={{ width: `${w}px`, height: `${h}px`, transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`, transformStyle: 'preserve-3d', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}>
          <div className="absolute inset-0 bg-white backface-hidden flex items-center justify-center border border-slate-400" style={{ width: w, height: h, transform: `translateZ(${d / 2}px)` }}>{frontImage ? <img src={frontImage} className="w-full h-full object-cover"/> : <span className="text-4xl">🚬</span>}<div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div></div>
          <div className="absolute inset-0 bg-slate-800 backface-hidden flex items-center justify-center border border-slate-600" style={{ width: w, height: h, transform: `rotateY(180deg) translateZ(${d / 2}px)` }}>{renderFace(backImage, "bg-slate-800")}</div>
          <div className="absolute" style={{ width: d, height: h, transform: `rotateY(90deg) translateZ(${w / 2}px)`, left: (w - d)/2 }}>{renderFace(images.right, "bg-slate-200")}</div>
          <div className="absolute" style={{ width: d, height: h, transform: `rotateY(-90deg) translateZ(${w / 2}px)`, left: (w - d)/2 }}>{renderFace(images.left, "bg-slate-200")}</div>
          <div className="absolute" style={{ width: w, height: d, transform: `rotateX(90deg) translateZ(${h / 2}px)`, top: (h - d)/2 }}>{renderFace(images.top, "bg-slate-300")}</div>
          <div className="absolute" style={{ width: w, height: d, transform: `rotateX(-90deg) translateZ(${h / 2}px)`, top: (h - d)/2 }}>{renderFace(images.bottom, "bg-slate-300")}</div>
        </div>
      </div>
      <div className="mt-8 w-full max-w-2xl bg-black/60 border-t border-b border-orange-500/50 p-6 backdrop-blur-md pointer-events-none select-none">
        <div className="flex justify-between items-start mb-2 font-mono text-xs text-orange-300">
           <span>STOCK: {product.stock} Bks</span>
           <span>TYPE: {product.type}</span>
           <span>CUKAI: {product.taxStamp}</span>
        </div>
        <p className="text-white font-serif text-lg leading-relaxed text-center shadow-black drop-shadow-md">"{product.description || "A standard pack of cigarettes. No unusual properties detected."}"</p>
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

const HistoryReportView = ({ transactions, inventory, onDeleteFolder, onDeleteTransaction, isAdmin, user, appId }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [reportView, setReportView] = useState(false);
  const [rangeType, setRangeType] = useState('daily');
  const [targetDate, setTargetDate] = useState(getCurrentDate());
  const [editingTrans, setEditingTrans] = useState(null);

  // Filter Transactions based on Date Range
  const filteredTransactions = useMemo(() => {
      const target = new Date(targetDate);
      return transactions.filter(t => {
          const tDate = new Date(t.date);
          if (rangeType === 'daily') return t.date === targetDate;
          if (rangeType === 'weekly') {
              const startOfWeek = new Date(target);
              startOfWeek.setDate(target.getDate() - target.getDay()); 
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6);
              return tDate >= startOfWeek && tDate <= endOfWeek;
          }
          if (rangeType === 'monthly') return tDate.getMonth() === target.getMonth() && tDate.getFullYear() === target.getFullYear();
          if (rangeType === 'yearly') return tDate.getFullYear() === target.getFullYear();
          return false;
      }).sort((a,b) => (b.timestamp?.seconds||0) - (a.timestamp?.seconds||0));
  }, [transactions, rangeType, targetDate]);

  // Calculate Statistics
  const stats = useMemo(() => {
    const totalRev = filteredTransactions.reduce((sum, t) => sum + (t.total || t.amountPaid || 0), 0);
    const totalProfit = filteredTransactions.reduce((sum, t) => sum + (t.totalProfit || 0), 0); // New Profit Stat
    const count = filteredTransactions.length;
    const items = {};
    
    // Payment Method Breakdown
    const payments = {
        Cash: 0,
        QRIS: 0,
        Transfer: 0,
        Titip: 0
    };

    filteredTransactions.forEach(t => {
        // Sum up payment types
        const method = t.paymentType || 'Cash';
        if (payments[method] !== undefined) {
            payments[method] += (t.total || t.amountPaid || 0);
        } else {
            // Handle edge cases or old data
            payments['Cash'] += (t.total || t.amountPaid || 0);
        }

        // Sum up items
        if(t.items) t.items.forEach(i => {
            const product = inventory.find(p => p.id === i.productId);
            const bksQty = convertToBks(i.qty, i.unit, product || {});
            if(!items[i.name]) items[i.name] = { qty: 0, val: 0 };
            items[i.name].qty += bksQty;
            items[i.name].val += (i.calculatedPrice * i.qty);
        });
    });
    return { totalRev, totalProfit, count, items, payments, transactions: filteredTransactions };
  }, [filteredTransactions, inventory]);

  const handleEditSubmit = async (e) => {
      e.preventDefault();
      if(!editingTrans || !user) return;
      const formData = new FormData(e.target);
      const updates = {
          date: formData.get('date'),
          customerName: formData.get('customerName'),
          total: parseFloat(formData.get('total')) || 0,
          updatedAt: serverTimestamp()
      };
      try {
          await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, editingTrans.id), updates);
          setEditingTrans(null);
      } catch(err) { alert(err.message); }
  };

  // --- EXCEL EXPORT WITH PAYMENT BREAKDOWN ---
  const generateExcel = () => {
      const wb = XLSX.utils.book_new();

      // 1. Header Info
      const reportInfo = [
          ["KPM INVENTORY - SALES REPORT"],
          [`Period: ${rangeType.toUpperCase()}`],
          [`Date Selected: ${targetDate}`],
          [`Generated On: ${new Date().toLocaleString()}`],
          [""]
      ];

      // 2. Summary Statistics
      const summaryInfo = [
          ["SUMMARY STATISTICS"],
          ["Total Revenue", stats.totalRev], 
          ["Total Profit (Cuan)", stats.totalProfit],
          ["Total Transactions", stats.count],
          ["Items Sold (Bks)", Object.values(stats.items).reduce((a,b)=>a+b.qty,0)],
          [""]
      ];

      // 3. Payment Breakdown (New Section in Excel)
      const paymentInfo = [
          ["PAYMENT RECONCILIATION"],
          ["Cash (Drawer)", stats.payments.Cash],
          ["QRIS", stats.payments.QRIS],
          ["Transfer (Bank)", stats.payments.Transfer],
          ["Titip (Unpaid)", stats.payments.Titip],
          [""]
      ];

      // 4. Main Data Table
      const tableHeader = [["DATE", "TIME", "CUSTOMER", "TYPE", "PAYMENT", "ITEMS / DETAILS", "TOTAL (Rp)"]];
      
      const tableData = stats.transactions.map(t => {
          const timeStr = t.timestamp ? new Date(t.timestamp.seconds*1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
          let itemsStr = "";
          if (t.items && t.items.length > 0) {
              itemsStr = t.items.map(i => `${i.qty} ${i.unit} ${i.name}`).join(", ");
          } else if (t.paymentType === 'Titip') {
              itemsStr = "Consignment Request";
          } else if (t.itemsPaid) {
              itemsStr = `Payment for ${t.itemsPaid.length} items`;
          }

          return [
              t.date,
              timeStr,
              t.customerName,
              t.type,
              t.paymentType || 'Cash',
              itemsStr,
              t.total || t.amountPaid
          ];
      });

      const finalData = [...reportInfo, ...summaryInfo, ...paymentInfo, ...tableHeader, ...tableData];
      const ws = XLSX.utils.aoa_to_sheet(finalData);

      // Set Column Widths
      ws['!cols'] = [
          { wch: 12 }, // Date
          { wch: 10 }, // Time
          { wch: 25 }, // Customer
          { wch: 10 }, // Type
          { wch: 10 }, // Payment Method
          { wch: 50 }, // Items
          { wch: 15 }  // Total
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Sales Data");
      XLSX.writeFile(wb, `KPM_Report_${rangeType}_${targetDate}.xlsx`);
  };

  const handlePrint = () => {
      window.print();
  };

  const customerStats = useMemo(() => { const stats = {}; transactions.forEach(t => { const name = t.customerName || 'Unknown'; if (!stats[name]) stats[name] = { name, count: 0, total: 0, lastDate: t.date, history: [] }; stats[name].count += 1; if (t.type === 'SALE' || t.type === 'RETURN') stats[name].total += t.total || 0; if (t.date > stats[name].lastDate) stats[name].lastDate = t.date; stats[name].history.push(t); }); return Object.values(stats).sort((a,b) => b.total - a.total); }, [transactions]);

  if (reportView) {
      return (
        <div className="animate-fade-in max-w-5xl mx-auto">
             {/* EDIT MODAL */}
             {editingTrans && (
                 <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                         <h3 className="font-bold text-lg mb-4 dark:text-white">Edit Transaction</h3>
                         <form onSubmit={handleEditSubmit} className="space-y-4">
                             <div><label className="text-xs font-bold text-slate-500">Date</label><input name="date" type="date" defaultValue={editingTrans.date} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"/></div>
                             <div><label className="text-xs font-bold text-slate-500">Customer</label><input name="customerName" defaultValue={editingTrans.customerName} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"/></div>
                             <div><label className="text-xs font-bold text-slate-500">Total Value (Rp)</label><input name="total" type="number" defaultValue={editingTrans.total || editingTrans.amountPaid} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"/></div>
                             <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setEditingTrans(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg font-bold">Cancel</button><button className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-bold">Save Changes</button></div>
                         </form>
                     </div>
                 </div>
             )}

             {/* HEADER CONTROLS (Hidden on Print) */}
             <div className="print:hidden">
                <button onClick={() => setReportView(false)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Folders</button>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border dark:border-slate-700">
                        {['daily', 'weekly', 'monthly', 'yearly'].map(t => (
                            <button key={t} onClick={() => setRangeType(t)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${rangeType === t ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{t}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold shadow-sm"/>
                        <button onClick={generateExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-xl shadow-sm tooltip" title="Download Excel (.xlsx)"><FileSpreadsheet size={20}/></button>
                        <button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-900 text-white p-2.5 rounded-xl shadow-sm tooltip" title="Print PDF"><Printer size={20}/></button>
                    </div>
                </div>
             </div>

             {/* PRINTABLE REPORT CONTAINER */}
             <div className="print-container bg-white dark:bg-slate-800 dark:print:bg-white p-8 rounded-2xl shadow-xl border dark:border-slate-700 print:shadow-none print:border-none print:p-0">
                 <div className="flex justify-between items-end mb-8 border-b-2 border-orange-500 pb-4">
                     <div>
                         <h1 className="text-3xl font-bold text-slate-900 dark:text-white dark:print:text-black uppercase tracking-tight">Sales Report</h1>
                         <p className="text-slate-500 dark:print:text-slate-600 font-mono text-sm mt-1 uppercase">{rangeType} Recap • {new Date(targetDate).toLocaleDateString(undefined, {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
                     </div>
                     <div className="text-right"><p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Total Revenue</p><h2 className="text-4xl font-bold text-emerald-600 dark:print:text-emerald-700">{formatRupiah(stats.totalRev)}</h2></div>
                 </div>
                 
                 {/* SUMMARY CARDS */}
                 <div className="grid grid-cols-3 gap-6 mb-8">
                     <div className="p-4 bg-slate-50 dark:bg-slate-900 dark:print:bg-slate-100 rounded-xl border dark:border-slate-700 print:border-slate-200"><p className="text-xs uppercase text-slate-500 font-bold mb-1">Transactions</p><p className="text-2xl font-bold text-slate-800 dark:text-white dark:print:text-black">{stats.count}</p></div>
                     <div className="p-4 bg-slate-50 dark:bg-slate-900 dark:print:bg-slate-100 rounded-xl border dark:border-slate-700 print:border-slate-200"><p className="text-xs uppercase text-slate-500 font-bold mb-1">Items Moved (Bks)</p><p className="text-2xl font-bold text-blue-600">{Object.values(stats.items).reduce((a,b)=>a+b.qty,0)}</p></div>
                     <div className="p-4 bg-slate-50 dark:bg-slate-900 dark:print:bg-slate-100 rounded-xl border dark:border-slate-700 print:border-slate-200"><p className="text-xs uppercase text-slate-500 font-bold mb-1">Net Profit (Cuan)</p><p className="text-2xl font-bold text-emerald-500">{formatRupiah(stats.totalProfit)}</p></div>
                 </div>

                 {/* NEW: PAYMENT METHOD BREAKDOWN (MONEY RECONCILIATION) */}
                 <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 print:border-slate-200">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white dark:print:text-black flex items-center gap-2">
                        <Wallet size={20} className="text-emerald-500"/> Money Breakdown (Reconciliation)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['Cash', 'QRIS', 'Transfer', 'Titip'].map(method => (
                            <div key={method} className="bg-white dark:bg-slate-800 p-3 rounded-xl border dark:border-slate-700 shadow-sm">
                                <p className="text-xs uppercase font-bold text-slate-400 mb-1">{method}</p>
                                <p className={`text-lg font-bold ${method === 'Titip' ? 'text-orange-500' : 'text-slate-800 dark:text-white dark:print:text-black'}`}>
                                    {formatRupiah(stats.payments[method])}
                                </p>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* PRODUCT BREAKDOWN */}
                 <div className="mb-8">
                     <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white dark:print:text-black flex items-center gap-2"><Package size={20} className="text-orange-500"/> Product Performance</h3>
                     <table className="w-full text-sm text-left border-collapse"><thead className="text-slate-500 border-b-2 border-slate-100 dark:border-slate-700 dark:print:border-slate-300"><tr><th className="py-2">Product Name</th><th className="py-2 text-right">Qty (Bks)</th><th className="py-2 text-right">Revenue</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700 dark:print:divide-slate-200">{Object.entries(stats.items).sort((a,b) => b[1].val - a[1].val).map(([name, data]) => (<tr key={name}><td className="py-3 font-medium text-slate-700 dark:text-slate-200 dark:print:text-black">{name}</td><td className="py-3 text-right text-slate-600 dark:text-slate-400 dark:print:text-black font-mono">{data.qty}</td><td className="py-3 text-right font-bold text-emerald-600">{formatRupiah(data.val)}</td></tr>))}</tbody></table>
                 </div>
                 
                 {/* LOG */}
                 <div>
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white dark:print:text-black flex items-center gap-2"><History size={20} className="text-orange-500"/> Transaction Log</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-900 dark:print:bg-slate-100 text-slate-500 font-bold"><tr><th className="p-3 rounded-l-lg">Time</th><th className="p-3">Customer</th><th className="p-3">Type</th><th className="p-3">Method</th><th className="p-3 text-right">Total</th><th className="p-3 rounded-r-lg text-right print:hidden">Action</th></tr></thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {stats.transactions.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-3 text-slate-500 font-mono text-xs">{t.timestamp ? new Date(t.timestamp.seconds*1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : t.date}</td>
                                        <td className="p-3 font-bold text-slate-700 dark:text-slate-200 dark:print:text-black">{t.customerName}</td>
                                        <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:print:bg-slate-200 dark:print:text-black border dark:border-slate-600">{t.type}</span></td>
                                        <td className="p-3 text-xs text-slate-500">{t.paymentType || 'Cash'}</td>
                                        <td className="p-3 text-right font-bold text-emerald-600">{formatRupiah(t.total || t.amountPaid)}</td>
                                        <td className="p-3 text-right print:hidden">
                                            {isAdmin && (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditingTrans(t)} className="p-1.5 text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"><Pencil size={14}/></button>
                                                    <button onClick={() => onDeleteTransaction(t)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={14}/></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
             </div>
             
             <style>{`@media print { @page { size: A4; margin: 20mm; } body { background: white; color: black; } .print\\:hidden { display: none !important; } .print\\:shadow-none { box-shadow: none !important; } .print\\:border-none { border: none !important; } .print\\:p-0 { padding: 0 !important; } .dark\\:print\\:text-black { color: black !important; } .dark\\:print\\:bg-white { background: white !important; } .dark\\:print\\:bg-slate-100 { background: #f1f5f9 !important; } .dark\\:print\\:border-slate-300 { border-color: #cbd5e1 !important; } nav, .capy-mascot { display: none !important; } main { margin: 0 !important; padding: 0 !important; } }`}</style>
        </div>
      );
  }

  if (!selectedCustomer) { 
      return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><FileText size={24} className="text-orange-500"/> Transaction Reports</h2>
                <button onClick={() => setReportView(true)} className="w-full md:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-xl shadow-sm hover:shadow-md hover:border-orange-500 transition-all flex items-center justify-center gap-2 font-bold text-slate-700 dark:text-white group">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"><Calendar size={20}/></div>
                    <span>Open Analytics Dashboard</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customerStats.map(c => (<div key={c.name} onClick={() => setSelectedCustomer(c)} className="relative bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-orange-500 group"><button onClick={(e) => { e.stopPropagation(); onDeleteFolder(c.name); }} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors z-10"><Trash2 size={16} /></button><div className="flex items-start justify-between mb-4"><div className="p-3 bg-orange-100 dark:bg-slate-700 rounded-lg text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Folder size={24} /></div><span className="text-xs font-mono text-slate-400 mr-8">{c.lastDate}</span></div><h3 className="font-bold text-lg dark:text-white mb-1 truncate">{c.name}</h3><div className="flex justify-between items-end mt-4"><div><p className="text-xs text-slate-500 uppercase">Lifetime Value</p><p className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(c.total)}</p></div><div className="text-right"><p className="text-xs text-slate-500 uppercase">Transactions</p><p className="font-bold dark:text-white">{c.count}</p></div></div></div>))}
            </div>
        </div>
      ); 
  }
  
  const groupedByMonth = selectedCustomer.history.reduce((groups, t) => { const date = new Date(t.date); const key = date.toLocaleString('default', { month: 'long', year: 'numeric' }); if (!groups[key]) groups[key] = []; groups[key].push(t); return groups; }, {});
  return (<div className="animate-fade-in max-w-4xl mx-auto"><button onClick={() => setSelectedCustomer(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Folders</button><div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 overflow-hidden"><div className="bg-slate-900 text-white p-8"><div className="flex justify-between items-start"><div><p className="text-orange-500 font-bold tracking-widest text-xs uppercase mb-1">Customer Performance Report</p><h1 className="text-3xl font-bold font-serif">{selectedCustomer.name}</h1></div><div className="text-right"><p className="text-sm opacity-70">Total Lifetime Value</p><p className="text-2xl font-bold">{formatRupiah(selectedCustomer.total)}</p></div></div></div><div className="p-8">{Object.entries(groupedByMonth).map(([month, trans]) => (<div key={month} className="mb-8 last:mb-0"><h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 border-b-2 border-orange-500 inline-block mb-4 pb-1">{month}</h3><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase text-xs font-bold"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Details</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{trans.map(t => (<tr key={t.id}><td className="p-3 font-mono text-slate-600 dark:text-slate-400">{t.date}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.type === 'SALE' ? 'bg-emerald-100 text-emerald-700' : t.type === 'RETURN' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{t.type.replace('_', ' ')}</span></td><td className="p-3 text-slate-600 dark:text-slate-300">{t.items ? `${t.items.length} Items` : t.itemsPaid ? `Payment for ${t.itemsPaid.length} Items` : 'N/A'}{t.paymentType === 'Titip' && <span className="ml-2 text-xs text-orange-500 font-bold">(Consignment)</span>}</td><td className={`p-3 text-right font-bold ${t.total < 0 ? 'text-red-500' : 'text-slate-700 dark:text-white'}`}>{formatRupiah(t.amountPaid || t.total)}</td></tr>))}</tbody></table></div></div>))}</div></div></div>);
};
const CustomerManagement = ({ customers, db, appId, user, logAudit, triggerCapy, isAdmin }) => {
    // 1. ADD REGION AND CITY TO STATE
    const [formData, setFormData] = useState({ name: '', phone: '', region: '', city: '', address: '' });
    const [editingId, setEditingId] = useState(null);

    const handleSubmit = async (e) => { 
        e.preventDefault(); 
        if (!formData.name.trim()) return; 
        try { 
            if (editingId) { 
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', editingId), { ...formData, name: formData.name.trim(), updatedAt: serverTimestamp() }); 
                await logAudit("CUSTOMER_UPDATE", `Updated customer: ${formData.name}`); 
                triggerCapy("Customer updated successfully!"); 
                setEditingId(null); 
            } else { 
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'customers'), { ...formData, name: formData.name.trim(), updatedAt: serverTimestamp() }); 
                await logAudit("CUSTOMER_ADD", `Added customer: ${formData.name}`); 
                triggerCapy("Customer added to directory!"); 
            } 
            // Reset all fields including Region/City
            setFormData({ name: '', phone: '', region: '', city: '', address: '' }); 
        } catch (err) { console.error(err); } 
    };

    const handleEdit = (customer) => { 
        // Load existing data into form
        setFormData({ 
            name: customer.name, 
            phone: customer.phone || '', 
            region: customer.region || '', 
            city: customer.city || '', 
            address: customer.address || '' 
        }); 
        setEditingId(customer.id); 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };

    const handleDelete = async (id, name) => { 
        if (window.confirm("Delete this customer profile?")) { 
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', id)); 
            logAudit("CUSTOMER_DELETE", `Deleted customer: ${name}`); 
        } 
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Store size={24} className="text-orange-500"/> Customer Directory</h2>
            
            {/* ADD CUSTOMER FORM */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-sm text-slate-500 uppercase">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>
                        {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({name:'', phone:'', region:'', city:'', address:''}); }} className="text-xs text-red-500 hover:underline">Cancel Edit</button>}
                    </div>
                    
                    {/* ROW 1: Name & Phone */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Store Name</label>
                            <input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="e.g. Toko Aneka" required/>
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                            <input value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="0812..." />
                        </div>
                    </div>

                    {/* ROW 2: Region & City (NEW) */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Region (Wilayah)</label>
                            <input value={formData.region} onChange={e=>setFormData({...formData, region: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="e.g. Jawa Tengah" />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">City (Kota)</label>
                            <input value={formData.city} onChange={e=>setFormData({...formData, city: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="e.g. Solo" />
                        </div>
                    </div>

                    {/* ROW 3: Address & Button */}
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-[2] w-full">
                            <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                            <input value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="Jl. Sudirman No. 1" />
                        </div>
                        <button className={`text-white px-6 py-2 rounded-lg font-bold h-10 ${editingId ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'}`}>{editingId ? 'Update' : 'Add'}</button>
                    </div>
                </form>
            </div>

            {/* CUSTOMER LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.map(c => (
                    <div key={c.id} className={`bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 shadow-sm flex justify-between items-start ${editingId === c.id ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-slate-700' : ''}`}>
                        <div>
                            <h3 className="font-bold text-lg dark:text-white">{c.name}</h3>
                            
                            {/* Display Region & City */}
                            {(c.city || c.region) && (
                                <p className="text-xs font-bold text-orange-500 uppercase mb-1">
                                    {c.city ? c.city : ''} {c.region ? `(${c.region})` : ''}
                                </p>
                            )}

                            {c.phone && (
                                <p className="text-sm text-slate-500 flex items-center gap-1">
                                    <Phone size={12}/> 
                                    {isAdmin ? c.phone : "••••••••••"}
                                </p>
                            )}
                            {c.address && <p className="text-sm text-slate-500 flex items-center gap-1 mt-1"><MapPin size={12}/> {c.address}</p>}
                        </div>
                        
                        {/* PRIVACY: Hide Edit/Delete Buttons if not Admin */}
                        {isAdmin && (
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(c)} className="text-slate-400 hover:text-blue-500"><Edit size={16}/></button>
                                <button onClick={() => handleDelete(c.id, c.name)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
// --- MAIN APP COMPONENT ---
export default function KPMInventoryApp() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPin, setAdminPin] = useState(null);       
  const [hasAdminPin, setHasAdminPin] = useState(false); 
  const [inputPin, setInputPin] = useState("");         
  const [isSetupMode, setIsSetupMode] = useState(false); 
  const [showForgotPin, setShowForgotPin] = useState(false);

// --- NEW: ADMIN PIN & RECOVERY LOGIC ---

  // 1. Recovery & Pin States
  const [recoveryAnswer, setRecoveryAnswer] = useState(""); 
  const [inputRecovery, setInputRecovery] = useState("");   
  const [showRecoveryInput, setShowRecoveryInput] = useState(false);

  // 2. Fetch PIN & Secret Word on Load
  useEffect(() => {
    const fetchAdminSettings = async () => {
        if(!user) return;
        const ref = doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'admin');
        const snap = await getDoc(ref);
        if(snap.exists() && snap.data().pin) {
            setAdminPin(snap.data().pin);
            setRecoveryAnswer(snap.data().recoveryWord || ""); 
            setHasAdminPin(true);
        } else {
            setHasAdminPin(false);
        }
    };
    fetchAdminSettings();
  }, [user]);

  // 3. Create/Set New PIN
  const handleSetNewPin = async () => {
      if(inputPin.length < 4) { alert("PIN must be at least 4 digits."); return; }
      if(!inputRecovery.trim()) { alert("Please set a Secret Recovery Word."); return; }
      if(!user) return;
      
      await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'admin'), { 
          pin: inputPin,
          recoveryWord: inputRecovery.trim().toLowerCase(),
          updatedAt: new Date().toISOString()
      });
      
      setAdminPin(inputPin);
      setRecoveryAnswer(inputRecovery.trim().toLowerCase());
      setHasAdminPin(true);
      setIsAdmin(true); 
      setIsSetupMode(false);
      setShowAdminLogin(false);
      setInputPin("");
      setInputRecovery("");
      triggerCapy("Security settings saved.");
  };

  // 4. Login with PIN
  const handlePinLogin = () => {
      if(inputPin === adminPin) {
          setIsAdmin(true);
          setShowAdminLogin(false);
          setInputPin("");
          triggerCapy("Welcome back.");
      } else {
          alert("Wrong PIN!");
          setInputPin("");
      }
  };

  // 5. Start Recovery
  const handleForgotPin = () => {
      setShowRecoveryInput(true); 
      setInputPin("");
  };

  // 6. Verify Secret Word
  const handleVerifyRecovery = () => {
      if(inputRecovery.trim().toLowerCase() === recoveryAnswer) {
          alert("Secret Word Correct! Please create a NEW PIN.");
          setIsSetupMode(true);       
          setShowRecoveryInput(false); 
          setInputRecovery("");
      } else {
          alert("Wrong Secret Word.");
      }
  };

  // 7. Change PIN
  const handleChangePin = () => {
      if(!window.confirm("Change Admin PIN?")) return;
      setIsSetupMode(true); 
      setShowAdminLogin(true);
      setInputPin("");
      setInputRecovery("");
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  
  // Data States
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]); 
  const [transactions, setTransactions] = useState([]);
  const [samplings, setSamplings] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [cart, setCart] = useState([]);
  const [opnameData, setOpnameData] = useState({});
  const [appSettings, setAppSettings] = useState({ mascotImage: '', companyName: 'KPM Inventory', mascotMessages: [] });

  // UI States
  const [editingProduct, setEditingProduct] = useState(null);
  const [examiningProduct, setExaminingProduct] = useState(null);
  const [returningTransaction, setReturningTransaction] = useState(null);
  const [tempImages, setTempImages] = useState({}); 
  const [searchTerm, setSearchTerm] = useState("");
  const [useFrontForBack, setUseFrontForBack] = useState(false);
  const [boxDimensions, setBoxDimensions] = useState({ w: 55, h: 90, d: 22 });
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [activeCropContext, setActiveCropContext] = useState(null); 
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
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
  const [editMascotMessage, setEditMascotMessage] = useState("");
  const [newMascotMessage, setNewMascotMessage] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [editingSample, setEditingSample] = useState(null); // Add this line

  // --- AUTHENTICATION FLOW ---
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        setIsAdmin(false);
        if (currentUser?.email) setCurrentUserEmail(currentUser.email);
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
    if (!user || !user.uid) return;
    const basePath = `artifacts/${appId}/users/${user.uid}`;
    
    // 1. Settings
    const unsubSettings = onSnapshot(doc(db, basePath, 'settings', 'general'), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            setAppSettings(data);
            setEditCompanyName(data?.companyName || "KPM Inventory");
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
    
    // 6. Customers (THIS IS LIKELY THE MISSING PART)
    const unsubCust = onSnapshot(query(collection(db, basePath, 'customers'), orderBy('name', 'asc')), (snap) => setCustomers(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    const savedTheme = localStorage.getItem('kpm_theme');
    if (savedTheme === 'light') setDarkMode(false);
    
    return () => { unsubSettings(); unsubInv(); unsubTrans(); unsubSamp(); unsubLogs(); unsubCust(); };
  }, [user]);

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('kpm_theme', 'dark'); } else { document.documentElement.classList.remove('dark'); localStorage.setItem('kpm_theme', 'light'); }
  }, [darkMode]);

  const handleLogin = async () => { try { await signInWithPopup(auth, googleProvider); } catch (error) { console.error("Login failed", error); alert("Login failed: " + error.message); } };
  const handleLogout = async () => { await signOut(auth); setUser(null); setInventory([]); setTransactions([]); setIsAdmin(false); };

  // --- ACTIONS ---
  const logAudit = async (action, details) => { try { if(user) await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/audit_logs`), { action, details, timestamp: serverTimestamp() }); } catch (err) {} };
  
  const cycleMascotMessage = () => {
    const nextIndex = (msgIndex + 1) % activeMessages.length;
    setMsgIndex(nextIndex);
    const message = activeMessages[nextIndex];
    setCapyMsg(message);
    setShowCapyMsg(true);
    setTimeout(() => setShowCapyMsg(false), 8000); 
  };
  
  const triggerCapy = (msg) => { const message = msg || "Hello!"; setCapyMsg(message); setShowCapyMsg(true); setTimeout(() => setShowCapyMsg(false), 8000); };
  
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
  const handleDeleteHistory = async (customerName) => { if(!window.confirm(`Permanently delete ALL transaction history for "${customerName}"?`)) return; try { const targets = transactions.filter(t => (t.customerName||'').trim() === customerName); for (const t of targets) { await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, t.id)); } await logAudit("HISTORY_DELETE", `Deleted history folder for ${customerName}`); triggerCapy(`Deleted ${targets.length} records for ${customerName}`); } catch (err) { console.error(err); alert("Error deleting history."); } };
  const handleExportCSV = () => { const headers = ["ID,Name,Category,Stock,Price(Retail)\n"]; const csvContent = inventory.map(p => `${p.id},"${p.name}",${p.type},${p.stock},${p.priceRetail}`).join("\n"); const blob = new Blob([headers + csvContent], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `inventory_${getCurrentDate()}.csv`; a.click(); logAudit("EXPORT", "Downloaded Inventory CSV"); };
  const handleCropConfirm = (base64) => { if (!activeCropContext) return; if (activeCropContext.type === 'mascot') { const newSettings = { ...appSettings, mascotImage: base64 }; setAppSettings(newSettings); if(user) { setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), newSettings, {merge: true}); logAudit("SETTINGS_UPDATE", "Updated Mascot Image"); } triggerCapy("Profile picture updated!"); } else if (activeCropContext.type === 'product') { setTempImages(prev => ({ ...prev, [activeCropContext.face]: base64 })); } setCropImageSrc(null); setActiveCropContext(null); };
  const handleMascotSelect = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = () => { setCropImageSrc(reader.result); setActiveCropContext({ type: 'mascot', face: 'front' }); setBoxDimensions({ w: 100, h: 100, d: 100 }); }; reader.readAsDataURL(file); } e.target.value = null; };
  const handleProductFaceUpload = (e, face) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = () => { setCropImageSrc(reader.result); setActiveCropContext({ type: 'product', face }); }; reader.readAsDataURL(file); } e.target.value = null; };
  const handleEditExisting = (face, imgSource) => { setCropImageSrc(imgSource); setActiveCropContext({ type: 'product', face }); };
  const handleSaveCompanyName = () => { if(user) { setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { companyName: editCompanyName }, {merge: true}); logAudit("SETTINGS_UPDATE", `Company Name changed to ${editCompanyName}`); } triggerCapy("Company name updated!"); };

  const handleSaveProduct = async (e) => { e.preventDefault(); if (!user) return; try { const formData = new FormData(e.target); const data = Object.fromEntries(formData.entries());

 // Added 'priceDistributor' to the list so it gets saved as a number
        const numFields = ['stock', 'minStock', 'priceDistributor', 'priceRetail', 'priceGrosir', 'priceEcer']; numFields.forEach(field => data[field] = Number(data[field]) || 0); data.images = { ...(editingProduct?.images || {}), ...tempImages }; data.dimensions = { ...boxDimensions }; data.useFrontForBack = useFrontForBack; data.updatedAt = serverTimestamp(); if (editingProduct?.id) { await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, editingProduct.id), data); await logAudit("PRODUCT_UPDATE", `Updated product: ${data.name}`); triggerCapy("Product updated successfully!"); } else { data.createdAt = serverTimestamp(); await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/products`), data); await logAudit("PRODUCT_ADD", `Added new product: ${data.name}`); triggerCapy("New product added!"); } setEditingProduct(null); setTempImages({}); setUseFrontForBack(false); } catch (err) { console.error(err); triggerCapy("Error saving product!"); } };
  const handleUpdateProduct = async (updatedProduct) => { setInventory(prev => prev.map(item => item.id === updatedProduct.id ? updatedProduct : item)); if (editingProduct && editingProduct.id === updatedProduct.id) { setEditingProduct(updatedProduct); } if(isAdmin && user && updatedProduct.id) { try { await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, updatedProduct.id), { dimensions: updatedProduct.dimensions }); } catch(e) {} } };
  const deleteProduct = async (id) => { if (window.confirm("Are you sure you want to delete this product?")) { try { await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, id)); await logAudit("PRODUCT_DELETE", `Deleted product ID: ${id}`); triggerCapy("Item removed."); } catch (err) { triggerCapy("Delete failed"); } } };
  const handleOpnameChange = (id, val) => { setOpnameData(prev => ({ ...prev, [id]: val })); };
  const handleOpnameSubmit = async () => { if (!user) return; const updates = []; inventory.forEach(item => { const actual = opnameData[item.id]; if (actual !== undefined && actual !== item.stock && !isNaN(actual)) { updates.push({ id: item.id, name: item.name, old: item.stock, new: actual }); } }); if (updates.length === 0) { triggerCapy("No changes to save!"); return; } if (!window.confirm(`Confirm stock adjustment for ${updates.length} items?`)) return; try { await runTransaction(db, async (transaction) => { updates.forEach(update => { const ref = doc(db, `artifacts/${appId}/users/${user.uid}/products`, update.id); transaction.update(ref, { stock: update.new }); }); }); updates.forEach(u => { logAudit("STOCK_OPNAME", `Adjusted ${u.name}: ${u.old} -> ${u.new}`); }); setOpnameData({}); triggerCapy("Stock Opname saved successfully!"); } catch (err) { console.error(err); alert("Failed to update stock: " + err.message); } };
  const addToCart = (product) => { setCart(prev => { const existing = prev.find(item => item.productId === product.id); if (existing) return prev.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item); return [...prev, { productId: product.id, name: product.name, qty: 1, unit: 'Bks', priceTier: 'Retail', calculatedPrice: product.priceRetail, product }]; }); };
  const updateCartItem = (productId, field, value) => { setCart(prev => prev.map(item => { if (item.productId === productId) { const newItem = { ...item, [field]: value }; const { unit, priceTier: tier, product: prod } = newItem; let base = 0; if (tier === 'Ecer') base = prod.priceEcer || 0; if (tier === 'Retail') base = prod.priceRetail || 0; if (tier === 'Grosir') base = prod.priceGrosir || 0; let mult = 1; if (unit === 'Slop') mult = prod.packsPerSlop || 10; if (unit === 'Bal') mult = (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10); if (unit === 'Karton') mult = (prod.balsPerCarton || 4) * (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10); newItem.calculatedPrice = base * mult; return newItem; } return item; })); };
  const removeFromCart = (pid) => setCart(p => p.filter(i => i.productId !== pid));

  const processTransaction = async (e) => { 
    e.preventDefault(); 
    if (!user) return; 
    
    const formData = new FormData(e.target); 
    const customerName = formData.get('customerName').trim(); 
    const paymentType = formData.get('paymentType'); 
    
    // Calculate Total Revenue locally first
    const totalRevenue = cart.reduce((acc, item) => acc + (item.calculatedPrice * item.qty), 0); 
    
    if(!customerName) { alert("Customer Name is required!"); return; } 

    try { 
        await runTransaction(db, async (firestoreTrans) => { 
            // --- PHASE 1: READ & CALCULATE ---
            const updatesToPerform = [];
            const transactionItems = []; // We will store detailed items here
            let totalProfit = 0; // Track total profit for this sale

            for (const item of cart) { 
                const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.productId); 
                const prodDoc = await firestoreTrans.get(prodRef); 
                
                if(!prodDoc.exists()) throw `Product ${item.name} not found`; 
                
                const prodData = prodDoc.data(); 
                
                // 1. Calculate Unit Multiplier
                let mult = 1; 
                if (item.unit === 'Slop') mult = prodData.packsPerSlop || 10; 
                if (item.unit === 'Bal') mult = (prodData.slopsPerBal || 20) * (prodData.packsPerSlop || 10); 
                if (item.unit === 'Karton') mult = (prodData.balsPerCarton || 4) * (prodData.slopsPerBal || 20) * (prodData.packsPerSlop || 10); 
                
                // 2. Check Stock
                const qtyToDeduct = item.qty * mult; 
                if(prodData.stock < qtyToDeduct) throw `Not enough stock for ${item.name}`; 
                
                // 3. CALCULATE PROFIT (Revenue - Distributor Price)
                const distributorPrice = prodData.priceDistributor || 0; // The Factory Price
                
                const totalCost = distributorPrice * qtyToDeduct; // How much you paid for these goods
                const totalRevenueItem = item.calculatedPrice * item.qty; // How much you sold them for
                const itemProfit = totalRevenueItem - totalCost; // Your Profit
                
                totalProfit += itemProfit;

                // Prepare Data for Update
                updatesToPerform.push({ ref: prodRef, newStock: prodData.stock - qtyToDeduct });
                
                // Save Snapshot of prices (So if prices change later, history stays accurate)
                transactionItems.push({
                    ...item,
                    distributorPriceSnapshot: distributorPrice,
                    profitSnapshot: itemProfit
                });
            } 

            // --- PHASE 2: WRITE ---
            
            // 1. Update Stock
            for (const update of updatesToPerform) {
                firestoreTrans.update(update.ref, { stock: update.newStock }); 
            }
            
            // 2. Save Transaction
            const transRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/transactions`)); 
            firestoreTrans.set(transRef, { 
                date: getCurrentDate(), 
                customerName, 
                paymentType, 
                items: transactionItems, 
                total: totalRevenue,
                totalProfit: totalProfit, // SAVING THE CALCULATED PROFIT
                type: 'SALE', 
                timestamp: serverTimestamp() 
            }); 
        }); 

        await logAudit("SALE", `Sold to ${customerName} via ${paymentType}`); 
        setCart([]); 
        triggerCapy("Sale Recorded! Profit Calculated. 💰"); 

    } catch(err) { 
        console.error(err);
        alert("Transaction Failed: " + err); 
    } 
  };
  const executeReturn = async (returnQtys) => { if (!returningTransaction || !user) return; const trans = returningTransaction; let totalRefundValue = 0; const itemsToReturn = []; trans.items.forEach(item => { const qty = returnQtys[item.productId] || 0; if (qty > 0) { totalRefundValue += (item.calculatedPrice * qty); itemsToReturn.push({ ...item, qty }); } }); if (itemsToReturn.length === 0) { setReturningTransaction(null); return; } handleConsignmentReturn(trans.customerName, itemsToReturn, totalRefundValue); setReturningTransaction(null); };

  const handleConsignmentPayment = async (customerName, itemsPaid, amountPaid) => { try { await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/transactions`), { date: getCurrentDate(), customerName, paymentType: "Cash", itemsPaid, amountPaid, type: 'CONSIGNMENT_PAYMENT', timestamp: serverTimestamp() }); await logAudit("CONSIGNMENT_PAYMENT", `Received ${formatRupiah(amountPaid)} from ${customerName}`); triggerCapy("Payment recorded!"); } catch (err) { console.error(err); } };
  const handleConsignmentReturn = async (customerName, itemsReturned, refundValue) => { try { await runTransaction(db, async (t) => { for(const item of itemsReturned) { const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.productId); const prodDoc = await t.get(prodRef); if(prodDoc.exists()) t.update(prodRef, { stock: prodDoc.data().stock + convertToBks(item.qty, item.unit, inventory.find(p=>p.id===item.productId)) }); } const returnRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/transactions`)); t.set(returnRef, { date: getCurrentDate(), customerName, items: itemsReturned, total: -refundValue, type: 'RETURN', timestamp: serverTimestamp() }); }); await logAudit("RETURN", `Return from ${customerName}`); triggerCapy("Return Processed!"); } catch(err) { console.error(err); } };
  const handleAddGoodsToCustomer = (name) => { alert(`Go to Sales POS and select 'Titip' payment for ${name}`); setActiveTab('sales'); };
  
  const handleSamplingSubmit = async (e) => { 
    e.preventDefault(); if (!user) return; const formData = new FormData(e.target); const productId = formData.get('productId'); const qty = parseInt(formData.get('qty')); const reason = formData.get('reason'); 
    if (!productId || isNaN(qty) || qty <= 0) { alert("Please select a valid product and quantity."); return; }
    try { await runTransaction(db, async (transaction) => { const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, productId); const prodDoc = await transaction.get(prodRef); if (!prodDoc.exists()) throw "Product doesn't exist!"; const currentStock = prodDoc.data().stock || 0; const newStock = currentStock - qty; if(newStock < 0) throw "Not enough stock!"; transaction.update(prodRef, { stock: newStock }); const newSampleRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/samplings`)); transaction.set(newSampleRef, { date: getCurrentDate(), productId, productName: inventory.find(i=>i.id===productId)?.name || 'Unknown', qty, reason, timestamp: serverTimestamp() }); }); await logAudit("SAMPLING_ADD", `Sampled ${qty} of item`); triggerCapy("Sample recorded. Stock updated."); e.target.reset(); } catch (err) { console.error(err); alert("Transaction failed: " + err); } 
  };
  
  const handleDeleteSampling = async (sample) => {
      if(!user) return;
      
      // SAFETY CHECK: Does product ID exist?
      if(!sample.productId) {
          if(!window.confirm("This record is corrupted (missing Product ID). Force delete it? Stock will NOT be returned.")) return;
          try {
              await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/samplings`, sample.id));
              triggerCapy("Corrupted record removed.");
          } catch(e) { alert(e.message); }
          return;
      }

      if(!window.confirm(`Delete sample record for ${sample.productName}? Stock will be RETURNED.`)) return;
      
      try {
          await runTransaction(db, async (transaction) => {
              // 1. Return stock to product
              const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, sample.productId);
              const prodDoc = await transaction.get(prodRef);
              if(prodDoc.exists()) {
                  transaction.update(prodRef, { stock: prodDoc.data().stock + sample.qty });
              }
              // 2. Delete sampling record
              const sampleRef = doc(db, `artifacts/${appId}/users/${user.uid}/samplings`, sample.id);
              transaction.delete(sampleRef);
          });
          logAudit("SAMPLING_DELETE", `Deleted sample for ${sample.productName}. Stock returned.`);
          triggerCapy("Sampling deleted and stock reverted!");
      } catch (err) {
          console.error(err);
          alert("Failed to delete sample: " + err.message);
      }
  };

  const handleUpdateSampling = async (e) => {
      e.preventDefault();
      if(!user || !editingSample) return;
      const formData = new FormData(e.target);
      const newQty = parseInt(formData.get('qty'));
      const newReason = formData.get('reason');
      const newDate = formData.get('date');

      if(isNaN(newQty) || newQty <= 0) return alert("Invalid Qty");

      try {
          await runTransaction(db, async (t) => {
              const sampleRef = doc(db, `artifacts/${appId}/users/${user.uid}/samplings`, editingSample.id);
              const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, editingSample.productId);
              
              // Get current product state
              const prodDoc = await t.get(prodRef);
              if(!prodDoc.exists()) throw "Product not found";
              
              // Calculate difference: If old was 10 and new is 5, we add 5 back to stock.
              // If old was 5 and new is 10, we remove 5 more.
              const qtyDiff = editingSample.qty - newQty; 
              const currentStock = prodDoc.data().stock;
              
              t.update(prodRef, { stock: currentStock + qtyDiff });
              t.update(sampleRef, { qty: newQty, reason: newReason, date: newDate });
          });
          setEditingSample(null);
          triggerCapy("Sample updated & Stock adjusted!");
      } catch(err) {
          alert(err.message);
      }
  };

  const handleBackupData = async () => {
    if(!user) return;
    const backupData = {
        meta: { date: new Date().toISOString(), user: user.email },
        inventory,
        transactions,
        customers,
        samplings,
        appSettings,
        auditLogs
    };
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpm_backup_${getCurrentDate()}.json`;
    a.click();
    triggerCapy("Data backup downloaded to your PC!");
  };

  const handleRestoreData = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    if(!window.confirm("WARNING: This will attempt to restore data from the file. Existing records with the same IDs will be overwritten. Continue?")) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if(!data.inventory || !data.transactions) throw new Error("Invalid backup file format");
            for(const item of data.inventory) { await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id), item); }
            if(data.customers) { for(const cust of data.customers) { await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, cust.id), cust); } }
            if(data.transactions) { for(const t of data.transactions) { await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, t.id), t); } }
            if(data.appSettings) { await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'general'), data.appSettings); }
            triggerCapy("Data restoration complete! Please refresh the page.");
        } catch (err) { alert("Failed to restore: " + err.message); console.error(err); }
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

  const renderSettings = () => {
      if (!user) return null; 
      return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 dark:text-white">Settings</h2>
            
            {/* BACKUP & RESTORE SECTION */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white"><DatabaseBackupIcon /> Data Management</h3>
                
                {/* Personal Backup */}
                <div className="flex gap-4 mb-6">
                    <button onClick={handleBackupData} className="flex-1 bg-indigo-50 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-slate-600 text-indigo-700 dark:text-indigo-300 py-4 rounded-xl border border-indigo-200 dark:border-slate-600 flex flex-col items-center justify-center gap-2 transition-all">
                        <Download size={24} />
                        <span className="font-bold text-sm">Full Backup</span>
                        <span className="text-[10px] opacity-70">Save Everything to PC</span>
                    </button>
                    <label className="flex-1 bg-emerald-50 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-slate-600 text-emerald-700 dark:text-emerald-300 py-4 rounded-xl border border-emerald-200 dark:border-slate-600 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer">
                        <UploadCloud size={24} />
                        <span className="font-bold text-sm">Restore Data</span>
                        <span className="text-[10px] opacity-70">Restore Everything from PC</span>
                        <input type="file" accept=".json" onChange={handleRestoreData} className="hidden" />
                    </label>
                </div>

                {/* Shared Config (New Feature) */}
                <div className="pt-6 border-t dark:border-slate-700">
                    <h4 className="font-bold text-xs text-slate-500 mb-3 uppercase tracking-wider">Team Sharing (Manual)</h4>
                    <div className="flex gap-4">
                        <button onClick={handleExportSharedConfig} className="flex-1 bg-orange-50 dark:bg-slate-700 hover:bg-orange-100 dark:hover:bg-slate-600 text-orange-700 dark:text-orange-300 py-4 rounded-xl border border-orange-200 dark:border-slate-600 flex flex-col items-center justify-center gap-2 transition-all">
                            <Globe size={24} />
                            <span className="font-bold text-sm">Share Config</span>
                            <span className="text-[10px] opacity-70">Export Catalog & Branding Only</span>
                        </button>
                        
                        <label className="flex-1 bg-blue-50 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-slate-600 text-blue-700 dark:text-blue-300 py-4 rounded-xl border border-blue-200 dark:border-slate-600 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer">
                            <Replace size={24} />
                            <span className="font-bold text-sm">Import Config</span>
                            <span className="text-[10px] opacity-70">Apply Shared Catalog & Branding</span>
                            <input type="file" accept=".json" onChange={handleImportSharedConfig} className="hidden" />
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white"><User size={20}/> User Profile</h3>
                <label className="block text-sm text-slate-500 mb-2">Google Account Email</label>
                <input type="email" placeholder="Sign in via Google..." className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={currentUserEmail || ""} disabled/>
                
                <div className={`mt-4 p-4 rounded-xl border flex justify-between items-center ${isAdmin ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                    <div>
                        <p className={`font-bold text-sm ${isAdmin ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            {isAdmin ? "Administrator Access" : "Standard User Access"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {isAdmin ? "You have full control." : "Limited access."}
                        </p>
                    </div>
                    {isAdmin ? (
                        <div className="flex gap-2">
                             <button onClick={handleChangePin} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors">
                                Change PIN
                             </button>
                             <button onClick={handleAdminLogout} className="px-4 py-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">
                                Lock Admin
                             </button>
                        </div>
                    ) : (
                         <button onClick={() => setShowAdminLogin(true)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors flex items-center gap-2">
                            <Key size={12}/> Unlock
                         </button>
                    )}
                         
                </div>
            </div>
            
            {/* Mascot Settings */}
            <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all duration-300 ${!isAdmin ? 'opacity-50 grayscale pointer-events-none select-none relative overflow-hidden' : ''}`}>
                {!isAdmin && <div className="absolute inset-0 z-10 bg-slate-50/10 dark:bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center"><div className="bg-slate-900/80 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2"><Lock size={12}/> Locked</div></div>}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white"><MessageSquare size={20}/> Mascot Dialogues</h3>
                </div>
                
                <div className="mb-4">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Add New Dialogue Line</label>
                    <div className="flex gap-2">
                        <input className="flex-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="Type a message..." value={newMascotMessage} onChange={(e) => setNewMascotMessage(e.target.value)}/>
                        <button onClick={handleAddMascotMessage} className="bg-emerald-500 text-white px-4 rounded font-bold flex items-center gap-2"><Plus size={16} /> Add</button>
                    </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeMessages.map((msg, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2 rounded border dark:border-slate-700">
                            <span className="text-sm dark:text-slate-300 italic">"{msg}"</span>
                            <button onClick={() => handleDeleteMascotMessage(msg)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>

            <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all duration-300 ${!isAdmin ? 'opacity-50 grayscale pointer-events-none select-none relative overflow-hidden' : ''}`}>
                 {!isAdmin && <div className="absolute inset-0 z-10 bg-slate-50/10 dark:bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center"><div className="bg-slate-900/80 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2"><Lock size={12}/> Locked</div></div>}
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg flex items-center gap-2 dark:text-white">Company Identity</h3></div><div className="flex gap-2"><input className="flex-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={editCompanyName || ""} onChange={handleEditCompNameChange}/><button onClick={handleSaveCompanyName} className="bg-orange-500 text-white px-4 rounded font-bold flex items-center gap-2"><Save size={16} /> Save Name</button></div></div>
            
            <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all duration-300 ${!isAdmin ? 'opacity-50 grayscale pointer-events-none select-none relative overflow-hidden' : ''}`}>
                {!isAdmin && <div className="absolute inset-0 z-10 bg-slate-50/10 dark:bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center"><div className="bg-slate-900/80 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2"><Lock size={12}/> Locked</div></div>}
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg flex items-center gap-2 dark:text-white"><ImageIcon size={20}/> Profile Picture</h3></div><div className="flex items-start gap-6"><div className="flex flex-col items-center"><img src={appSettings?.mascotImage || "/capybara.jpg"} className="w-32 h-32 rounded-full border-4 border-orange-500 object-cover bg-slate-100" onError={(e) => {e.target.onerror = null; e.target.src="https://api.dicebear.com/7.x/avataaars/svg?seed=Capy"}}/><span className="text-xs text-slate-400 mt-2">Current</span></div><div className="flex-1"><label className="bg-orange-100 dark:bg-slate-700 text-orange-600 dark:text-orange-300 px-4 py-2 rounded-lg cursor-pointer hover:bg-orange-200 transition-colors inline-flex items-center gap-2 font-medium"><Upload size={16} /> Select & Crop<input type="file" accept="image/*" onChange={handleMascotSelect} className="hidden" /></label></div></div></div>
        </div>
      );
  }

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {examiningProduct && <ExamineModal product={examiningProduct} onClose={() => setExaminingProduct(null)} onUpdateProduct={handleUpdateProduct} isAdmin={isAdmin} />}
      {cropImageSrc && <ImageCropper imageSrc={cropImageSrc} onCancel={() => { setCropImageSrc(null); setActiveCropContext(null); }} onCrop={handleCropConfirm} dimensions={boxDimensions} onDimensionsChange={setBoxDimensions} face={activeCropContext?.face || 'front'} />}
      {returningTransaction && <ReturnModal transaction={returningTransaction} onClose={() => setReturningTransaction(null)} onConfirm={executeReturn} />}


      {/* --- NEW: SECURE ADMIN LOGIN MODAL --- */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-700">
            
            <div className="flex justify-center mb-6">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-4 rounded-full text-orange-600 dark:text-orange-400">
                    {isSetupMode || !hasAdminPin ? <ShieldCheck size={48}/> : showRecoveryInput ? <ShieldAlert size={48}/> : <Lock size={48} />}
                </div>
            </div>

            <h2 className="text-2xl font-bold text-center mb-2 dark:text-white">
                {isSetupMode || !hasAdminPin ? "Setup Security" : showRecoveryInput ? "Recover Account" : "Admin Access"}
            </h2>
            <p className="text-center text-slate-500 text-sm mb-6">
                {isSetupMode || !hasAdminPin 
                    ? "Set your PIN and Secret Word." 
                    : showRecoveryInput 
                        ? "Enter Secret Word to reset PIN."
                        : "Enter PIN to unlock."}
            </p>

            {/* PIN INPUT */}
            {!showRecoveryInput && (
                <input 
                    type="password" 
                    inputMode="numeric"
                    placeholder={isSetupMode || !hasAdminPin ? "Create PIN" : "Enter PIN"} 
                    className="w-full text-center text-2xl tracking-widest p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 dark:text-white font-mono mb-4 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value)}
                    autoFocus={!showRecoveryInput}
                />
            )}

            {/* SECRET WORD INPUT (CLEAN - NO EXAMPLES) */}
            {(isSetupMode || !hasAdminPin || showRecoveryInput) && (
                <div className="mb-6 animate-fade-in">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                        {showRecoveryInput ? "Secret Word" : "Set Secret Word"}
                    </label>
                    <input 
                        type="text" 
                        placeholder={showRecoveryInput ? "Enter Secret Word" : "Create Secret Word"} 
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                        value={inputRecovery}
                        onChange={(e) => setInputRecovery(e.target.value)}
                    />
                </div>
            )}

            {/* MAIN ACTION BUTTON */}
            <button 
                onClick={
                    showRecoveryInput ? handleVerifyRecovery : 
                    (isSetupMode || !hasAdminPin) ? handleSetNewPin : 
                    handlePinLogin
                }
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 mb-4"
            >
                {showRecoveryInput ? "Verify & Reset" : (isSetupMode || !hasAdminPin) ? "Save Settings" : "Unlock"}
            </button>

            {/* FORGOT PIN LINK */}
            {!isSetupMode && hasAdminPin && !showRecoveryInput && (
                <button 
                    onClick={handleForgotPin}
                    className="w-full text-slate-400 hover:text-orange-500 text-xs font-bold uppercase tracking-wider mb-4"
                >
                    Forgot PIN?
                </button>
            )}

            {/* CANCEL BUTTON */}
            <button 
                onClick={() => { 
                    setShowAdminLogin(false); 
                    setShowRecoveryInput(false);
                    setIsSetupMode(false);
                    setInputPin(""); 
                    setInputRecovery("");
                }}
                className="w-full py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
                Cancel
            </button>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <nav className={`fixed left-0 top-0 h-screen bg-slate-900 text-slate-300 border-r border-slate-800 z-40 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} shadow-xl`}>
        <div className="flex-none p-4 flex items-center justify-between border-b border-slate-800 h-16">
           {!isSidebarCollapsed && (
               <div className="flex items-center gap-2 overflow-hidden">
                 <img src={appSettings?.mascotImage || "/capybara.jpg"} className="w-8 h-8 rounded-full border border-orange-500 object-cover" onError={(e) => {e.target.onerror = null; e.target.src="https://api.dicebear.com/7.x/avataaars/svg?seed=Capy"}}/>
                 <h1 className="font-bold text-sm text-white truncate">{appSettings?.companyName || 'KPM'}</h1>
               </div>
           )}
           <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1 hover:bg-slate-700 rounded text-slate-400">
               {isSidebarCollapsed ? <Menu size={20}/> : <ChevronLeft size={20}/>}
           </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
            {[
                { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' }, 
                { id: 'inventory', icon: Package, label: 'Inventory' }, 
                { id: 'sales', icon: ShoppingCart, label: 'Sales POS' }, 
                { id: 'consignment', icon: Truck, label: 'Titip (Consign)' },
                { id: 'stock_opname', icon: ClipboardCheck, label: 'Stock Opname' },
                { id: 'customers', icon: Store, label: 'Customers' },
                { id: 'sampling', icon: ClipboardList, label: 'Sampling' },
                { id: 'transactions', icon: FileText, label: 'Reports' }, 
                { id: 'audit', icon: History, label: 'Audit Logs' },
                { id: 'settings', icon: Settings, label: 'Settings' }
          ]
          // NEW: HIDE REPORTS/AUDIT/STOCK OPNAME IF NOT ADMIN
          .filter(item => isAdmin ? true : !['transactions', 'audit', 'stock_opname'].includes(item.id))
          .map(item => (
              <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id)} 
                className={`w-full flex items-center p-3 transition-colors relative group ${activeTab === item.id ? 'bg-orange-600 text-white' : 'hover:bg-slate-800 hover:text-white'} ${isSidebarCollapsed ? 'justify-center' : 'px-4'}`}
                title={isSidebarCollapsed ? item.label : ''}
              >
                <item.icon size={20} className="flex-shrink-0" />
                {!isSidebarCollapsed && <span className="ml-3 text-sm font-medium truncate">{item.label}</span>}
                {isSidebarCollapsed && <span className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">{item.label}</span>}
              </button>
            ))}
        </div>
        
        {/* SIDEBAR FOOTER: LOGOUT */}
        {user && (
            <div className="p-4 border-t border-slate-800">
                <button onClick={() => signOut(auth)} className={`flex items-center text-red-500 hover:text-red-400 ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} w-full transition-colors`}>
                    <LogOut size={20} />
                    {!isSidebarCollapsed && <span className="text-sm font-bold">Sign Out</span>}
                </button>
            </div>
        )}
      </nav>

      {/* MAIN CONTENT AREA - FIXED MARGINS */}
      <main className={`flex-1 ${mainContentClass} p-6 md:p-8 transition-all duration-300 min-h-screen bg-slate-50 dark:bg-slate-900 overflow-x-hidden`}>
        {/* MOBILE HEADER */}
        <div className="md:hidden flex justify-between items-center p-4 bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-30 ml-[-5rem] sm:ml-0"> 
          <div className="flex items-center gap-2 pl-20 md:pl-0"><img src={appSettings?.mascotImage || "/capybara.jpg"} className="w-8 h-8 rounded-full border border-orange-500 object-cover" onError={(e) => {e.target.onerror = null; e.target.src="https://api.dicebear.com/7.x/avataaars/svg?seed=Capy"}}/><h1 className="font-bold text-sm">{appSettings?.companyName || 'KPM Inventory'}</h1></div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full">{darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* HEADER AREA WITH SIGN IN BUTTON */}
          <div className="flex justify-between items-center mb-8">
             <h1 className="text-2xl font-bold capitalize">{activeTab.replace('_', ' ')}</h1>
             <div className="flex items-center gap-3">
               {!user ? (
                   <button onClick={() => signInWithPopup(auth, googleProvider)} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all dark:text-white">
                       <LogIn size={18} className="text-blue-500" />
                       Sign In with Google
                   </button>
               ) : (
                   <div className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                       <span className="text-xs font-medium dark:text-slate-300 truncate max-w-[150px]">{user.email}</span>
                   </div>
               )}
               <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                   {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
               </button>
             </div>
          </div>

          {!user ? (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                  <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-3xl max-w-lg shadow-xl border border-slate-200 dark:border-slate-700">
                      <Lock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold dark:text-white mb-2">Welcome to KPM Inventory</h2>
                      <p className="text-slate-500 mb-6">Please sign in using the button in the top right to access your inventory, sales, and analytics.</p>
                      <div className="text-xs text-slate-400 bg-slate-200 dark:bg-slate-900 p-3 rounded-lg">
                          Secure Cloud Sync • Real-time Updates • Admin Controls
                      </div>
                  </div>
              </div>
          ) : (
              <>
                {/* DASHBOARD */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 animate-fade-in">

                    {/* DASHBOARD CARDS ROW (SECURE MODE) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. Inventory Value */}
                        <div className="bg-gradient-to-br from-slate-600 to-slate-800 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                            <p className="text-slate-300 text-sm font-medium uppercase tracking-wider">Inventory Assets</p>
                            <div className="flex items-center gap-2 mt-1">
                                <h3 className="text-2xl font-bold">
                                    {isAdmin ? formatRupiah(totalStockValue) : "Rp •••••••"}
                                </h3>
                                {!isAdmin && <Lock size={16} className="opacity-50" />}
                            </div>
                        </div>

                        {/* 2. Revenue */}
                        <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                            <p className="text-orange-100 text-sm font-medium uppercase tracking-wider">Total Revenue</p>
                            <div className="flex items-center gap-2 mt-1">
                                <h3 className="text-2xl font-bold">
                                    {isAdmin ? formatRupiah(
                                    transactions
                                        .filter(t => t.type === 'SALE' || t.type === 'RETURN')
                                        .reduce((acc, t) => acc + (t.total || 0), 0)
                                    ) : "Rp •••••••"}
                                </h3>
                                {!isAdmin && <Lock size={16} className="opacity-50" />}
                            </div>
                        </div>

                        {/* 3. NET PROFIT */}
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                            <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Net Profit (Cuan)</p>
                            <div className="flex items-center gap-2 mt-1">
                                <h3 className="text-2xl font-bold">
                                    {isAdmin ? formatRupiah(transactions.filter(t => t.type === 'SALE').reduce((acc, t) => acc + (t.totalProfit || 0), 0)) : "Rp •••••••"}
                                </h3>
                                {!isAdmin && <Lock size={16} className="opacity-50" />}
                            </div>
                            <p className="text-[10px] opacity-70 mt-1">Revenue - Distributor Price</p>
                        </div>
                    </div>

                    {/* DAILY PERFORMANCE CHART (SECURE MODE) */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700 shadow-sm relative overflow-hidden">
                        <h3 className="font-semibold mb-4 dark:text-white">Daily Performance (Stacked by Customer)</h3>
                        
                        {/* PRIVACY SHIELD */}
                        {!isAdmin && (
                            <div className="absolute inset-0 z-10 bg-slate-100/50 dark:bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-slate-500">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-lg mb-2">
                                    <Lock size={32} className="text-orange-500"/>
                                </div>
                                <p className="font-bold text-sm uppercase tracking-widest">Analytics Locked</p>
                                <button onClick={() => setShowAdminLogin(true)} className="mt-4 text-xs font-bold text-blue-500 hover:underline">Tap to Unlock</button>
                            </div>
                        )}

                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.data}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1}/>
                                    <XAxis dataKey="date" fontSize={12} stroke="#94a3b8"/>
                                    <YAxis fontSize={12} stroke="#94a3b8"/>
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}}/>
                                    <Legend />
                                    {chartData.keys.map((key, index) => (
                                        <Bar 
                                            key={key} 
                                            dataKey={key} 
                                            stackId="a" 
                                            fill={getRandomColor(key)} 
                                            radius={index === chartData.keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    </div>
                )}

                {/* INVENTORY */}
                {activeTab === 'inventory' && (
                    <div className="space-y-6 animate-fade-in">
                    <div className="flex gap-4">
                        <input type="text" placeholder="Search products..." className="flex-1 bg-white dark:bg-slate-800 p-2.5 rounded-xl border dark:border-slate-700 dark:text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        
                        {/* EXPORT BUTTON DELETED HERE */}
                        
                        {/* ONLY SHOW ADD BUTTON IF ADMIN */}
                        {isAdmin && (
                            <button onClick={() => { setEditingProduct({}); setTempImages({}); setBoxDimensions({w:55, h:90, d:22}); setUseFrontForBack(false); }} className="bg-orange-500 text-white px-4 rounded-xl flex items-center gap-2"><Plus size={20}/> Add New</button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredInventory.map(item => (
                        <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700 shadow-sm p-4">
                            <div className="flex gap-3 mb-4">
                                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden shrink-0">
                                {(item.images?.front || item.image) ? <img src={item.images?.front || item.image} className="w-full h-full object-cover"/> : <Package className="w-full h-full p-4 text-slate-400"/>}
                                </div>
                                <div>
                                <h3 className="font-bold leading-tight dark:text-white">{item.name}</h3>
                                <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full dark:text-slate-300">{item.type}</span>
                                <p className="text-emerald-500 font-bold mt-1">{isAdmin ? item.stock : "****"} Bks</p>
                                </div>
                            </div>
                            
                            {/* LOCKED: BUTTONS HIDDEN FOR NON-ADMIN */}
                            <div className="flex gap-2">
                                <button onClick={() => setExaminingProduct(item)} className={`bg-slate-100 dark:bg-slate-700 py-2 rounded-lg text-sm font-medium dark:text-white ${isAdmin ? 'flex-1' : 'w-full'}`}>Examine</button>
                                
                                {isAdmin && (
                                    <>
                                        <button onClick={() => { setEditingProduct(item); setTempImages(item.images || {}); setBoxDimensions(item.dimensions || {w:55, h:90, d:22}); setUseFrontForBack(item.useFrontForBack || false); }} className="p-2 text-slate-400 hover:text-orange-500"><Settings size={18}/></button>
                                        <button onClick={() => deleteProduct(item.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
                                    </>
                                )}
                            </div>
                        </div>
                        ))}
                    </div>
                    {editingProduct && (
                        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
                            {!isAdmin && (
                                <div className="mb-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg flex items-center gap-3">
                                    <Lock className="text-blue-500" />
                                    <div><h4 className="font-bold text-sm text-blue-600 dark:text-blue-400">View Only Mode</h4><p className="text-xs text-slate-500">Only Admin can edit product details, images, and dimensions.</p></div>
                                </div>
                            )}
                            <form onSubmit={handleSaveProduct}>
                            <div className="flex justify-between mb-4"><h2 className="text-xl font-bold dark:text-white">Product Details</h2><button type="button" onClick={() => setEditingProduct(null)}><X className="dark:text-white"/></button></div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <input name="name" defaultValue={editingProduct.name} required placeholder="Merk Rokok" className={`w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white ${!isAdmin ? 'opacity-70 pointer-events-none' : ''}`} readOnly={!isAdmin}/>
                                    
                                    {isAdmin && (
                                        <>
                                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-700 flex items-center justify-between"><div className="text-xs"><span className="font-bold text-orange-500 block">DIMENSIONS</span><span className="text-slate-400">{boxDimensions.w}mm x {boxDimensions.h}mm x {boxDimensions.d}mm</span></div><div className="text-[10px] text-slate-400 italic">Edit via "EDIT" on images below</div></div>
                                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-orange-500 block">3D TEXTURES</span>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={useFrontForBack} onChange={(e) => setUseFrontForBack(e.target.checked)} className="w-3 h-3 accent-orange-500" />
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-300 font-bold uppercase">Front = Back</span>
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                {['front', 'back', 'left', 'right', 'top', 'bottom'].map(face => {
                                                    const imgSource = tempImages[face] || (editingProduct.images ? editingProduct.images[face] : null);
                                                    const isBackDisabled = face === 'back' && useFrontForBack;
                                                    
                                                    if (isBackDisabled) {
                                                        return (
                                                            <div key={face} className="bg-slate-50 dark:bg-slate-800 rounded h-16 border dark:border-slate-700 flex flex-col items-center justify-center opacity-50">
                                                                <span className="text-[10px] uppercase text-slate-400 font-bold">{face}</span>
                                                                <span className="text-[8px] text-slate-400">(Linked to Front)</span>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div key={face} className="relative group bg-slate-100 dark:bg-slate-700 rounded h-16 border dark:border-slate-600 overflow-hidden">
                                                            {/* Display Area - Click to Edit or Upload */}
                                                            <div 
                                                                className="w-full h-full cursor-pointer" 
                                                                onClick={() => { if(imgSource) handleEditExisting(face, imgSource); else document.getElementById(`file-${face}`).click(); }}
                                                            >
                                                                {imgSource ? (
                                                                    <img src={imgSource} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-[10px] uppercase text-slate-400 hover:text-orange-500 transition-colors">
                                                                        <Upload size={12} className="mr-1"/> {face}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Hidden File Input */}
                                                            <input 
                                                                id={`file-${face}`} 
                                                                type="file" 
                                                                accept="image/*" 
                                                                onChange={(e) => handleProductFaceUpload(e, face)} 
                                                                className="hidden" 
                                                            />

                                                            {/* Hover Overlay Actions */}
                                                            {imgSource && (
                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); handleEditExisting(face, imgSource); }}
                                                                        className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white"
                                                                        title="Edit/Crop Existing"
                                                                    >
                                                                        <Crop size={12}/>
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); document.getElementById(`file-${face}`).click(); }}
                                                                        className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white"
                                                                        title="Replace File"
                                                                    >
                                                                        <Replace size={12}/>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        </>
                                    )}
                                    <textarea name="description" defaultValue={editingProduct.description} placeholder="Lore" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white h-20 text-sm"/>
                                </div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2"><select name="type" defaultValue={editingProduct.type} className={`p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white ${!isAdmin ? 'opacity-70 pointer-events-none' : ''}`} disabled={!isAdmin}><option>SKM</option><option>SKT</option><option>SPM</option></select><input name="taxStamp" defaultValue={editingProduct.taxStamp} placeholder="Cukai Year" className={`p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white ${!isAdmin ? 'opacity-70 pointer-events-none' : ''}`} readOnly={!isAdmin}/></div>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700">

                                    {/* NEW: DISTRIBUTOR PRICE (FACTORY COST) */}
                                    <div className="mb-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                                        <label className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-300">Distributor Price (Factory Modal)</label>
                                        <input 
                                            name="priceDistributor" 
                                            type="number" 
                                            placeholder="Rp 0" 
                                            defaultValue={editingProduct.priceDistributor} 
                                            className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white font-mono text-blue-600"
                                            readOnly={!isAdmin}
                                        />
                                    </div>

                                    {/* NEW: MINIMUM STOCK ALERT LEVEL */}
                                    <div className="mb-2">
                                        <label className="text-[10px] uppercase font-bold text-orange-500">Alert Me If Stock Below:</label>
                                        <input 
                                            name="minStock" 
                                            type="number" 
                                            placeholder="e.g. 10" 
                                            defaultValue={editingProduct.minStock} 
                                            className="w-full p-1 border border-orange-200 bg-orange-50 rounded dark:bg-slate-800 dark:border-orange-900 dark:text-white"
                                            readOnly={!isAdmin}
                                        />
                                    </div>

                                    <p className="text-xs font-bold text-orange-500 mb-2">PRICES (PER BKS)</p>

                                    {/* NEW: BUY PRICE (MODAL) */}
                                    <input name="priceEcer" type="number" placeholder="Ecer" defaultValue={editingProduct.priceEcer} className="w-full mb-2 p-1 border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" readOnly={!isAdmin}/>

                                    <input name="priceRetail" type="number" placeholder="Retail" defaultValue={editingProduct.priceRetail} className="w-full mb-2 p-1 border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" readOnly={!isAdmin}/>

                                    <input name="priceGrosir" type="number" placeholder="Grosir" defaultValue={editingProduct.priceGrosir} className="w-full mb-2 p-1 border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" readOnly={!isAdmin}/>

                                    <input name="stock" type="number" placeholder="Stock Qty" defaultValue={editingProduct.stock} className="w-full p-1 border border-emerald-500 rounded dark:bg-slate-800 dark:text-white" readOnly={!isAdmin}/>
                                    </div>
                                </div>
                            </div>
                            {isAdmin && <button className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold mt-6">SAVE PRODUCT</button>}
                            </form>
                        </div>
                        </div>
                    )}
                    </div>
                )}



                {/* STOCK OPNAME */}
                {activeTab === 'stock_opname' && (
                    <div className="space-y-6 animate-fade-in">
                    <h2 className="text-2xl font-bold dark:text-white">Stock Opname (Physical Count)</h2>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 overflow-hidden">
                        <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b dark:border-slate-700">
                            <tr>
                            <th className="p-4">Product</th>
                            <th className="p-4 text-center">System Stock</th>
                            <th className="p-4 text-center">Physical Stock</th>
                            <th className="p-4 text-center">Variance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {inventory.map(item => {
                            const actual = opnameData[item.id] !== undefined ? opnameData[item.id] : item.stock;
                            const diff = actual - item.stock;
                            return (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="p-4 font-medium dark:text-white">{item.name}</td>
                                <td className="p-4 text-center dark:text-slate-300">{item.stock}</td>
                                <td className="p-4 text-center">
                                    <input 
                                    type="number" 
                                    min="0"
                                    value={actual}
                                    onChange={(e) => handleOpnameChange(item.id, parseInt(e.target.value))}
                                    className={`w-20 p-2 text-center border rounded ${diff !== 0 ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'dark:bg-slate-800 dark:border-slate-600'} dark:text-white`}
                                    />
                                </td>
                                <td className={`p-4 text-center font-bold ${diff < 0 ? 'text-red-500' : diff > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>
                                    {diff > 0 ? `+${diff}` : diff}
                                </td>
                                </tr>
                            );
                            })}
                        </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={handleOpnameSubmit} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                        <Save size={20} /> Save Adjustments
                        </button>
                    </div>
                    </div>
                )}

                {/* SAMPLING */}
                {activeTab === 'sampling' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* EDIT MODAL FOR SAMPLING */}
                        {editingSample && (
                            <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                                    <h3 className="font-bold text-lg mb-4 dark:text-white">Edit Sample Record</h3>
                                    <form onSubmit={handleUpdateSampling} className="space-y-4">
                                        <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded text-xs text-blue-600 dark:text-blue-300 mb-2">
                                            <strong>Note:</strong> Changing quantity will automatically adjust product stock.
                                        </div>
                                        <div><label className="text-xs font-bold text-slate-500">Date</label><input name="date" type="date" defaultValue={editingSample.date} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"/></div>
                                        <div><label className="text-xs font-bold text-slate-500">Product</label><input disabled value={editingSample.productName} className="w-full p-2 border rounded bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"/></div>
                                        <div><label className="text-xs font-bold text-slate-500">Quantity (Bks)</label><input name="qty" type="number" defaultValue={editingSample.qty} min="1" className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"/></div>
                                        <div><label className="text-xs font-bold text-slate-500">Reason / Location</label><input name="reason" defaultValue={editingSample.reason} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"/></div>
                                        
                                        <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setEditingSample(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg font-bold">Cancel</button><button className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-bold">Update</button></div>
                                    </form>
                                </div>
                            </div>
                        )}

                        <h2 className="text-2xl font-bold dark:text-white">Product Sampling Record</h2>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700">
                            <form onSubmit={handleSamplingSubmit} className="flex flex-col md:flex-row gap-4">
                            <select name="productId" required className="flex-1 p-3 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white">
                                <option value="">Select Product...</option>
                                {inventory.map(i => <option key={i.id} value={i.id}>{i.name} {isAdmin ? `(Stock: ${i.stock})` : ""}</option>)}
                            </select>
                            <input type="number" name="qty" required placeholder="Qty (Bks)" min="1" className="w-32 p-3 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white"/>
                            <input type="text" name="reason" placeholder="Location / Recipient" className="flex-1 p-3 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white"/>
                            <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded font-bold">Record Sample</button>
                            </form>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700">
                            <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b dark:border-slate-700">
                                <tr><th className="p-4">Date</th><th className="p-4">Product</th><th className="p-4">Qty</th><th className="p-4">Notes</th><th className="p-4 text-right">Actions</th></tr>
                            </thead>
                            <tbody>
                                {samplings.length === 0 ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-slate-500">No sampling records found.</td></tr>
                                ) : (
                                    samplings.map(s => (
                                    <tr key={s.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4 dark:text-slate-300">{s.date}</td>
                                        <td className="p-4 font-bold dark:text-white">{s.productName}</td>
                                        <td className="p-4 text-red-500 font-bold">-{s.qty}</td>
                                        <td className="p-4 text-slate-500">{s.reason}</td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <button onClick={() => setEditingSample(s)} className="p-2 text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors" title="Edit Record"><Pencil size={16}/></button>
                                            <button onClick={() => handleDeleteSampling(s)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Delete & Return Stock"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                    ))
                                )}
                            </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* OTHER TABS */}
                {activeTab === 'consignment' && <ConsignmentView transactions={transactions} inventory={inventory} onAddGoods={handleAddGoodsToCustomer} onPayment={handleConsignmentPayment} onReturn={handleConsignmentReturn} onDeleteConsignment={handleDeleteConsignmentData} isAdmin={isAdmin} />}
{/* ... Consignment line is usually here ... */}

{/* PASTE THIS MISSING LINE HERE: */}
{activeTab === 'customers' && <CustomerManagement customers={customers} db={db} appId={appId} user={user} logAudit={logAudit} triggerCapy={triggerCapy} isAdmin={isAdmin} />}
                {activeTab === 'sales' && (
                    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] animate-fade-in">
                        <div className="lg:w-2/3 flex flex-col"><input className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border dark:border-slate-700 dark:text-white mb-4" placeholder="Search item..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/><div className="flex-1 overflow-y-auto bg-slate-900 rounded-2xl shadow-inner border border-slate-700 p-6 relative"><div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 159px, #475569 160px)'}}></div><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">{filteredInventory.map(item => (<div key={item.id} onClick={() => addToCart(item)} className="group relative flex flex-col items-center cursor-pointer perspective-1000"><div className="absolute bottom-0 w-32 h-4 bg-black/40 rounded-[100%] blur-md group-hover:bg-black/60 transition-colors"></div><div className="relative z-10 w-24 h-32 transform transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-105" style={{ transformStyle: 'preserve-3d' }}>{(item.images?.front || item.image) ? (<img src={item.images?.front || item.image} className="w-full h-full object-cover drop-shadow-2xl rounded-sm" style={{filter: 'contrast(1.1)'}}/>) : (<div className="w-full h-full bg-slate-700 flex items-center justify-center border border-slate-600 rounded-sm shadow-xl"><Package className="text-slate-500"/></div>)}<div className="absolute -top-2 -right-4 bg-yellow-100 text-yellow-900 text-[10px] font-bold px-2 py-1 shadow-md border border-yellow-200 transform rotate-12 z-20 rounded-sm flex items-center gap-1"><Tag size={8} className="fill-yellow-900"/> {formatRupiah(item.priceRetail)}</div></div><div className="mt-4 text-center z-10"><h4 className="font-bold text-xs text-slate-300 leading-tight w-24 truncate">{item.name}</h4><p className="text-[9px] text-slate-500 dark:text-slate-400 w-24 truncate mt-0.5 h-3">{item.description || ""}</p><div className={`text-[10px] font-mono mt-1 px-2 py-0.5 rounded-full inline-block ${item.stock < 10 ? 'bg-red-900/50 text-red-400 border border-red-800' : 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'}`}>{isAdmin ? item.stock : "**"} Left</div></div></div>))}</div></div></div>
                        <div className="lg:w-1/3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex flex-col border dark:border-slate-700"><div className="p-4 border-b dark:border-slate-700 font-bold dark:text-white flex items-center gap-2"><ShoppingCart size={20}/> Current Cart</div><div className="flex-1 overflow-y-auto p-4 space-y-4">

{cart.map(item => (
  <div key={item.productId} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700">
      <div className="flex justify-between font-bold text-sm dark:text-white">
          <span>{item.name}</span> 
          <button onClick={() => removeFromCart(item.productId)} className="text-red-400">x</button>
      </div>
      <div className="grid grid-cols-3 gap-1 mt-2">
          {/* UNLOCKED INPUTS (No 'disabled' attribute) */}
          <input 
            type="number" 
            value={item.qty} 
            onChange={e=>updateCartItem(item.productId, 'qty', e.target.value)} 
            className="p-1 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 text-xs dark:text-white text-center"
          />
          <select 
            value={item.unit} 
            onChange={e=>updateCartItem(item.productId, 'unit', e.target.value)} 
            className="p-1 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 text-xs dark:text-white"
          >
            <option>Bks</option><option>Slop</option><option>Bal</option><option>Karton</option>
          </select>
          <select 
            value={item.priceTier} 
            onChange={e=>updateCartItem(item.productId, 'priceTier', e.target.value)} 
            className="p-1 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 text-xs dark:text-white"
          >
            <option>Ecer</option><option>Retail</option><option>Grosir</option>
          </select>
      </div>
      <div className="text-right font-bold text-emerald-600 mt-1">{formatRupiah(item.calculatedPrice * item.qty)}</div>
  </div>
))}

<div className="p-4 border-t dark:border-slate-700"><form onSubmit={processTransaction}><div className="mb-3 relative"><input name="customerName" required list="customersList" placeholder="Customer Name" className="w-full p-2 bg-transparent border-b dark:border-slate-700 dark:text-white text-sm" autoComplete="off"/><datalist id="customersList">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist></div>

<select name="paymentType" className="w-full mb-3 p-2 rounded bg-slate-100 dark:bg-slate-700 dark:text-white text-sm">
    <option value="Cash">Cash</option>
    <option value="QRIS">QRIS</option>
    <option value="Transfer">Transfer (BCA/Mandiri)</option>
    <option value="Titip">Titip (Consignment)</option>
</select>

<button disabled={cart.length===0} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold">CHARGE {formatRupiah(cart.reduce((a,i)=>a+(i.calculatedPrice*i.qty),0))}</button></form></div></div>
                    </div>
                </div>
         
                 )}
                {/* UPDATED: Pass handleDeleteHistory for Folder Delete, and handleDeleteSingleTransaction for Single Rows */}
                {activeTab === 'transactions' && <HistoryReportView transactions={transactions} inventory={inventory} onDeleteFolder={handleDeleteHistory} onDeleteTransaction={handleDeleteSingleTransaction} isAdmin={isAdmin} user={user} appId={appId} />}
                {activeTab === 'audit' && (
                    <div className="space-y-6 animate-fade-in"><h2 className="text-2xl font-bold dark:text-white">System Audit Logs</h2><div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700"><table className="w-full text-sm text-left"><thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b dark:border-slate-700"><tr><th className="p-4">Action</th><th className="p-4">Details</th><th className="p-4 text-right">Time</th></tr></thead><tbody>{auditLogs.map(log => (<tr key={log.id} className="border-b dark:border-slate-700"><td className="p-4 font-bold text-orange-500">{log.action}</td><td className="p-4 dark:text-slate-300">{log.details}</td><td className="p-4 text-right text-slate-400 text-xs">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Just now'}</td></tr>))}</tbody></table></div></div>
                )}

                {/* SETTINGS TAB - FIXED & CRASH PROOF */}
                {activeTab === 'settings' && renderSettings()}
              </>
          )}
        </div>
      </main>

      <CapybaraMascot message={showCapyMsg ? capyMsg : null} onClick={() => cycleMascotMessage()} customImage={appSettings?.mascotImage} />
    </div>
  );
}
