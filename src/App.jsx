import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
/* eslint-disable react-hooks/exhaustive-deps */
import packageJson from '../package.json'; // 🚀 INJECT THE PACKAGE LINK HERE


import { 
  LayoutDashboard, Package, ShoppingCart, FileText, 
  Settings, Sun, Moon, Plus, Trash2,
  Save, X, Upload, RotateCcw, Camera, Download,
  TrendingUp, AlertCircle, ChevronRight, ChevronLeft, DollarSign, Image as ImageIcon,
  User, Lock, ClipboardList, Crop, RotateCw, Move, Maximize2, ArrowRight, RefreshCcw, MessageSquarePlus, MinusCircle, ZoomIn, ZoomOut, Unlock,
  History, ShieldCheck, Copy, Replace, ClipboardCheck, Store, Wallet, Truck, Menu, MapPin, Phone, Edit, Folder,
  Key, MessageSquare, LogIn, LogOut, ShieldAlert, FileJson, UploadCloud, Tag, Calendar, XCircle, Printer, FileSpreadsheet, Pencil, Globe, Music, Database, Bell, ScanFace,
  Cloud, CloudOff, Activity, Eye, EyeOff
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import useTransactionEngine from './hooks/useTransactionEngine';
import useDatabaseSync from './hooks/useDatabaseSync'; 
import useOfflineEngine, { canReachInternet } from './hooks/useOfflineEngine';
import MusicPlayer from './MusicPlayer';
import { injectDynamicPermissions, isFieldLevelTier, hasClearance, handoffEligibility, canApproveHandoffFrom, handoffApprovers } from './config/permissions';
import { POV_OWNER_EMAIL, previewIdentity, testAccountDoc, testAccountName, canUsePovSwitch } from './config/povPreview';
import { warehouseList } from './utils/supply';
import { tallySaleOp, statsPath } from './utils/salesRollupWrite';
import { rebuildMonths } from './utils/salesRollup';
import { hashSecret, verifySecret, needsRehash } from './utils/secretHash';
import { settleProgression } from './utils/progressionHome';
import TierPovSwitch, { PovBanner } from './components/TierPovSwitch';
import ProductPerformancePanel from './components/ProductPerformancePanel';

// --- REUSABLE UI COMPONENTS (Keep these static for fast initial load) ---
import NotificationBell from './components/NotificationBell';
import SafetyStatus from './components/SafetyStatus';
import CapybaraMascot from './components/CapybaraMascot';
import ImageCropper from './components/ImageCropper';
import ExamineModal from './components/ExamineModal';
import LandlordDashboard from './components/LandlordDashboard'; 
import CrownTransferProtocol from './components/CrownTransferProtocol'; 
import BiohazardTheme from './components/BiohazardTheme';
import { unlockSounds, speakMumble } from './hooks/useSound';

// 🚀 ENTERPRISE CODE SPLITTING: Lazy-load all heavy map, chart, and rendering engines
const MapMissionControl = lazy(() => import('./MapMissionControl'));
const JourneyView = lazy(() => import('./JourneyView'));
const StockOpnameView = lazy(() => import('./StockOpnameView'));
const MerchantSalesView = lazy(() => import('./MerchantSalesView'));
const RestockVaultView = lazy(() => import('./RestockVaultView'));
const AgentInventoryView = lazy(() => import('./AgentInventoryView'));
const FleetCanvasManager = lazy(() => import('./FleetCanvasManager'));
const ConsignmentFinanceView = lazy(() => import('./ConsignmentFinanceView')); 
const EODReconciliationView = lazy(() => import('./EODReconciliationView')); 
const AgentProfileView = lazy(() => import('./AgentProfileView')); 
const ResidentEvilInventory = lazy(() => import('./components/ResidentEvilInventory')); 
const HistoryReportView = lazy(() => import('./components/HistoryReportView')); 
const DashboardView = lazy(() => import('./components/DashboardView')); 
const BranchWarehouseManager = lazy(() => import('./components/BranchWarehouseManager'));
/* HEAVY APP 5b (2026-09-30, "it takes a while to load"): three more tabs that were read at the first screen and
   opened by few - Customers 101 KB, Settings 107 KB (with its landlord and career panels), the audit vault. They all
   render inside the <Suspense> + LazyTabBoundary below, so they load on open like every tab above. */
const CustomerManagement = lazy(() => import('./components/CustomerManager').then(m => ({ default: m.CustomerManagement })));
const SettingsView = lazy(() => import('./components/SettingsView'));
const AuditVaultView = lazy(() => import('./components/AuditVaultView'));
// 🚀 recharts + @reduxjs/toolkit + d3-* only live inside SamplingManager — keep it out of the
// eager chunk. Named exports need the .then(m => ({default: m.X})) form since lazy() only
// accepts a default export.
const SamplingAnalyticsView = lazy(() => import('./components/SamplingManager').then(m => ({ default: m.SamplingAnalyticsView })));
const SamplingCartView = lazy(() => import('./components/SamplingManager').then(m => ({ default: m.SamplingCartView })));
const SamplingFolderView = lazy(() => import('./components/SamplingManager').then(m => ({ default: m.SamplingFolderView })));
const SampleEntryModal = lazy(() => import('./components/SamplingManager').then(m => ({ default: m.SampleEntryModal })));

/* 🚨 THE LAZY-TAB CATCHER. The <Suspense> below covers a tab chunk that is still DOWNLOADING.
   A chunk that FAILS to download — no signal, cache miss — throws, nothing catches it, and React
   throws away the whole page: the black frozen screen Aldi hit with airplane mode on, 2026-08-19.
   Must be a class; React has no hook form of getDerivedStateFromError. Keyed on activeTab at the
   call site, so leaving a broken tab clears the failure. Pinned by S26. */
class LazyTabBoundary extends React.Component {
  state = { failed: false, checking: false };
  static getDerivedStateFromError() { return { failed: true }; }
  /* Reloading with no signal is only safe if the offline helper has the whole app stored. On the
     dev server it stores the page but NOT the code, so a reload there paints a white page and he
     loses the working app - Aldi hit exactly that, 2026-08-19. Offline we clear the error instead:
     the screen retries, fails again if it still cannot be fetched, and shows this box again. The
     app is never thrown away. Online, a reload is the only thing that clears a failed import,
     because React caches the rejection for the life of the page. */
  retry = async () => {
    this.setState({ checking: true });
    const reachable = await canReachInternet();
    this.setState({ checking: false });
    if (reachable) { window.location.reload(); return; }
    this.setState({ failed: false });
  };
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-fade-in">
        <p className="text-[var(--duke-amber-ink)] font-black uppercase text-sm tracking-[0.2em] mb-3">
          [{String(this.props.tab || 'screen').toUpperCase()}] failed to load
        </p>
        <p className="text-[var(--duke-ink-3)] text-xs font-bold uppercase tracking-widest max-w-md leading-relaxed mb-8">
          This screen could not load without signal. Reconnect, then try again.
        </p>
        <button onClick={this.retry} className="px-10 py-4 border-2 border-amber-500/50 text-amber-400 font-black uppercase text-xs hover:bg-amber-900/30 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          {this.state.checking ? 'Checking…' : 'Try Again'}
        </button>
      </div>
    );
  }
}


// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import {
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,     
  GoogleAuthProvider,
  setPersistence,        
  browserLocalPersistence 
} from 'firebase/auth';


// --- PINPOINT: Firestore Imports (Around Line 41) ---
import { 
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  where,
  runTransaction, 
  writeBatch,
  arrayUnion,                // 🚀 ADD THIS FOR THE TELEMETRY TRACKER
  increment,                 // 🚀 ADD THIS FOR SAFE DAMAGED-STOCK CREDITING
  enableIndexedDbPersistence // <--- ADD THIS FOR OFFLINE MODE
} from "firebase/firestore";

// --- CONFIG & UTILITIES IMPORTS ---
import { auth, db, storage, googleProvider, appId, IS_DEMO } from './config/firebase';
import { formatRupiah, getCurrentDate, getLocalDayKey, convertToBks, commitInChunks, savePhotoAndGetReference, storeKey, storeLabel, eodBountyLines, eodReportParts, eodNightMessage, EOD_PART_LABELS, absentForSure } from './utils/helpers';
import { isLowStock } from './utils/stockThreshold';
import { computeDayXP, DEFAULT_XP, checkBadges, DEFAULT_BADGES, DEFAULT_RANKS } from './config/career';
import { confirmAction, promptAction } from './components/ConfirmGate.jsx';
import { notify } from './components/Toast.jsx';
import VaultGate, { gateHoldMs, gateIsRich, gateCanvasOn } from './components/VaultGate.jsx';
import UpdateStatus from './components/UpdateStatus.jsx';
import { readGrace, touchGrace, clearGrace } from './utils/vaultGrace.js';
import { VAULT_TRIES, VAULT_LOCK_MS, lockLeftMs, strikeUpdate, untilText } from './utils/vaultLock.js';
import { vaultDocPath } from './utils/vaultDoc.js';

/* Phones flash the character you just typed before masking it — Aldi: "it shows in split second
   after i type it". That reveal is the platform's, not ours, and there is no way to switch it
   off on a real <input type="password">. The only reliable trick is a TEXT input masked by
   `-webkit-text-security`, which has no reveal logic to run.

   THE TRAP, and why this is feature-detected instead of just done: a browser without
   `-webkit-text-security` would render his MASTER PASSWORD as plain readable text on screen.
   So the swap only happens where the mask is proven to work, and everywhere else it stays a
   genuine password field with the flash. Never make this unconditional. */
const CAN_MASK_TEXT_INPUT =
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' &&
  (CSS.supports('-webkit-text-security', 'disc') || CSS.supports('text-security', 'disc'));

/* A touch screen, i.e. no mouse. Used to NOT autofocus the vault field: on a phone, focusing it
   opens the keyboard over the panel, and the first tap on OPEN THE VAULT is then eaten dismissing
   that keyboard instead of pressing the button — which is exactly what Aldi hit: "i cant press
   open the vault button on my phone it is just not working". On a desk the autofocus is a real
   convenience and costs nothing, so it stays there. */
const IS_TOUCH = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;
import { isFailure } from './utils/toastSeverity.js';
import { missedDocPath, bindMissed, recordMissed } from './utils/missedLog.js';

const APP_VERSION = packageJson.version;

// 🚀 OFFLINE-SAFE DOC READ: Firestore's own docs for getDoc() say it "may return
// cached data OR FAIL if you are offline and the server cannot be reached" — it does
// NOT reliably fall back to the local persistent cache by itself. That's the actual
// root cause of the offline-refresh lockout: the Traffic Cop auth handler's very
// first employee-lookup reads throw instead of quietly reading the cached copy that
// this same device already has from the employee's last successful online login.
// This retries explicitly from cache (getDocFromCache) whenever the first attempt
// fails for a network/offline reason, and throws a distinguishable 'offline-no-cache'
// error only when there's genuinely nothing cached to fall back to (e.g. a device
// that has never been online with this account before) — so callers can tell "I
// couldn't check" apart from "the server said no."
const getDocOfflineSafe = async (ref) => {
    try {
        return await getDoc(ref);
    } catch (err) {
        const looksOffline = !navigator.onLine || err.code === 'unavailable';
        if (!looksOffline) throw err;
        try {
            return await getDocFromCache(ref);
        } catch (cacheErr) {
            const noCacheErr = new Error('No cached data available for this document while offline.');
            noCacheErr.code = 'offline-no-cache';
            throw noCacheErr;
        }
    }
};

// --- GLOBAL COMPONENTS (MOVED UP TO PREVENT CRASH) ---





















// --- MAIN APP COMPONENT ---
export default function KPMInventoryApp() {  // <--- ONLY ONE OPENING BRACE

  /* 🎭 WHO THE APP THINKS YOU ARE vs WHO YOU SIGNED IN AS.
     Five pieces of identity are STATE, written only by the sign-in flow, and five
     are what the screen reads. In normal use they are the same values. While Aldi
     is previewing another tier they differ, and `previewIdentity` is the single
     place that decides how — including the two it forces to false no matter what.
     Every `setUser` / `setIsAdmin` / `setUserRole` call in this file still writes
     the TRUE value; nothing downstream had to change, which is the point. */
  const [trueUser, setUser] = useState(null);
  // ... rest of your code ...
  const [vaultUnlocked, setIsAdmin] = useState(false); // 🚨 FIXED: Default to locked out!
  const [sessionStatus, setSessionStatus] = useState({ recovery: false, usb: false, cloud: false });
  const [trueSystemOwner, setIsSystemOwner] = useState(false);
  /* MOVED UP from the RBAC block below so all five live together — the derivation
     has to come before the first reader, and `user` is read within twenty lines. */
  const [trueRole, setUserRole] = useState('ADMIN');
  const [trueAgentProfileId, setAgentProfileId] = useState(null);
  /* The account the sign-in listener is looking up right now, or null. Drives the CHECKING panel
     while `user` is still null — see the listener. */
  const [checkingEmail, setCheckingEmail] = useState(null);
  // The shop a notification asked us to open. Cleared by the screen once it has honoured it, so
  // pressing the same alert twice works and a stale name cannot re-open a shop later.
  const [focusStore, setFocusStore] = useState(null);
  /* 🎯 The Journey tab's own focus target, separate from `focusStore` above — that one opens a shop
     inside Receivables, this one flies the map to it. Aldi, 2026-09-07, on the hand-off card:
     *"add redirect location on the journey map just to make sure that this area is not too far from
     the agent journey if they want to check"*. */
  const [journeyFocus, setJourneyFocus] = useState(null);
  const showStoreOnJourney = (storeName) => { setJourneyFocus(storeName); setActiveTab('journey'); };

  /* THE COSTUME. Plain state, and it must stay plain state: it is never written to
     localStorage, so a refresh always puts him back in his own chair. His rule. */
  const [pov, setPov] = useState(null);
  const [showPovSwitch, setShowPovSwitch] = useState(false);

  const { user, userRole, agentProfileId, isAdmin, isSystemOwner, previewing } = useMemo(
      () => previewIdentity(pov, {
          user: trueUser, userRole: trueRole, agentProfileId: trueAgentProfileId,
          isAdmin: vaultUnlocked, isSystemOwner: trueSystemOwner
      }),
      /* `user` MUST be memoized. useDatabaseSync takes it as a dependency, and a
         freshly-spread object every render would tear down and rebuild every
         Firestore listener in the app on every render. */
      [pov, trueUser, trueRole, trueAgentProfileId, vaultUnlocked, trueSystemOwner]
  );
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showCrownTransfer, setShowCrownTransfer] = useState(false); // 🚀 ADD THIS
  const [adminPin, setAdminPin] = useState(null);       
  const [hasAdminPin, setHasAdminPin] = useState(false); 
  const [isSetupMode, setIsSetupMode] = useState(false); 

  const [loginError, setLoginError] = useState(null); 
  const [backupToast, setBackupToast] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(localStorage.getItem('passkeyRegistered') === 'true');
  const [registeredPasskeys, setRegisteredPasskeys] = useState([]); // 🚀 SYNCED DEVICES

  // 🚀 CRYPTO HELPER: Fault-tolerant converter for Windows & Android Sensors
  const base64urlToUint8Array = (base64url) => {
      try {
          let base64 = String(base64url).replace(/-/g, '+').replace(/_/g, '/');
          const padLen = (4 - (base64.length % 4)) % 4;
          base64 += '='.repeat(padLen);
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
          return outputArray;
      } catch (e) {
          console.error("Passkey ID decode failed:", e);
          return new Uint8Array(0); // 🚨 Prevents the silent crash
      }
  };

  // 🚀 THE ONBOARDING BRIDGE STATE
  const [pendingMigration, setPendingMigration] = useState(null);

// 🚀 THE OFFLINE GHOST LEDGER & FLIGHT RECORDER
  const { isOnline, syncLogs, pendingCount, pendingTxData, getPendingData, clearProcessedItem, logSyncEvent, clearFlightRecorder } = useOfflineEngine();
  const [showFlightRecorder, setShowFlightRecorder] = useState(false);

  // 📡 THE LOUD AUTO-SYNC: Fires the exact millisecond the phone reconnects to 4G
  useEffect(() => {
      const flushOfflineData = async () => {
          if (!isOnline || !user) return;
          
          const { transactions: offlineTx, nooProfiles: offlineNoo } = await getPendingData();
          const totalItems = offlineTx.length + offlineNoo.length;

          if (totalItems > 0) {
              triggerCapy(`📡 SIGNAL ACQUIRED! Pushing ${totalItems} offline records to HQ...`);
              logSyncEvent(`Initiating Auto-Sync for ${totalItems} items...`, 'INFO');

              /* Declared OUTSIDE the try because the catch reports it. A count that only exists on
                 the happy path cannot tell him how much is safe when the sync stops halfway. */
              let secured = 0;
              try {
                  // 🚀 FIX: Replaced hand-rolled batching (fixed-count only, all chunks
                  // fired concurrently via Promise.all) with commitInChunks — same pattern
                  // used everywhere else. Offline sales can carry photos, so the byte-size
                  // cap matters here, and committing sequentially/paced avoids flooding
                  // Firestore's write stream the moment signal comes back.
                  const operations = [];
                  /* Pack sizes for the tally below. `inventory` is already loaded, so a queued
                     sale in Slop converts to Bks without a single extra read. */
                  const productsById = Object.fromEntries((inventory || []).map(p => [p.id, p]));

                  // 1. Flush Blind-Drop NOO Profiles
                  for (const noo of offlineNoo) {
                      const localId = noo.localId;
                      const payload = { ...noo };
                      delete payload.localId; // Strip the local ID before sending to cloud
                      delete payload.cloudId; // ...and the id itself, which IS the document name

                      /* The id was decided when this was queued, not now - see useOfflineEngine's
                         newCloudId. A retry therefore overwrites the same document instead of
                         creating a second one. `cloudId` is missing on anything queued before this
                         shipped, and those fall back to a fresh id exactly as before. */
                      const ref = noo.cloudId
                          ? doc(db, `artifacts/${appId}/users/${userId}/customers`, noo.cloudId)
                          : doc(collection(db, `artifacts/${appId}/users/${userId}/customers`));
                      /* 🚀 FIX: the payload already carries the status the online path writes —
                         NOO_ACTIVE for a real registration, WALK_IN otherwise — set when the
                         store was saved to the Ghost Ledger. This line used to overwrite it with
                         a value nothing in src/ reads and nothing ever changes back, so a store
                         registered without signal ended up in a state no screen understood. */
                      operations.push({ type: 'set', ref, data: { ...payload, syncedAt: serverTimestamp() },
                                        ack: { store: 'noo_profiles', localId } });

                  }

                  // 2. Flush Offline Sales Receipts
                  for (const tx of offlineTx) {
                      const localId = tx.localId;
                      const payload = { ...tx };
                      delete payload.localId;

                      // 🚀 THE FIX: Stamp the receipt with a True Server Time so it appears in Reports!
                      payload.timestamp = serverTimestamp();

                      delete payload.cloudId; // the id itself is the document name, not a field
                      const ref = tx.cloudId
                          ? doc(db, `artifacts/${appId}/users/${userId}/transactions`, tx.cloudId)
                          : doc(collection(db, `artifacts/${appId}/users/${userId}/transactions`));
                      operations.push({ type: 'set', ref, data: { ...payload, syncedAt: serverTimestamp() },
                                        ack: { store: 'transactions', localId } });

                      /* THE TALLY FOR A SALE MADE WITHOUT SIGNAL, in the same operations list and
                         therefore the same chunked commit as the receipt itself.

                         ⚠️ IT IS FILED ON THE DAY THE SALE WAS MADE. `payload.timestamp` was just
                         overwritten with serverTimestamp() so the receipt sorts correctly, but
                         `payload.date` still carries the original day and the tally reads that
                         first. A week of offline sales landing the moment signal returns must not
                         all pile onto that Monday. */
                      const tallyOp = tallySaleOp(db, appId, userId, payload, productsById, 1);
                      if (tallyOp) operations.push(tallyOp);

                  }

                  /* 🔑 EACH CHUNK IS ACKNOWLEDGED THE MOMENT IT LANDS, not all of them at the end.

                     Still never before the write - clearing first is what once lost sales outright,
                     and that rule has not changed. What changed is the granularity. commitInChunks
                     is several commits, not one transaction, so a failure partway used to leave
                     everything in the local queue including the sales that HAD committed; the retry
                     then sent those again. Together with the stable `cloudId` this closes both
                     halves: the retry no longer re-sends acknowledged work, and if it ever does, it
                     overwrites the same document instead of making a second one.

                     The tally operations carry no `ack` and are skipped here on purpose - they are
                     not queue items, they are the counter riding along beside them. */
                  await commitInChunks(db, writeBatch, operations, async (landed) => {
                      for (const op of landed) {
                          if (!op.ack) continue;
                          await clearProcessedItem(op.ack.store, op.ack.localId);
                          secured++;
                      }
                  });

                  logSyncEvent(`✅ Auto-Sync Complete. ${totalItems} items secured in Master Vault.`, 'SUCCESS');
                  triggerCapy(`✅ Sync Complete! ${totalItems} items secured in Master Vault.`);
              } catch (err) {
                  console.error("Auto-Sync Failed:", err);
                  /* 🔴 SAY HOW MUCH IS SAFE. His law: every action reports. A part-finished sync
                     used to say only "Sync Failed", which reads as "nothing went through" - and a
                     salesman who believes that re-enters sales that are already in the vault. The
                     count is what stops that, and it is honest either way. */
                  const done = secured;
                  const stillWaiting = Math.max(0, totalItems - done);
                  logSyncEvent(`❌ Auto-Sync stopped after ${done}/${totalItems}: ${err.message}`, 'ERROR');
                  triggerCapy(done > 0
                      ? `⚠️ Sync stopped. ${done} of ${totalItems} are safe in the vault, ${stillWaiting} still waiting. Do NOT re-enter them.`
                      : `❌ Sync Failed! Nothing sent yet. Retrying later.`);
              }
          }
      };

      if (isOnline) flushOfflineData();
  }, [isOnline, user]);

