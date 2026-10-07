import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Package, AlertCircle, ImageIcon, Maximize2, Expand, ChevronLeft, ChevronRight } from 'lucide-react';
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
export const ItemInspector = ({ product, isAdmin, onEdit, onDelete, onUpdateProduct, onExamine }) => { 
    const [rotation, setRotation] = useState({ x: -15, y: 35 });
    const [isDragging, setIsDragging] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false); 
    const lastMousePos = useRef({ x: 0, y: 0 });
    const tapStart = useRef(null);
    
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
       and holds its angle while he drags or edits a size. Lite Mode stops it (his "nothing rotates"); theme.css. */
    /* (SUPERSEDED 2026-10-07 - see the block below: a finger no longer turns THIS box, the stage is pan-y; the finger
       turns it in the full-screen viewer.) A FINGER TURNS IT (2026-10-02, Master Vault on the phone). These were mouse events, and a phone sends none for a
       drag - the lab's touch drag left the box at rotateY(35deg) while a mouse turned it. Pointer events cover mouse and
       finger alike; the stage has touch-action off so the drag turns the box instead of scrolling the page. */
    /* FULL SCREEN, LIKE THE SALES TERMINAL (2026-10-07, his ask: "fixed and full screen just like the one we have on
       the viewable menu on sales terminal because sometimes when rotate the 3D model it move the whole page instead").
       A tap on the box opens ExamineModal - the Sales Terminal's own full-screen viewer, not a lookalike - and the
       turning happens there (its root is touch-action none, so the finger turns the box and nothing behind it moves).
       On the phone the box here no longer grabs the finger at all (touch-action pan-y): a vertical swipe scrolls the
       page, a tap opens the viewer. A mouse still drags it round on the desk; a click without a drag opens the viewer.
       It OPENS ON click, not on pointerup: a tap that only stops a fling, a long-press and a right-click send a
       pointerup but no (left) click, and none of them should throw a full-screen viewer at him. It gets the sizes on
       the sliders right now, saved or not (a cleared size box falls back to the saved one), so what he sees full
       screen is what he is measuring. */
    const DRAG_SLOP = 6;
    const handlePointerDown = (e) => {
        /* closest(), not tagName: a press on the Full screen key lands on its <svg>, and a tagName test let that
           press through - the stage captured the pointer, so the key's own click never fired */
        if (e.target.closest('.controls-panel, .admin-actions, button, input, label')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;   /* a right-click opens its menu, not the viewer */
        tapStart.current = { x: e.clientX, y: e.clientY, moved: false };
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        if (e.pointerType !== 'mouse') return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setIsDragging(true);
    };

    const handlePointerMove = (e) => {
        const t = tapStart.current;
        if (t && Math.hypot(e.clientX - t.x, e.clientY - t.y) > DRAG_SLOP) t.moved = true;
        if (!isDragging) return; 
        const deltaX = e.clientX - lastMousePos.current.x; 
        const deltaY = e.clientY - lastMousePos.current.y; 
        setRotation(prev => ({ x: prev.x - deltaY * 0.5, y: prev.y + deltaX * 0.5 })); 
        lastMousePos.current = { x: e.clientX, y: e.clientY }; 
    };

    const dragMoved = useRef(false);
    const handlePointerUp = (e) => {
        /* read by the click that follows: a mouse drag is not a click. A finger's tap-or-scroll is the browser's call -
           when it sends a click it was a tap, wobble and all. */
        dragMoved.current = e.pointerType === 'mouse' && !!tapStart.current?.moved;
        tapStart.current = null;
        setIsDragging(false);
    };
    const handlePointerCancel = () => { tapStart.current = null; dragMoved.current = true; setIsDragging(false); };   /* the page took the swipe */
    const handleStageClick = (e) => {
        if (e.target.closest('.controls-panel, .admin-actions, button, input, label') || dragMoved.current) return;
        openFullScreen();
    };
    const openFullScreen = () => {
        const saved = product.dimensions || { w: 55, h: 90, d: 22 };
        const ok = (v) => Number.isFinite(v) && v > 0;
        const size = (v, s, def) => (ok(v) ? v : ok(s) ? s : def);   /* a saved size can be NaN too: Save 3D Layout with a cleared box */
        onExamine?.({ ...product, dimensions: { w: size(dims.w, saved.w, 55), h: size(dims.h, saved.h, 90), d: size(dims.d, saved.d, 22) } });
    };

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
                className="flex-1 min-h-[340px] lg:min-h-0 flex items-center justify-center relative perspective-[1200px] cursor-pointer lg:cursor-move z-10"
                style={{ perspective: '1200px', touchAction: 'pan-y' }}
                onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel} onClick={handleStageClick}
            >
                {onExamine && (
                    <button type="button" onClick={openFullScreen} className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 min-h-11 lg:min-h-0 px-3 py-1.5 flex items-center gap-1.5 bg-black/60 border border-amber-500/30 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest text-amber-200/80 hover:text-amber-100">
                        <Expand size={12}/> Full screen
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
                    <div className={`kpm-inspect-spin${isDragging || isInteracting ? ' held' : ''}`}>
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
                        {product.description?.trim() && <p className="mt-3 text-sm text-stone-300 font-serif leading-relaxed whitespace-pre-line line-clamp-3" title={product.description.trim()}>{product.description.trim()}</p>}
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

export default function ResidentEvilInventory({ inventory, motorists = [], transactions = [], isAdmin, onEdit, onDelete, onAddNew, backgroundSrc, onUploadBg, onUpdateProduct, onExamine, appSettings, searchTerm = '', onSearch }) {
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
                            onExamine={onExamine}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}