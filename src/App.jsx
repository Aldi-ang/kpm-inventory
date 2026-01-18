import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, FileText, 
  Settings, Sun, Moon, Search, Plus, Trash2, 
  Save, X, Upload, RotateCcw, Camera, Download,
  TrendingUp, AlertCircle, ChevronRight, ChevronLeft, DollarSign, Image as ImageIcon,
  User, Lock, ClipboardList, Crop, RotateCw, Move, Maximize2, ArrowRight, RefreshCcw, MessageSquarePlus, MinusCircle, ZoomIn, ZoomOut, Unlock,
  History, ShieldCheck, Copy, Replace, ClipboardCheck, Store, Wallet, Truck, Menu, MapPin, Phone, Edit, Folder,
  Key, MessageSquare, LogIn, LogOut
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "firebase/auth";
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
  runTransaction
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Analytics blocked or failed to load");
}
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

const generateId = () => Math.random().toString(36).substr(2, 9);
const getCurrentDate = () => new Date().toISOString().split('T')[0];

const getRandomColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
};

// Unit Conversion Helper
const convertToBks = (qty, unit, product) => {
    const packsPerSlop = product?.packsPerSlop || 10;
    const slopsPerBal = product?.slopsPerBal || 20;
    const balsPerCarton = product?.balsPerCarton || 4;

    if (unit === 'Slop') return qty * packsPerSlop;
    if (unit === 'Bal') return qty * slopsPerBal * packsPerSlop;
    if (unit === 'Karton') return qty * balsPerCarton * slopsPerBal * packsPerSlop;
    return qty; 
};

/**
 * COMPONENT: IMAGE CROPPER & ROTATOR MODAL
 */
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
        const maxWidth = width - padding;
        const maxHeight = height - padding;

        let axisX = 'w';
        let axisY = 'h';
        if (face === 'left' || face === 'right') axisX = 'd';
        if (face === 'top' || face === 'bottom') axisY = 'd';
        
        const ratio = dimensions[axisX] / dimensions[axisY];
        
        let initialW, initialH;
        if (ratio > 1) {
            initialW = Math.min(320, maxWidth);
            initialH = initialW / ratio;
        } else {
            initialH = Math.min(320, maxHeight);
            initialW = initialH * ratio;
        }

        setCropBox({ w: initialW, h: initialH });
        setIsInitialized(true);
    }
  }, [face, dimensions, isInitialized]);

  const handleImageMouseDown = (e) => {
    e.stopPropagation();
    setIsDraggingImage(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleResizeMouseDown = (e, handle) => {
    e.stopPropagation();
    e.preventDefault(); 
    setResizingHandle(handle);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (isDraggingImage) {
      const dx = clientX - lastPos.current.x;
      const dy = clientY - lastPos.current.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPos.current = { x: clientX, y: clientY };
    } 
    else if (resizingHandle) {
      const dx = clientX - lastPos.current.x;
      const dy = clientY - lastPos.current.y;
      
      if (resizingHandle.includes('r')) {
         setCropBox(prev => ({ ...prev, w: Math.max(50, prev.w + dx) }));
      }
      if (resizingHandle.includes('b')) {
         setCropBox(prev => ({ ...prev, h: Math.max(50, prev.h + dy) }));
      }

      lastPos.current = { x: clientX, y: clientY };
    }
  };

  const handleMouseUp = () => {
    setIsDraggingImage(false);
    setResizingHandle(null);
  };

  const handleTouchStart = (e, type, handle = null) => {
    e.stopPropagation();
    const touch = e.touches[0];
    lastPos.current = { x: touch.clientX, y: touch.clientY };
    if (type === 'image') setIsDraggingImage(true);
    if (type === 'resize') setResizingHandle(handle);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setIsInitialized(false);
  };

  const executeCrop = () => {
    const canvas = document.createElement('canvas');
    const BASE_RES = 600; 
    const ratio = cropBox.w / cropBox.h;
    
    if (ratio > 1) {
        canvas.width = BASE_RES;
        canvas.height = BASE_RES / ratio;
    } else {
        canvas.height = BASE_RES;
        canvas.width = BASE_RES * ratio;
    }
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = imageRef.current;
    
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    
    const scaleFactor = canvas.width / cropBox.w; 
    
    ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor);
    ctx.scale(zoom * scaleFactor, zoom * scaleFactor);
    
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    onCrop(canvas.toDataURL('image/jpeg', 0.8));
  };

  const DimSlider = ({ label, val, axis, active }) => (
    <div className={`flex flex-col ${active ? 'opacity-100' : 'opacity-100'}`}>
        <div className="flex justify-between items-center mb-1">
            <label className={`text-[10px] uppercase font-bold ${active ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500'}`}>{label}</label>
            <div className="flex items-center gap-1">
                <input 
                    type="number" 
                    value={val}
                    onChange={(e) => onDimensionsChange({...dimensions, [axis]: Math.max(1, parseInt(e.target.value) || 0)})}
                    className="w-12 text-right text-xs font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded text-slate-700 dark:text-slate-200 border border-transparent focus:border-orange-500 outline-none"
                />
                <span className="text-[10px] text-slate-400">mm</span>
            </div>
        </div>
        <input 
            type="range" min="1" max={maxDim} step="1"
            value={val}
            onChange={(e) => onDimensionsChange({...dimensions, [axis]: parseInt(e.target.value)})}
            className={`w-full h-3 rounded-full appearance-none cursor-grab active:cursor-grabbing ${active ? 'accent-orange-500 bg-orange-100 dark:bg-orange-900/30' : 'accent-slate-400 bg-slate-200'}`}
        />
    </div>
  );

  return (
    <div 
        className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4 animate-fade-in"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
    >
      <div className="bg-white dark:bg-slate-800 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT: CROP WORKSPACE */}
        <div className="flex-1 flex flex-col bg-slate-900 relative">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            
            <div className="p-4 z-30 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                        <Crop size={14} className="text-cyan-400"/> 
                        Align {face}
                    </h3>
                </div>
                <button 
                    onClick={handleReset}
                    className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-xs font-bold flex items-center gap-2 hover:bg-white/10 transition-colors"
                >
                    <RefreshCcw size={12} /> Reset
                </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing" ref={containerRef}>
                <div 
                    className="relative transition-all duration-75"
                    style={{ width: cropBox.w, height: cropBox.h }}
                >
                    <div className="absolute inset-0 border-[3px] border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.85)] z-20 pointer-events-none">
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                            <div className="border-r border-cyan-400/50"></div><div className="border-r border-cyan-400/50"></div><div></div>
                            <div className="border-t border-cyan-400/50 border-r"></div><div className="border-t border-cyan-400/50 border-r"></div><div className="border-t border-cyan-400/50"></div>
                            <div className="border-t border-cyan-400/50 border-r"></div><div className="border-t border-cyan-400/50 border-r"></div><div className="border-t border-cyan-400/50"></div>
                        </div>
                    </div>

                    <div 
                        className="absolute right-[-12px] top-1/2 -translate-y-1/2 w-6 h-12 bg-white border-2 border-cyan-500 rounded-full z-30 cursor-ew-resize hover:bg-cyan-50 hover:scale-110 transition-all pointer-events-auto shadow-lg flex items-center justify-center"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'r')}
                        onTouchStart={(e) => handleTouchStart(e, 'resize', 'r')}
                    ><Move size={12} className="text-cyan-600 rotate-90"/></div>
                    
                    <div 
                        className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 h-6 w-12 bg-white border-2 border-cyan-500 rounded-full z-30 cursor-ns-resize hover:bg-cyan-50 hover:scale-110 transition-all pointer-events-auto shadow-lg flex items-center justify-center"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'b')}
                        onTouchStart={(e) => handleTouchStart(e, 'resize', 'b')}
                    ><Move size={12} className="text-cyan-600"/></div>
                    
                    <div 
                        className="absolute bottom-[-10px] right-[-10px] w-8 h-8 bg-cyan-500 border-4 border-white rounded-full z-30 cursor-nwse-resize hover:scale-110 transition-transform pointer-events-auto shadow-xl"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'rb')}
                        onTouchStart={(e) => handleTouchStart(e, 'resize', 'rb')}
                    />

                    <div 
                        className="absolute inset-0 overflow-visible pointer-events-auto"
                        onMouseDown={handleImageMouseDown}
                        onTouchStart={(e) => handleTouchStart(e, 'image')}
                    >
                        <img 
                            ref={imageRef}
                            src={imageSrc} 
                            alt="Crop target"
                            className="absolute max-w-none origin-center"
                            style={{ 
                                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                                left: '50%',
                                top: '50%',
                                userSelect: 'none',
                                pointerEvents: 'none'
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="p-3 bg-black/40 text-center text-white/60 text-xs border-t border-white/5 z-30">
                Drag <span className="text-cyan-400 font-bold">Cyan Handles</span> to resize crop box. Drag <span className="text-white font-bold">Image</span> to align.
            </div>
        </div>

        {/* RIGHT: CONTROLS PANEL */}
        <div className="w-full md:w-80 bg-white dark:bg-slate-900 p-6 flex flex-col gap-6 border-l dark:border-slate-700 overflow-y-auto z-40">
            <div className="flex justify-between items-center md:hidden">
                <h3 className="font-bold dark:text-white">Editor Controls</h3>
                <button onClick={onCancel}><X size={24} className="text-slate-500" /></button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <Maximize2 size={18} className="text-orange-500"/>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">3D Size</h4>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Limit:</span>
                        <input 
                            type="number" 
                            value={maxDim} 
                            onChange={(e) => setMaxDim(Math.max(100, parseInt(e.target.value) || 300))}
                            className="w-12 text-center text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-slate-600 dark:text-slate-300"
                        />
                    </div>
                </div>
                <div className="space-y-5">
                    <DimSlider label="Width" val={dimensions.w} axis="w" active={true} />
                    <DimSlider label="Height" val={dimensions.h} axis="h" active={true} />
                    <DimSlider label="Depth" val={dimensions.d} axis="d" active={true} />
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500 block">ZOOM</label>
                        <span className="text-xs text-slate-400">{zoom.toFixed(2)}x</span>
                    </div>
                    <input 
                        type="range" min="0.1" max="5" step="0.05" 
                        value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-500"
                    />
                </div>
                <div>
                    <div className="flex justify-between mb-2 items-center">
                        <label className="text-xs font-bold text-slate-500 block">ROTATE</label>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setRotation(r => r - 90)} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" title="Rotate Left 90°">
                                <RotateCcw size={14} />
                            </button>
                            <button onClick={() => setRotation(r => r + 90)} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" title="Rotate Right 90°">
                                <RotateCw size={14} />
                            </button>
                            <div className="flex items-center ml-2">
                                <input 
                                    type="number" 
                                    value={rotation} 
                                    onChange={(e) => setRotation(parseFloat(e.target.value) || 0)}
                                    className="w-12 text-right text-xs font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded text-slate-700 dark:text-slate-200 border border-transparent focus:border-cyan-500 outline-none"
                                />
                                <span className="text-xs text-slate-400 ml-1">°</span>
                            </div>
                        </div>
                    </div>
                    <input 
                        type="range" min="-180" max="180" step="1" 
                        value={rotation} onChange={(e) => setRotation(parseFloat(e.target.value))}
                        className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-500"
                    />
                </div>
            </div>

            <div className="mt-auto pt-4 flex gap-3">
                <button onClick={onCancel} className="px-6 py-4 rounded-xl bg-slate-100 dark:bg-slate-800 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors">
                    Cancel
                </button>
                <button onClick={executeCrop} className="flex-1 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/40 transition-all transform active:scale-95">
                    <Crop size={20}/> Crop & Save
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

/**
 * COMPONENT: CAPYBARA MASCOT
 */
const CapybaraMascot = ({ mood = 'happy', message, onClick, customImage }) => {
  const [isBouncing, setIsBouncing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 500);
    }, 5000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end cursor-pointer group"
      onClick={onClick}
    >
      {message && (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-t-xl rounded-bl-xl shadow-lg border-2 border-orange-400 mb-2 max-w-xs animate-fade-in-up">
          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{message}</p>
        </div>
      )}
      <div className={`transition-transform duration-300 ${isBouncing ? '-translate-y-2' : ''} hover:scale-110 drop-shadow-xl`}>
         <img 
            src={customImage || "/capybara.jpg"} 
            alt="Mascot" 
            className="w-24 h-24 rounded-full border-4 border-orange-500 object-cover shadow-lg bg-orange-100"
            onError={(e) => {e.target.onerror = null; e.target.src="https://api.dicebear.com/7.x/avataaars/svg?seed=Capy"}}
         />
      </div>
    </div>
  );
};