// --- PHASE 2: ROLE-BASED ACCESS CONTROL (RBAC) STATE ---
  /* `userRole` and `agentProfileId` USED TO BE DECLARED HERE. They now live at the
     top of the component with the rest of the identity, because the POV preview
     derives all five together and `user` is read long before this line. The setters
     are unchanged and still land on the true values. */
  const [bossUid, setBossUid] = useState(null);
  /* The account's OWN name for the vault intro - the roster / agent name, not Google's. His 2026-09-28:
     "i want the intro welcome name to always match the nickname / agent name for that google account".
     Employees already carry it in user.displayName (the hijacked user); owners did not. */
  const [profileName, setProfileName] = useState(null);
  const [agentCanvas, setAgentCanvas] = useState([]);
 
  const [adminSalesMode, setAdminSalesMode] = useState('VAULT'); // 'VAULT' or 'VEHICLE'
  
  // NEW: Agent Permissions State
  const [agentSettings, setAgentSettings] = useState({ allowedPayments: ['Cash', 'QRIS', 'Transfer', 'Titip'], allowedTiers: ['Retail', 'Grosir', 'Ecer'] });

  // 🚀 ADD THESE LINES:
  const [logisticsNotifs, setLogisticsNotifs] = useState([]); 
  const [readVirtualNotifs, setReadVirtualNotifs] = useState(() => {
      const saved = localStorage.getItem('kpm_read_virtual_notifs');
      return saved ? JSON.parse(saved) : [];
  });
  // 🚀 FIX: persist read-state for virtual logistics notifications back to
  // localStorage, mirroring the initializer above that reads it — otherwise a
  // notification marked read would show unread again after every reload.
  useEffect(() => {
      localStorage.setItem('kpm_read_virtual_notifs', JSON.stringify(readVirtualNotifs));
  }, [readVirtualNotifs]);

  // 🛑 THE DATABASE HIJACK: If bossUid exists, ALL database calls globally redirect to the Admin's vault.
  const userId = bossUid || user?.uid || user?.id || 'default';

  /* THE MASTER VAULT IS PER PERSON (src/utils/vaultDoc.js, his 2026-09-28 pick A). NOT userId: that is the
     owner's folder for everyone, and reading the vault there is how a T2 ended up typing the owner's password.
     Every vault read and write goes through vaultRef(); null = an employee with no roster profile. */
  const vaultPath = user ? vaultDocPath(appId, { bossUid, uid: user?.uid, agentProfileId: trueAgentProfileId }) : null;
  const vaultRef = () => vaultPath ? doc(db, vaultPath) : null;

  /* THE BELL'S MISSED LIST LIVES ON THE PERSON (utils/missedLog.js, his 2026-10-02 "phone and pc show the
     same thing"): one doc each, keyed like the vault. A failed read or write is a console warning - it must
     never reach the strip or the capybara that is reporting. Unbinding on sign-out empties the list. */
  const missedPath = user ? missedDocPath(appId, { bossUid, uid: user?.uid, agentProfileId: trueAgentProfileId }) : null;
  useEffect(() => {
      if (!db || !missedPath) return;
      const ref = doc(db, missedPath);
      return bindMissed({
          listen: (cb) => onSnapshot(ref, (s) => cb(s.data()), (err) => console.warn('[Missed] read', err.code)),
          save: (data) => setDoc(ref, data),
      });
  }, [db, missedPath]);

  /* EVERY PERSON OPENS THE APP WITH THEIR OWN PASSWORD (2026-10-01). His words: "i want the other user also have
     password and their agent name displayed on the intro animation". T1/T2 already had one - it opens the Master
     Vault, and that path is unchanged. T3-T6 never saw the gate at all. Now anyone without the vault who has a
     roster profile (so a vault_keys doc can exist) meets the same gate when they enter; their password opens their
     OWN app, never the vault (`appUnlocked`, not isAdmin), and the unlock plays the intro with their name.
     There is no way past it but a real unlock or their own 5-minute pass. Off while previewing someone (POV) and
     on the lockout screens, which have nothing behind them to open. */
  const [appUnlocked, setAppUnlocked] = useState(false);
  const holdsVault = hasClearance(trueRole, 'view_master_vault');
  const entryLocked = !!trueUser && !!vaultPath && !holdsVault && !appUnlocked && !previewing
      && trueRole !== 'UNAUTHORIZED' && trueRole !== 'OFFLINE_UNVERIFIED';
  const gateUp = showAdminLogin || entryLocked;
  const openGate = () => { if (holdsVault) setIsAdmin(true); else setAppUnlocked(true); setShowAdminLogin(false); };
  /* Does this device have a fingerprint / face sensor a passkey can use? Asked once, ahead of time: the first-password
     Save must start the passkey prompt without waiting on anything (handleSetupSecurity). */
  const [canBio, setCanBio] = useState(false);
  useEffect(() => { window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.().then(setCanBio).catch(() => {}); }, []);
  const NO_VAULT = "This account has no roster profile, so it has no vault password of its own. Ask the owner to check you on Fleet & Roster.";

  /* LOCKED BY THE COMPANY (Fleet & Roster's "Lock account" - a lost or hacked phone; his 2026-09-28 "make that email
     unable to login at all"). The flag sits on this person's login record; an app already OPEN signs out the moment it
     lands, and the sign-in check (the kill switch below) keeps the email out after that. */
  const LOCKED_MSG = "This account is locked by your company. Ask your owner or admin to unlock it.";
  useEffect(() => {
      if (!bossUid || !user?.email) return;
      return onSnapshot(doc(db, `artifacts/${appId}/employee_directory`, user.email.toLowerCase().trim()), (snap) => {
          if (snap.data()?.locked === true) { notify(LOCKED_MSG); signOut(auth); setUser(null); }
      }, (err) => console.warn("Account lock listener:", err.code));
  }, [bossUid, user?.email]);

  // 🚀 1.5 THE FIX: DIRECT SYSTEM NOTIFICATIONS LISTENER
  // Bypasses the useDatabaseSync hook which was completely blind to this collection
  const [systemNotifs, setSystemNotifs] = useState([]);
  
  useEffect(() => {
      if (!db || !appId || !userId || userId === 'default') return;
      // ponytail: time-gated to the last 7 days like every other listener in this app, but kept
      // permissive (no targetRole/targetId filter) — see the comment below at combinedNotifications,
      // that filter was already tried once and dropped notifications it shouldn't have.
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const notifRef = query(collection(db, `artifacts/${appId}/users/${userId}/notifications`), where('timestamp', '>=', sevenDaysAgo));
      const unsub = onSnapshot(notifRef, (snap) => {
          setSystemNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.warn("System notifications listener:", err.code));
      return () => unsub();
  }, [db, appId, userId]);

  // --- DATABASE SYNC ENGINE (MOVED HERE!) ---
  const {
      fetchHistoricalTransactions, // 🚀 THE TIME MACHINE ENGINE PLUGGED IN
      inventory, setInventory, customers, transactions, setTransactions,
      samplings, setSamplings, auditLogs, setAuditLogs, procurements, setProcurements,
      motorists, setMotorists, agentInventories, setAgentInventories, eodReports, setEodReports,
      transferRequests, setTransferRequests, notifications, setNotifications,
      adminCanvas, setAdminCanvas, branchStock,
      career,
      appSettings, setAppSettings, editCompanyProfile, setEditCompanyProfile
  } = useDatabaseSync(db, appId, user, userId, userRole, agentProfileId);

  // 🚀 Phase 5: badge config, read once so handleVerifyEOD's checkBadges() call respects
  // whatever targets the owner customized via the Achievement Config modal — same
  // per-company path + one-release fallback AgentProfileView.jsx uses for badges/ranks.
  const [progressionBadges, setProgressionBadges] = useState(DEFAULT_BADGES);
  // The rank ladder from the same doc, for the boss's player card (EOD review) - the same defaults
  // and the same title/hex fill-in as AgentProfileView.jsx's own read, so both screens agree.
  const [progressionRanks, setProgressionRanks] = useState(DEFAULT_RANKS);
  useEffect(() => {
      if (!db || !appId || !userId || userId === 'default') return;
      const fetchBadgeConfig = async () => {
          try {
              /* The company's own folder only (2026-09-22). The vault owner's start also moves whatever is
                 still only in the old shared docs into that folder, once, and says so — progressionHome.js. */
              const { badges, ranks, moved } = await settleProgression({
                  readDoc: (path) => getDoc(doc(db, path)),
                  writeDoc: (path, data) => setDoc(doc(db, path), data, { merge: true }),
                  isOwner: user?.uid === userId,
                  ownPath: `artifacts/${appId}/users/${userId}/settings/progression`,
                  sharedDir: `artifacts/${appId}/settings`,
              });
              if (ranks) setProgressionRanks(ranks.map(r => ({ ...r, title: r.title || r.perks || 'No Title', borderImage: r.borderImage || '' })));
              if (badges) setProgressionBadges(badges);
              if (moved) notify("Rank and badge settings moved into this company's own folder.");
          } catch (e) { console.warn("Badge config fetch failed, using defaults:", e.code); }
      };
      fetchBadgeConfig();
  }, [db, appId, userId]);

 // 🚀 NEW: MATRIX BOOTLOADER 🚀
  const [matrixTick, setMatrixTick] = useState(0); // 🚀 NEW: The UI Pulse State

  // Downloads the custom permissions from Firebase when the app starts
  useEffect(() => {
      // 🚀 FIX: Wait for userId so we know which Vault to unlock
      if (!db || !appId || !userId || userId === 'default') return; 
      const bootPermissions = async () => {
          try {
              // 🚀 FIX: Route the download directly into the Boss's Secure Vault
              const permSnap = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/settings`, 'permission_matrix'));
              if (permSnap.exists() && permSnap.data().matrix) {
                  injectDynamicPermissions(permSnap.data().matrix, permSnap.data().tiers);
                  setMatrixTick(prev => prev + 1); // 🚀 FIRE THE PULSE! Forces Sidebar to Redraw.
              }
          } catch (e) {
              console.warn("Failed to boot custom permission matrix", e);
          }
      };
      bootPermissions();
  }, [db, appId, userId]); // 🚀 FIX: Added userId to dependency array

  // 🚀 1. NEW ENGINE: VIRTUAL LOGISTICS NOTIFICATIONS (WITH HISTORY)
  useEffect(() => {
      if (!db || !appId || !userId || userId === 'default') return;

      // ponytail: time-gated to 7 days to bound the download. Per-role branch filtering + the
      // top-30 slice below stay client-side on purpose — a query-level limit(30) would return the
      // newest 30 requests company-wide, which for an AREA_ADMIN's branch-filtered view could be
      // zero of their own branch's requests. Bound the window, not who sees what.
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const reqRef = query(collection(db, `artifacts/${appId}/users/${userId}/stock_requests`), where('timestamp', '>=', sevenDaysAgo));
      const unsub = onSnapshot(reqRef, (snap) => {
          const allRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          let activeAlerts = [];

          if (userRole === 'ADMIN') {
              const recentRequests = allRequests.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 30);
              
              activeAlerts = recentRequests.map(req => ({
                  id: `logistics_${req.id}`,
                  title: req.status === 'PENDING' ? `📦 REQ: ${req.branch}` : `✅ REQ: ${req.branch} (${req.status})`,
                  message: `${req.requestedByName || req.requestedBy?.split('@')[0]} requested ${req.requestedItems?.reduce((sum, i) => sum + Number(i.qty), 0) || 0} Bks.`,
                  timestamp: req.timestamp,
                  isRead: req.status !== 'PENDING' || readVirtualNotifs.includes(`logistics_${req.id}`),
                  linkToTab: 'restock_vault' 
              }));
          } else if (userRole === 'AREA_ADMIN') {
              const branchLocation = agentProfileId ? motorists.find(m => m.id === agentProfileId)?.location : 'UNASSIGNED';
              
              const branchRequests = allRequests.filter(r => r.branch === branchLocation);
              const recentBranchRequests = branchRequests.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 30);
              
              activeAlerts = recentBranchRequests.map(req => ({
                  id: `logistics_${req.id}`,
                  title: req.status === 'IN_TRANSIT' ? `🚚 INCOMING SHIPMENT` : `📦 SHIPMENT (${req.status})`,
                  message: `HQ Shipped via ${req.courier || 'Internal'} (Resi: ${req.trackingNo || 'N/A'}).`,
                  timestamp: req.fulfilledAt || req.timestamp,
                  isRead: req.status !== 'IN_TRANSIT' || readVirtualNotifs.includes(`logistics_${req.id}`),
                  linkToTab: 'restock_vault' 
              }));
          }

          setLogisticsNotifs(activeAlerts);
      }, (err) => console.warn("Stock requests listener:", err.code));

      return () => unsub();
  }, [db, appId, userId, userRole, agentProfileId, motorists, readVirtualNotifs]);

  // 🚀 2. COMBINE REAL AND VIRTUAL NOTIFICATIONS (WITH STRICT INBOX FILTERING)
  const combinedNotifications = useMemo(() => {
      // 🚀 THE FIX: Filter the real systemNotifs instead of the broken 'notifications' variable
      const myDbNotifs = systemNotifs.filter(n => {
          if (userRole === 'ADMIN') return n.agentId === 'ADMIN' || !n.agentId; 
          return n.agentId === agentProfileId;
      });
      return [...myDbNotifs, ...logisticsNotifs];
  }, [systemNotifs, logisticsNotifs, userRole, agentProfileId]);

// Helper to include Hours and Minutes in the filename
  // --- DOWNLOAD ENGINE HELPERS ---
  const getCurrentTimestamp = () => {
    const now = new Date();
    const date = getLocalDayKey(now); // YYYY-MM-DD
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    return `${date}_${h}-${m}`; // Example: 2026-02-13_08-30
  };

  const triggerDownload = (name, data) => {
    try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a); // Required for some browser security layers
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Download Error:", err);
    }
  };

  // --- COMPLETE SYSTEM PAYLOAD GENERATOR (INCLUDES ALL MODULES + MAPS + INTEL) ---
  const generateFullSystemPayload = async (type) => {
      triggerCapy("Deep-fetching system databases and intelligence... ⏳");
      
      let mapBorders = [];
      try {
          // 🚀 THE FIX: Correctly target mapBorders instead of mapSettings
          const mapSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/mapBorders`));
          mapBorders = mapSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { console.warn("Could not fetch map borders"); }

      // NEW: Explicitly deep-fetch Competitor Intelligence (Benchmarks)
      const deepCustomers = [];
      for (const cust of customers) {
          const custCopy = { ...cust };
          try {
              const benchSnap = await getDocs(collection(db, `artifacts/${appId}/users/${user.uid}/customers/${cust.id}/benchmarks`));
              custCopy.benchmarks = benchSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          } catch (e) { custCopy.benchmarks = []; }
          deepCustomers.push(custCopy);
      }

      return {
          meta: { type, ts: getCurrentTimestamp(), user: user.email },
          inventory, transactions, customers: deepCustomers, samplings, auditLogs, procurements, appSettings, tierSettings, mapBorders
      };
  };

// --- NEW: SAVE EXECUTIVE DASHBOARD TARGETS ---
  const handleSaveDashboardTargets = async (newTargets) => {
      if (!user || !isAdmin) return;
      try {
          await setDoc(doc(db, `artifacts/${appId}/users/${userId}/settings/general`), newTargets, {merge: true});
          await logAudit("SETTINGS_UPDATE", "Executive Dashboard Targets modified.");
          triggerCapy("Executive Targets Updated! 🎯");
      } catch (err) {
          console.error(err);
          notify("Failed to save targets.");
      }
  };

  // --- UPDATED: MASTER PROTOCOL (Forces Green Indicators) ---
  const handleMasterProtocol = async () => {
    if (!user || !isAdmin) return;
    
    triggerCapy("Compiling all database sectors including Map Geodata... 🛡️");

    const payload = await generateFullSystemPayload("MASTER_REDUNDANCY");

    // Sequential Downloads (All 3 now contain 100% of the data, including maps)
    setTimeout(() => triggerDownload(`FOLDER_RECOVERY--POINT_${payload.meta.ts}.json`, payload), 0);
    setTimeout(() => triggerDownload(`FOLDER_USB--SAFE_OFFSITE_${payload.meta.ts}.json`, payload), 1500);
    setTimeout(() => triggerDownload(`FOLDER_CLOUD--MIRROR_SYNC_${payload.meta.ts}.json`, payload), 3000);

    localStorage.setItem('last_usb_backup', new Date().getTime().toString());
    
    // --- FORCE GREEN LIGHTS IMMEDIATELY ---
    setSessionStatus({ recovery: true, usb: true, cloud: true }); 

    await logAudit("MASTER_BACKUP", `Triple Redundancy executed at ${payload.meta.ts}`, true);
    triggerCapy("Protocol Complete! Files sent to sorting. 💾");
  };


  
  // --- NEW: ULTRA-SLIM SNAPSHOT (STRIPS EVERYTHING BUT NUMBERS) ---
  const getUltraSlimSnapshot = () => {
    // We only keep the ID, current Stock, and Price tiers. 
    // We strip Names, Descriptions, and Images to save 90% more space.
    const ultraSlimInventory = inventory.map(item => ({
        id: item.id,
        stock: item.stock,
        pD: item.priceDistributor,
        pR: item.priceRetail,
        pG: item.priceGrosir,
        pE: item.priceEcer
    }));
    
    const ultraSlimCustomers = customers.map(c => ({
        id: c.id,
        tier: c.tier,
        lastV: c.lastVisit
    }));

    return {
        inventory: ultraSlimInventory,
        customers: ultraSlimCustomers,
        appSettings: { companyName: appSettings.companyName } // Only essential settings
    };
  };

  // --- LOGIC: CHECK IF USB BACKUP IS CURRENTLY SECURE (Within 7 Days) ---
  const lastUSB = localStorage.getItem('last_usb_backup');
  const isUsbSecure = lastUSB && (new Date().getTime() - parseInt(lastUSB)) < (7 * 24 * 60 * 60 * 1000);
  /* THE 7-DAY USB-BACKUP REMINDER is a warning, so it goes to the top panel (his pick A, 2026-10-02: "A is
     good"): 5 seconds, then kept in the bell's Missed list, where a repeat is one row with xN. It used to be the
     capybara's own line, set when he mounted with no timer, so it stayed on screen - and came back every time the
     mascot remounted (the cropper, the vault gate). Now: once per sign-in, after the vault gate is passed. */
  const usbNagged = useRef(null);
  useEffect(() => {
    if (!user || gateUp || isUsbSecure || usbNagged.current === user.uid) return;
    usbNagged.current = user.uid;
    notify('⚠️ PROTOCOL ALERT: TIME FOR USB SAFE BACKUP!');
  }, [user, gateUp, isUsbSecure]);
  
  

  // --- 1. FULL CLOUD MIRROR (FOR SECURITY) ---
  const handleCloudMirror = async () => {
    if(!user) return;
    const mirrorPayload = {
      meta: { timestamp: new Date().toISOString(), app: "KPM_MIRROR", operator: user.email },
      inventory, transactions, customers, samplings, appSettings
    };
    const blob = new Blob([JSON.stringify(mirrorPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CLOUD_MIRROR_${getCurrentDate()}.json`;
    a.click();
    await logAudit("DATABASE_MIRROR", "Manual offsite cloud mirror created");
    triggerCapy("Mirror Synchronized! Upload this to your private Google Drive.");
  };

  // --- NEW: DATA WIPE FUNCTION ---
  const handleWipeData = async (type) => {
    if (!user) return;
    const confirmMsg = `WARNING: Are you sure you want to PERMANENTLY delete ${type === 'both' ? 'Products AND Customers' : type === 'products' ? 'Products & Prices' : 'Customer Profiles'}?`;
    if (!await confirmAction(confirmMsg)) return;

    if (!await confirmAction(`FINAL WARNING: This cannot be undone. Proceed with deletion?`)) return;

    try {
        triggerCapy(`Initiating data wipe for ${type}... 🗑️`);
        // 🚀 FIX: Wiping every product + every customer (plus each customer's benchmark
        // sub-docs) into a single writeBatch could exceed Firestore's 500-op limit on a
        // large vault. Queue plain operations and hand them to commitInChunks, same
        // pattern already used for AuditVaultView restore / LandlordDashboard cascade /
        // map boundary uploads.
        const operations = [];
        let deleteCount = 0;

        if (type === 'products' || type === 'both') {
            inventory.forEach(item => {
                operations.push({ type: 'delete', ref: doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id) });
                deleteCount++;
            });
        }

        if (type === 'customers' || type === 'both') {
            for (const cust of customers) {
                // Delete competitor benchmarks first
                const benchSnap = await getDocs(collection(db, `artifacts/${appId}/users/${user.uid}/customers/${cust.id}/benchmarks`));
                benchSnap.forEach(b => {
                    operations.push({ type: 'delete', ref: doc(db, `artifacts/${appId}/users/${user.uid}/customers/${cust.id}/benchmarks`, b.id) });
                });
                // Delete customer
                operations.push({ type: 'delete', ref: doc(db, `artifacts/${appId}/users/${user.uid}/customers`, cust.id) });
                deleteCount++;
            }
        }

        await commitInChunks(db, writeBatch, operations);
        await logAudit("DATA_WIPE", `Wiped ${type} data.`);
        triggerCapy(`Data wipe complete. Clean slate! ✨`);
    } catch (err) {
        console.error("Wipe failed:", err);
        notify("Data Wipe Failed: " + err.message);
    }
  };

 // --- 2. GRANULAR TEAM SHARING: EXPORT (WITH DEEP FETCH) ---
  const handleExportGranular = async (type) => {
    if(!user) return;
    let exportData = {
        meta: { 
            type: `kpm_share_${type}`, 
            signature: `KPM-AUTO-${Math.random().toString(36).substr(2, 9)}`, 
            date: new Date().toISOString(), 
            owner: user.email 
        }
    };

    if (type === 'products' || type === 'both') {
        exportData.inventory = inventory; 
        exportData.appSettings = appSettings; 
    }
    
    if (type === 'customers' || type === 'both') {
        triggerCapy("Deep-fetching customer data... ⏳");
        const deepCustomers = [];
        
        for (const cust of customers) {
            const custCopy = { ...cust };
            try {
                // 🚀 THE FIX: Use userId (Master Vault)
                const benchSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/customers/${cust.id}/benchmarks`));
                custCopy.benchmarks = benchSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) {
                custCopy.benchmarks = [];
            }
            deepCustomers.push(custCopy);
        }
        exportData.customers = deepCustomers; 
    }

    if (type === 'both') {
        exportData.tierSettings = tierSettings;
        try {
            // 🚀 THE FIX: Target mapBorders
            const mapSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/mapBorders`));
            exportData.mapBorders = mapSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) { console.warn("Could not fetch map borders"); }
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KPM_SHARE_${type.toUpperCase()}_${getCurrentDate()}.json`;
    a.click();
    triggerCapy(`Differentiated ${type} data signed and ready!`);
  };

  // --- 3. GRANULAR TEAM SHARING: IMPORT (WITH DEEP RESTORE) ---
  const handleImportGranular = async (e, targetType) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    if(!await confirmAction(`Import ${targetType} data? This will overwrite existing items with the same ID.`)) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            // 🚀 FIX: Restoring an uploaded backup file could contain more than 500
            // combined product/customer/benchmark/boundary writes. Queue plain operations
            // and hand them to commitInChunks, same pattern as AuditVaultView restore /
            // LandlordDashboard cascade / map boundary uploads, instead of one unbounded
            // writeBatch.
            const operations = [];

            if ((targetType === 'products' || targetType === 'both') && data.inventory) {
                data.inventory.forEach(item => {
                    // 🚀 THE FIX: Use userId
                    operations.push({ type: 'set', ref: doc(db, `artifacts/${appId}/users/${userId}/products`, item.id), data: item });
                });
            }
            if ((targetType === 'customers' || targetType === 'both') && data.customers) {
                data.customers.forEach(c => {
                    const cData = { ...c };
                    const benchmarks = cData.benchmarks || [];
                    delete cData.benchmarks;

                    operations.push({ type: 'set', ref: doc(db, `artifacts/${appId}/users/${userId}/customers`, c.id), data: cData });
                    benchmarks.forEach(b => {
                        operations.push({ type: 'set', ref: doc(db, `artifacts/${appId}/users/${userId}/customers/${c.id}/benchmarks`, b.id), data: b });
                    });
                });
            }

            if (targetType === 'both') {
                if (data.tierSettings) {
                    operations.push({ type: 'set', ref: doc(db, `artifacts/${appId}/users/${userId}/settings`, 'tiers'), data: { list: data.tierSettings } });
                    setTierSettings(data.tierSettings);
                }

                // 🚀 THE FIX: Check for mapBorders (and fallback to mapSettings if older file)
                const bordersToImport = data.mapBorders || data.mapSettings;
                if (bordersToImport && Array.isArray(bordersToImport)) {
                    bordersToImport.forEach(mapObj => {
                        // 🚀 SCORCHED EARTH: Write boundaries to BOTH Master Vault and Personal Vault!
                        operations.push({ type: 'set', ref: doc(db, `artifacts/${appId}/users/${userId}/mapBorders`, mapObj.id), data: mapObj });
                        if (userId !== user.uid) {
                            operations.push({ type: 'set', ref: doc(db, `artifacts/${appId}/users/${user.uid}/mapBorders`, mapObj.id), data: mapObj });
                        }
                    });
                }
            }

            await commitInChunks(db, writeBatch, operations);
            triggerCapy(`${targetType.toUpperCase()} data imported successfully! Refreshing map data...`);
            
            if (targetType === 'both') {
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (err) { notify("Import Failed: " + err.message); }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };







const handleGitHubMirror = async () => {
    if(!user) return;
    
    // Package all critical business data
    const mirrorPayload = {
      meta: { 
        timestamp: new Date().toISOString(), 
        app: "KPM_SYSTEM_MIRROR",
        operator: user.email 
      },
      inventory,
      transactions,
      customers,
      samplings,
      appSettings
    };

    triggerCapy("Initiating Offsite Mirror... ☁️");

    try {
      // Note: In a production environment, you would use a secure backend 
      // or a specific API key stored in Firebase Secrets.
      // For now, this triggers a secondary JSON backup download as a 'Manual Mirror'.
      const blob = new Blob([JSON.stringify(mirrorPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OFFSITE_MIRROR_${getCurrentDate()}.json`;
      a.click();
      
      await logAudit("DATABASE_MIRROR", "Manual offsite cloud mirror created");
      triggerCapy("Mirror Synchronized! Move this to your Cloud Drive.");
    } catch (err) {
      console.error(err);
      triggerCapy("Mirror failed. Check console.");
    }
  };



// --- PINPOINT: Line 1770 (Objective 4: Advanced Security Logic) ---
  const [recoveryWord, setRecoveryWord] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [authShake, setAuthShake] = useState(false); // For visual "Wrong Password" feedback
  const [isUnlocking, setIsUnlocking] = useState(false); // 🎬 NEW: Cinematic Unlock State
  /* The press is waiting on the server (or on the hash). His 2026-09-17 report, after the first-open
     fix: "the password press still took some time to submit and react … if u cant [make it faster]
     then add some waiting animation on the button". Both were done: the button says CHECKING while
     this is true, and the read it used to wait on is started earlier (adminProfileRef). */
  const [pinChecking, setPinChecking] = useState(false);
  /* The vault's security profile, fetched the moment the gate is SHOWN rather than the moment he
     presses. He spends seconds typing the password; on a phone that is the whole round trip the
     press used to pay before anything moved. A press finds the doc already here and goes straight
     to hash + compare. Cleared after every attempt so a strike written by the failed path is read
     back fresh, not from this copy; a rejected prefetch (offline) is dropped and the press does its
     own read, so the existing offline / insecure-context wording still fires. */
  const adminProfileRef = useRef(null);

  // 📧 NEW: Email OTP Recovery States
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [inputOtp, setInputOtp] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // 🔐 NEW: Real-time Password Strength State
  const [setupPassword, setSetupPassword] = useState("");
  /* His 2026-09-29: "put eye review just so that i can make sure my desired password is correct" - the new master
     password can be shown while he types it; hidden again whenever the setup screen closes. */
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  useEffect(() => { if (!isSetupMode) setShowSetupPassword(false); }, [isSetupMode]);
  /* His 2026-09-29: "make sure every box for those security have eye peek option just like the new password" - the new
     recovery word, the secret word typed before the code is sent, and the master password at the gate. Each hides again
     when its screen closes; the gate box also whenever it is emptied (a failed try clears it). */
  const [showSetupSecret, setShowSetupSecret] = useState(false);
  useEffect(() => { if (!isSetupMode) setShowSetupSecret(false); }, [isSetupMode]);
  const [showResetWord, setShowResetWord] = useState(false);
  useEffect(() => { if (!isResetMode) setShowResetWord(false); }, [isResetMode]);
  const [showPin, setShowPin] = useState(false);
  /* THE GATE BOX KEEPS ITS OWN TEXT (2026-09-30, his "entering master vault password even feel really heavy, lagging
     delayed"). The typed password was App state, so every letter re-ran this whole component - 13 ms a letter measured
     on the PC dev build, several times that on a phone, with the gate's dot field drawing on the same thread. Now the
     box holds it (pinRef) and handlePinLogin reads it on submit. "Emptied" is caught where it happens: clearPin() after
     a failed try, a lock or an unlock; the box's onChange when he deletes it all; and here, whenever the box is swapped
     for another mode or the gate closes - it comes back empty, so the eye closes with it. */
  useEffect(() => { setShowPin(false); }, [gateUp, isSetupMode, isResetMode, isOtpMode]);
  const pinRef = useRef(null);
  const clearPin = () => { if (pinRef.current) pinRef.current.value = ''; setShowPin(false); };
  const [setupSecret, setSetupSecret] = useState("");

  const calculateStrength = (pass) => {
      let score = 0;
      if (!pass) return { score: 0, label: "AWAITING INPUT", color: "text-[var(--duke-ink-3)]", bar: "bg-[var(--duke-fill-panel)]" };
      if (pass.length >= 8) score++;
      if (/[a-z]/.test(pass)) score++;
      if (/[A-Z]/.test(pass)) score++;
      if (/\d/.test(pass)) score++;
      if (/[@$!%*?&#\-_]/.test(pass)) score++;

      if (score <= 2) return { score, label: "CRITICAL VULNERABILITY (WEAK)", color: "text-red-500", bar: "bg-red-600 shadow-[0_0_10px_red]" };
      if (score <= 4) return { score, label: "SUB-OPTIMAL (MODERATE)", color: "text-orange-500", bar: "bg-orange-500 shadow-[0_0_10px_orange]" };
      return { score, label: "ENCRYPTION SECURE (STRONG)", color: "text-[var(--duke-amber-ink)]", bar: "bg-[var(--duke-amber)] shadow-[0_0_10px_rgba(255,157,0,0.8)]" };
  };

  // 1. INITIAL CHECK: Does a PIN exist?
  useEffect(() => {
    let live = true;
    const checkAdminStatus = async () => {
        const ref = vaultRef();
        if (!ref) return;
        const snap = await getDoc(ref);
        if (!live) return;   /* an answer for a doc this account no longer uses (sign-in still settling) */

       if (snap.exists() && snap.data().pin) {
                    const data = snap.data();
                    setAdminPin(data.pin);
                    setRecoveryWord(data.recoveryWord || "");
                    setRegisteredPasskeys(data.passkeys || []); // 🚀 LOAD AUTHORIZED DEVICES
                    setHasAdminPin(true);
                    setIsSetupMode(false);
                } else {
            // No PIN found: Force Setup Mode. Every T2 meets this once: their own password + recovery word.
            setRegisteredPasskeys([]);   /* the device list is this person's too, never a previous account's */
            setHasAdminPin(false);
            setIsSetupMode(true);
        }
    };
    checkAdminStatus();
    return () => { live = false; };
  }, [vaultPath]);

  /* The fingerprints are made and checked by src/utils/secretHash.js (PBKDF2, salted, 2026-09-22).
     The phone-over-http case it reports as SECURE_CONTEXT_REQUIRED is read below, unchanged. */

  // 2. SETUP: Create MASTER PASSWORD & Secret Word (FULLY HASHED)
  const handleSetupSecurity = async () => {
    const strength = calculateStrength(setupPassword);
    
    // 🚨 ABSOLUTE HARD LOCK: Blocks "password" or anything under level 5
    if (strength.score < 5) { 
        setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
        notify("Encryption Failed: Password must reach Level 5 security (8+ chars, Upper, Lower, Number, Symbol)."); 
        return; 
    }
    if (!setupSecret || !setupSecret.trim()) { 
        setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
        notify("Secret recovery word is required!");
        return;
    }
    const vaultDoc = vaultRef();
    if (!vaultDoc) { notify(NO_VAULT); return; }

    /* FINGERPRINT AT THE FIRST PASSWORD (2026-10-01). His words: "can u add biometric registration as well when the
       first password setup". Started HERE, still inside the Save press: the hashing below takes seconds on a phone,
       and Safari refuses a passkey prompt once the press has gone cold. Cancelled or no sensor = the password is
       still saved, and the report says which. */
    const bio = canBio ? makePasskey().catch(() => null) : Promise.resolve(null);

    try {
        const credential = await bio;
        const passkey = credential ? { id: credential.id, name: `This device (set up ${new Date().toLocaleDateString('en-GB')})`, addedAt: new Date().toISOString() } : null;
        const security = {
            ...(passkey ? { passkeys: [passkey] } : {}),
            pin: await hashSecret(setupPassword.trim()),                    /* as typed - capital letters count */
            recoveryHash: await hashSecret(setupSecret.trim().toLowerCase()),
            failedRecoveryAttempts: 0,
            lockoutStatus: "NONE",
            /* an employee's doc says whose it is: the rules draft lets only this sign-in change the password */
            ...(bossUid ? { uid: user.realUid, email: user.email } : {}),
            updatedAt: serverTimestamp()
        };
        
        // 🚀 THE HANDSHAKE: Execute Account Migration if pending
        if (pendingMigration) {
            const batch = writeBatch(db);
            // Safely reconstruct the Document References here
            const oldRef = doc(db, `artifacts/${appId}/employee_directory`, pendingMigration.oldId);
            const newRef = doc(db, `artifacts/${appId}/employee_directory`, pendingMigration.newId);

            // Create the true UID profile, forcefully overriding any Tier 4 Ghost
            batch.set(newRef, {
                ...pendingMigration.data,
                bossUid: user.uid, // Permanently claim the ID
                createdAt: serverTimestamp(),
                migratedAt: serverTimestamp()
            });
            // Eradicate the old Email profile from the database
            batch.delete(oldRef);
            await batch.commit();
            
            setPendingMigration(null);
            triggerCapy(`Account Migration Complete. Welcome to ${appSettings?.companyName || "the system"}!`);
        }

        await setDoc(vaultDoc, security);

        setAdminPin(security.pin);
        setHasAdminPin(true);
        setIsSetupMode(false);
        if (passkey) setRegisteredPasskeys([passkey]);
        openGate();
        setSetupPassword("");
        setSetupSecret("");

        notify(passkey ? "Password saved. Fingerprint is on for this device - next time, press Fingerprint."
            : canBio ? "Password saved. Fingerprint was skipped on this device."
            : "Security Protocol Established! Vault Unlocked.");
    } catch (error) {
        console.error("Save Error:", error);
        notify(`Database Error: ${error.message || "Could not save credentials."}`);
    }
  };

  // 3. LOGIN: Verify PIN (NOW WITH HASH & 5-STRIKE LOCKOUT)
  useEffect(() => {
      const ref = gateUp ? vaultRef() : null;
      if (!ref) { adminProfileRef.current = null; return; }
      adminProfileRef.current = getDoc(ref).catch(() => null);
  }, [gateUp, vaultPath]);

  const handlePinLogin = async () => {
      if (pinChecking) return;
      const inputPin = pinRef.current?.value || "";
      /* A shake alone is not a report. On a phone he may not even see it — and pressing OPEN THE
         VAULT with an empty box is the likeliest thing to happen now that the field no longer
         autofocuses there. His report was exactly this shape: "doesnt let me enter but no
         notification just nothing". */
      if (!inputPin || inputPin.trim() === "") {
          setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
          notify("Type your master password first.");
          return;
      }

      setPinChecking(true);
      try {
          // The security profile: the prefetched copy when the gate had time to fetch it, a live read otherwise
          const adminDocRef = vaultRef();
          if (!adminDocRef) {
              notify(NO_VAULT);
              return;
          }
          const prefetched = adminProfileRef.current;
          adminProfileRef.current = null;
          const adminSnap = (prefetched && await prefetched) || await getDoc(adminDocRef);
          /* Was a bare `return` — the single most invisible failure in the app, on the one screen
             every session starts at. handleResetPin has reported this same condition since it was
             written (see "No security profile found." below); only this path was missed. */
          if (!adminSnap.exists()) {
              setHasAdminPin(false); setIsSetupMode(true);   /* new, or reset by a T1/T2 on Fleet & Roster: make one now */
              notify("No vault password on this account yet - it is new, or your admin reset it. Make a new one now.");
              return;
          }
          const data = adminSnap.data();

          // Locked after too many wrong tries? It lifts by itself after 15 minutes (vaultLock.js)
          const lockLeft = lockLeftMs(data, Date.now());
          if (lockLeft > 0) {
              notify(`Too many wrong tries. The vault opens again at ${untilText(data.lockedUntil)} (in ${Math.ceil(lockLeft / 60000)} min).`);
              clearPin();
              return;
          }

          /* The fingerprint check (secretHash.js). An old plain SHA-256 still opens; it is re-saved in
             the slow, salted form with the attempt reset below, on this one sign-in. */
          if (await verifySecret(inputPin.trim(), data.pin)) {
              const fresh = needsRehash(data.pin) ? { pin: await hashSecret(inputPin.trim()) } : {};
              // SUCCESS: Reset strikes & Trigger Cinematic Unlock
              /* Not awaited. The password is already verified by the compare above; this write is
                 bookkeeping, and waiting for the server to confirm it put a whole cold round trip
                 between the right password and the first frame of the unlock (his 2026-09-16
                 report: "pressing unlock vault button after entering password … took a long
                 time"). It still runs before the sequence starts, so a tab closed mid-animation
                 has already sent it; a failure is reported, never swallowed. */
              updateDoc(adminDocRef, { failedRecoveryAttempts: 0, lockoutStatus: "NONE", ...fresh }).catch((e) => { console.error(e); notify("Vault opened, but the attempt counter could not be reset on the server."); });
              setIsUnlocking(true);
              
              // Hold just long enough for the unlock to land (sweep ends at 740ms), then go.
              // This used to be 2500ms of nothing: the PIN was already verified and the write
              // above already awaited, so every login paid 2.5s for an animation with no work
              // behind it.
              setTimeout(() => {
                  openGate();
                  setIsUnlocking(false);
                  clearPin();
              }, gateHoldMs());
          } else {
              // FAILED: one strike; the fifth locks the vault for 15 minutes (vaultLock.js)
              const upd = strikeUpdate(data, Date.now());
              await updateDoc(adminDocRef, upd);
              
              setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
              clearPin();
              notify(upd.lockedUntil
                  ? `${VAULT_TRIES} wrong tries. The vault is locked for ${VAULT_LOCK_MS / 60000} minutes, until ${untilText(upd.lockedUntil)}.`
                  : `Incorrect PIN. Strike ${upd.failedRecoveryAttempts}/${VAULT_TRIES}.`);
              adminProfileRef.current = getDoc(adminDocRef).catch(() => null);
          }
      } catch (error) {
          console.error("Login Error:", error);
          /* THE ONE THAT LOCKED HIM OUT. Checking the password needs a Firestore read, and on a
             phone that read is the fragile part — weak signal, an auth token not refreshed yet,
             or simply no internet. Every one of those landed here and printed to a console he
             cannot open on a phone, so the button genuinely did nothing.

             The offline case gets its own wording because the fix is different and it is the one
             he will actually hit: nothing is wrong with his password, he just cannot be checked
             right now. */
          const msg = error?.message || '';
          const insecure = msg === 'SECURE_CONTEXT_REQUIRED' || /crypto|subtle|digest/i.test(msg);
          const offline = !navigator.onLine || error?.code === 'unavailable'
              || /offline|network|unavailable/i.test(msg);
          notify(
              insecure
                  ? `This page is open over http://${location.host}, and browsers only allow password checking on https:// or localhost. Nothing is wrong with your password — open the app over HTTPS.`
              : offline
                  ? "Can't reach the server to check your password. Get back online and try again — nothing was wrong with what you typed."
                  : `Could not check your password: ${msg || 'unknown error'}. Nothing was changed, try again.`);
      } finally {
          setPinChecking(false);
      }
  };

  // 4. RESET: Layer 1 (Verify Secret Word) & Layer 2 (Send OTP)
  const handleResetPin = async (word) => {
    if (!word || word.trim() === "") {
        setAuthShake(true); setTimeout(() => setAuthShake(false), 500); return;
    }

    const cleanWord = word.trim().toLowerCase();

    // 🚨 KPMADMIN BACKDOOR PERMANENTLY DELETED 🚨

    try {
        setIsSendingEmail(true); // Trigger UI loading state

        const adminDocRef = vaultRef();
        if (!adminDocRef) { notify(NO_VAULT); setIsSendingEmail(false); return; }
        const adminSnap = await getDoc(adminDocRef);

        if (!adminSnap.exists()) { notify("No security profile found."); setIsSendingEmail(false); return; }
        const data = adminSnap.data();

        const lockLeft = lockLeftMs(data, Date.now());
        if (lockLeft > 0) {
            notify(`Too many wrong tries. The vault opens again at ${untilText(data.lockedUntil)} (in ${Math.ceil(lockLeft / 60000)} min).`);
            setIsSendingEmail(false); return;
        }

        if (await verifySecret(cleanWord, data.recoveryHash)) {
            const fresh = needsRehash(data.recoveryHash) ? { recoveryHash: await hashSecret(cleanWord) } : {};
            await updateDoc(adminDocRef, { failedRecoveryAttempts: 0, lockoutStatus: "NONE", ...fresh });
            
            // 📧 LAYER 3: GENERATE & SEND EMAIL OTP
            /* the demo never sends: the code would go through HIS EmailJS account (demoBuild.check.mjs) */
            if (IS_DEMO) { notify("This is the demo: recovery emails are switched off, so no code is sent."); setIsSendingEmail(false); return; }
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedOtp(newOtp);

            try {
                await emailjs.send(
                    'service_b564nlp',
                    'template_89lgavp',
                    /* To the PERSON (his 2026-09-28 pick A). The template's "To Email" box reads {{to_email}} only
                       once he changes it in EmailJS; until then every code still goes to his own address. */
                    { to_email: user.email, name: profileName || user.displayName || user.email,
                      message: 'Master vault recovery code for your KPM account.', time: new Date().toLocaleString(), otp_code: newOtp },
                    'veSkmuEcR5qSImMSq'  // 🔐 BRAND NEW SECURE PUBLIC KEY
                );
                setIsResetMode(false);
                setIsOtpMode(true); 
            } catch (emailErr) {
                console.error("EmailJS Error:", emailErr);
                notify("Identity verified, but failed to send OTP email. Check your internet or EmailJS account limits.");
            }
        } else {
            const upd = strikeUpdate(data, Date.now());
            await updateDoc(adminDocRef, upd);
            
            setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
            notify(upd.lockedUntil
                ? `${VAULT_TRIES} wrong tries. The vault is locked for ${VAULT_LOCK_MS / 60000} minutes, until ${untilText(upd.lockedUntil)}.`
                : `Access Denied. Strike ${upd.failedRecoveryAttempts}/${VAULT_TRIES}.`);
        }
    } catch (error) {
        console.error("Recovery Error:", error);
        notify("System error during recovery verification.");
    }
    setIsSendingEmail(false);
  };

  // 5. OTP VERIFICATION: Layer 3
  const handleVerifyOtp = () => {
      if (inputOtp === generatedOtp) {
          setIsOtpMode(false);
          setIsSetupMode(true);
          setInputOtp("");
          notify("Authorization Code Accepted. You may now create new Master Credentials.");
      } else {
          setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
          setInputOtp("");
      }
  };

  const handleChangePin = () => {
      // Switches the modal to "Setup Mode" so you can overwrite the old PIN
      setIsSetupMode(true); 
      setShowAdminLogin(true);
      setIsResetMode(false);
      clearPin();
      triggerCapy("Initialize PIN Reset Protocol.");
  };

  // 🚀 PASSKEY REGISTRATION ENGINE (FIREBASE SYNCED) 🚀
  /* One builder for Settings and the first-password setup. The user handle is the PERSON's uid: for an employee
     user.uid is the boss's (the hijacked user), so two people on one phone would share - and overwrite - one key. */
  const makePasskey = () => {
      const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
      return navigator.credentials.create({
          publicKey: {
              challenge: challenge,
              rp: { name: "KPM System", id: window.location.hostname },
              user: { id: new TextEncoder().encode(user.realUid || user.uid), name: user?.email || "Admin", displayName: user?.displayName || "Administrator" },
              pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
              authenticatorSelection: {
                  userVerification: "required",
                  residentKey: "required" // 🚨 CRITICAL: Forces Android to save it locally
              },
              timeout: 60000
          }
      });
  };
  const handleRegisterPasskey = async () => {
      const deviceName = await promptAction("Enter a name for this device (e.g., 'My Samsung S23' or 'Office iPad'):");
      if (!deviceName) return;

      try {
          const credential = await makePasskey();

          if (credential) {
              const newPasskey = { id: credential.id, name: deviceName, addedAt: new Date().toISOString() };

              // 🚀 Save to Master Vault
              const adminDocRef = vaultRef();
              await updateDoc(adminDocRef, { passkeys: arrayUnion(newPasskey) });

              setRegisteredPasskeys(prev => [...prev, newPasskey]);
              notify(`Success! "${deviceName}" is now authorized for Biometric Login.`);
          }
      } catch (error) {
          console.error("Registration failed:", error);
          notify("Could not register passkey. Check your device screen lock settings.");
      }
  };

  const handleRemovePasskey = async (passkeyToRemove) => {
      if(!await confirmAction(`Remove authorization for "${passkeyToRemove.name}"? This device will no longer be able to use fingerprint login.`)) return;
      try {
          const updatedPasskeys = registeredPasskeys.filter(pk => pk.id !== passkeyToRemove.id);
          const adminDocRef = vaultRef();
          await updateDoc(adminDocRef, { passkeys: updatedPasskeys });
          setRegisteredPasskeys(updatedPasskeys);
          triggerCapy(`Device removed from Biometric Auth.`);
      } catch (err) { console.error(err); }
  };

  // 🚀 BIOMETRIC UNLOCK ENGINE (DEVICE TARGETED) 🚀
  const handleBiometricUnlock = async () => {
      /* "NO DEVICES REGISTERED!" AFTER A PUSH (his 2026-10-01: "whenever we push a new version of the app, the biometric
         reset and i need to register it again"). The list was read ONCE, when the vault opened (checkAdminStatus); a read
         that came back without the passkeys left it empty for the whole visit, while the password kept working because
         handlePinLogin reads the doc at the press. So an empty list reads the doc here too. Only the empty case waits on
         the read - the normal press still goes straight to the prompt. */
      let passkeys = registeredPasskeys;
      if (passkeys.length === 0) {
          const ref = vaultRef();
          passkeys = (ref && (await getDoc(ref).catch(() => null))?.data()?.passkeys) || [];
          if (passkeys.length) setRegisteredPasskeys(passkeys);
      }
      if (passkeys.length === 0) {
          notify("No devices registered! Please enter your PIN, go to Settings, and register this device.");
          return;
      }

      try {
          const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
          
          // 🚨 WINDOWS HELLO & ANDROID HYBRID FIX
          const allowCredentials = passkeys
              .map(pk => ({
                  type: "public-key",
                  id: base64urlToUint8Array(pk.id),
                  transports: ["internal", "hybrid", "usb", "nfc", "ble"] // Forces Windows to check the laptop sensor
              }))
              .filter(pk => pk.id.length > 0); 

          const assertion = await navigator.credentials.get({
              publicKey: {
                  challenge: challenge,
                  rpId: window.location.hostname,
                  allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined, 
                  userVerification: "preferred", // 🚨 CHANGED: Stops Windows from instantly crashing if PIN fallback isn't linked
                  timeout: 60000
              }
          });

          if (assertion) {
              setIsUnlocking(true);
              setTimeout(() => { openGate(); setIsUnlocking(false); }, gateHoldMs()); // was 2500ms of pure waiting
          }
      } catch (error) { 
          console.error("Biometric failed:", error); 
          // 🚨 THE FIX: Actually show the error instead of failing silently!
          if (error.name !== 'NotAllowedError') {
              notify("Biometric Error: " + (error.message || "Failed to scan fingerprint.")); 
          }
      }
  };
  




  const [activeTab, setActiveTab] = useState('dashboard');
  // 🚀 FIX: Read back the theme the effect below already saves to localStorage
  // ('kpm_theme') instead of always booting into dark mode.
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('kpm_theme') !== 'light');

  // 🚀 LITE MODE (POTATO ENGINE) STATE
  const [isLiteMode, setIsLiteMode] = useState(() => localStorage.getItem('kpm_lite_mode') === 'true'); 

  const [cart, setCart] = useState([]);
  const [opnameData, setOpnameData] = useState({});
  const hasAlertedLowStock = useRef(false);


  /* 1. Low stock. The threshold lives in ONE place now — see src/utils/stockThreshold.js.
        The comment here used to say "default to 5" while the code said 50, and two other
        screens really did use 5, which is how the Dashboard ended up ten times quieter than
        the rest of the app. */
  const lowStockItems = useMemo(() => {
      return inventory.filter(item => isLowStock(item, appSettings));
  }, [inventory, appSettings]);

  // 2. Capybara Intercept on Login
  useEffect(() => {
      if (user && isAdmin && lowStockItems.length > 0 && !hasAlertedLowStock.current) {
          // Find the most valuable item running out
          const priorityItem = [...lowStockItems].sort((a, b) => (b.priceRetail || 0) - (a.priceRetail || 0))[0];
          
          setTimeout(() => {
              triggerCapy(`⚠️ BOSS! ${priorityItem.name} is critically low (${priorityItem.stock} Bks left). Restock needed!`);
          }, 3500); // 3.5s delay so it triggers right after the welcome message
          
          hasAlertedLowStock.current = true;
      }
  }, [user, isAdmin, lowStockItems]);
  

// --- NEW: TIER SETTINGS STATE ---
  const DEFAULT_TIERS = [
      { id: 'Mythic', label: 'Mythic', color: '#f59e0b', iconType: 'emoji', value: '👑' },
      { id: 'Epic', label: 'Epic', color: '#8b5cf6', iconType: 'emoji', value: '🔥' },
      { id: 'Grandmaster', label: 'Grandmaster', color: '#ec4899', iconType: 'emoji', value: '⚔️' },
      { id: 'Bronze', label: 'Bronze', color: '#d97706', iconType: 'emoji', value: '🛡️' },
      /* ⚠️ THE OTHER FOUR ARE RANK IDENTITY AND STAY. Mythic's amber, Epic's purple and
         Grandmaster's pink are the rank frames Aldi designed, and the palette law does not
         reach them. Unranked was slate — the blue the law actually bans — and it is the one
         that meant nothing, so it takes the wood it already carries as an emoji. */
      { id: 'Unranked', label: 'Unranked', color: '#6b5a40', iconType: 'emoji', value: '🪵' }
  ];
  const [tierSettings, setTierSettings] = useState(DEFAULT_TIERS);

  // Load Tiers from DB
  useEffect(() => {
      if(!user) return;
      const unsubTiers = onSnapshot(doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'tiers'), (snap) => {
          if (snap.exists() && snap.data().list) {
              setTierSettings(snap.data().list);
          }
      }, (err) => console.warn("Tier settings listener:", err.code));
      return () => unsubTiers();
  }, [user]);

// --- MISSING FUNCTION: SAVE TIERS TO DATABASE ---
  const handleSaveTiers = async (newTiers) => {
      if (!user) return;
      try {
          await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'tiers'), { list: newTiers }, { merge: true });
          // No alert needed here to avoid spamming while typing
      } catch (err) {
          console.error("Error saving tiers:", err);
          notify("Failed to save tier settings.");
      }
  };

  // --- NEW: EXPORT TIER ICONS ---
  const handleExportTiers = () => {
      if(!tierSettings) return;
      const data = JSON.stringify({ 
          meta: { type: 'kpm_tier_config', date: new Date().toISOString() }, 
          tiers: tierSettings 
      }, null, 2);
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kpm_map_icons_${getCurrentDate()}.json`;
      a.click();
      triggerCapy("Map Icons Exported!");
  };

  // --- FIXED: SMART IMPORT (AUTO-RESIZE TO FIT DATABASE) ---
  const handleImportTiers = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if(!await confirmAction("Import Icons? This will overwrite your current map pins.")) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const json = JSON.parse(event.target.result);
              // Validation
              if (json.meta?.type !== 'kpm_tier_config' || !Array.isArray(json.tiers)) {
                  throw new Error("Invalid Icon Config File");
              }
              
              triggerCapy("Optimizing icons... please wait.");

              // --- AUTO-COMPRESSION LOGIC ---
              const resizedTiers = await Promise.all(json.tiers.map(async (tier) => {
                  // Only compress if it's an image and looks large (base64 string > 50kb)
                  if (tier.iconType === 'image' && tier.value && tier.value.length > 50000) { 
                      return new Promise((resolve) => {
                          const img = new Image();
                          img.src = tier.value;
                          img.onload = () => {
                              const canvas = document.createElement('canvas');
                              // Resize to 120px (Perfect for Map Icons, small file size)
                              const scale = 120 / Math.max(img.width, img.height);
                              canvas.width = img.width * scale;
                              canvas.height = img.height * scale;
                              const ctx = canvas.getContext('2d');
                              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                              // Export as compressed PNG
                              resolve({ ...tier, value: canvas.toDataURL('image/png', 0.8) });
                          };
                          img.onerror = () => resolve(tier); // If fail, keep original
                      });
                  }
                  return tier;
              }));
              // -----------------------------

              setTierSettings(resizedTiers);
              await handleSaveTiers(resizedTiers); // Now safe to save!
              triggerCapy("Map Icons Imported & Optimized!");
          } catch (err) {
              console.error(err);
              notify("Import Failed: " + err.message);
          }
      };
      reader.readAsText(file);
      e.target.value = null;
  };

  // UI States
  const [editingProduct, setEditingProduct] = useState(null);
  const [examiningProduct, setExaminingProduct] = useState(null);
  const [tempImages, setTempImages] = useState({}); 
  const [tempCustomerImage, setTempCustomerImage] = useState(null); // Staging for customer photo
  const [searchTerm, setSearchTerm] = useState("");
  const [useFrontForBack, setUseFrontForBack] = useState(false);
  const [boxDimensions, setBoxDimensions] = useState({ w: 55, h: 90, d: 22 });
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [activeCropContext, setActiveCropContext] = useState(null); 
  
  
// --- NEW: DISCO MODE STATE ---
  const [isDiscoMode, setIsDiscoMode] = useState(false);
  const discoTimeoutRef = useRef(null); 

  const triggerDiscoParty = () => {
      if (isDiscoMode) return; 
      setIsDiscoMode(true);
      triggerCapy("Let's DANCE! 🕺💃"); 

      // Stop after 12 seconds
      if (discoTimeoutRef.current) clearTimeout(discoTimeoutRef.current);
      discoTimeoutRef.current = setTimeout(() => {
          setIsDiscoMode(false);
      }, 12000); 
  };

  // Capybara Message Cycle
  const [capyMsg, setCapyMsg] = useState("Welcome to KPM Inventory!");
  const [showCapyMsg, setShowCapyMsg] = useState(false);
  /* One hide-timer for the mascot, shared by every path that makes him speak. Two paths each
     setting their own 8s timeout meant the FIRST one's timer hid the SECOND one's message —
     so a line that arrived late in the previous message's window flashed and vanished before
     it could be read. Aldi hit exactly that saving a product straight after the mascot had
     cycled: "showing for split second and just outro animation away without showing what it
     said". A ref, not state: changing it must never re-render. */
  const capyTimerRef = useRef(null);
  const [msgIndex, setMsgIndex] = useState(0);

  // Default messages if none are set
  const defaultMessages = [
    "Welcome back, Boss! Stock looks good today.",
    "Checking the inventory... All safe! 🛡️",
    "Don't forget to record samples!",
    "Sales are looking up! 📈",
    "Need to restock soon? Check the list.",
    "I love organization. And watermelons. 🍉",
    "Did you know Capybaras are the largest rodents?",
    "Keep up the good work, team!",
    "Remember to hydrate while you work! 💧",
    "Profit margins are looking healthy.",
    "Scanning for discounts... just kidding!",
    "Is it time for a coffee break yet? ☕",
    "Inventory accuracy is key to success!",
    "You are doing great today! ⭐",
    "Any new products to add?",
    "I'm watching the store, don't worry.",
    "Make sure to update the customer list!",
    "A tidy inventory is a happy inventory.",
    "System systems go! 🚀",
    "Hello from the digital world! 👋"
  ];
  
  const activeMessages = (appSettings?.mascotMessages && appSettings.mascotMessages.length > 0) ? appSettings.mascotMessages : defaultMessages;

  // Feature State

 // Feature State

  const [newMascotMessage, setNewMascotMessage] = useState("");
  
  // New Editing States
  const [editingMsgIndex, setEditingMsgIndex] = useState(-1); 
  const [editMsgText, setEditMsgText] = useState("");         
  

 const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [editingSample, setEditingSample] = useState(null); 
  const [showSamplingAnalytics, setShowSamplingAnalytics] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);

  

 // --- NEW: FETCH AGENT CANVAS & PERMISSIONS FOR SALES TERMINAL ---
  useEffect(() => {
      if (userRole !== 'ADMIN' && agentProfileId && db && userId && userId !== 'default') {
          const agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, agentProfileId);
          const unsub = onSnapshot(agentRef, (docSnap) => {
              if (docSnap.exists()) {
                  const data = docSnap.data();
                  setAgentCanvas(data.activeCanvas || []);
                  
                  // 🚀 FIX: Map the allowRetur permission securely
                  setAgentSettings({
                      allowedPayments: data.allowedPayments || ['Cash'],
                      allowedTiers: data.allowedTiers || ['Retail', 'Ecer'],
                      allowRetur: data.allowRetur === true, // Defaults to false
                      allowCashRefund: data.allowCashRefund === true // Defaults to false
                  });
              }
          }, (err) => console.warn("Agent canvas listener:", err.code));
          return () => unsub();
      } else {
          // ADMIN: Full access to all payments, tiers, and retur
          setAgentSettings({
              allowedPayments: ['Cash', 'QRIS', 'Transfer', 'Titip'],
              allowedTiers: ['Retail', 'Grosir', 'Ecer'],
              allowRetur: true, // Admin can always Retur
              /* 🔴 BUYBACK IS OFF FOR EVERYONE, THE OWNER INCLUDED. Aldi, 2026-09-09: *"lets turn
                 off buyback for now it makes counting profit and revenue more difficult anyway and
                 company doesnt allow that, exchange still possible tho"*, after explaining the
                 model it follows from: *"when company sell the product its done, when they needed
                 return, what can agent do is help the stores to resell their unsold product to
                 other customer, well its by using agent own money and not the company"*.

                 A completed sale is a closed contract, so there is no company money to hand back.
                 This line used to read `true` with the comment "Admin can always refund", which
                 made the one rule the company does not permit the one rule its owner could not
                 switch off. Now it is a granted privilege like any other: nobody has it, and a
                 named person can still be given it per-agent in Fleet & Roster if a genuine
                 company-fault case ever turns up.

                 `allowRetur` stays TRUE on purpose — *"exchange still possible tho"*. Exchange
                 swaps goods for goods at a forced price of 0, so no money moves and none of this
                 applies to it. */
              allowCashRefund: false
          });
      }
  }, [userRole, agentProfileId, db, appId, userId]);




 // 🚀 THE TELEMETRY ENGINE: High-Accuracy Event-Driven Tracker
  useEffect(() => {
      const activeTrackerId = user?.agentId || (user?.role === 'COMPANY_OWNER' || user?.role === 'ADMIN' || user?.tier === 1 ? 'master_owner' : null);

      if (!user || !activeTrackerId) return;

      const triggerLocationUpdate = async () => {
          navigator.geolocation.getCurrentPosition(
              async (pos) => {
                  const currentCoords = { 
                      lat: pos.coords.latitude, 
                      lng: pos.coords.longitude, 
                      timestamp: new Date().toISOString() 
                  };
                  
                  try {
                      const agentRef = doc(db, `artifacts/${appId}/users/${user.uid}/motorists`, activeTrackerId);

                      /* pathHistory = TODAY'S points only (his B, 2026-10-02). It used to grow by one point
                         every ping forever, heading for the 1 MB record his van stock also lives in. The first
                         ping of a new day REPLACES the list; later pings that day add to it. The day is kept on
                         this phone, not read from the record: no extra read, and it works offline. The day is
                         stored BEFORE the save, because an offline save does not resolve until it syncs. */
                      const today = getLocalDayKey(), dayKey = `kpm_path_day_${activeTrackerId}`;
                      let sameDay = false;
                      try { sameDay = localStorage.getItem(dayKey) === today; localStorage.setItem(dayKey, today); } catch { /* no storage: start the day's list again, harmless */ }

                      // 🚀 FIX: Changed updateDoc to setDoc + merge:true
                      // This forces Firebase to create the Master Owner profile if it doesn't exist yet!
                      await setDoc(agentRef, {
                          currentLocation: currentCoords,
                          pathHistory: sameDay ? arrayUnion(currentCoords) : [currentCoords],
                          /* the boss shows on Journey Plan's Expedition like his team (his 2026-10-04 call): his own name, not
                             "Master HQ", and his place in the company beside it - Settings calls Tier 1 the Overseer */
                          name: activeTrackerId === 'master_owner' ? (user.displayName || 'Master HQ') : (user.displayName || 'Agent'),
                          ...(activeTrackerId === 'master_owner' ? { title: user?.tier === 1 || user?.role === 'ADMIN' || user?.role === 'DEVELOPER' ? 'T1 · OVERSEER' : 'T2 · OWNER' } : {})
                      }, { merge: true });
                      
                  } catch (e) {
                      console.error("Telemetry push failed:", e);
                  }
              },
              (err) => console.warn("GPS Signal Lost:", err),
              { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 } 
          );
      };

      window.addEventListener('trigger-telemetry-ping', triggerLocationUpdate);
      triggerLocationUpdate();

      return () => window.removeEventListener('trigger-telemetry-ping', triggerLocationUpdate);
  }, [user, db, appId]);

 



  // 🚀 NOTIFICATION CLICK HANDLER 🚀
  const handleNotificationClick = async (notification) => {
      // 1. Mark as Read (real DB notifications get updateDoc'd; virtual logistics
      // alerts aren't real documents — they're recomputed from stock_requests every
      // snapshot, see readVirtualNotifs above — so they're marked read locally instead)
      if (notification.id.startsWith('logistics_')) {
          // 🚀 FIX: this branch existed to skip the DB write, but never actually
          // recorded the read state anywhere, so a logistics notification could
          // never be marked read.
          setReadVirtualNotifs(prev => prev.includes(notification.id) ? prev : [...prev, notification.id]);
      } else if (!notification.read) {
          try {
              await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/notifications`, notification.id), { read: true });
          } catch (e) { console.error("Error marking read", e); }
      }
      // 2. Jump straight to the relevant tab!
      if (notification.linkToTab) {
          setActiveTab(notification.linkToTab);
      }
      // 3. And, when the alert names one, straight to the shop it is about. Set BEFORE the screen
      //    mounts so it opens already focused rather than opening and then jumping.
      if (notification.linkToStore) setFocusStore(notification.linkToStore);
  };

  // 🚀 ACCOUNT TRANSFER HANDLERS (3-KEY PROTOCOL) 🚀
  const handleRequestTransfer = async (storeName, toAgentId, toAgentName, note, snapshot) => {
      const isAlreadyPending = transferRequests.some(r => 
          storeKey(r.storeName) === storeKey(storeName) &&
          (r.status === 'PENDING_AGENT' || r.status === 'PENDING_ADMIN')
      );
      if (isAlreadyPending) return notify(`Hold on! A transfer request for ${storeName} is already pending.`);

      // 🚀 STORE-ID PIN: his book holds three shops sharing one name, 14.5 km apart. The
      // request carried the NAME only, so approving one hand-off reached every shop called that.
      // Pin the customer document HERE, while the sender is still known. A name that even the
      // sender's own ownership cannot split stays null, and approval falls back to the name.
      const fromAgentName = user.displayName || user.email.split('@')[0];
      const sameName = customers.filter(c => storeKey(c.name) === storeKey(storeName));
      const mine = sameName.length > 1 ? sameName.filter(c => c.mappedBy === fromAgentName) : sameName;

      /* 🤝 THE WRITE REFUSES TOO. ConsignmentFinanceView greys an ineligible name out and blocks
         Confirm, but a greyed control is a suggestion, not a boundary - "UI Says Yes, Server Says
         No" is already a named pattern in this project. This is the same predicate, run where the
         document is actually created.

         The current owner is the customer document's `ownerAgentId` when the store has changed
         hands before, and otherwise the agent stamped on its newest row. `mappedBy` above is NOT
         that - it says who first registered the shop, and it stays what it is for. */
      const ownerDoc = (mine.length === 1 ? mine : sameName).find(c => c.ownerAgentId);
      let currentOwnerId = ownerDoc?.ownerAgentId || null;
      if (!currentOwnerId) {
          let newest = null;
          (transactions || []).forEach(t => {
              if (!t.customerName || !t.agentId) return;
              if (storeKey(t.customerName) !== storeKey(storeName)) return;
              if (!newest || (t.timestamp?.seconds || 0) >= (newest.timestamp?.seconds || 0)) newest = t;
          });
          currentOwnerId = newest?.agentId || null;
      }
      const verdict = handoffEligibility({
          toAgent: (motorists || []).find(m => m.id === toAgentId),
          senderRole: userRole,
          senderRegion: (motorists || []).find(m => m.id === agentProfileId)?.location,
          senderIsCompanyWide: userRole === 'ADMIN' || !agentProfileId,
          currentOwnerId
      });
      if (!verdict.ok) return notify(verdict.reason);

      try {
          await addDoc(collection(db, `artifacts/${appId}/users/${userId}/account_transfers`), {
              storeName,
              customerId: mine.length === 1 ? mine[0].id : null,
              fromAgentId: agentProfileId || 'ADMIN',
              fromAgentName,
              toAgentId,
              toAgentName,
              note,
              /* 📦 The offer, frozen at request time — see the comment beside the caller in
                 ConsignmentFinanceView. Until approval the receiver cannot read these rows at all,
                 so without this the card asks them to accept a debt they cannot see. Never a money
                 source: the real balance is recomputed from the rows after approval. */
              stockSnapshot: snapshot || null,
              status: 'PENDING_AGENT',
              timestamp: serverTimestamp()
          });

          // 🔔 BELL NOTIFICATION TO RECEIVING AGENT (Tier 3)
          await addDoc(collection(db, `artifacts/${appId}/users/${userId}/notifications`), {
              title: "🤝 Hand-off Request",
              message: `${user.displayName || 'Admin'} wants to transfer ${storeName} to you.`,
              type: "TRANSFER_REQUEST",
              read: false,          // 🚀 THE FIX: Added 'read: false' for DB sync compatibility
              isRead: false,        
              timestamp: serverTimestamp(),
              agentId: toAgentId,   // Recipient is the receiving agent
              linkToTab: 'receivables',
              // 🔗 Straight to the shop, not merely to the tab. Aldi, 2026-09-05: "notification
              // inside bells also should be able to redirect the user straight to the UI that need
              // our input". Carried only on the two notifications that ASK for something - this one
              // and the admin's authorisation - because a link that opens a screen you have no
              // action on is noise wearing the same clothes as a request.
              linkToStore: storeName
          });

          triggerCapy(`Transfer request for ${storeName} sent to ${toAgentName}!`);
      } catch (e) { console.error(e); notify("Failed to request transfer: " + e.message); }
  };

  const handleAgentAcceptTransfer = async (requestId, isAccepted) => {
      try {
          const request = transferRequests.find(r => r.id === requestId);
          if (!request) return notify("Request not found!");

          const reqRef = doc(db, `artifacts/${appId}/users/${userId}/account_transfers`, requestId);
          await updateDoc(reqRef, { 
              status: isAccepted ? 'PENDING_ADMIN' : 'REJECTED',
              respondedAt: serverTimestamp()
          });

          if (isAccepted) {
              // 3a. 🔔 NOTIFY ORIGINAL REQUESTER 
              // 🚀 THE FIX: We skip this if the requester WAS the Admin, to prevent double-spamming their inbox!
              if (request.fromAgentId && request.fromAgentId !== agentProfileId && request.fromAgentId !== 'ADMIN') {
                  await addDoc(collection(db, `artifacts/${appId}/users/${userId}/notifications`), {
                      title: "⏳ Request Accepted",
                      message: `${request.toAgentName} accepted ${request.storeName}. Waiting for Admin confirmation.`,
                      type: "TRANSFER_UPDATE",
                      read: false,
                      isRead: false,
                      timestamp: serverTimestamp(),
                      agentId: request.fromAgentId,
                      linkToTab: 'receivables'
                  });
              }

              // 3b. 🔔 NOTIFY ADMIN FOR FINAL APPROVAL
              await addDoc(collection(db, `artifacts/${appId}/users/${userId}/notifications`), {
                  title: "🛡️ Transfer Needs Approval",
                  message: `${request.toAgentName} accepted the hand-off for ${request.storeName}. Awaiting your authorization.`,
                  type: "TRANSFER_APPROVAL",
                  read: false,
                  isRead: false,
                  timestamp: serverTimestamp(),
                  agentId: 'ADMIN',
                  linkToTab: 'receivables',
                  linkToStore: request.storeName
              });

              /* 3c. 🔔 AND THE BRANCH'S OWN APPROVERS. Aldi, 2026-09-06: "both still get the
                 bells of course" - Option B, so this is IN ADDITION to the owner's bell above, never
                 instead of it. The branch that matters is the RECEIVING agent's: handoffEligibility
                 guarantees a receiver has a real branch, while the sender may be an admin with none,
                 and the question being approved is whether that branch may take this store. */
              const receivingRegion = (motorists || []).find(m => m.id === request.toAgentId)?.location;
              /* The receiver is no longer excluded — Aldi's call, *"yeah they should be able to
                 confirm their own request"*. handoffApprovers still asks canApproveHandoffFrom, so
                 an ordinary agent receiving a store is not told to approve it; only somebody who
                 already holds that branch's approval power is. A button on a screen with no bell
                 behind it is the same fault as a bell with no button, which is what 5973fc2 fixed. */
              const alsoTell = handoffApprovers(motorists, receivingRegion, [request.fromAgentId]);
              for (const approverId of alsoTell) {
                  await addDoc(collection(db, `artifacts/${appId}/users/${userId}/notifications`), {
                      title: "🛡️ Transfer Needs Approval",
                      message: `${request.toAgentName} accepted the hand-off for ${request.storeName}. Awaiting your authorization.`,
                      type: "TRANSFER_APPROVAL",
                      read: false,
                      isRead: false,
                      timestamp: serverTimestamp(),
                      agentId: approverId,
                      linkToTab: 'receivables',
                      linkToStore: request.storeName
                  });
              }
          } else {
              // REJECTED - NOTIFY ORIGINAL REQUESTER (Admin or Tier 4)
              if (request.fromAgentId && request.fromAgentId !== agentProfileId) {
                  await addDoc(collection(db, `artifacts/${appId}/users/${userId}/notifications`), {
                      title: "❌ Request Declined",
                      message: `${request.toAgentName} declined the transfer of ${request.storeName}.`,
                      type: "TRANSFER_REJECTED",
                      read: false,
                      isRead: false,
                      timestamp: serverTimestamp(),
                      agentId: request.fromAgentId,
                      linkToTab: 'receivables'
                  });
              }
          }

          triggerCapy(isAccepted ? "Transfer accepted! Waiting for Admin approval." : "Transfer rejected.");
      } catch (e) { console.error(e); notify("Action failed: " + e.message); }
  };

  const handleAdminApproveTransfer = async (request, isApproved) => {
      /* 🤝 WHO MAY AUTHORISE THIS. Hiding the button is not a boundary - the same
         "UI Says Yes, Server Says No" rule that put a guard in handleRequestTransfer. The branch is
         the RECEIVING agent's, matching the bell that summoned this person here. */
      const receivingRegion = (motorists || []).find(m => m.id === request.toAgentId)?.location;
      /* 🔑 THE RECEIVER IS NOT REFUSED HERE ANY MORE, AND MUST NOT BE PUT BACK. Aldi's call,
         2026-09-07: *"yeah they should be able to confirm their own request"*. That call changed the
         QUEUE in ConsignmentFinanceView and not this write, so a branch approver receiving a store
         was shown the Authorize button and then refused by this line - the UI-says-yes-server-says-no
         shape, reported by him on 2026-09-08 signed in as KALDI, who was Bandung's named approver
         AND the receiver.

         RESTORING THE `request.toAgentId === agentProfileId ||` CLAUSE SILENTLY REVERSES HIS CALL.
         Hiding the button again is the smaller-looking fix and it is the wrong half: the queue was
         right, this guard was the stale one. What keeps an ordinary receiver out is
         canApproveHandoffFrom two lines below, exactly as it does in the queue - only somebody who
         already holds that branch's approval power for other people can now also authorise one
         addressed to themselves.

         THE SENDER STAYS REFUSED. Asking for a store and granting it to yourself is one person doing
         the whole protocol; being handed one you were offered is not. */
      if (request.fromAgentId === agentProfileId) {
          return notify("You asked for this hand-off. Somebody else has to authorise it.");
      }
      const myApprovalProfile = (motorists || []).find(m => m.id === agentProfileId) || { userRole };
      if (!canApproveHandoffFrom(myApprovalProfile, receivingRegion, motorists)) {
          return notify(`You cannot authorise hand-offs into ${String(receivingRegion || 'that branch').toUpperCase()}. Ask the owner or that branch's admin.`);
      }

      if (!await confirmAction(`${isApproved ? 'Approve' : 'Reject'} the transfer of ${request.storeName} to ${request.toAgentName}?`)) return;

      /* ⚠️ TWO PEOPLE CAN REACH THIS NOW. Option B means the owner AND the branch approver both
         hold the button, so the request has to be re-read at the moment of the write - the local
         copy was rendered before the other person pressed theirs. Without this the second press
         re-runs the whole approval: a second handoffs entry on the customer, a second round of
         notifications, and an APPROVED request flipped to REJECTED after the fact. */
      try {
          const freshSnap = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/account_transfers`, request.id));
          if (!freshSnap.exists()) return notify("That hand-off request no longer exists.");
          if (freshSnap.data().status !== 'PENDING_ADMIN') {
              return notify(`Already handled - ${request.storeName} is ${String(freshSnap.data().status).replace('_', ' ').toLowerCase()}. Somebody else got there first.`);
          }
      } catch (e) {
          console.error(e);
          return notify("Could not confirm the request is still waiting: " + e.message);
      }

      /* 🔴 AN APPROVAL THAT CANNOT MOVE THE SHOP MUST NOT BE WRITTEN AT ALL. Aldi, 2026-09-08,
         after a Tier 4 approved HQ 3 and nothing moved: *"sc6 is the prove that transfer complete
         but not transferred in reality"*. The status update below is unconditional, while the
         ownership move sat inside `if (targetCustomer)` - so a store with no registered customer
         document got an APPROVED request, no owner change, and no handoffs entry, which is also
         why the approver had no history to show for it. The toast said so and changed nothing.

         Active Consignments is built from TRANSACTIONS (ConsignmentFinanceView's customerData),
         not from the registry, so a shop can be visible and sellable there while no customer
         document exists for it to own. Resolve the target BEFORE anything is written, and refuse
         the whole approval when there is none: the request stays PENDING_ADMIN and can be
         approved for real once the shop is registered or re-sent with its id pinned. */
      const sameName = (v) => storeKey(v) === storeKey(request.storeName);
      const nameMatches = customers.filter(c => sameName(c.name));
      // The pinned id wins. Without one, only an unambiguous name may be used - stamping mappedBy
      // onto the wrong twin relabels a shop that was never handed over.
      const targetCustomer = request.customerId
          ? customers.find(c => c.id === request.customerId)
          : (nameMatches.length === 1 ? nameMatches[0] : null);
      if (isApproved && !targetCustomer) {
          return notify(nameMatches.length === 0
              ? `Cannot approve: there is no registered shop called "${request.storeName}". Register it first, then re-send the hand-off - approving now would mark it done without moving anything.`
              : `Cannot approve: "${request.storeName}" matches ${nameMatches.length} shops. Ask ${request.fromAgentName} to re-send it from the shop card so the right one is pinned.`);
      }

      try {
          const operations = [];

          const reqRef = doc(db, `artifacts/${appId}/users/${userId}/account_transfers`, request.id);
          operations.push({ type: 'update', ref: reqRef, data: { status: isApproved ? 'APPROVED' : 'REJECTED', finalizedAt: serverTimestamp() } });

          if (isApproved) {
              // 🤝 THE HAND-OFF NO LONGER REWRITES HISTORY. Approving used to stamp the receiving
              // agent onto every past transaction of the store. Aldi, 2026-09-05: "andi should be
              // view only and budi can edit the value" — a rule that cannot even be stated once the
              // record says the receiver was the seller. So the rows keep the agent who made them,
              // and OWNERSHIP moves on the store document instead. ConsignmentFinanceView reaches
              // the outstanding debt through that owner plus the hand-off chain, which is what
              // stops the new holder inheriting a debt he cannot see.
              // Resolved and refused above, before a single write - targetCustomer cannot be
              // null here when isApproved. The guard stays as a belt on the write itself.
              if (targetCustomer) {
                  const custRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, targetCustomer.id);
                  // mappedBy stays what it was for: handleRequestTransfer reads it to tell two
                  // same-named shops apart. ownerAgentId is the new, separate "who holds it now".
                  operations.push({ type: 'update', ref: custRef, data: {
                      mappedBy: request.toAgentName,
                      ownerAgentId: request.toAgentId,
                      ownerAgentName: request.toAgentName,
                      // serverTimestamp() is illegal inside arrayUnion, so the date is a plain
                      // string - getCurrentDate(), never an inline toISOString(), which is UTC and
                      // would date a 06:00 WIB hand-off to the day before.
                      handoffs: arrayUnion({
                          fromId: request.fromAgentId || 'ADMIN',
                          fromName: request.fromAgentName || 'Admin',
                          toId: request.toAgentId,
                          toName: request.toAgentName,
                          date: getCurrentDate()
                      })
                  }});
              }

              if (request.fromAgentId && request.fromAgentId !== 'ADMIN') {
                  await addDoc(collection(db, `artifacts/${appId}/users/${userId}/notifications`), {
                      title: "✅ Transfer Approved",
                      message: `Admin approved the transfer of ${request.storeName} to ${request.toAgentName}.`,
                      type: "TRANSFER_COMPLETE",
                      read: false,
                      isRead: false,
                      timestamp: serverTimestamp(),
                      agentId: request.fromAgentId,
                      linkToTab: 'receivables'
                  });
              }
              
              await addDoc(collection(db, `artifacts/${appId}/users/${userId}/notifications`), {
                  title: "✅ Transfer Complete",
                  message: `${request.storeName} is now officially in your territory.`,
                  type: "TRANSFER_COMPLETE",
                  read: false,
                  isRead: false,
                  timestamp: serverTimestamp(),
                  agentId: request.toAgentId,
                  linkToTab: 'receivables'
              });
          } else {
               if (request.fromAgentId && request.fromAgentId !== 'ADMIN') {
                  await addDoc(collection(db, `artifacts/${appId}/users/${userId}/notifications`), {
                      title: "❌ Transfer Vetoed",
                      message: `Admin rejected the hand-off for ${request.storeName}.`,
                      type: "TRANSFER_REJECTED",
                      read: false,
                      isRead: false,
                      timestamp: serverTimestamp(),
                      agentId: request.fromAgentId,
                      linkToTab: 'receivables'
                  });
              }
              await addDoc(collection(db, `artifacts/${appId}/users/${userId}/notifications`), {
                  title: "❌ Transfer Vetoed",
                  message: `Admin rejected your hand-off for ${request.storeName}.`,
                  type: "TRANSFER_REJECTED",
                  read: false,
                  isRead: false,
                  timestamp: serverTimestamp(),
                  agentId: request.toAgentId,
                  linkToTab: 'receivables'
              });
          }

          await commitInChunks(db, writeBatch, operations);
          if (isApproved) await logAudit("TRANSFER_APPROVED", `Reassigned ${request.storeName} to ${request.toAgentName}`);
          triggerCapy(isApproved ? "Transfer complete! Debt reassigned." : "Transfer declined.");
      } catch(e) { console.error(e); notify("Failed: " + e.message); }
  };

 // 🚀 EOD HANDLERS 🚀
  const handleSubmitEOD = async (reportData) => {
      try {
          const formattedAgentName = `${user.displayName || "Field Agent"} - ${user.email || "No Email"}`;

          // 🚀 FIX: Match the exact same ID the Sales Terminal uses, so Verify EOD can find the right vehicle record
          const effectiveAgentId = userRole === 'ADMIN'
              ? (adminSalesMode === 'VEHICLE' ? 'ADMIN_VEHICLE' : 'VAULT')
              : (agentProfileId || 'ADMIN');

          await addDoc(collection(db, `artifacts/${appId}/users/${userId}/eod_reports`), {
              agentName: formattedAgentName, 
              agentId: effectiveAgentId,
              timestamp: serverTimestamp(),
              status: 'PENDING',
              ...reportData 
          });

          if (!isAdmin) {
              await addDoc(collection(db, `artifacts/${appId}/users/${userId}/notifications`), {
                  title: "💰 EOD Submitted",
                  message: `${formattedAgentName} submitted an EOD report. Pending your verification.`,
                  type: "EOD_APPROVAL",
                  read: false,          // 🚀 FIX: Add read: false
                  isRead: false,
                  timestamp: serverTimestamp(),
                  agentId: 'ADMIN',     // 🚀 FIX: Send to ADMIN instead of sender
                  linkToTab: 'eod'
              });
          }

          triggerCapy("EOD Report submitted! Admin has been notified.");
      } catch (e) { 
          console.error(e); 
          notify("Failed to submit EOD: " + e.message); 
      }
  };

  /* ONE REPORT, ITS PARTS APPROVED OR RETURNED ONE BY ONE. Aldi, 2026-09-20: "approve and reject for
     every single EOD, so one for each, cash, transfer, pita cukai, bounties". `decision` is
     `{ approve: ['cash', ...], reject: { stock: 'reason' } }` from the boss's player card; with no
     decision every part the report carries is approved (the old one-tap verify). Each approved part
     is credited HERE and ONLY here - the stock to the vault, the damaged packs to quarantine, the
     stamps against the debt ledger, the shortfall as a bounty - and never twice: the `verified` map
     is re-read inside the transaction, so a part a second admin approved a moment ago is skipped.
     The career ledger, the XP and the VERIFIED stamp move once, when the last part is approved; until
     then the report stays PENDING, its `rejected` map carrying the reason the salesman reads on his
     own EOD screen. Resolves true only when the write landed, so the card can play its seal after.
     `opts.confirmed`: the player card asks ONCE for the whole night (eodNightMessage) and hands each
     report in as already confirmed - a night is two documents, and two questions read as a bug
     (his 15:00 "this panel showing up twice"). Without it the handler asks for its one report. */
  const handleVerifyEOD = async (report, decision, opts) => {
      const parts = eodReportParts(report, inventory, appSettings?.penaltyPriceTier);
      const askedApprove = decision?.approve ? decision.approve.filter(p => parts.includes(p)) : parts;
      const askedReject = Object.fromEntries(Object.entries(decision?.reject || {}).filter(([p, why]) => parts.includes(p) && String(why || '').trim()));
      if (askedApprove.length === 0 && Object.keys(askedReject).length === 0) return false;
      const partList = askedApprove.map(p => EOD_PART_LABELS[p].toLowerCase()).join(', ');

      /* A short count becomes a bounty in the agent's name, so the admin is told the amount
         BEFORE approving, not after. Aldi's rule, 2026-08-18: "admin can approve but it will add
         up to the agent's bounties instead". Approving is allowed — it is simply not silent. */
      /* One line per reason - cash, transfer, and each product that did not come back, billed
         at its retail price. Aldi, 2026-08-18: "if there is missing pack then agent needs to buy
         the missing pack on retail price as a compensation". The arithmetic lives in helpers so
         the card the admin reads and the ledger he writes cannot drift apart. */
      const bountyLines = eodBountyLines(report, inventory, appSettings?.penaltyPriceTier);

      if (!opts?.confirmed && !await confirmAction(eodNightMessage([{ report, decision: { approve: askedApprove, reject: askedReject } }], inventory, appSettings?.penaltyPriceTier))) return false;

      let sealed = false;   // set inside the transaction: every part is now approved
      try {
          await runTransaction(db, async (t) => {
              // ==========================================
              // 📖 PHASE 1: EXECUTE ALL READS FIRST
              // ==========================================

              // 🚀 FIX: 'ADMIN' was a legacy mistagging of the Boss's own vehicle (ADMIN_VEHICLE).
              const lookupAgentId = report.agentId === 'ADMIN' ? 'ADMIN_VEHICLE' : report.agentId;

              // 🚀 NEW: Field-level tiers (salesmen) return stock to their own region's branch.
              // Tier 3 and above always return to the Master Vault.
              const agentProfile = motorists.find(m => m.id === lookupAgentId);
              const agentIsFieldLevel = isFieldLevelTier(agentProfile?.userRole);
              const agentLocation = agentProfile?.location;
              const useBranchWarehouse = agentIsFieldLevel && agentLocation && agentLocation !== 'Headquarters' && agentLocation !== 'UNASSIGNED AREA';
              const safeBranchPath = useBranchWarehouse ? agentLocation.replace(/\//g, '-') : null;

              // 🚨 FIX: read the EOD report itself so two admins verifying the same report at once
              // can't both succeed — without this read in the transaction's read-set, Firestore has
              // no way to detect the conflict and stock gets double-credited.
              const eodRef = doc(db, `artifacts/${appId}/users/${userId}/eod_reports`, report.id);
              const eodSnap = await t.get(eodRef);
              if (!eodSnap.exists()) throw new Error('Laporan EOD sudah tidak ada.');
              if (eodSnap.data().status === 'VERIFIED') throw new Error('Laporan ini sudah diverifikasi.');
              /* The FRESH map, not the prop: a part another admin approved while this card was open is
                 already credited, so it is dropped here rather than credited twice. Only the parts
                 approved NOW are read and written below - a part going back touches nothing. */
              const wasVerified = eodSnap.data().verified || {};
              const approveNow = askedApprove.filter(p => wasVerified[p] !== true);
              const nowDoing = (part) => approveNow.includes(part);
              if (approveNow.length === 0 && Object.keys(askedReject).length === 0) throw new Error('Bagian ini sudah diverifikasi.');

              const validItems = nowDoing('stock') ? (report.remainingStock || []).filter(item => item.qty > 0) : [];
              const productRefs = validItems.map(item => ({
                  itemData: item,
                  ref: useBranchWarehouse
                      ? doc(db, `artifacts/${appId}/users/${userId}/branches/${safeBranchPath}/inventory`, item.productId)
                      : doc(db, `artifacts/${appId}/users/${userId}/products`, item.productId)
              }));
              const productDocs = await Promise.all(productRefs.map(p => t.get(p.ref)));

              // 🚀 NEW: Damaged goods reported today — read their current damagedStock count
              // at the same destination (branch or master), so we can safely increment it.
              const validDamagedItems = nowDoing('damaged') ? (report.damagedStockToReturn || []).filter(item => item.qty > 0) : [];
              const damagedRefs = validDamagedItems.map(item => ({
                  itemData: item,
                  ref: useBranchWarehouse
                      ? doc(db, `artifacts/${appId}/users/${userId}/branches/${safeBranchPath}/inventory`, item.productId)
                      : doc(db, `artifacts/${appId}/users/${userId}/products`, item.productId)
              }));
              const damagedDocs = await Promise.all(damagedRefs.map(d => t.get(d.ref)));

              let agentRef = null;
              let agentDoc = null;
              // 'VAULT' mode has no vehicle canvas at all, so there's genuinely nothing to look up there.
              if (lookupAgentId && lookupAgentId !== 'VAULT') {
                  agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, lookupAgentId);
                  agentDoc = await t.get(agentRef);
              }

              // 🚀 CAREER LEDGER (Phase 2): read in the same transaction as everything else, so a
              // concurrent verify can't credit the same day twice — same read-then-write shape as
              // the eodSnap guard above. 'VAULT' has no agent to track, same exclusion as agentRef.
              const careerRef = (lookupAgentId && lookupAgentId !== 'VAULT')
                  ? doc(db, `artifacts/${appId}/users/${userId}/career`, lookupAgentId)
                  : null;
              const careerSnap = careerRef ? await t.get(careerRef) : null;

              // ==========================================
              // ✍️ PHASE 2: EXECUTE ALL WRITES LAST
              // ==========================================

              // 2A. Update Products (Return Stock) — now correctly routes to branch or master vault
              const lowStockAlerts = [];
              productDocs.forEach((pSnap, index) => {
                  const item = productRefs[index].itemData;
                  // Unit-conversion ratios (Slop/Bal/Karton → Bks) always come from the master product,
                  // since branch inventory docs may not carry those fields themselves.
                  const masterProduct = inventory.find(p => p.id === item.productId);
                  let mult = 1;
                  if (item.unit === 'Slop') mult = masterProduct?.packsPerSlop || 10;
                  if (item.unit === 'Bal') mult = (masterProduct?.slopsPerBal || 20) * (masterProduct?.packsPerSlop || 10);
                  if (item.unit === 'Karton') mult = (masterProduct?.balsPerCarton || 4) * (masterProduct?.slopsPerBal || 20) * (masterProduct?.packsPerSlop || 10);
                  const bksToReturn = item.qty * mult;
                  const currentStock = pSnap.exists() ? (pSnap.data().stock || 0) : 0;
                  const newStock = currentStock + bksToReturn;

                  if (useBranchWarehouse) {
                      // Branch inventory doc might not exist yet for this product — set+merge handles both cases
                      t.set(productRefs[index].ref, { productId: item.productId, name: masterProduct?.name || item.name, stock: newStock }, { merge: true });
                  } else {
                      t.set(productRefs[index].ref, { stock: newStock }, { merge: true });
                  }

                  // 🔔 NEW: Flag if this product is still below its minimum even after the return
                  if (isLowStock({ ...(masterProduct || {}), stock: newStock }, appSettings)) {
                      lowStockAlerts.push(`${masterProduct?.name || item.name} (${newStock} Bks left)`);
                  }
              });

              // 🚀 NEW: Credit damagedStock at the correct destination (branch or master) —
              // this is the piece that got deleted earlier to fix the Tier 6 permission crash.
              // It's safe here because it's the ADMIN's own session doing the write, not the field agent's.
              damagedDocs.forEach((dSnap, index) => {
                  const item = damagedRefs[index].itemData;
                  const masterProduct = inventory.find(p => p.id === item.productId);
                  // Good stock 26 lines above converts Slop/Bal/Karton into Bks before crediting.
                  // This loop did not: returning 2 Bal of crushed packs credited the Quarantine
                  // Vault 2 instead of 400, and the unit was dropped at write time so nothing
                  // downstream could recover the real figure.
                  const damagedBks = convertToBks(item.qty, item.unit, masterProduct);
                  if (useBranchWarehouse) {
                      t.set(damagedRefs[index].ref, { productId: item.productId, name: masterProduct?.name || item.name, damagedStock: increment(damagedBks) }, { merge: true });
                  } else {
                      t.set(damagedRefs[index].ref, { damagedStock: increment(damagedBks) }, { merge: true });
                  }
              });

              // 🚀 FIX: Mark each source ticket's transaction as credited, so it's never
              // picked up and counted again by a future EOD (the actual cause of the 30-vs-10 bug).
              const creditedTxIds = [...new Set(validDamagedItems.map(item => item.txId).filter(Boolean))];
              creditedTxIds.forEach(txId => {
                  const txRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, txId);
                  t.update(txRef, { 'forensicData.eodCredited': true });
              });

              // 🔔 NEW: One combined notification if anything just entered Quarantine
              if (validDamagedItems.length > 0) {
                  const totalDamagedQty = validDamagedItems.reduce((sum, i) => sum + i.qty, 0);
                  const notifRef = doc(collection(db, `artifacts/${appId}/users/${userId}/notifications`));
                  t.set(notifRef, {
                      title: "☣️ New Quarantine Items",
                      message: `${totalDamagedQty} Bks entered the Quarantine Vault from ${report.agentName}'s EOD. Needs resolution.`,
                      type: "QUARANTINE_ENTRY",
                      read: false,
                      isRead: false,
                      timestamp: serverTimestamp(),
                      agentId: 'ADMIN',
                      linkToTab: 'stock_opname'
                  });
              }

              // 🔔 NEW: One combined notification if anything is still low after this return
              if (lowStockAlerts.length > 0) {
                  const notifRef = doc(collection(db, `artifacts/${appId}/users/${userId}/notifications`));
                  t.set(notifRef, {
                      title: "📉 Low Stock Warning",
                      message: `Still low after EOD return: ${lowStockAlerts.join(', ')}.`,
                      type: "LOW_STOCK",
                      read: false,
                      isRead: false,
                      timestamp: serverTimestamp(),
                      agentId: 'ADMIN',
                      linkToTab: 'inventory'
                  });
              }

              // 2B. Update Agent Profile & Financial Wallets — only for the parts approved now
              const touchesAgent = nowDoing('bounty') || nowDoing('cukai') || nowDoing('stock');
              if (agentRef && agentDoc && agentDoc.exists() && touchesAgent) {
                  let currentDebts = agentDoc.data().cukaiDebts || {};
                  /* Why a sibling map and not a richer value under PENALTY_: every existing sum
                     on that key expects a plain number. Changing the shape would have broken the
                     WANTED board, the clearance report and the stamp arithmetic at once. */
                  let currentNotes = agentDoc.data().cukaiDebtNotes || {};
                  let currentCanvas = agentDoc.data().activeCanvas || [];

                  // 🤠 RDR2 BOUNTY PROTOCOL 🤠
                  if (report.reportType === 'BOUNTY') {
                      if (report.penaltyKeys && Array.isArray(report.penaltyKeys)) {
                          report.penaltyKeys.forEach(key => {
                              delete currentDebts[key]; // Physically eradicate the debt from the ledger
                              delete currentNotes[key]; // and the line that explained it, or the panel grows forever
                          });
                      }
                      // Update ONLY the debt wallet. Do NOT wipe their vehicle canvas for a mid-day fine payment!
                      t.update(agentRef, { cukaiDebts: currentDebts, cukaiDebtNotes: currentNotes });
                  
                  } else {
                      // 📦 STANDARD EOD / CUKAI PROTOCOL 📦
                      if (agentDoc.data().cukaiDebt !== undefined) {
                          currentDebts['global_credit'] = (currentDebts['global_credit'] || 0) + agentDoc.data().cukaiDebt;
                      }

                      let remainingPayment = nowDoing('cukai') ? (report.cukai || 0) : 0;
                      for (let pid of Object.keys(currentDebts)) {
                          if (remainingPayment <= 0) break;
                          // 🚀 FIX: Prevent standard stamp payments from accidentally wiping out CASH bounties
                          if (pid !== 'global_credit' && !pid.startsWith('PENALTY_') && currentDebts[pid] > 0) {
                              let stampDebt = Math.ceil(currentDebts[pid]);
                              let applied = Math.min(stampDebt, remainingPayment);
                              currentDebts[pid] -= applied; 
                              remainingPayment -= applied;
                          }
                      }

                      if (remainingPayment > 0) {
                          currentDebts['global_credit'] = (currentDebts['global_credit'] || 0) - remainingPayment;
                      }

                      /* 🤠 A SHORT COUNT BECOMES A BOUNTY. Aldi, 2026-08-18: "admin can approve but
                         it will add up to the agent's bounties instead, and for the bounties, the
                         agent can repay their debt through the EOD screen even after bounties
                         recorded on their name". Both halves of that already existed — the WANTED
                         board sums every PENALTY_ key, and a BOUNTY clearance report pays them off
                         from the agent's own EOD screen. Only the minting was missing.

                         ONE KEY PER REASON, on his later word: "the bounties panel need to specify
                         how the bounties number are calculated". A lump sum cannot be explained to
                         the man paying it. `cukaiDebtNotes` carries the label and the date beside
                         each key, so the board can read the arithmetic back; the money itself stays
                         a plain number under PENALTY_, which is what every existing sum expects.

                         ASSIGNED, never added to: verifying the same report twice writes the same
                         keys with the same numbers, so a double-approve cannot charge a man twice
                         for one night. */
                      if (report.id && nowDoing('bounty')) {
                          bountyLines.forEach(line => {
                              currentDebts[line.key] = line.amount;
                              currentNotes[line.key] = { label: line.label, date: line.date };
                          });
                      }

                      // 🚀 ANTI-WIPE BUG FIX: If they just submitted a Cukai report, do NOT wipe their stock!
                      // The van is emptied by the STOCK part alone (a CUKAI report carries none), so a night
                      // whose stock went back to the salesman keeps his canvas until the count is right.
                      const finalCanvas = nowDoing('stock') ? [] : currentCanvas;

                      t.update(agentRef, { activeCanvas: finalCanvas, cukaiDebts: currentDebts, cukaiDebtNotes: currentNotes, cukaiDebt: 0 });
                  }
              }

              // 2C. The verified / rejected maps first; the career ledger + VERIFIED only once every part is in
              const verifiedNow = { ...wasVerified, ...Object.fromEntries(approveNow.map(p => [p, true])) };
              const rejectedNow = { ...(eodSnap.data().rejected || {}), ...askedReject };
              approveNow.forEach(p => { delete rejectedNow[p]; });
              const stamp = { verified: verifiedNow, rejected: rejectedNow };
              if (Object.keys(askedReject).length > 0) {
                  // 🔔 The salesman hears why, on his own screen - silence is a bug (Aldi's law).
                  const notifRef = doc(collection(db, `artifacts/${appId}/users/${userId}/notifications`));
                  t.set(notifRef, {
                      title: "↩️ EOD sent back",
                      message: `${Object.entries(askedReject).map(([p, why]) => `${EOD_PART_LABELS[p]}: ${why}`).join(' · ')}`,
                      type: "EOD_RETURNED",
                      read: false,
                      isRead: false,
                      timestamp: serverTimestamp(),
                      agentId: report.agentId,
                      linkToTab: 'eod'
                  });
              }
              sealed = parts.every(p => verifiedNow[p] === true);
              if (!sealed) { t.update(eodRef, stamp); return; }

              // Nothing reads `career` yet (that's Phase 4) — this just accumulates silently.
              if (careerRef && report.reportType !== 'BOUNTY') {
                  const reportDate = report.timestamp?.seconds ? new Date(report.timestamp.seconds * 1000) : new Date();
                  const dayKey = report.dayKey ?? getLocalDayKey(reportDate);
                  const creditKey = `${dayKey}:${report.reportType || 'LEGACY'}`;
                  const c = (careerSnap && careerSnap.exists()) ? careerSnap.data() : {};
                  const alreadyCredited = (c.credited || {})[creditKey] === true;

                  if (!alreadyCredited) {
                      // ponytail: `credited` pruned to the newest 90 keys (~45 working days) on every
                      // write so it never grows unbounded. Upgrade to a Cloud Function only if someone
                      // actually needs to re-verify something older than that.
                      const prunedCredited = Object.fromEntries(
                          Object.entries({ ...(c.credited || {}), [creditKey]: true })
                              .sort(([a], [b]) => b.localeCompare(a))
                              .slice(0, 90)
                      );
                      const liveIncrements = {
                          collected:      increment(Number(report.cash || 0) + Number(report.transfer || 0)),
                          itemsBks:       increment(Number(report.itemsBks || 0)),
                          titipCollected: increment(Number(report.titipCollected || 0)),
                          storesServed:   increment(Number(report.storesServed || 0)),
                          daysVerified:   increment(report.reportType === 'CASH_STOCK' ? 1 : 0)
                      };
                      const careerUpdate = { live: liveIncrements, credited: prunedCredited, updatedAt: serverTimestamp() };

                      // 🚀 SCOPE: only CASH_STOCK is the "day closed" report — it's the only one that
                      // carries a real cukaiRemaining/storesServed signal (CUKAI reports submit
                      // cash:0/transfer:0 and no cukaiRemaining at all). Computing dayXP/streaks/
                      // cleanCukaiDays off a CUKAI report would read an undefined cukaiRemaining as
                      // "0 = clean" every time, and double-grant the daily "showed up" bonus alongside
                      // the same day's CASH_STOCK report. So streaks/XP/cleanCukaiDays only move on
                      // CASH_STOCK; CUKAI still gets its own `credited` key (blocks its own double-verify)
                      // and its own (zero) live increments, just no XP double-count.
                      let dayXP, xpBreakdown;
                      if (report.reportType === 'CASH_STOCK') {
                          liveIncrements.cleanCukaiDays = increment(Number(report.cukaiRemaining || 0) <= 0 ? 1 : 0);
                          const computed = computeDayXP(report, c, DEFAULT_XP);
                          dayXP = computed.total;
                          xpBreakdown = computed.breakdown;

                          const prevDay = c.lastVerifiedDay || '';
                          const isConsecutive = prevDay && (new Date(dayKey) - new Date(prevDay)) === 86400000;
                          const streak = prevDay === dayKey ? (c.streakCurrent || 1) : isConsecutive ? (c.streakCurrent || 0) + 1 : 1;
                          const monthKey = dayKey.slice(0, 7);
                          const sameSeason = c.season?.key === monthKey;

                          careerUpdate.lastVerifiedDay = dayKey;
                          careerUpdate.streakCurrent = streak;
                          careerUpdate.streakBest = Math.max(streak, c.streakBest || 0);
                          careerUpdate.season = { key: monthKey, score: (sameSeason ? (c.season.score || 0) : 0) + dayXP };
                      }

                      // 🚀 Phase 5: badge check — computed against what `live` WILL be after this
                      // write (increment() sentinels can't be read back inside the same
                      // transaction, so the post-write totals are built by hand from the same
                      // raw numbers already used above). Guarded by .length: arrayUnion() with
                      // zero arguments throws, which would roll back the whole stock return.
                      const postLive = {
                          collected:      (c.live?.collected || 0) + Number(report.cash || 0) + Number(report.transfer || 0),
                          itemsBks:       (c.live?.itemsBks || 0) + Number(report.itemsBks || 0),
                          titipCollected: (c.live?.titipCollected || 0) + Number(report.titipCollected || 0),
                          storesServed:   (c.live?.storesServed || 0) + Number(report.storesServed || 0),
                          daysVerified:   (c.live?.daysVerified || 0) + (report.reportType === 'CASH_STOCK' ? 1 : 0),
                          cleanCukaiDays: (c.live?.cleanCukaiDays || 0) + (report.reportType === 'CASH_STOCK' ? (Number(report.cukaiRemaining || 0) <= 0 ? 1 : 0) : 0)
                      };
                      const freshBadges = checkBadges(progressionBadges, { base: c.base, live: postLive, joinDate: c.joinDate, bonusXP: c.bonusXP }, {});
                      if (freshBadges.length) careerUpdate.unlocks = arrayUnion(...freshBadges);

                      t.set(careerRef, careerUpdate, { merge: true });
                      t.update(eodRef, dayXP !== undefined
                          ? { ...stamp, status: 'VERIFIED', verifiedAt: serverTimestamp(), dayXP, xpBreakdown }
                          : { ...stamp, status: 'VERIFIED', verifiedAt: serverTimestamp() });
                      return;
                  }
              }
              t.update(eodRef, { ...stamp, status: 'VERIFIED', verifiedAt: serverTimestamp() });
          });

          const returned = Object.keys(askedReject).map(p => EOD_PART_LABELS[p].toLowerCase()).join(', ');
          await logAudit(sealed ? "EOD_VERIFIED" : "EOD_PART", `${sealed ? 'Verified' : `Approved ${partList || 'nothing'} of`} ${report.reportType || 'EOD'} for ${report.agentName}${returned ? ` (sent back: ${returned})` : ''}`);
          triggerCapy(sealed
              ? (report.reportType === 'BOUNTY' ? "Bounty Cleared! The law is satisfied. 🤠" : "EOD Verified & Stock Returned! 📦")
              : `${partList ? `Approved ${partList}. ` : ''}${returned ? `Sent back: ${returned}.` : ''}`.trim());
          return true;
      } catch(e) { console.error(e); notify("Verification failed: " + e.message); return false; }
  };

  const handleResetEOD = async (report, opts) => {
      // opts.confirmed: the card / the history row asked once for the whole night (two documents, one question)
      if(!opts?.confirmed && !await confirmAction(`RESET EOD for ${report.agentName}? This will delete today's submission so they can try again.`)) return;
      try {
          await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/eod_reports`, report.id));
          await logAudit("EOD_RESET", `Admin reset EOD for ${report.agentName}`);
          triggerCapy(`EOD Reset! ${report.agentName} can now submit again.`);
      } catch(e) { console.error(e); notify("Failed to reset: " + e.message); }
  };

  // 🚀 CAREER LEDGER BACKFILL (Phase 3): one-time bulk recompute of career.base from every
  // already-verified EOD report, so tenure/history-based badges have real data instead of
  // starting from zero the day the ledger began. Absolute SET, safe to re-run — but a re-run
  // also resets `live` to zero, otherwise a period that's folded into a fresh `base` would
  // ALSO still be sitting in `live` from before, and totals() (base + live) would double-count
  // it. handleVerifyEOD's own idempotency (the `credited` map) is untouched by this, so nothing
  // already verified can get re-credited just because `live` was reset.
  const handleRecalculateCareer = async () => {
      // 🚨 DEVICE GUARD: an owner-only *permission* gate is not a *device* gate — this is a
      // one-time full-history scan, not something to trigger by accident from a phone on 3G.
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn && conn.effectiveType && conn.effectiveType !== '4g') {
          triggerCapy('📶 Koneksi lemah. Hitung Ulang Karir butuh 4G ke atas — coba pakai WiFi.');
          return;
      }
      if (window.innerWidth < 1024) {
          triggerCapy('💻 Hitung Ulang Karir hanya untuk laptop/PC, bukan HP.');
          return;
      }
      if (!await confirmAction('Hitung ulang riwayat karir SEMUA agen dari seluruh laporan EOD yang sudah diverifikasi? Ini akan mengatur ulang penghitung "live" tiap agen dan membangun ulang "base" dari awal. Aman dijalankan berkali-kali.')) return;

      try {
          const snap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/eod_reports`));
          const byAgent = {};
          let scanned = 0;

          snap.docs.forEach(d => {
              const report = d.data();
              if (report.status !== 'VERIFIED' || report.reportType === 'BOUNTY') return;
              const lookupAgentId = report.agentId === 'ADMIN' ? 'ADMIN_VEHICLE' : report.agentId;
              if (!lookupAgentId || lookupAgentId === 'VAULT') return;

              if (!byAgent[lookupAgentId]) {
                  byAgent[lookupAgentId] = { collected: 0, itemsBks: 0, titipCollected: 0, storesServed: 0, daysVerified: 0, cleanCukaiDays: 0 };
              }
              const acc = byAgent[lookupAgentId];
              acc.collected += Number(report.cash || 0) + Number(report.transfer || 0);
              acc.itemsBks += Number(report.itemsBks || 0);
              acc.titipCollected += Number(report.titipCollected || 0);
              acc.storesServed += Number(report.storesServed || 0);
              if (report.reportType === 'CASH_STOCK') {
                  acc.daysVerified += 1;
                  acc.cleanCukaiDays += Number(report.cukaiRemaining || 0) <= 0 ? 1 : 0;
              }
              scanned++;
          });

          // 🚀 Phase 4: fold any pre-existing manualExp into career.bonusXP so nobody loses
          // standing when rank stops reading manualExp directly. One-time per agent, guarded
          // by manualExpMigrated so a second backfill run doesn't add it twice. A real award
          // record is written too — "so nobody loses standing" also means a visible reason,
          // not just a silent number moved from one field to another.
          let migratedCount = 0;
          motorists.forEach(m => {
              const manualExp = Number(m.manualExp || 0);
              if (manualExp <= 0 || m.manualExpMigrated) return;
              if (!byAgent[m.id]) byAgent[m.id] = { collected: 0, itemsBks: 0, titipCollected: 0, storesServed: 0, daysVerified: 0, cleanCukaiDays: 0 };
              byAgent[m.id].__manualExpToMigrate = manualExp;
              migratedCount++;
          });

          const cutoffDay = getLocalDayKey();
          const operations = Object.entries(byAgent).flatMap(([agentId, base]) => {
              const manualExpToMigrate = base.__manualExpToMigrate;
              delete base.__manualExpToMigrate;
              const careerOps = [{
                  type: 'set',
                  ref: doc(db, `artifacts/${appId}/users/${userId}/career`, agentId),
                  data: manualExpToMigrate
                      ? { base, baseThrough: cutoffDay, live: {}, bonusXP: increment(manualExpToMigrate) }
                      : { base, baseThrough: cutoffDay, live: {} },
                  options: { merge: true }
              }];
              if (manualExpToMigrate) {
                  careerOps.push({
                      type: 'set',
                      ref: doc(collection(db, `artifacts/${appId}/users/${userId}/career/${agentId}/awards`)),
                      data: {
                          title: 'Penghargaan Sebelumnya', xp: manualExpToMigrate,
                          reason: `Migrasi EXP manual lama (${manualExpToMigrate} EXP) saat sistem karir baru diaktifkan.`,
                          grantedBy: userId, grantedAt: serverTimestamp()
                      }
                  });
                  careerOps.push({ type: 'update', ref: doc(db, `artifacts/${appId}/users/${userId}/motorists`, agentId), data: { manualExpMigrated: true } });
              }
              return careerOps;
          });

          await commitInChunks(db, writeBatch, operations);
          await logAudit("CAREER_RECALCULATED", `Recalculated career ledger for ${Object.keys(byAgent).length} agents from ${scanned} verified reports, migrated manualExp for ${migratedCount}.`);
          triggerCapy(`Karir dihitung ulang! ${Object.keys(byAgent).length} agen, ${scanned} laporan diproses${migratedCount ? `, ${migratedCount} EXP lama dimigrasi` : ''}.`);
      } catch (e) {
          console.error(e);
          triggerCapy("❌ Gagal menghitung ulang karir: " + e.message);
      }
  };

  // --- PHASE 2: AUTHENTICATION & TRAFFIC COP ENGINE ---
  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
        console.error("Redirect Error:", error);
        setLoginError(`Login Failed: ${error.message}`);
    });

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser && currentUser.email) {
            const email = currentUser.email.toLowerCase().trim();
            setCurrentUserEmail(email);
            /* 🔴 SAY "CHECKING" FIRST, BEFORE THE FIRST ROUND TRIP. His first open on a new address
               (2026-09-16, his own tier-1 account): "access denied that took too long on recognizing
               my tier 1 account, it said im not part of the employee". The red panel wants `user`
               set and the role UNAUTHORIZED — and both were true at once: the page's first
               onAuthStateChanged(null) had left the role at UNAUTHORIZED (the sign-out branch
               below), then the Google popup resolved and handleLogin set the user on the spot, so
               a verdict from a sign-out sat on screen for as long as a cold connection took to
               answer the lookups. Now the listener owns `user`, and the first thing it says is
               that it is looking — the CHECKING panel, which names the account and offers a way
               out. `user` itself stays null until the role is known, so nothing downstream (data
               subscriptions keyed on the user) starts under a role that is about to change. The
               reads below set both when they land; `finally` clears the panel on every exit. */
            setCheckingEmail(email);

            // 🚀 MASTER VIP LIST: the Architect can never be locked out. Defined before the
            // try block so the offline crash handler in the catch below can see it too.
            /* The email lives in povPreview.js now, so the POV switch and the VIP list can
               never disagree about which address is his. Same string, one owner. */
            const masterVIPs = [POV_OWNER_EMAIL];
            const isDeveloper = masterVIPs.includes(email);

            try {
                // 🚀 TIER 1 CHECK: IS THIS THE SYSTEM ARCHITECT? (SECURED) 🚀
                const sysAdminRef = doc(db, 'system_admins', currentUser.uid);
                // 🚀 CROWN CLAIM CHECK: Did this user just receive the Crown?
                const inviteRef = doc(db, 'system_admins_invites', email);
                // 🏢 TIER 2-4 CHECK: NORMAL EMPLOYEES & CLIENTS 🏢
                const uidRef = doc(db, `artifacts/${appId}/employee_directory`, currentUser.uid);
                const emailRef = doc(db, `artifacts/${appId}/employee_directory`, email);
                /* Four independent reads, ONE round trip. They used to run one after another —
                   four cold round trips on a new phone, which is the wait he felt ("the slow login
                   is only for the first time since the address is new"). Nothing below depends on
                   one read finishing before another starts. */
                const [sysAdminSnap, inviteSnap, uidSnap, emailSnap] = await Promise.all([sysAdminRef, inviteRef, uidRef, emailRef].map(getDocOfflineSafe));

                if (inviteSnap.exists() || (isDeveloper && !sysAdminSnap.exists())) {
                    // Claim the Crown: Promote them to System Admin and delete the invite
                    await setDoc(sysAdminRef, { email: email, claimedAt: serverTimestamp(), securityBypass: 'ARCHITECT' });
                    if (inviteSnap.exists()) await deleteDoc(inviteRef);
                }

                if (sysAdminSnap.exists() || inviteSnap.exists() || isDeveloper) {
                    setIsSystemOwner(true);
                    setBossUid(null);
                    setProfileName([uidSnap, emailSnap].map(s => s.exists() && (s.data().name || s.data().agentName)).find(Boolean) || null);
                    setUserRole('ADMIN'); 
                    setAgentProfileId(null);
                    setUser(currentUser);
                    setIsAdmin(false); 
                    setShowAdminLogin(true); 
                    return; 
                }

                setIsSystemOwner(false);

                let activeData = null;

                // 🚀 CONTINUOUS SYNC ENGINE (Fixes Profile Deletion & Desync)
                if (uidSnap.exists()) {
                    activeData = uidSnap.data();
                } 
                
                // Always pull the freshest configuration from the Fleet Roster (Email Doc)
                if (emailSnap.exists()) {
                    const freshEmailData = emailSnap.data();
                    
                    if (freshEmailData.role === 'COMPANY_OWNER') {
                        if (!activeData) {
                            setPendingMigration({ oldId: email, newId: currentUser.uid, data: freshEmailData });
                            // 🚀 FIX: Pass them the data locally so the router doesn't drop them into the UNAUTHORIZED bucket
                            activeData = freshEmailData; 
                        }
                    } else {
                        // 🛡️ STRIP CORRUPTION: Ensure Fleet Roster didn't accidentally save the Boss's vehicle
                        if (freshEmailData.agentId === 'ADMIN' || freshEmailData.agentId === 'ADMIN_VEHICLE') {
                            freshEmailData.agentId = null; 
                        }
                        
                        activeData = { ...activeData, ...freshEmailData };
                        setDoc(uidRef, { ...activeData, uid: currentUser.uid, updatedAt: serverTimestamp() }, { merge: true });
                    }
                }

                if (activeData) {
                    // 🚨 KILL SWITCH: Instantly reject suspended Tenants & Salesmen
                    if (activeData.subscriptionStatus === 'SUSPENDED' || activeData.status === 'SUSPENDED') {
                        notify("ACCOUNT SUSPENDED: Subscription inactive. Please contact KPM System Administration.");
                        signOut(auth);
                        setUser(null);
                        return;
                    }
                    // Locked by a T1/T2 on Fleet & Roster (lost or hacked phone) - no way in until they unlock it
                    if (activeData.locked === true) {
                        notify(LOCKED_MSG);
                        signOut(auth);
                        setUser(null);
                        return;
                    }

                    if (activeData.role === 'COMPANY_OWNER') {
                        // 🚨 THIS IS THE BOSS: They MUST be ADMIN
                        setBossUid(null);
                        setProfileName(activeData.name || activeData.agentName || null);
                        setUserRole('ADMIN'); 
                        setAgentProfileId(null);
                        setUser(currentUser);
                        setIsAdmin(false); 
                    } 
                    else {
                        // 🛡️ HARD BLOCK: Absolute Ghost Killer
                        let trueBossUid = activeData.bossUid || activeData.adminUid || activeData.masterUid;
                        let trueAgentId = activeData.agentId;
                        let finalName = activeData.name || activeData.agentName;
                        let finalUserRole = activeData.userRole || activeData.role || 'AGENT';
                        
                        if (trueAgentId === 'ADMIN' || trueAgentId === 'ADMIN_VEHICLE') {
                            console.warn("Corruption blocked: Stripping Admin Vehicle from Tier 4 account.");
                            trueAgentId = null; 
                            if (uidSnap.exists()) updateDoc(uidRef, { agentId: null }).catch(e => console.error(e));
                        }

                        // 🚀 THE MASTER VAULT FETCH: Live Profile Sync & Ghost Killer 🚀
                        if (trueBossUid) {
                            try {
                                let isValidEmployee = false;
                                
                                if (trueAgentId) {
                                    const liveProfileRef = doc(db, `artifacts/${appId}/users/${trueBossUid}/motorists`, trueAgentId);
                                    const liveProfileSnap = await getDocOfflineSafe(liveProfileRef);
                                    
                                    if (liveProfileSnap.exists()) {
                                        isValidEmployee = true;
                                        const liveData = liveProfileSnap.data();
                                        finalName = liveData.name || liveData.agentName || finalName;
                                        finalUserRole = liveData.userRole || liveData.role || finalUserRole; 
                                        activeData.location = liveData.location || activeData.location;
                                        
                                        if (liveData.status === 'SUSPENDED') {
                                            notify("ACCOUNT SUSPENDED: Profile inactive. Please contact KPM System Administration.");
                                            signOut(auth);
                                            setUser(null);
                                            return;
                                        }
                                    }
                                }

                                if (!isValidEmployee) {
                                    // 🚨 THE GHOST KILLER: Admin deleted the profile, but Auth ticket remains.
                                    console.warn("Ghost Account Detected! Eradicating global auth tickets...");
                                    await deleteDoc(uidRef);
                                    await deleteDoc(emailRef);
                                    notify("AUTHORIZATION REVOKED: Your KPM profile was deleted by the Administrator.");
                                    signOut(auth);
                                    setUser(null);
                                    return;
                                }
                            } catch (error) { console.warn("Live profile sync failed."); }
                        }

                        setBossUid(trueBossUid);
                        setProfileName(finalName || null);
                        setUserRole(finalUserRole); 
                        setAgentProfileId(trueAgentId);

                        const hijackedUser = {
                            uid: trueBossUid || currentUser.uid, // 🚨 CRITICAL: Forces connection to the Master Vault
                            email: currentUser.email,
                            displayName: finalName || currentUser.displayName || currentUser.email?.split('@')[0] || "Field Agent",
                            photoURL: currentUser.photoURL,
                            realUid: currentUser.uid,     
                            role: activeData.role,             
                            userRole: finalUserRole, // 🚀 Now uses the LIVE upgraded Tier!
                            agentId: trueAgentId,
                            location: activeData.location || "" 
                        };
                        
                        setUser(hijackedUser);
                        setIsAdmin(false); 
                        
                        // 🚀 DYNAMIC ROUTING: If upgraded to Tier 2 (ADMIN), send them to Dashboard!
                        if (finalUserRole === 'ADMIN' || finalUserRole === 'AREA_ADMIN') {
                            setActiveTab('dashboard');
                        } else {
                            setActiveTab('journey'); 
                        }
                    }
                } else if (!absentForSure(uidSnap) || !absentForSure(emailSnap)) {
                    /* 🔴 BOTH LOOKUPS CAME BACK EMPTY, BUT AT LEAST ONE OF THEM CAME OUT OF THE LOCAL
                       CACHE — so the server never actually said no. See `absentForSure` in helpers.js
                       for the whole argument. This is the twenty seconds of ACCESS DENIED Aldi hit on
                       his phone twice on 2026-09-01, on an account that was fine both times.

                       It lands on the same honest screen the offline case already had: it says we
                       could not check, and it offers Retry. The hard lockout below is untouched and
                       still fires the moment the server itself returns nothing. */
                    setIsSystemOwner(false);
                    setBossUid(null);
                    setUserRole('OFFLINE_UNVERIFIED');
                    setAgentProfileId(null);
                    setUser(currentUser);
                    setIsAdmin(false);
                } else {
                    // 🚨 UNKNOWN LOGINS ARE LOCKED OUT 🚨
                    setBossUid(null);
                    setUserRole('UNAUTHORIZED');
                    setAgentProfileId(null);
                    setUser(currentUser);
                    setIsAdmin(false);
                }



            } catch (error) {
                console.error("Traffic Cop Error:", error);

                // 🚀 OFFLINE GOD MODE: If the DB crashes due to no internet, let VIPs in anyway
                if (isDeveloper) {
                    setIsSystemOwner(true);
                    setBossUid(null);
                    setUserRole('ADMIN');
                    setAgentProfileId(null);
                    setUser(currentUser);
                    setIsAdmin(false);
                    setShowAdminLogin(true);
                    return;
                }

                // 🚀 THE FIX: This used to fall straight through to the same hard
                // "Access Denied" lockout as a genuinely unregistered email — for EVERY
                // tier except the VIP bypass above. But getDocOfflineSafe() already tried
                // the local cache before throwing, so landing here means either (a) this
                // device is genuinely offline with nothing cached for this account yet
                // (e.g. it has never been online with this account before), or (b) some
                // other real error occurred while offline. Either way, this is "I
                // couldn't check" — not "the server confirmed you're not an employee" —
                // so it gets its own honest state instead of Access Denied. A real
                // negative result (the `else` branch above, only reached once the
                // lookups actually resolved one way or the other) is untouched.
                if (!navigator.onLine || error.code === 'offline-no-cache' || error.code === 'unavailable') {
                    console.warn("Offline with no local cache to fall back on — can't verify this account on this device yet.");
                    setIsSystemOwner(false);
                    setBossUid(null);
                    setUserRole('OFFLINE_UNVERIFIED');
                    setAgentProfileId(null);
                    setUser(currentUser);
                    setIsAdmin(false);
                    return;
                }

                // 🚨 SECURE FALLBACK ON ERROR 🚨
                setUserRole('UNAUTHORIZED');
                setUser(currentUser);
            } finally {
                setCheckingEmail(null);   // every exit above — return, verdict or error — takes the CHECKING panel down
            }
        } else {
            setUser(null);
            setIsSystemOwner(false);
            setUserRole('UNAUTHORIZED'); // 🚨 CLEAR ROLE ON LOGOUT
            setCheckingEmail(null);
            setAppUnlocked(false);       // the next person to sign in on this tab starts locked
        }
    });
    
    return () => unsubAuth();
  }, []);

  /* THE 5-MINUTE GRACE PERIOD. His words: "it is annoying when i have to always enter my
     password everytime i use my phone because i will enter another app each time i send a pic",
     and then "5 minutes is the best one, should reset when i interact with the app tho".

     ONE effect covers every way the vault opens and closes, which is why it is written against
     `isAdmin` rather than at the eight setIsAdmin() call sites. The restore is attempted exactly
     ONCE per page load — that ref is load-bearing. Without it, locking the vault by hand would
     set isAdmin false, this effect would find the grace record still valid, and re-open the door
     he just closed. After that single attempt, isAdmin going false always clears the record. */
  /* 🔴 THE GRACE PERIOD RESTORED `isAdmin` BEHIND A GATE IT NEVER CLOSED, so it has never once
     worked for him. His report, 2026-08-15: *"i just close the safari and it force me to login"*.
     The system-owner branch of the auth handler sets `setShowAdminLogin(true)` on EVERY cold load
     (App.jsx ~2155) and returns, and the app itself only renders under `!showAdminLogin`. So the
     restore below was setting isAdmin true underneath a modal that only `handleAdminAuthSuccess`
     knew how to close — the door was unlocked and the curtain was still down.
     ⚠️ The gate has TWO pieces of state and both have to move together. Anything that opens the
     vault must do what `handleAdminAuthSuccess` does: raise isAdmin AND drop showAdminLogin.

     The one-shot ref is gone with it. It existed so that locking the vault by hand could not be
     instantly undone by this effect — but that is the RECORD's job, so `handleAdminLogout` clears
     it now and `readGrace` answers false straight after. A ref could not tell a deliberate lock
     apart from the auth handler re-asserting `setIsAdmin(false)`, which it does on every load and
     may do twice, and on that second assert the old code ran `clearGrace()` and destroyed a valid
     record. Clearing on the deliberate lock is the only place that knows what it means. */
  /* 🔴 THE GRACE RECORD WAS KEYED ON THE BOSS'S UID, SO IT UNLOCKED THE VAULT FOR EVERYBODY.
     Aldi found it, 2026-09-07: a Tier 4 regional admin in MUNTILAN was seeing hand-offs for
     HEADQUARTERS — *"the other T4 account located in different area also receive the approval
     request that is not on their regional area"*. His screenshot says the rest: that account's
     header read GLOBAL RECEIVABLES with an ALL REGIONS filter, and only `isAdmin` draws that.

     `user.uid` is HIJACKED. Sign-in rewrites it to `trueBossUid` on purpose, so every Firestore
     read lands in the owner's tenancy; the person's own id is kept beside it as `realUid`. This
     effect read `user.uid`, so the grace record Aldi wrote when HE unlocked the vault was found
     again by the next person to sign in on the same browser — and restored `isAdmin` to them.
     Not a hand-off bug at all: a T4 became a global admin, with every store and every approval.

     Two guards, because either alone leaves a hole. The key is now the REAL uid, so one person's
     unlock cannot answer for another's session. And a hijacked agent session never restores the
     vault at all, however the record got there — an agent has no business holding the owner's
     unlock, and the PIN is the only door in. Aldi's own session is untouched: the owner is not
     hijacked, so `realUid` is undefined and the key is the same value it always was. */
  useEffect(() => {
    const realUid = user?.realUid || user?.uid;
    if (!realUid) return;
    /* T3-T6 (2026-10-01): their own pass, keyed by their own uid, re-opens only their own app - never the vault.
       It is written only after a real unlock (appUnlocked) and cleared by every logout. */
    if (!holdsVault) {
      if (appUnlocked) touchGrace(realUid);
      else if (readGrace(realUid)) setAppUnlocked(true);
      return;
    }
    if (user?.realUid && user.realUid !== user.uid) return;
    if (isAdmin) { touchGrace(realUid); return; }
    if (readGrace(realUid)) { setIsAdmin(true); setShowAdminLogin(false); }
  }, [isAdmin, user, showAdminLogin, holdsVault, appUnlocked]);

  /* "should reset when i interact with the app" — the window measures from his last touch, not
     from the unlock. Throttled to one write per 20s: localStorage.setItem is synchronous, and
     writing it on every tap would sit on the main thread during a scroll. */
  useEffect(() => {
    // Same key as the restore above — the person's own id, never the hijacked boss uid.
    const uid = user?.realUid || user?.uid;
    if (!(isAdmin || appUnlocked) || !uid) return;
    let lastWrite = 0;
    const bump = () => {
      const now = Date.now();
      if (now - lastWrite < 20000) return;
      lastWrite = now;
      touchGrace(uid);
    };
    window.addEventListener('pointerdown', bump, true);
    window.addEventListener('keydown', bump, true);
    return () => {
      window.removeEventListener('pointerdown', bump, true);
      window.removeEventListener('keydown', bump, true);
    };
  }, [isAdmin, appUnlocked, user]);

  const handleAdminAuthSuccess = () => {
    setIsAdmin(true);
    setShowAdminLogin(false);
    triggerCapy("Access Granted. Welcome back, Boss.");
  };

  /* clearGrace() here is what makes the restore effect safe to run on every render instead of
     once per load: locking the vault by hand is the ONE `setIsAdmin(false)` that means "I want it
     locked". The seven others are the auth handler describing a cold load, and must not count. */
  const handleAdminLogout = () => {
    clearGrace();
    setIsAdmin(false);
    triggerCapy("Admin session ended.");
  };

 

  /* 🔴 LIGHT MODE HAD NEVER ONCE BEEN TURNED ON. Found 2026-08-15.
     This effect used to ADD `dark` and, for light, only REMOVE it — it never set `light`. But
     theme.css puts the DARK values on bare `:root` and the light values on `:root.light`, so
     removing `dark` left every token still holding its dark value. Turning the switch off gave a
     hybrid nobody designed: Tailwind's handful of `dark:` variants flipped to their light form
     while every surface, line and ink stayed dark.
     ⚠️ BOTH CLASSES ARE SET EXPLICITLY, EVERY TIME. `toggle(name, force)` is what makes that hard
     to get wrong again — the old shape was correct for whichever theme the author was looking at
     and silently wrong for the other one. */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
    root.classList.toggle('light', !darkMode);
    localStorage.setItem('kpm_theme', darkMode ? 'dark' : 'light');
    // the browser's own chrome — the address bar on his phone — is part of the theme too
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', darkMode ? '#1a1815' : '#B4B0A9');
  }, [darkMode]);

  // 🚀 LITE MODE GOVERNOR: Attaches the global restrictor to the HTML root
  useEffect(() => {
    if (isLiteMode) {
        document.documentElement.classList.add('lite-mode');
        localStorage.setItem('kpm_lite_mode', 'true');
    } else {
        document.documentElement.classList.remove('lite-mode');
        localStorage.setItem('kpm_lite_mode', 'false');
    }
  }, [isLiteMode]);

 const handleLogin = async () => {
        setLoginError(null); 
        try {
            // 🚀 FORCE GOOGLE ACCOUNT CHOOSER
            googleProvider.setCustomParameters({ prompt: 'select_account' });

            /* PHONES SIGN IN IN THE SAME TAB (2026-10-01, his Samsung). The popup is a second tab on a phone, and
               it loses its link back: "it redirect me to gmail" (the Gmail app opened), refreshing it gave Firebase's
               "missing initial state", and when it did finish, "the kpm app will be open on the second app and
               duplicate the tab". A full-page redirect has no second tab. It is only safe where /__/auth is proxied
               to our own address (firebase.js PROXIED_AUTH_HOSTS) - anywhere else the handshake is cross-site and
               Brave/Safari break it - so LAN IPs, previews and the PC keep the popup. Still no await before it. */
            if (auth.app?.options?.authDomain === window.location.host && window.matchMedia?.('(pointer: coarse)').matches) {
                await signInWithRedirect(auth, googleProvider);
                return;
            }

            // 🚨 CRITICAL MOBILE FIX: 
            // We MUST NOT put any 'await' commands before opening the popup.
            // Mobile browsers strictly require popups to open in the EXACT same 
            // split-second microtask as the user's physical tap. 
            await signInWithPopup(auth, googleProvider);
            /* No setUser here. The auth listener sets the user AND says CHECKING in the same
               breath; setting the user from this spot painted it next to the sign-out's stale
               UNAUTHORIZED role — the red Access Denied he saw on a new phone (2026-09-16). */
        } catch (error) {
            console.error("Login Error:", error);
            
            /* Fall back to a full-page redirect whenever the POPUP is what failed, not only when
               the browser admitted to blocking it. Aldi could not sign in on his phone; mobile
               Chrome and Safari refuse popups under several different codes, and only
               'popup-blocked' was handled — every other one dead-ended on a red error toast with
               no second way in. A redirect works in all of them.
               'popup-closed-by-user' is in this list deliberately: on mobile the popup is often
               closed by the browser itself, not by him, and offering the redirect costs a person
               who really did cancel one extra tap. */
            const POPUP_FAILED = [
                'auth/popup-blocked',
                'auth/popup-closed-by-user',
                'auth/cancelled-popup-request',
                'auth/operation-not-supported-in-this-environment',
                'auth/web-storage-unsupported',
            ];
            if (POPUP_FAILED.includes(error.code)) {
                signInWithRedirect(auth, googleProvider);
            } else {
                notify(`Login Failed: ${error.message}`); 
                setLoginError(`Error: ${error.code} - ${error.message}`);
            }
        }
    };

  /* clearGrace() here and not only in the effect: signing out drops `user` in the same tick, and
     the effect returns early with no uid to check — so the grace record would outlive the account
     that made it and hand the next sign-in an admin session it never earned. */
  const handleLogout = async () => { clearGrace(); await signOut(auth); setUser(null); setInventory([]); setTransactions([]); setIsAdmin(false); };

  // --- ACTIONS ---
 
  // --- MODIFIED: SYSTEM LOG ENGINE (FIXED 4TH DOWNLOAD BUG) ---
  /* `fields`: plain values saved beside the sentence (a Visit Report's storeId / tag / agentId, for the Day Replay -
     src/utils/dayLog.js), so a reader never has to cut the sentence apart; the rules' audit create has no field list */
  const logAudit = async (action, details, includeSnapshot = false, fields = {}) => {
    if (!user) return;
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    try {
        // FIX: Only trigger the extra generic download if it is NOT the Master Protocol
        // This prevents the 4th file from appearing while still keeping the indicators GREEN.
        if (includeSnapshot && action !== "MASTER_BACKUP" && action !== "BACKUP_SINGLE") {
            handleBackupData(); 
            triggerCapy("System Save File Downloaded! 💾");
        }

        const logData = {
            ...fields,
            action,
            details,
            user: user.email,
            timestamp: serverTimestamp(),
            timeStr: now.toLocaleTimeString(),
            isSavePoint: includeSnapshot // This MUST remain true for the indicators to work
        };

        // Log to Firestore
        await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/audit_logs`), logData);
        await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/audit_vault/${dateKey}/logs`), logData);

    } catch (err) {
        console.error("Log Error:", err);
    }
  };
  
  /* Every mascot line goes through here, so the previous hide-timer is always cancelled and
     each message gets its own full 5 seconds (8 until his 2026-10-02 "maybe around 5 seconds is
     enough" - the same as a top strip). See capyTimerRef for what happened without it. */
  const speakCapy = (message) => {
    setCapyMsg(message);
    setShowCapyMsg(true);
    clearTimeout(capyTimerRef.current);
    capyTimerRef.current = setTimeout(() => setShowCapyMsg(false), 5000);
  };

  const cycleMascotMessage = () => {
    // Uses the latest activeMessages list to cycle dialogue
    const nextIndex = (msgIndex + 1) % activeMessages.length;
    setMsgIndex(nextIndex);
    speakCapy(activeMessages[nextIndex]);
  };

  /* Re-usable function to pop up the mascot with a custom message.

     68 places in this file report through here and nowhere else, and some of them are failures:
     "❌ Sync Failed! Retrying later.", "Mirror failed. Check console.", "❌ Gagal menghitung
     ulang karir". The mascot holds a line for 8 seconds, can be walked over by the next one, and
     is suppressed entirely while the sales terminal owns the corner — so those were announced by
     the one thing in the app that is allowed to be missed. Aldi marked exactly that BROKEN.

     Then both spoke a failure at once - the capybara AND the strip, the same words twice. His
     pick A, 2026-10-02: *"warnings and failures only in the top panel"*, the capybara keeps
     everything else. So a recognised failure goes to the strip ALONE (notify records it in the
     bell's Missed list); any other line is the capybara's, and is recorded here. */
  const triggerCapy = (msg) => {
    const text = msg || "Hello!";
    if (isFailure(text)) return notify(text);
    speakCapy(text);
    // T6: the mascot was mute outside the sales terminal. unlockSounds() is a no-op once unlocked.
    unlockSounds().then(() => speakMumble(text)).catch(() => {});
    recordMissed(text, false);
  };
  
  const handleAddMascotMessage = async () => {
      if(!newMascotMessage.trim() || !user) return;
      const currentMessages = appSettings.mascotMessages || [];
      const updatedMessages = [...currentMessages, newMascotMessage.trim()];
      await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { mascotMessages: updatedMessages }, {merge: true});
      setNewMascotMessage("");
      triggerCapy("New dialogue added!");
  };

  const handleDeleteMascotMessage = async (msgToDelete) => {
      if(!user) return;
      const currentMessages = appSettings.mascotMessages || [];
      const updatedMessages = currentMessages.filter(m => m !== msgToDelete);
      await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { mascotMessages: updatedMessages }, {merge: true});
      triggerCapy("Dialogue removed.");
  };

