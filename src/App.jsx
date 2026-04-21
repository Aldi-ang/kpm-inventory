import React, { useState, useEffect, useRef, useMemo } from 'react';
/* eslint-disable react-hooks/exhaustive-deps */
import packageJson from '../package.json'; // 🚀 INJECT THE PACKAGE LINK HERE


import { 
  LayoutDashboard, Package, ShoppingCart, FileText, 
  Settings, Sun, Moon, Search, Plus, Trash2, 
  Save, X, Upload, RotateCcw, Camera, Download,
  TrendingUp, AlertCircle, ChevronRight, ChevronLeft, DollarSign, Image as ImageIcon,
  User, Lock, ClipboardList, Crop, RotateCw, Move, Maximize2, ArrowRight, RefreshCcw, MessageSquarePlus, MinusCircle, ZoomIn, ZoomOut, Unlock,
  History, ShieldCheck, Copy, Replace, ClipboardCheck, Store, Wallet, Truck, Menu, MapPin, Phone, Edit, Folder,
  Key, MessageSquare, LogIn, LogOut, ShieldAlert, FileJson, UploadCloud, Tag, Calendar, XCircle, Printer, FileSpreadsheet, Pencil, Globe, Music, Database, Bell, ScanFace

} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

import emailjs from '@emailjs/browser';
import useTransactionEngine from './hooks/useTransactionEngine';
import useDatabaseSync from './hooks/useDatabaseSync'; 
import MapMissionControl from './MapMissionControl';
import JourneyView from './JourneyView';
import StockOpnameView from './StockOpnameView';
import MerchantSalesView from './MerchantSalesView';
import MusicPlayer from './MusicPlayer';
import RestockVaultView from './RestockVaultView';
import AgentInventoryView from './AgentInventoryView';
import FleetCanvasManager from './FleetCanvasManager';
import ConsignmentFinanceView from './ConsignmentFinanceView'; 
import EODReconciliationView from './EODReconciliationView'; 


// --- REUSABLE UI COMPONENTS ---
import NotificationBell from './components/NotificationBell';
import SafetyStatus from './components/SafetyStatus';
import CapybaraMascot from './components/CapybaraMascot';
import ImageCropper from './components/ImageCropper';
import ExamineModal from './components/ExamineModal';
import ResidentEvilInventory from './components/ResidentEvilInventory'; 
import LandlordDashboard from './components/LandlordDashboard'; 
import CrownTransferProtocol from './components/CrownTransferProtocol'; 
import HistoryReportView from './components/HistoryReportView'; 
import { SamplingAnalyticsView, SamplingCartView, SamplingFolderView, SampleEntryModal } from './components/SamplingManager'; 
import { CustomerManagement, CustomerDetailView } from './components/CustomerManager'; 
import SettingsView from './components/SettingsView'; 
import DashboardView from './components/DashboardView'; 
import AuditVaultView from './components/AuditVaultView'; 
import BiohazardTheme from './components/BiohazardTheme'; 
import BranchWarehouseManager from './components/BranchWarehouseManager';


// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";        
import { getAnalytics } from "firebase/analytics";   
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,     // <--- You already have this, perfect!
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
  getDocs, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  orderBy, 
  runTransaction, 
  writeBatch,
  enableIndexedDbPersistence // <--- ADD THIS FOR OFFLINE MODE
} from "firebase/firestore";

// --- CONFIG & UTILITIES IMPORTS ---
import { auth, db, storage, googleProvider, appId } from './config/firebase';
import { formatRupiah, getCurrentDate, getRandomColor, convertToBks } from './utils/helpers';

const APP_VERSION = packageJson.version;

// --- GLOBAL COMPONENTS (MOVED UP TO PREVENT CRASH) ---





















// --- MAIN APP COMPONENT ---
export default function KPMInventoryApp() {  // <--- ONLY ONE OPENING BRACE

  const [user, setUser] = useState(null);
  // ... rest of your code ...
  const [isAdmin, setIsAdmin] = useState(false); // 🚨 FIXED: Default to locked out!
  const [sessionStatus, setSessionStatus] = useState({ recovery: false, usb: false, cloud: false });
  const [isSystemOwner, setIsSystemOwner] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showCrownTransfer, setShowCrownTransfer] = useState(false); // 🚀 ADD THIS
  const [adminPin, setAdminPin] = useState(null);       
  const [hasAdminPin, setHasAdminPin] = useState(false); 
  const [inputPin, setInputPin] = useState("");         
  const [isSetupMode, setIsSetupMode] = useState(false); 

  const [loginError, setLoginError] = useState(null); // <--- Add this to track login errors
  const [backupToast, setBackupToast] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(localStorage.getItem('passkeyRegistered') === 'true');

// --- PHASE 2: ROLE-BASED ACCESS CONTROL (RBAC) STATE ---
  const [userRole, setUserRole] = useState('ADMIN'); 
  const [bossUid, setBossUid] = useState(null);
  const [agentProfileId, setAgentProfileId] = useState(null);
  const [agentCanvas, setAgentCanvas] = useState([]);
 
  const [adminSalesMode, setAdminSalesMode] = useState('VAULT'); // 'VAULT' or 'VEHICLE'
  
  // NEW: Agent Permissions State
  const [agentSettings, setAgentSettings] = useState({ allowedPayments: ['Cash', 'QRIS', 'Transfer', 'Titip'], allowedTiers: ['Retail', 'Grosir', 'Ecer'] });

  // 🛑 THE DATABASE HIJACK: If bossUid exists, ALL database calls globally redirect to the Admin's vault.
  const userId = bossUid || user?.uid || user?.id || 'default';

 
  // --- DATABASE SYNC ENGINE (MOVED HERE!) ---
  const {
      inventory, setInventory, customers, setCustomers, transactions, setTransactions,
      samplings, setSamplings, auditLogs, setAuditLogs, procurements, setProcurements,
      motorists, setMotorists, agentInventories, setAgentInventories, eodReports, setEodReports,
      transferRequests, setTransferRequests, notifications, setNotifications,
      adminCanvas, setAdminCanvas, // 🚀 FIX 2: CORRECTED THE NAMING!
      appSettings, setAppSettings, editCompanyProfile, setEditCompanyProfile
  } = useDatabaseSync(db, appId, user, userId, userRole, agentProfileId);