/**
 * COMPONENT: DYNAMIC 3D BOX EXAMINE VIEWER
 */
const ExamineModal = ({ product, onClose, onUpdateProduct, isAdmin }) => {
  const [rotation, setRotation] = useState({ x: -15, y: 25 });
  const [isDragging, setIsDragging] = useState(false);
  const [viewScale, setViewScale] = useState(2.8);
  const [isScaleLocked, setIsScaleLocked] = useState(false);
  
  const lastMousePos = useRef({ x: 0, y: 0 });

  const [dimensions, setDimensions] = useState(product.dimensions || { w: 55, h: 90, d: 22 });
  const initialRotation = { x: -15, y: 25 };

  const handleDimensionsChange = (newDims) => {
    setDimensions(newDims);
    if (onUpdateProduct) {
        onUpdateProduct({ ...product, dimensions: newDims });
    }
  };

  const handleReset = () => {
    setRotation(initialRotation);
    setViewScale(2.8);
  };

  const handleZoom = (delta) => {
    if (isScaleLocked) return;
    setViewScale(prev => Math.min(5, Math.max(0.5, prev + delta)));
  };

  const w = dimensions.w * viewScale;
  const h = dimensions.h * viewScale;
  const d = dimensions.d * viewScale;

  const handleMouseDown = (e) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    setRotation(prev => ({ x: prev.x - deltaY * 0.5, y: prev.y + deltaX * 0.5 }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleTouchStart = (e) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - lastMousePos.current.x;
    const deltaY = e.touches[0].clientY - lastMousePos.current.y;
    setRotation(prev => ({ x: prev.x - deltaY * 0.5, y: prev.y + deltaX * 0.5 }));
    lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const renderFace = (imageSrc, defaultColor = "bg-white") => {
    if (imageSrc) {
        return <img src={imageSrc} className="w-full h-full object-cover" alt="texture" />;
    }
    return <div className={`w-full h-full ${defaultColor} border border-slate-400 opacity-90`}></div>;
  };

  const images = product.images || {};
  const frontImage = images.front || product.image;
  // Apply "Same Front/Back" logic for viewing
  const backImage = product.useFrontForBack ? frontImage : images.back;

  const BoxSlider = ({ label, val, axis }) => (
    <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] text-white/70 uppercase font-bold">
            <span>{label}</span>
            <span>{val}mm</span>
        </div>
        <input 
            type="range" min="10" max="300" step="1"
            value={val}
            onChange={(e) => handleDimensionsChange({ ...dimensions, [axis]: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-orange-500"
            onMouseDown={(e) => e.stopPropagation()} 
            onTouchStart={(e) => e.stopPropagation()}
        />
    </div>
  );

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4 overflow-hidden"
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleMouseUp}
    >
      <button onClick={onClose} className="absolute top-8 right-8 text-white hover:text-red-500 z-50 p-2 bg-black/20 rounded-full">
        <X size={40} />
      </button>
      
      {/* ZOOM & VIEW CONTROLS (AVAILABLE TO EVERYONE) */}
      <div 
        className="absolute top-8 right-24 z-50 flex gap-2"
        onMouseDown={(e) => e.stopPropagation()}
      >
         <button onClick={() => handleZoom(-0.2)} className="p-2 bg-black/60 text-white rounded-full hover:bg-white/20" title="Zoom Out"><ZoomOut size={18}/></button>
         <button onClick={() => setIsScaleLocked(!isScaleLocked)} className={`p-2 rounded-full hover:bg-white/20 ${isScaleLocked ? 'bg-orange-600 text-white' : 'bg-black/60 text-white'}`} title="Lock Size">
            {isScaleLocked ? <Lock size={18}/> : <Unlock size={18}/>}
         </button>
         <button onClick={() => handleZoom(0.2)} className="p-2 bg-black/60 text-white rounded-full hover:bg-white/20" title="Zoom In"><ZoomIn size={18}/></button>
      </div>

      {/* 3D CONTROLS PANEL (ADMIN ONLY) */}
      {isAdmin && (
        <div 
            className="absolute top-8 left-8 z-50 bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-xl w-48 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Maximize2 size={12} className="text-orange-500"/> Dimensions
                </h4>
                <button 
                    onClick={handleReset} 
                    className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                    title="Reset View & Rotation"
                >
                    <RefreshCcw size={10} /> Reset
                </button>
            </div>
            <div className="space-y-4">
                <BoxSlider label="Width" val={dimensions.w} axis="w" />
                <BoxSlider label="Height" val={dimensions.h} axis="h" />
                <BoxSlider label="Depth" val={dimensions.d} axis="d" />
            </div>
        </div>
      )}

      <div className="text-white mb-12 text-center font-mono pointer-events-none select-none mt-20 md:mt-0">
        <h2 className="text-3xl font-bold tracking-[0.2em] uppercase text-orange-500 drop-shadow-lg">{product.name}</h2>
        <p className="text-emerald-400 text-xs mt-2 tracking-widest animate-pulse">DRAG TO ROTATE OBJECT</p>
      </div>

      <div className="relative w-full max-w-md h-[400px] flex items-center justify-center perspective-1000 cursor-move">
        <div 
          className="relative preserve-3d"
          style={{
            width: `${w}px`, 
            height: `${h}px`,
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transformStyle: 'preserve-3d',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {/* FRONT */}
          <div className="absolute inset-0 bg-white backface-hidden flex items-center justify-center border border-slate-400" 
               style={{ width: w, height: h, transform: `translateZ(${d / 2}px)` }}>
             {frontImage ? <img src={frontImage} className="w-full h-full object-cover"/> : <span className="text-4xl">🚬</span>}
             <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
          </div>
          {/* BACK */}
          <div className="absolute inset-0 bg-slate-800 backface-hidden flex items-center justify-center border border-slate-600" 
               style={{ width: w, height: h, transform: `rotateY(180deg) translateZ(${d / 2}px)` }}>
             {renderFace(backImage, "bg-slate-800")}
          </div>
          {/* RIGHT */}
          <div className="absolute" 
               style={{ width: d, height: h, transform: `rotateY(90deg) translateZ(${w / 2}px)`, left: (w - d)/2 }}>
             {renderFace(images.right, "bg-slate-200")}
          </div>
          {/* LEFT */}
          <div className="absolute" 
               style={{ width: d, height: h, transform: `rotateY(-90deg) translateZ(${w / 2}px)`, left: (w - d)/2 }}>
             {renderFace(images.left, "bg-slate-200")}
          </div>
          {/* TOP */}
          <div className="absolute" 
               style={{ width: w, height: d, transform: `rotateX(90deg) translateZ(${h / 2}px)`, top: (h - d)/2 }}>
             {renderFace(images.top, "bg-slate-300")}
          </div>
          {/* BOTTOM */}
          <div className="absolute" 
               style={{ width: w, height: d, transform: `rotateX(-90deg) translateZ(${h / 2}px)`, top: (h - d)/2 }}>
             {renderFace(images.bottom, "bg-slate-300")}
          </div>
        </div>
      </div>

      <div className="mt-8 w-full max-w-2xl bg-black/60 border-t border-b border-orange-500/50 p-6 backdrop-blur-md pointer-events-none select-none">
        <div className="flex justify-between items-start mb-2 font-mono text-xs text-orange-300">
           <span>STOCK: {product.stock} Bks</span>
           <span>TYPE: {product.type}</span>
           <span>CUKAI: {product.taxStamp}</span>
        </div>
        <p className="text-white font-serif text-lg leading-relaxed text-center shadow-black drop-shadow-md">
          "{product.description || "A standard pack of cigarettes. No unusual properties detected."}"
        </p>
      </div>
    </div>
  );
};

/**
 * COMPONENT: RETURN MODAL
 */
const ReturnModal = ({ transaction, onClose, onConfirm }) => {
  const [returnQtys, setReturnQtys] = useState({});

  useEffect(() => {
    const initial = {};
    if(transaction.items) {
        transaction.items.forEach(item => initial[item.productId] = 0);
    }
    setReturnQtys(initial);
  }, [transaction]);

  const handleQtyChange = (productId, val, max) => {
    let newQty = parseInt(val) || 0;
    if (newQty < 0) newQty = 0;
    if (newQty > max) newQty = max;
    setReturnQtys(prev => ({ ...prev, [productId]: newQty }));
  };

  const handleConfirm = () => {
    onConfirm(returnQtys);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scale-in">
         <h2 className="text-xl font-bold dark:text-white mb-2">Process Return / Adjustment</h2>
         <p className="text-sm text-slate-500 mb-4">Specify quantity returning to your inventory.</p>
         <div className="space-y-3 max-h-[60vh] overflow-y-auto mb-4">
            {transaction.items && transaction.items.map(item => (
               <div key={item.productId} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                  <div>
                      <p className="font-bold text-sm dark:text-white">{item.name}</p>
                      <p className="text-xs text-slate-500">Max Return: {item.qty} {item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="text-xs text-orange-500 font-bold">Qty:</span>
                      <input type="number" value={returnQtys[item.productId] || 0} onChange={(e) => handleQtyChange(item.productId, e.target.value, item.qty)} className="w-16 p-1 rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white text-center"/>
                  </div>
               </div>
            ))}
         </div>
         <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white">Cancel</button>
            <button onClick={handleConfirm} className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-bold">Confirm</button>
         </div>
      </div>
    </div>
  );
};

// --- COMPONENT: CONSIGNMENT (TITIP) MANAGEMENT ---
const ConsignmentView = ({ transactions, inventory, onAddGoods, onPayment, onReturn, onDeleteConsignment }) => {
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [settleMode, setSettleMode] = useState(false);
    const [returnMode, setReturnMode] = useState(false);
    const [itemQtys, setItemQtys] = useState({});

    // 1. Group Data by Customer to find active consignments (Normalized to Bks, Grouped by Price Tier)
    const customerData = useMemo(() => {
        const customers = {};
        
        // Sort oldest first to calculate stock history correctly
        const sortedTransactions = [...transactions].sort((a, b) => {
            const tA = a.timestamp?.seconds || 0;
            const tB = b.timestamp?.seconds || 0;
            return tA - tB;
        });

        sortedTransactions.forEach(t => {
            if (!t.customerName) return;
            const name = t.customerName.trim(); 
            if (!customers[name]) customers[name] = { name, items: {}, balance: 0, lastActivity: t.date };
            
            const getProduct = (pid) => inventory.find(p => p.id === pid);

            if (t.type === 'SALE' && t.paymentType === 'Titip') {
                customers[name].balance += t.total;
                t.items.forEach(item => {
                    const product = getProduct(item.productId);
                    const bksQty = convertToBks(item.qty, item.unit, product);
                    // Use composite key to separate different price tiers/units if needed
                    // For now, let's group by product + tier
                    const itemKey = `${item.productId}-${item.priceTier || 'Standard'}`;
                    
                    if(!customers[name].items[itemKey]) {
                        customers[name].items[itemKey] = { 
                            ...item, 
                            qty: 0, 
                            unit: 'Bks', // Normalize internal tracking to Bks
                            calculatedPrice: item.calculatedPrice / convertToBks(1, item.unit, product) // Normalize price per Bks
                        };
                    }
                    customers[name].items[itemKey].qty += bksQty;
                });
            }
            
            if (t.type === 'RETURN') {
                customers[name].balance += t.total; 
                t.items.forEach(item => {
                    const product = getProduct(item.productId);
                    const bksQty = convertToBks(item.qty, item.unit, product);
                    // Find matching item key or reduce from any available batch of same product?
                    // To imply exact match, we assume return transaction stores tier info if possible.
                    // If not, we try to reduce from any batch. 
                    // Simplified: Try finding exact key, else find any key with product id.
                    const itemKey = `${item.productId}-${item.priceTier || 'Standard'}`;
                    if(customers[name].items[itemKey]) {
                        customers[name].items[itemKey].qty -= bksQty;
                    } else {
                        // Fallback: reduce from first batch of this product found
                        const altKey = Object.keys(customers[name].items).find(k => k.startsWith(item.productId));
                        if(altKey) customers[name].items[altKey].qty -= bksQty;
                    }
                });
            }

            if (t.type === 'CONSIGNMENT_PAYMENT') {
                customers[name].balance -= t.amountPaid;
                t.itemsPaid.forEach(item => {
                    const product = getProduct(item.productId);
                    // Payment items are typically recorded in Bks from this view
                    const bksQty = convertToBks(item.qty, item.unit, product);
                    const itemKey = `${item.productId}-${item.priceTier || 'Standard'}`; // Consistent Keying
                     if(customers[name].items[itemKey]) {
                        customers[name].items[itemKey].qty -= bksQty;
                    }
                });
            }
        });

        // Cleanup
        Object.values(customers).forEach(c => {
            c.balance = Math.max(0, c.balance);
            Object.keys(c.items).forEach(k => {
                c.items[k].qty = Math.max(0, c.items[k].qty);
            });
        });

        return Object.values(customers).filter(c => c.balance > 0 || Object.values(c.items).some(i => i.qty > 0));
    }, [transactions, inventory]);

    const activeCustomer = selectedCustomer ? customerData.find(c => c.name === selectedCustomer.name) || selectedCustomer : null;

    const handleQtyInput = (key, val, max) => {
        let q = parseInt(val) || 0;
        if(q < 0) q = 0; 
        setItemQtys(p => ({...p, [key]: q}));
    };

    const submitAction = () => {
        const itemsToProcess = [];
        let totalValue = 0;
        
        Object.entries(itemQtys).forEach(([key, qty]) => {
            if(qty > 0) {
                const item = activeCustomer.items[key];
                // Process in Bks
                itemsToProcess.push({ 
                    productId: item.productId, 
                    name: item.name, 
                    qty, 
                    priceTier: item.priceTier, // Pass tier info for history
                    calculatedPrice: item.calculatedPrice, // Price is per Bks here
                    unit: 'Bks' 
                });
                totalValue += (item.calculatedPrice * qty);
            }
        });

        if(itemsToProcess.length === 0) return;

        if (settleMode) {
            onPayment(activeCustomer.name, itemsToProcess, totalValue);
        } else if (returnMode) {
            onReturn(activeCustomer.name, itemsToProcess, totalValue);
        }
        
        setSettleMode(false);
        setReturnMode(false);
        setItemQtys({});
    };

    const formatStockDisplay = (qty, product) => {
        if (!product) return `${qty} Bks`;
        const packsPerSlop = product.packsPerSlop || 10;
        const slops = Math.floor(qty / packsPerSlop);
        const bks = qty % packsPerSlop;
        if (slops > 0) {
            return `${qty} Bks (${slops} Slop ${bks > 0 ? `+ ${bks} Bks` : ''})`;
        }
        return `${qty} Bks`;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] animate-fade-in">
            {/* Left: Customer List */}
            <div className={`lg:w-1/3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 flex flex-col ${selectedCustomer ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 border-b dark:border-slate-700">
                    <h2 className="font-bold text-lg dark:text-white flex items-center gap-2"><Truck size={20}/> Active Consignments</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {customerData.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">No active consignments found. Create a "Titip" sale in Sales POS to start.</div>
                    ) : (
                        customerData.map(c => (
                            <div key={c.name} onClick={() => setSelectedCustomer(c)} className={`p-4 border-b dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedCustomer?.name === c.name ? 'bg-orange-50 dark:bg-slate-700 border-l-4 border-l-orange-500' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold dark:text-white">{c.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">{c.lastActivity}</span>
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteConsignment(c.name); }} className="text-slate-400 hover:text-red-500 p-1" title="Clear History">
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2 flex justify-between items-center">
                                    <span className="text-xs bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded dark:text-slate-300">
                                        {Object.values(c.items).reduce((a,b)=>a+b.qty,0)} Bks Held
                                    </span>
                                    <span className="font-mono font-bold text-emerald-600">{formatRupiah(c.balance)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right: Detail View */}
            <div className={`lg:w-2/3 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 ${!selectedCustomer ? 'hidden lg:flex justify-center items-center' : 'flex'}`}>
                {!selectedCustomer ? (
                    <div className="text-center text-slate-400">
                        <Store size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>Select a customer to view details</p>
                    </div>
                ) : (
                    <>
                        <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-2xl">
                            <div>
                                <div className="flex items-center gap-2 lg:hidden mb-2 text-slate-400" onClick={() => setSelectedCustomer(null)}>
                                    <ArrowRight className="rotate-180" size={16}/> Back
                                </div>
                                <h2 className="text-2xl font-bold dark:text-white">{activeCustomer?.name}</h2>
                                <p className="text-sm text-slate-500">Consignment Status</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Outstanding Balance</p>
                                <p className="text-2xl font-bold text-orange-500">{formatRupiah(activeCustomer?.balance || 0)}</p>
                            </div>
                        </div>

                        {/* Inventory At Customer */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <h3 className="font-bold mb-4 dark:text-white flex items-center gap-2"><Package size={18}/> Goods at Customer (Belum Laku)</h3>
                            <div className="space-y-3">
                                {Object.entries(activeCustomer?.items || {}).filter(([k, i]) => i.qty > 0).map(([key, item]) => {
                                    const product = inventory.find(p => p.id === item.productId);
                                    return (
                                        <div key={key} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                                            <div>
                                                <p className="font-bold dark:text-white">{item.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{item.priceTier || 'Standard'}</span>
                                                    <p className="text-xs text-slate-500">{formatRupiah(item.calculatedPrice)} / Bks</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-lg font-bold dark:text-white">{formatStockDisplay(item.qty, product)}</p>
                                                    <p className="text-[10px] text-slate-400">Total Held</p>
                                                </div>
                                                {(settleMode || returnMode) && (
                                                    <div className="flex items-center gap-2 animate-fade-in-right">
                                                        <ArrowRight size={14} className="text-slate-400"/>
                                                        <input 
                                                            type="number" 
                                                            className={`w-24 p-2 rounded border text-center ${returnMode ? 'border-red-400 bg-red-50 text-red-600' : 'border-emerald-400 bg-emerald-50 text-emerald-600'}`}
                                                            placeholder="Qty (Bks)"
                                                            value={itemQtys[key] || ''}
                                                            onChange={(e) => handleQtyInput(key, e.target.value, item.qty)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
                            {(!settleMode && !returnMode) ? (
                                <div className="grid grid-cols-3 gap-3">
                                    <button onClick={() => onAddGoods(activeCustomer?.name)} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:bg-orange-50 dark:hover:bg-slate-700 hover:border-orange-500 transition-all group">
                                        <Plus size={24} className="text-orange-500 mb-1 group-hover:scale-110 transition-transform"/>
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Add Goods</span>
                                    </button>
                                    <button onClick={() => setSettleMode(true)} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-700 hover:border-emerald-500 transition-all group">
                                        <Wallet size={24} className="text-emerald-500 mb-1 group-hover:scale-110 transition-transform"/>
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Record Payment</span>
                                    </button>
                                    <button onClick={() => setReturnMode(true)} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl hover:bg-red-50 dark:hover:bg-slate-700 hover:border-red-500 transition-all group">
                                        <RotateCcw size={24} className="text-red-500 mb-1 group-hover:scale-110 transition-transform"/>
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Process Return</span>
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className={`mb-3 p-2 rounded text-center text-sm font-bold ${settleMode ? 'text-emerald-600 bg-emerald-100' : 'text-red-600 bg-red-100'}`}>
                                        {settleMode ? "Select items sold & paid for (in Bks)" : "Select items returned unsold (in Bks)"}
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => { setSettleMode(false); setReturnMode(false); setItemQtys({}); }} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300">Cancel</button>
                                        <button onClick={submitAction} className={`flex-1 py-3 rounded-xl font-bold text-white ${settleMode ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
                                            Confirm {settleMode ? 'Payment' : 'Return'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

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

const CustomerManagement = ({ customers, db, appId, user, logAudit, triggerCapy }) => {
    const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
    const [editingId, setEditingId] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        try {
            if (editingId) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', editingId), {
                    ...formData, name: formData.name.trim(), updatedAt: serverTimestamp()
                });
                await logAudit("CUSTOMER_UPDATE", `Updated customer: ${formData.name}`);
                triggerCapy("Customer updated successfully!");
                setEditingId(null);
            } else {
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'customers'), {
                    ...formData, name: formData.name.trim(), createdAt: serverTimestamp()
                });
                await logAudit("CUSTOMER_ADD", `Added customer: ${formData.name}`);
                triggerCapy("Customer added to directory!");
            }
            setFormData({ name: '', phone: '', address: '' });
        } catch (err) { console.error(err); }
    };

    const handleEdit = (customer) => {
        setFormData({ name: customer.name, phone: customer.phone, address: customer.address });
        setEditingId(customer.id);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
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
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-sm text-slate-500 uppercase">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>
                        {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({name:'', phone:'', address:''}); }} className="text-xs text-red-500 hover:underline">Cancel Edit</button>}
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="text-xs font-bold text-slate-500 uppercase">Store Name</label>
                            <input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="e.g. Toko Aneka" required/>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                            <input value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="0812..." />
                        </div>
                        <div className="flex-[2] w-full">
                            <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                            <input value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="Jl. Sudirman No. 1" />
                        </div>
                        <button className={`text-white px-6 py-2 rounded-lg font-bold h-10 ${editingId ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
                            {editingId ? 'Update' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.map(c => (
                    <div key={c.id} className={`bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 shadow-sm flex justify-between items-start ${editingId === c.id ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-slate-700' : ''}`}>
                        <div>
                            <h3 className="font-bold text-lg dark:text-white">{c.name}</h3>
                            {c.phone && <p className="text-sm text-slate-500 flex items-center gap-1"><Phone size={12}/> {c.phone}</p>}
                            {c.address && <p className="text-sm text-slate-500 flex items-center gap-1 mt-1"><MapPin size={12}/> {c.address}</p>}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(c)} className="text-slate-400 hover:text-blue-500"><Edit size={16}/></button>
                            <button onClick={() => handleDelete(c.id, c.name)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HistoryReportView = ({ transactions, onDelete }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const customerStats = useMemo(() => {
    const stats = {};
    transactions.forEach(t => {
      const name = t.customerName || 'Unknown';
      if (!stats[name]) stats[name] = { name, count: 0, total: 0, lastDate: t.date, history: [] };
      stats[name].count += 1;
      if (t.type === 'SALE' || t.type === 'RETURN') stats[name].total += t.total || 0; 
      if (t.date > stats[name].lastDate) stats[name].lastDate = t.date;
      stats[name].history.push(t);
    });
    return Object.values(stats).sort((a,b) => b.total - a.total);
  }, [transactions]);

  if (!selectedCustomer) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><FileText size={24} className="text-orange-500"/> Transaction History Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customerStats.map(c => (
            <div key={c.name} onClick={() => setSelectedCustomer(c)} className="relative bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-orange-500 group">
              <button onClick={(e) => { e.stopPropagation(); onDelete(c.name); }} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors z-10"><Trash2 size={16} /></button>
              <div className="flex items-start justify-between mb-4"><div className="p-3 bg-orange-100 dark:bg-slate-700 rounded-lg text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Folder size={24} /></div><span className="text-xs font-mono text-slate-400 mr-8">{c.lastDate}</span></div>
              <h3 className="font-bold text-lg dark:text-white mb-1 truncate">{c.name}</h3>
              <div className="flex justify-between items-end mt-4"><div><p className="text-xs text-slate-500 uppercase">Lifetime Value</p><p className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(c.total)}</p></div><div className="text-right"><p className="text-xs text-slate-500 uppercase">Transactions</p><p className="font-bold dark:text-white">{c.count}</p></div></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const groupedByMonth = selectedCustomer.history.reduce((groups, t) => {
    const date = new Date(t.date);
    const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
    return groups;
  }, {});

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
       <button onClick={() => setSelectedCustomer(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Folders</button>
       <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 overflow-hidden">
          <div className="bg-slate-900 text-white p-8"><div className="flex justify-between items-start"><div><p className="text-orange-500 font-bold tracking-widest text-xs uppercase mb-1">Customer Performance Report</p><h1 className="text-3xl font-bold font-serif">{selectedCustomer.name}</h1></div><div className="text-right"><p className="text-sm opacity-70">Total Lifetime Value</p><p className="text-2xl font-bold">{formatRupiah(selectedCustomer.total)}</p></div></div></div>
          <div className="p-8">
             {Object.entries(groupedByMonth).map(([month, trans]) => (
                <div key={month} className="mb-8 last:mb-0">
                   <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 border-b-2 border-orange-500 inline-block mb-4 pb-1">{month}</h3>
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left"><thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase text-xs font-bold"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Details</th><th className="p-3 text-right">Amount</th></tr></thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{trans.map(t => (<tr key={t.id}><td className="p-3 font-mono text-slate-600 dark:text-slate-400">{t.date}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.type === 'SALE' ? 'bg-emerald-100 text-emerald-700' : t.type === 'RETURN' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{t.type.replace('_', ' ')}</span></td><td className="p-3 text-slate-600 dark:text-slate-300">{t.items ? `${t.items.length} Items` : t.itemsPaid ? `Payment for ${t.itemsPaid.length} Items` : 'N/A'}{t.paymentType === 'Titip' && <span className="ml-2 text-xs text-orange-500 font-bold">(Consignment)</span>}</td><td className={`p-3 text-right font-bold ${t.total < 0 ? 'text-red-500' : 'text-slate-700 dark:text-white'}`}>{formatRupiah(t.amountPaid || t.total)}</td></tr>))}</tbody>
                       </table>
                   </div>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};

// --- FEATURES ---

const AdminUserManager = ({ db, appId }) => {
    const [users, setUsers] = useState([]);
    useEffect(() => onSnapshot(collection(db, `artifacts/${appId}/metadata/users`), s => setUsers(s.docs.map(d=>({id:d.id, ...d.data()})))), [db, appId]);
    const toggle = async (uid, status) => updateDoc(doc(db, `artifacts/${appId}/metadata/users`, uid), { status: status==='approved'?'pending':'approved' });
    return (
        <div className="overflow-hidden mt-6 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-sm">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700 font-bold dark:text-white">User Access Management</div>
            <table className="w-full text-sm text-left">
                <tbody>{users.map(u => (<tr key={u.id} className="border-b dark:border-slate-700"><td className="p-4 font-medium dark:text-white">{u.email}</td><td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.status==='approved'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{u.status}</span></td><td className="p-4 text-right"><button onClick={()=>toggle(u.id, u.status)} className="text-blue-500 hover:underline">{u.status==='approved'?'Revoke':'Approve'}</button></td></tr>))}</tbody>
            </table>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
export default function KPMInventoryApp() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [appSettings, setAppSettings] = useState({ mascotImage: '', companyName: 'KPM Inventory', mascotMessage: '' });

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
  
  // Capybara Message
  const [capyMsg, setCapyMsg] = useState("Welcome to KPM Inventory!");
  const [showCapyMsg, setShowCapyMsg] = useState(false);
  
  // Feature State
  const [editMascotMessage, setEditMascotMessage] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  const capyMessages = [
    "Welcome back, Boss! Stock looks good today.",
    "Checking the inventory...",
    "Don't forget to record samples!",
    "Sales are looking up!",
    "Need to restock soon?"
  ];

  // --- AUTHENTICATION FLOW ---
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        // Automatic Admin Check (No Password) - Based on email
        if (currentUser?.email === ADMIN_EMAIL) {
            setIsAdmin(true);
        } else {
            setIsAdmin(false);
        }

        if (currentUser?.email) setCurrentUserEmail(currentUser.email);
    });
    return () => unsubAuth();
  }, []);

  // --- DATA SYNC ---
  useEffect(() => {
    if (!user || !user.uid) return;

    const basePath = `artifacts/${appId}/users/${user.uid}`;
    
    const unsubSettings = onSnapshot(doc(db, basePath, 'settings', 'general'), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            setAppSettings(data);
            // Safe fallback with optional chaining
            setEditMascotMessage(data?.mascotMessage || "");
            setEditCompanyName(data?.companyName || "KPM Inventory");
            if (data?.mascotMessage) {
                setCapyMsg(data.mascotMessage);
                setShowCapyMsg(true);
                setTimeout(() => setShowCapyMsg(false), 5000);
            }
        } else {
            setDoc(doc(db, basePath, 'settings', 'general'), { companyName: 'KPM Inventory' });
        }
    });

    const unsubInv = onSnapshot(collection(db, basePath, 'products'), (snap) => setInventory(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubTrans = onSnapshot(query(collection(db, basePath, 'transactions'), orderBy('timestamp', 'desc')), (snap) => setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubSamp = onSnapshot(query(collection(db, basePath, 'samplings'), orderBy('timestamp', 'desc')), (snap) => setSamplings(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubLogs = onSnapshot(query(collection(db, basePath, 'audit_logs'), orderBy('timestamp', 'desc')), (snap) => setAuditLogs(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubCust = onSnapshot(query(collection(db, basePath, 'customers'), orderBy('name', 'asc')), (snap) => setCustomers(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    const savedTheme = localStorage.getItem('kpm_theme');
    if (savedTheme === 'light') setDarkMode(false);

    return () => {
        unsubSettings(); unsubInv(); unsubTrans(); unsubSamp(); unsubLogs(); unsubCust();
    };
  }, [user]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kpm_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kpm_theme', 'light');
    }
  }, [darkMode]);

  const handleLogin = async () => {
      try { await signInWithPopup(auth, googleProvider); } catch (error) { console.error("Login failed", error); alert("Login failed: " + error.message); }
  };

  const handleLogout = async () => {
      await signOut(auth);
      setUser(null);
      setInventory([]);
      setTransactions([]);
  };

  // --- ACTIONS ---
  const logAudit = async (action, details) => { try { if(user) await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/audit_logs`), { action, details, timestamp: serverTimestamp() }); } catch (err) {} };
  const triggerCapy = (msg) => { const message = msg || appSettings?.mascotMessage || capyMessages[Math.floor(Math.random() * capyMessages.length)]; setCapyMsg(message); setShowCapyMsg(true); setTimeout(() => setShowCapyMsg(false), 4000); };
  
  const handleSaveMascotMessage = async () => { 
      if(user) { 
          await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { mascotMessage: editMascotMessage }, {merge: true}); 
          logAudit("SETTINGS_UPDATE", "Updated Mascot Message"); 
          triggerCapy(editMascotMessage); 
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
  const handleSaveProduct = async (e) => { e.preventDefault(); if (!user) return; try { const formData = new FormData(e.target); const data = Object.fromEntries(formData.entries()); const numFields = ['stock', 'priceRetail', 'priceGrosir', 'priceEcer']; numFields.forEach(field => data[field] = Number(data[field]) || 0); data.images = { ...(editingProduct?.images || {}), ...tempImages }; data.dimensions = { ...boxDimensions }; data.useFrontForBack = useFrontForBack; data.updatedAt = serverTimestamp(); if (editingProduct?.id) { await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, editingProduct.id), data); await logAudit("PRODUCT_UPDATE", `Updated product: ${data.name}`); triggerCapy("Product updated successfully!"); } else { data.createdAt = serverTimestamp(); await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/products`), data); await logAudit("PRODUCT_ADD", `Added new product: ${data.name}`); triggerCapy("New product added!"); } setEditingProduct(null); setTempImages({}); setUseFrontForBack(false); } catch (err) { console.error(err); triggerCapy("Error saving product!"); } };
  const handleUpdateProduct = async (updatedProduct) => { setInventory(prev => prev.map(item => item.id === updatedProduct.id ? updatedProduct : item)); if (editingProduct && editingProduct.id === updatedProduct.id) { setEditingProduct(updatedProduct); } if(isAdmin && user && updatedProduct.id) { try { await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, updatedProduct.id), { dimensions: updatedProduct.dimensions }); } catch(e) {} } };
  const deleteProduct = async (id) => { if (window.confirm("Are you sure you want to delete this product?")) { try { await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, id)); await logAudit("PRODUCT_DELETE", `Deleted product ID: ${id}`); triggerCapy("Item removed."); } catch (err) { triggerCapy("Delete failed"); } } };
  const handleOpnameChange = (id, val) => { setOpnameData(prev => ({ ...prev, [id]: val })); };
  const handleOpnameSubmit = async () => { if (!user) return; const updates = []; inventory.forEach(item => { const actual = opnameData[item.id]; if (actual !== undefined && actual !== item.stock && !isNaN(actual)) { updates.push({ id: item.id, name: item.name, old: item.stock, new: actual }); } }); if (updates.length === 0) { triggerCapy("No changes to save!"); return; } if (!window.confirm(`Confirm stock adjustment for ${updates.length} items?`)) return; try { await runTransaction(db, async (transaction) => { updates.forEach(update => { const ref = doc(db, `artifacts/${appId}/users/${user.uid}/products`, update.id); transaction.update(ref, { stock: update.new }); }); }); updates.forEach(u => { logAudit("STOCK_OPNAME", `Adjusted ${u.name}: ${u.old} -> ${u.new}`); }); setOpnameData({}); triggerCapy("Stock Opname saved successfully!"); } catch (err) { console.error(err); alert("Failed to update stock: " + err.message); } };
  const addToCart = (product) => { setCart(prev => { const existing = prev.find(item => item.productId === product.id); if (existing) return prev.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item); return [...prev, { productId: product.id, name: product.name, qty: 1, unit: 'Bks', priceTier: 'Retail', calculatedPrice: product.priceRetail, product }]; }); };
  const updateCartItem = (productId, field, value) => { setCart(prev => prev.map(item => { if (item.productId === productId) { const newItem = { ...item, [field]: value }; const { unit, priceTier: tier, product: prod } = newItem; let base = 0; if (tier === 'Ecer') base = prod.priceEcer || 0; if (tier === 'Retail') base = prod.priceRetail || 0; if (tier === 'Grosir') base = prod.priceGrosir || 0; let mult = 1; if (unit === 'Slop') mult = prod.packsPerSlop || 10; if (unit === 'Bal') mult = (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10); if (unit === 'Karton') mult = (prod.balsPerCarton || 4) * (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10); newItem.calculatedPrice = base * mult; return newItem; } return item; })); };
  const removeFromCart = (pid) => setCart(p => p.filter(i => i.productId !== pid));

  const processTransaction = async (e) => { e.preventDefault(); if (!user) return; const formData = new FormData(e.target); const customerName = formData.get('customerName').trim(); const total = cart.reduce((acc, item) => acc + (item.calculatedPrice * item.qty), 0); const paymentType = formData.get('paymentType'); if(!customerName) { alert("Customer Name is required!"); return; } try { await runTransaction(db, async (firestoreTrans) => { for (const item of cart) { const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.productId); const prodDoc = await firestoreTrans.get(prodRef); if(!prodDoc.exists()) throw `Product ${item.name} not found`; const prodData = prodDoc.data(); let mult = 1; if (item.unit === 'Slop') mult = prodData.packsPerSlop || 10; if (item.unit === 'Bal') mult = (prodData.slopsPerBal || 20) * (prodData.packsPerSlop || 10); if (item.unit === 'Karton') mult = (prodData.balsPerCarton || 4) * (prodData.slopsPerBal || 20) * (prodData.packsPerSlop || 10); const qtyToDeduct = item.qty * mult; if(prodData.stock < qtyToDeduct) throw `Not enough stock for ${item.name}`; firestoreTrans.update(prodRef, { stock: prodData.stock - qtyToDeduct }); } const transRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/transactions`)); firestoreTrans.set(transRef, { date: getCurrentDate(), customerName, paymentType: paymentType, items: cart, total, type: 'SALE', timestamp: serverTimestamp() }); }); await logAudit("SALE", `Sold items to ${customerName} (${paymentType})`); setCart([]); triggerCapy("Transaction complete & Saved!"); } catch(err) { alert(err); } };
  const executeReturn = async (returnQtys) => { if (!returningTransaction || !user) return; const trans = returningTransaction; let totalRefundValue = 0; const itemsToReturn = []; trans.items.forEach(item => { const qty = returnQtys[item.productId] || 0; if (qty > 0) { totalRefundValue += (item.calculatedPrice * qty); itemsToReturn.push({ ...item, qty }); } }); if (itemsToReturn.length === 0) { setReturningTransaction(null); return; } handleConsignmentReturn(trans.customerName, itemsToReturn, totalRefundValue); setReturningTransaction(null); };

  const handleConsignmentPayment = async (customerName, itemsPaid, amountPaid) => { try { await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/transactions`), { date: getCurrentDate(), customerName, paymentType: "Cash", itemsPaid, amountPaid, type: 'CONSIGNMENT_PAYMENT', timestamp: serverTimestamp() }); await logAudit("CONSIGNMENT_PAYMENT", `Received ${formatRupiah(amountPaid)} from ${customerName}`); triggerCapy("Payment recorded!"); } catch (err) { console.error(err); } };
  const handleConsignmentReturn = async (customerName, itemsReturned, refundValue) => { try { await runTransaction(db, async (t) => { for(const item of itemsReturned) { const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.productId); const prodDoc = await t.get(prodRef); if(prodDoc.exists()) t.update(prodRef, { stock: prodDoc.data().stock + convertToBks(item.qty, item.unit, inventory.find(p=>p.id===item.productId)) }); } const returnRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/transactions`)); t.set(returnRef, { date: getCurrentDate(), customerName, items: itemsReturned, total: -refundValue, type: 'RETURN', timestamp: serverTimestamp() }); }); await logAudit("RETURN", `Return from ${customerName}`); triggerCapy("Return Processed!"); } catch(err) { console.error(err); } };
  const handleAddGoodsToCustomer = (name) => { alert(`Go to Sales POS and select 'Titip' payment for ${name}`); setActiveTab('sales'); };
  
  // FIX: Separate handler for Sampling to prevent form submission default behavior causing page reload
  const handleSamplingSubmit = async (e) => { 
    e.preventDefault(); 
    if (!user) return; 
    
    // Explicitly get values to ensure they exist
    const formData = new FormData(e.target); 
    const productId = formData.get('productId'); 
    const qty = parseInt(formData.get('qty')); 
    const reason = formData.get('reason'); 
    
    if (!productId || isNaN(qty) || qty <= 0) {
      alert("Please select a valid product and quantity.");
      return;
    }

    try { 
        await runTransaction(db, async (transaction) => { 
            const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, productId); 
            const prodDoc = await transaction.get(prodRef); 
            if (!prodDoc.exists()) throw "Product doesn't exist!"; 
            
            const currentStock = prodDoc.data().stock || 0;
            const newStock = currentStock - qty; 
            
            if(newStock < 0) throw "Not enough stock!"; 
            
            transaction.update(prodRef, { stock: newStock }); 
            const newSampleRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/samplings`)); 
            transaction.set(newSampleRef, { 
                date: getCurrentDate(), 
                productName: inventory.find(i=>i.id===productId)?.name || 'Unknown', 
                qty, 
                reason, 
                timestamp: serverTimestamp() 
            }); 
        }); 
        await logAudit("SAMPLING_ADD", `Sampled ${qty} of item`); 
        triggerCapy("Sample recorded. Stock updated."); 
        e.target.reset(); 
    } catch (err) { 
        console.error(err); 
        alert("Transaction failed: " + err); 
    } 
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

  const handleEditMascotMsgChange = (e) => {
    setEditMascotMessage(e.target.value);
  };
  const handleEditCompNameChange = (e) => {
    setEditCompanyName(e.target.value);
  };

  // Explicitly defined class strings for margin to prevent dynamic CSS conflicts causing layout shrink
  const mainContentClass = isSidebarCollapsed ? 'ml-20' : 'ml-64';

  // SETTINGS CRASH FIX: Guard clause for rendering Settings content
  const renderSettings = () => {
      // Prevents trying to access user.email if user is null (e.g. logging out)
      if (!user) return null; 

      return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 dark:text-white">Settings</h2>
            {/* User Profile */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white"><User size={20}/> User Profile</h3>
                <label className="block text-sm text-slate-500 mb-2">Google Account Email</label>
                <input type="email" placeholder="Sign in via Google..." className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={user?.email || ""} disabled/>
                <p className="text-xs text-slate-400 mt-2">
                    {isAdmin ? "You have Full Admin Access." : "Standard User Access."}
                </p>
                
                {/* Auto Admin Status Display */}
                {isAdmin && (
                    <div className="mt-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded text-sm font-bold flex justify-between items-center">
                        <span><Key size={14} className="inline mr-2"/> Admin Features Unlocked</span>
                    </div>
                )}
            </div>
            
            {/* Editable Mascot Message (Admin Only) */}
            <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-opacity ${!isAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white"><MessageSquare size={20}/> Mascot Message</h3>
                    {!isAdmin && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded flex items-center gap-1"><Lock size={12}/> Admin Only</span>}
                </div>
                <div className="flex gap-2">
                    <input className="flex-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="What should the Capybara say?" value={editMascotMessage || ""} onChange={handleEditMascotMsgChange}/>
                    <button onClick={handleSaveMascotMessage} className="bg-emerald-500 text-white px-4 rounded font-bold flex items-center gap-2"><Save size={16} /> Save</button>
                </div>
            </div>

            <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-opacity ${!isAdmin ? 'opacity-50 pointer-events-none' : ''}`}><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg flex items-center gap-2 dark:text-white">Company Identity</h3>{!isAdmin && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded flex items-center gap-1"><Lock size={12}/> Admin Only</span>}</div><div className="flex gap-2"><input className="flex-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={editCompanyName || ""} onChange={handleEditCompNameChange}/><button onClick={handleSaveCompanyName} className="bg-orange-500 text-white px-4 rounded font-bold flex items-center gap-2"><Save size={16} /> Save Name</button></div></div>
            
            {/* Profile Picture (Admin Only) */}
            <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-opacity ${!isAdmin ? 'opacity-50 pointer-events-none' : ''}`}><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg flex items-center gap-2 dark:text-white"><ImageIcon size={20}/> Profile Picture</h3>{!isAdmin && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded flex items-center gap-1"><Lock size={12}/> Admin Only</span>}</div><div className="flex items-start gap-6"><div className="flex flex-col items-center"><img src={appSettings?.mascotImage || "/capybara.jpg"} className="w-32 h-32 rounded-full border-4 border-orange-500 object-cover bg-slate-100" onError={(e) => {e.target.onerror = null; e.target.src="https://api.dicebear.com/7.x/avataaars/svg?seed=Capy"}}/><span className="text-xs text-slate-400 mt-2">Current</span></div><div className="flex-1"><label className="bg-orange-100 dark:bg-slate-700 text-orange-600 dark:text-orange-300 px-4 py-2 rounded-lg cursor-pointer hover:bg-orange-200 transition-colors inline-flex items-center gap-2 font-medium"><Upload size={16} /> Select & Crop<input type="file" accept="image/*" onChange={handleMascotSelect} className="hidden" /></label></div></div></div>
            
            {isAdmin && <AdminUserManager db={db} appId={appId} />}
        </div>
      );
  }

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {examiningProduct && <ExamineModal product={examiningProduct} onClose={() => setExaminingProduct(null)} onUpdateProduct={handleUpdateProduct} isAdmin={isAdmin} />}
      {cropImageSrc && <ImageCropper imageSrc={cropImageSrc} onCancel={() => { setCropImageSrc(null); setActiveCropContext(null); }} onCrop={handleCropConfirm} dimensions={boxDimensions} onDimensionsChange={setBoxDimensions} face={activeCropContext?.face || 'front'} />}
      {returningTransaction && <ReturnModal transaction={returningTransaction} onClose={() => setReturningTransaction(null)} onConfirm={executeReturn} />}

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
            ].map(item => (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-lg">
                        <p className="text-emerald-100 text-sm font-medium">Inventory Value</p>
                        <h3 className="text-3xl font-bold mt-1">{formatRupiah(totalStockValue)}</h3>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-2xl text-white shadow-lg">
                        <p className="text-orange-100 text-sm font-medium">Net Sales (Revenue)</p>
                        <h3 className="text-3xl font-bold mt-1">
                            {formatRupiah(
                            transactions
                                .filter(t => t.type === 'SALE' || t.type === 'RETURN')
                                .reduce((acc, t) => acc + (t.total || 0), 0)
                            )}
                        </h3>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700 shadow-sm">
                        <h3 className="font-semibold mb-4 dark:text-white">Daily Performance (Stacked by Customer)</h3>
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
                        <button onClick={handleExportCSV} className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white px-4 rounded-xl flex items-center gap-2 hover:bg-slate-200"><Download size={20}/> Export</button>
                        <button onClick={() => { setEditingProduct({}); setTempImages({}); setBoxDimensions({w:55, h:90, d:22}); setUseFrontForBack(false); }} className="bg-orange-500 text-white px-4 rounded-xl flex items-center gap-2"><Plus size={20}/> Add</button>
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
                                <p className="text-emerald-500 font-bold mt-1">{item.stock} Bks</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setExaminingProduct(item)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-2 rounded-lg text-sm font-medium dark:text-white">Examine</button>
                                <button onClick={() => { setEditingProduct(item); setTempImages(item.images || {}); setBoxDimensions(item.dimensions || {w:55, h:90, d:22}); setUseFrontForBack(item.useFrontForBack || false); }} className="p-2 text-slate-400 hover:text-orange-500"><Settings size={18}/></button>
                                <button onClick={() => deleteProduct(item.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
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
                                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700"><p className="text-xs font-bold text-orange-500 mb-2">PRICES (PER BKS)</p><input name="priceEcer" type="number" placeholder="Ecer" defaultValue={editingProduct.priceEcer} className="w-full mb-2 p-1 border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"/><input name="priceRetail" type="number" placeholder="Retail" defaultValue={editingProduct.priceRetail} className="w-full mb-2 p-1 border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"/><input name="priceGrosir" type="number" placeholder="Grosir" defaultValue={editingProduct.priceGrosir} className="w-full mb-2 p-1 border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"/><input name="stock" type="number" placeholder="Stock Qty" defaultValue={editingProduct.stock} className="w-full p-1 border border-emerald-500 rounded dark:bg-slate-800 dark:text-white"/></div>
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
                    <h2 className="text-2xl font-bold dark:text-white">Product Sampling Record</h2>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700">
                        <form onSubmit={handleSamplingSubmit} className="flex flex-col md:flex-row gap-4">
                        <select name="productId" required className="flex-1 p-3 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white">
                            <option value="">Select Product...</option>
                            {inventory.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.stock})</option>)}
                        </select>
                        <input type="number" name="qty" required placeholder="Qty (Bks)" min="1" className="w-32 p-3 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white"/>
                        <input type="text" name="reason" placeholder="Location / Recipient" className="flex-1 p-3 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white"/>
                        <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded font-bold">Record Sample</button>
                        </form>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700">
                        <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b dark:border-slate-700">
                            <tr><th className="p-4">Date</th><th className="p-4">Product</th><th className="p-4">Qty</th><th className="p-4">Notes</th></tr>
                        </thead>
                        <tbody>
                            {samplings.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-500">No sampling records found.</td></tr>
                            ) : (
                                samplings.map(s => (
                                <tr key={s.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"><td className="p-4 dark:text-slate-300">{s.date}</td><td className="p-4 font-bold dark:text-white">{s.productName}</td><td className="p-4 text-red-500 font-bold">-{s.qty}</td><td className="p-4 text-slate-500">{s.reason}</td></tr>
                                ))
                            )}
                        </tbody>
                        </table>
                    </div>
                    </div>
                )}

                {/* OTHER TABS */}
                {activeTab === 'consignment' && <ConsignmentView transactions={transactions} inventory={inventory} onAddGoods={handleAddGoodsToCustomer} onPayment={handleConsignmentPayment} onReturn={handleConsignmentReturn} onDeleteConsignment={handleDeleteConsignmentData} />}
                {activeTab === 'customers' && <CustomerManagement customers={customers} db={db} appId={appId} user={user} logAudit={logAudit} triggerCapy={triggerCapy} />}
                {activeTab === 'sales' && (
                    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] animate-fade-in">
                        <div className="lg:w-2/3 flex flex-col"><input className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border dark:border-slate-700 dark:text-white mb-4" placeholder="Search item..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/><div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3">{filteredInventory.map(item => (<div key={item.id} onClick={() => addToCart(item)} className="bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 cursor-pointer hover:border-orange-500 flex flex-col items-center text-center"><h4 className="font-bold truncate dark:text-white w-full">{item.name}</h4><div className="w-12 h-12 my-2 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden">{(item.images?.front || item.image) ? <img src={item.images?.front || item.image} className="w-full h-full object-cover"/> : <Package className="w-full h-full p-2 text-slate-300"/>}</div><p className="text-xs text-emerald-500 font-bold">{formatRupiah(item.priceRetail)}</p></div>))}</div></div>
                        <div className="lg:w-1/3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex flex-col border dark:border-slate-700"><div className="flex-1 overflow-y-auto p-4 space-y-4">{cart.map(item => (<div key={item.productId} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700"><div className="flex justify-between font-bold text-sm dark:text-white"><span>{item.name}</span> <button onClick={() => removeFromCart(item.productId)} className="text-red-400">x</button></div><div className="grid grid-cols-3 gap-1 mt-2"><input type="number" value={item.qty} onChange={e=>updateCartItem(item.productId, 'qty', e.target.value)} className="p-1 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 text-xs dark:text-white text-center"/><select value={item.unit} onChange={e=>updateCartItem(item.productId, 'unit', e.target.value)} className="p-1 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 text-xs dark:text-white"><option>Bks</option><option>Slop</option><option>Bal</option><option>Karton</option></select><select value={item.priceTier} onChange={e=>updateCartItem(item.productId, 'priceTier', e.target.value)} className="p-1 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 text-xs dark:text-white"><option>Ecer</option><option>Retail</option><option>Grosir</option></select></div><div className="text-right font-bold text-emerald-600 mt-1">{formatRupiah(item.calculatedPrice * item.qty)}</div></div>))}</div><div className="p-4 border-t dark:border-slate-700"><form onSubmit={processTransaction}><div className="mb-3 relative"><input name="customerName" required list="customersList" placeholder="Customer Name" className="w-full p-2 bg-transparent border-b dark:border-slate-700 dark:text-white text-sm" autoComplete="off"/><datalist id="customersList">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist></div><select name="paymentType" className="w-full mb-3 p-2 rounded bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"><option>Cash</option><option>Titip</option></select><button disabled={cart.length===0} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold">CHARGE {formatRupiah(cart.reduce((a,i)=>a+(i.calculatedPrice*i.qty),0))}</button></form></div></div>
                    </div>
                )}
                {activeTab === 'transactions' && <HistoryReportView transactions={transactions} onDelete={handleDeleteHistory} />}
                {activeTab === 'audit' && (
                    <div className="space-y-6 animate-fade-in"><h2 className="text-2xl font-bold dark:text-white">System Audit Logs</h2><div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700"><table className="w-full text-sm text-left"><thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b dark:border-slate-700"><tr><th className="p-4">Action</th><th className="p-4">Details</th><th className="p-4 text-right">Time</th></tr></thead><tbody>{auditLogs.map(log => (<tr key={log.id} className="border-b dark:border-slate-700"><td className="p-4 font-bold text-orange-500">{log.action}</td><td className="p-4 dark:text-slate-300">{log.details}</td><td className="p-4 text-right text-slate-400 text-xs">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Just now'}</td></tr>))}</tbody></table></div></div>
                )}

                {/* SETTINGS TAB - FIXED & CRASH PROOF */}
                {activeTab === 'settings' && renderSettings()}
              </>
          )}
        </div>
      </main>

      <CapybaraMascot message={showCapyMsg ? capyMsg : null} onClick={() => triggerCapy()} customImage={appSettings?.mascotImage} />
    </div>
  );
}
