import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConfirmHost } from './components/ConfirmGate.jsx'

/* ConfirmHost is a sibling of App, not a child, so no screen can unmount it and leave the
   app's confirms refusing. It renders nothing until something calls confirmAction().
   integration.audit.mjs asserts this line still exists. See ConfirmGate.jsx for why
   window.confirm was banned outright. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ConfirmHost />
  </StrictMode>,
)