// Helper to include Hours and Minutes in the filename
  // --- DOWNLOAD ENGINE HELPERS ---
  const getCurrentTimestamp = () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
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
      
      let mapSettings = [];
      try {
          // Explicitly fetch map borders/regions
          const mapSnap = await getDocs(collection(db, `artifacts/${appId}/users/${user.uid}/mapSettings`));
          mapSettings = mapSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { console.warn("Could not fetch map settings"); }

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
          inventory, transactions, customers: deepCustomers, samplings, auditLogs, procurements, appSettings, tierSettings, mapSettings
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
          alert("Failed to save targets.");
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
    if (!window.confirm(confirmMsg)) return;

    if (!window.confirm(`FINAL WARNING: This cannot be undone. Proceed with deletion?`)) return;

    try {
        triggerCapy(`Initiating data wipe for ${type}... 🗑️`);
        const batch = writeBatch(db);
        let deleteCount = 0;
        
        if (type === 'products' || type === 'both') {
            inventory.forEach(item => {
                batch.delete(doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id));
                deleteCount++;
            });
        }

        if (type === 'customers' || type === 'both') {
            for (const cust of customers) {
                // Delete competitor benchmarks first
                const benchSnap = await getDocs(collection(db, `artifacts/${appId}/users/${user.uid}/customers/${cust.id}/benchmarks`));
                benchSnap.forEach(b => {
                    batch.delete(doc(db, `artifacts/${appId}/users/${user.uid}/customers/${cust.id}/benchmarks`, b.id));
                });
                // Delete customer
                batch.delete(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, cust.id));
                deleteCount++;
            }
        }

        await batch.commit();
        await logAudit("DATA_WIPE", `Wiped ${type} data.`);
        triggerCapy(`Data wipe complete. Clean slate! ✨`);
    } catch (err) {
        console.error("Wipe failed:", err);
        alert("Data Wipe Failed: " + err.message);
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
                // Dig into the sub-collection to grab the benchmarks
                const benchSnap = await getDocs(collection(db, `artifacts/${appId}/users/${user.uid}/customers/${cust.id}/benchmarks`));
                custCopy.benchmarks = benchSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) {
                custCopy.benchmarks = [];
            }
            deepCustomers.push(custCopy);
        }
        exportData.customers = deepCustomers; 
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
  const handleImportGranular = (e, targetType) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    if(!window.confirm(`Import ${targetType} data? This will overwrite existing items with the same ID.`)) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            const batch = writeBatch(db);

            if ((targetType === 'products' || targetType === 'both') && data.inventory) {
                data.inventory.forEach(item => {
                    batch.set(doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id), item);
                });
            }
            if ((targetType === 'customers' || targetType === 'both') && data.customers) {
                data.customers.forEach(c => {
                    const cData = { ...c };
                    const benchmarks = cData.benchmarks || [];
                    delete cData.benchmarks; // Keep main profile clean

                    // Save customer
                    batch.set(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, c.id), cData);
                    
                    // Save deep competitor data
                    benchmarks.forEach(b => {
                        batch.set(doc(db, `artifacts/${appId}/users/${user.uid}/customers/${c.id}/benchmarks`, b.id), b);
                    });
                });
            }
            
            await batch.commit();
            triggerCapy(`${targetType.toUpperCase()} data imported successfully!`);
        } catch (err) { alert("Import Failed: " + err.message); }
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

  // 📧 NEW: Email OTP Recovery States
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [inputOtp, setInputOtp] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // 🔐 NEW: Real-time Password Strength State
  const [setupPassword, setSetupPassword] = useState("");
  const [setupSecret, setSetupSecret] = useState("");

  const calculateStrength = (pass) => {
      let score = 0;
      if (!pass) return { score: 0, label: "AWAITING INPUT", color: "text-slate-500", bar: "bg-slate-800" };
      if (pass.length >= 8) score++;
      if (/[a-z]/.test(pass)) score++;
      if (/[A-Z]/.test(pass)) score++;
      if (/\d/.test(pass)) score++;
      if (/[@$!%*?&#\-_]/.test(pass)) score++;

      if (score <= 2) return { score, label: "CRITICAL VULNERABILITY (WEAK)", color: "text-red-500", bar: "bg-red-600 shadow-[0_0_10px_red]" };
      if (score <= 4) return { score, label: "SUB-OPTIMAL (MODERATE)", color: "text-orange-500", bar: "bg-orange-500 shadow-[0_0_10px_orange]" };
      return { score, label: "ENCRYPTION SECURE (STRONG)", color: "text-emerald-500", bar: "bg-emerald-500 shadow-[0_0_10px_emerald]" };
  };

  // 1. INITIAL CHECK: Does a PIN exist?
  useEffect(() => {
    const checkAdminStatus = async () => {
        if (!user) return;
        const ref = doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'admin');
        const snap = await getDoc(ref);
        
        if (snap.exists() && snap.data().pin) {
            setAdminPin(snap.data().pin);
            setRecoveryWord(snap.data().recoveryWord || "");
            setHasAdminPin(true);
            setIsSetupMode(false);
        } else {
            // No PIN found: Force Setup Mode
            setHasAdminPin(false);
            setIsSetupMode(true);
        }
    };
    checkAdminStatus();
  }, [user]);

  // 🔐 CRYPTOGRAPHIC ENGINE: SHA-256 Hash Generator
  const hashSecretWord = async (word) => {
      const msgBuffer = new TextEncoder().encode(word.toLowerCase().trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // 2. SETUP: Create MASTER PASSWORD & Secret Word (FULLY HASHED)
  const handleSetupSecurity = async () => {
    const strength = calculateStrength(setupPassword);
    
    // 🚨 ABSOLUTE HARD LOCK: Blocks "password" or anything under level 5
    if (strength.score < 5) { 
        setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
        alert("Encryption Failed: Password must reach Level 5 security (8+ chars, Upper, Lower, Number, Symbol)."); 
        return; 
    }
    if (!setupSecret || !setupSecret.trim()) { 
        setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
        alert("Secret recovery word is required!"); 
        return; 
    }

    try {
        const scrambledWordHash = await hashSecretWord(setupSecret);
        const scrambledPinHash = await hashSecretWord(setupPassword);
        
        await setDoc(doc(db, `artifacts/${appId}/users/${userId}/settings`, 'admin'), {
            pin: scrambledPinHash,           
            recoveryHash: scrambledWordHash, 
            failedRecoveryAttempts: 0,   
            lockoutStatus: "NONE",
            updatedAt: serverTimestamp()
        });

        setAdminPin(scrambledPinHash);
        setHasAdminPin(true);
        setIsSetupMode(false);
        setIsAdmin(true); 
        setShowAdminLogin(false);
        setSetupPassword("");
        setSetupSecret("");
        
        alert("Security Protocol Established! Vault Unlocked.");
    } catch (error) {
        console.error("Save Error:", error);
        alert(`Database Error: Could not save credentials.`);
    }
  };

  // 3. LOGIN: Verify PIN (NOW WITH HASH & 5-STRIKE LOCKOUT)
  const handlePinLogin = async () => {
      if (!inputPin || inputPin.trim() === "") {
          setAuthShake(true); setTimeout(() => setAuthShake(false), 500); return;
      }

      try {
          // Fetch the live security profile
          const adminDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'admin');
          const adminSnap = await getDoc(adminDocRef);
          if (!adminSnap.exists()) return;
          const data = adminSnap.data();

          // Check if already locked out
          if (data.lockoutStatus === "PERMANENT" || data.failedRecoveryAttempts >= 5) {
              alert("SECURITY LOCKOUT: Maximum attempts exceeded. Please unlock via Firebase Console.");
              setInputPin("");
              return;
          }

          // 🚨 CRITICAL: Hash the inputted PIN to compare against the database hash
          const hashedInput = await hashSecretWord(inputPin.trim());

        
              if (hashedInput === data.pin) {
              // SUCCESS: Reset strikes & Trigger Cinematic Unlock
              await updateDoc(adminDocRef, { failedRecoveryAttempts: 0, lockoutStatus: "NONE" });
              setIsUnlocking(true);
              
              // Wait 2.5 seconds for the animation to finish before revealing dashboard
              setTimeout(() => {
                  setIsAdmin(true);
                  setShowAdminLogin(false);
                  setIsUnlocking(false);
                  setInputPin("");
              }, 2500);
          } else {
              // FAILED: Add a strike to the database
              const newStrikes = (data.failedRecoveryAttempts || 0) + 1;
              const newLockout = newStrikes >= 5 ? "PERMANENT" : "NONE";
              await updateDoc(adminDocRef, { failedRecoveryAttempts: newStrikes, lockoutStatus: newLockout });
              
              setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
              setInputPin("");
              alert(`Incorrect PIN. Strike ${newStrikes}/5.`);
          }
      } catch (error) {
          console.error("Login Error:", error);
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

        const adminDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'admin');
        const adminSnap = await getDoc(adminDocRef);
        
        if (!adminSnap.exists()) { alert("No security profile found."); setIsSendingEmail(false); return; }
        const data = adminSnap.data();

        if (data.lockoutStatus === "PERMANENT" || data.failedRecoveryAttempts >= 5) {
            alert("SECURITY LOCKOUT: Maximum attempts exceeded. Please unlock via Firebase Console.");
            setIsSendingEmail(false); return;
        }

        const guessHash = await hashSecretWord(cleanWord);
        
        if (guessHash === data.recoveryHash) {
            await updateDoc(adminDocRef, { failedRecoveryAttempts: 0, lockoutStatus: "NONE" });
            
            // 📧 LAYER 3: GENERATE & SEND EMAIL OTP
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedOtp(newOtp);

            try {
                await emailjs.send(
                    'service_b564nlp',
                    'template_89lgavp',
                    { otp_code: newOtp }, 
                    'veSkmuEcR5qSImMSq'  // 🔐 BRAND NEW SECURE PUBLIC KEY
                );
                setIsResetMode(false);
                setIsOtpMode(true); 
            } catch (emailErr) {
                console.error("EmailJS Error:", emailErr);
                alert("Identity verified, but failed to send OTP email. Check your internet or EmailJS account limits.");
            }
        } else {
            const newStrikes = (data.failedRecoveryAttempts || 0) + 1;
            const newLockout = newStrikes >= 5 ? "PERMANENT" : "NONE";
            await updateDoc(adminDocRef, { failedRecoveryAttempts: newStrikes, lockoutStatus: newLockout });
            
            setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
            alert(`Access Denied. Strike ${newStrikes}/5.`);
        }
    } catch (error) {
        console.error("Recovery Error:", error);
        alert("System error during recovery verification.");
    }
    setIsSendingEmail(false);
  };

  // 5. OTP VERIFICATION: Layer 3
  const handleVerifyOtp = () => {
      if (inputOtp === generatedOtp) {
          setIsOtpMode(false);
          setIsSetupMode(true);
          setInputOtp("");
          alert("Authorization Code Accepted. You may now create new Master Credentials.");
      } else {
          setAuthShake(true); setTimeout(() => setAuthShake(false), 500);
          setInputOtp("");
      }
  };

// --- PINPOINT: Line 1830 (Add this missing function to fix the crash) ---
  const handleChangePin = () => {
      // Switches the modal to "Setup Mode" so you can overwrite the old PIN
      setIsSetupMode(true); 
      setShowAdminLogin(true);
      setIsResetMode(false);
      setInputPin("");
      triggerCapy("Initialize PIN Reset Protocol.");
  };

  // 🚀 PASSKEY REGISTRATION ENGINE (NEW) 🚀
  const handleRegisterPasskey = async () => {
      try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          const userId = new Uint8Array(16);
          window.crypto.getRandomValues(userId);

          const credential = await navigator.credentials.create({
              publicKey: {
                  challenge: challenge,
                  rp: { name: "Inventory System", id: window.location.hostname },
                  user: { id: userId, name: user?.email || "Admin", displayName: "Administrator" },
                  pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
                  authenticatorSelection: { 
                      // 🚨 REMOVED 'authenticatorAttachment' so Windows allows Fingerprint, Phone, AND USB Keys!
                      userVerification: "required" 
                  },
                  timeout: 60000
              }
          });

          if (credential) {
              localStorage.setItem('passkeyRegistered', 'true'); 
              setHasPasskey(true); // 🚨 NEW: INSTANTLY UPDATES UI
              alert("Biometric Passkey Successfully Registered to this device!");
          }
      } catch (error) {
          console.error("Passkey registration failed:", error);
          alert("Could not register fingerprint. Check your OS settings.");
      }
  };

  // 🚀 BIOMETRIC UNLOCK ENGINE (UPDATED) 🚀
  const handleBiometricUnlock = async () => {
      try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);

          const assertion = await navigator.credentials.get({
              publicKey: {
                  challenge: challenge,
                  rpId: window.location.hostname, // 🚨 TELLS OS TO LOOK FOR LOCAL PASSKEY
                  userVerification: "required",
                  timeout: 60000
              }
          });

         // 🎬 THE NEW CINEMATIC BIOMETRIC UNLOCK
          if (assertion) {
              setIsUnlocking(true);
              setTimeout(() => {
                  setIsAdmin(true);
                  setShowAdminLogin(false);
                  setIsUnlocking(false);
              }, 2500);
          }
      } catch (error) {
          console.warn("Biometric scan failed or canceled:", error);
      }
  };
  




  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);



  const [cart, setCart] = useState([]);
  const [opnameData, setOpnameData] = useState({});
  const hasAlertedLowStock = useRef(false);


  // 1. Calculate low stock items (Threshold is minStock or default to 5)
  const lowStockItems = useMemo(() => {
      return inventory.filter(item => item.stock <= (item.minStock || 5));
  }, [inventory]);

  // 2. Capybara Intercept on Login
  useEffect(() => {
      if (user && isAdmin && lowStockItems.length > 0 && !hasAlertedLowStock.current) {
          // Find the most valuable item running out
          const priorityItem = [...lowStockItems].sort((a, b) => (b.priceRetail || 0) - (a.priceRetail || 0))[0];
          
          setTimeout(() => {
              triggerCapy(`⚠️ BOSS! ${priorityItem.name} is critically low (${priorityItem.stock} left). Restock needed!`);
          }, 3500); // 3.5s delay so it triggers right after the welcome message
          
          hasAlertedLowStock.current = true;
      }
  }, [user, isAdmin, lowStockItems]);
  

