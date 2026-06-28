import React, { useState } from 'react';
import { Lock, ShieldCheck, ShieldAlert, UploadCloud, Copy, Package, User, Settings, Trash2, ScanFace, Plus, Tag, Download, Upload, Image as ImageIcon, MessageSquare, Edit, Save, X, Music, TrendingUp, ChevronLeft, ChevronRight, LayoutDashboard, ToggleLeft, ToggleRight } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';

import LandlordDashboard from './LandlordDashboard'; 
import CrownTransferProtocol from './CrownTransferProtocol';

// 🚀 IMPORT THE MATRIX BRAIN
import { CORPORATE_TIERS, ROLE_PERMISSIONS, DYNAMIC_TIERS, injectDynamicPermissions } from '../config/permissions';

export default function SettingsView({
    user, userId, db, appId, isAdmin, isSystemOwner, userRole, // <-- Added userRole here
    showCrownTransfer, setShowCrownTransfer, triggerCapy, setShowAdminLogin,
    sessionStatus, setSessionStatus, auditLogs,
    handleMasterProtocol, handleSingleBackup, handleRestoreData,
    handleExportGranular, handleImportGranular, handleWipeData,
    currentUserEmail, handleChangePin, handleAdminLogout,
    handleRegisterPasskey, hasPasskey,
    tierSettings, setTierSettings, handleSaveTiers, handleExportTiers, handleImportTiers, handleTierIconSelect,
    appSettings, setAppSettings,
    editCompanyProfile, setEditCompanyProfile, handleSaveCompanyProfile,
    handleMascotSelect, newMascotMessage, setNewMascotMessage, handleAddMascotMessage,
    activeMessages, editingMsgIndex, setEditingMsgIndex, editMsgText, setEditMsgText, handleSaveEditedMessage, handleDeleteMascotMessage,
    triggerDiscoParty, isDiscoMode,
    isLiteMode, setIsLiteMode /* 🚀 NEW: LITE MODE PROPS */
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
            alert("✅ Tier Automation Rules locked in!");
        } catch(e) { 
            alert("Failed to save settings."); 
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
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed mb-8">Admin Clearance Required</p>
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
                  <button onClick={handleResetIndicators} className="bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 px-3 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-red-900/50 hover:text-red-400 hover:border-red-500 transition-all">
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
                                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
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
                                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
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
                                      <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
                                      <input className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={editCompanyProfile.name} onChange={e => setEditCompanyProfile({...editCompanyProfile, name: e.target.value})}/>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase">Official Address (Used on Invoice Header)</label>
                                      <input className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={editCompanyProfile.address} onChange={e => setEditCompanyProfile({...editCompanyProfile, address: e.target.value})} placeholder="e.g. Jl. Jendral Sudirman No.123, Jakarta"/>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase">Contact Number</label>
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
                                              <span className="text-slate-500 font-black">Rp</span>
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
                                          <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest">Amount charged to salesmen per tax stamp lost.</p>
                                      </div>
                                  )}

                                  <button onClick={handleSaveCompanyProfile} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-colors w-full mt-4 shadow-md">Save Corporate Profile</button>
                              </div>
                          </div>

                          {/* MASCOT SETTINGS */}
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300">
                              <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white mb-4"><MessageSquare size={20}/> Mascot Settings</h3>
                              <div className="mb-6 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-700">
                                  <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-500 uppercase">Mascot Size</label><span className="text-xs text-orange-500 font-bold">{appSettings.mascotScale || 1}x</span></div>
                                  <input type="range" min="0.5" max="2.0" step="0.1" value={appSettings.mascotScale || 1} onChange={(e) => { const scale = parseFloat(e.target.value); setAppSettings(prev => ({ ...prev, mascotScale: scale })); setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { mascotScale: scale }, { merge: true }); }} className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500"/>
                              </div>
                              <div className="mb-4">
                                  <label className="text-xs font-bold text-slate-500 mb-1 block">Add New Dialogue Line</label>
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
                                                  <button onClick={() => setEditingMsgIndex(-1)} className="text-slate-400 hover:text-slate-500"><X size={16}/></button>
                                              </div>
                                          ) : (
                                              <>
                                                  <span className="text-sm dark:text-slate-300 italic truncate mr-2">"{msg}"</span>
                                                  <div className="flex gap-2 shrink-0">
                                                      <button onClick={() => { setEditingMsgIndex(idx); setEditMsgText(msg); }} className="text-slate-400 hover:text-blue-500"><Edit size={14}/></button>
                                                      <button onClick={() => handleDeleteMascotMessage(msg)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
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
                                                      <label className="flex items-center justify-center gap-2 w-full p-2 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer hover:bg-slate-300 text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap transition-colors"><Upload size={14}/> {tier.value?.startsWith('data:') ? "Change Image" : "Upload Image"}<label htmlFor={`tier-upload-${idx}`} className="flex items-center justify-center gap-2 w-full p-2 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer hover:bg-slate-300 text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap transition-colors"><Upload size={14}/> {tier.value?.startsWith('data:') ? "Change Image" : "Upload Image"}<input id={`tier-upload-${idx}`} type="file" accept="image/*" onChange={(e) => handleTierIconSelect(e, idx)} className="hidden" /></label></label>
                                                  ) : (
                                                      <input value={tier.value} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].value = e.target.value; handleSaveTiers(newTiers); }} className="w-full p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="Paste Emoji Here" />
                                                  )}
                                              </div>
                                              
                                              <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 shadow-inner" style={{ borderColor: tier.color }}>
                                                  {tier.iconType === 'image' ? (tier.value ? <img src={tier.value} className="w-full h-full object-contain p-1" /> : <ImageIcon size={14} className="opacity-30"/>) : (<span className="text-lg">{tier.value}</span>)}
                                              </div>

                                              <button onClick={() => {
                                                  if(window.confirm(`Are you sure you want to delete the tier: ${tier.label}?`)) {
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
                                              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Configure automated promotion/demotion conditions</p>
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
                                                              <p className="text-[9px] text-slate-500 uppercase tracking-widest">Target Requirement</p>
                                                          </div>
                                                      </div>

                                                      <ChevronRight className="hidden lg:block text-slate-400 shrink-0" size={16}/>

                                                      <div className="flex-1 flex flex-wrap items-center gap-2 bg-white dark:bg-black/40 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                                                          
                                                          <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded overflow-hidden">
                                                              <div className="px-2 text-slate-500 dark:text-slate-400">
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
                      <div className="animate-fade-in space-y-6">
                          
                          {/* MASTER SECURITY CARD */}
                          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border-2 border-orange-500/20 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck size={120} className="text-orange-500" /></div>
                              <div className="relative z-10">
                                  <h3 className="font-bold text-xl mb-1 dark:text-white flex items-center gap-3"><ShieldCheck className="text-emerald-500" size={24}/> Master Security Protocol</h3>
                                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-8">Triple-Layer Data Redundancy</p>
                                  
                                  <button onClick={handleMasterProtocol} className="w-full group relative bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] shadow-lg active:scale-95 mb-6">
                                      <div className="flex flex-col items-center gap-2">
                                          <span className="text-sm">EXECUTE MASTER BACKUP</span>
                                          <span className="text-[9px] opacity-70 font-mono tracking-normal">Generate 3 Recovery Points Now</span>
                                      </div>
                                  </button>

                                  <div className="grid grid-cols-3 gap-3 mb-6">
                                      <div className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-500 ${isRecoverySecure ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-red-900/20 border-red-500 text-red-500 animate-pulse'}`}>
                                          {isRecoverySecure ? <ShieldCheck size={32}/> : <ShieldAlert size={32}/>}
                                          <div className="text-center">
                                              <p className="text-[10px] font-black uppercase tracking-widest mb-1">RECOVERY</p>
                                              <p className="text-xs font-bold">{isRecoverySecure ? "SECURE" : "REQUIRED"}</p>
                                          </div>
                                      </div>
                                      <div className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-500 ${isUsbSecure ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-orange-500/20 border-orange-500 text-orange-500 animate-pulse'}`}>
                                          {isUsbSecure ? <ShieldCheck size={32}/> : <ShieldAlert size={32}/>}
                                          <div className="text-center">
                                              <p className="text-[10px] font-black uppercase tracking-widest mb-1">USB SAFE</p>
                                              <p className="text-xs font-bold">{isUsbSecure ? "SECURE" : "UPDATE"}</p>
                                          </div>
                                      </div>
                                      <div className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-500 ${isCloudSecure ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-red-900/20 border-red-500 text-red-500 animate-pulse'}`}>
                                          {isCloudSecure ? <ShieldCheck size={32}/> : <ShieldAlert size={32}/>}
                                          <div className="text-center">
                                              <p className="text-[10px] font-black uppercase tracking-widest mb-1">CLOUD SYNC</p>
                                              <p className="text-xs font-bold">{isCloudSecure ? "SECURE" : "REQUIRED"}</p>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 mb-6">
                                      <button onClick={() => handleSingleBackup('RECOVERY')} className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded hover:bg-blue-500 hover:text-white transition-colors text-[9px] font-bold text-slate-500 uppercase tracking-widest">Download Recovery</button>
                                      <button onClick={() => handleSingleBackup('USB')} className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded hover:bg-orange-500 hover:text-white transition-colors text-[9px] font-bold text-slate-500 uppercase tracking-widest">Download USB</button>
                                      <button onClick={() => handleSingleBackup('CLOUD')} className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded hover:bg-emerald-500 hover:text-white transition-colors text-[9px] font-bold text-slate-500 uppercase tracking-widest">Download Cloud</button>
                                  </div>

                                  <div className="border-t border-orange-500/30 pt-6">
                                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">System Recovery Terminal</p>
                                      <label className="w-full flex items-center justify-center gap-3 py-4 border-2 border-dashed border-slate-600 hover:border-emerald-500 rounded-xl text-slate-400 hover:text-emerald-500 cursor-pointer transition-all bg-black/30 hover:bg-emerald-900/20 group">
                                          <UploadCloud size={24} className="group-hover:-translate-y-1 transition-transform" />
                                          <span className="font-bold uppercase tracking-widest text-xs">Load Backup File & Restore Data (.json)</span>
                                          <input type="file" accept=".json" onChange={handleRestoreData} className="hidden" />
                                      </label>
                                  </div>
                              </div>
                          </div>

                          {/* USER PROFILE & PIN */}
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white"><User size={20}/> User Profile & Security</h3>
                              <label className="block text-sm text-slate-500 mb-2">Google Account Email</label>
                              <input type="email" className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-600 dark:text-white mb-4" value={currentUserEmail || ""} disabled/>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-4 rounded-xl border flex flex-col justify-between bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
                                      <div className="mb-4">
                                          <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Vault PIN Status</p>
                                          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest">Administrator Access Verified</p>
                                      </div>
                                      <div className="flex gap-2">
                                          <button onClick={handleChangePin} className="flex-1 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Change PIN</button>
                                      </div>
                                  </div>
                                  
                                  <div className="p-4 rounded-xl border flex flex-col justify-between bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                                      <div className="mb-4">
                                          <p className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-2">
                                              <ScanFace size={16}/> Biometric Passkeys
                                          </p>
                                          <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">Register Fingerprints, Phones, or USBs</p>
                                      </div>
                                      <button onClick={handleRegisterPasskey} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2">
                                          <Plus size={14}/> Add New Device
                                      </button>
                                  </div>
                              </div>
                          </div>

                          {/* TEAM SHARING & DATA RESET */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                  <h3 className="font-bold text-lg mb-1 dark:text-white flex items-center gap-2"><Copy size={20}/> Team Sharing</h3>
                                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">Export specific datasets</p>
                                  <div className="space-y-4">
                                      {[
                                          { label: 'Products & Prices', type: 'products', icon: <Package size={16}/> },
                                          { label: 'Customer Directory', type: 'customers', icon: <User size={16}/> },
                                          { label: 'Full Configuration', type: 'both', icon: <Settings size={16}/> }
                                      ].map((item) => (
                                          <div key={item.type} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border dark:border-slate-700">
                                              <div className="flex items-center gap-3">
                                                  <div className="text-orange-500">{item.icon}</div>
                                                  <span className="text-sm font-bold dark:text-white">{item.label}</span>
                                              </div>
                                              <div className="flex gap-2">
                                                  <button onClick={() => handleExportGranular(item.type)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-100 transition-colors uppercase">Export</button>
                                                  <label className="px-3 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-100 cursor-pointer transition-colors uppercase">
                                                      Import <input type="file" accept=".json" onChange={(e) => handleImportGranular(e, item.type)} className="hidden" />
                                                  </label>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              <div className="bg-red-50 dark:bg-red-950/20 p-6 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/50">
                                  <h3 className="font-bold text-lg mb-1 text-red-600 dark:text-red-500 flex items-center gap-2"><Trash2 size={20}/> Data Wipe</h3>
                                  <p className="text-[10px] text-red-500/70 uppercase tracking-widest mb-4">Permanently delete datasets</p>
                                  <div className="space-y-4">
                                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30">
                                          <div className="flex items-center gap-3 text-red-500"><Package size={16}/> <span className="text-sm font-bold">Wipe Products & Prices</span></div>
                                          <button onClick={() => handleWipeData('products')} className="px-4 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-200 transition-colors uppercase">Delete</button>
                                      </div>
                                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30">
                                          <div className="flex items-center gap-3 text-red-500"><User size={16}/> <span className="text-sm font-bold">Wipe Customers</span></div>
                                          <button onClick={() => handleWipeData('customers')} className="px-4 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-200 transition-colors uppercase">Delete</button>
                                      </div>
                                      <div className="flex items-center justify-between p-3 bg-red-600 rounded-xl border border-red-700 shadow-md">
                                          <div className="flex items-center gap-3 text-white"><ShieldAlert size={16}/> <span className="text-sm font-bold">Full Reset (Both)</span></div>
                                          <button onClick={() => handleWipeData('both')} className="px-4 py-1.5 bg-black/20 text-white rounded-lg text-[10px] font-black tracking-widest hover:bg-black/40 transition-colors uppercase border border-white/20">Wipe All</button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* WORKSPACE: ARCHITECT TERMINAL (TIER 1 ONLY) */}
                  {/* ---------------------------------------------------- */}
                  {activeTab === 'architect' && isSystemOwner && (
                      <div className="animate-fade-in space-y-6">
                          
                          {/* 🚀 THE NEW PERMISSION MATRIX EDITOR 🚀 */}
                          <PermissionMatrixEditor db={db} appId={appId} userRole={userRole || 'DEVELOPER'} userId={userId} />

                          {/* LANDLORD DASHBOARD */}
                          <div className="bg-black border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                             <LandlordDashboard db={db} appId={appId} user={user} />
                          </div>

                          {/* CROWN TRANSFER */}
                          <div className="bg-red-950/20 border border-red-500/30 p-6 rounded-2xl flex justify-between items-center">
                              <div>
                                  <h3 className="text-red-500 font-black uppercase tracking-widest text-lg">Danger Zone</h3>
                                  <p className="text-xs font-mono text-slate-400 mt-1">Permanently transfer ownership of this software.</p>
                              </div>
                              <button onClick={() => setShowCrownTransfer(true)} className="bg-red-900/40 hover:bg-red-600 text-red-500 hover:text-white border border-red-500 px-6 py-3 rounded text-xs font-bold uppercase tracking-widest transition-all">
                                  Initiate Transfer
                              </button>
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

                          {/* DISCO PROTOCOL */}
                          <div className="pt-8 border-t-2 border-red-900/30">
                              <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldAlert size={16}/> System Overload</h4>
                              <button onClick={triggerDiscoParty} disabled={isDiscoMode} className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all ${isDiscoMode ? 'bg-slate-500' : 'bg-red-600 hover:bg-red-700'}`}>
                                  {isDiscoMode ? <><Music size={24} className="animate-spin inline mr-2"/> SYSTEM OVERLOAD...</> : <><ShieldAlert size={24} className="animate-pulse inline mr-2"/> DO NOT PRESS: CAPY DISCO PROTOCOL</>}
                              </button>
                              <p className="text-[10px] text-red-400 text-center mt-3 font-mono opacity-70">Warning: Extreme funkiness levels incoming.</p>
                          </div>
                      </div>
                  )}

              </div>
          </div>
      </div>
    );
}

// 🚀 PLUG & PLAY: THE RESPONSIVE MATRIX EDITOR
const PermissionMatrixEditor = ({ db, appId, userRole, userId }) => {
    if (userRole !== 'DEVELOPER' && userRole !== 'ADMIN') return null;

    const [matrix, setMatrix] = React.useState(ROLE_PERMISSIONS);
    // 🚀 ISOLATE TIER 1 ONLY (Tier 2 "Owner" is now manageable)
    const [tiers, setTiers] = React.useState(DYNAMIC_TIERS.filter(t => t.id !== 'DEVELOPER'));
    const [isSaving, setIsSaving] = React.useState(false);

    // 🚀 CRITICAL FIX: Fetch the actual saved matrix from the Master Vault on mount
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
                        // 🚀 Filter out ONLY Tier 1 (Developer)
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

    const ALL_FEATURES = [
        { id: 'view_dashboard', label: 'Command Center' },
        { id: 'view_map', label: 'Map System' },
        { id: 'view_journey', label: 'Journey Plan' },
        { id: 'view_fleet', label: 'Fleet & Canvas' },
        { id: 'view_master_vault', label: 'Master Vault' },
        { id: 'view_agent_inventory', label: 'Agent Inventory' },
        { id: 'view_restock_vault', label: 'Restock Vault' },
        { id: 'view_sales', label: 'Sales Terminal' },
        { id: 'view_receivables', label: 'Receivables & Consign' },
        { id: 'view_eod', label: 'EOD Setoran' },
        { id: 'view_stock_opname', label: 'Stock Opname' },
        { id: 'view_customers', label: 'Customers' },
        { id: 'view_sampling', label: 'Sampling' },
        { id: 'view_reports', label: 'Reports' },
        { id: 'view_audit_logs', label: 'Audit Logs' },
        { id: 'view_settings', label: 'Settings Panel' },
        { id: 'view_agent_profile', label: 'Agent Profile' },
        { id: 'can_unrestricted_sample', label: 'Bypass GPS for Sampling' }, // 🚀 NEW: Matrix UI Switch
        { id: 'edit_agent_roles', label: '[GOD] Promote Agents' },
        { id: 'edit_rank_config', label: '[GOD] Edit Ranks' }
    ];

    const togglePermission = (tierId, featureId) => {
        const newMatrix = { ...matrix };
        const tierPerms = [...(newMatrix[tierId] || [])];
        if (tierPerms.includes(featureId)) newMatrix[tierId] = tierPerms.filter(f => f !== featureId);
        else newMatrix[tierId] = [...tierPerms, featureId];
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
    const handleAddTier = () => {
        const name = prompt("Enter new Rank Name (e.g., WAREHOUSE):");
        if (!name || name.trim() === '') return;
        const newId = `CUSTOM_TIER_${Date.now()}`;
        const newTiers = [...tiers, { id: newId, label: `T${tiers.length + 2}: ${name.toUpperCase().trim()}`, color: 'text-cyan-400' }];
        setTiers(newTiers);
        setMatrix({ ...matrix, [newId]: [] });
        setActiveMobileTierId(newId);
    };

    const handleRenameTier = (id) => {
        const idx = tiers.findIndex(t => t.id === id);
        const cleanName = tiers[idx].label.replace(/^T\d+:\s*/, '');
        const newName = prompt(`Rename Rank T${idx + 2}:`, cleanName);
        if (newName && newName.trim() !== '') {
            setTiers(tiers.map((t, i) => t.id === id ? { ...t, label: `T${i + 2}: ${newName.toUpperCase().trim()}` } : t));
        }
    };

    const handleDeleteTier = (id) => {
        if (!id.startsWith('CUSTOM_')) return alert("System core tiers cannot be deleted, but you can rename and move them!");
        if (window.confirm("Delete this custom tier? All remaining tiers will automatically shift up in rank.")) {
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
            // 🚀 PROTECT TIER 1: Merge the hidden T1 (DEVELOPER) back into the payload before saving
            const godTiers = DYNAMIC_TIERS.filter(t => t.id === 'DEVELOPER');
            const fullTiers = [...godTiers, ...tiers];

            // 🚀 CRITICAL FIX: Save to BOTH settings paths to ensure App.jsx reads it correctly
            const payload = { matrix, tiers: fullTiers, updatedAt: new Date().toISOString() };
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/settings`, 'permission_matrix'), payload);
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/appSettings`, 'permission_matrix'), payload, { merge: true });
            
            injectDynamicPermissions(matrix, fullTiers); 
            alert("✅ Matrix & Hierarchy Deployed to Global Server!");
        } catch (e) { 
            console.error(e);
            alert("Matrix Deployment Failed."); 
        }
        setIsSaving(false);
    };

    // Safety fallback for mobile
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
                            className={`snap-start whitespace-nowrap px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeMobileTierId === t.id ? 'bg-slate-800 text-white border border-emerald-500 shadow-inner' : 'bg-slate-950/50 text-slate-500 border border-slate-800 hover:text-slate-300'}`}
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
                                <button onClick={() => handleShiftTier(activeTier.id, -1)} disabled={activeTierIdx === 0} className="p-1 text-slate-500 hover:text-white disabled:opacity-30"><ChevronLeft size={18}/></button>
                                <span className={`text-xs font-black uppercase tracking-widest ${activeTier.color}`}>{activeTier.label}</span>
                                <button onClick={() => handleShiftTier(activeTier.id, 1)} disabled={activeTierIdx === tiers.length - 1} className="p-1 text-slate-500 hover:text-white disabled:opacity-30"><ChevronRight size={18}/></button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleRenameTier(activeTier.id)} className="text-slate-400 hover:text-white p-1 bg-slate-800 rounded"><Edit size={14}/></button>
                                {activeTier.id.startsWith('CUSTOM_') && (
                                    <button onClick={() => handleDeleteTier(activeTier.id)} className="text-red-500 hover:text-red-400 p-1 bg-red-950/30 rounded"><Trash2 size={14}/></button>
                                )}
                            </div>
                        </div>

                        {/* Toggle List */}
                        <div className="space-y-2">
                            {ALL_FEATURES.map(feature => {
                                const hasAccess = (matrix[activeTier.id] || []).includes(feature.id);
                                return (
                                    <div key={feature.id} className="flex justify-between items-center p-2 rounded hover:bg-slate-800/30">
                                        <span className={`text-[10px] font-bold font-mono ${feature.id.includes('edit_') ? 'text-rose-400' : 'text-slate-300'}`}>{feature.label}</span>
                                        <button onClick={() => togglePermission(activeTier.id, feature.id)} className={`transition-all duration-300 ${hasAccess ? 'text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'text-slate-600'}`}>
                                            {hasAccess ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                                        </button>
                                    </div>
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
                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 bg-slate-950/50">Feature / Module</th>
                            {tiers.map((tier, idx) => {
                                const cleanName = tier.label.replace(/^T\d+:\s*/, '');
                                return (
                                    <th 
                                        key={tier.id} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragOver={(e) => handleDragOver(e, idx)} onDrop={(e) => handleDrop(e, idx)} onDragEnd={handleDragEnd}
                                        className={`p-3 border-b border-slate-800 text-center bg-slate-950/50 group cursor-move transition-all duration-200 ${dragOverIdx === idx ? 'bg-slate-800 border-b-emerald-500 border-b-2 shadow-inner' : ''} ${draggedIdx === idx ? 'opacity-20' : ''}`}
                                        title="Drag to adjust Rank Hierarchy"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                            <span className="text-[8px] text-slate-500 font-mono font-black tracking-widest">T{idx + 2} RANK</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleRenameTier(tier.id)} className={`text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors ${tier.color}`} title="Rename Tier">
                                                    {cleanName} <Edit size={10} className="inline opacity-0 group-hover:opacity-100"/>
                                                </button>
                                                {tier.id.startsWith('CUSTOM_') && <button onClick={() => handleDeleteTier(tier.id)} className="text-red-500 hover:text-red-400 ml-1"><Trash2 size={12}/></button>}
                                            </div>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {ALL_FEATURES.map((feature) => (
                            <tr key={feature.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                <td className={`p-3 text-xs font-bold font-mono ${feature.id.includes('edit_') ? 'text-rose-400' : 'text-slate-300'}`}>{feature.label}</td>
                                {tiers.map(tier => {
                                    const hasAccess = (matrix[tier.id] || []).includes(feature.id);
                                    return (
                                        <td key={`${tier.id}-${feature.id}`} className="p-3 text-center">
                                            <button onClick={() => togglePermission(tier.id, feature.id)} className={`transition-all duration-300 ${hasAccess ? 'text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'text-slate-600 hover:text-slate-400'}`}>
                                                {hasAccess ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};