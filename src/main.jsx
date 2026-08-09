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
