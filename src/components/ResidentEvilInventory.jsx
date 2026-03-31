import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Package, AlertCircle, ImageIcon, Maximize2 } from 'lucide-react';
import { formatRupiah, convertToBks } from '../utils/helpers';

// --- HELPER: SLIDER COMPONENT ---
export const DimensionControl = ({ label, val, axis, onChange, onInteract }) => (
    <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono text-slate-400 w-8">{label}</span>
        <input 
            type="range" min="10" max="300" 
            value={val} 
            onMouseDown={() => onInteract(true)}
            onMouseUp={() => onInteract(false)}
            onTouchStart={() => onInteract(true)}
            onTouchEnd={() => onInteract(false)}
            onChange={(e) => onChange(axis, parseInt(e.target.value))}
            className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500"
        />
        <input 
            type="number" 
            value={val}
            onChange={(e) => onChange(axis, parseInt(e.target.value))}
            className="w-12 h-6 text-[10px] font-mono bg-black border border-white/20 text-white text-center rounded focus:border-orange-500 outline-none"
        />
        <span className="text-[10px] text-slate-500">mm</span>
    </div>
);

// --- TRUE 3D ITEM INSPECTOR ---
export const ItemInspector = ({ product, isAdmin, onEdit, onDelete, onUpdateProduct }) => { 
    const [rotation, setRotation] = useState({ x: -15, y: 35 });
    const [isDragging, setIsDragging] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false); 
    const lastMousePos = useRef({ x: 0, y: 0 });
    
    const [dims, setDims] = useState(product.dimensions || { w: 55, h: 90, d: 22 });
    const [zoom, setZoom] = useState(product.defaultZoom || 3.0); 
    const [showControls, setShowControls] = useState(false);
    
    useEffect(() => {
        setDims(product.dimensions || { w: 55, h: 90, d: 22 });
        setZoom(product.defaultZoom || 3.0);
    }, [product]);

    useEffect(() => {
        let frameId;
        const animate = () => {
            if (!isDragging && !isInteracting) {
                setRotation(prev => ({ ...prev, y: prev.y + 0.3 }));
            }
            frameId = requestAnimationFrame(animate);
        };
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [isDragging, isInteracting]);

    const handleMouseDown = (e) => { 
        if(e.target.closest('.controls-panel') || e.target.closest('.admin-actions') || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return; 
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

    const w = dims.w * zoom; 
    const h = dims.h * zoom; 
    const d = dims.d * zoom;

    const renderFace = (img, fallbackColor) => img ? <img src={img} className="w-full h-full object-cover" /> : <div className={`w-full h-full ${fallbackColor} border border-white/10`}></div>;
    const images = product.images || {};
    const front = images.front || product.image;
    const back = product.useFrontForBack ? front : images.back;

    return (
        <div className="h-full flex flex-col relative animate-fade-in select-none bg-gradient-to-b from-black via-slate-900/20 to-black overflow-hidden">
            {isAdmin && (
                <div className="absolute top-4 right-4 z-[100] flex flex-col items-end gap-2 controls-panel">
                    <button onClick={() => setShowControls(!showControls)} className={`p-2 rounded-full border border-white/20 ${showControls ? 'bg-orange-500 text-white' : 'bg-black/50 text-slate-400'}`}>
                        <Maximize2 size={16}/>
                    </button>
                    {showControls && (
                        <div className="bg-black/90 backdrop-blur-md border border-white/20 p-4 rounded-xl w-64 shadow-2xl">
                             <DimensionControl label="W" val={dims.w} axis="w" onChange={(a,v) => setDims(p=>({...p, [a]:v}))} onInteract={setIsInteracting} />
                             <DimensionControl label="H" val={dims.h} axis="h" onChange={(a,v) => setDims(p=>({...p, [a]:v}))} onInteract={setIsInteracting} />
                             <DimensionControl label="D" val={dims.d} axis="d" onChange={(a,v) => setDims(p=>({...p, [a]:v}))} onInteract={setIsInteracting} />
                             <button onClick={() => onUpdateProduct(product.id, { dimensions: dims, defaultZoom: zoom })} className="w-full mt-2 bg-emerald-600 text-white text-[10px] font-bold py-2 rounded">Save 3D Layout</button>
                        </div>
                    )}
                </div>
            )}

            <div 
                className="flex-1 flex items-center justify-center relative perspective-[1200px] cursor-move z-10"
                style={{ perspective: '1200px' }}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => setIsDragging(false)}
            >
                <div 
                    className="relative" 
                    style={{ 
                        width: w, height: h, 
                        transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                        transformStyle: 'preserve-3d', 
                        willChange: 'transform' 
                    }}
                >
                    <div className="absolute inset-0 bg-white" style={{ transform: `translateZ(${d/2}px)`, backfaceVisibility: 'hidden' }}>{renderFace(front, "bg-white")}</div>
                    <div className="absolute inset-0 bg-slate-800" style={{ transform: `rotateY(180deg) translateZ(${d/2}px)`, backfaceVisibility: 'hidden' }}>{renderFace(back, "bg-slate-800")}</div>
                    <div className="absolute" style={{ width: d, height: h, transform: `rotateY(90deg) translateZ(${w/2}px)`, left: (w-d)/2, backfaceVisibility: 'hidden' }}>{renderFace(images.right, "bg-slate-400")}</div>
                    <div className="absolute" style={{ width: d, height: h, transform: `rotateY(-90deg) translateZ(${w/2}px)`, left: (w-d)/2, backfaceVisibility: 'hidden' }}>{renderFace(images.left, "bg-slate-400")}</div>
                    <div className="absolute" style={{ width: w, height: d, transform: `rotateX(90deg) translateZ(${h/2}px)`, top: (h-d)/2, backfaceVisibility: 'hidden' }}>{renderFace(images.top, "bg-slate-300")}</div>
                    <div className="absolute" style={{ width: w, height: d, transform: `rotateX(-90deg) translateZ(${h/2}px)`, top: (h-d)/2, backfaceVisibility: 'hidden' }}>{renderFace(images.bottom, "bg-slate-500")}</div>
                </div>
            </div>

            <div className="bg-black/90 border-t-2 border-orange-600 p-6 md:p-8 relative z-20 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                    <div className="w-full">
                        <h2 className="text-xl md:text-3xl text-white font-serif tracking-widest uppercase mb-2">{product.name}</h2>
                        <div className="flex items-center gap-3">
                            <span className="bg-emerald-900/30 px-3 py-1 rounded border border-emerald-500/50 text-emerald-400 text-sm md:text-base font-mono font-bold tracking-widest">
                                STOCK: {isAdmin ? product.stock : "**"}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono uppercase border border-white/10 px-2 py-0.5 rounded">{product.type}</span>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => onEdit(product)} className="flex-1 md:px-6 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-colors">Edit</button>
                            <button onClick={() => onDelete(product.id)} className="flex-1 md:px-6 py-2 bg-red-900/30 text-red-500 border border-red-800 text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors">Discard</button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono border-t border-white/10 pt-5 mt-2">
                    <div className="bg-white/5 p-3 border-l-4 border-red-500">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Dist</p>
                        <p className="text-white text-sm md:text-base font-bold tracking-wider">{formatRupiah(product.priceDistributor)}</p>
                    </div>
                    <div className="bg-white/5 p-3 border-l-4 border-emerald-500">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Retail</p>
                        <p className="text-white text-sm md:text-base font-bold tracking-wider">{formatRupiah(product.priceRetail)}</p>
                    </div>
                    <div className="bg-white/5 p-3 border-l-4 border-blue-500">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Grosir</p>
                        <p className="text-white text-sm md:text-base font-bold tracking-wider">{formatRupiah(product.priceGrosir)}</p>
                    </div>
                    <div className="bg-white/5 p-3 border-l-4 border-yellow-500">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Ecer</p>
                        <p className="text-white text-sm md:text-base font-bold tracking-wider">{formatRupiah(product.priceEcer)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN INVENTORY COMPONENT ---
export default function ResidentEvilInventory({ inventory, motorists = [], transactions = [], isAdmin, onEdit, onDelete, onAddNew, backgroundSrc, onUploadBg, onUpdateProduct }) { 
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState("");
    const [activeSection, setActiveSection] = useState("ALL");

    const sections = useMemo(() => {
        const groups = { "ALL": inventory };
        inventory.forEach(item => {
            const type = item.type || "MISC";
            if (!groups[type]) groups[type] = [];
            groups[type].push(item);
        });
        return groups;
    }, [inventory]);

    useEffect(() => {
        if (!selectedId && inventory.length > 0) setSelectedId(inventory[0].id);
    }, [inventory]);

    const sectionKeys = Object.keys(sections).sort();
    const currentList = sections[activeSection].filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    const selectedItem = inventory.find(i => i.id === selectedId) || inventory[0];

    return (
        <div className="flex flex-col lg:flex-row h-auto lg:h-full w-full bg-black overflow-hidden border border-white/10 rounded-xl shadow-2xl relative">
            <div className="w-full lg:w-96 h-[350px] lg:h-full flex flex-col shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-black/95 relative z-30 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
                <div className="p-4 md:p-6 border-b border-white/20">
                    <h3 className="text-white font-serif italic text-lg md:text-2xl mb-2">Supply Case</h3>
                    <div className="relative mb-3">
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SEARCH..." className="w-full bg-black/50 border border-white/30 p-2 pl-8 text-white text-[10px] font-mono outline-none"/>
                        <Search size={12} className="absolute left-2 top-2.5 text-slate-500"/>
                        {isAdmin && <button onClick={onAddNew} className="absolute right-2 top-1.5 text-slate-400 hover:text-white"><Plus size={16}/></button>}
                    </div>
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                        {sectionKeys.map(sec => (
                            <button key={sec} onClick={() => setActiveSection(sec)} className={`px-2 py-1 text-[8px] font-bold uppercase border whitespace-nowrap ${activeSection === sec ? 'bg-white text-black' : 'text-slate-500 border-slate-700'}`}>{sec}</button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
                    {currentList.map(item => {
                        const isLowStock = item.stock <= (item.minStock || 5);
                        return (
                            <div key={item.id} onClick={() => setSelectedId(item.id)} className={`p-3 md:p-4 cursor-pointer border mb-2 flex items-center gap-4 transition-all relative ${selectedId === item.id ? 'bg-white/10 border-white/20 shadow-md' : 'border-transparent'}`}>
                                {isLowStock && isAdmin && (<div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600 shadow-[0_0_12px_rgba(220,38,38,1)] z-10"></div>)}
                                <div className={`w-12 h-12 shrink-0 border flex items-center justify-center bg-black relative ${selectedId === item.id ? 'border-orange-500' : isLowStock && isAdmin ? 'border-red-500' : 'border-white/10'}`}>
                                    {item.images?.front ? <img src={item.images.front} className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-600"/>}
                                    {isLowStock && isAdmin && <AlertCircle size={14} className="absolute -top-1.5 -right-1.5 text-red-500 bg-black rounded-full shadow-[0_0_5px_red]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm md:text-base font-black uppercase tracking-wide truncate ${selectedId === item.id ? 'text-orange-400' : isLowStock && isAdmin ? 'text-red-400' : 'text-slate-300'}`}>{item.name}</h4>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        {(() => {
                                            if (!isAdmin) return <p className="text-sm font-mono text-slate-400 font-bold">STK: **</p>;
                                            const todayStr = new Date().toISOString().split('T')[0];
                                            let fieldBks = 0;
                                            motorists.forEach(m => {
                                                const cItem = (m.activeCanvas || []).find(c => c.productId === item.id);
                                                if (cItem) fieldBks += convertToBks(cItem.qty, cItem.unit, item);
                                            });
                                            let soldBks = 0;
                                            transactions.filter(t => t.date === todayStr && t.type === 'SALE').forEach(t => {
                                                const tItem = (t.items || []).find(i => i.productId === item.id);
                                                if (tItem) soldBks += convertToBks(tItem.qty, tItem.unit, item);
                                            });
                                            const startBks = item.stock + fieldBks + soldBks;

                                            return (
                                                <div className="flex items-center gap-2 text-[10px] md:text-xs font-mono font-bold w-full">
                                                    <span className={isLowStock ? 'text-red-500' : 'text-slate-300'}>VAULT: {item.stock}</span>
                                                    <span className="text-slate-500 border-l border-white/20 pl-2">START: {startBks}</span>
                                                    <span className="text-orange-400 border-l border-white/20 pl-2">FIELD: {fieldBks}</span>
                                                    <span className="text-emerald-400 border-l border-white/20 pl-2">SOLD: {soldBks}</span>
                                                </div>
                                            );
                                        })()}
                                        {isLowStock && isAdmin && (<span className="text-[9px] font-black bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded border border-red-500/50 uppercase animate-pulse tracking-widest shadow-[0_0_8px_rgba(220,38,38,0.4)] mt-1">Low</span>)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {currentList.length === 0 && <p className="text-center text-[10px] text-slate-600 mt-10">NO ITEMS FOUND</p>}
                </div>
            </div>

            <div className="w-full h-[600px] lg:flex-1 lg:h-full relative bg-black shrink-0">
                <div className="absolute inset-0 z-0">
                    <img src={backgroundSrc || 'https://www.transparenttextures.com/patterns/dark-leather.png'} className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80"></div>
                </div>
                <div className="relative z-10 h-full">
                    {isAdmin && (
                        <label className="absolute top-4 right-14 z-50 cursor-pointer"> 
                            <div className="bg-black/50 p-2 rounded-full text-white border border-white/10"><ImageIcon size={14}/></div>
                            <input type="file" accept="image/*" onChange={onUploadBg} className="hidden" />
                        </label>
                    )}
                    {selectedItem && (
                        <ItemInspector 
                            product={selectedItem} 
                            isAdmin={isAdmin} 
                            onEdit={onEdit} 
                            onDelete={onDelete} 
                            onUpdateProduct={onUpdateProduct} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
}