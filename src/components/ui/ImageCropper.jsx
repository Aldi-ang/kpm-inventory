import React, { useState, useRef, useEffect } from 'react';
import { Crop, Move, RefreshCcw, Maximize2, RotateCcw, RotateCw, X } from 'lucide-react';

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

export default ImageCropper;