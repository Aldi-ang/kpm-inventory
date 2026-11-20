import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Package, ImageIcon, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatRupiah, convertToBks, getLocalDayKey, isPromo, isDamagedPack, promoSkin, promoGoods, inQuarantine } from '../utils/helpers';
import { resolveCategoryName, resolveSubName, categoryUsageCount } from '../utils/productCategories';
import PromoGoods3D from './PromoGoods3D';
import HazardMark from './HazardMark';
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

const num = (v) => new Intl.NumberFormat('id-ID').format(Number(v) || 0);
const groupBks = (s) => s.replace(/^\d+/, (d) => num(d));   /* "10161 Bks + 4 Btg" -> "10.161 Bks + 4 Btg" */

/* THE PROFESSIONAL LOOK (2026-11-17, his "actually its look solid" on the picture, A-Brain Raw/2026-11-17-master-vault):
   the tokens of Fleet & Roster and Agent Inventory, ruled lines instead of cards, sentence-case words, no glow, no pulse.
   Two of his features kept on purpose, his same message: the 3D size sliders ("3D slider is important we need to keep it
   somewhere") fold under the product on every width, and the background picture ("we also need it ... professional and
   not kaku and looks minimalistic but cool") sits faded behind the 3D box only, with its button in that corner. */

// --- HELPER: SLIDER COMPONENT ---
export const DimensionControl = ({ label, val, axis, onChange, onInteract }) => (
    <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-semibold text-ink-dim w-4">{label}</span>
        <input
            type="range" min="10" max="300"
            value={val}
            onMouseDown={() => onInteract(true)}
            onMouseUp={() => onInteract(false)}
            onTouchStart={() => onInteract(true)}
            onTouchEnd={() => onInteract(false)}
            onChange={(e) => onChange(axis, parseInt(e.target.value))}
            aria-label={`${label} size in mm`}
            className="flex-1 h-1 bg-line-2 rounded-full appearance-none cursor-pointer accent-[var(--gold)]"
        />
        <input
            type="number"
            value={val}
            onChange={(e) => onChange(axis, parseInt(e.target.value))}
            aria-label={`${label} size in mm, typed`}
            className="w-14 h-9 text-xs tabular-nums bg-ground border border-line-2 text-ink text-center focus:border-accent-edge outline-none"
        />
        <span className="text-xs text-ink-dim">mm</span>
    </div>
);

