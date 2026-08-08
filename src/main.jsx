import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConfirmHost } from './components/ConfirmGate.jsx'
import { ToastHost } from './components/Toast.jsx'

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
