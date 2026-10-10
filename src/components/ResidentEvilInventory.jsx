import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Package, AlertCircle, ImageIcon, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatRupiah, convertToBks, getLocalDayKey} from '../utils/helpers';
import * as threshold from '../utils/stockThreshold';

// 🚀 NEW: ADVANCED STOCK FORMATTER (Handles Batang, Slops, and Bal)
export const formatAdvancedStock = (stock, item) => {
    if (typeof stock !== 'number') return { bks: '0 Bks', slop: '0 Slop', bal: '0 Bal' };
    const sp = item.sticksPerPack || 16;
    const ps = item.packsPerSlop || 10;
    const sb = item.slopsPerBal || 20;

    const bks = Math.floor(stock);
    const fractional = stock - bks;
    const btg = Math.round(fractional * sp);
    
    let bksStr = `${bks} Bks`;
    if (btg > 0) bksStr += ` + ${btg} Btg`;
    else if (bks === 0 && btg === 0) bksStr = `0 Bks`;

    const slopDec = (stock / ps).toFixed(1);
    const balDec = (stock / (ps * sb)).toFixed(2);

    return { bks: bksStr, slop: `${slopDec} Slop`, bal: `${balDec} Bal` };
};

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
            className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500"
        />
        <input 
            type="number" 
            value={val}
            onChange={(e) => onChange(axis, parseInt(e.target.value))}
            className="w-12 h-6 text-[10px] font-mono bg-black border border-white/20 text-white text-center rounded focus:border-amber-500 outline-none"
        />
        <span className="text-[10px] text-slate-400">mm</span>
    </div>
);