// --- NEW: SAVE EDITED MASCOT MESSAGE ---
  const handleSaveEditedMessage = async (index) => {
      if (!user || !editMsgText.trim()) return;
      
      // 1. Get current list (or use defaults if this is the first customization)
      let currentList = appSettings?.mascotMessages;
      if (!currentList || currentList.length === 0) {
          currentList = [...defaultMessages];
      }
      
      // 2. Create a copy and update the specific item
      const updatedList = [...currentList];
      updatedList[index] = editMsgText.trim();
      
      // 3. Save to Firestore
      await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { mascotMessages: updatedList }, {merge: true});
      
      // 4. Reset UI
      setEditingMsgIndex(-1);
      setEditMsgText("");
      triggerCapy("Dialogue updated!");
  };
  // --- NEW: DELETE SINGLE TRANSACTION ---
  /* ═══════════ TAKING A SALE BACK OUT OF THE RUNNING TOTALS ═══════════
     The counter is the easy half of a stored rollup. THE DRIFT IS THE JOB: every path that
     removes or rewrites a sale has to apply the exact negative of what the sale applied, or the
     per-product totals rot with nothing on screen to say so. There are three such paths and they
     all route through this one function, because three hand-written negatives is three chances to
     get a sign backwards.

     A deletion that cannot be tallied (not a SALE, no date, no lines) returns null and is simply
     skipped — the same rule the positive side follows, so the two can never disagree about which
     transactions count.

     ⚠️ AND IF THIS EVER DOES DRIFT, IT IS REPAIRABLE. `transactions` remains the only record of
     what happened; Settings carries a rebuild that recomputes every month from scratch. That is
     what makes a cache safe to keep. */
  const untallyOps = (txs) => (txs || [])
      .map(t => tallySaleOp(db, appId, userId,
          t, Object.fromEntries((inventory || []).map(p => [p.id, p])), -1))
      .filter(Boolean);

  /* ═══════════ REBUILDING THE SALES TOTALS FROM THE TRANSACTIONS ═══════════
     Two jobs in one button, and the second is why it is not optional.

     1. BACKFILL. The running tally only counts sales made after it shipped, so every month before
        that is empty. This walks the real transactions and writes the months they imply.
     2. REPAIR. If a counter ever drifts - a sign the wrong way round, a path that forgets to
        un-tally - this makes the drift a nuisance rather than a loss. It is the property that
        lets `sales_stats` be treated as a cache: `transactions` is the truth, and the truth can
        always be replayed.

     ⚠️ IT REPLACES, IT DOES NOT INCREMENT. Every month it touches is written whole with `set` and
     no merge, because a rebuild that added to what was already there would double every figure it
     was called on to fix - which is the exact opposite of a repair.

     ⚠️ AND IT READS THE WHOLE HISTORY ONCE, which is the expensive query this feature exists to
     avoid on every screen open. That is the right trade: pay it deliberately, on a button, rather
     than accidentally, on every visit. He is told how many documents it read. */
  const [isRebuildingStats, setIsRebuildingStats] = useState(false);
  const handleRebuildSalesStats = async () => {
      if (!user || !isAdmin) return notify("Owner access is required to rebuild the sales totals.");
      if (!await confirmAction(
          "Rebuild every monthly sales total from the transaction history?\n\n" +
          "This reads the whole transaction history once, which costs a large number of Firestore " +
          "reads. Nothing is deleted: the totals are recalculated from the receipts, which stay " +
          "exactly as they are.")) return;
      setIsRebuildingStats(true);
      try {
          const far = new Date(2000, 0, 1);
          const all = await fetchHistoricalTransactions(far, new Date());
          const productsById = Object.fromEntries((inventory || []).map(p => [p.id, p]));
          const months = rebuildMonths(all, productsById);
          const ops = months.map(m => ({
              type: 'set',
              /* through the shared path helper, never a hand-written string: two spellings of one
                 collection is how a rebuild quietly repairs a document nothing else reads. */
              ref: doc(db, statsPath(appId, userId, m.month)),
              data: { month: m.month, byProduct: m.byProduct, byDay: m.byDay, rebuiltAt: serverTimestamp() },
          }));
          await commitInChunks(db, writeBatch, ops);
          logAudit("SALES_STATS_REBUILD", `Rebuilt ${months.length} month(s) from ${all.length} transactions`);
          triggerCapy(`Sales totals rebuilt: ${months.length} month(s) from ${all.length} transactions.`);
      } catch (err) {
          notify(`Rebuild failed: ${err.message}`);
      } finally {
          setIsRebuildingStats(false);
      }
  };

  const handleDeleteSingleTransaction = async (transaction) => {
      if(!await confirmAction("Delete this specific transaction record? Stock will NOT be restored automatically (manual adjustment required if needed).")) return;
      try {
          /* The receipt and its tally go together. `commitInChunks` rather than a bare
             deleteDoc so both land in one commit — a delete that succeeded while its tally failed
             would leave the totals counting a sale nobody can see any more. */
          await commitInChunks(db, writeBatch, [
              { type: 'delete', ref: doc(db, `artifacts/${appId}/users/${userId}/transactions`, transaction.id) },
              ...untallyOps([transaction]),
          ]);
          logAudit("TRANS_DELETE", `Deleted transaction ${transaction.id} for ${transaction.customerName}`);
          triggerCapy("Transaction record removed.");
      } catch(err) {
          notify(err.message);
      }
  };

  const handleDeleteConsignmentData = async (customerName) => {
      const targets = transactions.filter(t => (t.customerName||'').trim() === customerName && (t.type.includes('CONSIGNMENT') || (t.type === 'SALE' && t.paymentType === 'Titip') || t.type === 'RETURN'));
      // 🤝 VIEW-ONLY ON INHERITED HISTORY. A store that was handed over keeps the sales the
      // previous agent made: the new holder may see them and collect on them, but may not erase
      // them - and neither may the seller erase what the new holder has added since. Refused HERE,
      // before the confirm and before any batch, because hiding the button would leave this handler
      // callable (the "UI Says Yes, Server Says No" shape in the vault). The matching Firestore
      // rule is drafted in firestore.rules; the check has to hold on its own until that deploys.
      if (!isAdmin) {
          const notMine = targets.filter(t => (t.agentId || 'ADMIN') !== agentProfileId);
          if (notMine.length) return notify(`${notMine.length} of these ${targets.length} records were made by another agent. You can still collect on them, but only the agent who made them can change them.`);
      }
      if(!await confirmAction(`Delete ALL history for ${customerName}?`)) return;
      try {
          // 🚀 FIX: Chunked/paced commitInChunks instead of one deleteDoc await per
          // record — same pattern as its sibling handleDeleteHistory right above.
          const operations = targets.map(t => ({ type: 'delete', ref: doc(db, `artifacts/${appId}/users/${userId}/transactions`, t.id) }));
          operations.push(...untallyOps(targets));
          await commitInChunks(db, writeBatch, operations);
          logAudit("CONSIGN_DELETE", `Cleared data for ${customerName}`);
      } catch(err) { console.error(err); }
  };
  const handleDeleteHistory = async (customerName, agentName) => { 
      if(!await confirmAction(`Permanently delete ALL transaction history for "${customerName}" handled by ${agentName}?`)) return; 
      try { 
          const targets = transactions.filter(t => {
              let cust = (t.customerName || 'Walk-in Customer').trim();
              const isWalkIn = cust.toLowerCase().includes('walk-in') || !t.customerName;
              const isEcer = t.items?.some(i => i.priceTier === 'Ecer');
              if (isWalkIn || isEcer) cust = "Individuals (Ecer)";

              return cust === customerName && (t.agentName || 'Admin') === agentName;
          });
          // 🚀 FIX: Chunked/paced commitInChunks instead of one deleteDoc await per record —
          // same pattern used elsewhere for large writes, here bounded by a single customer's
          // history rather than company-wide, but still worth it as that history grows.
          const operations = targets.map(t => ({ type: 'delete', ref: doc(db, `artifacts/${appId}/users/${userId}/transactions`, t.id) }));
          operations.push(...untallyOps(targets));
          await commitInChunks(db, writeBatch, operations);
          await logAudit("HISTORY_DELETE", `Deleted history folder for ${customerName} (${agentName})`);
          triggerCapy(`Deleted ${targets.length} records`); 
      } catch (err) { console.error(err); notify("Error deleting history."); } 
  };

 
