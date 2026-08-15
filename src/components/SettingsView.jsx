import React, { useState } from 'react';
import { Lock, ShieldCheck, ShieldAlert, UploadCloud, Copy, Package, User, Settings, Trash2, ScanFace, Plus, Tag, Download, Upload, Image as ImageIcon, MessageSquare, Edit, Save, X, Music, TrendingUp, ChevronLeft, ChevronRight, LayoutDashboard, ToggleLeft, ToggleRight, BarChart2, Store } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';

import LandlordDashboard from './LandlordDashboard';
import CrownTransferProtocol from './CrownTransferProtocol';
import AchievementTester from './AchievementTester';
import CareerDevTools from './CareerDevTools';
import HoldButton from './HoldButton';

// 🚀 IMPORT THE MATRIX BRAIN
import { CORPORATE_TIERS, ROLE_PERMISSIONS, DYNAMIC_TIERS, injectDynamicPermissions, CUSTOMER_EDIT_PERMS } from '../config/permissions';
import { confirmAction, promptAction } from './ConfirmGate.jsx';
import { notify } from './Toast.jsx';

export default function SettingsView({
    user, userId, db, appId, isAdmin, isSystemOwner, userRole,
    showCrownTransfer, setShowCrownTransfer, triggerCapy, setShowAdminLogin,
    sessionStatus, setSessionStatus, auditLogs,
    handleMasterProtocol, handleSingleBackup, handleRestoreData,
    handleExportGranular, handleImportGranular, handleWipeData,
    currentUserEmail, handleChangePin, handleAdminLogout,
    handleRegisterPasskey, registeredPasskeys, handleRemovePasskey,
    tierSettings, setTierSettings, handleSaveTiers, handleExportTiers, handleImportTiers, handleTierIconSelect,
    appSettings, setAppSettings,
    editCompanyProfile, setEditCompanyProfile, handleSaveCompanyProfile,
    handleMascotSelect, newMascotMessage, setNewMascotMessage, handleAddMascotMessage,
    activeMessages, editingMsgIndex, setEditingMsgIndex, editMsgText, setEditMsgText, handleSaveEditedMessage, handleDeleteMascotMessage,
    triggerDiscoParty, isDiscoMode,
    handleRecalculateCareer,
    isLiteMode, setIsLiteMode
}) {

    // --- TIER AUTOMATION LOGIC ---
    const [tierRules, setTierRules] = useState({});
    const [isSavingTierRules, setIsSavingTierRules] = useState(false);
    
    // --- SIDEBAR NAVIGATION STATE ---
    const [activeTab, setActiveTab] = useState('general');

    const defaultLogic = {
        type: 'omset', 
        omsetTarget: 10000000,
        volumeTarget: 30,
        volumeUnit: 'Bal', 
        timeframe: '90' 
    };

    React.useEffect(() => {
        if (!isAdmin || !db || !appId || !userId) return;
        const loadTierRules = async () => {
            try {
                const snap = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/appSettings`, 'tierRules'));
                if (snap.exists() && snap.data().rules) {
                    setTierRules(snap.data().rules);
                } else {
                    const init = {};
                    (tierSettings || []).forEach(t => init[t.id] = { ...defaultLogic });
                    setTierRules(init);
                }
            } catch(e) { console.error("Failed to load tier rules", e); }
        };
        loadTierRules();
    }, [db, appId, userId, isAdmin, tierSettings]);

    const handleUpdateTierRule = (tierId, field, value) => {
        setTierRules(prev => ({
            ...prev,
            [tierId]: { ...(prev[tierId] || defaultLogic), [field]: value }
        }));
    };

    const handleSaveTierRules = async () => {
        setIsSavingTierRules(true);
        const cleanedRules = {};
        Object.keys(tierRules).forEach(key => {
            cleanedRules[key] = {
                ...tierRules[key],
                omsetTarget: tierRules[key].omsetTarget === '' ? 0 : tierRules[key].omsetTarget,
                volumeTarget: tierRules[key].volumeTarget === '' ? 0 : tierRules[key].volumeTarget
            };
        });

        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/appSettings`, 'tierRules'), { rules: cleanedRules });
            setTierRules(cleanedRules);
            notify("✅ Tier Automation Rules locked in!");
        } catch(e) { 
            notify("Failed to save settings."); 
        }
        setIsSavingTierRules(false);
    };

    // 1. LOCKSCREEN
    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse"></div>
                    <div className="relative w-24 h-24 bg-black border-2 border-red-600 rounded-full flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                        <Lock size={40} className="animate-bounce-slow" />
                    </div>
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-[0.25em] mb-2 font-mono">Restricted Access</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed mb-8">Admin Clearance Required</p>
                <button onClick={() => setShowAdminLogin(true)} className="px-10 py-4 border-2 border-white text-white font-black uppercase text-xs hover:bg-white hover:text-black transition-all">Unlock System</button>
            </div>
        );
    }

    // --- LOGIC HUB: MERGING DATABASE + INSTANT SESSION STATUS ---
    const resetThreshold = parseInt(localStorage.getItem('indicator_reset_time') || '0');
    const sNow = new Date();
    const sTodayStr = sNow.toLocaleDateString();

    const confirmedMirror = auditLogs.find(log => 
        (log.action === "DATABASE_MIRROR" || log.action === "MASTER_BACKUP") && 
        log.timestamp && 
        (log.timestamp.seconds * 1000 > resetThreshold)
    );

    const dbRecoveryCount = auditLogs.filter(log => {
        if (!log.isSavePoint || !log.timestamp) return false;
        const logTime = log.timestamp.seconds * 1000;
        if (logTime < resetThreshold) return false;
        return new Date(logTime).toLocaleDateString() === sTodayStr;
    }).length;

    const lastUsbTime = parseInt(localStorage.getItem('last_usb_backup') || '0');
    const isUsbValidInDb = lastUsbTime > resetThreshold && (sNow.getTime() - lastUsbTime) < (7 * 24 * 60 * 60 * 1000);

    const isRecoverySecure = sessionStatus.recovery || dbRecoveryCount > 0;
    const isUsbSecure = sessionStatus.usb || isUsbValidInDb;
    const isCloudSecure = sessionStatus.cloud || !!confirmedMirror;

    const handleResetIndicators = () => {
        localStorage.setItem('indicator_reset_time', new Date().getTime().toString());
        localStorage.removeItem('last_usb_backup'); 
        setSessionStatus({ recovery: false, usb: false, cloud: false }); 
        triggerCapy("Indicators Reset to REQUIRED state.");
    };

    // --- DEFINE DYNAMIC TABS ---
    const navTabs = [
        { id: 'general', label: 'General & Brand', icon: <Settings size={18} /> },
        { id: 'tiers', label: 'Tiers & Logic', icon: <Tag size={18} /> },
        { id: 'security', label: 'Security & Data', icon: <ShieldCheck size={18} /> },
    ];
    
    if (isSystemOwner) {
        navTabs.push({ id: 'architect', label: 'Architect (Tier 1)', icon: <Lock size={18} /> });
    }

    return (
      <div className="animate-fade-in max-w-6xl mx-auto pb-20">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tighter">Command Center</h2>
                  <p className={`text-[10px] font-mono font-bold animate-pulse ${isSystemOwner ? 'text-red-500' : 'text-emerald-500'}`}>
                      {isSystemOwner ? 'CLEARANCE: TIER 1 (OVERSEER)' : 'CLEARANCE: TIER 2 (MANAGER)'}
                  </p>
              </div>
              <div className="flex gap-2 mt-4 md:mt-0">
                  <button onClick={handleResetIndicators} className="bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-400 px-3 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-red-900/50 hover:text-red-400 hover:border-red-500 transition-all">
                      Reset Indicators
                  </button>
                  <button onClick={handleAdminLogout} className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-500 px-4 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-red-600 hover:text-white transition-all">
                      Lock Terminal
                  </button>
              </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-56 shrink-0 flex flex-col gap-2">
                  {navTabs.map(tab => (
                      <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                              activeTab === tab.id 
                                ? (tab.id === 'architect' ? 'bg-red-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-md')
                                : 'text-slate-400 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                          }`}
                      >
                          {tab.icon}
                          <span className="uppercase tracking-wider">{tab.label}</span>
                      </button>
                  ))}
              </div>

              <div className="flex-1 min-w-0 space-y-6">

                  {/* ---------------------------------------------------- */}
                  {/* WORKSPACE: GENERAL & BRAND */}
                  {/* ---------------------------------------------------- */}
                  {activeTab === 'general' && (
                      <div className="animate-fade-in space-y-6">
                          
                          {/* 🚀 LITE MODE (POTATO ENGINE) TOGGLE */}
                          <div className={`p-6 rounded-2xl shadow-sm border transition-all duration-300 ${isLiteMode ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                              <div className="flex items-center justify-between">
                                  <div>
                                      <h3 className={`font-bold text-lg flex items-center gap-2 ${isLiteMode ? 'text-emerald-500' : 'dark:text-white'}`}>
                                          ⚡ Cello Lite Mode
                                      </h3>
                                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                                          Disables blur, animations, and heavy GPU effects to save battery on low-end phones.
                                      </p>
                                  </div>
                                  <button 
                                      onClick={() => {
                                          setIsLiteMode(!isLiteMode);
                                          triggerCapy(!isLiteMode ? "Lite Mode Enabled! Battery saving active. ⚡" : "Lite Mode Disabled. Full graphics restored!");
                                      }}
                                      className={`transition-all duration-300 ${isLiteMode ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'text-slate-400 hover:text-slate-300'}`}
                                  >
                                      {isLiteMode ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                                  </button>
                              </div>
                          </div>

                          {/* COMPANY IDENTITY */}
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300">
                              <h3 className="font-bold text-lg mb-4 dark:text-white">Corporate Identity & Invoice Data</h3>
                              <div className="space-y-3">
                                  <div>
                                      <label className="text-xs font-bold text-slate-400 uppercase">Company Name</label>
                                      <input className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={editCompanyProfile.name} onChange={e => setEditCompanyProfile({...editCompanyProfile, name: e.target.value})}/>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-400 uppercase">Official Address (Used on Invoice Header)</label>
                                      <input className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={editCompanyProfile.address} onChange={e => setEditCompanyProfile({...editCompanyProfile, address: e.target.value})} placeholder="e.g. Jl. Jendral Sudirman No.123, Jakarta"/>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-400 uppercase">Contact Number</label>
                                      <input className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={editCompanyProfile.phone} onChange={e => setEditCompanyProfile({...editCompanyProfile, phone: e.target.value})} placeholder="e.g. (021) 1234567"/>
                                  </div>

                                  <div className="pt-4 border-t dark:border-slate-700">
                                      <label className="text-xs font-bold text-emerald-500 uppercase">Admin/Boss Display Name (For Signature)</label>
                                      <input 
                                          className="w-full p-2 border rounded dark:bg-slate-900 dark:border-emerald-800/50 dark:text-white focus:border-emerald-500 outline-none transition-colors" 
                                          value={appSettings.adminDisplayName || ''} 
                                          onChange={(e) => {
                                              const val = e.target.value;
                                              setAppSettings(prev => ({...prev, adminDisplayName: val}));
                                              if (user) setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { adminDisplayName: val }, {merge: true});
                                          }}
                                          placeholder="e.g. Abednego YB"
                                      />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-blue-500 uppercase">Bank Details (Invoice Footer)</label>
                                      <textarea 
                                          className="w-full p-2 border rounded dark:bg-slate-900 dark:border-blue-800/50 dark:text-white focus:border-blue-500 outline-none transition-colors resize-none h-20" 
                                          value={appSettings.bankDetails || ''} 
                                          onChange={(e) => {
                                              const val = e.target.value;
                                              setAppSettings(prev => ({...prev, bankDetails: val}));
                                              if (user) setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { bankDetails: val }, {merge: true});
                                          }}
                                          placeholder={"BCA 0301138379\nA/N ABEDNEGO YB"}
                                      />
                                  </div>

                                  {/* 🚀 TIER 1 ONLY: PITA CUKAI FINE PRICING */}
                                  {isSystemOwner && (
                                      <div className="pt-4 border-t dark:border-slate-700">
                                          <label className="text-xs font-bold text-red-500 uppercase flex items-center gap-1"><ShieldAlert size={14}/> Lost Pita Cukai Fine (Rp)</label>
                                          <div className="flex items-center gap-2 mt-1">
                                              <span className="text-slate-400 font-black">Rp</span>
                                              <input 
                                                  type="number" 
                                                  min="0"
                                                  className="w-full p-2 border rounded dark:bg-slate-900 dark:border-red-800/50 dark:text-white focus:border-red-500 outline-none transition-colors font-mono" 
                                                  value={appSettings?.cukaiFinePrice || 5000} 
                                                  onChange={(e) => {
                                                      const val = parseInt(e.target.value) || 0;
                                                      setAppSettings(prev => ({...prev, cukaiFinePrice: val}));
                                                      if (user) setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { cukaiFinePrice: val }, {merge: true});
                                                  }}
                                                  placeholder="e.g. 5000"
                                              />
                                          </div>
                                          <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-widest">Amount charged to salesmen per tax stamp lost.</p>
                                      </div>
                                  )}

                                  <button onClick={handleSaveCompanyProfile} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-colors w-full mt-4 shadow-md">Save Corporate Profile</button>
                              </div>
                          </div>

                          {/* MASCOT SETTINGS */}
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300">
                              <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white mb-4"><MessageSquare size={20}/> Mascot Settings</h3>
                              <div className="mb-6 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-700">
                                  <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-400 uppercase">Mascot Size</label><span className="text-xs text-orange-500 font-bold">{appSettings.mascotScale || 1}x</span></div>
                                  <input type="range" min="0.5" max="2.0" step="0.1" value={appSettings.mascotScale || 1} onChange={(e) => { const scale = parseFloat(e.target.value); setAppSettings(prev => ({ ...prev, mascotScale: scale })); setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { mascotScale: scale }, { merge: true }); }} className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500"/>
                              </div>
                              <div className="mb-4">
                                  <label className="text-xs font-bold text-slate-400 mb-1 block">Add New Dialogue Line</label>
                                  <div className="flex gap-2">
                                      <input className="flex-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="Type a message..." value={newMascotMessage} onChange={(e) => setNewMascotMessage(e.target.value)}/>
                                      <button onClick={handleAddMascotMessage} className="bg-emerald-500 text-white px-4 rounded font-bold">Add</button>
                                  </div>
                              </div>
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                  {activeMessages.map((msg, idx) => (
                                      <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2 rounded border dark:border-slate-700">
                                          {editingMsgIndex === idx ? (
                                              <div className="flex gap-2 w-full animate-fade-in">
                                                  <input autoFocus className="flex-1 p-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" value={editMsgText} onChange={(e) => setEditMsgText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditedMessage(idx)}/>
                                                  <button onClick={() => handleSaveEditedMessage(idx)} className="text-emerald-500 hover:text-emerald-600"><Save size={16}/></button>
                                                  <button onClick={() => setEditingMsgIndex(-1)} className="text-slate-400 hover:text-slate-400"><X size={16}/></button>
                                              </div>
                                          ) : (
                                              <>
                                                  <span className="text-sm dark:text-slate-300 italic truncate mr-2">"{msg}"</span>
                                                  <div className="flex gap-2 shrink-0">
                                                      <button onClick={() => { setEditingMsgIndex(idx); setEditMsgText(msg); }} className="text-slate-400 hover:text-blue-500"><Edit size={14}/></button>
                                                      <button data-kpm-del data-label="Delete" onClick={() => handleDeleteMascotMessage(msg)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                                  </div>
                                              </>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          </div>

                          {/* PROFILE PICTURE */}
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300">
                              <h3 className="font-bold text-lg mb-4 dark:text-white"><ImageIcon size={20}/> Mascot Profile</h3>
                              <div className="flex items-start gap-6">
                                  <div className="flex flex-col items-center">
                                      <img src={appSettings?.mascotImage || "/mr capy.png"} className="w-24 h-24 rounded-full border-4 border-orange-500 object-cover bg-slate-100" onError={(e) => {e.target.onerror = null; e.target.src="https://api.dicebear.com/7.x/avataaars/svg?seed=Capy"}}/>
                                      <span className="text-xs text-slate-400 mt-2">Current</span>
                                  </div>
                                  <div className="flex-1">
                                      <label className="bg-orange-100 dark:bg-slate-700 text-orange-600 dark:text-orange-300 px-4 py-2 rounded-lg cursor-pointer hover:bg-orange-200 transition-colors inline-flex items-center gap-2 font-medium">
                                          <Upload size={16} /> Select & Crop
                                          <input type="file" accept="image/*" onChange={handleMascotSelect} className="hidden" />
                                      </label>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* WORKSPACE: TIERS & LOGIC */}
                  {/* ---------------------------------------------------- */}
                  {activeTab === 'tiers' && (
                      <div className="animate-fade-in space-y-6">
                          
                         {/* TIER & MAP ICON MANAGER */}
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all">
                              <div className="flex justify-between items-center mb-4">
                                  <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white"><Tag size={20}/> Customer Tiers & Map Icons</h3>
                                  <div className="flex gap-2">
                                      <button onClick={() => {
                                          const hasUnranked = tierSettings.some(t => t.id.toLowerCase() === 'unranked');
                                          const newTier = !hasUnranked 
                                              ? { id: 'Unranked', label: 'Unranked', color: '#475569', iconType: 'emoji', value: '🪵' }
                                              : { id: `Tier_${Date.now()}`, label: 'New Rank', color: '#94a3b8', iconType: 'emoji', value: '❓' };
                                          
                                          const newTiers = [...tierSettings, newTier];
                                          setTierSettings(newTiers);
                                          handleSaveTiers(newTiers);
                                      }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md transition-all active:scale-95">
                                          <Plus size={14}/> Add Tier
                                      </button>
                                      <button onClick={handleExportTiers} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold"><Download size={14}/></button>
                                      <label className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold cursor-pointer"><Upload size={14}/><input type="file" accept=".json" onChange={handleImportTiers} className="hidden" /></label>
                                  </div>
                              </div>
                              <div className="overflow-x-auto pb-2">
                                  <div className="space-y-3 min-w-[650px]">
                                  {tierSettings.map((tier, idx) => (
                                      <div key={tier.id || idx} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border dark:border-slate-700 transition-colors hover:border-slate-400 dark:hover:border-slate-500">
                                          <input type="color" value={tier.color} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].color = e.target.value; handleSaveTiers(newTiers); }} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent flex-shrink-0"/>
                                          
                                          <input 
                                              value={tier.label} 
                                              onChange={(e) => { 
                                                  const newTiers = [...tierSettings]; 
                                                  newTiers[idx].label = e.target.value; 
                                                  if (tier.id.startsWith('Tier_')) newTiers[idx].id = e.target.value.replace(/\s+/g, '_');
                                                  setTierSettings(newTiers); 
                                              }} 
                                              onBlur={() => handleSaveTiers(tierSettings)} 
                                              className="w-28 p-2 text-xs font-bold border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white uppercase tracking-wider" 
                                          />
                                          
                                          <select value={tier.iconType} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].iconType = e.target.value; handleSaveTiers(newTiers); }} className="p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"><option value="emoji">Emoji</option><option value="image">Custom Logo</option></select>
                                          
                                          <div className="flex-1">
                                              {tier.iconType === 'image' ? (
                                                  <div className="flex gap-2">
                                                      <label htmlFor={`tier-upload-${idx}`} className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer hover:bg-slate-300 text-xs font-bold text-slate-400 dark:text-slate-300 whitespace-nowrap transition-colors shadow-inner">
                                                          <Upload size={14}/> 
                                                          {tier.value?.startsWith('data:') ? "Change Image" : "Upload Image"}
                                                          
                                                          <input 
                                                              id={`tier-upload-${idx}`} 
                                                              type="file" 
                                                              accept="image/*" 
                                                              className="hidden" 
                                                              onChange={(e) => handleTierIconSelect(e, idx)} 
                                                          />
                                                      </label>
                                                      
                                                      {tier.value?.startsWith('data:') && (
                                                          <button 
                                                              onClick={() => {
                                                                  const newTiers = [...tierSettings];
                                                                  newTiers[idx].value = '';
                                                                  setTierSettings(newTiers);
                                                                  handleSaveTiers(newTiers);
                                                              }} 
                                                              className="px-3 bg-red-100 dark:bg-red-900/40 text-red-500 rounded hover:bg-red-200 dark:hover:bg-red-500 dark:hover:text-white transition-colors flex items-center justify-center border border-red-500/30"
                                                              title="Clear Image"
                                                          >
                                                              <X size={14}/>
                                                          </button>
                                                      )}
                                                  </div>
                                              ) : (
                                                  <input value={tier.value} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].value = e.target.value; handleSaveTiers(newTiers); }} className="w-full p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="Paste Emoji Here" />
                                              )}
                                          </div>
                                          
                                          <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 shadow-inner" style={{ borderColor: tier.color }}>
                                              {tier.iconType === 'image' ? (tier.value ? <img src={tier.value} className="w-full h-full object-contain p-1" /> : <ImageIcon size={14} className="opacity-30"/>) : (<span className="text-lg">{tier.value}</span>)}
                                          </div>

                                          <button data-kpm-del data-label="Delete" onClick={async () => {
                                              if(await confirmAction(`Are you sure you want to delete the tier: ${tier.label}?`)) {
                                                  const newTiers = tierSettings.filter((_, i) => i !== idx);
                                                  setTierSettings(newTiers);
                                                  handleSaveTiers(newTiers);
                                              }
                                          }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-1" title="Delete Tier">
                                              <Trash2 size={16}/>
                                          </button>
                                      </div>
                                  ))}
                                  </div>
                              </div>
                          </div>
                          
                      

                          {/* 🚀 GLOBAL PERMISSION MATRIX — now open to Tier 2 (Company Owner) as well as
                              Tier 1, so each company can name and configure their own authority levels
                              instead of following one fixed default. The Tier 1/Developer row itself is
                              still protected and never appears in the editable list, regardless of who's
                              using this screen. */}
                          <PermissionMatrixEditor db={db} appId={appId} userRole={userRole || 'DEVELOPER'} userId={userId} />

                          {/* 🚀 FLEET PAINTBRUSH MASTER SWITCH (TIER 1/2 ONLY) — company-wide kill
                              switch for Journey Plan's fleet-color/boundary paintbrush. Defaults to
                              on (appSettings.enableFleetPaintbrush !== false) so nothing changes for
                              anyone until an owner deliberately turns it off. Same tier gate as the
                              Permission Matrix editor above (DEVELOPER/ADMIN/COMPANY_OWNER). */}
                          {(userRole === 'DEVELOPER' || userRole === 'ADMIN' || userRole === 'COMPANY_OWNER') && (
                              <div className={`p-6 rounded-2xl shadow-sm border transition-all duration-300 mb-6 ${appSettings.enableFleetPaintbrush !== false ? 'bg-orange-900/20 border-orange-500/50' : 'bg-black border-slate-800'}`}>
                                  <div className="flex items-center justify-between gap-4">
                                      <div>
                                          <h3 className={`font-bold text-lg flex items-center gap-2 ${appSettings.enableFleetPaintbrush !== false ? 'text-orange-400' : 'text-white'}`}>
                                              🖌️ Fleet Paintbrush (Journey Plan)
                                          </h3>
                                          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                                              When on, Tier 1-4 (Developer, Company Owner, Area Admin, Fleet Captain) can paint squad colors and map boundaries on Journey Plan. When off, the paintbrush is hidden for everyone, regardless of tier.
                                          </p>
                                      </div>
                                      <button
                                          onClick={() => {
                                              const newVal = !(appSettings.enableFleetPaintbrush !== false);
                                              setAppSettings(prev => ({ ...prev, enableFleetPaintbrush: newVal }));
                                              if (user) setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { enableFleetPaintbrush: newVal }, { merge: true });
                                              triggerCapy(newVal ? "Fleet Paintbrush Enabled for Tier 1-4! 🖌️" : "Fleet Paintbrush Disabled Company-Wide.");
                                          }}
                                          className={`shrink-0 transition-all duration-300 ${appSettings.enableFleetPaintbrush !== false ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 'text-slate-400 hover:text-slate-300'}`}
                                      >
                                          {appSettings.enableFleetPaintbrush !== false ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                                      </button>
                                  </div>
                              </div>
                          )}

                          {/* AUTOMATED PERFORMANCE TIERS (TIER 1 OVERSEER ONLY) */}
                          {isSystemOwner && (
                              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-red-500/20 mb-6 transition-all relative overflow-hidden">
                                  <div className="absolute top-0 right-0 p-4 opacity-5"><Lock size={120} className="text-red-500" /></div>
                                  
                                  <div className="relative z-10">
                                      <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                                          <div>
                                              <h3 className="font-bold text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                                                  <Settings size={20}/> Performance Tier Logic (Tier 1 Only)
                                              </h3>
                                              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Configure automated promotion/demotion conditions</p>
                                          </div>
                                          <button 
                                              onClick={handleSaveTierRules}
                                              disabled={isSavingTierRules}
                                              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all active:scale-95 shadow-md disabled:opacity-50"
                                          >
                                              <Save size={14} /> {isSavingTierRules ? 'Saving...' : 'Save Logic'}
                                          </button>
                                      </div>

                                      <div className="space-y-3">
                                          {tierSettings.map((tier, idx) => {
                                              const rule = tierRules[tier.id] || defaultLogic;
                                              const isOmset = rule.type === 'omset';

                                              return (
                                                  <div key={tier.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all hover:border-red-500/30">
                                                      
                                                      <div className="flex items-center gap-3 min-w-[140px] shrink-0">
                                                          <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: tier.color }}></div>
                                                          <div>
                                                              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{tier.label}</h4>
                                                              <p className="text-[11px] text-slate-400 uppercase tracking-widest">Target Requirement</p>
                                                          </div>
                                                      </div>

                                                      <ChevronRight className="hidden lg:block text-slate-400 shrink-0" size={16}/>

                                                      <div className="flex-1 flex flex-wrap items-center gap-2 bg-white dark:bg-black/40 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                                                          
                                                          <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded overflow-hidden">
                                                              <div className="px-2 text-slate-400 dark:text-slate-400">
                                                                  {isOmset ? <TrendingUp size={14}/> : <Package size={14}/>}
                                                              </div>
                                                              <select 
                                                                  value={rule.type}
                                                                  onChange={(e) => handleUpdateTierRule(tier.id, 'type', e.target.value)}
                                                                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-white uppercase p-2 outline-none cursor-pointer hover:text-blue-500 dark:hover:text-blue-400"
                                                              >
                                                                  <option value="omset" className="dark:bg-slate-900">Total Omset</option>
                                                                  <option value="volume" className="dark:bg-slate-900">Total Volume</option>
                                                              </select>
                                                          </div>

                                                          <span className="text-slate-400 font-black text-sm">=</span>

                                                          {isOmset ? (
                                                              <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded overflow-hidden">
                                                                  <span className="px-2 text-xs font-black text-emerald-600 dark:text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30">Rp</span>
                                                                  <input 
                                                                      type="text" 
                                                                      value={rule.omsetTarget === '' ? '' : new Intl.NumberFormat('en-US').format(rule.omsetTarget || 0)}
                                                                      onChange={(e) => {
                                                                          const val = e.target.value.replace(/[^0-9]/g, ''); 
                                                                          handleUpdateTierRule(tier.id, 'omsetTarget', val === '' ? '' : Number(val));
                                                                      }}
                                                                      className="bg-transparent text-xs font-black text-emerald-600 dark:text-emerald-400 p-2 w-32 outline-none text-right"
                                                                  />
                                                              </div>
                                                          ) : (
                                                              <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded overflow-hidden">
                                                                  <input 
                                                                      type="text" 
                                                                      value={rule.volumeTarget === '' ? '' : new Intl.NumberFormat('en-US').format(rule.volumeTarget || 0)}
                                                                      onChange={(e) => {
                                                                          const val = e.target.value.replace(/[^0-9]/g, '');
                                                                          handleUpdateTierRule(tier.id, 'volumeTarget', val === '' ? '' : Number(val));
                                                                      }}
                                                                      className="bg-transparent text-xs font-black text-orange-600 dark:text-orange-400 p-2 w-16 outline-none text-center border-r border-slate-200 dark:border-slate-700"
                                                                  />
                                                                  <select 
                                                                      value={rule.volumeUnit}
                                                                      onChange={(e) => handleUpdateTierRule(tier.id, 'volumeUnit', e.target.value)}
                                                                      className="bg-transparent text-xs font-bold text-orange-600 dark:text-orange-300 uppercase p-2 outline-none cursor-pointer"
                                                                  >
                                                                      <option value="Bks" className="dark:bg-slate-900">Bks</option>
                                                                      <option value="Slop" className="dark:bg-slate-900">Slop</option>
                                                                      <option value="Bal" className="dark:bg-slate-900">Bal</option>
                                                                      <option value="Karton" className="dark:bg-slate-900">Karton</option>
                                                                  </select>
                                                              </div>
                                                          )}

                                                          <span className="text-slate-400 font-black text-sm">/</span>

                                                          <select 
                                                              value={rule.timeframe}
                                                              onChange={(e) => handleUpdateTierRule(tier.id, 'timeframe', e.target.value)}
                                                              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-xs font-bold text-blue-600 dark:text-blue-300 uppercase p-2 outline-none cursor-pointer hover:border-blue-500"
                                                          >
                                                              <option value="30" className="dark:bg-slate-900">1 Bulan</option>
                                                              <option value="90" className="dark:bg-slate-900">3 Bulan</option>
                                                              <option value="180" className="dark:bg-slate-900">6 Bulan</option>
                                                              <option value="365" className="dark:bg-slate-900">1 Tahun</option>
                                                          </select>
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* WORKSPACE: SECURITY & DATA */}
                  {/* ---------------------------------------------------- */}
                  {activeTab === 'security' && (
                      /* THE RACK, SECOND TAB ON THE SYSTEM. Same three questions the Architect
                         terminal answers: what is this group allowed to do, what kind of module is
                         this, and what is its state right now — all readable before you open
                         anything. Grouped by CONSEQUENCE, not by feature, because that is the only
                         grouping that helps on a screen where one button makes a copy and the one
                         under it deletes the business: copies, then writes, then the stripe.
                         Every colour here is a token, so light mode comes free — see the
                         Off-Token Colour Migration Map. */
                      <div className="animate-fade-in">

                          <div className="kpm-band">Copies · your business data is not touched</div>

                          {/* The three readouts were three pulsing tiles that said SECURE or
                              REQUIRED in green and red. Lite Mode strips the colour and they became
                              three identical boxes, so the state lived only in the word. Rails
                              print the name and the state on one line and never depend on hue. */}
                          <div className="kpm-mod bench">
                              <div className="kpm-head">
                                  <span className="slot">Copy · 01</span>
                                  <div className="line">
                                      <h3>Master backup</h3>
                                      <span className={`kpm-read ${isRecoverySecure && isUsbSecure && isCloudSecure ? 'on' : 'alert'}`}>
                                          {[isRecoverySecure, isUsbSecure, isCloudSecure].filter(Boolean).length} of 3 current
                                      </span>
                                  </div>
                                  <p className="kpm-desc">
                                      Writes all three recovery points in one run — the recovery file, the USB copy and
                                      the cloud mirror. Safe to run as often as you like; each run replaces the one
                                      before it, and none of it changes your products, customers or sales.
                                  </p>
                              </div>
                              <div className="kpm-shelf split">
                                  <div className="kpm-rail">
                                      <h3>Recovery</h3>
                                      <span className={`kpm-read ${isRecoverySecure ? 'on' : 'alert'}`}>{isRecoverySecure ? 'Secure' : 'Required'}</span>
                                  </div>
                                  <div className="kpm-rail">
                                      <h3>USB copy</h3>
                                      <span className={`kpm-read ${isUsbSecure ? 'on' : 'alert'}`}>{isUsbSecure ? 'Secure' : 'Out of date'}</span>
                                  </div>
                                  <div className="kpm-rail">
                                      <h3>Cloud mirror</h3>
                                      <span className={`kpm-read ${isCloudSecure ? 'on' : 'alert'}`}>{isCloudSecure ? 'Secure' : 'Required'}</span>
                                  </div>
                                  {/* One row, not four stacked bars. The three downloads are
                                      routine and hug their word; the master run keeps the amber
                                      border and sits last, where the eye finishes. */}
                                  <div className="kpm-acts">
                                      <button type="button" className="kpm-btn" onClick={() => handleSingleBackup('RECOVERY')}>Recovery</button>
                                      <button type="button" className="kpm-btn" onClick={() => handleSingleBackup('USB')}>USB</button>
                                      <button type="button" className="kpm-btn" onClick={() => handleSingleBackup('CLOUD')}>Cloud</button>
                                      <button type="button" className="kpm-btn key" onClick={handleMasterProtocol}>Run master backup</button>
                                  </div>
                              </div>
                          </div>

                          <div className="kpm-band">Live · writes to the business database</div>

                          {(userRole === 'DEVELOPER' || userRole === 'ADMIN' || userRole === 'COMPANY_OWNER') && (
                              <div className="kpm-mod live">
                                  <div className="kpm-head">
                                      <span className="slot">Live · 01</span>
                                      <div className="line">
                                          <h3>Rebuild career history</h3>
                                          <span className="kpm-read on">Writes every agent</span>
                                      </div>
                                      <p className="kpm-desc">
                                          Recounts every salesman's career from all verified EOD reports and writes the
                                          result back. Desktop and a strong connection only. Safe to run more than once —
                                          each run recomputes from the reports, it does not add to what is there.
                                      </p>
                                  </div>
                                  <div className="kpm-shelf split">
                                      <div className="kpm-acts">
                                          <button type="button" className="kpm-btn" onClick={handleRecalculateCareer}>Rebuild now</button>
                                      </div>
                                  </div>
                              </div>
                          )}

                          {/* 🚀 RANK SOURCE (Phase 4). Both positions are drawn, like photo storage:
                              a single toggle asked him to remember which way "on" points AND what
                              the two ways mean, on a setting that decides every salesman's rank.
                              ⚠️ ONE WRITER. Two buttons, one `writeCareerLedger` — a switch with a
                              copy of the write behind each position is how a setting saves on the
                              screen and never reaches the database. */}
                          {(userRole === 'DEVELOPER' || userRole === 'ADMIN' || userRole === 'COMPANY_OWNER') && (
                              <div className="kpm-mod live">
                                  <div className="kpm-head">
                                      <span className="slot">Live · 02</span>
                                      <div className="line">
                                          <h3>Rank source</h3>
                                          <span className={`kpm-read ${appSettings.useCareerLedger ? 'on' : ''}`}>
                                              {appSettings.useCareerLedger ? 'Career history' : 'Last 7 days'}
                                          </span>
                                      </div>
                                      <p className="kpm-desc">
                                          What every salesman's rank is counted from. <b>Last 7 days</b> is a rolling sales
                                          window, so a quiet week drops a rank. <b>Career history</b> reads the permanent
                                          record instead and never drops for a slow week — rebuild the history above at
                                          least once first, or it reads an empty ledger the moment you switch.
                                      </p>
                                  </div>
                                  <div className="kpm-shelf split">
                                      <div className="kpm-switch" role="group" aria-label="Rank source">
                                          <button type="button" aria-pressed={!appSettings.useCareerLedger}
                                              onClick={() => writeCareerLedger(false, { db, appId, user, setAppSettings, triggerCapy })}>
                                              Last 7 days
                                          </button>
                                          <button type="button" aria-pressed={!!appSettings.useCareerLedger}
                                              onClick={() => writeCareerLedger(true, { db, appId, user, setAppSettings, triggerCapy })}>
                                              Career history
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          )}

                          {/* The PIN card said "Administrator Access Verified" in green on green —
                              a status that is true for anyone who can see the card at all, so it
                              reported nothing. The account it belongs to is the useful fact. */}
                          <div className="kpm-mod live">
                              <div className="kpm-head">
                                  <span className="slot">Live · 03</span>
                                  <div className="line">
                                      <h3>Master vault PIN</h3>
                                      <span className="kpm-read on">Set</span>
                                  </div>
                                  <p className="kpm-desc">
                                      The PIN that opens the vault on this account. Changing it takes effect on every
                                      device immediately, and the old one stops working the moment you save.
                                  </p>
                              </div>
                              <div className="kpm-shelf split">
                                  <label className="kpm-field">
                                      <span>Signed in as</span>
                                      <span className="fixed">{currentUserEmail || "—"}</span>
                                  </label>
                                  <div className="kpm-acts">
                                      <button type="button" className="kpm-btn" onClick={handleChangePin}>Change PIN</button>
                                  </div>
                              </div>
                          </div>

                          {/* 🚀 DEVICE AUTHORIZATION LIST. Was a bright blue card — blue is not in
                              this app's palette at all, and it was the last one left in Settings.
                              Each device is a record: who it is above, what you can do to it below,
                              which is the shape the tenant registry already uses.
                              ⚠️ "Revoke" carries its own word, so it must NOT wear `data-kpm-del` —
                              that marker prints the label a second time. */}
                          <div className="kpm-mod live">
                              <div className="kpm-head">
                                  <span className="slot">Live · 04</span>
                                  <div className="line">
                                      <h3>Biometric devices</h3>
                                      <span className={`kpm-read ${registeredPasskeys?.length ? 'on' : ''}`}>
                                          {registeredPasskeys?.length ? `${registeredPasskeys.length} authorised` : 'None yet'}
                                      </span>
                                  </div>
                                  <p className="kpm-desc">
                                      Phones and laptops allowed to open the vault with a fingerprint or face instead of
                                      the PIN. A device can only be authorised from the address you are on now, and the
                                      fingerprint never leaves it — only the permission is stored here.
                                  </p>
                              </div>
                              <div className="kpm-shelf split">
                                  {registeredPasskeys && registeredPasskeys.length > 0 ? (
                                      registeredPasskeys.map((device, idx) => (
                                          <div key={idx} className="kpm-rec">
                                              <div className="who">
                                                  <b>{device.name}</b>
                                                  <code>Added {new Date(device.addedAt).toLocaleDateString()}</code>
                                              </div>
                                              <div className="acts">
                                                  <button type="button" className="kpm-btn hazard"
                                                      onClick={() => handleRemovePasskey(device)}
                                                      title="This device can no longer open the vault with a fingerprint">
                                                      Revoke
                                                  </button>
                                              </div>
                                          </div>
                                      ))
                                  ) : (
                                      <p className="kpm-desc">No devices authorised yet — this account opens the vault with the PIN only.</p>
                                  )}
                                  <div className="kpm-acts">
                                      <button type="button" className="kpm-btn key" onClick={handleRegisterPasskey}>Authorise this device</button>
                                  </div>
                              </div>
                          </div>

                          {/* Export and Import lived on one row and read as a matched pair, which
                              hid the fact that one of them REPLACES a dataset. Same row, but the
                              description now says which half is the dangerous one. */}
                          <div className="kpm-mod live">
                              <div className="kpm-head">
                                  <span className="slot">Live · 05</span>
                                  <div className="line">
                                      <h3>Share a dataset</h3>
                                      <span className="kpm-read">Import overwrites</span>
                                  </div>
                                  <p className="kpm-desc">
                                      Hands one part of your setup to another device or another person as a file.
                                      <b> Export</b> only reads. <b>Import</b> replaces everything in that dataset with
                                      what is in the file, and there is no undo for it.
                                  </p>
                              </div>
                              <div className="kpm-shelf split">
                                  {[
                                      { label: 'Products & Prices', type: 'products', hint: 'Every product, unit and price level' },
                                      { label: 'Customer Directory', type: 'customers', hint: 'Every customer and their details' },
                                      { label: 'Full Configuration', type: 'both', hint: 'Products and customers together' }
                                  ].map((item) => (
                                      <div key={item.type} className="kpm-rec">
                                          <div className="who">
                                              <b>{item.label}</b>
                                              <code>{item.hint}</code>
                                          </div>
                                          <div className="acts">
                                              <button type="button" className="kpm-btn" onClick={() => handleExportGranular(item.type)}>Export</button>
                                              <label className="kpm-btn">
                                                  Import
                                                  <input type="file" accept=".json" onChange={(e) => handleImportGranular(e, item.type)} className="hidden" />
                                              </label>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <div className="kpm-band hazard">Irreversible · nothing here can be undone</div>

                          {/* Restore was the quietest control on the old screen — a dashed outline
                              at the bottom of the backup card, styled like a file drop zone. It
                              replaces the entire database. It belongs under the stripe. */}
                          <div className="kpm-mod hazard">
                              <div className="kpm-head">
                                  <span className="slot">Hazard · 01</span>
                                  <div className="line">
                                      <h3>Restore from a backup file</h3>
                                      <span className="kpm-read alert">Replaces everything</span>
                                  </div>
                                  <p className="kpm-desc">
                                      Reads a .json backup and writes it over your live data. Anything recorded since
                                      that file was made is gone. Run a master backup first if you are not certain.
                                  </p>
                              </div>
                              <div className="kpm-shelf split">
                                  <label className="kpm-btn hazard block">
                                      Choose a backup file
                                      <input type="file" accept=".json" onChange={handleRestoreData} className="hidden" />
                                  </label>
                              </div>
                          </div>

                          <div className="kpm-mod hazard">
                              <div className="kpm-head">
                                  <span className="slot">Hazard · 02</span>
                                  <div className="line">
                                      <h3>Data wipe</h3>
                                      <span className="kpm-read alert">Permanent</span>
                                  </div>
                                  <p className="kpm-desc">
                                      Deletes a dataset from the database outright. There is no undo and no recycle bin —
                                      the only way back is a backup file you made before pressing it.
                                  </p>
                              </div>
                              {/* HOLD TO CONFIRM. The three acts with no undo are the only ones in
                                  the app that ask for pressure rather than a click — 1.6s cannot
                                  happen by accident, and the button reports its own result instead
                                  of throwing it to a toast. The two `confirmAction` dialogs in
                                  handleWipeData still run: this is a gate IN FRONT of them, never
                                  a replacement for them. */}
                              <div className="kpm-shelf split">
                                  <HoldButton onConfirm={() => handleWipeData('products')}
                                      workingLabel="Wiping products…" doneLabel="Products wiped">
                                      Hold to wipe products &amp; prices
                                  </HoldButton>
                                  <HoldButton onConfirm={() => handleWipeData('customers')}
                                      workingLabel="Wiping customers…" doneLabel="Customers wiped">
                                      Hold to wipe customers
                                  </HoldButton>
                                  <HoldButton onConfirm={() => handleWipeData('both')}
                                      workingLabel="Wiping everything…" doneLabel="Everything wiped">
                                      Hold to wipe everything
                                  </HoldButton>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* WORKSPACE: ARCHITECT TERMINAL (TIER 1 ONLY) */}
                  {/* ---------------------------------------------------- */}
                  {activeTab === 'architect' && isSystemOwner && (
                      /* THE RACK. Modules are grouped under bands that say what the group is
                         ALLOWED to do, and authority is graded by material: hairline = routine,
                         gold = the module's primary act, stripe = irreversible. Colour alone
                         could not do this job — Lite Mode strips it, and it could not tell the
                         disco joke apart from an ownership transfer, which is exactly the
                         hierarchy this screen had backwards. */
                      <div className="animate-fade-in">

                          <div className="kpm-band">Bench · simulation and reversible tools</div>

                          {/* 🧪 ACHIEVEMENT TESTER — dev tool, correctly Tier-1-only (unlike the
                              career-ledger toggle and the recalculate button, which are business
                              features and live under Security so Tier 2 owners can reach them). */}
                          <div className="kpm-mod bench">
                              <div className="kpm-head">
                                  <span className="slot">Bench · 01</span>
                                  <div className="line">
                                      <h3>Achievement Tester</h3>
                                      <span className="kpm-read">Writes nothing</span>
                                  </div>
                                  <p className="kpm-desc">Fire any achievement at your own account to see exactly what a salesman sees when it unlocks. Nothing is saved and nobody is notified.</p>
                              </div>
                              <div className="kpm-shelf split">
                                  <AchievementTester db={db} appId={appId} userId={userId} />
                              </div>
                          </div>

                          {/* 🔧 Writes real career docs — Tier 1 only, and every grant is
                              reversible via its own Undo. */}
                          <div className="kpm-mod live">
                              <div className="kpm-head">
                                  <span className="slot">Live · 01</span>
                                  <div className="line">
                                      <h3>Career Dev Tools</h3>
                                      <span className="kpm-read on">Writes live data</span>
                                  </div>
                                  <p className="kpm-desc">Grants ranks, badges and experience to a real salesman's record. Every grant has its own Undo, so a mistake here is reversible.</p>
                              </div>
                              <div className="kpm-shelf split">
                                  <CareerDevTools db={db} appId={appId} userId={userId} triggerCapy={triggerCapy} />
                              </div>
                          </div>

                          <div className="kpm-band">Live · changes how the app stores real data</div>

                          {/* 🚀 PHOTO STORAGE MODE (SPARK vs BLAZE SWITCH)
                              Both positions are drawn. A single toggle asked him to remember which
                              way "on" points AND what the two ways mean, on a setting that decides
                              where every handover photo in the business is written. */}
                          <div className="kpm-mod live">
                              <div className="kpm-head">
                                  <span className="slot">Live · 02</span>
                                  <div className="line">
                                      <h3>Photo storage</h3>
                                      <span className={`kpm-read ${appSettings.usePhotoStorage ? 'on' : ''}`}>
                                          {appSettings.usePhotoStorage ? 'Cloud · Blaze' : 'Database'}
                                      </span>
                                  </div>
                                  <p className="kpm-desc">
                                      Where every handover photo in the business gets written. <b>Database</b> works on
                                      any Firebase plan. <b>Cloud</b> uploads to Firebase Storage instead and needs the
                                      Blaze plan active — without it, photos stop saving.
                                  </p>
                              </div>
                              <div className="kpm-shelf split">
                                  <div className="kpm-switch" role="group" aria-label="Photo storage destination">
                                      <button type="button" aria-pressed={!appSettings.usePhotoStorage}
                                          onClick={() => writePhotoStorage(false, { db, appId, user, setAppSettings, triggerCapy })}>
                                          Database
                                      </button>
                                      <button type="button" aria-pressed={!!appSettings.usePhotoStorage}
                                          onClick={() => writePhotoStorage(true, { db, appId, user, setAppSettings, triggerCapy })}>
                                          Cloud · Blaze
                                      </button>
                                  </div>
                              </div>
                          </div>

                          {/* LANDLORD DASHBOARD — the rail lives here, so the child no longer
                              prints a second "Architect Terminal" heading louder than the tab's. */}
                          <div className="kpm-mod live">
                              <div className="kpm-head">
                                  <span className="slot">Live · 03</span>
                                  <div className="line">
                                      <h3>Tenant registry</h3>
                                      <span className="kpm-read on">Provisions accounts</span>
                                  </div>
                                  <p className="kpm-desc">
                                      Every company using this software, and their owner accounts. Creating one here
                                      gives a stranger their own separate business inside your app; suspending one
                                      locks that owner out immediately.
                                  </p>
                              </div>
                              <LandlordDashboard db={db} appId={appId} user={user} />
                          </div>

                          <div className="kpm-band hazard">Irreversible · nothing here can be undone</div>

                          {/* CROWN TRANSFER — the loudest control on this screen, which is what it
                              was NOT before: the disco joke wore the filled red plate and this wore
                              a quiet outline. */}
                          <div className="kpm-mod hazard">
                              <div className="kpm-head">
                                  <span className="slot">Hazard · 01</span>
                                  <div className="line">
                                      <h3>Crown transfer</h3>
                                      <span className="kpm-read alert">Sealed</span>
                                  </div>
                                  <p className="kpm-desc">
                                      Hands ownership of this software to another account, permanently. The new owner
                                      can lock you out, and you cannot take it back yourself.
                                  </p>
                              </div>
                              <div className="kpm-shelf split">
                                  <button type="button" className="kpm-btn hazard block" onClick={() => setShowCrownTransfer(true)}>
                                      Initiate transfer
                                  </button>
                              </div>
                          </div>

                          {showCrownTransfer && (
                              <CrownTransferProtocol 
                                  db={db} 
                                  appId={appId} 
                                  userId={userId} 
                                  user={user} 
                                  onClose={() => setShowCrownTransfer(false)} 
                                  triggerCapy={triggerCapy} 
                              />
                          )}

                          <div className="kpm-band">Harmless · touches no data</div>

                          {/* DISCO PROTOCOL — deliberately the QUIETEST control in the rack now.
                              It used to be the largest and the only filled red plate on a screen
                              that also transfers ownership of the product. */}
                          <div className="kpm-mod idle">
                              <div className="kpm-head">
                                  <span className="slot">Harmless · 01</span>
                                  <div className="line">
                                      <h3>Capy disco protocol</h3>
                                      <span className="kpm-read">{isDiscoMode ? 'Running' : 'Idle'}</span>
                                  </div>
                                  <p className="kpm-desc">Makes the whole app dance for a few seconds. Touches no data at all.</p>
                              </div>
                              <div className="kpm-shelf split">
                                  <button type="button" onClick={triggerDiscoParty} disabled={isDiscoMode} className="kpm-btn block">
                                      {isDiscoMode
                                          ? <><Music size={18} className="inline mr-2"/> Overloading…</>
                                          : <><ShieldAlert size={18} className="inline mr-2"/> Do not press</>}
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}

              </div>
          </div>
      </div>
    );
}

/* ONE WRITER for the photo-storage setting. The switch shows two positions, and two positions
   with two copies of the write logic is how a setting ends up saved locally but not in the
   database — the failure Aldi cannot see until the next login. */
const writePhotoStorage = (newVal, { db, appId, user, setAppSettings, triggerCapy }) => {
    setAppSettings(prev => ({ ...prev, usePhotoStorage: newVal }));
    if (user) setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { usePhotoStorage: newVal }, { merge: true });
    triggerCapy(newVal
        ? "Photos will upload to Firebase Storage. The Blaze plan must be active. ☁️"
        : "Photos will save straight into the database. Works on any plan.");
};

/* ONE WRITER for the rank source, same shape as writePhotoStorage above and for the same reason:
   the two-position switch has a button per position, and a copy of this write behind each is how a
   setting saves on screen and never reaches the database. Both buttons call this. */
const writeCareerLedger = (newVal, { db, appId, user, setAppSettings, triggerCapy }) => {
    setAppSettings(prev => ({ ...prev, useCareerLedger: newVal }));
    if (user) setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { useCareerLedger: newVal }, { merge: true });
    triggerCapy(newVal
        ? "Rank now reads permanent career history. A quiet week no longer drops anyone. 🏆"
        : "Rank back to the rolling 7-day sales window.");
};

// 🚀 PLUG & PLAY: THE RESPONSIVE MATRIX EDITOR
const PermissionMatrixEditor = ({ db, appId, userRole, userId }) => {
    if (userRole !== 'DEVELOPER' && userRole !== 'ADMIN' && userRole !== 'COMPANY_OWNER') return null;

    const [matrix, setMatrix] = React.useState(ROLE_PERMISSIONS);
    const [tiers, setTiers] = React.useState(DYNAMIC_TIERS.filter(t => t.id !== 'DEVELOPER'));
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (!db || !appId || !userId) return;
        const fetchMatrix = async () => {
            try {
                let snap = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/settings`, 'permission_matrix'));
                if (!snap.exists()) snap = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/appSettings`, 'permission_matrix'));
                
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.matrix && Object.keys(data.matrix).length > 0) setMatrix(data.matrix);
                    if (data.tiers && data.tiers.length > 0) {
                        setTiers(data.tiers.filter(t => t.id !== 'DEVELOPER'));
                    }
                }
            } catch (error) { console.error("Failed to load Master Permission Matrix:", error); }
        };
        fetchMatrix();
    }, [db, appId, userId]);
    
    // Mobile View State
    const [activeMobileTierId, setActiveMobileTierId] = React.useState(tiers[0]?.id);

    // DND States (Desktop)
    const [draggedIdx, setDraggedIdx] = React.useState(null);
    const [dragOverIdx, setDragOverIdx] = React.useState(null);

    // 🚀 NEW: 'can_view_team_history' injected into the Matrix array
    const ALL_FEATURES = [
        { id: 'view_dashboard', label: 'Command Center' },
        { id: 'view_map', label: 'Map System' },
        { id: 'view_journey', label: 'Journey Plan' },
        { id: 'view_fleet', label: 'Fleet & Canvas' },
        { id: 'view_master_vault', label: 'Master Vault' },
        { id: 'view_restock_vault', label: 'Logistics & Warehouse' }, 
        { id: 'view_agent_inventory', label: 'Agent Inventory' },
        { id: 'view_sales', label: 'Sales Terminal' },
        { id: 'view_receivables', label: 'Receivables & Consign' },
        { id: 'view_eod', label: 'EOD Setoran' },
        { id: 'view_stock_opname', label: 'Stock Opname' },
        { id: 'view_customers', label: 'Customers' },
        { id: 'view_sampling', label: 'Sampling' },
        { id: 'view_audit_logs', label: 'Audit Logs' },
        { id: 'view_settings', label: 'Settings Panel' },
        { id: 'view_agent_profile', label: 'Agent Profile' },
        { id: 'can_unrestricted_sample', label: 'Bypass GPS for Sampling' }, 
        { id: 'edit_agent_roles', label: '[GOD] Promote Agents' },
        { id: 'edit_rank_config', label: '[GOD] Edit Ranks' }
    ];

    // 🚀 THE 3 REPORT VISIBILITY MODES
    const REPORT_PERMS = ['view_reports_global', 'view_reports_regional', 'view_reports_personal'];

    const togglePermission = (tierId, featureId) => {
        const newMatrix = { ...matrix };
        const tierPerms = [...(newMatrix[tierId] || [])];
        if (tierPerms.includes(featureId)) newMatrix[tierId] = tierPerms.filter(f => f !== featureId);
        else newMatrix[tierId] = [...tierPerms, featureId];
        setMatrix(newMatrix);
    };

    // 🚀 CUSTOMER DIRECTORY ACCESS: 'none' in this dropdown means "not explicitly set" ->
    // config/permissions.js's getCustomerAccessLevel() defaults that to customers_edit_global
    // (today's unrestricted behavior), NOT a locked-out state. Unlike Reporting Authority's
    // 'none' (which really means no access), this dropdown's 'none' is a synonym for Global.
    const changeCustomerAccess = (tierId, newAccessLevel) => {
        const newMatrix = { ...matrix };
        let tierPerms = (newMatrix[tierId] || []).filter(p => !CUSTOMER_EDIT_PERMS.includes(p));

        if (newAccessLevel !== 'none') {
            tierPerms.push(newAccessLevel);
        }

        newMatrix[tierId] = tierPerms;
        setMatrix(newMatrix);
    };

    // 🚀 NEW: Sets which of the 3 report modes a tier has (none/personal/regional/global)
    const changeReportAccess = (tierId, newAccessLevel) => {
        const newMatrix = { ...matrix };
        let tierPerms = (newMatrix[tierId] || []).filter(p => !REPORT_PERMS.includes(p));

        if (newAccessLevel !== 'none') {
            tierPerms.push(newAccessLevel);
        }

        newMatrix[tierId] = tierPerms;
        setMatrix(newMatrix);
    };

    // 🚀 DESKTOP DRAG AND DROP HANDLERS
    const handleDragStart = (e, idx) => { setDraggedIdx(idx); e.dataTransfer.effectAllowed = "move"; };
    const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleDrop = (e, targetIdx) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === targetIdx) { setDragOverIdx(null); return; }
        const newTiers = [...tiers];
        const [moved] = newTiers.splice(draggedIdx, 1);
        newTiers.splice(targetIdx, 0, moved);
        recalculateTierRanks(newTiers);
        setDraggedIdx(null); setDragOverIdx(null);
    };
    const handleDragEnd = () => { setDraggedIdx(null); setDragOverIdx(null); };

    // 🚀 MOBILE REORDER HANDLERS
    const handleShiftTier = (id, direction) => {
        const idx = tiers.findIndex(t => t.id === id);
        if ((direction === -1 && idx === 0) || (direction === 1 && idx === tiers.length - 1)) return;
        const newTiers = [...tiers];
        const temp = newTiers[idx];
        newTiers[idx] = newTiers[idx + direction];
        newTiers[idx + direction] = temp;
        recalculateTierRanks(newTiers);
    };

    const recalculateTierRanks = (tierArray) => {
        const renumbered = tierArray.map((t, idx) => {
            const cleanName = t.label.replace(/^T\d+:\s*/, '');
            return { ...t, label: `T${idx + 2}: ${cleanName}` };
        });
        setTiers(renumbered);
    };

    // 🚀 TIER EDITING HANDLERS
    const handleAddTier = async () => {
        const name = await promptAction("Enter new Rank Name (e.g., WAREHOUSE):");
        if (!name || name.trim() === '') return;
        const newId = `CUSTOM_TIER_${Date.now()}`;
        const newTiers = [...tiers, { id: newId, label: `T${tiers.length + 2}: ${name.toUpperCase().trim()}`, color: 'text-cyan-400' }];
        setTiers(newTiers);
        setMatrix({ ...matrix, [newId]: [] });
        setActiveMobileTierId(newId);
    };

    const handleRenameTier = async (id) => {
        const idx = tiers.findIndex(t => t.id === id);
        const cleanName = tiers[idx].label.replace(/^T\d+:\s*/, '');
        const newName = await promptAction(`Rename Rank T${idx + 2}:`, cleanName);
        if (newName && newName.trim() !== '') {
            setTiers(tiers.map((t, i) => t.id === id ? { ...t, label: `T${i + 2}: ${newName.toUpperCase().trim()}` } : t));
        }
    };

    const handleDeleteTier = async (id) => {
        if (!id.startsWith('CUSTOM_')) return notify("System core tiers cannot be deleted, but you can rename and move them!");
        if (await confirmAction("Delete this custom tier? All remaining tiers will automatically shift up in rank.")) {
            const remaining = tiers.filter(t => t.id !== id);
            recalculateTierRanks(remaining);
            const newMatrix = { ...matrix };
            delete newMatrix[id];
            setMatrix(newMatrix);
            if (activeMobileTierId === id) setActiveMobileTierId(remaining[0]?.id);
        }
    };

    const saveMatrixToFirebase = async () => {
        setIsSaving(true);
        try {
            const godTiers = DYNAMIC_TIERS.filter(t => t.id === 'DEVELOPER');
            const fullTiers = [...godTiers, ...tiers];

            const payload = { matrix, tiers: fullTiers, updatedAt: new Date().toISOString() };
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/settings`, 'permission_matrix'), payload);
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/appSettings`, 'permission_matrix'), payload, { merge: true });
            
            injectDynamicPermissions(matrix, fullTiers); 
            notify("✅ Matrix & Hierarchy Deployed to Global Server!");
        } catch (e) { 
            console.error(e);
            notify("Matrix Deployment Failed."); 
        }
        setIsSaving(false);
    };

    const activeTier = tiers.find(t => t.id === activeMobileTierId) || tiers[0];
    const activeTierIdx = tiers.findIndex(t => t.id === activeTier?.id);

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 lg:p-6 shadow-2xl mt-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-lg lg:text-xl font-black text-rose-500 uppercase tracking-widest flex items-center gap-3"><ShieldCheck size={24}/> Global Permission Matrix</h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 hidden lg:block">Tier 1 Overrides - Drag columns to reorder ranks.</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 lg:hidden">Select a tier below to edit its permissions.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <button onClick={handleAddTier} className="flex-1 lg:flex-none justify-center bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 border border-slate-600 transition-colors">
                        <Plus size={16}/> Add Tier
                    </button>
                    <button onClick={saveMatrixToFirebase} disabled={isSaving} className="flex-1 lg:flex-none justify-center bg-rose-600 hover:bg-rose-500 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-colors">
                        <Save size={16}/> {isSaving ? 'Deploying...' : 'Deploy Matrix'}
                    </button>
                </div>
            </div>

            {/* ========================================= */}
            {/* 📱 MOBILE VIEW (Hidden on large screens)  */}
            {/* ========================================= */}
            <div className="block lg:hidden space-y-4">
                {/* Horizontal Tier Scroller */}
                <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar snap-x">
                    {tiers.map((t) => (
                        <button 
                            key={t.id} 
                            onClick={() => setActiveMobileTierId(t.id)}
                            className={`snap-start whitespace-nowrap px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeMobileTierId === t.id ? 'bg-slate-800 text-white border border-emerald-500 shadow-inner' : 'bg-slate-950/50 text-slate-400 border border-slate-800 hover:text-slate-300'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Active Tier Controls */}
                {activeTier && (
                    <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleShiftTier(activeTier.id, -1)} disabled={activeTierIdx === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30"><ChevronLeft size={18}/></button>
                                <span className={`text-xs font-black uppercase tracking-widest ${activeTier.color}`}>{activeTier.label}</span>
                                <button onClick={() => handleShiftTier(activeTier.id, 1)} disabled={activeTierIdx === tiers.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30"><ChevronRight size={18}/></button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleRenameTier(activeTier.id)} className="text-slate-400 hover:text-white p-1 bg-slate-800 rounded"><Edit size={14}/></button>
                                {activeTier.id.startsWith('CUSTOM_') && (
                                    <button data-kpm-del data-label="Delete" onClick={() => handleDeleteTier(activeTier.id)} className="text-red-500 hover:text-red-400 p-1 bg-red-950/30 rounded"><Trash2 size={14}/></button>
                                )}
                            </div>
                        </div>

                        {/* Toggle List */}
                        <div className="space-y-2">
                            {ALL_FEATURES.map(feature => {
                                const hasAccess = (matrix[activeTier.id] || []).includes(feature.id);
                                return (
                                    <React.Fragment key={feature.id}>
                                        <div className="flex justify-between items-center p-2 rounded hover:bg-slate-800/30">
                                            <span className={`text-[10px] font-bold font-mono ${feature.id.includes('edit_') ? 'text-rose-400' : 'text-slate-300'}`}>{feature.label}</span>
                                            <button onClick={() => togglePermission(activeTier.id, feature.id)} className={`transition-all duration-300 ${hasAccess ? 'text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'text-slate-400'}`}>
                                                {hasAccess ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                                            </button>
                                        </div>
                                        {/* 🚀 CUSTOMER DIRECTORY ACCESS: sits right after the Customers toggle */}
                                        {feature.id === 'view_customers' && (
                                            <div className="my-2 bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-inner">
                                                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-2 flex items-center gap-2"><Store size={14}/> Customer Directory Access</label>
                                                <select
                                                    value={(matrix[activeTier.id] || []).find(p => CUSTOMER_EDIT_PERMS.includes(p)) || 'none'}
                                                    onChange={(e) => changeCustomerAccess(activeTier.id, e.target.value)}
                                                    className="w-full bg-black/40 border border-slate-600 rounded p-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
                                                >
                                                    <option value="none">Global (edit any customer — default)</option>
                                                    <option value="customers_edit_global">Global (edit any customer — default)</option>
                                                    <option value="customers_edit_own_region">Own Region Only</option>
                                                    <option value="customers_view_only">View Only (no edits)</option>
                                                </select>
                                            </div>
                                        )}
                                        {/* 🚀 REPORTING AUTHORITY: sits right after Sampling, replacing the old Reports + View Team History toggles */}
                                        {feature.id === 'view_sampling' && (
                                            <div className="my-2 bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-inner">
                                                <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-2 flex items-center gap-2"><BarChart2 size={14}/> Reporting Authority</label>
                                                <select
                                                    value={(matrix[activeTier.id] || []).find(p => REPORT_PERMS.includes(p)) || 'none'}
                                                    onChange={(e) => changeReportAccess(activeTier.id, e.target.value)}
                                                    className="w-full bg-black/40 border border-slate-600 rounded p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                                                >
                                                    <option value="none">No Access</option>
                                                    <option value="view_reports_personal">Lone Wolf (Personal Data Only)</option>
                                                    <option value="view_reports_regional">Regional Command (Branch Data)</option>
                                                    <option value="view_reports_global">God Mode (Global Master Data)</option>
                                                </select>
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================= */}
            {/* 💻 DESKTOP VIEW (Hidden on small screens) */}
            {/* ========================================= */}
            <div className="hidden lg:block overflow-x-auto custom-scrollbar pb-4">
                <table className="w-full text-left border-collapse min-w-[800px] select-none">
                    <thead>
                        <tr>
                            <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 bg-slate-950/50">Feature / Module</th>
                            {tiers.map((tier, idx) => {
                                const cleanName = tier.label.replace(/^T\d+:\s*/, '');
                                return (
                                    <th 
                                        key={tier.id} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragOver={(e) => handleDragOver(e, idx)} onDrop={(e) => handleDrop(e, idx)} onDragEnd={handleDragEnd}
                                        className={`p-3 border-b border-slate-800 text-center bg-slate-950/50 group cursor-move transition-all duration-200 ${dragOverIdx === idx ? 'bg-slate-800 border-b-emerald-500 border-b-2 shadow-inner' : ''} ${draggedIdx === idx ? 'opacity-20' : ''}`}
                                        title="Drag to adjust Rank Hierarchy"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                            <span className="text-[11px] text-slate-400 font-mono font-black tracking-widest">T{idx + 2} RANK</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleRenameTier(tier.id)} className={`text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors ${tier.color}`} title="Rename Tier">
                                                    {cleanName} <Edit size={10} className="inline opacity-50 group-hover:opacity-100"/>
                                                </button>
                                                {tier.id.startsWith('CUSTOM_') && <button data-kpm-del data-label="Delete" onClick={() => handleDeleteTier(tier.id)} className="text-red-500 hover:text-red-400 ml-1"><Trash2 size={12}/></button>}
                                            </div>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {ALL_FEATURES.map((feature) => (
                            <React.Fragment key={feature.id}>
                                <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                    <td className={`p-3 text-xs font-bold font-mono ${feature.id.includes('edit_') ? 'text-rose-400' : 'text-slate-300'}`}>{feature.label}</td>
                                    {tiers.map(tier => {
                                        const hasAccess = (matrix[tier.id] || []).includes(feature.id);
                                        return (
                                            <td key={`${tier.id}-${feature.id}`} className="p-3 text-center">
                                                <button onClick={() => togglePermission(tier.id, feature.id)} className={`transition-all duration-300 ${hasAccess ? 'text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'text-slate-400 hover:text-slate-400'}`}>
                                                    {hasAccess ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                                {/* 🚀 CUSTOMER DIRECTORY ACCESS: sits right after the Customers toggle */}
                                {feature.id === 'view_customers' && (
                                    <tr className="border-t-2 border-b-2 border-slate-700 bg-slate-900/30 hover:bg-slate-800/50 transition-colors">
                                        <td className="p-3 text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2"><Store size={16}/> Customer Directory Access</td>
                                        {tiers.map(tier => {
                                            const currentCustomerAccess = (matrix[tier.id] || []).find(p => CUSTOMER_EDIT_PERMS.includes(p)) || 'none';
                                            return (
                                                <td key={`customer-access-${tier.id}`} className="p-2 text-center">
                                                    <select
                                                        value={currentCustomerAccess}
                                                        onChange={(e) => changeCustomerAccess(tier.id, e.target.value)}
                                                        className="w-[110px] bg-black/40 border border-slate-600 rounded p-1 text-[11px] font-bold text-slate-300 outline-none focus:border-emerald-500 mx-auto"
                                                    >
                                                        <option value="none">Global (default)</option>
                                                        <option value="customers_edit_global">Global (default)</option>
                                                        <option value="customers_edit_own_region">Own Region</option>
                                                        <option value="customers_view_only">View Only</option>
                                                    </select>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )}
                                {/* 🚀 REPORTING AUTHORITY: sits right after Sampling, replacing the old Reports + View Team History toggles */}
                                {feature.id === 'view_sampling' && (
                                    <tr className="border-t-2 border-b-2 border-slate-700 bg-slate-900/30 hover:bg-slate-800/50 transition-colors">
                                        <td className="p-3 text-xs font-black uppercase tracking-widest text-orange-400 flex items-center gap-2"><BarChart2 size={16}/> Reporting Authority</td>
                                        {tiers.map(tier => {
                                            const currentReportAccess = (matrix[tier.id] || []).find(p => REPORT_PERMS.includes(p)) || 'none';
                                            return (
                                                <td key={`report-${tier.id}`} className="p-2 text-center">
                                                    <select 
                                                        value={currentReportAccess}
                                                        onChange={(e) => changeReportAccess(tier.id, e.target.value)}
                                                        className="w-[110px] bg-black/40 border border-slate-600 rounded p-1 text-[11px] font-bold text-slate-300 outline-none focus:border-orange-500 mx-auto"
                                                    >
                                                        <option value="none">No Access</option>
                                                        <option value="view_reports_personal">Personal Only</option>
                                                        <option value="view_reports_regional">Regional Team</option>
                                                        <option value="view_reports_global">Global Master</option>
                                                    </select>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};