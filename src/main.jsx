import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConfirmHost } from './components/ConfirmGate.jsx'
import { ToastHost } from './components/Toast.jsx'
import { unlockSounds } from './hooks/useSound.js'
import { registerSW } from 'virtual:pwa-register'

/* THE PHONE SHOWED THE OLD APP AFTER AN UPDATE — three times (2026-08-20, 09-18, 09-19). This app is
   a PWA: the service worker hands the phone its STORED copy first and the new build downloads behind
   it, and the injected registerSW.js only ever registered — it never reloaded — so a new build showed
   on the SECOND open, and a test on the first open judged the old code. This register (the plugin's
   autoUpdate mode) reloads the page once, the moment a new worker takes over, and asks for updates
   every hour while the tab stays open. The BUILD id in the Flight Recorder says which build runs. */
registerSW({ immediate: true, onRegisteredSW(_url, r) { if (r) setInterval(() => r.update(), 60 * 60 * 1000); } });

/* Browsers refuse to play audio until the page has had a real user gesture, and `playSound`
   correctly returns false rather than throwing. Until now the ONLY thing that ever unlocked it
   was the sales terminal — so every sound anywhere else in the app was silent forever, which is
   the other half of why Aldi reported the toast strips as having no SFX: he was testing them
   from the Master Vault, which never unlocks.
   THE SECOND HALF OF THE SILENT-IPHONE BUG, and it was `{ once: true }`. One tap on a phone
   fires BOTH `pointerdown` and `touchstart`, so a single touch tore down all three listeners —
   whether or not the unlock had actually worked. If that first gesture failed to unlock (and on
   iOS the first touch of a session very often does), the app was muted for the rest of the
   session with nothing left listening to try again.

   So: stay armed until the unlock actually reports success, then stop listening. `unlockSounds`
   returns early once unlocked, so extra gestures cost a resolved promise and nothing else, and
   the terminal's own calls stay harmless. */
const SOUND_GESTURES = ['pointerdown', 'keydown', 'touchstart']
const onGestureUnlock = () => {
  unlockSounds().then((ok) => {
    if (!ok) return
    for (const evt of SOUND_GESTURES) window.removeEventListener(evt, onGestureUnlock, true)
  })
}
for (const evt of SOUND_GESTURES) {
  window.addEventListener(evt, onGestureUnlock, { passive: true, capture: true })
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