// --- ENTERPRISE PIPELINE: STORAGE BUCKET REROUTE ---
  const handleCropConfirm = async (base64) => { 
      if (!activeCropContext) return; 
      
      const collPath = `artifacts/${appId}/users/${user.uid}/settings/general`;
      let finalImageUrl = base64; // Fallback just in case

      // 🚀 THE STORAGE PIPELINE: Push to Cloud Bucket before saving to Database
      // (skipped entirely when usePhotoStorage is off — same branch as StockOpnameView/
      // RestockVaultView/BranchWarehouseManager, so it never hangs waiting on unprovisioned Storage)
      if (user && base64.startsWith('data:image')) {
          try {
              if (appSettings?.usePhotoStorage) triggerCapy("Uploading optimized asset to Cloud Storage... ⏳");
              const storagePath = `artifacts/${appId}/users/${user.uid}/images/${activeCropContext.type}_${Date.now()}.png`;
              finalImageUrl = await savePhotoAndGetReference(storage, base64, storagePath, appSettings?.usePhotoStorage);
          } catch (uploadErr) {
              console.error("Storage Pipeline Error:", uploadErr);
              triggerCapy("Upload failed, reverting to local cache.");
          }
      }

      // Now we route the tiny finalImageUrl into your database instead of the massive Base64 string
      /* ⚠️ THE FIELD IS `receiptWatermark` NOW, NOT `mascotImage`. His instruction, 2026-08-15:
         *"change the picture into watermarks"* — and the reason he gave the turn before is the
         one that matters: *"the picture is following the mascot image"*. It was ONE picture doing
         two unrelated jobs. Uploading it replaced the animated capybara with a still photo, and
         it was also the only candidate for the nota's mark, so the printed business document
         moved whenever he changed the mascot's face.
         They are separate now: this picture is the RECEIPT WATERMARK and nothing else, and the
         mascot always draws its own sprite. The crop context keeps the name 'mascot' because it
         is the same crop pipeline and renaming it would touch three files for nothing.
         `mascotImage` is still READ once, as a fallback in SettingsView, so a picture he uploaded
         before today becomes his watermark instead of silently disappearing. */
      if (activeCropContext.type === 'mascot') {
          setAppSettings(prev => ({ ...prev, receiptWatermark: finalImageUrl }));
          if(user) setDoc(doc(db, collPath), { receiptWatermark: finalImageUrl }, {merge: true});
          triggerCapy("Receipt watermark updated & secured! 🛡️");

      } else if (activeCropContext.type === 'product') { 
          setTempImages(prev => ({ ...prev, [activeCropContext.face]: finalImageUrl })); 
      
      } else if (activeCropContext.type === 'tier') {
          const idx = activeCropContext.index;
          const newTiers = [...tierSettings];
          newTiers[idx].value = finalImageUrl; 
          setTierSettings(newTiers);
          handleSaveTiers(newTiers);
          triggerCapy("Tier Icon Updated to Cloud!");

      } else if (activeCropContext.type === 'inventory_bg') {
          setAppSettings(prev => ({ ...prev, inventoryBg: finalImageUrl }));
          if(user) setDoc(doc(db, collPath), { inventoryBg: finalImageUrl }, {merge: true});
          triggerCapy("Inventory Backdrop Uploaded!");

      } else if (activeCropContext.type.startsWith('merchant_')) {
          const moodKey = activeCropContext.type.split('_')[1]; 
          const settingsKey = `merchant_${moodKey}`;
          
          setAppSettings(prev => ({ ...prev, [settingsKey]: finalImageUrl }));
          if(user) {
              setDoc(doc(db, collPath), { [settingsKey]: finalImageUrl }, {merge: true});
              logAudit("SETTINGS_UPDATE", `Updated Merchant ${moodKey} visual`);
          }
          triggerCapy(`Merchant ${moodKey} visual secured in cloud!`);
          
      } else if (activeCropContext.type === 'customer_staging') {
          setTempCustomerImage(finalImageUrl);
      }
      
      setCropImageSrc(null); 
      setActiveCropContext(null); 
  };
  // --- FILE HANDLERS ---
  function handleTierIconSelect(e, index) {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => {
              setCropImageSrc(reader.result);
              setActiveCropContext({ type: 'tier', index: index, face: 'front' });
              setBoxDimensions({ w: 100, h: 100, d: 0 }); 
          };
          reader.readAsDataURL(file);
      }
      e.target.value = null;
  }

  const handleMascotSelect = (e) => { 
      const file = e.target.files[0]; 
      if (file) { 
          const reader = new FileReader(); 
          reader.onload = () => { 
              setCropImageSrc(reader.result); 
              setActiveCropContext({ type: 'mascot', face: 'front' }); 
              setBoxDimensions({ w: 100, h: 100, d: 100 }); 
          }; 
          reader.readAsDataURL(file); 
      } 
      e.target.value = null; 
  };

  const handleProductFaceUpload = (e, face) => { 
      const file = e.target.files[0]; 
      if (file) { 
          const reader = new FileReader(); 
          reader.onload = () => { 
              setCropImageSrc(reader.result); 
              setActiveCropContext({ type: 'product', face }); 
          }; 
          reader.readAsDataURL(file); 
      } 
      e.target.value = null; 
  };

  const handleEditExisting = (face, imgSource) => { 
      setCropImageSrc(imgSource); 
      setActiveCropContext({ type: 'product', face }); 
  };

  const handleInventoryBgSelect = (e) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => {
              setCropImageSrc(reader.result);
              setActiveCropContext({ type: 'inventory_bg', face: 'front' });
              setBoxDimensions({ w: 160, h: 90, d: 0 }); 
          };
          reader.readAsDataURL(file);
      }
      e.target.value = null;
  };

  // --- SETTINGS ACTIONS ---
  const handleSaveCompanyProfile = () => { 
      if(user) { 
          setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { 
              companyName: editCompanyProfile.name,
              companyAddress: editCompanyProfile.address,
              companyPhone: editCompanyProfile.phone
          }, {merge: true}); 
          logAudit("SETTINGS_UPDATE", `Company Profile updated`); 
      } 
      triggerCapy("Company Profile updated! Ready for Surat Jalan. 🏢"); 
  };

  // --- PRODUCT MANAGEMENT ---
  const handleSaveProduct = async (e) => { 
      e.preventDefault(); 
      if (!user) return; 
      try { 
          const formData = new FormData(e.target); 
          const data = Object.fromEntries(formData.entries());
          // 🚀 ADDED 'sticksPerPack' TO THE NUMBER CONVERSION ARRAY
          const numFields = ['stock', 'minStock', 'sticksPerPack', 'priceDistributor', 'priceRetail', 'priceGrosir', 'priceEcer'];
          numFields.forEach(field => data[field] = Number(data[field]) || 0);

          /* Packing is deliberately NOT in numFields. That list coerces empty to 0, and a 0
             here is a multiplier — a Bal priced at 0 Bks would charge nothing and deduct
             nothing. Blank or nonsense falls back to the same defaults every read site in
             the app already assumes, so a half-filled form can never produce a free sale. */
          const packing = { packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4 };
          Object.entries(packing).forEach(([field, fallback]) => {
              const n = Number(data[field]);
              data[field] = (Number.isFinite(n) && n > 0) ? n : fallback;
          });
          
          data.images = { ...(editingProduct?.images || {}), ...tempImages }; 
          data.dimensions = { ...boxDimensions }; 
          data.useFrontForBack = useFrontForBack; 
          data.updatedAt = serverTimestamp(); 
          
          const isEdit = Boolean(editingProduct?.id);
          if (!isEdit) data.createdAt = serverTimestamp();
          const write = isEdit
              ? updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, editingProduct.id), data)
              : addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/products`), data);

          /* Firestore settles this promise only when the SERVER acknowledges the write. With
             the network down it never settles AT ALL — it does not resolve and it does not
             reject. Awaiting it meant that offline, nothing below here ever ran: the panel
             never closed, no message ever appeared, and the catch never fired either. Pressing
             Update Database did nothing, visibly and silently, which is exactly what Aldi
             reported testing this. The write itself was never in danger — Firestore had already
             put it in the local cache and replays it on reconnect — so the only thing broken
             was his ability to find that out.

             So: wait a moment for an acknowledgement, then report whichever happened. A late
             failure still reports, because the catch below stays attached to the same promise.
             ponytail: fixed 1.5s ack window; make it adaptive only if a slow connection starts
             reporting "not sent" for writes that did land. */
          const acked = await Promise.race([
              write.then(() => true, () => true),   // settled either way — the catch below reports a rejection
              new Promise(resolve => setTimeout(() => resolve(false), 1500)),
          ]);
          write.catch(err => notify(`"${data.name}" was NOT saved. ${err.message}`));

          /* Not awaited: the audit trail is a record of the save, never a gate on it. Awaited,
             it hangs offline for exactly the same reason the write above did. */
          Promise.resolve(logAudit(isEdit ? "PRODUCT_UPDATE" : "PRODUCT_ADD",
              `${isEdit ? 'Updated' : 'Added'} product: ${data.name}`)).catch(() => {});

          /* Report the packing that was actually written, not just "saved". A wrong multiplier
             is invisible downstream — it produces a plausible total and a plausible receipt —
             so the one moment it can be caught is here. Stock is named too: Aldi edited stock,
             read a message about packing, and reasonably read that as the app confirming the
             wrong thing. */
          const perBal = data.slopsPerBal * data.packsPerSlop;
          notify(acked
              ? `${data.name} saved.\nStock ${data.stock} Bks · 1 Karton = ${data.balsPerCarton * perBal} Bks · 1 Bal = ${perBal} Bks.`
              : `${data.name} is on this device only — it has NOT reached the server yet, and will sync when the connection returns.\nStock ${data.stock} Bks · 1 Karton = ${data.balsPerCarton * perBal} Bks · 1 Bal = ${perBal} Bks.`);

          setEditingProduct(null);
          setTempImages({});
          setUseFrontForBack(false);
      } catch (err) {
          console.error(err);
          notify(`Could not save this product. ${err.message || err}`);
      }
  };

  const handleUpdateProduct = async (updatedProduct) => { 
      setInventory(prev => prev.map(item => item.id === updatedProduct.id ? updatedProduct : item)); 
      if (editingProduct && editingProduct.id === updatedProduct.id) { 
          setEditingProduct(updatedProduct); 
      } 
      if(isAdmin && user && updatedProduct.id) { 
          try { 
              await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, updatedProduct.id), { dimensions: updatedProduct.dimensions });
          } catch(e) {
              // A write, so it reports. The form already shows the new dimensions.
              console.error(e);
              notify("Could not save the product dimensions. The rest of the product was saved.");
          }
      } 
  };

  const deleteProduct = async (id) => { 
      if (await confirmAction("Are you sure you want to delete this product?")) { 
          try { 
              await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, id)); 
              await logAudit("PRODUCT_DELETE", `Deleted product ID: ${id}`); 
              triggerCapy("Item removed."); 
          } catch (err) { 
              triggerCapy("Delete failed"); 
          } 
      } 
  };

  // --- STOCK OPNAME ---
  const handleOpnameChange = (id, val) => { setOpnameData(prev => ({ ...prev, [id]: val })); };
  
  const handleOpnameSubmit = async () => { 
      if (!user) return; 
      const updates = []; 
      inventory.forEach(item => { 
          const actual = opnameData[item.id]; 
          if (actual !== undefined && actual !== item.stock && !isNaN(actual)) { 
              updates.push({ id: item.id, name: item.name, old: item.stock, new: actual }); 
          } 
      }); 
      if (updates.length === 0) { triggerCapy("No changes to save!"); return; } 
      if (!await confirmAction(`Confirm stock adjustment for ${updates.length} items?`)) return; 
      try { 
          await runTransaction(db, async (transaction) => { 
              updates.forEach(update => { 
                  const ref = doc(db, `artifacts/${appId}/users/${user.uid}/products`, update.id); 
                  transaction.update(ref, { stock: update.new }); 
              }); 
          }); 
          updates.forEach(u => { logAudit("STOCK_OPNAME", `Adjusted ${u.name}: ${u.old} -> ${u.new}`); }); 
          setOpnameData({}); 
          triggerCapy("Stock Opname saved successfully!"); 
      } catch (err) { 
          console.error(err); 
          notify("Failed to update stock: " + err.message); 
      } 
  };

  // --- CART & SALES LOGIC ---
  const addToCart = (product) => { 
      setCart(prev => { 
          const existing = prev.find(item => item.productId === product.id); 
          if (existing) return prev.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item); 
          return [...prev, { productId: product.id, name: product.name, qty: 1, unit: 'Bks', priceTier: 'Retail', calculatedPrice: product.priceRetail, product }]; 
      }); 
  };

  const updateCartItem = (productId, field, value) => { 
      setCart(prev => prev.map(item => { 
          if (item.productId === productId) { 
              const newItem = { ...item, [field]: value }; 
              const { unit, priceTier: tier, product: prod } = newItem; 
              let base = 0; 
              if (tier === 'Ecer') base = prod.priceEcer || 0; 
              if (tier === 'Retail') base = prod.priceRetail || 0; 
              if (tier === 'Grosir') base = prod.priceGrosir || 0; 
              if (tier === 'Distributor') base = prod.priceDistributor || 0;
              
              let mult = 1; 
              if (unit === 'Slop') mult = prod.packsPerSlop || 10; 
              if (unit === 'Bal') mult = (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10); 
              if (unit === 'Karton') mult = (prod.balsPerCarton || 4) * (prod.slopsPerBal || 20) * (prod.packsPerSlop || 10); 
              
              newItem.calculatedPrice = base * mult; 
              return newItem; 
          } 
          return item; 
      })); 
  };

  const removeFromCart = (pid) => setCart(p => p.filter(i => i.productId !== pid));

  /* 🚀 DISPLAY COPY, never the stored one. The sale engine used to weld the price tier onto a
     store's name, so older customer documents literally say "Warung Bu Sari (Retail)". Every
     comparison in the app already ignores that suffix (storeKey); this is what stops him from
     READING it. Nothing is written — `customers` itself stays exactly as Firestore sent it,
     which is what the backup export at exportData.customers depends on: a restore writes that
     array straight back with set(), so a display name reaching it would rename every shop for
     real. The customer directory (CustomerManager) also keeps the raw list on purpose — it is
     the one screen that writes customer documents in bulk. */
  const displayCustomers = React.useMemo(
      () => (customers || []).map(c => ({ ...c, name: storeLabel(c.name) })), [customers]);

  // --- CUSTOM HOOKS ---
  const { processTransaction, handleMerchantSale, handleConsignmentPayment, handleConsignmentReturn } = useTransactionEngine({
      db, appId, userId, userRole, agentProfileId, adminSalesMode,
      logAudit, triggerCapy, setCart, customers: displayCustomers, user, appSettings
  });

 const handleAddGoodsToCustomer = (name) => { notify(`Go to Sales Terminal for ${name}`); setActiveTab('sales'); };

  /* 🎭 PUT ON A TIER. The fake staff member is created the first time that tier is
     worn and never before — no empty test rows appear in his roster for tiers he
     has not opened. It is a `motorists` document and NOTHING ELSE: deliberately no
     `employee_directory` entry, because that is the record that lets a human sign
     in, and a fake agent must never become a way into the company.

     EVERY ACTION REPORTS. Creating the account, wearing it, and failing to do
     either all say so out loud. */
  /* 🔴 WHERE A COSTUME IS POSTED, and why it is a list and not a text box.

     Aldi, 2026-08-30: *"i want the option for tier 1 so that i can assign the test agent
     into different places"*. The costume used to be born at `Headquarters` by hardcode
     (povPreview.js `defaults.location || 'Headquarters'`) and there was no way to move it —
     so wearing tier 4 always landed on the ONE location that can never hold branch stock.
     `supply.js` owns that rule: Headquarters IS the master vault, not a cabang, so
     `branches/Headquarters/inventory` is empty and no `stock_request` can ever name it.
     The branch panel therefore read "Warehouse is empty" forever and looked broken.

     ⚠️ THE LIST COMES FROM `warehouseList`, NOT FROM A SECOND HAND-WRITTEN ARRAY. That is the
     exact bug 20c4a0a already paid for once: the Tujuan picker kept its own shorter list and
     offered 'Headquarters' beside the real HQ entry — two destinations for one place, on a form
     that writes stock movements. One function, one answer, or they drift.

     ⚠️ AND HE WAS NOT SENT TO THE ROSTER FORM TO DO THIS, which is what he first asked for.
     That form REQUIRES an email (FleetCanvasManager.jsx:162) because the email is the document
     ID of the `employee_directory` row — the record that lets a human sign in. Relaxing it for
     a test agent would either break the write or mint a real login for a fake person, which is
     the one thing this whole feature exists to prevent. Moving the costume is a `location`
     merge on a `motorists` document and touches no directory row at all. */
  const povPlaces = React.useMemo(
      () => ['Headquarters', ...warehouseList(motorists).slice(1)], [motorists]);

  const handlePickPov = async (account, place) => {
      if (!canUsePovSwitch(trueUser?.email)) return notify("POV switch is restricted to the owner account.");
      const worn = testAccountName(account);
      const home = place || 'Headquarters';
      try {
          const ref = doc(db, `artifacts/${appId}/users/${userId}/motorists`, account.id);
          const snap = await getDocOfflineSafe(ref);
          if (!snap.exists()) {
              await setDoc(ref, { ...testAccountDoc(account, { location: home }), createdAt: serverTimestamp() });
              notify(`AKUN UJI DIBUAT: ${worn} di ${home}. Hapus lewat Fleet kapan saja.`);
          } else {
              /* He renamed the tier in Settings, or moved the costume to another cabang, after it
                 was already made. Only those two FIELDS move — a full re-write would wipe the
                 canvas and the stock the test agent is holding. This is what keeps the nota, the
                 roster and the banner all saying the same thing after a rename. */
              const was = snap.data() || {};
              const patch = {};
              if (was.name !== worn) patch.name = worn;
              if (was.location !== home) patch.location = home;
              if (Object.keys(patch).length > 0) {
                  await setDoc(ref, patch, { merge: true });
                  notify(patch.location
                      ? `${worn} DIPINDAH KE ${home}.`
                      : `AKUN UJI DIGANTI NAMA: ${worn}.`);
              }
          }
          setPov({ tier: account.tier });
          setShowPovSwitch(false);
          /* Land where that tier actually lands. Staying on a tab the costume cannot
             open would show him a locked screen and read as a broken feature. */
          setActiveTab(hasClearance(account.tier, 'view_dashboard') ? 'dashboard' : 'journey');
          notify(`MELIHAT SEBAGAI ${worn}. Refresh untuk kembali ke owner.`);
      } catch (e) {
          notify(`GAGAL MASUK POV: ${e.message}`);
      }
  };

  const handleExitPov = () => {
      const worn = previewing ? testAccountName(previewing) : null;
      setPov(null);
      setShowPovSwitch(false);
      setActiveTab('dashboard');
      notify(worn ? `KEMBALI KE OWNER. ${worn} dilepas.` : "KEMBALI KE OWNER.");
  };
  
 // --- UPGRADED: SAMPLING ENGINE (VEHICLE DEDUCTION & BATANG SUPPORT) ---
  const handleBatchSamplingSubmit = async (cartItems, location, date, note) => {
      if (!user) return;
      
      let currentAgentProfileId = agentProfileId;
      if (userRole === 'ADMIN' && adminSalesMode === 'VEHICLE') currentAgentProfileId = 'ADMIN_VEHICLE';
      else if (userRole === 'ADMIN') currentAgentProfileId = null;

      try {
          await runTransaction(db, async (transaction) => {
              const writes = [];
              let agentRef = null;
              let updatedCanvas = [];
              
              if (currentAgentProfileId) {
                  agentRef = doc(db, `artifacts/${appId}/users/${user.uid}/motorists`, currentAgentProfileId);
                  const agentDoc = await transaction.get(agentRef);
                  if (agentDoc.exists()) updatedCanvas = [...(agentDoc.data().activeCanvas || [])];
              }

              for (const item of cartItems) {
                  const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.productId || item.id);
                  const prodDoc = await transaction.get(prodRef);
                  if (!prodDoc.exists()) throw `Product ${item.name} not found!`;
                  
                  const pData = prodDoc.data();
                  const sticksPerPack = pData.sticksPerPack || 16;
                  const qtyInBks = item.unit === 'Batang' ? (item.qty / sticksPerPack) : item.qty;

                  if (currentAgentProfileId) {
                      // DEDUCT FROM VEHICLE CANVAS
                      const canvasIdx = updatedCanvas.findIndex(c => c.productId === (item.productId || item.id));
                      if (canvasIdx === -1) throw `${item.name} is not in your vehicle!`;
                      
                      let cItem = updatedCanvas[canvasIdx];
                      let mCanvas = cItem.unit === 'Slop' ? (pData.packsPerSlop || 10) : cItem.unit === 'Bal' ? ((pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : cItem.unit === 'Karton' ? ((pData.balsPerCarton || 4) * (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : 1;
                      
                      const currentCanvasBks = cItem.qty * mCanvas;
                      const newCanvasBks = currentCanvasBks - qtyInBks;
                      
                      if (newCanvasBks < 0) throw `Not enough ${item.name} in vehicle!`;
                      updatedCanvas[canvasIdx] = { ...cItem, qty: newCanvasBks / mCanvas };
                  } else {
                      // DEDUCT FROM MASTER VAULT
                      const currentStock = pData.stock || 0;
                      const newStock = currentStock - qtyInBks;
                      if (newStock < 0) throw `Not enough stock in Vault for ${item.name}`;
                      writes.push({ type: 'update', ref: prodRef, data: { stock: newStock } });
                  }

                  const newSampleRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/samplings`));
                  writes.push({ 
                      type: 'set', 
                      ref: newSampleRef, 
                      data: {
                          date: date,
                          productId: item.productId || item.id,
                          productName: item.name,
                          qty: item.qty,
                          unit: item.unit || 'Bks',
                          sticksPerPack: sticksPerPack,
                          reason: location, 
                          note: note || '', 
                          sourceId: currentAgentProfileId || 'VAULT',
                          timestamp: serverTimestamp()
                      } 
                  });
              }
              
              if (currentAgentProfileId && agentRef) {
                  writes.push({ type: 'update', ref: agentRef, data: { activeCanvas: updatedCanvas.filter(c => c.qty > 0) } });
              }

              for (const w of writes) {
                  if (w.type === 'update') transaction.update(w.ref, w.data);
                  if (w.type === 'set') transaction.set(w.ref, w.data);
              }
          });
          await logAudit("SAMPLING_BATCH", `Added ${cartItems.length} items to folder: ${location}`);
          triggerCapy(`Success! ${cartItems.length} items saved.`);
          setEditingSample(null);
      } catch (err) { console.error(err); notify("Failed to save batch: " + err); }
  };

  const handleDeleteSampling = async (sample) => {
      if(!await confirmAction("Delete this sample record? Stock will be RESTORED to its original source.")) return;
      try {
          await runTransaction(db, async (t) => {
              const prodRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, sample.productId);
              const prodDoc = await t.get(prodRef);
              const pData = prodDoc.exists() ? prodDoc.data() : {};
              
              const sticksPerPack = sample.sticksPerPack || pData.sticksPerPack || 16;
              const qtyInBks = sample.unit === 'Batang' ? (sample.qty / sticksPerPack) : sample.qty;

              if (sample.sourceId && sample.sourceId !== 'VAULT') {
                  const agentRef = doc(db, `artifacts/${appId}/users/${user.uid}/motorists`, sample.sourceId);
                  const agentDoc = await t.get(agentRef);
                  if (agentDoc.exists()) {
                      let updatedCanvas = [...(agentDoc.data().activeCanvas || [])];
                      const canvasIdx = updatedCanvas.findIndex(c => c.productId === sample.productId);
                      
                      if (canvasIdx > -1) {
                          let cItem = updatedCanvas[canvasIdx];
                          let mCanvas = cItem.unit === 'Slop' ? (pData.packsPerSlop || 10) : cItem.unit === 'Bal' ? ((pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : cItem.unit === 'Karton' ? ((pData.balsPerCarton || 4) * (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : 1;
                          const currentCanvasBks = cItem.qty * mCanvas;
                          updatedCanvas[canvasIdx] = { ...cItem, qty: (currentCanvasBks + qtyInBks) / mCanvas };
                      } else {
                          updatedCanvas.push({ productId: sample.productId, name: sample.productName, qty: qtyInBks, unit: 'Bks', priceTier: 'Retail', calculatedPrice: pData.priceRetail || 0 });
                      }
                      t.update(agentRef, { activeCanvas: updatedCanvas });
                  }
              } else if (prodDoc.exists()) {
                  t.update(prodRef, { stock: (pData.stock || 0) + qtyInBks });
              }
              
              t.delete(doc(db, `artifacts/${appId}/users/${user.uid}/samplings`, sample.id));
          });
          logAudit("SAMPLING_DELETE", `Deleted sample: ${sample.productName}`);
          triggerCapy("Sample deleted & stock restored.");
      } catch(err) { console.error(err); notify("Failed to delete: " + err.message); }
  };

  const handleUpdateSampling = async (updatedData) => {
      if (!user || !editingSample) return;
      
      const newQty = parseInt(updatedData.qty);
      const newUnit = updatedData.unit || 'Bks';
      const newProductId = updatedData.productId;
      const newProductName = updatedData.productName;
      
      try {
          await runTransaction(db, async (t) => {
              // 1. Fetch old product data
              const oldProdRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, editingSample.productId);
              const oldProdDoc = await t.get(oldProdRef);
              const oldPData = oldProdDoc.exists() ? oldProdDoc.data() : {};
              const oldSticksPerPack = editingSample.sticksPerPack || oldPData.sticksPerPack || 16;
              const oldQtyInBks = editingSample.unit === 'Batang' ? (editingSample.qty / oldSticksPerPack) : editingSample.qty;

              // 2. Fetch new product data
              const newProdRef = doc(db, `artifacts/${appId}/users/${user.uid}/products`, newProductId);
              const newProdDoc = newProductId === editingSample.productId ? oldProdDoc : await t.get(newProdRef);
              if (!newProdDoc.exists()) throw `New Product not found!`;
              const newPData = newProdDoc.data();
              const newSticksPerPack = newPData.sticksPerPack || 16;
              const newQtyInBks = newUnit === 'Batang' ? (newQty / newSticksPerPack) : newQty;

              const sourceId = editingSample.sourceId || 'VAULT';

              if (sourceId !== 'VAULT') {
                  // VEHICLE CANVAS UPDATE
                  const agentRef = doc(db, `artifacts/${appId}/users/${user.uid}/motorists`, sourceId);
                  const agentDoc = await t.get(agentRef);
                  if (agentDoc.exists()) {
                      let updatedCanvas = [...(agentDoc.data().activeCanvas || [])];

                      // A. Restore Old Qty
                      const oldCanvasIdx = updatedCanvas.findIndex(c => c.productId === editingSample.productId);
                      if (oldCanvasIdx > -1) {
                          let cItem = updatedCanvas[oldCanvasIdx];
                          /* 🚀 FIX: knew Slop only, so a van row counted in Bal or Karton was
                             treated as single packs and editing a sample could invent or wipe
                             out a large amount of stock. */
                          const mCanvas = convertToBks(1, cItem.unit, oldPData);
                          updatedCanvas[oldCanvasIdx] = { ...cItem, qty: cItem.qty + (oldQtyInBks / mCanvas) };
                      } else {
                          updatedCanvas.push({ productId: editingSample.productId, name: editingSample.productName, qty: oldQtyInBks, unit: 'Bks' });
                      }

                      // B. Deduct New Qty
                      const newCanvasIdx = updatedCanvas.findIndex(c => c.productId === newProductId);
                      if (newCanvasIdx > -1) {
                          let cItem = updatedCanvas[newCanvasIdx];
                          const mCanvas = convertToBks(1, cItem.unit, newPData);   // 🚀 same fix, deduct side
                          const currentBks = cItem.qty * mCanvas;
                          if (currentBks < newQtyInBks) throw `Not enough ${newProductName} in vehicle!`;
                          updatedCanvas[newCanvasIdx] = { ...cItem, qty: (currentBks - newQtyInBks) / mCanvas };
                      } else {
                          throw `${newProductName} is not in the vehicle!`;
                      }
                      t.update(agentRef, { activeCanvas: updatedCanvas.filter(c => c.qty > 0) });
                  }
              } else {
                  // VAULT UPDATE
                  if (newProductId === editingSample.productId) {
                      const diffInBks = newQtyInBks - oldQtyInBks;
                      if (diffInBks > 0 && (oldPData.stock || 0) < diffInBks) throw `Not enough stock in Vault!`;
                      t.update(oldProdRef, { stock: (oldPData.stock || 0) - diffInBks });
                  } else {
                      t.update(oldProdRef, { stock: (oldPData.stock || 0) + oldQtyInBks });
                      if ((newPData.stock || 0) < newQtyInBks) throw `Not enough stock of ${newProductName} in Vault!`;
                      t.update(newProdRef, { stock: (newPData.stock || 0) - newQtyInBks });
                  }
              }

              // 3. Update Sample Record
              t.update(doc(db, `artifacts/${appId}/users/${user.uid}/samplings`, editingSample.id), {
                  date: updatedData.date,
                  qty: newQty,
                  unit: newUnit,
                  productId: newProductId,
                  productName: newProductName,
                  sticksPerPack: newSticksPerPack,
                  reason: updatedData.reason || '', // 🚀 FIX: Fallback to prevent undefined
                  note: updatedData.note || '',     // 🚀 FIX: Fallback to prevent undefined crash
                  updatedAt: serverTimestamp()
              });
          });
          
          triggerCapy("Record updated!");
          setEditingSample(null);
      } catch (err) { notify(err.message || err); }
  };
  
  // --- NEW: OPEN FOLDER EDIT MODAL ---
  const handleBatchFolderEdit = (oldDate, oldReason) => {
      setEditingFolder({ oldDate, oldReason }); // Just open the modal
  };

  // --- NEW: SAVE FOLDER CHANGES (Native Date Picker) ---
  const processFolderEdit = async (e) => {
      e.preventDefault();
      if (!user || !editingFolder) return;
      
      const formData = new FormData(e.target);
      const newDate = formData.get('newDate');
      let newReason = formData.get('newReason').trim();
      
      // Auto-capitalize the new location name for consistency
      newReason = newReason.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

      const { oldDate, oldReason } = editingFolder;

      if (newDate === oldDate && newReason === oldReason) {
          setEditingFolder(null);
          return;
      }

      if (!await confirmAction(`Move ALL items from "${oldReason}" to "${newReason}" on ${newDate}?`)) return;

      try {
          const targets = samplings.filter(s => s.date === oldDate && s.reason === oldReason);
          const batch = writeBatch(db);
          
          targets.forEach(s => {
              const ref = doc(db, `artifacts/${appId}/users/${user.uid}/samplings`, s.id);
              batch.update(ref, { date: newDate, reason: newReason });
          });
          
          await batch.commit();
          triggerCapy(`Successfully moved ${targets.length} items!`);
          setEditingFolder(null);
      } catch (err) {
          console.error(err);
          notify("Move failed: " + err.message);
      }
  };

  const handleBackupData = async () => {
    if(!user || !isAdmin) return; 
    
    triggerCapy("Compiling physical safe backup (Including Maps)...");
    const payload = await generateFullSystemPayload("USB_SAFE");
    
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `USB_SAFE_BACKUP_${getCurrentDate()}.json`; 
    a.click();

    // 1. Update the indicator (Turns status GREEN)
    localStorage.setItem('last_usb_backup', new Date().getTime().toString());
    
    // 2. Show the Success Toast
    setBackupToast(true);
    setTimeout(() => setBackupToast(false), 4000); 
    
    await logAudit("USB_BACKUP", "Admin performed physical safe backup");
    triggerCapy("Physical safety confirmed! 💾");
  };

  const handleRestoreData = async (e) => {
      const file = e.target.files[0];
      if (!file || !user) return;
      if(!await confirmAction("CRITICAL WARNING: Restoring from a backup will overwrite your live database with the file's contents. Proceed?")) return;
      
      triggerCapy("Initiating Full System Restore... Do not close the window. ⏳");
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const data = JSON.parse(event.target.result);
              
              // 🚀 FIX: The old restore fired ALL chunked batch.commit() calls CONCURRENTLY
              // (Promise.all), flooding Firestore's write stream — the exact source of the
              // "resource-exhausted: maximum allowed queued writes" console spam and partial
              // restores. We now queue plain operations and hand them to commitInChunks,
              // which commits SEQUENTIALLY, size-capped (10MiB request limit) and paced.
              const operations = [];

              const safeSet = (ref, itemData) => {
                  operations.push({ type: 'set', ref, data: itemData });
              };

              const queueToBatch = (collectionName, items) => {
                  if (items && Array.isArray(items)) {
                      items.forEach(item => {
                          // 🚀 THE FIX: Deep Restore to Master Vault
                          safeSet(doc(db, `artifacts/${appId}/users/${userId}/${collectionName}`, item.id || Date.now().toString()), item);
                      });
                  }
              };

              // 1. Restore Standard Collections
              queueToBatch('products', data.inventory);
              queueToBatch('transactions', data.transactions);
              queueToBatch('samplings', data.samplings);
              queueToBatch('procurement', data.procurements);
              queueToBatch('audit_logs', data.auditLogs);
              
              // 🚀 THE FIX: Restore mapBorders correctly
              const bordersToRestore = data.mapBorders || data.mapSettings;
              if (bordersToRestore) {
                  queueToBatch('mapBorders', bordersToRestore); 
              }
              
              // 🚀 SCORCHED EARTH: Restore to both possible map endpoints
              if (data.mapSettings) queueToBatch('mapSettings', data.mapSettings); 
              if (data.mapBorders) queueToBatch('mapBorders', data.mapBorders); 

              // 2. Deep Restore Customers & Competitor Intelligence
              if (data.customers && Array.isArray(data.customers)) {
                  data.customers.forEach(c => {
                      const cData = { ...c };
                      const benchmarks = cData.benchmarks || [];
                      delete cData.benchmarks; // clean main profile payload

                      safeSet(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, c.id || Date.now().toString()), cData);
                      
                      if (c.id) {
                          benchmarks.forEach(b => {
                              safeSet(doc(db, `artifacts/${appId}/users/${user.uid}/customers/${c.id}/benchmarks`, b.id || Date.now().toString()), b);
                          });
                      }
                  });
              }

              // 3. Restore Core Settings
              if (data.appSettings) safeSet(doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'general'), data.appSettings);
              if (data.tierSettings) safeSet(doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'tiers'), { list: data.tierSettings });

              // 4. Commit everything sequentially in safe, size-capped, paced chunks
              await commitInChunks(db, writeBatch, operations);

              triggerCapy("System Restore Complete! Refreshing matrix... ✨");
              setTimeout(() => window.location.reload(), 2500);
          } catch (err) { 
              notify("Failed to restore: " + err.message); 
              console.error(err); 
              triggerCapy("Restore Failed. File corrupted.");
          }
      };
      reader.readAsText(file);
      e.target.value = null; 
  };// 
  
  // --- NEW: EXPORT SHARED CONFIG (Products + Branding ONLY) ---
  const handleExportSharedConfig = async () => {
    if(!user) return;
    const shareData = {
        meta: { type: "kpm_shared_config", date: new Date().toISOString(), exportedBy: user.email },
        inventory,      // The products (Images, 3D dims, Prices)
        appSettings     // The branding (Mascot, Company Name, Dialogues)
    };
    const blob = new Blob([JSON.stringify(shareData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpm_shared_config_${getCurrentDate()}.json`;
    a.click();
    triggerCapy("Shared Config ready to send!");
  };

  // --- NEW: IMPORT SHARED CONFIG ---
  const handleImportSharedConfig = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    
    if(!await confirmAction("Import Shared Config? This will overwrite your current Product List and Branding settings (Mascot/Name). Transactions will NOT be affected.")) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if(data.meta?.type !== "kpm_shared_config") throw new Error("Invalid Config File. Please use a file generated by the 'Share Config' button.");
            
            // 1. Overwrite Settings
            if(data.appSettings) {
                await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'general'), data.appSettings);
            }

            // 2. Merge/Overwrite Products
            if(data.inventory && Array.isArray(data.inventory)) {
                // 🚀 FIX: Chunked/paced commitInChunks instead of one giant batch — same
                // pattern as Restore from Backup, so a large shared product list can't
                // overflow Firestore's 500-op/10MiB request caps.
                const operations = data.inventory.map(item => ({
                    type: 'set',
                    ref: doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id),
                    data: item
                }));
                await commitInChunks(db, writeBatch, operations);
            }
            
            triggerCapy("Config Imported! Welcome to the team.");
        } catch (err) { 
            notify("Import Failed: " + err.message); 
            console.error(err); 
        }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const totalStockValue = inventory.reduce((acc, i) => acc + (i.stock * (i.priceRetail || 0)), 0);
  const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
// --- NEW: SAFE SALES TERMINAL INVENTORY ---
  const salesTerminalInventory = React.useMemo(() => {
      if (userRole === 'ADMIN') {
          if (adminSalesMode === 'VAULT') return filteredInventory;
          // Boss Vehicle Mode: Show ALL products, but map stock to vehicle
          return filteredInventory.map(p => {
              const canvasItem = adminCanvas.find(c => c.productId === p.id);
              let trueStockInVehicle = 0;
              if (canvasItem) {
                  let multCanvas = 1;
                  if (canvasItem.unit === 'Slop') multCanvas = p.packsPerSlop || 10;
                  if (canvasItem.unit === 'Bal') multCanvas = (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
                  if (canvasItem.unit === 'Karton') multCanvas = (p.balsPerCarton || 4) * (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
                  trueStockInVehicle = Math.floor(canvasItem.qty * multCanvas);
              }
              return { ...p, stock: trueStockInVehicle };
          });
      }
      
      // Employee Mode: Show ALL products, but map stock to vehicle
      return filteredInventory.map(p => {
          const canvasItem = agentCanvas.find(c => c.productId === p.id);
          let trueStockInVehicle = 0;
          if (canvasItem) {
              let multCanvas = 1;
              if (canvasItem.unit === 'Slop') multCanvas = p.packsPerSlop || 10;
              if (canvasItem.unit === 'Bal') multCanvas = (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
              if (canvasItem.unit === 'Karton') multCanvas = (p.balsPerCarton || 4) * (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
              trueStockInVehicle = Math.floor(canvasItem.qty * multCanvas);
          }
          return { ...p, stock: trueStockInVehicle };
      });
  }, [userRole, filteredInventory, agentCanvas, adminSalesMode, adminCanvas]);

// --- NEW: SAFE CUSTOMERS LOGIC FOR JOURNEY & MAP ---
  const permittedCustomers = React.useMemo(() => {
      // Admin sees everyone
      if (userRole === 'ADMIN') return customers;
      
      const allowedTiers = agentSettings.allowedTiers || ['Retail', 'Ecer'];
      
      // Filter customers strictly based on the agent's authorized tiers
      return customers.filter(c => {
          // 🚀 ANTI-FRAUD QUARANTINE: Strictly hide PENDING stores from Agents!
          if (c.status === 'PENDING') return false;

          /* `pricingTier` is the SAME field under a second spelling. useTransactionEngine wrote
             it that way for every store registered during a sale, while this filter only looked
             for `priceTier` — so those stores fell through to the 'Retail' default below and
             vanished from any agent whose allowedTiers excluded Retail. The salesman could not
             find the store he had just created, so he created it again. That is where the
             duplicates came from. The writer now emits `priceTier`; this line is what rescues
             every record already saved the old way, with no migration needed. */
          const explicitTier = c.priceTier || c.pricingTier;
          let mappedTier = explicitTier || 'Retail';

          // Fallback logic for legacy customers missing any explicit tier
          if (!explicitTier) {
              const tierUpper = (c.tier || '').toUpperCase();
              if (tierUpper.includes('GROSIR') || tierUpper.includes('GOLD') || tierUpper.includes('WHOLESALE')) mappedTier = 'Grosir';
              else if (tierUpper.includes('RETAIL') || tierUpper.includes('SILVER')) mappedTier = 'Retail';
              else if (tierUpper.includes('ECER') || tierUpper.includes('BRONZE')) mappedTier = 'Ecer';
          }
          
          return allowedTiers.includes(mappedTier);
      });
  }, [customers, userRole, agentSettings.allowedTiers]);

  /* The permitted list, with the legacy tier suffix hidden the same way. Used only by views. */
  const displayPermitted = React.useMemo(
      () => (permittedCustomers || []).map(c => ({ ...c, name: storeLabel(c.name) })), [permittedCustomers]);

  /* the 7-day chart this fed was deleted with the dashboard rebuild — that view is now the
     live panel's chart on MINGGU, computed from the same period window as everything else. */




// --- NEW: SAVE MAP HOME BASE ---
  const handleSetMapHome = async (center, zoom) => {
      if(!user || !isAdmin) return;
      try {
          const newSettings = { ...appSettings, mapHome: { lat: center.lat, lng: center.lng, zoom } };
          setAppSettings(newSettings);
          await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), newSettings, {merge: true});
          triggerCapy("New Map Home Base Saved! 🏠");
      } catch(err) { console.error(err); notify("Failed to save map home."); }
  };









// --- UPDATED: SINGLE BACKUP (Forces Specific Green Light) ---
  const handleSingleBackup = async (type) => {
      if (!user) return;
      triggerCapy(`Compiling ${type} sectors (Including Maps)...`);
      
      const payload = await generateFullSystemPayload(type);
      const filename = `FOLDER_${type}--SAFE_${payload.meta.ts}.json`;

      if (type === "RECOVERY") setSessionStatus(prev => ({ ...prev, recovery: true }));
      else if (type === "USB") setSessionStatus(prev => ({ ...prev, usb: true }));
      else if (type === "CLOUD") setSessionStatus(prev => ({ ...prev, cloud: true }));

      triggerDownload(filename, payload);
      await logAudit("BACKUP_SINGLE", `Manual download: ${type}`, true);
      triggerCapy(`${type} Backup Saved! Status Secure.`);
  };


 

  // --- MAIN APP RENDER (BIOHAZARD THEME) ---
      return (
        <BiohazardTheme
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            user={user}
            showAdminLogin={gateUp}
            appSettings={appSettings}
            
            /* 🎭 MATRIX VIEW FIX: Instantly strip Admin UI privileges if masquerading as Tier 3/4 */
            isAdmin={isAdmin && (userRole === 'ADMIN' || userRole === 'AREA_ADMIN')}
            userRole={userRole}
            /* 🎭 THE HIDDEN DOOR. His rule: *"make this option hidden on the sidebar
               because not all employee can open setting right on recent system"* — so
               it is not a nav mark, not a Settings row, and not in any menu. It is his
               own face at the foot of the rail, and it is only a button when the TRUE
               signed-in email is his. Every other account, and his own account while
               it is wearing a costume, gets the plain photograph it has always had. */
            onOpenPov={canUsePovSwitch(trueUser?.email) ? () => setShowPovSwitch(true) : null}
            povActive={!!previewing}
            onLogin={handleLogin} 
            setShowAdminLogin={setShowAdminLogin}
            agentSettings={agentSettings}
            notifications={combinedNotifications}
            onNotificationClick={handleNotificationClick}
            appVersion={APP_VERSION}
             matrixTick={matrixTick} /* 🚀 CATCH THE PULSE AND REDRAW UI */
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            /* The face in the panel is the agent's own, the one they set on Agent Profile.
               Google's account picture is the fallback; the dicebear robot is gone. */
            /* `|| 'master_owner'` — his report, 2026-08-14: *"the profile picture is not even
               changing like agent profile picture"*. `agentProfileId` is null for the owner and
               for an admin (App.jsx:296 + the sign-in branch), so the lookup missed and the shell
               fell through to the Google account photo. The owner's own record is written under
               `master_owner` by AgentProfileView, which is what this now asks for when there is
               no agent id. A real agent id still wins, so nobody sees somebody else's face. */
            agentPhoto={motorists.find(m => m.id === (agentProfileId || 'master_owner'))?.profileImage || null}
            syncIndicator={user && (
                /* PALETTE LAW. This was an emerald pill — the last green in the app chrome, and
                   the loudest thing in a header whose job is to be quiet. Synced is the calm
                   state and now looks like it; only OFFLINE earns a colour, because only
                   offline is news. .kpm-chip is the shared header plate. */
                <button onClick={() => setShowFlightRecorder(true)} className={`kpm-chip relative ${isOnline ? '' : 'warn animate-pulse'}`}>
                    {isOnline ? <Cloud size={16} /> : <CloudOff size={16} />}
                    <span className="text-[10px] font-black tracking-widest hidden md:inline">{isOnline ? 'SYNCED' : 'OFFLINE'}</span>
                    {(pendingCount.transactions > 0 || pendingCount.noo > 0) && (
                        <span className="absolute -top-2 -right-2 bg-orange-500 text-[var(--duke-on-fill)] text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]">{pendingCount.transactions + pendingCount.noo}</span>
                    )}
                </button>
            )}
            >
          
          {/* 🥔 POTATO ENGINE: RUTHLESS HARDWARE ACCELERATION BYPASS */}
          {isLiteMode && (
              <style>{`
                  .lite-mode * {
                      backdrop-filter: none !important;
                      -webkit-backdrop-filter: none !important;
                      box-shadow: none !important;
                      text-shadow: none !important;
                      filter: none !important; /* catches blur(), the animated rank borders miss this one */
                      /* Collapse animations to instant instead of "animation: none".
                         "none" clears animation-NAME, which permanently strands anything that
                         starts at opacity:0 and is revealed by a forwards-fill animation — the
                         sidebar's own .boot-1..4 menu reveal does exactly that, so "none" made
                         the whole nav invisible in Lite Mode. Zeroing duration/delay still kills
                         the GPU cost (infinite animations run once for 1ms and stop) while
                         letting forwards-fill land on its final visible state. */
                      animation-duration: 0.001s !important;
                      animation-delay: 0s !important;
                      animation-iteration-count: 1 !important;
                  }
                  .lite-mode .backdrop-blur:not([class*="bg-[var("]), .lite-mode .backdrop-blur-md:not([class*="bg-[var("]), .lite-mode .backdrop-blur-sm:not([class*="bg-[var("]), .lite-mode .backdrop-blur-\\[2px\\]:not([class*="bg-[var("]) {
                      /* 🔴 THE :not() IS LOAD-BEARING, 2026-08-25. "Every element this rule
                         overrides is a scrim or an overlay" — the sentence directly below this
                         one — was FALSE, and it was false in two files. Measured on the
                         Dashboard in Lite Mode: five elements were painted rgba(46,38,26,.72),
                         including the three money cards, which say bg-[var(--raised)] and were
                         overridden to dark purely for carrying backdrop-blur-sm.

                         An element that names its own background token has said what colour it
                         is; only an element with NO background of its own should borrow the
                         scrim. The twin of this rule lives in index.css and was narrowed the
                         same way — fixing one and not the other fixes nothing, because both
                         carry !important and either can win.

                         ⚠️ WAS THE DARKEST SLATE before that — the blue the palette law bans, and
                         a literal besides, so in Lite Mode every backdrop in the app turned navy
                         and stayed navy in light mode. A scrim is dark in BOTH themes by law. */
                      background-color: var(--duke-scrim) !important; /* Fast solid fallback */
                  }
                  .lite-mode .rank-frame {
                      background-image: none !important;
                  }
                  /* Belt-and-braces for the sidebar's staggered menu reveal. The rules above
                     already let its forwards-fill animation land on opacity:1, but Lite Mode
                     exists for weak phones — the exact devices that drop frames — and an
                     !important declaration beats an animation in the cascade, so the nav is
                     pinned visible regardless of whether the animation ever gets to run. */
                  .lite-mode .boot-1, .lite-mode .boot-2,
                  .lite-mode .boot-3, .lite-mode .boot-4 {
                      opacity: 1 !important;
                  }
              `}</style>
          )}

          {/* NEW ROUTER FOR EMPLOYEE VEHICLE INVENTORY */}
      {activeTab === 'agent_inventory' && (
           <AgentInventoryView 
               db={db} 
               appId={appId} 
               userId={userId} 
               agentProfileId={agentProfileId} 
               inventory={inventory}
               transactions={transactions}
               samplings={samplings}   // 🚀 INJECTED: Pass the global sampling ledger
               user={user}             // 🚀 FIX: Pass the user profile to prevent 'blank' names
               userRole={userRole}     // regional admin and above see the van as the chest
               motorists={motorists}   // 🚀 FIX: Pass motorists list
               previewing={previewing} // 🎭 POV keeps his real email, so the screen's email lookup must stand down
           />
      )}

      {/* 1. GLOBAL MODALS */}
      {/* onUpdateProduct is gone: this screen no longer edits dimensions, it only shows them.
          Measuring lives in ImageCropper below, which is Master Vault only — his instruction. */}
      {examiningProduct && <ExamineModal product={examiningProduct} onClose={() => setExaminingProduct(null)} isAdmin={isAdmin} />}
      {cropImageSrc && <ImageCropper imageSrc={cropImageSrc} onCancel={() => { setCropImageSrc(null); setActiveCropContext(null); }} onCrop={handleCropConfirm} dimensions={boxDimensions} onDimensionsChange={setBoxDimensions} face={activeCropContext?.face || 'front'} />}
     


      {/* --- PINPOINT: Improved Admin Modal (Fixed Fonts & Layout) --- */}
      {/* Solid black, not black/95: at 95% the app behind it bleeds through as ghost text and
          the dot field has to compete with it. The preview's stage was pure black and that is
          half of why it read as a vault rather than an overlay. Dropping backdrop-blur with it
          is free — there is nothing left to blur. */}
      {gateUp && (
        /* `kpm-dark-island` is not decoration — it is what keeps this screen black. See the block
           of the same name in theme.css: the gate is a THEME ISLAND, because a card that is
           near-black in both themes cannot be painted with inks that flip. */
        <div className="kpm-dark-island fixed inset-0 z-[9999] bg-[var(--duke-well-solid)] flex items-center justify-center p-4 font-mono">
          {/* The dot field is the gate's background for ALL FIVE modes, not just the unlock:
              dark until the pointer — or a finger press, phones have no hover — reveals it.
              On unlock the card collapses and the same field carries his name.
              Lite Mode and prefers-reduced-motion skip the canvas entirely and keep the plain
              ACCESS GRANTED block below, which is the whole point of that switch. */}
          {/* The FIELD survives reduced motion — it only sits there and lights up under a finger.
              Only the SEQUENCE is gated on gateIsRich(), so a phone with Reduce Motion on still
              gets a background it can touch, and skips the 8.5s wave. Lite Mode still removes
              the canvas entirely, which is what that switch is for. */}
          {gateCanvasOn() && (
            <VaultGate
              playing={isUnlocking && gateIsRich()}
              agentName={(profileName || user?.displayName)?.split(' ')[0] || user?.email?.split('@')[0]}
            />
          )}
          {/* The card, at the preview's own values: near-black, a single rust hairline, and no
              red alarm chrome. It is the same shell for all five modes — that is what "five modes
              wearing one shell" was always supposed to look like. */}
          {/* 320 on a phone, 384 from md up — his ask: "i want the login panel to be a little bit
              bigger on pc". The preview's 264 was sized for a small demo stage, not a monitor. */}
          <div className={`bg-[rgba(4,3,2,0.9)] border border-[color-mix(in_srgb,var(--shell-orange-edge)_20%,transparent)] p-6 md:p-8 max-w-[320px] md:max-w-[384px] w-full text-center shadow-[0_20px_46px_-12px_rgba(0,0,0,0.95)] relative z-10 overflow-hidden transition-all ${authShake ? 'animate-shake' : ''} ${isUnlocking && gateIsRich() ? 'opacity-0 scale-[.86] pointer-events-none duration-[420ms]' : ''}`}>

            {/* The top stripe marks a mode that is NOT the everyday one, so it still carries
                meaning. Standard login has none — the preview's gate is a plain card. */}
            {((isUnlocking && !gateIsRich()) || isSetupMode || isResetMode || isOtpMode) && (
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${isResetMode ? 'via-orange-500' : 'via-[var(--duke-amber)]'} to-transparent ${authShake ? '' : 'animate-pulse'}`}></div>
            )}

            {/* 🎬 CINEMATIC UNLOCK SEQUENCE 🎬 */}
            {/* HIS REPORT: "there is split second of old access granted panel after i press the
                enter vault in phone". This block IS that panel. When the rich gate is playing,
                the card is fading out over 420ms — and swapping its contents to ACCESS GRANTED
                on the same frame meant he watched the old screen flash inside the fade.
                It is now the LITE path only, which is the one place it was ever meant to be:
                Lite Mode and reduced motion skip the canvas and need something to show. */}
            {isUnlocking && !gateIsRich() ? (
                <div className="space-y-5 text-center py-6">
                    <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                        {/* One ring, drawn once. It does NOT rotate: Lite Mode's law is that
                            nothing spins, and a spinner here would also be a lie — the vault is
                            already open by the time this branch renders. */}
                        <div className="absolute inset-0 rounded-full border border-[color-mix(in_srgb,var(--duke-amber-edge)_25%,transparent)] kpm-unlock-ring"></div>
                        <Unlock size={30} className="text-[var(--shell-ink)] kpm-unlock-icon" />
                    </div>
                    <div>
                        <h3 className="text-[var(--shell-ink)] font-black text-2xl uppercase mb-2 kpm-unlock-title">Access Granted</h3>
                        {/* THE NAME, WITHOUT THE ANIMATION (2026-10-01, his Samsung: "the welcome 'aldi' is gone"). Lite
                            Mode and Reduce Motion / Samsung's "Remove animations" skip the dot sequence that spells his
                            name, so this plain box greeted nobody. Same name as the sequence (VaultGate agentName). */}
                        <p className="text-[var(--shell-ink)] font-mono text-sm uppercase tracking-[0.3em] mb-2">Welcome back, {((profileName || user?.displayName)?.split(' ')[0] || user?.email?.split('@')[0] || 'Agent').toUpperCase()}</p>
                        <p className="text-[color-mix(in_srgb,var(--shell-ink)_40%,transparent)] font-mono text-[10px] uppercase tracking-[0.25em]">Master Vault</p>
                    </div>
                    {/* A single sweep, not a progress bar. Nothing is loading here, so a bar that
                        appears to measure work is telling him something untrue — the old one
                        stuttered for 2.4s to sell a decryption that never happened. */}
                    <div className="w-full h-px bg-[color-mix(in_srgb,var(--duke-amber)_15%,transparent)] overflow-hidden">
                        <div className="h-full w-full origin-left bg-[var(--duke-amber)] kpm-unlock-sweep"></div>
                    </div>
                    <style>{`
                        @keyframes kpmUnlockIcon  { from { opacity: 0; transform: scale(.82); } to { opacity: 1; transform: scale(1); } }
                        @keyframes kpmUnlockRing  { from { opacity: 0; transform: scale(.88); } to { opacity: 1; transform: scale(1); } }
                        @keyframes kpmUnlockTitle { from { opacity: 0; letter-spacing: .55em; } to { opacity: 1; letter-spacing: .3em; } }
                        @keyframes kpmUnlockSweep { from { transform: scaleX(0); } to { transform: scaleX(1); } }
                        .kpm-unlock-icon  { animation: kpmUnlockIcon  220ms cubic-bezier(.16,1,.3,1) both; }
                        .kpm-unlock-ring  { animation: kpmUnlockRing  260ms cubic-bezier(.16,1,.3,1) both; }
                        .kpm-unlock-title { letter-spacing: .3em; animation: kpmUnlockTitle 320ms cubic-bezier(.16,1,.3,1) 60ms both; }
                        .kpm-unlock-sweep { animation: kpmUnlockSweep 620ms cubic-bezier(.22,1,.36,1) 120ms both; }
                        @media (prefers-reduced-motion: reduce) {
                            .kpm-unlock-icon, .kpm-unlock-ring, .kpm-unlock-title, .kpm-unlock-sweep {
                                animation-duration: 1ms !important; animation-delay: 0ms !important;
                            }
                        }
                    `}</style>
                </div>
            ) : (
                <>
                    {/* The red shield and SECURITY CHECK belong to the modes that really are an
                        alarm. Standard login is the door he opens every day, and the preview
                        gives it two quiet lines instead — see CASE 3. */}
                    {(isSetupMode || isResetMode || isOtpMode) && (<>
                      <ShieldAlert size={32} className={`mx-auto mb-4 ${isSetupMode ? 'text-[var(--duke-amber-ink)]' : isResetMode ? 'text-orange-500' : 'text-[var(--shell-orange-ink)]'}`} />
                      <h2 className="text-lg font-black text-[var(--duke-ink-hi)] mb-6 uppercase tracking-[0.25em]">
                        {isSetupMode ? "Initialize Vault" : isResetMode ? "Identity Recovery" : "Security Check"}
                      </h2>
                    </>)}

            {/* CASE 1: FIRST TIME SETUP (Or Resetting) */}
            {isSetupMode ? (
                <div className="space-y-4 text-left">
                    {/* 🚀 NEW: The Welcome Bridge UI */}
                    {pendingMigration ? (
                        <div className="mb-6 text-center border-b border-[color-mix(in_srgb,var(--duke-amber-edge)_30%,transparent)] pb-4 animate-fade-in">
                            <h3 className="text-xl font-black text-[var(--duke-ink-hi)] uppercase tracking-widest mb-1">Welcome to {appSettings?.companyName || "The Platform"}</h3>
                            <p className="text-[var(--duke-amber-ink)] text-[10px] uppercase tracking-[0.2em] font-bold">First-Time Setup: Initialize Vault</p>
                            <p className="text-[var(--duke-ink-3)] text-[10px] mt-2 leading-relaxed">Your Architect has provisioned your clearance. Create your Master Credentials to secure your database and finalize your account migration.</p>
                        </div>
                    ) : (
                        <p className="text-[10px] text-[var(--duke-amber-ink)] uppercase font-bold mb-4 tracking-widest text-center">Create Administrator Credentials</p>
                    )}
                    
                    <div className="relative">
                        <div className="relative">
                            <input
                                type={showSetupPassword ? 'text' : 'password'}
                                /* Shown as text, a phone keyboard would capitalise and autocorrect it - a
                                   different password from the one he typed. */
                                autoCapitalize="off"
                                autoCorrect="off"
                                spellCheck={false}
                                placeholder="CREATE MASTER PASSWORD"
                                value={setupPassword}
                                onChange={(e) => setSetupPassword(e.target.value)}
                                className="w-full bg-[var(--duke-well-solid)] border border-[color-mix(in_srgb,var(--duke-amber-edge)_30%,transparent)] p-4 px-12 text-center text-[var(--shell-ink)] text-lg outline-none focus:border-[var(--duke-amber-edge)] font-mono placeholder:text-[color-mix(in_srgb,var(--duke-ink-hi)_20%,transparent)] transition-colors"
                                maxLength={25}
                            />
                            <button type="button" onClick={() => setShowSetupPassword(v => !v)}
                                aria-label={showSetupPassword ? 'Hide password' : 'Show password'} aria-pressed={showSetupPassword}
                                title={showSetupPassword ? 'Hide password' : 'Show password'}
                                className="absolute right-0 inset-y-0 w-12 flex items-center justify-center text-[var(--duke-ink-3)] hover:text-[var(--duke-amber-ink)] transition-colors">
                                {showSetupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* 🚀 RESIDENT EVIL STRENGTH METER 🚀 */}
                        <div className="mt-3">
                            <div className="flex justify-between items-end mb-1">
                                <span className={`text-[11px] font-black tracking-widest uppercase ${calculateStrength(setupPassword).color}`}>
                                    {calculateStrength(setupPassword).label}
                                </span>
                                <span className="text-[11px] text-[var(--duke-ink-3)] font-mono">LVL {calculateStrength(setupPassword).score}/5</span>
                            </div>
                            <div className="flex gap-1 h-1.5">
                                {[1, 2, 3, 4, 5].map(level => (
                                    <div 
                                        key={level} 
                                        className={`flex-1 rounded-[1px] transition-all duration-300 ${calculateStrength(setupPassword).score >= level ? calculateStrength(setupPassword).bar : 'bg-[var(--duke-veil-2)]'}`}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <input
                            type={showSetupSecret ? 'text' : 'password'}
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="SECRET RECOVERY WORD"
                            value={setupSecret}
                            onChange={(e) => setSetupSecret(e.target.value)}
                            className="w-full bg-[var(--duke-well-solid)] border border-[color-mix(in_srgb,var(--duke-amber-edge)_30%,transparent)] p-4 px-12 text-center text-[var(--shell-ink)] text-xs outline-none focus:border-[var(--duke-amber-edge)] uppercase tracking-widest placeholder:text-[color-mix(in_srgb,var(--duke-ink-hi)_20%,transparent)] font-mono transition-colors"
                        />
                        <button type="button" onClick={() => setShowSetupSecret(v => !v)}
                            aria-label={showSetupSecret ? 'Hide recovery word' : 'Show recovery word'} aria-pressed={showSetupSecret}
                            title={showSetupSecret ? 'Hide recovery word' : 'Show recovery word'}
                            className="absolute right-0 inset-y-0 w-12 flex items-center justify-center text-[var(--duke-ink-3)] hover:text-[var(--duke-amber-ink)] transition-colors">
                            {showSetupSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <button 
                        onClick={handleSetupSecurity} 
                        className={`w-full py-4 font-bold uppercase text-xs tracking-[0.2em] transition-all shadow-lg font-mono border ${calculateStrength(setupPassword).score === 5 && setupSecret ? 'bg-[color-mix(in_srgb,var(--duke-amber)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--duke-amber)_25%,transparent)] border-[color-mix(in_srgb,var(--duke-amber-edge)_50%,transparent)] text-[var(--duke-amber-ink)] hover:text-[var(--shell-ink)] cursor-pointer' : 'bg-[var(--duke-well-solid)] border-[var(--duke-edge-1)] text-[var(--duke-ink-3)] cursor-not-allowed opacity-50'}`}
                        disabled={calculateStrength(setupPassword).score < 5 || !setupSecret}
                    >
                        Save Credentials
                    </button>
                </div>
            ) : isOtpMode ? (
                /* CASE 2.5: OTP VERIFICATION */
                <div className="space-y-4 animate-fade-in">
                    <p className="text-[10px] text-[var(--duke-amber-ink)] uppercase font-bold mb-4 tracking-widest">Verify Email Authorization</p>
                    <p className="text-xs text-[var(--duke-ink-3)] mb-4">A 6-digit code has been sent to your registered Admin Email.</p>
                    <input type="number" placeholder="• • • • • •" className="w-full bg-[var(--duke-well-solid)] border border-[color-mix(in_srgb,var(--duke-amber-edge)_30%,transparent)] p-4 text-center text-[var(--shell-ink)] text-2xl outline-none tracking-[0.5em] focus:border-[var(--duke-amber-edge)] font-mono transition-colors" value={inputOtp} onChange={(e) => setInputOtp(e.target.value)} autoFocus maxLength={6} onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()} />
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => { setIsOtpMode(false); setIsResetMode(true); setInputOtp(""); }} className="flex-1 py-3 border border-[var(--duke-veil-edge)] text-[var(--duke-ink-2)] text-xs font-bold uppercase hover:text-[var(--duke-ink-hi)] hover:bg-[var(--duke-veil)] font-mono tracking-widest transition-colors">Abort</button>
                        <button onClick={handleVerifyOtp} className="flex-1 py-3 bg-[color-mix(in_srgb,var(--duke-amber)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--duke-amber)_25%,transparent)] border border-[color-mix(in_srgb,var(--duke-amber-edge)_50%,transparent)] text-[var(--duke-amber-ink)] hover:text-[var(--shell-ink)] text-xs font-bold uppercase font-mono tracking-widest transition-colors">Verify Code</button>
                    </div>
                </div>
            ) : isResetMode ? (
                /* CASE 2: RECOVERY MODE (Now with Loading State) */
                <div className="space-y-4">
                    <p className="text-[10px] text-orange-400 uppercase font-bold mb-4 tracking-widest">Enter Secret Word</p>
                   <div className="relative">
                   <input type={showResetWord ? 'text' : 'password'} id="resetWord" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="ENTER SECRET WORD..." className="w-full bg-[var(--duke-well-solid)] border border-orange-500/30 p-4 px-12 text-center text-[var(--duke-ink-hi)] text-xl outline-none tracking-widest focus:border-orange-500 font-mono placeholder:text-[color-mix(in_srgb,var(--duke-ink-hi)_20%,transparent)] transition-colors" autoFocus disabled={isSendingEmail} onKeyDown={(e) => e.key === 'Enter' && handleResetPin(e.target.value)}/>
                   <button type="button" onClick={() => setShowResetWord(v => !v)}
                       aria-label={showResetWord ? 'Hide secret word' : 'Show secret word'} aria-pressed={showResetWord}
                       title={showResetWord ? 'Hide secret word' : 'Show secret word'}
                       className="absolute right-0 inset-y-0 w-12 flex items-center justify-center text-[var(--duke-ink-3)] hover:text-orange-400 transition-colors">
                       {showResetWord ? <EyeOff size={18} /> : <Eye size={18} />}
                   </button>
                   </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setIsResetMode(false)} disabled={isSendingEmail} className="flex-1 py-3 border border-[var(--duke-veil-edge)] text-[var(--duke-ink-2)] text-xs font-bold uppercase hover:text-[var(--duke-ink-hi)] hover:bg-[var(--duke-veil)] font-mono tracking-widest transition-colors">Abort</button>
                        <button onClick={() => handleResetPin(document.getElementById('resetWord').value)} disabled={isSendingEmail} className={`flex-1 py-3 border text-xs font-bold uppercase font-mono tracking-widest transition-colors ${isSendingEmail ? 'bg-orange-900/50 border-orange-800 text-orange-700 cursor-wait' : 'bg-orange-600/20 hover:bg-orange-600 border-orange-500/50 text-orange-500 hover:text-[var(--duke-ink-hi)]'}`}>
                            {isSendingEmail ? 'Authorizing...' : 'Verify'}
                        </button>
                    </div>
                </div>
            ) : (
                /* CASE 3: STANDARD LOGIN — the preview's gate, value for value.
                   The field is an underline, not a box; the submit is a hairline, not a red
                   slab; and biometric drops to the small line beside recovery. Both are still
                   real buttons — the preview merged them into one label because nothing there
                   had to work. */
            <div>
                <div className="text-[9px] uppercase tracking-[0.34em] text-[var(--shell-ink-3)]">KPM Inventory</div>
                <div className="text-[13px] uppercase tracking-[0.2em] font-bold text-[var(--shell-ink-2)] mt-[7px] mb-[17px]">Master Vault</div>

              {/* A REAL FORM, not a div with a click handler. On a phone this is what turns the
                  keyboard's own key into GO — a second way in that does not depend on hitting a
                  40px target with the keyboard covering half the screen. The Enter key is handled
                  by onSubmit alone; the old onKeyDown was removed with it, because both together
                  would call handlePinLogin twice and each call spends one of his five tries. */}
              <form onSubmit={(e) => { e.preventDefault(); handlePinLogin(); }}>
                <div className="relative">
                <input
                    /* See CAN_MASK_TEXT_INPUT at the top of this file. Hidden, it falls back to a real
                       password field wherever the CSS mask is not supported — never plaintext. Shown
                       (the eye, his 2026-09-29 ask), it is plain text on purpose. */
                    type={showPin || CAN_MASK_TEXT_INPUT ? 'text' : 'password'}
                    style={!showPin && CAN_MASK_TEXT_INPUT ? { WebkitTextSecurity: 'disc', textSecurity: 'disc' } : undefined}
                    /* A text input would otherwise be offered to autofill, spellcheck and
                       autocapitalise — none of which should ever see a master password. */
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="MASTER PASSWORD"
                    className="w-full bg-transparent border-0 border-b border-[color-mix(in_srgb,var(--shell-orange-edge)_20%,transparent)] py-[11px] px-10 text-center font-mono text-[13px] tracking-[0.42em] text-[var(--shell-ink-2)] outline-none focus:border-[var(--shell-orange-edge)] placeholder:text-[#5f4a2c] placeholder:tracking-[0.16em] placeholder:text-[9.5px] transition-colors"
                    /* the box keeps its own text - a letter no longer re-renders the app (pinRef, above) */
                    ref={pinRef}
                    onChange={(e) => { if (!e.target.value) setShowPin(false); }}
                    /* Labels the phone's own return key GO instead of "return". */
                    enterKeyHint="go"
                    /* NOT on a phone — see IS_TOUCH at the top of this file. */
                    autoFocus={!IS_TOUCH}
                    maxLength={15}
                />
                {/* type="button": inside this form a plain button is a submit, and a submit spends one of his five tries */}
                <button type="button" onClick={() => setShowPin(v => !v)}
                    aria-label={showPin ? 'Hide password' : 'Show password'} aria-pressed={showPin}
                    title={showPin ? 'Hide password' : 'Show password'}
                    style={{ touchAction: 'manipulation' }}
                    className="absolute right-0 inset-y-0 w-10 flex items-center justify-center text-[var(--shell-ink-3)] hover:text-[var(--shell-orange-ink)] transition-colors">
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                </div>

                <button
                    type="submit"
                    /* touch-action: manipulation drops the double-tap-zoom wait, so the press
                       registers on the first tap rather than after the browser has finished
                       deciding whether a second one is coming. */
                    style={{ touchAction: 'manipulation' }}
                    /* While the press is being checked the button says so and takes no second
                       press — a second submit would spend one of his five tries. */
                    disabled={pinChecking || isUnlocking}
                    aria-busy={pinChecking}
                    className="w-full mt-[15px] py-3 font-mono text-[9.5px] font-bold uppercase tracking-[0.24em] bg-transparent text-[var(--shell-ink-2)] border border-[color-mix(in_srgb,var(--shell-orange-edge)_30%,transparent)] hover:border-[var(--shell-orange-edge)] hover:text-[#ffb066] hover:bg-[var(--shell-orange)]/[0.09] active:scale-[.975] transition-[transform,background-color,border-color,color] duration-150"
                >
                    {pinChecking
                        ? <span className="inline-flex items-center justify-center gap-2"><RefreshCcw size={12} className="animate-spin" /> Checking…</span>
                        : 'Open the vault'}
                </button>

                {/* type="button" on BOTH, or they inherit type=submit inside the form and a tap
                    on either would try the password instead — spending one of his five tries. */}
                <div className="mt-[11px] flex items-center justify-center gap-2 text-[8.5px] uppercase tracking-[0.16em] text-[var(--shell-ink-3)]">
                    {window.PublicKeyCredential && (<>
                        <button type="button" onClick={handleBiometricUnlock} style={{ touchAction: 'manipulation' }} className="py-1 hover:text-[var(--shell-ink-2)] transition-colors flex items-center gap-1.5">
                            <ScanFace size={11} /> Fingerprint
                        </button>
                        <span aria-hidden="true">·</span>
                    </>)}
                    <button type="button" onClick={() => setIsResetMode(true)} style={{ touchAction: 'manipulation' }} className="py-1 hover:text-[var(--shell-ink-2)] transition-colors">
                        Lost your key?
                    </button>
                </div>
                <UpdateStatus className="mt-[7px] text-[8.5px] tracking-[0.16em] text-[var(--shell-ink-3)]" />
              </form>
            </div>
            )}
                </>
            )}
          </div>
        </div>
      )}

      {/* THE LOOK-UP IS RUNNING — `user` is still null, the listener is reading the directory.
          Same island as the two lockouts, because it is the same moment in the same place, but it
          is a STATUS, not a verdict: no red, no shield, a turning arrow and the account being
          checked. It sits in the `!user` moment on purpose: nothing keyed on `user` (data
          subscriptions, the shell) starts until the role is known. A way out is kept, so a
          look-up that never lands cannot trap anyone. Solid ground: the sign-in door (z-80) is
          underneath and must not bleed through. */}
      {!user && checkingEmail && (
          <div className="kpm-dark-island fixed inset-0 z-[9999] bg-[var(--duke-well-solid)] flex flex-col items-center justify-center text-center p-6 font-mono">
              <RefreshCcw size={48} className="text-[var(--duke-amber-ink)] mb-6 animate-spin" />
              <h2 className="text-xl font-black text-[var(--duke-ink-hi)] uppercase tracking-[0.25em] mb-2">Checking your account</h2>
              <p className="text-[var(--duke-ink-3)] text-xs font-bold uppercase tracking-widest max-w-md leading-relaxed mb-8">
                  Looking up <span className="text-[var(--duke-amber-ink)]">[{checkingEmail}]</span> in the KPM Employee Directory. The first open on a new device takes a moment.
              </p>
              <button onClick={handleLogout} className="px-10 py-4 border-2 border-[color-mix(in_srgb,var(--duke-edge-2)_50%,transparent)] text-[var(--duke-ink-3)] font-black uppercase text-xs hover:bg-[var(--duke-well)] transition-all">
                  Disconnect Session
              </button>
          </div>
      )}

      {/* 3. MAIN TABS (Only render if user exists) - and not behind a T3-T6 entry lock (2026-10-01): the screens'
          own z-[9999] layers (Journey's Fullscreen button, the T5 landing tab) share the gate's stacking context and
          painted over it; nothing behind a lock should be in the page anyway. */}
      {user && !entryLocked && (
        <>
        {/* 🎭 THE COSTUME LABEL AND THE COSTUME RACK. The banner is rendered from the
            derived `previewing`, not from `pov`, so it can only ever appear when the
            app really is showing him another tier — the label and the disguise cannot
            come apart. Both gate on the TRUE email: wearing a tier-5 costume must not
            let the tier-5 screen open the rack and put on tier 2. */}
        <PovBanner account={previewing} onExit={handleExitPov} />
        {canUsePovSwitch(trueUser?.email) && (
            <TierPovSwitch
                open={showPovSwitch}
                current={previewing}
                places={povPlaces}
                onPick={handlePickPov}
                onExit={handleExitPov}
                onClose={() => setShowPovSwitch(false)}
            />
        )}
        {/* 🚀 THE HARD STOP: Blocks any email not found in the KPM Employee Directory */}
        {userRole === 'UNAUTHORIZED' ? (
            <div className="kpm-dark-island fixed inset-0 z-[9999] bg-[var(--duke-scrim-hi)] flex flex-col items-center justify-center text-center p-6 font-mono">
                <ShieldAlert size={64} className="text-red-600 mb-6 animate-pulse" />
                <h2 className="text-3xl font-black text-[var(--duke-ink-hi)] uppercase tracking-[0.25em] mb-2">Access Denied</h2>
                <p className="text-[var(--duke-ink-3)] text-xs font-bold uppercase tracking-widest max-w-md leading-relaxed mb-8">
                    The email <span className="text-red-500">[{user.email}]</span> is not registered in the KPM Employee Directory. Contact your System Administrator for clearance.
                </p>
                <button onClick={handleLogout} className="px-10 py-4 border-2 border-red-600/50 text-red-500 font-black uppercase text-xs hover:bg-red-900/30 transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                    Disconnect Session
                </button>
            </div>
        ) : userRole === 'OFFLINE_UNVERIFIED' ? (
            // 🚀 THE FIX: An honest, DIFFERENT message from Access Denied — this fires
            // only when we genuinely couldn't check (offline, and this device has never
            // cached this account before), never when the server actually said no.
            <div className="kpm-dark-island fixed inset-0 z-[9999] bg-[var(--duke-scrim-hi)] flex flex-col items-center justify-center text-center p-6 font-mono">
                <CloudOff size={64} className="text-amber-500 mb-6 animate-pulse" />
                <h2 className="text-3xl font-black text-[var(--duke-ink-hi)] uppercase tracking-[0.25em] mb-2">Can't Verify You Yet</h2>
                <p className="text-[var(--duke-ink-3)] text-xs font-bold uppercase tracking-widest max-w-md leading-relaxed mb-8">
                    We couldn't check the account <span className="text-amber-500">[{user.email}]</span> just now — the connection wasn't ready, so the answer came from this device instead of from the server. Nothing is wrong with your account. Press Retry, or wait a moment.
                </p>
                <button onClick={() => window.location.reload()} className="px-10 py-4 border-2 border-amber-500/50 text-amber-400 font-black uppercase text-xs hover:bg-amber-900/30 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] mb-4">
                    Retry
                </button>
                <button onClick={handleLogout} className="px-10 py-4 border-2 border-[color-mix(in_srgb,var(--duke-edge-2)_50%,transparent)] text-[var(--duke-ink-3)] font-black uppercase text-xs hover:bg-[color-mix(in_srgb,var(--duke-fill-panel)_30%,transparent)] transition-all">
                    Disconnect Session
                </button>
            </div>
        ) : (
            <>
            {/* 🚀 SUSPENSE BOUNDARY: Master wrapper for all lazy-loaded tabs */}
            <LazyTabBoundary key={activeTab} tab={activeTab}>
            <Suspense fallback={
                /* palette law: this spinner was the first thing the app ever showed, and it
                   showed it in a green nothing else in the app uses. A JSX {comment} cannot go
                   here — inside fallback={...} this is a JS expression slot, not children. */
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--duke-amber-ink)] font-mono space-y-4">
                    <div className="w-12 h-12 border-4 border-[color-mix(in_srgb,var(--duke-amber-edge)_20%,transparent)] border-t-[#ff9d00] rounded-full animate-spin"></div>
                    <p className="animate-pulse text-xs tracking-[0.2em] uppercase mt-4">Downloading Tactical Modules...</p>
                </div>
            }>

            {activeTab === 'dashboard' && (
                userRole === 'ADMIN' && !isAdmin ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center">
                        <div className="relative mb-8">
                        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse"></div>
                        {/* ⚠️ `bg-black`, AND THE RED STAYS A TAILWIND RED — this medallion is a
                            PLATE, not a surface. It reads the same on cream as on the bench
                            because its red sits on its own black, never on the page. The name
                            sweep had turned the disc into `--duke-well-solid`, which flips, and
                            that would have put a dark-red lock on a cream disc. Its twin in
                            SettingsView.jsx is the same three classes — keep them identical. */}
                        <div className="relative w-24 h-24 bg-black border-2 border-red-600 rounded-full flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                            <Lock size={40} className="animate-bounce-slow" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-[var(--duke-ink-hi)] uppercase tracking-[0.25em] mb-2 font-mono">Restricted Access</h2>
                    <p className="text-[var(--duke-ink-3)] text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed mb-8">Admin Clearance Required</p>
                    <button onClick={() => setShowAdminLogin(true)} className="px-10 py-4 border-2 border-[var(--duke-edge-4)] text-[var(--duke-ink-hi)] font-black uppercase text-xs hover:bg-[var(--duke-amber)] hover:text-black transition-all">Unlock System</button>
                </div>
            ) : (
                <DashboardView
                    isAdmin={isAdmin}
                    transactions={transactions}
                    inventory={inventory}
                    lowStockItems={lowStockItems}
                    setActiveTab={setActiveTab}
                    sessionStatus={sessionStatus}
                    auditLogs={auditLogs}
                    appSettings={appSettings}
                    handleSaveDashboardTargets={handleSaveDashboardTargets}
                    customers={displayCustomers}
                    motorists={motorists}
                    branchStock={branchStock}
                />
            )
          )}


          {/* MAP SYSTEM: Shows ALL customers (Read-only for agents to maintain situational awareness) */}
          {activeTab === 'map_war_room' && <MapMissionControl customers={userRole === 'ADMIN' ? displayCustomers : displayPermitted} transactions={transactions} inventory={inventory} db={db} appId={appId} user={user} logAudit={logAudit} triggerCapy={triggerCapy} isAdmin={isAdmin} savedHome={appSettings?.mapHome} onSetHome={handleSetMapHome} tierSettings={tierSettings} motorists={motorists} onNavigateToDirectory={() => setActiveTab('customers')} userRole={userRole} agentProfileId={agentProfileId} eodReports={eodReports} onShowStoreOnJourney={showStoreOnJourney} />}
          
         {/* JOURNEY PLAN: Strictly locked down to ONLY show Admin's authorized Pricing Tiers */}
         {activeTab === 'journey' && <JourneyView motorists={motorists} agentProfileId={agentProfileId} transactions={transactions} customers={displayPermitted} db={db} appId={appId} user={user} userRole={userRole} logAudit={logAudit} triggerCapy={triggerCapy} setActiveTab={setActiveTab} tierSettings={tierSettings} isAdmin={isAdmin} isLiteMode={isLiteMode} appSettings={appSettings} focusStore={journeyFocus} onFocusStoreHandled={() => setJourneyFocus(null)} eodReports={eodReports} />}
          {/* 🚀 UPGRADED FLEET ROUTER: Now fully controlled by the Matrix */}
          {activeTab === 'fleet' && (
            <FleetCanvasManager 
                db={db} 
                appId={appId} 
                user={user} 
                userRole={userRole}     // 🚀 NEW: Tell the manager who is looking
                previewing={previewing} // 🎭 POV keeps his real email, so the branch lookup must stand down
                inventory={inventory} 
                transactions={transactions} 
                customers={customers}   // the van chest's TITIP tab reads who holds a shop after a hand-off - no new listener
                appSettings={appSettings}
                logAudit={logAudit} 
                triggerCapy={triggerCapy} 
                isAdmin={isAdmin}
                motorists={motorists}
                masterUserId={userId}       // 🚀 `bossUid || user.uid` — see the note at the FleetCanvasManager signature
                agentProfileId={agentProfileId}  // 🎭 THE FALLBACK THE POV STAND-DOWN LANDS ON. Never passed until 2026-09-09,
                                                 // so under POV `myProfile` was find(m => m.id === undefined) — always nothing.
            />
          )}

        {activeTab === 'agent_profile' && (
              <AgentProfileView
                  motorists={motorists}
                  inventory={inventory}
                  userRole={userRole}
                  agentProfileId={agentProfileId}
                  db={db}
                  appId={appId}
                  userId={userId}
                  transactions={transactions}
                  storage={storage}
                  appSettings={appSettings}
                  career={career}
                  logAudit={logAudit}
                  customers={customers}   // CLOSED ?/? on the head - today's route from the Journey Plan (stage B, 2026-09-21)
              />
          )}

          
          {activeTab === 'inventory' && (
          <div className="h-auto min-h-[800px] lg:min-h-0 lg:h-[calc(100vh-140px)] w-full max-w-7xl mx-auto border-4 border-[var(--duke-frame)] shadow-[0_0_0_1px_var(--duke-lift)] relative flex flex-col">

              {/* searchTerm drives filteredInventory (the Sales Terminal's list reads it too). Its box lives INSIDE the
                  Master Vault's list now (2026-10-02): there were two search boxes, and on the phone this one sat above
                  the product screen. */}
              <ResidentEvilInventory
                  searchTerm={searchTerm}
                  onSearch={setSearchTerm}
                  inventory={filteredInventory}
                  onInspect={(item) => setExaminingProduct(item)}
                  motorists={motorists}
                  transactions={transactions}
                  isAdmin={isAdmin}
                  appSettings={appSettings}
                  backgroundSrc={appSettings?.inventoryBg}
                  onUploadBg={handleInventoryBgSelect}
                  
                  // --- UPDATED SAVE FUNCTION ---
                  onUpdateProduct={async (id, updates) => {
                      // updates contains { dimensions: ..., defaultZoom: ... }
                      try {
                          await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, id), updates);
                          triggerCapy("3D Settings Saved! 📦");
                          // Update local state immediately
                          setInventory(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
                      } catch(err) { console.error(err); notify("Save failed"); }
                  }}
                  // ---------------------------

                  onDelete={(id) => deleteProduct(id)}
                  onEdit={(item) => { 
                      setEditingProduct(item); 
                      setTempImages(item.images || {}); 
                      setBoxDimensions(item.dimensions || {w:55, h:90, d:22}); 
                      setUseFrontForBack(item.useFrontForBack || false); 
                  }}
                  onAddNew={() => { 
                      setEditingProduct({}); 
                      setTempImages({}); 
                      setBoxDimensions({w:55, h:90, d:22}); 
                      setUseFrontForBack(false); 
                  }}
              />
              
              {/* EDIT MODAL - AUTO HIDES WHEN CROPPING (fixes "Menu doesn't exit") */}
              {editingProduct && (
                <div 
                    className="fixed inset-0 z-[100] bg-[var(--duke-scrim-hi)] backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-300"
                    style={{ display: cropImageSrc ? 'none' : 'flex' }} // <--- MAGIC FIX: Hides when cropping
                >
                    <div className="bg-[var(--duke-well-solid)] border border-[var(--duke-veil-edge-3)] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative shadow-[0_0_50px_var(--duke-lift)]">
                        <button onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 text-[var(--duke-ink-hi)] hover:text-[var(--duke-danger-ink)]"><X size={24}/></button>
                        <h2 className="text-2xl font-bold text-[var(--duke-ink-hi)] mb-6 uppercase tracking-widest border-b border-[var(--duke-veil-edge-2)] pb-2">
                            {editingProduct.id ? "Edit Record" : "New Entry"}
                        </h2>
                        
                        <form onSubmit={handleSaveProduct} className="space-y-6 font-mono text-xs">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div><label className="text-[var(--duke-ink-8)] block mb-1">PRODUCT NAME</label><input name="name" defaultValue={editingProduct.name} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-veil-edge-2)] text-[var(--duke-ink-hi)] focus:border-[var(--duke-amber-edge)] outline-none"/></div>
                                    {/* the description shows in the fullscreen viewer (ExamineModal); handleSaveProduct takes it from the form like every other field (his 2026-10-10 "the description editor for each product is gone") */}
                                    <div><label className="text-[var(--duke-ink-8)] block mb-1">DESCRIPTION</label><textarea name="description" defaultValue={editingProduct.description || ''} rows={3} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-veil-edge-2)] text-[var(--duke-ink-hi)] focus:border-[var(--duke-amber-edge)] outline-none resize-y"/></div>

                                  {/* --- PINPOINT: Edit Product Modal --- */}
                                    <div className="grid grid-cols-4 gap-2">
                                        <div><label className="text-[10px] text-[var(--duke-ink-8)] block mb-1 tracking-widest">STOCK</label><input name="stock" type="number" step="any" defaultValue={editingProduct.stock} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-veil-edge)] text-[var(--shell-ink)] focus:border-[var(--duke-amber-edge)] outline-none transition-colors"/></div>
                                        <div><label className="text-[10px] text-[var(--duke-ink-8)] block mb-1 tracking-widest">MIN. ALERT (BKS)</label><input name="minStock" type="number" step="any" defaultValue={editingProduct.minStock || ''} placeholder={`pakai batas perusahaan (${appSettings?.defaultMinStockQty || 3} ${appSettings?.defaultMinStockUnit || 'Bal'})`} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-danger-edge)] text-[var(--duke-danger-ink)] focus:border-[var(--duke-danger-edge)] outline-none"/></div>
                                        {/* 🚀 NEW: STICKS PER PACK INPUT */}
                                        <div><label className="text-[10px] text-[var(--duke-ink-8)] block mb-1 tracking-widest">STICKS / BKS</label><input name="sticksPerPack" type="number" step="any" defaultValue={editingProduct.sticksPerPack || 16} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-veil-edge)] text-[var(--shell-ink)] focus:border-[var(--duke-amber-edge)] outline-none transition-colors"/></div>
                                        <div><label className="text-[10px] text-[var(--duke-ink-8)] block mb-1 tracking-widest">TYPE</label><input name="type" defaultValue={editingProduct.type} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-veil-edge-2)] text-[var(--duke-ink-hi)] focus:border-[var(--duke-veil-edge-3)] outline-none"/></div>
                                    </div>

                                    {/* PACKING. Every sale in Bal or Karton multiplies by these, and until now
                                        nothing wrote them — eight read sites across the app were all falling back
                                        to 10/20/4 for every product. Aldi's real stock varies (a Bal can be 100 or
                                        200 Bks, a Karton 4 or 5 Bal), so they have to be per product. */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div><label className="text-[10px] text-[var(--duke-ink-8)] block mb-1 tracking-widest">BKS / SLOP</label><input name="packsPerSlop" type="number" step="any" defaultValue={editingProduct.packsPerSlop || 10} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-brass-edge)] text-[var(--duke-brass-ink)] focus:border-[var(--duke-brass-edge)] outline-none"/></div>
                                        <div><label className="text-[10px] text-[var(--duke-ink-8)] block mb-1 tracking-widest">SLOP / BAL</label><input name="slopsPerBal" type="number" step="any" defaultValue={editingProduct.slopsPerBal || 20} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-brass-edge)] text-[var(--duke-brass-ink)] focus:border-[var(--duke-brass-edge)] outline-none"/></div>
                                        <div><label className="text-[10px] text-[var(--duke-ink-8)] block mb-1 tracking-widest">BAL / KARTON</label><input name="balsPerCarton" type="number" step="any" defaultValue={editingProduct.balsPerCarton || 4} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-brass-edge)] text-[var(--duke-brass-ink)] focus:border-[var(--duke-brass-edge)] outline-none"/></div>
                                    </div>

                                    {/* RESTORED: FRONT = BACK TOGGLE */}
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            id="useFront" 
                                            checked={useFrontForBack} 
                                            onChange={(e) => setUseFrontForBack(e.target.checked)}
                                            className="accent-orange-500 w-4 h-4"
                                        />
                                        <label htmlFor="useFront" className="text-[var(--duke-ink-hi)] text-xs cursor-pointer select-none">Use Front Image for Back</label>
                                    </div>

                                    {/* TEXTURE ASSETS (WITH PREVIEWS & EDIT BTN) */}
                                    <div className="p-3 border border-dashed border-[var(--duke-veil-edge-3)] text-center bg-[var(--duke-veil)]">
                                        <p className="text-[var(--shell-orange-ink)] font-bold mb-2">TEXTURE ASSETS</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['front', 'back', 'left', 'right', 'top', 'bottom'].map(face => {
                                                const hasImg = tempImages[face] || (editingProduct.images && editingProduct.images[face]);
                                                return (
                                                    <div 
                                                        key={face} 
                                                        className="h-12 bg-[var(--duke-well-solid)] border border-[var(--duke-veil-edge)] flex items-center justify-center text-[11px] text-[var(--duke-ink-8)] uppercase cursor-pointer hover:bg-[var(--duke-veil-2)] hover:text-[var(--duke-ink-hi)] transition-colors relative group overflow-hidden" 
                                                        onClick={() => document.getElementById(`file-edit-${face}`).click()}
                                                    >
                                                        {hasImg ? (
                                                            <>
                                                                <img src={hasImg} className="w-full h-full object-cover opacity-50 group-hover:opacity-100"/>
                                                                <div className="absolute inset-0 flex items-center justify-center bg-[var(--duke-well)] opacity-40 group-hover:opacity-100 transition-opacity">
                                                                    <Pencil size={12} className="text-[var(--duke-ink-hi)]"/>
                                                                </div>
                                                                {/* RESTORED: Edit from existing button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleEditExisting(face, hasImg); }}
                                                                    className="absolute top-0 right-0 p-1 bg-orange-600 text-[var(--duke-on-fill)] opacity-100 z-20"
                                                                    title="Edit Crop"
                                                                >
                                                                    <Crop size={8}/>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            face
                                                        )}
                                                        <input id={`file-edit-${face}`} type="file" className="hidden" onChange={(e) => handleProductFaceUpload(e, face)}/>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-[var(--duke-ink-hi)] border-b border-[var(--duke-veil-edge)] pb-1 mb-2">PRICING ENGINE</h3>
                                    <div><label className="text-[var(--duke-ink-8)] block mb-1">DISTRIBUTOR (MODAL)</label><input name="priceDistributor" type="number" step="any" defaultValue={editingProduct.priceDistributor} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-danger-edge)] text-[var(--duke-danger-ink)] focus:border-[var(--duke-danger-edge)] outline-none"/></div>
                                    <div><label className="text-[var(--duke-ink-8)] block mb-1">RETAIL PRICE</label><input name="priceRetail" type="number" step="any" defaultValue={editingProduct.priceRetail} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-veil-edge)] text-[var(--shell-ink)] focus:border-[var(--duke-amber-edge)] outline-none transition-colors"/></div>
                                    <div><label className="text-[var(--duke-ink-8)] block mb-1">GROSIR PRICE</label><input name="priceGrosir" type="number" step="any" defaultValue={editingProduct.priceGrosir} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-veil-edge)] text-[var(--shell-ink)] focus:border-[var(--duke-amber-edge)] outline-none transition-colors"/></div>
                                    <div><label className="text-[var(--duke-ink-8)] block mb-1">ECER PRICE</label><input name="priceEcer" type="number" step="any" defaultValue={editingProduct.priceEcer} className="w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-brass-edge)] text-[var(--duke-brass-ink)] focus:border-[var(--duke-brass-edge)] outline-none"/></div>
                                </div>
                            </div>
                            {/* type is explicit: this submits handleSaveProduct. It was relying on
                                a bare <button> defaulting to submit inside the form, which is easy
                                to break by accident and impossible to read at a glance. Hover and
                                press are the app's own gold, not the white/grey it had — no rotation,
                                so Lite Mode is unaffected. */}
                            <button
                                type="submit"
                                /* transition-[…] not transition-all: `all` makes the browser watch every
                                   animatable property on the element, and it will happily animate one
                                   nobody intended. Naming the four that actually change is both cheaper
                                   and predictable. */
                                /* ⚠️ --duke-on-plank, NOT --shell-ink. The plank under this label is a
                                   hardcoded near-black in BOTH themes, so an ink that flips to
                                   near-black in light put dark text on a dark plate. An ink only
                                   flips when the ground beneath it does. */
                                className="group w-full mt-6 py-4 bg-[#0d0a09] text-[var(--duke-on-plank)] font-black uppercase tracking-widest text-sm border-2 border-[#3a3128] border-b-[3px] border-b-[#ff9d00] shadow-[0_3px_0_rgba(0,0,0,0.55)] transition-[background-color,border-color,letter-spacing,transform] duration-150 ease-out hover:bg-[#1c1814] hover:border-[var(--duke-edge-3)] hover:border-b-[#ff9d00] hover:tracking-[0.22em] active:translate-y-[3px] active:shadow-none"
                            >
                                Update Database
                            </button>
                        </form>
                    </div>
                </div>
              )}
          </div>
      )}


      {/* MULTI-WAREHOUSE ERP ENGINE */}
          {/* 🔴 TWO SCROLLBARS — his report, 2026-08-26: *"why do we have double slider"*.
              This panel is the only tab that both SCROLLS ITSELF and guesses its own height from
              `100vh`. The guess came out ~38px taller than the shell's padded workspace, so the
              workspace overflowed by that sliver and drew a second, nearly full-height bar beside
              this one. `h-full` measures the workspace instead of guessing at the viewport, so the
              panel ends exactly where its parent does and only one bar is left.
              ⚠️ Keep the overflow HERE, not on the workspace: the tab strip and the completeness
              footer are pinned by this box, and moving the scroll outwards unpins both.
              ⚠️ And keep this comment OUTSIDE the `&& (` — a JSX comment there is a SECOND
              expression inside the parentheses, which does not parse. That broke the build once. */}
          {activeTab === 'restock_vault' && (
              <div className="h-auto min-h-[800px] lg:min-h-0 lg:h-full w-full max-w-7xl mx-auto border-2 lg:border-4 border-[var(--duke-frame)] shadow-[0_0_0_1px_var(--duke-lift)] relative flex flex-col bg-[var(--duke-well-solid)] p-2 lg:p-4 overflow-y-auto custom-scrollbar">
                  
                  {/* 🚀 HQ ONLY: FACTORY PROCUREMENT ENGINE (RESI, PHOTOS, DLL) */}
                  {isAdmin && (
                      <div className="mb-12 pb-12 border-b-4 border-[var(--duke-edge-1)] border-dashed">
                          <RestockVaultView
                              inventory={inventory}
                              procurements={procurements}
                              motorists={motorists}
                              /* 🔴 THE BRANCH'S OWN SHELF, and the desk cannot compute a minimum
                                 without it. HQ's `inventory` is HQ's stock; "how many should I send
                                 to BANDUNG" is arithmetic about BANDUNG's shelf, which only this map
                                 holds. BranchWarehouseManager has received it since the Sebaran Stok
                                 build; the desk had no reason to until the recommendation moved here. */
                              branchStockMap={branchStock}
                              db={db} 
                              storage={storage} 
                              appId={appId} 
                              user={user}
                              isAdmin={isAdmin}
                              userRole={userRole}
                              logAudit={logAudit}
                              triggerCapy={triggerCapy}
                              appSettings={appSettings}
                              masterUserId={userId}
                          />
                      </div>
                  )}

                  {/* 🚀 BRANCH WAREHOUSE ENGINE */}
                  <BranchWarehouseManager
                      db={db}
                      storage={storage}
                      appId={appId}
                      user={user} 
                      userRole={userRole} 
                      userLocation={user?.location || (agentProfileId ? motorists.find(m => m.id === agentProfileId)?.location : 'UNASSIGNED')} // 🚀 FIX: Read direct location
                      isAdmin={isAdmin} 
                      masterUserId={userId} 
                      globalInventory={inventory} 
                      motorists={motorists}
                      transactions={transactions}
                      branchStockMap={branchStock}
                      triggerCapy={triggerCapy} 
                      logAudit={logAudit} 
                      appSettings={appSettings}
                  />
              </div>
          )}

          

          {activeTab === 'sales' && (
              /* --- WHERE THE ADMIN FIELD MODE TOGGLE WENT ---
                 HIS REPORT, G5, twice: "mastervault and bosscar button and the notification
                 button is collapsing infront of the manifest paper". The first attempt blamed
                 its `z-[200]` and deleted it. That was not enough, and his phone on 2026-08-12
                 still showed the bar sitting on the paper.

                 The real fault is not a number, it is WHERE the bar lived. It was a row of the
                 app shell, ABOVE the terminal. The manifest drawer is fixed to the viewport and
                 opens over that whole band, and the two sit in different subtrees under
                 different positioned ancestors — so which one paints on top is decided by
                 stacking rules neither element states, and on a phone it went the wrong way.

                 So the bar stopped being shell. It is a row of the WARES COLUMN now, inside
                 MerchantSalesView — which is also what it actually controls: it chooses the
                 stock list drawn directly beneath it. Inside the terminal the drawer covers it
                 exactly as it covers every ware, because now it is the same box. It also gives
                 a phone back the ~60px this bar was reserving above everything. */
              <div className="h-full w-full relative bg-[var(--duke-well-solid)]">
                      <MerchantSalesView
                          isOnline={isOnline}
                          /* the boss signs in as the raw Firebase user, which carries no role of
                             its own; every other screen gets the live role this way, and this one
                             read it off `user` alone — so tier 1 arrived as tier 5 and got the
                             camera lock. His words, 2026-09-13: "tier 1 should be able to bypass
                             everything bro". */
                          userRole={userRole}
                          adminSalesMode={adminSalesMode}
                          onAdminSalesMode={userRole === 'ADMIN' ? setAdminSalesMode : undefined}
                          inventory={salesTerminalInventory} 
                          user={user} 
                          appSettings={appSettings}
                          customers={displayCustomers}
                          // 🚀 BUG FIX: Wire the exact Boss Car or Vault ID to the Sales Terminal
                          /* The SAME id every other database call in this file uses (`:318`,
                             `bossUid || user.uid`). The terminal used to re-derive its own without
                             bossUid, so a salesman wrote customers, IOUs and new outlets into his
                             own vault while reading the list out of the boss's — see
                             MerchantSalesView's dataOwnerId. RestockVaultView has been given this
                             same id as `masterUserId` since it was written. */
                          masterUserId={userId}
                          agentProfileId={userRole === 'ADMIN' ? (adminSalesMode === 'VEHICLE' ? 'ADMIN_VEHICLE' : 'VAULT') : agentProfileId}
                          allowedPayments={agentSettings.allowedPayments}
                          allowedTiers={agentSettings.allowedTiers}
                          allowRetur={userRole === 'ADMIN' ? true : (agentSettings.allowRetur || false)}
                          /* 🔴 NO `userRole === 'ADMIN' ? true` HERE. The privilege is decided once,
                             where agentSettings is built, and this line only passes it on.
                             It read `userRole === 'ADMIN' ? true : ...` until 2026-09-09 — a SECOND
                             copy of the same rule, at the render site, which kept the Buyback button
                             on screen for the owner after the settings branch had already been set
                             to false. The build stayed green, 1388 checks stayed green, and the
                             button was still there; only opening Retur Mode in the browser showed it. */
                          allowCashRefund={agentSettings.allowCashRefund || false}
                          onProcessSale={handleMerchantSale}
                          onInspect={(item) => setExaminingProduct(item)} 
                          // 🚀 FIXED: Plugged in ALL missing database and RPG engine connections!
                          db={db}
                          appId={appId}
                          isAdmin={isAdmin}
                          logAudit={logAudit}
                          triggerCapy={triggerCapy}
                          transactions={transactions}
                          storage={storage}
                      />
              </div>
          )}

        {activeTab === 'receivables' && (
              <ConsignmentFinanceView
                  transactions={transactions}
                  customers={customers}
                  focusStore={focusStore}
                  onFocusStoreHandled={() => setFocusStore(null)}
                  inventory={inventory}
                  onPayment={handleConsignmentPayment} 
                  onReturn={handleConsignmentReturn} 
                  onAddGoods={handleAddGoodsToCustomer}
                  onDeleteConsignment={handleDeleteConsignmentData}
                  isAdmin={isAdmin}
                  user={user}
                  agentProfileId={agentProfileId}
                  motorists={motorists}
                  transferRequests={transferRequests}
                  onShowStoreOnJourney={showStoreOnJourney}
                  onRequestTransfer={handleRequestTransfer}
                  onAgentAcceptTransfer={handleAgentAcceptTransfer}
                  onAdminApproveTransfer={handleAdminApproveTransfer}
                  appSettings={appSettings}
                  triggerCapy={triggerCapy}
              />
          )}

          {/* 🚀 NEW EOD ROUTER 🚀 */}
          {activeTab === 'eod' && (
              <EODReconciliationView 
                  appSettings={appSettings} 
                  samplings={samplings} 
                  transactions={transactions} 
                  inventory={inventory} 
                  agentCanvas={agentCanvas}
                  agentProfileId={agentProfileId}
                  motorists={motorists} 
                  eodReports={eodReports}
                  user={user}
                  onSubmitEOD={handleSubmitEOD}
                  onVerifyEOD={handleVerifyEOD}
                  onResetEOD={handleResetEOD}
                  isAdmin={isAdmin}
                  career={career}
                  ranks={progressionRanks}
                  customers={displayPermitted}
              />

          )}


          {activeTab === 'customers' && (
              <CustomerManagement
                  customers={customers}
                  db={db}
                  appId={appId}
                  user={user}
                  logAudit={logAudit}
                  triggerCapy={triggerCapy}
                  isAdmin={isAdmin}
                  userRole={userRole}
                  employeeRegion={user?.location || (agentProfileId ? motorists.find(m => m.id === agentProfileId)?.location : '')}
                  tierSettings={tierSettings}
                  onNavigateToMap={() => setActiveTab('map_war_room')}
                  onRequestCrop={(file) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                          setCropImageSrc(reader.result);
                          setActiveCropContext({ type: 'customer_staging', face: 'front' });
                          setBoxDimensions({ w: 100, h: 100, d: 0 }); // Square crop
                      };
                      reader.readAsDataURL(file);
                  }}
                  croppedImage={tempCustomerImage}
                  onClearCroppedImage={() => setTempCustomerImage(null)}
              />
          )}

        
          {activeTab === 'stock_opname' && (
              <StockOpnameView
    /* the boss's user object is the raw Firebase user with no role on it — see the same
       note on <MerchantSalesView>; without this the owner counts as a field agent here */
    userRole={userRole}
    inventory={inventory}
    db={db}
    storage={storage}
    appId={appId}
    user={{ ...user, userRole: userRole }}
    isAdmin={isAdmin}
    logAudit={logAudit}
    triggerCapy={triggerCapy}
    motorists={motorists}
    transactions={transactions}  // 🚀 INJECT THIS LINE HERE!
    appSettings={appSettings}
/>
          )}
          
          {activeTab === 'sampling' && (
              <>
                  {/* EDIT FOLDER MODAL */}
                  {editingFolder && (
                      <div className="fixed inset-0 z-50 bg-[var(--duke-badge)] flex items-center justify-center p-4">
                          <div className="bg-white dark:bg-[var(--duke-fill-panel)] p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                              <h3 className="font-bold text-lg mb-4 dark:text-[var(--duke-ink-hi)]">Rename Folder</h3>
                              <form onSubmit={processFolderEdit} className="space-y-4">
                                  <div><label className="text-xs font-bold text-[var(--duke-ink-3)]">Date</label><input name="newDate" type="date" defaultValue={editingFolder.oldDate} className="w-full p-2 rounded border dark:bg-[var(--duke-fill-well)] dark:border-[var(--duke-edge-2)] dark:text-[var(--duke-ink-hi)]"/></div>
                                  <div><label className="text-xs font-bold text-[var(--duke-ink-3)]">Location Name</label><input name="newReason" defaultValue={editingFolder.oldReason} className="w-full p-2 rounded border dark:bg-[var(--duke-fill-well)] dark:border-[var(--duke-edge-2)] dark:text-[var(--duke-ink-hi)]"/></div>
                                  <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setEditingFolder(null)} className="flex-1 py-2 bg-[#d2cec7] dark:bg-[var(--duke-fill-plank)] rounded-lg">Cancel</button><button className="flex-1 py-2 bg-orange-500 text-[var(--duke-on-fill)] rounded-lg font-bold">Save Move</button></div>
                              </form>
                          </div>
                      </div>
                  )}

                  {/* EDIT ITEM MODAL (The one you asked for) */}
                  <SampleEntryModal 
                      isOpen={!!editingSample} 
                      onClose={() => setEditingSample(null)} 
                      initialData={editingSample} 
                      inventory={inventory}
                      onSubmit={editingSample?.isNew ? handleBatchSamplingSubmit : handleUpdateSampling} // Logic switcher
                  />

                  {/* MAIN VIEW */}
                  {showSamplingAnalytics ? (
                      <SamplingAnalyticsView samplings={samplings} inventory={inventory} onBack={() => setShowSamplingAnalytics(false)} />
                  ) : (
                      <SamplingFolderView 
                          samplings={samplings} 
                          isAdmin={isAdmin} 
                          onRecordSample={() => setEditingSample({isNew:true})} // New Item
                          onDelete={handleDeleteSampling} 
                          onEdit={(s) => setEditingSample(s)} // Edit Item
                          onEditFolder={handleBatchFolderEdit}
                          onShowAnalytics={() => setShowSamplingAnalytics(true)}
                      />
                  )}
              </>
          )}
          
          {/* --- PINPOINT: Main App Render Block (Line 2618) --- */}
          {activeTab === 'transactions' && (
            <div className="max-w-6xl mx-auto">
              {/* WHAT SOLD, over a day, a week, a month or a year. It sits on Reports because that
                  is the screen he already opens to look at past sales, and directly above the
                  receipt list because the summary is what he came for and the receipts are the
                  detail underneath it. */}
              <ProductPerformancePanel db={db} appId={appId} userId={userId} inventory={inventory} />
            </div>
          )}
          {activeTab === 'transactions' && <HistoryReportView transactions={transactions} inventory={inventory} onDeleteFolder={handleDeleteHistory} onDeleteTransaction={handleDeleteSingleTransaction} isAdmin={isAdmin} user={user} userId={userId} appId={appId} db={db} appSettings={appSettings} userRole={userRole} agentProfileId={agentProfileId} fetchHistoricalTransactions={fetchHistoricalTransactions} motorists={motorists} customers={displayCustomers} />}
          
         {activeTab === 'audit' && (
             <AuditVaultView db={db} storage={storage} appId={appId} user={user} userId={userId} isAdmin={isAdmin} logAudit={logAudit} setBackupToast={setBackupToast} auditLogs={auditLogs} />
         )}




          {activeTab === 'settings' && (
              <SettingsView 
                  user={user} userId={userId} db={db} appId={appId}
                  isAdmin={isAdmin} isSystemOwner={isSystemOwner} userRole={userRole}
                  isLiteMode={isLiteMode} setIsLiteMode={setIsLiteMode} /* 🚀 LITE MODE PROP */
                  showCrownTransfer={showCrownTransfer} setShowCrownTransfer={setShowCrownTransfer}
                  triggerCapy={triggerCapy} setShowAdminLogin={setShowAdminLogin}
                  sessionStatus={sessionStatus} setSessionStatus={setSessionStatus} auditLogs={auditLogs}
                  handleMasterProtocol={handleMasterProtocol} handleSingleBackup={handleSingleBackup} handleRestoreData={handleRestoreData}
                  handleExportGranular={handleExportGranular} handleImportGranular={handleImportGranular} handleWipeData={handleWipeData}
                  currentUserEmail={currentUserEmail} handleChangePin={handleChangePin} handleAdminLogout={handleAdminLogout}
                  handleRegisterPasskey={handleRegisterPasskey} 
                          registeredPasskeys={registeredPasskeys} 
                          handleRemovePasskey={handleRemovePasskey}
                  tierSettings={tierSettings} setTierSettings={setTierSettings} handleSaveTiers={handleSaveTiers} handleExportTiers={handleExportTiers} handleImportTiers={handleImportTiers} handleTierIconSelect={handleTierIconSelect}
                  appSettings={appSettings} setAppSettings={setAppSettings}
                  /* the roster is the only registry of cabang there is — Settings needs it to offer
                     one spare-days box per warehouse, same source as the Tujuan picker */
                  motorists={motorists}
                  editCompanyProfile={editCompanyProfile} setEditCompanyProfile={setEditCompanyProfile} handleSaveCompanyProfile={handleSaveCompanyProfile}
                  handleMascotSelect={handleMascotSelect} newMascotMessage={newMascotMessage} setNewMascotMessage={setNewMascotMessage} handleAddMascotMessage={handleAddMascotMessage}
                  activeMessages={activeMessages} editingMsgIndex={editingMsgIndex} setEditingMsgIndex={setEditingMsgIndex} editMsgText={editMsgText} setEditMsgText={setEditMsgText} handleSaveEditedMessage={handleSaveEditedMessage} handleDeleteMascotMessage={handleDeleteMascotMessage}
                  triggerDiscoParty={triggerDiscoParty} isDiscoMode={isDiscoMode}
                  handleRecalculateCareer={handleRecalculateCareer}
                  /* 🔴 THESE TWO WERE ON <DashboardView>, WHICH READS NEITHER.
                     SettingsView gates the whole "Rebuild the sales totals" block on
                     `isSystemOwner && handleRebuildSalesStats`, so an undefined handler meant the
                     button had never rendered for anybody — the backfill it exists for could not
                     be run at all. Found 2026-09-09 while proving that the new Titip rule repairs
                     history: the rule is only half a fix if the button that applies it is missing. */
                  handleRebuildSalesStats={handleRebuildSalesStats} isRebuildingStats={isRebuildingStats}
              />
          )}
            </Suspense> {/* 🚀 CLOSING SUSPENSE BOUNDARY */}
            </LazyTabBoundary>
            </>
        )}
        </>
      )}

      {/* 🚀 THE OFFLINE FLIGHT RECORDER WIDGET */}
      {user && (
          <>
              {/* The Flight Recorder Terminal Modal */}
              {showFlightRecorder && (
                  <div className="fixed inset-0 z-[9999] bg-[var(--duke-badge)] backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                      {/* It is a RECORDER, so it should behave like one being switched on: the
                          case arrives first, then the tape reads itself out line by line. The
                          stagger is CSS-only (see .kpm-log-row) — no timers, and it re-runs every
                          time the panel opens because the rows are mounted fresh. */}
                      <div className="kpm-recorder bg-[var(--duke-well-solid)] border border-[var(--duke-edge-1)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                          <div className="bg-[var(--duke-fill-well)] p-4 border-b border-[var(--duke-edge-1)] flex justify-between items-center shrink-0">
                              <h3 className="text-[var(--duke-ink-hi)] font-black uppercase tracking-widest flex items-center gap-2"><Activity size={18} className="text-[var(--duke-amber-ink)]"/> Flight Recorder
                                  {/* The build actually running on THIS device. Read it out when a fix
                                      looks like it did not land - a stale cache and a real failure look
                                      the same from the outside. */}
                                  <span className="font-mono text-[10px] tracking-normal text-[var(--duke-ink-3)] normal-case">v{APP_VERSION} · {typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'}</span>
                              </h3>
                              <button onClick={() => setShowFlightRecorder(false)} className="text-[var(--duke-ink-3)] hover:text-[var(--duke-danger-ink)]"><X size={20}/></button>
                          </div>
                          
                          <div className="p-4 bg-[color-mix(in_srgb,var(--duke-fill-well)_60%,transparent)] flex justify-between items-center border-b border-[color-mix(in_srgb,var(--duke-edge-1)_60%,transparent)] shrink-0">
                              <div className="flex gap-4">
                                  <div className="text-center"><p className="text-[10px] text-[var(--duke-ink-3)] uppercase tracking-widest font-bold">Pending Receipts</p><p className="text-xl font-black text-[var(--duke-amber-ink)]">{pendingCount.transactions}</p></div>
                                  {/* was text-blue-500 — slate and blue were the only two colours
                                      in this panel that meant nothing. Pending NOO is a count, not
                                      an alarm, so it takes the quieter gold. */}
                                  <div className="text-center"><p className="text-[10px] text-[var(--duke-ink-3)] uppercase tracking-widest font-bold">Pending NOO</p><p className="text-xl font-black text-[var(--duke-brass-ink)]">{pendingCount.noo}</p></div>
                              </div>
                              <button onClick={clearFlightRecorder} className="px-3 py-1.5 bg-[color-mix(in_srgb,var(--danger)_20%,transparent)] text-[var(--duke-danger-ink)] border border-[color-mix(in_srgb,var(--duke-danger-edge)_40%,transparent)] rounded text-[11px] uppercase font-bold tracking-widest hover:bg-[var(--danger-plate)] hover:text-[var(--danger-plate-ink)] transition-colors">Clear Logs</button>
                          </div>

                          <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-2 bg-[var(--duke-well-solid)] font-mono">
                              
                              {/* 🚀 THE OFFLINE WAITING ROOM 🚀 */}
                              {pendingTxData && pendingTxData.length > 0 && (
                                  <div className="mb-6 border-b-2 border-[var(--duke-edge-1)] pb-4">
                                      <h3 className="text-[var(--shell-orange-ink)] font-black uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                                          <Database size={14}/> Ghost Ledger Queue ({pendingTxData.length})
                                      </h3>
                                      
                                      <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                          {pendingTxData.map((tx, idx) => (
                                              <details key={idx} className="bg-[var(--duke-fill-panel)] border border-[color-mix(in_srgb,var(--duke-amber-edge)_40%,transparent)] rounded-lg shadow-inner group">
                                                  <summary className="p-3 flex justify-between items-center cursor-pointer select-none list-none outline-none">
                                                      <div>
                                                          <span className="text-[var(--duke-ink-hi)] font-bold uppercase block text-xs">{tx.customerName}</span>
                                                          <span className="text-[var(--duke-ink-3)] text-[10px] uppercase">{tx.date}</span>
                                                      </div>
                                                      <div className="flex items-center gap-3">
                                                          <span className="bg-[color-mix(in_srgb,var(--duke-amber)_20%,transparent)] text-[var(--shell-orange-ink)] font-bold px-2 py-1 rounded text-[10px] uppercase border border-[color-mix(in_srgb,var(--duke-amber-edge)_50%,transparent)]">
                                                              IN QUEUE
                                                          </span>
                                                          <span className="text-[var(--shell-orange-ink)] text-[10px] uppercase font-bold bg-[var(--duke-bar-2)] px-2 py-1 rounded group-open:bg-[var(--duke-shade)] hover:text-[var(--duke-ink-hi)] transition-colors">
                                                              View Receipt ▼
                                                          </span>
                                                      </div>
                                                  </summary>
                                                  
                                                  {/* EXPANDED RECEIPT DETAILS */}
                                                  <div className="p-3 pt-0 border-t border-[color-mix(in_srgb,var(--duke-edge-1)_50%,transparent)] mt-1 bg-[var(--duke-bar-3)] rounded-b-lg">
                                                      <div className="space-y-1 mb-2 mt-2">
                                                          {tx.items?.map((item, i) => (
                                                              <div key={i} className="flex justify-between text-[10px] text-[var(--duke-ink-1)] border-b border-[color-mix(in_srgb,var(--duke-edge-1)_30%,transparent)] pb-1 mb-1">
                                                                  <span>{item.qty} {item.unit} <span className="font-bold text-[var(--duke-paper-ink)]">{item.name}</span></span>
                                                                  <span className="font-mono">Rp {new Intl.NumberFormat('id-ID').format(item.calculatedPrice * item.qty)}</span>
                                                              </div>
                                                          ))}
                                                      </div>
                                                      
                                                      <div className="flex justify-between items-center text-xs border-t border-[var(--duke-edge-2)] pt-2 mt-2">
                                                          <span className="text-[var(--duke-ink-3)] uppercase font-bold text-[10px]">Total Revenue</span>
                                                          <span className="text-[var(--shell-orange-ink)] font-black font-mono text-sm">Rp {new Intl.NumberFormat('id-ID').format(tx.total)}</span>
                                                      </div>
                                                  </div>
                                              </details>
                                          ))}
                                      </div>
                                  </div>
                              )}
                                      
                                     

                              <h3 className="text-[var(--duke-ink-3)] font-black uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
                                  <Activity size={12}/> System Telemetry Logs
                              </h3>

                              {syncLogs.length === 0 ? (
                                  <p className="text-[var(--duke-ink-3)] text-center py-10 text-xs uppercase tracking-widest">No sync events recorded.</p>
                              ) : (
                                  /* SUCCESS was green and the resting row was slate. Gold for done —
                                     the same plate the rest of the app uses for it — and the
                                     resting row is just the panel's own surface. Red and orange
                                     stay: those two are earning attention. */
                                  syncLogs.map((log) => (
                                      <div key={log.id} className={`kpm-log-row p-3 rounded border text-xs leading-relaxed ${log.type === 'ERROR' ? 'bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] border-[var(--duke-danger-edge)] text-[var(--duke-danger-ink)]' : log.type === 'SUCCESS' ? 'bg-[color-mix(in_srgb,var(--duke-brass-2)_10%,transparent)] border-[color-mix(in_srgb,var(--duke-brass-3)_60%,transparent)] text-[var(--duke-brass-ink)]' : log.type === 'OFFLINE' ? 'bg-[color-mix(in_srgb,var(--duke-amber)_15%,transparent)] border-[color-mix(in_srgb,var(--duke-amber-edge)_60%,transparent)] text-[var(--shell-orange-ink)]' : 'bg-[var(--duke-fill-well)] border-[var(--duke-edge-1)] text-[var(--duke-ink-1)]'}`}>
                                          <div className="text-[11px] font-bold opacity-70 mb-1 tabular-nums">{new Date(log.timestamp).toLocaleString()}</div>
                                          <div className="font-semibold">{log.message}</div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>
              )}
          </>
      )}

      {/* GLOBAL WIDGETS */}
      {/* The mascot belongs to the app, not to the door. His words, 2026-08-10: "i want u to
          hide the capybara on the login screen, capybara should shows when we are already log
          in". Two gates, and BOTH have to be past: signed in with Google (`user`) AND through
          the Master Vault (`!showAdminLogin`) — on his phone he was signed in already, so the
          mascot was standing next to the vault gate telling him to run a backup he could not
          reach. Not rendered rather than hidden with a class: the same class-hide was tried on
          the nav button hours earlier and was still visible in the running app. */}
      {/* ...and not over the photo cropper: its bubble sat on Crop & Save on the phone (2026-10-02) */}
      {user && !gateUp && !cropImageSrc && (
        <CapybaraMascot
            isDiscoMode={isDiscoMode}
            message={showCapyMsg ? capyMsg : null}
            onClick={() => cycleMascotMessage()}
            /* NO `staticImageSrc` ANY MORE. It used to be `appSettings.mascotImage`, which meant
               uploading a picture swapped the animated capybara for a still photo — the coupling
               behind his *"the picture is following the mascot image"*. That picture is the
               receipt watermark now, so the mascot is free to always be the mascot. */
            user={user}
            scale={appSettings?.mascotScale || 1}
        />
      )}
    </BiohazardTheme>
  );
}