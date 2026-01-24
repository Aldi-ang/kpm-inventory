import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, FileText, 
  Settings, Sun, Moon, Search, Plus, Trash2, 
  Save, X, Upload, RotateCcw, Camera, Download,
  TrendingUp, AlertCircle, ChevronRight, ChevronLeft, DollarSign, Image as ImageIcon,
  User, Lock, ClipboardList, Crop, RotateCw, Move, Maximize2, ArrowRight, RefreshCcw, MessageSquarePlus, MinusCircle, ZoomIn, ZoomOut, Unlock,
  History, ShieldCheck, Copy, Replace, ClipboardCheck, Store, Wallet, Truck, Menu, MapPin, Phone, Edit, Folder,
  Key, MessageSquare, LogIn, LogOut, ShieldAlert, FileJson, UploadCloud, Tag, Calendar, XCircle, Printer, FileSpreadsheet, Pencil, Globe, Music
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import * as XLSX from 'xlsx';

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
  getDoc, // <--- THIS WAS MISSING!
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

// ... imports ...

const app = initializeApp(firebaseConfig);
let analytics;
try { analytics = getAnalytics(app); } catch (e) { console.warn("Analytics blocked"); }
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- MISSING LINE: ADD THIS BACK ---
const appId = "cello-inventory-manager"; 
// ----------------------------------

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
    const canvas = document.createElement('canvas'); 
    const BASE_RES = 600; 
    const ratio = cropBox.w / cropBox.h;
    
    if (ratio > 1) { canvas.width = BASE_RES; canvas.height = BASE_RES / ratio; } 
    else { canvas.height = BASE_RES; canvas.width = BASE_RES * ratio; }
    
    const ctx = canvas.getContext('2d'); 
    
    // --- CHANGE 1: CLEAR RECT INSTEAD OF FILL WHITE (FOR TRANSPARENCY) ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const img = imageRef.current; 
    ctx.translate(canvas.width / 2, canvas.height / 2); 
    ctx.rotate((rotation * Math.PI) / 180);
    
    const scaleFactor = canvas.width / cropBox.w; 
    ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor); 
    ctx.scale(zoom * scaleFactor, zoom * scaleFactor);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    
    // --- CHANGE 2: EXPORT AS PNG (PRESERVES TRANSPARENCY) ---
    onCrop(canvas.toDataURL('image/png', 1.0));
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

