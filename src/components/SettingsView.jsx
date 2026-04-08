import React from 'react';
import { Lock, ShieldCheck, ShieldAlert, UploadCloud, Copy, Package, User, Settings, Trash2, ScanFace, Plus, Tag, Download, Upload, Image as ImageIcon, MessageSquare, Edit, Save, X, Music } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';

import LandlordDashboard from './LandlordDashboard'; 
import CrownTransferProtocol from './CrownTransferProtocol';

export default function SettingsView({
    user, userId, db, appId, isAdmin, isSystemOwner,
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
    triggerDiscoParty, isDiscoMode
}) {

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

    // 1. CHECK DATABASE (Slow/Permanent Record)
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

    // 2. THE FIX: COMBINE SESSION STATE (Instant) WITH DATABASE (Persistent)
    const isRecoverySecure = sessionStatus.recovery || dbRecoveryCount > 0;
    const isUsbSecure = sessionStatus.usb || isUsbValidInDb;
    const isCloudSecure = sessionStatus.cloud || !!confirmedMirror;

    // 3. RESET HANDLER
    const handleResetIndicators = () => {
        localStorage.setItem('indicator_reset_time', new Date().getTime().toString());
        localStorage.removeItem('last_usb_backup'); 
        setSessionStatus({ recovery: false, usb: false, cloud: false }); 
        triggerCapy("Indicators Reset to REQUIRED state.");
    };

    return (
      <div className="animate-fade-in max-w-2xl mx-auto pb-20">
          
          {/* 👑 TIER 1 ONLY: LANDLORD DASHBOARD */}
          {isSystemOwner && (
              <>
                  <LandlordDashboard db={db} appId={appId} user={user} />
                  
                  <div className="mb-8 bg-red-950/20 border border-red-500/30 p-6 rounded-2xl flex justify-between items-center">
                      <div>
                          <h3 className="text-red-500 font-black uppercase tracking-widest">Danger Zone</h3>
                          <p className="text-[10px] font-mono text-slate-400 mt-1">Permanently transfer ownership of this software.</p>
                      </div>
                      <button onClick={() => setShowCrownTransfer(true)} className="bg-red-900/40 hover:bg-red-600 text-red-500 hover:text-white border border-red-500 px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-all">
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
              </>
          )}

          <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
              <div>
                  <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">System Configuration</h2>
                  <p className="text-[10px] text-emerald-500 font-mono font-bold animate-pulse">CLEARANCE: ADMIN VERIFIED</p>
              </div>
              <div className="flex gap-2">
                  <button onClick={handleResetIndicators} className="bg-white/5 border border-slate-600 text-slate-400 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-red-900/50 hover:text-red-400 hover:border-red-500 transition-all">
                      Reset Indicators
                  </button>
                  <button onClick={handleAdminLogout} className="bg-red-900/30 border border-red-800 text-red-500 px-4 py-1 rounded text-[10px] font-bold uppercase hover:bg-red-600 hover:text-white transition-all">
                      Lock Admin
                  </button>
              </div>
          </div>

          {/* MASTER SECURITY CARD */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border-2 border-orange-500/20 mb-6 relative overflow-hidden">
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

                  {/* BIG LIVE STATUS INDICATORS */}
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

          {/* 2. TEAM SHARING & DATA RESET */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all">
                  <h3 className="font-bold text-lg mb-1 dark:text-white flex items-center gap-2"><Copy size={20}/> Team Sharing</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">Export specific datasets for your team</p>
                  
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
                                      Import
                                      <input type="file" accept=".json" onChange={(e) => handleImportGranular(e, item.type)} className="hidden" />
                                  </label>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 p-6 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/50 transition-all">
                  <h3 className="font-bold text-lg mb-1 text-red-600 dark:text-red-500 flex items-center gap-2"><Trash2 size={20}/> Data Wipe</h3>
                  <p className="text-[10px] text-red-500/70 uppercase tracking-widest mb-4">Permanently delete active datasets</p>
                  
                  <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30">
                          <div className="flex items-center gap-3 text-red-500">
                              <Package size={16}/> <span className="text-sm font-bold">Wipe Products & Prices</span>
                          </div>
                          <button onClick={() => handleWipeData('products')} className="px-4 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-200 transition-colors uppercase">Delete</button>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30">
                          <div className="flex items-center gap-3 text-red-500">
                              <User size={16}/> <span className="text-sm font-bold">Wipe Customers</span>
                          </div>
                          <button onClick={() => handleWipeData('customers')} className="px-4 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-200 transition-colors uppercase">Delete</button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-red-600 rounded-xl border border-red-700 shadow-md">
                          <div className="flex items-center gap-3 text-white">
                              <ShieldAlert size={16}/> <span className="text-sm font-bold">Full Reset (Both)</span>
                          </div>
                          <button onClick={() => handleWipeData('both')} className="px-4 py-1.5 bg-black/20 text-white rounded-lg text-[10px] font-black tracking-widest hover:bg-black/40 transition-colors uppercase border border-white/20">Wipe All</button>
                      </div>
                  </div>
              </div>
          </div>

          {/* 3. USER PROFILE & SECURITY */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
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
                           <button onClick={handleAdminLogout} className="flex-1 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs font-bold text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">Lock Admin</button>
                      </div>
                  </div>
                  
                  <div className="p-4 rounded-xl border flex flex-col justify-between bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                      <div className="mb-4">
                          <p className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-2">
                              <ScanFace size={16}/> Biometric Passkeys
                          </p>
                          <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">Register Fingerprints, Phones, or USBs</p>
                      </div>
                      <button 
                          onClick={handleRegisterPasskey}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                      >
                          <Plus size={14}/> Add New Device / Passkey
                      </button>
                  </div>
              </div>
          </div>

          {/* 4. TIER & MAP ICON MANAGER */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white"><Tag size={20}/> Customer Tiers & Map Icons</h3>
                  <div className="flex gap-2">
                      <button onClick={handleExportTiers} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold"><Download size={14}/></button>
                      <label className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold cursor-pointer"><Upload size={14}/><input type="file" accept=".json" onChange={handleImportTiers} className="hidden" /></label>
                  </div>
              </div>
              <div className="overflow-x-auto pb-2">
                  <div className="space-y-3 min-w-[600px]">
                      {tierSettings.map((tier, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border dark:border-slate-700">
                              <input type="color" value={tier.color} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].color = e.target.value; handleSaveTiers(newTiers); }} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent flex-shrink-0"/>
                              <input value={tier.label} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].label = e.target.value; setTierSettings(newTiers); }} onBlur={() => handleSaveTiers(tierSettings)} className="w-24 p-2 text-xs font-bold border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                              <select value={tier.iconType} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].iconType = e.target.value; handleSaveTiers(newTiers); }} className="p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"><option value="emoji">Emoji</option><option value="image">Custom Logo</option></select>
                              <div className="flex-1">
                                  {tier.iconType === 'image' ? (
                                      <label className="flex items-center justify-center gap-2 w-full p-2 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer hover:bg-slate-300 text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap"><Upload size={14}/> {tier.value?.startsWith('data:') ? "Change" : "Upload"}<input type="file" accept="image/*" onChange={(e) => handleTierIconSelect(e, idx)} className="hidden" /></label>
                                  ) : (
                                      <input value={tier.value} onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].value = e.target.value; handleSaveTiers(newTiers); }} className="w-full p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                                  )}
                              </div>
                              <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0" style={{ borderColor: tier.color }}>
                                  {tier.iconType === 'image' ? (tier.value ? <img src={tier.value} className="w-full h-full object-contain p-1" /> : <ImageIcon size={14} className="opacity-30"/>) : (<span className="text-lg">{tier.value}</span>)}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
           </div>

          {/* 5. MASCOT SETTINGS (SIZE + DIALOGUE) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all duration-300">
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

          {/* 6. COMPANY IDENTITY */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all duration-300">
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

                  <button onClick={handleSaveCompanyProfile} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-colors w-full mt-4 shadow-md">Save Corporate Profile</button>
              </div>
          </div>

          {/* 7. PROFILE PICTURE */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-all duration-300">
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

          {/* 8. DANGER ZONE */}
          <div className="mt-12 pt-8 border-t-2 border-red-100 dark:border-red-900/30">
              <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldAlert size={16}/> Danger Zone</h4>
              <button onClick={triggerDiscoParty} disabled={isDiscoMode} className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all ${isDiscoMode ? 'bg-slate-500' : 'bg-red-600 hover:bg-red-700'}`}>
                  {isDiscoMode ? <><Music size={24} className="animate-spin"/> SYSTEM OVERLOAD...</> : <><ShieldAlert size={24} className="animate-pulse"/> DO NOT PRESS: CAPY DISCO PROTOCOL</>}
              </button>
              <p className="text-[10px] text-red-400 text-center mt-3 font-mono opacity-70">Warning: Extreme funkiness levels incoming.</p>
          </div>
      </div>
    );
}