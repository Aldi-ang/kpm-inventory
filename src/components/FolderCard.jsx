import { useRef, useState } from 'react';

/* THE FOLDER CARD — his video, 2026-09-19 ("make the folder design more alive like this video"). The look is
   .kpm-folder in theme.css (a manila lid, a paper file in its pocket, a numbered tab, an ↗ key; the panel is
   the children). The mechanic, his 10:35 correction: "when hold folder should not click it will just animate
   bro, click to enter not hold":
     tap  → opens (a salesman drilling through regions must not wait);
     hold → the folder OPENS on screen for as long as the finger stays — the lid grows, the paper slides out —
            and shuts again on release. A hold never enters: a press that lasted FOLDER_HOLD_MS or more
            swallows the click the browser fires on release (a mouse always fires one; a phone sometimes does).
   The long-press menu is prevented and the card is not selectable, so a hold stays a hold. */
export const FOLDER_HOLD_MS = 350;   // a press this long is a hold, not a tap

export default function FolderCard({ icon, onOpen, className = '', children }) {
  const [arming, setArming] = useState(false);
  const t0 = useRef(0);
  const held = useRef(false);
  const down = (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; t0.current = Date.now(); held.current = false; setArming(true); };
  const up = () => { held.current = Date.now() - t0.current >= FOLDER_HOLD_MS; setArming(false); };
  const click = () => { if (held.current) { held.current = false; return; } onOpen(); };
  return (
    <button type="button" onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
      onClick={click} onContextMenu={(e) => e.preventDefault()}
      className={`kpm-folder ${arming ? 'arming' : ''} ${className}`} style={{ touchAction: 'manipulation', WebkitUserSelect: 'none', userSelect: 'none' }}>
      <div className="kpm-folder-lid"><i className="kpm-folder-file" aria-hidden="true"></i><span className="kpm-folder-icon">{icon}</span></div>
      <div className="kpm-folder-panel">{children}</div>
    </button>
  );
}