// --- NEW: CAPYBARA MASCOT V5 (SEQUENTIAL DIALOGUE & SELF-CONTAINED DEFAULTS) ---
const CapybaraMascot = ({ isDiscoMode, message, messages = [], onClick, staticImageSrc }) => {
    // ASSETS
    const DISCO_VIDEO_URL = "/Bit_Capybara_Fortnite_Dance_Video.mp4"; 
    const DISCO_MUSIC_URL = "/disco_music.mp3"; 
    const NORMAL_IMAGE_URL = "/mr capy.png"; 

    // FALLBACK MESSAGES (In case none are passed)
    const DEFAULT_MESSAGES = [
        "Welcome back, Boss!",
        "Stock looks good today.",
        "Don't forget to record samples!",
        "Sales are looking up! 📈",
        "I love organization. And watermelons. 🍉",
        "Did you know Capybaras are the largest rodents?",
        "Remember to hydrate while you work! 💧",
        "System systems go! 🚀",
        "Any new products to add?",
        "You are doing great today! ⭐"
    ];

    // Combine passed messages with defaults if empty
    const dialogueList = messages.length > 0 ? messages : DEFAULT_MESSAGES;

    // STATE
    const [isPeeking, setIsPeeking] = useState(false);
    const [isHiding, setIsHiding] = useState(false); 
    const [internalMsg, setInternalMsg] = useState(""); 
    
    // SEQUENCE TRACKER (Starts at 0)
    const msgIndexRef = useRef(0);

    // 1. HANDLE MUSIC
    useEffect(() => {
        let audio = null;
        if (isDiscoMode) {
            audio = new Audio(DISCO_MUSIC_URL);
            audio.volume = 0.6; 
            audio.loop = true;  
            audio.play().catch(e => console.log("Audio blocked:", e));
        }
        return () => { if (audio) { audio.pause(); audio.currentTime = 0; } };
    }, [isDiscoMode]);

    // 2. SEQUENTIAL PEEKING LOGIC
    useEffect(() => {
        if (isDiscoMode) return; 

        let peekTimer;
        let hideTimer;

        const scheduleNextPeek = () => {
            const nextPeekTime = Math.random() * 30000 + 10000; // 10-40s random interval
            
            peekTimer = setTimeout(() => {
                // GET NEXT MESSAGE IN ORDER
                const currentIndex = msgIndexRef.current;
                const nextText = dialogueList[currentIndex];
                
                // Set text
                setInternalMsg(nextText);
                
                // Advance index for NEXT time (Loop back to 0 if at end)
                msgIndexRef.current = (currentIndex + 1) % dialogueList.length;

                // Show him
                setIsPeeking(true);
                setIsHiding(false);

                // Hide after 6 seconds
                hideTimer = setTimeout(() => {
                    handleHide();
                }, 6000); 

            }, nextPeekTime);
        };

        const handleHide = () => {
            setIsHiding(true); 
            setTimeout(() => {
                setIsPeeking(false);
                setIsHiding(false);
                setInternalMsg(""); 
                scheduleNextPeek(); 
            }, 1000);
        };

        scheduleNextPeek();
        return () => { clearTimeout(peekTimer); clearTimeout(hideTimer); };
    }, [isDiscoMode, dialogueList]); // Re-run if list changes

    // 3. SMART CLICK LOGIC
    const onMascotClick = () => {
        if (message || internalMsg) {
            setIsHiding(true);
            setTimeout(() => {
                setIsPeeking(false);
                setInternalMsg("");
            }, 500); 
        } else {
            if (onClick) onClick(); 
            setIsHiding(false);     
        }
    };

    // --- RENDER: DISCO MODE ---
    if (isDiscoMode) {
        return (
            <>
                <div className="fixed inset-0 z-[100] pointer-events-none animate-disco-lights mix-blend-overlay opacity-60"></div>
                <div className="fixed bottom-0 right-4 z-[102] cursor-pointer animate-bounce-high" onClick={onClick}>
                    <div className="relative w-56 h-56 md:w-72 md:h-72 rounded-full overflow-hidden border-4 border-pink-500 shadow-[0_0_50px_#ec4899]">
                        <video src={DISCO_VIDEO_URL} autoPlay loop muted className="w-full h-full object-cover"/>
                    </div>
                </div>
                <style>{`
                    @keyframes disco-lights { 0% { background: linear-gradient(45deg, red, blue); } 50% { background: linear-gradient(45deg, lime, yellow); } 100% { background: linear-gradient(45deg, purple, red); } }
                    @keyframes bounce-high { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
                    .animate-disco-lights { animation: disco-lights 2s infinite linear alternate; }
                    .animate-bounce-high { animation: bounce-high 0.8s infinite ease-in-out; }
                `}</style>
            </>
        );
    }

    // --- RENDER: NORMAL MODE ---
    const activeMessage = message || internalMsg; 
    const showMascot = isPeeking || message; 
    const slideClass = isHiding ? 'translate-x-[120%]' : 'translate-x-0'; 
    const initialClass = 'translate-x-[120%]';

    return (
        <div 
            className={`fixed bottom-0 right-0 z-[60] transition-transform duration-700 ease-in-out cursor-pointer group ${showMascot ? slideClass : initialClass}`}
            onClick={onMascotClick}
            style={{ willChange: 'transform', marginBottom: '0px', marginRight: '0px' }} 
        >
            <div className="relative w-48 h-48 md:w-64 md:h-64">
                {/* ANIMATED PIXEL CLOUD */}
                {activeMessage && (
                    <div className="absolute bottom-[85%] right-[20%] z-20 animate-pop-in pointer-events-none">
                        <div className="relative bg-white border-4 border-black p-4 min-w-[160px] max-w-[200px] text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
                            <p className="text-[10px] md:text-xs font-bold text-black font-mono leading-tight">
                                {activeMessage}
                            </p>
                            <div className="absolute -bottom-3 right-8 w-4 h-4 bg-white border-r-4 border-b-4 border-black rotate-45"></div>
                        </div>
                    </div>
                )}

                <img 
                    src={NORMAL_IMAGE_URL} 
                    alt="Mascot" 
                    className="w-full h-full object-contain drop-shadow-xl hover:brightness-110 transition-all origin-bottom-right"
                    onError={(e) => { e.target.onerror = null; e.target.src="https://api.dicebear.com/7.x/avataaars/svg?seed=CapyStandard"; }}
                />
            </div>
            <style>{`
                @keyframes pop-in { 0% { transform: scale(0) translateY(20px); opacity: 0; } 80% { transform: scale(1.1) translateY(-5px); opacity: 1; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
                .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            `}</style>
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
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-sm text-left"><thead className="text-slate-500 font-bold border-b dark:border-slate-700"><tr><th className="pb-3 pl-2">Product</th><th className="pb-3">Price</th><th className="pb-3">Performance</th><th className="pb-3">Notes</th><th className="pb-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{benchmarks.map(b => (<tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50"><td className="py-3 pl-2"><div className="font-bold dark:text-white">{b.product}</div><div className="text-xs text-slate-500">{b.brand}</div></td><td className="py-3 font-mono text-red-500 font-bold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(b.price)}</td><td className="py-3"><span className={`text-[10px] px-2 py-1 rounded-full border ${b.volume === 'High Sales' ? 'bg-green-100 text-green-700 border-green-200' : b.volume === 'Slow Moving' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>{b.volume}</span></td><td className="py-3 text-slate-500 text-xs italic">{b.notes}</td><td className="py-3 text-right pr-2"><button onClick={()=>handleDeleteBenchmark(b.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button></td></tr>))}</tbody></table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};



// --- HELPER: MAP CONTROLLER (DEFINED OUTSIDE TO PREVENT RE-RENDERS) ---
// This component handles camera movements safely without resetting on every click.
const MapEffectController = ({ selectedRegion, selectedCity, mapPoints, savedHome }) => {
    const map = useMap();
    const isFirstRun = useRef(true);

    // 1. INITIAL LOAD (Go to Saved Home)
    useEffect(() => {
        if (isFirstRun.current) {
            if (savedHome && savedHome.lat && savedHome.lng) {
                map.setView([savedHome.lat, savedHome.lng], savedHome.zoom || 13);
            } else {
                map.locate().on("locationfound", (e) => map.flyTo(e.latlng, 13));
            }
            isFirstRun.current = false;
        }
    }, [map, savedHome]);

    // 2. REGION/CITY CHANGE (Only runs when filters change)
    useEffect(() => {
        if (selectedRegion !== "All" && mapPoints.length > 0) {
            let latSum = 0, lngSum = 0;
            mapPoints.forEach(p => { latSum += p.latitude; lngSum += p.longitude; });
            const center = [latSum / mapPoints.length, lngSum / mapPoints.length];
            map.flyTo(center, 13, { duration: 1.5 });
        }
    }, [selectedRegion, selectedCity, map]); // <--- NOT dependent on selectedStore

    return null;
};

// --- FIXED: MAP MISSION CONTROL (DYNAMIC TIERS + ALL PREVIOUS FIXES) ---
const MapMissionControl = ({ customers, transactions, inventory, db, appId, user, logAudit, triggerCapy, isAdmin, savedHome, onSetHome, tierSettings }) => {
    const [selectedStore, setSelectedStore] = useState(null);
    const [filterTier, setFilterTier] = useState(['Platinum', 'Gold', 'Silver', 'Bronze']); 
    const [isAddingMode, setIsAddingMode] = useState(false); 
    const [newPinCoords, setNewPinCoords] = useState(null);
    
    const [selectedRegion, setSelectedRegion] = useState("All"); 
    const [selectedCity, setSelectedCity] = useState("All");     
    const [mapBounds, setMapBounds] = useState(null); 

    const activeTiers = tierSettings || [
        { id: 'Platinum', label: 'Platinum', color: '#f59e0b', iconType: 'emoji', value: '🏆' },
        { id: 'Gold', label: 'Gold', color: '#fbbf24', iconType: 'emoji', value: '🥇' },
        { id: 'Silver', label: 'Silver', color: '#94a3b8', iconType: 'emoji', value: '🥈' },
        { id: 'Bronze', label: 'Bronze', color: '#78350f', iconType: 'emoji', value: '🥉' }
    ];

    // 1. DATA PROCESSING
    const { mapPoints, locationTree } = useMemo(() => {
        const tree = {}; 
        const validStores = customers
            .filter(c => c.latitude && c.longitude)
            .map(c => {
                const lat = parseFloat(c.latitude);
                const lng = parseFloat(c.longitude);
                if (isNaN(lat) || isNaN(lng)) return null;

                // DATA FIX: FORCE "JALAN PEMUDA" TO "MUNTILAN"
                let reg = c.region || "Uncategorized";
                let cit = c.city || "Uncategorized";
                const addr = (c.address || "").toLowerCase();

                if (cit.toLowerCase().includes("jalan pemuda") || addr.includes("jalan pemuda")) {
                    cit = "Muntilan"; 
                }

                if (!tree[reg]) tree[reg] = new Set();
                tree[reg].add(cit);

                const last = c.lastVisit ? new Date(c.lastVisit) : new Date(0);
                const next = new Date(last);
                next.setDate(last.getDate() + (parseInt(c.visitFreq) || 7));
                const diffDays = Math.ceil((next - new Date()) / (1000 * 60 * 60 * 24));
                
                let status = 'ok';
                if (diffDays <= 0) status = 'overdue';
                else if (diffDays <= 2) status = 'soon';

                return { ...c, city: cit, latitude: lat, longitude: lng, status, diffDays };
            })
            .filter(c => c !== null);

        const filtered = validStores.filter(c => {
            if (selectedRegion !== "All" && c.region !== selectedRegion) return false;
            if (selectedCity !== "All" && c.city !== selectedCity) return false;
            const tier = c.tier || 'Silver';
            if (!filterTier.includes(tier)) return false;
            return true;
        });

        const treeArray = Object.keys(tree).reduce((acc, reg) => {
            acc[reg] = Array.from(tree[reg]).sort();
            return acc;
        }, {});

        return { mapPoints: filtered, locationTree: treeArray };
    }, [customers, filterTier, selectedRegion, selectedCity, activeTiers]);

    const AdminControls = () => {
        const map = useMapEvents({});
        const saveView = () => { if(onSetHome) onSetHome(map.getCenter(), map.getZoom()); };
        if(!isAdmin) return null;
        return (
            <div className="absolute top-[80px] left-[10px] z-[9999]">
                <button onClick={saveView} className="bg-white text-slate-800 border-2 border-slate-300 px-3 py-2 rounded-lg text-xs font-bold shadow-xl flex items-center gap-2 hover:bg-orange-500 hover:text-white hover:border-orange-600 transition-colors">
                    <MapPin size={14}/> Set Home
                </button>
            </div>
        );
    };

    const MapClicker = () => {
        useMapEvents({
            click(e) {
                if (isAddingMode) {
                    setNewPinCoords(e.latlng);
                    const coordString = `${e.latlng.lat}, ${e.latlng.lng}`;
                    navigator.clipboard.writeText(coordString);
                    if(window.confirm(`Pin Dropped!\nCoords: ${coordString}\n\nCreate new store here?`)) setIsAddingMode(false);
                } else {
                    setSelectedStore(null);
                }
            },
        });
        return null;
    };

    const getIcon = (store, isTemp = false) => {
        if (isTemp) return L.divIcon({ className: 'custom-icon', html: `<div style="background-color: white; width: 24px; height: 24px; border-radius: 50%; border: 4px solid black; animation: bounce 1s infinite;"></div>`, iconSize: [24, 24] });

        const tierDef = activeTiers.find(t => t.id === store.tier) || activeTiers[2] || {};
        let content = '';
        if (tierDef.iconType === 'image') {
            content = `<img src="${tierDef.value}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
        } else {
            content = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 16px;">${tierDef.value || '📍'}</div>`;
        }

        let glow = store.status === 'overdue' ? `box-shadow: 0 0 0 4px #ef4444; animation: pulse 1.5s infinite;` : '';
        let border = `border: 3px solid ${tierDef.color || '#94a3b8'};`;

        return L.divIcon({
            className: 'custom-icon', 
            html: `<div class="marker-inner" style="background-color: white; width: 34px; height: 34px; border-radius: 50%; ${border} ${glow} overflow: hidden;">${content}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
        });
    };

    const toggleTierFilter = (tierId) => {
        setFilterTier(prev => prev.includes(tierId) ? prev.filter(t => t !== tierId) : [...prev, tierId]);
    };

    const toggleAllTiers = () => {
        setFilterTier(filterTier.length === activeTiers.length ? [] : activeTiers.map(t => t.id));
    };

    const handlePinClick = (store, map) => {
        setSelectedStore(store);
        map.flyTo([store.latitude, store.longitude], 18, { duration: 1.2 });
    };

    // --- UPDATED: DYNAMIC TIER LOOKUP ---
    const MarkerWithZoom = ({ store }) => {
        const map = useMap();
        
        // Find the correct Tier Definition (Icon + Label)
        const tierDef = activeTiers.find(t => t.id === store.tier) || { label: store.tier || 'Silver', value: '📍', iconType: 'emoji' };

        return (
            <Marker 
                key={store.id} 
                position={[store.latitude, store.longitude]} 
                icon={getIcon(store)} 
                eventHandlers={{ click: () => handlePinClick(store, map) }}
                riseOnHover={true}
            >
                <LeafletTooltip direction="top" offset={[0, -40]} opacity={1} className="custom-leaflet-tooltip">
                    <div className="store-3d-card w-48 bg-slate-900 text-white rounded-xl border-2 border-slate-600 overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none z-20"></div>
                        {store.storeImage ? (
                            <img src={store.storeImage} className="w-full h-28 object-cover" alt={store.name} onError={(e) => e.target.style.display = 'none'}/>
                        ) : (
                            <div className="w-full h-24 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-600"><Store size={32}/></div>
                        )}
                        <div className="p-3 bg-slate-900/95 backdrop-blur relative z-10">
                            <h3 className="font-bold text-sm mb-1 truncate text-white">{store.name}</h3>
                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                {/* DYNAMIC TIER BADGE */}
                                <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600 flex items-center gap-1 font-bold">
                                    {tierDef.iconType === 'image' ? (
                                        <img src={tierDef.value} className="w-3 h-3 object-contain"/> 
                                    ) : (
                                        <span>{tierDef.value}</span>
                                    )}
                                    <span>{tierDef.label}</span>
                                </span>
                                
                                <span className={store.status === 'overdue' ? 'text-red-400 font-bold bg-red-900/20 px-1.5 py-0.5 rounded' : 'text-emerald-400 font-bold'}>{store.diffDays <= 0 ? 'LATE' : `${store.diffDays}d left`}</span>
                            </div>
                        </div>
                    </div>
                </LeafletTooltip>
            </Marker>
        );
    };

    const StoreHUD = ({ store }) => {
        const [showConsignDetails, setShowConsignDetails] = useState(false);

        const stats = useMemo(() => {
            const storeTrans = transactions.filter(t => t.customerName === store.name);
            const totalRev = storeTrans.filter(t => t.type === 'SALE').reduce((sum, t) => sum + (t.total || 0), 0);
            const totalTitip = storeTrans.filter(t => t.type === 'SALE' && t.paymentType === 'Titip').reduce((sum, t) => sum + (t.total || 0), 0);
            const totalPaid = storeTrans.filter(t => t.type === 'CONSIGNMENT_PAYMENT').reduce((sum, t) => sum + (t.amountPaid || 0), 0);
            const currentConsignment = Math.max(0, totalTitip - totalPaid);
            
            const itemMap = {}; 
            storeTrans.forEach(t => {
                if (t.type === 'SALE' && t.paymentType === 'Titip') {
                    t.items.forEach(i => {
                        const prod = inventory ? inventory.find(p => p.id === i.productId) : null;
                        const bks = convertToBks(i.qty, i.unit, prod);
                        if (!itemMap[i.productId]) itemMap[i.productId] = { name: i.name, qty: 0 };
                        itemMap[i.productId].qty += bks;
                    });
                }
                else if (t.type === 'CONSIGNMENT_PAYMENT' || t.type === 'RETURN') {
                    const list = t.items || t.itemsPaid || [];
                    list.forEach(i => {
                        const prod = inventory ? inventory.find(p => p.id === i.productId) : null;
                        const bks = convertToBks(i.qty, i.unit, prod);
                        if (itemMap[i.productId]) itemMap[i.productId].qty -= bks;
                    });
                }
            });
            const activeItems = Object.values(itemMap).filter(i => i.qty > 0);

            const graphData = storeTrans.filter(t => t.type === 'SALE').reduce((acc, t) => {
                const date = t.date.substring(5);
                const found = acc.find(i => i.date === date);
                if (found) found.total += t.total; else acc.push({ date, total: t.total });
                return acc;
            }, []).sort((a,b) => a.date.localeCompare(b.date)).slice(-5);
            
            return { totalRev, currentConsignment, activeItems, visitCount: storeTrans.length, graphData };
        }, [store, transactions, inventory]);

        const getWhatsappLink = () => {
            if (!store.phone) return "#";
            const cleanNumber = store.phone.replace(/\D/g, '').replace(/^0/, '62');
            return `https://wa.me/${cleanNumber}`;
        };

        const HudTooltip = ({ active, payload, label }) => {
            if (active && payload && payload.length) {
                return (
                    <div className="bg-slate-800 p-3 border border-slate-600 rounded text-xs text-white shadow-xl">
                        <p className="font-bold border-b border-slate-600 mb-2 pb-1 text-slate-400">Date: {label}</p>
                        <p className="text-emerald-400 font-mono text-sm font-bold">Rp {new Intl.NumberFormat('id-ID').format(payload[0].value)}</p>
                    </div>
                );
            }
            return null;
        };

        return (
            <div className="absolute left-4 top-20 bottom-4 w-80 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700 p-6 overflow-y-auto z-[1000] animate-slide-in-left">
                <button onClick={() => setSelectedStore(null)} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full hover:bg-red-500 transition-colors"><X size={16}/></button>
                <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">{store.name}</h2>
                <p className="text-slate-400 text-xs mb-4 flex items-center gap-1"><MapPin size={12}/> {store.city}</p>

                {isAdmin && store.phone && (
                    <div className="mb-4 bg-slate-800 p-3 rounded-xl flex justify-between items-center">
                        <span className="text-sm font-mono">{store.phone}</span>
                        <a href={getWhatsappLink()} target="_blank" rel="noreferrer" className="p-2 bg-green-600 rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2 text-xs font-bold"><Phone size={14}/> Chat</a>
                    </div>
                )}

                <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border ${store.status === 'overdue' ? 'bg-red-500/20 border-red-500' : 'bg-emerald-500/20 border-emerald-500'}`}>
                    <Calendar size={24} className={store.status === 'overdue' ? 'text-red-500' : 'text-emerald-500'}/>
                    <div>
                        <p className="text-[10px] uppercase font-bold opacity-70">Next Visit</p>
                        <p className="font-bold text-sm">{store.diffDays <= 0 ? `${Math.abs(store.diffDays)} Days Overdue` : `Due in ${store.diffDays} days`}</p>
                    </div>
                </div>

                {isAdmin && (
                    <div className="space-y-4 mb-6">
                        {stats.currentConsignment > 0 && (
                            <div className="p-3 bg-orange-500/20 border border-orange-500 rounded-xl transition-all">
                                <div 
                                    className="flex justify-between items-center cursor-pointer"
                                    onClick={() => setShowConsignDetails(!showConsignDetails)}
                                >
                                    <div>
                                        <p className="text-[10px] text-orange-300 uppercase font-bold flex items-center gap-2"><Wallet size={12}/> Active Consignment</p>
                                        <p className="text-xl font-bold text-orange-500">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats.currentConsignment)}</p>
                                    </div>
                                    <div className={`bg-orange-500/20 p-1 rounded-full transition-transform duration-300 ${showConsignDetails ? 'rotate-180' : ''}`}>
                                        <ChevronRight size={16} className="text-orange-500 rotate-90"/>
                                    </div>
                                </div>

                                {showConsignDetails && (
                                    <div className="mt-3 pt-3 border-t border-orange-500/30 space-y-2 animate-fade-in">
                                        {stats.activeItems.length > 0 ? (
                                            stats.activeItems.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs items-center">
                                                    <span className="text-slate-300 font-medium">{item.name}</span>
                                                    <span className="text-orange-400 font-bold bg-orange-900/40 px-2 py-0.5 rounded">{item.qty} Bks</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-400 italic text-center">No item details found.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-slate-800 p-3 rounded-xl"><p className="text-[10px] text-slate-400 uppercase">Lifetime Sales</p><p className="font-bold text-emerald-400">{new Intl.NumberFormat('id-ID', { compactDisplay: "short", notation: "compact", currency: 'IDR' }).format(stats.totalRev)}</p></div>
                        <div className="h-32 bg-slate-800 rounded-xl p-2 border border-slate-700">
                            <p className="text-[10px] text-slate-500 mb-1">Sales Trend</p>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={stats.graphData}>
                                    <Tooltip content={<HudTooltip />} cursor={{fill: 'rgba(255,255,255,0.1)'}}/>
                                    <Bar dataKey="total" fill="#10b981" radius={[2,2,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
                <a href={`http://googleusercontent.com/maps.google.com/?q=${store.latitude},${store.longitude}`} target="_blank" rel="noreferrer" className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"><MapPin size={16}/> GPS Navigation</a>
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-100px)] w-full rounded-2xl overflow-hidden shadow-2xl relative border dark:border-slate-700 bg-slate-900">
            {/* CONTROLS */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <MapPin size={16} className="text-orange-500 ml-2"/>
                        <select value={selectedRegion} onChange={(e) => { setSelectedRegion(e.target.value); setSelectedCity("All"); }} className="bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none p-2 cursor-pointer min-w-[100px]"><option value="All">All Regions</option>{Object.keys(locationTree).sort().map(r => <option key={r} value={r}>{r}</option>)}</select>
                    </div>
                    {selectedRegion !== "All" && locationTree[selectedRegion] && (<div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 animate-fade-in"><span className="text-slate-400 text-xs ml-2">City:</span><select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none p-2 cursor-pointer min-w-[100px]"><option value="All">All Cities</option>{locationTree[selectedRegion].map(c => <option key={c} value={c}>{c}</option>)}</select></div>)}
                </div>
                <div className="flex gap-1 bg-slate-900/90 p-1.5 rounded-xl backdrop-blur-md border border-slate-700 pointer-events-auto shadow-xl">
                    <button onClick={toggleAllTiers} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterTier.length === activeTiers.length ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>All</button>
                    {activeTiers.map(tier => (
                        <button key={tier.id} onClick={() => toggleTierFilter(tier.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${filterTier.includes(tier.id) ? 'bg-slate-700 text-white border border-slate-500 shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-800 opacity-60'}`}>
                            {tier.iconType === 'image' ? <img src={tier.value} className="w-3 h-3 rounded-full"/> : <span>{tier.value}</span>}
                            {tier.label}
                        </button>
                    ))}
                </div>
                <button onClick={() => setIsAddingMode(!isAddingMode)} className={`pointer-events-auto px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 border transition-all ${isAddingMode ? 'bg-orange-500 text-white border-orange-400 animate-pulse scale-105' : 'bg-white text-slate-700 border-slate-200'}`}><MapPin size={16}/> {isAddingMode ? "Click Map to Drop" : "Add Store"}</button>
            </div>

            {/* MAP */}
            <MapContainer center={[-7.6145, 110.7122]} zoom={10} style={{ height: '100%', width: '100%' }} className="z-0" zoomControl={false}>
                <ZoomControl position="topleft" />
                
                {/* USE STABLE CONTROLLER */}
                <MapEffectController 
                    selectedRegion={selectedRegion}
                    selectedCity={selectedCity}
                    mapPoints={mapPoints}
                    savedHome={savedHome}
                />

                <LayersControl position="bottomright">
                    
                    {/* OPTION 1: BALANCED DARK MODE (Brightened, Visible) */}
                    <LayersControl.BaseLayer checked name="Game Mode (Balanced)">
                        <TileLayer 
                            className="balanced-dark-tile"
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                            attribution='© CARTO'
                        />
                    </LayersControl.BaseLayer>

                    {/* OPTION 2: BLUEPRINT / HIGH VISIBILITY (Inverted Light Map) */}
                    <LayersControl.BaseLayer name="Blueprint (High Vis)">
                        <TileLayer 
                            className="blueprint-tile"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                            attribution='© OpenStreetMap'
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.BaseLayer name="Satellite">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='© Esri'/>
                    </LayersControl.BaseLayer>
                </LayersControl>

                <AdminControls />
                <MapClicker />
                {mapBounds && <Rectangle bounds={mapBounds} pathOptions={{ color: '#f97316', weight: 2, fillOpacity: 0.1, dashArray: '5, 10' }} />}
                
                {mapPoints.map(store => <MarkerWithZoom key={store.id} store={store} />)}
                
                {newPinCoords && <Marker position={newPinCoords} icon={getIcon({}, true)}><Popup>New Location: {newPinCoords.lat.toFixed(5)}, {newPinCoords.lng.toFixed(5)}</Popup></Marker>}
            </MapContainer>

            {selectedStore && <StoreHUD store={selectedStore} />}
            
            <style>{`
                .leaflet-tooltip-pane { 
                    z-index: 9999 !important; 
                    pointer-events: none !important; 
                }

                .leaflet-control-zoom a {
                    background-color: white !important;
                    color: black !important;
                    border: 2px solid #ccc !important;
                    width: 36px !important;
                    height: 36px !important;
                    line-height: 36px !important;
                    font-size: 18px !important;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3) !important;
                }
                .leaflet-control-zoom a:hover {
                    background-color: #f1f5f9 !important;
                }

                .custom-icon .marker-inner {
                    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    transform-origin: center center;
                }
                .custom-icon:hover .marker-inner {
                    transform: scale(1.2);
                    filter: drop-shadow(0 0 10px gold);
                }
                .custom-icon:hover {
                    z-index: 10000 !important;
                }

                .custom-leaflet-tooltip { 
                    background: transparent !important; 
                    border: none !important; 
                    box-shadow: none !important; 
                    padding: 0 !important;
                    margin: 0 !important;
                    opacity: 1 !important;
                }
                .custom-leaflet-tooltip::before { display: none !important; }

                .store-3d-card {
                    transform: perspective(1000px) rotateX(20deg) scale(0.5) translateY(20px);
                    opacity: 0;
                    transform-origin: bottom center;
                }

                .custom-leaflet-tooltip .store-3d-card {
                    animation: popIn 0.3s forwards;
                }

                @keyframes popIn {
                    0% { transform: perspective(1000px) rotateX(20deg) scale(0.5) translateY(20px); opacity: 0; }
                    100% { 
                        transform: perspective(1000px) rotateX(-5deg) scale(1.0) translateY(-10px); 
                        opacity: 1; 
                        box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.8);
                    }
                }

                /* FIXED: REMOVED AGGRESSIVE CONTRAST, ADDED BRIGHTNESS */
                .balanced-dark-tile {
                    filter: brightness(1.2); 
                }

                /* FIXED: HIGH VISIBILITY BLUEPRINT MODE (Inverted OSM) */
                .blueprint-tile {
                    filter: invert(100%) hue-rotate(180deg) brightness(0.9) contrast(1.1) grayscale(0.8);
                }

                @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
                @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            `}</style>
        </div>
    );
};

// --- FIXED: JOURNEY VIEW (DYNAMIC TIERS + WORKING MAP LINKS) ---
const JourneyView = ({ customers, db, appId, user, logAudit, triggerCapy, setActiveTab, tierSettings }) => {
    const [selectedStore, setSelectedStore] = useState(null);
    const [checkInNote, setCheckInNote] = useState("");
    const [isCheckingIn, setIsCheckingIn] = useState(false);

    // 1. FILTER: Find stores due for a visit
    const todaysMission = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);

        return customers.map(c => {
            if (!c.lastVisit) return { ...c, status: 'urgent', daysOverdue: 99 }; 
            
            const last = new Date(c.lastVisit);
            const freq = parseInt(c.visitFreq || 7);
            const nextDue = new Date(last);
            nextDue.setDate(last.getDate() + freq);
            
            const diffTime = nextDue - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let status = 'ok';
            if (diffDays <= 0) status = 'overdue';
            else if (diffDays <= 2) status = 'soon';
            
            return { ...c, diffDays, status, nextDue };
        })
        .filter(c => c.status === 'overdue' || c.status === 'soon') 
        .sort((a, b) => {
            if (a.status !== b.status) return a.status === 'overdue' ? -1 : 1;
            // Simple sort by tier priority (Platinum > Gold > Silver > Bronze)
            const getScore = (tierId) => {
                const idx = tierSettings ? tierSettings.findIndex(t => t.id === tierId) : -1;
                return idx === -1 ? 100 : idx; // Lower index = Higher Priority in default list
            };
            return getScore(a.tier) - getScore(b.tier);
        });
    }, [customers, tierSettings]);

    const handleCheckIn = async (store) => {
        setIsCheckingIn(true);
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, store.id), {
                lastVisit: todayStr,
                updatedAt: serverTimestamp()
            });
            await logAudit("VISIT_CHECKIN", `Visited ${store.name}. Note: ${checkInNote || "Routine Check"}`);
            triggerCapy(`Check-in complete at ${store.name}! Great job!`);
            setSelectedStore(null);
            setCheckInNote("");
        } catch (err) {
            console.error(err);
            alert("Check-in failed.");
        }
        setIsCheckingIn(false);
    };

    // --- FIXED: GOOGLE MAPS LINK ---
    const getMapsLink = (c) => {
        // Use standard Google Maps URL format
        if (c.latitude && c.longitude) return `https://www.google.com/maps?q=${c.latitude},${c.longitude}`;
        return `https://www.google.com/maps?q=${encodeURIComponent(c.address || c.name)}`;
    };

    return (
        <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
            {/* HEADER */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2"><MapPin size={24} className="text-orange-500"/> Daily Mission</h2>
                        <p className="text-slate-400 text-sm mt-1">{todaysMission.length} stores require your attention today.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-orange-500">{todaysMission.length}</div>
                        <div className="text-xs uppercase font-bold tracking-widest opacity-50">Pending Visits</div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10"><MapPin size={200} /></div>
            </div>

            {/* CHECK-IN MODAL */}
            {selectedStore && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl border dark:border-slate-700">
                        <h3 className="text-xl font-bold dark:text-white mb-1">Check In</h3>
                        <p className="text-sm text-slate-500 mb-4">You are at <span className="font-bold text-orange-500">{selectedStore.name}</span></p>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Visit Result / Notes</label>
                        <textarea value={checkInNote} onChange={e => setCheckInNote(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border dark:border-slate-600 dark:text-white text-sm mb-4 h-24" placeholder="e.g. Owner wasn't there, Restocked 2 Bal..."/>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setSelectedStore(null)} className="py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
                            <button onClick={() => handleCheckIn(selectedStore)} disabled={isCheckingIn} className="py-3 rounded-xl font-bold bg-orange-500 text-white shadow-lg hover:bg-orange-600">{isCheckingIn ? "Saving..." : "Confirm Visit"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MISSION LIST */}
            <div className="space-y-4">
                {todaysMission.length === 0 ? (
                    <div className="text-center py-20 opacity-50"><ShieldCheck size={64} className="mx-auto mb-4 text-emerald-500"/><h3 className="text-xl font-bold dark:text-white">All Clear!</h3><p className="text-slate-500">You have completed all scheduled visits for today.</p></div>
                ) : (
                    todaysMission.map(store => {
                        // DYNAMIC TIER LOOKUP
                        const tierDef = tierSettings ? tierSettings.find(t => t.id === store.tier) : null;
                        
                        return (
                            <div key={store.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                            {store.name}
                                            {/* --- FIXED: DYNAMIC TIER BADGE --- */}
                                            {tierDef && (
                                                <span 
                                                    className="text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-bold"
                                                    style={{ 
                                                        borderColor: tierDef.color, 
                                                        backgroundColor: `${tierDef.color}15`, // 15 = low opacity hex
                                                        color: tierDef.color 
                                                    }}
                                                >
                                                    {tierDef.iconType === 'image' ? <img src={tierDef.value} className="w-3 h-3 object-contain"/> : tierDef.value}
                                                    {tierDef.label.toUpperCase()}
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin size={12}/> {store.city} {store.region ? `(${store.region})` : ''}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${store.diffDays < 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>{store.diffDays < 0 ? `${Math.abs(store.diffDays)} Days Late` : 'Due Soon'}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 border-t dark:border-slate-700 pt-3">
                                    <a href={getMapsLink(store)} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-100"><MapPin size={16}/> Route</a>
                                    <button onClick={() => setSelectedStore(store)} className="flex-1 py-2 bg-emerald-50 dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-100"><ShieldCheck size={16}/> Check In</button>
                                    <button onClick={() => { setActiveTab('sales'); }} className="px-4 py-2 bg-orange-50 dark:bg-slate-700 text-orange-600 dark:text-orange-300 rounded-lg text-sm font-bold hover:bg-orange-100">Sell</button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

          

// --- UPGRADED: CUSTOMER MANAGEMENT (WITH PHOTO UPLOAD) ---
const CustomerManagement = ({ customers, db, appId, user, logAudit, triggerCapy, isAdmin, tierSettings, onRequestCrop, croppedImage, onClearCroppedImage }) => {
    const [viewMode, setViewMode] = useState('list');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [formData, setFormData] = useState({ 
        name: '', phone: '', region: '', city: '', address: '', 
        gmapsUrl: '', latitude: '', longitude: '', storeImage: '', 
        tier: 'Silver', visitFreq: 7, lastVisit: new Date().toISOString().split('T')[0] 
    });
    const [editingId, setEditingId] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    
    // LISTEN FOR CROPPED IMAGE FROM PARENT
    useEffect(() => {
        if (croppedImage) {
            setFormData(prev => ({ ...prev, storeImage: croppedImage }));
            onClearCroppedImage(); // Clear from parent so it doesn't loop
        }
    }, [croppedImage]);

    // Combined Coords Input
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
            setFormData({ name: '', phone: '', region: '', city: '', address: '', gmapsUrl: '', latitude: '', longitude: '', storeImage: '', tier: 'Silver', visitFreq: 7, lastVisit: new Date().toISOString().split('T')[0] }); 
            setCoordInput("");
        } catch (err) { console.error(err); } 
    };

    const handleEdit = (c) => { 
        setFormData({ 
            name: c.name, phone: c.phone || '', region: c.region || '', city: c.city || '', 
            address: c.address || '', gmapsUrl: c.gmapsUrl || '', storeImage: c.storeImage || '',
            latitude: c.latitude || '', longitude: c.longitude || '',
            tier: c.tier || 'Silver', visitFreq: c.visitFreq || 7, lastVisit: c.lastVisit || new Date().toISOString().split('T')[0]
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
                    <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-sm text-slate-500 uppercase">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>{editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({name:'', phone:'', region:'', city:'', address:'', gmapsUrl:'', latitude: '', longitude: '', storeImage:'', tier: 'Silver', visitFreq: 7, lastVisit: ''}); setCoordInput(""); }} className="text-xs text-red-500 hover:underline">Cancel Edit</button>}</div>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase">Store Name</label><input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" required/></div>
                        <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase">Phone</label><input value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" /></div>
                    </div>

                    {/* STRATEGY & IMAGE UPLOAD */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-indigo-50 dark:bg-slate-900/50 p-3 rounded-xl border border-indigo-100 dark:border-slate-700">
                        <div>
                            <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block">Tier</label>
                            <select value={formData.tier} onChange={e=>setFormData({...formData, tier: e.target.value})} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white font-bold">
                                {tierSettings && tierSettings.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                {!tierSettings && <option value="Silver">Silver</option>}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block">Last Visit</label>
                            <input type="date" value={formData.lastVisit} onChange={e=>setFormData({...formData, lastVisit: e.target.value})} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"/>
                        </div>
                        
                        {/* IMAGE UPLOAD UI */}
                        <div>
                            <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block">Store Photo</label>
                            <div className="flex items-center gap-2">
                                <label className="flex-1 cursor-pointer bg-white dark:bg-slate-800 border dark:border-slate-600 hover:border-indigo-500 rounded p-2 flex items-center justify-center gap-2 transition-colors">
                                    <Camera size={16} className="text-indigo-500"/>
                                    <span className="text-xs font-bold dark:text-white">Upload / Camera</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                                </label>
                                {formData.storeImage && (
                                    <div className="w-9 h-9 rounded border border-indigo-200 overflow-hidden shrink-0 group relative">
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
                                <span className="font-bold text-sm dark:text-white">Pinpoint Location</span>
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
                        <div className="flex gap-2">
                            <input value={formData.region} onChange={e=>setFormData({...formData, region: e.target.value})} className="flex-1 p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="Region (Kabupaten)" />
                            <input value={formData.city} onChange={e=>setFormData({...formData, city: e.target.value})} className="flex-1 p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="City (Kecamatan)" />
                        </div>
                        <input value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="w-full p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="Address..." />
                        
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Coordinates (Lat, Lng)</label>
                            <input ref={coordRef} type="text" placeholder="-7.6043, 110.2055" className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white font-mono" value={coordInput} onChange={handleCoordInputChange} />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button className={`text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 ${editingId ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'}`}>{editingId ? 'Update Profile' : 'Save Customer'}</button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.map(c => (
                    <div key={c.id} onClick={() => openDetail(c)} className={`bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-orange-500 transition-all group ${editingId === c.id ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-slate-700' : ''}`}>
                        <div>
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-lg dark:text-white group-hover:text-orange-500 transition-colors">{c.name}</h3>
                                {c.latitude ? <MapPin size={16} className="text-emerald-500"/> : <MapPin size={16} className="text-slate-300"/>}
                            </div>
                            <div className="flex gap-2 mb-2">
                                <span className={`text-[10px] px-2 rounded-full border ${c.tier === 'Platinum' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : c.tier === 'Gold' ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>{c.tier}</span>
                            </div>
                            {(c.city || c.region) && <p className="text-xs font-bold text-slate-400 uppercase">{c.city} {c.region}</p>}
                        </div>
                        {isAdmin && (
                            <div className="flex gap-2 justify-end mt-4 pt-3 border-t dark:border-slate-700">
                                <button onClick={(e) => { e.stopPropagation(); handleEdit(c); }} className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded hover:bg-blue-100 text-slate-600 dark:text-slate-300">Edit</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.name); }} className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded hover:bg-red-100 text-red-500">Delete</button>
                            </div>
                        )}
                    </div>
                ))}
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


// --- NEW: SAMPLING FOLDER VIEW (YEAR > MONTH > DATE > LOCATION) ---
const SamplingFolderView = ({ samplings, isAdmin, onRecordSample, onDelete, onEdit, onEditFolder }) => {
    // New State for Deep Navigation
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
            const month = d.toLocaleString('default', { month: 'long' }); // e.g. "January"
            
            if (!structure[year]) structure[year] = {};
            if (!structure[year][month]) structure[year][month] = {};
            if (!structure[year][month][s.date]) structure[year][month][s.date] = {};
            
            const loc = s.reason ? s.reason.trim() : 'Unspecified';
            if (!structure[year][month][s.date][loc]) structure[year][month][s.date][loc] = [];
            structure[year][month][s.date][loc].push(s);
        });
        return structure;
    }, [samplings]);

    // --- LEVEL 4: ITEMS LIST (Inside a Location) ---
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
                                            <tr key={s.id} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                                <td className="p-3 font-medium dark:text-white pl-4">{s.productName}</td>
                                                <td className="p-3 text-right text-red-500 font-bold">-{s.qty}</td>
                                                <td className="p-3 text-right flex justify-end gap-2 pr-4">
                                                    {isAdmin && (
                                                        <>
                                                        <button onClick={() => onEdit(s)} className="p-1.5 text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"><Pencil size={14}/></button>
                                                        <button onClick={() => onDelete(s)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={14}/></button>
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
                                <div>
                                    <h3 className="font-bold text-lg dark:text-white group-hover:text-orange-500 transition-colors">{loc}</h3>
                                    <p className="text-xs text-slate-500">{folderStructure[selectedYear][selectedMonth][selectedDate][loc].length} Items</p>
                                </div>
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
                                <div className="w-12 h-12 mx-auto bg-orange-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors mb-3">
                                    <span className="font-bold text-lg">{new Date(date).getDate()}</span>
                                </div>
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
        // Sort months chronologically
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
                                <div>
                                    <h3 className="font-bold text-lg dark:text-white">{month}</h3>
                                    <p className="text-xs text-slate-500">{Object.keys(folderStructure[selectedYear][month]).length} Dates Recorded</p>
                                </div>
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
            {years.length === 0 ? (
                 <div className="text-center py-20 text-slate-400">
                    <Folder size={48} className="mx-auto mb-4 opacity-20"/>
                    <p>No sampling records found.</p>
                 </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {years.map(year => (
                        <div key={year} onClick={() => setSelectedYear(year)} className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform relative overflow-hidden group">
                            <Folder size={100} className="absolute -right-6 -bottom-6 text-white opacity-5 group-hover:opacity-10 transition-opacity"/>
                            <div className="relative z-10">
                                <h3 className="text-3xl font-bold mb-1">{year}</h3>
                                <div className="h-1 w-12 bg-orange-500 rounded mb-3"></div>
                                <p className="text-sm text-slate-400 font-mono">
                                    {Object.keys(folderStructure[year]).length} Months Active
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
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

  // --- NEW: IMPORT TIER ICONS ---
  const handleImportTiers = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if(!window.confirm("Import Icons? This will overwrite your current map pins.")) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const json = JSON.parse(event.target.result);
              // Validation check
              if (json.meta?.type !== 'kpm_tier_config' || !Array.isArray(json.tiers)) {
                  throw new Error("Invalid Icon Config File");
              }
              
              setTierSettings(json.tiers);
              await handleSaveTiers(json.tiers); // Save to Database
              triggerCapy("Map Icons Imported Successfully!");
          } catch (err) {
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
  
  const [editCompanyName, setEditCompanyName] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [editingSample, setEditingSample] = useState(null); 
  const [editingFolder, setEditingFolder] = useState(null);



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
  const handleDeleteHistory = async (customerName) => { if(!window.confirm(`Permanently delete ALL transaction history for "${customerName}"?`)) return; try { const targets = transactions.filter(t => (t.customerName||'').trim() === customerName); for (const t of targets) { await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, t.id)); } await logAudit("HISTORY_DELETE", `Deleted history folder for ${customerName}`); triggerCapy(`Deleted ${targets.length} records for ${customerName}`); } catch (err) { console.error(err); alert("Error deleting history."); } };
  const handleExportCSV = () => { const headers = ["ID,Name,Category,Stock,Price(Retail)\n"]; const csvContent = inventory.map(p => `${p.id},"${p.name}",${p.type},${p.stock},${p.priceRetail}`).join("\n"); const blob = new Blob([headers + csvContent], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `inventory_${getCurrentDate()}.csv`; a.click(); logAudit("EXPORT", "Downloaded Inventory CSV"); };
 
  // --- UPDATED: HANDLE CROP CONFIRM (CLEAN VERSION) ---
  const handleCropConfirm = (base64) => { 
      if (!activeCropContext) return; 
      
      if (activeCropContext.type === 'mascot') { 
          const newSettings = { ...appSettings, mascotImage: base64 }; 
          setAppSettings(newSettings); 
          if(user) { 
              setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), newSettings, {merge: true}); 
              logAudit("SETTINGS_UPDATE", "Updated Mascot Image"); 
          } 
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

      } else if (activeCropContext.type === 'customer_staging') {
          setTempCustomerImage(base64); 
          triggerCapy("Store photo ready!");
      }
      
      setCropImageSrc(null); 
      setActiveCropContext(null); 
  };

  // --- NEW: TIER ICON FILE HANDLER ---
  function handleTierIconSelect(e, index) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            setCropImageSrc(reader.result);
            setActiveCropContext({ type: 'tier', index: index, face: 'front' });
            setBoxDimensions({ w: 100, h: 100, d: 0 }); // Square crop for icons
        };
        reader.readAsDataURL(file);
    }
    e.target.value = null;
}
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

// --- NEW: UPDATE SINGLE SAMPLING (WITH NOTE & DATE) ---
  const handleUpdateSampling = async (e) => {
      e.preventDefault();
      if (!user || !editingSample) return;
      const formData = new FormData(e.target);
      const newQty = parseInt(formData.get('qty'));
      const newDate = formData.get('date');
      const newReason = formData.get('reason');
      const newNote = formData.get('note');

      try {
          await runTransaction(db, async (t) => {
              const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, editingSample.productId);
              const prodDoc = await t.get(prodRef);
              
              // Adjust stock difference
              const oldQty = editingSample.qty;
              const diff = newQty - oldQty;
              
              if (prodDoc.exists() && diff !== 0) {
                  const currentStock = prodDoc.data().stock || 0;
                  if (currentStock < diff) throw "Not enough stock for increase!";
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
            
{/* TIER MANAGER (ADMIN ONLY) - FIXED EDITING */}
            <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all duration-300 ${!isAdmin ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white"><Tag size={20}/> Customer Tiers & Map Icons</h3>
                    
                    <div className="flex gap-2">
                        <button onClick={handleExportTiers} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">
                            <Download size={14}/> Export
                        </button>
                        <label className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
                            <Upload size={14}/> Import
                            <input type="file" accept=".json" onChange={handleImportTiers} className="hidden" />
                        </label>
                    </div>
                </div>
                
                <div className="space-y-3">
                    {tierSettings.map((tier, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border dark:border-slate-700">
                            {/* Color Picker */}
                            <input type="color" value={tier.color} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].color = e.target.value; handleSaveTiers(newTiers); }} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"/>
                            
                            {/* Label Input - FIXED: Updates State on Change, Saves on Blur */}
                            <input 
                                value={tier.label} 
                                onChange={(e) => { 
                                    const newTiers = [...tierSettings]; 
                                    newTiers[idx].label = e.target.value; 
                                    setTierSettings(newTiers); // Instant UI Update
                                }} 
                                onBlur={() => handleSaveTiers(tierSettings)} // Save to DB when done typing
                                className="w-24 p-2 text-xs font-bold border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" 
                                placeholder="Name"
                            />
                            
                            {/* Icon Type Toggle */}
                            <select value={tier.iconType} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].iconType = e.target.value; handleSaveTiers(newTiers); }} className="p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white">
                                <option value="emoji">Emoji</option>
                                <option value="image">Custom Logo</option>
                            </select>

                            {/* DYNAMIC INPUT AREA */}
                            <div className="flex-1">
                                {tier.iconType === 'image' ? (
                                    <label className="flex items-center justify-center gap-2 w-full p-2 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer hover:bg-slate-300 transition-colors text-xs font-bold text-slate-600 dark:text-slate-300">
                                        <Upload size={14}/> {tier.value && tier.value.startsWith('data:') ? "Change Logo" : "Upload PNG"}
                                        <input type="file" accept="image/png, image/jpeg" onChange={(e) => handleTierIconSelect(e, idx)} className="hidden" />
                                    </label>
                                ) : (
                                    <input value={tier.value} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].value = e.target.value; handleSaveTiers(newTiers); }} className="w-full p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="Paste Emoji (e.g. 👑)"/>
                                )}
                            </div>
                            
                            {/* Preview */}
                            <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800 relative" style={{ borderColor: tier.color }}>
                                {tier.iconType === 'image' ? (
                                    tier.value ? <img src={tier.value} className="w-full h-full object-contain p-1" alt="icon"/> : <ImageIcon size={14} className="opacity-30"/>
                                ) : (
                                    <span className="text-lg">{tier.value}</span>
                                )}
                            </div>
                        </div>
                    ))}
                    <p className="text-[10px] text-slate-400 mt-2">*Changes affect Map Pins and Dropdowns immediately.</p>
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
            {editingMsgIndex === idx ? (


                // EDIT MODE: Show Input + Save + Cancel
                <div className="flex gap-2 w-full animate-fade-in">
                    <input 
                        autoFocus
                        className="flex-1 p-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                        value={editMsgText}
                        onChange={(e) => setEditMsgText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEditedMessage(idx)}
                    />
                    <button onClick={() => handleSaveEditedMessage(idx)} className="text-emerald-500 hover:text-emerald-600" title="Save"><Save size={16}/></button>
                    <button onClick={() => setEditingMsgIndex(-1)} className="text-slate-400 hover:text-slate-500" title="Cancel"><X size={16}/></button>
                </div>
            ) : (
                // NORMAL MODE: Show Text + Edit + Delete
                <>
                    <span className="text-sm dark:text-slate-300 italic truncate mr-2">"{msg}"</span>
                    <div className="flex gap-2 shrink-0">
                        <button 
                            onClick={() => { setEditingMsgIndex(idx); setEditMsgText(msg); }} 
                            className="text-slate-400 hover:text-blue-500"
                            title="Edit Message"
                        >
                            <Edit size={14}/>
                        </button>
                        <button 
                            onClick={() => handleDeleteMascotMessage(msg)} 
                            className="text-slate-400 hover:text-red-500"
                            title="Delete Message"
                        >
                            <Trash2 size={14}/>
                        </button>
                    </div>
                </>
            )}
        </div>
    ))}
</div>
</div>

            <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all duration-300 ${!isAdmin ? 'opacity-50 grayscale pointer-events-none select-none relative overflow-hidden' : ''}`}>
                 {!isAdmin && <div className="absolute inset-0 z-10 bg-slate-50/10 dark:bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center"><div className="bg-slate-900/80 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2"><Lock size={12}/> Locked</div></div>}
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg flex items-center gap-2 dark:text-white">Company Identity</h3></div><div className="flex gap-2"><input className="flex-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={editCompanyName || ""} onChange={handleEditCompNameChange}/><button onClick={handleSaveCompanyName} className="bg-orange-500 text-white px-4 rounded font-bold flex items-center gap-2"><Save size={16} /> Save Name</button></div></div>
            
            <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all duration-300 ${!isAdmin ? 'opacity-50 grayscale pointer-events-none select-none relative overflow-hidden' : ''}`}>
                {!isAdmin && <div className="absolute inset-0 z-10 bg-slate-50/10 dark:bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center"><div className="bg-slate-900/80 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2"><Lock size={12}/> Locked</div></div>}
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg flex items-center gap-2 dark:text-white"><ImageIcon size={20}/> Profile Picture</h3></div><div className="flex items-start gap-6"><div className="flex flex-col items-center"><img src={appSettings?.mascotImage || "/capybara.jpg"} className="w-32 h-32 rounded-full border-4 border-orange-500 object-cover bg-slate-100" onError={(e) => {e.target.onerror = null; e.target.src="https://api.dicebear.com/7.x/avataaars/svg?seed=Capy"}}/><span className="text-xs text-slate-400 mt-2">Current</span></div><div className="flex-1"><label className="bg-orange-100 dark:bg-slate-700 text-orange-600 dark:text-orange-300 px-4 py-2 rounded-lg cursor-pointer hover:bg-orange-200 transition-colors inline-flex items-center gap-2 font-medium"><Upload size={16} /> Select & Crop<input type="file" accept="image/*" onChange={handleMascotSelect} className="hidden" /></label></div></div>


{/* DANGER ZONE - DISCO MODE (ADMIN ONLY) */}
            {isAdmin && (
                <div className="mt-12 pt-8 border-t-2 border-red-100 dark:border-red-900/30">
                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ShieldAlert size={16}/> Danger Zone
                    </h4>
                    
                    <button 
                        onClick={triggerDiscoParty} 
                        disabled={isDiscoMode}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-95 border-b-4 border-red-800 ${isDiscoMode ? 'bg-slate-500 border-slate-700 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:shadow-red-500/40'}`}
                    >
                        {isDiscoMode ? (
                            <>
                                <Music size={24} className="animate-spin"/> 
                                SYSTEM OVERLOAD: PARTYING...
                            </>
                        ) : (
                            <>
                                <ShieldAlert size={24} className="animate-pulse"/> 
                                DO NOT PRESS: CAPY DISCO PROTOCOL
                            </>
                        )}
                    </button>
                    
                    <p className="text-[10px] text-red-400 text-center mt-3 font-mono opacity-70">
                        Warning: Initiating this protocol will result in extreme funkiness levels.
                    </p>
                </div>
            )}
		</div>
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
                { id: 'map_war_room', icon: Globe, label: 'Strategic Map' },
                { id: 'journey', icon: MapPin, label: 'Journey Plan' }, 
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

                {/* STRATEGIC MAP TAB */}
                {activeTab === 'map_war_room' && (
                    <MapMissionControl 
                        customers={customers} 
                        transactions={transactions} 
                        inventory={inventory}  // <--- 🚨 ADD THIS EXACT LINE HERE 🚨
                        db={db} 
                        appId={appId} 
                        user={user} 
                        logAudit={logAudit} 
                        triggerCapy={triggerCapy}
                        isAdmin={isAdmin}
                        savedHome={appSettings?.mapHome}
                        onSetHome={handleSetMapHome}
                        tierSettings={tierSettings}
                    />
                )}

                {/* JOURNEY PLAN TAB */}
                {activeTab === 'journey' && (
                    <JourneyView 
                        customers={customers} 
                        db={db} 
                        appId={appId} 
                        user={user} 
                        logAudit={logAudit} 
                        triggerCapy={triggerCapy} 
                        setActiveTab={setActiveTab} 
                        tierSettings={tierSettings} // <--- ADD THIS LINE
                    />
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

                {/* SAMPLING TAB - REDESIGNED */}
                {activeTab === 'sampling' && (
                    <div className="space-y-6 animate-fade-in">


	{/* NEW: FOLDER EDIT MODAL (Phone Friendly) */}
                    {editingFolder && (
                        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-fade-in">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl border dark:border-slate-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                        <Folder size={20} className="text-orange-500"/> Edit Folder
                                    </h3>
                                    <button onClick={() => setEditingFolder(null)}><X className="dark:text-white"/></button>
                                </div>
                                
                                <form onSubmit={processFolderEdit} className="space-y-4">
                                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg text-xs text-orange-800 dark:text-orange-200 mb-2">
                                        <p className="font-bold">You are moving all items from:</p>
                                        <p>{editingFolder.oldReason}</p>
                                        <p className="font-mono opacity-70">{editingFolder.oldDate}</p>
                                    </div>

                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">New Location Name</label>
                                        <input 
                                            name="newReason" 
                                            defaultValue={editingFolder.oldReason} 
                                            className="w-full p-3 rounded-xl border-2 border-slate-200 focus:border-orange-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white font-bold"
                                            placeholder="e.g. Pasar Sraten"
                                            required 
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">New Date</label>
                                        <div className="relative">
                                            {/* THIS IS THE CALENDAR DROP DOWN (Native Date Picker) */}
                                            <input 
                                                name="newDate" 
                                                type="date" 
                                                defaultValue={editingFolder.oldDate} 
                                                className="w-full p-3 rounded-xl border-2 border-slate-200 focus:border-orange-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white font-bold"
                                                required 
                                            />
                                            <Calendar className="absolute right-3 top-3.5 text-slate-400 dark:text-white pointer-events-none" size={20}/>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button type="button" onClick={() => setEditingFolder(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-slate-500 dark:text-slate-300">Cancel</button>
                                        <button type="submit" className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold shadow-lg hover:bg-orange-600 transition-colors">Save Changes</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}


                        {/* 1. Header & Controls */}
                        {!editingSample && (
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                                    <ClipboardList size={24} className="text-orange-500"/> Sampling Records
                                </h2>
                                <div className="flex gap-2 w-full md:w-auto">
                                    {/* RECORD NEW BUTTON (Opens Modal) */}
                                    <button onClick={() => setEditingSample({ isNew: true })} className="flex-1 md:flex-none bg-orange-500 text-white px-6 py-3 rounded-xl shadow-sm hover:shadow-md hover:bg-orange-600 transition-all flex items-center justify-center gap-2 font-bold">
                                        <Plus size={20}/> Record Sample
                                    </button>
                                    
                                    {/* ANALYTICS BUTTON (Admin Only) */}
                                    {isAdmin && (
                                        <button onClick={() => setEditingSample('analytics')} className="flex-1 md:flex-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-xl shadow-sm hover:border-orange-500 transition-all flex items-center justify-center gap-2 font-bold text-slate-700 dark:text-white">
                                            <TrendingUp size={20} className="text-blue-500"/> Analytics
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 2. Content Switching */}
                        {editingSample === 'analytics' ? (
                            <SamplingAnalyticsView samplings={samplings} inventory={inventory} onBack={() => setEditingSample(null)} />

                        ) : editingSample?.isNew ? (
    // NEW: SHOPPING CART STYLE SAMPLING VIEW
    <SamplingCartView 
        inventory={inventory} 
        isAdmin={isAdmin} 
        onCancel={() => setEditingSample(null)} 
        onSubmit={handleBatchSamplingSubmit} 
    />
) : editingSample && !editingSample.isNew && editingSample !== 'analytics' ? (
    // EDIT EXISTING MODAL (Updated with Notes)
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-lg mb-4 dark:text-white">Edit Sample Record</h3>
            <form onSubmit={handleUpdateSampling} className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded text-xs text-blue-600 dark:text-blue-300 mb-2"><strong>Note:</strong> Changing quantity will automatically adjust product stock.</div>
                <div><label className="text-xs font-bold text-slate-500">Date</label><input name="date" type="date" defaultValue={editingSample.date} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"/></div>
                <div><label className="text-xs font-bold text-slate-500">Product</label><input disabled value={editingSample.productName} className="w-full p-2 border rounded bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"/></div>
                <div><label className="text-xs font-bold text-slate-500">Quantity (Bks)</label><input name="qty" type="number" defaultValue={editingSample.qty} min="1" className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"/></div>
                <div><label className="text-xs font-bold text-slate-500">Location</label><input name="reason" defaultValue={editingSample.reason} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"/></div>
                
                {/* NEW: EDIT NOTE FIELD */}
                <div><label className="text-xs font-bold text-slate-500">Description / Note</label><input name="note" defaultValue={editingSample.note} placeholder="Store name, etc." className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"/></div>
                
                <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setEditingSample(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg font-bold">Cancel</button><button className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-bold">Update</button></div>
            </form>
        </div>
    </div>
) : (
    // MAIN FOLDER VIEW (Now passed onEditFolder)
    <SamplingFolderView 
        samplings={samplings} 
        isAdmin={isAdmin} 
        onRecordSample={() => setEditingSample({isNew:true})} 
        onDelete={handleDeleteSampling} 
        onEdit={(s) => setEditingSample(s)}
        onEditFolder={handleBatchFolderEdit} 
    />
)}
</div>  
)}      
                
                {/* OTHER TABS */}
                {activeTab === 'consignment' && <ConsignmentView transactions={transactions} inventory={inventory} onAddGoods={handleAddGoodsToCustomer} onPayment={handleConsignmentPayment} onReturn={handleConsignmentReturn} onDeleteConsignment={handleDeleteConsignmentData} isAdmin={isAdmin} />}
{/* ... Consignment line is usually here ... */}

{/* PASTE THIS MISSING LINE HERE: */}
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
                        // NEW PROPS FOR CROPPER:
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


                {activeTab === 'sales' && (
                    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] animate-fade-in">
                        {/* LEFT COLUMN: PRODUCT GRID */}
                        <div className="lg:w-2/3 flex flex-col">
                            <input className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border dark:border-slate-700 dark:text-white mb-4" placeholder="Search item..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                            <div className="flex-1 overflow-y-auto bg-slate-900 rounded-2xl shadow-inner border border-slate-700 p-6 relative">
                                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 159px, #475569 160px)'}}></div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
                                    {filteredInventory.map(item => (
                                        <div key={item.id} onClick={() => addToCart(item)} className="group relative flex flex-col items-center cursor-pointer perspective-1000">
                                            <div className="absolute bottom-0 w-32 h-4 bg-black/40 rounded-[100%] blur-md group-hover:bg-black/60 transition-colors"></div>
                                            <div className="relative z-10 w-24 h-32 transform transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-105" style={{ transformStyle: 'preserve-3d' }}>
                                                {(item.images?.front || item.image) ? (
                                                    <img src={item.images?.front || item.image} className="w-full h-full object-cover drop-shadow-2xl rounded-sm" style={{filter: 'contrast(1.1)'}}/>
                                                ) : (
                                                    <div className="w-full h-full bg-slate-700 flex items-center justify-center border border-slate-600 rounded-sm shadow-xl"><Package className="text-slate-500"/></div>
                                                )}
                                                <div className="absolute -top-2 -right-4 bg-yellow-100 text-yellow-900 text-[10px] font-bold px-2 py-1 shadow-md border border-yellow-200 transform rotate-12 z-20 rounded-sm flex items-center gap-1"><Tag size={8} className="fill-yellow-900"/> {formatRupiah(item.priceRetail)}</div>
                                            </div>
                                            <div className="mt-4 text-center z-10">
                                                <h4 className="font-bold text-xs text-slate-300 leading-tight w-24 truncate">{item.name}</h4>
                                                <p className="text-[9px] text-slate-500 dark:text-slate-400 w-24 truncate mt-0.5 h-3">{item.description || ""}</p>
                                                <div className={`text-[10px] font-mono mt-1 px-2 py-0.5 rounded-full inline-block ${item.stock < 10 ? 'bg-red-900/50 text-red-400 border border-red-800' : 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'}`}>{isAdmin ? item.stock : "**"} Left</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: CART */}
                        <div className="lg:w-1/3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex flex-col border dark:border-slate-700">
                            <div className="p-4 border-b dark:border-slate-700 font-bold dark:text-white flex items-center gap-2"><ShoppingCart size={20}/> Current Cart</div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {cart.map(item => (
                                    <div key={item.productId} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700">
                                        <div className="flex justify-between font-bold text-sm dark:text-white">
                                            <span>{item.name}</span> 
                                            <button onClick={() => removeFromCart(item.productId)} className="text-red-400">x</button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1 mt-2">
                                            <input type="number" value={item.qty} onChange={e=>updateCartItem(item.productId, 'qty', e.target.value)} className="p-1 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 text-xs dark:text-white text-center"/>
                                            <select value={item.unit} onChange={e=>updateCartItem(item.productId, 'unit', e.target.value)} className="p-1 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 text-xs dark:text-white">
                                                <option>Bks</option><option>Slop</option><option>Bal</option><option>Karton</option>
                                            </select>
                                            <select value={item.priceTier} onChange={e=>updateCartItem(item.productId, 'priceTier', e.target.value)} className="p-1 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 text-xs dark:text-white">
                                                <option>Ecer</option><option>Retail</option><option>Grosir</option>
                                            </select>
                                        </div>
                                        <div className="text-right font-bold text-emerald-600 mt-1">{formatRupiah(item.calculatedPrice * item.qty)}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 border-t dark:border-slate-700">
                                <form onSubmit={processTransaction}>
                                    <div className="mb-3 relative">
                                        <input name="customerName" required list="customersList" placeholder="Customer Name" className="w-full p-2 bg-transparent border-b dark:border-slate-700 dark:text-white text-sm" autoComplete="off"/>
                                        <datalist id="customersList">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist>
                                    </div>

                                    <select name="paymentType" className="w-full mb-3 p-2 rounded bg-slate-100 dark:bg-slate-700 dark:text-white text-sm">
                                        <option value="Cash">Cash</option>
                                        <option value="QRIS">QRIS</option>
                                        <option value="Transfer">Transfer (BCA/Mandiri)</option>
                                        <option value="Titip">Titip (Consignment)</option>
                                    </select>

                                    <button disabled={cart.length===0} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold">CHARGE {formatRupiah(cart.reduce((a,i)=>a+(i.calculatedPrice*i.qty),0))}</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'transactions' && <HistoryReportView transactions={transactions} inventory={inventory} onDeleteFolder={handleDeleteHistory} onDeleteTransaction={handleDeleteSingleTransaction} isAdmin={isAdmin} user={user} appId={appId} />}
                
                {activeTab === 'audit' && (
                    <div className="space-y-6 animate-fade-in"><h2 className="text-2xl font-bold dark:text-white">System Audit Logs</h2><div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700"><table className="w-full text-sm text-left"><thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b dark:border-slate-700"><tr><th className="p-4">Action</th><th className="p-4">Details</th><th className="p-4 text-right">Time</th></tr></thead><tbody>{auditLogs.map(log => (<tr key={log.id} className="border-b dark:border-slate-700"><td className="p-4 font-bold text-orange-500">{log.action}</td><td className="p-4 dark:text-slate-300">{log.details}</td><td className="p-4 text-right text-slate-400 text-xs">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Just now'}</td></tr>))}</tbody></table></div></div>
                )}

                {activeTab === 'settings' && renderSettings()}
              </>
          )}
        </div>
      </main>

      {/* MASCOT - NOW WITH DISCO STATE PASSED DOWN */}
      <CapybaraMascot 
          isDiscoMode={isDiscoMode}
          message={showCapyMsg ? capyMsg : null} 
          onClick={() => cycleMascotMessage()} 
          staticImageSrc={appSettings?.mascotImage} 
      />
    </div>
  );
}
