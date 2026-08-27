/* The entry point, and it is the thing itself — not a manual in a menu.

   Create's Ponder opens by holding a key over the ITEM you are confused by; there is no index to
   go find. The nearest honest web version is a chip that lives in the header of the panel you are
   already looking at. His call, 2026-08-27: *"dont push newcomer towards the scene let them figure
   out by pressing the tutorial button"* — so this never opens itself, and nothing here tracks
   whether a person has seen it. */
import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import PonderOverlay from './PonderOverlay.jsx';

export default function PonderButton({ sceneId, label = 'Tutorial' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        className="shrink-0 inline-flex items-center gap-1.5 h-8 pl-2 pr-2.5 rounded-lg border border-line-2 bg-raised
                   text-ink-muted hover:text-accent-ink hover:border-accent-edge
                   active:scale-[0.97] transition-[transform,color,border-color] duration-150 ease-out"
      >
        <HelpCircle size={14} />
        <span className="font-mono text-[10px] uppercase tracking-widest">{label}</span>
      </button>
      <PonderOverlay sceneId={sceneId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