// --- TRUE 3D ITEM INSPECTOR ---
export const ItemInspector = ({ product, isAdmin, onEdit, onDelete, onUpdateProduct, onExpand }) => {
    const rotation = { x: -15, y: 35 };   /* the resting tilt; turning by hand happens in the fullscreen viewer now (see the stage) */
    const [isInteracting, setIsInteracting] = useState(false);

    const [dims, setDims] = useState(product.dimensions || { w: 55, h: 90, d: 22 });
    const [zoom, setZoom] = useState(product.defaultZoom || 3.0); 
    const [showControls, setShowControls] = useState(false);
    
    useEffect(() => {
        setDims(product.dimensions || { w: 55, h: 90, d: 22 });
        setZoom(product.defaultZoom || 3.0);
    }, [product]);

    /* THE IDLE SPIN IS A CSS ANIMATION (2026-10-01, "potato phone even in full animation mode"). It was setRotation +0.3deg
       in a requestAnimationFrame loop - a React re-render of this card every frame, 125 a second: Master Vault 85% idle CPU
       on a 6x-slow phone, 22% without it. Now .kpm-inspect-spin turns the faces on the graphics chip, INSIDE the drag
       rotation (rotateX(x) rotateY(y) rotateY(spin) = the old rotateY(y + spin)), one turn per 20 s = 0.3deg at 60 fps,
       and holds its angle while he edits a size. Lite Mode stops it (his "nothing rotates"); theme.css. */
    /* THE SMALL BOX NO LONGER TAKES A DRAG (2026-10-10, his pick A + "add the view in fullscreen button"). Turning it here
       (2026-10-02's pointer drag) worked only when the finger STARTED on the box; one that started beside it scrolled the
       page instead - "sometimes when rotate the 3D model it move the whole page instead". Now the page scrolls through
       the box, and a tap on it or the button opens the sales terminal's fullscreen viewer (ExamineModal: fixed, nothing
       behind it moves), where the finger turns it. */

    const w = dims.w * zoom; 
    const h = dims.h * zoom; 
    const d = dims.d * zoom;

    const renderFace = (img, fallbackColor) => img ? <img src={img} className="w-full h-full object-cover" /> : <div className={`w-full h-full ${fallbackColor} border border-white/10`}></div>;
    const images = product.images || {};
    const front = images.front || product.image;
    const back = product.useFrontForBack ? front : images.back;

    /* the 3D size controls: a floating panel on the desk (top-right button), a fold under the prices on the phone */
    const sizeControls = (<>
        <DimensionControl label="W" val={dims.w} axis="w" onChange={(a,v) => setDims(p=>({...p, [a]:v}))} onInteract={setIsInteracting} />
        <DimensionControl label="H" val={dims.h} axis="h" onChange={(a,v) => setDims(p=>({...p, [a]:v}))} onInteract={setIsInteracting} />
        <DimensionControl label="D" val={dims.d} axis="d" onChange={(a,v) => setDims(p=>({...p, [a]:v}))} onInteract={setIsInteracting} />
        <button onClick={() => onUpdateProduct(product.id, { dimensions: dims, defaultZoom: zoom })} className="w-full mt-2 min-h-11 lg:min-h-0 bg-gradient-to-b from-amber-500 to-amber-700 text-black text-[10px] font-bold py-2 rounded shadow-[0_0_10px_rgba(217,164,65,0.4)]">Save 3D Layout</button>
    </>);

    return (
        <div className="lg:h-full flex flex-col relative animate-fade-in select-none bg-gradient-to-b from-black via-stone-900/30 to-black overflow-hidden">
            {isAdmin && (
                <div className="absolute top-4 right-4 z-[100] hidden lg:flex flex-col items-end gap-2 controls-panel">
                    <button onClick={() => setShowControls(!showControls)} className={`w-11 h-11 flex items-center justify-center rounded-full border ${showControls ? 'bg-amber-500 border-amber-300 text-black shadow-[0_0_12px_rgba(217,164,65,0.6)]' : 'bg-black/50 border-amber-500/20 text-amber-200/70'}`}>
                        <Maximize2 size={16}/>
                    </button>
                    {showControls && (
                        <div className="bg-black/90 backdrop-blur-md border border-amber-500/30 p-4 rounded-xl w-64 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                             {sizeControls}
                        </div>
                    )}
                </div>
            )}

            <div
                className="flex-1 min-h-[340px] lg:min-h-0 flex items-center justify-center relative perspective-[1200px] cursor-pointer z-10"
                style={{ perspective: '1200px', touchAction: 'manipulation' }}
                onClick={() => onExpand?.(product)}
            >
                {onExpand && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); onExpand(product); }}
                        className="absolute top-3 left-3 z-20 inline-flex items-center gap-2 min-h-11 px-4 rounded-full border border-amber-500/40 bg-black/80 text-amber-200 text-xs font-bold uppercase tracking-widest whitespace-nowrap hover:border-amber-400 active:scale-[0.97] transition-transform">
                        <Maximize2 size={14} aria-hidden="true" />View in fullscreen
                    </button>
                )}
                <div 
                    className="relative" 
                    style={{ 
                        width: w, height: h, 
                        transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                        transformStyle: 'preserve-3d', 
                        willChange: 'transform' 
                    }}
                >
                    <div className={`kpm-inspect-spin${isInteracting ? ' held' : ''}`}>
                    <div className="absolute inset-0 bg-white" style={{ transform: `translateZ(${d/2}px)`, backfaceVisibility: 'hidden' }}>{renderFace(front, "bg-white")}</div>
                    <div className="absolute inset-0 bg-slate-800" style={{ transform: `rotateY(180deg) translateZ(${d/2}px)`, backfaceVisibility: 'hidden' }}>{renderFace(back, "bg-slate-800")}</div>
                    <div className="absolute" style={{ width: d, height: h, transform: `rotateY(90deg) translateZ(${w/2}px)`, left: (w-d)/2, backfaceVisibility: 'hidden' }}>{renderFace(images.right, "bg-slate-400")}</div>
                    <div className="absolute" style={{ width: d, height: h, transform: `rotateY(-90deg) translateZ(${w/2}px)`, left: (w-d)/2, backfaceVisibility: 'hidden' }}>{renderFace(images.left, "bg-slate-400")}</div>
                    <div className="absolute" style={{ width: w, height: d, transform: `rotateX(90deg) translateZ(${h/2}px)`, top: (h-d)/2, backfaceVisibility: 'hidden' }}>{renderFace(images.top, "bg-slate-300")}</div>
                    <div className="absolute" style={{ width: w, height: d, transform: `rotateX(-90deg) translateZ(${h/2}px)`, top: (h-d)/2, backfaceVisibility: 'hidden' }}>{renderFace(images.bottom, "bg-slate-500")}</div>
                    </div>
                </div>
            </div>

            <div className="bg-black/90 border-t-2 border-amber-600/80 p-6 md:p-8 relative z-20 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                    <div className="w-full">
                        <h2 className="text-xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500 font-serif tracking-widest uppercase mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{product.name}</h2>
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="bg-amber-900/20 px-3 py-1 rounded border border-amber-500/40 text-amber-300 text-sm md:text-base font-mono font-bold tracking-widest">
                                STOCK: {isAdmin ? (() => {
                                    const info = formatAdvancedStock(product.stock, product);
                                    return `${info.bks} / ${info.slop} / ${info.bal}`;
                                })() : "**"}
                            </span>
                            {isAdmin && (product.damagedStock || 0) > 0 && (
                                <span className="bg-rose-950/40 px-3 py-1 rounded border border-rose-700/60 text-rose-400 text-sm md:text-base font-mono font-bold tracking-widest">
                                    DAMAGED: {product.damagedStock} Bks
                                </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono uppercase border border-white/10 px-2 py-0.5 rounded">{product.type}</span>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => onEdit(product)} className="flex-1 md:px-6 py-2 min-h-11 lg:min-h-0 bg-gradient-to-b from-amber-400 to-amber-600 text-black text-[10px] font-bold uppercase tracking-widest hover:from-amber-300 hover:to-amber-500 transition-colors shadow-[0_0_10px_rgba(217,164,65,0.3)]">Edit</button>
                            <button onClick={() => onDelete(product.id)} className="flex-1 md:px-6 py-2 min-h-11 lg:min-h-0 bg-red-950/40 text-rose-500 border border-rose-800 text-[10px] font-bold uppercase tracking-widest hover:bg-rose-700 hover:text-white transition-colors">Discard</button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono border-t border-amber-500/10 pt-5 mt-2">
                    <div className="bg-white/5 p-3 border-l-4 border-rose-600">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Dist</p>
                        <p className="text-white text-sm md:text-base font-bold tracking-wider">{formatRupiah(product.priceDistributor)}</p>
                    </div>
                    <div className="bg-white/5 p-3 border-l-4 border-amber-500">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Retail</p>
                        <p className="text-white text-sm md:text-base font-bold tracking-wider">{formatRupiah(product.priceRetail)}</p>
                    </div>
                    <div className="bg-white/5 p-3 border-l-4 border-stone-400">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Grosir</p>
                        <p className="text-white text-sm md:text-base font-bold tracking-wider">{formatRupiah(product.priceGrosir)}</p>
                    </div>
                    <div className="bg-white/5 p-3 border-l-4 border-yellow-600">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Ecer</p>
                        <p className="text-white text-sm md:text-base font-bold tracking-wider">{formatRupiah(product.priceEcer)}</p>
                    </div>
                </div>

                {isAdmin && (
                    <details className="lg:hidden mt-4 border border-amber-500/20 controls-panel group">
                        <summary className="min-h-11 px-3 flex items-center cursor-pointer list-none text-[11px] font-mono text-stone-300">
                            3D size {dims.w} × {dims.h} × {dims.d} mm<ChevronRight size={14} className="ml-auto text-amber-500/60 group-open:rotate-90 transition-transform"/>
                        </summary>
                        <div className="px-3 pb-3">{sizeControls}</div>
                    </details>
                )}
            </div>
        </div>
    );
};

