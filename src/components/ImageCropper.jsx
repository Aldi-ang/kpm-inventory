import React, { useState, useEffect, useRef } from 'react';
import { Crop, Move, Maximize2, RotateCcw, RotateCw } from 'lucide-react';

/* Two fingers apart = zoom in: the zoom when they landed x how far apart they are now / how far apart they started. */
export const pinchZoom = (z0, d0, d) => Math.min(5, Math.max(0.1, d0 > 0 ? z0 * d / d0 : z0));

/* MADE FOR A FINGER (2026-10-02, his "the picture insert submission for the 3D cigarette box is incompatible in phone",
   and his yes to the AFTER picture). It listened to mouse events only, and a phone sends none for a drag - the photo and
   the frame could not be moved at all (lab: touch drag left the photo where it was, a mouse moved it). Now pointer
   events (mouse, finger, pen alike) with touch-action off on the drag surfaces, a pinch zooms, the photo gets most of
   the phone screen, the handles are 44 px, 3D size folds away, Cancel / Crop & Save stay pinned at the bottom, and the
   colours are the app's (it was cyan and white). The desk keeps its side panel. */
export default function ImageCropper({ imageSrc, onCancel, onCrop, dimensions, onDimensionsChange, face }) {
  const imgRef = useRef(null);
  const boxRef = useRef(null);
  const containerRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [sizeOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);   /* the desk has room to show it */
  const zoomRef = useRef(1);
  zoomRef.current = zoom;

  const state = useRef({
    isDragging: false, dragType: null, startX: 0, startY: 0,
    initialPanX: 0, initialPanY: 0, initialW: 200, initialH: 200,
    panX: 0, panY: 0, w: 200, h: 200
  });
  const pointers = useRef(new Map());
  const pinch = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const padding = 60;
        let axisX = 'w'; let axisY = 'h';
        if (face === 'left' || face === 'right') axisX = 'd';
        if (face === 'top' || face === 'bottom') axisY = 'd';

        const ratio = dimensions[axisX] / dimensions[axisY];
        let initialW, initialH;

        if (ratio > 1) {
            initialW = Math.min(320, width - padding);
            initialH = initialW / ratio;
        } else {
            initialH = Math.min(320, height - padding);
            initialW = initialH * ratio;
        }

        state.current.w = initialW;
        state.current.h = initialH;
        if(boxRef.current) {
            boxRef.current.style.width = `${initialW}px`;
            boxRef.current.style.height = `${initialH}px`;
        }
    }
  }, [face, dimensions]);

  useEffect(() => { updateImageTransform(); }, [zoom, rotation]);

  const updateImageTransform = () => {
    if (imgRef.current) {
        imgRef.current.style.transform = `translate3d(-50%, -50%, 0) translate3d(${state.current.panX}px, ${state.current.panY}px, 0) scale(${zoom}) rotate(${rotation}deg)`;
    }
  };

  const spread = () => { const [a, b] = [...pointers.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

  /* The document listeners need ONE identity each (add and remove must match) while the bodies read this render. */
  const live = useRef({});
  live.current.move = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) { setZoom(pinchZoom(pinch.current.z0, pinch.current.d0, spread())); return; }
    if (!state.current.isDragging) return;
    const dx = e.clientX - state.current.startX; const dy = e.clientY - state.current.startY;
    if (state.current.dragType === 'move') {
        state.current.panX = state.current.initialPanX + dx;
        state.current.panY = state.current.initialPanY + dy;
        updateImageTransform();
    } else {
        let newW = state.current.initialW; let newH = state.current.initialH;
        if (state.current.dragType.includes('r')) newW = Math.max(50, state.current.initialW + dx);
        if (state.current.dragType.includes('b')) newH = Math.max(50, state.current.initialH + dy);
        state.current.w = newW; state.current.h = newH;
        if (boxRef.current) { boxRef.current.style.width = `${newW}px`; boxRef.current.style.height = `${newH}px`; }
    }
  };
  live.current.up = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
        state.current.isDragging = false;
        document.removeEventListener('pointermove', onPointerMove); document.removeEventListener('pointerup', onPointerUp); document.removeEventListener('pointercancel', onPointerUp);
    }
  };
  const [{ onPointerMove, onPointerUp }] = useState(() => ({ onPointerMove: (e) => live.current.move(e), onPointerUp: (e) => live.current.up(e) }));

  const handlePointerDown = (e, type) => {
    e.preventDefault(); e.stopPropagation();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (type === 'move' && pointers.current.size === 2) {
        pinch.current = { d0: spread(), z0: zoomRef.current };
        state.current.isDragging = false;
    } else if (pointers.current.size === 1) {
        state.current.isDragging = true; state.current.dragType = type;
        state.current.startX = e.clientX; state.current.startY = e.clientY;
        state.current.initialPanX = state.current.panX; state.current.initialPanY = state.current.panY;
        state.current.initialW = state.current.w; state.current.initialH = state.current.h;
    }
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  };
  useEffect(() => () => {
    document.removeEventListener('pointermove', onPointerMove); document.removeEventListener('pointerup', onPointerUp); document.removeEventListener('pointercancel', onPointerUp);
  }, [onPointerMove, onPointerUp]);

  const executeCrop = () => {
    const canvas = document.createElement('canvas');

    // 🚀 THE MICRO-COMPRESSOR OVERRIDE
    // Lowered base resolution from 500 to 256 for a massive drop in raw pixel data
    const BASE_RES = 256;
    const ratio = state.current.w / state.current.h;

    if (ratio > 1) {
        canvas.width = BASE_RES;
        canvas.height = BASE_RES / ratio;
    } else {
        canvas.height = BASE_RES;
        canvas.width = BASE_RES * ratio;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = imgRef.current;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const scaleFactor = canvas.width / state.current.w;
    ctx.translate(state.current.panX * scaleFactor, state.current.panY * scaleFactor);
    ctx.scale(zoom * scaleFactor, zoom * scaleFactor);

    if (img) ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    // 🚀 CRITICAL COMPRESSION: Switched from lossless PNG (1.0) to JPEG (0.7 quality)
    // This turns a 5MB image into a ~40kb image while maintaining perfect UI visual fidelity.
    onCrop(canvas.toDataURL('image/jpeg', 0.7));
  };

  const label = 'font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--duke-ink-8)]';
  const range = 'w-full h-6 cursor-pointer accent-[color:var(--duke-amber)]';
  const DimSlider = ({ label: name, val, axis }) => (
    <div className="flex flex-col mb-3">
        <div className="flex justify-between items-center mb-1">
            <label className={label}>{name}</label>
            <div className="flex items-center gap-1">
                <input type="number" value={val} onChange={(e) => onDimensionsChange({...dimensions, [axis]: Math.max(1, parseInt(e.target.value) || 0)})} className="w-14 h-8 text-right text-xs font-mono bg-[var(--duke-fill-well)] px-1 text-[var(--duke-ink-hi)] border border-[var(--duke-edge-1)] focus:border-[var(--duke-amber-edge)] outline-none"/>
                <span className="text-[10px] text-[var(--duke-ink-8)]">mm</span>
            </div>
        </div>
        <input type="range" min="1" max="300" step="1" value={val} onChange={(e) => onDimensionsChange({...dimensions, [axis]: parseInt(e.target.value)})} className={range}/>
    </div>
  );
  const handle = 'absolute w-11 h-11 rounded-full border-2 border-[var(--duke-amber)] z-30 flex items-center justify-center shadow-lg';

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center md:p-4 animate-fade-in">
      <div className="bg-[var(--duke-well-solid)] w-full h-[100dvh] md:max-w-5xl md:h-[90vh] md:rounded-2xl md:border md:border-[var(--duke-edge-1)] shadow-2xl flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col relative select-none">
            <div className="h-12 shrink-0 px-4 flex items-center gap-2 border-b border-[var(--duke-edge-1)] font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--duke-ink-hi)]">
                <Crop size={14} className="text-[var(--duke-amber)]"/> Align {face}
            </div>
            <div ref={containerRef} className="flex-1 min-h-0 flex items-center justify-center overflow-hidden relative cursor-move" style={{ touchAction: 'none' }} onPointerDown={(e) => handlePointerDown(e, 'move')}>
                <div ref={boxRef} className="relative" style={{ width: 200, height: 200 }}>
                    <div className="absolute inset-0 overflow-visible z-10">
                        <img ref={imgRef} src={imageSrc} className="absolute max-w-none origin-center" style={{ left: '50%', top: '50%', transform: `translate3d(-50%, -50%, 0) scale(${zoom}) rotate(${rotation}deg)`, userSelect: 'none', pointerEvents: 'none' }}/>
                    </div>
                    <div className="absolute inset-0 border-2 border-[var(--duke-amber)] shadow-[0_0_0_9999px_rgba(5,4,3,0.8)] z-20 pointer-events-none"></div>
                    <div className={`${handle} right-[-22px] top-1/2 -translate-y-1/2 bg-[var(--duke-well-solid)] text-[var(--duke-amber)] cursor-ew-resize`} style={{ touchAction: 'none' }} onPointerDown={(e) => handlePointerDown(e, 'resize-r')}><Move size={14} className="rotate-90"/></div>
                    <div className={`${handle} bottom-[-22px] left-1/2 -translate-x-1/2 bg-[var(--duke-well-solid)] text-[var(--duke-amber)] cursor-ns-resize`} style={{ touchAction: 'none' }} onPointerDown={(e) => handlePointerDown(e, 'resize-b')}><Move size={14}/></div>
                    <div className={`${handle} bottom-[-22px] right-[-22px] bg-[var(--duke-amber)] text-[var(--duke-on-fill)] cursor-nwse-resize`} style={{ touchAction: 'none' }} onPointerDown={(e) => handlePointerDown(e, 'resize-rb')}><Maximize2 size={14}/></div>
                </div>
                <p className="absolute bottom-3 inset-x-0 text-center font-mono text-[11px] text-[var(--duke-ink-8)] pointer-events-none">drag the photo · pinch to zoom</p>
            </div>
        </div>
        <div className="shrink-0 md:w-80 md:border-l border-t md:border-t-0 border-[var(--duke-edge-1)] flex flex-col max-h-[46dvh] md:max-h-none">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 md:p-6 space-y-3">
                <div>
                    <div className="flex justify-between"><label className={label}>Zoom</label><span className={label}>{zoom.toFixed(2)}x</span></div>
                    <input type="range" min="0.1" max="5" step="0.05" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className={range}/>
                </div>
                <div>
                    <div className="flex justify-between"><label className={label}>Rotate</label><span className={label}>{Math.round(rotation)}°</span></div>
                    <input type="range" min="-180" max="180" step="1" value={rotation} onChange={(e) => setRotation(parseFloat(e.target.value))} className={range}/>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <button type="button" onClick={() => setRotation(r => r - 90)} className="h-11 flex items-center justify-center gap-2 border border-[var(--duke-edge-1)] font-mono text-xs text-[var(--duke-ink-hi)] active:scale-[.97] transition-transform"><RotateCcw size={14} /> 90°</button>
                        <button type="button" onClick={() => setRotation(r => r + 90)} className="h-11 flex items-center justify-center gap-2 border border-[var(--duke-edge-1)] font-mono text-xs text-[var(--duke-ink-hi)] active:scale-[.97] transition-transform"><RotateCw size={14} /> 90°</button>
                    </div>
                </div>
                <details open={sizeOpen} className="border border-[var(--duke-edge-1)] group">
                    <summary className="h-11 px-3 flex items-center gap-2 cursor-pointer list-none font-mono text-xs text-[var(--duke-ink-hi)]">
                        <Maximize2 size={14} className="text-[var(--duke-amber)]"/> 3D size {dimensions.w} × {dimensions.h} × {dimensions.d} mm
                        <span className="ml-auto text-[var(--duke-ink-8)] group-open:rotate-90 transition-transform">›</span>
                    </summary>
                    <div className="px-3 pb-1"><DimSlider label="Width" val={dimensions.w} axis="w" /><DimSlider label="Height" val={dimensions.h} axis="h" /><DimSlider label="Depth" val={dimensions.d} axis="d" /></div>
                </details>
            </div>
            <div className="shrink-0 flex gap-2 p-4 pt-3">
                <button type="button" onClick={onCancel} className="w-28 h-12 border border-[var(--duke-edge-1)] font-mono text-xs font-bold uppercase tracking-[0.16em] text-[var(--duke-ink-hi)] active:scale-[.97] transition-transform">Cancel</button>
                <button type="button" onClick={executeCrop} className="flex-1 h-12 bg-[var(--duke-amber)] text-[var(--duke-on-fill)] font-mono text-xs font-bold uppercase tracking-[0.16em] flex items-center justify-center gap-2 active:scale-[.97] transition-transform"><Crop size={16}/> Crop &amp; Save</button>
            </div>
        </div>
      </div>
    </div>
  );
}