// --- TRUE 3D ITEM INSPECTOR ---
export const ItemInspector = ({ product, productCategories = [], isAdmin, onEdit, onDelete, onUpdateProduct, onExpand, isLow = false, backgroundSrc, onUploadBg }) => {
    const rotation = { x: -15, y: 35 };   /* the resting tilt; turning by hand happens in the fullscreen viewer now (see the stage) */
    const [isInteracting, setIsInteracting] = useState(false);

    const [dims, setDims] = useState(product.dimensions || { w: 55, h: 90, d: 22 });
    const [zoom, setZoom] = useState(product.defaultZoom || 3.0);

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
    const front0 = images.front || product.image;
    /* no FRONT photo -> the 3D goods (PromoGoods3D); a photo keeps the flat card below (his 2026-10-26 "the uploaded
       photo will be these flat card") */
    const goods3d = isPromo(product) && !front0 && promoGoods(product);
    const front = front0 || (isPromo(product) ? promoSkin(product, 'front') : null);
    const back = product.useFrontForBack ? front : images.back || (isPromo(product) ? promoSkin(product, 'back') : null);
    const info = formatAdvancedStock(product.stock, product);
    const ruled = 'flex justify-between gap-4 py-2 border-b border-line text-sm';

    return (
        <div className="flex flex-col select-none">
            {/* THE STAGE: the box over his background picture, faded into the page so it reads as light, not as a poster.
                No picture yet -> a soft gold glow on the inset. The floor shadow under the box is what makes it sit. */}
            <div
                className="h-[300px] lg:h-[340px] flex items-center justify-center relative overflow-hidden cursor-pointer border-b border-line-2 bg-inset"
                style={{ perspective: '1200px', touchAction: 'manipulation' }}
                onClick={() => onExpand?.(product)}
            >
                {backgroundSrc
                    ? <img src={backgroundSrc} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-30 saturate-[.5] blur-[3px] scale-110 pointer-events-none" />
                    : <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_42%,color-mix(in_srgb,var(--gold)_16%,transparent),transparent_68%)]" />}
                <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_top,var(--ground)_0%,transparent_45%),linear-gradient(to_bottom,color-mix(in_srgb,var(--ground)_55%,transparent)_0%,transparent_30%)]" />
                <div aria-hidden="true" className="absolute bottom-[14%] left-1/2 -translate-x-1/2 w-48 h-8 rounded-[50%] pointer-events-none bg-[radial-gradient(closest-side,rgba(0,0,0,0.45),transparent)]" />
                {onExpand && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); onExpand(product); }}
                        className="absolute top-3 left-3 z-20 inline-flex items-center gap-2 min-h-11 lg:min-h-9 px-3 border border-line-2 bg-[color-mix(in_srgb,var(--ground)_75%,transparent)] text-ink text-xs font-semibold whitespace-nowrap hover:border-accent-edge active:scale-[0.97] transition-[border-color,transform]">
                        <Maximize2 size={14} aria-hidden="true" />View in fullscreen</button>
                )}
                {isAdmin && onUploadBg && (
                    <label onClick={(e) => e.stopPropagation()} title="Change the background picture" className="absolute top-3 right-3 z-20 cursor-pointer">
                        <span className="w-11 h-11 lg:w-9 lg:h-9 flex items-center justify-center border border-line-2 bg-[color-mix(in_srgb,var(--ground)_75%,transparent)] text-ink-muted hover:text-ink hover:border-accent-edge transition-colors"><ImageIcon size={15} aria-hidden="true"/></span>
                        <input type="file" accept="image/*" onChange={onUploadBg} className="hidden" aria-label="Change the background picture" />
                    </label>
                )}
                {/* bottom-right: the top corners hold VIEW IN FULLSCREEN and the background-picture button */}
                {isDamagedPack(product) && <HazardMark className="bottom-3 right-3 z-20 w-10 h-10" />}
                {goods3d ? <PromoGoods3D product={product} className="absolute inset-0" /> : (
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
                    <div className="absolute inset-0 bg-stone-800" style={{ transform: `rotateY(180deg) translateZ(${d/2}px)`, backfaceVisibility: 'hidden' }}>{renderFace(back, "bg-stone-800")}</div>
                    <div className="absolute" style={{ width: d, height: h, transform: `rotateY(90deg) translateZ(${w/2}px)`, left: (w-d)/2, backfaceVisibility: 'hidden' }}>{renderFace(images.right, "bg-stone-400")}</div>
                    <div className="absolute" style={{ width: d, height: h, transform: `rotateY(-90deg) translateZ(${w/2}px)`, left: (w-d)/2, backfaceVisibility: 'hidden' }}>{renderFace(images.left, "bg-stone-400")}</div>
                    <div className="absolute" style={{ width: w, height: d, transform: `rotateX(90deg) translateZ(${h/2}px)`, top: (h-d)/2, backfaceVisibility: 'hidden' }}>{renderFace(images.top, "bg-stone-300")}</div>
                    <div className="absolute" style={{ width: w, height: d, transform: `rotateX(-90deg) translateZ(${h/2}px)`, top: (h-d)/2, backfaceVisibility: 'hidden' }}>{renderFace(images.bottom, "bg-stone-500")}</div>
                    </div>
                </div>
                )}
            </div>

            <div className="p-4 lg:p-6 flex flex-col gap-5">
                <div>
                    <h2 className="text-lg lg:text-xl font-bold text-ink [text-wrap:balance]">{product.name}</h2>
                    <p className="text-xs text-ink-dim mt-0.5">{[[resolveCategoryName(product, productCategories), resolveSubName(product, productCategories)].filter(Boolean).join(' › '), !isPromo(product) && `${product.sticksPerPack || 16} sticks per Bks`].filter(Boolean).join(' · ')}</p>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-ink tabular-nums leading-none">
                            {isAdmin ? (isPromo(product) ? `${product.stock || 0} pcs` : groupBks(info.bks)) : '**'}
                        </span>
                        {isAdmin && <span className="text-xs text-ink-dim">in the vault</span>}
                    </div>
                    {isAdmin && !isPromo(product) && <p className="mt-1.5 text-xs text-ink-dim tabular-nums">{info.slop} · {info.bal}</p>}
                    {isAdmin && (isLow || (product.damagedStock || 0) > 0) && (
                        <p className="mt-2 text-xs font-semibold text-danger-ink">
                            {[isLow && 'Below the low-stock line', (product.damagedStock || 0) > 0 && `${product.damagedStock} ${isPromo(product) ? 'pcs' : 'Bks'} damaged, in quarantine`].filter(Boolean).join(' · ')}
                        </p>
                    )}
                    {isAdmin && (
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => onEdit(product)} className="kpm-edge-btn quiet flex-1 lg:flex-none min-h-11 lg:min-h-9 px-4 text-sm font-semibold">Edit product</button>
                            <button onClick={() => onDelete(product.id)} className="kpm-edge-btn danger flex-1 lg:flex-none min-h-11 lg:min-h-9 px-4 text-sm font-semibold">Delete</button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    {!isPromo(product) && (   /* a promo item has no price: given free with a sale (his 2026-10-25 answer 6) */
                    <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-dim mb-1">Prices per Bks</h3>
                        <div className="border-t border-line-2 tabular-nums">
                            <div className={ruled}><span className="text-ink-muted">Distributor (cost)</span><span className="font-semibold text-ink">{formatRupiah(product.priceDistributor)}</span></div>
                            <div className={ruled}><span className="text-ink-muted">Retail</span><span className="font-semibold text-ink">{formatRupiah(product.priceRetail)}</span></div>
                            <div className={ruled}><span className="text-ink-muted">Grosir</span><span className="font-semibold text-ink">{formatRupiah(product.priceGrosir)}</span></div>
                            <div className={ruled}><span className="text-ink-muted">Ecer</span><span className="font-semibold text-ink">{formatRupiah(product.priceEcer)}</span></div>
                        </div>
                    </div>
                    )}
                    {!isPromo(product) && (
                    <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-dim mb-1">Packing</h3>
                        <div className="border-t border-line-2 tabular-nums">
                            <div className={ruled}><span className="text-ink-muted">Bks per Slop</span><span className="font-semibold text-ink">{product.packsPerSlop || 10}</span></div>
                            <div className={ruled}><span className="text-ink-muted">Slop per Bal</span><span className="font-semibold text-ink">{product.slopsPerBal || 20}</span></div>
                            <div className={ruled}><span className="text-ink-muted">Bal per Karton</span><span className="font-semibold text-ink">{product.balsPerCarton || 4}</span></div>
                        </div>
                    </div>
                    )}
                </div>

                {/* the 3D size sliders shape the flat card (a 3D goods model has its own shape) - one fold on every width */}
                {isAdmin && !goods3d && (
                    <details className="border-y border-line-2 controls-panel group">
                        <summary className="min-h-11 flex items-center cursor-pointer list-none text-sm text-ink-muted">
                            3D box size <span className="ml-2 text-ink tabular-nums">{dims.w} × {dims.h} × {dims.d} mm</span><ChevronRight size={14} aria-hidden="true" className="ml-auto text-ink-dim group-open:rotate-90 transition-transform"/>
                        </summary>
                        <div className="pb-3">
                            <DimensionControl label="W" val={dims.w} axis="w" onChange={(a,v) => setDims(p=>({...p, [a]:v}))} onInteract={setIsInteracting} />
                            <DimensionControl label="H" val={dims.h} axis="h" onChange={(a,v) => setDims(p=>({...p, [a]:v}))} onInteract={setIsInteracting} />
                            <DimensionControl label="D" val={dims.d} axis="d" onChange={(a,v) => setDims(p=>({...p, [a]:v}))} onInteract={setIsInteracting} />
                            <button onClick={() => onUpdateProduct(product.id, { dimensions: dims, defaultZoom: zoom })} className="kpm-edge-btn w-full mt-2 min-h-11 lg:min-h-9 text-sm font-semibold">Save 3D size</button>
                        </div>
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
const QUARANTINE = '__quarantine';   /* never a product type, so no type tab can collide with it */
/* the wide desk reads the list as a table; below xl the Field / Sold numbers fold under the name, so nothing slides sideways */
const COLS = 'xl:grid-cols-[minmax(0,1fr)_7rem_4.5rem_5rem_5.5rem]';

export default function ResidentEvilInventory({ inventory, productCategories = [], motorists = [], transactions = [], isAdmin, onEdit, onDelete, onAddNew, backgroundSrc, onUploadBg, onUpdateProduct, onInspect, appSettings, searchTerm = '', onSearch }) {
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
            const type = resolveCategoryName(item, productCategories);
            if (!groups[type]) groups[type] = [];
            groups[type].push(item);
        });
        return groups;
    }, [inventory, productCategories]);
    const usedCatCounts = useMemo(() => (productCategories || []).map(c => categoryUsageCount(c.id, inventory)), [productCategories, inventory]);
    void usedCatCounts;

    useEffect(() => {
        if (!selectedId && inventory.length > 0) setSelectedId(inventory[0].id);
    }, [inventory]);

    const sectionKeys = Object.keys(sections).sort();
    /* QUARANTINE (his 2026-10-26 "on the old master vault we dont have any method to view the quarantine"): one more tab on
       the same row, not a second control - second in the row so a phone sees it without sliding the tabs */
    const quarantine = inventory.filter(inQuarantine);
    const inQ = activeSection === QUARANTINE;
    const currentList = inQ ? quarantine : (sections[activeSection] || []);   /* a search can empty the chosen type: no group, no crash */
    const selectedItem = inventory.find(i => i.id === selectedId) || inventory[0];
    const lowCount = isAdmin ? inventory.filter(i => threshold.isLowStock(i, appSettings)).length : 0;
    const quarantineUnits = quarantine.reduce((s, i) => s + (Number(i.damagedStock) || 0), 0);

    /* what each row shows - display only: the vans' load and today's sales put back on the vault give the morning count */
    const todayStr = getLocalDayKey();
    const rowNums = (item) => {
        /* a promo item is counted in pcs; its FIELD is the vans' promo goods (promoCanvas, stage 3); nothing is sold (stage 4 gives) */
        if (isPromo(item)) {
            const fieldPcs = motorists.reduce((s, m) => s + (Number((m.promoCanvas || []).find(c => c.productId === item.id)?.qty) || 0), 0);
            return { vault: item.stock || 0, unit: 'pcs', field: fieldPcs, sold: null, start: null };
        }
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
        return { vault: groupBks(formatAdvancedStock(item.stock, item).bks).replace(/ Bks/, ''), unit: 'Bks', field: fieldBks, sold: soldBks, start: startBks };
    };
    const tab = (on) => `h-11 lg:h-10 px-2 -mb-px border-b-2 text-[13px] font-semibold whitespace-nowrap transition-colors ${on ? 'border-gold text-ink' : 'border-transparent text-ink-dim hover:text-ink'}`;

    return (
        <div ref={rootRef} className="flex flex-col lg:flex-row h-auto lg:h-full w-full bg-ground border border-line-2 overflow-hidden relative">
            <div className={`${phoneOpen ? 'hidden lg:flex' : 'flex'} w-full lg:w-[55%] h-auto lg:h-full flex-col shrink-0 border-b lg:border-b-0 lg:border-r border-line-2 bg-ground relative z-30`}>
                <div className="px-4 lg:px-5 pt-3 lg:pt-4 pb-3 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line-2">
                    <div className="min-w-0">
                        <h1 className="text-base font-bold text-ink">Master Vault</h1>
                        {isAdmin && (
                            <p className="text-xs text-ink-dim tabular-nums">
                                {inventory.length} products{lowCount > 0 && <> · <span className="text-danger-ink font-semibold">{lowCount} low</span></>}{quarantineUnits > 0 && ` · ${num(quarantineUnits)} in quarantine`}
                            </p>
                        )}
                    </div>
                    {isAdmin && <button onClick={onAddNew} className="kpm-edge-btn ml-auto shrink-0 min-h-11 lg:min-h-9 px-4 text-sm font-semibold"><Plus size={15} aria-hidden="true" className="text-accent-ink"/> Add product</button>}
                    <div className="relative basis-full">
                        <input value={searchTerm} onChange={e => onSearch?.(e.target.value)} placeholder="Search products" aria-label="Search products" className="w-full h-11 lg:h-9 bg-inset border border-line-2 pl-9 pr-3 text-ink text-sm outline-none focus:border-accent-edge placeholder:text-ink-dim"/>
                        <Search size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none"/>
                    </div>
                </div>
                {/* the tabs WRAP: a hidden sideways scroll put the last tabs out of sight on a phone (and on the PC once
                    QUARANTINE joined the row) - his rule, "sideways swipe is inconvenience for phone" */}
                <div className="px-3 lg:px-4 border-b border-line-2">
                    <div className="flex flex-wrap gap-1 min-w-0">
                        {sectionKeys.map(sec => (<React.Fragment key={sec}>
                            <button onClick={() => setActiveSection(sec)} className={tab(activeSection === sec)}>{sec === 'ALL' ? 'All' : sec}<span className="ml-1.5 text-ink-dim tabular-nums">{sections[sec].length}</span></button>
                            {sec === 'ALL' && isAdmin && (
                                <button onClick={() => setActiveSection(QUARANTINE)} className={`${tab(inQ)} ${quarantine.length && !inQ ? '!text-danger-ink' : ''}`}>Quarantine<span className="ml-1.5 tabular-nums">{quarantine.length}</span></button>
                            )}
                        </React.Fragment>))}
                    </div>
                </div>

                <div className="lg:flex-1 lg:overflow-y-auto">
                    {inQ && <p className="px-4 lg:px-5 pt-3 pb-2 text-xs text-danger-ink">Damaged stock waits here until Stock Opname settles it.</p>}
                    {isAdmin && currentList.length > 0 && (
                        <div className={`hidden xl:grid ${COLS} gap-3 px-5 py-2 border-b border-line-2 text-[11px] font-semibold text-ink-dim sticky top-0 bg-ground z-10`}>
                            <span>Product</span><span className="text-right">{inQ ? 'Damaged' : 'Vault'}</span><span className="text-right">Field</span><span className="text-right">Sold today</span><span className="text-right">Start of day</span>
                        </div>
                    )}
                    {currentList.map(item => {
                        const isLowStock = threshold.isLowStock(item, appSettings);
                        const sel = selectedId === item.id;
                        const r = isAdmin ? rowNums(item) : null;
                        const big = !isAdmin ? '**' : inQ ? num(item.damagedStock) : (r.unit === 'pcs' ? num(r.vault) : r.vault);
                        const unit = inQ ? (isPromo(item) ? 'pcs' : 'Bks') : r?.unit;
                        const catLabel = [resolveCategoryName(item, productCategories), resolveSubName(item, productCategories)].filter(Boolean).join(' › ');
                        const sub = !isAdmin ? catLabel : inQ ? `${catLabel || ''}${catLabel ? ' · ' : ''}${num(item.damagedStock)} ${unit} damaged`
                            : [catLabel, r.field > 0 && `Field ${num(r.field)}`, r.sold > 0 && `Sold ${num(r.sold)}`].filter(Boolean).join(' · ');
                        return (
                            <div key={item.id} id={`mv-row-${item.id}`} onClick={() => openProduct(item.id)}
                                className={`grid grid-cols-[minmax(0,1fr)_auto_auto] ${isAdmin && !inQ ? COLS : ''} gap-3 items-center px-4 lg:px-5 py-3 min-h-16 cursor-pointer border-b border-line transition-colors ${sel ? 'bg-[color-mix(in_srgb,var(--gold)_9%,transparent)] shadow-[inset_2px_0_0_var(--gold)]' : 'hover:bg-panel'}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-10 shrink-0 border border-line-2 flex items-center justify-center bg-inset relative">
                                        {item.images?.front || isPromo(item) ? <img src={item.images?.front || (promoGoods(item) ? item.thumb || `/promo/${promoGoods(item)}.png` : promoSkin(item, 'front'))} className="w-full h-full object-cover" /> : <Package size={16} aria-hidden="true" className="text-ink-dim"/>}
                                        {isDamagedPack(item) && <HazardMark className="-bottom-1.5 -right-1.5 z-10 w-5 h-5" />}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-semibold leading-snug text-ink">
                                            {item.name}{isLowStock && isAdmin && <span className="ml-2 text-[11px] font-bold text-danger-ink">Low</span>}
                                        </h4>
                                        <p className={`text-xs text-ink-dim tabular-nums ${isAdmin && !inQ ? 'xl:hidden' : ''}`}>{sub}</p>
                                        {isAdmin && !inQ && catLabel && <p className="hidden xl:block text-xs text-ink-dim">{catLabel}</p>}
                                    </div>
                                </div>
                                <div className={`text-right tabular-nums whitespace-nowrap ${inQ ? 'text-danger-ink' : 'text-ink'}`}>
                                    <span className="font-bold">{big}</span>{isAdmin && <span className="ml-1 text-[11px] text-ink-dim">{unit}</span>}
                                </div>
                                {isAdmin && !inQ && <>
                                    <span className="hidden xl:block text-right text-sm tabular-nums text-ink-muted">{num(r.field)}</span>
                                    <span className="hidden xl:block text-right text-sm tabular-nums text-ink-muted">{r.sold === null ? '-' : num(r.sold)}</span>
                                    <span className="hidden xl:block text-right text-sm tabular-nums text-ink-dim">{r.start === null ? '-' : num(r.start)}</span>
                                </>}
                                <ChevronRight size={16} aria-hidden="true" className="lg:hidden shrink-0 text-ink-dim" />
                            </div>
                        );
                    })}
                    {currentList.length === 0 && <p className="text-center text-sm text-ink-dim py-12">{inQ ? 'No damaged stock' : 'No products found'}</p>}
                </div>
            </div>

            <div className={`${phoneOpen ? 'block' : 'hidden'} lg:block w-full h-auto lg:flex-1 lg:h-full lg:overflow-y-auto relative bg-ground`}>
                {/* hidden on the WRAPPER: theme.css's `button:has(> svg:only-child)` outranks lg:hidden on the button itself.
                    z-40, not 110: above the stage's own keys (z-20), under the product form (z-100) - at 110 it drew over the open form */}
                <div className="lg:hidden relative z-40">
                    <button type="button" onClick={backToList} className="w-full h-11 px-4 flex items-center justify-start gap-1 text-sm font-semibold text-ink-muted border-b border-line-2">
                        <ChevronLeft size={16} aria-hidden="true"/> Back to the list
                    </button>
                </div>
                {selectedItem && (
                    <ItemInspector
                        product={selectedItem}
                        productCategories={productCategories}
                        isAdmin={isAdmin}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onUpdateProduct={onUpdateProduct}
                        onExpand={onInspect}
                        isLow={threshold.isLowStock(selectedItem, appSettings)}
                        backgroundSrc={backgroundSrc}
                        onUploadBg={onUploadBg}
                    />
                )}
            </div>
        </div>
    );
}
