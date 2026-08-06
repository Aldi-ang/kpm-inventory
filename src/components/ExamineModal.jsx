import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomOut, Lock, Unlock, ZoomIn, Maximize2, RefreshCcw } from 'lucide-react';

export default function ExamineModal({ product, onClose, onUpdateProduct, isAdmin }) {
  const [rotation, setRotation] = useState({ x: -15, y: 25 });
  const [isDragging, setIsDragging] = useState(false);
  const [viewScale, setViewScale] = useState(2.8);
  const [isScaleLocked, setIsScaleLocked] = useState(false);
  
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState(product.dimensions || { w: 55, h: 90, d: 22 });
  const initialRotation = { x: -15, y: 25 };

  useEffect(() => {
    let animationFrameId;
    const animate = () => {
      if (!isDragging) setRotation(prev => ({ ...prev, y: prev.y + 0.4 }));
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isDragging]); 

  const handleDimensionsChange = (newDims) => { setDimensions(newDims); if (onUpdateProduct) onUpdateProduct({ ...product, dimensions: newDims }); };
  const handleReset = () => { setRotation(initialRotation); setViewScale(2.8); };
  const handleZoom = (delta) => { if (isScaleLocked) return; setViewScale(prev => Math.min(5, Math.max(0.5, prev + delta))); };
  
  const w = dimensions.w * viewScale; const h = dimensions.h * viewScale; const d = dimensions.d * viewScale;
  
  const handleMouseDown = (e) => { setIsDragging(true); lastMousePos.current = { x: e.clientX, y: e.clientY }; };
  
  const handleMouseMove = (e) => { 
      if (!isDragging) return; 
      const deltaX = e.clientX - lastMousePos.current.x; 
      const deltaY = e.clientY - lastMousePos.current.y; 
      setRotation(prev => ({ x: prev.x - deltaY * 0.5, y: prev.y + deltaX * 0.5 })); 
      lastMousePos.current = { x: e.clientX, y: e.clientY }; 
  };
  
  const handleMouseUp = () => setIsDragging(false);
  
  const renderFace = (imageSrc, defaultColor = "bg-white") => { if (imageSrc) return <img src={imageSrc} className="w-full h-full object-cover" alt="texture" />; return <div className={`w-full h-full ${defaultColor} border border-[#5c4b3a] opacity-90`}></div>; };
  
  const images = product.images || {};
  const frontImage = images.front || product.image;
  const backImage = product.useFrontForBack ? frontImage : images.back;
  
  const BoxSlider = ({ label, val, axis }) => (
    <div className="flex flex-col gap-1"><div className="flex justify-between text-[10px] text-white/70 uppercase font-bold"><span>{label}</span><span>{val}mm</span></div><input type="range" min="10" max="300" step="1" value={val} onChange={(e) => handleDimensionsChange({ ...dimensions, [axis]: parseInt(e.target.value) })} className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-orange-500" onMouseDown={(e) => e.stopPropagation()}/></div>
  );

  return (
    /* kpm-examine-in: the ground fades, the object scales up from .94. It used to appear
       fully formed with no transition at all, which reads as a jump cut — the box is simply
       THERE, and the eye has to re-find what it was looking at.

       Never from scale(0): nothing in the world appears out of nothing, and a box that grows
       from a point reads as a special effect rather than as picking something up. */
    <div className="kpm-examine-in fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4 overflow-hidden" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <button onClick={onClose} className="absolute top-8 right-8 text-white hover:text-red-500 z-50 p-2 bg-black/20 rounded-full"><X size={40} /></button>
      
      <div className="absolute top-8 right-24 z-50 flex gap-2" onMouseDown={(e) => e.stopPropagation()}>
         <button onClick={() => handleZoom(-0.2)} className="p-2 bg-black/60 text-white rounded-full hover:bg-white/20"><ZoomOut size={18}/></button>
         <button onClick={() => setIsScaleLocked(!isScaleLocked)} className={`p-2 rounded-full hover:bg-white/20 ${isScaleLocked ? 'bg-orange-600 text-white' : 'bg-black/60 text-white'}`}>{isScaleLocked ? <Lock size={18}/> : <Unlock size={18}/>}</button>
         <button onClick={() => handleZoom(0.2)} className="p-2 bg-black/60 text-white rounded-full hover:bg-white/20"><ZoomIn size={18}/></button>
      </div>

      {isAdmin && (<div className="absolute top-8 left-8 z-50 bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-xl w-48 shadow-xl" onMouseDown={(e) => e.stopPropagation()}><div className="flex justify-between items-center mb-3"><h4 className="text-xs font-bold text-white flex items-center gap-2"><Maximize2 size={12} className="text-orange-500"/> Dimensions</h4><button onClick={handleReset} className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"><RefreshCcw size={10} /> Reset</button></div><div className="space-y-4"><BoxSlider label="Width" val={dimensions.w} axis="w" /><BoxSlider label="Height" val={dimensions.h} axis="h" /><BoxSlider label="Depth" val={dimensions.d} axis="d" /></div></div>)}
      
      <div className="text-white mb-12 text-center font-mono pointer-events-none select-none mt-20 md:mt-0">
          <h2 className="text-3xl font-bold tracking-[0.2em] uppercase text-orange-500 drop-shadow-lg">{product.name}</h2>
          <p className="text-[#d4af37] text-xs mt-2 tracking-widest animate-pulse">
              {isDragging ? "INSPECTING OBJECT..." : "AUTOMATIC ROTATION"}
          </p>
      </div>

      <div className="kpm-examine-object relative w-full max-w-md h-[400px] flex items-center justify-center perspective-1000 cursor-move">
        <div className="relative preserve-3d" style={{ width: `${w}px`, height: `${h}px`, transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`, transformStyle: 'preserve-3d', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}>
          <div className="absolute inset-0 bg-white backface-hidden flex items-center justify-center border border-[#5c4b3a]" style={{ width: w, height: h, transform: `translateZ(${d / 2}px)` }}>{frontImage ? <img src={frontImage} className="w-full h-full object-cover"/> : <span className="text-4xl">🚬</span>}<div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div></div>
          <div className="absolute inset-0 bg-[#1a1815] backface-hidden flex items-center justify-center border border-[#3e3226]" style={{ width: w, height: h, transform: `rotateY(180deg) translateZ(${d / 2}px)` }}>{renderFace(backImage, "bg-[#1a1815]")}</div>
          <div className="absolute" style={{ width: d, height: h, transform: `rotateY(90deg) translateZ(${w / 2}px)`, left: (w - d)/2 }}>{renderFace(images.right, "bg-[#d4c5a3]")}</div>
          <div className="absolute" style={{ width: d, height: h, transform: `rotateY(-90deg) translateZ(${w / 2}px)`, left: (w - d)/2 }}>{renderFace(images.left, "bg-[#d4c5a3]")}</div>
          <div className="absolute" style={{ width: w, height: d, transform: `rotateX(90deg) translateZ(${h / 2}px)`, top: (h - d)/2 }}>{renderFace(images.top, "bg-[#a89070]")}</div>
          <div className="absolute" style={{ width: w, height: d, transform: `rotateX(-90deg) translateZ(${h / 2}px)`, top: (h - d)/2 }}>{renderFace(images.bottom, "bg-[#a89070]")}</div>
        </div>
      </div>

      <div className="mt-8 w-full max-w-2xl bg-black/60 border-t border-b border-orange-500/50 p-6 backdrop-blur-md pointer-events-none select-none">
        <div className="flex justify-between items-start mb-2 font-mono text-xs text-[#ff9d00]">
           <span>{isAdmin ? `STOCK: ${product.stock} Bks` : "3D VISUALIZATION"}</span>
           <span>TYPE: {product.type}</span>
           <span>CUKAI: {product.taxStamp || 'Standard'}</span>
        </div>
        <p className="text-white font-serif text-lg leading-relaxed text-center shadow-black drop-shadow-md">"{product.description || "A standard pack of cigarettes. No unusual properties detected."}"</p>
      </div>
    </div>
  );
}