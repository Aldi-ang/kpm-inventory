import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomOut, Lock, Unlock, ZoomIn, RefreshCcw } from 'lucide-react';

const START_ROTATION = { x: -15, y: 25 };
const START_SCALE = 2.8;

export default function ExamineModal({ product, onClose, isAdmin }) {
  const [isDragging, setIsDragging] = useState(false);
  const [viewScale, setViewScale] = useState(START_SCALE);
  const [isScaleLocked, setIsScaleLocked] = useState(false);

  const lastMousePos = useRef({ x: 0, y: 0 });
  const dimensions = product.dimensions || { w: 55, h: 90, d: 22 };

  /* THE FLICKER ALDI REPORTED, and it was three faults stacked on one another.
     The spin used to call setRotation once per animation frame, so this whole modal — six
     image faces and all — re-rendered ~60 times a second on his phone. On top of that the box
     carried `transition: transform 0.1s`, so every frame interrupted a 100ms interpolation
     that had just started, which is what actually reads as flicker rather than as motion.
     And the rAF effect listed isDragging, so it tore itself down and restarted mid-gesture.

     The rotation now lives in a ref and is written straight to the node's style. React renders
     this component when the SCALE changes and at no other time during a spin. */
  const boxRef = useRef(null);
  const rotRef = useRef({ ...START_ROTATION });
  const draggingRef = useRef(false);

  useEffect(() => {
    let animationFrameId;
    const animate = () => {
      if (!draggingRef.current) rotRef.current.y += 0.4;
      const el = boxRef.current;
      if (el) el.style.transform = `rotateX(${rotRef.current.x}deg) rotateY(${rotRef.current.y}deg)`;
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleReset = () => { rotRef.current = { ...START_ROTATION }; setViewScale(START_SCALE); };
  const handleZoom = (delta) => { if (isScaleLocked) return; setViewScale(prev => Math.min(5, Math.max(0.5, prev + delta))); };

  const w = dimensions.w * viewScale; const h = dimensions.h * viewScale; const d = dimensions.d * viewScale;

  /* Pointer events, not mouse events: this screen is opened from the sales terminal, which he
     uses on a phone, and a mouse handler never fires for a finger drag. */
  const handleMouseDown = (e) => { draggingRef.current = true; setIsDragging(true); lastMousePos.current = { x: e.clientX, y: e.clientY }; };

  const handleMouseMove = (e) => {
      if (!draggingRef.current) return;
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      rotRef.current = { x: rotRef.current.x - deltaY * 0.5, y: rotRef.current.y + deltaX * 0.5 };
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => { draggingRef.current = false; setIsDragging(false); };

  const renderFace = (imageSrc, defaultColor = "bg-white") => { if (imageSrc) return <img src={imageSrc} className="w-full h-full object-cover" alt="texture" />; return <div className={`w-full h-full ${defaultColor} border border-[#5c4b3a] opacity-90`}></div>; };
  
  const images = product.images || {};
  const frontImage = images.front || product.image;
  const backImage = product.useFrontForBack ? frontImage : images.back;
  
  return (
    /* kpm-examine-in: the ground fades, the object scales up from .94. It used to appear
       fully formed with no transition at all, which reads as a jump cut — the box is simply
       THERE, and the eye has to re-find what it was looking at.

       Never from scale(0): nothing in the world appears out of nothing, and a box that grows
       from a point reads as a special effect rather than as picking something up. */
    /* z-[10000], not z-[60]. The notification bell sits at z-[9999], so at 60 this "full
       screen" view was never actually on top — the bell stayed clickable through it and a
       stray press could navigate away mid-inspection. Backdrop blur as well as the dark:
       blur is what signals a layer you can dismiss, rather than one more panel. */
    <div className="kpm-examine-in fixed inset-0 z-[10000] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 overflow-hidden" onPointerDown={handleMouseDown} onPointerMove={handleMouseMove} onPointerUp={handleMouseUp} onPointerLeave={handleMouseUp}>
      <button onClick={onClose} className="absolute top-8 right-8 text-white hover:text-red-500 z-50 p-2 bg-black/20 rounded-full"><X size={40} /></button>

      {/* THE DIMENSIONS PANEL IS GONE FROM THIS SCREEN, on his instruction: "dimension panel
          should only be exist inside master vault and not the preview in sales terminal".
          It also sat on top of the product name on a phone. The sliders still exist where the
          measuring actually happens — ImageCropper, opened from Master Vault (App.jsx:3519),
          which is what writes `product.dimensions` in the first place. This screen only READS
          them now, so it no longer needs onUpdateProduct at all.
          Reset moved in here because it was living inside that panel and is worth keeping. */}
      <div className="absolute top-8 right-24 z-50 flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
         <button onClick={() => handleZoom(-0.2)} className="p-2 bg-black/60 text-white rounded-full hover:bg-white/20"><ZoomOut size={18}/></button>
         <button onClick={() => setIsScaleLocked(!isScaleLocked)} className={`p-2 rounded-full hover:bg-white/20 ${isScaleLocked ? 'bg-orange-600 text-white' : 'bg-black/60 text-white'}`}>{isScaleLocked ? <Lock size={18}/> : <Unlock size={18}/>}</button>
         <button onClick={() => handleZoom(0.2)} className="p-2 bg-black/60 text-white rounded-full hover:bg-white/20"><ZoomIn size={18}/></button>
         <button onClick={handleReset} className="p-2 bg-black/60 text-white rounded-full hover:bg-white/20"><RefreshCcw size={18}/></button>
      </div>

      <div className="text-white mb-12 text-center font-mono pointer-events-none select-none mt-20 md:mt-0">
          <h2 className="text-3xl font-bold tracking-[0.2em] uppercase text-orange-500 drop-shadow-lg">{product.name}</h2>
          <p className="text-[#d4af37] text-xs mt-2 tracking-widest animate-pulse">
              {isDragging ? "INSPECTING OBJECT..." : "AUTOMATIC ROTATION"}
          </p>
      </div>

      <div className="kpm-examine-object relative w-full max-w-md h-[400px] flex items-center justify-center perspective-1000 cursor-move">
        {/* No `transition` here on purpose. The rAF loop writes this node's transform every
            frame, and a transition would restart on each write — that is the flicker. */}
        <div ref={boxRef} className="relative preserve-3d" style={{ width: `${w}px`, height: `${h}px`, transformStyle: 'preserve-3d' }}>
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