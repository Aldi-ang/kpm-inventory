import React, { useState, useEffect } from 'react';
import { Check, RefreshCcw, WifiOff, AlertTriangle } from 'lucide-react';
import { getRegistration, updateState, UPDATE_LABEL } from '../utils/updateCheck.js';

const BUILD = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

/* One line under the sign-in button and under the vault's Fingerprint row: the update check's answer + the build
   running on this device (the same id the Flight Recorder shows). Asks once, when the screen opens. */
export default function UpdateStatus({ className = '' }) {
  const [state, setState] = useState('checking');
  useEffect(() => {
    let live = true;
    const say = (s) => { if (live) setState(s); };
    (async () => {
      const supported = 'serviceWorker' in navigator;
      if (!supported || !navigator.onLine) return say(updateState({ supported, online: navigator.onLine }));
      const r = await getRegistration();
      let failed = false;
      if (r) { try { await r.update(); } catch { failed = true; } }
      const s = updateState({ supported, online: navigator.onLine, reg: r, failed });
      /* a download that dies never reloads the page - say so instead of "updating…" forever. One that FINISHES on a page
         no worker controlled at load (hard refresh, fresh tab) gets no autoUpdate reload either - it says so too (2026-10-06) */
      const w = r && (r.installing || r.waiting);
      if (s === 'updating' && w) w.addEventListener('statechange', () => { if (w.state === 'redundant') say('failed'); if (w.state === 'activated') say('latest'); });
      say(s);
    })();
    return () => { live = false; };
  }, []);

  const Icon = { latest: Check, offline: WifiOff, failed: AlertTriangle, checking: RefreshCcw, updating: RefreshCcw }[state];
  const spin = (state === 'checking' || state === 'updating') && !document.documentElement.classList.contains('lite-mode');   /* Lite Mode: nothing rotates */
  return (
    <p role="status" aria-live="polite" className={`flex items-center justify-center gap-1.5 ${className}`}>
      {Icon && <Icon size={10} aria-hidden="true" className={spin ? 'motion-safe:animate-spin' : ''} />}
      <span>{UPDATE_LABEL[state]}</span>
      <span aria-hidden="true">·</span>
      <span className="font-mono normal-case tracking-normal">{BUILD}</span>
    </p>
  );
}