// --- NEW: TIER SETTINGS STATE ---
  const DEFAULT_TIERS = [
      { id: 'Platinum', label: 'Platinum', color: '#f59e0b', iconType: 'emoji', value: '🏆' },
      { id: 'Gold', label: 'Gold', color: '#fbbf24', iconType: 'emoji', value: '🥇' },
      { id: 'Silver', label: 'Silver', color: '#94a3b8', iconType: 'emoji', value: '🥈' },
      { id: 'Bronze', label: 'Bronze', color: '#78350f', iconType: 'emoji', value: '🥉' }
  ];
  const [tierSettings, setTierSettings] = useState(DEFAULT_TIERS);

  // Load Tiers from DB
  useEffect(() => {
      if(!user) return;
      const unsubTiers = onSnapshot(doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'tiers'), (snap) => {
          if (snap.exists() && snap.data().list) {
              setTierSettings(snap.data().list);
          }
      });
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
          alert("Failed to save tier settings.");
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
  const handleImportTiers = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if(!window.confirm("Import Icons? This will overwrite your current map pins.")) return;

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
              alert("Import Failed: " + err.message);
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
                  
                  // APPLY RESTRICTIONS: Default strictly to Cash and Retail/Ecer if admin hasn't set otherwise
                  setAgentSettings({
                      allowedPayments: data.allowedPayments || ['Cash'],
                      allowedTiers: data.allowedTiers || ['Retail', 'Ecer']
                  });
              }
          });
          return () => unsub();
      } else {
          // ADMIN: Full access to all payments and tiers
          setAgentSettings({ allowedPayments: ['Cash', 'QRIS', 'Transfer', 'Titip'], allowedTiers: ['Retail', 'Grosir', 'Ecer'] });
      }
  }, [userRole, agentProfileId, db, appId, userId]);

  // 🚀 NOTIFICATION CLICK HANDLER 🚀
  const handleNotificationClick = async (notification) => {
      // 1. Mark as Read in Database
      if (!notification.read) {
          try {
              await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/notifications`, notification.id), { read: true });
          } catch (e) { console.error("Error marking read", e); }
      }
      // 2. Jump straight to the relevant tab!
      if (notification.linkToTab) {
          setActiveTab(notification.linkToTab);
      }
  };

  // 🚀 ACCOUNT TRANSFER HANDLERS (3-KEY PROTOCOL) 🚀
  const handleRequestTransfer = async (storeName, toAgentId, toAgentName, note) => {
      try {
          await addDoc(collection(db, `artifacts/${appId}/users/${userId}/account_transfers`), {
              storeName,
              fromAgentId: agentProfileId,
              fromAgentName: user.displayName || user.email.split('@')[0],
              toAgentId,
              toAgentName,
              note,
              status: 'PENDING_AGENT',
              timestamp: serverTimestamp()
          });
          triggerCapy(`Transfer request for ${storeName} sent to ${toAgentName}!`);
      } catch (e) { console.error(e); alert("Failed to request transfer: " + e.message); }
  };

  const handleAgentAcceptTransfer = async (requestId, isAccepted) => {
      try {
          const reqRef = doc(db, `artifacts/${appId}/users/${userId}/account_transfers`, requestId);
          await updateDoc(reqRef, { 
              status: isAccepted ? 'PENDING_ADMIN' : 'REJECTED',
              respondedAt: serverTimestamp()
          });
          triggerCapy(isAccepted ? "Transfer accepted! Waiting for Admin approval." : "Transfer rejected.");
      } catch (e) { console.error(e); alert("Action failed: " + e.message); }
  };

  const handleAdminApproveTransfer = async (request, isApproved) => {
      if (!window.confirm(`${isApproved ? 'Approve' : 'Reject'} the transfer of ${request.storeName} to ${request.toAgentName}?`)) return;
      try {
          const batch = writeBatch(db);
          
          // 1. Update the request ticket
          const reqRef = doc(db, `artifacts/${appId}/users/${userId}/account_transfers`, request.id);
          batch.update(reqRef, { status: isApproved ? 'APPROVED' : 'REJECTED', finalizedAt: serverTimestamp() });

          // 2. If approved, rewrite the entire history of this store to the new agent!
          if (isApproved) {
              const storeTx = transactions.filter(t => (t.customerName || '').trim().toLowerCase() === request.storeName.trim().toLowerCase());
              storeTx.forEach(t => {
                  const tRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, t.id);
                  batch.update(tRef, { agentId: request.toAgentId, agentName: request.toAgentName });
              });
          }

          await batch.commit();
          if (isApproved) await logAudit("TRANSFER_APPROVED", `Reassigned ${request.storeName} to ${request.toAgentName}`);
          triggerCapy(isApproved ? "Transfer complete! Debt reassigned." : "Transfer declined.");
      } catch(e) { console.error(e); alert("Failed: " + e.message); }
  };


 // 🚀 EOD HANDLERS 🚀
  const handleSubmitEOD = async (reportData) => {
      try {
          // 🚀 PHASE 1 FIX: Force the exact format "Mas Gilga - theonlygilgamesh@gmail.com"
          // We pull the exact registered email, ignoring what Google tries to force.
          const formattedAgentName = `${user.displayName || "Field Agent"} - ${user.email || "No Email"}`;

          // 1. Save the EOD Report
          await addDoc(collection(db, `artifacts/${appId}/users/${userId}/eod_reports`), {
              agentName: formattedAgentName, 
              agentId: agentProfileId || 'ADMIN',
              timestamp: serverTimestamp(),
              status: 'PENDING',
              ...reportData 
          });

          // 🚀 PHASE 2 FIX: Trigger the Admin Notification Bell!
          // This drops a message directly into the Admin's notification inbox.
          if (!isAdmin) {
              await addDoc(collection(db, `artifacts/${appId}/users/${userId}/notifications`), {
                  title: "💰 EOD Submitted",
                  message: `${formattedAgentName} submitted an EOD report. Pending your verification.`,
                  type: "EOD_APPROVAL",
                  isRead: false,
                  timestamp: serverTimestamp(),
                  agentId: agentProfileId
              });
          }

          triggerCapy("EOD Report submitted! Admin has been notified.");
      } catch (e) { 
          console.error(e); 
          alert("Failed to submit EOD: " + e.message); 
      }
  };

  // 🚀 ADMIN EOD PROTOCOLS (Verify & Reset) 🚀
  const handleVerifyEOD = async (report) => {
      if(!window.confirm(`Verify EOD for ${report.agentName}? This clears their inventory and returns it to the Vault.`)) return;
      try {
          await runTransaction(db, async (t) => {
              for (const item of (report.remainingStock || [])) {
                  if (item.qty > 0) {
                      const pRef = doc(db, `artifacts/${appId}/users/${userId}/products`, item.productId);
                      const pSnap = await t.get(pRef);
                      if (pSnap.exists()) {
                          const pData = pSnap.data();
                          let mult = 1;
                          if (item.unit === 'Slop') mult = pData.packsPerSlop || 10;
                          if (item.unit === 'Bal') mult = (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10);
                          if (item.unit === 'Karton') mult = (pData.balsPerCarton || 4) * (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10);
                          const bksToReturn = item.qty * mult;
                          t.update(pRef, { stock: pData.stock + bksToReturn });
                      }
                  }
              }
              if (report.agentId && report.agentId !== 'ADMIN') {
                  const agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, report.agentId);
                  t.update(agentRef, { activeCanvas: [] });
              }
              const eodRef = doc(db, `artifacts/${appId}/users/${userId}/eod_reports`, report.id);
              t.update(eodRef, { status: 'VERIFIED', verifiedAt: serverTimestamp() });
          });
          await logAudit("EOD_VERIFIED", `Verified EOD for ${report.agentName}`);
          triggerCapy("EOD Verified & Stock Returned!");
      } catch(e) { console.error(e); alert("Verification failed: " + e.message); }
  };

  const handleResetEOD = async (report) => {
      if(!window.confirm(`RESET EOD for ${report.agentName}? This will delete today's submission so they can try again.`)) return;
      try {
          await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/eod_reports`, report.id));
          await logAudit("EOD_RESET", `Admin reset EOD for ${report.agentName}`);
          triggerCapy(`EOD Reset! ${report.agentName} can now submit again.`);
      } catch(e) { console.error(e); alert("Failed to reset: " + e.message); }
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

            try {
                // 🚀 TIER 1 CHECK: IS THIS THE SYSTEM ARCHITECT? (SECURED) 🚀
                const sysAdminRef = doc(db, 'system_admins', currentUser.uid);
                const sysAdminSnap = await getDoc(sysAdminRef);
                
                // 🚀 CROWN CLAIM CHECK: Did this user just receive the Crown?
                const inviteRef = doc(db, 'system_admins_invites', email);
                const inviteSnap = await getDoc(inviteRef);

                if (inviteSnap.exists()) {
                    // Claim the Crown: Promote them to System Admin and delete the invite
                    await setDoc(sysAdminRef, { email: email, claimedAt: serverTimestamp() });
                    await deleteDoc(inviteRef);
                }

                if (sysAdminSnap.exists() || inviteSnap.exists()) {
                    console.log("GOD MODE DETECTED: Engaging Secondary Security Lock.");
                    setIsSystemOwner(true);
                    setBossUid(null);
                    setUserRole('ADMIN'); 
                    setAgentProfileId(null);
                    setUser(currentUser);
                    setIsAdmin(false); 
                    setShowAdminLogin(true); 
                    return; 
                }

                setIsSystemOwner(false);

                // 🏢 TIER 2-4 CHECK: NORMAL EMPLOYEES & CLIENTS 🏢
                const directoryRef = doc(db, `artifacts/${appId}/employee_directory`, email);
                const directorySnap = await getDoc(directoryRef);

                if (directorySnap.exists()) {
                    const data = directorySnap.data();

                    // 🚨 KILL SWITCH: Instantly reject suspended Tenants & Salesmen
                    if (data.subscriptionStatus === 'SUSPENDED' || data.status === 'SUSPENDED') {
                        alert("ACCOUNT SUSPENDED: Subscription inactive. Please contact KPM System Administration.");
                        signOut(auth);
                        setUser(null);
                        return;
                    }

                    // 🚨 AUTO-CLAIM: Translate pre-registered Email to permanent Google UID
                    if (currentUser.uid === data.bossUid || currentUser.email === data.bossUid) {
                        if (currentUser.email === data.bossUid) {
                            await updateDoc(directoryRef, { bossUid: currentUser.uid });
                        }

                        // 🚨 THIS IS THE BOSS: They MUST be ADMIN
                        setBossUid(null);
                        setUserRole('ADMIN'); 
                        setAgentProfileId(null);
                        setUser(currentUser);
                        setIsAdmin(false); // Still requires PIN
                    } 
                    else if (data.status === 'Active') {
                        setBossUid(data.bossUid);
                        
                        // 🚀 FIX: Read the Tier security clearance, NOT the vehicle type!
                        setUserRole(data.userRole || 'AGENT'); 
                        setAgentProfileId(data.agentId);

                        const hijackedUser = {
                            uid: data.bossUid,            
                            email: currentUser.email,
                            displayName: data.name || currentUser.displayName || currentUser.email?.split('@')[0] || "Field Agent",
                            photoURL: currentUser.photoURL,
                            realUid: currentUser.uid,     
                            role: data.role,             // Keep vehicle type for UI display
                            userRole: data.userRole || 'AGENT', // 🚀 Inject clearance level
                            agentId: data.agentId         
                        };
                        
                        setUser(hijackedUser);
                        setIsAdmin(false); 
                        setActiveTab('journey'); 
                    } else {
                        alert("Your access has been revoked by the Administrator.");
                        signOut(auth);
                        setUser(null);
                    }
                } else {
                    // 🚨 THE FIX: UNKNOWN LOGINS ARE LOCKED OUT 🚨
                    setBossUid(null);
                    setUserRole('UNAUTHORIZED'); 
                    setAgentProfileId(null);
                    setUser(currentUser);
                    setIsAdmin(false); 
                }
            } catch (error) {
                console.error("Traffic Cop Error:", error);
                // 🚨 SECURE FALLBACK ON ERROR 🚨
                setUserRole('UNAUTHORIZED'); 
                setUser(currentUser);
            }
        } else {
            setUser(null);
            setIsSystemOwner(false);
            setUserRole('UNAUTHORIZED'); // 🚨 CLEAR ROLE ON LOGOUT
        }
    });
    
    return () => unsubAuth();
  }, []);

  const handleAdminAuthSuccess = () => {
    setIsAdmin(true);
    setShowAdminLogin(false);
    triggerCapy("Access Granted. Welcome back, Boss.");
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    triggerCapy("Admin session ended.");
  };

 

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('kpm_theme', 'dark'); } else { document.documentElement.classList.remove('dark'); localStorage.setItem('kpm_theme', 'light'); }
  }, [darkMode]);

 const handleLogin = async () => {
        setLoginError(null); 
        try {
            // 🚨 CRITICAL MOBILE FIX: 
            // We MUST NOT put any 'await' commands before opening the popup.
            // Mobile browsers strictly require popups to open in the EXACT same 
            // split-second microtask as the user's physical tap. 
            const result = await signInWithPopup(auth, googleProvider);
            
            console.log("Login Success:", result.user);
            setUser(result.user);
            if (result.user.email) setCurrentUserEmail(result.user.email);
            
        } catch (error) {
            console.error("Login Error:", error);
            
            // Smart Fallback ONLY for embedded browsers (like clicking a link inside Instagram/Line)
            if (error.code === 'auth/popup-blocked') {
                console.log("In-app browser blocked popup. Rerouting...");
                signInWithRedirect(auth, googleProvider);
            } else {
                alert(`Login Failed: ${error.message}`); 
                setLoginError(`Error: ${error.code} - ${error.message}`);
            }
        }
    };

  const handleLogout = async () => { await signOut(auth); setUser(null); setInventory([]); setTransactions([]); setIsAdmin(false); };

  // --- ACTIONS ---
 
  // --- MODIFIED: SYSTEM LOG ENGINE (FIXED 4TH DOWNLOAD BUG) ---
  const logAudit = async (action, details, includeSnapshot = false) => {
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
  
  const cycleMascotMessage = () => {
    // Uses the latest activeMessages list to cycle dialogue
    const nextIndex = (msgIndex + 1) % activeMessages.length;
    setMsgIndex(nextIndex);
    const message = activeMessages[nextIndex];
    setCapyMsg(message);
    setShowCapyMsg(true);
    setTimeout(() => setShowCapyMsg(false), 8000); 
  };
  
  // Re-usable function to pop up the mascot with a custom message
  const triggerCapy = (msg) => { 
    const message = msg || "Hello!"; 
    setCapyMsg(message); 
    setShowCapyMsg(true); 
    // Auto-hide after 8 seconds to prevent screen clutter
    setTimeout(() => setShowCapyMsg(false), 8000); 
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
  const handleDeleteSingleTransaction = async (transaction) => {
      if(!window.confirm("Delete this specific transaction record? Stock will NOT be restored automatically (manual adjustment required if needed).")) return;
      try {
          await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, transaction.id));
          logAudit("TRANS_DELETE", `Deleted transaction ${transaction.id} for ${transaction.customerName}`);
          triggerCapy("Transaction record removed.");
      } catch(err) {
          alert(err.message);
      }
  };

  const handleDeleteConsignmentData = async (customerName) => { if(!window.confirm(`Delete ALL history for ${customerName}?`)) return; try { const targets = transactions.filter(t => (t.customerName||'').trim() === customerName && (t.type.includes('CONSIGNMENT') || (t.type === 'SALE' && t.paymentType === 'Titip') || t.type === 'RETURN')); for(const t of targets) { await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, t.id)); } logAudit("CONSIGN_DELETE", `Cleared data for ${customerName}`); } catch(err) {} };
  const handleDeleteHistory = async (customerName, agentName) => { 
      if(!window.confirm(`Permanently delete ALL transaction history for "${customerName}" handled by ${agentName}?`)) return; 
      try { 
          const targets = transactions.filter(t => {
              let cust = (t.customerName || 'Walk-in Customer').trim();
              const isWalkIn = cust.toLowerCase().includes('walk-in') || !t.customerName;
              const isEcer = t.items?.some(i => i.priceTier === 'Ecer');
              if (isWalkIn || isEcer) cust = "Individuals (Ecer)";

              return cust === customerName && (t.agentName || 'Admin') === agentName;
          }); 
          for (const t of targets) { await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, t.id)); } 
          await logAudit("HISTORY_DELETE", `Deleted history folder for ${customerName} (${agentName})`); 
          triggerCapy(`Deleted ${targets.length} records`); 
      } catch (err) { console.error(err); alert("Error deleting history."); } 
  };

 
// --- UPDATED: TARGETED MERCHANT SAVING & CUSTOMER PHOTOS ---
  const handleCropConfirm = (base64) => { 
      if (!activeCropContext) return; 
      
      const collPath = `artifacts/${appId}/users/${user.uid}/settings/general`;

      if (activeCropContext.type === 'mascot') { 
          setAppSettings(prev => ({ ...prev, mascotImage: base64 }));
          if(user) setDoc(doc(db, collPath), { mascotImage: base64 }, {merge: true});
          triggerCapy("Profile picture updated!"); 
      
      } else if (activeCropContext.type === 'product') { 
          setTempImages(prev => ({ ...prev, [activeCropContext.face]: base64 })); 
      
      } else if (activeCropContext.type === 'tier') {
          const idx = activeCropContext.index;
          const newTiers = [...tierSettings];
          newTiers[idx].value = base64; 
          setTierSettings(newTiers);
          handleSaveTiers(newTiers);
          triggerCapy("Tier Icon Updated!");

      } else if (activeCropContext.type === 'inventory_bg') {
          setAppSettings(prev => ({ ...prev, inventoryBg: base64 }));
          if(user) setDoc(doc(db, collPath), { inventoryBg: base64 }, {merge: true});
          triggerCapy("Inventory Backdrop Updated!");

      // --- FIXED: TARGETED MERCHANT SPRITE SAVING ---
      } else if (activeCropContext.type.startsWith('merchant_')) {
          const moodKey = activeCropContext.type.split('_')[1]; // Extracts 'idle', 'talking', or 'deal'
          const settingsKey = `merchant_${moodKey}`;
          
          // 1. Update local state immediately
          setAppSettings(prev => ({ ...prev, [settingsKey]: base64 }));
          
          // 2. Perform targeted update to Firestore (avoids overwriting other settings)
          if(user) {
              setDoc(doc(db, collPath), { [settingsKey]: base64 }, {merge: true});
              logAudit("SETTINGS_UPDATE", `Updated Merchant ${moodKey} visual`);
          }
          triggerCapy(`Merchant ${moodKey} visual updated!`);
          
      // --- FIXED: CATCH AND APPLY CUSTOMER STORE PHOTO ---
      } else if (activeCropContext.type === 'customer_staging') {
          setTempCustomerImage(base64);
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
          
          data.images = { ...(editingProduct?.images || {}), ...tempImages }; 
          data.dimensions = { ...boxDimensions }; 
          data.useFrontForBack = useFrontForBack; 
          data.updatedAt = serverTimestamp(); 
          
          if (editingProduct?.id) { 
              await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/products`, editingProduct.id), data); 
              await logAudit("PRODUCT_UPDATE", `Updated product: ${data.name}`); 
              triggerCapy("Product updated successfully!"); 
          } else { 
              data.createdAt = serverTimestamp(); 
              await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/products`), data); 
              await logAudit("PRODUCT_ADD", `Added new product: ${data.name}`); 
              triggerCapy("New product added!"); 
          } 
          setEditingProduct(null); 
          setTempImages({}); 
          setUseFrontForBack(false); 
      } catch (err) { 
          console.error(err); 
          triggerCapy("Error saving product!"); 
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
          } catch(e) {} 
      } 
  };

  const deleteProduct = async (id) => { 
      if (window.confirm("Are you sure you want to delete this product?")) { 
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
      if (!window.confirm(`Confirm stock adjustment for ${updates.length} items?`)) return; 
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
          alert("Failed to update stock: " + err.message); 
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

  // --- CUSTOM HOOKS ---
  const { processTransaction, handleMerchantSale, handleConsignmentPayment, handleConsignmentReturn } = useTransactionEngine({
      db, appId, userId, userRole, agentProfileId, adminSalesMode,
      logAudit, triggerCapy, setCart, customers
  });

 const handleAddGoodsToCustomer = (name) => { alert(`Go to Sales Terminal for ${name}`); setActiveTab('sales'); };
  
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
      } catch (err) { console.error(err); alert("Failed to save batch: " + err); }
  };

  const handleDeleteSampling = async (sample) => {
      if(!window.confirm("Delete this sample record? Stock will be RESTORED to its original source.")) return;
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
      } catch(err) { console.error(err); alert("Failed to delete: " + err.message); }
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
                          let mCanvas = cItem.unit === 'Slop' ? (oldPData.packsPerSlop || 10) : 1;
                          updatedCanvas[oldCanvasIdx] = { ...cItem, qty: cItem.qty + (oldQtyInBks / mCanvas) };
                      } else {
                          updatedCanvas.push({ productId: editingSample.productId, name: editingSample.productName, qty: oldQtyInBks, unit: 'Bks' });
                      }

                      // B. Deduct New Qty
                      const newCanvasIdx = updatedCanvas.findIndex(c => c.productId === newProductId);
                      if (newCanvasIdx > -1) {
                          let cItem = updatedCanvas[newCanvasIdx];
                          let mCanvas = cItem.unit === 'Slop' ? (newPData.packsPerSlop || 10) : 1;
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
      } catch (err) { alert(err.message || err); }
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

      if (!window.confirm(`Move ALL items from "${oldReason}" to "${newReason}" on ${newDate}?`)) return;

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
          alert("Move failed: " + err.message);
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
      if(!window.confirm("CRITICAL WARNING: Restoring from a backup will overwrite your live database with the file's contents. Proceed?")) return;
      
      triggerCapy("Initiating Full System Restore... Do not close the window. ⏳");
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const data = JSON.parse(event.target.result);
              
              // FIX: Firestore has a hard limit of 500 writes per batch. 
              // We use chunked batches to ensure massive restores (including maps) never crash.
              const batches = [];
              let currentBatch = writeBatch(db);
              let opCount = 0;

              const commitBatch = () => {
                  batches.push(currentBatch.commit());
                  currentBatch = writeBatch(db);
                  opCount = 0;
              };

              const safeSet = (ref, itemData) => {
                  currentBatch.set(ref, itemData);
                  opCount++;
                  if (opCount >= 450) commitBatch();
              };

              const queueToBatch = (collectionName, items) => {
                  if (items && Array.isArray(items)) {
                      items.forEach(item => {
                          safeSet(doc(db, `artifacts/${appId}/users/${user.uid}/${collectionName}`, item.id || Date.now().toString()), item);
                      });
                  }
              };

              // 1. Restore Standard Collections
              queueToBatch('products', data.inventory);
              queueToBatch('transactions', data.transactions);
              queueToBatch('samplings', data.samplings);
              queueToBatch('procurement', data.procurements);
              queueToBatch('audit_logs', data.auditLogs);
              queueToBatch('mapSettings', data.mapSettings); 

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

              // 4. Commit remaining unpushed files
              if (opCount > 0) batches.push(currentBatch.commit());
              
              // Wait for all batches to finish uploading concurrently
              await Promise.all(batches);

              triggerCapy("System Restore Complete! Refreshing matrix... ✨");
              setTimeout(() => window.location.reload(), 2500);
          } catch (err) { 
              alert("Failed to restore: " + err.message); 
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
    
    if(!window.confirm("Import Shared Config? This will overwrite your current Product List and Branding settings (Mascot/Name). Transactions will NOT be affected.")) return;
    
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
                const batch = writeBatch(db); 
                data.inventory.forEach(item => {
                    const ref = doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id);
                    batch.set(ref, item); 
                });
                await batch.commit();
            }
            
            triggerCapy("Config Imported! Welcome to the team.");
        } catch (err) { 
            alert("Import Failed: " + err.message); 
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
          // Boss Vehicle Mode
          return filteredInventory.filter(p => adminCanvas.some(c => c.productId === p.id)).map(p => {
              const canvasItem = adminCanvas.find(c => c.productId === p.id);
              if (!canvasItem) return p;
              let multCanvas = 1;
              if (canvasItem.unit === 'Slop') multCanvas = p.packsPerSlop || 10;
              if (canvasItem.unit === 'Bal') multCanvas = (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
              if (canvasItem.unit === 'Karton') multCanvas = (p.balsPerCarton || 4) * (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
              const trueStockInVehicle = Math.floor(canvasItem.qty * multCanvas);
              return { ...p, stock: trueStockInVehicle };
          });
      }
      // Employee Mode
      return filteredInventory.filter(p => agentCanvas.some(c => c.productId === p.id)).map(p => {
          const canvasItem = agentCanvas.find(c => c.productId === p.id);
          if (!canvasItem) return p;
          let multCanvas = 1;
          if (canvasItem.unit === 'Slop') multCanvas = p.packsPerSlop || 10;
          if (canvasItem.unit === 'Bal') multCanvas = (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
          if (canvasItem.unit === 'Karton') multCanvas = (p.balsPerCarton || 4) * (p.slopsPerBal || 20) * (p.packsPerSlop || 10);
          const trueStockInVehicle = Math.floor(canvasItem.qty * multCanvas);
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

          let mappedTier = c.priceTier || 'Retail'; 
          
          // Fallback logic for legacy customers missing the explicit priceTier
          if (!c.priceTier) {
              const tierUpper = (c.tier || '').toUpperCase();
              if (tierUpper.includes('GROSIR') || tierUpper.includes('GOLD') || tierUpper.includes('WHOLESALE')) mappedTier = 'Grosir';
              else if (tierUpper.includes('RETAIL') || tierUpper.includes('SILVER')) mappedTier = 'Retail';
              else if (tierUpper.includes('ECER') || tierUpper.includes('BRONZE')) mappedTier = 'Ecer';
          }
          
          return allowedTiers.includes(mappedTier);
      });
  }, [customers, userRole, agentSettings.allowedTiers]);

  const chartData = React.useMemo(() => {
      const dataMap = {};
      const customers = new Set();
      transactions.filter(t => t.type === 'SALE' || t.type === 'RETURN').forEach(t => {
          const date = t.date;
          if (!dataMap[date]) dataMap[date] = { date };
          const cName = (t.customerName || 'Unknown').trim();
          if (!dataMap[date][cName]) dataMap[date][cName] = 0;
          dataMap[date][cName] += t.total;
          customers.add(cName);
      });
      return { data: Object.values(dataMap).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-7), keys: Array.from(customers) };
  }, [transactions]);




// --- NEW: SAVE MAP HOME BASE ---
  const handleSetMapHome = async (center, zoom) => {
      if(!user || !isAdmin) return;
      try {
          const newSettings = { ...appSettings, mapHome: { lat: center.lat, lng: center.lng, zoom } };
          setAppSettings(newSettings);
          await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), newSettings, {merge: true});
          triggerCapy("New Map Home Base Saved! 🏠");
      } catch(err) { console.error(err); alert("Failed to save map home."); }
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
        appSettings={appSettings}
        isAdmin={isAdmin}
        userRole={userRole}
        onLogin={handleLogin} 
        setShowAdminLogin={setShowAdminLogin}
        agentSettings={agentSettings}
        notifications={notifications}                   
        onNotificationClick={handleNotificationClick}
        appVersion={APP_VERSION} // 🚀 ADDED SO THE SIDEBAR KNOWS THE VERSION   
    >
      {/* NEW ROUTER FOR EMPLOYEE VEHICLE INVENTORY */}
      {activeTab === 'agent_inventory' && (
           <AgentInventoryView 
               db={db} 
               appId={appId} 
               userId={userId} 
               agentProfileId={agentProfileId} 
               inventory={inventory}
               transactions={transactions}
           />
      )}

      {/* 1. GLOBAL MODALS */}
      {examiningProduct && <ExamineModal product={examiningProduct} onClose={() => setExaminingProduct(null)} onUpdateProduct={handleUpdateProduct} isAdmin={isAdmin} />}
      {cropImageSrc && <ImageCropper imageSrc={cropImageSrc} onCancel={() => { setCropImageSrc(null); setActiveCropContext(null); }} onCrop={handleCropConfirm} dimensions={boxDimensions} onDimensionsChange={setBoxDimensions} face={activeCropContext?.face || 'front'} />}
     


      {/* --- PINPOINT: Improved Admin Modal (Fixed Fonts & Layout) --- */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 font-mono">
          <div className={`bg-[#0a0a0a] border border-red-600/30 p-8 max-w-sm w-full text-center shadow-[0_0_60px_rgba(220,38,38,0.15)] relative overflow-hidden transition-all ${authShake ? 'animate-shake' : ''}`}>
            
            {/* Terminal Decoration */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${isUnlocking || isSetupMode ? 'via-emerald-500' : isResetMode ? 'via-orange-500' : 'via-red-600'} to-transparent ${authShake ? '' : 'animate-pulse'}`}></div>
            
            {/* 🎬 CINEMATIC UNLOCK SEQUENCE 🎬 */}
            {isUnlocking ? (
                <div className="space-y-6 text-center py-6 animate-fade-in">
                    <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                        {/* Mechanical Spinning Rings */}
                        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full border-t-emerald-500 animate-spin"></div>
                        <div className="absolute inset-2 border-4 border-emerald-500/20 rounded-full border-b-emerald-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                        <Unlock size={32} className="text-emerald-500 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-emerald-500 font-black text-2xl uppercase tracking-[0.3em] mb-2 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">Access Granted</h3>
                        <p className="text-emerald-400/80 font-mono text-[10px] uppercase tracking-[0.2em] animate-pulse">Decrypting Master Vault...</p>
                    </div>
                    {/* Stuttering Progress Bar */}
                    <div className="w-full bg-black border border-emerald-500/30 h-1.5 rounded-full overflow-hidden relative">
                        <div className="absolute top-0 left-0 h-full bg-emerald-500 shadow-[0_0_10px_#10b981]" style={{ animation: 'fillBar 2.4s ease-in-out forwards' }}></div>
                    </div>
                    {/* Custom Keyframe for the stuttering decrypt effect */}
                    <style>{`
                        @keyframes fillBar { 0% { width: 0%; } 20% { width: 15%; } 40% { width: 45%; } 60% { width: 45%; } 80% { width: 90%; } 100% { width: 100%; } }
                    `}</style>
                </div>
            ) : (
                <>
                    <ShieldAlert size={32} className={`mx-auto mb-4 ${isSetupMode ? 'text-emerald-500' : isResetMode ? 'text-orange-500' : 'text-red-600 animate-pulse'}`} />

                    <h2 className="text-lg font-black text-white mb-6 uppercase tracking-[0.25em]">
                        {isSetupMode ? "Initialize Vault" : isResetMode ? "Identity Recovery" : "Security Check"}
                    </h2>

            {/* CASE 1: FIRST TIME SETUP (Or Resetting) */}
            {isSetupMode ? (
                <div className="space-y-4 text-left">
                    <p className="text-[10px] text-emerald-500 uppercase font-bold mb-4 tracking-widest text-center">Create Administrator Credentials</p>
                    
                    <div className="relative">
                        <input 
                            type="password" 
                            placeholder="CREATE MASTER PASSWORD" 
                            value={setupPassword}
                            onChange={(e) => setSetupPassword(e.target.value)}
                            className="w-full bg-black border border-emerald-500/30 p-4 text-center text-white text-lg outline-none focus:border-emerald-500 font-mono placeholder:text-white/20 transition-colors" 
                            maxLength={25}
                        />
                        
                        {/* 🚀 RESIDENT EVIL STRENGTH METER 🚀 */}
                        <div className="mt-3">
                            <div className="flex justify-between items-end mb-1">
                                <span className={`text-[9px] font-black tracking-widest uppercase ${calculateStrength(setupPassword).color}`}>
                                    {calculateStrength(setupPassword).label}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">LVL {calculateStrength(setupPassword).score}/5</span>
                            </div>
                            <div className="flex gap-1 h-1.5">
                                {[1, 2, 3, 4, 5].map(level => (
                                    <div 
                                        key={level} 
                                        className={`flex-1 rounded-[1px] transition-all duration-300 ${calculateStrength(setupPassword).score >= level ? calculateStrength(setupPassword).bar : 'bg-white/10'}`}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <input 
                        type="password" 
                        placeholder="SECRET RECOVERY WORD" 
                        value={setupSecret}
                        onChange={(e) => setSetupSecret(e.target.value)}
                        className="w-full bg-black border border-emerald-500/30 p-4 text-center text-white text-xs outline-none focus:border-emerald-500 uppercase tracking-widest placeholder:text-white/20 font-mono transition-colors" 
                    />
                    
                    <button 
                        onClick={handleSetupSecurity} 
                        className={`w-full py-4 font-bold uppercase text-xs tracking-[0.2em] transition-all shadow-lg font-mono border ${calculateStrength(setupPassword).score === 5 && setupSecret ? 'bg-emerald-600/20 hover:bg-emerald-600 border-emerald-500/50 text-emerald-500 hover:text-white cursor-pointer' : 'bg-black border-slate-700 text-slate-600 cursor-not-allowed opacity-50'}`}
                        disabled={calculateStrength(setupPassword).score < 5 || !setupSecret}
                    >
                        Save Credentials
                    </button>
                </div>
            ) : isOtpMode ? (
                /* CASE 2.5: OTP VERIFICATION */
                <div className="space-y-4 animate-fade-in">
                    <p className="text-[10px] text-blue-400 uppercase font-bold mb-4 tracking-widest">Verify Email Authorization</p>
                    <p className="text-xs text-slate-400 mb-4">A 6-digit code has been sent to your registered Admin Email.</p>
                    <input type="number" placeholder="• • • • • •" className="w-full bg-black border border-blue-500/30 p-4 text-center text-blue-400 text-2xl outline-none tracking-[0.5em] focus:border-blue-500 font-mono transition-colors" value={inputOtp} onChange={(e) => setInputOtp(e.target.value)} autoFocus maxLength={6} onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()} />
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => { setIsOtpMode(false); setIsResetMode(true); setInputOtp(""); }} className="flex-1 py-3 border border-white/10 text-gray-400 text-xs font-bold uppercase hover:text-white hover:bg-white/5 font-mono tracking-widest transition-colors">Abort</button>
                        <button onClick={handleVerifyOtp} className="flex-1 py-3 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/50 text-blue-500 hover:text-white text-xs font-bold uppercase font-mono tracking-widest transition-colors">Verify Code</button>
                    </div>
                </div>
            ) : isResetMode ? (
                /* CASE 2: RECOVERY MODE (Now with Loading State) */
                <div className="space-y-4">
                    <p className="text-[10px] text-orange-400 uppercase font-bold mb-4 tracking-widest">Enter Secret Word</p>
                   <input type="password" id="resetWord" placeholder="ENTER SECRET WORD..." className="w-full bg-black border border-orange-500/30 p-4 text-center text-white text-xl outline-none tracking-widest focus:border-orange-500 font-mono placeholder:text-white/20 transition-colors" autoFocus disabled={isSendingEmail} onKeyDown={(e) => e.key === 'Enter' && handleResetPin(e.target.value)}/>
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setIsResetMode(false)} disabled={isSendingEmail} className="flex-1 py-3 border border-white/10 text-gray-400 text-xs font-bold uppercase hover:text-white hover:bg-white/5 font-mono tracking-widest transition-colors">Abort</button>
                        <button onClick={() => handleResetPin(document.getElementById('resetWord').value)} disabled={isSendingEmail} className={`flex-1 py-3 border text-xs font-bold uppercase font-mono tracking-widest transition-colors ${isSendingEmail ? 'bg-orange-900/50 border-orange-800 text-orange-700 cursor-wait' : 'bg-orange-600/20 hover:bg-orange-600 border-orange-500/50 text-orange-500 hover:text-white'}`}>
                            {isSendingEmail ? 'Authorizing...' : 'Verify'}
                        </button>
                    </div>
                </div>
            ) : (
                /* CASE 3: STANDARD LOGIN */
            <div className="space-y-4">
                <input 
                    type="password" 
                    placeholder="ENTER MASTER PASSWORD" 
                    className="w-full bg-black border border-red-600/30 p-4 text-center text-red-500 text-xl mb-2 outline-none font-mono tracking-[0.2em] focus:border-red-500 placeholder:text-red-900/50 placeholder:tracking-widest placeholder:text-xs transition-colors" 
                    value={inputPin} 
                    onChange={(e) => setInputPin(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handlePinLogin()} 
                    autoFocus 
                    maxLength={15}
                />
                
                {/* 🚀 THE NEW SUBMIT BUTTON 🚀 */}
                <button 
                    onClick={handlePinLogin}
                    className="w-full py-4 bg-red-900/20 hover:bg-red-900/60 border border-red-600/50 text-red-500 hover:text-white font-bold uppercase text-xs tracking-[0.2em] transition-all font-mono"
                >
                    Access Vault
                </button>
                
                {/* 🚀 SECURED BIOMETRIC CONTROLS (UNLOCK ONLY) 🚀 */}
                    {window.PublicKeyCredential && hasPasskey && (
                        <button 
                            onClick={handleBiometricUnlock}
                            className="w-full mt-4 py-4 bg-emerald-900/10 hover:bg-emerald-900/30 border border-emerald-500/30 hover:border-emerald-500 text-emerald-500 hover:text-emerald-400 font-bold uppercase text-xs tracking-[0.2em] flex justify-center items-center gap-3 transition-all font-mono shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                        >
                            <ScanFace size={18} className="animate-pulse" />
                            Biometric Override
                        </button>
                    )}
                    
                    <div className="pt-6 border-t border-white/5 mt-6">
                        <button onClick={() => setIsResetMode(true)} className="text-[9px] text-slate-500 hover:text-white uppercase font-bold transition-colors tracking-[0.1em] font-mono">
                            Lost Key? Use Recovery Protocol
                        </button>
                    </div>
                </div>
            )}
                </>
            )}
          </div>
        </div>
      )}

      {/* 3. MAIN TABS (Only render if user exists) */}
      {user && (
        <>
        {activeTab === 'dashboard' && userRole === 'ADMIN' && (
            !isAdmin ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse"></div>
                        <div className="relative w-24 h-24 bg-black border-2 border-red-600 rounded-full flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                            <Lock size={40} className="animate-bounce-slow" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-[0.25em] mb-2 font-mono">Restricted Access</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed mb-8">Admin Clearance Required</p>
                    <button onClick={() => setShowAdminLogin(true)} className="px-10 py-4 border-2 border-white text-white font-black uppercase text-xs hover:bg-white hover:text-black transition-all">Unlock System</button>
                </div>
            ) : (
                <DashboardView 
    isAdmin={isAdmin} 
    userRole={userRole} 
    totalStockValue={totalStockValue}
    transactions={transactions} 
    isUsbSecure={isUsbSecure}
    handleBackupData={handleBackupData} 
    lowStockItems={lowStockItems}
    setActiveTab={setActiveTab} 
    chartData={chartData} 
    backupToast={backupToast}
    sessionStatus={sessionStatus} 
    auditLogs={auditLogs}
    appSettings={appSettings}                                  
    handleSaveDashboardTargets={handleSaveDashboardTargets}    
    inventory={inventory} // 🚀 REQUIRED FOR ANALYTICS
    motorists={motorists}  // 🚀 REQUIRED FOR LEADERBOARD
    customers={customers}  // 🚀 REQUIRED FOR BENCHMARKS
/>
            )
          )}


          {/* MAP SYSTEM: Shows ALL customers (Read-only for agents to maintain situational awareness) */}
          {activeTab === 'map_war_room' && <MapMissionControl customers={userRole === 'ADMIN' ? customers : permittedCustomers} transactions={transactions} inventory={inventory} db={db} appId={appId} user={user} logAudit={logAudit} triggerCapy={triggerCapy} isAdmin={isAdmin} savedHome={appSettings?.mapHome} onSetHome={handleSetMapHome} tierSettings={tierSettings} />}
          
         {/* JOURNEY PLAN: Strictly locked down to ONLY show Admin's authorized Pricing Tiers */}
          {activeTab === 'journey' && <JourneyView customers={permittedCustomers} db={db} appId={appId} user={user} logAudit={logAudit} triggerCapy={triggerCapy} setActiveTab={setActiveTab} tierSettings={tierSettings} isAdmin={isAdmin} />}
          
          {/* NEW FLEET ROUTER */}
          {activeTab === 'fleet' && userRole === 'ADMIN' && (
            <FleetCanvasManager 
                db={db} 
                appId={appId} 
                user={user} 
                inventory={inventory} 
                transactions={transactions} 
                appSettings={appSettings}
                logAudit={logAudit} 
                triggerCapy={triggerCapy} 
                isAdmin={isAdmin} 
                motorists={motorists} // 🚀 FIXED: Inject the live, real-time database sync
            />
          )}
          
          {activeTab === 'inventory' && userRole === 'ADMIN' && (
          <div className="h-auto min-h-[800px] lg:min-h-0 lg:h-[calc(100vh-140px)] w-full max-w-7xl mx-auto border-4 border-black shadow-[0_0_0_1px_rgba(255,255,255,0.1)] relative flex flex-col">
              
              <ResidentEvilInventory 
                  inventory={filteredInventory}
                  motorists={motorists}
                  transactions={transactions}
                  isAdmin={isAdmin}
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
                      } catch(err) { console.error(err); alert("Save failed"); }
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
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-300"
                    style={{ display: cropImageSrc ? 'none' : 'flex' }} // <--- MAGIC FIX: Hides when cropping
                >
                    <div className="bg-black border border-white/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                        <button onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 text-white hover:text-red-500"><X size={24}/></button>
                        <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-widest border-b border-white/20 pb-2">
                            {editingProduct.id ? "Edit Record" : "New Entry"}
                        </h2>
                        
                        <form onSubmit={handleSaveProduct} className="space-y-6 font-mono text-xs">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div><label className="text-gray-500 block mb-1">PRODUCT NAME</label><input name="name" defaultValue={editingProduct.name} className="w-full p-2 bg-white/5 border border-white/20 text-white focus:border-orange-500 outline-none"/></div>

                                  {/* --- PINPOINT: Edit Product Modal --- */}
                                    <div className="grid grid-cols-4 gap-2">
                                        <div><label className="text-[10px] text-gray-500 block mb-1 tracking-widest">STOCK</label><input name="stock" type="number" step="any" defaultValue={editingProduct.stock} className="w-full p-2 bg-white/5 border border-emerald-500/50 text-emerald-400 focus:border-emerald-500 outline-none"/></div>
                                        <div><label className="text-[10px] text-gray-500 block mb-1 tracking-widest">MIN. ALERT</label><input name="minStock" type="number" step="any" defaultValue={editingProduct.minStock || 5} className="w-full p-2 bg-white/5 border border-red-500/50 text-red-400 focus:border-red-500 outline-none"/></div>
                                        {/* 🚀 NEW: STICKS PER PACK INPUT */}
                                        <div><label className="text-[10px] text-gray-500 block mb-1 tracking-widest">STICKS / BKS</label><input name="sticksPerPack" type="number" step="any" defaultValue={editingProduct.sticksPerPack || 16} className="w-full p-2 bg-white/5 border border-blue-500/50 text-blue-400 focus:border-blue-500 outline-none"/></div>
                                        <div><label className="text-[10px] text-gray-500 block mb-1 tracking-widest">TYPE</label><input name="type" defaultValue={editingProduct.type} className="w-full p-2 bg-white/5 border border-white/20 text-white focus:border-white outline-none"/></div>
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
                                        <label htmlFor="useFront" className="text-white text-xs cursor-pointer select-none">Use Front Image for Back</label>
                                    </div>

                                    {/* TEXTURE ASSETS (WITH PREVIEWS & EDIT BTN) */}
                                    <div className="p-3 border border-dashed border-white/30 text-center bg-white/5">
                                        <p className="text-orange-500 font-bold mb-2">TEXTURE ASSETS</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['front', 'back', 'left', 'right', 'top', 'bottom'].map(face => {
                                                const hasImg = tempImages[face] || (editingProduct.images && editingProduct.images[face]);
                                                return (
                                                    <div 
                                                        key={face} 
                                                        className="h-12 bg-black border border-white/10 flex items-center justify-center text-[9px] text-gray-500 uppercase cursor-pointer hover:bg-white/10 hover:text-white transition-colors relative group overflow-hidden" 
                                                        onClick={() => document.getElementById(`file-edit-${face}`).click()}
                                                    >
                                                        {hasImg ? (
                                                            <>
                                                                <img src={hasImg} className="w-full h-full object-cover opacity-50 group-hover:opacity-100"/>
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Pencil size={12} className="text-white"/>
                                                                </div>
                                                                {/* RESTORED: Edit from existing button */}
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleEditExisting(face, hasImg); }}
                                                                    className="absolute top-0 right-0 p-1 bg-orange-600 text-white opacity-0 group-hover:opacity-100 z-20"
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
                                    <h3 className="text-white border-b border-white/10 pb-1 mb-2">PRICING ENGINE</h3>
                                    <div><label className="text-gray-500 block mb-1">DISTRIBUTOR (MODAL)</label><input name="priceDistributor" type="number" step="any" defaultValue={editingProduct.priceDistributor} className="w-full p-2 bg-white/5 border border-red-900/50 text-red-400 focus:border-red-500 outline-none"/></div>
                                    <div><label className="text-gray-500 block mb-1">RETAIL PRICE</label><input name="priceRetail" type="number" step="any" defaultValue={editingProduct.priceRetail} className="w-full p-2 bg-white/5 border border-emerald-900/50 text-emerald-400 focus:border-emerald-500 outline-none"/></div>
                                    <div><label className="text-gray-500 block mb-1">GROSIR PRICE</label><input name="priceGrosir" type="number" step="any" defaultValue={editingProduct.priceGrosir} className="w-full p-2 bg-white/5 border border-blue-900/50 text-blue-400 focus:border-blue-500 outline-none"/></div>
                                    <div><label className="text-gray-500 block mb-1">ECER PRICE</label><input name="priceEcer" type="number" step="any" defaultValue={editingProduct.priceEcer} className="w-full p-2 bg-white/5 border border-yellow-900/50 text-yellow-400 focus:border-yellow-500 outline-none"/></div>
                                </div>
                            </div>
                            <button className="w-full bg-white text-black font-bold py-4 mt-6 uppercase hover:bg-gray-300 tracking-widest text-sm">Update Database</button>
                        </form>
                    </div>
                </div>
              )}
          </div>
      )}


      {/* MULTI-WAREHOUSE ERP ENGINE */}
          {activeTab === 'restock_vault' && (
              <div className="h-auto min-h-[800px] lg:min-h-0 lg:h-[calc(100vh-140px)] w-full max-w-7xl mx-auto border-4 border-black shadow-[0_0_0_1px_rgba(255,255,255,0.1)] relative flex flex-col bg-black p-4 overflow-y-auto custom-scrollbar">
                  
                  {/* 🚀 HQ ONLY: FACTORY PROCUREMENT ENGINE (RESI, PHOTOS, DLL) */}
                  {isAdmin && (
                      <div className="mb-12 pb-12 border-b-4 border-slate-800 border-dashed">
                          <RestockVaultView 
                              inventory={inventory} 
                              procurements={procurements}
                              db={db} 
                              storage={storage} 
                              appId={appId} 
                              user={user} 
                              isAdmin={isAdmin}
                              logAudit={logAudit} 
                              triggerCapy={triggerCapy}
                              appSettings={appSettings} 
                          />
                      </div>
                  )}

                  {/* 🚀 BRANCH WAREHOUSE ENGINE */}
                  <BranchWarehouseManager 
                      db={db} 
                      appId={appId} 
                      user={user} 
                      userRole={userRole} 
                      userLocation={agentProfileId ? motorists.find(m => m.id === agentProfileId)?.location : 'UNASSIGNED'} 
                      isAdmin={isAdmin} 
                      masterUserId={userId} 
                      globalInventory={inventory} 
                      triggerCapy={triggerCapy} 
                      logAudit={logAudit} 
                      appSettings={appSettings}
                     
                  />
              </div>
          )}

          

          {activeTab === 'sales' && (
              <div className="h-full w-full flex flex-col relative bg-black"> 
                  {/* --- FIXED: ADMIN FIELD MODE TOGGLE BAR --- */}
                  {userRole === 'ADMIN' && (
                      <div className="w-full shrink-0 bg-[#0f0e0d] border-b-2 border-[#3e3226] p-3 flex justify-center z-[200] shadow-md">
                          <div className="bg-black/90 backdrop-blur-md border border-[#8b7256] p-1.5 rounded-full flex items-center shadow-2xl">
                              <button onClick={() => setAdminSalesMode('VAULT')} className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${adminSalesMode === 'VAULT' ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>Master Vault</button>
                              <button onClick={() => setAdminSalesMode('VEHICLE')} className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${adminSalesMode === 'VEHICLE' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>Boss Car</button>
                          </div>
                      </div>
                  )}
                  <div className="flex-1 min-h-0 relative">
                      <MerchantSalesView 
                          inventory={salesTerminalInventory} 
                          user={user} 
                          appSettings={appSettings}
                          customers={customers} 
                          allowedPayments={agentSettings.allowedPayments}
                          allowedTiers={agentSettings.allowedTiers}
                          onProcessSale={handleMerchantSale}
                          onInspect={(item) => setExaminingProduct(item)} 
                      />
                  </div>
              </div>
          )}

        {activeTab === 'receivables' && (
              <ConsignmentFinanceView 
                  transactions={transactions} 
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
                  onRequestTransfer={handleRequestTransfer}
                  onAgentAcceptTransfer={handleAgentAcceptTransfer}
                  onAdminApproveTransfer={handleAdminApproveTransfer}
              />
          )}

          {/* 🚀 NEW EOD ROUTER 🚀 */}
          {activeTab === 'eod' && (
              <EODReconciliationView 
                  transactions={transactions} 
                  inventory={inventory} 
                  agentCanvas={agentCanvas}
                  agentProfileId={agentProfileId}
                  eodReports={eodReports}
                  user={user}
                  onSubmitEOD={handleSubmitEOD}
                  onVerifyEOD={handleVerifyEOD}
                  onResetEOD={handleResetEOD} // 🚀 THIS IS THE NEW LINE
                  isAdmin={isAdmin}
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
                  tierSettings={tierSettings}
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
                  inventory={inventory} 
                  db={db} 
                  appId={appId} 
                  user={user} 
                  logAudit={logAudit}
                  triggerCapy={triggerCapy}
              />
          )}
          {activeTab === 'sampling' && (
              <>
                  {/* EDIT FOLDER MODAL */}
                  {editingFolder && (
                      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                              <h3 className="font-bold text-lg mb-4 dark:text-white">Rename Folder</h3>
                              <form onSubmit={processFolderEdit} className="space-y-4">
                                  <div><label className="text-xs font-bold text-slate-500">Date</label><input name="newDate" type="date" defaultValue={editingFolder.oldDate} className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white"/></div>
                                  <div><label className="text-xs font-bold text-slate-500">Location Name</label><input name="newReason" defaultValue={editingFolder.oldReason} className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white"/></div>
                                  <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setEditingFolder(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">Cancel</button><button className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-bold">Save Move</button></div>
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
          {activeTab === 'transactions' && <HistoryReportView transactions={transactions} inventory={inventory} onDeleteFolder={handleDeleteHistory} onDeleteTransaction={handleDeleteSingleTransaction} isAdmin={isAdmin} user={user} appId={appId} db={db} appSettings={appSettings} userRole={userRole} agentProfileId={agentProfileId} />}
          
         {activeTab === 'audit' && (
             <AuditVaultView db={db} storage={storage} appId={appId} user={user} isAdmin={isAdmin} logAudit={logAudit} setBackupToast={setBackupToast} auditLogs={auditLogs} />
         )}


        


          {activeTab === 'settings' && (
              <SettingsView 
                  user={user} userId={userId} db={db} appId={appId}
                  isAdmin={isAdmin} isSystemOwner={isSystemOwner}
                  showCrownTransfer={showCrownTransfer} setShowCrownTransfer={setShowCrownTransfer}
                  triggerCapy={triggerCapy} setShowAdminLogin={setShowAdminLogin}
                  sessionStatus={sessionStatus} setSessionStatus={setSessionStatus} auditLogs={auditLogs}
                  handleMasterProtocol={handleMasterProtocol} handleSingleBackup={handleSingleBackup} handleRestoreData={handleRestoreData}
                  handleExportGranular={handleExportGranular} handleImportGranular={handleImportGranular} handleWipeData={handleWipeData}
                  currentUserEmail={currentUserEmail} handleChangePin={handleChangePin} handleAdminLogout={handleAdminLogout}
                  handleRegisterPasskey={handleRegisterPasskey} hasPasskey={hasPasskey}
                  tierSettings={tierSettings} setTierSettings={setTierSettings} handleSaveTiers={handleSaveTiers} handleExportTiers={handleExportTiers} handleImportTiers={handleImportTiers} handleTierIconSelect={handleTierIconSelect}
                  appSettings={appSettings} setAppSettings={setAppSettings}
                  editCompanyProfile={editCompanyProfile} setEditCompanyProfile={setEditCompanyProfile} handleSaveCompanyProfile={handleSaveCompanyProfile}
                  handleMascotSelect={handleMascotSelect} newMascotMessage={newMascotMessage} setNewMascotMessage={setNewMascotMessage} handleAddMascotMessage={handleAddMascotMessage}
                  activeMessages={activeMessages} editingMsgIndex={editingMsgIndex} setEditingMsgIndex={setEditingMsgIndex} editMsgText={editMsgText} setEditMsgText={setEditMsgText} handleSaveEditedMessage={handleSaveEditedMessage} handleDeleteMascotMessage={handleDeleteMascotMessage}
                  triggerDiscoParty={triggerDiscoParty} isDiscoMode={isDiscoMode}
              />
          )}
        </>
      )}

      {/* GLOBAL WIDGETS */}
      <CapybaraMascot 
          isDiscoMode={isDiscoMode} 
          message={showCapyMsg ? capyMsg : null} 
          onClick={() => cycleMascotMessage()} 
          staticImageSrc={appSettings?.mascotImage} 
          user={user} 
          
          // --- ADD THIS LINE ---
          scale={appSettings?.mascotScale || 1} 
      />
    </BiohazardTheme>
  );
}