// --- MAIN INVENTORY COMPONENT ---
/* ON THE PHONE: THE LIST, THEN THE PRODUCT (2026-10-02, his pick C - "c is the best one for master vault"). Below lg
   the screen is one thing at a time: the list full width (it used to sit in a 350 px box - one and a half products),
   and a tap opens that product on its own screen with a Back. The desk keeps both side by side. ONE search box: it
   was two (App's above, this one's inside); this one now drives App's searchTerm, which the Sales Terminal's product
   list reads too, so nothing that filtered before stops filtering. */
const isPhone = () => window.matchMedia('(max-width: 1023px)').matches;

export default function ResidentEvilInventory({ inventory, motorists = [], transactions = [], isAdmin, onEdit, onDelete, onAddNew, backgroundSrc, onUploadBg, onUpdateProduct, onInspect, appSettings, searchTerm = '', onSearch }) {
    const [selectedId, setSelectedId] = useState(null);
    const [activeSection, setActiveSection] = useState("ALL");
    const [phoneOpen, setPhoneOpen] = useState(false);
    const rootRef = useRef(null);
    const openProduct = (id) => {
        setSelectedId(id);
        if (!isPhone()) return;
        setPhoneOpen(true);
        setTimeout(() => rootRef.current?.scrollIntoView({ block: 'start' }));   /* after the screen has switched */
    };
    const backToList = () => {
        setPhoneOpen(false);
        setTimeout(() => document.getElementById(`mv-row-${selectedId}`)?.scrollIntoView({ block: 'center' }));
    };

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
    const currentList = sections[activeSection] || [];   /* a search can empty the chosen type: no group, no crash */
    const selectedItem = inventory.find(i => i.id === selectedId) || inventory[0];

    return (
        <div ref={rootRef} className="flex flex-col lg:flex-row h-auto lg:h-full w-full bg-black overflow-hidden border border-amber-500/20 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.6)] relative">
            <div className={`${phoneOpen ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 h-auto lg:h-full flex-col shrink-0 border-b lg:border-b-0 lg:border-r border-amber-500/20 bg-black/95 relative z-30 shadow-[10px_0_30px_rgba(0,0,0,0.5)]`}>
                <div className="p-4 md:p-6 border-b border-amber-500/20">
                    <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 font-serif italic text-lg md:text-2xl mb-2">Supply Case</h3>
                    <div className="relative mb-3">
                        <input value={searchTerm} onChange={e => onSearch?.(e.target.value)} placeholder="Search products..." className="w-full h-11 lg:h-9 bg-black/50 border border-amber-500/30 pl-9 pr-3 text-white text-xs font-mono outline-none focus:border-amber-400"/>
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/50 pointer-events-none"/>
                    </div>
                    <div className="flex gap-1 items-center">
                        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                            {sectionKeys.map(sec => (
                                <button key={sec} onClick={() => setActiveSection(sec)} className={`h-11 lg:h-8 px-3 text-[11px] font-bold uppercase border whitespace-nowrap ${activeSection === sec ? 'bg-amber-500 text-black border-amber-400' : 'text-amber-200/40 border-amber-900/60'}`}>{sec}</button>
                            ))}
                        </div>
                        {isAdmin && <button onClick={onAddNew} className="ml-auto shrink-0 h-11 lg:h-8 px-3 flex items-center gap-1 border border-amber-500/50 text-amber-400 hover:text-amber-200 text-[11px] font-bold uppercase tracking-widest"><Plus size={14}/> Add</button>}
                    </div>
                </div>

                <div className="lg:flex-1 lg:overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-amber-900/40">
                    {currentList.map(item => {
                        const isLowStock = threshold.isLowStock(item, appSettings);
                        return (
                            <div key={item.id} id={`mv-row-${item.id}`} onClick={() => openProduct(item.id)} className={`p-3 md:p-4 cursor-pointer border mb-2 flex items-center gap-4 transition-all relative ${selectedId === item.id ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(217,164,65,0.15)]' : 'border-transparent'}`}>
                                {isLowStock && isAdmin && (<div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-600 shadow-[0_0_12px_rgba(220,38,38,1)] z-10"></div>)}
                                <div className={`w-12 h-12 shrink-0 border flex items-center justify-center bg-black relative ${selectedId === item.id ? 'border-amber-500' : isLowStock && isAdmin ? 'border-rose-500' : 'border-amber-900/30'}`}>
                                    {item.images?.front ? <img src={item.images.front} className="w-full h-full object-cover" /> : <Package size={20} className="text-amber-900/60"/>}
                                    {isLowStock && isAdmin && <AlertCircle size={14} className="absolute -top-1.5 -right-1.5 text-rose-500 bg-black rounded-full shadow-[0_0_5px_red]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm md:text-base font-black uppercase tracking-wide truncate ${selectedId === item.id ? 'text-amber-400' : isLowStock && isAdmin ? 'text-rose-400' : 'text-slate-300'}`}>{item.name}</h4>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        {(() => {
                                            if (!isAdmin) return <p className="text-sm font-mono text-slate-400 font-bold">STK: **</p>;
                                            const todayStr = getLocalDayKey();
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
                                            const damagedBks = item.damagedStock || 0;

                                            return (
                                                /* the numbers WRAP under the name - they used to slide sideways in every row, at
                                                   every width (his rule: "sideways swipe is inconvenience for phone") */
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] md:text-xs font-mono font-bold w-full">
                                                    <span className={`basis-full whitespace-nowrap ${isLowStock ? 'text-rose-500' : 'text-amber-200'}`}>
                                                        VAULT: {formatAdvancedStock(item.stock, item).bks} ({formatAdvancedStock(item.stock, item).slop})
                                                    </span>
                                                    <span className="text-slate-400 whitespace-nowrap">START: {startBks}</span>
                                                    <span className="text-amber-400 whitespace-nowrap">FIELD: {fieldBks}</span>
                                                    <span className="text-stone-200 whitespace-nowrap">SOLD: {soldBks}</span>
                                                    {damagedBks > 0 && (
                                                        <span className="text-rose-400 whitespace-nowrap">DMG: {damagedBks}</span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        {isLowStock && isAdmin && (<span className="text-[11px] font-black bg-rose-950/50 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/50 uppercase animate-pulse tracking-widest shadow-[0_0_8px_rgba(220,38,38,0.4)] mt-1">Low</span>)}
                                    </div>
                                </div>
                                <ChevronRight size={18} className="lg:hidden shrink-0 text-amber-500/40" />
                            </div>
                        );
                    })}
                    {currentList.length === 0 && <p className="text-center text-[10px] text-slate-400 mt-10">NO ITEMS FOUND</p>}
                </div>
            </div>

            <div className={`${phoneOpen ? 'block' : 'hidden'} lg:block w-full h-auto lg:flex-1 lg:h-full relative bg-black shrink-0`}>
                <div className="absolute inset-0 z-0">
                    <img src={backgroundSrc || 'https://www.transparenttextures.com/patterns/dark-leather.png'} className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-stone-900/20 to-black/80"></div>
                </div>
                <div className="relative z-10 lg:h-full">
                    {/* hidden on the WRAPPER: theme.css's `button:has(> svg:only-child)` outranks lg:hidden on the button itself */}
                    <div className="lg:hidden relative z-[110]">
                        <button type="button" onClick={backToList} className="h-11 px-3 flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-widest text-amber-200/80">
                            <ChevronLeft size={16}/> Back
                        </button>
                    </div>
                    {isAdmin && (
                        <label className="absolute top-[52px] lg:top-4 right-4 lg:right-[68px] z-50 cursor-pointer">
                            <div className="w-11 h-11 flex items-center justify-center bg-black/50 rounded-full text-amber-300 border border-amber-500/20"><ImageIcon size={14}/></div>
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
                            onExpand={onInspect}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}