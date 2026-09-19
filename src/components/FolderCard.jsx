import { useRef, useState } from 'react';

/* THE FOLDER CARD — his video, 2026-09-19 ("make the folder design more alive like this video"). The look is
   .kpm-folder in theme.css (a manila lid, a paper file in its pocket, a numbered tab; the panel is the
   children). The mechanic, from his corrections through the day:
     tap  → the folder OPENS on screen first (a quick lift, FOLDER_TAP_MS) and THEN enters — his 11:50 "when
            i only press and not hold … the button will just skip the animation and go directly inside";
     hold → the folder opens on screen for as long as the finger stays and shuts again on release; a hold
            never enters ("when hold folder should not click it will just animate bro, click to enter not
            hold", 10:35).
   The click the browser fires on release is swallowed in both cases — the tap enters by its own timer, the
   hold does not enter at all; a keyboard or synthetic click (no pointer) still enters at once. The long-press
   menu is prevented and the card is not selectable, so a hold stays a hold. */
export const FOLDER_HOLD_MS = 350;   // a press this long is a hold, not a tap
export const FOLDER_TAP_MS = 300;    // how long a tap's open plays before the folder enters

export default function FolderCard({ icon, onOpen, className = '', children }) {
  const [arming, setArming] = useState(false);   // the finger is down
  const [opening, setOpening] = useState(false); // a tap's open is playing before it enters
  const t0 = useRef(0);
  const swallow = useRef(false);
  const down = (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; t0.current = Date.now(); swallow.current = false; setArming(true); };
  const up = (e) => {
    swallow.current = true;
    setArming(false);
    if (Date.now() - t0.current >= FOLDER_HOLD_MS) return;          // a hold: shut, never enter
    setOpening(true);                                                // a tap: open on screen, then enter
    /* the other folders of this list step back while this one opens (.kpm-leaving in theme.css); the list
       unmounts when the next level arrives, so nothing has to be undone — his 12:40 "continue" on the exit */
    e.currentTarget.closest('.kpm-folders')?.classList.add('kpm-leaving');
    setTimeout(() => { setOpening(false); onOpen(); }, FOLDER_TAP_MS);
  };
  const leave = () => { swallow.current = true; setArming(false); };   // the finger slid off: shut, no entry
  const click = () => { if (swallow.current) { swallow.current = false; return; } onOpen(); };
  return (
    <button type="button" onPointerDown={down} onPointerUp={up} onPointerLeave={leave} onPointerCancel={leave}
      onClick={click} onContextMenu={(e) => e.preventDefault()}
      className={`kpm-folder ${arming ? 'arming' : ''} ${opening ? 'opening' : ''} ${className}`} style={{ touchAction: 'manipulation', WebkitUserSelect: 'none', userSelect: 'none' }}>
      <div className="kpm-folder-lid"><i className="kpm-folder-file" aria-hidden="true"></i><span className="kpm-folder-icon">{icon}</span></div>
      <div className="kpm-folder-panel">{children}</div>
    </button>
  );
}
