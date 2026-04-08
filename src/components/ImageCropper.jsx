import React, { useState, useEffect, useRef } from 'react';
import { Crop, Move, Maximize2, RotateCcw, RotateCw } from 'lucide-react';

export default function ImageCropper({ imageSrc, onCancel, onCrop, dimensions, onDimensionsChange, face }) {
  const imgRef = useRef(null);
  const boxRef = useRef(null);
  const containerRef = useRef(null);
  
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  const state = useRef({
    isDragging: false, dragType: null, startX: 0, startY: 0,
    initialPanX: 0, initialPanY: 0, initialW: 200, initialH: 200,
    panX: 0, panY: 0, w: 200, h: 200
  });

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

  const handleMouseDown = (e, type) => {
    e.preventDefault(); e.stopPropagation();
    state.current.isDragging = true; state.current.dragType = type;
    state.current.startX = e.clientX; state.current.startY = e.clientY;
    state.current.initialPanX = state.current.panX; state.current.initialPanY = state.current.panY;
    state.current.initialW = state.current.w; state.current.initialH = state.current.h;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
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

  const onMouseUp = () => {
    state.current.isDragging = false;
    document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp);
  };

  const executeCrop = () => {
    const canvas = document.createElement('canvas'); const BASE_RES = 500;
    const ratio = state.current.w / state.current.h;
    if (ratio > 1) { canvas.width = BASE_RES; canvas.height = BASE_RES / ratio; } else { canvas.height = BASE_RES; canvas.width = BASE_RES * ratio; }
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    const img = imgRef.current; 
    ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate((rotation * Math.PI) / 180);
    const scaleFactor = canvas.width / state.current.w; 
    ctx.translate(state.current.panX * scaleFactor, state.current.panY * scaleFactor); ctx.scale(zoom * scaleFactor, zoom * scaleFactor);
    if (img) ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    onCrop(canvas.toDataURL('image/png', 1.0));
  };
  
  const DimSlider = ({ label, val, axis }) => (
    <div className="flex flex-col mb-4">
        <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400">{label}</label>
            <div className="flex items-center gap-1">
                <input type="number" value={val} onChange={(e) => onDimensionsChange({...dimensions, [axis]: Math.max(1, parseInt(e.target.value) || 0)})} className="w-12 text-right text-xs font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded text-slate-700 dark:text-slate-200 border border-transparent focus:border-orange-500 outline-none"/>
                <span className="text-[10px] text-slate-400">mm</span>
            </div>
        </div>
        <input type="range" min="1" max="300" step="1" value={val} onChange={(e) => onDimensionsChange({...dimensions, [axis]: parseInt(e.target.value)})} className="w-full h-3 rounded-full appearance-none cursor-pointer accent-orange-500 bg-orange-100 dark:bg-orange-900/30"/>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col bg-slate-900 relative select-none">
            <div className="p-4 z-30 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide"><Crop size={14} className="text-cyan-400"/> Align {face}</h3>
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden relative" ref={containerRef}>
                <div ref={boxRef} className="relative" style={{ width: 200, height: 200 }}>
                    <div className="absolute inset-0 overflow-visible cursor-move z-10" onMouseDown={(e) => handleMouseDown(e, 'move')}>
                        <img ref={imgRef} src={imageSrc} className="absolute max-w-none origin-center" style={{ left: '50%', top: '50%', transform: `translate3d(-50%, -50%, 0) scale(${zoom}) rotate(${rotation}deg)`, userSelect: 'none', pointerEvents: 'none' }}/>
                    </div>
                    <div className="absolute inset-0 border-[3px] border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.85)] z-20 pointer-events-none"></div>
                    <div className="absolute right-[-12px] top-1/2 -translate-y-1/2 w-6 h-12 bg-white border-2 border-cyan-500 rounded-full z-30 cursor-ew-resize flex items-center justify-center shadow-lg" onMouseDown={(e) => handleMouseDown(e, 'resize-r')}><Move size={12} className="text-cyan-600 rotate-90"/></div>
                    <div className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 h-6 w-12 bg-white border-2 border-cyan-500 rounded-full z-30 cursor-ns-resize flex items-center justify-center shadow-lg" onMouseDown={(e) => handleMouseDown(e, 'resize-b')}><Move size={12} className="text-cyan-600"/></div>
                    <div className="absolute bottom-[-10px] right-[-10px] w-8 h-8 bg-cyan-500 border-4 border-white rounded-full z-30 cursor-nwse-resize shadow-lg" onMouseDown={(e) => handleMouseDown(e, 'resize-rb')}/>
                </div>
            </div>
        </div>
        <div className="w-full md:w-80 bg-white dark:bg-slate-900 p-6 flex flex-col gap-6 border-l dark:border-slate-700 overflow-y-auto z-40">
            <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2"><Maximize2 size={18} className="text-orange-500"/><h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">3D Size</h4></div>
                </div>
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
            <div className="mt-auto pt-4 flex gap-3">
                <button onClick={onCancel} className="px-6 py-4 rounded-xl bg-slate-100 dark:bg-slate-800 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={executeCrop} className="flex-1 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/40 transition-all transform active:scale-95"><Crop size={20}/> Crop & Save</button>
            </div>
        </div>
      </div>
    </div>
  );
}