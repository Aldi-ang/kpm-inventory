import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConfirmHost } from './components/ConfirmGate.jsx'
import { ToastHost } from './components/Toast.jsx'
import { unlockSounds } from './hooks/useSound.js'

/* Browsers refuse to play audio until the page has had a real user gesture, and `playSound`
   correctly returns false rather than throwing. Until now the ONLY thing that ever unlocked it
   was the sales terminal — so every sound anywhere else in the app was silent forever, which is
   the other half of why Aldi reported the toast strips as having no SFX: he was testing them
   from the Master Vault, which never unlocks.
   One listener, once, on the first gesture of any kind. `unlockSounds` returns early if it has
   already run, so the terminal's own calls stay harmless. */
for (const evt of ['pointerdown', 'keydown', 'touchstart']) {
  window.addEventListener(evt, () => unlockSounds(), { once: true, passive: true })
}

/* iPHONE PINCH GUARD. His report: "sometimes i drag something and the whole app zoom and moved".
   iOS Safari IGNORES user-scalable=no in the viewport tag, so the meta line alone does nothing
   there — these Safari-only `gesture*` events are the only way to refuse a page pinch.

   🔴 THE MAP IS DELIBERATELY EXEMPT. Leaflet is in this app and pinch-to-zoom is how a map is
   used; blocking it everywhere would break the one screen that genuinely needs it. Leaflet does
   its own pinch from raw touch events, so letting Safari's gesture through inside
   `.leaflet-container` keeps the map working while the rest of the app stays put.

   These must NOT be passive — a passive listener cannot preventDefault, which is the entire
   point, and the browser makes touch listeners passive by default. */
for (const evt of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(evt, (e) => {
    if (e.target?.closest?.('.leaflet-container')) return
    e.preventDefault()
  }, { passive: false })
}

/* Both hosts are siblings of App, not children, so no screen can unmount them and leave the
   app's confirms refusing or its reports going nowhere. Each renders nothing until something
   calls confirmAction() or notify(). integration.audit.mjs asserts both lines still exist.
   See ConfirmGate.jsx and Toast.jsx for why the browser dialogs were banned outright. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ConfirmHost />
    <ToastHost />
  </StrictMode>,
)
