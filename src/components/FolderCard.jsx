import { useRef, useState } from 'react';

/* THE FOLDER CARD — his video, 2026-09-19 ("make the folder design more alive like this video"), and his
   09:40 ask: "add hold effect on the folder, just like the video … we have hold mechanic as well on the side
   panel". The look is .kpm-folder in theme.css (a manila lid, a numbered tab, an ↗ key; the panel is the
   children). The mechanic is here, the same shape as the edge ribbon's and HoldButton's:
     tap  → opens at once (a salesman drilling through regions must not wait);
     hold → the lid lifts for the whole hold — the lift IS the progress, like the ribbon's swell — and when
            it is fully up the folder opens by itself, no release needed.
   A hold that opens replaces the list under the finger, so the click the browser fires on release would
   land on the NEXT screen's folder and open it too: every instance shares one `swallowUntil` clock and
   ignores a click for 400 ms after any hold-open. */
export const FOLDER_HOLD_MS = 700;
let swallowUntil = 0;

export default function FolderCard({ icon, onOpen, className = '', children }) {
  const [arming, setArming] = useState(false);
  const timer = useRef(null);
  const stop = () => { clearTimeout(timer.current); timer.current = null; setArming(false); };
  const down = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    setArming(true);
    timer.current = setTimeout(() => { stop(); swallowUntil = Date.now() + 400; onOpen(); }, FOLDER_HOLD_MS);
  };
  const click = () => { if (Date.now() < swallowUntil) return; onOpen(); };
  return (
    <button type="button" onPointerDown={down} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onClick={click} onContextMenu={(e) => e.preventDefault()}
      className={`kpm-folder ${arming ? 'arming' : ''} ${className}`} style={{ touchAction: 'manipulation', WebkitUserSelect: 'none', userSelect: 'none' }}>
      <div className="kpm-folder-lid">{icon}</div>
      <div className="kpm-folder-panel">{children}</div>
    </button>
  );
}
